# MarkDew experiments

The native adapter files and checks named below for the AppKit and terminal
apps are on the local `experiments` branch. These records are kept as history.
The Bend core, laws, proofs, and core checks named below are on the `bend-core`
branch. After v1.0.9, the app has no Bend code and CI has no Bend jobs.

MarkDew v1.0.0 release preparation synchronizes version 1.0.0 across npm, Cargo,
and Tauri configurations. The release workflow now supports stable tags such as
v1.0.0 with full release notes from RELEASE.md, while continuing to support
prerelease beta tags. Release creation creates a draft release, verifies uploaded
assets and digests across all four desktop targets (macOS ARM64, macOS X64, Linux
X64, Windows X64), and prevents accidental overwrites. All Bend proofs, node
tests, desktop Rust tests, frontend build, and release CLI validation checks pass.

Test beta v0.1.0-beta.1 was published on October 14, 2026 from commit
ebd91a82abbbab0a80745666af11d6e565364a83. Release run 38514952221 passed all
required jobs, including both Bend batches and four desktop package builds.
The nine release assets were downloaded and checked against the package set,
SHA256SUMS, and GitHub digests. Both Mac apps passed strict signature checks.
Architect review passed before publication. The public release remains a
prerelease. Native acceptance and performance targets remain open.

Draft beta release setup reuses the portability workflow. A pushed beta tag
checks base versions and exact checkout before four package builds. Apple Silicon
and Intel macOS DMGs use verified ad-hoc signatures; Linux x64 DEB and Windows x64
NSIS lack publisher certificates. All checks precede collection. Exact manifests,
hashes, names, and architectures gate upload. Remote draft/prerelease state and
uploaded assets gate final notes; failures retain an incomplete draft. Existing
releases cannot be replaced. Twenty-four related Node checks, workflow validation,
and Bend proof pass. A local macOS release app builds and its signature verifies.
No tag or public release is created by local checks. Native installation, IME,
Save, recovery, and supported-platform acceptance remain open.

The production Files pane now follows the Typora layout reference. Its heading,
folder controls, and short root label stay fixed above an independently scrolling
tree. Decorative file/folder icons align single-line rows. Long names scroll
inside the tree; full native paths remain literal and available in tooltips.
Chrome confirms keyboard scrolling, nested Japanese selection, narrow bounds,
both themes, and exact original-source Undo with typed-text Redo. Twenty-seven
related checks, frontend build, and Bend proof pass. Architect review finds no
blocker. An earlier inactive trial also needed a full-plan type correction to
permit the build; it remains inactive. Native platform checks remain open.

The inactive fallback-retention trial is complete and rejected for adoption.
Four fresh cases retain 76 actions with combined delivery fixed. Mapped retention
reduces the Source/Undo/Redo height difference from 138480.796875 to 224.515625
pixels in both construction orders. Live has no remaining height difference.
Settled source record, selection, history, decoration streams, and widgets agree,
but immediate structural and math fallback can show stale widget content.
Retention is associated with a smaller error; this does not prove its cause.
Seven saved reports include three rejected runs. The evidence verifier checks
their hashes and the rejection. A shared 100 ms delay before view construction
permits visible fresh runs without changing parser or observation deadlines.
The architect review closes this optimization trial. No timing or adoption follows.
Future fallback work must preserve off-screen height information while displaying
current source content and positions. An independent baseline must check that
contract, selection, history, and Source/Undo/Redo geometry before adoption.

The separate fallback-delivery trial retains four fresh cases and 76 actions.
Combined and static point/mark delivery have identical streams, settled geometry,
and height-map attribution in both orders. Both repeat the four Source/Undo/Redo/
Live failures and the same temporary loss from 121,566 points to 119 or 120 during
incomplete full fallback. Settlement restores the full points but retains height
differences. The static delivery split alone does not explain this case. Range
loss causation remains unproved. The fixed-report verifier passes. Next test
fallback retention with parser, delivery, and scroll fixed. No production change,
input timing, private reset, or adoption follows from this diagnostic trial.

The inactive local-coverage browser trial is rejected for adoption. The first
six-case batch retains 96 checks: native controls and no-cutoff mounted controls
pass all nineteen actions in both orders. The normal partial case passes its
four local Unicode edits and unsupported-edit rejection checks, then fails
Source/Undo/Redo/Live height agreement. The last case misses sampling/resource
deadlines. Two fresh partial cases run all nineteen actions and repeat the same
four geometry failures without deadlines. Exact source, selection, history,
decorations, and point/range callback agreement remain intact. Read-only height
attribution shows equal fonts and oracle values but different map partitions.
Retained report verification passes as rejection evidence. Next isolate the
temporary incomplete fallback projection from static layer partitioning before
timing or adoption. Production and full product requirements remain unchanged.

The production title bar now centers the title independently of control widths.
Narrow windows give the title its own row and retain all controls. H1/H2 have
thin theme-colored lines from the Typora reference. Chrome checks 320/400/1000
pixel bounds, light/dark colors, and exact Source/Undo/Redo. Thirteen affected
checks and the build pass. Architect review finds no blocker. Native layout and
the full product target remain open.

The product requirements are in TARGET.md. This file tracks development work.
Run each experiment as a complete batch. Do not require manual checks for each
small change. Keep the goal open until the required evidence is available.

The inactive mounted-parser browser gate passes 272 checks across sixteen cases.
Four fixtures cover mixed source endings, notes, YAML, code, resources, and a
document of at least 1 MiB. Native/native controls and native/mounted cases run
in both construction orders. Source, selection, history, language activity,
decorations, and settled line/widget geometry agree exactly. The first resource
batch failed equal scrolling in native/native controls too and stays archived.
The corrected batch waits for resources, applies equal source-position scrolling,
and checks stable boxes. An independent verifier checks the saved observations.
Production remains unchanged. Next check local coverage in the browser before
matched real-input timing. The 16 ms target and native product gates remain open.

Files and Outline now have a shared resizable divider in the production layout.
Pointer drag and keyboard controls set a stored 150 to 400 pixel preference.
Narrow windows reduce the displayed width while retaining that preference.
Cancellation and composition retain the earlier width. Resize uses no editor
transaction; source record, selection, history, baseline, and recovery remain
intact. Fifteen related checks include active-cell state, composition, keyboard
ownership, and unchanged attempts at narrow-window limits.
Chrome confirms drag with retained edit focus, keyboard/Tab access, both panes,
400-pixel layout, wider preference restoration, visible caret, and exact
Source/Undo/Redo. Frontend build and Bend proof pass. This advances the writing
layout from typora-layout.png. Native resizing and the full product gates remain
open. The later inactive mounted-parser browser result is recorded above.

An inactive public-tree adapter now retains the native wrapper's complete-state
activity, metadata, indentation, and regions. It mounts unchanged package
Markdown under validated package wrapper types and forwards partial parser
state. Weak per-tree provenance separates routes and drops foreign fragments.
Shifted/clipped fragment and first-line history controls pass. Four controlled
partial edits retain the local preview index against independent complete
native-wrapper references. Fourteen parser and five local-coverage checks pass.
This is a new adapter, not the rejected direct-root selector. Production remains
unchanged. Next review browser layout/history controls before input clocks or
adoption; native frame, Open, memory, and platform targets remain open.

Tools now has a persistent Writing size preference from 80% to 200%. It changes
writing text and table-cell input without an editor transaction. Composition
blocks changes; disposal and state checks prevent stale measurement scrolling.
A visible source-position caret stays visible after sizing. Chrome confirms
minimum/maximum fonts, fixed app text, continued cell input, exact two-step
Undo/Redo, and a 400-pixel maximum-size caret. The first check exposed caret loss;
the corrected check passes. Native input/IME remains unverified: the current
debug build runs, but window control repeats its earlier lookup failure. No
document was changed by that native attempt, and its owned processes stopped.
Twenty-nine related checks, the final frontend build, and the Bend proof gate
pass. Architect review required and confirmed queued-measure protection. This
completes the Writing size feature; native and full product gates remain open.

The conservative package parser selector is rejected for adoption. Six positive
checks retain the tested source/history, syntax, services, partial-prefix, and
shared-state contracts. One negative control records exact native language
activity differences at four document-edge position/side pairs. A metadata
adapter cannot repair this tree-based API. Production retains the YAML wrapper;
no browser flag or speed claim follows. Further local-coverage work needs a
public parser-tree design that retains native activity. Product layout and
native input requirements remain open.

An inactive local-coverage index passes four repeated partial-tree edits against
separate fully parsed oracles. It retains the previous complete off-screen
projection and checks local dirty/neighbor coverage and original-index edges.
This positive fixture uses direct package Markdown, a different language profile.
The current YAML wrapper publishes an unmounted Body during the tested partial
states, so useful local Markdown coverage is unavailable and correctly rejected.
Truncation and dependency fallbacks remain. Twenty-four focused checks pass;
no production or speed claim follows. Next review conservative package parser
selection while retaining front matter, services, and parser-switch history.

Post-clock diagnostics now identify one real first rejection: an incomplete
published Markdown body on key eight, followed by thirty-two no-index edits.
The paired control accepts all forty keys. Both source/Undo gates pass, but
different routes still prevent a stable speed result. Keep the global complete
guard in production. Next review a local-coverage variant with full equivalence
and fallback controls before browser timing or adoption.

The first real-key static-projection ABBA batch passes 160 exact input and Undo
checks, but parser routes differ. Outer-tree counts are 40/11/9/3 across original,
paired, paired, original runs. All raw records remain. Paired p95 key-to-rAF is
132.8/102.9 ms versus original 24.8/172.8 ms. No stable gain is established.
Next investigate indexed-route loss. Do not adopt the comparator from this batch.

The inactive paired comparator now passes the repeated eighty navigation and
thirty-six edit/history browser controls. Geometry and source remain exact.
Both candidate edit orders retain two original callbacks and record actual
dispatch jumps separately from geometry and diagnostic calls. Eleven failure-path
tests, two partial construction controls, and a corrected nine-check edit smoke
pass. Restoration retains later descriptor ownership. Production and packages
stay unchanged. Next review and run real-input timing; native targets stay open.

The static projection passes eighty browser navigation controls and thirty-six
local-edit/history controls. Both construction orders and full/full controls
have exact height, scroll, cursor, shared-line, source, and selection agreement.
Local Unicode edits remain indexed after readiness. Parser publication stays
outside samples; history and mode checks use equal explicit scroll actions.
The first edit control is rejected and retained. Production and the browser
comparator are unchanged. Next integrate the inactive paired comparator, then
repeat layout checks before real-input timing. Native targets remain open.

An inactive static point projection now uses actual local index regions.
Point-first and mark-second inputs remain static, including off-screen ranges.
Bounded note-widget replacement retains one combined point layer. Four growing
1 MiB edits retain full display and paired eligibility, with 1,595 jumps and
395,144 skipped ranges. Exact selection/span/external-order and source/history
checks pass. Retained duplicate sets have unmeasured memory cost. Next run
full/full browser geometry controls before timing or production adoption.

The inactive paired comparator retains 3,496 exact callback streams through
both ESM and strict factory loaders. Both record 5,397 paired jumps. The real
1 MiB preview projection retains two callbacks while skipping 98,704 ranges
in 398 jumps. Per-region filter bounds retain the shared chunks; an unbounded
filter control retains no chunk reuse. This reconstruction uses a complete
oracle outside clocks. Production and packages stay unchanged. Next implement
an inactive persistent static point projection with actual local updates and
check full/full layout before speed trials. Native performance stays open.

The inactive positive-point comparator trial rejects its single-layer guard.
Nine of 3,456 exact callback comparisons fail at touching zero-point boundaries.
All fallback calls retain upstream behavior. The earlier spaced checks missed
this case. Both module copies stay in memory; no package or production method
changes. Static point-first projections pass full span and external-order checks
at every mixed-fixture selection boundary and retain the full height inputs.
That projection cannot repair the invalid comparator. Next design paired skipping
that keeps shared-point boundary context. Do not time the rejected guard.

Forty settled height checks now reject the viewport omission prototype.
Full/full controls agree exactly in both construction orders. Full/viewport
scroll heights differ by up to 2,515 pixels; a width change moves the off-screen
owner position by 505 pixels. Destination caret differences stay below one pixel.
Complete Markdown bodies, exact source record, history, shared actual line
rectangles, and semantic comparisons agree throughout. Versioned read-only
height-map summaries support the effect of omitted collapsed source and changed
gap structure. Production keeps static marks. Stop this candidate's input and
memory trials. Next investigate equal shared-chunk comparison with positive
points intact. Native performance and platform acceptance remain open.

An inactive viewport prototype now separates same-line empty replacements from
static widgets, blocks, and multiline ranges. Global owner selection and
suppression stay intact; local layer patches include rebuilt neighbours.
Hidden-first precedence passes semantic, nested-formatting, and actual-facet
checks. Six focused checks and the full 559-web/eight-Node batch pass.
Browser wrapping, owner reveal, Find, Unicode input, Source mode, and exact
Undo/Redo checks pass for shared rendered lines. Scroll geometry remains a
material limit: full height estimates differ by up to 22,060.8 pixels and
relative caret placement by up to 436.8 pixels. The real-key timing pair has
different parser routes and a slower candidate worst sample. No stable gain
is shown. The later height control rejects this prototype. All temporary production
and input-fixture imports are restored exactly. Native targets remain open.

The inactive point inventory now finds 83,213 same-line hidden heading, strong,
and code delimiters in the exact 1 MiB input fixture. Only its two shifted note
widgets produce height-comparator difference notifications after a local edit.
Those notifications do not count equal ranges visited. A resource fixture keeps
the listed widget kinds and shows why multiline owners must retain global selection
rules even when their delimiters are same-line. The next step is an inactive
viewport prototype, with full display, wrapping, scrolling, source, and input
checks before adoption. The inventory changes no production decoration.

Parser and view traces now identify height comparison as the main measured
view-state cost in one accepted run: 47.5 ms median inside 51.8 ms view-state
work. Default comparisons total 0.4 ms median. Core Markdown parsing remains
21.2 ms median; nested parsing is inclusive. Forty real-key samples across two
accepted runs have complete trees, indexed preview, and exact source/Undo.
The lost/reset attempt is rejected. All temporary hooks are archived and removed
exactly. The next experiment must inspect compared point-range types before it
changes decoration placement. Same-line hidden marks may use a viewport route
only if full source, selection, scrolling, wrapping, input, and layout checks
pass. Block and multiline replacements must keep the static route. No production
candidate is adopted, and native frames and stable speed gains remain open.

Real-input traces now separate deferred language parsing from footnote-model
mapping. Forty indexed edits publish complete trees and pass exact source/Undo.
Detailed current syntax-tree/body lookup p95 is 51.4 ms, text-range mapping is
0.3 ms, local preview is 2.4 ms, and view update is 59.7 ms. Reading the language
field starts deferred parser work; removing that read can merely move the cost.
The next task is separate upstream parser and view-update attribution. No parser
change is adopted. Temporary hooks are archived and removed exactly. Native
frames and stable total-speed gains remain open.

Footnote text-range mapping now uses a private persistent RangeSet. Guarded
local edits no longer enumerate the complete plain-text array. The public array
stays available through a lazy getter for independent fresh-parser checks.
Code anchors, Unicode neighbors, multiple changes, source, and history keep
their existing rules. One untraced 1 MiB baseline/candidate pair passes eighty
real-key and exact source/Undo checks with complete published trees.
Layout-observation p95 is 142.5 / 132.6 ms; synthetic setup readiness is
872.6 / 874.1 ms. Stable speed gain, native frames, Open, and memory remain open.
Architect review required a separate helper to exclude prior-state closure
retention. The final repeat passes forty keys and exact source/Undo with complete
trees and indexed plans, but reaches 143.6 ms p95 and 890.6 ms setup readiness.
All 553 web and eight Node checks passed before that scope-only correction;
all 71 affected checks, the build, and Bend proof pass after it.

Note-aware full preview plans now retain their ordinary index through selection
changes. Separate ordinary groups keep combined note display out of that index.
Full-builder comparisons cover every cursor boundary, note/emphasis overlap,
multiple and wide selections, and edits after cursor movement. Indexed plans
still omit absolute item arrays. Chrome real arrow moves before forty keys in
the unchanged 1 MiB note document retain the index; all forty keys use local
plans with complete trees and exact source/Undo. Layout-observation p95 is
158.9 ms; cursor observations are 96.2 and 122.4 ms. The first full edit plan is
removed, but stable latency improvement and the native frame target remain open.
All 552 web checks and eight Node checks pass. Full preview remains the oracle
for combined display and the ordinary layer across selection changes.
The frontend build and Bend proof pass. Architect review finds no blocker.

Real-input traces identify one full-preview fallback: Lezer puts a plain
paragraph and its following package note definition in one top-level block.
Production now accepts a narrow plain prefix and one definition at the block
end, retaining ordinary prefix analysis and current note suppression. Other
partial intersections and marked prefixes remain ineligible. Fresh-model and
full-preview comparisons cover local edits, note boundaries, Unicode, Undo,
Redo, and rejected resources. The original 1 MiB browser document uses thirty-
nine indexed plans per forty keys in two untraced batches; exact source and
Undo pass. Layout-observation p95 is 133.3 and 175.8 ms, with large median
variation and a costly first full rebuild. The frame target remains open.
Opt-in trace clocks attribute work but do not prove paint or native latency.
All 551 web checks and eight Node checks pass, as do the frontend build and
Bend proof. No native frame or supported-platform input acceptance is claimed.

