import DOMPurify from 'dompurify';
import { toHtml } from 'hast-util-to-html';
import type { Element } from 'hast';
import type { TableHTMLCell } from './renderers';

export interface CellHTMLPreview extends TableHTMLCell { source: string }
export type CellHTMLRenderer = (cell: CellHTMLPreview) => Promise<Element | undefined>;
const renderCell: CellHTMLRenderer = cell => import('./inline-html').then(module => module.inlineHTML(cell.tree, cell.controlled));

// The complete cell source stays visible until validation. Resource jobs start
// only after accepted HTML is mounted, and share the cell's cancellation owner.
export function mountCellHTML(dom: HTMLElement, cell: CellHTMLPreview,
  resources: () => (() => void)[], measure: () => void, render: CellHTMLRenderer = renderCell) {
  let alive = true;
  const disposers: (() => void)[] = [];
  dom.textContent = cell.source; dom.dataset.htmlReady = 'loading';
  const current = () => alive && dom.isConnected;
  const fail = (reason: unknown) => {
    if (!current()) return;
    dom.textContent = cell.source; dom.dataset.htmlReady = 'error';
    dom.title = `Cannot render cell HTML: ${String(reason)}. Select the cell to edit its source.`;
    measure();
  };
  void (async () => {
    await Promise.resolve(); if (!current()) return;
    const result = await render(cell); if (!current()) return;
    if (!result) { fail('Unsupported inline HTML'); return; }
    dom.innerHTML = DOMPurify.sanitize(toHtml(result), {
      FORBID_TAGS: ['a', 'img', 'script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'svg', 'math'],
      FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset', 'action', 'formaction'],
    });
    dom.removeAttribute('title'); dom.dataset.htmlReady = 'true';
    disposers.push(...resources()); measure();
  })().catch(fail);
  return () => {
    alive = false; disposers.forEach(dispose => dispose());
    delete dom.dataset.htmlReady; dom.removeAttribute('title');
  };
}
