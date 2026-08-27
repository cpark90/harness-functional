# RECIPE_STANDARD rollout — final verification (vnv, independent re-run)

**Verdict: PASS-with-CONCERN.** The 15-recipe FailurePolicy backfill is clean
(no fabrication, B23 recurrence 0, dangling 0, structure valid). All 53 recipe
closures pass `validate.py` and the 3 lint axes. The spec-fidelity flag (③) is
correct. **One material CONCERN**: 15/53 recipes do **not** carry 5 of the §1
"required core" predicates the standard claims are 53/53, and RECIPE_STANDARD
§0/§1 overstate both fleet coverage and what SHACL actually enforces.

Judge does not edit ontology/recipes — routing note at end.

## Reproduce (environment)
- Tools are CENTRAL; recipes repo has no `tools/`. In `/home/cpark/git/harness-recipes`:
  `ln -sfn /home/cpark/git/harness_ontology central` (catalog `central/…` block; gitignored).
- `export HARNESS_CATALOG=$PWD/catalog-v001.xml PYTHONPATH=/home/cpark/git/harness_ontology/tools`
- Per-recipe closure: `HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<n>
  /usr/bin/python3 central/tools/validate.py`. Shell `python3` lacks rdflib → `/usr/bin/python3`.
- Symlink removed at end.

---

## ① FailurePolicy backfill (15 recipes) — PASS

Targets (all 15 are **untracked/new** dirs = fresh importer skeletons given the
run-behaviour axis this rollout): 20/23/24/25/27/36/38/41/42/47/52/63/64/67/88.

| gate | method | result |
|---|---|---|
| closure validate | per-recipe `validate.py` (loop) | **15/15 PASS** (part of 53/53 sweep) |
| dangling `core:fp-*` | rdflib: every bound `core:fp-*` ∈ central `ho:FailurePolicy` set (8 archetypes) | **0 dangling** |
| local fp structure | rdflib: each `id:fp-*` has ≥1 `failureCondition` + ≥1 `recoveryStrategy` | **0 malformed** |
| B23 recurrence | rdflib node-level: same subject has `specializes core:fp-*` **and** "no central archetype covers" text | **0** |
| fabricate | sample local fp / accepted-omission vs source | **0 fabrication** |

**Per-recipe fp binding (bind = central + local):**
20(4=3+1) 23(5=3+2) 24(5=3+2) 25(5=4+1) 41(5=1+4) 38(4=2+2) 27(3=3+0) 42(3=3+0)
63(3=3+0) 64(5=4+1) 67(5=5+0) 88(4=4+0) 47(5=5+0) 52(5=5+0) 36(4=2+2). Every recipe
has ≥1 fp; every locally-declared fp is bound (no orphan local fp).

**B23 discipline is correct (not just absent).** The two local fps that
`ho:specializes core:fp-review-critical-rework` (25 `fp-blaming-language`, 36
`fp-accessibility-p0-block`) carry **no** "no central archetype" claim; every
local fp that *does* claim "no central archetype covers" (20/23/24/41/38/64/36…)
has **zero** specializes edges. That is exactly the B23 anti-pattern avoided at
node level — a domain-specific row is authored local *without* a contradictory
central-refinement edge, while a genuine refinement specializes and makes no
"nothing covers this" claim.

**Fabricate check (source cross-read, `~/git/harness-100/en/<n>`):**
- **27/88 corrupt sources** — verbatim degraded text, no fabrication. 27's
  `## error` table rows map faithfully: "information → template placeholder" →
  `core:fp-insufficient-input`; "inthisbefore failure → 1 retry → review report"
  → `core:fp-agent-failure-retry`; "reviewfrom 🔴 → modification request →
  verification (maximum 2)" → `core:fp-review-critical-rework`. The 2 garbled rows
  (stack-unspecified / scale-architecture) are honestly **left out (accepted)**,
  matching the recipe comment. Corrupt token `inthisbefore` is carried verbatim.
  88's 5 rows → 4 central archetypes (source-unavailable covers both "data None"
  + "web search failure"); no local fp, no fabrication.
- **41 clean source** — 4 local fps trace 1:1 to real `## Error Handling` rows
  (No LLM API key / No RAG data source / No evaluation dataset / budget); recovery
  strategies mirror the source ("env var setup guide", "build as pure LLM app",
  "generate synthetic data"). Domain-specific, no central fit → correctly local.

---

## ② Fleet conformance sweep (53 recipes vs RECIPE_STANDARD) — PASS-with-CONCERN

- **Closure validate: 53/53 PASS, 0 FAIL** (SHACL incl. HarnessShape +
  SpecializesTypingShape, reachability, capabilities, assemblyOrder, drift).
- **Lint (standalone re-run of central `lint_uniformity` check fns on each recipe
  graph): 0 violations across 53** — tokenEstimate §1c = 0, prefix §2 = 0,
  language §1d = 0.
- **Run-behaviour coverage (matches §0 expectation):** `hasRole` 51, `hasInstruction`
  51, `hasExecutionMode` 51, `hasTestScenario` 44, `hasFailurePolicy` 49 (of 53).
- **Role `specializes` (B17): 51/53** carry ≥1 role→`core:role-*` edge, 0 non-core
  targets. Per-recipe unlinked roles (e.g. 63 `role-critic-synthesizer`) are the
  justified anti-drift conservative skips (semantics diverge from any archetype;
  force-fit would be worse drift) — not defects.
