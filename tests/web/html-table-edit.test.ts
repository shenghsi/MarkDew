// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { mountHTMLTableEdit } from '../../src/web/html-table-edit';

it('edits only cell content and preserves merged cells and attributes', () => {
  const source = '<table><tr><td colspan="2"><b>old</b></td></tr></table>';
  let state = EditorState.create({ doc: source });
  const view = { get state() { return state; }, dispatch(spec: any) { state = state.update(spec).state; } } as any;
  const body = document.createElement('div'); body.innerHTML = source; document.body.append(body);
  const dispose = mountHTMLTableEdit(body, view, 0, source);
  body.querySelector('td')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  const input = body.querySelector('textarea')!;
  expect(input.value).toBe('<b>old</b>');
  expect(body.querySelector('table')).not.toBeNull();
  input.value = '<i>new</i>'; input.dispatchEvent(new Event('blur'));
  expect(state.doc.toString()).toBe(source.replace('<b>old</b>', '<i>new</i>'));
  dispose?.(); body.remove();
});

it('cancels cell changes with Escape', () => {
  const source = '<table><tr><td>old</td></tr></table>';
  const view = { state: EditorState.create({ doc: source }), dispatch() { throw Error('Unexpected change'); } } as any;
  const body = document.createElement('div'); body.innerHTML = source; document.body.append(body);
  const dispose = mountHTMLTableEdit(body, view, 0, source);
  body.querySelector('td')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  const input = body.querySelector('textarea')!; input.value = 'new';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(body.querySelector('td')!.textContent).toBe('old');
  dispose?.(); body.remove();
});
