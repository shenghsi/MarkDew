// Inactive static-point experiment, derived from the retained viewport snapshot.
// All points and marks stay static. Production never imports this file.
import { EditorState, Range, RangeSet, StateField, Transaction } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { Tree, SyntaxNode } from '@lezer/common';
import { mathRanges } from '../../../../src/web/math-ranges';
import { mountResult, renderDiagram } from '../../../../src/web/renderers';
import { mountPhrasingHTML } from '../../../../src/web/phrasing-html';
import { mountBlockHTML } from '../../../../src/web/block-html';
import { TableEditor, tableCellField, tableComposing, tableEditor, tableHistoryView, tableImageVersion } from '../../../../src/web/table';
import { blockItems, Marker, MarkerWidget } from '../../../../src/web/block-preview';
import { imageDocument, imagePath, imageReader, ImageInfo, mountImage, setImagePath } from '../../../../src/web/images';
import { footnoteField, footnotes, Footnotes, NoteDefinition, overlaps } from '../../../../src/web/footnotes';
import { mountFootnote } from '../../../../src/web/footnote-renderer';
import { physicalLines } from '../../../../src/web/physical-lines';
import { completeDocument, createIndex, Index, Counts } from '../../../../src/web/preview-index';
import { updateIndex } from './fallback-observer';
import { noteEligible, stableNotes } from '../../../../src/web/preview-note-index';

type Kind = 'math' | 'mermaid' | 'html' | 'inline-html' | 'table' | 'image' | 'frontmatter' | 'footnote' | 'footnote-definition';
interface Item { from: number; to: number; kind?: Kind; source?: string; block?: boolean;
  phrasingType?: 'paragraph' | 'heading';
  quoteDepth?: number;
  revealFrom?: number;
  replaceFrom?: number;
  listMarkers?: Marker[];
  listDepth?: number;
  className?: string; hide?: { from: number; to: number }[]; line?: boolean; style?: string; marker?: Marker; image?: ImageInfo; imageVersion?: number; imageBodyFrom?: number;
  note?: { label: string; number?: number; duplicate?: boolean }; definition?: NoteDefinition }
interface Group { from: number; to: number; items: Item[] }
interface PlanBase { layers?: Layers; ordinaryLayers?: Layers; tree: Tree; decorations: DecorationSet; imagePath: string; imageVersion: number; groups?: Group[]; noteAware?: boolean;
  certificate?: { decorations: DecorationSet; length: number; mappedEdits: number };
  retained?: boolean; retentionStarts?: number; retentionEnds?: number }
interface FullPlan extends PlanBase { mode: 'full'; items: Item[]; index?: Index; ordinaryItems?: Item[]; ordinaryGroups?: Group[] }
interface IndexedPlan extends PlanBase { mode: 'indexed'; index: Index; localCounts: Counts }
type Plan = FullPlan | IndexedPlan;

export function selected(state: EditorState, from: number, to: number) {
  return state.selection.ranges.some(range => range.from <= to && range.to >= from);
}
const selectionFrom = (item: Item) => Math.min(item.listMarkers?.[0].ownerFrom ?? item.marker?.ownerFrom ?? item.from,
  item.revealFrom ?? item.from);
const selectionTo = (item: Item) => item.listMarkers?.[0].ownerTo ?? item.marker?.ownerTo ?? item.to;
const replacementFrom = (item: Item) => item.replaceFrom ?? item.from;

