import { generate, parse, walk } from 'css-tree';
import { htmlFrameDocument } from './html-frame';

// A capture package can fetch URLs that the frame CSP blocked. Reject those
// resources before capture; never move authored styles into the app document.
const functions = new Set(('rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix calc min max clamp var '
  + 'translate translatex translatey translatez translate3d rotate rotatex rotatey rotatez rotate3d '
  + 'scale scalex scaley scalez scale3d matrix matrix3d skew skewx skewy perspective '
  + 'linear-gradient repeating-linear-gradient radial-gradient repeating-radial-gradient conic-gradient '
  + 'repeating-conic-gradient cubic-bezier steps counter counters local format tech '
  + 'blur brightness contrast drop-shadow grayscale hue-rotate invert opacity saturate sepia '
  + 'inset circle ellipse polygon path rect fit-content minmax repeat').split(' '));
export function htmlExportCSS(source: string, context: 'stylesheet' | 'declarationList'): string {
  const fonts: string[] = [];
  const tree = parse(source, { context, parseCustomProperty: true });
  walk(tree, node => {
    if (node.type === 'Raw' || node.type === 'Url' && !/^data:/i.test(node.value)
      || node.type === 'Function' && !functions.has(node.name.toLowerCase())
      || node.type === 'Atrule' && node.name.toLowerCase() === 'import')
      throw new Error('HTML PNG export requires self-contained CSS resources. Use Print for this HTML.');
    if (node.type === 'Atrule' && node.name.toLowerCase() === 'font-face') fonts.push(generate(node));
  });
  return fonts.join('\n');
}

export function htmlExportFrame(frame: HTMLIFrameElement) {
  const doc = htmlFrameDocument(frame), root = doc.documentElement;
  const width = frame.clientWidth, height = frame.clientHeight;
  if (!width || !height || root.scrollWidth > width + 1 || root.scrollHeight > height + 1)
    throw new Error('HTML content is clipped. Use Print or change its source before PNG export.');
  let fonts = '';
  for (const style of Array.from(doc.querySelectorAll('style'))) fonts += htmlExportCSS(style.textContent || '', 'stylesheet') + '\n';
  for (const element of Array.from(doc.querySelectorAll('[style]'))) htmlExportCSS(element.getAttribute('style') || '', 'declarationList');
  // Presentational HTML/SVG attributes can also become computed resources.
  for (const element of Array.from(doc.querySelectorAll('*'))) {
    for (const pseudo of [null, '::before', '::after']) {
      const style = doc.defaultView!.getComputedStyle(element, pseudo);
      for (const name of ['background-image', 'mask-image', '-webkit-mask-image', 'border-image-source',
        'list-style-image', 'content', 'cursor', 'filter', 'clip-path', 'fill', 'stroke']) {
        const value = style.getPropertyValue(name);
        if (value) htmlExportCSS(`${name}:${value}`, 'declarationList');
      }
    }
  }
  for (const element of Array.from(doc.querySelectorAll('[src], [poster], [href], [xlink\\:href], [background]'))) {
    for (const name of ['src', 'poster', 'href', 'xlink:href', 'background']) {
      const value = element.getAttribute(name);
      if (value !== null && !/^data:/i.test(value)) throw new Error('HTML PNG export requires embedded resources. Use Print for this HTML.');
    }
  }
  for (const image of Array.from(doc.images)) {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight)
      throw new Error('Cannot export an unloaded or failed HTML image.');
  }
  doc.fonts?.forEach(font => { if (font.status === 'error') throw new Error('Cannot export a failed HTML font.'); });
  return { root, width, height, fonts, check() {
    if (htmlFrameDocument(frame) !== doc || doc.documentElement !== root || frame.clientWidth !== width || frame.clientHeight !== height)
      throw new Error('HTML changed during PNG export. Retry the export.');
  } };
}
