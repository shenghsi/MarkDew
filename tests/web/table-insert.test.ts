// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { tableCellField, tableEditor } from '../../src/web/table';
import { insertTable } from '../../src/web/table-insert';

let view: EditorView;
afterEach(() => {view?.destroy(); document.body.replaceChildren();});
const template='| Column 1 | Column 2 |\n| --- | --- |\n| | |\n| | |';
function create(original:string, at:number, live=true, head=at) {
  view?.destroy(); document.body.replaceChildren();
  const record=fromSource(original), display=new Compartment();
  view=new EditorView({parent:document.body,state:EditorState.create({doc:normalize(record.raw),selection:{anchor:at,head},
    extensions:[sourceExtensions(record),history(),documentLanguage(),display.of(live?livePreview:[])]})});
  return ()=>savedSource(view.state.field(sourceField));
}
it('creates a table in empty and blank documents with exact source Undo and Redo', async () => {
  for (const [original,at,expected] of [['',0,template+'\n\n'], ['\uFEFF',0,'\uFEFF'+template+'\n\n'],
    ['\r\n\r\n',0,template.replaceAll('\n','\r\n')+'\r\n\r\n'],
    ['  \r\n',0,template.replaceAll('\n','\r\n')+'\r\n\r\n  \r\n']] as const) {
    const source=create(original,at); const before=view.state.selection;
    expect(insertTable(view)).toBeNull(); expect(source()).toBe(expected); expect(undoDepth(view.state)).toBe(1);
    expect(view.state.field(tableCellField)).toMatchObject({row:0,column:0});
    const child=tableEditor(document.querySelector('.preview-table')!)!.child!;
    expect(child.state.doc.toString()).toBe('Column 1'); expect(child.hasFocus).toBe(true);
    undo(view); await Promise.resolve(); expect(source()).toBe(original); expect(view.state.selection.eq(before)).toBe(true);
    redo(view); await Promise.resolve(); expect(source()).toBe(expected);
    expect(tableEditor(document.querySelector('.preview-table')!)!.child!.hasFocus).toBe(true);
  }
});
it('inserts after complete blocks and containers without replacing selected text', () => {
  for (const [body,at] of [
    ['Text',2], ['> quote\n> next',4], ['- one\n\n  two\n- next',7],
    ['> - one\n>   two\n> - next',8], ['```md\n\ntext\n```',7],
    ['# Heading',3], ['| A |\n|---|\n| x |',2],
  ] as const) {
    const original='\uFEFF'+body.replaceAll('\n','\r\n')+'\r\n\rTail\n';
    const source=create(original,at,false);
    expect(insertTable(view)).toBeNull();
    expect(source()).toBe('\uFEFF'+body.replaceAll('\n','\r\n')+'\r\n\r\n'+template.replaceAll('\n','\r\n')+'\r\n\rTail\n');
    expect(view.state.field(tableCellField,false)).toBeUndefined();
    expect(view.state.sliceDoc(view.state.selection.main.from,view.state.selection.main.to)).toBe('Column 1');
    undo(view); expect(source()).toBe(original);
  }
  const original='First\n\nSecond\n\nEnd', source=create(original,1,false,10);
  expect(insertTable(view)).toBeNull(); expect(source()).toBe('First\n\nSecond\n\n'+template+'\n\nEnd');
});
it('handles EOF containers and inserts after metadata from the body', () => {
  for (const body of ['> quote','- item','> - item','```\ntext\n```']) {
    const source=create(body,body.length,false);
    expect(insertTable(view)).toBeNull(); expect(source()).toBe(body+'\n\n'+template+'\n\n');
  }
  const original='---\r\ntitle: x\r\n---\r\n\r\nBody', source=create(original,normalize(original).length,false);
  expect(insertTable(view)).toBeNull(); expect(source()).toBe(original+'\r\n\r\n'+template.replaceAll('\n','\r\n')+'\r\n\r\n');
});
it('rejects metadata, composition, locks and final filters without changing input', () => {
  for (const guard of ['metadata','composition','lock','filter','rewrite'] as const) {
    const original=guard==='metadata'?'---\ntitle: x\n---\n\nBody':'Text';
    const source=create(original,guard==='metadata'?7:2,false); view.focus(); const selection=view.state.selection;
    if (guard==='composition') view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    if (guard==='lock') view.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
    if (guard==='filter'||guard==='rewrite') view.dispatch({effects:StateEffect.appendConfig.of(EditorState.transactionFilter.of(t=>
      t.isUserEvent('input.table.insert')?guard==='filter'?[]:{changes:{from:0,insert:'changed'}}:t))});
    expect(insertTable(view)).not.toBeNull(); expect(source()).toBe(original);
    expect(view.state.selection.eq(selection)).toBe(true); expect(undoDepth(view.state)).toBe(0); expect(view.hasFocus).toBe(true);
  }
});