class PreviewWidget extends WidgetType {
  constructor(readonly item: Item) { super(); }
  eq(other: PreviewWidget) {
    return this.item.from === other.item.from && this.item.to === other.item.to &&
      this.item.kind === other.item.kind && this.item.source === other.item.source && this.item.block === other.item.block &&
      this.item.phrasingType === other.item.phrasingType &&
      this.item.quoteDepth === other.item.quoteDepth &&
      this.item.revealFrom === other.item.revealFrom &&
      this.item.replaceFrom === other.item.replaceFrom && this.item.listDepth === other.item.listDepth &&
      JSON.stringify(this.item.listMarkers) === JSON.stringify(other.item.listMarkers) &&
      JSON.stringify(this.item.image) === JSON.stringify(other.item.image) && this.item.imageVersion === other.item.imageVersion &&
      this.item.imageBodyFrom === other.item.imageBodyFrom &&
      JSON.stringify(this.item.note) === JSON.stringify(other.item.note);
  }
  updateDOM(dom: HTMLElement, view: EditorView) {
    if (this.item.kind !== 'table') return false;
    dom.dataset.from = String(this.item.from); dom.dataset.to = String(this.item.to);
    return tableEditor(dom)?.refresh(this.item.from, this.item.to, this.item.source!) || false;
  }
  toDOM(view: EditorView): HTMLElement {
    const { item } = this;
    const dom = document.createElement(item.block ? 'div' : 'span');
    dom.className = `preview-widget preview-${item.kind}`;
    dom.dataset.from = String(item.from); dom.dataset.to = String(item.to);
    dom.tabIndex = item.kind === 'table' ? -1 : 0; dom.setAttribute('role', item.kind === 'table' || item.listMarkers ? 'group' : 'button');
    dom.setAttribute('aria-label', item.kind === 'table' ? 'Editable table' : `Edit ${item.kind === 'frontmatter' ? 'front matter' : item.kind === 'inline-html' ? 'HTML text' : item.kind} source`);
    const reveal = () => {
      if (view.compositionStarted || tableComposing(view) || view.state.readOnly) return;
      tableEditor(dom)?.finish();
      view.dispatch({ selection: { anchor: Number(dom.dataset.from) }, scrollIntoView: true }); view.focus();
    };
    dom.addEventListener('mousedown', event => {
      if (item.listMarkers && (event.target as HTMLElement).closest('.md-list-marker, .md-task-toggle')) return;
      if (item.kind === 'table' && (event.target as HTMLElement).closest('th, td, .table-actions, .table-tools')) return;
      event.preventDefault(); reveal();
    });
    dom.addEventListener('click', event => {
      if (item.listMarkers && (event.target as HTMLElement).closest('.md-list-marker, .md-task-toggle')) return;
      event.preventDefault();
    });
    dom.addEventListener('keydown', event => {
      if (event.defaultPrevented) return;
      if (item.listMarkers && (event.target as HTMLElement).closest('.md-list-marker, .md-task-toggle')) return;
      if (item.kind === 'table' && (event.target as HTMLElement).closest('th, td, .table-actions, .table-tools')) return;
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') { event.preventDefault(); reveal(); }
    });
    if (item.kind === 'footnote') {
      const number = document.createElement('sup'); number.textContent = String(item.note!.number); dom.append(number);
      dom.setAttribute('aria-label', `Edit footnote ${item.note!.number}: ${item.note!.label}`);
    } else if (item.kind === 'footnote-definition') {
      const caption = document.createElement('span'); caption.className = 'preview-caption';
      caption.textContent = `Footnote ${item.note!.number || item.note!.label}${item.note!.duplicate ? ' · duplicate definition' : ''} · select to edit`;
      const body = document.createElement('div'); dom.append(caption, body);
      cancellations.set(dom, mountFootnote(body, item.definition!, () => view.requestMeasure()));
      dom.setAttribute('aria-label', `Edit footnote definition: ${item.note!.label}`);
    } else if (item.kind === 'frontmatter') {
      const caption = document.createElement('span'); caption.className = 'preview-caption'; caption.textContent = 'Front matter · select to edit';
      const source = document.createElement('pre'); source.textContent = item.source!; dom.append(caption, source);
    } else if (item.kind === 'image') cancellations.set(dom, mountImage(dom, item.image!, () => view.requestMeasure()));
    else if (item.kind === 'inline-html') {
      const state = view.state, bodyFrom = syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0;
      if (item.quoteDepth) { dom.classList.add('md-quote'); dom.style.setProperty('--quote-depth', String(item.quoteDepth)); }
      let body = dom;
      if (item.listMarkers) {
        dom.classList.add('preview-list-paragraph'); dom.style.setProperty('--list-depth', String(item.listDepth || 0));
        body = document.createElement('div'); body.className = 'preview-inline-html-body';
        const markers = item.listMarkers.map(marker => new MarkerWidget(marker).toDOM(view));
        if (markers.length === 1) dom.append(markers[0], body);
        else {
          const prefix = document.createElement('span'); prefix.className = 'preview-list-markers';
          prefix.append(...markers); dom.append(prefix, body);
        }
        dom.dataset.ready = 'loading';
      }
      cancellations.set(dom, mountPhrasingHTML(body, { source: item.source!, doc: state.doc, bodyFrom,
        from: item.from, to: item.to, type: item.phrasingType!,
        notes: footnotes(state).references.filter(note => note.from >= item.from && note.to <= item.to)
          .map(note => ({ from: note.from - item.from, to: note.to - item.from, number: note.number })),
        path: state.field(imagePath, false) || '', document: state.facet(imageDocument) }, () => {
          if (body !== dom) {
            dom.dataset.ready = body.dataset.ready; dom.title = body.title;
            dom.classList.toggle('preview-html', body.classList.contains('preview-html'));
          }
          view.requestMeasure();
        }));
    }
    else if (item.kind === 'html') {
      const state = view.state, bodyFrom = syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0;
      cancellations.set(dom, mountBlockHTML(dom, { source: item.source!, doc: state.doc, bodyFrom,
        from: item.from, to: item.to }, () => view.requestMeasure()));
    } else if (item.kind === 'table') new TableEditor(dom, view, item.from, item.to, item.source!);
    else {
      dom.textContent = 'Rendering…';
      const promise = item.kind === 'math' ? import('../../../../src/web/math-renderer').then(module => module.renderMath(item.source!, !!item.block))
        : renderDiagram(item.source!);
      cancellations.set(dom, mountResult(dom, promise, () => view.requestMeasure()));
    }
    return dom;
  }
  destroy(dom: HTMLElement) { tableEditor(dom)?.destroy(); cancellations.get(dom)?.(); cancellations.delete(dom); }
  get estimatedHeight() { return this.item.block ? (this.item.kind === 'html' ? 200 : 100) : -1; }
}
const cancellations = new WeakMap<HTMLElement, () => void>();

