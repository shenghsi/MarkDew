# Portability Contract

## Active desktop app

The active app uses CodeMirror 6 in a Tauri WebView on macOS, Linux, and Windows.
The source record retains exact UTF-8, BOM, and line endings. Rust owns file
effects, baselines, and recovery. The earlier Bend core is on the `bend-core`
branch. The older native Bend adapters and their effect contract are on the
local `experiments` branch.

The portability workflow verifies one frontend artifact before native tests and
builds on all three systems. Its default outputs are debug executables. The
manual build_packages option creates unsigned test packages: macOS DMG disk image,
Linux DEB, and Windows NSIS. Archives include a checkout and hash manifest.
No signing or publication runs. Local macOS package construction and DMG
structure have checks. Windows/Linux package runners, installation,
native IME, and platform runtime acceptance remain open.

## Rule

Native launch paths use the shared guarded Open workflow after recovery startup.
macOS also receives application Open events. Windows and Linux receive paths or
file URLs from launch arguments. No single-instance routing is claimed.
macOS declares Alternate document associations. Linux declares MIME types.
Windows disables the bundled default-association macros and uses owned Open With
registry values instead. Both NSIS hooks compile with makensis 3.13 on macOS;
Windows CI requires their compilation, even for debug builds. This is compiler
evidence, not a Windows registry or native input check. Installation and OS Open
acceptance on all three systems remain open.

The editor and its edit commands must not contain operating-system branches.

## Platform checks

`.github/workflows/portability.yml` runs `npm test` and `npm run build` once,
then runs the Rust tests and the desktop build on macOS, Linux, and Windows.
A pull request must pass all jobs before merge.
