// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { Tree } from '@lezer/common';
import { documentLanguage } from '../../src/web/document-language';
import { collectCachedPreview, collectPreview, livePreview, previewDecorations, previewField, previewItems } from '../../src/web/preview';
import { imagePath, setImagePath } from '../../src/web/images';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

function create(source: string) {
  const record = fromSource(source);
  return EditorState.create({ doc: normalize(record.raw), extensions: [
    sourceExtensions(record), documentLanguage(), livePreview, imagePath
  ] });
}
function check(state: EditorState) {
  const tree = syntaxTree(state), version = state.field(previewField).imageVersion;
  const actual = collectCachedPreview(state, tree, version), expected = collectPreview(state, tree, version);
  // Quote-line items are appended once per block in the cache and once per
  // document in the full walk. Compare complete data independent of that order.
  const canonical = (items: typeof actual) => items.map(item => JSON.stringify(item)).sort();
  expect(canonical(actual)).toEqual(canonical(expected));
  expect(canonical(previewItems(state))).toEqual(canonical(expected));
  const left = state.field(previewField).decorations.iter(), right = previewDecorations(state, expected).iter();
  while (left.value && right.value) {
    expect([left.from, left.to]).toEqual([right.from, right.to]);
    expect(left.value.eq(right.value)).toBe(true); left.next(); right.next();
  }
  expect(left.value).toBeNull(); expect(right.value).toBeNull();
}
function settle(state: EditorState) {
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state; check(state); return state;
}

it('matches full analysis through shifts, structural edits, note renumbering and image-definition changes', () => {
  const source = '\uFEFF---\r\ntitle: A\r\n---\r\n\r\n' +
    '# Heading\n\n**Strong** $x$ and `code`.\n\n' +
    '> Quote\n> > Nested\n> > - [ ] Task\n> >   continuation\n\n' +
    '- Parent\n  - Child\n    continuation\n\n' +
    '| A | B |\n| - | - |\n| x | y |\n\n' +
    '```math\n\\frac{x}{y}\n```\n\n<div>HTML</div>\n\n' +
    '![alt][asset] note[^a] note[^b].\n\n[asset]: https://example.com/a.png\n\n' +
    '[^a]: **First** $z$\n\n[^b]: Second\n\nEnd';
  let state = settle(create(source));
  const edit = (from: number, to: number, insert: string) => {
    state = state.update({ changes: { from, to, insert }, selection: { anchor: from + insert.length } }).state;
    check(state); state = settle(state);
    state = state.update({ selection: { anchor: state.doc.length } }).state; check(state);
  };
  edit(state.doc.toString().indexOf('# Heading'), state.doc.toString().indexOf('# Heading'), '😀中\n\n');
  let at = state.doc.toString().indexOf('a.png'); edit(at, at + 5, 'b.png');
  expect(previewItems(state).find(item => item.kind === 'image')!.image!.destination).toContain('b.png');
  at = state.doc.toString().indexOf('note[^a]'); edit(at, at + 'note[^a] note[^b]'.length, 'note[^b] note[^a]');
  at = state.doc.toString().indexOf('- Parent'); edit(at, at, '> ');
  at = state.doc.toString().indexOf('continuation'); edit(at, at + 'continuation'.length, 'continued **text**');
  at = state.doc.toString().indexOf('```math'); edit(at, at + 3, '');
  at = state.doc.toString().indexOf('title: A'); edit(at, at + 'title: A'.length, 'title: Changed');
  state = state.update({ effects: setImagePath.of('/tmp/changed.md') }).state; check(state);
  expect(savedSource(state.field(sourceField)).startsWith('\uFEFF---\r\n')).toBe(true);
});

