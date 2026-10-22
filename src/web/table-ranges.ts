import { SyntaxNode } from '@lezer/common';

export interface Cell { from: number; to: number; slotFrom: number; slotTo: number; virtual?: boolean }
// Lezer distinguishes escaped pipes from column delimiters. Slot ranges retain
// padding; edit ranges omit it. Empty cells still have a zero-length edit range.
export function tableCells(node: SyntaxNode, read: (from: number, to: number) => string): Cell[][] {
  const rows: Cell[][] = [];
  for (let row = node.firstChild; row; row = row.nextSibling) {
    if (row.name !== 'TableHeader' && row.name !== 'TableRow') continue;
    const delimiters: { from: number; to: number }[] = [];
    for (let child = row.firstChild; child; child = child.nextSibling)
      if (child.name === 'TableDelimiter') delimiters.push({ from: child.from, to: child.to });
    const spans: { from: number; to: number }[] = [];
    let start = row.from;
    for (const delimiter of delimiters) {
      if (delimiter.from > start || start !== row.from) spans.push({ from: start, to: delimiter.from });
      start = delimiter.to;
    }
    if (start < row.to) spans.push({ from: start, to: row.to });
    rows.push(spans.map(span => {
      const text = read(span.from, span.to), leading = /^\s*/.exec(text)![0].length;
      const trailing = /\s*$/.exec(text)![0].length;
      return { from: span.from + leading, to: span.from + Math.max(leading, text.length - trailing),
        slotFrom: span.from, slotTo: span.to };
    }));
  }
  return rows;
}

export function editableTableCells(node: SyntaxNode, read: (from: number, to: number) => string): Cell[][] {
  const rows = tableCells(node, read), width = rows[0]?.length || 0;
  let index = 0;
  for (let row = node.firstChild; row; row = row.nextSibling) {
    if (row.name !== 'TableHeader' && row.name !== 'TableRow') continue;
    rows[index] = rows[index].slice(0, width);
    while (rows[index].length < width) rows[index].push({ from: row.to, to: row.to,
      slotFrom: row.to, slotTo: row.to, virtual: true });
    index++;
  }
  return rows;
}
