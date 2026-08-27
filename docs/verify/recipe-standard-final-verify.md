# RECIPE_STANDARD canonicalization — FINAL verification (vnv, independent re-run)

**Verdict: PASS-with-CONCERN.** The prior CONCERN is **resolved on its two named
axes** — (a) the 15 skeletons now carry all 5 hard-core judgment predicates
(`usesTool`/`hasGuardrail`/`usesModel`/`requiresCapability`/`tagged`) at **53/53
fleet coverage**, and (b) RECIPE_STANDARD §1's SHACL-overclaim is corrected
(HarnessShape does **not** enforce Tool/Guardrail/Model, and the spec now says so).
Enrichment is clean: fabrication 0, `roleTool ⊆ usesTool` / `roleGuardrail ⊆
hasGuardrail` 0 violations, dangling 0, drift 0. All 53 closures pass `validate.py`
and the uniformity linter.

**One residual CONCERN (documentation-only, non-blocking to graph):** the spec
*correction* rewrote §0's run-behaviour coverage figures to numbers that do **not**
match the on-disk fleet — `hasExecutionMode` **claimed 52/53, actual 51**;
`hasTestScenario` **claimed 51/53, actual 44**; `hasFailurePolicy` **claimed 52/53,
actual 49**. This reintroduces the exact "§0 overstates fleet coverage" inconsistency
the correction set out to remove (and now contradicts the spec's own §2, which
documents the 9 accepted TestScenario omissions). Not a graph defect (validate+lint
green; omissions are §2-legitimate accepted-reason) — routes to developer dispatch
to correct three numbers in §0.

Judge made no edits to ontology/recipes/spec — routing note at end.

## Reproduce (environment)
- Tools are CENTRAL; recipes repo has no `tools/`. In `/home/cpark/git/harness-recipes`:
  `ln -sfn /home/cpark/git/harness_ontology central` (gitignored; **removed at end**).
- `export HARNESS_CATALOG=$PWD/catalog-v001.xml PYTHONPATH=/home/cpark/git/harness_ontology/tools`
- Shell `python3` lacks rdflib → all runs use **`/usr/bin/python3`**.
- Per-recipe closure: `HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<n>
  /usr/bin/python3 central/tools/validate.py` (and `.../lint_uniformity.py`).
- Direct rdflib analysis loads each `recipes/<n>/<n>.ttl` + the full central
  `ontology/**/*.ttl` for dangling resolution (`ho:` = `https://harness-ontology.dev/schema#`).

The 15 backfill skeletons (all `??` untracked, all `maturity="draft"`):
20/23/24/25/27/36/38/41/42/47/52/63/64/67/88.

---

## Gate 1 — predicate-set parity vs baseline 96-real-estate-analyst — PASS

**Hard-core on the harness node (all 15):** every skeleton binds **5/5** of
`usesTool`,`hasGuardrail`,`usesModel`,`requiresCapability`,`tagged` (rdflib per-node
presence). **Roles: 74 total** across the 15 (5 each, except 67=4); **74/74 carry
`roleTool`+`roleGuardrail`+`roleMemoryPolicy`+`tagged`.**

**Node-class predicate diff (sample 20/41/63/88) vs baseline 96:**
- harness node — MISSING vs 96 = `{altLabel, appliesPattern, hasChannel}` only;
  EXTRA = `∅`. **Required-core diff = 0.** All three deltas are genuinely optional
  (fleet coverage: `appliesPattern` 38/53, `hasChannel` 36/53, `altLabel` 31/53 —
  carried by the older 38, deferred on the draft skeletons). None is in §1's
  required-core table.
- role node — the only residual difference vs 96's role predicate set is
  **`specializes` skipped on 12/74 roles** (the intentional B17 anti-drift skips —
  see below). All other baseline role predicates
  (`rolePersona`/`roleTool`/`roleGuardrail`/`roleMemoryPolicy`/`tagged`/`tokenEstimate`/
  `prefLabel`/`definition`/`maturity`) present on all 74.

So the residual is exactly the allowed set {deferred-optional, intentional
specializes-skip}; no unexpected missing-required and no bad extra.

