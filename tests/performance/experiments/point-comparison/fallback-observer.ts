import { Transaction } from '@codemirror/state';
import { completeDocument, Index, updateIndex as originalUpdateIndex } from '../../../../src/web/preview-index';
import { stableNotes } from '../../../../src/web/preview-note-index';
import { footnotes } from '../../../../src/web/footnotes';
import { updateIndex as localUpdateIndex } from './local-index';

let enabled = false;
let localCoverage = false;
const observations = new WeakMap<Transaction, { called: true; returnedIndex: boolean; localCoverage: boolean; rejection?: unknown }>();
export function enableFallbackObservation(value: boolean) { enabled = value; }
export function enableLocalCoverage(value: boolean) { localCoverage = value; }
export function updateIndex(...args: Parameters<typeof originalUpdateIndex>): ReturnType<typeof originalUpdateIndex> {
  const compare = localCoverage ? localUpdateIndex : originalUpdateIndex;
  if (!enabled) return compare(...args);
  const [index, transaction, build, rejected, eligible] = args;
  const observation = { called: true as const, returnedIndex: false, localCoverage, rejection: undefined as unknown };
  const result = compare(index, transaction, build, reason => {
    observation.rejection = reason;
    rejected?.(reason);
  }, eligible);
  observation.returnedIndex = !!result;
  observations.set(transaction, observation);
  return result;
}

// Call only after the sample clock stops. Never replay an update or force parsing.
export function diagnoseFallback(transaction: Transaction, plan: { index?: Index; noteAware?: boolean }, indexed: boolean) {
  const observation = observations.get(transaction);
  const before = transaction.startState, after = transaction.state;
  const published = (state: typeof before) => {
    // Availability alone can follow mutable parser progress. A Document from the
    // state's published syntax tree is also required by completeDocument.
    return !!completeDocument(state);
  };
  const result = { mountedBefore: published(before), mountedAfter: published(after),
    updateIndexCalled: !!observation, returnedIndex: observation?.returnedIndex ?? false,
    reason: 'unknown', rejection: observation?.rejection };
  if (indexed) { result.reason = 'accepted'; return result; }
  if (!plan.index) { result.reason = 'no-index'; return result; }
  if (transaction.reconfigured || transaction.effects.length) { result.reason = 'effects-or-reconfiguration'; return result; }
  if (plan.noteAware) {
    const oldNotes = footnotes(before), newNotes = footnotes(after);
    if ([oldNotes, newNotes].some(notes => notes.definitions.length + notes.references.length > 128)) return result;
    if (!stableNotes(transaction)) { result.reason = 'notes-changed'; return result; }
  }
  if (!observation) return result;
  if (!transaction.docChanged) { result.reason = 'not-document-edit'; return result; }
  if (!observation.localCoverage && !result.mountedAfter) { result.reason = 'parser-incomplete'; return result; }
  if (before.selection.ranges.length !== 1 || after.selection.ranges.length !== 1) { result.reason = 'selection-count'; return result; }
  let edit: { from: number; to: number; insert: string } | undefined, count = 0;
  transaction.changes.iterChanges((from, to, _a, _b, insert) => {
    count++; if (count === 1 && insert.length <= 65536) edit = { from, to, insert: insert.toString() };
  });
  if (count !== 1) { result.reason = 'edit-count'; return result; }
  if (!edit || edit.to - edit.from > 65536) return result;
  const removed = before.sliceDoc(edit.from, edit.to);
  if (!/^[\p{L}\p{N}\p{M}]*$/u.test(edit.insert) || !/^[\p{L}\p{N}\p{M}]*$/u.test(removed)) {
    result.reason = 'structural-text'; return result;
  }
  const left = Array.from(before.sliceDoc(Math.max(0, edit.from - 2), edit.from)).at(-1) || '';
  const right = Array.from(before.sliceDoc(edit.to, Math.min(before.doc.length, edit.to + 2)))[0] || '';
  if (!/^\p{L}$/u.test(left) || !/^[\p{L}\p{N}\p{M}]$/u.test(right)) { result.reason = 'word-boundary'; return result; }
  let touched: { from: number; to: number; value: { tree: { type: { name: string } } } } | undefined;
  plan.index.blocks.between(edit.from, edit.to, (from, to, value) => {
    if (from < edit!.from && to > edit!.to) touched = { from, to, value };
  });
  if (!touched || touched.value.tree.type.name !== 'Paragraph') { result.reason = 'paragraph-envelope'; return result; }
  const line = before.doc.lineAt(edit.from);
  if (edit.from <= line.from || edit.to >= line.to) { result.reason = 'line-boundary'; return result; }
  if (before.selection.main.from < touched.from || before.selection.main.to > touched.to ||
    after.selection.main.from < transaction.changes.mapPos(touched.from, 1) ||
    after.selection.main.to > transaction.changes.mapPos(touched.to, -1)) { result.reason = 'selection-envelope'; return result; }
  if (observation.rejection) result.reason = (observation.rejection as { phase?: string }).phase === 'local-coverage'
    ? 'local-coverage' : 'block-correspondence';
  return result;
}
