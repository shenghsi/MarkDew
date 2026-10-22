// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { applyLink, LinkEdit, linkVersion, openLink, removeLink } from '../../src/web/links';
import { linkControls } from '../../src/web/link-controls';
import { imageFileDestination, imageReader } from '../../src/web/images';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });
function create(source: string, from = 0, to = from) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), lock = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc: normalize(record.raw), selection: { anchor: from, head: to },
    extensions: [sourceExtensions(record), history(), linkVersion, EditorState.allowMultipleSelections.of(true), markdown({ base: markdownLanguage }), lock.of([])] }), parent: document.body });
  return { editor: view, lock, source: () => savedSource(view!.state.field(sourceField)) };
}
function capture() { const edit = openLink(view!, 'image'); expect(typeof edit).not.toBe('string'); return edit as LinkEdit; }
it('inserts images in one exact source history transaction and selects the raw alt label', () => {
  const original = '\uFEFF图😀\r\n\rTail\nEnd', { editor, source } = create(original, 0, 3);
  expect(applyLink(editor, capture(), { label: '**图😀**', destination: 'images/图 name.png', title: 'Title' })).toBeNull();
  expect(source()).toBe('\uFEFF![**图😀**](<images/图 name.png> "Title")\r\n\rTail\nEnd');
  expect(editor.state.doc.sliceString(editor.state.selection.main.from, editor.state.selection.main.to)).toBe('**图😀**');
  expect(undoDepth(editor.state)).toBe(1); undo(editor); expect(source()).toBe(original); redo(editor); expect(source()).toContain('![**图😀**]');
  create('before after', 7); expect(applyLink(view!, capture(), { label: '', destination: 'a.png', title: '' })).toBeNull();
  expect(savedSource(view!.state.field(sourceField))).toBe('before ![](<a.png>)after');
});
it('patches only changed image fields and removes the raw alt label without rewriting other bytes', () => {
  const original = '![**图** &amp; `a`](<old file.png>  \'title &amp; text\' )\r\nEnd';
  const { editor, source } = create(original, 4), edit = capture();
  expect(edit.label).toBe('**图** &amp; `a`'); expect(edit.title).toBe('title & text');
  expect(applyLink(editor, edit, { ...edit, destination: 'new.png' })).toBeNull();
  expect(source()).toBe(original.replace('<old file.png>', '<new.png>')); undo(editor); expect(source()).toBe(original);
  expect(removeLink(editor, capture())).toBeNull(); expect(source()).toBe('**图** &amp; `a`\r\nEnd');
  undo(editor); expect(source()).toBe(original); expect(applyLink(editor, capture(), capture())).toBeNull(); expect(undoDepth(editor.state)).toBe(0);
});
it('keeps shared reference definitions on removal and rejects reference field updates', () => {
  for (const spelling of ['![**图**][photo]', '![photo][]', '![photo]']) {
    const original = spelling + '\r\n\r\n[photo]: image.png "title"\rEnd';
    const { editor, source } = create(original, 3), edit = capture(); expect(edit.reference).toBe(true);
    expect(applyLink(editor, edit, { ...edit, destination: 'changed.png' })).toContain('reference-image'); expect(source()).toBe(original);
    expect(removeLink(editor, edit)).toBeNull(); expect(source()).toBe(edit.label + original.slice(edit.to));
    undo(editor); expect(source()).toBe(original);
  }
});
it('rejects stale captures invalid destinations and malformed labels without changing source', () => {
  const { editor, source } = create('![a](a.png)\nEnd', 3), edit = capture();
  editor.dispatch({ changes: { from: editor.state.doc.length, insert: 'new' } }); undo(editor);
  expect(applyLink(editor, edit, { ...edit, destination: 'b.png' })).toContain('changed'); expect(removeLink(editor, edit)).toContain('changed'); expect(source()).toBe('![a](a.png)\nEnd');
  for (const destination of ['http://example.com/a.png', 'file:///tmp/a.png', '//example.com/a.png', 'javascript:alert(1)', 'data:text/html,x', 'a\n.png']) {
    const { editor, source } = create('label', 0, 5), current = capture(); expect(applyLink(editor, current, { ...current, destination })).not.toBeNull(); expect(source()).toBe('label'); expect(undoDepth(editor.state)).toBe(0);
  }
  create('a[b', 0, 3); expect(applyLink(view!, capture(), { label: 'a[b', destination: 'a.png', title: '' })).not.toBeNull();
});
it('rechecks read-only composition multiple selections and source block guards', () => {
  const { editor, lock, source } = create('text', 0, 4), edit = capture();
  editor.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) }); expect(applyLink(editor, edit, { ...edit, destination: 'a.png' })).toContain('read-only');
  editor.dispatch({ effects: lock.reconfigure([]) }); editor.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(removeLink(editor, edit)).toContain('Finish'); editor.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  editor.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(4)]) }); expect(typeof openLink(editor, 'image')).toBe('string'); expect(source()).toBe('text');
  for (const text of ['```\ntext\n```', '$x^2$', '![multi\nline](a.png)']) { create(text, text.indexOf('text') >= 0 ? text.indexOf('text') : 3); expect(typeof openLink(view!, 'image'), text).toBe('string'); }
  create('![a](a.png)', 3); expect(openLink(view!)).toContain('image controls');
});
it('uses form composition guards and cancellation without a source transaction', () => {
  const { editor, source } = create('text', 0, 4), bar = document.createElement('div'); document.body.prepend(bar);
  const messages: string[] = [], open = linkControls(editor, bar, message => messages.push(message), 'image'); open();
  const form = document.querySelector<HTMLFormElement>('.image-controls')!;
  form.querySelector<HTMLInputElement>('[name="destination"]')!.value = 'a.png';
  form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(messages[0]).toContain('Finish'); expect(source()).toBe('text');
  const enter = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }); form.dispatchEvent(enter); expect(enter.defaultPrevented).toBe(true);
  form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })); expect(form.hidden).toBe(false);
  form.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); form.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
  expect(form.hidden).toBe(true); expect(undoDepth(editor.state)).toBe(0);
});
it('fills picker paths only while the form capture and request remain current', async () => {
  const { editor, source } = create('text', 0, 4), bar = document.createElement('div'); document.body.prepend(bar);
  let finish!: (path: string | null) => void;
  const choose = vi.fn(() => new Promise<string | null>(resolve => { finish = resolve; }));
  const open = linkControls(editor, bar, () => {}, 'image', choose); open();
  const form = document.querySelector<HTMLFormElement>('.image-controls')!, destination = form.querySelector<HTMLInputElement>('[name="destination"]')!;
  const picker = form.querySelector<HTMLButtonElement>('[data-choose]')!;
  picker.click(); finish('/tmp/图 #100%.png'); await Promise.resolve(); await Promise.resolve();
  expect(destination.value).toBe('/tmp/图%20%23100%25.png'); expect(source()).toBe('text'); expect(undoDepth(editor.state)).toBe(0);
  picker.click(); finish(null); await Promise.resolve(); await Promise.resolve(); expect(destination.value).toBe('/tmp/图%20%23100%25.png');
  picker.click(); destination.value = 'manual.png'; destination.dispatchEvent(new Event('input', { bubbles: true })); finish('late.png'); await Promise.resolve(); await Promise.resolve(); expect(destination.value).toBe('manual.png');
  picker.click(); form.querySelector<HTMLButtonElement>('[data-cancel]')!.click(); open(); finish('closed.png'); await Promise.resolve(); await Promise.resolve(); expect(destination.value).toBe('');
  picker.click(); editor.dispatch({ changes: { from: 4, insert: 'new' } }); finish('old-document.png'); await Promise.resolve(); await Promise.resolve(); expect(destination.value).toBe('');
  open(); picker.click(); form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); finish('during-ime.png'); await Promise.resolve(); await Promise.resolve(); expect(destination.value).toBe('');
  expect(source()).toBe('textnew'); expect(undoDepth(editor.state)).toBe(1);
});
it('round trips picker punctuation Windows drives and UNC spelling through Markdown decoding', () => {
  for (const path of ['/tmp/图 #100% [a](b)?.png', 'C:\\images\\图 #100%.png', '\\\\server\\share\\a [b]%.png']) {
    const { editor, source } = create('alt', 0, 3), destination = imageFileDestination(path);
    expect(applyLink(editor, capture(), { label: 'alt', destination, title: '' }), path).toBeNull();
    const result = imageReader(source, '')(editor.state.doc.toString())!;
    expect(decodeURIComponent(result.destination)).toBe(path);
    undo(editor); expect(source()).toBe('alt');
  }
});
