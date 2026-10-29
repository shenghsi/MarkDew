// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history, undo } from '@codemirror/commands';
import { mountHTMLTableEdit } from '../../src/web/html-table-edit';
let dispose: (() => void) | undefined;
afterEach(() => { dispose?.(); dispose = undefined; document.body.replaceChildren(); });
function setup(source: string, readOnly = false) {
  let state = EditorState.create({ doc: source, extensions: [history(), EditorState.readOnly.of(readOnly)] });
  const view = { get state() { return state; }, dispatch(spec: any) { state = state.update(spec).state; } } as any;
  const body = document.createElement('div'); body.innerHTML = source; document.body.append(body);
  dispose = mountHTMLTableEdit(body, view, 0, source);
  return { body, cell: body.querySelector('td')!, view, text: () => state.doc.toString(),
    undo: () => undo({ state, dispatch: transaction => { state = transaction.state; } }) };
}
const click = (cell: Element) => cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
const context = (cell: Element) => cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
it('keeps cell formatting unchanged on click and saves formatted edits', () => {
  const source = '<table><tr><td colspan="2"><p><strong>old</strong></p></td></tr></table>';
  const { body, cell, text, undo } = setup(source);
  const before = cell.innerHTML; click(cell);
  expect(cell.innerHTML).toBe(before);
  expect(body.querySelector('textarea')).toBeNull();
  expect(cell.getAttribute('contenteditable')).toBe('true');
  expect(cell.textContent).toBe('old');
  cell.querySelector('strong')!.textContent = 'new'; cell.dispatchEvent(new Event('blur'));
  expect(text()).toBe(source.replace('old', 'new'));
  expect(undo()).toBe(true); expect(text()).toBe(source);
});
it('retains exact authored source after an unchanged cell loses focus', () => {
  const source = '<table><tr><td><P><STRONG>old</STRONG></P></td></tr></table>';
  const { cell, text } = setup(source); click(cell); cell.dispatchEvent(new Event('blur'));
  expect(text()).toBe(source);
});
it('cancels cell edits with Escape', () => {
  const { cell, text } = setup('<table><tr><td><b>old</b></td></tr></table>');
  click(cell); cell.textContent = 'new';
  cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(cell.innerHTML).toBe('<b>old</b>'); expect(text()).toContain('<b>old</b>');
});
it('moves cell commands to the context menu and supports Undo', () => {
  const { body, cell, text, undo } = setup('<table><tr><td>A</td><td>B</td></tr></table>');
  context(cell);
  const merge = Array.from(document.querySelectorAll<HTMLElement>('.menu-item')).find(item => item.textContent?.includes('Merge with right cell'))!;
  expect(merge).toBeDefined(); merge.click();
  expect(text()).toContain('colspan="2"'); expect(undo()).toBe(true);
  expect(body.querySelector('button[aria-label="More Actions"]')).toBeNull();
});
it('includes pending cell edits in a merge', () => {
  const { cell, text } = setup('<table><tr><td><strong>A</strong></td><td>B</td></tr></table>');
  click(cell); cell.querySelector('strong')!.textContent = 'Edited'; context(cell);
  Array.from(document.querySelectorAll<HTMLElement>('.menu-item')).find(item => item.textContent?.includes('Merge with right cell'))!.click();
  expect(text()).toContain('<strong>Edited</strong><br>B');
});
it('saves and hides controls on outside clicks, while menu clicks keep them selected', () => {
  const { cell, text } = setup('<table><tr><td><p>Text</p></td></tr></table>');
  click(cell); cell.querySelector('p')!.textContent = 'Changed'; context(cell);
  document.querySelector('.editor-context-menu')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(cell.classList.contains('html-table-selected-cell')).toBe(true);
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(cell.classList.contains('html-table-selected-cell')).toBe(false); expect(text()).toContain('<p>Changed</p>');
});
it('does not edit read-only cells and disables their commands', () => {
  const { cell } = setup('<table><tr><td>Text</td></tr></table>', true);
  click(cell); expect(cell.hasAttribute('contenteditable')).toBe(false); context(cell);
  expect(document.querySelectorAll('.menu-item:not([aria-disabled])')).toHaveLength(0);
});
it('removes active HTML from changed cell content', () => {
  const { cell, text } = setup('<table><tr><td>Text</td></tr></table>');
  click(cell); cell.innerHTML = '<p onclick="bad()">Changed<script>bad()</script></p><img src="bad">';
  cell.dispatchEvent(new Event('blur'));
  expect(text()).toContain('<p>Changed</p>'); expect(text()).not.toMatch(/onclick|script|img/);
});

it('uses Markdown-style toolbar icons for global table operations', () => {
  const { body, text } = setup('<table><tr><td>A</td><td>B</td></tr></table>');
  const toolbar = body.querySelector('[role="toolbar"]')!;
  expect(toolbar.querySelectorAll('svg')).toHaveLength(5);
  toolbar.querySelector<HTMLElement>('button[aria-label="Align table center"]')!.click();
  expect(text().match(/align="center"/g)).toHaveLength(2);
});
it('changes table size from the toolbar', () => {
  const { body, text } = setup('<table><tr><td>A</td><td>B</td></tr></table>');
  body.querySelector<HTMLElement>('button[aria-label="Resize table"]')!.click();
  body.querySelector<HTMLInputElement>('input[aria-label="Rows"]')!.value = '3';
  body.querySelector<HTMLInputElement>('input[aria-label="Columns"]')!.value = '3';
  body.querySelector<HTMLElement>('.html-table-size button')!.click();
  expect(text().match(/<tr>/g)).toHaveLength(3);
  expect(text().match(/<td/g)).toHaveLength(9);
});

it('commits cell changes before the Save shortcut runs', () => {
  const { cell, text } = setup('<table><tr><td>Old</td></tr></table>');
  const button = document.createElement('button'); button.id = 'save'; document.body.append(button);
  let saved = ''; button.onclick = () => { saved = text(); };
  click(cell); cell.textContent = 'New';
  cell.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }));
  expect(saved).toContain('<td>New</td>');
});
