# Inactive local block index

Baseline: 5361c66. Date: 2026-10-11. Node 22.23.2, macOS arm64.
prototype.ts is test code. The application does not import it.

The prior preview-groups prototype still collected all blocks and built and
compared all overlap groups after every edit. This prototype instead holds
block identities and bounded source envelopes in a persistent CodeMirror
RangeSet. A local change maps that index and the decoration set, then looks up
the affected paragraph. It checks adjacent blocks until parser identities and
exact mapped source envelopes agree, or reaches EOF. New adjacent tree
identities are rebuilt even if their source is unchanged. The search checks
at most eight neighbors on each side. No old editor state, absolute item chain,
or source-coordinate widget closure is retained in a block value.

Initial eligibility is established once from a complete tree. Only plain
top-level paragraphs and headings are eligible, with at most 65,536 UTF-16
units per block. Metadata, containers, resources, reference syntax, mathematics,
and escapes use the existing full path. The first edit route accepts one
interior word edit with complete word neighbors, and keeps old and new selection
inside the dirty paragraph. Structural edits, multiple changes, uncertain
boundaries, incomplete trees, and unsupported source are rejected.

The initial run rejected the preceding heading because Lezer gave it a new
tree identity despite unchanged source. The corrected prototype rebuilds that
heading and checks the next stable outer boundary. It does not weaken identity
validation. Production preview remains unchanged.

The current test uses the direct Markdown language and the explicit tree returned
by ensureSyntaxTree. Its context tree can finish before editor state publishes
that tree. Settling runs outside these prototype counts. Production uses the
published tree and rejects incomplete document bounds. The test uses complete
repeated heading/paragraph blocks. Initial sizes are
102,438 and 1,048,635 ASCII units, rounded up from requested 100 KiB and 1 MiB.
At start, middle, and end, it inserts Z, 中, and 𠀀 consecutively. All 18 edits
compare every resulting decoration with fresh collection and construction.

| Position | Visited blocks, either size | Rebuilt items | Rebuilt ranges |
|---|---:|---:|---:|
| Start | 3 | 3 | 8 |
| Middle | 3 | 2 | 6 |
| End | 2 | 2 | 6 |

Counts include stable neighbors, not just changed blocks. They exclude parser
work, RangeSet internals, source-record work, initialization, and the existing
production preview update. They show bounded local inspection and rebuilding
on these fixtures. They are not latency or memory measurements.

tests.log retains the full test batch and all six raw counter records.
Reproduce the focused checks from the repository root:

```sh
node node_modules/vitest/vitest.mjs run tests/web/local-preview-index.test.ts --pool=threads --maxWorkers=1
```

The bounded production path is now in src/web/preview-index.ts. It does not
import this prototype. Production tests cover selection, parser fallback,
Undo/Redo, deletion, and structural fallback. The complete growth comparisons
are in ../local-production/, including a current full-test log. tests.log here
retains the initial prototype evidence. General reuse, resource dependencies,
memory, and the 16 ms native-frame target remain open.
