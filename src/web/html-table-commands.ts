export const htmlTableCommands = [
  ['row-above', 'Insert row above'], ['row-below', 'Insert row below'],
  ['column-left', 'Insert column left'], ['column-right', 'Insert column right'],
  ['delete-row', 'Delete row'], ['delete-column', 'Delete column'],
  ['merge-right', 'Merge with right cell'], ['merge-down', 'Merge with cell below'],
  ['split', 'Split cell'], ['align-left', 'Align left'], ['align-center', 'Align center'],
  ['align-right', 'Align right'], ['delete-table', 'Delete table'],
] as const;
export type HTMLTableCommand = typeof htmlTableCommands[number][0];
interface Cell { element: HTMLTableCellElement; row: number; column: number; height: number; width: number }

// Work on an inert copy of authored HTML, never on the sanitized preview.
export function changeHTMLTable(source: string, tableIndex: number, cellIndex: number, command: HTMLTableCommand): string | undefined {
  const template = document.createElement('template'); template.innerHTML = source;
  const table = template.content.querySelectorAll('table')[tableIndex];
  if (!table || table.querySelector('table')) return;
  if (command === 'delete-table') { table.remove(); return template.innerHTML; }
  const rows = Array.from(table.rows), grid: Cell[][] = [], cells: Cell[] = [];
  for (let row = 0; row < rows.length; row++) {
    grid[row] ||= [];
    let column = 0;
    for (const element of Array.from(rows[row].cells)) {
      while (grid[row][column]) column++;
      const height = element.rowSpan, width = element.colSpan;
      if (height < 1 || height > rows.length - row || width > 1000) return;
      const cell = { element, row, column, height, width }; cells.push(cell);
      for (let r = row; r < row + height; r++) for (let c = column; c < column + width; c++) {
        grid[r] ||= []; if (grid[r][c]) return; grid[r][c] = cell;
      }
      column += width;
    }
  }
  const selected = cells[cellIndex], columns = Math.max(...grid.map(row => row.length));
  if (!selected || columns > 1000 || grid.some(row => row.length !== columns || Array.from({ length: columns }, (_, c) => row[c]).some(cell => !cell))) return;
  const fresh = (row: number, column: number, tag = 'td'): Cell => ({ element: document.createElement(tag) as HTMLTableCellElement, row, column, width: 1, height: 1 });
  if (command.startsWith('align-')) selected.element.setAttribute('align', command.slice(6));
  else if (command === 'merge-right' || command === 'merge-down') {
    const right = command === 'merge-right';
    const other = grid[right ? selected.row : selected.row + selected.height]?.[right ? selected.column + selected.width : selected.column];
    if (!other || other === selected || other.row !== (right ? selected.row : selected.row + selected.height) ||
      other.column !== (right ? selected.column + selected.width : selected.column) ||
      (right ? other.height !== selected.height : other.width !== selected.width) || other.element.parentElement?.parentElement !== selected.element.parentElement?.parentElement) return;
    if (selected.element.innerHTML && other.element.innerHTML) selected.element.append(document.createElement('br'));
    selected.element.append(...Array.from(other.element.childNodes));
    if (right) selected.width += other.width; else selected.height += other.height;
    cells.splice(cells.indexOf(other), 1);
  } else if (command === 'split') {
    if (selected.width === 1 && selected.height === 1) return;
    for (let r = selected.row; r < selected.row + selected.height; r++) for (let c = selected.column; c < selected.column + selected.width; c++)
      if (r !== selected.row || c !== selected.column) cells.push(fresh(r, c, selected.element.localName));
    selected.width = selected.height = 1;
  } else {
    const vertical = command.includes('row'), deleting = command.startsWith('delete');
    const position = vertical ? selected.row + (command === 'row-below' ? selected.height : 0) : selected.column + (command === 'column-right' ? selected.width : 0);
    if (deleting && (vertical ? rows.length : columns) <= 1) return;
    const axis = vertical ? 'row' : 'column', span = vertical ? 'height' : 'width';
    for (const cell of [...cells]) {
      if (deleting) {
        if (cell[axis] <= position && cell[axis] + cell[span] > position) {
          if (cell[span] === 1) cells.splice(cells.indexOf(cell), 1); else cell[span]--;
        } else if (cell[axis] > position) cell[axis]--;
      } else if (cell[axis] < position && cell[axis] + cell[span] > position) cell[span]++;
      else if (cell[axis] >= position) cell[axis]++;
    }
    if (vertical) {
      if (deleting) { rows[position].remove(); rows.splice(position, 1); }
      else {
        const row = document.createElement('tr');
        const reference = rows[Math.min(position, rows.length - 1)];
        reference.parentElement!.insertBefore(row, rows[position] || null); rows.splice(position, 0, row);
      }
    }
    if (!deleting) for (let i = 0; i < (vertical ? columns : rows.length); i++) {
      const r = vertical ? position : i, c = vertical ? i : position;
      if (!cells.some(cell => cell.row <= r && cell.row + cell.height > r && cell.column <= c && cell.column + cell.width > c)) cells.push(fresh(r, c));
    }
  }
  for (const row of rows) for (const cell of Array.from(row.cells)) cell.remove();
  cells.sort((a, b) => a.row - b.row || a.column - b.column);
  for (const cell of cells) {
    for (const [name, value] of [['rowspan', cell.height], ['colspan', cell.width]] as const) {
      if (value > 1) cell.element.setAttribute(name, String(value)); else cell.element.removeAttribute(name);
    }
    rows[cell.row].append(cell.element);
  }
  return template.innerHTML;
}
