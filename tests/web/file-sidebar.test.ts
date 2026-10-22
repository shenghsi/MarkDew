// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fileSidebar, FolderListing } from '../../src/web/file-sidebar';
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
const listing = (name: string): FolderListing => ({ entries: [{ name, path: `/root/${name}`, directory: false }], warnings: [] });

it('defers a restored root until shown and does not take focus or persist during restoration', async () => {
  const pane = document.createElement('aside'), input = document.createElement('input'); document.body.append(pane, input); input.focus();
  const read = vi.fn().mockRejectedValueOnce('Folder missing').mockResolvedValueOnce(listing('restored.md'));
  const changed = vi.fn(), sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: vi.fn(), allowed: () => true },
    { root: '/日本語 %23#', deferRead: true, rootChanged: changed });
  expect(read).not.toHaveBeenCalled(); sidebar.show(); sidebar.show();
  await vi.waitFor(() => expect(pane.textContent).toContain('Folder missing'));
  expect(document.activeElement).toBe(input); expect(changed).not.toHaveBeenCalled();
  button(pane, 'Retry folder').click(); await vi.waitFor(() => expect(pane.textContent).toContain('restored.md'));
  expect(read).toHaveBeenCalledTimes(2); expect(document.activeElement).toBe(input); expect(changed).not.toHaveBeenCalled(); sidebar.dispose();
});

it('persists only a current successful chosen-root read, including retry, and rejects blocked or late choices', async () => {
  const pane = document.createElement('aside'), old = deferred<FolderListing>(), late = deferred<FolderListing>(), picker = deferred<string | null>();
  let allowed = true;
  const changed = vi.fn(), choose = vi.fn().mockResolvedValueOnce('/old').mockResolvedValueOnce('/failed').mockResolvedValueOnce(null)
    .mockReturnValueOnce(picker.promise).mockResolvedValueOnce('/late');
  const read = vi.fn().mockReturnValueOnce(old.promise).mockRejectedValueOnce('Read failed')
    .mockResolvedValueOnce(listing('retry.md')).mockReturnValueOnce(late.promise);
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose, allowed: () => allowed }, { rootChanged: changed });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(pane.textContent).toContain('Read failed'));
  old.resolve(listing('old.md')); await Promise.resolve(); expect(changed).not.toHaveBeenCalled();
  button(pane, 'Retry folder').click(); await vi.waitFor(() => expect(changed).toHaveBeenCalledWith('/failed'));
  button(pane, 'Open folder').click(); await Promise.resolve(); expect(changed).toHaveBeenCalledTimes(1);
  button(pane, 'Open folder').click(); allowed = false; picker.resolve('/blocked'); await Promise.resolve();
  expect(sidebar.root()).toBe('/failed'); allowed = true;
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(4));
  sidebar.dispose(); late.resolve(listing('late.md')); await Promise.resolve(); expect(changed).toHaveBeenCalledTimes(1);
});
const button = (pane: HTMLElement, name: string) => Array.from(pane.querySelectorAll('button')).find(value => value.textContent === name)!;
afterEach(() => document.body.replaceChildren());
it.each([
  ['/work/MarkDew', 'MarkDew'],
  ['/work/name\\literal', 'name\\literal'],
  ['C:\\work\\MarkDew', 'MarkDew'],
  ['C:\\', 'C:\\'],
  ['\\\\server\\share\\日本語', '日本語'],
  ['/', '/'],
])('shows a short folder label and retains the literal host path %s', async (root, name) => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const read = vi.fn().mockResolvedValue(listing('TARGET.md'));
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: vi.fn(), allowed: () => true }, { root });
  await vi.waitFor(() => expect(button(pane, 'TARGET.md')).toBeDefined());
  expect(pane.querySelector('.files-root')?.textContent).toBe(name);
  expect(pane.querySelector('.files-root')?.getAttribute('title')).toBe(root);
  expect(read).toHaveBeenCalledWith(root); expect(sidebar.root()).toBe(root);
  expect(button(pane, 'TARGET.md').querySelector('.files-icon')?.getAttribute('aria-hidden')).toBe('true');
  sidebar.dispose();
});
const key = (button: HTMLButtonElement, value: string, extra: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...extra });
  button.dispatchEvent(event); return event;
};