The actual browser edit surface now has a real-key 1 MiB observation fixture.
Four routes each accept forty keys and restore exact original source with Undo.
Plain Live preview reaches 147.4 ms key-to-layout-observation p95; Source reaches
67.3 ms. Note Live reaches 481.4 ms, uses full preview plans, and publishes mostly
partial trees. Note Source reaches 79.9 ms with complete trees. These Vite
development-mode clocks include input processing and a next-rAF geometry read,
but prove no paint or native latency. Raw samples and clock limits are recorded
in BENCHMARKS.md and tests/performance/experiments/browser-input. The next task
is to separate state, view, and parser fallback work during real input, then
reduce the measured delay. Isolated state timings cannot prove the frame target.
Repeat note Source reaches 15.6 ms p95, while repeat note Live reaches 560.4 ms
with forty complete trees and full plans. Exact source and Undo pass in both.
The large variation prevents a stable baseline claim and does not isolate a cause.
The final forty-key note Live check reaches 779.8 ms p95 and passes exact source
and asynchronous Undo with complete trees. Yielding the fixture's Undo check
removes its control timeout. This change does not improve production typing.

A real embedded-font browser check now confirms font use and PNG glyph bounds.
The local package normal font contains the tested glyphs. Eight t glyphs use
124.48 layout pixels and 122 PNG ink pixels; the monospace control uses 192.66
and 187. Invalid bytes show an error face, an 88.91-pixel fallback, and an explicit
export error without source/history changes. Undo restores exact BOM and mixed
endings with zero history depth. The initial subset-font check was insufficient:
a loaded face lacked the glyphs and used fallback. The fixture now checks known
glyph advance and line-bounded PNG ink together. Native font/PNG and complete
HTML/CSS acceptance remain open. Fixture: html-font-export.html.

PNG export now includes owned, settled HTML frames through separate frame
captures. The page clone contains only their generated PNG images, never authored
DOM or CSS. CSS-tree rejects external or ambiguous resources before capture.
Failed images/fonts, clipping, unstable sizing, changed frames, blank captures,
limits, and cancellation retain explicit errors. Multiple-frame and lifecycle
checks pass. Chrome exports a complete 820 by 2444 styled document, including its
image and final paragraph, with unchanged exact source and history. All 549 web
and eight Node checks, frontend build, and Bend proof pass. The later data-font
check above adds browser evidence. Native PNG and full HTML/CSS fidelity remain open.

A fresh current-source macOS release app uses a separate test identity and
recovery folder. Its frontend, startup dependency check, and native build pass.
One window-control request repeats cgWindowNotFound. Both the new and original
processes stay running; no document was opened or edited. A sample of the
original process shows a normal waiting event loop, not an obvious startup hang.
This does not prove a window defect or native input. Stop this test route until
new evidence is available; continue other target work. PACKAGE_BUILD.md records
the executable hash, process IDs, build output, and limits. Native input and IME
acceptance remain open.

The writing scroll area now fills the workspace to the right window edge, as in
typora-layout.png. The text column retains its centered 860-pixel maximum width.
Chrome checks cover 1680-, 1000-, and 400-pixel windows, Files, long-document
scrolling, Source mode, and Unicode input with Undo. The frontend build, Bend
proof, whitespace check, and architect review pass. This CSS change retains
the separate cell edit-surface rules. Native WebView layout remains unverified.

Unsupported styled HTML now uses shared parent-measured frames in edit and
print views. Authored scripts stay disabled; sanitization, CSP, and other sandbox
restrictions stay intact. Frames grow, shrink, and reflow at a changed width.
Data-image and font readiness participate in bounded print preparation. A
generation guard rejects an old load's resource completion. Height limits and
repeated resize feedback stop with explicit source-reveal notices. Disposal
cancels observers, resource listeners, events, and timers. All 543 web and eight
Node checks pass, with the frontend build. Chrome shows complete 2,278-pixel
styled content, 4,006-pixel narrow reflow, and 50-pixel short content. The final
paragraph fits in edit and print frames. Data images decode, authored scripts
are absent, capped content reveals source, and Unicode source input has exact
Undo. Real data-font/native checks, full HTML/CSS fidelity, native pagination,
remain open. The later frame PNG step above removes that export restriction.
Browser fixture: html-frame-layout.html.

The compact writing layout now retains the chosen Files folder and sidebar pane
across launches. A small versioned preference holds only presentation fields.
Literal native paths are bounded; malformed or unavailable storage uses defaults.
A hidden Files pane defers the restored folder read until shown. Missing saved
folders offer Retry without taking focus. Only a current successful chosen-root
read persists a new path; cancelled, blocked, stale, failed, and disposed work
cannot change it. Startup applies the pane once; recovery Retry does not reset
a later choice. Source record, selection, history, baseline, and recovery stay
intact. All 539 web and eight Node checks pass, with the frontend build. Native
directory reads and supported-platform layout acceptance remain open.
Pane choice also persists in browser mode; native folder restoration does not.

Native document launch now feeds the guarded Open workflow after successful
recovery startup or Retry. macOS application Open events and launch arguments
share a bounded main-window queue. Literal paths retain their spelling; file
URLs decode once. Exact-path tabs retain unsaved source and history. Partial
failure retains earlier opened tabs. Busy or composing requests are consumed
with a repeat-Open message; a notification during take rejects the whole reply.
Skipped and truncated requests have a persistent dismissible notice outside
document status. Disposal rejects late results. Package associations include
Markdown and text. The Windows overlay replaces default-association macros with
owned Open With registry values and owner-checked cleanup. Both real NSIS hooks
compile locally; Windows CI requires that compile check for either build route.
All 531 web, eight Node, and 69 Rust checks pass, as do the frontend build,
macOS debug host build, workflow syntax, and Bend proof. Complete-tree preview
correctness checks use a scoped fixed clock during small edits; separate partial
tree checks and production deadlines remain intact. Native OS Open, Windows
registry behavior, single-instance routing, IME, and platform acceptance remain
unverified. This step does not complete the product target.

The portability workflow now has an optional manual unsigned-package route.
Default checks retain debug executables. Both routes verify the same frontend
checkout before native tests/builds. Package artifacts contain OS, architecture,
checkout, size, and SHA-256 metadata. macOS DMG, Linux DEB, and Windows NSIS are
configured. Local macOS release app construction passes; DMG inspection retains
the executable permissions and exact executable bytes. The packaged app process
starts, but the window-control tool cannot find its window. Native editing is
unverified. PACKAGE_BUILD.md records evidence and limits. Windows/Linux package
runs, installation, native IME, and supported-platform acceptance remain open.

The production note index now keeps ordinary ranges separate from current note
widgets. It shares existing complete-tree and local-edit guards. Changed notes,
resources, and uncertain edits retain full preview. Focused checks pass,
including tab changes, definition edits, Source mode, and exact Undo/Redo.
Four sequential growth runs pass 960 complete source/display comparisons.
Note-bearing 1 MiB medians fall from 51.503–93.056 ms to 16.137–17.943 ms.
Plain medians increase slightly in this batch. First fallbacks remain costly.
All 524 web and six Node checks, build, and Bend proof pass. Four resource runs
pass 1600 source/display comparisons through full preview. Some published trees
are partial, so those clocks supply no complete-document speed claim. Separate
settled code/HTML checks retain complete full decorations. Chrome checks confirm
Unicode input, shifted reference/definition source reveal, definition edits,
Source mode, exact original-source Undo, Redo, and continued indexed input.
Native frame, IME, and platform gates remain open.

The inactive note-aware index passes four integration tests and four growing-edit
batches, with all 960 source/decorations checks and complete trees. It retains
ordinary ranges and rebuilds current-position note widgets. Note-bearing 1 MiB
medians fall from about 50–90 ms to about 16–22 ms. First fallbacks and plain
candidate cases can get slower. That trial kept production unchanged until the
integration above retained the plain path and removed redundant partition work.
All 517 web and six Node checks, production build, and Bend proof pass. The
large partial-tree test uses a thirty-second runner deadline; its parser budget
and assertions stay intact, and the failed first batch is retained. Native
widget input, frame latency, open time, memory, and platform acceptance remain open.

The current note-bearing CPU diagnosis passes sixty exact-source and decoration
checks at 1 MiB, with complete published trees. Collection and decoration
construction account for about 69–74% of accepted edit samples. Footnote-model
work accounts for about 3–6%. Production stays unchanged during the diagnosis.
The next speed change must preserve global note numbering and ranges while it
reduces full preview work. BENCHMARKS.md records the CPU measurement limits.

Footnote-free bodies now retain an empty model after a complete-body lexical
absence check. New text and both edit edges detect markers, including deletion
joins. Changed metadata boundaries use the existing parse path. Fresh-model
equality and exact source history checks pass. All 513 web and six Node checks,
the production build, and Bend proof pass. Four isolated growth runs pass all
960 exact-source and decoration checks with complete published trees. Plain
1 MiB medians fall from about 14–15 ms to about 12–13 ms; p95 remains mixed.
Note-bearing full previews, native frame speed, open time, memory, native IME,
and platform acceptance remain open. BENCHMARKS.md retains the measurement scope.

Mixed-direction text now uses browser automatic direction on visible edit lines
and CodeMirror per-line cursor direction. Main and table-cell input share this
extension. Generated table cells, semantic HTML text wrappers, footnotes, and
print paragraphs/headings/cells use automatic direction without reversing table
columns or changing authored HTML dir. All 508 web and six Node checks pass,
with production build and Bend proof. Chrome app checks confirm Arabic/Hebrew
RTL, English-first/punctuation LTR, wrapped RTL, visual Left/Right cursor movement,
RTL cell input, exact cell Undo, Source mode, and print directions. The source
record retains BOM and mixed line endings; direction adds no history event.
Native bidi, IME, platform acceptance, and performance targets remain open.

Local Markdown/text links now use Mod-click and Mod-Enter through guarded Open.
The native resolver checks the captured origin ID/path/generation and returns
canonical regular-file paths. Encoded filename punctuation decodes once;
relative paths require a saved origin. Same-file links retain the origin tab.
Existing canonical-path tabs retain unsaved source and history. New tabs use
the normal recovery and bounded UTF-8 read. Fragments select exact package
heading ranges in the adopted current document. Missing headings retain that
document; resolution/read failures retain the origin. All 505 web, six Node,
and 66 Rust checks pass, with build, formatting, and Bend proof. Chrome app
checks with a test host confirm Unicode filenames, heading selection, unsaved
tab reuse, same-file navigation, missing-file stability, and Source-mode
keyboard navigation. Native local-link and Windows/Linux acceptance remain
open. File URLs, queries, and other file types remain unsupported. Other
alias/case tab variants can still remain separate.

Direct, reference, and explicit autolink HTTP/HTTPS links now use Mod-click
and Mod-Enter to request the system browser. Frontend and host checks share
URL cases. Unsupported schemes, credentials, controls, and oversized URLs are
rejected. Automatic plugin opening stays disabled. Busy commands and composition
reject requests without a delayed launch. Late results must retain document,
selection, request, and status ownership. Source record, baseline, recovery,
and history stay unchanged. All 502 web, six Node, and 62 Rust checks pass,
with build, formatting, and Bend proof. Chrome checks confirm Unicode and
reference requests, accepted and rejected host replies, heading navigation,
Source mode, stale reply suppression after input, and exact Undo. The test host
opens no external page. Native browser launch and Windows/Linux acceptance
remain open. Local file links and authored HTML IDs also remain open.

In-document heading links now support Mod-click and Mod-Enter. Direct and
reference destinations use accepted package ranges and first definitions.
GitHub-style heading slugs support Unicode, formatted text, image alt text,
and duplicates; note-definition headings cannot consume names. Invalid targets
retain source record, selection, focus, and history. Read-only navigation is
permitted. Chrome checks confirm reference and Unicode targets, ordinary source
editing, missing-target stability, Source mode, and exact Undo. All 489 web and
six Node checks pass, with build/startup graph and Bend proof. External/file
links, authored HTML IDs, and native keyboard acceptance remain open.

Supported block HTML now uses natural height in the edit surface too. Exact
package source ranges supply container-free values without changing reveal
bounds. Unsupported content keeps its isolated frame. Late results cannot
publish after disposal. Chrome checks confirm all 12 paragraphs and final text,
contained code/table width, light/dark text, keyboard source reveal, Source mode,
and exact Undo. Integration checks retain source record and history. All 480 web
and six Node checks pass, as do the build startup-graph gate and Bend proof.
Full HTML/CSS fidelity and native input acceptance remain open.

Supported block HTML now prints in normal page flow and can export to PNG.
Package token checks retain unsupported document wrappers, styles, and tags in
the existing isolated fallback. Complete parsed-tree validation removes authored
actions and resources; bounded list/table attributes survive final sanitization.
Long content, parser repairs, nesting, fallback, source record, and history have
integration checks. All 472 web and six Node checks pass, as do the build and
Bend proof. Chrome captures an 820 × 1130 PNG with first/final text pixel checks;
visual evidence includes all paragraphs and the table. Full HTML/CSS, native
print, and direct PDF acceptance remain open.

Files now has Arrow Up/Down, Home/End, and folder Arrow Left/Right navigation.
Collapsed entries stay outside that route. Retry remains reachable. Async
directory results never request focus; collapse and refresh retain focus on a
live control. Keyboard actions use the existing input/busy guards and Open
workflow. All 467 web and six Node checks pass, as do the build and Bend proof.
Chrome fixture checks confirm expansion, parent/child navigation, Unicode-file
activation, and collapsed-entry skipping with exact source and history.
Native keyboard and accessibility acceptance remain open.

The outline now marks the current section in both edit modes and while a table
cell is active. Arrow Up/Down, Home, and End move outline button focus. Heading
rebuilds retain mapped outline focus without taking later form focus. Source
record, history, and composition checks cover this navigation change.
All 463 web and six Node checks pass, as do the build and Bend proof. Chrome
checks confirm keyboard activation, returned document focus, and the section
highlight. Native accessibility acceptance remains open.

Table history now shares one cell-aware route for toolbar, native-menu, and
cell keyboard commands. Empty Redo previously moved focus to the outer edit
surface. Empty history now retains cell input and selection. App checks cover
Undo/Redo restoration, subsequent Unicode cell edits, and later form focus.
Restoration also returns input ownership to a retained child in another table;
cross-table app checks require the next edit to change that table's source.
Source record, baseline, and composition checks also cover this change.
All 459 web and six Node checks pass, as do the build and Bend proof.
Native menu and platform acceptance remain open.

The native File menu now exposes document commands through the existing guarded
renderer workflow. One File and Edit menu replaces the package defaults in
their platform order. Native Undo/Redo use CodeMirror history. Form/search text
focus, Print modal state, busy commands, and composition protect menu dispatch.
Listener lifecycle and Quit event routing have integration checks. All 454 web,
six Node, and 59 Rust checks pass, as do the build and Bend proof. Native menu
and platform acceptance remain open. No native accelerators are added; existing
WebView shortcuts retain their owner.

Recent completed steps also include guarded footnote code-content reuse,
worker-backed word count, and named document/cell edit surfaces. BENCHMARKS.md
retains the timing scopes and partial-tree limits. The 16 ms native frame
target, native input/IME, screen readers, and full platform acceptance are still
open. The records below describe earlier milestones and their evidence.

The next plain-edit profile attributes 64.2% of its helper CPU samples to
language parsing. Removing only the YAML wrapper in an inactive comparison
shows no consistent gain across two timing pairs. All 960 source/decorations
checks pass. Metadata-free package feature fixtures also agree. Production
retains the YAML wrapper. Raw evidence is in experiments/index-profile under
tests/performance. Diagnose the shared package parsing work next; the native
frame target remains open.

The next inactive diagnostic omits nested code/HTML parsing and lowers plain
1 MiB medians in two comparisons. It removes language services and cannot be
the product configuration. A guarded candidate retains the package nested pass
for every code/HTML target, partial range, and stopped parse. Complete full-input
parses with no target can skip it. Five candidate checks and 960 growing-edit
source/decorations comparisons pass. Plain 1 MiB medians improve, but tails and
note results are mixed. The candidate remains inactive under experiments/nested-parsing.
Measure resource-bearing documents and guard cost before deciding on adoption.

The resource batch now passes all 3,200 source/decorations checks across eight
processes. It includes loaded/unknown/indented/container code and inline/block/
comment/container HTML, with prose and resource-content edits. Indentation,
language data, and completion text/selection comparisons pass. The guard-only
probe still visits thousands of new objects on cached 1 MiB scans. Keep it
inactive. Note-bearing code edits have roughly one-second medians in both
parsers. Next, diagnose footnote full-body parsing and published-tree bounds,
then test code-content model reuse. Existing fresh decoration checks do not
prove parser completeness; that must be recorded separately. Raw resource
records and full summaries are under experiments/nested-parsing.

The user approved CodeMirror 6 in a desktop WebView on 2026-10-04.
The new source is in src/web/ and src/desktop/. CodeMirror owns input and history.
Bend supplies edit commands. The old native adapter is on the `experiments` branch.
The timing batch remains stopped. Its partial records are not a migration gate.

