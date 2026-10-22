// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { documentLanguage } from '../../src/web/document-language';
import { imageBasePath, imageDocument, imagePath, setImagePath } from '../../src/web/images';
import { livePreview } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tableImageEnvironment, tableProjection } from '../../src/web/renderers';
import { rasterHeader } from './raster-fixtures';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0));
let view: EditorView | undefined;
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
beforeEach(() => {
  const NativeURL = URL;
  vi.stubGlobal('URL', class extends NativeURL {
    static createObjectURL = vi.fn(() => 'blob:table-image');
    static revokeObjectURL = vi.fn();
  });
  vi.mocked(invoke).mockResolvedValue(png.buffer);
});
afterEach(() => {
  view?.destroy(); view = undefined; document.body.replaceChildren();
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(invoke).mockReset();
});
function state(source: string, mode: Compartment, path = '/tmp/doc.md', id = 42, context = new Compartment()) {
  const record = fromSource(source);
  return EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), imageBasePath.of(path),
      context.of(imageDocument.of(id)), imagePath, mode.of(livePreview)] });
}
function create(source: string) {
  const mode = new Compartment(), context = new Compartment();
  view = new EditorView({ parent: document.body, state: state(source, mode, '/tmp/doc.md', 42, context) });
  return { editor: view, mode, context, source: () => savedSource(view!.state.field(sourceField)),
    table: () => tableEditor(document.querySelector<HTMLElement>('.preview-table')!)! };
}
const tableSource = '| A | B |\n| - | - |\n| ![**图** &amp; `a`][photo] | other |\n\n[photo]: first.png "title"\n\nEnd';

it('renders package-decoded inline and reference images with captured document context', async () => {
  const { editor, source } = create(tableSource);
  await vi.waitFor(() => expect(document.querySelector('.table-image img')).not.toBeNull());
  expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/tmp/doc.md', document: 42 });
  const image = document.querySelector<HTMLImageElement>('.table-image img')!;
  expect(image.alt).toBe('图 & a'); expect(image.title).toBe('title'); expect(image.referrerPolicy).toBe('no-referrer');
  expect(source()).toBe(tableSource); expect(undoDepth(editor.state)).toBe(0);
});
it('renders local SVG in an image slot and releases it when cell editing begins', async () => {
  vi.mocked(invoke).mockResolvedValue(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><path d="M0 0h20v10z"/></svg>').buffer);
  const original = '| A |\n| - |\n| ![图](drawing.svg) |\n\nEnd', f = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-image img')).not.toBeNull());
  expect(document.querySelector('.table-image svg')).toBeNull();
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type:'image/svg+xml'}));
  f.table().begin(1, 0); expect(URL.revokeObjectURL).toHaveBeenCalled();
  expect(f.table().child!.state.doc.toString()).toBe('![图](drawing.svg)');
  expect(f.source()).toBe(original); expect(undoDepth(f.editor.state)).toBe(0);
});
it('retains table source and cell editing after an oversized image header fails before decoding', async () => {
  vi.mocked(invoke).mockResolvedValue(rasterHeader('gif',16385,1).buffer);
  const {editor,source,table}=create(tableSource);
  await vi.waitFor(()=>expect(document.querySelector('.table-image.preview-error')).not.toBeNull());
  expect(document.querySelector('.table-image.preview-error')!.textContent).toContain('图');
  expect(URL.createObjectURL).not.toHaveBeenCalled();expect(source()).toBe(tableSource);expect(undoDepth(editor.state)).toBe(0);
  table().begin(1,0);expect(table().child!.state.doc.toString()).toContain('[photo]');expect(source()).toBe(tableSource);
});

it('keeps image URLs outside sanitized HTML and retains missing, code, escaped, and authored HTML source', () => {
  const source = '| A |\n| - |\n| [link](https://example.com) ![one](a.png) ![two][p] ![missing][none] `![code](b.png)` \\![escaped](c.png) <span data-table-image="0">raw</span> |';
  const projection = tableProjection(source, tableImageEnvironment('[p]: https://example.com/a.png'), '/tmp/doc.md', 17);
  const dom = document.createElement('div'); dom.innerHTML = projection.html;
  expect(projection.images.map(image => image.destination)).toEqual(['a.png', 'https://example.com/a.png']);
  expect(projection.images.every(image => image.document === 17)).toBe(true);
  expect(dom.querySelectorAll('[data-table-image]')).toHaveLength(2);
  expect(dom.querySelector('a, img, [src], [href]')).toBeNull();
  expect(dom.textContent).toContain('![missing][none]'); expect(dom.textContent).toContain('![code](b.png)');
  expect(dom.textContent).toContain('<span data-table-image="0">raw</span>');
});

