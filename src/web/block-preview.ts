import { EditorState } from '@codemirror/state';
import { EditorView, WidgetType } from '@codemirror/view';
import { Tree } from '@lezer/common';
import { endTableEdit } from './table';

export interface Marker {
  from: number; to: number; ownerFrom: number; ownerTo: number;
  text: string; task: boolean; label: string;
}
export interface BlockItem {
  from: number; to: number; marker?: Marker; className?: string; line?: boolean;
  style?: string; hide?: { from: number; to: number }[];
}
export function blockItems(state: EditorState, tree: Tree): BlockItem[] {
  const result: BlockItem[] = [], quoteLines = new Map<number, number>();
  tree.iterate({ enter(ref) {
    const node = ref.node;
    if (node.name === 'Blockquote') {
      let line = state.doc.lineAt(node.from);
      while (line.from < node.to) {
        quoteLines.set(line.from, (quoteLines.get(line.from) || 0) + 1);
        if (line.number === state.doc.lines) break;
        line = state.doc.line(line.number + 1);
      }
    }
    if (['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter'].includes(node.name)) return false;
    if (node.name === 'ListMark' || node.name === 'TaskMarker') {
      let owner = node.parent;
      while (owner && owner.name !== 'ListItem') owner = owner.parent;
      const marker: Marker = { from: node.from, to: node.to,
        ownerFrom: owner?.from ?? node.from, ownerTo: owner?.to ?? node.to,
        text: state.doc.sliceString(node.from, node.to), task: node.name === 'TaskMarker',
        label: state.doc.sliceString(node.to, state.doc.lineAt(node.to).to).trim() };
      if (!marker.task && /^[-+*]$/.test(marker.text) && node.nextSibling?.name === 'Task') {
        result.push({ from: marker.ownerFrom, to: marker.ownerTo, hide: [{ from: marker.from, to: marker.to }] });
        return;
      }
      result.push({ from: node.from, to: node.to, marker });
    }
    if (node.name === 'QuoteMark') {
      const line = state.doc.lineAt(node.from);
      result.push({ from: line.from, to: line.to, hide: [{ from: node.from, to: node.to }] });
    }
  } });
  for (const [from, depth] of quoteLines) result.push({ from, to: state.doc.lineAt(from).to,
    className: 'md-quote', line: true, style: `--quote-depth: ${depth}` });
  return result;
}

export class MarkerWidget extends WidgetType {
  constructor(readonly marker: Marker) { super(); }
  eq(other: MarkerWidget) {
    return this.marker.from === other.marker.from && this.marker.to === other.marker.to &&
      this.marker.text === other.marker.text && this.marker.task === other.marker.task && this.marker.label === other.marker.label;
  }
  toDOM(view: EditorView): HTMLElement {
    const marker = this.marker;
    if (marker.task) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.className = 'md-task-toggle';
      checkbox.checked = /[xX]/.test(marker.text);
      const label = marker.label;
      checkbox.setAttribute('aria-label', label ? `Toggle task: ${label}` : 'Toggle task');
      checkbox.addEventListener('mousedown', event => event.preventDefault());
      checkbox.addEventListener('change', () => {
        const current = view.state.doc.sliceString(marker.from, marker.to);
        const accepted = checkbox.isConnected && !view.state.readOnly &&
          /^\[[ xX]\]$/.test(current) && current === marker.text && endTableEdit(view);
        if (!accepted) { checkbox.checked = /[xX]/.test(current); return; }
        view.dispatch({ changes: { from: marker.from + 1, to: marker.from + 2, insert: checkbox.checked ? 'x' : ' ' },
          userEvent: 'input.task' });
        view.focus();
      });
      return checkbox;
    }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'md-list-marker';
    button.textContent = /^\d/.test(marker.text) ? marker.text : '•';
    button.setAttribute('aria-label', `Edit list marker ${marker.text}`);
    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => {
      if (!button.isConnected || view.state.readOnly || !endTableEdit(view)) return;
      if (view.state.doc.sliceString(marker.from, marker.to) !== marker.text) return;
      view.dispatch({ selection: { anchor: marker.from }, scrollIntoView: true }); view.focus();
    });
    return button;
  }
}
