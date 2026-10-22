interface Preferences { readonly width: number; widthChanged(width: number): void }
interface Pane { element: HTMLElement; button: HTMLElement }

// The stored width is independent of the width that fits this window.
export function sidebarSize(workspace: HTMLElement, panes: Pane[], preferences: Preferences,
  allowed: () => boolean, prepare: () => void, measure: () => void) {
  const divider = document.createElement('div'); divider.className = 'sidebar-divider';
  divider.tabIndex = 0; divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', 'vertical'); divider.setAttribute('aria-label', 'Sidebar width');
  panes.at(-1)!.element.after(divider);
  let disposed = false, frame = 0, preferred = preferences.width;
  let drag: { id: number; x: number; width: number; effective: number; pane: Pane } | undefined;
  const visible = () => panes.find(pane => !pane.element.hidden);
  const bounds = () => {
    const width = workspace.getBoundingClientRect().width;
    const max = Math.max(0, Math.min(400, Math.floor(width / 2), Math.floor(width - 246)));
    return { min: Math.min(150, max), max };
  };
  const queueMeasure = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (!disposed) measure(); });
  };
  function changeWidth(target: number) {
    const { min, max } = bounds(), current = Math.max(min, Math.min(max, preferred));
    const next = Math.max(min, Math.min(max, Math.round(target)));
    if (next === current) return false;
    preferred = Math.max(150, Math.min(400, next));
    return true;
  }
  function apply() {
    const pane = visible(), { min, max } = bounds(), width = Math.max(min, Math.min(max, preferred));
    const previous = workspace.style.getPropertyValue('--sidebar-width');
    const next = `${width}px`;
    if (previous !== next) {
      prepare();
      workspace.style.setProperty('--sidebar-width', next);
      const app = workspace.closest<HTMLElement>('#app');
      if (app) app.style.setProperty('--sidebar-width', next);
      queueMeasure();
    }
    divider.hidden = !pane;
    divider.setAttribute('aria-valuemin', String(min)); divider.setAttribute('aria-valuemax', String(max));
    divider.setAttribute('aria-valuenow', String(width)); divider.setAttribute('aria-valuetext', `${width} pixels`);
    if (pane) divider.setAttribute('aria-controls', pane.element.id);
    else divider.removeAttribute('aria-controls');
  }
  function stop(commit: boolean) {
    const previous = drag;
    if (!previous) return;
    drag = undefined; divider.classList.remove('resizing');
    if (commit && preferred !== previous.width) preferences.widthChanged(preferred);
    else preferred = previous.width;
    if (divider.hasPointerCapture?.(previous.id)) divider.releasePointerCapture(previous.id);
    apply();
  }
  function refresh() {
    if (disposed) return;
    if (drag && drag.pane !== visible()) stop(false);
    if (!visible() && document.activeElement === divider) {
      panes.find(pane => divider.getAttribute('aria-controls') === pane.element.id)?.button.focus();
    }
    apply();
  }
  const start = (event: PointerEvent) => {
    const pane = visible();
    if (disposed || drag || !pane || event.button !== 0 || !allowed()) return;
    event.preventDefault();
    drag = { id: event.pointerId, x: event.clientX, width: preferred, effective: Number(divider.getAttribute('aria-valuenow')), pane };
    divider.setPointerCapture(event.pointerId); divider.classList.add('resizing');
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!allowed() || drag.pane !== visible()) { stop(false); return; }
    if (changeWidth(drag.effective + event.clientX - drag.x)) apply();
  };
  const end = (event: PointerEvent) => { if (drag?.id === event.pointerId) stop(allowed() && drag.pane === visible()); };
  const cancel = () => stop(false);
  const key = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && drag) { event.preventDefault(); cancel(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (disposed || drag || !visible() || !allowed()) return;
    const { min, max } = bounds(), effective = Math.max(min, Math.min(max, preferred));
    if (changeWidth(event.key === 'Home' ? min : event.key === 'End' ? max :
      effective + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 50 : 10))) {
      preferences.widthChanged(preferred); apply();
    }
  };
  const reset = () => { if (!disposed && !drag && visible() && allowed()) { preferred = 250; preferences.widthChanged(preferred); apply(); } };
  const resize = () => { cancel(); refresh(); };
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(resize);
  observer?.observe(workspace);
  divider.addEventListener('pointerdown', start); divider.addEventListener('pointermove', move);
  divider.addEventListener('pointerup', end); divider.addEventListener('pointercancel', cancel);
  divider.addEventListener('lostpointercapture', cancel); divider.addEventListener('keydown', key);
  divider.addEventListener('dblclick', reset);
  document.addEventListener('compositionstart', cancel, true); window.addEventListener('blur', cancel);
  window.addEventListener('resize', resize);
  apply();
  return {
    refresh,
    dispose() {
      cancel(); disposed = true; observer?.disconnect(); if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('compositionstart', cancel, true); window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', resize); divider.remove();
    },
  };
}
