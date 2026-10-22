// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

it('removes bottom left status bar from visual layout and extends workspace', async () => {
  vi.resetModules(); mocks.invoke.mockReset(); mocks.open.mockReset();
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') {
      return { documents: [{ id: 1, path: '/notes/test.md', baseline: '# Hello', uncertain: false }],
        sessions: [{ document: 1, session: 'current', revision: 0 }],
        recovery: { session: 'current', revision: 0, entries: [], warnings: [] } };
    }
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
  });

  document.body.innerHTML = '<div id="app"></div>';
  app = await import('../../src/web/main');

  const statusBar = document.querySelector<HTMLElement>('.document-status');
  expect(statusBar).not.toBeNull();
  expect(statusBar!.hidden).toBe(true);

  // Status element exists and updates for accessibility / tests
  const statusEl = document.querySelector<HTMLElement>('#status');
  expect(statusEl).not.toBeNull();
  expect(statusEl!.textContent).toContain('test.md');

  // Verify CSS hides .document-status
  const css = readFileSync(resolve(__dirname, '../../src/web/style.css'), 'utf8');
  expect(css).toMatch(/#app\s+\.document-status[^}]*display:\s*none\s*!important/);
});

it.each([true, false])('toggles source code mode with keyboard shortcut (mac=%s)', async mac => {
  vi.resetModules(); mocks.invoke.mockReset(); mocks.open.mockReset();
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') {
      return { documents: [{ id: 1, path: '/notes/test.md', baseline: '# Title\n\nBody content', uncertain: false }],
        sessions: [{ document: 1, session: 'current', revision: 0 }],
        recovery: { session: 'current', revision: 0, entries: [], warnings: [] } };
    }
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'quit_ready') return null;
  });

  document.body.innerHTML = '<div id="app"></div>';
  app = await import('../../src/web/main');

  expect(app.tabs.active.sourceMode).toBe(false);

  // Trigger shortcut via window keydown
  const event = new KeyboardEvent('keydown', {
    key: '/',
    code: 'Slash',
    metaKey: mac,
    ctrlKey: !mac,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);

  expect(app.tabs.active.sourceMode).toBe(true);
  expect(document.querySelector('#editor')!.classList.contains('source-mode')).toBe(true);

  // Press again to toggle back
  const event2 = new KeyboardEvent('keydown', {
    key: '/',
    code: 'Slash',
    metaKey: mac,
    ctrlKey: !mac,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event2);

  expect(app.tabs.active.sourceMode).toBe(false);
  expect(document.querySelector('#editor')!.classList.contains('source-mode')).toBe(false);
});
