# Mass-import Wave C (content): 02-podcast-studio / 07-comic-creator / 09-documentary-research / 14-translation-localization

Filled importer judgment FLAGS on 4 harness-100 content recipes. Reusable calls.

## ★ QA-gate collapse: the discriminator is "does the QA role do OWN substantive work?"
Beyond the Wave-A pure-gate-vs-test-worker rule, the finer test that decided all 4:
- **PURE coherence gate** (cross-checks deliverables for consistency, produces no
  pipeline deliverable, runs nothing) → COLLAPSE to core:role-synthesizer. 02
  production-reviewer & 07 quality-reviewer = pure gates → collapsed (persona+role
  dropped, core:role-synthesizer added to hasRole; it provides cap-synthesis).
- **HYBRID verification/scoring worker** (does its OWN substantive method) → KEEP
  LOCAL + ho:providesCapability core:cap-synthesis. 09 fact-checker independently
  web-VERIFIES claims/sources (tool-websearch) AND cross-checks; 14 quality-reviewer
  computes MQM error-classification + severity weights + scores via a dedicated skill.
  Collapsing would erase that scope → keep local (mirrors 17 qa-engineer / 32 reporter).
Signal: importer's flag regex is synthesizer|reviewer|qa|quality — 09 fact-checker
did NOT match (no QA-GATE flag emitted), a hint that the terminal gate isn't a plain
"reviewer". Read the DAG, not the flag.

## Least-privilege (content = editor-only unless a role genuinely searches/runs)
All 4 put execution out of scope (audio/image editing, video, CAT/DTP tools) →
editor-only, NO shell/cap-codeexec. tool-websearch bound PER-ROLE only where the
source agent file shows web search: 02 researcher; 09 researcher+fact-checker; 14
translator+localizer+terminology-manager. 07 has NO web search (pure generative) →
tool-editor only, requiresCapability = {fileedit, orchestration, synthesis} (no websearch).
Verify with `grep -ril 'web search' <corpus>/.claude/`, not the job title.

## Domain/Task calls
- 02 → LOCAL dom-podcast-production + task-podcast-episode. 07 → LOCAL
  dom-comic-production + task-comic-creation. 14 → LOCAL dom-localization +
  task-translation. 09 → **REUSE core:dom-research** (it genuinely IS research
  work) + LOCAL task-documentary (core:task-litreview is narrower = a survey, not a
  multi-artifact documentary build). All top concepts topConceptOf core:scheme,
  subconcepts skos:broader them (newsletter pattern). 09 adds gr-cite+gr-grounding
  (research/factcheck harness); 02 adds gr-grounding (researcher grounds in real data).

## FailurePolicy: reuse central where legible, author local for genuine domain rows
- "Web search failure → work from general knowledge, note data limitation" IS the
  central **fp-source-unavailable** archetype (importer regex misses this wording) →
  REUSE by IRI on 02 & 09, NO local dup (repeat of the Wave-B rescue lesson).
- Authored id:fp-* for genuinely domain-specific rows: 02{guest-info-unavailable}
  07{image-generation-failure, character-inconsistency, content-rejected}
  09{single-perspective, sensitive-topic}. Each has ≥1 failureCondition + ≥1
  recoveryStrategy + prefLabel + tokenEstimate.

## ★ 14 = MANGLED source (Wave-C exception; 28-discipline + a new asymmetry rule)
Broken find-replace damaged several personas/role-defs/skill-defs, ALL test-scenario
content, and 3 of 5 error-table rows. Handling:
- Structure SOUND (5 roles, 3 skills, standard form) → import + bind judgment edges
  normally; keep degraded PROSE VERBATIM at draft + a SOURCE-QUALITY NOTE header
  (rewriting = fabrication; re-import after upstream repair).
- ★ **The keep/drop line for a mangled source = IRI-reuse vs local-authored.** Central
  fp archetypes whose Error-Type CELL survived intact ("Agent failure"→fp-agent-
  failure-retry, "RED found in review"→fp-review-critical-rework) are bound BY IRI —
  reuse injects NO garbage into the build. Degraded LOCAL scenarios and the 3 garbage
  error rows WOULD inject garbage text into materialize → LEFT UNBOUND + accepted-
  reason (do NOT author from garbage; do NOT author-then-not-bind = orphan). So 14
  harness has hasFailurePolicy (2 central) but NO hasTestScenario (HarnessShape allows
  it; 28 precedent). Local domain/task/concept text I author FRESH is clean (not
  source prose) — fine to add on a mangled harness.

## Universal enrichment (all 4)
guardrails = {gr-lang, gr-structured-output, gr-least-privilege, gr-report-over-prompt,
gr-graceful-fallback, gr-scale-modes} (+gr-grounding on 02/09/14, +gr-cite on 09).
pattern = {pat-orchestrator-workers, pat-peer-mesh, pat-pipeline} (explicit staged
pipelines). channel = {chan-workspace, chan-peer, chan-agent-user}. model = mc-opus.
augmentsRole left unbound on all (extending skills have no `## Target Agent(s)`;
targeting preserved in skos:definition — Wave-B accepted coverage). roleMemoryPolicy
synthesized per role (source ships none — newsletter precedent).

## GAP (next waves / central promotion candidates)
- **No central image-generation tool/capability** (07 image-generator produces AI
  image prompts/specs) — flagged, bound editor-only. Candidate schema/vocab if it recurs.
- Recurring content domains/tasks are recipe-local: dom-podcast-production,
  dom-comic-production, dom-localization + their tasks (+ content concept subtree).
  Promote to central only if the batch recurs.
- Waves D-G pending (business/education/legal/life-ops); watch 27/29/30 also mangled.

## Gate results (all green)
per-recipe closure PASS ×4 (HARNESS_ROOT_ONTOLOGY = recipe IRI). catalog 14→18,
--check in-sync. materialize ×4 (12/12/12/11 files) 2-run diff=0. grep /home/cpark = 0
in TTL AND builds. Central validate PASS @223 unchanged; all 7 central harnesses
byte-identical WITH vs WITHOUT recipe catalog. Prior recipe 32 still PASS. Recipe
slugs (h-podcast-studio/-comic-creator/-documentary-research/-translation-localization)
don't collide with the 7 central slugs.
