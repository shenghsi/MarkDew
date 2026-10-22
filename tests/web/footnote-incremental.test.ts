// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { EditorState, Transaction } from '@codemirror/state';
import { history, undo, redo } from '@codemirror/commands';
import { documentLanguage } from '../../src/web/document-language';
import { footnoteField, footnotes, freshFootnotes, renderFootnote } from '../../src/web/footnotes';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';

function create(doc: string) { return EditorState.create({ doc, extensions: [documentLanguage(), footnoteField] }); }
function check(state: EditorState) {
  const cached = footnotes(state), fresh = freshFootnotes(state);
  expect(cached).toEqual(fresh);
  expect(cached.definitions.map(renderFootnote)).toEqual(fresh.definitions.map(renderFootnote));
}
it('maps growing text ranges without reading the public array during local updates', () => {
  let state = create('Earlier words 中文 𠀀e\u0301. `code`Alpha words[^n].\n\n[^n]: Note **text** $x$');
  state = state.update({ changes: { from: 3, insert: 'QQ' } }).state;
  expect(Object.getOwnPropertyDescriptor(footnotes(state), 'plainText')?.get).toBeTypeOf('function');
  for (const insert of ['𠀁', '中文', 'e\u0301', 'QQQ', '', ' word ']) {
    const old = footnotes(state), getter = vi.spyOn(old, 'plainText', 'get');
    const codeEdge = state.doc.toString().indexOf('`code`') + '`code`'.length;
    const changed = state.update({ changes: [
      { from: 3, to: insert ? 3 : 4, insert },
      { from: codeEdge, insert: '中文' },
    ] }).state;
    expect(getter).not.toHaveBeenCalled(); getter.mockRestore();
    expect(Object.getOwnPropertyDescriptor(footnotes(changed), 'plainText')?.get).toBeTypeOf('function');
    check(changed);
    const span = footnotes(changed).plainText.find(span => span.codeBefore)!;
    expect(changed.sliceDoc(span.codeBefore!.from, span.codeBefore!.to)).toBe('`code`');
    expect(span.codeBefore!.to).toBe(span.from);
    state = changed;
  }
});

