#!/usr/bin/env python3
"""Validate the harness ontology.

Layers of defense (rationale: agentic-knowledge-base chunk d-0014 "three failure modes and three defenses"):
  1. OWL RL reasoning        -> logical consistency, type/inverse closure
  2. SHACL shapes            -> local structural invariants (orphans, drift)
  3. Global reachability     -> disconnected islands (orphan components)
  4. Capability satisfaction -> every harness can actually be built
  5. Duplicate detection     -> vocabulary drift / redundant nodes

Exit code is non-zero if any hard check fails, so this drops straight
into CI / a pre-commit gate.

Usage:
    python3 tools/validate.py            # human summary (prints PASS/FAIL)
    python3 tools/validate.py --json     # structured JSON (for the web UI / CI)
"""
from __future__ import annotations

import argparse
import contextlib
import io
import json
import os
import sys
from collections import defaultdict, deque

from rdflib import Graph, RDF, RDFS, URIRef
from rdflib.namespace import SKOS

import ontology_lib as lib
from ontology_lib import HO


def _print_header(title: str) -> None:
    print(f"\n=== {title} ===")


def check_shacl(data: Graph):
    """Returns (conforms, report_text). report_text is '' when it conforms."""
    from pyshacl import validate
    shapes = Graph()
    shapes.parse(os.path.join(lib.ONT_DIR, "shapes", "harness-shapes.ttl"),
                 format="turtle")
    conforms, _report_graph, report_text = validate(
        data_graph=data,
        shacl_graph=shapes,
        inference="none",          # we already reasoned
        advanced=True,             # sh:or, inversePath
        meta_shacl=False,
    )
    _print_header("SHACL structural invariants")
    if conforms:
        print("✓ conforms — no orphaned/under-specified nodes")
    else:
        print("✗ SHACL violations:")
        print(report_text.strip())
    return conforms, ("" if conforms else report_text.strip())


def check_reachability(g: Graph):
    """Every individual must be weakly connected to some Harness.
    Returns (ok, orphans) where orphans is a list of {label, uri}."""
    _print_header("Global reachability (orphan islands)")
    nodes = lib.instance_nodes(g)
    adj: dict = defaultdict(set)
    for s, _p, o in lib.instance_edges(g):
        adj[s].add(o)
        adj[o].add(s)  # weak (undirected) connectivity

    roots = set(g.subjects(RDF.type, HO.Harness))
    seen: set = set()
    q = deque(roots)
    seen.update(roots)
    while q:
        n = q.popleft()
        for m in adj[n]:
            if m not in seen:
                seen.add(m)
                q.append(m)

    orphans = sorted(nodes - seen, key=lambda n: lib.label_of(g, n))
    if not orphans:
        print(f"✓ all {len(nodes)} individuals reachable from a Harness")
        return True, []
    print(f"✗ {len(orphans)} orphaned individual(s) (no path to any harness):")
    for n in orphans:
        print(f"    - {lib.label_of(g, n)}  <{n}>")
    return False, [{"label": lib.label_of(g, n), "uri": str(n)} for n in orphans]


def check_capability_satisfaction(g: Graph):
    """For each harness, every required capability must be provided by one
    of its own components. Returns (ok, gaps) where gaps is a list of
    {harness, missing:[...]}."""
    _print_header("Capability satisfaction")
    ok = True
    gaps = []
    for h in sorted(g.subjects(RDF.type, HO.Harness),
                    key=lambda n: lib.label_of(g, n)):
        required = set(g.objects(h, HO.requiresCapability))
        provided = set()
        for _p, comp in _components(g, h):
            provided.update(g.objects(comp, HO.providesCapability))
        gap = required - provided
        if gap:
            ok = False
            names = ", ".join(lib.label_of(g, c) for c in gap)
            print(f"✗ {lib.label_of(g, h)} is missing providers for: {names}")
            gaps.append({"harness": lib.label_of(g, h),
                         "missing": [lib.label_of(g, c) for c in gap]})
    if ok:
        print("✓ every harness's required capabilities are provided internally")
    return ok, gaps


