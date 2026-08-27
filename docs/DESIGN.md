# Design: a harness ontology that scales without rot

## Terminology: ontology vs knowledge graph

Two layers are built here, and the namespaces already keep them apart:

- **Harness ontology** = the schema — OWL classes/properties + SHACL shapes that
  say what a harness is made of. `ontology/tbox/`, `ontology/shapes/`; IRI
  `https://harness-ontology.dev/schema`.
- **Harness knowledge graph** = the instances described with that schema — the
  actual harnesses, tools, guardrails, concepts. `ontology/abox/`; data graphs
  `https://harness-ontology.dev/data/<domain>/<type>`; individuals
  `https://harness-ontology.dev/id/<domain>/<slug>`.
- In prose: the **ontology** constrains, the **knowledge graph** grows.
- `ontology/` is the store directory that holds *both* layers, not a third
  thing. Renaming it was considered and **rejected**: the `/schema` · `/data` ·
  `/id` split already carries the distinction, while the path string is
  referenced by ~90 files (about a third of them code, catalog, Makefile,
  compose) and by external federation repos that map the central IRIs through
  their own catalog.

## The core tension

Two requirements pull in opposite directions:

- **Formal ontology (OWL)** gives connectivity guarantees, reasoning, and a
  controlled vocabulary. This is exactly what kills *orphaned nodes* and
  *context drift*.
- But a **large OWL graph fed whole to an agent** is the textbook cause of
  *context rot* — the more you load, the worse retrieval and reasoning get.

The resolution is a **two-layer split**:

```
        ┌─────────────────────────────────────────┐
        │  STORAGE = formal OWL (single source of  │   validated, never
        │  truth): TBox + ABox + SHACL, reasoned   │   read whole
        └─────────────────────────────────────────┘
                         │  projection (per request)
                         ▼
        ┌─────────────────────────────────────────┐
        │  READING = a small, budgeted context     │   what the composing
        │  pack: only the relevant subgraph        │   agent actually sees
        └─────────────────────────────────────────┘
```

Formality is spent at *write/validate* time; the agent reads a distilled
projection at *use* time. The knowledge graph can grow to any size and the
agent's context stays bounded.

## How each failure mode is prevented

### Orphaned nodes → structural validation (`tools/validate.py`)

Three independent nets, all gating (non-zero exit → CI fails):

1. **SHACL connectivity shapes** (`ontology/shapes/harness-shapes.ttl`).
   Run on the *reasoned* graph, so inferred inverses/subclasses are visible.
   - every `HarnessComponent` must be `hasComponent`-linked from ≥1 harness
   - every `Task` must be addressed or sit in the task taxonomy
   - every `Capability` must be required or provided
   - every `Concept` must tag something or sit in the SKOS hierarchy
2. **Global reachability check** — BFS from all `Harness` roots over the
   undirected instance graph; anything unreached is a disconnected *island*
   SHACL's node-local rules can miss.
3. **Capability satisfaction** — every capability a harness `requires` must be
   `provided` by one of its own components, so a "connected" harness is also
   actually buildable.

### Context drift → controlled vocabulary + reasoning + dedup

- The **TBox is the only vocabulary.** New nodes must reuse existing classes,
  properties, and `skos:Concept` tags; SHACL `sh:class` constraints reject an
  edge that points at the wrong type, so meaning can't silently fork.
- **`skos:prefLabel` is mandatory and unique-per-class** (`validate.py`
  duplicate check), with `skos:altLabel` for synonyms — so "RAG" and
  "Document retrieval" resolve to one node instead of drifting into two.
- **OWL RL reasoning** normalises the graph (inverses, subclass typing,
  transitivity) so downstream tools see one canonical shape.
- `owl:versionInfo` + `ho:maturity` (`draft|reviewed|stable|deprecated`) +
  git make every change reviewable.

### Context rot → bounded, relevance-ranked projection (`tools/retrieve.py`)

The agent never sees the whole graph. For each request:

1. **Entry-point selection** — lexically rank individuals against the request
   (prefLabel/altLabel/definition/type), scaled by a `ho:salience` prior.
2. **Bounded traversal** — priority BFS from the seeds along typed edges.
   Relevance decays by hop distance (`HOP_DECAY`) and per-predicate weight
   (composition/capability edges strong, `skos:related` weak), and admission
   stops at a **token budget** (`ho:tokenEstimate` per node). The pack cannot
   grow without limit no matter how big the knowledge graph gets.
3. **Projection** — emit a compact, self-contained brief: ranked base-harness
   candidates, the in-scope nodes grouped by type, the edges among them, and
   **capability gaps** the composer must fill.

Because the output is relevance-first and budget-capped, doubling the knowledge
graph does not double (or degrade) the agent's context.

## Composition: from pack to harness

The context pack is designed to be *the entire input* an agent needs to emit a
new harness. Recommended procedure (see `CLAUDE.md`):

1. Retrieve a pack for the request.
2. Pick the top base-harness candidate as a template (or start from a
   `DesignPattern` if none fit).
3. Satisfy every `requiresCapability` by binding a component that
   `providesCapability` it — the pack lists the gaps explicitly.
4. Assemble: system prompt + workflow + tools + guardrails + model config.
5. Write the result back as new ABox individuals (`ho:derivedFrom` the
   template, `ho:maturity "draft"`) and **re-run `validate.py`** — new nodes
   are held to the same anti-orphan / anti-drift invariants. The knowledge graph
   compounds instead of rotting.

## Why not just RAG over text, or a vector DB?

Plain text chunking has no connectivity guarantee — orphaned and duplicated
knowledge is invisible until it produces a bad answer. The formal layer makes
those defects *fail the build*, while the projection layer gives RAG-style
context economy. You get both.
