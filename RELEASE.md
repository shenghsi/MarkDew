# MarkDew v1.0.0

This is the first release of MarkDew. The app was named MarkBend through v1.0.10 in the former repository, [shenghsi/MarkBend](https://github.com/shenghsi/MarkBend). The version number starts again at 1.0.0. The app has no Bend compiler.

- MarkDew has a new name, a new update signing key, and a new repository.
- **Users of MarkBend must install MarkDew manually once.** MarkBend cannot update to MarkDew, because the update key and the update address are new.
- Later releases can use the in-app updater.

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
