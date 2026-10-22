import { invoke, isTauri } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { htmlExportFrame } from './html-frame-export';
type Options = NonNullable<Parameters<typeof import('html-to-image').toCanvas>[1]>;

const byteLimit = 64 * 1024 * 1024;
const pixelLimit = 32 * 1024 * 1024;
export function pngDimensions(width: number, height: number) {
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= 16384) || width * height > pixelLimit)
    throw new Error('PNG export is limited to 16,384 pixels per side and 32 million pixels. Use Print for a larger document.');
}
function check(signal: AbortSignal) { if (signal.aborted) throw signal.reason || new DOMException('Export closed.', 'AbortError'); }
function wait<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  check(signal);
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason || new DOMException('Export closed.', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', cancel));
  });
}
type Capture = (node: HTMLElement, options: Options) => Promise<HTMLCanvasElement>;
const capture: Capture = (node, options) => import('html-to-image').then(module => module.toCanvas(node, options));

function checkInk(canvas: HTMLCanvasElement, signal: AbortSignal) {
  const context = canvas.getContext('2d'); if (!context) throw new Error('Cannot check the rendered PNG.');
  for (let y = 0; y < canvas.height; y += 32) {
    check(signal); const pixels = context.getImageData(0, y, canvas.width, Math.min(32, canvas.height - y)).data;
    for (let at = 0; at < pixels.length; at += 4)
      if (pixels[at + 3] && (pixels[at] < 245 || pixels[at + 1] < 245 || pixels[at + 2] < 245)) return;
  }
  throw new Error('The browser produced an empty image. No file was saved.');
}

