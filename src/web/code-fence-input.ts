import { EditorState, type ChangeSpec } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';

// Keep literal fence characters inside a rendered block. Apply the fence edits
// in the same transaction so selection, source record, and history stay together.
export const codeFenceInput = EditorState.transactionFilter.of(transaction => {
  if (!transaction.docChanged || transaction.startState.readOnly ||
    !(transaction.isUserEvent('input.type') || transaction.isUserEvent('input.paste'))) return transaction;

  const { startState, changes, newDoc } = transaction;
  const tree = syntaxTree(startState);
  const blocks = new Map<number, SyntaxNode>();
  changes.iterChanges((from, to, _fromB, _toB, inserted) => {
    if (!/[`~]/.test(inserted.toString())) return;
    for (let node: SyntaxNode | null = tree.resolve(from, 1); node; node = node.parent) {
      if (node.name !== 'FencedCode') continue;
      const marks = node.getChildren('CodeMark');
      if (marks.length !== 2) break;
      const bodyFrom = startState.doc.lineAt(marks[0].to).to + 1;
      const bodyTo = startState.doc.lineAt(marks[1].from).from;
      if (from >= bodyFrom && to < bodyTo) blocks.set(node.from, node);
      break;
    }
  });

  const edits: ChangeSpec[] = [];
  for (const node of blocks.values()) {
    const [opening, closing] = node.getChildren('CodeMark');
    // A replacement that also changes either boundary owns its own syntax.
    let boundaryChanged = false;
    const bodyFrom = startState.doc.lineAt(opening.to).to + 1;
    const bodyTo = startState.doc.lineAt(closing.from).from;
    changes.iterChangedRanges((from, to) => {
      if (from <= node.to && to >= node.from && (from < bodyFrom || to >= bodyTo)) boundaryChanged = true;
    });
    if (boundaryChanged) continue;
    const fence = startState.doc.sliceString(opening.from, opening.to);
    const content = newDoc.sliceString(changes.mapPos(bodyFrom, -1), changes.mapPos(bodyTo, 1));
    let length = fence.length;
    for (const run of content.matchAll(new RegExp(fence[0] + '+', 'g'))) length = Math.max(length, run[0].length + 1);
    if (length <= fence.length) continue;
    for (const mark of [opening, closing]) {
      if (mark.to - mark.from >= length) continue;
      edits.push({ from: changes.mapPos(mark.from), to: changes.mapPos(mark.to), insert: fence[0].repeat(length) });
    }
  }
  return edits.length ? [transaction, { changes: edits, sequential: true }] : transaction;
});
