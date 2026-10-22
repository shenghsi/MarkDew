import { Facet, StateEffect, StateField } from '@codemirror/state';
import { invoke, isTauri } from '@tauri-apps/api/core';
import MarkdownIt from 'markdown-it';
import { imageSize } from 'image-size';
import { svgImage } from './svg-image';

export const imageBasePath = Facet.define<string, string>({ combine: paths => paths[0] || '' });
export const imageDocument = Facet.define<number, number | undefined>({ combine: ids => ids[0] });
export const setImagePath = StateEffect.define<string>();
export const imagePath = StateField.define<string>({
  create: state => state.facet(imageBasePath),
  update(path, transaction) { for (const effect of transaction.effects) if (effect.is(setImagePath)) path = effect.value; return path; },
});
export interface ImageInfo { destination: string; alt: string; title: string; path: string; document?: number }
const markdown = new MarkdownIt({ html: false });
export function imageInfo(token: ReturnType<MarkdownIt['parse']>[number], path: string, document?: number): ImageInfo {
  const altText = (children: typeof token.children): string => (children || []).map(child =>
    ['text', 'text_special', 'code_inline', 'html_inline'].includes(child.type) ? child.content :
      child.type === 'image' ? altText(child.children) : ['softbreak', 'hardbreak'].includes(child.type) ? '\n' : '').join('');
  return { destination: token.attrGet('src') || '', title: token.attrGet('title') || '', path,
    alt: altText(token.children), ...(document === undefined ? {} : { document }) };
}
export function imageReader(source: () => string, path: string, document?: number) {
  let environment: object | undefined;
  return (raw: string): ImageInfo | undefined => {
    if (!environment) { environment = {}; markdown.parse(source(), environment); }
    const tokens = markdown.parseInline(raw, environment)[0]?.children || [];
    if (tokens.length !== 1 || tokens[0].type !== 'image') return;
    return imageInfo(tokens[0], path, document);
  };
}

