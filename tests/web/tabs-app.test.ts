// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { undo, redo, undoDepth } from '@codemirror/commands';
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn(), save: vi.fn(), ask: vi.fn(), destroy: vi.fn(),
  menu: undefined as undefined | ((event: { payload: unknown }) => void),
  close: undefined as undefined | ((event: { preventDefault(): void }) => Promise<void>),
  quit: undefined as undefined | ((event: { payload: number }) => void) }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: mocks.open, save: mocks.save, ask: mocks.ask }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({
  onDragDropEvent: async () => vi.fn(), onCloseRequested: (callback: typeof mocks.close) => { mocks.close = callback; },
  listen: async (event: string, callback: any) => {
    if (event === 'markdew-document-command') mocks.menu = callback;
    else if (event === 'markdew-quit-request') mocks.quit = callback;
    return vi.fn();
  }, destroy: mocks.destroy,
}) }));
let app: typeof import('../../src/web/main') | undefined;
afterEach(async () => {
  if (!app) return;
  await Promise.allSettled(app.tabs.all.map(tab => tab.recovery?.flush()));
  window.dispatchEvent(new Event('pagehide')); app.view.destroy(); app = undefined;
});
const original = '\uFEFF日本語😀\r\na\rb\n';
const calls = (command: string) => mocks.invoke.mock.calls.filter(([name]) => name === command);
const click = (id: string) => document.querySelector<HTMLButtonElement>(`#${id}`)!.click();
const select = (id: number) => document.querySelector<HTMLButtonElement>(`[data-document="${id}"]`)!.click();
const closeTab = () => document.querySelector<HTMLButtonElement>('.document-tabs > button')!.click();
const settled = () => new Promise(resolve => setTimeout(resolve, 0));
async function boot(extra = false, failStartup = false) {
  vi.resetModules(); Object.values(mocks).forEach(mock => { if (typeof mock === 'function' && 'mockReset' in mock) mock.mockReset(); });
  const flags = { failStartup, failCreate: false, failRead: false, failRetire: false, failClear: -1, failCheckpoint: -1 };
  type Record = { id: number; path: string; baseline: string; uncertain: boolean; session: string; revision: number;
    clear?: number; copy?: { source: string; dirty: boolean } };
  const records = new Map<number, Record>(); let next = 9;
  records.set(4, { id: 4, path: '/tmp/first.md', baseline: original, uncertain: false, session: 's4', revision: 0 });
  if (extra) records.set(9, { id: 9, path: '/tmp/second.md', baseline: 'Second\r\n', uncertain: true, session: 's9', revision: 0 });
  mocks.ask.mockResolvedValue(true); mocks.open.mockResolvedValue('/tmp/opened.md'); mocks.save.mockResolvedValue('/tmp/saved.md'); mocks.destroy.mockResolvedValue(undefined);
  mocks.invoke.mockImplementation(async (command: string, args?: any) => {
    if (command === 'document_start') {
      if (flags.failStartup) throw 'startup allocation failed';
      return { documents: [...records.values()].map(({ id, path, baseline, uncertain }) => ({ id, path, baseline, uncertain })),
        sessions: [...records.values()].map(({ id, session, revision }) => ({ document: id, session, revision })),
        recovery: { session: 's4', revision: 0, entries: [], warnings: [] } };
    }
    if (command === 'create_document') {
      if (flags.failCreate) throw 'creation failed'; const id = ++next;
      records.set(id, { id, path: '', baseline: '', uncertain: false, session: `s${id}`, revision: 0 }); return id;
    }
    if (command === 'quit_ready') return null;
    if (command === 'take_open_requests') return { paths: [], warnings: [] };
    if (command === 'resolve_quit') return;
    const record = records.get(args?.document);
    if (!record) throw new Error(`Unknown document in ${command}`);
    if (command === 'recovery_document' || command === 'recovery_list') return { session: record.session, revision: record.revision, entries: [], warnings: [] };
    if (command === 'recovery_checkpoint') {
      if (args.session !== record.session || args.revision <= record.revision) throw 'stale checkpoint';
      record.revision = args.revision; record.clear = undefined;
      if (flags.failCheckpoint === record.id || (!args.dirty && flags.failClear === record.id)) throw 'checkpoint failed';
      record.copy = { source: args.source, dirty: args.dirty }; if (!args.dirty) record.clear = args.revision; return;
    }
    if (command === 'open_document') {
      if (flags.failRead) throw 'read failed'; record.path = args.path; record.baseline = '\uFEFFOpened😀\r\nx\rtail\n';
      return { path: record.path, source: record.baseline };
    }
    if (command === 'save_document') { record.path = args.path; record.baseline = args.source; return; }
    if (command === 'check_save') { record.uncertain = false; return; }
    if (command === 'retire_document') {
      if (flags.failRetire) throw 'retirement failed';
      if (args.session !== record.session || args.revision !== record.clear) throw 'unconfirmed clear'; records.delete(record.id); return;
    }
    if (command === 'file_status') return { kind: 'unchanged', generation: 0 };
  });
  document.body.innerHTML = '<div id="app"></div>'; app = await import('../../src/web/main');
  const sourceModule = await import('../../src/web/source');
  const source = () => sourceModule.savedSource(app!.view.state.field(sourceModule.sourceField));
  if (!failStartup) await vi.waitFor(() => expect(app!.view.state.readOnly).toBe(false));
  return { flags, records, source };
}

