# Inactive point comparison checks

## Closed fallback retention trial

`tests/browser/fallback-retention.html` fixes combined delivery and compares
`?retention=drop&reverse=false` with `retention=map` in both construction orders.
Run `npx vite --config tests/browser/fallback-retention-vite.config.mjs`.
Mapped retention starts only on incomplete full fallback from a document edit.
It maps the last complete decoration certificate through edits. A complete body
ends retention with a fresh full rebuild. It does not keep an old editor state.
The candidate deliberately permits stale widgets to test a possible cause.

Four fresh reports contain 76 actions with visible pages and no deadline errors.
Source/Undo/Redo height differences fall from 138480.796875 to 224.515625 pixels
in both orders. Live changes from 0.09375 pixels to exact agreement. Settled
streams, source record, selection, history, decorations, and widgets agree at
all nineteen actions. Immediate structural and math fallback streams differ
from the baseline because widget data remains stale. Note fallback agrees while
its definition is revealed. Four Unicode edits retain their partial local index.
These observations establish an association, not the cause of the height fault.

The fixture records the first differing canonical stream events and visibility
changes. A shared 100 ms delay precedes view construction so the Run click can
return before synchronous construction. Parser, resource, and sample deadlines
remain unchanged. Three earlier rejected reports retain hidden-page deadlines
or interrupted sequences; they are excluded from the valid matrix.

Run `node tests/performance/experiments/point-comparison/verify-fallback-retention.mjs`.
It checks all seven fixed hashes, action/history controls, certificates, partial
index retention, stale streams, settled equality, and expected geometry failures.
Twenty-seven related unit checks pass, including independent full-rebuild ranges,
initial incomplete-body rejection, and non-edit publication rejection.

The architect review closes this trial. This candidate will not enter timing
tests or production. Future fallback must preserve off-screen height information
with current source content and positions. An independent baseline must check
source record, displayed resource content, selection, history, first complete
rebuild, and Source/Undo/Redo geometry before adoption. No private height reset
runs, and this trial makes no speed claim.

## Fallback delivery factor trial

`tests/browser/fallback-delivery.html` runs one fresh partial case per page.
Start `npx vite --config tests/browser/fallback-delivery-vite.config.mjs` and
select `?delivery=combined&reverse=false`, `delivery=static`, or `reverse=true`.
Both fields use the same plan factory. Only the view decoration facet changes:
one combined set, or point-first and mark-second static sets. Parser behavior,
source record, edits, cutoff, resources, width, scroll actions, and history
checks remain the same. The prior local-coverage fixture and reports stay intact.

Four saved cases retain 76 actions with no deadlines or errors. Both factors
have the same public decoration streams, settled geometry, and height attribution
at every action in each construction order. Source/Undo/Redo differ from the
complete reference by 138480.796875 pixels; Live differs by 0.09375 pixels.
Exact source record, selection, history, decorations, widgets, and unchanged
RangeSet comparison agree. Four Unicode edits retain their partial local index.
Unsupported edits reject local reuse in both factors.

Before fallback, the candidate has 121,566 points. The immediate incomplete full
fallback has only 120 points for structural/math edits, or 119 for the note edit.
Settlement restores 121,566 points, or 121,565 with the changed note definition.
Both factors have the same before/after stream signatures and range counts.
Thus the static layer split alone does not explain this case. Temporary range
loss remains a possible cause; this trial does not prove it. Next test retention
with parser, delivery, and scroll actions fixed. No private reset runs. No input
timing, speed gain, or adoption follows from this trial.

The fixed `public-spans-v1` signature format serializes RangeSet.spans callbacks
in their public order: span from/to/active/open, or point from/to/value/active/open/
rank. Values include constructor class, point flag, start/end sides, all spec
properties, and widget class plus own data. JSON has fixed construction order;
it contains no generated DOM IDs. SHA-256 hashes that JSON. Each record retains
event count, document length, and input-set sizes; its action and coverage record
identify the parse phase. Hashing is diagnostic work outside any timing interval.
Equal signatures avoid repeated raw streams of hundreds of megabytes. If streams
differ in a future trial, retain the first differing canonical events.

