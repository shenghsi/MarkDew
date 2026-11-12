// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { openCompare, type CompareHost } from '../../src/web/diff-view';

const commit = { hash: 'abc1234', short: 'abc1234', author: 'A', date: '2026-01-02T00:00:00Z', subject: 'first', name: 'a.md' };
const host = (over: Partial<CompareHost> = {}): CompareHost => ({
  fileName: 'a.md', current: () => 'new\n', history: async () => [commit],
  read: async rev => (rev === 'head' ? 'old\n' : rev === 'staged' ? 'mid\n' : 'first\n'),
  apply: vi.fn(), confirmDiscard: () => true, ...over,
});
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
afterEach(() => { document.body.replaceChildren(); });

test('lists plain choices, shows both sides, and applies edits from the newer side', async () => {
  const h = host(); openCompare(h); await settle();
  const selects = document.querySelectorAll<HTMLSelectElement>('.compare-pick select');
  expect(Array.from(selects[1].options).map(o => o.value)).toEqual(['current', 'staged', 'head', 'abc1234']);
  expect(Array.from(selects[0].options).map(o => o.value)).toEqual(['staged', 'head', 'abc1234']);
  expect(document.querySelectorAll('.cm-mergeViewEditor').length).toBe(2);
  document.querySelector<HTMLButtonElement>('.compare-bar button')!.click();
});

test('Apply returns the edited text and closes', async () => {
  const h = host(); openCompare(h); await settle();
  const apply = Array.from(document.querySelectorAll<HTMLButtonElement>('.compare-bar button')).find(b => b.textContent === 'Apply edits')!;
  expect(apply.disabled).toBe(true);
  const editors = document.querySelectorAll<HTMLElement>('.cm-mergeViewEditor .cm-content');
  const view = EditorView.findFromDOM(editors[1].closest<HTMLElement>('.cm-editor')!)!;
  view.dispatch({ changes: { from: 0, insert: 'X' } });
  expect(apply.disabled).toBe(false);
  apply.click();
  expect(h.apply).toHaveBeenCalledWith('Xnew\n');
  expect(document.querySelector('.compare-overlay')).toBeNull();
});

test('two commits compare read-only, and inline mode works', async () => {
  openCompare(host()); await settle();
  const [older, newer, mode] = Array.from(document.querySelectorAll<HTMLSelectElement>('.compare-bar select'));
  older.value = 'staged'; newer.value = 'head'; newer.dispatchEvent(new Event('change')); await settle();
  expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.compare-bar button')).find(b => b.textContent === 'Apply edits')!.hidden).toBe(true);
  expect(document.querySelector('.compare-note')!.textContent).toContain('read-only');
  older.value = 'abc1234'; mode.value = 'inline'; mode.dispatchEvent(new Event('change')); await settle();
  expect(document.querySelectorAll('.cm-mergeViewEditor').length).toBe(0);
  expect(document.querySelectorAll('.cm-editor').length).toBe(1);
});

test('a missing version shows the error and Escape closes', async () => {
  openCompare(host({ read: async () => { throw 'This version does not have the file.'; } })); await settle();
  expect(document.querySelector('.compare-note')!.textContent).toContain('does not have');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await settle();
  expect(document.querySelector('.compare-overlay')).toBeNull();
});