function children(node: SyntaxNode) {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) result.push(child);
  return result;
}
function hasInlineHTML(node: SyntaxNode): boolean {
  return node.name === 'HTMLTag' || children(node).some(hasInlineHTML);
}

function analyzePreview(state: EditorState, tree: Tree, imageVersion: number,
  readImage: ReturnType<typeof imageReader>, notes: Footnotes) {
  const blocks: Item[] = blockItems(state, tree), items: Item[] = [];
  const markersByLine = new Map<number, Marker[]>();
  for (const block of blocks) if (block.marker) {
    const lineFrom = state.doc.lineAt(block.marker.from).from;
    const markers = markersByLine.get(lineFrom) || [];
    markers.push(block.marker); markersByLine.set(lineFrom, markers);
  }
  const read = (from: number, to: number) => state.doc.sliceString(from, to);
  let hasImage = false;
  tree.iterate({ enter(ref) {
    const node = ref.node, { from, to, name } = node;
    if (notes.definitions.some(note => from >= note.from && to <= note.to)) return false;
    if (name === 'Frontmatter') {
      if (to > from) items.push({ from, to, className: 'md-frontmatter-source' });
      if (children(node).filter(child => child.name === 'DashLine').length === 2)
        items.push({ from, to, kind: 'frontmatter', source: read(from, to), block: true });
      return false;
    }
    if (name === 'Image') {
      hasImage = true;
      if (items.some(item => item.kind === 'math' && item.from <= from && item.to >= to)) return false;
      const image = readImage(read(from, to));
      if (image) items.push({ from, to, kind: 'image', image, imageVersion });
      return false;
    }
    if (name === 'FencedCode') {
      const info = children(node).find(child => child.name === 'CodeInfo');
      const language = info ? read(info.from, info.to).trim().split(/\s/)[0] : '';
      const code = children(node).find(child => child.name === 'CodeText');
      if (language === 'mermaid' || language === 'math' || language === 'latex') {
        items.push({ from, to, kind: language === 'mermaid' ? 'mermaid' : 'math', source: code ? read(code.from, code.to) : '', block: true });
      } else {
        const marks = children(node).filter(child => child.name === 'CodeMark' || child.name === 'CodeInfo');
        items.push({ from, to, className: 'md-code-block', hide: marks.map(child => ({ from: child.from, to: child.to })) });
      }
      return false;
    }
    if (name === 'HTMLBlock' || name === 'Table') {
      if (name === 'Table') hasImage = true; // Reference images depend on source outside the table.
      items.push({ from, to, kind: name === 'Table' ? 'table' : 'html', source: read(from, to), block: true,
        ...(name === 'Table' ? { imageVersion: state.field(tableImageVersion, false) || 0,
          imageBodyFrom: syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0 } : {}) }); return false;
    }
    if (name === 'Paragraph' || name === 'Task' || /^ATXHeading/.test(name) || /^SetextHeading/.test(name)) {
      const taskMarker = name === 'Task' ? node.getChild('TaskMarker') : null;
      const contentFrom = taskMarker ? taskMarker.to + (read(taskMarker.to, state.doc.lineAt(taskMarker.to).to).match(/^[ \t]+/)?.[0].length || 0) : from;
      const source = read(contentFrom, to);
      if (hasInlineHTML(node)) {
        hasImage = true; // Inline HTML resources depend on the full reference environment.
        let quoteDepth = 0, listDepth = 0;
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (parent.name === 'Blockquote') quoteDepth++;
          if (parent.name === 'ListItem') listDepth++;
        }
        const lineFrom = state.doc.lineAt(contentFrom).from;
        const listMarkers = (markersByLine.get(lineFrom) || []).filter(marker =>
          marker.to <= contentFrom && marker.ownerFrom <= from && marker.ownerTo >= to)
          .sort((a, b) => a.from - b.from);
        items.push({ from: contentFrom, to, kind: 'inline-html', source, block: true,
          phrasingType: name === 'Paragraph' || name === 'Task' ? 'paragraph' : 'heading',
          revealFrom: lineFrom,
          replaceFrom: lineFrom,
          ...(listMarkers.length ? { listMarkers, listDepth: Math.max(0, listDepth - listMarkers.length) } : {}),
          ...(quoteDepth ? { quoteDepth } : {}),
          imageVersion: state.field(tableImageVersion, false) || 0,
          imageBodyFrom: syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0 }); return false;
      }
      if (source.includes('$')) for (const math of mathRanges(source)) {
        items.push({ from: contentFrom + math.from, to: contentFrom + math.to, kind: 'math', source: math.formula, block: math.block });
      }
      const level = /^(?:ATXHeading|SetextHeading)(\d)$/.exec(name)?.[1] || '';
      if (level) items.push({ from, to, className: `md-heading md-h${level}`, line: true,
        hide: children(node).filter(child => child.name === 'HeaderMark').map(child => ({ from: child.from, to: child.to })) });
    }
    // Lezer can treat an unresolved footnote as a shortcut link. Keep its marks.
    if (name === 'Link' && read(from, to).startsWith('[^') &&
      !children(node).some(child => child.name === 'URL' || child.name === 'LinkLabel')) return false;
    const className = ({ StrongEmphasis: 'md-strong', Emphasis: 'md-emphasis', Strikethrough: 'md-strike', InlineCode: 'md-code', Link: 'md-link' } as Record<string, string>)[name];
    if (className) items.push({ from, to, className,
      hide: children(node).filter(child => /^(EmphasisMark|StrikethroughMark|CodeMark|LinkMark|LinkLabel|URL|LinkTitle)$/.test(child.name)).map(child => ({ from: child.from, to: child.to })) });
  } });
  return { blocks, items, hasImage };
}

