import { expect, it } from 'vitest';
import { layoutPreferences } from '../../src/web/layout-preferences';

it('restores literal cross-platform paths and keeps only versioned layout fields', () => {
  for (const folder of ['/日本語 %23#', 'C:\\中文😀', '\\\\server\\folder']) {
    let text = JSON.stringify({ version: 1, folder, sidebar: 'files', source: 'must not retain' });
    const storage = { getItem: () => text, setItem: (_key: string, value: string) => { text = value; } };
    const preferences = layoutPreferences(() => storage);
    expect(preferences.folder).toBe(folder); expect(preferences.sidebar).toBe('files');
    preferences.sidebarChanged('outline');
    expect(JSON.parse(text)).toEqual({ version: 1, folder, sidebar: 'outline', width: 250 });
    expect(layoutPreferences(() => storage).folder).toBe(folder);
  }
});

it('restores bounded widths and keeps old folder preferences when the width is absent or damaged', () => {
  for (const width of [undefined, 149, 401, 200.5, '300', null, 150, 320, 400]) {
    let text = JSON.stringify({ version: 1, folder: '/日本語', sidebar: 'files', width });
    const storage = { getItem: () => text, setItem: (_key: string, value: string) => { text = value; } };
    const preferences = layoutPreferences(() => storage);
    expect(preferences.width).toBe(typeof width === 'number' && Number.isInteger(width) && width >= 150 && width <= 400 ? width : 250);
    expect(preferences.folder).toBe('/日本語');
    preferences.widthChanged(350); preferences.widthChanged(NaN); preferences.widthChanged(1000);
    expect(layoutPreferences(() => storage).width).toBe(350);
  }
});

it('rejects damaged, oversized, relative, URL, NUL, and unknown preferences', () => {
  const inputs = ['{', 'x'.repeat(32769), 'null', ...[
    { version: 2, folder: '/root', sidebar: 'files' },
    { version: 1, folder: '/root', sidebar: 'other' },
    ...['relative', 'file:///root', '/bad\0path', '/' + '中'.repeat(2800)].map(folder => ({ version: 1, folder, sidebar: 'files' })),
  ].map(value => JSON.stringify(value))];
  for (const text of inputs) {
    const preferences = layoutPreferences(() => ({ getItem: () => text, setItem: () => {} }));
    expect(preferences.sidebar).toBe('hidden'); expect(preferences.folder).toBe('');
  }
});

it('keeps current choices when storage fails and ignores invalid updates', () => {
  const preferences = layoutPreferences(() => { throw new Error('Storage unavailable'); });
  preferences.folderChanged('/root/日本語%23#'); preferences.sidebarChanged('files');
  expect(preferences.folder).toBe('/root/日本語%23#'); expect(preferences.sidebar).toBe('files');
  preferences.folderChanged('relative'); expect(preferences.folder).toBe('/root/日本語%23#');
});