- **The 2 exceptions = `techdoc` + `contract-demo`** (reduced-profile, §0-documented):
  0 roles / 0 instructions / 0 execution-mode. Confirmed exactly these two, no
  fabrication added.
- **§2 accepted-reason comments present** for every TestScenario/FailurePolicy
  omission: 14/27/28/43/52/55 (+lpranging/techdoc/contract-demo) each carry an
  explicit `SCENARIO-MISSING`/`FAILURE-MISSING` FLAG ("… no `## Test Scenarios`
  section → left unbound (not fabricated)"). 28/55 likewise for fp. This is §2's
  honest under-reflection, not a gap.
- **§5 naming fixes landed by this rollout:** scenario prefLabel case normalized
  to §5 (81/82/87/90: "Error flow" → "Error Flow scenario"); Contract prefix
  drift fixed in contract-demo (`contract-*` → `ct-*`). lpranging change = banner
  prose alignment only (no graph change).

### CONCERN — §1 required core is 38/53, not 53/53
The 15 backfill recipes are **importer skeletons** (`import_corpus.py` intentionally
emits HarnessShape-incomplete drafts; judgment bindings deferred + flagged). Each
harness node binds only prefLabel + Domain + Task + SystemPrompt + Workflow +
derivedFrom + maturity + the run-behaviour axis. **Missing on all 15:** `usesTool`,
`hasGuardrail`, `usesModel`, `requiresCapability`, `tagged`.

They pass `validate.py` because the **real** `ho:HarnessShape`
(`ontology/shapes/harness-shapes.ttl:21`) only enforces prefLabel + `targetsDomain`
+ `addressesTask` + `hasSystemPrompt` + `hasWorkflow`. Two standard-vs-reality gaps:
1. **RECIPE_STANDARD §1** states "The `ho:HarnessShape` minimums (1 SystemPrompt +
   ≥1 Workflow + ≥1 Tool + ≥1 Guardrail + ModelConfig …) are enforced by SHACL."
   **Inaccurate** — SHACL does not enforce Tool / Guardrail / ModelConfig.
2. **RECIPE_STANDARD §0** measures `usesTool`, `hasGuardrail`, `usesModel`,
   `requiresCapability`, `tagged` = "53/53 (the hard core)". **Actual on-disk fleet
   = 38/53** for each (the 38 pre-existing recipes; the 15 new skeletons lack them).

This is an internal inconsistency shipped *within* the rollout: the newly-authored
RECIPE_STANDARD.md claims a completion the fleet does not have. Not a graph defect
(gate is green, drafts are honestly flagged), but the standard's stated §1 required
core is unmet by 15/53 recipes.

---

## ③ Spec-fidelity flag (27-data-pipeline importer FAILURE-MISSING) — PASS

- **False-positive is real.** Importer heading regexes (`import_corpus.py:330,333`,
  IGNORECASE): `^##\s+test scenarios?\b` and `^##\s+error handling\b`. The 27 source
  headings are mangled to `## error` and `## test` (word-drop, not case) →
  `section_body` misses them → importer emits FAILURE-MISSING / SCENARIO-MISSING.
- **In-recipe correction is valid.** Developer manually recovered the fp rows as 3
  **central-IRI reuses** (zero authored text → zero fabrication risk) and honestly
  left the 2 garbled rows out. Scenarios were **not** recovered — correct
  asymmetry: reflecting them requires authoring domain-specific prompt/expected
  text from word-salad, which §2 rules is worse than under-reflection.
- **Importer hardening as separate follow-up is the right call.** Word-drop/fuzzy
  heading tolerance is a central `tools/import_corpus.py` change (out of recipe
  scope) and itself risks new false-positives; it does not block the rollout since
  the recipe is manually corrected.
- **Minor nit (non-blocking):** 27's top-of-file FLAGS block still literally reads
  "FAILURE-MISSING … left unbound", now contradicted by the bound fp + the fp-section
  SOURCE-QUALITY NOTE. Header flag is stale vs body.

---

## Routing (judge only — no edits made)
- **CONCERN (②)** → orchestrator decision, two options: (a) developer dispatch to
  bind the 5 judgment predicates on the 15 skeleton drafts (complete → true §1
  conformance), **or** (b) revise RECIPE_STANDARD §0/§1 to (i) correct the SHACL
  claim (HarnessShape does not enforce Tool/Guardrail/ModelConfig) and (ii) record
  a "skeleton-draft" tier (maturity=draft, judgment bindings deferred) analogous to
  the reduced-profile exception. Standard + importer "must not drift apart" (§6.3).
- **Nit (③)** → optional developer dispatch: annotate/strike 27's stale header
  FAILURE-MISSING flag to match the corrected body.
- git / commit → inspection (after orchestrator resolves the CONCERN;
  `validate.py` is already green on all 53).

## Evidence commands (exact)
```
# 53/53 validate sweep
for d in recipes/*/; do n=$(basename $d); HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/$n \
  /usr/bin/python3 central/tools/validate.py; done            # 53 PASS, 0 FAIL
# fp analysis + B23 + dangling + hard-core coverage + lint: rdflib scripts (this session)
# source cross-read: /home/cpark/git/harness-100/en/{27,88,41}-*/.claude/skills/*/skill.md
```
