// Editor and Markdown preferences. Each value is stored as 'on' or 'off' and defaults to 'on',
// so a fresh install behaves as it did before these options existed.
export const EDITOR_PREFS = {
  LINE_NUMBERS: 'markdew.line-numbers',
  CONTINUE_LISTS: 'markdew.continue-lists',
  TAB_INDENT_LISTS: 'markdew.tab-indent-lists',
} as const;

export type EditorPref = typeof EDITOR_PREFS[keyof typeof EDITOR_PREFS];
export const EDITOR_PREF_DEFAULTS: Record<EditorPref, boolean> = {
  [EDITOR_PREFS.LINE_NUMBERS]: true,
  [EDITOR_PREFS.CONTINUE_LISTS]: true,
  [EDITOR_PREFS.TAB_INDENT_LISTS]: true,
};
export const EDITOR_PREFS_EVENT = 'markdew:editor-prefs';

export function readEditorPref(key: EditorPref, storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  try {
    const value = storage.getItem(key);
    if (value === 'on') return true;
    if (value === 'off') return false;
  } catch { /* Use the default. */ }
  return EDITOR_PREF_DEFAULTS[key];
}

export function writeEditorPref(key: EditorPref, value: boolean, storage: Pick<Storage, 'setItem'> = localStorage) {
  try { storage.setItem(key, value ? 'on' : 'off'); } catch { /* This launch keeps the choice. */ }
  window.dispatchEvent(new CustomEvent(EDITOR_PREFS_EVENT, { detail: { key, value } }));
}
