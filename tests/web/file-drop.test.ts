import { expect, it, vi } from 'vitest';
import type { DragDropEvent } from '@tauri-apps/api/window';
import { PhysicalPosition } from '@tauri-apps/api/dpi';
import { droppedDocument, droppedImage, fileDrops } from '../../src/web/file-drop';
const turn = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };
it('routes raster drops separately from document Open and clears their hint', async () => {
  let handler!: (event: { payload: DragDropEvent }) => void;
  const image = vi.fn(), open = vi.fn(), report = vi.fn(), hint = vi.fn();
  const dispose = fileDrops(async callback => { handler = callback; return () => {}; }, open, report, hint, image);
  await turn();
  for (const path of ['/tmp/图.PNG', 'C:\\images\\a.JPEG', '\\\\server\\share\\a.webp', '/tmp/a.gif']) expect(droppedImage([path])).toBe(path);
  expect(droppedImage(['a.svg'])).toBe('a.svg');
  for (const paths of [[], ['a.png', 'b.png'], ['a.svgz'], ['a.png\0'], ['a.png.exe']]) expect(droppedImage(paths)).toBeUndefined();
  const position = new PhysicalPosition(40, 80);
  handler({ payload: { type: 'enter', paths: ['/tmp/a.png'], position } }); expect(hint).toHaveBeenLastCalledWith(true, true);
  handler({ payload: { type: 'drop', paths: ['/tmp/a.png'], position } }); expect(image).toHaveBeenCalledWith('/tmp/a.png', position);
  expect(open).not.toHaveBeenCalled(); expect(hint).toHaveBeenLastCalledWith(false);
  handler({ payload: { type: 'drop', paths: ['/tmp/a.md'], position } }); expect(open).toHaveBeenCalledWith('/tmp/a.md');
  dispose(); handler({ payload: { type: 'drop', paths: ['/tmp/b.png'], position } }); expect(image).toHaveBeenCalledTimes(1);
});
it('routes one supported literal path and rejects multiple files and unsupported names', () => {
  for (const path of ['/tmp/日本語 %23#.md', 'C:\\notes\\文.MARKDOWN', '\\\\server\\share\\a.TXT'])
    expect(droppedDocument([path])).toBe(path);
  for (const paths of [[], ['a.md', 'b.md'], ['a.png'], ['a.md/'], ['a.md\0'], ['a.md.exe']])
    expect(droppedDocument(paths)).toBeUndefined();
});
it('clears the hint and disposes handlers, including a late registration', async () => {
  let handler!: (event: { payload: DragDropEvent }) => void, finish!: (remove: () => void) => void;
  const pending = new Promise<() => void>(resolve => { finish = resolve; });
  const open = vi.fn(), report = vi.fn(), hint = vi.fn(), remove = vi.fn();
  const dispose = fileDrops(callback => { handler = callback; return pending; }, open, report, hint);
  await turn();
  const position = new PhysicalPosition(0, 0);
  handler({ payload: { type: 'enter', paths: ['a.md'], position } }); expect(hint).toHaveBeenLastCalledWith(true);
  handler({ payload: { type: 'leave' } }); expect(hint).toHaveBeenLastCalledWith(false);
  handler({ payload: { type: 'drop', paths: ['a.png'], position } }); expect(open).not.toHaveBeenCalled(); expect(report).toHaveBeenCalled();
  handler({ payload: { type: 'drop', paths: ['a.md'], position } }); expect(open).toHaveBeenCalledWith('a.md');
  dispose(); expect(hint).toHaveBeenLastCalledWith(false); finish(remove); await turn(); expect(remove).toHaveBeenCalledTimes(1);
  handler({ payload: { type: 'drop', paths: ['b.md'], position } }); expect(open).toHaveBeenCalledTimes(1);
  dispose(); expect(remove).toHaveBeenCalledTimes(1);
});
it('reports registration errors and suppresses errors after disposal', async () => {
  const report = vi.fn(), hint = vi.fn();
  fileDrops(async () => { throw 'unavailable'; }, vi.fn(), report, hint); await turn(); await turn();
  expect(report).toHaveBeenCalledWith(expect.stringContaining('Use Open')); expect(hint).toHaveBeenLastCalledWith(false);
  report.mockClear();
  const dispose = fileDrops(async () => { throw 'late'; }, vi.fn(), report, hint); dispose(); await turn(); await turn();
  expect(report).not.toHaveBeenCalled();
});
