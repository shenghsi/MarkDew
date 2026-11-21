import { Chunk } from '@codemirror/merge';
import { EditorState, type Extension, StateEffect, StateField, Text } from '@codemirror/state';
import { type BlockInfo, EditorView, type PluginValue, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { compareDiffConfig } from './compare-diff';

export type ChangeKind = 'added' | 'modified' | 'deleted';

export interface ChangeIndicatorState {
  readonly base: Text | null;
  readonly chunks: readonly Chunk[];
}

export const setChangeBaseline = StateEffect.define<string | null>();

function normalizeText(source: string): Text {
  const raw = source.startsWith('\uFEFF') ? source.slice(1) : source;
  const normalized = raw.replace(/\r\n|\r/g, '\n');
  return Text.of(normalized.split('\n'));
}

export const changeIndicatorField = StateField.define<ChangeIndicatorState>({
  create() {
    return { base: null, chunks: [] };
  },
  update(state, transaction) {
    let base = state.base;
    let baseChanged = false;
    for (const effect of transaction.effects) {
      if (effect.is(setChangeBaseline)) {
        base = effect.value === null ? null : normalizeText(effect.value);
        baseChanged = true;
      }
    }
    if (!base) {
      return state.base === null && state.chunks.length === 0 ? state : { base: null, chunks: [] };
    }
    if (baseChanged) {
      return { base, chunks: Chunk.build(base, transaction.state.doc, compareDiffConfig) };
    }
    if (transaction.docChanged) {
      return {
        base,
        chunks: Chunk.updateB(state.chunks, base, transaction.state.doc, transaction.changes, compareDiffConfig),
      };
    }
    return state;
  },
});

export function chunkKind(chunk: Chunk): ChangeKind {
  if (chunk.fromA === chunk.toA) return 'added';
  if (chunk.fromB === chunk.toB) return 'deleted';
  return 'modified';
}

interface IndicatorBar {
  readonly kind: ChangeKind;
  readonly top: number;
  readonly height: number;
  readonly atEnd?: boolean;
}

function blockSpanForPos(blocks: readonly BlockInfo[], pos: number): BlockInfo | undefined {
  if (!blocks.length) return undefined;
  let low = 0;
  let high = blocks.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const block = blocks[mid];
    if (pos < block.from) {
      high = mid - 1;
    } else if (pos > block.to && mid < blocks.length - 1 && pos >= blocks[mid + 1].from) {
      low = mid + 1;
    } else {
      return block;
    }
  }
  return blocks[Math.max(0, Math.min(blocks.length - 1, low))];
}

class ChangeIndicatorsPlugin implements PluginValue {
  readonly dom: HTMLElement;
  private frame = 0;
  private destroyed = false;

  constructor(private readonly view: EditorView) {
    this.dom = document.createElement('div');
    this.dom.className = 'cm-change-indicators';
    this.dom.setAttribute('aria-hidden', 'true');
    this.view.scrollDOM.appendChild(this.dom);
    this.render();
  }

  update(update: ViewUpdate) {
    const prev = update.startState.field(changeIndicatorField, false);
    const next = update.state.field(changeIndicatorField, false);
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.geometryChanged ||
      update.heightChanged ||
      prev !== next
    ) {
      this.render();
    }
  }

  private computeBars(): IndicatorBar[] {
    const state = this.view.state.field(changeIndicatorField, false);
    if (!state || !state.base || state.chunks.length === 0) return [];

    const doc = this.view.state.doc;
    const vp = this.view.viewport;
    const blocks = this.view.viewportLineBlocks;
    const bars: IndicatorBar[] = [];

    for (const chunk of state.chunks) {
      if (chunk.fromB > vp.to && chunk.fromB > doc.length) break;
      if (chunk.toB < vp.from && chunk.fromB < vp.from) continue;
      if (chunk.fromB > vp.to && chunk.toB > vp.to) break;

      const kind = chunkKind(chunk);
      if (kind === 'deleted') {
        const clampedPos = Math.min(chunk.fromB, doc.length);
        const atEnd = chunk.fromB >= doc.length && doc.length > 0;
        const block = blockSpanForPos(blocks, clampedPos) ?? this.view.lineBlockAt(clampedPos);
        const top = atEnd ? block.bottom : block.top;
        bars.push({ kind: 'deleted', top, height: 0, atEnd });
      } else {
        const startPos = Math.min(chunk.fromB, doc.length);
        const endPos = Math.min(chunk.endB, doc.length);
        const startBlock = blockSpanForPos(blocks, startPos) ?? this.view.lineBlockAt(startPos);
        const endBlock = blockSpanForPos(blocks, endPos) ?? this.view.lineBlockAt(endPos);
        const top = startBlock.top;
        const bottom = Math.max(top + 2, endBlock.bottom);
        bars.push({ kind, top, height: bottom - top });
      }
    }
    return bars;
  }

  render() {
    if (this.destroyed) return;
    const bars = this.computeBars();
    if (bars.length === 0) {
      if (this.dom.childElementCount > 0) this.dom.replaceChildren();
      return;
    }

    const contentRect = this.view.contentDOM.getBoundingClientRect();
    const scrollerRect = this.view.scrollDOM.getBoundingClientRect();
    const guttersDom = this.view.scrollDOM.querySelector<HTMLElement>('.cm-gutters');
    let leftOffset = 0;
    if (guttersDom && scrollerRect.width > 0) {
      leftOffset = Math.max(0, guttersDom.getBoundingClientRect().right - scrollerRect.left + this.view.scrollDOM.scrollLeft);
    } else if (scrollerRect.width > 0 && contentRect.left > scrollerRect.left) {
      leftOffset = Math.max(0, contentRect.left - scrollerRect.left + this.view.scrollDOM.scrollLeft);
    }
    this.dom.style.left = `${leftOffset}px`;
    this.dom.style.top = `${this.view.documentPadding.top}px`;

    const children: HTMLElement[] = [];
    for (const bar of bars) {
      const el = document.createElement('div');
      el.className = `cm-change-indicator cm-change-${bar.kind}${bar.atEnd ? ' cm-change-deleted-end' : ''}`;
      el.dataset.changeKind = bar.kind;
      el.style.top = `${bar.top}px`;
      if (bar.kind !== 'deleted') {
        el.style.height = `${bar.height}px`;
      }
      children.push(el);
    }
    this.dom.replaceChildren(...children);
  }

  destroy() {
    this.destroyed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.dom.remove();
  }
}

const changeIndicatorsPlugin = ViewPlugin.fromClass(ChangeIndicatorsPlugin);

export function changeIndicators(initialBaseline: string | null = null): Extension {
  return [
    initialBaseline === null
      ? changeIndicatorField
      : changeIndicatorField.init(state => {
          const base = normalizeText(initialBaseline);
          return { base, chunks: Chunk.build(base, state.doc, compareDiffConfig) };
        }),
    changeIndicatorsPlugin,
  ];
}
