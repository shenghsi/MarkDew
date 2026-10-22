// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { ensureSyntaxTree } from '@codemirror/language';
import { textDirection } from '../../src/web/text-direction';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { tableEditor, tableHistoryCommand } from '../../src/web/table';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { printView } from '../../src/web/print-view';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });
function setup(original: string) {
  const record = fromSource(original), mode = new Compartment();
  let state = EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length }, extensions: [
    textDirection, documentLanguage(), sourceExtensions(record), history(), EditorView.lineWrapping, mode.of(livePreview)] });
  ensureSyntaxTree(state, state.doc.length, 1000); state = state.update({}).state;
  view = new EditorView({ state, parent: document.body });
  return { editor: view, mode, source: () => savedSource(view!.state.field(sourceField)) };
}
it('adds automatic direction to visible lines without changing source, selection or history across mode and state changes', () => {
  const original = '\uFEFFمرحبا English 123\r\n\r\nשלום 45 text\r\n\r\nEnglish العربية 67\r\n\r\n... 123\n';
  const { editor, mode, source } = setup(original), selection = editor.state.selection;
  expect(editor.state.facet(EditorView.perLineTextDirection)).toBe(true);
  const lines = () => Array.from(editor.contentDOM.querySelectorAll('.cm-line'));
  expect(lines().length).toBeGreaterThan(4); expect(lines().every(line => line.getAttribute('dir') === 'auto')).toBe(true);
  expect(source()).toBe(original); expect(editor.state.selection).toBe(selection); expect(undoDepth(editor.state)).toBe(0);
  editor.dispatch({ effects: mode.reconfigure([]) });
  expect(lines().every(line => line.getAttribute('dir') === 'auto')).toBe(true); expect(source()).toBe(original);
  editor.dispatch({ changes: { from: 0, insert: 'English ' } }); expect(source()).toBe('\uFEFFEnglish ' + original.slice(1));
  undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe('\uFEFFEnglish ' + original.slice(1));
  const replacement = EditorState.create({ doc: 'שלום\nEnglish\n', extensions: [textDirection] }); editor.setState(replacement);
  expect(lines().every(line => line.getAttribute('dir') === 'auto')).toBe(true);
});
it('keeps table order and restores cell source and direction through outer history', async () => {
  const original = '\uFEFF| العربية | English |\r\n|---|---|\r\n| שלום 123 | text العربية |\r\n\r\nEnd';
  const { editor, source } = setup(original), element = document.querySelector<HTMLElement>('.preview-table')!;
  const table = tableEditor(element)!;
  expect(Array.from(element.querySelectorAll('th,td')).map(cell => cell.getAttribute('dir'))).toEqual(['auto','auto','auto','auto']);
  expect(Array.from(element.querySelectorAll('th')).map(cell => cell.textContent)).toEqual(['العربية','English']);
  table.begin(1, 0); expect(table.child!.state.facet(EditorView.perLineTextDirection)).toBe(true);
  expect(table.child!.contentDOM.querySelector('.cm-line')!.getAttribute('dir')).toBe('auto');
  table.child!.dispatch({ changes: { from: table.child!.state.doc.length, insert: ' 😀' } });
  const edited = source(); expect(edited).toContain('שלום 123 😀'); expect(undoDepth(editor.state)).toBe(1);
  tableHistoryCommand(editor, undo); expect(source()).toBe(original);
  tableHistoryCommand(editor, redo); expect(source()).toBe(edited);
  await vi.waitFor(() => expect(document.querySelector('.editing-cell .cm-line')?.getAttribute('dir')).toBe('auto'));
});
it('prints generated text with automatic direction and keeps authored HTML direction', async () => {
  const original = '\uFEFF# שלום\r\n\r\nمرحبا **English** 123\r\n\r\n| العربية | English |\r\n|---|---|\r\n| שלום | text |\r\n\r\n<div dir="ltr"><p>שלום explicit</p></div>\r\n';
  const { editor, source } = setup(original), state = editor.state;
  const printed = printView({ state, id: 1, path: '', title: 'Bidi' });
  try {
    expect(await printed.ready).toEqual([]);
    expect(printed.element.querySelector('h1')!.getAttribute('dir')).toBe('auto');
    expect(printed.element.querySelector('p')!.getAttribute('dir')).toBe('auto');
    expect(Array.from(printed.element.querySelectorAll('th,td')).every(cell => cell.getAttribute('dir') === 'auto')).toBe(true);
    expect(printed.element.querySelector('[dir="ltr"]')!.textContent).toContain('שלום explicit');
    expect(source()).toBe(original); expect(editor.state).toBe(state); expect(undoDepth(state)).toBe(0);
  } finally { printed.dispose(); }
});
