export type FileStatus = { generation: number } & (
  { kind: 'unchanged' | 'changed' | 'uncertain' } | { kind: 'unavailable'; message: string });
export interface FileIdentity { path: string; version: number }

export class FileWatcher {
  private pending = false;
  private ticket = 0;
  private disposed = false;
  constructor(private identity: () => FileIdentity | undefined, private allowed: () => boolean,
    private probe: () => Promise<FileStatus>, private present: (status: FileStatus) => void) {}
  invalidate() { this.ticket++; }
  dispose() { this.disposed = true; this.invalidate(); }
  async check() {
    const captured = this.identity();
    if (this.disposed || this.pending || !this.allowed() || !captured) return;
    const identity = { ...captured }, ticket = ++this.ticket;
    this.pending = true;
    const current = () => {
      const now = this.identity();
      return !this.disposed && this.allowed() && ticket === this.ticket && now?.path === identity.path && now.version === identity.version;
    };
    try { const result = await this.probe(); if (current()) this.present(result); }
    catch (reason) { if (current()) this.present({ kind: 'unavailable', message: String(reason), generation: -1 }); }
    finally { this.pending = false; }
  }
}

export function fileWarning(parent: HTMLElement, reload: () => void, saveAs: () => void, check: () => void) {
  const panel = document.createElement('section'); panel.className = 'file-warning'; panel.hidden = true;
  panel.setAttribute('aria-label', 'File change');
  const message = document.createElement('span'); message.setAttribute('role', 'status');
  const reloadButton = document.createElement('button'); reloadButton.textContent = 'Reload from disk';
  const saveButton = document.createElement('button'); saveButton.textContent = 'Save As';
  const checkButton = document.createElement('button'); checkButton.textContent = 'Check file';
  reloadButton.addEventListener('click', reload); saveButton.addEventListener('click', saveAs); checkButton.addEventListener('click', check);
  panel.append(message, reloadButton, saveButton, checkButton); parent.after(panel);
  return (status?: FileStatus) => {
    panel.hidden = !status || status.kind === 'unchanged';
    if (!status) return;
    reloadButton.disabled = saveButton.disabled = status.kind === 'uncertain';
    if (status.kind === 'changed') message.textContent = 'The file changed on disk. Your current document is kept.';
    if (status.kind === 'unavailable') message.textContent = `Cannot read the file. Your current document is kept. ${status.message}`;
    if (status.kind === 'uncertain') message.textContent = 'Save completion is uncertain. Use Check Save before Reload or Save As.';
  };
}
