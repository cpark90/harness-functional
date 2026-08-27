# Recipe canonical format standard (RECIPE_STANDARD.md) + lpranging pilot

Defined the recipe-format standard for harness-recipes and canonicalized lpranging
as the pilot. Reusable findings.

## Empirical minimal core (ground the standard, don't guess)
Measured across 53 recipes (`recipes/*/*.ttl`). Harness-node predicate coverage:
- **53/53 (hard core)**: targetsDomain, addressesTask, hasSystemPrompt, usesTool,
  hasWorkflow, hasGuardrail, usesModel, requiresCapability, derivedFrom, tagged.
- **51-52/53 (near-universal = run-behaviour + role/instruction)**: hasRole 51,
  hasInstruction 51, hasExecutionMode 52, hasTestScenario 51, hasFailurePolicy 52.
  The ONLY holdouts are the 3 hand-authored units — techdoc/contract-demo are
  synthetic single-agent (no Role/Instruction), lpranging was the run-behaviour gap.
- Domain/Task/Concept as NODES are 43/45/38 — because recipes REUSE central
  `core:dom-*/task-*/c-*` by IRI; the BINDING (targetsDomain/addressesTask/tagged)
  is 53/53. So "required core" = the binding, node-decl only when no central fit.
- **Importer (`central/tools/import_corpus.py`) is the de-facto implementation** of
  the standard (50/53). Hand-authored recipe conforms by matching importer output.
- **★ "hard core 53/53" = convention + measured coverage, NOT a SHACL floor.**
  `ho:HarnessShape` minCount forces ONLY prefLabel + targetsDomain + addressesTask +
  hasSystemPrompt + hasWorkflow. usesTool/hasGuardrail/requiresCapability are merely
  *type*-checked (sh:class, no minCount) in `EdgeTypingShape`; usesModel has NO shape.
  So a recipe omitting Tool/Guardrail/Model/cap/tag still passes validate.py — the
  linter/coverage-audit/review hold the convention, not the shape. Convention ⊇ SHACL.
  RECIPE_STANDARD §1 originally overclaimed "≥1 Tool+Guardrail+ModelConfig enforced by
  SHACL" — corrected (2026-07): §1 now splits SHACL-forced vs convention-required, §0
  labels 53/53 as convention+measured. Cross-check against actual harness-shapes.ttl
  minCount list before repeating any "enforced by SHACL" claim.

## Standard = floor not ceiling; 3 axes
- Required core §1 / source-gated run-behaviour §2 (execMode+TestScenario+FailurePolicy,
  required WHERE source backs it; else explicit accepted-reason comment, never fabricate)
  / optional extension §3 (Capability/Contract/Tool — only recipes that use them).
- `ho:scaffold` (1/53, lpranging-only) is kept: non-standard but source-faithful and
  materialize-load-bearing. Standard defines the minimum, not the maximum — any
  well-typed central predicate is allowed when the source ships the artifact.

## lpranging pilot specifics
- **Role→archetype specialize mapping** (required core: each Role `ho:specializes
  core:role-*`): developer→`core:role-implementer` (central role-developer was MERGED
  into implementer; the neutral archetype comment literally says agent-developer ->
  role-implementer), vnv→`core:role-vnv`, inspection→`core:role-inspection`. All
  Role→Role, so SpecializesTypingShape passes.
- **specializes placement**: written immediately after `skos:prefLabel` (importer/fleet
  convention), NOT §3 group-5 order — pinned in the standard as a fleet convention so
  hand-authored recipes match the 50 importer ones visually.
- **Run-behaviour, source-backed via central IRI reuse (no local nodes)**:
  `ho:hasExecutionMode core:mode-sub-agents` (cold-start dispatch topology) +
  `ho:hasFailurePolicy core:fp-validation-fail` (verify-then-proceed / never-weaken-gate
  discipline). **TestScenario N/A** = acceptance is STRUCTURAL (validate.py + the
  ho:Contract axis), source ships no Test Scenarios → documented accepted-reason comment,
  no fabrication. (Matches prior recipe-runbehaviour-coverage-backfill Group-B analysis.)
- Trim = tightened verbose comments to importer density (244→235 lines) while KEEPING
  all data literals byte-identical (4 promptText, ct- contracts, defs) + load-bearing
  fidelity notes. Preserved optional Capability/Contract/Tool axes + `contract-`→`ct-`
  pre-existing rename.

## Gates (all green, symlink workflow)
`ln -s /home/cpark/git/harness_ontology central` then per-recipe HARNESS_ROOT env:
validate PASS (SHACL incl SpecializesTypingShape), verify_contract 3/3, lint_uniformity
0 violations (naming §2 / tokenEstimate §1c / language §1d). Materialize no-regression
proof: adding execMode+fp = **exactly +2 CLAUDE.md sections** (`## Execution mode`,
`## Error handling`), everything else byte-identical. `rm central` after (gitignored).
NB pre-existing not-mine repo mods (catalog + 81/82/87/90/contract-demo + 15 untracked
recipe dirs) left untouched — brief boundary = RECIPE_STANDARD.md + lpranging.ttl only.
