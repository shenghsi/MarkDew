// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyBodySize, BODY_SIZE_KEY, readBodySize } from '../../src/web/font-settings';

const store = (value?: string) => ({ getItem: (key: string) => (key === BODY_SIZE_KEY && value !== undefined ? value : null) });

describe('Body text size', () => {
  it('defaults to 17 px and sets no variable', () => {
    const root = document.createElement('div');
    applyBodySize(store(), root);
    expect(readBodySize(store())).toBe(17);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('');
  });
  it('applies a saved size as a CSS variable', () => {
    const root = document.createElement('div');
    applyBodySize(store('20'), root);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('20px');
  });
  it('ignores an invalid saved size and clears the variable', () => {
    const root = document.createElement('div');
    root.style.setProperty('--body-font-size', '20px');
    applyBodySize(store('999'), root);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('');
  });
});