it('names the document input and retains its title description through mode and tab changes', async () => {
  const { source } = await boot(true), { view } = app!;
  const input = () => view.contentDOM;
  expect(input().getAttribute('role')).toBe('textbox');
  expect(input().getAttribute('aria-label')).toBe('Markdown document');
  expect(input().getAttribute('aria-describedby')).toBe('document-title');
  expect(document.querySelector('#document-title')!.textContent).toBe('first.md');
  const original = source(), selection = view.state.selection, depth = undoDepth(view.state);
  click('source');
  expect(input().getAttribute('aria-label')).toBe('Markdown document');
  expect(source()).toBe(original); expect(view.state.selection.eq(selection)).toBe(true);
  expect(undoDepth(view.state)).toBe(depth);
  select(9);
  expect(document.querySelector('#document-title')!.textContent).toBe('second.md');
  expect(input().getAttribute('aria-describedby')).toBe('document-title');
  select(4); expect(source()).toBe(original); expect(undoDepth(view.state)).toBe(depth);
});

it('routes native menu history through source-preserving editor commands and rejects form composition', async () => {
  const { source } = await boot(), { view } = app!;
  await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  view.dispatch({ changes: { from: 0, insert: '中' } }); const changed = source();
  mocks.menu!({ payload: 'undo' }); expect(source()).toBe(original);
  mocks.menu!({ payload: 'redo' }); expect(source()).toBe(changed);
  const input = document.createElement('input'); document.querySelector('header')!.append(input);
  input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  mocks.menu!({ payload: 'open' }); mocks.menu!({ payload: 'undo' });
  expect(mocks.open).not.toHaveBeenCalled(); expect(source()).toBe(changed);
  input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  input.focus(); mocks.menu!({ payload: 'undo' }); expect(source()).toBe(changed);
  view.focus();
  mocks.menu!({ payload: 'undo' }); expect(source()).toBe(original);
});

it('drops repeated native file actions while busy and uses the existing New workflow', async () => {
  const { source } = await boot();
  await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  mocks.menu!({ payload: 'new' }); mocks.menu!({ payload: 'new' });
  await vi.waitFor(() => expect(app!.tabs.all).toHaveLength(2));
  await settled(); expect(calls('create_document')).toHaveLength(1);
  expect(source()).toBe(''); select(4); expect(source()).toBe(original);
});

