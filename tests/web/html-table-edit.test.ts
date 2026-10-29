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

it('applies table commands as one change with Undo support', async () => {
  const { history, undo } = await import('@codemirror/commands');
  const source = '<table><tr><td>A</td><td>B</td></tr></table>';
  let state = EditorState.create({ doc: source, extensions: [history()] });
  const view = { get state() { return state; }, dispatch(spec: any) { state = state.update(spec).state; } } as any;
  const body = document.createElement('div'); body.innerHTML = source; document.body.append(body);
  const dispose = mountHTMLTableEdit(body, view, 0, source);
  const select = body.querySelector('select')!;
  select.value = 'merge-right'; select.dispatchEvent(new Event('change'));
  expect(state.doc.toString()).toContain('colspan="2"');
  expect(undo({ state, dispatch: (transaction: any) => { state = transaction.state; } })).toBe(true);
  expect(state.doc.toString()).toBe(source);
  dispose?.(); body.remove();
});

it('clears table controls when a different location is clicked', () => {
  const source = '<table><tr><td><p>Text</p></td></tr></table>';
  const view = { state: EditorState.create({ doc: source }), dispatch() {} } as any;
  const body = document.createElement('div'); body.innerHTML = source; document.body.append(body);
  const dispose = mountHTMLTableEdit(body, view, 0, source);
  body.querySelector('td')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(body.querySelector('.html-table-selected-cell')).not.toBeNull();
  body.querySelector('select')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(body.querySelector('.html-table-selected-cell')).not.toBeNull();
  document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(body.querySelector('.html-table-selected-cell')).toBeNull();
  dispose?.(); body.remove();
});
