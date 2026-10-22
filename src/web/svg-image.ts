import DOMPurify from 'dompurify';
import { generate, parse, walk, CssNode } from 'css-tree';

const namespace = 'http://www.w3.org/2000/svg';
const fragment = /^#[\p{L}\p{N}_.:-]+$/u;
const resourceAttributes = new Set(['fill', 'stroke', 'filter', 'clip-path', 'mask', 'cursor',
  'marker', 'marker-start', 'marker-mid', 'marker-end', 'color-profile']);
function safeValue(node: CssNode): boolean {
  let safe = true;
  walk(node, child => {
    if (child.type === 'Raw' || child.type === 'Url' && !fragment.test(child.value)) safe = false;
    // These functions can carry string URLs without a Url node.
    if (child.type === 'Function' && !['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch',
      'oklab', 'oklch', 'color', 'color-mix', 'calc', 'min', 'max', 'clamp', 'var',
      'translate', 'translatex', 'translatey', 'translatez', 'translate3d', 'rotate',
      'rotatex', 'rotatey', 'rotatez', 'rotate3d', 'scale', 'scalex', 'scaley', 'scalez',
      'scale3d', 'matrix', 'matrix3d', 'skew', 'skewx', 'skewy', 'perspective'].includes(child.name.toLowerCase())) safe = false;
  });
  return safe;
}
function css(source: string, context: 'stylesheet' | 'declarationList'): string {
  const ast = parse(source, { context, parseCustomProperty: true });
  walk(ast, (node, item, list) => {
    if (list && item && (node.type === 'Atrule' || node.type === 'Raw' ||
      node.type === 'Declaration' && !safeValue(node.value))) list.remove(item);
  });
  return generate(ast);
}
function length(raw: string | null): number | undefined {
  if (raw === null) return;
  const ast = parse(raw, { context: 'value' });
  if (ast.type !== 'Value' || ast.children.size !== 1) throw new Error('Use finite SVG dimensions.');
  const node = ast.children.first!;
  if (node.type === 'Percentage' && Number(node.value) > 0) return;
  const units: Record<string, number> = { px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, pt: 96 / 72, pc: 16 };
  const value = node.type === 'Number' ? Number(node.value) : node.type === 'Dimension' ? Number(node.value) * (units[node.unit.toLowerCase()] ?? NaN) : NaN;
  if (!Number.isFinite(value) || value <= 0) throw new Error('Use positive SVG pixel or physical dimensions, or a viewBox.');
  return value;
}

// Authored SVG never enters the app DOM. Only the serialized result becomes an
// image Blob. XML and CSS packages supply parsing; raw bytes remain separate.
export function svgImage(bytes: Uint8Array, sideLimit: number, pixelLimit: number): string {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (source.includes('<!DOCTYPE')) throw new Error('SVG document types are not supported.');
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  let root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== namespace)
    throw new Error('Use a valid SVG XML document with the SVG namespace.');
  // DOMPurify's SVG allowlist uses unprefixed names. Normalize parsed SVG
  // element names while retaining namespace identity and namespaced attributes.
  for (const element of Array.from(doc.getElementsByTagNameNS(namespace, '*'))) {
    if (!element.prefix) continue;
    const plain = doc.createElementNS(namespace, element.localName);
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
        plain.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    }
    while (element.firstChild) plain.appendChild(element.firstChild);
    element.parentNode!.replaceChild(plain, element);
  }
  root = doc.documentElement;
  let width = length(root.getAttribute('width')), height = length(root.getAttribute('height'));
  const box = root.getAttribute('viewBox');
  if (box !== null) {
    const fields = box.trim().split(/[\s,]+/);
    const values = fields.map(value => /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value) ? Number(value) : NaN);
    if (values.length !== 4 || !values.every(Number.isFinite) || values[2] <= 0 || values[3] <= 0)
      throw new Error('Use a finite positive SVG viewBox.');
    width ??= height ? height * values[2] / values[3] : values[2];
    height ??= width * values[3] / values[2];
    root.setAttribute('viewBox', values.join(' '));
  }
  if (width === undefined || height === undefined) throw new Error('SVG needs width and height or a viewBox.');
  width = Math.ceil(width); height = Math.ceil(height);
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= sideLimit) || width * height > pixelLimit)
    throw new Error('The image exceeds 16,384 pixels per side or 32 Mi pixels.');
  DOMPurify.sanitize(root, { IN_PLACE: true, USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
    FORBID_TAGS: ['foreignObject', 'script', 'image', 'feImage', 'animate', 'animateMotion', 'animateTransform', 'set', 'mpath'],
    FORBID_ATTR: ['xml:base', 'src', 'srcset'] });
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.localName === 'href' && !fragment.test(attribute.value)) element.removeAttributeNode(attribute);
      else if (resourceAttributes.has(attribute.localName)) {
        try { if (!safeValue(parse(attribute.value, { context: 'value' }))) element.removeAttributeNode(attribute); }
        catch { element.removeAttributeNode(attribute); }
      }
    }
    if (element.hasAttribute('style')) element.setAttribute('style', css(element.getAttribute('style')!, 'declarationList'));
    if (element.localName === 'style') element.textContent = css(element.textContent || '', 'stylesheet');
  }
  root.setAttribute('width', String(width)); root.setAttribute('height', String(height));
  // Inline important dimensions override authored stylesheet and style sizes.
  const styled = root as unknown as SVGSVGElement;
  for (const property of ['width', 'min-width', 'max-width']) styled.style.setProperty(property, `${width}px`, 'important');
  for (const property of ['height', 'min-height', 'max-height']) styled.style.setProperty(property, `${height}px`, 'important');
  root.setAttribute('style', styled.style.cssText);
  return new XMLSerializer().serializeToString(root);
}
