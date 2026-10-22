// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState, Text } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewItems } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { mountBlockHTML } from '../../src/web/block-html';
import { blockHTML } from '../../src/web/inline-html';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });
function create(source: string) {
  const record = fromSource(source), display = new Compartment();
  let state = EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), display.of(livePreview)] });
  expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull(); state = state.update({}).state;
  view = new EditorView({ state, parent: document.body });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}
it('shows complete semantic blocks and removes authored controls without changing exact source or history', async () => {
  const original = '\uFEFF---\r\ntitle: HTML\r\n---\r\n\r\n<div class="preview-caption" id="app" data-from="999" onclick="bad()"><h2>日本語😀</h2><p>Text <strong>bold</strong></p><ol start="4"><li>Item</li></ol><table><tr><td colspan="2">Last cell</td></tr></table></div>\r\n\rEnd\n';
  const { editor, source, display } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-block-html')).not.toBeNull());
  const body = document.querySelector('.preview-block-html-body')!;
  expect(body.querySelector('h2')!.textContent).toBe('日本語😀');
  expect(body.querySelector('ol')!.getAttribute('start')).toBe('4');
  expect(body.querySelector('td')!.getAttribute('colspan')).toBe('2');
  expect(body.querySelector('[id], [class], [data-from], [onclick], iframe')).toBeNull();
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  editor.dispatch({ effects: display.reconfigure([]) }); expect(document.querySelector('.preview-html')).toBeNull();
  editor.dispatch({ changes: { from: editor.state.doc.length, insert: 'new' }, userEvent: 'input.type' });
  expect(undo(editor)).toBe(true); expect(source()).toBe(original);
  expect(redo(editor)).toBe(true); expect(source()).toBe(original + 'new');
});
it('uses package container values but reveals the original quote and list source bounds', async () => {
  const original = '> <div>\n> <p>Quoted</p>\n> </div>\n\n- <div>\n  <p>Listed</p>\n  </div>\n\nEnd';
  const { editor, source } = create(original);
  await vi.waitFor(() => expect(document.querySelectorAll('.preview-block-html')).toHaveLength(2));
  expect(Array.from(document.querySelectorAll('.preview-block-html-body p')).map(node => node.textContent)).toEqual(['Quoted', 'Listed']);
  const items = previewItems(editor.state).filter(item => item.kind === 'html');
  expect(items.map(item => editor.state.doc.sliceString(item.from, item.to))).toEqual(items.map(item => item.source));
  const widget = document.querySelector<HTMLElement>('.preview-html')!;
  widget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(editor.state.selection.main.head).toBe(items[0].from); expect(source()).toBe(original);
});
it.each(['<div style="color:red">Styled</div>', '<div><img src="https://example.com/image.png"></div>', '<div><button>Action</button></div>'])('isolates unsupported HTML: %s', async original => {
  const { source } = create(original + '\n\nEnd');
  await vi.waitFor(() => expect(document.querySelector('.preview-html')!.getAttribute('data-ready')).toBe('isolated'));
  expect(document.querySelector('iframe')!.getAttribute('sandbox')).toBe('allow-same-origin');
  expect(document.querySelector('.preview-block-html')).toBeNull(); expect(source()).toBe(original + '\n\nEnd');
});
it.each(['success', 'failure'] as const)('cancels late loader %s after disposal', async outcome => {
  const source = '<div>Late</div>', dom = document.createElement('div'); document.body.append(dom);
  let resolve!: (value: typeof blockHTML) => void, reject!: (reason: unknown) => void;
  const pending = new Promise<typeof blockHTML>((yes, no) => { resolve = yes; reject = no; });
  const measure = vi.fn(), dispose = mountBlockHTML(dom, { source, doc: Text.of([source]), bodyFrom: 0, from: 0, to: source.length }, measure, () => pending);
  await Promise.resolve(); dispose();
  if (outcome === 'success') resolve(blockHTML); else reject(new Error('Failed'));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(dom.textContent).toBe(source); expect(dom.dataset.ready).toBe('loading'); expect(measure).not.toHaveBeenCalled();
});
it('isolates parser range disagreement and disconnected mounts cannot publish', async () => {
  const source = '<div>Text</div>', dom = document.createElement('div'); document.body.append(dom);
  mountBlockHTML(dom, { source, doc: Text.of([source]), bodyFrom: 0, from: 1, to: source.length }, () => {}, async () => blockHTML);
  await vi.waitFor(() => expect(dom.dataset.ready).toBe('isolated'));
  const detached = document.createElement('div'), loader = vi.fn(async () => blockHTML);
  mountBlockHTML(detached, { source, doc: Text.of([source]), bodyFrom: 0, from: 0, to: source.length }, () => {}, loader);
  await Promise.resolve(); expect(loader).not.toHaveBeenCalled();
});
