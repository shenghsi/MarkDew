# Preview phase measurement

Baseline: 4df2e25, with production preview unchanged from a19e2c4.
Computer: Mac16,10, macOS arm64, Node 22.23.2. Date: 2026-10-11.
Workload: preview-growth.test.ts, twenty consecutive Z / 中 insertions per
route. Initial ASCII sizes: 100 KiB and 1 MiB. All 240 exact-source and
complete-decoration checks pass. No sample is removed. Parser setup is outside
the clock. The first edit is included; there is no separate edit warm-up.

instrumentation.patch is inactive. It times the collection and decoration
stages, only during the state-update clock. The fresh reference runs after the
observer is disabled. stages.log retains every stage sample and total.
summary.mjs reports stage medians and call counts:

```sh
node tests/performance/experiments/preview-phases/summary.mjs tests/performance/experiments/preview-phases/stages.log
```

The instrumentation makes two timer reads per block for validation and for
cache-hit processing. These reads add cost. A separate Node calibration of
100,000 performance.now calls, twenty loops, gave these times in ms:
3.124959, 2.942750, 2.911375, 2.381458, 1.828083, 1.831209, 1.845833,
1.865333, 1.898583, 1.845584, 1.869000, 1.884667, 1.897000, 1.861125,
1.859958, 1.919709, 1.901584, 1.912459, 1.902584, 1.921416.
This includes loop cost. No timer cost is subtracted from stage results.
Stage medians do not add up to the median total. Decoration.set combines its
internal sorting and range-set assembly; those two internal costs are not split.

On plain 1 MiB source, the start / middle / end stage medians in ms are:

| Stage | Start | Middle | End |
|---|---:|---:|---:|
| Block traversal | 3.136 | 3.087 | 2.970 |
| Envelope validation | 7.539 | 5.939 | 4.641 |
| Cache hit, coordinate shift, append | 18.062 | 11.145 | 4.318 |
| Decoration enumeration | 22.403 | 14.020 | 6.111 |
| Replacement suppression | 3.506 | 3.448 | 4.118 |
| Set sorting and assembly | 8.020 | 8.293 | 6.359 |

Each plain route has zero preview replacements, but checks 133,154 raw ranges
for suppression. This supports testing a shortcut when there are no replacements.
It does not prove a total edit-time gain. The normal fresh reference must keep
its full suppression pass. Replacement-bearing documents retain that pass.

Uninstrumented timing uses the same command for each build:

```sh
MARKDEW_GROWTH_BENCH=1 node node_modules/vitest/vitest.mjs run tests/performance/preview-growth.test.ts --pool=threads --maxWorkers=1
```

Timing is sequential: baseline, candidate, candidate again, baseline again.
No concurrent project test or build runs during timing. Other apps stay open.
The fresh oracle is outside the clock and can affect later garbage collection.
These editor-state clocks exclude outline, DOM, native input, screen frames,
and memory. They do not establish the 16 ms product target.

baseline-first.log, candidate-first.log, candidate-repeat.log, and
baseline-repeat.log retain all 960 edits and their exact checks. BENCHMARKS.md
contains all twelve route comparisons. Most affected plain routes show small
median reductions, but p95 is mixed. Footnote routes retain the same code path
and show run variation. Retain the shortcut as removal of redundant work,
without a claim of better tail latency. The normal fresh filter remains the
independent reference. Full checks cover empty source, ordinary marks, quote
lines, list/task markers, and selected math, HTML, and Mermaid widgets.
