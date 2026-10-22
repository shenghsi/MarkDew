import { Text } from '@codemirror/state';

// One normalized snapshot per construction call. Neither the snapshot nor its
// last-line cache belongs in an editor plan or a persistent cache.
export function physicalLines(doc: Text) {
  let source: string | undefined, current: { readonly from: number; readonly to: number } | undefined;
  const text = () => source ??= doc.toString();
  return {
    lineAt(position: number): { readonly from: number; readonly to: number } {
      if (!Number.isInteger(position) || position < 0 || position > doc.length) {
        const { from, to } = doc.lineAt(position); return { from, to };
      }
      if (current && position >= current.from && position <= current.to) return current;
      const source = text();
      const from = position === 0 ? 0 : source.lastIndexOf('\n', position - 1) + 1;
      const newline = source.indexOf('\n', position), to = newline < 0 ? source.length : newline;
      return current = { from, to };
    },
    slice: (from: number, to: number): string => text().slice(from, to),
  };
}
