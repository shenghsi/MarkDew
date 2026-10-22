// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, LanguageSupport, language as languageFacet, syntaxTree } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { documentLanguage } from '../../src/web/document-language';
import { collectPreview, previewDecorations } from '../../src/web/preview';
import { fromSource, sourceExtensions, savedSource, sourceField } from '../../src/web/source';

// Experiment only. Direct Markdown has no opening-metadata support.
it.skipIf(process.env.MARKDEW_WRAPPER_CHECK!=='1')('compares metadata-free package trees and complete decorations',()=>{
  const fixtures=[
    '# Heading\n\nParagraph **strong** and `code`.\n\n---\n\nNext.\n',
    'Heading\n---\n\n| A | B |\n| --- | --- |\n| one | two |\n',
    'Text\n\n```javascript\nconst n = 1;\n```\n\n```mermaid\ngraph TD; A-->B\n```\n',
    'Text $x^2$.\n\n$$\nx+y\n$$\n\nReference[^n].\n\n[^n]: A note.\n',
    'Text\n\n> Quote **bold**\n\n- Item\n- [ ] Task\n\n<div>HTML</div>\n',
  ];
  // Exact grammar used by the growth clock, with and without a note.
  const block='# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  for(const bytes of [100*1024,1024*1024])for(const note of [false,true]){
    const prefix=note?'Reference[^n].\n\n':'',suffix=note?'\n\n[^n]: A note.\n':'';
    fixtures.push(prefix+block.repeat(Math.ceil(bytes/block.length)).slice(0,bytes-prefix.length-suffix.length)+suffix);
  }
  for(const source of fixtures){
    const configured=markdown({base:markdownLanguage,codeLanguages:languages,addKeymap:false});
    const states=[documentLanguage(),configured,new LanguageSupport(markdownLanguage,configured.support)].map(language=>{
      let state=EditorState.create({doc:source,selection:{anchor:source.length},extensions:[sourceExtensions(fromSource(source)),language]});
      expect(state.facet(languageFacet)).toBe(language.language);
      expect(ensureSyntaxTree(state,state.doc.length,10000)).not.toBeNull();
      state=state.update({}).state;
      expect(savedSource(state.field(sourceField))).toBe(source);
      return state;
    });
    const bodies=states.map(state=>{
      let node=syntaxTree(state).resolveInner(0,1);
      while(node.parent&&node.name!=='Document')node=node.parent;
      expect(node.name).toBe('Document');expect(node.from).toBe(0);expect(node.to).toBe(source.length);
      return node.toString();
    });
    expect(bodies[0]).toBe(bodies[1]);expect(bodies[0]).toBe(bodies[2]);
    for(const candidate of states.slice(1)){
      const [actual,reference]=[states[0],candidate].map(state=>previewDecorations(state,collectPreview(state,syntaxTree(state))).iter());
      let equal=true;
      while(actual.value&&reference.value){
        equal=equal&&actual.from===reference.from&&actual.to===reference.to&&actual.value.eq(reference.value);
        actual.next();reference.next();
      }
      expect(equal&&actual.value===null&&reference.value===null).toBe(true);
    }
  }
},120000);
