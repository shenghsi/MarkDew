App updates use tauri-plugin-updater 2.14 with a pinned public key and required
signed version. Native state retains the checked update. A separate update gate
excludes window creation and a second install until failure or restart. Exactly
one main window is required; the current Quit gate is not used to approve an
update. The renderer requires saved tabs and confirmed recovery before dispatch;
the host rechecks Save uncertainty before installation. Windows can exit directly
from its installer. Only a successful install grants the dedicated restart code.
Linux verifies the download, then runs pkexec /usr/bin/dpkg --install for the DEB.
The system authentication agent owns the password dialog. Cancellation or failure
returns an error, without terminal sudo or app-owned password collection. The DEB declares its pkexec dependency. Linux requires a running desktop
authentication agent; the internal terminal agent is disabled. Native installation,
authentication, and restart acceptance still require each supported platform.

# Desktop file effects

The release workflow reuses portability checks for a pushed vVERSION or
vVERSION-beta.N tag. Base versions and checkout identity must agree before builds.
Four native jobs cover Apple Silicon and Intel macOS, Linux x64, and Windows x64.
A verified frontend supplies all four. CI macOS apps have verified ad-hoc signatures,
no Developer ID, and no notarization. Windows and Linux lack publisher certificates.
Only a final successful job can create a draft release. Package collection checks
exact architecture, checkout, size, SHA-256, signing status, and unique names.
Remote assets and draft/prerelease state must agree before final notes. Existing
releases cannot be replaced. Failed upload leaves an incomplete draft. Publication
is manual. Native installation, input, Save, and recovery acceptance remain open.
Source record, baseline, and recovery are unchanged. Package configuration specifies
the AGPL-3.0-or-later SPDX license identifier in Cargo and npm manifests. Binary builds
and packaging contracts remain unchanged. Initial targets manage folder and file paths
for newly created windows. Window spawning stores the folder path and an optional initial
file path in a target registry keyed by unique window label. Failed window creation removes
registered targets. Webview windows retrieve their initial folder with take_initial_folder
and their initial file with take_initial_file. Consuming an initial target removes it from
the registry. Selecting a recent file or reopening a closed file delivers the path directly
to the focused or main window in the open-request event payload. When no window is open,
the host spawns a new window for the containing folder and file.

Native Open queues at most sixteen md, markdown, or txt paths for the main
window. Native paths retain literal spelling. Explicit file URLs decode once;
other URL arguments are rejected. Relative launch paths use the launch working
directory. macOS Open events feed the same queue. Taking a batch clears it once;
another window cannot consume it. Recovery readiness belongs to the renderer.
macOS and Linux package associations declare supported document types. The
Windows overlay disables Tauri's default association macros. NSIS hooks add an
owned ProgID and OpenWithProgids values in the installer's registry scope.
They do not set extension defaults. Uninstall removes owned values only when
the command still matches this installation and retains shared extension keys.
Both hooks compile locally; Windows registry and native Open acceptance are open.

The portability workflow keeps debug builds as its default. Its manual
build_packages option uses the same verified frontend artifact for release
packages: Apple Silicon and Intel macOS DMG disk images, Linux DEB, and Windows NSIS. The DMG provides native drag-and-drop installation. A manifest records checkout, OS, architecture, size, and SHA-256.
Mac apps use ad-hoc signing; other packages are unsigned. This workflow does not
publish. The separate release workflow can create a draft after all checks pass.
Package construction changes no source record, baseline, or recovery contract.
Installation, native input, IME, and supported-platform acceptance remain open.

Resolve document link is a read-only main-window host effect. It captures the
explicit origin ID, expected path, and generation. Bounded UTF-8 destination
paths decode once. URL schemes, literal queries/fragments, controls, and other
extensions are rejected. Relative paths use the saved origin directory. Windows
drive and UNC paths use Windows rules; other platforms reject those forms.
Canonical resolution must select a regular md, markdown, or txt file. The
canonical target extension is checked too. Origin path and generation are
checked again after filesystem work; retired IDs fail. No source record,
baseline, or recovery changes here. Canonical resolution does not freeze file
contents or prevent replacement before the existing bounded Open read.

