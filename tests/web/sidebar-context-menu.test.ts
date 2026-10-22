// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fileSidebar, FolderListing } from '../../src/web/file-sidebar';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

afterEach(() => {
  document.body.replaceChildren();
});

it('opens context menu on right click and creates new file ready for inline rename in root folder', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  let entries = [
    { name: 'README.md', path: '/root/README.md', directory: false },
  ];
  const read = vi.fn().mockImplementation(async (path: string): Promise<FolderListing> => {
    return { entries: [...entries], warnings: [] };
  });

  const createFile = vi.fn().mockImplementation(async (parent: string) => {
    const newPath = `${parent}/Untitled.md`;
    entries.push({ name: 'Untitled.md', path: newPath, directory: false });
    return newPath;
  });
  const renameFile = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  const sidebar = fileSidebar(pane, {
    read,
    open,
    choose: vi.fn(),
    allowed: () => true,
    createFile,
    renameFile,
  }, { root: '/root' });

  await vi.waitFor(() => expect(pane.querySelector('button[data-file-path]')).toBeDefined());

  // 1. Right click on pane
  const contextEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 50,
    clientY: 100,
  });
  pane.dispatchEvent(contextEvent);

  const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu');
  expect(menu).not.toBeNull();
  expect(menu?.textContent).toContain('New File');

  // 2. Click "New File"
  const newFileBtn = Array.from(menu!.querySelectorAll('button')).find(b => b.textContent === 'New File')!;
  expect(newFileBtn).toBeDefined();
  newFileBtn.click();

  // Context menu closes
  expect(document.body.querySelector('.sidebar-context-menu')).toBeNull();

  // createFile called with root
  expect(createFile).toHaveBeenCalledWith('/root');

  // Inline rename input mounted
  await vi.waitFor(() => expect(pane.querySelector<HTMLInputElement>('.files-rename-input')).not.toBeNull());
  const input = pane.querySelector<HTMLInputElement>('.files-rename-input')!;
  expect(input.value).toBe('Untitled.md');
  expect(document.activeElement).toBe(input);

  // 3. Rename to 'CustomNote' and press Enter
  input.value = 'CustomNote';
  const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  input.dispatchEvent(enterEvent);

  await vi.waitFor(() => expect(renameFile).toHaveBeenCalledWith('/root/Untitled.md', '/root/CustomNote.md'));
  expect(open).toHaveBeenCalledWith('/root/CustomNote.md');

  sidebar.dispose();
});

it('creates new file inside folder when right clicking on a folder row', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  const folderEntries: Record<string, { name: string; path: string; directory: boolean }[]> = {
    '/root': [
      { name: 'docs', path: '/root/docs', directory: true },
    ],
    '/root/docs': [],
  };

  const read = vi.fn().mockImplementation(async (path: string): Promise<FolderListing> => {
    return { entries: folderEntries[path] || [], warnings: [] };
  });

  const createFile = vi.fn().mockImplementation(async (parent: string) => {
    const newPath = `${parent}/Untitled.md`;
    if (!folderEntries[parent]) folderEntries[parent] = [];
    folderEntries[parent].push({ name: 'Untitled.md', path: newPath, directory: false });
    return newPath;
  });
  const renameFile = vi.fn().mockResolvedValue(undefined);
  const open = vi.fn();

  const sidebar = fileSidebar(pane, {
    read,
    open,
    choose: vi.fn(),
    allowed: () => true,
    createFile,
    renameFile,
  }, { root: '/root' });

  await vi.waitFor(() => expect(pane.querySelector('button.files-folder')).toBeDefined());
  const folderBtn = pane.querySelector<HTMLButtonElement>('button.files-folder')!;

  // Right click on the folder
  const contextEvent = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: 60,
    clientY: 120,
  });
  folderBtn.dispatchEvent(contextEvent);

  const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu');
  expect(menu).not.toBeNull();
  const newFileBtn = Array.from(menu!.querySelectorAll('button')).find(b => b.textContent === 'New File')!;
  newFileBtn.click();

  expect(createFile).toHaveBeenCalledWith('/root/docs');
  sidebar.dispose();
});