def _components(g: Graph, harness):
    for p in (HO.hasComponent, HO.hasSystemPrompt, HO.usesTool, HO.hasGuardrail,
              HO.hasWorkflow, HO.usesModel, HO.hasExample, HO.hasInstruction):
        for o in g.objects(harness, p):
            yield p, o


def check_assembly_order(g: Graph):
    """Every harness must resolve to a TOTAL, well-defined CLAUDE.md assembly
    order (Stage c). The order lives in the graph as ho:AssemblySection nodes
    (ho:sectionKind + ho:assemblyOrder); the build projection READS it instead of
    hardcoding the section sequence, so it must be total or materialization is
    non-deterministic. Set-level check (per holder): the ho:assemblyOrder values
    within one holder's ho:hasAssemblySection set are all present and UNIQUE (a
    duplicate index makes the sequence ambiguous). Per-node presence + the
    ho:sectionKind enum are enforced by SHACL AssemblySectionShape. Also verifies
    the central default holder carries a set, so a harness that declares none can
    still resolve one (approved decision 2: an undefined order is an error, never
    a silent code fallback). Returns (ok, problems)."""
    _print_header("Assembly order (total, well-defined)")
    ok = True
    problems = []

    def _check_set(holder, sections):
        nonlocal ok
        by_order = {}
        for sec in sections:
            raw = g.value(sec, HO.assemblyOrder)
            if raw is None:
                ok = False
                msg = (f"{lib.label_of(g, holder)}: section "
                       f"{lib.label_of(g, sec)} has no ho:assemblyOrder")
                print(f"✗ {msg}")
                problems.append(msg)
                continue
            order = int(raw)
            if order in by_order:
                ok = False
                msg = (f"{lib.label_of(g, holder)}: duplicate assemblyOrder "
                       f"{order} ({lib.label_of(g, by_order[order])} and "
                       f"{lib.label_of(g, sec)}) — order is not total")
                print(f"✗ {msg}")
                problems.append(msg)
            else:
                by_order[order] = sec

    harnesses = sorted(g.subjects(RDF.type, HO.Harness),
                       key=lambda n: lib.label_of(g, n))
    if not harnesses:
        # TBox-only union (the functional repo validated alone): no harness
        # instances exist, so nothing's assembly order can be undefined. The
        # invariant is enforced where the instances live — the concrete repo's
        # union gate (schema + parts library + recipe).
        print("✓ no harness instances in this union (TBox-only) — skipped")
        return True, []

    holders_with_own = set()
    for h in harnesses:
        sections = list(g.objects(h, HO.hasAssemblySection))
        if sections:
            holders_with_own.add(h)
            _check_set(h, sections)

    default_sections = list(
        g.objects(lib.DEFAULT_ASSEMBLY_HOLDER, HO.hasAssemblySection))
    if not default_sections:
        ok = False
        msg = (f"central default holder <{lib.DEFAULT_ASSEMBLY_HOLDER}> carries "
               f"no ho:hasAssemblySection — harnesses without their own order "
               f"cannot resolve one")
        print(f"✗ {msg}")
        problems.append(msg)

    if ok:
        n = len(holders_with_own)
        print(f"✓ {n} harness(es) declare a total assembly order; "
              f"default holder resolves ({len(default_sections)} sections)")
    return ok, problems


