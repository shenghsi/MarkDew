import { Extension, Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

const automatic = Decoration.line({ attributes: { dir: 'auto' } });
function visibleLines(view: EditorView): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  let last = -1;
  for (const visible of view.visibleRanges) {
    let line = view.state.doc.lineAt(visible.from);
    while (line.from <= visible.to) {
      if (line.from !== last) { ranges.push(automatic.range(line.from)); last = line.from; }
      if (line.to >= view.state.doc.length) break;
      line = view.state.doc.lineAt(line.to + 1);
    }
  }
  return Decoration.set(ranges);
}

// The browser chooses each visible line's base direction. CodeMirror reads that
// direction for its own bidi ordering and cursor movement. No source is changed.
export const textDirection: Extension = [EditorView.perLineTextDirection.of(true), ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = visibleLines(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.decorations = visibleLines(update.view);
  }
}, { decorations: value => value.decorations })];
