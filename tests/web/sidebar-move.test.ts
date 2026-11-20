// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fileSidebar, type FolderEntry, type FolderListing } from '../../src/web/file-sidebar';

const entry = (name: string, directory = false): FolderEntry => ({ name, path: '/root/' + name, directory });
function mount() {
  const pane = document.createElement('aside'); document.body.append(pane);
  const listing = [entry('target', true), entry('folder', true), entry('a.md'), entry('b.md')];
  const read = vi.fn(async (path: string): Promise<FolderListing> => ({ entries: path === '/root' ? listing :
    path === '/root/folder' ? [{ name: 'child.md', path: '/root/folder/child.md', directory: false }] : [], warnings: [] }));
  const renameFile = vi.fn(async (from: string, _to: string) => { const index = listing.findIndex(e => e.path === from); if (index >= 0) listing.splice(index, 1); });
  const open = vi.fn(); let allowed = true;
  const sidebar = fileSidebar(pane, { read, renameFile, open, choose: vi.fn(), allowed: () => allowed }, { root: '/root' });
  const row = (name: string) => Array.from(pane.querySelectorAll<HTMLButtonElement>('button[data-sidebar-entry]')).find(b => b.title === '/root/' + name)!;
  const click = (name: string, extra: MouseEventInit = {}) => row(name).dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, ...extra }));
  const menu = (name: string) => row(name).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const action = (name: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar-context-item')).find(b => b.textContent === name)!;
  return { pane, row, click, menu, action, renameFile, open, sidebar, block: () => { allowed = false; } };
}
afterEach(() => { document.body.replaceChildren(); });

it('selects ranges without opening files and moves a group with Cut and Paste', async () => {
  const f = mount();
  try {
    await vi.waitFor(() => expect(f.row('b.md')).toBeDefined());
    f.click('a.md', { ctrlKey: true }); f.click('b.md', { shiftKey: true });
    expect(f.pane.querySelectorAll('.files-selected')).toHaveLength(2);
    expect(f.open).not.toHaveBeenCalled();
    f.menu('a.md'); f.action('Cut').click();
    expect(f.pane.querySelectorAll('.files-cut')).toHaveLength(2);
    f.menu('target'); f.action('Paste').click();
    await vi.waitFor(() => expect(f.renameFile).toHaveBeenCalledTimes(2));
    expect(f.renameFile.mock.calls).toEqual([['/root/a.md', '/root/target/a.md'], ['/root/b.md', '/root/target/b.md']]);
  } finally { f.sidebar.dispose(); }
});

it('moves a selected folder once when a selected child is inside it and refuses self moves', async () => {
  const f = mount();
  try {
    await vi.waitFor(() => expect(f.row('folder')).toBeDefined());
    f.click('folder'); await vi.waitFor(() => expect(f.row('folder/child.md')).toBeDefined());
    f.click('folder/child.md', { metaKey: true });
    f.menu('folder'); f.action('Cut').click();
    expect(f.action('Paste')).toBeUndefined();
    f.menu('folder'); expect(f.action('Paste').disabled).toBe(true);
    f.menu('target'); f.action('Paste').click();
    await vi.waitFor(() => expect(f.renameFile).toHaveBeenCalledExactlyOnceWith('/root/folder', '/root/target/folder'));
  } finally { f.sidebar.dispose(); }
});

it('moves by drag and drop and blocks moves when file commands are blocked', async () => {
  const f = mount();
  try {
    await vi.waitFor(() => expect(f.row('a.md')).toBeDefined());
    f.row('a.md').dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    const over = new Event('dragover', { bubbles: true, cancelable: true }); f.row('target').dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    f.row('target').dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(f.renameFile).toHaveBeenCalledWith('/root/a.md', '/root/target/a.md'));
    f.block(); f.row('b.md').dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }));
    f.pane.querySelector('.files-root')!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    expect(f.renameFile).toHaveBeenCalledTimes(1);
  } finally { f.sidebar.dispose(); }
});

it('reports a failed move, retains the cut items, and refreshes successful moves', async () => {
  const f = mount();
  try {
    await vi.waitFor(() => expect(f.row('b.md')).toBeDefined());
    f.click('a.md', { ctrlKey: true }); f.click('b.md', { ctrlKey: true });
    const move = f.renameFile.getMockImplementation()!;
    f.renameFile.mockImplementationOnce(move).mockRejectedValueOnce(new Error('Destination exists'));
    f.menu('a.md'); f.action('Cut').click(); f.menu('target'); f.action('Paste').click();
    await vi.waitFor(() => expect(f.pane.textContent).toContain('Destination exists'));
    expect(f.row('a.md')).toBeUndefined();
    expect(f.pane.querySelectorAll('.files-cut')).toHaveLength(1);
    expect(f.renameFile).toHaveBeenCalledTimes(2);
  } finally { f.sidebar.dispose(); }
});

it('supports Select All, Cut, Paste, and cancel from the keyboard', async () => {
  const f = mount();
  const key = (name: string, value: string, ctrlKey = false) => f.row(name).dispatchEvent(new KeyboardEvent('keydown', { key: value, ctrlKey, bubbles: true, cancelable: true }));
  try {
    await vi.waitFor(() => expect(f.row('b.md')).toBeDefined());
    key('a.md', 'a', true); expect(f.pane.querySelectorAll('.files-selected')).toHaveLength(4);
    key('a.md', 'Escape'); expect(f.pane.querySelectorAll('.files-selected')).toHaveLength(0);
    key('a.md', 'x', true); expect(f.row('a.md').classList.contains('files-cut')).toBe(true);
    key('target', 'v', true);
    await vi.waitFor(() => expect(f.renameFile).toHaveBeenCalledWith('/root/a.md', '/root/target/a.md'));
  } finally { f.sidebar.dispose(); }
});