The local writer saves four fixed `fallback-delivery-{combined,static}-`
`{normal,reverse}.json.gz` reports. Run
`node tests/performance/experiments/point-comparison/verify-fallback-delivery.mjs`.
It verifies all four hashes, exact action/history/source controls, partial local
retention, fallback loss, stable observations, and the expected rejection. It
also compares each factor directly at every settled and immediate fallback
phase. A successful verifier exit confirms evidence, not a passing layout gate.

## Rejected local-coverage browser gate

`tests/browser/local-coverage.html` compares independent source records and
history with the same fresh widget/decorations builder. The reference uses the
native wrapper and complete full display. The candidate uses static layers and
mounted parsing, with public stopAt/fragment clipping for its controlled partial
case. Both views receive the same edits and scroll effects independently.
The RangeSet comparator remains unchanged. Initial coverage is complete.
Candidate parsing stays partial through four growing Unicode edits; ordinary
background parsing and view transactions keep running. Only the independent
reference is settled during those checks. Unsupported edits reject local reuse,
then release the cutoff before complete layout and history checks.

The first six-case report has 96 checks. Four native/native and no-cutoff mounted
cases pass all nineteen actions. The partial normal case passes fifteen actions
but fails Source, Undo-original, Redo, and Live geometry. The partial reverse
case samples zero frames and later misses resource readiness. Equal final
geometry at its initial action is not a passing sampled result.

Two fresh-page partial repeats each retain nineteen actions. Both repeat the
four geometry failures with no deadline errors. Source/Undo/Redo height estimates
differ by about 138,481 pixels. Live differs by 0.09375 pixels. Source record,
selection, history, complete decoration sets, point/range callbacks, and widgets
agree. Partial local edits retain their index and full off-screen display.
Read-only view 6.43.13 attribution shows equal computed font and oracle values,
but different text/gap partitions. This supports a height-map history effect;
it does not identify its cause. No private map or oracle reset runs.

Start `npx vite --config tests/browser/local-coverage-vite.config.mjs`. The page
accepts `?profile=partial&reverse=false` or `reverse=true` for fresh-page cases;
control and mounted profiles are also available. The explicit local writer has
bounded input, an origin/header check, and fixed allowed report names. It is
absent from production. Retained gzip reports are:

- `local-coverage-browser-rejected.json.gz`: first batch.
- `local-coverage-browser-partial-normal.json.gz`: fresh normal order.
- `local-coverage-browser-partial-reverse.json.gz`: fresh reverse order.

Run `node tests/performance/experiments/point-comparison/verify-local-coverage.mjs`.
It verifies hashes, exact matrices/actions/history, saved observations, partial
retention, and the observed rejection. Its successful exit verifies rejection
evidence; it does not mean the layout gate passed. Next isolate temporary
incomplete full fallback from static layer partitioning. Do not time or adopt
this candidate from these reports.

## Mounted package Markdown

The separate browser gate passes 272 checks in sixteen cases. Start it with
`npx vite --config tests/browser/mounted-parser-vite.config.mjs`, then open
`/tests/browser/mounted-parser.html`. Run executes four fixtures against
native/native controls and native/mounted cases in both construction orders.
Each case has seventeen actions: navigation, Return, Unicode, Find, width,
YAML switches, Undo/Redo, and Source/Live. Views have independent source records
and history. The comparator is unchanged.

Complete mounted bodies, fonts, and ready positive resource boxes precede equal
source-position scrolling. Initial resource controls require MathJax and Mermaid
SVG, block and inline semantic HTML, tables, and table math. At least eight
frames and four equal transitions include actual highlighted line boxes, widget
boxes, caret, height, and scroll metrics. Consecutive exact samples use lossless
run-length encoding. This measures complete-tree layout/history, not timing or
local coverage.

Store result writes only two fixed archive paths through the explicit local test
server. Bounded input requires the local origin and fixture header. Production
does not use this writer. Retained reports:

- `mounted-browser-rejected.json.gz`: first batch, with a 16-pixel scroll
  difference after final YAML Undo in native/native controls too.
  SHA-256: `007500911ba04747579534361336a22cf1a4b1e28b47a83701b5093a568d8c39`.
