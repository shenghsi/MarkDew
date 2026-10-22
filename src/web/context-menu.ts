export interface MenuIcon { label: string; icon: string; disabled?: boolean; run: () => void }
export type MenuEntry =
  | { type: 'icons'; items: MenuIcon[] }
  | { type: 'item'; label: string; shortcut?: string; disabled?: boolean; checked?: boolean; run?: () => void; submenu?: MenuEntry[] }
  | { type: 'separator' };

const focusable = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLElement>(':scope > .menu-icons > button, :scope > .menu-item')).filter(el => !el.hasAttribute('aria-disabled') && !(el as HTMLButtonElement).disabled);

// Keyboard input stays with the editor: the menu listens at the document and
// marks the current entry, so the editor keeps its focus and selection.
export function showMenu(entries: MenuEntry[], x: number, y: number, onClose: () => void, label: string): () => void {
  const root = document.createElement('div');
  root.className = 'editor-context-menu'; root.setAttribute('role', 'menu'); root.setAttribute('aria-label', label);
  let closed = false;
  const close = () => {
    if (closed) return; closed = true;
    document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', key, true);
    window.removeEventListener('blur', close); window.removeEventListener('resize', close);
    document.removeEventListener('scroll', scrolled, true);
    root.remove(); onClose();
  };
  const scrolled = (event: Event) => { if (!root.contains(event.target as Node)) close(); };
  const outside = (event: MouseEvent) => { if (!root.contains(event.target as Node)) close(); };
  const fit = (panel: HTMLElement, submenu: boolean) => {
    const box = panel.getBoundingClientRect();
    if (submenu) {
      if (box.right > window.innerWidth) { panel.style.left = 'auto'; panel.style.right = '100%'; }
      if (box.bottom > window.innerHeight) panel.style.top = `${Math.max(-box.top + 4, window.innerHeight - box.bottom - 4)}px`;
    } else {
      panel.style.left = `${Math.max(4, Math.min(x, window.innerWidth - box.width - 4))}px`;
      panel.style.top = `${Math.max(4, Math.min(y, window.innerHeight - box.height - 4))}px`;
    }
  };
  const openSub = (item: HTMLElement) => {
    const panel = item.querySelector<HTMLElement>(':scope > .editor-context-menu');
    if (!panel) return;
    for (const other of Array.from(item.parentElement!.querySelectorAll(':scope > .menu-item.open'))) if (other !== item) other.classList.remove('open');
    item.classList.add('open'); fit(panel, true);
  };
  const build = (list: MenuEntry[], submenu: boolean): HTMLElement => {
    const panel = submenu ? document.createElement('div') : root;
    if (submenu) { panel.className = 'editor-context-menu submenu'; panel.setAttribute('role', 'menu'); }
    for (const entry of list) {
      if (entry.type === 'separator') { const line = document.createElement('div'); line.className = 'menu-separator'; line.setAttribute('role', 'separator'); panel.append(line); continue; }
      if (entry.type === 'icons') {
        const row = document.createElement('div'); row.className = 'menu-icons'; row.setAttribute('role', 'group');
        for (const icon of entry.items) {
          const button = document.createElement('button'); button.type = 'button'; button.innerHTML = icon.icon;
          button.title = icon.label; button.setAttribute('aria-label', icon.label); button.disabled = !!icon.disabled;
          button.addEventListener('click', () => { close(); icon.run(); });
          row.append(button);
        }
        panel.append(row); continue;
      }
      const item = document.createElement('div'); item.className = 'menu-item'; item.setAttribute('role', 'menuitem');
      if (entry.disabled) { item.classList.add('disabled'); item.setAttribute('aria-disabled', 'true'); }
      const check = document.createElement('span'); check.className = 'menu-check'; check.textContent = entry.checked ? '✓' : '';
      const text = document.createElement('span'); text.className = 'menu-label'; text.textContent = entry.label;
      const tail = document.createElement('span'); tail.className = 'menu-tail'; tail.textContent = entry.submenu ? '▸' : entry.shortcut || '';
      item.append(check, text, tail);
      if (entry.submenu) {
        item.setAttribute('aria-haspopup', 'menu');
        item.append(build(entry.submenu, true));
        item.addEventListener('mouseenter', () => { if (!entry.disabled) openSub(item); });
        // The submenu lives inside its item, so leaving both closes it. A keyboard-marked entry keeps it open.
        item.addEventListener('mouseleave', () => { if (!item.querySelector('.focus') && !item.classList.contains('focus')) item.classList.remove('open'); });
        item.addEventListener('click', event => { if (event.target === item || !(event.target as HTMLElement).closest('.editor-context-menu.submenu')) openSub(item); });
      } else {
        item.addEventListener('mouseenter', () => { for (const open of Array.from(panel.querySelectorAll(':scope > .menu-item.open'))) open.classList.remove('open'); });
        item.addEventListener('click', () => { if (entry.disabled) return; close(); entry.run?.(); });
      }
      panel.append(item);
    }
    return panel;
  };
  build(entries, false);
  root.addEventListener('mousedown', event => event.preventDefault());
  root.addEventListener('contextmenu', event => event.preventDefault());
  root.style.visibility = 'hidden'; document.body.append(root); fit(root, false); root.style.visibility = '';

  let current: HTMLElement | null = null;
  const mark = (el: HTMLElement | null) => {
    current?.classList.remove('focus'); current = el; current?.classList.add('focus'); current?.scrollIntoView({ block: 'nearest' });
  };
  const panelOf = (el: HTMLElement) => el.closest<HTMLElement>('.editor-context-menu')!;
  const key = (event: KeyboardEvent) => {
    if (event.isComposing) return;
    const panel = current ? panelOf(current) : root, items = focusable(panel);
    const at = current ? items.indexOf(current) : -1;
    const stop = () => { event.preventDefault(); event.stopPropagation(); };
    if (event.key === 'Escape') { stop(); close(); }
    else if (event.key === 'ArrowDown') { stop(); mark(items[(at + 1) % items.length] || null); }
    else if (event.key === 'ArrowUp') { stop(); mark(items[(at - 1 + items.length) % items.length] || null); }
    else if (event.key === 'ArrowRight' && current?.classList.contains('menu-item') && current.querySelector(':scope > .submenu')) {
      stop(); openSub(current); const first = focusable(current.querySelector<HTMLElement>(':scope > .submenu')!)[0]; if (first) mark(first);
    } else if (event.key === 'ArrowLeft' && panel !== root) {
      stop(); const owner = panel.parentElement as HTMLElement; owner.classList.remove('open'); mark(owner);
    } else if (event.key === 'Enter' || event.key === ' ') {
      if (!current) return; stop();
      if (current.querySelector(':scope > .submenu')) { openSub(current); const first = focusable(current.querySelector<HTMLElement>(':scope > .submenu')!)[0]; if (first) mark(first); }
      else current.click();
    }
  };
  document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', key, true);
  window.addEventListener('blur', close); window.addEventListener('resize', close); document.addEventListener('scroll', scrolled, true);
  return close;
}
