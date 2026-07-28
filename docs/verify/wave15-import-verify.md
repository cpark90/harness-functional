# Wave-15 recipe import — independent verification

verdict: **PASS** (with 1 non-blocking observation)

judge: vnv dispatch (opus). Independent re-execution — developer self-report not trusted.
scope: 15 new harness-recipes imported into `harness-recipes` (pre-commit working tree),
catalog 38→53. Central tooling at `/home/cpark/git/harness_ontology/tools`, run with
`/usr/bin/python3` (has rdflib/pyshacl/owlrl; shell `python3` does not).

## Reproduce (exact)

Central symlink for the catalog's `central/…` block, per-recipe closure validate, then rm:

```
cd /home/cpark/git/harness-recipes
ln -sfn /home/cpark/git/harness_ontology central
export HARNESS_CATALOG=$PWD/catalog-v001.xml
export PYTHONPATH=/home/cpark/git/harness_ontology/tools
for r in <15 recipe slugs>; do
  export HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/$r
  /usr/bin/python3 /home/cpark/git/harness_ontology/tools/validate.py
done
rm -f central
```

## Gate-by-gate evidence

### G1 — 15/15 closure validate PASS, SpecializesTypingShape 0  ✓
All 15 recipe closures PASS (SHACL / reachability / capabilities / assemblyOrder /
capacityFit / registryDrift all green). Reachability individual counts (central+local):

| recipe | verdict | reach | specViol |
|---|---|---|---|
| 20-cicd-pipeline | PASS | 265 | 0 |
| 23-microservice-designer | PASS | 263 | 0 |
| 24-test-automation | PASS | 265 | 0 |
| 25-incident-postmortem | PASS | 265 | 0 |
| 41-llm-app-builder | PASS | 265 | 0 |
| 38-chatbot-builder | PASS | 265 | 0 |
| 27-data-pipeline | PASS | 262 | 0 |
| 42-bi-dashboard | PASS | 265 | 0 |
| 63-research-assistant | PASS | 263 | 0 |
| 64-knowledge-base-builder | PASS | 265 | 0 |
| 67-compliance-checker | PASS | 262 | 0 |
| 88-risk-register | PASS | 264 | 0 |
| 47-strategy-framework | PASS | 265 | 0 |
| 52-scenario-planner | PASS | 263 | 0 |
| 36-design-system | PASS | 265 | 0 |

### G2 — catalog in-sync, 53 recipes  ✓
`gen_recipe_catalog.py --repo . --check` → exit 0, "in sync (53 recipes)". `ls -d recipes/*/`
= 53; `grep -c 'id="recipe-'` catalog = 53. `.github/workflows/validate.yml` matrix covered by
the same --check (tool emits+checks catalog and CI matrix from one disk walk). 15 new `<uri>`
entries added in the diff, all relative `recipes/<slug>/<slug>.ttl` paths.

### G3 — specializes edges: 62, histogram + target resolution  ✓
`grep -rhoE 'ho:specializes core:[a-z-]+'` over the 15 new TTLs = **62** edges. Histogram
(matches the claim):

```
15 core:role-implementer   4 core:role-planner   2 core:role-strategist
11 core:role-design        4 core:role-author    2 core:role-research
10 core:role-synthesizer   3 core:role-tester    2 core:role-curator
 9 core:role-analyst
```

**Independent target resolution (rdflib, in each loaded closure).** For every recipe-authored
(`id:<recipe>/` namespace) `ho:specializes` subject, the object was checked to be typed
`ho:Role` in central and to live outside the recipe namespace. Result: **62/62 resolved to a
central `ho:Role`, 0 bad** across all 15 closures. (SpecializesTypingShape alone is insufficient
— it is coarse: Harness-vs-Component partition only — so this direct type check was run; it
confirms the edges are not dangling/unresolved.) Note: the 47 closure additionally contains one
central `h-support ho:specializes h-research` (Harness→Harness) edge — that is a legitimate
pre-existing central edge pulled in by the union, not part of this wave.

**미emit (not rendered into build artifacts):** `grep -c specializes tools/materialize.py` = 0 —
the materializer never reads `ho:specializes`, so the linking is graph-only and cannot alter
emitted CLAUDE.md/tool bytes (consistent with the B17/B24 precedent).

### G4 — dangling / abspath leak  ✓
- Deleted-node references across the 15 TTLs: `core:role-developer`=0, `core:inspection-worker`=0,
  `core:pat-agent-teams`=0.
