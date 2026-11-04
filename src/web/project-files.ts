// Remembers the files that are open in each project folder, so that opening the folder again
// opens the same files. The record keeps only native paths: no source, baseline, or recovery data.
export interface ProjectFiles { files: string[]; active: string }
type StorageAccess = () => Pick<Storage, 'getItem' | 'setItem'>;
interface Record { version: 1; projects: { folder: string; files: string[]; active: string }[] }

const key = 'markdew.projectFiles';
const maxProjects = 32, maxFiles = 64, maxPath = 8192;
const validPath = (value: unknown): value is string => typeof value === 'string' && value.length > 0 &&
  value.length <= maxPath && !value.includes('\0');

export function projectFiles(storage: StorageAccess = () => localStorage) {
  function read(): Record['projects'] {
    try {
      const text = storage().getItem(key);
      if (!text || text.length > 4 * 1024 * 1024) return [];
      const value = JSON.parse(text);
      if (value?.version !== 1 || !Array.isArray(value.projects)) return [];
      return value.projects.filter((entry: unknown): entry is Record['projects'][number] => {
        const item = entry as Record['projects'][number];
        return !!item && validPath(item.folder) && Array.isArray(item.files) && item.files.every(validPath) &&
          (item.active === '' || validPath(item.active));
      }).slice(0, maxProjects);
    } catch { return []; }
  }
  return {
    get(folder: string): ProjectFiles | undefined {
      const entry = read().find(item => item.folder === folder);
      return entry && { files: [...entry.files], active: entry.active };
    },
    set(folder: string, files: readonly string[], active: string) {
      if (!validPath(folder)) return;
      const kept = [...new Set(files.filter(validPath))].slice(0, maxFiles);
      const entry = { folder, files: kept, active: kept.includes(active) ? active : '' };
      // The most recent project is first; the oldest projects are removed past the limit.
      const projects = [entry, ...read().filter(item => item.folder !== folder)].slice(0, maxProjects);
      try { storage().setItem(key, JSON.stringify({ version: 1, projects } satisfies Record)); } catch { /* Editing continues without the record. */ }
    },
  };
}
