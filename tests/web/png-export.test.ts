// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { exportPNG, pngBytes, pngDimensions, writePNG } from '../../src/web/png-export';
import { invoke } from '@tauri-apps/api/core';
import { mountHTMLFrame } from '../../src/web/html-frame';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
afterEach(() => {
  document.body.replaceChildren(); vi.restoreAllMocks(); vi.useRealTimers();
  if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
  else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
});
function paper() {
  const element = document.createElement('article'); element.className = 'print-paper'; element.textContent = '日本語😀 and complete document';
  Object.defineProperties(element, { scrollWidth: { value: 200 }, scrollHeight: { value: 100 } }); document.body.append(element); return element;
}
function raster(blank = false) {
  const bytes = new Uint8Array(33); bytes.set([137,80,78,71,13,10,26,10]);
  const header = new DataView(bytes.buffer); header.setUint32(16, 200); header.setUint32(20, 100);
  return vi.fn(async () => ({ width: 200, height: 100,
    getContext: () => ({ getImageData: () => ({ data: Uint8ClampedArray.from(blank ? [255,255,255,255] : [0,0,0,255]) }) }),
    toBlob: (callback: (blob: Blob) => void) => callback({ size: bytes.length, arrayBuffer: async () => bytes.buffer } as Blob),
  } as unknown as HTMLCanvasElement));
}
async function mountedFrame(element: HTMLElement, imageOnly = false) {
  vi.useFakeTimers();
  const mounted = mountHTMLFrame('<div>Frame</div>', 'HTML frame', () => {}, () => {}); element.append(mounted.frame);
  const doc = mounted.frame.contentDocument!;
  doc.body.textContent = imageOnly ? '' : 'Frame';
  if (imageOnly) {
    const image = doc.createElement('img'); image.src = 'data:image/png;base64,AA==';
    Object.defineProperties(image, { complete: { value: true }, naturalWidth: { value: 5 }, naturalHeight: { value: 5 } }); doc.body.append(image);
  }
  Object.defineProperties(mounted.frame, { clientWidth: { value: 200 }, clientHeight: { value: 50 } });
  Object.defineProperty(doc.documentElement, 'scrollHeight', { value: 50 });
  const getStyle = doc.defaultView!.getComputedStyle.bind(doc.defaultView);
  vi.spyOn(doc.defaultView!, 'getComputedStyle').mockImplementation(node => getStyle(node));
  mounted.frame.dispatchEvent(new Event('load')); await vi.advanceTimersByTimeAsync(60); await mounted.ready; vi.useRealTimers();
  return mounted;
}
function frameCanvas(blank = false) {
  return { width: 200, height: 50, toDataURL: () => 'data:image/png;base64,AA==',
    getContext: () => ({ getImageData: () => ({ data: Uint8ClampedArray.from(blank ? [255,255,255,255] : [10,20,30,255]) }) }),
  } as unknown as HTMLCanvasElement;
}
it('captures multiple original frames as separate images without attaching authored frame copies', async () => {
  const element = paper(), first = await mountedFrame(element), second = await mountedFrame(element);
  Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: vi.fn(async () => {}) });
  const final = raster(), capture = vi.fn(async (node: HTMLElement) => {
    expect(document.querySelectorAll('iframe')).toHaveLength(2);
    if (node === first.frame.contentDocument!.documentElement || node === second.frame.contentDocument!.documentElement) return frameCanvas();
    expect(node.querySelector('iframe')).toBeNull(); expect(node.querySelectorAll('img')).toHaveLength(2); return final();
  });
  try {
    await pngBytes(element, new AbortController().signal, capture); expect(capture).toHaveBeenCalledTimes(3);
    expect(element.querySelectorAll('iframe')).toHaveLength(2); expect(document.querySelectorAll('.print-paper')).toHaveLength(1);
  } finally { first.dispose(); second.dispose(); }
});
it('rejects a blank image-only HTML capture before the outer document can mask it', async () => {
  const element = paper(), mounted = await mountedFrame(element, true), capture = vi.fn(async () => frameCanvas(true));
  try { await expect(pngBytes(element, new AbortController().signal, capture)).rejects.toThrow('empty image'); expect(capture).toHaveBeenCalledTimes(1); }
  finally { mounted.dispose(); }
});
it('cancels frame capture, rejects removed originals and retains rasterization failures without a clone', async () => {
  const element = paper(), mounted = await mountedFrame(element), controller = new AbortController();
  let done!: (canvas: HTMLCanvasElement) => void;
  const slow = vi.fn(() => new Promise<HTMLCanvasElement>(resolve => { done = resolve; }));
  const pending = pngBytes(element, controller.signal, slow);
  await vi.waitFor(() => expect(slow).toHaveBeenCalled()); controller.abort(); await expect(pending).rejects.toThrow(); done(frameCanvas());
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1);
  await expect(pngBytes(element, new AbortController().signal, async () => { throw new Error('frame failed'); })).rejects.toThrow('frame failed');
  await expect(pngBytes(element, new AbortController().signal, async () => { mounted.frame.remove(); return frameCanvas(); })).rejects.toThrow('not ready');
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1); mounted.dispose();
});
it('captures the complete paper with bounded dimensions, checks pixels and removes its clone', async () => {
  const element = paper(), capture = raster(); const bytes = await pngBytes(element, new AbortController().signal, capture);
  expect(bytes).toHaveLength(33); expect(capture.mock.calls).toHaveLength(1);
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1); expect(element.textContent).toContain('complete document');
});
it('rejects oversized dimensions, frames, a blank canvas and failed encoding before saving', async () => {
  for (const [width, height] of [[0,1], [16385,1], [16384,16384], [Infinity,1], [1.5,1]]) expect(() => pngDimensions(width,height)).toThrow();
  pngDimensions(820,1000);
  const element = paper(); element.append(document.createElement('iframe'));
  await expect(pngBytes(element, new AbortController().signal, raster())).rejects.toThrow('unowned HTML frame'); element.querySelector('iframe')!.remove();
  await expect(pngBytes(element, new AbortController().signal, raster(true))).rejects.toThrow('empty image');
  const failed = raster(); failed.mockImplementation(async () => { throw new Error('canvas failed'); });
  await expect(pngBytes(element, new AbortController().signal, failed)).rejects.toThrow('canvas failed');
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1);
});
it('cancels and times out a capture without keeping a clone or publishing late results', async () => {
  const element = paper(), controller = new AbortController(); let resolve!: (canvas: HTMLCanvasElement) => void;
  const capture = vi.fn(() => new Promise<HTMLCanvasElement>(done => { resolve = done; }));
  const pending = pngBytes(element, controller.signal, capture);
  await vi.waitFor(() => expect(capture).toHaveBeenCalled()); controller.abort(); await expect(pending).rejects.toThrow();
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1); resolve(await raster()());
  vi.useFakeTimers(); const slow = pngBytes(element, new AbortController().signal, () => new Promise(() => {}));
  const rejected = expect(slow).rejects.toThrow('timed out'); await vi.advanceTimersByTimeAsync(30000); await rejected;
  expect(document.querySelectorAll('.print-paper')).toHaveLength(1);
});
it('rejects unavailable image pixels rather than substituting an empty image', async () => {
  const element = paper(), image = document.createElement('img'); image.src = 'blob:unavailable'; image.alt = 'Missing'; element.append(image);
  const capture = raster(); await expect(pngBytes(element, new AbortController().signal, capture)).rejects.toThrow('Cannot export image');
  expect(capture).not.toHaveBeenCalled(); expect(document.querySelectorAll('.print-paper')).toHaveLength(1);
});
it('keeps picker cancellation and closed-picker results from dispatching a file write', async () => {
  const element = paper(), capture = vi.fn(async () => new Uint8Array([1,2,3])), write = vi.fn(async () => {}), dispatched = vi.fn();
  const choose = vi.fn(async () => null);
  expect(await exportPNG(element, 'Writing.md', new AbortController().signal, dispatched, { capture, choose, write })).toBe(false);
  expect(choose).toHaveBeenCalledWith('Writing.png'); expect(write).not.toHaveBeenCalled(); expect(dispatched).not.toHaveBeenCalled();
  const controller = new AbortController();
  await expect(exportPNG(element, 'Writing.md', controller.signal, dispatched, { capture, choose: async () => { controller.abort(); return '/tmp/image.png'; }, write })).rejects.toThrow();
  expect(write).not.toHaveBeenCalled(); expect(dispatched).not.toHaveBeenCalled();
});
it('reports the actual host result after dispatch even if cancellation arrives later', async () => {
  const controller = new AbortController(), bytes = new Uint8Array([1,2,3]), dispatched = vi.fn();
  const effects = { capture: async () => bytes, choose: async () => '/tmp/image.png', write: vi.fn(async () => { controller.abort(); }) };
  expect(await exportPNG(paper(), 'Writing.md', controller.signal, dispatched, effects)).toBe(true);
  expect(effects.write).toHaveBeenCalledWith('/tmp/image.png', bytes); expect(dispatched).toHaveBeenCalledTimes(1);
  const failed = { ...effects, write: async () => { throw new Error('PNG was published, but confirmation failed'); } };
  await expect(exportPNG(paper(), 'Writing.md', new AbortController().signal, dispatched, failed)).rejects.toThrow('was published');
});
it('sends binary IPC bytes and an encoded path and retains host write errors', async () => {
  const bytes = new Uint8Array([1,2,3]); vi.mocked(invoke).mockResolvedValue(undefined);
  await writePNG('/tmp/文😀.png', bytes);
  expect(invoke).toHaveBeenCalledWith('save_png', bytes, { headers: { 'x-export-path': encodeURIComponent('/tmp/文😀.png') } });
  vi.mocked(invoke).mockRejectedValue(new Error('PNG was published, but confirmation failed'));
  await expect(writePNG('/tmp/文😀.png', bytes)).rejects.toThrow('was published');
});
