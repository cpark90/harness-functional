# Wave-15 role-level enrich → full predicate-set parity with importer baseline

Fourth/final wave on the same 15 skeletons (20/23/24/25/27/36/38/41/42/47/52/63/64/67/88).
Prior waves bound domain+task, specializes, fp, and the harness §1 hard-core 5. This wave
closed the **Role-node** gap so each of the 74 roles matches a completed importer recipe's
Role predicate-set. Result: 15/15 validate PASS + 15/15 lint_uniformity PASS, 0 subset
violations, 0 missing role predicates.

## ★ baseline = pick ONE completed importer recipe (96-real-estate-analyst)
Its Role predicate-set = {rdf:type, prefLabel, specializes, definition, rolePersona,
**roleTool, roleGuardrail, roleMemoryPolicy, tagged**, tokenEstimate, maturity}. The 4 bold
were the gap (prior waves left roles thin). 21-code-reviewer is the co-baseline but differs
on ONE axis: 21 folds roleMemoryPolicy text INTO tokenEstimate (46/48), 96 does NOT bump
(keeps import value). **Chose 96 → did NOT bump tokenEstimate** (predicate-set parity is the
goal, not value parity; avoids fabricating precise counts; halves edit fragility). Note both
in the return so vnv knows it's a baseline choice, not an omission.

## the 4 role predicates — decision rules
- **roleGuardrail = FIXED worker 4-set** `core:gr-least-privilege, gr-structured-output,
  gr-graceful-fallback, gr-lang` — IDENTICAL across every worker role in BOTH baselines
  (analyst/research/author/design/tester/implementer all same). report-over-prompt + scale-modes
  are orchestrator-level (harness-only, NOT per-worker); grounding/cite NOT on roles even for
  research roles (96 websearch roles still get only the 4). Always ⊆ harness hasGuardrail.
- **roleTool = least-privilege slice of harness usesTool.** Default `tool-editor`. Elevate ONLY
  the role(s) whose SOURCE agent prose actively uses the tool (grep harness-100 clone
  `/home/cpark/git/harness-100/en/<r>/.claude/agents/*.md` for WebSearch/WebFetch vs Bash/run).
  ★ Distinguish ACTIVE capability ("Use web search to research benchmarks") from a FALLBACK
  error-row mention ("when web search fails…") — the latter does NOT elevate (38-drop precedent).
  Elevated this wave: 41 shell→eval-specialist+rag-architect (run evals / build+run RAG code;
  deploy/opt/prompt = editor, serving out-of-scope); 47 websearch→4 analysis roles
  (bsc/okr/strategy-writer/swot each "research … via web search"; only QA reviewer editor);
  52→variable-analyst; 63→literature-searcher+note-taker (note-taker "Actively use WebFetch");
  67→law-mapper; 88→risk-identifier. Always ⊆ harness usesTool (checked, 0 viol).
- **roleMemoryPolicy = standard string** `"Read and write only .claude/agent-memory/<slug>/:
  <3 domain note types>; index each note in MEMORY.md."` slug = role IRI minus `role-` (==
  persona artifactTemplate basename == materialized agent dir). 3 note types derived from the
  role's skos:definition (for mangled 27/88 defs, derive from role-name + readable fragments).
- **tagged = [most-specific-local-concept, anchor]** (2 tags, 96 pattern). Specialist roles →
  [sub-concept, local-root]; generalist/QA roles with no dedicated sub → [local-root,
  central-anchor] where anchor = the recipe's central tag (c-softeng / c-design /
  c-inforetrieval / c-multiagent / c-root-cause). Every concept already reachable → no orphan.

## specializes is NOT re-opened (fabricate 금지)
12/74 roles carry NO specializes — deliberate skips from the prior specializes wave (no central
archetype fits: monitoring/mapper/hybrid analyst-strategist). Brief lists specializes in the
Role shape but names roleTool/roleGuardrail/roleMemoryPolicy as the核심 gap; specializes was
already handled. Left as-is → the ONLY remaining predicate-set diff vs baseline is those 12
`specializes`-missing (acceptable faithful-modeling) + `providesCapability` EXTRA on the 10
synth-gate roles (17-mobile pattern, additive not missing). Required diff = 0.

## mechanics
Anchor = `ho:rolePersona id:sp-role-<slug> ;` (unique per file) → append the 4 preds after it.
Works whether or not providesCapability/tokenEstimate follows (don't include them in old_string).
Read each file before Edit (harness tracks per-file). Env: `ln -sfn /home/cpark/git/harness_ontology
central` at repo root; per-recipe `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=<recipe
IRI> /usr/bin/python3 central/tools/validate.py` + `lint_uniformity.py`; **`rm central` when done**.
Pre-existing dirty (catalog/81/82/87/90/contract-demo/lpranging/RECIPE_STANDARD.md) = other lanes,
matched start snapshot, NOT touched. Verify: rdflib script diff role-predset vs 96 + roleTool⊆
usesTool / roleGuardrail⊆hasGuardrail subset (0 viol) is the parity proof.
