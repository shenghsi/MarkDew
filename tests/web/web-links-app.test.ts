// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { ensureSyntaxTree } from '@codemirror/language';
import { undoDepth } from '@codemirror/commands';
import { startupFixture } from './startup-fixture';
import { fromSource, normalize, restoreSource, savedSource, sourceField } from '../../src/web/source';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(),
  onCloseRequested: async () => vi.fn(), listen: async () => vi.fn() }) }));

it('uses the guarded native web-link route without changing source, baseline, or history', async () => {
  let resolve!: () => void;
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') return startupFixture({ session: 'current', revision: 0, entries: [], warnings: [] });
    if (command === 'open_web_link') return new Promise<void>(yes => { resolve = yes; });
    if (command === 'quit_ready') return null;
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const source = () => savedSource(view.state.field(sourceField)), calls = () => mocks.invoke.mock.calls.filter(([command]) => command === 'open_web_link');
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const key = () => view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true }));
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    const original = '\uFEFF[Web](HTTPS://Example.com/path?q=1&amp;x=2)\r\n\r\n# Target\rEnd\n', record = fromSource(original);
    view.dispatch({ changes: { from: 0, insert: normalize(record.raw) }, effects: restoreSource.of(record), selection: { anchor: 1 } });
    expect(ensureSyntaxTree(view.state, view.state.doc.length, 1000)).not.toBeNull(); view.dispatch({});
    const depth = undoDepth(view.state), baseline = tabs.active.baseline;
    view.focus(); key(); expect(calls()).toEqual([['open_web_link', { url: 'https://example.com/path?q=1&x=2' }]]);
    resolve(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toBe('Web link open requested.'));
    expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
    const form = document.createElement('input'); document.body.append(form);
    form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); key();
    expect(calls()).toHaveLength(1); expect(source()).toBe(original);
    form.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    document.querySelector<HTMLButtonElement>('#source')!.click(); key(); expect(calls()).toHaveLength(2);
    const status = document.querySelector('#status')!.textContent;
    window.dispatchEvent(new Event('pagehide')); resolve(); await new Promise(yes => setTimeout(yes, 0));
    expect(document.querySelector('#status')!.textContent).toBe(status); expect(source()).toBe(original);
    expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
