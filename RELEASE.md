# MarkDew v1.1.0

## What is new

- **Print and export:** Print… opens the system print dialog. Export → PDF… saves a PDF file directly, with no dialog. Export → Image (PNG)… saves the pages as a picture.
- **Import and export through Pandoc:** Import reads Word, OpenOffice, RTF, Epub, LaTeX, Media Wiki, reStructuredText, Textile, OPML, and HTML. Export writes HTML, Word, OpenOffice, RTF, Epub, LaTeX, and other formats. MarkDew needs a Pandoc that you install yourself.
- **Mermaid diagrams in exports:** Each diagram is drawn as a picture at its real size, including in OpenOffice files.
- **Editor:** Tab and Shift-Tab nest list items. A right-click editor menu, horizontal rules, equation blocks, font and image settings, an empty state with no open file, and Open dialogs that start in the current folder.
- **Fixes:** One tab for each file, even when the path has a link or a different letter case. Deleting a file closes its tab.
- The PDF export on Windows and Linux builds in CI but has no native acceptance check yet.

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
