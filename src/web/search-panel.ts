import { EditorView, Panel, ViewUpdate } from '@codemirror/view';
import {
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchQuery,
} from '@codemirror/search';
import { t, subscribeLanguageChange } from './i18n';
import { composing } from './navigation';

export type SearchMode = 'search' | 'replace';

let activeSearchPanel: MarkDewSearchPanel | null = null;
let pendingSearchMode: SearchMode = 'search';

export function setPendingSearchMode(mode: SearchMode): void {
  pendingSearchMode = mode;
  if (activeSearchPanel) {
    activeSearchPanel.setMode(mode);
  }
}

export function getActiveSearchPanel(): MarkDewSearchPanel | null {
  return activeSearchPanel;
}

export class MarkDewSearchPanel implements Panel {
  dom: HTMLElement;
  top = true;

  private mode: SearchMode = 'search';
  private query: SearchQuery;
  private modeToggleBtn: HTMLButtonElement;
  private searchInput: HTMLInputElement;
  private caseBtn: HTMLButtonElement;
  private wordBtn: HTMLButtonElement;
  private regexBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private closeBtn: HTMLButtonElement;
  private searchRightControls: HTMLElement;

  private replaceRow: HTMLElement;
  private replaceIndent: HTMLElement;
  private replaceInput: HTMLInputElement;
  private replaceActions: HTMLElement;
  private replaceBtn: HTMLButtonElement;
  private replaceAllBtn: HTMLButtonElement;

  private isComposing = false;
  private unsubLanguage: () => void;

