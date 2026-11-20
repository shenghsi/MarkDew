import { describe, expect, it } from 'vitest';
import { presentableDiff } from '@codemirror/merge';
import { compareDiff, compareDiffConfig } from '../../src/web/compare-diff';

function applyChanges(a: string, b: string, changes: readonly { fromA: number; toA: number; fromB: number; toB: number }[]): string {
  let out = '';
  let posA = 0;
  for (const ch of changes) {
    expect(ch.fromA).toBeGreaterThanOrEqual(posA);
    expect(ch.toA).toBeGreaterThanOrEqual(ch.fromA);
    expect(ch.toB).toBeGreaterThanOrEqual(ch.fromB);
    out += a.slice(posA, ch.fromA) + b.slice(ch.fromB, ch.toB);
    posA = ch.toA;
  }
  return out + a.slice(posA);
}

describe('compareDiff', () => {
  it('returns no changes for identical text and handles empty strings', () => {
    expect(compareDiff('same\n', 'same\n')).toEqual([]);
    const ins = compareDiff('', 'added\n');
    expect(applyChanges('', 'added\n', ins)).toBe('added\n');
    const del = compareDiff('removed\n', '');
    expect(applyChanges('removed\n', '', del)).toBe('');
  });

  it('keeps word-level precision in a paragraph even when large edits exist elsewhere in a long file', () => {
    const filler = Array.from({ length: 40 }, (_, i) =>
      `Paragraph ${i}: The quick brown fox jumps over the lazy dog while keeping this document realistically long.\n`
    ).join('\n');
    const oldSection = Array.from({ length: 12 }, (_, i) =>
      `Legacy section line ${i} with completely different prose that will be rewritten from scratch.\n`
    ).join('');
    const newSection = Array.from({ length: 12 }, (_, i) =>
      `Replacement block entry ${i} introducing brand-new wording and structure for the revised draft.\n`
    ).join('');
    const targetOld = 'This long markdown paragraph explains how version comparison should highlight only the few words that actually changed instead of marking the whole sentence.';
    const targetNew = 'This long markdown paragraph explains how version comparison should highlight only the exact words that actually differed instead of marking the whole sentence.';

    const a = `${oldSection}\n${filler}\n${targetOld}\n`;
    const b = `${newSection}\n${filler}\n${targetNew}\n`;

    const changes = compareDiff(a, b);
    expect(applyChanges(a, b, changes)).toBe(b);

    const presented = presentableDiff(a, b, compareDiffConfig);
    expect(applyChanges(a, b, presented)).toBe(b);

    const targetStartA = a.indexOf(targetOld);
    const targetChanges = presented.filter(ch => ch.fromA >= targetStartA);
    expect(targetChanges.map(ch => a.slice(ch.fromA, ch.toA))).toEqual(['few', 'changed']);
    expect(targetChanges.map(ch => b.slice(ch.fromB, ch.toB))).toEqual(['exact', 'differed']);
  });

  it('handles trailing newline changes and Unicode text accurately', () => {
    const padding = 'Unchanged context line for testing trailing newline handling.\n'.repeat(50);
    const a = `${padding}这是第一段包含中文和表情🙂的测试文本。`;
    const b = `${padding}这是第一段包含简体中文和表情🙂的测试文本。\n`;

    const changes = compareDiff(a, b);
    expect(applyChanges(a, b, changes)).toBe(b);
    expect(changes.map(ch => b.slice(ch.fromB, ch.toB))).toEqual(['简体', '\n']);
  });
});