- `mounted-browser-controls.json.gz`: corrected batch, all 272 checks pass.
  SHA-256: `dd4fea656a88da5476c5448d5ba13a7eabe2a931131a04354812ee5b5abc66ee`.

Run `node tests/performance/experiments/point-comparison/verify-mounted-layout.mjs`
to check the exact matrix, action order, history, readiness, and saved final
geometry directly. Next check local coverage in the browser before matched
real-input timing. Production adoption and native product gates remain open.

mounted-document-language.ts is a separate inactive tree adapter. It derives a
validated ordinary-body skeleton from the configured native YAML wrapper. It
uses that skeleton's node types and zero offsets, and refuses unexpected
per-tree properties. It mounts the unchanged native Markdown result using the
public Tree/MountedTree API. No language-data or indentation shim is needed.
Ambiguous prefixes and nonstandard ranges use the native YAML parser.

A weak per-parser tree map records both routes. Only owned Markdown fragments
unwrap; their bounds, offsets, and open flags stay exact. Only owned native
wrapper fragments return to that parser. Foreign and other-route fragments drop.
This can alter reuse and cost. The PartialParse proxy forwards parsedPos,
stoppedAt, stopAt and errors; only Markdown output trees gain the wrapper.
Native Markdown trees and all their parser context stay unchanged. This is not
native PartialParse object identity, which the older experiment checked.

Fourteen parser checks include complete service/activity/region/preview controls,
actual completions, concurrent states, first-line switches with exact BOM/mixed
ending history, partial published-prefix services, native forwarding, fragment
provenance, and actual shifted/clipped reuse. They also retain the old selector's
explicit rejection control. Partial-prefix comparisons stop before the published
edge; that edge is not treated as the document end. The mounted region reports
its actual partial length.

Five local-coverage checks include four controlled growing Unicode edits in the
mounted profile. Initial eligibility is complete. Native public stopAt and
fragment clipping force partial output after edits. A separate complete native
YAML-wrapper oracle matches source, decorations, and point/mark streams without
settling or replacing the candidate tree. Previous direct-profile and rejection
controls remain. No browser flag or timing is added. Production remains unchanged.
The later browser layout/history result is recorded above.
Validation: all 39 focused parser, local-coverage, observer, static-preview, and
comparator checks pass, as do TypeScript and the named Bend proof gate. Architect
review approves that earlier unit milestone. Its checks alone claim no browser
or native result.

## Rejected parser selection

document-language.ts is a rejected inactive selector. It uses the package YAML
wrapper for empty, whitespace, BOM, dash, and nonstandard range inputs; other
starts use package Markdown. Fragments retain their native root identity and
the selector returns each native PartialParse unchanged. No shared last-choice
state exists. Tests cover shared support, first-line switches, exact BOM/mixed
line-ending source and Undo/Redo, complete preview, highlighting, completion,
folding, metadata, indentation, and a controlled partial prefix.

Two narrow adapters match metadata and indentation at document edges. They do
not match native language activity, which reads languageDataProp from the tree.
The negative control records Markdown true/wrapper false on the candidate and
Markdown false/wrapper true on the baseline at start sides -1/0 and end sides
0/1. Empty and ambiguous prefix fixtures retain the wrapper route. Complete
region queries agree in the tested fixtures. Seven checks pass, including this
explicit rejection control; this is not seven adoption contracts proved.
Do not add a browser flag or use this selector in the app. No timing was run.
Production retains the package YAML wrapper.

Validation: seven selector checks, four local-coverage checks, and twenty related
observer/static-preview/comparator checks pass. TypeScript and `bend PROOF.bend`
pass. The Bend gate covers the named Bend laws, not this TypeScript selector.

## Local published coverage

