# B24 verdict (FINAL) — role-curator archetype + research/design/synthesis/curation axis linking

**Judge**: vnv (independent re-execution; developer self-report NOT trusted).
**Interpreter**: `/usr/bin/python3` (has rdflib/pyshacl/owlrl). **State**: both repos pre-commit
(git not run). Central (`harness_ontology`) + recipe (`harness-recipes`) both in working tree.

## Overall verdict: **PASS — B24 complete across both repos, both commit-ready.**

Two dispatch rounds, both independently re-verified:
- **Central** (role-curator archetype + carrier `hasRole`): PASS on every gate (unchanged
  from first round).
- **Recipe axis-linking** (36 `ho:specializes` edges): first round I judged this **phantom /
  not landed** — it was genuinely absent. It is **now authored** in the recipe working tree
  and re-verified here: 25 recipe closures PASS, SpecializesTypingShape 0 violations,
  specializes not emitted, curator edges resolve to the new central node.

---

# Part A — Central role-curator (PASS, carried from first round, re-confirmed)

| Gate | Result |
|---|---|
| `validate.py` | PASS, **238** individuals reachable (237 + role-curator, +1 only) |
| `check_determinism.py` | PASS (byte-identical packs across processes) |
| `retrieve.py "a role that curates and organises existing material"` | **Curator agent rel 4.05**, top Role hit, exposed on carrier `hasRole` |
| anti-drift adjudication | PASS — see below |

