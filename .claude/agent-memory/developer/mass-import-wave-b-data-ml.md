# Mass-import Wave B (data/ml): 32-data-analysis / 33-text-processor / 35-api-client-generator

Filled importer judgment FLAGS on 3 harness-100 recipes. Reusable decisions + rules.

## ★ Execution-in-scope test (least-privilege) is finer than "data/ml → shell"
Read what the DELIVERABLE is, not the category:
- **32 data-analysis & 33 text-processor = execution IN scope** → compute workers get
  `core:tool-shell` + `core:cap-codeexec`. They produce COMPUTED RESULTS (EDA stats,
  test statistics, rendered charts, sentiment scores, structured_data/ JSON/CSV) — the
  scenarios show results, and error rows ("Large data>1GB → dask", "Font rendering",
  "chardet auto-detect", "batch 100K docs") require actually running code. Terminal
  reporter/report-writer = doc-producing → **editor-only**.
- **35 api-client-generator = execution OUT of scope** → editor-only, NO shell/codeexec,
  even though it's "data-ish". The DELIVERABLE IS generated CODE (types/SDK/tests/docs as
  files); test-engineer authors mock-only tests and hands run-commands to the user
  (Phase-3 "report build/test execution commands"), never runs them. Mirrors coding
  pilots 17/18 (produce code artifacts, don't run). So 35 = dom-coding + editor-only.
The brief hint held: 32/33 data→shell, 35 coding→editor. But verify per deliverable.

## Domain/Task calls
- 32 → LOCAL id:dom-data-analysis + id:task-data-analysis (no central data domain/task).
- 33 → LOCAL id:dom-text-processing + id:task-text-processing (no central NLP).
- 35 → REUSE core:dom-coding (it IS software codegen) + LOCAL id:task-clientgen
  (task-architecture = structure/interface DEFINITION ≠ spec→SDK codegen).
Concepts: NEW-domain recipes (32,33) root a local top concept on `core:scheme`
(`skos:topConceptOf core:scheme`, 31-pilot pattern) + pipeline-axis leaves broader it.
Coding-domain 35 roots its top concept `skos:broader core:c-softeng` (Wave-A pattern).

## QA-gate: producing convergence gate → LOCAL + providesCapability (NOT collapse)
32 reporter & 33 report-writer SYNTHESIZE every stage into the final report AND
cross-verify inconsistencies → **PRODUCING gate** → keep LOCAL role +
`ho:providesCapability core:cap-synthesis` + roleGuardrail gets `core:gr-cross-validation`;
harness `requiresCapability core:cap-synthesis`. (Pilot-17 rule; not a pure gate so no
collapse to core:role-synthesizer.) **35 has NO worker synthesis role** — final
integration/consistency check is the ORCHESTRATOR's Phase-3 step (covered by
cap-orchestration←wf-multiagent), worker cross-checks are fp-conflict-contradiction →
so 35 binds NO cap-synthesis, requiresCapability = {cap-fileedit, cap-orchestration} only.

## FailurePolicy: rescue a central archetype the importer's regex missed
33 "Report discrepancy found → request correction (up to 2 rounds)" and 35 "Code-doc
inconsistency → request fix (up to 2 rounds)" are the SAME convergence-conflict pattern
as 32's "Reporter finds inconsistency" (which the importer DID map). Importer's conflict
regex missed the "discrepancy"/"inconsistency" wording on 33 → bind
`core:fp-conflict-contradiction` as developer judgment, do NOT author a local dup (drift).
Genuinely domain-specific rows authored id:fp-*: 32{file-read-failure,large-data,
assumptions-violated,font-rendering} 33{encoding-errors,large-text-volume,mixed-languages,
ner-domain-mismatch} 35{spec-parse-failure,incomplete-spec,circular-references,
nonstandard-auth}. All have ≥1 failureCondition + ≥1 recoveryStrategy + prefLabel + tokenEstimate.

## Universal enrichment (all 3, from Wave A + gr-scale-modes)
guardrails harness = {gr-lang, gr-structured-output, gr-least-privilege, gr-report-over-prompt,
gr-graceful-fallback, gr-scale-modes} (all 3 have an "Execution Modes by Request Scope" table).
worker roleGuardrail subset = {least-privilege, structured-output, graceful-fallback, lang}.
pattern = {pat-orchestrator-workers, pat-peer-mesh, **pat-pipeline**} (these are explicit
staged pipelines with dependency DAGs, not just teams — added pipeline vs 31's 2-pattern set).
channel = {chan-workspace, chan-peer, chan-agent-user}. model = mc-opus. tagged = local
concepts + core:c-multiagent (+ core:c-softeng only for the coding recipe 35).

## augmentsRole: source has no `## Target Agent(s)` section → leave unbound
The extending skills embed targeting in prose ("Enhances the analyst's/visualizer's
capabilities") which the importer copies into skos:definition → targeting preserved there.
No `## Target Agent(s)` heading → ho:augmentsRole NOT inferred (accepted coverage).

## Gate results (all green)
per-recipe closure validate PASS ×3 (HARNESS_ROOT_ONTOLOGY = recipe IRI). catalog
regenerated 11→14 recipes, --check in-sync. materialize ×3 (11 files each) + 2-run diff=0.
grep /home/cpark = 0 in TTL AND in materialized builds. Central validate PASS @223
unchanged; all 7 central harnesses byte-identical WITH vs WITHOUT recipe catalog. Prior
recipes (31,17) still PASS against regenerated catalog.

## GAP (next waves)
- Candidate central promotions if the batch recurs: dom-data-analysis, dom-text-processing,
  task-data-analysis, task-text-processing, task-clientgen (currently recipe-local, flagged).
- Wave C+ (content/business/education/legal/life-ops) still pending — same procedure;
  watch for the 4 mangled sources (27/28/29/30, only 28 was in-scope Wave A).
