// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { outlineDropdown } from '../../src/web/outline-dropdown';

function createEditor(doc: string, cursor = 0): EditorView {
  const container = document.createElement('div');
  document.body.append(container);
  return new EditorView({
    state: EditorState.create({
      doc,
      selection: { anchor: cursor },
      extensions: [markdown()],
    }),
    parent: container,
  });
}

describe('outlineDropdown', () => {
  it('opens and closes without affecting sidebar elements', () => {
    const view = createEditor('# Heading 1\n\nSome text\n\n## Subheading\n\nMore text');
    const button = document.createElement('button');
    button.id = 'outline-menu';
    document.body.append(button);

    // Create mock sidebar elements to verify they remain untouched
    const filesPane = document.createElement('aside');
    filesPane.id = 'files';
    filesPane.hidden = true;
    const outlinePane = document.createElement('aside');
    outlinePane.id = 'outline';
    outlinePane.hidden = true;
    document.body.append(filesPane, outlinePane);

    const dropdown = outlineDropdown(button, () => view);
    expect(dropdown.isOpen()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');

    // Click outline menu button
    button.click();
    expect(dropdown.isOpen()).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // Ensure sidebar panes are not touched
    expect(filesPane.hidden).toBe(true);
    expect(outlinePane.hidden).toBe(true);

    // Verify items in dropdown
    const items = dropdown.element.querySelectorAll<HTMLButtonElement>('.outline-dropdown-item');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Heading 1');
    expect(items[1].textContent).toBe('Subheading');

    // Toggle closed
    button.click();
    expect(dropdown.isOpen()).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(filesPane.hidden).toBe(true);
    expect(outlinePane.hidden).toBe(true);

    dropdown.destroy();
    button.remove();
    filesPane.remove();
    outlinePane.remove();
    view.destroy();
  });

  it('selects heading and jumps editor to target location', () => {
    const text = '# First\n\nParagraph 1\n\n## Second\n\nParagraph 2\n\n### Third';
    const view = createEditor(text, 0);
    const button = document.createElement('button');
    document.body.append(button);

    const dispatchSpy = vi.spyOn(view, 'dispatch');
    const focusSpy = vi.spyOn(view, 'focus');

    const dropdown = outlineDropdown(button, () => view);
    dropdown.open();
    expect(dropdown.isOpen()).toBe(true);

    const items = dropdown.element.querySelectorAll<HTMLButtonElement>('.outline-dropdown-item');
    expect(items).toHaveLength(3);

    // Click second heading ("Second")
    items[1].click();
    expect(dispatchSpy).toHaveBeenCalled();
    expect(focusSpy).toHaveBeenCalled();
    expect(dropdown.isOpen()).toBe(false);

    dropdown.destroy();
    button.remove();
    view.destroy();
  });

  it('displays placeholder when document has no headings', () => {
    const view = createEditor('Just plain text without any markdown headings.');
    const button = document.createElement('button');
    document.body.append(button);

    const dropdown = outlineDropdown(button, () => view);
    dropdown.open();
    expect(dropdown.isOpen()).toBe(true);

    const empty = dropdown.element.querySelector('.outline-dropdown-empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toBe('No headings in document');

    dropdown.destroy();
    button.remove();
    view.destroy();
  });

  it('closes on Escape key and outside click', () => {
    const view = createEditor('# Section A\n\nText');
    const button = document.createElement('button');
    document.body.append(button);

    const dropdown = outlineDropdown(button, () => view);
    dropdown.open();
    expect(dropdown.isOpen()).toBe(true);

    // Escape closes dropdown
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(dropdown.isOpen()).toBe(false);

    // Open again and click outside
    dropdown.open();
    expect(dropdown.isOpen()).toBe(true);
    const outside = document.createElement('div');
    document.body.append(outside);
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(dropdown.isOpen()).toBe(false);

    dropdown.destroy();
    button.remove();
    outside.remove();
    view.destroy();
  });
});
