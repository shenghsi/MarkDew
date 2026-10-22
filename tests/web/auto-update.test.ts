import { describe, it, expect, vi } from 'vitest';
import { runAutoUpdateCheck, setAutoUpdateEnabled, isAutoUpdateEnabled, AUTO_UPDATE_INTERVAL_MS } from '../../src/web/auto-update';

function memory(): Storage {
  const m = new Map<string, string>();
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: k => void m.delete(k),
    clear: () => m.clear(), key: () => null, get length() { return m.size; } } as Storage;
}
const found = { status: 'update-available', currentVersion: '1.0.7', update: { version: '1.0.8' } } as never;

describe('auto update check', () => {
  it('is on by default and can be turned off', () => {
    const s = memory();
    expect(isAutoUpdateEnabled(s)).toBe(true);
    setAutoUpdateEnabled(false, s);
    expect(isAutoUpdateEnabled(s)).toBe(false);
  });

  it('reports an update and waits one interval before the next check', async () => {
    const s = memory(); const check = vi.fn(async () => found); const onUpdate = vi.fn();
    await runAutoUpdateCheck({ check, onUpdate, storage: s, now: 1000 });
    await runAutoUpdateCheck({ check, onUpdate, storage: s, now: 2000 });
    expect(check).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({ version: '1.0.8' });
    await runAutoUpdateCheck({ check, onUpdate, storage: s, now: 1000 + AUTO_UPDATE_INTERVAL_MS });
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('stays silent when disabled, up to date, or on error, and retries after an error', async () => {
    const s = memory(); const onUpdate = vi.fn();
    setAutoUpdateEnabled(false, s);
    const check = vi.fn(async () => found);
    await runAutoUpdateCheck({ check, onUpdate, storage: s, now: 1 });
    expect(check).not.toHaveBeenCalled();
    setAutoUpdateEnabled(true, s);
    await runAutoUpdateCheck({ check: async () => ({ status: 'error', message: 'x' }), onUpdate, storage: s, now: 1 });
    await runAutoUpdateCheck({ check: async () => ({ status: 'up-to-date', currentVersion: '1.0.7' }), onUpdate, storage: s, now: 2 });
    expect(onUpdate).not.toHaveBeenCalled();
    await runAutoUpdateCheck({ check, onUpdate, storage: s, now: 3 });
    expect(check).not.toHaveBeenCalled();
  });
});