local-index.ts is an inactive production-index snapshot. Default routes still
use the original function. local=1 explicitly selects this snapshot in the input
fixture. It keeps initial complete eligibility, lexical/source/selection guards,
stable notes, and bounded neighbour correspondence. Dirty and neighbour nodes
must be complete published top-level Markdown blocks. Both directions need an
identical validated outer block or an edge confirmed by the mapped old index.
Missing siblings in a partial tree cannot prove an edge. The edge query stops
after two entries and rejects unexpected overlap. This caps callbacks only:
installed RangeSet.between still scans chunk positions. Constant or fully bounded
query work is unproved. The off-screen projection
comes from the prior complete index, not a builder on the current partial tree.

Four controlled positive edits use direct package Markdown. The test adapter
uses the public PartialParse.stopAt method at 1024 and clipped fragments after
the first edit. Initial eligibility comes from a complete tree. Each candidate
remains partial while a separate state is fully parsed for the independent
source/decorations/point-mark oracle. Oracle work never settles the candidate.
This is a different language profile, not a performance or app acceptance result.

The package YAML wrapper is a required rejection control. In the observed
partial tree of length 220, dirty position 11..32 resolves to Body 0..220 without
a mounted Markdown tree. A severe budget control publishes only length 10.
Both lack required local coverage. A truncated boundary-neighbour control also
rejects. Structural insertions, resources, and changed notes use the full path.
Twenty-four focused checks and TypeScript pass. No production guard changes.
Next review conservative selection of package parsers with full front-matter,
language-service, source/history, and layout controls before browser timing.

## First real-key comparison

The later diagnostics=1 route adds post-clock mounted-body and fallback records.
fallback-observer.ts transparently forwards updateIndex and its original callback,
and keeps only a small WeakMap record of call, return, and existing rejection.
Raw samples retain no transaction, state, or plan. Classification checks silent
guards in order and reports unknown where bounded observation is insufficient.
It does not force parsing, replay updates, rebuild full previews, or scan a large
note list. The old complete field remains outer-tree length for compatibility.

input-fallback-diagnosis.json has two forty-key runs. Original accepts seven
keys, rejects key eight with incomplete published Markdown body, then has
thirty-two no-index edits. Paired accepts forty keys. All source/Undo checks pass;
the routes differ. Run verify-fallback.mjs. Twenty focused tests verify observer
source/decorations/return/callback parity, static preview, and comparator setup.
This identifies an observed fallback cause, not a stable speed gain. Production
is unchanged. Investigate local published coverage without dropping dependency
or source guards.

paired-input.html uses one standalone static edit surface with the original
comparator or the test-only wrapper. Source, extensions, CSS, selection, and
the 1 MiB note fixture are shared. It excludes the main app and host work.
Setup publishes a complete parse outside clocks. The four runs use ABBA order,
forty real browser locator key presses each, and direct DOM terminal reads
between keys. No forceParsing or diagnostic realization runs between keys.
The first regex-based observation timed out after the first key; a direct DOM
read confirmed the completed sample. That sample is retained. Later reads use
the exact sample count, without repeating or skipping a key. The fixture's
median uses the upper middle sample when the sample count is even.

All 160 keys and four source/Undo gates pass. Outer-tree counts are 40/11/9/3.
Original key-to-rAF p95 is 24.8/172.8 ms; paired p95 is 132.8/102.9 ms. Three runs
lose their indexed route, so this establishes no stable speed gain. The inherited
complete sample field checks outer tree length only; mounted-body availability
must be recorded separately before attributing the fallback cause.
All samples remain, including full and partial routes. Comparator final counts
include source-check and Undo work; they are not timing-sample-only counts.
Both paired terminal records restore the original method. Run verify-input.mjs
to check input-abba.json. This is Chrome/Vite development evidence, not native
typing, painted-frame, or production latency. Investigate indexed-route loss.

## Paired browser installation

The test-only `browser-vite.config.mjs` supplies an in-memory ESM copy through
`/__markdew_paired_state__.mjs`. It requires state 6.7.6 and the pinned source
hash. Run Vite with that config and open static-points.html with paired=1.
The ordinary Vite config does not supply this module. Production imports and
installed packages remain unchanged.

The wrapper validates the fixture route and original descriptor. Only explicit
minPointSize 0 calls use the candidate. Default and nonzero calls retain the
original method. Both routes retain all arguments and the receiver. Exceptions
restore and rethrow without callback replay. Disposal restores the original
descriptor only while the wrapper owns every descriptor flag. Status and
restoration do not call a later getter. Retained inactive wrappers use original.
Partial view setup destroys only constructors that returned, then restores.

