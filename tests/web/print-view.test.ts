// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history, undoDepth } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { documentLanguage } from '../../src/web/document-language';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { printView, showPrintView, PrintSnapshot } from '../../src/web/print-view';
import { rasterHeader } from './raster-fixtures';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.setAttribute('open', ''); } });
const projections: ReturnType<typeof printView>[] = [];
afterEach(() => { for (const projection of projections.splice(0)) projection.dispose(); window.dispatchEvent(new Event('pagehide')); document.body.replaceChildren(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(invoke).mockReset(); vi.useRealTimers(); });
function snapshot(source: string): PrintSnapshot {
  const record = fromSource(source);
  return { state: EditorState.create({ doc: normalize(record.raw), extensions: [sourceExtensions(record), history(), documentLanguage()] }),
    id: 42, path: '/tmp/writing.md', title: 'Writing.md' };
}
function create(source: PrintSnapshot, renderers?: Parameters<typeof printView>[1]) {
  const projection = printView(source, renderers); projections.push(projection); document.body.append(projection.element); return projection;
}
it('renders a complete immutable document, GFM, metadata and highlighted code without source or history edits', async () => {
  const original = '\uFEFF---\r\ntitle: 文😀\r\n---\r\n# First\n\n- [x] Done\n- [ ] Next\n\n| A | B |\n| - | - |\n| 一 | 二 |\n\n~~removed~~ **strong**\n\n```js\nconst x = "word";\n```\n\n'
    + Array.from({ length: 1000 }, (_, i) => `Paragraph ${i}\n\n`).join('') + '# Final sentinel\n';
  const captured = snapshot(original), previous = captured.state;
  const projection = create(captured); captured.title = 'Later'; captured.id = 100; captured.path = '/tmp/other.md';
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelector('.print-metadata')!.textContent).toContain('title: 文😀');
  expect(projection.element.querySelector('table')!.textContent).toContain('一');
  expect(projection.element.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
  expect(projection.element.querySelector('del')!.textContent).toBe('removed');
  expect(projection.element.querySelector('code .tok-keyword')!.textContent).toBe('const');
  expect(projection.element.querySelectorAll('p')).toHaveLength(1001);
  expect(projection.element.querySelectorAll('h1')[1].textContent).toBe('Final sentinel');
  expect(projection.snapshot).toMatchObject({ id: 42, path: '/tmp/writing.md', title: 'Writing.md' });
  expect(projection.snapshot.state).toBe(previous); expect(savedSource(previous.field(sourceField))).toBe(original); expect(undoDepth(previous)).toBe(0);
});
it('renders bundled math in body and footnotes and preserves note resource restrictions', async () => {
  const projection = create(snapshot('Formula $x^2$. Note[^one].\n\n$$\n\\frac{1}{2}\n$$\n\n```math\nx^3\n```\n\n```latex\nx^4\n```\n\n[^one]: Math $y^2$, ![ALT](local.png), <b>literal</b>, [link](https://example.com), [^nested].\n'));
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelectorAll('mjx-container')).toHaveLength(5);
  expect(projection.element.querySelectorAll('svg path').length).toBeGreaterThan(0);
  expect(projection.element.textContent).toContain('ALT'); expect(projection.element.textContent).toContain('<b>');
  expect(projection.element.textContent).toContain('[^nested]');
  expect(projection.element.querySelector('iframe, img, [href], [src], form, button')).toBeNull();
  expect(vi.mocked(invoke)).not.toHaveBeenCalled();
});
it('isolates authored HTML and strips actions from generated links and renderer output', async () => {
  const projection = create(snapshot('[Go](https://example.com)\n\n<div><script>bad()</script><img src="https://example.com/pixel"><form action="https://example.com">Text</form></div>\n\n$z$\n'), {
    formula: async () => '<svg><a href="https://example.com"><text>safe</text></a><foreignObject><button>bad</button></foreignObject></svg>', diagram: async () => '',
  });
  const frame = projection.element.querySelector('iframe')!;
  expect(frame.getAttribute('sandbox')).toBe('allow-same-origin'); expect(frame.srcdoc).toContain("default-src 'none'"); expect(frame.srcdoc).not.toContain('<script>');
  frame.dispatchEvent(new Event('load')); const warnings = await projection.ready;
  expect(warnings).toHaveLength(1); expect(warnings[0]).toContain('clipped');
  expect(projection.element.querySelector('[href], script, form, foreignObject, button, img')).toBeNull();
});
it('formats inline HTML around Markdown and math without changing exact source or history', async () => {
  const original = '\uFEFFBefore <kbd>Enter</kbd> <span lang="ja" dir="ltr">**日本語** $x^2$</span> H<sub>2</sub>O.<br>Next\r\n';
  const captured = snapshot(original), projection = create(captured);
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelector('kbd')!.textContent).toBe('Enter');
  expect(projection.element.querySelector('span[lang=ja] strong')!.textContent).toBe('日本語');
  expect(projection.element.querySelector('span[lang=ja] mjx-container')).not.toBeNull();
  expect(projection.element.querySelector('sub')!.textContent).toBe('2');
  expect(projection.element.querySelector('br')).not.toBeNull();
  expect(projection.element.querySelector('iframe')).toBeNull();
  expect(savedSource(captured.state.field(sourceField))).toBe(original); expect(undoDepth(captured.state)).toBe(0);
});

