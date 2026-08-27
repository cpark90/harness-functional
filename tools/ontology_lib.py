"""Shared helpers for loading and reasoning over the harness ontology.

Both validate.py and retrieve.py build on this so the graph is loaded and
reasoned identically everywhere (one source of truth).
"""
from __future__ import annotations

import glob
import os
import xml.etree.ElementTree as ET
from typing import Iterable

import rdflib
from rdflib import Graph, Namespace, URIRef, RDF, RDFS
from rdflib.namespace import OWL, SKOS

HO = Namespace("https://harness-ontology.dev/schema#")
# Entity namespaces. `ID` is the parent base; individuals now carry a domain
# segment (.../id/<domain>/<slug>) per docs/federation-design.md (D3), so the
# per-domain child namespaces are what actually prefix a node. Bound for
# readable serialisation; none of validate/retrieve serialise the union.
ID = Namespace("https://harness-ontology.dev/id/")
ID_CORE = Namespace("https://harness-ontology.dev/id/core/")
ID_LPR = Namespace("https://harness-ontology.dev/id/lpranging/")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ONT_DIR = os.path.join(ROOT, "ontology")

# The neutral base template that carries the central DEFAULT CLAUDE.md assembly
# order (ho:hasAssemblySection). A harness that declares no assembly order of its
# own inherits this one; both tools/materialize.py (which READS the order to
# emit) and tools/validate.py (which checks it is a total, well-defined order)
# resolve the default here, so the well-known location lives in one place.
DEFAULT_ASSEMBLY_HOLDER = ID_CORE["h-multiagent"]

# Federation entry points (D1): the union is the owl:imports closure of the root
# ontology, resolved to local files through the Protégé catalog. If either is
# absent the loader falls back to the legacy directory glob.
#
# A pure-data repo's CI (D4) reuses this central loader over its OWN union by
# overriding these via env: HARNESS_CATALOG points at the data repo's catalog
# (which maps the central IRIs to a local clone + its own data unit) and
# HARNESS_ROOT_ONTOLOGY names the ontology whose import closure is that union.
CATALOG = os.environ.get("HARNESS_CATALOG", os.path.join(ROOT, "catalog-v001.xml"))
ROOT_ONTOLOGY_IRI = os.environ.get(
    "HARNESS_ROOT_ONTOLOGY", "https://harness-ontology.dev/ontology")

# Predicates that connect one *instance* to another (used for the graph view
# and pack propagation). Rather than hand-maintaining a whitelist — which drifts
# out of sync every time a new ObjectProperty lands and then silently hides those
# edges — we DERIVE the set from the TBox: every `ho:` ObjectProperty links two
# individuals by definition, so `link_predicates(g)` collects them from the graph
# at call time. Only the SKOS relational predicates (not `ho:` ObjectProperties)
# are named explicitly. `instance_edges` still filters to triples whose subject
# AND object are both instance nodes, so an ObjectProperty whose range is not an
# individual simply contributes no edges.
_SKOS_LINK_PREDICATES = {SKOS.broader, SKOS.narrower, SKOS.related}


def link_predicates(g: Graph) -> set[URIRef]:
    """Instance→instance link predicates, derived from the TBox (anti-drift)."""
    preds = {p for p in g.subjects(RDF.type, OWL.ObjectProperty)
             if isinstance(p, URIRef) and str(p).startswith(str(HO))}
    return preds | _SKOS_LINK_PREDICATES

# The classes we treat as first-class ontology individuals.
#
# List every class that ABox nodes are ASSERTED as — leaves, not the
# intermediate superclasses of the DA-4 taxonomy. A leaf missing here is only
# masked while `owlrl` is on (the inferred `ho:HarnessComponent` type is in this
# set and picks the node up); with `load_graph(reason=False)` the node vanishes,
# so the individual count would differ per tool path. The invariant that catches
# it: `instance_nodes` must be the same size with and without reasoning.
# Intermediate superclasses stay OUT — they have no direct instances and would
# only add redundant lookups.
INSTANCE_CLASSES = {
    HO.Harness, HO.HarnessComponent, HO.SystemPrompt, HO.Instruction,
    HO.Tool, HO.Guardrail, HO.Hook, HO.Workflow, HO.WorkflowStep, HO.PromptSection,
    HO.AssemblySection, HO.Deliverable, HO.ModelConfig, HO.Example,
    HO.Role, HO.Agent, HO.Memory, HO.Channel, HO.Candidate, HO.Contract,
    HO.TestScenario, HO.FailurePolicy,
    HO.Capability, HO.Domain, HO.Task,
    HO.EnvironmentSpace, HO.GlobalState,
    HO.ObservationSpace, HO.AreaOfInterest, HO.AreaOfObservation,
    HO.DesignPattern, HO.ExecutionMode, HO.Constraint, HO.Concept,
    HO.Anchor,
}


