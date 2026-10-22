import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { createIndex, updateIndex as originalUpdateIndex } from '../../src/web/preview-index';
import { fromSource, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { diagnoseFallback, enableFallbackObservation, updateIndex } from '../performance/experiments/point-comparison/fallback-observer';

afterEach(() => enableFallbackObservation(false));
const source = '# Heading\n\nParagraph words here.\n\nMore words.\n';
function fixture() {
  const at = source.indexOf('words') + 2;
  let state = EditorState.create({ doc: source, selection: { anchor: at },
    extensions: [documentLanguage(), sourceExtensions(fromSource(source))] });
  expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull();
  state = state.update({}).state;
  const index = createIndex(state, Decoration.none)!;
  const transaction = state.update({ changes: { from: at, insert: 'Z' }, selection: { anchor: at + 1 } });
  expect(ensureSyntaxTree(transaction.state, transaction.state.doc.length, 1000)).not.toBeNull();
  return { index, transaction };
}

it('retains the successful return, one build call, source and decorations', () => {
  const { index, transaction } = fixture(); let calls = 0;
  const build = () => { calls++; return { decorations: Decoration.none, items: 1 }; };
  const expected = originalUpdateIndex(index, transaction, build)!;
  calls = 0; enableFallbackObservation(true);
  const actual = updateIndex(index, transaction, build)!;
  expect(calls).toBe(1); expect(actual.counts).toEqual(expected.counts);
  expect(actual.index.decorations).toBe(expected.index.decorations);
  expect(savedSource(transaction.startState.field(sourceField))).toBe(source);
  expect(savedSource(transaction.state.field(sourceField))).toBe(source.replace('words', 'woZrds'));
  expect(diagnoseFallback(transaction, { index }, true)).toMatchObject({
    reason: 'accepted', mountedBefore: true, mountedAfter: true, updateIndexCalled: true, returnedIndex: true,
  });
});

it('forwards the original rejection once without replay or return changes', () => {
  const { index, transaction } = fixture();
  const broken = { ...index, blocks: index.blocks.update({ filter: from => from < source.indexOf('More') }) };
  const expected: unknown[] = [], actual: unknown[] = []; let builds = 0;
  const build = () => { builds++; return { decorations: Decoration.none, items: 1 }; };
  expect(originalUpdateIndex(broken, transaction, build, reason => expected.push(reason))).toBeUndefined();
  enableFallbackObservation(true);
  expect(updateIndex(broken, transaction, build, reason => actual.push(reason))).toBeUndefined();
  expect(actual).toEqual(expected); expect(actual).toHaveLength(1); expect(builds).toBe(0);
  expect(diagnoseFallback(transaction, { index: broken }, false)).toMatchObject({
    reason: 'block-correspondence', updateIndexCalled: true, returnedIndex: false, rejection: expected[0],
  });
});

it('distinguishes a later missing index from the first rejection', () => {
  const { transaction } = fixture();
  expect(diagnoseFallback(transaction, {}, false)).toMatchObject({ reason: 'no-index', updateIndexCalled: false });
});
