// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { htmlExportCSS, htmlExportFrame } from '../../src/web/html-frame-export';
import { mountHTMLFrame } from '../../src/web/html-frame';
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.replaceChildren(); });
async function frame(source = '<p>HTML</p>') {
  vi.useFakeTimers();
  const mounted = mountHTMLFrame(source, 'HTML', () => {}, () => {}); document.body.append(mounted.frame);
  const doc = mounted.frame.contentDocument!;
  doc.body.innerHTML = source;
  for (const image of Array.from(doc.images)) Object.defineProperty(image, 'complete', { value: true });
  Object.defineProperties(mounted.frame, { clientWidth: { configurable: true, value: 200 }, clientHeight: { configurable: true, value: 100 } });
  Object.defineProperties(doc.documentElement, { scrollHeight: { value: 100 }, scrollWidth: { value: 200 } });
  const getStyle = doc.defaultView!.getComputedStyle.bind(doc.defaultView);
  vi.spyOn(doc.defaultView!, 'getComputedStyle').mockImplementation(element => getStyle(element));
  mounted.frame.dispatchEvent(new Event('load')); await vi.advanceTimersByTimeAsync(60); await mounted.ready;
  return { ...mounted, doc };
}
it('permits embedded fonts and ordinary styles but rejects CSS resource bypass forms', () => {
  expect(htmlExportCSS('@font-face{font-family:Demo;src:url(data:font/woff2;base64,AA==)} p{color:red}', 'stylesheet')).toContain('@font-face');
  for (const source of ['p{background:url(https://example.test/a)}',
    'p{background:u\\72l(https://example.test/a)}', '@import "https://example.test/a";',
    'p{background:image-set("https://example.test/a" 1x)}',
    'p{--image:url(https://example.test/a);background:var(--image)}',
    '@font-face{font-family:Demo;src:url(file:///tmp/a.woff)}', 'p{content:attr(data-image type(<url>))}'])
    expect(() => htmlExportCSS(source, 'stylesheet')).toThrow();
});
it('requires owned settled frames and detects removal, resize, reload and disposal', async () => {
  expect(() => htmlExportFrame(document.createElement('iframe'))).toThrow('unowned');
  const mounted = await frame();
  const snapshot = htmlExportFrame(mounted.frame); expect(snapshot.width).toBe(200); snapshot.check();
  Object.defineProperty(mounted.frame, 'clientWidth', { value: 150 }); expect(snapshot.check).toThrow('changed');
  mounted.frame.remove(); expect(snapshot.check).toThrow('not ready'); mounted.dispose();
  expect(() => htmlExportFrame(mounted.frame)).toThrow('unowned');
  const reloaded = await frame(); const prior = htmlExportFrame(reloaded.frame);
  reloaded.frame.dispatchEvent(new Event('load')); expect(prior.check).toThrow('not ready'); reloaded.dispose();
  const replaced = await frame(); const oldRoot = htmlExportFrame(replaced.frame);
  const root = replaced.doc.createElement('html'); root.append(replaced.doc.createElement('body'));
  replaced.doc.documentElement.replaceWith(root); expect(oldRoot.check).toThrow('changed'); replaced.dispose();
});
it('rejects blocked resources, failed images, failed fonts and clipped content', async () => {
  for (const source of ['<style>p{background:url(https://example.test/a)}</style><p>Body</p>',
    '<img src="data:image/png;base64,AA==">', '<table background="https://example.test/a"><tr><td>Body</td></tr></table>']) {
    const mounted = await frame(source); expect(() => htmlExportFrame(mounted.frame)).toThrow(); mounted.dispose();
  }
  const fonts = await frame(); Object.defineProperty(fonts.doc, 'fonts', { value: { forEach: (visit: (font: {status:string}) => void) => visit({status:'error'}) } });
  expect(() => htmlExportFrame(fonts.frame)).toThrow('font'); fonts.dispose();
  const clipped = await frame(); Object.defineProperty(clipped.frame, 'clientHeight', { value: 80 });
  expect(() => htmlExportFrame(clipped.frame)).toThrow('clipped'); clipped.dispose();
});
