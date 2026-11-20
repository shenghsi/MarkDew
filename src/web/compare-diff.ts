import { Change, diff, type DiffConfig } from '@codemirror/merge';

const SMALL_TEXT_LIMIT = 2000;
const MAX_UNIQUE_LINES = 0xD800 + (0x10000 - 0xE000) - 1;
const LINE_SCAN_LIMIT = 4000;
const HUNK_SCAN_LIMIT = 2000;
const TOTAL_BUDGET_MS = 250;
const HUNK_BUDGET_MS = 50;

function splitLines(text: string): { lines: string[]; offsets: number[] } {
  const lines: string[] = [];
  const offsets: number[] = [0];
  let start = 0;
  while (start < text.length) {
    const nl = text.indexOf('\n', start);
    const end = nl === -1 ? text.length : nl + 1;
    lines.push(text.slice(start, end));
    offsets.push(end);
    start = end;
  }
  return { lines, offsets };
}

function encodeLineId(id: number): string {
  // Skip UTF-16 surrogate code units (0xD800..0xDFFF) so @codemirror/merge's
  // validIndex check treats every encoded line as a single character.
  return String.fromCharCode(id < 0xD800 ? id : id + 0x800);
}

// Two-pass diff: align unchanged lines across the whole document first, then
// refine each changed hunk at character granularity. This keeps word-level
// precision in modified paragraphs even when large edits exist elsewhere in
// the file (where @codemirror/merge's default scanLimit: 500 falls back to
// coarse matching).
export function compareDiff(a: string, b: string): Change[] {
  if (a === b) return [];
  if (a.length <= SMALL_TEXT_LIMIT && b.length <= SMALL_TEXT_LIMIT) {
    return Array.from(diff(a, b, { scanLimit: HUNK_SCAN_LIMIT, timeout: HUNK_BUDGET_MS }));
  }

  const linesA = splitLines(a);
  const linesB = splitLines(b);
  const ids = new Map<string, string>();
  let nextId = 0;

  const encode = (lines: string[]): string | null => {
    const chars: string[] = [];
    for (const line of lines) {
      let ch = ids.get(line);
      if (ch === undefined) {
        if (nextId >= MAX_UNIQUE_LINES) return null;
        ch = encodeLineId(nextId++);
        ids.set(line, ch);
      }
      chars.push(ch);
    }
    return chars.join('');
  };

  const encA = encode(linesA.lines);
  const encB = encA === null ? null : encode(linesB.lines);
  if (encA === null || encB === null) {
    return Array.from(diff(a, b, { scanLimit: LINE_SCAN_LIMIT, timeout: TOTAL_BUDGET_MS }));
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const lineHunks = diff(encA, encB, { scanLimit: LINE_SCAN_LIMIT, timeout: 150 });
  const changes: Change[] = [];

  for (const hunk of lineHunks) {
    const fromA = linesA.offsets[hunk.fromA];
    const toA = linesA.offsets[hunk.toA];
    const fromB = linesB.offsets[hunk.fromB];
    const toB = linesB.offsets[hunk.toB];
    if (fromA === toA || fromB === toB) {
      changes.push(new Change(fromA, toA, fromB, toB));
      continue;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      changes.push(new Change(fromA, toA, fromB, toB));
      continue;
    }
    const inner = diff(a.slice(fromA, toA), b.slice(fromB, toB), {
      scanLimit: HUNK_SCAN_LIMIT,
      timeout: Math.min(HUNK_BUDGET_MS, remaining),
    });
    for (const change of inner) {
      changes.push(new Change(fromA + change.fromA, fromA + change.toA, fromB + change.fromB, fromB + change.toB));
    }
  }

  return changes;
}

export const compareDiffConfig: DiffConfig = { override: compareDiff };
