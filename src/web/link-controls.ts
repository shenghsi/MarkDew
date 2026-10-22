import { EditorView } from '@codemirror/view';
import { applyLink, LinkEdit, linkCaptureCurrent, openLink, removeLink } from './links';
import { editGuard } from './edit-guard';
import { imageDocument, imagePath, imageFileDestination } from './images';
import { ImageCopyError } from './image-assets';

export interface ImageCopyOptions {
  available: () => boolean;
  copy: (path: string, current: () => boolean) => Promise<string | null>;
}

export function linkControls(view: EditorView, parent: HTMLElement, report: (message: string) => void,
  kind: 'link' | 'image' = 'link', choose?: () => Promise<string | null>, asset?: ImageCopyOptions) {
  const name = kind === 'image' ? 'Image' : 'Link';
  const form = document.createElement('form');
  form.className = `link-controls${kind === 'image' ? ' image-controls' : ''}`; form.hidden = true; form.setAttribute('aria-label', `${name} controls`);
  form.innerHTML = `<label>${kind === 'image' ? 'Alt text (Markdown)' : 'Text'}<input name="label" aria-label="${name}${kind === 'image' ? ' alt' : ''} text"></label><label>Destination<input name="destination" aria-label="${name} destination"></label><label>Title (optional)<input name="title" aria-label="${name} title"></label><button type="submit">Apply ${name}</button><button type="button" data-remove>Remove ${name}</button>${choose ? '<button type="button" data-choose>Choose Image</button>' : ''}<button type="button" data-cancel>Cancel</button><span class="link-hint"></span>`;
  parent.after(form);
  const copy = asset && choose ? document.createElement('input') : undefined;
  if (copy) {
    copy.type = 'checkbox'; copy.name = 'copy';
    const label = document.createElement('label'); label.append(copy, 'Copy beside document');
    form.querySelector('[data-choose]')!.before(label);
  }
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  const apply = form.querySelector<HTMLButtonElement>('[type="submit"]')!, remove = form.querySelector<HTMLButtonElement>('[data-remove]')!;
  let edit: LinkEdit | undefined, composing = false, request = 0, copying = 0;
  const close = () => { request++; edit = undefined; form.hidden = true; composing = false; view.requestMeasure(); view.focus(); };
  const commit = (removeOnly = false) => {
    if (!edit) return;
    if (copying) { report('Wait for the image copy, then apply the command.'); return; }
    if (composing) { report(`Finish text input, then apply the ${kind} command.`); return; }
    const reason = removeOnly ? removeLink(view, edit) : applyLink(view, edit, {
      label: field('label').value, destination: field('destination').value, title: field('title').value });
    if (reason) report(reason); else close();
  };
  form.addEventListener('submit', event => { event.preventDefault(); commit(); });
  remove.addEventListener('click', () => commit(true));
  form.querySelector('[data-cancel]')!.addEventListener('click', close);
  form.addEventListener('keydown', event => {
    // A composing Enter must not submit the form, including when the browser
    // supplies only the key's composition flag.
    if (event.key === 'Enter' && (composing || event.isComposing)) { event.preventDefault(); return; }
    if (event.key === 'Escape' && !composing && !event.isComposing) { event.preventDefault(); close(); }
  });
  form.addEventListener('compositionstart', () => { composing = true; });
  form.addEventListener('compositionend', () => { composing = false; });
  const picker = form.querySelector<HTMLButtonElement>('[data-choose]');
  form.addEventListener('input', () => { request++; if (picker) picker.disabled = !!copying || !!edit?.reference; });
  picker?.addEventListener('click', () => {
    if (!edit || !choose || composing || copying) return;
    const reason = editGuard(view); if (reason) { report(reason); return; }
    const captured = edit, token = ++request, copyRequested = !!copy?.checked;
    const id = view.state.facet(imageDocument), base = view.state.field(imagePath, false);
    picker.disabled = true;
    const current = () => token === request && edit === captured && !form.hidden && !composing &&
      view.state.facet(imageDocument) === id && view.state.field(imagePath, false) === base &&
      linkCaptureCurrent(view, captured) && !editGuard(view);
    void (async () => {
      const path = await choose();
      if (!path || !current()) return;
      let destination = path;
      if (copyRequested && asset) {
        if (!asset.available()) throw new Error('Save the document before copying an image.');
        copying = token;
        const result = await asset.copy(path, current);
        if (!result) return;
        destination = result;
        report(`Image copied to ${result}. Cancel and Undo keep the copy.`);
      }
      if (current()) { field('destination').value = imageFileDestination(destination); field('destination').focus(); }
    })().catch(error => { if (current() || error instanceof ImageCopyError) report(String(error)); })
      .finally(() => { if (copying === token) copying = 0; picker.disabled = !!copying || !!edit?.reference; });
  });
  return () => {
    const result = openLink(view, kind);
    if (typeof result === 'string') { report(result); return true; }
    request++; edit = result; composing = false;
    for (const name of ['label', 'destination', 'title'] as const) {
      field(name).value = edit[name]; field(name).disabled = edit.reference;
    }
    apply.disabled = edit.reference; remove.disabled = !edit.existing;
    if (picker) picker.disabled = !!copying || edit.reference;
    if (copy) { copy.checked = false; copy.disabled = edit.reference || !asset!.available(); }
    form.querySelector('.link-hint')!.textContent = edit.reference ? `Reference ${kind}: edit its destination in Source mode.` : kind === 'image' ? 'Apply changes source. Choosing a file only fills its path.' : '';
    if (copy && !edit.reference) form.querySelector('.link-hint')!.textContent = asset!.available()
      ? 'Copy writes an image file. Apply changes source. Cancel and Undo keep the copied file.'
      : 'Save the document to enable Copy beside document. Apply changes source.';
    form.hidden = false; view.requestMeasure();
    (edit.reference ? remove : edit.label ? field('destination') : field('label')).focus();
    return true;
  };
}
