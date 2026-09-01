# Contributing a pure-data ontology repo (federation guide)

This guide is for contributors who keep their harness ABox in **their own GitHub
repo** and connect it to the central ontology, the way `lu-w/auto` federates
sub-ontologies. It complements `CONTRIBUTING.md` (which covers editing the
central repo directly) and implements the decisions in
`docs/federation-design.md` (D1–D4). Turtle format rules are in
`ONTOLOGYSTYLE.md §1a–1d` (that file is the format origin — this guide only adds
the federation-specific rules).

## What lives where (D2)

- **Functional repo** (`harness-functional`, formerly `harness_ontology`): the TBox vocabulary
  (`ontology/tbox/harness.ttl`), SHACL shapes, and all tools
  (`validate.py` / `retrieve.py` / webui). This is authoritative; you do **not**
  copy it. Since the 2026-09 ladder split it holds **no individuals**.
- **Concrete repo** (`harness-concrete`, formerly `harness-recipes`): the union
  root, the **neutral core parts library** — the `.../data/core/<type>` units
  under `ontology/abox/core/<group>/*.ttl`, i.e. every `id/core/` individual —
  and the recipes. If your data references a shared central node (`core:…`),
  that node lives here, so you clone this repo too.
- **Your data repo**: pure Turtle ABox only — no tools. Typically one data-unit
  TTL, a `catalog-v001.xml`, and a CI workflow.

You never fork the vocabulary. Your data **conforms** to the central TBox, which
is what keeps anti-drift intact across repos.

## One-time setup

1. Create your data repo with a single data-unit TTL (e.g. `mydomain.ttl`).
2. Declare it as an importable ontology that imports the central TBox — plus
   **each** `.../data/core/<type>` unit whose nodes you reference. The core is
   split per component type (`guardrails`, `tools`, `workflows`, `roles`,
   `capabilities`, `concepts`, `harnesses`, …); there is no single
   `.../data/core` document, so import the units, not a parent IRI:

   ```turtle
   @prefix ho:    <https://harness-ontology.dev/schema#> .
   @prefix id:    <https://harness-ontology.dev/id/mydomain/> .
   @prefix core:  <https://harness-ontology.dev/id/core/> .
   @prefix owl:   <http://www.w3.org/2002/07/owl#> .
   @prefix skos:  <http://www.w3.org/2004/02/skos/core#> .

   <https://harness-ontology.dev/data/mydomain> a owl:Ontology ;
       owl:imports <https://harness-ontology.dev/schema> ,
                   <https://harness-ontology.dev/data/core/tools> ,
                   <https://harness-ontology.dev/data/core/guardrails> .
   ```

3. Add a `catalog-v001.xml` that resolves every imported IRI to a local path:
   the schema (and shapes) to your **harness-functional** clone, each
   `.../data/core/<type>` unit to your **harness-concrete** clone, and your data
   unit to its local file (see the CI template `docs/ci/data-repo-validate.yml`,
   including its note that the template itself still assumes a single checkout).
4. Copy `docs/ci/data-repo-validate.yml` to `.github/workflows/validate.yml`
   and set its three `env` values.

## IRI naming (D3)

- Mint every individual as `https://harness-ontology.dev/id/<domain>/<slug>`.
  Pick a `<domain>` segment unlikely to collide (project/org name). `core` is
  **reserved** for the central ontology.
- In Turtle this is just the `id:` prefix binding (above) — node bodies stay
  `id:<slug>` with the usual prefixes and kebab-full-word slugs
  (`ONTOLOGYSTYLE.md §2`: `h-…`, `tool-…`, `gr-…`, `sp-…`, `c-…`, …).
- To reference a **shared central node**, use the `core:` prefix
  (`core:tool-editor`, `core:gr-lang`, `core:h-coding`). It resolves to the same
  IRI in the union, so the cross-domain edge is real and validated.
