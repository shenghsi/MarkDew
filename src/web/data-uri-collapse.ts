import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';

// An embedded image is a base64 data URI, often many kilobytes on one line. Show its data as a small
// label. The document text, source record, and history stay as they are: this only changes the display,
// and the cursor skips over the label. Copying a selection still copies the real text.
const minimum = 200;
const payload = /;base64,([A-Za-z0-9+/=]{200,})/g;

function size(characters: number): string {
  const bytes = Math.floor(characters * 3 / 4);
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
class CollapsedData extends WidgetType {
  constructor(readonly characters: number) { super(); }
  eq(other: CollapsedData) { return other.characters === this.characters; }
  toDOM() {
    const label = document.createElement('span');
    label.className = 'cm-data-collapsed'; label.textContent = `image data · ${size(this.characters)}`;
    label.title = 'The image is embedded in this file. Its data is hidden here.';
    return label;
  }
}
function collapsed(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>(), { doc } = view.state;
  // A payload sits on one long line, so scan whole lines. The viewport is already right when a document
  // change reaches this plugin; the visible ranges only update after the next measure.
  const { viewport } = view;
  const ranges = [{ from: doc.lineAt(viewport.from).from, to: doc.lineAt(viewport.to).to }];
  for (const { from, to } of ranges) {
    const text = doc.sliceString(from, to);
    if (text.length < minimum) continue;
    payload.lastIndex = 0;
    for (let match = payload.exec(text); match; match = payload.exec(text)) {
      const start = from + match.index + match[0].length - match[1].length;
      builder.add(start, start + match[1].length, Decoration.replace({ widget: new CollapsedData(match[1].length) }));
    }
  }
  return builder.finish();
}
export const collapseDataUris = ViewPlugin.fromClass(class {
  decorations: DecorationSet;
  constructor(view: EditorView) { this.decorations = collapsed(view); }
  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) this.decorations = collapsed(update.view);
  }
}, {
  decorations: plugin => plugin.decorations,
  provide: plugin => EditorView.atomicRanges.of(view => view.plugin(plugin)?.decorations ?? Decoration.none),
});
