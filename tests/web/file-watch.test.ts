import { expect, it, vi } from 'vitest';
import { FileIdentity, FileStatus, FileWatcher } from '../../src/web/file-watch';
function deferred() { let resolve!: (status: FileStatus) => void, reject!: (reason: unknown) => void; const promise = new Promise<FileStatus>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
it('ignores late results and errors after a file generation changes even with the same path', async () => {
  let identity: FileIdentity | undefined = { path: '/file.md', version: 1 };
  const first = deferred(), second = deferred(), probe = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise), present = vi.fn();
  const watcher = new FileWatcher(() => identity, () => true, probe, present);
  const old = watcher.check(); identity = { path: '/file.md', version: 2 }; watcher.invalidate(); first.resolve({ kind: 'changed', generation: 1 }); await old;
  expect(present).not.toHaveBeenCalled();
  const error = watcher.check(); identity = { path: '/file.md', version: 3 }; second.reject('old read failure'); await error; expect(present).not.toHaveBeenCalled();
});
it('keeps one probe in flight and defers during commands or composition', async () => {
  let allowed = false; const read = deferred(), probe = vi.fn(() => read.promise), present = vi.fn();
  const watcher = new FileWatcher(() => ({ path: '/file.md', version: 1 }), () => allowed, probe, present);
  await watcher.check(); expect(probe).not.toHaveBeenCalled(); allowed = true;
  const pending = watcher.check(); await watcher.check(); expect(probe).toHaveBeenCalledTimes(1);
  allowed = false; read.resolve({ kind: 'changed', generation: 1 }); await pending; expect(present).not.toHaveBeenCalled();
  allowed = true; await watcher.check(); expect(present).toHaveBeenCalledWith({ kind: 'changed', generation: 1 });
});
it('reports current read failures and discards observations after disposal or an untitled transition', async () => {
  const present = vi.fn(), probe = vi.fn().mockRejectedValue('missing');
  const watcher = new FileWatcher(() => ({ path: '/file.md', version: 1 }), () => true, probe, present);
  await watcher.check(); expect(present).toHaveBeenCalledWith({ kind: 'unavailable', message: 'missing', generation: -1 });
  watcher.dispose(); await watcher.check(); expect(probe).toHaveBeenCalledTimes(1);
  const read = deferred(); let identity: FileIdentity | undefined = { path: '/file.md', version: 1 };
  const next = new FileWatcher(() => identity, () => true, () => read.promise, present);
  const pending = next.check(); identity = undefined; read.resolve({ kind: 'unchanged', generation: 1 }); await pending;
  expect(present).toHaveBeenCalledTimes(1);
});
