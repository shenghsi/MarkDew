import { expect, it } from 'vitest';
import { canUseFiles } from '../../src/web/file-guard';
it('defers file commands during composition or another file command', () => {
  expect(canUseFiles(false, true)).toBe(false);
  expect(canUseFiles(true, false)).toBe(false);
  expect(canUseFiles(true, true)).toBe(false);
  expect(canUseFiles(false, false)).toBe(true);
});