The current 1 MiB edit diagnosis uses baseline a19e2c4. A separate CPU profile
attributes most sampled preview-update work to decoration construction and
cached collection. A bounded ordinary-range cache transfer passes all exact
checks but makes all twelve growing-edit medians worse. It is rejected and
production preview.ts is restored exactly. Raw samples, inactive patch, and
profile attribution are under tests/performance/experiments/shifted-ranges/.
BENCHMARKS.md records the complete comparison and its scope. Phase measurements
now split traversal, validation, shifting, enumeration, suppression, and combined
set sorting/assembly. Production skips suppression only when no replacement
exists; the fresh reference keeps the full filter. Two timing pairs show small
median reductions on most affected routes, mixed p95, and variation in unchanged
routes. All 960 growing-edit source and complete-decoration checks pass.
Raw phase and timing samples are under tests/performance/experiments/preview-phases/.
The next substantial speed change must reduce complete-document work, rather
than transfer every shifted range. The 16 ms native frame target stays open.

An inactive persistent block-index prototype now checks two or three blocks
and rebuilds six or eight decoration ranges per local word edit in both
100 KiB and 1 MiB fixtures. All 18 complete-decoration comparisons pass.
New adjacent parser trees are rebuilt until exact stable boundaries or EOF.
The prototype is retained under tests/performance/experiments/local-blocks/.
Its explicit settled-tree counts exclude parser, index internals, and production
preview work. The production path is now in src/web/preview-index.ts. It requires
complete published Markdown bounds, since parser context can finish before
editor state publishes its tree. Strict plain word edits map the persistent
index and decorations; unsupported source and selections use the full path.
Indexed plans retain no absolute item array. Context, configuration, history,
structural edits, and partial-parser fallback have complete-reference checks.
Two growth comparisons pass all 960 source and decoration checks and show large
eligible plain-document gains. Each candidate run accepts 115 indexed edits;
the remaining 125, including all footnote edits, use full construction.
Plain 1 MiB medians are near 15 ms, but p95 still exceeds 16 ms. Index creation
costs about 23 ms at that size; first fallback samples remain in totals.
Footnote comparisons include slower cases and receive no performance gain claim.
Raw runs and failed/superseded evidence are under
tests/performance/experiments/local-production/. Next, measure the remaining
local state-update cost and extend reuse only with exact dependency checks.
Native frames, first-frame open time, memory, and platform acceptance remain open.

Table previews now use a compact Table tools disclosure. Structure controls
start hidden, open on cell activation, and close on exit. Manual close stays
closed through typing and refresh. Each table has a unique group ID. Disclosure
preserves source, selection, input focus, and history. Composition retains its
state; Escape inside the group returns focus to the toggle. Read-only changes
refresh edit-button disabled states. Table source uses guarded click activation
for pointer and keyboard input. Generic source reveal leaves both action buttons
alone. State replacement and Undo/Redo restore controls for the active cell.
Chrome checks Enter and Space on both action buttons, manual close with Japanese
and emoji input, row insertion, Undo/Redo, and the compact reading layout.
Native table-controls acceptance remains open.

All 429 web checks and six Node checks pass. Six optional performance checks
remain skipped. The production build, Bend 2.0.34 proof, whitespace gate, and
architect review pass for the compact table-controls change.

Files now supplies the directory sidebar from the layout reference. Open folder
uses the native folder picker. Child folders load on expansion; Refresh files
reads the root again. Native scans check each requested folder and skip linked
or reparse entries. They bound scanned entries at 2,000 and report incomplete
lists. Literal filenames and native paths retain Unicode and percent spelling.
Folder request tokens reject old results after refresh, collapse, root change,
retry, and disposal. File buttons use the guarded document workflow and return
to an exact-path open tab. Aliases and case variants can remain separate tabs.
Files and Outline share the left area; busy commands and composition block
actions. Host and app checks cover scan bounds, link rejection, stale results,
failed reads, picker cancellation, dirty-tab reuse, and retained source/history.
Chrome checks keyboard expansion and Unicode selection with a test folder
service, and a 390-pixel main app window. Native folder picker and platform
sidebar acceptance remain open. Path checks do not prevent every path-change
race against another process.

All 426 web checks, six Node checks, and 57 Rust host checks pass. Six optional
performance checks remain skipped. The production build, Bend 2.0.34 proof,
whitespace gate, and architect review pass for the file sidebar feature.

The compact writing layout now follows typora-layout.png. The document bar
shows a literal title and unsaved mark, Outline, Source, and Tools. File and
formatting controls use a non-modal Tools disclosure. A single document keeps
Close document in Tools; multiple documents show compact tabs. Forms, file
warnings, and recovery controls stay outside the hidden panel. Disclosure keeps
source, history, selection, cell input, and baseline intact and defers during
outer, cell, or form composition. Chrome checks the 44-pixel bar, 390-pixel
window with outline open, wrapped Tools, dark contrast, Source and cell fonts,
cell padding, and Escape focus. Native layout acceptance remains open.

All 420 web checks and six Node checks pass. Six optional performance checks
remain skipped. The production build, Bend 2.0.34 proof, whitespace gate, and
architect review pass for this layout change.

Code Block converts selected outer blocks to literal fenced code. Safe boundary
insertions retain all old bytes; fences exceed every content backtick run.
Complete final parser bounds and untouched block ownership gate acceptance.
Reverse selections remain inside content and blank documents get an empty
content line. Metadata, footnotes, and existing top-level code require source
editing. Code within a selected list or quote remains literal container source.
The exact final transaction uses one isolated Undo event. Batch checks cover
Unicode, mixed endings, long fences, containers, blank documents, EOF,
half-open and multi-block selections, rejection, and the main app toolbar in
both display modes. Native acceptance remains open.
All 419 web checks and six Node checks pass. The production build, Bend 2.0.34
proof, whitespace gate, and architect review pass. The user's typora-layout.png
is now the recorded layout reference.

The Table toolbar now creates two columns and two body rows after the last
selected outer block. It retains selected text and complete list/quote/fence
containers. Parsed context protects internal blank lines. New line breaks use
the source record rule. Complete table bounds, rows, delimiter, parent, and
retained original block ranges gate acceptance. The exact final transaction
checks filtered changes, selection, and cell identity. Live mode opens the first
header cell; Source mode selects its text. One isolated Undo event retains the
baseline and restores prior source/selection. Redo restores table input. Batch
checks cover empty/BOM/blank documents, EOF containers, metadata, mixed endings,
selections across blocks, rejection, focus, and the main app toolbar in both
modes. Native insertion acceptance remains open.
Chrome checks the main app Table button, first-header focus, Undo/Redo, Japanese
and emoji header input, and Source mode. All 415 web checks and six Node checks,
production build, Bend 2.0.34 proof, whitespace gate, and architect review pass.

Tab in the last table cell now appends a row and opens its first cell. The
validated structure command retains prefixes and existing line endings, including
header-only tables and omitted cells. Rejected changes consume Tab and retain
the child edit surface, selection, and focus. Structure edits use isolated Undo
steps, separate from prior and later typing. The 36-check table batch covers
seven container forms, reverse Unicode selection, exact mixed-ending history,
first-cell focus after Redo, composition, read-only state, and filter rejection.
Native keyboard acceptance remains open.
Chrome confirms last-cell Tab, exact source Undo, and first-cell focus after
Redo inside a quoted list. All 410 web checks and six Node checks pass. The
production build, Bend 2.0.34 proof, whitespace gate, and architect review pass.

Heading controls now support paragraphs and headings inside lists and quotes.
Parsed block starts retain container prefixes, including tabs and combined
containers. ATX closing marks and single-line Setext underlines use one source
patch transaction. Complete before/after trees check container ownership and
bounds. The exact final filtered transaction must retain the requested changes.
Rejected task, continuation-line, and container-changing commands retain source,
selection, and history. The batch checks six heading levels across eight prefix
forms, Unicode reverse selection, mixed endings, EOF underlines, adjacent items,
filter rejection/replacement, and the main app menu in both display modes.
Native heading input and platform acceptance remain open.
All 407 web checks and six Node checks pass. The production build, Bend 2.0.34
PROOF.bend, and whitespace gate pass. Six optional performance checks remain
skipped. No native input or performance result is claimed by this batch.

Table structure controls now support tables inside parsed lists and quotes.
All nine commands retain source prefixes and use one outer Undo step. New rows
copy the alignment row's continuation prefix. Complete parser trees check table
and container bounds, row kinds, cell counts, and surviving row positions before
acceptance. The exact final filtered transaction must retain the accepted
changes and target cell before the active child edit surface ends. Rejected
commands retain cell text and selection. The table batch has 33 passing checks,
including seven container forms, tabs, mixed endings, header-only tables, lazy
quotes, adjacent siblings, stale controls, and transaction filters. Chrome checks
row insertion, column insertion, alignment, Unicode cell input, Source mode, and
exact source Undo/Redo. Native WebView and Windows/Linux acceptance remain open.
The full web test batch, production build, Bend PROOF.bend, and whitespace check
pass. This feature adds no platform-specific source or performance claim.

Semantic HTML text previews now use the writing surface's paragraph spacing.
The generic block margin and vertical padding no longer add space to each
paragraph or tight list item. Source blank lines retain their line boxes, so
loose lists and paragraph separators remain. Heading sizes and weight match
source heading presentation. Soft breaks flow as ordinary text; hard breaks
retain br elements and inline code retains spaces. Isolated frames keep their
existing spacing. Replacement ranges include the physical first-line prefix,
while full-document projection retains exact paragraph bounds. This removes
empty prefix lines before quotes and indented headings. Integration checks
cover contiguous quote widgets, prefix source reveal, complete decorations,
unchanged text/tree on selection, and exact source Undo/Redo.
In Chrome, a one-line HTML paragraph changed from 52.05 to 28.05 CSS pixels,
matching plain text. HTML heading height changed from 71.59 to 47.59 pixels,
matching the plain heading. The mixed soft/hard-break paragraph changed from
136.19 to 56.09 pixels, retaining two displayed lines. Source mode retained all
32 line heights and a 1009.5-pixel content height. Quote-prefix-only line boxes
were absent after the range change. Pointer source reveal retained exact source
and zero history. These are layout checks, not native performance measurements.
The subsequent Unicode/code/Undo browser batch timed out and reset its control
session. Reconnection twice failed before reading current state. That input
batch and its screenshot are unverified; no blind typing or reload followed.
Automated source/history checks cover the range change. Native layout and IME
acceptance remain open.
All 396 web checks, six Node checks, production build, Bend proof check,
whitespace check, and architect review pass.

HTML list paragraphs now keep bullets, numbers, and task controls beside their
text. One widget owns the same-line prefix and a separate rendered body. Exact
paragraph source ranges still gate the full-document projection. Task content
uses the accepted GFM paragraph range after the checkbox. Same-line nested
markers share a prefix column without overlapping replacements. Loose later
paragraphs do not repeat a marker; nested lists retain indentation. Selecting
an owner or its first-line prefix reveals source. Checkbox edits retain one
outer history patch, composition/read-only guards, and stale-control rejection.
Complete decoration checks cover prefix/owner selection, shifted positions,
ordered, nested, quoted, loose and task items, and exact Undo/Redo. Chrome checks
alignment, keyboard source reveal, task toggle/Undo/Redo, and Unicode input with
exact BOM/CRLF source restoration. Native presentation remains open.
All 395 web checks, six Node checks, production build, Bend proof check,
whitespace check, and architect review pass.

Multiline HTML paragraphs in quotes and nested lists now use the accepted
full-document GFM/math node. Exact UTF-16 type/range matches with the edit
surface parser are required. A mismatch or partial range keeps isolated fallback;
the renderer never chooses a nearby node or strips source prefixes. Projection
creates a new root without changing cached nodes. Resources retain their source
ranges and global footnote numbers without synthetic note definitions or a footer.
The widget owns its quote border; uncovered quote lines keep their line borders.
Selecting a quote prefix reveals the paragraph and every continuation prefix.
Complete decoration comparisons cover prefix selection, Unicode changes, and
exact Undo/Redo. The shared document-text cache now retains phrasing AST nodes
and needs a full body parse, even for HTML without images. This cost has no
native typing or idle-memory acceptance. Chrome checks nested quote/list
rendering, MathJax, image pixels, full source reveal, Unicode typing, Source mode,
and exact BOM/CRLF Undo/Redo with a test host. Native checks remain open.
All 392 web checks, six Node checks, production build with deferred-parser
guard, Bend proof check, whitespace check, and architect review pass.
List marker alignment was completed in the following development batch.

Body paragraphs and headings now render inert inline HTML with Markdown,
MathJax formulas, image resources, and global footnote numbers in the edit
surface. Heading levels, exact parser source ranges, and outer history remain.
The deferred shared parser validates private slots before resources start.
Styled and unsupported HTML keeps an isolated frame and visible notice.
HTML blocks retain their existing frame route. Body and table previews share
the weak document-text image-reference cache; metadata stays excluded.
Repeated Unicode footnotes use accepted source ranges and exact package label
spelling, without links or a second note footer. Missing notes stay literal.
Edits, source reveal, mode, path, document switch, and removal cancel late results.
Partial resource failure releases started mounts before isolated fallback.
Complete decoration checks retain the full collector as their reference.
Chrome checks natural heading/paragraph/quote layout, math, local SVG pixels,
raw source reveal, Unicode input, exact BOM/mixed-ending Undo/Redo, and Source
mode with a test host. Native acceptance and full HTML/CSS layout remain open.
All 389 web checks, six Node checks, production build with deferred-parser
guard, Bend proof check, whitespace check, and architect review pass.

Table cells now format inert inline HTML around Markdown, MathJax formulas,
and images. They share the print HTML parser, which stays outside startup and
loads only for HTML cells or print. Private nodes protect generated slots;
authored slot attributes, resources, styles, IDs, classes, and actions are removed.
Validation precedes resource jobs. Unsupported cells retain exact Lezer slot
source, including padding and escaped pipes, without table delimiters or
container prefixes. Opening a cell cancels parsing and nested resources.
Late success or failure cannot replace its edit surface. Other cells refresh
without replacing an active child or its composition. Rendering creates no
source or history edit. Chrome checks formula drawing, local SVG image pixels,
Unicode raw-cell input, Enter, Source mode, and exact BOM/mixed-ending Undo/Redo
with a test host. Native table HTML acceptance remains open.
All 382 web checks, six Node checks, the production build with deferred-parser
guard, Bend proof check, whitespace check, and architect review pass.

Print-only modules and paper CSS now load when Print / PDF is requested.
The document state, ID, path, and title are captured before loading. Later
typing does not change that projection. Composition and page disposal cancel
late presentation. Duplicate requests cannot create another open print modal.
Loading failures release the request; late results do not dispatch or take focus
after page disposal. The build checks static chunk dependencies and requires
the shared HTML parser and PNG tools outside startup but reachable on request.
The previous entry was about 1,467.95 decimal kB; the current final entry is
1,282,143 bytes. Print adds a deferred 185.61 kB chunk and its own CSS.
These artifact sizes do not establish native first-frame or memory targets.
Chrome checks the production build: open Print, draw Japanese/emoji, formulas,
inline HTML and a table, Close, then Source mode and exact Undo/Redo.
All 373 web checks, six Node checks, production build with the dependency
guard, Bend proof check, whitespace check, and architect review pass.

Print now formats inert inline HTML around Markdown and formulas in paragraphs,
headings, list items, and table cells. The upstream HAST raw parser retains tag
nesting. Private custom-node keys protect generated slots across parser cloning;
exact membership, order, supported ancestry, and fragment boundaries are checked.
Authored classes, IDs, styles, events, resource attributes, and actions are
removed before controlled slots expand. Unsupported fragments keep their full
enclosing source and a warning, without starting discarded render jobs.
Later formulas and images keep valid slots. Footnote HTML stays literal;
block HTML retains its isolated frame. This is semantic text formatting,
not full HTML/CSS layout. Native Print/PDF and PNG acceptance remain open.
Chrome draws kbd, sub/sup, mark, nested Markdown, and two MathJax formulas,
including a table cell. The browser fixture checks exact BOM/mixed-line-ending
source and unchanged history, authored attribute removal, and literal fallback.
All 368 web checks, three artifact checks, production build, Bend proof check,
whitespace check, and architect review pass. The navigation fixture now requires
a complete parse before asserting mounted previews; its assertions are intact.

The edit-decoration group prototype is rejected after its full timing batch.
Growing word edits give small median gains and mixed or worse p95 results.
Production preview code remains the `6bc4cec` baseline. The inactive candidate,
all timing logs, and failed intermediate runs are retained under
tests/performance/experiments/preview-groups/. Run `npm run benchmark:growth`
for actual insertions with exact source and complete decoration references.
Additional edit checks cover split/merge, Unicode, multiple changes, current
widget positions, global resources, partial trees, and exact Undo/Redo.
The architect reviewed rejection. The 16 ms and native acceptance gates remain
open. See BENCHMARKS.md for scope and all twelve comparison rows.
All 362 web checks, three artifact checks, production build, Bend proof check,
and the exact growing-edit batch command pass. Its separate baseline repeat
retains all 240 samples in growth-command.log. Architect review has no blocker.

Dropped images now have an optional Copy beside document preference. Link
original remains the default. Body and table routes copy original checked raster
or SVG bytes, then rebuild the source plan from the captured insertion offset.
Source, selection, cell, geometry, scale, preference, and input checks protect
publication and insertion. Omitted slots participate in size reservation.
The shared copy notice stays outside document layout so it cannot move the
captured drop anchor. Copied files remain after Cancel and Undo. Chrome body,
rendered-cell, and active-cell checks cover original bytes, relative paths,
32 by 32 image decode, and exact Undo/Redo with a test host. Native OS drop/copy,
mixed-DPI displays, and zoom acceptance remain open.
All 357 web checks, three artifact checks, production build, Bend proof check,
whitespace check, and architect review pass.

