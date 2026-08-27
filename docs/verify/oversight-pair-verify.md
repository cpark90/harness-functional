# Oversight harness pair — independent V&V + coverage-audit

**Verdict: PASS (clean on all three gates).** Two non-blocking notes (accepted-reasons), no GAP, no drift.

Scope: central +5 individuals (245→250) — `cap-benchmarking`/`cap-audit`, `role-benchmarker`/`role-auditor`,
`c-oversight`, + `h-workspace-synthesis` hasRole +2 — and two first-party recipes (`benchmark-critic`,
`compliance-auditor`; recipe fleet 53→55). Self-report NOT trusted; every gate re-run below.

All tools run with `/usr/bin/python3` (shell `python3` lacks rdflib). Central at repo root; recipe closure
via a temporary `central` symlink → `HARNESS_ROOT_ONTOLOGY` (removed after).

---

## ① Graph-integrity gate (reproduced)

**Central** — `/usr/bin/python3 tools/validate.py` → **PASS**:
- reachability: `all 250 individuals reachable from a Harness` (0 orphan).
- capabilities: `every harness's required capabilities are provided internally`.
- registryDrift: `all 28 instantiated in-scope classes registered` (3 harmless registered-unused; no new class minted).
- SHACL conforms; `no duplicate labels within a class`.
- `lint_uniformity.py` → **PASS** (tokenEstimate/prefix/language/maturity/definition all 0 violations).
- `check_determinism.py` → **PASS** (8 packs byte-identical across processes).

**Recipes** — closure validate (`HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=…/recipes/<r>`),
each = whole central + that recipe:
- `benchmark-critic`: **PASS** — 264 individuals, 0 orphan, capabilities satisfied internally, conforms.
- `compliance-auditor`: **PASS** — 264 individuals, 0 orphan, capabilities satisfied internally, conforms.
- `lint_uniformity.py` on each → **PASS**, 0 violations (required core profile complete, not reduced).
- `gen_recipe_catalog.py --check` → `in sync (55 recipes)`.

**Capability gate (the load-bearing one — `specializes` does NOT propagate `providesCapability`, so each
local role must name it directly).** Verified by rdflib on the closure union (not from author claims):
- `benchmark-critic`: harness `requiresCapability core:cap-benchmarking` ← `id:role-comparator providesCapability
  core:cap-benchmarking` (local, explicit). Other requires: cap-websearch←tool-websearch, cap-retrieval←tool-retriever,
  cap-citation←gr-cite — all bound components.
- `compliance-auditor`: harness `requiresCapability core:cap-audit` ← `id:role-operation-auditor providesCapability
  core:cap-audit` (local, explicit). cap-traceability←gr-traceability, cap-retrieval←tool-retriever.

**Specializes target resolution (SpecializesTypingShape is coarse — Harness/Component partition only — so
resolved separately by rdflib):** all 4 local role→archetype edges resolve to a central `ho:Role`, recipe-ns free:
- `role-case-researcher → core:role-research` [Role]; `role-comparator → core:role-benchmarker` [Role]
- `role-operation-auditor → core:role-auditor` [Role]; `role-evidence-gatherer → core:role-research` [Role]

**Dangling refs:** 0 in each closure — every `core:` IRI object referenced by a recipe resolves to a typed
central subject (rdflib scan of all `core:*` objects vs typed subjects). Local `c-benchmarking`/`c-gap-analysis`/
`c-compliance`/`c-enforcement-finding` root to `core:c-oversight` via `skos:broader` (0 orphan confirms wiring).

---

## ② Anti-drift verdict — CLEAN

The two central archetypes carry explicit self-discriminating clauses against their nearest siblings
(read from `roles.ttl`), so no near-synonym collapse:
- `role-benchmarker` def distinguishes vs **role-research** (gathers but does not compare/claim), vs
  **role-analyst** (judges GIVEN material against stated criteria; benchmarker sources its own external
  comparators + judges against external best practice), vs **role-synthesizer** (terminal convergence/merge,
  not project-vs-external critique). Matches the sibling set the brief named. Holds.
- `role-auditor` def distinguishes vs **role-vnv** (pass/fail on composition OUTPUT; auditor audits operation
  over time), vs **role-inspection** (this repo's user-facing feedback+git lane), vs **role-analyst** (diagnoses
  given material; auditor polices operation+output against governance standards continuously). Holds.
- `cap-benchmarking` (compare subject vs external references, rank gaps) and `cap-audit` (audit artifact+agent
  operation vs declared standard, produce findings) are distinct from each other and from `cap-traceability`
  (preserve single source of truth / non-deletion) and `cap-synthesis` (converge deliverables). No overlap.
- `c-oversight` is new (no prior review/critique/audit concept to collapse into); `skos:related c-traceability`
  + `topConceptOf id:scheme` anchors it in the scheme.
- Recipe local nodes reuse central parts by `core:` IRI; **0 new central vocabulary** minted by the recipes
  (Golden Rule #2). Shared altLabel "compliance watchdog" (central `role-auditor` ↔ recipe
  `role-operation-auditor`) is not a defect — dup-label check is prefLabel-scoped and prefLabels differ; a
  specialization sharing a colloquial synonym with its archetype is expected.

---

## ③ Coverage-audit (source→representation fidelity — CLAUDE.md done gate)

