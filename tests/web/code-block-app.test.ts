// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('converts a source block through the toolbar with unchanged baseline and exact history', async () => {
  document.body.innerHTML='<div id="app"></div>';
  const {view,tabs}=await import('../../src/web/main');
  const source=()=>savedSource(view.state.field(sourceField));
  try {
    const original='> 日本語😀\n> next\n\nTail';
    view.dispatch({changes:{from:0,insert:original},selection:{anchor:7,head:2}});
    const button=document.querySelector<HTMLButtonElement>('#code-block')!;
    const down=new MouseEvent('mousedown',{bubbles:true,cancelable:true}); button.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true); const depth=undoDepth(view.state), baseline=tabs.active.baseline;
    button.click(); const expected='```\n> 日本語😀\n> next\n```\n\nTail';
    expect(source()).toBe(expected); expect(undoDepth(view.state)).toBe(depth+1); expect(tabs.active.baseline).toBe(baseline);
    expect(view.hasFocus).toBe(true); undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(expected);
    button.click(); expect(source()).toBe(expected); expect(document.querySelector('#status')!.textContent).toContain('existing code');
    undo(view); document.querySelector<HTMLButtonElement>('#source')!.click(); button.click(); expect(source()).toBe(expected);
    expect(tabs.active.baseline).toBe(baseline);
  } finally {view.destroy();}
});
