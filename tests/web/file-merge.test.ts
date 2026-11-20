import { expect, it } from 'vitest';
import { mergeFileChange } from '../../src/web/file-merge';

it('loads clean and identical source without a conflict', () => {
  expect(mergeFileChange('old', 'old', 'new')).toBe('new');
  expect(mergeFileChange('old', 'new', 'new')).toBe('new');
  expect(mergeFileChange('old', 'draft', 'old')).toBe('draft');
});
it('combines separate edits and retains exact source bytes', () => {
  const base = '\uFEFFalpha\r\nbeta\rgamma\n';
  expect(mergeFileChange(base, base.replace('alpha', '日本語😀'), base.replace('gamma', 'external')))
    .toBe('\uFEFF日本語😀\r\nbeta\rexternal\n');
  expect(mergeFileChange('ab', 'Ab', 'aB')).toBe('AB');
  expect(mergeFileChange('first\nmiddle\nlast', 'first\nlast', 'first\nmiddle\nlast!'))
    .toBe('first\nlast!');
});
it('keeps identical shared edits once when other edits differ', () => {
  expect(mergeFileChange('alpha\nbeta\ngamma\ndelta', 'ALPHA\nBETA\ngamma\ndelta',
    'ALPHA\nbeta\ngamma\nDELTA')).toBe('ALPHA\nBETA\ngamma\nDELTA');
});
it('refuses overlapping replacements, deletions, and ambiguous insertions', () => {
  expect(mergeFileChange('abc', 'aXc', 'aYc')).toBeUndefined();
  expect(mergeFileChange('abc', 'ac', 'aYc')).toBeUndefined();
  expect(mergeFileChange('abc', 'abc draft', 'abc external')).toBeUndefined();
  expect(mergeFileChange('abc', 'aXbc', 'ac')).toBeUndefined();
});