def check_capacity_fit(g: Graph):
    """Every ho:Agent that declares a ho:cognitiveCapacity must have its realized
    observation fit within it: the sum of ho:observedTokenVolume over the agent's
    AreasOfObservation (reached by ho:agentObservation → ObservationSpace →
    ho:hasAreaOfObservation) must be ≤ ho:cognitiveCapacity. This is the loss-free
    capacity fit the ho:cognitiveCapacity / ho:observedTokenVolume definitions
    describe; SHACL cannot sum, so this arithmetic invariant is enforced here.
    Over capacity == context-rot (the role should be decomposed or its observation
    narrowed) and is a HARD FAIL. Returns (ok, rows)."""
    _print_header("Capacity fit (Σ observed volume ≤ cognitive capacity)")
    ok = True
    rows = []
    for agent in sorted(g.subjects(RDF.type, HO.Agent),
                        key=lambda n: lib.label_of(g, n)):
        cap_val = g.value(agent, HO.cognitiveCapacity)
        if cap_val is None:
            continue
        cap = int(cap_val)
        total = 0
        for space in g.objects(agent, HO.agentObservation):
            for aoo in g.objects(space, HO.hasAreaOfObservation):
                vol = g.value(aoo, HO.observedTokenVolume)
                if vol is not None:
                    total += int(vol)
        slack = cap - total
        rows.append({"agent": lib.label_of(g, agent), "capacity": cap,
                     "volume": total, "slack": slack})
        if total > cap:
            ok = False
            print(f"✗ {lib.label_of(g, agent)} over capacity: "
                  f"Σvol {total} > cap {cap} (over by {-slack})")
        else:
            print(f"✓ {lib.label_of(g, agent)}: {total}/{cap} (slack {slack})")
    if not rows:
        print("✓ no agent declares a cognitive capacity to check")
    elif ok:
        print(f"✓ all {len(rows)} agent(s) fit within their cognitive capacity")
    return ok, rows


def check_registry_drift(g: Graph):
    """The literal ontology_lib.INSTANCE_CLASSES registry must list every ho:
    class that is actually instantiated in the abox AND lives in the harness
    subtree — rdfs:subClassOf* ho:HarnessComponent or ho:SpecConcept, or is
    ho:Harness itself. Such a class MISSING from the registry silently vanishes
    from lib.instance_nodes: its individuals drop out of the count, the
    reachability walk and every retrieve pack (the recurring B3 defect). Neither
    reasoning nor SHACL catches it because the registry is Python, not graph, so
    this axis guards it explicitly.

    The in-scope class set is a reverse rdfs:subClassOf* BFS from the two subtree
    roots over ASSERTED TBox edges; "instantiated" is likewise measured against
    ASSERTED rdf:type (an unreasoned reload) so inferred intermediate
    superclasses — which carry no direct instances — are never spuriously
    required. Extras (registered but not instantiated, e.g.
    ho:Candidate/ho:Example/ho:HarnessComponent) are harmless and only warned. A
    missing in-scope class is a HARD FAIL naming the class. Returns (ok, info)."""
    _print_header("Registry drift (INSTANCE_CLASSES vs instantiated classes)")
    raw = lib.load_graph(reason=False)

    # In-scope classes: reverse rdfs:subClassOf* closure of the two subtree roots
    # over asserted TBox edges, plus ho:Harness itself.
    children: dict = defaultdict(set)
    for sub, sup in raw.subject_objects(RDFS.subClassOf):
        if isinstance(sub, URIRef):
            children[sup].add(sub)
    in_scope: set = {HO.Harness}
    q = deque([HO.HarnessComponent, HO.SpecConcept])
    while q:
        c = q.popleft()
        if c in in_scope:
            continue
        in_scope.add(c)
        q.extend(children[c])

    # ho: classes carrying ≥1 ASSERTED abox instance.
    instantiated = {t for _s, t in raw.subject_objects(RDF.type)
                    if isinstance(t, URIRef) and str(t).startswith(str(HO))}

    expected = instantiated & in_scope
    missing = sorted(expected - lib.INSTANCE_CLASSES, key=str)
    extra = sorted((lib.INSTANCE_CLASSES & in_scope) - instantiated, key=str)

    ok = not missing
    if missing:
        names = ", ".join(m.split("#")[-1] for m in missing)
        print(f"✗ {len(missing)} instantiated in-scope class(es) missing from "
              f"INSTANCE_CLASSES (individuals would vanish): {names}")
    else:
        print(f"✓ all {len(expected)} instantiated in-scope class(es) are "
              f"registered in INSTANCE_CLASSES")
    if extra:
        names = ", ".join(e.split("#")[-1] for e in extra)
        print(f"⚠ {len(extra)} registered but not instantiated (harmless): "
              f"{names}")
    return ok, {"missing": [str(m) for m in missing],
                "extra": [str(e) for e in extra]}