Clipboard images now have an optional Copy beside document preference. Embed
remains the default. Copy uses the captured saved document and original checked
raster bytes, then adds one source edit with a relative asset path. Source-size
reservations include omitted table slots. Changed source, selection, document,
cell, preference, and input guards cancel pending insertion. Completed or
uncertain copies report their captured document separately from paste status.
Undo retains the asset and restores exact source. Chrome binary clipboard paste
checks document text and table cells with a test host, exact bytes, 32 by 32 image
decode, and Undo/Redo. Native clipboard/copy acceptance and dropped-image asset
copy remain open. All 349 web checks, three artifact checks, production build,
Bend proof check, and whitespace check pass.

Local SVG is implemented across body/table previews, chosen-file insertion,
optional asset copy, native-file drop routing, and print preparation. Browser
XML parsing, DOMPurify, and CSS-tree create an isolated image projection;
roxmltree validates the host XML. Raw copied bytes remain intact. Dimension
and minimum/maximum constraints normalize before drawing. Checks cover internal
gradients/use, styles, namespace prefixes, malformed XML, resource removal,
dimension limits, exact source/history, copy bytes, drop rejection, table-cell
editing, and print URL disposal. Chrome draws both images at 240 by 100 and
returns nonblank canvas pixels; source mode, copy Apply/Undo, and print retain
source rules. This browser check uses a test host, not native IPC. Native SVG,
filter-complexity memory, SVG data/clipboard images, animation, and external
SVG resources remain open or unsupported. Raster clipboard rules stay intact.
All 336 web checks, three artifact checks, 54 Rust checks, production build,
Bend proof check, formatting/whitespace checks, and architect review pass.
The exhaustive footnote correctness sweep now has a specific 20-second limit;
all fixtures and assertions stay intact. Performance gates remain unchanged.

Cached preview collection now uses a temporary normalized-text snapshot for
physical line envelopes. Complete item and decoration comparisons cover source
edits, empty lines, Unicode boundaries, and source reveal. Persistent cache
entries retain bounded document slices, not the temporary snapshot. Decoration
and selection-group construction retain CodeMirror line lookup; the snapshot
experiment showed no clear gain there. Sequential stage and complete state
measurements are in BENCHMARKS.md. Full item enumeration, decoration sorting,
region parsing, and native frame targets remain open.
All 325 web checks, three artifact checks, production build, Bend proof check,
whitespace check, and architect review pass. The first batch had a 5000 ms
footnote-test timeout while the build ran; the complete rerun passed alone.

Source mapping now builds one weak CRLF-position index per immutable source
record and uses binary lookup. LF and bare-CR offsets need no extra units.
Source patches, Return, table proposals, and image-paste checks share the record
index. New records still require index construction; history can retain old
records and their indexes. Differential checks compare the original UTF-16 walk
at every position, including fractional and invalid values, and verify dense
CRLF, mixed endings, Unicode, multi-change source patches, and Undo/Redo.
Outline collection skips only known leaf blocks and keeps the full traversal
as a reference. Partial and settled trees retain headings in lists and quotes
while excluding metadata and note definitions. The state benchmark now reports
update, dirty comparison, and outline stages. `npm run benchmark:offsets` measures
new-record index construction, cached lookup, and the original walk separately.
All values and remaining native-frame limits are in BENCHMARKS.md.

Footnote model reuse now covers ordinary text edits directly after a complete
inline-code node in an upstream paragraph or heading. The unchanged code source
protects the text's left edge. The same physical line, character whitelist,
complete right neighbor, metadata boundary, and all-change checks still apply.
Text-start mapping includes inserted source. Protected parents, changed code,
multiline code, delimiters, and rejected checks use the fresh package parser.
Differential checks cover every source position in code/container/Unicode fixtures,
repeated unequal-length edits, complete model ranges, rendered definitions, and
exact mixed-line-ending Undo/Redo. Timing evidence is in BENCHMARKS.md. This
reduces one full-document fallback; broader region parsing and native frame
targets remain open.

Chosen-file image copy is implemented in the desktop image form. Save the
document, open Image, select Copy beside document, then Choose Image. The host
creates a stem.assets sibling folder and a new random image name. The form
receives an encoded relative path. Apply is one source history edit. Cancel and
Undo retain copied files; late completed or uncertain copies report their result.
Raster preflight checks the exact bytes sent to the host. Captured ID, path,
generation, composition, and input guards reject stale work before publication.
Host checks cover exact bytes, collisions, stale identities, uncertainty, folder
replacement, temporary-entry replacement, and retained post-publication copies.
Chrome checks cover the actual form with a test picker/copy result, encoded
paths, Apply, and Undo. Native picker/copy acceptance and Windows/Linux runtime
checks remain open. Unix ownership checks do not eliminate every same-user
check/use race. Windows uses path checks with narrower replacement guarantees
and does not confirm directory durability. Clipboard and drop asset copying
remain separate unfinished work.

Migration gates:

- Actual desktop window, input, exact source history, Open, and safe Save.
- Live preview, source reveal, math, Mermaid, isolated HTML, and code highlighting.
- Table-cell editing, full IME checks, recovery, and platform checks.

Old adapter results below are historical evidence. They do not prove these gates.

### Desktop ordinary-prose footnote cache milestone

Added: ordinary word-start edits and ,.;:!? can reuse the upstream footnote
model strictly inside accepted plain-text spans. Complete word or space/tab
neighbors stay unchanged. A retained letter within the preceding 128 UTF-16
units of the same span and line protects the line prefix. Every change retains
that letter. Boundaries, delimiters, line breaks, and rejected guards use the
full package parser. Definition AST and source ranges retain their existing maps.

Differential checks sweep all UTF-16 positions in prose, emphasis, code,
entities, list-prefix, multiline, and Unicode fixtures. Both complete models
and rendered definitions match fresh package parses. The separate before/after
state batches retain all routes and sizes. The eligible 1 MiB word-start edit
p95 changes from 1048.566 to 72.914 ms. Other fallback cases remain near one
second. These clocks omit DOM and native screen frames; the 16 ms target remains
unmet. Full figures are in BENCHMARKS.md. All 304 web checks, three artifact
checks, production build, Bend proof check, whitespace check, and architect
review pass.

### Desktop raster dimension milestone

Added: local/data PNG, JPEG, GIF, and WebP headers are checked through image-size
2.0.4 before browser decoding. Preview, tables, and print share the loader.
Clipboard paste and both image-file drop routes validate before source edits.
The limits are 16,384 pixels per side and 32 Mi pixels. Invalid or incomplete
headers retain alt text and editable source. Rejected input retains selection
and history. The byte-array package entry imports no Node file operations.

Checks cover all four raster headers, exact limits, small oversized files,
truncation, byte-array views, and preview/input/print failure behavior. Header
checks do not establish a bound on animation frames, browser decoder allocations,
or total image memory. HTTPS, local SVG, and native platform acceptance remain
separate work. All 301 web checks and three artifact checks pass. After the final
tight-buffer change, all 66 affected checks pass. Production build, Bend proof,
whitespace check, and architect review pass. Chrome decodes a valid 1 by 1 PNG,
rejects the oversized header, and reveals editable source without changing the
exact source record or adding history. Native WebView acceptance remains open.

### Desktop table history restoration milestone

Fixed: Undo and Redo restore the correct active table cell, raw text, and both
selection positions. Restoration mounts a child after widget rendering, without
an extra source or history edit. Stale child input cannot patch another cell.
Later state, mode, composition, and user focus changes cancel pending work or
focus. Selection-only child updates reuse unchanged table decorations.

Evidence: regression checks cover edits across cells and tables, Unicode reverse
selection, omitted cells, table removal, mode changes, stale child input, and
form focus. Chrome checks cover exact mixed-ending source Undo/Redo, active cell
focus and selection, and subsequent typing. Native WebView acceptance remains
open. All 291 web checks and three artifact checks pass. The production build,
root Bend proof check, whitespace check, and architect code review pass.

### Desktop table image-file drop milestone

Implemented: native raster image paths can be dropped into table cells. Rendered
cells append with a separator; active raw cells insert at the drop position and
keep selected text. The same host byte read, scale checks, and request order
apply. Captured controller, cell ranges, child state, selection, scroll, and
layout reject stale results. Exact package image ranges validate the filtered
cell source. Omitted-cell padding is included in the complete 8 MiB source check
before table parsing. Literal path pipes encode once; native backslashes and
ampersands retain their values. Drops have isolated outer history events, with
no asset copy, file baseline, or recovery-clear effect.

Evidence: all 286 web checks, three artifact checks, the production build,
the root Bend proof check, and architect review pass. The web batch covers both
cell routes, omitted cells, Windows path
spelling, protected source, canceled reads, source-size checks, and adjacent
typing isolation. A Chrome fixture checks actual scrolled geometry, Unicode and
encoded path punctuation, exact source Undo, and Redo for rendered and active
cells. Its image read is a test fixture. Native OS table drops, mixed-DPI displays,
zoom, and asset copying remain open.
Cross-cell focus restoration through Undo/Redo has the later checks above;
native WebView focus remains unverified.

### Desktop image-file drop milestone

Implemented: one native PNG, JPEG, GIF, or WebP file drop inserts an encoded
absolute path at visible outer document text. The host validates bounded raster
bytes before one source and history edit. Existing selection text remains
unchanged. Source, layout, scale, input, and request-order checks reject stale
results. Native/CSS scale must agree, without visual-viewport zoom or offsets.
Widgets and protected source reject insertion. The image file remains in place;
no baseline or recovery-clear effect occurs.

Evidence: all 278 web checks and three artifact checks pass in one npm test
batch. The production build passes. A Chrome fixture checks actual geometry
after scrolling, Unicode and encoded path punctuation, exact source Undo, and
Redo. Its image read is a test fixture; it does not prove native OS delivery.
Native drop/scale acceptance and asset copying remain open. Table-cell drops
use the later milestone above.
The Node artifact checks are now separate from Vitest collection and run through
the same npm test command in local work and CI.

### Desktop platform build gate

Added: CI builds one editor artifact with tested Bend 2.0.34, web checks, and the
root proof. A checkout SHA and SHA-256 file manifest accompany the artifact.
Each macOS, Linux, and Windows host job verifies the complete artifact before
Rust tests and a debug executable build. Windows embeds the generated JavaScript
commands without a native Bend compiler. The CI override changes only the
frontend pre-build command. Normal frontend paths, CSP, capabilities, and window
settings remain in effect. Expected executables must exist before upload.
Jobs have timeouts, read-only permissions, and independent platform results.
Remote CI results remain pending. This gate does not prove native input, IME,
clipboard, dialogs, rendering, or file durability, and does not publish releases.
Local evidence: three manifest contract checks, all 43 Rust checks, and the
macOS debug executable build pass. An invalid BEND_BIN during the native build
confirms that the shared editor is not rebuilt. YAML and shell syntax checks
and architect review pass. The compiler setup verifies official release bytes.

### Desktop table clipboard image milestone

Implemented: raster clipboard images paste into table cells through the existing
filtered child edit and outer history. Exact package ranges and document
definitions protect cell code, math, links, HTML, and image syntax. Omitted cells
get their required padding in the same edit. Size checks include that padding
before proposed parsing and check the exact filtered outer source again.
Cell and outer requests share ordering. Source edits, Undo, cell changes,
selection changes, Source mode, and tab changes cancel pending reads.
Virtual-cell validation uses the tree returned by the package parse request.
Native clipboard acceptance and the asset-directory workflow remain open.
The complete batch has 270 passing web checks. TypeScript, production web build,
root Bend proof, whitespace checks, and architect review pass. Six added checks
cover Unicode selection, escaped pipes, omitted cells, exact history, reference
contexts, guarded and stale reads, shared request order, and near-limit padding.
Chrome pasted a binary PNG into a selected cell, decoded its 32 by 32 preview,
and passed Enter, exact Undo, and source-mode Redo with surrounding text intact.

### Desktop clipboard image milestone

Implemented: image-only clipboard paste adds one raster data image through the
existing package-validated image edit plan. It works in untitled documents and
keeps image bytes in exact Markdown source, Save, and recovery. Paste adds one
outer Undo event and no file or baseline effect. Plain text, HTML, and URI lists
retain normal paste. Encoded source has the existing 8 MiB document limit.
Input guards and captured source, selection, identity, path, and generation
reject stale results. New paste requests supersede earlier status publication.
Rejected image requests retain selected text; table cells consume image-only
paste without editing their source. Asset-folder copying and image paste into
table cells remain open. Native clipboard acceptance remains open.
Eight dedicated checks cover event routing, selected-text retention, URI-list
priority, encoded size, escaped labels, stale and overlapping reads, guards,
protected source, and exact mixed-ending Undo/Redo. All 264 web checks pass.
TypeScript, production web build, root Bend proof, whitespace checks, and
architect review pass. Chrome accepted a binary clipboard PNG, decoded its
32 by 32 preview, and passed Undo and source-mode Redo checks. The desktop
WebView and Windows/Linux clipboard paths still need their own checks.

### Desktop table math milestone

Implemented: the upstream GFM and math tree supplies inline formula values and
source ranges for headers and cells. MathJax supplies TeX parsing and SVG layout.
Escaped pipes retain their TeX backslash. Failed formulas stay literal and
editable. Cell editing uses outer history. Source mode, cell activation, removal,
tab changes, and Undo cancel old results. Formula SVG has no link or image actions.
Table image alt text retains literal math. Accepted reference records preserve
first definitions and container titles. Reference collection adds an upstream
body parse; this stage makes no typing-performance claim.

Native MathJax table display and Windows/Linux acceptance remain open.
Chrome shows readable fractions, matrices, and escaped pipes in the dark theme.
Cell input, Enter, Undo, Redo, and complete displayed source passed the UI check.
Nine dedicated checks cover package ranges, escaped reference labels, container
titles, errors, composition, exact history, sanitization, and canceled results.
The complete web batch has 256 passing checks. TypeScript, production web build,
root Bend proof, whitespace checks, and architect review pass. The composition
fixture waits for background parsing before it starts input checks.

### Desktop table image milestone

Implemented: inline and reference table images use package tokens and the ordinary
image loader. Generated inert slots hold no URL in sanitized table HTML. Local
reads capture document ID and path. Metadata reference definitions are excluded.
Opening a cell shows raw image source; its accepted changes use outer history.
Inactive cells refresh after source, reference, image-context, and body-boundary
changes. Active cell DOM stays intact. Removing cells or tables, Source mode, and
tab replacement cancel image results and release Blob URLs. Missing references
stay literal; load errors show alt text and an edit hint. Links remain passive.

Reference environments parse lazily and use weak document-text keys. Every source
edit conservatively refreshes tables. This stage adds image support and does not
claim a performance improvement. Chrome decoded two 32 by 32 data images, then
verified cell label editing, Enter, Undo, Redo, and the complete displayed source.
Native local-image display, WKWebView, and Windows/Linux acceptance remain open.

Nine dedicated checks cover token decoding, generated-slot ownership, stale
success and failure, reference/path/identity refresh, active cells, exact mixed-
ending history, nested tables, metadata, HTTPS, and errors.
The complete web batch has 247 passing checks. TypeScript, production web build,
root Bend proof, and whitespace checks pass. A static list-marker fixture now
settles syntax before its complete-DOM assertions; partial-parser checks remain
separate. No native host code changes in this milestone.

### Desktop PNG export milestone

Implemented: Export PNG captures a settled immutable paper projection, including
math, Mermaid, code, tables, footnotes, and image pixels. It uses html-to-image
with one pixel per CSS pixel, system fonts, and white paper. Every image is
embedded before capture; remote images need CORS and use no referrer. Missing
resources and tainted canvas failures remain explicit. Block HTML frames prevent
PNG export. Dimension limits prevent silent scaling or clipping. Blank-canvas
checks reject obvious failed output. Close cancels before file-write dispatch;
after dispatch, the dialog waits for the actual result. Preview URLs are released.

The Rust host receives binary IPC, validates decoded PNG data, and publishes only
to a new absolute .png path. Existing files and competing destination writes
remain intact. The temporary file is flushed, with exact readback and Unix
directory confirmation. Post-publication failure reports uncertainty. Document
source, history, selection, file baselines, and recovery do not change.

Chrome produced an 820 by 701 PNG with Japanese text, emoji, MathJax, a table,
highlighted code, Mermaid, and a footnote. The generated PNG image preview was
visually checked. Browser download tracking timed out and OS Downloads access
was denied, so actual browser file placement remains unverified. WKWebView
capture, native Save, and Windows/Linux acceptance remain open. HTML rasterization
and direct PDF files are still missing. This milestone does not close the full
product export requirement.

Checks: 234 web checks and 43 Rust checks pass. TypeScript, production web build,
macOS debug app bundle, root Bend proof, formatting, and whitespace checks pass.
Tests cover pixel validation, size limits, malformed PNG, existing destinations,
publication races, interrupted writes, uncertain confirmation, picker cancellation,
binary IPC, preview cleanup, and cancellation before or after dispatch.

### Desktop formatted print-view milestone

Implemented: Print / PDF opens an immutable complete-document projection.
The package GFM parser renders tables, tasks, strike text, links, and footnotes.
The language package supplies metadata boundaries. Metadata prints literally.
MathJax supplies dollar formulas and math/LaTeX fences. Language packages
highlight code. Mermaid CSS stays inside isolated SVG images. Every async item
settles before Print is enabled; failures and 15-second timeouts keep source and
offer Print with warnings. Closing cancels publication and releases resources.
Local image requests capture the document ID and path; image files are read at
preparation time. Print does not change source, history, selection, or baseline.

