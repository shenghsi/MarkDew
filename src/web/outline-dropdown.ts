import { EditorView } from '@codemirror/view';
import { headings, Heading } from './navigation';
import { endTableEdit, tableCellField } from './table';

export interface OutlineDropdown {
  readonly element: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

export function outlineDropdown(button: HTMLElement, getView: () => EditorView): OutlineDropdown {
  const panel = document.createElement('div');
  panel.className = 'outline-dropdown';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Document Outline');
  panel.hidden = true;
  button.after(panel);

  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');

  function currentHeadingIndex(view: EditorView, list: Heading[]): number {
    const position = view.state.field(tableCellField, false)?.cellFrom ?? view.state.selection.main.head;
    let low = 0, high = list.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (list[middle].from <= position) low = middle + 1; else high = middle;
    }
    return low - 1;
  }

  function render() {
    const view = getView();
    const items = headings(view.state);
    panel.replaceChildren();

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'outline-dropdown-empty';
      empty.textContent = 'No headings in document';
      panel.append(empty);
      return;
    }

    const currentIdx = currentHeadingIndex(view, items);
    const list = document.createElement('ul');
    list.className = 'outline-dropdown-list';
    list.setAttribute('role', 'menu');

    items.forEach((heading, idx) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'outline-dropdown-item';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = heading.label;
      btn.style.paddingLeft = `${12 + (heading.level - 1) * 12}px`;
      if (idx === currentIdx) {
        btn.setAttribute('aria-current', 'location');
        btn.classList.add('active');
      }

      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!endTableEdit(view)) return;
        view.dispatch({
          selection: { anchor: heading.from },
          effects: EditorView.scrollIntoView(heading.from, { y: 'start' }),
        });
        view.focus();
        close();
      });

      li.append(btn);
      list.append(li);
    });

    panel.append(list);
  }

  function open() {
    render();
    panel.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    button.classList.add('active');

    const activeBtn = panel.querySelector<HTMLButtonElement>('.outline-dropdown-item.active') ||
                      panel.querySelector<HTMLButtonElement>('.outline-dropdown-item');
    activeBtn?.focus();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.classList.remove('active');
  }

  function toggle() {
    if (panel.hidden) open(); else close();
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });

  const onDocPointerDown = (event: Event) => {
    if (!panel.hidden && !panel.contains(event.target as Node) && !button.contains(event.target as Node)) {
      close();
    }
  };

  const onKeydown = (event: KeyboardEvent) => {
    if (panel.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      button.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('.outline-dropdown-item'));
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (index >= 0) {
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : Math.max(0, index - 1);
        buttons[next]?.focus();
      }
    }
  };

  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('mousedown', onDocPointerDown, true);
  document.addEventListener('keydown', onKeydown);

  return {
    element: panel,
    open,
    close,
    toggle,
    isOpen: () => !panel.hidden,
    destroy() {
      document.removeEventListener('pointerdown', onDocPointerDown, true);
      document.removeEventListener('mousedown', onDocPointerDown, true);
      document.removeEventListener('keydown', onKeydown);
      panel.remove();
    },
  };
}
