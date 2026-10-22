// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { tableEditor } from '../../src/web/table';
import { writingSizeControls } from '../../src/web/writing-size';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); document.body.innerHTML = ''; });

it('retains document state, active cell input and history through size, composition and mode changes', async () => {
  localStorage.setItem('markdew.writing-size', '125'); document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const surface = document.querySelector<HTMLElement>('#editor')!, select = document.querySelector<HTMLSelectElement>('[aria-label="Writing size"]')!;
  const choose = (value: string) => { select.value = value; select.dispatchEvent(new Event('change')); };
  const source = () => savedSource(view.state.field(sourceField));
  try {
    expect(surface.style.getPropertyValue('--writing-scale')).toBe('1.25');
    const text = '# 日本語😀\n\n| A |\n|---|\n| x |\n\nEnd';
    view.dispatch({ changes: { from: 0, insert: text }, selection: { anchor: 5, head: 0 } });
    const state = view.state, baseline = tabs.active.baseline, depth = undoDepth(state);
    choose('200'); expect(view.state).toBe(state); expect(source()).toBe(text);
    expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    choose('80'); expect(select.value).toBe('200'); expect(localStorage.getItem('markdew.writing-size')).toBe('200');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    choose('80'); expect(view.state).toBe(state);
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!; table.begin(1, 0);
    const child = table.child!, childState = child.state, outerState = view.state;
    choose('150'); expect(table.child).toBe(child); expect(child.state).toBe(childState); expect(view.state).toBe(outerState);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    choose('90'); expect(select.value).toBe('150');
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    choose('90'); expect(table.child).toBe(child);
    document.querySelector<HTMLButtonElement>('#source')!.click();
    expect(surface.classList.contains('source-mode')).toBe(true); expect(select.value).toBe('90'); expect(source()).toBe(text);
    undo(view); expect(source()).toBe(''); redo(view); expect(source()).toBe(text);
    const oldState = view.state;
    document.querySelector<HTMLButtonElement>('#new')!.click();
    await vi.waitFor(() => expect(tabs.all).toHaveLength(2));
    expect(select.value).toBe('90');
    document.querySelector<HTMLButtonElement>(`[data-document="${tabs.all[0].id}"]`)!.click();
    expect(view.state.doc).toBe(oldState.doc); expect(source()).toBe(text); expect(select.value).toBe('90');
    const preference = localStorage.getItem('markdew.writing-size'), before = view.state;
    window.dispatchEvent(new Event('pagehide')); choose('200');
    expect(localStorage.getItem('markdew.writing-size')).toBe(preference); expect(view.state).toBe(before);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});

it('uses the default for invalid preferences and permits sizing with unavailable storage', () => {
  localStorage.setItem('markdew.writing-size', '500');
  const parent = document.createElement('div'), surface = document.createElement('main'), measure = vi.fn();
  let dispose = writingSizeControls(parent, surface, () => true, measure);
  expect(surface.style.getPropertyValue('--writing-scale')).toBe('1'); dispose();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('unavailable'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('unavailable'); });
  dispose = writingSizeControls(parent, surface, () => true, measure);
  const select = parent.querySelector('select')!; select.value = '175'; select.dispatchEvent(new Event('change'));
  expect(surface.style.getPropertyValue('--writing-scale')).toBe('1.75'); expect(measure).toHaveBeenCalledOnce(); dispose();
});
