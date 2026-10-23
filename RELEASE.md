# MarkDew v1.1.3

## What is new

- **Fix:** On Linux, the menu bar now follows the language you choose in Settings.
- **New:** A Simplified Chinese README.
- Everything in v1.1.2 is included: Open Quickly on Ctrl+P, Print on Alt+Shift+P, the macOS print dialog, the correct version in About, print and export (PDF, PNG), import and export through Pandoc, Mermaid diagrams in exports, list nesting with Tab, the right-click editor menu, and the font and image settings.
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