it('keeps active cell edits on document history and blocks menu commands behind Print', async () => {
  const { source } = await boot(), { view } = app!;
  await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  click('insert-table');
  const { tableEditor } = await import('../../src/web/table');
  const table = tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!;
  const before = source(); table.child!.dispatch({ changes: { from: 0, insert: '中' } });
  const typed = source(); table.child!.focus();
  mocks.menu!({ payload: 'undo' }); expect(source()).toBe(before);
  mocks.menu!({ payload: 'redo' }); expect(source()).toBe(typed);
  const dialog = document.createElement('section'); dialog.className = 'print-dialog';
  const control = document.createElement('button'); dialog.append(control); document.body.append(dialog); control.focus();
  const depth = undoDepth(view.state), count = app!.tabs.all.length;
  for (const payload of ['new', 'open', 'save', 'undo', 'redo']) mocks.menu!({ payload });
  expect(source()).toBe(typed); expect(undoDepth(view.state)).toBe(depth); expect(app!.tabs.all).toHaveLength(count);
  expect(mocks.open).not.toHaveBeenCalled(); expect(dialog.isConnected).toBe(true); expect(document.activeElement).toBe(control);
  dialog.remove();
});

it.each(['toolbar', 'menu'])('retains cell input after %s history, including an empty Redo', async route => {
  const { source, records } = await boot(), { view } = app!;
  await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  click('insert-table');
  const { tableEditor } = await import('../../src/web/table');
  const cell = () => tableEditor(document.querySelector<HTMLElement>('.preview-table')!)!.child!;
  const history = (command: string) => route === 'menu' ? mocks.menu!({ payload: command }) : click(command);
  const before = source(), baseline = records.get(4)!.baseline;
  cell().dispatch({ changes: { from: 0, insert: '中😀' }, selection: { anchor: 3 } });
  const typed = source(), depth = undoDepth(view.state);
  cell().focus();
  history('redo'); await settled();
  expect(cell().hasFocus).toBe(true);
  expect(cell().state.selection.main.head).toBe(3);
  expect(source()).toBe(typed); expect(undoDepth(view.state)).toBe(depth);
  history('undo'); await settled();
  expect(source()).toBe(before); expect(cell().hasFocus).toBe(true);
  history('redo'); await settled();
  expect(source()).toBe(typed); expect(cell().hasFocus).toBe(true);
  expect(cell().state.selection.main.head).toBe(3);
  cell().dispatch({ changes: { from: 3, insert: '続' }, selection: { anchor: 4 } });
  expect(source()).toBe(typed.replace('中😀', '中😀続'));
  history('undo');
  const input = document.createElement('input'); document.body.append(input); input.focus();
  await settled(); expect(document.activeElement).toBe(input);
  expect(records.get(4)!.baseline).toBe(baseline);
});

it.each(['toolbar', 'menu'])('restores input in the correct table after %s Undo', async route => {
  const { source } = await boot(), { view } = app!;
  await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  const original = '\uFEFF| A |\r\n|---|\r\n| first |\r\n\r\nMiddle\r\n\r\n| B |\r\n|---|\r\n| second |\r\n\r\nEnd';
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: original.slice(1).replace(/\r\n/g, '\n') },
    selection: { anchor: original.slice(1).replace(/\r\n/g, '\n').length } });
  const { tableEditor } = await import('../../src/web/table');
  const tables = () => Array.from(document.querySelectorAll<HTMLElement>('.preview-table'), dom => tableEditor(dom)!);
  tables()[0].begin(1, 0);
  tables()[0].child!.dispatch({ changes: { from: 0, insert: '中' }, selection: { anchor: 1 } });
  tables()[1].begin(1, 0); tables()[1].child!.focus();
  if (route === 'menu') mocks.menu!({ payload: 'undo' }); else click('undo');
  await settled();
  expect(tables()[0].child!.hasFocus).toBe(true);
  expect(tables()[1].child).toBeUndefined();
  expect(source()).toBe(original);
  tables()[0].child!.dispatch({ changes: { from: 0, insert: '続' }, selection: { anchor: 1 } });
  expect(source()).toBe(original.replace('first', '続first'));
});

