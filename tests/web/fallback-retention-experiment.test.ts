// @vitest-environment jsdom
import {afterEach,expect,it} from 'vitest';
import {EditorState,RangeSet} from '@codemirror/state';
import {ensureSyntaxTree,syntaxTree,Language,LanguageSupport} from '@codemirror/language';
import {Parser,TreeFragment} from '@lezer/common';
import {completeDocument} from '../../src/web/preview-index';
import {fromSource,savedSource,sourceExtensions,sourceField} from '../../src/web/source';
import {retainedLivePreview,retainedPreviewField,collectPreview,previewDecorations} from '../performance/experiments/point-comparison/static-preview';
import {mountedDocumentLanguage} from '../performance/experiments/point-comparison/mounted-document-language';
import {enableLocalCoverage} from '../performance/experiments/point-comparison/fallback-observer';

afterEach(()=>enableLocalCoverage(false));
const source='# Heading\n\nParagraph words[^a].\n\n'+'# Heading\n\nParagraph **words** and `code`.\n\n'.repeat(1000)+'[^a]: Note\n';
function create(control:{cutoff:number|null;initial?:boolean}){
  const support=mountedDocumentLanguage(),native=support.language.parser,prefix=source.slice(0,100);
  const parser=new class extends Parser{createParse(input:Parameters<Parser['createParse']>[0],fragments:Parameters<Parser['createParse']>[1],ranges:Parameters<Parser['createParse']>[2]){
    const stopped=control.cutoff!==null&&(control.initial||input.read(0,100)!==prefix);
    const retained=stopped?fragments.filter(f=>f.from<control.cutoff!).map(f=>new TreeFragment(f.from,Math.min(f.to,control.cutoff!),f.tree,f.offset,f.openStart,true)):fragments;
    const parse=native.startParse(input,retained,ranges);if(stopped)parse.stopAt(control.cutoff!);return parse;
  }};
  return EditorState.create({doc:source,selection:{anchor:source.indexOf('words')+2},extensions:[
    sourceExtensions(fromSource(source)),new LanguageSupport(new Language(support.language.data,parser),support.support),retainedLivePreview]});
}
function settle(state:EditorState){expect(ensureSyntaxTree(state,state.doc.length,10000)).not.toBeNull();return state.update({}).state;}

it('maps only the last complete certificate through repeated partial fallbacks and rebuilds on completion',()=>{
  const control={cutoff:null as number|null};let state=settle(create(control));enableLocalCoverage(true);
  const original=state;let mapped=state.field(retainedPreviewField).decorations;const certifiedLength=state.doc.length;
  expect(state.field(retainedPreviewField).certificate?.length).toBe(certifiedLength);
  control.cutoff=1024;
  for(const [i,insert] of ['\n\n','$x$','Q'].entries()){
    const at=state.selection.main.head,tr=state.update({changes:{from:at,insert},selection:{anchor:at+insert.length}});
    mapped=mapped.map(tr.changes);state=tr.state;
    expect(completeDocument(state)).toBeUndefined();const plan=state.field(retainedPreviewField);
    expect(plan).toMatchObject({mode:'full',retained:true,retentionStarts:1,retentionEnds:0,certificate:{length:certifiedLength,mappedEdits:i+1}});
    expect(plan.index).toBeUndefined();expect(RangeSet.eq([plan.decorations],[mapped])).toBe(true);
    expect(savedSource(state.field(sourceField))).toBe(state.doc.toString());
  }
  expect(savedSource(original.field(sourceField))).toBe(source);
  control.cutoff=null;state=settle(state);expect(completeDocument(state)).toBeDefined();
  const plan=state.field(retainedPreviewField);expect(plan).toMatchObject({retained:false,retentionStarts:1,retentionEnds:1,certificate:{length:state.doc.length,mappedEdits:0}});
  const oracle=settle(EditorState.create({doc:state.doc,selection:state.selection,extensions:[mountedDocumentLanguage(),retainedLivePreview]}));
  const fresh=previewDecorations(oracle,collectPreview(oracle,syntaxTree(oracle)));
  expect(RangeSet.eq([plan.decorations],[fresh])).toBe(true);
});

it('does not create a certificate from an initial incomplete body',()=>{
  let state=create({cutoff:1024,initial:true});ensureSyntaxTree(state,1024,1000);state=state.update({}).state;
  expect(completeDocument(state)).toBeUndefined();expect(state.field(retainedPreviewField).certificate).toBeUndefined();
  state=state.update({changes:{from:state.selection.main.head,insert:'\n\n'}}).state;
  expect(state.field(retainedPreviewField).certificate).toBeUndefined();expect(state.field(retainedPreviewField).retained).toBe(false);
});

it('does not start retention on a non-edit transaction after an accepted partial indexed edit',()=>{
  const control={cutoff:null as number|null};let state=settle(create(control));enableLocalCoverage(true);control.cutoff=1024;
  const at=state.selection.main.head;state=state.update({changes:{from:at,insert:'Z'},selection:{anchor:at+1}}).state;
  expect(completeDocument(state)).toBeUndefined();expect(state.field(retainedPreviewField).mode).toBe('indexed');
  state=state.update({selection:{anchor:0}}).state;
  const plan=state.field(retainedPreviewField);expect(plan.retained).toBe(false);expect(plan.retentionStarts).toBe(0);
  expect(plan.certificate).toMatchObject({length:source.length,mappedEdits:1});
});
