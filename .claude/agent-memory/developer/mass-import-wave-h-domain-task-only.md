# Mass-import Wave H — 15 more harness-100 recipes (import + domain/task-only bind)

38→53 recipes. Distinct from waves A–G (which did FULL judgment-binding): this
wave imports + binds ONLY the minimal delta to reach validate PASS. Reusable
findings for any "import + closure 정합" (not full-enrichment) dispatch.

## ★ Raw importer draft fails SHACL on EXACTLY 2 constraints — not the 10 FLAGS
The importer prints 10 judgment FLAGS (domain/task/model/guardrails/tools/caps/
concepts/pattern/QA/local-fp) but `validate.py` HarnessShape hard-requires only
**ho:targetsDomain (≥1 Domain) + ho:addressesTask (≥1 Task)**. Model/guardrails/
tools/capabilities are NOT SHACL-min-required (they're enrichment). The importer's
own harness-node comment says so: "does not yet satisfy ho:HarnessShape until a
reviewer binds domain+task." So for an IMPORT-ONLY wave whose gate is "closure
정합 / 15/15 PASS", the correct minimal scope = import + bind domain+task ONLY.
SystemPrompt/Workflow mins are already satisfied by the importer (orchestrator
persona + core:wf-multiagent). Empirically confirm: raw draft → SHACL 2 violations
(MinCount targetsDomain, addressesTask), all other axes ✓.

## ★ gen_recipe_catalog.py DEFAULT_REPO = central/staging/harness-recipes (a MIRROR)
Running it with NO `--repo` writes the central repo's OWN gitignored mirror
(`/home/cpark/git/harness_ontology/staging/harness-recipes`, a 38-recipe copy),
NOT the real repo `/home/cpark/git/harness-recipes`. Always pass
`--repo /home/cpark/git/harness-recipes` for both write and `--check`. The stray
mirror write is gitignored (harmless) but don't trust its count.

## Domain/Task binding recipe (the minimal delta)
- Domain node: `id:dom-X a ho:Domain ; skos:prefLabel "..." ; skos:altLabel "..." ;
  ho:salience 0.6 .` (NO tokenEstimate — Domain/Task not in §1c text-node set).
- Task node: `id:task-X a ho:Task ; skos:prefLabel "..." ; skos:definition "..." .`
  Connectivity via inverse ho:addressesTask (TaskConnectivityShape sh:or). prefLabel
  unique only within the closure = central(4 dom / 6 task labels) + THIS recipe
  (recipes import central only, never each other → no cross-recipe collision).
- Bind on harness after `ho:derivedFrom core:h-multiagent ;`:
  `ho:targetsDomain <d> ; ho:addressesTask <t> ;`.
- REUSE central by IRI only on exact fit: 23-microservice→core:dom-coding+
  core:task-architecture (arch def = "structure/components/interfaces"; 16/17/18
  sibling precedent); 63-research→core:dom-research+core:task-litreview. Central has
  only 4 domains(coding/research/support/design)+6 tasks → the other 13 are faithful
  recipe-local. `core:` (recipe) == central `id:` == https://harness-ontology.dev/id/core/.

## ★ Mangled sources this wave: 27-data-pipeline + 88-risk-register (brief flagged NONE)
Same find-replace word-salad class as 28/81/82/87/90 ("inthisbefore","trackinglower"
/"managementversus","responsestrategyestablish"). ALWAYS word-salad grep the imports;
never trust the brief's mangled list. Handling per precedent: keep degraded promptText/
defs VERBATIM at draft, add a `# SOURCE-QUALITY NOTE` block (I insert before owl:Ontology),
author only MY nodes (domain/task) in clean English, bound scenarios to what parsed —
27 parsed 0 TestScenarios (headings too degraded), 88 parsed 2; never fabricate.

## Gates (all green)
15/15 per-recipe closure PASS; catalog 38→53, `--check` in-sync; importer 2-run diff=0
(36-design-system sample, byte-identical); dangling refs to central deletions
(role-developer/inspection-worker/pat-agent-teams)=0; abspath /home/cpark leak=0;
temp `central` symlink removed. Central ontology/tools UNCHANGED by me (staging mirror
write gitignored). NB harness-recipes tree had PRE-EXISTING not-mine mods
(contract-demo/lpranging = prior contract-→ct- prefix rename) — left untouched, flagged
to inspection. specializes-linking deferred to next dispatch (B17/B24 style).