Open web link is a host effect limited to the main document window. The host
validates absolute HTTP/HTTPS URLs with a host, no credentials or literal Unicode
control characters, and at most 8192 UTF-8 bytes before and after normalization.
The shared frontend/Rust fixture checks normalization, Unicode hosts, encoded
spelling, invalid ports, unsupported schemes, and controls. The Tauri opener
Rust API requests the system browser on a blocking worker. Caller-selected
applications and paths are absent. Automatic plugin JS link opening is disabled,
and no JS opener permissions are granted. A dispatched request cannot be
cancelled by later document edits. Open web link handles update package and release
destinations. Content Security Policy permits connect-src to GitHub release endpoints.
The About dialog checks GitHub releases and provides package download and terminal
installation commands. No document registry, baseline, or recovery
effect runs here. Native launch and Windows/Linux acceptance remain open.

The host supplies one File and one Edit menu. Upstream default submenu titles
File and Edit are matched because those package IDs are generated. Other App,
View, Window, and Help entries retain their upstream objects and order. Linux
gets File before Edit when the default has no File. File exposes New, Open,
Save, Save As, Close Document, and Print. Close Window and platform Quit
remain predefined actions and retain existing renderer/host guards. Custom
Undo/Redo events use CodeMirror history instead of native undo actions. Cut,
Copy, Paste, and Select All remain predefined. Custom commands have no native
accelerators; WebView shortcuts remain their owner. The main window must exist
before an allowlisted event is emitted. No file or recovery effect runs in the
host menu handler. Shape-plan and mapping tests cover synthetic platform menu
orders; host compilation does not prove native menu or input acceptance.

Directory listing is a read-only host effect outside the document registry.
It uses an absolute native path with no URL decoding. Every requested folder
must be a regular directory without a symlink or Windows reparse point.
ReadDir holds its enumeration handle. Each entry gets a fresh metadata check;
linked and reparse entries stay out of the list. Unsupported filename encoding
and failed entry reads produce a notice. Scans stop after 2,000 entries,
including unsupported files. Sorted results put folders before md, markdown,
and txt files. Work runs outside the UI thread. These path checks cannot prevent
another process from replacing a parent or entry before a later Open command.
Listing changes no source record, document baseline, or recovery. Native folder
picker and Windows/Linux sidebar acceptance remain open.

Chosen-image, clipboard-image, and dropped-image copy are separate file effects.
The host derives
stem.assets from
the captured saved document path and never accepts an output folder from the
renderer. The renderer sends the exact image bytes checked before publication.
The host bounds bytes and checks signatures; this is not complete image decoding.
The captured document ID, path, and generation must still match. The document
lock stays held through publication. Source, baseline, and recovery stay intact.
Random image names publish without replacement. Unix uses held directory file
descriptors, checks folder identity, and checks temporary-file inode ownership
before publication and cleanup. Failure after publication reports a retained
copy. Cancel and source Undo never remove an image. Ownership checks do not
eliminate every check/use race against another process with the same access.
Windows rejects linked/reparse asset folders and uses no-replacement temporary
publication, but path checks do not prevent every folder replacement race.
Windows directory durability and native picker acceptance remain unverified.

The source record is the exact UTF-8 Markdown document, including its BOM and
line endings. The host's document baseline belongs to the opened or saved file.
A recovery label is display text and is never a trusted file path or baseline.
The CI config disables only frontend rebuilding. Each native job verifies a
shared editor artifact before Rust tests and compilation. Debug executables
are build evidence, not release packages or native input acceptance.

The host document registry supplies document tabs. Each document
has an independent path, baseline, uncertainty flag, and generation. IDs are
JavaScript-safe integers and are never reused during the process. Old calls
without an ID use document 0. Explicit unknown or retired IDs fail. New tab code
must always send its ID. Registry locks precede document locks; disk work holds
only the document lock. No document operation acquires the registry in reverse.
Async file and image reads capture an ID and generation and check both before
return. Retirement rejects uncertain Save. Quit checks all live documents.
Two documents for one file keep separate baselines, so one Save makes the other
detect a conflict. The renderer uses explicit IDs and per-tab recovery queues.
Startup locks the registry, all live documents in ID order, then recovery. It
validates every baseline and native path before replacing sessions for the exact
live ID set. Allocation failure retains the old session map. An empty registry
gets a fresh ID; startup does not require document 0. This startup operation
holds the registry during recovery allocation to keep the returned set consistent.

Recovery copies live in a private app-data recovery folder. A session holds a
cross-platform lease file for its lifetime. Scanning acquires each inactive
session lease and holds it through the bounded read. Active sessions are not
offered. Each renderer start rotates the session token, even without a copy.
Old renderer tokens cannot write or clear a new renderer's copy. The recovery
manager has one session per live host document. Creating a session validates its
host ID and retains the existing token on repeated requests. Renderer startup
allocates replacements for every session before changing the complete map. Failed
allocation leaves every old token and copy intact. Released old copies stay on
disk. Recovery requests for retired host IDs fail without creating a session.

