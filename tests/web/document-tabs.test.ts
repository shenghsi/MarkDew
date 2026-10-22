// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { DocumentTab, DocumentTabs, documentTabBar, tabSource, tabDirty } from '../../src/web/document-tabs';
import { fromSource, normalize, savedSource, sourceExtensions, sourceField } from '../../src/web/source';
import { imageBasePath, imagePath } from '../../src/web/images';
import { documentLanguage } from '../../src/web/document-language';
import { livePreview, previewField } from '../../src/web/preview';
import { tableEditor } from '../../src/web/table';
import { footnotes } from '../../src/web/footnotes';

// Geometry is supplied by a real WebView; this suite checks scroll-effect routing.
Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => new DOMRect() });
function fixture() {
  const lock = new Compartment();
  const tab = (id: number, source: string, path = '', sourceMode = false): DocumentTab => ({
    id, path, baseline: source, uncertain: false, sourceMode,
    state: EditorState.create({ doc: normalize(fromSource(source).raw), extensions: [
      sourceExtensions(fromSource(source)), history(), lock.of([]), documentLanguage(),
      imageBasePath.of(path), imagePath, ...(sourceMode ? [] : livePreview),
    ] }),
  });
  return { lock, tab };
}

it('retains exact source, independent history, selection, mode, image path, and scroll effects', () => {
  const { lock, tab } = fixture();
  const original = '\uFEFF日本語😀\r\na\rb\n';
  const first = tab(0, original, '/one/日本語.md'), second = tab(1, 'Other\r\n', 'C:\\two\\other.md', true);
  const tabs = new DocumentTabs(first, lock); tabs.add(second);
  const parent = document.createElement('div'); document.body.append(parent);
  const view = new EditorView({ state: first.state, parent });
  const prepare = vi.fn(); const switchTo = (id: number) => tabs.activate(view, id, () => true, prepare);
  const source = () => savedSource(view.state.field(sourceField));
  try {
    view.dispatch({ changes: { from: 3, to: 5, insert: '文\n' }, selection: { anchor: 1, head: 4 }, userEvent: 'input.type' });
    const edited = source(), selection = view.state.selection.toJSON(), depth = undoDepth(view.state);
    expect(edited).toBe('\uFEFF日本語文\r\n\r\na\rb\n');
    const firstScroll = view.scrollSnapshot(); vi.spyOn(view, 'scrollSnapshot').mockReturnValueOnce(firstScroll);
    const dispatch = vi.spyOn(view, 'dispatch');
    view.dispatch({ effects: lock.reconfigure([EditorState.readOnly.of(true), EditorView.editable.of(false)]) });
    expect(switchTo(1)).toBe(true); expect(first.state.readOnly).toBe(false);
    expect(tabSource(first)).toBe(edited); expect(tabDirty(first)).toBe(true); expect(first.scroll).toBe(firstScroll);
    expect(source()).toBe('Other\r\n'); expect(view.state.field(imagePath)).toBe(second.path); expect(tabs.active.sourceMode).toBe(true);
    expect(view.state.field(previewField, false)).toBeUndefined();
    view.dispatch({ changes: { from: 5, insert: ' second' }, userEvent: 'input.type' });
    const secondEdit = source(); expect(undoDepth(view.state)).toBe(1);
    expect(switchTo(0)).toBe(true); expect(source()).toBe(edited); expect(view.state.selection.toJSON()).toEqual(selection);
    expect(view.state.field(imagePath)).toBe(first.path); expect(tabs.active.sourceMode).toBe(false);
    expect(view.state.field(previewField, false)).toBeDefined();
    expect(undoDepth(view.state)).toBe(depth); expect(dispatch.mock.calls.some(([spec]) => (spec as { effects?: unknown }).effects === firstScroll)).toBe(true);
    undo(view); expect(source()).toBe(original); redo(view); expect(source()).toBe(edited);
    switchTo(1); expect(source()).toBe(secondEdit); undo(view); expect(source()).toBe('Other\r\n');
    redo(view); expect(source()).toBe(secondEdit); expect(prepare).toHaveBeenCalledTimes(3);
  } finally { view.destroy(); parent.remove(); }
});