Source = the user's two request concepts. Each structural element maps to a graph element (or an explicit
accepted-reason). Verified against the recipe TTLs + central node definitions.

### benchmark-critic — "지속 외부조사·참조 → 자기 프로젝트와 비교 → 지속적 클레임 제기"

| source element | representation | verdict |
|---|---|---|
| external case collection (지속 조사·참조) | `role-case-researcher` specializes `core:role-research`, `roleTool tool-websearch, tool-retriever`; skill `ins-gather-reference-cases` | ✓ mapped |
| compare project vs comparators (비교) | `role-comparator` specializes `core:role-benchmarker`, `providesCapability cap-benchmarking`; skill `ins-compare-and-claim` | ✓ mapped |
| raise graded claims to approval gate (클레임 제기) | harness `hasChannel core:chan-agent-user` (def: "enforces a human approval gate before any application; user is sole endpoint who may flip approval") + `gr-no-arbitrary-decision` (def: "register each open judgment as an issue and escalate to the decision authority" = raise-don't-decide) on harness + comparator role | ✓ mapped |
| continuity (지속성) | `hasExecutionMode core:mode-agent-teams` (persistent standing peer team) + "continually" in personas/definitions | ✓ mapped (see Note-1) |

Also present: Domain (`dom-benchmarking`), Task (`task-gap-analysis`), 2 run-behaviour TestScenarios (normal +
external-source-unavailable error), FailurePolicies (`fp-source-unavailable`, `fp-conflict-contradiction`),
`derivedFrom core:h-multiagent`. **No missing harness-structural element → no GAP.**

### compliance-auditor — "프로젝트 산출물 + 다른 agent 작동 감사 → 단속(enforce)"

| source element | representation | verdict |
|---|---|---|
| audit output + agents' operation (감사) | `role-operation-auditor` specializes `core:role-auditor`, `providesCapability cap-audit`; def covers "own output AND other agents' charter-conformant operation"; skill `ins-audit-operation` | ✓ mapped |
| evidence collection (증거수집) | `role-evidence-gatherer` specializes `core:role-research`; skill body via personas | ✓ mapped |
| enforcement finding + approval gate (단속) | `c-enforcement-finding` concept + skill `ins-file-finding` + `hasChannel chan-agent-user` + `gr-no-arbitrary-decision` | ✓ mapped (see Note-2) |
| traceability | `hasGuardrail core:gr-traceability` + `requiresCapability cap-traceability` (provided by gr-traceability) + `gr-report-over-prompt`, `gr-verify-proceed` | ✓ mapped |

Also present: Domain (`dom-governance`), Task (`task-compliance-audit`), 2 TestScenarios (normal +
evidence-unavailable), same FailurePolicies + lineage. **No missing harness-structural element → no GAP.**

### HarnessShape minimum (both harnesses)
1 SystemPrompt (3: team persona + 2 role personas) + ≥1 Workflow (`wf-multiagent`) + tools (3) + guardrails
(5 / 7) + ModelConfig (`mc-opus`). Full profile, not reduced. All text nodes (SystemPrompt/Instruction/
TestScenario) carry `ho:tokenEstimate` (lint §1c = 0 violations confirms).

### Discoverability (retrieve, central)
- Query "continually benchmark our project against external best practice and raise improvement claims" →
  **Benchmarker agent rel 10.8** (top), Comparative benchmarking cap 8.1, Oversight 5.67; wired to Workspace-synthesis harness.
- Query "audit whether agents operate within their charter and enforce compliance standards" →
  **Auditor agent rel 12.15** (top), Compliance audit cap 7.75, Oversight 6.38; tagged Traceability.
- Recipe harnesses are discoverable in their own closure (retrieve projects from central only; recipe-side
  discoverability is the local concept sub-tree rooted on `c-oversight`, confirmed 0-orphan reachable).

---

## Notes (non-blocking accepted-reasons — no GAP, no TBox trigger)

- **Note-1 (continuity axis).** "지속(continuous)" is carried by `mode-agent-teams` (persistent standing team
  "for the span of the run") + promptText/definition "continually surveys/audits". There is no dedicated
  structural vocabulary for a recurring/scheduled cadence, and **inventing an `ExecutionCadence`-style class
  would itself be drift**. Persistence-as-standing-team is the ontology's chosen representation of continuity;
  finer cadence is a runtime concern out of the harness structural model. **Accepted — mode-agent-teams is
  sufficient; not a GAP.**
- **Note-2 (enforce/단속 axis).** The request word "단속(enforce)" is modeled as *raise an enforcement finding
  to the human approval gate* (`c-enforcement-finding` + `chan-agent-user` + `gr-no-arbitrary-decision`), NOT
  autonomous remedy application. This is the repo's own governance doctrine (raise-don't-decide; user is the
  sole approval authority) and is **explicitly documented** in both recipe headers ("never decides on or
  applies the remedy itself"). Autonomous enforcement is a deliberate, accepted out-of-model boundary, not a
  silent skip. **Accepted — enforcement=finding+approval-gate is the intended representation.**

## Routing
No defect to route. If the two central archetypes accrue recipe recurrence, a later maturity review (draft→
reviewed) is the natural follow-up — out of scope here. Verdict recorded for orchestrator; git is inspection's.
