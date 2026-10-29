import type { EditorView } from '@codemirror/view';
import { parseFragment } from 'parse5';
import { changeHTMLTable, htmlTableCommands } from './html-table-commands';

// Source locations let cell edits preserve the surrounding authored HTML.
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
  // Repaired or container-prefixed HTML has no reliable one-to-one source map.
  if (!cells.length || cells.length !== bounds.length || view.state.doc.sliceString(from, from + source.length) !== source) return;
  let cancel = () => {};
  const listeners: (() => void)[] = [];
  const tables = Array.from(body.querySelectorAll<HTMLTableElement>('table'));
  const selection = new Map<HTMLTableElement, number>();
  const controls: HTMLElement[] = [];
  for (const [tableIndex, table] of tables.entries()) {
    if (table.querySelector('table')) continue;
    selection.set(table, 0);
    const bar = document.createElement('div'); bar.className = 'html-table-toolbar';
    bar.dataset.htmlEditable = 'true';
    const label = document.createElement('span'); label.className = 'html-table-label'; label.textContent = 'HTML table'; bar.append(label);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'HTML table operation');
    const placeholder = document.createElement('option'); placeholder.textContent = 'Table operations…'; placeholder.value = ''; select.append(placeholder);
    for (const [command, title] of htmlTableCommands) {
      const option = document.createElement('option'); option.value = command; option.textContent = title; select.append(option);
    }
    const refresh = () => {
      for (const option of Array.from(select.options)) if (option.value) option.disabled = view.state.readOnly ||
        changeHTMLTable(source, tableIndex, selection.get(table) || 0, option.value as typeof htmlTableCommands[number][0]) === undefined;
    };
    select.addEventListener('mousedown', event => { event.stopPropagation(); refresh(); });
    select.addEventListener('focus', refresh);
    select.addEventListener('keydown', event => { event.stopPropagation(); refresh(); });
    select.addEventListener('change', () => {
      const command = select.value as typeof htmlTableCommands[number][0]; select.value = '';
      if (!command || view.state.readOnly || view.state.doc.sliceString(from, from + source.length) !== source) return;
      cancel();
      const next = changeHTMLTable(source, tableIndex, selection.get(table) || 0, command);
      if (next !== undefined && next !== source) view.dispatch({ changes: { from, to: from + source.length, insert: next }, userEvent: 'input.html-table' });
    });
    bar.append(select); table.before(bar); controls.push(bar); refresh();
  }
  const dismiss = (event: Event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    for (const table of tables) {
      const toolbar = table.previousElementSibling;
      if (table.contains(target) || toolbar?.classList.contains('html-table-toolbar') && toolbar.contains(target)) continue;
      table.querySelectorAll('.html-table-selected-cell').forEach(cell => cell.classList.remove('html-table-selected-cell'));
      if (toolbar?.contains(document.activeElement) && document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  };
  document.addEventListener('pointerdown', dismiss, true);
  document.addEventListener('mousedown', dismiss, true);
  listeners.push(() => {
    document.removeEventListener('pointerdown', dismiss, true);
    document.removeEventListener('mousedown', dismiss, true);
  });
  cells.forEach((cell, index) => {
    cell.dataset.htmlEditable = 'true';
    const table = cell.closest('table') as HTMLTableElement;
    const choose = () => {
      body.querySelectorAll('.html-table-selected-cell').forEach(node => node.classList.remove('html-table-selected-cell'));
      cell.classList.add('html-table-selected-cell');
      selection.set(table, Array.from(table.querySelectorAll('td, th')).indexOf(cell));
    };
    const start = (event: MouseEvent) => {
      if (view.state.readOnly || cell.querySelector('textarea')) return;
      event.preventDefault(); event.stopPropagation();
      cancel(); choose();
      const range = bounds[index];
      const original = source.slice(range.from, range.to);
      const input = document.createElement('textarea');
      input.className = 'html-table-cell-editor'; input.value = original;
      input.setAttribute('aria-label', 'HTML table cell content');
      const children = Array.from(cell.childNodes);
      cell.replaceChildren(input);
      let active = true;
      const finish = (save: boolean) => {
        if (!active) return;
        active = false; cancel = () => {};
        cell.replaceChildren(...children);
        if (save && input.value !== original && !view.state.readOnly &&
          view.state.doc.sliceString(from, from + source.length) === source) {
          view.dispatch({ changes: { from: from + range.from, to: from + range.to, insert: input.value },
            userEvent: 'input.html-table' });
        }
      };
      cancel = () => finish(false);
      input.addEventListener('blur', () => finish(true));
      input.addEventListener('mousedown', event => event.stopPropagation());
      input.addEventListener('keydown', event => {
        event.stopPropagation();
        if (event.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); finish(false); }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
      });
      input.focus();
    };
    const context = (event: MouseEvent) => {
      event.preventDefault(); event.stopPropagation(); cancel(); choose();
      const select = table.previousElementSibling?.querySelector('select');
      select?.focus();
    };
    cell.addEventListener('contextmenu', context);
    cell.addEventListener('mousedown', start);
    listeners.push(() => { cell.removeEventListener('mousedown', start); cell.removeEventListener('contextmenu', context); cell.classList.remove('html-table-selected-cell'); delete cell.dataset.htmlEditable; });
  });
  return () => { cancel(); listeners.forEach(remove => remove()); controls.forEach(control => control.remove()); };
}
