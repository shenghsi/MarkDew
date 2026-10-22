import { EditorState, RangeSet, StateField, Transaction } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { DecorationSet, EditorView } from '@codemirror/view';
import { Tree } from '@lezer/common';
import { collectCachedPreview, collectPreview, previewDecorations } from '../../../../src/web/preview';
import { footnoteField, footnotes, NoteDefinition, NoteReference } from '../../../../src/web/footnotes';
import { imageDocument, imagePath, setImagePath } from '../../../../src/web/images';
import { tableCellField, tableHistoryView, tableImageVersion } from '../../../../src/web/table';
import { createIndex, updateIndex, Index, Counts } from './index';

type Item = ReturnType<typeof collectPreview>[number];
const isNote = (item: Item) => item.kind === 'footnote' || item.kind === 'footnote-definition';
const ordinary = (items: Item[]) => items.filter(item => !isNote(item));
function overlay(state: EditorState, imageVersion: number) {
  // The empty wrapper generates only the current model's global note items.
  const tree = new Tree(syntaxTree(state).type, [], [], state.doc.length);
  return previewDecorations(state, collectPreview(state, tree, imageVersion).filter(isNote), true);
}

export function stableNotes(transaction: Transaction): boolean {
  const before = transaction.startState, after = transaction.state;
  const old = footnotes(before), current = footnotes(after);
  if (old.bodyFrom !== current.bodyFrom || old.definitions.length !== current.definitions.length || old.references.length !== current.references.length) return false;
  let touched = false;
  transaction.changes.iterChangedRanges((from, to) => {
    if ([...old.definitions, ...old.references].some(note => from <= note.to && to >= note.from)) touched = true;
  });
  if (touched) return false;
  const equal = (left: NoteDefinition | NoteReference, right: NoteDefinition | NoteReference) =>
    left.identifier === right.identifier && left.label === right.label && left.number === right.number &&
    ('duplicate' in left ? left.duplicate === (right as NoteDefinition).duplicate : true) &&
    transaction.changes.mapPos(left.from, 1) === right.from && transaction.changes.mapPos(left.to, -1) === right.to &&
    before.sliceDoc(left.from, left.to) === after.sliceDoc(right.from, right.to);
  return old.definitions.every((note, at) => equal(note, current.definitions[at])) && old.references.every((note, at) => equal(note, current.references[at]));
}

interface Plan {
  mode: 'full' | 'indexed';
  tree: Tree;
  decorations: DecorationSet;
  index?: Index;
  localCounts?: Counts;
  imagePath: string;
  imageVersion: number;
}
function full(state: EditorState, imageVersion: number): Plan {
  const tree = syntaxTree(state), items = collectCachedPreview(state, tree, imageVersion);
  const rest = ordinary(items);
  const index = rest.some(item => item.kind) || state.field(tableCellField, false) ? undefined
    : createIndex(state, previewDecorations(state, rest, true));
  return { mode: 'full', tree, decorations: previewDecorations(state, items, true), index,
    imagePath: state.field(imagePath, false) || '', imageVersion };
}
export const notePreviewField = StateField.define<Plan>({
  create: state => full(state, 0),
  update(plan, transaction) {
    const state = transaction.state, tree = syntaxTree(state), path = state.field(imagePath, false) || '';
    const pathChanged = path !== plan.imagePath || transaction.startState.facet(imageDocument) !== state.facet(imageDocument) || transaction.effects.some(effect => effect.is(setImagePath));
    const oldCell = transaction.startState.field(tableCellField, false), cell = state.field(tableCellField, false);
    if (!transaction.docChanged && !transaction.selection && tree === plan.tree && !pathChanged &&
      oldCell?.from === cell?.from && oldCell?.to === cell?.to && !transaction.reconfigured) return plan;
    const imageVersion = plan.imageVersion + (pathChanged ? 1 : 0);
    if (transaction.docChanged && plan.index && !pathChanged && !oldCell && !cell &&
      !transaction.reconfigured && transaction.effects.length === 0 && stableNotes(transaction)) {
      const local = updateIndex(plan.index, transaction, (current, region) => {
        const items = ordinary(collectPreview(current, region, imageVersion));
        if (items.some(item => item.kind)) return;
        return { decorations: previewDecorations(current, items, true), items: items.length };
      });
      if (local) return { mode: 'indexed', tree, index: local.index, localCounts: local.counts,
        decorations: RangeSet.join([local.index.decorations, overlay(state, imageVersion)]), imagePath: path, imageVersion };
    }
    return full(state, imageVersion);
  },
  provide: field => EditorView.decorations.from(field, plan => plan.decorations),
});
// This extension is used only by opt-in experiments and their checks.
export const notePreview = [footnoteField, tableCellField, tableImageVersion, notePreviewField, tableHistoryView];
