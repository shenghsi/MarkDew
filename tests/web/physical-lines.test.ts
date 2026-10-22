import { expect, it } from 'vitest';
import { Text } from '@codemirror/state';
import { physicalLines } from '../../src/web/physical-lines';

function check(doc: Text) {
  const lines = physicalLines(doc);
  // Query forward, backward, and repeatedly across both newline boundaries.
  const positions = Array.from({ length: doc.length + 1 }, (_, index) => index);
  for (const position of [...positions, ...positions.reverse()]) {
    const expected = doc.lineAt(position);
    expect(lines.lineAt(position)).toEqual({ from: expected.from, to: expected.to });
    expect(lines.slice(expected.from, expected.to)).toBe(expected.text);
  }
}
it('matches CodeMirror line boundaries for empty text, consecutive and trailing newlines, and Unicode', () => {
  for (const source of ['', '\n', '\n\n', 'abc', 'abc\n', '\nabc', 'a\n\nb\n', '😀\n中文𠀀e\u0301\nאבג العربية'])
    check(Text.of(source.split('\n')));
});
it('matches segmented Text after insertions, deletions, and moved line boundaries', () => {
  let doc = Text.of(Array.from({length:500}, (_, index) => index % 7 ? `line ${index} 😀` : ''));
  doc = doc.replace(300,400,Text.of(['中文','', 'new']));
  doc = doc.replace(3,3,Text.of(['','A','']));
  check(doc);
});
it('matches large lines at distant positions and uses complete normalized snapshots', () => {
  const doc = Text.of(['A'.repeat(100000),'','𠀀'.repeat(50000),'']);
  const lines = physicalLines(doc);
  for (const position of [0,99999,100000,100001,100002,150000,200002,200003,100000,7]) {
    const expected = doc.lineAt(position); expect(lines.lineAt(position)).toEqual({from:expected.from,to:expected.to});
  }
  expect(lines.slice(100002,100006)).toBe('𠀀𠀀');
});
it('defers invalid or fractional positions to CodeMirror', () => {
  const doc = Text.of(['','abc','']), lines = physicalLines(doc);
  for (const position of [-1,doc.length+1,-Infinity,Infinity,NaN,.5,1.5]) {
    let expected;
    try { expected = doc.lineAt(position); }
    catch { expect(() => lines.lineAt(position)).toThrow(); continue; }
    expect(lines.lineAt(position)).toEqual({from:expected.from,to:expected.to});
  }
});
