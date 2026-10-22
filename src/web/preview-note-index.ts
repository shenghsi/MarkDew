import { EditorState, Transaction } from '@codemirror/state';
import { SyntaxNode } from '@lezer/common';
import { footnotes, overlaps, NoteDefinition, NoteReference } from './footnotes';

// Note-specific restrictions supplement the shared complete-tree and local
// block guards. Other widgets and cross-block dependencies stay outside this path.
export function noteEligible(node: SyntaxNode, state: EditorState): boolean {
  if (!node.tree || node.tree.length !== node.to - node.from || node.to - node.from > 65536) return false;
  const notes = footnotes(state), definitions = notes.definitions.filter(note => overlaps(node, note));
  if (definitions.length) {
    if (definitions.length !== 1) return false;
    const definition = definitions[0];
    if (node.from >= definition.from && node.to <= definition.to) return true;
    // Lezer can put ordinary text and the following package footnote definition
    // in one paragraph. Keep that prefix ordinary, not opaque. Full collection
    // and local rebuilding both apply current global note suppression afterward.
    if (node.name !== 'Paragraph' || definition.from <= node.from || definition.to !== node.to ||
      state.doc.lineAt(definition.from).from !== definition.from) return false;
    const prefix = state.sliceDoc(node.from, definition.from);
    return prefix.endsWith('\n') && !!prefix.trim() && /^[\p{L}\p{N}\p{M} \t\n.,!?]+$/u.test(prefix);
  }
  if (node.name !== 'Paragraph' && !/^(ATXHeading|SetextHeading)[1-6]$/.test(node.name)) return false;
  let at = node.from;
  for (const note of notes.references) {
    if (!overlaps(node, note)) continue;
    if (note.from < node.from || note.to > node.to || /[\[$<\\]/.test(state.sliceDoc(at, note.from))) return false;
    at = note.to;
  }
  return !/[\[$<\\]/.test(state.sliceDoc(at, node.to));
}

export function stableNotes(transaction: Transaction): boolean {
  const before = transaction.startState, after = transaction.state;
  const old = footnotes(before), current = footnotes(after);
  if (old.bodyFrom !== current.bodyFrom || old.definitions.length !== current.definitions.length || old.references.length !== current.references.length) return false;
  let touched = false;
  transaction.changes.iterChangedRanges((from, to) => {
    if (old.definitions.some(note => from <= note.to && to >= note.from) || old.references.some(note => from <= note.to && to >= note.from)) touched = true;
  });
  if (touched) return false;
  const equal = (left: NoteDefinition | NoteReference, right: NoteDefinition | NoteReference) =>
    left.identifier === right.identifier && left.label === right.label && left.number === right.number &&
    ('duplicate' in left ? left.duplicate === (right as NoteDefinition).duplicate : true) &&
    transaction.changes.mapPos(left.from, 1) === right.from && transaction.changes.mapPos(left.to, -1) === right.to &&
    before.sliceDoc(left.from, left.to) === after.sliceDoc(right.from, right.to);
  return old.definitions.every((note, at) => equal(note, current.definitions[at])) && old.references.every((note, at) => equal(note, current.references[at]));
}
