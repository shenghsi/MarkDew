// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { format } from '../../src/web/formatting';
import { livePreview } from '../../src/web/preview';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';

let view: EditorView;
afterEach(() => { view?.destroy(); document.body.replaceChildren(); });
function create(source: string, from = 0, to = from) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(source), display = new Compartment(), lock = new Compartment();
  view = new EditorView({ state: EditorState.create({ doc: normalize(record.raw), selection: { anchor: from, head: to },
    extensions: [sourceExtensions(record), history(), EditorState.allowMultipleSelections.of(true),
      markdown({ base: markdownLanguage }), display.of(livePreview), lock.of([])] }), parent: document.body });
  return { display, lock };
}
const source = () => savedSource(view.state.field(sourceField));
it('formats Unicode with exact source Undo/Redo and backward selection across modes', () => {
  const original = '\uFEFF日本語😀\r\n\rTail\nEnd', { display } = create(original, 5, 0);
  expect(format(view, 'bold')).toBeNull(); expect(source()).toBe('\uFEFF**日本語😀**\r\n\rTail\nEnd');
  expect(view.state.selection.main.anchor).toBe(7); expect(view.state.selection.main.head).toBe(2);
  expect(undoDepth(view.state)).toBe(1);
  view.dispatch({ effects: display.reconfigure([]) }); undo(view); expect(source()).toBe(original);
  redo(view); expect(source()).toContain('**日本語😀**');
  view.dispatch({ effects: display.reconfigure(livePreview) });
  expect(format(view, 'bold')).toBeNull(); expect(source()).toBe(original);
});
it('removes parsed style marks and keeps nested styles and escaped literals', () => {
  create('**bold *inner*** and \\*literal\\*', 9);
  expect(format(view, 'bold')).toBeNull(); expect(source()).toBe('bold *inner* and \\*literal\\*');
  undo(view); expect(source()).toBe('**bold *inner*** and \\*literal\\*');
  create('*italic*', 3); expect(format(view, 'italic')).toBeNull(); expect(source()).toBe('italic');
});
it('inserts empty marks with the cursor inside and keeps edge spaces outside emphasis', () => {
  create('text', 4); expect(format(view, 'bold')).toBeNull(); expect(source()).toBe('text****');
  expect(view.state.selection.main.head).toBe(6);
  view.dispatch({ changes: { from: 6, insert: 'new' } }); expect(source()).toBe('text**new**');
  create('  text  ', 0, 8); expect(format(view, 'italic')).toBeNull(); expect(source()).toBe('  *text*  ');
});
it('uses safe code delimiters and removes their CommonMark padding', () => {
  for (const text of ['a`b', '`edge`', ' a ', '   ', '日本語😀']) {
    create(text, 0, text.length); expect(format(view, 'code')).toBeNull();
    expect(undoDepth(view.state)).toBe(1);
    expect(format(view, 'code')).toBeNull(); expect(source()).toBe(text);
  }
});
it('changes ATX heading levels and removes parsed closing marks in one edit', () => {
  const original = '\uFEFF  ## Title ###\r\nTail\rEnd'; create(original, 8);
  expect(format(view, 'h4')).toBeNull(); expect(source()).toBe('\uFEFF  #### Title\r\nTail\rEnd');
  expect(undoDepth(view.state)).toBe(1); undo(view); expect(source()).toBe(original);
  redo(view); expect(format(view, 'paragraph')).toBeNull(); expect(source()).toBe('\uFEFF  Title\r\nTail\rEnd');
});
it('converts underlined headings without losing retained line endings', () => {
  for (const [original, expected] of [['Title\r\n=====\n\nEnd', '### Title\r\n\nEnd'], ['Title\r---', '### Title']]) {
    create(original, 2); expect(format(view, 'h3')).toBeNull(); expect(source()).toBe(expected);
    undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(expected);
  }
});
it('excludes a following line when selection ends at its start and rejects code blocks', () => {
  create('Title\nNext', 0, 6); expect(format(view, 'h2')).toBeNull(); expect(source()).toBe('## Title\nNext');
  for (const text of ['```md\ntext\n```', '    code']) {
    create(text, text.indexOf('text') >= 0 ? text.indexOf('text') : text.length);
    expect(format(view, 'h1')).not.toBeNull(); expect(source()).toBe(text); expect(undoDepth(view.state)).toBe(0);
  }
});
it('changes headings in lists and quotes with exact prefix and history preservation', () => {
  for (const [prefix, suffix] of [
    ['> ', '\r\n> Neighbor'], ['- ', '\r\n- Neighbor'], ['12) ', '\r\n13) Neighbor'],
    ['> - ', '\r\n> - Neighbor'], ['- > ', '\r\n- Neighbor'],
    ['> > ', '\r\n> > Neighbor'], ['-\t', '\r\n- Neighbor'],
    ['- Parent\r\n  - ', '\r\n  - Neighbor'],
  ]) for (const kind of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
    const original = '\uFEFF' + prefix + '日本語😀' + suffix + '\r\n\rTail\n';
    const normalized = normalize(fromSource(original).raw), from = normalized.indexOf('日本語');
    create(original, from + 5, from);
    expect(format(view, kind)).toBeNull();
    const expected = '\uFEFF' + prefix + '#'.repeat(Number(kind[1])) + ' 日本語😀' + suffix + '\r\n\rTail\n';
    expect(source()).toBe(expected); expect(undoDepth(view.state)).toBe(1);
    expect(view.state.selection.main.anchor).toBeGreaterThan(view.state.selection.main.head);
    undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(expected);
    expect(format(view, 'paragraph')).toBeNull(); expect(source()).toBe(original);
  }
});
it('retains container prefixes when changing ATX closing marks and Setext headings', () => {
  for (const [original, expected] of [
    ['> ## Title ###\r\n> Next', '> #### Title\r\n> Next'],
    ['- ## Title ###\r\n- Next', '- #### Title\r\n- Next'],
    ['> Title\r\n> =====', '> #### Title'],
    ['- Title\r\n  =====', '- #### Title'],
    ['> - Title\r\n>   =====\r\n> - Next', '> - #### Title\r\n> - Next'],
  ]) {
    create(original, original.indexOf('Title') + 2);
    expect(format(view, 'h4')).toBeNull(); expect(source()).toBe(expected);
    expect(undoDepth(view.state)).toBe(1); undo(view); expect(source()).toBe(original);
    redo(view); expect(source()).toBe(expected);
  }
});
it('rejects container-changing paragraph conversions and task ownership without an edit', () => {
  for (const [original, kind, at] of [
    ['> ## - item', 'paragraph', 7], ['- ## > quote', 'paragraph', 8],
    ['- [ ] Task', 'h2', 8], ['> first\nsecond', 'h2', 10],
  ] as const) {
    create(original, at); const selection = view.state.selection;
    expect(format(view, kind)).not.toBeNull(); expect(source()).toBe(original);
    expect(view.state.selection.eq(selection)).toBe(true); expect(undoDepth(view.state)).toBe(0);
  }
});
it('retains input when the final heading transaction is rejected or replaced', () => {
  for (const replace of [false, true]) {
    const {lock} = create('> Title', 7, 2), selection = view.state.selection;
    view.dispatch({effects:lock.reconfigure(EditorState.transactionFilter.of(transaction =>
      transaction.isUserEvent('input.format') ? replace ? {changes:{from:transaction.startState.doc.length,insert:' changed'}} : [] : transaction))});
    expect(format(view, 'h2')).not.toBeNull(); expect(source()).toBe('> Title');
    expect(view.state.selection.eq(selection)).toBe(true); expect(undoDepth(view.state)).toBe(0);
  }
});
it('rejects unsupported or invalid selections without source or history changes', () => {
  for (const text of ['first\nsecond', '   ', 'trailing\\']) {
    create(text, 0, text.length); expect(format(view, 'bold')).not.toBeNull(); expect(source()).toBe(text);
    expect(undoDepth(view.state)).toBe(0);
  }
  create('text'); view.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(3)]) });
  expect(format(view, 'italic')).toContain('one selection'); expect(source()).toBe('text');
});
it('guards composition read-only and active child edits without changing the outer selection', () => {
  const original = 'text\n\n| A |\n| --- |\n| cell |\n\nEnd', { lock } = create(original, original.length);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(format(view, 'bold')).toContain('Finish'); expect(source()).toBe(original);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  view.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) });
  expect(format(view, 'bold')).toContain('read-only'); view.dispatch({ effects: lock.reconfigure([]) });
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 0); const child = table.child!;
  const position = view.state.selection.main.head;
  expect(format(view, 'bold')).toContain('table cell'); expect(table.child).toBe(child);
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(format(view, 'h1')).toContain('Finish'); expect(source()).toBe(original);
  expect(view.state.selection.main.head).toBe(position); expect(undoDepth(view.state)).toBe(0);
});
it('does not format an unparsed distant code block as a heading', () => {
  const original = 'paragraph\n\n'.repeat(1500) + '```md\nliteral\n```\n';
  const position = original.indexOf('literal'); create(original, position);
  expect(format(view, 'h1')).not.toBeNull(); expect(source()).toBe(original);
  expect(view.state.selection.main.head).toBe(position); expect(undoDepth(view.state)).toBe(0);
});
it('adds Italic inside Bold without ambiguous merged delimiters', () => {
  create('日本語😀', 0, 5); expect(format(view, 'bold')).toBeNull();
  expect(format(view, 'italic')).toBeNull(); expect(source()).toBe('**_日本語😀_**');
  expect(undoDepth(view.state)).toBe(2); undo(view); expect(source()).toBe('**日本語😀**');
  redo(view); expect(source()).toBe('**_日本語😀_**');
  expect(format(view, 'italic')).toBeNull(); expect(source()).toBe('**日本語😀**');
});

