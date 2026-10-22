// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('uses the heading menu inside a quoted list and retains source history across display modes', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const text = () => savedSource(view.state.field(sourceField));
  try {
    const original = '> - 日本語😀\n> - Neighbor';
    view.dispatch({ changes: { from: 0, insert: original }, selection: { anchor: 9, head: 4 } });
    const menu = document.querySelector<HTMLSelectElement>('#heading')!;
    const apply = (kind: string) => { menu.value = kind; menu.dispatchEvent(new Event('change', { bubbles: true })); };
    const depth = undoDepth(view.state);
    apply('h3'); expect(text()).toBe('> - ### 日本語😀\n> - Neighbor');
    expect(undoDepth(view.state)).toBe(depth + 1); expect(menu.value).toBe('');
    undo(view); expect(text()).toBe(original); redo(view); expect(text()).toContain('### 日本語😀');
    document.querySelector<HTMLButtonElement>('#source')!.click();
    apply('paragraph'); expect(text()).toBe(original);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    const before = view.state; apply('h1'); expect(view.state).toBe(before);
    expect(document.querySelector('#status')!.textContent).toContain('Finish text input');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  } finally { view.destroy(); }
});