it('prints long semantic HTML blocks in ordinary page flow with exact source and history', async () => {
  const original = '\uFEFF<div dir="rtl" lang="ar" title="Section" id="authored" class="print-controls" onclick="bad()">\r\n<h2>HTML section</h2>\r\n'
    + Array.from({ length: 40 }, (_, i) => `<p>Paragraph ${i}: 日本語😀 <strong>bold</strong></p>\r\n`).join('')
    + '<p>Final sentinel</p>\r\n</div>\r\n';
  const captured = snapshot(original), state = captured.state, projection = create(captured);
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelector('iframe, [onclick], #authored, .print-controls')).toBeNull();
  const block = projection.element.querySelector('.print-html > div')!;
  expect(block.getAttribute('dir')).toBe('rtl'); expect(block.getAttribute('lang')).toBe('ar'); expect(block.getAttribute('title')).toBe('Section');
  expect(block.querySelectorAll('p')).toHaveLength(41); expect(block.textContent).toContain('Final sentinel');
  expect(block.querySelectorAll('strong')).toHaveLength(40);
  expect(captured.state).toBe(state); expect(savedSource(state.field(sourceField))).toBe(original); expect(undoDepth(state)).toBe(0);
});

it('retains semantic lists and table spans through the final sanitizer and package repairs', async () => {
  const projection = create(snapshot('<div><ol start="-3"><li>First<ul><li>Nested</li></ul></li></ol>\n'
    + '<table><caption>Values</caption><colgroup><col span="2"></colgroup><thead><tr><th colspan="2">Title</th></tr></thead>'
    + '<tbody><tr><td rowspan="2">One</td><td>Two</td></tr><tr><td>Three</td></tr></tbody></table>\n'
    + '<p>Before<div>Block</div>After</p><table>Fostered<tr><td>Cell</td></tr>text</table></div>'));
  expect(await projection.ready).toEqual([]); expect(projection.element.querySelector('iframe')).toBeNull();
  expect(projection.element.querySelector('ol')!.getAttribute('start')).toBe('-3');
  expect(projection.element.querySelector('col')!.getAttribute('span')).toBe('2');
  expect(projection.element.querySelector('th')!.getAttribute('colspan')).toBe('2');
  expect(projection.element.querySelector('td')!.getAttribute('rowspan')).toBe('2');
  expect(projection.element.textContent).toContain('BeforeBlockAfter');
  expect(projection.element.textContent).toContain('FosteredtextCell');
  expect(projection.element.querySelector('ol ul li')!.textContent).toBe('Nested');
});

it('keeps complete isolated fallback for styled, resource, document and invalid-span HTML', async () => {
  for (const html of ['<div style="color:red">Styled</div>', '<div><img src="data:image/png;base64,AA=="></div>',
    '<div><svg><text>Foreign</text></svg></div>', '<div><form><input></form></div>',
    '<html><body style="color:red"><p>Body</p></body></html>', '<head></head><body>Body</body>',
    '<!doctype html><p>Body</p>', '<table><tr><td colspan="1001">Too wide</td></tr></table>',
    '<table><tr><td rowspan="0">Unbounded</td></tr></table>', '<ol start="1000000001"><li>Too high</li></ol>']) {
    const projection = create(snapshot(html + '\n\nFollowing sentinel'));
    const frame = projection.element.querySelector('iframe')!; expect(frame).not.toBeNull();
    expect(frame.getAttribute('sandbox')).toBe('allow-same-origin'); expect(frame.srcdoc).toContain("default-src 'none'");
    frame.dispatchEvent(new Event('load')); expect(await projection.ready).toHaveLength(1);
    expect(projection.element.textContent).toContain('Following sentinel');
    expect(projection.element.querySelector('script, form, input, img, svg, [style]:not(iframe)')).toBeNull();
  }
});

