import type { EditorView } from '@codemirror/view';
import { parseFragment } from 'parse5';

// Source locations let cell edits preserve the surrounding authored HTML.
export function mountHTMLTableEdit(body: HTMLElement, view: EditorView, from: number, source: string) {
  const fragment = parseFragment(source, { sourceCodeLocationInfo: true });
  const bounds: { from: number; to: number }[] = [];
  function visit(node: any) {
    if (node.tagName === 'td' || node.tagName === 'th') {
      const location = node.sourceCodeLocation;
      if (!location?.startTag || !location.endTag) return;
      bounds.push({ from: location.startTag.endOffset, to: location.endTag.startOffset });
    }
    for (const child of node.childNodes || []) visit(child);
  }
  visit(fragment);
  const cells = Array.from(body.querySelectorAll<HTMLElement>('td, th'));
  // Repaired or container-prefixed HTML has no reliable one-to-one source map.
  if (!cells.length || cells.length !== bounds.length || view.state.doc.sliceString(from, from + source.length) !== source) return;
  let cancel = () => {};
  const listeners: (() => void)[] = [];
  cells.forEach((cell, index) => {
    cell.dataset.htmlEditable = 'true';
    const start = (event: MouseEvent) => {
      if (view.state.readOnly || cell.querySelector('textarea')) return;
      event.preventDefault(); event.stopPropagation();
      cancel();
      const range = bounds[index];
      const original = source.slice(range.from, range.to);
      const input = document.createElement('textarea');
      input.className = 'html-table-cell-editor'; input.value = original;
      input.setAttribute('aria-label', 'HTML table cell content');
      const children = Array.from(cell.childNodes);
      cell.replaceChildren(input);
      let active = true;
      const finish = (save: boolean) => {
        if (!active) return;
        active = false; cancel = () => {};
        cell.replaceChildren(...children);
        if (save && input.value !== original && !view.state.readOnly &&
          view.state.doc.sliceString(from, from + source.length) === source) {
          view.dispatch({ changes: { from: from + range.from, to: from + range.to, insert: input.value },
            userEvent: 'input.html-table' });
        }
      };
      cancel = () => finish(false);
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('mousedown', event => event.stopPropagation());
      input.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); finish(false); }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
      });
      input.focus();
    };
    cell.addEventListener('mousedown', start);
    listeners.push(() => { cell.removeEventListener('mousedown', start); delete cell.dataset.htmlEditable; });
  });
  return () => { cancel(); listeners.forEach(remove => remove()); };
}
