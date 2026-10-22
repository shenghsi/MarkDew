// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, editorActiveField, setEditorActive, selected, previewItems, previewField } from '../../src/web/preview';

describe('rendered markdown view and cursor behavior on open', () => {
  it('does not select initial line or show cursor until editor is activated by interaction', () => {
    const doc = '# First Line Heading\n\nSome paragraph text\n';
    const state = EditorState.create({
      doc,
      extensions: [
        documentLanguage(),
        livePreview,
        EditorView.editorAttributes.of(v => ({
          class: v.state.field(editorActiveField, false) ? 'editor-active' : '',
        })),
      ],
    });

    const parent = document.createElement('div');
    parent.id = 'editor';
    document.body.appendChild(parent);

    const view = new EditorView({ state, parent });

    // Initially when opened, editorActiveField is false
    expect(view.state.field(editorActiveField, false)).toBe(false);

    // Position 0..18 is the heading '# First Line Heading'.
    // Even though default state.selection is at 0, selected() must return false!
    expect(selected(view.state, 0, 20)).toBe(false);

    // .editor-active class is not present
    expect(view.dom.classList.contains('editor-active')).toBe(false);

    // Heading marker is hidden in preview mode
    let hasHideDeco = false;
    view.state.field(previewField).decorations.between(0, 2, (from, to) => {
      if (from === 0 && to === 1) hasHideDeco = true;
    });
    expect(hasHideDeco).toBe(true);

    // When user activates editor
    view.dispatch({ effects: setEditorActive.of(true) });

    // Now editorActiveField is true
    expect(view.state.field(editorActiveField, false)).toBe(true);

    // Now selection is active, so selected() returns true for position 0
    expect(selected(view.state, 0, 20)).toBe(true);
    expect(view.dom.classList.contains('editor-active')).toBe(true);

    // In source mode, heading marker '# ' is NOT hidden
    hasHideDeco = false;
    view.state.field(previewField).decorations.between(0, 2, (from, to) => {
      if (from === 0 && to === 1) hasHideDeco = true;
    });
    expect(hasHideDeco).toBe(false);

    // When deactivated (e.g. when clicking outside the editor region)
    view.dispatch({ effects: setEditorActive.of(false) });
    expect(view.state.field(editorActiveField, false)).toBe(false);
    expect(selected(view.state, 0, 20)).toBe(false);
    expect(view.dom.classList.contains('editor-active')).toBe(false);

    // Heading marker is immediately hidden again (rerendered in preview mode)
    hasHideDeco = false;
    view.state.field(previewField).decorations.between(0, 2, (from, to) => {
      if (from === 0 && to === 1) hasHideDeco = true;
    });
    expect(hasHideDeco).toBe(true);

    view.destroy();
    parent.remove();
  });

  it('rerenders the active line immediately when clicking outside the editor region', () => {
    const doc = '# Header Title\n\nParagraph\n';
    const state = EditorState.create({
      doc,
      extensions: [
        documentLanguage(),
        livePreview,
      ],
    });

    const parent = document.createElement('div');
    parent.id = 'editor';
    const outside = document.createElement('div');
    outside.id = 'sidebar';
    document.body.appendChild(parent);
    document.body.appendChild(outside);

    const view = new EditorView({ state, parent });

    const onOutsidePointer = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('#editor')) {
        if (view.state.field(editorActiveField, false)) {
          view.dispatch({ effects: setEditorActive.of(false) });
        }
      }
    };
    window.addEventListener('pointerdown', onOutsidePointer);

    // Activate line
    view.dispatch({ effects: setEditorActive.of(true) });
    expect(selected(view.state, 0, 14)).toBe(true);

    // Click outside
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(view.state.field(editorActiveField, false)).toBe(false);
    expect(selected(view.state, 0, 14)).toBe(false);

    let hasHideDeco = false;
    view.state.field(previewField).decorations.between(0, 2, (from, to) => {
      if (from === 0 && to === 1) hasHideDeco = true;
    });
    expect(hasHideDeco).toBe(true);

    window.removeEventListener('pointerdown', onOutsidePointer);
    view.destroy();
    parent.remove();
    outside.remove();
  });

  it('rerenders the active line immediately when clicking on the title bar', () => {
    const doc = '# Header Title\n\nParagraph\n';
    const state = EditorState.create({
      doc,
      extensions: [
        documentLanguage(),
        livePreview,
      ],
    });

    const parent = document.createElement('div');
    parent.id = 'editor';
    const documentBar = document.createElement('div');
    documentBar.className = 'document-bar';
    const title = document.createElement('span');
    title.id = 'document-title';
    documentBar.appendChild(title);
    document.body.appendChild(documentBar);
    document.body.appendChild(parent);

    const view = new EditorView({ state, parent });

    const deactivateEditor = () => {
      if (view.state.field(editorActiveField, false)) {
        view.dispatch({ effects: setEditorActive.of(false) });
      }
      if (view.hasFocus) {
        (view.contentDOM as HTMLElement).blur();
      }
    };

    const onTitleBarPointer = (event: MouseEvent | PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('button, input, select, textarea, a, .outline-dropdown, .document-tabs-host')) return;
      deactivateEditor();
    };
    documentBar.addEventListener('mousedown', onTitleBarPointer, true);

    // Activate line
    view.dispatch({ effects: setEditorActive.of(true) });
    expect(selected(view.state, 0, 14)).toBe(true);

    // Click on document-title inside title bar
    title.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(view.state.field(editorActiveField, false)).toBe(false);
    expect(selected(view.state, 0, 14)).toBe(false);

    let hasHideDeco = false;
    view.state.field(previewField).decorations.between(0, 2, (from, to) => {
      if (from === 0 && to === 1) hasHideDeco = true;
    });
    expect(hasHideDeco).toBe(true);

    documentBar.removeEventListener('mousedown', onTitleBarPointer, true);
    view.destroy();
    parent.remove();
    documentBar.remove();
  });

  it('permits clicks on sidebar file buttons without premature deactivation interrupting the click event', () => {
    const doc = '# Header Title\n\nParagraph\n';
    const state = EditorState.create({
      doc,
      extensions: [
        documentLanguage(),
        livePreview,
      ],
    });

    const parent = document.createElement('div');
    parent.id = 'editor';
    const filesPane = document.createElement('aside');
    filesPane.id = 'files';
    const fileButton = document.createElement('button');
    fileButton.dataset.filePath = '/path/to/test.md';
    fileButton.textContent = 'test.md';
    let fileOpened = false;
    fileButton.addEventListener('click', () => {
      fileOpened = true;
    });
    filesPane.appendChild(fileButton);

    const outsideWorkspace = document.createElement('div');
    outsideWorkspace.className = 'workspace';

    document.body.appendChild(filesPane);
    document.body.appendChild(parent);
    document.body.appendChild(outsideWorkspace);

    const view = new EditorView({ state, parent });

    const deactivateEditor = () => {
      if (view.state.field(editorActiveField, false)) {
        view.dispatch({ effects: setEditorActive.of(false) });
      }
      if (view.hasFocus) {
        (view.contentDOM as HTMLElement).blur();
      }
    };

    const onOutsidePointer = (event: Event) => {
      if (event.defaultPrevented) return;
      if ('button' in event && (event as MouseEvent).button !== 0) return;
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('button, input, select, textarea, a, summary, [role="button"], [role="tab"], [role="menuitem"], .files-context-menu, #editor, .format-bar, .link-controls, #tools-panel, #tools-toggle, .document-tabs-host, .markdew-search-panel')) {
        return;
      }
      deactivateEditor();
    };

    window.addEventListener('pointerdown', onOutsidePointer);
    window.addEventListener('mousedown', onOutsidePointer);

    // Activate line
    view.dispatch({ effects: setEditorActive.of(true) });
    expect(view.state.field(editorActiveField, false)).toBe(true);

    // Click on file button in sidebar
    const createPointerEvent = (type: string) =>
      typeof PointerEvent !== 'undefined' ? new PointerEvent(type, { bubbles: true, cancelable: true }) : new MouseEvent(type, { bubbles: true, cancelable: true });

    fileButton.dispatchEvent(createPointerEvent('pointerdown'));
    fileButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    fileButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    // File click succeeded
    expect(fileOpened).toBe(true);

    // Clicking non-interactive outside area deactivates editor
    outsideWorkspace.dispatchEvent(createPointerEvent('pointerdown'));
    expect(view.state.field(editorActiveField, false)).toBe(false);

    window.removeEventListener('pointerdown', onOutsidePointer);
    window.removeEventListener('mousedown', onOutsidePointer);
    view.destroy();
    parent.remove();
    filesPane.remove();
    outsideWorkspace.remove();
  });
});
