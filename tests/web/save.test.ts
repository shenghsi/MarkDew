// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), save: vi.fn(), ask: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: vi.fn(), save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(), listen: vi.fn() }) }));
it('retains the pending destination and captured baseline after another Save As attempt', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  mocks.save.mockResolvedValueOnce('/tmp/first.md').mockResolvedValueOnce('/tmp/second.md');
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') return startupFixture({ session: 'session-test', revision: 0, entries: [], warnings: [] });
    if (command === 'recovery_start' || command === 'recovery_list') return { session: 'session-test', revision: 0, entries: [], warnings: [] };
    if (command === 'save_document') throw { message: 'read failed', uncertain: true };
  });
  const { view } = await import('../../src/web/main');
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  const saveAs = () => view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'S', shiftKey: true, metaKey: /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    ctrlKey: !/Mac|iPhone|iPad|iPod/.test(navigator.platform), bubbles: true, cancelable: true,
  }));
  view.dispatch({ changes: { from: 0, insert: 'captured' } });
  saveAs();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('uncertain'));
  view.dispatch({ changes: { from: 8, insert: ' newer' } });
  saveAs();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('Check the last save'));
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.invoke.mock.calls.filter(([command]) => command === 'save_document')).toHaveLength(1);
  document.querySelector<HTMLButtonElement>('#check')!.click();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toBe('first.md • Unsaved'));
  expect(view.state.doc.toString()).toBe('captured newer');
  window.dispatchEvent(new Event('pagehide')); view.destroy();
});
