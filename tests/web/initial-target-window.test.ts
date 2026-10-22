// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  ask: vi.fn(),
  save: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
  isTauri: () => true,
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: mocks.open,
  ask: mocks.ask,
  save: mocks.save,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    label: 'window-12345',
    onCloseRequested: vi.fn(),
    onDragDropEvent: async () => () => {},
    listen: async () => () => {},
  }),
}));

it('initializes window with initial folder and initial file without orphaned untitled tab', async () => {
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return 1;
    if (command === 'take_initial_folder') return '/target/project';
    if (command === 'take_initial_file') return '/target/project/guide.md';
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'open_document') return { source: '# Target Guide', generation: 1, path: '/target/project/guide.md' };
    if (command === 'list_directory') return { entries: [{ name: 'guide.md', path: '/target/project/guide.md', directory: false }], warnings: [] };
    if (command === 'open_folder_window') return undefined;
    if (command === 'add_recent_file') return undefined;
  });

  document.body.innerHTML = '<div id="app"></div>';

  const { view } = await import('../../src/web/main');
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));

    // Verify initial folder initialized sidebar
    await vi.waitFor(() => {
      expect(document.querySelector('.files-root')?.textContent).toBe('project');
      expect(document.querySelector<HTMLElement>('#files')?.hidden).toBe(false);
    });

    // Verify initial file loaded into tab and selected in sidebar
    await vi.waitFor(() => {
      const tabs = document.querySelectorAll('button[role="tab"]');
      // Only 1 tab should be present (the guide.md file), not 2 tabs with an orphaned Untitled
      expect(tabs.length).toBe(1);
      expect(tabs[0].textContent).toContain('guide.md');
      expect(document.querySelector('#document-title')?.textContent).toBe('guide.md');
      expect(document.querySelector('button[data-file-path][aria-current="page"]')?.textContent).toContain('guide.md');
    });
  } finally {
    window.dispatchEvent(new Event('pagehide'));
    view.destroy();
  }
});
