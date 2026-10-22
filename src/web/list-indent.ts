import { ChangeSet, EditorSelection, type ChangeSpec } from '@codemirror/state';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { editGuard } from './edit-guard';

const sourceBlocks = ['FencedCode', 'CodeBlock', 'HTMLBlock', 'Table', 'Frontmatter', 'MathBlock'];
const marker = /^( *)([-*+]|\d{1,9}[.)])( +)/;

interface Item { indent: number; content: number; number: number | null; digits: [number, number] }
// Parse a list item line. `content` is where nested text must start.
function parse(text: string): Item | null {
  const match = marker.exec(text);
  if (!match) return null;
  const indent = match[1].length, symbol = match[2];
  return { indent, content: indent + symbol.length + (match[3].length > 4 ? 1 : match[3].length),
    number: /^\d/.test(symbol) ? Number(symbol.slice(0, -1)) : null, digits: [indent, indent + symbol.length - 1] };
}

// Tab nests a list item under its previous item, Shift-Tab moves it out. The item
// takes its nested lines along, any list type can nest in any other, and ordered
// numbers follow their new level.
export function indentList(view: EditorView, direction: 1 | -1): boolean {
  if (editGuard(view)) return false;
  const { state } = view, selection = state.selection.main, doc = state.doc;
  const first = doc.lineAt(selection.from);
  const last = doc.lineAt(selection.to > selection.from && doc.lineAt(selection.to).from === selection.to ? selection.to - 1 : selection.to);
  const tree = ensureSyntaxTree(state, state.doc.length, 50);
  if (!tree) return false;
  let blocked = false;
  tree.iterate({ from: first.from, to: last.to, enter(ref) { if (sourceBlocks.includes(ref.name)) blocked = true; } });
  if (blocked) return false;

  const parsed = (number: number) => parse(doc.line(number).text);
  const roots: { line: number; item: Item }[] = [];
  let covered = 0;
  for (let number = first.number; number <= last.number; number++) {
    const item = parsed(number);
    if (!item || number <= covered) continue;
    roots.push({ line: number, item }); covered = subtreeEnd(number, item.indent);
  }
  if (!roots.length) return false;

  function subtreeEnd(number: number, indent: number): number {
    let end = number;
    for (let next = number + 1; next <= doc.lines; next++) {
      const text = doc.line(next).text;
      if (!text.trim()) continue;
      if (/^ */.exec(text)![0].length <= indent) break;
      end = next;
    }
    return end;
  }
  // The nearest earlier item that can be this item's sibling (to nest under) or parent (to leave).
  function target(number: number, item: Item): number | null {
    for (let up = number - 1; up >= 1; up--) {
      const before = parsed(up);
      if (!before) continue;
      if (direction > 0 && before.indent <= item.indent) return item.indent < before.content ? before.content : null;
      if (direction < 0 && before.indent < item.indent) return before.indent;
    }
    return direction < 0 ? 0 : null;
  }

  const changes: ChangeSpec[] = [], moved = new Set<number>();
  let lowest = Infinity, highest = 0;
  for (const { line, item } of roots) {
    const to = target(line, item);
    if (to === null || to === item.indent) continue;
    const delta = to - item.indent;
    lowest = Math.min(lowest, line); highest = Math.max(highest, subtreeEnd(line, item.indent));
    moved.add(line);
    for (let number = line; number <= subtreeEnd(line, item.indent); number++) {
      const text = doc.line(number), indent = /^ */.exec(text.text)![0].length;
      if (!text.text.trim()) continue;
      if (delta > 0) changes.push({ from: text.from, insert: ' '.repeat(delta) });
      else changes.push({ from: text.from, to: text.from + Math.min(-delta, indent) });
    }
  }
  if (!changes.length) return true;

  const shift = ChangeSet.of(changes, doc.length), next = shift.apply(doc);
  // Renumber ordered lists around the moved lines, as one list at each level.
  const start = next.lineAt(shift.mapPos(doc.line(lowest).from, -1)).number;
  const end = next.lineAt(shift.mapPos(doc.line(highest).to, 1)).number;
  let from = start, to = end;
  const listLine = (n: number) => { const text = next.line(n).text; return !!text.trim() && (!!parse(text) || text.startsWith(' ')); };
  while (from > 1 && listLine(from - 1)) from--;
  while (to < next.lines && listLine(to + 1)) to++;
  const movedStarts = new Set(Array.from(moved, line => next.lineAt(shift.mapPos(doc.line(line).from, 1)).number));
  const levels: { indent: number; content: number; next: number | null }[] = [];
  const numbers: ChangeSpec[] = [];
  for (let number = from; number <= to; number++) {
    const line = next.line(number), item = parse(line.text);
    if (!item) continue;
    while (levels.length && item.indent < levels[levels.length - 1].indent) levels.pop();
    let level = levels[levels.length - 1];
    if (!level || item.indent >= level.content) {
      level = { indent: item.indent, content: item.content, next: null }; levels.push(level);
      if (item.number !== null) level.next = movedStarts.has(number) ? 1 : item.number;
    } else if (item.number !== null && level.next === null) level.next = item.number;
    if (item.number === null) { level.next = null; continue; }
    const wanted = level.next!; level.next = wanted + 1;
    if (wanted !== item.number) numbers.push({ from: line.from + item.digits[0], to: line.from + item.digits[1], insert: String(wanted) });
  }
  const all = numbers.length ? shift.compose(ChangeSet.of(numbers, next.length)) : shift;
  view.dispatch({ changes: all, selection: EditorSelection.create(state.selection.ranges.map(range => range.map(all, 1)), state.selection.mainIndex),
    userEvent: 'input.indent', scrollIntoView: true });
  return true;
}
