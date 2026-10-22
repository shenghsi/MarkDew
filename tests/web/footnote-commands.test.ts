// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { insertFootnote, goToFootnote } from '../../src/web/footnote-commands';
import { footnoteField, footnotes } from '../../src/web/footnotes';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tableCellEffect, tableCellField } from '../../src/web/table';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(source: string, at = 0, to = at) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), lock = new Compartment();
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: normalize(record.raw),
    selection: { anchor: at, head: to }, extensions: [sourceExtensions(record), documentLanguage(),
      history(), footnoteField, tableCellField, EditorState.allowMultipleSelections.of(true), lock.of([])] }) });
  return { editor: view, lock, source: () => savedSource(view!.state.field(sourceField)) };
}
it('inserts a reference and definition in one exact-source history edit and selects note text', () => {
  const original = '\uFEFF图😀 text\r\n\rTail\nEnd', { editor, source } = create(original, 0, 3);
  expect(insertFootnote(editor)).toBeNull();
  expect(source()).toBe('\uFEFF图😀[^note-1] text\r\n\rTail\nEnd\r\n\r\n[^note-1]: Note text\r\n');
  expect(editor.state.sliceDoc(editor.state.selection.main.from, editor.state.selection.main.to)).toBe('Note text');
  expect(undoDepth(editor.state)).toBe(1); undo(editor); expect(source()).toBe(original);
  redo(editor); expect(source()).toContain('[^note-1]: Note text');
});
it('inserts at empty document and EOF and retains all existing trailing newlines', () => {
  for (const original of ['', 'Text', 'Text\n', 'Text\n\n']) {
    const { editor, source } = create(original, original.length);
    expect(insertFootnote(editor)).toBeNull(); expect(source()).toBe(original + '[^note-1]\n\n[^note-1]: Note text\n');
    undo(editor); expect(source()).toBe(original);
  }
  for (const ending of ['\n', '\n\n', '\n\n\n']) {
    const { editor, source } = create('Text' + ending, 2);
    expect(insertFootnote(editor)).toBeNull(); expect(source()).toBe('Te[^note-1]xt' + (ending === '\n' ? '\n\n' : ending) + '[^note-1]: Note text\n');
  }
});
it('reserves missing references and case-insensitive definitions instead of changing their meaning', () => {
  const original = 'Text missing[^note-1]\n\n[^NOTE-2]: Existing\n\nEnd', { editor, source } = create(original, 2);
  expect(insertFootnote(editor)).toBeNull(); expect(source()).toContain('Te[^note-3]xt');
  expect(footnotes(editor.state).references.map(note => note.label)).toEqual(['note-3']); undo(editor); expect(source()).toBe(original);
});
it('navigates to the accepted definition and first reference without source or history changes', () => {
  const original = 'B[^n] again[^N]\n\n[^n]: Note\n\n[^N]: Duplicate\n\nEnd';
  const { editor, source } = create(original, 11), model = footnotes(editor.state);
  expect(goToFootnote(editor)).toBeNull(); expect(editor.state.selection.main.head).toBe(model.definitions[0].from);
  expect(goToFootnote(editor)).toBeNull(); expect(editor.state.selection.main.head).toBe(model.references[0].from);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  editor.dispatch({ selection: { anchor: original.length } }); expect(goToFootnote(editor)).toContain('Select');
});
it('rejects unsupported parser contexts and unclosed final blocks without changing source or history', () => {
  for (const [original, at] of [['`code`', 3], ['$x$', 2], ['\\', 1], ['[text](url)', 3],
    ['---\na: b\n---\n\nBody', 7], ['---\nBody', 7], ['Text\n\n```\ncode', 2],
    ['Text[^n]\n\n[^n]: Note\n\nEnd', 15]] as const) {
    const { editor, source } = create(original, at);
    expect(insertFootnote(editor)).not.toBeNull(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  }
  const { editor, source } = create('one\ntwo', 1, 5); expect(insertFootnote(editor)).toContain('one text line'); expect(source()).toBe('one\ntwo');
});
it('defers both commands during composition cell edits read-only state and multiple selections', () => {
  const original = 'Text[^n]\n\n[^n]: Note\n\nEnd', { editor, lock, source } = create(original, 6);
  const check = () => { expect(insertFootnote(editor)).not.toBeNull(); expect(goToFootnote(editor)).not.toBeNull(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0); };
  Object.defineProperty(editor, 'compositionStarted', { value: true, configurable: true }); check();
  Object.defineProperty(editor, 'compositionStarted', { value: false, configurable: true });
  editor.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) }); check();
  editor.dispatch({ effects: lock.reconfigure([]), selection: EditorSelection.create([EditorSelection.cursor(1), EditorSelection.cursor(6)]) }); check();
  editor.dispatch({ selection: { anchor: 6 }, effects: tableCellEffect.of({ from: 0, to: 8, cellFrom: 1, cellTo: 2, row: 0, column: 0 }) }); check();
});
