// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { openTableResizePopover } from '../../src/web/table-resize-popover';
let close: (() => void) | undefined;
afterEach(() => { close?.(); document.body.replaceChildren(); });
function setup(minRows = 2) {
  const anchor = document.createElement('button'); document.body.append(anchor);
  const apply = vi.fn(), onClose = vi.fn();
  const popover = openTableResizePopover({ anchor, columns: 8, rows: 12, minRows, maxColumns: 30, maxRows: 50, apply, onClose });
  close = popover.close; return { ...popover, apply, onClose, anchor };
}
it('retains actual dimensions beyond the visible grid and accepts Enter', () => {
  const { element, apply, onClose } = setup();
  const columns = element.querySelector<HTMLInputElement>('[aria-label="Columns"]')!;
  const rows = element.querySelector<HTMLInputElement>('[aria-label="Rows"]')!;
  expect(columns.value).toBe('8'); expect(rows.value).toBe('12');
  columns.value = '4'; rows.value = '5'; columns.dispatchEvent(new Event('input'));
  expect(element.querySelectorAll('.selected')).toHaveLength(20);
  rows.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  expect(apply).toHaveBeenCalledWith(4, 5); expect(onClose).toHaveBeenCalledOnce();
});
it('closes on Escape and outside clicks without applying changes', () => {
  const { element, apply, onClose } = setup();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(element.isConnected).toBe(false); expect(onClose).toHaveBeenCalledOnce(); expect(apply).not.toHaveBeenCalled();
  const second = setup(); document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(second.element.isConnected).toBe(false); expect(second.apply).not.toHaveBeenCalled();
});
it('uses the table type minimum row count for grid selections', () => {
  const markdown = setup(); markdown.element.querySelector<HTMLElement>('.table-resize-box')!.click();
  expect(markdown.apply).toHaveBeenCalledWith(1, 2);
  const html = setup(1); html.element.querySelector<HTMLElement>('.table-resize-box')!.click();
  expect(html.apply).toHaveBeenCalledWith(1, 1);
});
