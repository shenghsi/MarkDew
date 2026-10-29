import { openTableResizePopover } from './table-resize-popover';
import type { EditorView } from '@codemirror/view';
import { isolateHistory, undo, redo } from '@codemirror/commands';
import DOMPurify from 'dompurify';
import { parseFragment } from 'parse5';
import { gridSvg, alignLeftSvg, alignCenterSvg, alignRightSvg, trashSvg } from './table-toolbar-icons';
import { showMenu, type MenuEntry } from './context-menu';
import { changeHTMLTable, htmlTableCommands, type HTMLTableCommand, htmlTableSize, resizeHTMLTable } from './html-table-commands';

const resumeCell = new WeakMap<EditorView, { from: number; index: number }>();
const cleanContent = (html: string) => DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'span', 'code', 'pre',
    'sup', 'sub', 'kbd', 'small', 'mark', 'abbr', 'blockquote', 'ul', 'ol', 'li',
    'samp', 'var', 'cite', 'q', 'time', 'wbr', 'a', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'dt', 'dd', 'hr', 'figure', 'figcaption',
    'details', 'summary', 'center', 'font'],
  ALLOWED_ATTR: ['dir', 'lang', 'title', 'align', 'color', 'face', 'size', 'open', 'start'], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
});

// Source locations keep cell changes separate from the surrounding authored HTML.
export function mountHTMLTableEdit(body: HTMLElement, view: EditorView, from: number, source: string) {
  const fragment = parseFragment(source, { sourceCodeLocationInfo: true });
  const bounds: { from: number; to: number }[] = [];
  function visit(node: any) {
    if (node.tagName === 'td' || node.tagName === 'th') {
      const location = node.sourceCodeLocation;
      if (!location?.startTag || !location.endTag) return;
      bounds.push({ from: location.startTag.endOffset, to: location.endTag.startOffset });
    }
    for (const child of node.childNodes || []) visit(child);
  }
  visit(fragment);
  const cells = Array.from(body.querySelectorAll<HTMLElement>('td, th'));
  if (!cells.length || cells.length !== bounds.length || view.state.doc.sliceString(from, from + source.length) !== source) return;
  let alive = true;
  let active: { cell: HTMLElement; index: number; html: string } | undefined;
  let closeMenu: (() => void) | undefined;
  let menu: HTMLElement | undefined;
  let resizePopover: ReturnType<typeof openTableResizePopover> | undefined;
  const listeners: (() => void)[] = [];
  const controls: HTMLElement[] = [];
  const tables = Array.from(body.querySelectorAll<HTMLTableElement>('table'));
  const current = () => alive && !view.state.readOnly && view.state.doc.sliceString(from, from + source.length) === source;
  const dispatch = (changes: { from: number; to: number; insert: string }) => {
    view.dispatch({ changes, annotations: isolateHistory.of('full'), userEvent: 'input.html-table' });
  };
  const finish = (save: boolean) => {
    if (!active) return false;
    const edit = active; active = undefined;
    const html = edit.cell.innerHTML;
    edit.cell.removeAttribute('contenteditable'); edit.cell.removeAttribute('aria-label');
    if (!save) edit.cell.innerHTML = edit.html;
    if (save && html !== edit.html && current()) {
      const range = bounds[edit.index];
      dispatch({ from: from + range.from, to: from + range.to, insert: cleanContent(html) });
      return true;
    }
    return false;
  };
  const operationSource = () => {
    if (!active || active.cell.innerHTML === active.html) return source;
    const range = bounds[active.index];
    return source.slice(0, range.from) + cleanContent(active.cell.innerHTML) + source.slice(range.to);
  };
  const run = (tableIndex: number, cellIndex: number, command: HTMLTableCommand) => {
    if (!current()) return;
    const next = changeHTMLTable(operationSource(), tableIndex, cellIndex, command);
    if (next === undefined) return;
    finish(false);
    if (next !== source) dispatch({ from, to: from + source.length, insert: next });
  };
  const entries = (tableIndex: number, cellIndex: number, global: boolean): MenuEntry[] =>
    htmlTableCommands.filter(([command]) => (command === 'delete-table') === global).map(([command, label]) => ({
      type: 'item', label, disabled: !current() || changeHTMLTable(operationSource(), tableIndex, cellIndex, command) === undefined,
      run: () => run(tableIndex, cellIndex, command),
    }));
  const openMenu = (items: MenuEntry[], x: number, y: number) => {
    closeMenu?.();
    closeMenu = showMenu(items, x, y, () => { closeMenu = undefined; menu = undefined; }, 'HTML table operations');
    menu = document.body.lastElementChild as HTMLElement;
  };
  for (const [index, table] of tables.entries()) {
    if (table.querySelector('table')) continue;
    const bar = document.createElement('div'); bar.className = 'html-table-toolbar'; bar.dataset.htmlEditable = 'true';
    const label = document.createElement('span'); label.className = 'html-table-label'; label.textContent = 'HTML table';
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'HTML table toolbar');
    const left = document.createElement('div'); left.className = 'table-bar-group';
    const right = document.createElement('div'); right.className = 'table-bar-group';
    const button = (title: string, icon: string, action: () => void, extra = '') => {
      const element = document.createElement('button'); element.type = 'button'; element.className = `table-bar-btn ${extra}`;
      element.title = title; element.setAttribute('aria-label', title); element.innerHTML = icon;
      element.disabled = view.state.readOnly;
      element.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); action(); });
      return element;
    };
    const resize = () => {
      if (resizePopover) { resizePopover.close(); return; }
      const size = htmlTableSize(operationSource(), index); if (!size) return;
      resizePopover = openTableResizePopover({
        anchor: resizeButton, columns: size.columns, rows: size.rows,
        minRows: 1, maxRows: 50, maxColumns: 50,
        apply: (columns, rows) => {
          if (!current()) return;
          const next = resizeHTMLTable(operationSource(), index, rows, columns);
          if (next === undefined) return;
          finish(false);
          if (next !== source) dispatch({ from, to: from + source.length, insert: next });
        },
        onClose: () => { resizePopover = undefined; },
      });
    };
    const resizeButton = button('Resize table', gridSvg, resize);
    left.append(resizeButton);
    for (const [alignment, icon] of [['left', alignLeftSvg], ['center', alignCenterSvg], ['right', alignRightSvg]] as const)
      left.append(button(`Align table ${alignment}`, icon, () => run(index, 0, `align-table-${alignment}`)));
    right.append(label, button('Delete table', trashSvg, () => run(index, 0, 'delete-table'), 'table-bar-delete'));
    bar.addEventListener('mousedown', event => {
      if (!(event.target instanceof HTMLInputElement)) event.preventDefault(); event.stopPropagation();
    });
    bar.append(left, right); table.before(bar); controls.push(bar);
  }
  const choose = (cell: HTMLElement) => {
    body.querySelectorAll('.html-table-selected-cell').forEach(node => node.classList.remove('html-table-selected-cell'));
    cell.classList.add('html-table-selected-cell');
  };
  const start = (cell: HTMLElement, index: number) => {
    if (!current() || active?.cell === cell) return;
    if (active) {
      resumeCell.set(view, { from, index });
      if (finish(true)) return;
      resumeCell.delete(view);
    }
    choose(cell);
    active = { cell, index, html: cell.innerHTML };
    cell.setAttribute('contenteditable', 'true'); cell.setAttribute('aria-label', 'HTML table cell content');
    cell.focus();
  };
  cells.forEach((cell, index) => {
    cell.dataset.htmlEditable = 'true';
    const on = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void) => {
      cell.addEventListener(type, handler); listeners.push(() => cell.removeEventListener(type, handler));
    };
    on('mousedown', event => { event.stopPropagation(); if (event.button === 0) start(cell, index); });
    on('contextmenu', event => {
      event.preventDefault(); event.stopPropagation(); choose(cell);
      const table = cell.closest('table') as HTMLTableElement;
      openMenu(entries(tables.indexOf(table), Array.from(table.querySelectorAll('td, th')).indexOf(cell), false), event.clientX, event.clientY);
    });
    on('blur', event => {
      if (event.relatedTarget instanceof Node && (resizePopover?.element.contains(event.relatedTarget) || controls.some(bar => bar.contains(event.relatedTarget as Node)))) return;
      if (alive && active?.cell === cell) finish(true);
    });
    on('keydown', event => {
      event.stopPropagation();
      if (event.isComposing) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && !event.altKey && (key === 'z' || key === 'y')) {
        event.preventDefault();
        if (event.repeat || view.state.readOnly) return;
        finish(true);
        (key === 'y' || event.shiftKey ? redo : undo)(view);
        view.focus(); return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); finish(true); document.getElementById(event.shiftKey ? 'save-as' : 'save')?.click(); return;
      }
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
    });
    for (const name of ['beforeinput', 'input', 'compositionstart', 'compositionend'] as const) on(name, event => event.stopPropagation());
    on('paste', event => {
      event.preventDefault(); event.stopPropagation();
      const selection = window.getSelection();
      if (!selection?.rangeCount || !cell.contains(selection.anchorNode) || !cell.contains(selection.focusNode)) return;
      const range = selection.getRangeAt(0); range.deleteContents();
      const text = document.createTextNode(event.clipboardData?.getData('text/plain') || '');
      range.insertNode(text); range.setStartAfter(text); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    });
    on('drop', event => { event.preventDefault(); event.stopPropagation(); });
    listeners.push(() => { cell.classList.remove('html-table-selected-cell'); delete cell.dataset.htmlEditable; });
  });
  const dismiss = (event: Event) => {
    if (!(event.target instanceof Node) || menu?.contains(event.target) || resizePopover?.element.contains(event.target)) return;
    if (!tables.some(table => table.contains(event.target as Node) || table.previousElementSibling?.contains(event.target as Node))) {
      closeMenu?.(); resizePopover?.close(); finish(true);
      body.querySelectorAll('.html-table-selected-cell').forEach(cell => cell.classList.remove('html-table-selected-cell'));
      if (controls.some(bar => bar.contains(document.activeElement)) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  };
  document.addEventListener('pointerdown', dismiss, true); document.addEventListener('mousedown', dismiss, true);
  const resume = resumeCell.get(view);
  if (resume?.from === from) { resumeCell.delete(view); if (cells[resume.index]) start(cells[resume.index], resume.index); }
  return () => {
    alive = false; closeMenu?.(); resizePopover?.close(); finish(false);
    document.removeEventListener('pointerdown', dismiss, true); document.removeEventListener('mousedown', dismiss, true);
    listeners.forEach(remove => remove()); controls.forEach(control => control.remove());
  };
}
