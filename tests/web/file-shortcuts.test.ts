// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { fileShortcuts } from '../../src/web/file-shortcuts';

it.each([true, false])('routes platform file shortcuts and protects composition (mac=%s)', mac => {
  document.body.innerHTML = '<button id="new">New</button><button id="open">Open</button><button id="save-as">Save As</button><button id="source">Source</button><input id="field">';
  const clicks = vi.fn();
  document.querySelectorAll('button').forEach(button => button.addEventListener('click', () => clicks(button.id)));
  let composing = false;
  const dispose = fileShortcuts(document, mac, () => composing);
  const field = document.querySelector<HTMLInputElement>('#field')!;
  const key = (name: string, extra: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: name, metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true, ...extra });
    field.dispatchEvent(event); return event.defaultPrevented;
  };
  expect(key('n')).toBe(true); expect(key('o')).toBe(true); expect(key('S', { shiftKey: true })).toBe(true);
  expect(key('/')).toBe(true);
  expect(clicks.mock.calls.map(call => call[0])).toEqual(['new', 'open', 'save-as', 'source']); clicks.mockClear();
  for (const extra of [{ repeat: true }, { isComposing: true }]) expect(key('n', extra)).toBe(true);
  composing = true; key('o'); composing = false;
  field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); key('n');
  expect(clicks).not.toHaveBeenCalled();
  field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); key('n'); expect(clicks).toHaveBeenCalledTimes(1);
  clicks.mockClear();
  expect(key('s')).toBe(false); expect(key('n', { shiftKey: true })).toBe(false);
  expect(key('o', { altKey: true })).toBe(false); expect(key('o', { metaKey: !mac, ctrlKey: mac })).toBe(false);
  expect(key('o', { metaKey: true, ctrlKey: true })).toBe(false);
  const blocked = new KeyboardEvent('keydown', { key: 'n', metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true });
  blocked.preventDefault(); field.dispatchEvent(blocked);
  document.querySelector<HTMLButtonElement>('#open')!.disabled = true; expect(key('o')).toBe(false);
  document.querySelector('#new')!.remove(); expect(key('n')).toBe(false); expect(clicks).not.toHaveBeenCalled();
  dispose(); dispose(); expect(key('S', { shiftKey: true })).toBe(false);
});

it.each([true, false])('intercepts Ctrl+F and routes find for opened document (mac=%s)', mac => {
  document.body.innerHTML = '<button id="find">Find</button><div id="outside">Outside</div>';
  const clicks = vi.fn();
  document.querySelector('#find')!.addEventListener('click', () => clicks('find'));
  let modalOpen = false;
  let composing = false;
  const dispose = fileShortcuts(document, mac, () => composing, () => modalOpen);
  const outside = document.querySelector<HTMLElement>('#outside')!;

  const sendKey = (name: string, extra: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: name, metaKey: mac, ctrlKey: !mac, bubbles: true, cancelable: true, ...extra });
    outside.dispatchEvent(event);
    return event.defaultPrevented;
  };

  // Pressing Ctrl+F outside the editor prevents default and clicks find
  expect(sendKey('f')).toBe(true);
  expect(clicks).toHaveBeenCalledWith('find');
  clicks.mockClear();

  // Pressing Ctrl+H on Windows/Linux (!mac) opens replace, while Cmd+H on macOS is not intercepted
  if (!mac) {
    expect(sendKey('h')).toBe(true);
    expect(clicks).toHaveBeenCalledWith('find');
    clicks.mockClear();
  } else {
    expect(sendKey('h')).toBe(false);
    expect(clicks).not.toHaveBeenCalled();
  }

  // When modal is open, Ctrl+F prevents default but does not trigger document find
  modalOpen = true;
  expect(sendKey('f')).toBe(true);
  expect(clicks).not.toHaveBeenCalled();

  // If settings search input exists in modal, it gets focus
  const settingsInput = document.createElement('input');
  settingsInput.className = 'settings-search-input';
  document.body.append(settingsInput);
  sendKey('f');
  expect(document.activeElement).toBe(settingsInput);
  settingsInput.remove();

  modalOpen = false;
  // During composition, keyboard event is not blocked
  composing = true;
  expect(sendKey('f')).toBe(false);
  expect(clicks).not.toHaveBeenCalled();

  dispose();
});

