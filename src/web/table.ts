import { openTableResizePopover } from './table-resize-popover';
import { gridSvg, alignLeftSvg, alignCenterSvg, alignRightSvg, trashSvg } from './table-toolbar-icons';
import { ChangeDesc, EditorSelection, EditorState, Facet, StateEffect, StateField, Transaction } from '@codemirror/state';
import { EditorView, keymap, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { textDirection } from './text-direction';
import { defaultKeymap, invertedEffects, isolateHistory, redo, undo } from '@codemirror/commands';
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';
import { documentImageEnvironment, tableProjection } from './renderers';
import { imageDocument, imagePath, mountImage, setImagePath } from './images';
import { mountFormula } from './math-preview';
import { mountCellHTML } from './cell-html';
import { clipboardImageFiles, imagePasteMessage, imagePasteGuard, imagePastePolicy, clipboardVersion, clipboardRequest, clipboardRaster, readClipboardRaster, readClipboardBytes, clipboardSourceLimit } from './clipboard';
import { sourceField, savedSource, sourceOffset } from './source';
import { cellImageRange, cellPasteContext } from './table-paste';
import { Cell, tableCells, editableTableCells } from './table-ranges';
import { findTable, tablePlan, tableContainerSupported, TableCommand } from './table-commands';
import { clickOffsetInNode } from './dom-coords';
import { t } from './i18n';
export { tableCells } from './table-ranges';

export const tableImageVersion = StateField.define<number>({
  create: () => 0,
  update: (version, transaction) => version + (transaction.docChanged ||
    transaction.effects.some(effect => effect.is(setImagePath)) ||
    transaction.startState.field(imagePath, false) !== transaction.state.field(imagePath, false) ||
    transaction.startState.facet(imageDocument) !== transaction.state.facet(imageDocument) ? 1 : 0),
});
function imageEnvironment(state: EditorState, source: string) {
  if (!source.includes('[')) return {};
  const bodyFrom = syntaxTree(state).topNode.getChild('Frontmatter')?.to || 0;
  return documentImageEnvironment(state.doc, bodyFrom);
}

interface ActiveCell { from: number; to: number; row: number; column: number; cellFrom: number; cellTo: number; anchor?: number; head?: number }
function mapCell(active: ActiveCell, changes: ChangeDesc): ActiveCell {
  const cellFrom = changes.mapPos(active.cellFrom, -1);
  return { ...active, from: changes.mapPos(active.from, -1), to: changes.mapPos(active.to, 1),
    cellFrom, cellTo: changes.mapPos(active.cellTo, 1),
    ...(active.anchor === undefined ? {} : { anchor: changes.mapPos(active.cellFrom + active.anchor) - cellFrom }),
    ...(active.head === undefined ? {} : { head: changes.mapPos(active.cellFrom + active.head) - cellFrom }) };
}
export const tableCellEffect = StateEffect.define<ActiveCell | null>({ map: (active, changes) => active ? mapCell(active, changes) : null });
export const tableSaveCommand = Facet.define<() => void, (() => void) | undefined>({ combine: values => values[0] });
export const tableFindCommand = Facet.define<() => void, (() => void) | undefined>({ combine: values => values[0] });
export const tableCellField: StateField<ActiveCell | null> = StateField.define<ActiveCell | null>({
  create: () => null,
  update(active, transaction) {
    if (active && transaction.docChanged && !transaction.isUserEvent('input.table')) {
      const oldTable = findTable(transaction.startState, active.from), nodes: SyntaxNode[] = [];
      for (let node = oldTable?.firstChild; node; node = node.nextSibling)
        if (node.name === 'TableHeader' || node.name === 'TableRow') nodes.push(node);
      const row = nodes[active.row];
      transaction.changes.iterChangedRanges((from, to) => {
        if (row && to > from && from <= row.from && to >= row.to) active = null;
      });
    }
    if (active && transaction.docChanged) active = mapCell(active, transaction.changes);
    for (const effect of transaction.effects) if (effect.is(tableCellEffect)) active = effect.value;
    if (active && transaction.docChanged) {
      const node = syntaxTree(transaction.state).resolveInner(active.from, 1);
      let table: SyntaxNode | null = node;
      while (table && table.name !== 'Table') table = table.parent;
      if (!table || table.from !== active.from || table.to !== active.to) return null;
      const cell = editableTableCells(table, (from, to) => transaction.state.doc.sliceString(from, to))[active.row]?.[active.column];
      if (cell?.virtual) return { ...active, cellFrom: cell.from, cellTo: cell.to };
      if (!cell || active.cellFrom < cell.slotFrom! || active.cellTo > cell.slotTo!) return null;
    }
    return active;
  },
  provide: () => invertedEffects.of(transaction => {
    const active = transaction.startState.field(tableCellField, false);
    return transaction.docChanged && active !== undefined ? [tableCellEffect.of(active)] : [];
  }),
});

export function escapeCellPipes(text: string): string {
  let result = '', slashes = 0;
  for (const character of text) {
    if (character === '|' && slashes % 2 === 0) result += '\\';
    result += character;
    slashes = character === '\\' ? slashes + 1 : 0;
  }
  return result;
}

const controllers = new WeakMap<HTMLElement, TableEditor>();
const activeEditors = new WeakMap<EditorView, TableEditor>();
let toolsID = 0;
export const tableComposing = (view: EditorView) => activeEditors.get(view)?.child?.compositionStarted || false;
export const tableInputView = (view: EditorView) => activeEditors.get(view)?.child;
export const tableEditor = (dom: HTMLElement) => controllers.get(dom);
export function tableHistoryCommand(view: EditorView, command: (view: EditorView) => boolean): boolean {
  if (view.compositionStarted || tableComposing(view)) return true;
  const state = view.state;
  command(view);
  // An empty history command has no transaction to trigger deferred restoration.
  // Changed history can retain an old controller until that restoration runs.
  const child = view.state === state ? tableInputView(view) : undefined;
  if (child) child.focus(); else view.focus();
  return true;
}
export function endTableEdit(view: EditorView): boolean {
  if (view.compositionStarted || tableComposing(view)) return false;
  activeEditors.get(view)?.finish();
  if (view.state.field(tableCellField, false)) view.dispatch({ effects: tableCellEffect.of(null) });
  return true;
}

// Widget rendering cannot dispatch outer transactions. Restore the child after
// that rendering step, and reject work captured before another state update.
export const tableHistoryView = ViewPlugin.fromClass(class {
  private alive = true;
  private generation = 0;
  private focus = false;
  private focusTarget?: Element | null;
  private scrollAttempt?: EditorState;
  private focusChanged = (event: FocusEvent) => {
    if (this.focus && event.target !== this.focusTarget && event.target !== this.view.contentDOM) this.cancelFocus();
  };
  private cancelFocus() { this.focus = false; this.focusTarget = undefined; this.scrollAttempt = undefined; }
  private onPointerDown = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.preview-table, .table-context-menu, .table-resize-popover')) {
      const active = this.view.state.field(tableCellField, false);
      if (active) endTableEdit(this.view);
    }
  };
  constructor(readonly view: EditorView) {
    document.addEventListener('focusin', this.focusChanged);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('mousedown', this.onPointerDown, true);
    this.schedule();
  }
  update(update: ViewUpdate) {
    if (update.startState.readOnly !== update.state.readOnly)
      this.view.dom.querySelectorAll<HTMLElement>('.preview-table').forEach(dom => tableEditor(dom)?.updateTools());
    if (update.startState.field(tableCellField, false) !== update.state.field(tableCellField, false)) this.scrollAttempt = undefined;
    if (update.transactions.some(transaction => transaction.isUserEvent('undo') || transaction.isUserEvent('redo'))) {
      this.focus = true; this.focusTarget = document.activeElement;
    }
    if (update.docChanged || update.viewportChanged || update.startState.field(tableCellField, false) !== update.state.field(tableCellField, false)) this.schedule();
  }
  private schedule() {
    const state = this.view.state, generation = ++this.generation;
    queueMicrotask(() => {
      if (!this.alive || generation !== this.generation || this.view.state !== state) return;
      if (this.view.compositionStarted || tableComposing(this.view)) { this.cancelFocus(); return; }
      if (this.focus && document.activeElement !== this.focusTarget && document.activeElement !== document.body
        && document.activeElement !== this.view.contentDOM) this.cancelFocus();
      const active = state.field(tableCellField, false), old = activeEditors.get(this.view);
      if (!active) { old?.finish(false, true); if (this.focus) this.view.focus(); this.cancelFocus(); return; }
      const dom = this.view.dom.querySelector<HTMLElement>(`.preview-table[data-from="${active.from}"]`);
      const controller = dom && tableEditor(dom);
      if (!controller) {
        if (this.focus && this.scrollAttempt !== state) {
          // This is a presentation effect only. It creates no history edit.
          this.view.dispatch({ effects: EditorView.scrollIntoView(active.from), annotations: Transaction.addToHistory.of(false) });
          this.scrollAttempt = this.view.state;
        }
        return;
      }
      if (old && old !== controller) old.finish(false, true);
      const child = controller.restore(active);
      if (child && this.focus) child.focus();
      this.cancelFocus();
    });
  }
  destroy() {
    this.alive = false;
    this.generation++;
    this.cancelFocus();
    document.removeEventListener('focusin', this.focusChanged);
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('mousedown', this.onPointerDown, true);
  }
});