it('prints HTML blocks inside Markdown lists and quotes without clipping frames', async () => {
  const projection = create(snapshot('> <div><h3>Quote</h3><p>Body</p></div>\n\n- Item\n\n  <div><p>List HTML</p></div>'));
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelector('blockquote h3')!.textContent).toBe('Quote');
  expect(projection.element.querySelector('li .print-html p')!.textContent).toBe('List HTML');
  expect(projection.element.querySelector('iframe')).toBeNull();
});

it('permits PNG export for supported block HTML in the Print modal', async () => {
  const original = '\uFEFF<div><h2>Heading</h2><p>日本語😀</p></div>\r\n', captured = snapshot(original);
  await showPrintView(captured);
  expect(document.querySelector<HTMLButtonElement>('#export-png')!.disabled).toBe(false);
  expect(document.querySelector('.print-warnings')!.textContent).toBe('');
  expect(document.querySelector('.print-paper h2')!.textContent).toBe('Heading');
  expect(document.querySelector('.print-paper iframe')).toBeNull();
  expect(savedSource(captured.state.field(sourceField))).toBe(original); expect(undoDepth(captured.state)).toBe(0);
});
it('formats inline HTML in headings, table cells and list items while keeping note HTML literal', async () => {
  const projection = create(snapshot('# Title <small>small</small>\n\n- [x] Use <kbd>Enter</kbd>.\n- [ ] Next <kbd>Tab</kbd>.\n\n| A <sup>1</sup> |\n| - |\n| <b>bold $x$</b> |\n\nCall[^n].\n\n[^n]: <kbd>literal</kbd>\n'));
  expect(await projection.ready).toEqual([]);
  expect(projection.element.querySelector('h1 small')!.textContent).toBe('small');
  expect(projection.element.querySelector('li kbd')!.textContent).toBe('Enter');
  const tasks = projection.element.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
  expect(tasks).toHaveLength(2); expect(tasks[0].checked).toBe(true); expect(tasks[1].checked).toBe(false);
  expect(Array.from(tasks).every(task => task.disabled)).toBe(true);
  expect(projection.element.querySelector('th sup')!.textContent).toBe('1');
  expect(projection.element.querySelector('td b mjx-container')).not.toBeNull();
  expect(projection.element.textContent).toContain('<kbd>literal</kbd>');
});
it('removes authored slot attributes, styles, IDs, events and link actions before renderer publication', async () => {
  const formula = vi.fn(async () => '<svg><text>rendered</text></svg>');
  const projection = create(snapshot('Before <span data-print-slot="0" class="print-math print-controls" id="export-png" style="position:fixed" onclick="bad()" title="hint">forged</span> <a href="https://example.com" download="bad">link</a> <b>$real$</b>.'),
    { formula, diagram: async () => '' });
  expect(await projection.ready).toEqual([]); expect(formula).toHaveBeenCalledExactlyOnceWith('real', false);
  expect(projection.element.querySelectorAll('[data-print-slot]')).toHaveLength(1);
  expect(projection.element.querySelector('[data-print-slot]')!.closest('b')).not.toBeNull();
  expect(projection.element.querySelector('[title=hint]')!.textContent).toBe('forged');
  expect(projection.element.querySelector('[id], [style], [onclick], [href], [download], .print-controls')).toBeNull();
});
it('uses visible enclosing source for raw-text, foreign, resource, forged and table HTML', async () => {
  for (const html of ['<script>bad()</script>', '<style>body{display:none}</style>', '<textarea>text</textarea>',
    '<svg><text>foreign</text></svg>', '<img src="https://example.com/pixel">', '<input autofocus>',
    '<printSlot key="0">forged</printSlot>', '<table><tr><td>$hidden$</td></tr></table>']) {
    const original = `Before ${html} $unrendered$ after.\n\n$outside$`, captured = snapshot(original);
    const formula = vi.fn(async source => `<svg><text>${source}</text></svg>`);
    const projection = create(captured, { formula, diagram: async () => '' });
    expect(await projection.ready).toEqual(['Unsupported inline HTML is printed as source.']);
    expect(projection.element.querySelector('p')!.textContent).toBe(original.split('\n\n')[0]);
    expect(formula).toHaveBeenCalledExactlyOnceWith('outside', false);
    expect(projection.element.querySelector('script, style, textarea, img, input, printSlot, table, [href], [src]')).toBeNull();
    expect(savedSource(captured.state.field(sourceField))).toBe(original); expect(undoDepth(captured.state)).toBe(0);
  }
});
it('falls back for an escaped fragment boundary without losing later renderer slots', async () => {
  const formula = vi.fn(async source => `<svg><text>${source}</text></svg>`);
  const first = 'Before </span><kbd>moved $hidden$</kbd> after.';
  const projection = create(snapshot(first + '\n\n<b>$next$</b>'), { formula, diagram: async () => '' });
  expect(await projection.ready).toEqual(['Unsupported inline HTML is printed as source.']);
  expect(projection.element.querySelector('p')!.textContent).toBe(first);
  expect(formula).toHaveBeenCalledExactlyOnceWith('next', false);
  expect(projection.element.querySelector('b svg')!.textContent).toBe('next');
});
it('discards fallback image jobs and keeps later captured image slots beside inline formatting', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png',1,1).buffer);
  vi.stubGlobal('URL', class extends URL {static createObjectURL=vi.fn(()=>'blob:inline-print');static revokeObjectURL=vi.fn();});
  const original = 'Before <svg>![ignored](old.png)</svg> after.\n\nBefore <b>![kept](next.png)</b> after.';
  const captured = snapshot(original), projection = create(captured);
  await vi.waitFor(() => expect(projection.element.querySelector('b img')).not.toBeNull());
  projection.element.querySelector('b img')!.dispatchEvent(new Event('load'));
  expect(await projection.ready).toEqual(['Unsupported inline HTML is printed as source.']);
  expect(vi.mocked(invoke)).toHaveBeenCalledExactlyOnceWith('read_image', {document:42,documentPath:'/tmp/writing.md',destination:'next.png'});
  expect(projection.element.querySelectorAll('[data-print-slot]')).toHaveLength(1);
  expect(savedSource(captured.state.field(sourceField))).toBe(original);expect(undoDepth(captured.state)).toBe(0);
});
it('settles failures with visible source and ignores late formula results after disposal', async () => {
  let resolve!: (html: string) => void;
  const projection = create(snapshot('$pending$\n\n```mermaid\nbad diagram\n```'), {
    formula: () => new Promise(done => { resolve = done; }), diagram: async () => { throw new Error('bad diagram'); },
  });
  await vi.waitFor(() => expect(projection.element.querySelector('.print-error')!.textContent).toContain('bad diagram'));
  projection.dispose(); await projection.ready; resolve('<svg><text>late</text></svg>'); await Promise.resolve();
  expect(projection.element.querySelector('svg')).toBeNull(); expect(projection.element.isConnected).toBe(false);
});
it('captures the local image document and path and releases its Blob URL on close', async () => {
  const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0)).buffer;
  vi.mocked(invoke).mockResolvedValue(bytes);
  const createURL = vi.fn(() => 'blob:print-image'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createURL; static revokeObjectURL = revoke; });
  const captured = snapshot('![Local](picture.png)\n\n![Reference][picture]\n\n[picture]: second.png');
  const projection = create(captured); captured.id = 99; captured.path = '/tmp/later.md';
  await vi.waitFor(() => expect(projection.element.querySelectorAll('img')).toHaveLength(2));
  const calls = vi.mocked(invoke).mock.calls;
  expect(calls[0]).toEqual(['read_image', { document: 42, documentPath: '/tmp/writing.md', destination: 'picture.png' }]);
  expect(calls[1]).toEqual(['read_image', { document: 42, documentPath: '/tmp/writing.md', destination: 'second.png' }]);
  projection.element.querySelectorAll('img').forEach(image => image.dispatchEvent(new Event('load')));
  expect(await projection.ready).toEqual([]); projection.dispose(); expect(revoke).toHaveBeenCalledTimes(2);
});
it('prints local SVG through the shared image loader and releases its image URL', async () => {
  vi.mocked(invoke).mockResolvedValue(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><script>bad()</script><rect width="20" height="10"/></svg>').buffer);
  const createURL = vi.fn(() => 'blob:svg-print'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL {static createObjectURL=createURL;static revokeObjectURL=revoke;});
  const original = '\uFEFF![图](drawing.svg)\r\nEnd', captured = snapshot(original), projection = create(captured);
  await vi.waitFor(() => expect(projection.element.querySelector('img')).not.toBeNull());
  expect(createURL).toHaveBeenCalledWith(expect.objectContaining({type:'image/svg+xml'}));
  expect(projection.element.querySelector('svg, script')).toBeNull();
  projection.element.querySelector('img')!.dispatchEvent(new Event('load')); expect(await projection.ready).toEqual([]);
  expect(savedSource(captured.state.field(sourceField))).toBe(original); expect(undoDepth(captured.state)).toBe(0);
  projection.dispose(); expect(revoke).toHaveBeenCalledWith('blob:svg-print');
});
it('times out slow jobs and cancels image publication without falling back to another tab', async () => {
  vi.useFakeTimers(); let resolve!: (bytes: ArrayBuffer) => void;
  vi.mocked(invoke).mockImplementation(() => new Promise(done => { resolve = done; }));
  const projection = create(snapshot('![Missing](missing.png) $slow$'), { formula: () => new Promise(() => {}), diagram: async () => '' });
  await vi.advanceTimersByTimeAsync(15000);
  expect(await projection.ready).toHaveLength(2);
  resolve(Uint8Array.from([137,80,78,71,13,10,26,10]).buffer); await Promise.resolve(); await Promise.resolve();
  expect(projection.element.querySelector('img, svg')).toBeNull(); expect(projection.element.textContent).toContain('slow');
  expect(vi.mocked(invoke)).toHaveBeenCalledTimes(1);
});
it('settles oversized image headers as print warnings without browser decoding or source edits', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('png',16385,1).buffer);
  const createURL=vi.fn();vi.stubGlobal('URL',class extends URL {static createObjectURL=createURL;static revokeObjectURL=vi.fn();});
  const original='\uFEFF![Large](picture.png)\r\nEnd', captured=snapshot(original), projection=create(captured);
  expect(await projection.ready).toHaveLength(1);expect(projection.element.textContent).toContain('Large');
  expect(projection.element.querySelector('img')).toBeNull();expect(createURL).not.toHaveBeenCalled();
  expect(savedSource(captured.state.field(sourceField))).toBe(original);expect(undoDepth(captured.state)).toBe(0);
});
it('loads diagrams as isolated SVG images and releases URLs on load error, timeout, and close', async () => {
  const createURL = vi.fn((_blob: Blob) => 'blob:diagram'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createURL; static revokeObjectURL = revoke; });
  const renderers = { formula: async () => '', diagram: async () => '<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:white}</style><rect width="20" height="20"/></svg>' };
  const loaded = create(snapshot('```mermaid\nflowchart LR\nA-->B\n```'), renderers);
  await vi.waitFor(() => expect(loaded.element.querySelector('img')).not.toBeNull());
  expect(loaded.element.querySelector('style, svg')).toBeNull();
  expect(createURL.mock.calls[0][0]).toMatchObject({ type: 'image/svg+xml' });
  loaded.element.querySelector('img')!.dispatchEvent(new Event('load'));
  expect(await loaded.ready).toEqual([]); loaded.dispose(); expect(revoke).toHaveBeenCalledTimes(1);
  const failed = create(snapshot('```mermaid\ninvalid\n```'), renderers);
  await vi.waitFor(() => expect(failed.element.querySelector('img')).not.toBeNull());
  failed.element.querySelector('img')!.dispatchEvent(new Event('error'));
  expect(await failed.ready).toHaveLength(1); expect(failed.element.textContent).toContain('invalid'); expect(revoke).toHaveBeenCalledTimes(2);
  vi.useFakeTimers(); const slow = create(snapshot('```mermaid\nslow\n```'), renderers);
  await vi.advanceTimersByTimeAsync(15000);
  expect(await slow.ready).toHaveLength(1); expect(revoke).toHaveBeenCalledTimes(3); expect(slow.element.querySelector('img')).toBeNull();
});
it('enables Print only after the snapshot is ready and cleans up the modal', async () => {
  const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  const pending = showPrintView(snapshot('$x^2$'));
  const button = document.querySelector<HTMLButtonElement>('.print-controls button')!; expect(button.disabled).toBe(true);
  await pending; expect(button.disabled).toBe(false); button.click(); expect(print).toHaveBeenCalledTimes(1);
  document.querySelector<HTMLButtonElement>('.print-controls button:last-child')!.click();
  expect(document.querySelector('.print-dialog')).toBeNull(); expect(show).toHaveBeenCalledTimes(1);
});
it('permits PNG and Print for supported inline HTML without an HTML-frame warning', async () => {
  const original = '\uFEFFPress <kbd>Enter</kbd> and <b>$x^2$</b>.\r\n', captured = snapshot(original);
  await showPrintView(captured);
  expect(document.querySelector('.print-warnings')!.textContent).toBe('');
  expect(document.querySelector<HTMLButtonElement>('#export-png')!.disabled).toBe(false);
  expect(document.querySelector<HTMLButtonElement>('.print-controls button')!.disabled).toBe(false);
  expect(document.querySelector('.print-paper iframe')).toBeNull();
  expect(document.querySelector('.print-paper kbd')!.textContent).toBe('Enter');
  expect(savedSource(captured.state.field(sourceField))).toBe(original); expect(undoDepth(captured.state)).toBe(0);
});
