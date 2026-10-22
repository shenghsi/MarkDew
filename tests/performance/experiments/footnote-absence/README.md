# Footnote marker absence

Baseline: 816515e. Candidate: retain an empty footnote model only after a
complete-body absence check for literal `[^`. Each edit checks its new range
and one UTF-16 unit on both edges. Changed metadata boundaries and marker
introductions use the existing parse path. The fresh-model oracle stays separate.

macOS arm64, Node 22.23.2, jsdom, one worker, Bend 2.0.34. Four isolated processes
ran in order: baseline first, candidate first, candidate repeat, baseline repeat.
No other project tests or builds ran during the clocks. Other apps stayed open.
Each process has twelve routes and twenty growing Z / 中 word edits per route.
The complete app language, source history, preview, and dirty comparison are
inside the state clock. Setup, outline, fresh decoration checks, DOM, native
input, and screen frames are outside it. No samples are removed.

All 960 exact-source and fresh-decoration comparisons pass. Every sample
publishes a tree with the complete current document length. All metadata body
boundaries are zero. Plain start/middle routes use nineteen indexed previews
and one full preview. Plain end uses twenty indexed previews at 100 KiB and
nineteen indexed plus one full at 1 MiB. Note-bearing routes use full preview.
The raw logs retain every timing, published length, and body boundary.

Values below are median / p95 in milliseconds.

| Size | Note | Edit | Baseline first | Candidate first | Candidate repeat | Baseline repeat |
|---|---|---|---:|---:|---:|---:|
| 100 KiB | no | start | 1.651 / 4.712 | 1.712 / 4.323 | 1.594 / 4.381 | 1.979 / 4.703 |
| 100 KiB | no | middle | 1.721 / 2.549 | 1.412 / 2.240 | 1.442 / 2.265 | 1.710 / 2.569 |
| 100 KiB | no | end | 1.411 / 1.704 | 1.222 / 1.574 | 1.221 / 1.408 | 1.412 / 1.652 |
| 100 KiB | yes | start | 6.778 / 14.548 | 6.921 / 14.966 | 7.184 / 10.156 | 7.344 / 13.777 |
| 100 KiB | yes | middle | 5.204 / 10.731 | 4.977 / 10.282 | 5.454 / 9.152 | 5.582 / 10.177 |
| 100 KiB | yes | end | 4.112 / 4.415 | 4.058 / 4.381 | 4.464 / 4.910 | 4.327 / 4.693 |
| 1 MiB | no | start | 14.671 / 16.637 | 11.854 / 17.034 | 13.079 / 23.822 | 14.695 / 27.012 |
| 1 MiB | no | middle | 14.688 / 25.683 | 11.872 / 23.895 | 13.437 / 21.858 | 14.489 / 17.195 |
| 1 MiB | no | end | 14.288 / 38.720 | 11.977 / 34.115 | 13.344 / 42.017 | 14.857 / 79.379 |
| 1 MiB | yes | start | 104.193 / 143.503 | 94.135 / 191.146 | 91.822 / 247.995 | 105.427 / 269.262 |
| 1 MiB | yes | middle | 81.032 / 103.749 | 69.603 / 122.901 | 71.876 / 108.718 | 80.143 / 104.431 |
| 1 MiB | yes | end | 61.913 / 82.970 | 51.636 / 72.149 | 50.872 / 66.253 | 60.906 / 83.613 |

All plain 1 MiB medians improve in both comparisons. Tail results vary. The
100 KiB start route has a mixed median. Note-bearing routes do not use the
absence certificate; their timing variation cannot establish a direct gain
from that path. Their full-preview cost remains open. The bounded-read test
verifies the removed full-body scan. This evidence supports retaining that
change, but proves neither native frame latency, first-frame speed, nor memory.

Reproduce a candidate batch with `npm run benchmark:growth`. The five tests in
tests/web/footnote-absence.test.ts cover bounded reads, insertion and deletion
seams, adjacent changes, metadata settlement, Unicode, and exact source history.
