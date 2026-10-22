This is a test build for a small group of testers. It is not a stable release.

Packages include macOS Apple Silicon and Intel DMG packages, a Linux x64 DEB, and a
Windows x64 NSIS installer. Verify SHA256SUMS before installation. Linux packages
are built on Ubuntu 22.04; support for other distributions is not established.

The Mac apps have ad-hoc signatures. They have no Apple Developer ID signature
or notarization. Windows has no publisher certificate. The operating system may
prevent installation or launch. Do not disable system security to test them.

Use copies of documents and keep backups. Native installation, Chinese/Japanese
IME, clipboard, accessibility, Open, Save, conflict handling, crash recovery,
and export still need checks on each supported platform. Windows directory
durability is not established. Large-document speed targets remain open.

For each problem, report the package filename, operating system and architecture,
steps, expected result, and actual result. Include a small example document if
it contains no private data. Check that source text, Undo/Redo, and saved bytes
remain exact before using the app with important documents.
