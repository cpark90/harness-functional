# Wave-15 §1 hard-core 5-predicate enrich (usesTool/hasGuardrail/usesModel/requiresCapability/tagged)

Third+final wave on the same 15 skeletons (20/23/24/25/27/36/38/41/42/47/52/63/64/67/88)
after domain+task import, specializes, fp-backfill. Bound the 5 deferred FLAGGED harness
predicates → all 15 now carry the §1 hard-core. Result: **15/15 validate PASS (capability
gate incl.), 15/15 lint_uniformity PASS, 53/53 corpus harnesses now have all 5, dangling 0.**

## ★ the 5 bindings — decision rules (38-recipe pattern is authoritative, grep it, don't guess)
- **usesModel** = `core:mc-opus` uniform (corpus declares no model; 38/38 use opus).
- **hasGuardrail** = base-5 `{gr-lang, gr-structured-output, gr-least-privilege,
  gr-report-over-prompt, gr-graceful-fallback}` + **`gr-scale-modes`** (30/34 completed have
  it; present whenever the orchestrator skill has the "determine execution mode by scope"
  step / "Modes by Task Scale" table — TRUE for all 15, incl. mangled 27). `gr-grounding`/
  `gr-cite` ONLY for the research/citation domain → **63 only** (mirrors 09-documentary;
  legal/compliance 69/70/72/67 do NOT get grounding — corpus precedent). Written order:
  lang, structured-output, least-privilege, report-over-prompt, graceful-fallback,
  scale-modes, cite, grounding.
- **usesTool** default `core:tool-editor` ("doc-producing corpus, code-exec ~0"). +`tool-shell`
  ONLY for genuine code EXECUTION (41 "Run per-metric evaluation" + builds RAG code → editor+
  shell). ★TRAP: 20/24/27 have "bash"/"docker"/"Airflow DAG" mentions but GENERATE config as
  artifacts and say execution "out of scope" → editor-only. +`tool-websearch` where a role
  ACTIVELY web-searches (47/52/63/67/88; each source has WebSearch/WebFetch in agent prose).
  ★38 dropped websearch: its only web mention is a single fallback error-row ("supplement with
  web search") — not a research role. `tool-retriever` used by 0/38 (RAG is BUILT, not used).
- **requiresCapability** = only what a BOUND component provides: `cap-fileedit`(tool-editor,
  always) + `cap-orchestration`(wf-multiagent, always — all multi-agent) + `cap-codeexec`(iff
  shell) + `cap-websearch`(iff websearch) + `cap-synthesis`(iff synth role, see below).
- **tagged** = local top-concept + 3 subs (broader/topConceptOf, grounded in the recipe's
  role/skill areas) + central reuse. Root: `broader core:c-softeng` (dev domains 20/23/24/27/
  38/41/42), `core:c-design` (36), `core:c-inforetrieval` (63/64), else `topConceptOf
  core:scheme` (ops/business: 25/47/52/67/88). Always tag `core:c-multiagent`; reuse an exact
  central concept where one fits (`core:c-root-cause` for 25 — its prefLabel is "Root-cause
  resolution", so my sub was "…timeline/impact/remediation", no near-synonym).

## ★ cap-synthesis: local QA-gate role carries providesCapability (17-mobile-app pattern)
`ho:specializes core:role-synthesizer` does NOT propagate providesCapability. To require
cap-synthesis (the terminal QA gate exists in source), add `ho:providesCapability
core:cap-synthesis ;` to the LOCAL role that specializes synthesizer (right after the
specializes line, unique anchor per file), AND require it on the harness. 10/15 have a synth
role (20/23/24/25/27/38/42/47/52/63); 5 don't (36/41/64/67/88 → no cap-synthesis). This is
what 17/28/81 do (local qa-engineer providesCapability, "hybrid, NOT collapsed to
core:role-synthesizer"). 21/96 instead OMIT cap-synthesis (orchestrator-integrates) — both
valid; choose by whether a dedicated terminal gate role exists.

## §4 order + comment hygiene
Skeleton had targetsDomain/addressesTask at the BOTTOM (after derivedFrom) — reorder to the
top per §4. Insert Concepts section adjacent to the local dom/task block (file position doesn't
gate). The 5-line `HARNESS (skeleton assembly) … intentionally UNBOUND` comment is IDENTICAL
across all 15 (same old_string per-file) and is LIVE → rewrote to "§1 core now bound;
appliesPattern/hasChannel deferred". Top-of-file FLAGS stay FROZEN EXCEPT the brief-directed
27 fix: its `FAILURE-MISSING … left unbound` was wrong (source error table heading mangled to
`## error`; fp wave already backfilled) → corrected to FAILURE-BACKFILLED.

## scope boundary held
Only harness-node 5 predicates + local Concepts + providesCapability on synth roles. Did NOT
add roleTool/roleGuardrail/roleMemoryPolicy/roleTagged (separate deferred axis; not in the 5;
roles stay thin as prior waves left them). appliesPattern/hasChannel also stay deferred (not
hard-core). Sample: 42 harness predicate-set == 96 modulo those 2 deferred predicates.

## env / git
`ln -sfn /home/cpark/git/harness_ontology central` at repo root; per-recipe
`HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=<recipe IRI> validate.py` &
`lint_uniformity.py recipes/<r>/<r>.ttl`; **`rm central` when done**. Pre-existing M
(catalog-v001.xml / 81 / 82 / 87 / 90 / contract-demo / lpranging) were dirty at session start
(other lanes) — matched the start snapshot exactly, NOT touched. My changes = the 15 whole-dir
`??` recipes only.
