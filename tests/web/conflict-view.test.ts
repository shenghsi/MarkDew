// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { undo } from '@codemirror/commands';
import { openConflict, type ConflictHost } from '../../src/web/conflict-view';
import { savedSource, sourceField } from '../../src/web/source';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

const source = '\uFEFFeditor\r\nkeep\rtail\n';
const disk = { source: '\uFEFFdisk\r\nkeep\rtail\n', generation: 3 };
const host = (extra: Partial<ConflictHost> = {}): ConflictHost => ({
  fileName: 'a.md', current: () => source, disk, readDisk: async () => disk,
  apply: vi.fn().mockResolvedValue(undefined), confirmDiscard: () => true, closed: vi.fn(), ...extra,
});
const click = (text: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('.compare-bar button')).find(b => b.textContent === text)!.click();
const right = () => EditorView.findFromDOM(document.querySelectorAll<HTMLElement>('.cm-mergeViewEditor .cm-editor')[1])!;
afterEach(() => { document.body.replaceChildren(); });

it('shows disk and editor differences without Git, and accepts exact disk source', async () => {
  const h = host(); openConflict(h, document.body);
  expect(document.querySelector('.conflict-labels')!.textContent).toBe('DiskEditor');
  expect(document.querySelectorAll('.cm-changedText').length).toBeGreaterThan(0);
  expect(EditorView.findFromDOM(document.querySelector<HTMLElement>('.cm-editor')!)!.state.readOnly).toBe(true);
  click('Use disk');
  await vi.waitFor(() => expect(h.closed).toHaveBeenCalled());
  expect(h.apply).toHaveBeenCalledWith(disk.source, disk, source);
});
it('accepts the editor version without changing its exact source', async () => {
  const h = host(); openConflict(h, document.body); click('Use editor');
  await vi.waitFor(() => expect(h.closed).toHaveBeenCalled());
  expect(h.apply).toHaveBeenCalledWith(source, disk, source);
});
it('supports edits, Undo, chunk copy, and application of a merged draft', async () => {
  const h = host(); openConflict(h, document.body);
  const view = right();
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' draft' } });
  expect(undo(view)).toBe(true);
  expect(savedSource(view.state.field(sourceField))).toBe(source);
  await vi.waitFor(() => expect(document.querySelector('button[aria-label="Copy this disk change to the editor"]')).not.toBeNull());
  const copy = document.querySelector<HTMLButtonElement>('button[aria-label="Copy this disk change to the editor"]')!;
  copy.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(view.state.doc.toString()).toContain('disk');
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' merged' } });
  click('Apply merged text');
  await vi.waitFor(() => expect(h.closed).toHaveBeenCalled());
  expect(h.apply).toHaveBeenCalledWith('\uFEFFdisk\r\nkeep\rtail\n merged', disk, source);
});
it('retains a draft after failed acceptance and refreshes disk without replacing the draft', async () => {
  const fresh = { source: 'new disk\n', generation: 5 };
  const h = host({ apply: vi.fn().mockRejectedValue(new Error('The file changed again.')), readDisk: async () => fresh });
  const handle = openConflict(h, document.body); right().dispatch({ changes: { from: 0, insert: 'draft ' } });
  click('Apply merged text');
  await vi.waitFor(() => expect(document.querySelector('.compare-note')!.textContent).toContain('file changed again'));
  expect(h.closed).not.toHaveBeenCalled(); expect(handle.dirty()).toBe(true);
  click('Refresh disk');
  await vi.waitFor(() => expect(document.querySelector('.cm-mergeViewEditor')!.textContent).toContain('new disk'));
  expect(right().state.doc.toString()).toContain('draft editor');
  (h.apply as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  click('Apply merged text');
  await vi.waitFor(() => expect(h.closed).toHaveBeenCalled());
  expect(h.apply).toHaveBeenLastCalledWith('\uFEFFdraft editor\r\nkeep\rtail\n', fresh, source);
});
it('keeps a dirty comparison when Close is cancelled', async () => {
  const h = host({ confirmDiscard: () => false }); const handle = openConflict(h, document.body);
  right().dispatch({ changes: { from: 0, insert: 'draft ' } });
  await handle.close(); expect(h.closed).not.toHaveBeenCalled(); expect(handle.element.isConnected).toBe(true);
  h.confirmDiscard = () => true; await handle.close();
});
