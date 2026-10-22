import { invoke, isTauri } from '@tauri-apps/api/core';
import { htmlFrame } from './renderers';
import { imageDestination, prepareImage } from './images';

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const parts: string[] = [];
  for (let from = 0; from < bytes.length; from += 32768) {
    parts.push(String.fromCharCode(...bytes.subarray(from, from + 32768)));
  }
  return btoa(parts.join(''));
}

export async function resolveHTMLImages(
  source: string,
  documentPath: string,
  documentId?: number,
  read: (destination: string, path: string) => Promise<ArrayBuffer> = async (destination, path) => {
    if (!isTauri()) throw new Error('Local images need the desktop app.');
    return invoke<ArrayBuffer>('read_image', {
      destination,
      documentPath: path,
      ...(documentId === undefined ? {} : { document: documentId }),
    });
  }
): Promise<string> {
  if (!documentPath || (!source.includes('<img') && !source.includes('<IMG'))) return source;
  const template = document.createElement('template');
  template.innerHTML = source;
  const images = Array.from(template.content.querySelectorAll('img'));
  if (!images.length) return source;
  let changed = false;
  await Promise.all(images.map(async img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      if (imageDestination(src) !== 'local') return;
      const buffer = await read(src, documentPath);
      const bytes = new Uint8Array(buffer);
      const prepared = prepareImage(bytes);
      img.setAttribute('src', `data:${prepared.mime};base64,${uint8ArrayToBase64(prepared.bytes)}`);
      changed = true;
    } catch {
      // Retain original src attribute if image read or preparation fails.
    }
  }));
  return changed ? template.innerHTML : source;
}

export interface HTMLFrameOptions {
  path?: string;
  document?: number;
  read?: (destination: string, path: string) => Promise<ArrayBuffer>;
}

const exportFrames = new WeakMap<HTMLIFrameElement, () => Document>();
export function htmlFrameDocument(frame: HTMLIFrameElement): Document {
  const read = exportFrames.get(frame);
  if (!read) throw new Error('Cannot export an unowned HTML frame.');
  return read();
}

