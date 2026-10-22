// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { themeControls } from '../../src/web/theme';
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; });
function setup(dark = false) {
  const events = new EventTarget();
  const media = { matches: dark, addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) };
  vi.stubGlobal('matchMedia', () => media);
  dispose = themeControls(document.body);
  const select = document.querySelector('select')!;
  const choose = (value: string) => { select.value = value; select.dispatchEvent(new Event('change')); };
  return { media, events, select, choose };
}
it('follows the system only in System mode and retains the selected preference', () => {
  const { media, events, select, choose } = setup(true);
  expect(select.value).toBe('system'); expect(document.documentElement.dataset.theme).toBe('dark');
  choose('light'); expect(localStorage.getItem('markdew.theme')).toBe('light');
  events.dispatchEvent(new Event('change')); expect(document.documentElement.dataset.theme).toBe('light');
  choose('system'); media.matches = false; events.dispatchEvent(new Event('change'));
  expect(document.documentElement.dataset.theme).toBe('light');
  media.matches = true; events.dispatchEvent(new Event('change')); expect(document.documentElement.dataset.theme).toBe('dark');
  dispose!(); media.matches = false; events.dispatchEvent(new Event('change'));
  expect(document.documentElement.dataset.theme).toBe('dark');
});
it('loads valid preferences and tolerates unavailable storage or system APIs', () => {
  localStorage.setItem('markdew.theme', 'dark'); setup(); expect(document.documentElement.dataset.theme).toBe('dark'); dispose!();
  localStorage.setItem('markdew.theme', 'invalid'); setup(); expect(document.documentElement.dataset.theme).toBe('light'); dispose!();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  vi.stubGlobal('matchMedia', undefined); dispose = themeControls(document.body);
  const select = document.querySelector('select')!; select.value = 'dark'; select.dispatchEvent(new Event('change'));
  expect(document.documentElement.dataset.theme).toBe('dark');
});

it('supports programmatic setTheme and syncs with #theme select and storage events', async () => {
  const { select } = setup(false);
  expect(select.id).toBe('theme');
  expect(document.documentElement.dataset.theme).toBe('light');

  // Programmatic setTheme('dark')
  const { setTheme } = await import('../../src/web/theme');
  setTheme('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(select.value).toBe('dark');
  expect(localStorage.getItem('markdew.theme')).toBe('dark');

  // Storage event from another window
  window.dispatchEvent(new StorageEvent('storage', { key: 'markdew.theme', newValue: 'light' }));
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(select.value).toBe('light');
});