export class TableEditor {
  child?: EditorView;
  private row = 0;
  private column = 0;
  private syncing = false;
  private cells: Cell[][] = [];
  private source = '';
  private from = 0;
  private to = 0;
  private tools?: HTMLElement;
  private toolsToggle?: HTMLButtonElement;
  private floatingBar?: HTMLElement;
  private resizeBtn?: HTMLButtonElement;
  private alignLeftBtn?: HTMLButtonElement;
  private alignCenterBtn?: HTMLButtonElement;
  private alignRightBtn?: HTMLButtonElement;
  private activeResizePopover: ReturnType<typeof openTableResizePopover> | null = null;
  private activeContextMenu: HTMLElement | null = null;

  private setTools(open: boolean) {
    if (!this.tools || !this.toolsToggle || this.tools.hidden === !open) return;
    const focus = !open && this.tools.contains(document.activeElement);
    this.tools.hidden = !open; this.toolsToggle.setAttribute('aria-expanded', String(open));
    if (focus) this.toolsToggle.focus();
    this.outer.requestMeasure();
  }
  private results = new Map<HTMLElement, (() => void)[]>();
  private releaseResults(cell?: HTMLElement) {
    for (const [target, disposers] of this.results) if (!cell || cell === target) {
      disposers.forEach(dispose => dispose()); this.results.delete(target);
    }
  }
  private closeContextMenu() {
    if (this.activeContextMenu) { this.activeContextMenu.remove(); this.activeContextMenu = null; }
  }
  private closeResizePopover() {
    this.activeResizePopover?.close(); this.activeResizePopover = null;
  }

  currentAlignment(): 'left' | 'center' | 'right' {
    const table = findTable(this.outer.state, this.from);
    if (!table) return 'left';
    for (let node = table.firstChild; node; node = node.nextSibling) {
      if (node.name === 'TableDelimiter') {
        const source = this.outer.state.doc.sliceString(node.from, node.to);
        const slots: string[] = [];
        let start = 0;
        for (let offset = 0; offset <= source.length; offset++) {
          if (offset !== source.length && source[offset] !== '|') continue;
          if (offset > start) {
            const text = source.slice(start, offset).trim();
            if (text) slots.push(text);
          }
          start = offset + 1;
        }
        const token = slots[this.column];
        if (token?.startsWith(':') && token?.endsWith(':')) return 'center';
        if (token?.endsWith(':')) return 'right';
        return 'left';
      }
    }
    return 'left';
  }

  updateFloatingBar() {
    if (!this.floatingBar) return;
    const align = this.currentAlignment();
    this.alignLeftBtn?.classList.toggle('active', align === 'left');
    this.alignCenterBtn?.classList.toggle('active', align === 'center');
    this.alignRightBtn?.classList.toggle('active', align === 'right');
    this.alignLeftBtn?.setAttribute('aria-pressed', String(align === 'left'));
    this.alignCenterBtn?.setAttribute('aria-pressed', String(align === 'center'));
    this.alignRightBtn?.setAttribute('aria-pressed', String(align === 'right'));
  }

  toggleResizePopover() {
    if (this.activeResizePopover) { this.closeResizePopover(); return; }
    if (!this.resizeBtn) return;
    this.activeResizePopover = openTableResizePopover({
      anchor: this.resizeBtn, columns: this.cells[0]?.length || 2, rows: this.cells.length || 2,
      minRows: 2, maxRows: 50, maxColumns: 30,
      apply: (columns, rows) => { this.resizeTable(columns, rows); },
      onClose: () => { this.activeResizePopover = null; },
    });
  }

  resizeTable(targetCols: number, targetRows: number): boolean {
    if (this.outer.state.readOnly) return false;
    targetCols = Math.max(1, Math.min(30, targetCols));
    targetRows = Math.max(2, Math.min(100, targetRows));
    const table = findTable(this.outer.state, this.from);
    if (!table) return false;

    const read = (a: number, b: number) => this.outer.state.doc.sliceString(a, b);
    const cells = tableCells(table, read);

    let delimiterNode: SyntaxNode | null = null;
    for (let node = table.firstChild; node; node = node.nextSibling) {
      if (node.name === 'TableDelimiter') { delimiterNode = node; break; }
    }
    const delimTokens: string[] = [];
    if (delimiterNode) {
      const delimSource = read(delimiterNode.from, delimiterNode.to);
      const matches = delimSource.match(/:?-+:?/g);
      if (matches) delimTokens.push(...matches);
    }

    const firstLine = this.outer.state.doc.lineAt(table.from);
    const linePrefix = this.outer.state.doc.sliceString(firstLine.from, table.from);

    const oldHeader = cells[0] || [];
    const newHeader: string[] = [];
    for (let c = 0; c < targetCols; c++) {
      const text = c < oldHeader.length ? read(oldHeader[c].from, oldHeader[c].to).trim() : `Column ${c + 1}`;
      newHeader.push(text || `Column ${c + 1}`);
    }

    const newDelim: string[] = [];
    for (let c = 0; c < targetCols; c++) {
      newDelim.push(c < delimTokens.length ? delimTokens[c] : '---');
    }

    const newDataRows: string[][] = [];
    const oldDataRows = cells.slice(1);
    const targetDataRowCount = targetRows - 1;

    for (let r = 0; r < targetDataRowCount; r++) {
      const oldRow = oldDataRows[r];
      const rowCells: string[] = [];
      for (let c = 0; c < targetCols; c++) {
        const text = oldRow && c < oldRow.length ? read(oldRow[c].from, oldRow[c].to).trim() : '';
        rowCells.push(text);
      }
      newDataRows.push(rowCells);
    }

    const lines: string[] = [];
    lines.push('| ' + newHeader.join(' | ') + ' |');
    lines.push(linePrefix + '| ' + newDelim.join(' | ') + ' |');
    for (const dataRow of newDataRows) {
      lines.push(linePrefix + '| ' + dataRow.join(' | ') + ' |');
    }

    const newTableSource = lines.join('\n');
    this.finish(false, true);

    const transaction = this.outer.state.update({
      changes: { from: table.from, to: table.to, insert: newTableSource },
      effects: [EditorView.scrollIntoView(table.from)],
      userEvent: 'input.table.resize',
      annotations: isolateHistory.of('full')
    });
    this.outer.dispatch(transaction);
    return true;
  }

