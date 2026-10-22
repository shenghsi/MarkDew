// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { startupFixture } from './startup-fixture';
import { undoDepth } from '@codemirror/commands';
import { savedSource, sourceField } from '../../src/web/source';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), ask: vi.fn(), open: vi.fn(), save: vi.fn(),
  quit: undefined as undefined | ((event: { payload: number }) => void) }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: () => true }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: mocks.ask, open: mocks.open, save: mocks.save }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ onDragDropEvent: async () => vi.fn(), onCloseRequested: vi.fn(),
  listen: async (name: string, callback: typeof mocks.quit) => {
    if (name === 'markdew-quit-request') mocks.quit = callback;
    return vi.fn();
  } }) }));

it('guards application Quit and awaits exact recovery before approval while retaining source history', async () => {
  const original = '\uFEFF日本語😀\r\nbody\rtail\nEnd', listing = { session: 'current', revision: 0, entries: [], warnings: [] };
  let failRecovery = false, uncertainSave = false, confirmation: Promise<boolean> | undefined;
  let finishWrite: (() => void) | undefined, blockedWrite: Promise<void> | undefined;
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'document_start') return startupFixture(listing);
    if (command === 'create_document') return 1;
    if (command === 'recovery_document') return { session: 'tab-one', revision: 0, entries: [], warnings: [] };
    if (command === 'recovery_start' || command === 'recovery_list') return listing;
    if (command === 'quit_ready') return null;
    if (command === 'open_document') return { source: original, path: '/tmp/original.md' };
    if (command === 'recovery_checkpoint') { if (failRecovery) throw 'checkpoint failed'; if (blockedWrite) await blockedWrite; }
    if (command === 'save_document' && uncertainSave) throw { uncertain: true, message: 'save uncertain' };
  });
  mocks.ask.mockImplementation(() => confirmation || Promise.resolve(true)); mocks.open.mockResolvedValue('/tmp/original.md'); mocks.save.mockResolvedValue('/tmp/original.md');
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const source = () => savedSource(view.state.field(sourceField));
  const calls = (command: string) => mocks.invoke.mock.calls.filter(([name]) => name === command);
  const outcome = (request: number) => calls('resolve_quit').find(([, args]) => args.request === request)?.[1];
  await vi.waitFor(() => expect(calls('quit_ready')).toHaveLength(1));
  await vi.waitFor(() => expect(view.state.readOnly).toBe(false));
  document.querySelector<HTMLButtonElement>('#open')!.click(); await vi.waitFor(() => expect(source()).toBe(original));
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' unsaved' } }); const depth = undoDepth(view.state);
  Object.defineProperty(view, 'compositionStarted', { value: true, configurable: true }); mocks.quit!({ payload: 1 });
  await vi.waitFor(() => expect(outcome(1)).toEqual({ request: 1, allow: false }));
  expect(document.querySelector('#status')!.textContent).toContain('repeat Quit');
  Object.defineProperty(view, 'compositionStarted', { value: false, configurable: true });
  mocks.ask.mockResolvedValueOnce(false); mocks.quit!({ payload: 2 });
  await vi.waitFor(() => expect(outcome(2)?.allow).toBe(false)); expect(view.state.readOnly).toBe(false);
  failRecovery = true; mocks.quit!({ payload: 3 });
  await vi.waitFor(() => expect(outcome(3)?.allow).toBe(false)); expect(document.querySelector('#status')!.textContent).toContain('checkpoint failed');
  failRecovery = false;
  let finishConfirm!: (answer: boolean) => void;
  confirmation = new Promise(resolve => { finishConfirm = resolve; }); mocks.quit!({ payload: 4 });
  await vi.waitFor(() => expect(view.state.readOnly).toBe(true));
  const asks = mocks.ask.mock.calls.length; mocks.quit!({ payload: 4 }); expect(mocks.ask).toHaveBeenCalledTimes(asks);
  mocks.quit!({ payload: 5 }); await vi.waitFor(() => expect(outcome(5)?.allow).toBe(false));
  finishConfirm(false); confirmation = undefined; await vi.waitFor(() => expect(outcome(4)?.allow).toBe(false));
  expect(source()).toBe(original + ' unsaved'); expect(undoDepth(view.state)).toBe(depth);
  uncertainSave = true; document.querySelector<HTMLButtonElement>('#save')!.click();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toContain('uncertain'));
  mocks.quit!({ payload: 6 }); await vi.waitFor(() => expect(outcome(6)?.allow).toBe(false));
  expect(document.querySelector('#status')!.textContent).toContain('Check the last save');
  uncertainSave = false; document.querySelector<HTMLButtonElement>('#check')!.click();
  await vi.waitFor(() => expect(document.querySelector('#status')!.textContent).toBe('original.md'));
  view.dispatch({ changes: { from: view.state.doc.length, insert: ' later' } });
  blockedWrite = new Promise(resolve => { finishWrite = resolve; });
  const count = calls('recovery_checkpoint').length; mocks.quit!({ payload: 7 });
  await vi.waitFor(() => expect(calls('recovery_checkpoint').length).toBeGreaterThan(count));
  expect(outcome(7)).toBeUndefined(); expect(view.state.readOnly).toBe(true);
  expect(calls('recovery_checkpoint').at(-1)![1]).toMatchObject({ document: 0, source: '', dirty: false });
  finishWrite!(); blockedWrite = undefined; await vi.waitFor(() => expect(outcome(7)?.allow).toBe(true));
  expect(view.state.readOnly).toBe(true); expect(source()).toBe(original + ' unsaved later');
  expect(calls('recovery_checkpoint').at(-1)![1].dirty).toBe(true); // Quit retains its confirmed copy.
  expect(calls('recovery_checkpoint').at(-1)![1]).toMatchObject({ document: 1, source: original + ' unsaved later', dirty: true });
  view.destroy(); window.dispatchEvent(new Event('pagehide'));
});

it('uses the new pending token after listener registration instead of the queued old renderer event', async () => {
  vi.resetModules(); mocks.invoke.mockReset(); mocks.ask.mockReset();
  mocks.invoke.mockImplementation(async (command: string) => {
    if (command === 'quit_ready') { mocks.quit!({ payload: 10 }); return 11; }
    if (command === 'document_start') throw 'recovery unavailable';
    if (command === 'recovery_list') return { entries: [], warnings: [] };
  });
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');
  const freshSource = await import('../../src/web/source');
  await vi.waitFor(() => expect(mocks.invoke.mock.calls.filter(([name]) => name === 'resolve_quit')).toEqual([
    ['resolve_quit', { request: 11, allow: false }],
  ]));
  expect(view.state.readOnly).toBe(true); expect(freshSource.savedSource(view.state.field(freshSource.sourceField))).toBe('');
  view.destroy(); window.dispatchEvent(new Event('pagehide'));
});
