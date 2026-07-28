#!/usr/bin/env python3
"""Request-scoped projection of the harness ontology.

This is the context-rot defense. The ontology is NEVER handed to an agent
whole. Given a request we:

  1. select entry points   — lexically rank individuals against the request
  2. bounded traversal     — priority BFS along typed edges, decaying by
                             hop distance and predicate weight, capped by a
                             TOKEN BUDGET so the pack cannot grow without limit
  3. project a context pack — a compact, self-contained brief (relevant nodes,
                             the edges among them, base-harness candidates,
                             and capability gaps to fill)

Output is small and relevant by construction, so a large ontology does not
translate into a large, rotting context window.

Usage:
    python3 tools/retrieve.py "build me an agent that fixes bugs and runs tests"
    python3 tools/retrieve.py "cited research summary" --budget 600 --format json
"""
from __future__ import annotations

import argparse
import heapq
import json
import re
import sys
from collections import defaultdict

from rdflib import Graph, RDF
from rdflib.namespace import SKOS

import ontology_lib as lib
from ontology_lib import HO

# --- tuning knobs -----------------------------------------------------
HOP_DECAY = 0.75
DEFAULT_BUDGET = 900          # token budget for the projected pack
MAX_SEEDS = 8
MIN_NODE_TOKENS = 5

PREDICATE_WEIGHT = {
    HO.hasComponent: 0.9, HO.componentOf: 0.9, HO.hasSystemPrompt: 0.9,
    HO.usesTool: 0.9, HO.hasGuardrail: 0.9, HO.hasHook: 0.9, HO.hasWorkflow: 0.9,
    HO.usesModel: 0.85, HO.hasExample: 0.8, HO.hasInstruction: 0.85,
    HO.providesCapability: 0.85, HO.requiresCapability: 0.85,
    HO.targetsDomain: 0.8, HO.addressesTask: 0.8, HO.addressedBy: 0.8,
    HO.appliesPattern: 0.7, HO.hasExecutionMode: 0.7,
    HO.dependsOn: 0.7, HO.tagged: 0.7,
    HO.specializes: 0.6, HO.derivedFrom: 0.6, HO.constrainedBy: 0.6,
    SKOS.broader: 0.5, SKOS.narrower: 0.5, SKOS.related: 0.4,
}

STOPWORDS = {
    "a", "an", "the", "that", "this", "with", "and", "or", "for", "to", "of",
    "me", "my", "build", "make", "create", "agent", "harness", "want", "need",
    "can", "run", "runs", "it", "on", "in", "is", "be", "who", "which",
}


# --- 1. entry-point selection ----------------------------------------
def tokenize(text: str) -> list[str]:
    terms = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in terms if t not in STOPWORDS and len(t) > 2]


def node_text_fields(g: Graph, node) -> list[tuple[str, float]]:
    fields = []
    for val in g.objects(node, SKOS.prefLabel):
        fields.append((str(val).lower(), 3.0))
    for val in g.objects(node, SKOS.altLabel):
        fields.append((str(val).lower(), 2.5))
    for val in g.objects(node, SKOS.definition):
        fields.append((str(val).lower(), 1.0))
    for val in g.objects(node, HO.promptText):
        fields.append((str(val).lower(), 0.6))
    for t in lib.most_specific_types(g, node):
        fields.append((t.split("#")[-1].lower(), 1.5))
    return fields


def maturity_values(g: Graph, node) -> list[str]:
    # Sorted, not g.value(): ho:maturity has no sh:maxCount, and picking an
    # arbitrary one of several would leak iteration order into the pack.
    return sorted(str(v) for v in g.objects(node, HO.maturity))


def maturity_of(g: Graph, node) -> str | None:
    vals = maturity_values(g, node)
    return vals[0] if vals else None


# Secondary ranking key: more mature parts win a score tie. ho:salience was the
# first candidate but covers only ~2% of the store (useless as a key), whereas
# ho:maturity covers ~67%. A missing/unknown maturity sorts last (3) but is not
# demoted in score — a node that never declared a maturity is not retired.
_MATURITY_RANK = {"stable": 0, "reviewed": 1, "draft": 2}


def maturity_rank(g: Graph, node) -> int:
    vals = maturity_values(g, node)
    if not vals:
        return 3
    return min(_MATURITY_RANK.get(v, 3) for v in vals)


# Inline ontology-internal IRI tokens (id:/core:<slug>) that appear INSIDE a
# node's skos:definition / ho:promptText prose are authored as anti-drift
# disambiguation, but a pack reader cannot follow a raw `id:` reference. Mirror
# materialize.py's IriTokenResolver on retrieve's text-emission path: resolve
# each token to the referent's prefLabel. This retrieve loads the central union,
# where the `id:` prefix binds to the core namespace, so a slug expands under
# ID_CORE; lib.label_of degrades to the bare slug for an unresolved token, so no
# `id:` prefix ever survives. Structured pack fields already use lib.label_of.
# Deterministic and idempotent (a resolved label carries no token).
_ID_TOKEN_RE = re.compile(r"\b(?:id|core):([A-Za-z][A-Za-z0-9_-]*)")


