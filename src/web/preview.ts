import { EditorState, Range, RangeSet, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { Tree, SyntaxNode } from '@lezer/common';
import { mathRanges } from './math-ranges';
import { mountResult, renderDiagram } from './renderers';
import { mountPhrasingHTML } from './phrasing-html';
import { mountBlockHTML } from './block-html';
import { TableEditor, tableCellEffect, tableCellField, tableComposing, tableEditor, tableHistoryView, tableImageVersion } from './table';
import { blockItems, Marker, MarkerWidget } from './block-preview';
import { imageDocument, imagePath, imageReader, ImageInfo, mountImage, setImagePath } from './images';
import { footnoteField, footnotes, Footnotes, NoteDefinition, overlaps } from './footnotes';
import { mountFootnote } from './footnote-renderer';
import { physicalLines } from './physical-lines';
import { createIndex, updateIndex, Index, Counts } from './preview-index';
import { noteEligible, stableNotes } from './preview-note-index';
import { clickOffsetInNode } from './dom-coords';
import { codeFenceInput } from './code-fence-input';

type Kind = 'math' | 'mermaid' | 'html' | 'inline-html' | 'table' | 'image' | 'frontmatter' | 'footnote' | 'footnote-definition';
interface Item { from: number; to: number; kind?: Kind; source?: string; block?: boolean;
  phrasingType?: 'paragraph' | 'heading';
  quoteDepth?: number;
  revealFrom?: number;
  revealTo?: number;
  codeTab?: { language: string; fenceFrom: number; fenceTo: number; fence: string };
  codeClose?: boolean;
  replaceFrom?: number;
  listMarkers?: Marker[];
  listDepth?: number;
  className?: string; hide?: { from: number; to: number }[]; line?: boolean; style?: string; marker?: Marker; image?: ImageInfo; imageVersion?: number; imageBodyFrom?: number;
  note?: { label: string; number?: number; duplicate?: boolean }; definition?: NoteDefinition }
interface Group { from: number; to: number; items: Item[] }
interface PlanBase { tree: Tree; decorations: DecorationSet; imagePath: string; imageVersion: number; groups?: Group[]; noteAware?: boolean }
interface FullPlan extends PlanBase { mode: 'full'; items: Item[]; index?: Index; ordinaryItems?: Item[]; ordinaryGroups?: Group[] }
interface IndexedPlan extends PlanBase { mode: 'indexed'; index: Index; localCounts: Counts }
type Plan = FullPlan | IndexedPlan;

export const setEditorActive = StateEffect.define<boolean>();

export const editorActiveField = StateField.define<boolean>({
  create() {
    return false;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setEditorActive)) return effect.value;
      if (effect.is(tableCellEffect)) return true;
    }
    if (!value) {
      if (tr.docChanged || tr.selection || tr.isUserEvent('select') || tr.isUserEvent('input') || tr.isUserEvent('delete')) {
        return true;
      }
    }
    return value;
  },
});

export function selected(state: EditorState, from: number, to: number) {
  if (state.field(editorActiveField, false) === false) return false;
  return state.selection.ranges.some(range => range.from <= to && range.to >= from);
}
const selectionFrom = (item: Item) => Math.min(item.listMarkers?.[0].ownerFrom ?? item.marker?.ownerFrom ?? item.from,
  item.revealFrom ?? item.from);
