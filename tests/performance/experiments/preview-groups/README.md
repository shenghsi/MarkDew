# Inactive edit-decoration experiment

Decision: reject this prototype. Production `src/web/preview.ts` remains the
exact file from baseline `6bc4cec`. `preview.ts.txt` is the final candidate,
not an application module. Normal tests and builds do not import it.

The prototype maps the old decoration set and rebuilds complete changed overlap
groups. Validated parser blocks retain group tokens. Shifted widgets rebuild
their source coordinates. Notes, images, tables, and incomplete trees use the
full path. Group creation is deferred when reuse is unavailable.

Logs retain the failed intermediate runs and the final growing-edit pair.
`state-before.log` is the baseline overwrite benchmark. `state-after.log` is
the first prototype. `cache-state.log` adds block groups. `final-state.log`
is a later overwrite run before deferred group creation; its name does not
mean accepted. `stages.log` and `cached-stages.log` measure standalone stages,
not total edits. `growth-candidate.log` and `growth-control.log` use the same
growing-edit benchmark. They ran separately, candidate first, with no concurrent
project test or build. These are exploratory runs, not repeated causal evidence.
Every logged sample remains, including slow samples and warm-up effects.

Run the retained production check with `npm run benchmark:growth`. It inserts
alternating ASCII and Chinese characters at the start, middle, and end of
100 KiB and 1 MiB documents, with and without a footnote. Each route has twenty
successive edits. Initial sizes are ASCII bytes and UTF-16 units; insertion
increases both. Each edit checks the exact source record and every decoration
against fresh collection and construction outside the clock. The clock includes
the state transaction and dirty comparison. It excludes outline, DOM, native
input, screen frames, memory, and the reference checks. Reference work can
affect later garbage collection. No sample is removed for that reason.

Small median gains and mixed p95 results do not support adoption. Several
end-of-document and note routes have worse p95. The 16 ms target remains open.
The architect reviewed this decision. See root BENCHMARKS.md for the full pair.
The exact npm wrapper also passes all 240 source and decoration checks.
`growth-command.log` retains that separate baseline repeat with all samples.
It is not a second candidate/control pair. All 362 web tests, three artifact
checks, production build, Bend proof check, and whitespace check pass.
