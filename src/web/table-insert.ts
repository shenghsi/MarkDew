import { EditorSelection } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { isolateHistory } from '@codemirror/commands';
import { EditorView } from '@codemirror/view';
import { outerBlocks } from './outer-blocks';
import { editGuard } from './edit-guard';
import { footnoteSource } from './footnotes';
import { findTable } from './table-commands';
import { tableCells } from './table-ranges';
import { tableCellEffect, tableCellField, tableEditor } from './table';

const template = '| Column 1 | Column 2 |\n| --- | --- |\n| | |\n| | |';

export function insertTable(view: EditorView): string | null {
  const reason = editGuard(view); if (reason) return reason;
  const state = view.state, selection = state.selection.main;
  if (footnoteSource(state, selection.from, selection.to)) return 'Move outside footnote source before you insert a table.';
  const tree = ensureSyntaxTree(state, state.doc.length, 100);
  if (!tree) return 'Wait for Markdown parsing, then insert the table.';
  const original = outerBlocks(tree), atSelection = selection.empty ? selection.to : selection.to - 1;
  const owner = original.find(node => node.from <= atSelection && node.to >= atSelection);
  if (owner?.name === 'Frontmatter') return 'Move outside metadata before you insert a table.';
  // A selection retains its text; its last selected block supplies the anchor.
  // Container blank lines belong to the complete outer block, never its child.
  const line = state.doc.lineAt(owner ? owner.to : selection.to);
  const at = owner ? line.to : line.from;
  const before = state.doc.sliceString(Math.max(0, at - 2), at);
  const left = at === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
  const right = state.doc.sliceString(at, Math.min(state.doc.length, at + 2));
  const tail = right.startsWith('\n\n') ? '' : right.startsWith('\n') ? '\n' : '\n\n';
  const changes = { from: at, insert: left + template + tail };
  const draft = state.update({ changes });
  if (JSON.stringify(draft.changes.toJSON()) !== JSON.stringify(state.changes(changes).toJSON()))
    return 'The table insertion was not accepted.';
  const from = at + left.length, to = from + template.length;
  const parsed = ensureSyntaxTree(draft.state, draft.state.doc.length, 100);
  const table = parsed && findTable(draft.state, from, parsed);
  if (!table || table.from !== from || table.to !== to || table.parent?.name !== 'Document') return 'This position cannot contain a new table.';
  const rows = tableCells(table, (a, b) => draft.state.doc.sliceString(a, b));
  if (rows.length !== 3 || rows.some(row => row.length !== 2) || !table.getChild('TableDelimiter'))
    return 'The new table has unsupported source ranges.';
  // Every original outer block must still exist with the same complete source
  // and parent. This includes fences, lists, quotes, and metadata next to it.
  const retained = outerBlocks(parsed!);
  if (original.some(node => !retained.some(next => next.name === node.name &&
    next.from === draft.changes.mapPos(node.from, 1) && next.to === draft.changes.mapPos(node.to, -1) &&
    next.parent?.name === node.parent?.name))) return 'This insertion would change another Markdown block.';
  const cell = rows[0][0], live = state.field(tableCellField, false) !== undefined;
  const active = { from, to, row: 0, column: 0, cellFrom: cell.from, cellTo: cell.to, anchor: 0, head: cell.to - cell.from };
  const finalSelection = live ? EditorSelection.cursor(to + tail.length) : EditorSelection.range(cell.from, cell.to);
  const transaction = state.update({ changes, selection: finalSelection,
    effects: [EditorView.scrollIntoView(from), ...(live ? [tableCellEffect.of(active)] : [])],
    annotations: isolateHistory.of('full'), userEvent: 'input.table.insert' });
  if (JSON.stringify(transaction.changes.toJSON()) !== JSON.stringify(draft.changes.toJSON()) ||
    !transaction.state.selection.eq(EditorSelection.create([finalSelection]))) return 'The table insertion was not accepted.';
  if (live) {
    const accepted = transaction.state.field(tableCellField, false);
    if (!accepted || Object.entries(active).some(([key, value]) => accepted[key as keyof typeof active] !== value))
      return 'The table cell could not be opened.';
  }
  view.dispatch(transaction);
  if (live) {
    const dom = view.dom.querySelector<HTMLElement>(`.preview-table[data-from="${from}"]`);
    if (dom) tableEditor(dom)?.begin(0, 0);
  } else view.focus();
  return null;
}
