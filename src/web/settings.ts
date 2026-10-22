import { isAutoUpdateEnabled, setAutoUpdateEnabled } from './auto-update';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { setTheme, ThemeChoice } from './theme';
import { checkAppUpdates, installAppUpdate, UpdateInfo } from './updater';
import {
  DIAGRAM_KEYS, DIAGRAM_PALETTES, DIAGRAM_FONTS, DIAGRAM_FONT_SIZES, DIAGRAM_RADII, DIAGRAM_PADDINGS,
  DIAGRAM_MAX_HEIGHTS, DEFAULT_DIAGRAM_SETTINGS, getDiagramSettings, applyDiagramStyle,
} from './diagram-settings';
import { layoutPreferences, SidebarChoice } from './layout-preferences';
import {
  t,
  getCurrentLanguage,
  getLanguagePreference,
  setLanguagePreference,
  subscribeLanguageChange,
  LanguageChoice,
  LANGUAGE_STORAGE_KEY,
} from './i18n';

function openWebUrl(url: string): void {
  if (isTauri()) {
    invoke('open_web_link', { url }).catch(() => window.open(url, '_blank'));
  } else {
    window.open(url, '_blank');
  }
}

export function bindUpdateButton(button: HTMLButtonElement, update: UpdateInfo, status: HTMLElement, storage: Storage = localStorage): void {
  button.textContent = t(update.oneClick ? 'general.install_update' : 'general.download_update', storage);
  const notice = document.createElement('div');
  notice.setAttribute('role', 'status');
  button.addEventListener('click', async () => {
    if (!update.oneClick) { openWebUrl(update.downloadUrl || update.htmlUrl); return; }
    button.disabled = true;
    status.append(notice);
    notice.textContent = t('general.downloading_update', storage);
    try {
      await installAppUpdate(progress => {
        notice.textContent = t(progress.stage === 'install' ? 'general.installing_update' : 'general.downloading_update', storage);
        if (progress.stage === 'download' && progress.total && progress.downloaded !== undefined) {
          notice.textContent += ` ${Math.min(100, Math.floor(progress.downloaded / progress.total * 100))}%`;
        }
      });
    } catch (error) {
      notice.textContent = String(error instanceof Error ? error.message : error);
      button.disabled = false;
    }
  });
}

export const LINE_WIDTH_STORAGE_KEY = 'markdew.max-line-width';
export const DEFAULT_LINE_WIDTH = '860px';

export interface PresetChoice {
  label: string;
  value: string;
  pixels: number | null;
}

export const LINE_WIDTH_PRESETS: readonly PresetChoice[] = [
  { label: 'Compact', value: '700px', pixels: 700 },
  { label: 'Standard', value: '860px', pixels: 860 },
  { label: 'Wide', value: '1000px', pixels: 1000 },
  { label: 'Extra Wide', value: '1200px', pixels: 1200 },
  { label: 'Full Width', value: '100%', pixels: null },
] as const;

export function validateLineWidth(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_LINE_WIDTH;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === '100%' || trimmed === 'none' || trimmed === 'full') {
    return '100%';
  }
  const match = /^(\d+)(?:px)?$/.exec(trimmed);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(400, Math.min(3000, num));
      return `${clamped}px`;
    }
  }
  return DEFAULT_LINE_WIDTH;
}

export function getSavedLineWidth(storage: Storage = localStorage): string {
  try {
    const raw = storage.getItem(LINE_WIDTH_STORAGE_KEY);
    if (raw) return validateLineWidth(raw);
  } catch {
    // Storage access failures do not block application rendering.
  }
  return DEFAULT_LINE_WIDTH;
}

export function saveLineWidth(value: string, storage: Storage = localStorage): string {
  const validated = validateLineWidth(value);
  try {
    storage.setItem(LINE_WIDTH_STORAGE_KEY, validated);
  } catch {
    // Retain current session value even if persistence fails.
  }
  return validated;
}

export function applyLineWidth(value: string, root: HTMLElement = document.documentElement): void {
  const validated = validateLineWidth(value);
  root.style.setProperty('--editor-max-width', validated);
}

export function initSettings(options?: {
  onMeasure?: () => void;
  storage?: Storage;
}): () => void {
  const storage = options?.storage ?? localStorage;
  const current = getSavedLineWidth(storage);
  applyLineWidth(current);
  applyDiagramStyle(getDiagramSettings(storage));

  const onStorage = (event: StorageEvent) => {
    if (event.key === LINE_WIDTH_STORAGE_KEY && event.newValue) {
      applyLineWidth(event.newValue);
      options?.onMeasure?.();
    }
  };

  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('storage', onStorage);
  };
}

let activeSettingsModal: HTMLElement | null = null;
let activeAboutModal: HTMLElement | null = null;

export function isModalOpen(): boolean {
  return activeSettingsModal !== null || activeAboutModal !== null;
}

