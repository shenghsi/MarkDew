// A non-modal disclosure keeps editor state and input ownership unchanged.
export function toolsPanel(toggle: HTMLButtonElement, panel: HTMLElement, allowed: () => boolean, measure: () => void) {
  panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', panel.id);
  const set = (open: boolean) => {
    if (!allowed()) return;
    const restore = !open && panel.contains(document.activeElement);
    panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open));
    if (restore) toggle.focus();
    measure();
  };
  const pointer = (event: MouseEvent) => event.preventDefault();
  const click = () => set(panel.hidden);
  const key = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) return;
    event.preventDefault(); set(false);
  };
  toggle.addEventListener('mousedown', pointer); toggle.addEventListener('click', click);
  panel.addEventListener('keydown', key);
  return () => {
    toggle.removeEventListener('mousedown', pointer); toggle.removeEventListener('click', click);
    panel.removeEventListener('keydown', key);
  };
}
