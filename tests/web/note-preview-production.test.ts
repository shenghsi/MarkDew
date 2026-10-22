// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState, StateEffect, Transaction } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { history, isolateHistory, undo, undoDepth, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, previewDecorations } from '../../src/web/preview';
import { footnotes, freshFootnotes } from '../../src/web/footnotes';
import { imagePath, setImagePath } from '../../src/web/images';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { livePreview as notePreview, previewField as notePreviewField, previewItems } from '../../src/web/preview';
import { stableNotes } from '../../src/web/preview-note-index';

const display = new Compartment();
function setup(source: string, anchor?: number) {
  const record = fromSource(source), doc = normalize(record.raw);
  let state = EditorState.create({ doc, selection: { anchor: anchor ?? doc.indexOf('Paragraph') + 3 },
    extensions: [sourceExtensions(record), history(), imagePath, documentLanguage(), display.of(notePreview)] });
  ensureSyntaxTree(state, state.doc.length, 10000); return state.update({}).state;
}
function check(state: EditorState) {
  expect(footnotes(state)).toEqual(freshFootnotes(state));
  expect(previewItems(state).map(item => JSON.stringify(item)).sort()).toEqual(collectPreview(state, syntaxTree(state)).map(item => JSON.stringify(item)).sort());
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
    // Complete-tree correctness uses a fixed clock only during this edit.
    // Partial-tree and real deadline checks retain their ordinary clock.
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    try {
      state = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length }, userEvent: 'input.type', annotations: isolateHistory.of('full') }).state;
      expect(enumeration).not.toHaveBeenCalled();
      expect(syntaxTree(state).length).toBe(state.doc.length);
    } finally { enumeration.mockRestore(); clock.mockRestore(); }
    const plan = state.field(notePreviewField);
    expect(plan.mode).toBe('indexed');
    if (plan.mode !== 'indexed') throw new Error('Expected indexed preview');
    expect(plan.localCounts.visitedBlocks).toBeLessThanOrEqual(17); check(state);
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

it('retains full resource previews after edits and complete-tree settlement', () => {
  for (const resource of ['```js\nconst words = 1;\n```', '<div>HTML words</div>']) {
    const original = 'Paragraph words[^a].\n\n' + resource + '\n\n' +
      '# Heading\n\nParagraph words.\n\n'.repeat(5000) + '[^a]: Note\n';
    let state = setup(original);
    expect(state.field(notePreviewField).index).toBeUndefined();
    for (const insert of ['Z', '中', 'Z']) {
      const at = state.selection.main.head;
      state = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length } }).state;
      expect(state.field(notePreviewField).mode).toBe('full'); check(state);
      expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
      state = state.update({}).state;
      expect(syntaxTree(state).length).toBe(state.doc.length);
      expect(state.field(notePreviewField).index).toBeUndefined(); check(state);
    }
  }
}, 30000);

it('retains the ordinary-only index on selection changes and the first guarded edit', () => {
  let state = setup('Paragraph **words[^a]** and more.\n\n[^a]: Note\n\nEnd.');
  expect(state.field(notePreviewField).noteAware).toBe(true);
  state = state.update({ selection: { anchor: 5 } }).state;
  expect(state.field(notePreviewField).index).toBeDefined(); expect(state.field(notePreviewField).noteAware).toBe(true); check(state);
  state = state.update({ changes: { from: 5, insert: 'Z' }, selection: { anchor: 6 } }).state;
  expect(state.field(notePreviewField).mode).toBe('indexed'); expect(state.field(notePreviewField).noteAware).toBe(true); check(state);
  state = state.update({ changes: { from: 6, insert: '中' }, selection: { anchor: 7 } }).state;
  expect(state.field(notePreviewField).mode).toBe('indexed'); check(state);
  const reference = footnotes(state).references[0];
  state = state.update({ selection: { anchor: reference.from } }).state;
  expect(state.field(notePreviewField).mode).toBe('full'); check(state);
  const at = state.doc.toString().indexOf('[^a]:');
  state = state.update({ changes: { from: at + 2, to: at + 3, insert: 'b' } }).state;
  expect(state.field(notePreviewField).index).toBeUndefined(); check(state);
  state = state.update({ changes: { from: at + 2, to: at + 3, insert: 'a' } }).state;
  expect(state.field(notePreviewField).noteAware).toBe(true); check(state);
});

