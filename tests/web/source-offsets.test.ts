import { expect, it } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { history, undo, redo } from '@codemirror/commands';
import { fromSource, lineEnding, normalize, rawOffset, sourceOffset, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

function legacyOffset(raw: string, position: number): number {
  let logical = 0, offset = 0;
  while (offset < raw.length && logical < position) {
    offset += raw[offset] === '\r' && raw[offset + 1] === '\n' ? 2 : 1; logical++;
  }
  return offset;
}
it('matches the original UTF-16 walk at all offsets and invalid positions', () => {
  for (const raw of ['', 'a\nb\n', 'a\rb\r', 'a\r\nb\r\n', '😀\r\n中文\rかな\n𠀀e\u0301',
    '\r\n'.repeat(100), 'a\r\r\nb\n\r\n', 'no line endings']) {
    const positions = [-Infinity, Infinity, NaN, -20, -.2, .1, .9, 1.1, raw.length + 30];
    for (let offset = 0; offset <= raw.length + 1; offset++) positions.push(offset, offset + .5);
    const record = fromSource(raw);
    for (const position of positions) {
      expect(rawOffset(raw, position), `${JSON.stringify(raw)} at ${position}`).toBe(legacyOffset(raw, position));
      expect(sourceOffset(record, position)).toBe(legacyOffset(raw, position));
    }
  }
});
it('matches legacy multi-change source patches and retains cached records through Undo/Redo', () => {
  for (const ending of ['\n', '\r', '\r\n', 'mixed']) {
    const raw = ending === 'mixed' ? '😀A\r\n中文B\rかなC\nTail' : ['😀A','中文B','かなC','Tail'].join(ending);
    const original = '\uFEFF' + raw, record = fromSource(original);
    let state = EditorState.create({ doc: normalize(raw), extensions: [history(), sourceExtensions(record)] });
    const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
    for (const insert of ['QQ', '日本\n', '', '𠀀', '\n\n']) {
      const before = state.field(sourceField);
      const transaction = state.update({ changes: [{ from: 1, to: 2, insert }, { from: state.doc.length, insert: '!\n' }], userEvent: 'input.paste' });
      const patches: { from: number; to: number; text: string }[] = [];
      transaction.changes.iterChanges((from,to,_a,_b,text) => patches.push({ from: legacyOffset(before.raw,from), to: legacyOffset(before.raw,to), text: text.toString().replace(/\n/g,lineEnding(before.raw)) }));
      let expected = before.raw;
      for (const patch of patches.reverse()) expected = expected.slice(0,patch.from) + patch.text + expected.slice(patch.to);
      state = transaction.state; expect(state.field(sourceField).raw).toBe(expected);
      expect(normalize(expected)).toBe(state.doc.toString());
      const changed = state.field(sourceField);
      expect(undo(target)).toBe(true); expect(state.field(sourceField)).toBe(before); expect(savedSource(state.field(sourceField))).toBe(original);
      expect(redo(target)).toBe(true); expect(state.field(sourceField).raw).toBe(changed.raw);
      expect(undo(target)).toBe(true); expect(state.field(sourceField)).toBe(before);
    }
  }
});
it('keeps exact dense CRLF source after edits near both ends and across line boundaries', () => {
  const original = '\uFEFF' + '😀 text\r\n'.repeat(3000), record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [history(), sourceExtensions(record)] });
  const from = state.doc.length - 9;
  const transaction = state.update({ changes: [{ from: 1, insert: 'A' }, { from, to: from + 2, insert: '中文\n' }] });
  state = transaction.state;
  const expected = record.raw.slice(0,1) + 'A' + record.raw.slice(1,legacyOffset(record.raw,from)) + '中文\r\n' + record.raw.slice(legacyOffset(record.raw,from + 2));
  expect(state.field(sourceField).raw).toBe(expected); expect(normalize(expected)).toBe(state.doc.toString());
});