function withFootnotes(state: EditorState, items: Item[], notes: Footnotes): Item[] {
  const read = (from: number, to: number) => state.doc.sliceString(from, to);
  const ordinary = items.filter(item => !notes.definitions.some(note => overlaps(item, note)) &&
    !notes.references.some(note => item.from >= note.from && item.to <= note.to));
  for (const note of notes.references) {
    if (ordinary.some(item => item.kind && item.from <= note.from && item.to >= note.to)) continue;
    ordinary.push({ from: note.from, to: note.to, kind: 'footnote', source: read(note.from, note.to), note: { label: note.label, number: note.number } });
  }
  for (const definition of notes.definitions) ordinary.push({ from: definition.from, to: definition.to,
    kind: 'footnote-definition', source: read(definition.from, definition.to), note: { label: definition.label, number: definition.number, duplicate: definition.duplicate }, definition, block: true });
  return ordinary;
}

function previewImageReader(state: EditorState, tree: Tree) {
  const bodyFrom = tree.topNode.getChild('Frontmatter')?.to || 0;
  return imageReader(() => state.doc.sliceString(bodyFrom), state.field(imagePath, false) || '', state.facet(imageDocument));
}

// The full traversal remains the reference for incremental integration checks.
export function collectPreview(state: EditorState, tree: Tree, imageVersion = 0): Item[] {
  const notes = footnotes(state), analysis = analyzePreview(state, tree, imageVersion, previewImageReader(state, tree), notes);
  return withFootnotes(state, [...analysis.blocks, ...analysis.items], notes);
}

interface BlockAnalysis { source: string; prefix: number; from: number; blocks: Item[]; items: Item[] }
const blockCache = new WeakMap<Tree, BlockAnalysis>();
const maxEnvelope = 65536;

function shiftItem(item: Item, offset: number): Item {
  const span = <T extends { from: number; to: number }>(value: T): T => ({ ...value, from: value.from + offset, to: value.to + offset });
  return { ...span(item), ...(item.revealFrom === undefined ? {} : { revealFrom: item.revealFrom + offset }), ...(item.hide ? { hide: item.hide.map(span) } : {}),
    ...(item.replaceFrom === undefined ? {} : { replaceFrom: item.replaceFrom + offset }),
    ...(item.listMarkers ? { listMarkers: item.listMarkers.map(marker => ({ ...span(marker), ownerFrom: marker.ownerFrom + offset, ownerTo: marker.ownerTo + offset })) } : {}),
    ...(item.marker ? { marker: { ...span(item.marker), ownerFrom: item.marker.ownerFrom + offset, ownerTo: item.marker.ownerTo + offset } } : {}) };
}

