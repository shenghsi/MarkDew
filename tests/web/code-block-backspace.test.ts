// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo, redo } from '@codemirror/commands';
import { livePreview } from '../../src/web/preview';
import { exitBlockDown, markdownBackspace, markdownReturn } from '../../src/web/commands';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

let view: EditorView | undefined;
afterEach(() => {
  view?.destroy();
  view = undefined;
  document.body.replaceChildren();
});

function createEditor(doc: string, anchor = doc.length, isLive = true) {
  view?.destroy();
  document.body.replaceChildren();
  const record = fromSource(doc);
  const extensions = [
    history(),
    sourceExtensions(record),
    markdown({ base: markdownLanguage }),
  ];
  if (isLive) extensions.push(livePreview);
  const state = EditorState.create({
    doc: normalize(record.raw),
    selection: { anchor },
    extensions,
  });
  view = new EditorView({ state, parent: document.body });
  return view;
}

it('deletes whole empty code block on backspace in rendered mode', () => {
  const content = '```\n\n```';
  const editor = createEditor(content, 4); // On the empty line between fences
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes whole empty code block with language on backspace', () => {
  const content = '```typescript\n\n```';
  const editor = createEditor(content, 14); // On the empty line between fences
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes whole empty code block created via return on unclosed fence', () => {
  const editor = createEditor('```js', 5);
  markdownReturn(editor);
  expect(editor.state.doc.toString()).toBe('```js\n\n```');
  expect(editor.state.selection.main.head).toBe(6);

  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes whole empty indented code block on backspace', () => {
  const content = '  ```python\n  \n  ```';
  const editor = createEditor(content, 14); // After the 2 spaces on line 2
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes whole empty tilde code block on backspace', () => {
  const content = '~~~~ruby\n\n~~~~';
  const editor = createEditor(content, 9);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes empty code block between paragraphs cleanly', () => {
  const content = 'Paragraph 1\n\n```js\n\n```\n\nParagraph 2';
  const cursor = 'Paragraph 1\n\n```js\n'.length;
  const editor = createEditor(content, cursor);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('Paragraph 1\n\n\nParagraph 2');
  expect(editor.state.selection.main.head).toBe('Paragraph 1\n\n'.length);
});

it('deletes empty code block at the start of document with content following', () => {
  const content = '```js\n\n```\nParagraph 2';
  const editor = createEditor(content, 6);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('Paragraph 2');
  expect(editor.state.selection.main.head).toBe(0);
});

it('deletes empty code block at the end of document with content preceding', () => {
  const content = 'Paragraph 1\n\n```js\n\n```';
  const cursor = 'Paragraph 1\n\n```js\n'.length;
  const editor = createEditor(content, cursor);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('Paragraph 1\n\n');
  expect(editor.state.selection.main.head).toBe('Paragraph 1\n\n'.length);
});

it('does not delete whole block in source code mode (not rendered mode)', () => {
  const content = '```js\n\n```';
  const editor = createEditor(content, 6, false); // isLive = false -> source mode
  const handled = markdownBackspace(editor);
  expect(handled).toBe(false);
  expect(editor.state.doc.toString()).toBe('```js\n\n```');
});

it('does not delete whole block when there is code inside the code block', () => {
  const content = '```js\nconsole.log("hello");\n```';
  const cursor = '```js\nconsole.log'.length;
  const editor = createEditor(content, cursor);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(false);
  expect(editor.state.doc.toString()).toBe('```js\nconsole.log("hello");\n```');
});

it('prevents deleting into hidden opening fence when cursor is at start of code line with content', () => {
  const content = '```js\nconsole.log("hello");\n```';
  const cursor = '```js\n'.length;
  const editor = createEditor(content, cursor);
  const handled = markdownBackspace(editor);
  // Consumed to protect hidden opening fence from corruption
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```js\nconsole.log("hello");\n```');
});

it('does not delete whole block when selection is non-empty', () => {
  const content = '```js\n\n```';
  const editor = createEditor(content, 6);
  editor.dispatch({ selection: { anchor: 6, head: 7 } });
  const handled = markdownBackspace(editor);
  expect(handled).toBe(false);
  expect(editor.state.doc.toString()).toBe('```js\n\n```');
});

it('does not delete block when fence is unclosed', () => {
  const content = '```js\nParagraph';
  const editor = createEditor(content, 6);
  const handled = markdownBackspace(editor);
  expect(handled).toBe(false);
  expect(editor.state.doc.toString()).toBe('```js\nParagraph');
});

it('allows undo and redo after deleting empty code block', () => {
  const content = '```typescript\n\n```';
  const editor = createEditor(content, 14);
  markdownBackspace(editor);
  expect(editor.state.doc.toString()).toBe('');
  expect(savedSource(editor.state.field(sourceField))).toBe('');

  undo(editor);
  expect(editor.state.doc.toString()).toBe('```typescript\n\n```');
  expect(savedSource(editor.state.field(sourceField))).toBe('```typescript\n\n```');

  redo(editor);
  expect(editor.state.doc.toString()).toBe('');
  expect(savedSource(editor.state.field(sourceField))).toBe('');
});

it('adds a line below a code block at the end of the document on ArrowDown', () => {
  const editor = createEditor('```js\ncode\n```', 10);
  expect(exitBlockDown(editor)).toBe(true);
  expect(editor.state.doc.toString()).toBe('```js\ncode\n```\n');
  expect(editor.state.selection.main.head).toBe(15);
  undo(editor);
  expect(editor.state.doc.toString()).toBe('```js\ncode\n```');
});

it('keeps ArrowDown for code blocks that are not last or not on the last line', () => {
  expect(exitBlockDown(createEditor('```js\na\nb\n```', 7))).toBe(false);
  expect(exitBlockDown(createEditor('```js\na\n```\ntext', 7))).toBe(false);
});
