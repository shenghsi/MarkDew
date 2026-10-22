// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { history, isolateHistory, undo, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, previewDecorations } from '../../src/web/preview';
import { footnotes, freshFootnotes } from '../../src/web/footnotes';
import { imagePath, setImagePath } from '../../src/web/images';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { notePreview, notePreviewField, stableNotes } from '../performance/experiments/note-index/preview';

const display = new Compartment();
function setup(source: string, anchor?: number) {
  const record = fromSource(source), doc = normalize(record.raw);
  let state = EditorState.create({ doc, selection: { anchor: anchor ?? doc.indexOf('Paragraph') + 3 },
    extensions: [sourceExtensions(record), history(), imagePath, documentLanguage(), display.of(notePreview)] });
  ensureSyntaxTree(state, state.doc.length, 10000); return state.update({}).state;
}
function check(state: EditorState) {
  expect(footnotes(state)).toEqual(freshFootnotes(state));
  const actual = state.field(notePreviewField).decorations.iter(), expected = previewDecorations(state, collectPreview(state, syntaxTree(state))).iter();
  let equal = true;
  while (actual.value && expected.value) {
    equal = equal && actual.from === expected.from && actual.to === expected.to && actual.value.eq(expected.value);
    actual.next(); expected.next();
  }
  expect(equal && actual.value === null && expected.value === null).toBe(true);
}

it('retains a local ordinary index and rebuilds all shifted notes with exact source history', () => {
  const original = '\uFEFF# Heading **with[^图]**\r\n\r\nParagraph **strong[^b]** and `code`, repeat[^图].\n\n[^图]: 日本語 **note**\r\n\r\n[^b]: Second note\r\n\rEnd paragraph.\n';
  let state = setup(original); expect(state.field(notePreviewField).index).toBeDefined(); check(state);
  const sources = [original];
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  for (const insert of ['Z', '中', '𠀀', 'e\u0301']) {
    const at = state.selection.main.head;
    const enumeration = vi.spyOn(state.field(notePreviewField).index!.decorations, 'iter');
    // This is a complete-tree correctness check, not a parser deadline check.
    // OS preemption in a parallel suite must not consume the 20 ms parse budget.
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      state = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input.type', annotations: isolateHistory.of('full') }).state;
      expect(enumeration).not.toHaveBeenCalled();
      expect(syntaxTree(state).length).toBe(state.doc.length);
    } finally { enumeration.mockRestore(); clock.mockRestore(); }
    expect(state.field(notePreviewField).mode).toBe('indexed');
    expect(state.field(notePreviewField).localCounts!.visitedBlocks).toBeLessThanOrEqual(17); check(state);
    sources.push(savedSource(state.field(sourceField)));
  }
  for (let step = sources.length - 2; step >= 0; step--) { expect(undo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(sources[step]); check(state); }
  for (let step = 1; step < sources.length; step++) { expect(redo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(sources[step]); check(state); }
  state = state.update({ effects: display.reconfigure([]) }).state;
  expect(savedSource(state.field(sourceField))).toBe(sources.at(-1));
  expect(undo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(sources.at(-2));
  expect(redo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(sources.at(-1));
  state = state.update({ effects: display.reconfigure(notePreview) }).state; check(state);
});

it('matches complete ordering for heading/emphasis references and adjacent or complex definitions', () => {
  const fixtures = [
    'Paragraph **text[^a]** more[^a].\n\n[^a]: Note\n\nEnd.',
    '# [^a] Heading\n\nParagraph words.\n\n[^a]: Note\n\nEnd.',
    'Paragraph words[^B] other[^a].\n\n[^a]: First\n[^b]: Second\n\nEnd.',
    'Paragraph words[^a].\n\n[^a]: First\n\n[^A]: Duplicate\n\nEnd.',
    'Paragraph words[^a].\n\n[^a]: First\n\n    continuation **text**\n\n    ```\n    code\n    ```\n\nEnd.',
    'Paragraph words[^a].\n\n[^a]: <b>HTML</b> $x$ [link](/x) ![image](/x)\n\nEnd.',
    'Paragraph words[^a].\n\n[^a]: first\n\n    <div>HTML</div>\n\nEnd.',
  ];
  for (const original of fixtures) {
    let state = setup(original); check(state);
    for (const insert of ['Z', '中']) {
      const at = state.selection.main.head;
      state = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length } }).state; check(state);
    }
    const model = footnotes(state);
    for (const note of [...model.references, ...model.definitions]) {
      state = state.update({ selection: EditorSelection.range(Math.max(0, note.from - 1), Math.min(state.doc.length, note.to + 1)) }).state;
      expect(state.field(notePreviewField).mode).toBe('full'); check(state);
    }
  }
});

it('uses full construction for changed notes, structural edits, resources, and configuration', () => {
  const original = 'Paragraph words[^a].\n\n[^a]: First\n\nEnd paragraph.';
  const state = setup(original), model = footnotes(state);
  for (const changes of [
    { from: model.references[0].from + 2, insert: 'b' },
    { from: model.references[0].from, to: model.references[0].to },
    { from: model.definitions[0].from + 7, insert: 'Z' },
    { from: model.definitions[0].from, to: model.definitions[0].to },
    { from: 3, insert: '\n\n' }, { from: 3, insert: '[^b]' }, { from: 3, insert: '$x$' },
    { from: 0, insert: '# ' }, { from: 3, insert: '😀' },
  ]) {
    const transaction = state.update({ changes, selection: { anchor: changes.from } });
    expect(transaction.state.field(notePreviewField).mode).toBe('full'); check(transaction.state);
  }
  expect(stableNotes(state.update({ changes: { from: model.references[0].from, insert: 'Z' } }))).toBe(false);
  for (const source of ['Paragraph [link](/x).', 'Paragraph[^missing].', '> Paragraph words[^a].\n\n[^a]: Note', 'Paragraph $x$.', '---\ntitle: A\n---\n\nParagraph words[^a].\n\n[^a]: Note']) {
    const other = setup(source); expect(other.field(notePreviewField).index).toBeUndefined(); check(other);
  }
  for (const effects of [setImagePath.of('/tmp/current.md'), display.reconfigure(notePreview)]) {
    const next = state.update({ effects }).state; expect(next.field(notePreviewField).mode).toBe('full'); check(next);
  }
  const multiple = state.update({ changes: [{ from: 3, insert: 'Z' }, { from: 6, insert: '中' }] }).state;
  expect(multiple.field(notePreviewField).mode).toBe('full'); check(multiple);
});

it('rejects partial published trees and accepts settled complete trees', () => {
  const source = 'Paragraph words[^a].\n\n' + '# Heading\n\nParagraph words.\n\n'.repeat(25000) + '[^a]: Note\n';
  let state = EditorState.create({ doc: source, selection: { anchor: 3 }, extensions: [documentLanguage(), notePreview] });
  expect(state.field(notePreviewField).index).toBeUndefined(); check(state);
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull(); state = state.update({}).state;
  expect(state.field(notePreviewField).index).toBeDefined(); check(state);
}, 30000);
