import { EditorView } from '@codemirror/view';
import { showMenu, type MenuEntry } from './context-menu';
import { format, type Format } from './formatting';
import { codeBlock } from './code-block-command';
import { insertTable } from './table-insert';
import { insertFootnote } from './footnote-commands';
import { copySelection, cutSelection, deleteSelection, pasteText } from './copy-as';
import { currentFormat, insertFrontMatter, insertHorizontalLine, insertLinkReference, insertParagraph,
  insertTableOfContents, toggleLines, type LineKind } from './insert-commands';
import { t } from './i18n';

export interface EditorMenuHost {
  allowed: () => boolean;
  report: (message: string) => void;
  openLink: () => void;
  openImage: () => void;
}

const svg = (body: string) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const icons = {
  cut: svg('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  paste: svg('<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>'),
  delete: svg('<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
  bold: '<b>B</b>', italic: '<i>I</i>', code: '<span class="menu-glyph">&lt;/&gt;</span>',
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  quote: '<b>“</b>',
  ordered: svg('<path d="M11 6h10M11 12h10M11 18h10M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
  bullet: svg('<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
  task: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
};

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const keys = (chord: string) => mac ? chord.replace('Mod+', '⌘').replace('Alt+', '⌥').replace('Shift+', '⇧') : chord.replace('Mod', 'Ctrl');

export function editorMenu(view: EditorView, host: EditorMenuHost): () => void {
  let close: (() => void) | undefined;
  const reportReason = (reason: string | null | Promise<string | null>) => {
    void Promise.resolve(reason).then(message => { if (message) host.report(message); });
  };
  const build = (): MenuEntry[] => {
    const selected = !view.state.selection.main.empty, current = currentFormat(view);
    const run = (command: () => string | null | Promise<string | null>) => () => reportReason(command());
    const line = (kind: LineKind) => run(() => toggleLines(view, kind));
    const apply = (kind: Format) => run(() => format(view, kind));
    const heading = (level: number): MenuEntry => ({ type: 'item', label: t('menu.heading', { n: level }),
      shortcut: keys(`Mod+Alt+${level}`), checked: current === `h${level}`, run: apply(`h${level}` as Format) });
    return [
      { type: 'icons', items: [
        { label: t('menu.cut'), icon: icons.cut, disabled: !selected, run: run(() => cutSelection(view)) },
        { label: t('menu.copy'), icon: icons.copy, disabled: !selected, run: run(() => copySelection(view, 'raw')) },
        { label: t('menu.paste'), icon: icons.paste, run: run(() => pasteText(view)) },
        { label: t('menu.delete'), icon: icons.delete, disabled: !selected, run: run(() => deleteSelection(view)) },
      ] },
      { type: 'item', label: t('menu.copy_paste_as'), submenu: [
        { type: 'item', label: t('menu.copy_markdown'), disabled: !selected, run: run(() => copySelection(view, 'markdown')) },
        { type: 'item', label: t('menu.copy_html'), disabled: !selected, run: run(() => copySelection(view, 'html')) },
        { type: 'item', label: t('menu.copy_unstyled'), disabled: !selected, run: run(() => copySelection(view, 'unstyled')) },
        { type: 'item', label: t('menu.copy_plain'), disabled: !selected, run: run(() => copySelection(view, 'plain')) },
        { type: 'separator' },
        { type: 'item', label: t('menu.paste_plain'), run: run(() => pasteText(view)) },
      ] },
      { type: 'separator' },
      { type: 'icons', items: [
        { label: t('menu.bold'), icon: icons.bold, run: apply('bold') },
        { label: t('menu.italic'), icon: icons.italic, run: apply('italic') },
        { label: t('menu.code'), icon: icons.code, run: apply('code') },
        { label: t('menu.link'), icon: icons.link, run: () => host.openLink() },
      ] },
      { type: 'icons', items: [
        { label: t('menu.quote'), icon: icons.quote, run: line('quote') },
        { label: t('menu.ordered_list'), icon: icons.ordered, run: line('ordered') },
        { label: t('menu.bullet_list'), icon: icons.bullet, run: line('bullet') },
        { label: t('menu.task_list'), icon: icons.task, run: line('task') },
      ] },
      { type: 'separator' },
      { type: 'item', label: t('menu.paragraph'), submenu: [
        ...[1, 2, 3, 4, 5, 6].map(heading), { type: 'separator' },
        { type: 'item', label: t('menu.paragraph'), checked: current === 'paragraph', run: apply('paragraph') },
      ] },
      { type: 'item', label: t('menu.insert'), submenu: [
        { type: 'item', label: t('menu.image'), shortcut: keys('Mod+Shift+I'), run: () => host.openImage() },
        { type: 'separator' },
        { type: 'item', label: t('menu.footnotes'), run: run(() => insertFootnote(view)) },
        { type: 'item', label: t('menu.link_reference'), run: run(() => insertLinkReference(view)) },
        { type: 'item', label: t('menu.horizontal_line'), run: run(() => insertHorizontalLine(view)) },
        { type: 'item', label: t('menu.table'), shortcut: keys('Mod+T'), run: run(() => insertTable(view)) },
        { type: 'item', label: t('menu.code_fences'), shortcut: keys('Mod+Shift+K'), run: run(() => codeBlock(view)) },
        { type: 'item', label: t('menu.math_block'), shortcut: keys('Mod+Shift+M'), run: run(() => codeBlock(view, 'math')) },
        { type: 'item', label: t('menu.toc'), run: run(() => insertTableOfContents(view)) },
        { type: 'item', label: t('menu.front_matter'), run: run(() => insertFrontMatter(view)) },
        { type: 'separator' },
        { type: 'item', label: t('menu.paragraph_before'), run: run(() => insertParagraph(view, 'before')) },
        { type: 'item', label: t('menu.paragraph_after'), run: run(() => insertParagraph(view, 'after')) },
      ] },
    ];
  };
  const open = (event: MouseEvent) => {
    if (event.defaultPrevented || !host.allowed()) return;
    event.preventDefault(); close?.();
    // A right click outside the selection moves the caret there, as Typora does.
    const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
    const { from, to } = view.state.selection.main;
    if (position !== null && (position < from || position > to)) view.dispatch({ selection: { anchor: position } });
    close = showMenu(build(), event.clientX, event.clientY, () => { close = undefined; }, t('menu.label'));
  };
  view.dom.addEventListener('contextmenu', open);
  return () => { view.dom.removeEventListener('contextmenu', open); close?.(); };
}
