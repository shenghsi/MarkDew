// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState, RangeSet, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { history, isolateHistory, redo, undo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { collectPreview, livePreview, previewDecorations, previewField } from '../performance/experiments/point-comparison/static-preview';
import { loadPaired } from '../performance/experiments/point-comparison/paired.mjs';

afterEach(() => vi.restoreAllMocks());
const display = new Compartment();
function create(source: string, anchor?: number) {
  const record = fromSource(source), doc = normalize(record.raw);
  let state = EditorState.create({ doc, selection: { anchor: anchor ?? doc.indexOf('Paragraph') + 3 }, extensions: [
    sourceExtensions(record), history(), documentLanguage(), display.of(livePreview), EditorState.allowMultipleSelections.of(true),
  ] });
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  expect(syntaxTree(state).length).toBe(state.doc.length);
  return state;
}
function stream(api: typeof RangeSet, old: DecorationSet[], current: DecorationSet[], changes: Transaction['changes'], minimum = -1) {
  const events: unknown[] = [];
  api.compare(old, current, changes, {
    comparePoint(from, to, a, b) { events.push(['point', from, to, a, b]); },
    compareRange(from, to, a, b) { events.push(['range', from, to, a, b]); },
    boundChange(at) { events.push(['bound', at]); },
  }, minimum);
  return events;
}
function spans(sets: DecorationSet[], length: number) {
  const events: unknown[] = [];
  RangeSet.spans(sets, 0, length, {
    span(from, to, active, open) { events.push(['span', from, to, [...active], open]); },
    point(from, to, value, active, open, rank) { events.push(['point', from, to, value, [...active], open, rank]); },
  }); return events;
}
function check(state: EditorState) {
  const plan = state.field(previewField), layers = plan.layers!;
  const fresh = previewDecorations(state, collectPreview(state, syntaxTree(state), plan.imageVersion));
  expect(RangeSet.eq([plan.decorations], [fresh])).toBe(true);
  expect(stream(RangeSet, [layers.points, layers.marks], [fresh], state.changes([]))).toEqual([]);
  expect(spans([layers.points, layers.marks], state.doc.length)).toEqual(spans([plan.decorations], state.doc.length));
  for (const cursor = layers.points.iter(); cursor.value; cursor.next()) expect(cursor.value.point).toBe(true);
  for (const cursor = layers.marks.iter(); cursor.value; cursor.next()) expect(cursor.value.point).toBe(false);
}

it('retains all selection boundaries, resource owners, spans and static external order', () => {
  const fixtures = [
    '\uFEFF# **Heading[^a]**\r\n\r\nParagraph **outer *inner ~~strike~~ end* words** and `code`[^a].\n\n*two\nlines*.\r\n\r\n[^a]: **note**\r\n',
    '- **item *inner***\n- [ ] task\n\n> quoted **text**\n\nSetext *title*\n---\n\nParagraph words.\n',
    '---\nkey: value\n---\n\nParagraph $x$ and ![alt](image.png).\n\n| A | B |\n| - | - |\n| **x** | y |\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n<div>HTML</div>\n\nTail.\n',
  ];
  for (const source of fixtures) {
    let state = create(source);
    for (let anchor = 0; anchor <= state.doc.length; anchor++) {
      state = state.update({ selection: { anchor } }).state; check(state);
      const plan = state.field(previewField), before = Decoration.set([Decoration.mark({ class: 'before' }).range(0, state.doc.length)]);
      const after = Decoration.set([Decoration.mark({ class: 'after' }).range(0, state.doc.length)]);
      const actual = [before, plan.layers!.points, plan.layers!.marks, after];
      expect(stream(RangeSet, actual, [before, plan.decorations, after], state.changes([]))).toEqual([]);
      expect(spans(actual, state.doc.length)).toEqual(spans([before, plan.decorations, after], state.doc.length));
      expect(savedSource(state.field(sourceField))).toBe(source);
    }
    for (const selection of [EditorSelection.range(0, state.doc.length), EditorSelection.range(state.doc.length, 0),
      EditorSelection.create([EditorSelection.cursor(2), EditorSelection.cursor(state.doc.length - 2)])]) {
      state = state.update({ selection }).state; check(state);
    }
    const inputs = state.facet(EditorView.decorations);
    expect(inputs).toEqual([state.field(previewField).layers!.points, state.field(previewField).layers!.marks]);
  }
});

