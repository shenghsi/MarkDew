import { t } from './i18n';

// Open Quickly (Ctrl+P): type part of a file name and open a file of the project folder.
export interface QuickFile { path: string; relative: string; name: string }
export const RESULT_LIMIT = 50;

export function quickFiles(root: string, paths: string[]): QuickFile[] {
  const prefix = root.replace(/[\\/]+$/, '');
  return paths.map(path => {
    const relative = path.startsWith(prefix) ? path.slice(prefix.length).replace(/^[\\/]+/, '') : path;
    return { path, relative, name: relative.split(/[\\/]/).pop() || relative };
  });
}

// Letters of the term in order inside the text. Runs of neighbors and word starts score more.
function subsequence(text: string, term: string): number | null {
  let at = 0, score = 0, run = 0;
  for (let index = 0; index < text.length && at < term.length; index++) {
    if (text[index] === term[at]) {
      const boundary = index === 0 || /[\s\-_./\\]/.test(text[index - 1]);
      score += 1 + run * 2 + (boundary ? 3 : 0); run++; at++;
    } else run = 0;
  }
  return at === term.length ? score : null;
}
// Every word of the query must match. A match in the file name ranks above one in the folder path.
export function score(file: QuickFile, query: string): number | null {
  const name = file.name.toLowerCase(), path = file.relative.toLowerCase();
  let total = 0;
  for (const term of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    const inName = name.indexOf(term), inPath = path.indexOf(term);
    let best: number | null = null;
    if (inName >= 0) best = 200 + term.length * 4 - inName + (inName === 0 ? 30 : 0);
    else if (inPath >= 0) best = 100 + term.length * 2;
    else {
      const fuzzyName = subsequence(name, term), fuzzyPath = subsequence(path, term);
      if (fuzzyName !== null) best = 60 + fuzzyName; else if (fuzzyPath !== null) best = fuzzyPath;
    }
    if (best === null) return null;
    total += best;
  }
  return total - file.relative.length * 0.05;
}
export function search(files: QuickFile[], query: string, opened: string[] = [], limit = RESULT_LIMIT): QuickFile[] {
  const open = new Set(opened);
  if (!query.trim()) return [...files].sort((a, b) => Number(open.has(b.path)) - Number(open.has(a.path))).slice(0, limit);
  const scored: { file: QuickFile; points: number }[] = [];
  for (const file of files) { const points = score(file, query); if (points !== null) scored.push({ file, points: points + (open.has(file.path) ? 5 : 0) }); }
  return scored.sort((a, b) => b.points - a.points || a.file.relative.length - b.file.relative.length || a.file.relative.localeCompare(b.file.relative))
    .slice(0, limit).map(entry => entry.file);
}

export interface QuickOpenHost {
  // The files of the project folder, or the reason there is none.
  list: () => Promise<{ files: QuickFile[]; incomplete: boolean } | string>;
  open: (path: string) => void;
  restoreFocus: () => void;
  opened: () => string[];
}

export function quickOpen(host: QuickOpenHost) {
  let close: (() => void) | undefined;
  async function show(): Promise<void> {
    if (close) { document.querySelector<HTMLInputElement>('.quick-open-input')?.focus(); return; }
    const backdrop = document.createElement('div'); backdrop.className = 'quick-open-backdrop';
    const box = document.createElement('div'); box.className = 'quick-open'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', t('quick.label'));
    const input = document.createElement('input'); input.className = 'quick-open-input'; input.type = 'text'; input.spellcheck = false; input.autocomplete = 'off';
    input.placeholder = t('quick.placeholder'); input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', 'quick-open-list');
    const list = document.createElement('ul'); list.className = 'quick-open-list'; list.id = 'quick-open-list'; list.setAttribute('role', 'listbox');
    const note = document.createElement('div'); note.className = 'quick-open-note'; note.setAttribute('role', 'status');
    box.append(input, list, note); backdrop.append(box); document.body.append(backdrop);
    let files: QuickFile[] = [], incomplete = false, results: QuickFile[] = [], active = 0, finished = false;
    const finish = (restore: boolean) => {
      if (finished) return; finished = true; close = undefined; backdrop.remove(); if (restore) host.restoreFocus();
    };
    close = () => finish(true);
    const paint = () => {
      list.replaceChildren();
      results.forEach((file, index) => {
        const item = document.createElement('li'); item.id = `quick-open-${index}`; item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(index === active)); item.className = index === active ? 'active' : '';
        const name = document.createElement('span'); name.className = 'quick-open-name'; name.textContent = file.name;
        const folder = document.createElement('span'); folder.className = 'quick-open-folder'; folder.textContent = file.relative === file.name ? '' : file.relative.slice(0, file.relative.length - file.name.length).replace(/[\\/]+$/, '');
        item.append(name, folder);
        item.addEventListener('mousemove', () => { if (active !== index) { active = index; paint(); } });
        item.addEventListener('mousedown', event => { event.preventDefault(); choose(index); });
        list.append(item);
      });
      input.setAttribute('aria-activedescendant', results.length ? `quick-open-${active}` : '');
      list.querySelector<HTMLElement>('.active')?.scrollIntoView?.({ block: 'nearest' });
    };
    const refresh = () => {
      results = search(files, input.value, host.opened()); active = 0; paint();
      const matches = input.value.trim() ? files.filter(file => score(file, input.value) !== null).length : files.length;
      note.textContent = !files.length ? note.textContent : !results.length ? t('quick.none')
        : matches > results.length ? t('quick.more', { shown: results.length, total: matches }) : incomplete ? t('quick.incomplete') : '';
    };
    const choose = (index: number) => {
      const file = results[index]; if (!file) return;
      finish(false); host.open(file.path);
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(true); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); if (!results.length) return;
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length; paint();
      } else if (event.key === 'Enter') { event.preventDefault(); choose(active); }
      else if (event.key === 'Tab') event.preventDefault();
    });
    backdrop.addEventListener('mousedown', event => { if (event.target === backdrop) finish(true); });
    input.addEventListener('blur', () => setTimeout(() => { if (!finished && document.activeElement !== input) finish(false); }, 0));
    input.focus(); note.textContent = t('quick.loading');
    const found = await host.list();
    if (finished) return;
    if (typeof found === 'string') { note.textContent = found; return; }
    files = found.files; incomplete = found.incomplete; note.textContent = files.length ? '' : t('quick.none'); refresh();
  }
  return { show, close: () => close?.() };
}
