// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyBodySize, BODY_SIZE_KEY, readBodySize,
  applyTableSize, TABLE_SIZE_KEY, readTableSize,
  applyCodeSize, CODE_SIZE_KEY, readCodeSize,
} from '../../src/web/font-settings';

const store = (keyMatch: string, value?: string) => ({ getItem: (key: string) => (key === keyMatch && value !== undefined ? value : null) });

describe('Body text size', () => {
  it('defaults to 17 px and sets no variable', () => {
    const root = document.createElement('div');
    applyBodySize(store(BODY_SIZE_KEY), root);
    expect(readBodySize(store(BODY_SIZE_KEY))).toBe(17);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('');
  });
  it('applies a saved size as a CSS variable', () => {
    const root = document.createElement('div');
    applyBodySize(store(BODY_SIZE_KEY, '20'), root);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('20px');
  });
  it('ignores an invalid saved size and clears the variable', () => {
    const root = document.createElement('div');
    root.style.setProperty('--body-font-size', '20px');
    applyBodySize(store(BODY_SIZE_KEY, '999'), root);
    expect(root.style.getPropertyValue('--body-font-size')).toBe('');
  });
});

describe('Table text size', () => {
  it('defaults to 16 px and sets no variable', () => {
    const root = document.createElement('div');
    applyTableSize(store(TABLE_SIZE_KEY), root);
    expect(readTableSize(store(TABLE_SIZE_KEY))).toBe(16);
    expect(root.style.getPropertyValue('--table-font-size')).toBe('');
  });
  it('applies a saved size as a CSS variable', () => {
    const root = document.createElement('div');
    applyTableSize(store(TABLE_SIZE_KEY, '14'), root);
    expect(root.style.getPropertyValue('--table-font-size')).toBe('14px');
  });
  it('ignores an invalid saved size and clears the variable', () => {
    const root = document.createElement('div');
    root.style.setProperty('--table-font-size', '14px');
    applyTableSize(store(TABLE_SIZE_KEY, '999'), root);
    expect(root.style.getPropertyValue('--table-font-size')).toBe('');
  });
});

describe('Code block text size', () => {
  it('defaults to null (follow body) and sets no variable', () => {
    const root = document.createElement('div');
    applyCodeSize(store(CODE_SIZE_KEY), root);
    expect(readCodeSize(store(CODE_SIZE_KEY))).toBeNull();
    expect(root.style.getPropertyValue('--code-font-size')).toBe('');
  });
  it('applies a saved size scaled by --writing-scale', () => {
    const root = document.createElement('div');
    applyCodeSize(store(CODE_SIZE_KEY, '14'), root);
    expect(root.style.getPropertyValue('--code-font-size')).toBe('calc(14px * var(--writing-scale, 1))');
  });
  it('ignores an invalid saved size and clears the variable', () => {
    const root = document.createElement('div');
    root.style.setProperty('--code-font-size', 'calc(14px * var(--writing-scale, 1))');
    applyCodeSize(store(CODE_SIZE_KEY, '999'), root);
    expect(root.style.getPropertyValue('--code-font-size')).toBe('');
  });
});
