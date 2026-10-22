import { expect, it, vi } from 'vitest';
import { openRequests, OpenBatch } from '../../src/web/open-requests';

const batch = (paths: string[] = []): OpenBatch => ({ paths, warnings: [] });
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};

it('rejects the whole reply conservatively when a new notification arrives during take', async () => {
  let notify!: () => void;
  const reply = deferred<OpenBatch>(), open = vi.fn(), report = vi.fn();
  const take = vi.fn().mockImplementationOnce(() => reply.promise).mockResolvedValue(batch());
  const bridge = openRequests(async callback => { notify = callback; return () => {}; }, take, open, report);
  await bridge.ready(); notify(); reply.resolve(batch(['/earlier.md', '/later.md']));
  await vi.waitFor(() => expect(take).toHaveBeenCalledTimes(2));
  expect(open).not.toHaveBeenCalled(); expect(report).toHaveBeenCalledWith(expect.stringContaining('repeat Open'));
  bridge.dispose();
});

it('registers before draining and retains startup requests until recovery is ready', async () => {
  let notify!: () => void;
  let pending = batch(['/日本語 %23#.md']);
  const remove = vi.fn(), open = vi.fn().mockResolvedValue(undefined), report = vi.fn();
  const take = vi.fn(async () => { const value = pending; pending = batch(); return value; });
  const bridge = openRequests(async callback => { notify = callback; return remove; }, take, open, report);
  await vi.waitFor(() => expect(notify).toBeDefined());
  notify(); expect(take).not.toHaveBeenCalled();
  // A failed startup never calls ready. A later successful Retry does.
  await bridge.ready(); await vi.waitFor(() => expect(open).toHaveBeenCalledWith(['/日本語 %23#.md']));
  await bridge.ready(); await vi.waitFor(() => expect(take).toHaveBeenCalledTimes(2));
  expect(open).toHaveBeenCalledTimes(1); bridge.dispose(); expect(remove).toHaveBeenCalledTimes(1);
});

it('consumes requests during a file command with a visible rejection and no replay', async () => {
  let notify!: () => void, pending = batch(['/first.md']);
  const finish = deferred<void>(), open = vi.fn(() => finish.promise), report = vi.fn();
  const take = vi.fn(async () => { const value = pending; pending = batch(); return value; });
  const bridge = openRequests(async callback => { notify = callback; return () => {}; }, take, open, report);
  await bridge.ready(); await vi.waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  pending = batch(['/later.md']); notify(); finish.resolve();
  await vi.waitFor(() => expect(report).toHaveBeenCalledWith(expect.stringContaining('repeat Open')));
  expect(open).toHaveBeenCalledTimes(1); expect(take).toHaveBeenCalledTimes(2); expect(pending.paths).toEqual([]);
  bridge.dispose();
});

it('captures a blocked gesture before an asynchronous drain reply', async () => {
  let notify!: () => void, blocked = false;
  const reply = deferred<OpenBatch>(), report = vi.fn(), open = vi.fn();
  const take = vi.fn().mockResolvedValueOnce(batch()).mockImplementationOnce(() => reply.promise);
  const bridge = openRequests(async callback => { notify = callback; return () => {}; }, take, open, report, () => blocked);
  await bridge.ready(); await vi.waitFor(() => expect(take).toHaveBeenCalledTimes(1));
  blocked = true; notify(); blocked = false; reply.resolve(batch(['/blocked.md']));
  await vi.waitFor(() => expect(report).toHaveBeenCalledWith(expect.stringContaining('repeat Open')));
  expect(open).not.toHaveBeenCalled(); bridge.dispose();
});

it('rejects late results and removes a late listener after disposal', async () => {
  const reply = deferred<OpenBatch>(), listener = deferred<() => void>();
  const remove = vi.fn(), report = vi.fn(), open = vi.fn();
  const late = openRequests(() => listener.promise, vi.fn(), open, report);
  await Promise.resolve(); late.dispose(); listener.resolve(remove);
  await late.ready(); expect(remove).toHaveBeenCalledTimes(1);
  const bridge = openRequests(async () => remove, () => reply.promise, open, report);
  await bridge.ready(); bridge.dispose(); reply.resolve({ paths: ['/late.md'], warnings: ['late warning'] });
  await Promise.resolve(); await Promise.resolve(); expect(open).not.toHaveBeenCalled(); expect(report).not.toHaveBeenCalled();
});

it('reports drain and file failures and can retry readiness without stale replay', async () => {
  const report = vi.fn(), open = vi.fn().mockRejectedValue('read failed');
  const take = vi.fn().mockRejectedValueOnce('queue unavailable').mockResolvedValueOnce(batch(['/file.md']));
  const bridge = openRequests(async () => () => {}, take, open, report);
  await bridge.ready(); await vi.waitFor(() => expect(report).toHaveBeenCalledWith(expect.stringContaining('queue unavailable')));
  await bridge.ready(); await vi.waitFor(() => expect(report).toHaveBeenCalledWith(expect.stringContaining('read failed')));
  expect(open).toHaveBeenCalledTimes(1); bridge.dispose();
});

it('consumes direct event payload batches without polling take', async () => {
  let notify!: (event?: { payload?: OpenBatch }) => void;
  const take = vi.fn().mockResolvedValue(batch());
  const open = vi.fn().mockResolvedValue(undefined), report = vi.fn();
  const bridge = openRequests(async callback => { notify = callback; return () => {}; }, take, open, report);
  await bridge.ready();
  expect(take).toHaveBeenCalledTimes(1);

  notify({ payload: { paths: ['/recent/doc.md'], warnings: ['warning1'] } });
  await vi.waitFor(() => expect(open).toHaveBeenCalledWith(['/recent/doc.md']));
  expect(report).toHaveBeenCalledWith('warning1');
  expect(take).toHaveBeenCalledTimes(1); // Did not need to invoke take for direct payload
  bridge.dispose();
});

it('retains event payload received before ready and drains it upon readiness', async () => {
  let notify!: (event?: { payload?: OpenBatch }) => void;
  const take = vi.fn().mockResolvedValue(batch());
  const open = vi.fn().mockResolvedValue(undefined), report = vi.fn();
  const bridge = openRequests(async callback => { notify = callback; return () => {}; }, take, open, report);
  await vi.waitFor(() => expect(notify).toBeDefined());

  // Notification arrives while bridge is not yet ready
  notify({ payload: { paths: ['/pre-ready/file.md'], warnings: [] } });
  expect(open).not.toHaveBeenCalled();

  // Bridge becomes ready and drains the retained payload
  await bridge.ready();
  await vi.waitFor(() => expect(open).toHaveBeenCalledWith(['/pre-ready/file.md']));
  bridge.dispose();
});
