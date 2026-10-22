# MarkDew Product Target

## Product statement

Typora is the reference for the user experience and Markdown feature set.
Development milestones must move toward that complete writing experience.

The user supplied [typora-layout.png](typora-layout.png) as the layout reference.
It shows a compact title bar, a left file sidebar, and a clear writing area.
The document title is centered in the title bar. Word count and small view
controls sit at the right. The file tree has its own scroll area. The edit
surface has a separate vertical scroll area and no permanent preview pane.
Document controls must be available without a permanent wall of toolbar buttons.
The writing area uses readable text, generous margins, and clear heading levels.
These layout requirements are part of the final writing experience.

MarkDew is a native Markdown editor for focused writing. It shows the formatted
document in the edit surface. It shows Markdown marks only when the writer needs
them. The Markdown source is always the primary document.

MarkDew uses CodeMirror 6 in a Tauri desktop WebView. CodeMirror owns input,
selection, and history. TypeScript edit commands supply source edits.
The source record retains the original text, BOM, and line endings. Rust supplies
native file effects. Package parsers and renderers supply the formatted surface.

## Final user experience

A writer can open a Markdown file and edit the formatted document directly.
The cursor, selection, and undo history remain stable when Markdown marks become
visible or hidden. Save does not replace valid source with generated Markdown.

The main writing surface provides Typora-style live preview. A writer edits the
formatted document directly. Inline and block marks appear when needed for
editing and hide when the content is rendered. Source mode remains available.
Tables can be edited as tables. LaTeX mathematics and Mermaid diagrams render
within the document and retain editable source. HTML and code blocks are part
of the same document workflow. Rendering errors must retain the editable source.

The final product must support:

- CommonMark and useful GitHub Markdown extensions.
- Headings, paragraphs, links, emphasis, strong text, lists, task lists, quotes,
  code, tables, footnotes, images, LaTeX mathematics, Mermaid diagrams,
  inline and block HTML, and front matter.
- Chinese, Japanese, Korean, bidirectional text, emoji, and combining marks.
- Native IME, clipboard, drag and drop, file dialogs, and accessibility.
- Search, replace, outline navigation, themes, and document tabs.
- Crash recovery, atomic save, file-change detection, and conflict handling.
- PDF and image export.
- Responsive editing of a 1 MiB document.
- macOS, Linux, and Windows. Each platform needs its own build and input checks.

## Source-of-truth rule

The Markdown byte sequence is the only saved representation. The formatted edit
surface is a projection of that sequence. Every visible item has a source range.
Rendering must not silently normalize or replace source text.

## System boundary

### Editor

CodeMirror owns the edit surface and history. A source record maps normalized
edit-surface positions to the original source. History restores both records.
Live preview uses decorations and widgets. Selected widgets reveal source.
MathJax supplies math. A Markdown math extension supplies formula source ranges.
Mermaid supplies diagrams. Browser HTML is isolated from
the app. CodeMirror language packages supply code highlighting.

### Native host

The native host owns:

- The window and event loop.
- Keyboard, pointer, IME, and accessibility events.
- Clipboard, file dialogs, file watching, and atomic file replacement.
- Font discovery, shaping, glyph rasterization, and GPU presentation.
- Image decoding and operating-system integration.

The Rust host owns file effects. The WebView owns text layout and drawing.
Neither a rendered widget nor a generated Markdown serialization may replace
the source record during Save. HTML must not run scripts or app commands.

Each supported operating system implements the same host effect contract.
Platform adapters may differ, but document state and commands must not differ.

## Performance targets

- A key event updates the next frame in less than 16 ms at the 95th percentile.
- A 1 MiB document opens to a readable first frame in less than 150 ms on the
  reference computer.
- A local edit reparses only the required Markdown region.
- Idle memory for a 100 KiB document stays below 100 MiB.

These values are product targets. Benchmarks must define the reference computer,
input files, build mode, and sample count.

## Correctness targets

Tests must check:

- Source preservation.
- Valid cursor and selection positions.
- Edit and inverse-edit behavior.
- Undo and redo behavior.
- Full and incremental parser equivalence.
- Exact source-to-view mapping.
- Safe save and recovery state transitions.

The web tests check CodeMirror, the source record, and the renderers. The Rust
tests check file effects. These are tests, not proofs. The earlier Bend laws and
proofs are on the `bend-core` branch. They do not prove the WebView's behavior.

## Development plan

[ROADMAP.md](ROADMAP.md) tracks the experiments and their evidence. Experiments
are development steps. They do not reduce the product requirements in this file.

## First release gate

The first public release is ready only when a writer can use direct formatting
with a Chinese or Japanese IME, undo every edit, recover an interrupted session,
and save without source loss.