export function collectCachedPreview(state: EditorState, tree: Tree, imageVersion = 0): Item[] {
  if (tree.topNode.name !== 'Document') return collectPreview(state, tree, imageVersion);
  const nodes: SyntaxNode[] = [];
  function visit(node: SyntaxNode): boolean {
    if (node.name === 'Document') {
      for (let child = node.firstChild; child; child = child.nextSibling) if (!visit(child)) return false;
    } else {
      // Syntax-node navigation enters the mounted Markdown body and skips
      // anonymous balancing nodes. Buffered top-level nodes use the reference.
      if (!node.tree || node.tree.length !== node.to - node.from) return false;
      nodes.push(node);
    }
    return true;
  }
  if (!visit(tree.topNode)) return collectPreview(state, tree, imageVersion);
  const notes = footnotes(state), readImage = previewImageReader(state, tree), lines = physicalLines(state.doc);
  const blocks: Item[] = [], items: Item[] = [];
  for (const node of nodes) {
    const key = node.tree!, from = node.from, to = node.to;
    const start = lines.lineAt(from).from, end = lines.lineAt(to).to;
    const allowed = end - start <= maxEnvelope && !notes.definitions.some(note => overlaps({ from: start, to: end }, note));
    const source = allowed ? lines.slice(start, end) : '', prefix = from - start;
    const previous = allowed ? blockCache.get(key) : undefined;
    if (previous && previous.source === source && previous.prefix === prefix) {
      const offset = from - previous.from;
      const current = offset ? { ...previous, from,
        blocks: previous.blocks.map(item => shiftItem(item, offset)), items: previous.items.map(item => shiftItem(item, offset)) } : previous;
      if (offset) blockCache.set(key, current);
      for (const item of current.blocks) blocks.push(item);
      for (const item of current.items) items.push(item);
      continue;
    }
    const wrapper = new Tree(tree.type, [key], [from], state.doc.length);
    const analysis = analyzePreview(state, wrapper, imageVersion, readImage, notes);
    for (const item of analysis.blocks) blocks.push(item);
    for (const item of analysis.items) items.push(item);
    // Do not retain a substring of the complete temporary snapshot in this cache.
    if (allowed && !analysis.hasImage) blockCache.set(key, { source: state.doc.sliceString(start, end), prefix, from, blocks: analysis.blocks, items: analysis.items });
  }
  return withFootnotes(state, [...blocks, ...items], notes);
}

interface ItemRanges { selected: boolean; editing: boolean; lineStart: number; ranges: Range<Decoration>[] }
// Items are immutable. Shifted source ranges and changed content get new items.
// Weak keys release ranges with their item; entries retain no editor state.
const rangeCache = new WeakMap<Item, ItemRanges>();

export function previewDecorations(state: EditorState, items: Item[], reuse = false): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const replacements: Item[] = [];
  const revealedHTML = items.filter(item => item.kind === 'inline-html' && selected(state, selectionFrom(item), selectionTo(item)))
    .sort((left, right) => left.from - right.from);
  const overlapsRevealedHTML = (from: number, to: number) => {
    let low = 0, high = revealedHTML.length;
    while (low < high) { const middle = (low + high) >> 1;
      if (revealedHTML[middle].from <= to) low = middle + 1; else high = middle; }
    return low > 0 && revealedHTML[low - 1].to >= from;
  };
  const active = state.field(tableCellField, false);
  for (const item of items) {
    const isSelected = selected(state, selectionFrom(item), selectionTo(item))
      || !!(!item.kind && item.hide && overlapsRevealedHTML(item.from, item.to));
    const editing = !!(item.kind === 'table' && active?.from === item.from && active.to === item.to);
    const lineStart = item.line ? state.doc.lineAt(item.from).from : -1;
    if (item.kind && (!isSelected || editing) && item.to > item.from) replacements.push(item);
    const cached = reuse ? rangeCache.get(item) : undefined;
    if (cached && cached.selected === isSelected && cached.editing === editing && cached.lineStart === lineStart) {
      for (const range of cached.ranges) ranges.push(range);
      continue;
    }
    const start = ranges.length;
    if (item.marker) {
      if (!isSelected)
        ranges.push(Decoration.replace({ widget: new MarkerWidget(item.marker) }).range(item.from, item.to));
    } else if (item.kind) {
      if ((!isSelected || editing) && item.to > item.from) {
        ranges.push(Decoration.replace({ widget: new PreviewWidget(item), block: !!item.block }).range(replacementFrom(item), item.to));
      }
    } else {
      if (item.line) ranges.push(Decoration.line({ attributes: { class: item.className!, ...(item.style ? { style: item.style } : {}) } }).range(lineStart));
      else if (item.className) ranges.push(Decoration.mark({ class: item.className }).range(item.from, item.to));
      if (!isSelected) for (const hide of item.hide || []) {
        if (hide.to > hide.from) ranges.push(Decoration.replace({}).range(hide.from, hide.to));
      }
    }
    if (reuse) rangeCache.set(item, { selected: isSelected, editing, lineStart, ranges: ranges.slice(start) });
  }
  // With no replacements, the suppression pass retains every range. Keep the
  // full pass in the fresh reference so checks do not share this shortcut.
  if (reuse && replacements.length === 0) return Decoration.set(ranges, true);
  // A math replacement must not overlap hidden Markdown marks inside its source.
  replacements.sort((a, b) => replacementFrom(a) - replacementFrom(b));
  const replacementAt = (position: number) => {
    let low = 0, high = replacements.length;
    while (low < high) { const middle = (low + high) >> 1;
      if (replacementFrom(replacements[middle]) <= position) low = middle + 1; else high = middle; }
    return low > 0 ? replacements[low - 1] : undefined;
  };
  return Decoration.set(ranges.filter(range => {
    const containing = replacementAt(range.from);
    if (range.value.spec.widget) return !(range.value.spec.widget instanceof MarkerWidget &&
      containing?.listMarkers?.some(marker => marker.from === range.from && marker.to === range.to));
    if (containing && range.to <= containing.to) return false;
    if (range.value.spec.attributes?.class === 'md-quote') {
      const end = state.doc.lineAt(range.from).to, replacement = replacementAt(end);
      // The semantic widget owns this paragraph's quote border. Do not leave
      // another border on the hidden prefix line. Other quote lines stay intact.
      if (replacement?.kind === 'inline-html' && replacement.quoteDepth && replacement.to >= end) return false;
    }
    return true;
  }), true);
}

