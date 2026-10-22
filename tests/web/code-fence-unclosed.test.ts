// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo, redo } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { livePreview, collectPreview, previewItems } from '../../src/web/preview';
import { markdownReturn } from '../../src/web/commands';
import { fromSource, normalize, sourceExtensions, savedSource, sourceField } from '../../src/web/source';

let view: EditorView | undefined;
afterEach(() => {
  view?.destroy();
  view = undefined;
  document.body.replaceChildren();
});

function createEditor(doc: string, anchor = doc.length, rendered = true) {
  view?.destroy();
  document.body.replaceChildren();
  const record = fromSource(doc);
  const state = EditorState.create({
    doc: normalize(record.raw),
    selection: { anchor },
    extensions: [
      history(),
      sourceExtensions(record),
      markdown({ base: markdownLanguage }),
      rendered ? livePreview : [],
    ],
  });
  view = new EditorView({ state, parent: document.body });
  return view;
}

it('renders unclosed fence line as inline code and does not format following text as code block', () => {
  const content = '```\nParagraph text following fence.';
  const editor = createEditor(content);
  const tree = syntaxTree(editor.state);
  const items = collectPreview(editor.state, tree, 0);

  // Should have an inline md-code item on the fence line
  const fenceItem = items.find(item => item.className === 'md-code' && item.from === 0 && item.to === 3);
  expect(fenceItem).toBeDefined();

  // Following line must NOT have md-code-line or md-code-fence-hidden
  const hiddenLines = items.filter(item => item.className?.includes('md-code-fence-hidden'));
  expect(hiddenLines).toHaveLength(0);

  const codeLines = items.filter(item => item.className?.includes('md-code-line'));
  expect(codeLines).toHaveLength(0);

  // No codeTab widget should be present for unclosed fence
  const codeTabs = items.filter(item => item.codeTab);
  expect(codeTabs).toHaveLength(0);
});

it('renders unclosed fence with language info as inline code', () => {
  const content = '```python\nLine 2 text';
  const editor = createEditor(content);
  const tree = syntaxTree(editor.state);
  const items = collectPreview(editor.state, tree, 0);

  const fenceItem = items.find(item => item.className === 'md-code' && item.from === 0 && item.to === 9);
  expect(fenceItem).toBeDefined();

  const codeLines = items.filter(item => item.className?.includes('md-code-line'));
  expect(codeLines).toHaveLength(0);
});

it('auto-closes unclosed fence on Return and places cursor inside', () => {
  const editor = createEditor('```', 3);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```\n\n```');
  expect(editor.state.selection.main.head).toBe(4); // On the empty line between fences
});

it('auto-closes fence with language on Return and places cursor inside', () => {
  const editor = createEditor('```typescript', 13);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```typescript\n\n```');
  expect(editor.state.selection.main.head).toBe(14); // On the empty line between fences
});

it('auto-closes indented fence preserving indentation', () => {
  const editor = createEditor('  ```python', 11);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('  ```python\n  \n  ```');
  expect(editor.state.selection.main.head).toBe(14); // After the 2 spaces on line 2
});

it('auto-closes tilde fence with matching tildes', () => {
  const editor = createEditor('~~~~ruby', 8);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('~~~~ruby\n\n~~~~');
  expect(editor.state.selection.main.head).toBe(9);
});

it('renders closed code block with proper code block decorations after auto-closing', () => {
  const editor = createEditor('```js', 5);
  markdownReturn(editor);
  expect(editor.state.doc.toString()).toBe('```js\n\n```');

  const tree = syntaxTree(editor.state);
  const items = collectPreview(editor.state, tree, 0);

  // Closed code block should have codeTab
  const codeTab = items.find(item => item.codeTab);
  expect(codeTab).toBeDefined();
  expect(codeTab?.codeTab?.language).toBe('js');
});

it('does not duplicate closing fence when Return is pressed inside an already closed code block', () => {
  const editor = createEditor('```js\nconsole.log(1);\n```', '```js\nconsole.log(1);'.length);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```js\nconsole.log(1);\n\n```');
});

it('auto-closes unclosed fence when typing in front of existing paragraphs without corrupting them', () => {
  const editor = createEditor('Paragraph 1\n\n```\nParagraph 2', 'Paragraph 1\n\n```'.length);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('Paragraph 1\n\n```\n\n```\nParagraph 2');
  expect(editor.state.selection.main.head).toBe('Paragraph 1\n\n```\n'.length);
});

it('does not auto-close fence when pressing Return mid-line and preserves trailing content', () => {
  // Cursor placed between "typescript" and "extra"
  const text = '```typescript extra';
  const editor = createEditor(text, '```typescript'.length);
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```typescript\n extra');
});

it('does not auto-close fence when Return is pressed with a non-empty selection', () => {
  // Select "python" in "```python"
  const editor = createEditor('```python', 3);
  editor.dispatch({ selection: { anchor: 3, head: 9 } });
  const handled = markdownReturn(editor);
  expect(handled).toBe(true);
  expect(editor.state.doc.toString()).toBe('```\n');
});

it('keeps typed backticks and the caret on code lines with exact history', () => {
  const original = '```text\n\nTail 😀\n```\n\nAfter';
  const editor = createEditor(original, 8);
  for (const character of '````') {
    const before = editor.state.doc.toString(), selection = editor.state.selection;
    editor.dispatch(editor.state.update(editor.state.replaceSelection(character), { userEvent: 'input.type' }));
    const after = editor.state.doc.toString(), caret = editor.state.selection.main.head;
    const items = previewItems(editor.state);
    expect(items.some(item => item.line && item.className?.includes('md-code-line') &&
      item.from <= caret && item.to >= caret)).toBe(true);
    expect(items.filter(item => item.codeTab)).toHaveLength(1);
    expect(after).toContain('\nTail 😀\n');
    expect(after).toMatch(/\n\nAfter$/);
    expect(undo(editor)).toBe(true);
    expect(editor.state.doc.toString()).toBe(before);
    expect(editor.state.selection.eq(selection)).toBe(true);
    expect(redo(editor)).toBe(true);
    expect(editor.state.doc.toString()).toBe(after);
    expect(editor.state.selection.main.head).toBe(caret);
  }
  expect(editor.state.doc.toString()).toBe('`````text\n````\nTail 😀\n`````\n\nAfter');
});

it('keeps pasted fences literal and preserves BOM and CRLF source records', () => {
  const original = '\uFEFF  ~~~text\r\n  \r\n  ~~~\r\n\r\nAfter';
  const editor = createEditor(original, 12);
  editor.dispatch(editor.state.update(editor.state.replaceSelection('~~~~'), { userEvent: 'input.paste' }));
  expect(savedSource(editor.state.field(sourceField))).toBe('\uFEFF  ~~~~~text\r\n  ~~~~\r\n  ~~~~~\r\n\r\nAfter');
  undo(editor);
  expect(savedSource(editor.state.field(sourceField))).toBe(original);
  redo(editor);
  expect(previewItems(editor.state).filter(item => item.codeTab)).toHaveLength(1);
});

it('leaves source-mode input and direct fence edits under user control', () => {
  const source = createEditor('```\n\n```', 4, false);
  source.dispatch(source.state.update(source.state.replaceSelection('```'), { userEvent: 'input.type' }));
  expect(source.state.doc.toString()).toBe('```\n```\n```');
  const editor = createEditor('```\ncode\n```', 3);
  editor.dispatch(editor.state.update(editor.state.replaceSelection('`'), { userEvent: 'input.type' }));
  expect(editor.state.doc.toString()).toBe('````\ncode\n```');
});

