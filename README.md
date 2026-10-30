# MarkDew

English | [简体中文](README.zh-CN.md)

MarkDew is a Markdown editor for the desktop. It shows a live preview and keeps
the Markdown source one click away.

- Live preview with source reveal
- Markdown and code highlighting
- Edit formatted HTML tables in live preview without exposing their markup
- Merge and split HTML table cells, including cells that are not merged
- Edit and resize both HTML and Markdown tables
- MathJax formulas, Mermaid diagrams, and isolated HTML
- Light, Dark, and System themes
- Files sidebar, Outline, and tabs for many documents
- In-app updates

## Table editing

MarkDew lets you edit supported HTML tables in the live preview. Cell text keeps
its formatting, and the table keeps its dimensions. Use the cell menu to add or
remove rows and columns, align, merge, or split cells. Resize and align the whole
table from its toolbar.

Markdown tables have live cell editing too. Add or remove rows and columns,
resize the table, and set row height or alternating row colors from the table
controls. Right-click in the editor and select **Insert > HTML table** to add a
formatted table to a document.

MarkDew was named MarkBend through v1.0.10. The Bend compiler is no longer part
of the app. Earlier releases and the Bend history are in the former repository,
[shenghsi/MarkBend](https://github.com/shenghsi/MarkBend).

## Install

**Linux and macOS**:

```sh
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.sh | sh
```

**Windows (PowerShell)**:

```powershell
irm https://github.com/shenghsi/MarkDew/releases/latest/download/markdew-installer.ps1 | iex
```

Or download a package from the
[latest release](https://github.com/shenghsi/MarkDew/releases/latest): macOS
DMG (Apple Silicon or Intel), Linux DEB, or Windows EXE.

To update, select **Tools > About MarkDew > Check for Updates**. See
[UPDATES.md](UPDATES.md).

## Develop

You need Node.js, Rust, and the Tauri platform tools.

```sh
npm ci
npm run desktop         # run the app
npm run desktop:build   # build packages
npm test                # run the checks
```

Source is in `src/web/` and `src/desktop/`. Tests are in `tests/`.

More documents: [TARGET.md](TARGET.md), [ROADMAP.md](ROADMAP.md),
[RELEASE.md](RELEASE.md), [PORTABILITY.md](PORTABILITY.md),
[BENCHMARKS.md](BENCHMARKS.md).

## License

MarkDew has two licenses:

- **Open source and personal use**: AGPL-3.0-or-later.
- **Commercial use**: you need a commercial license to use MarkDew for commercial
  operations, to embed it in proprietary software, or to offer hosted services
  without the AGPL obligations.

See [LICENSE](LICENSE).
