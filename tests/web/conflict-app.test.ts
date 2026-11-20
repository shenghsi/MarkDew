// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { EditorView } from '@codemirror/view';
import { undoDepth, undo } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), save: vi.fn(), ask: vi.fn(), close: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: mocks.close, listen: vi.fn() }) }));
it('reviews a conflict in a Diff tab, rejects stale acceptance, and keeps an edited merge', async () => {
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
  let disk = '\uFEFFbase\r\nshared\n', generation = 1, checks = 0;
  mocks.ask.mockResolvedValue(true);
  mocks.invoke.mockImplementation(async (command: string, args: any) => {
    if (command === 'document_start') return startupFixture({ session: 'conflict', revision: 0, entries: [], warnings: [] });
    if (command === 'create_document') return 1;
    if (command === 'recovery_document') return { session: 'conflict-tab', revision: 0, entries: [], warnings: [] };
    if (command === 'open_document') return { path: '/tmp/conflict.md', source: disk };
    if (command === 'file_status') { checks++; return { kind: 'changed', generation, source: disk }; }
    if (command === 'accept_file_change') {
      if (args.source !== disk || args.generation !== generation) throw 'The file changed again.';
      generation++;
    }
  });
  mocks.open.mockResolvedValue('/tmp/conflict.md');
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  const source = () => savedSource(view.state.field(sourceField));
  const button = (label: string, parent: ParentNode = document) => Array.from(parent.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent === label)!;
  const check = () => document.querySelector<HTMLButtonElement>('#check-file')!.click();
  document.querySelector<HTMLButtonElement>('#open')!.click();
  await vi.waitFor(() => { expect(source()).toBe(disk); expect(view.state.readOnly).toBe(false); });
  view.dispatch({ changes: { from: 0, to: 4, insert: 'editor' } });
  const editor = source(); disk = disk.replace('base', 'disk'); check();
  await vi.waitFor(() => expect(button('Review differences').hidden).toBe(false));
  button('Review differences').click();
  await vi.waitFor(() => expect(document.querySelector('.conflict-view')).not.toBeNull());
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  expect(document.querySelector('.document-tab-list')!.textContent).toContain('Diff: conflict.md');
  expect(mocks.invoke.mock.calls.some(([name]) => name === 'git_info')).toBe(false);
  const count = checks; check(); expect(checks).toBe(count);
  const panel = document.querySelector<HTMLElement>('.conflict-view')!;
  const draft = EditorView.findFromDOM(panel.querySelectorAll<HTMLElement>('.cm-mergeViewEditor .cm-editor')[1])!;
  draft.dispatch({ changes: { from: draft.state.doc.length, insert: 'merged' } });
  expect(source()).toBe(editor);
  mocks.ask.mockResolvedValueOnce(false);
  const closeEvent = { preventDefault: vi.fn() };
  await mocks.close.mock.calls[0][0](closeEvent);
  expect(closeEvent.preventDefault).toHaveBeenCalled();
  expect(mocks.ask).toHaveBeenCalledWith('conflict.md: Discard your edits in this view?', expect.anything());
  expect(panel.isConnected).toBe(true); expect(draft.state.doc.toString()).toContain('merged');
  disk = disk.replace('disk', 'latest disk'); generation++;
  button('Apply merged text', panel).click();
  await vi.waitFor(() => expect(panel.querySelector('.compare-note')!.textContent).toContain('file changed again'));
  expect(source()).toBe(editor); expect(panel.isConnected).toBe(true);
  button('Refresh disk', panel).click();
  await vi.waitFor(() => expect(panel.querySelector('.cm-mergeViewEditor')!.textContent).toContain('latest disk'));
  button('Apply merged text', panel).click();
  await vi.waitFor(() => { expect(source()).toBe(editor + 'merged'); expect(panel.isConnected).toBe(false); expect(view.state.readOnly).toBe(false); });
  expect(document.querySelector('#status')!.textContent).toContain('Unsaved');
  expect(undo(view)).toBe(true); expect(source()).toBe(editor);
  // A direct editor choice accepts the new disk baseline without replacing editor text.
  disk = disk.replace('latest disk', 'another disk'); check();
  await vi.waitFor(() => expect((document.querySelector('.file-warning') as HTMLElement).hidden).toBe(false));
  button('Use editor').click();
  await vi.waitFor(() => { expect((document.querySelector('.file-warning') as HTMLElement).hidden).toBe(true); expect(view.state.readOnly).toBe(false); });
  expect(source()).toBe(editor);
  expect(mocks.invoke.mock.calls.some(([name]) => name === 'save_document')).toBe(false);
  document.querySelector<HTMLButtonElement>('#save')!.click();
  await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('save_document', expect.objectContaining({ source: editor })));
  window.dispatchEvent(new Event('pagehide')); view.destroy();
});
