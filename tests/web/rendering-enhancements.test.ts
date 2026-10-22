// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { history } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewItems } from '../../src/web/preview';
import { fromSource, normalize, sourceExtensions, savedSource, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

let view: EditorView | undefined;
afterEach(() => {
  view?.destroy();
  view = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function create(source: string) {
  const record = fromSource(source), display = new Compartment();
  let state = EditorState.create({
    doc: normalize(record.raw),
    selection: { anchor: normalize(record.raw).length },
    extensions: [sourceExtensions(record), history(), documentLanguage(), display.of(livePreview)],
  });
  expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull();
  state = state.update({}).state;
  view = new EditorView({ state, parent: document.body });
  return { editor: view, display, source: () => savedSource(view!.state.field(sourceField)) };
}

it('renders HTML details, summary, center, and kbd blocks natively without isolated iframes', async () => {
  const source = '<details open>\n<summary>Details Summary</summary>\n<center>Centered Text</center>\n<p><kbd>Ctrl</kbd> + <kbd>C</kbd></p>\n</details>\n\nEnd';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-block-html')).not.toBeNull());

  const body = document.querySelector('.preview-block-html-body')!;
  expect(body.querySelector('details')).not.toBeNull();
  expect(body.querySelector('summary')!.textContent).toBe('Details Summary');
  expect(body.querySelector('center')!.textContent).toBe('Centered Text');
  expect(body.querySelectorAll('kbd')).toHaveLength(2);
  expect(document.querySelector('iframe')).toBeNull();
});

it('renders fenced code blocks cleanly without top or bottom bars and conceals fence marks', async () => {
  const source = '```typescript\nconst greeting: string = "hello";\n```\n\nEnd';
  const { editor } = create(source);
  // Cursor is at end of document, so code block is not selected
  await vi.waitFor(() => expect(document.querySelector('.md-code-block')).not.toBeNull());

  // Verify no redundant top/bottom header/footer bars are inserted
  expect(document.querySelector('.md-code-header')).toBeNull();
  expect(document.querySelector('.md-code-footer')).toBeNull();

  // Fence lines are collapsed to 0px without blank lines before and after the code
  const fenceLines = document.querySelectorAll('.cm-line.md-code-fence-hidden');
  expect(fenceLines.length).toBe(2);

  // Actual code lines have .md-code-line without redundant empty fence lines
  const codeLines = document.querySelectorAll('.cm-line.md-code-line');
  expect(codeLines.length).toBe(1);
  expect(codeLines[0].classList.contains('md-code-first')).toBe(true);
  expect(codeLines[0].classList.contains('md-code-last')).toBe(true);
  expect(codeLines[0].textContent).toContain('const greeting: string = "hello";');

  // Verify code type tab exists and displays language
  const codeTab = document.querySelector<HTMLElement>('.code-type-tab');
  expect(codeTab).not.toBeNull();
  const langInput = codeTab!.querySelector<HTMLInputElement>('.code-type-input');
  expect(langInput).not.toBeNull();
  expect(langInput!.value).toBe('typescript');

  // The code block has .md-code-block class and contains the code content
  const codeText = Array.from(document.querySelectorAll('.md-code-block')).map(el => el.textContent).join('\n');
  expect(codeText).toContain('const greeting: string = "hello";');

  // Selecting inside the code line does not reveal raw fence marks or move lines
  const greetingPos = source.indexOf('greeting');
  editor.dispatch({ selection: { anchor: greetingPos } });

  // Opening and closing fence lines still remain collapsed without moving content
  const codeLinesSelected = document.querySelectorAll('.cm-line.md-code-line');
  expect(codeLinesSelected.length).toBe(1);
  const fenceLinesSelected = document.querySelectorAll('.cm-line.md-code-fence-hidden');
  expect(fenceLinesSelected.length).toBe(2);

  // Code type tab is revealed when hovering mouse over code block line
  expect(codeTab!.classList.contains('visible')).toBe(false);
  codeLinesSelected[0].dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  expect(codeTab!.classList.contains('visible')).toBe(true);
  codeLinesSelected[0].dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }));
  expect(codeTab!.classList.contains('visible')).toBe(false);

  // Editing language input updates the document source
  langInput!.value = 'python';
  langInput!.dispatchEvent(new Event('input'));
  langInput!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  expect(editor.state.doc.sliceString(0, 15)).toContain('```python');
  // Author code content is preserved and not overwritten
  expect(editor.state.doc.toString()).toContain('const greeting: string = "hello";');
});

