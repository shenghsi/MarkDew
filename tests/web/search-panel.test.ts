// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo, undoDepth } from '@codemirror/commands';
import { closeSearchPanel, getSearchQuery, SearchQuery } from '@codemirror/search';
import { find, searchSupport } from '../../src/web/navigation';
import { getActiveSearchPanel, MarkDewSearchPanel, setPendingSearchMode } from '../../src/web/search-panel';
import { setLanguagePreference } from '../../src/web/i18n';

let view: EditorView;

beforeEach(() => {
  setLanguagePreference('zh-CN');
});

afterEach(() => {
  view?.destroy();
  document.body.innerHTML = '';
  setLanguagePreference('zh-CN');
});

function createEditor(doc = 'Hello world\nHello MarkDew\n') {
  const container = document.createElement('div');
  document.body.append(container);
  view = new EditorView({
    state: EditorState.create({
      doc,
      extensions: [history(), searchSupport(() => view)],
    }),
    parent: container,
  });
  return view;
}

it('opens in search-only mode by default with compact Typora layout', () => {
  createEditor();
  expect(find(view)).toBe(true);

  const panel = getActiveSearchPanel()!;
  expect(panel).not.toBeNull();
  expect(document.querySelector('.markdew-search-panel')).not.toBeNull();

  // Search row is visible, replace row is hidden
  const toggleBtn = panel.dom.querySelector<HTMLButtonElement>('.search-mode-toggle')!;
  expect(toggleBtn.textContent).toContain('查找');
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');

  const replaceRow = panel.dom.querySelector<HTMLElement>('.replace-row')!;
  expect(replaceRow.hidden).toBe(true);
  expect(replaceRow.style.display).toBe('none');

  // Search input is present and has main-field
  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  expect(searchInput).not.toBeNull();
  expect(searchInput.getAttribute('main-field')).toBe('true');
  expect(searchInput.placeholder).toBe('查找');

  // Options group has Aa, whole word, and regex
  const caseBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-case')!;
  const wordBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-word')!;
  const regexBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-regex')!;
  expect(caseBtn.textContent).toBe('Aa');
  expect(wordBtn).not.toBeNull();
  expect(regexBtn.textContent).toBe('.*');
});

it('supports one-click toggle between search and replace modes', () => {
  createEditor();
  find(view);

  const panel = getActiveSearchPanel()!;
  const toggleBtn = panel.dom.querySelector<HTMLButtonElement>('.search-mode-toggle')!;
  const replaceRow = panel.dom.querySelector<HTMLElement>('.replace-row')!;
  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const replaceInput = panel.dom.querySelector<HTMLInputElement>('input[name="replace"]')!;

  // Initially in search-only mode
  expect(toggleBtn.textContent).toContain('查找');
  expect(replaceRow.hidden).toBe(true);

  // One click on toggle button switches to replace mode
  toggleBtn.click();
  expect(toggleBtn.textContent).toContain('替换');
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
  expect(replaceRow.hidden).toBe(false);
  expect(replaceRow.style.display).toBe('flex');
  expect(replaceInput.placeholder).toBe('替换');

  // Second click switches back to search-only mode
  toggleBtn.click();
  expect(toggleBtn.textContent).toContain('查找');
  expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
  expect(replaceRow.hidden).toBe(true);
  expect(replaceRow.style.display).toBe('none');
});

it('toggles search options and dispatches query changes', () => {
  createEditor();
  find(view);

  const panel = getActiveSearchPanel()!;
  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const caseBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-case')!;
  const wordBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-word')!;
  const regexBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-regex')!;

  searchInput.value = 'Hello';
  searchInput.dispatchEvent(new Event('input'));

  let query = getSearchQuery(view.state);
  expect(query.search).toBe('Hello');
  expect(query.caseSensitive).toBe(false);
  expect(query.wholeWord).toBe(false);
  expect(query.regexp).toBe(false);

  // Toggle case sensitive
  caseBtn.click();
  expect(caseBtn.getAttribute('aria-pressed')).toBe('true');
  expect(caseBtn.classList.contains('active')).toBe(true);
  query = getSearchQuery(view.state);
  expect(query.caseSensitive).toBe(true);

  // Toggle whole word
  wordBtn.click();
  expect(wordBtn.getAttribute('aria-pressed')).toBe('true');
  query = getSearchQuery(view.state);
  expect(query.wholeWord).toBe(true);

  // Toggle regex
  regexBtn.click();
  expect(regexBtn.getAttribute('aria-pressed')).toBe('true');
  query = getSearchQuery(view.state);
  expect(query.regexp).toBe(true);

  // Toggle back
  caseBtn.click();
  expect(getSearchQuery(view.state).caseSensitive).toBe(false);
});

it('navigates matches with Next and Prev buttons', () => {
  createEditor('foo 123 foo 456 foo');
  find(view);

  const panel = getActiveSearchPanel()!;
  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const nextBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-next')!;
  const prevBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-prev')!;

  searchInput.value = 'foo';
  searchInput.dispatchEvent(new Event('input'));

  nextBtn.click();
  expect(view.state.selection.main.from).toBe(0);
  expect(view.state.selection.main.to).toBe(3);

  nextBtn.click();
  expect(view.state.selection.main.from).toBe(8);
  expect(view.state.selection.main.to).toBe(11);

  prevBtn.click();
  expect(view.state.selection.main.from).toBe(0);
  expect(view.state.selection.main.to).toBe(3);
});

