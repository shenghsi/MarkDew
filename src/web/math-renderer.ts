import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js';
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const tex = new TeX({ packages: ['base', 'ams', 'newcommand'], maxBuffer: 65536,
  formatError: (_jax: unknown, error: { message: string }) => { throw new Error(error.message); } });
// The TeX SVG font is included in the app. No font or formula is sent to a server.
const svg = new SVG({ fontData: MathJaxTexFont, fontCache: 'none' });
const formulas = mathjax.document('', { InputJax: tex, OutputJax: svg });
export function renderMath(formula: string, display: boolean): string {
  tex.reset();
  const node = formulas.convert(formula, { display, em: 16, ex: 8, containerWidth: 800 });
  return adaptor.outerHTML(node);
}
