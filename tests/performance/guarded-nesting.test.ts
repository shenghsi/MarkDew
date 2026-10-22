// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, getIndentation, syntaxTree } from '@codemirror/language';
import { CompletionContext, type CompletionSource } from '@codemirror/autocomplete';
import { languages } from '@codemirror/language-data';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { Tree, TreeBuffer, TreeFragment, type PartialParse, type ParseWrapper } from '@lezer/common';
import { MarkdownParser } from '@lezer/markdown';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, previewDecorations } from '../../src/web/preview';
import { fromSource, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { guardedDocumentLanguage, guardedMarkdown, guardedNesting, type GuardCounts } from './experiments/nested-parsing/guarded';

const experiment=process.env.MARKDEW_GUARD_CHECK==='1';
const counts=():GuardCounts=>({visited:0,reused:0,skipped:0,nested:0});
function settle(state:EditorState){
  expect(ensureSyntaxTree(state,state.doc.length,10000)).not.toBeNull();
  return state.update({}).state;
}
function compare(states:EditorState[]){
  expect(savedSource(states[0].field(sourceField))).toBe(savedSource(states[1].field(sourceField)));
  expect(syntaxTree(states[0]).toString()).toBe(syntaxTree(states[1]).toString());
  for(let pos=0;pos<=states[0].doc.length;pos++){
    const paths=states.map(state=>{
      let node=syntaxTree(state).resolveInner(pos,1);const path:string[]=[];
      while(node){path.push(`${node.name}:${node.from}:${node.to}`);if(!node.parent)break;node=node.parent;}
      return path;
    });
    expect(paths[0]).toEqual(paths[1]);
    expect(states[0].languageDataAt('commentTokens',pos)).toEqual(states[1].languageDataAt('commentTokens',pos));
  }
  const [actual,reference]=states.map(state=>previewDecorations(state,collectPreview(state,syntaxTree(state))).iter());
  let equal=true;
  while(actual.value&&reference.value){equal=equal&&actual.from===reference.from&&actual.to===reference.to&&actual.value.eq(reference.value);actual.next();reference.next();}
  expect(equal&&actual.value===null&&reference.value===null).toBe(true);
}

it.skipIf(!experiment)('retains nested trees and language data across first-resource transitions',async()=>{
  const js=languages.find(description=>description.name==='JavaScript')!;
  // Loading is outside the comparisons. Unknown languages retain ordinary code.
  await js.load();
  const candidate=guardedDocumentLanguage(),reference=documentLanguage();
  const fixtures=['```js extra\nconst n = 1;\n```\n','```unknown\nraw\n```\n','    indented\n',
    'Text <b>bold</b>.\n','<div>block</div>\n','<!-- comment -->\n','> ```js\n> const n = 1;\n> ```\n',
    '---\ntitle: example\n---\n\nBody <i>text</i>.\n'];
  for(const resource of fixtures){
    const source='Plain **word** and `code`.\n\n';
    let states=[reference,candidate].map(language=>settle(EditorState.create({doc:source,extensions:[language,sourceExtensions(fromSource(source))]})));
    compare(states);
    states=states.map(state=>settle(state.update({changes:{from:0,insert:resource+'\n'}}).state));compare(states);
    states=states.map(state=>settle(state.update({changes:{from:0,to:resource.length+1}}).state));compare(states);
  }
},120000);

it.skipIf(!experiment)('loads an unopened code language through the package skipping parser',async()=>{
  const language=languages.find(description=>description.name==='Python')!;
  expect(language.support).toBeUndefined();
  const source='```python extra\nx = 1\n```\n';
  let states=[documentLanguage(),guardedDocumentLanguage()].map(support=>EditorState.create({doc:source,extensions:[support,sourceExtensions(fromSource(source))]}));
  // Parsing starts the load if the language is not already available.
  states=states.map(settle);await language.load();
  states=states.map(state=>settle(state.update({changes:{from:source.indexOf('x ='),insert:'y'}}).state));
  compare(states);
  for(const state of states)expect(state.languageDataAt('commentTokens',state.doc.toString().indexOf('yx ='))).toContainEqual({line:'#'});
});

it.skipIf(!experiment)('uses only structural weak-cache data and detects target nodes in buffers',()=>{
  const base=markdownLanguage.parser as MarkdownParser,record=counts();
  let calls=0;const upstream:ParseWrapper=(inner)=>{calls++;return inner;};
  const parser=base.configure({wrap:guardedNesting(base,upstream,record)});
  const source='Paragraph **word**.\n\n';const tree=parser.parse(source);
  expect(calls).toBe(0);expect(record.skipped).toBe(1);
  parser.parse(source,TreeFragment.addTree(tree));expect(record.reused).toBeGreaterThan(0);
  for(const name of ['CodeBlock','FencedCode','HTMLBlock','HTMLTag','CommentBlock']){
    const type=base.nodeSet.types.find(type=>type.name===name)!;
    const buffer=new TreeBuffer(new Uint16Array([type.id,0,1,4]),1,base.nodeSet);
    const root=new Tree(base.nodeSet.types.find(type=>type.name==='Document')!,[buffer],[0],1);
    const raw:PartialParse={advance:()=>root,parsedPos:1,stoppedAt:null,stopAt(){}};
    const input={length:1,lineChunks:false,chunk:()=>'<',read:()=>'<'};
    guardedNesting(base,upstream)(raw,input,[],[{from:0,to:1}]).advance();
  }
  expect(calls).toBe(5);
});

it.skipIf(!experiment)('retains upstream wrapper behavior for stops and partial ranges',()=>{
  const base=markdownLanguage.parser as MarkdownParser;let calls=0;
  const upstream:ParseWrapper=(inner)=>{calls++;return inner;};
  const guarded=base.configure({wrap:guardedNesting(base,upstream)});
  const source='Paragraph.\n\nSecond paragraph.\n';
  const stopped=guarded.startParse(source);stopped.stopAt(12);
  while(!stopped.advance()){}expect(calls).toBe(1);expect(stopped.stoppedAt).toBe(12);
  guarded.parse(source,[],[{from:12,to:source.length}]);expect(calls).toBe(2);
  const done=guarded.startParse(source);while(!done.advance()){}
  expect(calls).toBe(2);done.stopAt(12);expect(calls).toBe(3);
  expect(done.stoppedAt).toBe(12);expect(done.advance()).not.toBeNull();
});

it.skipIf(!experiment)('matches real package mounted trees after partial and completed stops',()=>{
  const parsers=[markdown({base:markdownLanguage,codeLanguages:languages,addKeymap:false}).language.parser,guardedMarkdown().language.parser];
  function signature(tree:Tree){
    const paths=[];
    for(let pos=0;pos<=tree.length;pos++){
      let node=tree.resolveInner(pos,1);const path=[];
      while(node){path.push(`${node.name}:${node.from}:${node.to}`);if(!node.parent)break;node=node.parent;}
      paths.push(path);
    }
    return {root:tree.toString(),paths};
  }
  for(const source of ['Plain **word**.\n\nText.\n','Text <b>bold</b>.\n\nNext.\n','```js\nconst n=1;\n```\n\nText.\n']){
    for(const late of [false,true]){
      const trees=parsers.map(parser=>{
        const parse=parser.startParse(source);
        if(late)parse.advance();
        parse.stopAt(8);let tree;while(!(tree=parse.advance())){}
        return tree;
      });
      expect(signature(trees[0])).toEqual(signature(trees[1]));
      const resumed=parsers.map((parser,index)=>parser.parse(source,TreeFragment.addTree(trees[index],[],true)));
      expect(signature(resumed[0])).toEqual(signature(resumed[1]));
    }
    const partial=parsers.map(parser=>parser.parse(source,[],[{from:2,to:source.length}]));
    expect(signature(partial[0])).toEqual(signature(partial[1]));
  }
});

it.skipIf(!experiment)('retains indentation and completion results and accepted completion edits',async()=>{
  await languages.find(language=>language.name==='JavaScript')!.load();
  for(const source of ['Text <di','<div>\n<span>\ntext\n</span>\n</div>\n','```js\nfunction sample() {\nconst value = 1;\nret\n}\n```\n','---\nkey: value\n---\n\nText <di']){
    const states=[documentLanguage(),guardedDocumentLanguage()].map(language=>settle(EditorState.create({doc:source,extensions:[language]})));
    for(let pos=0;pos<=source.length;pos++){
      expect(getIndentation(states[0],pos)).toBe(getIndentation(states[1],pos));
      for(const key of ['commentTokens','closeBrackets','indentOnInput','wordChars'])
        expect(states[0].languageDataAt(key,pos)).toEqual(states[1].languageDataAt(key,pos));
    }
    const pos=source.includes('ret\n')?source.indexOf('ret\n')+3:source.length;
    const results=await Promise.all(states.map(async state=>{
      const sources=state.languageDataAt<CompletionSource>('autocomplete',pos);
      return Promise.all(sources.map(source=>source(new CompletionContext(state,pos,true))));
    }));
    const plain=results.map(group=>group.map(result=>result?{from:result.from,to:result.to,options:result.options.map(option=>({label:option.label,type:option.type,detail:option.detail,apply:typeof option.apply==='string'?option.apply:typeof option.apply}))}:null));
    expect(plain[0]).toEqual(plain[1]);
    if(source.includes('<di')&&!source.includes('</div>')||source.includes('ret\n'))
      expect(results[0].some(result=>result&&result.options.length>0)).toBe(true);
    for(let index=0;index<results[0].length;index++){
      const left=results[0][index],right=results[1][index];if(!left||!right)continue;
      for(let option=0;option<left.options.length;option++){
        const completions=[left.options[option],right.options[option]];
        const edited=states.map((state,side)=>{
          const choice=completions[side],result=side?right:left;
          let next=state;
          if(typeof choice.apply==='function'){
            const view={state,dispatch:(transaction:Parameters<EditorState['update']>[0])=>{next=next.update(transaction).state;}};
            choice.apply(view as never,choice,result.from,result.to??pos);
          }else next=state.update({changes:{from:result.from,to:result.to??pos,insert:choice.apply??choice.label}}).state;
          return {text:next.doc.toString(),selection:next.selection.toJSON()};
        });
        expect(edited[0]).toEqual(edited[1]);
      }
    }
  }
});
