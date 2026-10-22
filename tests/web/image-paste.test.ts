// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState, Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { forceParsing } from '@codemirror/language';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { imagePaste } from '../../src/web/image-paste';
import { imageBasePath, imageDocument, imagePath, setImagePath } from '../../src/web/images';
import { linkVersion } from '../../src/web/links';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { livePreview } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import { rasterHeader } from './raster-fixtures';

const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0));
const file = (bytes: Uint8Array = png, type = 'image/png') => new File([bytes as BlobPart], 'clipboard.png', { type });
let view: EditorView | undefined;
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:clipboard-test' });
Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });
function create(source = 'Text\n\nEnd', at = 0, extensions: Extension = []) {
  const messages: string[] = [], lock = new Compartment(); let busy = false;
  const makeState = (source: string, id: number) => EditorState.create({ doc: normalize(fromSource(source).raw), selection: { anchor: at },
    extensions: [sourceExtensions(fromSource(source)), history(), linkVersion, documentLanguage(), imagePath, imageBasePath.of('/notes/a.md'), imageDocument.of(id),
      lock.of([]), EditorState.allowMultipleSelections.of(true), imagePaste(message => messages.push(message), () => busy ? 'Busy' : null), extensions] });
  view = new EditorView({ state: makeState(source, 0), parent: document.body });
  return { editor: view, messages, lock, busy: (value: boolean) => { busy = value; }, makeState,
    source: () => savedSource(view!.state.field(sourceField)) };
}
function paste(files: File[] = [file()], plain = '', html = '', target = view!.contentDOM, uri = '') {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { types: ['Files'], files,
    items: files.map(file => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    getData: (type: string) => type === 'text/plain' ? plain : type === 'text/html' ? html : type === 'text/uri-list' ? uri : '', setData: vi.fn() } });
  target.dispatchEvent(event); return event;
}
function delayedRead() {
  let reader: FileReader | undefined;
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function(this: FileReader) { reader = this; });
  return (bytes = png) => {
    Object.defineProperty(reader!, 'result', { value: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
    reader!.dispatchEvent(new Event('load'));
  };
}

it('routes image-only paste into one exact source transaction with Undo and Redo', async () => {
  const original = '\uFEFF图😀\r\n\rTail\nEnd', { editor, source, messages } = create(original);
  editor.dispatch({ selection: { anchor: 0, head: 3 } });
  expect(paste().defaultPrevented).toBe(true);
  await vi.waitFor(() => expect(messages.at(-1)).toBe('Image pasted.'));
  const expected = `\uFEFF![图😀](<data:image/png;base64,${btoa(String.fromCharCode(...png))}>)\r\n\rTail\nEnd`;
  expect(source()).toBe(expected); expect(undoDepth(editor.state)).toBe(1);
  undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(expected);
});

it('keeps ordinary text and HTML paste ahead of incidental images', async () => {
  const { source, messages } = create('End');
  paste([file()], 'Copied text', '<p>Copied text<img></p>');
  expect(source()).toBe('Copied textEnd'); expect(messages).toEqual([]);
  const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
  paste([file()], '', '<img src="example.png">'); expect(read).not.toHaveBeenCalled();
  paste([file()], '', '', view!.contentDOM, 'https://example.com/image.png');
  expect(source()).toContain('https://example.com/image.png'); expect(read).not.toHaveBeenCalled();
});

it('checks image count, type, encoded size and bytes without source changes', async () => {
  const { source, messages, editor } = create();
  editor.dispatch({ selection: { anchor: 0, head: 4 } });
  for (const files of [[file(), file()], [file(png, 'image/svg+xml')], [file(new Uint8Array(7 * 1024 * 1024))], [file(new Uint8Array())]]) {
    const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer'); paste(files); expect(read).not.toHaveBeenCalled(); read.mockRestore();
    expect(source()).toBe('Text\n\nEnd');
  }
  paste([file(new Uint8Array([1, 2, 3]))]);
  await vi.waitFor(() => expect(messages.at(-1)).toContain('Cannot paste image'));
  paste([file(png, 'image/jpeg')]);
  await vi.waitFor(() => expect(messages.at(-1)).toContain('does not match'));
  expect(source()).toBe('Text\n\nEnd'); expect(undoDepth(view!.state)).toBe(0);
});
it('rejects oversized clipboard dimensions in outer and cell selections without source or history edits', async () => {
  for (const cell of [false,true]) {
    const original=cell?'| A |\n| - |\n| 图😀 |\n\nEnd':'\uFEFF图😀\r\nEnd';
    const {editor,source,messages}=create(original,cell?original.length:0,cell?livePreview:[]);
    const child=cell?tableEditor(document.querySelector('.preview-table')!)!:undefined;
    child?.begin(1,0);const input=child?.child || editor;input.dispatch({selection:{anchor:0,head:3}});
    paste([file(rasterHeader('png',8192,4097))],'','',input.contentDOM);
    await vi.waitFor(()=>expect(messages.at(-1)).toContain('32 Mi pixels'));
    expect(source()).toBe(original);expect(undoDepth(editor.state)).toBe(0);expect(input.state.selection.main.to).toBe(3);
    editor.destroy();view=undefined;document.body.replaceChildren();
  }
});

it('rejects stale reads after source Undo, selection changes, path effects, tab replacement and disposal', async () => {
  for (const action of ['undo', 'selection', 'path', 'tab', 'destroy']) {
    const { editor, source, makeState } = create('Text\n\nEnd'), resolve = delayedRead();
    paste();
    if (action === 'undo') { editor.dispatch({ changes: { from: 0, insert: 'x' } }); undo(editor); }
    if (action === 'selection') editor.dispatch({ selection: { anchor: 1 } });
    if (action === 'path') editor.dispatch({ effects: setImagePath.of('/notes/b.md') });
    if (action === 'tab') editor.setState(makeState('Other', 9));
    if (action === 'destroy') editor.destroy();
    resolve(); await Promise.resolve(); await Promise.resolve();
    expect(source()).toBe(action === 'tab' ? 'Other' : 'Text\n\nEnd');
    expect(undoDepth(editor.state)).toBe(0); editor.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
});

it('does not publish an old paste or its status after a newer accepted or rejected image request', async () => {
  const { editor, source, messages } = create('Text');
  const readers: FileReader[] = [];
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function(this: FileReader) { readers.push(this); });
  const resolve = (reader: FileReader) => { Object.defineProperty(reader, 'result', { value: png.buffer }); reader.dispatchEvent(new Event('load')); };
  paste(); paste(); resolve(readers[1]); await Promise.resolve(); expect(messages.at(-1)).toBe('Image pasted.');
  const accepted = source(); resolve(readers[0]); await Promise.resolve(); expect(source()).toBe(accepted); expect(messages.at(-1)).toBe('Image pasted.');
  undo(editor); paste(); paste([file(png, 'image/svg+xml')]); const rejected = messages.at(-1);
  resolve(readers[2]); await Promise.resolve(); expect(source()).toBe('Text'); expect(messages.at(-1)).toBe(rejected);
});

it('rejects encoded source overflow with escaped image labels and retained title spelling before reading', () => {
  const prefix = '![图\\[a\\] &amp;](<old.png>  \'Title &amp; text\' )\n\n```\n', suffix = '\n```';
  const replacement = `<data:image/png;base64,${btoa(String.fromCharCode(...png))}>`;
  const growth = replacement.length - '<old.png>'.length;
  const text = prefix + 'x'.repeat(8 * 1024 * 1024 - growth + 1 - new TextEncoder().encode(prefix + suffix).length) + suffix;
  const { source, messages } = create(text, 3), read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
  paste(); expect(read).not.toHaveBeenCalled(); expect(source()).toBe(text);
  expect(messages.at(-1)).toContain('8 MiB document limit');
});

it('checks busy, read-only, composition and multiple selections before and after reading', async () => {
  const { editor, lock, busy, source } = create();
  for (const action of ['busy', 'read-only', 'composition', 'selections']) {
    const resolve = delayedRead(); paste();
    if (action === 'busy') busy(true);
    if (action === 'read-only') editor.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) });
    if (action === 'composition') editor.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    if (action === 'selections') editor.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(1)]) });
    resolve(); await Promise.resolve(); expect(source()).toBe('Text\n\nEnd');
    const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer'); paste(); expect(read).not.toHaveBeenCalled();
    busy(false); editor.dispatch({ effects: lock.reconfigure([]), selection: { anchor: 0 } });
    editor.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); vi.restoreAllMocks();
  }
});

