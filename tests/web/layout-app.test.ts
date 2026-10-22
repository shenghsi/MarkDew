// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: mocks.open, save: vi.fn(), ask: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({
  onCloseRequested: vi.fn(), onDragDropEvent: async () => () => {}, listen: async () => () => {},
}) }));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let app: typeof import('../../src/web/main') | undefined;
afterEach(() => { window.dispatchEvent(new Event('pagehide')); app?.view.destroy(); app = undefined; localStorage.clear(); });

it.each(['files', 'outline', 'hidden'])('restores %s once without opening a document and retains source and history through pane changes', async sidebar => {
  vi.resetModules(); mocks.invoke.mockReset(); mocks.open.mockReset();
  const folder = '/notes/日本語 %23#', original = '\uFEFF# Heading\r\n日本語😀\rtail\n';
  localStorage.setItem('markdew.layout', JSON.stringify({ version: 1, folder, sidebar }));
  let startupFails = true;
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') {
      if (startupFails) throw 'startup failed';
      return { documents: [{ id: 7, path: '/notes/a.md', baseline: original, uncertain: false }],
        sessions: [{ document: 7, session: 'current', revision: 0 }],
        recovery: { session: 'current', revision: 0, entries: [], warnings: [] } };
    }
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'list_directory') return { entries: [{ name: 'doc.md', path: folder + '/doc.md', directory: false }], warnings: [] };
  });
  document.body.innerHTML = '<div id="app"></div>'; app = await import('../../src/web/main');
  const files = document.querySelector<HTMLElement>('#files')!, outline = document.querySelector<HTMLElement>('#outline')!;
  expect(files.hidden).toBe(sidebar !== 'files'); expect(outline.hidden).toBe(sidebar !== 'outline');
  await vi.waitFor(() => expect(document.body.textContent).toContain('startup failed'));
  const reads = () => mocks.invoke.mock.calls.filter(([command]) => command === 'list_directory');
  expect(reads()).toHaveLength(sidebar === 'files' ? 1 : 0);
  startupFails = false;
  Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Retry recovery')!.click();
  await vi.waitFor(() => expect(app!.view.state.readOnly).toBe(false));
  const { savedSource, sourceField } = await import('../../src/web/source');
  const { undo, undoDepth } = await import('@codemirror/commands');
  const view = app.view, source = () => savedSource(view.state.field(sourceField));
  expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(0);
  view.dispatch({ changes: { from: 3, insert: 'draft' }, selection: { anchor: 8 }, userEvent: 'input.type' });
  const before = source(), depth = undoDepth(view.state), selection = view.state.selection, baseline = app.tabs.active.baseline;
  if (files.hidden && !outline.hidden) document.querySelector<HTMLButtonElement>('.sidebar-tab-files')!.click();
  else {
    if (!files.hidden) document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
    document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
  }
  await vi.waitFor(() => expect(files.textContent).toContain('doc.md'));
  expect(reads()).toHaveLength(1); expect(reads()[0][1]).toEqual({ path: folder });
  expect(JSON.parse(localStorage.getItem('markdew.layout')!)).toEqual({ version: 1, folder, sidebar: 'files', width: 250 });
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  document.querySelector<HTMLButtonElement>('#outline-toggle')!.click();
  expect(files.hidden).toBe(false); expect(JSON.parse(localStorage.getItem('markdew.layout')!).sidebar).toBe('files');
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  document.querySelector<HTMLButtonElement>('#outline-toggle')!.click();
  expect(outline.hidden).toBe(false); expect(JSON.parse(localStorage.getItem('markdew.layout')!).sidebar).toBe('outline');
  document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
  expect(outline.hidden).toBe(true); expect(files.hidden).toBe(true);
  expect(JSON.parse(localStorage.getItem('markdew.layout')!).sidebar).toBe('hidden');
  document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
  expect(outline.hidden).toBe(false); expect(files.hidden).toBe(true);
  expect(JSON.parse(localStorage.getItem('markdew.layout')!).sidebar).toBe('outline');
  expect(source()).toBe(before); expect(view.state.selection.eq(selection)).toBe(true);
  expect(undoDepth(view.state)).toBe(depth); expect(app.tabs.active.baseline).toBe(baseline);
  undo(view); expect(source()).toBe(original); expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.invoke.mock.calls.some(([command]) => command === 'open_document')).toBe(false);
  const preference = localStorage.getItem('markdew.layout'); window.dispatchEvent(new Event('pagehide'));
  document.querySelector<HTMLButtonElement>('#files-toggle')!.click();
  document.querySelector<HTMLButtonElement>('#outline-toggle')!.click();
  expect(localStorage.getItem('markdew.layout')).toBe(preference);
});
