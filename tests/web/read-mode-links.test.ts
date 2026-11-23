// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { ensureSyntaxTree } from '@codemirror/language';
import { fromSource, normalize, restoreSource } from '../../src/web/source';
import { startupFixture } from './startup-fixture';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: async () => vi.fn(),
    onCloseRequested: async () => vi.fn(),
    listen: async () => vi.fn(),
    startDragging: async () => {},
    toggleMaximize: async () => {},
  }),
}));

it('supports Live Mode default-app/new-tab links and Read Mode browser-like navigation', async () => {
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  let next = 0;
  const files: Record<string, string> = {
    '/root/a.md': '[go-b](b.md) and [pdf](report.pdf)',
    '/root/b.md': '[go-c](c.md)',
    '/root/c.md': '# Page C',
  };
  mocks.invoke.mockImplementation(async (command: string, args: { path?: string; destination?: string }) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'resolve_document_link') {
      if (args.destination === 'report.pdf') return { path: '/root/report.pdf', origin: '/root/a.md', kind: 'external' };
      if (args.destination === 'b.md') return { path: '/root/b.md', origin: '/root/a.md', kind: 'document' };
      if (args.destination === 'c.md') return { path: '/root/c.md', origin: '/root/b.md', kind: 'document' };
      throw new Error(`Unexpected destination: ${args.destination}`);
    }
    if (command === 'open_with_default_app') return 'opened';
    if (command === 'open_document') return { path: args.path, source: files[args.path!] ?? '' };
    if (command === 'quit_ready') return null;
    return null;
  });

  document.body.innerHTML = '<div id="app"></div>';
  const { view, tabs } = await import('../../src/web/main');
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const setDoc = (path: string, content: string) => {
    const record = fromSource(content);
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: normalize(record.raw) }, effects: restoreSource.of(record), selection: { anchor: 0 } });
    tabs.active.path = path;
    tabs.active.baseline = content;
    tabs.active.placeholder = false;
    ensureSyntaxTree(view.state, view.state.doc.length, 1000);
  };

  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    setDoc('/root/a.md', files['/root/a.md']);

    // Nav buttons are hidden in Live Editing mode
    const navControls = document.querySelector<HTMLElement>('.document-nav-controls')!;
    const backBtn = document.querySelector<HTMLButtonElement>('#nav-back')!;
    const forwardBtn = document.querySelector<HTMLButtonElement>('#nav-forward')!;
    expect(navControls.hidden).toBe(true);

    // Live Editing Mode: Ctrl/Cmd + click on non-Markdown file opens in default app
    const pdfPos = files['/root/a.md'].indexOf('[pdf]') + 1;
    vi.spyOn(view, 'posAtCoords').mockReturnValue(pdfPos);
    view.contentDOM.dispatchEvent(new MouseEvent('mousedown', {
      button: 0, ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true, clientX: 10, clientY: 10,
    }));
    await vi.waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith('open_with_default_app', { path: '/root/report.pdf' }));
    expect(tabs.all).toHaveLength(1);

    // Switch to Read Mode: Back/Forward controls become visible
    document.querySelector<HTMLButtonElement>('#read-mode')!.click();
    expect(navControls.hidden).toBe(false);
    expect(backBtn.disabled).toBe(true);
    expect(forwardBtn.disabled).toBe(true);

    // Read Mode: plain left-click opens b.md in the SAME tab
    const linkBPos = files['/root/a.md'].indexOf('[go-b]') + 1;
    vi.spyOn(view, 'posAtCoords').mockReturnValue(linkBPos);
    ensureSyntaxTree(view.state, view.state.doc.length, 1000);
    view.contentDOM.dispatchEvent(new MouseEvent('click', {
      button: 0, bubbles: true, cancelable: true, clientX: 10, clientY: 10,
    }));
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/b.md'));
    expect(tabs.all).toHaveLength(1);
    expect(backBtn.disabled).toBe(false);
    expect(forwardBtn.disabled).toBe(true);

    // Back button returns to a.md in the same tab
    backBtn.click();
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/a.md'));
    expect(backBtn.disabled).toBe(true);
    expect(forwardBtn.disabled).toBe(false);

    // Ctrl/Cmd+] shortcut goes forward to b.md, and Ctrl/Cmd+[ goes back
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/b.md'));
    expect(backBtn.disabled).toBe(false);
    expect(forwardBtn.disabled).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', ctrlKey: !isMac, metaKey: isMac, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/a.md'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/b.md'));

    // Read Mode: right-click on [go-c] shows "Open in New Tab" and opens c.md in a new tab
    ensureSyntaxTree(view.state, view.state.doc.length, 1000);
    vi.spyOn(view, 'posAtCoords').mockReturnValue(1);
    view.contentDOM.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
    const openNewTabItem = Array.from(document.querySelectorAll<HTMLElement>('.editor-context-menu .menu-item'))
      .find(item => item.querySelector('.menu-label')?.textContent === 'Open in New Tab');
    expect(openNewTabItem).toBeDefined();
    openNewTabItem!.click();
    await vi.waitFor(() => expect(tabs.all).toHaveLength(2));
    expect(tabs.active.path).toBe('/root/c.md');

    // In Read Mode, selecting/clicking a heading must NOT reveal its raw '#' syntax
    view.dispatch({ selection: { anchor: 2 } });
    expect(document.querySelector('#editor')!.classList.contains('editor-active')).toBe(false);
    expect(view.contentDOM.textContent).not.toContain('#');
    expect(view.contentDOM.textContent?.trim()).toBe('Page C');

    // Unsaved changes prompt when navigating in-place in Read Mode
    document.querySelector<HTMLButtonElement>('#document-tab-0')!.click();
    await vi.waitFor(() => expect(tabs.active.path).toBe('/root/b.md'));
    tabs.active.baseline = 'different baseline'; // mark dirty
    ensureSyntaxTree(view.state, view.state.doc.length, 1000);
    vi.spyOn(view, 'posAtCoords').mockReturnValue(1);
    // Clicking Back should trigger Save/Discard/Cancel dialog
    backBtn.click();
    await vi.waitFor(() => expect(document.querySelector('.unsaved-nav-dialog')).not.toBeNull());
    // Cancel keeps us on b.md and keeps Back enabled
    document.querySelector<HTMLButtonElement>('.unsaved-nav-dialog [data-action="cancel"]')!.click();
    await vi.waitFor(() => expect(document.querySelector('.unsaved-nav-dialog')).toBeNull());
    expect(tabs.active.path).toBe('/root/b.md');
    expect(backBtn.disabled).toBe(false);
  } finally {
    window.dispatchEvent(new Event('pagehide'));
    view.destroy();
  }
});