**The 12 `specializes` skips are the accepted conservative anti-drift skips**, not
laziness — but a soft note: several look force-fittable to `core:role-analyst`
(e.g. 23 `role-domain-analyst`, 47 `role-bsc-analyst`/`role-swot-specialist`, 67
`role-law-mapper` = "compliance law analyst"). The developer chose to skip where the
archetype is only an approximate cover (central archetypes are broad-function:
analyst/author/coordinator/curator/design/implementer/inspection/orchestrator/
planner/research/strategist/synthesizer/tester/vnv). This is graph-legal
(`SpecializesTypingShape` only type-checks `specializes` when present; it is not
minCount-forced) and was accepted in the prior rollout report gate ②. It is **not**
part of the enrichment parity claim (which was scoped to the 4 role predicates).
Optional tightening → developer, not a blocker.

---

## Gate 2 — subset integrity, dangling, drift — PASS

- **`roleTool ⊆ harness.usesTool` and `roleGuardrail ⊆ harness.hasGuardrail`:
  0 violations** across all 15 (rdflib set-containment per role).
- **Dangling: 0.** Every `core:*` IRI referenced by the 15 (mc/gr/tool/cap/mode/fp/
  role/domain/task) resolves to a subject in the central `ontology/**` graph.
- **Drift: 0.** 0 duplicate `prefLabel` within any class in the 15; 0 untyped local
  (`id:<recipe>/…`) subjects; 0 local text-bearing node missing `ho:tokenEstimate`.

---

## Gate 3 — 53/53 conformance — PASS

- **`validate.py` closure sweep: 53/53 PASS, 0 FAIL** (SHACL incl. HarnessShape +
  SpecializesTypingShape, reachability, capabilities, assemblyOrder, capacityFit,
  registryDrift).
- **`lint_uniformity.py`: PASS** on all 22 recipes exercised (15 skeletons + the 6
  modified tracked recipes 81/82/87/90/contract-demo/lpranging + baseline 96) —
  tokenEstimate §1c / prefix §2 / language §1d / maturity / definition all 0
  violations each.
- **Hard-core 5-predicate coverage = 53/53**, missing = ∅ for each of the five —
  **the 2 reduced-profile hand-authored units (techdoc, contract-demo) are
  included**: they carry all 5 hard-core; their reduced profile is
  Role/Instruction/executionMode, not the hard core.

---

## Gate 4 — spec accuracy — PASS-with-CONCERN

**SHACL claim (the original CONCERN) — FIXED.** Independently read
`ontology/shapes/harness-shapes.ttl`: `ho:HarnessShape` minCount set =
`{prefLabel, targetsDomain, addressesTask, hasSystemPrompt, hasWorkflow}` (5), nothing
else. RECIPE_STANDARD now matches this in **two** places:
- §0 (L40-47): "the hard core … **not** a SHACL floor: SHACL structurally forces only
  a subset … The remaining five … are fleet-convention required."
- §1 "Convention vs SHACL" (L79-92): Tool/Guardrail/Model "are **not** minCount-
  enforced by any shape … Convention ⊇ SHACL."
