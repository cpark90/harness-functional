# Mass-import Wave F (legal): 69-privacy-engineer / 70-legal-research / 72-regulatory-filing

Filled importer judgment FLAGS on 3 harness-100 legal recipes. Reusable calls.

## ★ 70-legal-research REUSES central core:dom-research (+ LOCAL task)
Legal research IS genuine research work (search + analyse + synthesise legal
sources with citations) -> REUSE core:dom-research, exactly like sibling
09-documentary-research (Wave C). But the task (opinion + litigation strategy)
is not a generic literature review -> recipe-local id:task-legal-research. Local
concepts root `skos:topConceptOf core:scheme` (09 pattern for reused-central-
domain-but-local-task; contrast 62 which rooted under core:c-softeng because a
matching central concept existed). 69/72 are legal-category but NOT research
(privacy engineering / permit filing) -> recipe-local id:dom-* + id:task-* (D1),
concepts topConceptOf core:scheme. So: not every "legal" recipe needs a local
domain -- test whether the top-level verb is genuine research.

## ★ QA-gate: 72 keeps a HYBRID gate + cap-synthesis; 69/70 do NOT bind it
Discriminator (Wave B/D/E): does the terminal role produce a real DELIVERABLE
beyond a verdict, and is its WHOLE job integration/verification?
- 72 submission-verifier = HYBRID terminal gate: cross-validates every document
  AND authors the submission checklist -- a genuine user deliverable (submission
  order, reception guide, correction-prep guide, post-approval procedures), NOT a
  pass/fail verdict. Its whole job is verify+integrate all outputs (receives from
  ALL members) + drives a bounded rework loop. -> KEEP LOCAL (collapse to neutral
  core:role-synthesizer would erase permit-domain content, cf. Wave A 17 qa) +
  ho:providesCapability core:cap-synthesis (harness requiresCapability
  cap-synthesis) + gr-cross-validation roleGuardrail. Mirrors 55 win-theme / 32-33
  reporter, NOT the 43/48/51 pure-verdict collapse.
- 69 process-architect / 70 strategy-advisor = PRODUCING terminal authors (process
  design / strategy report = their own domain deliverable) that ALSO cross-verify
  consistency; the ORCHESTRATOR does Phase-3 integration. -> NO cap-synthesis, no
  collapse (adr-author/62 rule: don't bind cap-synthesis just because a role
  synthesizes upstream into a document). gr-cross-validation roleGuardrail on the
  cross-verifying role only (an EXPLICIT single-role cross-validate assignment, not
  generic peer-mesh -- so it earns the guardrail, cf. 62; a refinement edge, not
  added to harness hasGuardrail).

## ★ augmentsRole lives in the ORCHESTRATOR skill's "(Per-Agent|Agent-Specific)
Extended Skills" table -- importer misses it (only parses an extending skill's own
`## Target Agent(s)` heading, which these lack) -> AUGMENT-MISSING flag. The table
maps agent<->skill unambiguously (and each skill's frontmatter description names
its agents in quotes: "The 'x' and 'y' agents must use..."). BIND augmentsRole to
the LOCAL roles. All targets survived local this wave (no collapse) -> bind cleanly.
69: data-flow-mapper->pia-assessor/process-architect; gdpr-pipa->privacy-law-
analyst/consent-designer. 70: case-analysis-framework->case-searcher/legal-analyst;
legal-writing->opinion-writer/strategy-advisor. 72: permit-requirements-db->
requirements-investigator/submission-verifier; form-filling->document-drafter/
attachment-preparer.

## ★ DEGRADED skill defs: whole skill.md wrapped in an outer ```markdown fence
Several sources wrap the ENTIRE skill.md in a ```markdown fence (line 1 = ```
markdown), so the importer's frontmatter parser (expects `---` at line 1) fails and
falls back to skos:definition = the notation. Content is INTACT, just unparsed ->
restore skos:definition from the real frontmatter `description` (faithful, not
fabrication). Fenced this wave: 69 gdpr-pipa; 70 all 3; 72 regulatory-filing +
form-filling-guide (permit-requirements-db was unfenced, parsed clean). Personas
(agent body H1 paragraph) parsed fine even when the agent file was fenced (72
submission-verifier), because the H1 scan tolerates the outer fence. Also enrich
each role skos:definition (importer defaults it to the agent filename) from the
agent frontmatter description -- the 62 pattern.

