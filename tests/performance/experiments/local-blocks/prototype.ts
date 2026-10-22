import { EditorState, Range, RangeSet, RangeValue, Transaction } from '@codemirror/state';
import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { DecorationSet } from '@codemirror/view';
import { SyntaxNode, Tree } from '@lezer/common';
import { collectPreview, previewDecorations } from '../../../../src/web/preview';

// Inactive prototype. Initial eligibility is established once. Each accepted
// edit changes one paragraph and checks at most eight blocks on each side.
// Changed adjacent trees are rebuilt until stable boundaries are found. There are no
// widgets, resource dependencies, notes, containers, or metadata in this path.
class Block extends RangeValue {
  startSide = 1;
  endSide = -1;
  constructor(readonly tree: Tree, readonly source: string) { super(); }
}
export interface Index {
  blocks: RangeSet<Block>;
  decorations: DecorationSet;
}
const supported = (node: SyntaxNode) => node.name === 'Paragraph' || /^(ATXHeading|SetextHeading)[1-6]$/.test(node.name);
function plain(node: SyntaxNode, state: EditorState) {
  if (!supported(node) || !node.tree || node.tree.length !== node.to - node.from || node.to - node.from > 65536) return false;
  // These characters can introduce cross-block references or resource widgets.
  return !/[\[$<\\]/.test(state.sliceDoc(node.from, node.to));
}
function topBlock(tree: Tree, position: number): SyntaxNode | undefined {
  let node: SyntaxNode | null = tree.resolveInner(position, 1);
  while (node && node.parent && node.parent.name !== 'Document') node = node.parent;
  return node && node.parent?.name === 'Document' ? node : undefined;
}
export function createIndex(state: EditorState): Index | undefined {
  if (!syntaxTreeAvailable(state, state.doc.length)) return;
  const tree = syntaxTree(state), ranges: Range<Block>[] = [];
  let valid = true;
  function visit(node: SyntaxNode) {
    if (node.name === 'Document') {
      for (let child = node.firstChild; child; child = child.nextSibling) visit(child);
    } else if (!plain(node, state) || state.doc.lineAt(node.from).from !== node.from || state.doc.lineAt(node.to).to !== node.to) valid = false;
    else ranges.push(new Block(node.tree!, state.sliceDoc(node.from, node.to)).range(node.from, node.to));
  }
  visit(tree.topNode);
  if (!valid || !ranges.length) return;
  return { blocks: RangeSet.of(ranges, true), decorations: previewDecorations(state, collectPreview(state, tree)) };
}

export interface Counts { visitedBlocks: number; rebuiltItems: number; rebuiltRanges: number }
export function updateIndex(index: Index, transaction: Transaction, rejected?: (reason: unknown) => void,
  settledTree?: Tree): { index: Index; counts: Counts } | undefined {
  const before = transaction.startState, after = transaction.state, changes = transaction.changes;
  const tree = settledTree || syntaxTree(after);
  if (!transaction.docChanged || tree.length !== after.doc.length || !syntaxTreeAvailable(after, after.doc.length)) return;
  if (before.selection.ranges.length !== 1 || after.selection.ranges.length !== 1) return;
  const edits: { from: number; to: number; insert: string }[] = [];
  changes.iterChanges((from, to, _a, _b, insert) => edits.push({ from, to, insert: insert.toString() }));
  if (edits.length !== 1) return;
  const edit = edits[0], removed = before.sliceDoc(edit.from, edit.to);
  if (!/^[\p{L}\p{N}\p{M}]*$/u.test(edit.insert) || !/^[\p{L}\p{N}\p{M}]*$/u.test(removed)) return;
  // Complete word neighbors exclude structural edits and surrogate splitting.
  const left = Array.from(before.sliceDoc(Math.max(0, edit.from - 2), edit.from)).at(-1) || '';
  const right = Array.from(before.sliceDoc(edit.to, Math.min(before.doc.length, edit.to + 2)))[0] || '';
  if (!/^\p{L}$/u.test(left) || !/^[\p{L}\p{N}\p{M}]$/u.test(right)) return;
  let touched: { from: number; to: number; value: Block } | undefined;
  index.blocks.between(edit.from, edit.to, (from, to, value) => {
    if (from < edit.from && to > edit.to) touched = { from, to, value };
  });
  if (!touched || touched.value.tree.type.name !== 'Paragraph') return;
  const old = touched;
  const oldLine = before.doc.lineAt(edit.from);
  if (edit.from <= oldLine.from || edit.to >= oldLine.to) return;
  // Only the old and new selection may affect visibility. Keep both inside
  // the same dirty block, so mapped decorations elsewhere keep their meaning.
  if (before.selection.main.from < old.from || before.selection.main.to > old.to) return;
  const from = changes.mapPos(old.from, 1), to = changes.mapPos(old.to, -1);
  if (after.selection.main.from < from || after.selection.main.to > to) return;
  const node = topBlock(tree, from);
  if (!node || node.name !== 'Paragraph' || node.from !== from || node.to !== to || !plain(node, after)) {
    rejected?.({ phase: 'paragraph', old: [old.from, old.to], mapped: [from, to], actual: node && [node.name, node.from, node.to] }); return;
  }
  const mapped = index.blocks.map(changes), counts: Counts = { visitedBlocks: 1, rebuiltItems: 0, rebuiltRanges: 0 };
  // The mapped neighbors must still be complete blocks with identical trees
  // and source envelopes. No old state or old absolute-item chain is retained.
  const rebuild = [node];
  let dirtyFrom = from, dirtyTo = to;
  for (const direction of [-1, 1]) {
    let neighbor = direction < 0 ? node.prevSibling : node.nextSibling, stable = !neighbor;
    for (let attempt = 0; neighbor && attempt < 8; attempt++) {
      counts.visitedBlocks++;
      let prior: Block | undefined;
      mapped.between(neighbor.from, neighbor.to, (start, end, value) => {
        if (start === neighbor!.from && end === neighbor!.to) prior = value;
      });
      const sourceMatches = !!prior && prior.source === after.sliceDoc(neighbor.from, neighbor.to);
      const lineMatches = after.doc.lineAt(neighbor.from).from === neighbor.from && after.doc.lineAt(neighbor.to).to === neighbor.to;
      if (!prior || !sourceMatches || !lineMatches || !plain(neighbor, after)) {
        rejected?.({ phase: 'neighbor', neighbor: [neighbor.name, neighbor.from, neighbor.to],
          indexed: !!prior, tree: prior?.tree === neighbor.tree, sourceMatches, lineMatches }); return;
      }
      if (prior.tree === neighbor.tree) { stable = true; break; }
      // Equal text is not proof of parser identity. Rebuild this new tree and
      // continue until a stable outer boundary, or use the full path.
      rebuild.push(neighbor); dirtyFrom = Math.min(dirtyFrom, neighbor.from); dirtyTo = Math.max(dirtyTo, neighbor.to);
      neighbor = direction < 0 ? neighbor.prevSibling : neighbor.nextSibling;
      if (!neighbor) stable = true;
    }
    if (!stable) { rejected?.({ phase: 'unstable-boundary', direction }); return; }
  }
  rebuild.sort((left, right) => left.from - right.from);
  const wrapper = new Tree(tree.type, rebuild.map(block => block.tree!), rebuild.map(block => block.from), after.doc.length);
  const items = collectPreview(after, wrapper), replacement = previewDecorations(after, items);
  const add = [];
  for (const cursor = replacement.iter(); cursor.value; cursor.next()) add.push(cursor.value.range(cursor.from, cursor.to));
  counts.rebuiltItems = items.length; counts.rebuiltRanges = add.length;
  const decorations = index.decorations.map(changes).update({ filterFrom: dirtyFrom, filterTo: dirtyTo,
    filter: (start, end) => end < dirtyFrom || start > dirtyTo, add, sort: true });
  return { index: { blocks: mapped.update({ filterFrom: dirtyFrom, filterTo: dirtyTo,
    filter: (start, end) => end < dirtyFrom || start > dirtyTo,
    add: rebuild.map(block => new Block(block.tree!, after.sliceDoc(block.from, block.to)).range(block.from, block.to)) }), decorations }, counts };
}