it('adds and removes strikethrough with backward Unicode selection and exact history across modes', () => {
  const original = '\uFEFF日本語😀\r\nTail\rEnd\n', { display } = create(original, 5, 0);
  expect(format(view, 'strike')).toBeNull(); expect(source()).toBe('\uFEFF~~日本語😀~~\r\nTail\rEnd\n');
  expect([view.state.selection.main.anchor, view.state.selection.main.head]).toEqual([7, 2]);
  expect(undoDepth(view.state)).toBe(1);
  view.dispatch({ effects: display.reconfigure([]) }); undo(view); expect(source()).toBe(original);
  redo(view); expect(source()).toContain('~~日本語😀~~');
  view.dispatch({ effects: display.reconfigure(livePreview) });
  view.dispatch({ selection: { anchor: 3 } }); expect(format(view, 'strike')).toBeNull(); expect(source()).toBe(original);
  undo(view); expect(source()).toContain('~~日本語😀~~'); redo(view); expect(source()).toBe(original);
});

it('removes parsed strike marks without removing nested formatting or escaped literals', () => {
  for (const [text, expected] of [
    ['~~**bold** and *italic*~~ \\~literal\\~', '**bold** and *italic* \\~literal\\~'],
    ['~~single~~', 'single'],
  ]) {
    create(text, 3, 4); expect(format(view, 'strike')).toBeNull(); expect(source()).toBe(expected);
    undo(view); expect(source()).toBe(text);
  }
  const nested = '**bold** and *italic*'; create(nested, 0, nested.length);
  expect(format(view, 'strike')).toBeNull(); expect(source()).toBe('~~**bold** and *italic*~~');
});

