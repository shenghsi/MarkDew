// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes, renderFootnote } from '../../src/web/footnotes';
import { livePreview } from '../../src/web/preview';
import { headings } from '../../src/web/navigation';
import { markdownReturn } from '../../src/web/commands';
import { format } from '../../src/web/formatting';
import { linkVersion, openLink } from '../../src/web/links';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });
function create(source: string, at?: number) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), doc = normalize(record.raw), display = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc, selection: { anchor: at ?? doc.length },
    extensions: [sourceExtensions(record), history(), linkVersion, footnoteField, documentLanguage(), display.of(livePreview)] }), parent: document.body });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}
it('numbers resolved references in first-use order with UTF-16 source ranges and repeated labels', () => {
  const original = '😀 B[^b] A[^a] B[^B] missing[^z].\n\n[^a]: First **note**\n\n[^b]: Second note\n\nEnd';
  const { editor, source } = create(original), notes = footnotes(editor.state);
  expect(notes.references.map(note => [note.label, note.number])).toEqual([['b', 1], ['a', 2], ['B', 1]]);
  expect(notes.references[0].from).toBe(4); expect(editor.state.doc.sliceString(notes.references[0].from, notes.references[0].to)).toBe('[^b]');
  expect(Array.from(document.querySelectorAll('.preview-footnote sup'), node => node.textContent)).toEqual(['1', '2', '1']);
  expect(document.querySelector('.preview-footnote-definition strong')!.textContent).toBe('note');
  expect(source()).toBe(original); expect(undoDepth(editor.state)).toBe(0);
});
it('reveals references and definitions without source changes and retains exact history in Source mode', () => {
  const original = '\uFEFFText[^图].\r\n\r\n[^图]: **日本語😀**\r\n\rEnd\n';
  const { editor, display, source } = create(original), notes = footnotes(editor.state);
  document.querySelector('.preview-footnote')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  expect(editor.state.selection.main.head).toBe(notes.references[0].from); expect(document.querySelector('.preview-footnote')).toBeNull(); expect(source()).toBe(original);
  editor.dispatch({ selection: { anchor: editor.state.doc.length } });
  document.querySelector('.preview-footnote-definition')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(editor.state.selection.main.head).toBe(notes.definitions[0].from); expect(document.querySelector('.preview-footnote-definition')).toBeNull(); expect(undoDepth(editor.state)).toBe(0);
  const from = editor.state.doc.toString().indexOf('日本語'); editor.dispatch({ changes: { from, to: from + 3, insert: '中文' } });
  expect(source()).toBe(original.replace('日本語', '中文')); editor.dispatch({ effects: display.reconfigure([]) });
  expect(document.querySelector('.preview-widget')).toBeNull(); undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toBe(original.replace('日本語', '中文'));
});
it('uses the first duplicate definition and leaves missing references as source', () => {
  const original = 'Text[^A] missing[^unknown].\n\n[^a]: Accepted\n\n[^A]: Duplicate\n\nEnd';
  const { editor, source } = create(original), notes = footnotes(editor.state);
  expect(notes.references).toHaveLength(1); expect(notes.definitions.map(note => [note.duplicate, note.number])).toEqual([[false, 1], [true, undefined]]);
  expect(document.querySelectorAll('.preview-footnote')).toHaveLength(1); expect(document.querySelector('.cm-line')!.textContent).toContain('missing[^unknown]');
  expect(Array.from(document.querySelectorAll('.preview-caption'), node => node.textContent).join(' ')).toContain('duplicate definition'); expect(source()).toBe(original);
});
it('excludes escaped references code HTML blocks math and metadata through package context', () => {
  const original = '---\n[^meta]: Metadata\n---\n\n\\[^n] `[^n]` $[^n]$\n\n```\n[^n]\n```\n\n<div>\n[^n]\n</div>\n\nReal[^n]\n\n[^n]: Note\n\nEnd';
  const { editor } = create(original), notes = footnotes(editor.state);
  expect(notes.definitions.map(note => note.label)).toEqual(['n']); expect(notes.references).toHaveLength(1);
  expect(notes.references[0].from).toBe(original.indexOf('Real[^n]') + 4); expect(document.querySelectorAll('.preview-footnote')).toHaveLength(1);
});
it('retains nested container and continuation ranges without overlapping nested preview widgets or outline headings', () => {
  const original = '# Body\n\nText[^a] and[^b].\n\n[^a]: First **note**\n\n    # Note heading\n\n    - item\n    - `$literal$`\n\n> [^b]: Quote\n>\n>     more\n\nEnd';
  const { editor, source } = create(original), notes = footnotes(editor.state);
  expect(notes.definitions).toHaveLength(2); expect(editor.state.doc.sliceString(notes.definitions[0].from, notes.definitions[0].to)).toContain('    - item');
  expect(editor.state.doc.sliceString(notes.definitions[1].from, notes.definitions[1].to)).toContain('>     more');
  expect(document.querySelectorAll('.preview-footnote-definition')).toHaveLength(2);
  expect(document.querySelector('.preview-footnote-definition li')!.textContent).toBe('item'); expect(headings(editor.state).map(heading => heading.label)).toEqual(['Body']);
  expect(document.querySelector('.preview-footnote-definition .preview-widget')).toBeNull(); expect(source()).toBe(original);
});
it('renders definition HTML as text and retains link image code and formula text without active resources', () => {
  const original = 'Text[^n]\n\n[^n]: Text <script>bad()</script> [link](https://example.com) ![图](https://example.com/a.png) `$code$` $x$\n\nEnd';
  const { editor, source } = create(original), definition = footnotes(editor.state).definitions[0];
  const dom = document.createElement('div'); dom.innerHTML = renderFootnote(definition);
  expect(dom.querySelector('script, style, a, img, iframe, [href], [src], [style]')).toBeNull(); expect(dom.textContent).toContain('<script>bad()</script>');
  expect(dom.textContent).toContain('link 图 $code$ $x$'); expect(source()).toBe(original);
});
it('refreshes definitions and numbering after edits and Undo while Source mode retains the same range model', () => {
  const original = 'B[^b] A[^a]\n\n[^a]: A\n\n[^b]: B\n\nEnd';
  const { editor, display, source } = create(original), before = footnotes(editor.state);
  editor.dispatch({ effects: display.reconfigure([]) }); expect(footnotes(editor.state)).toBe(before);
  editor.dispatch({ changes: { from: 1, to: 5, insert: '' } }); expect(footnotes(editor.state).references.map(note => note.number)).toEqual([1]);
  editor.dispatch({ effects: display.reconfigure(livePreview) }); expect(Array.from(document.querySelectorAll('.preview-footnote sup'), node => node.textContent)).toEqual(['1']);
  undo(editor); expect(source()).toBe(original); expect(footnotes(editor.state).references.map(note => note.number)).toEqual([1, 2]);
  const from = editor.state.doc.toString().indexOf('[^b]:'); editor.dispatch({ changes: { from, to: from + 5, insert: '[^z]:' } });
  expect(footnotes(editor.state).references.map(note => note.label)).toEqual(['a']); undo(editor); expect(source()).toBe(original);
});
it('guards note source controls and uses plain Return on definition continuation lines', () => {
  const original = 'Text[^n]\n\n[^n]: first\n\n    - one\n\nEnd', from = original.indexOf('- one') + 5;
  const { editor, source } = create(original, from);
  expect(format(editor, 'bold')).toContain('footnote'); expect(openLink(editor)).toContain('footnote'); expect(openLink(editor, 'image')).toContain('footnote');
  expect(markdownReturn(editor)).toBe(true); expect(editor.state.doc.sliceString(from, from + 2)).toBe('\n\n'); expect(editor.state.doc.toString()).not.toContain('- one\n- ');
  undo(editor); expect(source()).toBe(original); editor.dispatch({ selection: { anchor: 6 } }); expect(openLink(editor)).toContain('footnote'); expect(undoDepth(editor.state)).toBe(0);
  for (const [anchor, head] of [[3, 6], [6, 10], [0, 9], [4, 4], [8, 8]]) {
    editor.dispatch({ selection: { anchor, head } });
    expect(format(editor, 'bold')).toContain('footnote'); expect(openLink(editor)).toContain('footnote');
    expect(openLink(editor, 'image')).toContain('footnote'); expect(source()).toBe(original);
  }
});
