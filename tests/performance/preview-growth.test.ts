// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { ensureSyntaxTree, LanguageSupport, syntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, livePreview, previewDecorations, previewField } from '../../src/web/preview';
import { fromSource, sourceExtensions, savedSource, sourceField } from '../../src/web/source';
import { guardedDocumentLanguage } from './experiments/nested-parsing/guarded';
import { notePreview, notePreviewField } from './experiments/note-index/preview';
import { collectPreview as baselineCollect, previewDecorations as baselineDecorations, livePreview as baselinePreview, previewField as baselineField } from './experiments/note-production/baseline';

const samples=20;
const noteIndex = process.env.MARKDEW_NOTE_INDEX === '1';
const baselinePreviewEnabled = process.env.MARKDEW_PREVIEW_BASELINE === '1';
if (noteIndex && baselinePreviewEnabled) throw new Error('Select one preview experiment');
// Inactive comparison: change only the YAML wrapper, never the app language.
const directMarkdown=process.env.MARKDEW_DIRECT_MARKDOWN==='1';
// Diagnostic only: omits nested code/HTML parsing, and cannot replace the app language.
const baseMarkdown=process.env.MARKDEW_BASE_MARKDOWN==='1';
const guardedMarkdown=process.env.MARKDEW_GUARDED_NESTING==='1';
const resource=process.env.MARKDEW_GROWTH_RESOURCE;
if(resource&&!['code','html'].includes(resource))throw new Error('Unknown growth resource fixture');
function stats(values:number[]) {const sorted=[...values].sort((a,b)=>a-b);return {median:+((sorted[9]+sorted[10])/2).toFixed(3),p95:+sorted[18].toFixed(3),min:+sorted[0].toFixed(3),max:+sorted[19].toFixed(3)};}
it.skipIf(process.env.MARKDEW_GROWTH_BENCH!=='1')('measures growing word edits with exact source and complete decoration checks',async()=>{
  const block='# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  if(resource==='code')await languages.find(language=>language.name==='JavaScript')!.load();
  const resourceText=resource==='code'
    ?'```javascript extra\nconst resourceWords = 1;\n```\n\n```unknown\nunknownWords\n```\n\n    indentedWords\n\n> ```js\n> const quotedWords = 2;\n> ```\n\n- item\n\n  ```js\n  const listedWords = 3;\n  ```\n\n'
    :'Text <b>resourceWords</b>.\n\n<!-- commentWords -->\n\n<div>blockWords</div>\n\n> Quote <i>quotedWords</i>.\n\n- Item <em>listedWords</em>.\n\n';
  for(const bytes of [100*1024,1024*1024]) for(const note of [false,true]) {
    const prefix=note?'Reference[^n].\n\n':'',suffix=note?'\n\n[^n]: A note.\n':'';
    let original=prefix+block.repeat(Math.ceil(bytes/block.length)).slice(0,bytes-prefix.length-suffix.length)+suffix;
    if(resource){
      const positions=[original.indexOf('# Heading'),original.indexOf('# Heading',bytes/2),original.lastIndexOf('# Heading')];
      for(const pos of positions.reverse())original=original.slice(0,pos)+resourceText+original.slice(pos);
    }
    const configured=directMarkdown||baseMarkdown?markdown({base:markdownLanguage,codeLanguages:languages,addKeymap:false}):null;
    const language=guardedMarkdown?guardedDocumentLanguage():baseMarkdown?new LanguageSupport(markdownLanguage,configured!.support):configured??documentLanguage();
    let initial=EditorState.create({doc:original,selection:{anchor:original.length},extensions:[sourceExtensions(fromSource(original)),history(),language,noteIndex?notePreview:baselinePreviewEnabled?baselinePreview:livePreview]});
    expect(ensureSyntaxTree(initial,initial.doc.length,10000)).not.toBeNull();initial=initial.update({}).state;
    const locations=resource?['start','middle','end','resource-start','resource-end']:['start','middle','end'];
    for(const location of locations) {
      let state=initial,expectedSource=original;
      let at=(location.startsWith('resource-')
        ?location==='resource-start'?original.indexOf('resourceWords'):original.lastIndexOf('resourceWords')
        :location==='end'?original.lastIndexOf('Paragraph'):original.indexOf('Paragraph',location==='middle'?bytes/2:0))+3;
      const timings:number[]=[];
      const publishedLengths:number[]=[],bodyBoundaries:number[]=[],codeCoverage:boolean[]=[];
      const localVisits:number[]=[],localRanges:number[]=[];
      let indexed=0,full=0;
      for(let sample=0;sample<samples;sample++) {
        const insert=sample%2?'中':'Z',start=performance.now();
        state=state.update({changes:{from:at,insert},selection:{anchor:at+insert.length},userEvent:'input.type'}).state;
        const dirty=savedSource(state.field(sourceField))!==original;timings.push(performance.now()-start);
        const plan=noteIndex?state.field(notePreviewField):baselinePreviewEnabled?state.field(baselineField):state.field(previewField);
        if(plan.mode==='indexed')indexed++;else full++;
        const counts='localCounts' in plan?plan.localCounts:undefined;
        localVisits.push(counts?.visitedBlocks??0);localRanges.push(counts?.rebuiltRanges??0);
        expectedSource=expectedSource.slice(0,at)+insert+expectedSource.slice(at);at+=insert.length;
        const published=syntaxTree(state);
        publishedLengths.push(published.length);bodyBoundaries.push(published.topNode.getChild('Frontmatter')?.to||0);
        codeCoverage.push(published.resolve(at,1).name==='CodeText');
        expect(dirty).toBe(true);expect(savedSource(state.field(sourceField))).toBe(expectedSource);
        // Widget comparison requires one constructor. Each version uses its own
        // complete collector as the reference, outside the measured transaction.
        const actual=plan.decorations.iter(),reference=(baselinePreviewEnabled
          ?baselineDecorations(state,baselineCollect(state,syntaxTree(state)))
          :previewDecorations(state,collectPreview(state,syntaxTree(state)))).iter();
        let equal=true;
        while(actual.value&&reference.value){equal=equal&&actual.from===reference.from&&actual.to===reference.to&&actual.value.eq(reference.value);actual.next();reference.next();}
        expect(equal&&actual.value===null&&reference.value===null).toBe(true);
        await new Promise(resolve=>setTimeout(resolve,0));
      }
      console.log(JSON.stringify({benchmark:'growing-preview-state',date:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,
        language:guardedMarkdown?'guarded-nesting-yaml-wrapper':baseMarkdown?'base-markdown-no-nesting':directMarkdown?'direct-markdown':'yaml-wrapper',preview:noteIndex?'note-index-experiment':baselinePreviewEnabled?'baseline-a8d193f':'production',bytes,initialUnits:original.length,resource:resource??'none',resourcePositions:resource?['start','middle','end']:[],note,location,samples,units:'ms',scope:'growing word edit state transaction and dirty comparison; excludes outline, oracle, DOM, native input and screen frame',
        indexed,full,publishedLengths,bodyBoundaries,codeCoverage,localVisits,localRanges,...stats(timings),timings:timings.map(value=>+value.toFixed(3))}));
    }
  }
},180000);
