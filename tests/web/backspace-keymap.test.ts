// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { fromSource, normalize, restoreSource, savedSource, sourceField } from '../../src/web/source';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => false }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ ask: vi.fn(), open: vi.fn(), save: vi.fn() }));

it('routes Backspace through markdownBackspace in rendered mode to delete empty code block', async () => {
  document.body.innerHTML = '<div id="app"></div>';
  const { view } = await import('../../src/web/main');

  const content = '```typescript\n\n```';
  const record = fromSource(content);
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: normalize(record.raw) },
    selection: { anchor: '```typescript\n'.length },
    effects: restoreSource.of(record)
  });
  view.focus();

  const event = new KeyboardEvent('keydown', {
    key: 'Backspace',
    code: 'Backspace',
    keyCode: 8,
    bubbles: true,
    cancelable: true
  });
  view.contentDOM.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(true);
  expect(savedSource(view.state.field(sourceField))).toBe('');

  // Test undo
  document.querySelector<HTMLButtonElement>('#undo')!.click();
  expect(savedSource(view.state.field(sourceField))).toBe('```typescript\n\n```');

  // Test redo
  document.querySelector<HTMLButtonElement>('#redo')!.click();
  expect(savedSource(view.state.field(sourceField))).toBe('');

  view.destroy();
});
