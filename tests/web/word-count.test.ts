// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { EditorState, Text, Transaction } from '@codemirror/state';
import { history, undo } from '@codemirror/commands';
import { countDocument } from '../../src/web/document-count';
import { wordCount } from '../../src/web/word-count';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

class CountWorker {
  onmessage: Worker['onmessage'] = null;
  onerror: Worker['onerror'] = null;
  onmessageerror: Worker['onmessageerror'] = null;
  postMessage = vi.fn(); terminate = vi.fn();
  reply(data: unknown) { this.onmessage?.call(this as unknown as Worker, new MessageEvent('message', { data })); }
}
function fixture() {
  vi.useFakeTimers();
  const label = document.createElement('span'), workers: CountWorker[] = [];
  const create = vi.fn(() => { const worker = new CountWorker(); workers.push(worker); return worker; });
  return { label, workers, create, count: wordCount(label, create) };
}
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('counts English words, Unicode code points and source text without rendering', () => {
  expect(countDocument('Hello 👩‍💻 e\u0301')).toEqual({ words: 2, characters: 12 });
  expect(countDocument('مرحبا עולם').words).toBe(2);
  for (const text of ['中文写作', '日本語の文章', '한글 문장']) expect(countDocument(text).words).toBeGreaterThan(0);
  expect(countDocument('---\ntitle: Example\n---\n```js\nconst x = 1;\n```').words).toBe(6);
  expect(countDocument(' \n\t')).toEqual({ words: 0, characters: 3 });
});

it('defers snapshots until typing stops and counts only the latest document', () => {
  const { count, label, create, workers } = fixture();
  const first = Text.of(['First words']), second = Text.of(['Latest words']), snapshot = vi.spyOn(second, 'toString');
  count.update(first); vi.advanceTimersByTime(400); count.update(second);
  vi.advanceTimersByTime(400); expect(create).not.toHaveBeenCalled(); expect(snapshot).not.toHaveBeenCalled();
  expect(label.textContent).toBe('Counting…');
  vi.advanceTimersByTime(100); expect(snapshot).toHaveBeenCalledTimes(1);
  const request = workers[0].postMessage.mock.calls[0][0];
  expect(request.text).toBe('Latest words'); workers[0].reply({ generation: request.generation, words: 2, characters: 12 });
  expect(label.textContent).toBe('2 words'); expect(label.title).toContain('Unicode code points');
  count.update(second); vi.advanceTimersByTime(1000); expect(workers[0].postMessage).toHaveBeenCalledTimes(1);
  count.destroy();
});

it('rejects stale replies across edits and tab switches and bounds requests', () => {
  const { count, label, workers } = fixture();
  count.update(Text.of(['Old tab'])); vi.advanceTimersByTime(500);
  const old = workers[0], callback = old.onmessage!, request = old.postMessage.mock.calls[0][0];
  count.update(Text.of(['New tab'])); expect(old.terminate).toHaveBeenCalledTimes(1); expect(label.textContent).toBe('Counting…');
  callback.call(old as unknown as Worker, new MessageEvent('message', { data: { generation: request.generation, words: 99, characters: 100 } }));
  expect(label.textContent).toBe('Counting…');
  vi.advanceTimersByTime(500); const next = workers[1].postMessage.mock.calls[0][0];
  workers[1].reply({ generation: request.generation, words: 99, characters: 100 }); expect(label.textContent).toBe('Counting…');
  workers[1].reply({ generation: next.generation, words: 2, characters: 7 }); expect(label.textContent).toBe('2 words');
  count.update(Text.empty); expect(label.textContent).toBe('0 words');
  workers[1].reply({ generation: next.generation, words: 99, characters: 100 }); expect(label.textContent).toBe('0 words');
  count.destroy();
});

it('handles worker failure and unsupported segmentation without a main-thread scan', () => {
  const { count, label, workers } = fixture(), doc = Text.of(['words']), snapshot = vi.spyOn(doc, 'toString');
  count.update(doc); vi.advanceTimersByTime(500);
  workers[0].onerror?.call(workers[0] as unknown as Worker, new ErrorEvent('error'));
  expect(label.textContent).toBe('Count unavailable'); expect(snapshot).toHaveBeenCalledTimes(1);
  count.update(Text.of(['more words'])); vi.advanceTimersByTime(500);
  const request = workers[1].postMessage.mock.calls[0][0];
  workers[1].reply({ generation: request.generation, error: true }); expect(label.textContent).toBe('Count unavailable');
  count.destroy();
  vi.stubGlobal('Intl', { Segmenter: undefined }); expect(() => countDocument('words')).toThrow();
});

it('disposes timers, listeners, worker and late results', () => {
  const pending = fixture(); pending.count.update(Text.of(['words'])); pending.count.destroy();
  vi.advanceTimersByTime(1000); expect(pending.create).not.toHaveBeenCalled();
  const running = fixture(); running.count.update(Text.of(['words'])); vi.advanceTimersByTime(500);
  running.count.destroy(); expect(running.workers[0].terminate).toHaveBeenCalledTimes(1);
  expect(running.workers[0].onmessage).toBeNull(); expect(running.workers[0].onerror).toBeNull();
  running.count.update(Text.of(['later'])); vi.advanceTimersByTime(500); expect(running.create).toHaveBeenCalledTimes(1);
});

it('changes no source record, selection or history', () => {
  const { count, workers } = fixture(), original = '\uFEFFHello world\r\nNext\rEnd', record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), selection: { anchor: 3 }, extensions: [history(), sourceExtensions(record)] });
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  count.update(state.doc); vi.advanceTimersByTime(500);
  workers[0].reply({ generation: workers[0].postMessage.mock.calls[0][0].generation, ...countDocument(state.doc.toString()) });
  expect(savedSource(state.field(sourceField))).toBe(original); expect(state.selection.main.head).toBe(3); expect(undo(target)).toBe(false);
  state = state.update({ changes: { from: 2, insert: '中' } }).state; count.update(state.doc);
  expect(undo(target)).toBe(true); expect(savedSource(state.field(sourceField))).toBe(original);
  count.destroy();
});
