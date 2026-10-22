// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorSelection, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { livePreview, previewField } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { clickOffsetInNode } from '../../src/web/dom-coords';
import { TableEditor, tableCellField, tableEditor } from '../../src/web/table';
import { documentLanguage } from '../../src/web/document-language';

let view: EditorView | undefined;
afterEach(() => {
  view?.destroy();
  view = undefined;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

import { ensureSyntaxTree } from '@codemirror/language';

function createEditor(source: string) {
  const record = fromSource(source);
  let current = EditorState.create({
    doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length },
    extensions: [
      sourceExtensions(record),
      history(),
      documentLanguage(),
      livePreview,
    ],
  });
  ensureSyntaxTree(current, current.doc.length, 1000);
  current = current.update({}).state;
  view = new EditorView({ state: current, parent: document.body });
  return { editor: view, source: () => savedSource(view!.state.field(sourceField)) };
}

it('clickOffsetInNode calculates correct text offsets from caret APIs', () => {
  const container = document.createElement('div');
  container.innerHTML = '<p>Hello <b>wonderful</b> world!</p>';
  document.body.append(container);

  const boldText = container.querySelector('b')!.firstChild!;
  (document as any).caretRangeFromPoint = vi.fn().mockReturnValue({
    startContainer: boldText,
    startOffset: 3,
  });

  const offset = clickOffsetInNode(container, { x: 50, y: 10 });
  // "Hello " (6) + 3 ("won") = 9
  expect(offset).toBe(9);
});

it('places cursor near clicked text location when clicking inside inline-html preview widget', async () => {
  const original = 'Paragraph with <mark>styled text</mark> here.\n\nNext line';
  const { editor } = createEditor(original);

  await vi.waitFor(() => expect(document.querySelector('.preview-inline-html mark')).not.toBeNull());
  const widget = document.querySelector<HTMLElement>('.preview-inline-html')!;
  const mark = widget.querySelector('mark')!;

  (document as any).caretRangeFromPoint = vi.fn().mockReturnValue({
    startContainer: mark.firstChild,
    startOffset: 7, // after "styled "
  });

  const expectedPos = original.indexOf('styled text') + 7;
  vi.spyOn(editor, 'posAtCoords').mockReturnValue(expectedPos);

  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 120, clientY: 20 });
  mark.dispatchEvent(event);

  expect(document.querySelector('.preview-inline-html')).toBeNull();
  expect(editor.state.selection.main.head).toBe(expectedPos);
});

it('places cursor at click offset in table cell rather than index 0', async () => {
  const original = '| Column 1 | Column 2 |\n| --- | --- |\n| First cell | Second long value |\n';
  const { editor } = createEditor(original);

  const tableDOM = document.querySelector<HTMLElement>('.preview-table')!;
  expect(tableDOM).not.toBeNull();
  const table = tableEditor(tableDOM)!;

  const targetCell = tableDOM.querySelectorAll('td')[1]; // Second long value
  expect(targetCell).not.toBeNull();

  (document as any).caretRangeFromPoint = vi.fn().mockReturnValue({
    startContainer: targetCell.firstChild,
    startOffset: 7, // within "Second long value"
  });

  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 250, clientY: 40 });
  targetCell.dispatchEvent(event);

  expect(table.child).toBeDefined();
  expect(table.child!.state.selection.main.head).toBe(7);
});

it('ends table edit when clicking outside table in the editor', async () => {
  const original = '| Col 1 |\n| --- |\n| Val 1 |\n\nOutside paragraph here.\n';
  const { editor } = createEditor(original);

  const tableDOM = document.querySelector<HTMLElement>('.preview-table')!;
  const table = tableEditor(tableDOM)!;
  table.begin(1, 0);
  expect(table.child).toBeDefined();
  expect(editor.state.field(tableCellField, false)).not.toBeNull();

  // Create an outside element inside editor.contentDOM
  const outside = document.createElement('div');
  outside.className = 'cm-line';
  outside.textContent = 'Outside paragraph here.';
  editor.contentDOM.append(outside);

  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 10, clientY: 100 });
  outside.dispatchEvent(event);

  expect(editor.state.field(tableCellField, false)).toBeNull();
  expect(table.child).toBeUndefined();
});

it('ensures editor lines and preview widgets have zero margins to maintain height map accuracy', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const css = readFileSync(resolve(__dirname, '../../src/web/style.css'), 'utf8');

  // Verify cm-line has margin: 0
  expect(css).toMatch(/#app\s+\.cm-line\s*\{[^}]*margin:\s*0/);
  // Verify preview-widget has margin: 0
  expect(css).toMatch(/div\.preview-widget\s*\{[^}]*margin:\s*0/);
  // Verify preview-widget.preview-html has margin: 0
  expect(css).toMatch(/div\.preview-widget\.preview-html\s*\{[^}]*margin:\s*0/);
  // Verify preview-inline-html h1 and h2 have margin: 0
  expect(css).toMatch(/#app\s+\.preview-inline-html\s+h1\s*\{[^}]*margin:\s*0/);
  expect(css).toMatch(/#app\s+\.preview-inline-html\s+h2\s*\{[^}]*margin:\s*0/);
  // Verify md-h1 and md-h2 have margin: 0 and use padding instead
  expect(css).toMatch(/#app\s+\.md-h1\s*\{[^}]*margin:\s*0/);
  expect(css).toMatch(/#app\s+\.md-h2\s*\{[^}]*margin:\s*0/);
  // Verify preview-block-html-body p and details have margin: 0
  expect(css).toMatch(/\.preview-block-html-body\s+p\s*\{[^}]*margin:\s*0/);
  expect(css).toMatch(/\.preview-block-html-body\s+details\s*\{[^}]*margin:\s*0/);
});

