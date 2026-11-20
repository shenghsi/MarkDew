// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { savedSource, sourceField } from '../../src/web/source';
import { startupFixture } from './startup-fixture';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), ask: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: mocks.open, ask: mocks.ask, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(), listen: vi.fn() }) }));

it('updates open paths, saved references, and dirty editor references after a folder move', async () => {
  let next = 0, moved = false;
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  const sources = [{ path: '/root/index.md', source: '[Note](notes/a.md)' }, { path: '/root/notes/a.md', source: '[Index](../index.md)' }];
  mocks.invoke.mockImplementation(async (command: string, args: any) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'canonical_path') return args.path;
    if (command === 'list_directory') return { warnings: [], entries: args.path === '/root' ? [
      { name: 'target', path: '/root/target', directory: true },
      ...(!moved ? [{ name: 'notes', path: '/root/notes', directory: true }] : []),
      { name: 'index.md', path: '/root/index.md', directory: false },
    ] : args.path === '/root/notes' ? [{ name: 'a.md', path: '/root/notes/a.md', directory: false }] : [] };
    if (command === 'open_document') return sources.find(file => file.path === args.path);
    if (command === 'move_reference_sources') return sources;
    if (command === 'rename_file') {
      moved = true;
      expect(args.updates).toEqual([
        { ...sources[0], next: '[Note](target/notes/a.md)' },
        { ...sources[1], next: '[Index](../../index.md)' },
      ]);
      return { files: args.updates.map((update: any) => ({ path: update.path, source: update.next, uncertain: false })), warnings: [] };
    }
  });
  mocks.open.mockResolvedValue('/root'); document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const row = (path: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('#files button[data-sidebar-entry]')).find(button => button.title === path)!;
  const menu = (path: string) => row(path).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const action = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-context-item')).find(button => button.textContent === name)!.click();
  const text = () => savedSource(view.state.field(sourceField));
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
    document.querySelector<HTMLButtonElement>('.files-actions button')!.click();
    await vi.waitFor(() => expect(row('/root/index.md')).toBeDefined());
    row('/root/index.md').click(); await vi.waitFor(() => expect(text()).toBe(sources[0].source));
    view.dispatch({ changes: { from: view.state.doc.length, insert: '\nUnsaved draft [Note](notes/a.md)' } });
    row('/root/notes').click(); await vi.waitFor(() => expect(row('/root/notes/a.md')).toBeDefined());
    row('/root/notes/a.md').click(); await vi.waitFor(() => expect(text()).toBe(sources[1].source));
    menu('/root/notes'); action('Cut'); menu('/root/target'); action('Paste');
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/target/notes/a.md'));
    expect(text()).toBe('[Index](../../index.md)');
    expect(tabs.active.baseline).toBe('[Index](../../index.md)');
    const index = tabs.all.find(tab => tab.path === '/root/index.md')!;
    expect(savedSource(index.state.field(sourceField))).toBe('[Note](target/notes/a.md)\nUnsaved draft [Note](target/notes/a.md)');
    expect(index.baseline).toBe('[Note](target/notes/a.md)');
  } finally { view.destroy(); }
});