it('cancels inline rename on Escape and opens the created file', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  let entries = [
    { name: 'test.md', path: '/root/test.md', directory: false },
  ];
  const read = vi.fn().mockImplementation(async (): Promise<FolderListing> => {
    return { entries: [...entries], warnings: [] };
  });

  const createFile = vi.fn().mockImplementation(async (parent: string) => {
    const newPath = `${parent}/Untitled.md`;
    entries.push({ name: 'Untitled.md', path: newPath, directory: false });
    return newPath;
  });
  const renameFile = vi.fn();
  const open = vi.fn();

  const sidebar = fileSidebar(pane, {
    read,
    open,
    choose: vi.fn(),
    allowed: () => true,
    createFile,
    renameFile,
  }, { root: '/root' });

  await vi.waitFor(() => expect(pane.querySelector('button[data-file-path]')).toBeDefined());

  pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
  const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu')!;
  const newFileBtn = Array.from(menu.querySelectorAll('button')).find(b => b.textContent === 'New File')!;
  newFileBtn.click();

  await vi.waitFor(() => expect(pane.querySelector<HTMLInputElement>('.files-rename-input')).not.toBeNull());
  const input = pane.querySelector<HTMLInputElement>('.files-rename-input')!;

  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  input.dispatchEvent(escEvent);

  expect(renameFile).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledWith('/root/Untitled.md');
  expect(pane.querySelector('.files-rename-input')).toBeNull();

  sidebar.dispose();
});

it('shows Delete option on right clicking a file and executes deletePath upon confirmation', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  let entries = [
    { name: 'sample.md', path: '/root/sample.md', directory: false },
  ];
  const read = vi.fn().mockImplementation(async (): Promise<FolderListing> => {
    return { entries: [...entries], warnings: [] };
  });

  const deletePath = vi.fn().mockImplementation(async (path: string) => {
    entries = entries.filter(e => e.path !== path);
  });
  const confirmDelete = vi.fn().mockResolvedValue(true);

  const sidebar = fileSidebar(pane, {
    read,
    open: vi.fn(),
    choose: vi.fn(),
    allowed: () => true,
    createFile: vi.fn(),
    deletePath,
    confirmDelete,
  }, { root: '/root' });

  await vi.waitFor(() => expect(pane.querySelector('button[data-file-path]')).toBeDefined());
  const fileBtn = pane.querySelector<HTMLButtonElement>('button[data-file-path]')!;

  // Right-click on file
  fileBtn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 40 }));
  const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu')!;
  expect(menu).not.toBeNull();
  expect(menu.textContent).toContain('Delete');

  const deleteBtn = Array.from(menu.querySelectorAll('button')).find(b => b.textContent === 'Delete')!;
  deleteBtn.click();

  await vi.waitFor(() => expect(confirmDelete).toHaveBeenCalledWith('sample.md', false));
  expect(deletePath).toHaveBeenCalledWith('/root/sample.md');

  sidebar.dispose();
});

it('shows Delete option on right clicking a folder and executes deletePath upon confirmation', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  let entries = [
    { name: 'my-folder', path: '/root/my-folder', directory: true },
  ];
  const read = vi.fn().mockImplementation(async (): Promise<FolderListing> => {
    return { entries: [...entries], warnings: [] };
  });

  const deletePath = vi.fn().mockImplementation(async (path: string) => {
    entries = entries.filter(e => e.path !== path);
  });
  const confirmDelete = vi.fn().mockResolvedValue(true);

  const sidebar = fileSidebar(pane, {
    read,
    open: vi.fn(),
    choose: vi.fn(),
    allowed: () => true,
    createFile: vi.fn(),
    deletePath,
    confirmDelete,
  }, { root: '/root' });

  await vi.waitFor(() => expect(pane.querySelector('button.files-folder')).toBeDefined());
  const folderBtn = pane.querySelector<HTMLButtonElement>('button.files-folder')!;

  // Right-click on folder
  folderBtn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 30, clientY: 40 }));
  const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu')!;
  expect(menu).not.toBeNull();
  expect(menu.textContent).toContain('Delete');

  const deleteBtn = Array.from(menu.querySelectorAll('button')).find(b => b.textContent === 'Delete')!;
  deleteBtn.click();

  await vi.waitFor(() => expect(confirmDelete).toHaveBeenCalledWith('my-folder', true));
  expect(deletePath).toHaveBeenCalledWith('/root/my-folder');

  sidebar.dispose();
});

it('repositions context menu upward when right clicked near the bottom of the window', async () => {
  const pane = document.createElement('aside');
  document.body.append(pane);

  const sidebar = fileSidebar(pane, {
    read: vi.fn().mockResolvedValue({ entries: [], warnings: [] }),
    open: vi.fn(),
    choose: vi.fn(),
    allowed: () => true,
    createFile: vi.fn(),
  }, { root: '/root' });

  Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
  Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });

  const originalGetBCR = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function() {
    if (this.classList.contains('sidebar-context-menu')) {
      return { width: 140, height: 100, top: 0, left: 0, right: 140, bottom: 100, x: 0, y: 0, toJSON: () => {} };
    }
    return originalGetBCR.apply(this);
  };

  try {
    // Right click at clientY = 550 (near bottom: 550 + 100 = 650 > 600)
    pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 550 }));
    const menu = document.body.querySelector<HTMLElement>('.sidebar-context-menu')!;
    expect(menu).not.toBeNull();
    // top should be adjusted upward to 550 - 100 = 450px
    expect(menu.style.top).toBe('450px');
    expect(menu.style.left).toBe('50px');
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalGetBCR;
    sidebar.dispose();
  }
});

