const sizes = [80, 90, 100, 110, 125, 150, 175, 200] as const;
const key = 'markdew.writing-size';
const valid = (value: number) => sizes.some(size => size === value);

// This preference belongs to the writing surface, not the source record.
export function writingSizeControls(parent: HTMLElement, surface: HTMLElement,
  allowed: () => boolean, measure: () => void) {
  let size = 100, disposed = false;
  try {
    const saved = localStorage.getItem(key);
    if (saved && valid(Number(saved))) size = Number(saved);
  } catch { /* Editing does not require preference storage. */ }
  const label = document.createElement('label'); label.className = 'writing-size-control'; label.textContent = 'Writing size ';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Writing size');
  for (const value of sizes) {
    const option = document.createElement('option'); option.value = String(value); option.textContent = `${value}%`; select.append(option);
  }
  label.append(select); parent.append(label);
  const apply = () => { select.value = String(size); surface.style.setProperty('--writing-scale', String(size / 100)); };
  const change = () => {
    const next = Number(select.value);
    if (disposed) return;
    if (!valid(next)) { select.value = String(size); return; }
    if (next === size) return;
    if (!allowed()) { select.value = String(size); return; }
    size = next; apply();
    try { localStorage.setItem(key, String(size)); } catch { /* This launch retains its size. */ }
    measure();
  };
  apply(); select.addEventListener('change', change);
  return () => { disposed = true; select.removeEventListener('change', change); label.remove(); };
}
