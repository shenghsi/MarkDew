import { EditorView } from '@codemirror/view';

// Keep one visible source position through a batch of presentation changes.
export function writingSizeMeasurement(view: EditorView, child: () => EditorView | undefined, active: () => boolean) {
  const key = {};
  let generation = 0;
  let pending: { target: EditorView; state: EditorView['state']; head: number; scroll: number } | undefined;
  const current = (anchor: NonNullable<typeof pending>, version: number) => active() && generation === version &&
    anchor.target.state === anchor.state && anchor.target.dom.isConnected && view.scrollDOM.scrollTop === anchor.scroll;
  return {
    prepare() {
      generation++;
      const target = child() || view, head = target.state.selection.main.head;
      if (pending && pending.target === target && pending.state === target.state && pending.head === head &&
        pending.scroll === view.scrollDOM.scrollTop) return;
      const caret = target.coordsAtPos(head), viewport = view.scrollDOM.getBoundingClientRect();
      pending = caret && caret.top >= viewport.top && caret.bottom <= viewport.bottom
        ? { target, state: target.state, head, scroll: view.scrollDOM.scrollTop } : undefined;
    },
    measure() {
      view.requestMeasure(); child()?.requestMeasure();
      const anchor = pending, version = generation;
      if (!anchor) return;
      view.requestMeasure({ key,
        read: () => {
          if (!current(anchor, version)) return 0;
          const caret = anchor.target.coordsAtPos(anchor.head), viewport = view.scrollDOM.getBoundingClientRect();
          if (!caret) return 0;
          return caret.bottom > viewport.bottom ? caret.bottom - viewport.bottom + 8
            : caret.top < viewport.top ? caret.top - viewport.top - 8 : 0;
        },
        write: delta => {
          if (current(anchor, version) && delta) view.scrollDOM.scrollTop += delta;
          if (generation === version) pending = undefined;
        },
      });
    },
  };
}
