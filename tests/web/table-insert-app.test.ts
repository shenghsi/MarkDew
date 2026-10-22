// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { tableCellField, tableEditor, endTableEdit } from '../../src/web/table';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('inserts through the toolbar with stable baseline and shared history in both modes', async () => {
  document.body.innerHTML='<div id="app"></div>';
  const {view,tabs}=await import('../../src/web/main');
  const source=()=>savedSource(view.state.field(sourceField));
  try {
    const original='日本語😀\n\nTail';
    view.dispatch({changes:{from:0,insert:original},selection:{anchor:5,head:0}});
    const button=document.querySelector<HTMLButtonElement>('#insert-table')!;
    const down=new MouseEvent('mousedown',{bubbles:true,cancelable:true}); button.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true); const depth=undoDepth(view.state), baseline=tabs.active.baseline;
    button.click(); expect(source()).toContain('日本語😀\n\n| Column 1 | Column 2 |');
    expect(undoDepth(view.state)).toBe(depth+1); expect(tabs.active.baseline).toBe(baseline);
    expect(tableEditor(document.querySelector('.preview-table')!)!.child!.hasFocus).toBe(true);
    undo(view); await Promise.resolve(); expect(source()).toBe(original);
    redo(view); await Promise.resolve(); expect(view.state.field(tableCellField)).toMatchObject({row:0,column:0});
    const before=source(); button.click(); expect(source()).toBe(before); expect(document.querySelector('#status')!.textContent).toContain('table cell');
    endTableEdit(view); undo(view); await Promise.resolve();
    document.querySelector<HTMLButtonElement>('#source')!.click(); button.click();
    expect(view.state.field(tableCellField,false)).toBeUndefined();
    expect(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to)).toBe('Column 1');
    expect(tabs.active.baseline).toBe(baseline);
  } finally {view.destroy();}
});