const selectionTo = (item: Item) => item.revealTo ?? item.listMarkers?.[0].ownerTo ?? item.marker?.ownerTo ?? item.to;
export class CodeTypeTabWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly fenceFrom: number,
    readonly fenceTo: number,
    readonly fence: string
  ) {
    super();
  }

  eq(other: CodeTypeTabWidget) {
    return this.language === other.language &&
      this.fenceFrom === other.fenceFrom &&
      this.fenceTo === other.fenceTo &&
      this.fence === other.fence;
  }

  updateDOM(dom: HTMLElement): boolean {
    const input = dom.querySelector<HTMLInputElement>('.code-type-input');
    if (!input) return false;
    if (document.activeElement !== input) {
      input.value = this.language;
      const len = Math.max(input.value.length, input.placeholder.length);
      input.style.width = `${Math.min(160, Math.max(52, len * 7.5 + 16))}px`;
    }
    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const tab = document.createElement('span');
    tab.className = 'code-type-tab';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'code-type-input';
    input.value = this.language;
    input.placeholder = 'Language';
    input.setAttribute('aria-label', 'Code language');
    input.spellcheck = false;
    input.autocomplete = 'off';

    const updateWidth = () => {
      const len = Math.max(input.value.length, input.placeholder.length);
      input.style.width = `${Math.min(160, Math.max(52, len * 7.5 + 16))}px`;
    };
    updateWidth();

    input.addEventListener('input', updateWidth);
    input.addEventListener('mousedown', e => { e.stopPropagation(); });
    input.addEventListener('pointerdown', e => { e.stopPropagation(); });
    input.addEventListener('click', e => { e.stopPropagation(); });

    let committed = false;
    const commit = () => {
      if (committed || view.state.readOnly) return;
      const newLang = input.value.trim();
      if (newLang !== this.language) {
        committed = true;
        const line = view.state.doc.lineAt(Math.min(view.state.doc.length, this.fenceFrom));
        const lineText = line.text;
        const fenceMatch = lineText.match(/^([ \t]*)(`{3,}|~{3,})/);
        const prefix = fenceMatch ? fenceMatch[0] : this.fence;
        view.dispatch({
          changes: { from: line.from, to: line.to, insert: prefix + newLang },
          userEvent: 'input'
        });
      }
    };

    input.addEventListener('change', commit);
    input.addEventListener('blur', commit);

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        view.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = this.language;
        updateWidth();
        input.blur();
        view.focus();
      }
      e.stopPropagation();
    });

    tab.appendChild(input);
    return tab;
  }
}

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
    const reveal = (point?: { x: number; y: number }) => {
      if (view.compositionStarted || tableComposing(view) || view.state.readOnly) return;
      tableEditor(dom)?.finish();
      const from = Number(dom.dataset.from);
      const to = Number(dom.dataset.to);
      let targetPos = from;
      let foundOffset = false;
      if (point && (point.x !== 0 || point.y !== 0)) {
        const bodyNode = dom.querySelector('pre, .preview-inline-html-body') || dom;
        const domOffset = clickOffsetInNode(bodyNode, point);
        if (domOffset !== null) {
          targetPos = Math.max(from, Math.min(to, from + domOffset));
          foundOffset = true;
        }
      }
      view.dispatch({ selection: { anchor: targetPos }, scrollIntoView: true });
      view.focus();
      if (point && (point.x !== 0 || point.y !== 0)) {
        const coordPos = view.posAtCoords(point);
        const minPos = replacementFrom(item);
        if (coordPos !== null && coordPos >= minPos && coordPos <= to) {
          view.dispatch({ selection: { anchor: coordPos } });
        }
      }
    };
    dom.addEventListener('mousedown', event => {
      if (item.listMarkers && (event.target as HTMLElement).closest('.md-list-marker, .md-task-toggle')) return;
      if (item.kind === 'table' && (event.target as HTMLElement).closest('th, td, .table-actions, .table-tools')) return;
      event.preventDefault();
      const mouse = event as MouseEvent;
      reveal({ x: mouse.clientX, y: mouse.clientY });
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
        from: item.from, to: item.to,
        path: state.field(imagePath, false) || '',
        document: state.facet(imageDocument) }, () => view.requestMeasure()));
    } else if (item.kind === 'table') new TableEditor(dom, view, item.from, item.to, item.source!);
    else {
      dom.textContent = 'Rendering…';
      const promise = item.kind === 'math' ? import('./math-renderer').then(module => module.renderMath(item.source!, !!item.block))
        : renderDiagram(item.source!);
      if (item.kind === 'mermaid') diagramViews.set(dom, { source: item.source!, view });
      cancellations.set(dom, mountResult(dom, promise, () => view.requestMeasure()));
    }
    return dom;
  }
  destroy(dom: HTMLElement) { tableEditor(dom)?.destroy(); cancellations.get(dom)?.(); cancellations.delete(dom); }
  get estimatedHeight() { return this.item.block ? (this.item.kind === 'html' ? 24 : 100) : -1; }
}
const cancellations = new WeakMap<HTMLElement, () => void>();
const diagramViews = new WeakMap<HTMLElement, { source: string; view: EditorView }>();
// Diagram settings change layout, so mounted diagrams render again with the new options.
export function rerenderDiagrams(root: ParentNode = document) {
  for (const dom of Array.from(root.querySelectorAll<HTMLElement>('.preview-mermaid'))) {
    const entry = diagramViews.get(dom); if (!entry || !dom.isConnected) continue;
    cancellations.get(dom)?.(); dom.classList.remove('preview-error');
    cancellations.set(dom, mountResult(dom, renderDiagram(entry.source), () => entry.view.requestMeasure()));
  }
}

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
    if (name === 'FencedCode' || name === 'CodeBlock') {
      const startLine = state.doc.lineAt(from);
      const endPos = (to > from && state.doc.lineAt(to).from === to) ? to - 1 : to;
      const endLine = state.doc.lineAt(endPos);

      if (name === 'FencedCode') {
        const info = children(node).find(child => child.name === 'CodeInfo');
        const language = info ? read(info.from, info.to).trim().split(/\s/)[0] : '';
        const code = children(node).find(child => child.name === 'CodeText');
        const firstMark = children(node).find(child => child.name === 'CodeMark');
        const marks = children(node).filter(child => child.name === 'CodeMark');
        const closingMark = marks.length > 1 ? marks[marks.length - 1] : null;
        const fenceStr = firstMark ? read(firstMark.from, firstMark.to) : '```';
        const fenceChar = fenceStr[0];
        const fenceLen = fenceStr.length;
        const swallowed = code ? new RegExp(`(?:^|\\n)[ ]{0,3}${fenceChar}{${fenceLen},}`).test(read(code.from, code.to)) : false;

        if (!closingMark || swallowed) {
          const codeFrom = firstMark ? firstMark.from : startLine.from;
          if (startLine.to > codeFrom) {
            items.push({
              from: codeFrom,
              to: startLine.to,
              className: 'md-code',
            });
          }
          return false;
        }

        if (language === 'mermaid' || language === 'math' || language === 'latex') {
          items.push({ from, to, kind: language === 'mermaid' ? 'mermaid' : 'math', source: code ? read(code.from, code.to) : '', block: true });
          return false;
        }

        const tabFrom = firstMark ? firstMark.from : startLine.from;
        const hasCodeLines = endLine.number > startLine.number + 1;

        if (hasCodeLines) {
          // Opening fence line is collapsed to 0px
          items.push({
            from: startLine.from,
            to: startLine.to,
            className: 'md-code-fence-hidden',
            line: true,
          });
          if (startLine.to >= tabFrom) {
            items.push({
              from: tabFrom,
              to: startLine.to,
              codeClose: true,
            });
          }

          // Interactive Language Tab anchored to first actual code line
          const firstCodeLine = state.doc.line(startLine.number + 1);
          items.push({
            from: firstCodeLine.from,
            to: firstCodeLine.from,
            codeTab: {
              language,
              fenceFrom: tabFrom,
              fenceTo: startLine.to,
              fence: fenceStr,
            }
          });

          // Actual code lines: startLine.number + 1 to endLine.number - 1
          for (let lineNo = startLine.number + 1; lineNo <= endLine.number - 1; lineNo++) {
            const line = state.doc.line(lineNo);
            const isFirst = lineNo === startLine.number + 1;
            const isLast = lineNo === endLine.number - 1;
            const classes = ['md-code-line'];
            if (isFirst) classes.push('md-code-first');
            if (isLast) classes.push('md-code-last');
            items.push({
              from: line.from,
              to: line.to,
              className: classes.join(' '),
              line: true,
            });
          }

          // Closing fence line is collapsed to 0px
          items.push({
            from: endLine.from,
            to: endLine.to,
            className: 'md-code-fence-hidden',
            line: true,
          });
          if (closingMark) {
            items.push({
              from: closingMark.from,
              to: closingMark.to,
              codeClose: true,
            });
          }
        } else {
          // Empty or 1-line code block without separate code lines
          // Keep startLine visible so user can see and click to write code
          items.push({
            from: startLine.from,
            to: startLine.to,
            className: 'md-code-line md-code-first' + (endLine.number === startLine.number ? ' md-code-last' : ''),
            line: true,
          });
          if (startLine.to >= tabFrom) {
            items.push({
              from: tabFrom,
              to: startLine.to,
              codeTab: {
                language,
                fenceFrom: tabFrom,
                fenceTo: startLine.to,
                fence: fenceStr,
              }
            });
          }

          if (endLine.number > startLine.number) {
            items.push({
              from: endLine.from,
              to: endLine.to,
              className: 'md-code-fence-hidden',
              line: true,
            });
            if (closingMark) {
              items.push({
                from: closingMark.from,
                to: closingMark.to,
                codeClose: true,
              });
            }
          }
        }

        if (code) {
          items.push({ from: code.from, to: code.to, className: 'md-code-block' });
        }
        return false;
      } else {
        items.push({ from, to, className: 'md-code-block' });
        for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo++) {
          const line = state.doc.line(lineNo);
          const isFirst = lineNo === startLine.number;
          const isLast = lineNo === endLine.number;
          const classes = ['md-code-line'];
          if (isFirst) classes.push('md-code-first');
          if (isLast) classes.push('md-code-last');
          items.push({
            from: line.from,
            to: line.to,
            className: classes.join(' '),
            line: true,
          });
        }
        return false;
      }
    }
    if (name === 'HTMLBlock' || name === 'Table') {
      const blockSource = read(from, to);
      const isHtmlImg = name === 'HTMLBlock' && (blockSource.includes('<img') || blockSource.includes('<IMG'));
      if (name === 'Table' || isHtmlImg) hasImage = true;
      items.push({ from, to, kind: name === 'Table' ? 'table' : 'html', source: blockSource, block: true,
        ...(name === 'Table' || isHtmlImg ? { imageVersion: state.field(tableImageVersion, false) || 0,
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
  return { ...span(item), ...(item.revealFrom === undefined ? {} : { revealFrom: item.revealFrom + offset }),
    ...(item.revealTo === undefined ? {} : { revealTo: item.revealTo + offset }),
    ...(item.codeTab ? { codeTab: { ...item.codeTab, fenceFrom: item.codeTab.fenceFrom + offset, fenceTo: item.codeTab.fenceTo + offset } } : {}),
    ...(item.codeClose ? { codeClose: true } : {}),
    ...(item.hide ? { hide: item.hide.map(span) } : {}),
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
    } else if (item.codeTab) {
      const widget = new CodeTypeTabWidget(item.codeTab.language, item.codeTab.fenceFrom, item.codeTab.fenceTo, item.codeTab.fence);
      if (item.from === item.to) {
        ranges.push(Decoration.widget({ widget, side: 1 }).range(item.from));
      } else {
        ranges.push(Decoration.replace({ widget }).range(item.from, item.to));
      }
    } else if (item.codeClose) {
      if (item.to > item.from) {
        ranges.push(Decoration.replace({}).range(item.from, item.to));
      }
    } else if (item.kind) {
      if ((!isSelected || editing) && item.to > item.from) {
        ranges.push(Decoration.replace({ widget: new PreviewWidget(item), block: !!item.block }).range(replacementFrom(item), item.to));
      }
    } else {
      if (item.line) {
        ranges.push(Decoration.line({ attributes: { class: item.className!, ...(item.style ? { style: item.style } : {}) } }).range(lineStart));
      } else if (item.className) ranges.push(Decoration.mark({ class: item.className }).range(item.from, item.to));
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
  if (before.selection.eq(after.selection) && before.field(editorActiveField, false) === after.field(editorActiveField, false)) return plan.decorations;
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

export const previewField = StateField.define<Plan>({
  create(state) {
    const tree = syntaxTree(state), items = collectCachedPreview(state, tree);
    return { mode: 'full', tree, items, ...fullDecorations(state, items),
      imagePath: state.field(imagePath, false) || '', imageVersion: 0 };
  },
  update(plan, transaction) {
    const tree = syntaxTree(transaction.state);
    const path = transaction.state.field(imagePath, false) || '', pathChanged = path !== plan.imagePath ||
      transaction.startState.facet(imageDocument) !== transaction.state.facet(imageDocument) || transaction.effects.some(effect => effect.is(setImagePath));
    const oldCell = transaction.startState.field(tableCellField, false), cell = transaction.state.field(tableCellField, false);
    const sameTable = oldCell?.from === cell?.from && oldCell?.to === cell?.to;
    const oldActive = transaction.startState.field(editorActiveField, false);
    const newActive = transaction.state.field(editorActiveField, false);
    const activeChanged = oldActive !== newActive;
    if (!transaction.docChanged && !transaction.selection && tree === plan.tree &&
      !pathChanged && sameTable && !activeChanged && !transaction.reconfigured) return plan;
    if (!transaction.docChanged && tree === plan.tree && !pathChanged &&
      sameTable && !transaction.reconfigured && plan.mode === 'full') {
      if (plan.noteAware && plan.index && plan.ordinaryItems) {
        const ordinaryGroups = plan.ordinaryGroups || previewGroups(transaction.state, plan.ordinaryItems);
        const ordinary = selectionDecorations({ items: plan.ordinaryItems, decorations: plan.index.decorations },
          transaction.startState, transaction.state, ordinaryGroups);
        return { ...plan, ordinaryGroups, index: { ...plan.index, decorations: ordinary },
          decorations: RangeSet.join([ordinary, previewDecorations(transaction.state, plan.items.filter(isNote), true)]) };
      }
      const groups = plan.groups || previewGroups(transaction.state, plan.items);
      const decorations = selectionDecorations(plan, transaction.startState, transaction.state, groups);
      // If separate ordinary items are unavailable, discard the note index.
      // Never replace ordinary ranges with the combined selection projection.
      return { ...plan, groups, decorations, index: plan.noteAware ? undefined : plan.index && { ...plan.index, decorations }, noteAware: undefined };
    }
    const imageVersion = plan.imageVersion + (pathChanged ? 1 : 0);
    if (transaction.docChanged && plan.index && !pathChanged && !oldCell && !cell &&
      !transaction.reconfigured && transaction.effects.length === 0) {
      const local = (!plan.noteAware || stableNotes(transaction)) ? updateIndex(plan.index, transaction, (state, region) => {
        const all = collectPreview(state, region, imageVersion), items = plan.noteAware ? all.filter(item => !isNote(item)) : all;
        if (plan.noteAware && items.some(item => item.kind)) return;
        return { decorations: previewDecorations(state, items, true), items: items.length };
      }, undefined, plan.noteAware ? noteEligible : undefined) : undefined;
      if (local) return { mode: 'indexed', tree, index: local.index, localCounts: local.counts,
        decorations: plan.noteAware ? RangeSet.join([local.index.decorations,
          previewDecorations(transaction.state, withFootnotes(transaction.state, [], footnotes(transaction.state)), true)]) : local.index.decorations,
        noteAware: plan.noteAware, imagePath: path, imageVersion };
    }
    const items = transaction.docChanged || tree !== plan.tree || pathChanged || activeChanged || plan.mode === 'indexed'
      ? collectCachedPreview(transaction.state, tree, imageVersion) : plan.items;
    return { mode: 'full', tree, items, ...fullDecorations(transaction.state, items),
      imagePath: path, imageVersion };
  },
  provide: field => EditorView.decorations.from(field, plan => plan.decorations),
});
const codeHoverPlugin = EditorView.domEventHandlers({
  mouseover(event) {
    const target = (event.target as HTMLElement)?.closest?.('.cm-line.md-code-line');
    if (target) {
      let tab = target.querySelector<HTMLElement>('.code-type-tab');
      if (!tab) {
        let prev = target.previousElementSibling;
        while (prev && prev.classList.contains('md-code-line')) {
          tab = prev.querySelector<HTMLElement>('.code-type-tab');
          if (tab) break;
          prev = prev.previousElementSibling;
        }
      }
      if (tab && !tab.classList.contains('visible')) {
        tab.classList.add('visible');
      }
    }
  },
  mouseout(event) {
    const target = (event.target as HTMLElement)?.closest?.('.cm-line.md-code-line');
    if (target) {
      const rel = (event as MouseEvent).relatedTarget as HTMLElement | null;
      if (!rel || !rel.closest?.('.cm-line.md-code-line, .code-type-tab')) {
        let tab = target.querySelector<HTMLElement>('.code-type-tab');
        if (!tab) {
          let prev = target.previousElementSibling;
          while (prev && prev.classList.contains('md-code-line')) {
            tab = prev.querySelector<HTMLElement>('.code-type-tab');
            if (tab) break;
            prev = prev.previousElementSibling;
          }
        }
        tab?.classList.remove('visible');
      }
    }
  }
});

// Explicit diagnostic materialization. Indexed edits never build the complete
// absolute item array in their state-update clock or retain a prior state.
export function previewItems(state: EditorState): Item[] {
  const plan = state.field(previewField);
  return plan.mode === 'full' ? plan.items : collectPreview(state, syntaxTree(state), plan.imageVersion);
}

function computeBlankLines(state: EditorState): DecorationSet {
  const codeRanges: { from: number; to: number }[] = [];
  const tableRanges: { from: number; to: number }[] = [];
  syntaxTree(state).iterate({
    enter(ref) {
      const node = ref.node;
      if (node.name === 'FencedCode') {
        const firstMark = children(node).find(child => child.name === 'CodeMark');
        const marks = children(node).filter(child => child.name === 'CodeMark');
        const closingMark = marks.length > 1 ? marks[marks.length - 1] : null;
        const code = children(node).find(child => child.name === 'CodeText');
        const fenceStr = firstMark ? state.doc.sliceString(firstMark.from, firstMark.to) : '```';
        const fenceChar = fenceStr[0];
        const fenceLen = fenceStr.length;
        const swallowed = code ? new RegExp(`(?:^|\\n)[ ]{0,3}${fenceChar}{${fenceLen},}`).test(state.doc.sliceString(code.from, code.to)) : false;
        if (closingMark && !swallowed) {
          codeRanges.push({ from: node.from, to: node.to });
        }
        return false;
      }
      if (node.name === 'CodeBlock') {
        codeRanges.push({ from: node.from, to: node.to });
        return false;
      }
      if (node.name === 'Table') {
        tableRanges.push({ from: node.from, to: node.to });
        return false;
      }
    }
  });

  const builder = new RangeSetBuilder<Decoration>();
  const blankDeco = Decoration.line({ attributes: { class: 'md-blank-line' } });
  const blockDeco = Decoration.line({ attributes: { class: 'md-blank-line-block' } });
  let codeIdx = 0;

  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    if (line.text.trim().length === 0) {
      while (codeIdx < codeRanges.length && codeRanges[codeIdx].to < line.from) {
        codeIdx++;
      }
      const inCode = codeIdx < codeRanges.length &&
        line.from >= codeRanges[codeIdx].from &&
        line.to <= codeRanges[codeIdx].to;

      const isSelected = selected(state, line.from, line.to);

      if (!inCode && !isSelected) {
        let isAdjacentToTable = false;
        if (i < state.doc.lines) {
          const nextLine = state.doc.line(i + 1);
          if (tableRanges.some(r => nextLine.from >= r.from && nextLine.to <= r.to)) {
            isAdjacentToTable = true;
          }
        }
        if (!isAdjacentToTable && i > 1) {
          const prevLine = state.doc.line(i - 1);
          if (tableRanges.some(r => prevLine.from >= r.from && prevLine.to <= r.to)) {
            isAdjacentToTable = true;
          }
        }

        if (isAdjacentToTable) {
          builder.add(line.from, line.from, blockDeco);
        } else {
          builder.add(line.from, line.from, blankDeco);
        }
      }
    }
  }
  return builder.finish();
}

export const blankLineField = StateField.define<DecorationSet>({
  create(state) {
    return computeBlankLines(state);
  },
  update(decorations, tr) {
    if (!tr.docChanged && !tr.selection && syntaxTree(tr.state) === syntaxTree(tr.startState) &&
        !tr.effects.some(e => e.is(setEditorActive))) {
      return decorations;
    }
    return computeBlankLines(tr.state);
  },
  provide: field => EditorView.decorations.from(field),
});

export const livePreview = [codeFenceInput, editorActiveField, footnoteField, tableCellField, tableImageVersion, previewField, tableHistoryView, codeHoverPlugin, blankLineField];
