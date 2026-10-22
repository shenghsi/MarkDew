import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { imageDocument, imagePath } from './images';
import { planLink, linkCaptureCurrent, LinkEdit, openLink } from './links';
import { editGuard } from './edit-guard';
import { sourceOffset, savedSource, sourceField } from './source';
import { clipboardImageFiles, imagePasteMessage, imagePasteGuard, imagePastePolicy, ClipboardPolicy, clipboardVersion, clipboardRequest, clipboardRaster, readClipboardRaster, readClipboardBytes, clipboardSourceLimit } from './clipboard';

const sourceLimit = clipboardSourceLimit;
const size = (text: string) => new TextEncoder().encode(text).length;
function fits(view: EditorView, edit: LinkEdit, destination: string, extra: number) {
  const record = view.state.field(sourceField);
  const from = edit.existing ? edit.destinationFrom : edit.from, to = edit.existing ? edit.destinationTo : edit.to;
  const removed = record.raw.slice(sourceOffset(record, from), sourceOffset(record, to));
  const inserted = edit.existing ? `<${destination}>` : `![${edit.label}](<${destination}>)`;
  return size(savedSource(record)) - size(removed) + size(inserted)
    + extra <= sourceLimit;
}
// Paste owns one source/history edit. Optional asset copy is a separate file
// effect; neither mode changes the document baseline.
export function imagePaste(report: (message: string) => void, blocked: () => string | null = () => null, policy?: ClipboardPolicy) {
  return [imagePasteMessage.of(report), imagePasteGuard.of(blocked), ...(policy ? [imagePastePolicy.of(policy)] : []), clipboardVersion, ViewPlugin.fromClass(class {
    private generation = 0;
    private alive = true;
    constructor(readonly view: EditorView) {}
    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.startState.field(sourceField) !== update.state.field(sourceField)
        || update.transactions.some(transaction => transaction.effects.length)) this.generation++;
    }
    destroy() { this.alive = false; this.generation++; }
    paste(event: ClipboardEvent) {
      const files = clipboardImageFiles(event.clipboardData);
      if (!files) return false;
      const requestCurrent = clipboardRequest(this.view);
      this.generation++;
      if (!(event.target instanceof Element) || event.target.closest('.cm-content') !== this.view.contentDOM) return false;
      // Empty CodeMirror text paste would delete selected text. Consume rejected
      // image-only pastes too, while preserving the ordinary text route above.
      const reject = (reason: string) => { event.preventDefault(); report(reason); return true; };
      const reason = blocked() || editGuard(this.view);
      if (reason) return reject(reason);
      const file = clipboardRaster(files);
      if (typeof file === 'string') return reject(file);
      const target = this.view.state.facet(imagePastePolicy)?.(this.view, file);
      if (typeof target === 'string') return reject(target);
      const edit = openLink(this.view, 'image');
      if (typeof edit === 'string') return reject(edit);
      if (edit.reference) return reject('Edit reference-image source before pasting a replacement image.');
      const selection = this.view.state.selection.main, tree = ensureSyntaxTree(this.view.state, selection.to, 50);
      if (!tree) return reject('Wait for Markdown parsing, then paste the image.');
      let protectedSource = false;
      tree.iterate({ from: selection.from, to: selection.to, enter(node) {
        if (['InlineCode', 'Link', 'Autolink', 'Frontmatter', 'FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'LinkReference'].includes(node.name)
          && (selection.empty ? node.from < selection.from && selection.from < node.to : node.from < selection.to && node.to > selection.from)) protectedSource = true;
      } });
      if (protectedSource) return reject('Paste the image into document text.');
      const stub = target?.kind === 'copy' ? target.placeholder : `data:${file.type};base64,`;
      const extra = target?.kind === 'copy' ? 0 : Math.ceil(file.size / 3) * 4;
      if (!fits(this.view, edit, stub, extra)) return reject('The clipboard image does not fit the 8 MiB document limit.');
      const provisional = target?.kind === 'copy' ? planLink(this.view, edit, { label: edit.label, destination: target.placeholder, title: edit.title }) : undefined;
      if (typeof provisional === 'string') return reject(provisional);
      if (target?.kind === 'copy' && size(savedSource((provisional?.state || this.view.state).field(sourceField))) > sourceLimit) {
        return reject('The clipboard image does not fit the 8 MiB document limit.');
      }
      const generation = ++this.generation;
      const document = this.view.state.facet(imageDocument), path = this.view.state.field(imagePath, false);
      event.preventDefault();
      report('Reading clipboard image…');
      const current = () => this.alive && requestCurrent() && generation === this.generation && linkCaptureCurrent(this.view, edit)
        && this.view.state.facet(imageDocument) === document && this.view.state.field(imagePath, false) === path && (!target || target.current());
      const apply = (destination: string) => {
        if (!current()) { if (this.alive && requestCurrent()) report('The document or selection changed. Paste the image again.'); return; }
        const reason = blocked() || editGuard(this.view);
        if (reason) { report(reason); return; }
        const transaction = planLink(this.view, edit, { label: edit.label, destination, title: edit.title });
        if (typeof transaction === 'string') { report(transaction); return; }
        if (transaction) {
          if (size(savedSource(transaction.state.field(sourceField))) > sourceLimit) throw new Error('The image exceeds the 8 MiB document limit.');
          this.view.dispatch(transaction); this.view.focus();
        }
        report(target?.kind === 'copy' ? 'Image pasted. Undo keeps the copied file.' : 'Image pasted.');
      };
      const failure = (error: unknown) => {
        if (current()) report(`Cannot paste image: ${String(error)}`);
      };
      if (target?.kind === 'copy') {
        void readClipboardBytes(file).then(bytes => {
          if (!current()) return;
          const reason = blocked() || editGuard(this.view); if (reason) { report(reason); return; }
          return target.publish(bytes, current, () => !!blocked() || !!editGuard(this.view)).then(destination => {
            if (destination !== null) apply(destination);
          });
        }).catch(failure);
      } else void readClipboardRaster(file).then(apply).catch(failure);
      return true;
    }
  }, { eventHandlers: { paste(event) { return this.paste(event); } } })];
}
