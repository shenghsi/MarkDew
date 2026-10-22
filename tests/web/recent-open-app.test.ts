// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  openListener: undefined as undefined | ((event: { payload: { paths: string[]; warnings: string[] } }) => void),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
  isTauri: () => true,
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  ask: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    label: 'main',
    onCloseRequested: vi.fn(),
    onDragDropEvent: async () => () => {},
    listen: async (name: string, callback: (event: any) => void) => {
      if (name === 'markdew-open-request') {
        mocks.openListener = callback;
      }
      return () => {};
    },
  }),
}));

it('opens a recent file received via markdew-open-request event payload', async () => {
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string; document?: number }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return 1;
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'take_initial_folder') return null;
    if (command === 'take_initial_file') return null;
    if (command === 'quit_ready') return null;
    if (command === 'open_document') {
      return { source: '# Recent Document\nContent here', path: args.path };
    }
    if (command === 'recovery_checkpoint') return undefined;
    if (command === 'add_recent_file') return undefined;
  });

  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');

  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    await vi.waitFor(() => expect(mocks.openListener).toBeDefined());

    // Emit a recent file open request with direct event payload
    mocks.openListener!({
      payload: {
        paths: ['/Users/test/notes/recent-note.md'],
        warnings: [],
      },
    });

    // Verify open_document was invoked with the recent file path
    await vi.waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith('open_document', expect.objectContaining({
        path: '/Users/test/notes/recent-note.md',
      }));
    });
  } finally {
    window.dispatchEvent(new Event('pagehide'));
    view.destroy();
  }
});
