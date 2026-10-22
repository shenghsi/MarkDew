import DOMPurify from 'dompurify';

export interface FormulaPreview { formula: string; source: string; display: boolean }
export type FormulaRenderer = (formula: string, display: boolean) => Promise<string>;
const renderFormula: FormulaRenderer = (formula, display) => import('./math-renderer').then(module => module.renderMath(formula, display));

export const sanitizeFormula = (html: string) => DOMPurify.sanitize(html, { ADD_TAGS: ['mjx-container'],
  FORBID_TAGS: ['script', 'style', 'a', 'img', 'iframe', 'object', 'embed', 'foreignObject'],
  FORBID_ATTR: ['href', 'xlink:href', 'src', 'srcset'] });

// The source stays visible until rendering succeeds. Removed slots own no results.
export function mountFormula(dom: HTMLElement, formula: FormulaPreview, measure: () => void,
  render: FormulaRenderer = renderFormula) {
  let alive = true;
  dom.textContent = formula.source;
  dom.setAttribute('aria-label', `Formula: ${formula.formula}`);
  const current = () => alive && dom.isConnected;
  void (async () => {
    await Promise.resolve();
    if (!current()) return;
    const html = await render(formula.formula, formula.display);
    if (!current()) return;
    dom.innerHTML = sanitizeFormula(html); dom.dataset.ready = 'true'; measure();
  })().catch(error => {
    if (!current()) return;
    dom.classList.add('preview-error'); dom.dataset.ready = 'error';
    dom.textContent = formula.source;
    dom.title = `Cannot render: ${String(error)}. Select the cell to edit its source.`;
    dom.setAttribute('aria-label', `${dom.title} ${formula.source}`); measure();
  });
  return () => { alive = false; };
}