it('opens the active document print snapshot without changing source, history, selection or baseline', async () => {
  const { source, records } = await boot();
  const show = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: show });
  const print = vi.spyOn(window, 'print').mockImplementation(() => {});
  app!.view.dispatch({ changes: { from: app!.view.state.doc.length, insert: 'Print this edit' }, selection: { anchor: 3 }, userEvent: 'input.type' });
  const before = source(), depth = undoDepth(app!.view.state), baseline = records.get(4)!.baseline;
  app!.view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  click('print'); expect(document.querySelector('.print-dialog')).toBeNull();
  app!.view.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  click('print'); await vi.waitFor(() => expect(document.querySelector('.print-controls [role=status]')!.textContent).toContain('Ready to print'));
  expect(document.querySelector('.print-paper')!.textContent).toContain('Print this edit');
  expect(source()).toBe(before); expect(undoDepth(app!.view.state)).toBe(depth); expect(app!.view.state.selection.main.anchor).toBe(3);
  expect(records.get(4)!.baseline).toBe(baseline); expect(calls('save_document')).toHaveLength(0); expect(app!.tabs.active.id).toBe(4);
  click('print'); await settled(); expect(document.querySelectorAll('.print-dialog')).toHaveLength(1);
  document.querySelector('.print-dialog')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(print).toHaveBeenCalledTimes(1);
  document.querySelector<HTMLButtonElement>('.print-controls button:last-child')!.click();
  expect(document.querySelector('.print-dialog')).toBeNull(); undo(app!.view); expect(source()).toBe(original);
  print.mockRestore();
});

it('keeps exact independent history and mode, routes Save to its tab, and guards form composition', async () => {
  const { source } = await boot(); const view = app!.view;
  expect(app!.tabs.active.id).toBe(4); expect(source()).toBe(original);
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' first edit' }, selection: { anchor: 2 }, userEvent: 'input.type' });
  const firstEdit = source(), firstDepth = undoDepth(view.state); click('source');
  click('new'); await vi.waitFor(() => expect(app!.tabs.active.id).toBe(10)); await settled();
  view.dispatch({ changes: { from: 0, insert: 'Second 文' }, userEvent: 'input.type' }); const secondEdit = source();
  select(4); expect(source()).toBe(firstEdit); expect(view.state.selection.main.anchor).toBe(2);
  expect(undoDepth(view.state)).toBe(firstDepth); expect(document.querySelector('#source')!.getAttribute('aria-pressed')).toBe('true');
  undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(firstEdit);
  select(10); expect(source()).toBe(secondEdit); undo(view); expect(source()).toBe(''); redo(view);
  click('save'); await vi.waitFor(() => expect(calls('save_document')).toHaveLength(1)); await settled();
  expect(calls('save_document')[0][1]).toEqual({ document: 10, path: '/tmp/saved.md', source: secondEdit });
  view.dispatch({ selection: { anchor: 1 } }); click('link');
  const field = document.querySelector<HTMLInputElement>('.link-controls input')!;
  field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); select(4); closeTab();
  expect(app!.tabs.active.id).toBe(10); expect(calls('retire_document')).toHaveLength(0);
  field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); select(4);
  expect((document.querySelector('.link-controls') as HTMLElement).hidden).toBe(true); expect(source()).toBe(firstEdit);
});

it('retains restart uncertainty without document zero and retries a locked startup failure', async () => {
  const { flags, source } = await boot(true, true);
  await vi.waitFor(() => expect(document.querySelector('.recovery-panel')!.textContent).toContain('startup allocation failed'));
  expect(app!.view.state.readOnly).toBe(true); click('new'); expect(calls('create_document')).toHaveLength(0);
  flags.failStartup = false;
  Array.from(document.querySelectorAll<HTMLButtonElement>('.recovery-panel button')).find(button => button.textContent === 'Retry recovery')!.click();
  await vi.waitFor(() => expect(app!.tabs.all).toHaveLength(2)); await settled(); select(9);
  expect(source()).toBe('Second\r\n'); closeTab();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('Check the last save'));
  expect(calls('retire_document')).toHaveLength(0); expect(app!.tabs.active.id).toBe(9);
  click('check'); await vi.waitFor(() => expect(app!.tabs.active.uncertain).toBe(false)); await settled();
  closeTab(); await vi.waitFor(() => expect(app!.tabs.all).toHaveLength(1));
  expect(calls('retire_document').at(-1)![1]).toMatchObject({ document: 9, session: 's9' }); expect(source()).toBe(original);
});

