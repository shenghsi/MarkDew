# MarkDew v1.7.23

## What is new

- Fixed: Read Mode and Source Code Mode menu checkmarks now stay accurately synced with the active window state.
- Fixed: text inside tables and preview widgets can now be selected normally in Read Mode.
- Fixed: Back and Forward navigation in Read Mode now accurately remembers and restores each file's previous scroll position.
- New: shortcut keys are now displayed on native dropdown menu items (`File`, `Edit`, `Paragraph`, `Format`, and `View`).
- Fixed: clicking headings or formatted Markdown elements in Read Mode no longer reveals raw Markdown syntax (`#`, `**`, etc.) or activates the editor caret.
- New: `Ctrl+[` / `Ctrl+]` (and `⌘[` / `⌘]` on macOS) navigate Back / Forward in Read Mode alongside `Alt+←` / `Alt+→` and mouse side buttons.
- New: customizable **Table text size** and **Code block text size** in Settings > Appearance > Editor (scaled with Writing Size).
- Fixed: opening local file links and web links now works in secondary folder windows, opens non-Markdown local files in their system default app, and resolves link clicks reliably even with an existing selection elsewhere.
- New: browser-like link navigation in Read Mode — left-click opens local Markdown links in the same tab (prompting to Save/Discard if unsaved, or switching to an already-open tab with cross-tab return), Ctrl/Cmd+click or right-click **Open in New Tab** opens links in a new tab, and **Back / Forward** buttons in the top bar (with `Alt+←`/`Alt+→`, macOS `⌘[`/`⌘]`, and mouse side buttons) navigate per-tab history.
- Fixed: reloading or auto-loading changes from disk now keeps the editor's scroll position and mapped selection stable instead of jumping to the end of the file.
- New: Find and Replace now shows the current match index and total occurrences (`1/5`, `2/6`, `0/0`) inside the search input box and displays an overview ruler in the editor scrollbar track marking where all search matches are across the document.
- Fixed: changed-line overview marks in the editor scrollbar track now align with the exact vertical positions of the changed lines in the scrollable document (accounting for top padding, bottom overscroll padding, wrapped paragraphs, and Live preview widgets) while staying free of scroll jitter.
- Fixed: changed-line overview marks in the editor scrollbar track now stay at stable positions while scrolling across virtualized blocks and Live preview widgets.
- New: changed-line overview marks in the editor scrollbar track show where added, modified, and deleted lines are across the entire document at a glance (in both Live preview and Source Code Mode, hidden in Read Mode).
- New: changed-line indicators in the left margin of the editor for both Live preview and Source Code Mode (hidden in Read Mode): green bars for added lines, blue bars for modified lines, and red triangles for deleted lines. Git-tracked files compare against `HEAD`, and non-Git files compare against the last saved file on disk.
- Fixed: file version Compare and disk-editor Diff tabs now highlight exact word-level differences instead of marking whole paragraphs, including across long documents with large edits elsewhere. Inline mode shows small paragraph edits in place.
- New: Check for Updates and Update and Restart now work while multiple MarkDew windows are open.

- New: disk changes load automatically when they do not conflict with editor changes. Separate changes combine, and unsaved editor changes stay unsaved.
- New: file conflicts offer **Use disk**, **Use editor**, and **Review differences**. Review opens a **Diff** tab with disk text on the left and editable editor text on the right. Copy individual changes from disk, or edit a merged result, then choose **Apply merged text** and Save. Git is not required.
- The Diff tab keeps its draft if the disk file changes again or acceptance fails. **Refresh disk** updates the disk side and keeps the draft. Close and Quit ask before discarding a changed draft.

