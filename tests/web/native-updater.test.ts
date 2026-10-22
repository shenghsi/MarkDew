import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), isTauri: vi.fn(() => true) }));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
  isTauri: mocks.isTauri,
  Channel: class { onmessage?: (value: unknown) => void; },
}));
import { checkAppUpdates, installAppUpdate, registerUpdateGuard } from '../../src/web/updater';

describe('native app updates', () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
    mocks.isTauri.mockReturnValue(true);
    registerUpdateGuard(async install => { await install(); });
  });

  it('uses the native version and architecture for checks', async () => {
    mocks.invoke.mockResolvedValue({ status: 'up-to-date', currentVersion: '2.0.0' });
    expect(await checkAppUpdates('1.0.0')).toEqual({ status: 'up-to-date', currentVersion: '2.0.0' });
    expect(mocks.invoke).toHaveBeenCalledWith('check_app_update');
  });

  it('shows native check errors instead of reporting up to date', async () => {
    mocks.invoke.mockRejectedValue('Close the other MarkDew windows.');
    expect(await checkAppUpdates('1.0.0')).toEqual({ status: 'error', message: 'Close the other MarkDew windows.' });
  });

  it('does not install if document preparation fails', async () => {
    registerUpdateGuard(async () => { throw new Error('Save all documents.'); });
    await expect(installAppUpdate(() => {})).rejects.toThrow('Save all documents.');
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('passes download progress and permits retry after cancellation', async () => {
    const progress = vi.fn();
    mocks.invoke.mockImplementationOnce(async (_command, { progress: channel }) => {
      channel.onmessage({ stage: 'download', downloaded: 10, total: 100 });
      throw new Error('Authentication cancelled.');
    });
    await expect(installAppUpdate(progress)).rejects.toThrow('Authentication cancelled.');
    expect(progress).toHaveBeenCalledWith({ stage: 'download', downloaded: 10, total: 100 });
    mocks.invoke.mockResolvedValue(undefined);
    await installAppUpdate(progress);
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });

  it('blocks a second install while recovery or installation is pending', async () => {
    let complete!: () => void;
    const pending = new Promise<void>(resolve => { complete = resolve; });
    registerUpdateGuard(async install => { await pending; await install(); });
    mocks.invoke.mockResolvedValue(undefined);
    const first = installAppUpdate(() => {});
    await expect(installAppUpdate(() => {})).rejects.toThrow('already in progress');
    complete();
    await first;
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
});
