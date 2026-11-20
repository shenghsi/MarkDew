import { describe, expect, it } from 'vitest';
import { applyReferenceChanges, moveReferenceChanges } from '../../src/web/move-references';
const rewrite = (source: string, origin = '/project/index.md', old = '/project/notes', next = '/project/archive/notes') =>
  applyReferenceChanges(source, moveReferenceChanges(source, origin, old, next));

describe('file move reference updates', () => {
  it('updates links, images, shared definitions, and HTML attributes with fragments and titles intact', () => {
    const source = '[Note](notes/a.md#part "Read")\n![Pic](<notes/a b.png>)\n\n[ref]: notes/a.md "Title"\n\n<a href="notes/a.md#part">Note</a> <img src="notes/a.png">';
    expect(rewrite(source)).toBe('[Note](archive/notes/a.md#part "Read")\n![Pic](<archive/notes/a%20b.png>)\n\n[ref]: archive/notes/a.md "Title"\n\n<a href="archive/notes/a.md#part">Note</a> <img src="archive/notes/a.png">');
  });
  it('rebases outgoing links in moved documents and keeps links inside a moved folder valid', () => {
    expect(rewrite('[Home](../index.md) ![Pic](a.png) [Elsewhere](../other/b.md)', '/project/notes/a.md'))
      .toBe('[Home](../../index.md) ![Pic](a.png) [Elsewhere](../../other/b.md)');
  });
  it('leaves code, front matter, web links, fragment links, labels, and unrelated paths intact', () => {
    const source = '---\nexample: "[note](notes/a.md)"\n---\n\n`[note](notes/a.md)`\n\n```md\n[note](notes/a.md)\n```\n\n[notes/a.md](other.md) [Web](https://example.org/notes/a.md) [Section](#notes/a.md)';
    expect(rewrite(source)).toBe(source);
  });
  it('keeps BOM, CRLF, percent escapes, Unicode names, and native absolute paths valid', () => {
    expect(rewrite('\uFEFF[Note](notes/%E6%96%87.md#hi)\r\n[Absolute](/project/notes/a.md)\r\n'))
      .toBe('\uFEFF[Note](archive/notes/%E6%96%87.md#hi)\r\n[Absolute](/project/archive/notes/a.md)\r\n');
    expect(rewrite('[Note](notes/a.md)', 'C:\\project\\index.md', 'C:\\project\\notes', 'C:\\project\\archive\\notes'))
      .toBe('[Note](archive/notes/a.md)');
  });
  it('does not confuse a folder prefix with a different folder', () => {
    expect(rewrite('[Note](notes-old/a.md) [Broken](notes/%ZZ.md)')).toBe('[Note](notes-old/a.md) [Broken](notes/%ZZ.md)');
  });
  it('rebases file links when only the citing file moves', () => {
    expect(rewrite('[Pic](images/a.png)', '/project/index.md', '/project/index.md', '/project/docs/index.md'))
      .toBe('[Pic](../images/a.png)');
  });
});

it('leaves non-path HTML attributes and script content unchanged', () => {
  const source = `<img data-src="notes/a.png" title='src="notes/a.png"'>\n\n<script>const sample = '<img src="notes/a.png">';</script>`;
  expect(rewrite(source)).toBe(source);
});

it('leaves formula source unchanged', () => {
  const source = '$[a](notes/a.md)$\n\n$$\n[a](notes/a.md)\n$$';
  expect(rewrite(source)).toBe(source);
});

it('matches ordinary Windows links to canonical verbatim paths', () => {
  expect(rewrite('[Note](C:/project/notes/a.md) [Relative](notes/a.md)', String.raw`\\?\C:\project\index.md`, String.raw`\\?\C:\project\notes`, String.raw`\\?\C:\project\archive\notes`))
    .toBe('[Note](C:/project/archive/notes/a.md) [Relative](archive/notes/a.md)');
});
