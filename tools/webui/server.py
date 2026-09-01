"""FastAPI backend for the ontology management web UI.

Design: the web tool does NOT fork state. It reads and writes the same
`ontology/*.ttl` (single source of truth) through the same ontology_lib /
validate / retrieve machinery the CLI and CI use, so the anti-orphan /
anti-drift / anti-rot guarantees apply identically to human and agent edits.

Two graphs are cached (both invalidated on any ontology file mtime change):
  * asserted (reason=False) — for schema / graph view / node editing, so the UI
    never shows or re-saves *inferred* triples (e.g. inverse `componentOf`).
  * reasoned  (reason=True)  — for retrieve, which ranks over the closure.
Validation always reloads from disk so the verdict is against current TTL.

  GET  /api/schema      TBox classes + properties (domain/range) -> form constraints
  GET  /api/graph       instance nodes + edges for the graph view
  GET  /api/node/{id}   one node's asserted fields
  PUT  /api/node        upsert a node (surgical TTL write) gated by validate
  POST /api/validate    structured validate.py result
  POST /api/retrieve    request-scoped context pack (retrieve.project)

2026-09 ladder split — WHERE THE EDITABLE GRAPH IS: this repo
(harness-functional) holds only the TBox + shapes; the individuals the editor
authors moved to the CONCRETE repo (harness-concrete,
`ontology/abox/core/<group>/*.ttl`). The load path composes through
HARNESS_CATALOG, but the WRITE path (ttl_writer.ABOX_DIR) and the mtime
signature are REPO-LOCAL, so served straight out of harness-functional the
editor sees an empty ABox. See ttl_writer.abox_files() — repointing the write
path is a behaviour change, not a docstring one.
"""
from __future__ import annotations

import glob
import os
import sys

# flat imports (ontology_lib / validate / retrieve live in tools/)
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, ".."))   # tools/
sys.path.insert(0, _HERE)                        # tools/webui/

from fastapi import Body, FastAPI, HTTPException           # noqa: E402
from fastapi.responses import HTMLResponse                 # noqa: E402
from fastapi.staticfiles import StaticFiles                # noqa: E402
from rdflib import Literal, RDF, RDFS, URIRef              # noqa: E402
from rdflib.namespace import OWL, SKOS                      # noqa: E402

import ontology_lib as lib                                  # noqa: E402
from ontology_lib import HO                                 # noqa: E402
import validate as validator                                # noqa: E402
import retrieve                                             # noqa: E402
import ttl_writer                                           # noqa: E402

HO_NS = "https://harness-ontology.dev/schema#"
# The webui authors/edits in the `core` domain (D3, docs/federation-design.md);
# `id:` binds to the core sub-namespace so qnames round-trip for central nodes.
# Nodes in other domains (e.g. .../id/lpranging/) surface as full IRIs.
ID_NS = "https://harness-ontology.dev/id/core/"
_NS = {"ho": HO_NS, "id": ID_NS, "skos": str(SKOS), "rdfs": str(RDFS),
       "rdf": str(RDF), "owl": str(OWL)}

# Literal predicates the editor renders as first-class form fields. This is NOT
# a filter — GET returns EVERY literal predicate a node carries (see api_node,
# which splits on the RDF term type), so the editor can see and round-trip any
# datatype value. Dropping the old 7-predicate whitelist is what closes the
# save-side data-loss path (a literal absent from GET could never be re-sent).
KNOWN_LITERAL_FIELDS = {"skos:prefLabel", "skos:altLabel", "skos:definition",
                        "ho:promptText", "ho:tokenEstimate", "ho:salience",
                        "ho:maturity"}

# SKOS relational predicates the editor should surface so they round-trip
# (they are not ho: object properties, so the tbox scan below won't find them).
SKOS_OBJ_PROPS = [
    {"id": "skos:broader", "label": "broader", "range": "ho:Concept", "domain": "ho:Concept"},
    {"id": "skos:narrower", "label": "narrower", "range": "ho:Concept", "domain": "ho:Concept"},
    {"id": "skos:related", "label": "related", "range": "ho:Concept", "domain": "ho:Concept"},
    {"id": "skos:topConceptOf", "label": "top concept of", "range": None, "domain": "ho:Concept"},
]