  prettifyTable(): boolean {
    if (this.outer.state.readOnly) return false;
    const table = findTable(this.outer.state, this.from);
    if (!table) return false;

    const read = (a: number, b: number) => this.outer.state.doc.sliceString(a, b);
    const cells = tableCells(table, read);
    if (!cells.length) return false;

    let delimiterNode: SyntaxNode | null = null;
    for (let node = table.firstChild; node; node = node.nextSibling) {
      if (node.name === 'TableDelimiter') { delimiterNode = node; break; }
    }
    const delimTokens: string[] = [];
    if (delimiterNode) {
      const delimSource = read(delimiterNode.from, delimiterNode.to);
      const matches = delimSource.match(/:?-+:?/g);
      if (matches) delimTokens.push(...matches);
    }

    const colCount = cells[0].length;
    const colWidths: number[] = [];
    for (let c = 0; c < colCount; c++) {
      let maxW = 3;
      for (const row of cells) {
        if (row[c]) {
          const len = read(row[c].from, row[c].to).trim().length;
          if (len > maxW) maxW = len;
        }
      }
      colWidths.push(maxW);
    }

    const formatDelim = (token: string | undefined, width: number) => {
      const isCenter = token?.startsWith(':') && token?.endsWith(':');
      const isRight = !isCenter && token?.endsWith(':');
      const isLeft = !isCenter && token?.startsWith(':');
      if (isCenter) return `:${'-'.repeat(Math.max(1, width - 2))}:`;
      if (isRight) return `${'-'.repeat(Math.max(2, width - 1))}:`;
      if (isLeft) return `:${'-'.repeat(Math.max(2, width - 1))}`;
      return '-'.repeat(width);
    };

    const formatCell = (text: string, width: number, token: string | undefined) => {
      const isCenter = token?.startsWith(':') && token?.endsWith(':');
      const isRight = !isCenter && token?.endsWith(':');
      if (isRight) return text.padStart(width, ' ');
      if (isCenter) {
        const totalPad = width - text.length;
        const padLeft = Math.floor(totalPad / 2);
        const padRight = totalPad - padLeft;
        return ' '.repeat(padLeft) + text + ' '.repeat(padRight);
      }
      return text.padEnd(width, ' ');
    };

    const firstLine = this.outer.state.doc.lineAt(table.from);
    const linePrefix = this.outer.state.doc.sliceString(firstLine.from, table.from);

    const lines: string[] = [];
    const headerCells = cells[0].map((cell, c) => formatCell(read(cell.from, cell.to).trim(), colWidths[c], delimTokens[c]));
    lines.push('| ' + headerCells.join(' | ') + ' |');

    const delimCells = colWidths.map((w, c) => formatDelim(delimTokens[c], w));
    lines.push(linePrefix + '| ' + delimCells.join(' | ') + ' |');

    for (let r = 1; r < cells.length; r++) {
      const rowCells = cells[r].map((cell, c) => formatCell(read(cell.from, cell.to).trim(), colWidths[c], delimTokens[c]));
      lines.push(linePrefix + '| ' + rowCells.join(' | ') + ' |');
    }

    const prettified = lines.join('\n');
    this.finish(false, true);
    this.outer.dispatch({
      changes: { from: table.from, to: table.to, insert: prettified },
      userEvent: 'input.table.prettify',
      annotations: isolateHistory.of('full')
    });
    return true;
  }

  deleteTable(): boolean {
    if (this.outer.state.readOnly) return false;
    const table = findTable(this.outer.state, this.from);
    if (!table) return false;
    const line = this.outer.state.doc.lineAt(table.from);
    const endLine = this.outer.state.doc.lineAt(table.to);
    const from = line.from;
    const to = Math.min(endLine.to + 1, this.outer.state.doc.length);
    this.finish(false, true);
    this.outer.dispatch({
      changes: { from, to, insert: '' },
      selection: { anchor: from },
      scrollIntoView: true,
      userEvent: 'delete.table',
      annotations: isolateHistory.of('full')
    });
    this.outer.focus();
    return true;
  }

  copyTable() {
    const table = findTable(this.outer.state, this.from);
    if (!table) return;
    const text = this.outer.state.doc.sliceString(table.from, table.to);
    void navigator.clipboard.writeText(text);
  }

