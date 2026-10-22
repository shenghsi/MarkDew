// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
  isTauri: () => true,
}));

it('invokes add_recent_file, get_recent_files, and clear_recent_files', async () => {
  const recentList = ['/path/to/one.md', '/path/to/two.md'];
  mocks.invoke.mockImplementation(async (command: string, args?: any) => {
    if (command === 'get_recent_files') return recentList;
    if (command === 'add_recent_file') {
      recentList.unshift(args.path);
      return;
    }
    if (command === 'clear_recent_files') {
      recentList.length = 0;
      return;
    }
  });

  const { invoke } = await import('@tauri-apps/api/core');

  await invoke('add_recent_file', { path: '/path/to/three.md' });
  expect(mocks.invoke).toHaveBeenCalledWith('add_recent_file', { path: '/path/to/three.md' });

  const files = await invoke<string[]>('get_recent_files');
  expect(files).toEqual(['/path/to/three.md', '/path/to/one.md', '/path/to/two.md']);

  await invoke('clear_recent_files');
  expect(mocks.invoke).toHaveBeenCalledWith('clear_recent_files');

  const empty = await invoke<string[]>('get_recent_files');
  expect(empty).toEqual([]);

  await invoke('record_closed_file', { path: '/path/to/closed.md' });
  expect(mocks.invoke).toHaveBeenCalledWith('record_closed_file', { path: '/path/to/closed.md' });

  await invoke('delete_path', { path: '/path/to/remove.md' });
  expect(mocks.invoke).toHaveBeenCalledWith('delete_path', { path: '/path/to/remove.md' });
});
