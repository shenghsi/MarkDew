// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LINE_WIDTH_STORAGE_KEY,
  DEFAULT_LINE_WIDTH,
  LINE_WIDTH_PRESETS,
  validateLineWidth,
  getSavedLineWidth,
  saveLineWidth,
  applyLineWidth,
  initSettings,
  showSettingsDialog,
  showAboutDialog,
  isModalOpen,
} from '../../src/web/settings';
import { writingSizeControls } from '../../src/web/writing-size';

describe('Settings and Line Width', () => {
  let mockStorage: Record<string, string>;
  let storage: Storage;

  beforeEach(() => {
    mockStorage = {};
    storage = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { mockStorage = {}; },
      key: (index: number) => Object.keys(mockStorage)[index] ?? null,
      get length() { return Object.keys(mockStorage).length; },
    };
    document.body.innerHTML = '';
    document.documentElement.style.removeProperty('--editor-max-width');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('validates line width inputs correctly', () => {
    expect(validateLineWidth('860px')).toBe('860px');
    expect(validateLineWidth('700px')).toBe('700px');
    expect(validateLineWidth('1000px')).toBe('1000px');
    expect(validateLineWidth('1200px')).toBe('1200px');
    expect(validateLineWidth('100%')).toBe('100%');
    expect(validateLineWidth('none')).toBe('100%');
    expect(validateLineWidth('full')).toBe('100%');

    // Numbers with and without px
    expect(validateLineWidth('950')).toBe('950px');
    expect(validateLineWidth('950px')).toBe('950px');

    // Clamping to bounds [400, 3000]
    expect(validateLineWidth('200px')).toBe('400px');
    expect(validateLineWidth('5000px')).toBe('3000px');

    // Corrupt and non-string inputs fallback to default
    expect(validateLineWidth('')).toBe(DEFAULT_LINE_WIDTH);
    expect(validateLineWidth('invalid')).toBe(DEFAULT_LINE_WIDTH);
    expect(validateLineWidth(null)).toBe(DEFAULT_LINE_WIDTH);
    expect(validateLineWidth(undefined)).toBe(DEFAULT_LINE_WIDTH);
    expect(validateLineWidth(123)).toBe(DEFAULT_LINE_WIDTH);
  });

  it('reads and saves line width with fallback for corrupted data', () => {
    expect(getSavedLineWidth(storage)).toBe(DEFAULT_LINE_WIDTH);

    saveLineWidth('1000px', storage);
    expect(getSavedLineWidth(storage)).toBe('1000px');
    expect(mockStorage[LINE_WIDTH_STORAGE_KEY]).toBe('1000px');

    // Corrupt stored value
    mockStorage[LINE_WIDTH_STORAGE_KEY] = 'corrupt-value-xyz';
    expect(getSavedLineWidth(storage)).toBe(DEFAULT_LINE_WIDTH);
  });

  it('applies --editor-max-width CSS property to element', () => {
    applyLineWidth('1000px', document.documentElement);
    expect(document.documentElement.style.getPropertyValue('--editor-max-width')).toBe('1000px');

    applyLineWidth('100%', document.documentElement);
    expect(document.documentElement.style.getPropertyValue('--editor-max-width')).toBe('100%');
  });

  it('initializes settings and listens to cross-window storage events', () => {
    saveLineWidth('1200px', storage);
    const measure = vi.fn();

    const dispose = initSettings({ onMeasure: measure, storage });
    expect(document.documentElement.style.getPropertyValue('--editor-max-width')).toBe('1200px');

    // Simulate storage event from another window
    const event = new StorageEvent('storage', {
      key: LINE_WIDTH_STORAGE_KEY,
      newValue: '700px',
    });
    window.dispatchEvent(event);

    expect(document.documentElement.style.getPropertyValue('--editor-max-width')).toBe('700px');
    expect(measure).toHaveBeenCalledTimes(1);

    dispose();
  });

  it('renders settings dialog and updates line width interactively', () => {
    const measure = vi.fn();
    const modal = showSettingsDialog({ onMeasure: measure, storage });

    expect(isModalOpen()).toBe(true);
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    expect(modal.getAttribute('aria-label')).toBe('Settings');

    // Verify idempotency
    const modalAgain = showSettingsDialog({ onMeasure: measure, storage });
    expect(modalAgain).toBe(modal);
    expect(document.querySelectorAll('.settings-modal').length).toBe(1);

    // Click "Wide" preset button (1000px)
    const wideBtn = modal.querySelector<HTMLButtonElement>('button[data-value="1000px"]')!;
    expect(wideBtn).toBeTruthy();
    wideBtn.click();

    expect(document.documentElement.style.getPropertyValue('--editor-max-width')).toBe('1000px');
    expect(mockStorage[LINE_WIDTH_STORAGE_KEY]).toBe('1000px');
    expect(measure).toHaveBeenCalled();

    // Close via Done button
    const doneBtn = modal.querySelector<HTMLButtonElement>('.modal-footer button')!;
    doneBtn.click();

    expect(isModalOpen()).toBe(false);
    expect(document.querySelector('.settings-modal')).toBeNull();
  });

  it('dismisses settings dialog on Escape key', () => {
    showSettingsDialog({ storage });
    expect(isModalOpen()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen()).toBe(false);
    expect(document.querySelector('.settings-modal')).toBeNull();
  });

  it('renders about dialog with app details and dismisses cleanly', () => {
    const modal = showAboutDialog();
    expect(isModalOpen()).toBe(true);
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.textContent).toContain('MarkDew');
    expect(modal.textContent).toMatch(/Version \d+\.\d+\.\d+/);
    expect(modal.textContent).toContain('GNU AGPLv3');
    expect(modal.textContent).toContain('commercial license');

    // Verify idempotency
    const modalAgain = showAboutDialog();
    expect(modalAgain).toBe(modal);
    expect(document.querySelectorAll('.about-modal').length).toBe(1);

    // Dismiss with Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen()).toBe(false);
    expect(document.querySelector('.about-modal')).toBeNull();
  });

  it('renders update check button and status in about dialog', () => {
    const modal = showAboutDialog();
    const checkBtn = modal.querySelector<HTMLButtonElement>('.about-update-check-btn');
    const statusMsg = modal.querySelector<HTMLElement>('.about-update-status');
    expect(checkBtn).not.toBeNull();
    expect(statusMsg).not.toBeNull();
    expect(checkBtn?.textContent).toBe('Check for Updates');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen()).toBe(false);
  });

  it('renders Typora-style two-column layout with sidebar and categories', () => {
    const modal = showSettingsDialog({ storage });

    const sidebar = modal.querySelector('.settings-sidebar');
    const main = modal.querySelector('.settings-main');
    expect(sidebar).not.toBeNull();
    expect(main).not.toBeNull();

    // Traffic lights
    const trafficLights = sidebar?.querySelector('.settings-traffic-lights');
    expect(trafficLights).not.toBeNull();
    const closeDot = trafficLights?.querySelector('.traffic-dot-close');
    expect(closeDot).not.toBeNull();

    // Search input
    const searchInput = sidebar?.querySelector<HTMLInputElement>('.settings-search-input');
    expect(searchInput).not.toBeNull();
    expect(searchInput?.placeholder).toBe('Search...');

    // 7 categories
    const tabs = Array.from(sidebar?.querySelectorAll<HTMLButtonElement>('.settings-tab-button') || []);
    expect(tabs.length).toBe(7);
    const tabLabels = tabs.map(t => t.textContent?.trim());
    expect(tabLabels).toEqual(['Files', 'Editor', 'Image', 'Markdown', 'Export', 'Appearance', 'General']);

    // Default active tab is General
    const activeTab = sidebar?.querySelector('.settings-tab-button.active');
    expect(activeTab?.textContent?.trim()).toBe('General');

    const generalPanel = modal.querySelector<HTMLElement>('#panel-general');
    expect(generalPanel).not.toBeNull();
    expect(generalPanel?.hasAttribute('hidden')).toBe(false);

    const appearancePanel = modal.querySelector<HTMLElement>('#panel-appearance');
    expect(appearancePanel?.hasAttribute('hidden')).toBe(true);

    // Switch to Appearance tab
    const appearanceTab = modal.querySelector<HTMLButtonElement>('#tab-appearance')!;
    appearanceTab.click();

    expect(appearanceTab.classList.contains('active')).toBe(true);
    expect(appearancePanel?.hasAttribute('hidden')).toBe(false);
    expect(generalPanel?.hasAttribute('hidden')).toBe(true);

    // Close via traffic dot close button
    (closeDot as HTMLButtonElement).click();
    expect(isModalOpen()).toBe(false);
  });

  it('filters categories and sections via search input', () => {
    const modal = showSettingsDialog({ storage });

    const searchInput = modal.querySelector<HTMLInputElement>('.settings-search-input')!;
    expect(searchInput).not.toBeNull();

    // Filter by "Language"
    searchInput.value = 'Language';
    searchInput.dispatchEvent(new Event('input'));

    const generalTab = modal.querySelector<HTMLButtonElement>('#tab-general')!;
    const filesTab = modal.querySelector<HTMLButtonElement>('#tab-files')!;

    expect(generalTab.style.display).not.toBe('none');
    expect(filesTab.style.display).toBe('none');

    // Clear search
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    expect(filesTab.style.display).toBe('');

    // Dismiss
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen()).toBe(false);
  });

  it('updates language setting and dynamically translates UI in place', () => {
    const modal = showSettingsDialog({ storage });

    const langSelect = modal.querySelector<HTMLSelectElement>('select[data-key="markdew.language"]')!;
    expect(langSelect).not.toBeNull();
    expect(langSelect.value).toBe('system');

    // Change language to Simplified Chinese (zh-CN)
    langSelect.value = 'zh-CN';
    langSelect.dispatchEvent(new Event('change'));

    expect(mockStorage['markdew.language']).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');

    // Check that tabs were translated
    const generalTab = modal.querySelector<HTMLButtonElement>('#tab-general')!;
    expect(generalTab.textContent?.trim()).toBe('通用');

    const appearanceTab = modal.querySelector<HTMLButtonElement>('#tab-appearance')!;
    expect(appearanceTab.textContent?.trim()).toBe('外观');

    const doneBtn = modal.querySelector<HTMLButtonElement>('.modal-footer button')!;
    expect(doneBtn.textContent).toBe('完成');

    // Switch back to English
    langSelect.value = 'en';
    langSelect.dispatchEvent(new Event('change'));
    expect(mockStorage['markdew.language']).toBe('en');
    expect(generalTab.textContent?.trim()).toBe('General');
    expect(doneBtn.textContent).toBe('Done');

    // Dismiss
    doneBtn.click();
    expect(isModalOpen()).toBe(false);
  });

  it('persists image transfer mode preference in storage', () => {
    const modal = showSettingsDialog({ storage });

    const pastedSelect = modal.querySelector<HTMLSelectElement>('select[data-key="markdew-pasted-images"]')!;
    expect(pastedSelect).not.toBeNull();
    expect(pastedSelect.value).toBe('embed');

    pastedSelect.value = 'copy';
    pastedSelect.dispatchEvent(new Event('change'));

    expect(mockStorage['markdew-pasted-images']).toBe('copy');

    // Dismiss
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(isModalOpen()).toBe(false);
  });
});