  constructor(readonly dom: HTMLElement, readonly outer: EditorView,
    from: number, to: number, source: string) {
    this.refresh(from, to, source);

    // Floating toolbar above table (shown when editing a cell in this table)
    const floatingBar = this.floatingBar = document.createElement('div');
    floatingBar.className = 'table-floating-bar';
    floatingBar.hidden = true;
    floatingBar.setAttribute('role', 'toolbar');
    floatingBar.setAttribute('aria-label', 'Table toolbar');

    const leftGroup = document.createElement('div');
    leftGroup.className = 'table-bar-group';

    const createBtn = (cls: string, title: string, svg: string, onClick: () => void) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `table-bar-btn ${cls}`;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.innerHTML = svg;
      btn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onClick(); });
      return btn;
    };







    const resizeBtn = this.resizeBtn = createBtn('table-bar-resize', 'Resize table', gridSvg, () => this.toggleResizePopover());
    const alignLeftBtn = this.alignLeftBtn = createBtn('table-bar-align-left', 'Align left', alignLeftSvg, () => this.command('align-left'));
    const alignCenterBtn = this.alignCenterBtn = createBtn('table-bar-align-center', 'Align center', alignCenterSvg, () => this.command('align-center'));
    const alignRightBtn = this.alignRightBtn = createBtn('table-bar-align-right', 'Align right', alignRightSvg, () => this.command('align-right'));
    leftGroup.append(resizeBtn, alignLeftBtn, alignCenterBtn, alignRightBtn);

    const rightGroup = document.createElement('div');
    rightGroup.className = 'table-bar-group table-bar-right';
    const deleteBtn = createBtn('table-bar-delete', 'Delete table', trashSvg, () => this.deleteTable());
    rightGroup.append(deleteBtn);

    floatingBar.append(leftGroup, rightGroup);
    dom.prepend(floatingBar);

    // Retain legacy elements in DOM for backward test compatibility
    const caption = document.createElement('button'); caption.className = 'preview-caption table-source';
    caption.textContent = 'Table source'; caption.type = 'button';
    caption.addEventListener('mousedown', event => {
      event.preventDefault(); event.stopPropagation();
    });
    caption.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (tableComposing(outer) || outer.compositionStarted) return;
      if (outer.state.readOnly) return;
      this.finish(); outer.dispatch({ selection: { anchor: this.from }, scrollIntoView: true }); outer.focus();
    });
    const actions = document.createElement('div'); actions.className = 'table-actions'; actions.append(caption); dom.append(actions);
    this.tools = document.createElement('div'); this.tools.className = 'table-tools';
    this.tools.id = `table-tools-${++toolsID}`; this.tools.hidden = true;
    this.tools.setAttribute('role', 'group'); this.tools.setAttribute('aria-label', 'Table structure');
    const toggle = this.toolsToggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'preview-caption'; toggle.textContent = 'Table tools';
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', this.tools.id); actions.append(toggle);
    toggle.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); });
    toggle.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (!outer.compositionStarted && !tableComposing(outer)) this.setTools(this.tools!.hidden);
    });
    this.tools.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || outer.compositionStarted || tableComposing(outer)) return;
      event.preventDefault(); event.stopPropagation(); this.setTools(false);
    });
    const commands: [TableCommand, string][] = [
      ['row-above', 'Row above'], ['row-below', 'Row below'], ['delete-row', 'Delete row'],
      ['column-left', 'Column left'], ['column-right', 'Column right'], ['delete-column', 'Delete column'],
      ['align-left', 'Align left'], ['align-center', 'Align center'], ['align-right', 'Align right'],
    ];
    for (const [command, label] of commands) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.dataset.command = command;
      button.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); });
      button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); this.command(command); });
      this.tools.append(button);
    }
    dom.append(this.tools); this.updateTools();
    dom.addEventListener('mousedown', event => {
      const cell = (event.target as HTMLElement).closest('th, td');
      if (!cell) return;
      event.stopPropagation();
      if (this.child && this.child.dom.contains(event.target as Node)) return;
      event.preventDefault();
      const mouse = event as MouseEvent;
      const row = Number((cell as HTMLElement).dataset.row), column = Number((cell as HTMLElement).dataset.column);
      this.begin(row, column, { x: mouse.clientX, y: mouse.clientY });
    });
    dom.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.target instanceof HTMLElement && event.target.matches('th, td') && event.key === 'Enter') {
        event.preventDefault(); this.begin(Number(event.target.dataset.row), Number(event.target.dataset.column));
      }
    });
    dom.addEventListener('contextmenu', event => {
      const cell = (event.target as HTMLElement).closest('th, td');
      if (!cell) return;
      event.preventDefault();
      event.stopPropagation();
      this.closeContextMenu();
      const row = Number((cell as HTMLElement).dataset.row), column = Number((cell as HTMLElement).dataset.column);
      this.begin(row, column);
      const isMac = typeof navigator !== 'undefined' && (/Mac|iPod|iPhone|iPad/.test(navigator.platform) || (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform === 'macOS');
      const menu = document.createElement('div');
      menu.className = 'table-context-menu';
      const items: ({ label: string; shortcut?: string; cmd?: TableCommand; action?: () => void; disabled?: boolean; separator?: boolean })[] = [
        { label: t('table.row_above'), cmd: 'row-above', disabled: row === 0 },
        { label: t('table.row_below'), shortcut: isMac ? '⌘↩' : 'Ctrl+Enter', cmd: 'row-below' },
        { separator: true, label: '' },
        { label: t('table.column_before'), cmd: 'column-left' },
        { label: t('table.column_after'), cmd: 'column-right' },
        { separator: true, label: '' },
        { label: t('table.delete_row'), shortcut: isMac ? '⇧⌘⌫' : '⇧Ctrl⌫', cmd: 'delete-row', disabled: row === 0 },
        { label: t('table.delete_column'), cmd: 'delete-column', disabled: (this.cells[0]?.length || 0) <= 1 },
        { separator: true, label: '' },
        { label: t('table.copy_table'), action: () => this.copyTable() },
        { label: t('table.prettify_source'), action: () => this.prettifyTable() },
        { separator: true, label: '' },
        { label: t('table.delete_table'), action: () => this.deleteTable() },
      ];
      for (const item of items) {
        if (item.separator) {
          const sep = document.createElement('div');
          sep.className = 'table-context-separator';
          menu.append(sep);
          continue;
        }
        const menuItem = document.createElement('button');
        menuItem.type = 'button';
        menuItem.className = 'table-context-item';
        if (item.disabled) menuItem.disabled = true;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'table-context-label';
        labelSpan.textContent = item.label;
        menuItem.append(labelSpan);

        if (item.shortcut) {
          const shortcutSpan = document.createElement('span');
          shortcutSpan.className = 'table-context-shortcut';
          shortcutSpan.textContent = item.shortcut;
          menuItem.append(shortcutSpan);
        }

        menuItem.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
        menuItem.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this.closeContextMenu();
          if (item.cmd) this.command(item.cmd);
          else if (item.action) item.action();
        });
        menu.append(menuItem);
      }
      menu.style.position = 'fixed';
      menu.style.left = `${Math.min(event.clientX, window.innerWidth - 220)}px`;
      menu.style.top = `${Math.min(event.clientY, window.innerHeight - 340)}px`;
      menu.style.zIndex = '1000';
      document.body.append(menu);
      this.activeContextMenu = menu;
      const dismiss = (e: Event) => {
        if (!menu.contains(e.target as Node)) {
          this.closeContextMenu();
          window.removeEventListener('pointerdown', dismiss, true);
          window.removeEventListener('keydown', onKey, true);
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.closeContextMenu();
          window.removeEventListener('pointerdown', dismiss, true);
          window.removeEventListener('keydown', onKey, true);
        }
      };
      window.addEventListener('pointerdown', dismiss, true);
      window.addEventListener('keydown', onKey, true);
    });
    controllers.set(dom, this);
  }
  refresh(from: number, to: number, source: string): boolean {
    this.from = from; this.to = to; this.source = source;
    const node = syntaxTree(this.outer.state).resolveInner(from, 1);
    let table: SyntaxNode | null = node;
    while (table && table.name !== 'Table') table = table.parent;
    if (!table) return false;
    this.cells = editableTableCells(table, (a, b) => this.outer.state.doc.sliceString(a, b));
    const active = this.outer.state.field(tableCellField, false);
    const owns = active?.from === from && active.to === to;
    if (this.child && (!owns || active!.row !== this.row || active!.column !== this.column)) return false;
    if (owns && this.cells[active!.row]?.[active!.column]) {
      const active = this.outer.state.field(tableCellField)!;
      this.cells[active.row][active.column] = { ...this.cells[active.row][active.column],
        from: active.cellFrom, to: active.cellTo };
    }
    // The widget starts at the table node, inside any container prefix. Render
    // row nodes without those prefixes; source patches still use exact ranges.
    const renderRows: string[] = [];
    for (let row = table.firstChild; row; row = row.nextSibling)
      if (row.name === 'TableHeader' || row.name === 'TableDelimiter' || row.name === 'TableRow')
        renderRows.push(this.outer.state.doc.sliceString(row.from, row.to));
    const renderSource = renderRows.join('\n');
    const projection = tableProjection(renderSource, imageEnvironment(this.outer.state, renderSource),
      this.outer.state.field(imagePath, false) || '', this.outer.state.facet(imageDocument));
    const fresh = document.createElement('div'); fresh.innerHTML = projection.html;
    const old = this.dom.querySelector('table'), next = fresh.querySelector('table');
    if (!next) return false;
    const oldRows = old?.querySelectorAll('tr'), newRows = next.querySelectorAll('tr');
    if (this.child && (!oldRows || oldRows.length !== newRows.length ||
      Array.from(newRows).some((row, index) => row.children.length !== oldRows[index].children.length) ||
      !this.cells[this.row]?.[this.column])) return false;
    if (this.child && old) {
      newRows.forEach((row, r) => Array.from(row.children).forEach((cell, c) => {
        if (r !== this.row || c !== this.column) {
          const target = oldRows![r].children[c] as HTMLElement;
          this.releaseResults(target); target.innerHTML = cell.innerHTML;
        }
      }));
      const range = this.cells[this.row][this.column];
      const text = this.outer.state.doc.sliceString(range.from, range.to);
      const selection = EditorSelection.single(Math.max(0, Math.min(active?.anchor ?? this.child.state.selection.main.anchor, text.length)),
        Math.max(0, Math.min(active?.head ?? this.child.state.selection.main.head, text.length)));
      if (text !== this.child.state.doc.toString() || !selection.eq(this.child.state.selection)) {
        this.syncing = true;
        try { this.child.dispatch({ changes: { from: 0, to: this.child.state.doc.length, insert: text },
          selection }); }
        finally { this.syncing = false; }
      }
    } else {
      this.releaseResults();
      if (old) {
        if (old.style.tableLayout === 'fixed') {
          next.style.tableLayout = 'fixed';
          const oldColgroup = old.querySelector('colgroup');
          if (oldColgroup) next.prepend(oldColgroup.cloneNode(true));
          const oldRowsList = old.querySelectorAll('tr');
          const newRowsList = next.querySelectorAll('tr');
          if (oldRowsList.length === newRowsList.length) {
            oldRowsList.forEach((oldTr, idx) => {
              if (oldTr.style.height) newRowsList[idx].style.height = oldTr.style.height;
            });
          }
        }
        old.replaceWith(next);
      } else {
        this.dom.append(next);
      }
    }
    this.dom.querySelectorAll('tr').forEach((row, r) => Array.from(row.children).forEach((cell, c) => {
      const element = cell as HTMLElement; element.dir = 'auto'; element.dataset.row = String(r); element.dataset.column = String(c);
      element.tabIndex = 0; element.setAttribute('aria-label', `Edit row ${r + 1}, column ${c + 1}`);
      if (this.child && r === this.row && c === this.column) return;
      const resources = () => {
        const disposers: (() => void)[] = [];
        element.querySelectorAll<HTMLElement>('[data-table-image]').forEach(slot => {
          const image = projection.images[Number(slot.dataset.tableImage)];
          if (image) disposers.push(mountImage(slot, image, () => this.outer.requestMeasure()));
        });
        element.querySelectorAll<HTMLElement>('[data-table-math]').forEach(slot => {
          const formula = projection.formulas[Number(slot.dataset.tableMath)];
          if (formula) disposers.push(mountFormula(slot, formula, () => this.outer.requestMeasure()));
        });
        return disposers;
      };
      const html = projection.htmlCells.get(`${r}:${c}`);
      const range = this.cells[r]?.[c];
      // Lezer slot ranges exclude column delimiters and retain exact padding.
      // The rendering tree's cell positions can include the outer table pipes.
      const disposers = html && range ? [mountCellHTML(element, { ...html,
        source: this.outer.state.doc.sliceString(range.slotFrom, range.slotTo) },
        resources, () => this.outer.requestMeasure())] : resources();
      if (disposers.length) this.results.set(element, disposers);
    }));
    this.updateTools();
    return true;
  }
  begin(row: number, column: number, point?: { x: number; y: number } | number) {
    if (this.outer.state.readOnly || this.outer.compositionStarted || tableComposing(this.outer)) return;
    const range = this.cells[row]?.[column]; if (!range) return;
    if (this.child && row === this.row && column === this.column) {
      if (point && typeof point === 'object' && (point.x !== 0 || point.y !== 0)) {
        const coordPos = this.child.posAtCoords(point);
        if (coordPos !== null) {
          const pos = Math.max(0, Math.min(coordPos, this.child.state.doc.length));
          this.syncing = true;
          try {
            this.child.dispatch({ selection: EditorSelection.single(pos) });
          } finally {
            this.syncing = false;
          }
          this.outer.dispatch({ effects: tableCellEffect.of({ from: this.from, to: this.to, row, column,
            cellFrom: range.from, cellTo: range.to, anchor: pos, head: pos }) });
        }
      }
      this.child.focus();
      return;
    }
    this.finish(false);
    let initialOffset = typeof point === 'number' ? point : 0;
    let foundOffset = typeof point === 'number';
    if (point && typeof point === 'object' && (point.x !== 0 || point.y !== 0)) {
      const cell = this.dom.querySelectorAll('tr')[row]?.children[column] as HTMLElement | undefined;
      if (cell) {
        const domOffset = clickOffsetInNode(cell, point);
        if (domOffset !== null) {
          initialOffset = domOffset;
          foundOffset = true;
        }
      }
    }
    const textLength = range.to - range.from;
    initialOffset = Math.max(0, Math.min(initialOffset, textLength));
    if (!this.mountCell(row, column, EditorSelection.single(initialOffset))) return;
    let finalOffset = initialOffset;
    if (!foundOffset && point && typeof point === 'object' && (point.x !== 0 || point.y !== 0) && this.child) {
      const coordPos = this.child.posAtCoords(point);
      if (coordPos !== null) {
        finalOffset = Math.max(0, Math.min(coordPos, this.child.state.doc.length));
        if (finalOffset !== initialOffset) {
          this.syncing = true;
          try {
            this.child.dispatch({ selection: EditorSelection.single(finalOffset) });
          } finally {
            this.syncing = false;
          }
        }
      }
    }
    this.outer.dispatch({ effects: tableCellEffect.of({ from: this.from, to: this.to, row, column,
      cellFrom: range.from, cellTo: range.to, anchor: finalOffset, head: finalOffset }) });
    this.child!.focus();
  }
  restore(active: ActiveCell): EditorView | undefined {
    if (active.from !== this.from || active.to !== this.to || this.outer.state.readOnly) return;
    const range = this.cells[active.row]?.[active.column]; if (!range) return;
    this.cells[active.row][active.column] = { ...range, from: active.cellFrom, to: active.cellTo };
    const length = active.cellTo - active.cellFrom;
    const selection = EditorSelection.single(Math.max(0, Math.min(active.anchor ?? 0, length)), Math.max(0, Math.min(active.head ?? 0, length)));
    if (!this.child || this.row !== active.row || this.column !== active.column) {
      this.finish(false); if (!this.mountCell(active.row, active.column, selection)) return;
    } else if (!selection.eq(this.child.state.selection)) {
      this.syncing = true; try { this.child.dispatch({ selection }); } finally { this.syncing = false; }
    }
    // A retained child can return from another table without being mounted again.
    // It must own input before the next child transaction can edit source.
    activeEditors.set(this.outer, this);
    return this.child;
  }
  private mountCell(row: number, column: number, selection = EditorSelection.single(0)) {
    const range = this.cells[row]?.[column]; if (!range) return false;
    this.row = row; this.column = column;
    const cell = this.dom.querySelectorAll('tr')[row]?.children[column] as HTMLElement;
    if (!cell) return false;
    this.releaseResults(cell);
    const table = this.dom.querySelector('table');
    if (table) {
      if (table.style.tableLayout !== 'fixed') {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          const widths = Array.from(firstRow.children).map(c => (c as HTMLElement).getBoundingClientRect().width);
          if (widths.length > 0 && widths.every(w => w > 0)) {
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
              colgroup = document.createElement('colgroup');
              table.prepend(colgroup);
            }
            colgroup.innerHTML = '';
            for (const w of widths) {
              const col = document.createElement('col');
              col.style.width = `${w}px`;
              colgroup.append(col);
            }
            table.style.tableLayout = 'fixed';
          }
        }
      }
      const rows = table.querySelectorAll('tr');
      rows.forEach(tr => {
        if (!tr.style.height) {
          const h = tr.getBoundingClientRect().height;
          if (h > 0) tr.style.height = `${h}px`;
        }
      });
    }
    const rowEl = this.dom.querySelectorAll('tr')[row];
    const rowHeight = rowEl ? rowEl.getBoundingClientRect().height : 0;
    if (rowHeight > 0) {
      cell.style.height = `${rowHeight}px`;
      cell.style.maxHeight = `${rowHeight}px`;
    }
    cell.innerHTML = ''; cell.classList.add('editing-cell');
    this.child = new EditorView({ parent: cell, state: EditorState.create({
      doc: this.outer.state.doc.sliceString(range.from, range.to), selection,
      extensions: [
        EditorView.lineWrapping,
        textDirection,
        EditorView.contentAttributes.of({ 'aria-label': `Table cell, row ${row + 1}, column ${column + 1}`, 'aria-multiline': 'false',
          'aria-description': 'Enter or Escape returns to the document outside the table. Tab moves to the next cell and adds a row at the final cell.' }),
        EditorView.domEventHandlers({ paste: event => {
          if (!clipboardImageFiles(event.clipboardData)) return false;
          event.preventDefault();
          this.pasteImage(event);
          return true;
        } }),
        EditorState.transactionFilter.of(transaction => {
          if (this.syncing) return transaction;
          if (!this.child && transaction.docChanged) return [];
          if (this.outer.state.readOnly && transaction.docChanged && !this.syncing) return [];
          if (!transaction.docChanged) return transaction;
          const active = this.outer.state.field(tableCellField, false);
          const target = this.cells[this.row]?.[this.column];
          if (!active || activeEditors.get(this.outer) !== this || active.from !== this.from || active.to !== this.to
            || active.row !== this.row || active.column !== this.column || active.cellFrom !== target?.from || active.cellTo !== target?.to
            || transaction.startState !== this.child?.state) return [];
          const text = transaction.newDoc.toString();
          // Multiline input is rejected. The existing table source stays intact.
          if (/[\r\n]/.test(text)) return [];
          let escaped = escapeCellPipes(text);
          // A final backslash must not escape the following column delimiter.
          if (target && this.outer.state.doc.sliceString(target.to, target.to + 1) === '|' &&
            (/\\*$/.exec(escaped)![0].length % 2)) escaped += '\\';
          if (target?.virtual && (!escaped || !this.virtualPatch(escaped))) return [];
          if (escaped === text) return transaction;
          return [transaction, { changes: { from: 0, to: text.length, insert: escaped },
            selection: EditorSelection.cursor(escapeCellPipes(text.slice(0, transaction.newSelection.main.head)).length), sequential: true }];
        }),
        keymap.of([
          { key: 'Mod-z', run: () => this.history(undo) },
          { key: 'Mod-Shift-z', run: () => this.history(redo) },
          { key: 'Mod-y', run: () => this.history(redo) },
          { key: 'Mod-s', run: () => { this.outer.state.facet(tableSaveCommand)?.(); return true; } },
          { key: 'Mod-f', run: () => { this.outer.state.facet(tableFindCommand)?.(); return true; } },
          { key: 'Mod-Enter', run: () => { this.command('row-below'); return true; } },
          { key: 'Mod-Shift-Backspace', run: () => { this.command('delete-row'); return true; } },
          { key: 'Mod-Shift-Delete', run: () => { this.command('delete-row'); return true; } },
          { key: 'Enter', run: () => this.leave() }, { key: 'Escape', run: () => this.leave() },
          { key: 'Tab', run: () => this.move(1) }, { key: 'Shift-Tab', run: () => this.move(-1) },
          ...defaultKeymap,
        ]),
        EditorView.updateListener.of(update => {
          if (this.syncing || activeEditors.get(this.outer) !== this) return;
          const target = this.cells[this.row]?.[this.column];
          if (!target || this.outer.state.readOnly) return;
          const current = this.outer.state.field(tableCellField, false);
          if (!current || current.from !== this.from || current.to !== this.to || current.row !== this.row || current.column !== this.column
            || current.cellFrom !== target.from || current.cellTo !== target.to || update.view !== this.child) return;
          const selection = update.state.selection.main;
          if (!update.docChanged) {
            const active = this.outer.state.field(tableCellField, false);
            if (update.selectionSet && active && (active.anchor !== selection.anchor || active.head !== selection.head))
              this.outer.dispatch({ effects: tableCellEffect.of({ ...active, anchor: selection.anchor, head: selection.head }), annotations: Transaction.addToHistory.of(false) });
            return;
          }
          const text = update.state.doc.toString(), virtual = target.virtual ? this.virtualPatch(text) : null;
          if (target.virtual && !virtual) return;
          const changes = virtual?.changes || { from: target.from, to: target.to, insert: text };
          const active = virtual?.active || { from: this.from, to: this.outer.state.changes(changes).mapPos(this.to, 1),
            row: this.row, column: this.column, cellFrom: target.from, cellTo: target.from + text.length };
          this.outer.dispatch({ changes,
            effects: tableCellEffect.of({ ...active, anchor: selection.anchor, head: selection.head }),
            annotations: [Transaction.userEvent.of('input.table'),
              ...(update.transactions.some(transaction => transaction.isUserEvent('input.drop')) ? [isolateHistory.of('full')] : [])] });
        }),
      ],
    }) });
    activeEditors.set(this.outer, this);
    if (this.floatingBar) {
      this.floatingBar.hidden = false;
      this.updateFloatingBar();
    }
    this.setTools(true);
    this.updateTools();
    return true;
  }
  private pasteImage(event: ClipboardEvent) {
    const report = this.outer.state.facet(imagePasteMessage) || (() => {}), requestCurrent = clipboardRequest(this.outer);
    const child = this.child, files = clipboardImageFiles(event.clipboardData)!;
    const guard = () => this.outer.state.facet(imagePasteGuard)() ||
      (this.outer.state.readOnly || child?.state.readOnly ? 'The document is read-only.' :
        this.outer.compositionStarted || child?.compositionStarted ? 'Finish text input, then paste the image.' :
          child?.state.selection.ranges.length !== 1 ? 'Use one selection for image paste.' : null);
    const reason = guard(); if (reason) { report(reason); return; }
    if (!child) return;
    const file = clipboardRaster(files); if (typeof file === 'string') { report(file); return; }
    const policy = this.outer.state.facet(imagePastePolicy)?.(this.outer, file);
    if (typeof policy === 'string') { report(policy); return; }
    const outerState = this.outer.state, childState = child.state, selection = childState.selection.main;
    const references = imageEnvironment(outerState, this.source);
    if (!cellPasteContext(childState.doc.toString(), selection.from, selection.to, references)) {
      report('Paste the image into table cell text, outside code, math, links, and image syntax.'); return;
    }
    const version = outerState.field(clipboardVersion, false), row = this.row, column = this.column;
    const current = () => requestCurrent() && this.child === child && activeEditors.get(this.outer) === this
      && this.row === row && this.column === column && child.state === childState
      && this.outer.state.field(clipboardVersion, false) === version
      && (version !== undefined || this.outer.state === outerState)
      && this.outer.state.doc === outerState.doc && this.outer.state.field(sourceField) === outerState.field(sourceField)
      && this.outer.state.facet(imageDocument) === outerState.facet(imageDocument)
      && this.outer.state.field(imagePath, false) === outerState.field(imagePath, false) && (!policy || policy.current());
    const prepare = (destination: string) => {
      const inserted = `![](<${destination}>)`, from = escapeCellPipes(childState.doc.sliceString(0, selection.from)).length;
      const transaction = childState.update({ changes: { from: selection.from, to: selection.to, insert: inserted },
        selection: { anchor: selection.from + inserted.length }, userEvent: 'input.paste' });
      const text = transaction.newDoc.toString();
      if (!transaction.docChanged || !cellImageRange(text, from, from + inserted.length, destination, references))
        throw new Error('Paste the image into table cell text, outside code, math, links, and image syntax.');
      const target = this.cells[row]?.[column], virtual = target?.virtual ? this.virtualPatch(text) : null;
      if (!target || target.virtual && !virtual) throw new Error('The table cell changed. Paste the image again.');
      const outer = outerState.update({ changes: virtual?.changes || { from: target.from, to: target.to, insert: text },
        effects: virtual ? tableCellEffect.of(virtual.active) : [], userEvent: 'input.table' });
      return { transaction, bytes: new TextEncoder().encode(savedSource(outer.state.field(sourceField))).length };
    };
    try {
      const destination = policy?.kind === 'copy' ? policy.placeholder : `data:${file.type};base64,`;
      const extra = policy?.kind === 'copy' ? 0 : Math.ceil(file.size / 3) * 4;
      const stub = `![](<${destination}>)`;
      const preview = escapeCellPipes(childState.doc.sliceString(0, selection.from) + stub + childState.doc.sliceString(selection.to));
      const target = this.cells[row][column], changes = target.virtual ? this.virtualChanges(preview) : { from: target.from, to: target.to, insert: preview };
      if (!changes) throw new Error('The table cell changed. Paste the image again.');
      const record = outerState.field(sourceField), proposed = { ...record, raw: record.raw.slice(0, sourceOffset(record, changes.from))
        + changes.insert + record.raw.slice(sourceOffset(record, 'to' in changes ? changes.to : changes.from)) };
      if (new TextEncoder().encode(savedSource(proposed)).length + extra > clipboardSourceLimit)
        throw new Error('The clipboard image does not fit the 8 MiB document limit.');
      const projected = prepare(destination);
      if (projected.bytes + extra > clipboardSourceLimit) throw new Error('The clipboard image does not fit the 8 MiB document limit.');
    } catch (error) { report(String(error)); return; }
    report('Reading clipboard image…');
    const apply = (destination: string) => {
      if (!current()) {
        if (requestCurrent() && this.child === child) report('The document or selection changed. Paste the image again.');
        return;
      }
      const reason = guard(); if (reason) { report(reason); return; }
      const planned = prepare(destination);
      if (planned.bytes > clipboardSourceLimit) throw new Error('The clipboard image does not fit the 8 MiB document limit.');
      child.dispatch(planned.transaction); child.focus(); report(policy?.kind === 'copy' ? 'Image pasted. Undo keeps the copied file.' : 'Image pasted.');
    };
    const failure = (error: unknown) => { if (current()) report(`Cannot paste image: ${String(error)}`); };
    if (policy?.kind === 'copy') {
      void readClipboardBytes(file).then(bytes => {
        if (!current()) return;
        const reason = guard(); if (reason) { report(reason); return; }
        return policy.publish(bytes, current, () => !!guard()).then(destination => { if (destination !== null) apply(destination); });
      }).catch(failure);
    } else void readClipboardRaster(file).then(apply).catch(failure);
  }
  imageDrop(target: Element, point: { x: number; y: number }, destination: string) {
    return this.imageDropAt(target, point, destination);
  }
  // Destinations are already URL-encoded. A copied path reuses the captured
  // insertion offset and cell, without another coordinate hit test.
  private imageDropAt(target: Element, point: { x: number; y: number }, destination: string, capturedAt?: number):
    string | { current: () => boolean; guard: () => string | null; apply: (destination?: string) => boolean } {
    const cell = target.closest<HTMLElement>('th, td');
    if (!cell || cell.closest('.preview-table') !== this.dom) return 'Drop into a table cell.';
    const row = Number(cell.dataset.row), column = Number(cell.dataset.column), range = this.cells[row]?.[column];
    if (!range) return 'The table cell changed. Drop the image again.';
    const outerState = this.outer.state, capturedChild = this.child, childState = capturedChild?.state;
    const capturedActive = activeEditors.get(this.outer), activeChild = capturedActive?.child, activeState = activeChild?.state;
    const active = !!capturedChild && this.row === row && this.column === column;
    const child = active ? capturedChild : undefined;
    if (child && (!child.contentDOM.contains(target) || target.closest('.cm-content') !== child.contentDOM))
      return 'Drop into the table cell text.';
    const textBefore = child?.state.doc.toString() ?? outerState.doc.sliceString(range.from, range.to);
    const at = capturedAt ?? (child ? child.posAtCoords(point) : textBefore.length);
    if (at === null) return 'Drop into visible table cell text.';
    const guard = () => this.outer.state.readOnly || capturedChild?.state.readOnly ? 'The document is read-only.' :
      this.outer.compositionStarted || tableComposing(this.outer) ? 'Finish text input, then drop the image.' :
        child && child.state.selection.ranges.length !== 1 ? 'Use one selection for image drop.' : null;
    const reason = guard(); if (reason) return reason;
    const references = imageEnvironment(outerState, this.source);
    if (!cellPasteContext(textBefore, at, at, references)) return 'Drop outside code, math, links, and image syntax.';
    // A rendered cell has no exact character map. Append with a separator;
    // an active raw cell instead uses its actual drop position.
    const separator = !child && textBefore && !/\s$/.test(textBefore) ? ' ' : '';
    const rawDestination = destination.replace(/&/g, '&amp;').replace(/\\/g, '\\\\');
    const image = `![](<${rawDestination}>)`, inserted = separator + image;
    let text = escapeCellPipes(textBefore.slice(0, at) + inserted + textBefore.slice(at));
    if (outerState.doc.sliceString(range.to, range.to + 1) === '|' && /\\*$/.exec(text)![0].length % 2) text += '\\';
    const changes = range.virtual ? this.virtualChanges(text, row, column) : { from: range.from, to: range.to, insert: text };
    if (!changes) return 'The table cell changed. Drop the image again.';
    const record = outerState.field(sourceField), proposed = { ...record, raw: record.raw.slice(0, sourceOffset(record, changes.from))
      + changes.insert + record.raw.slice(sourceOffset(record, 'to' in changes ? changes.to : changes.from)) };
    if (new TextEncoder().encode(savedSource(proposed)).length > clipboardSourceLimit) return 'The image path does not fit the 8 MiB document limit.';
    const from = escapeCellPipes(textBefore.slice(0, at)).length + separator.length;
    if (!cellImageRange(text, from, from + image.length, destination, references)) return 'Drop outside code, math, links, and image syntax.';
    const transaction = child?.state.update({ changes: { from: at, insert: inserted }, selection: { anchor: at + inserted.length }, userEvent: 'input.drop' });
    if (transaction && (!transaction.docChanged || transaction.newDoc.toString() !== text)) return 'The table cell changed. Drop the image again.';
    const virtual = range.virtual ? this.virtualPatch(text, row, column) : null;
    if (range.virtual && !virtual) return 'The table cell changed. Drop the image again.';
    const outer = outerState.update({ changes: virtual?.changes || changes,
      effects: virtual ? tableCellEffect.of(virtual.active) : child ? [] : tableCellEffect.of(null),
      annotations: isolateHistory.of('full'), userEvent: 'input.table' });
    if (new TextEncoder().encode(savedSource(outer.state.field(sourceField))).length > clipboardSourceLimit)
      return 'The image path does not fit the 8 MiB document limit.';
    const previousRow = this.row, previousColumn = this.column, rect = cell.getBoundingClientRect();
    const childScroll = capturedChild && [capturedChild.scrollDOM.scrollLeft, capturedChild.scrollDOM.scrollTop];
    const current = () => {
      const next = cell.getBoundingClientRect();
      return this.outer.state === outerState && controllers.get(this.dom) === this && cell.isConnected
        && this.dom.contains(cell) && this.cells[row]?.[column] === range && this.child === capturedChild
        && capturedChild?.state === childState && this.row === previousRow && this.column === previousColumn
        && activeEditors.get(this.outer) === capturedActive && capturedActive?.child === activeChild && activeChild?.state === activeState
        && (!capturedChild || capturedChild.scrollDOM.scrollLeft === childScroll![0] && capturedChild.scrollDOM.scrollTop === childScroll![1])
        && next.x === rect.x && next.y === rect.y && next.width === rect.width && next.height === rect.height;
    };
    return { current, guard, apply: (actualDestination?: string) => {
      if (!current() || guard()) return false;
      if (actualDestination !== undefined && actualDestination !== destination) {
        const rebuilt = this.imageDropAt(target, point, actualDestination, at);
        if (typeof rebuilt === 'string') throw new Error(rebuilt);
        return rebuilt.apply();
      }
      if (child && transaction) { child.dispatch(transaction); child.focus(); }
      else {
        capturedActive?.finish(false); if (capturedActive !== this) this.finish(false); this.outer.dispatch(outer);
        const dom = this.outer.dom.querySelector<HTMLElement>(`.preview-table[data-from="${this.from}"]`);
        const editor = dom && tableEditor(dom); editor?.begin(row, column);
        if (editor?.child) { editor.child.dispatch({ selection: { anchor: text.length } }); editor.child.focus(); }
      }
      return true;
    } };
  }
  private virtualChanges(text: string, targetRow = this.row, targetColumn = this.column) {
    const table = findTable(this.outer.state, this.from);
    if (!table || !text) return null;
    const read = (a: number, b: number) => this.outer.state.doc.sliceString(a, b);
    const actual = tableCells(table, read), current = editableTableCells(table, read)[targetRow]?.[targetColumn];
    const old = this.cells[targetRow]?.[targetColumn];
    if (!current?.virtual || !old?.virtual || current.from !== old.from) return null;
    const nodes: SyntaxNode[] = [];
    for (let node = table.firstChild; node; node = node.nextSibling)
      if (node.name === 'TableHeader' || node.name === 'TableRow') nodes.push(node);
    const row = nodes[targetRow]; if (!row || targetRow === 0) return null;
    const prefix = (row.lastChild?.name === 'TableDelimiter' ? '' : '|') +
      Array(targetColumn - actual[targetRow].length + 1).fill(' ').join('|');
    return { from: row.to, insert: prefix + text + ' |', cellFrom: row.to + prefix.length };
  }
  private virtualPatch(text: string, row = this.row, column = this.column) {
    const changes = this.virtualChanges(text, row, column); if (!changes) return null;
    const proposed = this.outer.state.update({ changes });
    const tree = ensureSyntaxTree(proposed.state, changes.from + changes.insert.length, 100); if (!tree) return null;
    let next: SyntaxNode | null = tree.resolveInner(this.from, 1);
    while (next && next.name !== 'Table') next = next.parent;
    if (next?.from !== this.from) return null;
    const target = next && tableCells(next, (a, b) => proposed.state.doc.sliceString(a, b))[row]?.[column];
    const cellFrom = changes.cellFrom;
    if (!next || !target || cellFrom < target.slotFrom || cellFrom + text.length > target.slotTo) return null;
    return { changes, active: { from: this.from, to: next.to, row, column,
      cellFrom, cellTo: cellFrom + text.length } };
  }
  updateTools() {
    if (!this.tools) return;
    const unsupported = !tableContainerSupported(findTable(this.outer.state, this.from));
    this.tools.querySelectorAll<HTMLButtonElement>('button').forEach(button => {
      const header = this.row === 0 && (button.dataset.command === 'row-above' || button.dataset.command === 'delete-row');
      const last = this.cells[0]?.length === 1 && button.dataset.command === 'delete-column';
      button.disabled = unsupported || this.outer.state.readOnly || header || last;
      button.title = unsupported ? 'Use Table source for this table container.' : header ? 'The header row stays in the table.' :
        last ? 'The table needs one column.' : '';
    });
  }
  command(command: TableCommand, targetColumn = this.column): boolean {
    if (!this.dom.isConnected || controllers.get(this.dom) !== this || this.outer.state.readOnly ||
      this.outer.compositionStarted || tableComposing(this.outer)) return false;
    let plan;
    try { plan = tablePlan(this.outer.state, this.from, command, this.row, targetColumn); }
    catch (error) { this.tools?.setAttribute('aria-label', String(error)); return false; }
    if (!plan.changes.length) return true;
    const target = plan.target; if (!target) return false;
    const from = target.from;
    const active = { from, to: target.to, row: plan.row, column: plan.column,
      cellFrom: target.cellFrom, cellTo: target.cellTo };
    const transaction = this.outer.state.update({ changes: plan.changes,
      effects: [tableCellEffect.of({ from, to: target.to, row: plan.row, column: plan.column,
        cellFrom: target.cellFrom, cellTo: target.cellTo }), EditorView.scrollIntoView(from)],
      annotations: [Transaction.userEvent.of('input.table.structure'), isolateHistory.of('full')] });
    if (!plan.acceptedChanges || JSON.stringify(transaction.changes.toJSON()) !== JSON.stringify(plan.acceptedChanges.toJSON())) return false;
    const accepted = transaction.state.field(tableCellField, false);
    if (!accepted || Object.entries(active).some(([key, value]) => accepted[key as keyof typeof active] !== value)) return false;
    this.finish(false, true);
    this.outer.dispatch(transaction);
    const dom = this.outer.dom.querySelector<HTMLElement>(`.preview-table[data-from="${from}"]`);
    if (dom) tableEditor(dom)?.begin(plan.row, plan.column);
    return true;
  }
  private history(command: (view: EditorView) => boolean) {
    return tableHistoryCommand(this.outer, command);
  }
  private leave() {
    if (tableComposing(this.outer)) return true;
    const position = this.to < this.outer.state.doc.length ? this.to + 1 : Math.max(0, this.from - 1);
    this.finish(false, true);
    this.outer.dispatch({ effects: tableCellEffect.of(null), selection: { anchor: position }, scrollIntoView: true });
    this.outer.focus(); return true;
  }
  private move(direction: number) {
    if (tableComposing(this.outer)) return true;
    const positions = this.cells.flatMap((cells, row) => cells.map((_cell, column) => ({ row, column })));
    const index = positions.findIndex(cell => cell.row === this.row && cell.column === this.column);
    const next = positions[index + direction];
    if (next) this.begin(next.row, next.column);
    else if (direction > 0 && index === positions.length - 1) this.command('row-below', 0);
    else this.leave();
    return true;
  }
  finish(notify = true, unlock = notify) {
    this.closeContextMenu();
    this.closeResizePopover();
    if (this.floatingBar) this.floatingBar.hidden = true;
    this.setTools(false);
    if (unlock) {
      const table = this.dom.querySelector('table');
      if (table) {
        table.style.tableLayout = '';
        table.querySelector('colgroup')?.remove();
        table.querySelectorAll('tr').forEach(tr => { tr.style.height = ''; });
      }
    }
    const child = this.child; this.child = undefined; child?.destroy();
    if (activeEditors.get(this.outer) === this) activeEditors.delete(this.outer);
    this.dom.querySelectorAll('.editing-cell').forEach(c => {
      const el = c as HTMLElement;
      el.classList.remove('editing-cell');
      el.style.height = '';
      el.style.maxHeight = '';
    });
    if (child) this.refresh(this.from, this.to, this.source);
    if (notify && child) this.outer.dispatch({ effects: tableCellEffect.of(null) });
  }
  destroy() {
    this.closeContextMenu();
    this.closeResizePopover();
    if (this.floatingBar) this.floatingBar.hidden = true;
    this.releaseResults();
    const table = this.dom.querySelector('table');
    if (table) {
      table.style.tableLayout = '';
      table.querySelector('colgroup')?.remove();
      table.querySelectorAll('tr').forEach(tr => { tr.style.height = ''; });
    }
    this.child?.destroy(); this.child = undefined;
    if (activeEditors.get(this.outer) === this) activeEditors.delete(this.outer);
    controllers.delete(this.dom);
  }
}
