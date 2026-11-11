import { invoke, isTauri } from '@tauri-apps/api/core';

export const FONT_KEYS = { TEXT: 'markdew.writing-font', CODE: 'markdew.code-font', TABLE: 'markdew.table-font' } as const;
// The stacks the app uses when no font is chosen. A chosen font goes first and these stay behind it,
// so characters the chosen font lacks (CJK, emoji) still show. The Simplified Chinese fonts keep
// CJK punctuation such as 、 in its Simplified Chinese form, whatever the page language is.
export const TEXT_STACK = '"Open Sans", "Clear Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, "PingFang SC", "Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif, "Apple Color Emoji", "Segoe UI Emoji"';
export const CODE_STACK = 'ui-monospace, Menlo, Consolas, monospace';

// Body text size in pixels. The default is the size the editor used before this setting existed.
export const BODY_SIZE_KEY = 'markdew.body-font-size';
export const BODY_SIZE_DEFAULT = 17;
export const BODY_SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32] as const;
export function readBodySize(storage: Pick<Storage, 'getItem'>): number {
  try {
    const value = Number(storage.getItem(BODY_SIZE_KEY));
    if (BODY_SIZES.some(size => size === value)) return value;
  } catch { /* Use the default size. */ }
  return BODY_SIZE_DEFAULT;
}

const quote = (family: string) => `"${family.replace(/["\\\u0000-\u001f]/g, '')}"`;
const valid = (family: string | null): family is string => !!family && family.length <= 200 && !/[\u0000-\u001f]/.test(family);

// An empty or invalid choice removes the variable, so the CSS default applies.
export function applyFonts(storage: Pick<Storage, 'getItem'>, root: HTMLElement = document.documentElement) {
  for (const [key, property, stack] of [[FONT_KEYS.TEXT, '--writing-font', TEXT_STACK], [FONT_KEYS.CODE, '--code-font', CODE_STACK], [FONT_KEYS.TABLE, '--table-font', TEXT_STACK]] as const) {
    let family: string | null = null;
    try { family = storage.getItem(key); } catch { /* Use the default font. */ }
    if (valid(family)) root.style.setProperty(property, `${quote(family)}, ${stack}`);
    else root.style.removeProperty(property);
  }
}

// The size multiplies with the Writing Size scale in the style sheet.
export function applyBodySize(storage: Pick<Storage, 'getItem'>, root: HTMLElement = document.documentElement) {
  const size = readBodySize(storage);
  if (size === BODY_SIZE_DEFAULT) root.style.removeProperty('--body-font-size');
  else root.style.setProperty('--body-font-size', `${size}px`);
}

let cached: Promise<string[]> | undefined;
// Installed font families. The desktop host lists them. A browser lists them only where it offers
// queryLocalFonts and the user allows it; otherwise the list is empty.
export function installedFonts(): Promise<string[]> {
  cached ||= (async () => {
    let names: string[] = [];
    try {
      if (isTauri()) names = await invoke<string[]>('list_fonts');
      else if (typeof (window as unknown as { queryLocalFonts?: unknown }).queryLocalFonts === 'function') {
        const fonts = await (window as unknown as { queryLocalFonts: () => Promise<{ family: string }[]> }).queryLocalFonts();
        names = fonts.map(font => font.family);
      }
    } catch { /* No list is available. */ }
    return Array.from(new Set(names.filter(name => valid(name)))).sort((a, b) => a.localeCompare(b));
  })();
  // An empty list may work later (for example after the user allows access), so do not keep it.
  void cached.then(list => { if (!list.length) cached = undefined; });
  return cached;
}
