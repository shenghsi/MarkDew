import DOMPurify from 'dompurify';
import { toHtml } from 'hast-util-to-html';
import type { Text } from '@codemirror/state';
import type { blockHTML } from './inline-html';
import { documentImageEnvironment } from './renderers';
import { mountHTMLFrame, resolveHTMLImages } from './html-frame';

export interface BlockHTMLPreview {
  source: string;
  doc: Text;
  bodyFrom: number;
  from: number;
  to: number;
  path?: string;
  document?: number;
  view?: import("@codemirror/view").EditorView;
}
export type BlockHTMLLoader = () => Promise<typeof blockHTML>;
const load: BlockHTMLLoader = () => import('./inline-html').then(module => module.blockHTML);

export function mountBlockHTML(dom: HTMLElement, preview: BlockHTMLPreview,
  measure: () => void, loader: BlockHTMLLoader = load) {
  let alive = true;
  let releaseFrame = () => {};
  let releaseEditor = () => {};
  const current = () => alive && dom.isConnected;
  dom.textContent = preview.source; dom.dataset.ready = 'loading';
  const caption = (isolated = false) => {
    const label = document.createElement('span'); label.className = 'preview-caption';
    label.textContent = `HTML · ${isolated ? 'isolated preview · ' : ''}select to edit`; return label;
  };
  const fallback = async (reason: unknown) => {
    if (!current()) return;
    releaseFrame();
    const label = caption(true);
    let htmlSource = preview.source;
    if (preview.path) {
      try {
        htmlSource = await resolveHTMLImages(preview.source, preview.path, preview.document);
      } catch { /* retain original source if resolution fails */ }
    }
    if (!current()) return;
    const mounted = mountHTMLFrame(htmlSource, 'HTML preview', measure, message => { if (current()) label.textContent = message; },
      { path: preview.path, document: preview.document });
    releaseFrame = mounted.dispose;
    dom.replaceChildren(mounted.frame, label); dom.dataset.ready = 'isolated';
    dom.title = `Isolated HTML preview: ${String(reason)}`; measure();
  };
  void (async () => {
    await Promise.resolve(); if (!current()) return;
    const format = await loader(); if (!current()) return;
    // Both parsers must agree on the original UTF-16 source bounds. Only the
    // package value removes container prefixes; reveal retains original bounds.
    const from = preview.from - preview.bodyFrom, to = preview.to - preview.bodyFrom;
    const env = documentImageEnvironment(preview.doc, preview.bodyFrom);
    let value = env.htmlBlocks?.get(`${from}:${to}`);
    if (value === undefined && preview.source.endsWith('\n')) {
      const trimmedLen = preview.source.endsWith('\r\n') ? 2 : 1;
      value = env.htmlBlocks?.get(`${from}:${to - trimmedLen}`);
    }
    if (value === undefined || preview.source.length !== to - from ||
      preview.doc.sliceString(preview.from, preview.to) !== preview.source) {
      void fallback('Unsupported Markdown fragment'); return;
    }
    const result = format(value);
    if (!result) { void fallback('Unsupported block HTML'); return; }
    const body = document.createElement('div'); body.className = 'preview-block-html-body';
    body.innerHTML = DOMPurify.sanitize(toHtml(result), {
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'img', 'svg', 'math'],
      FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset', 'action', 'formaction'],
    });
    dom.replaceChildren(body, caption()); dom.classList.add('preview-block-html');
    dom.dataset.ready = 'true'; measure();
    if (preview.view && value === preview.source && body.querySelector('table')) {
      const { mountHTMLTableEdit } = await import('./html-table-edit');
      if (current()) releaseEditor = mountHTMLTableEdit(body, preview.view, preview.from, preview.source) || (() => {});
    }
  })().catch(err => { void fallback(err); });
  return () => { alive = false; releaseEditor(); releaseFrame(); };
}
