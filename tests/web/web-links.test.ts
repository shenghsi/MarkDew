// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { invoke } from '@tauri-apps/api/core';
import { EditorState, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { ensureSyntaxTree } from '@codemirror/language';
import { history, undoDepth } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField } from '../../src/web/footnotes';
import { imageDocument } from '../../src/web/images';
import { fromSource, normalize, sourceExtensions, sourceField, savedSource } from '../../src/web/source';
import { linkTarget, followLink, linkNavigation } from '../../src/web/link-navigation';
import { webURL, webLinkLimit, webLinkOpener } from '../../src/web/web-links';
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
const cases: [string, string | null][] = JSON.parse(readFileSync('tests/web/web-link-cases.json', 'utf8'));
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
let view: EditorView | undefined, opener: ReturnType<typeof webLinkOpener> | undefined;
afterEach(() => { opener?.dispose(); opener = undefined; view?.destroy(); view = undefined; document.body.replaceChildren(); vi.mocked(invoke).mockReset(); });
function state(source = '[Web](https://example.com)\n\nEnd', id = 42) {
  const record = fromSource(source);
  let value = EditorState.create({ doc: normalize(record.raw), selection: { anchor: 1 }, extensions: [sourceExtensions(record), history(),
    documentLanguage(), footnoteField, imageDocument.of(id)] });
  expect(ensureSyntaxTree(value, value.doc.length, 1000)).not.toBeNull(); return value.update({}).state;
}
it('matches the shared Rust URL cases and byte bounds', () => {
  for (const [source, expected] of cases) {
    if (expected === null) expect(() => webURL(source)).toThrow(); else expect(webURL(source)).toBe(expected);
  }
  const prefix = 'https://example.com/', exact = prefix + 'a'.repeat(webLinkLimit - prefix.length);
  expect(webURL(exact).length).toBe(webLinkLimit); expect(() => webURL(exact + 'a')).toThrow();
  expect(() => webURL(prefix + '日'.repeat(1000))).toThrow();
});
it('resolves direct, reference, and explicit autolinks to distinct normalized web targets', () => {
  for (const source of ['[Web](HTTPS://Example.com/path?q=1&amp;x=2)', '[Web][ref]\n\n[ref]: https://example.com/path?q=1&x=2',
    '<https://example.com/path?q=1&x=2>']) {
    expect(linkTarget(state(source), 1)).toEqual({ kind: 'web', url: 'https://example.com/path?q=1&x=2' });
  }
  const table = '| A |\n| - |\n| [Web](https://example.com) |';
  expect(linkTarget(state(table), table.indexOf('Web'))).toBeUndefined();
});
it('dispatches the validated host URL once without changing state, source, history or focus', async () => {
  const original = '\uFEFF[Web](https://例え.テスト/日本語)\r\n\rEnd\n', initial = state(original), report = vi.fn();
  view = new EditorView({ state: initial, parent: document.body }); view.focus();
  vi.mocked(invoke).mockResolvedValue(undefined); opener = webLinkOpener(view, report);
  expect(followLink(view, 1, report, () => null, url => opener!.open(url))).toBe(true);
  expect(invoke).toHaveBeenCalledExactlyOnceWith('open_web_link', { url: webURL('https://例え.テスト/日本語') });
  await Promise.resolve(); expect(view.state).toBe(initial); expect(document.activeElement).toBe(view.contentDOM);
  expect(savedSource(view.state.field(sourceField))).toBe(original); expect(undoDepth(view.state)).toBe(0);
  expect(report).toHaveBeenLastCalledWith('Web link open requested.');
});
it('rejects blocked or invalid requests without queuing a later launch', async () => {
  const initial = state(), report = vi.fn(); view = new EditorView({ state: initial, parent: document.body });
  let busy = true; opener = webLinkOpener(view, report, () => busy ? 'Busy' : null);
  opener.open('https://example.com'); expect(invoke).not.toHaveBeenCalled();
  busy = false; await Promise.resolve(); expect(invoke).not.toHaveBeenCalled();
  opener.open('file:///tmp/test.md'); expect(invoke).not.toHaveBeenCalled();
  view.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  opener.open('https://example.com'); expect(invoke).not.toHaveBeenCalled(); expect(view.state).toBe(initial);
});
it.each(['edit', 'selection', 'tab', 'dispose', 'disconnect'] as const)('suppresses late host status after %s', async change => {
  const initial = state(), report = vi.fn(); view = new EditorView({ state: initial, parent: document.body });
  let reject!: (reason: unknown) => void;
  vi.mocked(invoke).mockReturnValue(new Promise((_resolve, no) => { reject = no; }));
  opener = webLinkOpener(view, report); opener.open('https://example.com');
  if (change === 'edit') view.dispatch({ changes: { from: view.state.doc.length, insert: 'x' } });
  else if (change === 'selection') view.dispatch({ selection: { anchor: view.state.doc.length } });
  else if (change === 'tab') view.setState(state(undefined, 43));
  else if (change === 'dispose') opener.dispose(); else view.dom.remove();
  reject(new Error('Old failure')); await Promise.resolve();
  expect(report.mock.calls).toEqual([['Opening web link…']]); expect(invoke).toHaveBeenCalledTimes(1);
});
it('reports the current failure and ignores older successful requests', async () => {
  view = new EditorView({ state: state(), parent: document.body }); const report = vi.fn();
  let resolve!: () => void, reject!: (reason: unknown) => void;
  vi.mocked(invoke).mockReturnValueOnce(new Promise<void>(yes => { resolve = yes; }))
    .mockReturnValueOnce(new Promise((_yes, no) => { reject = no; }));
  opener = webLinkOpener(view, report); opener.open('https://example.com/one'); opener.open('https://example.com/two');
  resolve(); await Promise.resolve(); expect(report.mock.calls).toEqual([['Opening web link…'], ['Opening web link…']]);
  reject(new Error('Host rejected')); await Promise.resolve(); expect(report).toHaveBeenLastCalledWith('Cannot open web link: Error: Host rejected');
});
it('keeps newer status and invalid-request messages after an older host reply', async () => {
  view = new EditorView({ state: state(), parent: document.body });
  let resolve!: () => void, status = '';
  const open = vi.fn(() => new Promise<void>(yes => { resolve = yes; }));
  opener = webLinkOpener(view, message => { status = message; }, () => null, open, () => status === 'Opening web link…');
  opener.open('https://example.com'); status = 'The heading link target was not found.';
  resolve(); await Promise.resolve(); expect(status).toBe('The heading link target was not found.');
  opener.open('https://example.com'); opener.open('file:///tmp/test.md'); const failure = status;
  resolve(); await Promise.resolve(); expect(status).toBe(failure); expect(open).toHaveBeenCalledTimes(2);
});
it('ignores repeated or composing Mod-Enter and leaves ordinary Enter to the editor', () => {
  const open = vi.fn(), initial = state();
  view = new EditorView({ state: initial.update({ effects: StateEffect.appendConfig.of(linkNavigation(() => {}, () => null, open)) }).state, parent: document.body });
  const event = (extra: KeyboardEventInit = {}) => new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true, ...extra });
  view.contentDOM.dispatchEvent(event()); view.contentDOM.dispatchEvent(event({ repeat: true })); view.contentDOM.dispatchEvent(event({ isComposing: true }));
  expect(open).toHaveBeenCalledExactlyOnceWith('https://example.com/');
  const ordinary = event({ ctrlKey: false }); view.contentDOM.dispatchEvent(ordinary); expect(ordinary.defaultPrevented).toBe(false);
});
