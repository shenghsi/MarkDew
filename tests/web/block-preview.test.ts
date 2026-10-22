// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorSelection, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';

let view: EditorView;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(source: string) {
  const record = fromSource(source), display = new Compartment();
  let state = EditorState.create({ doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length }, extensions: [sourceExtensions(record), history(),
      EditorState.allowMultipleSelections.of(true), markdown({ base: markdownLanguage }), display.of(livePreview)] });
  // These DOM checks require all markers, independent of the initial parse budget.
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  view = new EditorView({ state, parent: document.body });
  return display;
}
const source = () => savedSource(view.state.field(sourceField));
const markers = () => Array.from(document.querySelectorAll<HTMLButtonElement>('.md-list-marker'));
const tasks = () => Array.from(document.querySelectorAll<HTMLInputElement>('.md-task-toggle'));
it('renders parser markers without renumbering or changing exact nested source', () => {
  const original = '\uFEFF- 日本語\r\n\t- nested\r\n\r\n3) third\r4. fourth\n\n- \n\nEnd';
  const display = create(original);
  expect(markers().map(node => node.textContent)).toEqual(['•', '•', '3)', '4.', '•']);
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
  markers()[2].click(); expect(view.state.selection.main.head).toBe(view.state.doc.toString().indexOf('3)'));
  expect(markers().map(node => node.textContent)).not.toContain('3)');
  expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ effects: display.reconfigure([]) }); expect(markers()).toHaveLength(0); expect(source()).toBe(original);
});
it('reveals all selected list owners, including continuation lines', () => {
  create('- first\n  continuation\n\n- second\n  continuation\n\nEnd');
  const doc = view.state.doc.toString();
  view.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(doc.indexOf('continuation')),
    EditorSelection.cursor(doc.lastIndexOf('continuation'))]) });
  expect(markers()).toHaveLength(0); expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ selection: { anchor: doc.length } }); expect(markers()).toHaveLength(2);
});
it('toggles tasks with one source patch and exact Undo/Redo across modes', () => {
  const original = '\uFEFF- [ ] 日本語 😀\r\n- [x] done\r- [X] upper\n\nEnd';
  const display = create(original);
  expect(tasks().map(node => node.checked)).toEqual([false, true, true]);
  expect(tasks()[0].getAttribute('aria-label')).toBe('Toggle task: 日本語 😀');
  expect(markers()).toHaveLength(0);
  tasks()[0].click(); expect(source()).toBe(original.replace('[ ]', '[x]')); expect(undoDepth(view.state)).toBe(1);
  view.dispatch({ effects: display.reconfigure([]) });
  expect(undo(view)).toBe(true); expect(source()).toBe(original);
  expect(redo(view)).toBe(true); expect(source()).toBe(original.replace('[ ]', '[x]'));
  view.dispatch({ effects: display.reconfigure(livePreview) });
  tasks()[2].click(); expect(source()).toBe(original.replace('[ ]', '[x]').replace('[X]', '[ ]'));
  undo(view); expect(source()).toBe(original.replace('[ ]', '[x]'));
  undo(view); expect(source()).toBe(original);
});
it('blocks marker commands during composition, read-only state, and after removal', () => {
  const original = '- [ ] task\n- plain\n\nEnd'; create(original);
  const old = tasks()[0];
  Object.defineProperty(view, 'compositionStarted', { configurable: true, value: true });
  old.click(); expect(source()).toBe(original); expect(old.checked).toBe(false);
  markers()[0].click(); expect(view.state.selection.main.head).toBe(view.state.doc.length);
  Object.defineProperty(view, 'compositionStarted', { configurable: true, value: false });
  const lock = new Compartment(); view.dispatch({ effects: StateEffect.appendConfig.of(lock.of(EditorState.readOnly.of(true))) });
  tasks()[0].click(); expect(source()).toBe(original);
  view.dispatch({ effects: lock.reconfigure([]) });
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'short' } });
  old.click(); expect(source()).toBe('short'); expect(undoDepth(view.state)).toBe(1);
});
it('keeps nested quote styling on one line and leaves code marks intact', () => {
  const original = '> outer\n> > nested\n> > continuation\n>\n> ```md\n> - [ ] literal\n> ```\n\nEnd'; create(original);
  expect(document.querySelectorAll('.md-quote')).toHaveLength(7);
  const nested = Array.from(document.querySelectorAll<HTMLElement>('.md-quote')).filter(node => node.style.getPropertyValue('--quote-depth') === '2');
  expect(nested).toHaveLength(2); expect(tasks()).toHaveLength(0); expect(markers()).toHaveLength(0);
  expect(document.body.textContent).toContain('- [ ] literal');
  const position = view.state.doc.toString().indexOf('nested');
  view.dispatch({ selection: { anchor: position } });
  expect(Array.from(document.querySelectorAll('.cm-line')).find(line => line.textContent?.includes('nested'))!.textContent).toContain('> > nested');
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
});
it('keeps task source editable inside nested quotes and skips table and HTML ranges', () => {
  const original = '> - [ ] quoted\n\n| A |\n| --- |\n| - [ ] cell |\n\n<div>\n- [ ] HTML\n</div>\n\nEnd'; create(original);
  expect(tasks()).toHaveLength(1); tasks()[0].click();
  expect(source()).toBe(original.replace('[ ] quoted', '[x] quoted'));
  undo(view); expect(source()).toBe(original);
});
it('defers a task toggle during table-cell composition', () => {
  const original = '- [ ] task\n\n| A |\n| --- |\n| value |\n\nEnd'; create(original);
  const table = tableEditor(document.querySelector('.preview-table')!)!;
  table.begin(1, 0); const child = table.child!;
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  tasks()[0].click(); expect(source()).toBe(original); expect(table.child).toBe(child);
  expect(tasks()[0].checked).toBe(false); expect(undoDepth(view.state)).toBe(0);
});
it('refreshes the task label after an edit outside the active task', () => {
  create('- [ ] old label\n\nEnd');
  const from = view.state.doc.toString().indexOf('old label');
  view.dispatch({ changes: { from, to: from + 9, insert: 'new label' } });
  expect(tasks()[0].getAttribute('aria-label')).toBe('Toggle task: new label');
  undo(view); expect(tasks()[0].getAttribute('aria-label')).toBe('Toggle task: old label');
});
