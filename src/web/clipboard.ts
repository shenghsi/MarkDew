import { Facet, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { imageLimit, validateRaster } from './images';
import { sourceField } from './source';

export const imagePasteMessage = Facet.define<(message: string) => void, ((message: string) => void) | undefined>({ combine: callbacks => callbacks[0] });
export const imagePasteGuard = Facet.define<() => string | null, () => string | null>({ combine: callbacks => callbacks[0] || (() => null) });
export type ClipboardTarget = { current: () => boolean } & ({ kind: 'embed' } | {
  kind: 'copy'; placeholder: string;
  publish: (bytes: Uint8Array, current: () => boolean, blocked: () => boolean) => Promise<string | null>;
});
export type ClipboardPolicy = (view: EditorView, file: File) => ClipboardTarget | string;
export const imagePastePolicy = Facet.define<ClipboardPolicy, ClipboardPolicy | undefined>({ combine: callbacks => callbacks[0] });
let version = 0;
export const clipboardVersion = StateField.define<number>({ create: () => ++version,
  update(value, transaction) { return transaction.docChanged || transaction.selection || transaction.effects.length
    || transaction.startState.field(sourceField) !== transaction.state.field(sourceField) ? ++version : value; } });
const requests = new WeakMap<EditorView, number>();
export function clipboardRequest(view: EditorView) {
  const request = (requests.get(view) || 0) + 1; requests.set(view, request);
  return () => requests.get(view) === request;
}
export const clipboardSourceLimit = 8 * 1024 * 1024;
export function clipboardRaster(files: (File | null)[]): File | string {
  if (files.length !== 1 || !files[0] || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(files[0].type))
    return 'Paste one PNG, JPEG, GIF, or WebP image.';
  if (!files[0].size || files[0].size > imageLimit) return 'The clipboard image does not fit the 8 MiB document limit.';
  return files[0];
}
function readRaster<T>(file: File, result: (bytes: Uint8Array, mime: string) => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Cannot read the clipboard image.'));
    reader.onabort = () => reject(new Error('Clipboard image reading stopped.'));
    reader.onload = () => {
      try {
        const bytes = new Uint8Array(reader.result as ArrayBuffer), mime = validateRaster(bytes);
        if (bytes.length !== file.size || bytes.length > imageLimit || mime !== file.type) throw new Error('The clipboard image type does not match its bytes.');
        resolve(result(bytes, mime));
      } catch (error) { reject(error); }
    };
    reader.readAsArrayBuffer(file);
  });
}
export function readClipboardBytes(file: File): Promise<Uint8Array> { return readRaster(file, bytes => bytes); }
export function readClipboardRaster(file: File): Promise<string> {
  return readRaster(file, (bytes, mime) => {
    const parts: string[] = [];
    for (let from = 0; from < bytes.length; from += 32768) parts.push(String.fromCharCode(...bytes.subarray(from, from + 32768)));
    return `data:${mime};base64,${btoa(parts.join(''))}`;
  });
}
export function clipboardImageFiles(data: DataTransfer | null): (File | null)[] | undefined {
  if (!data || data.getData('text/plain') || data.getData('text/html') || data.getData('text/uri-list')) return;
  const files = Array.from(data.items).filter(item => item.kind === 'file').map(item => item.getAsFile());
  if (files.some(file => file?.type.startsWith('image/'))) return files;
}
