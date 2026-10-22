import { expect, it, vi } from 'vitest';
import { EXPORT_FORMATS, IMPORT_EXTENSIONS, pandocExchange, savedPandocPath } from '../../src/web/pandoc-exchange';

function setup(options: { path?: string; saved?: (string | null)[]; invoke?: (command: string, args: any) => Promise<unknown> } = {}) {
  const saved = [...(options.saved ?? ['/out/Doc.docx'])];
  const host = {
    document: () => ({ id: 3, path: options.path ?? '/notes/Doc.md', name: 'Doc.md', markdown: '# Doc' }),
    invoke: vi.fn(options.invoke ?? (async (command: string, args: any) => args.output)) as any,
    save: vi.fn(async () => saved.shift() ?? null), open: vi.fn(async () => '/in/Report.docx' as string | string[] | null),
    notify: vi.fn(), openFile: vi.fn(async () => undefined), startFolder: () => '/start',
    storage: { getItem: (key: string) => key === 'markdew.pandoc-path' ? ' /opt/pandoc ' : null },
  };
  return { host, ex: pandocExchange(host) };
}

it('lists every export format of the menu with a file extension, and the import types', () => {
  expect(EXPORT_FORMATS.map(format => format.id)).toEqual(['html', 'html-plain', 'docx', 'odt', 'rtf', 'epub', 'latex', 'mediawiki', 'rst', 'textile', 'opml']);
  expect(EXPORT_FORMATS.every(format => /^[a-z]+$/.test(format.extension))).toBe(true);
  expect(IMPORT_EXTENSIONS).toContain('docx'); expect(IMPORT_EXTENSIONS).not.toContain('md');
  expect(savedPandocPath({ getItem: () => '  /usr/bin/pandoc  ' })).toBe('/usr/bin/pandoc');
  expect(savedPandocPath({ getItem: () => '   ' })).toBeUndefined();
});

it('asks for a file next to the document, runs Pandoc with the document text, and reports the result', async () => {
  const { host, ex } = setup();
  await ex.exportAs('docx');
  expect(host.save).toHaveBeenCalledWith({ defaultPath: '/notes/Doc.docx', filters: [{ name: 'Word', extensions: ['docx'] }] });
  expect(host.invoke).toHaveBeenCalledWith('pandoc_export', { pandoc: '/opt/pandoc', format: 'docx', markdown: '# Doc', title: 'Doc', output: '/out/Doc.docx', base: '/notes' });
  expect(host.notify).toHaveBeenLastCalledWith('Exported to /out/Doc.docx');
  expect(ex.lastExport(3)).toEqual({ id: 'docx', target: '/out/Doc.docx' });
});

it('starts in the project folder for an unsaved document, and stops when the dialog is cancelled', async () => {
  const { host, ex } = setup({ path: '', saved: [null] });
  await ex.exportAs('epub');
  expect(host.save).toHaveBeenCalledWith(expect.objectContaining({ defaultPath: '/start/Doc.epub' }));
  expect(host.invoke).not.toHaveBeenCalled(); expect(host.notify).not.toHaveBeenCalled();
});

it('exports again with the previous format, and can overwrite the previous file without a dialog', async () => {
  const { host, ex } = setup({ saved: ['/out/Doc.docx', '/out/Second.docx'] });
  await ex.exportPrevious(false); expect(host.notify).toHaveBeenLastCalledWith('Export this document once first.');
  await ex.exportAs('docx');
  await ex.exportPrevious(false);
  expect(host.save).toHaveBeenLastCalledWith(expect.objectContaining({ defaultPath: '/out/Doc.docx' }));
  expect(host.invoke).toHaveBeenLastCalledWith('pandoc_export', expect.objectContaining({ format: 'docx', output: '/out/Second.docx' }));
  const saves = host.save.mock.calls.length;
  await ex.exportPrevious(true);
  expect(host.save.mock.calls.length).toBe(saves);
  expect(host.invoke).toHaveBeenLastCalledWith('pandoc_export', expect.objectContaining({ output: '/out/Second.docx' }));
});

