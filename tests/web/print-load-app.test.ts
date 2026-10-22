// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { undoDepth } from '@codemirror/commands';
import type { PrintSnapshot } from '../../src/web/print-view';
vi.mock('@tauri-apps/api/core', () => ({invoke:vi.fn(),isTauri:()=>false}));
vi.mock('@tauri-apps/plugin-dialog', () => ({open:vi.fn(),save:vi.fn(),ask:vi.fn()}));
Object.defineProperty(Range.prototype,'getClientRects',{configurable:true,value:()=>[]});
Object.defineProperty(Range.prototype,'getBoundingClientRect',{configurable:true,value:()=>new DOMRect()});
let app:typeof import('../../src/web/main')|undefined;
let finish:()=>void = ()=>{};
afterEach(async()=>{
  finish(); await new Promise(resolve=>setTimeout(resolve,0));
  window.dispatchEvent(new Event('pagehide')); app?.view.destroy(); app=undefined;
  vi.doUnmock('../../src/web/print-view');vi.restoreAllMocks();document.body.replaceChildren();
});
async function boot() {
  vi.resetModules(); const show=vi.fn(async (_snapshot:PrintSnapshot)=>{}), loading=vi.fn();
  let release!:(module:{showPrintView:typeof show})=>void, reject!:(error:Error)=>void;
  const module=new Promise<{showPrintView:typeof show}>((resolve,fail)=>{release=resolve;reject=fail;});
  finish=()=>release({showPrintView:show});
  vi.doMock('../../src/web/print-view',()=>{loading();return module;});
  document.body.innerHTML='<div id="app"></div>';app=await import('../../src/web/main');
  app.view.dispatch({changes:{from:0,insert:'Writing 日本語😀\n'},selection:{anchor:3},userEvent:'input.type'});
  const sourceModule=await import('../../src/web/source');
  const source=()=>sourceModule.savedSource(app!.view.state.field(sourceModule.sourceField));
  return {show,loading,release:finish,reject,source};
}
const print=()=>document.querySelector<HTMLButtonElement>('#print')!.click();
it('defers print loading, captures the requested state, and blocks duplicate requests while typing continues',async()=>{
  const {show,loading,release,source}=await boot();expect(loading).not.toHaveBeenCalled();
  const captured=app!.view.state,depth=undoDepth(captured),before=source(),tab=app!.tabs.active;
  print();await vi.waitFor(()=>expect(loading).toHaveBeenCalledTimes(1));print();
  document.querySelector<HTMLButtonElement>('#new')!.click();expect(app!.tabs.all).toHaveLength(1);
  app!.view.dispatch({changes:{from:app!.view.state.doc.length,insert:'Later edit'},userEvent:'input.type'});
  const later=source();release();await vi.waitFor(()=>expect(show).toHaveBeenCalledTimes(1));
  expect(show.mock.calls[0][0]).toMatchObject({state:captured,id:tab.id,path:tab.path,title:'Untitled'});
  const sourceModule=await import('../../src/web/source');
  expect(sourceModule.savedSource(show.mock.calls[0][0].state.field(sourceModule.sourceField))).toBe(before);
  expect(undoDepth(captured)).toBe(depth);expect(source()).toBe(later);
});
it('rejects presentation if composition starts during loading without dispatching or stealing focus',async()=>{
  const {show,loading,release,source}=await boot();print();await vi.waitFor(()=>expect(loading).toHaveBeenCalled());
  app!.view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
  const before=source(),state=app!.view.state,dispatch=vi.spyOn(app!.view,'dispatch'),focus=vi.spyOn(app!.view,'focus');
  release();await vi.waitFor(()=>expect(document.querySelector('#status')!.textContent).toContain('Finish text input'));
  expect(show).not.toHaveBeenCalled();expect(dispatch).not.toHaveBeenCalled();expect(focus).not.toHaveBeenCalled();
  expect(app!.view.state).toBe(state);expect(source()).toBe(before);
  app!.view.contentDOM.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
  print();await vi.waitFor(()=>expect(show).toHaveBeenCalledTimes(1));
});
it.each(['resolve','reject'])('cancels late %s and UI work after page disposal',async(outcome)=>{
  const {show,loading,release,reject}=await boot();print();await vi.waitFor(()=>expect(loading).toHaveBeenCalled());
  window.dispatchEvent(new Event('pagehide'));const status=document.querySelector('#status')!.textContent;
  const dispatch=vi.spyOn(app!.view,'dispatch'),focus=vi.spyOn(app!.view,'focus');
  if(outcome==='resolve')release();else reject(new Error('Late print failure'));
  await new Promise(resolve=>setTimeout(resolve,0));
  expect(show).not.toHaveBeenCalled();expect(dispatch).not.toHaveBeenCalled();expect(focus).not.toHaveBeenCalled();
  expect(document.querySelector('#status')!.textContent).toBe(status);
  print();expect(show).not.toHaveBeenCalled();
});
it('releases the request after a load failure so a later successful load can open Print',async()=>{
  const {loading,reject,source}=await boot();const before=source();print();await vi.waitFor(()=>expect(loading).toHaveBeenCalled());
  reject(new Error('Print tools unavailable'));await vi.waitFor(()=>expect(document.querySelector('#status')!.textContent).toContain('Cannot load print tools:'));
  const show=vi.fn(async()=>{});vi.doMock('../../src/web/print-view',()=>({showPrintView:show}));
  print();await vi.waitFor(()=>expect(show).toHaveBeenCalledTimes(1));expect(source()).toBe(before);
});
