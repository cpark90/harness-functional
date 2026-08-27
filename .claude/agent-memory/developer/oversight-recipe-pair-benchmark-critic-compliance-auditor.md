# Oversight recipe pair — benchmark-critic + compliance-auditor (harness-recipes)

Two FIRST-PARTY recipes composed from the just-minted central oversight parts (see
oversight-pair-benchmarker-auditor.md for the CENTRAL side). Recipe files:
`recipes/benchmark-critic/benchmark-critic.ttl`, `recipes/compliance-auditor/compliance-auditor.ttl`.

## Capability gate wiring (the load-bearing bit)
requiresCapability must ALL be provided by a bound component. Providers used:
- cap-benchmarking ← LOCAL role-comparator ho:providesCapability (specializes core:role-benchmarker;
  providesCapability does NOT propagate via specializes → name it directly on the local role).
- cap-audit ← LOCAL role-operation-auditor ho:providesCapability (specializes core:role-auditor).
- cap-websearch ← core:tool-websearch, cap-retrieval ← core:tool-retriever (must be in usesTool).
- cap-citation ← core:gr-cite, cap-traceability ← core:gr-traceability (must be in hasGuardrail).
  ★So if you require cap-citation/cap-traceability you MUST include gr-cite/gr-traceability in
  hasGuardrail — they are the providers, not tools.

## First-party specifics (no harness-100 source)
- OMIT dct:source/dct:license (RECIPE_STANDARD §1 — internal recipe, no external source).
- Run-behaviour TestScenarios authored as first-party DESIGN (normal + error each), NOT source
  fixtures — §2 permits when the recipe itself backs the design. Note it in the header + a comment
  above the scenarios so the coverage-audit reads it as design, not fabrication.
- hasInstruction: initially OMITTED (SHACL floor doesn't force it), but §1 CONVENTION requires ≥1
  (hard-core 51/53); a full-profile recipe with Roles must carry it. LATER ADDED (this brief) as
  first-party DESIGN skills (harness genuinely runs them → not fabrication). Pattern: 2 ins-* per
  recipe, 1:1 with worker-role activity. benchmark: ins-gather-reference-cases(case-researcher)+
  ins-compare-and-claim(comparator). compliance: ins-audit-operation+ins-file-finding (both
  operation-auditor's two core acts: assess, then file). Node = skos:notation(=slug=invocation),
  skos:definition(what+Target agent+out-of-scope), ho:artifactTemplate VENDORED PATH
  "recipes/<name>/skills/<slug>/skill.md" (1st-party uses vendored path like importer uses external
  URL; skill.md file itself NOT created — path ref is what §1 accepts), tokenEstimate(§1c projected
  body cost ~150-175), maturity draft. §4: Instructions section AFTER Roles/BEFORE run-behaviour;
  harness field order usesModel→hasInstruction→hasRole. Node-add = catalog-irrelevant (catalog maps
  doc IRIs only). validate PASS + lint 0.
- FailurePolicy = REUSE central (fp-source-unavailable + fp-conflict-contradiction), no local fp.

## backbone (both)
top persona (sp-<name>) + 1 role persona each; hasChannel core:chan-agent-user (approval gate,
raise-don't-decide); wf-multiagent; mc-opus; mode-agent-teams; derivedFrom core:h-multiagent;
tag core:c-oversight. Local concepts skos:broader core:c-oversight (benchmarking) / core:c-traceability.
NO appliesPattern (brief didn't request; optional, omitted to stay in-brief).

## Verify workflow (harness-recipes, central symlink)
`ln -sf /home/cpark/git/harness_ontology central` in repo root, then per recipe:
`HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<r>
/usr/bin/python3 central/tools/validate.py` (PASS) + same env `lint_uniformity.py` (0 viol). Then
`rm central`. Catalog regen: generator lives in CENTRAL (`central/tools/gen_recipe_catalog.py`),
run with `--repo /home/cpark/git/harness-recipes` then `--check`. Generator counts only dirs with a
valid `<name>/<name>.ttl`; empty/WIP dirs excluded. This repo carries a large uncommitted in-flight
rollout — my delta = catalog(M) + 2 new dirs only; don't mistake pre-existing ?? for mine.
