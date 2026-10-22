// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));
it('keeps the edit surface when New is clicked during composition', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const source = 'composition text\n\n$x$\n\nEnd';
  view.dispatch({ changes: { from: 0, insert: source }, selection: { anchor: 0 } });
  // Preview follows the editor's background parser when its first budget ends.
  await vi.waitFor(() => expect(document.querySelector('.preview-math')).not.toBeNull());
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(view.compositionStarted).toBe(true);
  const captured = view.state;
  const theme = document.querySelector<HTMLSelectElement>('[aria-label="Theme"]')!;
  theme.value = 'dark'; theme.dispatchEvent(new Event('change'));
  expect(document.documentElement.dataset.theme).toBe('dark'); expect(view.state).toBe(captured);
  document.querySelector<HTMLButtonElement>('#new')!.click();
  await Promise.resolve();
  expect(view.state.doc.toString()).toBe(source);
  expect(document.querySelector('#status')!.textContent).toContain('Finish text input');
  expect(view.contentDOM.contentEditable).not.toBe('false');
  document.querySelector<HTMLButtonElement>('#source')!.click();
  expect(document.querySelector('#source')!.getAttribute('aria-pressed')).toBe('false');
  expect(document.querySelector('.preview-math')).not.toBeNull();
  expect(view.state.doc.toString()).toBe(source);
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  const tableSource = '| A | B |\n|---|---|\n| x | y |\n\nEnd';
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: tableSource }, selection: { anchor: tableSource.length } });
  await vi.waitFor(() => expect(document.querySelector('.preview-table')).not.toBeNull());
  const { tableEditor, tableComposing } = await import('../../src/web/table');
  const table = tableEditor(document.querySelector('.preview-table')!)!; table.begin(1, 0);
  const child = table.child!;
  child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  expect(tableComposing(view)).toBe(true);
  const cellState = child.state, outerState = view.state;
  theme.value = 'light'; theme.dispatchEvent(new Event('change'));
  expect(child.state).toBe(cellState); expect(view.state).toBe(outerState); expect(table.child).toBe(child);
  for (const id of ['new', 'open', 'save', 'save-as', 'source', 'undo', 'redo']) {
    document.querySelector<HTMLButtonElement>(`#${id}`)!.click();
    await Promise.resolve();
    expect(view.state.doc.toString()).toBe(tableSource); expect(table.child).toBe(child);
  }
  expect(document.querySelector('#source')!.getAttribute('aria-pressed')).toBe('false');
  view.destroy();
});
