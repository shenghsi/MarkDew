// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { redo, undo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('routes the toolbar through source history and rejects composition without losing focus', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const text = () => savedSource(view.state.field(sourceField));
  try {
    view.dispatch({ changes: { from: 0, insert: '日本語😀' }, selection: { anchor: 5, head: 0 } });
    const button = document.querySelector<HTMLButtonElement>('[data-format="strike"]')!;
    expect(button.textContent).toBe('Strikethrough');
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    button.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
    const depth = undoDepth(view.state);
    button.click(); expect(text()).toBe('~~日本語😀~~'); expect(undoDepth(view.state)).toBe(depth + 1);
    undo(view); expect(text()).toBe('日本語😀'); redo(view); expect(text()).toBe('~~日本語😀~~');
    document.querySelector<HTMLButtonElement>('#source')!.click();
    button.click(); expect(text()).toBe('日本語😀');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const before = view.state; button.click(); expect(view.state).toBe(before);
    expect(document.querySelector('#status')!.textContent).toContain('Finish text input');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  } finally { view.destroy(); }
});