it('reuses ordinary word-start and interior punctuation edits with complete fresh models', () => {
  for (const body of ['Paragraph with ordinary words[^n].', '> Paragraph with ordinary words[^n].',
    '- Paragraph with ordinary words[^n].', '**Paragraph with ordinary words**[^n].',
    'Paragraph 中文 かな 문장 words[^n].']) {
    const source=body+'\n\n[^n]: Note **text** $x$\n\nTail', initial=create(source);
    const from=source.indexOf(body.includes('中文')?'中文':'with');
    for (const insert of ['Z','QQ','',',',';','?',' word ']) {
      const changed=initial.update({changes:{from,to:from+1,insert}}).state;check(changed);
      if (insert.length===1) expect(footnotes(changed)).toBe(footnotes(initial));
    }
  }
});
it('matches fresh parsing across prose, delimiter, Unicode, line and code boundaries', () => {
  const bodies=['A *ab c* words[^n].','A _ab c_ words[^n].','A **ab c** words[^n].',
    'Paragraph `code`, and words[^n].','A ! [link](url) words[^n].',
    'A &amp; words[^n].','1a1. words[^n].','A words  \nNext words[^n].',
    '中文 𠀀𠀁 e\u0301 words[^n].','A *unclosed words[^n].'];
  for (const body of bodies) {
    const original=body+'\n\n[^n]: Note **text** $x$', initial=create(original);
    for (let from=0;from<=body.length;from++) for (const insert of ['Z','',' ', '\t',',','!','?']) {
      const changed=initial.update({changes:{from,to:Math.min(from+1,body.length),insert}}).state;
      check(changed);
    }
  }
}, 20000); // Exhaustive correctness sweep; editor timing uses separate benchmarks.
it('keeps delimiter-edge edits, hard breaks, and removed prefix guards on the full parser', () => {
  for (const [body,from,to,insert] of [
    ['A *ab c* words[^n].',6,7,' '], ['A words\nNext[^n].',7,7,'  '],
    ['A `code`, and words[^n].',7,8,'Z'],
  ] as const) {
    const initial=create(body+'\n\n[^n]: Note'),changed=initial.update({changes:{from,to,insert}}).state;
    check(changed);expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
  const initial=create('A 123 45 words[^n].\n\n[^n]: Note');
  const changed=initial.update({changes:[{from:0,to:1,insert:''},{from:6,to:7,insert:'Z'}]}).state;
  check(changed);expect(footnotes(changed)).not.toBe(footnotes(initial));
});

it('reuses code-adjacent prose and maps inserted text starts through repeated changes', () => {
  for (const body of ['A `code`, and words[^n].', '`code`Alpha words[^n].',
    '> A ``code`text``, and words[^n].', '- A ` code `, and words[^n].', '# A `code`, and words[^n].']) {
    let state = create(body + '\n\n[^n]: Note **text** $x$\n\nTail');
    const from = footnotes(state).plainText.find(span => 'codeBefore' in span)!.from;
    const initial = state, equal = state.update({ changes: { from, to: from + 1, insert: 'Z' } }).state;
    check(equal); expect(footnotes(equal)).toBe(footnotes(initial));
    state = equal;
    for (const insert of ['中文', '', ' more ', 'QQ', '\t', '?']) {
      state = state.update({ changes: { from, to: from + (insert === '' ? 1 : 0), insert } }).state;
      check(state);
      expect(footnotes(state).plainText.some(span => span.from === from && 'codeBefore' in span)).toBe(true);
    }
  }
});

it('matches fresh models at every code and text boundary across containers and delimiters', () => {
  const bodies = ['`code`Alpha words[^n].', 'A `` a ` b ``, and words[^n].',
    'A `code`, *words*[^n].', 'A *`code`, and words*[^n].', 'A [`code`, words](url) words[^n].',
    'A ![`code`, words](url) words[^n].', '> A `code`, and words[^n].',
    '- A `code`, and words[^n].', '# A `code`, and words[^n].',
    'A `code\nmore`, and words[^n].', 'A `code`, words  \nNext[^n].',
    'A `code`, &amp; words[^n].', 'A `code`, [missing][ref] words[^n].',
    'A `code`, 中文 𠀀e\u0301 words[^n].', 'A `code`, $x$ words[^n].'];
  for (const body of bodies) {
    const initial = create(body + '\n\n[ref]: https://example.com\n\n[^n]: Note **text** $x$');
    for (let from = 0; from <= body.length; from++) for (const insert of ['Z', '', ' ', '\t', ',!', '中文', '`', '*', '\\', '\n', '[^n]']) {
      check(initial.update({ changes: { from, to: Math.min(from + 1, body.length), insert } }).state);
    }
  }
}, 20000); // Exhaustive correctness sweep; editor timing uses separate benchmarks.

it('rejects modified code anchors, protected parents, multiline code, and changed right neighbors', () => {
  for (const body of ['A *`code`, and words*[^n].', 'A [`code`, words](url) words[^n].',
    'A `code\nmore`, and words[^n].']) {
    const from = body.indexOf(','), initial = create(body + '\n\n[^n]: Note');
    const changed = initial.update({ changes: { from, to: from + 1, insert: 'Z' } }).state;
    check(changed); expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
  const body = 'A `code`, and words[^n].', initial = create(body + '\n\n[^n]: Note');
  for (const extra of [{ from: 2, insert: 'A' }, { from: 3, to: 4, insert: 'Z' }]) {
    const edits = [extra, { from: 8, to: 9, insert: 'Z' }].sort((a,b) => a.from - b.from);
    const changed = initial.update({ changes: edits }).state; check(changed);
    expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
  const unicode = create('A `code`,𠀀 words[^n].\n\n[^n]: Note');
  const changed = unicode.update({ changes: [{ from: 8, to: 9, insert: 'Z' }, { from: 10, insert: 'Z' }] }).state;
  check(changed); expect(footnotes(changed)).not.toBe(footnotes(unicode));
});

it('retains earlier definition objects through unequal-length code-boundary edits', () => {
  let state = create('[^n]: Note **text** $x$\n\nA `code`Alpha words[^n].');
  const node = footnotes(state).definitions[0].node;
  const from = state.doc.toString().indexOf('Alpha');
  for (const insert of ['中文', 'QQQ', '', 'Z', ' words ']) {
    state = state.update({ changes: { from, insert } }).state; check(state);
    expect(footnotes(state).definitions[0].node).toBe(node);
    expect(footnotes(state).plainText.find(span => 'codeBefore' in span)!.from).toBe(from);
  }
});

it('keeps exact source and Undo for code-adjacent insertion and deletion', () => {
  const original = '\uFEFFA `code`, words[^n]\r\n\r\n[^n]: Note **text** $x$\nTail\rEnd', record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [documentLanguage(), footnoteField, history(), sourceExtensions(record)] });
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  for (const insert of ['中文', '', ' words ', 'Q']) {
    state = state.update({ changes: { from: 8, to: 9, insert }, userEvent: 'input.paste' }).state;
    check(state); expect(savedSource(state.field(sourceField))).toBe(original.replace('`, words', '`' + insert + ' words'));
    expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
    expect(redo(target)).toBe(true); check(state);
    expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
  }
});

it('maps interior prose spaces and tabs with complete fresh models and shifted definitions', () => {
  for (const body of ['Alpha beta words[^n]', '**Alpha beta** words[^n]', '> Alpha beta words[^n]',
    '- Alpha beta words[^n]', '[missing] Alpha beta words[^n]', 'Alpha beta [missing][ref] words[^n]',
    '"Alpha beta": (words) words[^n]', 'Alpha beta ! + - . : words[^n]']) {
    const source = body + '\n\n[ref]: https://example.com\n\n[^n]: Note **text** $x$';
    const from = source.indexOf('Alpha') + 5;
    for (const insert of [' ', '\t', ' \t ', '', ' more ', '中文\tかな']) {
      const initial = create(source);
      const state = initial.update({ changes: { from, to: from + 1, insert } }).state;
      check(state);
      if (insert.length === 1 && !body.startsWith('[missing]')) expect(footnotes(state)).toBe(footnotes(initial));
    }
  }
});

it('checks separators across multiple edits and preserves digit and line guards', () => {
  const source = 'Alpha beta and Gamma delta words[^n]\n\n[^n]: Note';
  const first = source.indexOf(' '), second = source.indexOf('Gamma') + 5;
  let state = create(source).update({ changes: [{ from: first, to: first + 1, insert: '\t' },
    { from: second, to: second + 1, insert: ' more ' }] }).state; check(state);
  state = state.update({ changes: { from: 3, insert: ' \t ' } }).state; check(state);
  for (const body of ['A \n B', '[^label]: Alpha beta',
    '[ref]: Alpha beta', '`Alpha beta`', '$Alpha beta$', '[Alpha beta](https://example.com)']) {
    const original = body + '\n\nwords[^n]\n\n[^n]: Note';
    const from = original.indexOf(' '), initial = create(original);
    const changed = initial.update({ changes: { from, to: from + 1, insert: '\t' } }).state;
    check(changed); expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
  for (const body of ['1 a 1. text', '> 1 a 1) text', '- Parent\n  1 a 1. text']) {
    const source = body + '\n\nwords[^n]\n\n[^n]: Note', from = source.indexOf(' a ');
    const initial = create(source), changed = initial.update({ changes: { from, to: from + 3, insert: '' } }).state;
    check(changed); expect(footnotes(changed)).not.toBe(footnotes(initial));
  }
});
it('matches fresh parsing after plain text edits with shifted definition AST and UTF-16 ranges', () => {
  let state = create('---\na: b\n---\n\n😀 Ordinary words[^n] and more words.\n\n[^n]: Note **text** $x$\n\nTail words');
  const from = state.doc.toString().indexOf('Ordinary') + 2;
  for (const insert of ['Z', 'QQ', '', 'ABC', '9']) {
    state = state.update({ changes: { from, to: from + 1, insert } }).state; check(state);
  }
});

it('keeps prose separator source patches and history exact through repeated edits', () => {
  const original = '\uFEFFAlpha beta words[^n]\r\n\r\n[^n]: Note **text** $x$\nTail\rEnd';
  const record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [
    documentLanguage(), footnoteField, history(), sourceExtensions(record)
  ] });
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  for (const insert of ['\t', ' words ', '', '中文 かな', ' ']) {
    const initial = state, expected = savedSource(state.field(sourceField)).replace('Alpha beta', 'Alpha' + insert + 'beta');
    state = state.update({ changes: { from: 5, to: 6, insert }, userEvent: 'input.paste' }).state;
    check(state); expect(savedSource(state.field(sourceField))).toBe(expected);
    expect(undo(target)).toBe(true); check(state);
    expect(savedSource(state.field(sourceField))).toBe(savedSource(initial.field(sourceField)));
    expect(redo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(expected);
    expect(undo(target)).toBe(true); check(state);
  }
});
it('matches fresh parsing after multiple changes and fallback structural reference and definition edits', () => {
  const original = 'First words[^a] and other words[^b].\n\n[^a]: Alpha\n\n[^b]: Beta\n\nLast words';
  for (const insert of ['Z', 'ZZ', '', '\n', '[^b]', '$', '<div>', '`', '\\', '**', '    ']) {
    let state = create(original);
    state = state.update({ changes: [{ from: 2, to: 3, insert }, { from: original.indexOf('other') + 2, to: original.indexOf('other') + 3, insert: 'Q' }] }).state; check(state);
  }
  for (const target of ['[^a]', '[^a]:', 'Alpha', 'Beta']) {
    let state = create(original), from = original.indexOf(target);
    state = state.update({ changes: { from, to: from + target.length, insert: 'replacement' } }).state; check(state);
  }
});
it('does not reuse a multiline text range when an interior line becomes blank', () => {
  const original = 'First words\nABC\n[^n]: could become a definition\nlast words[^n]\n\nEnd';
  let state = create(original), from = original.indexOf('ABC');
  state = state.update({ changes: { from, to: from + 3, insert: '' } }).state; check(state);
  state = create('First words\nABCDEF\nlast words[^n]\n\n[^n]: Note\n\nEnd'); from = state.doc.toString().indexOf('ABCDEF');
  state = state.update({ changes: [{ from, to: from + 3, insert: '' }, { from: from + 3, to: from + 6, insert: '' }] }).state; check(state);
});
it('matches fresh context when changes alter metadata code math HTML or missing labels', () => {
  for (const [original, target] of [
    ['---\na: b\n---\n\nwords[^n]\n\n[^n]: Note', 'a: b'],
    ['```text\nwords[^n]\n```\n\n[^n]: Note', 'text'],
    ['$words[^n]$\n\n[^n]: Note', 'words'],
    ['<div>\nwords[^n]\n</div>\n\n[^n]: Note', 'div'],
    ['words[^missing]\n\n[^n]: Note', 'missing'],
  ]) {
    let state = create(original), from = original.indexOf(target);
    state = state.update({ changes: { from, to: from + target.length, insert: 'n' } }).state; check(state);
  }
});
it('falls back for ordered-list creation delimiter-adjacent deletion and deleted word-edge guards', () => {
  for (const [original, changes] of [
    ['First words\nx) text\nlast words[^n]\n\n[^n]: Note', [{ from: 12, to: 13, insert: '1' }]],
    ['First words\nabc* text\nlast words[^n]\n\n[^n]: Note', [{ from: 14, to: 15, insert: '' }]],
    ['😀 ABCDEF words[^n]\n\n[^n]: Note', [{ from: 3, to: 6, insert: '' }, { from: 6, to: 9, insert: '' }]],
    ['😀 ABCDEF words[^n]\n\n[^n]: Note', [{ from: 4, to: 6, insert: '' }, { from: 6, to: 8, insert: '' }]],
  ] as const) {
    let state = create(original);
    state = state.update({ changes: [...changes] }).state; check(state);
  }
});

it('does not reuse text ranges when a word edit creates an ordered-list marker', () => {
  for (const line of ['1a1. text', '  1a1) text', '> 1a1. text', '- Parent\n  1a1. text']) {
    const original = line + '\n\nwords[^n]\n\n[^n]: Note';
    let state = create(original), from = original.indexOf('a1');
    state = state.update({ changes: { from, to: from + 1, insert: '' } }).state; check(state);
  }
});

it.each([
  ['&axp; words[^n]', 'x', 'm'],
  ['&amp; words[^n]', 'm', 'x'],
  ['[abc] words[^n]\n\n[abc]: https://example.com', 'b', 'Z'],
  ['[abc][] words[^n]\n\n[abc]: https://example.com', 'b', 'Z'],
  ['[abc][ref] words[^n]\n\n[ref]: https://example.com', 'b', 'ZZ'],
  ['[abc[^n]](https://example.com) words[^n]', 'b', 'ZZ'],
])('matches fresh parsing for protected entity/link text: %s', (body, old, replacement) => {
    const original = body + '\n\n[^n]: Note';
    let state = create(original), from = original.indexOf(old);
    state = state.update({ changes: { from, to: from + 1, insert: replacement } }).state; check(state);
});

it.each(['中文写作文本', '日本語かなカナ', '한글문장입력', '𠀀𠀁𠀂', 'a\u0301bc', 'אבגדה', 'العربية'])
  ('reuses complete word edits and matches fresh UTF-16 ranges for %s', word => {
    const original = '---\na: b\n---\n\nA' + word + 'Z words[^n]\n\n[^n]: Note **text** $x$';
    const initial = create(original), from = original.indexOf(word);
    const changed = initial.update({ changes: { from, to: from + word.length, insert: Array.from(word).reverse().join('') } }).state;
    check(changed);
    expect(footnotes(changed)).toBe(footnotes(initial));
    for (const insert of [word, word + '中', '', 'Z', 'e\u0301']) {
      const state = initial.update({ changes: { from, to: from + word.length, insert } }).state; check(state);
      if (insert.length === word.length) expect(footnotes(state)).toBe(footnotes(initial));
    }
  });

it('keeps complete neighbouring supplementary characters and rejects edits that split them', () => {
  const original = '𠀀abc𠀁 words[^n]\n\n[^n]: Note';
  let state = create(original);
  state = state.update({ changes: { from: 2, to: 5, insert: '中文' } }).state; check(state);
  state = create(original).update({ changes: [{ from: 3, to: 4, insert: '中' }, { from: 1, insert: 'Z' }] }).state; check(state);
  for (const [from, to] of [[0, 1], [1, 2], [5, 6], [6, 7]]) {
    state = create(original).update({ changes: { from, to, insert: '中' } }).state; check(state);
  }
});

it('matches fresh parsing beside delimiters, across multiple Unicode changes and digit guards', () => {
  const original = '**A中文Z** and *e\u0301中文a* words[^n]\n\n[^n]: Note';
  const from = original.indexOf('中文');
  for (const insert of ['文', '𠀀', '\u0301', ' ', '$', '[^n]', '\n', '😀']) {
    const state = create(original).update({ changes: { from, to: from + 2, insert } }).state; check(state);
  }
  let state = create(original).update({ changes: [{ from, to: from + 1, insert: '한글' },
    { from: original.lastIndexOf('中文'), to: original.lastIndexOf('中文') + 1, insert: 'か' }] }).state; check(state);
  for (const line of ['1中文1. text', '> 1中文1) text', '- Parent\n  1中文1. text']) {
    const source = line + '\n\nwords[^n]\n\n[^n]: Note', from = source.indexOf('中文');
    state = create(source).update({ changes: [{ from, to: from + 1, insert: '' }, { from: from + 1, to: from + 2, insert: '' }] }).state; check(state);
  }
});

it('retains exact source history for composition-labelled Unicode replacements', () => {
  const original = '\uFEFFA中文Z words[^n]\r\n\r\n[^n]: Note **text** $x$\nTail\rEnd', record = fromSource(original);
  let state = EditorState.create({ doc: normalize(record.raw), extensions: [
    documentLanguage(), footnoteField, history(), sourceExtensions(record)
  ] });
  const target = { get state() { return state; }, dispatch(transaction: Transaction) { state = transaction.state; } };
  state = state.update({ changes: { from: 1, to: 3, insert: '日本語' }, userEvent: 'input.type.compose.start' }).state; check(state);
  const first = original.replace('中文', '日本語'); expect(savedSource(state.field(sourceField))).toBe(first);
  state = state.update({ changes: { from: 1, to: 4, insert: '𠀀' }, userEvent: 'input.type.compose' }).state; check(state);
  const second = original.replace('中文', '𠀀'); expect(savedSource(state.field(sourceField))).toBe(second);
  expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
  expect(redo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(second);
  state = state.update({ changes: { from: 1, to: 3, insert: '한글' }, userEvent: 'input.type.compose.start' }).state; check(state);
  const third = original.replace('中文', '한글'); expect(savedSource(state.field(sourceField))).toBe(third);
  expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(second);
  expect(undo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(original);
  expect(redo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(second);
  expect(redo(target)).toBe(true); check(state); expect(savedSource(state.field(sourceField))).toBe(third);
});
