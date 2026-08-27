# RECIPE_STANDARD §0 run-behaviour coverage — measure, don't carry

`RECIPE_STANDARD.md` §0 quotes measured predicate coverage N/53. **Re-measure with
rdflib every time you touch these numbers** — earlier waves carried stale values
(e.g. execMode 52, TestScenario 51, fp 52) that a fresh count corrected.

## How to count (authoritative)
Predicates are asserted **locally on `id:h-<name>`** in each recipe TTL, so
**standalone parse per TTL** suffices — no owl:imports closure needed. For each
`recipes/*/*.ttl`: parse, find the single subject typed `ho:Harness`, test
`(h, ho:<pred>, None) in g`. All 53 files have exactly one ho:Harness. Use
`/usr/bin/python3` (has rdflib). Script kept: scratchpad/count.py pattern.

## Measured (2026-07, this corpus)
- hard core (targetsDomain/addressesTask/hasSystemPrompt/usesTool/hasWorkflow/
  hasGuardrail/usesModel/requiresCapability/derivedFrom/tagged) = **53/53** ✓
- hasRole 51/53, hasInstruction 51/53 — missing only contract-demo, techdoc.
- **run-behaviour axis is source-gated (§2) → below universal by design**:
  hasExecutionMode **51/53** (missing contract-demo, techdoc; lpranging HAS it),
  hasFailurePolicy **49/53** (+28-security-audit, 55-rfp-responder),
  hasTestScenario **44/53** (most gated: +6 importer recipes 14/27/28/43/52/55).
- ★"universal modulo the 3 hand-authored units" is WRONG for TestScenario/fp —
  importer recipes also omit via §2 accepted-reason (structural acceptance, e.g.
  lpranging). Don't claim 100% on a source-gated axis.
