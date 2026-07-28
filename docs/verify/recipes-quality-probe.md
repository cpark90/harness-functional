# Recipes quality probe — central quality lens applied to harness-recipes

**Verdict: (b) a small, real cleanup queue exists — ONE type, 5 nodes / 2 recipes.**
Everything else is at the quality bar. The system is *almost* fully coherent
(central + recipes): graph-integrity gate is green on all 38 recipes; the only
drift is a §2 naming-prefix inconsistency on `ho:Contract` nodes.

Scope: findings only, no edits/deletes. Probe applied the central quality lenses
(uniformity Q1 / soundness Q2 / granularity Q3 / orphan-dangling) to
`/home/cpark/git/harness-recipes/recipes/` (38 recipes).

## Reproduce (exact commands)

Central linked as a temporary gitignored `./central` symlink (sanctioned verify
procedure; removed after — recipe tree left byte-clean, `git status` empty):

```bash
cd /home/cpark/git/harness-recipes
ln -s /home/cpark/git/harness_ontology central          # temp, gitignored, rm'd after
# per recipe:
HARNESS_CATALOG=catalog-v001.xml \
HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> \
/usr/bin/python3 central/tools/validate.py          # gate (Q2 graph integrity)
/usr/bin/python3 central/tools/lint_uniformity.py   # Q1 uniformity lens
```

Catalog drift guard clean: `gen_recipe_catalog.py --check` → "in sync (38 recipes)".
core-roles / core-observation / core-memory all present in `catalog-v001.xml`
(the lpranging P0 core-roles-import regression is landed — no longer a blocker).

## Item 1 — Gate reproduction (Q2 graph integrity): PASS on all 38

`validate.py` sweep over every recipe closure (central + that recipe):
**PASS=38 / FAIL=0.** SHACL conforms (SpecializesTypingShape included → 0), global
reachability closes (e.g. 21→265, 96→272, lpranging→268, contract-demo→256 —
central + recipe-local, all reachable from a Harness), capability satisfaction and
assembly-order gates green. `validate.py` sees only graph integrity; it does NOT
see the §2 naming drift below (that is the linter's axis).

## Item 2 — Uniformity (Q1 lens): linter IS applicable; 1 drift type, 5 nodes

**Applicability first (anti-false-positive):** `lint_uniformity.py` is applicable
to recipe closures — it loads the env-scoped union (`ontology_lib.load_graph`
honours `HARNESS_ROOT_ONTOLOGY`) and its checks are **class-based, domain-neutral**,
so recipe-local `id:` nodes are lawfully in scope: §2 prefixes key off the node's
*class*, not its repo; §1c tokenEstimate and §1d language are universal. No
recipe-convention conflict — the central linter is the right tool for recipes.

Full 38-recipe lint sweep — only failures:

| recipe | check | count |
|---|---|---|
| lpranging | naming prefix (§2) | 3 |
| contract-demo | naming prefix (§2) | 2 |

All other axes clean on all 38: tokenEstimate (§1c) 0, language (§1d) 0, maturity 0,
definition 0. (Central baseline itself: all 0.)

**The drift — `ho:Contract` nodes named `contract-*` instead of `ct-*`:**

```
id:contract-docgraph-emitted   [Contract]  should be ct-   (lpranging.ttl:88)
id:contract-docgraph-parses    [Contract]  should be ct-   (lpranging.ttl:94)
id:contract-simulation-bound   [Contract]  should be ct-   (lpranging.ttl:100)
id:contract-greeter-emitted    [Contract]  should be ct-   (contract-demo.ttl:62)
id:contract-greeter-behaves    [Contract]  should be ct-   (contract-demo.ttl:68)
```

This is a **genuine [지킴] §2 violation, not a recipe convention.** ONTOLOGYSTYLE
line 135 fixes `Contract → ct-` (canonical example `id:ct-well-formed-skill-heading`);
central's only Contract nodes (`ct-well-formed-skill-{heading,description}`) follow
it. lpranging + contract-demo are the *only* two recipes that declare `a ho:Contract`
(the ODR-contract increment), and both spell the prefix out — a single-author
consistent slip, not a designed domain convention. The prefix encodes the class,
so there is no domain reason to deviate.

- **Scope:** 5 nodes / 2 recipes.
- **Fix:** rename `contract-*` → `ct-*` on the 5 subjects and update their
  in-recipe references (each is a `capabilityContract`/`contractCheck` target).
  Mechanical; graph-integrity is unaffected (`validate.py` already green), so this
  is a uniformity-only cleanup, routable as a normal audit→decision→apply pass
  (developer dispatch), same as central Q1 items.
- **CI note:** if recipe CI ever adds the §2 lint (it currently runs the catalog
  drift guard), these two recipes would fail until renamed.

## Item 3 — Soundness (Q2 stale/contradiction): 0 residual

B23-pathology sweep (a node that `ho:specializes core:*` yet its own
`skos:definition` denies a central archetype exists) run **node-level** with rdflib
across all recipe TTLs: **0 node-level contradictions.** The B23 fix is complete.
A coarse *file-level* grep shows many co-occurrences, but every one is legitimate:
the "no central archetype/domain fits" negations sit on **domain/task and
failure-policy** nodes that are correctly kept recipe-local (they carry no
`specializes core:` edge), while the `specializes core:*` edges are on **separate
role** nodes. Different subjects → no contradiction. (This is exactly the
predicate-vs-prose / anti-drift-FIRST discipline; the file-level count is a lure.)

## Item 4 — Granularity (Q3): 0 decompose

Longest recipe-local `skos:definition`s (h-crisis-communication 1023, h-hiring-pipeline
1017, h-technical-writer 981, ins-regulatory-filing 905, …) are **Harness overview
prose** (one sentence enumerating the multi-agent pipeline) and **skill descriptions** —
single-concept, not multi-responsibility blobs. Length ≠ defect; recipes are
materialize targets so long overview definitions are legitimate (same criterion as
the central Q3 audit). No decomposition queue.

## Item 5 — Orphan / dangling: 0

Every `core:` IRI referenced by any recipe resolves to a subject defined in
central abox: **74 distinct core: refs used, 0 dangling.** No recipe references
this session's central deletions (`role-developer` / `inspection-worker` /
`pat-agent-teams`). Note: lpranging's `id:role-developer` / `id:role-vnv` /
`id:role-inspection` are **recipe-local** roles (`id:`, not `core:`) — the lpranging
project's own agent roles, legitimate domain instances, carrying no `specializes`
edge to any deleted central node. (A grep on the bare string `role-developer` is a
false lure here — it matches the recipe-local declaration.)

## Bottom line

- **Gate (Q2 integrity):** 38/38 PASS. **Soundness (Q2 stale):** 0. **Granularity
  (Q3):** 0. **Dangling/orphan:** 0.
- **Uniformity (Q1):** **one** real cleanup-queue item — 5 `ho:Contract` nodes in
  2 recipes named `contract-*` instead of `ct-*` (§2). Small, mechanical, integrity-
  neutral; route as an audit→decision→apply (developer dispatch) like central Q1.
- After that single rename, central + recipes are fully coherent under all four
  lenses. This is verdict **(b) small real queue**, one type — much closer to (a)
  than to a broad cleanup backlog.

## Evidence artifacts (this probe)

- validate/lint sweeps: run in-session (commands above), no persisted logs.
- scratch scripts: `.../scratchpad/{b23,dangling,q3}.py` (node-level checks).
- recipe tree left clean (temp `central` symlink removed; `git status` empty).
