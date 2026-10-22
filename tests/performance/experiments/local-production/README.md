# Production block index measurements

Baseline: 637a8f3. Computer: Mac16,10, macOS arm64, Node 22.23.2, jsdom.
Date: 2026-10-11. The application now has a bounded plain-document candidate.
Decision: retain the bounded plain-document path. BENCHMARKS.md records every
route comparison and its limits. Production uses src/web/preview-index.ts.

The first candidate continued the eligibility scan after an unsupported block.
It added work in footnote documents. candidate-before-early-exit.log retains
that superseded run, including all samples. The corrected scan stops at its
first rejection. This changes cost, not eligibility.

The concurrent full test batch exposed partial published Markdown trees even
when the parser context reports completion. ensureSyntaxTree returns the context
tree; syntaxTree returns the published state tree. The YAML wrapper adds a
separate body boundary. The production guard checks the actual Markdown Document
bounds before index creation or updates. The first failed batch is retained
as partial-body-failure.log.gz. Standalone prototype counts now use the direct
Markdown language and the explicitly returned settled tree outside their counted work. Production
tests retain real mixed-language partial-parser rejection and complete-document
acceptance. No production parser budget is increased.

Every growth run has twenty consecutive Z / 中 edits per route, at start,
middle, and end, with and without a footnote. Initial ASCII sizes are 100 KiB
and 1 MiB. Exact source and every decoration are checked against the fresh
reference after each insertion, outside the clock. The first edit is included;
there is no separate edit warm-up. No sample is removed. Parser setup is outside
the clock; index construction during fallback stays inside it.

```sh
MARKDEW_GROWTH_BENCH=1 node node_modules/vitest/vitest.mjs run tests/performance/preview-growth.test.ts --pool=threads --maxWorkers=1
MARKDEW_INDEX_BENCH=1 node node_modules/vitest/vitest.mjs run tests/performance/preview-index-build.test.ts --pool=threads --maxWorkers=1
```

One workload runs at a time, with no concurrent project tests or builds.
Other apps stay open. Fresh checks can affect later garbage collection.
The growth clock covers state update and dirty comparison, not outline, DOM,
native input, frames, or memory. The separate index-creation clock excludes
parsing, source work, and decoration construction. Neither is an open-frame test.