Chrome visual checks show readable white paper, formulas, tables, highlighted
code, and a diagram while the app theme is Dark. The first diagram check exposed
missing styles; the isolated image path fixes them. Native Print inspection
failed, so it remains unverified. Block HTML frames warn about clipping; inline
HTML prints literally with a warning. PDF through the system dialog depends on
the platform. Direct PDF files, full HTML print layout, and image export remain
unfinished. This milestone does not satisfy the complete export target.

Checks: 225 web checks, TypeScript, production web build, macOS debug app bundle,
root Bend proof, and whitespace checks pass. Integration checks cover the
complete document, immutable source ownership, unchanged history and baseline,
composition guards, isolated diagrams, loading failures, timeout, and disposal.
Architect review found no blocker for this print-view milestone.

### Desktop document-tab lifecycle milestone

Implemented: the main app retains independent document states, history,
selection, Source mode, file baselines, Save uncertainty, and recovery queues.
New, Open, file drop, and Restore add tabs. File and image requests capture their
document ID. Switching checks composition in the editor, cells, and forms, then
cancels stale forms. Close confirms its target, creates a replacement when
needed, activates a live tab, and retires only after recovery clearance. Failed
creation or retirement retains the existing document. Startup returns every live
host baseline with replacement recovery tokens in one consistent operation;
document 0 is not required. Invalid paths and baselines fail without rotation.
Quit flushes all tabs. Failed window Close rebuilds dirty copies after partial
clearance. Failed startup keeps input locked until Retry succeeds.

Checks: 215 web checks and 39 Rust checks pass. The lifecycle checks cover failed
creation, activation, retirement, startup, Open, partial window Close, and
inactive-tab Quit recovery. TypeScript, production web build, macOS debug app
bundle, root Bend proof, and whitespace checks pass. Architect review found no
blocker. Native tab input,
physical scroll, and Windows/Linux acceptance remain open. The stages below
describe the earlier prerequisites, before this integration.

### Desktop document-tab retained-state stage

Implemented: a retained-state model and tab controls. Each tab keeps source,
history, selection, file metadata, Source mode, image context, scroll snapshot,
and recovery references. Temporary input locks are removed from retained states.
Switch guards precede cell-edit completion and the form-invalidation hook. The
tab bar uses literal labels, stable buttons, keyboard focus movement, manual
activation, and a Close tab callback.

This module is not connected to the main app's file lifecycle yet. Next: explicit
ID routing for every command/image request, startup enumeration, per-tab queues,
New/Open/Restore adoption, guarded close, and all-tab Quit/window Close. Physical
scroll, native input, and supported-platform acceptance remain open.

Checks: 208 web checks, TypeScript, the production web build, root Bend proof,
and whitespace checks pass. Architect review found no blocker for this retained-
state prerequisite. Scroll checks verify effect routing, not physical geometry.

### Desktop document-tab recovery stage

Implemented: separate recovery sessions and revision streams for host documents.
Recovery requests validate live document IDs. Renderer restart allocates all new
sessions before replacing the map; partial failure retains every old token and
copy. Retirement requires the current session and exact confirmed clear revision.
Failed or later checkpoints cancel prior clear confirmation. Retirement and
checkpoint locks prevent removal of a later dirty copy. Old copy folders stay.

The renderer still uses one document. Next: retained editor states, per-tab
queues, the tab interface, guarded switching/closing, and Quit across all tabs.
Input must lock before capturing and clearing a closing tab's latest source.
Startup must also select a live document explicitly before the tab interface can
retire document 0; the current single-document startup still uses that ID.

Checks: 34 Rust checks, including partial allocation failure and concurrent
checkpoint/retirement, and 205 web checks pass. TypeScript, production web build,
macOS debug bundle, root Bend proof, and whitespace checks pass. Architect review
found no blocker for this host stage. Native platform acceptance remains open.

### Desktop document-tab host stage

Implemented: the host registry owns independent document paths, file baselines,
Save uncertainty, and generations. Explicit IDs select file and image effects.
Omitted IDs retain the current renderer's document-0 route. IDs are not reused;
unknown or retired IDs fail. Async completion checks its own ID and generation.
Disk work releases the registry lock. Retirement rejects uncertain Save, and
Quit checks uncertainty in every live document. Duplicate paths keep separate
baselines and detect conflicts after another document saves.

This is a tab prerequisite. The renderer and recovery still own one document.
Next: per-document recovery leases and queues, then retained editor states,
the tab interface, guarded switching/closing, and Quit across all tabs. Recovery
acknowledgment must precede retirement when these stages are connected.

Checks: 28 Rust checks, 205 web checks, TypeScript, production web build, macOS
debug application bundle, root Bend proof, and whitespace checks pass. Architect
review found no blocker for this host stage. Native and Windows/Linux acceptance
remain open. The duplicate-path fixture uses the canonical path supplied by IPC.

### Desktop file-shortcut milestone

Implemented: Command-N/O/Shift-S on macOS and Control-N/O/Shift-S on Windows
and Linux invoke New, Open, and Save As through existing toolbar commands.
Only these native shortcuts use document capture; table widgets stop bubbling
keys. Ordinary Save keeps its editor and table routes. Composition in outer
text, table cells, and form fields prevents invocation. Repeat keys and extra
modifiers add no command. Page disposal removes the listener.

Checks: 205 web checks, TypeScript, the production web build, the macOS debug
application bundle, and root Bend proof pass. Tests cover both modifier sets,
editor/cell/form routing, canceled picker and discard confirmation, exact source
and history, uncertain Save As, and disposal. Architect review found no blocker.
Native keyboard and menu interception still need supported-platform checks.

### Desktop file-drop milestone

Implemented: one native Markdown or text file drop uses the shared Open load
path. Native path spelling stays unchanged. Busy commands, uncertain Save, and
outer or cell composition prevent replacement. Discard confirmation and recovery
acknowledgment precede the validated host read. Cancel and failed reads retain
source and history. A valid read starts a new history and updates image context.
Page disposal removes the listener, including one that registers late.

Checks: 202 web checks, TypeScript, the production web build, the macOS debug
application bundle, and root Bend proof pass. Architect review found no blocker.
Checks cover literal Unicode and Windows paths, rejected drops, composition,
confirmation, recovery and read failures, concurrent drops, Save path, and late
listener disposal. Native OS drag and drop and Windows/Linux acceptance remain
unverified. The extension filter does not replace host file validation.

### Desktop strikethrough-command milestone

Implemented: Strikethrough in the formatting toolbar adds validated two-tilde
spans or removes the current parsed strike markers. Nested Bold and Italic stay
intact. Empty selections put the caret between marks. Edge spaces stay outside
the span. Code, unsupported source blocks, footnotes, cell edits, composition,
read-only state, and multiple selections retain the existing input guards.

Checks: 198 web checks and root Bend proof pass. New checks cover backward Unicode
selection, exact BOM and mixed-ending Undo/Redo, source-mode transitions, partial
selection, nested formatting, empty marks, invalid spans, and toolbar focus and
composition guards. TypeScript and the production web build pass. Architect
review found no remaining blocker for this command. Native acceptance remains open.

### Desktop Unicode-footnote milestone

Implemented: Unicode letters, numbers, and combining marks can use the guarded
word-edit cache. Both neighboring code points remain complete and unchanged
across all changes. At least one neighbor is not an ASCII digit. This fixes an
old ASCII cache error where deleting a letter could create an ordered-list mark.
Ampersand text and link/image descendants use full parsing; word edits there
can complete an entity or change reference-link resolution. Nested note references
still take part in numbering. Definitions, syntax marks, whitespace, and other
unsupported changes keep the full package path.

Differential checks cover complete models and rendered definitions, CJK text,
supplementary characters, combining marks, Hebrew, Arabic, surrogate splitting,
multiple changes, delimiter boundaries, nested ordered-list creation, entity
completion/removal, and reference-link labels. Composition-labelled history
checks preserve the BOM and mixed line endings through complete-group Undo/Redo.
They do not use native IME events.
Checks: 193 web checks, TypeScript, production web build, root Bend proof, and
the optional Unicode benchmark pass. Architect review found no remaining
blocker for this cache checkpoint.

The optional Unicode benchmark passes. For 1 Mi UTF-16 units, source-mode update
median/p95 is 11.081/15.178 ms. A separate fresh footnote parse is
893.299/931.263 ms. This excludes preview, DOM, and native input; the frame target
and native IME acceptance remain open. BENCHMARKS.md defines the different clocks.

### Desktop preview-block milestone

Implemented: reuse top-level parser block analysis with an exact physical-line
envelope and source anchor. Shifted blocks map all item, hidden-mark, marker,
and list-owner ranges. Entries contain plain data and at most 65,536 UTF-16 units
of envelope text. Images and footnote definitions use fresh analysis. The global
note overlay stays current. Unsupported trees use the full collector.

Differential checks compare complete items and decorations after Unicode shifts,
container and fence edits, note renumbering, image-definition changes, metadata,
partial syntax completion, balanced trees, and long blocks. A shared-line tail
check verifies source outside a block's exact span. The full collector remains
the reference. Architect review found no remaining blocker for the cache scope.
Checks: 176 web checks, TypeScript, the production web build, and root Bend
proof pass. Native acceptance and supported-platform builds remain separate.

Both optional benchmark batches pass. Warm 1 MiB collection median changes from
39.046 ms for full analysis to 18.523 ms with reuse in one stage batch. Complete
plain-preview edit medians are 68.533 to 74.498 ms. Full decoration construction
and footnote fallback parsing remain costly. Native frames, open time, and idle
memory remain open. BENCHMARKS.md records scope and complete-edit comparisons.

### Desktop preview-selection milestone

Implemented: selection-only transactions update complete overlap groups and
retain unrelated decoration objects. The index includes source and hidden-mark
ranges, physical line starts, list owners, all selections, and boundary positions.
Source, syntax tree, image context, and table-cell changes use the full rebuild.
Large selection changes can also use it. The index is built on first selection
update. The full construction remains the independent decoration reference.

Checks: 173 web checks, TypeScript, the production web build, and root Bend proof
pass. Differential checks cover every caret boundary, reversed and multiple
selections, nested containers, math/mark overlaps, images, metadata, notes,
table-cell transitions, context changes, and source edits. Architect review found
no remaining blocker for this feature. Native UI acceptance remains open.

The optional `npm run benchmark:preview` batch measures state-only stages.
The 1 MiB selection p95 changes from 28.496 to 0.449 ms in separate runs;
the first-index maximum is 21.189 ms. Collection still scans the complete tree
after an edit. These checks do not establish typing or screen-frame performance.
See BENCHMARKS.md for the reference, scope, and retained first-index cost.

### Desktop editor-state performance milestone

Implemented: an optional 20-sample batch for 100 KiB and 1 MiB documents with
start, middle, and end edits. It measures source-record, source-mode, live-preview,
and live-preview-with-footnote routes. Syntax is settled before edit timing;
dirty comparison and outline collection are on clock. DOM and native effects are
excluded. Each edit checks exact source. Run `npm run benchmark:web` to enable it.

Guarded ASCII word-interior edits map cached footnotes and definition AST ranges.
Other changes retain the full package parse. Differential checks compare complete
models and rendered definitions with a fresh parser, including block changes,
multi-change deletions, emoji offsets, and protected source. Hidden outline work
is deferred until show. Heading-label caching has entry and text-size limits.

The measured 1 MiB footnote start-edit p95 improved from 1087.341 to 98.763 ms.
Middle and end fallback edits still measured 1044.001 and 1060.014 ms. Plain
preview also remains above 16 ms. Full preview collection, fallback body parsing,
native frames, open time, and idle memory still need work. See BENCHMARKS.md.

Checks: 171 web checks, the optional benchmark batch, the app-only debug macOS
build, and the root Bend proof pass. Architect review found no remaining blocker
for this scoped optimization checkpoint.
Browser checks confirm show-after-hidden editing, updated heading labels, and
Undo with the outline visible.

### Desktop application-Quit milestone

Implemented: host exit prevention, monotonic request tokens, renderer registration
with stale-token rejection, input locking, discard confirmation, and recovery
acknowledgment before application Quit. Cancel, active input, file commands,
checkpoint errors, and uncertain Save keep the app open. Quit retains its recovery
copy; approved window Close still clears one. The host rechecks Save uncertainty
and grants one zero-code exit. Native acceptance, force termination protection,
and future multi-window coordination are not established by these checks.

Checks: 165 web checks, 21 Rust checks, the app-only debug macOS build, and the
root Bend proof pass. Quit checks cover repeated requests, busy state, composition,
canceled confirmation, failed recovery, uncertain Save, checkpoint completion,
exact source/history retention, startup event ordering, renderer registration,
stale approvals and cancellations, token exhaustion, and one-time exit grants.
Architect review found no remaining blocker for this feature checkpoint.

### Desktop footnote-math milestone

Implemented: MathJax renders package-parsed inline and block formulas inside
footnote definitions. The app includes the font data. Invalid formulas keep
literal text and an edit hint without removing other note content. Removed
definitions cancel pending formula publication. SVG has no link or resource
actions. Rendering uses no source or history transaction. Native acceptance and
large-document rendering cost remain unverified.

Checks: 163 web checks, the app-only debug macOS build, and the root Bend proof
pass. Formula checks cover inline and block SVG, invalid TeX, retained note text,
exact mixed-ending history, Source mode, source reveal, and late success/failure
results. Browser inspection confirms readable fraction and integral layout,
literal invalid formula text, and retained complete source. Architect review
found no remaining blocker for this feature checkpoint.

### Desktop footnote-command milestone

Implemented: Footnote inserts a reference after selected text and appends a
top-level definition. The package validates both additions before the command
dispatches one outer history edit. It selects new note text for replacement.
Label selection reserves existing definitions and missing references. Original
text and trailing whitespace stay intact. Go to Footnote navigates to the first
accepted definition or its first reference without a source edit. Both commands
use the existing input guards. References within definitions remain open.
Insertion requires a single-line selection. Native command acceptance remains
unverified.

Checks: 159 web checks, the app-only debug macOS build, and the root Bend proof
pass. Browser checks cover toolbar insertion, selected note-text replacement,
navigation in both directions, and separate Undo of text replacement and the
complete insertion. Architect review found no remaining commit blocker.

The previous macOS disk-image build failed in bundle_dmg.sh after the executable
and app bundle built. An app-only debug build passed. Disk-image packaging stays
unverified; it is separate from native input acceptance.

### Desktop footnote milestone

Implemented: upstream GFM footnote parsing, source ranges, first-use numbering,
repeated references, first-definition duplicate handling, and source reveal.
Definition preview retains text and formatting without active links or resources.
Definition headings stay out of the outline. Controls reject note source and
Return in definitions inserts a plain newline. Source mode keeps the same model
and outer history. HTML and math inside definitions remain literal; images show
alt text. References inside definitions, insertion controls, navigation, and
large-document timing remain open. Native and Windows/Linux acceptance are open.

Checks: 153 web checks, the production web build, and the root Bend proof pass.
Browser checks cover first-use numbers, repeated references, missing-reference
marks, definition source reveal, typed edits, Undo, and Source mode. Range checks
cover BOM and mixed endings, Unicode, duplicate definitions, nested containers,
metadata, HTML/code/math contexts, and control guards. Architect review found no
remaining blocker for this feature checkpoint.

### Desktop front matter milestone

Implemented: CodeMirror's mixed YAML front matter and Markdown language package.
The app uses parsed metadata boundaries and preserves body offsets. Closed and
empty metadata have a literal preview with source reveal. Active and unclosed
metadata stay editable YAML source. The package requires exact three-dash lines
at document start; three dots and trailing spaces do not close metadata.
No YAML value becomes app configuration or an executed effect. Metadata is
excluded from the outline, Markdown preview, and image reference definitions.
Formatting and link/image controls reject metadata. Return is plain inside
metadata, so YAML list spelling cannot start Markdown list continuation.
Native front matter and Windows/Linux input acceptance remain open.

Checks: 145 web checks, the root Bend proof gate, and the debug macOS app build
pass. Metadata checks cover BOM and mixed CRLF/CR/LF source history, empty and
unclosed blocks, closing-mark edits, metadata/body Return boundaries, source
controls, literal rendering, body heading offsets, and image references. Browser
checks cover metadata preview, body-only outline, source reveal, plain Return
inside a YAML list, Undo, and Source mode. Native acceptance remains unverified.

### Desktop image-controls milestone

Implemented: Image controls for alt text, destination, title, insertion, update,
and removal. The keyboard command is Command-Shift-I on macOS and Control-Shift-I
on Windows/Linux. Commands share the source-preserving link implementation with
an explicit image kind and image destination checks. Changed fields use one
outer history transaction. Unchanged fields retain raw spelling. Remove retains
raw alt source and shared reference definitions. Reference updates remain edits
in Source mode. Composition, read-only state, stale captures, multiple selections,
and unsupported source blocks reject commands.

Choose Image only fills an encoded absolute path. It does not copy or write an
asset. Picker request tokens reject late results after cancellation, reopening,
field input, source changes, or composition. Windows drive and UNC spelling has
Markdown round-trip checks; the Windows-only host path tests need a Windows run.
Relative asset insertion, drag/drop, paste images, local SVG, table-cell images,
and native image-control acceptance remain open.

