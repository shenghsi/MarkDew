import { EditorState, StateEffect, StateField } from '@codemirror/state';
import { invertedEffects, isolateHistory } from '@codemirror/commands';

export interface SourceRecord { readonly raw: string; readonly bom: boolean }
export const normalize = (text: string) => text.replace(/\r\n|\r/g, '\n');
export function fromSource(source: string): SourceRecord {
  const bom = source.startsWith('\uFEFF');
  return { bom, raw: bom ? source.slice(1) : source };
}
export const savedSource = (record: SourceRecord) => (record.bom ? '\uFEFF' : '') + record.raw;

function crlfPositions(raw: string): number[] {
  const positions: number[] = [];
  if (!raw.includes('\n')) return positions;
  for (let offset = raw.indexOf('\r\n'); offset >= 0; offset = raw.indexOf('\r\n', offset + 2))
    positions.push(offset - positions.length);
  return positions;
}
const offsetIndexes = new WeakMap<SourceRecord, number[]>();
function indexedOffset(rawLength: number, positions: number[], position: number): number {
  // Match the original UTF-16 walk, including fractional and invalid inputs.
  if (!(position > 0)) return 0;
  position = Math.ceil(position);
  if (position >= rawLength - positions.length) return rawLength;
  let low = 0, high = positions.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (positions[middle] < position) low = middle + 1; else high = middle;
  }
  return position + low;
}
export const rawOffset = (raw: string, position: number): number => indexedOffset(raw.length, crlfPositions(raw), position);
export function sourceOffset(record: SourceRecord, position: number): number {
  let positions = offsetIndexes.get(record);
  if (!positions) { positions = crlfPositions(record.raw); offsetIndexes.set(record, positions); }
  return indexedOffset(record.raw.length, positions, position);
}
export const viewOffset = (raw: string, position: number) => normalize(raw.slice(0, position)).length;
export const lineEnding = (raw: string) => /\r\n|\r|\n/.exec(raw)?.[0] || '\n';

export const restoreSource = StateEffect.define<SourceRecord>();
export const sourceField = StateField.define<SourceRecord>({
  create: state => ({ raw: state.doc.toString(), bom: false }),
  update(record, transaction) {
    const restores = transaction.effects.filter(effect => effect.is(restoreSource));
    if (restores.length) return restores[restores.length - 1].value;
    if (!transaction.docChanged) return record;
    const edits: { from: number; to: number; text: string }[] = [];
    transaction.changes.iterChanges((from, to, _a, _b, inserted) => {
      edits.push({ from: sourceOffset(record, from), to: sourceOffset(record, to),
        text: inserted.toString().replace(/\n/g, lineEnding(record.raw)) });
    });
    let raw = record.raw;
    for (const edit of edits.reverse()) raw = raw.slice(0, edit.from) + edit.text + raw.slice(edit.to);
    return { ...record, raw };
  },
});

export function sourceExtensions(record: SourceRecord) {
  return [sourceField.init(() => record), EditorState.lineSeparator.of('\n'),
    invertedEffects.of(transaction => transaction.docChanged
      ? [restoreSource.of(transaction.startState.field(sourceField))] : []),
    EditorState.transactionExtender.of(transaction => transaction.docChanged
      ? { annotations: isolateHistory.of('full') } : null)];
}
