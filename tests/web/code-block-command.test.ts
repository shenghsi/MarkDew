// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { codeBlock } from '../../src/web/code-block-command';
let view: EditorView;
afterEach(()=>{view?.destroy();document.body.replaceChildren();});
function create(original:string,anchor:number,head=anchor) {
  view?.destroy(); document.body.replaceChildren(); const record=fromSource(original),display=new Compartment();
  view=new EditorView({parent:document.body,state:EditorState.create({doc:normalize(record.raw),selection:{anchor,head},
    extensions:[sourceExtensions(record),history(),documentLanguage(),display.of(livePreview)]})});
  return {source:()=>savedSource(view.state.field(sourceField)),display};
}
it('wraps complete source blocks with safe fences and exact history in both modes', () => {
  for (const body of ['日本語😀','first\r\nsecond','> quote\r\n> next','- one\r\n\r\n  two\r\n- next',
    '12) one\r\n13) next','> - one\r\n>   two','  indented','**a** and ````code````']) {
    const original='\uFEFFBefore\r\n\r\n'+body+'\r\n\rTail\n', normalized=normalize(fromSource(original).raw);
    const at=normalized.indexOf(normalize(body)), end=at+normalize(body).length;
    const {source,display}=create(original,end,at), selection=view.state.selection;
    expect(codeBlock(view)).toBeNull();
    const fence=body.includes('````')?'`````':'```';
    const expected=original.replace(body,fence+'\r\n'+body+'\r\n'+fence);
    expect(source()).toBe(expected); expect(undoDepth(view.state)).toBe(1);
    expect(view.state.selection.main.anchor).toBe(end+fence.length+1);
    expect(view.state.selection.main.head).toBe(at+fence.length+1);
    view.dispatch({effects:display.reconfigure([])}); undo(view);
    expect(source()).toBe(original); expect(view.state.selection.eq(selection)).toBe(true);
    redo(view); expect(source()).toBe(expected);
  }
});
it('handles empty documents, blank lines, EOF and block selection boundaries', () => {
  const {source}=create('',0); expect(codeBlock(view)).toBeNull(); expect(source()).toBe('```\n\n```');
  expect(view.state.selection.main.head).toBe(4);
  const empty=create('Before\n\n\nAfter',8); expect(codeBlock(view)).toBeNull(); expect(empty.source()).toBe('Before\n\n```\n\n```\nAfter');
  const eof=create('> quote',4); expect(codeBlock(view)).toBeNull(); expect(eof.source()).toBe('```\n> quote\n```');
  const boundary=create('First\n\nSecond',0,7); expect(codeBlock(view)).toBeNull(); expect(boundary.source()).toBe('```\nFirst\n\n```\nSecond');
  const multi=create('First\n\nSecond\n\nLast',1,10); expect(codeBlock(view)).toBeNull(); expect(multi.source()).toBe('```\nFirst\n\nSecond\n```\n\nLast');
});
it('rejects metadata, existing code, footnotes, composition and filtered transactions', () => {
  for (const [original,at,to] of [['---\ntitle: x\n---\nBody',5,5],['---\ntitle: x\n---\nBody',0,20],
    ['```\ncode',5,5],['    code',6,6],['[^x]: note',6,6]] as const) {
    const {source}=create(original,at,to),selection=view.state.selection;
    expect(codeBlock(view)).not.toBeNull(); expect(source()).toBe(original);
    expect(view.state.selection.eq(selection)).toBe(true); expect(undoDepth(view.state)).toBe(0);
  }
  for (const guard of ['composition','lock','filter','rewrite'] as const) {
    const {source}=create('words',4,1),selection=view.state.selection; view.focus();
    if(guard==='composition') view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    if(guard==='lock') view.dispatch({effects:StateEffect.appendConfig.of(EditorState.readOnly.of(true))});
    if(guard==='filter'||guard==='rewrite') view.dispatch({effects:StateEffect.appendConfig.of(EditorState.transactionFilter.of(t=>
      t.isUserEvent('input.code-block')?guard==='filter'?[]:{changes:{from:0,insert:'changed'}}:t))});
    expect(codeBlock(view)).not.toBeNull(); expect(source()).toBe('words'); expect(view.state.selection.eq(selection)).toBe(true);
    expect(undoDepth(view.state)).toBe(0); expect(view.hasFocus).toBe(true);
  }
});
