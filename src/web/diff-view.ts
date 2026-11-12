import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { MergeView, unifiedMergeView } from '@codemirror/merge';
import { t, type TranslationKey } from './i18n';

export interface CommitInfo { hash: string; short: string; author: string; date: string; subject: string; name: string }
export interface CompareHost {
  fileName: string;
  // The text in the editor now, with unsaved edits.
  current: () => string;
  history: () => Promise<CommitInfo[]>;
  // Text of the file at "head", "staged" or a commit hash. Rejects when that version has no file.
  read: (rev: string, name?: string) => Promise<string>;
  apply: (text: string) => void;
  confirmDiscard: () => Promise<boolean> | boolean;
  // The compare view calls this once, after it removed itself (Close, or Apply edits).
  closed: () => void;
}

const CURRENT = 'current';
const EMPTY = 'empty';
const label = (commit: CommitInfo) => `${commit.short} · ${commit.subject} · ${commit.date.slice(0, 10)} · ${commit.author}`;

// A panel in the editor area (its own tab) that compares two versions of one file. The newer side is editable
// only when it is the current file. Edits go back to the document through `apply`, so Undo and Save keep their rules.
export interface CompareHandle {
  element: HTMLElement;
  close: () => Promise<void>;
  // Reads the editor text again, when it changed while the panel was hidden and the panel has no edits.
  refresh: () => void;
  dirty: () => boolean;
}
export function openCompare(host: CompareHost, parent: HTMLElement): CompareHandle {
  const overlay = document.createElement('div');
  overlay.className = 'compare-view'; overlay.id = 'compare-panel-' + Math.random().toString(36).slice(2); overlay.setAttribute('role', 'tabpanel');
  overlay.setAttribute('aria-label', t('compare.title', { name: host.fileName }));
  const bar = document.createElement('div'); bar.className = 'compare-bar';
  const title = document.createElement('strong'); title.textContent = t('compare.title', { name: host.fileName });
  const select = (name: TranslationKey) => {
    const wrap = document.createElement('label'); wrap.className = 'compare-pick';
    const text = document.createElement('span'); text.textContent = t(name);
    const control = document.createElement('select'); wrap.append(text, control);
    return { wrap, control };
  };
  const older = select('compare.old'), newer = select('compare.new');
  const mode = document.createElement('select'); mode.className = 'compare-mode'; mode.setAttribute('aria-label', t('compare.side'));
  for (const [value, name] of [['side', 'compare.side'], ['inline', 'compare.inline']] as const) mode.append(new Option(t(name), value));
  const apply = document.createElement('button'); apply.type = 'button'; apply.textContent = t('compare.apply');
  const close = document.createElement('button'); close.type = 'button'; close.textContent = t('compare.close');
  // One choice shows what a commit changed: the commit against the one before it for this file.
  const commitPick = document.createElement('select'); commitPick.className = 'compare-commit'; commitPick.setAttribute('aria-label', t('compare.commit_changes'));
  commitPick.append(new Option(t('compare.commit_changes'), ''));
  bar.append(title, commitPick, older.wrap, newer.wrap, mode, apply, close);
  const note = document.createElement('div'); note.className = 'compare-note'; note.setAttribute('role', 'status');
  const body = document.createElement('div'); body.className = 'compare-body';
  overlay.append(bar, note, body);
  parent.append(overlay);

  const cache = new Map<string, string>();
  let commits: CommitInfo[] = [];
  let merge: MergeView | undefined, single: EditorView | undefined;
  let serial = 0, closed = false, dirty = false, baseline = '', loaded = false;
  const textOf = async (value: string): Promise<string> => {
    if (value === CURRENT) return host.current();
    if (value === EMPTY) return '';
    const known = cache.get(value); if (known !== undefined) return known;
    const commit = commits.find(c => c.hash === value);
    const text = await host.read(value, commit?.name);
    cache.set(value, text); return text;
  };
  const destroy = () => { merge?.destroy(); single?.destroy(); merge = single = undefined; body.replaceChildren(); };
  const editedText = () => merge ? merge.b.state.doc.toString() : single ? single.state.doc.toString() : baseline;

  const render = async (fresh = false) => {
    const mine = ++serial;
    const keep = !fresh && newer.control.value === CURRENT && (merge || single) ? editedText() : undefined;
    destroy(); note.textContent = t('compare.loading'); dirty = false; apply.disabled = true;
    let left: string, right: string;
    try { [left, right] = await Promise.all([textOf(older.control.value), textOf(newer.control.value)]); }
    catch (error) { if (mine === serial && !closed) note.textContent = String(error); return; }
    if (mine !== serial || closed) return;
    if (keep !== undefined && newer.control.value === CURRENT) right = keep;
    baseline = right; loaded = true;
    const editable = newer.control.value === CURRENT;
    const common: Extension[] = [EditorView.lineWrapping, EditorState.readOnly.of(!editable), EditorView.editable.of(editable),
      EditorView.updateListener.of(update => { if (update.docChanged && editable) { dirty = true; apply.disabled = false; } })];
    const locked: Extension[] = [EditorView.lineWrapping, EditorState.readOnly.of(true), EditorView.editable.of(false)];
    if (mode.value === 'inline') {
      single = new EditorView({ parent: body, doc: right, extensions: [...common, unifiedMergeView({ original: left, mergeControls: false, gutter: true })] });
    } else {
      merge = new MergeView({ parent: body, a: { doc: left, extensions: locked }, b: { doc: right, extensions: common }, gutter: true, highlightChanges: true });
    }
    apply.hidden = !editable;
    note.textContent = left === right ? t('compare.same') : editable ? t('compare.hint') : t('compare.readonly');
    (merge ? merge.b : single!).focus();
  };

  const leave = async () => {
    if (closed) return;
    if (dirty && !(await host.confirmDiscard())) return;
    finish();
  };
  const finish = () => { closed = true; destroy(); overlay.remove(); host.closed(); };
  close.addEventListener('click', () => { void leave(); });
  apply.addEventListener('click', () => { host.apply(editedText()); dirty = false; finish(); });
  commitPick.addEventListener('change', () => {
    const index = commits.findIndex(commit => commit.hash === commitPick.value);
    commitPick.value = '';
    if (index < 0) return;
    newer.control.value = commits[index].hash;
    older.control.value = commits[index + 1]?.hash ?? EMPTY;
    void render();
  });
  for (const control of [older.control, newer.control, mode]) control.addEventListener('change', () => { void render(); });

  void (async () => {
    note.textContent = t('compare.loading');
    try { commits = await host.history(); } catch (error) { note.textContent = String(error); return; }
    const fill = (control: HTMLSelectElement, current: boolean) => {
      if (current) control.append(new Option(t('compare.current'), CURRENT));
      control.append(new Option(t('compare.staged'), 'staged'), new Option(t('compare.head'), 'head'));
      for (const commit of commits) control.append(new Option(label(commit), commit.hash));
      if (!current) control.append(new Option(t('compare.empty'), EMPTY));
    };
    for (const commit of commits) commitPick.append(new Option(label(commit), commit.hash));
    fill(older.control, false); fill(newer.control, true);
    older.control.value = 'head'; newer.control.value = CURRENT;
    await render();
  })();
  const refresh = () => {
    if (closed || dirty || newer.control.value !== CURRENT || !loaded) return;
    if (host.current() !== baseline) void render(true);
  };
  return { element: overlay, close: leave, refresh, dirty: () => dirty };
}
