// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState, RangeSet, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { history, isolateHistory, redo, undo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { collectPreview, hiddenMarks, livePreview, partition, previewDecorations, previewField, visibleHidden } from '../performance/experiments/viewport-marks/preview';

afterEach(() => vi.restoreAllMocks());
const display = new Compartment();
function create(source: string, anchor = 0) {
  const record = fromSource(source);
  let state = EditorState.create({ doc: normalize(record.raw), selection: { anchor }, extensions: [
    sourceExtensions(record), history(), documentLanguage(), display.of(livePreview), EditorState.allowMultipleSelections.of(true),
  ] });
  expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
  state = state.update({}).state;
  expect(syntaxTree(state).length).toBe(state.doc.length);
  return state;
}
function ranges(set: DecorationSet) {
  const output = [];
  for (const cursor = set.iter(); cursor.value; cursor.next()) output.push({ from: cursor.from, to: cursor.to, value: cursor.value });
  return output;
}
function check(state: EditorState) {
  const plan = state.field(previewField), expected = previewDecorations(state, collectPreview(state, syntaxTree(state), plan.imageVersion));
  expect(RangeSet.eq([plan.decorations], [expected], 0, state.doc.length)).toBe(true);
  // RangeSet.eq first requires the same number of input sets. Compare reports
  // semantic differences across a different partition instead.
  const differences: unknown[] = [];
  RangeSet.compare([plan.layers!.hidden, plan.layers!.static], [expected], state.changes([]), {
    compareRange(from, to, left, right) { differences.push({ from, to, left: left.map(value => value.spec), right: right.map(value => value.spec) }); },
    comparePoint(from, to, left, right) { differences.push({ from, to, left: left?.spec, right: right?.spec }); },
  });
  expect(differences).toEqual([]);
  for (const range of ranges(plan.layers!.hidden)) {
    expect(range.value.point && range.from < range.to).toBe(true);
    expect(range.value.spec.widget).toBeUndefined(); expect(range.value.spec.block).toBeFalsy();
    expect(state.sliceDoc(range.from, range.to)).not.toContain('\n');
  }
}

it('retains full suppression, resources, global owners and every selection boundary', () => {
  const fixtures = [
    '# Heading **bold**\n\nParagraph *two\nlines* and `code`.\n\nEnd.',
    'Paragraph **outer *inner* text** and ~~strike *inside*~~ and **`code`**.\n\nEnd.',
    '- **one\n  two**\n- [ ] task\n\n> **quote**\n\nTitle\n=====\n\nEnd.',
    'Paragraph **text[^a]** and $x_1$[^a].\n\n[^a]: **note**\n\nEnd.',
    '---\nname: value\n---\n\n# Heading\n\nParagraph <b>**HTML**</b> and ![alt](x.png).\n\n'
      + '| A | B |\n| - | - |\n| $x$ | cell |\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n<div>HTML</div>\n\nEnd.',
  ];
  for (const source of fixtures) {
    let state = create(source);
    for (let anchor = 0; anchor <= state.doc.length; anchor++) {
      state = state.update({ selection: { anchor } }).state; check(state);
    }
    for (const selection of [EditorSelection.range(0, state.doc.length), EditorSelection.range(state.doc.length, 0),
      EditorSelection.create([EditorSelection.cursor(2), EditorSelection.cursor(state.doc.length - 2)])]) {
      state = state.update({ selection }).state; check(state);
    }
  }
});

it('queries complete visible lines and retains owners outside the viewport', () => {
  const source = 'Start.\n\n*owner starts\ncontinues\nends here*\n\nParagraph **bold** and `code`.\n\nEnd.';
  let state = create(source, source.length);
  const line = state.doc.line(4), last = state.doc.line(5);
  const query = [{ from: line.from + 2, to: last.from + 2 }, { from: last.from + 1, to: last.to }];
  const all = ranges(state.field(previewField).layers!.hidden);
  const visible = ranges(visibleHidden(state, query));
  expect(visible.map(({ from, to }) => [from, to])).toEqual(all.filter(range => range.to >= line.from && range.from <= last.to).map(({ from, to }) => [from, to]));
  expect(visible.some(range => state.sliceDoc(range.from, range.to) === '*')).toBe(true);
  state = state.update({ selection: { anchor: source.indexOf('owner') } }).state;
  expect(ranges(visibleHidden(state, query))).toHaveLength(0); check(state);
  state = state.update({ selection: { anchor: source.indexOf('End.') } }).state;
  expect(ranges(visibleHidden(state, query))).toHaveLength(1); check(state);
});

