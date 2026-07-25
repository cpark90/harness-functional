# Mass-import Wave E (education): 56-language-tutor / 60-debate-simulator / 62-adr-writer

Filled importer judgment FLAGS on 3 harness-100 education recipes. Reusable calls.

## ★ 62-adr-writer REUSES central core:dom-coding + core:task-architecture
ADR = software-architecture decisions -> same domain/task pair sibling software
builds 16/17/18 already set (task-architecture = "Architecture design"). NO local
domain authored (no central pollution). Local Concepts still authored for
discoverability, but rooted `skos:broader core:c-softeng` (NOT topConceptOf --
that form is for NEW-domain recipes like 56/60). 56/60 are education -> central 4
domains (coding/research/support/design) unfit -> recipe-local id:dom-language-
learning / id:dom-debate (+ tasks), local Concept tree `skos:topConceptOf
core:scheme`.

## ★ QA-gate: cap-synthesis bound ONLY when a DEDICATED synthesis role exists
None of the 3 has a "*-reviewer" agent, so the discriminator is finer than
Wave-D's collapse test. Rule applied:
- 60 rapporteur = "debate synthesis expert" whose WHOLE job is integrating every
  upstream deliverable into one balanced comprehensive report -> a genuine
  dedicated synthesis role -> KEEP LOCAL + `ho:providesCapability core:cap-synthesis`
  (harness requiresCapability cap-synthesis). NOT collapsed to core:role-synthesizer
  (it carries domain expertise, augmented by logical-fallacy-detector).
- 56 review-coach / 62 adr-author = PRODUCING authors of a pipeline deliverable
  (review plan / the ADR itself); the orchestrator does final integration ->
  NO cap-synthesis, no collapse (absence-of-synthesis-role rule, like 51
  strategy-updater which stayed a local worker). Don't bind cap-synthesis just
  because a role "synthesizes upstream into a document" -- every report writer does.
- 60 judge PRODUCES the verdict (a domain deliverable) -> local, no cap-synthesis.

## ★ gr-cross-validation: 62 only, from an EXPLICIT deliverable cross-verify
62 skill says "adr-author <-> impact-tracker: cross-verify consistency between ADR
and impact assessment" + orchestrator validates consistency -> `core:gr-cross-
validation` as roleGuardrail on BOTH roles (central node, refinement edge, no
orphan, NOT added to harness hasGuardrail -- 32/55 pattern). 56/60 "cross-verify
each other's work" is generic SendMessage peer-check already modeled by chan-peer
+ pat-peer-mesh -> no gr-cross-validation (don't over-apply to every peer team).

## FailurePolicy: "Web search failure" + "No codebase available" -> fp-source-unavailable
Both are unreachable EXTERNAL sources (recovery = substitute + label "unverified"/
"inference-based") = textbook core:fp-source-unavailable; importer regex misses
both wordings -> bind by judgment (60: 1 row; 62: 2 rows -> 1 IRI, dedup). Central
reuse also: "Resolution/context unclear","Insufficient quantitative data" ->
insufficient-input; "Agent failure" -> agent-failure-retry. LOCAL id:fp-* only for
truly domain-specific rows: 56 pedagogy (assessment-refused/difficulty-mismatch/
language-unsupported = 3), 60 debate (balance-impossible = 1), 62 ADR-workflow
(decision-deferred = 1: "set status Proposed" is a domain state machine, NOT a
generic recovery). Local fp get prefLabel+failureCondition+recoveryStrategy+
tokenEstimate (~55); Concept/Domain/Task get NO tokenEstimate (48 exemplar).

## Least-privilege + web search (editor-only, per-role search)
All 3 = doc-producing: skill code fences are ```markdown only (grep `^```[a-z]`),
no tools: frontmatter -> core:tool-editor, NO shell/cap-codeexec. 62 codebase
"exploration" = Read/Grep/Glob (read-only, execution explicitly out of scope) ->
still editor-only, no extra tool. Web search per-role via precise grep
`web search|WebSearch` (broad 'search' false-hits "research"): 56 NONE (no search,
no cap-websearch); 60 topic-analyst only; 62 alternative-researcher only. Harness
usesTool gets tool-websearch + requiresCapability cap-websearch iff >=1 role searches.

## augmentsRole: **bold** targets (importer backtick parser misses) -> BIND to local roles
Same as Wave D. Extension-skill `## Target Agent(s)` names agents in **bold**:
56 cefr->level-assessor, spaced-repetition->review-coach; 60 argumentation-framework
->pro/con-debater, logical-fallacy-detector->judge/rapporteur; 62 quality-attribute-
analyzer->tradeoff-evaluator, madr->adr-author/impact-tracker. All targets survived
local (no collapse this wave) so all bind cleanly.

## Universal enrichment (base-6 guardrails, no grounding/cite)
guardrails harness = {gr-lang, gr-structured-output, gr-least-privilege, gr-report-
over-prompt, gr-graceful-fallback, gr-scale-modes} (all have a "Task-Scale/Execution
Modes" table). NO gr-grounding/gr-cite -- 60/62 use evidence but state no explicit
citation PRINCIPLE (matches "cited"/"evidence-based" are incidental mentions, grep
confirmed) -> uncertainty is handled by graceful-fallback + fp-source-unavailable,
not a guardrail. pattern = {pat-orchestrator-workers, pat-peer-mesh, pat-pipeline}
(staged DAG + parallel tasks: 60 has 2a/2b, 62 has 4a/4b). channel = {chan-workspace,
chan-peer, chan-agent-user}. model = mc-opus. tagged = local concepts + core:c-
multiagent + core:c-scale-modes (62 also core:c-softeng). roleMemoryPolicy synthesized
per role. worker roleGuardrail = {least-privilege, structured-output, graceful-
fallback, lang}. requiresCapability = cap-fileedit + cap-orchestration (+ cap-websearch
if search) (+ cap-synthesis if 60).

## Gate results (all green)
per-recipe closure PASS x3 (HARNESS_ROOT_ONTOLOGY = recipe IRI). catalog 22->25,
--check in-sync. materialize x3 (3/3/3 skills, 5/5/5 local agents -- rapporteur
kept local) 2-run diff=0. grep /home/cpark = 0. Central validate PASS @223
unchanged; h-multiagent byte-identical WITH vs WITHOUT recipe catalog. Recipe slugs
(h-language-tutor/-debate-simulator/-adr-writer) don't collide with central 7.

## GAP (central promotion candidates -- domains accumulating)
Recipe-local domains now span business (5: Wave D) + education (2 new: language-
learning, debate). 62 shows ADR fits central dom-coding cleanly -- so not every new
recipe needs a new domain. If education recurs (Wave F/G), a central education
umbrella domain may be worth proposing to orchestrator (schema/vocab decision, not
developer). No new central vocab needed this wave (all fp/tool/cap/guardrail/pattern
reused by IRI).