it('moves through visible nested entries and keeps literal Windows paths on Open', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const root = 'C:\\日本語%20', folderPath = root + '\\folder', nestedPath = folderPath + '\\nested', filePath = nestedPath + '\\中文.md';
  const read = vi.fn(async (path: string): Promise<FolderListing> => ({ warnings: [], entries:
    path === root ? [{ name: 'folder', path: folderPath, directory: true }, { name: 'last.md', path: root + '\\last.md', directory: false }] :
    path === folderPath ? [{ name: 'nested', path: nestedPath, directory: true }, { name: 'child.md', path: folderPath + '\\child.md', directory: false }] :
    [{ name: '中文.md', path: filePath, directory: false }] }));
  const open = vi.fn(), sidebar = fileSidebar(pane, { read, open, choose: async () => root, allowed: () => true });
  try {
    button(pane, 'Open folder').click(); await vi.waitFor(() => expect(button(pane, 'folder')).toBeDefined());
    const folder = button(pane, 'folder'), last = button(pane, 'last.md'); folder.focus();
    key(folder, 'ArrowDown'); expect(document.activeElement).toBe(last);
    key(last, 'Home'); expect(document.activeElement).toBe(folder);
    key(folder, 'ArrowRight'); expect(document.activeElement).toBe(folder);
    await vi.waitFor(() => expect(button(pane, 'nested')).toBeDefined());
    key(folder, 'ArrowRight'); const nested = button(pane, 'nested'); expect(document.activeElement).toBe(nested);
    key(nested, 'ArrowRight'); await vi.waitFor(() => expect(button(pane, '中文.md')).toBeDefined());
    key(nested, 'ArrowRight'); const file = button(pane, '中文.md'); expect(document.activeElement).toBe(file);
    file.click(); expect(open).toHaveBeenCalledWith(filePath);
    key(file, 'ArrowDown'); expect(document.activeElement).toBe(button(pane, 'child.md'));
    key(button(pane, 'child.md'), 'End'); expect(document.activeElement).toBe(last);
    key(last, 'ArrowUp'); expect(document.activeElement).toBe(button(pane, 'child.md'));
    key(button(pane, 'child.md'), 'ArrowLeft'); expect(document.activeElement).toBe(folder);
    key(folder, 'ArrowLeft'); expect(folder.getAttribute('aria-expanded')).toBe('false');
    key(folder, 'ArrowDown'); expect(document.activeElement).toBe(last);
    expect(read.mock.calls.map(([path]) => path)).toEqual([root, folderPath, nestedPath]);
  } finally { sidebar.dispose(); }
});

it('guards keyboard focus during composition, busy state, hidden state and disposal', async () => {
  const pane = document.createElement('aside'); document.body.append(pane); let allowed = true;
  const read = vi.fn().mockResolvedValue({ entries: [{ name: 'folder', path: '/root/folder', directory: true },
    { name: 'file.md', path: '/root/file.md', directory: false }], warnings: [] });
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => allowed });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(button(pane, 'folder')).toBeDefined());
  const folder = button(pane, 'folder'); folder.focus();
  for (const extra of [{ isComposing: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    expect(key(folder, 'ArrowRight', extra).defaultPrevented).toBe(false);
    expect(folder.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(folder);
  }
  allowed = false; expect(key(folder, 'End').defaultPrevented).toBe(false); expect(document.activeElement).toBe(folder);
  allowed = true; pane.hidden = true; expect(key(folder, 'ArrowRight').defaultPrevented).toBe(false);
  pane.hidden = false; sidebar.dispose(); expect(key(folder, 'ArrowRight').defaultPrevented).toBe(false);
  expect(read).toHaveBeenCalledTimes(1);
});

it('keeps focus safe during loading, retry, empty folders, collapse, and root refresh', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const pending = deferred<FolderListing>(), refreshed = deferred<FolderListing>();
  const read = vi.fn().mockResolvedValueOnce({ entries: [{ name: 'folder', path: '/root/folder', directory: true }], warnings: [] })
    .mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ entries: [], warnings: [] }).mockReturnValueOnce(refreshed.promise);
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => true });
  try {
    button(pane, 'Open folder').click(); await vi.waitFor(() => expect(button(pane, 'folder')).toBeDefined());
    const folder = button(pane, 'folder'); folder.focus(); key(folder, 'ArrowRight'); key(folder, 'ArrowRight');
    expect(document.activeElement).toBe(folder); expect(read).toHaveBeenCalledTimes(2);
    const input = document.createElement('input'); document.body.append(input); input.focus();
    pending.resolve({ entries: [{ name: 'child.md', path: '/root/folder/child.md', directory: false }], warnings: [] });
    await vi.waitFor(() => expect(button(pane, 'child.md')).toBeDefined()); expect(document.activeElement).toBe(input);
    button(pane, 'child.md').focus(); folder.click(); expect(document.activeElement).toBe(folder);
    key(folder, 'ArrowRight'); await vi.waitFor(() => expect(pane.textContent).toContain('No Markdown'));
    key(folder, 'ArrowRight'); expect(document.activeElement).toBe(folder);
    button(pane, 'Refresh files').click(); expect(document.activeElement).toBe(button(pane, 'Refresh files'));
    refreshed.resolve({ entries: [], warnings: [] }); await Promise.resolve();
    expect(document.activeElement).toBe(button(pane, 'Refresh files'));
  } finally { sidebar.dispose(); }
});

