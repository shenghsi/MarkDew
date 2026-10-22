// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { history, redo, undo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, livePreview, previewDecorations, previewField, previewItems } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { imagePath, setImagePath } from '../../src/web/images';
import { completeDocument } from '../../src/web/preview-index';

const configuration = new Compartment();
function create(source: string, anchor = 3) {
  const record = fromSource(source);
  let state = EditorState.create({ doc: normalize(record.raw), selection: { anchor }, extensions: [
    sourceExtensions(record), history(), documentLanguage(), livePreview, imagePath,
    configuration.of(EditorState.tabSize.of(4))
  ] });
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  return state.update({}).state;
}
function check(state: EditorState, source: string) {
  expect(savedSource(state.field(sourceField))).toBe(source);
  const plan = state.field(previewField), reference = collectPreview(state, syntaxTree(state), plan.imageVersion);
  expect(previewItems(state).map(item => JSON.stringify(item)).sort()).toEqual(reference.map(item => JSON.stringify(item)).sort());
  const left = plan.decorations.iter(), right = previewDecorations(state, reference).iter();
  let equal = true;
  while (left.value && right.value) {
    equal = equal && left.from === right.from && left.to === right.to && left.value.eq(right.value);
    left.next(); right.next();
  }
  expect(equal && left.value === null && right.value === null).toBe(true);
}

it('uses the production index and retains exact source through selection and Undo/Redo', () => {
  const original = '\uFEFFParagraph **strong** and `code`.\r\n\r\n# Heading\n\nNext paragraph.\r';
  let state = create(original), source = original;
  expect(state.field(previewField).index).toBeDefined();
  for (const insert of ['Z', '中', '𠀀']) {
    const at = state.selection.main.head;
    state = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input.type' }).state;
    source = source.slice(0, at + 1) + insert + source.slice(at + 1); // BOM before the first source line.
    const plan = state.field(previewField);
    expect(plan.mode).toBe('indexed');
    if (plan.mode === 'indexed') expect(plan.localCounts.visitedBlocks).toBeLessThanOrEqual(17);
    expect('items' in plan).toBe(false);
    check(state, source);
  }
  const at = state.selection.main.head;
  state = state.update({ changes: { from: at - 2, to: at, insert: '' }, selection: { anchor: at - 2 }, userEvent: 'input.delete.backward' }).state;
  source = source.slice(0, at - 1) + source.slice(at + 1);
  expect(state.field(previewField).mode).toBe('indexed'); check(state, source);
  const indexedPlan = state.field(previewField);
  state = state.update({}).state;
  expect(state.field(previewField)).toBe(indexedPlan);
  const edited = source;
  state = state.update({ selection: { anchor: state.doc.length } }).state;
  expect(state.field(previewField).mode).toBe('full'); check(state, edited);
  for (let step = 0; step < 4; step++) expect(undo({ state, dispatch: transaction => state = transaction.state })).toBe(true);
  check(state, original);
  for (let step = 0; step < 4; step++) expect(redo({ state, dispatch: transaction => state = transaction.state })).toBe(true);
  check(state, edited);
  state = state.update({ selection: { anchor: state.doc.length } }).state;
  expect(state.field(previewField).mode).toBe('full'); check(state, edited);
  state = state.update({ effects: setImagePath.of('/tmp/current.md') }).state;
  expect(state.field(previewField).mode).toBe('full'); check(state, edited);
  state = state.update({ effects: configuration.reconfigure(EditorState.tabSize.of(8)) }).state;
  check(state, edited);
});

it('falls back for structural edits, boundary changes, and unsupported dependencies', () => {
  const original = 'Paragraph **strong**.\n\nNext paragraph.';
  for (const change of [
    { from: 3, insert: '\n\n' }, { from: 0, insert: '# ' }, { from: 0, insert: '- ' },
    { from: 0, insert: '> ' }, { from: 0, insert: '```\n' }, { from: 3, insert: '$x$' },
    { from: 21, to: 23, insert: '' }, { from: original.length, insert: '\nEnd' },
  ]) {
    let state = create(original);
    const expected = original.slice(0, change.from) + change.insert + original.slice('to' in change ? change.to : change.from);
    state = state.update({ changes: change, selection: { anchor: change.from + change.insert.length } }).state;
    expect(state.field(previewField).mode).toBe('full'); check(state, expected);
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull(); state = state.update({}).state;
    check(state, expected);
  }
  const state = create(original);
  const multiple = state.update({ changes: [{ from: 3, insert: 'Z' }, { from: 5, insert: '中' }] }).state;
  expect(multiple.field(previewField).mode).toBe('full');
  check(multiple, original.slice(0, 3) + 'Z' + original.slice(3, 5) + '中' + original.slice(5));
  for (const source of ['Paragraph $x$.', 'Paragraph [link](/x).', '> Paragraph.']) {
    const unsupported = create(source);
    expect(unsupported.field(previewField).index).toBeUndefined(); check(unsupported, source);
  }
});

it('uses the full path for partial parsing and replaces the index after settlement', () => {
  const source = ('# Heading\n\nParagraph **strong** and `code`.\n\n').repeat(25000);
  let state = EditorState.create({ doc: source, extensions: [documentLanguage(), livePreview] });
  expect(syntaxTreeAvailable(state, state.doc.length)).toBe(false);
  expect(state.field(previewField).mode).toBe('full');
  expect(state.field(previewField).index).toBeUndefined();
  const at = source.indexOf('Paragraph') + 3;
  state = state.update({ changes: { from: at, insert: '中' } }).state;
  expect(state.field(previewField).mode).toBe('full');
  expect(state.field(previewField).index).toBeUndefined();
  // A complete small mixed-language document gives a deterministic acceptance
  // precondition. Production parser time budgets are unchanged.
  state = create('Paragraph **strong**.\n\n# Heading\n\nNext');
  expect(completeDocument(state)).toBeDefined();
  state = state.update({ changes: { from: 3, insert: '中' }, selection: { anchor: 4 } }).state;
  expect(state.field(previewField).mode).toBe('indexed');
  const left = state.field(previewField).decorations.iter(), right = previewDecorations(state, collectPreview(state, syntaxTree(state))).iter();
  let equal = true;
  while (left.value && right.value) {
    equal = equal && left.from === right.from && left.to === right.to && left.value.eq(right.value);
    left.next(); right.next();
  }
  expect(equal && left.value === null && right.value === null).toBe(true);
}, 30000);
