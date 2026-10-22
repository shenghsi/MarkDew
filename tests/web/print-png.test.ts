// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { documentLanguage } from '../../src/web/document-language';
import { showPrintView } from '../../src/web/print-view';
import { exportPNG } from '../../src/web/png-export';
vi.mock('../../src/web/png-export', () => ({ exportPNG: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true }));
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() { this.setAttribute('open', ''); } });
afterEach(() => { window.dispatchEvent(new Event('pagehide')); document.body.replaceChildren(); vi.unstubAllGlobals(); vi.mocked(exportPNG).mockReset(); });
const snapshot = () => ({ state: EditorState.create({ doc: '# Print PNG', extensions: [documentLanguage()] }), id: 42, path: '', title: 'Title.md' });
it('keeps the prepared PNG preview and releases its URL when the picker is canceled by closing', async () => {
  const create = vi.fn(() => 'blob:png-preview'), revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = create; static revokeObjectURL = revoke; });
  let signal!: AbortSignal, finish!: (saved: boolean) => void;
  vi.mocked(exportPNG).mockImplementation(async (_paper, _title, current, _dispatched, _effects, prepared) => {
    signal = current; prepared!(new Uint8Array([1,2,3])); return new Promise(resolve => { finish = resolve; });
  });
  await showPrintView(snapshot()); document.querySelector<HTMLButtonElement>('#export-png')!.click();
  expect(document.querySelector<HTMLImageElement>('.png-preview img')!.src).toBe('blob:png-preview');
  document.querySelector<HTMLButtonElement>('.print-controls button:last-child')!.click();
  expect(signal.aborted).toBe(true); expect(revoke).toHaveBeenCalledWith('blob:png-preview');
  finish(true); await Promise.resolve(); expect(document.querySelector('.print-dialog')).toBeNull();
});
it('keeps the dialog open after dispatch and reports confirmation failure before allowing Close', async () => {
  let reject!: (reason: Error) => void;
  vi.mocked(exportPNG).mockImplementation(async (_paper, _title, _signal, dispatched) => {
    dispatched(); return new Promise((_resolve, failure) => { reject = failure; });
  });
  await showPrintView(snapshot()); document.querySelector<HTMLButtonElement>('#export-png')!.click();
  const close = document.querySelector<HTMLButtonElement>('.print-controls button:last-child')!; expect(close.disabled).toBe(true);
  document.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })); expect(document.querySelector('dialog')).not.toBeNull();
  reject(new Error('PNG was published, but confirmation failed'));
  await vi.waitFor(() => expect(close.disabled).toBe(false));
  expect(document.querySelector('[role=status]')!.textContent).toContain('was published'); close.click();
  expect(document.querySelector('.print-dialog')).toBeNull();
});
