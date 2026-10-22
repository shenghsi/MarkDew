// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorView, DecorationSet } from '@codemirror/view';
import { history, undo, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, livePreview, previewDecorations, previewField, previewItems } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';

Object.defineProperty(Range.prototype,'getClientRects',{configurable:true,value:()=>[]});
Object.defineProperty(Range.prototype,'getBoundingClientRect',{configurable:true,value:()=>new DOMRect()});
let view:EditorView|undefined;
afterEach(()=>{view?.destroy();view=undefined;document.body.replaceChildren();});
const stable=('# Heading\n\nWords **strong** and *soft* with `code`.\n\n').repeat(80);
function create(source:string) {
  const record=fromSource(source);let state=EditorState.create({doc:normalize(record.raw),selection:{anchor:normalize(record.raw).length},extensions:[
    sourceExtensions(record),documentLanguage(),livePreview,history(),EditorState.allowMultipleSelections.of(true)]});
  expect(ensureSyntaxTree(state,state.doc.length,10000)).not.toBeNull();return state.update({}).state;
}
function compare(actual:DecorationSet,expected:DecorationSet) {
  const left=actual.iter(),right=expected.iter();
  while(left.value&&right.value){expect([left.from,left.to]).toEqual([right.from,right.to]);expect(left.value.eq(right.value)).toBe(true);left.next();right.next();}
  expect(left.value).toBeNull();expect(right.value).toBeNull();
}
function check(state:EditorState) {
  const plan=state.field(previewField);compare(plan.decorations,previewDecorations(state,collectPreview(state,syntaxTree(state),plan.imageVersion)));
}
it('keeps complete decorations and current formula and list widget positions after local edits', () => {
  let state=create(stable+'Math $x^2$.\n\n- [ ] Task\n  continuation\n\nEnd');
  for(const insert of ['中文😀','Z','','e\u0301','\n\n# New\n\n']) {
    const transaction=state.update({changes:{from:30,to:31,insert},selection:{anchor:30+insert.length}});
    state=transaction.state;check(state);
    for(const item of previewItems(state).filter(item=>item.kind==='math'||item.marker)) {
      const cursor=state.field(previewField).decorations.iter(item.from);
      while(cursor.value&&cursor.from<=item.to){if(cursor.value.spec.widget&&cursor.from===item.from) {
        const widget=cursor.value.spec.widget;expect((widget.item||widget.marker).from).toBe(item.from);
      }cursor.next();}
    }
  }
});
it('matches full construction through split, merge, zero-length, Unicode and multi-change boundaries', () => {
  const tail='\n\n# 😀中文\n\n> **אבג**\n>\n> - [ ] العربية\n\nText **strong $x$** and `code`.\n\nEnd';
  const initial=create(stable+tail),start=stable.length;
  for(let at=start;at<=initial.doc.length;at++) for(const insert of ['中','\n','*','']) {
    const transaction=initial.update({changes:{from:at,to:Math.min(at+1,initial.doc.length),insert},selection:{anchor:at+insert.length}});
    check(transaction.state);
  }
  let state=initial;
  for(const change of [
    [{from:20,insert:'😀'},{from:start+3,to:start+6,insert:''}],
    [{from:0,to:8,insert:''},{from:100,insert:'\n\n'}],
    [{from:10,insert:'$'},{from:50,insert:'`'}],
  ]) {state=state.update({changes:change,selection:EditorSelection.create([EditorSelection.cursor(5),EditorSelection.range(60,20)])}).state;check(state);
    expect(ensureSyntaxTree(state,state.doc.length,10000)).not.toBeNull();state=state.update({}).state;check(state);}
},20000);
it('joins groups after deletion and rebuilds a group bridging two dirty intervals', () => {
  let state=create(stable+'**first**\n\n**second**\n\nEnd');
  const at=state.doc.toString().indexOf('**first**'),transaction=state.update({changes:{from:at+9,to:at+11,insert:''},selection:{anchor:state.doc.length-2}});
  check(transaction.state);
  state=create(stable+'Text **strong $x$ and soft** tail\n\nEnd');
  const text=state.doc.toString(),left=text.indexOf('strong'),right=text.indexOf('soft');
  const bridged=state.update({changes:[{from:left,to:left+1,insert:'中'},{from:right,to:right+1,insert:'😀'}],selection:{anchor:state.doc.length}});
  check(bridged.state);
});
it('restores exact source and complete decorations through Undo and Redo after growing edits', () => {
  const original='\uFEFF'+stable.replace(/\n/g,'\r\n')+'Math $x$\r\n\r\n- [ ] Task\r\n\rEnd',initial=create(original);
  view=new EditorView({state:initial,parent:document.body});check(view.state);
  view.dispatch({changes:{from:30,insert:'😀中文'},selection:{anchor:34},userEvent:'input.type'});const edited=savedSource(view.state.field(sourceField));check(view.state);
  undo(view);expect(savedSource(view.state.field(sourceField))).toBe(original);check(view.state);
  redo(view);expect(savedSource(view.state.field(sourceField))).toBe(edited);check(view.state);
});
it('matches full construction for global note/image changes and incomplete parser state', () => {
  for(const source of [stable+'[^n]: Note\n\nCall[^n].',stable+'![alt](a.png)',stable+'| A |\n| - |\n| x |']) {
    const state=create(source),transaction=state.update({changes:{from:30,insert:'中'}});
    check(transaction.state);
  }
  const state=EditorState.create({doc:stable.repeat(20),extensions:[documentLanguage(),livePreview]}),transaction=state.update({changes:{from:30,insert:'中'}});
  check(transaction.state);
});