app = FastAPI(title="Harness ontology manager")

_cache: dict = {"asserted": None, "reasoned": None, "sig": None}


def _signature():
    files = sorted(glob.glob(os.path.join(lib.ONT_DIR, "**", "*.ttl"),
                             recursive=True))
    return tuple((f, os.path.getmtime(f)) for f in files if os.path.exists(f))


def _graph(kind: str):
    sig = _signature()
    if _cache["sig"] != sig:
        _cache["asserted"] = _cache["reasoned"] = None
        _cache["sig"] = sig
    if _cache[kind] is None:
        _cache[kind] = lib.load_graph(reason=(kind == "reasoned"))
    return _cache[kind]


def _invalidate():
    _cache["asserted"] = _cache["reasoned"] = _cache["sig"] = None


def qname(uri) -> str:
    u = str(uri)
    for pfx, ns in _NS.items():
        if u.startswith(ns):
            return f"{pfx}:{u[len(ns):]}"
    return u


def expand(q: str) -> URIRef:
    if ":" in q:
        pfx, local = q.split(":", 1)
        if pfx in _NS:
            return URIRef(_NS[pfx] + local)
    return URIRef(q)


def abox_mtimes() -> dict:
    # Key by path RELATIVE to the ABox root, not basename: the DA-4 group
    # directories can hold same-named files (e.g. spec/patterns.ttl vs
    # process/patterns.ttl), and a basename key would let two files share one
    # optimistic-lock slot and silently mask a concurrent edit. ttl_writer.
    # _check_mtime uses the same relpath key.
    return {os.path.relpath(p, ttl_writer.ABOX_DIR): os.path.getmtime(p)
            for p in ttl_writer.abox_files()}


# --- schema: drives the vocabulary-constrained forms -------------------------
@app.get("/api/schema")
def api_schema():
    g = _graph("asserted")
    classes = []
    for c in g.subjects(RDF.type, OWL.Class):
        if not str(c).startswith(HO_NS):
            continue
        supers = [qname(s) for s in g.objects(c, RDFS.subClassOf)
                  if str(s).startswith(HO_NS)]
        classes.append({"id": qname(c), "label": lib.label_of(g, c), "super": supers})
    obj_props, data_props = [], []
    for p in g.subjects(RDF.type, OWL.ObjectProperty):
        if not str(p).startswith(HO_NS):
            continue
        rng = next((qname(r) for r in g.objects(p, RDFS.range)), None)
        dom = next((qname(d) for d in g.objects(p, RDFS.domain)), None)
        obj_props.append({"id": qname(p), "label": lib.label_of(g, p),
                          "range": rng, "domain": dom})
    for p in g.subjects(RDF.type, OWL.DatatypeProperty):
        if not str(p).startswith(HO_NS):
            continue
        rng = next((qname(r) for r in g.objects(p, RDFS.range)), None)
        data_props.append({"id": qname(p), "label": lib.label_of(g, p), "range": rng})
    return {"classes": sorted(classes, key=lambda c: c["label"]),
            "objectProperties": sorted(obj_props, key=lambda p: p["id"]) + SKOS_OBJ_PROPS,
            "datatypeProperties": sorted(data_props, key=lambda p: p["id"])}


# --- graph view (asserted edges only) ----------------------------------------
@app.get("/api/graph")
def api_graph():
    g = _graph("asserted")
    nodes = [{
        "id": qname(n),
        "label": lib.label_of(g, n),
        "types": [t.split("#")[-1] for t in lib.most_specific_types(g, n)],
        "maturity": (str(g.value(n, HO.maturity)) if g.value(n, HO.maturity) else None),
    } for n in lib.instance_nodes(g)]
    edges = [{"s": qname(s), "p": qname(p), "o": qname(o)}
             for s, p, o in lib.instance_edges(g)]
    return {"nodes": sorted(nodes, key=lambda x: (x["types"], x["label"])), "edges": edges}


