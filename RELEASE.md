# MarkDew v1.2.3

## What is new

- Linux Open With lists MarkDew for Markdown and text files. The desktop entry now accepts file arguments and includes the text/x-markdown MIME alias.

- HTML table cells stay formatted during live editing. Paragraphs, bold text, and merged cells remain visible without HTML markup.
- Insert HTML tables from the editor's right-click menu under Insert.
- Right-click an HTML table cell to insert or delete rows and columns, align content, merge cells, or split ordinary and merged cells into rows or columns.
- HTML tables use the same resize grid and toolbar icons as Markdown tables. The toolbar has table size, alignment, and delete controls. Empty columns have a minimum width.
- Table controls hide when you click elsewhere. Undo and Redo shortcuts work inside formatted HTML table cells.
- Markdown table cells wrap text during live editing. Single tildes stay literal; double tildes still apply strikethrough.
- Mermaid diagrams have more maximum-height options.

## In-app updates

- Select **Check for Updates** in Settings > General or Tools > About MarkDew. When a new stable version is available, select **Update and Restart**. The app also checks at startup (once every 24 hours) and shows the same button in a notice; the check can be turned off in Settings > General.
- The app downloads the update, checks its signature, installs it, and restarts. Download progress is shown in the app.
- Linux DEB updates open the system password dialog. MarkDew does not collect or store the password. Cancel keeps the app open.
- Save all documents and close other MarkDew windows before you install an update. A failed update keeps the app open and permits a retry.

Packages include macOS Apple Silicon and Intel DMG disk images, a Linux x64 DEB
package, and a Windows x64 NSIS installer. The release also includes install
scripts, signed update packages, latest.json, package manifests, and SHA256SUMS.
Linux requires a desktop polkit authentication agent. The DEB declares its pkexec dependency.

macOS packages use ad-hoc signing without notarization. Windows and Linux
packages have no publisher certificate. Package builds do not establish native
input, IME, Save, or recovery acceptance. Native update installation, the password
dialog, and restart still need checks on each supported platform.