it('applies a Writing Size change through the writing surface control, not the page root', () => {
  document.body.innerHTML = '<div id="editor"></div>';
  const surface = document.querySelector<HTMLElement>('#editor')!, parent = document.createElement('div'); document.body.append(parent);
  const allowed = vi.fn(() => true), measure = vi.fn();
  writingSizeControls(parent, surface, allowed, measure);
  const data: Record<string, string> = {};
  const storage = { getItem: (key: string) => data[key] ?? null, setItem: (key: string, value: string) => { data[key] = value; } } as Storage;
  showSettingsDialog({ storage, onMeasure: measure });
  document.querySelector<HTMLButtonElement>('#tab-appearance')!.click();
  const select = document.querySelector<HTMLSelectElement>('select[data-key="markdew.writing-size"]')!;
  select.value = '150'; select.dispatchEvent(new Event('change'));
  expect(surface.style.getPropertyValue('--writing-scale')).toBe('1.5');
  expect(document.querySelector<HTMLSelectElement>('.writing-size-control select')!.value).toBe('150'); expect(measure).toHaveBeenCalled();
  allowed.mockReturnValue(false);
  select.value = '90'; select.dispatchEvent(new Event('change'));
  expect(surface.style.getPropertyValue('--writing-scale')).toBe('1.5'); expect(select.value).toBe('150');
  expect(storage.getItem('markdew.writing-size')).toBe('150');
});
