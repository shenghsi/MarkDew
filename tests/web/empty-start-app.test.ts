// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';

const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), ask: vi.fn(), save: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ label: 'main', onCloseRequested: vi.fn(), onDragDropEvent: async () => () => {}, listen: async () => () => {} }),
}));

it('starts with no Untitled document and opens Untitled.md tabs from the + button', async () => {
  localStorage.clear();
  const recovery = { session: 'test', revision: 0, entries: [], warnings: [] };
  let next = 0;
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') return startupFixture(recovery);
    if (command === 'recovery_document' || command === 'recovery_list') return recovery;
    if (command === 'create_document') return ++next;
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'take_initial_folder' || command === 'take_initial_file' || command === 'quit_ready') return null;
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const empty = document.querySelector<HTMLElement>('#empty-document')!;
  const plus = document.querySelector<HTMLButtonElement>('#new-tab')!;
  try {
    await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
    const bar = document.querySelector<HTMLElement>('.document-tabs-host')!;
    const labels = () => Array.from(document.querySelectorAll('.document-tab-label')).map(label => label.textContent);
    // The empty state shows the + button and no tab.
    expect(empty.hidden).toBe(false); expect(bar.hidden).toBe(false);
    expect(bar.classList.contains('document-tabs-empty')).toBe(true); expect(plus.isConnected).toBe(true);
    document.querySelector<HTMLButtonElement>('#empty-new')!.click();
    await vi.waitFor(() => expect(empty.hidden).toBe(true));
    // New reuses the blank tab. One document shows as one tab, with + after it.
    expect(bar.classList.contains('document-tabs-empty')).toBe(false); expect(labels()).toEqual(['Untitled.md']);
    expect(document.querySelector<HTMLElement>('#document-title')!.hidden).toBe(true);
    expect(plus.parentElement!.classList.contains('document-tabs')).toBe(true);
    plus.click();
    await vi.waitFor(() => expect(labels()).toEqual(['Untitled.md', 'Untitled.md']));
    // Untitled tabs are not project files, so nothing is remembered.
    expect(localStorage.getItem('markdew.projectFiles')).toBeNull();
  } finally { view.destroy(); window.dispatchEvent(new Event('pagehide')); }
});