**Anti-drift (core judgment)**: the 3-reuse/1-new re-adjudication is correct
(research→`role-research`, design→`role-design`, synthesis→`role-synthesizer` already exist as
neutral archetypes; only curation lacked a covering archetype). `role-curator`'s
`skos:definition` carries an explicit behavioural discriminator vs research (GATHERS new /
grounds in source), author (composes PROSE), analyst (DIAGNOSES what's wrong, by severity) —
not near-synonym drift. Class-uniform with the 6 sibling archetypes (same predicate set/order;
roleTool=tool-editor; roleGuardrail ×4 = the role-analyst set). **No `ho:tokenEstimate` is
correct** — ONTOLOGYSTYLE §1c scopes it to promptText-carrying nodes + Tool/Workflow; `ho:Role`
carries `skos:definition`, so it is out of §1c scope (role-tester's lone `salience 0.25` is its
own documented exception). `role-curator` is referenced centrally only by `id:h-workspace-
synthesis` `hasRole` (harnesses.ttl:192), so the other 6 central harnesses' source is unchanged
→ their projection is byte-identical (excl lock individualCount 237→238).

---

# Part B — Recipe axis-linking (RE-VERIFIED, now landed)

**Diff shape** (`harness-recipes` working tree, `git diff | grep '^+.*ho:specializes'`): exactly
**36 added edges** across **25 recipe TTLs**, target histogram:
```
  16 core:role-design      11 core:role-synthesizer      7 core:role-research      2 core:role-curator
```
Matches the claimed distribution (16/11/7/2). These four axes were 0/0/0/0 in the first round —
now present.

## B.1 — 25 closure validations: all PASS, SpecializesTypingShape 0 violations
Method (developer's, re-run independently): temp `central/` symlink → `harness_ontology`
abspath; `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/
recipes/<name> central/tools/validate.py`; symlink removed after. Each closure = central 238 +
recipe-local. **All 25 PASS, `conforms=1` each** (SHACL conformance includes SpecializesTyping-
Shape, whose subjects — the specializes edges — are present in every closure, so a violation
would fail it):

| recipe | reach | recipe | reach | recipe | reach |
|---|---|---|---|---|---|
| 02-podcast-studio | 262 | 32-data-analysis | 266 | 74-fitness-program | 263 |
| 03-newsletter-engine | 261 | 33-text-processor | 267 | 81-technical-writer | 263 |
| 07-comic-creator | 264 | 51-investor-report | 263 | 82-report-generator | 264 |
| 09-documentary-research | 264 | 55-rfp-responder | 261 | 90-hiring-pipeline | 263 |
| 14-translation-localization | 259 | 56-language-tutor | 267 | 95-procurement-docs | 266 |
| 16-fullstack-webapp | 260 | 60-debate-simulator | 265 | 96-real-estate-analyst | 265 |
| 17-mobile-app-builder | 262 | 62-adr-writer | 262 | 70-legal-research | 260 |
| 18-api-designer | 259 | 69-privacy-engineer | 261 | 72-regulatory-filing | 262 |
| 31-ml-experiment | 264 | | | | |

**25/25 recipe closures PASS, 0 FAIL** (a 26th "central" line in the loop is the central closure
itself, 238, incidental to how the loop picked up the symlink dir name).

*Note on the shape's reach*: `ho:SpecializesTypingShape` (harness-shapes.ttl:118) enforces the
**coarse Harness-vs-HarnessComponent partition**, not Role→Role specifically (its own comment,
l.116-117). So "Role→Role" is a **convention**, satisfied here in fact — all 36 targets are
`core:role-*` (Roles) and all 36 subjects are recipe-local `ho:Role`s (both curator subjects
verified below; the rest pass the shape's HarnessComponent branch, which conformance proves).

## B.2 — Byte-identity strip-test: specializes NOT emitted
- `grep -c specializes tools/materialize.py` = **0** (materializer has no code path reading it).
- **Strip-test** (recipe 03, now carrying 3 specializes edges): materialize `h-newsletter-engine`
  as-is vs from a `grep -v ho:specializes` copy of the TTL → `diff -r` of the two output trees =
  **BYTE-IDENTICAL**. TTL restored (git diff --stat back to the intended +2 rows). Specializes is
  provenance-only in the graph; it changes retrieval/validation reachability but not the
  materialized build.

## B.3 — Curator edges resolve to the new central node (ho:Role + HarnessComponent)
Reasoned closure query (rdflib, `load_graph(reason=True)`) in both closures:
- `core:role-curator` (`.../id/core/role-curator`) → typed **ho:Role: True, ho:HarnessComponent:
  True** (via `ho:Role ⊑ ho:OrganizationComponent ⊑ ho:HarnessComponent`) — a real typed node,
  not a dangling/untyped ref.
- 03: `id:role-curator` ("Curator role", ho:Role) `ho:specializes` `core:role-curator` — Role→Role.
- 14: `id:role-terminology-manager` (ho:Role) `ho:specializes` `core:role-curator` — Role→Role.
Both are HarnessComponent→HarnessComponent (same partition), satisfying SpecializesTypingShape.

---

## Commit-readiness (per repo — git is inspection's job, not vnv's)
- **`harness_ontology` (central)**: role-curator def (`roles.ttl`) + one `hasRole` row
  (`harnesses.ttl`). `validate.py` PASS 238, determinism PASS. **Commit-ready.** (The modified/
  untracked `.claude/agent-memory/developer/*` are role memory, not ontology — orthogonal.)
- **`harness-recipes` (recipe)**: 36 `ho:specializes` edges across 25 TTLs. All 25 closures PASS,
  SpecializesTypingShape 0 violations, materialization byte-identical (specializes not emitted).
  **Commit-ready.**
- Ordering note: recipe closures resolve `core:role-curator` from the central working tree via
  the symlink. In real CI the recipe repo pins a `central/` checkout — so the **central commit
  (adding role-curator) must land before or with** the recipe commit, or the 2 curator edges
  (03, 14) would dangle. The other 34 edges (research/design/synthesizer) target pre-existing
  central roles and do not depend on the central commit.

## GAP adjudication (unchanged) — carrier definition prose omits "curator"
`id:h-workspace-synthesis` `skos:definition` still lists "(analyst, author, implementer, planner,
strategist, tester)" — 7 archetypes now exist but the emitted prose names 6. Left unedited
because `skos:definition` is emitted (editing changes bytes beyond the +role row). **Verdict:
ACCEPTABLE, non-blocking, deferred** — the parenthetical is illustrative, not a closed
enumeration, and does not affect validate/retrieve/materialize behaviour. But it is a genuine
graph→prose reflection lag, so per CLAUDE.md step-7 coverage-audit it **should be reflected in a
tracked follow-up** (a one-word prose add), not dropped silently.

---

## Summary
| Axis | Verdict |
|---|---|
| Central validate (238) / determinism / retrieve discoverability | PASS |
| Central anti-drift (distinct, uniform, §1c tokenEstimate) | PASS |
| Recipe: 36 edges present, distribution 16/11/7/2, 25 files | CONFIRMED |
| Recipe: 25 closures validate + SpecializesTypingShape 0 viol | PASS |
| Recipe: strip-test byte-identical (specializes not emitted) | PASS |
| Recipe: curator edges resolve to core:role-curator (Role/HarnessComponent) | PASS |
| GAP: carrier definition prose omits curator | ACCEPTABLE deferred; recommend follow-up reflect |
| **B24 overall** | **PASS — complete, both repos commit-ready** |
