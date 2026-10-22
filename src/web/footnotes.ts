import { EditorState, RangeSet, RangeValue, StateField, Text, Transaction } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { toHast } from 'mdast-util-to-hast';
import { toHtml } from 'hast-util-to-html';
import DOMPurify from 'dompurify';
import type { Root, RootContent, FootnoteDefinition } from 'mdast';

interface Span { from: number; to: number }
interface PlainText extends Span { codeBefore?: Span }
export interface NoteDefinition extends Span { identifier: string; label: string; number?: number; duplicate: boolean; node: FootnoteDefinition }
export interface NoteReference extends Span { identifier: string; label: string; number: number }
export interface Footnotes { bodyFrom: number; definitions: NoteDefinition[]; references: NoteReference[]; plainText: PlainText[]; codeBlocks: Span[] }
const cache = new WeakMap<Text, Map<number, Footnotes>>();
// This certifies lexical absence in a complete body, not merely empty note arrays.
const markerFree = new WeakSet<Footnotes>();

// Guarded edits retain each text span and its preceding code anchor. Both
// anchor edges move with the span start; no edit may change the anchor itself.
class PlainRange extends RangeValue {
  startSide = -1;
  endSide = -1;
  readonly codeBefore?: Span;
  constructor(readonly ordinal: number, span: PlainText) {
    super();
    if (span.codeBefore) this.codeBefore = {
      from: span.codeBefore.from - span.from, to: span.codeBefore.to - span.from,
    };
  }
  text(from: number, to: number): PlainText {
    return { from, to, ...(this.codeBefore ? { codeBefore: {
      from: from + this.codeBefore.from, to: from + this.codeBefore.to,
    } } : {}) };
  }
}
interface PlainIndex { ranges: RangeSet<PlainRange>; hasText: boolean }
const plainIndexes = new WeakMap<Footnotes, PlainIndex>();
function seedPlainIndex(model: Footnotes) {
  plainIndexes.set(model, { hasText: model.plainText.length > 0,
    ranges: RangeSet.of(model.plainText.map((span, ordinal) =>
      new PlainRange(ordinal, span).range(span.from, span.to)), true) });
}
function plainAt(index: PlainIndex, position: number): PlainText | undefined {
  let found: PlainText | undefined, ordinal = -1;
  index.ranges.between(position, position, (from, to, value) => {
    // between has no ordering guarantee. Match the prior array binary search.
    if (from <= position && (!found || from > found.from || from === found.from && value.ordinal > ordinal)) {
      found = value.text(from, to); ordinal = value.ordinal;
    }
  });
  return found;
}
function materializedText(ranges: RangeSet<PlainRange>): PlainText[] {
  const entries: { ordinal: number; span: PlainText }[] = [];
  for (const cursor = ranges.iter(); cursor.value; cursor.next())
    entries.push({ ordinal: cursor.value.ordinal, span: cursor.value.text(cursor.from, cursor.to) });
  return entries.sort((a, b) => a.ordinal - b.ordinal).map(entry => entry.span);
}
// Separate scope prevents the getter from sharing the edit guard's closure
// context, which contains the prior editor state, model, and change set.
function indexedModel(fields: Omit<Footnotes, 'plainText'>, ranges: RangeSet<PlainRange>, hasText: boolean): Footnotes {
  let plainText: PlainText[] | undefined;
  const result: Footnotes = { ...fields,
    get plainText() { return plainText ??= materializedText(ranges); },
  };
  plainIndexes.set(result, { ranges, hasText });
  return result;
}

function parse(state: EditorState, fresh = false): Footnotes {
  const bodyFrom = syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0;
  let entries = cache.get(state.doc);
  const previous = entries?.get(bodyFrom); if (!fresh && previous) return previous;
  const result: Footnotes = { bodyFrom, definitions: [], references: [], plainText: [], codeBlocks: [] };
  const source = state.doc.sliceString(bodyFrom);
  const hasMarker = source.includes('[^');
  if (hasMarker) {
    const tree = fromMarkdown(source, { extensions: [gfmFootnote(), math()], mdastExtensions: [gfmFootnoteFromMarkdown(), mathFromMarkdown()] });
    const accepted = new Map<string, NoteDefinition>(), calls: { node: Extract<RootContent, { type: 'footnoteReference' }>; from: number; to: number }[] = [];
    function visit(node: Root | RootContent, protectedText = false, codeBefore?: Span) {
      const from = bodyFrom + (node.position?.start.offset || 0), to = bodyFrom + (node.position?.end.offset || 0);
      if (node.type === 'footnoteDefinition') {
        const definition: NoteDefinition = { from, to, identifier: node.identifier, label: node.label || node.identifier,
          duplicate: accepted.has(node.identifier), node };
        result.definitions.push(definition);
        if (!definition.duplicate) accepted.set(node.identifier, definition);
        return; // Nested definition content belongs to this source range.
      }
      if (node.type === 'code') result.codeBlocks.push({ from, to });
      else if (node.type === 'footnoteReference') calls.push({ node, from, to });
      else if (node.type === 'text') {
        const raw = source.slice(from - bodyFrom, to - bodyFrom);
        if (!protectedText && raw === node.value && !/[\[\]\\<>$&]/.test(raw))
          result.plainText.push({ from, to, ...(codeBefore?.to === from ? { codeBefore } : {}) });
      }
      else if ('children' in node) for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index], previous = node.children[index - 1];
        const code = !protectedText && ['paragraph', 'heading'].includes(node.type) && previous?.type === 'inlineCode'
          && previous.position ? { from: bodyFrom + previous.position.start.offset!, to: bodyFrom + previous.position.end.offset! } : undefined;
        visit(child, protectedText || ['link', 'linkReference', 'image', 'imageReference'].includes(node.type), code);
      }
    }
    visit(tree);
    let number = 0;
    for (const call of calls) {
      const definition = accepted.get(call.node.identifier); if (!definition) continue;
      definition.number ??= ++number;
      result.references.push({ from: call.from, to: call.to, identifier: call.node.identifier,
        label: call.node.label || call.node.identifier, number: definition.number });
    }
  }
  if (fresh) return result;
  seedPlainIndex(result);
  if (!hasMarker) markerFree.add(result);
  if (!entries) { entries = new Map(); cache.set(state.doc, entries); }
  entries.set(bodyFrom, result); return result;
}

