// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { DecorationSet } from '@codemirror/view';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, livePreview, previewDecorations, previewField, previewItems } from '../../src/web/preview';
import { tableCellEffect } from '../../src/web/table';
import { imagePath, setImagePath } from '../../src/web/images';
import { fromSource, sourceExtensions, savedSource, sourceField } from '../../src/web/source';

function create(source: string) {
  let state = EditorState.create({ doc: source, selection: { anchor: source.length }, extensions: [
    sourceExtensions(fromSource(source)), documentLanguage(), livePreview, imagePath,
    EditorState.allowMultipleSelections.of(true)
  ] });
  expect(ensureSyntaxTree(state, source.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  return state;
}
function compare(actual: DecorationSet, expected: DecorationSet) {
  const left = actual.iter(), right = expected.iter();
  while (left.value && right.value) {
    expect([left.from, left.to]).toEqual([right.from, right.to]);
    expect(left.value.eq(right.value)).toBe(true);
    left.next(); right.next();
  }
  expect(left.value).toBeNull(); expect(right.value).toBeNull();
}
function check(state: EditorState) {
  const plan = state.field(previewField);
  compare(plan.decorations, previewDecorations(state, collectPreview(state, syntaxTree(state), plan.imageVersion)));
}

it('matches the full rebuild at every caret boundary, with overlapping math, containers, notes, images and metadata', () => {
  const source = '---\ntitle: Sample\n---\n\n# Heading **bold**\n\n' +
    'Text **strong $x_1$**, *emphasis*, ~~strike~~ and [link](https://example.com).\n\n' +
    '> Quote **bold**\n>\n> > Nested $y$\n> > - [ ] Task\n> >   continuation\n\n' +
    '1. First\n   - Child\n     continuation\n2. Second\n\n' +
    '| A | B |\n| - | - |\n| **x** | $y$ |\n\n' +
    '```math\n\\frac{a}{b}\n```\n\n```js\nconst x = 1;\n```\n\n' +
    '<div>HTML</div>\n\n![image][asset] and note[^n].\n\n' +
    '[asset]: https://example.com/image.png\n\n[^n]: **Note** $z$\n\nEnd\n\n\n# 😀中文𠀀e\u0301\n\n> אבג العربية\n\n';
  let state = create(source);
  for (let position = 0; position <= source.length; position++) {
    state = state.update({ selection: { anchor: position } }).state; check(state);
  }
  for (let position = source.length; position >= 0; position -= 7) {
    const other = (position + 29) % (source.length + 1);
    state = state.update({ selection: EditorSelection.create([
      EditorSelection.range(position, Math.max(0, position - 6)), EditorSelection.cursor(other)
    ]) }).state;
    check(state);
  }
  state = state.update({ selection: { anchor: source.length, head: 0 } }).state; check(state);
  state = state.update({ selection: { anchor: source.length } }).state; check(state);
  expect(savedSource(state.field(sourceField))).toBe(source);
});

it('keeps unrelated decoration objects and rebuilds after source, image context and active-cell changes', () => {
  let state = create('**first**\n\n**second**\n\n| A | B |\n| - | - |\n| x | y |\n\nEnd');
  const original = state.field(previewField).decorations.iter().value;
  state = state.update({ selection: { anchor: 15 } }).state;
  expect(state.field(previewField).decorations.iter().value).toBe(original);
  check(state);
  state = state.update({ changes: { from: 2, insert: '😀' }, selection: { anchor: 3 } }).state; check(state);
  state = state.update({ selection: { anchor: state.doc.length } }).state; check(state);
  state = state.update({ effects: setImagePath.of('/tmp/note.md') }).state; check(state);
  const table = previewItems(state).find(item => item.kind === 'table')!;
  state = state.update({ selection: { anchor: table.from }, effects: tableCellEffect.of({
    from: table.from, to: table.to, row: 0, column: 0, cellFrom: table.from + 2, cellTo: table.from + 3
  }) }).state; check(state);
  state = state.update({ selection: { anchor: table.to } }).state; check(state);
  state = state.update({ effects: tableCellEffect.of(null) }).state; check(state);
});
