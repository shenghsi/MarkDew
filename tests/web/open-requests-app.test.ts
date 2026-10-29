// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { undo, undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { imagePath } from '../../src/web/images';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), remove: vi.fn(), notify: undefined as (() => void) | undefined }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: mocks.open, save: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({
  onCloseRequested: vi.fn(), onDragDropEvent: async () => () => {},
  listen: async (name: string, callback: () => void) => {
    if (name === 'markdew-open-request') { mocks.notify = callback; return mocks.remove; }
    return () => {};
  },
}) }));

it('opens launch files after startup Retry and preserves existing tabs through failures and blocked requests', async () => {
  let startupFails = true, next = 0;
  const literal = '/notes/日本語 %23#.MD';
  const loaded = '\uFEFF日本語😀\r\nbody\rtail\n';
  let pending = [literal], warnings = ['Unsupported file skipped.', 'Only sixteen files can open.'], reply: Promise<{ source: string; path: string }> | undefined;
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') {
      if (startupFails) throw 'startup failed';
      return startupFixture({ session: 'current', revision: 0, entries: [], warnings: [] });
    }
    if (command === 'take_open_requests') { const batch = { paths: pending, warnings }; pending = []; warnings = []; return batch; }
    if (command === 'create_document') return ++next;
    if (command === 'recovery_document') return { session: `tab-${next}`, revision: 0, entries: [], warnings: [] };
    if (command === 'recovery_list') return { session: 'current', revision: 0, entries: [], warnings: [] };
    if (command === 'quit_ready') return null;
    if (command === 'open_document') {
      if (args.path === '/notes/fail.md') throw 'read failed';
      return reply ?? { source: loaded, path: args.path };
    }
  });
  const calls = (name: string) => mocks.invoke.mock.calls.filter(([command]) => command === name);
  localStorage.setItem('markdew.layout', JSON.stringify({ version: 1, folder: '/previously-closed-project', sidebar: 'hidden', width: 250 }));
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const source = () => savedSource(view.state.field(sourceField));
  const notify = (paths: string[]) => { pending.push(...paths); mocks.notify!(); };
  const unlocked = () => expect(view.state.readOnly).toBe(false);
  try {
    await vi.waitFor(() => expect(mocks.notify).toBeDefined());
    mocks.notify!(); expect(calls('take_open_requests')).toHaveLength(0);
    await vi.waitFor(() => expect(document.body.textContent).toContain('startup failed'));
    startupFails = false;
    Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Retry recovery')!.click();
    await vi.waitFor(() => { expect(source()).toBe(loaded); unlocked(); });
    expect(calls('open_document')[0][1]).toEqual({ document: 1, path: literal });
    expect(calls('open_folder_window')).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('markdew.layout')!).folder).toBe('/notes');
    expect(view.state.field(imagePath)).toBe(literal); expect(undoDepth(view.state)).toBe(0);
    const notice = document.querySelector<HTMLElement>('.native-open-notice')!;
    expect(notice.hidden).toBe(false); expect(notice.textContent).toContain('Unsupported file skipped.');
    expect(notice.textContent).toContain('Only sixteen files can open.');
    view.dispatch({ changes: { from: 0, insert: 'draft' }, selection: { anchor: 5 } });
    expect(notice.hidden).toBe(false); expect(notice.textContent).toContain('Unsupported file skipped.');
    notice.querySelector('button')!.click(); expect(notice.hidden).toBe(true);
    const draft = source(), depth = undoDepth(view.state);
    notify([literal]); await vi.waitFor(() => expect(calls('take_open_requests')).toHaveLength(2));
    expect(calls('open_document')).toHaveLength(1); expect(source()).toBe(draft); expect(undoDepth(view.state)).toBe(depth);
    await vi.waitFor(unlocked);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    notify(['/composition.md']);
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('repeat Open'));
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(calls('open_document')).toHaveLength(1); expect(source()).toBe(draft);
    notify(['/notes/second.md', '/notes/fail.md', '/notes/not-opened.md']);
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('read failed'));
    await vi.waitFor(unlocked); expect(source()).toBe(loaded); expect(view.state.field(imagePath)).toBe('/notes/second.md');
    expect(calls('open_document').map(([, args]) => args.path)).toEqual([literal, '/notes/second.md', '/notes/fail.md']);
    notify([literal]); await vi.waitFor(() => { expect(source()).toBe(draft); unlocked(); });
    undo(view); expect(source()).toBe(loaded);
    let finish!: (value: { source: string; path: string }) => void;
    reply = new Promise(done => { finish = done; });
    notify(['/notes/slow.md']); await vi.waitFor(() => expect(calls('open_document').at(-1)![1].path).toBe('/notes/slow.md'));
    notify(['/busy.md']); finish({ source: loaded, path: '/notes/slow.md' });
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('repeat Open'));
    await vi.waitFor(unlocked); expect(calls('open_document').some(([, args]) => args.path === '/busy.md')).toBe(false);
    expect(mocks.open).not.toHaveBeenCalled();
    const count = calls('open_document').length;
    window.dispatchEvent(new Event('pagehide')); notify(['/late.md']);
    expect(calls('open_document')).toHaveLength(count); expect(mocks.remove).toHaveBeenCalledTimes(1);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
