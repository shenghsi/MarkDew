import DOMPurify from 'dompurify';
import { toHtml } from 'hast-util-to-html';
import { phrasingProjection, renderedMarkdown, documentImageEnvironment } from './renderers';
import { mountHTMLFrame } from './html-frame';
import type { Text } from '@codemirror/state';
import { mountImage } from './images';
import { mountFormula } from './math-preview';
import type { inlineHTML } from './inline-html';

export interface PhrasingHTMLPreview { source: string; doc: Text; bodyFrom: number; from: number; to: number; type: 'paragraph' | 'heading'; path: string; document?: number;
  notes: { from: number; to: number; number: number }[] }
export type InlineHTMLLoader = () => Promise<typeof inlineHTML>;
const load: InlineHTMLLoader = () => import('./inline-html').then(module => module.inlineHTML);

// A complete parser block owns deferred validation and all nested resources.
export function mountPhrasingHTML(dom: HTMLElement, preview: PhrasingHTMLPreview,
  measure: () => void, loader: InlineHTMLLoader = load) {
  let alive = true;
  const disposers: (() => void)[] = [];
  dom.textContent = preview.source; dom.dataset.ready = 'loading';
  const current = () => alive && dom.isConnected;
  const release = () => { for (const dispose of disposers.splice(0)) dispose(); };
  const fallback = (reason: unknown) => {
    if (!current()) return;
    release();
    const caption = document.createElement('span'); caption.className = 'preview-caption';
    caption.textContent = 'HTML · isolated preview · select to edit';
    const mounted = mountHTMLFrame(renderedMarkdown(preview.source), 'HTML preview', measure,
      message => { if (current()) caption.textContent = message; });
    disposers.push(mounted.dispose);
    dom.replaceChildren(mounted.frame, caption); dom.classList.add('preview-html');
    dom.dataset.ready = 'isolated'; dom.title = `Isolated HTML preview: ${String(reason)}`; measure();
  };
  void (async () => {
    await Promise.resolve(); if (!current()) return;
    const format = await loader(); if (!current()) return;
    const references = documentImageEnvironment(preview.doc, preview.bodyFrom);
    const projection = phrasingProjection(preview.source, references, preview.path, preview.document, preview.notes,
      { from: preview.from - preview.bodyFrom, to: preview.to - preview.bodyFrom, type: preview.type });
    if (!projection) { fallback('Unsupported Markdown fragment'); return; }
    const result = format(projection.tree, projection.controlled, true);
    if (!result) { fallback('Unsupported inline HTML'); return; }
    if (!result.properties.dir) result.properties.dir = 'auto';
    dom.innerHTML = DOMPurify.sanitize(toHtml(result), {
      FORBID_TAGS: ['a', 'img', 'script', 'style', 'iframe', 'object', 'embed', 'form', 'button', 'svg', 'math'],
      FORBID_ATTR: ['style', 'id', 'name', 'href', 'src', 'srcset', 'action', 'formaction'],
    });
    dom.querySelectorAll<HTMLElement>('[data-table-image]').forEach(slot => {
      const image = projection.images[Number(slot.dataset.tableImage)];
      if (image) disposers.push(mountImage(slot, image, measure));
    });
    dom.querySelectorAll<HTMLElement>('[data-table-math]').forEach(slot => {
      const formula = projection.formulas[Number(slot.dataset.tableMath)];
      if (formula) disposers.push(mountFormula(slot, formula, measure));
    });
    dom.dataset.ready = 'true'; measure();
  })().catch(fallback);
  return () => { alive = false; release(); };
}