// Parent measurement needs same-origin DOM access, never authored scripts.
// The frame retains sanitization, CSP, and all other sandbox restrictions.
export function mountHTMLFrame(source: string, title: string, measure: () => void, notice: (message: string) => void,
  options?: HTMLFrameOptions) {
  const frame = document.createElement('iframe'); frame.title = title;
  frame.setAttribute('sandbox', 'allow-same-origin'); frame.referrerPolicy = 'no-referrer'; frame.tabIndex = -1;
  let alive = true, frozen = false, resources = false, done = false, cycles = 0, generation = 0;
  let scheduled: ReturnType<typeof setTimeout> | undefined, quiet: ReturnType<typeof setTimeout> | undefined;
  let observer: ResizeObserver | undefined;
  const removers: (() => void)[] = [];
  let finish!: () => void;
  const ready = new Promise<void>(resolve => { finish = resolve; });
  const current = () => alive && frame.isConnected;
  function complete() { if (!done) { done = true; clearTimeout(deadline); finish(); } }
  function stop(message: string) {
    if (!current() || frozen) return;
    frozen = true; observer?.disconnect(); clearTimeout(scheduled); clearTimeout(quiet);
    notice(message); measure(); complete();
  }
  function settle() {
    clearTimeout(quiet);
    quiet = setTimeout(() => { if (current()) { cycles = 0; if (resources) complete(); } }, 50);
  }
  function size() {
    scheduled = undefined;
    if (!current() || frozen) return;
    if (++cycles > 8) { stop('HTML size keeps changing. Select the preview to inspect its complete source.'); return; }
    const previous = frame.style.height;
    try {
      const doc = frame.contentDocument, body = doc?.body, root = doc?.documentElement;
      if (!doc || !body || !root) throw new Error('HTML document is unavailable');
      // Collapse the old viewport before reading, so short content can shrink.
      frame.style.height = '0px';
      const rect = body.getBoundingClientRect(), margin = parseFloat(doc.defaultView?.getComputedStyle(body).marginBottom || '0') || 0;
      const height = Math.ceil(Math.max(1, root.scrollHeight, body.scrollHeight + rect.top + margin, rect.bottom + margin));
      if (!Number.isFinite(height)) throw new Error('Invalid HTML height');
      frame.style.height = `${Math.min(height, 16384)}px`;
      if (height > 16384) { stop('HTML exceeds the preview height limit. Select the preview to inspect its complete source.'); return; }
      if (frame.style.height !== previous) measure();
      settle();
    } catch {
      frame.style.height = previous;
      stop('Cannot fit this HTML preview. Select the preview to inspect its complete source.');
    }
  }
  function schedule() {
    if (!current() || frozen || scheduled !== undefined) return;
    clearTimeout(quiet); scheduled = setTimeout(size, 0);
  }
  const loaded = () => {
    if (!current() || frozen) return;
    const token = ++generation; resources = false;
    for (const remove of removers.splice(0)) remove();
    try {
      const doc = frame.contentDocument;
      if (!doc?.body) throw new Error('HTML document is unavailable');
      observer?.disconnect();
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(schedule); observer.observe(doc.body); observer.observe(doc.documentElement); observer.observe(frame);
      }
      const read = options?.read || (async (dest: string, path: string) => {
        if (!isTauri()) throw new Error('Local images need the desktop app.');
        return invoke<ArrayBuffer>('read_image', { destination: dest, documentPath: path,
          ...(options?.document === undefined ? {} : { document: options.document }) });
      });
      const images = Array.from(doc.images).map(async image => {
        const rawSrc = image.getAttribute('src');
        if (rawSrc && !rawSrc.startsWith('data:') && options?.path) {
          try {
            if (imageDestination(rawSrc) === 'local') {
              const buffer = await read(rawSrc, options.path);
              const bytes = new Uint8Array(buffer);
              const prepared = prepareImage(bytes);
              image.src = `data:${prepared.mime};base64,${uint8ArrayToBase64(prepared.bytes)}`;
            }
          } catch { /* retain original src */ }
        }
        if (image.complete) return;
        return new Promise<void>(resolve => {
          const end = () => { image.removeEventListener('load', end); image.removeEventListener('error', end); resolve(); };
          image.addEventListener('load', end); image.addEventListener('error', end); removers.push(end);
        });
      });
      void Promise.all([...images, doc.fonts?.ready ?? Promise.resolve()]).then(() => {
        if (current() && !frozen && token === generation) { resources = true; schedule(); }
      }).catch(() => { if (token === generation) stop('Cannot finish HTML resources. Select the preview to inspect its complete source.'); });
      schedule();
    } catch { stop('Cannot measure this HTML preview. Select the preview to inspect its complete source.'); }
  };
  const deadline = setTimeout(() => stop('HTML sizing timed out. Select the preview to inspect its complete source.'), 15000);
  window.addEventListener('resize', schedule);
  frame.addEventListener('load', loaded); frame.srcdoc = htmlFrame(source);
  exportFrames.set(frame, () => {
    if (!current() || frozen || !done || !resources || scheduled !== undefined)
      throw new Error('HTML is not ready for complete PNG export. Check its preview or use Print.');
    const doc = frame.contentDocument;
    if (!doc?.body || !doc.documentElement) throw new Error('HTML export content is unavailable.');
    return doc;
  });
  return { frame, ready, dispose() {
    if (!alive) return; alive = false; observer?.disconnect(); frame.removeEventListener('load', loaded);
    exportFrames.delete(frame);
    window.removeEventListener('resize', schedule);
    clearTimeout(scheduled); clearTimeout(quiet); clearTimeout(deadline);
    for (const remove of removers) remove(); complete();
  } };
}
