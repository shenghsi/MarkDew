import { ChangeSet, ChangeSpec, EditorState } from '@codemirror/state';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { SyntaxNode, Tree } from '@lezer/common';
import { Cell, tableCells } from './table-ranges';

export type TableCommand = 'row-above' | 'row-below' | 'delete-row' | 'column-left' | 'column-right' |
  'delete-column' | 'align-left' | 'align-center' | 'align-right';
export interface TablePlan { changes: ChangeSpec[]; row: number; column: number;
  acceptedChanges?: ChangeSet;
  target?: { from: number; to: number; cellFrom: number; cellTo: number } }
interface Row { node: SyntaxNode; cells: Cell[] }

export function findTable(state: EditorState, from: number, tree: Tree = syntaxTree(state)): SyntaxNode | null {
  let node: SyntaxNode | null = tree.resolveInner(from, 1);
  while (node && node.name !== 'Table') node = node.parent;
  return node?.from === from ? node : null;
}
const containers = new Set(['Document', 'BulletList', 'OrderedList', 'ListItem', 'Blockquote']);
export function tableContainerSupported(table: SyntaxNode | null): boolean {
  if (!table) return false;
  for (let parent = table.parent; parent; parent = parent.parent) if (!containers.has(parent.name)) return false;
  return true;
}

function rows(state: EditorState, table: SyntaxNode): Row[] {
  const read = (from: number, to: number) => state.doc.sliceString(from, to);
  const cells = tableCells(table, read), result: Row[] = []; let index = 0;
  for (let node = table.firstChild; node; node = node.nextSibling) {
    if (node.name === 'TableHeader' || node.name === 'TableRow') result.push({ node, cells: cells[index++] });
    else if (node.name === 'TableDelimiter') {
      // This row has already been validated as a GFM alignment row by Lezer.
      const source = read(node.from, node.to), slots: Cell[] = []; let start = 0;
      for (let offset = 0; offset <= source.length; offset++) {
        if (offset !== source.length && source[offset] !== '|') continue;
        if (offset > start) {
          const text = source.slice(start, offset), token = /^\s*(:?-+:?)\s*$/.exec(text);
          if (!token) throw new Error('The alignment row has an unsupported slot.');
          const from = node.from + start + /^\s*/.exec(text)![0].length;
          slots.push({ from, to: from + token[1].length, slotFrom: node.from + start, slotTo: node.from + offset });
        }
        start = offset + 1;
      }
      result.push({ node, cells: slots });
    }
  }
  return result;
}

// Each column patch affects one row. Existing slots are copied verbatim;
// only the added/deleted slot or alignment token changes.
function columnPatch(state: EditorState, row: Row, index: number, width: number, remove: boolean) {
  const raw = row.cells.map(cell => state.doc.sliceString(cell.slotFrom, cell.slotTo));
  let leading = state.doc.sliceString(row.node.from, row.cells[0].slotFrom);
  let trailing = state.doc.sliceString(row.cells.at(-1)!.slotTo, row.node.to);
  while (raw.length < width) raw.push(' ');
  if (remove) raw.splice(index, 1); else raw.splice(index, 0,
    row.node.name === 'TableDelimiter' ? (index === 0 && !leading ? '--- ' : ' --- ') :
      row.node.name === 'TableHeader' ? (index === 0 && !leading ? 'Column ' : ' Column ') : ' ');
  // Empty edge cells need outer delimiters so they are not mistaken for them.
  if (/^\s/.test(raw[0]) && !leading) leading = '|';
  if (!raw.at(-1)!.trim() && !trailing) trailing = '|';
  if (raw.length === 1) { leading ||= '|'; trailing ||= '|'; }
  const insert = leading + raw.join('|') + trailing;
  const previous = state.doc.sliceString(row.node.from, row.node.to);
  let from = 0, end = previous.length, newEnd = insert.length;
  while (from < end && from < newEnd && previous[from] === insert[from]) from++;
  while (end > from && newEnd > from && previous[end - 1] === insert[newEnd - 1]) { end--; newEnd--; }
  return { from: row.node.from + from, to: row.node.from + end, insert: insert.slice(from, newEnd) };
}

