import { expect, it, vi } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { history, undo, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, freshFootnotes } from '../../src/web/footnotes';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';

function setup(source: string) {
  const record = fromSource(source);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [documentLanguage(), footnoteField, history(), sourceExtensions(record)] });
  ensureSyntaxTree(state, state.doc.length, 1000); state = state.update({}).state;
  return state;
}
function check(state: EditorState) { expect(state.field(footnoteField)).toEqual(freshFootnotes(state)); }
it('retains a certified empty model with bounded reads through ordinary edits and history', () => {
  const original = '\uFEFF' + 'Paragraph words.\r\n\r\n'.repeat(5000);
  let state = setup(original); const model = state.field(footnoteField);
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  const transaction = state.update({ changes: { from: 4, insert: '日本😀' } });
  const slice = vi.spyOn(transaction.newDoc, 'sliceString');
  try {
    state = transaction.state; expect(state.field(footnoteField)).toBe(model);
    expect(slice.mock.calls.some(([from, to]) => from === 3 && to === 9)).toBe(true);
    // The footprint check applies only to footnote-model work, before the oracle.
    expect(slice.mock.calls.some(([from, to]) => from === 0 && (to === undefined || to === state.doc.length))).toBe(false);
  } finally { slice.mockRestore(); }
  check(state); undo(target); expect(savedSource(state.field(sourceField))).toBe(original); check(state);
  redo(target); expect(state.field(footnoteField)).toBe(model); check(state);
});
it('detects inserted markers, deletion joins, and adjacent multiple changes', () => {
  const cases = [
    { source: 'Text.\n', changes: { from: 5, insert: ' [^n]\n\n[^n]: Note.' } },
    { source: 'Use [x^n].\n\n[^n]: Note.', changes: { from: 5, to: 6 } },
    { source: 'Use [x^n].', changes: { from: 5, to: 6 } },
    { source: 'Use [xx^n].', changes: [{ from: 5, to: 6 }, { from: 6, to: 7 }] },
    { source: 'Use [xn].', changes: [{ from: 5, to: 6, insert: '^' }, { from: 7, insert: '\n\n[^n]: Note.' }] },
    { source: 'Use ^n].', changes: { from: 4, insert: '[' } },
    { source: 'Use [n].', changes: { from: 5, insert: '^' } },
    { source: '[]\n', changes: [{ from: 0, insert: '[^a]: A\n\n' }, { from: 2, insert: ' [^a]' }] },
  ];
  for (const fixture of cases) {
    const state = setup(fixture.source), model = state.field(footnoteField);
    const next = state.update({ changes: fixture.changes }).state;
    expect(next.doc.toString()).toContain('[^'); check(next);
    expect(next.field(footnoteField)).not.toBe(model);
  }
});
it('does not certify marker-bearing code or unresolved notes from empty note arrays', () => {
  for (const source of ['Text [^unknown].', '```\n[^n]\n```', 'Escaped \\[\u005en].']) {
    const state = setup(source), prior = state.field(footnoteField);
    const next = state.update({ changes: { from: state.doc.length, insert: '\n\n[^unknown]: Note.' } }).state;
    check(next); expect(next.field(footnoteField)).not.toBe(prior);
  }
});
it('checks changed metadata boundaries and the settled package tree', () => {
  for (const source of ['---\ntitle: "[^n]"\n---\n\nWords.', '---\ntitle: "[^n]"\n\nWords.', 'Words.\n']) {
    let state = setup(source); check(state);
    const position = source.startsWith('---') ? 0 : state.doc.length;
    state = state.update({ changes: { from: position, insert: position === 0 ? 'X' : '\n\n[^n]: Note.\n\n[^n]' } }).state;
    check(state); ensureSyntaxTree(state, state.doc.length, 1000); state = state.update({}).state; check(state);
  }
});
it('matches fresh models through Unicode edits, deletion joins, and changing line boundaries', () => {
  let state = setup('😀 words\r\n\r\n中文 e\u0301 [x^n].');
  const edits = [ { from: 1, insert: '中' }, { from: 0, to: 3 }, { from: 2, insert: '\n\n' },
    { from: 0, insert: '[^n]: Note.\n\n' } ];
  for (const changes of edits) { state = state.update({ changes }).state; check(state); }
  const at = state.doc.toString().indexOf('[x^'); state = state.update({ changes: { from: at + 1, to: at + 2 } }).state; check(state);
});
