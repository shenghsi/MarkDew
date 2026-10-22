// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { markdownReturn } from '../../src/web/commands';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
let view: EditorView;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(original: string, position = normalize(fromSource(original).raw).length, to = position, readOnly = false) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(original);
  view = new EditorView({ state: EditorState.create({ doc: normalize(record.raw), selection: { anchor: position, head: to },
    extensions: [history(), sourceExtensions(record), markdown({ base: markdownLanguage }), EditorState.readOnly.of(readOnly), EditorState.allowMultipleSelections.of(true)] }), parent: document.body });
}
const source = () => savedSource(view.state.field(sourceField));
for (const [original, expected] of [
  ['- parent\n  - child', '- parent\n  - child\n  - '],
  ['> quote', '> quote\n> '],
  ['> > deep', '> > deep\n> > '],
  ['> - [X] done', '> - [X] done\n> - [ ] '],
  ['- parent\n  1. child', '- parent\n  1. child\n  2. '],
  ['- parent\n  - ', '- parent\n- '],
  ['> - ', '> '],
  ['- first\n  continued', '- first\n  continued\n  '],
  ['    - code', '    - code\n'],
  ['```md\n- code', '```md\n- code\n'],
  ['```\n- item', '```\n- item\n'],
  ['```a`b\n- item', '```a`b\n- item\n- '],
  ['~~~\n1. item\n~~~\n- [x] done', '~~~\n1. item\n~~~\n- [x] done\n- [ ] '],
  ['\uFEFFhead\r\n> 日本語😀\rTail\nEnd', '\uFEFFhead\r\n> 日本語😀\r\n> \rTail\nEnd'],
]) it(`continues or exits ${JSON.stringify(original)} with exact history`, () => {
  const position = original.includes('Tail') ? normalize(fromSource(original).raw).indexOf('\nTail') : undefined;
  create(original, position); expect(markdownReturn(view)).toBe(true); expect(source()).toBe(expected);
  expect(undoDepth(view.state)).toBe(1); undo(view); expect(source()).toBe(original);
  redo(view); expect(source()).toBe(expected);
});
it('splits a nested item and replaces a selection without continuing marks', () => {
  create('> - first second', 9); markdownReturn(view); expect(source()).toBe('> - first\n> -  second');
  create('> - first', 4, 9); markdownReturn(view); expect(source()).toBe('> - \n');
});
it('rejects Return during composition and read-only state without history', () => {
  create('> text', undefined, undefined, true); expect(markdownReturn(view)).toBe(false); expect(source()).toBe('> text'); expect(undoDepth(view.state)).toBe(0);
  create('> text'); view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(markdownReturn(view)).toBe(false); expect(source()).toBe('> text'); expect(undoDepth(view.state)).toBe(0);
});
it('renumbers ordered siblings in one edit and retains exact source endings and selection', () => {
  const original = '\uFEFFhead\r\n> 1. first\r> 2. second\n> 3. third';
  create(original, normalize(fromSource(original).raw).indexOf('\n> 2.'));
  markdownReturn(view);
  const expected = '\uFEFFhead\r\n> 1. first\r\n> 2. \r> 3. second\n> 4. third';
  expect(source()).toBe(expected);
  expect(view.state.selection.main.head).toBe(normalize(fromSource(expected).raw).indexOf('\n> 3.'));
  expect(undoDepth(view.state)).toBe(1); undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(expected);
});
it('keeps the flat-list ending rule and Unicode cursor positions', () => {
  create('head\r\n- first\rTail\nEnd', 'head\n- first'.length); markdownReturn(view);
  expect(source()).toBe('head\r\n- first\r- \rTail\nEnd');
  create('😀abc', 3); markdownReturn(view); expect(source()).toBe('😀a\nbc');
  create('> text'); view.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(6)]) });
  expect(markdownReturn(view)).toBe(false); expect(source()).toBe('> text'); expect(undoDepth(view.state)).toBe(0);
});
it('maps flat-list patches across emoji bare CR EOF and selected mixed endings', () => {
  for (const [original, from, to, expected, caret] of [
    ['\uFEFF😀\r- item', 9, 9, '\uFEFF😀\r- item\r- ', 12],
    ['\uFEFF😀\r\n- item\rTail', 9, 9, '\uFEFF😀\r\n- item\r- \rTail', 12],
    ['\uFEFF😀a\r\nb\rc\nEnd', 3, 7, '\uFEFF😀a\r\n\nEnd', 4],
  ] as const) {
    create(original, from, to); const selection = view.state.selection;
    markdownReturn(view); expect(source()).toBe(expected); expect(view.state.selection.main.head).toBe(caret);
    undo(view); expect(source()).toBe(original); expect(view.state.selection.eq(selection)).toBe(true);
    redo(view); expect(source()).toBe(expected); expect(view.state.selection.main.head).toBe(caret);
  }
});
