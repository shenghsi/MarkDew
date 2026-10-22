import { t } from './i18n';

export interface FolderEntry { name: string; path: string; directory: boolean }
export interface FolderListing { entries: FolderEntry[]; warnings: string[] }
export function getSeparator(path: string): string {
  return path.includes('\\') && !path.startsWith('/') ? '\\' : '/';
}
export function getParentDir(path: string): string {
  const sep = getSeparator(path);
  const idx = path.lastIndexOf(sep);
  if (idx <= 0) return idx === 0 ? sep : path;
  const parent = path.slice(0, idx);
  return /^[a-zA-Z]:$/.test(parent) ? parent + sep : parent;
}
export function isPathInsideFolder(filePath: string, folderPath: string): boolean {
  if (!filePath || !folderPath) return false;
  const normFile = filePath.replace(/\\/g, '/').replace(/\/+$/, '');
  const normFolder = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
  if (normFile === normFolder) return true;
  const folderPrefix = normFolder + '/';
  if (/^[a-zA-Z]:\//.test(normFile) && /^[a-zA-Z]:\//.test(normFolder)) {
    return normFile.toLowerCase().startsWith(folderPrefix.toLowerCase());
  }
  return normFile.startsWith(folderPrefix);
}
export function getFileName(path: string): string {
  const sep = getSeparator(path);
  const idx = path.lastIndexOf(sep);
  return idx >= 0 ? path.slice(idx + 1) : path;
}

export interface OpenOptions {
  preview?: boolean;
  newTab?: boolean;
}

export interface SidebarServices {
  read(path: string): Promise<FolderListing>;
  choose(): Promise<string | null>;
  open(path: string, options?: OpenOptions): void;
  allowed(): boolean;
  createFile?: (parent: string, name?: string) => Promise<string>;
  renameFile?: (oldPath: string, newPath: string) => Promise<void>;
  deletePath?: (path: string) => Promise<void>;
  confirmDelete?: (name: string, isDirectory: boolean) => Promise<boolean> | boolean;
}

