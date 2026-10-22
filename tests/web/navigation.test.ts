// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, redo, undo, undoDepth } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { SearchQuery, findNext, replaceAll, replaceNext, setSearchQuery } from '@codemirror/search';
import { ensureSyntaxTree } from '@codemirror/language';
import { find, headings, freshHeadings, outline, refreshOutline, searchSupport } from '../../src/web/navigation';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField } from '../../src/web/footnotes';
import { livePreview } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

let view: EditorView;
afterEach(() => { view?.destroy(); document.body.innerHTML = ''; });
it('matches the full outline traversal across leaf blocks, containers, metadata, and partial trees', () => {
  const body = '# Start\n\nParagraph **strong** `code` and [link](url).\n\n> ## Quote\n>\n> - ### Nested\n\n- Item\n\n  Setext\n  ------\n\n```md\n# Code source\n```\n\n    # Indented source\n\n<div>\n# HTML source\n</div>\n\n| A | B |\n|---|---|\n| # cell | text |\n\n---\n\n[^n]: Note\n\n    # Definition heading\n\nwords[^n]\n\n# End';
  for (const source of [body, '---\nname: metadata\n---\n\n' + body,
    '# First\n\n' + 'paragraph **strong** `code`\n\n'.repeat(800) + body]) {
    let state = EditorState.create({ doc: source, extensions: [documentLanguage(), footnoteField] });
    expect(headings(state)).toEqual(freshHeadings(state));
    expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull(); state = state.update({}).state;
    expect(headings(state)).toEqual(freshHeadings(state));
    const labels = headings(state).map(heading => heading.label);
    expect(labels).toContain('Nested'); expect(labels).toContain('Setext'); expect(labels).toContain('End');
    expect(labels).not.toContain('Code source'); expect(labels).not.toContain('Indented source'); expect(labels).not.toContain('Definition heading');
    for (const insert of ['## New\n\n', '普通文本\n\n', '<div>\n', '```md\n']) {
      let changed = state.update({ changes: { from: source.indexOf('Paragraph'), insert } }).state;
      expect(headings(changed)).toEqual(freshHeadings(changed));
      ensureSyntaxTree(changed, changed.doc.length, 1000); changed = changed.update({}).state;
      expect(headings(changed)).toEqual(freshHeadings(changed));
    }
  }
});
function setup(source: string) {
  const record = fromSource(source), display = new Compartment(), aside = document.createElement('aside');
  document.body.append(aside);
  view = new EditorView({ parent: document.body, state: EditorState.create({ doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length }, extensions: [sourceExtensions(record), history(),
      markdown({ base: markdownLanguage }), display.of(livePreview), searchSupport(() => view), outline(aside)] }) });
  // Search checks require mounted previews, not a time-limited initial parse.
  expect(ensureSyntaxTree(view.state, view.state.doc.length, 1000)).not.toBeNull();
  view.dispatch({});
  return { display, aside, source: () => savedSource(view.state.field(sourceField)) };
}
it('replaces across lines in one history event and preserves BOM and untouched mixed endings', () => {
  const original = '\uFEFF# Title\r\n\r\n日本語\r\n😀\r\n\r\n日本語\n😀\rAfter';
  const { source, display } = setup(original);
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '日本語\\n😀', replace: 'new', caseSensitive: true })) });
  expect(find(view)).toBe(true); expect(undoDepth(view.state)).toBe(0);
  replaceAll(view); const changed = '\uFEFF# Title\r\n\r\nnew\r\n\r\nnew\rAfter';
  expect(source()).toBe(changed); expect(undoDepth(view.state)).toBe(1);
  view.dispatch({ effects: display.reconfigure([]) });
  expect(undo(view)).toBe(true); expect(source()).toBe(original);
  expect(redo(view)).toBe(true); expect(source()).toBe(changed);
});
it('finds hidden math and table source and ends the active cell without changing source', () => {
  const original = '$secret$\n\n|A|B|\n|---|---|\n|x|target|\n\nEnd';
  const { source } = setup(original); const table = tableEditor(document.querySelector('.preview-table')!)!;
  table.begin(1, 1); view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: 'secret' })) });
  expect(find(view)).toBe(true); expect(table.child).toBeUndefined(); findNext(view);
  expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe('secret');
  expect(document.querySelector('.preview-math')).toBeNull(); expect(source()).toBe(original);
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: 'target' })) }); findNext(view);
  expect(document.querySelector('.preview-table')).toBeNull(); expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
});
it('supports regexp replacements and handles invalid and empty queries without source loss', () => {
  const { source } = setup('a1 a2 😀\n\nEnd');
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: 'a(\\d)', replace: 'b$1', regexp: true })) });
  replaceAll(view); expect(source()).toBe('b1 b2 😀\n\nEnd'); undo(view);
  for (const search of ['(', '']) {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search, replace: 'bad', regexp: true })) });
    replaceAll(view); expect(source()).toBe('a1 a2 😀\n\nEnd');
  }
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '(?=a)', replace: 'X', regexp: true })) });
  replaceAll(view); expect(source()).toBe('Xa1 Xa2 😀\n\nEnd'); undo(view); expect(source()).toBe('a1 a2 😀\n\nEnd');
});
it('guards direct replacement commands during outer and child composition', () => {
  const original = 'target\n\n|A|B|\n|---|---|\n|x|target|\n\nEnd';
  const { source } = setup(original);
  view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: 'target', replace: 'changed' })) });
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  findNext(view); replaceAll(view); replaceNext(view); expect(source()).toBe(original); expect(find(view)).toBe(false);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 1); const child = table.child!;
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  replaceAll(view); replaceNext(view); findNext(view); expect(source()).toBe(original); expect(table.child).toBe(child);
});
it('builds safe outline labels with heading levels and navigates in both display modes without history', () => {
  const original = '# **Title** [link](https://example.com)\n\nSetext\n======\n\nSecondary\n---------\n\n### `Code` <img src=x>\n\n```md\n# ignored\n```\n';
  const { aside, display, source } = setup(original);
  expect(headings(view.state).map(heading => heading.level)).toEqual([1, 1, 2, 3]);
  expect(document.querySelectorAll('.md-h1')).toHaveLength(2);
  expect(document.querySelectorAll('.md-h2')).toHaveLength(1);
  expect(aside.querySelectorAll('button')[0].textContent).toBe('Title link'); expect(aside.querySelector('img')).toBeNull();
  for (const mode of [[], livePreview]) {
    view.dispatch({ effects: display.reconfigure(mode) }); aside.querySelectorAll<HTMLButtonElement>('button')[1].click();
    expect(view.state.selection.main.head).toBe(original.indexOf('Setext')); expect(source()).toBe(original);
  }
  expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ changes: { from: 0, insert: '# New\n\n' } });
  expect(aside.querySelectorAll('button')[0].textContent).toBe('New'); undo(view);
  expect(aside.querySelectorAll('button')[0].textContent).toBe('Title link');
});
it('marks the current source section without rebuilding outline buttons or changing history', () => {
  const original = '\uFEFFIntro\r\n\r\n# Same\r\n\r\nFirst\r\n\r\n## Same\rSecond\n';
  const { aside, source, display } = setup(original);
  const buttons = Array.from(aside.querySelectorAll<HTMLButtonElement>('button'));
  expect(buttons[1].getAttribute('aria-current')).toBe('location');
  for (const [position, current] of [[0, -1], [view.state.doc.toString().indexOf('First'), 0],
    [view.state.doc.toString().indexOf('## Same'), 1]] as const) {
    view.dispatch({ selection: { anchor: position } });
    expect(Array.from(aside.querySelectorAll('button'))).toEqual(buttons);
    expect(buttons.map(button => button.hasAttribute('aria-current'))).toEqual([current === 0, current === 1]);
    expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
  }
  view.dispatch({ effects: display.reconfigure([]) });
  expect(aside.querySelectorAll('button')[1].getAttribute('aria-current')).toBe('location');
});
it('moves outline keyboard focus and activates headings without a source edit', () => {
  const original = '# 一\n\nText\n\n## 二\n\nText\n\n### 三\n';
  const { aside, source } = setup(original), selection = view.state.selection;
  const buttons = Array.from(aside.querySelectorAll<HTMLButtonElement>('button'));
  buttons[0].focus();
  for (const [key, target] of [['ArrowDown', 1], ['End', 2], ['ArrowDown', 2], ['ArrowUp', 1], ['Home', 0], ['ArrowUp', 0]] as const) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(event);
    expect(document.activeElement).toBe(buttons[target]); expect(event.defaultPrevented).toBe(true);
    expect(view.state.selection.eq(selection)).toBe(true);
  }
  const event = new KeyboardEvent('keydown', { key: 'End', isComposing: true, bubbles: true, cancelable: true });
  buttons[0].dispatchEvent(event); expect(event.defaultPrevented).toBe(false); expect(document.activeElement).toBe(buttons[0]);
  buttons[1].click(); expect(view.hasFocus).toBe(true);
  expect(view.state.selection.main.head).toBe(original.indexOf('## 二'));
  expect(buttons[1].getAttribute('aria-current')).toBe('location');
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
});
it('retains outline focus through mapped heading updates without taking later form focus', () => {
  const { aside, source } = setup('# One\n\n## Two\n\nText\n');
  aside.querySelectorAll<HTMLButtonElement>('button')[1].focus();
  view.dispatch({ changes: { from: 0, insert: '# New\n\n' } });
  expect(document.activeElement).toBe(aside.querySelectorAll('button')[2]);
  expect(document.activeElement!.textContent).toBe('Two');
  undo(view); expect(document.activeElement).toBe(aside.querySelectorAll('button')[1]);
  const input = document.createElement('input'); document.body.append(input); input.focus();
  view.dispatch({ changes: { from: 0, insert: '# Next\n\n' } });
  expect(document.activeElement).toBe(input); undo(view);
  expect(source()).toBe('# One\n\n## Two\n\nText\n');
  aside.hidden = true; view.dispatch({ effects: refreshOutline.of(null) }); expect(aside.childElementCount).toBe(0);
  aside.hidden = false; view.dispatch({ effects: refreshOutline.of(null) });
  expect(aside.querySelectorAll('button')).toHaveLength(2); expect(document.activeElement).toBe(input);
});
it('uses the active table cell source position for the current outline section', () => {
  const original = '# First\n\n| A | B |\n|---|---|\n| x | y |\n\n# Last\n\nEnd';
  const { aside, source } = setup(original);
  expect(aside.querySelectorAll('button')[1].getAttribute('aria-current')).toBe('location');
  tableEditor(document.querySelector('.preview-table')!)!.begin(1, 1);
  expect(aside.querySelectorAll('button')[0].getAttribute('aria-current')).toBe('location');
  expect(aside.querySelectorAll('button')[1].hasAttribute('aria-current')).toBe(false);
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
});
it('defers outline navigation during composition and includes headings after parser completion', () => {
  const { aside, source } = setup('# Start\n\n' + 'paragraph\n\n'.repeat(800) + '# Last\n');
  const original = source(); const position = view.state.selection.main.head;
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  aside.querySelector<HTMLButtonElement>('button')!.click(); expect(view.state.selection.main.head).toBe(position);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  ensureSyntaxTree(view.state, view.state.doc.length, 1000); view.dispatch({});
  expect(Array.from(aside.querySelectorAll('button')).at(-1)?.textContent).toBe('Last'); expect(source()).toBe(original);
});
it('defers hidden outline content and refreshes it on show without a source or history edit', () => {
  const original = '# **Old**\n\nText', { aside, source } = setup(original);
  aside.hidden = true; view.dispatch({ effects: refreshOutline.of(null) }); expect(aside.childElementCount).toBe(0);
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ changes: { from: 4, to: 7, insert: '日本語' } }); expect(aside.childElementCount).toBe(0);
  const depth = undoDepth(view.state); aside.hidden = false; view.dispatch({ effects: refreshOutline.of(null) });
  expect(aside.querySelector('button')!.textContent).toBe('日本語'); expect(undoDepth(view.state)).toBe(depth);
  undo(view); expect(aside.querySelector('button')!.textContent).toBe('Old'); expect(source()).toBe(original);
});