def _resolve_id_tokens(g: Graph, text):
    if text is None:
        return None
    return _ID_TOKEN_RE.sub(
        lambda m: lib.label_of(g, lib.ID_CORE[m.group(1)]), str(text))


def lexical_score(g: Graph, node, terms: list[str]) -> float:
    fields = node_text_fields(g, node)
    score = 0.0
    for term in terms:
        best = 0.0
        for text, weight in fields:
            if re.search(rf"\b{re.escape(term)}", text):
                best = max(best, weight)
        score += best
    salience = g.value(node, HO.salience)
    prior = 0.5 + (float(salience) if salience is not None else 0.4)
    return score * prior


def _rank_key(g: Graph, item: tuple[object, float]):
    """Total, process-independent ranking key for a (node, score) pair: score
    descending, then maturity rank (more mature wins a score tie), then IRI
    ascending. Only the score is negated — a plain `reverse=True` would reverse
    the tie-breakers too. The IRI stays the FINAL key so the order is still a
    total, process-independent order (determinism)."""
    node, score = item
    return (-score, maturity_rank(g, node), str(node))


def select_seeds(g: Graph, terms: list[str]) -> list[tuple[object, float]]:
    scored = []
    for n in lib.instance_nodes(g):
        s = lexical_score(g, n, terms)
        if s > 0:
            scored.append((n, s))
    # Score descending, IRI ascending. The IRI is a TOTAL tie-breaker: without
    # it the order of equally-scored seeds came from set iteration (URIRef hash
    # randomisation), and MAX_SEEDS then cut the tie group at an arbitrary
    # point — so the same request produced a different pack per process.
    scored.sort(key=lambda it: _rank_key(g, it))
    return scored[:MAX_SEEDS]


# --- 2. bounded traversal --------------------------------------------
def build_adjacency(g: Graph):
    adj = defaultdict(list)
    for s, p, o in lib.instance_edges(g):
        w = PREDICATE_WEIGHT.get(p, 0.5)
        adj[s].append((o, p, w))
        adj[o].append((s, p, w))  # undirected discovery
    return adj


def token_cost(g: Graph, node) -> int:
    est = g.value(node, HO.tokenEstimate)
    base = int(est) if est is not None else 15
    return max(base, MIN_NODE_TOKENS)


def traverse(g: Graph, seeds, budget: int):
    """Priority BFS. Returns ordered list of (node, relevance) admitted
    within the token budget."""
    adj = build_adjacency(g)
    best = {n: s for n, s in seeds}
    heap = [(-s, str(n), n) for n, s in seeds]
    heapq.heapify(heap)

    admitted, used, done = [], 0, set()
    while heap:
        neg, _key, node = heapq.heappop(heap)
        if node in done:
            continue
        score = -neg
        cost = token_cost(g, node)
        if used + cost > budget and admitted:
            # This node does not fit in what is left of the budget: SKIP it and
            # keep looking. A `break` here made one oversized node truncate the
            # whole pack — every smaller, still-affordable candidate behind it
            # in the queue was dropped with hundreds of tokens unspent. The node
            # is not marked done and its neighbours are not expanded (it is not
            # in the pack, so it cannot carry relevance into it); it is never
            # re-queued either, because a later pop's score is <= this one's and
            # `best` already holds this node's maximum.
            continue
        done.add(node)
        admitted.append((node, score))
        used += cost
        for nbr, _p, w in adj[node]:
            if nbr in done:
                continue
            cand = score * HOP_DECAY * w
            if cand > best.get(nbr, 0.0):
                best[nbr] = cand
                heapq.heappush(heap, (-cand, str(nbr), nbr))
    return admitted, used


