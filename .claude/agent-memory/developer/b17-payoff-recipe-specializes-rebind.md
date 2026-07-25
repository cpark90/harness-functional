# B17 payoff — recipe-local Role/FailurePolicy → central archetype via `ho:specializes`

The federation-ripple follow-up B17/D1 deferred: recipe-local instances (~150 local roles,
~50 local fps across 38 recipe TTL in `staging/harness-recipes/recipes/`) had NO graph link to
the central neutral archetypes, so the archetype↔instance hierarchy lived only in prose/labels.
B17 opened `ho:specializes` to component level → now linkable. This wave added the edges.

## Result: 82 edges, additive only (75 role→archetype, 7 fp→fp-refer-to-expert), 35 files
- Central 7 neutral role archetypes = `core:role-{analyst,author,implementer,planner,strategist,
  tester,coordinator}` (in `abox/core/organization/roles.ttl`). `core:fp-refer-to-expert` in
  `abox/core/verification/verification.ttl`.
- Mapping rule (deliverable-based, NOT label-based): analyst=diagnose EXISTING material against
  criteria (reviewer/inspector/scanner/assessor/*-analyst/fact-checker/risk-assessor); author=prose
  DOCUMENT is the deliverable (writer/copywriter/drafter/narrator/scriptwriter/opinion-writer,
  incl. recipe/exercise-guide/consent "document author"); implementer=build code/config/dataset/
  tuned-setup (*-dev/*-engineer(build)/sdk-developer/type-generator/cleaner/preprocessor/data-engineer/
  training-manager(tuning)); tester=produce test cases/fixtures/acceptance criteria (mock-tester/
  test-engineer/acceptance-builder); planner=plan/schedule/roadmap IS the deliverable (sprint-planner/
  renewal-scheduler); strategist=frame decision, options+recommend (strategist/advisor/consultant/
  pricing-strategist/license-strategist).
- **coordinator = ZERO clean matches** across 38 recipes: shopping/offer/store "-coordinator/-manager"
  all PRODUCE artifacts (list/offer/metadata) so they violate coordinator's "coordination-only peer,
  performs NO execution" — did NOT force-link. Same for image-generator (media, not code), *-designer/
  *-architect (design has no archetype among the 7 — role-design is central-concrete, out of scope).

## The disciplined SKIPs (anti-drift; brief "애매하면 링크 안 함")
- **research/gather roles** (researcher/curator/case-searcher/market-researcher/data-collector/
  alternative-researcher): NO archetype — `core:role-research` is this-repo's CONCRETE agent, not one
  of the 7 neutral archetypes. Do not link to it.
- **terminal synthesis/QA-gate roles** (editor-in-chief/qa-engineer(hybrid)/reporter/rapporteur/
  executive-summarizer/submission-verifier/offer-coordinator/adr-author/process-architect/proposal-
  reviewer/strategy-updater/media-monitor(hybrid)): these are synthesizer-like (many bind
  `core:role-synthesizer` or `cap-synthesis`); synthesizer is NOT in the 7 → skip. Cross-check
  wave memories for which recipe role holds cap-synthesis before mapping a "-writer/report" role to
  author (32-reporter=gate SKIP but 82/96-report-writer=producer→author).
- two-archetype tension (tradeoff-evaluator analyst-vs-strategist; business-modeler; judge vs vnv;
  quiz-master) → skip. lpranging role-{developer,vnv,inspection} mirror concrete central roles → skip.

## fp-refer-to-expert (7): 69/70/72(regulation-ambiguous), 75(complex-tax), 87(legal-judgment),
95(legal-review), 96(tax-legal) — all "beyond agent competence/authority → bounded analysis + refer
to qualified expert/authority" (defs literally say "situation exceeds scope -> degrade + refer to a
professional archetype"). These are exactly D1's promotion sources.

## Mechanics / invariants (all verified)
- **Insert anchor = the prefLabel line, NOT the terminating `.`**: definition string literals contain
  periods ("...decision-making.") so `.`-anchored block regex is UNSAFE. Regex
  `(id:{id} a ho:(Role|FailurePolicy) ; skos:prefLabel "[^"]*" ;)` → append `\n    ho:specializes
  core:{target} ;`. Assert exactly 1 sub per id (id unique within its file). Recipe role/fp lines put
  type+prefLabel on one line, definition on next — no altLabel between (lpranging is the exception, skipped).
- **same-partition (SpecializesTypingShape)**: Role⊑…⊑HarnessComponent, FailurePolicy⊑HarnessComponent;
  both subject and target land in the HarnessComponent partition → shape's 2nd sh:or branch passes.
  Role→Role, FP→FP only. All 35 recipe closures PASS, 0 violations.
- **materialize byte-identity**: `grep -c specializes tools/materialize.py` = 0 → not emitted. Proof:
  build recipe WITH edges vs a `grep -v "ho:specializes core:"` stripped copy (swap file, build, restore)
  → `diff -r` (exclude lock) = 0. CLAUDE.md/agents/skills unchanged. Central 7 + federate counts unchanged
  (0 new nodes, edges only). `gen_recipe_catalog.py --check` stays in-sync (catalog is nodes/URIs, not edges).
- staging/harness-recipes has NO .git (gitignored from main repo; git = inspection). Edits scoped to
  35 recipe ttl; central `ontology/**` untouched.

## GAP (report to orchestrator, not fixed here)
- 3 fp defs (69/70/72) still say "no central archetype covers ..." — written pre-D1, now STALE since
  they specialize `fp-refer-to-expert`. NOT edited: fp definition/failureCondition ARE emitted in the
  error-handling table → editing breaks byte-identity. Definition-text refresh is a separate,
  materialize-affecting change (orchestrator decision).
- Conservative skips leave many local roles unlinked (design/research/synthesis-gate have no archetype
  among the 7). If "fuller subdivision" is wanted, candidates = new neutral archetypes for
  design/curation/gather — but that is TBox/central-abox growth (schema decision), not recipe edits.
