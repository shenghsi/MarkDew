// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { undo, undoDepth } from '@codemirror/commands';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import type { DragDropEvent } from '@tauri-apps/api/window';
import { savedSource, sourceField } from '../../src/web/source';
import { imagePath } from '../../src/web/images';
import { tableEditor } from '../../src/web/table';
// jsdom has no text layout. This test checks state and input guards, not geometry.
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn(), unlisten: vi.fn(),
  drop: undefined as undefined | ((event: { payload: DragDropEvent }) => void) }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onCloseRequested: vi.fn(), listen: vi.fn(),
  onDragDropEvent: async (callback: typeof mocks.drop) => { mocks.drop = callback; return mocks.unlisten; } }) }));

it('opens dropped files through guarded recovery and exact source loading', async () => {
  let checkpointFails = false, readFails = false, uncertainSave = false;
  let confirmation: Promise<boolean> | undefined;
  let next = 0;
  const loaded = '\uFEFF日本語😀\r\nbody\rtail\n';
  mocks.ask.mockImplementation(() => confirmation || Promise.resolve(true));
  mocks.save.mockResolvedValue('/tmp/uncertain.md');
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') return startupFixture({ session: 'current', revision: 0, entries: [], warnings: [] });
    if (command === 'create_document') return ++next;
    if (command === 'recovery_document') return { session: `tab-${next}`, revision: 0, entries: [], warnings: [] };
    if (command === 'recovery_start' || command === 'recovery_list') return { session: 'current', revision: 0, entries: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'recovery_checkpoint' && checkpointFails) throw 'checkpoint failed';
    if (command === 'open_document') { if (readFails) throw 'read failed'; return { source: loaded, path: args.path }; }
    if (command === 'save_document' && uncertainSave) throw { uncertain: true, message: 'sync failed' };
  });
  const calls = (name: string) => mocks.invoke.mock.calls.filter(([command]) => command === name);
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const source = () => savedSource(view.state.field(sourceField));
  const drop = (paths: string[]) => mocks.drop!({ payload: { type: 'drop', paths, position: new PhysicalPosition(0, 0) } });
  const unlocked = () => expect(view.state.readOnly).toBe(false);
  try {
    await vi.waitFor(() => expect(mocks.drop).toBeDefined());
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    view.dispatch({ changes: { from: 0, insert: 'draft' }, selection: { anchor: 5 } });
    const tableSource = '| A |\n| - |\n| cell |\n\nEnd';
    view.dispatch({ changes: { from: 0, to: 5, insert: tableSource }, selection: { anchor: tableSource.length } });
    const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 0);
    const child = table.child!;
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    drop(['cell.md']); expect(mocks.ask).not.toHaveBeenCalled(); expect(source()).toBe(tableSource); expect(table.child).toBe(child);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    table.finish(); undo(view); expect(source()).toBe('draft');
    const depth = undoDepth(view.state);
    drop(['a.md', 'b.md']); drop(['image.png']); expect(calls('open_document')).toHaveLength(0); expect(source()).toBe('draft');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    drop(['a.md']); expect(mocks.ask).not.toHaveBeenCalled(); expect(source()).toBe('draft');
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    checkpointFails = true; drop(['a.md']);
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('checkpoint failed'));
    expect(source()).toBe('draft'); expect(calls('open_document')).toHaveLength(0); await vi.waitFor(unlocked);
    checkpointFails = false; readFails = true; drop(['a.md']);
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('read failed'));
    expect(source()).toBe('draft'); expect(undoDepth(view.state)).toBe(depth); await vi.waitFor(unlocked);
    readFails = false;
    const literal = 'C:\\notes\\日本語 %23#.MD'; drop([literal]); expect(view.state.readOnly).toBe(true);
    drop(['second.md']); expect(mocks.ask).not.toHaveBeenCalled();
    await vi.waitFor(() => { expect(source()).toBe(loaded); unlocked(); });
    expect(calls('open_document').at(-1)![1]).toEqual({ document: 2, path: literal });
    expect(view.state.field(imagePath)).toBe(literal); expect(undoDepth(view.state)).toBe(0);
    expect(mocks.open).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('#save')!.click();
    await vi.waitFor(() => expect(calls('save_document')).toHaveLength(1));
    expect(calls('save_document')[0][1]).toEqual({ document: 2, path: literal, source: loaded }); await vi.waitFor(unlocked);
    // Save does not lock input. Its recovery continuation must finish before
    // the next file command, so an unlocked edit surface is not a busy-state check.
    await new Promise(resolve => setTimeout(resolve, 0));
    uncertainSave = true; document.querySelector<HTMLButtonElement>('#save-as')!.click();
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('uncertain'));
    // Open adds another tab even when the previous tab has uncertain Save.
    drop(['new.md']); await vi.waitFor(() => expect(calls('open_document')).toHaveLength(3));
    await vi.waitFor(unlocked); expect(source()).toBe(loaded); expect(mocks.ask).not.toHaveBeenCalled();
    const count = calls('open_document').length;
    window.dispatchEvent(new Event('pagehide')); expect(mocks.unlisten).toHaveBeenCalledTimes(1);
    drop(['late.md']); expect(calls('open_document')).toHaveLength(count);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