// A replacement and every mark it can suppress must be updated together.
// List owner ranges and physical line starts also belong to that group.
function previewGroups(state: EditorState, items: Item[]): Group[] {
  const spans = items.map(item => ({ item,
    from: Math.min(item.from, item.revealFrom ?? item.from, replacementFrom(item), selectionFrom(item),
      item.line ? state.doc.lineAt(item.from).from : item.from, ...(item.hide || []).map(span => span.from)),
    to: Math.max(item.to, selectionTo(item), ...(item.hide || []).map(span => span.to))
  })).sort((a, b) => a.from - b.from || a.to - b.to);
  const groups: Group[] = [];
  for (const span of spans) {
    const previous = groups[groups.length - 1];
    if (previous && span.from <= previous.to) {
      previous.to = Math.max(previous.to, span.to); previous.items.push(span.item);
    } else groups.push({ from: span.from, to: span.to, items: [span.item] });
  }
  return groups;
}

function selectionDecorations(plan: Pick<FullPlan, 'items' | 'decorations'>, before: EditorState, after: EditorState, groups: Group[]): DecorationSet {
  if (before.selection.eq(after.selection)) return plan.decorations;
  const candidates = new Set<Group>();
  for (const range of [...before.selection.ranges, ...after.selection.ranges]) {
    let low = 0, high = groups.length;
    while (low < high) { const middle = (low + high) >> 1;
      if (groups[middle].to < range.from) low = middle + 1; else high = middle; }
    for (let index = low; index < groups.length && groups[index].from <= range.to; index++) candidates.add(groups[index]);
  }
  const changed = [...candidates].filter(group => group.items.some(item => {
    if (!item.marker && !item.kind && !item.hide?.length) return false;
    const from = selectionFrom(item), to = selectionTo(item);
    return selected(before, from, to) !== selected(after, from, to);
  }));
  // Large selections can touch most groups. One full construction is cheaper.
  if (changed.length > groups.length / 2) return previewDecorations(after, plan.items, true);
  let decorations = plan.decorations;
  for (const group of changed) {
    const add: Range<Decoration>[] = [];
    for (const cursor = previewDecorations(after, group.items, true).iter(); cursor.value; cursor.next())
      add.push(cursor.value.range(cursor.from, cursor.to));
    decorations = decorations.update({ filterFrom: group.from, filterTo: group.to,
      filter: (from, to) => from < group.from || to > group.to, add, sort: true });
  }
  return decorations;
}

const isNote = (item: Item) => item.kind === 'footnote' || item.kind === 'footnote-definition';
function fullDecorations(state: EditorState, items: Item[]): Pick<FullPlan, 'decorations' | 'index' | 'noteAware' | 'ordinaryItems'> {
  const cell = state.field(tableCellField, false), notes = footnotes(state);
  if (!cell && (notes.definitions.length || notes.references.length)) {
    const ordinary = items.filter(item => !isNote(item));
    // Validate before constructing layers. Ineligible documents use the full builder.
    const eligible = !ordinary.some(item => item.kind) ? createIndex(state, Decoration.none, noteEligible) : undefined;
    if (eligible) {
      const decorations = previewDecorations(state, ordinary, true), index = { ...eligible, decorations };
      return { decorations: RangeSet.join([decorations, previewDecorations(state, items.filter(isNote), true)]), index, noteAware: true, ordinaryItems: ordinary };
    }
  }
  const decorations = previewDecorations(state, items, true);
  return { decorations, index: !cell ? createIndex(state, decorations) : undefined };
}