it('patches actual local regions without old-set enumeration and retains source history', () => {
  for (const note of [false, true]) {
    const source = '\uFEFF# Heading **strong**' + (note ? '[^a]' : '') + '\r\n\r\nParagraph **words** and `code`'
      + (note ? '[^a]' : '') + '.\n\n# Second\r\n\r\nMore **text** here.\r\n' + (note ? '\r\n[^a]: 日本語 note\r\n' : '');
    let state = create(source, normalize(fromSource(source).raw).indexOf('words') + 2);
    const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
    const snapshots = [source]; check(state);
    for (const text of ['Z', '中', '𠀀', 'e\u0301']) {
      const plan = state.field(previewField), layers = plan.layers!;
      const sets = new Set([layers.points, layers.marks, plan.index!.decorations,
        ...(plan.ordinaryLayers ? [plan.ordinaryLayers.points, plan.ordinaryLayers.marks] : [])]);
      const spies = [...sets].map(set => vi.spyOn(set, 'iter'));
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
      try {
        const from = state.selection.main.head;
        state = state.update({ changes: { from, insert: text }, selection: { anchor: from + text.length }, annotations: isolateHistory.of('full') }).state;
        expect(state.field(previewField).mode).toBe('indexed');
        spies.forEach(spy => expect(spy).not.toHaveBeenCalled());
      } finally { spies.forEach(spy => spy.mockRestore()); clock.mockRestore(); }
      check(state); snapshots.push(savedSource(state.field(sourceField)));
    }
    for (let at = snapshots.length - 2; at >= 0; at--) { expect(undo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(snapshots[at]); check(state); }
    for (let at = 1; at < snapshots.length; at++) { expect(redo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(snapshots[at]); check(state); }
    state = state.update({ effects: display.reconfigure([]) }).state;
    expect(state.field(previewField, false)).toBeUndefined(); expect(undo(target)).toBe(true);
    state = state.update({ effects: display.reconfigure(livePreview) }).state; check(state);
    expect(savedSource(state.field(sourceField))).toBe(snapshots.at(-2));
  }
});

it('retains single-layer points and actual paired jumps over growing 1 MiB note edits', async () => {
  const paired = await loadPaired();
  const header = '\uFEFF# **Heading[^a]**\r\n\r\nParagraph words 日本語 and **strong**[^a].\r\n\r\n';
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n', tail = '\r\n[^a]: 日本語 note\r\n';
  const remaining = 1048576 - new TextEncoder().encode(header + tail).length;
  const source = header + block.repeat(Math.floor(remaining / block.length)) + 'w'.repeat(remaining % block.length) + tail;
  let state = create(source);
  let jumps = 0, skipped = 0;
  for (const insert of ['Z', '中', '𠀀', 'e\u0301']) {
    const old = state.field(previewField).layers!, from = state.selection.main.head;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    let transaction: Transaction;
    try { transaction = state.update({ changes: { from, insert }, selection: { anchor: from + insert.length } }); state = transaction.state; }
    finally { clock.mockRestore(); }
    expect(state.field(previewField).mode).toBe('indexed'); check(state);
    const current = state.field(previewField).layers!;
    // Versioned read-only eligibility, not a public production field contract.
    const single = (set: DecorationSet) => (set as unknown as { nextLayer: { isEmpty: boolean } }).nextLayer.isEmpty;
    expect(single(old.points)).toBe(true); expect(single(current.points)).toBe(true);
    const stats = { ...paired.module.pairedStats };
    const expected = stream(RangeSet, [old.points, old.marks], [current.points, current.marks], transaction.changes, 0);
    expect(stream(paired.module.RangeSet, [old.points, old.marks], [current.points, current.marks], transaction.changes, 0)).toEqual(expected);
    const count = paired.module.pairedStats.jumps - stats.jumps;
    expect(count).toBeGreaterThan(0);
    jumps += count; skipped += paired.module.pairedStats.rangesSkipped - stats.rangesSkipped;
  }
  console.log(JSON.stringify({ diagnostic: 'static-point-local-update', bytes: new TextEncoder().encode(source).length,
    edits: 4, jumps, rangesSkipped: skipped, scope: 'actual bounded ordinary updates; notes rebuild completely; no DOM or speed claim' }));
}, 30000);

it('uses full fallbacks for structural edits, changed notes, resources and multiple edits', () => {
  const state = create('Paragraph words[^a].\n\n[^a]: Note\n\nEnd words.');
  for (const changes of [{ from: 3, insert: '\n\n' }, { from: 3, insert: '$x$' },
    { from: state.doc.toString().indexOf('[^a]') + 2, insert: 'b' }, [{ from: 3, insert: 'Z' }, { from: 8, insert: '中' }]]) {
    const next = state.update({ changes }).state;
    expect(next.field(previewField).mode).toBe('full'); check(next);
  }
  const resource = create('Paragraph words.\n\n<div>HTML</div>\n\nEnd.');
  const next = resource.update({ changes: { from: 3, insert: 'Z' }, selection: { anchor: 4 } }).state;
  expect(next.field(previewField).mode).toBe('full'); check(next);
});

it('keeps partial trees on the full path and builds the index after settlement', () => {
  const source = 'Paragraph words[^a].\n\n' + '# Heading\n\nParagraph words.\n\n'.repeat(25000) + '[^a]: Note\n';
  let state = EditorState.create({ doc: source, selection: { anchor: 3 }, extensions: [documentLanguage(), livePreview] });
  expect(state.field(previewField).index).toBeUndefined(); check(state);
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  expect(state.field(previewField).index).toBeDefined(); check(state);
}, 30000);
