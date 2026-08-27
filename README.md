# harness_ontology

Manage many kinds of **agent/LLM harnesses** with a formal **harness ontology**
(the OWL schema + SHACL shapes) and the **harness knowledge graph** of instances
described with it, so an agent can read the knowledge graph and compose a new
harness for a request — even as that graph grows large — without **orphaned
nodes**, **context drift**, or **context rot**.

The strategy in one line: **store formally (OWL + SHACL, validated and
connected), read narrowly (a small, budget-capped projection per request).**
See [`docs/DESIGN.md`](docs/DESIGN.md) for the full rationale.

## Layout

```
ontology/                     # store for both layers (ontology + knowledge graph)
  tbox/harness.ttl            # ontology: OWL 2 schema — classes + properties + SKOS vocab
  abox/core/*.ttl             # knowledge graph: central neutral parts library, per component type
  shapes/harness-shapes.ttl   # ontology: SHACL — connectivity + typed-edge invariants
tools/
  ontology_lib.py             # shared loader + OWL RL reasoning
  validate.py                 # reasoner + SHACL + reachability + capability + dedup
  retrieve.py                 # request-scoped bounded projection (context pack)
docs/DESIGN.md                # how the 3 failure modes are prevented
```

## Setup

```bash
pip install --user rdflib pyshacl owlrl     # add --break-system-packages if needed
```

## Validate (run this after every ontology edit)

```bash
python3 tools/validate.py
```
Checks logical consistency, SHACL structural invariants, global reachability
(no orphan islands), capability satisfaction, and duplicate labels. Non-zero
exit on failure, so it drops into CI or a pre-commit hook.

## Retrieve a context pack for a request

```bash
python3 tools/retrieve.py "an agent that fixes bugs and runs tests safely"
python3 tools/retrieve.py "cited research summary" --budget 300 --format json
```
Returns only the relevant subgraph — ranked base-harness candidates, scoped
nodes/edges, and capability gaps to fill — within a token budget.

## Manage it in your browser (Docker)

```bash
docker compose up            # → http://127.0.0.1:8000
```
A local web UI to browse the graph, edit nodes with **vocabulary-constrained
forms** (the class/property pickers come from the TBox, so you can't create a
near-synonym class or an untyped edge), and save through a **`validate.py` gate**
with a TTL diff preview — the same anti-orphan / anti-drift invariants, now
visual. It reads and writes the host's `ontology/*.ttl` directly (bind-mounted),
so the flat TTL stays the single source of truth. It binds to `127.0.0.1` and
has no auth: it is a local authoring aid. Collaboration is via git/PRs
(`CONTRIBUTING.md`), and CI runs `validate.py` on every PR
(`.github/workflows/validate.yml`).

The frontend is a Svelte app (built with Vite; Cytoscape.js is bundled, so the
UI runs fully offline). `docker compose up` builds it for you (multi-stage). To
run **without Docker**, build the frontend once, then serve with uvicorn:

```bash
cd tools/webui/frontend && npm install && npm run build   # → tools/webui/static/
cd ../../.. && PYTHONPATH=tools uvicorn tools.webui.server:app --port 8000
```

## Growing the knowledge graph

Add nodes to `ontology/abox/*.ttl` using the existing TBox vocabulary, then
**re-run `validate.py`**. Every new node is held to the same anti-orphan /
anti-drift rules, so the knowledge graph compounds instead of decaying. See
`CLAUDE.md` for the agent-facing authoring + composition procedure.