it('retains protected document source', () => {
  for (const source of ['---\nkey: value\n---\n\nEnd', '```\ncode\n```', '`code`', '[label](https://example.com)', '$x^2$']) {
    const { editor } = create(source, source.indexOf('value') >= 0 ? source.indexOf('value') : 3);
    const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer'); paste(); expect(read).not.toHaveBeenCalled();
    expect(editor.state.doc.toString()).toBe(source); editor.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
});

it('pastes into a selected table cell through exactly one outer history event', async () => {
  const original = '\uFEFF| A | B |\r\n| - | - |\r\n| 图😀 \\| tail | y |\r\n\r\nEnd\n';
  const { editor, messages, source } = create(original, normalize(fromSource(original).raw).length, livePreview);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!;
  table.begin(1, 0); table.child!.dispatch({ selection: { anchor: 0, head: 3 } });
  paste([file()], '', '', table.child!.contentDOM);
  await vi.waitFor(() => expect(messages.at(-1)).toBe('Image pasted.'));
  const image = `![](<data:image/png;base64,${btoa(String.fromCharCode(...png))}>)`;
  const changed = original.replace('图😀', image); expect(source()).toBe(changed);
  expect(undoDepth(editor.state)).toBe(1); expect(undoDepth(table.child!.state)).toBe(0);
  undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(changed);
  table.finish(); await vi.waitFor(() => expect(document.querySelector('.table-image img')).not.toBeNull());
});

it('fills omitted table cells and keeps exact source on Undo', async () => {
  const original = '| A | B | C |\r\n| - | - | - |\r\n| x |\r\n\r\nEnd';
  const { editor, messages, source } = create(original, normalize(original).length, livePreview);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 2);
  paste([file()], '', '', table.child!.contentDOM);
  await vi.waitFor(() => expect(messages.at(-1)).toBe('Image pasted.'));
  expect(source()).toContain('| x | | ![](<data:image/png;base64,');
  expect(undoDepth(editor.state)).toBe(1); undo(editor); expect(source()).toBe(original);
});

