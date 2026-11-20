import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { MergeView } from '@codemirror/merge';
import { compareDiffConfig } from './compare-diff';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from './source';
import { t, type TranslationKey } from './i18n';
import type { CompareHandle } from './diff-view';

export interface DiskSnapshot { source: string; generation: number }
export interface ConflictHost {
  fileName: string;
  current: () => string;
  disk: DiskSnapshot;
  readDisk: () => Promise<DiskSnapshot>;
  apply: (source: string, disk: DiskSnapshot, expectedEditor: string) => Promise<void>;
  confirmDiscard: () => Promise<boolean> | boolean;
  closed: () => void;
}

// The disk side is read-only. Draft edits stay here until the user applies a
// version. A failed acceptance retains both the draft and the original editor.
export function openConflict(host: ConflictHost, parent: HTMLElement): CompareHandle {
  const element = document.createElement('section');
  element.className = 'compare-view conflict-view'; element.id = 'conflict-' + Math.random().toString(36).slice(2);
  element.setAttribute('role', 'tabpanel'); element.setAttribute('aria-label', t('conflict.title', { name: host.fileName }));
  const bar = document.createElement('div'); bar.className = 'compare-bar';
  const title = document.createElement('strong'); title.textContent = t('conflict.title', { name: host.fileName }); bar.append(title);
  const button = (label: TranslationKey, action: () => void) => {
    const control = document.createElement('button'); control.type = 'button'; control.textContent = t(label);
    control.addEventListener('click', action); bar.append(control); return control;
  };
  const useDisk = button('conflict.use_disk', () => { void apply(disk.source); });
  const useEditor = button('conflict.use_editor', () => { void apply(expectedEditor); });
  const useMerged = button('conflict.apply', () => { void apply(edited()); });
  const refreshDisk = button('conflict.refresh', () => { void refreshSnapshot(); });
  const close = button('compare.close', () => { void leave(); });
  const note = document.createElement('div'); note.className = 'compare-note'; note.setAttribute('role', 'status');
  note.textContent = t('conflict.hint');
  const labels = document.createElement('div'); labels.className = 'conflict-labels';
  for (const key of ['conflict.disk', 'conflict.editor'] as const) {
    const label = document.createElement('span'); label.textContent = t(key); labels.append(label);
  }
  const body = document.createElement('div'); body.className = 'compare-body';
  element.append(bar, note, labels, body); parent.append(element);
  const input = new Compartment();
  let expectedEditor = host.current(), disk = host.disk, pending = false, closed = false;
  const record = fromSource(expectedEditor);
  const merge = new MergeView({ parent: body,
    a: { doc: normalize(fromSource(disk.source).raw), extensions: [EditorView.lineWrapping,
      EditorState.readOnly.of(true), EditorView.editable.of(false)] },
    b: { doc: normalize(record.raw), extensions: [sourceExtensions(record), history(),
      keymap.of([...defaultKeymap, ...historyKeymap]), EditorView.lineWrapping, input.of([]),
      EditorView.updateListener.of(update => { if (update.docChanged) controls(); })] },
    gutter: true, highlightChanges: true, diffConfig: compareDiffConfig, revertControls: 'a-to-b',
    renderRevertControl: () => {
      const copy = document.createElement('button'); copy.type = 'button'; copy.textContent = '→';
      copy.title = t('conflict.copy'); copy.setAttribute('aria-label', copy.title);
      // MergeView handles pointer mousedown. Supply the same action for keyboard activation.
      copy.addEventListener('click', event => {
        if (!event.detail && !pending) copy.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      return copy;
    },
  });
  merge.a.contentDOM.setAttribute('aria-label', t('conflict.disk'));
  merge.b.contentDOM.setAttribute('aria-label', t('conflict.editor'));
  const edited = () => savedSource(merge.b.state.field(sourceField));
  const dirty = () => edited() !== expectedEditor;
  function controls() {
    for (const control of [useDisk, useEditor, refreshDisk, close]) control.disabled = pending;
    useMerged.disabled = pending || !dirty();
  }
  function lock(value: boolean) {
    pending = value;
    merge.b.dispatch({ effects: input.reconfigure(value ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []) });
    // Chunk-copy buttons must also stop while a snapshot is being accepted.
    body.inert = value; controls();
  }
  function finish() { closed = true; merge.destroy(); element.remove(); host.closed(); }
  async function leave() {
    if (pending || closed || dirty() && !await host.confirmDiscard()) return;
    finish();
  }
  async function apply(source: string) {
    if (pending || closed || merge.b.compositionStarted) return;
    lock(true);
    try { await host.apply(source, disk, expectedEditor); finish(); }
    catch (error) { if (!closed) note.textContent = String(error instanceof Error ? error.message : error); }
    finally { if (!closed) lock(false); }
  }
  async function refreshSnapshot() {
    if (pending || closed || merge.b.compositionStarted) return;
    lock(true);
    try {
      const snapshot = await host.readDisk();
      if (closed) return;
      disk = snapshot;
      merge.a.dispatch({ changes: { from: 0, to: merge.a.state.doc.length, insert: normalize(fromSource(disk.source).raw) } });
      note.textContent = t('conflict.hint');
    } catch (error) { if (!closed) note.textContent = String(error instanceof Error ? error.message : error); }
    finally { if (!closed) lock(false); }
  }
  controls();
  return { element, close: leave, dirty, refresh: () => { merge.b.requestMeasure(); merge.a.requestMeasure(); } };
}