paired-height-controls.json repeats all eighty navigation checks. The paired
edit archive repeats thirty-six checks. All retain exact geometry, source,
history, fonts, and selection under the same complete-tree controls. The global
patch affects both views, so full/full controls remain in the matrix. Direct
callback diagnostics use the captured original method as their baseline.
Both indexed candidate edits retain two callbacks. Each batch has 3,198 actual
dispatch jumps / 792,130 skipped ranges and 7,200 geometry-preparation jumps /
1,783,090 skipped ranges. Direct diagnostics add 398 / 98,705 separately.
These are batch counts, not single-key or elapsed-time measurements.

paired-final-smoke.json retains nine edit checks after failure-path fixes and
explicit restoration. paired-setup-failures.json checks cleanup in both view
construction orders. Eleven unit tests cover installation, arguments, fallback
exceptions, paired exceptions, disposal, later owners, and real callbacks.
Run `node tests/performance/experiments/point-comparison/verify-static-layout.mjs --paired`.
The browser's previous pending tab was absent after turn cleanup; its missing
edit record was repeated, not inferred. Next review real-input timing. Resource,
memory, frame, Open, IME, and supported-platform acceptance remain open.

Baseline: 38f8a88. macOS arm64, Apple M4, Node 22.23.2.
Production and installed packages are unchanged. No speed result is claimed.

## Comparator decision

Run `node tests/performance/experiments/point-comparison/check.mjs`.
The script reads installed CodeMirror state 6.7.6, checks its version and source
shape, resolves its one import, and creates two in-memory module copies. It
records the installed source SHA-256. Both use the same range sets and values
as the upstream comparison. No file in node_modules is written.

The naive copy lets findSharedChunks skip positive-point chunks. Three retained
examples change its callback stream: a shared positive point suppresses changed
inner points or marks in another set, but the naive copy reports those changes.
Removing common points can therefore change what the comparison sees.

The guarded copy enables that skip only after the upstream relevant-set filter,
when minPointSize is nonnegative, each side has exactly one relevant set, and
both sets have no nonempty next layer. Chunk identity, mapped position, and
touchesRange checks stay unchanged. Other calls retain upstream behavior.
The exact changes are in changed() and the guard string in check.mjs.

An initial batch of 3,240 spaced comparisons passed. Explicit touching points
and zero-length boundaries then disproved the guard. At source position zero,
the old shared positive point covers 0..10. The new side adds a zero point at
0..0 with equal side values. Upstream reports the old positive point and the
new zero point. The guard reports null and the new zero point. The shared old
point supplies required boundary context even with one layer per side.
guard-boundary-failure.log retains that first failure.

The final batch covers 3,456 comparisons, including chunk boundaries, edits,
zero points, touching points, side values, ranks, multiple sets, and layers.
It finds nine exact callback-stream mismatches among 2,364 eligible calls.
All fallback calls retain upstream behavior. check.log retains every failing
case, callback order, coordinates, values, and boundary notifications. The
script succeeds only when it retains the known rejection controls; its zero
exit status means the rejection check passes, not that the candidate is safe.
Reject this guard. Do not run browser or speed trials for it.

## Static projection evidence

The existing preview inventory now records versioned, read-only layer topology.
preview-eligibility.log shows that the original 1 MiB note preview has three
layers and the resource fixture has two. Neither can use the single-layer guard
without a different projection. These are settled-state fixtures, not input clocks.

static-projection.log separates all points, including zero-length line marks,
widgets, block and multiline replacements, from nonpoint text marks. Both
projections remain static. Each fixture's point projection has one layer before
and after a local edit. The represented static facet inputs include preview,
direction, active-line and search extensions. Dynamic decorations are excluded
as in installed view 6.43.13; static outer decorations are joined. Replacing the
preview input with both projections leaves one relevant single-layer input for
the height comparison in this representative state. This is not a native app
or complete host-extension acceptance claim.

