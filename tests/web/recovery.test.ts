import { afterEach, expect, it, vi } from 'vitest';
import { RecoveryQueue } from '../../src/web/recovery';
afterEach(() => { vi.useRealTimers(); });
const capture = (source: string, dirty = true) => ({ source, dirty, label: '日本語.md' });
function deferred() { let resolve!: () => void, reject!: (error: unknown) => void; const promise = new Promise<void>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
it('debounces exact source and sends only the latest capture with a fresh revision', async () => {
  vi.useFakeTimers(); const write = vi.fn().mockResolvedValue(undefined), failure = vi.fn();
  const queue = new RecoveryQueue(20, write, failure);
  queue.update(capture('old')); queue.update(capture('\uFEFF日本語😀\r\na\rb\n'));
  await vi.advanceTimersByTimeAsync(499); expect(write).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(write).toHaveBeenCalledExactlyOnceWith({ ...capture('\uFEFF日本語😀\r\na\rb\n'), revision: 21 }); expect(failure).not.toHaveBeenCalled();
});
it('serializes a clean saved capture before a later edit without losing the later snapshot', async () => {
  vi.useFakeTimers(); const first = deferred(), write = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
  const queue = new RecoveryQueue(0, write, vi.fn());
  queue.update(capture('saved', false)); const flush = queue.flush();
  queue.update(capture('saved plus later edit')); expect(write).toHaveBeenCalledTimes(1);
  first.resolve(); await flush;
  expect(write.mock.calls[0][0]).toEqual({ ...capture('saved', false), revision: 1 });
  expect(write.mock.calls[1][0]).toEqual({ ...capture('saved plus later edit'), revision: 2 });
});
it('starts a checkpoint during continuous input without waiting for an idle interval', async () => {
  vi.useFakeTimers(); const slow = deferred(), write = vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValue(undefined);
  const queue = new RecoveryQueue(0, write, vi.fn());
  for (let index = 0; index < 5; index++) { queue.update(capture(`text ${index}`)); await vi.advanceTimersByTimeAsync(400); }
  expect(write).toHaveBeenCalledExactlyOnceWith({ ...capture('text 4'), revision: 1 });
  queue.update(capture('new while disk is slow')); slow.resolve(); await queue.flush();
  expect(write.mock.calls[1][0]).toEqual({ ...capture('new while disk is slow'), revision: 2 });
});
it('keeps a newer pending capture after failure and retries with a higher revision', async () => {
  vi.useFakeTimers(); const first = deferred(), write = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
  const queue = new RecoveryQueue(0, write, vi.fn());
  queue.update(capture('old')); const failed = queue.flush();
  queue.update(capture('new')); first.reject('disk failed'); await expect(failed).rejects.toBe('disk failed');
  await queue.flush(); expect(write.mock.calls[1][0]).toEqual({ ...capture('new'), revision: 2 });
});
it('retains a failed capture and waits for clear acknowledgment after an in-flight write', async () => {
  vi.useFakeTimers(); const write = vi.fn().mockRejectedValueOnce('uncertain').mockResolvedValueOnce(undefined);
  const queue = new RecoveryQueue(0, write, vi.fn());
  queue.update(capture('kept')); await expect(queue.flush()).rejects.toBe('uncertain');
  await queue.flush(); expect(write.mock.calls[1][0].revision).toBe(2); expect(write.mock.calls[1][0].source).toBe('kept');
  const writing = deferred(); write.mockReturnValueOnce(writing.promise).mockResolvedValueOnce(undefined);
  queue.update(capture('last')); const flush = queue.flush(), clearing = queue.clear();
  writing.resolve(); await flush; await clearing;
  expect(write.mock.calls[3][0]).toEqual({ source: '', label: 'Untitled', dirty: false, revision: 4 });
});
