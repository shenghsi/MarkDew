import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { invoke } from '@tauri-apps/api/core';
import { isolateHistory } from '@codemirror/commands';
import { clipboardRequest, clipboardSourceLimit } from './clipboard';
import { editGuard } from './edit-guard';
import { imageDocument, imageFileDestination, imageLimit, prepareImage, imagePath } from './images';
import { openLink, planLink } from './links';
import { savedSource, sourceField } from './source';
import { tableComposing, tableEditor, tableInputView } from './table';
import { DroppedImagePolicy } from './clipboard-assets';

interface Position { x: number; y: number }
interface Options {
  scale: () => Promise<number>;
  report: (message: string) => void;
  blocked: () => string | null;
  read?: (destination: string, path: string, document: number | undefined) => Promise<ArrayBuffer>;
  policy?: DroppedImagePolicy;
}
// Native drop coordinates are physical pixels relative to the WebView. CSS
// Coordinates are supported only when native and CSS scale agree, without
// visual-viewport zoom or offsets. Check again after reading the image.
export function imageDrops(view: EditorView, options: Options) {
  let alive = true;
  const read = options.read || ((destination, documentPath, document) =>
    invoke<ArrayBuffer>('read_image', { destination, documentPath, ...(document === undefined ? {} : { document }) }));
  return {
    dispose() { alive = false; },
    async drop(path: string, physical: Position) {
      const requestCurrent = clipboardRequest(view), state = view.state;
      const input = tableInputView(view), inputState = input?.state;
      const inputScroll = input && [input.scrollDOM.scrollLeft, input.scrollDOM.scrollTop];
      let policy: ReturnType<DroppedImagePolicy> | undefined;
      const documentID = state.facet(imageDocument), documentPath = state.field(imagePath, false) || '';
      const current = () => alive && requestCurrent() && view.state === state && view.dom.isConnected
        && (typeof policy !== 'object' || policy.current()) && tableInputView(view) === input && input?.state === inputState
        && (!input || input.scrollDOM.scrollLeft === inputScroll![0] && input.scrollDOM.scrollTop === inputScroll![1]);
      const reject = (message: string) => { if (alive && requestCurrent()) options.report(message); };
      const guard = () => options.blocked() || (view.state.readOnly ? 'The document is read-only.' :
        view.compositionStarted || tableComposing(view) ? 'Finish text input, then drop the image.' :
          view.state.selection.ranges.length !== 1 ? 'Use one selection for image drop.' : null);
      const reason = guard(); if (reason) { reject(reason); return; }
      if (!/^(?:\/|[a-z]:[\\/]|\\\\)/i.test(path)) { reject('Drop an image with an absolute file path.'); return; }
      const destination = imageFileDestination(path);
      const ratio = window.devicePixelRatio, scrollTop = view.scrollDOM.scrollTop, scrollLeft = view.scrollDOM.scrollLeft;
      const rect = view.contentDOM.getBoundingClientRect();
      const viewportSupported = () => !window.visualViewport || window.visualViewport.scale === 1
        && window.visualViewport.offsetLeft === 0 && window.visualViewport.offsetTop === 0;
      if (!viewportSupported()) { reject('Reset display zoom before dropping an image.'); return; }
      const geometryCurrent = () => {
        const next = view.contentDOM.getBoundingClientRect();
        return viewportSupported() && window.devicePixelRatio === ratio && view.scrollDOM.scrollTop === scrollTop && view.scrollDOM.scrollLeft === scrollLeft
          && next.x === rect.x && next.y === rect.y && next.width === rect.width && next.height === rect.height;
      };
      try {
        policy = options.policy?.(view);
        if (typeof policy === 'string') { reject(policy); return; }
        const reserved = policy?.kind === 'copy' ? policy.placeholder : destination;
        const scale = await options.scale();
        if (!current() || !geometryCurrent()) { reject('The document or view changed. Drop the image again.'); return; }
        if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(ratio) || ratio <= 0
          || !Number.isFinite(physical.x) || !Number.isFinite(physical.y)) throw new Error('Cannot locate the image drop.');
        if (scale !== ratio || !viewportSupported()) { reject('Reset display zoom before dropping an image.'); return; }
        const point = { x: physical.x / ratio, y: physical.y / ratio };
        const target = document.elementFromPoint(point.x, point.y);
        const tableDOM = target?.closest<HTMLElement>('.preview-table'), table = tableDOM && tableEditor(tableDOM);
        if (table && table.outer === view && view.contentDOM.contains(tableDOM!)) {
          const tableDestination = reserved.replace(/\|/g, '%7C');
          const plan = table.imageDrop(target!, point, tableDestination);
          if (typeof plan === 'string') { reject(plan); return; }
          options.report('Checking dropped image…');
          const bytes = new Uint8Array(await read(destination.replace(/\|/g, '%7C'), documentPath, documentID));
          if (!current() || !geometryCurrent() || !plan.current()) { reject('The document or view changed. Drop the image again.'); return; }
          if (!bytes.length || bytes.length > imageLimit) throw new Error('The image exceeds the 8 MiB limit.');
          prepareImage(bytes);
          const finalScale = await options.scale();
          if (!current() || !geometryCurrent() || !plan.current() || finalScale !== scale) { reject('The document or view changed. Drop the image again.'); return; }
          const reason = guard() || plan.guard(); if (reason) { reject(reason); return; }
          let actual: string | undefined;
          if (policy?.kind === 'copy') {
            actual = await policy.publish(bytes, () => current() && geometryCurrent() && plan.current(), () => !!guard() || !!plan.guard()) ?? undefined;
            if (actual === undefined) return;
            const copiedScale = await options.scale();
            if (!current() || !geometryCurrent() || !plan.current() || copiedScale !== scale) { reject('The document or view changed. Drop the image again.'); return; }
            const reason = guard() || plan.guard(); if (reason) { reject(reason); return; }
          }
          if (plan.apply(actual)) options.report(policy?.kind === 'copy' ? 'Image inserted. Undo keeps the copied file.' : 'Image inserted.');
          return;
        }
        const outerReason = editGuard(view); if (outerReason) { reject(outerReason); return; }
        if (!target || !view.contentDOM.contains(target) || target.closest('.cm-content') !== view.contentDOM
          || target.closest('.cm-widgetBlock, .preview-widget, .preview-table, iframe')) {
          reject('Drop the image into document text.'); return;
        }
        const at = view.posAtCoords(point);
        if (at === null) { reject('Drop the image into visible document text.'); return; }
        const tree = ensureSyntaxTree(state, at, 50);
        if (!tree) { reject('Wait for Markdown parsing, then drop the image.'); return; }
        for (let node = tree.resolveInner(at, 1); node; node = node.parent!) {
          if (['Link', 'Autolink', 'InlineCode'].includes(node.name)) { reject('Drop the image outside links and code.'); return; }
        }
        const edit = openLink(view, 'image', EditorSelection.cursor(at));
        if (typeof edit === 'string') { reject(edit); return; }
        if (edit.existing) { reject('Drop beside the image, or use Image controls to replace it.'); return; }
        const build = (destination: string) => {
          const planned = planLink(view, edit, { label: '', destination, title: '' });
          if (typeof planned === 'string') throw new Error(planned);
          if (planned && new TextEncoder().encode(savedSource(planned.state.field(sourceField))).length > clipboardSourceLimit)
            throw new Error('The image path does not fit the 8 MiB document limit.');
          return planned;
        };
        let planned = build(reserved);
        if (!planned) return;
        options.report('Checking dropped image…');
        const bytes = new Uint8Array(await read(destination, documentPath, documentID));
        if (!current() || !geometryCurrent()) { reject('The document or view changed. Drop the image again.'); return; }
        if (!bytes.length || bytes.length > imageLimit) throw new Error('The image exceeds the 8 MiB limit.');
        prepareImage(bytes);
        const finalScale = await options.scale();
        if (!current() || !geometryCurrent() || finalScale !== scale) { reject('The document or view changed. Drop the image again.'); return; }
        const reason = guard(); if (reason) { reject(reason); return; }
        if (policy?.kind === 'copy') {
          const actual = await policy.publish(bytes, () => current() && geometryCurrent(), () => !!guard());
          if (actual === null) return;
          const copiedScale = await options.scale();
          if (!current() || !geometryCurrent() || copiedScale !== scale) { reject('The document or view changed. Drop the image again.'); return; }
          const reason = guard(); if (reason) { reject(reason); return; }
          planned = build(actual); if (!planned) return;
        }
        view.dispatch({ changes: planned.changes, selection: planned.selection,
          annotations: isolateHistory.of('full'), userEvent: 'input.drop' });
        view.focus(); options.report(policy?.kind === 'copy' ? 'Image inserted. Undo keeps the copied file.' : 'Image inserted.');
      } catch (error) { if (current()) options.report(`Cannot drop image: ${String(error)}`); }
    },
  };
}
