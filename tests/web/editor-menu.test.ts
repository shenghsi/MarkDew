// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo } from '@codemirror/commands';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { livePreview } from '../../src/web/preview';
import { mathBlockSyntax } from '../../src/web/math-block';
import { fromSource, normalize, sourceExtensions } from '../../src/web/source';
import { currentFormat, insertFrontMatter, insertHorizontalLine, insertLinkReference, insertParagraph,
  insertTableOfContents, toggleLines } from '../../src/web/insert-commands';
import { codeBlock } from '../../src/web/code-block-command';
import { copySelection, cutSelection, deleteSelection, markdownToHtml, markdownToPlainText, pasteText } from '../../src/web/copy-as';
import { editorMenu } from '../../src/web/editor-menu';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); vi.restoreAllMocks(); });

function editor(doc: string, anchor = doc.length, head = anchor) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(doc);
  const state = EditorState.create({ doc: normalize(record.raw), selection: { anchor, head },
    extensions: [history(), sourceExtensions(record), livePreview,
      yamlFrontmatter({ content: markdown({ base: markdownLanguage, extensions: [mathBlockSyntax], addKeymap: false }) })] });
  view = new EditorView({ state, parent: document.body });
  return view;
}
const text = () => view!.state.doc.toString();

it('toggles quote and list markers on every selected line', () => {
  const v = editor('one\ntwo\nthree', 0, 13);
  expect(toggleLines(v, 'bullet')).toBeNull();
  expect(text()).toBe('- one\n- two\n- three');
  toggleLines(v, 'ordered');
  expect(text()).toBe('1. one\n2. two\n3. three');
  toggleLines(v, 'task');
  expect(text()).toBe('- [ ] one\n- [ ] two\n- [ ] three');
  toggleLines(v, 'task');
  expect(text()).toBe('one\ntwo\nthree');
  toggleLines(v, 'quote');
  expect(text()).toBe('> one\n> two\n> three');
  toggleLines(v, 'quote');
  expect(text()).toBe('one\ntwo\nthree');
  undo(v);
  expect(text()).toBe('> one\n> two\n> three');
});

it('marks a blank line and refuses code blocks', () => {
  expect(toggleLines(editor('', 0), 'bullet')).toBeNull();
  expect(text()).toBe('- ');
  expect(toggleLines(editor('```\ncode\n```', 6), 'quote')).toBe('Edit this block as source.');
  expect(text()).toBe('```\ncode\n```');
});

it('reports the current heading level', () => {
  expect(currentFormat(editor('## Title\n\ntext', 3))).toBe('h2');
  expect(currentFormat(editor('## Title\n\ntext', 12))).toBe('paragraph');
});

it('inserts a horizontal line as its own block', () => {
  const v = editor('text\n\nmore', 2);
  expect(insertHorizontalLine(v)).toBeNull();
  expect(text()).toBe('text\n\n---\n\nmore');
  expect(v.state.selection.main.head).toBe(9);
});

it('inserts a table of contents from the headings', () => {
  const v = editor('# One\n\n## Two\n\n## Two\n\ntext', 24);
  expect(insertTableOfContents(v)).toBeNull();
  expect(text()).toBe('# One\n\n## Two\n\n## Two\n\ntext\n\n- [One](#one)\n  - [Two](#two)\n  - [Two](#two-1)');
  expect(insertTableOfContents(editor('text'))).toBe('Add a heading before you insert a table of contents.');
});

it('inserts front matter once', () => {
  const v = editor('# Body', 0);
  expect(insertFrontMatter(v)).toBeNull();
  expect(text()).toBe('---\n\n---\n\n# Body');
  expect(v.state.selection.main.head).toBe(4);
  expect(insertFrontMatter(v)).toBe('This document already has front matter.');
});

it('inserts a link reference and its definition', () => {
  const v = editor('See docs here\n\n[1]: https://a.example', 4, 8);
  expect(insertLinkReference(v)).toBeNull();
  expect(text()).toBe('See [docs][2] here\n\n[1]: https://a.example\n\n[2]: ');
  expect(v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to)).toBe('docs');
});

