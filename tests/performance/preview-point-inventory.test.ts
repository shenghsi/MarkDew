// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { EditorState, Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, highlightActiveLine } from '@codemirror/view';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewField } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { textDirection } from '../../src/web/text-direction';
import { searchSupport } from '../../src/web/navigation';
import { loadPaired } from './experiments/point-comparison/paired.mjs';

// Inactive diagnosis. This file changes no app decorations or package methods.
function inventory(state: EditorState, set: DecorationSet) {
  const counts: Record<string, { ranges: number; units: number; maxUnits: number }> = {};
  const hiddenSource: Record<string, number> = {};
  const points: Range<Decoration>[] = [], marks: Range<Decoration>[] = [];
  for (const cursor = set.iter(); cursor.value; cursor.next()) {
    const value = cursor.value, size = cursor.to - cursor.from;
    (value.point ? points : marks).push(value.range(cursor.from, cursor.to));
    const widget = value.spec.widget;
    const kind = !value.point ? 'non-point' : widget
      ? `widget:${widget.item?.kind ?? (widget.marker ? 'marker' : widget.constructor.name)}`
      : size === 0 ? (value.spec.attributes ? 'line-decoration' : 'empty-point') : state.doc.lineAt(cursor.from).number === state.doc.lineAt(cursor.to).number
        ? 'empty-replacement:same-line' : 'empty-replacement:multiline';
    const count = counts[kind] ??= { ranges: 0, units: 0, maxUnits: 0 };
    count.ranges++; count.units += size; count.maxUnits = Math.max(count.maxUnits, size);
    if (kind.startsWith('empty-replacement')) {
      const text = state.sliceDoc(cursor.from, cursor.to);
      const label = text.length <= 32 ? text : `${text.slice(0, 32)}…`;
      hiddenSource[label] = (hiddenSource[label] ?? 0) + 1;
    }
  }
  // Read-only topology for the inactive single-layer comparator guard.
  // These fields belong to installed state 6.7.6, not the public app contract.
  type Layer = { isEmpty: boolean; maxPoint: number; nextLayer: Layer; chunk: { maxPoint: number }[] };
  function topology(set: DecorationSet) { const layers = [];
    for (let layer = set as unknown as Layer; !layer.isEmpty; layer = layer.nextLayer) {
      layers.push({ maxPoint: layer.maxPoint, chunks: layer.chunk.length,
        positivePointChunks: layer.chunk.filter(chunk => chunk.maxPoint > 0).length });
    } return layers;
  }
  const root = set as unknown as Layer, pointSet = Decoration.set(points, true), markSet = Decoration.set(marks, true);
  let splitDifferences = 0, reversedDifferences = 0;
  const differenceCount = (inputs: DecorationSet[]) => { let changes = 0;
    RangeSet.compare(inputs, [set], state.changes([]), {
      compareRange() { changes++; }, comparePoint() { changes++; }, boundChange() { changes++; },
    }); return changes;
  };
  splitDifferences = differenceCount([pointSet, markSet]);
  reversedDifferences = differenceCount([markSet, pointSet]);
  const staticInputs = state.facet(EditorView.decorations).filter(input => typeof input !== 'function') as DecorationSet[];
  const outer = state.facet(EditorView.outerDecorations).filter(input => typeof input !== 'function') as DecorationSet[];
  if (outer.length) staticInputs.push(RangeSet.join(outer));
  const projectedInputs = staticInputs.flatMap(input => input === set ? [pointSet, markSet] : [input]);
  const relevant = projectedInputs.filter(input => { const layer = input as unknown as Layer;
    return layer.maxPoint > 0 || !layer.isEmpty && layer.maxPoint >= 0;
  });
  return { counts, hiddenSource, stateVersion: '6.7.6', layers: topology(set),
    staticPointProjection: { layers: topology(pointSet), splitDifferences, reversedDifferences,
      singleLayerEligible: !(pointSet as unknown as Layer).isEmpty && (pointSet as unknown as Layer).nextLayer.isEmpty,
      heightInputs: staticInputs.map(topology), projectedHeightInputs: projectedInputs.map(topology),
      guardedComparisonEligible: relevant.length === 1 && (relevant[0] as unknown as Layer).nextLayer.isEmpty },
    singleLayerHeightComparisonEligible: !root.isEmpty && root.nextLayer.isEmpty };
}

