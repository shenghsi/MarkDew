// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { collectPreview, livePreview, previewDecorations } from '../../src/web/preview';
import { createIndex, updateIndex } from '../performance/experiments/local-blocks/prototype';

function create(source: string, anchor: number) {
  let state = EditorState.create({ doc: source, selection: { anchor }, extensions: [markdown({ base: markdownLanguage }), livePreview] });
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  return state;
}

it('visits a bounded local block set across document sizes and Unicode shifts', () => {
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  for (const bytes of [100 * 1024, 1024 * 1024]) {
    const source = block.repeat(Math.ceil(bytes / block.length));
    for (const location of [0, Math.floor(source.length / 2), source.lastIndexOf('Paragraph')]) {
      let anchor = source.indexOf('Paragraph', location) + 3;
      let state = create(source, anchor), index = createIndex(state)!;
      expect(index).toBeDefined();
      const samples = [];
      for (const insert of ['Z', '中', '𠀀']) {
        const transaction = state.update({ changes: { from: anchor, insert }, selection: { anchor: anchor + insert.length } });
        state = transaction.state;
        // This prototype measures complete-tree work. Under a concurrent test
        // batch the parser budget can expire; settle it outside that scope.
        const settledTree = ensureSyntaxTree(state, state.doc.length, 10000);
        expect(settledTree).not.toBeNull();
        let rejection: unknown;
        const result = updateIndex(index, transaction, reason => rejection = reason, settledTree!);
        expect(result, JSON.stringify({ bytes, location, insert, complete: syntaxTreeAvailable(state, state.doc.length),
          node: { name: syntaxTree(state).resolveInner(anchor, 1).name,
            from: syntaxTree(state).resolveInner(anchor, 1).from, to: syntaxTree(state).resolveInner(anchor, 1).to }, rejection })).toBeDefined(); index = result!.index;
        expect(result!.counts.visitedBlocks).toBeLessThanOrEqual(17);
        expect(result!.counts.rebuiltItems).toBeGreaterThanOrEqual(2);
        expect(result!.counts.rebuiltItems).toBeLessThanOrEqual(34);
        samples.push(result!.counts);
        const actual = index.decorations.iter(), expected = previewDecorations(state, collectPreview(state, settledTree!)).iter();
        let equal = true;
        while (actual.value && expected.value) {
          equal = equal && actual.from === expected.from && actual.to === expected.to && actual.value.eq(expected.value);
          actual.next(); expected.next();
        }
        expect(equal && actual.value === null && expected.value === null).toBe(true);
        anchor += insert.length;
      }
      console.log(JSON.stringify({ experiment: 'local-preview-index', requestedBytes: bytes, initialUnits: source.length,
        location, samples, scope: 'prototype block visits and rebuilds; excludes parser and production preview update' }));
    }
  }
}, 30000);

it('rejects structural edits and documents with resource or container dependencies', () => {
  for (const source of ['- Item', '> Quote', '$x$', '[link][ref]\n\n[ref]: /x', '<b>text</b>', '---\ntitle: A\n---'])
    expect(createIndex(create(source, 0))).toBeUndefined();
  const state = create('Paragraph with **text**.\n\nNext', 3), index = createIndex(state)!;
  for (const insert of ['\n', '*', '[', ' ', '$']) {
    const transaction = state.update({ changes: { from: 3, insert }, selection: { anchor: 3 + insert.length } });
    expect(updateIndex(index, transaction)).toBeUndefined();
  }
  const multiple = state.update({ changes: [{ from: 3, insert: 'Z' }, { from: 5, insert: 'Z' }] });
  expect(updateIndex(index, multiple)).toBeUndefined();
  const outside = state.update({ changes: { from: 3, insert: 'Z' }, selection: { anchor: state.doc.length + 1 } });
  expect(updateIndex(index, outside)).toBeUndefined();
});
