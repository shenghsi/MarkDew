// Inactive local-coverage experiment. Production retains completeDocument(after).
import { EditorState, Range, RangeSet, RangeValue, Transaction } from '@codemirror/state';
import { syntaxTree, syntaxTreeAvailable } from '@codemirror/language';
import { DecorationSet } from '@codemirror/view';
import { SyntaxNode, Tree } from '@lezer/common';

// Initial eligibility is established once. Each accepted
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
export type Eligibility = (node: SyntaxNode, state: EditorState) => boolean;
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
export function completeDocument(state: EditorState): SyntaxNode | undefined {
  if (!syntaxTreeAvailable(state, state.doc.length)) return;
  // The YAML wrapper can be complete while its mounted Markdown body is short.
  // Enter the body, then inspect its actual Document, not the outer wrapper.
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(0, 1);
  while (node && node.name !== 'Document') node = node.parent;
  return node?.tree && node.from === 0 && node.to === state.doc.length && node.tree.length === state.doc.length ? node : undefined;
}
export function createIndex(state: EditorState, decorations: DecorationSet, eligible: Eligibility = plain): Index | undefined {
  const document = completeDocument(state);
  if (!document) return;
  const ranges: Range<Block>[] = [];
  let valid = true;
  function visit(node: SyntaxNode) {
    if (!valid) return;
    if (node.name === 'Document') {
      for (let child = node.firstChild; valid && child; child = child.nextSibling) visit(child);
    } else if (!eligible(node, state) || state.doc.lineAt(node.from).from !== node.from || state.doc.lineAt(node.to).to !== node.to) valid = false;
    else ranges.push(new Block(node.tree!, state.sliceDoc(node.from, node.to)).range(node.from, node.to));
  }
  visit(document);
  if (!valid || !ranges.length) return;
  return { blocks: RangeSet.of(ranges, true), decorations };
}

export interface Counts { visitedBlocks: number; rebuiltItems: number; rebuiltRanges: number }
export function updateIndex(index: Index, transaction: Transaction, build: (state: EditorState, tree: Tree) => { decorations: DecorationSet; items: number } | undefined, rejected?: (reason: unknown) => void, eligible: Eligibility = plain): { index: Index; counts: Counts } | undefined {
  const before = transaction.startState, after = transaction.state, changes = transaction.changes;
  if (!transaction.docChanged) return;
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
  const tree = syntaxTree(after), node = topBlock(tree, from);
  if (!syntaxTreeAvailable(after, to) || !node?.parent || node.parent.name !== 'Document' || node.parent.from !== 0 ||
    node.parent.to < to || !node.tree || node.tree.length !== node.to - node.from) {
    rejected?.({ phase: 'local-coverage', from, to, available: syntaxTreeAvailable(after, to),
      node: node && [node.name, node.from, node.to, node.tree?.length], parent: node?.parent && [node.parent.name, node.parent.from, node.parent.to] }); return;
  }
  if (!node || node.name !== 'Paragraph' || node.from !== from || node.to !== to || !eligible(node, after)) {
    rejected?.({ phase: 'paragraph', old: [old.from, old.to], mapped: [from, to], actual: node && [node.name, node.from, node.to] }); return;
  }
  const mapped = index.blocks.map(changes), counts: Counts = { visitedBlocks: 1, rebuiltItems: 0, rebuiltRanges: 0 };
  // The mapped neighbors must still be complete blocks with identical trees
  // and source envelopes. No old state or old absolute-item chain is retained.
  const edge = (direction: number, boundary: number) => {
    let outside = false, inspected = 0;
    mapped.between(direction < 0 ? 0 : boundary, direction < 0 ? boundary : after.doc.length, (start, end) => {
      // A disjoint top-level index needs at most the touching block and one
      // outer block. Unexpected overlap cannot prove a document edge.
      if (++inspected > 2) { outside = true; return false; }
      if (direction < 0 ? end <= boundary : start >= boundary) outside = true;
      if (outside) return false;
    });
    return !outside;
  };
  const rebuild = [node];
  let dirtyFrom = from, dirtyTo = to;
  for (const direction of [-1, 1]) {
    let neighbor = direction < 0 ? node.prevSibling : node.nextSibling;
    let stable = !neighbor && edge(direction, direction < 0 ? node.from : node.to);
    for (let attempt = 0; neighbor && attempt < 8; attempt++) {
      counts.visitedBlocks++;
      if (!syntaxTreeAvailable(after, neighbor.to) || !neighbor.tree || neighbor.tree.length !== neighbor.to - neighbor.from ||
        neighbor.parent?.name !== 'Document' || neighbor.parent.from !== 0 || neighbor.parent.to < neighbor.to) {
        rejected?.({ phase: 'local-coverage', from: neighbor.from, to: neighbor.to }); return;
      }
      let prior: Block | undefined;
      mapped.between(neighbor.from, neighbor.to, (start, end, value) => {
        if (start === neighbor!.from && end === neighbor!.to) prior = value;
      });
      const sourceMatches = !!prior && prior.source === after.sliceDoc(neighbor.from, neighbor.to);
      const lineMatches = after.doc.lineAt(neighbor.from).from === neighbor.from && after.doc.lineAt(neighbor.to).to === neighbor.to;
      if (!prior || !sourceMatches || !lineMatches || !eligible(neighbor, after)) {
        rejected?.({ phase: 'neighbor', neighbor: [neighbor.name, neighbor.from, neighbor.to],
          indexed: !!prior, tree: prior?.tree === neighbor.tree, sourceMatches, lineMatches }); return;
      }
      if (prior.tree === neighbor.tree) { stable = true; break; }
      // Equal text is not proof of parser identity. Rebuild this new tree and
      // continue until a stable outer boundary, or use the full path.
      rebuild.push(neighbor); dirtyFrom = Math.min(dirtyFrom, neighbor.from); dirtyTo = Math.max(dirtyTo, neighbor.to);
      const boundary = direction < 0 ? neighbor.from : neighbor.to;
      neighbor = direction < 0 ? neighbor.prevSibling : neighbor.nextSibling;
      if (!neighbor) stable = edge(direction, boundary);
    }
    if (!stable) { rejected?.({ phase: 'unstable-boundary', direction }); return; }
  }
  rebuild.sort((left, right) => left.from - right.from);
  const wrapper = new Tree(tree.type, rebuild.map(block => block.tree!), rebuild.map(block => block.from), after.doc.length);
  const region = build(after, wrapper);
  if (!region) return;
  const replacement = region.decorations;
  const add = [];
  for (const cursor = replacement.iter(); cursor.value; cursor.next()) add.push(cursor.value.range(cursor.from, cursor.to));
  counts.rebuiltItems = region.items; counts.rebuiltRanges = add.length;
  const decorations = index.decorations.map(changes).update({ filterFrom: dirtyFrom, filterTo: dirtyTo,
    filter: (start, end) => end < dirtyFrom || start > dirtyTo, add, sort: true });
  return { index: { blocks: mapped.update({ filterFrom: dirtyFrom, filterTo: dirtyTo,
    filter: (start, end) => end < dirtyFrom || start > dirtyTo,
    add: rebuild.map(block => new Block(block.tree!, after.sliceDoc(block.from, block.to)).range(block.from, block.to)) }), decorations }, counts };
}