# --- single node (asserted fields) -------------------------------------------
@app.get("/api/node/{node_id}")
def api_node(node_id: str):
    g = _graph("asserted")
    uri = expand(node_id if node_id.startswith("id:") else "id:" + node_id)
    preds = list(g.predicate_objects(uri))
    if not preds:
        raise HTTPException(404, f"node {node_id} not found")
    types = lib.most_specific_types(g, uri)
    node = {"id": qname(uri), "type": (qname(types[0]) if types else None),
            "objectProps": {}, "dataProps": {}}
    for p, o in preds:
        if p == RDF.type:
            continue
        pq = qname(p)
        # Split on the RDF term type, not a predicate whitelist: EVERY literal
        # is returned (so any datatype value can round-trip through the editor)
        # and every URIRef object is an edge. This is the read side of the
        # save-merge; a literal that GET omitted could never be re-sent.
        if isinstance(o, Literal):
            node["dataProps"].setdefault(pq, []).append(str(o))
        elif isinstance(o, URIRef):
            node["objectProps"].setdefault(pq, []).append(qname(o))
    return node


# --- upsert (surgical write, validate-gated) ---------------------------------
@app.put("/api/node")
def api_put_node(node: dict = Body(...)):
    if not node.get("id") or not node.get("type"):
        raise HTTPException(400, "node needs 'id' and 'type'")
    if not node["id"].startswith("id:"):
        node["id"] = "id:" + node["id"]
    try:
        plan = ttl_writer.plan_upsert(node, expected_mtimes=node.get("_mtimes"))
    except ttl_writer.Conflict as exc:
        raise HTTPException(409, str(exc))
    if plan["new"] is None:
        raise HTTPException(500, "could not locate node block to replace")

    ttl_writer.atomic_write(plan["file"], plan["new"])
    _invalidate()
    result = validator.run_structured()
    diff = _unified(plan["old"] or "", plan["new"], os.path.basename(plan["file"]))
    if not result["pass"]:
        ttl_writer.restore(plan["file"], plan["old"] or "", plan["created"])
        _invalidate()
        return {"saved": False, "validate": result, "diff": diff,
                "file": os.path.basename(plan["file"])}
    return {"saved": True, "validate": result, "diff": diff,
            "file": os.path.basename(plan["file"]), "mtimes": abox_mtimes()}


@app.post("/api/validate")
def api_validate():
    _invalidate()
    return validator.run_structured()


@app.post("/api/retrieve")
def api_retrieve(payload: dict = Body(...)):
    request = (payload or {}).get("request", "")
    budget = int((payload or {}).get("budget", retrieve.DEFAULT_BUDGET))
    if not request.strip():
        raise HTTPException(400, "empty request")
    return retrieve.project(_graph("reasoned"), request, budget)


def _unified(old: str, new: str, name: str) -> str:
    import difflib
    return "".join(difflib.unified_diff(
        old.splitlines(keepends=True), new.splitlines(keepends=True),
        fromfile=f"a/{name}", tofile=f"b/{name}"))


# static SPA (mounted last so /api/* wins). The Svelte frontend is a build
# artifact (gitignored); on a fresh clone `static/` may be empty. If so, mounting
# StaticFiles would raise at import time, so we serve a friendly 503 instead —
# the /api/* routes above keep working (they are more specific paths).
_STATIC = os.path.join(_HERE, "static")

if os.path.exists(os.path.join(_STATIC, "index.html")):
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="static")
else:
    _UNBUILT_HTML = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>Harness Ontology Manager</title>
<style>body{font:15px/1.6 system-ui,sans-serif;max-width:640px;margin:60px auto;
padding:0 20px;color:#1c2430}code{background:#eef2fb;padding:1px 5px;border-radius:4px}
h1{font-size:18px}</style></head><body>
<h1>프론트엔드가 아직 빌드되지 않았습니다 · Frontend not built yet</h1>
<p>Svelte UI 산출물(<code>tools/webui/static/</code>)이 없습니다. 아래 중 하나로 빌드한 뒤
재기동하세요. The built UI is missing — build it, then restart:</p>
<pre><code>cd tools/webui/frontend &amp;&amp; npm install &amp;&amp; npm run build</code></pre>
<p>또는 Docker로(멀티스테이지가 대신 빌드) · or just use Docker (multi-stage build):</p>
<pre><code>docker compose up</code></pre>
<p>API(<code>/api/*</code>)는 정상 동작합니다. The API endpoints work regardless.</p>
</body></html>"""

    @app.get("/")
    def _unbuilt_notice():
        return HTMLResponse(_UNBUILT_HTML, status_code=503)