def _parse_catalog(path: str) -> dict[str, str]:
    """Read a Protégé/OASIS `catalog-v001.xml` into {ontology_iri: local_path}.
    Paths are resolved relative to the catalog's own directory (Protégé
    convention). Returns {} if the catalog is missing or unparseable."""
    mapping: dict[str, str] = {}
    if not os.path.exists(path):
        return mapping
    base = os.path.dirname(os.path.abspath(path))
    try:
        tree = ET.parse(path)
    except ET.ParseError:
        return mapping
    for el in tree.iter():
        if el.tag.split("}")[-1] != "uri":
            continue
        name, uri = el.get("name"), el.get("uri")
        if name and uri:
            mapping[name] = os.path.normpath(os.path.join(base, uri))
    return mapping


def _load_via_imports(g: Graph, catalog: dict[str, str]) -> bool:
    """Assemble the union by resolving owl:imports transitively from the root
    ontology IRI through the catalog (D1). Each file is parsed once; missing
    files and shapes are skipped. Returns True if anything was parsed (so the
    caller knows whether to fall back to the glob)."""
    if ROOT_ONTOLOGY_IRI not in catalog:
        return False
    seen: set[str] = set()
    stack = [ROOT_ONTOLOGY_IRI]
    parsed_any = False
    while stack:
        iri = stack.pop()
        if iri in seen:
            continue
        seen.add(iri)
        path = catalog.get(iri)
        if not path or not os.path.exists(path):
            continue
        # Shapes are validation-only; never fold them into the data graph.
        if os.sep + "shapes" + os.sep in path:
            continue
        g.parse(path, format="turtle")
        parsed_any = True
        for o in g.objects(URIRef(iri), OWL.imports):
            stack.append(str(o))
    return parsed_any


def _load_via_glob(g: Graph) -> None:
    """Legacy fallback: parse every .ttl under ontology/ (skip shapes)."""
    for path in sorted(glob.glob(os.path.join(ONT_DIR, "**", "*.ttl"),
                                 recursive=True)):
        if os.sep + "shapes" + os.sep in path:
            continue
        g.parse(path, format="turtle")


def load_graph(reason: bool = True) -> Graph:
    """Assemble the union graph and (optionally) materialise the OWL RL closure
    so subclass typing, inverses and sub-properties are explicit — SHACL and
    traversal both rely on that.

    Composition is by owl:imports resolved through `catalog-v001.xml` (D1,
    docs/federation-design.md). If the catalog / root ontology is unavailable it
    falls back to the legacy directory glob so a partial checkout still loads.
    ONT_DIR semantics are preserved (catalog paths resolve under the repo)."""
    g = Graph()
    g.bind("ho", HO)
    g.bind("id", ID)
    g.bind("core", ID_CORE)
    g.bind("lpr", ID_LPR)
    g.bind("skos", SKOS)
    if not _load_via_imports(g, _parse_catalog(CATALOG)):
        _load_via_glob(g)
    if reason:
        apply_reasoning(g)
    return g


def apply_reasoning(g: Graph) -> Graph:
    """Materialise OWL RL closure in place."""
    import owlrl
    owlrl.DeductiveClosure(owlrl.OWLRL_Semantics).expand(g)
    return g


def instance_nodes(g: Graph) -> set[URIRef]:
    """All URIRef individuals typed (directly or via inference) as one of
    our ontology classes."""
    nodes: set[URIRef] = set()
    for cls in INSTANCE_CLASSES:
        for s in g.subjects(RDF.type, cls):
            if isinstance(s, URIRef):
                nodes.add(s)
    return nodes


def instance_edges(g: Graph) -> list[tuple[URIRef, URIRef, URIRef]]:
    """(subject, predicate, object) triples that link two individuals."""
    edges = []
    nodes = instance_nodes(g)
    preds = link_predicates(g)
    for s, p, o in g:
        if p in preds and s in nodes and o in nodes:
            edges.append((s, p, o))
    return edges


def label_of(g: Graph, node: URIRef) -> str:
    for pred in (SKOS.prefLabel, RDFS.label):
        val = g.value(node, pred)
        if val is not None:
            return str(val)
    return node.split("#")[-1].split("/")[-1]


def most_specific_types(g: Graph, node: URIRef) -> list[URIRef]:
    """Asserted/inferred types of node that are in INSTANCE_CLASSES,
    dropping superclasses when a subclass is present."""
    types = {t for t in g.objects(node, RDF.type)
             if isinstance(t, URIRef) and t in INSTANCE_CLASSES}
    specific = set(types)
    for t in types:
        for sup in g.objects(t, RDFS.subClassOf):
            if sup != t:  # skip reflexive edge (OWL RL materialises t subClassOf t)
                specific.discard(sup)
    return sorted(specific) if specific else sorted(types)