Checks: 138 web checks, 18 Rust checks, the root Bend proof gate, and the debug
macOS app build pass. Browser checks cover the keyboard command, form insertion,
existing-image capture, raw alt removal, and one-step Undo. Web checks cover exact
BOM and mixed-ending history, unchanged raw fields, reference removal, stale
captures, composition, picker cancellation and late results, and path encoding.
The native file picker and Windows-only host path tests remain unverified.

### Desktop image-preview milestone

Implemented: source-reveal image widgets with package-parsed inline and reference
destinations, titles, and plain alt text. Local paths resolve from the host's
document directory. Percent escapes decode once. Local reads check document
generation before publication and use bounded regular-file reads and raster
signatures. Local and data images support PNG, JPEG, GIF, and WebP up to 8 MiB.
File transitions refresh image context even when the path stays unchanged.
Reference-definition edits refresh images. Removal ignores pending results and
releases Blob URLs. Image errors retain editable source and alt text.

Checks: 130 web checks, 18 Rust checks, the root Bend proof gate, and the debug
macOS app build pass. Browser checks cover data-PNG decoding, decoded and
formatted alt text, source reveal, Source mode, Undo, and Redo. Integration checks
cover local IPC requests, reference changes, same-path refresh, failures, stale
results, Blob release, data limits, and literal image spelling in code and math.
Actual native local-image IPC and native image UI acceptance remain unverified.

Remote HTTPS images use the browser image loader without a referrer. Network
requests expose the client address. Remote images can use browser-supported
formats, including SVG, and have no app byte or dimension limit. Native CSP
restricts remote image resources to HTTPS; app code does not validate each
redirect destination. Local byte limits do not bound decoded image memory.
Local SVG, image insertion, images in table cells, full native image acceptance,
and Windows/Linux checks remain open.

### Desktop file-change milestone

Implemented: bounded read-only byte checks against the saved baseline, visible
window polling, focus checks, Check File, and a warning with Reload and Save As.
Checks do not overlap. Late results and errors are ignored after file transitions.
The host captures its baseline under the lock and reads outside the lock. Reload
waits for discard confirmation and recovery acknowledgment. A valid read opens
the exact source with a new history. Failed reads and cancellation retain source
and baseline. Uncertain Save blocks Reload and Save As until Check Save succeeds.

Checks: 122 web checks, 16 Rust checks, the root Bend proof gate, and the debug
macOS app build pass. Checks cover exact bytes, atomic replacement, missing and nonregular files,
invalid UTF-8, document generations, stale results and errors, command and
composition guards, Reload cancellation, recovery failure, and exact source
history. Native UI acceptance remains open. Matching saved bytes do not prove
file identity. An external write after the final comparison or read remains
possible; Save still uses its own baseline checks.

### Desktop source-editor milestone

Implemented on 2026-10-04: CodeMirror input and history, exact source record,
Bend Return commands, native Open and Save dialogs, file-baseline checks,
atomic replacement, save-completion checks, and unsaved window-close protection.
File commands defer during composition. New resets both editor and host state.

Checks: 19 web checks, five Rust checks, ListReturnCheck, and root Bend proof pass.
The debug macOS app bundle builds. Actual WKWebView checks cover typing,
numbered-list Return, Unicode paste, Undo, Redo, Save As, Open, Save, input after
a toolbar click, and cancellation of Close with unsaved text. Saved bytes were
checked in /tmp/markdew-webview-check.pifopn/desktop-check.md.

The architect reviewed source/history and file ownership and required the save
uncertainty, reset, bounded-read, and composition corrections before this commit.
This milestone was a source editor. The next milestone below adds live preview.
Complete keyboard IME sessions, application Quit, crash recovery,
file watching, and Linux/Windows GUI checks remain open. Save checks cannot
exclude an external write between the final comparison and atomic replacement.

### Desktop live-preview milestone

Implemented on 2026-10-04: formatted Markdown, source reveal, Source mode,
MathJax 4 inline and block formulas, Mermaid diagrams, isolated HTML, table
preview, and code highlighting. The existing micromark math extension supplies
source ranges. MathJax supplies the TeX parser and bundled SVG fonts. There is
no new TeX parser. Preview widgets do not replace the saved source record.
Removed widgets discard pending renderer results. HTML has no scripts,
same-origin access, or external resources. Table preview excludes live links,
images, and HTML styles from the edit surface.

Checks: 30 web checks cover exact source history, source reveal, selection
boundaries, mode changes, composition guards, render errors, removed widgets,
and HTML isolation. The debug macOS QA bundle shows formulas, Mermaid labels,
HTML, table borders, and code colors. Formula source editing and Undo/Redo were
checked in the native window. The user's open windows and documents are kept.
The native rich-document Save As sequence has not yet been checked.

This is preview with source editing. Direct table-cell editing, full keyboard
IME sessions, math accessibility, application Quit protection, crash recovery,
file watching, and Windows/Linux GUI checks remain open.

### Desktop table-cell milestone

Implemented: a CodeMirror edit surface inside a rendered table cell. It edits
single-line Markdown and sends source patches to the outer CodeMirror history.
Tab and Shift-Tab move between cells. Enter and Escape end the cell edit. The
Table source button reveals the complete table. Source mode and file commands
defer during cell composition. Removing the table destroys the cell view.

Checks: 39 web checks pass, including exact source restoration with a BOM,
mixed endings, alignment rows, cell padding, empty cells, escaped pipes,
Unicode, typed edge spaces, and structural removal. Tight cells normalize an
odd final backslash before a delimiter by adding a second backslash. The cell
text reflects this change, and one Undo restores the original source.
Native macOS checks cover Unicode and pipe input, Undo/Redo, Tab, source reveal,
and Save from inside a cell. The saved bytes match the expected source in
/tmp/markdew-table-check.0F8UhU/table-check.md.
The final rebuilt Table Verify app also confirms that Enter and Escape retain
the rendered table after the cell edit ends.

Row/column operations, multiline cells, missing trailing cells in short rows,
full IME sessions, and Windows/Linux checks remain open. This milestone does
not complete the Typora target.

### Desktop table structure milestone

Implemented: Row above/below, Delete row, Column left/right, Delete column,
and Align left/center/right buttons. Plans validate new source ranges before
ending the active cell edit. Each command uses one outer history transaction.
The header and last column stay in the table. Commands inside lists or quotes
are disabled with a Table source hint. Nested previews use individual row
ranges, so container prefixes stay in source without breaking the preview.

Column patches retain existing slots, including padding and escaped pipes.
Short rows get explicit missing slots when a column command needs them.
Empty edge slots and one-column results get required outer delimiters.
New header cells use Column. New rows use the first source line ending.
Alignment changes retain the existing number of dashes. No-op alignment
does not add a history event.

Checks: 46 web checks pass. Exact Undo/Redo checks cover all commands, BOM,
mixed endings, Unicode, escaped pipes, zero body rows, no final ending,
indentation, absent outer pipes, short and extra rows, and command guards.
Native macOS checks cover the buttons, focus after insertion, alignment,
Undo/Redo, deletion of the last body row, reduction to one column, and Save.
Saved bytes match /tmp/markdew-structure-check.IkT0UC/structure-check.md.
The final Structure Verify build confirms keyboard Undo returns focus to the
outer edit surface when it removes the active column, and keyboard Redo works.

Direct editing of omitted cells, multiline cells, nested structure commands,
full IME sessions, and Windows/Linux checks remain open.

### Desktop omitted-cell milestone

Implemented: direct editing of omitted cells in short table rows. Selecting a
cell or using Tab leaves source unchanged. First accepted input appends only
the required slots and text in one history transaction. Actual source slots
remain separate from virtual edit ranges. Undo returns to the virtual cell;
Redo restores its text and exact active range. Whole-row replacement ends the
cell edit. Lezer delimiter nodes distinguish a trailing separator from an
escaped pipe in cell text.

Checks: 52 web checks pass, including exact source/history for BOM, mixed
endings, several omitted slots, spaces-only input, nested prefixes, Unicode,
escaped pipes and backslashes, trailing padding, source mode, prefix edits,
rejected multiline input, and stale row replacement.
Native macOS checks cover opening an omitted cell, Tab to another omitted
cell, Unicode and pipe input, Undo back to empty, Redo, and Save from the cell.
Saved bytes match /tmp/markdew-omitted-check.l0GzWR/omitted-check.md.
Multiline cells, nested structure commands, full IME sessions, and platform
checks remain open.

### Desktop search and outline milestone

Implemented: CodeMirror search/replace panel with keyboard shortcuts, next and
previous matches, Replace and Replace All, case, whole-word, and regexp options.
Search uses normalized Markdown source. File bytes keep their BOM and original
line endings. Search and replace defer during outer or cell composition, even
when called from the package panel. Find ends cell editing before source reveal.
Outline navigates parsed headings in both modes, adds no history, uses text
labels, and refreshes after incremental parsing. Underlined headings now use
their correct levels in both preview and outline.

Checks: 58 web checks pass. New checks cover multiline and Unicode replacement,
exact mixed-ending/BOM Undo/Redo, invalid and empty regular expressions,
zero-length matches, hidden widget source, composition guards, safe outline
labels, mode changes, history, and parser completion.
The macOS test app passed Replace All across ordinary text and table source,
one-step Undo/Redo, outline scrolling in both modes, Find from a table cell,
and hidden formula source reveal. UI control failed during the final Save As
check. No fixture was saved, so that native byte check remains unverified.

### Desktop list, task, and quote milestone

Implemented: parser-based list markers, task checkboxes, and quote line styles.
Ordered numbers and marker spelling stay unchanged. Selection inside an item
reveals its marks, including continuation lines and multiple selections.
Nested quote lines use one border with a depth. Code, table, and HTML source
does not acquire list widgets. A task toggle validates its current marker,
changes one character, and uses outer history. Composition and read-only
states reject marker commands. Detached widgets cannot change source.

Checks: 66 web checks pass. The new batch covers nested lists and quotes,
empty items, tabs, Unicode, checked x/X, mixed endings and BOM, exact task
Undo/Redo, Source mode, selection reveal, code fences, and composition guards.
The macOS test app passed mouse and keyboard task toggles, uppercase X Undo,
Redo, continuation-line source reveal, and list/quote layout beside formula
and table widgets. The final build removes extra bullets before unordered
task checkboxes and supplies each checkbox with its task text label.
Saved bytes match /tmp/markdew-block-check.BNmcy4/block-check.md after
uppercase X Undo. The final MarkDew bundle also verifies the writing margins
and the table-cell padding override. Task text labels refresh after source
edits and Undo. The temporary final-app document was
cleared after the check.
The final Fonts QA bundle confirms monospace text in Source mode and the cell
editor, serif text in preview, and separate document/cell padding.
Nested Return commands and full native IME sessions remain open.

### Desktop direct-formatting milestone

Implemented: Bold, Italic, Code, top-level Heading 1–6 and Paragraph controls,
with keyboard shortcuts. Parsed delimiter ranges control removal. New nonempty
inline spans are accepted only when the resulting syntax matches the requested
format. Code commands choose safe backtick runs and CommonMark padding. Empty
selections insert editable marks. One outer transaction supplies each command;
preview and Source mode retain the same exact source and history.

ATX conversion removes parsed closing marks. Single-line Setext conversion
removes its underline and retains the text line ending. Selection ending at the
next line start excludes that line. Commands defer during composition and reject
read-only state or active table cell edits. Incomplete parsing cannot make a
code block into a guessed paragraph. Rejections keep source and selection.

Checks: 77 web checks pass. The formatting batch covers exact mixed-ending/BOM
Undo/Redo, Unicode, backward selection, nested styles, escapes, empty marks,
edge spaces, code delimiters and padding, ATX/Setext conversion, Source mode,
unsupported selections, composition, and a distant unparsed code block.
The native macOS batch passed Bold/Italic/Code shortcuts, button commands,
nested styles with inner-style Undo/Redo and removal, safe backticks, code
padding, ATX closing marks, Setext conversion, Source mode, and Heading 6 from
the menu. Saved bytes match /tmp/markdew-format-check.NKfoOU/format-check.md
after formatting round trips. The default app bundle builds with this feature.
Link controls, multiline formatting, container heading commands, and native
IME checks remain open. This milestone does not complete the product target.

### Desktop link-controls milestone

Implemented: Link and Command/Control-K open text, destination, and optional
title fields. Apply and Remove use one outer history transaction. Cancel and
opening the form create no transaction. A captured source record, document,
and monotonic generation reject stale Apply/Remove, including history restored
text and new document states. Input guards also cover read-only state, outer
and child composition, and active table-cell editing. Escape stays with the
input method during form composition.

Field patches retain unchanged label, URL, title, escapes, and separator
spelling. Package parsers validate the complete Link span before acceptance.
Destination checks include Markdown escape/entity decoding. Raw angle brackets
require URL encoding. Single-line fields can retain existing multiline
separators. Reference links can be removed without changing shared definitions.
Their inactive reference suffix now hides in preview and reveals for editing.

The web batch covers exact BOM/mixed-ending Undo/Redo, Unicode, nested label
styles, brackets, parentheses, title quotes, relative destinations, encoded
angles, unsafe schemes, stale forms, no-op fields, empty selections, reference
removal, Source mode, input guards, form composition, and Cancel. All 92 web
checks and the isolated macOS desktop build pass. Native link checks remain
unverified: the UI tool reports cgWindowNotFound for the running Link QA process.
Host logs show that it created a visible but occluded window. No product change
was made from this UI observation failure. Link navigation, reference destination
controls, and multiline fields remain open. The full product target stays open.

### Desktop theme milestone

Implemented: System, Light, and Dark themes with a local preference. System
follows the operating-system color preference. Theme changes update CSS without
editor transactions, so source, history, selection, and active cell views stay
intact. Controls, search, outline, table cells, math, caret, selection, and code
tokens use the palette. HTML and Mermaid retain a light canvas for authored
colors. The 95-check web batch includes palette contrast and unchanged editor
state during outer and cell composition. The macOS bundle builds. Browser
checks confirm Light/Dark Find text fields, buttons without gradients, focus,
and match colors. Native WebView visual checks remain open.

### Desktop nested Return milestone

Implemented: nested list, task, quote, and continuation-line Return through
CodeMirror's Markdown command. Flat list and ordinary Return keep the Bend
planner. Empty nested items exit one level, tasks reset to unchecked, and
consecutive ordered siblings can renumber in the same history transaction.
Code, HTML, and table source use plain Return. Incomplete syntax and rejected
package commands also use plain Return. Source history retains exact BOM and
mixed endings. Package inserts use the first source ending; Bend inserts use
the current-line ending. Native keyboard checks remain open.
The WebView Bend bridge now parses normalized text and maps its scalar ranges
back to exact raw source; this also fixes bare-CR Return in this bridge. The
legacy native parser is unchanged. The app owns Enter precedence and retains
the package's other Markdown bindings. Checks include actual Enter events,
ordered siblings, nested task reset, Unicode cursor mapping, and exact history.
All 112 web checks, root Bend proof, and the macOS desktop build pass. Full-tree
completion has a 50 ms budget; it can delay Return and fall back to a plain
newline. This does not prove the 16 ms frame target. Native keyboard and large
document performance checks remain open.

### Desktop recovery milestone

Implemented: exact source checkpoints after a 500 ms input delay, with a 2-second
maximum scheduling wait during continuous input, a serialized
queue, atomic host publication, bounded validated reads, session leases, and
monotonic revision checks for writes and clears. Renderer starts rotate tokens
and retain previous copies. Recovery offers inactive-session copies at startup
or from its button. Restore opens an untitled unsaved document, keeps the copy,
and does not associate the original file baseline. Save with later edits or
uncertain completion retains dirty recovery source. Failed transitions preserve
current source; failed Close keeps the window open. Retry recovery is explicit.
All 118 web checks, 13 Rust checks, root Bend proof, and the macOS desktop build
pass. Checks cover exact BOM/mixed endings, stale writes/clears, session leases,
renderer restart with and without a copy, publication uncertainty and clear
retry, invalid records, continuous input, queue failures, Restore cancellation,
failed Restore, Save with later edits, and failed Close. The isolated QA build
also passes, but UI selection returned cgWindowNotFound. Native recovery
acceptance remains unverified.

The latest unconfirmed input can be lost before the checkpoint acknowledgment.
Orphan-copy removal, application Quit protection, native crash/restart checks,
Windows directory durability, and Windows/Linux acceptance remain open.

## Experiment 1: cursor buffer and formatting projection

Implemented: basic cursor buffer, source reconstruction, insert, backspace,
cursor movement, and simple formatting projection. Laws cover specified cases.
The independent cursor work measurement is an early model, not evidence for the
final document performance targets.

## Experiment 2: native editable paragraph

Implemented:

- macOS multiline source input and automatic formatted preview.
- Bend-owned undo and redo.
- Native clipboard commands and composition event suppression.
- Strong text, emphasis, inline code, and plain-text escaped marks.
- Unicode scalar source-to-view mapping.
- Scalar-to-UTF-16 conversion and scalar selection replacement.
- Native selection events connected to source-to-view mapping.
- Direct formatted editing with exact source marks in active runs.
- Source and formatted-surface selection restored by undo and redo.
- A real native event-loop test for selection, emoji input, undo, redo,
  active marks, marked-text composition, and deletion.
- Automated native, POSIX, and JavaScript adapter checks.

Remaining checks and implementation:

- Check keyboard IME translation. Native marked-text tests check composition
  lifecycle and event suppression, not a complete input-method session.
- Supply grapheme-safe editing for emoji sequences and combining marks.
  The native change-range adapter already expands edits to composed-character
  boundaries; the Bend core still uses scalar positions.

## Experiment 3: incremental Markdown document

