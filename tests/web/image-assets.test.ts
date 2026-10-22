// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, undoDepth } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { invoke } from '@tauri-apps/api/core';
import { copyImageAsset, ImageCopyError } from '../../src/web/image-assets';
import { imageBasePath, imageDocument, imagePath, setImagePath } from '../../src/web/images';
import { linkControls } from '../../src/web/link-controls';
import { linkVersion } from '../../src/web/links';
import { fromSource, sourceExtensions, savedSource, sourceField } from '../../src/web/source';

const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDLsAAAAASUVORK5CYII='), c => c.charCodeAt(0));
let view: EditorView;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
function setup(available = true, copy = vi.fn(async () => 'doc #%.assets/image.png')) {
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: 'alt', selection: { anchor: 0, head: 3 },
    extensions: [markdown(), history(), linkVersion, sourceExtensions(fromSource('alt')), imageBasePath.of('/tmp/doc #%.md'), imagePath, imageDocument.of(7)] }) });
  const bar = document.createElement('div'); document.body.prepend(bar);
  const messages: string[] = [], choose = vi.fn(async () => '/tmp/photo.png');
  const open = linkControls(view, bar, message => messages.push(message), 'image', choose, { available: () => available, copy }); open();
  const form = document.querySelector<HTMLFormElement>('.image-controls')!;
  const check = form.elements.namedItem('copy') as HTMLInputElement;
  const destination = form.elements.namedItem('destination') as HTMLInputElement;
  const pick = () => form.querySelector<HTMLButtonElement>('[data-choose]')!.click();
  return { form, check, destination, pick, copy, choose, messages, open, source: () => savedSource(view.state.field(sourceField)) };
}
it('copies into a relative path and changes source only on Apply, with one Undo', async () => {
  const s = setup(); expect(s.check.checked).toBe(false); s.check.checked = true; s.pick(); await settle();
  expect(s.copy).toHaveBeenCalledOnce(); expect(s.destination.value).toBe('doc%20%23%25.assets/image.png');
  expect(s.source()).toBe('alt'); expect(undoDepth(view.state)).toBe(0);
  s.form.dispatchEvent(new Event('submit', { cancelable: true }));
  expect(s.source()).toContain('![alt](<doc%20%23%25.assets/image.png>)'); expect(undoDepth(view.state)).toBe(1);
  undo(view); expect(s.source()).toBe('alt'); expect(s.copy).toHaveBeenCalledOnce();
});
it('keeps normal Choose behavior and disables copy until Save', async () => {
  const s = setup(false); expect(s.check.disabled).toBe(true); expect(s.form.textContent).toContain('Save the document');
  s.pick(); await settle(); expect(s.destination.value).toBe('/tmp/photo.png'); expect(s.copy).not.toHaveBeenCalled();
});
it('reports a completed copy after Cancel without filling the new form', async () => {
  let finish!: (path: string) => void;
  const s = setup(true, vi.fn(() => new Promise<string>(resolve => { finish = resolve; })));
  s.check.checked = true; s.pick(); await settle();
  s.form.querySelector<HTMLButtonElement>('[data-cancel]')!.click(); s.open();
  finish('doc.assets/retained.png'); await settle();
  expect(s.destination.value).toBe(''); expect(s.messages.join()).toContain('Cancel and Undo keep the copy'); expect(s.source()).toBe('alt');
});
it('reports dispatched copy failures after Cancel and rejects stale chooser results', async () => {
  let fail!: (reason: Error) => void;
  const s = setup(true, vi.fn(() => new Promise<string>((_, reject) => { fail = reject; })));
  s.check.checked = true; s.pick(); await settle();
  s.form.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
  fail(new ImageCopyError('Published copy is retained')); await settle();
  expect(s.messages.join()).toContain('Published copy is retained'); expect(s.source()).toBe('alt');
  s.open(); s.check.checked = true; s.pick();
  view.dispatch({ effects: setImagePath.of('/tmp/other.md') }); await settle(); expect(s.copy).toHaveBeenCalledTimes(1);
});
it('keeps the second copy blocked when an older cancelled picker finishes', async () => {
  let finishCopy!: (path: string) => void, finishFirst!: (path: string) => void;
  const s = setup(true, vi.fn(() => new Promise<string>(resolve => { finishCopy = resolve; })));
  s.choose.mockImplementationOnce(() => new Promise<string>(resolve => { finishFirst = resolve; }));
  s.check.checked = true; s.pick();
  s.form.querySelector<HTMLButtonElement>('[data-cancel]')!.click(); s.open();
  s.check.checked = true; s.pick(); await settle(); expect(s.copy).toHaveBeenCalledOnce();
  finishFirst('/tmp/old.png'); await settle();
  expect(s.form.querySelector<HTMLButtonElement>('[data-choose]')!.disabled).toBe(true);
  s.form.dispatchEvent(new Event('submit', { cancelable: true }));
  expect(s.messages.join()).toContain('Wait for the image copy'); expect(s.source()).toBe('alt');
  finishCopy('doc.assets/new.png'); await settle();
  expect(s.destination.value).toBe('doc.assets/new.png');
  expect(s.form.querySelector<HTMLButtonElement>('[data-choose]')!.disabled).toBe(false);
});
it('sends the exact checked bytes and captured ID/path with no source transaction', async () => {
  setup(); const call = vi.fn().mockResolvedValueOnce(png.buffer).mockResolvedValueOnce('doc.assets/image.png');
  const result = await copyImageAsset(view, '/tmp/a #%.png', () => true, () => false, call as typeof invoke);
  expect(result).toBe('doc.assets/image.png'); expect(call.mock.calls[0]).toEqual(['read_image', { destination: '/tmp/a%20%23%25.png', documentPath: '/tmp/doc #%.md', document: 7 }]);
  expect(call.mock.calls[1]).toEqual(['copy_image', png, { headers: { 'x-document-id': '7', 'x-document-path': '%2Ftmp%2Fdoc%20%23%25.md' } }]);
  expect(undoDepth(view.state)).toBe(0);
});
it('checks the SVG preview but publishes the original asset bytes', async () => {
  setup();
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>original()</script><path d="M0 0h10v10z"/></svg>');
  const call = vi.fn().mockResolvedValueOnce(svg.buffer).mockResolvedValueOnce('doc.assets/image.svg');
  expect(await copyImageAsset(view, '/tmp/drawing.svg', () => true, () => false, call as typeof invoke)).toBe('doc.assets/image.svg');
  expect(Array.from(call.mock.calls[1][1] as Uint8Array)).toEqual(Array.from(svg)); expect(undoDepth(view.state)).toBe(0);
  const bad = vi.fn().mockResolvedValue(new TextEncoder().encode('<svg>').buffer);
  await expect(copyImageAsset(view, '/tmp/invalid.svg', () => true, () => false, bad as typeof invoke)).rejects.toThrow();
  expect(bad).toHaveBeenCalledOnce();
});
it('does not publish after path changes, busy input, or invalid raster dimensions', async () => {
  setup(); let finish!: (bytes: ArrayBuffer) => void;
  const call = vi.fn(() => new Promise<ArrayBuffer>(resolve => { finish = resolve; }));
  const pending = copyImageAsset(view, '/tmp/a.png', () => true, () => false, call as typeof invoke);
  view.dispatch({ effects: setImagePath.of('/tmp/other.md') }); finish(png.buffer); expect(await pending).toBeNull(); expect(call).toHaveBeenCalledOnce();
  expect(await copyImageAsset(view, '/tmp/a.png', () => true, () => true, call as typeof invoke)).toBeNull(); expect(call).toHaveBeenCalledOnce();
  const invalid = new Uint8Array(png); invalid.fill(255, 16, 20);
  const bad = vi.fn().mockResolvedValue(invalid.buffer);
  await expect(copyImageAsset(view, '/tmp/a.png', () => true, () => false, bad as typeof invoke)).rejects.toThrow(); expect(bad).toHaveBeenCalledOnce();
});
