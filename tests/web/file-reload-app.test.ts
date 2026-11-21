// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), save: vi.fn(), ask: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(), listen: vi.fn() }) }));
it('loads disk changes, combines separate edits, and retains conflicts and failed reads', async () => {
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
  let disk = '\uFEFFalpha\r\nbeta\rgamma\n', generation = 1, rejectAccept = false;
  mocks.invoke.mockImplementation(async (command: string, args: any) => {
    if (command === 'document_start') return startupFixture({ session: 'reload', revision: 0, entries: [], warnings: [] });
    if (command === 'create_document') return 1;
    if (command === 'recovery_document') return { session: 'reload-tab', revision: 0, entries: [], warnings: [] };
    if (command === 'open_document') return { path: '/tmp/reload.md', source: disk };
    if (command === 'file_status') return { kind: 'changed', generation, source: disk };
    if (command === 'accept_file_change') {
      if (rejectAccept) throw 'The file changed again.';
      expect(args.source).toBe(disk); expect(args.generation).toBe(generation); generation++;
    }
  });
  mocks.open.mockResolvedValue('/tmp/reload.md');
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  const source = () => savedSource(view.state.field(sourceField));
  const check = () => document.querySelector<HTMLButtonElement>('#check-file')!.click();
  document.querySelector<HTMLButtonElement>('#open')!.click();
  await vi.waitFor(() => { expect(source()).toBe(disk); expect(view.state.readOnly).toBe(false); });
  disk = disk.replace('gamma', 'external'); check();
  await vi.waitFor(() => { expect(source()).toBe(disk); expect(view.state.readOnly).toBe(false); });
  expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ changes: { from: 0, to: 5, insert: '日本語😀' } });
  disk = disk.replace('external', 'changed again'); check();
  const merged = disk.replace('alpha', '日本語😀');
  await vi.waitFor(() => { expect(source()).toBe(merged); expect(view.state.readOnly).toBe(false); });
  expect(document.querySelector('#status')!.textContent).toContain('Unsaved');
  expect(undoDepth(view.state)).toBe(2);
  expect((document.querySelector('.file-warning') as HTMLElement).hidden).toBe(true);
  expect(mocks.ask).not.toHaveBeenCalled();
  const accepted = () => mocks.invoke.mock.calls.filter(([name]) => name === 'accept_file_change').length;
  const count = accepted(), depth = undoDepth(view.state);
  disk = disk.replace('alpha', 'conflicting'); check();
  await vi.waitFor(() => expect((document.querySelector('.file-warning') as HTMLElement).hidden).toBe(false));
  expect(document.querySelector('.file-warning')!.textContent).toContain('The file on disk conflicts with the text in the editor. Your editor text is kept.');
  expect(source()).toBe(merged); expect(undoDepth(view.state)).toBe(depth); expect(accepted()).toBe(count);
  disk = disk.replace('conflicting', 'alpha').replace('beta', 'remote'); rejectAccept = true; check();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('file changed again'));
  expect(source()).toBe(merged); expect(undoDepth(view.state)).toBe(depth);
  rejectAccept = false; check();
  await vi.waitFor(() => { expect(source()).toBe(disk.replace('alpha', '日本語😀')); expect(view.state.readOnly).toBe(false); });
  // Saving the merged editor text must still use the disk snapshot as its baseline.
  document.querySelector<HTMLButtonElement>('#save')!.click();
  await vi.waitFor(() => {
    expect(mocks.invoke).toHaveBeenCalledWith('save_document', expect.objectContaining({ source: source() }));
    expect(document.querySelector('#status')!.textContent).not.toContain('Unsaved');
  });

  // Reloading from disk preserves scroll position and mapped selection instead of jumping to the end of the file.
  view.dispatch({ selection: { anchor: 3, head: 3 } });
  view.scrollDOM.scrollTop = 180;
  disk = `${source()}\nExtra trailing paragraph added on disk\n`;
  check();
  await vi.waitFor(() => { expect(source()).toBe(disk); expect(view.state.readOnly).toBe(false); });
  expect(view.state.selection.main.head).toBe(3);
  expect(view.scrollDOM.scrollTop).toBe(180);

  window.dispatchEvent(new Event('pagehide')); view.destroy();
});