  constructor(readonly view: EditorView) {
    activeSearchPanel = this;
    this.mode = pendingSearchMode;
    pendingSearchMode = 'search';

    this.query = getSearchQuery(view.state);

    this.dom = document.createElement('div');
    this.dom.className = 'cm-search markdew-search-panel';

    // 1. Search Row
    const searchRow = document.createElement('div');
    searchRow.className = 'search-row';

    this.modeToggleBtn = document.createElement('button');
    this.modeToggleBtn.type = 'button';
    this.modeToggleBtn.className = 'search-mode-toggle';
    this.modeToggleBtn.addEventListener('click', () => {
      this.toggleMode();
    });

    const searchInputWrapper = document.createElement('div');
    searchInputWrapper.className = 'search-input-wrapper';

    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-input cm-textfield';
    this.searchInput.name = 'search';
    this.searchInput.setAttribute('main-field', 'true');
    this.searchInput.spellcheck = false;
    this.searchInput.autocomplete = 'off';
    this.searchInput.value = this.query.search;

    const commitChange = () => this.commit();
    this.searchInput.addEventListener('input', commitChange);
    this.searchInput.addEventListener('change', commitChange);
    this.searchInput.addEventListener('compositionstart', () => { this.isComposing = true; });
    this.searchInput.addEventListener('compositionend', () => {
      this.isComposing = false;
      this.commit();
    });

    this.searchInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) {
          findPrevious(this.view);
        } else {
          findNext(this.view);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      } else if (event.altKey && (event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        this.caseBtn.click();
      } else if (event.altKey && (event.key === 'w' || event.key === 'W')) {
        event.preventDefault();
        this.wordBtn.click();
      } else if (event.altKey && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        this.regexBtn.click();
      }
    });

    // Option buttons
    const optionsGroup = document.createElement('div');
    optionsGroup.className = 'search-options';

    this.caseBtn = this.createOptionBtn('Aa', this.query.caseSensitive, () => {
      this.setOptionState(this.caseBtn, this.caseBtn.getAttribute('aria-pressed') !== 'true');
      this.commit();
    });
    this.caseBtn.classList.add('search-btn-case');

    this.wordBtn = this.createOptionBtn('', this.query.wholeWord, () => {
      this.setOptionState(this.wordBtn, this.wordBtn.getAttribute('aria-pressed') !== 'true');
      this.commit();
    });
    this.wordBtn.classList.add('search-btn-word');
    this.wordBtn.innerHTML = `<svg width="15" height="13" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2v10M14 2v10M5 5v4M8 5v4M11 5v4M4 11h8"/></svg>`;

    this.regexBtn = this.createOptionBtn('.*', this.query.regexp, () => {
      this.setOptionState(this.regexBtn, this.regexBtn.getAttribute('aria-pressed') !== 'true');
      this.commit();
    });
    this.regexBtn.classList.add('search-btn-regex');

    optionsGroup.append(this.caseBtn, this.wordBtn, this.regexBtn);
    searchInputWrapper.append(this.searchInput, optionsGroup);

    // Navigation buttons
    const navGroup = document.createElement('div');
    navGroup.className = 'search-nav-group';

    this.prevBtn = document.createElement('button');
    this.prevBtn.type = 'button';
    this.prevBtn.className = 'search-nav-btn search-btn-prev';
    this.prevBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    this.prevBtn.addEventListener('click', () => findPrevious(this.view));

    this.nextBtn = document.createElement('button');
    this.nextBtn.type = 'button';
    this.nextBtn.className = 'search-nav-btn search-btn-next';
    this.nextBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    this.nextBtn.addEventListener('click', () => findNext(this.view));

    navGroup.append(this.prevBtn, this.nextBtn);

    const spacer = document.createElement('div');
    spacer.className = 'search-spacer';

    this.closeBtn = document.createElement('button');
    this.closeBtn.type = 'button';
    this.closeBtn.className = 'search-close-btn';
    this.closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    this.closeBtn.addEventListener('click', () => this.close());

    this.searchRightControls = document.createElement('div');
    this.searchRightControls.className = 'search-right-controls';
    this.searchRightControls.append(navGroup, spacer, this.closeBtn);

    searchRow.append(this.modeToggleBtn, searchInputWrapper, this.searchRightControls);

    // 2. Replace Row
    this.replaceRow = document.createElement('div');
    this.replaceRow.className = 'replace-row';
    this.replaceRow.hidden = true;
    this.replaceRow.style.display = 'none';

    this.replaceIndent = document.createElement('div');
    this.replaceIndent.className = 'replace-indent';

    const replaceInputWrapper = document.createElement('div');
    replaceInputWrapper.className = 'search-input-wrapper replace-input-wrapper';

    this.replaceInput = document.createElement('input');
    this.replaceInput.type = 'text';
    this.replaceInput.className = 'search-input cm-textfield';
    this.replaceInput.name = 'replace';
    this.replaceInput.spellcheck = false;
    this.replaceInput.autocomplete = 'off';
    this.replaceInput.value = this.query.replace;

    this.replaceInput.addEventListener('input', commitChange);
    this.replaceInput.addEventListener('change', commitChange);
    this.replaceInput.addEventListener('compositionstart', () => { this.isComposing = true; });
    this.replaceInput.addEventListener('compositionend', () => {
      this.isComposing = false;
      this.commit();
    });

    this.replaceInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
          replaceAll(this.view);
        } else {
          replaceNext(this.view);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });

    replaceInputWrapper.append(this.replaceInput);

    this.replaceActions = document.createElement('div');
    this.replaceActions.className = 'replace-actions';

    this.replaceBtn = document.createElement('button');
    this.replaceBtn.type = 'button';
    this.replaceBtn.className = 'search-action-btn search-btn-replace cm-button';
    this.replaceBtn.addEventListener('click', () => replaceNext(this.view));

    this.replaceAllBtn = document.createElement('button');
    this.replaceAllBtn.type = 'button';
    this.replaceAllBtn.className = 'search-action-btn search-btn-replace-all cm-button';
    this.replaceAllBtn.addEventListener('click', () => replaceAll(this.view));

    this.replaceActions.append(this.replaceBtn, this.replaceAllBtn);
    this.replaceRow.append(this.replaceIndent, replaceInputWrapper, this.replaceActions);

    this.dom.append(searchRow, this.replaceRow);

    // Escape listener on whole panel
    this.dom.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
      }
    });

    this.updateLabels();
    this.updateModeUI();

    this.unsubLanguage = subscribeLanguageChange(() => {
      this.updateLabels();
    });
  }

  private createOptionBtn(text: string, active: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'search-btn-option';
    if (text) btn.textContent = text;
    this.setOptionState(btn, active);
    btn.addEventListener('click', onClick);
    return btn;
  }

  private setOptionState(btn: HTMLButtonElement, active: boolean): void {
    btn.setAttribute('aria-pressed', String(active));
    if (active) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }

  setMode(mode: SearchMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.updateModeUI();
    if (mode === 'replace') {
      if (this.searchInput.value) {
        this.replaceInput.focus();
        this.replaceInput.select();
      } else {
        this.searchInput.focus();
      }
    } else {
      this.searchInput.focus();
      this.searchInput.select();
    }
  }

  toggleMode(): void {
    this.setMode(this.mode === 'search' ? 'replace' : 'search');
    requestAnimationFrame(() => this.syncAlignment());
  }

  private updateModeUI(): void {
    const findLabel = t('search.find');
    const replaceLabel = t('search.replace');
    if (this.mode === 'search') {
      this.modeToggleBtn.textContent = `${findLabel} ▾`;
      this.modeToggleBtn.setAttribute('aria-expanded', 'false');
      this.replaceRow.hidden = true;
      this.replaceRow.style.display = 'none';
    } else {
      this.modeToggleBtn.textContent = `${replaceLabel} ▾`;
      this.modeToggleBtn.setAttribute('aria-expanded', 'true');
      this.replaceRow.hidden = false;
      this.replaceRow.style.display = 'flex';
    }
    this.syncAlignment();
  }

  private syncAlignment(): void {
    if (this.replaceIndent && this.modeToggleBtn) {
      const toggleWidth = Math.max(72, this.modeToggleBtn.offsetWidth);
      this.replaceIndent.style.width = `${toggleWidth}px`;
      this.modeToggleBtn.style.width = `${toggleWidth}px`;
    }
    if (this.searchRightControls && this.replaceActions) {
      const actionsWidth = Math.max(160, this.replaceActions.offsetWidth);
      this.searchRightControls.style.width = `${actionsWidth}px`;
      this.replaceActions.style.width = `${actionsWidth}px`;
    }
  }

  private updateLabels(): void {
    this.updateModeUI();
    this.searchInput.placeholder = t('search.find');
    this.searchInput.setAttribute('aria-label', t('search.find'));
    this.replaceInput.placeholder = t('search.replace');
    this.replaceInput.setAttribute('aria-label', t('search.replace'));
    this.replaceBtn.textContent = t('search.replace');
    this.replaceAllBtn.textContent = t('search.replace_all');
    this.caseBtn.title = `${t('search.match_case')} (Alt+C)`;
    this.wordBtn.title = `${t('search.whole_word')} (Alt+W)`;
    this.regexBtn.title = `${t('search.regexp')} (Alt+R)`;
    this.prevBtn.title = `${t('search.prev')} (Shift+Enter)`;
    this.nextBtn.title = `${t('search.next')} (Enter)`;
    this.closeBtn.title = `${t('search.close')} (Escape)`;
    this.syncAlignment();
  }

  private commit(): void {
    if (this.isComposing || composing(this.view)) return;
    const nextQuery = new SearchQuery({
      search: this.searchInput.value,
      caseSensitive: this.caseBtn.getAttribute('aria-pressed') === 'true',
      wholeWord: this.wordBtn.getAttribute('aria-pressed') === 'true',
      regexp: this.regexBtn.getAttribute('aria-pressed') === 'true',
      replace: this.replaceInput.value,
    });
    if (!nextQuery.eq(this.query)) {
      this.query = nextQuery;
      this.view.dispatch({ effects: setSearchQuery.of(nextQuery) });
    }
  }

  private setQuery(query: SearchQuery): void {
    this.query = query;
    if (this.searchInput.value !== query.search) {
      this.searchInput.value = query.search;
    }
    if (this.replaceInput.value !== query.replace) {
      this.replaceInput.value = query.replace;
    }
    this.setOptionState(this.caseBtn, query.caseSensitive);
    this.setOptionState(this.wordBtn, query.wholeWord);
    this.setOptionState(this.regexBtn, query.regexp);
  }

  update(update: ViewUpdate): void {
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.setQuery(effect.value);
        }
      }
    }
  }

  mount(): void {
    this.syncAlignment();
    requestAnimationFrame(() => this.syncAlignment());
    this.searchInput.focus();
    this.searchInput.select();
  }

  close(): void {
    closeSearchPanel(this.view);
    this.view.focus();
  }

  destroy(): void {
    if (activeSearchPanel === this) {
      activeSearchPanel = null;
    }
    this.unsubLanguage();
  }
}
