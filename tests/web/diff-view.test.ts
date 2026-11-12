// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { openCompare, type CompareHost } from '../../src/web/diff-view';

const commit = { hash: 'abc1234', short: 'abc1234', author: 'A', date: '2026-01-02T00:00:00Z', subject: 'first', name: 'a.md' };
const host = (over: Partial<CompareHost> = {}): CompareHost => ({
  fileName: 'a.md', current: () => 'new\n', history: async () => [commit],
  read: async rev => (rev === 'head' ? 'old\n' : rev === 'staged' ? 'mid\n' : 'first\n'),
  apply: vi.fn(), confirmDiscard: () => true, closed: vi.fn(), ...over,
});
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
afterEach(() => { document.body.replaceChildren(); });

test('lists plain choices, shows both sides, and applies edits from the newer side', async () => {
  const h = host(); openCompare(h, document.body); await settle();
  const selects = document.querySelectorAll<HTMLSelectElement>('.compare-pick select');
  expect(Array.from(selects[1].options).map(o => o.value)).toEqual(['current', 'staged', 'head', 'abc1234']);
  expect(Array.from(selects[0].options).map(o => o.value)).toEqual(['staged', 'head', 'abc1234', 'empty']);
  expect(document.querySelectorAll('.cm-mergeViewEditor').length).toBe(2);
  document.querySelector<HTMLButtonElement>('.compare-bar button')!.click();
});

test('Apply returns the edited text and closes', async () => {
  const h = host(); openCompare(h, document.body); await settle();
  const apply = Array.from(document.querySelectorAll<HTMLButtonElement>('.compare-bar button')).find(b => b.textContent === 'Apply edits')!;
  expect(apply.disabled).toBe(true);
  const editors = document.querySelectorAll<HTMLElement>('.cm-mergeViewEditor .cm-content');
  const view = EditorView.findFromDOM(editors[1].closest<HTMLElement>('.cm-editor')!)!;
  view.dispatch({ changes: { from: 0, insert: 'X' } });
  expect(apply.disabled).toBe(false);
  apply.click();
  expect(h.apply).toHaveBeenCalledWith('Xnew\n');
  expect(document.querySelector('.compare-view')).toBeNull();
  expect(h.closed).toHaveBeenCalledTimes(1);
});

test('two commits compare read-only, and inline mode works', async () => {
  openCompare(host(), document.body); await settle();
  const [older, newer] = Array.from(document.querySelectorAll<HTMLSelectElement>('.compare-pick select')); const mode = document.querySelector<HTMLSelectElement>('.compare-mode')!;
  older.value = 'staged'; newer.value = 'head'; newer.dispatchEvent(new Event('change')); await settle();
  expect(Array.from(document.querySelectorAll<HTMLButtonElement>('.compare-bar button')).find(b => b.textContent === 'Apply edits')!.hidden).toBe(true);
  expect(document.querySelector('.compare-note')!.textContent).toContain('read-only');
  older.value = 'abc1234'; mode.value = 'inline'; mode.dispatchEvent(new Event('change')); await settle();
  expect(document.querySelectorAll('.cm-mergeViewEditor').length).toBe(0);
  expect(document.querySelectorAll('.cm-editor').length).toBe(1);
});

test('a missing version shows the error, and Close removes the panel', async () => {
  const h = host({ read: async () => { throw 'This version does not have the file.'; } });
  const handle = openCompare(h, document.body); await settle();
  expect(document.querySelector('.compare-note')!.textContent).toContain('does not have');
  await handle.close();
  expect(document.querySelector('.compare-view')).toBeNull();
  expect(h.closed).toHaveBeenCalledTimes(1);
});

test('refresh reads the editor text again only while the panel has no edits', async () => {
  let text = 'new\n';
  const handle = openCompare(host({ current: () => text }), document.body); await settle();
  text = 'newer\n'; handle.refresh(); await settle();
  expect(document.querySelector('.cm-mergeViewEditors')!.textContent).toContain('newer');
});

test('Show changes in a commit compares it with the one before, or with empty for the first', async () => {
  const second = { ...commit, hash: 'def5678', short: 'def5678', subject: 'second' };
  openCompare(host({ history: async () => [second, commit], read: async rev => (rev === 'def5678' ? 'two\n' : 'one\n') }), document.body); await settle();
  const pick = document.querySelector<HTMLSelectElement>('.compare-commit')!;
  const [older, newer] = Array.from(document.querySelectorAll<HTMLSelectElement>('.compare-pick select'));
  pick.value = 'def5678'; pick.dispatchEvent(new Event('change')); await settle();
  expect([older.value, newer.value]).toEqual(['abc1234', 'def5678']);
  expect(document.querySelector('.compare-note')!.textContent).toContain('read-only');
  pick.value = 'abc1234'; pick.dispatchEvent(new Event('change')); await settle();
  expect([older.value, newer.value]).toEqual(['empty', 'abc1234']);
  expect(document.querySelector('.compare-note')!.textContent).toContain('read-only');
});
