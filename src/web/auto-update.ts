import type { UpdateCheckResult, UpdateInfo } from './updater';

export const AUTO_UPDATE_ENABLED_KEY = 'markdew.auto-update-check';
export const AUTO_UPDATE_LAST_CHECK_KEY = 'markdew.auto-update-last-check';
export const AUTO_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function isAutoUpdateEnabled(storage: Storage = localStorage): boolean {
  return storage.getItem(AUTO_UPDATE_ENABLED_KEY) !== 'off';
}

export function setAutoUpdateEnabled(enabled: boolean, storage: Storage = localStorage): void {
  storage.setItem(AUTO_UPDATE_ENABLED_KEY, enabled ? 'on' : 'off');
}

export function isAutoUpdateDue(now: number, storage: Storage = localStorage): boolean {
  const last = Number(storage.getItem(AUTO_UPDATE_LAST_CHECK_KEY));
  return !Number.isFinite(last) || last <= 0 || last > now || now - last >= AUTO_UPDATE_INTERVAL_MS;
}

/**
 * Runs a silent update check at most once per interval. Only a found update is
 * reported. A failed check is not recorded, so the next start retries it.
 */
export async function runAutoUpdateCheck(options: {
  check: () => Promise<UpdateCheckResult>;
  onUpdate: (update: UpdateInfo) => void;
  storage?: Storage;
  now?: number;
}): Promise<void> {
  const storage = options.storage ?? localStorage;
  const now = options.now ?? Date.now();
  if (!isAutoUpdateEnabled(storage) || !isAutoUpdateDue(now, storage)) return;
  const result = await options.check().catch((): UpdateCheckResult => ({ status: 'error', message: '' }));
  if (!result || result.status === 'error') return;
  storage.setItem(AUTO_UPDATE_LAST_CHECK_KEY, String(now));
  if (result.status === 'update-available') options.onUpdate(result.update);
}