it('retains failed last-tab creation or activation and restores recovery after failed retirement', async () => {
  const { flags, records, source } = await boot();
  flags.failCreate = true; closeTab(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('creation failed'));
  expect(app!.tabs.active.id).toBe(4); expect(source()).toBe(original); expect(records.has(4)).toBe(true);
  flags.failCreate = false; const activation = vi.spyOn(app!.tabs, 'activate').mockReturnValueOnce(false);
  closeTab(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('close this tab again'));
  expect(calls('retire_document')).toHaveLength(0); expect(app!.tabs.active.id).toBe(4); activation.mockRestore();
  app!.view.dispatch({ changes: { from: app!.view.state.doc.length, insert: ' unsaved' } }); const edited = source();
  mocks.ask.mockResolvedValueOnce(false); closeTab(); await vi.waitFor(() => expect(app!.view.state.readOnly).toBe(false));
  expect(calls('retire_document')).toHaveLength(0); expect(source()).toBe(edited); expect(app!.tabs.active.id).toBe(4);
  flags.failRetire = true; closeTab(); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('retirement failed'));
  expect(app!.tabs.active.id).toBe(4); expect(source()).toBe(edited); expect(records.get(4)!.copy).toEqual({ source: edited, dirty: true });
  flags.failRetire = false; closeTab(); await vi.waitFor(() => expect(records.has(4)).toBe(false));
  expect(app!.tabs.active.id).toBe(10); expect(app!.view.state.readOnly).toBe(false);
});

it('retires a failed Open allocation without replacing current source or history', async () => {
  const { flags, records, source } = await boot();
  app!.view.dispatch({ changes: { from: app!.view.state.doc.length, insert: ' draft' } }); const edited = source(), depth = undoDepth(app!.view.state);
  flags.failRead = true; click('open'); await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('read failed'));
  expect(source()).toBe(edited); expect(undoDepth(app!.view.state)).toBe(depth); expect(app!.tabs.all).toHaveLength(1); expect(records.has(10)).toBe(false);
  expect(calls('retire_document').at(-1)![1]).toMatchObject({ document: 10, session: 's10' });
});

it('rebuilds all dirty recovery copies after partial window Close clearance fails', async () => {
  const { flags, records, source } = await boot();
  app!.view.dispatch({ changes: { from: app!.view.state.doc.length, insert: ' first draft' } }); const first = source();
  click('new'); await vi.waitFor(() => expect(app!.tabs.active.id).toBe(10)); await settled();
  app!.view.dispatch({ changes: { from: 0, insert: 'second draft' } }); flags.failClear = 10;
  await mocks.close!({ preventDefault: vi.fn() });
  expect(mocks.destroy).not.toHaveBeenCalled(); expect(records.get(4)!.copy).toEqual({ source: first, dirty: true });
  expect(records.get(10)!.copy).toEqual({ source: 'second draft', dirty: true });
  expect(source()).toBe('second draft'); expect(app!.view.state.readOnly).toBe(false); expect(app!.tabs.all).toHaveLength(2);
});

it('prevents Quit when an inactive tab checkpoint fails and then confirms every exact copy', async () => {
  const { flags, records, source } = await boot();
  app!.view.dispatch({ changes: { from: app!.view.state.doc.length, insert: ' first draft' } }); const first = source();
  click('new'); await vi.waitFor(() => expect(app!.tabs.active.id).toBe(10)); await settled();
  app!.view.dispatch({ changes: { from: 0, insert: 'second draft' } }); flags.failCheckpoint = 4;
  mocks.quit!({ payload: 1 });
  await vi.waitFor(() => expect(calls('resolve_quit').find(([, args]) => args.request === 1)?.[1]).toEqual({ request: 1, allow: false }));
  expect(app!.view.state.readOnly).toBe(false); expect(source()).toBe('second draft');
  flags.failCheckpoint = -1; mocks.quit!({ payload: 2 });
  await vi.waitFor(() => expect(calls('resolve_quit').find(([, args]) => args.request === 2)?.[1]).toEqual({ request: 2, allow: true }));
  expect(records.get(4)!.copy).toEqual({ source: first, dirty: true });
  expect(records.get(10)!.copy).toEqual({ source: 'second draft', dirty: true });
  expect(app!.view.state.readOnly).toBe(true);
});