- Grep of the whole spec for the old phrasing ("… Tool + ≥1 Guardrail + ModelConfig …
  are enforced by SHACL"): **0 residual occurrences.** §6 (L264) "PASS covers SHACL
  (incl. HarnessShape, SpecializesTypingShape)…" is accurate.

**§0 run-behaviour coverage numbers — INACCURATE (the residual CONCERN).**
Direct rdflib count on all 53 harness nodes vs the spec's §0 (L48-50):

| predicate | spec §0 claims | measured actual | missing recipes |
|---|---|---|---|
| `hasRole` | 51/53 | **51/53** ✓ | contract-demo, techdoc |
| `hasInstruction` | 51/53 | **51/53** ✓ | contract-demo, techdoc |
| `hasExecutionMode` | **52/53** | **51/53** ✗ | contract-demo, techdoc |
| `hasTestScenario` | **51/53** | **44/53** ✗ | 14,27,28,43,52,55,lpranging,techdoc,contract-demo |
| `hasFailurePolicy` | **52/53** | **49/53** ✗ | 28,55,contract-demo,techdoc |

`hasTestScenario` is off by **7**. This is the same class of defect as the original
CONCERN (§0 overstating fleet coverage), now in the run-behaviour rows, and it is
**internally inconsistent with the spec's own §2**, which explicitly documents those
9 TestScenario omissions as accepted-reason under-reflection. The parenthetical
"universal modulo the 3 hand-authored units" is likewise loose (testScenario has 9
holes, failurePolicy 4, not 3). Not a graph defect — validate+lint green, every
omission is §2-legitimate — but the standard states coverage the fleet does not have.

---

## Gate 5 — fabricate 0 — PASS

Cross-read the enrichment on 41/67/47 (harness + every role):
- `usesTool` = central generics matched to domain — `tool-editor`+`tool-shell` for
  the LLM-app builder (code-exec), `tool-editor`+`tool-websearch` for compliance /
  strategy (research). `hasGuardrail` = the 6-guardrail standard set incl. `gr-lang`.
  `usesModel` = `core:mc-opus`. All central-IRI reuse (zero authored fixture text).
- `requiresCapability` = central `cap-*` matched to the bound tools/workflow
  (`cap-websearch↔tool-websearch`, `cap-codeexec/fileedit↔tool-shell/editor`,
  `cap-orchestration` for multiagent, `cap-synthesis` for strategy) — all provided in
  closure (validate's capability gate is green on all 53, so no unprovided require).
- `tagged` = `core:c-multiagent`/`c-softeng` + local `id:c-*` domain concepts (each
  connected — drift gate 0 orphans).
- role bindings are **least-privilege subsets** (gate 2) with per-role
  `roleMemoryPolicy` text that mirrors the repo's own agent-memory convention
  (`.claude/agent-memory/<role>/…, index in MEMORY.md`), specialized per role. This is
  convention-derived, not invented source fixtures — no forced/"억지" binding.

---

## Gate 6 — role `tokenEstimate` vs `roleMemoryPolicy` note — NON-DEFECT (baseline-choice)

The note (role `tokenEstimate` value does not add tokens for the added
`roleMemoryPolicy` text) is **immaterial to the standard, not a defect**:
`ho:tokenEstimate` scope (ONTOLOGYSTYLE §1c) is SystemPrompt/Instruction/Guardrail/
Example-with-promptText + Tool + Workflow; **Role is explicitly out of scope** (the
linter exempts Role — its runtime size is the separate `ho:observedTokenVolume` §3
axis, a projection-cost-vs-runtime distinction). All 74 roles carry `tokenEstimate`
anyway, following baseline 96 (which itself carries both `roleMemoryPolicy` and
`tokenEstimate`). Whether that value reflects the memory-policy prose is a
baseline-inherited convention choice with no bearing on §1c compliance.

---

## Conclusion — canonicalization is functionally complete; one doc-accuracy CONCERN

- **RESOLVED:** the two named prior-CONCERN axes — 15 skeletons enriched to hard-core
  parity (5/5 each; fleet 53/53) and §1 SHACL-overclaim corrected. Enrichment is
  fabrication-0, subset-clean, dangling-0, drift-0. All 53 validate + lint PASS.
- **Standardization state:** 15 skeletons now match the 38 pre-existing recipes on
  required-core format (same importer emission shape; residual deltas are optional
  axes + intentional specializes-skips). Format is uniform.
- **RESIDUAL CONCERN (non-blocking):** RECIPE_STANDARD §0's run-behaviour coverage
  figures (executionMode/testScenario/failurePolicy) overstate the fleet
  (51/44/49 actual vs 52/51/52 stated), reintroducing the §0-overstates-coverage
  inconsistency against the spec's own §2. Documentation-only; graph is green.

## Routing (judge only — no edits made)
- **Residual CONCERN → developer dispatch:** correct RECIPE_STANDARD §0 (L48-50) to
  the measured `hasExecutionMode 51/53`, `hasTestScenario 44/53`, `hasFailurePolicy
  49/53`, and soften the "universal modulo 3 hand-authored" parenthetical (testScenario
  has 9 accepted omissions per §2, not 3). Keep §0/§1/§6 SHACL-vs-convention wording
  as-is (correct).
- **Optional (non-blocking) → developer:** tighten the 12 approximate `specializes`
  skips that map cleanly to `core:role-analyst` (domain-analyst / bsc-analyst /
  swot-specialist / law-mapper), if the team wants role-taxonomy coverage over
  conservative skip. Not required for conformance.
- **git / commit → inspection** (validate.py + lint already green on all 53; the
  residual CONCERN is a prose fix, not a gate failure).

## Evidence commands (exact)
```
# 53/53 validate sweep + 22-recipe lint sweep (env as above, /usr/bin/python3)
for d in recipes/*/; do n=$(basename $d); HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/$n \
  /usr/bin/python3 central/tools/validate.py; done            # 53 PASS, 0 FAIL
# hard-core 53/53, role-4 74/74, parity diff, subset, dangling, drift, run-behaviour
# counts: rdflib scripts (this session) over recipes/<n>/<n>.ttl + central ontology/**
# spec floor: read ontology/shapes/harness-shapes.ttl HarnessShape (5 minCount)
```