static-spans.log retains a focused regression. At every selection boundary in
three mixed fixtures, point-first and mark-second match the combined full set
in strict comparison callbacks and public span records. The records include
active marks, open counts, and point rank. External decorations before and after
retain their order. The source record stays exact, including BOM and mixed
endings. Nested marks, multiline owners, lists, quotes, Setext headings, notes,
metadata, math, images, tables, Mermaid, HTML, and wide selections are covered.
A reversed-order nested control fails as required. This projection evidence
does not repair the invalid comparator guard.
The focused span check, opt-in inventory, TypeScript check, and Bend proof pass.
proof.log retains the Bend result. Production code is unchanged; no complete
app test or native input acceptance follows from this diagnostic batch.

The next design must skip matching chunks in both cursors together while
retaining shared-point context at changed boundaries. It needs another design
review and exact differential checks before layout or speed trials. Static
production replacements stay intact. Native frame, Open, memory, and platform
targets remain open.

## Paired candidate

The later inactive candidate in paired.mjs advances both cursors together.
It keeps the original shared-chunk skip for nonpositive chunks. A separate
identity set permits paired jumps only with one relevant single-layer input
per side and nonnegative minPointSize. Matching current point identity, mapped
bounds, sides, cursor index, and chunk position must agree. No active marks
can remain. A jump stays inside the current unchanged text gap and retains
the final eligible positive point through normal cursor operations. Following
zero points therefore keep the common point's boundary context.

paired.log records 3,496 exact callback streams through each of two loaders:
ESM and a strict injected factory. Each records 5,397 jumps and 1,324,988 skipped
ranges. The batch adds clipped points at both ends of multiple text gaps to
the earlier boundary, side, rank, layer, and mapped-chunk checks. The independent
skip guard still fails its retained controls. This is differential evidence
for the tested cases, not a formal proof or approval for app adoption.

The factory pins state 6.7.6 and SHA-256
cf4ffe7d177bf2c7c5da66c49be0811cc79a29e12cb658238876bbdcef12939c.
It checks and removes exactly the known import, final package export, and
diagnostic export, rejects remaining module syntax and await, and injects the
package dependency through public createRequire. The initial SSR import.meta
resolve and VM dynamic-import failures remain as setup-only logs. They supply
no comparison evidence. Both loaders run the generated stream checks before
the factory runs the preview check.

Run `MARKDEW_POINT_INVENTORY=1 npx vitest run tests/performance/preview-point-inventory.test.ts`.
paired-preview.log records real settled preview point projections. A complete
fresh oracle identifies changed regions; each region updates the mapped old
set with explicit filterFrom/filterTo. RangeSet.eq checks the resulting set,
then upstream and paired callbacks compare old and reconstructed sets through
the real text change. The 1 MiB note fixture retains two callbacks, with 398
jumps and 98,704 skipped ranges. The resource fixture retains nine callbacks
with no jumps. The large fixture requires nonzero jumps and skipped ranges.
paired-preview-unbounded-filter.log retains the earlier zero-hit control: a
filter without bounds rebuilds every chunk, even when it retains its ranges.

All reconstruction is outside clocks and scans the full oracle. It proves
possible chunk reuse and stream agreement, not a bounded production algorithm.
Production, installed modules, source record, baseline, and recovery remain
unchanged. Next build an inactive persistent static point projection that
patches actual local regions, then run full/full browser layout controls before
timings. Native frame, Open, memory, and platform acceptance remain open.

## Persistent static projection

static-preview.ts derives from the retained viewport snapshot, whose preview
logic matches the production baseline. It changes the projection to all points
and all nonpoint marks. Both inputs stay static in point-first order. It has no
viewport filter or view plugin. Initial and selection-only paths partition the
accepted full suppressed set. Local index callbacks partition only rebuilt
blocks and neighbours, then map and patch both old projections at those bounds.
Complete combined decorations remain for the index contract and checks.

Notes retain a separate ordinary projection. The combined point set maps and
patches the rebuilt ordinary region, then removes note widgets through bounded
filters at stable current note ranges and inserts the complete current overlay.
This preserves one layer. RangeSet.join of ordinary and note point sets would
create separate layers, even without overlap, and disable the paired guard.
Note rebuilding still scales with note count; no constant-cost claim is made.

