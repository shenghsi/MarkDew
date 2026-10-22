// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('discloses compact tools without changing input, and retains visible forms and close actions', async () => {
  document.body.innerHTML='<div id="app"></div>';
  const {view,tabs}=await import('../../src/web/main');
  const source=()=>savedSource(view.state.field(sourceField));
  try {
    view.dispatch({changes:{from:0,insert:'日本語😀\n\n| A |\n|---|\n| x |\n\nEnd'},selection:{anchor:5,head:0}});
    const toggle=document.querySelector<HTMLButtonElement>('#tools-toggle')!,panel=document.querySelector<HTMLElement>('#tools-panel')!;
    expect(panel.hidden).toBe(true); expect(toggle.getAttribute('aria-controls')).toBe(panel.id);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('#document-title')!.textContent).toBe('Untitled •');
    expect(document.querySelector<HTMLElement>('.document-tabs')!.parentElement!.hidden).toBe(true);
    expect(panel.querySelector('#close-document')).not.toBeNull();
    const state=view.state,baseline=tabs.active.baseline,depth=undoDepth(state); view.focus();
    const pointer=new MouseEvent('mousedown',{bubbles:true,cancelable:true}); toggle.dispatchEvent(pointer); expect(pointer.defaultPrevented).toBe(true);
    toggle.click(); expect(panel.hidden).toBe(false); expect(view.state).toBe(state); expect(view.hasFocus).toBe(true);
    toggle.click(); expect(panel.hidden).toBe(true); expect(view.state).toBe(state);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    toggle.click(); expect(panel.hidden).toBe(true); expect(view.state).toBe(state);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
    toggle.click(); document.querySelector<HTMLButtonElement>('#link')!.click();
    const form=document.querySelector<HTMLFormElement>('.link-controls:not(.image-controls)')!;
    expect(form.hidden).toBe(false); expect(panel.contains(form)).toBe(false);
    const field=form.querySelector<HTMLInputElement>('input')!; field.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
    toggle.click(); expect(panel.hidden).toBe(false);
    field.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})); toggle.click();
    expect(panel.hidden).toBe(true); expect(form.hidden).toBe(false);
    form.querySelector<HTMLButtonElement>('[data-cancel]')!.click();
    view.dispatch({selection:{anchor:view.state.doc.length}});
    const table=tableEditor(document.querySelector('.preview-table')!)!; table.begin(1,0);
    const child=table.child!; child.dispatch({selection:{anchor:1,head:0}}); child.focus();
    toggle.click(); expect(table.child).toBe(child); expect(child.hasFocus).toBe(true);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})); toggle.click(); expect(panel.hidden).toBe(false);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}));
    document.querySelector<HTMLButtonElement>('#new')!.focus();
    panel.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    expect(panel.hidden).toBe(true); expect(document.activeElement).toBe(toggle);
    expect(child.state.selection.main.anchor).toBe(1); expect(child.state.selection.main.head).toBe(0);
    expect(source()).toBe('日本語😀\n\n| A |\n|---|\n| x |\n\nEnd');
    expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
  } finally {view.destroy();}
});