it('validates new strike marks and leaves edge spaces outside the span', () => {
  create('  text  ', 0, 8); expect(format(view, 'strike')).toBeNull(); expect(source()).toBe('  ~~text~~  ');
  create('text', 4); expect(format(view, 'strike')).toBeNull(); expect(source()).toBe('text~~~~');
  expect(view.state.selection.main.head).toBe(6);
  view.dispatch({ changes: { from: 6, insert: 'new' } }); expect(source()).toBe('text~~new~~');
  for (const text of ['trailing\\', 'first\nsecond', '   ']) {
    create(text, 0, text.length); expect(format(view, 'strike')).not.toBeNull(); expect(source()).toBe(text);
    expect(undoDepth(view.state)).toBe(0);
  }
  create('`literal`', 3); expect(format(view, 'strike')).not.toBeNull(); expect(source()).toBe('`literal`');
});

it('guards strike formatting during composition, read-only state, and multiple selections', () => {
  const { lock } = create('words', 1, 4);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(format(view, 'strike')).toContain('Finish');
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  view.dispatch({ effects: lock.reconfigure(EditorState.readOnly.of(true)) });
  expect(format(view, 'strike')).toContain('read-only'); view.dispatch({ effects: lock.reconfigure([]) });
  view.dispatch({ selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(4)]) });
  expect(format(view, 'strike')).toContain('one selection'); expect(source()).toBe('words'); expect(undoDepth(view.state)).toBe(0);
});
