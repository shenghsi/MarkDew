// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { imageDocument, imageBasePath, imageDestination, imageLimit, imageMime, imagePath, imageReader, mountImage, setImagePath } from '../../src/web/images';
import { rasterHeader } from './raster-fixtures';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0));
let view: EditorView | undefined;
beforeEach(() => {
  const NativeURL = URL;
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = vi.fn(() => 'blob:image-test');
    static revokeObjectURL = vi.fn();
  });
  vi.mocked(invoke).mockResolvedValue(png.buffer);
});
afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(invoke).mockReset(); });
function create(source: string, path = '/tmp/doc.md', documentID?: number) {
  const record = fromSource(source), mode = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), markdown({ base: markdownLanguage }), imageBasePath.of(path), ...(documentID === undefined ? [] : [imageDocument.of(documentID)]), imagePath, mode.of(livePreview)] }), parent: document.body });
  return { editor: view, mode, source: () => savedSource(view!.state.field(sourceField)) };
}
it('uses package image parsing for inline, reference, escaped and formatted alt text', () => {
  const source = '![**图** &amp; `a`][photo]\n\n[photo]: <图%20a.png> "tip &amp; title"';
  const read = imageReader(() => source, '/tmp/doc.md');
  expect(read('![**图** &amp; `a`][photo]')).toEqual({ destination: '%E5%9B%BE%20a.png', alt: '图 & a', title: 'tip & title', path: '/tmp/doc.md' });
  expect(read('![a](image\\(1\\).png)')?.destination).toBe('image(1).png');
  expect(read('![unknown][missing]')).toBeUndefined();
  expect(read('`![code](a.png)`')).toBeUndefined();
});
it('routes a local preview image with its captured document ID and path', async () => {
  create('![文](asset.png)\n\nEnd', '/tmp/tab.md', 42);
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { document: 42, destination: 'asset.png', documentPath: '/tmp/tab.md' }));
  await vi.waitFor(() => expect(document.querySelector('.preview-image img')).not.toBeNull());
});
it('uses sanitized SVG image Blobs without source or history edits and retains invalid SVG source', async () => {
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><script>bad()</script><path d="M0 0h20v10z"/></svg>');
  vi.mocked(invoke).mockResolvedValue(svg.buffer);
  const original = '\uFEFF![图](drawing.svg)\r\n\rEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-image img')).not.toBeNull());
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type:'image/svg+xml'}));
  expect(editor.dom.querySelector('svg, script')).toBeNull(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  vi.mocked(invoke).mockResolvedValue(new TextEncoder().encode('<svg>').buffer);
  editor.dispatch({ effects: setImagePath.of('/other/doc.md') });
  await vi.waitFor(() => expect(document.querySelector('.preview-error')).not.toBeNull());
  expect(URL.revokeObjectURL).toHaveBeenCalled(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});