function mount(extra: Partial<Parameters<typeof fileSidebar>[1]> = {}) {
  const pane = document.createElement('aside');
  document.body.append(pane);
  const entries = [{ name: 'a.md', path: '/root/a.md', directory: false }];
  const services = {
    read: vi.fn(async (): Promise<FolderListing> => ({ entries: [...entries], warnings: [] })),
    open: vi.fn(), choose: vi.fn(), allowed: () => true,
    createFile: vi.fn(async (parent: string) => { entries.push({ name: 'Untitled.md', path: `${parent}/Untitled.md`, directory: false }); return `${parent}/Untitled.md`; }),
    renameFile: vi.fn(async () => {}), deletePath: vi.fn(async () => {}), ...extra,
  };
  const sidebar = fileSidebar(pane, services, { root: '/root' });
  return { pane, services, sidebar };
}
const menuItem = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.sidebar-context-item')).find(item => item.textContent === label)!;
async function rightClickFile(pane: HTMLElement) {
  await vi.waitFor(() => expect(pane.querySelector('button[data-file-path]')).not.toBeNull());
  pane.querySelector('button[data-file-path]')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
}

it('deletes only after the confirmation dialog says yes', async () => {
  const confirmDelete = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { pane, services, sidebar } = mount({ confirmDelete });
  await rightClickFile(pane); menuItem('Delete').click();
  await vi.waitFor(() => expect(confirmDelete).toHaveBeenCalledWith('a.md', false));
  await new Promise(resolve => setTimeout(resolve, 20));
  expect(services.deletePath).not.toHaveBeenCalled();
  await rightClickFile(pane); menuItem('Delete').click();
  await vi.waitFor(() => expect(services.deletePath).toHaveBeenCalledWith('/root/a.md'));
  sidebar.dispose();
});

it('takes focus back when it moves away right after a new file starts editing', async () => {
  const { pane, services, sidebar } = mount();
  pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  menuItem('New File').click();
  await vi.waitFor(() => expect(pane.querySelector('.files-rename-input')).not.toBeNull());
  const input = pane.querySelector<HTMLInputElement>('.files-rename-input')!;
  input.blur();
  await vi.waitFor(() => expect(document.activeElement).toBe(input));
  expect(services.open).not.toHaveBeenCalled();
  input.value = 'Typed'; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await vi.waitFor(() => expect(services.renameFile).toHaveBeenCalledWith('/root/Untitled.md', '/root/Typed.md'));
  sidebar.dispose();
});

it('keeps a real blur after the user typed as a commit', async () => {
  const { pane, services, sidebar } = mount();
  pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  menuItem('New File').click();
  await vi.waitFor(() => expect(pane.querySelector('.files-rename-input')).not.toBeNull());
  const input = pane.querySelector<HTMLInputElement>('.files-rename-input')!;
  input.value = 'Named'; input.dispatchEvent(new Event('input', { bubbles: true })); input.blur();
  await vi.waitFor(() => expect(services.renameFile).toHaveBeenCalledWith('/root/Untitled.md', '/root/Named.md'));
  sidebar.dispose();
});

it('starts editing the name when the host spells the created path differently from the listing', async () => {
  const { pane, services, sidebar } = mount({
    createFile: vi.fn(async () => '/real/root/Untitled.md'),
    read: vi.fn(async (): Promise<FolderListing> => ({ warnings: [], entries: [
      { name: 'a.md', path: '/root/a.md', directory: false }, { name: 'Untitled.md', path: '/root/Untitled.md', directory: false }] })),
  });
  pane.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  menuItem('New File').click();
  await vi.waitFor(() => expect(pane.querySelector('.files-rename-input')).not.toBeNull());
  const input = pane.querySelector<HTMLInputElement>('.files-rename-input')!;
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([0, 8]);
  expect(services.open).not.toHaveBeenCalled();
  input.value = 'Typed'; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await vi.waitFor(() => expect(services.renameFile).toHaveBeenCalledWith('/root/Untitled.md', '/root/Typed.md'));
  sidebar.dispose();
});