it('includes Retry in keyboard navigation and returns focus to its folder before retry', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const read = vi.fn().mockResolvedValueOnce({ entries: [{ name: 'folder', path: '/root/folder', directory: true }], warnings: [] })
    .mockRejectedValueOnce('Read failed').mockResolvedValueOnce(listing('new.md'));
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => true });
  try {
    button(pane, 'Open folder').click(); await vi.waitFor(() => expect(button(pane, 'folder')).toBeDefined());
    const folder = button(pane, 'folder'); folder.focus(); key(folder, 'ArrowRight');
    await vi.waitFor(() => expect(button(pane, 'Retry folder')).toBeDefined());
    key(folder, 'ArrowRight'); const retry = button(pane, 'Retry folder'); expect(document.activeElement).toBe(retry);
    key(retry, 'ArrowLeft'); expect(document.activeElement).toBe(folder);
    key(folder, 'End'); expect(document.activeElement).toBe(retry);
    retry.click(); expect(document.activeElement).toBe(folder);
    await vi.waitFor(() => expect(button(pane, 'new.md')).toBeDefined()); expect(document.activeElement).toBe(folder);
  } finally { sidebar.dispose(); }
});

it('retains literal Unicode paths, opens files, and blocks controls during input', async () => {
  const pane = document.createElement('aside'), open = vi.fn(), read = vi.fn().mockResolvedValue(listing('<日本語%20.md>'));
  let allowed = true;
  const sidebar = fileSidebar(pane, { read, open, choose: async () => '/root/日本語%20', allowed: () => allowed });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledWith('/root/日本語%20'));
  expect(pane.querySelector('img')).toBeNull(); button(pane, '<日本語%20.md>').click();
  expect(open).toHaveBeenCalledWith('/root/<日本語%20.md>'); allowed = false;
  button(pane, '<日本語%20.md>').click(); button(pane, 'Refresh files').click();
  expect(open).toHaveBeenCalledTimes(1); expect(read).toHaveBeenCalledTimes(1);
  sidebar.dispose(); button(pane, '<日本語%20.md>').click(); expect(open).toHaveBeenCalledTimes(1);
});

it('rejects old root and refresh results and results after disposal', async () => {
  const pane = document.createElement('aside'), first = deferred<FolderListing>(), second = deferred<FolderListing>(), third = deferred<FolderListing>();
  const read = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
  let chosen = '/first';
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => chosen, allowed: () => true });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  chosen = '/second'; button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  second.resolve(listing('new.md')); await vi.waitFor(() => expect(pane.textContent).toContain('new.md'));
  first.resolve(listing('old.md')); await Promise.resolve(); expect(pane.textContent).not.toContain('old.md');
  button(pane, 'Refresh files').click(); sidebar.dispose(); third.resolve(listing('disposed.md'));
  await Promise.resolve(); expect(pane.textContent).not.toContain('disposed.md');
});

it('does not reopen collapsed folders or publish old expansion results', async () => {
  const pane = document.createElement('aside'), first = deferred<FolderListing>(), second = deferred<FolderListing>();
  const read = vi.fn().mockResolvedValueOnce({ entries: [{ name: 'folder', path: '/root/folder', directory: true }], warnings: [] })
    .mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => true });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(button(pane, 'folder')).toBeDefined());
  const folder = button(pane, 'folder'); folder.click(); folder.click();
  first.resolve(listing('old.md')); await Promise.resolve(); expect(folder.getAttribute('aria-expanded')).toBe('false');
  expect(pane.textContent).not.toContain('old.md'); folder.click(); second.resolve(listing('new.md'));
  await vi.waitFor(() => expect(pane.textContent).toContain('new.md')); expect(folder.getAttribute('aria-expanded')).toBe('true');
  sidebar.dispose();
});

