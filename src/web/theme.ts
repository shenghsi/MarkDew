import { invoke, isTauri } from '@tauri-apps/api/core';

export type ThemeChoice = 'system' | 'light' | 'dark';
const key = 'markdew.theme';
const valid = (value: unknown): value is ThemeChoice => value === 'system' || value === 'light' || value === 'dark';

let activeThemeHandler: ((choice: ThemeChoice) => void) | undefined;

export function setTheme(choice: ThemeChoice) {
  if (activeThemeHandler) {
    activeThemeHandler(choice);
  } else {
    try { localStorage.setItem(key, choice); } catch { /* Storage can be unavailable. */ }
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
    document.documentElement.dataset.theme = choice === 'system' ? (media?.matches ? 'dark' : 'light') : choice;
    if (isTauri()) {
      void Promise.resolve(invoke('update_menu_state', { theme: choice })).catch(() => {});
    }
  }
}

// Theme changes are presentation effects. They do not dispatch editor edits.
export function themeControls(parent: HTMLElement) {
  const label = document.createElement('label'); label.className = 'theme-control'; label.textContent = 'Theme ';
  const select = document.createElement('select'); select.id = 'theme'; select.setAttribute('aria-label', 'Theme');
  for (const choice of ['system', 'light', 'dark'] as const) {
    const option = document.createElement('option'); option.value = choice;
    option.textContent = choice[0].toUpperCase() + choice.slice(1); select.append(option);
  }
  label.append(select); parent.append(label);
  let choice: ThemeChoice = 'system';
  try { const saved = localStorage.getItem(key); if (valid(saved)) choice = saved; } catch { /* Storage can be unavailable. */ }
  const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
  const apply = () => {
    document.documentElement.dataset.theme = choice === 'system' ? (media?.matches ? 'dark' : 'light') : choice;
    select.value = choice;
    if (isTauri()) {
      void Promise.resolve(invoke('update_menu_state', { theme: choice })).catch(() => {});
    }
  };
  const change = () => {
    if (!valid(select.value)) return;
    choice = select.value as ThemeChoice;
    try { localStorage.setItem(key, choice); } catch { /* The current theme still works. */ }
    apply();
  };
  activeThemeHandler = (newChoice: ThemeChoice) => {
    if (!valid(newChoice)) return;
    choice = newChoice;
    try { localStorage.setItem(key, choice); } catch { /* The current theme still works. */ }
    apply();
  };
  const storageListener = (event: StorageEvent) => {
    if (event.key === key && valid(event.newValue)) {
      choice = event.newValue as ThemeChoice;
      apply();
    }
  };
  window.addEventListener('storage', storageListener);
  select.addEventListener('change', change); media?.addEventListener('change', apply); apply();
  return () => {
    activeThemeHandler = undefined;
    window.removeEventListener('storage', storageListener);
    select.removeEventListener('change', change);
    media?.removeEventListener('change', apply);
    label.remove();
  };
}