Run `npx vitest run tests/web/static-preview-experiment.test.ts tests/web/static-point-projection.test.ts tests/web/note-preview-production.test.ts`.
static-local.log retains fifteen passing checks. The new five checks cover
strict callbacks including bound changes, public spans/open counts/point rank,
all mixed selection boundaries and external order, static facet inputs,
Unicode growth without iterating old layers, exact Undo/Redo and Source mode,
structural/note/resource/multiple-edit fallbacks, and partial-tree settlement.
Four actual growing edits in a 1 MiB note document keep old and new point sets
single-layer and require paired hits after every edit. They record 1,595 jumps
and 395,144 skipped ranges, with complete fresh-builder equality each time.
static-local-name-failure.log retains the initial snapshot name error.

These are state checks. Combined, ordinary, and split sets remain in memory.
No memory or speed improvement is claimed. Production imports no snapshot.
Next check full/full browser geometry in both construction orders with equal
fonts, widths, source record, and parser readiness. Do not time this route
until those controls pass. Native platform acceptance remains open.

## Browser static-projection geometry

Baseline: 29c3ec9, macOS arm64, Apple M4, Node 22.23.2, Chrome, Vite development
mode. Open tests/browser/static-points.html through Vite. Run layout batch with
all combinations of fixture=indexed (or absent for mixed text/note),
control=full (or absent for static candidate), and order=reverse (or absent).
The full reference uses the same snapshot's independent fresh builder and
widget classes. The experimental comparator is not installed or called.

static-height-controls.json retains eighty navigation checks: eight cases,
each with Top, Middle, End, Distant Find, owner navigation, width change, Find,
and three narrow navigation checks. Both editors have equal source, CSS, fonts,
and complete mounted Markdown bodies. Widths are 400 and 240 pixels. Each check
uses at least eight rAF samples and four successive equal transitions within
0.05 pixels, with a 1,200 ms deadline. Full/full and full/static both agree
exactly in estimated content height, DOM scroll height, scroll position,
relative caret top, shared actual line heights, and shared text. Full-document
semantic comparisons have no callbacks, including boundary changes. Source
stays exact with original BOM and mixed line endings and history zero.

static-edit-height-controls.json adds thirty-six checks. Use fixture=indexed
and Run edit layout batch for both control choices and construction orders.
The fixture dispatches one guarded local Unicode edit, then checks distant
navigation, width, Undo, Redo, Source mode, Live preview, and End. This is a
state dispatch followed by browser layout, not native typing. Both candidate
edits are indexed immediately and stay indexed after readiness. Later
navigation and history checks use full plans; their records state that mode.
Undo restores exact original source and history zero. Redo restores the exact
edited source and one history event. Selection and computed font properties
agree at every step. All thirty-six checks have exact geometry agreement.

Parser readiness uses ensureSyntaxTree and a no-op publication before sampling,
and requires complete mounted bodies in both views. It records candidate mode
before and after readiness. History and mode controls request the same explicit
scroll action in both views. This does not test reproduction of history scroll
effects by the mirror. The first nine-check edit run lacked those actions and
had partial trees. static-edit-readiness-failure.json retains that rejected run;
its large cursor deltas are not accepted projection evidence.

Run `node tests/performance/experiments/point-comparison/verify-static-layout.mjs`.
The verifier requires each matrix case and exact action sequence, nonempty
shared-line evidence, complete trees, stable samples, strict semantic equality,
and zero geometry differences. Edit checks also require exact expected source,
selection, fonts, history, original-source Undo, and indexed edit readiness.
static-layout-verification.log retains its result. The final candidate smoke
record confirms narrow End geometry with exact source. A screenshot was saved
at /tmp/markdew-static-layout.png. static-layout-proof.log retains the Bend gate.

These fixtures cover text and note widgets. Resource widget browser geometry,
input latency, native IME, memory, Open, and supported-platform acceptance remain
open. Production is unchanged. Next connect the inactive version/hash-pinned
paired comparator and repeat geometry controls before real-input timing.