it('shows an empty state after the last tab closes and reuses its blank tab for New and Open', async () => {
  await boot(); const empty = () => document.body.classList.contains('no-document');
  const created = () => calls('create_document').length;
  expect(empty()).toBe(false);
  click('close-document');
  await vi.waitFor(() => expect(empty()).toBe(true));
  const placeholder = app!.tabs.active;
  expect(app!.tabs.all).toHaveLength(1); expect(placeholder.placeholder).toBe(true);
  expect(document.querySelector<HTMLElement>('#empty-document')!.hidden).toBe(false);
  expect(document.querySelector('#empty-document h2')!.textContent).toBe('No file is open');
  for (const id of ['save', 'save-as', 'find', 'undo', 'print', 'close-document', 'tools-toggle'])
    expect(document.querySelector<HTMLButtonElement>(`#${id}`)!.disabled).toBe(true);
  // Native menu commands for the hidden document are refused; New and Open still work.
  const before = created(); await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  mocks.menu!({ payload: 'bold' }); mocks.menu!({ payload: 'save' });
  expect(calls('save_document')).toHaveLength(0); expect(mocks.save).not.toHaveBeenCalled();
  click('empty-new'); await settled();
  expect(empty()).toBe(false); expect(document.querySelector<HTMLElement>('#empty-document')!.hidden).toBe(true);
  expect(app!.tabs.active).toBe(placeholder); expect(placeholder.placeholder).toBe(false); expect(app!.tabs.all).toHaveLength(1);
  expect(created()).toBe(before); expect(document.querySelector<HTMLButtonElement>('#save')!.disabled).toBe(false);
  click('close-document'); await vi.waitFor(() => expect(empty()).toBe(true));
  const blank = app!.tabs.active;
  click('empty-open');
  await vi.waitFor(() => expect(app!.tabs.active.path).toBe('/tmp/opened.md'));
  expect(empty()).toBe(false); expect(app!.tabs.all).toHaveLength(1); expect(app!.tabs.active).toBe(blank);
});

it('keeps the editor when a file tab closes while another tab stays open', async () => {
  await boot(true);
  click('close-document'); await settled(); await settled();
  expect(document.body.classList.contains('no-document')).toBe(false); expect(app!.tabs.all).toHaveLength(1);
});

it('starts the Open File dialog in the folder of the current file', async () => {
  await boot();
  click('open'); await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1));
  expect(mocks.open.mock.calls[0][0]).toMatchObject({ multiple: false, defaultPath: '/tmp' });
});

it('starts the Open Folder dialog from the menu in the folder of the current file', async () => {
  await boot(); await vi.waitFor(() => expect(mocks.menu).toBeDefined());
  mocks.open.mockResolvedValueOnce(null);
  mocks.menu!({ payload: 'open-folder' }); await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1));
  expect(mocks.open.mock.calls[0][0]).toMatchObject({ directory: true, defaultPath: '/tmp' });
  mocks.open.mockClear(); await settled();
  mocks.menu!({ payload: 'open' }); await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1));
  expect(mocks.open.mock.calls[0][0]).toMatchObject({ defaultPath: '/tmp' });
});

it('opens each file in one tab, matching a linked spelling of the same path', async () => {
  await boot();
  const base = mocks.invoke.getMockImplementation()!;
  mocks.invoke.mockImplementation(async (command: string, args?: any) =>
    command === 'canonical_path' ? args.path.replace(/^\/link\//, '/tmp/') : base(command, args));
  mocks.open.mockResolvedValue('/link/first.md');
  click('open'); await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(1));
  await new Promise(resolve => setTimeout(resolve, 300)); // A wrongly opened second tab needs time to appear.
  expect(app!.tabs.all).toHaveLength(1); expect(app!.tabs.active.id).toBe(4);
  expect(calls('open_document')).toHaveLength(0); expect(calls('create_document')).toHaveLength(0);
  // A different file still opens normally.
  mocks.open.mockResolvedValue('/tmp/other.md');
  click('open'); await vi.waitFor(() => expect(mocks.open).toHaveBeenCalledTimes(2));
  await vi.waitFor(() => expect(app!.tabs.all).toHaveLength(2));
  expect(app!.tabs.active.path).toBe('/tmp/other.md');
});