export const SETTINGS_KEYS = {
  QUIT_ON_CLOSE: 'markdew.quit-on-close',
  LANGUAGE: 'markdew.language',
  AUTO_UPDATE: 'markdew.auto-update',
  UPDATE_DEV: 'markdew.update-dev',
  LINE_WIDTH: LINE_WIDTH_STORAGE_KEY,
  THEME: 'markdew.theme',
  WRITING_SIZE: 'markdew.writing-size',
  AUTO_CLOSE_BRACKETS: 'markdew.auto-close-brackets',
  AUTO_CLOSE_FENCES: 'markdew.auto-close-fences',
  LINE_NUMBERS: 'markdew.line-numbers',
  SCROLL_STABILIZATION: 'markdew.scroll-stabilization',
  THEME_CURSOR: 'markdew.theme-cursor',
  TABLE_TOOLS: 'markdew.table-tools',
  RESTORE_TABS: 'markdew.restore-tabs',
  DISCARD_RECOVERY: 'markdew.discard-recovery',
  DEFAULT_FORMAT: 'markdew.default-format',
  SHOW_SIDEBAR: 'markdew.show-sidebar',
  MATH_ENABLED: 'markdew.math-enabled',
  FOOTNOTES_ENABLED: 'markdew.footnotes-enabled',
  HTML_BLOCKS: 'markdew.html-blocks',
  IMAGE_ASSETS_MODE: 'markdew.image-assets-mode',
  IMAGE_AUTO_COPY: 'markdew.image-auto-copy',
  EXPORT_DEFAULT: 'markdew.export-default',
  EXPORT_INCLUDE_TITLE: 'markdew.export-include-title',
} as const;

interface CategoryDef {
  id: string;
  labelKey: 'cat.files' | 'cat.editor' | 'cat.image' | 'cat.markdown' | 'cat.export' | 'cat.appearance' | 'cat.general';
  iconSvg: string;
}

const CATEGORIES: readonly CategoryDef[] = [
  {
    id: 'files',
    labelKey: 'cat.files',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
  },
  {
    id: 'editor',
    labelKey: 'cat.editor',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
  },
  {
    id: 'image',
    labelKey: 'cat.image',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>',
  },
  {
    id: 'markdown',
    labelKey: 'cat.markdown',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 15V9l3 4 3-4v6"></path><path d="M18 12l-2.5 3-2.5-3"></path><path d="M15.5 9v6"></path></svg>',
  },
  {
    id: 'export',
    labelKey: 'cat.export',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
  },
  {
    id: 'appearance',
    labelKey: 'cat.appearance',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>',
  },
  {
    id: 'general',
    labelKey: 'cat.general',
    iconSvg: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect></svg>',
  },
] as const;

function createSelectControl(
  storage: Storage,
  key: string,
  options: readonly { label: string; value: string }[],
  defaultValue: string,
  onChange?: (value: string) => void,
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'settings-select';
  select.dataset.key = key;
  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.append(option);
  }
  let current = defaultValue;
  try {
    const val = storage.getItem(key);
    if (val !== null && options.some(o => o.value === val)) current = val;
  } catch {}
  select.value = current;

  select.addEventListener('change', () => {
    try {
      storage.setItem(key, select.value);
    } catch {}
    onChange?.(select.value);
  });
  return select;
}

