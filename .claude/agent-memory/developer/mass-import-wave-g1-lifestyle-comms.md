# Mass-import Wave G1 (life/comms): 73-meal-planner / 74-fitness-program / 75-tax-calculator / 81-technical-writer / 82-report-generator

Filled importer judgment FLAGS on 5 harness-100 recipes. Reusable calls.

## ★ 75-tax-calculator is EDITOR-ONLY (execution OUT of scope) despite "calculator"
The brief flagged 75 as a maybe-shell case (32/33 precedent). It is NOT: there is
NO code-exec tool. The tax-engine applies the rate tables/formulas the skills
provide BY HAND ("calculate accurately to the won", "document every step") and
writes a markdown statement; no skill has a tools: frontmatter, no scenario runs
code. Deliverable = DOCUMENTS -> core:tool-editor only. Discriminator vs 32/33:
32/33 RENDER charts / run dask/chardet (real execution). "calculator"/"engine" in
a skill NAME != code execution -- grep the skill/agent for python/subprocess/render;
here 0. So all 5 of G1 are editor-only. Wave-D 43 (calculator skill=document) held.

## ★ 81 AND 82 are MANGLED (find-replace corruption) -- NOT flagged in the brief
Brief only named 28 mangled. 81-technical-writer + 82-report-generator are the same
class (word-salad: "peopletax", "qualityas", "degreeKRW", "wheneach"). Handle per the
28-security-audit precedent: import the STRUCTURALLY sound parts, keep the DEGRADED
promptText / skos:definition VERBATIM at maturity draft + a ★SOURCE-QUALITY NOTE
header (rewriting degraded prose = fabrication). Only author the assembly nodes you
own -- Concepts / Domain / Task / local FailurePolicy / the Harness skos:definition --
in clean English. The importer parses FEWER scenarios on mangled sources (the
normal-flow heading was too degraded to map -> 2/3 bound each, not fabricated).
73/74/75 are clean (well-translated).

## ★ QA-gate: 81 COLLAPSE (pure gate), 82 KEEP-LOCAL (hybrid), 73/74/75 none
- 81 tech-reviewer = PURE verification gate: cross-validates accuracy/completeness/
  consistency across all deliverables, emits only 🔴/🟡/🟢 feedback, NO pipeline
  deliverable of its own -> drop local persona+role, REUSE core:role-synthesizer
  (bound via hasRole, provides cap-synthesis; harness requiresCapability cap-synthesis).
  The 43-startup-launcher/18 pattern. Mangling does NOT block this (QA identity clear
  from clean role name). Terminal version-controller PRODUCES version/changelog -> local.
- 82 executive-summarizer = HYBRID: WRITES the management summary (real deliverable)
  AND cross-verifies -> KEEP LOCAL + providesCapability cap-synthesis + gr-cross-validation
  roleGuardrail (72 submission-verifier / 32-33 reporter pattern), NOT collapsed.
- 73 shopping-coordinator / 74 template-builder / 75 strategy-advisor = terminal
  PRODUCERS, not gates -> NO cap-synthesis; requiresCapability = {cap-fileedit,
  cap-orchestration} only (orchestrator does integration via cap-orchestration).

## Domain/Task: all 5 recipe-local (central set = coding/design/research/support only)
dom-meal-planning / -fitness-programming / -tax-calculation / -technical-writing /
-report-generation, each + a local task, concepts topConceptOf core:scheme. 81 is
technical documentation but authors its OWN local dom-technical-writing -- a recipe
CANNOT reuse the techdoc pilot's recipe-local dom-techdoc IRI (local IRIs don't cross
recipes). D1 (category domains stay recipe-local, no central pollution).

## FailurePolicy mapping
central reuse: insufficient-input, agent-failure-retry (all 5); review-critical-rework
(81/82 "🔴 findings -> rework, max 2"); source-unavailable (82 "web search failure",
regex-miss judgment reuse); conflict-contradiction (74 "program inconsistency" auto;
75 "calculated figure MISMATCH -> re-validate max 2" = judgment reuse, regex misses
"mismatch", NO local dup). LOCAL id:fp-* only for true domain machinery: 73
{unsafe-target, restriction-infeasible, nutrient-target-unmet} 74 {injury-
contraindication, equipment-limited} 75 {complex-tax-structure=refer-to-professional,
the legal fp-regulation-ambiguous shape} 81 {doc-scope-unclear, example-unverifiable}
82 {report-audience-unclear=default PREP}. Note "quality-target-unmet -> rework max2"
(73 nutrient) is LOCAL (a quality threshold, not a contradiction); "figures disagree
across steps" (75) IS conflict-contradiction.

## Universal enrichment (same as Wave B-F)
All skill.md are ```markdown-fenced -> importer defaults defs to notation -> restore
skos:definition from frontmatter description (clean recipes) or keep degraded (mangled).
Role defs defaulting to filename -> restore from agent frontmatter (clean). augmentsRole
from the orchestrator's "Per-Agent Extended Skills" table -> bound to LOCAL roles
(importer only parses an extending skill's own `## Target Agent(s)` heading, absent
here). Only 82 data-collector uses web search -> per-role tool-websearch + harness
usesTool {editor,websearch} + cap-websearch (rest editor-only). guardrails = base-6
incl gr-scale-modes (all have a mode-by-scope table). worker roleGuardrail = {least-
privilege, structured-output, graceful-fallback, lang} (+cross-validation on 82
summarizer). pattern {orchestrator-workers, peer-mesh, pipeline}; channel {workspace,
peer, agent-user}; model mc-opus; tagged = locals + c-multiagent + c-scale-modes.

## Gotcha: materialize needs BOTH envs
`tools/materialize.py <bare h-name> --out X` requires HARNESS_CATALOG AND
HARNESS_ROOT_ONTOLOGY=<recipe IRI>; without the root env it loads only the central 7
and errors "no harness matches". (validate uses the same two.)

## Gate results (all green)
per-recipe closure PASS x5. catalog 28->33, --check in-sync. materialize x5 (files
10/10/10/12/11; 81 build = 4 local agents + synthesizer.md from the collapse; 82 = 5
local) 2-run diff=0, build /home/cpark=0. TTL /home/cpark=0. Central validate PASS
@223 unchanged; all 7 central harnesses byte-identical WITH vs WITHOUT recipe catalog.
Recipe slugs recipe-namespaced (id:.../73-.../h-*), no central-7 collision.

## GAP (central promotion candidates)
Recipe-local domains now span life-ops (meal/fitness/tax), techdoc (81 local; techdoc
pilot ALSO local -> 2 near-identical dom-technical-writing/dom-techdoc; a central
doc/writing domain would absorb both) and reporting (82). fp: 75 complex-tax-structure
+ Wave-F fp-regulation-ambiguous are the same "situation exceeds scope -> degrade +
refer to a professional/authority" archetype (now 4+ recipes) -- a central
fp-refer-to-expert would absorb them. Both schema/vocab decisions for orchestrator,
not developer. No new central vocab needed this wave.
