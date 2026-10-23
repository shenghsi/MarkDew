// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { quickFiles, quickOpen, RESULT_LIMIT, score, search } from '../../src/web/quick-open';

afterEach(() => { document.body.replaceChildren(); });
const files = quickFiles('/proj', ['/proj/README.md', '/proj/docs/guide.md', '/proj/docs/api/reference.md', '/proj/notes/日本語.md', '/proj/notes/guide-draft.txt', '/proj/a/b/c/deep-readme.md']);

it('makes paths relative to the folder and names each file', () => {
  expect(files.map(file => [file.relative, file.name])).toEqual([['README.md', 'README.md'], ['docs/guide.md', 'guide.md'], ['docs/api/reference.md', 'reference.md'],
    ['notes/日本語.md', '日本語.md'], ['notes/guide-draft.txt', 'guide-draft.txt'], ['a/b/c/deep-readme.md', 'deep-readme.md']]);
  expect(quickFiles('C:\\proj\\', ['C:\\proj\\sub\\a.md'])[0]).toMatchObject({ relative: 'sub\\a.md', name: 'a.md' });
  expect(quickFiles('/other', ['/elsewhere/x.md'])[0].relative).toBe('/elsewhere/x.md');
});

it('ranks a file name match above a folder match, all words must match, and a typo-free subsequence still finds a file', () => {
  expect(search(files, 'guide').map(file => file.relative)).toEqual(['docs/guide.md', 'notes/guide-draft.txt']);
  expect(search(files, 'readme')[0].relative).toBe('README.md');
  expect(search(files, 'docs ref').map(file => file.relative)).toEqual(['docs/api/reference.md']);
  expect(search(files, 'rdme').map(file => file.relative)).toContain('README.md');
  expect(search(files, '日本').map(file => file.relative)).toEqual(['notes/日本語.md']);
  expect(search(files, 'zzz')).toEqual([]); expect(score(files[0], 'readme')).not.toBeNull(); expect(score(files[0], 'zzz')).toBeNull();
  // A folder name matches too, below a file name match.
  expect(search(files, 'api').map(file => file.relative)).toEqual(['docs/api/reference.md']);
});

it('lists open files first for an empty query, and limits the results', () => {
  expect(search(files, '', ['/proj/notes/日本語.md'])[0].relative).toBe('notes/日本語.md');
  const many = quickFiles('/p', Array.from({ length: 200 }, (_, index) => `/p/file-${index}.md`));
  expect(search(many, '')).toHaveLength(RESULT_LIMIT); expect(search(many, 'file')).toHaveLength(RESULT_LIMIT);
});

function host(overrides: Partial<Parameters<typeof quickOpen>[0]> = {}) {
  return { list: vi.fn(async () => ({ files, incomplete: false })), open: vi.fn(), restoreFocus: vi.fn(), opened: () => [] as string[], ...overrides };
}
const type = (input: HTMLInputElement, text: string) => { input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); };
const key = (input: HTMLInputElement, name: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }); input.dispatchEvent(event); return event;
};
const names = () => Array.from(document.querySelectorAll('.quick-open-list li .quick-open-name')).map(element => element.textContent);

it('shows the files, narrows them as you type, moves with the arrows, and opens the chosen file with Enter', async () => {
  const h = host(), quick = quickOpen(h); const shown = quick.show();
  const input = document.querySelector<HTMLInputElement>('.quick-open-input')!;
  expect(document.activeElement).toBe(input); expect(document.querySelector('.quick-open-note')!.textContent).toBe('Loading files…');
  await shown;
  expect(names()).toHaveLength(6); expect(document.querySelector('[role=dialog]')!.getAttribute('aria-label')).toBe('Open Quickly');
  type(input, 'guide'); expect(names()).toEqual(['guide.md', 'guide-draft.txt']);
  key(input, 'ArrowDown'); expect(document.querySelector('li.active .quick-open-name')!.textContent).toBe('guide-draft.txt');
  key(input, 'ArrowDown'); expect(document.querySelector('li.active .quick-open-name')!.textContent).toBe('guide.md');
  key(input, 'ArrowUp'); key(input, 'Enter');
  expect(h.open).toHaveBeenCalledWith('/proj/notes/guide-draft.txt'); expect(document.querySelector('.quick-open')).toBeNull();
  expect(h.restoreFocus).not.toHaveBeenCalled();
});

it('closes with Escape or a click outside and gives the focus back, and ignores Enter during text composition', async () => {
  const h = host(), quick = quickOpen(h); await quick.show();
  const input = document.querySelector<HTMLInputElement>('.quick-open-input')!;
  key(input, 'Enter', { isComposing: true }); expect(h.open).not.toHaveBeenCalled(); expect(document.querySelector('.quick-open')).not.toBeNull();
  key(input, 'Escape'); expect(document.querySelector('.quick-open')).toBeNull(); expect(h.restoreFocus).toHaveBeenCalledTimes(1);
  await quick.show(); document.querySelector('.quick-open-backdrop')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  expect(document.querySelector('.quick-open')).toBeNull(); expect(h.restoreFocus).toHaveBeenCalledTimes(2);
  await quick.show(); type(document.querySelector<HTMLInputElement>('.quick-open-input')!, 'zzz');
  expect(document.querySelector('.quick-open-note')!.textContent).toBe('No matching files.');
  key(document.querySelector<HTMLInputElement>('.quick-open-input')!, 'Enter'); expect(h.open).not.toHaveBeenCalled(); quick.close();
});

it('opens a file with a click, and reports a missing folder or a failed listing without a stale list', async () => {
  const h = host(), quick = quickOpen(h); await quick.show();
  document.querySelectorAll('.quick-open-list li')[1].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  expect(h.open).toHaveBeenCalledWith('/proj/docs/guide.md');
  const none = quickOpen(host({ list: async () => 'Open a folder first.' })); await none.show();
  expect(document.querySelector('.quick-open-note')!.textContent).toBe('Open a folder first.'); expect(names()).toEqual([]); none.close();
  const rejected = quickOpen(host({ list: async () => { throw new Error('boom'); } }));
  await expect(rejected.show()).rejects.toThrow('boom'); rejected.close();
});

it('tells when the list is cut or long, and shows one dialog even when opened twice', async () => {
  const many = quickFiles('/p', Array.from({ length: 80 }, (_, index) => `/p/file-${index}.md`));
  const quick = quickOpen(host({ list: async () => ({ files: many, incomplete: true }) })); await quick.show();
  expect(document.querySelector('.quick-open-note')!.textContent).toBe('Showing 50 of 80 matching files. Type more to narrow the list.');
  const again = quick.show(); await again; expect(document.querySelectorAll('.quick-open')).toHaveLength(1); quick.close();
  const small = quickOpen(host({ list: async () => ({ files, incomplete: true }) })); await small.show();
  expect(document.querySelector('.quick-open-note')!.textContent).toBe('The folder is large, so this list is not complete.'); small.close();
});
