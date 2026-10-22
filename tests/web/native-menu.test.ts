// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { nativeMenu } from '../../src/web/native-menu';
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

it('uses only connected enabled command buttons and rejects busy/composition input', async () => {
  const ids = ['new', 'open', 'save', 'save-as', 'close-document', 'print', 'undo', 'redo'];
  document.body.innerHTML = ids.map(id => `<button id="${id}"></button>`).join('') + '<button id="quit"></button>';
  const clicks = vi.fn(); document.body.addEventListener('click', clicks);
  let handler!: (event: { payload: unknown }) => void, allowed = true;
  const remove = vi.fn(), report = vi.fn();
  const dispose = nativeMenu(document, async callback => { handler = callback; return remove; }, () => allowed, report);
  await settle();
  for (const id of ids) handler({ payload: id }); expect(clicks).toHaveBeenCalledTimes(8);
  for (const payload of ['quit', '', null, { id: 'save' }, 'constructor']) handler({ payload });
  allowed = false; handler({ payload: 'save' }); allowed = true;
  document.querySelector<HTMLButtonElement>('#save')!.disabled = true; handler({ payload: 'save' });
  document.querySelector('#open')!.remove(); handler({ payload: 'open' });
  expect(clicks).toHaveBeenCalledTimes(8); expect(report).not.toHaveBeenCalled();
  dispose(); dispose(); handler({ payload: 'new' }); expect(clicks).toHaveBeenCalledTimes(8); expect(remove).toHaveBeenCalledTimes(1);
  document.body.removeEventListener('click', clicks);
});

it('removes late registration and never replays events after disposal', async () => {
  const click = vi.fn(); document.body.innerHTML = '<button id="new"></button>'; document.querySelector('button')!.onclick = click;
  let handler!: (event: { payload: unknown }) => void, resolve!: (remove: () => void) => void;
  const remove = vi.fn(), dispose = nativeMenu(document, callback => { handler = callback; return new Promise(done => { resolve = done; }); }, () => true, vi.fn());
  await settle(); dispose(); handler({ payload: 'new' }); resolve(remove); await settle();
  expect(remove).toHaveBeenCalledTimes(1); expect(click).not.toHaveBeenCalled();
  const register = vi.fn(), stopped = nativeMenu(document, register, () => true, vi.fn()); stopped(); await settle();
  expect(register).not.toHaveBeenCalled();
});

it('reports failed registration only while the page is active', async () => {
  const report = vi.fn(), dispose = nativeMenu(document, async () => { throw Error('listener failed'); }, () => true, report);
  await settle(); expect(report).toHaveBeenCalledWith(expect.stringContaining('Use Tools')); dispose();
  report.mockClear(); let reject!: (reason: unknown) => void;
  const stopped = nativeMenu(document, () => new Promise((_resolve, fail) => { reject = fail; }), () => true, report);
  await settle(); stopped(); reject(Error('late failure')); await settle(); expect(report).not.toHaveBeenCalled();
});

it('routes theme commands to menu dispatcher', async () => {
  let handler!: (event: { payload: unknown }) => void;
  const dispatched: string[] = [];
  const dispatch = (cmd: string) => { dispatched.push(cmd); return true; };
  const dispose = nativeMenu(document, async callback => { handler = callback; return () => {}; }, () => true, vi.fn(), dispatch);
  await settle();

  handler({ payload: 'theme-light' });
  handler({ payload: 'theme-dark' });
  handler({ payload: 'theme-system' });
  handler({ payload: 'settings' });
  handler({ payload: 'about' });

  expect(dispatched).toEqual(['theme-light', 'theme-dark', 'theme-system', 'settings', 'about']);
  dispose();
});

