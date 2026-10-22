// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
  isTauri: () => true,
}));

it('syncs theme check state to desktop menu via update_menu_state', async () => {
  mocks.invoke.mockClear();
  const { setTheme } = await import('../../src/web/theme');
  setTheme('dark');
  expect(mocks.invoke).toHaveBeenCalledWith('update_menu_state', { theme: 'dark' });

  setTheme('light');
  expect(mocks.invoke).toHaveBeenCalledWith('update_menu_state', { theme: 'light' });

  setTheme('system');
  expect(mocks.invoke).toHaveBeenCalledWith('update_menu_state', { theme: 'system' });
});