it('defers rejected switches and retains accepted table-cell edits through tab history', () => {
  const { lock, tab } = fixture();
  const first = tab(2, '| A |\r\n| - |\r\n| 文 |\r\n\r\nEnd'), second = tab(3, 'Other');
  const tabs = new DocumentTabs(first, lock); tabs.add(second);
  const parent = document.createElement('div'); document.body.append(parent);
  const view = new EditorView({ state: first.state, parent }); const prepare = vi.fn();
  try {
    view.dispatch({ selection: { anchor: view.state.doc.length } });
    const table = tableEditor(parent.querySelector('.preview-table')!)!; table.begin(1, 0); const child = table.child!;
    child.dispatch({ changes: { from: 0, to: child.state.doc.length, insert: '日本語' }, userEvent: 'input.type' });
    const edited = savedSource(view.state.field(sourceField)); expect(edited).toContain('日本語');
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    expect(tabs.activate(view, 3, () => true, prepare)).toBe(false); expect(table.child).toBe(child); expect(prepare).not.toHaveBeenCalled();
    child.contentDOM.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    const captured = view.state;
    expect(tabs.activate(view, 3, () => false, prepare)).toBe(false); expect(view.state).toBe(captured); expect(table.child).toBe(child);
    expect(tabs.activate(view, 3, () => true, prepare)).toBe(true); expect(table.child).toBeUndefined();
    expect(tabs.activate(view, 2, () => true, prepare)).toBe(true);
    expect(savedSource(view.state.field(sourceField))).toBe(edited);
    undo(view); expect(savedSource(view.state.field(sourceField))).toBe(first.baseline);
    redo(view); expect(savedSource(view.state.field(sourceField))).toBe(edited);
    expect(tabs.activate(view, 999, () => true, prepare)).toBe(false);
    expect(() => tabs.remove(2)).toThrow('Select another');
    tabs.remove(3); expect(tabs.all).toHaveLength(1); expect(() => tabs.add(second)).toThrow('new valid');
    expect(() => tabs.add(tab(Number.MAX_SAFE_INTEGER + 1, 'invalid'))).toThrow('new valid');
  } finally { view.destroy(); parent.remove(); }
});

it('retains indexed note ranges through tab switches, reveal, definition edits, and Undo', () => {
  const { lock, tab } = fixture();
  const original = '\uFEFFParagraph words[^图].\r\n\r\n[^图]: Note\r\n\r\nEnd.';
  const first = tab(30, original, '/one/notes.md'), second = tab(31, 'Other words[^b].\n\n[^b]: Second\n\nEnd.', '/two/notes.md');
  const tabs = new DocumentTabs(first, lock); tabs.add(second);
  const parent = document.createElement('div'); document.body.append(parent);
  const view = new EditorView({ state: first.state, parent });
  const source = () => savedSource(view.state.field(sourceField));
  try {
    view.dispatch({ changes: { from: 3, insert: 'Z' }, selection: { anchor: 4 }, userEvent: 'input.type' });
    view.dispatch({ changes: { from: 4, insert: '中' }, selection: { anchor: 5 }, userEvent: 'input.type' });
    expect(view.state.field(previewField).mode).toBe('indexed'); const edited = source();
    expect(tabs.activate(view, 31, () => true, () => {})).toBe(true); expect(source()).toBe(second.baseline);
    expect(tabs.activate(view, 30, () => true, () => {})).toBe(true); expect(source()).toBe(edited);
    expect(view.state.field(imagePath)).toBe(first.path);
    const reference = footnotes(view.state).references[0];
    parent.querySelector('.preview-footnote')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(view.state.selection.main.head).toBe(reference.from); expect(source()).toBe(edited);
    view.dispatch({ selection: { anchor: 3 } });
    const definition = footnotes(view.state).definitions[0];
    parent.querySelector('.preview-footnote-definition')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(view.state.selection.main.head).toBe(definition.from);
    const at = view.state.doc.toString().indexOf('Note');
    view.dispatch({ changes: { from: at, to: at + 4, insert: '日本語' }, userEvent: 'input.type' });
    expect(source()).toBe(edited.replace('Note', '日本語'));
    undo(view); expect(source()).toBe(edited); redo(view); expect(source()).toBe(edited.replace('Note', '日本語'));
    expect(first.baseline).toBe(original); expect(second.baseline).toBe(tabSource(second));
  } finally { view.destroy(); parent.remove(); }
});

it('uses literal tab labels, stable focused buttons, manual keyboard activation, and disposal', () => {
  const { lock, tab } = fixture();
  const first = tab(5, 'One', '/a/<script>.md'), second = tab(6, 'Two', 'C:\\文\\two.md'); second.uncertain = true;
  const tabs = new DocumentTabs(first, lock); tabs.add(second);
  const parent = document.createElement('div'); document.body.append(parent);
  const select = vi.fn(), close = vi.fn(), bar = documentTabBar(parent, select, close); bar.render(tabs);
  const buttons = parent.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  expect(buttons[0].textContent).toBe('<script>.md'); expect(parent.querySelector('script')).toBeNull();
  expect(buttons[1].textContent).toContain('Unsaved'); expect(buttons[0].tabIndex).toBe(0); expect(buttons[1].tabIndex).toBe(-1);
  buttons[0].focus(); buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  expect(document.activeElement).toBe(buttons[1]); expect(select).not.toHaveBeenCalled();
  bar.render(tabs); expect(document.activeElement).toBe(buttons[1]); buttons[1].click(); expect(select).toHaveBeenCalledWith(6);
  parent.querySelector<HTMLButtonElement>('[aria-label="Close <script>.md"]')!.click(); expect(close).toHaveBeenCalledWith(5);
  bar.destroy(); buttons[1].click(); expect(select).toHaveBeenCalledTimes(1); parent.remove();
});
