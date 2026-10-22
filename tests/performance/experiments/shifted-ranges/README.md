# Rejected shifted-range cache transfer

Production baseline: a19e2c4. Reference computer: Mac16,10, macOS arm64,
Node 22.23.2. Date: 2026-10-11. Workload: preview-growth.test.ts, twenty
successive insertions per route, alternating Z and 中. Initial ASCII sizes are
102,400 and 1,048,576 bytes. Routes cover plain and footnote documents, with
start, middle, and end edits. All 240 edits in each run retain exact source and
match complete fresh decorations. Setup and complete parser settling run
outside the clock. The unchanged benchmark includes its first edit sample;
it does not have a separate edit warm-up. No sample is removed.

The CPU profile ran first. Its timings are diagnostic and do not enter the
comparison. The unprofiled baseline ran next, then the candidate after its
correctness checks. One workload ran at a time. No concurrent project build or
test ran during either timing run. Other apps remained open. This single
sequential pair is exploratory evidence and does not establish a causal gain.
Fresh decoration checks run outside the edit clock and can affect later GC.
The clock excludes outline, DOM, native input, screen frames, and memory.

Commands, from the project root:

```sh
MARKDEW_GROWTH_BENCH=1 node --cpu-prof --cpu-prof-dir=/tmp/markdew-edit-profile.kxtgMG node_modules/vitest/vitest.mjs run tests/performance/preview-growth.test.ts --pool=threads --maxWorkers=1
MARKDEW_GROWTH_BENCH=1 node node_modules/vitest/vitest.mjs run tests/performance/preview-growth.test.ts --pool=threads --maxWorkers=1
```

profile.log retains the diagnostic output. timing.log and candidate-timing.log
retain every unprofiled timing sample. candidate.patch is inactive. It transfers
cached ordinary ranges only after exact block-tree and envelope validation,
rejects complete entries with widgets, and retains normal selection, active-cell,
and physical-line checks. All 429 web checks and six Node checks passed for the
candidate, but all twelve edit-route medians got worse. Mixed p95 changes do not
support adoption. The candidate was removed. Production preview.ts is unchanged
from a19e2c4.

profile-summary.mjs walks sampled call ancestry and includes only preview state
field update branches. It excludes direct oracle construction and initialization.
Unattached GC samples are not attributed. The worker profile is retained as
worker.cpuprofile in this folder,
SHA-256 4994a97403345c0e4ba44d777a148eeb6a5ff31b07d95b15fd05323e1f6f1ce2.
Run the summary script with that path. profile-summary.json retains its result
and the original temporary capture path.
The profile attributes 56.64% of sampled preview-update work to decoration
construction and 41.23% to cached collection. These percentages are CPU sample
attribution, not per-edit latency or additive stage timings.

Next, measure enumeration, suppression, sorting, and Decoration.set separately,
plus block-cache validation and shifting. Do not retry transfer without an
explanation for its added cost. The 16 ms native frame target remains unmet.
