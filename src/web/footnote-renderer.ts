import { NoteDefinition, renderFootnote } from './footnotes';
import { sanitizeFormula } from './math-preview';

type FormulaRenderer = (formula: string, display: boolean) => Promise<string>;
const renderFormula: FormulaRenderer = (formula, display) => import('./math-renderer').then(module => module.renderMath(formula, display));

// Each definition owns its formula results. Removal cancels every publication.
export function mountFootnote(dom: HTMLElement, definition: NoteDefinition, measure: () => void, render: FormulaRenderer = renderFormula) {
  dom.innerHTML = renderFootnote(definition);
  dom.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6').forEach(element => { if (!element.hasAttribute('dir')) element.dir = 'auto'; });
  let alive = true;
  for (const element of Array.from(dom.querySelectorAll<HTMLElement>('.footnote-math'))) {
    const source = element.textContent || '', display = element.dataset.display === 'true';
    const formula = display ? source.slice(3, -3) : source.slice(1, -1);
    element.setAttribute('aria-label', `Formula: ${formula}`);
    const current = () => alive && dom.isConnected && dom.contains(element);
    void render(formula, display).then(html => {
      if (!current()) return;
      element.innerHTML = sanitizeFormula(html);
      element.dataset.ready = 'true'; measure();
    }, error => {
      if (!current()) return;
      element.classList.add('preview-error'); element.dataset.ready = 'error';
      element.title = `Cannot render: ${String(error)}. Select the footnote to edit its source.`;
      // Keep the original formula visible when MathJax rejects it.
      element.setAttribute('aria-label', `${element.title} ${source}`); measure();
    });
  }
  return () => { alive = false; };
}