Host retirement requires the exact document ID, current session token, and last
confirmed clear revision. Every accepted checkpoint attempt cancels earlier clear
confirmation before disk work. Failure or a later dirty checkpoint prevents
retirement. Registry, document, then recovery is the lock order. Retirement keeps
the document and recovery locks through removal; a competing checkpoint either
finishes first and prevents retirement, or fails on the retired ID. The renderer
must still lock input and flush its latest capture before clearing a tab copy.

A checkpoint reserves a strictly increasing safe-integer revision. Dirty source
uses a flushed temporary file and atomic replacement. Publication is followed
by directory confirmation and exact field readback. A clear removes only the
current session's snapshot, then confirms the directory, even on a retry when
the file is absent. Failure after publication is uncertain. The revision stays
reserved through failures and clears. Newer retries cannot be replaced by older
requests. Orphan copies remain unchanged when restored or when another document
is saved. The host provides discard commands to remove an individual orphan recovery
copy or discard all inactive copies. Recovery listing updates immediately after removal.

Reads validate schema, revision, UTF-8, source size, label size, and the opened
regular file. Unix opens are nonblocking and reject symlinks. The source limit
is 8 MiB. A scan covers at most 1000 session folders and reports the limit.
Unix directory sync adds confirmation. Windows does not yet confirm directory
durability. No claim covers every power-loss case or edits before acknowledgment.
Native recovery acceptance remains open.

Application Quit prevents process exit while the main window exists. A host
request token identifies the current confirmation. Repeated requests do not
start more dialogs. Renderer registration rotates pending tokens and invalidates
old approvals and cancellations. The host rechecks Save uncertainty before it
grants one requested zero-code exit. Renderer absence and event errors keep the
process open. Guarded destruction of the last window can exit normally.
Quit retains the acknowledged recovery copy; approved window Close clears the
current copy. Force termination and future multi-window coordination are not
covered. Native Quit acceptance still needs a platform check.

File checks capture the path, saved bytes, uncertainty, and document generation
under the document lock. The worker reads outside that lock. Matching bytes mean
unchanged content; they do not establish file identity. Open, New, Save publication,
and successful save reconciliation advance the generation. Invalid UTF-8 and read
failures leave the baseline unchanged. An external writer can change the file
after a check or validated read. Save keeps its own baseline comparison.

Local image reads capture the document path and generation under the lock. Reads
run outside the lock and recheck the generation before returning raw IPC bytes.
The request's document path must match the host path. Relative image paths use
the document directory; absolute paths can load from untitled documents. Percent
escapes decode once. Invalid encoding, NUL, and URL schemes are rejected. Reads
use the existing bounded regular-file checks and raster signature checks.
SVG uses roxmltree XML validation with an SVG root namespace, UTF-8, and no
document type. The host returns or copies raw original SVG bytes; it does not
sanitize or decode them. Image bytes never change the document baseline.
The renderer checks raster header dimensions and sanitizes local SVG before
browser image decoding, copy preflight, or image-drop insertion. Clipboard and
data images retain their raster-only rules. SVG decoding, filter complexity,
and decoded-size limits are not supplied by this host command.

PNG export is a separate file effect. Binary IPC carries bounded PNG bytes and
an encoded destination header. It does not use or change document baselines.
The host checks the signature, IHDR dimensions, decoded pixels, CRCs, and end
through the PNG package. Animated PNG is rejected. The limits are 64 MiB of input,
16,384 pixels per side, 32 Mi pixels, and 128 MiB of decoded output. File work runs
outside the UI thread. The destination must be an absolute .png path and must not
exist. A flushed temporary file publishes without replacement; a competing new
file remains intact. Readback confirms exact bytes. Unix also confirms the parent
directory; Windows directory durability is not claimed. Failure after publication
reports that the exported file exists or may have changed and needs inspection.
Existing Markdown and other files are never replaced by this effect. Native Save
dialog, WKWebView capture, and supported-platform export checks remain open.

Linux DEB uses linux/MarkDew.desktop as its desktop entry template. Exec includes
%F so desktop file managers identify the app as a file handler and pass each
selected path as a separate argument. It advertises text/markdown,
text/x-markdown, and text/plain without changing the user's default editor.
The package name is mark-dew; the executable is markdew-desktop. A desktop entry
without a file argument can be registered for MIME types but still omitted from
Open With by file managers that require file-handler support.
