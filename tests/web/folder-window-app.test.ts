// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import fs from 'node:fs';
import path from 'node:path';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  open: vi.fn(),
  ask: vi.fn(),
  save: vi.fn(),
  menuCallback: undefined as ((command: string) => boolean) | undefined,
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
    label: 'main',
    onCloseRequested: vi.fn(),
    onDragDropEvent: async () => () => {},
    listen: async (name: string, callback: (event: { payload: string }) => void) => {
      if (name === 'markdew-document-command') {
        mocks.menuCallback = (cmd: string) => {
          callback({ payload: cmd });
          return true;
        };
      }
      return () => {};
    },
  }),
}));

it('hides .files-actions in style.css and opens folder in a new window via open_folder_window', async () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../../src/web/style.css'), 'utf-8');
  expect(css).toMatch(/\.files-actions\s*\{\s*display:\s*none\s*!important;\s*\}/);

  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return 1;
    if (command === 'take_initial_folder') return '/initial/project';
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'list_directory') return { entries: [{ name: 'README.md', path: '/initial/project/README.md', directory: false }], warnings: [] };
    if (command === 'open_folder_window') return undefined;
  });

  mocks.open.mockResolvedValue('/new/folder');
  document.body.innerHTML = '<div id="app"></div>';

  const { view } = await import('../../src/web/main');
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));

    // Verify initial folder from take_initial_folder initialized the sidebar
    await vi.waitFor(() => {
      expect(document.querySelector('.files-root')?.textContent).toBe('project');
      expect(document.querySelector<HTMLElement>('#files')?.hidden).toBe(false);
    });

    // Verify open-folder menu command opens in a new window via open_folder_window
    expect(mocks.menuCallback).toBeDefined();
    mocks.menuCallback!('open-folder');

    await vi.waitFor(() => {
      expect(mocks.open).toHaveBeenCalledWith({ directory: true, multiple: false });
      expect(mocks.invoke).toHaveBeenCalledWith('open_folder_window', { path: '/new/folder' });
    });

    // Verify opening a file outside the active folder opens containing folder in a new window
    mocks.open.mockResolvedValueOnce('/other/notes/meeting.md');
    const openBtn = document.querySelector<HTMLButtonElement>('#open')!;
    openBtn.click();

    await vi.waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith('open_folder_window', {
        path: '/other/notes',
        file: '/other/notes/meeting.md',
      });
    });

    // Verify opening a file inside the active folder opens in the current window without open_folder_window
    mocks.invoke.mockClear();
    mocks.open.mockResolvedValueOnce('/initial/project/sub/local.md');
    mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
      if (command === 'open_document') return { source: '# Local doc', generation: 1, path: '/initial/project/sub/local.md' };
      if (command === 'create_document') return 2;
      return undefined;
    });
    openBtn.click();

    await vi.waitFor(() => {
      expect(mocks.invoke).not.toHaveBeenCalledWith('open_folder_window', expect.anything());
    });
  } finally {
    window.dispatchEvent(new Event('pagehide'));
    view.destroy();
  }
});
