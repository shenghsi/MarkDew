import { expect, it } from 'vitest';
import { markdownLanguage } from '@codemirror/lang-markdown';
import { TreeFragment, type Input, type PartialParse } from '@lezer/common';
import { MarkdownParser } from '@lezer/markdown';
import { guardedNesting, type GuardCounts } from './experiments/nested-parsing/guarded';

it.skipIf(process.env.MARKDEW_GUARD_COST!=='1')('measures first structural scan and cached guard cost outside base and nested parsing',()=>{
  const base=markdownLanguage.parser as MarkdownParser;
  const block='# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  for(const bytes of [100*1024,1024*1024])for(const resource of ['none','code-start','code-end','html-start','html-end']){
    const item=resource.startsWith('code')?'```js\nconst resourceWords = 1;\n```\n\n':'Text <b>resourceWords</b>.\n\n';
    let source=block.repeat(Math.ceil(bytes/block.length)).slice(0,bytes);
    if(resource!=='none')source=resource.endsWith('start')?item+source:source+'\n\n'+item;
    let tree=base.parse(source),at=source.indexOf('Paragraph',source.length/2)+3;
    const record:GuardCounts={visited:0,reused:0,skipped:0,nested:0};
    let nestedCalls=0;
    const guard=guardedNesting(base,inner=>{nestedCalls++;return inner;},record);
    function measured(){
      const input:Input={length:source.length,lineChunks:false,chunk:from=>source.slice(from),read:(from,to)=>source.slice(from,to)};
      const replay:PartialParse={advance:()=>tree,parsedPos:source.length,stoppedAt:null,stopAt(){}};
      const before={...record},start=performance.now();
      const result=guard(replay,input,[],[{from:0,to:source.length}]).advance();
      const ms=performance.now()-start;
      expect(result).toBe(tree);
      return {ms,visited:record.visited-before.visited,reused:record.reused-before.reused};
    }
    const first=measured(),cached=[];
    for(let sample=0;sample<20;sample++){
      const next=source.slice(0,at)+'Z'+source.slice(at);
      const fragments=TreeFragment.applyChanges(TreeFragment.addTree(tree),[{fromA:at,toA:at,fromB:at,toB:at+1}]);
      // Base parsing stays outside the guard clock and publishes the next tree.
      tree=base.parse(next,fragments);source=next;at++;
      cached.push(measured());
    }
    expect(nestedCalls).toBe(resource==='none'?0:21);
    const sorted=cached.map(sample=>sample.ms).sort((a,b)=>a-b);
    console.log(JSON.stringify({benchmark:'structural-nesting-guard',date:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,
      bytes,resource,samples:20,units:'ms',scope:'completed-tree guard decision with counters and clock overhead; excludes base parsing and upstream nested work',
      first,cachedMedian:(sorted[9]+sorted[10])/2,cachedP95:sorted[18],cached,nestedCalls}));
  }
},120000);
