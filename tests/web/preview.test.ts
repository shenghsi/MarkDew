// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo, redo } from '@codemirror/commands';
import { livePreview, previewField, selected, previewItems } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { htmlFrame, mountResult, renderedTable } from '../../src/web/renderers';
import * as renderers from '../../src/web/renderers';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); });
function create(source: string, compartment = new Compartment()) {
  const record = fromSource(source);
  const state = EditorState.create({ doc: normalize(record.raw), selection: { anchor: normalize(record.raw).length }, extensions: [
    sourceExtensions(record), history(), markdown({ base: markdownLanguage }), compartment.of(livePreview) ] });
  view = new EditorView({ state, parent: document.body }); return { editor: view, compartment };
}
it('keeps exact source/history through preview, source mode, formula rendering and widget activation', async () => {
  const original = '\uFEFF# Title\r\n\r\nMath $x^2$.\r\n\r\n| A | B |\r\n| - | - |\r\n| x | y |\r\n\r\nEnd\n';
  const { editor, compartment } = create(original);
  const source = () => savedSource(editor.state.field(sourceField));
  expect(document.querySelector('.preview-table table')).not.toBeNull();
  await vi.waitFor(() => expect(document.querySelector('.preview-math svg')).not.toBeNull());
  expect(source()).toBe(original);
  editor.dispatch({ changes: { from: editor.state.doc.length, insert: 'new' } });
  editor.dispatch({ effects: compartment.reconfigure([]) });
  expect(document.querySelector('.preview-widget')).toBeNull();
  expect(undo(editor)).toBe(true); expect(source()).toBe(original);
  expect(redo(editor)).toBe(true); expect(source()).toBe(original + 'new');
  editor.dispatch({ effects: compartment.reconfigure(livePreview) });
  const table = document.querySelector<HTMLElement>('.preview-table')!;
  table.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-table')).toBeNull();
  expect(editor.state.doc.sliceString(editor.state.selection.main.head, editor.state.selection.main.head + 3)).toBe('| A');
  expect(source()).toBe(original + 'new');
});
it('reveals source at both boundaries, for multiple selections, and for keyboard navigation', () => {
  const state = EditorState.create({ doc: 'abc math xyz', extensions: EditorState.allowMultipleSelections.of(true),
    selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(8)]) });
  expect(selected(state, 4, 8)).toBe(true);
  expect(selected(state, 1, 3)).toBe(false);
  const { editor } = create('Text\n\n$x$\n\nEnd');
  const items = previewItems(editor.state).filter(item => item.kind === 'math');
  expect(items).toHaveLength(1);
  for (const position of [items[0].from, items[0].to]) {
    editor.dispatch({ selection: { anchor: position } });
    expect(document.querySelector('.preview-math')).toBeNull();
  }
});
it('ignores a renderer result after its widget is removed', async () => {
  const dom = document.createElement('div'); document.body.append(dom);
  let finish!: (html: string) => void;
  const pending = new Promise<string>(resolve => { finish = resolve; });
  const measure = vi.fn(); const cancel = mountResult(dom, pending, measure);
  cancel(); dom.remove(); finish('<svg>old</svg>'); await pending; await Promise.resolve();
  expect(dom.innerHTML).toBe(''); expect(measure).not.toHaveBeenCalled();
});
it('isolates HTML and blocks scripts, app commands and external resources', () => {
  const html = htmlFrame('<style>body{background:red}</style><script>parent.__TAURI__.invoke("save_document")</script><img src="https://example.com/track"><a href="https://example.com">link</a>');
  expect(html).not.toContain('<script'); expect(html).not.toContain('href=');
  expect(html).toContain("default-src 'none'"); expect(html).toContain('img-src data:');
  expect(html).toContain('<style>body{background:red}</style>');
});
it('drops pending diagram results after a source edit and a mode switch', async () => {
  const pending: ((html: string) => void)[] = [];
  vi.spyOn(renderers, 'renderDiagram').mockImplementation(() => new Promise(resolve => pending.push(resolve)));
  const original = '```mermaid\nflowchart LR\nA-->B\n```\n\nEnd';
  const { editor, compartment } = create(original);
  expect(pending).toHaveLength(1);
  const old = document.querySelector<HTMLElement>('.preview-mermaid')!;
  editor.dispatch({ changes: { from: original.indexOf('B'), to: original.indexOf('B') + 1, insert: 'C' } });
  expect(pending).toHaveLength(2);
  pending[0]('<svg id="old-result"></svg>'); await Promise.resolve();
  expect(old.innerHTML).toBe('Rendering…'); expect(document.querySelector('#old-result')).toBeNull();
  editor.dispatch({ effects: compartment.reconfigure([]) });
  pending[1]('<svg id="new-result"></svg>'); await Promise.resolve();
  expect(document.querySelector('#new-result')).toBeNull();
  expect(savedSource(editor.state.field(sourceField))).toBe(original.replace('A-->B', 'A-->C'));
  undo(editor); expect(savedSource(editor.state.field(sourceField))).toBe(original);
});
it('retains editable source when formula rendering fails', async () => {
  const original = 'Text\n\n$\\frac{broken$\n\nEnd';
  const { editor } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-error')).not.toBeNull());
  document.querySelector('.preview-error')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-error')).toBeNull();
  expect(savedSource(editor.state.field(sourceField))).toBe(original);
});
it('escapes table-cell HTML and removes link actions and remote images', () => {
  const html = renderedTable('| A | B |\n| - | - |\n| <span style="position:fixed">raw</span> | [link](https://example.com) ![image](https://example.com/track) |');
  const dom = document.createElement('div'); dom.innerHTML = html;
  expect(dom.querySelector('td')!.textContent).toContain('<span style="position:fixed">raw</span>');
  expect(dom.querySelector('[style], a, img, [href], [src]')).toBeNull();
  expect(dom.textContent).toContain('link image');
});
it('reveals HTML source through the caption and keyboard', async () => {
  const original = '<div>HTML text</div>\n\nEnd';
  const { editor } = create(original);
  await vi.waitFor(() => expect(document.querySelector('.preview-html')!.getAttribute('data-ready')).toBe('true'));
  expect(document.querySelector('iframe')).toBeNull();
  document.querySelector('.preview-caption')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-html')).toBeNull();
  editor.dispatch({ selection: { anchor: editor.state.doc.length } });
  document.querySelector('.preview-html')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(document.querySelector('iframe')).toBeNull();
  expect(savedSource(editor.state.field(sourceField))).toBe(original);
});
