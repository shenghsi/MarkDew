import { getFileName, getParentDir, getSeparator } from './file-sidebar';
import { embedDiagrams, mermaidBlocks } from './diagram-images';

// Import and export through Pandoc. The desktop host starts Pandoc (pandoc.rs); this module chooses the
// files and reports the result.
export const PANDOC_PATH_KEY = 'markdew.pandoc-path';
// pictures: the format can hold a picture, so Mermaid diagrams are drawn and embedded first.
export interface ExportFormat { id: string; label: string; extension: string; pictures: boolean }
export const EXPORT_FORMATS: readonly ExportFormat[] = [
  { id: 'html', label: 'HTML', extension: 'html', pictures: true },
  { id: 'html-plain', label: 'HTML (without styles)', extension: 'html', pictures: true },
  { id: 'docx', label: 'Word', extension: 'docx', pictures: true },
  { id: 'odt', label: 'OpenOffice', extension: 'odt', pictures: true },
  { id: 'rtf', label: 'RTF', extension: 'rtf', pictures: true },
  { id: 'epub', label: 'Epub', extension: 'epub', pictures: true },
  { id: 'latex', label: 'LaTeX', extension: 'tex', pictures: true },
  { id: 'mediawiki', label: 'Media Wiki', extension: 'wiki', pictures: false },
  { id: 'rst', label: 'reStructuredText', extension: 'rst', pictures: false },
  { id: 'textile', label: 'Textile', extension: 'textile', pictures: false },
  { id: 'opml', label: 'OPML', extension: 'opml', pictures: false },
];
export const IMPORT_EXTENSIONS = ['docx', 'odt', 'rtf', 'epub', 'tex', 'latex', 'wiki', 'mediawiki', 'rst', 'textile', 'opml', 'html', 'htm'];

export function savedPandocPath(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): string | undefined {
  try { return storage?.getItem(PANDOC_PATH_KEY)?.trim() || undefined; } catch { return undefined; }
}
function safeStorage(): Storage | undefined { try { return localStorage; } catch { return undefined; } }

export interface ExchangeHost {
  document: () => { id: number; path: string; name: string; markdown: string };
  invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  save: (options: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  open: (options: { multiple: false; defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | string[] | null>;
  notify: (message: string) => void;
  openFile: (path: string) => Promise<unknown>;
  startFolder: () => string | undefined;
  storage?: Pick<Storage, 'getItem'>;
  // Draws one Mermaid diagram as a PNG data URL. The default uses the preview's renderer.
  drawDiagram?: (source: string) => Promise<string>;
}

const join = (folder: string, name: string) => folder ? (folder.endsWith('/') || folder.endsWith('\\') ? folder : folder + getSeparator(folder)) + name : name;
const stemOf = (name: string) => name.replace(/\.[^./\\]+$/, '') || 'Untitled';

export function pandocExchange(host: ExchangeHost) {
  // The last export of each document, for Export with Previous.
  const last = new Map<number, { id: string; target: string }>();
  const pandoc = () => savedPandocPath(host.storage);
  const failure = (what: string, error: unknown) => host.notify(`${what} failed. ${typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)}`);

  async function exportAs(id: string, overwrite = false): Promise<void> {
    const format = EXPORT_FORMATS.find(entry => entry.id === id);
    if (!format) { host.notify('This export format is not available.'); return; }
    const doc = host.document(), previous = last.get(doc.id), stem = stemOf(doc.name);
    let target: string | null;
    if (overwrite) {
      if (!previous) { host.notify('Export this document once first.'); return; }
      target = previous.target;
    } else {
      const folder = previous ? getParentDir(previous.target) : doc.path ? getParentDir(doc.path) : host.startFolder() || '';
      target = await host.save({ defaultPath: join(folder, `${stem}.${format.extension}`), filters: [{ name: format.label, extensions: [format.extension] }] });
    }
    if (!target) return;
    try {
      let markdown = doc.markdown, note = '';
      // Pandoc sees a mermaid block as plain code, so formats that hold pictures get the drawn diagram.
      if (format.pictures && mermaidBlocks(markdown).length) {
        const result = await embedDiagrams(markdown, host.drawDiagram, (done, total) => host.notify(`Drawing diagram ${done + 1} of ${total}…`));
        markdown = result.markdown;
        if (result.failed) note = ` ${result.failed} diagram${result.failed === 1 ? ' was' : 's were'} not drawn and stay${result.failed === 1 ? 's' : ''} as code.`;
      }
      const done = await host.invoke<string>('pandoc_export', {
        pandoc: pandoc() ?? null, format: format.id, markdown, title: stem, output: target, base: doc.path ? getParentDir(doc.path) : null });
      last.set(doc.id, { id: format.id, target: done });
      host.notify(`Exported to ${done}${note ? '.' + note : ''}`);
    } catch (error) { failure('Export', error); }
  }

  async function exportPrevious(overwrite: boolean): Promise<void> {
    const previous = last.get(host.document().id);
    if (!previous) { host.notify('Export this document once first.'); return; }
    await exportAs(previous.id, overwrite);
  }

  async function importFile(): Promise<void> {
    const chosen = await host.open({ multiple: false, defaultPath: host.startFolder(),
      filters: [{ name: 'Documents', extensions: IMPORT_EXTENSIONS }] });
    if (typeof chosen !== 'string') return;
    const output = await host.save({ defaultPath: join(getParentDir(chosen), `${stemOf(getFileName(chosen))}.md`),
      filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (!output) return;
    try {
      const done = await host.invoke<string>('pandoc_import', { pandoc: pandoc() ?? null, source: chosen, output });
      host.notify(`Imported ${getFileName(chosen)}`);
      await host.openFile(done);
    } catch (error) { failure('Import', error); }
  }

  return { exportAs, exportPrevious, importFile, lastExport: (id: number) => last.get(id) };
}
