// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { forceParsing } from '@codemirror/language';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { clipboardImageControls, clipboardPlaceholder, droppedImageControls } from '../../src/web/clipboard-assets';
import { imagePaste } from '../../src/web/image-paste';
import { imageBasePath, imageDocument, imageFileDestination, imagePath, setImagePath } from '../../src/web/images';
import { linkVersion } from '../../src/web/links';
import { livePreview } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { clipboardRequest } from '../../src/web/clipboard';

const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });
function setup(source = '\uFEFF图😀\r\nEnd\n', preview = false, path = '/notes/doc #%.md') {
  const parent = document.createElement('div'); document.body.append(parent);
  const call = vi.fn().mockResolvedValue('doc #%.assets/image-test.png'), messages: string[] = [];
  let uncertain = false, busy = false;
  const kept = new Map<string, string>();
  const storage = { getItem: vi.fn((key: string) => kept.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { kept.set(key, value); }) };
  const policy = clipboardImageControls(parent, { native: true, call, storage,
    available: () => uncertain ? 'Check Save before copying.' : null });
  const lock = new Compartment();
  const state = (source: string, id = 7) => EditorState.create({ doc: normalize(fromSource(source).raw), selection: { anchor: preview ? normalize(fromSource(source).raw).length : 0 },
    extensions: [sourceExtensions(fromSource(source)), history(), documentLanguage(), linkVersion, imageBasePath.of(path), imagePath, imageDocument.of(id),
      lock.of([]), imagePaste(message => messages.push(message), () => busy ? 'Busy' : null, policy.capture), ...(preview ? [livePreview] : [])] });
  view = new EditorView({ parent: document.body, state: state(source) });
  const mode = (value: string) => { policy.select.value = value; policy.select.dispatchEvent(new Event('change')); };
  const paste = (target = view!.contentDOM, bytes: Uint8Array = png) => {
    const file = new File([bytes as BlobPart], 'clipboard.png', { type: 'image/png' });
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => '', items: [{kind:'file',getAsFile:()=>file}], files:[file] } });
    target.dispatchEvent(event); return event;
  };
  return { editor: view, state, policy, call, storage, lock, mode, paste, messages, source: () => savedSource(view!.state.field(sourceField)),
    uncertain: (value: boolean) => { uncertain = value; }, busy: (value: boolean) => { busy = value; } };
}
function delayedRead() {
  const readers: FileReader[] = [];
  vi.spyOn(FileReader.prototype, 'readAsArrayBuffer').mockImplementation(function(this:FileReader) { readers.push(this); });
  return (index = 0) => { Object.defineProperty(readers[index], 'result', { value: png.buffer }); readers[index].dispatchEvent(new Event('load')); };
}
it('defaults to Copy beside document, keeps an explicit Embed choice, and changes the saved preference without source or history edits', () => {
  const f = setup(), source = f.source(), state = f.editor.state;
  expect(f.policy.select.value).toBe('copy'); f.mode('embed');
  expect(f.storage.setItem).toHaveBeenCalledWith('markdew-pasted-images','embed'); expect(f.policy.select.value).toBe('embed');
  expect(f.editor.state).toBe(state); expect(f.source()).toBe(source); expect(undoDepth(f.editor.state)).toBe(0);
  const controls = clipboardImageControls(document.body, { native:false,available:()=>null,storage:{getItem:()=> 'copy',setItem:()=>{}} });
  expect(controls.select.value).toBe('embed'); expect(controls.select.options[1].disabled).toBe(true);
});
it('embeds when Copy is only the default and the document cannot take a copy, but reports when Copy was chosen', () => {
  const parent = document.createElement('div'); document.body.append(parent);
  let stored: string | null = null, unavailable: string | null = 'Save the document before copying pasted images.';
  const storage = { getItem: () => stored, setItem: () => {} };
  const controls = clipboardImageControls(parent, { native: true, storage, available: () => unavailable });
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: 'x', extensions: [imagePath, imageDocument.of(1)] }) });
  expect(controls.capture(view)).toMatchObject({ kind: 'embed' });
  stored = 'copy'; expect(controls.capture(view)).toBe('Save the document before copying pasted images.');
  unavailable = null; expect(controls.capture(view)).toBe('Save the document before copying images.'); unavailable = 'Save the document before copying pasted images.';
  stored = 'embed'; expect(controls.capture(view)).toMatchObject({ kind: 'embed' });
  stored = null; unavailable = null; expect(controls.capture(view)).toMatchObject({ kind: 'embed' }); // no saved path yet
});
it('copies the exact raster bytes, inserts an encoded relative path, and keeps one exact Undo/Redo', async () => {
  const f = setup(), original = f.source(); f.mode('copy');
  f.editor.dispatch({ selection:{anchor:0,head:3} });
  expect(f.paste().defaultPrevented).toBe(true);
  await vi.waitFor(()=>expect(f.messages.at(-1)).toBe('Image pasted. Undo keeps the copied file.'));
  expect(f.call).toHaveBeenCalledOnce();
  expect(f.call.mock.calls[0]).toEqual(['copy_image',png,{headers:{'x-document-id':'7','x-document-path':'%2Fnotes%2Fdoc%20%23%25.md'}}]);
  expect(f.source()).toContain('![图😀](<doc%20%23%25.assets/image-test.png>)'); expect(f.source()).not.toContain('base64');
  expect(f.policy.notice.textContent).toContain('/notes/doc #%.md'); expect(f.policy.notice.textContent).toContain('keep the file');
  expect(undoDepth(f.editor.state)).toBe(1); undo(f.editor); expect(f.source()).toBe(original); redo(f.editor);
  expect(f.source()).toContain('doc%20%23%25.assets/image-test.png'); expect(f.call).toHaveBeenCalledOnce();
});
it('copies an image above the base64 source limit without generating base64', async () => {
  const f = setup('End'), bytes = new Uint8Array(7 * 1024 * 1024); bytes.set(png); f.mode('copy');
  const encode = vi.spyOn(globalThis,'btoa'); f.paste(f.editor.contentDOM,bytes);
  await vi.waitFor(()=>expect(f.call).toHaveBeenCalledOnce());
  await vi.waitFor(()=>expect(f.messages.at(-1)).toContain('Image pasted'));
  const published=f.call.mock.calls[0][1] as Uint8Array;
  expect(published.length).toBe(bytes.length); expect(published.every((value,index)=>value===bytes[index])).toBe(true);
  expect(encode).not.toHaveBeenCalled(); expect(f.source().length).toBeLessThan(200);
});
it('bounds encoded host paths without reproducing file-stem rules', () => {
  const fixture = [
    ['/notes/.md','.md.assets'],['/notes/a.b.md','a.b.assets'],['/notes/图 % # a.md','图 % # a.assets'],
    ['C:\\notes\\图 % a.md','图 % a.assets'],['\\\\server\\share\\doc.md','doc.assets'],['/notes/a\\b.md','a\\b.assets'],
  ];
  for (const [path,folder] of fixture) {
    const expected = imageFileDestination(`${folder}/image-${'a'.repeat(64)}.webp`).replace(/\|/g,'%7C').replace(/\\/g,'%5C');
    expect(new TextEncoder().encode(clipboardPlaceholder(path)).length).toBeGreaterThanOrEqual(new TextEncoder().encode(expected).length);
  }
});
it('rejects unsaved, uncertain, busy and invalid requests without publication or selection deletion', async () => {
  const f = setup(); f.mode('copy'); f.editor.dispatch({selection:{anchor:0,head:3}}); const source=f.source(),selection=f.editor.state.selection;
  const read=vi.spyOn(FileReader.prototype,'readAsArrayBuffer');
  f.uncertain(true); expect(f.paste().defaultPrevented).toBe(true); expect(read).not.toHaveBeenCalled(); f.uncertain(false);
  f.editor.dispatch({effects:setImagePath.of('')}); f.paste(); expect(read).not.toHaveBeenCalled();
  f.editor.dispatch({effects:setImagePath.of('/notes/doc #%.md')}); f.busy(true);f.paste();expect(read).not.toHaveBeenCalled();f.busy(false);
  f.paste(f.editor.contentDOM,Uint8Array.of(1,2,3));await vi.waitFor(()=>expect(f.messages.at(-1)).toContain('Cannot paste image'));
  expect(f.call).not.toHaveBeenCalled(); expect(f.source()).toBe(source); expect(f.editor.state.selection.eq(selection)).toBe(true);
});
it('rejects source, tab, path, policy, composition and busy changes before publication', async () => {
  for (const action of ['source','tab','path','policy','composition','busy']) {
    const f=setup('Text');f.mode('copy');const finish=delayedRead();f.paste();
    if(action==='source')f.editor.dispatch({changes:{from:0,insert:'Z'}});
    if(action==='tab')f.editor.setState(f.state('Text',9));
    if(action==='path')f.editor.dispatch({effects:setImagePath.of('/notes/other.md')});
    if(action==='policy'){f.mode('embed');f.mode('copy');}
    if(action==='composition')f.editor.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    if(action==='busy')f.busy(true);
    const before=f.source();finish();await Promise.resolve();await Promise.resolve();
    expect(f.call).not.toHaveBeenCalled();expect(f.source()).toBe(before);
    f.editor.destroy();view=undefined;document.body.replaceChildren();vi.restoreAllMocks();
  }
});
it('reports a late published copy for its captured document without stale source or paste status', async () => {
  const f=setup('Text');f.mode('copy');let finish!:(path:string)=>void;
  f.call.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));f.paste();await vi.waitFor(()=>expect(f.call).toHaveBeenCalledOnce());
  f.editor.setState(f.state('Other',9));clipboardRequest(f.editor);f.messages.push('Newer request');
  finish('doc #%.assets/image-late.png');await vi.waitFor(()=>expect(f.policy.notice.textContent).toContain('image-late.png'));
  expect(f.policy.notice.textContent).toContain('/notes/doc #%.md');expect(f.source()).toBe('Other');expect(f.messages.at(-1)).toBe('Newer request');expect(undoDepth(f.editor.state)).toBe(0);
});
it('reports dispatched copy errors after cancellation and rejects unexpected returned paths', async () => {
  const f=setup('Text');f.mode('copy');let fail!:(error:Error)=>void;
  f.call.mockImplementationOnce(()=>new Promise((_resolve,reject)=>{fail=reject;}));f.paste();await vi.waitFor(()=>expect(f.call).toHaveBeenCalledOnce());
  f.mode('embed');fail(new Error('Published copy is retained'));await vi.waitFor(()=>expect(f.policy.notice.textContent).toContain('Published copy is retained'));
  f.mode('copy');f.call.mockResolvedValueOnce('../wrong/image-a.png');f.paste();await vi.waitFor(()=>expect(f.policy.notice.textContent).toContain('invalid relative path'));
  expect(f.source()).toBe('Text');expect(undoDepth(f.editor.state)).toBe(0);
});
it('copies into selected and omitted table cells with only outer history and exact Undo', async () => {
  for(const omitted of [false,true]) {
    const original=omitted?'| A | B | C |\r\n| - | - | - |\r\n| x |\r\n\r\nEnd':'\uFEFF| A |\r\n| - |\r\n| 图😀 tail |\r\n\rEnd';
    const f=setup(original,true);f.mode('copy');f.call.mockResolvedValue('doc|图.assets/image-cell.png');
    await vi.waitFor(()=>expect(document.querySelector('.preview-table')).not.toBeNull());
    const table=tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!;table.begin(1,omitted?2:0);
    if(!omitted)table.child!.dispatch({selection:{anchor:0,head:3}});
    f.paste(table.child!.contentDOM);await vi.waitFor(()=>expect(f.messages.at(-1)).toContain('Image pasted'));
    expect(f.source()).toContain('doc%7C图.assets/image-cell.png');expect(f.source()).not.toContain('base64');
    expect(undoDepth(f.editor.state)).toBe(1);expect(undoDepth(table.child!.state)).toBe(0);undo(f.editor);expect(f.source()).toBe(original);
    f.editor.destroy();view=undefined;document.body.replaceChildren();vi.restoreAllMocks();
  }
});
it('reserves the complete path before reading near the source limit', () => {
  const path='/notes/doc #%.md', growth=`![](<${clipboardPlaceholder(path)}>)`.length;
  const prefix='Text\n\n```\n',suffix='\n```', original=prefix+'x'.repeat(8*1024*1024-growth+1-prefix.length-suffix.length)+suffix;
  const f=setup(original),read=vi.spyOn(FileReader.prototype,'readAsArrayBuffer');f.mode('copy');f.paste();
  expect(read).not.toHaveBeenCalled();expect(f.call).not.toHaveBeenCalled();expect(f.source()).toBe(original);expect(f.messages.at(-1)).toContain('8 MiB');
});
it('includes omitted-cell padding in the copy reservation before reading', async () => {
  const path='/notes/doc #%.md', prefix='| A | B | C |\n| - | - | - |\n| x |\n\n```\n', suffix='\n```';
  const growth=`| x | | ![](<${clipboardPlaceholder(path)}>) |`.length-'| x |'.length;
  const original=prefix+'x'.repeat(8*1024*1024-growth+1-prefix.length-suffix.length)+suffix;
  const f=setup(original,true);f.mode('copy');
  f.editor.dispatch({selection:{anchor:prefix.indexOf('```')}});
  expect(forceParsing(f.editor,prefix.length,10000)).toBe(true);
  await vi.waitFor(()=>expect(document.querySelector('.preview-table')).not.toBeNull());
  const table=tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!;table.begin(1,2);
  const read=vi.spyOn(FileReader.prototype,'readAsArrayBuffer');f.paste(table.child!.contentDOM);
  expect(read).not.toHaveBeenCalled();expect(f.call).not.toHaveBeenCalled();expect(f.source()).toBe(original);
  expect(undoDepth(f.editor.state)).toBe(0);expect(f.messages.at(-1)).toContain('8 MiB');
});
it('keeps a published file without editing a table cell that has changed', async () => {
  const original='| A | B |\r\n| - | - |\r\n| first | second |\r\n\r\nEnd', f=setup(original,true);f.mode('copy');
  await vi.waitFor(()=>expect(document.querySelector('.preview-table')).not.toBeNull());
  const table=tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!;table.begin(1,0);
  let finish!:(path:string)=>void;f.call.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  f.paste(table.child!.contentDOM);await vi.waitFor(()=>expect(f.call).toHaveBeenCalledOnce());
  table.begin(1,1);const selection=table.child!.state.selection;clipboardRequest(f.editor);f.messages.push('Newer request');
  finish('doc.assets/image-retained.png');await vi.waitFor(()=>expect(f.policy.notice.textContent).toContain('image-retained.png'));
  expect(f.source()).toBe(original);expect(table.child!.state.selection.eq(selection)).toBe(true);
  expect(undoDepth(f.editor.state)).toBe(0);expect(f.messages.at(-1)).toBe('Newer request');
});
it('cancels pending Embed when the image preference changes', async () => {
  const f=setup('Text'),finish=delayedRead();f.paste();f.mode('copy');finish();
  await Promise.resolve();await Promise.resolve();expect(f.source()).toBe('Text');expect(f.call).not.toHaveBeenCalled();
  expect(undoDepth(f.editor.state)).toBe(0);
});

it('reads the stored mode when an image arrives, so a Settings change applies without a restart', () => {
  const parent = document.createElement('div'); document.body.append(parent);
  let stored: string | null = null;
  const storage = { getItem: vi.fn(() => stored), setItem: vi.fn() };
  const pasted = clipboardImageControls(parent, { native: true, storage, available: () => null });
  const dropped = droppedImageControls(parent, { native: true, storage, available: () => null });
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: 'x', extensions: [imagePath, imageDocument.of(1)] }) });
  expect(pasted.capture(view)).toMatchObject({ kind: 'embed' }); expect(dropped.capture(view)).toMatchObject({ kind: 'link' });
  stored = 'copy';
  expect(pasted.capture(view)).toBe('Save the document before copying images.');
  expect(pasted.select.value).toBe('copy');
  stored = 'embed';
  expect(pasted.capture(view)).toMatchObject({ kind: 'embed' }); expect(pasted.select.value).toBe('embed');
});
