// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { history, undo } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { livePreview, collectPreview } from '../../src/web/preview';
import { exitBlockDown, markdownBackspace, markdownReturn } from '../../src/web/commands';
import { mathBlockSyntax } from '../../src/web/math-block';
import { fromSource, normalize, sourceExtensions } from '../../src/web/source';

let view: EditorView | undefined;
afterEach(() => { view?.destroy(); view = undefined; document.body.replaceChildren(); });

function createEditor(doc: string, anchor = doc.length) {
  view?.destroy(); document.body.replaceChildren();
  const record = fromSource(doc);
  const state = EditorState.create({ doc: normalize(record.raw), selection: { anchor },
    extensions: [history(), sourceExtensions(record), markdown({ base: markdownLanguage, extensions: [mathBlockSyntax] }), livePreview] });
  view = new EditorView({ state, parent: document.body });
  return view;
}
const names = (editor: EditorView) => {
  const result: string[] = [];
  syntaxTree(editor.state).topNode.cursor().iterate(node => { result.push(node.name); });
  return result;
};

it('parses a closed fence as one block, including blank lines inside', () => {
  const editor = createEditor('$$\n\nx\n\n$$\n\ntext', 0);
  expect(names(editor).filter(name => name === 'MathBlock')).toHaveLength(1);
  expect(names(editor).filter(name => name === 'Paragraph')).toHaveLength(1);
});

it('keeps an unclosed fence as a paragraph', () => {
  expect(names(createEditor('$$\ntext')).includes('MathBlock')).toBe(false);
});

it('plans a widget, code-style lines, and an Equation tab', () => {
  const editor = createEditor('$$\nx\n$$\n\ntext', 12);
  const items = collectPreview(editor.state, syntaxTree(editor.state), 0);
  expect(items.find(item => item.kind === 'math')).toMatchObject({ from: 0, to: 7, source: 'x', block: true });
  expect(items.filter(item => item.className?.includes('md-math-line'))).toHaveLength(1);
  expect(items.filter(item => item.className?.includes('md-code-fence-hidden'))).toHaveLength(2);
  expect(items.some(item => item.mathTab)).toBe(true);
});

it('shows a placeholder for an empty equation and the tab only when source shows', () => {
  const editor = createEditor('$$\n\n$$\n\ntext');
  expect(editor.dom.querySelector('.preview-math-empty')?.textContent).toBe('Empty equation');
  expect(editor.dom.querySelector('.math-type-tab')).toBeNull();
  editor.dispatch({ selection: { anchor: 3 } });
  expect(editor.dom.querySelector('.preview-math')).toBeNull();
  expect(editor.dom.querySelectorAll('.md-code-fence-hidden')).toHaveLength(2);
  expect(editor.dom.querySelector('.math-type-label')?.textContent).toBe('Equation');
});

it('closes an unclosed fence on Return', () => {
  const editor = createEditor('$$');
  expect(markdownReturn(editor)).toBe(true);
  expect(editor.state.doc.toString()).toBe('$$\n\n$$');
  expect(editor.state.selection.main.head).toBe(3);
  expect(names(editor).includes('MathBlock')).toBe(true);
});

it('does not close a fence that already has a closing fence', () => {
  const editor = createEditor('$$\nx\n$$', 2);
  markdownReturn(editor);
  expect(editor.state.doc.toString()).toBe('$$\n\nx\n$$');
});

it('deletes an empty equation block on Backspace', () => {
  const editor = createEditor('$$\n\n$$', 3);
  expect(markdownBackspace(editor)).toBe(true);
  expect(editor.state.doc.toString()).toBe('');
  undo(editor);
  expect(editor.state.doc.toString()).toBe('$$\n\n$$');
});

it('keeps Backspace for an equation block with content', () => {
  expect(markdownBackspace(createEditor('$$\nx\n\n$$', 4))).toBe(false);
});

it('adds a line below a final equation block on ArrowDown from the last formula line', () => {
  const editor = createEditor('$$\nx\n$$', 4);
  expect(exitBlockDown(editor)).toBe(true);
  expect(editor.state.doc.toString()).toBe('$$\nx\n$$\n');
  expect(exitBlockDown(createEditor('$$\nx\ny\n$$', 1))).toBe(false);
});

it('renders a horizontal rule until the cursor reaches it', () => {
  const editor = createEditor('text\n\n---\n\nmore', 0);
  expect(editor.dom.querySelectorAll('.preview-rule')).toHaveLength(1);
  editor.dispatch({ selection: { anchor: 7 } });
  expect(editor.dom.querySelector('.preview-rule')).toBeNull();
});

it('keeps an underline heading marker out of the rule route', () => {
  expect(createEditor('Title\n---\n\ntext', 12).dom.querySelector('.preview-rule')).toBeNull();
});
