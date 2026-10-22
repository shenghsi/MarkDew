import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyStartupAssets} from '../../src/web/startup-assets.mjs';
const chunk=(fileName,modules,imports=[],dynamicImports=[],isEntry=false)=>({type:'chunk',fileName,modules:Object.fromEntries(modules.map(path=>[path,{}])),imports,dynamicImports,isEntry,code:'code'});
const fixture=()=>({entry:chunk('entry.js',['/repo/src/web/main.ts'],['shared.js'],['print.js'],true),
  shared:chunk('shared.js',['/repo/node_modules/mdast-util-from-markdown/index.js']),
  print:chunk('print.js',['/repo/src/web/print-view.ts','/repo/src/web/inline-html.ts','/repo/src/web/png-export.ts','/repo/node_modules/hast-util-raw/index.js'])});
test('startup check walks emitted static dependencies and permits shared Markdown code',()=>{
  assert.deepEqual(verifyStartupAssets(fixture()),{staticChunks:2,staticBytes:8});
  const bundle=fixture();bundle.shared.imports=['print.js'];assert.throws(()=>verifyStartupAssets(bundle),/Deferred dependency enters startup/);
});
test('startup check rejects eager print packages even when output names do not identify them',()=>{
  for(const module of ['/repo/node_modules/html-to-image/index.js','C:\\repo\\node_modules\\hast-util-raw\\index.js']) {
    const bundle=fixture();bundle.shared.modules[module]={};assert.throws(()=>verifyStartupAssets(bundle),/Deferred dependency enters startup/);
  }
});
test('startup check requires reachable print tools and complete emitted edges',()=>{
  const absent=fixture();absent.entry.dynamicImports=[];assert.throws(()=>verifyStartupAssets(absent),/Missing deferred module/);
  const missing=fixture();missing.entry.imports=['missing.js'];assert.throws(()=>verifyStartupAssets(missing),/Missing emitted dependency/);
});
