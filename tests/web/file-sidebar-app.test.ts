// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
import { startupFixture } from './startup-fixture';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), ask: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: mocks.open, ask: mocks.ask, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(), listen: vi.fn() }) }));

it('opens sidebar files through document guards and retains dirty tabs on reuse and failed reads', async () => {
  let next = 0, fail = false;
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'list_directory') return { entries: [{ name: 'folder', path: '/root/folder', directory: true },
      { name: '日本語%20.md', path: '/root/日本語%20.md', directory: false }], warnings: [] };
    if (command === 'open_document') { if (fail) throw 'Read failed'; return { path: args.path, source: '\uFEFF日本語😀\r\nEnd' }; }
  });
  mocks.open.mockResolvedValue('/root'); document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const click = (id: string) => document.querySelector<HTMLButtonElement>(id)!.click();
  const source = () => savedSource(view.state.field(sourceField));
  const file = () => Array.from(document.querySelectorAll<HTMLButtonElement>('#files button')).find(button => button.textContent === '日本語%20.md')!;
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    view.dispatch({ changes: { from: 0, insert: 'original draft' } });
    const prior = view.state, depth = undoDepth(prior), baseline = tabs.active.baseline;
    click('#files-toggle'); document.querySelector<HTMLButtonElement>('.files-actions button')!.click();
    await vi.waitFor(() => expect(file()).toBeDefined());
    const folder = document.querySelector<HTMLButtonElement>('.files-folder')!;
    folder.focus(); folder.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(file());
    expect(source()).toBe('original draft'); expect(undoDepth(view.state)).toBe(depth); expect(tabs.active.baseline).toBe(baseline);
    expect(mocks.open).toHaveBeenCalledWith({ directory: true, multiple: false });
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); file().click();
    folder.focus(); folder.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(folder.getAttribute('aria-expanded')).toBe('false'); expect(document.activeElement).toBe(folder);
    expect(next).toBe(0); click('#outline-toggle'); expect(document.querySelector<HTMLElement>('#files')!.hidden).toBe(false);
    view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    const form = document.createElement('input'); document.querySelector('header')!.append(form);
    form.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    folder.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(folder); expect(source()).toBe('original draft');
    form.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); form.remove();
    file().click(); await vi.waitFor(() => expect(tabs.all).toHaveLength(2));
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    expect(source()).toBe('\uFEFF日本語😀\r\nEnd');
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' draft' } });
    const dirty = source(), dirtyDepth = undoDepth(view.state);
    file().click(); await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    expect(next).toBe(1); expect(source()).toBe(dirty); expect(undoDepth(view.state)).toBe(dirtyDepth);
    // Opening another listed path fails without replacing either retained tab.
    mocks.invoke.mockImplementationOnce(async () => ({ entries: [{ name: 'bad.md', path: '/root/bad.md', directory: false }], warnings: [] }));
    document.querySelectorAll<HTMLButtonElement>('.files-actions button')[1].click();
    await vi.waitFor(() => expect(document.querySelector('#files')!.textContent).toContain('bad.md'));
    fail = true; Array.from(document.querySelectorAll<HTMLButtonElement>('#files button')).find(button => button.textContent === 'bad.md')!.click();
    await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('Read failed'));
    expect(tabs.all).toHaveLength(2); expect(source()).toBe(dirty); expect(undoDepth(view.state)).toBe(dirtyDepth);
    click('#outline-toggle'); expect(document.querySelector<HTMLElement>('#files')!.hidden).toBe(true);
    expect(document.querySelector<HTMLElement>('#outline')!.hidden).toBe(false);
  } finally { window.dispatchEvent(new Event('pagehide')); view.destroy(); }
});
