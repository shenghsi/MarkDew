# MarkDew v1.4.0

## What is new

- **Settings > Files > Show all file types in the Files sidebar** (off by default). When it is on, the Files sidebar shows all files. Markdown and text files open in MarkDew. Double-click another file, or press Enter, to open it in the system default app.
- MarkDew does not start programs from the sidebar. Scripts, installers, and files that can run (for example .exe, .sh, .command, .webloc, or a file with an execute bit) are only shown in Finder or Explorer.
- Includes everything in v1.3.0: the New Tab button, start with no file open, and remembered project files.

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
