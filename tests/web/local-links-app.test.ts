// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { ensureSyntaxTree } from '@codemirror/language';
import { undoDepth } from '@codemirror/commands';
import { fromSource, normalize, restoreSource, savedSource, sourceField } from '../../src/web/source';
import { startupFixture } from './startup-fixture';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: async () => vi.fn(), listen: async () => vi.fn() }) }));

it('opens local links with tab reuse, exact retained source/history, guards and late result rejection', async () => {
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  let next = 0, fail = false, pending: ((value: { path: string; origin: string }) => void) | undefined, delay = false;
  const targetSource = '\uFEFF# Target\r\n\r\n日本語\rEnd\n';
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string; destination?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'resolve_document_link') {
      if (fail) throw new Error('Missing linked file');
      if (delay) return new Promise(yes => { pending = yes; });
      return { path: args.destination === 'origin.md' ? '/root/origin.md' : args.destination === 'bad.md' ? '/root/bad.md' : '/root/target.md', origin: '/root/origin.md' };
    }
    if (command === 'open_document') { if (args.path === '/root/bad.md') throw new Error('Read failed'); return { path: args.path, source: targetSource }; }
    if (command === 'quit_ready') return null;
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const source = () => savedSource(view.state.field(sourceField));
  const key = () => { ensureSyntaxTree(view.state, view.state.doc.length, 1000); view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Enter', ctrlKey: !/Mac|iPhone|iPad|iPod/.test(navigator.platform), metaKey: /Mac|iPhone|iPad|iPod/.test(navigator.platform), bubbles: true, cancelable: true })); };
  const calls = () => mocks.invoke.mock.calls.filter(([command]) => command === 'resolve_document_link');
  const selectOrigin = () => { document.querySelector<HTMLButtonElement>('#document-tab-0')!.click(); view.dispatch({ selection: { anchor: 1 } }); };
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    const original = '\uFEFF[go](target.md#target)\r\n\r\n[own](origin.md#missing)\r\n\r\n[bad](bad.md)\rEnd\n', record = fromSource(original);
    view.dispatch({ changes: { from: 0, insert: normalize(record.raw) }, effects: restoreSource.of(record), selection: { anchor: 1 } });
    tabs.active.path = '/root/origin.md'; const origin = tabs.active, depth = undoDepth(view.state), baseline = origin.baseline;
    const form = document.createElement('input'); document.body.append(form); form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    key(); expect(calls()).toHaveLength(0); form.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); form.remove();
    key(); await vi.waitFor(() => expect(tabs.all).toHaveLength(2)); await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    expect(calls()[0]).toEqual(['resolve_document_link', { document: 0, documentPath: '/root/origin.md', destination: 'target.md' }]);
    expect(source()).toBe(targetSource); expect(view.state.selection.main.head).toBe(0); expect(undoDepth(view.state)).toBe(0);
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' draft' } }); const dirty = source(), dirtyDepth = undoDepth(view.state);
    selectOrigin(); expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(depth); expect(origin.baseline).toBe(baseline);
    key(); await vi.waitFor(() => expect(tabs.active.id).toBe(1)); await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    expect(next).toBe(1); expect(source()).toBe(dirty); expect(undoDepth(view.state)).toBe(dirtyDepth);
    selectOrigin(); view.dispatch({ selection: { anchor: view.state.doc.toString().indexOf('[own]') + 1 } });
    key(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toMatch(/not found/));
    expect(tabs.active).toBe(origin); expect(next).toBe(1); expect(source()).toBe(original);
    view.dispatch({ selection: { anchor: 1 } }); fail = true; key(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('Missing linked file'));
    expect(tabs.active).toBe(origin); expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(depth);
    fail = false; view.dispatch({ selection: { anchor: view.state.doc.toString().indexOf('[bad]') + 1 } }); key();
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('Read failed'));
    expect(tabs.all).toHaveLength(2); expect(tabs.active).toBe(origin); expect(source()).toBe(original); expect(origin.baseline).toBe(baseline);
    expect(mocks.invoke.mock.calls.some(([command, args]) => command === 'retire_document' && args.document === 2)).toBe(true);
    view.dispatch({ selection: { anchor: 1 } });
    fail = false; delay = true; key(); expect(view.state.readOnly).toBe(true); const count = calls().length;
    key(); expect(calls()).toHaveLength(count);
    view.dispatch({ selection: { anchor: 2 } }); pending!({ path: '/root/target.md', origin: '/root/origin.md' });
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false)); expect(tabs.active).toBe(origin); expect(source()).toBe(original);
    view.dispatch({ selection: { anchor: 1 } }); key(); window.dispatchEvent(new Event('pagehide'));
    pending!({ path: '/root/target.md', origin: '/root/origin.md' }); await new Promise(yes => setTimeout(yes, 0));
    expect(tabs.active).toBe(origin); expect(source()).toBe(original); expect(next).toBe(2);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
