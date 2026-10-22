export interface RecoveryCapture { source: string; label: string; dirty: boolean }
export interface RecoveryListing { session: string; revision: number; entries: { id: string; label: string; bytes: number }[]; warnings: string[] }
type Write = (capture: RecoveryCapture & { revision: number }) => Promise<void>;

// One serialized queue owns checkpoint order. A failed old write cannot replace
// a newer pending capture. Retry always receives a new host revision.
export class RecoveryQueue {
  private pending?: RecoveryCapture;
  private running?: Promise<void>;
  private timer?: ReturnType<typeof setTimeout>;
  private maximumTimer?: ReturnType<typeof setTimeout>;
  constructor(private revision: number, private write: Write, private failure: (error: unknown) => void) {}
  update(capture: RecoveryCapture) {
    this.pending = { ...capture };
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.flush().catch(this.failure); }, 500);
    this.maximumTimer ??= setTimeout(() => { this.maximumTimer = undefined; void this.flush().catch(this.failure); }, 2000);
  }
  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = undefined; }
    if (this.maximumTimer) { clearTimeout(this.maximumTimer); this.maximumTimer = undefined; }
    if (this.running) { await this.running; if (this.pending) await this.flush(); return; }
    this.running = this.drain();
    try { await this.running; } finally { this.running = undefined; }
  }
  private async drain() {
    while (this.pending) {
      const capture = this.pending; this.pending = undefined;
      try { await this.write({ ...capture, revision: ++this.revision }); }
      catch (error) { this.pending ??= capture; throw error; }
    }
  }
  async clear(): Promise<number> { this.update({ source: '', label: 'Untitled', dirty: false }); await this.flush(); return this.revision; }
}

export function recoveryPanel(parent: HTMLElement, load: () => Promise<RecoveryListing>,
  restore: (id: string) => Promise<void>, retry: () => Promise<void>,
  discard?: (id: string) => Promise<void>, clearAll?: () => Promise<void>) {
  const panel = document.createElement('section'); panel.className = 'recovery-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Recovery copies');
  const title = document.createElement('strong'); title.textContent = 'Recovery copies';
  const hint = document.createElement('p'); hint.textContent = 'Restore opens an unsaved document. The original file and recovery copy stay unchanged.';
  const message = document.createElement('p'); message.setAttribute('role', 'status');
  const entries = document.createElement('div');
  const refresh = document.createElement('button'); refresh.textContent = 'Refresh copies';
  const clearAllButton = document.createElement('button'); clearAllButton.textContent = 'Clear all copies';
  const retryButton = document.createElement('button'); retryButton.textContent = 'Retry recovery';
  const close = document.createElement('button'); close.textContent = 'Close recovery';
  close.addEventListener('click', () => { panel.hidden = true; });
  const error = (reason: unknown) => { panel.hidden = false; message.textContent = `Recovery is not confirmed. ${String(reason)} Use Retry recovery.`; };
  const show = async (startup = false) => {
    try {
      const listing = await load(); entries.replaceChildren();
      message.textContent = listing.warnings.join(' ') || (listing.entries.length ? '' : 'No recovery copies.');
      for (const entry of listing.entries) {
        const row = document.createElement('div');
        row.className = 'recovery-row';
        const label = document.createElement('span'); label.textContent = `${entry.label || 'Untitled'} · ${entry.bytes} bytes `;
        const button = document.createElement('button'); button.textContent = 'Restore'; button.setAttribute('aria-label', `Restore ${entry.label || 'Untitled'}`);
        button.addEventListener('click', async () => {
          button.disabled = true;
          try { await restore(entry.id); } catch (reason) { error(reason); } finally { button.disabled = false; }
        });
        row.append(label, button);
        if (discard) {
          const discardButton = document.createElement('button');
          discardButton.textContent = 'Discard';
          discardButton.setAttribute('aria-label', `Discard ${entry.label || 'Untitled'}`);
          discardButton.addEventListener('click', async () => {
            discardButton.disabled = true;
            try {
              await discard(entry.id);
              await show();
            } catch (reason) {
              error(reason);
            } finally {
              discardButton.disabled = false;
            }
          });
          row.append(discardButton);
        }
        entries.append(row);
      }
      clearAllButton.hidden = !listing.entries.length;
      panel.hidden = (startup && !listing.entries.length && !listing.warnings.length) || (!startup && !listing.entries.length && !listing.warnings.length);
    } catch (reason) { error(reason); }
  };
  refresh.addEventListener('click', () => void show());
  clearAllButton.addEventListener('click', async () => {
    if (!clearAll) return;
    clearAllButton.disabled = true;
    try {
      await clearAll();
      await show();
    } catch (reason) {
      error(reason);
    } finally {
      clearAllButton.disabled = false;
    }
  });
  retryButton.addEventListener('click', async () => { try { await retry(); message.textContent = 'Recovery checkpoint confirmed.'; } catch (reason) { error(reason); } });
  panel.append(title, hint, entries, message, refresh, clearAllButton, retryButton, close); parent.after(panel);
  return { show, error };
}
