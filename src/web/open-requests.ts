export interface OpenBatch { paths: string[]; warnings: string[] }
type Register = (callback: (event?: { payload?: OpenBatch }) => void) => Promise<() => void>;

// Native notifications carry no path for OS launch arguments. Host menu notifications
// can provide direct payload paths. The queue and payloads are consumed without replay.
export function openRequests(register: Register, take: () => Promise<OpenBatch>,
  open: (paths: readonly string[]) => Promise<void>, report: (message: string) => void, blocked: () => boolean = () => false,
  warn: (message: string) => void = report) {
  let disposed = false, ready = false, requested = false, draining = false;
  let rejected = false;
  let unlisten: (() => void) | undefined;
  const pendingBatches: OpenBatch[] = [];
  const registered = Promise.resolve().then(() => disposed ? undefined : register(request))
    .then(remove => { if (disposed) remove?.(); else unlisten = remove; })
    .catch(reason => { if (!disposed) report(`Operating-system Open is unavailable. Use Open. ${String(reason)}`); });

  function request(event?: { payload?: OpenBatch }) {
    if (disposed) return;
    if (event?.payload && Array.isArray(event.payload.paths) && event.payload.paths.length > 0) {
      pendingBatches.push({ paths: event.payload.paths, warnings: event.payload.warnings ?? [] });
    }
    if (!ready) return;
    requested = true;
    rejected = rejected || draining || blocked();
    if (draining) return;
    draining = true;
    void (async () => {
      try {
        while ((requested || pendingBatches.length > 0) && !disposed) {
          requested = false;
          const batch = pendingBatches.shift() ?? await take();
          if (disposed) return;
          if (batch.warnings?.length) warn(batch.warnings.join(' '));
          const reject = rejected; rejected = false;
          if (batch.paths.length) {
            if (reject) report('Finish the file command or text input, then repeat Open for these files.');
            else await open(batch.paths);
          }
        }
      } catch (reason) { if (!disposed) report(`Cannot open the requested files. Use Open. ${String(reason)}`); }
      finally { draining = false; }
    })();
  }
  return {
    async ready() { await registered; if (!disposed) { ready = true; request(); } },
    dispose() { if (!disposed) { disposed = true; unlisten?.(); unlisten = undefined; } },
  };
}