// Each mounted folder owns its request token. A root refresh removes all older
// owners; collapse invalidates only that folder's pending publication.
export function fileSidebar(pane: HTMLElement, services: SidebarServices,
  options: { root?: string; deferRead?: boolean; rootChanged?: (root: string) => void; switchView?: (view: 'files' | 'outline') => void; showHeading?: boolean } = {}) {
  let root = options.root || '', active = '', generation = 0, disposed = false, choosing = false;
  let deferredRead = !!options.deferRead, persistRoot = false;
  const requests = new WeakMap<HTMLElement, number>();
  const parentFolders = new WeakMap<HTMLButtonElement, HTMLButtonElement>();
  const folderChildren = new WeakMap<HTMLButtonElement, HTMLElement>();
  const expandedPaths = new Set<string>();
  interface CachedListing {
    path: string;
    signature: string;
    childFolders: { path: string; reload: () => void }[];
  }
  const cachedListings = new WeakMap<HTMLElement, CachedListing>();
  function listingSignature(listing: FolderListing): string {
    const warnings = listing.warnings.join('\0');
    const entries = listing.entries.map(e => `${e.name}:${e.path}:${e.directory ? 'd' : 'f'}`).join('\0');
    return `${warnings}:::${entries}`;
  }
  const heading = document.createElement('div');
  if (options.switchView) {
    heading.className = 'sidebar-header files-heading';
    const tabs = document.createElement('div');
    tabs.className = 'sidebar-tabs';
    const outlineTab = document.createElement('button');
    outlineTab.type = 'button';
    outlineTab.className = 'sidebar-tab-btn sidebar-tab-outline';
    outlineTab.title = 'Outline';
    outlineTab.setAttribute('aria-label', 'Outline');
    outlineTab.addEventListener('click', () => { options.switchView?.('outline'); });
    tabs.append(outlineTab);
    const title = document.createElement('span');
    title.className = 'sidebar-title';
    title.textContent = 'FILES';
    heading.append(tabs, title);
  } else {
    heading.className = 'files-heading';
    heading.textContent = 'FILES';
  }
  const actions = document.createElement('div'); actions.className = 'files-actions';
  const choose = document.createElement('button'); choose.textContent = 'Open folder';
  const refresh = document.createElement('button'); refresh.textContent = 'Refresh files'; refresh.disabled = true;
  const icon = (directory: boolean) => {
    const value = document.createElement('span');
    value.className = `files-icon ${directory ? 'files-icon-folder' : 'files-icon-document'}`;
    value.setAttribute('aria-hidden', 'true'); return value;
  };
  const label = document.createElement('div'); label.className = 'files-root';
  const rootName = document.createElement('span'); label.append(icon(true), rootName);
  const body = document.createElement('div'); body.className = 'files-list';
  pane.setAttribute('aria-description', 'Arrow Up and Down move through files. Arrow Right opens a folder or moves to its children. Arrow Left closes a folder or moves to its parent. Home and End move to the first and last entries. Enter opens the focused file.');
  actions.append(choose, refresh);
  if (options.showHeading !== false) {
    pane.append(heading, actions, label, body);
  } else {
    pane.append(actions, label, body);
  }
  const visible = (button: HTMLButtonElement) => button.isConnected && body.contains(button) && !button.closest('[hidden]');
  const entries = (parent: HTMLElement = body) => Array.from(parent.querySelectorAll<HTMLButtonElement>('button[data-sidebar-entry]')).filter(visible);
  function keydown(event: KeyboardEvent) {
    if (disposed || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const button = event.target;
    if (!(button instanceof HTMLButtonElement) || !visible(button) || !services.allowed()) return;
    const buttons = entries(), index = buttons.indexOf(button); if (index < 0) return;
    let target: HTMLButtonElement | undefined;
    if (event.key === 'ArrowUp') target = buttons[Math.max(0, index - 1)];
    else if (event.key === 'ArrowDown') target = buttons[Math.min(buttons.length - 1, index + 1)];
    else if (event.key === 'Home') target = buttons[0];
    else if (event.key === 'End') target = buttons[buttons.length - 1];
    else if (event.key === 'ArrowRight') {
      const children = folderChildren.get(button);
      if (children) {
        if (button.getAttribute('aria-expanded') === 'false') button.click();
        else target = entries(children)[0];
      }
    } else if (button.getAttribute('aria-expanded') === 'true') button.click();
    else target = parentFolders.get(button);
    event.preventDefault();
    if (target && visible(target)) target.focus();
  }
  body.addEventListener('keydown', keydown);
  function message(parent: HTMLElement, text: string) {
    const value = document.createElement('p'); value.textContent = text; value.setAttribute('role', 'status'); parent.append(value);
  }
  async function load(path: string, parent: HTMLElement, owner: () => boolean, folder?: HTMLButtonElement, accepted?: () => void) {
    const request = (requests.get(parent) || 0) + 1; requests.set(parent, request);
    const current = () => owner() && requests.get(parent) === request;
    function clear() {
      if (parent.contains(document.activeElement)) (folder || (refresh.disabled ? choose : refresh)).focus();
      cachedListings.delete(parent);
      parent.replaceChildren();
    }
    const cached = cachedListings.get(parent);
    const hasRenderedContent = cached !== undefined && cached.path === path;
    if (!hasRenderedContent) {
      clear(); message(parent, 'Loading files…');
    }
    try {
      const listing = await services.read(path); if (!current()) return;
      accepted?.();
      const newSignature = listingSignature(listing);
      if (hasRenderedContent && cached.signature === newSignature) {
        for (const child of cached.childFolders) {
          if (expandedPaths.has(child.path)) {
            child.reload();
          }
        }
        return;
      }
      clear();
      for (const warning of listing.warnings) message(parent, warning);
      if (!listing.entries.length) message(parent, 'No Markdown files or folders.');
      const list = document.createElement('ul'); parent.append(list);
      const childFolders: { path: string; reload: () => void }[] = [];
      for (const entry of listing.entries) {
        const item = document.createElement('li'), button = document.createElement('button');
        button.dataset.sidebarEntry = ''; if (folder) parentFolders.set(button, folder);
        const name = document.createElement('span'); name.className = 'files-entry-name'; name.textContent = entry.name;
        const caret = document.createElement('span'); caret.className = 'files-caret'; caret.setAttribute('aria-hidden', 'true');
        button.append(caret, icon(entry.directory), name); button.title = entry.path; item.append(button); list.append(item);
        if (!entry.directory) {
          button.dataset.filePath = entry.path;
          if (entry.path === active) button.setAttribute('aria-current', 'page');
          let clickTimer: ReturnType<typeof setTimeout> | null = null;
          button.addEventListener('click', (event: MouseEvent) => {
            if (disposed || !body.contains(button) || !services.allowed()) return;
            if (event.detail === 0) {
              services.open(entry.path);
              return;
            }
            clickTimer = setTimeout(() => {
              clickTimer = null;
              if (!disposed && body.contains(button) && services.allowed()) {
                services.open(entry.path, { preview: true, newTab: false });
              }
            }, 200);
          });
          button.addEventListener('dblclick', () => {
            if (clickTimer) {
              clearTimeout(clickTimer);
              clickTimer = null;
            }
            if (!disposed && body.contains(button) && services.allowed()) {
              services.open(entry.path, { preview: false, newTab: true });
            }
          });
          continue;
        }
        let expanded = expandedPaths.has(entry.path), token = 0;
        const children = document.createElement('div'); children.hidden = !expanded; item.append(children);
        folderChildren.set(button, children);
        button.className = 'files-folder'; button.setAttribute('aria-expanded', String(expanded));
        const reloadChild = () => {
          const request = ++token;
          void load(entry.path, children, () => !disposed && body.contains(children) && expandedPaths.has(entry.path) && token === request, button);
        };
        childFolders.push({ path: entry.path, reload: reloadChild });
        if (expanded) {
          reloadChild();
        }
        button.addEventListener('click', () => {
          if (disposed || !body.contains(button) || !services.allowed()) return;
          if (expanded && children.contains(document.activeElement)) button.focus();
          expanded = !expanded; children.hidden = !expanded; button.setAttribute('aria-expanded', String(expanded));
          if (expanded) expandedPaths.add(entry.path);
          else expandedPaths.delete(entry.path);
          if (expanded) reloadChild();
        });
      }
      cachedListings.set(parent, { path, signature: newSignature, childFolders });
    } catch (error) {
      if (!current()) return;
      cachedListings.delete(parent);
      clear(); message(parent, String(error));
      const retry = document.createElement('button'); retry.textContent = 'Retry folder'; parent.append(retry);
      retry.dataset.sidebarEntry = ''; if (folder) parentFolders.set(retry, folder);
      retry.addEventListener('click', () => { if (current() && services.allowed()) void load(path, parent, owner, folder, accepted); });
    }
  }
  function render() {
    const request = ++generation;
    // Unix names can contain a literal backslash. Only Windows paths use both
    // separator forms. Display changes never alter the host path.
    const parts = root.split(root.startsWith('/') ? '/' : /[\\/]/).filter(Boolean);
    rootName.textContent = parts.length === 1 && /^[A-Za-z]:$/.test(parts[0]) ? root : parts[parts.length - 1] || root;
    label.title = root; label.hidden = !root; refresh.disabled = !root;
    if (root && !deferredRead) void load(root, body, () => !disposed && generation === request, undefined, () => {
      if (persistRoot) { persistRoot = false; options.rootChanged?.(root); }
    });
    else { cachedListings.delete(body); body.replaceChildren(); message(body, 'Choose a folder to show Markdown files.'); }
  }
  choose.addEventListener('click', async () => {
    if (disposed || choosing || !services.allowed()) return;
    choosing = true; choose.disabled = true;
    try {
      const selected = await services.choose();
      if (!disposed && selected && services.allowed()) { root = selected; persistRoot = true; render(); }
    } catch (error) { if (!disposed) message(body, String(error)); }
    finally { choosing = false; choose.disabled = false; }
  });
  refresh.addEventListener('click', () => { if (!disposed && services.allowed() && root) { refresh.focus(); render(); } });
  render();
  let activeMenu: HTMLElement | null = null;
  let removeMenuListeners: (() => void) | null = null;
  function closeContextMenu() {
    if (activeMenu) {
      activeMenu.remove();
      activeMenu = null;
    }
    if (removeMenuListeners) {
      removeMenuListeners();
      removeMenuListeners = null;
    }
  }

  async function handleNewFile(targetDir: string, targetFolderBtn?: HTMLButtonElement) {
    if (disposed || !services.createFile || !services.allowed()) return;
    try {
      if (targetFolderBtn) {
        expandedPaths.add(targetDir);
        const children = folderChildren.get(targetFolderBtn);
        if (children) {
          children.hidden = false;
          targetFolderBtn.setAttribute('aria-expanded', 'true');
        }
      }
      const createdPath = await services.createFile(targetDir);
      if (disposed) return;

      const folderBtn = targetFolderBtn || (targetDir !== root ? Array.from(pane.querySelectorAll<HTMLButtonElement>('button.files-folder')).find(b => b.title === targetDir) : undefined);
      if (folderBtn) {
        expandedPaths.add(targetDir);
        const children = folderChildren.get(folderBtn);
        if (children) {
          children.hidden = false;
          folderBtn.setAttribute('aria-expanded', 'true');
          await load(targetDir, children, () => !disposed && expandedPaths.has(targetDir), folderBtn);
        } else {
          render();
        }
      } else {
        const req = ++generation;
        await load(root, body, () => !disposed && generation === req);
      }

      const newBtn = Array.from(pane.querySelectorAll<HTMLButtonElement>('button[data-file-path]'))
        .find(b => b.dataset.filePath === createdPath || b.title === createdPath);

      if (newBtn) {
        startInlineRename(newBtn, createdPath, true);
      } else {
        services.open(createdPath);
      }
    } catch (err) {
      message(body, String(err));
    }
  }

  function startInlineRename(fileBtn: HTMLButtonElement, currentPath: string, isNew: boolean) {
    if (disposed) return;
    const initialName = getFileName(currentPath);
    const parentDir = getParentDir(currentPath);
    const sep = getSeparator(currentPath);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'files-rename-input';
    input.value = initialName;
    input.setAttribute('aria-label', 'Rename file');

    fileBtn.style.display = 'none';
    fileBtn.after(input);
    input.focus();

    const dot = initialName.lastIndexOf('.');
    if (dot > 0) {
      input.setSelectionRange(0, dot);
    } else {
      input.select();
    }

    let finished = false;

    const cleanup = () => {
      input.remove();
      fileBtn.style.display = '';
    };

    const commit = async () => {
      if (finished) return;
      finished = true;
      const rawVal = input.value.trim();
      cleanup();

      if (!rawVal || rawVal === initialName) {
        if (isNew) services.open(currentPath);
        return;
      }

      const finalName = rawVal.endsWith('.md') ? rawVal : `${rawVal}.md`;
      const finalPath = parentDir.endsWith(sep) ? `${parentDir}${finalName}` : `${parentDir}${sep}${finalName}`;

      if (finalPath !== currentPath && services.renameFile) {
        try {
          await services.renameFile(currentPath, finalPath);
          render();
          if (isNew) services.open(finalPath);
        } catch (err) {
          message(body, String(err));
          if (isNew) services.open(currentPath);
        }
      } else {
        if (isNew) services.open(currentPath);
      }
    };

    const cancel = () => {
      if (finished) return;
      finished = true;
      cleanup();
      if (isNew) services.open(currentPath);
    };

    input.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Enter') {
        event.preventDefault();
        void commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });

    input.addEventListener('blur', () => {
      void commit();
    });
  }

  pane.addEventListener('contextmenu', (event: MouseEvent) => {
    if (disposed || !services.allowed() || !root || !services.createFile) return;
    event.preventDefault();
    closeContextMenu();

    const target = event.target as HTMLElement | null;
    const folderButton = target?.closest<HTMLButtonElement>('button.files-folder');
    const fileButton = target?.closest<HTMLButtonElement>('button[data-file-path]');

    let targetDir = root;
    let targetFolderBtn: HTMLButtonElement | undefined;
    let targetPath: string | null = null;
    let isDirectory = false;

    if (folderButton && folderButton.title) {
      targetDir = folderButton.title;
      targetFolderBtn = folderButton;
      targetPath = folderButton.title;
      isDirectory = true;
    } else if (fileButton && fileButton.title) {
      targetPath = fileButton.dataset.filePath || fileButton.title;
      targetDir = getParentDir(targetPath);
      targetFolderBtn = parentFolders.get(fileButton);
      isDirectory = false;
    }

    const menu = document.createElement('div');
    menu.className = 'sidebar-context-menu';
    menu.style.visibility = 'hidden';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    const newFileItem = document.createElement('button');
    newFileItem.type = 'button';
    newFileItem.className = 'sidebar-context-item';
    newFileItem.textContent = t('sidebar.new_file');
    newFileItem.addEventListener('click', () => {
      closeContextMenu();
      void handleNewFile(targetDir, targetFolderBtn);
    });
    menu.append(newFileItem);

    if (fileButton && services.renameFile && fileButton.dataset.filePath) {
      const renameItem = document.createElement('button');
      renameItem.type = 'button';
      renameItem.className = 'sidebar-context-item';
      renameItem.textContent = t('sidebar.rename');
      renameItem.addEventListener('click', () => {
        closeContextMenu();
        startInlineRename(fileButton, fileButton.dataset.filePath!, false);
      });
      menu.append(renameItem);
    }

    if (targetPath && services.deletePath) {
      const deleteItem = document.createElement('button');
      deleteItem.type = 'button';
      deleteItem.className = 'sidebar-context-item sidebar-context-item-delete';
      deleteItem.textContent = t('sidebar.delete');
      deleteItem.addEventListener('click', async () => {
        closeContextMenu();
        const name = getFileName(targetPath!);
        let confirmed = true;
        if (services.confirmDelete) {
          confirmed = await services.confirmDelete(name, isDirectory);
        } else if (typeof window.confirm === 'function') {
          confirmed = window.confirm(t('sidebar.confirm_delete', { name }));
        }
        if (confirmed) {
          try {
            await services.deletePath!(targetPath!);
            render();
          } catch (err) {
            message(body, String(err));
          }
        }
      });
      menu.append(deleteItem);
    }

    document.body.append(menu);
    activeMenu = menu;

    const rect = menu.getBoundingClientRect();
    let left = event.clientX;
    let top = event.clientY;

    if (top + rect.height > window.innerHeight) {
      top = Math.max(8, Math.min(event.clientY - rect.height, window.innerHeight - rect.height - 8));
    }
    if (left + rect.width > window.innerWidth) {
      left = Math.max(8, window.innerWidth - rect.width - 8);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.visibility = '';

    const onPointerDown = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };
    const onBlur = () => {
      closeContextMenu();
    };
    removeMenuListeners = () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', onBlur);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', onBlur);
  });

  return { dispose() { disposed = true; generation++; closeContextMenu(); body.removeEventListener('keydown', keydown); }, root: () => root,
    show() { if (!disposed && deferredRead) { deferredRead = false; render(); } },
    refresh() { if (!disposed && services.allowed() && root) render(); },
    select(path: string) {
      active = path;
      pane.querySelectorAll<HTMLButtonElement>('button[data-file-path]').forEach(button => {
        if (button.dataset.filePath === path) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
    } };
}