export async function pngBytes(paper: HTMLElement, signal: AbortSignal, rasterize: Capture = capture): Promise<Uint8Array> {
  const deadline = new AbortController();
  const cancel = () => deadline.abort(signal.reason);
  signal.addEventListener('abort', cancel, { once: true }); if (signal.aborted) cancel();
  const timer = setTimeout(() => deadline.abort(new Error('PNG rendering timed out. Close this view and retry.')), 30000);
  let clone: HTMLElement | undefined;
  const remoteImages: HTMLImageElement[] = [];
  try {
    await wait(document.fonts?.ready || Promise.resolve(), deadline.signal); check(deadline.signal);
    const width = Math.ceil(paper.scrollWidth), height = Math.ceil(paper.scrollHeight);
    pngDimensions(width, height);
    const frames = Array.from(paper.querySelectorAll('iframe')).map(frame => htmlExportFrame(frame));
    clone = paper.cloneNode(true) as HTMLElement;
    // Do not attach cloned srcdoc frames or authored CSS to the parent.
    const frameCopies = Array.from(clone.querySelectorAll('iframe'));
    const placeholders = frameCopies.map(frame => {
      const image = document.createElement('img'); image.alt = frame.title || 'HTML';
      frame.replaceWith(image); return image;
    });
    Object.assign(clone.style, { position: 'fixed', left: '-20000px', top: '0', margin: '0', width: `${width}px`, maxWidth: 'none' });
    document.body.append(clone);
    const originals = Array.from(paper.querySelectorAll('img')), copies = Array.from(clone.querySelectorAll('img')).filter(image => !placeholders.includes(image));
    // Embed pixels from loaded images before the package can replace failed
    // fetches with empty placeholders. CORS-tainted images fail explicitly.
    for (let index = 0; index < originals.length; index++) {
      check(deadline.signal); let image = originals[index];
      if (/^https:/i.test(image.currentSrc || image.src)) {
        const remote = document.createElement('img'); remote.crossOrigin = 'anonymous'; remote.referrerPolicy = 'no-referrer';
        remote.alt = image.alt; remoteImages.push(remote);
        const loaded = new Promise<void>((resolve, reject) => {
          remote.onload = () => resolve(); remote.onerror = () => reject(new Error(`Cannot export remote image: ${remote.alt || image.src}. Its server must allow image export.`));
          remote.src = image.currentSrc || image.src;
        });
        await wait(loaded, deadline.signal); image = remote;
      }
      if (!image.complete || !image.naturalWidth || !image.naturalHeight) throw new Error(`Cannot export image: ${image.alt || image.src}`);
      const rect = originals[index].getBoundingClientRect(), imageWidth = Math.ceil(rect.width), imageHeight = Math.ceil(rect.height);
      pngDimensions(imageWidth, imageHeight);
      const canvas = document.createElement('canvas'); canvas.width = imageWidth; canvas.height = imageHeight;
      const context = canvas.getContext('2d'); if (!context) throw new Error('The browser cannot create an image canvas.');
      try { context.drawImage(image, 0, 0, imageWidth, imageHeight); copies[index].src = canvas.toDataURL('image/png'); }
      catch { throw new Error(`Cannot export image pixels: ${image.alt || image.src}. Remote images need permission from their server.`); }
      copies[index].removeAttribute('srcset');
    }
    let embeddedFrameBytes = 0;
    for (let index = 0; index < frames.length; index++) {
      check(deadline.signal); const frame = frames[index]; frame.check();
      pngDimensions(frame.width, frame.height);
      const canvas = await wait(rasterize(frame.root, { width: frame.width, height: frame.height,
        canvasWidth: frame.width, canvasHeight: frame.height, pixelRatio: 1, backgroundColor: '#ffffff',
        skipAutoScale: true, fontEmbedCSS: frame.fonts,
        filter: node => !['HEAD', 'STYLE', 'SCRIPT', 'META', 'LINK'].includes(node.nodeName) }), deadline.signal);
      check(deadline.signal); frame.check();
      if (canvas.width !== frame.width || canvas.height !== frame.height) throw new Error('The browser changed HTML PNG dimensions.');
      if (frame.root.querySelector('body')?.innerText?.trim() || frame.root.querySelector('img, svg')) checkInk(canvas, deadline.signal);
      const image = placeholders[index];
      image.src = canvas.toDataURL('image/png');
      embeddedFrameBytes += image.src.length;
      if (embeddedFrameBytes > byteLimit * 4 / 3 + 128) throw new Error('Embedded HTML PNGs exceed the 64 MiB limit.');
      Object.assign(image.style, { width: `${frame.width}px`, height: `${frame.height}px`, display: 'block', maxWidth: 'none' });
      await wait(image.decode(), deadline.signal); check(deadline.signal); frame.check();
    }
    const result = await wait(rasterize(clone, { width, height, canvasWidth: width, canvasHeight: height,
      pixelRatio: 1, backgroundColor: '#ffffff', skipAutoScale: true, skipFonts: true,
      style: { position: 'static', left: 'auto', top: 'auto', margin: '0', width: `${width}px`, maxWidth: 'none' } }), deadline.signal);
    check(deadline.signal);
    frames.forEach(frame => frame.check());
    if (result.width !== width || result.height !== height) throw new Error('The browser changed PNG dimensions. No file was saved.');
    if (paper.textContent?.trim() || paper.querySelector('svg path') || frames.length) checkInk(result, deadline.signal);
    const blob = await wait(new Promise<Blob>((resolve, reject) => result.toBlob(value => value ? resolve(value) : reject(new Error('Cannot encode PNG.')), 'image/png')), deadline.signal);
    if (blob.size > byteLimit) throw new Error('PNG exceeds the 64 MiB limit.');
    const bytes = new Uint8Array(await wait(blob.arrayBuffer(), deadline.signal)); check(deadline.signal);
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((value, index) => bytes[index] === value)
      || header.getUint32(16) !== width || header.getUint32(20) !== height) throw new Error('The browser produced an invalid PNG. No file was saved.');
    return bytes;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', cancel); clone?.remove(); remoteImages.forEach(image => image.removeAttribute('src')); }
}

interface Effects {
  capture: typeof pngBytes;
  choose: (name: string) => Promise<string | null>;
  write: (path: string, bytes: Uint8Array) => Promise<void>;
}
export async function writePNG(path: string, bytes: Uint8Array) {
    if (isTauri()) { await invoke('save_png', bytes, { headers: { 'x-export-path': encodeURIComponent(path) } }); return; }
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'image/png' }));
    const link = document.createElement('a'); link.href = url; link.download = path; document.body.append(link);
    try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
const defaults: Effects = {
  capture: pngBytes,
  choose: async name => isTauri() ? save({ defaultPath: name, filters: [{ name: 'PNG image', extensions: ['png'] }] }) : name,
  write: writePNG,
};
export async function exportPNG(paper: HTMLElement, title: string, signal: AbortSignal, dispatched: () => void, effects: Effects = defaults, prepared?: (bytes: Uint8Array) => void) {
  const bytes = await effects.capture(paper, signal); check(signal);
  prepared?.(bytes); check(signal);
  const path = await effects.choose(title.replace(/\.(?:md|markdown|txt)$/i, '') + '.png'); check(signal);
  if (!path) return false;
  dispatched(); await effects.write(path, bytes); return true;
}
