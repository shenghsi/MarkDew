// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createScrollStabilizer, isTypingTransaction } from '../../src/web/scroll-stabilizer';

const rect = (top: number) => ({ top, bottom: top + 20, left: 10, right: 100 });
function fixture(scroll = 300, head = 9) {
  const parent = document.body.appendChild(document.createElement('div'));
  const view = new EditorView({ parent,
    state: EditorState.create({ doc: 'Line 1\nLine 2\nLine 3', selection: { anchor: head } }),
    dispatchTransactions: createScrollStabilizer(),
  });
  vi.spyOn(view, 'hasFocus', 'get').mockReturnValue(true);
  view.scrollDOM.scrollTop = scroll;
  vi.spyOn(view.scrollDOM, 'getBoundingClientRect').mockReturnValue({
    ...rect(0), bottom: 800, width: 1000, height: 800, x: 0, y: 0, toJSON() {},
  });
  vi.spyOn(view, 'documentTop', 'get').mockReturnValue(0);
  vi.spyOn(view, 'lineBlockAt').mockImplementation(() => {
    const calls = vi.mocked(view.coordsAtPos).mock?.results;
    return { top: calls?.at(-1)?.value?.top ?? 0 } as any;
  });
  return { view, dispose() { view.destroy(); parent.remove(); } };
}

describe('scroll stabilizer', () => {
  it('accepts text input and deletion, and excludes selection and history', () => {
    const state = EditorState.create({ doc: 'Hello' });
    for (const userEvent of ['input.type', 'input.paste', 'input.type.compose', 'delete.backward', 'delete.forward']) {
      expect(isTypingTransaction([state.update({ changes: { from: 0, insert: 'x' }, userEvent })])).toBe(true);
    }
    for (const userEvent of ['undo', 'redo', 'select']) {
      expect(isTypingTransaction([state.update({ changes: { from: 0, insert: 'x' }, userEvent })])).toBe(false);
    }
    expect(isTypingTransaction([state.update({ userEvent: 'input' })])).toBe(false);
  });

  it('corrects the settled displacement after the editor completes its scroll work', () => {
    const { view, dispose } = fixture();
    const update = view.update.bind(view);
    vi.spyOn(view, 'update').mockImplementation(trs => {
      update(trs);
      // Simulate CodeMirror moving the page during its own scroll work.
      view.scrollDOM.scrollTop = 340;
    });
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(160)).mockReturnValue(rect(180));
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input.type' });
    expect(view.scrollDOM.scrollTop).toBe(300);
    expect(view.state.doc.toString()).toBe('Line 1\nLixne 2\nLine 3');
    dispose();
  });

  it.each([0, 300])('keeps the anchor at scroll offset %i', scroll => {
    const { view, dispose } = fixture(scroll);
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(230)).mockReturnValue(rect(250));
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input.type' });
    expect(view.scrollDOM.scrollTop).toBe(scroll + 30);
    dispose();
  });

  it('does not move content above a line that grows downward', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(200)).mockReturnValue(rect(260));
    view.dispatch({ changes: { from: 9, insert: '\nmore' }, userEvent: 'input' });
    expect(view.scrollDOM.scrollTop).toBe(300);
    dispose();
  });

  it('still corrects a jump when the caret is near the bottom', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(240)).mockReturnValue(rect(790));
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input' });
    expect(view.scrollDOM.scrollTop).toBe(340);
    dispose();
  });

  it('scrolls only enough to reveal a caret that grows past the bottom', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(200)).mockReturnValue(rect(790));
    view.dispatch({ changes: { from: 9, insert: '\n' }, userEvent: 'input' });
    expect(view.scrollDOM.scrollTop).toBe(322);
    dispose();
  });

  it.each(['delete.backward', 'delete.forward'])('anchors the surviving line for %s joins', userEvent => {
    const { view, dispose } = fixture(300, userEvent === 'delete.backward' ? 7 : 6);
    const coords = vi.spyOn(view, 'coordsAtPos').mockReturnValue(rect(200));
    view.dispatch({ changes: { from: 6, to: 7 }, userEvent });
    expect(coords.mock.calls[0][0]).toBe(0);
    expect(coords.mock.calls[1][0]).toBe(0);
    dispose();
  });

  it('does not schedule a delayed correction that could affect a later selection', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValue(rect(200));
    const measure = vi.spyOn(view, 'requestMeasure');
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input' });
    expect(measure.mock.calls.every(args => !args[0])).toBe(true);
    dispose();
  });

  it('does not scroll when heading text moves inside a stationary line block', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(rect(200))
      .mockReturnValueOnce(rect(215)).mockReturnValue(rect(230));
    vi.spyOn(view, 'lineBlockAt').mockReturnValue({ top: 190 } as any);
    view.dispatch({ changes: { from: 7, insert: '# ' }, userEvent: 'input' });
    expect(view.scrollDOM.scrollTop).toBe(300);
    dispose();
  });

  it('anchors changes from every transaction in a batch', () => {
    const { view, dispose } = fixture(300, 16);
    const coords = vi.spyOn(view, 'coordsAtPos').mockReturnValue(rect(200));
    const first = view.state.update({ changes: { from: 16, insert: 'x' }, userEvent: 'input' });
    const second = first.state.update({ changes: { from: 6, to: 7 }, userEvent: 'delete.backward' });
    view.dispatch([first, second]);
    expect(coords.mock.calls[0][0]).toBe(0);
    dispose();
  });

  it('uses the block position when a wrapped paragraph start has no drawn coordinates', () => {
    const { view, dispose } = fixture();
    vi.spyOn(view, 'coordsAtPos').mockReturnValueOnce(null).mockReturnValueOnce(null)
      .mockReturnValue(rect(250));
    vi.spyOn(view, 'lineBlockAt').mockReturnValueOnce({ top: 400 } as any)
      .mockReturnValueOnce({ top: 430 } as any);
    vi.spyOn(view, 'documentTop', 'get').mockReturnValue(-200);
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input' });
    expect(view.scrollDOM.scrollTop).toBe(330);
    dispose();
  });

  it('anchors at the first selected line for a reversed replacement', () => {
    const { view, dispose } = fixture();
    view.dispatch({ selection: { anchor: 16, head: 9 } });
    const coords = vi.spyOn(view, 'coordsAtPos').mockReturnValue(rect(200));
    view.dispatch({ changes: { from: 9, to: 16, insert: 'x' }, userEvent: 'input' });
    expect(coords.mock.calls[0][0]).toBe(7);
    dispose();
  });

  it('leaves history and unfocused editors to standard scrolling', () => {
    const { view, dispose } = fixture();
    const coords = vi.spyOn(view, 'coordsAtPos');
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'undo' });
    vi.spyOn(view, 'hasFocus', 'get').mockReturnValue(false);
    view.dispatch({ changes: { from: 9, insert: 'x' }, userEvent: 'input' });
    expect(coords).not.toHaveBeenCalled();
    dispose();
  });
});