export function showSettingsDialog(options?: {
  onMeasure?: () => void;
  storage?: Storage;
}): HTMLElement {
  if (activeSettingsModal && activeSettingsModal.isConnected) {
    const focusTarget = activeSettingsModal.querySelector<HTMLElement>('button, input, select');
    focusTarget?.focus();
    return activeSettingsModal;
  }

  const storage = options?.storage ?? localStorage;
  const previousFocus = document.activeElement as HTMLElement | null;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'settings-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', t('title.settings', storage));

  activeSettingsModal = modal;

  let onKeyDown!: (event: KeyboardEvent) => void;
  const close = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    backdrop.remove();
    activeSettingsModal = null;
    previousFocus?.focus();
  };

  // 1. Sidebar
  const sidebar = document.createElement('aside');
  sidebar.className = 'settings-sidebar';

  const trafficLights = document.createElement('div');
  trafficLights.className = 'settings-traffic-lights';

  const closeDot = document.createElement('button');
  closeDot.type = 'button';
  closeDot.className = 'traffic-dot traffic-dot-close';
  closeDot.setAttribute('aria-label', t('btn.close', storage));
  closeDot.addEventListener('click', close);

  const minDot = document.createElement('span');
  minDot.className = 'traffic-dot traffic-dot-minimize';
  minDot.setAttribute('aria-hidden', 'true');

  const maxDot = document.createElement('span');
  maxDot.className = 'traffic-dot traffic-dot-maximize';
  maxDot.setAttribute('aria-hidden', 'true');

  trafficLights.append(closeDot, minDot, maxDot);

  // Search input
  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'settings-search-wrapper';
  searchWrapper.innerHTML = `
    <svg class="settings-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  `;
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'settings-search-input';
  searchInput.placeholder = t('search.placeholder', storage);
  searchInput.setAttribute('aria-label', t('search.placeholder', storage));
  searchWrapper.append(searchInput);

  // Category tablist
  const tabList = document.createElement('div');
  tabList.className = 'settings-tab-list';
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-orientation', 'vertical');

  const tabButtons: Map<string, HTMLButtonElement> = new Map();
  const panels: Map<string, HTMLElement> = new Map();

  // 2. Right Main Area
  const main = document.createElement('div');
  main.className = 'settings-main';

  const content = document.createElement('div');
  content.className = 'modal-content';

  const setActiveCategory = (categoryId: string) => {
    for (const [id, btn] of tabButtons) {
      const active = id === categoryId;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
    for (const [id, panel] of panels) {
      if (id === categoryId) {
        panel.removeAttribute('hidden');
        panel.style.display = 'flex';
      } else {
        panel.setAttribute('hidden', '');
        panel.style.display = 'none';
      }
    }
  };

  // Build Category Panels
  for (const cat of CATEGORIES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'settings-tab-button';
    btn.id = `tab-${cat.id}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', `panel-${cat.id}`);
    btn.innerHTML = `${cat.iconSvg}<span>${t(cat.labelKey, storage)}</span>`;
    btn.addEventListener('click', () => setActiveCategory(cat.id));
    tabButtons.set(cat.id, btn);
    tabList.append(btn);

    const panel = document.createElement('section');
    panel.className = 'settings-panel';
    panel.id = `panel-${cat.id}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${cat.id}`);
    panels.set(cat.id, panel);
    content.append(panel);
  }

  // Helper for empty categories
  const renderEmptyNotice = (panel: HTMLElement) => {
    const card = document.createElement('div');
    card.className = 'settings-empty-card';
    const title = document.createElement('div');
    title.className = 'settings-empty-title';
    title.textContent = t('empty.notice', storage);
    const sub = document.createElement('div');
    sub.className = 'settings-empty-desc';
    sub.textContent = t('empty.sub', storage);
    card.append(title, sub);
    panel.append(card);
  };

  // Populate Panel: Files (Startup Sidebar preference)
  const filesPanel = panels.get('files')!;
  {
    const layout = layoutPreferences(() => storage);
    const sidebarSec = document.createElement('section');
    sidebarSec.className = 'settings-section';
    const h = document.createElement('h3');
    h.className = 'settings-section-title';
    h.textContent = t('files.startup_sidebar', storage);
    const desc = document.createElement('p');
    desc.className = 'settings-desc';
    desc.textContent = t('files.sidebar_desc', storage);

    const sidebarSelect = document.createElement('select');
    sidebarSelect.className = 'settings-select';
    sidebarSelect.dataset.key = 'markdew.layout-sidebar';
    sidebarSelect.append(
      new Option(t('files.sidebar_files', storage), 'files'),
      new Option(t('files.sidebar_outline', storage), 'outline'),
      new Option(t('files.sidebar_hidden', storage), 'hidden'),
    );
    sidebarSelect.value = layout.sidebar;
    sidebarSelect.addEventListener('change', () => {
      layout.sidebarChanged(sidebarSelect.value as SidebarChoice);
    });
    sidebarSec.append(h, desc, sidebarSelect);
    filesPanel.append(sidebarSec);
  }

  // Populate Panel: Editor (Notice)
  renderEmptyNotice(panels.get('editor')!);

  // Populate Panel: Markdown (Notice)
  renderEmptyNotice(panels.get('markdown')!);

  // Populate Panel: Export (Notice)
  renderEmptyNotice(panels.get('export')!);

  // Populate Panel: Image (Pasted & Dropped transfer modes)
  const imagePanel = panels.get('image')!;
  {
    const imgSec = document.createElement('section');
    imgSec.className = 'settings-section';
    const desc = document.createElement('p');
    desc.className = 'settings-desc';
    desc.textContent = t('image.desc', storage);

    const pastedH = document.createElement('h3');
    pastedH.className = 'settings-section-title';
    pastedH.textContent = t('image.pasted', storage);
    const pastedSelect = createSelectControl(
      storage,
      'markdew-pasted-images',
      [
        { label: t('image.embed', storage), value: 'embed' },
        { label: t('image.copy', storage), value: 'copy' },
      ],
      'embed',
    );

    const droppedH = document.createElement('h3');
    droppedH.className = 'settings-section-title';
    droppedH.textContent = t('image.dropped', storage);
    const droppedSelect = createSelectControl(
      storage,
      'markdew-dropped-images',
      [
        { label: t('image.link', storage), value: 'link' },
        { label: t('image.copy', storage), value: 'copy' },
      ],
      'link',
    );

    imgSec.append(desc, pastedH, pastedSelect, droppedH, droppedSelect);
    imagePanel.append(imgSec);
  }

  // Populate Panel: Appearance (Theme, Line Width, Writing Size)
  const appearancePanel = panels.get('appearance')!;
  {
    // Section: Theme
    const themeSection = document.createElement('section');
    themeSection.className = 'settings-section';
    const themeHeading = document.createElement('h3');
    themeHeading.className = 'settings-section-title';
    themeHeading.textContent = t('appearance.theme', storage);

    const themeGroup = document.createElement('div');
    themeGroup.className = 'theme-button-group';

    const themes: Array<{ labelKey: 'appearance.theme_system' | 'appearance.theme_light' | 'appearance.theme_dark'; mode: ThemeChoice }> = [
      { labelKey: 'appearance.theme_system', mode: 'system' },
      { labelKey: 'appearance.theme_light', mode: 'light' },
      { labelKey: 'appearance.theme_dark', mode: 'dark' },
    ];

    const updateThemeButtons = () => {
      const currentTheme = (document.documentElement.dataset.theme as ThemeChoice) || 'system';
      for (const btn of Array.from(themeGroup.querySelectorAll<HTMLButtonElement>('button'))) {
        const mode = btn.dataset.theme;
        const active = mode === currentTheme;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      }
    };

    for (const item of themes) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-button theme-preset-button';
      btn.dataset.theme = item.mode;
      btn.textContent = t(item.labelKey, storage);
      btn.addEventListener('click', () => {
        setTheme(item.mode);
        const select = document.querySelector<HTMLSelectElement>('#theme, select[aria-label="Theme"], .theme-control select');
        if (select && select.value !== item.mode) {
          select.value = item.mode;
          select.dispatchEvent(new Event('change'));
        }
        updateThemeButtons();
      });
      themeGroup.append(btn);
    }
    updateThemeButtons();
    themeSection.append(themeHeading, themeGroup);

    // Section: Line Width
    const lineWidthSection = document.createElement('section');
    lineWidthSection.className = 'settings-section';

    const lineWidthHeading = document.createElement('h3');
    lineWidthHeading.className = 'settings-section-title';
    lineWidthHeading.textContent = t('appearance.line_width', storage);
    const lineWidthDesc = document.createElement('p');
    lineWidthDesc.className = 'settings-desc';
    lineWidthDesc.textContent = t('appearance.line_width_desc', storage);

    let currentWidth = getSavedLineWidth(storage);

    const presetContainer = document.createElement('div');
    presetContainer.className = 'line-width-presets';

    const customRow = document.createElement('div');
    customRow.className = 'custom-width-row';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '500';
    slider.max = '1800';
    slider.step = '20';
    slider.className = 'custom-width-slider';
    slider.setAttribute('aria-label', 'Editor width slider in pixels');

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = '400';
    numberInput.max = '3000';
    numberInput.step = '10';
    numberInput.className = 'custom-width-input';
    numberInput.setAttribute('aria-label', 'Editor width in pixels');

    const unitLabel = document.createElement('span');
    unitLabel.className = 'custom-width-unit';
    unitLabel.textContent = 'px';

    customRow.append(slider, numberInput, unitLabel);

    const updateControls = (width: string) => {
      currentWidth = width;
      applyLineWidth(width);
      saveLineWidth(width, storage);
      options?.onMeasure?.();

      const isFull = width === '100%';
      const match = /^(\d+)px$/.exec(width);
      const px = match ? parseInt(match[1], 10) : 860;

      for (const btn of Array.from(presetContainer.querySelectorAll<HTMLButtonElement>('button'))) {
        const val = btn.dataset.value;
        if (val === width) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      }

      if (isFull) {
        customRow.style.opacity = '0.4';
        slider.disabled = true;
        numberInput.disabled = true;
      } else {
        customRow.style.opacity = '1';
        slider.disabled = false;
        numberInput.disabled = false;
        slider.value = String(Math.max(500, Math.min(1800, px)));
        numberInput.value = String(px);
      }
    };

    const presetLabels: Record<string, string> = {
      '700px': t('appearance.preset_compact', storage),
      '860px': t('appearance.preset_standard', storage),
      '1000px': t('appearance.preset_wide', storage),
      '1200px': t('appearance.preset_extra_wide', storage),
      '100%': t('appearance.preset_full', storage),
    };

    for (const preset of LINE_WIDTH_PRESETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-button';
      btn.dataset.value = preset.value;
      btn.textContent = presetLabels[preset.value] || preset.label;
      btn.addEventListener('click', () => {
        updateControls(preset.value);
      });
      presetContainer.append(btn);
    }

    slider.addEventListener('input', () => {
      updateControls(`${slider.value}px`);
    });

    numberInput.addEventListener('change', () => {
      updateControls(`${numberInput.value}px`);
    });

    updateControls(currentWidth);
    lineWidthSection.append(lineWidthHeading, lineWidthDesc, presetContainer, customRow);

    // Section: Writing Size
    const writingSizeSec = document.createElement('section');
    writingSizeSec.className = 'settings-section';
    const wsHeading = document.createElement('h3');
    wsHeading.className = 'settings-section-title';
    wsHeading.textContent = t('appearance.writing_size', storage);
    const wsDesc = document.createElement('p');
    wsDesc.className = 'settings-desc';
    wsDesc.textContent = t('appearance.writing_size_desc', storage);
    const wsSelect = createSelectControl(
      storage,
      'markdew.writing-size',
      [
        { label: '80%', value: '80' },
        { label: '90%', value: '90' },
        { label: '100%', value: '100' },
        { label: '110%', value: '110' },
        { label: '125%', value: '125' },
        { label: '150%', value: '150' },
        { label: '175%', value: '175' },
        { label: '200%', value: '200' },
      ],
      '100',
      (val) => {
        const scale = Number(val) / 100;
        document.documentElement.style.setProperty('--writing-scale', String(scale));
        options?.onMeasure?.();
      },
    );
    writingSizeSec.append(wsHeading, wsDesc, wsSelect);

    // Group: Editor (line width, writing size)
    const editorGroup = document.createElement('div');
    editorGroup.className = 'settings-group';
    const editorGroupTitle = document.createElement('h2');
    editorGroupTitle.className = 'settings-group-title';
    editorGroupTitle.textContent = t('appearance.group_editor', storage);
    editorGroup.append(editorGroupTitle, lineWidthSection, writingSizeSec);

    // Group: Mermaid Diagram, in three sections
    const diagramGroup = document.createElement('div');
    diagramGroup.className = 'settings-group';
    const dgTitle = document.createElement('h2');
    dgTitle.className = 'settings-group-title';
    dgTitle.textContent = t('appearance.diagram', storage);
    const dgDesc = document.createElement('p');
    dgDesc.className = 'settings-desc';
    dgDesc.textContent = t('appearance.diagram_desc', storage);
    diagramGroup.append(dgTitle, dgDesc);
    const changed = () => {
      applyDiagramStyle(getDiagramSettings(storage));
      window.dispatchEvent(new CustomEvent('markdew:diagram-settings'));
      options?.onMeasure?.();
    };
    const d = DEFAULT_DIAGRAM_SETTINGS;
    const choices = <T extends string>(values: readonly T[], label: (value: T, index: number) => string) =>
      values.map((value, index) => ({ value, label: label(value, index) }));
    const sections: Array<{ title: string; rows: Array<[string, string, readonly { label: string; value: string }[], string]> }> = [
      { title: t('appearance.diagram_colors', storage), rows: [
        [t('appearance.diagram_palette', storage), DIAGRAM_KEYS.PALETTE,
          choices(DIAGRAM_PALETTES, value => t(`appearance.diagram_palette_${value}` as const, storage)), d.palette],
      ] },
      { title: t('appearance.diagram_text', storage), rows: [
        [t('appearance.diagram_font', storage), DIAGRAM_KEYS.FONT,
          choices(DIAGRAM_FONTS, value => t(`appearance.diagram_font_${value}` as const, storage)), d.font],
        [t('appearance.diagram_font_size', storage), DIAGRAM_KEYS.FONT_SIZE,
          choices(DIAGRAM_FONT_SIZES, value => `${value} px`), d.fontSize],
      ] },
      { title: t('appearance.diagram_shape', storage), rows: [
        [t('appearance.diagram_radius', storage), DIAGRAM_KEYS.RADIUS,
          choices(DIAGRAM_RADII, (_value, i) => t((['appearance.diagram_radius_square', 'appearance.diagram_radius_default', 'appearance.diagram_radius_round'] as const)[i], storage)), d.radius],
        [t('appearance.diagram_padding', storage), DIAGRAM_KEYS.PADDING,
          choices(DIAGRAM_PADDINGS, (_value, i) => t((['appearance.diagram_padding_compact', 'appearance.diagram_padding_default', 'appearance.diagram_padding_roomy'] as const)[i], storage)), d.padding],
        [t('appearance.diagram_max_height', storage), DIAGRAM_KEYS.MAX_HEIGHT,
          choices(DIAGRAM_MAX_HEIGHTS, value => value === 'none' ? t('appearance.diagram_no_limit', storage) : `${value} px`), d.maxHeight],
      ] },
    ];
    for (const spec of sections) {
      const section = document.createElement('section');
      section.className = 'settings-section';
      const heading = document.createElement('h3');
      heading.className = 'settings-section-title';
      heading.textContent = spec.title;
      section.append(heading);
      for (const [label, key, options2, fallback] of spec.rows) {
        const row = document.createElement('label');
        row.className = 'settings-row';
        const text = document.createElement('span');
        text.textContent = label;
        row.append(text, createSelectControl(storage, key, options2, fallback, changed));
        section.append(row);
      }
      diagramGroup.append(section);
    }

    appearancePanel.append(themeSection, editorGroup, diagramGroup);
  }

  // Populate Panel: General (Language, Update, License, Reset)
  const generalPanel = panels.get('general')!;
  {
    // 1. Language
    const langSec = document.createElement('section');
    langSec.className = 'settings-section';
    const langTitle = document.createElement('h3');
    langTitle.className = 'settings-section-title';
    langTitle.innerHTML = `${t('general.language', storage)} <span class="settings-section-subtitle">${t('general.lang_hint', storage)}</span>`;

    const langPref = getLanguagePreference(storage);
    const langSelect = document.createElement('select');
    langSelect.className = 'settings-select';
    langSelect.dataset.key = LANGUAGE_STORAGE_KEY;
    langSelect.append(
      new Option('English', 'en'),
      new Option('简体中文', 'zh-CN'),
      new Option(getCurrentLanguage(storage) === 'zh-CN' ? '跟随系统' : 'System Default', 'system'),
    );
    langSelect.value = langPref;

    langSelect.addEventListener('change', () => {
      const selected = langSelect.value as LanguageChoice;
      setLanguagePreference(selected, storage);
      document.documentElement.lang = getCurrentLanguage(storage);
      window.dispatchEvent(new CustomEvent('markdew-language-changed', { detail: { lang: selected } }));

      // Refresh dialog text in place
      for (const cat of CATEGORIES) {
        const btn = tabButtons.get(cat.id);
        if (btn) {
          btn.innerHTML = `${cat.iconSvg}<span>${t(cat.labelKey, storage)}</span>`;
        }
      }
      modal.setAttribute('aria-label', t('title.settings', storage));
      searchInput.placeholder = t('search.placeholder', storage);
      searchInput.setAttribute('aria-label', t('search.placeholder', storage));
      doneBtn.textContent = t('btn.done', storage);
      closeDot.setAttribute('aria-label', t('btn.close', storage));
      langTitle.innerHTML = `${t('general.language', storage)} <span class="settings-section-subtitle">${t('general.lang_hint', storage)}</span>`;
      if (langSelect.options[2]) {
        langSelect.options[2].text = getCurrentLanguage(storage) === 'zh-CN' ? '跟随系统' : 'System Default';
      }
      updateTitle.textContent = t('general.update', storage);
      checkUpdatesBtn.textContent = t('general.check_updates', storage);
      autoCheckText.textContent = t('general.auto_check_updates', storage);
      licenseTitle.textContent = t('general.license', storage);
      licenseText.textContent = t('general.license_desc', storage);
      detailBtn.textContent = t('general.detail', storage);
      dialogsTitle.textContent = t('general.dialogs', storage);
      resetBtn.textContent = t('general.restore_defaults', storage);
    });
    langSec.append(langTitle, langSelect);

    // 2. Update
    const updateSec = document.createElement('section');
    updateSec.className = 'settings-section';
    const updateTitle = document.createElement('h3');
    updateTitle.className = 'settings-section-title';
    updateTitle.textContent = t('general.update', storage);

    const checkUpdatesBtn = document.createElement('button');
    checkUpdatesBtn.type = 'button';
    checkUpdatesBtn.className = 'settings-button';
    checkUpdatesBtn.textContent = t('general.check_updates', storage);

    const updateStatus = document.createElement('div');
    updateStatus.className = 'about-update-status';
    updateStatus.setAttribute('aria-live', 'polite');

    checkUpdatesBtn.addEventListener('click', async () => {
      checkUpdatesBtn.disabled = true;
      updateStatus.textContent = t('general.checking_updates', storage);
      try {
        const result = await checkAppUpdates('1.0.0');
        if (result.status === 'up-to-date') {
          updateStatus.textContent = t('general.up_to_date', storage);
          checkUpdatesBtn.disabled = false;
        } else if (result.status === 'update-available') {
          updateStatus.innerHTML = '';
          checkUpdatesBtn.style.display = 'none';

          const updateBox = document.createElement('div');
          updateBox.className = 'about-update-box';

          const boxTitle = document.createElement('div');
          boxTitle.className = 'about-update-title';
          boxTitle.textContent = t('general.update_available', storage).replace('{v}', result.update.version);

          const actions = document.createElement('div');
          actions.className = 'about-update-actions';

          const downloadBtn = document.createElement('button');
          downloadBtn.type = 'button';
          downloadBtn.className = 'about-update-download-btn';
          bindUpdateButton(downloadBtn, result.update, updateStatus, storage);

          actions.append(downloadBtn);
          updateBox.append(boxTitle, actions);
          updateStatus.append(updateBox);
        } else {
          updateStatus.textContent = result.message;
          checkUpdatesBtn.disabled = false;
        }
      } catch {
        updateStatus.textContent = t('general.check_failed', storage);
        checkUpdatesBtn.disabled = false;
      }
    });

    const autoCheckLabel = document.createElement('label');
    autoCheckLabel.className = 'settings-checkbox';
    const autoCheck = document.createElement('input');
    autoCheck.type = 'checkbox';
    autoCheck.checked = isAutoUpdateEnabled(storage);
    autoCheck.addEventListener('change', () => setAutoUpdateEnabled(autoCheck.checked, storage));
    const autoCheckText = document.createElement('span');
    autoCheckText.textContent = t('general.auto_check_updates', storage);
    autoCheckLabel.append(autoCheck, autoCheckText);

    updateSec.append(updateTitle, autoCheckLabel, checkUpdatesBtn, updateStatus);

    // 3. Registration / Activation
    const licenseSec = document.createElement('section');
    licenseSec.className = 'settings-section';
    const licenseTitle = document.createElement('h3');
    licenseTitle.className = 'settings-section-title';
    licenseTitle.textContent = t('general.license', storage);

    const licenseCard = document.createElement('div');
    licenseCard.className = 'settings-card';

    const licenseText = document.createElement('p');
    licenseText.className = 'settings-card-text';
    licenseText.textContent = t('general.license_desc', storage);

    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'settings-button';
    detailBtn.textContent = t('general.detail', storage);
    detailBtn.addEventListener('click', () => {
      showAboutDialog();
    });

    licenseCard.append(licenseText, detailBtn);
    licenseSec.append(licenseTitle, licenseCard);

    // 4. Dialogs
    const dialogsSec = document.createElement('section');
    dialogsSec.className = 'settings-section';
    const dialogsTitle = document.createElement('h3');
    dialogsTitle.className = 'settings-section-title';
    dialogsTitle.textContent = t('general.dialogs', storage);

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'settings-button';
    resetBtn.textContent = t('general.restore_defaults', storage);
    resetBtn.addEventListener('click', () => {
      applyLineWidth(DEFAULT_LINE_WIDTH);
      saveLineWidth(DEFAULT_LINE_WIDTH, storage);
      setTheme('system');
      setLanguagePreference('system', storage);
      options?.onMeasure?.();
      close();
    });
    dialogsSec.append(dialogsTitle, resetBtn);

    generalPanel.append(langSec, updateSec, licenseSec, dialogsSec);
  }

  // Set default active category to "General"
  setActiveCategory('general');

  // Search input filtering behavior
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      for (const [, btn] of tabButtons) {
        btn.style.display = '';
      }
      for (const [, panel] of panels) {
        for (const sec of Array.from(panel.querySelectorAll<HTMLElement>('.settings-section, .settings-empty-card'))) {
          sec.style.display = '';
        }
      }
      return;
    }

    let firstMatchId: string | null = null;
    for (const [id, panel] of panels) {
      const catDef = CATEGORIES.find(c => c.id === id);
      const catLabel = catDef ? t(catDef.labelKey, storage).toLowerCase() : '';
      const catMatches = catLabel.includes(query);

      let hasVisibleSection = false;
      for (const sec of Array.from(panel.querySelectorAll<HTMLElement>('.settings-section, .settings-empty-card'))) {
        const secText = sec.textContent?.toLowerCase() || '';
        const matches = catMatches || secText.includes(query);
        sec.style.display = matches ? '' : 'none';
        if (matches) hasVisibleSection = true;
      }

      const tabBtn = tabButtons.get(id);
      if (tabBtn) {
        const tabVisible = catMatches || hasVisibleSection;
        tabBtn.style.display = tabVisible ? '' : 'none';
        if (tabVisible && !firstMatchId) {
          firstMatchId = id;
        }
      }
    }

    const activeTab = modal.querySelector<HTMLButtonElement>('.settings-tab-button.active');
    if (activeTab && activeTab.style.display === 'none' && firstMatchId) {
      setActiveCategory(firstMatchId);
    }
  });

  // Keyboard navigation for tablist
  tabList.addEventListener('keydown', (e: KeyboardEvent) => {
    const visibleTabs = Array.from(tabList.querySelectorAll<HTMLButtonElement>('.settings-tab-button'))
      .filter(t => t.style.display !== 'none');
    const currentIndex = visibleTabs.findIndex(t => t === document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % visibleTabs.length;
      const target = visibleTabs[nextIndex];
      target.focus();
      const catId = target.id.replace('tab-', '');
      setActiveCategory(catId);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + visibleTabs.length) % visibleTabs.length;
      const target = visibleTabs[prevIndex];
      target.focus();
      const catId = target.id.replace('tab-', '');
      setActiveCategory(catId);
    }
  });

  // Footer with Done button
  const footer = document.createElement('footer');
  footer.className = 'modal-footer';
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'modal-primary-button';
  doneBtn.textContent = t('btn.done', storage);
  doneBtn.addEventListener('click', close);
  footer.append(doneBtn);

  sidebar.append(trafficLights, searchWrapper, tabList);
  main.append(content, footer);
  modal.append(sidebar, main);
  backdrop.append(modal);
  document.body.append(backdrop);

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });

  onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  doneBtn.focus();
  return modal;
}

export function showAboutDialog(): HTMLElement {
  if (activeAboutModal && activeAboutModal.isConnected) {
    const focusTarget = activeAboutModal.querySelector<HTMLElement>('button');
    focusTarget?.focus();
    return activeAboutModal;
  }

  const previousFocus = document.activeElement as HTMLElement | null;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'about-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'About MarkDew');

  activeAboutModal = modal;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close-button';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.innerHTML = '&times;';

  const logoContainer = document.createElement('div');
  logoContainer.className = 'about-logo';
  logoContainer.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0969da"/>
      <path d="M16 46V22L26 34L36 22V46" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M48 24V44M48 44L41 37M48 44L55 37" stroke="white" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  const appName = document.createElement('h1');
  appName.className = 'about-title';
  appName.textContent = 'MarkDew';

  const version = document.createElement('div');
  version.className = 'about-version';
  version.textContent = 'Version 1.0.0';

  const tagline = document.createElement('p');
  tagline.className = 'about-tagline';
  tagline.textContent = 'Fast, native, distraction-free Markdown editor.';

  const techInfo = document.createElement('div');
  techInfo.className = 'about-meta';
  techInfo.innerHTML = `
    <p>Powered by <strong>Tauri 2</strong> and <strong>CodeMirror 6</strong>.</p>
    <p class="about-license">Dual-licensed under GNU AGPLv3 and commercial license.</p>
  `;

  const updateSection = document.createElement('div');
  updateSection.className = 'about-update-section';

  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'about-update-check-btn';
  checkBtn.textContent = 'Check for Updates';

  const statusMsg = document.createElement('div');
  statusMsg.className = 'about-update-status';
  statusMsg.setAttribute('aria-live', 'polite');

  checkBtn.addEventListener('click', async () => {
    checkBtn.disabled = true;
    statusMsg.textContent = 'Checking for updates...';
    try {
      const result = await checkAppUpdates('1.0.0');
      if (result.status === 'up-to-date') {
        statusMsg.textContent = 'MarkDew is up to date.';
        checkBtn.disabled = false;
      } else if (result.status === 'update-available') {
        statusMsg.innerHTML = '';
        checkBtn.style.display = 'none';

        const updateBox = document.createElement('div');
        updateBox.className = 'about-update-box';

        const updateTitle = document.createElement('div');
        updateTitle.className = 'about-update-title';
        updateTitle.textContent = `Update available: Version ${result.update.version}`;

        const actions = document.createElement('div');
        actions.className = 'about-update-actions';

        const downloadBtn = document.createElement('button');
        downloadBtn.type = 'button';
        downloadBtn.className = 'about-update-download-btn';
        bindUpdateButton(downloadBtn, result.update, statusMsg);

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'about-update-copy-btn';
        copyBtn.textContent = 'Copy Install Command';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(result.update.installerCommand);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy Install Command';
            }, 2000);
          } catch {
            // Ignore clipboard errors
          }
        });

        actions.append(downloadBtn);
        if (!result.update.oneClick) actions.append(copyBtn);
        updateBox.append(updateTitle, actions);
        statusMsg.append(updateBox);
      } else {
        statusMsg.textContent = result.message;
        checkBtn.disabled = false;
      }
    } catch {
      statusMsg.textContent = 'Cannot check for updates. Check your network connection.';
      checkBtn.disabled = false;
    }
  });

  updateSection.append(checkBtn, statusMsg);

  const footer = document.createElement('div');
  footer.className = 'about-footer';
  const doneBtn = document.createElement('button');
  doneBtn.type = 'button';
  doneBtn.className = 'modal-primary-button';
  doneBtn.textContent = 'Close';
  footer.append(doneBtn);

  modal.append(closeBtn, logoContainer, appName, version, tagline, techInfo, updateSection, footer);
  backdrop.append(modal);
  document.body.append(backdrop);

  let onKeyDown!: (event: KeyboardEvent) => void;
  const close = () => {
    window.removeEventListener('keydown', onKeyDown, true);
    backdrop.remove();
    activeAboutModal = null;
    previousFocus?.focus();
  };

  closeBtn.addEventListener('click', close);
  doneBtn.addEventListener('click', close);

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) close();
  });

  onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  window.addEventListener('keydown', onKeyDown, true);

  doneBtn.focus();
  return modal;
}