interface Layers { marks: DecorationSet; points: DecorationSet }
export function partition(state: EditorState, decorations: DecorationSet): Layers {
  const fixed: Range<Decoration>[] = [], points: Range<Decoration>[] = [];
  for (const cursor = decorations.iter(); cursor.value; cursor.next()) {
    const value = cursor.value;
    const move = value.point;
    (move ? points : fixed).push(value.range(cursor.from, cursor.to));
  }
  return { marks: Decoration.set(fixed, true), points: Decoration.set(points, true) };
}
function projectPlan(state: EditorState, plan: Plan): Plan {
  return { ...plan, layers: partition(state, plan.decorations),
    ordinaryLayers: plan.noteAware && plan.index ? partition(state, plan.index.decorations) : undefined };
}
function patchLayers(old: Layers, transaction: import('@codemirror/state').Transaction,
  region: { from: number; to: number; layers: Layers }): Layers {
  const patch = (set: DecorationSet, addSet: DecorationSet) => {
    const add: Range<Decoration>[] = [];
    for (const cursor = addSet.iter(); cursor.value; cursor.next()) add.push(cursor.value.range(cursor.from, cursor.to));
    return set.map(transaction.changes).update({ filterFrom: region.from, filterTo: region.to,
      filter: (from, to) => to < region.from || from > region.to, add, sort: true });
  };
  return { marks: patch(old.marks, region.layers.marks), points: patch(old.points, region.layers.points) };
}

// The combined point set stays in one layer. RangeSet.join would add a layer
// for the note overlay and disable the paired comparison guard.
function patchNotePoints(old: Layers, transaction: import('@codemirror/state').Transaction,
  region: { from: number; to: number; layers: Layers }, overlay: DecorationSet): Layers {
  const mapped = patchLayers(old, transaction, region);
  let points = mapped.points;
  const notes = footnotes(transaction.state);
  for (const note of [...notes.references, ...notes.definitions]) {
    points = points.update({ filterFrom: note.from, filterTo: note.to,
      filter: (_from, _to, value) => !isNote(value.spec.widget?.item || {}) });
  }
  const add: Range<Decoration>[] = [];
  for (const cursor = overlay.iter(); cursor.value; cursor.next()) {
    if (!cursor.value.point) throw new Error('Note overlay must contain only points');
    add.push(cursor.value.range(cursor.from, cursor.to));
  }
  return { marks: mapped.marks, points: points.update({ add, sort: true }) };
}