it('shows read errors and scan notices and retries a failed folder', async () => {
  const pane = document.createElement('aside'), read = vi.fn().mockRejectedValueOnce('<Read failed>')
    .mockResolvedValueOnce({ entries: [], warnings: ['The list is incomplete.'] });
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => true });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(pane.textContent).toContain('<Read failed>'));
  button(pane, 'Retry folder').click(); await vi.waitFor(() => expect(pane.textContent).toContain('incomplete'));
  expect(read).toHaveBeenCalledTimes(2); sidebar.dispose();
});

it('retains the root on cancelled choice and rejects choice completed after disposal', async () => {
  const pane = document.createElement('aside'), pending = deferred<string | null>();
  const choose = vi.fn().mockResolvedValueOnce('/root').mockResolvedValueOnce(null).mockReturnValueOnce(pending.promise);
  const read = vi.fn().mockResolvedValue(listing('doc.md'));
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose, allowed: () => true });
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(1));
  button(pane, 'Open folder').click(); await vi.waitFor(() => expect(choose).toHaveBeenCalledTimes(2));
  expect(sidebar.root()).toBe('/root'); expect(read).toHaveBeenCalledTimes(1);
  await Promise.resolve(); button(pane, 'Open folder').click(); sidebar.dispose(); pending.resolve('/late');
  await Promise.resolve(); expect(sidebar.root()).toBe('/root');
});

it('getParentDir extracts parent directory correctly across platforms', async () => {
  const { getParentDir } = await import('../../src/web/file-sidebar');
  expect(getParentDir('/work/project/doc.md')).toBe('/work/project');
  expect(getParentDir('/doc.md')).toBe('/');
  expect(getParentDir('C:\\work\\project\\doc.md')).toBe('C:\\work\\project');
  expect(getParentDir('C:\\doc.md')).toBe('C:\\');
  expect(getParentDir('C:/doc.md')).toBe('C:/');
  expect(getParentDir('file.md')).toBe('file.md');
});

it('isPathInsideFolder correctly checks path containment with boundary rules', async () => {
  const { isPathInsideFolder } = await import('../../src/web/file-sidebar');
  expect(isPathInsideFolder('/work/project/doc.md', '/work/project')).toBe(true);
  expect(isPathInsideFolder('/work/project/sub/doc.md', '/work/project')).toBe(true);
  expect(isPathInsideFolder('/work/project', '/work/project')).toBe(true);
  expect(isPathInsideFolder('/work/project-other/doc.md', '/work/project')).toBe(false);
  expect(isPathInsideFolder('/other/doc.md', '/work/project')).toBe(false);

  // Windows case-insensitivity and backslashes
  expect(isPathInsideFolder('C:\\work\\project\\doc.md', 'c:\\work\\project')).toBe(true);
  expect(isPathInsideFolder('C:/work/project/doc.md', 'C:\\work\\project')).toBe(true);
  expect(isPathInsideFolder('c:\\work\\project-other\\doc.md', 'C:\\work\\project')).toBe(false);

  // Empty / invalid
  expect(isPathInsideFolder('', '/work/project')).toBe(false);
  expect(isPathInsideFolder('/work/project/doc.md', '')).toBe(false);
});

it('restores a previous root while another folder read is pending and retains it on refresh', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const pending = deferred<FolderListing>();
  const read = vi.fn((path: string) => path === '/root' ? Promise.resolve(listing('original.md')) : pending.promise);
  const choose = vi.fn().mockResolvedValueOnce('/other').mockResolvedValueOnce('/root');
  const open = vi.fn();
  const sidebar = fileSidebar(pane, { read, open, choose, allowed: () => true }, { root: '/root' });
  try {
    await vi.waitFor(() => expect(button(pane, 'original.md')).toBeDefined());
    button(pane, 'Open folder').click();
    await vi.waitFor(() => expect(read).toHaveBeenCalledWith('/other'));
    expect(pane.textContent).toContain('Loading files…');
    button(pane, 'Open folder').click();
    await vi.waitFor(() => expect(button(pane, 'original.md')).toBeDefined());
    const restored = button(pane, 'original.md');

    pending.resolve(listing('stale.md'));
    await Promise.resolve();
    expect(button(pane, 'stale.md')).toBeUndefined();
    sidebar.refresh();
    await Promise.resolve();
    expect(button(pane, 'original.md')).toBe(restored);
    expect(pane.textContent).not.toContain('Loading files…');
    restored.click();
    expect(open).toHaveBeenCalledWith('/root/original.md');
  } finally { sidebar.dispose(); }
});