- New: select files and folders in Files with Ctrl-click (Cmd-click on macOS), or select a range with Shift-click. Ctrl/Cmd+A selects all visible entries.
- New: move selected files and folders by dragging them onto a folder or the project folder label. You can also use Cut and Paste from the context menu or with Ctrl/Cmd+X and Ctrl/Cmd+V. Escape clears the selection and Cut.
- New: Move and Rename update local links and image paths in project Markdown and text files, including shared link definitions and HTML href/src attributes. Links inside moved documents also adjust to their new folder. Open tabs retain unsaved edits.
- Existing destination names are refused. Changed files and uncertain saves block the move before it starts. If a later link update fails, the app reports the affected file; completed moves remain complete.

- Fixed: a clean document no longer shows a file warning when another editor briefly removes the file during a save. The next file check reloads changed content when the file is available again.

- Fixed: Ctrl-click (Cmd-click on macOS) on a table link now works while a table cell is open for editing. It closes the edit and follows the link.
- New: Ctrl-click (Cmd-click on macOS) a link in a table cell to open it. Web links open in the browser. File links open in MarkDew or the default app.
- Fixed: links in table cells now look like links.
- Fixed: header text in a table is now left aligned by default, like the other rows.
- New: About MarkDew now shows the GitHub repository link. If you like MarkDew, you can give it a star there.
- Fixed: clicking in a table cell no longer moves the table or the text around it. The table tools now appear above the table and cover the text there.
- Fixed: a click next to an inline equation no longer turns it into source or repaints the line. Equations that were drawn before also appear at once, with no "Rendering…" flash.
- New: **Read Mode**. Turn it on in View > Read Mode, or with the Read button in the status bar, to stop all editing in the window. Turn it off to edit again.
- New: right-click a file or folder in Files and choose **Copy Path** or **Copy Relative Path**.
- Fixed: editing no longer makes images, equations, diagrams and front matter flash. They stay in place when you type above them.
- Fixed: blank lines now use normal line height in Live preview, including blank lines beside tables. Removed the spacing reduction that caused rendering problems.

- New: **Compare**. Right-click a file in Files, or right-click in the editor, and choose **Compare…** to see changes against Git history. Compare the current file with the last commit, the staged copy, or any earlier commit, or compare two commits. Use side-by-side or inline view. You can edit the current file in the view, then choose **Apply edits** and Save. It needs Git installed.
- New: in Compare, choose **Show changes in a commit…** to see what one commit changed, in one step.
- Fixed: a rare false "Recovery session is active" error when another program started at the same moment.
- New: Compare now opens as a tab next to your file tabs, not in a separate window. Switch between a file and its comparison, and keep Compare tabs for several files open at once.
- New: in Compare, a change map beside the scroll bar shows where the changes are in the file: green for added, red for removed, amber for changed.
- Fixed: a Compare tab now shows only the comparison panes. The editor and Outline no longer take space beside them.
- Fixed: the Compare change map now matches the scroll bar. Its marks sit lower, where the changed lines are.
- Fixed: in Compare, side-by-side panes now scroll together. Scroll one side and the other follows.
- Includes everything in v1.5.1: the Find and Replace focus fix, and the Body text size setting.

## In-app updates

- Select **Check for Updates** in Settings > General or Tools > About MarkDew. When a new stable version is available, select **Update and Restart**. The app also checks at startup (once every 24 hours) and shows the same button in a notice; the check can be turned off in Settings > General.
- The app downloads the update, checks its signature, installs it, and restarts. Download progress is shown in the app.
- Linux DEB updates open the system password dialog. MarkDew does not collect or store the password. Cancel keeps the app open.
- Save all documents before you install an update. A failed update keeps the app open and permits a retry.

Packages include macOS Apple Silicon and Intel DMG disk images, a Linux x64 DEB
package, and a Windows x64 NSIS installer. The release also includes install
scripts, signed update packages, latest.json, package manifests, and SHA256SUMS.
Linux requires a desktop polkit authentication agent. The DEB declares its pkexec dependency.

macOS packages use ad-hoc signing without notarization. Windows and Linux
packages have no publisher certificate. Package builds do not establish native
input, IME, Save, or recovery acceptance. Native update installation, the password
dialog, and restart still need checks on each supported platform.