it('locks column widths and provides context menu on table cell right-click', async () => {
  const source = '| Column A | Column B |\n| --- | --- |\n| Cell 1 | Cell 2 |\n\nEnd';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());

  const tableWidget = document.querySelector<HTMLElement>('.preview-table')!;
  const table = tableEditor(tableWidget)!;
  const targetCell = tableWidget.querySelector<HTMLElement>('td[data-row="1"][data-column="0"]')!;

  // Mock getBoundingClientRect with positive widths
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    return { width: 120, height: 30, top: 100, bottom: 130, left: 50, right: 170, x: 50, y: 100, toJSON: () => ({}) };
  };

  try {
    // Right click cell
    targetCell.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 80,
      clientY: 110,
    }));

    // Context menu should appear
    const menu = document.querySelector<HTMLElement>('.table-context-menu');
    expect(menu).not.toBeNull();

    const items = menu!.querySelectorAll('.table-context-item');
    expect(items.length).toBe(9); // 2 row, 2 col, 2 delete, copy, prettify, delete table
    expect(items[0].querySelector('.table-context-label')!.textContent).toBe('Add Row Above');
    expect(items[1].querySelector('.table-context-label')!.textContent).toBe('Add Row Below');

    // Table should have tableLayout fixed while editing
    const htmlTable = tableWidget.querySelector('table')!;
    expect(htmlTable.style.tableLayout).toBe('fixed');
    const cols = htmlTable.querySelectorAll('colgroup col');
    expect(cols.length).toBeGreaterThan(0);

    // Clicking Add Row Below
    (items[1] as HTMLButtonElement).click();

    // Menu dismissed
    expect(document.querySelector('.table-context-menu')).toBeNull();
  } finally {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  }
});

it('shows floating toolbar on table cell left click and supports resize popover', async () => {
  const source = '| Column A | Column B |\n| --- | --- |\n| Cell 1 | Cell 2 |\n\nEnd';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());

  const tableWidget = document.querySelector<HTMLElement>('.preview-table')!;
  const table = tableEditor(tableWidget)!;
  const floatingBar = tableWidget.querySelector<HTMLElement>('.table-floating-bar')!;
  expect(floatingBar).not.toBeNull();
  expect(floatingBar.hidden).toBe(true);

  // Click on cell (row 1, col 0)
  const targetCell = tableWidget.querySelector<HTMLElement>('td[data-row="1"][data-column="0"]')!;
  targetCell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 60, clientY: 100 }));

  // Floating bar should now be visible
  expect(floatingBar.hidden).toBe(false);
  expect(floatingBar.querySelector('.table-bar-resize')).not.toBeNull();
  expect(floatingBar.querySelector('.table-bar-align-left')).not.toBeNull();
  expect(floatingBar.querySelector('.table-bar-align-center')).not.toBeNull();
  expect(floatingBar.querySelector('.table-bar-align-right')).not.toBeNull();
  expect(floatingBar.querySelector('.table-bar-delete')).not.toBeNull();

  // Click resize button
  const resizeBtn = floatingBar.querySelector<HTMLButtonElement>('.table-bar-resize')!;
  resizeBtn.click();

  const popover = tableWidget.querySelector<HTMLElement>('.table-resize-popover')!;
  expect(popover).not.toBeNull();
  const boxes = popover.querySelectorAll('.table-resize-box');
  expect(boxes.length).toBe(60); // 6 cols x 10 rows

  const colInput = popover.querySelector<HTMLInputElement>('.col-input')!;
  const rowInput = popover.querySelector<HTMLInputElement>('.row-input')!;
  expect(colInput.value).toBe('2');
  expect(rowInput.value).toBe('2');

  // Click on box 2 x 3 (col index 2 = 3 cols, row index 2 = 3 rows)
  const box3x3 = popover.querySelector<HTMLElement>('.table-resize-box[data-row="2"][data-col="2"]')!;
  box3x3.click();

  // Popover should close
  expect(tableWidget.querySelector('.table-resize-popover')).toBeNull();
});

