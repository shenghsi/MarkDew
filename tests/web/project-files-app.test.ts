// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), ask: mocks.ask, save: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ label: 'window-1', onCloseRequested: vi.fn(), onDragDropEvent: async () => () => {}, listen: async () => () => {} }),
}));

it('opens a project folder with its remembered files, skips missing files, and adds Untitled.md tabs with +', async () => {
  localStorage.setItem('markdew.projectFiles', JSON.stringify({ version: 1, projects: [{ folder: '/project',
    files: ['/project/a.md', '/project/gone.md', '/elsewhere/c.md', '/project/b.md'], active: '/project/b.md' }] }));
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  let next = 0;
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'take_initial_folder') return '/project';
    if (command === 'take_initial_file') return null;
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'canonical_path') return args.path;
    if (command === 'list_directory') return { entries: [], warnings: [] };
    if (command === 'open_document') {
      if (args.path === '/project/gone.md') throw 'The file does not exist.';
      return { path: args.path, source: `# ${args.path}` };
    }
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const labels = () => Array.from(document.querySelectorAll('.document-tab-label')).map(label => label.textContent);
  const saved = () => JSON.parse(localStorage.getItem('markdew.projectFiles')!).projects[0];
  try {
    await vi.waitFor(() => expect(labels()).toEqual(['a.md', 'b.md']));
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    expect(document.querySelector('[role="tab"][aria-selected="true"] .document-tab-label')!.textContent).toBe('b.md');
    expect(mocks.invoke.mock.calls.some(([command, args]) => command === 'open_document' && args.path === '/elsewhere/c.md')).toBe(false);
    expect(document.querySelector<HTMLElement>('#empty-document')!.hidden).toBe(true);
    // The missing file is no longer remembered.
    await vi.waitFor(() => expect(saved()).toEqual({ folder: '/project', files: ['/project/a.md', '/project/b.md'], active: '/project/b.md' }));
    const plus = document.querySelector<HTMLButtonElement>('#new-tab')!;
    expect(plus.parentElement!.classList.contains('document-tabs')).toBe(true);
    plus.click();
    await vi.waitFor(() => expect(labels()).toEqual(['a.md', 'b.md', 'Untitled.md']));
    expect(saved()).toEqual({ folder: '/project', files: ['/project/a.md', '/project/b.md'], active: '' });
  } finally { view.destroy(); window.dispatchEvent(new Event('pagehide')); }
});
