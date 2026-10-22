# Inactive viewport hidden marks

Baseline: 580029b. macOS arm64, Apple M4, Node 22.23.2, Chrome, Vite development
mode. Production does not import this experiment. The height control below
rejects this omission prototype for production.

## Height control and decision

height-controls.json retains forty later Chrome checks: full/full and
full/viewport, each with normal and reversed editor construction order.
Both editors start with the same exact source record, complete mounted Markdown
body, fonts, widths, selection, and navigation sequence. Each action records
its starting scroll position. Public geometry samples run on successive rAF
frames without further navigation. Stable means at least eight samples and four
consecutive transitions within 0.05 pixels for content height, scroll position,
scroll height, and relative caret top in each editor. The deadline is 1,200 ms.
All forty checks reach stable. This clock checks settling, not typing speed.

The twenty full/full controls have zero height, scroll-height, and caret-top
differences. The twenty full/viewport checks have up to 2,514.953125 pixels of
content-height difference and 2,515 pixels of DOM scroll-height difference.
Construction order does not change those results. Destination carets differ
by at most 0.625 pixels. The 505-pixel maximum is the off-screen owner position
after a width change; neither caret is visible there. It is not a failed
destination-caret visibility check. Every check retains complete bodies, exact
original source, history zero, no semantic differences, and identical text and
heights for shared actual rendered lines. Visible agreement cannot establish
equivalent full scroll geometry.

Read-only private summaries follow the public samples. They apply only to
CodeMirror view 6.43.13. At the last narrow Find check the full map retains 1,847
collapsed source units; the candidate retains four and has 8,033 units in gaps.
Both height oracles have identical metrics. Installed package source estimates
text-line height from length minus collapsed content, while gaps use a separate
raw-source estimate. Omitting off-screen static replacements changes both the
collapsed content and the map structure. These observations support that cause;
they do not establish an exact decomposition of each height difference.
No private field is changed. Public decorations supplied through a view function
arrive after viewport calculation. No public correction that retains the same
off-screen collapsed ranges was found in this installed version.

Reject this prototype, not all possible viewport methods. Keep the production
static replacements. Further input and memory trials of this prototype stop.
The next investigation is whether the package comparator can skip provably
equal shared chunks while preserving positive-point comparisons. Such work must
remain inactive until edits, selections, source, and full layout agree.

height-controls-initial.json retains the first forty public checks. Its private
gap/block counts are rejected: Vite renamed class constructors, so exact class
name matching misclassified gaps. The corrected fixture uses versioned structural
fields and records names separately. Its fresh forty-check batch above is the
accepted attribution. Both public batches have the same geometry result.
height-final-guards.json retains eight final smoke checks after the bounded
frame wait and Source-mode guard were added. They reproduce the 505-pixel
width-change difference and permit Source/Live checks with exact source and
history zero. Six focused tests and the Bend proof pass; height-tests.log and
height-proof.log retain their output. The prior full batch is not rerun because
this diagnosis changes only the inactive fixture and evidence.

preview.ts copies the baseline preview module and partitions its accepted final
decorations after global suppression. Empty replacements with no widget or
block flag and no line break enter a persistent hidden set. All other ranges
remain static. The view plugin queries complete visible source lines. Global
owner selection still decides whether marks are hidden, including owners that
start outside the viewport. The local index callback partitions every rebuilt
block and changed neighbour; both layers map through the edit and replace that
whole region. Current-position note widgets rebuild separately.

The combined decoration sets remain in the index and plan. The split layers
therefore duplicate retained ranges. Their memory cost is unmeasured. Selection
updates can partition the complete set; bounded selection work is not claimed.

Hidden marks must come directly before the static preview layer. Static-first
changes enclosing formatting at inner delimiters. Public span records show an
inner emphasis delimiter at 18..19 with no active mark in that order. Hidden-first,
the joined set, and the full baseline retain md-strong. Six checks cover every
selection boundary, nested marks, multiline owners, resources, exact Unicode
source/history, Source mode, local layer reuse, and actual facet order with
external decorations. RangeSet.eq requires equal input-set counts. Strict zero
RangeSet.compare notifications check the different partition instead.

Run the focused checks from the repository root:

```sh
node node_modules/vitest/vitest.mjs run tests/web/viewport-marks-experiment.test.ts --maxWorkers=1
```

tests.log retains the focused result and precedence record. The layout fixture
is tests/browser/viewport-marks.html. It compares the prototype with its own
full builder so widget classes agree. Ten browser checks at widths 400 and 240
retain identical shared rendered line text and height. They cover top, middle,
end, off-screen owners, Find, and wrapping. Unicode input and Enter retain the
expected new CRLF. Source-mode Undo restores the exact BOM and mixed-ending
original with history zero. Redo restores the exact edited source. Real arrows
retain source. browser-layout.json keeps these results. Unicode key input is
not native IME acceptance.

The first height probe used lineBlockAt on unrendered lines. Its values can be
estimates, so initial-height-probe.json rejects it as DOM-height evidence.
The corrected check requires a rendered cm-line at the exact source position
in both views before it compares rectangles.

browser-scroll.json keeps ten later navigation checks, including distant Find
at both widths. Both destination carets are visible and shared rendered lines
still agree. However, estimated total heights differ by up to 22,060.8 pixels
and relative caret tops differ by up to 436.8 pixels. These are material limits.
Visible line agreement does not establish scroll stability. Full scroll ranges,
height estimation, repeated navigation after edits, and native input remain open.

integration.patch retains the exact temporary main/fixture imports used for
the 1 MiB input comparison. Both imports are restored exactly afterward.
Each accepted run uses forty separate x keys and reaches terminal exact edited
source, exact original source after forty Undo operations, and history zero.
All samples are visible and no input failures or unexpected updates occur.

| Input observation | Baseline | Inactive candidate |
|---|---:|---:|
| Layout median / p95 / maximum, ms | 79.8 / 238.9 / 455.8 | 77.7 / 92.3 / 669.6 |
| Published outer tree complete samples | 5 / 40 | 1 / 40 |
| Indexed / full plans | 4 / 36 | 0 / 40 |
| Setup dispatch / readiness, ms | 543.8 / 890.1 | 546.9 / 889.1 |

input-baseline.json and input-candidate.json retain every sample. Tree length
alone does not prove completeness of the mounted Markdown body. This is not
a complete-tree-only comparison. The candidate has a slower worst sample.
One pair with different parser/plan routes cannot establish a stable gain.
These clocks observe layout after rAF; they do not measure paint or native frames.

The first candidate run reset during its pending Undo check. A separate HTML
fixture changed at that time and Vite reported a reload. The cause is not proven.
input-candidate-reset.json rejects that attempt. The repeated run kept all files
unchanged until its terminal source/Undo result was saved and its tab closed.

The later height control above rejects this prototype. The 16 ms native frame,
150 ms Open, retained-memory, and platform input targets remain open.
