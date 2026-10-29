// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
it('retains formatted HTML in the live widget, saves cell text, and restores exact source with Undo', async () => {
  const original = '\uFEFF<table><tr><td><p><strong>Old</strong></p></td><td></td></tr></table>\r\n\r\nEnd';
  const record = fromSource(original);
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length }, extensions: [sourceExtensions(record), history(), documentLanguage(), livePreview] }) });
  await vi.waitFor(() => expect(view!.dom.querySelector('[data-html-editable]')).not.toBeNull());
  const cell = view.dom.querySelector('td')!;
  const html = cell.innerHTML;
  cell.querySelector('strong')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(cell.innerHTML).toBe(html); expect(cell.querySelector('strong')!.textContent).toBe('Old');
  expect(view.dom.querySelector('textarea')).toBeNull();
  cell.querySelector('strong')!.textContent = 'New'; cell.dispatchEvent(new Event('blur'));
  expect(savedSource(view.state.field(sourceField))).toBe(original.replace('Old', 'New'));
  undo(view); expect(savedSource(view.state.field(sourceField))).toBe(original);
  await vi.waitFor(() => expect(view!.dom.querySelector('td strong')?.textContent).toBe('Old'));
});