it('shows HTTPS images without referrers and reveals source with exact history', async () => {
  const original = '\uFEFFBefore\r\n\r\n![图](https://example.com/image.png "tip")\r\n\r\nEnd\n';
  const { editor, mode, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-image img')).not.toBeNull());
  const image = document.querySelector<HTMLImageElement>('.preview-image img')!;
  expect(image.alt).toBe('图'); expect(image.title).toBe('tip'); expect(image.referrerPolicy).toBe('no-referrer'); expect(image.draggable).toBe(false);
  expect(invoke).not.toHaveBeenCalled(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  document.querySelector('.preview-image')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-image')).toBeNull(); expect(editor.state.doc.sliceString(editor.state.selection.main.head).startsWith('![')).toBe(true);
  editor.dispatch({ changes: { from: editor.state.doc.length, insert: 'new' } });
  editor.dispatch({ effects: mode.reconfigure([]) }); undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(original + 'new');
});
it('refreshes local image context and reference destinations without source edits from path changes', async () => {
  const original = '![图][photo]\n\n[photo]: first.png\n\nEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/tmp/doc.md' }));
  await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull());
  editor.dispatch({ effects: setImagePath.of('/other/doc.md') });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/other/doc.md' }));
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0); expect(URL.revokeObjectURL).toHaveBeenCalled();
  const calls = vi.mocked(invoke).mock.calls.length;
  editor.dispatch({ effects: setImagePath.of('/other/doc.md') });
  await vi.waitFor(() => expect(vi.mocked(invoke).mock.calls.length).toBe(calls + 1));
  const from = editor.state.doc.toString().indexOf('first.png'); editor.dispatch({ changes: { from, to: from + 9, insert: 'second.png' } });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'second.png', documentPath: '/other/doc.md' }));
  undo(editor); expect(source()).toBe(original);
});
it('discards late local image results and errors after removal and source-mode changes', async () => {
  let finish!: (bytes: ArrayBuffer) => void;
  vi.mocked(invoke).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { editor, mode } = create('![a](a.png)\n\nEnd');
  await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
  editor.dispatch({ effects: mode.reconfigure([]) }); finish(png.buffer); await Promise.resolve(); await Promise.resolve();
  expect(URL.createObjectURL).not.toHaveBeenCalled(); expect(document.querySelector('img')).toBeNull();
  const dom = document.createElement('span'); document.body.append(dom);
  let reject!: (error: unknown) => void;
  const cancel = mountImage(dom, { destination: 'a.png', path: '', alt: 'a', title: '' }, vi.fn(), () => new Promise((_resolve, fail) => { reject = fail; }));
  await Promise.resolve(); cancel(); dom.remove(); reject('late'); await Promise.resolve(); await Promise.resolve();
  expect(dom.classList.contains('preview-error')).toBe(false);
});
it('retains alt text and editable source after read and decode failures', async () => {
  vi.mocked(invoke).mockRejectedValue('Missing image');
  const original = '![图](missing.png)\n\nEnd';
  const { source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-error')?.textContent).toContain('图'));
  expect(source()).toBe(original);
  document.querySelector('.preview-error')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-image')).toBeNull();
  const dom = document.createElement('span'); document.body.append(dom);
  const cancel = mountImage(dom, { destination: 'https://example.com/broken.png', path: '', alt: 'Broken', title: '' }, vi.fn());
  await Promise.resolve(); dom.querySelector('img')!.dispatchEvent(new Event('error'));
  expect(dom.textContent).toContain('Broken'); expect(dom.dataset.ready).toBe('error'); cancel();
});
it('limits and validates data images and releases their Blob URLs', async () => {
  const dom = document.createElement('span'); document.body.append(dom);
  const data = 'data:image/png;base64,' + btoa(String.fromCharCode(...png));
  const cancel = mountImage(dom, { destination: data, path: '', alt: 'Data', title: '' }, vi.fn());
  await Promise.resolve(); expect(dom.querySelector('img')!.src).toBe('blob:image-test'); cancel();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:image-test');
  for (const destination of ['data:image/jpeg;base64,' + data.split(',')[1], 'data:image/png;base64,***', 'data:image/png;base64,' + 'A'.repeat(Math.ceil(imageLimit / 3) * 4 + 1)]) {
    const failed = document.createElement('span'); document.body.append(failed);
    const dispose = mountImage(failed, { destination, path: '', alt: 'Invalid', title: '' }, vi.fn());
    await Promise.resolve(); await Promise.resolve(); expect(failed.dataset.ready).toBe('error'); dispose();
  }
});
it('rejects unsupported schemes and signatures while leaving normal local paths available', () => {
  for (const destination of ['http://example.com/a.png', '//example.com/a.png', 'file:///tmp/a.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=']) expect(() => imageDestination(destination)).toThrow();
  for (const destination of ['../图%20a.png', '/tmp/a.png', 'C:\\images\\a.png']) expect(imageDestination(destination)).toBe('local');
  expect(imageMime(png)).toBe('image/png'); expect(imageMime(Uint8Array.from([255, 216, 255]))).toBe('image/jpeg');
  expect(imageMime(new TextEncoder().encode('GIF89a'))).toBe('image/gif'); expect(imageMime(new TextEncoder().encode('RIFF1234WEBP'))).toBe('image/webp');
  expect(() => imageMime(new TextEncoder().encode('<svg></svg>'))).toThrow();
});
it('keeps image spelling literal inside formulas and code instead of overlapping their widgets', async () => {
  const original = '$![a](a.png)$\n\n`![b](b.png)`\n\n```\n![c](c.png)\n```\n\nEnd';
  const { source } = create(original);
  expect(document.querySelector('.preview-image')).toBeNull();
  await Promise.resolve(); expect(invoke).not.toHaveBeenCalled(); expect(source()).toBe(original);
});
it('rejects large and incomplete local/data image headers before URL creation and retains exact source', async () => {
  const oversized = rasterHeader('png', 16385, 1);
  for (const bytes of [oversized, png.slice(0, 8)]) {
    vi.mocked(invoke).mockResolvedValue(bytes.buffer);
    const original = '\uFEFF![图](large.png)\r\n\rEnd';
    const { editor, source } = create(original);
    await vi.waitFor(()=>expect(document.querySelector('.preview-error')).not.toBeNull());
    expect(document.querySelector('.preview-error')!.textContent).toContain('图');
    expect(URL.createObjectURL).not.toHaveBeenCalled();expect(source()).toBe(original);expect(undoDepth(editor.state)).toBe(0);
    document.querySelector('.preview-error')!.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));
    expect(document.querySelector('.preview-image')).toBeNull();expect(source()).toBe(original);
    editor.destroy();view=undefined;document.body.replaceChildren();
  }
  const dom=document.createElement('span');document.body.append(dom);
  const dispose=mountImage(dom,{destination:'data:image/png;base64,'+btoa(String.fromCharCode(...oversized)),path:'',alt:'Data',title:''},vi.fn());
  await vi.waitFor(()=>expect(dom.dataset.ready).toBe('error'));
  expect(URL.createObjectURL).not.toHaveBeenCalled();expect(dom.querySelector('img')).toBeNull();dispose();
});
