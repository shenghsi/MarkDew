import { EditorView } from '@codemirror/view';
import { ChangeSet, Transaction } from '@codemirror/state';

export function isTypingTransaction(trs: readonly Transaction[]): boolean {
  return trs.some(tr =>
    tr.docChanged &&
    (tr.isUserEvent('input') || tr.isUserEvent('delete')) &&
    !tr.isUserEvent('undo') &&
    !tr.isUserEvent('redo')
  );
}

export function createScrollStabilizer() {
  return function dispatchStabilized(trs: readonly Transaction[], view: EditorView) {
    let anchorPos: number | null = null;
    let beforeTop: number | null = null;

    if (isTypingTransaction(trs) && view.hasFocus && view.state.selection.ranges.length === 1 &&
        view.scrollDOM.getBoundingClientRect().height > 0) {
      // Anchor the first affected line, including the preceding line when a
      // deletion joins lines. The selection head can be at either end.
      let from = view.state.selection.main.from;
      let changes = ChangeSet.empty(view.state.doc.length);
      for (const tr of trs) changes = changes.compose(tr.changes);
      changes.iterChangedRanges(start => { from = Math.min(from, start); });
      const candidate = view.state.doc.lineAt(from).from;
      view.coordsAtPos(candidate);
      anchorPos = candidate;
      // Anchor the block, not the text baseline. Heading padding and fonts
      // can move text within a stationary block. The block position also
      // remains available when a wrapped paragraph starts outside drawn text.
      beforeTop = view.lineBlockAt(candidate).top + view.documentTop;
    }

    view.update(trs);

    if (beforeTop === null || anchorPos === null) return;
    for (const tr of trs) anchorPos = tr.changes.mapPos(anchorPos, -1);

    // Read while the view is idle. coordsAtPos completes CodeMirror's pending
    // measurement, scroll target, and height-map scroll compensation first.
    // A requestMeasure write runs BEFORE that compensation and can double it.
    view.coordsAtPos(anchorPos);
    const afterTop = view.lineBlockAt(anchorPos).top + view.documentTop;
    const caret = view.coordsAtPos(view.state.selection.main.head);
    if (!caret) return;
    const viewport = view.scrollDOM.getBoundingClientRect();
    let delta = afterTop - beforeTop;

    // Preserve the anchor even near the bottom. Move only as far as needed
    // when wrapping or Return would put the caret outside the visible area.
    const bottom = viewport.bottom - 12;
    if (caret.bottom - delta > bottom) delta = caret.bottom - bottom;
    if (caret.top - delta < viewport.top) delta = caret.top - viewport.top;
    if (Number.isFinite(delta) && Math.abs(delta) >= 0.5) {
      view.scrollDOM.scrollTop = Math.max(0, view.scrollDOM.scrollTop + delta);
    }
  };
}
