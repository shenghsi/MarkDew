// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { changeHTMLTable } from '../../src/web/html-table-commands';
const source = '<table title="test"><tbody><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>';
function table(html: string) { const box = document.createElement('div'); box.innerHTML = html; return box.querySelector('table')!; }
it('merges right and splits without losing content or table attributes', () => {
  const merged = changeHTMLTable(source, 0, 0, 'merge-right')!;
  expect(table(merged).rows[0].cells[0].colSpan).toBe(2);
  expect(table(merged).rows[0].cells[0].innerHTML).toBe('A<br>B');
  const split = table(changeHTMLTable(merged, 0, 0, 'split')!);
  expect(split.rows[0].cells.length).toBe(2);
  expect(split.title).toBe('test');
});
it('inserts and deletes rows through a rowspan', () => {
  const merged = changeHTMLTable(source, 0, 0, 'merge-down')!;
  const inserted = changeHTMLTable(merged, 0, 1, 'row-below')!;
  expect(table(inserted).rows.length).toBe(3);
  expect(table(inserted).rows[0].cells[0].rowSpan).toBe(3);
  const deleted = table(changeHTMLTable(merged, 0, 0, 'delete-row')!);
  expect(deleted.rows.length).toBe(1);
  expect(deleted.rows[0].cells[0].textContent).toBe('AC');
  expect(deleted.rows[0].cells[0].rowSpan).toBe(1);
});
it('inserts and deletes columns through a colspan', () => {
  const merged = changeHTMLTable(source, 0, 0, 'merge-right')!;
  const inserted = table(changeHTMLTable(merged, 0, 2, 'column-left')!);
  expect(inserted.rows[0].cells[0].colSpan).toBe(3);
  const deleted = table(changeHTMLTable(merged, 0, 1, 'delete-column')!);
  expect(deleted.rows[0].cells[0].colSpan).toBe(1);
  expect(deleted.rows[1].cells[0].textContent).toBe('D');
});
it('rejects incompatible merges and last row or column deletion', () => {
  expect(changeHTMLTable(source, 0, 1, 'merge-right')).toBeUndefined();
  const one = '<table><tr><td>A</td></tr></table>';
  expect(changeHTMLTable(one, 0, 0, 'delete-row')).toBeUndefined();
  expect(changeHTMLTable(one, 0, 0, 'delete-column')).toBeUndefined();
});
it('aligns cells and deletes only the selected table', () => {
  expect(table(changeHTMLTable(source, 0, 0, 'align-center')!).rows[0].cells[0].getAttribute('align')).toBe('center');
  expect(changeHTMLTable(source + '<p>Keep</p>', 0, 0, 'delete-table')).toBe('<p>Keep</p>');
});

it('resizes a merged table and preserves its content and attributes', async () => {
  const { resizeHTMLTable, htmlTableSize } = await import('../../src/web/html-table-commands');
  const merged = changeHTMLTable(source, 0, 0, 'merge-down')!;
  const grown = resizeHTMLTable(merged, 0, 3, 3)!;
  expect(htmlTableSize(grown, 0)).toEqual({ rows: 3, columns: 3 });
  expect(table(grown).title).toBe('test');
  expect(table(grown).rows[0].cells[0].rowSpan).toBe(2);
  const smaller = resizeHTMLTable(grown, 0, 1, 1)!;
  expect(htmlTableSize(smaller, 0)).toEqual({ rows: 1, columns: 1 });
  expect(table(smaller).textContent).toBe('AC');
  expect(resizeHTMLTable(source, 0, 0, 2)).toBeUndefined();
  expect(resizeHTMLTable(source, 0, 51, 2)).toBeUndefined();
});
it('applies table alignment to all cells', () => {
  const aligned = table(changeHTMLTable(source, 0, 0, 'align-table-center')!);
  expect(Array.from(aligned.querySelectorAll('td')).every(cell => cell.getAttribute('align') === 'center')).toBe(true);
});

it('splits an ordinary cell into columns and keeps other rows visually intact', () => {
  const result = table(changeHTMLTable(source, 0, 0, 'split')!);
  expect(result.rows[0].cells.length).toBe(3);
  expect(result.rows[0].cells[0].textContent).toBe('A');
  expect(result.rows[0].cells[1].textContent).toBe('');
  expect(result.rows[1].cells.length).toBe(2);
  expect(result.rows[1].cells[0].colSpan).toBe(2);
  expect(result.rows[1].cells[0].textContent).toBe('C');
  expect(result.rows[0].cells[2].textContent).toBe('B');
});
it('splits an ordinary cell into rows and extends adjacent cells', () => {
  const result = table(changeHTMLTable(source, 0, 0, 'split-rows')!);
  expect(result.rows.length).toBe(3);
  expect(result.rows[0].cells[1].rowSpan).toBe(2);
  expect(result.rows[1].cells.length).toBe(1);
  expect(result.rows[1].cells[0].textContent).toBe('');
  expect(result.rows[2].textContent).toBe('CD');
});
it('splits inside an existing span without adding a grid track', async () => {
  const { htmlTableSize } = await import('../../src/web/html-table-commands');
  const merged = changeHTMLTable(source, 0, 0, 'merge-right')!;
  const split = changeHTMLTable(merged, 0, 0, 'split-columns')!;
  expect(htmlTableSize(split, 0)).toEqual({ rows: 2, columns: 2 });
  expect(table(split).rows[0].cells.length).toBe(2);
  expect(table(split).rows[0].cells[0].textContent).toBe('AB');
});
it('splits header cells within the same row group and keeps alignment', () => {
  const header = '<table><thead><tr><th align="center">Title</th><th>Other</th></tr></thead><tbody><tr><td>A</td><td>B</td></tr></tbody></table>';
  const result = table(changeHTMLTable(header, 0, 0, 'split-rows')!);
  expect(result.tHead!.rows.length).toBe(2);
  expect(result.tBodies[0].rows.length).toBe(1);
  expect(result.tHead!.rows[1].cells[0].localName).toBe('th');
  expect(result.tHead!.rows[1].cells[0].getAttribute('align')).toBe('center');
});
