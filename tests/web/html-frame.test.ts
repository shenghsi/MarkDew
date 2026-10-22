// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { mountHTMLFrame } from '../../src/web/html-frame';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren(); });
function setup() {
  vi.useFakeTimers();
  let height = 600, changed!: () => void;
  const disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { changed = callback; } observe() {} disconnect = disconnect; });
  const measure = vi.fn(), notice = vi.fn(), mounted = mountHTMLFrame('<div style="color:red">日本語</div>', 'HTML preview', measure, notice);
  document.body.append(mounted.frame);
  const doc = mounted.frame.contentDocument!;
  Object.defineProperty(doc.documentElement, 'scrollHeight', { configurable: true, get: () => height });
  mounted.frame.dispatchEvent(new Event('load'));
  return { ...mounted, measure, notice, doc, disconnect, resize: () => changed(), height: (value: number) => { height = value; } };
}
it('fits growing and shrinking content and width changes, with no script permissions or actions', async () => {
  const mounted = setup();
  try {
    await vi.advanceTimersByTimeAsync(60); await mounted.ready;
    expect(mounted.frame.style.height).toBe('600px');
    mounted.height(900); mounted.resize(); await vi.advanceTimersByTimeAsync(60);
    expect(mounted.frame.style.height).toBe('900px');
    mounted.height(100); window.dispatchEvent(new Event('resize')); await vi.advanceTimersByTimeAsync(60);
    expect(mounted.frame.style.height).toBe('100px'); expect(mounted.notice).not.toHaveBeenCalled();
    expect(mounted.frame.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(mounted.frame.srcdoc).toContain("default-src 'none'");
    expect(mounted.frame.srcdoc).toContain("form-action 'none'");
  } finally { mounted.dispose(); }
});
it('waits for data images and fonts before reporting initial settlement', async () => {
  const mounted = setup(); let fonts!: () => void;
  const image = mounted.doc.createElement('img');
  Object.defineProperty(image, 'complete', { get: () => false }); mounted.doc.body.append(image);
  Object.defineProperty(mounted.doc, 'fonts', { value: { ready: new Promise<void>(resolve => { fonts = resolve; }) } });
  mounted.frame.dispatchEvent(new Event('load'));
  let settled = false; void mounted.ready.then(() => { settled = true; });
  // First synthetic load did not yet publish a resource completion microtask.
  await vi.advanceTimersByTimeAsync(60);
  // Reloads can happen after navigation. Only the current load may settle.
  expect(settled).toBe(false);
  image.dispatchEvent(new Event('load')); fonts(); await vi.advanceTimersByTimeAsync(60);
  expect(settled).toBe(true); mounted.dispose();
});
it('caps large content and stops resize feedback with visible source access', async () => {
  const capped = setup(); capped.height(20000); await vi.advanceTimersByTimeAsync(60);
  expect(capped.frame.style.height).toBe('16384px'); expect(capped.notice).toHaveBeenCalledWith(expect.stringContaining('complete source')); capped.dispose();
  const feedback = setup();
  for (let at = 0; at < 10; at++) { feedback.height(600 + at); feedback.resize(); await vi.advanceTimersByTimeAsync(1); }
  expect(feedback.notice).toHaveBeenCalledWith(expect.stringContaining('keeps changing'));
  const before = feedback.measure.mock.calls.length; feedback.resize(); await vi.advanceTimersByTimeAsync(100);
  expect(feedback.measure).toHaveBeenCalledTimes(before); feedback.dispose();
});
it('rejects late callbacks after disposal and reports inaccessible content', async () => {
  const late = setup(); late.dispose(); late.resize(); late.frame.dispatchEvent(new Event('load'));
  await vi.advanceTimersByTimeAsync(20000); expect(late.measure).not.toHaveBeenCalled(); expect(late.notice).not.toHaveBeenCalled();
  expect(late.disconnect).toHaveBeenCalled();
  const missing = setup(); Object.defineProperty(missing.frame, 'contentDocument', { get: () => null });
  await vi.advanceTimersByTimeAsync(60); expect(missing.notice).toHaveBeenCalledWith(expect.stringContaining('Cannot')); missing.dispose();
});
