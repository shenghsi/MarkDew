// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { applyLink, LinkEdit, linkVersion, openLink, removeLink } from '../../src/web/links';
import { linkControls } from '../../src/web/link-controls';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';

let view: EditorView;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(source: string, from = 0, to = from) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), display = new Compartment(), lock = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc: normalize(record.raw), selection: { anchor: from, head: to },
    extensions: [sourceExtensions(record), history(), linkVersion, EditorState.allowMultipleSelections.of(true),
      markdown({ base: markdownLanguage }), display.of(livePreview), lock.of([])] }), parent: document.body });
  return { display, lock };
}
function capture() { const result = openLink(view); expect(typeof result).not.toBe('string'); return result as LinkEdit; }
const source = () => savedSource(view.state.field(sourceField));
it('creates Unicode links with exact mixed-ending Undo/Redo in both modes', () => {
  const original = '\uFEFF日本語😀\r\n\rTail\nEnd', { display } = create(original, 0, 5), edit = capture();
  expect(applyLink(view, edit, { ...edit, destination: 'folder/file name.md', title: 'Title' })).toBeNull();
  expect(source()).toBe('\uFEFF[日本語😀](<folder/file name.md> "Title")\r\n\rTail\nEnd'); expect(undoDepth(view.state)).toBe(1);
  expect(view.state.doc.sliceString(view.state.selection.main.from, view.state.selection.main.to)).toBe('日本語😀');
  view.dispatch({ effects: display.reconfigure([]) }); undo(view); expect(source()).toBe(original);
  redo(view); view.dispatch({ effects: display.reconfigure(livePreview) }); expect(source()).toContain('[日本語😀]');
});
it('changes only selected link fields and preserves raw spacing escaping and title spelling', () => {
  const original = '[**日本語**](<file name.md>  \'quoted &amp; title\' )\r\nEnd'; create(original, 4);
  const edit = capture(); expect(edit.label).toBe('**日本語**'); expect(edit.destination).toBe('file name.md'); expect(edit.title).toBe('quoted & title');
  expect(applyLink(view, edit, { ...edit, destination: 'new path.md' })).toBeNull();
  expect(source()).toBe(original.replace('<file name.md>', '<new path.md>')); undo(view); expect(source()).toBe(original);
  expect(applyLink(view, capture(), { ...capture(), label: '**New**' })).toBeNull();
  expect(source()).toBe(original.replace('**日本語**', '**New**'));
});
it('adds and removes a quoted title without rewriting label or destination', () => {
  create('[text](path(a).md   )', 3); let edit = capture();
  expect(applyLink(view, edit, { ...edit, title: 'new & "quoted"' })).toBeNull();
  expect(source()).toBe('[text](path(a).md    "new &amp; \\"quoted\\"")');
  edit = capture(); expect(edit.title).toBe('new & "quoted"');
  expect(applyLink(view, edit, { ...edit, title: '' })).toBeNull(); expect(source()).toBe('[text](path(a).md    )');
  undo(view); undo(view); expect(source()).toBe('[text](path(a).md   )');
});
it('accepts escaped brackets nested styles relative URLs and literal parentheses', () => {
  for (const label of ['**bold** *italic*', 'a\\[b\\]', '`[code]`']) {
    create(label, 0, label.length); const edit = capture();
    expect(applyLink(view, edit, { ...edit, destination: '../path(a).md#part' })).toBeNull();
    expect(source()).toBe(`[${label}](<../path(a).md#part>)`);
  }
});
it('creates links at empty selections and accepts empty labels', () => {
  create('before after', 7); const edit = capture(); expect(edit.label).toBe('');
  expect(applyLink(view, edit, { label: 'link', destination: '#section', title: '' })).toBeNull();
  expect(source()).toBe('before [link](<#section>)after'); undo(view); expect(source()).toBe('before after');
  expect(applyLink(view, capture(), { label: '', destination: 'https://example.com', title: '' })).toBeNull();
  expect(source()).toContain('[](<https://example.com>)');
});
it('removes inline and reference links without changing shared definitions or nested labels', () => {
  for (const original of ['[**label**](url "title")\r\nEnd', '[**label**][ref]\r\n\r\n[ref]: url "title"\rEnd']) {
    create(original, 4); const edit = capture();
    expect(removeLink(view, edit)).toBeNull(); expect(source()).toBe(original.slice(0, 0) + '**label**' + original.slice(edit.to));
    expect(undoDepth(view.state)).toBe(1); undo(view); expect(source()).toBe(original); redo(view);
    expect(source()).toContain('**label**');
  }
});
it('rejects malformed labels controls and decoded unsafe destinations without mutation', () => {
  for (const destination of ['javascript:alert(1)', 'java&#x73;cript:alert(1)', 'javascript\\:alert(1)', 'vbscript:x', 'file:///tmp/x', 'data:text/html,x', 'url\nnext', 'path<part>.md']) {
    create('label', 0, 5); const edit = capture(), selection = view.state.selection.toJSON();
    expect(applyLink(view, edit, { ...edit, destination })).not.toBeNull(); expect(source()).toBe('label');
    expect(view.state.selection.toJSON()).toEqual(selection); expect(undoDepth(view.state)).toBe(0);
  }
  create('a[b', 0, 3); const edit = capture(); expect(applyLink(view, edit, { ...edit, destination: 'url' })).not.toBeNull(); expect(source()).toBe('a[b');
});
it('rejects stale Apply and Remove after edits Undo Redo and a new state generation', () => {
  create('[label](url)\nEnd', 3); const edit = capture();
  view.dispatch({ changes: { from: view.state.doc.length, insert: 'new' } }); undo(view);
  expect(source()).toBe('[label](url)\nEnd'); expect(applyLink(view, edit, { ...edit, destination: 'changed' })).toContain('changed');
  expect(removeLink(view, edit)).toContain('changed'); redo(view); undo(view); expect(removeLink(view, edit)).toContain('changed');
  const fresh = capture();
  view.setState(EditorState.create({ doc: fresh.doc, extensions: [sourceExtensions(fresh.record), history(), linkVersion, markdown()] }));
  expect(removeLink(view, fresh)).toContain('changed'); expect(source()).toBe('[label](url)\nEnd');
});
it('keeps unchanged fields as a no-op and rejects reference updates and unsupported source blocks', () => {
  create('[label](url  \'title\' )', 3); const edit = capture(); expect(applyLink(view, edit, edit)).toBeNull(); expect(undoDepth(view.state)).toBe(0);
  create('[label][ref]\n\n[ref]: url', 3); const reference = capture(); expect(applyLink(view, reference, reference)).toContain('reference-link');
  for (const text of ['```md\ntext\n```', '<https://example.com>', '[multi\nline](url)']) {
    create(text, text.indexOf('text') >= 0 ? text.indexOf('text') : 3); expect(typeof openLink(view), text).toBe('string');
  }
});
it('retains existing multiline destination/title spacing through a field edit', () => {
  const original = '[label](url\r\n "title")\rEnd'; create(original, 3); const edit = capture();
  expect(applyLink(view, edit, { ...edit, destination: 'new' })).toBeNull();
  expect(source()).toBe(original.replace('url', '<new>')); undo(view); expect(source()).toBe(original);
});
it('round trips literal destination punctuation through package decoding', () => {
  for (const destination of ['path%3Cpart%3E.md', 'query?x=1&y=2', 'back\\slash.md', 'mailto:person@example.com']) {
    create('label', 0, 5); const edit = capture();
    expect(applyLink(view, edit, { ...edit, destination }), destination).toBeNull();
    expect(capture().destination).toBe(destination); undo(view); expect(source()).toBe('label');
  }
});
it('rechecks read-only composition and child editing when a form is applied', () => {
  const original = 'text\n\n| A |\n| --- |\n| cell |\n\nEnd', { lock } = create(original, 0, 4), edit = capture();
  view.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) }); expect(applyLink(view, edit, { ...edit, destination: 'url' })).toContain('read-only');
  view.dispatch({ effects: lock.reconfigure([]) });
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); expect(removeLink(view, edit)).toContain('Finish');
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 0);
  expect(applyLink(view, edit, { ...edit, destination: 'url' })).toContain('table cell');
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
});
it('opens and cancels form controls without a source transaction and defers form composition', () => {
  create('text', 0, 4); const bar = document.createElement('div'); document.body.prepend(bar);
  const messages: string[] = [], open = linkControls(view, bar, message => messages.push(message));
  const originalState = view.state; open(); expect(view.state).toBe(originalState);
  const form = document.querySelector<HTMLFormElement>('.link-controls')!;
  form.querySelector<HTMLInputElement>('[name="destination"]')!.value = 'url';
  form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); expect(source()).toBe('text'); expect(messages[0]).toContain('Finish');
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  form.dispatchEvent(escape); expect(form.hidden).toBe(false); expect(escape.defaultPrevented).toBe(false);
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  form.dispatchEvent(enter); expect(enter.defaultPrevented).toBe(true);
  form.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  const flaggedEnter = new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true });
  form.dispatchEvent(flaggedEnter); expect(flaggedEnter.defaultPrevented).toBe(true);
  form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true })); expect(form.hidden).toBe(false);
  form.querySelector<HTMLButtonElement>('[data-cancel]')!.click(); expect(form.hidden).toBe(true);
  expect(view.state).toBe(originalState); expect(undoDepth(view.state)).toBe(0);
});
it('fills an existing empty destination and title in one transaction', () => {
  create('[label]()', 3); const edit = capture();
  expect(applyLink(view, edit, { ...edit, destination: 'url', title: 'title' })).toBeNull();
  expect(source()).toBe('[label](<url> "title")'); expect(undoDepth(view.state)).toBe(1);
  undo(view); expect(source()).toBe('[label]()');
});
it('hides a reference suffix in preview and reveals its exact source when selected', () => {
  const original = '[label][ref]\n\n[ref]: url\n\nEnd'; create(original, original.length);
  expect(document.querySelector('.cm-line')!.textContent).toBe('label'); expect(source()).toBe(original);
  view.dispatch({ selection: { anchor: 3 } }); expect(document.querySelector('.cm-line')!.textContent).toBe('[label][ref]');
  expect(undoDepth(view.state)).toBe(0);
});
