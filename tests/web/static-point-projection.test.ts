// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState, Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewField } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { completeDocument } from '../../src/web/preview-index';

function partition(set: DecorationSet) {
  const points: Range<Decoration>[] = [], marks: Range<Decoration>[] = [];
  for (const cursor = set.iter(); cursor.value; cursor.next()) {
    (cursor.value.point ? points : marks).push(cursor.value.range(cursor.from, cursor.to));
  }
  return [Decoration.set(points, true), Decoration.set(marks, true)];
}
function differences(inputs: DecorationSet[], full: DecorationSet[], state: EditorState) {
  const events: unknown[] = [];
  RangeSet.compare(inputs, full, state.changes([]), {
    comparePoint(from, to, a, b) { events.push(['point', from, to, a, b]); },
    compareRange(from, to, a, b) { events.push(['range', from, to, a, b]); },
    boundChange(at) { events.push(['bound', at]); },
  });
  return events;
}
function spans(sets: DecorationSet[], length: number) {
  const events: unknown[] = [];
  RangeSet.spans(sets, 0, length, {
    span(from, to, active, open) { events.push(['span', from, to, [...active], open]); },
    point(from, to, point, active, open, rank) { events.push(['point', from, to, point, [...active], open, rank]); },
  });
  return events;
}

it('retains static point spans, nested marks, resources, selection owners and external order', () => {
  const fixtures = [
    '\uFEFF# **Heading**\r\n\r\n**outer *inner ~~strike~~ end* words** and `code`.\n\n*two\nlines*.\rTail.\n',
    '- **item *inner***\n- [ ] task\n\n> quoted **text**\n\nSetext *title*\n---\n\nRef[^a].\n\n[^a]: **note**\n',
    '---\nkey: value\n---\n\n$x$ and ![alt](image.png).\n\n| A | B |\n| - | - |\n| **x** | y |\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n<div>HTML</div>\n\nTail.\n',
  ];
  for (const original of fixtures) {
    const record = fromSource(original), doc = normalize(record.raw);
    let state = EditorState.create({ doc, selection: { anchor: doc.length }, extensions: [sourceExtensions(record), documentLanguage(), livePreview] });
    expect(ensureSyntaxTree(state, state.doc.length, 10000)).not.toBeNull();
    state = state.update({}).state;
    expect(completeDocument(state)).toBeDefined();
    const outsideBefore = Decoration.set([Decoration.mark({ class: 'outside-before' }).range(0, doc.length)]);
    const outsideAfter = Decoration.set([Decoration.mark({ class: 'outside-after' }).range(0, doc.length)]);
    for (let anchor = 0; anchor <= doc.length; anchor++) {
      const selected = state.update({ selection: { anchor } }).state;
      const full = selected.field(previewField).decorations, split = partition(full);
      expect(differences(split, [full], selected), `anchor ${anchor}`).toEqual([]);
      expect(spans(split, doc.length), `spans ${anchor}`).toEqual(spans([full], doc.length));
      expect(differences([outsideBefore, ...split, outsideAfter], [outsideBefore, full, outsideAfter], selected)).toEqual([]);
      expect(spans([outsideBefore, ...split, outsideAfter], doc.length)).toEqual(spans([outsideBefore, full, outsideAfter], doc.length));
      expect(savedSource(selected.field(sourceField))).toBe(original);
    }
    const wide = state.update({ selection: { anchor: 0, head: doc.length } }).state;
    const full = wide.field(previewField).decorations;
    expect(differences(partition(full), [full], wide)).toEqual([]);
  }
  const doc = '**outer *inner* words**\n\nTail.';
  let control = EditorState.create({ doc, selection: { anchor: doc.length }, extensions: [documentLanguage(), livePreview] });
  expect(ensureSyntaxTree(control, doc.length, 10000)).not.toBeNull();control = control.update({}).state;
  const full = control.field(previewField).decorations, split = partition(full);
  expect(differences([...split].reverse(), [full], control).length).toBeGreaterThan(0);
}, 30000);
