// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree, forceParsing, syntaxTree } from '@codemirror/language';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { invoke } from '@tauri-apps/api/core';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview } from '../../src/web/preview';
import { headings } from '../../src/web/navigation';
import { markdownReturn } from '../../src/web/commands';
import { format } from '../../src/web/formatting';
import { linkVersion, openLink } from '../../src/web/links';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.mocked(invoke).mockReset(); });
function create(source: string, at?: number) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), doc = normalize(record.raw), display = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc, selection: { anchor: at ?? doc.length },
    extensions: [sourceExtensions(record), history(), linkVersion, documentLanguage(), display.of(livePreview)] }), parent: document.body });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}
it('uses package metadata ranges at document start and keeps exact source/history in both modes', () => {
  const original = '\uFEFF---\r\ntitle: 图😀\r# Metadata heading\n---\r\n# Body\rEnd';
  const { editor, display, source } = create(original);
  expect(forceParsing(editor, editor.state.doc.length, 1000)).toBe(true);
  const widget = document.querySelector<HTMLElement>('.preview-frontmatter')!;
  expect(widget.querySelector('pre')!.textContent).toBe('---\ntitle: 图😀\n# Metadata heading\n---\n');
  expect(headings(editor.state).map(heading => heading.label)).toEqual(['Body']); expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
  expect(headings(editor.state)[0].from).toBe(normalize(fromSource(original).raw).indexOf('# Body'));
  widget.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(document.querySelector('.preview-frontmatter')).toBeNull(); expect(editor.state.selection.main.head).toBe(0); expect(source()).toBe(original);
  const from = editor.state.doc.toString().indexOf('图'); editor.dispatch({ changes: { from, to: from + 1, insert: '日' } });
  expect(source()).toBe(original.replace('图', '日')); editor.dispatch({ effects: display.reconfigure([]) }); undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(original.replace('图', '日'));
});
it('renders metadata as literal text without HTML math image or list widgets', async () => {
  const original = '---\n# hidden\nhtml: <script>danger()</script>\nmath: $x$\nimage: ![a](a.png)\n- [x] task\n---\n\nEnd';
  const { source } = create(original);
  expect(document.querySelector('.preview-frontmatter pre')!.textContent).toContain('<script>danger()</script>');
  expect(document.querySelector('script, iframe, .preview-math, .preview-image, .md-task-toggle')).toBeNull();
  await Promise.resolve(); expect(invoke).not.toHaveBeenCalled(); expect(source()).toBe(original);
});
it('keeps unclosed metadata as source and refreshes body boundaries when closing marks change', () => {
  const original = '---\ntitle: x\n# hidden';
  const { editor, source } = create(original);
  expect(syntaxTree(editor.state).topNode.getChild('Frontmatter')).not.toBeNull(); expect(document.querySelector('.preview-frontmatter')).toBeNull(); expect(headings(editor.state)).toEqual([]);
  editor.dispatch({ changes: { from: editor.state.doc.length, insert: '\n---\n# Body\nEnd' } });
  ensureSyntaxTree(editor.state, editor.state.doc.length, 100);
  editor.dispatch({ selection: { anchor: editor.state.doc.length } });
  expect(document.querySelector('.preview-frontmatter')).not.toBeNull(); expect(headings(editor.state).map(heading => heading.label)).toEqual(['Body']);
  undo(editor); expect(source()).toBe(original); expect(document.querySelector('.preview-frontmatter')).toBeNull(); expect(headings(editor.state)).toEqual([]);
  redo(editor); const close = editor.state.doc.toString().indexOf('\n---', 3) + 1;
  editor.dispatch({ changes: { from: close, to: close + 3, insert: '...' } });
  expect(document.querySelector('.preview-frontmatter')).toBeNull(); expect(headings(editor.state)).toEqual([]);
});
it('accepts empty metadata and follows package delimiter rules without changing ordinary Markdown', () => {
  create('---\n---\n# Body\nEnd'); expect(document.querySelector('.preview-frontmatter')).not.toBeNull(); expect(headings(view!.state).map(heading => heading.label)).toEqual(['Body']);
  for (const source of ['---\na: x\n...\n# hidden', '---\na: x\n---   \n# hidden']) {
    create(source); expect(document.querySelector('.preview-frontmatter')).toBeNull(); expect(headings(view!.state)).toEqual([]);
  }
  for (const source of ['\n---\na: x\n---\n# Body', ' ---\na: x\n---\n# Body', 'text\n---\n# Body']) {
    create(source); expect(syntaxTree(view!.state).topNode.getChild('Frontmatter')).toBeNull(); expect(headings(view!.state).map(heading => heading.label)).toContain('Body');
  }
});
it('uses plain Return in closed and unclosed metadata and Markdown continuation in the body', () => {
  for (const original of ['\uFEFF---\ritems:\r- one\r---\rEnd', '---\nitems:\n- one']) {
    const normalized = normalize(fromSource(original).raw), at = normalized.indexOf('- one') + 5;
    const { editor, source } = create(original, at); expect(markdownReturn(editor)).toBe(true);
    expect(editor.state.doc.sliceString(at, at + 2)).toBe('\n' + (at < normalized.length ? '\n' : ''));
    expect(editor.state.doc.toString()).not.toContain('- one\n- '); undo(editor); expect(source()).toBe(original);
  }
  const original = '---\na: x\n---\n> - parent\n>   - child';
  const { editor, source } = create(original); expect(markdownReturn(editor)).toBe(true); expect(editor.state.doc.toString()).toBe(original + '\n>   - '); undo(editor); expect(source()).toBe(original);
});
it('retains metadata/body Return boundaries and rejects document controls inside metadata', () => {
  const original = '---\na: x\n---\nBody';
  for (const at of [0, 3, 4, 8, 12, 13]) {
    const { editor, source } = create(original, at); expect(markdownReturn(editor)).toBe(true); expect(editor.state.doc.toString()).toBe(original.slice(0, at) + '\n' + original.slice(at)); undo(editor); expect(source()).toBe(original);
  }
  create(original, 5); expect(format(view!, 'bold')).toContain('source'); expect(openLink(view!)).toContain('source'); expect(openLink(view!, 'image')).toContain('source'); expect(undoDepth(view!.state)).toBe(0);
  create(original, 14); expect(format(view!, 'h1')).toBeNull(); expect(view!.state.doc.toString()).toContain('# Body');
});
it('ignores metadata reference definitions when rendering body reference images', async () => {
  const original = '---\n[photo]: wrong.png\n---\n\n![a][photo]\n\n[photo]: body.png\n\nEnd';
  vi.mocked(invoke).mockRejectedValue('Fixture has no image');
  create(original); await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('read_image', { destination: 'body.png', documentPath: '' }));
  expect(vi.mocked(invoke).mock.calls.some(call => (call[1] as { destination?: string })?.destination === 'wrong.png')).toBe(false);
});
