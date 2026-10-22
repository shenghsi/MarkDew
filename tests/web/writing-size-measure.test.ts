// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorView } from '@codemirror/view';
import { writingSizeMeasurement } from '../../src/web/writing-size-measure';

function setup() {
  const dom = document.createElement('div'); document.body.append(dom);
  let caret = { top: 20, bottom: 40 }, active = true;
  const requests: { key?: unknown; read: () => number; write: (delta: number) => void }[] = [];
  const view = { dom, state: { selection: { main: { head: 5 } } }, scrollDOM: {
    scrollTop: 0, getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
  }, coordsAtPos: () => caret, requestMeasure: (request?: typeof requests[number]) => { if (request) requests.push(request); } };
  const control = writingSizeMeasurement(view as unknown as EditorView, () => undefined, () => active);
  return { view, requests, control, caret(value: typeof caret) { caret = value; }, active(value: boolean) { active = value; }, dispose() { dom.remove(); } };
}

it('uses the latest generation once for rapid size changes and keeps the original visible position', () => {
  const test = setup();
  try {
    test.control.prepare(); test.caret({ top: 120, bottom: 140 }); test.control.measure();
    const first = test.requests[0], firstDelta = first.read(); expect(firstDelta).toBe(48);
    test.control.prepare(); test.caret({ top: 180, bottom: 200 }); test.control.measure();
    const second = test.requests[1]; expect(first.key).toBe(second.key);
    first.write(firstDelta); expect(test.view.scrollDOM.scrollTop).toBe(0);
    const secondDelta = second.read(); expect(secondDelta).toBe(108);
    second.write(secondDelta); expect(test.view.scrollDOM.scrollTop).toBe(108);
    first.write(firstDelta); second.write(secondDelta); expect(test.view.scrollDOM.scrollTop).toBe(108);
  } finally { test.dispose(); }
});

it.each(['scroll', 'state', 'composition', 'disconnect'])('rejects stale %s changes between read and write', reason => {
  const test = setup();
  try {
    test.control.prepare(); test.caret({ top: 120, bottom: 140 }); test.control.measure();
    const request = test.requests[0], delta = request.read(); expect(delta).toBe(48);
    if (reason === 'scroll') test.view.scrollDOM.scrollTop = 25;
    if (reason === 'state') test.view.state = { selection: { main: { head: 9 } } };
    if (reason === 'composition') test.active(false);
    if (reason === 'disconnect') test.dispose();
    const before = test.view.scrollDOM.scrollTop; request.write(delta); expect(test.view.scrollDOM.scrollTop).toBe(before);
  } finally { test.dispose(); }
});