it('performs replace and replace all in replace mode', () => {
  createEditor('cat and dog and cat');
  find(view, 'replace');

  const panel = getActiveSearchPanel()!;
  expect(panel.dom.querySelector<HTMLElement>('.replace-row')!.hidden).toBe(false);

  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const replaceInput = panel.dom.querySelector<HTMLInputElement>('input[name="replace"]')!;
  const replaceBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-replace')!;
  const replaceAllBtn = panel.dom.querySelector<HTMLButtonElement>('.search-btn-replace-all')!;

  searchInput.value = 'cat';
  searchInput.dispatchEvent(new Event('input'));
  replaceInput.value = 'bird';
  replaceInput.dispatchEvent(new Event('input'));

  // Replace all
  replaceAllBtn.click();
  expect(view.state.doc.toString()).toBe('bird and dog and bird');
  expect(undoDepth(view.state)).toBe(1);

  undo(view);
  expect(view.state.doc.toString()).toBe('cat and dog and cat');

  // Next and single replace
  panel.dom.querySelector<HTMLButtonElement>('.search-btn-next')!.click();
  replaceBtn.click();
  expect(view.state.doc.toString()).toBe('bird and dog and cat');
});

it('closes panel and restores focus when Escape or close button is clicked', () => {
  createEditor();
  find(view);

  const panel = getActiveSearchPanel()!;
  const closeBtn = panel.dom.querySelector<HTMLButtonElement>('.search-close-btn')!;

  closeBtn.click();
  expect(getActiveSearchPanel()).toBeNull();
  expect(document.querySelector('.markdew-search-panel')).toBeNull();

  // Reopen and test Escape
  find(view);
  expect(getActiveSearchPanel()).not.toBeNull();
  const searchInput = getActiveSearchPanel()!.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  searchInput.dispatchEvent(escapeEvent);

  expect(getActiveSearchPanel()).toBeNull();
  expect(document.querySelector('.markdew-search-panel')).toBeNull();
});

it('updates text and placeholders when language preference changes', () => {
  setLanguagePreference('en');
  createEditor();
  find(view);

  const panel = getActiveSearchPanel()!;
  const toggleBtn = panel.dom.querySelector<HTMLButtonElement>('.search-mode-toggle')!;
  const searchInput = panel.dom.querySelector<HTMLInputElement>('input[name="search"]')!;
  const replaceInput = panel.dom.querySelector<HTMLInputElement>('input[name="replace"]')!;

  expect(toggleBtn.textContent).toContain('Find');
  expect(searchInput.placeholder).toBe('Find');
  expect(replaceInput.placeholder).toBe('Replace');

  // Change language dynamically to zh-CN
  setLanguagePreference('zh-CN');
  expect(toggleBtn.textContent).toContain('查找');
  expect(searchInput.placeholder).toBe('查找');
  expect(replaceInput.placeholder).toBe('替换');
});

it('preserves pending replace mode when find(view) is invoked without mode argument', () => {
  createEditor();
  setPendingSearchMode('replace');
  find(view);

  const panel = getActiveSearchPanel()!;
  expect(panel).not.toBeNull();
  const replaceRow = panel.dom.querySelector<HTMLElement>('.replace-row')!;
  expect(replaceRow.hidden).toBe(false);
  expect(replaceRow.style.display).toBe('flex');
});

it('maintains aligned layout structure between search row and replace row', () => {
  createEditor();
  find(view, 'replace');

  const panel = getActiveSearchPanel()!;
  const modeToggle = panel.dom.querySelector<HTMLElement>('.search-mode-toggle')!;
  const replaceIndent = panel.dom.querySelector<HTMLElement>('.replace-indent')!;
  const searchInputWrapper = panel.dom.querySelector<HTMLElement>('.search-input-wrapper')!;
  const replaceInputWrapper = panel.dom.querySelector<HTMLElement>('.replace-input-wrapper')!;
  const searchRightControls = panel.dom.querySelector<HTMLElement>('.search-right-controls')!;
  const replaceActions = panel.dom.querySelector<HTMLElement>('.replace-actions')!;

  expect(modeToggle).not.toBeNull();
  expect(replaceIndent).not.toBeNull();
  expect(searchInputWrapper).not.toBeNull();
  expect(replaceInputWrapper).not.toBeNull();
  expect(searchRightControls).not.toBeNull();
  expect(replaceActions).not.toBeNull();

  // Test dynamic width synchronization when dimensions are available
  Object.defineProperty(modeToggle, 'offsetWidth', { value: 78, configurable: true });
  Object.defineProperty(replaceActions, 'offsetWidth', { value: 165, configurable: true });

  panel.toggleMode(); // to search
  panel.toggleMode(); // back to replace

  expect(modeToggle.style.width).toBe('78px');
  expect(replaceIndent.style.width).toBe('78px');
  expect(searchRightControls.style.width).toBe('165px');
  expect(replaceActions.style.width).toBe('165px');
});

