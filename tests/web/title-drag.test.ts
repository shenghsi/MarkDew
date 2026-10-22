// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';

it('triggers startDragging on single click and toggleMaximize on double click for non-interactive elements', () => {
  const documentBar = document.createElement('div');
  documentBar.className = 'document-bar';

  const title = document.createElement('span');
  title.id = 'document-title';
  title.textContent = 'My Note';

  const button = document.createElement('button');
  button.id = 'files-toggle';
  button.textContent = 'Files';

  documentBar.append(title, button);
  document.body.append(documentBar);

  const startDragging = vi.fn().mockResolvedValue(undefined);
  const toggleMaximize = vi.fn().mockResolvedValue(undefined);

  let lastToggle = 0;
  const triggerToggle = () => {
    const now = Date.now();
    if (now - lastToggle < 300) return;
    lastToggle = now;
    void toggleMaximize();
  };

  documentBar.addEventListener('mousedown', event => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    if (event.detail > 1) {
      triggerToggle();
      return;
    }
    void startDragging();
  });
  documentBar.addEventListener('mouseup', event => {
    if (event.button !== 0 || event.detail !== 2) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    triggerToggle();
  });
  documentBar.addEventListener('dblclick', event => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown')) return;
    triggerToggle();
  });

  // 1. Single click on title bar text -> drags (detail: 1)
  title.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
  expect(startDragging).toHaveBeenCalledTimes(1);
  expect(toggleMaximize).not.toHaveBeenCalled();

  // 2. Single click on empty bar area -> drags (detail: 1)
  documentBar.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
  expect(startDragging).toHaveBeenCalledTimes(2);
  expect(toggleMaximize).not.toHaveBeenCalled();

  // 3. Click on button -> does NOT drag or toggle maximize
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 1 }));
  button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
  expect(startDragging).toHaveBeenCalledTimes(2);
  expect(toggleMaximize).not.toHaveBeenCalled();

  // 4. Double click on title bar text -> triggers toggleMaximize and does not start drag
  title.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
  title.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
  title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 0, detail: 2 }));
  expect(startDragging).toHaveBeenCalledTimes(2); // no new drag call
  expect(toggleMaximize).toHaveBeenCalledTimes(1);

  // 5. Right click on title -> does NOT drag or toggle maximize
  title.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 2, detail: 1 }));
  title.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, button: 2, detail: 2 }));
  expect(startDragging).toHaveBeenCalledTimes(2);
  expect(toggleMaximize).toHaveBeenCalledTimes(1);
});
