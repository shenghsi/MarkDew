// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { livePreview } from '../../src/web/preview';
import { tableComposing, tableEditor, escapeCellPipes, tableCellEffect, tableCellField, tableHistoryCommand } from '../../src/web/table';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tablePlan, TableCommand, findTable } from '../../src/web/table-commands';
import { syntaxTree } from '@codemirror/language';
import { collectPreview, previewDecorations, previewField } from '../../src/web/preview';

let outer: EditorView | undefined;
afterEach(() => { outer?.destroy(); outer = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); });
function setup(source: string) {
  const record = fromSource(source), display = new Compartment();
  outer = new EditorView({ parent: document.body, state: EditorState.create({
    doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), markdown({ base: markdownLanguage }), display.of(livePreview)],
  }) });
  const element = document.querySelector<HTMLElement>('.preview-table')!;
  return { editor: outer, display, element, table: tableEditor(element)!,
    source: () => savedSource(outer!.state.field(sourceField)) };
}
it('keeps cell focus and selection for empty history and rejects commands during composition', () => {
  const original = '\uFEFF| A | B |\r\n|---|---|\r| 中文 | 日本語 |\n\nEnd';
  const { editor, table, source } = setup(original);
  table.begin(1, 1); const child = table.child!;
  child.dispatch({ selection: { anchor: 3, head: 0 } }); child.focus();
  for (const command of [undo, redo]) {
    expect(tableHistoryCommand(editor, command)).toBe(true);
    expect(child.hasFocus).toBe(true);
    expect(child.state.selection.main.anchor).toBe(3);
    expect(child.state.selection.main.head).toBe(0);
    expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  }
  const command = vi.fn(() => true);
  for (const input of [child.contentDOM, editor.contentDOM]) {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    expect(tableHistoryCommand(editor, command)).toBe(true);
    expect(command).not.toHaveBeenCalled(); expect(child.hasFocus).toBe(true);
    expect(source()).toBe(original);
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  }
});
it('names single-line cell inputs and updates the name during keyboard navigation', () => {
  const original = '\uFEFF| A | B |\r\n|---|---|\r| 中文 | 日本語 |\n\nEnd';
  const { editor, table, source } = setup(original), depth = undoDepth(editor.state);
  table.begin(1, 0);
  expect(table.child!.contentDOM.getAttribute('aria-label')).toBe('Table cell, row 2, column 1');
  expect(table.child!.contentDOM.getAttribute('aria-multiline')).toBe('false');
  expect(table.child!.contentDOM.getAttribute('aria-description')).toContain('Escape');
  table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(table.child!.contentDOM.getAttribute('aria-label')).toBe('Table cell, row 2, column 2');
  table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(table.child).toBeUndefined(); expect(editor.hasFocus).toBe(true);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(depth);
});
it('keeps table controls compact and retains input when their disclosure changes', () => {
  const original='\uFEFF| A | B |\r\n|---|---|\r| 日本語😀 | x |\n\nEnd';
  const {editor,element,table,source}=setup(original);
  const panel=element.querySelector<HTMLElement>('.table-tools')!;
  const toggle=element.querySelector<HTMLButtonElement>('[aria-controls]')!;
  expect(panel.hidden).toBe(true); expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
  expect(element.querySelector('.table-source')).not.toBeNull();
  editor.focus(); const state=editor.state;
  const pointer=new MouseEvent('mousedown',{bubbles:true,cancelable:true}); toggle.dispatchEvent(pointer);
  expect(pointer.defaultPrevented).toBe(true); toggle.click();
  expect(panel.hidden).toBe(false); expect(editor.state).toBe(state); expect(editor.hasFocus).toBe(true);
  table.begin(1,0); const child=table.child!; child.dispatch({selection:{anchor:3,head:0}}); child.focus();
  toggle.click(); expect(panel.hidden).toBe(true); expect(table.child).toBe(child); expect(child.hasFocus).toBe(true);
  table.refresh(Number(element.dataset.from),Number(element.dataset.to),editor.state.doc.sliceString(Number(element.dataset.from),Number(element.dataset.to)));
  expect(panel.hidden).toBe(true);
  child.dispatch({changes:{from:child.state.doc.length,insert:'!'}});
  expect(panel.hidden).toBe(true); expect(table.child).toBe(child);
  const typed=source(),depth=undoDepth(editor.state),selection=child.state.selection;
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})); toggle.click();
  expect(panel.hidden).toBe(true);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})); toggle.click();
  expect(panel.hidden).toBe(false);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
  panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  expect(panel.hidden).toBe(false); expect(child.hasFocus).toBe(true);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
  const control=panel.querySelector<HTMLButtonElement>('button:not(:disabled)')!; control.focus();
  panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  expect(panel.hidden).toBe(true); expect(document.activeElement).toBe(toggle);
  expect(source()).toBe(typed); expect(undoDepth(editor.state)).toBe(depth); expect(child.state.selection.eq(selection)).toBe(true);
  table.begin(1,1); expect(panel.hidden).toBe(false); table.finish(); expect(panel.hidden).toBe(true);
  expect(source()).not.toBe(original); // Only the explicit child input changed source.
});
it('opens controls for restored active cells after widget replacement and history', async () => {
  const original='| A | B |\n|---|---|\n| x | y |\n\nEnd';
  const {editor,table,source}=setup(original); table.begin(1,0);
  table.command('row-below'); expect(undoDepth(editor.state)).toBe(1);
  expect(document.querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
  undo(editor); await Promise.resolve(); expect(source()).toBe(original);
  expect(document.querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
  redo(editor); await Promise.resolve(); expect(document.querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
  const selected=editor.state.field(tableCellField), id=document.querySelector('.table-tools')!.id;
  editor.setState(editor.state); await Promise.resolve();
  expect(editor.state.field(tableCellField)).toEqual(selected);
  expect(document.querySelector('.table-tools')!.id).not.toBe(id);
  expect(document.querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
});
it('gives separate tables unique disclosures and keeps read-only commands disabled', () => {
  const {editor}=setup('| A |\n|---|\n| x |\n\n| B |\n|---|\n| y |\n\nEnd');
  const tables=Array.from(document.querySelectorAll<HTMLElement>('.preview-table'));
  expect(tables).toHaveLength(2);
  const ids=tables.map(table=>table.querySelector('.table-tools')!.id);
  expect(new Set(ids).size).toBe(2);
  tables[0].querySelector<HTMLButtonElement>('[aria-controls]')!.click();
  expect(tables[0].querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
  expect(tables[1].querySelector<HTMLElement>('.table-tools')!.hidden).toBe(true);
  editor.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
  const readonly=document.querySelector<HTMLElement>('.preview-table')!;
  const toggle=readonly.querySelector<HTMLButtonElement>('[aria-controls]')!;
  if (readonly.querySelector<HTMLElement>('.table-tools')!.hidden) toggle.click();
  expect(readonly.querySelector<HTMLElement>('.table-tools')!.hidden).toBe(false);
  readonly.querySelectorAll<HTMLButtonElement>('.table-tools button').forEach(button=>expect(button.disabled).toBe(true));
});
it('appends a row with Tab at the last cell and restores exact cell history', async () => {
  for (const [header, prefix] of [['', ''], ['- ', '  '], ['12) ', '    '],
    ['> > ', '> > '], ['> - ', '>   '], ['- > ', '  > '], ['-\t', '\t']]) {
    for (const body of ['', `\r${prefix}| 日本語😀 | last |`, `\r${prefix}| 日本語😀 |`]) {
      const original = `\uFEFF${header}| A | B |\r\n${prefix}|---|---|${body}\n\nEnd`;
      const {editor, source, table} = setup(original);
      const row = body ? 1 : 0; table.begin(row, 1);
      const child = table.child!, length = child.state.doc.length;
      child.dispatch({selection:{anchor:length,head:0}}); child.focus();
      const key = new KeyboardEvent('keydown', {key:'Tab',bubbles:true,cancelable:true});
      child.contentDOM.dispatchEvent(key);
      expect(key.defaultPrevented).toBe(true);
      const expected = original.replace('\n\nEnd', `\r\n${prefix}| | |\n\nEnd`);
      expect(source()).toBe(expected); expect(undoDepth(editor.state)).toBe(1);
      expect(editor.state.field(tableCellField)).toMatchObject({row:row+1,column:0});
      const next = tableEditor(document.querySelector('.preview-table')!)!;
      expect(next.child!.state.doc.toString()).toBe(''); expect(next.child!.hasFocus).toBe(true);
      undo(editor); await Promise.resolve(); expect(source()).toBe(original);
      const restored = tableEditor(document.querySelector('.preview-table')!)!.child!;
      expect(restored.state.doc.toString()).toBe(child.state.doc.toString());
      expect([restored.state.selection.main.anchor,restored.state.selection.main.head]).toEqual([length,0]);
      expect(restored.hasFocus).toBe(true);
      redo(editor); await Promise.resolve(); expect(source()).toBe(expected);
      expect(editor.state.field(tableCellField)).toMatchObject({row:row+1,column:0});
      expect(tableEditor(document.querySelector('.preview-table')!)!.child!.hasFocus).toBe(true);
      editor.destroy(); outer=undefined; document.body.replaceChildren();
    }
  }
});
it('isolates last-cell Tab from prior and subsequent cell typing', async () => {
  const original = '| A | B |\n|---|---|\n| x | y |\n\nEnd';
  const {editor,source,table} = setup(original); table.begin(1,1);
  table.child!.dispatch({changes:{from:1,insert:'!'},selection:{anchor:2}});
  const typed=source(); table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  const inserted=source(); expect(undoDepth(editor.state)).toBe(2);
  const next=tableEditor(document.querySelector('.preview-table')!)!;
  next.child!.dispatch({changes:{from:0,insert:'new'},selection:{anchor:3}});
  expect(undoDepth(editor.state)).toBe(3);
  undo(editor); await Promise.resolve(); expect(source()).toBe(inserted);
  undo(editor); await Promise.resolve(); expect(source()).toBe(typed);
  undo(editor); await Promise.resolve(); expect(source()).toBe(original);
});
it('consumes last-cell Tab without losing input when insertion is blocked', () => {
  for (const guard of ['read-only','outer-composition','child-composition','filter'] as const) {
    const original='| A | B |\n|---|---|\n| x | 日本語😀 |\n\nEnd';
    const {editor,source,table} = setup(original); table.begin(1,1);
    const child=table.child!; child.dispatch({selection:{anchor:5,head:0}}); child.focus();
    if (guard==='read-only') editor.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
    if (guard==='filter') editor.dispatch({effects:StateEffect.appendConfig.of(EditorState.transactionFilter.of(t=>t.isUserEvent('input.table.structure')?[]:t))});
    if (guard==='outer-composition') editor.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    if (guard==='child-composition') child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    const key=new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}); child.contentDOM.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true); expect(table.child).toBe(child); expect(child.hasFocus).toBe(true);
    expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
    expect([child.state.selection.main.anchor,child.state.selection.main.head]).toEqual([5,0]);
    editor.destroy(); outer=undefined; document.body.replaceChildren();
  }
});
it('edits table cells with one source patch and one outer history, retaining all other bytes', () => {
  const original = '\uFEFFBefore\r\n\r\n|  Header  | Second |\r\n| :--- | ---: |\r\n| first | 😀 last |\r\n\r\nAfter\n';
  const { editor, table, element, source } = setup(original);
  element.querySelector('td')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  const child = table.child!; expect(child).toBeDefined();
  child.dispatch({ changes: { from: 0, to: child.state.doc.length, insert: '日本語 | x' } });
  expect(source()).toBe(original.replace('first', '日本語 \\| x'));
  expect(document.querySelector('.preview-table')).toBe(element);
  expect(table.child).toBe(child); expect(child.state.doc.toString()).toBe('日本語 \\| x');
  expect(undoDepth(editor.state)).toBe(1); expect(undoDepth(child.state)).toBe(0);
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); expect(child.state.doc.toString()).toBe('first');
  expect(redo(editor)).toBe(true); expect(source()).toBe(original.replace('first', '日本語 \\| x'));
  expect(child.state.doc.toString()).toBe('日本語 \\| x');
  table.finish(); expect(element.querySelector('td')!.textContent).toBe('日本語 | x');
});
it('restores the correct cell and its selection across cell Undo/Redo before further input', async () => {
  const original = '\uFEFF| A | B |\r\n|---|---|\r| 图😀 one | two |\n\nEnd';
  const { editor, table, source } = setup(original);
  table.begin(1, 0); table.child!.dispatch({ selection: { anchor: 0, head: 3 } });
  table.child!.dispatch({ changes: { from: 0, to: 3, insert: 'first' }, selection: { anchor: 5 } });
  const first = source(); table.begin(1, 1);
  table.child!.dispatch({ changes: { from: 0, to: 3, insert: 'second' }, selection: { anchor: 6 } });
  const second = source();
  undo(editor); await Promise.resolve(); undo(editor); await Promise.resolve();
  expect(source()).toBe(original);
  const restored = tableEditor(document.querySelector('.preview-table')!)!;
  expect(restored.child!.state.doc.toString()).toBe('图😀 one');
  expect(restored.child!.contentDOM.closest('td')!.getAttribute('data-column')).toBe('0');
  expect(restored.child!.state.selection.main.anchor).toBe(0); expect(restored.child!.state.selection.main.head).toBe(3);
  expect(restored.child!.hasFocus).toBe(true);
  redo(editor); await Promise.resolve(); expect(source()).toBe(first);
  redo(editor); await Promise.resolve(); expect(source()).toBe(second);
  const redone = tableEditor(document.querySelector('.preview-table')!)!;
  expect(redone.child!.state.doc.toString()).toBe('second');
  expect(redone.child!.contentDOM.closest('td')!.getAttribute('data-column')).toBe('1');
  redone.child!.dispatch({ changes: { from: 6, insert: '!' }, selection: { anchor: 7 } });
  expect(source()).toBe(second.replace('second', 'second!'));
});
it('restores one child in the correct table across history and edits only that table', async () => {
  const original = '| A |\n|---|\n| 图😀 first |\n\nMiddle\n\n| B |\n|---|\n| second |\n\nEnd';
  const { editor, table, source } = setup(original);
  table.begin(1, 0); table.child!.dispatch({ selection: { anchor: 3, head: 0 } });
  table.child!.dispatch({ changes: { from: 0, to: 3, insert: 'FIRST' }, selection: { anchor: 5 } });
  const next = tableEditor(document.querySelectorAll('.preview-table')[1] as HTMLElement)!;
  next.begin(1, 0); next.child!.dispatch({ changes: { from: 0, to: 6, insert: 'SECOND' }, selection: { anchor: 6 } });
  undo(editor); await Promise.resolve(); undo(editor); await Promise.resolve();
  expect(source()).toBe(original);
  const controllers = Array.from(document.querySelectorAll<HTMLElement>('.preview-table'), dom => tableEditor(dom)!);
  expect(controllers[0].child!.state.doc.toString()).toBe('图😀 first'); expect(controllers[1].child).toBeUndefined();
  expect(controllers[0].child!.state.selection.main.anchor).toBe(3); expect(controllers[0].child!.state.selection.main.head).toBe(0);
  expect(controllers[0].child!.hasFocus).toBe(true);
  controllers[0].child!.dispatch({ changes: { from: 0, to: 3, insert: 'again' }, selection: { anchor: 5 } });
  expect(source()).toBe(original.replace('图😀 first', 'again first'));
});
it('restores omitted and removed cells without adding source or history events', async () => {
  const original = '| A | B |\n|---|---|\n| one |\n\nEnd', { editor, table, source } = setup(original);
  table.begin(1, 1); table.child!.dispatch({ changes: { from: 0, insert: '图😀' }, selection: { anchor: 3 } });
  const changed = source(); undo(editor); await Promise.resolve();
  let restored = tableEditor(document.querySelector('.preview-table')!)!;
  expect(restored.child!.state.doc.toString()).toBe(''); expect(restored.child!.state.selection.main.head).toBe(0);
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  redo(editor); await Promise.resolve(); restored = tableEditor(document.querySelector('.preview-table')!)!;
  expect(restored.child!.state.doc.toString()).toBe('图😀'); expect(restored.child!.state.selection.main.head).toBe(3);
  expect(source()).toBe(changed); expect(undoDepth(editor.state)).toBe(1);
  const end = editor.state.doc.toString().indexOf('\n\nEnd');
  editor.dispatch({ changes: { from: 0, to: end, insert: 'Paragraph' } });
  await Promise.resolve(); expect(editor.state.field(tableCellField)).toBeNull();
  undo(editor); await Promise.resolve(); restored = tableEditor(document.querySelector('.preview-table')!)!;
  expect(restored.child!.state.doc.toString()).toBe('图😀'); expect(restored.child!.state.selection.main.head).toBe(3);
  expect(source()).toBe(changed); expect(undoDepth(editor.state)).toBe(1);
});
it('does not restore a stale child after a mode change or superseding activation', async () => {
  const { editor, table, display } = setup('| A | B |\n|---|---|\n| first | second |\n\nEnd');
  table.begin(1, 0); table.child!.dispatch({ changes: { from: 0, insert: 'x' } });
  table.begin(1, 1); undo(editor);
  editor.dispatch({ effects: display.reconfigure([]) }); await Promise.resolve();
  expect(document.querySelector('.preview-table')).toBeNull(); expect(document.querySelectorAll('.cm-editor')).toHaveLength(1);
  editor.dispatch({ effects: display.reconfigure(livePreview) }); await Promise.resolve();
  const current = tableEditor(document.querySelector('.preview-table')!)!;
  current.begin(1, 1); await Promise.resolve();
  expect(current.child!.state.doc.toString()).toBe('second'); expect(current.child!.contentDOM.closest('td')!.dataset.column).toBe('1');
});
it('rejects immediate stale-child input and keeps later form focus during restoration', async () => {
  const original = '| A | B |\n|---|---|\n| first | second |\n\nEnd', { editor, table, source } = setup(original);
  table.begin(1, 1); const stale = table.child!, active = editor.state.field(tableCellField)!;
  const cell = editor.state.doc.toString().indexOf('first');
  editor.dispatch({ effects: tableCellEffect.of({ ...active, column: 0, cellFrom: cell, cellTo: cell + 5, anchor: 0, head: 0 }) });
  stale.dispatch({ changes: { from: 0, insert: 'wrong' } }); expect(source()).toBe(original); expect(stale.state.doc.toString()).toBe('second');
  await Promise.resolve(); let current = tableEditor(document.querySelector('.preview-table')!)!;
  current.child!.dispatch({ changes: { from: 0, insert: 'new ' }, selection: { anchor: 4 } });
  current.begin(1, 1); undo(editor);
  const form = document.createElement('input'); document.body.append(form); form.focus();
  await Promise.resolve(); current = tableEditor(document.querySelector('.preview-table')!)!;
  expect(current.child!.state.doc.toString()).toBe('first'); expect(document.activeElement).toBe(form);
  expect(source()).toBe(original);
});
it('edits empty, first, and last cells without changing cell-edge spaces or alignment rows', () => {
  const original = 'Intro\n\n| A | B |\n|:---|---:|\n|   | x\\|y  |\n\nEnd';
  const { table, source, editor } = setup(original);
  table.begin(1, 0); expect(table.child!.state.doc.length).toBe(0);
  table.child!.dispatch({ changes: { from: 0, insert: 'empty' } });
  expect(source()).toBe(original.replace('|   |', '|   empty|'));
  table.begin(0, 0); table.child!.dispatch({ changes: { from: 0, to: 1, insert: 'H' } });
  table.begin(1, 1); expect(table.child!.state.doc.toString()).toBe('x\\|y');
  table.child!.dispatch({ changes: { from: 4, insert: '😀' } });
  expect(source()).toBe(original.replace('|   |', '|   empty|').replace('| A |', '| H |').replace('x\\|y', 'x\\|y😀'));
  for (let i = 0; i < 3; i++) expect(undo(editor)).toBe(true);
  expect(source()).toBe(original);
});
it('keeps escaped pipes and handles backslash parity without accepting multiline input', () => {
  expect(escapeCellPipes('a|b\\|c\\\\|d')).toBe('a\\|b\\|c\\\\\\|d');
  const { table, source } = setup('| A | B |\n|---|---|\n| x | y |\n\nEnd');
  table.begin(1, 0);
  const child = table.child!;
  child.dispatch({ changes: { from: 1, insert: '\\' } });
  child.dispatch({ changes: { from: 2, insert: '|' }, selection: { anchor: 3 } });
  expect(child.state.doc.toString()).toBe('x\\|'); expect(child.state.selection.main.head).toBe(3);
  const captured = source(); child.dispatch({ changes: { from: 3, insert: '\nsecond' } });
  expect(source()).toBe(captured); expect(child.state.doc.toString()).toBe('x\\|');
});
it('destroys the cell edit surface when the table structure is removed or Source mode replaces it', () => {
  const original = 'Before\n\n| A | B |\n|---|---|\n| x | y |\n\nEnd';
  const { table, editor, display } = setup(original);
  table.begin(1, 0); const child = table.child!; const destroy = vi.spyOn(child, 'destroy');
  editor.dispatch({ changes: { from: original.indexOf('| A'), to: original.indexOf('\n\nEnd'), insert: 'Paragraph' } });
  expect(destroy).toHaveBeenCalledOnce(); expect(document.querySelector('.preview-table')).toBeNull();
  expect(editor.state.field(tableCellField)).toBeNull();
  undo(editor);
  const restored = tableEditor(document.querySelector('.preview-table')!)!;
  restored.begin(0, 1); const next = vi.spyOn(restored.child!, 'destroy');
  editor.dispatch({ effects: display.reconfigure([]) });
  expect(next).toHaveBeenCalledOnce(); expect(tableComposing(editor)).toBe(false);
});
it('keeps typed spaces inside the active cell range and protects tight delimiters from a final backslash', () => {
  const { table, source, editor } = setup('|A|B|\n|---|---|\n|x|y|\n\nEnd');
  table.begin(1, 0); const child = table.child!;
  child.dispatch({ changes: { from: 1, insert: '\\' }, selection: { anchor: 2 } });
  expect(child.state.doc.toString()).toBe('x\\\\');
  expect(source()).toContain('|x\\\\|y|');
  expect(table.child).toBe(child);
  undo(editor); expect(child.state.doc.toString()).toBe('x');
  child.dispatch({ changes: { from: 1, insert: ' ' }, selection: { anchor: 2 } });
  expect(child.state.doc.toString()).toBe('x ');
  child.dispatch({ changes: { from: 2, insert: 'word' }, selection: { anchor: 6 } });
  expect(child.state.doc.toString()).toBe('x word'); expect(source()).toContain('|x word|y|');
  child.dispatch({ changes: { from: 0, insert: ' ' } });
  expect(child.state.doc.toString()).toBe(' x word'); expect(source()).toContain('| x word|y|');
});
it('moves between cells with Tab and forwards keyboard Undo to the outer history', () => {
  const { table, source, editor, element } = setup('| A | B |\n|---|---|\n| x | y |\n\nEnd');
  const original = source(); table.begin(1, 0); const child = table.child!;
  child.dispatch({ changes: { from: 1, insert: 'new' } });
  child.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  child.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(table.child).not.toBe(child); expect(table.child!.state.doc.toString()).toBe('y');
  editor.dispatch({ selection: { anchor: editor.state.doc.toString().indexOf('| A') } });
  table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  expect(table.child).toBeUndefined(); expect(element.querySelector('.editing-cell')).toBeNull();
  expect(document.querySelector('.preview-table')).toBe(element);
});
it('ends a cell with Enter without sending the handled key to table source reveal', () => {
  const { table, editor, element, source } = setup('| A | B |\n|---|---|\n| x | y |\n\nEnd');
  const original = source(); table.begin(1, 0);
  table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(table.child).toBeUndefined(); expect(document.querySelector('.preview-table')).toBe(element);
  expect(source()).toBe(original); expect(editor.state.selection.main.head).toBeGreaterThan(original.indexOf('\n\nEnd'));
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-table')).toBeNull(); expect(source()).toBe(original);
});
it('maps an active cell through edits before the table and updates source reveal positions', () => {
  const { table, editor, element, source } = setup('Before\n\n| A | B |\n|---|---|\n| x | y |\n\nEnd');
  table.begin(1, 1); const child = table.child!;
  editor.dispatch({ changes: { from: 0, insert: 'Prefix ' } });
  child.dispatch({ changes: { from: 1, insert: 'z' } });
  expect(source()).toBe('Prefix Before\n\n| A | B |\n|---|---|\n| x | yz |\n\nEnd');
  element.querySelector('.table-source')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.querySelector<HTMLButtonElement>('.table-source')!.click();
  expect(editor.state.selection.main.head).toBe(source().indexOf('| A'));
});
it('defers table navigation and source reveal during composition and blocks read-only edits', () => {
  const { table, editor, element, source } = setup('| A | B |\n|---|---|\n| x | y |\n\nEnd');
  const original = source(); table.begin(1, 0); const child = table.child!;
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(tableComposing(editor)).toBe(true);
  child.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  element.querySelector('.table-source')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.querySelector<HTMLButtonElement>('.table-source')!.click();
  expect(table.child).toBe(child); expect(source()).toBe(original);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  editor.dispatch({ effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)) });
  child.dispatch({ changes: { from: 0, insert: 'blocked' } });
  expect(source()).toBe(original); expect(child.state.doc.toString()).toBe('x');
});
it('runs every structure command as one history event with exact mixed-ending Undo/Redo', () => {
  const original = '\uFEFFBefore\r\n\r\n| A | B |\r\n| :--- | ---: |\r\n| x\\|y | 日本語😀 |\r\n| c | d |\r\n\r\nAfter\n';
  const { editor, source } = setup(original);
  const cases: [TableCommand, string][] = [
    ['row-above', original.replace('| x\\|y', '| | |\r\n| x\\|y')],
    ['row-below', original.replace('| c | d |', '| | |\r\n| c | d |')],
    ['delete-row', original.replace('| x\\|y | 日本語😀 |\r\n', '')],
    ['column-left', original.replace('| A | B |', '| A | Column | B |').replace('| :--- | ---: |', '| :--- | --- | ---: |').replace('| x\\|y | 日本語😀 |', '| x\\|y | | 日本語😀 |').replace('| c | d |', '| c | | d |')],
    ['column-right', original.replace('| A | B |', '| A | B | Column |').replace('| :--- | ---: |', '| :--- | ---: | --- |').replace('| x\\|y | 日本語😀 |', '| x\\|y | 日本語😀 | |').replace('| c | d |', '| c | d | |')],
    ['delete-column', original.replace('| A | B |', '| A |').replace('| :--- | ---: |', '| :--- |').replace('| x\\|y | 日本語😀 |', '| x\\|y |').replace('| c | d |', '| c |')],
    ['align-left', original.replace('---:', ':---')],
    ['align-center', original.replace('---:', ':---:')],
    ['align-right', original],
  ];
  for (const [command, expected] of cases) {
    const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 1);
    expect(table.command(command), command).toBe(true); expect(source(), command).toBe(expected);
    if (expected !== original) {
      expect(undoDepth(editor.state), command).toBe(1);
      expect(undo(editor), command).toBe(true); expect(source(), command).toBe(original);
      expect(redo(editor), command).toBe(true); expect(source(), command).toBe(expected);
      expect(undo(editor), command).toBe(true); expect(source(), command).toBe(original);
    } else expect(undoDepth(editor.state)).toBe(0);
  }
});
it('supports zero body rows, no final ending, indentation, and tables without outer pipes', () => {
  const original = 'Before\r\n\r\n  A | B\r\n  --- | ---:';
  const { editor, source } = setup(original);
  editor.dispatch({ selection: { anchor: 0 } });
  let table = tableEditor(document.querySelector('.preview-table')!)!;
  expect(table.command('row-below')).toBe(true);
  expect(source()).toBe(original + '\r\n  | | |');
  table = tableEditor(document.querySelector('.preview-table')!)!;
  expect(table.child!.state.doc.toString()).toBe('');
  expect(table.command('delete-row')).toBe(true);
  expect(source()).toBe(original + '\r\n');
  undo(editor); undo(editor); expect(source()).toBe(original); editor.dispatch({ selection: { anchor: 0 } });
  table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(0, 0);
  expect(table.command('column-left')).toBe(true);
  expect(source()).toBe('Before\r\n\r\n  Column |A | B\r\n  --- |--- | ---:');
  undo(editor); expect(source()).toBe(original);
});
it('preserves short rows, extra cells, and escaped pipes during column commands', () => {
  const original = '|A|B|C|\n|---|---|---|\n|x|\n|a\\|b|c|d|extra|\n\nEnd';
  const { editor, source } = setup(original);
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(0, 2);
  expect(table.command('column-right')).toBe(true);
  expect(source()).toBe('|A|B|C| Column |\n|---|---|---| --- |\n|x| | | |\n|a\\|b|c|d| |extra|\n\nEnd');
  expect(undo(editor)).toBe(true); expect(source()).toBe(original);
});
it('keeps a valid one-column table when deleting an edge column from rows without outer pipes', () => {
  const original = 'A | B\n--- | ---:\nx | y\n\nEnd';
  const { editor, source } = setup(original);
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 1);
  expect(table.command('delete-column')).toBe(true);
  expect(source()).toBe('|A |\n|--- |\n|x |\n\nEnd');
  expect(document.querySelectorAll('.preview-table th')).toHaveLength(1);
  expect(undo(editor)).toBe(true); expect(source()).toBe(original);
});
it('returns keyboard focus to the outer edit surface when Undo removes the active column', () => {
  const { editor, source } = setup('|A|B|\n|---|---|\n|x|y|\n\nEnd');
  const original = source(); const table = tableEditor(document.querySelector('.preview-table')!)!;
  table.begin(1, 1); expect(table.command('column-right')).toBe(true);
  const child = tableEditor(document.querySelector('.preview-table')!)!.child!;
  child.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(source()).toBe(original); expect(document.activeElement).toBe(editor.contentDOM);
  expect(redo(editor)).toBe(true); expect(document.querySelectorAll('.preview-table th')).toHaveLength(3);
});
it('rejects guarded structure commands without destroying the active cell or changing source', () => {
  const original = '|A|\n|---|\n|x|\n\nEnd';
  const { table, source, element, editor } = setup(original); table.begin(0, 0); const child = table.child!;
  expect(table.command('delete-row')).toBe(false); expect(table.command('row-above')).toBe(false);
  expect(table.command('delete-column')).toBe(false); expect(table.child).toBe(child); expect(source()).toBe(original);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(table.command('column-right')).toBe(false); expect(table.child).toBe(child);
  element.querySelector<HTMLButtonElement>('[data-command="row-below"]')!.click();
  expect(source()).toBe(original); expect(table.child).toBe(child);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  editor.dispatch({ effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)) });
  expect(table.command('row-below')).toBe(false); expect(source()).toBe(original);
});
it('enables structure commands for parsed quote tables and retains quote prefixes in one history event', () => {
  const { table, element, source, editor } = setup('> |A|B|\n> |---|---|\n> |x|y|\n\nEnd');
  const captured = source(); table.begin(1, 0);
  expect(element.querySelector<HTMLButtonElement>('[data-command="row-below"]')!.disabled).toBe(false);
  expect(element.querySelector<HTMLButtonElement>('[data-command="row-below"]')!.title).toBe('');
  expect(table.command('row-below')).toBe(true);
  const edited = captured.replace('> |x|y|', '> |x|y|\n> | | |');
  expect(source()).toBe(edited); expect(undoDepth(editor.state)).toBe(1);
  expect(undo(editor)).toBe(true); expect(source()).toBe(captured);
  expect(redo(editor)).toBe(true); expect(source()).toBe(edited);
});
it('runs all structure commands inside parsed list, quote, tab and combined containers with exact history', () => {
  const contexts = [
    { header: '- ', continuation: '  ', after: '- Sibling' },
    { header: '12) ', continuation: '    ', after: '13) Sibling' },
    { header: '> > ', continuation: '> > ', after: '> > After' },
    { header: '> - ', continuation: '>   ', after: '> - Sibling' },
    { header: '- > ', continuation: '  > ', after: '- Sibling' },
    { header: '-\t', continuation: '\t', after: '- Sibling' },
    { header: '- Outer\r\n  - ', continuation: '    ', after: '  - Sibling' },
  ];
  const check = (editor: EditorView) => {
    const plan = editor.state.field(previewField), actual = plan.decorations.iter();
    const expected = previewDecorations(editor.state, collectPreview(editor.state, syntaxTree(editor.state), plan.imageVersion)).iter();
    while (actual.value && expected.value) {
      expect([actual.from, actual.to]).toEqual([expected.from, expected.to]); expect(actual.value.eq(expected.value)).toBe(true);
      actual.next(); expected.next();
    }
    expect(actual.value).toBeNull(); expect(expected.value).toBeNull();
  };
  for (const { header, continuation: p, after } of contexts) {
    const original = `\uFEFFBefore\r\n\r\n${header}| A | B |\r\n${p}| :--- | ---: |\r${p}| x\\|y | 日本語😀 |\n${p}| c | d |\r\n\r\n${after}\r\n\r\nEnd`;
    const { editor, source } = setup(original);
    expect(document.querySelectorAll('.preview-table')).toHaveLength(1);
    const cases: [TableCommand, string][] = [
      ['row-above', original.replace(`${p}| x\\|y`, `${p}| | |\r\n${p}| x\\|y`)],
      ['row-below', original.replace(`${p}| x\\|y | 日本語😀 |`, `${p}| x\\|y | 日本語😀 |\r\n${p}| | |`)],
      ['delete-row', original.replace(`${p}| x\\|y | 日本語😀 |\n`, '')],
      ['column-left', original.replace('| A | B |', '| A | Column | B |').replace('| :--- | ---: |', '| :--- | --- | ---: |').replace('| x\\|y | 日本語😀 |', '| x\\|y | | 日本語😀 |').replace('| c | d |', '| c | | d |')],
      ['column-right', original.replace('| A | B |', '| A | B | Column |').replace('| :--- | ---: |', '| :--- | ---: | --- |').replace('| x\\|y | 日本語😀 |', '| x\\|y | 日本語😀 | |').replace('| c | d |', '| c | d | |')],
      ['delete-column', original.replace('| A | B |', '| A |').replace('| :--- | ---: |', '| :--- |').replace('| x\\|y | 日本語😀 |', '| x\\|y |').replace('| c | d |', '| c |')],
      ['align-left', original.replace('---:', ':---')], ['align-center', original.replace('---:', ':---:')], ['align-right', original],
    ];
    for (const [command, expected] of cases) {
      const controller = tableEditor(document.querySelector('.preview-table')!)!; controller.begin(1, 1);
      expect(controller.command(command), `${header} ${command}`).toBe(true); expect(source()).toBe(expected); check(editor);
      if (expected !== original) {
        expect(undoDepth(editor.state)).toBe(1); expect(undo(editor)).toBe(true); expect(source()).toBe(original); check(editor);
        expect(redo(editor)).toBe(true); expect(source()).toBe(expected); check(editor);
        expect(undo(editor)).toBe(true); expect(source()).toBe(original); check(editor);
      }
    }
    editor.destroy(); outer = undefined; document.body.replaceChildren();
  }
});
it('uses continuation prefixes for header-only nested tables, retaining adjacent siblings and no final newline', () => {
  for (const [header, prefix] of [['- ', '  '], ['> > ', '> > '], ['> - ', '>   '], ['- > ', '  > '], ['-\t', '\t']]) {
    const original = `\uFEFF${header}|A|B|\r\n${prefix}|---|---|`;
    const { editor, source } = setup(original); editor.dispatch({ selection: { anchor: 0 } });
    const table = tableEditor(document.querySelector('.preview-table')!)!;
    expect(table.command('row-below'), header).toBe(true);
    expect(source()).toBe(original + `\r\n${prefix}| | |`);
    const current = tableEditor(document.querySelector('.preview-table')!)!;
    expect(current.command('delete-row')).toBe(true); expect(source()).toBe(original + '\r\n');
    expect(undo(editor)).toBe(true); expect(source()).toBe(original + `\r\n${prefix}| | |`);
    expect(undo(editor)).toBe(true); expect(source()).toBe(original);
    expect(redo(editor)).toBe(true); expect(source()).toBe(original + `\r\n${prefix}| | |`);
    editor.destroy(); outer = undefined; document.body.replaceChildren();
  }
});
it('rejects a filtered row proposal and retains the active child and selection', () => {
  const original = '> |A|B|\n> |---|---|\n> |x|y|\nOutside\n\nEnd';
  const { editor, table, source } = setup(original); table.begin(1, 0); const child = table.child!;
  const from = editor.state.doc.toString().indexOf('|A');
  expect(findTable(editor.state, from)).not.toBeNull();
  const captured = source();
  child.dispatch({ selection: { anchor: 0, head: 1 } }); const selection = child.state.selection;
  editor.dispatch({ effects: StateEffect.appendConfig.of(EditorState.transactionFilter.of(transaction =>
    transaction.docChanged ? [] : transaction)) });
  expect(table.command('row-below')).toBe(false); expect(table.child).toBe(child);
  expect(child.state.selection.eq(selection)).toBe(true);
  expect(source()).toBe(captured); expect(undoDepth(editor.state)).toBe(0);
});
it('validates the exact final structure transaction before ending the cell edit', () => {
  for (const rejects of ['event', 'effect', 'changes']) {
    const original = '> - |A|B|\n>   |---|---|\n>   |x|y|\n> - Sibling\n\nEnd';
    const { editor, table, source } = setup(original); table.begin(1, 0); const child = table.child!;
    child.dispatch({ selection: { anchor: 1, head: 0 } }); const selection = child.state.selection;
    editor.dispatch({ effects: StateEffect.appendConfig.of(EditorState.transactionFilter.of(transaction => {
      if (!transaction.docChanged) return transaction;
      const final = rejects === 'effect' ? transaction.effects.some(effect => effect.is(tableCellEffect)) : transaction.isUserEvent('input.table.structure');
      if (!final) return transaction;
      return rejects === 'changes' ? { changes: { from: transaction.startState.doc.length, insert: ' changed' } } : [];
    })) });
    expect(table.command('row-below'), rejects).toBe(false); expect(table.child).toBe(child);
    expect(child.state.selection.eq(selection)).toBe(true); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
    editor.destroy(); outer = undefined; document.body.replaceChildren();
  }
});
it('rejects structure controls from a removed controller without editing a replacement table', () => {
  const original = '> |A|B|\n> |---|---|\n> |x|y|\n\nEnd';
  const { editor, table, source, display } = setup(original); table.begin(1, 0);
  editor.dispatch({ effects: display.reconfigure([]) }); editor.dispatch({ effects: display.reconfigure(livePreview) });
  expect(table.command('column-right')).toBe(false); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});
