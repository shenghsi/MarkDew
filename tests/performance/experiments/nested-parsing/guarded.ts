import { Language, LanguageDescription, LanguageSupport, ParseContext } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { html } from '@codemirror/lang-html';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { languages } from '@codemirror/language-data';
import { Tree, TreeBuffer, type ParseWrapper, type PartialParse } from '@lezer/common';
import { MarkdownParser, parseCode, type MarkdownConfig } from '@lezer/markdown';

// Inactive candidate. Grammar and nested parsing remain upstream package code.
export interface GuardCounts { visited:number; reused:number; skipped:number; nested:number }
export function guardedNesting(parser:MarkdownParser, upstream:ParseWrapper, counts?:GuardCounts):ParseWrapper {
  const targets=new Set(parser.nodeSet.types.filter(type=>
    ['CodeBlock','FencedCode','HTMLBlock','HTMLTag','CommentBlock'].includes(type.name)).map(type=>type.id));
  const cache=new WeakMap<Tree|TreeBuffer,boolean>();
  function needsNesting(tree:Tree|TreeBuffer):boolean {
    const known=cache.get(tree);
    if(known!==undefined){if(counts)counts.reused++;return known;}
    if(counts)counts.visited++;
    let required=false;
    if(tree instanceof Tree){required=targets.has(tree.type.id)||tree.children.some(needsNesting);}
    else{
      // Public TreeBuffer format: type, from, to, end-index for each node.
      for(let index=0;index<tree.buffer.length;index+=4){
        if(targets.has(tree.buffer[index])){required=true;break;}
      }
    }
    cache.set(tree,required);return required;
  }
  return (inner,input,fragments,ranges)=>{
    let result:Tree|null=null,nested:PartialParse|null=null;
    function startNested():PartialParse {
      const replay:PartialParse={advance:()=>result!,get parsedPos(){return inner.parsedPos;},
        get stoppedAt(){return inner.stoppedAt;},stopAt:pos=>inner.stopAt(pos)};
      const parse=upstream(replay,input,fragments,ranges);
      if(inner.stoppedAt!==null)parse.stopAt(inner.stoppedAt);
      if(counts)counts.nested++;
      return parse;
    }
    return {
      advance(){
        if(nested)return nested.advance();
        if(result)return result;
        result=inner.advance();if(!result)return null;
        if(inner.stoppedAt===null&&ranges.length===1&&ranges[0].from===0&&ranges[0].to===input.length
          &&result.length===input.length&&inner.parsedPos>=input.length&&!needsNesting(result)){
          if(counts)counts.skipped++;
          return result;
        }
        nested=startNested();return nested.advance();
      },
      get parsedPos(){return nested?nested.parsedPos:result?input.length:0;},
      get stoppedAt(){return nested?nested.stoppedAt:inner.stoppedAt;},
      stopAt(pos){
        if(nested){nested.stopAt(pos);return;}
        inner.stopAt(pos);
        if(result)nested=startNested();
      },
    };
  };
}

export function guardedMarkdown(counts?:GuardCounts):LanguageSupport {
  const configured=markdown({base:markdownLanguage,codeLanguages:languages,addKeymap:false});
  const codeParser=(info:string)=>{
    if(!info)return null;
    const found=LanguageDescription.matchLanguageName(languages,/\S*/.exec(info)![0],true);
    return found?found.support?found.support.language.parser:ParseContext.getSkippingParser(found.load()):null;
  };
  const nested=(parseCode({codeParser,htmlParser:html({matchClosingTags:false}).language.parser}) as MarkdownConfig).wrap;
  if(!nested)throw new Error('Upstream parseCode has no wrapper');
  const base=markdownLanguage.parser as MarkdownParser;
  const parser=base.configure({wrap:guardedNesting(base,nested,counts)});
  return new LanguageSupport(new Language(configured.language.data,parser,[],'markdown'),configured.support);
}
export function guardedDocumentLanguage(counts?:GuardCounts):LanguageSupport {
  return yamlFrontmatter({content:guardedMarkdown(counts)});
}