## Compliance principles are DOMAIN CONTENT -> recipe-local, never central guardrail
GDPR/PIPA obligations, permit legality requirements etc. are captured as recipe-
local Concepts + role definitions; harness guardrails stay the neutral base-6
{gr-lang, structured-output, least-privilege, report-over-prompt, graceful-
fallback, scale-modes}. No new central gr-* (inventory §2C-G8). Uncertainty is
handled by graceful-fallback + fp-* (no gr-grounding/cite).

## FailurePolicy: "Web search failure" -> core:fp-source-unavailable (recurring)
Importer FLAGS "Web search failure" as LOCAL every time; it is the Wave B-E rescue
= core:fp-source-unavailable (unreachable external source, substitute+label).
Central reuse also: insufficient-input, agent-failure-retry, conflict-contradiction
(69 PIA/legal inconsistency, 70 logical inconsistency), review-critical-rework (72
🔴). LOCAL id:fp-* only for domain-specific recovery: 69 gdpr-applicability-
uncertain, 70 legal-uncertainty, 72 regulation-ambiguous -- all three are the SAME
shape ("law/regulation unclear -> present interpretations + recommend
counsel/authority consultation"). GAP: a central fp-regulatory-ambiguity archetype
would absorb all 3 legal recipes' local fp -- propose to orchestrator if legal
recurs (schema/vocab decision, not developer).

## Least-privilege + universal enrichment
All doc-producing (grep `^```[a-z]` = markdown only) -> core:tool-editor, no shell/
codeexec. Web search per-role (grep 'web search' agents/): 69 privacy-law-analyst,
70 case-searcher, 72 requirements-investigator -> per-role tool-websearch + harness
usesTool {editor,websearch} + requiresCapability cap-websearch. worker roleGuardrail
= {least-privilege, structured-output, graceful-fallback, lang} (+cross-validation
on the verifier/cross-checker). pattern = {pat-orchestrator-workers, pat-peer-mesh,
pat-pipeline} (69/72 have 3a/3b|2a/2b parallel; 70 linear -- still pipeline+peer via
SendMessage). channel = {chan-workspace, chan-peer, chan-agent-user}. model=mc-opus.
tagged = 5 local concepts + core:c-multiagent + core:c-scale-modes. Concept/Domain/
Task get NO tokenEstimate; Role/FailurePolicy/TestScenario/SystemPrompt/Instruction
DO. "Partial Flow" scenario (69/70) names no closed scenarioKind -> left UNBOUND
(not fabricated), like importer SCENARIO-UNMAPPED.

## Gotcha: materialize CLI takes the BARE harness name, not `id:h-*`
`tools/materialize.py h-privacy-engineer` (prefixing `id:` -> "no harness matches"
even though it lists it under Known harnesses). Validate.py uses HARNESS_ROOT_
ONTOLOGY = recipe IRI; materialize uses HARNESS_CATALOG + bare name.

## Gate results (all green)
per-recipe closure PASS x3 (HARNESS_ROOT_ONTOLOGY = recipe IRI). catalog 25->28,
--check in-sync. materialize x3 (3/3/3 skills, 4/4/4 local agents -- 72 submission-
verifier kept local, NOT collapsed to synthesizer.md) 2-run diff=0. grep /home/cpark
= 0 in TTL AND builds. Central validate PASS @223 unchanged; all 7 central harnesses
byte-identical WITH vs WITHOUT recipe catalog. Priors 62/09 still PASS. Recipe slugs
(h-privacy-engineer/-legal-research/-regulatory-filing) don't collide with central 7.

## GAP (central promotion candidates)
Recipe-local domains now span business (5, Wave D) + education (2, Wave E) + legal
(2 new: privacy-engineering, regulatory-filing; legal-research REUSED dom-research).
+ central fp-regulatory-ambiguity candidate (3 legal recipes each authored a near-
identical local fp for "law/regulation unclear -> options + consult authority").
Both are schema/vocab decisions for orchestrator, not developer. No new central
vocab needed this wave (all tool/cap/guardrail/pattern/channel/fp-central reused by
IRI).
