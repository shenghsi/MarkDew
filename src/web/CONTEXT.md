Records in this file that name the Bend proof describe checks from before the
Bend core moved to the `bend-core` branch. After v1.0.9, the app has no Bend code.

The Settings and About update controls share the native updater. Update and
Restart downloads a signed package with progress, then installs and restarts.
The renderer locks editing, rejects busy commands and composition, requires all
tabs saved with certain Save, and confirms recovery before native installation.
Errors keep the app open and permit a retry. Browser preview retains manual
package links. Native checks use the package version and compiled architecture.
The desktop main window runs a silent Auto update check at startup, at most once per
24 hours (setting: Check for updates automatically, default on). Only a found update
shows a notice with the same Update and Restart button; the user's click is the
confirmation, and the same save and recovery guard applies. Failed checks are not
recorded and retry at the next start.

# Desktop editor language

Print… opens the system print dialog. Export → PDF… asks for a file name, then the host (pdf.rs) prints the
open print pages to that file with the WebView's own print engine (WebKit on macOS and Linux, WebView2 on
Windows), with no system dialog. It writes through a temporary file, allows one export at a time (10 minute limit), and the
dialog cannot close until the file is written. Export → Image (PNG)… exports the same pages as a PNG.

MarkDew v1.0.0 delivers the full desktop writing experience. Tools offers
Settings and About MarkDew dialogs. Settings configures editor maximum line width
from 650 to 1200 pixels or 100 percent full width. Double-clicking the title bar
toggles window maximization while preserving title bar window drag. Inactive
recovery sessions provide individual discard controls and a bulk Discard all action.
Native and application menus show check marks for active Theme, Source mode, and
Outline visibility. Live preview tables support Typora-style operations: row and
column insertion or deletion, row height locking, cell scrollbar suppression,
and alternating row backgrounds. Code blocks show language indicator tabs on hover
and omit redundant blank lines. The About MarkDew dialog displays the dual-license model
under GNU AGPLv3 and commercial license terms. Source record, baseline, and recovery contracts
remain unchanged. Opening a Markdown file checks the containing folder against the active project
folder. When the file is inside the active folder, the file opens as a tab in the current window.
When the current window has no project folder and contains only an untouched empty tab, the window
adopts the containing folder and opens the file. When the current window has another project folder
or modified tabs, the desktop app opens the containing folder and the initial file in a new window.
Startup retrieves initial targets after document recovery completes and reuses the initial clean tab.
Open requests consume direct event payloads when provided by recent file or reopen menu actions,
bypassing host queue drains.
Typing an opening code fence without a closing fence renders only the fence line as inline code (`md-code`).
The editor does not hide the fence line and does not format following document lines as code block lines.
When the user presses Return on an unclosed fence line, the Return command detects the unclosed fence.
The command inserts the matching closing fence on a new line and places the cursor on the empty line between the fences.
The editor preserves indentation and fence characters. After closing, live preview renders the complete code block.
When the cursor is in a code block in rendered mode and the code block contains no code, the Backspace command deletes the complete block.
In source code mode, the command does not delete the code block and keeps standard text deletion.

The editor draws no cursor layer, so the browser caret is its cursor. The caret stays transparent until
the editor is active: the user clicks in it, types, or moves the selection. A file that opens, or a
programmatic focus, shows no blinking caret. tests/browser/cursor-hidden.html checks this in Chrome.

Each file opens in one tab. Before it opens a path, the app compares the canonical spelling of that path
with the canonical spelling of every open tab (canonical_path), and ignores case on Windows and macOS.
A link in a parent folder, or a different case, so no longer makes a second tab. The sidebar, Open File,
links, drops, and menu requests all use this check. Rename finds its tab the same way, before the rename.

