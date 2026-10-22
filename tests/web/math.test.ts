import { expect, it } from 'vitest';
import { mathRanges } from '../../src/web/math-ranges';
import { renderMath } from '../../src/web/math-renderer';

it('uses Markdown math ranges with UTF-16 offsets and excludes code and escaped dollars', () => {
  const source = '😀 $x^2$ and `$ignored$` and \\$escaped$\n\n$$\n\\frac{a}{b}\n$$';
  const ranges = mathRanges(source);
  expect(ranges).toHaveLength(2);
  expect(source.slice(ranges[0].from, ranges[0].to)).toBe('$x^2$');
  expect(ranges[0].from).toBe(3); expect(ranges[0].block).toBe(false);
  expect(ranges[1].formula).toBe('\\frac{a}{b}'); expect(ranges[1].block).toBe(true);
  expect(mathRanges('```latex\n$x$\n```')).toEqual([]);
});
it('renders MathJax SVG with bundled glyphs, fractions, integrals and AMS matrices', () => {
  const svg = renderMath('\\int_0^1 x^2\\,dx=\\frac{1}{3}+\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}+\\mathbb{R}', true);
  expect(svg).toContain('<svg'); expect(svg).toContain('<path');
  expect(svg).not.toContain('https:'); expect(svg).not.toContain('<script');
});
it('reports malformed formulas without changing their source', () => {
  const source = '\\frac{broken'; expect(() => renderMath(source, false)).toThrow();
  expect(source).toBe('\\frac{broken');
});