it('retains lazy quote rows and adjacent siblings when structure proposals preserve complete boundaries', () => {
  const documents = [
    '> |A|B|\n> |---|---|\n|x|y|\n> |c|d|\n\nOutside',
    '> |A|B|\n|---|---|\n|x|y|\n\nOutside',
    '- |A|B|\n  |---|---|\n  |x|y|\n- Sibling\n\nEnd',
    '> - |A|B|\n>   |---|---|\n>   |x|y|\n> - Sibling\n\nEnd',
  ];
  for (const original of documents) {
    const { editor, source } = setup(original);
    for (const command of ['row-above', 'row-below', 'delete-row', 'column-right', 'delete-column', 'align-center'] as TableCommand[]) {
      const controller = tableEditor(document.querySelector('.preview-table')!)!; controller.begin(1, 0);
      expect(controller.command(command), `${original} ${command}`).toBe(true);
      const changed = source(); expect(changed).not.toBe(original);
      expect(changed.split('\n').at(-1)).toBe(original.split('\n').at(-1));
      if (original.includes('Sibling')) expect(changed).toContain(original.split('\n').find(line => line.includes('Sibling'))!);
      expect(undoDepth(editor.state)).toBe(1); expect(undo(editor)).toBe(true); expect(source()).toBe(original);
      expect(redo(editor)).toBe(true); expect(source()).toBe(changed); expect(undo(editor)).toBe(true); expect(source()).toBe(original);
    }
    editor.destroy(); outer = undefined; document.body.replaceChildren();
  }
});
it('opens omitted cells without a source edit and materializes only needed slots in one Undo step', () => {
  const original = '\uFEFFBefore\r\n\r\n|A|B|C|D|\r\n|---|---|---|---|\r\n|x|\r\n\r\nEnd\n';
  const { table, editor, source } = setup(original); table.begin(1, 1);
  expect(table.child!.state.doc.length).toBe(0); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  table.child!.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  table.begin(1, 3); const child = table.child!;
  child.dispatch({ changes: { from: 0, insert: '日本語 | 😀' }, selection: { anchor: 8 } });
  const changed = original.replace('|x|\r\n', '|x| | | 日本語 \\| 😀 |\r\n');
  expect(source()).toBe(changed); expect(table.child).toBe(child); expect(undoDepth(editor.state)).toBe(1);
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); expect(child.state.doc.length).toBe(0);
  expect(redo(editor)).toBe(true); expect(source()).toBe(changed); expect(child.state.doc.toString()).toBe('日本語 \\| 😀');
});
it('handles spaces-only edits, existing padding, backslashes, and rows without trailing pipes', () => {
  const original = '|A|B|C|\n|---|---|---|\nx  \n\nEnd';
  const { table, source, editor } = setup(original); table.begin(1, 1); const child = table.child!;
  child.dispatch({ changes: { from: 0, insert: ' ' } });
  expect(source()).toBe(original.replace('x  \n', 'x  |   |\n')); expect(child.state.doc.toString()).toBe(' ');
  expect(undo(editor)).toBe(true); expect(source()).toBe(original); expect(child.state.doc.toString()).toBe('');
  child.dispatch({ changes: { from: 0, insert: 'a\\|b\\' } });
  expect(source()).toBe(original.replace('x  \n', 'x  | a\\|b\\ |\n')); expect(child.state.doc.toString()).toBe('a\\|b\\');
  undo(editor); expect(source()).toBe(original);
});
it('keeps nested prefixes and rejects empty or multiline omitted-cell changes', () => {
  const original = '> |A|B|C|\n> |---|---|---|\n> |x|\n\nEnd';
  const { table, source, editor } = setup(original); table.begin(1, 1); const child = table.child!;
  child.dispatch({ changes: { from: 0, insert: '' } });
  child.dispatch({ changes: { from: 0, insert: 'first\nsecond' } });
  expect(source()).toBe(original); expect(child.state.doc.length).toBe(0); expect(undoDepth(editor.state)).toBe(0);
  child.dispatch({ changes: { from: 0, insert: '新' } });
  expect(source()).toBe(original.replace('> |x|\n', '> |x| 新 |\n'));
  undo(editor); expect(source()).toBe(original); expect(child.state.doc.length).toBe(0);
});
it('maps virtual cells through prefix edits and rejects input after their row is removed', () => {
  const { table, editor, source } = setup('Before\n\n|A|B|\n|---|---|\n|x|\n\nEnd');
  table.begin(1, 1); const child = table.child!;
  editor.dispatch({ changes: { from: 0, insert: 'Prefix ' } });
  child.dispatch({ changes: { from: 0, insert: 'added' } });
  expect(source()).toContain('Prefix Before'); expect(source()).toContain('|x| added |');
  const start = editor.state.doc.toString().indexOf('|x|');
  editor.dispatch({ changes: { from: start, to: editor.state.doc.length, insert: 'End' } });
  const captured = source(); child.dispatch({ changes: { from: 0, insert: 'stale' } });
  expect(source()).toBe(captured);
});
it('distinguishes a final escaped pipe from a delimiter and retains trailing padding', () => {
  const original = '|A|B|C|\n|---|---|---|\nx\\|  \n\nEnd';
  const { table, source, editor } = setup(original); table.begin(1, 1);
  table.child!.dispatch({ changes: { from: 0, insert: 'new' } });
  expect(source()).toBe(original.replace('x\\|  \n', 'x\\|  | new |\n'));
  undo(editor); expect(source()).toBe(original); expect(table.child!.state.doc.length).toBe(0);
  redo(editor); expect(table.child!.state.doc.toString()).toBe('new');
});
it('restores omitted-cell edits through mode changes and source edits before the table', () => {
  const original = 'Before\n\n|A|B|\n|---|---|\n|x|\n\nEnd';
  const { editor, table, source, display } = setup(original); table.begin(1, 1);
  table.child!.dispatch({ changes: { from: 0, insert: ' value ' } });
  const changed = original.replace('|x|\n', '|x|  value  |\n'); expect(source()).toBe(changed);
  editor.dispatch({ effects: display.reconfigure([]) });
  editor.dispatch({ changes: { from: 0, insert: 'Prefix ' } });
  undo(editor); expect(source()).toBe(changed);
  undo(editor); expect(source()).toBe(original);
  redo(editor); expect(source()).toBe(changed);
  editor.dispatch({ effects: display.reconfigure(livePreview) });
  const restored = tableEditor(document.querySelector('.preview-table')!)!;
  restored.begin(1, 1); expect(restored.child!.state.doc.toString()).toBe('value');
  undo(editor); expect(source()).toBe(original); expect(restored.child!.state.doc.length).toBe(0);
  redo(editor); expect(source()).toBe(changed);
});
