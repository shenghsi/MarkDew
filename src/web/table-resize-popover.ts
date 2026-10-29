interface ResizeOptions {
  anchor: HTMLElement;
  columns: number;
  rows: number;
  minRows: number;
  maxRows: number;
  maxColumns: number;
  apply: (columns: number, rows: number) => void;
  onClose: () => void;
}

// Both table types use the same grid, hover preview, and keyboard controls.
export function openTableResizePopover(options: ResizeOptions) {
  const element = document.createElement('div');
  element.className = 'table-resize-popover';
  element.setAttribute('role', 'dialog'); element.setAttribute('aria-label', 'Resize table grid');
  const grid = document.createElement('div'); grid.className = 'table-resize-grid';
  const divider = document.createElement('div'); divider.className = 'table-resize-divider';
  const inputs = document.createElement('div'); inputs.className = 'table-resize-inputs';
  const field = (label: string, value: number, min: number, max: number) => {
    const input = document.createElement('input'); input.type = 'number';
    input.className = `table-resize-input ${label === 'Rows' ? 'row' : 'col'}-input`;
    input.min = String(min); input.max = String(max); input.value = String(value);
    input.setAttribute('aria-label', label); return input;
  };
  const columns = field('Columns', options.columns, 1, options.maxColumns);
  const rows = field('Rows', options.rows, options.minRows, options.maxRows);
  const times = document.createElement('span'); times.textContent = 'x';
  inputs.append(columns, times, rows);
  const highlight = () => {
    for (const box of Array.from(grid.children) as HTMLElement[]) box.classList.toggle('selected',
      Number(box.dataset.col) < Number(columns.value) && Number(box.dataset.row) < Number(rows.value));
  };
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    document.removeEventListener('pointerdown', outside, true); document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', key, true); document.removeEventListener('scroll', scroll, true);
    window.removeEventListener('resize', close); window.removeEventListener('blur', close);
    element.remove(); options.onClose();
  };
  const apply = (c: number, r: number) => {
    const cols = Math.max(1, Math.min(options.maxColumns, Math.trunc(c) || 1));
    const rowCount = Math.max(options.minRows, Math.min(options.maxRows, Math.trunc(r) || options.minRows));
    close(); options.apply(cols, rowCount);
  };
  for (let r = 0; r < 10; r++) for (let c = 0; c < 6; c++) {
    const box = document.createElement('div'); box.className = 'table-resize-box';
    box.dataset.row = String(r); box.dataset.col = String(c);
    box.addEventListener('mouseenter', () => { columns.value = String(c + 1); rows.value = String(Math.max(options.minRows, r + 1)); highlight(); });
    box.addEventListener('mousedown', event => { event.preventDefault(); event.stopPropagation(); });
    box.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); apply(c + 1, r + 1); });
    grid.append(box);
  }
  columns.addEventListener('input', highlight); rows.addEventListener('input', highlight);
  element.addEventListener('mousedown', event => event.stopPropagation());
  element.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); apply(Number(columns.value), Number(rows.value)); }
  });
  const outside = (event: Event) => {
    if (event.target instanceof Node && !element.contains(event.target) && !options.anchor.contains(event.target)) close();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); close(); }
  };
  const scroll = (event: Event) => { if (!(event.target instanceof Node) || !element.contains(event.target)) close(); };
  highlight(); element.append(grid, divider, inputs);
  // A portal prevents the HTML preview's horizontal scroller from clipping the grid.
  element.style.position = 'fixed'; element.style.zIndex = '1000';
  document.body.append(element);
  const anchor = options.anchor.getBoundingClientRect(), bounds = element.getBoundingClientRect();
  element.style.left = `${Math.max(4, Math.min(anchor.left, window.innerWidth - bounds.width - 4))}px`;
  element.style.top = `${Math.max(4, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 4))}px`;
  document.addEventListener('pointerdown', outside, true); document.addEventListener('mousedown', outside, true);
  document.addEventListener('keydown', key, true); document.addEventListener('scroll', scroll, true);
  window.addEventListener('resize', close); window.addEventListener('blur', close);
  return { element, close };
}
