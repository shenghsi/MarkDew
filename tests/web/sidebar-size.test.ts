// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { sidebarSize } from '../../src/web/sidebar-size';
import { layoutPreferences } from '../../src/web/layout-preferences';

afterEach(() => { localStorage.clear(); document.body.replaceChildren(); vi.restoreAllMocks(); });
function setup() {
  document.body.innerHTML = '<div class="workspace"><aside id="files"></aside><aside id="outline" hidden></aside><main></main></div><button id="files-toggle"></button><button id="outline-toggle"></button>';
  const workspace = document.querySelector<HTMLElement>('.workspace')!, files = document.querySelector<HTMLElement>('#files')!, outline = document.querySelector<HTMLElement>('#outline')!;
  let width = 1000, allowed = true;
  vi.spyOn(workspace, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, width, 600));
  const preferences = layoutPreferences(), measure = vi.fn(), prepare = vi.fn();
  const controller = sidebarSize(workspace, [
    { element: files, button: document.querySelector<HTMLElement>('#files-toggle')! },
    { element: outline, button: document.querySelector<HTMLElement>('#outline-toggle')! },
  ], preferences, () => allowed, prepare, measure);
  const divider = workspace.querySelector<HTMLElement>('[role="separator"]')!;
  const captures = new Set<number>();
  divider.setPointerCapture = id => { captures.add(id); }; divider.hasPointerCapture = id => captures.has(id);
  divider.releasePointerCapture = id => { captures.delete(id); };
  const pointer = (type: string, x: number, id = 1) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: id, button: 0, clientX: x }); divider.dispatchEvent(event); return event;
  };
  const key = (key: string, shiftKey = false) => divider.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
  return { workspace, files, outline, preferences, controller, divider, captures, pointer, key, measure, prepare,
    resize: (next: number) => { width = next; window.dispatchEvent(new Event('resize')); }, block: (next: boolean) => { allowed = !next; } };
}

it('shares keyboard sizing between panes and retains the preference through narrow window changes', () => {
  const x = setup();
  try {
    x.key('End'); expect(x.preferences.width).toBe(400); expect(x.divider.getAttribute('aria-valuenow')).toBe('400');
    x.resize(400); expect(x.divider.getAttribute('aria-valuenow')).toBe('154'); expect(x.preferences.width).toBe(400);
    const stored = localStorage.getItem('markdew.layout');
    x.key('ArrowRight'); x.key('End');
    x.pointer('pointerdown', 154); x.pointer('pointermove', 220); x.pointer('pointerup', 220);
    expect(x.preferences.width).toBe(400); expect(localStorage.getItem('markdew.layout')).toBe(stored);
    x.resize(320); expect(x.divider.getAttribute('aria-valuenow')).toBe('74'); expect(x.preferences.width).toBe(400);
    x.resize(1000); expect(x.divider.getAttribute('aria-valuenow')).toBe('400');
    x.files.hidden = true; x.outline.hidden = false; x.controller.refresh();
    expect(x.divider.getAttribute('aria-controls')).toBe('outline');
    x.key('Home'); x.key('ArrowRight', true); expect(x.preferences.width).toBe(200);
    expect(layoutPreferences().width).toBe(200);
    x.divider.focus(); x.outline.hidden = true; x.controller.refresh();
    expect(x.divider.hidden).toBe(true); expect(document.activeElement?.id).toBe('outline-toggle');
  } finally { x.controller.dispose(); }
});

it('does not consume IME, modified, or previously handled keyboard input', () => {
  const x = setup();
  try {
    for (const options of [{ isComposing: true }, { altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'End', cancelable: true, ...options });
      x.divider.dispatchEvent(event); expect(event.defaultPrevented).toBe(false); expect(x.preferences.width).toBe(250);
    }
    const handled = new KeyboardEvent('keydown', { key: 'End', cancelable: true }); handled.preventDefault();
    x.divider.dispatchEvent(handled); expect(x.preferences.width).toBe(250);
  } finally { x.controller.dispose(); }
});

it('retains pointer focus and cancels capture without persisting on Escape, composition, pane change or blur', () => {
  const x = setup();
  try {
    document.querySelector<HTMLElement>('#files-toggle')!.focus();
    expect(x.pointer('pointerdown', 250).defaultPrevented).toBe(true);
    x.pointer('pointermove', 330); expect(x.workspace.style.getPropertyValue('--sidebar-width')).toBe('330px');
    expect(document.activeElement?.id).toBe('files-toggle'); expect(x.preferences.width).toBe(250);
    x.key('Escape'); expect(x.captures.size).toBe(0); expect(x.divider.getAttribute('aria-valuenow')).toBe('250');
    for (const cancel of [() => x.pointer('pointercancel', 340), () => document.dispatchEvent(new CompositionEvent('compositionstart')),
      () => window.dispatchEvent(new Event('blur')), () => { x.files.hidden = true; x.outline.hidden = false; x.controller.refresh(); }]) {
      x.pointer('pointerdown', 250); x.pointer('pointermove', 340); cancel();
      expect(x.preferences.width).toBe(250); expect(x.captures.size).toBe(0);
    }
    x.pointer('pointerdown', 250); x.pointer('pointermove', 310.2); x.pointer('pointerup', 310.2);
    expect(x.preferences.width).toBe(310); expect(layoutPreferences().width).toBe(310);
    x.block(true); x.key('Home'); x.pointer('pointerdown', 310); expect(x.preferences.width).toBe(310); expect(x.captures.size).toBe(0);
    x.block(false); x.pointer('pointerdown', 310); x.pointer('pointermove', 350); x.controller.dispose();
    expect(x.preferences.width).toBe(310); expect(x.captures.size).toBe(0);
  } finally { x.controller.dispose(); }
});
