# MarkDew v1.0.10

This release removes the Bend compiler from the app, the build, and CI.

- Return in a flat list item or an ordinary line now uses a TypeScript command. It gives the same results as the earlier Bend command, and it plans the edit from the current line only, so Return in a large document no longer waits for a full document scan.
- One case changes: Return at the end of a list item below a line such as ```` ```a`b ```` now continues the list. Markdown does not read that line as a code fence, and the preview already showed it as a paragraph.
- The About dialog no longer names the Bend proof engine.
- The earlier Bend core, laws, proofs, and checks are on the `bend-core` branch.

v1.0.9 moved the native Bend adapter experiments out of the main source tree. v1.0.8 added automatic update checks at startup, at most once every 24 hours.

## In-app updates

- Select **Check for Updates** in Settings > General or Tools > About MarkDew. When a new stable version is available, select **Update and Restart**. The app also checks at startup (once every 24 hours) and shows the same button in a notice; the check can be turned off in Settings > General.
- The app downloads the update, checks its signature, installs it, and restarts. Download progress is shown in the app.
- Linux DEB updates open the system password dialog. MarkDew does not collect or store the password. Cancel keeps the app open.
- Save all documents and close other MarkDew windows before you install an update. A failed update keeps the app open and permits a retry.

**Users on v1.0.5 or earlier must install v1.0.7 manually once.** Later releases can use the in-app updater.

Packages include macOS Apple Silicon and Intel DMG disk images, a Linux x64 DEB
package, and a Windows x64 NSIS installer. The release also includes install
scripts, signed update packages, latest.json, package manifests, and SHA256SUMS.
Linux requires a desktop polkit authentication agent. The DEB declares its pkexec dependency.

macOS packages use ad-hoc signing without notarization. Windows and Linux
packages have no publisher certificate. Package builds do not establish native
input, IME, Save, or recovery acceptance. Native update installation, the password
dialog, and restart still need checks on each supported platform.