it.skipIf(process.env.MARKDEW_POINT_INVENTORY !== '1')('reports static preview point ranges and height comparison changes', async () => {
  const paired = await loadPaired();
  const header = '\uFEFF# Input observation\r\n\r\nParagraph words 日本語 and **strong text**[^a].\r\n\r\n';
  const block = '# Heading\n\nParagraph with **strong text**, `code`, and words.\n\n';
  const tail = '\r\n[^a]: 日本語 note\r\n';
  const encoder = new TextEncoder(), remaining = 1048576 - encoder.encode(header + tail).length;
  const original = header + block.repeat(Math.floor(remaining / block.length)) + 'w'.repeat(remaining % block.length) + tail;
  const resource = '# Heading\n\nParagraph **bold** and *two\nlines*, `code`, $x$, and ![alt](image.png).\n\n'
    + '- item\n- [ ] task\n\n> quote\n\n---\n\n| A | B |\n| - | - |\n| x | y |\n\n'
    + '```mermaid\nflowchart LR\nA-->B\n```\n\n<div>HTML</div>\n\nReference[^a].\n\n[^a]: Note.\n';
  for (const [name, source] of [['input-note-1MiB', original], ['resource-types', resource]]) {
    const record = fromSource(source), doc = normalize(record.raw), anchor = doc.indexOf('Paragraph') + 3;
    let state = EditorState.create({ doc, selection: { anchor }, extensions: [
      sourceExtensions(record), documentLanguage(), textDirection, highlightActiveLine(),
      // No view is constructed here. These extensions supply the same static
      // facet shape as the app; their view plugins are not executed.
      searchSupport(() => { throw new Error('State-only inventory has no view'); }), livePreview,
    ] });
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
    state = state.update({}).state;
    expect(syntaxTree(state).length).toBe(state.doc.length);
    const before = state.field(previewField).decorations;
    // This is a settled-state inventory, not a real-input parser clock.
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now());
    let transaction;
    try { transaction = state.update({ changes: { from: anchor, insert: 'x' }, selection: { anchor: anchor + 1 } });
      state = transaction.state;
    } finally { clock.mockRestore(); }
    expect(syntaxTree(state).length).toBe(state.doc.length);
    const after = state.field(previewField).decorations;
    const pointOnly = (set: DecorationSet) => { const ranges: Range<Decoration>[] = [];
      for (const cursor = set.iter(); cursor.value; cursor.next()) if (cursor.value.point) ranges.push(cursor.value.range(cursor.from, cursor.to));
      return Decoration.set(ranges, true);
    };
    const oldPoints = pointOnly(before), freshPoints = pointOnly(after), mappedPoints = oldPoints.map(transaction.changes);
    const regions: { from: number; to: number }[] = [];
    RangeSet.compare([mappedPoints], [freshPoints], state.changes([]), {
      compareRange() { throw new Error('Point projection has no nonpoint ranges'); },
      comparePoint(from, to) { regions.push({ from, to }); },
    }, 0);
    // Diagnostic reconstruction from a complete oracle, outside any clock.
    // It demonstrates chunk reuse, not a bounded production update algorithm.
    let retainedPoints = mappedPoints;
    for (const region of regions) {
      const touches = (from: number, to: number) => to >= region.from && from <= region.to;
      const additions: Range<Decoration>[] = [];
      for (const cursor = freshPoints.iter(); cursor.value; cursor.next()) if (touches(cursor.from, cursor.to)) additions.push(cursor.value.range(cursor.from, cursor.to));
      retainedPoints = retainedPoints.update({ filterFrom: region.from, filterTo: region.to,
        filter: (from, to) => !touches(from, to), add: additions, sort: true });
    }
    expect(RangeSet.eq([retainedPoints], [freshPoints])).toBe(true);
    type Stream = unknown[];
    const stream = (api: typeof RangeSet) => { const events: Stream = [];
      api.compare([oldPoints], [retainedPoints], transaction.changes, {
        comparePoint(from, to, left, right) { events.push(['point', from, to, left, right]); },
        compareRange(from, to, left, right) { events.push(['range', from, to, left, right]); },
        boundChange(at) { events.push(['bound', at]); },
      }, 0); return events;
    };
    const statsBefore = { ...paired.module.pairedStats }, expectedStream = stream(RangeSet);
    expect(stream(paired.module.RangeSet)).toEqual(expectedStream);
    const pairedComparison = { version: paired.version, sourceSHA256: paired.sourceSHA256,
      regions: regions.length, callbacks: expectedStream.length,
      jumps: paired.module.pairedStats.jumps - statsBefore.jumps,
      rangesSkipped: paired.module.pairedStats.rangesSkipped - statsBefore.rangesSkipped,
      scope: 'complete-oracle reconstruction outside clocks; exact callback comparison only, no bounded update or speed claim' };
    if (name === 'input-note-1MiB') {
      expect(pairedComparison.jumps).toBeGreaterThan(0);
      expect(pairedComparison.rangesSkipped).toBeGreaterThan(0);
    }
    const changed: Record<string, number> = {};
    let rangeChanges = 0;
    const category = (value: Decoration | null) => !value ? 'absent' : value.spec.widget
      ? `widget:${value.spec.widget.item?.kind ?? value.spec.widget.constructor.name}` : 'empty-replacement';
    RangeSet.compare([before], [after], transaction.changes, {
      compareRange() { rangeChanges++; },
      comparePoint(_from, _to, left, right) {
        const key = `${category(left)} -> ${category(right)}`;
        changed[key] = (changed[key] ?? 0) + 1;
      },
    }, 0);
    const offset = source.indexOf('Paragraph') + 3;
    expect(savedSource(state.field(sourceField))).toBe(source.slice(0, offset) + 'x' + source.slice(offset));
    console.log(JSON.stringify({ diagnostic: 'preview-point-inventory', name, bytes: encoder.encode(source).length,
      node: process.version, platform: process.platform, arch: process.arch, complete: true,
      mode: state.field(previewField).mode, pairedComparison, before: inventory(transaction.startState, before),
      after: inventory(state, after), heightComparatorNotifications: changed, rangeChanges,
      scope: 'static preview ranges only; callback counts identify differences, not equal ranges visited; no DOM, viewport, input or timing claim' }));
  }
}, 30000);