// The separate delivery trial changes only the view facet. Both fields use the
// same parser, plan updates, local guards, and complete decoration set.
export function createPreviewField(delivery: 'static' | 'combined' = 'static', retention: 'drop' | 'map' = 'drop') {
const spec: Parameters<typeof StateField.define<Plan>>[0] = {
  create(state) {
    const tree = syntaxTree(state), items = collectCachedPreview(state, tree);
    return projectPlan(state, { mode: 'full', tree, items, ...fullDecorations(state, items),
      imagePath: state.field(imagePath, false) || '', imageVersion: 0 });
  },
  update(plan, transaction) {
    const tree = syntaxTree(transaction.state);
    const path = transaction.state.field(imagePath, false) || '', pathChanged = path !== plan.imagePath ||
      transaction.startState.facet(imageDocument) !== transaction.state.facet(imageDocument) || transaction.effects.some(effect => effect.is(setImagePath));
    const oldCell = transaction.startState.field(tableCellField, false), cell = transaction.state.field(tableCellField, false);
    const sameTable = oldCell?.from === cell?.from && oldCell?.to === cell?.to;
    if (!transaction.docChanged && !transaction.selection && tree === plan.tree &&
      !pathChanged && sameTable && !transaction.reconfigured) return plan;
    if (!transaction.docChanged && tree === plan.tree && !pathChanged &&
      sameTable && !transaction.reconfigured && plan.mode === 'full') {
      if (plan.noteAware && plan.index && plan.ordinaryItems) {
        const ordinaryGroups = plan.ordinaryGroups || previewGroups(transaction.state, plan.ordinaryItems);
        const ordinary = selectionDecorations({ items: plan.ordinaryItems, decorations: plan.index.decorations },
          transaction.startState, transaction.state, ordinaryGroups);
        return projectPlan(transaction.state, { ...plan, ordinaryGroups, index: { ...plan.index, decorations: ordinary },
          decorations: RangeSet.join([ordinary, previewDecorations(transaction.state, plan.items.filter(isNote), true)]) });
      }
      const groups = plan.groups || previewGroups(transaction.state, plan.items);
      const decorations = selectionDecorations(plan, transaction.startState, transaction.state, groups);
      // If separate ordinary items are unavailable, discard the note index.
      // Never replace ordinary ranges with the combined selection projection.
      return projectPlan(transaction.state, { ...plan, groups, decorations, index: plan.noteAware ? undefined : plan.index && { ...plan.index, decorations }, noteAware: undefined });
    }
    const imageVersion = plan.imageVersion + (pathChanged ? 1 : 0);
    if (transaction.docChanged && plan.index && !pathChanged && !oldCell && !cell &&
      !transaction.reconfigured && transaction.effects.length === 0) {
      let rebuilt: { from: number; to: number; layers: Layers } | undefined;
      const local = (!plan.noteAware || stableNotes(transaction)) ? updateIndex(plan.index, transaction, (state, region) => {
        const all = collectPreview(state, region, imageVersion), items = plan.noteAware ? all.filter(item => !isNote(item)) : all;
        if (plan.noteAware && items.some(item => item.kind)) return;
        const decorations = previewDecorations(state, items, true);
        const first = region.topNode.firstChild, last = region.topNode.lastChild;
        if (!first || !last) return;
        rebuilt = { from: first.from, to: last.to, layers: partition(state, decorations) };
        return { decorations, items: items.length };
      }, undefined, plan.noteAware ? noteEligible : undefined) : undefined;
      if (local && rebuilt) {
        const ordinaryLayers = patchLayers((plan.noteAware ? plan.ordinaryLayers : plan.layers)!, transaction, rebuilt);
        const overlay = plan.noteAware
          ? previewDecorations(transaction.state, withFootnotes(transaction.state, [], footnotes(transaction.state)), true)
          : Decoration.none;
        return { mode: 'indexed', tree, index: local.index, localCounts: local.counts,
          decorations: plan.noteAware ? RangeSet.join([local.index.decorations, overlay]) : local.index.decorations,
          layers: plan.noteAware ? patchNotePoints(plan.layers!, transaction, rebuilt, overlay) : ordinaryLayers,
          ordinaryLayers: plan.noteAware ? ordinaryLayers : undefined,
          noteAware: plan.noteAware, imagePath: path, imageVersion };
      }
    }
    const items = transaction.docChanged || tree !== plan.tree || pathChanged || plan.mode === 'indexed'
      ? collectCachedPreview(transaction.state, tree, imageVersion) : plan.items;
    return projectPlan(transaction.state, { mode: 'full', tree, items, ...fullDecorations(transaction.state, items),
      imagePath: path, imageVersion });
  },
  provide: field => delivery === 'combined' ? EditorView.decorations.from(field, plan => plan.decorations) : [
    EditorView.decorations.from(field, plan => plan.layers!.points),
    EditorView.decorations.from(field, plan => plan.layers!.marks),
  ],
};
if (retention === 'map') {
  const create = spec.create, update = spec.update;
  const certify = (plan: Plan, state: EditorState): Plan => ({ ...plan, retained: false,
    certificate: { decorations: plan.decorations, length: state.doc.length, mappedEdits: 0 } });
  spec.create = state => {
    const plan = create(state);
    return completeDocument(state) ? certify(plan, state) : plan;
  };
  spec.update = (plan: Plan, transaction: Transaction): Plan => {
    let fresh = update(plan, transaction);
    const starts = plan.retentionStarts || 0, ends = plan.retentionEnds || 0;
    if (completeDocument(transaction.state)) {
      // The first published complete body ends retention with a current-source
      // rebuild. Never certify stale ranges merely because parsing completed.
      if (plan.retained) {
        const tree = syntaxTree(transaction.state), items = collectCachedPreview(transaction.state, tree, fresh.imageVersion);
        fresh = projectPlan(transaction.state, { mode: 'full', tree, items, ...fullDecorations(transaction.state, items),
          imagePath: fresh.imagePath, imageVersion: fresh.imageVersion });
      }
      return { ...certify(fresh, transaction.state), retentionStarts: starts, retentionEnds: ends + (plan.retained ? 1 : 0) };
    }
    const certificate = plan.certificate && (transaction.docChanged ? { ...plan.certificate,
      decorations: plan.certificate.decorations.map(transaction.changes), mappedEdits: plan.certificate.mappedEdits + 1 } : plan.certificate);
    if (certificate && (plan.retained || (transaction.docChanged && fresh.mode === 'full'))) {
      // Inactive causal control only: mapped display can have stale syntax,
      // resource content, selection reveal, and widget item positions.
      // Its certificate stays tied to the last complete source, not this state.
      return projectPlan(transaction.state, { ...fresh, mode: 'full', items: fresh.mode === 'full' ? fresh.items : [], decorations: certificate.decorations,
        index: undefined, noteAware: undefined, ordinaryItems: undefined, ordinaryGroups: undefined,
        groups: undefined, certificate, retained: true,
        retentionStarts: starts + (plan.retained ? 0 : 1), retentionEnds: ends });
    }
    return { ...fresh, certificate, retained: false, retentionStarts: starts, retentionEnds: ends };
  };
}
return StateField.define<Plan>(spec);
}
export const previewField = createPreviewField();
export const combinedPreviewField = createPreviewField('combined');
export const retainedPreviewField = createPreviewField('combined', 'map');
// Explicit diagnostic materialization. Indexed edits never build the complete
// absolute item array in their state-update clock or retain a prior state.
export function previewItems(state: EditorState): Item[] {
  const plan = state.field(previewField);
  return plan.mode === 'full' ? plan.items : collectPreview(state, syntaxTree(state), plan.imageVersion);
}

export const livePreview = [footnoteField, tableCellField, tableImageVersion, previewField, tableHistoryView];
export const combinedLivePreview = [footnoteField, tableCellField, tableImageVersion, combinedPreviewField, tableHistoryView];
export const retainedLivePreview = [footnoteField, tableCellField, tableImageVersion, retainedPreviewField, tableHistoryView];