it('keeps selection projection out of the ordinary index at every note boundary and wide selection', () => {
  const original='\uFEFF# **Heading[^图]**\r\n\r\nParagraph **words[^a]** and *more[^图]*.\n\n[^图]: 日本語 **note**\r\n\r\n[^a]: Second note\r\n\r\nEnd words.\n';
  let state=setup(original);
  state=state.update({effects:StateEffect.appendConfig.of(EditorState.allowMultipleSelections.of(true))}).state;
  function compareOrdinary(){
    const plan=state.field(notePreviewField);
    expect(plan.noteAware).toBe(true);expect(plan.index).toBeDefined();
    const actual=plan.index!.decorations.iter(),expected=previewDecorations(state,
      collectPreview(state,syntaxTree(state)).filter(item=>item.kind!=='footnote'&&item.kind!=='footnote-definition')).iter();
    while(actual.value&&expected.value){expect([actual.from,actual.to]).toEqual([expected.from,expected.to]);expect(actual.value.eq(expected.value)).toBe(true);actual.next();expected.next()}
    expect(actual.value).toBeNull();expect(expected.value).toBeNull();check(state);
    expect(savedSource(state.field(sourceField))).toBe(original);expect(undoDepth(state)).toBe(0);
  }
  for(let at=0;at<=state.doc.length;at++){state=state.update({selection:{anchor:at}}).state;compareOrdinary()}
  for(const selection of [
    EditorSelection.range(state.doc.length,0),
    EditorSelection.create([EditorSelection.range(2,18),EditorSelection.range(33,60),EditorSelection.cursor(state.doc.length)]),
    EditorSelection.range(footnotes(state).definitions[0].from-1,footnotes(state).definitions[1].to+1),
  ]){state=state.update({selection}).state;compareOrdinary()}
  const at=state.doc.toString().indexOf('words')+2;
  state=state.update({selection:{anchor:at}}).state;compareOrdinary();
  state=state.update({changes:{from:at,insert:'中'},selection:{anchor:at+1}}).state;
  expect(state.field(notePreviewField).mode).toBe('indexed');check(state);
  // Indexed plans never retain old absolute items or selection groups.
  expect('ordinaryItems' in state.field(notePreviewField)).toBe(false);
  expect('ordinaryGroups' in state.field(notePreviewField)).toBe(false);
  state=state.update({selection:{anchor:state.doc.length-3}}).state;
  expect(state.field(notePreviewField).mode).toBe('full');expect(state.field(notePreviewField).noteAware).toBe(true);check(state);
  const endAt=state.selection.main.head;
  state=state.update({changes:{from:endAt,insert:'Z'},selection:{anchor:endAt+1}}).state;
  expect(state.field(notePreviewField).mode).toBe('indexed');check(state);
});

it('keeps adjacent plain paragraph text ordinary beside one trailing note definition', () => {
  const original='\uFEFFParagraph words[^a] and **strong**.\r\n\r\n# Heading\n\nPlain 日本語 words.\r\n[^a]: 日本語 **note**\r\n';
  for(const marker of ['Paragraph words','Plain 日本語 words']) {
    const record=fromSource(original),doc=normalize(record.raw),anchor=doc.indexOf(marker)+3;
    let state=setup(original,anchor);expect(state.field(notePreviewField).noteAware).toBe(true);check(state);
    const sources=[original];
    for(const insert of ['Z','中','𠀀','e\u0301']) {
      const at=state.selection.main.head;
      state=state.update({changes:{from:at,insert},selection:{anchor:at+insert.length},userEvent:'input.type'}).state;
      expect(state.field(notePreviewField).mode).toBe('indexed');check(state);sources.push(savedSource(state.field(sourceField)));
    }
    const target={get state(){return state},dispatch(transaction:Transaction){state=transaction.state}};
    for(let step=sources.length-2;step>=0;step--){expect(undo(target)).toBe(true);expect(savedSource(state.field(sourceField))).toBe(sources[step]);check(state)}
    for(let step=1;step<sources.length;step++){expect(redo(target)).toBe(true);expect(savedSource(state.field(sourceField))).toBe(sources[step]);check(state)}
  }
  const state=setup(original),definition=footnotes(state).definitions[0];
  for(const changes of [
    {from:definition.from-1,insert:'Z'}, {from:definition.from-1,to:definition.from},
    {from:definition.from,insert:'Z'}, {from:definition.from+7,insert:'中'},
    {from:normalize(fromSource(original).raw).indexOf('Plain')+3,insert:'$x$'},
  ]) {const next=state.update({changes,selection:{anchor:changes.from}}).state;expect(next.field(notePreviewField).mode).toBe('full');check(next)}
});

it('rejects marked prefixes, multiple adjacent definitions, and a definition crossing the paragraph end', () => {
  for(const tail of [
    'Plain **strong** words.\n[^a]: Note', 'Plain [link](/x).\n[^a]: Note',
    'Plain $x$.\n[^a]: Note', 'Plain words[^a].\n[^a]: Note',
    'Plain words.\n[^a]: Note\n[^b]: Second',
    'Plain words.\n[^a]: Note\n\n    continuation',
  ]) {
    const state=setup('Paragraph words[^a].\n\n'+tail);
    expect(state.field(notePreviewField).index).toBeUndefined();check(state);
    const next=state.update({changes:{from:3,insert:'Z'},selection:{anchor:4}}).state;
    expect(next.field(notePreviewField).mode).toBe('full');check(next);
  }
});