- `/home/cpark` in the 15 TTLs = 0; in `catalog-v001.xml` = 0 (relative paths only).
- Full `core:` resolution: 26 distinct `core:` tokens used; 22 resolve to defined central nodes;
  the remaining 4 (`core:dom-`, `core:task-`, `core:gr-`, `core:mc-`) are trailing fragments of
  `core:dom-*`/`core:task-*` **prose in the FLAG comment block** (each appears exactly 15× = 1
  per recipe, 0 in any triple position). No dangling edge.

### G5 — importer determinism  ✓
`import_corpus.py en/20-cicd-pipeline` run twice → **byte-identical**, sha256
`78efc245…1dea11d6a` both. The committed recipe (177 lines) vs a fresh import (161 lines) diff is
**purely additive**: 4 `ho:specializes` lines + a recipe-local `id:dom-cicd`/`id:task-cicd-pipeline`
block + `targetsDomain`/`addressesTask` on the harness. The importer-generated body is preserved
verbatim (no deletions/rewrites).

### G6 — domain/task binding justification, 0 central vocab created  ✓
13/15 bind recipe-local `id:dom-*`/`id:task-*`; 2 reuse central by exact fit:
23-microservice-designer → `core:dom-coding` + `core:task-architecture`; 63-research-assistant →
`core:dom-research` + `core:task-litreview`. All four central targets pre-exist in
`central/…/spec/domains-tasks.ttl` (lines 16/17/26/30). `domains-tasks.ttl` is **not modified** by
this wave → **0 new central domain/task vocabulary**. Recipe-local domains/tasks are reachable
(else G1 reachability would have failed) and named faithfully in clean English.

### G7 — corrupted-source handling (27, 88)  ✓
Both carry a `# SOURCE-QUALITY NOTE` documenting upstream find-replace word-salad corruption and
stating degraded prose is kept VERBATIM at `maturity "draft"`. Verified for 27: the corrupt token
`inthisbefore` exists in the source (`.claude/skills/data-pipeline/skill.md`) and is carried
verbatim into a fresh import (2 occurrences). Fresh-import vs committed diff for 27 is additive
only (SOURCE-QUALITY NOTE comment + 3 specializes + recipe-local dom/task) — the corrupt prose is
untouched. **0 fabrication**; only source-parsed content is stored, domain/task bindings authored
in clean English.

## Top-level judgment

**Coverage genuinely widened.** The 15 fill the intended gaps: infra/devops (20/23/24/25),
AI-LLM (41/38), data (27/42), research-knowledge (63/64), governance (67/88), strategy (47/52),
design (36). Catalog 38→53.

**Recent archetypes empirically exercised by real edges** — tester=3, strategist=2, research=2,
curator=2 (plus planner=4). The four most-recently-introduced neutral archetypes
(tester/curator/strategist/research) all now have real recipe-recurrence links, not just a single
carrier — this wave substantiates them.

**Anti-drift discipline holds.** 74 `ho:Role` individuals, 62 linked, **12 deliberately SKIPPED**
(matches claim). Sampled linked edges are all semantically sound (okr-designer→design,
strategy-reviewer→synthesizer, strategy-writer→author, literature-searcher→research,
reference-manager→curator, service-architect→design, architecture-reviewer→synthesizer) — no
mislinks found. SKIPs are conservative (name-similar but semantically divergent roles left
unlinked, e.g. `role-critic-synthesizer` NOT forced to `role-synthesizer`).

## Non-blocking observation

- **N1 (soft, anti-drift-conservative — not a defect):** a few analyst-flavored SKIPs
  (`role-bsc-analyst`, `role-swot-specialist` in 47; `role-domain-analyst` in 23) arguably had a
  clean fit to the existing `core:role-analyst` archetype yet were left unlinked. Leaning to SKIP
  when the fit is framework-specific/uncertain is the correct anti-drift bias, so this is
  acceptable; noted only as a candidate for a future promote-once pass if recurrence grows. No
  action required for this wave.

## Out of scope (present in working tree, not this wave)
`recipes/lpranging/lpranging.ttl` and `recipes/contract-demo/contract-demo.ttl` are modified
(`contract-*`→`ct-` prefix rename, the ODR `ct-` drift fix). Unrelated to the 15-recipe import;
not evaluated here.
