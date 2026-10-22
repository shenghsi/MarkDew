// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

it('changes both sidebar widths without source, selection, history, or baseline effects and blocks composition', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const workspace = document.querySelector<HTMLElement>('.workspace')!;
  vi.spyOn(workspace, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 600));
  const source = () => savedSource(view.state.field(sourceField));
  const divider = document.querySelector<HTMLElement>('[role="separator"]')!;
  const key = (key: string) => divider.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  try {
    const text = '# 日本語😀\r\n\r\nText\rEnd\n\n| A |\n|---|\n| x |\n\nFinal';
    view.dispatch({ changes: { from: 0, insert: text }, selection: { anchor: 3 } });
    for (const pane of ['files', 'outline']) {
      document.querySelector<HTMLButtonElement>(`#${pane}-toggle`)!.click();
      const state = view.state, baseline = tabs.active.baseline, depth = undoDepth(state);
      key('End'); expect(divider.getAttribute('aria-valuenow')).toBe('400'); expect(view.state).toBe(state);
      key('Home'); expect(divider.getAttribute('aria-valuenow')).toBe('150'); expect(view.state).toBe(state);
      expect(source()).toBe(text); expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
      view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      key('End'); expect(divider.getAttribute('aria-valuenow')).toBe('150');
      view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    }
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
    const child = table.child!, childState = child.state, outerState = view.state;
    key('End'); expect(table.child).toBe(child); expect(child.state).toBe(childState); expect(view.state).toBe(outerState);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    key('Home'); expect(divider.getAttribute('aria-valuenow')).toBe('400');
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    key('Home'); expect(table.child).toBe(child); expect(child.state).toBe(childState);
    undo(view); expect(source()).toBe(''); redo(view); expect(source()).toBe(text);
    const state = view.state, preference = localStorage.getItem('markdew.layout');
    window.dispatchEvent(new Event('pagehide')); key('End');
    expect(localStorage.getItem('markdew.layout')).toBe(preference); expect(view.state).toBe(state);
  } finally {
    window.dispatchEvent(new Event('pagehide')); view.destroy(); vi.restoreAllMocks(); localStorage.clear(); document.body.replaceChildren();
  }
});