def check_duplicates(g: Graph):
    """Same class + same (case-folded) prefLabel == likely drift/dup.
    Advisory (does not fail the build). Returns a list of dup groups."""
    _print_header("Duplicate / drift detection (warning only)")
    by_key = defaultdict(list)
    for n in lib.instance_nodes(g):
        label = lib.label_of(g, n).strip().lower()
        types = tuple(lib.most_specific_types(g, n))
        by_key[(types, label)].append(n)
    dups = {k: v for k, v in by_key.items() if len(v) > 1}
    if not dups:
        print("✓ no duplicate labels within a class")
    else:
        for (types, label), members in dups.items():
            tnames = "/".join(t.split("#")[-1] for t in types)
            print(f"⚠ {len(members)} '{label}' [{tnames}] share a label:")
            for m in members:
                print(f"    - <{m}>")
    return [{"label": label,
             "types": [t.split("#")[-1] for t in types],
             "members": [str(m) for m in members]}
            for (types, label), members in dups.items()]


def run_structured() -> dict:
    """Load from disk, run every check, and return a structured result dict.
    Human prints are captured (kept out of the returned data) so callers like
    the web UI / CI get clean JSON. Reloads the graph so the verdict is always
    against current on-disk TTL."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        g = lib.load_graph(reason=True)
        shacl_ok, shacl_report = check_shacl(g)
        reach_ok, orphans = check_reachability(g)
        cap_ok, gaps = check_capability_satisfaction(g)
        assembly_ok, assembly_problems = check_assembly_order(g)
        capacity_ok, capacity_rows = check_capacity_fit(g)
        registry_ok, registry_info = check_registry_drift(g)
        dups = check_duplicates(g)
    hard_ok = (shacl_ok and reach_ok and cap_ok and assembly_ok
               and capacity_ok and registry_ok)
    return {
        "pass": hard_ok,
        "triples": len(g),
        "shacl": {"ok": shacl_ok, "report": shacl_report},
        "reachability": {"ok": reach_ok, "orphans": orphans},
        "capabilities": {"ok": cap_ok, "gaps": gaps},
        "assemblyOrder": {"ok": assembly_ok, "problems": assembly_problems},
        "capacityFit": {"ok": capacity_ok, "agents": capacity_rows},
        "registryDrift": {"ok": registry_ok, **registry_info},
        "duplicates": dups,
    }


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Validate the harness ontology.")
    ap.add_argument("--json", action="store_true",
                    help="emit structured JSON instead of the human summary")
    args = ap.parse_args(argv)

    if args.json:
        try:
            result = run_structured()
        except Exception as exc:  # noqa: BLE001
            print(json.dumps({"pass": False, "error": str(exc)}))
            return 2
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result["pass"] else 1

    print("Loading ontology and applying OWL RL reasoning...")
    try:
        g = lib.load_graph(reason=True)
    except Exception as exc:  # noqa: BLE001
        print(f"✗ failed to load/reason: {exc}")
        return 2
    print(f"  loaded graph: {len(g)} triples (post-reasoning)")

    results = {
        "SHACL": check_shacl(g)[0],
        "reachability": check_reachability(g)[0],
        "capabilities": check_capability_satisfaction(g)[0],
        "assemblyOrder": check_assembly_order(g)[0],
        "capacityFit": check_capacity_fit(g)[0],
        "registryDrift": check_registry_drift(g)[0],
    }
    check_duplicates(g)  # advisory

    _print_header("Summary")
    hard_ok = all(results.values())
    for name, ok in results.items():
        print(f"  {'✓' if ok else '✗'} {name}")
    print(f"\n{'PASS' if hard_ok else 'FAIL'}")
    return 0 if hard_ok else 1


if __name__ == "__main__":
    sys.exit(main())
