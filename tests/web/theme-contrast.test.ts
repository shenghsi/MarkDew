import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

function luminance(hex: string) {
  const values = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
it('keeps document, control, selected text and code colors at readable contrast in both palettes', () => {
  const css = readFileSync(new URL('../../src/web/style.css', import.meta.url), 'utf8');
  const palettes = [...css.matchAll(/:root(?:\[data-theme="dark"\])?\s*\{([^}]*--paper:[^}]*)\}/g)];
  expect(palettes).toHaveLength(2);
  for (const [, body] of palettes) {
    const colors = Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[\da-f]{3,6})/g)].map(([, name, hex]) =>
      [name, hex.length === 4 ? '#' + hex.slice(1).split('').map(value => value + value).join('') : hex]));
    for (const background of ['paper', 'surface']) for (const foreground of ['ink', 'muted', 'accent', 'error', 'keyword', 'string', 'number']) {
      const a = luminance(colors[foreground]), b = luminance(colors[background]);
      expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
    const a = luminance(colors.ink), b = luminance(colors.selected);
    expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5);
  }
});