it('maps only rebuilt local layers and preserves exact Unicode source, Undo, Redo and Source mode', () => {
  for (const note of [false, true]) {
    const source = '\uFEFF# Heading **strong**\r\n\r\nParagraph words and `code`' + (note ? '[^a]' : '') + '.\n\n'
      + '# Second\r\n\r\nMore **text** here.\r\n' + (note ? '\r\n[^a]: 日本語 note\r\n' : '');
    let state = create(source, normalize(fromSource(source).raw).indexOf('words') + 2);
    const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
    const snapshots = [source]; check(state);
    for (const text of ['Z', '中', '𠀀', 'e\u0301']) {
      const plan = state.field(previewField);
      const enumerations = [vi.spyOn(plan.layers!.hidden, 'iter'), vi.spyOn(plan.layers!.static, 'iter')];
      const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
      try {
        const from = state.selection.main.head;
        state = state.update({ changes: { from, insert: text }, selection: { anchor: from + text.length }, annotations: isolateHistory.of('full') }).state;
        expect(state.field(previewField).mode).toBe('indexed');
        enumerations.forEach(enumeration => expect(enumeration).not.toHaveBeenCalled());
      } finally { enumerations.forEach(enumeration => enumeration.mockRestore()); clock.mockRestore(); }
      check(state); snapshots.push(savedSource(state.field(sourceField)));
    }
    for (let index = snapshots.length - 2; index >= 0; index--) {
      expect(undo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(snapshots[index]); check(state);
    }
    for (let index = 1; index < snapshots.length; index++) {
      expect(redo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(snapshots[index]); check(state);
    }
    state = state.update({ effects: display.reconfigure([]) }).state;
    expect(state.field(previewField, false)).toBeUndefined(); expect(undo(target)).toBe(true);
    state = state.update({ effects: display.reconfigure(livePreview) }).state; check(state);
    expect(savedSource(state.field(sourceField))).toBe(snapshots.at(-2));
  }
});

it('leaves multiline replacements and all widgets in the static layer', () => {
  const state = EditorState.create({ doc: 'one\ntwo\nthree' });
  const widget = state.doc.length; // A block replacement without a widget is also static.
  const set = Decoration.set([Decoration.replace({}).range(0, 3), Decoration.replace({}).range(4, 8),
    Decoration.replace({ block: true }).range(9, widget)], true);
  const layers = partition(state, set);
  expect(ranges(layers.hidden).map(range => [range.from, range.to])).toEqual([[0, 3]]);
  expect(ranges(layers.static).map(range => [range.from, range.to])).toEqual([[4, 8], [9, widget]]);
});

it('updates the view plugin when the global plan changes and disposes it in Source mode', () => {
  const source = 'Paragraph **bold** and `code`.\n\nEnd.';
  const editor = new EditorView({ state: create(source, source.length), parent: document.body });
  try {
    expect(editor.plugin(hiddenMarks)).not.toBeNull();
    const start = ranges(editor.plugin(hiddenMarks)!.decorations);
    editor.dispatch({ selection: { anchor: source.indexOf('bold') } });
    expect(ranges(editor.plugin(hiddenMarks)!.decorations).length).toBeLessThan(start.length);
    editor.dispatch({ effects: display.reconfigure([]) }); expect(editor.plugin(hiddenMarks)).toBeNull();
  } finally { editor.destroy(); }
});

it('keeps hidden-first precedence and outside decorations in the actual view facet', () => {
  const source = 'Paragraph **outer *inner* text** and **`code`**.\n\nEnd.';
  const before = Decoration.set([Decoration.mark({ class: 'outside-before' }).range(0, 40)]);
  const after = Decoration.set([Decoration.mark({ class: 'outside-after' }).range(4, source.length)]);
  const record = fromSource(source);
  const state = EditorState.create({ doc: source, selection: { anchor: source.length }, extensions: [
    sourceExtensions(record), documentLanguage(), EditorView.decorations.of(before), livePreview, EditorView.decorations.of(after),
  ] });
  const editor = new EditorView({ state, parent: document.body });
  try {
    const plan = editor.state.field(previewField), actual = editor.state.facet(EditorView.decorations).map(input =>
      typeof input === 'function' ? input(editor) : input);
    expect(actual[0]).toBe(before); expect(actual[1]).toBe(editor.plugin(hiddenMarks)!.decorations);
    expect(actual[2]).toBe(plan.layers!.static); expect(actual[3]).toBe(after);
    const changes: unknown[] = [];
    RangeSet.compare(actual, [before, plan.decorations, after], editor.state.changes([]), {
      compareRange(from, to) { changes.push(['range', from, to]); },
      comparePoint(from, to) { changes.push(['point', from, to]); },
    });
    expect(changes).toEqual([]);
    const reversed: unknown[] = [];
    RangeSet.compare([plan.layers!.static, plan.layers!.hidden], [plan.decorations], editor.state.changes([]), {
      compareRange(from, to) { reversed.push(['range', from, to]); },
      comparePoint(from, to) { reversed.push(['point', from, to]); },
    });
    expect(reversed.length).toBeGreaterThan(0);
    const points = (sets: DecorationSet[]) => {
      const output: unknown[] = [];
      RangeSet.spans(sets, 0, source.length, {
        span() {}, point(from, to, value, active, _open, rank) {
          if (from === 18 && to === 19) output.push({ from, to, rank, spec: value.spec, active: active.map(mark => mark.spec) });
        },
      }); return output;
    };
    console.log(JSON.stringify({ diagnostic: 'viewport-mark-precedence',
      staticFirst: points([plan.layers!.static, plan.layers!.hidden]),
      hiddenFirst: points([plan.layers!.hidden, plan.layers!.static]),
      joined: points([RangeSet.join([plan.layers!.static, plan.layers!.hidden])]), full: points([plan.decorations]) }));
  } finally { editor.destroy(); }
});