- Do **not** invent new `ho:` classes/properties. Reuse the TBox vocabulary and
  existing `ho:Concept` tags (anti-drift). A genuinely new concept must be
  connected in the same PR (a `skos:broader` parent or something it `ho:tagged`),
  or validation flags it as an orphan — and it declares its content axis with
  `ho:conceptFacet` (below); connectedness alone is no longer the whole rule.

## Required predicates (anti-orphan / anti-rot)

Every node you author must carry:

- `skos:prefLabel` — mandatory, unique within its class (synonyms → `skos:altLabel`).
- `ho:maturity` — new work starts at `"draft"`; maintainers promote it.
- `ho:tokenEstimate` — on **any text-bearing node** (`ho:promptText` holders:
  SystemPrompt / Instruction / Guardrail / Example, plus Tool / Workflow). This
  keeps `retrieve.py` projections budget-accurate (context-rot defense).
- `ho:tagged` at least one `ho:Concept` so the node is discoverable and not an
  orphan island.
- `ho:conceptFacet` — on `ho:Concept` nodes: one closed value (`anatomy` |
  `quality` | `method` | `domain` | `scope`) declaring what the term is an axis
  *about*. Recommended for your repo-local concepts, **mandatory** for concepts
  in the central `id/core/` namespace. Choose the value with
  `ONTOLOGYSTYLE.md §3`'s ordered test and its parent tie-break — §3 is the
  origin of that rule, so it is not restated here.

That last one is enforced in two places on purpose. The shapes close the **value
set** (`ho:ConceptFacetShape`: one value, one of the five) but carry **no
`sh:minCount`**: this shapes file is the federation gate that validates *your*
union too, so a presence constraint here would fail every data repo whose
concepts predate the axis (harness-concrete alone carried ~239 at the time of
that decision). Central
coverage is enforced instead by `tools/lint_uniformity.py`, scoped to the
`id/core/` namespace and not part of your repo's CI — a missing facet therefore
surfaces in that linter, never in `validate.py`. Do not "fix" the asymmetry by
tightening the shapes.

A new `Harness` must satisfy `ho:HarnessShape`: 1 `SystemPrompt` + ≥1 `Workflow`
+ tools + guardrails + `ModelConfig`, and every `requiresCapability` must be
`providedCapability` by one of its own components (buildable). Reuse central
components via `core:` where possible.

## Validate-then-PR (D4)

The invariants only hold over the **union** (central TBox + core + your data), so
always validate the composed union, never your file alone.

1. Clone the two central repos next to your data repo (your catalog points at
   them):
   ```bash
   git clone https://github.com/cpark90/harness-functional central   # TBox + shapes + tools
   git clone https://github.com/cpark90/harness-concrete   concrete  # core parts (id/core/ nodes)
   pip install -r central/requirements.txt   # rdflib / pyshacl / owlrl
   ```
   The second clone is only needed if your data imports any
   `.../data/core/<type>` unit; the shapes always come from `central/`
   (`validate.py` resolves them relative to its own checkout).
2. Validate the union locally (use an interpreter that has the three deps;
   `/usr/bin/python3` here):
   ```bash
   HARNESS_CATALOG="$PWD/catalog-v001.xml" \
   HARNESS_ROOT_ONTOLOGY="https://harness-ontology.dev/data/mydomain" \
   /usr/bin/python3 central/tools/validate.py      # must print PASS
   ```
   `HARNESS_CATALOG` points the central loader at your catalog; `HARNESS_ROOT_ONTOLOGY`
   names the ontology whose `owl:imports` closure is your union. Shapes come from
   the central checkout.
3. Optionally preview retrieval to confirm your nodes surface:
   ```bash
   HARNESS_CATALOG="$PWD/catalog-v001.xml" \
   HARNESS_ROOT_ONTOLOGY="https://harness-ontology.dev/data/mydomain" \
   /usr/bin/python3 central/tools/retrieve.py "<request your harness answers>"
   ```
4. Open a PR. Your repo's CI (`docs/ci/data-repo-validate.yml`) re-runs the same
   union validation and gates the merge.

By contributing you agree your contributions are licensed under the project's
[Apache License 2.0](../LICENSE).
