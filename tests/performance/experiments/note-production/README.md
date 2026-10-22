# Note index in production

The baseline snapshot is src/web/preview.ts at a8d193f, with only a header and
relocated imports. It is never used by the app. The shared index default retains
the original plain eligibility guard. Each version uses its own complete
collector and full decoration builder outside timing. CodeMirror widget
comparison requires the same constructor. The failed import and widget batches
are retained; neither supplies a comparison result.

Four sequential runs use macOS arm64, Node 22.23.2, and jsdom. No other project
test, build, Vite server, or browser check runs during the clocks. Other desktop
apps stay open. Each run has twelve routes and twenty growing word edits per
route. Run summary.mjs to validate the logs and reproduce summary.json.

All 960 exact-source and complete-decoration checks pass with complete published
trees. At 1 MiB, note-bearing medians are 51.503–93.056 ms in baseline and
16.137–17.943 ms in production. Production uses nineteen indexed updates and
one full fallback per note-bearing route. Local work visits at most four blocks
and rebuilds at most eight ordinary ranges, plus all current note widgets.

Plain 1 MiB medians are 11.333–12.136 ms in baseline and 12.108–12.415 ms in
production. This batch shows a small increase, despite retaining the plain
algorithm. First note-bearing samples are 67.758–255.484 ms in baseline and
108.874–117.354 ms in production. Some first fallbacks get slower. Production
note-bearing p95 is 22.717–89.257 ms. This does not meet the frame target.

The clock covers state transactions and dirty comparison. It excludes outline,
the full oracle, DOM, native input, and screen frames. Index creation is full
document work. Note validation and widget rebuilding scale with note count and
content. These checks prove neither native frame speed nor IME acceptance.

Four resource runs pass 1600 source/display comparisons, all through full
preview. Complete/partial sample counts are 343/57 for code baseline, 389/11 for
code production, 369/31 for HTML baseline, and 388/12 for HTML production.
resources.mjs validates these logs and reproduces resources.json. Since some
trees are partial, these clocks do not support a complete-document speed claim.
The production suite separately checks full decorations after tree settlement.

All 524 web and six Node checks, build, and Bend proof pass. Chrome fixture
checks confirm Z and Chinese input, current shifted reference/definition reveal,
definition source edits, Source mode, exact original-source Undo, Redo, and
continued indexed input. The screenshot is /tmp/markdew-note-production-proof.png.
The fixture uses the real app without native file effects. It does not prove IME.
