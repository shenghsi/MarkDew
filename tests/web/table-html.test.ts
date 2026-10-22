// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {Compartment,EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {ensureSyntaxTree} from '@codemirror/language';
import {history,undo,redo,undoDepth} from '@codemirror/commands';
import {invoke} from '@tauri-apps/api/core';
import {documentLanguage} from '../../src/web/document-language';
import {livePreview} from '../../src/web/preview';
import {tableEditor} from '../../src/web/table';
import {imagePath,imageBasePath,imageDocument,setImagePath} from '../../src/web/images';
import {fromSource,normalize,sourceExtensions,sourceField,savedSource} from '../../src/web/source';
import {tableProjection} from '../../src/web/renderers';
import {inlineHTML} from '../../src/web/inline-html';
import * as cellHTML from '../../src/web/cell-html';
import * as formulas from '../../src/web/math-preview';
import {rasterHeader} from './raster-fixtures';
vi.mock('@tauri-apps/api/core',()=>({invoke:vi.fn(),isTauri:()=>true}));
Object.defineProperty(Range.prototype,'getClientRects',{configurable:true,value:()=>[]});
Object.defineProperty(Range.prototype,'getBoundingClientRect',{configurable:true,value:()=>new DOMRect()});
let view:EditorView|undefined;
afterEach(()=>{view?.destroy();view=undefined;document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();vi.mocked(invoke).mockReset();});
function state(source:string,display:Compartment) {
  const record=fromSource(source);let state=EditorState.create({doc:normalize(record.raw),selection:{anchor:normalize(record.raw).length},extensions:[
    sourceExtensions(record),history(),documentLanguage(),display.of(livePreview),imagePath,imageBasePath.of('/tmp/writing.md'),imageDocument.of(42)]});
  expect(ensureSyntaxTree(state,state.doc.length,1000)).not.toBeNull();return state.update({}).state;
}
function create(source:string) {
  const display=new Compartment();view=new EditorView({state:state(source,display),parent:document.body});
  return {editor:view,display,source:()=>savedSource(view!.state.field(sourceField)),table:()=>tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!};
}
it('formats headers and cells with nested Markdown, math and captured images without source or history edits',async()=>{
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png',1,1).buffer);
  const revoke=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL=vi.fn(()=>'blob:html-cell');static revokeObjectURL=revoke;});
  const original='\uFEFF| <kbd>Enter</kbd> | Plain |\r\n| - | - |\r\n| <span lang="ja">**日本語😀** $x^2$ ![図](image.png)</span> | other |\r\n\r\nEnd\n';
  const {editor,source,table}=create(original);
  await vi.waitFor(()=>expect(document.querySelector('td span[lang=ja] .table-math svg')).not.toBeNull());
  expect(document.querySelector('th kbd')!.textContent).toBe('Enter');expect(document.querySelector('td strong')!.textContent).toBe('日本語😀');
  expect(invoke).toHaveBeenCalledExactlyOnceWith('read_image',{destination:'image.png',documentPath:'/tmp/writing.md',document:42});
  expect(document.querySelector('td span[lang=ja] img')).not.toBeNull();
  expect(source()).toBe(original);expect(undoDepth(editor.state)).toBe(0);
  table().begin(1,0);expect(table().child!.state.doc.toString()).toBe('<span lang="ja">**日本語😀** $x^2$ ![図](image.png)</span>');
  expect(document.querySelector('.editing-cell svg, .editing-cell img')).toBeNull();expect(revoke).toHaveBeenCalledWith('blob:html-cell');
});
it('keeps unsupported cell source complete and starts no jobs for its images or formulas',async()=>{
  const mount=vi.spyOn(formulas,'mountFormula');
  const original='| A | B |\n| - | - |\n| <svg>**raw** $inside$ ![hidden](old.png)</svg> | <b>$outside$</b> |\n\nEnd';
  const {source,editor}=create(original);
  await vi.waitFor(()=>expect(document.querySelector('td[data-html-ready=error]')).not.toBeNull());
  await vi.waitFor(()=>expect(document.querySelector('td b svg')).not.toBeNull());
  expect(document.querySelector('td[data-html-ready=error]')!.textContent).toBe(' <svg>**raw** $inside$ ![hidden](old.png)</svg> ');
  expect(mount).toHaveBeenCalledTimes(1);expect(mount.mock.calls[0][1].formula).toBe('outside');
  expect(invoke).not.toHaveBeenCalled();expect(source()).toBe(original);expect(undoDepth(editor.state)).toBe(0);
});
it('retains escaped pipes and padding in fallback cells with optional delimiters and container prefixes',async()=>{
  for(const [table,expected] of [
    ['| A | B |\n| - | - |\n| <svg>left\\|right</svg> | words |',' <svg>left\\|right</svg> '],
    ['A | B\n--- | ---\nBefore <svg>left\\|right</svg> | words','Before <svg>left\\|right</svg> '],
    ['> | A | B |\n> | - | - |\n> | <svg>left\\|right</svg> | words |',' <svg>left\\|right</svg> '],
  ]) {
    const original=table+'\n\nEnd';const {source,editor}=create(original);
    expect(document.querySelectorAll('td'),table).toHaveLength(2);
    await vi.waitFor(()=>expect(document.querySelector('td[data-html-ready=error]'),table).not.toBeNull());
    expect(document.querySelector('td')!.textContent).toBe(expected);
    expect(document.querySelector('td svg, td img')).toBeNull();
    expect(source()).toBe(original);expect(undoDepth(editor.state)).toBe(0);
    editor.destroy();view=undefined;document.body.replaceChildren();
  }
});
it('removes forged slot attributes and all authored styles, resource URLs, IDs and actions',async()=>{
  const original='| A |\n| - |\n| <span data-table-math="0" data-table-image="0" class="table-math" id="editor" style="display:none" onclick="bad()" title="authored">kept</span> <a href="https://example.com">link</a> <b>$real$</b> |\n\nEnd';
  create(original);await vi.waitFor(()=>expect(document.querySelector('td b svg')).not.toBeNull());
  const cell=document.querySelector('td')!;
  expect(cell.querySelector('[title=authored]')!.textContent).toBe('kept');
  expect(cell.querySelector('[title=authored]')!.hasAttribute('style')).toBe(false);
  expect(cell.querySelectorAll('[data-table-math]')).toHaveLength(1);expect(cell.querySelector('[data-table-image], [id], [onclick], a, [href], [src]')).toBeNull();
});
it('keeps raw-text, forged custom nodes, foreign HTML and escaped fragment boundaries as cell source',async()=>{
  for(const html of ['<script>$hidden$</script>','<style>body{display:none}</style>','<textarea>$hidden$</textarea>',
    '<projectionSlot key="0">forged</projectionSlot>','<img src="https://example.com/pixel">','<table><tr><td>moved</td></tr></table>','</span><kbd>moved</kbd>']) {
    const original=`| A |\n| - |\n| Before ${html} $also$ after. |\n\nEnd`;const {source}=create(original);
    await vi.waitFor(()=>expect(document.querySelector('td[data-html-ready=error]')).not.toBeNull());
    expect(document.querySelector('td')!.textContent).toBe(` Before ${html} $also$ after. `);
    expect(document.querySelector('td svg, td img, td style, td script, td textarea, td table')).toBeNull();expect(invoke).not.toHaveBeenCalled();expect(source()).toBe(original);
    view!.destroy();view=undefined;document.body.replaceChildren();
  }
});
it('edits HTML as raw cell source and restores exact BOM and mixed endings through outer Undo and Redo',async()=>{
  const original='\uFEFF| A |\r\n| - |\r\n| <kbd>Start</kbd> |\r\n\rEnd\n';const {editor,source,table}=create(original);
  await vi.waitFor(()=>expect(document.querySelector('td kbd')).not.toBeNull());table().begin(1,0);
  const child=table().child!,text='<kbd>日本語😀</kbd>';
  child.dispatch({changes:{from:0,to:child.state.doc.length,insert:text},userEvent:'input.type'});
  const edited=source();expect(edited).toBe(original.replace('<kbd>Start</kbd>',text));expect(undoDepth(editor.state)).toBe(1);
  child.contentDOM.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await vi.waitFor(()=>expect(document.querySelector('td kbd')!.textContent).toBe('日本語😀'));
  expect(undo(editor)).toBe(true);expect(source()).toBe(original);expect(redo(editor)).toBe(true);expect(source()).toBe(edited);
});
it('cancels deferred parsing before module work or resource mounting',async()=>{
  const projection=tableProjection('| A |\n| - |\n| <b>$x$</b> |',{},''),cell={...projection.htmlCells.get('1:0')!,source:' <b>$x$</b> '};
  const dom=document.createElement('td');document.body.append(dom);const render=vi.fn(async()=>inlineHTML(cell.tree,cell.controlled)),resources=vi.fn(()=>[]),measure=vi.fn();
  const cancel=cellHTML.mountCellHTML(dom,cell,resources,measure,render);cancel();await Promise.resolve();
  expect(render).not.toHaveBeenCalled();expect(resources).not.toHaveBeenCalled();expect(measure).not.toHaveBeenCalled();expect(dom.textContent).toBe(cell.source);
});
it('discards delayed parsing success and failure after editing, source changes, mode, removal, tab and image context changes',async()=>{
  const mount=cellHTML.mountCellHTML;
  for(const action of ['cell','change','source','delete','tab','path','undo'] as const)for(const fail of [false,true]){
    const requests:{resolve:()=>void;reject:(reason:Error)=>void}[]=[];
    vi.spyOn(cellHTML,'mountCellHTML').mockImplementation((dom,cell,resources,measure)=>mount(dom,cell,resources,measure,
      ()=>new Promise((resolve,reject)=>requests.push({resolve:()=>resolve(inlineHTML(cell.tree,cell.controlled)),reject}))));
    const {editor,display,table}=create('| A |\n| - |\n| <b>$x$ ![image](image.png)</b> |\n\nEnd');
    await vi.waitFor(()=>expect(requests).toHaveLength(1));const old=document.querySelector('td')!;
    if(action==='cell')table().begin(1,0);
    if(action==='change')editor.dispatch({changes:{from:editor.state.doc.length,insert:' more'}});
    if(action==='source')editor.dispatch({effects:display.reconfigure([])});
    if(action==='delete')editor.dispatch({changes:{from:0,to:editor.state.doc.length,insert:'Removed'}});
    if(action==='tab')editor.setState(state('New tab',new Compartment()));
    if(action==='path')editor.dispatch({effects:setImagePath.of('/other/writing.md')});
    if(action==='undo'){const at=editor.state.doc.toString().indexOf('$x$');editor.dispatch({changes:{from:at,to:at+3,insert:'$y$'}});undo(editor);}
    if(fail)requests[0].reject(new Error('late'));else requests[0].resolve();
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(old.querySelector('svg, img')).toBeNull();expect(invoke).not.toHaveBeenCalled();
    if(action==='cell'){expect(table().child).toBeDefined();expect(table().child!.state.doc.toString()).toContain('<b>');expect(old.querySelector('.cm-editor')).not.toBeNull();}
    editor.destroy();view=undefined;document.body.replaceChildren();vi.restoreAllMocks();
  }
});
it('refreshes inactive HTML cells while retaining an active child and composition',async()=>{
  const {editor,table}=create('| A | B |\n| - | - |\n| <b>$x$</b> | words |\n\nEnd');
  await vi.waitFor(()=>expect(document.querySelector('td b svg')).not.toBeNull());table().begin(1,1);const child=table().child!;
  Object.defineProperty(child,'compositionStarted',{configurable:true,value:true});
  const at=editor.state.doc.toString().indexOf('$x$');editor.dispatch({changes:{from:at,to:at+3,insert:'$y^2$'}});
  await vi.waitFor(()=>expect(document.querySelector('td b .table-math')?.getAttribute('aria-label')).toBe('Formula: y^2'));
  expect(table().child).toBe(child);expect(child.compositionStarted).toBe(true);expect(child.state.doc.toString()).toBe('words');
});
