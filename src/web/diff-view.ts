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
}

const CURRENT = 'current';
const label = (commit: CommitInfo) => `${commit.short} · ${commit.subject} · ${commit.date.slice(0, 10)} · ${commit.author}`;

// A full-window dialog that compares two versions of one file. The newer side is editable only when it is
// the current file. Edits go back to the document through `apply`, so Undo and Save keep their rules.
export function openCompare(host: CompareHost): { close: () => void } {
  const overlay = document.createElement('div');
  overlay.className = 'compare-overlay'; overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
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
  bar.append(title, older.wrap, newer.wrap, mode, apply, close);
  const note = document.createElement('div'); note.className = 'compare-note'; note.setAttribute('role', 'status');
  const body = document.createElement('div'); body.className = 'compare-body';
  overlay.append(bar, note, body);
  document.body.append(overlay);

  const cache = new Map<string, string>();
  let commits: CommitInfo[] = [];
  let merge: MergeView | undefined, single: EditorView | undefined;
  let serial = 0, closed = false, dirty = false, baseline = '';
  const textOf = async (value: string): Promise<string> => {
    if (value === CURRENT) return host.current();
    const known = cache.get(value); if (known !== undefined) return known;
    const commit = commits.find(c => c.hash === value);
    const text = await host.read(value, commit?.name);
    cache.set(value, text); return text;
  };
  const destroy = () => { merge?.destroy(); single?.destroy(); merge = single = undefined; body.replaceChildren(); };
  const editedText = () => merge ? merge.b.state.doc.toString() : single ? single.state.doc.toString() : baseline;

  const render = async () => {
    const mine = ++serial;
    const keep = newer.control.value === CURRENT && (merge || single) ? editedText() : undefined;
    destroy(); note.textContent = t('compare.loading'); dirty = false; apply.disabled = true;
    let left: string, right: string;
    try { [left, right] = await Promise.all([textOf(older.control.value), textOf(newer.control.value)]); }
    catch (error) { if (mine === serial && !closed) note.textContent = String(error); return; }
    if (mine !== serial || closed) return;
    if (keep !== undefined && newer.control.value === CURRENT) right = keep;
    baseline = right;
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
    closed = true; destroy(); overlay.remove(); document.removeEventListener('keydown', key, true);
  };
  const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); void leave(); } };
  document.addEventListener('keydown', key, true);
  close.addEventListener('click', () => { void leave(); });
  apply.addEventListener('click', () => { host.apply(editedText()); dirty = false; closed = true; destroy(); overlay.remove(); document.removeEventListener('keydown', key, true); });
  for (const control of [older.control, newer.control, mode]) control.addEventListener('change', () => { void render(); });

  void (async () => {
    note.textContent = t('compare.loading');
    try { commits = await host.history(); } catch (error) { note.textContent = String(error); return; }
    const fill = (control: HTMLSelectElement, current: boolean) => {
      if (current) control.append(new Option(t('compare.current'), CURRENT));
      control.append(new Option(t('compare.staged'), 'staged'), new Option(t('compare.head'), 'head'));
      for (const commit of commits) control.append(new Option(label(commit), commit.hash));
    };
    fill(older.control, false); fill(newer.control, true);
    older.control.value = 'head'; newer.control.value = CURRENT;
    await render();
  })();
  return { close: () => { void leave(); } };
}
