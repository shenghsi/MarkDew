// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { fromSource, normalize, restoreSource, savedSource, sourceField } from '../../src/web/source';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
it('routes actual Enter through the guarded command instead of the package high-priority keymap', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const original = '\uFEFFhead\r\n- first\rTail\nEnd', record = fromSource(original);
  view.dispatch({ changes: { from: 0, insert: normalize(record.raw) }, selection: { anchor: 'head\n- first'.length }, effects: restoreSource.of(record) });
  view.focus();
  const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true });
  view.contentDOM.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(savedSource(view.state.field(sourceField))).toBe('\uFEFFhead\r\n- first\r- \rTail\nEnd');
  const nested = fromSource('> - [X] done');
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: nested.raw }, selection: { anchor: nested.raw.length }, effects: restoreSource.of(nested) });
  view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
  expect(savedSource(view.state.field(sourceField))).toBe('> - [X] done\n> - [ ] ');
  document.querySelector<HTMLButtonElement>('#undo')!.click(); expect(savedSource(view.state.field(sourceField))).toBe(nested.raw);
  document.querySelector<HTMLButtonElement>('#redo')!.click(); expect(savedSource(view.state.field(sourceField))).toBe('> - [X] done\n> - [ ] ');
  view.destroy();
});