it('adds an empty paragraph before and after a block', () => {
  const v = editor('# Title\n\ntext', 2);
  expect(insertParagraph(v, 'before')).toBeNull();
  expect(text()).toBe('\n\n# Title\n\ntext');
  expect(v.state.selection.main.head).toBe(0);
  const w = editor('text', 2);
  insertParagraph(w, 'after');
  expect(text()).toBe('text\n\n');
  expect(w.state.selection.main.head).toBe(6);
});

it('wraps selected lines in an equation block', () => {
  const v = editor('x + y', 0, 5);
  expect(codeBlock(v, 'math')).toBeNull();
  expect(text()).toBe('$$\nx + y\n$$');
});

it('converts Markdown to HTML and plain text', () => {
  expect(markdownToHtml('**bold** and `code`')).toBe('<p><strong>bold</strong> and <code>code</code></p>');
  expect(markdownToPlainText('# Title\n\n- **one**\n- two')).toBe('Title\n\none\ntwo');
});

it('copies, cuts, deletes, and pastes through the clipboard', async () => {
  let clip = '';
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async (value: string) => { clip = value; }, readText: async () => clip } });
  const v = editor('**bold** text', 0, 8);
  expect(await copySelection(v, 'markdown')).toBeNull(); expect(clip).toBe('**bold**');
  await copySelection(v, 'html'); expect(clip).toBe('<p><strong>bold</strong></p>');
  await copySelection(v, 'plain'); expect(clip).toBe('bold');
  expect(await cutSelection(v)).toBeNull(); expect(text()).toBe(' text'); expect(clip).toBe('**bold**');
  v.dispatch({ selection: { anchor: 5 } });
  expect(await pasteText(v)).toBeNull(); expect(text()).toBe(' text**bold**');
  v.dispatch({ selection: { anchor: 0, head: 5 } });
  expect(deleteSelection(v)).toBeNull(); expect(text()).toBe('**bold**');
  expect(await copySelection(editor('abc', 1), 'raw')).toBe('Select text to copy.');
});

it('opens the menu on right click and runs an entry', () => {
  const v = editor('one', 0, 3);
  vi.spyOn(v, 'posAtCoords').mockReturnValue(null); // jsdom has no layout
  const reports: string[] = [];
  const dispose = editorMenu(v, { allowed: () => true, report: message => reports.push(message), openLink: () => {}, openImage: () => {} });
  v.contentDOM.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
  const menu = document.querySelector('.editor-context-menu')!;
  expect(menu).not.toBeNull();
  expect(Array.from(menu.querySelectorAll('.menu-icons button')).map(button => button.getAttribute('aria-label')))
    .toEqual(['Cut', 'Copy', 'Paste', 'Delete', 'Bold', 'Italic', 'Inline Code', 'Link', 'Quote', 'Ordered List', 'Bullet List', 'Task List']);
  expect(Array.from(menu.querySelectorAll(':scope > .menu-item > .menu-label')).map(label => label.textContent))
    .toEqual(['Copy / Paste As...', 'Paragraph', 'Insert']);
  const insert = Array.from(menu.querySelectorAll<HTMLElement>(':scope > .menu-item')).find(item => item.textContent!.startsWith('Insert'))!;
  insert.dispatchEvent(new MouseEvent('mouseenter'));
  expect(insert.classList.contains('open')).toBe(true);
  insert.dispatchEvent(new MouseEvent('mouseleave'));
  expect(insert.classList.contains('open')).toBe(false);
  menu.querySelector<HTMLButtonElement>('button[aria-label="Bullet List"]')!.click();
  expect(text()).toBe('- one');
  expect(document.querySelector('.editor-context-menu')).toBeNull();
  v.contentDOM.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(document.querySelector('.editor-context-menu')).toBeNull();
  dispose();
});

it('does not open the menu when commands are blocked', () => {
  const v = editor('one');
  editorMenu(v, { allowed: () => false, report: () => {}, openLink: () => {}, openImage: () => {} });
  v.contentDOM.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  expect(document.querySelector('.editor-context-menu')).toBeNull();
});
