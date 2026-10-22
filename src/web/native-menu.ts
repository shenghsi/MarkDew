type Register = (handler: (event: { payload: unknown }) => void) => Promise<() => void>;
export type MenuDispatcher = (command: string) => boolean;

const commands = new Set([
  'new', 'open', 'open-folder', 'save', 'save-as', 'close-document', 'print', 'undo', 'redo', 'find',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'paragraph', 'table', 'code-block', 'quote',
  'bold', 'italic', 'code', 'strike', 'link',
  'toggle-sidebar', 'toggle-outline', 'source-mode',
  'theme-system', 'theme-light', 'theme-dark',
  'settings', 'about',
  'import', 'export-pdf', 'export-html', 'export-html-plain', 'export-docx', 'export-odt', 'export-rtf', 'export-epub',
  'export-latex', 'export-mediawiki', 'export-rst', 'export-textile', 'export-opml',
  'export-previous', 'export-overwrite', 'export-settings'
]);

// Menu input uses the same button handlers and guards as the document tools.
export function nativeMenu(root: Document, register: Register, allowed: (command: string) => boolean,
  report: (message: string) => void, dispatch?: MenuDispatcher): () => void {
  let disposed = false, unlisten: (() => void) | undefined;
  void Promise.resolve().then(() => disposed ? undefined : register(event => {
    if (disposed || typeof event.payload !== 'string' || !commands.has(event.payload) || !allowed(event.payload)) return;
    if (dispatch && dispatch(event.payload)) return;
    const button = root.getElementById(event.payload);
    if (button instanceof HTMLButtonElement && button.isConnected && !button.disabled) button.click();
  })).then(remove => {
    if (disposed) remove?.(); else unlisten = remove;
  }).catch(reason => { if (!disposed) report(`Document menu is unavailable. Use Tools. ${String(reason)}`); });
  return () => { if (!disposed) { disposed = true; unlisten?.(); unlisten = undefined; } };
}
