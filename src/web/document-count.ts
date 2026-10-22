export interface DocumentCount { words: number; characters: number }

// This counts the complete source text, not a generated Markdown projection.
export function countDocument(text: string): DocumentCount {
  const segments = new Intl.Segmenter('en', { granularity: 'word' }).segment(text);
  let words = 0, characters = 0;
  for (const part of segments) if (part.isWordLike) words++;
  for (const _point of text) characters++;
  return { words, characters };
}
