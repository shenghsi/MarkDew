import { diff } from '@codemirror/merge';

// Compare exact source, including BOM and line endings. A coarse diff can
// refuse a merge, but must never remove an editor change.
export function mergeFileChange(baseline: string, editor: string, disk: string): string | undefined {
  if (editor === baseline || editor === disk) return disk;
  if (disk === baseline) return editor;
  const local = diff(baseline, editor, { scanLimit: 1000, timeout: 50 });
  const remote = diff(baseline, disk, { scanLimit: 1000, timeout: 50 });
  const edits = [...local];
  let localStart = 0;
  for (const change of remote) {
    while (localStart < local.length && local[localStart].toA < change.fromA) localStart++;
    let shared = false;
    for (let index = localStart; index < local.length && local[index].fromA <= change.toA; index++) {
      const own = local[index];
      if (own.fromA === change.fromA && own.toA === change.toA &&
          editor.slice(own.fromB, own.toB) === disk.slice(change.fromB, change.toB)) {
        shared = true; continue;
      }
      // Insertions at a shared boundary have an ambiguous order. Adjacent
      // replacements of separate source ranges can be combined.
      const insertion = own.fromA === own.toA || change.fromA === change.toA;
      const overlap = insertion
        ? own.fromA <= change.toA && change.fromA <= own.toA
        : own.fromA < change.toA && change.fromA < own.toA;
      if (overlap) return undefined;
    }
    if (!shared) edits.push(change);
  }
  const localChanges = new Set(local);
  const replacements = edits.map(change => ({ from: change.fromA, to: change.toA,
    insert: (localChanges.has(change) ? editor : disk).slice(change.fromB, change.toB) }));
  let merged = baseline;
  for (const edit of replacements.sort((a, b) => b.from - a.from)) {
    merged = merged.slice(0, edit.from) + edit.insert + merged.slice(edit.to);
  }
  return merged;
}
