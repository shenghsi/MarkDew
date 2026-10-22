import { invoke } from '@tauri-apps/api/core';
import { EditorView } from '@codemirror/view';
import { ClipboardTarget } from './clipboard';
import { copyImageBytes, ImageCopyError } from './image-assets';
import { imageDocument, imagePath, imageFileDestination } from './images';

// Encoding the complete document path is larger than encoding its file stem.
// The extra name space bounds both current host naming schemes without copying
// Rust file_stem rules into the renderer. This path is never read or published.
export function clipboardPlaceholder(path: string): string {
  return 'clipboard-' + imageFileDestination(encodeURIComponent(path)) + '.assets/image-' + '0'.repeat(64) + '.webp';
}
type CopyTarget = Extract<ClipboardTarget, { kind: 'copy' }>;
export type DroppedImagePolicy = (view: EditorView) => CopyTarget | { kind: 'link'; current: () => boolean } | string;
interface ControlOptions {
  native: boolean;
  available: (view: EditorView) => string | null;
  call?: typeof invoke;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}
export function clipboardImageControls(parent: HTMLElement, options: ControlOptions) {
  return imageTransferControls(parent, options, 'Pasted images', 'markdew-pasted-images', 'embed', 'Embed in Markdown');
}
export function droppedImageControls(parent: HTMLElement, options: ControlOptions) {
  return imageTransferControls(parent, options, 'Dropped images', 'markdew-dropped-images', 'link', 'Link original');
}
function imageTransferControls<Mode extends 'embed' | 'link'>(parent: HTMLElement, options: ControlOptions,
  name: string, key: string, original: Mode, originalLabel: string) {
  let storage = options.storage;
  if (!storage) { try { storage = localStorage; } catch { /* The preference still works without storage. */ } }
  let mode: Mode | 'copy' = original, generation = 0;
  try { if (options.native && storage?.getItem(key) === 'copy') mode = 'copy'; } catch { /* Use the original mode. */ }
  const label = document.createElement('label'); label.textContent = name + ' ';
  const select = document.createElement('select'); select.setAttribute('aria-label', name);
  select.add(new Option(originalLabel, original)); select.add(new Option('Copy beside document', 'copy'));
  select.options[1].disabled = !options.native; select.value = mode; label.append(select); parent.append(label);
  const hint = document.createElement('span'); hint.textContent = 'Copy requires a saved document. Undo keeps copied files.';
  hint.hidden = mode !== 'copy'; parent.append(hint);
  // Clipboard and drop copies share a notice outside document layout. Reporting
  // a completed copy must not move the captured drop position before insertion.
  let notice = parent.querySelector<HTMLSpanElement>('.image-copy-notice');
  if (!notice) { notice = document.createElement('span'); notice.className = 'image-copy-notice'; notice.setAttribute('role', 'status'); notice.hidden = true; parent.append(notice); }
  const copyNotice = notice;
  select.addEventListener('change', () => {
    mode = options.native && select.value === 'copy' ? 'copy' : original; select.value = mode; generation++;
    hint.hidden = mode !== 'copy';
    try { storage?.setItem(key, mode); } catch { /* Keep the session preference. */ }
  });
  const capture = (view: EditorView): CopyTarget | { kind: Mode; current: () => boolean } | string => {
    const captured = generation, selected = mode, id = view.state.facet(imageDocument), path = view.state.field(imagePath, false);
    const current = () => generation === captured && mode === selected && view.state.facet(imageDocument) === id && view.state.field(imagePath, false) === path;
    if (selected !== 'copy') return { kind: original, current };
    const reason = options.available(view); if (reason) return reason;
    if (!options.native || id === undefined || !path) return 'Save the document before copying images.';
    return { kind: 'copy', current, placeholder: clipboardPlaceholder(path),
      publish: async (bytes, requestCurrent, blocked) => {
        try {
          const destination = await copyImageBytes(view, bytes, () => current() && requestCurrent(),
            () => blocked() || !!options.available(view), options.call);
          if (destination === null) return null;
          copyNotice.hidden = false; copyNotice.textContent = `Image copied for ${path}: ${destination}. Cancelled insertion and Undo keep the file.`;
          // A copied asset is always a relative path. Encode filename punctuation
          // once and protect table delimiters before package insertion checks.
          const parts = destination.split('/');
          if (parts.length !== 2 || !parts[0].endsWith('.assets') || parts[0].includes('\0') ||
            !/^image-[a-z0-9]{1,64}\.(png|jpg|gif|webp|svg)$/i.test(parts[1]))
            throw new ImageCopyError('The copy returned an invalid relative path. The copied file may remain.');
          const encoded = imageFileDestination(destination).replace(/\|/g, '%7C').replace(/\\/g, '%5C');
          if (new TextEncoder().encode(encoded).length > new TextEncoder().encode(clipboardPlaceholder(path)).length)
            throw new ImageCopyError('The copy path exceeds its source-size reservation. The copied file remains.');
          return encoded;
        } catch (error) {
          if (error instanceof ImageCopyError) {
            copyNotice.hidden = false; copyNotice.textContent = `Image copy for ${path}: ${String(error)}. Inspect the image folder before retrying.`;
          }
          throw error;
        }
      },
    };
  };
  return { capture, select, notice };
}
