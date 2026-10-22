// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { history, undo, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes, freshFootnotes } from '../../src/web/footnotes';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

function create(doc: string) {
  let state = EditorState.create({ doc, extensions: [documentLanguage(), footnoteField] });
  ensureSyntaxTree(state, doc.length, 10000);
  return state.update({}).state;
}
function check(state: EditorState) { expect(footnotes(state)).toEqual(freshFootnotes(state)); }
const tail = '\n\nReference[^n].\n\n[^n]: Note **text** $x$\n\n[^n]: Duplicate';

it('requires published CodeText coverage and retains earlier definition AST on mapped edits', () => {
  const source = '[^n]: Note **text** $x$\n\n```unknown\nAlphaWords\n```\n\nReference[^n].';
  const from = source.indexOf('AlphaWords') + 3;
  const uncovered = EditorState.create({ doc: source, extensions: [footnoteField] });
  const fallback = uncovered.update({ changes: { from, to: from + 1, insert: 'Z' } }).state;
  check(fallback); expect(footnotes(fallback)).not.toBe(footnotes(uncovered));
  const initial = create(source), node = footnotes(initial).definitions[0].node;
  const mapped = initial.update({ changes: { from, insert: '中文' } }).state;
  check(mapped); expect(footnotes(mapped).definitions[0].node).toBe(node);
});

it('maps code word edits outside definitions with exact fresh models', () => {
  for (const block of ['```unknown\nAlphaWords\n```', '    AlphaWords',
    '> ```unknown\n> AlphaWords\n> ```', '- item\n\n  ```unknown\n  AlphaWords\n  ```',
    '>     AlphaWords', '- item\n\n      AlphaWords']) {
    for (const metadata of ['', '---\na: b\n---\n\n']) {
      const source = metadata + block + tail, initial = create(source), from = source.indexOf('AlphaWords') + 3;
      const equal = initial.update({ changes: { from, to: from + 1, insert: 'Z' } }).state;
      check(equal); expect(footnotes(equal)).toBe(footnotes(initial));
      let state = initial;
      for (const insert of ['中文', '𠀀', 'e\u0301', '', 'QQQ']) {
        state = state.update({ changes: { from, to: from + 1, insert } }).state;
        check(state);
      }
    }
  }
});

it('uses fresh parsing for code delimiters, prefixes, definitions and inline code', () => {
  for (const body of ['```unknown\nAlphaWords\n```', '    AlphaWords',
    '> ```unknown\n> AlphaWords\n> ```', '- item\n\n  ```unknown\n  AlphaWords\n  ```',
    '[^n]: Note\n\n    ```unknown\n    AlphaWords\n    ```',
    '[`AlphaWords`][ref]\n\n[ref]: https://example.com']) {
    const initial = create(body + tail);
    for (let from = 0; from <= body.length; from++) for (const insert of ['Z', '', ' ', '`', '\n', '[^n]', '𠀀']) {
      check(initial.update({ changes: { from, to: Math.min(body.length, from + 1), insert } }).state);
    }
    if (body.startsWith('[^n]') || body.startsWith('[`')) {
      const from = body.indexOf('AlphaWords') + 3;
      const changed = initial.update({ changes: { from, to: from + 1, insert: 'Z' } }).state;
      expect(footnotes(changed)).not.toBe(footnotes(initial));
    }
  }
}, 20000);

it('checks all changes and complete Unicode neighbors', () => {
  const source = '```unknown\nA𠀀abc𠀁Z and BetaWords\n```' + tail, initial = create(source);
  const from = source.indexOf('abc'), second = source.indexOf('BetaWords') + 3;
  const accepted = initial.update({ changes: [{ from, to: from + 3, insert: '中文' }, { from: second, insert: 'Q' }] }).state;
  check(accepted);
  for (const extra of [{ from: from - 1, insert: 'Z' }, { from: second, insert: '\n' },
    { from: 1, to: 2, insert: 'Z' }, { from: from + 3, to: from + 4, insert: 'Z' }]) {
    const edits = [{ from: from + 1, to: from + 2, insert: 'Z' }, extra].sort((a, b) => a.from - b.from);
    const changed = initial.update({ changes: edits }).state;
    check(changed); expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
});

it('retains exact source record and Undo/Redo for code content', () => {
  const original = '\uFEFF```unknown\r\nAlphaWords\n```\r\n\r\nReference[^n].\r[^n]: Note', record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [documentLanguage(), footnoteField, history(), sourceExtensions(record)] });
  ensureSyntaxTree(state, state.doc.length, 10000); state = state.update({}).state;
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  const from = state.doc.toString().indexOf('AlphaWords') + 3;
  for (const insert of ['中文', '𠀀', '', 'Z']) {
    state = state.update({ changes: { from, to: from + 1, insert }, userEvent: 'input.paste' }).state;
    check(state); expect(savedSource(state.field(sourceField))).toBe(original.replace('AlphaWords', 'Alp' + insert + 'aWords'));
    expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
    expect(redo(target)).toBe(true); check(state);
    expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
  }
});