Implemented:

- Source-preserving block parsing for headings, paragraphs, individual list
  items, quote lines, blank lines, and backtick or tilde code fences.
- Stable identifiers for unchanged prefix and suffix blocks.
- Updates that start at the previous block and stop at a settled boundary.
  Parser state continues across chunks. Open fences and joined lines can require
  more blocks; unchanged suffixes are shared without reparsing.
- Differential checks against a full parse at each source position in the
  fixture set, plus a sequence of 40 edits.
- Checks with one and four CPU threads.
- Independent parallel reversals for suffix reconciliation.
- An AVL document index with cached scalar lengths, block counts, and heights.
  Source-position lookup and block splits use tree paths. Local edits share
  unchanged branches. Full construction consumes the block list once.
- Index checks against a simple list model, including split boundaries, source
  positions, tree balance, cached lengths, and sizes around powers of two.
- A native process-memory gate for 20 one-MiB parse/edit cycles. It detects
  retained tree branches and is separate from the product idle-memory target.
- Large-file measurements, with results and limits in BENCHMARKS.md.
- Parsed documents stored in edit-history snapshots and updated by direct edits.
- Source text stored only in the document tree of each history snapshot. Edits
  share unchanged branches instead of keeping a second complete source string.
  A history memory test checks every source character after 20 edits and each
  undo and redo step. This gate is separate from the product idle-memory target.
- Block scenes connected to the native editor, with headings, quote and list
  paragraph styles, and literal code fences.
- Native block tests for hidden and active marks, source mapping, fenced edits,
  undo, heading and code fonts, and scroll-view configuration.
- An automatic native 100 KiB test for the initial cursor, 20 direct edits,
  exact source and selection, native drawing, and scrolling to the end, middle,
  and start. The native adapter retains the selection sent before view creation.
- A separate 1 MiB native benchmark and a core scene benchmark. Native updates
  reuse style attributes and replace a changed interval instead of replacing
  the whole text storage. Requested fonts are retained across native fallback.
- A current-session scene cache, kept outside undo snapshots. Input conversion
  and native presentation reuse this cache. Text-position conversion stops at
  the requested position without building a full boundary list. Differential
  tests check these conversions and cached views after edits, selections, undo,
  redo, and raw-source replacement, with one and four CPU threads.
- Native range diagnostics that distinguish removed text from inserted text.
  The 100 KiB first edit removes the two heading-mark characters; the previous
  inserted-range-only measurement did not show that deletion.
- Native split updates for a verified common middle section. A bounded search
  finds an anchor, then checks all retained text and attributes. The tail patch
  runs before the head patch. Twenty-five mixed-script cases match a full
  native build. The measured first 1 MiB edit uses two patches of at most two
  UTF-16 units instead of replacing most of the document.
- Block scenes cached by stable identifier and local selection positions. Source
  positions in a cached scene are relative to its block, so prefix edits do not
  force unchanged suffix blocks to rebuild. The cache remains outside history.
  A binary trie supplies identifier lookup. It clears when its old entry count
  exceeds twice the current block count; after rendering it has at most three
  times the current block count. Tests check full-build equality, unchanged-view
  reuse, prefix shifts, 40 edits, cache size, and one and four CPU threads.
- A balanced scene position index with cached source lengths, UTF-16 lengths,
  block counts, and the last non-final source point. Input and cursor placement
  use tree paths and local block maps. Tests compare all fixture positions with
  complete maps, including hidden marks, empty fences, reversed selection,
  surrogate pairs, CRLF, undo, redo, history branches, and raw replacement.
  Equal block counts share unchanged index branches; different counts rebuild.
  Large balanced index construction uses independent parallel calls. A larger
  fixture checks this path with one and four CPU threads. Complete scalar maps
  and combined visible strings are now built only for reference checks.
- Native benchmark source checks that use a short pattern and edit count, with
  exact character and cursor checks after every edit. Complete expected source
  strings are not kept across edits. Optional native stage clocks separate run
  construction and projection from source delivery; normal frame measurements
  keep those clocks disabled. Results and limits are in BENCHMARKS.md.
- Scene runs sent through one host effect. The single-run API uses a one-item
  batch. Native consumption uses the runtime ownership helpers so shared cached
  scenes remain valid. macOS, POSIX, and JavaScript checks compare ordered batch
  output with single-run output, including every style, empty text, and Unicode.
  The generated JavaScript program is also run with no input in the batch gate.
- Ordered host chunks with stable block identifiers and a freshness flag from
  the Bend block cache. macOS and JavaScript reuse unchanged native scenes and
  keep only current blocks. Cache misses rebuild from supplied runs. Fresh
  entries replace prior content with the same identifier, including history
  resets. Legacy scene presentation clears the native cache. Host checks cover
  these cases; native benchmarks check at most two rebuilt blocks per local
  fixture edit. Complete Bend run-list joins are now only for reference checks.
- Source-range delivery for direct edits. Bend supplies scalar source positions
  and inserted text. Each adapter updates its source mirror; macOS converts the
  range to UTF-16 and patches the raw editor. Selection changes keep source text.
  Opening, history, and raw-source replacement keep the complete-source path.
  Checks cover reversed and clamped ranges, Chinese, emoji, combining marks,
  and CRLF. Native event tests compare the host and raw editor with Bend source
  after every action. Large native tests check the exact source after every edit.

Remaining work:

The document update now reports a conservative changed block interval: first
block, removed count, and added count. Tests check unchanged prefix and suffix
identifiers, kinds, and exact text at every fixture position, through 40 edits,
and for one-MiB edits. Direct edits now use this interval to replace the changed
scene index range. Tree paths find the previous and new selection ranges, so
local scene refresh does not scan complete document blocks. The old selection
range moves with retained block ranks after insertion or deletion. Scene index
chunks retain cached runs for blocks outside these ranges.
The scene position index now has balanced split, join, and range update
operations. Batch checks compare range updates with complete builds. These
operations run in the scene cache edit path. A one-MiB reference batch reads
three, four, and five blocks for edits near the start, middle, and end. A selection
move between ends reads two blocks. Local updates now send ordered patches with
block and UTF-16 ranges. The same one-MiB cases transfer two or three chunks.
Patch replay checks compare block order, exact native ranges, text, and styles
with complete scenes. macOS patches its retained attributed scene and keeps
untouched chunks; POSIX and JavaScript keep the same effect contract.

- Native navigation checks now cover document-end and document-start commands,
  left/right arrows, selection extension, Chinese, emoji, combining marks,
  joined emoji, an 8,192-character wrapped line, repeated selection changes,
  and three edit-surface sizes. They check exact source and selections and the
  visible caret. Up/down commands at the first line boundary also pass. Extend
  coverage to vertical navigation through variable-width text and bidirectional
  text. The wrapped-line check passes at column zero and column five in the
  repeated Latin paragraph, with both events passing through Bend.
  Down and Up across a wrapped line now pass separately through Bend. The host
  preserves selection affinity when the scene maps to the same native range.
  This fixes Up returning one position before the paragraph start.
  Programmatic full window frame changes preserve text, selection, and caret
  visibility. User drag resizing and automatic editor reflow remain unchecked.
- Meet the edit frame-time budget. Indexed model edits are within one millisecond
  at the 95th percentile. Measured complete editor frames exceed the target.
- Add full CommonMark block rules. Nested lists, lazy quote continuations,
  setext headings, indented code, thematic breaks, and HTML blocks are absent.
- Improve quote and list presentation. Their source prefixes still show.
- Native macOS source-range conversion now uses a balanced position index.
  Normal source-field updates use a tracked baseline. Reduce complete-source
  copies and opening cost. TextKit now permits separate layout regions, and
  projection keeps the caret visible. Normal input
  now compares only the text-storage edit range; multiple edits before a commit
  keep complete input comparison. Normal local edits use direct storage patches; unknown
  baselines and partial overlaps keep complete comparison as a fallback.
  Reduce complete-source history presentation.
  Native checks now include typing before the initial complete-layout scroll.
  Large complete renders now fork independent document-tree branches. Opening
  measurements separate parsing, scanning, cache insertion, and position-index
  construction. Large empty caches now use identifier-bit partitions. Reduce
  temporary cache-build memory and complete native chunk construction next;
  opening still exceeds target. Cache-build accumulators restored spare capacity
  in the history memory gate; native chunk construction remains a large cost.
  Native chunks now collect text and style ranges before building attributed
  buffers. Substage clocks still identify styles as their largest measured part.
- Extend native split updates beyond the bounded anchor search. Changes without
  a verified anchor still use one interval and can invalidate most of a document.

## Experiment 4: saved bytes and file safety

The first boundary check uses Bend Base file effects to write and read an exact
16-byte fixture. It includes BOM bytes, CRLF, NUL, emoji bytes, and invalid
UTF-8. Native macOS and JavaScript builds passed. The batch runs both builds and
compares their saved files. File modes are `r` and `w`; the byte effects preserve
bytes without text decoding.
The check reopens the file for read sizes of one, three, and 4,096 bytes. Each
case makes 32 reads, including repeated reads after EOF, and compares all
combined bytes with the exact fixture. All three cases passed in native macOS
and JavaScript builds. Small chunks split the BOM and emoji byte sequences;
one-byte chunks also split CRLF. These reads do not decode text.

The POSIX atomic-replacement experiment writes a sibling temporary file, syncs
it, replaces the destination with rename, then syncs the parent directory.
Six child-process cases stop after creation, partial write, complete write,
file sync, replacement, or successful completion. Exact byte checks find the
old document before replacement and the new document after replacement.
Each case now runs with access modes 0600, 0640, and 0644, for 18 process-exit
cases. The temporary file starts with mode 0600. Before file sync, the host
copies the original regular file's access mode with fchmod. Exact checks confirm
that the saved file keeps its mode before and after replacement. All 18 cases
passed on macOS. This does not check ownership, ACLs, extended attributes, or
read-only files.
A replacement into a directory fails and keeps both the saved document and
temporary bytes unchanged. The macOS check passed and is in the batch.
This checks process exit, not power loss. Linux execution, complete metadata
preservation, concurrent writers, and a Bend save-state contract remain
unverified.

The Bend save-state experiment stores current bytes, confirmed saved bytes,
and a pending snapshot with a unique request identifier. Successful results
update only the saved baseline. Failed or uncertain results keep that baseline.
Only one save may be in progress for a destination. A request made while a save
is pending keeps that request and does not allocate another identifier. After
completion, the next request captures the latest edited bytes. The host must
execute each accepted ticket once and must not retry a completed old ticket.
Late results for older requests keep the newer request unchanged. Edits made
during a save remain dirty. Restoring the saved bytes becomes clean again.
The native state batch passed with one and four threads. Exact state comparisons
check current bytes, saved bytes, identifiers, and pending snapshots. Four laws
cover failure, success, stale results, and one save in progress. This model is not
yet connected to the atomic host or editor.
Save outcomes now distinguish a confirmed old file, an uncertain replacement,
and a confirmed replacement with directory sync. Uncertainty keeps both the
saved baseline and pending ticket, so another writer cannot start. A later
definite result resolves that ticket. Exact checks passed in native builds with
one and four threads, Bun, and Node. A fifth law proves that an uncertain outcome
keeps the complete state.
The pure reconciliation step now checks observed bytes against the pending
snapshot and saved baseline. With confirmed synchronization, matching pending
bytes completes the save; matching old bytes resolves it without advancing the
baseline. Other bytes, failed synchronization, or a stale request identifier
keep the state unchanged. Exact checks passed in native builds with one and four
threads, Bun, and Node. The host must still obtain a stable disk observation and
exclude competing writers; this pure step does not do that work.
The connected save-host experiment now runs the POSIX replacement process from
Bend's Process.run effect. It writes a CRLF/emoji snapshot while the model holds
a later edit, confirms the process exit, reads exact saved bytes back, and checks
the complete resulting state. Native macOS and Bun runs passed. The subprocess
is an experiment boundary, not the final editor save API.
The interrupted host check now connects five controlled process exits to Bend.
Stops after creation, partial write, complete write, or file sync keep the old
disk bytes and resolve the ticket without advancing the saved baseline. A stop
after rename leaves the new disk bytes but keeps the baseline and pending ticket
unchanged because directory sync is not confirmed. Every case checks the exact
current edit, saved baseline, pending snapshot, and disk bytes. Native macOS and
Bun runs passed, and the checks are in the batch. The controlled exit codes name
known stages; arbitrary process failure must remain uncertain.
Two additional laws now prove that unrecognized bytes and an unconfirmed sync
result keep the save state unchanged. The proof gate passed all seven save laws.
The connected check now syncs the regular saved file and parent directory,
then reads exact bytes into Bend reconciliation. Before replacement, the old
baseline remains. After the uncertain rename, matching snapshot bytes resolve
the pending save while preserving the later edit. Native macOS and Bun runs
passed. These are isolated directories without competing writers. The separate
sync and read steps do not provide a stable observation under concurrent changes.
Crash recovery records and concurrent-writer protection remain incomplete.
The POSIX host checks now also reject symbolic-link and directory destinations
before creating a temporary file. An existing pending file blocks another save
without changing either file. Exact checks preserve the original bytes and
target kinds after rejection. The extended process-exit batch passed with
AddressSanitizer and UndefinedBehaviorSanitizer. This checks fixed targets in
an isolated directory, not replacement of a target by another writer between
the host's inspection and rename.
The complete macOS batch passed with the connected save, interrupted save,
reconciliation, and target-rejection checks included. The document memory gate
measured 88,064,000 bytes; the history gate measured 237,207,552 bytes. Native
navigation, input, marked-text composition, and JavaScript checks also passed.
The C atomic-replacement batch and POSIX host round-trip check also passed in
an Ubuntu 24.04 aarch64 container on OrbStack's Linux kernel. GCC compiled the
atomic check with C11 and warnings treated as errors. The repository was mounted
read-only; builds and test files stayed inside the temporary container. This
checks Linux file effects and the POSIX adapter, not the complete Bend Linux
batch or a native Linux text editor.
The save-state checks also passed in Bun and Node. The byte-read check passed
in Bun; Bend 2.0.34 generates a bun:ffi dependency for File.read_bytes, so Node
cannot run that check. The batch reports this limit when Bun is absent, while
still running the native byte check. The POSIX atomic-replacement experiment
also passed with AddressSanitizer and UndefinedBehaviorSanitizer enabled.
The complete batch passed with these checks included. Its document memory gate
measured 88,031,232 bytes, and its history gate measured 236,453,888 bytes.
Native navigation, IME composition, cold document input, and JavaScript adapter
checks also passed. These memory gates are not product idle-memory measurements.

Remaining work: connect original bytes to the document model, define invalid
UTF-8 handling without source loss, connect the tested atomic host to the editor,
implement crash recovery records, and handle external file changes. The isolated
save experiments do not establish complete editor save or recovery behavior.

The recovery-state experiment now compares a validated recorded state with disk
bytes. Matching saved or pending bytes restores the recorded current edit,
uses disk bytes as the saved baseline, and clears the interrupted request.
Unknown disk bytes produce a conflict that retains both complete versions.
Exact checks passed with native one/four-thread builds, Bun, and Node, including
NUL and invalid UTF-8 bytes. Two recovery laws passed. Disk reads are not stable
under competing writers. Record validation and persistence checks are described
below; this model alone does not provide complete crash recovery.
The interrupted-save host check now also passes its actual disk bytes into the
recovery model. All five interruption stages restore the recorded current edit,
select the observed saved baseline, and clear the interrupted request. Native
macOS, Bun, and native Linux Bend runs passed this connected check. The recorded
state remains in the test process; this does not prove recovery after losing
process memory.
The reusable Linux runner now passed the complete batch without interruption.
It used checksum-verified Bend 2.0.34, Clang 18, and Node 18 on Ubuntu 24.04
aarch64. The document memory gate measured 87,371,776 bytes; history measured
236,158,976 bytes. Native file checks and the generated JavaScript editor run
passed. Generated JavaScript byte reads were explicitly omitted because Bun
was absent. The runner is `sh tests/linux.sh`; its image stays cached for later
runs. Native Linux GUI behavior and the x64 image path remain unverified.

src/RecoveryRecord.bend now encodes the complete save state as a versioned ASCII
record: current bytes, saved bytes, next identifier, and the optional pending
snapshot. Decimal byte values preserve NUL and invalid UTF-8 without decoding
them. An FNV-1a checksum covers the record fields. The decoder checks the version,
end marker, checksum, byte range, metadata limit, and pending identifier order.
macOS and Linux native one/four-thread, Bun, and Node checks passed for empty, binary, pending,
and large-identifier states. Every truncated prefix and each single-character
replacement with x in these fixtures was rejected. This checksum detects the
tested accidental corruption; it is not an authentication mechanism. Record
persistence is now checked by a connected restart experiment. One writer process
atomically saves the encoded record and exits with status 79 after confirmed
file and directory sync. A separate reader process loads and validates the
record, reads the saved document, and restores the recorded edit. Both old-file
and pending-snapshot disk cases passed on native macOS, native Linux, and Bun.
The restored current bytes include NUL and invalid UTF-8. No state is passed
between these processes except through the files. This uses a controlled process
exit after a successful record save; it does not establish power-loss behavior.
The small fixtures fit the test's
4,096-byte read bound. Large records, record lookup, and editor integration remain
incomplete.

