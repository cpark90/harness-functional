# Wave-15 FailurePolicy backfill (RECIPE_STANDARD §2, the 15 role-only imports)

Companion to wave15-recipe-specializes-role-only. Backfilled the `## Error Handling`
axis for the 15 recipes (20/23/24/25/27/36/38/41/42/47/52/63/64/67/88). Result:
**15 local id:fp-* authored (8 recipes) + many central-reuse ADDs; all 15 closures
PASS + lint_uniformity PASS; B23 co-existence = 0; dangling central fp = 0.**

## ★the importer had ALREADY bound the obvious central fps
Brief said "FailurePolicy 0개" but that was imprecise: the importer bound the exact-match
central reuses (e.g. insufficient-input/agent-failure-retry/review-critical-rework) and
left only the DOMAIN-SPECIFIC rows as `# LOCAL candidate (author id:fp-*)` comments. The
GAP = those flagged candidates, NOT all fp. My job = adjudicate each flagged candidate:
REUSE a central archetype if one fits (anti-drift), else author local.

## ★anti-drift re-evaluation collapsed most "LOCAL candidates" to central archetypes
The importer is mechanical/conservative — it flags a row local unless the archetype phrasing
matches almost verbatim. On judgment review, recurring flagged rows are canonical central patterns:
- **"Web search failure" / "X inaccessible" (logs, full-text, source, code, data)** → `core:fp-source-unavailable`
  (external/depended-on source unreachable → substitute evidence + state limitation). This row
  appears in 6+ recipes; authoring N local copies would be textbook drift. REUSE, always.
- **"<input> not provided/unspecified → default + confirm"** (brand color, framework, wiki platform,
  citation format, no-data-source) → `core:fp-insufficient-input`.
- **"Uncertain law applicability → conservatively include + recommend professional counsel"** →
  `core:fp-refer-to-expert` (decision exceeds agent authority; d1 precedent).
- **"consistency issue → writer revision → re-task (up to 2)"** → `core:fp-review-critical-rework`.
Only genuinely domain machinery stays local: unparseable-provided-config(20), too-many-services/
distributed-monolith(23), test-framework-missing/coverage-tool-unavailable(24), contrast-ratio/
excessive-scope(64), channel-api-drift/nlu-threshold(38), no-api-key/no-rag/no-eval/budget(41).

## ★hard-gate variants specialize review-critical-rework (NOT pure-local)
"Blaming language"(25) and "Accessibility P0 unresolved"(36) ARE review findings but STRICTER
(no ship-flagged-partial; block/must-fix). Author local `ho:specializes core:fp-review-critical-rework`.
B23 RULE ENFORCED: specializing locals carry NO "no central archetype covers" clause; pure-locals
keep that clause but have NO specializes. Never both in one block (grep-proven 0).

## ★27 importer "FAILURE-MISSING" was FACTUALLY WRONG
27's source DOES have an error table, but its heading is mangled to `## error` (not `## Error
Handling`) so the importer's parser skipped it → false FAILURE-MISSING flag. Backfilled the 3
parseable rows (insufficient-input/agent-failure-retry/review-critical-rework, all central) with a
SOURCE-QUALITY NOTE correcting the flag; left 2 word-salad rows out (accepted, not fabricated).
88 similarly mangled → parseable rows only (web-search+data-None→source-unavailable, consistency→
review-rework), no local. Lesson: verify importer provenance flags against the actual source; a
mangled heading defeats the exact-string parser.

## validate/lint env (recipes repo has NO central/tools/)
`ln -sfn /home/cpark/git/harness_ontology central` at recipe-repo root (catalog paths use `central/`
prefix), then `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=<recipe IRI> /usr/bin/python3
central/tools/validate.py`; same symlink for `central/tools/lint_uniformity.py recipes/<r>/<r>.ttl`.
**`rm central` when done** (else it shows as `?? central`). Prove central-reuse IRIs resolve typed
ho:FailurePolicy (dangling 0), don't trust PASS alone (untyped target fires no shape = false PASS).

## comment hygiene
Top-of-file FLAGS are FROZEN import-time provenance (DOMAIN/TASK flags there are already stale-but-
bound by other lanes) → DON'T touch them. The section-level `#=== failure policies` comment block is
the LIVE authoritative doc → rewrite it to the final mapping (central reuse list + local list + fold
notes). git: the 15 recipe dirs stay whole-dir `??`; edits are TTL-only within them.