function draftPlan(state: EditorState, model: Row[], command: TableCommand, row: number, column: number): TablePlan {
  const width = model[0]?.cells.length || 0;
  if (!width || model[1]?.node.name !== 'TableDelimiter' || model[1].cells.length !== width ||
    model.some(item => !item.cells.length)) throw new Error('The table has unsupported source ranges.');
  if (row < 0 || row >= model.length - 1 || column < 0 || column >= width) throw new Error('Select a table cell first.');
  const body = row === 0 ? model[1] : model[row + 1];
  if (command === 'delete-row') {
    if (row === 0) throw new Error('The header row cannot be deleted.');
    const line = state.doc.lineAt(body.node.from);
    if (body.node.to !== line.to) throw new Error('Use Table source for this row.');
    return { changes: [{ from: line.from, to: Math.min(line.to + 1, state.doc.length), insert: '' }],
      row: Math.max(0, row - 1), column };
  }
  if (command === 'row-above' || command === 'row-below') {
    if (row === 0 && command === 'row-above') throw new Error('Insert a row below the header.');
    // The alignment row already belongs to this parsed table. Its prefix is
    // continuation syntax, even when the header starts beside a list marker.
    const prefix = state.doc.sliceString(state.doc.lineAt(model[1].node.from).from, model[1].node.from);
    if (!/^[ \t>]*$/.test(prefix)) throw new Error('Use Table source for this table prefix.');
    const empty = prefix + '|' + Array(width).fill(' ').join('|') + '|';
    const line = state.doc.lineAt(body.node.from), above = command === 'row-above';
    return { changes: [{ from: above ? line.from : line.to, insert: above ? empty + '\n' : '\n' + empty }],
      row: above ? row : row + 1, column };
  }
  if (command.startsWith('align-')) {
    const cell = model[1].cells[column], token = state.doc.sliceString(cell.from, cell.to);
    const dashes = token.replace(/:/g, '');
    const insert = (command !== 'align-right' ? ':' : '') + dashes + (command !== 'align-left' ? ':' : '');
    return { changes: insert === token ? [] : [{ from: cell.from, to: cell.to, insert }], row, column };
  }
  if (command === 'delete-column' && width === 1) throw new Error('The last column cannot be deleted.');
  const index = column + (command === 'column-right' ? 1 : 0), remove = command === 'delete-column';
  return { changes: model.map(item => columnPatch(state, item, index, width, remove)), row,
    column: remove ? Math.min(column, width - 2) : index };
}

// Parse before changing input ownership. Prefix spelling alone cannot establish
// container membership: the complete proposal must retain the original table.
export function tablePlan(state: EditorState, from: number, command: TableCommand, row: number, column: number): TablePlan {
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) throw new Error('Wait for table syntax or use Table source.');
  const table = findTable(state, from, tree);
  if (!tableContainerSupported(table)) throw new Error('Use Table source for this table container.');
  const model = rows(state, table!), plan = draftPlan(state, model, command, row, column);
  if (!plan.changes.length) return plan;
  const proposal = state.update({ changes: plan.changes });
  const proposedTree = ensureSyntaxTree(proposal.state, proposal.state.doc.length, 100);
  if (!proposedTree) throw new Error('Wait for table syntax or use Table source.');
  const nextFrom = proposal.changes.mapPos(from, -1), next = findTable(proposal.state, nextFrom, proposedTree);
  if (!next || !tableContainerSupported(next)) throw new Error('The change would leave this table container.');
  const deletedLast = command === 'delete-row' && row === model.length - 2;
  const expectedEnd = deletedLast ? proposal.changes.mapPos(model.at(-2)!.node.to, -1)
    : proposal.changes.mapPos(table!.to, 1);
  if (next.to !== expectedEnd) throw new Error('The change would alter the table boundary.');
  let priorParent = table!.parent, nextParent = next.parent;
  while (priorParent && nextParent) {
    const parentEnd = priorParent.name !== 'Document' && deletedLast && priorParent.to === table!.to
      ? expectedEnd : proposal.changes.mapPos(priorParent.to, 1);
    if (priorParent.name !== nextParent.name || proposal.changes.mapPos(priorParent.from, -1) !== nextParent.from || parentEnd !== nextParent.to)
      throw new Error('The change would leave this table container.');
    priorParent = priorParent.parent; nextParent = nextParent.parent;
  }
  if (priorParent || nextParent) throw new Error('The change would leave this table container.');
  const nextModel = rows(proposal.state, next), width = model[0].cells.length;
  const expected: { name: string; count: number; old: SyntaxNode | null }[] =
    model.map(item => ({ name: item.node.name, count: item.cells.length, old: item.node }));
  if (command === 'delete-row') expected.splice(row + 1, 1);
  else if (command === 'row-above' || command === 'row-below')
    expected.splice(plan.row + 1, 0, { name: 'TableRow', count: width, old: null });
  else if (command.startsWith('column-') || command === 'delete-column')
    for (const item of expected) item.count = Math.max(item.count, width) + (command === 'delete-column' ? -1 : 1);
  if (nextModel.length !== expected.length || nextModel.some((item, index) => {
    const wanted = expected[index];
    const association = command === 'row-above' ? 1 : -1;
    return item.node.name !== wanted.name || item.cells.length !== wanted.count ||
      !!(wanted.old && item.node.from !== proposal.changes.mapPos(wanted.old.from, association));
  })) throw new Error('The change would alter neighboring table rows.');
  const target = tableCells(next, (a, b) => proposal.state.doc.sliceString(a, b))[plan.row]?.[plan.column];
  if (!target) throw new Error('The changed table has no target cell.');
  return { ...plan, acceptedChanges: proposal.changes,
    target: { from: next.from, to: next.to, cellFrom: target.from, cellTo: target.to } };
}
