# Note-aware preview index

Baseline 936a2b7; macOS arm64, Node 22.23.2, jsdom, one worker, Bend 2.0.34.
Production is unchanged. The inactive candidate is in index.ts and preview.ts.
It retains ordinary blocks and their decorations, with a separate note overlay.
Accepted references are removed only for block eligibility checks. Complete
top-level nodes wholly within one definition can be opaque. Partial definition
intersections reject. Other ordinary widgets, containers, metadata, and resource
syntax remain outside the index. Missing references retain the full path.

A local edit must pass the existing word, selection, complete-tree, parser-identity,
source-envelope, and adjacent-block guards. It must retain all note source text,
exact mapped bounds, order, identifiers, labels, numbers, and duplicate flags.
No edit may touch a note boundary. Local ordinary construction keeps global note
suppression before discarding note items. Every current note widget is rebuilt,
so it owns current source positions. RangeSet.join adds that overlay without
ordinary-range enumeration. Work still scales with note count and note content.

Four isolated clocks ran in order: baseline first, candidate first, candidate
repeat, baseline repeat. No other project tests or builds ran during their clocks;
other apps stayed open. Each run has twelve routes, twenty growing Z / 中 edits
per route, and all samples retained. Setup is outside the clock. The first edit,
full fallback, source history, and dirty comparison are inside it. Outline,
fresh source/decorations checks, DOM, native input, and frames are outside it.
All 960 exact-source and complete-decoration checks pass. Every published tree
has the complete current document length, and every body boundary is zero.

Values are median / p95 milliseconds. The raw logs retain all timings, first
samples, mode counts, local visits, rebuilt ranges, tree lengths, and boundaries.
summary.mjs checks all four route sets and generates summary.json.

| Size | Note | Edit | Baseline first | Candidate first | Candidate repeat | Baseline repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 1.761 / 4.512 | 1.651 / 4.881 | 2.024 / 6.681 | 1.690 / 4.551 |
| 100 KiB | no | middle | 1.394 / 2.330 | 1.489 / 3.184 | 1.846 / 2.981 | 1.455 / 2.362 |
| 100 KiB | no | end | 1.227 / 1.468 | 1.350 / 1.540 | 1.620 / 2.003 | 1.233 / 1.653 |
| 100 KiB | yes | start | 7.033 / 14.623 | 1.506 / 3.903 | 1.737 / 3.958 | 6.967 / 10.093 |
| 100 KiB | yes | middle | 5.170 / 8.650 | 1.427 / 1.744 | 1.727 / 1.952 | 5.328 / 11.042 |
| 100 KiB | yes | end | 4.049 / 4.534 | 1.442 / 1.637 | 1.695 / 2.684 | 3.990 / 4.298 |
| 1 MiB | no | start | 11.753 / 20.169 | 11.705 / 23.745 | 12.743 / 24.475 | 12.207 / 13.889 |
| 1 MiB | no | middle | 11.841 / 17.809 | 12.142 / 22.644 | 12.501 / 21.588 | 11.738 / 20.828 |
| 1 MiB | no | end | 11.783 / 35.844 | 11.784 / 21.360 | 11.887 / 21.203 | 11.764 / 38.350 |
| 1 MiB | yes | start | 89.481 / 244.802 | 21.689 / 45.119 | 15.890 / 29.332 | 89.766 / 133.346 |
| 1 MiB | yes | middle | 67.808 / 108.201 | 20.341 / 21.839 | 16.090 / 32.613 | 70.196 / 107.913 |
| 1 MiB | yes | end | 50.886 / 85.976 | 20.540 / 47.359 | 16.034 / 40.410 | 49.803 / 62.192 |

Note-bearing routes change from twenty full previews to nineteen indexed plus
one full preview. Local note-bearing updates visit at most four blocks and
rebuild at most eight ordinary ranges. The entire note overlay is separate from
those counts. The first edit uses full construction because the old EOF
selection lies outside its dirty paragraph. First fallbacks can get slower:
the 1 MiB end route's candidate first samples are 129.624 and 115.947 ms.
See summary.json for every first sample and maximum; no sample is removed.
Plain candidate medians and first fallbacks can also get worse. Production
integration must retain the existing plain path and avoid redundant full
partition construction. This evidence supports integration review, not an
unconditional replacement of the current preview field.

Four integration tests compare the complete range order and fresh footnote
model. They cover Unicode references, heading/emphasis references, repeated and
duplicate notes, adjacent and complex definitions, source reveal, exact BOM and
mixed-ending Undo/Redo, Source-mode history, changed notes, structural/resource
fallback, configuration, and partial/settled trees. An iterator spy checks that
local updates do not enumerate ordinary ranges. The first full batch timed out
at the default five-second test deadline for the large partial-tree fixture;
first-batch-timeout.log is retained. The local deadline is now thirty seconds;
the parser budget and all assertions remain unchanged.

Reproduce the comparison one process at a time:

```sh
npm run benchmark:growth
MARKDEW_NOTE_INDEX=1 npm run benchmark:growth
node tests/performance/experiments/note-index/summary.mjs
npx vitest run tests/web/note-preview-index.test.ts
```

The candidate is not in the app's startup graph. Native widget input, frame
latency, open time, memory, and Windows/Linux acceptance remain unverified.