it('does not flash or destroy DOM nodes when refreshing with unchanged directory contents', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const read = vi.fn().mockResolvedValue(listing('stable.md'));
  const open = vi.fn();
  const sidebar = fileSidebar(pane, { read, open, choose: async () => '/root', allowed: () => true }, { root: '/root' });
  await vi.waitFor(() => expect(button(pane, 'stable.md')).toBeDefined());
  const initialButton = button(pane, 'stable.md');

  // Background refresh with same listing
  sidebar.refresh();
  await Promise.resolve();
  await Promise.resolve();

  // The button instance must remain identical in the DOM
  expect(button(pane, 'stable.md')).toBe(initialButton);
  expect(pane.textContent).not.toContain('Loading files…');
  expect(read).toHaveBeenCalledTimes(2);
  initialButton.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  expect(open).toHaveBeenCalledWith('/root/stable.md');
  sidebar.dispose();
});

it('updates DOM in-place without displaying intermediate loading status when directory contents change', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const pendingRefresh = deferred<FolderListing>();
  const read = vi.fn().mockResolvedValueOnce(listing('initial.md')).mockReturnValueOnce(pendingRefresh.promise);
  const sidebar = fileSidebar(pane, { read, open: vi.fn(), choose: async () => '/root', allowed: () => true }, { root: '/root' });
  await vi.waitFor(() => expect(button(pane, 'initial.md')).toBeDefined());

  sidebar.refresh();
  // While read is awaiting, existing content is retained and "Loading files…" is NOT displayed
  expect(pane.textContent).not.toContain('Loading files…');
  expect(button(pane, 'initial.md')).toBeDefined();

  // Resolve with changed listing
  pendingRefresh.resolve(listing('updated.md'));
  await vi.waitFor(() => expect(button(pane, 'updated.md')).toBeDefined());
  expect(pane.textContent).not.toContain('Loading files…');
  expect(button(pane, 'initial.md')).toBeUndefined();
  sidebar.dispose();
});

it('refreshes expanded subfolders quietly when parent root is unchanged', async () => {
  const pane = document.createElement('aside'); document.body.append(pane);
  const root = '/root', subPath = '/root/sub';
  const subListing1: FolderListing = { entries: [{ name: 'child1.md', path: '/root/sub/child1.md', directory: false }], warnings: [] };
  const subListing2: FolderListing = { entries: [{ name: 'child2.md', path: '/root/sub/child2.md', directory: false }], warnings: [] };
  const rootListing: FolderListing = { entries: [{ name: 'sub', path: subPath, directory: true }], warnings: [] };

  const read = vi.fn(async (path: string) => {
    if (path === root) return rootListing;
    return readSub();
  });
  let readSub = () => subListing1;

  const open = vi.fn();
  const sidebar = fileSidebar(pane, { read, open, choose: async () => root, allowed: () => true }, { root });
  await vi.waitFor(() => expect(button(pane, 'sub')).toBeDefined());
  const folderBtn = button(pane, 'sub');

  // Expand subfolder
  folderBtn.click();
  await vi.waitFor(() => expect(button(pane, 'child1.md')).toBeDefined());
  const child1Btn = button(pane, 'child1.md');

  // Refresh with unchanged contents - neither parent nor child button should be recreated
  sidebar.refresh();
  await Promise.resolve();
  await Promise.resolve();
  expect(button(pane, 'sub')).toBe(folderBtn);
  expect(button(pane, 'child1.md')).toBe(child1Btn);
  expect(pane.textContent).not.toContain('Loading files…');
  child1Btn.dispatchEvent(new MouseEvent('click', { detail: 0 }));
  expect(open).toHaveBeenCalledWith('/root/sub/child1.md');

  // Now change subfolder content and refresh
  readSub = () => subListing2;
  sidebar.refresh();
  await vi.waitFor(() => expect(button(pane, 'child2.md')).toBeDefined());
  expect(button(pane, 'child1.md')).toBeUndefined();
  // Folder button itself was not destroyed because root was unchanged
  expect(button(pane, 'sub')).toBe(folderBtn);
  sidebar.dispose();
});
