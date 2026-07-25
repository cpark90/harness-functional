# Mass-import Wave D (business): 43-startup-launcher / 48-sales-enablement / 51-investor-report / 55-rfp-responder

Filled importer judgment FLAGS on 4 harness-100 business recipes. Reusable calls.

## ★ Business = editor-only even with "calculator" skills (deliverable test)
All 4 ship calculator skills (unit-economics, roi, financial-ratio, pricing) —
these are FORMULA/METHODOLOGY docs: code fences carry NO language tag (plain
``` with formula text / output-format templates), no `tools:` frontmatter, no
python to run. Deliverable = markdown (plan/proposal/report). So core:tool-editor
ONLY, NO shell/cap-codeexec. Mirrors 46-product-manager (same category, same
RICE/unit-economics methodology-skill shape). Verify per skill: `grep '```'`
lang tags + look for actual `python`/execute-the-code, not task-parallelism
("Tasks 1a/1b executed in parallel" is a DAG note, not code execution).

## ★ QA-gate: 3 collapse, 1 keep-local — discriminator = own DELIVERABLE
Wave-C rule applied: does the QA role produce a PIPELINE deliverable or just a
review VERDICT?
- 43 launch-reviewer / 48 sales-reviewer / 51 ir-reviewer = PURE coherence gates:
  cross-validate numerical/section consistency, emit 05_review_report.md (a
  verdict about the deliverables, NOT a product section) → COLLAPSE to
  core:role-synthesizer (drop local persona+role, add synthesizer to hasRole,
  remove reviewer persona from hasSystemPrompt, NOTE comment; it provides
  cap-synthesis). Mirrors 46 pm-reviewer.
- 55 proposal-reviewer = HYBRID producing gate: besides cross-validation + RTM
  coverage, it AUTHORS 05_differentiation_strategy.md (Win Theme = a proposal
  deliverable) via win-theme-builder → KEEP LOCAL + providesCapability
  core:cap-synthesis + roleGuardrail gets core:gr-cross-validation. Mirrors
  32 reporter / 09 fact-checker.
- 51 subtlety: strategy-updater "completes the final integrated report" (a
  producing integrator) BUT ir-reviewer is still the terminal PURE gate →
  collapse ir-reviewer (it provides cap-synthesis); strategy-updater stays a
  local worker (its integration recorded in skos:definition). Don't double-bind.

## gr-cross-validation on a kept-local gate: role-only, NOT harness hasGuardrail
core:gr-cross-validation is a CENTRAL node already wired to central harnesses,
so referencing it via roleGuardrail (a plain refinement edge, NOT a hasComponent
subproperty) does NOT orphan it and does NOT require adding it to this recipe's
harness hasGuardrail. Exactly what 32-data-analysis does (harness stays base-6).

## ★ augmentsRole: Wave D sources HAVE explicit `## Target Agents` → BIND it
Unlike Waves B/C (targeting in prose, left unbound as accepted coverage), all
Wave-D extending skills have a structured `## Target Agents` section naming real
agent files — but in **bold** (`**business-modeler**`) not backtick, so the
importer's backtick-token parser leaves augmentsRole EMPTY (AUGMENT-UNRESOLVED
flag). These resolve unambiguously → BIND ho:augmentsRole to the surviving LOCAL
roles (Instruction→Role, refinement edge, safe). Rule: skip targets that were
COLLAPSED reviewers (they're now the neutral core:role-synthesizer, not a domain
role — don't point a domain skill at the reused neutral role).

## Domain/Task: all recipe-local, none reuse 46's dom-product
Business subdomains are distinct: id:dom-startup-launch, dom-sales-enablement,
dom-investor-relations, dom-rfp-response (+ matching id:task-*). 46 = dom-product
(product management) does NOT fit any → no reuse, no central pollution. Each has
a local Concept subtree: top concept `skos:topConceptOf core:scheme`, subconcepts
`skos:broader` it (46/newsletter pattern).

## FailurePolicy: 100% central IRI reuse, ZERO local fp authored
Every source Error-Handling row mapped to a central archetype (importer regex
missed several — bound by developer judgment):
- "Idea too vague"/"Incomplete financial data"/"Insufficient customer|product
  info" → fp-insufficient-input.
- "No market data"/"Web search failure" → fp-source-unavailable (the recurring
  Wave-B/C rescue — importer regex misses this wording).
- "CRITICAL|RED|🔴 in review" → fp-review-critical-rework.
- "Numerical discrepancy → financial analyst is source of truth" (51) →
  fp-conflict-contradiction (two deliverables disagree, reviewing role resolves).
- "Agent failure" → fp-agent-failure-retry.
So 43=4 fp, 48=4, 51=5, 55=0. 55 MISSING both `## Error Handling` AND `## Test
Scenarios` → hasFailurePolicy + hasTestScenario left UNBOUND (accepted, not
fabricated). 43 also SCENARIO-MISSING (no test scenarios). 48/51 have scenarios.

## web search per-role (not per-harness)
tool-websearch bound ONLY on roles whose agent file shows web search: 43 none;
48 customer-analyst; 51 kpi-designer + market-analyst + strategy-updater
(financial-analyst works from supplied financials, no search); 55 requirement-
analyst. Harness usesTool gets tool-websearch + requiresCapability cap-websearch
whenever ≥1 role searches (43 has neither). Verify with
`grep -ril 'web search' <corpus>/.claude/agents/`.

## Universal enrichment (all 4, business = base-6 guardrails, no grounding/cite)
guardrails harness = {gr-lang, gr-structured-output, gr-least-privilege,
gr-report-over-prompt, gr-graceful-fallback, gr-scale-modes} (all have an
"Execution Modes by Request Scope/Scale" table). NO gr-grounding/gr-cite — none
of these CLAUDE.md/skills states an explicit grounding/citation principle
(matches 46). worker roleGuardrail = {least-privilege, structured-output,
graceful-fallback, lang}. pattern = {pat-orchestrator-workers, pat-peer-mesh,
pat-pipeline} (explicit staged phase DAGs; 48/51 have parallel-task DAGs).
channel = {chan-workspace, chan-peer, chan-agent-user} (SendMessage peer-mesh +
shared _workspace/). model = mc-opus. tagged = local concepts + core:c-multiagent
+ core:c-scale-modes. roleMemoryPolicy synthesized per role (source ships none).

## Gate results (all green)
per-recipe closure PASS ×4 (HARNESS_ROOT_ONTOLOGY = recipe IRI). catalog 18→22,
--check in-sync. materialize ×4 (3/3/4/3 skills) 2-run diff=0. grep /home/cpark
= 0 in TTL AND builds. Central validate PASS @223 unchanged; all 7 central
harnesses (h-coding/h-research/h-support/h-multiagent/h-peer-mesh/h-workspace-
synthesis/h-harness-factory) byte-identical WITH vs WITHOUT recipe catalog.
Priors 46/32 still PASS. Recipe slugs (h-startup-launcher/-sales-enablement/
-investor-report/-rfp-responder) don't collide with central 7.

## GAP (central promotion candidates — business domains accumulating)
Recipe-local business domains/tasks now: dom-product(46), dom-startup-launch,
dom-sales-enablement, dom-investor-relations, dom-rfp-response (+ their tasks).
5 business recipes now — if the batch keeps recurring (Wave E-G education/legal/
life-ops), a central dom-business umbrella or a few promoted domains may be worth
proposing to orchestrator (schema/vocab decision, not developer). No new central
vocab was needed this wave (all fp/tool/cap/guardrail reused by IRI).