it('rejects pending cell paste after Undo, cell changes, Source mode, selection and tab replacement', async () => {
  const original = '| A | B |\n| - | - |\n| x | y |\n\nEnd';
  for (const action of ['undo', 'cell', 'finish', 'selection', 'tab']) {
    const { editor, source, makeState } = create(original, original.length, livePreview);
    await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
    const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
    const resolve = delayedRead(); paste([file()], '', '', table.child!.contentDOM);
    if (action === 'undo') { table.child!.dispatch({ changes: { from: 0, insert: 'z' } }); undo(editor); }
    if (action === 'cell') table.begin(1, 1);
    if (action === 'finish') table.finish();
    if (action === 'selection') table.child!.dispatch({ selection: { anchor: 1 } });
    if (action === 'tab') editor.setState(makeState(original, 9));
    resolve(); await Promise.resolve(); await Promise.resolve(); expect(source()).toBe(original);
    expect(undoDepth(editor.state)).toBe(0); editor.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
});

it('retains cell selections for invalid contexts, size, composition and busy commands', async () => {
  for (const text of ['`code`', '$x^2$', '[label](https://example.com)', '![alt](a.png)', '[abc][ref]', '[abc][]', '[abc]']) {
    const original = `| A |\n| - |\n| ${text} |\n\n[ref]: https://example.com\n[abc]: https://example.com\n\nEnd`, { source } = create(original, original.length, livePreview);
    await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
    const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
    table.child!.dispatch({ selection: { anchor: 2 } }); const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer');
    paste([file()], '', '', table.child!.contentDOM); expect(read).not.toHaveBeenCalled(); expect(source()).toBe(original);
    view!.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks();
  }
  const original = '| A |\n| - |\n| text |\n\nEnd', { source, busy } = create(original, original.length, livePreview);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
  table.child!.dispatch({ selection: { anchor: 0, head: 4 } });
  paste([file(new Uint8Array(7 * 1024 * 1024))], '', '', table.child!.contentDOM); expect(source()).toBe(original);
  const resolve = delayedRead(); paste([file()], '', '', table.child!.contentDOM); busy(true); resolve(); await Promise.resolve(); expect(source()).toBe(original);
  busy(false); vi.restoreAllMocks(); const resolveComposition = delayedRead(); paste([file()], '', '', table.child!.contentDOM);
  table.child!.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); resolveComposition(); await Promise.resolve(); expect(source()).toBe(original);
});

it('orders pending image requests across cell and outer paste without stale status publication', async () => {
  const original = '| A |\n| - |\n| text |\n\nEnd', { editor, messages, source } = create(original, original.length, livePreview);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
  const readers: FileReader[] = [];
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function(this: FileReader) { readers.push(this); });
  const resolve = (reader: FileReader) => { Object.defineProperty(reader, 'result', { value: png.buffer }); reader.dispatchEvent(new Event('load')); };
  paste([file()], '', '', table.child!.contentDOM); paste([file()], '', '', table.child!.contentDOM);
  resolve(readers[1]); await Promise.resolve(); expect(messages.at(-1)).toBe('Image pasted.');
  const changed = source(); resolve(readers[0]); await Promise.resolve(); expect(source()).toBe(changed); expect(messages.at(-1)).toBe('Image pasted.');
  undo(editor); table.begin(1, 0); paste([file()], '', '', table.child!.contentDOM); table.finish();
  editor.dispatch({ selection: { anchor: editor.state.doc.length } }); paste(); resolve(readers[3]); await Promise.resolve();
  const outer = source(); resolve(readers[2]); await Promise.resolve(); expect(source()).toBe(outer); expect(messages.at(-1)).toBe('Image pasted.');
});

it('includes omitted-cell padding in the encoded source limit before reading', async () => {
  const destination = `data:image/png;base64,${btoa(String.fromCharCode(...png))}`;
  const prefix = '| A | B | C |\n| - | - | - |\n| x |\n\n```\n', suffix = '\n```';
  const growth = `| x | | ![](<${destination}>) |`.length - '| x |'.length;
  const original = prefix + 'x'.repeat(8 * 1024 * 1024 - growth + 1 - prefix.length - suffix.length) + suffix;
  const { messages, source, editor } = create(original, prefix.indexOf('```'), livePreview);
  expect(forceParsing(editor, prefix.length, 10000)).toBe(true);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 2);
  const read = vi.spyOn(FileReader.prototype, 'readAsArrayBuffer'); paste([file()], '', '', table.child!.contentDOM);
  expect(read).not.toHaveBeenCalled(); expect(source()).toBe(original); expect(messages.at(-1)).toContain('8 MiB document limit');
});
