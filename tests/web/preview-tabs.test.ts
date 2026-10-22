// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { DocumentTab, DocumentTabs, documentTabBar } from '../../src/web/document-tabs';
import { fileSidebar } from '../../src/web/file-sidebar';
import { fromSource, normalize, sourceExtensions } from '../../src/web/source';

Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });

function tabFixture(id: number, path = '', preview = false): DocumentTab {
  return {
    id,
    path,
    baseline: '',
    uncertain: false,
    sourceMode: false,
    preview,
    state: EditorState.create({
      doc: normalize(''),
      extensions: [sourceExtensions(fromSource(''))],
    }),
  };
}

const button = (pane: HTMLElement, name: string) =>
  Array.from(pane.querySelectorAll('button')).find(value => value.textContent?.trim() === name)!;

it('applies preview class and pins preview tab on double-click', () => {
  const lock = new Compartment();
  const first = tabFixture(1, '/test/preview.md', true);
  const second = tabFixture(2, '/test/pinned.md', false);
  const tabs = new DocumentTabs(first, lock);
  tabs.add(second);

  const container = document.createElement('div');
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const onPin = vi.fn();
  const bar = documentTabBar(container, onSelect, onClose, onPin);
  bar.render(tabs);

  const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  expect(buttons).toHaveLength(2);
  expect(buttons[0].classList.contains('document-tab-preview')).toBe(true);
  expect(buttons[1].classList.contains('document-tab-preview')).toBe(false);

  // Double-click triggers pin callback
  buttons[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(onPin).toHaveBeenCalledWith(1);

  bar.destroy();
});

it('triggers single click preview and double click permanent in file sidebar', async () => {
  vi.useFakeTimers();
  try {
    const pane = document.createElement('aside');
    document.body.append(pane);

    const openMock = vi.fn();
    const listing = {
      entries: [{ name: 'doc.md', path: '/workspace/doc.md', directory: false }],
      warnings: [],
    };

    const sidebar = fileSidebar(pane, {
      read: async () => listing,
      allowed: () => true,
      open: openMock,
      choose: vi.fn(),
    }, { root: '/workspace', deferRead: false });

    await vi.advanceTimersByTimeAsync(50);

    const fileButton = button(pane, 'doc.md');
    expect(fileButton).toBeDefined();

    // 1. Programmatic click (detail === 0): synchronous open
    fileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(openMock).toHaveBeenCalledWith('/workspace/doc.md');
    openMock.mockClear();

    // 2. Single click (detail === 1): debounced preview open
    fileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(openMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(openMock).toHaveBeenCalledWith('/workspace/doc.md', { preview: true, newTab: false });
    openMock.mockClear();

    // 3. Double click: cancels single click timer, calls open with newTab: true, preview: false
    fileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    fileButton!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
    vi.advanceTimersByTime(250);
    expect(openMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledWith('/workspace/doc.md', { preview: false, newTab: true });

    sidebar.dispose();
    pane.remove();
  } finally {
    vi.useRealTimers();
  }
});