it('locks row heights and retains fixed table layout across cell switches', async () => {
  const source = '| Column A | Column B |\n| --- | --- |\n| Row 1 Cell 1 | Row 1 Cell 2 |\n| Row 2 Cell 1 | Row 2 Cell 2 |\n\nEnd';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());

  const tableWidget = document.querySelector<HTMLElement>('.preview-table')!;
  const htmlTable = tableWidget.querySelector('table')!;

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    return { width: 150, height: 41, top: 100, bottom: 141, left: 50, right: 200, x: 50, y: 100, toJSON: () => ({}) };
  };

  try {
    const cellRow1 = tableWidget.querySelector<HTMLElement>('td[data-row="1"][data-column="0"]')!;
    cellRow1.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 60, clientY: 110 }));

    expect(htmlTable.style.tableLayout).toBe('fixed');
    const cols = htmlTable.querySelectorAll('colgroup col');
    expect(cols.length).toBe(2);

    const rows = htmlTable.querySelectorAll('tr');
    expect(rows.length).toBe(3); // header + 2 data rows
    rows.forEach(tr => {
      expect(tr.style.height).toBe('41px');
    });

    // Switch to row 2
    const cellRow2 = tableWidget.querySelector<HTMLElement>('td[data-row="2"][data-column="0"]')!;
    cellRow2.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 60, clientY: 150 }));

    const updatedTable = tableWidget.querySelector('table')!;
    expect(updatedTable.style.tableLayout).toBe('fixed');
    const updatedCols = updatedTable.querySelectorAll('colgroup col');
    expect(updatedCols.length).toBe(2);
    const updatedRows = updatedTable.querySelectorAll('tr');
    updatedRows.forEach(tr => {
      expect(tr.style.height).toBe('41px');
    });
  } finally {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  }
});

it('does not expand row height when clicking cell with inline code backticks', async () => {
  const source = '| Platform | Packages |\n| --- | --- |\n| Linux | `.deb`, AppImage, `.tar.gz` |\n| Windows | .msi, .zip |\n| macOS | zipped .app bundle |\n\nEnd';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());

  const tableWidget = document.querySelector<HTMLElement>('.preview-table')!;
  const htmlTable = tableWidget.querySelector('table')!;

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function() {
    return { width: 200, height: 38, top: 100, bottom: 138, left: 50, right: 250, x: 50, y: 100, toJSON: () => ({}) };
  };

  try {
    const packagesCell = tableWidget.querySelector<HTMLElement>('td[data-row="1"][data-column="1"]')!;
    packagesCell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 120, clientY: 110 }));

    expect(htmlTable.style.tableLayout).toBe('fixed');
    const row1 = htmlTable.querySelectorAll('tr')[1];
    expect(row1.style.height).toBe('38px');
    expect(packagesCell.style.height).toBe('38px');
    expect(packagesCell.style.maxHeight).toBe('38px');

    const scroller = packagesCell.querySelector<HTMLElement>('.cm-scroller');
    expect(scroller).not.toBeNull();
  } finally {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  }
});

it('renders compact spacing on blank lines outside code blocks', async () => {
  const source = 'Paragraph 0\n\nParagraph 1\n\n| Col A | Col B |\n| --- | --- |\n| 1 | 2 |\n\n```python\ndef foo():\n    pass\n\ndef bar():\n    pass\n```\n\nParagraph 2';
  const { editor } = create(source);
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());

  // Blank lines between paragraphs receive md-blank-line (Typora 0.8em spacing)
  const paragraphBlankLines = document.querySelectorAll('.cm-line.md-blank-line');
  expect(paragraphBlankLines.length).toBe(2);

  // Blank lines adjacent to table receive md-blank-line-block (collapsed to eliminate redundant space)
  const tableAdjacentBlankLines = document.querySelectorAll('.cm-line.md-blank-line-block');
  expect(tableAdjacentBlankLines.length).toBe(2);

  // Blank lines inside code blocks do NOT receive md-blank-line or md-blank-line-block
  const codeLines = document.querySelectorAll('.cm-line.md-code-line');
  expect(codeLines.length).toBe(5);
  Array.from(codeLines).forEach(cl => {
    expect(cl.classList.contains('md-blank-line')).toBe(false);
    expect(cl.classList.contains('md-blank-line-block')).toBe(false);
  });

  // Clicking on a blank line to edit it removes compact/collapse classes so line height is normal
  const line2 = editor.state.doc.line(2);
  editor.dispatch({
    selection: { anchor: line2.from }
  });
  expect(document.querySelectorAll('.cm-line.md-blank-line').length).toBe(paragraphBlankLines.length - 1);

  const line4 = editor.state.doc.line(4);
  editor.dispatch({
    selection: { anchor: line4.from }
  });
  expect(document.querySelectorAll('.cm-line.md-blank-line-block').length).toBe(tableAdjacentBlankLines.length - 1);

  // Moving cursor away restores compact rendering
  editor.dispatch({
    selection: { anchor: editor.state.doc.length }
  });
  expect(document.querySelectorAll('.cm-line.md-blank-line').length).toBe(paragraphBlankLines.length);
  expect(document.querySelectorAll('.cm-line.md-blank-line-block').length).toBe(tableAdjacentBlankLines.length);

  // Typing on a blank line removes decoration
  editor.dispatch({
    changes: { from: line2.from, to: line2.to, insert: 'Now not blank' }
  });
  expect(document.querySelectorAll('.cm-line.md-blank-line').length).toBe(paragraphBlankLines.length - 1);
});