it('matches full suppression when no preview replacement is active', () => {
  for (const source of ['', '# Heading\n\n**strong** *text* and `code`.',
    '> Quote\n> - [ ] Task\n\n1. Item\n2. Next',
    '$x$', '<b>HTML</b>', '```mermaid\ngraph TD; A-->B\n```']) {
    let state = settle(create(source));
    // Select all source to reveal any block widget, while retaining ordinary
    // marks, quote lines, and marker ranges for the independent comparison.
    state = state.update({ selection: { anchor: 0, head: state.doc.length } }).state;
    // Force full construction rather than the selection-only group route.
    state = state.update({ effects: setImagePath.of('/tmp/no-replacements.md') }).state;
    check(state);
    expect(previewItems(state).every(item => !item.kind ||
      (item.from <= state.selection.main.to && item.to >= state.selection.main.from))).toBe(true);
  }
});

it('checks the complete physical line outside a partial block before reuse', () => {
  const prefix = '- [ ] Task', tree = markdownLanguage.parser.parse(prefix);
  const first = EditorState.create({ doc: prefix + ' old tail' });
  const second = EditorState.create({ doc: prefix + ' new tail' });
  collectCachedPreview(first, tree);
  const actual = collectCachedPreview(second, tree);
  expect(actual).toEqual(collectPreview(second, tree));
  expect(actual.find(item => item.marker?.task)!.marker!.label).toBe('Task new tail');
  const block = markdownLanguage.parser.parse('**bold**').children[0];
  expect(block).toBeInstanceOf(Tree);
  const state = EditorState.create({ doc: '**bold**' });
  expect(collectCachedPreview(state, block as Tree)).toEqual(collectPreview(state, block as Tree));
});

it('matches full construction after edits move empty lines and Unicode line boundaries', () => {
  let state = settle(create('\n\n# 😀中文\n\n> **אבג**\n>\n> - [ ] العربية\n\n# End\n\n'));
  for (const change of [
    { from: 0, to: 1, insert: '' },
    { from: 0, insert: '\n# 𠀀\n\n' },
    { from: 3, to: 5, insert: 'e\u0301\n\n' },
  ]) {
    state = state.update({ changes: change }).state; check(state); state = settle(state);
    for (let position = 0; position <= state.doc.length; position++) {
      state = state.update({ selection: { anchor: position } }).state; check(state);
    }
  }
});

it('reuses decoration values only for unchanged items and display conditions', () => {
  let state = settle(create('# Heading\n\n**first** $x$\n\n- [ ] Task\n\nEnd'));
  state = state.update({ selection: { anchor: state.doc.length } }).state;
  const items = previewItems(state);
  const values = (cached: boolean) => {
    const result = [];
    for (const cursor = previewDecorations(state, items, cached).iter(); cursor.value; cursor.next()) result.push(cursor.value);
    return result;
  };
  const first = values(true), second = values(true), fresh = values(false);
  expect(second).toHaveLength(first.length);
  second.forEach((value, index) => {
    expect(value).toBe(first[index]);
    expect(value.eq(fresh[index])).toBe(true);
    expect(value).not.toBe(fresh[index]);
  });
  const at = state.doc.toString().indexOf('End');
  state = state.update({ changes: { from: at, to: at + 3, insert: 'Last' } }).state;
  state = settle(state); check(state);
});

it('handles balanced trees, partial parser completion, and long blocks beyond the envelope bound', () => {
  let state = create(('# Heading\n\nText **strong** and `code`.\n\n').repeat(300));
  check(state); state = settle(state);
  state = state.update({ changes: { from: 30, insert: '😀\n\n' } }).state; check(state); state = settle(state);
  const short = collectCachedPreview(state, syntaxTree(state));
  expect(collectCachedPreview(state, syntaxTree(state)).find(item => item.className === 'md-strong'))
    .toBe(short.find(item => item.className === 'md-strong'));
  let long = settle(create('Text **strong** ' + 'word '.repeat(15000) + '\n\nEnd'));
  const first = collectCachedPreview(long, syntaxTree(long));
  expect(collectCachedPreview(long, syntaxTree(long)).find(item => item.className === 'md-strong'))
    .not.toBe(first.find(item => item.className === 'md-strong'));
  long = long.update({ changes: { from: 20000, insert: '中' } }).state; check(long); settle(long);
});
