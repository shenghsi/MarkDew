import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { openSearchPanel, search, searchKeymap } from '@codemirror/search';
import MarkdownIt from 'markdown-it';
import { endTableEdit, tableCellEffect, tableCellField, tableComposing } from './table';
import { footnotes, overlaps } from './footnotes';

import { MarkDewSearchPanel, setPendingSearchMode, SearchMode } from './search-panel';

export const composing = (view: EditorView) => view.compositionStarted || tableComposing(view);
export const find = (view: EditorView, mode?: SearchMode) => {
  if (!endTableEdit(view)) return false;
  if (mode) setPendingSearchMode(mode);
  return openSearchPanel(view);
};
export const guardedSearchKeymap = searchKeymap.map(binding => ({ ...binding,
  run: binding.run ? (view: EditorView) => endTableEdit(view) ? (binding.key === 'Mod-f' && setPendingSearchMode('search'), binding.run!(view)) : true : undefined,
  shift: binding.shift ? (view: EditorView) => endTableEdit(view) ? binding.shift!(view) : true : undefined,
}));
export function searchSupport(getView: () => EditorView) {
  const searchAction = (transaction: { isUserEvent(event: string): boolean }) =>
    transaction.isUserEvent('input.replace') || transaction.isUserEvent('select.search');
  return [search({ top: true, createPanel: view => new MarkDewSearchPanel(view) }), EditorState.transactionFilter.of(transaction =>
    searchAction(transaction) && composing(getView()) ? [] : transaction),
  EditorState.transactionExtender.of(transaction => searchAction(transaction)
    ? { effects: tableCellEffect.of(null) } : null)];
}

export interface Heading { from: number; to: number; level: number; label: string }
const markdown = new MarkdownIt({ html: false });
const headingLabels = new Map<string, string>();
export const refreshOutline = StateEffect.define<null>();
export const headings = (state: EditorState): Heading[] => collectHeadings(state, true);
export const freshHeadings = (state: EditorState): Heading[] => collectHeadings(state, false);
function collectHeadings(state: EditorState, prune: boolean): Heading[] {
  const result: Heading[] = [];
  const definitions = footnotes(state).definitions;
  syntaxTree(state).iterate({ enter(node) {
    if (node.name === 'Frontmatter') return false;
    if (prune && /^(Paragraph|FencedCode|CodeBlock|HTMLBlock|Table|HorizontalRule)$/.test(node.name)) return false;
    if (definitions.some(note => node.from >= note.from && node.to <= note.to)) return false;
    if (!/^(ATXHeading[1-6]|SetextHeading[12])$/.test(node.name)) return;
    if (definitions.some(note => overlaps(node, note))) return false;
    const source = state.doc.sliceString(node.from, node.to);
    let content = source, level = Number(node.name.slice(-1));
    if (node.name.startsWith('SetextHeading')) {
      const marker = node.node.lastChild!; level = state.doc.sliceString(marker.from, marker.to).trim().startsWith('=') ? 1 : 2;
      content = state.doc.sliceString(node.from, marker.from).trimEnd();
    } else content = source.replace(/^#{1,6}\s*/, '').replace(/\s+#+\s*$/, '');
    let label = headingLabels.get(source);
    if (label === undefined) {
      const tokens = markdown.parseInline(content, {})[0]?.children || [];
      label = tokens.map(token => ['text', 'code_inline', 'image'].includes(token.type) ? token.content :
        token.type === 'softbreak' || token.type === 'hardbreak' ? ' ' : '').join('');
      if (source.length <= 4096) {
        if (headingLabels.size >= 1024) headingLabels.delete(headingLabels.keys().next().value!);
        headingLabels.set(source, label);
      }
    }
    result.push({ from: node.from, to: node.to, level, label: label || 'Untitled heading' });
    return false;
  } });
  return result;
}

export function outline(container: HTMLElement) {
  return ViewPlugin.fromClass(class {
    tree;
    entries: Heading[] = [];
    buttons: HTMLButtonElement[] = [];
    current = -1;
    constructor(readonly view: EditorView) { this.tree = syntaxTree(view.state); this.render(); }
    update(update: ViewUpdate) {
      const tree = syntaxTree(update.state);
      if (update.docChanged || tree !== this.tree || update.transactions.some(transaction => transaction.effects.some(effect => effect.is(refreshOutline)))) {
        const focused = this.buttons.indexOf(document.activeElement as HTMLButtonElement);
        const position = focused < 0 ? undefined : update.changes.mapPos(this.entries[focused].from, 1);
        this.tree = tree; this.render(position);
      } else if (update.selectionSet || update.startState.field(tableCellField, false) !== update.state.field(tableCellField, false)) this.markCurrent();
    }
    markCurrent() {
      const position = this.view.state.field(tableCellField, false)?.cellFrom ?? this.view.state.selection.main.head;
      let low = 0, high = this.entries.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (this.entries[middle].from <= position) low = middle + 1; else high = middle;
      }
      const current = low - 1;
      if (current === this.current) return;
      this.buttons[this.current]?.removeAttribute('aria-current');
      this.buttons[current]?.setAttribute('aria-current', 'location');
      this.current = current;
    }
    render(focusedPosition?: number) {
      this.entries = []; this.buttons = []; this.current = -1;
      if (container.hidden || container.closest?.('[hidden]') != null) { container.replaceChildren(); return; }
      const list = document.createElement('ul'); list.setAttribute('aria-label', 'Document headings');
      this.entries = headings(this.view.state);
      for (const [index, heading] of this.entries.entries()) {
        const item = document.createElement('li'), button = document.createElement('button');
        this.buttons.push(button);
        button.textContent = heading.label; button.style.paddingLeft = `${12 + (heading.level - 1) * 12}px`;
        button.addEventListener('mousedown', event => event.preventDefault());
        button.addEventListener('keydown', event => {
          if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || composing(this.view)) return;
          const target = event.key === 'ArrowDown' ? Math.min(index + 1, this.buttons.length - 1) :
            event.key === 'ArrowUp' ? Math.max(0, index - 1) : event.key === 'Home' ? 0 :
              event.key === 'End' ? this.buttons.length - 1 : -1;
          if (target < 0 || !button.isConnected) return;
          event.preventDefault(); this.buttons[target].focus();
        });
        button.addEventListener('click', () => {
          if (!button.isConnected || !endTableEdit(this.view)) return;
          this.view.dispatch({ selection: { anchor: heading.from }, effects: EditorView.scrollIntoView(heading.from, { y: 'start' }) });
          this.view.focus();
        });
        item.append(button); list.append(item);
      }
      container.replaceChildren(list);
      this.markCurrent();
      if (focusedPosition !== undefined && this.buttons.length) {
        let index = this.entries.findIndex(heading => heading.from >= focusedPosition);
        if (index < 0) index = this.buttons.length - 1;
        this.buttons[index].focus();
      }
    }
    destroy() { container.replaceChildren(); }
  });
}
