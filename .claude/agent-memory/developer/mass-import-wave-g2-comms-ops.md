# Mass-import Wave G2 (comms/ops/spec) — FINAL wave: 87-crisis-communication / 90-hiring-pipeline / 95-procurement-docs / 96-real-estate-analyst / 100-ip-portfolio

Last of the representative 35. Filled importer judgment FLAGS. Reusable calls + the
full accumulated GAP tally for the orchestrator's D1 decision.

## ★ 87 + 90 are MANGLED (not flagged in brief); 95/96/100 clean
Same find-replace corruption class as 28/81/82 ("situationidentify","JDwriting",
"companybeforetask","qualityKorean"). Detect with a word-salad grep on `.claude/**`
BEFORE trusting the brief's mangled list — the brief named none this wave. Handle per
28/81/82: import structurally-sound parts, keep DEGRADED promptText/role-def/skill-def
VERBATIM at draft + a ★SOURCE-QUALITY NOTE header; author ONLY the assembly nodes I own
(Concepts/Domain/Task/local FP/Harness definition) in clean English. Mangled sources
parse FEWER scenarios (1/3 each for 87/90 — normal/existing headings too degraded) →
bound what parsed, never fabricate.

## ★ QA-gate split this wave: HYBRID→cap-synthesis vs ORCHESTRATOR-integrates→NONE
The discriminator is WHO cross-validates (read the orchestrator skill's Phase-3 +
the "cross-verify" line):
- **HYBRID gate (KEEP LOCAL + providesCapability cap-synthesis + gr-cross-validation,
  requiresCapability incl cap-synthesis)**: a ROLE both produces a deliverable AND
  cross-verifies all deliverables. 87 media-monitor ("monitor all deliverable
  cross-verification message consistency" + produces monitoring plan); 90
  offer-coordinator ("offer overall pipeline cross-verification, revision max 2" +
  produces final assessment/offer). The 82 executive-summarizer pattern.
- **NONE (NO cap-synthesis; orchestrator integrates via cap-orchestration)**: the
  ORCHESTRATOR does cross-validation in Phase 3, no dedicated gate role. 95 ("Orchestrator
  performs final cross-document consistency validation"); 96 (report-writer SYNTHESISES
  the report = producer, but orchestrator cross-validates in Phase 3 — synthesise≠the
  gate, mirrors 82 report-writer); 100 (Integrated Review step 5 = orchestrator).
  requiresCapability = {cap-fileedit, cap-websearch, cap-orchestration}.
None COLLAPSE to core:role-synthesizer this wave (no PURE gate: hybrids stay local, the
rest have no gate role at all).

## ★ 96 real-estate = EDITOR-ONLY despite cap-rate-"calculator" (75-tax precedent)
cap-rate-calculator/patent-valuation skills supply FORMULAS as TEXT (Cap Rate/NOI/DCF/
IRR); analyst applies by hand → markdown report. grep python/subprocess = 0. NAME
"calculator" ≠ code-exec → core:tool-editor, no shell/cap-codeexec. Brief's "데이터 계열
검토" for 96: it's quantitative *financial analysis*, not literature research (dom-research
= "literature research"); central has NO data domain; 32's id:dom-data-analysis is
recipe-LOCAL (local IRIs don't cross recipes) → author recipe-local id:dom-real-estate-
analysis. All 5 editor-only; per-role tool-websearch only for genuine external-data
gatherers (grep literal "web search" + strong intent: 87 situation-analyst/media-monitor,
90 jd-writer/sourcing/offer-coordinator, 95 vendor-comparator, 96 market-researcher/
location-analyst, 100 ip-analyst/patent-mapper).

## FailurePolicy mapping (regex-miss judgment reuse; compliance=recipe-local)
Central reuse by IRI (importer regex misses these wordings): source-unavailable = any
"web search failure"/"market data retrieval failure"; review-critical-rework = a single
reviewer's cross-validation finding → revision max 2 (87 "message inconsistency", 90
"consistency mismatch → offer revision max 2"); conflict-contradiction = TWO deliverables
incompatible detected in cross-validation (100 "valuation-protection strategy mismatch");
insufficient-input = thin/missing brief. LOCAL id:fp-* ONLY for: compliance refer-to-
expert rows (brief: compliance stays recipe-local, NO central guardrail) — 87
legal-judgment-needed, 95 legal-review-needed, 96 tax-legal-judgment; and true
domain machinery — 95 budget-undetermined, 96 investment-opinion-inconclusive, 100
ip-list-not-provided (the 31-ml "Data not provided" precedent = missing-core-input stays
local) + foreign-ip-unavailable, 90 comp-level-unspecified.

## Gate results (all green)
per-recipe closure PASS ×5; catalog 33→38, --check in-sync; materialize ×5 (11 files
each; 87/90 build a synthesizer-less local set, the hybrid gate stays a local agent)
2-run diff=0, build /home/cpark=0; TTL /home/cpark=0; central validate PASS @223
unchanged; central h-multiagent/h-harness-factory byte-identical WITH vs WITHOUT recipe
catalog. Recipe h-* recipe-namespaced, no central-7 collision.

## GAP — FINAL accumulated tally (all waves) for orchestrator D1
Two recurring central-promotion candidates now span the whole 35-recipe import:
- **fp-refer-to-expert** (compliance "situation exceeds scope → degrade + refer to a
  professional"): 75 complex-tax, F fp-regulation-ambiguous, 87 legal-judgment, 95
  legal-review, 96 tax-legal = 6+ near-identical recipe-local fps. Strongest single
  central-fp candidate. (Kept recipe-local per brief; promotion is orchestrator's call.)
- **doc/writing domain**: 81 dom-technical-writing + techdoc-pilot dom-techdoc + 82
  dom-report-generation = 3 near-identical writing domains a central dom-authoring would
  absorb.
Full recipe-local DOMAIN list (D1, all recipe-local, no central pollution): meal-planning,
fitness-programming, tax-calculation, technical-writing, report-generation, data-analysis,
text-processing(B), <A/C/D/E business/content/edu locals>, procurement, real-estate-
analysis, ip-portfolio, crisis-communication, hiring-pipeline. Recurring LOCAL fp
archetypes beyond refer-to-expert: "missing-core-input→gather from registry/defaults"
(31 data, 100 ip-list, 90 comp-level), "cannot-conclude→issue bounded Hold" (96). No new
central vocab authored any wave — all deferred to orchestrator as schema/vocab decisions.
