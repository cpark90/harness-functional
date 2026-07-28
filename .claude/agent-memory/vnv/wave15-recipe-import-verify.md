# Wave-15 (mass) recipe import verification — reproduce

Verifying a batch of importer-generated draft recipes in `harness-recipes` (harness-100 coverage).

## Setup (tools are CENTRAL, recipes repo has NO tools/)
`ln -sfn /home/cpark/git/harness_ontology central` in harness-recipes (catalog's `central/…`
block). `export HARNESS_CATALOG=$PWD/catalog-v001.xml PYTHONPATH=/home/cpark/git/harness_ontology/tools`.
Per-recipe closure = `HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<slug>`
+ `/usr/bin/python3 central/tools/validate.py`. **rm the symlink at the end** (not a trap here).
Trap: parallel Bash calls reset cwd to central repo — a bare `ls tools/` lists CENTRAL not recipes.

## Gate mechanics that matter
- **G3 target resolution is the load-bearing extra check**: SpecializesTypingShape is coarse
  (Harness-vs-Component partition only), passes even if a Role→Role edge points nowhere useful.
  Do rdflib: for each `id:<slug>/` subject of `ho:specializes`, assert object typed `ho:Role` and
  outside recipe ns. Wave-15: 62/62 resolved, 0 bad. Watch for legit central Harness→Harness edges
  (h-support→h-research) pulled into a closure — filter to recipe-authored subjects.
- **미emit**: `grep -c specializes tools/materialize.py` = 0 → linking is graph-only, byte-safe.
- **Dangling core: scan false positives**: `core:dom-`/`core:task-`/`core:gr-`/`core:mc-` fragments
  come from the FLAG comment block's `core:dom-*` prose (15× each = 1/recipe), 0 in triples.
- **G5 determinism**: importer to stdout twice = byte-identical sha256; committed recipe vs fresh
  import diff must be ADDITIVE only (specializes + recipe-local dom/task block + targetsDomain/
  addressesTask). Source corpus at `/home/cpark/git/harness-100/en/<slug>`.
- **G6 provenance**: most bind recipe-local `id:dom-*`/`id:task-*`; a few reuse `core:dom-*` exact
  fit. Confirm `domains-tasks.ttl` UNMODIFIED (0 new central vocab) + reuse targets pre-exist.
- **G7 corrupt source (27/88)**: SOURCE-QUALITY NOTE + verbatim degraded prose. Prove by grepping
  the corrupt token (e.g. `inthisbefore`) in the source tree AND the fresh import (carried, not
  fabricated).
- **Anti-drift SKIP count** = (Σ `a ho:Role`) − (Σ `ho:specializes core:role`). Wave-15: 74−62=12.
  SKIPs justified when name-similar-but-semantics-divergent (critic-synthesizer NOT→synthesizer);
  soft flag = analyst-flavored roles with clean core:role-analyst fit left unlinked (conservative
  = acceptable, not a defect).

Report: docs/verify/wave15-import-verify.md. Verdict PASS + N1 soft.