function retainEmpty(value: Footnotes, transaction: Transaction): Footnotes | undefined {
  if (!markerFree.has(value)) return;
  const state = transaction.state;
  if ((syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0) !== value.bodyFrom) return;
  let introduced = false;
  transaction.changes.iterChanges((_from, _to, from, to) => {
    if (introduced) return;
    // A deletion can join '[' and '^'. Inspect both unchanged boundary units too.
    const start = Math.max(value.bodyFrom, from - 1), end = Math.min(state.doc.length, to + 1);
    if (start < end && state.doc.sliceString(start, end).includes('[^')) introduced = true;
  });
  return introduced ? undefined : value;
}

const proseText = /^[\p{L}\p{N}\p{M} \t]*$/u;
const wordCharacter = /^[\p{L}\p{N}\p{M}]$/u;
const codeWord = /^[\p{L}\p{N}\p{M}]*$/u;
const prosePunctuation = /^[\p{L}\p{N}\p{M} \t,.;:!?]*$/u;
const proseNeighbour = /^[\p{L}\p{N}\p{M} \t]$/u;
function neighbour(state: EditorState, position: number, before: boolean): Span & { text: string } {
  // Read at most two UTF-16 units, then retain one complete code point.
  const source = before ? state.sliceDoc(Math.max(0, position - 2), position)
    : state.sliceDoc(position, Math.min(state.doc.length, position + 2));
  const points = Array.from(source), text = (before ? points[points.length - 1] : points[0]) || '';
  return { from: before ? position - text.length : position, to: before ? position : position + text.length, text };
}