The journal-interruption check now first saves a valid record, then starts a
separate updater with a later edit and stops its host after creation, partial
write, complete write, file sync, or rename. A third process validates the
selected record and recovers the edit from disk. The first four cases load the
previous complete record; the rename case loads the new complete record.
Incomplete temporary files do not replace the prior record. All five native
macOS, native Linux, and Bun cases passed. The complete macOS and Linux batches
passed with these cases included. macOS document/history memory peaks were
87,998,464 and 236,945,408 bytes; Linux peaks were 87,437,312 and 236,077,056 bytes.
The Linux batch reports its omitted Bun-dependent runtime checks explicitly.
Power loss, large records, competing writers,
record lookup, and editor recovery integration remain incomplete.

## Batch gate

The one-MiB recovery codec check now passes on native macOS and native Linux.
It produces a 6,291,481-byte record and uses about 458 MiB of peak resident
memory. See BENCHMARKS.md for the fixture and measurements. The record exceeds
the disk experiment's input and read bounds. This is evidence for the next
recovery task: reduce record size and memory cost, then check a large record
across separate writer and reader processes. Large-record disk recovery is
still incomplete.

Recovery record version 2 now uses lowercase hexadecimal payloads. It retains
version 1 read support. The same one-MiB fixture produces 4,194,330 bytes,
with about 314 MiB of peak resident memory on macOS and Linux. All byte values,
legacy decoding, and malformed payloads with valid checksums have explicit
checks. This reduces codec cost, but does not yet meet the disk experiment's
bounds or prove large-record restart recovery.
The complete macOS and Linux batches passed with version 2, including the
separate-process restart and five journal interruption cases. The macOS
document/history memory peaks were 88,064,000 and 237,043,712 bytes; Linux
peaks were 87,310,336 and 235,696,128 bytes. Linux still omits the Bun-dependent
JavaScript file-byte runtime checks. A direct hexadecimal output check also
passed on native macOS, native Linux, Bun, and Node.

The native large-record restart check now uses three distinct one-MiB
snapshots. A writer persists the journal and exits; a separate reader loads
the actual source and journal files. Both old-file and completed-save cases
passed on macOS and Linux. The reader checks every recorded field, restores
the current edit, selects the observed saved baseline, and clears the pending
request. The journal contains 6,291,481 bytes. The host's new eight-MiB bound
accepts exactly eight MiB and rejects one extra byte before creating a pending
file. Rejection retains the original document. These checks are now in the
native batch. Large interrupted journal updates, large JavaScript records,
power loss, record lookup, competing writers, and editor integration remain
incomplete. Codec memory cost remains high; it is not a product idle-memory
measurement.
Both complete batches passed with the large restart and host input-limit
checks included. macOS document/history memory peaks were 88,047,616 and
236,748,800 bytes; Linux peaks were 87,420,928 and 235,438,080 bytes. These
remain core memory-gate results. The large recovery check runs natively;
Linux still reports its omitted Bun-dependent runtime checks.

Large interrupted journal updates now pass all five stages on native macOS
and native Linux. The fixtures contain three distinct one-MiB snapshots.
Separate initial writer, updater, and reader processes use only disk files
to transfer state. Before rename, recovery restores the prior complete edit.
After rename, it restores the later complete edit. Every recorded field and
the restored saved baseline are checked. The new cases are in the native
batch. This step ran the ten new platform cases and the Bend proof gate;
the prior complete-batch result still applies to the unchanged core. Power
loss, large JavaScript records, competing writers, record lookup, and editor
integration remain incomplete.

External file changes across restart now have connected one-MiB checks.
A separate process changes and syncs the saved document after the writer
stops. The recovery reader must retain the complete recorded state and disk
version as a conflict. Two cases passed on native macOS and native Linux:
disk bytes matching the current edit, and a fourth distinct disk version.
Neither matches the recorded saved or pending snapshot. Exact file comparisons
confirm that recovery changes neither source nor journal and creates no pending
replacement. The four new platform cases, Bend proof gate, and script syntax
checks passed. The cases are in the native batch. Simultaneous writers,
file watching, conflict-resolution UI, record lookup, power loss, large
JavaScript records, and editor recovery integration remain incomplete.

The one-MiB version 2 codec now passes on JavaScript. The first Bun and Node
runs failed with stack overflow in byte validation. Encoding, decoding, record
splitting, and byte comparison now use accumulators and tail calls on the
version 2 path. Native bytes and checksums are unchanged. The proof gate and
complete macOS and Linux batches passed after this core change. The JavaScript
batch now includes the one-MiB round trip. macOS Bun 1.3.11, macOS Node 22.22.3,
and Linux Node 18 passed. Native macOS and Linux large restart, interruption,
and conflict cases also passed. macOS document/history memory peaks were
88,080,384 and 237,371,392 bytes; Linux peaks were 87,564,288 and 236,756,992
bytes. These remain core memory gates, not codec or product idle-memory
measurements. The measured JavaScript codec memory cost remains high; see
BENCHMARKS.md. Large JavaScript disk recovery and large legacy JavaScript
decoding remain unverified. Editor integration, record lookup, power loss,
simultaneous writers, and the remaining product requirements are incomplete.

Large JavaScript disk recovery now passes all nine cases with Bun 1.3.11 on
macOS: two restart states, five journal interruption stages, and two conflicts.
The tests use separate processes and actual disk files with the same three
distinct one-MiB snapshots. The conflict driver now accepts an optional runtime;
its two native cases passed again. The new JavaScript cases run in the Bun
batch. Node still runs the codec because Bend 2.0.34 file-byte effects require
Bun. The Linux runner now includes Bun 1.3.11 from a digest-pinned image and
checks its version during the build. The complete Ubuntu 24.04 aarch64 batch
passed with all nine large JavaScript disk cases, small restart and journal
checks, byte preservation, connected saves, interrupted saves, and host checks
enabled. The runner no longer omits those Bun-dependent checks. Native
document/history memory peaks were 87,318,528 and 236,220,416 bytes; these are
core memory gates. Linux native GUI behavior, the x64 image, record lookup,
editor recovery integration, power loss, simultaneous writers, and the remaining
product requirements are incomplete.

The real directory listing limit now has a connected stress check. A new
isolated root contains 2,200 directories with 250-byte names. Its complete
listing would exceed one MiB. The host returns failure without END and keeps
partial output within the bound. Bend reports the failed scan instead of
accepting a partial catalog. Native and Bun cases passed on macOS and Linux.
Every exact candidate name and directory type remains intact after failure.
The tests use the default host limit and are in the batch. No production code
changed. Large successful catalogs, streaming enumeration, concurrent changes,
application storage, nonfatal UI errors, editor integration, and the remaining
product requirements are incomplete.

The read-only recovery directory host now lists candidate directories and
unsupported entries with hexadecimal names and a complete-listing marker.
Bounded reads open one child under the root and reject symbolic links, unsafe
names, non-files, and records above eight MiB. Host checks passed on macOS and
Linux for empty and complete listings, root failures, unsupported entries,
missing records, newline-bearing names, exact binary reads, and the eight-MiB
read boundary. Linux checks non-UTF-8 names; the macOS fixture reports the
filesystem's verified rejection of their creation. The new host checks are in
the batch. C does not validate record contents. Bend scan integration,
invalid-file reports, listing-limit stress checks, concurrent directory changes,
application journal lookup, editor integration, and the remaining product
requirements are incomplete.

src/RecoveryScan.bend now connects host enumeration and candidate reads to Bend
record validation. Accepted entries retain origin names. Rejected candidates
retain names and distinct unsupported-type, read-failure, and invalid-record
reasons. Root failures and incomplete listings fail the scan instead of returning
an empty catalog. Accepted entries feed exact-identity lookup while the caller
retains the full catalog. The mixed fixture checks two valid records, five
rejected candidates, a copied duplicate, and a failed root. Unique and duplicate
scans passed on native macOS, macOS Bun, native Linux, and Linux Bun. Both valid
record states and all rejection names/reasons are checked. Exact comparisons
confirm that scanning does not change any record or remove unsupported entries.
The new retention laws passed the proof gate. New cases are in the native and
Bun batch. Listing-limit stress, large scans, concurrent directory changes,
application storage, nonfatal UI errors, editor integration, and the remaining
product requirements are incomplete.

src/RecoveryEntry.bend now provides a document identity prototype. It wraps the
checked state record with a nonempty opaque byte identity and covers both with
an outer checksum. Matching saved bytes alone cannot associate an entry with
a document. A wrong identity retains the complete entry and disk bytes;
matching identities delegate to the existing recovery and conflict rules.
The small fixture includes two identities with identical empty saved baselines.
Native one/four-thread, Bun, and Node checks passed on macOS and Linux. Tests
reject empty or invalid identities, altered identity fields, every truncated
prefix, appended text, bare state records, and invalid inner checksums. The new
mismatch law passed the Bend proof gate. These checks are in the batch.
Host identity assignment, filesystem lookup, large wrapper measurements,
migration, and editor integration remain incomplete.

The identity wrapper now passes connected process-restart checks with three
distinct one-MiB snapshots and two actual files with identical saved bytes.
The writer syncs the files, saves the wrapper through the atomic host, and
exits. Fresh readers validate the persisted identity and complete state. The
owner restores its edit; the other file retains both versions as WrongDocument.
Exact file comparisons confirm that recovery changes neither source file nor
journal. Both cases passed on native macOS, macOS Bun, native Linux, and Linux
Bun. The wrapped journal has 6,291,504 bytes. The eight new platform/runtime
cases and proof gate passed. Native and Bun batch paths now include the cases.
The fixture uses fixed identities; stable host assignment, filesystem lookup,
migration, wrapper performance, editor integration, simultaneous writers,
power loss, and the remaining product requirements are incomplete.

The entry restart fixture now uses a POSIX PATH1 identity provider instead of
fixed a/b keys. The host resolves existing readable regular-file paths and
returns opaque identity bytes. Its checks passed on macOS and Linux for
relative paths, symbolic-link aliases, parent path components, Unicode names
with spaces, distinct destinations with equal bytes, and identity stability
after atomic replacement. Directory, missing-file, and FIFO targets are
rejected without output. Each connected writer and reader obtains identities
from the actual files. Both one-MiB owner and wrong-document cases passed on
native macOS, macOS Bun, native Linux, and Linux Bun. The proof gate, script
syntax checks, and diff checks passed. New cases are in the batch. Rename/move
handling, case aliases, Unicode path normalization, hard-link policy,
concurrent path changes, unsaved identities, application journal lookup,
editor integration, and the remaining product requirements are incomplete.

src/RecoveryLookup.bend now selects validated entries by exact document identity.
Unique selection requires one match. Duplicate owners remain Ambiguous with
all matching entries retained, including identical duplicates. Invalid requests
retain the query and candidates. Missing means no match in the validated list,
not absent disk data. Checks cover ordering, unrelated documents with equal
saved bytes, invalid requests, duplicate versions, and a 65,536-entry traversal.
Native one/four-thread, Bun, and Node checks passed on macOS and Linux. The
duplicate and invalid-request laws passed. The persisted one-MiB fixture now
checks selection before its existing recovery guard; native and Bun cases
passed on both platforms. New checks are in the batch. Filesystem enumeration,
invalid-file reporting, duplicate resolution, application journal lookup,
rename/move migration, unsaved identities, editor integration, and the remaining
product requirements are incomplete.

The path identity batch now checks case and Unicode spellings using the
filesystem's actual alias behavior. Both pairs are aliases on the tested macOS
filesystem and distinct names on Linux. Alias identities match; distinct names
with equal bytes retain separate identities. Hard-link destinations also keep
separate PATH1 identities. Atomic replacement leaves both identities stable,
retains the hard link's exact old bytes, and writes the exact new bytes at the
selected destination. All macOS and Linux path cases passed. No core path
normalization was added. The new cases are in the existing batch. Script syntax
and diff checks passed. Other filesystem variants, rename/move migration,
concurrent path changes, unsaved identities, application journal lookup,
editor integration, and the remaining product requirements are incomplete.

## Save As and uncertain publication

The application now owns an Editing, Saving, or Uncertain workspace. Save As
resolves the target and publishes a new file without replacing an existing
file. A confirmed result adopts the new destination. An uncertain result keeps
the target, ticket, captured bytes, current edits, and undo history. Save and
Close stay blocked until a confirmed observation resolves the transaction.

Recheck Save As is connected to the macOS button and the terminal `.recheck`
command. It checks the retained destination without publishing again. Focused
macOS and Linux observation batches passed. Terminal application checks passed
for adoption, later Save, mismatched bytes, and a missing target. The latest
complete application batches passed on macOS and Linux aarch64. The native
Recheck button test also passed for matching, different, and missing files.
The automated native Save As dialog confirmation
test remains unsuccessful. These results do not establish Windows support or
the complete product target. See SAVE_AS_EXPERIMENT.md and
NEW_FILE_OBSERVATION.md for the test scope and limits.

## Return and list continuation

Return is now a Bend-owned command in the formatted editor. It continues
top-level unordered items with `-`, `*`, or `+`, keeps exact prefix spacing,
and exits empty items without removing their existing line ending. Other
selections and fenced code use the ordinary newline edit. The incoming
formatted selection is mapped once, before the accepted source edit. Undo
retains that selected snapshot.

Native Bend, Node, and Bun command checks passed on macOS, including a
65,536-scalar item. The first macOS and Linux command batches passed. Expanded
spacing, empty-CRLF, middle-of-item, fence, and hidden-inline-mark command
checks passed on macOS and Linux aarch64. A native macOS Return
event check and the marked-text bypass host check passed. Return, Undo, and
Redo retain an uncertain Save As transaction in the workspace checks.

The standard proof and history-memory gates passed. Source replacement, block
comparison, and full scene-map assembly use tail loops where the long-line
check found JavaScript stack limits. The first Return implementation scans
source lines and presents the full accepted source; it does not establish the
16 ms product target. Full application batches passed on macOS and Linux
aarch64. The extended command checks passed separately and are now in the
permanent list batch; its updated macOS and Linux aarch64 runs passed, as did
the standard proof gate. Details and the
remaining checks are in LIST_CONTINUATION.md.

The baseline Return core medians are 24 ms for 100 KiB and 440 ms for 1 MiB.
src/IndexedReturn.bend is a separate planner prototype. It uses cached block
offsets and scans the active block and predecessor context. It does not build
the preceding source. Differential checks passed every selection pair in the
initial fixtures in native Bend, Node, and Bun on macOS and Linux aarch64.
Closed-fence EOF cases with LF and CRLF also passed on macOS. Architect review
found no code defect. The planner is now connected to both Return command paths.
The connected macOS and Linux aarch64 batches, history-memory checks, and
standard proof gates passed. The repeat timing run passed; both core medians
were 0 ms at the one-millisecond clock resolution. This does not establish
native frame latency. The legacy
planner remains the differential reference. A single large
active or preceding block can still require a large scan.

The native Return benchmark passed all six batches: 100 KiB, 1 MiB, and a
65,538-byte item, each with stage clocks disabled and enabled. The measured
uninstrumented medians through layout and display were 37.722, 540.832, and
56.362 ms. Source and chunk delivery dominate the many-block case; the final
display call is small. These checks do not measure physical screen delivery.
Return now uses accepted source ranges and ordered selection/edit scene
patches. Pure replay and native stale-selection checks passed in both command
paths. Focused platform, workspace, memory, and proof gates passed. Full
application gates passed on macOS and Linux aarch64 with the final permanent
Return batch. The repeat six-case timing batch passed. Uninstrumented medians
are now 2.002 ms for 100 KiB and 16.872 ms for 1 MiB. The long item regressed
to 73.811 ms, with 22.970 ms in its instrumented chunk-update stage. Matching
text and attribute edges are now retained within native preview patches that
have no pending native input edit. Source, scene, history, Unicode, and
style-only checks passed, as did complete platform gates after the source
move. The isolated six-case repeat passed all 120 samples. Every instrumented
Return inserted only three preview units. Long-item chunk-update time was
1.466 ms, but total timing evidence is mixed: the long uninstrumented median
was 81.481 ms and the instrumented median was 47.596 ms. The additional
outside-clock reference check differs from the old benchmark. No causal
overall speed improvement is established. The 1 MiB uninstrumented p95 was
26.703 ms, above the product target. The next experiment will profile work
before native presentation with unchanged session ownership and exact checks.
Details and all samples are in BENCHMARKS.md.

Run `sh tests/check.sh`. It checks Bend laws, builds native and JavaScript
programs, and runs cursor, text-position, direct-state, document, and adapter
checks, plus the retained-memory gate. On macOS it also runs the native window
event loop without manual input.
It does not prove full CommonMark behavior, keyboard IME translation, or the
product performance budget.

Keep important rules in LAWS.bend. Run `bend PROOF.bend` before each commit.
Commit each completed feature or fix after its checks pass, as requested by
the user. Keep incomplete experiments separate from completed changes.

## Source layout

Application Bend, C, and JavaScript files are in `src/`. Tests stay in `tests/`.
Project documents stay at the root. `LAWS.bend` and `PROOF.bend` are intentional
root exceptions; the proof command remains `bend PROOF.bend`. The move kept
all 83 source-file contents unchanged. Root proof imports, test imports, C
includes, JavaScript fixture reads, build scripts, and current document paths
use the new directory. All 1,240 local Bend and foreign imports resolved.
The standard proof, macOS host, Node/Bun host, POSIX syntax, application builds,
and focused native document checks passed. Complete application gates then
passed on macOS and Linux aarch64 from this layout. The architect found no
remaining path correction. The earlier pre-move native source assertion did
not repeat in focused warm/cold checks or the new full macOS gate. Its cause
remains unknown; the diagnostic and failure record stay in place.