# --- 3. projection ----------------------------------------------------
def project(g: Graph, request: str, budget: int) -> dict:
    terms = tokenize(request)
    seeds = select_seeds(g, terms)
    if not seeds:
        return {"request": request, "terms": terms, "nodes": [], "edges": [],
                "seeds": [], "candidates": [], "gaps": [], "budget_used": 0,
                "budget": budget}

    admitted, used = traverse(g, seeds, budget)
    in_scope = {n for n, _ in admitted}
    score_of = dict(admitted)

    nodes = [{
        "id": str(n),
        "label": lib.label_of(g, n),
        "types": [t.split("#")[-1] for t in lib.most_specific_types(g, n)],
        "relevance": round(sc, 3),
        "definition": _resolve_id_tokens(g, g.value(n, SKOS.definition)),
        # Lifecycle status (draft | reviewed | stable) as a STRUCTURED field,
        # so a pack reader can weigh a part's maturity without parsing prose.
        "maturity": maturity_of(g, n),
        "promptText": _truncate(_resolve_id_tokens(g, g.value(n, HO.promptText))),
        "provides": [lib.label_of(g, c) for c in g.objects(n, HO.providesCapability)],
        "requires": [lib.label_of(g, c) for c in g.objects(n, HO.requiresCapability)],
    } for n, sc in sorted(admitted, key=lambda it: _rank_key(g, it))]

    # Graph iteration order is not reproducible across processes (OWL-RL
    # materialisation inserts inferred triples in set order), so the edge list
    # is sorted on a total key: reading order first, IRIs to break ties.
    edges = [
        {"s": lib.label_of(g, s), "p": p.split("#")[-1], "o": lib.label_of(g, o)}
        for s, p, o in sorted(
            (t for t in lib.instance_edges(g)
             if t[0] in in_scope and t[2] in in_scope),
            key=lambda t: (lib.label_of(g, t[0]), t[1].split("#")[-1],
                           lib.label_of(g, t[2]), str(t[0]), str(t[1]), str(t[2])),
        )
    ]

    candidates = [
        {"label": lib.label_of(g, n), "relevance": round(score_of[n], 3)}
        for n in sorted(in_scope, key=lambda n: _rank_key(g, (n, score_of[n])))
        if (n, HO.Harness) in _typed(g)
    ]

    # capability gaps: required by an in-scope harness but not provided in scope
    provided = set()
    for n in in_scope:
        provided.update(g.objects(n, HO.providesCapability))
    gaps = []
    for h in in_scope:
        if (h, RDF.type, HO.Harness) not in g:
            continue
        for cap in g.objects(h, HO.requiresCapability):
            if cap not in provided and cap not in in_scope:
                gaps.append(lib.label_of(g, cap))

    return {
        "request": request, "terms": terms,
        "seeds": [{"label": lib.label_of(g, n), "score": round(s, 3)} for n, s in seeds],
        "nodes": nodes, "edges": edges,
        "candidates": candidates, "gaps": sorted(set(gaps)),
        "budget": budget, "budget_used": used,
    }


def _typed(g):
    return set(g.subject_objects(RDF.type))


def _truncate(val, limit=160):
    if val is None:
        return None
    s = str(val)
    return s if len(s) <= limit else s[:limit].rstrip() + "…"


# --- rendering --------------------------------------------------------
def render_markdown(pack: dict) -> str:
    out = []
    out.append(f"# Context pack for: “{pack['request']}”")
    out.append(f"_matched terms: {', '.join(pack['terms']) or '(none)'} · "
               f"budget {pack['budget_used']}/{pack['budget']} tokens · "
               f"{len(pack['nodes'])} nodes_\n")
    if not pack["nodes"]:
        out.append("**No matching knowledge.** Consider adding vocabulary/tags "
                   "to the ontology, or rephrase the request.")
        return "\n".join(out)

    if pack["candidates"]:
        out.append("## Base-harness candidates (rank order)")
        for c in pack["candidates"]:
            out.append(f"- **{c['label']}** · relevance {c['relevance']}")
        out.append("")

    by_type = defaultdict(list)
    for n in pack["nodes"]:
        by_type["/".join(n["types"]) or "Thing"].append(n)
    out.append("## Relevant knowledge (scoped subgraph)")
    for typ in sorted(by_type):
        out.append(f"### {typ}")
        for n in by_type[typ]:
            extra = []
            if n["definition"]:
                extra.append(n["definition"])
            elif n["promptText"]:
                extra.append(f"“{n['promptText']}”")
            if n["provides"]:
                extra.append("provides: " + ", ".join(n["provides"]))
            if n["requires"]:
                extra.append("requires: " + ", ".join(n["requires"]))
            tail = (" — " + " · ".join(extra)) if extra else ""
            out.append(f"- **{n['label']}** (rel {n['relevance']}){tail}")
        out.append("")

    # Structure view: hide inferred inverses and the generic hasComponent
    # roll-up (its specific sub-property edge is already shown), and cap the
    # list — the full edge set stays in the JSON output.
    hidden = {"componentOf", "addressedBy", "narrower", "hasComponent"}
    shown = [e for e in pack["edges"] if e["p"] not in hidden]
    if shown:
        out.append("## Structure (edges within scope)")
        cap = 30
        for e in shown[:cap]:
            out.append(f"- {e['s']} —[{e['p']}]→ {e['o']}")
        if len(shown) > cap:
            out.append(f"- …(+{len(shown) - cap} more edges; see --format json)")
        out.append("")

    out.append("## Capability gaps to fill")
    if pack["gaps"]:
        for gcap in pack["gaps"]:
            out.append(f"- ⚠ **{gcap}** required in scope but no provider retrieved")
    else:
        out.append("- none — required capabilities are covered by retrieved components")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("request", help="natural-language description of the harness you want")
    ap.add_argument("--budget", type=int, default=DEFAULT_BUDGET,
                    help=f"token budget for the pack (default {DEFAULT_BUDGET})")
    ap.add_argument("--format", choices=["md", "json"], default="md")
    args = ap.parse_args()

    g = lib.load_graph(reason=True)
    pack = project(g, args.request, args.budget)
    if args.format == "json":
        print(json.dumps(pack, indent=2, ensure_ascii=False))
    else:
        print(render_markdown(pack))
    return 0


if __name__ == "__main__":
    sys.exit(main())
