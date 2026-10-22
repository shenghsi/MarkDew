import { invoke } from '@tauri-apps/api/core';
import { EditorView } from '@codemirror/view';
import { imageDocument, imagePath, imageFileDestination, prepareImage } from './images';

export class ImageCopyError extends Error {}
export async function copyImageBytes(view: EditorView, bytes: Uint8Array, current: () => boolean,
  blocked: () => boolean, call: typeof invoke = invoke): Promise<string | null> {
  const id = view.state.facet(imageDocument), base = view.state.field(imagePath, false);
  if (id === undefined || !base) throw new Error('Save the document before copying an image.');
  const valid = () => current() && !blocked() && view.state.facet(imageDocument) === id && view.state.field(imagePath, false) === base;
  if (!valid()) return null;
  prepareImage(bytes);
  if (!valid()) return null;
  try {
    return await call<string>('copy_image', bytes, { headers: {
      'x-document-id': String(id), 'x-document-path': encodeURIComponent(base),
    } });
  } catch (error) { throw new ImageCopyError(String(error)); }
}
// Read and validate the same bytes that the host will publish. A stale request
// can stop before publication; a dispatched request must report its result.
export async function copyImageAsset(view: EditorView, path: string, current: () => boolean,
  blocked: () => boolean, call: typeof invoke = invoke): Promise<string | null> {
  const id = view.state.facet(imageDocument), base = view.state.field(imagePath, false);
  if (id === undefined || !base) throw new Error('Save the document before copying an image.');
  const valid = () => current() && !blocked() && view.state.facet(imageDocument) === id && view.state.field(imagePath, false) === base;
  if (!valid()) return null;
  const bytes = new Uint8Array(await call<ArrayBuffer>('read_image', {
    destination: imageFileDestination(path), documentPath: base, document: id,
  }));
  if (!valid()) return null;
  return copyImageBytes(view, bytes, valid, blocked, call);
}
