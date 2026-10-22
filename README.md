# MarkDew

MarkDew is a Markdown editor for the desktop. It shows a live preview and keeps
the Markdown source one click away.

- Live preview with source reveal
- Markdown and code highlighting
- MathJax formulas, Mermaid diagrams, tables, and isolated HTML
- Light, Dark, and System themes
- Files sidebar, Outline, and tabs for many documents
- In-app updates

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
