export type SidebarChoice = 'hidden' | 'files' | 'outline';
interface Layout { version: 1; folder: string; sidebar: SidebarChoice; width: number }
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;
const key = 'markdew.layout';
const validWidth = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 150 && value <= 400;
const validPane = (value: unknown): value is SidebarChoice => value === 'hidden' || value === 'files' || value === 'outline';
const validFolder = (value: unknown): value is string => typeof value === 'string' &&
  !value.includes('\0') && new TextEncoder().encode(value).length <= 8192 &&
  (value === '' || value.startsWith('/') || value.startsWith('\\\\') || /^[a-z]:[\\/]/i.test(value));

// Presentation preferences contain no source, baseline, recovery token, or tab.
export function layoutPreferences(storage: StorageAccess = () => localStorage) {
  let current: Layout = { version: 1, folder: '', sidebar: 'hidden', width: 250 };
  try {
    const text = storage().getItem(key);
    if (text && text.length <= 32768) {
      const value = JSON.parse(text);
      if (value?.version === 1 && validFolder(value.folder) && validPane(value.sidebar))
        current = { version: 1, folder: value.folder, sidebar: value.sidebar, width: validWidth(value.width) ? value.width : 250 };
    }
  } catch { /* Unavailable or damaged preferences do not prevent editing. */ }
  function write() {
    try { storage().setItem(key, JSON.stringify(current)); } catch { /* This launch still uses the current layout. */ }
  }
  return {
    get folder() { return current.folder; },
    get sidebar() { return current.sidebar; },
    get width() { return current.width; },
    widthChanged(width: number) { if (validWidth(width)) { current = { ...current, width }; write(); } },
    folderChanged(folder: string) { if (validFolder(folder)) { current = { ...current, folder }; write(); } },
    sidebarChanged(sidebar: SidebarChoice) { if (validPane(sidebar)) { current = { ...current, sidebar }; write(); } },
  };
}
