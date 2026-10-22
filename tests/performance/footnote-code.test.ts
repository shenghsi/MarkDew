// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes, freshFootnotes } from '../../src/web/footnotes';

it.skipIf(process.env.MARKDEW_FOOTNOTE_CODE !== '1')('isolates code-word footnote updates', () => {
  for (const units of [100 * 1024, 1024 * 1024]) {
    const block = '# Heading\n\nParagraph with ordinary words.\n\n';
    const source = '```unknown\nresourceWords\n```\n\nReference[^n].\n\n' + block.repeat(Math.ceil(units / block.length)).slice(0, units) + '\n\n[^n]: Note **text** $x$';
    let state = EditorState.create({ doc: source, extensions: [documentLanguage(), footnoteField] });
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
    state = state.update({}).state;
    const clocks: number[] = [], oracleClocks: number[] = [], coverage: boolean[] = [], complete: boolean[] = [];
    const boundaries: number[] = [];
    let at = source.indexOf('resourceWords') + 3, reused = 0;
    for (let sample = 0; sample < 20; sample++) {
      const old = footnotes(state), tree = syntaxTree(state), node = tree.resolve(at, 1);
      coverage.push(node.name === 'CodeText');
      complete.push(tree.length === state.doc.length);
      boundaries.push(tree.topNode.getChild('Frontmatter')?.to || 0);
      const start = performance.now();
      // Equal length proves model identity; this clock includes language parsing.
      state = state.update({ changes: { from: at, to: at + 1, insert: sample % 2 ? '中' : 'Z' } }).state;
      clocks.push(performance.now() - start);
      if (footnotes(state) === old) reused++;
      const oracleStart = performance.now(), fresh = freshFootnotes(state);
      oracleClocks.push(performance.now() - oracleStart);
      expect(footnotes(state)).toEqual(fresh);
    }
    const sorted = [...clocks].sort((a, b) => a - b);
    console.log(JSON.stringify({ benchmark: 'isolated-footnote-code', units, samples: 20,
      scope: 'language and footnote state update; excludes source history, preview, DOM and native input',
      median: (sorted[9] + sorted[10]) / 2, p95: sorted[18], clocks, oracleClocks, complete, coverage, boundaries, reused, fallback: 20 - reused }));
  }
}, 120000);
