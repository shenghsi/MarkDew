// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState, RangeSet } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree, Language, LanguageSupport } from '@codemirror/language';
import { Parser, TreeFragment } from '@lezer/common';
import { documentLanguage } from '../../src/web/document-language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { completeDocument } from '../../src/web/preview-index';
import { fromSource, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { livePreview, previewField, collectPreview, previewDecorations } from '../performance/experiments/point-comparison/static-preview';
import { enableFallbackObservation, enableLocalCoverage, diagnoseFallback } from '../performance/experiments/point-comparison/fallback-observer';
import { mountedDocumentLanguage } from '../performance/experiments/point-comparison/mounted-document-language';

afterEach(() => { enableLocalCoverage(false); enableFallbackObservation(false); vi.restoreAllMocks(); });
function full(source: string, anchor: number, preview = true, direct: boolean | 'mounted' = false, controlled = false, cutoff = 1024) {
  let language = direct === 'mounted' ? mountedDocumentLanguage() : direct ? markdown({ base: markdownLanguage, addKeymap: false }) : documentLanguage();
  if (controlled) {
    const packageParser = language.language.parser, prefix = source.slice(0, 100);
    const parser = new class extends Parser {
      createParse(...args: Parameters<Parser['createParse']>) {
        const [input, fragments, ranges] = args, changed = input.read(0, 100) !== prefix;
        const retained = changed ? fragments.filter(fragment => fragment.from < cutoff).map(fragment =>
          new TreeFragment(fragment.from, Math.min(fragment.to, cutoff), fragment.tree, fragment.offset, fragment.openStart, true)) : fragments;
        const parse = packageParser.startParse(input, retained, ranges);
        if (changed) parse.stopAt(cutoff);
        return parse;
      }
    };
    language = new LanguageSupport(new Language(language.language.data, parser), language.support);
  }
  let state = EditorState.create({ doc: source, selection: { anchor }, extensions: [language,
    sourceExtensions(fromSource(source)), ...(preview ? [livePreview] : [])] });
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state; expect(completeDocument(state)).toBeDefined(); return state;
}
function equivalent(candidate: EditorState, direct: boolean | 'mounted' = false) {
  const oracle = full(candidate.doc.toString(), candidate.selection.main.head, false, direct);
  const expected = previewDecorations(oracle, collectPreview(oracle, syntaxTree(oracle)));
  const plan = candidate.field(previewField);
  expect(RangeSet.eq([plan.decorations], [expected])).toBe(true);
  const events: unknown[] = [];
  RangeSet.compare([plan.layers!.points, plan.layers!.marks], [expected], candidate.changes([]), {
    comparePoint(...args) { events.push(args); }, compareRange(...args) { events.push(args); }, boundChange(at) { events.push(at); },
  });
  expect(events).toEqual([]);
}

it.each([true, 'mounted'] as const)('keeps off-screen projection across partial trees against separate complete oracles (%s)', profile => {
  const source = '# Heading\n\nParagraph words[^a].\n\n' + '# Heading\n\nParagraph **words** and `code`.\n\n'.repeat(8000) + '[^a]: Note\n';
  let state = full(source, source.indexOf('words') + 2, true, profile, true), partial = 0;
  enableLocalCoverage(true); enableFallbackObservation(true);
  for (const insert of ['Z', '中', '𠀀', 'e\u0301']) {
    const before = state, at = state.selection.main.head;
    const transaction = state.update({ changes: { from: at, insert }, selection: { anchor: at + insert.length } }); state = transaction.state;
    const tree = syntaxTree(state), incomplete = !completeDocument(state);
    if (incomplete) partial++;
    expect({ mode: state.field(previewField).mode, diagnostic: diagnoseFallback(transaction, before.field(previewField), false) })
      .toMatchObject({ mode: 'indexed' });
    expect(diagnoseFallback(transaction, before.field(previewField), true)).toMatchObject({ reason: 'accepted', returnedIndex: true });
    equivalent(state, profile === 'mounted' ? false : true);
    expect(syntaxTree(state)).toBe(tree); expect(!completeDocument(state)).toBe(incomplete);
    expect(savedSource(state.field(sourceField))).toBe(state.doc.toString());
  }
  expect(partial).toBe(4);
}, 30000);

it('rejects an unmounted wrapper body and a dirty-node truncation', () => {
  const source = '# Heading\n\nParagraph words.\n\n' + '# Heading\n\nParagraph words.\n\n'.repeat(8000);
  for (const step of [1, 1000]) {
    const state = full(source, source.indexOf('words') + 2);
    enableLocalCoverage(true); enableFallbackObservation(true);
    const at = state.selection.main.head; let tick = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => tick += step);
    let transaction;
    try { transaction = state.update({ changes: { from: at, insert: 'Z' }, selection: { anchor: at + 1 } }); void transaction.state; }
    finally { clock.mockRestore(); }
    expect(transaction.state.field(previewField).mode).toBe('full');
    expect(diagnoseFallback(transaction, state.field(previewField), false)).toMatchObject({
      mountedAfter: false, updateIndexCalled: true, returnedIndex: false, reason: 'local-coverage',
    });
  }
}, 30000);

it('keeps structural, resource and note-change fallbacks', () => {
  enableLocalCoverage(true);
  const state = full('Paragraph words[^a].\n\n[^a]: Note\n', 12);
  for (const insert of ['\n\n', '$x$', '[link](url)']) {
    expect(state.update({ changes: { from: 12, insert } }).state.field(previewField).mode).toBe('full');
  }
  const at = state.doc.toString().lastIndexOf('Note');
  expect(state.update({ changes: { from: at + 2, insert: 'Z' }, selection: { anchor: at + 3 } }).state.field(previewField).mode).toBe('full');
  const resource = full('Paragraph words.\n\n<div>HTML</div>\n', 12);
  expect(resource.update({ changes: { from: 12, insert: 'Z' }, selection: { anchor: 13 } }).state.field(previewField).mode).toBe('full');
});

it('does not treat a truncated boundary neighbour as the document edge', () => {
  const source = '# Heading\n\nParagraph words.\n\n# Neighbor\n\nTail words.\n\n';
  const state = full(source, source.indexOf('words') + 2, true, true, true, source.indexOf('# Neighbor') + 1);
  enableLocalCoverage(true); enableFallbackObservation(true);
  const at = state.selection.main.head;
  const transaction = state.update({ changes: { from: at, insert: 'Z' }, selection: { anchor: at + 1 } });
  expect(transaction.state.field(previewField).mode).toBe('full');
  expect(diagnoseFallback(transaction, state.field(previewField), false)).toMatchObject({
    updateIndexCalled: true, returnedIndex: false, reason: 'local-coverage',
    rejection: { phase: 'local-coverage' },
  });
});
