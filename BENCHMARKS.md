# Document experiment measurements

The native adapter files and checks named below for the AppKit and terminal
apps are on the local `experiments` branch. These records are kept as history.
The Bend core, laws, proofs, and core checks named below are on the `bend-core`
branch. After v1.0.9, the app has no Bend code and CI has no Bend jobs.

## Inactive positive-point comparator

Two instrumented forty-key diagnostic runs retain exact source and Undo. Original
comparison accepts seven keys, rejects key eight because completeDocument finds
an incomplete published Markdown body, then has thirty-two no-index edits.
Paired comparison accepts all forty keys. The observer forwards the actual
updateIndex call and callback; it never replays an update. Post-clock metadata
uses the transaction's published states and distinguishes mounted completeness
from outer-tree length. Input timing from these different routes establishes
no stable gain. input-fallback-diagnosis.json and verify-fallback.mjs retain the
evidence. Production keeps its complete-body guard.

The first standalone static-projection real-key batch uses original/paired/
paired/original order, forty ASCII insertions per run, and the same 1 MiB note
source. All 160 inputs have visible current text, no unexpected edits, and exact
edited/original source with terminal Undo history zero. Outer-tree sample
counts are 40/11/9/3. Key-to-rAF p95 values are 24.8/132.8/102.9/172.8 ms. Three
runs lose the indexed route; all full/partial samples remain in input-abba.json.
This mismatch prevents a stable comparison. The standalone view excludes main
app work. Clocks end before report/source/comparator metadata. No parser force
runs between keys. The inherited complete field checks outer tree length, not
mounted-body availability. Next record mounted completeness and investigate
route loss; do not adopt from this result.

With the paired comparator installed only on the browser test page, eighty
navigation and thirty-six edit/history checks retain exact geometry and source.
Each indexed candidate edit batch records 3,198 wrapper dispatch jumps and
792,130 skipped ranges, plus 7,200 geometry-preparation jumps and 1,783,090
skipped ranges. Its separate direct callback control retains two callbacks
with 398 jumps and 98,705 skipped ranges. These counts include navigation and
history actions; they are not counts for one keystroke or speed measurements.
The final corrected nine-check smoke restores the original method. Two partial
construction controls and eleven unit failure-path checks pass. The archive's
`verify-static-layout.mjs --paired` checks these records. Production and installed
packages stay unchanged. Resource, input/frame, memory, and native gates stay open.

The static projection has eighty Chrome navigation controls and thirty-six
local-edit/history controls at 400- and 240-pixel editor widths. Mixed text/note
and 1 MiB fixtures run full/full and full/static in both construction orders.
Every accepted check has complete bodies, exact source, equal shared line boxes,
and zero content-height, scroll-height, scroll-position, and relative-caret
difference. The edit controls also retain equal selection and computed font
properties. The Unicode edit remains indexed after readiness in both candidate
runs. Undo restores exact original BOM/mixed endings and history zero; Redo
restores the one edit. Source/Live geometry agrees. Tree publication precedes
the geometry samples. The first edit run lacked equal scroll actions and used
partial trees, so it is rejected. The browser comparator is unchanged. These
are static-projection layout controls, not key/frame, Open, memory, resource,
native input, or performance results. Raw records and a strict verifier are
in the point-comparison archive.

The later static-preview snapshot uses actual local index updates. Four growing
1 MiB note edits keep a single combined point layer and record 1,595 paired jumps
and 395,144 skipped ranges. Every edit matches the independent complete preview
builder. These counts come from state checks, not input or elapsed-time clocks.
Notes still rebuild completely. Combined and split sets duplicate retained
ranges; memory is unmeasured. Browser geometry must pass before timing this route.

The later paired candidate retains the final common positive point and moves
both cursors together. ESM and strict factory copies each pass 3,496 exact
callback streams, with 5,397 jumps and 1,324,988 skipped ranges. The actual
1 MiB note preview projection records 398 jumps and 98,704 skipped ranges,
retaining the same two callbacks. The resource projection has nine callbacks
and no jumps. This uses complete-oracle reconstruction outside clocks. An
unbounded filter control clones all chunks and has no jumps. Per-region filter
bounds retain chunk identity. No bounded app update, latency gain, layout,
native input, or frame result follows from this check. Raw paired logs and
loader failures remain in the point-comparison archive.

The point-comparison archive records state 6.7.6 and its source SHA-256.
In-memory copies leave packages and production unchanged. A naive positive-chunk
skip changes three callback streams under shared point suppression. A single-layer
guard passes an initial 3,240 spaced checks, then fails nine of 3,456 checks when
touching zero points are included. Exact streams retain old point context that
the guard removes. This candidate is rejected without speed or browser trials.
The static point-first projection separately passes selection-boundary, span,
external-order, and exact-source checks. Its representative height input is
single-layer, but that does not fix the comparator. No latency gain is claimed.

## Inactive viewport hidden-mark prototype

The later height-controls.json batch rejects this omission prototype. Forty
checks compare full/full and full/viewport in both construction orders. Each
uses at least eight rAF samples, four equal transitions within 0.05 pixels, and
a 1,200 ms deadline. All settle with complete mounted Markdown bodies, exact
original source, history zero, equal shared rendered line rectangles, and no
semantic differences. Full/full height and caret deltas are zero. Full/viewport
content-height delta reaches 2,514.953125 pixels; DOM scroll-height delta reaches
2,515 pixels. Destination caret delta is at most 0.625 pixels. The 505-pixel
maximum belongs to an off-screen owner after width change, not a destination.
Read-only view 6.43.13 map summaries show different collapsed content and gaps
with equal oracle metrics. The experiment README gives the method and limits.
Further input and memory trials of this candidate stop; static production
replacements remain. No input or native-frame speed gain follows from this batch.

The prototype at tests/performance/experiments/viewport-marks retains static
widget, block, and multiline replacements. A persistent separate set holds
same-line empty replacements. The view queries complete visible lines after
global owner selection and suppression. Local edits partition only rebuilt
regions, including changed neighbours. Current-position notes rebuild separately.
Combined and split sets both remain; extra retained memory is unmeasured.
Selection changes can partition the full set. No bounded selection claim is made.

Hidden-first precedence is required. Static-first loses enclosing strong marks
at nested hidden delimiters. Public span records and actual view facets with
external marks verify the corrected order. Six focused checks preserve full
semantic comparison, selection boundaries, resource fallbacks, exact source,
Unicode history, and Source mode. The complete batch passes 559 web checks and
eight Node checks. Production imports none of the prototype.

Ten Chrome layout checks at 400- and 240-pixel writing widths show identical
shared rendered line text and height. Unicode and Enter produce exact expected
source; Source-mode Undo restores the BOM and mixed endings with history zero.
Redo restores edited source. Later scroll checks retain visible destination
carets and equal shared lines, but total estimated heights differ by up to
22,060.8 pixels and relative caret placement differs by up to 436.8 pixels.
This is a material scroll-stability limit. A first probe of unrendered line
estimates is explicitly rejected as DOM-height evidence.

An untraced 1 MiB note input pair at 580029b uses forty real x keys per route.
Both terminal exact edited-source/original-source checks and forty Undo calls
pass with no unexpected updates or input failures. Layout-observation median /
p95 / maximum is 79.8 / 238.9 / 455.8 ms for production and
77.7 / 92.3 / 669.6 ms for the inactive candidate. Published outer-tree length
matches the source in five baseline and one candidate samples; this does not
prove mounted-body completeness. Indexed/full plans are 4/36 and 0/40.
The candidate has a slower worst sample, and differing parser routes prevent a
stable speed claim. The initial candidate attempt reset during pending Undo and
is rejected. Its separate repeated run kept files unchanged until the terminal
result was saved. The exact temporary integration patch is retained; main and
input fixture imports are restored exactly. The experiment README links all
raw observations and defines the limits. The later control rejects this prototype.
Native IME, screen frames, and the product speed targets remain open.

## Parser and height-comparison input traces

An inactive settled-state inventory at 86dea41 now identifies the point ranges
in the exact 1 MiB note fixture. It contains 83,213 same-line empty replacements:
16,643 heading marks, 33,286 strong delimiters, and 33,284 code delimiters.
It also has 16,643 zero-length line decorations, 33,285 non-point ranges, one
reference widget, and one definition widget. A local word insertion retains
these counts and an indexed complete-tree plan. The height comparator reports
only the two shifted note widgets as different. Its callbacks report differences;
they do not count equal ranges visited or prove where comparison time is spent.

The 228-byte resource fixture retains separate math, image, list-marker, table,
Mermaid, HTML, reference, and definition widgets. Its hidden delimiters include
an emphasis owner that crosses a line break; each delimiter itself is same-line.
A future viewport route must therefore retain complete owner selection rules,
including owners outside the viewport. Same-line range bounds alone are not
sufficient. No decoration is moved or omitted by this inventory.

Reproduce with MARKDEW_POINT_INVENTORY=1 and Vitest on
tests/performance/preview-point-inventory.test.ts. point-inventory.log retains
both records. The opt-in check uses a fixed Date clock only to publish the
edited complete tree, then restores it before comparison. It checks the exact
source record. It creates no view and makes no input, layout, Undo, or speed
claim. Production imports none of this code. Type checking and the inventory
check pass. The next step is an inactive viewport prototype with layout checks.

Two temporary traces at 1980c10 use the same 1 MiB note document, Chrome on
Apple M4, Vite development mode, and twenty separate x keys each. Every sampled
tree is complete, every preview plan is indexed, and each sample retains one
definition and one reference. Both terminal checks confirm exact edited source,
exact original source after twenty Undo operations, and zero remaining history.
There are no input failures or unexpected updates. The terminal tree can be
partial after Undo; completeSamples describes the input samples, not that tree.

parser-view-phases.json and parser-view-compare.json retain the raw observations
in tests/performance/experiments/browser-input. Their corresponding hooks.patch
files retain the exact temporary source and fixture changes, including the
differential parser checks. Those eight affected checks and type checking pass.
Production and the fixture are restored exactly. The first attempt lost its
browser connection and the tab reset. parser-view-reset.json marks that attempt
rejected; it supplies no accepted source, Undo, or timing evidence. A separate
recovered run reached the terminal source/Undo result before its tab closed.

The first accepted trace measures parser core median / p95 at 21.9 / 24.5 ms,
Markdown with nested parsing at 36.7 / 43.2 ms, and the complete document parser
at 36.9 / 43.5 ms. View-state work is 52.5 / 64.1 ms, plugins are 0.2 / 0.6 ms,
and document-view work is 2.9 / 3.9 ms. Key-to-layout observation is
109.7 / 160.6 ms. These nested intervals must not be added together.

The second trace also wraps public RangeSet.compare without changing its
receiver, arguments, callbacks, return value, or errors. The height-comparison
route uses minPointSize 0 and reaches 47.5 / 51.5 ms. View-state work is
51.8 / 55.7 ms. Default comparisons use -1 and total 0.4 / 0.7 ms per key;
document-view work is 2.7 / 3.6 ms. Parser core is 21.2 / 25.7 ms, Markdown with
nested parsing is 34.7 / 42.2 ms, and document parsing is 34.9 / 42.5 ms.
Key-to-layout observation is 103.5 / 135.2 ms. Each per-key phase aggregates
active intervals and call counts; its first-to-last span is not active time.
Deferred work is recorded separately. Undo runs outside the input intervals.

Installed CodeMirror view 6.43.13 calls RangeSet.compare with 0 to find
height-relevant decoration changes. Its comparator includes positive-length
point ranges. Installed state 6.7.6 excludes chunks with positive maxPoint
from shared-chunk skipping. Empty source-mark replacements are such ranges.
This explains a route to repeated comparison, but it does not identify which
range types account for the cost. The next experiment must inspect those ranges
before it changes their placement. The upstream parser and all preview features
remain intact. Instrumented development clocks do not prove stable latency,
paint, native input, the 16 ms frame target, or the 150 ms Open target.

## Deferred language parsing inside the footnote interval

Two temporary browser traces at 5e68fb5 use the original 1 MiB note document
and twenty separate x keys each. All forty samples publish complete trees and
use indexed preview plans. Each has one note definition and one reference.
Both terminal source checks pass exact edited source and twenty Undo operations,
with zero remaining history, no overlapping input, and no unexpected updates.
trace-local-index.json and trace-footnote-index.json retain every sample in
tests/performance/experiments/browser-input. local-hooks.patch and
footnote-hooks.patch contain their exact temporary hooks. Type checking passes
for each hook set. Production and the fixture are restored exactly afterward.

The first trace measures local preview median / p95 at 1.1 / 2.2 ms.
The indexed update is 1.0 / 2.1 ms; local collection is 0.1 / 0.2 ms,
and local decoration and note overlay each have 0.1 ms p95. The inclusive
footnote interval remains 39.8 / 50.7 ms. State realization is 41.6 / 54.7 ms,
while view update is 60.0 / 68.1 ms. Key-to-layout observation is
117.8 / 131.0 ms. Intervals are nested; do not add their medians or p95 values.

The second trace separates the footnote interval. Reading transaction.state is
below the clock's resolution. Reading syntaxTree(state) and the current body
boundary is 39.8 / 51.4 ms. The guard loop is 0.1 / 0.2 ms; definition mapping
is 0.1 / 0.2 ms; persistent text-range mapping is 0.2 / 0.3 ms.
Total footnote update is 40.1 / 55.1 ms, local preview is 1.3 / 2.4 ms,
state realization is 42.6 / 59.3 ms, and view update is 56.3 / 59.7 ms.
Key-to-layout observation is 110.9 / 127.4 ms. Each named hook runs once per
sample. Raw intervals retain inclusive start/end clocks and call counts.

Installed CodeMirror code explains the deferred work: syntaxTree reads the
language state field. LanguageState.apply runs the current parse context with
a 20 ms work budget, checked after parser advance returns. The boundary clock
therefore includes language parsing; it is not a footnote-array clock. Removing
that read could move parsing to a later caller without reducing total cost.
The next diagnosis must profile upstream parsing and view update separately.
These development-mode Chrome hooks identify boundaries, not CPU attribution,
paint, native frame latency, or a stable speed gain. No parser change is adopted.

## Persistent footnote text ranges

At 715d973, temporary browser boundary hooks measured real note-document input.
The accepted twenty-key trace passed exact edited source and terminal Undo.
Only one sampled published tree was complete. Inclusive footnote update
median / p95 was 32.0 / 50.7 ms; preview was 25.2 / 60.3 ms. These nested
intervals cannot be added as independent costs. Instrumentation and partial
trees prevent a complete-document latency claim. The exact diagnostic patch
is boundary-hooks.patch; trace-retained.json retains the accepted observations.
trace-retained-rejected.json is explicitly rejected: its tab closed while
checked.checking was true. It supplies no successful source/Undo evidence.
All files are in tests/performance/experiments/browser-input.

Production now maps guarded plain-text spans through a private CodeMirror
RangeSet. A local guard queries its current span without reading the complete
public array. The public array is lazy after mapping and remains available to
independent fresh-parser comparisons. Inline-code anchors retain relative
offsets because accepted changes cannot alter the anchor or separate it from
the text start. Structural and neighbor guards remain in place.

One uninstrumented sequential baseline/candidate pair uses the unchanged
1 MiB note fixture, forty separate x keys, Chrome on Apple M4, and Vite
development mode. All eighty sampled trees are complete; each batch passes
exact source and forty Undo operations, with no input failures or unexpected
updates. Key-to-layout-observation median / p95 / maximum is
125.7 / 142.5 / 178.1 ms for the baseline and 115.3 / 132.6 / 173.8 ms for
the candidate. All samples remain in range-baseline.json and range-candidate.json.
Production diagnostic hooks were absent from both runs.

Architect review moved lazy-model creation into a separate helper. Its closure
cannot share the guard's prior-state or transaction context. The final-code
repeat in range-candidate-final.json passes forty more real keys and exact
source/Undo; every sampled tree is complete and every edit plan is indexed.
Layout-observation median / p95 / maximum is 120.9 / 143.6 / 198.3 ms.
Setup dispatch/readiness is 543.6 / 890.6 ms. This repeat does not improve on
baseline p95. Retain it with the first pair; no stable total-speed gain is shown.
The full suite passed 553 web and eight Node checks before this scope-only
change. After it, all 71 affected checks, build, and Bend proof pass.

The fixture also records initial synthetic document dispatch and full setup
readiness. Baseline dispatch/readiness is 526.4 / 872.6 ms; candidate is
533.4 / 874.1 ms. Readiness includes dispatch, parser completion, index and
view work, and scheduled setup. It excludes native file Open and does not
measure a readable screen frame. RangeSet construction adds initial work and
retained memory; memory was not measured here. One timing pair does not prove
a stable gain. The 16 ms native frame and 150 ms Open targets remain open.

## Note index after cursor movement

Production now retains a note-aware full plan's ordinary index on selection
changes. Ordinary selection groups update only that layer. Current note widgets
are then joined for display. Wide selections also rebuild only the ordinary
layer. Indexed plans still have no old absolute item array; their later cursor
move uses full current collection before retaining a new index.

The original 1 MiB note fixture, with motion=1, accepts real ArrowRight and
ArrowLeft before forty separate x keys. Both moves retain the index and return
the cursor from position 33 to 34 and back. Every key uses an indexed plan and
publishes a complete tree. Exact source and forty Undo checks pass. The first
key reaches its layout observation in 175.1 ms. All-key median / p95 / maximum
is 132.8 / 158.9 / 192.7 ms. The two cursor observations take 96.2 and 122.4 ms.
These are separate event clocks, not a summed cursor-plus-key frame time.
No input overlaps or unexpected document updates occur. Raw results are in
tests/performance/experiments/browser-input/selection-note.json.

This removes the first full edit plan in this route. It does not establish a
stable latency gain: earlier untraced medians varied from 23.0 to 132.4 ms,
and this run remains slow. Chrome development-mode rAF/geometry observations
prove neither paint nor native frame speed. Further work must locate the cost
that remains in real input, with the retained index enabled.

## Adjacent plain paragraph and note definition

The opt-in trace=1 browser fixture wraps the actual dispatch and view-update
methods. Dispatch is inclusive; state realization and view work are inside it,
not additional times to add. Explicit transaction.state access moves lazy work
before the original view update. These diagnostic clocks do not provide direct
latency comparisons with the untraced runs. Original method binding and disposal
are retained. Twenty keys per route pass exact source and Undo checks.

At 2a2c59f, plain Live preview has 8.6 / 13.8 ms state-realization median / p95
and 5.2 / 6.6 ms view work. Note Live has 442.2 / 525.3 ms state work and
50.6 / 56.4 ms view work. All sampled trees are complete. The note route retains
no index and always builds full preview. Its final Paragraph spans
1048513–1048554, while the package note definition spans 1048540–1048554.
The complete paragraph has a plain prefix and one definition at its end.
That partial intersection rejects the original whole-document index.
trace-plain.json and trace-note.json retain the measurements and exact bounds.

Production now accepts this narrow boundary: one trailing definition in a
Paragraph, a nonempty complete prefix made only of letters, numbers, combining
marks, spaces, tabs, newlines, and . , ! ? punctuation, and the definition starts
on its own line and ends at the paragraph end. The prefix stays ordinary.
Changed note content, multiple definitions, Markdown/resource marks, other
intersections, incomplete trees, and uncertain local boundaries retain full
construction. Existing current note suppression applies after local analysis.

Two untraced forty-key batches use the original 1 MiB document unchanged.
Each has forty complete sampled trees, thirty-nine indexed plans and one first
full plan. Exact edited source and forty Undo operations pass in both batches.
Key-to-layout-observation median / p95 is 23.0 / 133.3 ms in the first and
132.4 / 175.8 ms in the second. Maxima are 144.7 and 637.1 ms. Neither batch
removes the first fallback. Raw data is candidate-note.json and
candidate-repeat.json in tests/performance/experiments/browser-input.
The index now applies to this legal layout, but large timing variation and the
first full rebuild remain. The 16 ms product frame target is not established.
These are development-mode Chrome observations, not native or paint timings.

## Browser input and layout observation

At bdded57, Chrome on an Apple M4, arm64, macOS 26.5.1 runs the actual app through
Vite 7.3.6 development mode. Each document has exactly 1,048,576 UTF-8 bytes,
a BOM, mixed line endings, headings, formatted paragraphs, and Japanese text.
The note variant adds one reference and one definition. Files is visible and
Outline is hidden. The parser completes during setup, outside the input clock.
The test then inserts forty individual x keys in the first visible paragraph.
Each key has its own DOM result check before the next key. Normal app features,
including the word-count worker, remain enabled. No concurrent build or test
runs during input. This is one sequential batch, not a stable release benchmark.

| Document / mode | Key to update median / p95 ms | Key to layout observation median / p95 ms | Complete trees / samples |
|---|---:|---:|---:|
| Plain / Live preview | 104.1 / 123.2 | 123.4 / 147.4 | 40 / 40 |
| Plain / Source | 47.8 / 62.3 | 53.8 / 67.3 | 40 / 40 |
| Note / Live preview | 70.8 / 462.9 | 88.8 / 481.4 | 4 / 40 |
| Note / Source | 57.5 / 70.5 | 65.3 / 79.9 | 40 / 40 |

The capture-phase keydown clock starts inside the page. A beforeinput clock is
also recorded. The update listener runs after the normal app listener. It does
not measure dispatch duration or isolate state work. The next rAF callback
records its entry, then reads cursor and scroll-area geometry. These values do
not prove paint, GPU presentation, native input, or the product frame target.
The fixture checks current input in the visible DOM. It writes its report after
the geometry timestamp; this work can still affect later scheduling. Browser
control latency before delivery of each key is excluded. No warm-up samples
are removed. Nearest-rank p95 uses sample 38 of forty sorted values.

All 160 keys retain the expected exact source record. Forty Undo operations per
route restore the original BOM and mixed endings with empty history. No measured
input overlaps or unexpected document updates occur. Plain Live preview uses
forty indexed plans. Note Live preview uses forty full plans and mostly partial
published trees. Its timing is actual observed input work, not complete-document
rendering evidence. Source mode is a comparison, not the final writing target.
One Undo-check click times out while its synchronous batch completes; the next
DOM read confirms all checks passed. The final fixture yields between Undo
operations and disables controls and direct input during its check. This check
changes no history record. Undo is outside the measured interval.

The first rejected run omitted the BOM in its expected-source offset. It is not
in the accepted data. The corrected fixture is tests/browser/input-frame.html;
raw samples are in tests/performance/experiments/browser-input/observations.json.
Open it with notes=1 and/or source=1 to select the other routes. Start input
samples, type single keys, then Check source and Undo. Reload for a new batch.
Two repeat routes use the final fixture. Note Source falls to 12.6 / 15.6 ms
median / p95 at the geometry observation, with forty complete trees. Note Live
reaches 505.0 / 560.4 ms, with a 1635.5 ms maximum and forty complete trees;
all its plans are full. Both repeat routes pass exact source and Undo checks.
Their raw samples are confirmation.json and repeat-note.json in the same folder.
This large variation prevents a stable baseline claim. Full preview can remain
slow even with a complete published tree. These results do not isolate its cause.
The final forty-key note Live fixture check also passes exact source and all
forty asynchronous Undo operations without a control timeout. Its layout median
is 126.1 ms, p95 is 779.8 ms, and maximum is 917.5 ms, with forty complete trees
and full plans. fixture-check.json retains this further observation. The three
Live note batches therefore do not establish a stable timing distribution.
The next performance task must separate state, view, and parser fallback work
in real input. Lower isolated state times alone cannot establish responsiveness.

## Production note index

Baseline a8d193f; macOS arm64, Node 22.23.2, jsdom. Four isolated sequential
growth runs pass 960 exact-source and full-decoration checks with complete
published trees. At 1 MiB, note-bearing medians fall from 51.503–93.056 ms to
16.137–17.943 ms. Production uses nineteen indexed updates and one full fallback.
Local updates visit at most four blocks and rebuild at most eight ordinary
ranges, plus all current note widgets. Note work scales with count and content.
Plain medians are 11.333–12.136 ms in baseline and 12.108–12.415 ms in production:
a small adverse difference in this batch. First note-bearing edits are
67.758–255.484 ms in baseline and 108.874–117.354 ms in production. Some first
fallbacks get slower. Production note-bearing p95 is 22.717–89.257 ms.
Logs, completeness counters, failed setup batches, and the validated summary
are in tests/performance/experiments/note-production. The clock excludes outline,
oracle, DOM, native input, and screen frames. It does not prove the frame target.
Four additional code/HTML runs pass 1600 source/display comparisons through full
fallback. Some published trees are partial. resources.json records those counts;
these clocks support no complete-document speed claim. A separate production
test checks complete decorations after explicit tree settlement.

## Inactive note-aware preview index

Baseline 936a2b7; macOS arm64, Node 22.23.2, jsdom. Four sequential growth runs
pass all 960 exact-source and complete-decoration comparisons. All published
trees are complete. Note-bearing routes use nineteen local previews and one
full fallback in the candidate, compared with twenty full previews in baseline.
At 1 MiB, baseline medians range from 49.803 to 89.766 ms; candidate medians
range from 15.890 to 21.689 ms. Local note-bearing edits visit at most four
blocks and rebuild at most eight ordinary ranges, plus the complete note
overlay. Note work scales with note count and content. First fallbacks get
slower: end-route first samples are 67.480 / 62.192 ms in baseline and
129.624 / 115.947 ms in candidate. Plain candidate cases can also regress.
The prototype stays inactive. The production integration above retains the
existing plain path and avoids duplicate full decoration construction. The complete
twelve-route table, four logs, counters, and summary script are in
tests/performance/experiments/note-index. Clocks exclude outline, oracle, DOM,
native input, and screen frames. They do not establish the 16 ms frame target.

## Note-bearing preview CPU cost

At e66f36f, sixty profiled 1 MiB note-bearing growth edits pass exact-source
and full-decoration comparisons. All published trees are complete; all preview
plans are full. Preview collection plus decoration construction take about
69–74% of CPU samples with state-update ancestry. Footnote-model work takes
about 3–6%; mapped models get new identities. These are sampled CPU proportions,
not elapsed edit times. The inspector stops before each oracle. Unattached GC
is reported separately. Raw samples, scripts, route counts, and limits are in
tests/performance/experiments/note-profile. Production stays unchanged. The
next candidate must reduce full preview work and retain global note semantics.

## Footnote marker absence

Baseline 816515e; macOS arm64, Node 22.23.2, jsdom. Four isolated growth runs
check 960 edits with exact source and complete decorations. All published trees
are complete. Plain 1 MiB medians are 14.288–14.857 ms in the two baselines and
11.854–13.437 ms in the two candidates. Each edit now checks only new text and
its two edges when a complete-body scan has certified no literal `[^` marker.
Tail times vary and exceed 16 ms. Note-bearing bodies retain the parse path;
their timing variation does not establish a direct gain from the certificate.
State clocks exclude DOM, native input, and screen frames. The full twelve-route
table, measurement scope, and four raw logs are in
tests/performance/experiments/footnote-absence. Native frame performance, open
time, and memory remain unverified.

## Guarded footnote code content

Baseline ea992ab; macOS arm64, Node 22.23.2, jsdom. One baseline process and
one candidate process ran in sequence, with no other project test or build
running during their clocks. Each size has twenty equal-length Z / 中 edits
inside an unknown-language fence, plus headings, ordinary text, and a note.
The update clock includes the app language and footnote field. It excludes
source history, preview, DOM, native input, and frames. Fresh full-model parsing
has its own clock outside the update. All eighty full-model comparisons pass
across the two processes.

| Base text size | Baseline median / p95 ms | Candidate median / p95 ms |
|---|---:|---:|
| 100 KiB | 94.933 / 113.450 | 2.213 / 7.738 |
| 1 MiB | 1123.509 / 1204.229 | 25.869 / 35.279 |

Both processes publish complete trees and CodeText coverage for all samples;
all metadata body boundaries are zero. Baseline reuses no model; candidate
reuses all twenty per size. Fresh full-body parsing still costs roughly one
second at 1 MiB. The accepted path retains only code ranges outside definitions.
Structural edits and uncertain coverage keep fresh parsing. This pair supports
the bounded reuse change, but proves neither repeated tail stability nor the
16 ms product target. Raw logs are in experiments/footnote-code under
tests/performance. The optional check is MARKDEW_FOOTNOTE_CODE=1 with
tests/performance/footnote-code.test.ts.

The app-parser growing code batch also passes all 400 exact-source and fresh
decoration checks across twenty routes. It uses the same composite resource
fixture as the earlier resource baseline. Note-bearing code edits now measure:

| Base size | Edit | Median / p95 ms | Complete published trees | CodeText coverage |
|---|---|---:|---:|---:|
| 100 KiB | first code | 8.672 / 13.722 | 20 / 20 | 20 / 20 |
| 100 KiB | last code | 4.648 / 5.662 | 20 / 20 | 20 / 20 |
| 1 MiB | first code | 112.597 / 153.141 | 20 / 20 | 20 / 20 |
| 1 MiB | last code | 63.044 / 121.995 | 7 / 20 | 20 / 20 |

All body boundaries are zero. Complete means published tree length equals
current document length. The fresh decoration oracle still uses that published
tree, so the last large route does not prove complete-preview latency. Local
CodeText coverage can remain valid in a partial tree. This is one candidate
batch, not a paired tail-stability claim. The full preview clock includes source
history and dirty comparison but excludes outline, DOM, and native frames.
Raw preview.log retains all routes, samples, lengths, and boundaries.

## Resource edits and guard cost

Baseline 006439e; Mac16,10, macOS arm64, Node 22.23.2, jsdom, one worker.
Two resource batches compare the app parser with the inactive nesting guard.
Each batch runs baseline first, candidate first, candidate repeat, baseline
repeat. Each process has twenty routes: two base sizes, with/without a note,
and five edit locations (prose start/middle/end, first/last resource content).
Each route has twenty growing Z / 中 edits. All 3,200 exact-source and fresh
decoration comparisons pass across eight processes. Every resource edit uses
the full preview path. No samples are removed. No project tests or builds run
during timing; other apps remain open.

Each document has composite resource groups before, within, and after its
prose. Code includes loaded JavaScript, unknown fences, indented code, and
list/quote fences. HTML includes inline tags, comments, blocks, and list/quote
tags. JavaScript loads before setup in both configurations. The base sizes
are 100 KiB and 1 MiB; code groups add 558 ASCII units and HTML groups add 399.
Every log records actual initial units and resource/edit placement. Setup,
outline, oracle, DOM, native input, and frames are outside the clock. First
edits, full fallback, nesting, and dirty comparison remain inside it.

The complete forty-route table is resource-summary.json under
tests/performance/experiments/nested-parsing/. Its script verifies matching
fixture labels, sizes, route counts, and parser labels across all four runs.
All raw logs remain beside it. The following note-bearing resource edits expose
the main remaining cost. Values are median / p95 ms.

| Resource | Base size | Edit | Baseline first | Guard first | Guard repeat | Baseline repeat |
|---|---|---|---:|---:|---:|---:|
| code | 100 KiB | first | 88.448 / 122.068 | 88.320 / 128.125 | 95.516 / 116.310 | 92.999 / 121.124 |
| code | 100 KiB | last | 84.644 / 108.402 | 91.893 / 133.178 | 89.820 / 124.384 | 89.406 / 116.054 |
| code | 1 MiB | first | 1055.945 / 1358.600 | 1017.195 / 1245.621 | 1099.229 / 1320.608 | 1002.762 / 1189.617 |
| code | 1 MiB | last | 1151.089 / 1390.914 | 1046.111 / 1221.405 | 1042.481 / 1255.759 | 1046.184 / 1251.076 |
| HTML | 100 KiB | first | 7.618 / 12.199 | 7.547 / 11.632 | 7.412 / 13.237 | 7.238 / 13.018 |
| HTML | 100 KiB | last | 4.941 / 5.260 | 5.039 / 8.624 | 4.936 / 10.748 | 5.165 / 7.437 |
| HTML | 1 MiB | first | 5.834 / 101.106 | 105.387 / 127.553 | 101.129 / 127.490 | 101.636 / 136.036 |
| HTML | 1 MiB | last | 5.564 / 91.650 | 57.606 / 68.667 | 3.910 / 7.656 | 60.042 / 91.468 |

These clocks do not record published-tree completeness. The decoration oracle
uses the published tree; agreement does not prove a complete tree. Fast large
resource routes must therefore not be called complete-preview latency results.
The next diagnosis must record published Markdown bounds and metadata body
boundaries as separate facts. Code-content edits with notes have roughly
one-second medians in both configurations. The footnote field currently uses
a full upstream body parse for these edits. Isolate its cost before choosing
a production change; the total clock does not attribute all latency to it.

A separate guard-only probe supplies already completed base trees and an inert
nested wrapper. It measures structural decisions with counters and timer cost,
not base or nested parsing. Initial scans have empty caches. Twenty later
growing edits use incrementally parsed trees, built outside the clock. At
1 MiB, no-resource first scan is 6.374 ms; cached median / p95 is 2.033 / 4.899.
Code-at-end is 5.913 ms first, then 2.053 / 7.963; HTML-at-end is 6.145 ms first,
then 1.917 / 8.026. Each cached scan visits about 8,556–8,558 new objects and
reuses about 33,287–33,289. This is not bounded local work. Resource-at-start
scans visit only six new objects. Raw values include all ten size/placement
cases and all samples in guard-cost-and-service-assertion.log. Small rounded
probe values are not precision guarantees or native frame times.

Six guard checks now compare indentation, language data, completion results,
and accepted completion text/selection, as well as prior tree/stop checks.
The combined cost/service run passed the cost probe but failed a service test
assertion: it compared object identity after the result changed from text to
text plus selection. The corrected deep comparison passes; its separate log
is retained. The guard remains inactive. Prioritize the code/footnote edit
cost and published-tree diagnosis. No native latency or general resource gain
is established by this batch.

## Nested parsing diagnosis and inactive guard

Baseline 5856424; Mac16,10, macOS arm64, Node 22.23.2, jsdom, one worker.
The base diagnostic omits nested parsing while retaining the same Markdown
grammar and support. It removes nested trees and language services, so it is
not a product configuration. The guard candidate instead retains the package
parseCode wrapper whenever any structural code/HTML target exists, or when
the parse is partial, stopped, or has uncertain bounds. Only complete,
unstopped full-input trees with no target can skip that pass. Weak keys cache
structural presence and do not depend on mounted properties.

Both batches have two sequential timing pairs. No project builds or tests run
during a timing process; other apps remain open. Each run has twenty growing
Z / 中 edits per route, with no removed samples. All 960 source and complete
decoration checks pass per batch, outside the clock. Every run accepts 115
indexed and 125 full edits. Parser setup is excluded; first edits and fallback
construction are included. The clock covers state transactions and dirty
comparison, not outline, oracle, DOM, native input, frames, or memory. Oracle
work can affect later GC. Values are median / p95 ms.

| Size | Note | Position | Direct first | Base first | Base repeat | Direct repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 1.961 / 3.929 | 1.325 / 4.847 | 1.152 / 4.449 | 1.720 / 3.725 |
| 100 KiB | no | middle | 1.805 / 3.360 | 1.185 / 1.435 | 1.113 / 1.314 | 1.439 / 1.665 |
| 100 KiB | no | end | 1.568 / 2.107 | 1.133 / 1.590 | 1.074 / 1.875 | 1.340 / 1.526 |
| 100 KiB | yes | start | 7.428 / 21.990 | 7.351 / 19.922 | 6.784 / 16.676 | 6.975 / 9.573 |
| 100 KiB | yes | middle | 5.640 / 11.264 | 4.990 / 7.078 | 5.032 / 5.401 | 5.345 / 10.742 |
| 100 KiB | yes | end | 4.496 / 5.007 | 4.195 / 8.236 | 4.072 / 7.389 | 4.256 / 4.483 |
| 1 MiB | no | start | 18.616 / 36.943 | 14.430 / 16.338 | 14.552 / 16.199 | 17.751 / 33.940 |
| 1 MiB | no | middle | 18.289 / 40.267 | 15.121 / 17.599 | 14.456 / 27.193 | 17.440 / 19.208 |
| 1 MiB | no | end | 18.454 / 49.730 | 14.649 / 38.651 | 14.044 / 43.283 | 17.446 / 45.270 |
| 1 MiB | yes | start | 91.633 / 200.908 | 89.889 / 115.394 | 86.804 / 222.397 | 90.548 / 127.940 |
| 1 MiB | yes | middle | 71.105 / 101.932 | 68.549 / 90.578 | 65.965 / 96.285 | 68.314 / 102.172 |
| 1 MiB | yes | end | 51.940 / 69.080 | 49.091 / 72.381 | 48.971 / 72.241 | 51.012 / 69.750 |

The guarded candidate keeps the real YAML wrapper. Its order is baseline first,
candidate first, candidate repeat, baseline repeat. The expanded five guard
checks run between pairs. They are separate from timing.

| Size | Note | Position | Baseline first | Guard first | Guard repeat | Baseline repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 1.551 / 8.649 | 1.695 / 5.086 | 2.032 / 5.864 | 1.922 / 6.171 |
| 100 KiB | no | middle | 1.578 / 2.410 | 1.715 / 3.124 | 1.779 / 2.660 | 1.924 / 2.963 |
| 100 KiB | no | end | 1.549 / 3.239 | 1.841 / 4.094 | 1.686 / 2.260 | 1.892 / 2.559 |
| 100 KiB | yes | start | 7.727 / 23.977 | 10.226 / 24.440 | 8.749 / 16.681 | 10.525 / 20.313 |
| 100 KiB | yes | middle | 5.536 / 7.055 | 5.505 / 8.177 | 6.073 / 8.758 | 6.607 / 9.038 |
| 100 KiB | yes | end | 4.473 / 4.668 | 4.448 / 5.341 | 4.988 / 8.911 | 5.306 / 7.399 |
| 1 MiB | no | start | 13.935 / 51.864 | 12.132 / 44.190 | 12.182 / 30.219 | 15.557 / 43.721 |
| 1 MiB | no | middle | 14.061 / 29.625 | 12.811 / 35.787 | 12.097 / 28.099 | 15.358 / 32.121 |
| 1 MiB | no | end | 14.345 / 32.821 | 12.415 / 49.235 | 11.825 / 53.821 | 15.505 / 30.770 |
| 1 MiB | yes | start | 92.882 / 255.242 | 89.685 / 146.399 | 95.110 / 158.177 | 109.886 / 228.752 |
| 1 MiB | yes | middle | 78.732 / 126.533 | 68.418 / 117.523 | 77.193 / 151.453 | 70.695 / 205.549 |
| 1 MiB | yes | end | 54.291 / 73.094 | 48.581 / 96.161 | 62.728 / 96.891 | 50.224 / 75.585 |

The base diagnostic supports tracing nested-pass work. Cross-configuration
checks show equal Markdown block trees and complete preview decorations on
small feature fixtures and exact large timing fixtures; nested trees and
language data are intentionally different in the base route. Its first large
check exceeded the five-second test limit. The corrected check passes with
batched assertions and a 120-second test limit, without an app parser change.

The guard candidate passes mounted-tree and language-data comparisons for
first-resource transitions, loaded and unknown code languages, lazy Python
loading followed by an edit, structural cache reuse, all five targets in
synthetic TreeBuffers, stopped/partial ranges, and resumed trees. These do not prove all
completion services, native rendering, or memory bounds. Guard medians improve
on plain 1 MiB routes, but end-route p95 is worse in both pairs and note results
include regressions. Keep it inactive until resource-bearing performance and
guard cost are measured. No native 16 ms claim is made. Complete raw records,
the inactive candidate, and commands are in
tests/performance/experiments/nested-parsing/.

## Parser wrapper comparison

HEAD 834c5cf, Mac16,10, macOS arm64, Node 22.23.2, jsdom, one worker.
A separate CPU profile uses a named helper for plain growing state updates.
Language parsing accounts for 64.2% of its 1,365.583 sampled ms. Full preview
fallback has 19.6%, footnote model 8.73%, local index 5.16%, source record 1.14%,
and other state work 1.16%. These categories use call ancestry, with priority
in script order. They exclude setup, note-route updates, fresh oracles, dirty
comparison, DOM, and unattached GC. They do not isolate YAML wrapper cost.

The unprofiled comparison changes only the YAML wrapper. Both use identical
Markdown base, code language data, keymap setting, source/history, and preview.
Order: wrapper first, direct first, direct repeat, wrapper repeat. No project
tests or builds run during timing. Other apps remain open. All 960 source and
complete-decoration checks pass. Every run accepts 115 indexed edits and 125
full edits. Twenty growing Z / 中 edits per route include first/fallback samples.
The clock includes state update and dirty comparison, but excludes setup,
outline, oracle, DOM, native input, frames, and memory. Values are median / p95 ms.

| Size | Footnote | Position | Wrapper first | Direct first | Direct repeat | Wrapper repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 2.964 / 9.406 | 3.450 / 10.437 | 1.866 / 3.968 | 3.365 / 7.996 |
| 100 KiB | no | middle | 2.800 / 5.721 | 2.987 / 4.203 | 1.495 / 1.777 | 2.449 / 5.230 |
| 100 KiB | no | end | 2.001 / 2.813 | 2.931 / 4.091 | 1.557 / 1.937 | 2.627 / 3.868 |
| 100 KiB | yes | start | 7.706 / 18.703 | 13.108 / 27.239 | 7.571 / 11.236 | 17.543 / 28.209 |
| 100 KiB | yes | middle | 5.771 / 9.347 | 8.849 / 12.439 | 5.580 / 9.975 | 14.121 / 15.549 |
| 100 KiB | yes | end | 4.615 / 4.941 | 6.358 / 10.980 | 4.590 / 5.294 | 11.762 / 14.384 |
| 1 MiB | no | start | 18.554 / 26.912 | 18.437 / 32.454 | 19.685 / 68.165 | 25.803 / 37.987 |
| 1 MiB | no | middle | 20.772 / 44.951 | 26.667 / 51.631 | 19.839 / 34.814 | 24.384 / 50.859 |
| 1 MiB | no | end | 15.933 / 57.503 | 23.843 / 66.665 | 20.080 / 43.018 | 23.721 / 84.372 |
| 1 MiB | yes | start | 125.587 / 264.218 | 127.162 / 250.074 | 176.983 / 287.849 | 153.340 / 243.190 |
| 1 MiB | yes | middle | 87.665 / 123.916 | 99.449 / 130.823 | 119.375 / 283.197 | 77.861 / 100.510 |
| 1 MiB | yes | end | 50.390 / 87.220 | 73.586 / 98.993 | 86.641 / 163.585 | 58.329 / 79.456 |

Decision: retain the production YAML wrapper. These sequential results vary
widely and show no consistent direct-parser gain. They do not prove that direct
Markdown is always slower, or that the wrapper has no cost. Metadata-free
heading, later horizontal rule, setext heading, table, code, Mermaid, math,
footnote, container, and HTML fixtures have equal package body trees and complete
decorations. These checks do not cover opening metadata or native rendering.
The direct route stays an inactive benchmark option. No dispatch parser is added.
Raw profiles, all timing samples, and reproduction notes are under
tests/performance/experiments/index-profile/. The next diagnosis must isolate
work shared by both package configurations. The native 16 ms target stays open.

## Production local block index

Baseline: 637a8f3. Mac16,10, Node 22.23.2, macOS arm64, jsdom, one Vitest
worker thread. All 960 exact-source and complete-decoration comparisons pass
across two baseline runs and two corrected candidate runs. Each route has
twenty growing Z / 中 edits. No sample is removed. Parser setup is outside
the clock; the first edit is included without a separate edit warm-up.

The order is baseline first, a superseded candidate with excess eligibility
traversal, corrected candidate, corrected repeat, and baseline repeat. Tests
and corrections ran between timing processes. No project tests or builds ran
during timing; other apps stayed open. These are exploratory sequential
comparisons. The fresh oracle is outside the clock and can affect later GC.
Values below are median / p95 in ms.

| Initial size | Footnote | Position | Baseline first | Candidate first | Candidate repeat | Baseline repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 7.001 / 17.835 | 1.837 / 5.069 | 1.844 / 4.388 | 6.282 / 14.019 |
| 100 KiB | no | middle | 5.899 / 10.993 | 1.565 / 2.553 | 1.483 / 2.357 | 5.002 / 9.819 |
| 100 KiB | no | end | 4.466 / 4.970 | 1.351 / 1.562 | 1.345 / 1.611 | 3.477 / 3.742 |
| 100 KiB | yes | start | 8.128 / 19.028 | 7.058 / 15.799 | 7.068 / 14.775 | 6.746 / 16.445 |
| 100 KiB | yes | middle | 7.020 / 12.616 | 5.264 / 11.185 | 5.022 / 6.582 | 5.366 / 8.599 |
| 100 KiB | yes | end | 4.644 / 5.768 | 4.354 / 4.618 | 4.153 / 8.545 | 3.974 / 4.261 |
| 1 MiB | no | start | 87.771 / 220.360 | 15.131 / 36.326 | 14.763 / 28.924 | 76.707 / 158.463 |
| 1 MiB | no | middle | 65.790 / 93.142 | 14.802 / 16.294 | 14.947 / 17.030 | 56.654 / 82.959 |
| 1 MiB | no | end | 42.988 / 92.761 | 15.034 / 40.282 | 14.893 / 40.319 | 39.507 / 60.147 |
| 1 MiB | yes | start | 100.118 / 145.969 | 99.933 / 189.148 | 90.002 / 125.333 | 83.622 / 148.700 |
| 1 MiB | yes | middle | 72.883 / 99.387 | 76.604 / 104.031 | 68.172 / 102.707 | 64.048 / 138.862 |
| 1 MiB | yes | end | 51.035 / 75.831 | 59.225 / 78.009 | 51.428 / 96.175 | 47.221 / 63.704 |

Keep the bounded path for plain paragraphs and headings. Most eligible edits
now map the persistent index and decorations and rebuild only a local region.
Each corrected run accepts 19 / 19 / 20 edits in the plain 100 KiB start /
middle / end routes, and 19 / 19 / 19 in the plain 1 MiB routes. The remaining
plain edits and all 120 footnote edits use the full path. The first 1 MiB full
fallback samples in the first corrected run are 87.347 / 79.315 / 82.385 ms.
They stay in the totals and raw records. All fallback construction costs are
inside that clock.

Separate settled-document index construction has median / p95 of
1.643 / 2.315 ms at 100 KiB, and 23.243 / 24.361 ms at 1 MiB. Rejected
footnote eligibility has median / p95 0.002 / 0.002 ms at both sizes and stops
at the first unsupported block. These probe timings exclude parsing, source,
decoration construction, DOM, and native frames. Rounded probe values are
not a high-precision latency guarantee. The adverse footnote edit comparisons
remain evidence; no footnote gain or explanation of their full difference is
claimed.

The growth clock excludes outline, DOM, native input, screen frames, and memory.
Plain 1 MiB medians near 15 ms do not meet the p95 target. General edits,
resources, notes, and partial published trees still use the full path. Complete
index construction also adds open/fallback work. Raw runs, superseded and failed
records, and reproduction instructions are in
tests/performance/experiments/local-production/. Native acceptance, first-frame
speed, memory, and the 16 ms product target remain open.

## Suppression without replacements

Production now skips the suppression filter when no replacement widget exists.
The fresh reference keeps the full filter. All 960 exact-source and complete
decoration checks pass over four runs. The order is baseline, candidate,
candidate, baseline. Each route has twenty edits. No samples are removed.
Computer: Mac16,10, Node 22.23.2, macOS arm64, jsdom, one Vitest worker thread.
No concurrent project build or test runs during timing; other apps stay open.
Parser setup is outside the clock. The first edit is included, without a
separate edit warm-up. Reference checks can affect later garbage collection.

Values below are median / p95 in ms. B means baseline; C means candidate.

| Initial size | Footnote | Position | B first | C first | C repeat | B repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 6.311 / 13.575 | 6.064 / 13.270 | 6.130 / 15.034 | 6.282 / 13.672 |
| 100 KiB | no | middle | 5.143 / 9.692 | 5.084 / 12.283 | 4.986 / 9.201 | 5.068 / 9.716 |
| 100 KiB | no | end | 3.510 / 4.054 | 2.944 / 3.896 | 3.105 / 3.565 | 3.144 / 4.038 |
| 100 KiB | yes | start | 6.485 / 15.753 | 6.617 / 16.466 | 6.702 / 15.779 | 6.567 / 16.583 |
| 100 KiB | yes | middle | 5.283 / 9.441 | 5.418 / 9.467 | 5.535 / 9.980 | 5.334 / 9.250 |
| 100 KiB | yes | end | 3.958 / 4.382 | 4.021 / 4.328 | 4.040 / 4.548 | 4.128 / 4.766 |
| 1 MiB | no | start | 76.696 / 170.776 | 77.050 / 153.334 | 74.048 / 157.087 | 76.999 / 185.074 |
| 1 MiB | no | middle | 57.289 / 94.633 | 56.780 / 78.551 | 55.581 / 137.896 | 58.965 / 86.668 |
| 1 MiB | no | end | 40.838 / 61.485 | 38.893 / 62.664 | 38.457 / 79.689 | 41.792 / 55.401 |
| 1 MiB | yes | start | 97.359 / 258.239 | 82.868 / 111.714 | 83.791 / 116.569 | 84.537 / 144.654 |
| 1 MiB | yes | middle | 77.765 / 108.776 | 63.901 / 146.632 | 63.714 / 85.188 | 64.079 / 89.713 |
| 1 MiB | yes | end | 59.264 / 74.337 | 46.393 / 60.749 | 47.167 / 70.232 | 47.293 / 62.697 |

Most affected plain routes show small median reductions. p95 is mixed.
Footnote routes retain their existing suppression path and show run variation.
Retain this bounded removal of redundant work, without a tail-latency claim.
A separate instrumented run found plain 1 MiB suppression medians of
3.506 / 3.448 / 4.118 ms for start / middle / end. Per-block timer reads add
cost, so phase times do not prove total gains. Set sorting and assembly remain
combined. Raw runs, inactive instrumentation, calibration, and a summary script
are in tests/performance/experiments/preview-phases/. The clocks exclude outline,
DOM, native input, frames, and memory. The 16 ms product target remains unmet.

## Rejected shifted-range cache transfer

The a19e2c4 baseline and a bounded range-cache transfer candidate ran twenty
growing word edits per route on Mac16,10, Node 22.23.2, macOS arm64, with jsdom
and one Vitest worker thread. All 240 source and full-decoration checks pass
per run. The CPU profile ran separately from the timing runs. No samples were
removed. Setup and parser settling are outside the clock; the existing check
includes its first edit and has no separate edit warm-up. Baseline ran before
candidate. No concurrent project build or test ran during timing; other apps
remained open. This is one exploratory sequential pair, not causal evidence.

| Initial size | Footnote | Position | Baseline median / p95, ms | Candidate median / p95, ms |
|---|---|---|---:|---:|
| 100 KiB | no | start | 6.399 / 14.001 | 8.073 / 16.404 |
| 100 KiB | no | middle | 5.184 / 9.894 | 6.115 / 11.543 |
| 100 KiB | no | end | 3.598 / 3.989 | 3.852 / 4.442 |
| 100 KiB | yes | start | 6.446 / 14.439 | 8.237 / 16.159 |
| 100 KiB | yes | middle | 5.289 / 10.740 | 6.133 / 6.571 |
| 100 KiB | yes | end | 3.883 / 4.282 | 4.369 / 6.967 |
| 1 MiB | no | start | 76.205 / 166.679 | 99.501 / 192.290 |
| 1 MiB | no | middle | 58.412 / 140.206 | 73.086 / 100.613 |
| 1 MiB | no | end | 42.049 / 56.449 | 47.095 / 66.175 |
| 1 MiB | yes | start | 82.882 / 188.981 | 104.810 / 137.280 |
| 1 MiB | yes | middle | 64.604 / 133.556 | 77.264 / 145.312 |
| 1 MiB | yes | end | 46.513 / 61.973 | 51.340 / 74.904 |

Every candidate median is worse. Reject the candidate and retain production
preview.ts unchanged. CPU sample ancestry within preview state-field updates
attributes 56.64% to decoration construction and 41.23% to cached collection.
Direct oracle calls, initialization, and unattached GC are outside that
attribution. The timing clock covers state updates and dirty comparison, not
outline, oracle checks, DOM, native input, frames, or memory. Raw samples,
inactive patch, profile summary, and reproduction details are retained under
tests/performance/experiments/shifted-ranges/. The later phase diagnostic is
reported above; set sorting and assembly remain one combined stage.
The 16 ms product target remains unmet.

## Rejected edit-decoration groups

Baseline `6bc4cec` and an inactive group-mapping prototype ran the same growing
word-edit check on Node 22.22.3, macOS arm64, with jsdom. Each route has twenty
successive insertions, alternating Z and 中. Exact source and every decoration
match the fresh reference after all 240 edits per build. No sample is removed.
The clock covers state update and dirty comparison, excluding outline, reference
checks, DOM, native input, and screen frames. These are one sequential pair,
candidate first, without concurrent project builds or tests. Reference checks
outside the clock can affect later garbage collection. This is exploratory
evidence; it does not establish a causal gain. Initial documents are ASCII;
their byte count grows during edits.

| Initial size | Footnote | Position | Control median / p95, ms | Candidate median / p95, ms |
|---|---|---|---:|---:|
| 100 KiB | no | start | 6.453 / 20.307 | 6.463 / 20.607 |
| 100 KiB | no | middle | 4.966 / 9.974 | 4.970 / 8.474 |
| 100 KiB | no | end | 3.350 / 4.376 | 3.167 / 3.946 |
| 100 KiB | yes | start | 6.733 / 9.095 | 6.899 / 12.630 |
| 100 KiB | yes | middle | 5.464 / 11.201 | 5.144 / 6.062 |
| 100 KiB | yes | end | 3.371 / 3.809 | 4.060 / 9.941 |
| 1 MiB | no | start | 82.142 / 200.119 | 77.993 / 101.003 |
| 1 MiB | no | middle | 60.363 / 88.488 | 58.512 / 78.690 |
| 1 MiB | no | end | 42.339 / 45.909 | 39.515 / 63.632 |
| 1 MiB | yes | start | 88.967 / 128.521 | 87.938 / 234.719 |
| 1 MiB | yes | middle | 67.653 / 207.658 | 66.860 / 86.114 |
| 1 MiB | yes | end | 46.861 / 51.475 | 46.712 / 66.803 |

Decision: reject the prototype. Median gains are small and slow-edit results
are mixed or worse. Faster standalone mapping does not establish faster total
editing. Production preview source is restored to the baseline. The candidate,
raw logs, and failed intermediate results are retained in
`tests/performance/experiments/preview-groups/`. The growing-edit check remains
available through `npm run benchmark:growth`. Full source/decorations checks
cover split, merge, Unicode, multiple changes, shifted widget coordinates,
incomplete syntax, and exact Undo/Redo. Native frame and 16 ms gates remain open.

## Temporary physical-line snapshots for cached preview collection

Baseline 2f74b62 and the changed tree use sequential runs of
`npm run benchmark:preview` and `npm run benchmark:web` on Mac16,10 with
Node 22.22.3 arm64 and jsdom. Each row has 20 samples. No samples are removed.
No project build or other test runs during timing; other apps remain open.
Inputs are ASCII, exactly 102,400 and 1,048,576 UTF-16 units and bytes.
Snapshot creation is inside the collection clock. State totals include dirty
comparison and outline collection. These clocks omit DOM, native input, IPC,
layout, screen frames, and memory.

| Size | Preview stage | Before median / p95, ms | After median / p95, ms |
|---|---|---:|---:|
| 100 KiB | collection | 3.305 / 7.895 | 3.351 / 6.214 |
| 100 KiB | cachedCollection | 1.334 / 2.942 | 0.789 / 2.091 |
| 100 KiB | decoration | 1.399 / 2.409 | 1.363 / 2.843 |
| 100 KiB | reusedDecoration | 1.397 / 2.415 | 1.316 / 3.396 |
| 100 KiB | selection | 0.123 / 0.400 | 0.119 / 0.403 |
| 1 MiB | collection | 37.579 / 39.857 | 37.299 / 39.494 |
| 1 MiB | cachedCollection | 18.631 / 19.197 | 9.865 / 10.699 |
| 1 MiB | decoration | 25.381 / 27.871 | 24.477 / 26.491 |
| 1 MiB | reusedDecoration | 14.541 / 15.092 | 14.538 / 15.052 |
| 1 MiB | selection | 0.181 / 0.493 | 0.192 / 0.394 |

| Size | State route / position | Before median / p95, ms | After median / p95, ms |
|---|---|---:|---:|
| 100 KiB | source-record / start | 0.056 / 0.242 | 0.053 / 0.227 |
| 100 KiB | source-record / middle | 0.024 / 0.045 | 0.025 / 0.038 |
| 100 KiB | source-record / end | 0.020 / 0.023 | 0.020 / 0.043 |
| 100 KiB | source-mode / start | 1.663 / 3.859 | 1.651 / 8.274 |
| 100 KiB | source-mode / middle | 1.592 / 3.638 | 1.632 / 2.309 |
| 100 KiB | source-mode / end | 1.522 / 2.406 | 1.536 / 1.757 |
| 100 KiB | live-preview / start | 4.768 / 7.775 | 3.882 / 5.411 |
| 100 KiB | live-preview / middle | 4.537 / 6.026 | 3.848 / 4.439 |
| 100 KiB | live-preview / end | 4.342 / 4.841 | 3.805 / 4.737 |
| 100 KiB | live-preview-note / start | 4.575 / 9.434 | 3.962 / 8.222 |
| 100 KiB | live-preview-note / middle | 84.041 / 124.020 | 84.607 / 116.009 |
| 100 KiB | live-preview-note / end | 83.380 / 101.531 | 83.042 / 104.904 |
| 1 MiB | source-record / start | 0.118 / 0.184 | 0.117 / 0.160 |
| 1 MiB | source-record / middle | 0.123 / 0.526 | 0.128 / 0.150 |
| 1 MiB | source-record / end | 0.129 / 0.158 | 0.133 / 0.161 |
| 1 MiB | source-mode / start | 17.898 / 19.493 | 18.720 / 20.244 |
| 1 MiB | source-mode / middle | 18.006 / 20.288 | 18.907 / 20.769 |
| 1 MiB | source-mode / end | 17.908 / 19.049 | 19.026 / 20.683 |
| 1 MiB | live-preview / start | 51.164 / 54.742 | 42.388 / 45.248 |
| 1 MiB | live-preview / middle | 52.094 / 56.085 | 42.680 / 45.835 |
| 1 MiB | live-preview / end | 51.822 / 53.466 | 42.524 / 46.608 |
| 1 MiB | live-preview-note / start | 76.425 / 77.802 | 65.957 / 67.258 |
| 1 MiB | live-preview-note / middle | 78.218 / 79.174 | 69.286 / 73.356 |
| 1 MiB | live-preview-note / end | 80.006 / 82.052 | 70.392 / 73.406 |

The final version uses the snapshot only in cached collection. Decoration
construction reads the active table-cell field once per call and keeps
CodeMirror line lookup. Selection groups also keep CodeMirror line lookup.
The initial experiment added snapshots to these paths; its 1 MiB reused
decoration median / p95 was 14.627 / 28.077 ms, with no clear gain. Its
records remain at `/tmp/markdew-preview-pipeline-after.log` and
`/tmp/markdew-preview-lines-state-after.log`.

The final preview records, including minima and maxima, are in
`/tmp/markdew-preview-pipeline-before.log` and
`/tmp/markdew-preview-pipeline-final.log`. The final 1 MiB full collection
maximum is 83.172 ms; its selection maximum is 34.780 ms. Complete state
records and all stage distributions are in
`/tmp/markdew-preview-lines-state-before.log` and
`/tmp/markdew-preview-lines-state-final.log`. Higher p95 values for some
source-mode and note routes remain part of the evidence. This is not a uniform
responsiveness guarantee. Cache entries obtain bounded envelope text through
document slicing; the complete temporary snapshot stays local to collection.
Each call still creates its snapshot, enumerates all top-level blocks, and
assembles the complete decoration set. The 16 ms native frame target remains
unmet; region parsing and memory acceptance remain open.

## Source-offset indexes and outline leaf pruning

Baseline d52329e and the changed tree use the same staged editor benchmark.
Run `npm run benchmark:web` on the Mac16,10 reference computer with Node
22.22.3 arm64 and jsdom. Runs are sequential, with no project build or test
during timing. Other apps remain open. There are 20 equal-length replacements
per route. No samples are removed. Source checks and event-loop yields stay off
clock. The clock covers state updates, dirty comparison, and outline collection;
it excludes DOM, native input, IPC, drawing, screen frames, and memory.
The ASCII input lengths are exactly 102,400 and 1,048,576 UTF-16 units and bytes.

| Size | Route / position | Before median / p95, ms | After median / p95, ms |
|---|---|---:|---:|
| 100 KiB | source-record / start | 0.048 / 0.242 | 0.042 / 0.233 |
| 100 KiB | source-record / middle | 0.232 / 0.271 | 0.023 / 0.041 |
| 100 KiB | source-record / end | 0.452 / 0.548 | 0.019 / 0.025 |
| 100 KiB | source-mode / start | 2.639 / 11.226 | 1.655 / 5.772 |
| 100 KiB | source-mode / middle | 2.148 / 3.632 | 1.679 / 2.932 |
| 100 KiB | source-mode / end | 2.338 / 2.776 | 1.646 / 2.371 |
| 100 KiB | live-preview / start | 5.317 / 6.972 | 4.450 / 7.203 |
| 100 KiB | live-preview / middle | 4.943 / 5.403 | 4.466 / 5.480 |
| 100 KiB | live-preview / end | 5.176 / 7.191 | 4.423 / 4.693 |
| 100 KiB | live-preview-note / start | 5.089 / 8.284 | 4.373 / 9.440 |
| 100 KiB | live-preview-note / middle | 89.231 / 114.218 | 84.281 / 120.309 |
| 100 KiB | live-preview-note / end | 86.376 / 111.057 | 82.533 / 105.521 |
| 1 MiB | source-record / start | 0.089 / 0.153 | 0.122 / 0.143 |
| 1 MiB | source-record / middle | 2.283 / 2.703 | 0.125 / 0.555 |
| 1 MiB | source-record / end | 4.501 / 4.967 | 0.133 / 0.167 |
| 1 MiB | source-mode / start | 21.749 / 26.751 | 18.027 / 21.662 |
| 1 MiB | source-mode / middle | 24.088 / 27.326 | 18.362 / 19.727 |
| 1 MiB | source-mode / end | 25.619 / 27.233 | 18.261 / 20.700 |
| 1 MiB | live-preview / start | 56.196 / 61.499 | 51.152 / 54.494 |
| 1 MiB | live-preview / middle | 57.659 / 63.732 | 52.300 / 56.465 |
| 1 MiB | live-preview / end | 60.770 / 71.877 | 51.522 / 54.683 |
| 1 MiB | live-preview-note / start | 80.335 / 84.274 | 57.010 / 59.378 |
| 1 MiB | live-preview-note / middle | 84.652 / 90.481 | 59.496 / 62.525 |
| 1 MiB | live-preview-note / end | 89.011 / 93.212 | 56.734 / 58.934 |

For the 1 MiB end edit, the median stage measurements are:

| Route | Update before / after, ms | Dirty before / after, ms | Outline before / after, ms |
|---|---:|---:|---:|
| source-record | 4.393 / 0.029 | 0.102 / 0.104 | 0.000 / 0.000 |
| source-mode | 14.918 / 11.377 | 0.112 / 0.115 | 10.550 / 6.732 |
| live-preview | 48.915 / 44.703 | 0.133 / 0.120 | 11.657 / 6.733 |
| live-preview-note | 72.036 / 49.403 | 0.168 / 0.119 | 16.505 / 7.155 |

Stage medians and p95 values do not add to the total distribution. The complete
raw stage records, including maxima, are in `/tmp/markdew-stages-before.log`
and `/tmp/markdew-stages-after-final.log`. The final after run includes the
no-LF guard for bare-CR source. An earlier after run before that guard is retained
at `/tmp/markdew-stages-after.log`; its 1 MiB note/middle p95 was 95.089 ms.
This variation and the slower 100 KiB fallback p95 values remain part of the
evidence. The comparison is not a uniform responsiveness guarantee.

`npm run benchmark:offsets` separates new-record index construction plus one
lookup from a batch of 1000 cached queries, and from one original offset walk.
Each row has 20 samples on the same computer. Input sizes below are raw UTF-16
units; CRLF normalization reduces the logical length. All fixtures are ASCII.
Positions are near the end. Source checks and yields are outside each clock.
There is no editor, history, DOM, native input, or screen frame in this batch.

| Raw size | Endings | New index + lookup median / p95, ms | 1000 cached queries median / p95, ms | One legacy query median / p95, ms |
|---|---|---:|---:|---:|
| 100 Ki | LF | 0.002583 / 0.008083 | 0.020562 / 0.071959 | 0.263917 / 0.266791 |
| 100 Ki | CR | 0.002395 / 0.003583 | 0.021062 / 0.026334 | 0.229124 / 0.246375 |
| 100 Ki | CRLF | 0.197145 / 0.318500 | 0.031688 / 0.054292 | 0.192750 / 0.228792 |
| 100 Ki | mixed | 0.268083 / 0.320166 | 0.028271 / 0.044708 | 0.281584 / 0.331000 |
| 1 Mi | LF | 0.018250 / 0.019750 | 0.019604 / 0.022625 | 1.941020 / 2.361125 |
| 1 Mi | CR | 0.019729 / 0.026208 | 0.020063 / 0.020875 | 2.680167 / 2.865834 |
| 1 Mi | CRLF | 1.979063 / 2.637125 | 0.034437 / 0.037333 | 2.208000 / 2.228292 |
| 1 Mi | mixed | 2.931604 / 3.479959 | 0.024959 / 0.033500 | 2.869042 / 3.067875 |

Raw offset records are in `/tmp/markdew-source-offsets-final.log`. The earlier
run without the no-LF guard is retained at `/tmp/markdew-source-offsets.log`.
It had a 1 Mi bare-CR index median of 1.522312 ms. Building a new dense CRLF or
mixed index still takes a full scan and can cost about as much as one old query.
Weak indexes live as long as their source records, including records retained
by history. Their memory cost is not measured here. Complete document editing,
full-parser fallbacks, preview work, and the 16 ms native-frame target remain open.

## Text edits directly after inline code

The baseline is a27ef48. The changed tree adds the upstream code-boundary
guard described in ROADMAP.md. Run `npm run benchmark:web` on the same Mac16,10
reference computer, Node 22.22.3 arm64 in jsdom. These before and after runs
were sequential; no project build or test ran during either batch. Other apps
remained open. This is one paired comparison, not a controlled native-input run.

All 20 samples per route remain in the statistics. They replace one UTF-16
unit with Z or Q. The clock includes editor-state transactions, exact-source
dirty comparison, and outline collection. Syntax settles before timing. Source
checks and event-loop yields are off clock. DOM, native input, IPC, layout,
screen frames, and memory are excluded. The ASCII fixtures have exactly
102,400 or 1,048,576 UTF-16 units and UTF-8 bytes.

| Size | Route / position | Before median / p95, ms | After median / p95, ms |
|---|---|---:|---:|
| 100 KiB | source-record / start | 0.053 / 0.291 | 0.055 / 0.244 |
| 100 KiB | source-record / middle | 0.239 / 0.257 | 0.234 / 0.290 |
| 100 KiB | source-record / end | 0.448 / 0.454 | 0.518 / 0.960 |
| 100 KiB | source-mode / start | 2.052 / 9.336 | 2.429 / 5.633 |
| 100 KiB | source-mode / middle | 2.170 / 3.056 | 2.164 / 2.911 |
| 100 KiB | source-mode / end | 2.317 / 2.600 | 2.290 / 2.596 |
| 100 KiB | live-preview / start | 5.048 / 6.545 | 4.946 / 5.871 |
| 100 KiB | live-preview / middle | 5.109 / 5.346 | 4.984 / 5.340 |
| 100 KiB | live-preview / end | 5.330 / 6.147 | 5.177 / 5.787 |
| 100 KiB | live-preview-note / start | 5.055 / 7.190 | 5.397 / 7.386 |
| 100 KiB | live-preview-note / middle | 83.986 / 124.658 | 86.504 / 116.501 |
| 100 KiB | live-preview-note / end | 85.494 / 106.573 | 84.964 / 123.658 |
| 1 MiB | source-record / start | 0.099 / 0.216 | 0.100 / 0.142 |
| 1 MiB | source-record / middle | 2.291 / 2.604 | 2.297 / 2.693 |
| 1 MiB | source-record / end | 4.502 / 4.996 | 4.481 / 4.942 |
| 1 MiB | source-mode / start | 24.196 / 29.376 | 22.044 / 26.182 |
| 1 MiB | source-mode / middle | 26.399 / 28.457 | 24.068 / 25.658 |
| 1 MiB | source-mode / end | 28.535 / 29.104 | 25.847 / 27.468 |
| 1 MiB | live-preview / start | 60.615 / 64.707 | 55.406 / 57.790 |
| 1 MiB | live-preview / middle | 62.362 / 63.633 | 59.466 / 61.869 |
| 1 MiB | live-preview / end | 66.642 / 69.689 | 60.451 / 61.962 |
| 1 MiB | live-preview-note / start | 75.551 / 78.800 | 60.477 / 65.440 |
| 1 MiB | live-preview-note / middle | 1020.539 / 1081.828 | 60.362 / 62.430 |
| 1 MiB | live-preview-note / end | 80.106 / 82.493 | 62.668 / 63.760 |

The 1 MiB note/middle edit replaces the comma directly after inline code.
It now reuses the footnote model. Its p95 drops from 1081.828 to 62.430 ms.
Other routes also vary between runs; these incidental changes do not establish
a general speed improvement. The 100 KiB note/middle and note/end positions
still fall back to full parsing. Unequal-length edits have differential and
source-history checks, but this timing batch measures equal-length edits only.
Full batch durations were 36.58 and 16.23 seconds. Raw logs, with minimum and
maximum values, remain at `/tmp/markdew-code-boundary-before.log` and
`/tmp/markdew-code-boundary-after.log`. The 16 ms native-frame target is unmet.
Broader region parsing, preview construction, and platform measurements remain
required.

## Ordinary word-start footnote reuse

Measured on 2026-10-05 local time on the same Mac16,10 reference computer below,
Node 22.22.3 arm64 in jsdom. Run `npm run benchmark:web`. The baseline is
77aa9ba; the changed tree adds the guarded prose update described in ROADMAP.md.
The before and after runs are sequential. No project build or test ran during
either batch; other applications remained open. This is one comparison, not a
repeated controlled native-input result.

Each row retains all 20 equal-length replacement samples, including maxima.
The clock includes state update, source dirty comparison, and outline collection.
Syntax settles before timing. Exact source checks and event-loop yields are off
clock. No DOM, native IPC, input, layout, screen frame, or memory is measured.
The ASCII fixtures have exactly 102,400 or 1,048,576 UTF-16 units and UTF-8 bytes.

| Size | Route / position | Before median / p95, ms | After median / p95, ms |
|---|---|---:|---:|
| 100 KiB | source-record / start | 0.049 / 0.239 | 0.065 / 0.233 |
| 100 KiB | source-record / middle | 0.233 / 0.294 | 0.239 / 0.329 |
| 100 KiB | source-record / end | 0.444 / 0.453 | 0.451 / 0.480 |
| 100 KiB | source-mode / start | 2.266 / 10.068 | 2.564 / 6.443 |
| 100 KiB | source-mode / middle | 2.136 / 3.112 | 2.132 / 2.912 |
| 100 KiB | source-mode / end | 2.296 / 2.703 | 2.323 / 2.595 |
| 100 KiB | live-preview / start | 4.933 / 7.471 | 4.915 / 7.168 |
| 100 KiB | live-preview / middle | 5.068 / 5.520 | 5.176 / 5.992 |
| 100 KiB | live-preview / end | 5.350 / 5.756 | 5.319 / 5.649 |
| 100 KiB | live-preview-note / start | 5.384 / 7.817 | 5.285 / 7.557 |
| 100 KiB | live-preview-note / middle | 85.249 / 109.143 | 84.928 / 102.519 |
| 100 KiB | live-preview-note / end | 83.950 / 121.904 | 84.165 / 120.316 |
| 1 MiB | source-record / start | 0.097 / 0.163 | 0.092 / 0.133 |
| 1 MiB | source-record / middle | 2.291 / 2.690 | 2.285 / 2.555 |
| 1 MiB | source-record / end | 4.489 / 4.846 | 4.493 / 4.634 |
| 1 MiB | source-mode / start | 22.506 / 27.026 | 22.501 / 29.212 |
| 1 MiB | source-mode / middle | 24.319 / 24.607 | 24.664 / 26.048 |
| 1 MiB | source-mode / end | 26.001 / 29.113 | 26.726 / 28.425 |
| 1 MiB | live-preview / start | 55.234 / 60.536 | 56.848 / 62.606 |
| 1 MiB | live-preview / middle | 58.429 / 63.966 | 60.975 / 62.071 |
| 1 MiB | live-preview / end | 61.519 / 63.563 | 61.622 / 62.682 |
| 1 MiB | live-preview-note / start | 61.119 / 64.206 | 63.379 / 65.921 |
| 1 MiB | live-preview-note / middle | 969.668 / 1030.997 | 989.243 / 1048.714 |
| 1 MiB | live-preview-note / end | 969.725 / 1048.566 | 69.856 / 72.914 |

The 1 MiB end sample changes the first letter of `with` after `Paragraph `.
Its preceding space is inside the upstream text span, so the new guard reuses
the model. The middle sample changes the comma immediately after inline code;
its text-span boundary still uses the full parser. The 100 KiB fixture samples
different source characters and retains its measured fallback cost.
The before/after batch durations are 52.66 and 34.97 seconds. Summary logs are
`/tmp/markdew-state-before.log` and `/tmp/markdew-state-after.log`.
The 16 ms frame target remains unmet. Plain preview and full-parser fallback
still require substantial work. Unequal-length typing is covered by differential
correctness checks, but this timing batch measures only equal-length edits.

## Guarded prose separator batch

Run `npm run benchmark:prose`. The 2026-10-04 check uses the reference computer
below and Node 22.22.3 arm64 in jsdom. Source begins with `Alpha beta words[^n].`,
repeats the heading/paragraph fixture, and ends with one definition. Sizes are
exactly 102,400 and 1,048,576 UTF-16 units. Twenty equal-length replacements
alternate a space and tab between `Alpha` and `beta`. Syntax settles before timing.

One clock measures source-mode state transactions with source record, history,
language, and footnotes. Another clock measures a fresh upstream footnote parse
of the updated source. These are separate stages, not controlled before/after
transactions. Complete model equality, model reuse identity, exact-source checks,
and event-loop yields are off clock. No project build or test runs concurrently;
other apps remain open. All samples remain, including first-update maxima.

| UTF-16 size | State median/p95 | State maximum | Fresh parse median/p95 |
|---|---:|---:|---:|
| 100 Ki units | 1.696 / 5.339 ms | 6.488 ms | 78.640 / 113.294 ms |
| 1 Mi units | 11.635 / 14.301 ms | 16.474 ms | 903.195 / 935.554 ms |

The batch passes in 23.18 seconds. Eligible spaces and tabs now retain the
footnote model. Both complete word neighbors must remain unchanged. Digit pairs,
line breaks, Markdown delimiters, punctuation, and protected source retain full
parsing. The clocks exclude preview, outline, dirty comparison, DOM, native input,
composition events, memory, and screen frames. They do not prove the 16 ms target.

## Preview decoration reuse

The 2026-10-04 diagnostic uses the same computer and fixtures below. Each of 20
samples constructs fresh decorations, then constructs decorations from retained
immutable items with cached raw ranges. The default reference builder bypasses
the cache. Global replacement suppression and range sorting still run. Initial
state creation fills the item cache. Selection updates can change its entries.
The reported run has no concurrent project tests or builds; other apps remain
open. An earlier run alongside the test suite is excluded from these numbers.

| Size | Fresh construction median/p95 | Retained construction median/p95 |
|---|---:|---:|
| 100 KiB | 1.425 / 3.709 ms | 1.433 / 2.183 ms |
| 1 MiB | 25.669 / 26.674 ms | 15.354 / 15.982 ms |

The identity check confirms that a repeated construction with the same items
and display conditions creates no new decoration values. It does not measure
heap bytes. New or shifted items still construct new ranges and widgets. These
are diagnostic stage times, not edit or screen-frame times. The 16 ms product
target remains open.

The complete editor-state batch also passes exact-source checks in 55.10 seconds.
This separate run includes source transactions, dirty comparison, and outline
collection. Its 1 MiB results follow. Earlier block-cache numbers are separate
uncontrolled runs, so this is not a controlled before/after comparison.

| Route/location | Median/p95 |
|---|---:|
| Plain preview, start | 57.581 / 60.390 ms |
| Plain preview, middle | 60.234 / 61.855 ms |
| Plain preview, end | 62.629 / 64.031 ms |
| Footnote preview, start | 82.058 / 86.904 ms |
| Footnote preview, middle | 1029.297 / 1151.802 ms |
| Footnote preview, end | 1010.133 / 1081.696 ms |

Plain-preview results are lower than the earlier batch. Footnote results are
mixed and remain dominated by full-parser fallback. No DOM, native input,
composition, screen-frame, or idle-memory result is supplied by these clocks.

## Guarded Unicode footnote batch

Run `npm run benchmark:unicode`. The 2026-10-04 check uses the reference computer
below, Node 22.22.3 arm64, and jsdom. The source starts with `A原文Z words[^n].`,
then repeats the ASCII heading/paragraph fixture and ends with one definition.
Sizes are exactly 102,400 and 1,048,576 UTF-16 units. Initial UTF-8 byte counts
are 102,404 and 1,048,580. Twenty replacements rotate Chinese, kana, Hangul, and
one supplementary Han code point between the protected `A` and `Z`. Each
replacement has two UTF-16 units. Initial syntax is settled before timing.

One clock measures a source-mode state transaction with source record, history,
language parser, and footnote field. A separate clock measures fresh upstream
footnote parsing on that updated source. This is not a before/after transaction
comparison, and the two clocks must not be added. Model identity confirms cache
reuse. Complete fresh-model equality, exact source, and event-loop yields are
off clock. All samples remain, including first-update maxima. Other apps were open.

| UTF-16 size | State update median/p95 | State maximum | Fresh parse median/p95 |
|---|---:|---:|---:|
| 100 Ki units | 1.571 / 3.265 ms | 6.512 ms | 79.069 / 111.950 ms |
| 1 Mi units | 11.081 / 15.178 ms | 27.676 ms | 893.299 / 931.263 ms |

The batch passes in 22.97 seconds. It excludes live-preview collection and
decoration construction, outline work, dirty comparison, DOM, native input,
composition events, screen frames, and memory. It does not establish the 16 ms
product target or native IME acceptance. Punctuation, spaces, protected source,
entity text, reference-link labels, and rejected word guards retain full parsing.

## Preview block-cache batch

The 2026-10-04 block-cache comparison uses the same reference computer and
fixture as the batches below. The cache checks parser identity and an exact
physical-line envelope bounded to 65,536 UTF-16 units. Images and footnote
definition envelopes use fresh analysis. Shifted blocks map all item ranges.
Each edit still enumerates top-level blocks and constructs all decorations.

`npm run benchmark:preview` now clocks full and cached collection separately,
with the full call first in each of 20 samples. Initial state creation fills
the cache. Both calls use the same settled document. The 1 MiB full collection
median/p95 is 39.046/68.691 ms; warm cached collection is 18.523/19.276 ms.
Full decoration construction is 25.245/26.976 ms. For 100 KiB, full collection
is 3.475/6.423 ms and warm cached collection is 1.268/1.957 ms. These diagnostic
stages are not a sum or an edit-frame measurement. Unchanged-source cache timing
does not alone establish edit speed, so the complete edit batch also runs.

`npm run benchmark:web` passes all exact-source checks in 53.32 seconds.
The earlier application comparison below used the application at 21ba32c;
5f37843 changes only selection updates, which these edit transactions do not use.
These are separate uncontrolled runs, with other applications open.

| 1 MiB route/location | Earlier median/p95 | Block-cache median/p95 |
|---|---:|---:|
| Plain preview, start | 84.005 / 122.316 ms | 68.533 / 80.418 ms |
| Plain preview, middle | 86.062 / 112.361 ms | 71.420 / 93.247 ms |
| Plain preview, end | 88.371 / 134.479 ms | 74.498 / 100.578 ms |
| Footnote preview, start | 93.594 / 98.763 ms | 71.208 / 96.990 ms |
| Footnote preview, middle | 1006.938 / 1044.001 ms | 981.915 / 1020.749 ms |
| Footnote preview, end | 1022.872 / 1060.014 ms | 969.858 / 1033.636 ms |

Plain-preview setup including complete syntax settling is 234.894 ms for
1 MiB; the note route is 1081.418 ms. These are not readable first-frame times.
The measured edit routes remain above 16 ms before DOM or native frame work.
Full decoration construction and fallback footnote parsing remain large costs.
No idle-memory, native-input, or platform acceptance claim follows from this batch.

## Preview selection-state batch

Run `npm run benchmark:preview`. This optional check uses the same reference
computer, Node runtime, and ASCII fixtures as the editor-state batch below.
Each size has 20 collection calls, 20 full decoration constructions, and 20
selection-only transactions at evenly spaced positions. Initial syntax is
settled. Exact-source and unchanged-document checks and event-loop yields are
off clock. There is no EditorView, DOM layout, native input, or screen frame.
The collection and full-construction calls are separate diagnostic clocks;
their medians must not be added to claim a transaction time. Other apps were
running, and these are separate uncontrolled runs.

The baseline uses application 21ba32c with the diagnostic exports and test.
The comparison adds selection overlap groups and bounded decoration updates.
Each transaction retains all samples, including the first group-index build.

| Size | Baseline selection median/p95 | After selection median/p95 | After maximum |
|---|---:|---:|---:|
| 100 KiB | 1.535 / 2.392 ms | 0.120 / 0.444 ms | 2.621 ms |
| 1 MiB | 26.036 / 28.496 ms | 0.222 / 0.449 ms | 21.189 ms |

The first index build causes the 1 MiB maximum. Later selection updates reuse
the index. Source, parser, image-context, and table-cell changes discard it.
Both batches pass. Baseline 1 MiB collection median/p95 is 37.338/42.921 ms;
full decoration construction is 26.496/64.036 ms. Comparison collection is
37.573/44.943 ms; full construction is 24.781/26.219 ms. The change reduces
selection work, but collection still scans the complete tree after an edit.
Neither typing speed nor the 16 ms product frame target is established.

The new cross-platform npm runner also passes a separate verification run.
Selection median/p95 is 0.101/0.441 ms for 100 KiB and 0.195/0.439 ms for
1 MiB. The retained first-index maxima are 3.016 and 13.413 ms. These results
remain separate from the first comparison; no outlier or batch is removed.

## Desktop WebView editor-state batch

Measured on 2026-10-04 on Mac16,10, 32 GiB memory, 10 CPU cores, macOS 26.5.1,
Node.js 22.22.3, arm64. Run `npm run benchmark:web`. The runner uses Vitest and
jsdom with the current TypeScript modules. This is a development state benchmark,
not a production WebView or native input benchmark. Other apps were running.

ASCII fixtures repeat a heading, a paragraph with strong text and code, and blank
lines, trimmed to exactly 100 KiB or 1 MiB. The note route adds one reference and
one definition. Each location has 20 alternating single-character replacements.
The median averages samples 10 and 11; p95 is sample 19 after sorting. Initial
syntax parsing is settled before edit timing. Transaction construction, state
resolution, dirty comparison, and outline collection are on clock. Exact-source
checks and an event-loop yield are off clock. Rendering, DOM updates, native IPC,
disk effects, layout, screen delivery, and idle memory are not measured.

The baseline used the application at bdf3818. These comparison batches include
the guarded footnote cache and heading-label cache. They retain the same fixture
and locations. Hidden-outline deferral affects DOM work, which is off clock.

| 1 MiB route/location | Baseline median | Baseline p95 | After median | After p95 |
|---|---:|---:|---:|---:|
| Plain preview, start | 90.470 ms | 124.531 ms | 84.005 ms | 122.316 ms |
| Plain preview, middle | 90.166 ms | 123.397 ms | 86.062 ms | 112.361 ms |
| Plain preview, end | 94.266 ms | 122.591 ms | 88.371 ms | 134.479 ms |
| Footnote preview, start | 1042.977 ms | 1087.341 ms | 93.594 ms | 98.763 ms |
| Footnote preview, middle | 1049.479 ms | 1090.681 ms | 1006.938 ms | 1044.001 ms |
| Footnote preview, end | 1069.760 ms | 1114.412 ms | 1022.872 ms | 1060.014 ms |

Only the note start location meets the guarded word-interior rule. Middle and
end locations use full parsing. The 16 ms product target remains unmet, even
before DOM and native work. Initial note setup still takes about 1.15 seconds;
it includes complete syntax settling and does not measure a readable first frame.
Full preview traversal and fallback footnote parsing remain large costs.
Source-record end edits measured about 4.6 ms at p95.

The first batch used replacement characters that could match existing source;
it failed the dirty assertion. The next synchronous batch blocked the runner's
progress channel and ended with a transport error. Neither is a passing gate.
The recorded batches use distinct characters and yield between samples, and both
pass exact-source checks.

## Earlier Bend measurements

Measured on 2026-10-02. Reference system: Mac16,10, 32 GiB memory,
10 CPU cores, macOS 26.5.1, Bend 2.0.34, Apple clang 21.0.0.
Build: normal native Bend output. Runtime: default thread setting, no GPU calls.

Run `sh tests/bench.sh` to repeat the measurements. The fixture repeats an ASCII
heading, blank lines, and a paragraph with inline marks. It is trimmed to exactly
100 KiB or 1 MiB. For ASCII, scalar count equals UTF-8 byte count. Each fixture
has 20 samples. Times use the monotonic millisecond clock from `IO.now`.
The 95th percentile is the 19th value in the sorted set of 20 samples. The median
is the mean of the 10th and 11th values. These results use bounded reparsing and
the AVL document index. The tree has cached scalar lengths and block counts.
Its full build consumes the block list once without temporary tree lists.

| Operation | Size | Median | 95th percentile | Minimum | Maximum |
|---|---:|---:|---:|---:|---:|
| Full block parse and index build | 100 KiB | 9 ms | 10 ms | 8 ms | 10 ms |
| Edit near document start | 100 KiB | 0 ms | 1 ms | 0 ms | 1 ms |
| Edit in document middle | 100 KiB | 0 ms | 1 ms | 0 ms | 1 ms |
| Edit near document end | 100 KiB | 0 ms | 1 ms | 0 ms | 1 ms |
| Full block parse and index build | 1 MiB | 132.5 ms | 145 ms | 93 ms | 145 ms |
| Edit near document start | 1 MiB | 0 ms | 1 ms | 0 ms | 1 ms |
| Edit in document middle | 1 MiB | 0 ms | 1 ms | 0 ms | 1 ms |
| Edit near document end | 1 MiB | 0 ms | 1 ms | 0 ms | 1 ms |

The 100 KiB fixture has 6,503 blocks. Its start, middle, and end edits reparse
10, 52, and 15 scalars. The 1 MiB fixture has 66,577 blocks. Its edits reparse
10, 11, and five scalars. The edits replace the scalar at position two, halfway
through the document, or three positions before the document end.
Zero milliseconds means that the operation finished within the clock resolution.
The existing document is parsed before the edit clock starts. Block and source
counts are checked after each clock stops.

`/usr/bin/time -l` reported a maximum resident size of 86,704,128 bytes for the
complete run with both fixtures. This is process peak memory, not editor idle
memory. The run took 7.14 seconds including fixture creation and document checks.

The earlier linked-list model measured a 1 MiB middle edit at 13.5 ms median
and 17 ms at the 95th percentile. Its end edit measured 35 ms median and 39 ms
at the 95th percentile. Its full parse measured 111.5 ms median and 127 ms at
the 95th percentile. The index removes the prefix scan and path reconstruction
for edits, but it adds work to the full parse. These are separate process runs
on the same reference computer. Other applications were running; they are not
controlled machine-load measurements.

## Memory check

An early index version reached 849,543,168 bytes peak memory in the same
benchmark. Twenty full parses alone stayed near 81 MB, and twenty start edits
stayed near 90 MB. The right branch of source-position lookup captured a left
tree to read its cached count. Bend 2.0.34 generated a borrowed accessor call
without releasing that captured reference. Reading the count before creating
the branch closure removed that retained tree. The current benchmark peak is
about 87 MB.

Run `sh tests/memory.sh` for the regression gate. It builds a separate native
program and runs 20 cycles with a one-MiB fixture. Each cycle performs a full
parse and edits at the start, middle, and end. The script checks all 80 output
records and rejects process peak memory above 200 MiB. macOS uses `time -l`;
Linux uses GNU `time -v` and converts KiB to bytes. The local macOS batch passed.
The Linux path has not run locally. This gate detects the observed retained-tree
fault; it does not establish the 100 KiB editor idle-memory requirement.

These measurements cover the Bend document model. They do not include native
layout, rendering, input events, or a readable first frame. They do not prove
the 16 ms edit-frame target or the 150 ms readable-first-frame target. The full
source string and formatted scene still require linear work in the editor.
Bounded reparsing reuses a settled suffix. An open fence continues into following
blocks until its state permits reuse or the document ends. Native layout and
unchanged block-scene caching remain necessary measurements and implementation.

## Native document experiment

Run `sh tests/native_bench.sh` on macOS. It first measures core scene construction
and direct editing, then opens 100 KiB and 1 MiB fixtures in separate processes.
Each native process performs 20 direct insertions at the formatted document end.
Each insertion is checked against the exact Bend source, parsed document, native
attributes, and cursor. The native test forces viewport layout and drawing before
it stops the edit clock. It does not measure display scanout or GPU completion.
Open timing includes parsing, scene construction, native window setup, and a
one-millisecond timer wake. There is one open sample per process, not an open
percentile. The full-document scroll measurement forces layout, then checks that
glyph bounds at the end, middle, and start intersect the visible view.

The initial native experiment measured 100 KiB opening at 228.532 ms and one
edit at 305.386 ms. One 1 MiB opening measured 1065.972 ms, a full scroll/layout
check measured 826.944 ms, and one edit measured 5099.135 ms. These are single
samples from the adapter before cached style attributes and partial storage
updates were added. They are not percentile measurements.

With cached attributes, partial updates, and the initial-selection correction,
the local 100 KiB run measured opening at 181.226 ms. Its 20 edit frames ranged
from 76.183 to 157.239 ms. The 95th percentile was 134.467 ms. Native storage
notifications reported a one-character changed range for each edit. Full
scroll/layout took 74.213 ms before the edits and 0.242 ms after them. Resident
memory after the first drawing was 107,102,208 bytes. This is one resident-memory
sample at that point, not a steady idle-memory measurement.

A separate single 1 MiB core run measured scene construction, visible length,
and native-position conversion at 259 ms. Direct-state editing, including the
old scene and selection map, measured 415 ms. Both results exclude the native
host. These samples establish that scene and mapping work must be cached; they
do not establish the final frame budget. The native frame target remains unmet.

With the current-session scene cache and bounded position conversion, a new
100 KiB run measured opening at 176.523 ms. Its 20 edit frames ranged from
44.875 to 114.003 ms, with a 95th percentile of 90.478 ms. All edits passed the
source, document, native projection, and cursor checks. Native storage reported
one changed character per edit. First-drawing resident memory was 104,153,088
bytes; process peak memory was 176,472,064 bytes. Neither is steady idle memory.
Full scroll/layout took 75.857 ms before edits and 0.216 ms after edits.

The new single 1 MiB core run measured scene construction at 234 ms and direct
editing at 356 ms. The edit now reuses the old cached view and builds the new
view within the timed operation. The earlier 415 ms result built the old view
but did not build the new view within that operation. These core samples have
different scopes. Native frame timing retains the same scope across both runs.

The new 1 MiB native run also passed all 20 edits. Opening measured 593.111 ms,
and edit frames ranged from 611.418 to 2473.367 ms. The 95th percentile was
1893.107 ms. The first edit reported a changed native range of 915,425 UTF-16
units; the other 19 edits reported one unit each. The cause of that first large
range was checked in a separate diagnostic run. Full scroll/layout took 788.138 ms before
edits and 0.238 ms after edits. First-drawing resident memory was 254,377,984
bytes, and process peak memory was 902,905,856 bytes. This peak includes retained
edit history and does not by itself prove a memory leak. The frame and opening
targets remain unmet.

The diagnostic compares the Bend projection before and after each insertion.
The first insertion changes text at the start and end: the initial active
heading starts with `#`, then becomes inactive and starts with `H`. The native
adapter uses one replacement interval, which can include the unchanged middle.
The projection change also occurs with 100 KiB, but its first native update
removes two units at position zero and inserts zero units. The native input
already inserted the final character before Bend supplied the new projection.
The earlier zero range recorded only inserted text and missed this deletion.
Each measured edit calls native projection once. Later updates replace one
unit with one unit at the end, which also applies the required attributes.
The test now records removed and inserted ranges separately, their maximum
length, native lengths before and after projection, and the projection count.
Thus before/after Bend text differences and native notification ranges do not
by themselves establish the actual replacement range. Separate patches for
distant changes were then implemented for the measured 1 MiB case.

## Split native updates

The adapter now searches the first 64 UTF-16 units of each changed interval for
a common 32-unit text anchor. It checks every retained text unit and requested
attribute, then applies the tail patch before the head patch. If the search or
verification fails, it keeps the single-interval update. This is a native text
comparison; it does not add Markdown rules to the host. Twenty-five pairs with
Chinese text, emoji, combining marks, shifted prefixes, and changed tails match
an independent full native build and use patches smaller than 64 units.

A new 1 MiB native run passed all 20 edits. Its first edit used two patches, each
at most two UTF-16 units. The frame measured 420.197 ms, compared with the earlier
single-interval sample of 2473.367 ms. Opening measured 587.313 ms. Across all
20 edits, the minimum was 420.197 ms, the maximum was 1587.489 ms, and the 95th
percentile was 1585.830 ms. The other 19 updates each used one one-unit patch.
These are separate process runs, with other applications running.

First-drawing resident memory was 254,492,672 bytes. Process peak memory was
892,911,616 bytes. Full scroll/layout took 787.142 ms before edits and 0.278 ms
after edits. Small native patches remove the observed first-edit layout cost,
but complete scene construction, source copying, cursor mapping, and native
scene transfer still require linear work. The product budgets remain unmet.

## Cached block scenes

The edit session now stores a binary-trie cache keyed by stable block identifier.
Each entry holds a block-relative scene and normalized local selection positions.
Unchanged blocks keep their scene when earlier edits move them. Deleted entries
are bounded: the cache clears before rendering if its entry count exceeds twice
the current block count. New entries can raise the resulting count to at most
three times the block count. Undo, redo, and raw-source replacement start a fresh
cache so that identifiers from a different document state cannot reuse stale text.
The cache is not stored in edit-history snapshots.

Differential tests compare cached output with full source parsing and scene
construction. They check repeated views, selection changes, prefix insertions,
whole-document replacement, 40 successive edits, and cache size. Native tests
also check source, document, projection attributes, and cursor after 20 edits.
The full local batch passed, including one and four CPU threads.

One 1 MiB core sample measured direct editing at 249 ms, compared with the earlier
356 ms sample with only the current-view cache. It rebuilt two block scenes and
reused 66,575. The resulting cache contained 66,578 entries, including one retained
old entry. The independent complete scene build measured 236 ms. This process
peaked at 233,537,536 resident bytes. These are single core samples.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 168.708 ms | 28.571 ms | 36.042 ms | 38.929 ms | 95.583 ms |
| 1 MiB | 671.995 ms | 316.996 ms | 644.747 ms | 667.903 ms | 1019.701 ms |

Both native runs passed all 20 edits. The 100 KiB first-drawing resident sample
was 108,593,152 bytes; peak process memory was 179,044,352 bytes. Its scroll/layout
checks took 73.337 ms before edits and 0.229 ms after edits. For 1 MiB the first
resident sample was 301,154,304 bytes, and peak process memory was 931,774,464
bytes. Scroll/layout took 769.059 ms before edits and 0.257 ms after edits.
The cache adds memory and full-build work at opening. Complete mapping, visible
strings, source copies retained by history, and transfer of all native runs still
require work across the document. The frame, opening, and idle-memory targets
remain unproven or unmet.

## Indexed scene positions

The live editor now uses a balanced tree of local block maps. Each node caches
source length, UTF-16 length, block count, and its last non-final source point.
Cursor queries choose tree branches and scan only the selected block. Hidden
marks, zero-width blocks, and a surrogate ceiling at a block boundary retain
the complete-map behavior. Equal block counts reuse unchanged tree branches
after checking stable identifiers and normalized selection keys; changed counts
use a fresh balanced build. Large independent construction branches run in
parallel. Raw replacement, undo, and redo reset the index with the block cache.

The production path no longer constructs the complete scalar map or a combined
visible string. Those values are materialized only for reference tests. The
tests compare queries with complete scenes built from the source, all fixture
positions, clamping, UTF-16 surrogate pairs, empty fences, CRLF, and 20 edits with
undo, redo, alternate history branches, and raw replacement. A larger fixture
checks parallel construction and sampled positions. The batch passed.

One 1 MiB core run measured editing at 197 ms and an independent complete scene
build at 234 ms. It rebuilt two block scenes and reused 66,575. The process peak
was 250,904,576 resident bytes. The editor still visits all blocks to check and
join them, and still copies the complete source and sends every native run.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 180.644 ms | 24.496 ms | 28.931 ms | 33.009 ms | 93.738 ms |
| 1 MiB | 782.304 ms | 271.439 ms | 441.758 ms | 467.350 ms | 973.552 ms |

Both runs passed all 20 edits. The 100 KiB first-drawing resident sample was
110,198,784 bytes; its process peak was 185,581,568 bytes. Scroll/layout took
77.695 ms before edits and 0.226 ms after edits. For 1 MiB the first resident
sample was 315,867,136 bytes, and the peak was 948,830,208 bytes. Scroll/layout
took 778.137 ms before edits and 0.270 ms after edits. The position index adds
initial work and memory; the measured 1 MiB opening is slower than the previous
sample. These are separate runs with other applications running. The frame and
opening targets remain unmet; neither resident sample establishes idle memory.

## Source storage in history

History snapshots now store cursor positions and a source-preserving document
tree. They do not keep a second complete source string. Local edits share
unchanged branches. The host can still request an exact full source string.

The new memory gate runs 20 one-MiB edits, 20 undo steps, and 20 redo steps. Each
step checks every source character, cached source length, and cursor positions.
The test reconstructs the actual source but compares it with the fixture's
repeated pattern, without storing a separate one-MiB reference string. One run
peaked at 250,429,440 resident bytes, below the unchanged 300 MiB limit.

An initial test peaked at 540,246,016 bytes. It built a complete expected source
and counted a large reference string at every step. Removing those test copies
and repeated counts reduced the peak. This gate measures process peak memory;
it does not establish the editor's idle-memory or frame-time targets. Native
presentation still requests complete source strings and sends all runs.

The complete batch passed, including native event tests and a second history
memory sample of 250,331,136 bytes. A core sample measured complete scene
construction at 231 ms and editing at 135 ms, with two block scenes rebuilt and
66,575 reused. Its peak was 200,933,376 resident bytes.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 169.509 ms | 20.794 ms | 22.046 ms | 24.276 ms | 88.835 ms |
| 1 MiB | 763.322 ms | 249.292 ms | 318.313 ms | 515.863 ms | 950.248 ms |

Each row contains 20 edits and one opening sample. Both native runs passed.
The 100 KiB first-drawing resident sample was 110,510,080 bytes and process peak
was 141,312,000 bytes. Scroll/layout took 73.829 ms before edits and 0.171 ms
after edits. The one-MiB first-drawing resident sample was 338,116,608 bytes and
process peak was 489,029,632 bytes. Scroll/layout took 771.893 ms before edits
and 0.259 ms after edits. An earlier run of the same build peaked at 489,701,376
bytes. These measurements include the native test's reference checks; the test
comparison now checks characters without reconstructing its input strings.
The memory reduction is consistent across these two samples. The one-MiB edit
95th percentile did not improve over the prior sample. The frame-time and
opening targets remain unmet; first-drawing memory is not an idle-memory test.

## Native presentation stages

The native benchmark can now enable stage clocks. They are disabled in the
normal app. `before_set` includes native input handling, Bend state updates,
source reconstruction, and work before the host receives the source.
`source_update` measures source conversion, resetting the next scene, and
updating the raw native editor. `run_build` is the sum of the native run-effect
times. `projection` measures comparison with text storage, text patches, and
selection placement. The existing complete frame clock includes work between
these stages and the requested viewport layout and drawing.

One one-MiB sequence sent 133,153 runs on every edit. Native run construction
took about 70–72 ms, while projection took about 5.5–7.3 ms. Source update grew
from about 14 ms to 156 ms across the sequence. Time before source delivery
ranged from about 141 ms to 832 ms. This evidence directs the next work toward
source delivery and scene transfer; the final small text patch is not the
largest measured cost. These stage clocks add measurement work, so use ordinary
frame measurements to assess the final product budget.

A trial with autorelease pools around each native presentation effect did not
reduce peak memory or the growth in source-update time. Its one-MiB process
peak was 491,307,008 bytes. That trial change was removed.

## Native reference checks without complete copies

The native benchmark now stores a short reference pattern, fixture size, and
edit count. After every edit it reconstructs the actual source and checks every
character of the reference pattern and inserted suffix. It also checks cursor
positions and cached source length. Negative checks cover missing text, changed
text in later repetitions, and excess inserted text. It no longer constructs or
retains a new complete expected source at each edit.

Stage clocks are now explicit options: `stages` for 100 KiB and `large-stages`
for one MiB. The normal benchmark and `large` keep them disabled. Run the native
measurements after the correctness batch, without another benchmark running.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 176.940 ms | 19.736 ms | 20.194 ms | 24.843 ms | 87.745 ms |
| 1 MiB | 749.209 ms | 240.686 ms | 271.224 ms | 287.769 ms | 934.893 ms |

Each row contains 20 edits and one opening sample. Both native runs passed with
stage clocks disabled. For 100 KiB, first-drawing resident memory was 108,396,544
bytes and process peak was 126,468,096 bytes. Scroll/layout took 72.653 ms before
edits and 0.148 ms after edits. For one MiB, first-drawing resident memory was
314,032,128 bytes and process peak was 373,473,280 bytes. Scroll/layout took
771.115 ms before edits and 0.251 ms after edits.

A separate one-MiB stage run passed 20 edits. Its first edit measured 138.234 ms
before source delivery, 12.677 ms for source update, 70.862 ms for run building,
and 7.372 ms for projection. Its last edit measured 163.590, 24.609, 70.723, and
5.611 ms respectively. Every edit still sent 133,153 runs.

The earlier growth in source-update time was partly caused by the benchmark's
large reference copies. This change improves measurement quality, not the
editor's production algorithm. Source reconstruction, block scanning, and full
run transfer still remain. The opening and frame targets remain unmet, and
these measurements do not establish idle memory.

## One scene effect per presentation

The editor now sends the ordered scene run list through one host effect instead
of one effect per run. The native adapter consumes list and Run fields through
the Bend runtime ownership helpers, so cached shared scenes remain valid. The
public single-run function sends a one-item batch. POSIX and JavaScript use the
same contract. Host checks compare both paths for all style codes, empty text,
Unicode, and CRLF. Native event tests also reuse shared scenes after edits.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 176.362 ms | 19.246 ms | 19.686 ms | 24.190 ms | 87.485 ms |
| 1 MiB | 744.451 ms | 238.932 ms | 267.356 ms | 284.861 ms | 927.295 ms |

Both runs passed 20 edits with stage clocks disabled. The 100 KiB first-drawing
resident sample was 108,216,320 bytes and process peak was 126,550,016 bytes.
Scroll/layout took 73.238 ms before edits and 0.158 ms after edits. For one MiB,
first-drawing resident memory was 313,835,520 bytes and process peak was
375,406,592 bytes. Scroll/layout took 768.983 ms before edits and 0.226 ms after
edits. The complete correctness batch and proof gate passed.

The small timing difference from the previous samples does not establish a
large speed gain. This change removes repeated effect dispatch but still sends
and rebuilds every run. Source reconstruction and complete scene scanning also
remain. The opening and frame targets remain unmet.

## Native block scene reuse

The Bend cache now supplies ordered host chunks with stable identifiers,
freshness flags, and styled runs. A native cache miss rebuilds from those runs.
A fresh flag replaces an old entry with the same identifier; this also prevents
stale scenes after undo, redo, and source replacement. macOS and JavaScript
keep only blocks in the current presentation. Legacy scene presentation clears
that cache. The POSIX terminal follows the chunk contract but builds its preview
in full. Full Bend run-list joins are now built only for reference checks.

The complete correctness batch passed. Scene-cache checks compare the flattened
host chunks with independent complete scenes after selections and edits. Host
checks cover reuse, changed entries, cache misses, cache bounds, and clearing.
Native tests cover editing and history, exact source and selection, fonts, and
scrolling. The history memory sample peaked at 251,543,552 bytes, below 300 MiB.

A core one-MiB sample measured scene construction at 232 ms and editing at
127 ms, rebuilding two block scenes and reusing 66,575. Its process peak was
200,359,936 resident bytes.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 179.279 ms | 12.383 ms | 12.957 ms | 17.327 ms | 80.361 ms |
| 1 MiB | 782.683 ms | 177.809 ms | 188.830 ms | 205.550 ms | 860.618 ms |

Both native runs passed 20 edits with stage clocks disabled. The first edit
rebuilt two native chunks; later edits rebuilt one. The 100 KiB run retained
6,503 chunks, and the one-MiB run retained 66,577. The gate checks that every
edit rebuilds at most two chunks and retains exactly the rebuilt and reused
chunks in its presentation.

The 100 KiB first-drawing resident sample was 109,625,344 bytes and process peak
was 129,417,216 bytes. Scroll/layout took 73.913 ms before edits and 0.140 ms
after edits. The one-MiB first-drawing resident sample was 328,269,824 bytes and
process peak was 388,710,400 bytes. Scroll/layout took 769.894 ms before edits
and 0.256 ms after edits. The cache adds native objects and memory. Opening did
not improve in this sample.

A separate one-MiB stage run passed 20 edits. The first edit measured 133.933 ms
before source delivery, 12.977 ms for source update, 19.654 ms for chunk update,
and 7.355 ms for projection. It built two native runs in 0.011 ms. The last edit
measured 157.335, 23.572, 22.212, and 5.632 ms respectively. It built one native
run in 0.009 ms. Chunk-update time includes fresh run construction, cache
lookup, ordered native scene joining, and ownership work; do not add run-build
time to it again.

The one-MiB edit 95th percentile fell from 284.861 ms in the preceding sample
to 205.550 ms. The 100 KiB sample is near the frame target but still exceeds
16 ms at the 95th percentile. Complete block scanning, source reconstruction,
ordered chunk-list transfer, and native chunk joining remain. The opening and
one-MiB frame targets remain unmet. First-drawing memory does not establish
idle memory. No Linux native GUI measurement is available.

## Source-range delivery

Direct edits now send the exact scalar source range and inserted text. The
source range comes from the same Bend position index used by the edit command.
The host updates its source mirror and raw editor. It converts source scalars
to its string encoding without applying Markdown rules. Selection changes use
a source no-op and refresh the scene. Opening, history, and raw-source
replacement still send complete source strings.

The complete batch passed. Host checks cover Chinese, emoji, combining marks,
CRLF, reversed ranges, clamping, insertion, replacement, and a source no-op.
Additional native event checks compare the host and raw editor with Bend's
source after every action, including composition, deletion, undo, and redo.
The large native test checks the original source prefix and exact inserted
suffix after each edit. Its reference is a native UTF-16 buffer, not a new
complete Bend expected-source string after each edit. Those checks run after
the frame clock stops; memory measurements include the reference buffers.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 183.443 ms | 10.574 ms | 11.014 ms | 15.371 ms | 79.090 ms |
| 1 MiB | 784.159 ms | 148.908 ms | 157.323 ms | 165.697 ms | 836.635 ms |

Both native runs passed 20 edits with stage clocks disabled. The first edit
rebuilt two native chunks; later edits rebuilt one. The 100 KiB first-drawing
resident sample was 109,379,584 bytes and process peak was 131,891,200 bytes.
Scroll/layout took 73.869 ms before edits and 0.148 ms after edits. The one-MiB
first-drawing resident sample was 328,990,720 bytes and process peak was
388,792,320 bytes. Scroll/layout took 764.152 ms before edits and 0.218 ms after
edits. The history memory sample was 251,281,408 bytes, below 300 MiB.

A separate one-MiB stage run passed 20 edits. Its first edit measured 117.949 ms
before source delivery, 5.903 ms for source update, 19.902 ms for chunk update,
and 7.301 ms for projection. Its last edit measured 133.056, 5.961, 23.704, and
5.618 ms respectively. The historical `before_set` label now means time before
the source replacement effect for direct edits. Source-update time includes
encoding conversion, source and raw-editor patches, and scene reset.

The 100 KiB direct-edit sample is below 16 ms at the 95th percentile; its maximum
still exceeds that value. This does not establish the full one-MiB frame target,
keyboard navigation performance, or undo performance. The one-MiB opening and
frame targets remain unmet. At this stage, complete block scanning and ordered
native chunk joining remained. Source-range conversion still scans a native prefix. Complete
source strings remain on the history and raw-replacement paths. First-drawing
memory does not establish idle memory.

## Changed document block intervals

`Document.apply_change` returns the updated document and a block interval: first
block, old block count removed, and new block count added. The interval comes
from the parser's existing anchor and settled suffix. It can include unchanged
anchor blocks. It does not imply that every block in the interval needs a new
scene.

Tests check interval bounds, total block counts, and exact prefix and suffix
preservation, including identifiers and kinds. The checks run at every position
in the fixture set and through a sequence of 40 edits, with one and four CPU
threads. A one-MiB batch also checks these cases:

| Edit | First block | Removed blocks | Added blocks | Result blocks | Parsed scalars |
|---|---:|---:|---:|---:|---:|
| Near start | 0 | 1 | 1 | 66,577 | 10 |
| Middle | 33,287 | 2 | 2 | 66,577 | 11 |
| Near end | 66,575 | 2 | 2 | 66,577 | 5 |
| Open fence | 0 | 66,577 | 1 | 1 | 1,048,578 |

Direct edits now use this metadata to splice the scene position index. Scene
refresh also reads the blocks affected by previous and new selection positions,
which can be outside the parser interval.

## Scene range refresh

The live edit and selection paths now locate block ranges through cached tree
lengths and counts. They read the parser interval and the previous and new
selection ranges. Scene index chunks retain local runs and maps for the other
blocks. Retained suffix ranks shift by the change in block count.

`tests/SceneRangeCheck.bend` compares complete one-MiB reference scenes and cursor
queries with the incremental result. The initial selection is at the source end.
The fixture has 66,577 blocks. The counter includes repeated reads when ranges
overlap; it excludes tree paths that use cached metadata.

| Action | Blocks read for scene refresh |
|---|---:|
| Edit near start | 3 |
| Edit at middle | 4 |
| Edit near end | 5 |
| Move selection from end to start | 2 |

These counts show removal of full document block scans from local scene refresh.
They do not establish the frame-time target. At this stage, Bend still created a
complete host chunk list, and the host joined it into a complete attributed scene.

Measured on 2026-10-03 on the reference system above, after the complete batch
finished. The native measurements use 20 edits with stage clocks disabled and
default CPU threads. Each run passed exact source and cursor checks.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 175.199 ms | 5.375 ms | 5.578 ms | 14.968 ms | 72.805 ms |
| 1 MiB | 801.351 ms | 59.579 ms | 61.389 ms | 64.159 ms | 745.837 ms |

The one-MiB Bend edit sample took 22 ms, with two scenes rebuilt and 66,575 reused.
Its separate complete scene build took 233 ms. These are single core samples.
Another native one-MiB run measured a 60.482 ms median and 63.772 ms 95th
percentile. Both native runs retained the large early layout outlier.

The 100 KiB first-drawing resident sample was 112,246,784 bytes; process peak was
123,207,680 bytes. The one-MiB sample was 354,877,440 bytes; process peak was
396,640,256 bytes. Cached runs in the scene index add retained references.
The history memory gate passed at 271,646,720 bytes, below 300 MiB. First-drawing
samples do not establish idle memory. Opening, one-MiB frame time, and the idle
memory targets remain unmet or unproven.

## Scene patch delivery

Local edits and selection changes now send ordered patches with explicit block
and UTF-16 ranges. Each range applies after the preceding patch. Complete scene
presentation establishes the opening or history baseline. Native chunks outside
patch ranges stay in the cache. macOS replaces only the specified parts of its
retained attributed scene. The terminal and JavaScript baseline keep the same
patch contract and assemble their fallback views from retained chunks.

The full batch passed. Patch replay checks compare exact ranges, block order,
text, and styles with complete scenes. Host checks cover emoji, combining marks,
CRLF, zero-width blocks, attribute changes, cache misses, pruning, empty results,
and empty patch lists. JavaScript also checks a 150,000-chunk insertion without
using a spread call that can exceed the engine's argument limit. Native input
checks cover edits, selection changes, composition, deletion, undo, and redo.

The one-MiB reference cases send two, three, and two chunks for edits near the
start, middle, and end. No complete host list is produced on these paths. The
native append-at-end fixture sends two chunks on its first edit and one on later
edits; the other 66,575 or 66,576 native chunks remain cached.

Measured on 2026-10-03 on the same reference system, after the complete batch.
Both native runs use 20 edits with stage clocks disabled. Each edit passed exact
source, cursor, cache-bound, and transferred-chunk checks.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 182.241 ms | 3.103 ms | 3.344 ms | 14.134 ms | 70.239 ms |
| 1 MiB | 816.846 ms | 22.119 ms | 22.750 ms | 32.755 ms | 714.528 ms |

The separate one-MiB Bend edit sample took 8 ms; complete scene construction took
229 ms. These are single core samples. The first drawing used 112,164,864 bytes
for 100 KiB and 354,418,688 bytes for one MiB. Process peaks were 124,469,248 and
394,477,568 bytes. The history memory gate passed at 271,368,192 bytes.

A separate one-MiB stage run passed all 20 edits. Its first edit measured
18.871 ms before source delivery, 5.616 ms for source update, 0.044 ms for chunk
update, and 7.144 ms for projection. Its last edit measured 11.106, 5.759, 0.011,
and 5.531 ms respectively. Time before source delivery includes native input and
event processing as well as Bend work. It is not a core-only measurement.

The one-MiB frame and opening targets remain unmet. Large early layout outliers
remain. Native input differences and source-range conversion still scan prefixes,
and projection still compares complete scenes with the edited text field. First
drawing and process peak memory do not establish the idle-memory target.

## Direct native storage patches

Measured on 2026-10-03 on the same reference system, after the complete batch.
The native adapter now applies scene patches directly to the text field when
its baseline is known. It adjusts each range for the pending input replacement.
Unknown baselines and partial overlaps retain complete comparison as a fallback.
Host checks cover patches before, after, and across a replacement, including
emoji, combining marks, deletion, styles, and fallback after an earlier patch.

Both frame runs use 20 edits with stage clocks disabled. Every edit passed exact
source, cursor, cache-bound, and transferred-chunk checks. All edits used zero
complete scene comparisons.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 181.606 ms | 2.598 ms | 2.733 ms | 11.720 ms | 70.759 ms |
| 1 MiB | 808.259 ms | 17.207 ms | 17.739 ms | 27.037 ms | 704.477 ms |

First drawing used 112,476,160 and 354,533,376 bytes respectively. Process peaks
were 124,010,496 and 395,329,536 bytes. The batch history memory gate passed at
272,023,552 bytes.

A separate one-MiB stage run passed all 20 edits. The first edit measured
19.806 ms before source delivery, 5.964 ms for source update, 1.672 ms for chunk
update, and 0.060 ms for projection. Its last edit measured 11.062, 5.695, 0.548,
and 0.026 ms respectively. Direct storage work now occurs in chunk update;
projection sets the final selection. Time before source delivery includes native
input and event processing as well as Bend work.

Compared with the preceding fixture run, the one-MiB median fell from 22.750 to
17.739 ms. This result does not meet the 16 ms 95th-percentile target. Opening
and early layout outliers remain above target. Native input differences and
source-range conversion still scan prefixes. These samples do not establish
performance for other documents or the idle-memory target.

## Native input storage ranges

Measured on 2026-10-03 on the same reference system, after the complete batch.
Normal typing now uses the text storage's reported character edit range. This
range can include unchanged text, so the adapter trims it locally before it
expands replacement boundaries to complete composed characters. Multiple edits
before a commit or an unknown baseline retain complete input comparison.
Attribute-only notifications and presentation changes do not become input.

The host matrix checks exact reconstruction and complete composed ranges for
emoji, combining marks, joiners, flags, and CRLF. Native event checks cover IME,
selection, deletion, undo, and redo. Both native frame runs use 20 edits with
stage clocks disabled. Every edit passed exact source, cursor, and cache checks,
with zero complete input comparisons and zero complete scene comparisons.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 183.017 ms | 1.621 ms | 1.773 ms | 13.535 ms | 69.672 ms |
| 1 MiB | 810.274 ms | 7.951 ms | 8.009 ms | 21.625 ms | 696.386 ms |

First drawing used 112,345,088 and 354,451,456 bytes respectively. Process peaks
were 125,190,144 and 394,657,792 bytes. The batch history memory gate passed at
271,237,120 bytes.

A separate one-MiB stage run passed all 20 edits. Its first edit measured
13.419 ms before source delivery, 5.694 ms for source update, 1.667 ms for chunk
update, and 0.064 ms for projection. Its last edit measured 1.312, 5.707, 0.547,
and 0.018 ms respectively. Native source-position conversion still scans the
source prefix and is the next measured cost to reduce.

The one-MiB median fell from 17.739 to 8.009 ms in this fixture. Its 95th
percentile remains above the 16 ms target. Opening and early layout outliers
also remain above target. These samples do not establish performance for other
documents or the idle-memory target.

## Native source-position index

Measured on 2026-10-03 on the same reference system, after the complete batch.
The macOS source mirror now uses a balanced scalar-to-UTF-16 index. Each leaf
contains at most 512 UTF-16 units and preserves surrogate pairs. Edits replace
the affected index section and share retained branches. Complete source changes
rebuild the index. Source strings and the native raw source field still update.

Host checks apply 300 edits near the start, middle, and end of a Unicode fixture.
They verify exact reconstruction, cached lengths, balance, every scalar lookup,
empty results, insertion into an empty index, and clamped positions. Native event
and document checks passed. Both frame runs use 20 edits with stage clocks off;
all exact source, cursor, cache, and no-complete-comparison checks passed.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 175.099 ms | 1.570 ms | 1.737 ms | 13.341 ms | 68.655 ms |
| 1 MiB | 829.786 ms | 7.032 ms | 7.151 ms | 20.708 ms | 702.137 ms |

First drawing used 112,427,008 and 356,237,312 bytes respectively. Process peaks
were 125,321,216 and 396,312,576 bytes. The batch history memory gate passed at
271,630,336 bytes.

A separate one-MiB stage run passed all 20 edits. Its first edit measured
13.144 ms before source delivery, 5.182 ms for source update, 1.803 ms for chunk
update, and 0.069 ms for projection. Its last edit measured 1.263, 4.897, 0.543,
and 0.020 ms respectively. The complete prefix scan for source-position
conversion is removed, but source copying and native raw-field updates remain.

The one-MiB median fell from 8.009 to 7.151 ms in this fixture. The 95th percentile,
opening time, and early layout outliers still exceed target. These samples do
not establish performance for other documents or the idle-memory target.

## Native source-field baseline

Measured on 2026-10-03 on the same reference system, after the complete batch.
Separate source clocks found that complete native source-field comparison used
4.5–4.8 ms per one-MiB edit. Indexed lookup used less than 0.01 ms; source copying
and raw-field replacement each used less than 0.25 ms in those samples.

The adapter now tracks the native source-field baseline through character edit
notifications. A known baseline with matching length permits a direct range
update. Independent character edits clear the baseline; attribute edits do not.
An unknown baseline restores complete source text on the next source edit. Host
checks passed for independent changes with equal and unequal text lengths.
All native event and document checks passed in the complete batch.

Both frame runs use 20 edits with stage clocks disabled. Every edit passed exact
source, cursor, cache, and no-complete-input-or-scene-comparison checks.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 175.402 ms | 1.119 ms | 1.315 ms | 12.304 ms | 68.389 ms |
| 1 MiB | 810.194 ms | 2.376 ms | 2.474 ms | 16.217 ms | 691.982 ms |

First drawing used 112,148,480 and 355,926,016 bytes respectively. Process peaks
were 124,436,480 and 396,918,784 bytes. The batch history memory gate passed at
271,990,784 bytes.

A separate one-MiB stage run passed all 20 edits. Its first edit measured
13.749 ms before source delivery, 0.327 ms for source update, 1.672 ms for chunk
update, and 0.072 ms for projection. Its last edit measured 1.326, 0.170, 0.640,
and 0.024 ms respectively. Source substage clocks report indexed lookup, baseline
validation, source/index copying, raw-field storage, and raw-field selection.
The baseline validation sample fell to about 0.001 ms.

The one-MiB median fell from 7.151 to 2.474 ms in this fixture. The 95th percentile
remains slightly above the 16 ms target. Opening and early layout outliers also
remain above target. These samples do not establish performance for other
documents or the idle-memory target.

## Native layout regions and caret visibility

Measured on 2026-10-03 on the same reference system, after the complete batch.
Surface clocks separated native insertion from viewport layout and drawing. In
the preceding layout mode, the second one-MiB edit spent 679.936 ms inside native
insertion, while drawing took 0.409 ms. The viewport moved to the document end.

Both native text fields now permit noncontiguous TextKit layout. Final projection
also scrolls the selected range into view. The native fixture verifies that the
caret glyph intersects the visible viewport after every edit. It still verifies
remote scrolling near the start, middle, and end after complete layout.

Both frame runs use 20 edits with stage clocks disabled. Every edit passed exact
source, cursor, cache, comparison-path, and caret-visibility checks. The existing
fixture includes a complete-layout scroll check before its first edit.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 167.244 ms | 0.949 ms | 1.102 ms | 12.354 ms | 12.582 ms |
| 1 MiB | 766.268 ms | 2.273 ms | 2.338 ms | 2.663 ms | 17.760 ms |

First drawing used 112,017,408 and 355,647,488 bytes respectively. Process peaks
were 123,322,368 and 388,956,160 bytes. The batch history memory gate passed at
271,433,728 bytes.

A separate one-MiB stage run passed all 20 edits. Its first edit measured
13.668 ms before source delivery, 0.393 ms for source update, 1.894 ms for chunk
update, and 2.300 ms for projection, including caret scrolling. Native insertion
took 3.889 ms; drawing took 0.046 ms. The last edit measured 1.503, 0.126, 0.625,
and 0.049 ms for the presentation stages.

This fixture's one-MiB 95th percentile is below 16 ms. Its slowest edit still
exceeds 16 ms. Opening remains above the 150 ms target. These samples do not
establish performance for other documents, input before complete layout, or the
idle-memory target.

## Typing before complete layout and opening stages

Measured on 2026-10-03 on the same reference system, after the complete batch.
The new `cold` and `large-cold` modes omit the initial complete-layout scroll.
They draw the initial viewport, then run 20 native edits with the same exact
source, cursor, cache, comparison-path, and visible-caret checks. The complete
layout and remote-scroll check runs after the edits. The batch gate runs both
the existing 100-KiB fixture and its new cold mode.

Both frame runs use stage clocks disabled. These runs do not use the initial
complete-layout scroll from earlier measurements.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 168.301 ms | 0.975 ms | 1.109 ms | 12.259 ms | 12.407 ms |
| 1 MiB | 760.600 ms | 2.099 ms | 2.330 ms | 2.701 ms | 18.799 ms |

First drawing used 112,066,560 and 355,581,952 bytes respectively. Process peaks
were 123,355,136 and 385,794,048 bytes. The batch history memory gate passed at
271,597,568 bytes. All 20 edits and the final remote-scroll check passed in each
run. The one-MiB first edit was the slowest.

A separate one-MiB cold stage run passed. Opening measured 492.470 ms before
presentation, 163.550 ms during presentation, and 114.937 ms from the end of
presentation to the first native frame. Presentation included 10.295 ms for
source update and 138.809 ms for chunks. These stages do not isolate parsing
from cache construction. They identify work before presentation as the largest
opening interval in this sample.

The first edit in that stage run measured 13.956 ms before source delivery,
0.445 ms for source update, 2.072 ms for chunks, and 2.556 ms for projection.
Native insertion took 3.792 ms and drawing took 0.056 ms.

This fixture's one-MiB 95th percentile remains below 16 ms without the initial
complete-layout scroll. Its first edit exceeds 16 ms. Opening remains above
150 ms. These samples do not establish other documents, other edit locations,
or the idle-memory target. Opening work before presentation is the next cost
to separate and reduce.

## Parallel opening scan

Measured on 2026-10-03 on the same reference system, after the complete batch.
`tests/OpeningBench.bend` separates parsing, block scanning, and cache finish.
Five fresh processes were measured for each scan version. Repeated openings
inside one process showed increasing times, so those preliminary samples are
excluded from this comparison.

Complete rendering now forks independent document-tree branches when their
block count is at least 8,192. Each branch uses cached source lengths to locate
its starting offset. Small regions use the existing sequential scan. Joining
results preserves entry, chunk, and host order. The new one-MiB scan check
compares every result field with the sequential path, including freshness,
positions, styles, cache hits, and a changed selection. It passed with default
threads and four threads in the complete batch.

| One-MiB core stage | Sequential median | Parallel median |
|---|---:|---:|
| Parsing | 82 ms | 80 ms |
| Block scan | 223 ms | 45 ms |
| Cache finish | 169 ms | 168 ms |
| Complete cache construction | 392 ms | 213 ms |

Both native frame runs omit the initial complete-layout scroll and use 20 edits
with stage clocks disabled. Every exact source, cursor, cache, comparison-path,
and visible-caret check passed, as did final remote scrolling.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 174.692 ms | 0.992 ms | 1.116 ms | 12.989 ms | 15.001 ms |
| 1 MiB | 587.802 ms | 2.141 ms | 2.407 ms | 2.724 ms | 17.912 ms |

First drawing used 111,902,720 and 331,890,688 bytes respectively. Process peaks
were 123,650,048 and 361,496,576 bytes. The batch history memory gate passed at
235,077,632 bytes.

A separate one-MiB cold stage run passed. Opening measured 313.512 ms before
presentation, 162.775 ms in presentation, and 115.266 ms from presentation to
the native frame. Presentation included 9.754 ms for source update and
138.457 ms for chunks. The stage run's total opening sample was 591.551 ms.

The normal one-MiB opening sample fell from 760.600 to 587.802 ms. It still
exceeds 150 ms. Cache finish remains a large core cost, and native chunk
construction remains a large presentation cost. These samples do not establish
other documents, other edit locations, or the idle-memory target.

## Bulk construction of empty caches

Measured on 2026-10-03 on the same reference system, after the complete batch.
Cache-finish clocks identified entry insertion as the larger cost. Large empty
caches now group entries by identifier bits and build independent trie branches.
Partitions below 8,192 entries build sequentially. Existing caches and small
empty caches keep incremental insertion. Duplicate identifiers retain their last
update. Entry counts include each identifier once.

The cache check compares the complete trie and all statistics with sequential
insertion for the one-MiB fixture. It also covers identifier zero, duplicate
identifiers, and a calculated identifier of one trillion. The complete batch
passed with default threads and four threads, including native input and cold
layout checks.

Five fresh processes were measured for each core version. The stage benchmark
calls the same entry and position-index builders separately, with clocks between
them, to identify their costs.

| One-MiB core stage | Sequential insertion median | Bulk insertion median |
|---|---:|---:|
| Parsing | 82 ms | 81 ms |
| Block scan | 45 ms | 44 ms |
| Cache entries | 148 ms | 57 ms |
| Position index | 20 ms | 18 ms |
| Cache finish | 168 ms | 75 ms |
| Complete cache construction | 213 ms | 119 ms |

Both native frame runs omit the initial complete-layout scroll and use 20 edits
with stage clocks disabled. All exact source, cursor, cache, comparison-path,
visible-caret, and final remote-scroll checks passed.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 177.331 ms | 0.969 ms | 1.193 ms | 10.840 ms | 11.753 ms |
| 1 MiB | 491.947 ms | 2.282 ms | 2.438 ms | 2.655 ms | 17.942 ms |

First drawing used 112,082,944 and 346,374,144 bytes respectively. Process peaks
were 122,552,320 and 376,193,024 bytes. The history memory gate passed at
311,394,304 bytes; a separate repeat passed at 311,492,608 bytes. Both are about
297 MiB, below the 300 MiB gate but with little spare capacity. This is higher
than the preceding scan-only change. Restricting forks to large partitions did
not remove that memory increase.

A separate one-MiB cold stage run passed. Opening measured 213.586 ms before
presentation, 163.661 ms in presentation, and 116.716 ms from presentation to
the native frame. Presentation included 10.394 ms for source update and
138.866 ms for chunks. The stage run's total opening sample was 493.961 ms.

The normal one-MiB opening sample fell from 587.802 to 491.947 ms. It still
exceeds 150 ms. Temporary cache-build memory and native chunk construction need
further work. These samples do not establish other documents, other edit
locations, or the idle-memory target.

## Cache-build accumulators

Measured on 2026-10-03 on the same reference system, after the complete batch.
Identifier partitioning now uses an accumulator, then restores input order.
Key preparation also uses one accumulator pass to collect keys and their maximum.
It no longer retains a separate maximum-key walk over the complete update list.
The complete trie comparison still passes for the one-MiB fixture, duplicate
identifiers, identifier zero, and the large calculated identifier.

The partition-only change passed the history memory gate at 305,790,976 bytes.
Combining key preparation and maximum calculation passed a separate history
check at 237,142,016 bytes. The complete batch passed at 236,388,352 bytes, about
225 MiB. This restores spare capacity below 300 MiB, compared with about 297 MiB
for the preceding builder. The gate still checks 20 edits, undo, and redo with
exact source and selection checks.

Five fresh core processes measured median parsing at 82 ms, scanning at 45 ms,
cache entries at 54 ms, position-index construction at 20 ms, cache finish at
74 ms, and complete cache construction at 120 ms. The preceding complete-cache
median was 119 ms; these samples show similar timing with lower history memory.

Both native frame runs omit the initial complete-layout scroll and use 20 edits
with stage clocks disabled. All exact source, cursor, cache, comparison-path,
visible-caret, and final remote-scroll checks passed.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 177.448 ms | 0.972 ms | 1.103 ms | 12.466 ms | 12.591 ms |
| 1 MiB | 495.600 ms | 2.238 ms | 2.357 ms | 2.872 ms | 18.167 ms |

First drawing used 111,984,640 and 332,267,520 bytes respectively. Process peaks
were 123,092,992 and 361,693,184 bytes. The one-MiB first-drawing sample is about
14 MiB below the preceding builder's sample.

A separate one-MiB cold stage run passed. Opening measured 214.921 ms before
presentation, 164.269 ms in presentation, and 114.528 ms from presentation to
the native frame. Presentation included 10.370 ms for source update and
139.779 ms for chunks. The stage run's total opening sample was 493.716 ms.

Opening remains above 150 ms. Native chunk construction is the next measured
presentation cost to investigate. These samples do not establish other
documents, other edit locations, or the idle-memory target.

## Native chunk style ranges

Measured on 2026-10-03 on the same reference system, after the complete batch.
New chunk clocks separate text conversion, style-run construction, immutable
copies, and scene assembly. An initial stage sample measured 18.851, 76.095,
6.989, and 12.932 ms respectively. These clocks cover parts of the complete
chunk interval; runtime ownership and other bookkeeping remain outside them.

Rebuilt native chunks now collect plain text and exact UTF-16 style ranges,
create one attributed buffer, and apply each range's attributes. Up to eight
ranges use local storage. Larger chunks grow a temporary array. Cached chunks
retain an immutable copy. Full legacy presentation publishes the assembled
scene to the native field after chunk construction.

Host checks compare a 12-run chunk with single-run output, covering empty text,
Unicode, CRLF, and all defined styles. They compare exact pre-display buffers
and native field output. The native reference uses the same field because
TextKit normalizes paragraph styles across each paragraph. The complete batch
passed, including direct input, IME, cold layout, and visible-caret checks.

Both native frame runs omit the initial complete-layout scroll and use 20 edits
with stage clocks disabled. All exact source, cursor, cache, comparison-path,
visible-caret, and final remote-scroll checks passed.

| Native document | Open sample | Edit minimum | Edit median | Edit 95th percentile | Edit maximum |
|---|---:|---:|---:|---:|---:|
| 100 KiB | 176.149 ms | 0.972 ms | 1.130 ms | 12.079 ms | 15.394 ms |
| 1 MiB | 479.136 ms | 2.250 ms | 2.356 ms | 2.794 ms | 18.843 ms |

First drawing used 112,214,016 and 332,218,368 bytes respectively. Process peaks
were 123,289,600 and 361,775,104 bytes. The batch history memory gate passed at
236,683,264 bytes.

A separate one-MiB cold stage run passed. Opening measured 221.905 ms before
presentation, 156.160 ms in presentation, and 115.445 ms from presentation to
the native frame. Presentation included 9.960 ms for source update and
131.724 ms for chunks. The chunk substage samples were 19.583 ms for conversion,
59.221 ms for styles, 6.355 ms for copies, and 12.725 ms for assembly. The stage
run's total opening sample was 493.509 ms.

The normal opening sample fell from 495.600 to 479.136 ms. This is a modest
change in one fixture; opening remains above 150 ms. These samples do not
establish other documents, other edit locations, or the idle-memory target.

## Native navigation and resize

The complete batch passed on 2026-10-03 with the native navigation check.
The check now sends 22 event actions through the macOS text-view event loop.
Its fixture contains Chinese characters, an emoji, a combining sequence, a
joined emoji, a newline, and 8,192 Latin characters on one source line.
Independent expected values check both source-scalar and native UTF-16
selections. Left and right commands do not stop inside the tested sequences.
Down from the document start moves to the next source line at scalar position
9 and UTF-16 position 12. Up returns to position zero. Both commands preserve
the source and keep the caret visible. The extended native check passed.

The edit surface changes to 340 by 120 pixels, 600 by 180 pixels, and its
original size. At each size, the check verifies unchanged text and selection,
line wrapping, and a visible caret. The complete batch also passed its proof,
adapter, native input, document, JavaScript, and memory gates.

The extended check also increases the complete window by 120 by 80 pixels,
then 240 by 160 pixels, and restores its original frame. At each frame it
checks unchanged text and selection and a visible caret. The native check
passed. This uses programmatic window frames; it does not establish user
drag resizing or automatic editor reflow in the current alert-based window.

Down and Up now pass through Bend as separate events. Down is checked against
the next line's first character, obtained from TextKit line-fragment layout
before the command. On this system, the expected native position is 72 and the
source position is 69. Up must return to native position 12 and source position
9. Both commands preserve text and keep the caret visible.

This stronger check first failed: the scene update changed native selection
affinity from downstream to upstream. Up then reached source position 8.
Skipping redundant range assignment alone did not correct it. The host now
captures affinity with a selection event and restores it when the scene maps
back to the same native range. Text edits clear the pending selection event.
The integrated navigation check and the complete batch passed after this
change. The document memory gate measured 88,014,848 bytes. The history gate
measured 236,388,352 bytes for 20 edits, undo, and redo. Native input, marked
text, block formatting, cold document layout, and JavaScript checks also passed.

A further check starts five characters into the long paragraph, at source
position 14 and native position 17. It computes the next wrapped line's start
from layout and adds the starting column before Down. Bend checks the resulting
source selection. Up must restore positions 14 and 17 after the scene update.
This extended native check passed. The column oracle applies to this fixture's
equal-width repeated Latin characters; it does not establish variable-width
text behavior.

This is a behavior check, not a timing measurement. Vertical movement through
variable-width text, bidirectional text, user drag resizing, and automatic
window reflow remain unchecked.

## Large recovery record: 2026-10-03

`tests/RecoveryRecordBench.bend` checks a one-MiB byte list. The list repeats
NUL, 255, CR, and LF. The current and saved versions contain the same bytes.
The check encodes the complete state, decodes it, and compares all state fields.
`sh tests/bench.sh` now includes this check.

The native Bend 2.0.34 check passed on macOS and Ubuntu 24.04 aarch64. Both
produced a 6,291,481-byte record. One macOS run took 1.25 seconds and used
479,903,744 bytes of peak resident memory. One Linux run took 0.61 seconds and
used 468,760 KiB of peak resident memory. These are single codec runs, not
editor timing results. The operating systems use different timing tools.

The decimal format stores both document versions. This fixture exceeds the
atomic-save test host's two-MiB input limit and the restart test's 4,096-byte
read bound. The check does not save the large record to disk. A large-record
restart check and lower codec memory use remain necessary. Increasing the
host limit alone would not resolve the codec cost.

### Version 2 hexadecimal record

The encoder now writes two lowercase hexadecimal characters for each byte.
The decoder still accepts version 1 decimal records. The check includes all
256 byte values, a legacy record, and invalid hexadecimal payloads with valid
checksums. Invalid digits, uppercase digits, and odd payload lengths are
rejected. The checksum is not an authentication mechanism.

The same one-MiB native fixture produced 4,194,330 bytes on both systems.
One macOS run took 1.03 seconds and used 328,892,416 bytes of peak resident
memory. One Linux run took 0.38 seconds and used 321,300 KiB of peak resident
memory. Record size fell by about one third; memory fell by about 31 percent.
These single runs do not establish a latency budget. The format still stores
both full document versions. The large-record disk restart check remains
incomplete, and the record still exceeds the host input limit.

### Large-record disk restart

`tests/RecoveryLargeRestartCheck.bend` now checks three distinct one-MiB
snapshots: the saved baseline, pending save, and current edit. Each contains
NUL and invalid UTF-8 bytes. The writer saves the source file and a validated
record through the atomic host, then exits with status 79. A separate reader
loads the journal and actual source file. It compares every recorded state
field, restores the current edit, selects the observed saved baseline, and
clears the interrupted request. The old-file and completed-save cases are
separate runs. The source file contains 1,048,576 bytes; this journal contains
6,291,481 bytes. The complete native check is part of `sh tests/check.sh`.

The host input limit is now eight MiB. The large reader uses an eight-MiB plus
one-byte record bound and a one-MiB plus one-byte source bound. A host boundary
check accepts exactly eight MiB and rejects one extra byte before creating a
pending file. Rejection must leave the original document unchanged.

The native macOS and Linux restart cases passed. Both complete batches passed
with the new cases included. This is a disk and process-restart check, not a
timing measurement.
Large JavaScript records, large interrupted journal updates, power loss,
competing writers, and editor recovery integration remain unverified.

### Large interrupted journal updates

`tests/JournalLargeInterruptedCheck.bend` now checks the same three distinct
one-MiB snapshots across interrupted journal updates. The initial writer saves
the prior complete record and exits. A second process writes a later edit and
stops the host after creation, partial write, complete write, file sync, or
rename. A third process reads the selected journal and actual source file.
All state fields must match the expected record. Recovery must restore the
expected complete edit, use the observed saved baseline, and clear the pending
request. The first four cases retain the prior edit; rename selects the later
edit. The reader does not use the temporary pending file.

All five native macOS and all five native Linux cases passed in one batch on
2026-10-03. The Bend proof gate and script syntax checks passed. The new cases
are included in `sh tests/check.sh`. The complete batch passed in the prior
step; this step ran the new cases on both platforms without repeating unrelated
checks. These controlled exits do not establish power-loss behavior. Large
JavaScript records, competing writers, record lookup, and editor recovery
integration remain unverified.

### External file changes across restart

`tests/RecoveryConflictRestartCheck.bend` now uses a separate writer, external
editor, and recovery reader. The writer saves the three-snapshot one-MiB
journal and exits. The external process changes and syncs the source file.
One case writes bytes that match the current edit. The other writes a fourth
distinct version. Both disk versions differ from the saved and pending
snapshots, so both must produce a conflict. The check compares all recorded
state fields and all observed disk bytes. The shell driver compares source and
journal files before and after recovery and checks that no pending files were
created. Recovery must not write either file.

Both cases passed on native macOS and native Linux on 2026-10-03. The Bend
proof gate and script syntax checks passed. The cases are included in the
native batch. This step ran the four new platform cases without repeating
unrelated checks. The external change finishes before the reader starts;
this does not establish safe reads under simultaneous writers or implement
the editor's conflict-resolution interface.

### Large JavaScript codec

The first one-MiB version 2 codec runs failed on Bun 1.3.11 and Node 22.22.3.
Bend reported a possible machine stack overflow. A temporary stack trace in
the generated JavaScript identified byte validation as the first failure.
Encoding, decoding, record splitting, and byte comparison also had deep
non-tail recursive calls. These operations now use accumulators and tail calls
on the version 2 path. The record format and checksum are unchanged. Small
legacy record decoding remains covered; large legacy JavaScript decoding has
not been checked.

Unmodified generated JavaScript now passes the complete one-MiB round trip on
both runtimes. Both produce 4,194,330 record bytes. One macOS Bun run took
2.10 seconds and used 1,012,645,888 bytes of peak resident memory. One macOS
Node run took 2.05 seconds and used 514,949,120 bytes. A native macOS run took
1.01 seconds and used 295,387,136 bytes. A native Linux run took 0.34 seconds
and used 288,528 KiB. The macOS runs overlapped; these single measurements do
not establish a latency budget or a product idle-memory result. JavaScript
memory cost remains high.

`sh tests/check.sh` now runs the large codec with its selected JavaScript
runtime. Native process restart, large journal interruptions, and recovery
conflicts also remain in that batch. Large JavaScript disk recovery has not
yet been checked.

### Large JavaScript disk checks

The generated large restart, journal interruption, and conflict programs now
run with Bun 1.3.11 on macOS. The same shell drivers start separate writer,
updater or external editor, and recovery reader processes. All nine cases
passed: two source-file restart states, five journal interruption stages, and
two external-file conflicts. Each fixture retains the three distinct one-MiB
snapshots and reads actual disk files. Conflict checks compare both files
before and after recovery. The modified conflict driver also passed its two
native cases with the default runtime.

These JavaScript disk checks are now in `sh tests/check.sh` when Bun is present.
Node still runs the large codec; the Bend 2.0.34 JavaScript file-byte effects
require Bun. This step ran the new disk cases without repeating unrelated core
checks. All nine large JavaScript disk cases also passed on Linux aarch64 with
Bun 1.3.11. The complete Ubuntu 24.04 batch passed with the small JavaScript
disk, byte preservation, save, and host checks enabled. The local Linux runner
now includes Bun from a version- and digest-pinned image, so it runs these
checks by default. The native document/history memory gates measured
87,318,528 and 236,220,416 bytes. These are not codec or idle-memory results.
Browser file integration, large legacy decoding, editor integration, record
lookup, power loss, and simultaneous writers remain unverified.

### Recovery document identity

`src/RecoveryEntry.bend` now wraps a save-state record with an exact, nonempty
document identity. The identity is an opaque byte sequence supplied by the
host. The MBE1 wrapper checksum covers both identity and inner record. Decoding
checks both checksums and validates the identity. Bare save-state records do
not establish document ownership and are rejected by this wrapper. The checksum
detects tested accidental changes; it is not an authentication mechanism.

The fixture uses two document identities with an empty saved baseline. A wrong
identity must retain the complete entry and disk bytes as WrongDocument. A
matching identity must delegate to the existing recovery rules, including
conflicts. Checks also cover binary identity bytes, empty and invalid identity
encoding, malformed identity decoding, altered identity fields, every truncated
prefix, appended text, and an invalid inner checksum with a valid outer checksum.
Native one/four-thread, Bun, and Node checks passed on macOS and Linux. The Bend
proof gate passed with a law that mismatch retains the complete versions.

These small prototype checks are now in the batch. This step did not repeat
unrelated document and native GUI checks. Stable host identity assignment,
filesystem lookup, large wrapper measurements, migration, and editor integration
remain incomplete. Connected wrapper persistence is checked below.

### Persisted document identity across restart

`tests/RecoveryEntryRestartCheck.bend` now persists the identity wrapper through
the atomic host. The fixture has three distinct one-MiB state snapshots. Two
actual files have the same one-MiB saved bytes but different fixture identities.
The writer syncs both files, atomically saves the wrapper, and exits with status
79. Two separate readers load the same journal and their respective source
files. Each reader validates the persisted identity and all state fields.
The owner must restore its current edit and saved baseline and clear the pending
request. The other file must retain the complete entry and observed disk bytes
as WrongDocument. The shell driver checks that both source files and the journal
remain unchanged after each reader.

Both cases passed on native macOS, macOS Bun, native Linux, and Linux Bun. The
wrapped journal contains 6,291,504 bytes; each source file contains 1,048,576
bytes. The proof gate, script syntax checks, and diff checks passed. The cases
are included in the native and Bun batch paths. This step ran the eight new
platform/runtime cases without repeating unrelated core checks. This is a
behavior check, not a wrapper timing or memory measurement.

The fixture assigns fixed identities a and b. It does not implement stable host
identity assignment or filesystem lookup. Migration, wrapper performance,
editor integration, simultaneous writers, and power-loss behavior remain
incomplete.

### Host path identity provider

`tests/document_identity.c` now supplies a PATH1 identity for an existing
readable regular file. It resolves the requested path, checks the opened file,
and returns the scheme and resolved path bytes as hexadecimal. The Bend core
keeps these bytes opaque. Contents and inode numbers are not part of this
destination-based identity.

The host checks passed on macOS and Linux. Relative paths, directory symbolic
links, file symbolic links, and parent path components match the original
identity. The fixture includes a Unicode name with spaces. Different paths
with identical bytes have different identities. Atomic replacement preserves
the destination identity. Directory, missing-file, and FIFO targets are
rejected without output; the FIFO check does not block.

The one-MiB entry restart fixture now requests identities from this provider
in each writer and reader process. It no longer assigns fixed a/b keys. Both
owner and wrong-document cases passed on native macOS, macOS Bun, native Linux,
and Linux Bun. The new host and connected restart checks are in the batch.
The proof gate and script syntax checks passed. Unrelated core checks were not
repeated in this step.

This provider covers existing files and uses resolved save destinations as
identity. Rename/move handling, case aliases, Unicode path normalization,
hard-link policy, concurrent path changes, unsaved document identities,
application journal lookup, and editor integration remain incomplete.

### Filesystem spelling and hard-link policy

The path identity batch now checks uppercase DOCUMENT against document and
precomposed versus decomposed café.md names. It first checks whether the
filesystem resolves the alternate spelling to the existing file. Aliases must
share an identity. If the names are distinct, the test creates both files with
equal bytes and requires distinct identities. The macOS fixture treated both
case and Unicode forms as aliases; Linux treated both pairs as distinct names.
All checks passed. No global case or Unicode normalization was added to Bend.

The batch also creates a hard link to document. Its destination has a different
PATH1 identity. After atomic replacement of document, both destination
identities remain stable. The hard link retains the exact old bytes; document
has the exact replacement bytes. Both macOS and Linux passed these checks.
This confirms the current destination-based policy. It does not establish
in-place shared-inode editing behavior.

The new cases are included in the existing path identity batch. Script syntax
and diff checks passed. No production code changed in this step. Filesystem
variants beyond these macOS and Linux fixtures, rename/move migration,
concurrent path changes, unsaved identities, journal lookup, and editor
integration remain incomplete.

### Exact recovery candidate selection

`src/RecoveryLookup.bend` now selects among validated recovery entries. An exact
identity match is required. Zero matches return Missing; one returns Unique.
Multiple matches return Ambiguous with every matching entry in input order,
including duplicate records with identical state. Invalid requests retain the
query and all candidates as InvalidIdentity. Missing means no match in the
validated list; it does not establish that disk recovery data is absent.

Checks cover empty lists, unrelated identities with equal saved bytes, empty
and invalid requests, both unique-entry orders, different duplicate versions,
both duplicate orders, identical duplicates, and 65,536 unrelated entries before
the matching entry. Native one/four-thread, Bun, and Node checks passed on macOS
and Linux. The proof gate passed duplicate-retention and invalid-request laws.

The one-MiB persisted-entry fixture also now checks lookup before recovery.
Owner selection returns Unique; the other actual file has no matching candidate.
The existing entry guard and exact source/journal comparisons remain. Both
native and Bun cases passed on macOS and Linux. The new model and connected
checks are in the batch. Unrelated core checks were not repeated in this step.

Filesystem enumeration, invalid or unreadable journal reporting, duplicate
resolution, application journal lookup, rename/move migration, unsaved
identities, and editor integration remain incomplete. These checks do not
establish complete filesystem lookup or a catalog performance budget.

### Recovery directory host effects

`tests/recovery_directory.c` now supplies read-only directory effects. Listing
reports child directories as candidates and other entries as unsupported.
Names use hexadecimal bytes, so newline characters cannot become protocol
lines. A complete listing ends with END. Root failures return a nonzero status.
The listing has a one-MiB output bound; its overflow check is described below.
A read accepts one encoded child name, opens under the root, and reads
the child's regular document file. Symbolic links, parent traversal, separators,
NUL names, non-files, and records above eight MiB are rejected.

Host checks passed on macOS and Linux. They cover complete and empty listings,
unsupported root entries, missing records, symbolic links, FIFOs, invalid
encoded names, newline-bearing names, and byte-exact reads with NUL and 255.
Exactly eight MiB is accepted; one extra byte is rejected without record output.
Linux also passed enumeration and reading of a name with non-UTF-8 bytes. The
tested macOS filesystem rejected creation of that name with Illegal byte
sequence. The test checks and reports this limitation explicitly; macOS still
checks invalid UTF-8 record contents.

The new host effect checks are in the native batch. Compiler warning checks,
script syntax checks, and diff checks passed. No record parsing or document
semantics were added to C. Connecting enumeration to Bend validation and lookup,
invalid-file reports, output-limit stress checks, concurrent directory changes,
application storage, and editor integration remain incomplete.

### Scan errors without process exit

`RecoveryScan.scan` now returns `Completed{catalog}` or `Failed{root, reason}`.
Host exit errors, invalid listings, and process transport errors have separate
failure types. Candidate transport errors keep the encoded candidate name,
error code, and message in the rejected entries. Scanning does not call
`IO.die` or use `IO.try` to unwrap process results.

Native and Bun checks passed on macOS and Linux. Each missing-root and real
listing-limit case performs a successful empty-directory scan in the same
process after checking the failed outcome. Malformed successful host output
and injected transport failures also return the expected values. The mixed
catalog tests still check valid records, corrupt records, unsupported entries,
and duplicate ownership. The listing-limit fixture still checks all 2,200
directory names after the failed scan. `bend PROOF.bend` passed the standard
proof check. These checks do not verify error presentation in the editor.

### Larger successful recovery catalog

The connected directory scan fixture now adds 255 copies of the first valid
record. The resulting catalog has 258 accepted records with distinct origin
names and five rejected entries. Exact-identity lookup must return all 257
records for the duplicate identity as `Ambiguous`. Every matching record must
retain the expected full state. The second identity must remain `Unique`.
The shell check compares each added record with its original bytes after the
scan. The five rejection names and reasons must also remain correct.

Native and Bun checks passed on macOS and Linux. The fixture is part of the
existing batch runner. Script syntax, diff checks, and the standard Bend proof
check passed. This is a correctness check with small records. It does not
establish scan latency, memory use with large records, concurrent-directory
behavior, or editor recovery integration.

### Connected Bend directory validation and lookup

`src/RecoveryScan.bend` now parses the host's complete listing and reads candidate
records. It retains each accepted entry with its encoded origin name. Rejected
candidates retain their names and distinct UnsupportedType, ReadFailed, or
InvalidRecord reasons. Root failures and incomplete or malformed listings fail
the scan; they do not return a successful empty catalog. The accepted entries
feed the exact-identity lookup model. The full catalog remains available with
all rejection reports.

The connected fixture has two valid records with different identities and equal
empty saved baselines, a corrupt binary record, a directory without a record,
a symbolic-link alias, a regular note file, and a FIFO. A separate writer saves
the valid records through the atomic host and exits. Fresh scans must retain
both valid records and exactly five rejected candidates with the expected names
and reasons. Both valid identities must select their exact states. Adding a
copied record produces Ambiguous for its identity and keeps the other identity
Unique. A missing root fails explicitly. Checks also reject missing listing end
markers, appended listing data, malformed hex names, and empty names.

Unique and duplicate scans passed on native macOS, macOS Bun, native Linux, and
Linux Bun. Each runtime also checked the failed root. File comparisons confirm
that valid and corrupt records remain unchanged; symbolic links, FIFOs, and the
empty candidate directory remain intact. The proof gate passed origin and
read-error retention laws. Script syntax and diff checks passed. These cases
are in the native and Bun batch. Unrelated core checks were not repeated.

This is a small fixture with synthetic identities, not a large catalog or
performance measurement. Listing-limit stress checks, large directory scans,
concurrent directory changes, application storage, nonfatal UI error handling,
and editor integration remain incomplete.

### Real directory listing limit

`tests/recovery_directory_limit.c` creates 2,200 candidate directories with
250-byte names in a new isolated root. Their complete protocol listing would
contain 1,106,604 bytes, above the host's real one-MiB limit. The host must return
status 1, emit no completion marker, and keep partial output within the limit.
The connected Bend scan must fail with the directory scan error. It must not
return a catalog based on the partial listing.

Native and Bun checks passed on macOS and Linux. After each failed scan, the
fixture verifies all 2,200 exact names and directory types, with no missing or
additional entries. The default limit was used; no smaller test limit was
substituted. The cases are now in the native and Bun batch. Compiler warning,
script syntax, and diff checks passed. Production code did not change.

This verifies failure above the listing bound. Large successful catalogs,
streaming enumeration, concurrent directory changes, nonfatal UI errors,
application storage, and editor integration remain incomplete.

### Connected recovery plan

`src/RecoveryPlan.bend` connects a scan outcome, exact document identity, and stable
disk bytes. It retains the requested identity and the full catalog. A clean
catalog with one owner produces the existing recovery or conflict decision.
A clean catalog with no owner produces `NoMatch`. Invalid identities,
duplicate owners, or any rejected entry require `Review`. A rejected entry can
hide another owner, so even a unique decoded record does not establish unique
ownership in that case. A scan failure retains the root, failure reason, and
disk bytes as `Unavailable`. The plan makes no file writes.

Native and Bun checks passed on macOS and Linux. A real clean two-record scan
produces a restored edit for the saved baseline and a conflict for external
bytes. The larger mixed catalog produces review with all 257 duplicate records
and all five rejected entries retained. Additional cases cover a unique record
with a rejected neighbor, missing ownership with a rejected neighbor, empty
and invalid-byte identities, unavailable scans, and a clean empty catalog.
File-byte comparisons passed. The standard proof check covers the rule that
an incomplete catalog requires review. Editor presentation and user choices
are not connected to this plan yet.

### Real-identity recovery plan after restart

`tests/recovery_plan_restart.sh` uses a writer that stores an identity-bearing
recovery record directly in the catalog and stops with status 79 after the
atomic host has synced the record replacement and its containing directory. Its recorded
current, saved, and pending snapshots are three distinct one-MiB byte lists.
The test starts fresh reader processes against that same catalog. Each reader
obtains the canonical source identity from the
host, scans and validates the catalog, reads the actual source-file bytes, and
passes those values to `RecoveryPlan.prepare`.

The owner produces the exact restored state. A second destination with equal
source bytes produces `NoMatch` while retaining the full catalog and disk
bytes. An external one-byte change at the owner's unchanged path produces a
conflict with the complete recorded state and external bytes. Adding an
invalid record requires review while retaining the valid owner, rejection,
and external disk bytes. Every case compares retained identity and state
fields. Shell comparisons verify that readers change neither source file,
the stored recovery record, nor the invalid record.

Native and Bun cases passed on macOS and Linux. The fixture is in the batch
runner. Script syntax, diff checks, and the standard Bend proof check passed.
The writer now creates the stored catalog record before it stops; no record is
copied into the catalog after restart. The shell creates the directory tree
before the writer starts. This does not verify application catalog creation,
directory-tree durability, or power-loss durability.
Concurrent reads, editor recovery presentation, and application storage
lifecycle remain incomplete.

### Strict UTF-8 conversion for recovery text

`src/Utf8.bend` converts exact byte lists to Unicode text and back. Decode rejects
truncated sequences, invalid continuation bytes, overlong encodings, surrogate
code points, values above U+10FFFF, and list elements above 255. Encode rejects
invalid scalar values. Neither operation inserts replacement characters or
normalizes text. A caller must retain original bytes when conversion fails.

`tests/Utf8Check.bend` checks exact byte vectors for Chinese text, emoji, NUL,
CRLF, BOM, and each encoding-width boundary. Invalid-byte cases cover the
rejection classes above. A generated string includes every one of the
1,112,064 Unicode scalar values. Encoding must produce exactly 4,382,592 bytes;
decoding must reproduce every scalar in order. The loops and comparison are
tail recursive so the JavaScript test does not depend on call-stack depth.

The checks passed on native Bend, Bun, and Node on macOS and Linux. The native
test also constructs invalid Char values and checks encoder rejection. The
JavaScript runtime rejects those values during construction, so that case is
native only. The batch runner includes the shared and native checks. Script
syntax, diff checks, and the standard proof check passed. The proof gate adds
the rule that an unfinished sequence is rejected.

This establishes a text-conversion prerequisite. Recovery is not yet applied
to the editor session, and exact-byte handling for edits remains incomplete.

### Recovery plan to editor model

`src/RecoveryEditor.bend` opens a new `DirectState.Session` from a permitted plan.
It retains the exact requested identity, full catalog, and recovered save
state beside the editor model. Only the current bytes become text through
strict UTF-8 decoding. The saved baseline is not replaced by that text.
NoMatch opens the disk bytes with a clean save state. A restored edit opens
with its recovery state. Invalid current text, conflicts, review plans, and
unavailable scans return the complete original plan as `Blocked`.

`tests/RecoveryEditorCheck.bend` encodes and decodes an identity-bearing record,
prepares its recovery plan, and opens the editor model. The source contains
Chinese text, emoji, a combining mark, Markdown, BOM, CRLF, and NUL. Checks
compare the exact source and its re-encoded bytes, saved baseline, request
counter, dirty state, and cleared pending ticket. They cover both the saved
baseline and the interrupted-save snapshot as observed disk bytes. A pending
snapshot with invalid UTF-8 remains exact baseline bytes while valid current
text opens. New edits undo and redo correctly. Opening starts with empty
history and selection at zero; it does not reconstruct earlier edit history.

Invalid fresh-file bytes and invalid restored bytes remain blocked and intact.
Conflict, duplicate-owner review, and scan-failure cases also stay blocked with
their recorded state or disk bytes retained. Native checks on one and four
threads, Bun, and Node passed on macOS and Linux. These cases are in the batch
runner. Script syntax, diff checks, and the standard proof check passed. A new
law verifies that failed decoding retains the full plan.

This connects recovery to the editor model. It does not open a native window,
apply a recovery choice to an existing session, or update save bytes after
subsequent editor commands. File UI and the complete editing/save lifecycle
remain incomplete.

### Editor commands connected to save snapshots

`RecoveryEditor` now connects edit, undo, and redo commands to current UTF-8
save bytes. Selection changes only the editor model. Save requests and
completion use the existing save-state rules. An encoder failure returns
`RejectedEdit` with both the previous outcome and the attempted editor model.
Commands on a blocked outcome leave it blocked with its original plan.

The connected test starts from a decoded recovery record and restored editor.
It inserts Chinese text and emoji, deletes that insertion using native UTF-16
positions, and checks undo and redo. Every result compares identity, catalog,
editor source, exact current bytes, saved baseline, request counter, pending
ticket, and dirty state. It starts a save, makes another edit, then checks
successful, failed, uncertain, and stale completions. A second request cannot
replace the pending ticket. Undo after successful completion returns to the
saved snapshot; redo restores the later dirty edit. Selection retains save
state. An injected encoding failure retains both models, and blocked-command
checks retain invalid original disk bytes.

Native checks on one and four threads, Bun, and Node passed on macOS and Linux.
The cases use the existing recovery-editor batch entry. Script syntax, diff
checks, and the standard proof check passed. A new law checks failed-encoding
retention. Completion results are supplied by the test; these commands do not
write to disk or report results from a native file UI.

This is a correctness baseline that encodes the full source after each edit,
undo, or redo. Incremental byte updates and performance measurements remain
required before it can meet the product's local-edit target. Native-window
integration and file UI remain incomplete.

### Recovered model in the native event loop

`tests/NativeRecoveryCheck.bend` constructs and validates an in-memory recovery
record, prepares its recovery plan, opens the recovered editor model, and
starts a pending save request. It presents that model in the macOS native
window and uses the existing native driver for seven events: selection, emoji
insertion, undo, redo, selection inside formatting marks, Chinese marked-text
composition and commit, and emoji deletion.

After each event, the test synchronizes the editor result with current save
bytes. It compares the exact native source with Bend source, the expected
formatted text and caret, identity, current bytes, original saved baseline,
request counter, and unchanged pending-ticket snapshot. The composition driver
also checks that marked text does not emit a committed event before unmarking.
The timer driver has a timeout and requires no manual input. The native test
passed on macOS and is in the macOS batch. Script syntax, diff checks, and the
standard proof check passed.

This is a model-to-window integration experiment using an in-memory record.
It does not combine the real disk restart fixture with the window in one run.
The composition API is tested directly; physical keyboard input and IME
candidate-window behavior remain unverified. Linux native GUI support, file
UI, and incremental save-byte updates remain incomplete.

### Disk restart to native recovered editor

`tests/NativeRecoveryRestartCheck.bend` and `tests/native_recovery_restart.sh`
combine the disk and window paths in one experiment. The writer creates and
syncs the source file, obtains its canonical host identity, and atomically
stores an identity-bearing recovery record directly in the catalog. It stops
with status 79 after the replacement and containing-directory sync complete.
The shell starts a fresh process without copying any record into the catalog.

The reader obtains the identity from the actual source file, scans and
validates the stored record, reads the actual source bytes, prepares a recovery
plan, and opens the recovered editor model in the macOS window. It then runs
the same seven automatic native events as the in-memory experiment. Checks
compare exact catalog ownership and complete recorded state, current editor
and host text, formatted text and caret, current save bytes, saved baseline,
counter, and pending ticket. Shell comparisons confirm that the native reader
does not modify the source file or catalog record and creates no pending file.

The combined experiment and the updated in-memory test passed on macOS. The
combined case is in the macOS batch. Script syntax, diff checks, and the
standard proof check passed. This is a small-record process-restart check.
It does not verify power-loss durability, real IME candidate interaction,
large-record native opening, Linux GUI behavior, or an application file UI.

### Complete batch after recovery-editor integration

The complete `sh tests/check.sh` batch passed on macOS. The complete
`sh tests/linux.sh` batch passed in the Ubuntu 24.04 aarch64 image. Both finished
with status 0 and the final batch success marker. These runs include the new
UTF-8, scan-error, larger-catalog, recovery-plan, real-identity restart, and
recovery-editor command checks together with all existing parser, scene, save,
interruption, byte-preservation, and memory checks. Generated JavaScript file
checks ran with Bun on both systems. The macOS batch also includes the native
event-loop checks and the combined disk-restart-to-window experiment.

The document memory gate allows 200 MiB for 20 parse/edit cycles. The history
gate allows 300 MiB for 20 edits followed by undo and redo. Observed peaks were:

| System | Document gate peak, bytes | History gate peak, bytes |
| --- | ---: | ---: |
| macOS | 88,014,848 | 236,929,024 |
| Linux aarch64 | 87,179,264 | 236,466,176 |

These are core memory checks. They do not establish the product idle-memory
or frame-latency targets. Both complete batches ran without manual interaction.
Linux GUI behavior, real IME candidate interaction, file UI, and incremental
save-byte updates remain incomplete. No commit was made.

### Full-source save synchronization cost

`tests/RecoveryEditorBench.bend` measures 20 independent insertions at the
start of the existing one-MiB ASCII Markdown fixture. Each sample starts from
the same opened model with one pending save ticket. It measures editor work
and then `RecoveryEditor.sync` separately with `IO.now`. Checks after the
timed section compare exact current bytes, unchanged saved bytes, the pending
snapshot, identity, request counter, and original byte count. Opening and
native drawing are outside the timed section. The clock has millisecond
resolution. Both binaries use `--threads 1` and Bend 2.0.34.

The macOS reference computer reports Apple M4. Linux runs in the Ubuntu 24.04
aarch64 OrbStack container on that same computer. The runs were sequential.
Observed core edit-plus-synchronization times were:

| System | Median, ms | 95th percentile, ms | Range, ms |
| --- | ---: | ---: | ---: |
| macOS | 36 | 37 | 34–37 |
| Linux aarch64 VM | 41 | 44 | 40–48 |

The percentile uses nearest rank over 20 samples. Full-source synchronization
accounts for almost all observed time. Editor work measured zero milliseconds
in most samples and one millisecond in one macOS sample; these readings do not
establish submillisecond latency. Both correctness checks passed. The new
benchmark is included in `tests/bench.sh`. Script syntax, diff checks, and the
standard proof check passed.

The current synchronization path misses the 16 ms product target before
native drawing is included. It must not be presented as a responsive final
save-byte path. Incremental byte storage or deferred snapshot materialization
is needed; its correctness and complete event cost remain unverified.

### Persistent raw byte buffer experiment

`src/ByteBuffer.bend` uses the existing persistent AVL sequence with byte chunks
of at most 512 bytes. Cached byte lengths locate replacement ranges. Splits
copy only boundary chunks and join the retained tree branches. Saved and
pending versions can retain their old roots. The constructor rejects values
above 255 but preserves arbitrary valid bytes, including invalid UTF-8.
Materialization produces a flat byte list only when explicitly requested.
The positions in this API count bytes, not Unicode scalars or UTF-16 units.

`tests/ByteBufferCheck.bend` compares replacements with a separate flat-list
reference. It covers 64 pairs of small-buffer positions at chunk boundaries,
reversed ranges, and out-of-range positions. Another 25 range pairs cover a
one-MiB binary fixture near its start, middle, end, and beyond its end. Checks
validate AVL cache values, balance, leaf bounds, exact bytes, and old versions
retained after 20 edits. Removing those edits returns the original bytes.
Native checks on one and four threads, Bun, and Node passed on macOS and Linux.
The checks are in the default batch runner. The standard proof gate adds the
constructor rule for invalid input. Script syntax and diff checks passed.

`tests/ByteBufferBench.bend` uses the same one-MiB ASCII Markdown fixture as
the full-source synchronization benchmark. Each of 20 samples times 1,000
consecutive one-byte insertions at the start while retaining original and
pending roots. Validation and materialization happen after the timed section.
The native binaries use one thread. Both macOS Apple M4 and the Linux aarch64
VM on the same computer took 2–3 ms per group of 1,000 edits. Both benchmark
correctness checks passed. The benchmark is in `tests/bench.sh`.

This demonstrates local raw-byte storage work. It does not measure individual
event percentiles, document parsing, scalar-to-byte mapping, native drawing,
or save serialization. `RecoveryEditor` still uses full-source encoding and
flat save-state snapshots. Connecting the byte tree to that path and checking
the complete frame cost remain necessary.

### Persistent Unicode scalar to byte mapping

`src/TextByteMap.bend` builds matching AVL trees over text spans of at most 128
Unicode scalars. One tree caches scalar lengths and the other caches UTF-8
byte lengths. Construction and whole-span replacement update both trees with
independent parallel calls. A lookup follows matching tree paths and scans
only the selected span. It clamps positions beyond the document end and
reports mismatched tree shapes. The constructor rejects invalid scalar values.
Validation compares cached values, balance, span bounds, and matching content.
The span count uses a tail loop instead of the Base recursive list length.

`tests/TextByteMapCheck.bend` compares every scalar position in a mixed text
fixture with independent UTF-8 encoding of its prefix. The text includes
Chinese, emoji, combining marks, NUL, CRLF, and BOM. Checks repeat after a
persistent whole-span replacement and compare the corresponding raw byte
buffer edit with exact expected UTF-8 bytes. A one-MiB ASCII map additionally
checks start, chunk-boundary, middle, end, and clamped positions. Replacing a
middle ASCII span with Chinese and emoji checks unequal scalar/byte offsets,
the new final lengths, exact byte replacement, and unchanged old roots.

Native checks on one and four threads, Bun, and Node passed on macOS and Linux.
Native-only checks reject manually constructed invalid Char values; JavaScript
rejects those values at construction. The mapping checks are in the default
batch. Script syntax, diff checks, and the standard proof check passed. The
proof gate adds the invalid-text constructor rule.

This connects scalar positions to byte positions and supports persistent
whole-span updates. It does not yet handle arbitrary scalar edit boundaries
or connect the maps to `RecoveryEditor` commands. Native UTF-16 positions must
still pass through the existing source-position map first. Complete frame
cost remains unverified with this storage path.

### Scalar ranges inside persistent mapping spans

`TextByteMap.replace` now accepts arbitrary scalar edit ranges, including
reversed and out-of-range positions. It locates both boundary spans with cached
tree lengths, keeps their required prefix and suffix text, and rebuilds those
pieces with the inserted text. Unchanged spans remain in the old tree branches.
Invalid inserted scalar values return `None`. Large inserted text is joined
with tail loops; unchanged document prefixes and suffixes are not materialized.

The connected mapping check compares 121 range pairs with Unicode insertion
and the same 121 pairs with deletion against a flat-text reference. It covers
positions inside and at span boundaries, document endpoints, and clamped
positions. A 5,120-scalar Unicode insertion checks large input. A one-MiB
fixture now also receives an edit inside its middle span. Exact resulting
source bytes, unequal scalar/byte offsets, new final lengths, tree invariants,
and unchanged old maps and byte buffers are checked.

The expanded checks passed on native Bend, Bun, and Node on macOS and Linux.
Native-only invalid-Char tests also check rejection through the range-edit API.
The Node flat-text reference initially reached its call-stack limit. Tail
loops for its prefix extraction, concatenation, and byte counting fixed the
reference, and Node then passed the same cases. The default batch includes
these checks. Script syntax, diff checks, and the standard proof check passed.
The proof gate adds the invalid-replacement constructor rule.

The mapping can now update arbitrary scalar ranges. It is still separate from
`RecoveryEditor` commands and persistent save-state snapshots. Complete event
latency remains unverified with this storage path.

### Connected persistent text storage

`src/TextStorage.bend` keeps the byte buffer and scalar map in one snapshot.
Bytes are authoritative. Opening from bytes uses strict UTF-8 decoding.
A scalar edit calculates its byte range, updates both trees, and returns one
accepted snapshot. If a required step fails, it returns the original snapshot.
The edit encodes only inserted text. Old snapshots retain their tree roots.

`tests/TextStorageCheck.bend` checks 121 range pairs with Unicode insertion
and 121 pairs with deletion against an independent flat-text reference.
It checks span boundaries, reversed ranges, clamped positions, Chinese,
emoji, combining marks, NUL, CRLF, BOM, and a 5,120-scalar paste.
One-MiB checks compare exact bytes after middle edits and repeated insertions.
They also check that deletion restores the original content and that old and
pending snapshots remain intact. Invalid UTF-8 and failed map updates are
rejected. Native-only invalid-Char checks require the original bytes to remain.

The storage checks passed on native Bend, Bun, and Node on macOS and Linux.
Native storage checks used one and four threads on Linux; macOS checks used
the default thread setting and four threads. Structural validation checks tree
balance, span data, and matching total byte lengths. The test also compares
the complete cached text encoding with the authoritative bytes.

This storage model is not yet connected to `RecoveryEditor` or `SaveState`.
Their current edit path still encodes the complete source. No complete event
latency or native drawing result is established by this storage check.

### Persistent save snapshots

`src/PersistentSave.bend` stores current, saved, and pending bytes as persistent
byte buffers. Edits replace only the current root. A request retains that root
in a ticket without flattening it. A confirmed result uses the ticket bytes
as the saved baseline even when current bytes have changed. Stale results keep
the pending ticket. Uncertain results keep the complete state and prevent a
second request. Explicit load and materialize operations connect this model
to the existing flat save state at record and effect boundaries.

The connected test uses Unicode edits from `TextStorage`, starts a request,
then applies another edit before completion. It compares complete flat states
with `SaveState` for confirmed, failed, uncertain, and stale results. It also
checks the next ticket, load/materialize round trips, old text snapshots, and
arbitrary non-UTF-8 bytes in current, saved, and pending buffers.
Native one-thread and four-thread checks, Bun, and Node passed on macOS and
Linux. The default batch includes these checks. The standard proof check
covers retention of the state after an uncertain result.

The application has not yet switched to this model. Recovery, editor history,
disk reconciliation, dirty-state comparison, and complete event timing still
need to be connected and checked with persistent save snapshots.

### Persistent save reconciliation and exact comparison

`ByteBuffer.equal` compares bytes across different chunk boundaries without
creating a flat byte copy. It builds chunk traversal lists and uses a tail
loop over their bytes. It checks exact content, not a checksum. Equal buffers
still require a complete traversal; this is not a constant-time dirty check.
`PersistentSave.dirty` uses this comparison. Reconciliation compares a stable,
synced observation with the pending ticket and saved baseline. Other bytes,
stale ticket identifiers, and unsynced observations keep the pending request.

The persistent save check compares reconciliation with the flat `SaveState`
reference for pending bytes, old bytes, unrelated bytes, stale identifiers,
and unsynced observations. A one-MiB check replaces one byte with itself to
change chunk boundaries without changing content. Another changes the final
byte. These checks verify exact dirty-state results without flattening in the
operation under test. Complete event latency remains unmeasured.

These checks passed on native Bend, Bun, and Node on macOS and Linux.
Linux native checks used one and four threads; macOS used four threads.
The standard proof check includes retention after an unsynced observation.

### Persistent snapshots at the recovery record boundary

`PersistentSave.encode_record` explicitly materializes bytes for the existing
recovery record codec. `decode_record` validates the record before loading its
current, saved, and pending bytes into persistent buffers. This boundary does
not run on each edit. Raw non-UTF-8 bytes remain valid save snapshots.

The connected check round-trips an edited state with a pending request, a raw
binary state, and a one-MiB state through the record codec and persistent load.
It compares all flat fields after decoding. Trailing and malformed record text
is rejected. Separate load checks reject a value of 256 in each byte field.
These cases passed on native Bend with one and four threads, Bun, and Node on
macOS and Linux. The standard proof check and script/diff checks also passed.

These are in-memory codec checks. They do not establish disk restart recovery
with persistent editor history or switch the native application to this model.

### Persistent text history with save snapshots

`src/StorageHistory.bend` connects text storage to persistent save state. An edit
retains the prior text snapshot for undo and clears redo. Undo and redo restore
both text roots and update only current save bytes. A pending request and the
saved baseline retain their roots. Save completion updates save state without
changing text history. Loading validates current UTF-8, retains raw saved and
pending bytes, and starts empty history. Failed edits return the original session.

The connected check covers Chinese and emoji edits, undo/redo, branching after
undo, invalid current UTF-8, and loading with non-UTF-8 saved and pending bytes.
It starts a fresh save request, edits again, then checks undo before and after
confirmation. Redo after confirmation restores later text while retaining the
confirmed baseline. Every case compares exact source and complete flat save
fields. Native checks on one and four threads, Bun, and Node passed on macOS
and Linux. The standard proof check covers failed-edit retention.

This session does not yet include formatted scenes, native selections, or the
existing `DirectState` history. The native application still uses that history
and the old full-encoding save connection. Their integration and complete event
timing remain necessary.

### Formatted editor with persistent storage

`src/StoredEditor.bend` connects `DirectState` with `StorageHistory`. It uses the
formatted editor's native-to-source selection map before applying a storage
edit. Only an accepted storage result can update the formatted editor. Local
edits encode inserted text only. Selection changes leave storage unchanged.
Undo and redo restore both histories through independent parallel calls.

The connected check opens Markdown with Chinese, emoji, and CRLF, edits at
native positions, starts a save request, and edits again. It compares exact
formatted-editor source, storage text/bytes, and complete save fields. Undo,
redo, and save confirmation retain the required pending and saved snapshots.
Native checks on one and four threads, Bun, and Node passed on macOS and Linux.
The standard proof check covers retention of both models after a failed edit.

This is the connected Bend model. The existing native window loop and recovery
plan still use `RecoveryEditor`. Native IME events, selections inside hidden
Markdown, large-document timing, and restart recovery must be checked through
this new model before the application changes to it.

### Native input through persistent editor storage

`tests/NativeStoredCheck.bend` opens the macOS native text control with
`StoredEditor` and a pending save request. The existing native driver sends
seven actions without manual input: selection, emoji insertion, undo, redo,
selection inside Markdown, Chinese composition, and deletion. The driver
checks that marked text does not emit a committed change before composition
ends. Each event uses the persistent editor's native-to-source mapping.

After every event, the check compares native source with formatted-editor
source, persistent cached text with exact bytes, and all save fields with
the required current bytes, unchanged baseline, next identifier, and original
pending request. The final source, visible text, and caret match the previous
native driver fixture. The window closes automatically. This check passed on
macOS and is included in the macOS batch. Standard proof, script syntax, and
diff checks passed.

This checks the native marked-text lifecycle through the new storage model.
It does not test a physical keyboard IME candidate panel, add a Linux GUI,
establish complete event latency, or switch the application loop to this model.
The experiment rejects unexpected full-source-change events; support for those
events remains necessary before it can replace the application loop.

### Complete source replacement with persistent history

`StorageHistory.replace_source` validates and builds the complete replacement
text before retaining it as a new history snapshot. `StoredEditor.replace_source`
updates the formatted editor only after storage accepts it. It clears redo,
preserves undo, and changes only current save bytes. Complete replacement can
encode complete text; ordinary local edits keep their inserted-text path.

Connected checks replace an edited document with a Unicode heading containing
CRLF and NUL, undo, redo, and branch to an empty document. Exact source, stored
bytes, baseline, and pending save fields match the flat reference. Native Bend
with one and four threads, Bun, and Node passed on macOS and Linux. The standard
proof check covers retention of the session after failed replacement.

The macOS native check now also accepts a complete-source event. After the
seven native input actions, it injects that event, presents the replacement,
and undoes it. This injected event is distinct from the native driver actions.
Both presentations check native source, stored text, and complete save fields.
The native window closes automatically. The application loop still needs the
new storage connection and recovery-plan opening.

### Recovery plans opening persistent editor state

`src/StoredRecovery.bend` uses the existing recovery permission boundary to create
a `StoredEditor` session. A clean missing entry opens observed disk bytes.
A permitted restored entry loads its exact save state. Both cases retain the
requested identity and complete catalog. Invalid current UTF-8, conflict,
review, and unavailable plans return the complete original plan without writes.

The check opens both clean disk text and recovered Markdown, compares exact
source and save fields, checks catalog ownership, and edits then undoes the
recovered text. Invalid UTF-8 stays blocked. Conflict checks retain recorded
bytes and external bytes; unavailable checks retain root, error, identity,
and observed bytes. Native Bend, Bun, and Node checks passed on macOS and Linux.
The standard proof check covers retention after failed state loading.

These checks use constructed scan results. A real disk restart and native
input through this recovery opening path remain to be checked before the
application switches to persistent storage.

### Disk restart into the persistent native editor

`tests/NativeStoredRestartCheck.bend` uses the existing durable writer and
restart script. The writer creates the source file, obtains its real document
identity, stores the recovery entry through atomic replacement, and exits with
status 79. A fresh reader obtains the identity again, scans the real catalog,
reads disk bytes, and opens `StoredRecovery`. It checks the requested identity,
complete accepted record, recovered source, and exact save state before input.

The reader then starts a new pending save request and runs the native persistent
editor check. This covers selection, emoji insertion, undo, redo, committed
Chinese composition, deletion, and an injected complete-source event with undo.
Each input stage checks native source, persistent text, and save fields.
After the reader closes its window, the script compares both on-disk files
with copies taken after writer termination and checks that no pending files
remain. The complete check passed on macOS and is in the macOS default batch.
The standard proof, script syntax, and diff checks also passed.

This proves the tested process-restart path, not actual power-loss behavior.
It does not add a Linux GUI, test a physical keyboard IME candidate panel,
establish complete event latency, or switch the application loop.

### One-MiB persistent formatted edit timing

`tests/StoredEditorBench.bend` uses the same one-MiB Markdown fixture as the
earlier recovery editor synchronization benchmark. It opens persistent storage
and the formatted editor before timing, retains a pending save request, and
runs 20 independent insertions of `X` at native position zero from that same
opened state. Each sample times the complete `StoredEditor.edit` operation.
Exact editor source, persistent text and bytes, and all save fields are checked
after timing. Validation and materialization are outside the measured interval.

Native one-thread results on Apple M4 macOS and Ubuntu 24.04 aarch64 in the
Linux VM on that host were 0–1 ms for all 20 samples on each platform. Both
medians were 0 ms and the nearest-rank p95 was 1 ms. A 0 ms result means the
operation was below the one-millisecond clock resolution; it does not mean
zero work. The earlier complete-source encoding path measured median 36 ms
on macOS and 41 ms on Linux for this fixture. The new path removes that
complete-source encoding cost from this tested local edit.

This is not complete key-to-frame latency. It excludes native drawing, disk
operations, record serialization, exact dirty-state comparison, and opening.
It covers a start insertion from one retained state, not consecutive typing,
large paste, or edits in every document position. The benchmark is included in
`tests/bench.sh`. The standard proof, script syntax, and diff checks passed.

### Consecutive typing and exact dirty comparison

Correction: the restored-snapshot time below included final session disposal.
See the corrected retained-session measurements later in this document.

`tests/StoredTypingBench.bend` retains the pending request and all history
snapshots while applying 20 consecutive start insertions to the one-MiB
fixture. It measures each connected edit and then exact dirty comparison
separately. Afterward it checks the complete source and save state, undoes all
20 edits, checks the original content and pending request, and times the clean
comparison. Native one-thread runs passed on macOS and Linux.

On Apple M4 macOS, the first edit measured 8 ms, most later edits measured
0 ms, and one measured 1 ms. Dirty comparisons measured 16–18 ms. The clean
comparison after restoring the original snapshot measured 561 ms. On the
Ubuntu 24.04 aarch64 VM on the same host, the first edit measured 8 ms, later
edits measured 0–1 ms, dirty comparisons measured 18–20 ms, and the restored
clean comparison measured 594 ms. These clocks have one-millisecond resolution.

The byte equality function currently evaluates chunk traversal even when cached
lengths differ. Its tail loop also retains a false accumulator instead of
ending at the first mismatch. The checks establish exact results but expose
a remaining performance problem. Running this dirty comparison after each
key would consume or exceed the 16 ms target before native drawing. Length
rejection, early mismatch termination, and efficient equal-snapshot handling
remain necessary. This benchmark is in `tests/bench.sh`; it does not measure
native drawing or disk writes. The standard proof and script/diff checks passed.

### Rejecting unequal byte buffers before traversal

`ByteBuffer.equal` now rejects different cached lengths before building chunk
traversal lists. Its byte loop returns false after the first mismatch instead
of traversing the remaining bytes with a false accumulator. Exact comparison
still handles different chunk boundaries. No checksum is used for equality.

Expanded byte-buffer checks cover independent equal buffers, different lengths,
first/middle/final-byte differences, and equality after persistent deletion.
These and the connected save-state checks passed on native Bend, Bun, and Node
on macOS and Linux. The standard proof check covers unequal-length rejection.

The repeated one-thread consecutive typing benchmark measured all 20 insertion
dirty checks at 0 ms on both platforms, below clock resolution. Mac edit times
were 13 ms for the first and 0–1 ms thereafter; Linux times were 9 ms for the
first and 0–1 ms thereafter. Equal restored-snapshot comparison still measured
521 ms on macOS and 568 ms on Linux. The macOS and Linux runs used the same host
and ran concurrently. These results isolate the unequal-length improvement;
they do not resolve equal-snapshot cost or establish complete frame latency.

### Equal-snapshot traversal experiments

Correction: the restored-snapshot timings below included final session disposal
and do not isolate the comparison algorithms.

Two exact-comparison variants were tested and then removed because neither
resolved the equal-snapshot cost. A byte-first traversal with explicit fuel
loaded chunk lists only at boundaries. The restored one-MiB comparison measured
689 ms on macOS and 546 ms on Linux. A second variant compared matching tree
partitions through independent exact leaf calls and used the byte traversal
for different partitions. It measured 480 ms on macOS and 589 ms on Linux.
Both variants passed byte-buffer and persistent-save correctness checks on
native Bend, Bun, and Node on both platforms. Timing used native one-thread
runs; these single restored-snapshot measurements are not percentile results.

The simpler length-gated, early-mismatch comparison remains in the code.
Its standard proof and native correctness check passed after restoration.
The experiments do not establish that chunk-list inspection was the cause.
They show that rearranging exact traversal did not meet the target. A trusted
snapshot identity or another exact equality cache is needed to avoid repeated
content traversal when history restores a known snapshot. Independently built
equal bytes must still be recognized correctly; differing identities alone
cannot establish that content differs.

### Session-local snapshot identity and corrected comparison timing

`StorageHistory` now assigns each accepted text edit a session-local revision
identifier. Undo and redo retain those identifiers; the next identifier never
decreases. A save request retains the current identifier. Only a matching,
confirmed ticket can move it to the saved baseline. Loaded pending snapshots
have unknown identity. Opening establishes whether current and saved bytes
are equal with an exact comparison outside edit timing. Identifiers are not
serialized and must never be mixed between sessions.

`StorageHistory.dirty` and `StoredEditor.dirty` return clean immediately when
current and saved revision identifiers match. Different or unknown identifiers
use exact byte comparison. Tests cover a new revision with unchanged content,
undo after confirmation, edits after undo, stale results, uncertain results,
and failed saves. Native Bend, Bun, and Node history checks passed on macOS and
Linux. Connected editor, recovery, and macOS native input checks also passed.
The standard proof check covers the known-snapshot clean branch; it does not
prove the complete identity invariant for arbitrary manually constructed states.

The earlier restored-snapshot timings included release of the final session
reference and its redo history. They were not isolated equality timings.
`StoredTypingBench` now retains the session across the timed calls and checks
it again afterward. On macOS the cached restored check measured 0 ms and
the retained exact comparison measured 18 ms. A 0 ms result is below the
one-millisecond clock resolution. Session disposal remains a separate cost
that must be measured for the application lifecycle.

The corrected Linux run measured 0 ms for the cached restored check and
19 ms for retained exact comparison. The macOS disk-restart-to-native-input
check also passed with the new identity state, and both on-disk files remained
unchanged. Script syntax and diff checks passed.

### Native frame timing with persistent editor and save snapshots

`tests/NativeStoredBench.bend` uses the existing native document driver with
the one-MiB Markdown fixture. It opens `StoredEditor`, starts a pending save
request, and sends 20 consecutive end insertions through the macOS text control.
Each frame measurement includes native input, native-to-source mapping,
persistent text/save/history updates, scene patches, and viewport layout/display.
After the timestamp, the driver checks native text, styles, caret visibility,
source range updates, chunk reuse, and absence of complete projection/input
comparisons. Bend then checks exact source, persistent text/bytes, and all
save fields. The pending request keeps the original bytes throughout.

On Apple M4 macOS with native Bend on one thread, 20 frame samples measured
minimum 2.164 ms, median 2.319 ms, nearest-rank p95 2.468 ms, and maximum
17.533 ms. The maximum was the first edit after full-document scrolling.
This fixture's p95 is below 16 ms, but its first edit remains above that target.
This is a synchronous layout/display measurement, not a hardware display
presentation timestamp or a physical keyboard latency measurement.

Opening from already prepared bytes reached the native frame in 882.267 ms.
It included model/storage loading and presentation, but excluded fixture
generation, initial UTF-8 encoding, and disk reads. Full-document scroll layout
measured 760.911 ms. The open-frame resident measurement was 472,055,808 bytes
with the large fixture and reference models retained. It is not the product's
100-KiB idle-memory measurement. Opening still misses the 150 ms target.

The complete native check passed and closed its window automatically. It is
included in `tests/native_bench.sh`. The initial flat reference incorrectly
expected prefix insertion; the native driver inserts at the document end.
The corrected reference passed all 20 exact source/save checks. Standard proof,
script syntax, and diff checks passed. Other edit positions, large paste,
physical IME input, disposal latency, and other native platforms remain outside
this timing result.

### History clearing and complete session disposal

`tests/SessionDisposeBench.bend` measures native Bend release of the final
reference to a one-MiB `StoredEditor` session. Separate sessions are opened,
edited 20 times, and edited then undone 20 times. The final release is timed
without retaining the session afterward. A fourth case clears undo and redo
while retaining the current document, projection, save state, and identity.
After timing, exact source/save checks and no-op undo/redo checks verify that
history clearing kept the document open and unchanged.

One-thread macOS measurements were 127 ms for an opened session, 147 ms after
20 edits, 521 ms after 20 undos, and 0 ms for history clearing. Linux aarch64
measurements were 143, 166, 614, and 1 ms respectively. These are single samples
for each state, not percentile results. The clock resolution is one millisecond.
Fixture source and flat initial bytes remain outside the disposed session.
No native window or operating-system widget is released in these measurements.

`DirectState`, `StorageHistory`, and `StoredEditor` now expose explicit history
clearing. It retains revision allocation, current bytes, baseline, and pending
ticket; clearing does not confirm a save. Connected undo/redo and exact-state
checks passed on native Bend, Bun, and Node on macOS and Linux. The standard
proof check covers retained storage state. The disposal benchmark is included
in `tests/bench.sh`; script syntax and diff checks passed.

Complete-session release can block an interactive close or replacement path.
History clearing alone did not show that cost in these cases. A later lifecycle
experiment must schedule or bound final disposal and measure native close and
document replacement. This result does not establish a responsive close action.

### Deferred release and native close experiment

`src/SessionRelease.bend` transfers the session into an `IO.fork` action and
returns an owned completion channel. The caller joins before shutdown.
The native frame benchmark closes the window while retaining Bend state,
then dispatches release and waits for completion. On macOS with four threads,
window close measured 13 ms, dispatch measured 0 ms, and release completed
122 ms after dispatch. The native source/style/save checks still passed.

`SessionReleaseBench` tests a session with 20 edits and 20 undos. An immediate
timestamp initially suggested responsiveness, but a delayed heartbeat disproved
it. After dispatch, the benchmark requests a 10 ms sleep and then reads time.
On macOS the heartbeat arrived after 535 ms with four threads and 537 ms with
one thread. On Linux it arrived after 621 and 631 ms respectively. Dispatch
measured 0 ms in all four cases. Completion occurred at the heartbeat time.
The effect path remained blocked until disposal completed. These are single
native measurements, not percentile results. They do not identify the runtime
mechanism responsible for the delay.

This remains an experiment, not the application's close strategy. A fast fork
return does not establish responsive cleanup. The delayed heartbeat benchmark
is in `tests/bench.sh`. A small ownership check ensures that releasing an edited
session leaves a retained original snapshot intact. Native Bend, Bun, and Node
checks passed on macOS. The standard proof and script/diff checks passed.
The same small ownership check also passed on native Bend, Bun, and Node on Linux.
An actually bounded disposal path remains necessary.

### Byte-buffer release in small steps

`src/ByteRelease.bend` owns a queue of byte-buffer tree roots. Each step opens
at most the requested number of tree nodes. Branch children move into the
queue instead of being released recursively. A valid leaf contains at most
512 bytes. A pending result retains all unfinished work. Zero fuel keeps a
nonempty queue intact. Callers must consume pending queues until completion;
discarding one can cause a large recursive release.

The check releases a one-MiB tree in eight-node steps, verifies completion,
and compares a retained original buffer with its exact bytes. It also checks
zero fuel and an empty buffer. Native Bend, Bun, and Node passed on macOS
and Linux. The standard proof check covers zero-fuel queue retention.

The timing check owns the final buffer reference and inserts a one-millisecond
sleep between steps. The macOS one-thread run completed in 512 steps, with
maximum measured step time 1 ms and summed step time 53 ms. Sleep time is
excluded from the sum. This has one-millisecond clock resolution and is not
a hardware latency bound. These results cover byte-buffer trees only; they
do not cover document, scene, font, native widget, or complete-session release.
The Linux one-thread run also completed in 512 steps with maximum 1 ms and
summed measured step time 2 ms. Summing coarse timestamps does not establish
precise CPU time or a total cleanup deadline.
Checks and timing are included in the default batch and benchmark script.

### Complete text-storage snapshot release in small steps

`src/TextRelease.bend` queues a text snapshot's authoritative byte buffer and both
scalar-map trees. It uses `ByteRelease` for byte-tree nodes and opens map-tree
nodes individually. Each valid map leaf holds at most 128 scalars. Each step
retains unfinished branches in the queue rather than dropping a complete root.
Callers must consume pending queues and use valid storage snapshots.

The check releases changed Unicode text while retaining both original and
changed snapshots. It compares exact Chinese, emoji, combining marks, NUL,
and CRLF afterward. It also completes one-MiB and empty-snapshot release.
Native Bend, Bun, and Node checks passed on macOS and Linux. The standard
proof check covers zero-fuel queue retention.

The native one-thread timing check owns the last snapshot reference and opens
at most 32 work items before a one-millisecond sleep. The one-MiB ASCII snapshot
completed in 1,152 steps on both platforms. Maximum measured step time was
1 ms on macOS and 3 ms on Linux; sums of measured step times were 96 and 10 ms.
The clock resolution is one millisecond, and these sums exclude sleeps and
do not establish precise CPU time or a total cleanup deadline.

This covers text-storage bytes and mapping roots. Save-state/history snapshots,
formatted document trees, scene caches, and native widgets are not yet released
through this queue. It does not establish responsive complete-session disposal.
Checks and timing are in the default batch and benchmark script; script syntax
and diff checks passed.

### Save-state and history release in small steps

`TextRelease.begin_history` now queues the current text snapshot, each undo
and redo revision, and the persistent save state. Save-state release queues
current and saved byte roots plus any pending ticket bytes. No full snapshot
list or tree root is discarded directly. Unfinished work remains owned by the
queue. This operation makes no disk writes and does not confirm pending saves.

The check releases a session with undo and redo history, Unicode current text,
and non-UTF-8 saved/pending bytes while retaining other sessions. Exact text
and complete save-field checks verify the retained original and later edits.
It also releases a confirmed-save state. Native Bend, Bun, and Node checks
passed on macOS and Linux. Existing text-snapshot checks and the standard
proof, script syntax, and diff checks passed.

The native one-thread timing case opens a one-MiB ASCII document, starts a save
request, makes 20 edits, undoes all 20, and transfers the last session reference
to the queue. At 32 work items per step, both platforms completed in 24,615
steps. Maximum measured step time was 1 ms on macOS and 3 ms on Linux. Sums
of measured step times were 473 and 20 ms respectively. The clock resolution
is one millisecond, so these sums do not establish precise CPU time.

Each timing step is followed by a one-millisecond sleep. This scheduling policy
therefore requires at least 24.6 seconds of requested sleep time alone. Shared
roots are traversed again for each revision. The experiment limits measured
work per step but does not yet provide efficient total disposal or a bounded
queue policy for repeated document closes. Formatted document/scene data and
native widgets remain outside this release queue. The new check and timing case
are included in the default batch and benchmark script.

### Formatted document and scene release in small steps

`src/SceneRelease.bend` queues the formatted editor's current document, undo/redo
documents, raw view, host chunks/patches, cache trie, and scene position tree.
It opens containers individually. Large document text, visible text, run text,
and position lists are consumed in groups of at most 128 scalars or points.
A large paragraph or run is therefore not discarded as one leaf value.
Pending queues retain all unfinished work.

Checks release edited sessions while retaining original and later snapshots.
They compare exact Unicode/CRLF/NUL source and retained projections with an
independent scene rebuild. Direct 64-KiB text/run/point-list fields and empty
sessions complete release. Native Bend, Bun, and Node checks passed on macOS
and Linux. Native-only checks also open and release a real 64-KiB paragraph.
The standard proof check covers zero-fuel queue retention.

The native one-thread timing case owns the last reference to a 100-KiB formatted
document and opens at most 32 work items before each one-millisecond sleep.
Both platforms completed in 7,903 steps. Maximum measured step time was 1 ms
on macOS and 0 ms on Linux; measured sums were 101 and 0 ms. Zero means below
the one-millisecond clock resolution, not no work. Requested sleep time alone
exceeds 7.9 seconds. These measurements do not establish precise CPU time,
a total cleanup deadline, or responsive native document close.

Opening the real 64-KiB single paragraph in generated JavaScript reached a
machine stack limit before opening completed. Native opening passed. Direct
large-field disposal passed on JavaScript, so the opening limitation is kept
separate from the disposal check. Its exact parser/scene cause remains unproved.
The native long-paragraph check, portable release check, and timing case are
included in the batch and benchmark script. Script syntax and diff checks passed.
Full persistent-session integration and efficient scheduling remain necessary.

### Combined editor release and scheduling budgets

`src/EditorRelease.bend` takes ownership of both halves of a `StoredEditor` session.
Independent scene/document and text/history steps can run in parallel. The
budget applies separately to each half. Completion requires both queues to
finish. Its IO drain yields between steps and returns an owned pending queue
if fuel is exhausted. Callers must continue pending work instead of discarding
it. Retained-session and pending-save checks, including zero-fuel ownership,
passed on native Bend, Bun, and Node on macOS and Linux.

Native one-thread timing used a 100-KiB Markdown session with 20 edits followed
by 20 undos. At a budget of 256 items per half, macOS completed in 2,513 steps,
maximum 4 ms, and elapsed 5,733 ms. Linux measured 2,513 steps, maximum 4 ms,
and elapsed 5,002 ms. At 1,024 items per half, both needed 629 steps; macOS
maximum was 16 ms and elapsed 1,810 ms, while Linux maximum was 9 ms and
elapsed 1,551 ms. These are individual runs. Elapsed time includes requested
one-millisecond sleeps and scheduling overhead. The larger budget leaves too
little margin for the 16 ms frame target in the observed macOS run.

`EditorReleaseHeartbeat` dispatches the 256-budget drain with `IO.fork`, then
requests a heartbeat after 10 ms before joining completion. On macOS the
heartbeat arrived after 11 ms with both four threads and one thread. Completion
measured 4,966 and 5,738 ms respectively. On Linux the heartbeat arrived after
12 and 11 ms; completion measured 5,149 and 4,977 ms. Dispatch measured 0 ms
in all four cases. Unlike complete-root deferred release, the measured effect
heartbeat runs before disposal completes. It does not test native UI events
or prove responsiveness throughout all cleanup phases.

The checks and timing cases are in the default batch and benchmark script.
The standard proof check covers combined completion. Script syntax and diff
checks passed. Total cleanup remains slow, and no policy yet bounds retained
jobs when users close many documents. Native close/input during cleanup and
that job policy remain necessary before application adoption.

### Native input during editor release

`NativeReleaseCheck` starts release of an owned 100-KiB session with 20 edits
and 20 undos, then runs the existing native persistent editor check in a
separate window. The driver checks selection, emoji input, temporary and
committed Chinese composition, undo, redo, source replacement, and save-state
preservation. The window closes before the release job is joined.

On macOS, with one Bend thread, input checks completed after 256 ms and release
completed 5,694 ms later (5,950 ms total). With four threads, input checks took
257 ms and release completed 4,966 ms later (5,223 ms total). Both runs passed.
These results show that the tested native events can run before release finishes.
They do not establish physical keyboard latency, candidate-panel behavior,
per-event frame latency, or input responsiveness throughout every release phase.
The default macOS batch now runs both thread counts. The standard proof check,
shell syntax check, and diff check passed. The full batch was not rerun here.

### Zero-pause release experiment

`EditorRelease.drain_with_pause` makes the pause between bounded steps explicit.
The existing `drain` keeps its one-millisecond pause. A separate process runs
`NativeReleaseZeroCheck` with pause zero and the same 256-item budget.

On macOS with one thread, native input checks passed after 253 ms; release ended
47 ms later, for 300 ms total. With four threads, input checks passed after
257 ms; release ended 178 ms later, for 435 ms total. The one-millisecond control
run measured 256 ms for input and 5,959 ms for total release. These individual
runs indicate that requested pauses account for much of the earlier elapsed
time. They do not measure a release-only CPU cost or prove platform-wide
fairness for zero-duration sleeps. Native composition and history checks passed
before cleanup ended in both zero-pause runs.

Running the two native cases in one process first caused a timeout in the second
window. Running the zero-pause case alone passed. The exact repeated-window
cause remains unknown. The default macOS batch uses separate processes for
both pause settings and both thread counts. Linux and JavaScript zero-pause
scheduling remain unverified. Standard proof, shell syntax, and diff checks
passed; the full batch was not rerun.

### Portable zero-pause scheduling

`EditorReleaseZeroHeartbeat` uses the same 100-KiB history and 256-item budget
with a zero-duration sleep between steps. Native macOS measured a 10 ms
heartbeat and 51 ms total release with one thread, and a 10 ms heartbeat and
200 ms total release with four threads. Linux aarch64 measured 10/53 ms with
one thread and 10/224 ms with four threads. The heartbeat was scheduled before
release completed in all four individual runs. These release-only timings
exclude native window work. Four-thread scheduling was slower for this case;
parallel syntax does not guarantee a speed gain for these small steps.

Bun and Node both failed with a machine stack error before the first diagnostic
(`Editor release fixture prepared`). No release job had been dispatched.
This full fixture therefore supplies no JavaScript scheduling evidence. Smaller
portable ownership checks remain separate. The exact fixture construction
failure needs investigation. The zero-pause native timing case is included in
the benchmark script. The default drain still requests a one-millisecond pause.
The standard proof check, shell syntax check, and diff check passed.

### Large fixture construction repair

The Markdown fixture used `String.repeat` followed by `String.take`. The latter
constructs its result after a recursive call for each character. Replacing this
path with a cyclic, tail-call generator and tail-call reversal allowed fixture
construction to finish on both JavaScript runtimes. Independent pattern checks
passed for empty, 130-byte, 100-KiB, and 1-MiB fixtures on native Bend, Bun, and
Node on macOS and Linux. The checks are in the default batch.

With the repaired 100-KiB fixture, Bun completed the full zero-pause history
release experiment: dispatch 1 ms, heartbeat 12 ms (2 ms late), and release
completion 119 ms. Node prepared the fixture but failed with a machine stack
error during session load, before the loaded diagnostic or release dispatch.
The fixture repair therefore supplies Bun scheduling evidence, while Node's
large-session load remains unresolved. No native GUI or browser scheduling
claim follows from this command-line JavaScript check.

### Node large-load isolation

`LargeLoadProbe` checks the same 100-KiB fixture in stages. Node completed
storage load, then failed in document parsing. Changing document block assignment
to a tail-call loop with a reversed accumulator allowed parsing to complete.
The loop retains source order and sequential block identifiers. Parsing also
uses a tail-call scalar count instead of the recursive Base string length.
Changing the scalar count alone did not remove the failure; changing assignment
did. Node still fails while constructing the formatted editor, after the parsed
diagnostic, so large editor load is not yet repaired.

The document edit batch passed on native Bend, Bun, and Node on both macOS and
Linux after the change. The standard proof and diff checks passed. The probe
remains a diagnostic case and is not a passing default-batch gate.

### Large formatted-editor load repair

The scene-cache list scan waited for a recursive tail result before adding each
block. It now uses a tail-call loop, accumulates reversed updates, scene chunks,
and host chunks, then reverses those lists once. This retains block order,
selection offsets, cache entries, and rebuilt/reused counts.

Node now completes the 100-KiB storage, document, and formatted-editor load
probe on macOS and Linux. Scene-cache checks passed on native Bend, Bun, and
Node on both platforms. Connected stored-editor checks passed on Bun and Node
on macOS. The load probe is now included in the default batch.

Node also reaches history preparation in the zero-pause heartbeat experiment.
It then reports `Cannot find module 'bun:ffi'` when the fork effect is used,
on both platforms. That runtime dependency prevents Node scheduling evidence;
it is separate from the repaired large-load stack failures. The standard proof,
shell syntax, and diff checks passed. The full batch was not rerun here.

### Complete batch after persistent storage and release work

`sh tests/check.sh` on macOS and `sh tests/linux.sh` on Linux aarch64 both
finished with exit status zero after the fixture, document assignment, and
scene-cache scan repairs. The batches include persistent bytes, scalar maps,
text storage, save snapshots, history, stored editor/recovery connections,
bounded release, large load, scene/index/document checks, real disk restart
and interrupted-save cases, host interfaces, and generated JavaScript checks
using Bun. Node checks reported in earlier sections were separate runs; the
default batch selects Bun when it is present.

The macOS document-memory test peaked at 79,626,240 bytes, and the history test
at 221,396,992 bytes. Linux measured 79,048,704 and 220,356,608 bytes. These are
core retained-memory gates, not application idle memory.

macOS also passed automated native composition, editing, recovery restart, and
input during release. One-millisecond release pauses measured 5,611/5,498 ms
total with one/four threads. Zero-pause release measured 372/526 ms; native
input checks finished after 286/284 ms, before release completed. These runs
shared the host with the Linux batch, so they are functional checks and
individual timing observations, not isolated performance samples.

The complete batches do not establish Linux GUI support, physical keyboard IME
translation, full CommonMark, product idle memory, or the opening/frame targets.
The main application still needs persistent storage and recovery integration.

### Repeated native window timeout repair

The two-window release check reproduced the previous timeout before changes.
The native test driver created a timeout for each event, but source inspection
did not cancel it. Enqueue then overwrote the timer reference, leaving earlier
timers active in the modal run loop. A later window could run one of those
stale timers. The driver now cancels its timeout before each enqueue and when
source inspection completes. The active event still has its three-second limit.

The same two-window check passed afterward with one and four Bend threads.
Each window ran native selection, text input, composition, undo, redo, and
source/save checks while a separate editor was released. The check is in the
macOS batch. It establishes the tested repeated-window lifecycle; it does not
provide document tabs or simultaneous-window behavior. The standard proof,
shell syntax, and diff checks passed. The full batch was not rerun after this
test-driver-only change.

The standalone native direct check failed once with `Direct editing check
failed`, then passed on an immediate rerun of the same binary. The cause is
unresolved. This is separate from the repeatable stale-timeout failure and must
remain visible when assessing native driver reliability.

### Persistent storage in the app input loop

`LiveParagraph.main` now opens a `StoredEditor` session. The shared
`finish_stored` loop handles selection, native range edits, full-source changes,
undo, and redo. Storage validates an edit before the native scene is presented.
Rejected replacements restore the prior projection. The old direct-state
interface remains available to its existing checks.

`NativeStoredCheck` now calls the app's shared loop instead of its own event
dispatch. The macOS native check passed, including composition and exact source,
current bytes, saved baseline, pending ticket, and history checks. A scripted
Linux terminal check applied Chinese Markdown, then undo and redo, and checked
all storage/save fields after each event. It passed and is in the Linux batch.
Native Linux and Bun/Node no-input app runs passed. The standard proof, shell
syntax, and diff checks passed. The full batch was not rerun after this change.

This connects persistent text storage to editing. It does not connect file
dialogs, disk save commands, startup recovery, or bounded cleanup to the app.
Those connections remain required. Close retains the existing root-disposal
path, whose latency remains a known limitation for large sessions.

### Read-only document opening

`DocumentOpen` reads raw file bytes, closes the file handle, and then constructs
the persistent editor. Invalid UTF-8 returns its exact raw bytes. Read errors
return an error outcome. The bounded read requests 8 MiB plus one byte and
rejects input beyond the 8-MiB limit rather than opening a truncated prefix.
The app can select this path with `MARKDEW_OPEN_PATH`.

Native Bend and Bun checks passed on macOS and Linux for a BOM/Chinese/emoji/
CRLF/NUL file, invalid UTF-8, an empty file, and a missing path. Small bound
checks cover exact-limit and over-limit decisions; a real 8-MiB boundary-file
check remains necessary. The Linux app opened a real Chinese CRLF fixture and
closed automatically at EOF. These checks are in the native and Bun batch.
The invalid-byte retention law, standard proof check, script syntax, and diff
checks passed. No disk-write or recovery-startup behavior is added to the app.
File dialogs, startup catalog lookup, save, and file-change detection remain
incomplete. The full batch was not rerun after this connection.

### Real document-opening size boundary

`DocumentOpenLimitCheck` reads two real files. The exact 8-MiB file starts with
an invalid UTF-8 byte; it must return InvalidUtf8 with exactly 8 MiB retained.
This checks that the size gate permits the boundary before validation, without
building an 8-MiB formatted scene. The 8-MiB-plus-one file must return TooLarge
with the complete bounded prefix. Independent file copies are compared after
the reads, so neither input may change.

Native Bend and Bun passed both cases on macOS and Linux aarch64. The test
creates its files in a fresh temporary directory and removes them afterward.
The native and Bun cases are in the default batch. This proves the tested read
and size boundary; it does not prove that an 8-MiB valid document can be edited
within the product memory or latency limits. The standard proof, shell syntax,
and diff checks passed. The complete batch was not rerun for this test addition.

### Architect review and complete bounded reads

The architect found that a single positive read does not prove EOF.
`DocumentOpen` now retains raw chunks until an empty read. Each request is at
most 4,096 bytes or the remaining limit-plus-one space. Completion, error,
oversize input, and fuel exhaustion close the file. Only EOF permits an editor
to open. The architect reviewed the correction and found no required issue.

Split-read checks passed on native Bend, Bun, and Node on macOS and Linux.
They cover split UTF-8, an error after a prefix, and the aggregate size limit
crossed in a later read. Real native size-boundary checks also passed. These
transition checks do not force short reads through the host effect. Concurrent
file changes can still prevent a stable snapshot.

Real one-MiB native file checks passed on both platforms for Unicode edit,
undo, redo, exact source/storage/save fields, and unchanged disk. They do not
independently compare formatted runs or cursor maps. Bun failed on the large
case on both platforms; that case is excluded from the passing batch.

The diagnostic isolated one Bun failure to the block parser's final large
List.append. Tail-call reversal repaired block and document parsing. Index
construction also uses a tail-call list count. The architect confirmed that
both changes retain order and counts. One-MiB formatted-editor creation still
fails. macOS native/Bun/Node document regression checks and the standard proof
check passed. The complete batch was not rerun after these changes.

Destination identity, startup recovery, explicit save results, protected dirty
close, and scheduled cleanup remain required app connections.

### One-MiB Bun scene and source repair

The staged `LargeSceneProbe` isolated cache construction after scene scan.
Tail-call counts replace Base List.length in the bulk-cache parallel threshold
and scene-index reuse count. Each keeps the same count and decision. The probe
then completed scene scan, cache, and index construction. The architect reviewed
both changes before implementation.

The full file check then isolated complete source reconstruction. A tail-call
loop now visits blocks and characters in source order, accumulates reversed
characters, and reverses once. The architect confirmed that this preserves
exact source order, including Unicode and line-ending characters.

The complete real one-MiB file check now passes on Bun on macOS and Linux.
It checks load, Unicode insertion, undo, redo, exact source/storage/save fields,
and unchanged disk. Its Bun batch entry is restored. Cache regression checks
passed on native Bend, Bun, and Node on both platforms. Document regression
checks passed on Bun and Node on both platforms; the native scene-index check
and standard proof check passed on macOS. This is correctness evidence, not a
native first-frame or performance measurement. Large Node behavior, large
piece-list reconstruction, and independent full scene/map comparisons remain
outside these checks. The complete batch was not rerun after these repairs.

### Independent one-MiB view comparison

`DocumentOpenLargeViewCheck` enables complete indexed-view comparison against
the separate `Scene.build` path after load, Unicode edit, undo, and redo. It
compares visible text, every styled run, and every source map point. Native
macOS and Linux passed. The ordinary portable large-file check retains its original
source/storage/save scope; the new view check is a separate native batch gate.

Bun passed source/storage comparison but initially failed constructing the
indexed view. Its visible-text builder used non-tail recursion over runs.
Tail-call character accumulation with a final reversal repaired that stage;
Bun now forces the complete indexed view. The independent reference comparison
still reaches a stack limit. The architect reviewed the diagnostic order and
identified reference scene construction and recursive comparators as next
stages to isolate. JavaScript full-view comparison remains unproved. This does
not establish a rendering defect or native frame latency. Standard proof and
diff checks passed; the full batch was not rerun.

### Complete one-MiB JavaScript view comparison

The isolated reference scene builder failed on Bun before comparison began.
A tail-call scan now accumulates each piece's reversed runs and map points,
omits each local final boundary, and emits the final source boundary once.
The architect confirmed that this preserves the original scan/join result,
including empty pieces and nonzero starting offsets. The construction probe
then passed.

The full comparison next reached a stack limit. The checker now compares
visible/run text with the existing tail-call scalar comparator and uses tail
loops for run and point lists. Every character, style, and point is still
compared. Negative checks reject changed run text, changed style, an interior
point difference, and unequal lengths. The architect reviewed these changes.

The complete one-MiB file/view check passed on Bun on macOS and Linux after
load, Unicode edit, undo, and redo. Its Bun batch entry is now included. Small
view checks passed on native Bend, Bun, and Node on both platforms; added
negative checks passed on those runtimes on macOS. Standard proof, script
syntax, and diff checks passed. This does not prove large Node support, native
frame latency, or the single-long-paragraph path. The full batch was not rerun.
# Startup path boundary

## Resolved-file replacement and resource checks

The native worker check replaces the resolved destination after EOF and before
the final validation. Both macOS and Linux returned ESTALE. The check preserves
and compares the original hard-link bytes, the worker's read bytes, and the
replacement bytes. It checks descriptor counts and calls the real result-packing
function on success and failure. Thirty-two repetitions cover directory, FIFO,
missing, and oversized targets. Clang warning checks, AddressSanitizer, and
UndefinedBehaviorSanitizer passed on both platforms. Linux LeakSanitizer also
reported no leaks. The replacement hook exists only when the test macro is
defined; normal builds contain no hook call.

Both complete platform batches with bounded cursor dispatch finished successfully
before these resolved-file tests were added to the runner. The new host checks
have focused platform evidence; app integration is still pending.

## Full Linux batch with repaired cursor consumption

The complete Ubuntu aarch64 batch finished successfully after bounded cursor
dispatch and all scalar, cursor-boundary, long-paragraph, long-literal, and
closed-fence checks were added. Its history-memory check measured 242,679,808
bytes under the unchanged 300-MiB limit. The current resolved-file prototype
has separate focused macOS/Linux evidence and was not in this batch. The
macOS full batch is still running.

## Main-source history memory after bounded dispatch

The unchanged complete history-memory gate passed with the adopted cursor
dispatch. macOS measured 242,843,648 bytes; Ubuntu aarch64 measured 242,155,520
bytes. Both runs checked every source character after 20 edits, 20 undo moves,
and 20 redo moves. The limit remains 300 MiB. These are history model checks,
not product idle-memory measurements. Fresh complete platform batches are
running with the repaired helper and all new long-text checks.

## Cursor consumption and history memory

A controlled Linux copy restored only the earlier cursor-consumption function.
The complete history peak fell from 1,062,792 KiB to 236,500 KiB. A bounded
dispatch then used that recursive path for at most 128 visible scalars and kept
the tail path for longer runs. Its complete history peak was 237,108 KiB.
The same copy passed the 65,536-character exact maps on Bun and Node and dispatch
boundaries 127, 128, and 129 on native macOS, Bun, and Node. Escapes and source
exhaustion remain exact. A native long-paragraph cleanup check used 9,322,496
bytes maximum RSS. The architect reviewed the change. The runtime cause of
the unbounded memory increase remains unknown. Main-source memory checks are
running on both platforms; the 300-MiB gate remains unchanged.

## History memory regression after long-paragraph repairs

The Linux batch with the long-paragraph repair failed the unchanged 300-MiB
history gate at 1,087,680,512 bytes. An isolated run of the current source also
failed at 1,087,959,040 bytes. This is a reproducible regression. Separate edit,
undo, and complete-history mode measurements are running to locate the increase.
No memory limit was increased. The complete macOS batch remains in progress.

The current long literal and closed-fence checks passed in the Ubuntu aarch64
container on native Bend, Bun, and Node. These focused checks do not resolve
the history-memory failure or establish complete batch success.

## Complete long fence

A closed backtick fence with 65,536 body characters and a final newline passed
native macOS with four threads, Bun, and Node. The check compares the parsed
source, visible code text, style, and every source point. It covers inactive
fences with hidden marks and active fences with exact visible source. This is
one long code line; many code lines remain a separate size case.

The macOS full run started before the literal repair became inconclusive after
the running shell read a changed batch script and reported a quote error.
The current script passed `sh -n`. The next macOS run uses a fixed temporary
copy of the runner, preserving every test. The earlier passing partial output
does not establish complete batch success.

## Long literal text

The literal scene check now uses 65,536 mixed Unicode scalars, including Chinese,
emoji, combining marks, CRLF, and NUL. It first reproduced the Bun stack failure
in `literal_points`. A tail loop preserves all offsets and appends the supplied
final boundary exactly once. Exact text, style, and all map points passed on
native macOS with four threads, Bun, and Node. The standard proof check passed.
The full platform batches were already running before this literal-path change.
Complete fenced-code parsing remains a separate check.

## Long paragraph follow-up

A separate 65,536-character paragraph probe reproduced Bun's stack overflow.
The original test used non-tail `String.repeat`. The replacement fixture keeps
the exact text and size and uses the existing tail fixture builder. A tail
line-to-string builder then repaired long-line block parsing. The probe now
passed fixture counting and block parsing, then failed in Markdown run creation
before projection mapping. This case remains open. BlockScene uses a tail
scalar count for its paragraph source lengths. The complete batches started
before these follow-up changes and cannot verify the entire latest worktree.

Further stage checks passed after tail scalar conversions in Markdown rendering
and Projection, and a tail cursor-consumption loop. The same 65,536-character
fixture now passes Markdown run creation, projection-part creation, and inline
run creation on Bun. Complete cursor mapping still overflows. Small conversion
and cursor-consumption checks passed on Bun and Node. The Linux batch that
started before these changes finished successfully; it is baseline evidence.
The macOS batch also finished successfully. Neither result verifies all later
long-paragraph changes. Current small direct-edit checks passed on Bun and Node,
and the standard proof check passed.

The long paragraph reference map now passes on Bun after tail map assembly,
point offsets, and final-point removal. The test checks every point from zero
through 65,536 and checks empty and singleton final-point removal. Complete
editor creation and bounded cleanup preserve retained source on Bun and Node.
The new scalar, cursor-consumption, reference-scene, and JavaScript long-release
checks are now in the complete batch runner. Fresh platform runs are required
to verify these changes with the other experiments.

The startup path check now runs in `tests/check.sh`. On macOS, native Bend,
Bun, and Node passed missing, empty, and Unicode path settings. The native
check also rejected invalid UTF-8 environment bytes. A separate JavaScript host
check passed with no `process` object and rejected unpaired UTF-16 surrogates.
These checks test configuration. They do not establish Node file effects,
browser application startup, or Windows builds.

## Return command core measurement

The baseline preflight run of `sh tests/return_bench.sh` passed on 2026-10-03.
The reference computer used Apple M4, 32 GiB RAM, macOS 25.5.0 arm64, Bend
2.0.34, and four native CPU threads. No MarkDew test batch ran at the same time.
Other applications were not controlled.

Each size uses 20 independent Return commands from the same selected baseline.
The baseline ends with `\n- x`. Each command inserts a newline and list prefix.
The clock includes the core command and cached source, byte, scene, and dirty
state checks. Exact source, storage, caret, view, undo, and redo checks follow
each sample outside the clock. Baseline checks precede the first sample.

| Source size | Median | Sum of 20 samples | Samples in ms, in order |
| --- | ---: | ---: | --- |
| 100 KiB | 24 ms | 461 ms | 12, 16, 20, 21, 22, 23, 24, 23, 25, 23, 25, 25, 24, 26, 27, 25, 26, 26, 24, 24 |
| 1 MiB | 440 ms | 8380 ms | 167, 307, 402, 438, 445, 444, 448, 440, 447, 442, 431, 434, 438, 440, 448, 446, 447, 437, 435, 444 |

All complete correctness checks passed. The clock has millisecond resolution.
These results do not measure native drawing or establish the product frame
target. They do not show which command stage accounts for all elapsed time.
The next experiment will avoid full-document source construction and line
scanning in the Return planner. A single large active block can still require
a large scan.

The repeat preflight run with src/IndexedReturn.bend passed on the same reference
computer and build configuration. No other MarkDew batch ran at the same time.
The fixture, sample count, timed forcing, and checks were unchanged.

| Source size | Median at 1 ms resolution | Sum of 20 samples | Samples in ms, in order |
| --- | ---: | ---: | --- |
| 100 KiB | 0 ms | 5 ms | 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0 |
| 1 MiB | 0 ms | 7 ms | 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0 |

All exact-source, storage, selection, view, baseline, undo, and redo checks
passed. A zero sample means less than the clock can resolve, not zero work.
The indexed command removes full-source construction from planning. These
measurements support lower core command latency for this many-block fixture.
They do not establish latency for a single large active block, native source
delivery, native drawing, or the product frame target.

## Native Return through layout and display

The corrected six-process batch passed on 2026-10-03 with Bend 2.0.34, four
native CPU threads, Apple M4, 32 GiB RAM, and macOS 25.5.0 arm64. The normal
build is `bend tests/NativeReturnBench.bend -o <binary>`. Run the batch with
`sh tests/native_return_bench.sh`. No other MarkDew test batch ran at the same
time. Other applications were not controlled.

The many-block fixtures have 102,400 and 1,048,576 ASCII bytes and end in
`\n- x`. The long-block fixture is one 65,538-byte unordered item. The visible
area is 601 by 198 points, scale factor 1, with a fixed visible legacy vertical
scroller. The last character uses .AppleSystemUIFont at 20 points. The baseline
viewport y positions are 24,796, 205,526, and 25,815 points, respectively.
The benchmark restores the same viewport and selected baseline before each
sample. This configuration does not measure default scrollbar behavior.

One unmeasured unchanged-selection event creates the native controls. The
clock starts immediately before native `insertNewline:` and stops after the
normal accepted Bend presentation, selection restoration, visible layout,
and `displayIfNeeded`. It does not measure physical screen presentation.
Core source, storage, saved state, view, caret, undo, redo, host source and
scene, and caret-visibility checks run outside the interval. Initialization
keeps histories empty; each Return clears redo. Undo and its presentation
restore the baseline outside the clock. All 20 events and completions must
pass in each process. The external ten-minute process timeout also bounds
stalls that prevent modal watchdog timers from running.

| Fixture | Stage clocks | Median ms | Nearest-rank p95 ms |
| --- | --- | ---: | ---: |
| 100 KiB | Off | 37.722 | 41.305 |
| 1 MiB | Off | 540.832 | 601.167 |
| Long item | Off | 56.362 | 60.372 |
| 100 KiB | On | 37.273 | 42.446 |
| 1 MiB | On | 546.659 | 603.075 |
| Long item | On | 55.833 | 59.685 |

The p95 estimate is the nineteenth sorted value from only 20 samples. Separate
stage-clock runs have similar totals, but they are not a measurement of clock
overhead alone. Samples rise within each process despite restored source and
viewport; all ordered samples are retained below.

| Instrumented fixture | Before set ms | Source update ms | Chunk update ms | Projection ms | Final layout/display call ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100 KiB | 11.987 | 5.717 | 18.769 | 0.897 | 0.045 |
| 1 MiB | 222.273 | 91.331 | 229.306 | 5.888 | 0.050 |
| Long item | 51.986 | 2.015 | 0.944 | 0.677 | 0.042 |

Each stage value is its own median, so these medians need not sum to the total
median. Before set includes event handling, Bend work, and source delivery
before the native set effect. It is not isolated planner time. Projection
includes selection and scrolling. The final call alone does not include all
layout work that earlier stages can cause.

| Fixture and clocks | Ordered elapsed samples in ms |
| --- | --- |
| 100 KiB, off | 19.195, 23.321, 27.613, 32.313, 31.819, 37.609, 36.054, 40.132, 38.359, 36.495, 36.596, 37.836, 37.593, 38.014, 40.500, 49.149, 40.843, 40.590, 41.305, 40.454 |
| 1 MiB, off | 193.060, 348.842, 425.778, 458.663, 493.456, 499.397, 492.856, 512.024, 529.541, 543.108, 538.556, 553.662, 570.451, 558.972, 568.740, 580.289, 594.548, 585.304, 606.221, 601.167 |
| Long item, off | 31.987, 36.293, 41.440, 50.246, 54.815, 52.746, 54.252, 57.831, 56.380, 59.205, 60.372, 55.311, 56.853, 56.616, 60.129, 58.173, 55.819, 56.344, 60.979, 59.324 |
| 100 KiB, on | 19.816, 24.264, 28.683, 32.085, 31.864, 34.062, 35.077, 36.820, 37.182, 36.290, 37.585, 37.365, 39.969, 40.166, 39.581, 40.763, 41.268, 40.960, 42.446, 43.103 |
| 1 MiB, on | 209.178, 357.262, 417.803, 462.865, 474.357, 492.588, 505.277, 521.715, 538.852, 547.142, 546.176, 562.808, 570.055, 576.058, 581.928, 585.491, 604.227, 596.019, 599.029, 603.075 |
| Long item, on | 31.758, 36.115, 40.774, 47.413, 52.967, 55.136, 55.994, 56.790, 56.928, 56.063, 54.408, 57.816, 58.295, 55.672, 57.743, 59.583, 52.787, 59.685, 60.519, 54.747 |

The many-block result supports reducing full-source and full-scene delivery
for Return. The next experiment will carry its accepted source edit to the
existing range and scene-patch path. The long-block case also needs a separate
core measurement. These ASCII checks do not establish Unicode shaping, IME,
default-scrollbar latency, or the complete product frame target.

## Return source ranges and ordered scene patches

The repeat six-process batch passed on the same reference computer, build,
four-thread configuration, fixtures, viewport, font, scale, and checks. Both
full application gates passed first. No other MarkDew test batch ran during
this timing run. Other applications were not controlled. Each accepted Return
now transfers its source replacement once and then ordered selection/edit
patches from the original host scene. All 120 samples and exact checks passed.

| Fixture | Stage clocks | Prior median ms | Range median ms | Range nearest-rank p95 ms |
| --- | --- | ---: | ---: | ---: |
| 100 KiB | Off | 37.722 | 2.002 | 2.242 |
| 1 MiB | Off | 540.832 | 16.872 | 20.066 |
| Long item | Off | 56.362 | 73.811 | 76.085 |
| 100 KiB | On | 37.273 | 2.034 | 2.309 |
| 1 MiB | On | 546.659 | 17.977 | 45.021 |
| Long item | On | 55.833 | 74.584 | 76.556 |

The many-block fixtures improved. The long item regressed. Its chunk-update
median rose from 0.944 to 22.970 ms while its before-set median stayed near
51 ms. The native patch code replaces the complete changed preview interval.
This supports a bounded test of matching text/attribute edges within that
interval; it does not yet isolate which chunk operation accounts for the cost.
The 1 MiB uninstrumented p95 remains above 16 ms. The product target is unmet.

| Instrumented fixture | Before set ms | Source update ms | Chunk update ms | Projection ms | Final layout/display call ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100 KiB | 1.573 | 0.117 | 0.260 | 0.039 | 0.029 |
| 1 MiB | 16.766 | 0.279 | 0.801 | 0.048 | 0.052 |
| Long item | 50.993 | 0.621 | 22.970 | 0.014 | 0.044 |

These are independent stage medians. Before set still combines event handling,
Bend work, and delivery before the first native presentation effect. It does
not isolate planner or release time. The instrumented 1 MiB samples 19 and 20
were 89.768 and 45.021 ms. They remain in the results; their cause is not known.

| Fixture and clocks | Ordered elapsed samples in ms |
| --- | --- |
| 100 KiB, off | 2.242, 1.995, 1.870, 2.112, 1.737, 1.830, 1.818, 1.777, 1.854, 1.915, 2.276, 2.008, 2.082, 1.947, 1.932, 2.085, 2.059, 2.180, 2.154, 2.093 |
| 1 MiB, off | 13.288, 11.897, 12.000, 13.253, 13.813, 14.104, 14.641, 15.953, 16.302, 16.160, 17.935, 17.905, 17.482, 17.442, 20.066, 18.828, 18.291, 18.338, 18.860, 20.249 |
| Long item, off | 51.777, 54.914, 60.159, 64.600, 71.917, 72.918, 73.180, 71.611, 75.450, 75.025, 73.536, 74.926, 77.636, 76.085, 73.521, 75.608, 75.898, 74.087, 75.759, 75.442 |
| 100 KiB, on | 2.168, 1.741, 1.722, 1.862, 1.767, 2.031, 1.765, 1.833, 1.937, 1.925, 2.309, 2.315, 2.032, 2.220, 2.161, 2.142, 2.036, 2.036, 2.056, 2.061 |
| 1 MiB, on | 13.113, 13.998, 11.643, 12.991, 13.637, 15.437, 15.243, 20.113, 15.836, 16.489, 21.193, 17.913, 18.041, 18.148, 18.651, 19.014, 19.240, 19.607, 89.768, 45.021 |
| Long item, on | 51.545, 55.406, 61.096, 64.499, 71.563, 75.627, 74.004, 74.410, 75.180, 76.556, 75.478, 75.160, 73.263, 74.757, 75.682, 75.385, 74.217, 72.642, 76.317, 78.480 |

The next test will compare and retain matching text and attributes within the
validated Return patch range. It will preserve Unicode boundaries, ordered
patch semantics, the complete rendered scene, and the existing pending-native-
edit path. Native source/scene checks must pass before the same timing batch
is repeated. A separate before-set profile remains open; release cost is only
a hypothesis. These results retain all earlier physical-screen, small-sample,
ASCII, and default-scrollbar limits.

## Matching preview edges: correctness checks

The native scene-patch path now retains only edges whose text and attributes
match in the current preview. It keeps surrogate pairs complete. Native input
edits that await projection keep their existing path. Complete Bend patches
and native rendered-scene updates are unchanged. Focused host and native
stale-selection checks passed. The long fixture has an independent full
attributed-render check outside the frame clock. New measured-only diagnostics
record ordered preview ranges and separate comparison and storage-update time.

The first run, session 40363, overlapped the Docker application batch. Its
three uninstrumented fixtures passed exact checks, but its timing samples are
excluded from comparison. The driver was stopped and returned 143. The log
is `/tmp/markdew-native-return-trim-batch.log`. The full platform gates passed
from `src/` on macOS and Linux aarch64. Their handles, 11837 and 24923, returned
0 before the isolated timing run began. The earlier macOS source assertion
did not repeat in focused warm/cold checks or the full repeat gate. Its cause
remains unknown. Keep the diagnostic and stop timing if it repeats. The
architect approved this bounded experiment. The isolated timing batch passed;
its results and limits follow.


## Isolated matching-edge results

The rebuilt `src/` benchmark completed all six cases with exit 0 (handle
95440). All 120 samples passed exact source, storage, view, caret, save-state,
undo, and redo checks. The long item also matched an independent complete
attributed render after the clock stopped. Ordered range diagnostics passed.
No other MarkDew application check or benchmark process ran at the same time.
The reference machine and fixtures remain as specified above.

| Fixture | Stage clocks | Median ms | Nearest-rank p95 ms |
| --- | --- | ---: | ---: |
| 100 KiB | Off | 2.513 | 4.035 |
| 1 MiB | Off | 20.096 | 26.703 |
| Long item | Off | 81.481 | 94.581 |
| 100 KiB | On | 2.590 | 4.283 |
| 1 MiB | On | 20.567 | 33.087 |
| Long item | On | 47.596 | 53.713 |

The clock ends after native layout and display calls. Physical screen delivery
remains unmeasured. The p95 estimate has only 20 samples per case. Other
applications, CPU scheduling, and thermal state were not controlled.

| Instrumented fixture | Before set ms | Source update ms | Chunk update ms | Projection ms | Final layout/display call ms | Edge comparison ms | Preview storage ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 KiB | 1.885 | 0.153 | 0.332 | 0.046 | 0.051 | 0.008 | 0.302 |
| 1 MiB | 19.381 | 0.279 | 0.817 | 0.050 | 0.054 | 0.008 | 0.786 |
| Long item | 45.405 | 0.639 | 1.466 | 0.037 | 0.048 | 0.122 | 0.532 |

These are independent stage medians. Comparison and preview storage are parts
of the chunk-update stage. Do not add these columns to form a total.
Before set includes event handling, Bend work, and delivery before the first
native presentation effect. It does not isolate parser or release work.

All 60 instrumented samples used one preview insertion of three UTF-16 units
and removed none. Their starts were 89,398 for 100 KiB, 915,424 for 1 MiB,
and 65,538 for the long item. The complete scene and chunk updates stayed
unchanged. The long-item chunk-update median was 1.466 ms; the earlier range
run recorded 22.970 ms. Total-time evidence is mixed: the uninstrumented long
median rose from 73.811 to 81.481 ms, while the instrumented median fell from
74.584 to 47.596 ms. These historical runs do not establish a causal overall
speed improvement. This run also has an additional independent long reference
check outside the clock, which can affect allocation and cache state between
samples. Both variants need identical checks for a causal comparison.

| Fixture and clocks | Ordered elapsed samples in ms |
| --- | --- |
| 100 KiB, off | 2.640, 2.473, 2.277, 2.572, 2.124, 2.499, 2.251, 2.054, 2.250, 4.325, 2.465, 3.413, 2.526, 3.347, 4.035, 2.459, 2.656, 3.179, 2.121, 2.618 |
| 1 MiB, off | 13.303, 14.427, 18.854, 21.314, 21.732, 21.681, 15.526, 26.703, 20.882, 22.638, 17.224, 20.605, 18.596, 18.836, 19.514, 19.353, 19.759, 26.527, 28.857, 20.433 |
| Long item, off | 29.645, 36.663, 46.044, 46.570, 83.361, 65.802, 80.113, 94.254, 94.581, 94.339, 82.148, 87.532, 92.554, 73.040, 74.267, 72.712, 93.146, 92.330, 80.814, 103.425 |
| 100 KiB, on | 2.662, 2.894, 2.518, 1.910, 1.992, 2.427, 3.677, 3.173, 3.132, 4.755, 4.283, 4.108, 3.186, 2.152, 2.205, 2.759, 2.407, 2.289, 2.383, 2.247 |
| 1 MiB, on | 13.320, 21.191, 11.973, 22.976, 18.248, 15.341, 15.300, 16.393, 16.364, 37.272, 25.696, 27.038, 17.972, 27.778, 18.802, 21.493, 33.087, 29.631, 19.943, 21.654 |
| Long item, on | 29.830, 33.286, 36.950, 43.940, 43.634, 48.568, 46.966, 46.839, 52.082, 50.124, 50.385, 46.416, 53.713, 47.668, 46.995, 49.967, 47.524, 49.560, 53.972, 48.505 |

The architect found no required correctness change. The next bounded
experiment will profile before set with an external CPU sampler and non-owning
phase timestamps. Keep fixtures, checks, viewport, and session ownership
unchanged. Separate measured Return intervals from untimed checks and undo.
Do not assign the cost to release work without stack evidence. If short
intervals require more repetitions, keep that profiling run separate from
these 20-sample results. A later trim-on/trim-off control must use the same
final source and checks, alternate order, and retain every result.

The product latency target remains unmet. The earlier native source assertion
and native Save As confirmation remain open. The complete log is
`/tmp/markdew-src-return-isolated-batch.log`.

## Initial external long-item profile

Time Profiler launched the unchanged benchmark binary with `--threads 4 long
stages`. The target and recorder returned 0. All 20 Return samples and exact
checks passed. The trace lasted 7.440 seconds and exported 6,916 CPU samples
with one-millisecond weights. Five samples had no stack; keep them as unknown.
The trace reported nominal thermal state throughout this profiling run.

Whole-process self samples included 1,754 ms in `term_drop` and 1,729 ms in
`rfc_wrap`. Another 599 ms had the compiler's deduplicated-symbol label. These
counts include startup, untimed reference checks, and undo. They do not
establish the cost of release or reference counts inside Return. The exported
sample table has timestamps and per-thread stacks, but the current binary has
no absolute Return-phase markers. Phase separation is the next required step.

The trace, process log, exported sample table, and thermal table are in
`/tmp/markdew-return-profile.xN3mUc/`. This profiling run stays separate from
the six-case timing results.

## Long-item profile with phase markers

On 2026-10-04, a separate temporary generated-C build added only static
signpost support and four markers. It used the same Objective-C ARC, modules,
C11, `-O3`, pthread, and math compiler settings, with four runtime threads.
The markers store scalar sample IDs. They do not retain or inspect Bend terms.
The original benchmark binary and production source did not change.

Each interval starts immediately before native `insertNewline`. Events mark
Return extraction and entry to source replacement. The interval ends after
the existing frame clock stops. Markers are then disabled before checks and
Undo. The target and recorder returned 0. All 20 exact Return checks passed,
including the independent complete attributed-text check. The trace contains
20 complete marker sets in the required order.

| Marked phase | Median wall time | CPU sample weight |
| --- | ---: | ---: |
| Input to Return extraction | 0.164 ms | 2 ms |
| Return extraction to source replacement entry | 44.579 ms | 874 ms |
| Source replacement entry to completed frame | 2.071 ms | 41 ms |

CPU weights are totals across all 20 intervals and all threads. They are not
wall times. The sample resolution is one millisecond. There were no missing
stacks within these intervals. The middle phase includes Bend execution and
event delivery; it is not a measurement of one Bend function.

In the middle phase, self sample weights were 211 ms in `term_drop`, 195 ms
in `rfc_wrap`, 70 ms in `span_fade`, and 55 ms with a deduplicated-symbol label.
The seven thread totals were 200, 198, 192, 140 (main), 137, 4, and 3 ms.
All 41 ms of presentation samples were on the main thread. These results
support a closer inspection of release and reference-count work within the
measured edit phase. They do not establish which retained value causes the
cost, or that changing ownership will improve frame time.

The separate build changes code layout and adds marker overhead. Do not use
its times as a speed comparison with the unchanged binary. Phase trace and
exports are in `/tmp/markdew-return-profile.xN3mUc/long-phase.trace`,
`phase-os-signpost.xml`, and `phase-time-profile.xml`.

### Calling paths in the marked edit phase

`tests/profile_return.py` reads the two XML exports. It requires 20 ordered
marker sets from one process, filters CPU samples by that process and the
marked time ranges, and retains missing-stack counts. It reports self and
inclusive sample weights separately. To reproduce this report:

```sh
python3 tests/profile_return.py \
  /tmp/markdew-return-profile.xN3mUc/phase-os-signpost.xml \
  /tmp/markdew-return-profile.xN3mUc/phase-time-profile.xml
```

The three helpers have 476 ms of combined self samples in the middle phase.
The following groups use the nearest named Bend caller in each complete stack.
They are disjoint helper-self groups, not inclusive function costs.

| Nearest named caller | Helper self weight | Return samples with this group |
| --- | ---: | ---: |
| `String.length` | 82 ms | 20 |
| `Document.apply_change` continuation | 44 ms | 19 |
| `SceneIndex.chunk` | 30 ms | 20 |
| No named Bend caller | 28 ms | 16 |
| `CursorMap.consume` | 23 ms | 15 |
| `String.trim` continuation | 21 ms | 20 |
| `String.starts_with` | 19 ms | 19 |
| `Projection.part` continuation | 19 ms | 19 |
| `Projection.scan` continuation | 19 ms | 19 |
| `ListReturn.line_edit` | 18 ms | 18 |

For comparison, inclusive weights are 99 ms for `String.length`, 66 ms for
the document-change continuation, 51 ms for `CursorMap.consume`, and 40 ms
for `SceneIndex.chunk`. These inclusive counts can overlap and must not be
added to helper self counts. The helper work occurs in several paths and
across many Return samples. A runtime state-machine stack does not restore
all earlier Bend callers. Deduplicated symbols also limit attribution. The
trace does not identify a single retained object that can safely be removed.

### Matching long-item core control

The core Return benchmark now includes the same 65,538-byte `- ` plus 65,536
`x` characters used by the native long-item fixture. The existing retained
original baseline, 20 samples, preflight, timed cached-count forcing, and
outside-clock source, selection, view, save-state, Undo, and Redo checks remain.
The native build and three-fixture driver returned 0 on 2026-10-04. No other
MarkDew benchmark ran during this control.

On Apple M4, Darwin 25.5.0 arm64, Bend 2.0.34 with four threads, long-item
samples in milliseconds were:

```text
56,38,35,40,40,44,46,47,51,52,51,51,49,48,50,49,51,47,49,52
```

The median was 49 ms and the sum was 946 ms. The millisecond clock limits
resolution. The other fixtures had medians of 0 ms (100 KiB) and 1 ms (1 MiB);
zero means below the clock resolution, not zero work. These fixtures end in
a short item. Total file size alone does not explain the long-item cost.
This is a core control with a retained original baseline, not the native
frame sequence and not a causal comparison with the marked profile. The next
control will use the baseline returned by Undo for the following sample.

### Undo-baseline ownership-pattern control

`tests/ReturnOwnershipBench.bend` supplies original and Undo-baseline modes
from the same binary. `tests/return_ownership_bench.mjs` runs separate processes
in original, Undo, Undo, original order. Each process has four threads and
20 matching long-item samples. The Undo mode carries the returned session to
the next sample. Source, selection, view, save state, Undo, and Redo checks
remain outside the clock. Each Undo baseline also passes cached-count preflight.

The build and driver returned 0 on 2026-10-04. All 80 sample checks passed.
No other MarkDew benchmark ran during this control. Ordered samples, in ms:

```text
original: 25,29,32,34,40,42,48,48,49,50,50,49,49,50,50,50,52,50,51,54
undo:     26,29,33,36,42,42,43,49,48,46,46,47,48,46,46,46,48,49,48,46
undo:     27,31,33,35,40,45,44,44,49,45,46,45,47,52,47,44,44,49,48,48
original: 26,30,32,36,40,44,53,50,50,51,49,48,52,50,51,49,52,51,51,51
```

The medians were 49, 46, 45, and 50 ms. The large long-item cost remains in
both modes. Undo also changes cache state and leaves a Redo branch that the
following Return clears. This comparison is an ownership-pattern diagnostic,
not an isolated reference-count test or a product speed improvement.

The installed Base `String.length` uses non-tail scalar recursion.
`Document.count_scalars` uses a tail accumulator with the same scalar count.
The next temporary variant changes only the reached `SceneIndex.chunk` count
call. The copy is `/tmp/markdew-scalar-control.CP99fa/`; production source
is unchanged. Exact checks and matched controls are still required before
any decision to use this variant in the application.

The temporary variant built successfully and its initial four-process check
batch returned 0. All 80 exact sample checks passed. Its ordered medians were
49, 46, 45.5, and 49 ms. Ordered samples:

```text
original: 25,30,32,40,40,44,45,47,51,52,52,47,50,52,50,52,52,49,49,49
undo:     26,30,33,36,39,42,44,47,46,46,47,49,47,46,46,47,44,45,47,49
undo:     26,30,33,35,42,43,47,50,47,46,46,48,48,44,47,46,45,48,45,45
original: 25,30,33,36,40,45,49,50,51,47,49,50,52,48,51,50,53,49,50,52
```

This initial batch shows no clear reduction in the long-item cost. It is a
separate run, not an alternating control/variant comparison. A matched
comparison and marked variant profile remain open. No production change is
justified by this result.

### Matched scalar-count comparison and marked profile

The ownership driver now accepts control and variant binaries, plus optional
`--memory`. Memory uses native `/usr/bin/time` on macOS or Linux. It reports
whole-process peak resident bytes, including load and checks; it is not idle
memory or a measurement of one Return. Runs remain sequential.

On 2026-10-04, the eight-process matched batch returned 0. All 160 exact sample
checks passed. Four threads, compiler settings, long item, timed forcing, and
outside-clock checks were unchanged. No other MarkDew batch ran concurrently.

| Run | Build | Baseline | Median | Peak resident bytes |
| --- | --- | --- | ---: | ---: |
| 1 | Control | Original | 49 ms | 186,253,312 |
| 2 | Variant | Original | 49 ms | 186,253,312 |
| 3 | Variant | Original | 49.5 ms | 186,253,312 |
| 4 | Control | Original | 49 ms | 186,155,008 |
| 5 | Variant | Undo | 45 ms | 180,830,208 |
| 6 | Control | Undo | 45.5 ms | 180,862,976 |
| 7 | Control | Undo | 45 ms | 180,813,824 |
| 8 | Variant | Undo | 45.5 ms | 180,830,208 |

All ordered samples in milliseconds:

```text
1: 25,30,32,37,40,44,45,50,50,51,49,49,50,51,49,50,52,50,53,49
2: 25,29,33,35,38,46,49,47,49,51,48,50,48,49,50,51,52,51,53,50
3: 25,29,32,36,41,45,47,51,49,48,51,52,48,52,50,52,51,50,51,50
4: 25,29,32,36,39,43,44,48,50,50,49,50,48,50,49,52,51,51,50,53
5: 26,30,32,36,40,45,45,44,45,43,44,47,50,45,49,48,46,47,46,45
6: 27,30,32,36,42,42,47,46,46,44,47,45,44,47,46,46,49,47,46,44
7: 27,30,33,36,40,44,45,47,44,45,46,47,45,48,46,46,48,45,45,48
8: 27,30,32,37,39,45,46,46,48,47,45,47,45,46,46,45,47,47,45,47
```

The temporary native variant also used the same four phase markers and
compiler settings as the control profile. The native benchmark files matched
by SHA-256. Only `SceneIndex.bend` differed in the production-source copies.
Recorder and target returned 0. All 20 exact native checks passed, including
the independent complete attributed render. The exported trace has 20 ordered,
non-overlapping marker sets for one process, with no missing marked stacks.

| Profile phase | Control median | Variant median | Control CPU weight | Variant CPU weight |
| --- | ---: | ---: | ---: | ---: |
| Input | 0.164 ms | 0.161 ms | 2 ms | 1 ms |
| Extraction to replacement | 44.579 ms | 44.417 ms | 874 ms | 865 ms |
| Replacement to frame | 2.071 ms | 2.088 ms | 41 ms | 39 ms |

Inclusive `String.length` weight changed from 99 to 79 ms. Inclusive helper
weights were `term_drop` 211/201 ms, `rfc_wrap` 195/202 ms, and `span_fade`
120/95 ms (control/variant). These weights overlap and cannot be added.
The variant has no separate `SceneIndex.chunk` or `Document.count_scalars`
symbol in its binary or generated C. Compiler transformations changed the
calling-path labels. Absence of those symbols does not mean zero work.
The variant's nearest helper caller `BlockSceneCache.fresh` continuation has
49 ms of helper self samples across all 20 intervals.

Neither matched timing nor peak memory shows a clear benefit. This variant
will not be adopted on this evidence. The marked profiles are diagnostic
samples from separate processes, with one-millisecond resolution and marker
overhead. Logs, trace, exports, and parsed profile remain under
`/tmp/markdew-scalar-control.CP99fa/`.

## Separate long-item document and scene kernels

`tests/ReturnKernelBench.bend` uses the same 65,538-byte source and `\n- `
insertion. It prepares a selected stored baseline before timing. The document
kernel calls `Document.apply_change` and forces resulting cached tree length
and block count. The scene kernel calls `BlockSceneCache.render_change` with
the accepted change and forces resulting source and native mapping lengths.
Both use 20 samples and the existing millisecond clock, with four native threads.

The original document, stored baseline, cache, and index remain retained as
intentional reusable inputs. The scene change is created and fully verified
only after the document samples finish. The expected block count is forced
before the first document sample. This avoids an extra retained changed
document during the document kernel.

After each interval, checks verify complete source and block structure,
valid changed ranges, complete rendered styles and mapping points, ordered
host-patch replay, and equivalence with the complete stored Return command.
The command reference also checks exact selection and saved state. Later
payload checks establish correctness, but do not expand the timed forcing.

The build and `tests/return_kernel_bench.mjs` driver returned 0 on 2026-10-04.
All 40 sample checks passed on Apple M4 macOS with Bend 2.0.34. No other
MarkDew benchmark ran concurrently. Ordered milliseconds:

```text
document: 9,9,9,10,9,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10
scene:    14,16,15,15,15,16,16,16,17,17,18,17,17,17,17,18,16,18,18,19
```

The medians were 10 ms for document editing and 17 ms for scene rebuilding.
The scene kernel warrants closer inspection. These kernels have different
ownership and forcing from the complete command. Do not add their times or
subtract their sum from a command sample to infer an unmeasured phase. The
tests do not establish a product frame-time result. The current production
source remains unchanged by these diagnostic experiments.

### Marked kernel CPU profile

A temporary copy in `/tmp/markdew-kernel-profile.YLUDIf/` adds a test effect
immediately before each existing start clock and after each stop clock. Static
signpost labels distinguish document and scene intervals. The effect accepts
only scalar kind, sample, and begin/end fields; it retains no Bend terms.
The production-source copy is identical to `src/`. The fixture's forcing,
retained inputs, sample count, and complete outside-clock checks are unchanged.
The added effects and compiler changes remain a profiling limitation.

Time Profiler launched the marked native build with four threads on 2026-10-04.
The target and recorder returned 0. All 40 complete sample checks passed.
`tests/profile_kernels.py` requires 20 intervals per kernel, ordered Begin/End
markers, the expected sample order, no overlapping intervals, and one process.
CPU samples are filtered by process and half-open intervals. Thread grouping
uses numeric thread identity and display label. The marked samples had no
missing stacks. CPU sample resolution was one millisecond.

| Kernel | Median marked wall time | CPU sample weight |
| --- | ---: | ---: |
| Document | 9.894 ms | 198 ms |
| Scene | 17.042 ms | 333 ms |

CPU weights are totals across 20 intervals, not per-edit wall times. Document
self weights included `term_drop` 63 ms, `rfc_wrap` 32 ms, and `span_fade` 8 ms.
Scene self weights included `rfc_wrap` 103 ms, `term_drop` 65 ms, `span_fade`
28 ms, and deduplicated symbols 48 ms. Scene inclusive weights included
`CursorMap.consume` 38 ms, `String.length` 33 ms, `SceneIndex.chunk` 29 ms,
a `Projection.scan` continuation 21 ms, and the inline renderer scan 20 ms.
Inclusive weights can overlap; do not add them to helper self weights.

The scene trace supports inspection of cursor-map and projection calls.
Source inspection shows that `Projection.part` uses `Cursor.consume` to obtain
remaining input and source width, then discards the returned positions list.
`Projection.mapping` later builds the actual map. This is a candidate for a
separate no-position width-scan control, not proof of a performance benefit.
Any such control must preserve escaped marks, incomplete source handling,
run text and style, all source and native mappings, and complete command results.
No scan or ownership change has been applied to production code.

The trace, signpost and sample exports, checked process log, and parsed report
remain in the temporary directory. To reproduce the report:

```sh
python3 tests/profile_kernels.py \
  /tmp/markdew-kernel-profile.YLUDIf/os-signpost.xml \
  /tmp/markdew-kernel-profile.YLUDIf/time-profile.xml
```

## Width-only projection Part control

A temporary copy in `/tmp/markdew-projection-control.5bSUwp/` changes only
`Projection.part`. Its local tail consumer obtains source width and remaining
characters without constructing positions. It preserves the five cases of
the existing consumer, including plain escaped asterisks and backticks,
opening/closing mark offsets, mismatched characters, and source exhaustion.
`Cursor.consume`, its short/long dispatch, and actual mapping construction
remain unchanged. This removes unused position construction, not the mapping
pass used by the editor.

`tests/ProjectionPartCheck.bend` retains the old position-producing Part as
the reference. Its 59 cases compare run kind/text, width, and every remaining
source character. They cover all four run styles, empty and truncated input,
Unicode, escapes, mismatched characters, lengths 127/128/129/65,536, partial
exhaustion across the dispatch boundary, and a deep escaped mark. The fixture
uses tail-safe text comparison and concatenation for JavaScript portability.

On 2026-10-04, reference checks passed on native macOS, Node, and Bun.
Complete scene-cache, session-view, and Return-command checks also passed on
all three targets, including complete mapping points, source, selection, Undo,
Redo, and the long line. Linux verification remains open at this stage.

The matched eight-process ownership driver returned 0 with all 160 sample
checks passing. Runs used four threads, identical forcing and exact checks,
and no concurrent MarkDew batch. Whole-process peak memory includes load and
verification; it does not establish idle or per-edit memory.

| Run | Build | Baseline | Median | Peak resident bytes |
| --- | --- | --- | ---: | ---: |
| 1 | Control | Original | 49 ms | 186,286,080 |
| 2 | Variant | Original | 47 ms | 186,351,616 |
| 3 | Variant | Original | 47 ms | 186,253,312 |
| 4 | Control | Original | 49 ms | 186,236,928 |
| 5 | Variant | Undo | 43.5 ms | 180,781,056 |
| 6 | Control | Undo | 45 ms | 180,961,280 |
| 7 | Control | Undo | 47 ms | 180,748,288 |
| 8 | Variant | Undo | 44 ms | 181,092,352 |

Ordered milliseconds, with every sample retained:

```text
1: 25,29,32,36,40,44,48,51,50,48,51,49,49,51,51,52,51,51,49,51
2: 25,28,31,34,40,43,44,46,47,48,46,49,49,47,48,48,47,49,47,49
3: 24,29,31,35,40,44,44,47,47,48,47,48,47,47,47,48,49,49,49,48
4: 25,29,33,36,40,45,49,48,49,48,51,51,51,52,49,53,51,52,51,51
5: 26,29,31,35,39,42,43,42,44,45,47,46,45,45,44,46,43,45,43,45
6: 26,30,34,35,41,44,45,47,44,45,46,48,45,48,49,45,49,47,45,46
7: 27,30,34,36,40,43,47,48,53,47,46,47,51,47,48,50,45,45,49,48
8: 26,29,31,36,38,43,45,45,43,41,43,45,44,44,44,45,47,45,48,45
```

The variant's unmarked 40-sample kernel driver returned 0. Document median
remained 10 ms; scene median was 16 ms. Ordered samples:

```text
document: 9,9,9,9,10,10,10,10,10,10,12,10,10,10,10,10,10,10,10,10
scene:    14,14,14,15,16,15,16,15,16,16,16,17,16,16,17,16,17,18,16,17
```

The variant also passed all 40 checks under the same kernel phase markers.
The target, recorder, and XML exports returned 0. The parser verified all
40 ordered, non-overlapping intervals for one process, with no missing stacks.

| Marked kernel | Control median / CPU weight | Variant median / CPU weight |
| --- | ---: | ---: |
| Document | 9.894 ms / 198 ms | 9.949 ms / 200 ms |
| Scene | 17.042 ms / 333 ms | 16.172 ms / 319 ms |

Scene inclusive `CursorMap.consume` weight changed from 38 to 18 ms, and its
nearest-caller helper self weight from 19 to 8 ms. Scene helper self weights
were `term_drop` 65/53 ms, `rfc_wrap` 103/90 ms, and `span_fade` 28/41 ms
(control/variant). These diagnostic profiles support less work in the
position-producing consumer. They do not attribute every helper change to
the variant. Compiler labels, sampling resolution, and marker overhead remain
limits. No memory improvement is established.

The architect reviewed the semantic control and results. The measured benefit
is modest and specific to this long-item core workload. Before adoption,
Linux semantic/command checks, stored/direct patch replay, workspace retention,
history-memory checks, the width/remainder proof rule, native input checks,
isolated six-case native timing, and complete macOS/Linux gates remain required.
The variant remains temporary. The product's 16 ms frame target is not met by
these core measurements.

### Width-only variant platform and retention checks

The Linux focused batch returned 0 on 2026-10-04 in the existing Ubuntu 24.04
aarch64 image with Bend 2.0.34. A read-only mount supplied the temporary variant
to a writable container copy. `ProjectionPartCheck`, `SceneCacheCheck`,
`SessionViewCheck`, and `ReturnCommandCheck` passed on native Linux, Node, and
Bun. This includes complete Part results, complete scenes/maps, and command
source, selection, history, and the long item.

The temporary macOS `tests/list_return.sh` batch returned 0. Stored and direct
prepared commands passed ordered patch replay for all selection pairs.
Native stored/direct Return checks passed stale selection and independent
complete attributed-scene comparison, including Undo and Redo. The host round
trip checked that Return bypasses command dispatch during marked composition.
Workspace Return checks retained uncertain targets and captured snapshots.
The separate workspace batch also returned 0 and retained uncertain target,
snapshot, baseline, and history.

The generic history-memory gate returned 0: peak resident memory was
242,565,120 bytes for 20 edits, Undo, and Redo, below its 300 MiB limit. This is
a retained-history model gate, not application idle memory or evidence of a
memory improvement.

The universal width/remainder proof remains open in the temporary copy.
It compares the width-only scan with the width and remainder of the old
position-producing loop for all input lists, flags, offsets, and accumulators.
Unknown character heads prevent reduction through the existing overlapping
patterns, even when the plain flag is literal False. The rule has not been
weakened, and mapping code has not been changed to make it check. The architect
is reviewing the proof structure. Production source and root proof rules
remain unchanged by this draft. Native six-case timing and final integrated
application gates remain separate requirements.

The isolated temporary native six-case timing driver returned 0. All 120
samples passed the source, selection, scene, and patch checks. Results in ms:

| Fixture | Instrumented | Median | Nearest-rank p95 |
| --- | --- | --- | --- |
| Small | No | 1.990 | 2.235 |
| Large | No | 17.233 | 23.104 |
| Long item | No | 45.331 | 47.093 |
| Small | Yes | 1.992 | 2.225 |
| Large | Yes | 16.922 | 19.954 |
| Long item | Yes | 44.325 | 46.849 |

The uninstrumented large case includes a 107.935 ms sample. It remains in
the results. Each case has only 20 samples. These separate native runs do
not establish a causal improvement over the previous baseline. The matched
core controls above give stronger evidence for the small width-scan gain.
The long item still exceeds the 16 ms target. Display completion does not
measure physical screen presentation. Ordered samples and stage/patch records
remain in `/tmp/markdew-projection-control.5bSUwp/native-timing.log`.

Ordered native timing samples:

```text
fixture=small instrumented=false median_ms=1.990 p95_nearest_rank_ms=2.235 sample_ms=2.235,1.715,1.711,1.787,2.003,2.055,1.777,1.832,1.962,1.949,1.904,1.988,1.993,1.933,2.168,2.317,2.082,2.11,2.193,2.208
fixture=large instrumented=false median_ms=17.233 p95_nearest_rank_ms=23.104 sample_ms=13.48,12.24,11.705,16.463,13.471,17.645,14.631,15.497,16.127,15.882,17.112,17.439,17.355,18.121,23.104,18.748,18.574,19.173,18.717,107.935
fixture=long instrumented=false median_ms=45.331 p95_nearest_rank_ms=47.093 sample_ms=28.952,32.679,35.415,39.809,41.337,44.283,43.784,45.252,43.59,47.093,45.92,45.713,45.49,46.755,45.553,47.505,45.41,44.353,45.643,45.411
fixture=small instrumented=true median_ms=1.992 p95_nearest_rank_ms=2.225 sample_ms=2.268,1.663,1.743,1.998,1.819,1.914,1.87,2.091,1.872,2.119,1.931,1.986,1.976,2.047,1.938,2.092,2.019,2.031,2.225,2.11
fixture=large instrumented=true median_ms=16.922 p95_nearest_rank_ms=19.954 sample_ms=13.41,11.796,11.527,12.862,12.794,14.867,14.465,15.922,16.057,16.796,17.048,17.211,17.385,18.395,18.534,19.141,18.682,19.327,19.954,20.006
fixture=long instrumented=true median_ms=44.325 p95_nearest_rank_ms=46.849 sample_ms=29.192,32.668,36.509,40.835,41.222,44.429,43.834,46.849,44.248,45.308,47.87,44.342,44.307,44.94,45.311,45.323,43.975,46.281,44.681,44.259
```

The proof-only character refinement experiment also passed the standard
Bend proof check for two representative leaves: a visible character with
an odd code point, and the exact escaped asterisk case. Both leaves accept
the complete child equality as a hypothesis and return the parent equality.
They test whether the existing matchers reduce after character refinement;
they do not yet prove the universal loop rule or short-scan equivalence.

The next temporary proof checks passed for both complete scans:
`WidthTrie.bend` proves width/remainder equality with `Cursor.consume_loop`
for every visible list, source list, offset, flag, and reversed accumulator.
`WidthShortTrie.bend` proves equality with `Cursor.consume_short` for every
visible list, source list, offset, and flag. Each uses a finite bit-prefix
tree for the two visible marks, the backslash, and the second source mark.
Mismatch branches retain arbitrary unexamined Word suffixes. Only an exact
escape shape splits the plain flag. No Unicode-validity restriction was added.
The short proof also checks that adding a position leaves width and remaining
source unchanged. The commands reported `ALL PROOFS CHECK`; this is the
standard proof gate, not a mathematical-validity verdict. Production adoption
still requires review, dispatch/Part equivalence, and integrated app gates.

`WidthDispatch.bend` then passed the standard proof gate for the complete
dispatch and Part result. It splits `consume_chosen` on its Boolean and
specializes the result to `short_enough`. A finish lemma and equality
composition establish complete Part equality for all four render-run kinds
against the previous position-producing implementation. The short proof
now imports the long proof's width helper; separate helper names were opaque
to the equality check. All three proof modules remain temporary. A retained
generator, review, root law/proof integration, and full application gates
remain before production adoption.

The reviewed candidate is now in the worktree. `src/Projection.bend` uses
the width-only consumer for Part construction. The actual cursor map and
its bounded dispatch are unchanged. Proof modules under `src/` are imported
only by other proof modules and root LAWS/PROOF, not by application execution
modules. `tests/generate_width_proofs.mjs --check` reproduces both full trie
files. Root `bend PROOF.bend` passed. The permanent batch now checks proof
generation and the 59-case Part reference check on native, Node, and Bun.
The architect reviewed this integration and found no required correction.
Full macOS and Linux application batches are running; their results remain
pending. This does not yet establish the final application configuration.

Both final integrated application batches subsequently returned 0 on
2026-10-04. Each log ends with `Rendering, direct editing, and document batch
passed.` The permanent generation/proof gate and 59-case Part reference
checks passed on native, Node, and Bun on both systems. The macOS batch also
passed native direct editing, recovery, navigation, repeated-window release,
and warm/cold document checks. Linux used its terminal host; this is not a
Windows or Linux GUI result. Logs remain at
`/tmp/markdew-width-macos-full.log` and `/tmp/markdew-width-linux-full.log`.

| Integrated gate | macOS peak bytes | Linux peak bytes |
| --- | ---: | ---: |
| Document, 20 parse/edit cycles | 79,298,560 | 78,651,392 |
| History, 20 edits/Undo/Redo | 242,860,032 | 242,290,688 |

Both memory gates passed. They do not establish a memory improvement or
application idle-memory compliance. The bounded width-scan optimization is
verified in this integrated configuration. The complete product goal and
native Save As confirmation gap remain open. No commit was made.

The architect reviewed a possible next mapping-only experiment. The current
long consumer reverses its position accumulator, then `finish_chunk` reverses
that result before `reverse.go` appends it. A temporary long mapping path could
retain reversed positions until that final append. Public `consume` semantics
and the bounded short path must remain unchanged. Before constructing the
variant, obtain an isolated current mapping-path profile after the full gates
stop. Proceed only if the extra traversals remain material. Adoption would
require complete position-list/remainder/offset equivalence, dispatch-boundary
and deep-escape cases, complete scenes and command/history checks, and matched
time/peak-memory controls. Fewer source-level traversals alone do not prove a
runtime improvement. No source change for this candidate has been made.

### Current integrated mapping-path profile

The isolated marked kernel build and recorder returned 0 after both final
application batches stopped. All 40 ordered target samples and both complete
kernel-check messages passed. Export and marker validation also returned 0:
20 ordered non-overlapping intervals per kernel, one process, no missing
stacks. Source matches the integrated worktree byte for byte; the test differs
only by the marker effect and four scalar calls. Artifacts remain in
`/tmp/markdew-mapping-profile.4wFCNw/`.

| Kernel | Median marked wall ms | CPU sample weight ms |
| --- | ---: | ---: |
| Document | 9.959 | 198 |
| Scene | 15.923 | 314 |

Scene inclusive weights include `CursorMap.consume` 20 ms and the
`CursorMap.finish_chunk` continuation 20 ms across all 20 intervals. The
nearest named finish continuation accounts for 13 ms of helper self samples
in 13 intervals. Mapping work is still visible, but these overlapping samples
do not isolate the cost of either reverse pass. Compiler transformations did
not retain separately named reverse functions. Their absence does not mean
zero work. Scene self weights include `rfc_wrap` 98 ms, `term_drop` 60 ms,
`span_fade` 30 ms, and deduplicated symbols 37 ms. This supports a bounded
temporary mapping control, not an expected or proven improvement. Sampling
resolution is one ms; the marked kernels differ from full-command ownership
and forcing. No reversed-position variant has been applied yet.

### Temporary reversed-position mapping control

The control in `/tmp/markdew-reverse-control.1UymVV/` changes only the long
mapping path in `CursorMap.bend`. Its separate `ReversedChunk` retains the
position accumulator until one final `reverse.go` append. Public `consume`,
its forward Chunk result, the bounded short path, width-only projection,
mark skips, and final mapping boundary remain unchanged. The original module
is retained as an independent test reference in the temporary copy.

Complete-result checks returned 0 on macOS and Linux, with one and four
native threads, Node, and Bun. They compare every position, source remainder,
offset, and complete final map, including 127/128/129, 65,536, deep escaped
marks, source exhaustion, Unicode, all run styles, and a one-MiB map. Separate
macOS native/Node/Bun scene, session view, Return command, long-fence, and
long-literal checks also returned 0. These are temporary candidate checks,
not final integrated application gates.

Three temporary standard proof commands reported `ALL PROOFS CHECK`.
The first equates the converted reversed result with the complete old loop
result for arbitrary input lists, offsets, flags, and accumulators. The next
proves reverse-accumulator and double-reverse identities and complete append
equivalence for an arbitrary pure continuation. The third proves bounded
dispatch and `finish_mapping` equivalence. Complete recursive build equivalence
and retained proof generation remain separate adoption requirements.

The balanced eight-process original/Undo ownership timing with peak resident
memory is running in isolation. No benchmark result or production adoption
is claimed yet.

The matched driver then returned 0 with all 160 result checks. The variant
shows a large command-time decrease and a large peak-memory increase:

| Run | Build | Mode | Median ms | Peak bytes |
| --- | --- | --- | ---: | ---: |
| 1 | Control | Original | 47.5 | 186,318,848 |
| 2 | Variant | Original | 29 | 401,719,296 |
| 3 | Variant | Original | 29 | 401,768,448 |
| 4 | Control | Original | 47 | 186,236,928 |
| 5 | Variant | Undo | 29 | 368,132,096 |
| 6 | Control | Undo | 43.5 | 181,174,272 |
| 7 | Control | Undo | 44 | 180,846,592 |
| 8 | Variant | Undo | 30 | 368,050,176 |

Ordered driver output:

```text
Diagnostic ownership control; four threads; 20 samples per process; millisecond clock.
run=1 build=control mode=original sample_ms=25,28,30,35,39,42,45,48,49,48,48,48,49,49,47,47,49,48,47,49 median_ms=47.5 peak_rss_bytes=186318848
run=2 build=variant mode=original sample_ms=24,28,29,29,29,30,30,30,29,30,29,29,29,29,30,30,29,29,29,30 median_ms=29 peak_rss_bytes=401719296
run=3 build=variant mode=original sample_ms=25,27,29,29,29,29,29,30,29,29,29,30,29,30,29,30,30,30,30,29 median_ms=29 peak_rss_bytes=401768448
run=4 build=control mode=original sample_ms=25,28,32,35,38,43,47,47,54,49,49,50,46,49,49,47,47,46,48,46 median_ms=47 peak_rss_bytes=186236928
run=5 build=variant mode=undo sample_ms=25,27,29,29,29,30,29,30,29,29,30,29,30,29,29,30,30,29,30,30 median_ms=29 peak_rss_bytes=368132096
run=6 build=control mode=undo sample_ms=26,29,32,35,41,41,44,42,48,43,43,44,46,43,46,44,45,47,46,48 median_ms=43.5 peak_rss_bytes=181174272
run=7 build=control mode=undo sample_ms=25,29,31,34,38,41,43,44,44,45,47,44,46,45,45,44,42,45,45,46 median_ms=44 peak_rss_bytes=180846592
run=8 build=variant mode=undo sample_ms=26,28,29,29,30,29,30,30,30,30,29,29,29,30,30,30,29,30,30,30 median_ms=30 peak_rss_bytes=368050176
All ownership checks passed. This control does not measure native frames.
```

Peak resident memory covers the complete process, including outside-clock
checks. It is not per-edit allocation or application idle memory. Nevertheless,
the repeatable increase prevents an adoption claim. The generic history-memory
gate is running separately; its mostly short blocks may not exercise this long
mapping path, so a pass would not resolve this long-item finding. This control
does not measure native frames or meet the 16 ms target.

The separate generic history-memory gate returned 1. Peak resident memory
was 1,088,765,952 bytes, above the unchanged 300 MiB limit. The integrated
control passed at 242,860,032 bytes. This candidate therefore fails adoption;
no production source change was made. The architect requested fresh-process
memory scaling at 1, 5, 10, and 20 operations in both ownership modes before
another CPU profile. External resident-memory observations must be aligned
with sample progress and distinguish command, verification, and Undo work.
Peak growth alone will not prove that history or a specific list is retained.

### Fresh-process memory scaling

Both scaling builds returned 0. Temporary fixtures change only the operation
count to 1, 5, 10, or 20. They retain the same initial selection, ownership
mode, complete verification, Undo, and Redo checks. Each case uses a fresh
four-thread native process. All 16 pipe-output cases returned 0, followed by
all 16 terminal-output cases with the same complete checks.

| Mode | Operations | Pipe control bytes | Pipe variant bytes | Terminal control bytes | Terminal variant bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original | 1 | 52,854,784 | 58,949,632 | 52,887,552 | 59,867,136 |
| Original | 5 | 81,461,248 | 131,842,048 | 81,494,016 | 131,842,048 |
| Original | 10 | 116,670,464 | 221,970,432 | 116,408,320 | 221,839,360 |
| Original | 20 | 186,318,848 | 401,702,912 | 186,433,536 | 401,752,064 |
| Undo | 1 | 47,202,304 | 56,475,648 | 47,726,592 | 56,279,040 |
| Undo | 5 | 76,611,584 | 122,159,104 | 76,775,424 | 122,273,792 |
| Undo | 10 | 111,378,432 | 204,275,712 | 111,493,120 | 204,292,096 |
| Undo | 20 | 180,928,512 | 368,214,016 | 180,928,512 | 367,984,640 |

Peak memory grows with operation count in both builds, more rapidly in the
variant. The difference is not only a fixed startup peak. External 50-ms
resident-memory observations also show growth across sample progress. Pipe
output buffered most progress lines, so its observations cannot locate
individual samples. The terminal repeat observes all progress values 0 through
19 for every 20-operation case. Progress means completed sample messages
received; it is not an exact command/verification/Undo phase boundary.

The first terminal launcher attempt failed before a target run because
`script` requires terminal input. The corrected launcher inherits a real
terminal and preserves that failed log. External observations add overhead;
these runs diagnose memory growth, not command timing. They do not distinguish
live objects from runtime arenas, allocation high-water marks, or retained
history. Logs, JSON observations, drivers, and static-count fixtures remain in
`/tmp/markdew-reverse-control.1UymVV/`. Allocation diagnosis is still open.

Generated-C inspection shows that this runtime allocates Bend terms from a
shared arena. Fresh class quanta advance `H_BUMP`; returned blocks enter
per-lane HOT/COLD chains and shared banks. The corpus initially reserves an
8 GiB anonymous mapping and expands only when its page capacity is exceeded.
Resident memory is much smaller than that virtual reservation. System
allocation traces may therefore show an unchanged arena while touched pages
and its high-water mark grow. They cannot directly identify each Bend term.
These source observations do not establish the regression's cause. Separate
scalar-only runtime diagnostics are under architect review before recording.

### Scalar allocator diagnostic

The reviewed generated-C diagnostic counts successful allocations, completed
returns, local HOT reuse, parked COLD reuse, shared-bank reuse, and fresh quanta
per size class with relaxed atomic scalar counters. It retains no Bend terms
and changes no pool policy. Snapshots follow existing output and the original
event-loop exit. Both diagnostic builds and all four five-operation cases
returned 0 with complete command/verification/Undo/Redo checks. Resident-memory
sampling ran alongside the counters. These instrumented runs are not timing
controls. Diagnostic sources, observations, parser, and reports remain in the
temporary control and variant directories.

| Build | Mode | Final bump high-water bytes | Allocation minus return bytes | Peak resident bytes |
| --- | --- | ---: | ---: | ---: |
| Control | Original | 72,877,056 | 33,032,232 | 85,868,544 |
| Variant | Original | 123,241,472 | 91,231,416 | 136,232,960 |
| Control | Undo | 68,191,232 | 33,032,232 | 81,018,880 |
| Variant | Undo | 113,804,288 | 83,366,856 | 126,664,704 |

Allocation-minus-return values weight successful allocator requests and returns
by class size. They are not a direct live-object or system-allocation count.
All cases retain the same 8,589,934,592-byte virtual corpus capacity and
7,408,174-page term capacity. Final allocation counts equal HOT/COLD/bank/fresh
path totals, and final bump pages equal the initial page plus fresh quanta.
This checks internal counter consistency.

Only classes 0 and 1 have positive final request-minus-return counts. Their
counts are equal within each case: 1,376,343 in both control modes, 3,801,309
in variant Original, and 3,473,619 in variant Undo. Classes 2 through 7 balance
at process end. The variant Original makes the same 41,254,896 class-1
allocation requests as the control, but returns fewer blocks. It therefore
uses more fresh arena quanta despite fewer total class-0 requests.

Every recorded snapshot observes zero active pool workers and zero busy host
jobs; process-end snapshots also observe zero live IO jobs. No synchronization
barrier was added, so these are observations rather than a proof of quiescence.
No specific retained term, reference-count path, or release cause is established.
The failed variant remains outside production. The architect is reviewing the
counter interpretation and the next ownership diagnostic.
### Reference-count wrapper classification

The shared-string bridge fixture creates one fresh `+source`, uses it in
`[PlainRun{source}]` and `Scalar.to_chars(source)`, and leaves projection out.
All 12 length/count cases passed. Both builds balance every allocator and
wrapper class and close all sampled epochs. Sharing alone does not reproduce
the projection fixture's extra survivors.

Generated-C inspection found a specific release difference. `spin_6` calls
`spin_7`, which reads string cells through `term_peek` and builds independent
Char-list cells containing packed characters. It does not drop the input
string. The control's `Cursor.build` retains that string in its continuation;
`BUILD_K60` releases it with `term_sink`. The variant converts the string and
tail-calls mapping completion with a continuation that carries the remaining
runs but not the converted string. Its four style branches lack that release.

A separate generated-C causal build adds `term_sink(e, _o_1)` immediately after
successful conversion in those four verified build branches. Failure returns
and unrelated conversions are unchanged. The architect reviewed this test.
The short one-iteration plain-run case ran first, followed by the other five
length/count cases. All six passed exact output-point checks. Every allocator
and wrapper class balances; no sampled wrapper survives and all sampled epochs
close. Reuse, rebuild, and overflow gates also pass.

This release removes the extra survivors in the reduced plain-run reproduction.
It does not establish all application ownership paths. The other style branches
have not yet received direct runtime cases in this causal build. No generated-C
patch has been applied to production, and the candidate remains rejected.

Evidence in `/tmp/markdew-reverse-control.1UymVV/`: `shared-observations.json`,
`shared-report.json`, `causal-observations.json`, `causal-report.json`,
`causal_release.mjs`, and `causal-release.c`. The bridge fixture is
`tests/MappingSharedReduced.bend` in both temporary directories.

Two reduced fixtures remove document, history, and scene-cache ownership.
Each runs lengths 127, 129, and 65,536 with one and five iterations in both
builds. Every iteration consumes and checks all output points, including the
singleton final boundary. Only numeric state carries into the next iteration.
Both batches passed all 12 cases with the existing diagnostic counters.

The direct fixture creates one fresh plain-run string with `from_reversed` and
a separate matching source-character list, then calls `Cursor.build`. All
allocator classes balance at process end in both builds. No reference-count
wrappers are created in this fixture. The long cases have 49 and 245 recorded
constructor epochs, respectively; all close. This fixture does not reproduce
the extra retention and does not exercise the shared-wrapper ownership path.

The projection fixture creates a fresh source string, shares it between
`Projection.runs(source, 0, 0)` and `Scalar.to_chars(source)`, then builds and
fully consumes the map. The text is plain and the run is active. It does not
yet exercise formatting marks. The control balances all allocator classes.
The variant leaves equal counts in class zero and class one:

| Length | Iterations | Control outstanding class 0/1 | Variant outstanding class 0/1 |
| --- | ---: | ---: | ---: |
| 127 | 1 | 0 / 0 | 127 / 127 |
| 127 | 5 | 0 / 0 | 635 / 635 |
| 129 | 1 | 0 / 0 | 129 / 129 |
| 129 | 5 | 0 / 0 | 645 / 645 |
| 65,536 | 1 | 0 / 0 | 65,536 / 65,536 |
| 65,536 | 5 | 0 / 0 | 327,680 / 327,680 |

The extra counts equal one wrapper/two-word-cell pair per input character per
iteration. The variant also reproduces the effect at length 127, where the
short mapping branch is used. Thus the long reversed-consumption branch alone
is not a sufficient explanation. Generated ownership paths need inspection.
These counts do not establish the final owner or a compiler defect.

All cases have zero active target/wrapper reuse, unexpected open-epoch rebuilds,
and metadata overflow. Collision omissions remain explicit. The projection
fixture's long variant cases retain 25 and 89 sampled wrappers; their separate
epoch observations show 25 and 90 open epochs. These dumps are not one atomic
graph snapshot. Short cases have no sampled target addresses, so their complete
allocator counters supply the retention evidence.

Evidence in `/tmp/markdew-reverse-control.1UymVV/`: `reduced-observations.json`,
`reduced-report.json`, `projection-observations.json`, `projection-report.json`,
and the two fixture files under `tests/`. The reduced projection audit finds
94 recognized dynamic two-field constructors, including four SCon sites, and
five closures, with no unknown site in the recognized pattern. Output-string
construction remains part of the diagnostic counts; both builds print the same
messages. Production remains unchanged and the candidate remains rejected.

Constructor-epoch tracking now separates dynamic constructors from allocator
lifetimes. Each build has 317 recognized generated two-word `_nd` allocation
patterns: 293 constructor sites, including 48 SCon sites, and 24 closures.
The audit checks both complete field writes and compatible constructor uses
within the generated function/case before owner redeclaration. No recognized
site remains unknown. This audit is specific to the generated-C format; it
does not cover every runtime or foreign construction.

The epoch hook runs after both field writes and before constructor publication.
`ctr_take` and free close epochs. A wrapper captures allocator generation and
open epoch together under one target lock. Closed or untracked epochs remain
unknown. The architect reviewed these corrections before the isolated runs.
The diagnostic leaves `term_ctr` and static initializers unchanged.

All eight cases passed their complete result checks. There were zero active
address reuses, unexpected open-epoch rebuilds, and target/wrapper/epoch table
overflows. Each known surviving wrapper identifies a distinct open SCon epoch
whose allocation was not freed at the target observation. All such epochs in
the control originate at manifest site 12 (`spin_32`). The variant also retains
epochs from site 6 (`spin_10`), a reversed-character-to-string construction loop.
Both sites reuse taken two-word cells or allocate new cells. Constructor and
allocator identity are now checked separately.

| Build | Mode | Operations | Known site 12 | Known site 6 | Unknown epochs | Target collisions | Wrapper collisions |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Control | Original | 1 | 67 | 0 | 1 | 84 | 35 |
| Variant | Original | 1 | 67 | 120 | 7 | 67 | 34 |
| Control | Original | 5 | 280 | 0 | 18 | 465 | 202 |
| Variant | Original | 5 | 297 | 490 | 69 | 840 | 460 |
| Control | Undo | 1 | 63 | 0 | 2 | 60 | 34 |
| Variant | Undo | 1 | 61 | 111 | 8 | 54 | 28 |
| Control | Undo | 5 | 290 | 0 | 18 | 433 | 229 |
| Variant | Undo | 5 | 270 | 451 | 52 | 594 | 374 |

These are sampled identities, not population estimates or a graph-root proof.
Separate endpoint dumps and collision omissions remain limits. No timing claim
is made from these builds. The next question is which generated ownership
paths keep or release the site-6 strings.

Evidence: `/tmp/markdew-reverse-control.1UymVV/epoch-observations.json`,
`epoch-report.json`, `epoch_wrappers.mjs`, `analyze_epochs.mjs`, and each build's
`constructor-sites.json` or `constructor-sites-1.json`.

The target-lifetime diagnostic records successful class-one allocations and
frees in separate bounded metadata tables. It assigns a unique allocator
generation to each recorded allocation and samples wrappers by target address.
Wrapper records contain the observed `CID_SCON` and target allocator generation.
Generation zero remains unknown. Counters record omitted collisions, table
overflow, and allocation at an already-active identical address. Metadata
publication and bucket locks were reviewed before execution. No term payload
is retained or read.

All eight one-operation and five-operation cases passed complete result checks.
Both target and wrapper tables report zero active-address reuse and zero
overflow. Every known surviving wrapper maps to a distinct target allocator
generation. None of these target allocations was marked freed at the target
observation. The target and wrapper dumps are separate snapshots, not one
atomic graph snapshot.

| Build | Mode | Operations | Known surviving targets | Unknown generations | Target collisions | Wrapper collisions |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Control | Original | 1 | 64 | 0 | 66 | 21 |
| Variant | Original | 1 | 183 | 10 | 74 | 30 |
| Control | Original | 5 | 275 | 9 | 361 | 197 |
| Variant | Original | 5 | 799 | 56 | 657 | 426 |
| Control | Undo | 1 | 59 | 2 | 106 | 21 |
| Variant | Undo | 1 | 192 | 10 | 70 | 29 |
| Control | Undo | 5 | 281 | 17 | 283 | 184 |
| Variant | Undo | 5 | 705 | 51 | 618 | 415 |

Every known surviving target has a `ctr_take` event during its allocator
lifetime. This operation can supply a cell for in-place constructor reuse.
Thus the allocator generations do not establish constructor lifetimes or
surviving roots. Unknown generations and address-based sampling prevent total
retention estimates from this table. Instrumentation changes scheduling and
adds locking; these runs are not timing or release-scheduling evidence.

The compiler outlined some call sequences in these larger diagnostic builds.
An initial direct-call-only analysis check rejected such a site. Disassembly
showed a call to an outlined helper that ends with a branch to `rfc_wrap`.
The corrected analyzer verifies either the direct wrapper call or that helper
tail branch before accepting each recorded return address.

Evidence: `/tmp/markdew-reverse-control.1UymVV/target-observations.json`,
`target-report.json`, `target_wrappers.mjs`, `analyze_targets.mjs`, and the four
separate `target-diagnostic` builds. Production code remains unchanged and
the candidate remains rejected.

One-operation controls and caller relocation now supplement the five-operation
sample runs. Each executable reports its loaded Mach-O image base with
`dladdr`. The analyzer uses that base and the executable's `nm` symbols to
relocate each raw return address. It also checks the disassembly: every
recorded return address immediately follows a call to `rfc_wrap`.

All eight fresh-process cases passed their complete result checks. All have
zero active-address reuse and zero record overflow. Surviving samples in the
control come from `_spin_27+644` and `_spin_27+1612`. The variant also has
survivors from `_spin_44+420` and `_WL_FID____SRC_PROJECTION_SCAN+2508`.
The generated `spin_44` helper builds a plain render run from reversed
characters. Inlining means a generated caller symbol alone is not an exact
Bend source location. Released samples also occur at both extra sites.

| Build | Mode | Operations | Surviving samples | Omitted collisions |
| --- | --- | ---: | ---: | ---: |
| Control | Original | 1 | 80 | 30 |
| Variant | Original | 1 | 191 | 23 |
| Control | Original | 5 | 286 | 171 |
| Variant | Original | 5 | 827 | 331 |
| Control | Undo | 1 | 87 | 22 |
| Variant | Undo | 1 | 205 | 29 |
| Control | Undo | 5 | 316 | 165 |
| Variant | Undo | 5 | 763 | 360 |

Creation-phase groups include both earlier and later surviving samples. Phases
advance at output observations; they are not exact operation boundaries.
These samples identify creation sites, not surviving roots. Target allocation
generations must still be tracked before interpreting repeated target
addresses. Keep the address-sampling and collision limits stated below.

Evidence: `/tmp/markdew-reverse-control.1UymVV/symbol-observations.json`,
`symbol-report.json`, `symbol-summary.log`, `analyze_symbol_samples.mjs`, and
`port_allocator.mjs`. The latter applies the same allocator instrumentation to
separately generated one-operation C using exact single-match patch contexts.

The next diagnostic samples wrapper addresses with a fixed numeric hash. It
keeps at most 16,384 append-only metadata records in 8,192 locked buckets.
Each record has a unique sampled-wrapper generation, numeric target address,
raw creation return address, initial reference count, reference increments and
decrements, creation phase, and release flag. It never reads freed payloads.
Atomic publication and bucket locks protect metadata. The architect reviewed
the lifetime rules before execution. An added counter distinguishes active
same-address reuse from different-address bucket collisions.

All four five-operation runs passed complete result checks. Each released
sample has final reference balance zero; each surviving sample has balance
one. All cases have zero active-address reuse and zero record overflow.

| Build | Mode | Sample records | Released | Surviving | Omitted collisions |
| --- | --- | ---: | ---: | ---: | ---: |
| Variant | Original | 6,337 | 5,509 | 828 | 424 |
| Control | Original | 6,253 | 5,963 | 290 | 153 |
| Control | Undo | 6,057 | 5,749 | 308 | 242 |
| Variant | Undo | 5,821 | 5,071 | 750 | 350 |

Sampling follows addresses, not a uniform distribution of creations. Reused
addresses can appear in several records with distinct wrapper generations.
Collisions omit lifetimes; do not extrapolate these samples into exact totals.
Reference events occur before runtime atomic updates, so intermediate balances
are not atomic runtime snapshots. At that stage, target allocation generations,
relocated caller symbols, and one-operation controls were unverified. A final balance
of one does not identify the reference's owner or prove that it is reachable.
Instrumented elapsed times are not performance evidence.

Evidence: `/tmp/markdew-reverse-control.1UymVV/sample-observations.json`,
`sample_wrappers.mjs`, and the two separate `sample-diagnostic.c` builds.

Separate generated-C diagnostic copies classify wrapper creation in `rfc_wrap`
and actual wrapper release in `term_drop` and `ctr_take`. The shared-field
`span_fade` path calls `term_drop`. Counters retain numeric metadata only.
They do not retain Bend terms or change the allocator policy. These counters
add overhead; their elapsed times are not performance evidence.

All four five-operation cases passed their complete result checks. At process
end, every outstanding wrapper belongs to `CID_SCON`, a two-field string cell.
All other wrapper types, including `CID_CON`, have balanced creation/release
counts. Other class-zero allocations and frees also balance: 132,522 in each
Original case and 132,506 in each Undo case.

| Build | Mode | SCON created | SCON released | Outstanding wrappers |
| --- | --- | ---: | ---: | ---: |
| Control | Original | 28,100,741 | 26,724,398 | 1,376,343 |
| Variant | Original | 28,100,741 | 24,299,432 | 3,801,309 |
| Control | Undo | 26,789,816 | 25,413,473 | 1,376,343 |
| Variant | Undo | 26,789,816 | 23,316,197 | 3,473,619 |

The counts identify the wrapped constructor type. They do not identify which
source strings remain, establish global quiescence, or prove a runtime leak.
The matching outstanding two-word block counts still require object-identity
evidence before we associate each block with one wrapper target.

Evidence: `/tmp/markdew-reverse-control.1UymVV/wrapper-observations.json`,
`classify_wrappers.mjs`, and `wrapper-diagnostic.c` in both temporary control
directories. Both diagnostic builds completed without compiler warnings after
an explicit diagnostic-only integer cast. The variant remains rejected.

## Style release checks and Bend ownership experiment

The separate style fixture checks Plain, Strong, Emphasis, and Code. It uses
inactive projection, lengths 127, 129, and 65,536, and one or five iterations.
Each run checks every body point, the following plain-text point, and the final
boundary. All 72 processes passed these checks: control, original variant,
and a generated-C causal diagnostic for each input. Branch counters confirm
that all four diagnostic release sites ran. Control and causal builds balance
all allocator and wrapper classes. Their sampled constructor epochs close.
The original variant retains one SCON cell and wrapper pair per visible scalar
per iteration, including the following plain-text scalar.

The diagnostic C release applies only to the inspected borrowed conversion.
An earlier direct fixture used a consuming conversion. Its patched binary was
not run. These results do not justify a general generated-C release change.

A separate Bend-only candidate carries the text and converted characters in
MappingWork. It carries the text through mapping completion, then drops it
when it consumes MappingDone. Generated C contains the final text release.
All six active plain-projection cases and all 24 inactive style cases pass
complete point checks and balance every allocator class at process end.
This is a reduced check. Wrapper checks, proofs, full-app memory, and platform
checks remain required.
The candidate is temporary and is not used by the application.

Evidence in `/tmp/markdew-reverse-control.1UymVV/`:
`styles-observations.json`, `styles-report.json`, `src/CursorMapOwned.bend`,
`reduced-owned.c`, `owned-observations.json`, and
`owned-styles-observations.json`. Diagnostic times are not
performance evidence.

## Bend ownership: many-run memory check

The temporary many-run fixture uses repeated `**body**z` units and inactive
projection. It checks every body point, every following plain-text point, and
the singleton final boundary. The control uses the original mapping module.
The candidate uses CursorMapOwned. Counts are 1, 16, and 64 units. Body lengths
are 129 and 4,096 scalars. Both builds use four CPU threads.

All 24 separate raw-binary processes pass in control/candidate/candidate/control
order. The two peak resident-memory observations match for each build and input.

| Body length | Units | Control peak bytes | Candidate peak bytes |
| ---: | ---: | ---: | ---: |
| 129 | 1 | 1,703,936 | 1,703,936 |
| 129 | 16 | 1,835,008 | 1,835,008 |
| 129 | 64 | 2,293,760 | 2,293,760 |
| 4,096 | 1 | 2,195,456 | 2,195,456 |
| 4,096 | 16 | 6,651,904 | 6,651,904 |
| 4,096 | 64 | 20,807,680 | 20,807,680 |

A separate allocator-only batch runs all 12 build/input combinations. Every
tracked allocation class balances at process end. No builds or other tests run
during the memory batch. This fixture does not prove the full editor history
memory limit, general build equivalence, or platform behavior. The candidate
remains temporary.

Evidence in `/tmp/markdew-reverse-control.1UymVV/`:
`tests/MappingManyRuns.bend`, `many-runs-observations.json`, and
`many-runs-allocations.json`. The control fixture differs only in its Cursor
import. Both raw builds use `clang -O2 -pthread` on generated C. The allocator
diagnostic builds add counters only. No generated-C ownership patch is used.

## Owned application candidate: complete mapping proof and memory gates

The separate application snapshot is `/tmp/markdew-owned-app.LIpm1u`.
Its CursorMap module uses the owned work record. Production source is unchanged.
`OwnedBuildProof.bend` states and proves complete build equality against the
original four-branch reference. The induction covers every run list, source
character list, and offset. It includes all four styles and the final boundary.
An exact source comparison confirms that consume, consume_chosen, and
finish_chunk match the original control. The reference uses these functions.

`bend OwnedBuildProof.bend`, `bend ReverseDispatchProof.bend`, and
`bend PROOF.bend` report ALL PROOFS CHECK. The independent `--verdict` check
cannot run because Lean is absent. These proof results concern returned values.
They do not prove runtime memory release.

The candidate passes `tests/session_memory.sh` at 242,810,880 peak bytes for
20 edits, Undo, and Redo, below the unchanged 300 MiB limit. It passes
`tests/memory.sh` at 79,396,864 peak bytes for 20 parse/edit cycles, below the
unchanged 200 MiB limit. These model gates do not measure editor idle memory.
The complete platform batches and matched Return measurements remain open.

The candidate's complete `tests/return_bench.sh` batch returns 0. All 60
Return cases pass baseline, exact source, storage, cursor, view, Undo, and Redo
checks. It uses four native CPU threads on the same Apple M4 reference system.
No other MarkDew batch runs at the same time.

| Source size | Median ms | Sum of 20 samples ms | Ordered samples ms |
| --- | ---: | ---: | --- |
| 102,400 | 0 | 6 | 0,0,1,1,0,0,0,0,0,1,0,0,1,0,1,0,0,0,0,1 |
| 1,048,576 | 0 | 7 | 0,0,0,1,0,1,0,1,0,1,0,0,0,0,1,1,1,0,0,0 |
| 65,538 long item | 45 | 870 | 33,34,36,39,43,43,45,47,48,48,47,46,46,44,43,48,45,45,44,46 |

These results do not show a speed improvement without matched control runs.
A zero sample is below the millisecond clock resolution. The process includes
complete verification outside the command clock. Its observed resident memory
reaches at least 1,980,464 KiB during the full workload. This is a point sample,
not a peak measurement or a matched comparison. The smaller history gate does
not clear the memory cost of this different workload.

The candidate macOS runtime batch completes all runtime checks. Its final
`git diff --check` returns 129 because the isolated snapshot has no Git metadata.
The log is `/tmp/markdew-owned-macos-full.log`. After Git initialization and
staging in that snapshot, both `git diff --cached --check` and `git diff --check`
return 0. No source change is needed. The original batch exit is not reported
as a successful complete batch exit. Its memory observations are 79,364,096
document bytes and 243,269,632 history bytes. A complete batch exit still needs
a fresh run with the snapshot's test setup corrected.

The owned candidate completes eight matched processes and all 160 long Return
checks. Four native CPU threads run in Original control/candidate/candidate/
control order, then Undo candidate/control/control/candidate order. Each process
uses 20 samples. No builds or other test batches run during this comparison.

| Mode | Build | Process medians ms | Peak resident bytes |
| --- | --- | --- | --- |
| Original | Control | 47, 46.5 | 186,105,856; 186,286,080 |
| Original | Owned | 44.5, 45.5 | 186,286,080; 186,089,472 |
| Undo | Control | 43, 43.5 | 181,075,968; 180,846,592 |
| Undo | Owned | 43, 42 | 181,059,584; 180,830,208 |

The tested peaks are similar. These samples suggest a small command-time
difference. They do not establish the earlier rejected variant's 29 ms result,
a general speed improvement, or the 16 ms native-frame target. Complete raw
outputs, ordered samples, and peak measurements are retained in
`/tmp/markdew-owned-app.LIpm1u/matched-owned.json`. The driver is
`matched_owned.mjs`. Both normal binaries use tests/ReturnScaling20.bend;
their source fixtures are identical and their application source differs only
in CursorMap. Extra unused temporary modules are not imported by this fixture.

The owned candidate completes the Linux aarch64 batch with exit 0. The log is
`/tmp/markdew-owned-linux-full.log`. It includes native terminal, Node, Bun,
source-map, scene, patch replay, edit, file, recovery, and memory checks.
The pinned Bend 2.0.34 container uses a writable copy of the read-only candidate
snapshot. This establishes terminal adapter behavior, not a Linux graphical
editor or Windows behavior. Document peak memory is 78,647,296 bytes. History
peak memory is 242,380,800 bytes. Both unchanged limits pass. The corrected
macOS full-batch rerun remains open.

The corrected candidate macOS batch now returns 0. Its complete log is
`/tmp/markdew-owned-macos-recheck.log`. Native GUI, Node, Bun, mapping, scene,
patch replay, editing, file, and recovery checks pass. Document peak memory is
79,380,480 bytes. History peak memory is 243,007,488 bytes. Both unchanged
limits pass. This resolves the snapshot Git setup failure; it does not
establish the native-frame performance target. The matched native results
follow. The candidate is not adopted.

## Owned candidate native comparison

The normal native comparison uses three fixtures and four processes per
fixture in control/candidate/candidate/control order. Each process checks 20
Return events. Stage counters are disabled. The driver requires equal viewport,
scale, caret font, and font size within each fixture. It retains source and
binary hashes, ordered frame and drawing clocks, complete output, and peak
resident memory in `/tmp/markdew-owned-app.LIpm1u/matched-native-owned.json`.
No other MarkDew builds or tests run during these measurements.

All 12 processes return 0. All 240 Return events pass exact source, storage,
view, caret, history, and native presentation checks. Long-item events also
match an independent complete attributed render. The table retains both
process observations per build and fixture, in their observed order.

| Fixture | Build | Medians ms | p95 estimates ms | Peak resident bytes |
| --- | --- | --- | --- | --- |
| 100 KiB | Control | 2.0745; 2.076 | 2.243; 2.305 | 380,633,088; 380,682,240 |
| 100 KiB | Owned | 1.963; 2.0425 | 2.218; 2.239 | 380,059,648; 380,878,848 |
| 1 MiB | Control | 17.514; 16.840 | 19.068; 20.632 | 2,830,483,456; 2,830,958,592 |
| 1 MiB | Owned | 16.4955; 16.562 | 112.544; 19.130 | 2,842,329,088; 2,830,680,064 |
| Long item | Control | 44.748; 45.415 | 46.105; 48.186 | 377,487,360; 377,470,976 |
| Long item | Owned | 43.570; 43.702 | 45.902; 46.556 | 377,700,352; 377,946,112 |

The first four small-document processes pass all 80 events. Control medians
are 2.0745 and 2.076 ms; candidate medians are 1.963 and 2.0425 ms. Their p95
estimates range from 2.218 to 2.305 ms. Peaks range from 380,059,648 to
380,878,848 bytes. These peaks include complete verification outside the frame
clock. They do not measure editor idle memory.

The first one-MiB control process passes all 20 events: median 17.514 ms,
p95 estimate 19.068 ms, peak 2,830,483,456 bytes. The first candidate process
also passes all 20 events: median 16.4955 ms, p95 estimate 112.544 ms, peak
2,842,329,088 bytes. Its final five ordered frame samples are 105.076,
112.544, 114.839, 55.409, and 100.659 ms. The cause of these high samples is
not established. The repeat candidate process also passes all 20 events:
median 16.562 ms, p95 estimate 19.130 ms, peak 2,830,680,064 bytes. The high
tail from the first candidate process does not repeat in this process. It
remains part of the retained evidence. The final control process passes all
20 events with median 16.840 ms and p95 estimate 20.632 ms.
The drawing clocks for those five candidate events are 0.226, 0.185, 0.243,
0.143, and 0.272 ms. Drawing accounts for only a small part of the measured
frame delay. These two clocks do not identify the remaining work or its cause.
The long-item medians improve by about 1–2 ms. The p95 estimates remain above
45 ms. The one-MiB and long-item observations do not meet the 16 ms target.
The estimates use the nineteenth sorted value from only 20 events per process.
Display completion does not measure physical screen presentation. The small
timing differences do not establish a useful general product improvement.

The architect recommends nonadoption of this owned candidate. Its added work
records and proof modules do not have a clear native performance benefit.
Production source remains unchanged. The isolated 112.544 ms p95 observation
stays in the evidence; its cause is not established. The roughly 2.83 GB native
benchmark peak is a separate issue shared by both builds and needs its own
retained-memory profile.

One bounded early-release experiment starts in
`/tmp/markdew-early-release.jWNJZJ`. It removes MappingDone and releases the
owned text before mapping. Complete build equality still passes Bend's checker.
The reduced generated C retains the text during completed character conversion,
then releases it before the mapping scan. Reduced allocation checks and matched
core timing results follow. This does not change the product target.

All six active shared-source plain cases and all 24 style cases pass every
cursor point check. Allocator-only diagnostic counts balance every tracked
class. These diagnostics do not change generated ownership code. Complete
build equality passes Bend's checker; the independent kernel remains unavailable.

All 160 matched core cases pass in eight separate processes. Original control
medians are 47 and 46 ms; early-release medians are 45.5 and 45 ms. Undo control
medians are 43.5 and 44 ms; early-release medians are both 42.5 ms. Original
peaks range from 186,236,928 to 186,335,232 bytes. Undo peaks range from
180,764,672 to 181,075,968 bytes. No other builds or tests run during timing.
Complete results are in `matched-early.json`, `owned-observations.json`, and
`owned-styles-observations.json` in the early-release directory.

The architect recommends stopping and not adopting the early-release candidate.
The roughly 1–2 ms core gain does not justify another native campaign. No
production source changes result from either ownership candidate. The next
diagnostic will locate growth within the unchanged native one-MiB benchmark,
with numeric RSS and Bend allocator snapshots at phase boundaries. The Bend
allocation totals and process RSS remain separate measurements.

### Native baseline memory phases

The unchanged one-MiB baseline diagnostic in
`/tmp/markdew-native-memory.j2gROW` passes all 20 native events. It records
80 document-check evaluation completions and the exact 222 expected phase
snapshots. The original Boolean checks remain active. Evaluation completion
alone does not mean that a check passed; the complete process exits with zero.
Raw output and numeric snapshots are in `observations.json`, `stdout.log`,
and `stderr.log`. Allocator counters change execution cost. These clocks are
not performance evidence.

Initial presentation RSS is 568,606,720 bytes. Final completion RSS is
2,843,525,120 bytes. The process peak is 2,843,574,272 bytes. The sum of
allocated-minus-freed class bytes grows from 379,210,344 to 2,062,005,416.
These totals are not resident-page measurements.

Across 20 samples, the baseline, returned-document, Undo, and Redo evaluation
intervals add 503,326,720, 503,318,256, 588,495,360, and 503,317,920 tracked
bytes respectively. The after-Return intervals remove 106,290,776 tracked
bytes in total. Final completion removes another 309,361,528 tracked bytes.
At final completion, class 0 retains 687,335,128 bytes and class 1 retains
1,374,670,288 bytes. All observed larger classes balance.

The largest summed RSS increase is in the Redo evaluation interval:
1,033,601,024 bytes. Each interval includes work since the previous snapshot;
it does not isolate one function. Snapshots are not globally quiescent. This
result selects document verification for further allocation tracing. It does
not establish a leak, an AppKit cause, or normal idle memory. No production
source changes result from this diagnostic.

The architect reviewed the result and selected a test without the GUI. Load
the same one-MiB source once, then repeat the unchanged `Result.verified`
baseline check once and five times in separate processes. Keep the Boolean
checks. Compare final allocation balances before tracing wrappers. The paired
class-0 and class-1 totals are consistent with the earlier SCon pattern, but
they do not yet identify a constructor or owner. If baseline growth does not
repeat, test the returned and Undo states separately. Keep all reference checks
in the native benchmark.

### Baseline verification without a window

`/tmp/markdew-verify-memory.XITNkA/tests/VerificationMemory.bend` uses the same
one-MiB fixture and the unchanged `Result.verified` predicate. It loads one
stored session, selects the end position, and checks that same baseline once
or five times. A separate zero-check control also passes. No window is opened.
All six processes pass: three allocation-only runs and three wrapper-count
runs. The generated ownership code is unchanged. Exact allocator and wrapper
hook contexts must match once before compilation.

Final tracked bytes for zero, one, and five checks are 23,567,976, 50,331,648,
and 150,994,944. Allocation-only process peaks are 331,874,304, 546,734,080,
and 650,313,728 bytes. The zero-check path does not force the same selection
and verification work, so it is not an identical-setup subtraction control.
The one-to-five comparison adds exactly 25,165,824 tracked bytes per check.

Wrapper counts identify only SCon as outstanding at process end. Its counts
are 981,999, 2,097,152, and 6,291,456 respectively. Every other observed wrapper
kind balances. The four added checks each leave 1,048,576 additional SCon
wrappers. Each wrapper is eight bytes; its two-field constructor is sixteen
bytes. These counts account for the class-0 and class-1 byte totals. The result
locates repeated retention in the baseline verification path without a native
window. It does not yet identify the responsible function or establish a
general compiler defect. Raw records remain in `observations.json` and
`wrappers-observations.json`. Diagnostic clocks are not performance evidence.

### Verification component isolation

All eight one- and five-check processes pass in `parts-observations.json` in
the same diagnostic directory. `VerificationParts.bend` keeps the setup and
runs one component per process. Whole verification and `View.valid` both
leave 2,097,152 SCon wrappers after one check and 6,291,456 after five checks.
`Storage.matches` and `Check.snapshot_is` each leave 1,048,576 after either
one or five checks. Thus only view verification reproduces repeated growth
in this split. All other observed wrapper kinds balance.

Six further processes pass in `views-observations.json`.
`VerificationViews.bend` separates the two view comparisons. Comparing visible
text with scene text leaves 981,999 SCon wrappers after either one or five
checks. Comparing the retained scene with an independent full scene build
leaves 2,097,152 after one and 6,291,456 after five. Complete view verification
in that same binary reproduces the latter counts. This selects the independent
scene-build path for further tracing. Separating components can change sharing;
the complete-check reference remains necessary.

The inspected generated `BlockScene.build` saves its input source across
`Blocks.parse`, then explicitly sinks that saved source before scene scanning.
The inspected line scan uses borrowed `term_peek` reads. These observations do
not identify which constructor path leaves the outstanding wrappers. They do
not justify adding an unqualified drop. No production source is changed.

The independent-build mode also passes one- and five-check constructor-epoch
traces. `epochs-observations.json` retains both runs. The audit finds 278
two-word allocation declarations: 256 constructor sites and 22 closure sites.
There are 41 SCon sites and no unknown sites. Numeric hooks record constructor
fields only after both writes and before publication. Allocation generations
and constructor epochs distinguish reused cells. Ownership code is unchanged.

Both traces have zero active reuse, overflow, and open-constructor rebuild
errors. Sampling collisions are nonzero, so this is partial evidence. The
one-check run has 464 outstanding sampled wrappers; 345 have a resolved
constructor epoch and 119 do not. The five-check run has 1,270 outstanding
sampled wrappers; 870 have resolved epochs and 400 do not. Each resolved
identity matches both target location and allocation generation.

All resolved outstanding epochs are open SCon constructors at only two sites:
site 55, `spin_112`, the line-text reconstruction; and site 255,
`FID_STRING_APPEND_K931`, string append. Their observed outstanding sample
counts are 78 and 267 for one check, then 183 and 687 for five checks. These
origins point to parsed block strings. The trace does not assign an origin to
unresolved or skipped samples, or identify where an owner was lost. Source
release changes remain unjustified.

### Plain paragraph handoff

All eight reduced paragraph processes pass complete text, style, and point
checks in `paragraphs-observations.json`. A single plain paragraph has 4,096
characters. The many-paragraph fixture has 32 paragraphs with 129 body
characters and two newlines each, for 4,192 characters. Direct output checks
leave one source-length of SCon wrappers per repetition. Independent expected
scene comparison has the same per-repetition increase. Thus `same_scene` is
not required for this growth.

All twelve further handoff processes pass in `handoff-observations.json`.
Parse and reconstruct checks every source scalar and balances all allocation
classes and wrappers. Parsing then scanning a scene retains 4,096 or 4,192
SCon wrappers per repetition. A direct paragraph piece from the shared fixture
retains one input-length after either one or five checks. That shared-input
case does not establish correct release of fresh inputs.

A scoped C causal diagnostic releases only the saved source in the inspected
scan-loop continuation after successful borrowed scalar counting. Its first
balance assertion fails: the single paragraph still retains 98,304 bytes.
The process itself passes all semantic checks. The failed raw logs are kept
as `causal-first-single-scan-one.*`. A numeric execution counter then confirms
one or five patched-loop visits for the single paragraph, and 64 or 320 for
the many-paragraph fixture. All twelve semantic runs pass in
`causal-handoff-observations.json`, but paragraph retention remains.

The release removes only the 32 blank-line cells per many-paragraph repetition:
retained SCon counts fall from 4,192 to 4,160 per repetition. The single
paragraph count does not change. The diagnostic is not adopted. The result
does not support the initial explanation that the patched loop was bypassed.
The architect selects fresh text inside each repetition, with active inline,
inactive inline, and literal construction as the next controls. Keep the
original ownership code and the count diagnostic separate.

All 24 fresh-input cases pass in `fresh-observations.json`. Fresh text is
reconstructed from a newly parsed source inside each repetition. Parse-only
and literal scene construction balance all classes and wrappers. Fresh
paragraph pieces and both active and inactive inline scenes retain 4,095
SCon wrappers plus one unwrapped constructor per 4,096-character repetition.
Their tracked totals are 98,296 bytes for one check and 491,480 for five.
For the 4,192-character fixture, the counts are 4,191 wrappers plus one
constructor per repetition, with 100,600 and 503,000 tracked bytes. Thus
fresh inputs expose repeated retention in both common inline paths.

The inspected `Projection.mapping` converts its source with borrowed reads
into independent character-list cells, then calls `Cursor.build`. Its generated
case neither carries nor releases the original source after that conversion.
A separate scoped C diagnostic releases only that owner after successful
conversion. It does not include the count release. All 24 complete-output
cases pass and all allocation classes and wrapper kinds balance in
`mapping-fresh-observations.json`. A numeric counter records exactly one or
five visits in each mapping case and zero in parse-only and literal controls.
This establishes a causal result for the inspected reduced mapping path.
It is not a general generated-C patch or a production fix. A Bend boundary
that retains and then releases the source explicitly is the next candidate.

### Bend owned projection mapping candidate

The candidate remains isolated in `/tmp/markdew-projection-owned.RW228O`.
`Projection.mapping_work` retains the source with its completed character
list. `mapping_chars` releases the work record's source before `Cursor.build`.
The arbitrary-source, arbitrary-run complete mapping equality passes Bend's
checker in `tests/ProjectionMappingProof.bend`. This is an output proof, not
a runtime resource proof. The independent kernel remains unavailable.

All 24 fresh-input cases pass with every tracked allocation class and wrapper
kind balanced. The original one-MiB baseline verification passes its output
checks, but its allocation counts do not balance. Its raw records show
50,331,648 retained bytes after one check and 150,994,944 after five checks.
The previous statement that all of these counts balanced was incorrect.
These runs use
allocator-only and wrapper-count diagnostics, with no C ownership patch.
The generated conversion keeps the source once, completes borrowed character
conversion, and releases that conversion owner. The work-record extraction
then releases its separate retained owner. This accounts for the two releases.
No scalar-count release is included.

The seven-suite mapping regression passes natively with four threads and on
Bun. It covers projection parts, cursor mapping, consumption and dispatch,
block scenes, scene indexes, and session views. The default Node run fails
in the scene-index suite. The exact unchanged control fails at the same phase.
SceneIndex alone also fails under default Node for both builds. Its raw logs
are `node-scene-index.log` in the candidate and original diagnostic directories.
The separate six-suite Node regression passes; it includes the same other
suites and does not replace the failed full suite. No stack-limit flags are
used. The architect accepts this as a separate baseline Node issue for further
candidate evaluation, not as a passing full Node gate. Complete application
gates and the native memory diagnostic remain required before adoption.

### Opening-scan compiler comparison, 2026-10-04

The host compiler reports Bend 2.0.35. Its binary SHA-256 is
`99b3de8f6c5643d245bed839df2c28d1bb12efd41bb221154d25c15695b72e8e`.
The full candidate macOS batch stops at OpeningScanCheck with a memory fault.
An isolated unchanged control also fails at default and four-thread settings.
LLDB shows EXC_BAD_ACCESS in WL_FID_LIST_APPEND. The trace does not establish
the cause.

A task-local Bend 2.0.34 archive matches the release asset SHA-256
`a60c820c0ced758d8ace839507ff6c508a204ce4ef0f45e1089ed7bc73e8c267`.
Its binary SHA-256 is
`766e4c0bd85e2d8df3babfb2180a882dfa351679cad9b45eb7b597b48279c834`.
The host and local Base files have the same hash. Both control and candidate
OpeningScanCheck builds pass at default and four-thread settings with 2.0.34.
This is a version-dependent failure in this fixture. The host installation
remains unchanged. Earlier candidate results must not be combined into a
single gate without a recorded compiler version. A fresh full 2.0.34 batch
is required before adoption.

Toolchain and build records are in
`/tmp/markdew-toolchain-2.0.34.1eI31E/COMPARISON.md`.
Raw logs and binaries remain in the control and candidate directories named
above. The detailed control trace is `opening-scan-lldb-detail.log`.

The local 2.0.34 candidate proof prints ALL PROOFS CHECK. The complete
seven-suite mapping regression passes natively with four threads and on Bun.
The default Node regression still fails after the block-scene suite in both
the unchanged control and candidate. Both Node builds now use the recorded
2.0.34 compiler. This remains a separate open Node compatibility issue.

All 24 fresh-source candidate cases also pass after regeneration with 2.0.34.
Every tracked allocation class and wrapper kind balances at process end.
The raw records are `2034-fresh-observations.json` and the `2034-fresh-*` logs
in the candidate directory. These are allocation diagnostics, not timing
evidence. The full macOS and Linux batches remain in progress.

The 2.0.34 one-MiB candidate rerun also passes its output checks but retains
50,331,648 bytes after one check and 150,994,944 after five checks. The latter
contains 6,291,456 outstanding SCon wrappers. Its raw records are
`2034-wrappers-observations.json`. The earlier `wrappers-observations.json`
already shows the same counts. Thus this retention is not established as a
compiler-version difference. The inspected mapping conversion and extraction
code is identical in the two generated candidate files. The native memory
profile is on hold. The candidate cannot be adopted as the whole-check memory
fix. The next isolation must identify which view path still retains source.

The pinned view isolation separates this loss from visible-text checks.
Candidate `visible` checks balance at one and five repetitions. Independent
scene `build` checks retain the same counts as the complete view checks.
Records are `2034-views-observations.json` in the candidate directory.

Four fresh `scan` cases expose one retained source chain per repetition:
single one/five retain 98,304/491,520 bytes; many one/five retain
100,608/503,040 bytes. Every output character, style, and point passes.
The strict balance assertion fails. These cases were absent from the prior
24-case matrix.

An isolated generated-C diagnostic combines the existing owned mapping
boundary with one scoped count-owner release. The inspected scan continuation
K172 invokes borrowed scalar-count spin63, then has no remaining use of its
saved source. Releasing that owner after successful counting balances all
four cases. Numeric execution counts are 1/5 for single and 64/320 for many.
Output checks remain unchanged. Records are
`2034-causal-scan-observations.json`; the patch is `causal_scan_2034.mjs`.
No production C ownership patch is adopted. The architect requires an isolated
Bend count boundary, equality proof, strict reduced and whole-check balance,
and block-kind coverage before new application gates.

The separate Bend count candidate is in
`/tmp/markdew-projection-count.mcQK3o`. It retains the owned mapping boundary
and adds `CountWork{source, count}` only at the BlockScene scan-loop count site.
The result equality to `D.count_scalars(source, 0n)` prints ALL PROOFS CHECK.
Generated spin50 keeps the source once, counts through a borrowed traversal,
and releases the count owner. Spin51 releases the separate retained work owner.
This accounts for one input owner plus one keep. The scene source owner is
separate and remains valid.

All four scan cases pass strict zero-byte and zero-wrapper assertions with
allocator-only diagnostics. No C ownership patch is present. Full character,
style, and cursor-point checks remain unchanged. The whole one-MiB balance
gate and complete block regression are pending. This candidate is not in the
production source or in the frozen mapping-only application batches.

The combined candidate's strict whole-check balance gate fails after one
verification. It retains 25,165,824 bytes and 1,048,576 SCon wrappers, half
the mapping-only result. Zero checks balance. The raw strict records remain
`2034-wrappers-observations.json`; the assertion stops before five checks.
This is not a complete fix. A separate observational runner collects one/five
counts without replacing the strict adoption gate. The architect requires
new view-component isolation, then exact mixed-fixture parse/scan/comparison
isolation before a further ownership change.

The separate observational whole-check run retains 25,165,824 bytes at both
one and five checks. The combined candidate removes the observed per-check
growth, but does not meet zero balance. The view and independent build
components also retain this constant amount at one/five checks. Visible-only
checks balance. A zero-check run does not force the same fields, so it does
not prove that the constant amount is only setup. Records are
`2034-observational-wrappers-observations.json` and
`2034-views-observations.json` in the combined candidate directory.
The complete seven-suite mapping regression passes natively with four threads.

### Matched mixed-source ownership split

The combined candidate's `MixedSceneOwnership` test uses the exact one-MiB
mixed fixture. It builds one reference scene and forces every run text, style,
and source point before each mode, including the zero control. Parse, scan,
and scene comparison each pass at zero, one, and five repetitions. All nine
cases retain 21,970,176 bytes and 915,424 SCon wrappers at process end.
There is no added allocation delta from the repeated calls. The reference
must still release after the last IO step; this is not a live-phase count.
Records are `2034-mixed-observations.json` in the combined candidate directory.

A numeric constructor trace audits all 147 two-word declarations: 141
constructor sites, six closures, 18 SCon sites, and no unknown declarations.
The zero-build run has 215 live wrapper samples. Of these, 209 resolve to open
constructor epochs: 202 to Scalar.from_reversed and seven to block line-text
construction. Six samples are unresolved. Sample tables report no overflow,
active reuse, or open reconstruction. Hash collisions make coverage partial.
The trace does not retain Bend terms or change their ownership. These counts
are not timing evidence.

Generated comparison code consumes the left text but borrows the right text
in spin62. The same-runs loop takes the owned right run, extracts `_f_16`,
compares it, and never releases or captures that text afterward. A scoped
diagnostic tests a release only after successful comparison. This is a test
comparison boundary, not an application mapping boundary. The architect
requires strict final balance across all nine cases and mismatch/early-exit
coverage before a test-only Bend correction.

The frozen mapping-only full macOS and Linux batches both finish with exit 0
under the recorded Bend 2.0.34 toolchains. Their logs are
`/tmp/markdew-projection-macos-2034-full.log` and
`/tmp/markdew-projection-linux-2034-full.log`. The Linux compiler binary hash
is `d4821d04932218216c9dc906223ed0e23dd86726d4357a567fb76ee6c976db4e`.
These batches validate only the frozen mapping candidate. They do not validate
the separate count candidate or the pending comparison correction. Concurrent
allocation diagnostics ran during these batches; their printed elapsed times
are not used as matched performance evidence.

The scoped C comparison diagnostic passes all nine mixed cases with strict
final allocation and wrapper balance. It changes only the inspected successful
same-runs comparison boundary. It is not adopted.

The separate Bend test-comparator candidate is in
`/tmp/markdew-owned-boundaries.mpdGuc`. It keeps the original recursion as
`Utf8Check.text_equal_loop` and wraps the comparison in
`TextCompareWork{right, result}`. Public output equality for arbitrary left,
right, and initial Bool prints ALL PROOFS CHECK. Thirteen success, Unicode,
shared-input, first/last mismatch, unequal-length, empty-side, initial-False,
scene-style, scene-text, and unequal-run-count paths pass strict final balance.
The nine matched mixed cases also balance without any C ownership patch.
Records are `2034-paths-observations.json` and `2034-mixed-observations.json`.

The whole editor verification fixture still fails strict balance after one
check with 25,165,824 retained bytes. Its original failed records remain
`2034-wrappers-observations.json`. This is separate from the repaired comparison
boundary. A numeric whole-fixture constructor trace is pending. No production
change or combined-candidate platform pass is claimed.

The whole-fixture numeric trace completes successfully. All 278 two-word
declarations are classified as 256 constructor sites and 22 closures, including
41 SCon sites. At process end, 224 live wrapper samples remain. Of these, 176
resolve to open epochs: 36 to block line-text construction (spin99, site52)
and 140 to String.append (K905, site255). Forty-eight remain unresolved.
The tables report zero overflow, active reuse, and open reconstruction;
collisions make coverage partial. These are origin sites, not final-owner
proofs. Raw records are `epochs-whole-one.*` and
`epochs-whole-one-summary.json` in the comparator candidate directory.

The trace does not establish the proposed fixture `String.length` cause.
Cache scan inspection shows its generated FID_STRING_LENGTH takes and releases
each source cell, so a blanket count-owner drop at that call would be wrong.
Continue by tracing the parsed-piece and reconstructed-source handoffs. Keep
the strict whole-fixture failure and all candidate source changes isolated.

### Owned document-source reconstruction, 2026-10-04

The second test comparator, `DirectCheck.source_equals`, consumes both inputs
in generated code. Its mismatch closure releases both tails. It does not
support the proposed second-comparator cause.

The current comparator candidate's separate storage, source, view, and build
checks each retain 25,165,824 bytes. The visible-only check balances. These
allocator-only records are `current-view-observations.json` in
`/tmp/markdew-owned-boundaries.mpdGuc`.

Generated `Document.source_loop` spin186 takes each block and its owned text
`_f_7`. It calls prepend spin50, which reads text cells with `term_peek` and
constructs independent scalar cells. The caller does not release or capture
the input text after this call. A scoped diagnostic adds one release after
successful prepend, with a numeric site counter. The complete one-MiB fixture
passes zero, one, and five checks with all tracked allocation classes and
wrapper kinds balanced. Site counts are 0, 199734, and 998670. Records are
`2034-causal-source-observations.json` in the same directory. This C ownership
patch is diagnostic only.

A separate Bend candidate is in `/tmp/markdew-owned-source.Spv3pO`. It adds
`Document.PrependWork{text, reversed}` and uses `prepend_owned` only in the
document source loop. The original prepend recursion is unchanged. Exact
output equality for arbitrary input text and reversed accumulator prints
ALL PROOFS CHECK. Generated spin157 keeps the text once, invokes borrowed
prepend, and releases the conversion owner. Spin158 releases the retained work
owner. The two releases account for the input owner and the added keep.

This Bend-only candidate passes strict final allocation and wrapper balance
for the whole fixture at zero, one, and five checks, without a C ownership
patch. Its `2034-wrappers-observations.json` contains all three records.
Twelve source paths also pass complete reconstructed-text checks and strict
final balance: empty, Unicode single block, multiple block kinds, blank lines,
shared inputs, empty prepend, nonempty reversed tail, CRLF, BOM, NUL, combining
characters, and a 65,536-scalar block. Records are
`source-path-observations.json`. These are allocation diagnostics, not timing
evidence.

The architect approves broader gates after the extra source cases pass.
The combined candidate's macOS and Linux batches have started with pinned
Bend 2.0.34. Logs are `/tmp/markdew-owned-source-macos-2034-full.log` and
`/tmp/markdew-owned-source-linux-2034-full.log`. Their results remain pending.
The four boundaries remain distinct: production mapping, scene scalar count,
document source reconstruction, and test text comparison. No production
adoption or combined platform pass is claimed. Native memory profiling remains
required after these gates.

The matched native memory builds are prepared, but have not run. The unchanged
control snapshot is `/tmp/markdew-native-control2034.qzPW22`; the combined
candidate is `/tmp/markdew-native-owned.uI060R`. Both use the recorded macOS
Bend 2.0.34 binary and `clang -O2 -pthread -x objective-c -fobjc-arc`, with
the Cocoa framework. Their diagnostic binary SHA-256 values are respectively
`2c5bceb734d9f903bffb0151654a84554f1d843e91cefefa82515a37dcc28f61`
and `66f276b0b0a5c17d7afe37b5aef01b8630ffc709ee770a645f37b4da91c157b9`.
The first compile command omitted ARC and failed for the existing weak
property. Adding ARC fixes both builds without a source change. The architect
reviewed this command correction. Exact commands and hook selection are in
the candidate snapshot's `BUILD.md`.

The native tests will use the same 20-frame, 80-verification, 222-phase
diagnostic. They will run sequentially after the platform batches finish.
The comparison includes all three production boundaries and the test comparison
boundary; it cannot assign a result to one boundary alone. These O2 allocation
diagnostics must not be combined with earlier O3 timing samples.

All four isolated boundary proofs pass in the combined candidate. Its complete
seven-suite mapping regression passes natively with four threads and on Bun.
The default Node mapping regression still exits with failure. This does not
replace the open Node compatibility issue with a passing gate. Logs are
`mapping-regression-{native,bun,node}-2034.log` in the combined source snapshot.

### Default-Node cache-join stack isolation

The scene-index test is split into ten independent fixtures. Nine pass on
default Node; only the existing 4097-repeat large fixture fails. These records
are `node-index-isolation-observations.json` in the combined source snapshot.
Staged IO output shows entry to the large test, then failure during cache
rendering, before its independent scene comparison and sparse position checks.

A diagnostic copy of the generated JavaScript reports the caught RangeError
stack before the unchanged failure response. `Error.stackTraceLimit` affects
only the number of recorded frames; the execution stack limit is unchanged.
The control and candidate both show `List.append` recursion called from
`BlockSceneCache.join_rendered`, then `scan_tree_branch`, `scan_tree`, and
`render_blocks`. Their raw `node-index-stack.*.log` records remain in
`/tmp/markdew-native-control2034.qzPW22` and the combined source snapshot.

A separate candidate, `/tmp/markdew-node-append.7B90z0`, replaces only the
three list appends in `join_rendered`. The helper reverses the left list, then
uses a tail-recursive prepend loop to keep left-before-right order. Parallel
branch rendering and the large fixture are unchanged. Equality to `List.append`
for arbitrary Data-element lists prints ALL PROOFS CHECK. The complete mapping
regression now passes on default Node, including the original large fixture.
Its native, Bun, and strict whole-fixture memory checks are in progress.
This candidate is separate from the frozen ownership platform batches. No
production adoption or complete platform pass is claimed for it.

The append candidate's complete native and Bun mapping regressions also pass.
Its whole one-MiB fixture passes strict final balance at zero, one, and five
checks: every tracked allocation class and wrapper kind has zero outstanding
count. Records are `2034-wrappers-observations.json` in the append snapshot.
The architect accepts the helper and induction proof for the Data lists used
by these joins. The proof does not cover every `Kind(a)` that the generic
helper accepts. Combined application gates and exact patch-order checks remain
required before adoption.

The append candidate's complete Linux application batch has started. Its log
is `/tmp/markdew-node-append-linux-2034-full.log`. The frozen ownership macOS
and Linux batches remain separate and are still running.

The append candidate also passes native `SceneRangeCheck`: complete one-MiB
source/reference scenes, sparse source positions, patch replay, and remote
selection all pass. An extra JavaScript run of that same test fails on Bun in
both unchanged control and append candidate. The candidate diagnostic stack
shows recursion in test helper `HostPatchCheck.same`, called from `matches`
and `valid`. It compares the complete host-chunk list through non-tail Bool
conjunction. This failure does not establish an incorrect patch order. The
native result remains valid, and the separate mapping regression passes on
all three runtimes. An independent default-Node run also fails at
`HostPatchCheck.same`. Raw `scene-range-*` logs remain in the append snapshot.

The architect approves a separate test-only tail-loop comparator, with exact
output equality to the original recursion, full ID and run comparisons, and
the unchanged decision to ignore the `fresh` flag. Empty, unequal-length, ID,
run/style mismatch, and unchanged full-fixture cases must pass before claiming
the JavaScript patch-replay gate. This comparator change is not implemented
in the frozen platform batches.

### Tail-loop host patch comparison

The separate test candidate `/tmp/markdew-patch-compare.FO5JPe` retains the
original comparison recursion as `HostPatchCheck.same_reference`. The public
comparison uses a tail loop and stops after a mismatch. Every chunk ID and run
comparison remains present; the original choice to ignore `fresh` remains.
The accumulator equality for arbitrary lists and initial Bool, plus public
output equality, print ALL PROOFS CHECK in `HostPatchCompareProof.bend`.

Eleven empty, unequal-length, ID/text/style mismatch, Unicode, differing-fresh,
shared-input, first/last mismatch, and initial-False checks pass on native,
Node, and Bun. Allocator-only and wrapper-count diagnostics also pass strict
final balance. Records are `patch-paths-balance.json` and `patch-paths.*.log`.
The unchanged complete one-MiB `SceneRangeCheck` now passes independently on
all three runtimes. Its full scene, source-point, patch-replay, and remote
selection checks remain unchanged. Logs are `scene-range-*-2034.log`.

The frozen ownership-only application batches both finish with exit 0 on macOS
and Linux. The frozen append candidate's Linux batch remains in progress.
These completed batches do not cover the new test comparison correction.
The architect requires one final combined snapshot and fresh complete gates
before production adoption.

The pinned native control memory diagnostic has started in
`/tmp/markdew-native-control2034.qzPW22`. The ownership candidate will run
after that control finishes. Only one native window test runs at a time.
The control result, matched comparison, and final combined gates remain pending.

### Combined gate snapshot

The fixed combined snapshot is `/tmp/markdew-combined-final.BQVNNw`.
Its staged source/test/document tree hash is
`696f8b94d288b41ae668d63a94eda445dd2e82e9`. It contains the three ownership
boundaries, the cache list-append helper, and both test comparison corrections.
The width-proof generator check, root `PROOF.bend`, all six new boundary
proofs, and staged whitespace checks pass with pinned Bend 2.0.34.

Its full check script also runs the six boundary proofs and the unchanged
large JavaScript scene-range test on each installed runtime. It runs the new
host patch mismatch checks natively and on each installed JavaScript runtime.
These gate additions have not yet completed as one application batch. The
snapshot remains separate from the production source.

Both prepared native memory snapshots now also have allocator-and-wrapper
diagnostic builds, named `diagnostic-wrappers`, and a separate observer named
`observe-wrappers.mjs`. The observer checks the same 20-frame, 80-check,
222-phase sequence and records final wrapper and allocation counts. It does
not silently assert zero for the unchanged control. The earlier allocator-only
control run remains live; its files are separate and will not be overwritten.
Wrapper diagnostics still require sequential native runs before comparison.

The allocator-only pinned native control finishes with exit 0, 20 frames,
80 checks, and the exact 222-phase sequence. Peak RSS is 2,755,395,584 bytes.
Initial presentation has 379,210,344 tracked live bytes; final completion has
2,062,005,416 tracked live bytes. These phase counts are not final process-end
balance or timing evidence. Its raw `observations.json`, stdout, stderr, and
exit record remain in the native control snapshot.

The final combined source snapshot also passes a fresh strict whole-fixture
allocation and wrapper gate at zero, one, and five checks. All final tracked
counts are zero. Its records are `2034-wrappers-observations.json`.

The wrapper-instrumented native control is now running. Its files use the
`wrappers-` prefix. The final combined native candidate is prepared in
`/tmp/markdew-native-combined.4V8Unv`; it replaces the planned ownership-only
native candidate so the comparison covers cache append as well. The architect
accepts this scope update. The native control/candidate src/tests tree hashes
are `39576fd246f19cff8216f157e0884a663bf18671` and
`e2d2fbc34db06eec4c062cd115cc3082f963a19c`. Both use the same pinned Bend,
Apple clang 21.0.0, O2, ARC, Cocoa, four threads, and numeric diagnostic hooks.
Exact commands, compiler and binary hashes, and hook identifiers are in the
combined native candidate's `BUILD.md`. This matched result is pending.

The frozen append candidate's complete Linux batch now finishes with exit 0.
The final combined snapshot's complete Linux batch has started; its log is
`/tmp/markdew-combined-final-linux-2034-full.log`. The combined macOS batch
will run after the sequential native diagnostics, to avoid concurrent native
window tests.

The separate adoption review copy `/tmp/markdew-adoption-review.lyqrau` adds
four root laws and their proofs: complete projection mapping points, scene
scalar count, exact document prepend output, and cache append order for Data
lists. Its root proof prints ALL PROOFS CHECK with pinned 2.0.34, and staged
whitespace checks pass. The architect reviewed the concrete law integration
and found no correction. Its tree hash is
`48d842d80ec6cf1c6386504045f39b43653d9722`.

These laws establish output equality. They do not prove runtime allocation
balance or independent Lean validation. The append proof depends on
`tests/ListAppendProof.bend`, which must be included with the adopted files.
The review copy's production content is identical to the frozen combined
snapshot. Neither copy has been applied to the app source. Remaining platform
and matched native results still control adoption.

The wrapper-instrumented native control completes with exit 0, 20 frames,
80 checks, and the exact 222-phase sequence. Its peak RSS is 2,832,629,760
bytes. Its separate `wrappers-observations.json` contains phase and final
process-end allocation/wrapper counts: 2,062,005,400 retained bytes and
85,916,891 outstanding wrappers. Final completion has 2,062,005,416 tracked
live bytes, before the last 16 bytes release. The final combined native candidate
has started with the same fixture, flags, thread count, and numeric hooks.
No native window tests overlap. A prepared comparison script checks matched
phase order and reports both final counts without treating output success as
zero balance. The matched candidate result remains pending.

A running-phase reader uses only complete class rows before the next phase
marker. The first five candidate baseline-restored phases each contain
358,095,408 tracked live bytes. Matched control phases contain 458,758,848,
559,422,432, 660,086,016, 760,749,600, and 861,413,184 bytes. Thus these
completed candidate phases have no observed per-frame growth, while control
adds 100,663,584 bytes per frame. Candidate RSS in these phases ranges from
799,391,744 to 805,847,040 bytes. This is partial phase evidence, not final
process balance or timing evidence. Records are
`partial-phase-observations.json` in the combined native candidate snapshot.

The first combined native run reached frame 15, then the observer stopped it
at its 600-second deadline. Its exit record reports SIGTERM and a timeout.
The failed run's `wrappers-` files remain unchanged. Stable partial counts
do not establish completion or final allocation balance.

The architect approved one run with a 1,200-second observer deadline. The
binary, input, four threads, 20 frames, 80 checks, and 222 phases are unchanged.
This run is in progress and uses separate `wrappers1200-` files. The completed
control also meets the longer deadline. The comparison records both observer
limits and cannot support matched speed claims. The cause of the longer
runtime is not established.

The final combined Linux application batch finishes with exit 0. Its log is
`/tmp/markdew-combined-final-linux-2034-full.log`. The combined macOS batch
and complete native comparison remain pending. No candidate source changes
have been applied to the app.

The native rerun remains active through frame 11. A separate waiting process
will start the frozen combined macOS batch only after the native observer
and native program both stop and the exit record confirms success. It writes
`/tmp/markdew-combined-final-macos-2034-full.log`. This keeps native window
tests separate and needs no manual input.

The architect reviewed the planned file scope for adoption. Keep the five
production files and required proof/test dependencies. Exclude unrelated
benchmark edits and temporary allocation diagnostics. The host patch checks
require `TextCompareOwnershipCheck.bend`; preserve its regression cases.
Also preserve the document reconstruction cases in
`DocumentSourceOwnershipCheck.bend` in the permanent runner. Check imports,
proofs, and focused regressions on the exact reduced tree before adoption.
The frozen snapshot's broader gates do not alone validate that reduced tree.

The reduced adoption copy is `/tmp/markdew-adoption-exact.6CdASv`. Its staged
source/test/law/proof tree is `261f1ee4b2957d4ce031c23ae2ea33b4b2415684`.
Its production source matches the frozen combined source exactly. All 1,240
local Bend imports resolve. Shell syntax and staged whitespace checks pass.
The root proof and all six boundary proofs pass. Its permanent runner includes
13 text comparison paths and 12 document reconstruction paths on native Bend
with four threads, default Node, and Bun. All 75 path runs finish with exit 0.
The log is `/tmp/markdew-adoption-exact-ownership.log`. The extra complete
scene-range and patch checks on this exact copy remain in progress. This copy
has not been applied to the app.

The reduced copy's complete host patch and one-MiB scene-range checks now
finish with exit 0 on native Bend, default Node, and Bun. The log is
`/tmp/markdew-adoption-exact-scene.log`. Node and Bun were both installed;
no runtime was skipped in these focused batches. The architect found no
dependency or ordering correction in the reduced copy or runner placement.
These path checks establish output coverage. Allocation balance remains a
separate diagnostic result. Native completion and the macOS application
batch remain required before adoption.

The longer native diagnostic completes with exit 0: 20 frames, 80 checks,
and the exact 222-phase sequence. The matched comparison passes phase-order
and output checks. Candidate peak RSS is 821,428,224 bytes; control peak RSS
is 2,832,629,760 bytes. All 20 candidate baseline-restored phases contain
358,095,408 tracked live bytes. Control adds 100,663,584 bytes per frame.

Final cleanup is incomplete. The candidate retains 25,165,816 tracked bytes
and 1,048,575 wrappers at process exit. Control retains 2,062,005,400 bytes
and 85,916,891 wrappers. Candidate final completion has 25,165,832 live bytes,
before the last 16-byte release. These completed results establish reduced
growth, not strict final balance or a speed improvement. Raw records are
`wrappers1200-observations.json` and `matched-comparison.json` in
`/tmp/markdew-native-combined.4V8Unv`.

The architect requires an identified owner before adoption. Its size alone
cannot distinguish fixture construction from a native argument handoff.
`ReturnBench.inspect` and `LiveParagraph.open` use `io_cstr`; the inspected
runtime conversion consumes each input cell with `ctr_take`. This rejects
a blanket sink after that conversion. A separate non-window fixture check
will test expected-source construction while preserving the completed run.

The frozen combined macOS application batch has started after successful
native process termination. No native window tests overlap. Its result is
pending in `/tmp/markdew-combined-final-macos-2034-full.log`.

The separate `NativeExpectedOwnershipCheck.bend` constructs the same one-MiB
source and its appended expected source, keeps both, and checks both exact
lengths. It passes with all final tracked allocation classes balanced. Files
are `expected-baseline.c`, `expected-diagnostic.c`, `expected-stdout.log`, and
`expected-stderr.log` in the combined native snapshot. No native window opens
and no C ownership patch is applied. This excludes expected-source construction
alone in this reduced use; it does not locate the owner in the complete run.
The inspected `LiveParagraph.open` handoff also passes its input directly to
the consuming `io_cstr` conversion. Constructor-origin tracing remains needed.

The bounded origin trace is prepared in `/tmp/markdew-native-origin.zlo7wL`.
Only its sample count and matching native guards change from 20 to one. All
four checks remain. It is a diagnostic, not a replacement for the full gate.
The new constructor audit classifies all 344 two-field declarations: 311
constructors and 33 closures, including 50 string constructor sites, with no
unknown declarations. Numeric sampling records constructor epochs and wrapper
lifetimes without retaining Bend terms. The architect accepts this scope.

The observer waits for both macOS batch processes to end before it starts the
one-frame run. It uses four threads and a 300-second deadline. The binary
SHA-256 is `9c61da02ec7e534732c6c751d64669b6ef5b7c03474d8acb589f274df2844929`.
The generated diagnostic C SHA-256 is
`8bacd20f776a5fe1a508237d5aa1d37cb597960e839e45eb8918c09e183a84f2`.
The summary requires successful exit, one frame, and four verification
completions. It rejects overflow, active-address reuse, or open-epoch rebuild,
and reports collisions and unresolved epochs. The trace is not yet complete.

An extra non-window Return lifecycle check uses the same one-MiB fixture,
selected baseline, expected source, saved byte state, and four complete
baseline/Return/Undo/Redo verifications. It passes with exit 0 but retains
96 tracked bytes: four class-0 allocations and four class-1 allocations.
All larger classes balance. Files are `NativeCoreOwnershipCheck.bend` and
`core-cycle-{baseline,diagnostic}.c`, with `core-cycle-{stdout,stderr}.log`,
in the combined native snapshot. No C ownership patch is applied. This
reduction does not reproduce the complete native retained chain and is not
a strict balance pass. Its different retained amount narrows the next trace;
it does not establish a native handoff cause.

The complete frozen combined macOS application batch finishes with exit 0.
The Linux batch already finished with exit 0. Both platform gates now cover
the combined candidate. The one-frame constructor-origin diagnostic starts
after the macOS batch processes stop. It is the only native window test
running. Strict final cleanup remains unresolved, so adoption is still pending.

The one-frame origin diagnostic finishes with exit 0, one frame, and four
verification completions. Its final allocation amount is 25,165,816 bytes,
the same numeric amount as the 20-frame candidate. This does not prove
identical owner paths across the two builds. No ownership patch is applied.
Wrapper and target counters have zero overflow and active-address reuse;
constructor epochs have zero overflow and open rebuild. Sampling records
5,165 wrapper collisions and 12,744 target collisions, which limit coverage.

Of 223 live wrapper samples, 214 resolve to open constructor epochs at site 19,
the string-reversal recursion in generated `spin_59`. Nine are unresolved;
none resolve to closed epochs. The wrapper caller address resolves with
`atos` to `WL_FID_DOCUMENTBENCH_SAMPLE_LOOP + 500` in this diagnostic binary.
Records are `origin-{stdout,stderr}.log`, `origin-exit.json`, and
`origin-summary.json` in `/tmp/markdew-native-origin.zlo7wL`. This locates
sampled construction origins, not the final owner. The next inspection follows
their transfers through expected-source construction before any scoped release.

The architect rejects a global release in generated `spin_199`. Inspection
maps its callers to `TextByteMap.replace`, rather than expected-source
construction. One caller passes a value that is then captured in a later
continuation. The sampled wrapper caller is a creation site; it does not
prove a missing release there. No release has been added. Continue by mapping
the surviving allocation and wrapper handoffs in the one-frame binary.

The actual benchmark append conversion is generated `spin_296`. Its scalar
conversion reads the prefix with `term_peek`. The large no-stage caller,
`MAIN_K1542`, passes its owned fixture result and never captures it afterward.
The architect approves one scoped causal release after this call succeeds.
That diagnostic passes one frame and four checks. Its site counter is one.
Final retention falls from 25,165,816 bytes to 96 bytes, with four class-0 and
four class-1 allocations still live. The released amount equals the fixture's
1,048,572 cells and 1,048,571 wrappers. Files are `causal-fixture-diagnostic.c`
and `causal-fixture-{stdout,stderr}.log` in the origin snapshot. The C release
is diagnostic only; no shared helper is changed.

A separate Bend candidate is `/tmp/markdew-owned-append.m6r2wJ`. Its test-only
`ReturnCommandBench.AppendWork` retains the prefix beside the append result,
then releases that owner when the result is extracted. Arbitrary prefix and
suffix output equality to the original recursion prints ALL PROOFS CHECK.
Its unchanged one-frame native checks pass without a C ownership patch.
Final retention is again 96 bytes, which is not a strict balance pass.
Records are `owned-append-{stdout,stderr}.log`. The remaining owner still
requires diagnosis before final cleanup can pass.

The first 128-character core reduction retains 1,296 bytes, not 96. Its
124-character prefix ends two characters before a complete fixture unit.
The original 1,048,572-character prefix contains complete 63-character units.
A 130-character reduction uses two complete units plus the same four-character
list-item suffix. It passes all four output checks and retains exactly 96
bytes. These separate records are `small-{stdout,stderr}.log` and
`small130-{stdout,stderr}.log` in the owned append snapshot.

A dense bounded trace of the 130-character reduction attempts every string
wrapper address. It resolves all four outstanding wrappers to open constructor
epochs at site 11, generated `spin_30`, the scalar-list-to-string conversion.
Each retains one reference: increments equal decrements after initial count
one. No live record is unresolved or closed. Wrapper/target collisions are
142/328; overflow, active-address reuse, and open rebuild are zero. The final
aggregate outstanding string-wrapper count is four, equal to the four resolved
live records. This gives complete coverage of the remaining live wrappers,
although it does not give complete coverage of all historical allocations.
Records are `small130-dense-{stdout,stderr}.log` and
`small130-dense-summary.json`. Stage isolation is the next check; no release
has been added for these four owners.

Five fresh-process stage checks pass with complete output checks. Load and
selection finish with zero tracked live bytes. Planning, Return, and the full
cycle each retain 96 bytes. Planning checks the exact edit and the unchanged
session. Records are `stages-{load,select,plan,return,full}-{stdout,stderr}.log`
in the owned append snapshot. Each stage includes its verification work, so
these results identify a combined stage and checks rather than the command
alone. The first retained stage is planning.

The architect rejects a release after `IndexedReturn.scan` splits a line:
generated `spin_210` consumes that input with `ctr_take`. Such a release could
drop the same owner twice. No such release is applied. Further inspection
finds an earlier owned block source passed to borrowed `Blocks.lines` in the
lookup leaf branch. That precise caller is under review before any scoped
causal release.

The architect confirms the lookup leaf owns its extracted block source. A
scoped diagnostic releases that source only after `Blocks.lines` succeeds.
All five stage output checks pass. The site count is zero for load/selection
and one for plan/Return/full. Retention falls from 96 to 24 bytes in the three
planning stages, rather than the expected zero. The strict-zero assertion
fails and is not treated as a pass. The active item contains three characters;
the predecessor blank line contains one. A separate review now checks the
owned predecessor handoff in the same leaf. Files are
`causal-plan-diagnostic.c` and `causal-plan-{stage}-{stdout,stderr}.log`.

The separate predecessor release is also scoped to the lookup leaf, after its
borrowed line conversion succeeds. All five stage outputs pass and every final
allocation class balances. Active-source and predecessor site counts are both
zero for load/selection and one for plan/Return/full. Records are
`causal-plan-both-diagnostic.c` and `causal-both-{stage}-{stdout,stderr}.log`.
This establishes the two missing owners in the tested leaf path. It does not
justify a release after consuming split or in the untested empty-tree path.

The Bend-only candidate adds `IndexedReturn.LinesWork` and `owned_lines`, used
only for the active block and predecessor in `block`. The empty-tree lookup
call is unchanged. Arbitrary-source equality to `Blocks.lines` prints
ALL PROOFS CHECK in `IndexedLinesOwnershipProof.bend`. All five fresh stage
processes pass output checks and strict final allocation balance without C
ownership edits. Records are `owned-lines-{stage}-{stdout,stderr}.log` in
the owned append snapshot. Generated spin210 keeps the source once, runs the
borrowed conversion, and releases its conversion owner. Spin211 releases the
retained work owner. Broader case and full native cleanup gates remain required.

## Frozen cleanup candidate: focused gates and full runs

The narrow candidate is `/tmp/markdew-cleanup-final.8fSUPV`. Its staged
source/test/law tree is `cc0806ca83d76c01946fcdb31fbadca04de73dcb`.
The root proof and eight boundary proofs pass with pinned Bend 2.0.34.
Nine line conversion cases, thirteen text comparison cases, and twelve
document source cases pass on native four-thread, Node, and Bun builds:
102 path runs. All nine separate native line conversion processes finish
with zero live bytes in every measured allocation class. The cases include
empty text, newline, Unicode, CRLF, BOM, NUL, combining marks, shared source,
and a 65,536-scalar line. These checks make no C ownership changes.

The eight pure Return fixtures also finish with exit status zero across the
three runtimes. They check exact source, selection, scene, patch replay,
history, spacing, fences, line endings, and uncertain workspace state.
Logs are `/tmp/markdew-cleanup-final-ownership.log` and
`/tmp/markdew-cleanup-final-return.log`. Shell syntax and staged whitespace
checks pass. The architect found no correction needed in the reviewed scope.

The fresh native diagnostic uses the original twenty-frame, one-MiB fixture.
It requires eighty verification completions, 222 ordered phase observations,
successful process exit, and zero final allocation and wrapper balances.
Its observer deadline is 1,200 seconds. The generated verification continuation
is K1168. Numeric hooks do not retain terms or change ownership.
The build uses Clang `-O2 -pthread -x objective-c -fobjc-arc` and Cocoa.
SHA-256 values are:

- Baseline C: `5234cc76a2e02b6d352ee0ca35dd26507042e355c9c6e8034773808d8cf36753`.
- Diagnostic C: `a9de7e0ba6097b295b4e760b0d8842a337dc8035ca42965f7c5ba9bed8c4b570`.
- Diagnostic binary: `34ee0d60cbece361824c7d5e4d8dbca400648eaeda65c53e1535bfd0d40d3dfd`.

The native diagnostic and full Linux batch have started. Their final results
are pending. Linux uses the existing pinned 2.0.34 image
`sha256:e1e22f1a8ec72dd90f6a98301f615c10c1ba6002d406c2f7a618e41601bbdcc5`.
The macOS batch must start after the native diagnostic ends to prevent GUI
overlap. No app source has been adopted. Diagnostic frame times are not
performance evidence and do not establish the sixteen-millisecond target.

The frozen copy contains 222 Bend files and 1,249 resolved local module
imports. No local module import is missing. Its staged tree remains unchanged
after the diagnostic build. The adoption scope has 24 changed or added files:
six source files, sixteen test files, and the two root law/proof files.
The native benchmark fixture and host frame guards still require twenty
frames. The Return fixture batch includes closed fences at end of file and
all selection pairs in mixed line endings. No root app source is changed
while the full checks run.

The next timing design has an architect review. It remains pending the full
cleanup and platform gates. Use five fresh twenty-cycle control processes
and five fresh twenty-cycle repaired processes per fixture, in a fixed balanced
order. Do not run one hundred cycles in a control process: the known control
memory growth could change the workload or exhaust memory. Keep all exact
checks outside the frame clock, retain outliers, and use uninstrumented builds.
Report process order, each process median/p95 and peak RSS, and the pooled
one-hundred-sample median/p95 for each build. The pooled result includes
process variation; it is not one continuous run. Define an external deadline
and an RSS stop limit above the measured twenty-cycle control peak before
starting. A stopped process is a failed measurement. Do not extend it
automatically. Run timing without other builds or tests. These results can
assess event-to-layout/display time, not physical display latency.

The reviewed timing driver is
`/tmp/markdew-cleanup-timing.XSxiuP/matched.mjs`. Its syntax check passes.
It requires separate build records for control and repair, with validated
binary hashes, source-tree hashes, actual Bend and Clang paths, versions,
hashes, and flags. Its process deadline is 1,200 seconds and its per-process
RSS stop limit is 4 GiB, above the known twenty-cycle control peak. It observes
all members of the recorded process group once per second. This monitoring
adds matched overhead and can affect samples. A stop first sends SIGTERM to
that group; a five-second fallback sends SIGKILL if the process has not closed.
The driver cancels both timers on close. Spawn errors and raw failed output
are recorded before assertions. The architect reviewed these corrections
and found no remaining driver correction. No timing run has started.

### Fresh twenty-cycle native cleanup result

The native observer finishes with exit status zero. All twenty ordered frames,
eighty verification completions, and 222 exact phase observations pass. Each
of the twenty restored baselines has 332,929,688 measured live allocator bytes.
Final completion has sixteen bytes; after closing the native handle and ending
the process, every allocation class balances and every wrapper class has zero
outstanding wrappers. No C ownership patch is used. Peak process RSS is
792,461,312 bytes. This is diagnostic memory evidence, not a timing result.

Records are `wrappers1200-{stdout,stderr}.log`, `wrappers1200-exit.json`, and
`wrappers1200-observations.json` in the frozen cleanup copy. The strict-zero
assertions and an independent result read both pass. The earlier matched
control retained 2,062,005,400 allocator bytes at process exit; the earlier
partial repair retained 25,165,816 bytes. The fresh complete repair retains
zero in this fixture. This does not prove all application paths release all
memory or satisfy the product idle-memory target.

The full macOS batch starts only after the native diagnostic has returned
zero. Its log is `/tmp/markdew-cleanup-final-macos.log`. The full Linux batch
remains live at this observation. Adoption is still pending both platform
terminal results and final review. No timing run or source adoption has started.

The fresh full Linux batch finishes with exit status zero and the final
rendering/direct-editing/document success message. The tested staged source
tree remains `cc0806ca83d76c01946fcdb31fbadca04de73dcb`. This covers the
Linux terminal and runtime boundaries, not a Linux graphical editor or Windows.
The full macOS batch remains live. Adoption still requires its terminal result.

The separate timing build script is
`/tmp/markdew-cleanup-timing.XSxiuP/build.mjs`. It records the complete pinned
`bend2` library tree, including Base and its foreign effect files, before and
after emission. It obtains the actual macOS SDK path/version with `xcrun` and
passes that SDK explicitly with `-isysroot`. Source and library manifests
reject symbolic links instead of silently reading external targets. Both
scripts pass syntax checks. The architect confirms that these changes resolve
the provenance findings. Neither compilation nor timing has started; both
must wait for the full macOS result.

### macOS Save gate failure: adoption remains unapplied

The fresh macOS batch returns 1 in `NativeAppSaveCheck`, normal mode step one.
The exact source assertion sees twenty-one bytes instead of twenty. Actual
bytes are `efbbbfe4b8ade69687f09f98800d0a65cc81000a0a`; expected bytes are
`efbbbfe4b8ade69687f09f98800d0a65cc81000a`. The extra terminal newline is a
source failure. The failed full log remains at
`/tmp/markdew-cleanup-final-macos.log`. Neither the passed Linux batch nor
the native cleanup result overrides this failure. Adoption and timing remain
unstarted.

Fresh pinned 2.0.34 control and repaired Save builds each pass all four
normal/conflict/missing/untitled modes in sequential GUI processes. Both
focused runners finish with exit status zero. Records are `control.log` and
`repaired.log` in `/tmp/markdew-save-control.mLNFPQ`. The cause of the full
batch failure remains unknown. These fresh passes do not establish a fix.
The architect requires byte traces before Apply, at Apply capture, and at
the Bend-to-native presenter, plus a review of the timer's completion assumption.
The exact byte assertion remains unchanged. Separate generated-C trace builds
add those three boundaries and the checked source editor; all replacement
contexts match once in each build. They change no ownership operation.

Five sequential normal-mode control/repair trace pairs finish with exit
status zero. All ten logs show the exact twenty bytes before Apply, at Apply
capture, and in the following Bend presentation before the editor assertion.
An independent parser checks those boundaries and their order. The exact
Save, source, undo, redo, and close assertions remain active. Records are
`{control,repaired}-trace-{1,2,3,4,5}.log` in the focused Save directory.
The full-batch extra newline remains unreproduced; its cause is unknown.

The architect reviewed the evidence and approved one fresh full macOS rerun
on the unchanged frozen adoption tree. It uses pinned Bend 2.0.34, no byte
trace hooks, and no concurrent GUI test. Its log is
`/tmp/markdew-cleanup-final-macos-repeat.log`. The repeat has started; its
terminal result is pending. If the exact-source failure repeats, stop adoption
and trace a separate full-sequence snapshot. A diagnostic snapshot cannot
replace the exact-tree gate. No assertion or timer wait was changed.

### Completed cleanup repair and source adoption

The unchanged full macOS repeat finishes with exit status zero. All six Save
sequences and the final rendering, direct-editing, and document batch pass.
The log is `/tmp/markdew-cleanup-final-macos-repeat.log`. The first Save
failure remains unreproduced with an unknown cause; the repeat is not evidence
of a Save fix. The compiler 2.0.35 failure and Windows test limits remain open.

After architect approval, the exact 24-file repair is applied to the project.
All old hashes match before application and all new hashes match afterward.
All 346 source and test files match the frozen snapshot. All 1249 local
imports resolve. Shell syntax, whitespace checks, and pinned Bend 2.0.34
`bend PROOF.bend` pass. The proof output is `ALL PROOFS CHECK`; this is not a
mathematical validity verdict. No generated-C ownership patch is included.

The cleanup repair is ready to commit. The separate matched timing batch
remains pending. Its results will determine the effect on Return latency.

The cleanup repair is committed as `c4e94ec`. The timing build script first
stopped before compilation because the control copy has no root LAWS or
PROOF file. It now records explicit manifest entries: source and tests for
the control, and source, tests, laws, and proof for the repaired copy. Both
fresh uninstrumented builds pass. No control source was changed.

The matched driver has started. During the first small control process, a
broad context-file search ran for about fifteen seconds before it was stopped.
This overlap must remain in the batch record. The first sample is not removed.
The batch cannot be described as fully isolated. No other build or test runs
with it. Terminal results remain pending.

The architect requires a later clean full matched batch before a performance
conclusion. Keep this active batch and all samples as correctness evidence
and exploratory timing. It cannot alone establish a speed change.

The exploratory small-document group finishes all ten fresh processes and
200 Return events. All source, view, Undo, and Redo checks pass. Across the
100 samples per build, control median/p95 are 2.319/3.138 ms and repaired
median/p95 are 2.284/4.793 ms. These values include variation across processes.
The first control process has the recorded search overlap. No sample is
removed. The large-document and long-item groups remain pending.

The first large-document control process passes its twenty Return events.
Its median is 18.8905 ms and p95 is 20.849 ms. Peak process RSS is
2,838,691,840 bytes. This is one process, not the full matched comparison.
The first repaired large-document process is now running.

The first repaired large-document process returns zero and passes twenty
Return events. Its median is 19.5045 ms and p95 is 21.174 ms. Peak process
RSS is 799,932,416 bytes. Both first large-document p95 values exceed 16 ms.
This pair does not establish a speed gain or regression. The full matched
group and the clean repeat remain required. The next repaired process is
running in the fixed order.

The recorded whole-process times are 306.39 seconds for this control and
745.69 seconds for this repaired process. They include the full checks outside
the frame clock. Keep this slower whole-process observation with the timing
results. Its cause is not established by one pair.

The architect reviewed the next experiment sequence. Finish this exploratory
batch and a clean full matched repeat before selecting an optimization. If
the repaired one-MiB p95 remains above 16 ms, run a separate stage-enabled
twenty-cycle diagnostic on the same committed source and viewport. Keep every
check. Compare per-sample pre-presentation, source-update, scene-patch,
projection, and draw costs; do not add stage medians. Then profile only the
largest measured phase with numeric markers and no additional retained terms.
Compare slow and typical samples before changing code. Keep whole-process
runtime separate from the measured Return interval.

### User-requested pause

The user requests a pause before the package/architecture decision. The active
matched batch is stopped deliberately, not by a test limit or a product defect.
Fifteen completed processes retain 300 verified Return samples: 200 small and
100 large. The sixth large process, repaired build, is interrupted with SIGTERM.
The driver records its partial stdout/stderr and signal in results.json, then
returns status one. Its stop_reason is null because the signal came from the
external user-requested stop. This record must not count as a completed process.
The driver and native benchmark processes are confirmed stopped. The batch is
incomplete; neither the long-item group nor the clean repeat has run.
