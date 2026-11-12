# MarkDew v1.6.3

## What is new

- New: **Compare**. Right-click a file in Files, or right-click in the editor, and choose **Compare…** to see changes against Git history. Compare the current file with the last commit, the staged copy, or any earlier commit, or compare two commits. Use side-by-side or inline view. You can edit the current file in the view, then choose **Apply edits** and Save. It needs Git installed.
- New: in Compare, choose **Show changes in a commit…** to see what one commit changed, in one step.
- Fixed: a rare false "Recovery session is active" error when another program started at the same moment.
- New: in Compare, side-by-side panes now scroll together. Scroll one side and the other follows.
- Includes everything in v1.5.1: the Find and Replace focus fix, and the Body text size setting.

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