it('shows the message when Pandoc fails or is missing, without recording a previous export', async () => {
  const { host, ex } = setup({ invoke: async () => { throw 'Pandoc is not installed, or MarkDew cannot find it.'; } });
  await ex.exportAs('rtf');
  expect(host.notify).toHaveBeenLastCalledWith('Export failed. Pandoc is not installed, or MarkDew cannot find it.');
  expect(ex.lastExport(3)).toBeUndefined();
  await ex.exportAs('nope'); expect(host.notify).toHaveBeenLastCalledWith('This export format is not available.');
});

it('imports into a Markdown file beside the source and opens it', async () => {
  const { host, ex } = setup({ saved: ['/in/Report.md'] });
  await ex.importFile();
  expect(host.save).toHaveBeenCalledWith({ defaultPath: '/in/Report.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
  expect(host.invoke).toHaveBeenCalledWith('pandoc_import', { pandoc: '/opt/pandoc', source: '/in/Report.docx', output: '/in/Report.md' });
  expect(host.openFile).toHaveBeenCalledWith('/in/Report.md'); expect(host.notify).toHaveBeenLastCalledWith('Imported Report.docx');
});

it('does not open anything when an import is cancelled or fails', async () => {
  const cancelled = setup({ saved: [null] }); await cancelled.ex.importFile();
  expect(cancelled.host.invoke).not.toHaveBeenCalled(); expect(cancelled.host.openFile).not.toHaveBeenCalled();
  const failed = setup({ saved: ['/in/Report.md'], invoke: async () => { throw new Error('Pandoc failed. bad file'); } });
  await failed.ex.importFile();
  expect(failed.host.openFile).not.toHaveBeenCalled(); expect(failed.host.notify).toHaveBeenLastCalledWith('Import failed. Pandoc failed. bad file');
});

const diagram = '# Doc\n\n```mermaid\nflowchart LR\n  A-->B\n```\n\ntext\n';
const png = 'data:image/png;base64,iVBORw0KGgo=';
function withDiagram(markdown: string, draw?: (source: string) => Promise<string>) {
  const s = setup(); s.host.document = () => ({ id: 3, path: '/notes/Doc.md', name: 'Doc.md', markdown });
  return { ...s, ex: pandocExchange({ ...s.host, drawDiagram: draw ?? (async () => png) }) };
}
it('draws Mermaid diagrams as pictures for formats that hold pictures', async () => {
  for (const format of ['docx', 'odt', 'rtf', 'epub', 'html', 'html-plain', 'latex']) {
    const { host, ex } = withDiagram(diagram);
    await ex.exportAs(format);
    expect(host.invoke.mock.calls.at(-1)![1].markdown, format).toBe(`# Doc\n\n![Mermaid diagram](${png})\n\ntext\n`);
  }
});
it('leaves Mermaid code alone for text formats, and reports a diagram that could not be drawn', async () => {
  for (const format of ['mediawiki', 'rst', 'textile', 'opml']) {
    const { host, ex } = withDiagram(diagram);
    await ex.exportAs(format); expect(host.invoke.mock.calls.at(-1)![1].markdown, format).toBe(diagram);
  }
  const { host, ex } = withDiagram(diagram + '\n```mermaid\nbad\n```\n', async source => { if (source === 'bad') throw new Error('x'); return png; });
  await ex.exportAs('docx');
  expect(host.invoke.mock.calls.at(-1)![1].markdown).toContain('```mermaid\nbad\n```');
  expect(host.notify).toHaveBeenLastCalledWith('Exported to /out/Doc.docx. 1 diagram was not drawn and stays as code.');
  expect(host.notify).toHaveBeenCalledWith('Drawing diagram 1 of 2…');
});
it('does not draw anything for a document without diagrams', async () => {
  const draw = vi.fn(async () => png); const { host, ex } = withDiagram('# Plain\n', draw);
  await ex.exportAs('docx'); expect(draw).not.toHaveBeenCalled(); expect(host.invoke.mock.calls.at(-1)![1].markdown).toBe('# Plain\n');
});