it('refreshes reference definitions and image paths while retaining an active cell editor', async () => {
  const { editor, table, source } = create(tableSource);
  await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull());
  table().begin(1, 1); const child = table().child!;
  const at = editor.state.doc.toString().indexOf('first.png');
  editor.dispatch({ changes: { from: at, to: at + 9, insert: 'second.png' } });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'second.png', documentPath: '/tmp/doc.md', document: 42 }));
  expect(table().child).toBe(child);
  editor.dispatch({ effects: setImagePath.of('/other/doc.md') });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'second.png', documentPath: '/other/doc.md', document: 42 }));
  expect(table().child).toBe(child); expect(child.state.doc.toString()).toBe('other');
  undo(editor); expect(source()).toBe(tableSource);
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/other/doc.md', document: 42 }));
});

it('edits image source in its cell through exact outer Undo and Redo', async () => {
  const original = '\uFEFF' + tableSource.replaceAll('\n', '\r\n');
  const { table, editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull());
  const dom = document.querySelector('.table-image')!;
  dom.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  const child = table().child!; expect(child.state.doc.toString()).toBe('![**图** &amp; `a`][photo]');
  expect(document.querySelector('.table-image')).toBeNull(); expect(URL.revokeObjectURL).toHaveBeenCalled();
  child.dispatch({ changes: { from: 0, to: child.state.doc.length, insert: '![new](new.png)' } });
  const changed = original.replace('![**图** &amp; `a`][photo]', '![new](new.png)');
  expect(source()).toBe(changed); expect(undoDepth(editor.state)).toBe(1); expect(undoDepth(child.state)).toBe(0);
  undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(changed);
  table().finish(); await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'new.png', documentPath: '/tmp/doc.md', document: 42 }));
});

it('discards late success and failure after cell activation, Source mode, deletion and tab replacement', async () => {
  for (const action of ['cell', 'source', 'delete', 'tab'] as const) {
    for (const fail of [false, true]) {
      const requests: { resolve: (value: ArrayBuffer) => void; reject: (error: unknown) => void }[] = [];
      vi.mocked(invoke).mockImplementation(() => new Promise((resolve, reject) => requests.push({ resolve, reject })));
      const { editor, mode, table } = create(tableSource);
      await vi.waitFor(() => expect(requests.length).toBe(1));
      const old = document.querySelector<HTMLElement>('.table-image')!;
      if (action === 'cell') table().begin(1, 0);
      if (action === 'source') editor.dispatch({ effects: mode.reconfigure([]) });
      if (action === 'delete') editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: 'Removed' } });
      if (action === 'tab') editor.setState(state('New tab', new Compartment(), '/new/doc.md', 99));
      if (fail) requests[0].reject('late'); else requests[0].resolve(png.buffer);
      await Promise.resolve(); await Promise.resolve();
      expect(old.querySelector('img')).toBeNull(); expect(old.classList.contains('preview-error')).toBe(false);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      editor.destroy(); view = undefined; document.body.replaceChildren(); vi.mocked(invoke).mockClear();
    }
  }
});

it('renders nested table images and excludes metadata reference definitions', async () => {
  const source = '---\n[photo]: wrong.png\n---\n\n> | A |\n> | - |\n> | ![图][photo] |\n\n[photo]: right.png\n\nEnd';
  const { source: exact } = create(source);
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'right.png', documentPath: '/tmp/doc.md', document: 42 }));
  expect(exact()).toBe(source);
});

it('refreshes document identity without source edits and uses new-tab image context', async () => {
  const { editor, context, source } = create(tableSource);
  await vi.waitFor(() => expect(document.querySelector('img')).not.toBeNull());
  editor.dispatch({ effects: context.reconfigure(imageDocument.of(77)) });
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/tmp/doc.md', document: 77 }));
  expect(source()).toBe(tableSource); expect(undoDepth(editor.state)).toBe(0);
  editor.setState(state(tableSource, new Compartment(), '/new/tab.md', 99));
  await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'first.png', documentPath: '/new/tab.md', document: 99 }));
});

it('loads HTTPS without navigation and shows invalid destination and decode errors', async () => {
  const original = '| A | B |\n| - | - |\n| ![Remote](https://example.com/a.png) | ![Invalid](http://example.com/b.png) |\n\nEnd';
  const { source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-image.preview-error')?.textContent).toContain('Invalid'));
  const image = document.querySelector<HTMLImageElement>('.table-image img')!;
  expect(image.src).toBe('https://example.com/a.png'); expect(image.referrerPolicy).toBe('no-referrer');
  expect(invoke).not.toHaveBeenCalled(); expect(document.querySelector('.preview-table a')).toBeNull();
  image.dispatchEvent(new Event('error'));
  expect(document.querySelectorAll('.table-image.preview-error')).toHaveLength(2); expect(source()).toBe(original);
});

it('shows image errors with alt text while preserving cell source and passive links', async () => {
  vi.mocked(invoke).mockRejectedValue('Missing file');
  const original = '| A |\n| - |\n| ![Missing](gone.png) [link](https://example.com) |\n\nEnd';
  const { source, table } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.table-image.preview-error')?.textContent).toContain('Missing'));
  expect(document.querySelector('.preview-table a')).toBeNull(); expect(source()).toBe(original);
  table().begin(1, 0); expect(table().child!.state.doc.toString()).toBe('![Missing](gone.png) [link](https://example.com)');
});