Print on macOS goes straight to the system print dialog: the pages are built out of sight, and the host
command print_page (the web view's own print call, which opens the dialog and returns when it closes)
prints them, because the macOS web view ignores window.print(). The pages are removed when the call
returns, or kept in the preview window if a warning needs a look. On Linux and Windows, Print keeps the
preview window, and its Print... button calls window.print(): WebKitGTK sends no afterprint event, so the
end of printing cannot be known there. Browser mode is unchanged. The macOS path has no native check yet.

Print has one keyboard shortcut, Alt+Shift+P (Typora's). It clicks the Print button, so it shares the button's
guards: it does nothing with no file open, during text composition or key repeat, or while Settings is open.
It uses the physical P key, because Alt changes the character a Mac layout types. An open print page ignores
it. Ctrl+P (Cmd+P on a Mac) is Open Quickly, as in Typora, VS Code, and Sublime Text. The native menu has no
accelerators; the shortcuts live in file-shortcuts.ts and work in the desktop app.
Open Quickly (File, Open Quickly, or Ctrl+P) opens a small search box over the editor. The host command
list_project_files scans the project folder (the open folder, else the folder of the current file) for
Markdown and text files in sub-folders; it skips links, hidden folders, node_modules, target, dist, and build,
and stops at 5000 files or 12 levels. Typing narrows the list: every word must match, a match in the file name
ranks above one in the folder path, and letters in order also match ("bpl" finds beta-plan.md). Open files rank
first. Up and Down choose, Enter opens through the same guarded route as the sidebar (an open file just gets
its tab), and Escape or a click outside closes it. With no project folder, the searched folder becomes it. An
open print page keeps Ctrl+P for itself and prints the page.

Import and Export use an installed Pandoc; MarkDew never bundles it (its GPL license stays apart from
MarkDew's). The host (pandoc.rs) finds Pandoc from the path in Settings, Export, else PATH and common
folders (~/bin, /usr/local/bin, Homebrew, Windows install folders), and starts it with fixed arguments and
no shell. File, Export has HTML, HTML (without styles), Word, OpenOffice, RTF, Epub, LaTeX, Media Wiki,
reStructuredText, Textile, and OPML, plus PDF and Image (PNG), Export with Previous, Export
and Overwrite with Previous, and Export Settings. An export reads the editor text (so unsaved edits
export), asks for the file, resolves images from the document's folder, and writes through a temporary
file, so a failed run keeps an existing file. Pandoc reads a mermaid block as plain code, so for formats that hold pictures (HTML, Word, OpenOffice, RTF,
Epub, LaTeX) the renderer first draws each diagram with the preview renderer, as a PNG at twice its size
on white, marked 192 DPI so other programs show it at its real size, and puts it in the Markdown as an image; a diagram that cannot be drawn stays as code and the
notice says so. Text formats keep the code. LaTeX writes embedded pictures to <name>_media beside the
file. Raw HTML blocks (tables with merged cells, lists) and <br> inside table cells go through a small
Lua filter, because Pandoc drops raw HTML in every format except HTML; without Lua in Pandoc the export
runs without the filter. HTML includes a small style sheet and embeds images;
HTML (without styles) has none. Import reads docx, odt, rtf, epub, tex, wiki, rst, textile, opml, and
html, asks for a Markdown file name, writes images to <name>.assets/media, and opens the result in a
tab. Readers that can open other named files (LaTeX, reStructuredText, MediaWiki, HTML, Textile, OPML)
run in Pandoc's sandbox. The Markdown it writes has no raw HTML and uses $math$. Results and errors show
as the visible notice. Export and Import are unavailable in the browser, and Export needs an open file.

Pasted images default to Copy beside document in the desktop app; the browser can only embed. Copy that
nobody chose falls back to embedding when the document has no saved path or its save is uncertain,
so a paste never fails for that reason. An explicit Copy choice still reports it. Dropped images keep
Link original as their default. An embedded image is a base64 data URI on one long line. The editor
shows its data as a small label ("image data - 22 KB") in Live and Source mode and the cursor skips
over it. The document text, source record, and history do not change, and copying a selection copies
the real text. Image error messages and print warnings name the type and size of long data URIs.

Settings that apply at once: Writing Size goes through the header's writing-size control, because that
control keeps the scale on the writing surface and a value on the page root is hidden by it. Text font,
Table font, and Code font list the families installed on the computer (the desktop host command list_fonts, using
fontdb) and apply through the CSS variables --writing-font, --table-font, and --code-font; a chosen font goes first and
the default stack stays behind it for missing characters. Table font defaults to Use Text font.
Markdown and supported block HTML tables use the table font in preview and cell editing.
The Pasted images and Dropped images choices
are read from storage when an image arrives, so they apply without a restart.
WebKitGTK (Linux) sends a paste with no data at all when the clipboard holds only an image. For such an
empty paste the editor asks the host (read_clipboard_image, GTK clipboard, PNG bytes) and then continues
with the normal image paste. A dropped image works at any point on the writing surface; away from text
it uses the nearest text position. Image messages also show as a short notice at the bottom of the
window, because the status line is hidden from view. tests/browser/settings-font.html and
image-paste-check.html check size, font, and paste in Chrome.

Open File and Open Folder, from the toolbar, the menu bar, or the sidebar, start their dialog in the
folder of the current file. With no current file, they start in the
open project folder. With neither, the system chooses the folder.

Empty state: when the last tab closes (Close document, or Delete of its file), the editor hides and
the panel "No file is open" shows, with New File and Open File buttons. The app still keeps one blank
placeholder tab behind it, but the user sees no Untitled document. The state lasts while that tab has
no path, no edits, and no sibling tab. New File reuses the blank tab and shows the editor. Opening a
file from the sidebar, the picker, or a drop loads into it. Save, Save As, Undo, Redo, Find, Source,
Check Save, Print, Close document, and Tools are disabled, and native menu commands other than New,
Open, Open Folder, sidebar, outline, Settings, About, and theme are refused. At app start the first
tab is still a normal Untitled document.

Files sidebar, New File: the new file is created as Untitled.md and its name opens in an inline
text box with the name before .md selected, so typing renames it. Enter or a click elsewhere keeps
the name and opens the file; Escape keeps Untitled.md and opens it. Focus lost within 400 ms of the
box opening, before the user types or clicks in it, returns to the box. The host returns a canonical
path for the new file, which can differ from the listing path (for example, a link in a parent
folder). The sidebar finds the new row by its name among the direct rows of the target folder, and
renames through the listing's path.
Files sidebar, Delete: the system dialog asks first (a folder says it removes everything inside),
and Cancel deletes nothing. After Delete the file is removed from disk whether a tab shows it or
not. Its tab closes without the discard question, including a tab with unsaved edits;
the dialog warns that those edits will be lost. If the tab cannot close, it stays open as an untitled
document and the status line says so.
Tabs keep the host's canonical path while the Files list keeps the path it was opened with, so
Delete asks the host for the canonical spelling (canonical_path) and matches tabs against both.
The desktop host clears the path of each open document inside the deleted path. Deleted files are not added to the closed files list.

Tab on a list item line nests the item under its previous item, with its nested lines. Shift-Tab
does the opposite: it moves the item out to its parent's level. Any list type can nest in any
other. The nested indent is the parent's content column, so it is 2 under a bullet and 3 under
`1.`. Ordered numbers follow the new level, and a first nested item restarts at 1. A first item
cannot nest, and an item at the left edge cannot move out; Tab and Shift-Tab keep the focus
in the editor then. On lines without a list marker, including code and equation blocks, Tab
changes nothing, and Shift-Tab removes one indent level (a tab, or up to 4 spaces) from each
selected line. Both keep the focus in the editor; only text composition keeps its own keys. Table cells keep their own Tab. One Undo step reverses a list move.

In the desktop app, Insert Image (toolbar, Ctrl+Shift+I, or the Insert menu) with no image at the
cursor opens the file picker and inserts the image at once. A saved document gets a copy beside
it. An unsaved document links the file where it is. The alt text is the selected text, or the file
name. The form opens only for an existing image, a reference image, or in the browser.
Undo removes the Markdown and keeps the copied file.

A horizontal rule line (`---`, `***`, or `___`) shows as a rule in live preview. The source
shows when the cursor touches the line. An underline under a heading is not a rule.
Insert > Horizontal Line writes `---`.

Right click in the edit surface opens the editor menu, in the layout of Typora.
A right click outside the selection first moves the caret there. The top row has
Cut, Copy, Paste, and Delete; Cut, Copy, and Delete need a selection. Copy / Paste
As has Copy as Markdown (source text), Copy as HTML Code (HTML text), Copy without
Theme Styling (HTML and plain text flavors), Copy as Plain Text, and Paste as
Plain Text. The next rows have Bold, Italic, Inline Code, Link, Quote, Ordered
List, Bullet List, and Task List. Quote and list buttons toggle the marker on every
selected line, and they refuse code, equation, table, HTML, and front matter blocks.
Paragraph has Heading 1 to 6 and Paragraph, with a check mark at the current level.
Insert has Image, Footnotes, Link Reference, Horizontal Line, Table, Code Fences,
Math Block, Table of Contents, YAML Front Matter, Paragraph (before), and Paragraph
(after). Table of Contents is a static list of heading links at the cursor block;
it does not update when headings change. The keyboard owns the menu while it is
open: arrows, Enter, and Escape. Mod-T, Mod-Shift-K, and Mod-Shift-M insert a
table, code fences, and a math block. Table cells keep their own menu.
Paste uses the system clipboard text; it does not read pasted images.

An equation block is a top-level pair of lines that hold only `$$`. The parser
extension MathBlock keeps blank lines inside it. A lone `$$` with no closing line
stays a paragraph. Live preview shows a rendered equation, or Empty equation
when it has no formula. When the cursor is inside, the formula lines show as
code block lines with an Equation tab, and the `$$` lines collapse. Return on an unclosed `$$` line adds the closing
line. Backspace on the empty line of an empty equation block deletes the block.
ArrowDown on the last formula line at the end of the document adds a line below.
Equations inside quotes or lists keep the paragraph route.

Typing or pasting fence characters inside a closed code block in live preview
extends the outer fences when needed. The outer fences stay longer than the
matching character runs in the content. This prevents typed backticks from
becoming a hidden closing fence and moving the following content outside the
code block. Both fence edits and the input share one transaction, selection,
source record, and Undo/Redo step. Source mode and direct fence edits keep their
normal behavior. The filter scans the affected code block only for input that
contains backticks or tildes. The 725 web tests and TypeScript check pass. Browser
control failed to load its request-header policy, so actual scroll geometry and
large code block input timing remain unverified.
The frontend build and Bend proof pass with the verified 2.0.38 compiler.

Typing scroll stabilization anchors the first affected line, including line joins
and reversed selections. It composes transaction batches before it chooses the
anchor. The public line block top supplies the anchor, including when a long wrapped
paragraph starts outside drawn text. Text offsets from heading padding and fonts
do not move that anchor. Hidden editors bypass stabilization. After the view update, an idle coordinate
read completes CodeMirror measurement and scroll compensation. The stabilizer
then corrects the remaining displacement. A requestMeasure write is too early:
CodeMirror can apply its own correction after that write. Stabilization also
runs at scroll offset zero. Wrapping and Return can expand content below the
anchor. At the viewport edge, only the movement needed to show the caret is
permitted. History, unfocused editors, and multiple selections bypass this path.
No delayed correction can affect a later selection or document tab. Source
record, baseline, and recovery contracts remain unchanged. Unit tests cover
scroll order, top and bottom boundaries, expansion, line joins, batches,
reversed replacements, and an unavailable paragraph start. The browser fixture
is available at tests/browser/scroll-stability.html. Real keyboard geometry and
large-document input timing remain unverified because browser control failed.

Live preview gives inactive paragraph blank lines a scaled 14-pixel box. Direct
BR children are hidden on compact and collapsed separators. Selected blank
lines retain normal editing metrics. Fenced and indented code blank lines keep
their code metrics. Tables use 12-pixel resting padding and 34 pixels above
content while the floating toolbar is visible. WebKit and Chromium each pass
25 geometry, Source/Live, exact source record, and Undo/Redo checks in
tests/browser/blank-line-spacing.html. Before this CSS change, both engines
already measured 14-pixel paragraph blanks; the visible excess came from
34-pixel resting table padding. The BR line-box hypothesis was not reproduced.
The web tests and frontend build pass. Bend proof passes with the project's
verified 2.0.38 compiler. Bend 2.0.36 and later reject repeated constructor names
across aliased modules, so constructors in this project are unique (SaveReady,
PlanReady, WorkspaceReady, TextValue, Visible). Native Tauri WebView acceptance remains
open.

Native editor cursors use the theme ink color. The app's cursor selector has
higher CSS specificity than CodeMirror's default light-theme content selector.
This covers the outer edit surface and nested table-cell editors without
changing source record, history, baseline, or recovery. WebKit and Chromium
pass eighteen computed-color checks across Live, Source, table cells, Light,
Dark, and System with dark system colors. Removing the rule restores a black
cursor in dark mode in both engines. A WebKit screenshot shows the light native
cursor. Theme tests, frontend build, and Bend proof pass. Linux native acceptance
still needs a package with this fix; beta.1 does not contain it.

The Files pane follows typora-layout.png with fixed heading, folder controls,
and a short root label above a separate file-tree scroll area. Folder and file
icons and disclosure arrows are decorative. Rows stay on one line; long names
scroll horizontally inside the tree. The root tooltip retains its full literal
native path. Unix backslashes remain part of names; Windows path separators
affect only the label. Keyboard focus scrolls visible entries while controls stay
fixed. Background refresh and periodic polling use non-destructive listing signature reconciliation: existing DOM entries and focus remain untouched when directory contents have not changed, and file tree updates occur in-place without displaying intermediate loading status. Chrome checks nested Japanese selection, long labels at 150 pixels, both
themes, narrow windows, and Source/Undo/Redo. Source record, history, baseline,
and recovery keep their existing contracts. Native platform acceptance is open.

The inactive fallback-retention trial is closed. Combined delivery stays fixed
in four fresh cases with 76 actions. Mapped retention reduces the height error
from 138480.796875 to 224.515625 pixels at Source, Undo, and Redo in both orders.
Live geometry agrees. Settled source record, selection, history, decorations,
streams, and widgets agree, but immediate structural and math fallback retains
stale widget data. This association does not establish range loss as the cause.
Seven reports retain four valid cases and three rejected runs; their verifier
checks exact controls and the rejection. A shared 100 ms delay precedes view
construction; observation deadlines remain unchanged. The architect finds no
blocker to this evidence commit and rejects adoption or timing for this candidate.
Future fallback must retain off-screen height information with current source
content and positions, independently checked against the baseline through full
rebuild, Source, Undo, and Redo. Production and recovery remain unchanged.

The inactive fallback-delivery trial isolates the view decoration facet. Both
fields share the same plan factory; one delivers the combined set and the other
delivers static point/mark sets. Four fresh cases retain 76 actions. Public span
signatures, settled geometry, and read-only height attribution agree between
factors in both construction orders. Both have the four earlier Source/Undo/Redo/
Live height failures. Incomplete full fallback drops 121,566 points to 119 or 120
in both factors; settlement restores the full points. Exact source record,
selection, history, decorations, widgets, and unchanged comparator checks pass.
The fixed-report evidence verifier passes. The static layer split alone does
not explain this case. Temporary range loss remains an unproved cause. Next test
retention with parser, delivery, and scroll fixed. Production, baseline, recovery,
and full product acceptance remain unchanged; no timing or adoption follows.

The inactive local-coverage browser gate is rejected for adoption. Four growing
Unicode edits retain an indexed partial mounted body and exact complete-reference
decorations, callback streams, source record, selection, history, and geometry.
Structural, math, and note edits reject local reuse. However, after those full
fallbacks, Source mode has about 138,481 pixels of different height estimates.
Undo and Redo retain the difference; Live has a 0.09375-pixel difference. Two
fresh-page repeats confirm these four geometry failures in both construction
orders. Fonts and height-oracle values agree; height-map partitions differ.
Attribution reads view 6.43.13 only and changes no private state. The first
six-case batch also missed frame/resource deadlines in its last case. Those
deadline failures do not recur on fresh pages; their earlier cause is unknown.
All three reports stay archived. The evidence verifier checks the rejection,
not a passing gate. Next isolate temporary incomplete full-fallback projection
from static layer partitioning. Production retains its complete-body guard;
no input timing or adoption follows from these controls.

The document bar has equal left, title, and right columns. Pane controls stay
left; count and view controls stay right. The title is centered independently
of their text widths. At 760 pixels or less, the title uses its own row and
right controls can wrap. H1 and H2 lines use the theme border, as in the Typora
layout reference. Existing controls retain keyboard order and handlers. Chrome
checks 320, 400, and 1000-pixel bounds, both themes, and exact Source/Undo/Redo.
Thirteen related checks and the frontend build pass. A stale storage assertion
now includes the existing default sidebar width. Native layout remains open.

The inactive mounted-parser browser gate passes 272 checks in sixteen cases.
Four fixtures run native/native controls and native/mounted comparisons in both
construction orders. Seventeen actions check source record, selection, history,
language activity, decorations, and exact settled line and widget geometry.
Complete mounted bodies and ready resources precede equal source-position scroll
commands. Resources include MathJax, Mermaid, semantic HTML, tables, and code.
The first batch had a 16-pixel scroll difference in native/native controls too;
its report stays as rejected evidence. The corrected batch and archive verifier
pass. Production keeps its parser and complete-body guard. Next check local
coverage in the browser before matched input timing. Input latency, native input,
Open, memory, and platform acceptance remain open.

Files and Outline share a resizable sidebar. One vertical separator supports
pointer drag, Left/Right, Shift with arrows, Home/End, and double-click reset.
The stored width is 150 to 400 pixels. Window bounds can reduce its displayed
width without changing that preference. A 400-pixel window retains a 240-pixel
edit surface and a 154-pixel pane. Pointer start retains edit focus. Escape,
pointer cancellation, lost capture, composition, pane change, window resize,
blur, and disposal cancel a pending drag without storing it. Measurement uses
one animation frame and the shared visible-caret helper for outer and cell
surfaces. Resize adds no editor transaction. Source record, selection, history,
baseline, and recovery have no resizing effect. Invalid or unavailable storage
uses the default or the current launch's choice. Older folder preferences remain
valid. Chrome checks drag, keyboard and Tab access, both panes, narrow bounds,
wide-width restoration, visible caret, Source text, and exact Undo-empty/Redo.
Unchanged attempts at a window limit retain the saved preference. Modified,
previously handled, and IME key events retain their input owner.
Fifteen related checks and the frontend build pass. Native platform resizing
and IME acceptance remain open.

The separate inactive mounted-tree adapter retains native wrapper language
activity without metadata or indentation corrections. It derives validated
Document/Body structure and node types from the same configured package, mounts
the unchanged native Markdown result at offset zero, and copies no contextual
per-tree properties from its skeleton. Ambiguous prefixes and nonstandard ranges
retain native YAML parsing. Per-parser weak tree provenance admits only its own
route's fragments; foreign fragments drop, which can change reuse and cost.
Mapped Markdown fragments retain exact offset, bounds, and open flags. Partial
parse getters, stopAt, errors, native inner-tree identity, and lengths pass.
Complete syntax, highlights, services, activity, regions, preview, concurrent
states, and first-line source/Undo/Redo controls pass. A partial-prefix check
compares only validated coverage with an independent complete wrapper reference.
Four controlled growing partial edits retain the local index and match complete
native-wrapper source/decorations/point streams without settling the candidate.
Production keeps the YAML wrapper and complete-body guard. The separate browser
layout/history gate above passes; no production flag or timing follows.

Writing size is a Tools presentation preference from 80% to 200%. The fixed
size list bounds stored values; unavailable storage retains this launch's choice.
Startup applies it before edit-surface construction. Document, Source, semantic
HTML, formula, and table-cell text scale. App controls, image dimensions, isolated
HTML frames, and print output keep their own size. Accepted changes request
outer and active-cell measurement without dispatch. A visible selection head
supplies a source-position anchor; guarded measurement keeps it inside the outer
scroll area. State identity, composition, page lifetime, and connected DOM reject
stale scrolling. One measurement key and a generation retain only the latest
rapid change; a changed scroll position cancels correction. Composition blocks
the size change and restores its selector.
Disposal removes its listener. Source record, history, baseline, and recovery
stay intact. Chrome checks cover minimum/maximum fonts, fixed app text, active
cell input, exact Source/Undo/Redo, and a 400-pixel maximum-size caret. The first
browser pass lacked caret anchoring and is rejected. The final helper repeat
passes the narrow caret check and exact Undo-empty/Redo-source checks. Its first
DOM line concatenation after viewport reset does not match the complete source;
that observation is insufficient as a source gate on a virtualized surface.
Native acceptance stays open.

The inactive package parser selector is rejected for adoption. Seven checks
retain six positive contracts and one explicit activity-failure control. The
direct route matches complete syntax, highlights, metadata, indentation,
completion, folding, preview, exact source, and parser-switch Undo/Redo in the
tested fixtures. Shared support states and native PartialParse identity pass.
A controlled partial Markdown prefix retains tested services without settling.
However, native Markdown and wrapper language activity differ at document start
with sides -1/0 and document end with sides 0/1. The metadata provider adapter
does not change that tree-based API. Complete region queries agree in the tested
fixtures. No browser flag, timing, or production change follows. Keep the YAML
wrapper. A later design must retain native activity through public parser tree
contracts before local coverage can reach the app.

The inactive local-coverage index keeps a prior complete eligibility certificate
and requires published dirty/neighbor blocks plus validated outer boundaries.
Document-edge callback counts stop after two touching/outer blocks; unexpected
overlap rejects. RangeSet.between still scans chunk positions, so this does not
prove constant or fully bounded query work. Four controlled partial edits match separate complete
oracles without settling or changing the candidate tree. This is a different
language profile, not the app. Partial YAML-wrapper trees resolve the dirty
position to an unmounted Body and are rejected. Dirty/boundary truncation,
structural edits, resources, and note changes also reject. Twenty-four focused
checks pass. Production and default test paths keep the complete-body guard.
Next review a conservative selector between package Markdown and YAML wrapper
parsers, including parser switching, services, source, history, and layout.

The post-clock fallback observer records the actual updateIndex call and return
without replay. Its callback forwards the existing rejection once. In two
forty-key Chrome diagnostic runs, original comparison accepts seven keys, then
rejects key eight with a published incomplete Markdown body. Thirty-two later
keys have no index. The paired run accepts all forty keys. Both retain exact
source/Undo; routes differ, so there is no stable speed comparison. Metadata is
bounded, uses published transaction states, and stays out of raw transaction
retention. Twenty focused checks pass. Production is unchanged. Next investigate
local published coverage while retaining source and dependency guards.

The first standalone static-projection input ABBA batch retains 160 keys and
exact source/Undo in four Chrome development runs. Outer-tree counts are
40, 11, 9, and 3; indexed routes are lost during three runs. Original key-to-rAF
p95 values are 24.8 and 172.8 ms; paired values are 132.8 and 102.9 ms. These
unmatched routes establish no stable gain. Both paired runs restore the original
descriptor after Undo. The standalone view excludes main-app work. Retain all
samples; investigate indexed-route loss and mounted-body completeness before
adoption. The old complete sample field checks outer length only.

The inactive paired browser comparator passes eighty navigation controls and
thirty-six edit/history controls with exact geometry. The test-only Vite module
pins state 6.7.6 and its source hash; installed packages and production stay
unchanged. Both candidate edit orders retain the original two callbacks. Each
records 3,198 actual dispatch jumps and 792,130 skipped ranges across the batch.
Geometry preparation and direct callback diagnostics have separate counters.
The final corrected edit smoke passes nine checks and restores the original
method. Eleven unit checks cover fallback exceptions and later descriptor owners.
Both partial view-construction controls destroy the returned view and restore
the comparator. This is text/note geometry evidence, not input speed, memory,
resources, or native acceptance. Next review a real-input timing plan.

The inactive static projection now passes eighty Chrome navigation controls
and thirty-six local-edit/history controls. Full/full and full/static cases
run in both construction orders. Mixed text/note and 1 MiB fixtures retain
complete bodies, exact source, shared line boxes, heights, scroll positions,
and relative caret tops. Corrected edit controls publish complete trees outside
samples and use equal explicit scroll actions after history and mode changes.
Both local Unicode edits remain indexed before and after readiness. Undo/Redo
and Source/Live checks retain exact BOM/mixed endings, selection, and history.
The first edit run mixed partial trees with unequal reference scroll actions;
it remains rejected. The browser comparator is unchanged. This validates only
the tested static projection, not resources, input latency, memory, or native
acceptance. Next connect the inactive paired comparator and repeat layout
controls before real-input timing. Production stays unchanged.

The inactive static point projection now patches actual accepted local regions.
All points stay static before all nonpoint marks. Note updates keep one combined
point layer: map it, patch rebuilt ordinary blocks and neighbours, remove old
note widgets with bounded source-range filters, then insert current note widgets.
Joining ordinary and note point sets would add a layer and disable paired jumps.
Four growing 1 MiB note edits retain exact full-builder display and single-layer
eligibility, with 1,595 paired jumps and 395,144 skipped ranges. Selection,
span/rank, external-order, Unicode history, Source mode, and fallback checks
pass. Combined, ordinary, and split sets remain; extra memory is unmeasured.
Production is unchanged. Browser full/full geometry must pass before timing.

The inactive paired comparator advances both cursors and retains the final
common positive point for boundary context. State 6.7.6 ESM and strict factory
copies each retain all 3,496 tested callback streams. Each records 5,397 jumps
and 1,324,988 skipped ranges. Complete-oracle preview reconstruction with
per-region filter bounds retains shared chunks. The 1 MiB note projection
records 398 jumps and 98,704 skipped ranges with the same two callbacks.
The resource projection retains nine callbacks with no jumps. Reconstruction
is outside clocks and still scans the full oracle. This is no bounded production
update, speed, layout, input, or native acceptance claim. Packages and production
stay unchanged. Next build an inactive persistent static point projection with
real local updates, then check full/full layout before timing.

An inactive state 6.7.6 comparison trial rejects independent shared positive-point
skipping, even with one relevant single-layer set per side. A new zero point at
a shared positive point's boundary needs that old point as callback context.
Nine of 3,456 exact-stream checks fail the guard. The naive multiple-set control
also fails. Installed modules and production stay unchanged. Static point-first
and mark-second projections retain full public spans, external order, and source
at every selection boundary in three mixed fixtures. Representative note and
resource point projections are single-layer, but that does not make the guard
safe. Next design paired skipping that retains boundary context; no timing until
the comparison is correct.

Forty settled height checks reject the viewport omission prototype. Full/full
controls agree exactly in both construction orders. Full/viewport differs by
up to 2,515 pixels in scroll height and 505 pixels at an off-screen owner after
width change. Destination caret tops differ by at most 0.625 pixels. All checks
retain complete Markdown bodies, source record, history, and shared actual line
rectangles. Equal oracle metrics and differing collapsed content/map gaps support
the estimate cause. Private summaries are read-only and versioned at view 6.43.13.
Keep production static marks. Stop further input/memory trials for this candidate.
Next investigate proven shared-chunk comparison while retaining static ranges.

The inactive viewport-marks prototype splits accepted same-line empty
replacements into a persistent hidden set after global suppression. Widget,
block, and multiline ranges stay static. Local patches include every rebuilt
neighbour; notes rebuild at current positions. Hidden-first precedence retains
enclosing marks and relative external decoration order. Combined and split
sets remain, with unmeasured extra memory and full selection partitioning.
Six focused and 559 full web checks pass. Browser shared lines and exact
Unicode/source-mode Undo/Redo agree, but estimated heights and relative caret
positions differ materially after distant navigation. The input pair has
different parser routes and a slower candidate worst sample; it proves no stable
gain. Production imports are restored exactly. Do not adopt this prototype yet.
The later control above rejects this route. Native IME and frame targets remain open.

An inactive range inventory at 86dea41 finds 83,213 same-line empty replacements
in the exact 1 MiB note fixture: heading, strong, and code delimiters. Only two
shifted note widgets produce height-comparator difference notifications.
Callbacks identify differences, not equal ranges visited or their timing.
The resource fixture retains the listed widget routes and multiline emphasis owners.
Any viewport prototype must use global owner selection and include owner ranges
that cross its edges. Production decorations remain intact. This settled-state
inventory checks exact source but supplies no DOM, input, Undo, or speed claim.

Temporary parser/view traces at 1980c10 pass forty complete-tree indexed keys
and terminal exact source/Undo. One run attributes 47.5 / 51.5 ms median / p95
to the minPointSize 0 height comparison inside 51.8 / 55.7 ms view-state work.
Default comparisons total 0.4 / 0.7 ms; document-view work is 2.7 / 3.6 ms.
Core Markdown parsing is 21.2 / 25.7 ms; nested parser clocks are inclusive.
Installed CodeMirror excludes positive-point chunks from shared-chunk skipping.
The next experiment must inspect compared range types before it changes their
placement. Same-line empty replacements are possible viewport candidates;
block, multiline, widget, and resource ranges must keep their static route.
All source, selection, wrapping, scroll, input, and layout behavior must remain.
Hooks are archived and production and the fixture are restored exactly. The
lost/reset browser attempt is rejected. No candidate or stable speed gain is
claimed. Native frame and Open targets remain open.

Two real-input boundary traces at 5e68fb5 pass forty complete-tree indexed edits
and exact source/Undo. Detailed footnote timings separate language-field work
from model work: current syntax-tree/body lookup has 51.4 ms p95, while guards,
definition mapping, and text-range mapping have 0.2, 0.2, and 0.3 ms p95.
CodeMirror computes the language field on that lookup and runs parser work.
Local preview p95 is 2.4 ms; view update p95 is 59.7 ms in that trace.
Removing the accessor could only move deferred parsing to another caller.
Next work must profile upstream parsing and view update separately. Both exact
temporary patches and all samples are retained; production and the fixture are
restored exactly. The traces establish no native frame or speed target.

Footnote plain-text certificates use a private persistent RangeSet. Local guards
query only touching spans and map the set through accepted growing edits.
The last span start and ordinal preserve the earlier array lookup order.
Inline-code anchor offsets stay relative to the text start because every
accepted edit retains the anchor and their shared boundary. Fresh parsing
remains independent and unindexed. Mapped models expose a lazy full plainText
array only for explicit consumers; its getter retains only the new range set.
Local-update checks confirm that the getter is not read. Complete fresh-model,
Unicode, multiple-change, source, and history comparisons retain the contract.
One untraced forty-key baseline/candidate pair passes all complete-tree and
source/Undo checks. Layout-observation p95 is 142.5 / 132.6 ms. Synthetic setup
readiness is 872.6 / 874.1 ms. This pair proves no stable speed gain or native
frame/Open target. The final isolated-getter repeat passes forty real keys and
exact source/Undo with complete sampled trees and indexed plans. Its p95 is
143.6 ms and setup readiness is 890.6 ms. This shows no stable total-speed gain.
The getter helper cannot share the prior edit guard's closure context. Initial
index work and retained memory still need evaluation.

Note-aware full plans retain separate ordinary items and selection groups.
A selection change updates only the ordinary index decorations, then joins
current note widgets for display. Wide selections keep that separation too.
The combined display never replaces the ordinary index. Indexed plans retain
no absolute items or old groups; cursor movement from an indexed plan uses a
full current collection. Exact full-builder comparisons cover every boundary,
multiple and wide selections, emphasis containing references, definitions, and
the first guarded edit. Source and history stay intact. In Chrome, actual arrow
moves before forty keys retain the index and every key uses an indexed plan.
All sampled trees, exact source, and Undo checks pass. Layout p95 is 158.9 ms,
with 96.2 and 122.4 ms cursor observations. This removes the route's first full
edit plan but does not establish a stable latency gain or native frame target.

The ordinary note index also accepts one definition at the exact end of a
Paragraph after a nonempty plain prefix. The entire prefix uses a bounded
letter/number/mark, whitespace, and . , ! ? whitelist, ends with a newline,
and stays ordinary. The definition starts on its own line. Other intersections,
marked prefixes, multiple definitions, incomplete trees, and changed notes keep
full construction. Local analysis retains current global note suppression.
Fresh source/model/item/decoration comparisons cover edits before and inside
the prefix, boundary and definition changes, Unicode, Undo, and Redo.
The original 1 MiB browser note document now uses thirty-nine indexed plans in
each forty-key batch, with exact source and Undo. Layout-observation p95 is
133.3 and 175.8 ms; medians vary from 23.0 to 132.4 ms. The first full rebuild
and the product frame target remain open. Opt-in diagnostic traces separate
inclusive dispatch, explicit state realization, and view work; they do not
measure paint or native frame latency. BENCHMARKS.md retains all observations.

A real-key browser fixture measures the actual 1 MiB edit surface in Vite
development mode. Forty keys per route retain expected exact source; Undo
restores each original BOM and mixed endings. Plain Live preview reaches
147.4 ms key-to-layout-observation p95; Source reaches 67.3 ms. Note Live preview
reaches 481.4 ms and publishes complete trees in only four of forty samples;
Source reaches 79.9 ms with forty complete trees. Plain Live uses indexed plans,
while every note Live sample uses a full plan. These are one-batch Chrome
observations, not paint or native frame evidence. BENCHMARKS.md defines the
clock and limits. The next task must separate state, view, and parser fallback
work during real input. Repeat note Source reaches 15.6 ms p95; repeat note Live
reaches 560.4 ms with all forty trees complete and full plans. The large variation
prevents a stable baseline claim. The product frame target remains unverified.

PNG export captures each owned, settled HTML frame as separate pixels, then
replaces only its detached clone with an embedded image. Authored DOM and CSS
never enter the parent. CSS-tree checks styles and computed resource properties
before the capture package can fetch CSP-blocked URLs. External resources,
imports, ambiguous functions, failed images/fonts, clipping, unstable sizing,
changed or removed frames, and blank text/image captures reject export. Data
fonts have their own validated embed CSS. Frame and page captures share bounded
dimensions, embedded-byte limits, cancellation, and the existing deadline.
Chrome exports an 820 by 2444 PNG with all 24 styled paragraphs, a green image,
and the final paragraph; exact source and history remain intact. All 549 web and
eight Node checks, build, and Bend proof pass. A later Chrome data-font check uses
the package normal font with known glyph coverage: eight t glyphs measure
124.48 layout pixels and 122 PNG ink pixels, versus 192.66 and 187 in monospace.
Invalid font bytes give an error face, 88.91-pixel fallback, and an explicit PNG
error. Exact BOM/mixed-ending Undo restores the original source and history.
Native WebView PNG and full HTML/CSS fidelity remain open.

The outer edit surface fills the workspace. Its scroll area reaches the right
window edge; only its text column has the centered 860-pixel maximum width.
Narrow windows reduce the column width. The direct-child selector retains
separate table-cell sizing. Chrome checks cover wide and narrow windows, Files,
long-document scrolling, Source mode, and Unicode input with Undo. The build
and Bend proof pass. Native WebView layout acceptance remains open.

Shared HTML frame mounts fit unsupported styled HTML to measured content height.
They allow same-origin parent measurement but never authored scripts. Sanitized
srcdoc retains the restrictive CSP and other sandbox restrictions. A collapsed
viewport permits shrink as well as growth. Root, body, and frame observers and
window resize schedule bounded work. Eight successive cycles or a height above
16,384 pixels stop sizing with a complete-source reveal notice. Internal scroll
access is not claimed. The current load alone may settle image/font results.
Print readiness waits for resources and a quiet sizing interval, with a finite
deadline. Disposal removes handlers, observers, resource listeners, and timers.
Chrome confirms 2,278-pixel styled content, 4,006-pixel narrow reflow, 50-pixel
short content, a final paragraph inside both edit and print frames, data-image
decode, authored-script removal, capped source reveal, Unicode source input,
and exact original-source Undo. Unit checks cover font readiness; Chrome also
confirms embedded font layout and PNG pixels above. Native WebView acceptance
remains open. Full HTML/CSS and native pagination
fidelity remain open. Settled self-contained frames can export as described above.

Versioned layout preferences retain only the last accepted Files folder and
Files, Outline, or hidden pane choice. Native folder paths stay literal and
are bounded to 8192 UTF-8 bytes. Invalid or unavailable storage uses defaults;
failed writes retain the current launch's choices. Startup applies the pane
once before edit-surface construction. Recovery Retry does not apply it again.
Hidden Files defers its restored root read until disclosure. Missing roots show
Retry and retain their saved path. Only a current successful chosen-root read
persists a new folder. Cancelled, blocked, stale, failed, and disposed results
cannot replace the preference. Pane changes retain source record, selection,
history, baseline, and recovery. Disposal prevents later pane writes. Native
directory validation remains authoritative; native acceptance remains open.
Pane choice persists in desktop and browser modes. Folder restoration runs only
in the desktop app; browser mode never reads the saved native folder.

Native launch requests wait in the host queue until recovery startup succeeds.
The renderer registers first; successful Retry enables draining too. Batches
open serially through guarded Open and retain earlier tabs after a later failure.
Exact-path tabs retain unsaved source record, history, baseline, and recovery.
Busy and composition events are consumed with a repeat-Open message, never
replayed. A new notification during a pending take conservatively rejects the
whole reply. Skipped or truncated requests have a separate dismissible notice;
file status updates and typing cannot clear it. Disposal rejects late results.
Native OS Open and supported-platform runtime acceptance remain open.

Production can retain an ordinary-only preview index in eligible note documents.
The shared complete-tree, source-envelope, neighbor, and selection guards remain
intact. Note ranges, text, order, labels, numbers, and duplicate flags must map
exactly. Changed notes, resources, partial trees, and uncertain edits use full
construction. Local updates rebuild all note widgets at current source ranges.
Earlier selection-only full projections discarded the ordinary-only index.
The separate selection layers above replace that behavior. Plain documents
keep their existing path. Integration checks
cover fresh models, complete decorations, source record, tab/path changes,
Source mode, and Undo/Redo. Four growth runs pass 960 source/display comparisons
with complete trees. Note-bearing 1 MiB medians fall from about 52–93 ms to
16–18 ms. Plain medians increase slightly in this batch; first fallbacks remain
costly and can get slower. Native frame speed and input acceptance remain open.
Code/HTML resource batches retain full fallback. Their partial trees prevent a
complete-document timing claim; separate settled-tree checks verify full display.
Chrome confirms Unicode input, shifted reference and definition source reveal,
definition edits, Source mode, exact original-source Undo, Redo, and continued
local input. All 524 web checks, six Node checks, build, and Bend proof pass.
These browser checks do not establish native IME or platform acceptance.

An inactive note-aware preview index retains ordinary block ranges and rebuilds
the complete current note overlay. Definition opacity requires complete
top-level nodes wholly within one accepted definition; partial intersections
reject. Ordinary collection keeps global note suppression before partitioning.
Local word edits retain exact mapped note bounds, source text, order, labels,
identifiers, numbers, and duplicate flags. Changed notes and unsupported blocks
use full construction. RangeSet.join adds current-position note widgets without
enumerating ordinary ranges. Note work still scales with note count and content.
Four growth runs pass 960 exact-source/decorations checks with complete trees.
Note-bearing 1 MiB medians fall from about 50–90 ms to about 16–22 ms. First
fallbacks and plain candidate cases can get worse. That trial kept production
unchanged until the integration above removed redundant full partition work and
retained the existing plain path. Native widgets and frame speed remain unverified.

An inactive CPU diagnostic profiles sixty growing word edits in a 1 MiB
note-bearing document. Profiling stops before each independent source and
decoration check. All published trees are complete and all preview plans are
full. Preview collection and decoration construction take about 69–74% of
accepted CPU samples; footnote-model work takes about 3–6%. Model identity
changes do not imply full parsing: stable-span mapping creates new models.
The next speed change must reduce full preview work while preserving global
note numbers, source ranges, definition content, and selection reveal. Raw CPU
profiles prove neither elapsed edit speed nor native frame latency.

An empty footnote model can retain a lexical absence certificate from a complete
Markdown-body scan for literal [^. Each source change checks its new text and
one UTF-16 unit on each edge, including deletion joins. The metadata body
boundary must stay equal. A marker or changed boundary uses the existing parse
path. Empty note arrays alone cannot supply this certificate. Fresh-model checks
bypass the certificate. Exact source and history remain intact. Two sequential
growth comparisons reduce plain 1 MiB state-edit medians, with mixed p95. These
clocks exclude DOM, native input, and screen frames. Note-bearing documents still
have substantial full-preview cost; the native frame target remains open.

Main and table-cell edit surfaces set dir auto on visible source lines and enable
CodeMirror per-line text direction. The browser chooses each line's base direction;
CodeMirror retains bidi ordering, visual cursor commands, selection, and history.
Visible line decorations use source line starts once, including wrapped lines.
Document and viewport changes rebuild those attributes. Generated table cells,
semantic HTML paragraph/heading wrappers, footnote text, and print paragraphs,
headings, and cells use automatic direction. Authored supported HTML dir stays
intact. Table column order and app controls retain their existing direction.
No directional characters are inserted in the source record. Native bidi, IME,
and platform input acceptance remain open.
Chrome checks confirm computed RTL/LTR for mixed and wrapped lines, visual
Hebrew Left/Right movement, RTL cell input, exact cell Undo, Source mode, and
print direction. DOM tests alone do not establish visual cursor behavior.

Local Markdown and text links use explicit Mod-click/Mod-Enter and the guarded
Open workflow. Literal # splits the fragment before percent decoding. Encoded
filename punctuation decodes once in the host. Queries, controls, malformed
escapes, other extensions, and URL schemes are rejected. Relative paths require
a saved origin. Native resolution returns a canonical path and origin path.
Same-file links retain the origin tab. Other exact canonical-path tabs retain
their unsaved source, baseline, recovery, and history. Other alias/case tabs can
still remain separate. Origin identity, path, source, selection, and page lifetime
must agree after resolution. Busy input is never replayed. A new file uses normal
recovery and bounded UTF-8 Open. A fragment selects an exact package heading in
the adopted current document. Missing headings retain that document and report
failure. Source mode shares this route. Resolution does not freeze file contents;
Open remains authoritative. Native local-link and platform acceptance remain open.

Direct, reference, and explicit autolink HTTP/HTTPS destinations use the same
Mod-click/Mod-Enter navigation route as heading links. Exact package link ranges
and first definitions supply destinations. URLs must be absolute, have a host,
and contain no credentials or literal Unicode control characters. Original and
normalized URLs are bounded at 8192 UTF-8 bytes. Normalization retains encoded
path spelling and converts Unicode hosts through the platform URL parser.
The native command opens the normalized URL in the system browser; the edit
surface never navigates. Automatic plugin click opening and JS opener permissions
stay disabled. Outer/cell/form composition and busy file commands reject input
without a queued launch. Source record, baseline, recovery, and history stay
unchanged. A host request is immediate and cannot be recalled after dispatch.
Late status requires the same document, source, selection, request, and status
ownership. Disposal invalidates status publication. Authored
HTML IDs, native browser launch, and platform acceptance remain open.

Heading links use package GitHub-style slugs from heading text, including image
alt text and excluding HTML tags. Duplicate names get package suffixes. Mod-click
and Mod-Enter follow direct and reference fragment links in this document.
Both Markdown parsers must agree on link and target source ranges. First accepted
definitions supply reference destinations. Fragment percent escapes decode once.
Malformed or missing targets retain selection, focus, source record, and history.
Code, tables, metadata, images, and footnote definitions stay outside this route.
Composition, active cells, busy commands, and cross-link selections reject it.
Read-only navigation is permitted; ordinary clicks retain source editing.
External/file links and authored HTML IDs remain outside this heading route.
These slug rules do not claim agreement with every Markdown renderer.
An empty fragment selects the start of the Markdown body. Browser checks confirm
Command-click reference navigation, Unicode Command-Enter, missing-target
stability, ordinary source editing, Source mode, and exact Undo. Native keyboard
and Windows/Linux acceptance remain open.

Supported block HTML in the edit surface uses the same inert fragment validator
as export. Exact UTF-16 package and Lezer block bounds must agree. The package
value supplies content without quote/list continuation prefixes; original bounds
still reveal source. Deferred validation stays outside the startup graph.
Final sanitization removes actions and authored control attributes. Accepted
blocks have natural height, themed text, and contained code/table overflow.
Unsupported tags, styles, resources, or range disagreement retain the isolated
frame. Disposal and disconnection reject late success and failure publication.
Integration checks retain exact source record and history through reveal,
Source mode, and Undo/Redo. Full HTML/CSS and native input acceptance stay open.
Inline-size containment prevents long code from expanding the writing column;
it does not constrain block height. Chrome checks confirm complete long content,
code scrolling, wide table wrapping, themed ink, keyboard reveal, and exact Undo.

The Files sidebar retains nested list and button semantics. Arrow Up/Down,
Home, and End move through connected visible entries, including Retry. Arrow
Right expands a folder or enters loaded children. Arrow Left collapses a folder
or returns to its parent. Keyboard input uses the same busy and composition
guard as clicks. No delayed focus request waits for a directory read. Collapse
returns descendant focus to its folder. List replacement returns removed input
focus to its folder or Refresh control without taking focus from another
surface. Disposal removes the key listener. Literal native paths and the
guarded Open route stay intact. These controls do not claim ARIA tree semantics.
Chrome fixture checks confirm folder expansion, child and parent navigation,
Enter activation with a literal Unicode path, and collapsed-entry skipping.
The fixture retains exact source and history; it reads no native directories.
Native keyboard and accessibility acceptance remain open.

The outline marks the current source section with aria-current location. An
active table cell supplies its source position; otherwise the main selection
head supplies it. Selection-only changes retain heading buttons. Arrow Up,
Arrow Down, Home, and End move button focus; activation uses the guarded
source-navigation route. Heading rebuilds map an existing outline focus without
taking focus from another surface. Hidden outlines discard their list. Source
record and history stay unchanged by navigation. Integration checks cover these
rules. Chrome checks confirm End/Arrow Up/Enter, returned document focus, and
the current-section highlight. Native accessibility acceptance remains open.

Toolbar, native-menu, and cell keyboard Undo/Redo share a cell-aware command.
An empty history command retains the active cell and its selection. Accepted
history uses the existing deferred cell restoration; later form focus cancels
its focus request. Restored retained children regain input ownership when
history returns from another table. Changed history focuses the outer surface
until guarded restoration selects its cell. Outer and cell composition reject the command. Integration
checks cover both app routes, subsequent cell input, exact source record, and
unchanged baseline. Native menu input acceptance remains open.

Native File and Edit document commands use an allowlisted event targeted at
the main window. The renderer invokes the existing connected, enabled tools
button. Busy commands and outer, cell, or form composition reject menu input;
rejected events are never queued. Late listener registration is removed after
page disposal. Listener failure reports Use Tools. Native Undo/Redo use the
same CodeMirror source/history route as the toolbar. Document Undo/Redo is
rejected while a form or search text field has focus; its ordinary keyboard
Undo owner stays intact. The Print modal blocks renderer menu commands.
Native menu items add no
accelerators; current WebView shortcuts retain their owner. Close Document,
Close Window, and Quit keep separate existing guards. This changes no source
record, baseline, or recovery contract. Host mapping and renderer/app checks
cover routing and lifecycle; native menu and platform acceptance remain open.

The main edit surface has the accessible name Markdown document and uses the
current document title as its description. Labels stay attached through tab
switches, Source mode, and new editor states. Active table-cell edit surfaces
have row and column names and single-line semantics. Their description explains
Enter/Escape exit and Tab navigation, including final-cell row insertion.
These attributes change no source record, selection, history, baseline, or
recovery. Integration checks cover mode/tab changes, cell navigation, Escape,
and exact source/history. Chrome's accessibility tree exposes the document and
single-line cell names, and keyboard Tab/Escape updates focus as expected.
Screen-reader and native platform acceptance remain open; DOM and browser
accessibility attributes alone do not establish that acceptance.

The document bar shows a word count beside the title. It counts the complete
normalized Markdown text, including markup, code, and metadata. Counts exclude
the source BOM; CRLF and bare CR each become one line break. English-locale
Intl word segmentation supplies words; character details count Unicode code
points, including spaces and newlines, not graphemes. A module worker owns the
scan. A 500 ms idle delay precedes snapshot construction. No scan runs inside
an edit transaction. New text clears the old count and cancels in-flight work.
Generation, document identity, and worker ownership reject stale results.
Unchanged text retains its count through presentation and file-status changes.
Page disposal clears timers, listeners, workers, and pending text references.
Worker or segmentation failure shows Count unavailable without a main-thread
fallback scan. This changes no source record, selection, history, baseline, or
recovery. Unit checks cover cancellation and exact source/history. Chrome has
a worker-backed typing check, exact large-paste Undo, and a 400-pixel bar check
with 10,000 words. Native WebView and platform acceptance remain open.

Footnote models retain upstream block-code ranges outside note definitions.
Same-line word edits can map those ranges only with published Markdown CodeText
coverage and complete unchanged word neighbors inside the accepted block.
Every change must qualify; other changes use fresh parsing. Code language
mounts, fence marks, info strings, container prefixes, inline code, and note
definition content cannot supply that coverage. No code value or AST is retained.
Source record, history, baseline, and recovery stay unchanged. Full fresh-model
and exact source Undo/Redo checks cover this foreign path. Isolated state clocks
show a large reduction, but the native frame target remains unverified.

The inactive nesting guard passes resource source/decorations checks and
indentation/completion comparisons, including accepted text and selection.
Its cached scan still visits thousands of new tree objects at 1 MiB. Keep it
outside the app. The earlier resource clocks did not record published-tree
completeness; the fresh decoration builder only agrees with the published tree.
The later code batch records tree lengths, CodeText coverage, and metadata
boundaries. Before guarded code reuse, word edits inside code with a footnote
had roughly one-second medians in both parsers. The isolated check confirms
costly full-body parsing. Guarded reuse is described above. Full preview still
has substantial cost and can publish partial trees in large documents.
Source record, edit surface, history, baseline, and recovery stay unchanged.

An inactive nested-parsing guard retains upstream code and HTML parsing for
every target node and for partial/stopped parses. Only complete, unstopped,
full-input parses without such nodes can omit that pass. Weak cache keys store
structural presence only. Source, decorations, mounted trees, lazy code loading,
language data, and partial-tree recovery have experiment checks. Two comparisons
show lower plain 1 MiB medians, mixed p95, and adverse note cases. The candidate
stays outside the app until resource-bearing performance and guard cost are
measured. No source record, edit surface, history, baseline, or recovery behavior
changes. The native frame target remains open.

A plain-edit CPU profile attributes most samples to language parsing. An
inactive comparison changes only the YAML wrapper, with identical Markdown
configuration. All source and complete-decoration checks pass, but two timing
pairs vary widely and show no consistent direct-parser gain. Production retains
the upstream YAML wrapper. No metadata dispatch parser is added. The next
diagnosis must isolate work shared by both package configurations. This changes
no source record, edit surface, history, baseline, or recovery. Native frame
performance remains unverified.

Plain top-level paragraphs and headings can use a persistent preview block index.
Initial eligibility requires a complete published Markdown Document with exact
0..document-length bounds; parser-context availability alone is insufficient.
Block values retain parser identity and a bounded source envelope, with no
editor state or widget. A single interior word edit with complete neighbors
keeps old and new selections inside its paragraph. The mapped index checks at
most eight adjacent blocks per side. New parser identities are rebuilt until
exact stable outer identities, source envelopes, and line bounds agree, or EOF.
Mapped decorations replace the complete dirty region, including line marks.
Metadata, containers, resources, notes, escapes, structural edits, and uncertain
trees use full construction. Rejected eligibility stops at the first failure.
Full and indexed plans have distinct types. Indexed plans retain no absolute
item array. previewItems explicitly materializes current diagnostic items; it
does not run in a local edit. Selection changes after indexed edits rebuild
through the full path. Context, path, table, configuration, and parser changes
retain guarded fallback. No-op updates can retain an unchanged indexed plan.
This changes no source record, history, baseline, or recovery. Exact source,
selection, Undo/Redo, and complete-decoration checks pass. Two growth comparisons
show large gains on eligible plain documents, with costly first fallback samples
and adverse footnote cases retained. Index creation is full-document work.
These clocks do not establish native frame speed, open time, or memory.

The Files sidebar uses literal native paths and filename text. Folder buttons
load child lists on request. Root refresh, root change, folder collapse, retry,
and page disposal invalidate older request results. Failed reads offer Retry
folder. A chosen root stays unchanged after picker cancellation. Host scans
stop after 2,000 entries and report incomplete lists. Files and Outline share
the left sidebar area. Composition and busy file commands block sidebar actions.
File selection uses the existing guarded Open route or activates an exact-path
tab. Alias and case variants can still create separate tabs. Active file buttons
use aria-current. Directory reads change no source record, history, baseline,
or recovery. Browser fixture checks keyboard expansion, Unicode labels, retained
source/history, and narrow layout with a test folder service. Native picker,
file identity, and platform sidebar acceptance remain open.

The compact document bar follows typora-layout.png. Its title is literal text
with an unsaved mark. Files, Outline, and Source remain available. Tools is a non-modal
disclosure for file and formatting controls. Opening or closing it changes no
source record, edit surface state, history, baseline, or recovery. Pointer
activation retains editor focus and selection. Outer, cell, and form composition
defer disclosure changes. Escape from Tools returns focus to its button.
Link and Image forms, file warnings, and recovery controls stay outside Tools.
A single document hides its tab row and retains Close document in Tools.
Every tab render updates visibility, including failed host retirement.
The writing column is fluid and uses system text fonts. Source mode and cell
input retain monospace fonts. The outline is 250 pixels wide, or 150 in a narrow
window. Chrome checks compact and narrow layouts, dark contrast, Source fonts,
cell padding, and keyboard Escape. Native layout acceptance remains open.

The source record retains original Markdown text, its BOM, and its line endings.
The edit surface is CodeMirror's normalized text document. A source patch maps
edit-surface positions to the source record. CodeMirror owns input and history.
Undo restores both the edit surface and its exact source record.
Source offsets use a weak index owned by an immutable source record. The index
stores each CRLF newline's logical UTF-16 position. Binary lookup counts only
CRLF positions strictly before the requested position; LF and bare CR need no
extra offset. A new record builds its index on first lookup. Undo can reuse the
old record and index. Source patches, flat-list Return, table proposals, and image
paste checks use this mapping. Index construction is still a full source scan;
it is measured separately from cached lookup and is not an incremental rope.
New ordinary line breaks use the first line ending in the source record, or LF
when the record has none. Flat-list Return can supply the current line's ending.
Existing line endings remain unchanged. File commands defer during composition.

The main app uses document tabs for its file workflow. A tab owns one editor
state, path, baseline, Save uncertainty,
Source mode, scroll snapshot, and recovery queue reference. IDs cannot be reused.
Accepted switches end cell editing, call the form-invalidation hook, retain an
unlocked state, and restore the target state and its scroll effect. Guards run
before these actions. Scroll effects add no source or history edit. Removal
requires another active tab; the caller must confirm host recovery clearance and
retirement first. Tab labels use literal text. Arrow keys move focus; normal
button activation requests a document switch. New, Open, file drop, and Restore
add tabs and retain the other documents. Every host command and image read uses
its captured document ID. Close confirms only its target, flushes its queue,
activates another live document, and clears recovery before host retirement.
Failed retirement retains the document and rebuilds its recovery copy. Closing
the last tab creates a replacement first. Native scroll acceptance remains open.

Live preview uses decorations and widgets in the edit surface. A widget reveals
its source when selected. Source mode removes preview decorations. A rendered
widget is never the saved document. The desktop host owns native file effects.
Edit commands supply source edits, not another history.
CI builds one editor artifact. Its checkout SHA and complete file hashes must
match before each native platform build. Build evidence does not establish platform input or rendering acceptance.
MathJax supplies formula rendering. The micromark math extension supplies formula
source ranges. Selected ranges include boundary positions and all selections.
HTML preview frames have no scripts or external resources. Same-origin access
permits parent sizing only; the frame has no script permission.
Removed widgets discard pending renderer results. Source mode retains history.

Paragraphs and headings with inline HTML use a deferred semantic projection.
The upstream GFM/math tree retains heading level, Markdown formatting, formula
values, and image slots. The shared raw parser validates a complete fragment
before resources start. Inert text formatting stays in the edit surface and
uses its theme and natural height. Authored slot attributes, actions, classes,
and IDs cannot enter that surface. Inline styles and unsupported HTML retain
the isolated frame with a visible notice. HTML blocks keep their frame route.
The widget retains its exact parser block source range. Selecting it reveals
source. Container prefixes remain in the source record. The shared document-text
cache retains accepted full-body paragraph and heading AST nodes and image
definitions outside metadata. Projection requires both parser types and exact
UTF-16 block ranges to agree, then creates a new root without changing cached
nodes. It never strips container text or selects the nearest node. Range/type
disagreement, including a partial block, uses the isolated fallback. Multiline
quotes and lists retain package content and original resource source ranges.
Document footnote ranges supply global numbers, including repeated references.
Only the selected node and accepted image definitions enter projection; no
synthetic note definitions or second footer is needed. Missing notes stay literal.
The widget owns its quote border. Covered source lines have no duplicate border;
uncovered quote lines retain theirs. Selecting only the first-line prefix reveals
the paragraph and all its continuation prefixes together. Selection groups
include that prefix. Full decorations remain the differential reference.
Retaining AST nodes adds memory and requires a full body parse, even when the
HTML block has no image syntax. These rendering checks establish neither typing
speed nor idle memory. Reference changes conservatively replace body HTML widgets.
List paragraphs own their same-line markers in one block widget. A separate body
child owns deferred HTML and resource results. Bullet, number, and task controls
retain their parser source ranges and existing input guards. The replacement
covers the first-line prefix, while projection keeps the exact paragraph range.
GFM task content starts after its task marker and horizontal separator; exact
package range agreement still gates projection. Same-line nested markers share
one prefix column and have no overlapping standalone widgets. Markers on later
lines stay separate. Later paragraphs in loose items do not repeat a marker.
Selection includes the complete list owner and the physical first-line prefix.
Marker equality, shifted ranges, groups, and selection updates retain this data.
Chrome checks marker alignment, keyboard source reveal, task toggles, Unicode
input, and exact Undo/Redo. Native list-HTML presentation remains open.
Semantic text widgets use ordinary paragraph spacing. Source blank lines remain
line boxes; they supply spacing between loose items and paragraphs. Tight list
items have no additional widget margin. Heading sizes and weight match source
heading presentation. Normal text whitespace joins soft breaks, while generated
br elements keep hard breaks and inline code retains its spaces. Isolated HTML
keeps its frame spacing. Every semantic replacement includes its physical
first-line prefix, with exact AST/source bounds retained separately. Quotes and
indented headings therefore have no prefix-only line before their widget.
Chrome rectangle checks match plain and HTML paragraph/heading heights and
retain Source mode line heights. Pointer reveal keeps source and history.
The later Unicode/keyboard browser batch was interrupted by a tool timeout;
reconnection failed before state or a screenshot could be read. That batch is
unverified. Automated prefix reveal and exact Undo/Redo checks pass. Native
layout and IME acceptance remain open.
Opening source, edits, path/document changes, removal, and Source mode cancel
deferred validation and nested jobs. Failure after partial resource startup
releases those mounts before publishing fallback. Rendering changes no source,
history, baseline, or recovery. Chrome checks formula and image pixels, heading
and quote layout, Unicode typing, Source mode, and exact Undo/Redo with a test
host. Native body-HTML input and display acceptance remain open.

Selection-only preview updates reuse unchanged decorations. An overlap group
contains item source, hidden marks, physical line starts, and list owner ranges.
Touching groups merge. A changed group uses the full decoration construction,
so revealing a replacement also restores its nested marks. All selections and
both boundaries take part. The group index is built on first selection update.
Source, syntax tree, image context, or table-cell changes discard it and use the
full construction. Large selection changes can also use the full construction.
The full rebuild remains the integration-test reference. This reduces measured
selection-state work; it does not establish typing or screen-frame speed.

Preview analysis reuses top-level parser blocks only when the tree identity and
exact physical-line envelope match. The envelope includes marker-label text and
quote lines outside the exact block span. Its text limit is 65,536 UTF-16 units.
Cache entries contain plain item data and a source anchor, with no editor state,
source document, or widget. A moved block maps item, hidden-mark, marker, and
list-owner ranges together. Unchanged anchors retain item objects. Footnote
definition envelopes and image-containing blocks use fresh analysis. The global
footnote overlay and image-definition resolution stay current. Mounted Markdown
body navigation retains metadata boundaries; unsupported tree nodes use the full
collector. The full traversal remains the item and decoration reference.
Full fallback edits still enumerate all top-level blocks and assemble the complete decoration set.
An edit-decoration group prototype was rejected after mixed total timing results.
Its inactive source and measurements are under tests/performance/experiments/.
A later shifted ordinary-range cache transfer was rejected after every growing
edit median got worse. That candidate was removed exactly. A separate CPU
profile attributes most preview-update samples to decoration construction and
cached collection; direct oracle calls and unattached GC are excluded. A later
instrumented diagnostic separates traversal, validation, hit shifting, decoration
enumeration, suppression, and combined set sorting/assembly. Timer reads add cost.
When production construction has no replacement widgets, it skips the identity
suppression filter and its array copy. The fresh reference retains that filter.
All replacement-bearing paths stay intact. Two timing pairs show small median
reductions on most affected routes, with mixed p95 and variation in unchanged
footnote routes. This removes redundant work; it proves no tail-latency gain.
Neither profile nor editor-state clocks establish native frames.
The retained test prototype uses a persistent block RangeSet for plain paragraphs
and headings. Local word edits rebuild their paragraph and adjacent new tree
identities until exact stable boundaries or EOF. Two or three blocks are visited
in both tested document sizes. Its explicit settled-tree counts are not latency
results. Production integration is described above; parser-context completion
must not be confused with the tree published in editor state.
The growing-edit benchmark checks exact source and complete decorations after
every insertion. It does not establish native input or screen-frame performance.
Cached collection uses one lazy normalized-text snapshot per call to locate
physical lines and compare envelopes. A position on a newline belongs to the
preceding line. The snapshot and last-line interval stay local to the call;
new cache entries obtain their bounded envelope through document slicing.
Decoration construction and selection groups retain CodeMirror line lookup.
The full collector remains independent of the temporary snapshot.

Decoration construction reuses raw ranges for immutable preview items. A weak
item key stores only ranges and selection, table-editing, and physical-line
conditions. Shifted items get new widgets with current source coordinates.
Global replacement suppression runs when replacements exist. Range sorting still
runs on each construction.
The reference builder bypasses this cache. Small-document reparsing can replace
unchanged items, so reuse is not guaranteed after every source edit. This lowers
some measured construction costs; it does not establish the 16 ms frame target.

Table previews have compact Table tools controls. The structure group starts hidden. Cell
activation opens it, and cell exit closes it. A manual close stays closed through
typing and refresh until the next cell activation. Each table has its own group
ID. Disclosure changes no source, edit surface state, selection, or history.
Pointer activation retains input focus. Escape from the group returns focus to
Table tools; outer and cell composition retain the panel and focus. Read-only
state still permits disclosure and disables edit buttons. Table source remains
available with pointer, Enter, or Space activation through the same guarded
handler. Generic widget reveal does not intercept the action buttons. Active
cell restoration opens the new widget's controls after state replacement or
Undo/Redo. Chrome checks these keyboard routes, manual close with Unicode input,
row insertion, Undo/Redo, and compact reading layout. Native acceptance is open.
A table cell has a single-line raw Markdown edit surface. Its CodeMirror view
has no history. Each accepted cell edit patches the source record through the
outer CodeMirror view. Outer Undo and Redo synchronize the cell edit surface.
History retains the active table, cell ranges, and both selection positions.
Deferred restoration mounts the matching child without a source or history edit.
Stale children cannot patch another cell. A later state or user focus change
cancels pending focus restoration. Selection-only child updates retain unchanged
preview decorations. Chrome checks cover cross-cell Undo/Redo, reverse Unicode
selection, focus, and subsequent typing. Native WebView acceptance remains open.
Active cell ranges map through source patches, including typed edge spaces.
Unescaped pipes become escaped pipes. An odd final backslash directly before a
column delimiter gets a second backslash. Existing cell padding stays intact.
Table source reveals the complete table. File and display commands defer during
cell composition. Removing a table destroys its cell edit surface.

Table previews use the upstream GFM and math tree. MathJax renders inline
formulas in headers and cells. Package values retain TeX backslashes, including
escaped pipes; package ranges retain literal source on failure. Active cells
show raw source. Opening a cell or removing a preview cancels formula results.
Rendering creates no source or history transaction. Image alt text keeps math
literal. Table reference collection retains accepted package definition records,
including titles in containers; the first definition wins. This adds a body
parse to reference collection and does not establish typing performance.
Chrome formula drawing, cell input, Enter, Undo, and Redo have a UI check.
Native table-formula display and Windows/Linux acceptance remain open.

Tab in the last navigable table cell appends one body row and opens its first
cell. Header-only tables and omitted last cells use the same validated row plan.
The new row uses the source record's first line ending and the parsed alignment
continuation prefix. Failed insertion consumes Tab and retains child input,
selection, and focus. Shift-Tab retains its navigation behavior. Structure
commands isolate their history event from prior and later typing. Undo restores
the former cell and selection; Redo restores the new row and first-cell focus.
Integration key-event checks pass. Native keyboard acceptance remains open.

Table inline HTML uses the shared upstream HAST raw parser. Only cells with
HTML load that parser. A complete cell fragment protects generated math and
image slots with private custom nodes, then retains inert semantic tags and
dir, lang, and title. Authored resource URLs, actions, styles, IDs, classes,
and slot attributes are removed. Resources start only after validation.
Unsupported fragments show complete cell slot source from Lezer ranges,
including padding and escaped pipes, without column delimiters or container
prefixes. Opening a cell cancels deferred parsing and nested resources. Late
results cannot replace its edit surface. Other cells can refresh while the
active child retains composition. Rendering adds no source or history edits.
Chrome checks formatting, formulas, image pixels, raw cell input, Source mode,
and exact Undo/Redo. Native table-HTML acceptance remains open.

Table images use package image tokens, document reference definitions, and the
same image loader as ordinary previews. Sanitized table HTML contains only
generated image slots; it contains no image URLs or link actions. Missing image
references stay literal. Active cells show raw source. Opening a cell, replacing
inactive cells, removing a table, and Source mode cancel its image mounts and
release Blob URLs. Pending results cannot replace the cell edit surface.
Image loads use the captured document ID and path. Metadata definitions are
excluded. A weak document-text key retains one lazily parsed reference environment
per body boundary; it retains no editor state. Source edits conservatively refresh
all tables, including unrelated cells. This is a correctness rule, not a speed
improvement. Chrome data-image decode, cell editing, and Undo/Redo have a UI check.
Native local-image display and Windows/Linux table-image checks remain open.

Table structure commands validate a patch plan before ending the cell edit.
The Table toolbar inserts two columns and two body rows after the last selected
outer block. Selected text stays intact. Inside a list, quote, or fence, the
complete outer block supplies the anchor, including internal blank lines.
Blank space outside blocks uses the physical line start. New separators use
the source record's first line ending. The complete proposal must contain the
exact new top-level table and retain every original outer block's ranges and
parent. The final filtered transaction retains the accepted changes, selection,
and active cell. Live preview opens the first header cell; Source mode selects
its text without an active child. One isolated outer Undo step restores prior
source and selection. Redo restores the new table and header input. Existing
row and column controls resize it. Native insertion acceptance remains open.
Column commands patch all rows in one history transaction. New rows use the
source record's first line ending. Existing slot text stays unchanged except
for the requested slot or alignment token. Empty edge cells and one-column
tables get the outer delimiters needed for valid GFM. New headers use Column.
Nested-table previews omit container prefixes only while rendering. Their
source retains each prefix. Structure commands support parsed lists and quotes,
including combined and tab prefixes. New rows copy the alignment row's
continuation prefix. Complete parser trees before and after the proposal must
retain the table, its container bounds, and surviving row ranges. Unsupported
changes retain the active cell and offer Table source. The exact final
transaction must retain the validated changes and target cell after transaction
filters run. Only then does the command end the child edit surface and dispatch
that transaction. Each command uses one outer Undo step. Chrome checks row,
column, and alignment changes, Unicode cell input, Source mode, and exact
BOM/mixed-line-ending Undo/Redo. Native container-table acceptance remains open.

Omitted cells have virtual ranges at the source row's end. Selecting them does
not change source. First input adds only the slots needed to reach that column,
and validates the new ranges before acceptance. History retains exact active
cell ranges and maps them through later changes. Replacing a whole source row
ends its cell edit, so an old cell cannot append to replacement text.

Search uses the normalized Markdown source, including hidden widget source.
Original BOM and line-ending spelling stay in the source record. Replace
commands use the outer history. Every search selection and replacement defers
during outer or cell composition. Find ends cell editing before selecting source.
The outline uses parsed heading ranges and text labels. Heading navigation adds
no history event. The outline refreshes when text or the syntax tree changes.
Collection skips only known leaf block types: paragraphs, fenced and indented
code, HTML blocks, tables, and horizontal rules. It continues through document
wrappers, lists, and quotes. The unpruned collector remains the differential
reference for partial and settled syntax trees.
Hidden outline content is deferred. Showing it sends a presentation refresh with
no source or history edit. Heading labels use an exact-source cache with at most
1024 entries; each cached heading has at most 4096 UTF-16 units.

List markers use parser ranges. Ordered markers retain their number and spelling.
Selecting any part of a list item, including continuation lines, reveals its
marks. Task checkboxes validate the current marker and change one character
through outer history. They defer during outer or cell composition and reject
read-only state. Quote lines have one border with a nested depth. Marker
rendering and focus never change source or create history.

Formatting controls send source edits through outer history. Parsed delimiter
ranges supply removal patches. Strikethrough uses the same command path as Bold
and Italic. New strike spans use two tildes; removal uses parsed marker ranges
and retains nested formatting. Code text rejects strike marks. The toolbar keeps
the edit-surface selection. Empty selections put the caret between new marks.
New nonempty inline spans must pass the Markdown
parser before acceptance. Code uses a longer backtick run and CommonMark padding.
Heading conversion retains the text line's ending and removes the underline
line when needed. Commands require one selection. Inline commands require one
line; headings support the first text line of parsed paragraphs and headings
inside lists and quotes. Their exact parser start retains all container prefixes.
Task items and continuation-line selections require source editing. Complete
before/after trees retain the ancestor chain and mapped container bounds.
Setext removal deletes only its parsed underline line. The exact final filtered
transaction must retain the requested patch before dispatch. Rejected commands
retain selection, source, and history. The next line is excluded when a
selection ends at its start. Active cell edits and composition defer formatting.
Commands do not use a partial syntax tree to guess the selected block.
Heading commands can complete a full document parse. These command checks do
not establish typing or first-frame performance. Native heading acceptance
remains open.

Code Block converts complete selected outer blocks to literal fenced code.
With a caret, it uses the current outer block; blank space creates empty content.
Physical boundary insertions retain all original bytes and line endings. The
fence is longer than each content backtick run, with at least three marks.
The final filtered transaction retains requested changes and selection, then
the full parser must accept its exact top-level fence bounds and literal
content. Untouched outer blocks retain mapped ranges and parents. Reverse
selections map inside content; an empty block puts the caret between fences.
Metadata, footnotes, and existing top-level code blocks require source edits.
A selected list or quote, including code within it, becomes literal container
source. One isolated outer Undo step restores source and selection. Native
Code Block input acceptance remains open.

Link controls capture one source range and a document generation. Every source
change or document reset invalidates that capture, even after Undo or Redo.
Apply and Remove recheck source identity, generation, and input guards. Apply
patches only changed fields, so untouched raw label, destination, title, and
separator spelling remain intact. Both package parsers validate the complete
link before acceptance. Destination checks include Markdown escape/entity
decoding. Raw angles require URL encoding. Multiline fields remain source edits;
existing multiline separators can stay unchanged. Cancel adds no transaction.
Form Escape defers during composition. Reference removal retains the label and
shared definition; reference updates remain source edits. Links do not navigate.

Theme is a presentation preference: System, Light, or Dark. It changes the root
palette without editor transactions or state replacement. Active outer and cell
composition, selection, source record, and history stay intact. The preference
is local to the app; unavailable storage does not prevent theme changes.
System follows the operating-system color preference. Code tokens use palette
classes. Isolated HTML retains a light canvas for authored colors. Mermaid diagrams use Pele and use the Mermaid default palette by default.

Return uses the flat-list Return command for flat list items and ordinary text.
It plans the edit from the current line only. Applying the edit still maps
source offsets and copies the source record.
A marker must start the line. A bullet (-, *, +) or an ordered number of 1 to 9
digits with . or ) needs a following space or tab. Ordered numbers keep their
leading-zero width and can grow by one digit; 999999999 and larger use plain Return.
A task marker [ ], [x], or [X] continues as [ ]. Return on an empty item removes
its marker. Parsed
nested lists, quote containers, and list continuation lines use CodeMirror's
Markdown command. Empty nested items exit one level. New task items are unchecked.
Ordered continuation can renumber consecutive later siblings in the same edit.
The package route uses the source record's first line ending; flat-list Return
uses the current line's ending. Existing endings and the BOM remain intact. Code,
HTML, table source, unavailable syntax, and rejected package commands use plain
Return. Each accepted Return uses outer history. Composition, read-only state,
and multiple selections reject the command before route selection.

Recovery copies contain exact source, a display label, and a revision. A single
serialized queue captures source and dirty state together. It waits 500 ms after
input, then sends the latest capture. Continuous input starts a checkpoint after
at most 2 seconds of scheduling delay; disk completion has no such guarantee.
A failed capture stays pending; a newer
capture takes its place. Retry gets a higher revision. Confirmed Save clears a
copy only when the current source equals the saved baseline and Save is certain.
Later edits and uncertain Save retain a dirty copy. Checkpoints never dispatch
editor transactions. File transitions wait for the required recovery result.

The desktop host owns recovery files and session leases. Each renderer start
gets a new token and retains its predecessor's copy. Startup offers inactive
session copies. Restore reads a validated copy, then adds an untitled unsaved
tab with a new history and no file baseline. Existing tabs stay intact.
It keeps the recovery copy and original file. Labels are display text only.
Checkpoint failures show Retry recovery; failed Close keeps the window open.
Startup obtains all live host documents and replacement recovery sessions in
one host operation. It needs no document-0 assumption. Baselines start new
histories; predecessor dirty copies remain available through Recovery. Input
stays locked after failed startup until Retry succeeds. Quit captures and flushes
every tab. Window Close clears every current copy; a partial failure rebuilds
the retained dirty copies before the user can retry.
Recovery starts from the last confirmed checkpoint, not an unconfirmed keystroke.

Application Quit uses a host request token. Busy file commands and outer or cell
composition reject the request with a retry message. Input locks before discard
confirmation. Cancel and errors restore input. Confirmed Quit captures the latest
exact source and awaits recovery before it approves host exit. It keeps the copy.
An approved request keeps input locked until exit. Listener startup buffers old
events until the host returns a current pending token. Neither Quit nor Cancel
adds source or history edits. Window Close remains a separate clear policy.

File checks compare disk bytes with the host's saved baseline. They never change
source or history. Checks do not overlap. Document transitions invalidate pending
results and errors. Checks defer during file commands and outer or cell composition.
Reload waits for discard confirmation and recovery acknowledgment before reading.
A valid read starts a new history. Cancel and failed reads retain source and
baseline. Uncertain Save blocks Reload and Save As until Check Save succeeds.

Native file drop accepts one Markdown or text file with an md, markdown, or txt
extension, without changing path spelling. It uses the shared Open load path.
Busy commands and outer, cell, or form composition prevent tab creation.
Recovery acknowledgment precedes the host read. Rejected drops and failed
recovery or reads retain existing tabs, source, and history. A valid read adds a
tab with a new history and updates image context and file checks. The extension
only selects this workflow; the host still validates file bytes. A drop hint is
presentation only. Page disposal removes the listener, including late registration,
and ignores later events. Native OS drop acceptance remains unverified.

Desktop New, Open, and Save As shortcuts use the existing toolbar command route.
The platform modifier is Command on macOS and Control on Windows/Linux. Only
these three shortcuts use document capture, because table widgets stop bubbling
keys. Plain Save remains the editor or table command. Outer, cell, and form
composition prevent file shortcuts. Repeat keys add no command. Page disposal
removes the listener. Native menu interception still needs a platform check.

Image preview uses parser source ranges and package-decoded destinations, titles,
and alt text. Reference-definition edits refresh their images. File transitions
refresh image context, even when a Save retains the same path. Selecting an image
reveals source and never navigates. Loading and failure show alt text. Removed
widgets ignore pending results and revoke Blob URLs. Source and history stay intact.
Local and data images have an 8 MiB byte limit and PNG, JPEG, GIF, or WebP signature
checks. The image-size package reads dimensions before a Blob URL or browser
decode. Each side must be at most 16,384 pixels and the image must have at most
32 Mi pixels. Missing or invalid dimension headers fail with editable source.
Clipboard paste and image-file drop use the same check before source edits.
Table preview and print use the shared loader. This header check does not bound
animation frames, decoder allocations, or total document image memory. It does
not validate the complete file; browser decode failures retain source. Local paths
decode percent escapes once and resolve against the host document directory.
Untitled relative paths fail with an edit hint. Local SVG uses strict UTF-8 XML
with an SVG root namespace and no document type. Browser XML parsing and
DOMPurify supply its preview tree. CSS-tree keeps ordinary style rules and
fragment URLs; CSS at-rules, unparsed values, unsafe functions, external hrefs,
embedded images, scripts, event handlers, foreign objects, and animation are
removed. Prefixed SVG element names normalize before sanitization. Only the
serialized result becomes a Blob-backed image; authored SVG never enters the
app DOM. Positive pixel or absolute physical dimensions, or a finite positive
viewBox, set intrinsic size. Root width, height, and minimum/maximum sizes
normalize together. SVG input and prepared bytes have the 8 MiB limit and the
same side/pixel limits. These limits do not bound filter complexity or total
decoder memory. CSS resources and SVG data/clipboard images remain unsupported.
Body, table, and print use the same loader and cancellation rules. Chrome drawing,
canvas pixels, source mode, chosen-file copy, Apply, Undo, and print have a check
with a test host. Native SVG acceptance remains open.
HTTPS images use the browser's image loader with no referrer; they
make network requests and expose the client address. Remote images can use other
browser-supported formats, including SVG, and have no app byte or dimension limit.
The native CSP restricts remote image resources to HTTPS; the app does not check
each redirect destination itself. Table images use the same resource rules.
HTML frames keep their separate resource rules.

Image controls share the link form and source-patch commands with an explicit
image kind. Insert, Apply, and Remove use the outer history. Remove retains the
raw Markdown alt label and keeps shared reference definitions. Reference updates
remain source edits. Apply retains unchanged field spelling and rechecks the
source capture and input guards. Choose Image fills an encoded absolute path;
it does not edit source. In the desktop app, Copy beside document is optional
and starts unchecked. It requires a saved document with no uncertain Save.
Choose then reads and checks the image bytes and copies them to a sibling
stem.assets folder. It fills an encoded relative path; Apply adds the source edit.
Cancel and Undo retain copied files. Late completed or uncertain copies report
their result, even after form cancellation. Stale reads stop before copy IPC.
SVG copies retain the original file bytes, including content removed from the
preview. Sanitized preview bytes never replace the copied asset or source record.
Each picker request has a token. Cancel,
reopening, field input, changed source, and composition reject late results.
Selected path punctuation encodes once; native separators and drive spelling
remain intact. Windows drive and UNC host checks still need a Windows run.

Image-only clipboard paste inserts one PNG, JPEG, GIF, or WebP. Embed in Markdown
is the default. Copy beside document is a desktop presentation preference and
requires a saved document with no uncertain Save. It sends checked raw bytes
through the existing native copy command and inserts an encoded relative path.
Copy never generates base64 or falls back to Embed. A conservative path
reservation protects the source limit before reading; package insertion and the
actual complete source size are checked again after copy. Preference changes
cancel pending reads without source or history effects. Plain text, HTML, and
URI lists retain ordinary CodeMirror paste.
Encoded source must fit the 8 MiB document limit. Package image insertion checks
protect source contexts. The request captures source, selection, tab identity,
path, and generation; later edits, Undo, switches, or presentation effects cancel
it. Busy, composition, and read-only guards run again before dispatch. Accepted
paste adds one outer history edit and no baseline effect. Copy is a separate
file effect. Cancel and Undo retain copied files. Completed or uncertain copies
report their captured document path through an independent notice, even after
tab or cell changes. Rejected
image-only paste is consumed so empty-text fallback cannot delete a selection.
Table cells accept raster paste through their filtered child edit and outer
history. The accepted package reference context protects code, math, links,
HTML, and existing image syntax. The inserted image must match its exact cell
range. Omitted-cell padding participates in the encoded size check before a
proposed table parse, then the complete filtered outer patch is checked again.
Cell end, switches, source changes, Undo, and selection changes cancel reads.
Cell and outer pastes share result and status request order. Later
requests supersede older result and status publication. Inline data works in an
untitled document and remains in Save and recovery. The image form retains its
separate chosen-file copy option.
Native clipboard acceptance remains open.
Chrome binary clipboard paste, 32 by 32 PNG decode, Undo, and source-mode Redo
have a UI check. The desktop WebView and Windows/Linux paths remain unverified.
The same Chrome checks cover paste into a selected table cell and Enter.
Chrome also checks copied clipboard bytes, relative-path rendering, and exact
Undo/Redo in document text and table cells with a test host. Native copy IPC and
clipboard acceptance require their own platform checks.

Native raster or SVG file drop defaults to Link original and inserts an encoded
absolute image path at the outer edit surface's drop position. Copy beside
document is a separate desktop preference and requires a saved document with
no uncertain Save. It leaves the current selection text intact and
adds one outer history edit. The host reads and checks image bytes before
insertion. The proposed source must fit 8 MiB. Document state, scroll, layout,
display scale, input guards, and shared paste/drop request order must still
match after the read. Native and CSS scale must agree; viewport zoom or offsets
are unsupported. Toolbars, other widgets, code, links, math, and metadata
reject insertion. Link original leaves the file in its original location. Copy
publishes the checked original bytes through the shared native copy command;
SVG bytes remain unchanged. A conservative relative-path reservation protects
the source limit before reading. Source, selection, geometry, scale, preference,
and input guards run before publication and again after its result. A new plan
validates the actual encoded path at the captured insertion offset, with no new
coordinate hit test. Undo and cancellation retain copied assets. Copy outcomes
identify their captured document in a shared notice outside document layout;
the notice cannot move the drop anchor. There is no baseline change or recovery
clearance. Chrome geometry and exact source
Undo/Redo have a scrolled-document check with a test image read. Native OS drops,
mixed-DPI displays, and zoom remain open.

Table-file image drops use the same native read and coordinate guards. A rendered
cell appends the image with a separating space when needed. An active cell uses
its raw edit surface's drop position and keeps selected text. A literal path pipe
encodes as %7C; Markdown escaping retains native backslashes and ampersands.
Accepted package ranges must identify the exact inserted image. Omitted-cell
padding participates in the complete source-size check before a proposed table
parse. Controller, cell range, active child state, selection, child scroll, and
cell layout captures reject late results. Each accepted drop is isolated from
nearby typing in outer history. Inactive-cell activation follows the source edit
and adds no history event. Chrome checks cover scrolled geometry, Unicode text,
exact Undo/Redo, and both cell routes with a test read. Native OS table drops
remain unverified. Copy rebuilds from the captured cell and offset, validates
actual path spelling and complete source size, and uses the same isolated outer
history. Chrome body, rendered-cell, and active-cell copy checks cover exact
bytes, 32 by 32 image decode, and exact source Undo/Redo with a test host.

The document language uses CodeMirror's YAML front matter wrapper around Markdown.
Metadata begins only at document start and uses exact three-dash lines. The
package does not accept a three-dot line or trailing spaces as its closing mark.
Closed metadata has a literal text preview. Selecting it reveals highlighted
YAML source. Empty metadata is valid. Unclosed metadata stays source through the
document end. Metadata supplies no app configuration and is never evaluated.
Preview, outline, and image reference-definition collection exclude metadata.
Package ranges retain body offsets. Formatting and link/image controls reject
metadata. Return inserts a plain newline there, including unclosed YAML lists.
All metadata edits and mode changes keep the exact source record and outer history.

Footnotes use the upstream GFM footnote package and UTF-16 source ranges. Resolved
references get numbers in first-use order. Repeated references share a number;
the first duplicate definition is accepted. Missing references retain source
marks. Selecting a reference or definition reveals source without a history edit.
Definitions retain container prefixes and continuation lines in the source record.
Definition headings do not enter the outline. Controls reject selections that
touch definition source or cross a reference. Return in definitions is plain.
Definition preview renders text and formatting with no active links or resources.
HTML stays literal; images show alt text. MathJax renders inline and block math
inside definitions with the app's bundled fonts. Formula failure retains its
literal text and an edit hint. Definition removal cancels pending results. SVG
has no link or resource actions; only MathJax supplies formula layout styles.
Rendering adds no source or history transaction. References inside definitions
are not numbered. Footnote inserts a new reference after selected text and adds
a top-level definition at document end in one history edit. Existing text,
trailing whitespace, BOM, and line endings stay intact. The package must accept
both additions before dispatch. Labels avoid existing definitions and missing
references. New note text is selected for replacement. Go to Footnote selects
the accepted definition, or its first reference when used inside a definition.
Insertion requires one text line and rejects unsupported source blocks.
Navigation adds no source edit. Both commands defer during composition and cell
editing and reject read-only state and multiple selections. The shared
model caches upstream plain-text ranges. Unicode letters, numbers, combining
marks, spaces, and tabs can map cached notes inside eligible plain text. Both neighboring
code points must stay complete and unchanged across every change, including
insertions inside a surrogate pair. At least one neighbor must not be an ASCII
digit; deleting letters between digits can create an ordered-list marker.
Each change stays on one physical line and retains a word character on each
side. Separator edits cannot remove both guarded neighbors or make a line blank.
An additional guard accepts ordinary word starts and ,.;:!? strictly inside
an upstream text span. Both complete word or space/tab neighbors stay unchanged.
A retained Unicode letter within the preceding 128 UTF-16 units of the same
span and physical line protects its prefix. All changes retain that letter.
An upstream paragraph or heading can also retain the complete inline-code range
directly before an eligible text span. Ordinary edits at that span's start can
map the model when the code stays on the same physical line and retains all its
source and delimiters. The complete right word/space neighbor must stay intact.
Code opening-boundary edits and protected link/image parents reject reuse.
Mapped text starts include boundary insertions. Code anchors map with their spans.
Other span boundaries, physical line boundaries, Markdown delimiters, and rejected
guards use full parsing. Ampersand text and link/image descendants
use full parsing because an edit can complete an entity or change reference-link
resolution. Their nested footnote references still take part in numbering.
Definition AST and
all source ranges map together. Protected source and other edits use the full
upstream body parse. The fresh-parser oracle bypasses the cache in checks.
The optional editor-state benchmark shows substantial fallback cost. It does
not measure native input, DOM layout, memory, or a screen frame; the 16 ms product
target remains unmet. The optional Unicode benchmark compares source-mode state
updates with separate fresh parses. It does not use native composition events.

Print…, Export → PDF and Export → Image open a separate complete-document projection from the captured
editor state, document ID, path, and title. It does not use the virtualized editor
DOM. Source, history, selection, baselines, and recovery remain unchanged.
The app captures these fields before loading the print module. The shared inline
HTML parser, PNG tools, and paper CSS load on request. Duplicate requests are blocked
during loading and preparation; an open modal rejects another projection.
Typing can continue during module loading without changing the captured state.
Composition that starts during loading cancels presentation and retains focus.
Page disposal prevents late presentation, error status, dispatch, and focus.
The build checks the complete static chunk graph and requires the HTML parser and print modules
outside startup but reachable through dynamic imports. Shared Markdown code can
remain in startup. These checks do not prove first-frame speed or idle memory.
The upstream GFM and math packages supply the body tree. The document-language
package supplies the metadata boundary; metadata prints as literal text.
Footnotes keep their preview resource rules. Math and LaTeX fences use MathJax.
Print waits for formula, diagram, code, frame, and image results. A 15-second
timeout or failure retains visible source and permits explicit Print with warnings.
Inline HTML text formatting uses the upstream HAST raw parser on each complete
paragraph, heading, or table-cell fragment. A private custom-node map protects
generated formula and image slots across parser cloning. Exact slot membership,
order, supported ancestry, and one wrapper are required. Authored HTML cannot
create a custom HAST node. Only inert semantic tags and dir, lang, and title
attributes survive before controlled slots expand. Authored classes, IDs,
styles, event handlers, resource URLs, and actions never enter the app DOM.
Unsupported fragments retain their complete enclosing source with a warning
and discard only their pending render jobs. Later jobs keep valid indexes.
Footnote HTML remains literal. The final DOMPurify pass remains in place.
Chrome has a drawing and source/history check for semantic inline formatting,
nested Markdown, MathJax, and table cells. Native Print and PNG acceptance
remain open. Adding the raw parser does not establish open-time performance.
Supported block HTML uses the package HTML tokenizer and raw fragment parser.
The complete fragment must contain only inert text/block/list/table tags, with
no styles, resources, or active elements. Authored IDs, classes, event handlers,
and URLs stay out of the paper. Text dir/lang/title survive, as do integer
table spans from 1 to 1000 and ordered-list starts within ±1,000,000,000.
Package repairs can close malformed paragraphs or move text outside tables.
Document wrappers and doctypes are rejected before fragment parsing can discard
them. Generated wrapper classes have a separate owner. The final sanitizer
remains in place. Accepted blocks have natural height and can export to PNG.
Unsupported block HTML keeps an isolated frame with bounded parent sizing and
its print-inspection warning. Height limits and unstable sizing retain a visible
source notice. Full HTML/CSS fidelity and native pagination remain unverified.
Chrome has an 820 × 1130 PNG check with heading, 18 paragraphs, table, and final
paragraph pixels. The browser fixture uses the app's page-sizing CSS and retains
exact source and history. A full-page screenshot shows the captured image.
Generated links have no actions. Mermaid styles stay inside SVG image resources.
Closing cancels result publication and releases image URLs and timers.
Local images read during preparation with the captured document ID and path;
the host checks changes during that read. Image bytes are not part of the captured
Markdown state. A retired ID fails without selecting another document. HTTPS
images use the browser loader and make network requests. Paper has its own light
palette in either app theme. Print invokes the system dialog; PDF availability
depends on that dialog. Native Print acceptance and direct PDF files remain open.

Export PNG captures the settled paper at its displayed width and full height.
It uses one pixel per CSS pixel, a white canvas, system fonts, and the bundled
formula glyphs. The html-to-image package supplies DOM rasterization. Before
capture, each image becomes embedded raster pixels in a separate paper clone.
HTTPS images reload anonymously without a referrer and need server CORS support.
Missing, unreadable, or tainted images fail explicitly. Owned settled block HTML
frames use the separate pixel capture described above; supported inline HTML
uses the ordinary paper DOM. Unsupported
inline HTML retains its source warning. Limits are 16,384 pixels
per side, 32 Mi pixels in total, and 64 MiB of encoded PNG. Oversized documents
fail before canvas allocation. A 30-second deadline and Close cancel capture.
Canvas dimension checks and an ink scan reject obvious blank or reduced output;
they do not prove complete visual fidelity. Generated PNG preview uses a separate
Blob URL, which closes with the dialog. The native picker must select a new .png
file. Cancellation is checked after capture, after the picker, and before IPC.
After dispatch, Close waits for the actual host result. Native success means a
confirmed host write; browser mode only reports a requested download. PNG export
does not change source, history, selection, baselines, or recovery. Chrome capture
has a visual check. WKWebView, native Save, and Windows/Linux acceptance remain open.

Find and Replace provides a Typora-style search panel above the editor. The panel
opens in a single compact row for search. A mode toggle button switches between
search-only mode and replace mode with one click. In search mode, the replace row
stays hidden. In replace mode, the replace row shows the replacement input, a
Replace button, and a Replace All button. The search input contains toggle
buttons for case sensitivity, whole-word matching, and regular expressions.
Navigation buttons move to the previous and next match. Escape closes the panel
and returns focus to the editor. Windows and Linux shortcut Ctrl+F intercepts
the key event in the capture phase. This suppresses the native browser find
toolbar and opens document search, or focuses the search field when Settings is
open. Windows and Linux shortcut Ctrl+H opens Replace mode directly. Active input
method editor composition is protected before key event suppression. Search
and replace input wrappers expand across the available row width toward the right
edge with flex layout. The replace input box aligns vertically with the search
input box at both left and right edges. Left toggle and indent controls share
matching widths, and right navigation and replace action groups share matching
widths with subpixel synchronization. Unit tests, TypeScript type checks,
frontend build, and Bend proof pass.

When the caret is on a line in live preview mode, the editor reveals the line in source code mode and shows the caret. When the user clicks non-interactive space outside the editor region, clicks the title bar, or the editor loses focus, the editor deactivates immediately, suppresses the caret, and rerenders the line in live preview mode. Interactive controls, including sidebar files, folders, tabs, and toolbar buttons, preserve their standard click sequences and actions without interruption. Clicking into the editor restores active editing and reveals source code mode for the selected line.


Mermaid diagram settings in Appearance control palette, box colors, font, font size, corner
radius, padding, and maximum height. Fixed palettes and corner radius travel
inside the SVG for print output. The app palette uses Classic for print output.
Palettes are Follow theme, Mermaid default (the mermaid.js default theme from before Pele,
and the default palette), Classic, Warm, and Cool. Box colors is One color or By shape. By shape gives each kind of
flowchart box its own fill and border: start and end (rounded, stadium), decision (diamond),
data (cylinder), input and output (parallelogram, trapezoid), circle, preparation (hexagon),
and flag. Other boxes keep the palette color. Author style and classDef colors still win.

Supported block HTML tables permit formatted cell editing in live preview. Clicking
a cell retains its rendered contents, fonts, paragraphs, and table dimensions.
HTML markup is not shown in the cell editor. Leaving the cell or pressing
Ctrl+Enter (Cmd+Enter on macOS) applies the change; Escape cancels it. Unchanged
cells preserve their exact authored source. Changed cell content is sanitized,
and surrounding cell tags, attributes, and merged cells retain their source.
Pasting inserts plain text. The HTML caption still opens the complete source.
Read-only cells cannot be changed. Isolated previews, container-prefixed blocks,
and cells without explicit closing tags retain source editing.

Right-click a cell for row and column insertion or deletion, cell alignment,
merge right or down when edges match within a row group, and split. A split
keeps content in the first cell; merge joins content with a line break. Pending
cell changes and structural operations form one Undo step. Structural commands
use an inert copy of authored HTML and can normalize its source formatting.
Nested or irregular tables do not support structural commands. Empty cells have
a minimum width of 5em, and tables fill the available preview width.

The HTML table toolbar uses the Markdown table icons. Resize table and whole-table
alignment are on the left. The HTML table label and Delete table
are on the right. Resize
uses the same 6-column by 10-row hover grid as Markdown tables. Click a grid
cell to apply, or enter Columns and Rows and press Enter. Escape, an outside
click, or another click on Resize table closes the grid. HTML tables accept
1 to 50 rows and columns and adjust spans at changed boundaries. The
toolbar appears after a cell is clicked and hides when the user clicks outside
the table, toolbar, and active menu. Its reserved space prevents movement.
Markdown table editing also ends on outside clicks; detached context menus and
resize controls stay usable. Outside-click handlers preserve normal actions.
Right-click in the editor, Insert, HTML table inserts a table with two columns,
one header row, and two body rows after the complete current block. It preserves
selected text and supports exact source Undo.

Split cell also works on an ordinary HTML table cell and divides it into two
columns. The cell context menu offers Split into two columns and Split into two
rows for either ordinary or merged cells. A directional split divides an existing
span when possible. Otherwise, it adds a grid boundary and extends the spans of
other cells on that track so those cells stay visually unsplit. Content stays in
the first cell; the new cell is empty and keeps the cell type and alignment.
The existing Split cell command still restores merged cells to unit cells.

Undo and Redo shortcuts also work inside formatted HTML table cells. Ctrl+Z or
Cmd+Z commits pending cell text as one history step and undoes it. Ctrl+Shift+Z,
Cmd+Shift+Z, or Ctrl+Y redoes the last undone step. The shortcuts use document
history, then return focus to the editor. Composition and read-only cells are
protected. Markdown cells and the document editor retain their history keymaps.
HTML cell editing sets an explicit focus target and initializes a collapsed
selection inside the cell. Its caret color overrides the inactive document's
inherited transparent caret, so a click shows the insertion cursor even when
the outer document editor was inactive.
When the first native file-open request reaches a fresh window with one clean,
untitled tab, the requested file's containing folder replaces the saved sidebar
folder. A previously closed project must not cause a second window to open.
Existing open files and modified tabs retain their project routing rules.