export const imageLimit = 8 * 1024 * 1024;
export const imageSideLimit = 16384;
export const imagePixelLimit = 32 * 1024 * 1024;
export function prepareImage(bytes: Uint8Array): { mime: string; bytes: Uint8Array } {
  if (!bytes.length || bytes.length > imageLimit) throw new Error('The image exceeds the 8 MiB limit.');
  let raster = false;
  try { imageMime(bytes); raster = true; } catch { /* XML parsing checks other input. */ }
  if (raster) return { mime: validateRaster(bytes), bytes };
  const prepared = new TextEncoder().encode(svgImage(bytes, imageSideLimit, imagePixelLimit));
  if (prepared.length > imageLimit) throw new Error('The prepared SVG exceeds the 8 MiB limit.');
  return { mime: 'image/svg+xml', bytes: prepared };
}
// Header preflight precedes browser decoding. It is not a total memory bound.
export function validateRaster(bytes: Uint8Array): string {
  if (!bytes.length || bytes.length > imageLimit) throw new Error('The image exceeds the 8 MiB limit.');
  const mime = imageMime(bytes);
  // The package's lossless WebP reader uses bit operations. Missing bytes can
  // become zero, so require the complete dimension header before calling it.
  const minimum = mime === 'image/webp' ? (bytes[15] === 76 ? 25 : 30)
    : mime === 'image/png' ? 24 : mime === 'image/gif' ? 10 : 3;
  if (bytes.length < minimum) throw new Error('The image dimension header is incomplete.');
  // A tight buffer prevents package DataViews from reading beyond a subarray.
  const dimensions = imageSize(new Uint8Array(bytes));
  if (`image/${dimensions.type === 'jpg' ? 'jpeg' : dimensions.type}` !== mime)
    throw new Error('The image type does not match its dimension header.');
  const { width, height } = dimensions;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0)
    throw new Error('The image has invalid dimensions.');
  if (width > imageSideLimit || height > imageSideLimit || width * height > imagePixelLimit)
    throw new Error('The image exceeds 16,384 pixels per side or 32 Mi pixels.');
  return mime;
}
export function imageMime(bytes: Uint8Array): string {
  const begins = (...prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  if (begins(137, 80, 78, 71, 13, 10, 26, 10)) return 'image/png';
  if (begins(255, 216, 255)) return 'image/jpeg';
  if (begins(71, 73, 70, 56, 55, 97) || begins(71, 73, 70, 56, 57, 97)) return 'image/gif';
  if (begins(82, 73, 70, 70) && bytes.length >= 12 && bytes.slice(8, 12).every((value, index) => value === [87, 69, 66, 80][index])) return 'image/webp';
  throw new Error('Use a PNG, JPEG, GIF, or WebP image.');
}
export function imageDestination(destination: string): 'https' | 'data' | 'local' {
  if (/^https:/i.test(destination)) { const url = new URL(destination); if (url.protocol === 'https:' && url.hostname) return 'https'; }
  if (/^data:image\/(png|jpeg|gif|webp);base64,/i.test(destination)) return 'data';
  if (!destination || destination.startsWith('//') || (!/^[a-z]:(?:[\\/]|%5c|%2f)/i.test(destination) && /^[a-z][a-z\d+.-]*:/i.test(destination)))
    throw new Error('Use a local image path, HTTPS, or a raster data image.');
  return 'local';
}
// Encode filename punctuation once; retain native separators and drive spelling.
export function imageFileDestination(path: string): string {
  return path.replace(/[%?#<>\[\]()\s"']/g, character => encodeURIComponent(character).replace(/[()']/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase()));
}
function dataBytes(destination: string): Uint8Array {
  const encoded = destination.slice(destination.indexOf(',') + 1);
  if (encoded.length > Math.ceil(imageLimit / 3) * 4 || !/^[a-z\d+/]*={0,2}$/i.test(encoded)) throw new Error('Invalid or oversized data image.');
  const binary = atob(encoded);
  if (binary.length > imageLimit) throw new Error('The image exceeds the 8 MiB limit.');
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const declared = destination.slice(5, destination.indexOf(';')).toLowerCase();
  if (imageMime(bytes) !== declared) throw new Error('The data image type does not match its bytes.');
  return bytes;
}

export function mountImage(dom: HTMLElement, image: ImageInfo, measure: () => void,
  read: (destination: string, path: string) => Promise<ArrayBuffer> = async (destination, path) => {
    if (!isTauri()) throw new Error('Local images need the desktop app.');
    return invoke<ArrayBuffer>('read_image', { destination, documentPath: path,
      ...(image.document === undefined ? {} : { document: image.document }) });
  }) {
  let alive = true, objectURL: string | undefined;
  const current = () => alive && dom.isConnected;
  const release = () => { if (objectURL) URL.revokeObjectURL(objectURL); objectURL = undefined; };
  dom.textContent = `Loading image: ${image.alt || image.destination}`;
  const fail = (error: unknown) => {
    if (!current()) return;
    release(); dom.classList.add('preview-error'); dom.textContent = `Cannot load image: ${image.alt || image.destination}. ${String(error)} Select to edit the source.`;
    dom.dataset.ready = 'error'; measure();
  };
  void (async () => {
    await Promise.resolve(); // CodeMirror attaches the widget after toDOM returns.
    if (!current()) return;
    const kind = imageDestination(image.destination);
    let url = image.destination;
    if (kind !== 'https') {
      const bytes = kind === 'data' ? dataBytes(image.destination) : new Uint8Array(await read(image.destination, image.path));
      if (!current()) return;
      const prepared = prepareImage(bytes);
      objectURL = URL.createObjectURL(new Blob([prepared.bytes as BlobPart], { type: prepared.mime })); url = objectURL;
    }
    if (!current()) { release(); return; }
    const element = document.createElement('img'); element.alt = image.alt; element.title = image.title;
    element.referrerPolicy = 'no-referrer'; element.draggable = false;
    element.addEventListener('load', () => { if (current()) { dom.dataset.ready = 'true'; measure(); } });
    element.addEventListener('error', () => fail('The image is unavailable or cannot be decoded.'));
    element.src = url; dom.replaceChildren(element);
  })().catch(fail);
  return () => { alive = false; release(); dom.querySelector('img')?.removeAttribute('src'); };
}
