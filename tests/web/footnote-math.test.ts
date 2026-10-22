// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes } from '../../src/web/footnotes';
import { mountFootnote } from '../../src/web/footnote-renderer';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

let view: EditorView | undefined;
// jsdom has no text layout. Browser checks cover formula geometry separately.
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(source: string) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), display = new Compartment();
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), footnoteField, display.of(livePreview)] }) });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}
it('renders inline and block MathJax formulas in notes and keeps exact source and history', async () => {
  const original = '\uFEFFText[^n]\r\n\r\n[^n]: Formula $\\frac{a}{b}$ and `$code$`.\r\n\r\n    $$\r\n    \\int_0^1 x\\,dx\r\n    $$\r\n\rEnd\n';
  const { editor, display, source } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.footnote-math svg')).toHaveLength(2));
  expect(document.querySelector('div.footnote-math')!.getAttribute('data-display')).toBe('true');
  expect(document.querySelector('.preview-footnote-definition code')!.textContent).toBe('$code$');
  expect(document.querySelector('.footnote-math path')).not.toBeNull(); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  const from = editor.state.doc.toString().indexOf('a}{b'); editor.dispatch({ changes: { from, to: from + 1, insert: 'c' } });
  editor.dispatch({ effects: display.reconfigure([]) }); expect(document.querySelector('.footnote-math')).toBeNull();
  undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(original.replace('a}{b', 'c}{b'));
  editor.dispatch({ effects: display.reconfigure(livePreview) });
  await vi.waitFor(() => expect(document.querySelectorAll('.footnote-math svg')).toHaveLength(2));
  document.querySelector('.preview-footnote-definition')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.footnote-math')).toBeNull(); expect(source()).toBe(original.replace('a}{b', 'c}{b'));
});
it('keeps invalid formula text and the rest of the definition when MathJax fails', async () => {
  const original = 'Text[^n]\n\n[^n]: Good $x$ bad $\\frac{broken$ **retained**\n\nEnd';
  const { source } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.footnote-math.preview-error')).not.toBeNull());
  expect(document.querySelector('.footnote-math.preview-error')!.textContent).toBe('$\\frac{broken$');
  expect(document.querySelector('.footnote-math svg')).not.toBeNull();
  expect(document.querySelector('.preview-footnote-definition strong')!.textContent).toBe('retained'); expect(source()).toBe(original);
});
it('ignores pending results after cancellation and source reveal without publishing to a replacement note', async () => {
  const { editor, source } = create('Text[^n]\n\n[^n]: Old $x$\n\nEnd');
  const definition = footnotes(editor.state).definitions[0], dom = document.createElement('div'); document.body.append(dom);
  let resolve!: (html: string) => void;
  const pending = new Promise<string>(done => { resolve = done; }), measure = vi.fn();
  const cancel = mountFootnote(dom, definition, measure, () => pending), oldText = dom.textContent;
  cancel(); resolve('<svg id="stale-note"></svg>'); await pending; await Promise.resolve();
  expect(dom.textContent).toBe(oldText); expect(dom.querySelector('svg')).toBeNull(); expect(measure).not.toHaveBeenCalled();
  dom.remove(); expect(source()).toBe('Text[^n]\n\n[^n]: Old $x$\n\nEnd');
});
it('ignores rejected pending results after removal and strips formula link or resource actions', async () => {
  const { editor } = create('Text[^n]\n\n[^n]: $x$\n\nEnd'), definition = footnotes(editor.state).definitions[0];
  const dom = document.createElement('div'); document.body.append(dom);
  const measure = vi.fn();
  mountFootnote(dom, definition, measure, async () => '<mjx-container><svg><a href="https://example.com"><path d="M0 0"/></a><script>bad()</script><foreignObject>bad</foreignObject></svg><img src="https://example.com/a"/></mjx-container>');
  await Promise.resolve(); expect(dom.querySelector('a, script, img, foreignObject, [href], [src]')).toBeNull();
  expect(dom.querySelector('svg')).not.toBeNull(); expect(measure).toHaveBeenCalledOnce();
  let reject!: (error: Error) => void; const pending = new Promise<string>((_resolve, fail) => { reject = fail; });
  mountFootnote(dom, definition, measure, () => pending); dom.remove(); reject(new Error('old failure'));
  await pending.catch(() => {}); await Promise.resolve(); expect(dom.querySelector('.preview-error')).toBeNull(); expect(measure).toHaveBeenCalledOnce();
});