// Only guarded text edits can retain note content and map its source ranges.
function mapStableSpans(value: Footnotes, transaction: Transaction): Footnotes | undefined {
  const { startState, state, changes } = transaction;
  const index = plainIndexes.get(value)!;
  if ((syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0) !== value.bodyFrom ||
    (!index.hasText && !value.codeBlocks.length)) return;
  const edits: { from: number; to: number; insert: string }[] = [];
  changes.iterChanges((from, to, _a, _b, insert) => edits.push({ from, to, insert: insert.toString() }));
  for (const edit of edits) {
    const removed = startState.sliceDoc(edit.from, edit.to);
    const neighbours = [neighbour(startState, edit.from, true), neighbour(startState, edit.to, false)];
    const retained = (point: Span) => !edits.some(change =>
      overlaps(point, change) || (change.from === change.to && change.from > point.from && change.from < point.to));
    const line = startState.doc.lineAt(edit.from);
    if (edit.to > line.to) return;
    // Resolve the published Markdown node, without entering mounted code languages.
    // Missing coverage uses fresh parsing. No code value or AST is cached here.
    const code = syntaxTree(startState).resolve(edit.from, 1);
    if (code.name === 'CodeText' && codeWord.test(edit.insert) && codeWord.test(removed) &&
      neighbours.every(point => wordCharacter.test(point.text) && retained(point) &&
        point.from >= code.from && point.to <= code.to && point.from >= line.from && point.to <= line.to) &&
      !edits.some(change => change !== edit && change.from === change.to &&
        neighbours.some(point => change.from >= point.from && change.from <= point.to))) {
      let low = 0, high = value.codeBlocks.length;
      while (low < high) { const middle = (low + high) >> 1; if (value.codeBlocks[middle].from < edit.from) low = middle + 1; else high = middle; }
      const span = value.codeBlocks[low - 1];
      if (span && neighbours[0].from > span.from && neighbours[1].to < span.to) continue;
    }
    if (!prosePunctuation.test(edit.insert) || !prosePunctuation.test(removed)) return;
    const span = plainAt(index, edit.from);
    if (!span || edit.to >= span.to) return;
    // Every change must retain both complete neighboring code points.
    if (edit.from === span.from) {
      const code = span.codeBefore, right = neighbours[1];
      if (!code || code.to !== span.from || code.from < line.from || !retained(code) ||
        edits.some(change => change.from === code.from) || !retained(right) ||
        right.to > span.to || !proseNeighbour.test(right.text)) return;
      continue; // The unchanged code delimiters protect this text's left edge.
    }
    if (!neighbours.every(retained)) return;
    // Removing letters between digits can create an ordered-list marker.
    if (neighbours.every(point => /^[0-9]$/.test(point.text))) return;
    const wordEdit = proseText.test(edit.insert) && proseText.test(removed) && neighbours.every(point => wordCharacter.test(point.text));
    if (!wordEdit) {
      if (edit.from <= line.from || edit.to >= line.to || !neighbours.every(point => proseNeighbour.test(point.text))) return;
      // A retained letter before the edit protects the block prefix and keeps
      // this line nonblank. Limit the search; longer gaps use full parsing.
      const from = Math.max(line.from, span.from, edit.from - 128);
      const prefix = startState.sliceDoc(from, edit.from);
      const letters = Array.from(prefix.matchAll(/\p{L}/gu));
      const letter = letters[letters.length - 1];
      if (!letter || !retained({ from: from + letter.index!, to: from + letter.index! + letter[0].length })) return;
    }
  }
  if (edits.every(edit => edit.insert.length === edit.to - edit.from)) return value;
  const map = <T extends Span>(span: T): T => ({ ...span, from: changes.mapPos(span.from, 1), to: changes.mapPos(span.to, -1) });
  const bodyFrom = changes.mapPos(value.bodyFrom, -1);
  const definitions = value.definitions.map(note => {
    const mapped = map(note); if (mapped.from === note.from && mapped.to === note.to) return note;
    const node = structuredClone(note.node);
    function positions(child: Root | RootContent) {
      if (child.position) for (const edge of ['start', 'end'] as const) {
        const point = child.position[edge]; if (point.offset == null) continue;
        const absolute = changes.mapPos(value.bodyFrom + point.offset, edge === 'start' ? 1 : -1);
        const line = state.doc.lineAt(absolute), first = state.doc.lineAt(bodyFrom);
        point.offset = absolute - bodyFrom; point.line = line.number - first.number + 1;
        point.column = absolute - (line.number === first.number ? bodyFrom : line.from) + 1;
      }
      if ('children' in child) for (const nested of child.children) positions(nested);
    }
    positions(node); return { ...mapped, node };
  });
  return indexedModel({ bodyFrom, definitions, references: value.references.map(map), codeBlocks: value.codeBlocks.map(map) },
    index.ranges.map(changes), index.hasText);
}

export const footnoteField = StateField.define<Footnotes>({
  create: state => parse(state),
  update(value, transaction) {
    if (transaction.docChanged) return retainEmpty(value, transaction) || mapStableSpans(value, transaction) || parse(transaction.state);
    return (syntaxTree(transaction.state).topNode.getChild('Frontmatter')?.to || 0) !== value.bodyFrom ? parse(transaction.state) : value;
  },
});
export const freshFootnotes = (state: EditorState) => parse(state, true);
export const footnotes = (state: EditorState) => state.field(footnoteField, false) || parse(state);
export const overlaps = (a: Span, b: Span) => a.from < b.to && a.to > b.from;
export function footnoteSource(state: EditorState, from: number, to = from) {
  const model = footnotes(state);
  return model.definitions.some(note => from <= note.to && to >= note.from) ||
    model.references.some(note => from === to ? from >= note.from && from <= note.to : overlaps({ from, to }, note));
}
export function definitionAt(state: EditorState, position: number) {
  return footnotes(state).definitions.some(note => position >= note.from && position <= note.to);
}

export function renderFootnote(definition: NoteDefinition): string {
  const root: Root = { type: 'root', children: definition.node.children };
  const tree = toHast(root, { allowDangerousHtml: false, handlers: {
    html: (_state, node) => ({ type: 'text', value: node.value }),
    image: (_state, node) => ({ type: 'text', value: node.alt || '' }),
    imageReference: (_state, node) => ({ type: 'text', value: node.alt || '' }),
    link: (state, node) => ({ type: 'element', tagName: 'span', properties: {}, children: state.all(node) }),
    linkReference: (state, node) => ({ type: 'element', tagName: 'span', properties: {}, children: state.all(node) }),
    footnoteReference: (_state, node) => ({ type: 'text', value: `[^${node.label || node.identifier}]` }),
    footnoteDefinition: (state, node) => ({ type: 'element', tagName: 'div', properties: {}, children: state.all(node) }),
    math: (_state, node) => ({ type: 'element', tagName: 'div', properties: { className: ['footnote-math'], dataDisplay: 'true' },
      children: [{ type: 'text', value: `$$\n${node.value}\n$$` }] }),
    inlineMath: (_state, node) => ({ type: 'element', tagName: 'span', properties: { className: ['footnote-math'], dataDisplay: 'false' },
      children: [{ type: 'text', value: `$${node.value}$` }] }),
  } });
  return DOMPurify.sanitize(toHtml(tree!), { FORBID_TAGS: ['script', 'style', 'a', 'img', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset', 'action', 'formaction'] });
}
