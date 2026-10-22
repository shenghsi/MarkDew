// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { undoDepth } from '@codemirror/commands';
import { tableEditor } from '../../src/web/table';
import { fromSource, restoreSource, savedSource, sourceField } from '../../src/web/source';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({
  onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(), listen: vi.fn(),
}) }));

it('uses guarded native file commands from editor, cell, and form shortcuts', async () => {
  mocks.ask.mockResolvedValue(false); mocks.open.mockResolvedValue(null);
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') return startupFixture({ session: 'current', revision: 0, entries: [], warnings: [] });
    if (command === 'create_document') return 1;
    if (command === 'recovery_document') return { session: 'tab-one', revision: 0, entries: [], warnings: [] };
    if (command === 'recovery_start' || command === 'recovery_list') return { session: 'current', revision: 0, entries: [], warnings: [] };
    if (command === 'quit_ready') return null;
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  const source = '\uFEFF| A |\r\n| - |\r\n| 文 |\r\n\r\nEnd';
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const key = (target: Element, name: string) => target.dispatchEvent(new KeyboardEvent('keydown', {
    key: name, metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true,
  }));
  try {
    // Canceling the native picker on a clean document retains its state.
    key(view.contentDOM, 'o');
    await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.state.doc.length).toBe(0); expect(undoDepth(view.state)).toBe(0);
    view.dispatch({ changes: { from: 0, insert: source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') },
      effects: restoreSource.of(fromSource(source)), selection: { anchor: source.length - 7 } });
    const before = savedSource(view.state.field(sourceField)), depth = undoDepth(view.state);
    const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 0);
    const child = table.child!; key(child.contentDOM, 'o');
    await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(2)); await new Promise(resolve => setTimeout(resolve, 0));
    expect(table.child).toBe(child); expect(mocks.ask).not.toHaveBeenCalled();
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); key(child.contentDOM, 'n');
    expect(mocks.invoke.mock.calls.filter(([command]) => command === 'create_document')).toHaveLength(0);
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); table.finish();
    // A form IME session must also prevent a global file shortcut.
    const field = document.createElement('input'); document.body.append(field);
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); key(field, 'n');
    expect(mocks.invoke.mock.calls.filter(([command]) => command === 'create_document')).toHaveLength(0);
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); key(field, 'n');
    await vi.waitFor(() => expect(tabs.active.id).toBe(1)); await new Promise(resolve => setTimeout(resolve, 0));
    expect(view.state.doc.length).toBe(0); expect(mocks.ask).not.toHaveBeenCalled();
    document.querySelector<HTMLButtonElement>('[data-document="0"]')!.click();
    expect(savedSource(view.state.field(sourceField))).toBe(before); expect(undoDepth(view.state)).toBe(depth);
    window.dispatchEvent(new Event('pagehide')); key(field, 'n');
    expect(mocks.invoke.mock.calls.filter(([command]) => command === 'create_document')).toHaveLength(1);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
