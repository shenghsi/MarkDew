import { describe, expect, it } from 'vitest';
import { Text } from '@codemirror/state';
import { listReturnEdit } from '../../src/web/commands';

const plan = (source: string, from = source.length, to = from) =>
  listReturnEdit(Text.of(source.split('\n')).lineAt(from), from, to);

describe('flat list Return', () => {
  for (const [source, expected] of [
    ['plain', '\n'], ['- item', '\n- '], ['1. text', '\n2. '],
    ['009) text', '\n010) '], ['9. text', '\n10. '],
    ['- [x] done', '\n- [ ] '], ['- [X] done', '\n- [ ] '],
    ['- [ ] ', ''], ['12. ', ''], ['999999999. item', '\n'],
    ['1234567890. item', '\n'], ['-item', '\n'], ['  - item', '\n'],
    ['* [x]', ''], ['+\t[ ]\ttask', '\n+\t[ ]\t'], ['- [x]done', '\n- '],
    ['1. [x] done', '\n2. '], ['日本語😀', '\n'], ['first\n- item', '\n- '],
  ]) it(`plans Return for ${JSON.stringify(source)}`, () => {
    const edit = plan(source);
    expect(edit.text).toBe(expected);
    expect(edit.to).toBe(source.length);
    expect(edit.from).toBe(expected ? source.length : source.lastIndexOf('\n') + 1);
  });
  it('replaces a selection or splits a line without continuing its list', () => {
    expect(plan('- item', 2, 6)).toEqual({ from: 2, to: 6, text: '\n' });
    expect(plan('- item', 4)).toEqual({ from: 4, to: 4, text: '\n' });
  });
});
