// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo } from '@codemirror/commands';
import { indentList, listTab } from '../../src/web/list-indent';
import { fromSource, normalize, sourceExtensions } from '../../src/web/source';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });
function editor(doc: string, anchor: number, head = anchor) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(doc);
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: normalize(record.raw), selection: { anchor, head },
    extensions: [history(), sourceExtensions(record), markdown({ base: markdownLanguage })] }) });
  return view;
}
const text = () => view!.state.doc.toString();

it('nests an item under the previous item, keeps the caret in place, and undoes in one step', () => {
  const v = editor('- a\n- b', 7);
  expect(indentList(v, 1)).toBe(true);
  expect(text()).toBe('- a\n  - b');
  expect(v.state.selection.main.head).toBe(9);
  indentList(v, -1);
  expect(text()).toBe('- a\n- b');
  indentList(v, 1); undo(v);
  expect(text()).toBe('- a\n- b');
});

it('nests different list types and uses the parent marker width', () => {
  const v = editor('1. one\n- bullet', 15);
  indentList(v, 1);
  expect(text()).toBe('1. one\n   - bullet');
  const w = editor('- one\n- [ ] task\n1. num', 14);
  indentList(w, 1);
  expect(text()).toBe('- one\n  - [ ] task\n1. num');
  const x = editor('- a\n- b', 7);
  indentList(x, 1);
  const y = editor('- a\n  - b\n  - c', 15);
  y.dispatch({ selection: { anchor: 13 } });
  expect(indentList(y, 1)).toBe(true);
  expect(text()).toBe('- a\n  - b\n    - c');
});

it('moves nested lines with their item and ignores the first item', () => {
  const v = editor('- a\n- b\n  - c\n- d', 6);
  indentList(v, 1);
  expect(text()).toBe('- a\n  - b\n    - c\n- d');
  const first = editor('- a\n- b', 2);
  expect(indentList(first, 1)).toBe(true);
  expect(text()).toBe('- a\n- b');
});

it('renumbers ordered lists at both levels', () => {
  const v = editor('1. a\n2. b\n3. c', 7);
  indentList(v, 1);
  expect(text()).toBe('1. a\n   1. b\n2. c');
  indentList(v, -1);
  expect(text()).toBe('1. a\n2. b\n3. c');
});

it('moves every selected item and refuses text, code, and blank lines', () => {
  const v = editor('- a\n- b\n- c', 4, 11);
  indentList(v, 1);
  expect(text()).toBe('- a\n  - b\n  - c');
  expect(indentList(editor('plain text', 3), 1)).toBe(false);
  expect(indentList(editor('```\n- a\n```', 6), 1)).toBe(false);
  expect(indentList(editor('', 0), 1)).toBe(false);
});

it('outdents to the parent level and never below zero', () => {
  const v = editor('- a\n  - b\n    - c', 17);
  indentList(v, -1);
  expect(text()).toBe('- a\n  - b\n  - c');
  expect(indentList(editor('- a', 2), -1)).toBe(true);
  expect(text()).toBe('- a');
});

it('keeps Tab and Shift-Tab in the editor on lines without a list marker', () => {
  expect(listTab(editor('plain text', 3), 1)).toBe(true);
  expect(text()).toBe('plain text');
  expect(listTab(editor('plain text', 3), -1)).toBe(true);
  expect(text()).toBe('plain text');
  expect(listTab(editor('```\ncode\n```', 5), -1)).toBe(true);
  expect(listTab(editor('', 0), -1)).toBe(true);
  expect(listTab(editor('- a\n- b', 7), 1)).toBe(true);
  expect(text()).toBe('- a\n  - b');
});

it('unindents lines without a list marker with Shift-Tab', () => {
  const v = editor('    text', 6);
  listTab(v, -1);
  expect(text()).toBe('text'); expect(v.state.selection.main.head).toBe(2);
  listTab(editor('  two', 4), -1); expect(text()).toBe('two');
  listTab(editor('      six', 8), -1); expect(text()).toBe('  six');
  listTab(editor('\ttab', 3), -1); expect(text()).toBe('tab');
  listTab(editor('```\n    code\n```', 10), -1); expect(text()).toBe('```\ncode\n```');
  const many = editor('  a\n    b\nc', 0, 11);
  listTab(many, -1); expect(text()).toBe('a\nb\nc');
  undo(many); expect(text()).toBe('  a\n    b\nc');
});
