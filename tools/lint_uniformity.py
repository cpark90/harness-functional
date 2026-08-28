#!/usr/bin/env python3
"""Lint the harness ontology for AUTHORING UNIFORMITY (ONTOLOGYSTYLE compliance).

`validate.py` guards *graph integrity* (reasoning consistency, SHACL structural
invariants, reachability, capability satisfaction). It deliberately does NOT
look at whether nodes were AUTHORED uniformly against the conventions in
`ONTOLOGYSTYLE.md`. This linter is that second, orthogonal axis — a mechanical,
regression-preventing check that every node follows the style rules a human
reviewer would otherwise have to eyeball.

The overriding design constraint is NO FALSE POSITIVES: `ONTOLOGYSTYLE.md` is the
single source of truth, and several style rules apply only to a narrow SCOPE of
classes. A blanket "missing X" flag would drown legitimate, exempt nodes in
noise (the C-0 audit found ~98/58/56 nodes lawfully lacking tokenEstimate/
maturity/definition, with ZERO in-scope violations). So every check below is
anchored to the exact § that requires it and restricted to the exact scope that
§ (or the shapes it is realized in) actually covers.

Checks (each cites its ONTOLOGYSTYLE basis):

  1. tokenEstimate scope (§1c) — §1c is the SINGLE source for where
     ho:tokenEstimate is required, and its scope is conditional: a SystemPrompt/
     Instruction/Guardrail/Example is in scope ONLY when it actually carries
     ho:promptText, plus Tool and Workflow unconditionally. Only nodes IN that
     scope that lack ho:tokenEstimate are violations (a promptText-less one of
     the four is exempt — zero projection text). Everything else (Role,
     Channel, Concept, PromptSection, WorkflowStep, AreaOfObservation — whose
     runtime size is ho:observedTokenVolume, a SEPARATE §3 axis, not a projection
     cost) is exempt and never flagged. This is the check with real teeth: no
     SHACL shape enforces tokenEstimate, so validate.py cannot see a miss here.

  2. Naming prefix (§2 table) — each id: individual's slug must carry the
     class-specific prefix from the §2 naming table (ho:Role → role-,
     ho:Guardrail → gr-, ho:Capability → cap-, ho:DesignPattern → pat-,
     ho:Channel → chan-, ho:FailurePolicy → fp-, …). Singletons
     (EnvironmentSpace/GlobalState) are checked against their fixed names.

  3. Language policy (§1d) — searchable graph-data values (skos:prefLabel,
     skos:definition, skos:altLabel) must be ENGLISH per §1d. Any Hangul
     codepoint in those literals is a violation. Korean prose belongs in
     rdfs:comment / documents, never in the retrieval-facing SKOS values.

  4. maturity coverage — restricted to exactly the classes whose SHACL shape
     requires ho:maturity (minCount ≥ 1). This respects the deliberate asymmetry
     the C-0 audit noted: SpecConcept-family classes carry no maturity minCount
     and are lawfully exempt. The required-class set is DERIVED from the shapes
     graph (not hardcoded) so it can never drift from the shapes.

  5. definition coverage (§1d) — same shapes-derived mechanism: only classes
     whose shape requires skos:definition (minCount ≥ 1) are in scope. Classes
     that carry their body as promptText instead (e.g. Guardrail) are naturally
     exempt because no shape requires a definition of them.

  6. Annotation text cap (§1c) — one node's descriptive text (ho:promptText +
     skos:definition, ALL values summed) must stay within the §1c cap of 260
     tokens, measured as total-chars // 4: the same estimator ho:tokenEstimate
     is authored with, so §1c speaks ONE token unit and the linter needs no
     external tokenizer (deterministic, dependency-free). §1c's authoring target
     band is 130–260 tokens (the empirical retrieval-precision sweet spot of
     100–200 words); the floor is advisory, so only the CEILING is mechanically
     enforced here. Scope is ABox INDIVIDUALS ONLY (INSTANCE_CLASSES membership,
     per §1c): TBox schema documentation is deliberately excluded — machine-facing
     axiom prose such as the ho:hasComponent chain-axiom comment (~890 tokens)
     is never projected as a retrieval unit, so covering it would be an instant
     false positive. Exceeding the cap means the node is saying more than one
     thing: split it (WorkflowStep/PromptSection-style) instead of letting a
     blob grow past the point where projection stays budget-accurate.

  7. conceptFacet coverage (§3) — every CENTRAL (id/core/) ho:Concept declares
     its content axis via ho:conceptFacet. §3 makes the facet mandatory for the
     central vocabulary and advisory for data-repo-local terms, and the shapes
     stop at the value set on purpose (ho:ConceptFacetShape): those same shapes
     are the FEDERATION gate, so a presence constraint there would fail every
     downstream repo whose concepts predate the axis. This check is where the
     central obligation has teeth, scoped to the id/core/ namespace so a
     federated union can never produce a false positive here.

Checks 4/5 overlap what SHACL already enforces and so normally report clean;
they are included so the uniformity contract is stated and reported in ONE place
and would catch a regression if the shapes were ever weakened. Checks 1/2/3 are
NOT covered by any shape and are this linter's primary value.

Output is a per-category report; each violation names the node id and the § it
breaks. Exit code is 0 and prints PASS when every category is clean, else it
lists the violations and exits 1 (so this drops straight into a CI gate).

Usage:
    python3 tools/lint_uniformity.py          # human report (prints PASS/FAIL)

Run with an interpreter that has rdflib (e.g. /usr/bin/python3).
"""
from __future__ import annotations

import os
import re
import sys
from collections import defaultdict

from rdflib import Graph, RDF, URIRef
from rdflib.namespace import SKOS

import ontology_lib as lib
from ontology_lib import HO

SH = "http://www.w3.org/ns/shacl#"
SH_TARGETCLASS = URIRef(SH + "targetClass")
SH_PROPERTY = URIRef(SH + "property")
SH_PATH = URIRef(SH + "path")
SH_MINCOUNT = URIRef(SH + "minCount")

# --- §1c: the classes that ho:tokenEstimate is REQUIRED on --------------------
# ONTOLOGYSTYLE §1c is the single scope authority. Its exact wording is
# conditional, not blanket: tokenEstimate is required on "nodes carrying text —
# a SystemPrompt/Instruction/Guardrail/Example that HAS ho:promptText, plus (any)
# Tool/Workflow". So the four promptText-bodied classes are only in scope for an
# instance that actually carries ho:promptText (a promptText-less one of these,
# e.g. a Guardrail that states its rule via skos:definition, is exempt — its
# projection cost is zero-text). Tool and Workflow are UNCONDITIONALLY in scope.
# Splitting the tuple this way removes a latent false-positive vector: the old
# blanket rule would have flagged a promptText-less Guardrail/Instruction the day
# one is authored (currently none exist, so the behaviour is unchanged today).
TOKENESTIMATE_PROMPTTEXT_CLASSES = (
    HO.SystemPrompt, HO.Instruction, HO.Guardrail, HO.Example,
)
TOKENESTIMATE_UNCONDITIONAL_CLASSES = (
    HO.Tool, HO.Workflow,
)

# --- §2: naming-table prefixes, class -> required slug prefix -----------------
PREFIX_MAP = {
    HO.Domain: "dom-", HO.Task: "task-", HO.Capability: "cap-",
    HO.Contract: "ct-", HO.Concept: "c-", HO.Anchor: "anchor-",
    HO.DesignPattern: "pat-",
    HO.ExecutionMode: "mode-", HO.AutonomyTier: "tier-",
    HO.Constraint: "con-", HO.ModelConfig: "mc-",
    HO.Tool: "tool-", HO.Candidate: "cand-", HO.Workflow: "wf-",
    HO.WorkflowStep: "wfs-", HO.Deliverable: "dlv-", HO.Guardrail: "gr-",
    HO.Hook: "hook-", HO.SystemPrompt: "sp-", HO.PromptSection: "ps-",
    HO.Instruction: "ins-", HO.Example: "ex-", HO.Role: "role-",
    HO.Channel: "chan-", HO.Memory: "mem-", HO.TestScenario: "scn-",
    HO.FailurePolicy: "fp-", HO.AssemblySection: "as-", HO.Harness: "h-",
    HO.Agent: "agent-", HO.ObservationSpace: "os-", HO.AreaOfInterest: "aoi-",
    HO.AreaOfObservation: "oa-",
    HO.OperatingEnvelope: "oe-", HO.EnvelopeStatement: "es-",
    HO.EnvelopeRule: "er-",
}
# §2 singletons carry no prefix — they have one fixed local name each.
SINGLETON_NAMES = {
    HO.EnvironmentSpace: "env-space",
    HO.GlobalState: "global-state",
}

# --- §1c: per-node annotation text cap ----------------------------------------
# §1c caps ONE node's descriptive text at TEXT_CAP_TOKENS, counted over
# ho:promptText + skos:definition (all values summed) with the chars//4 estimator
# that ho:tokenEstimate itself is authored with — one token unit inside §1c, and
# no external tokenizer (determinism, and the tools only require rdflib here).
# The cap comes from the retrieval-precision evidence behind §1c: 100–200 words
# ≈ 130–260 BPE tokens is the sweet spot, so 130–260 is the authoring TARGET BAND
# and 260 the hard ceiling. The floor is advisory (§1c) and is NOT enforced —
# short nodes are legitimate — so only the ceiling is checked.
TEXT_CAP_TOKENS = 260
TEXT_CAP_PREDICATES = (HO.promptText, SKOS.definition)

# Hangul codepoint blocks (syllables, jamo, compatibility jamo, extended).
_HANGUL = re.compile(
    r"[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]")

# Searchable graph-data values that §1d requires to be English.
_SEARCHABLE_PREDICATES = (SKOS.prefLabel, SKOS.definition, SKOS.altLabel)


def _print_header(title: str) -> None:
    print(f"\n=== {title} ===")


def _localname(node: URIRef) -> str:
    """The trailing slug of an id: IRI (.../id/<domain>/<slug>)."""
    return re.split(r"[/#]", str(node))[-1]


def _derive_required_classes(shapes: Graph, predicate: URIRef) -> set:
    """Classes whose SHACL shape requires `predicate` (minCount >= 1). Derived
    from the shapes graph so the linter's scope can never drift from the shapes
    (used for the maturity and definition coverage checks)."""
    required: set = set()
    for shape, cls in shapes.subject_objects(SH_TARGETCLASS):
        for prop in shapes.objects(shape, SH_PROPERTY):
            if shapes.value(prop, SH_PATH) != predicate:
                continue
            mc = shapes.value(prop, SH_MINCOUNT)
            if mc is not None and int(mc) >= 1:
                required.add(cls)
    return required


def check_token_estimate(g: Graph):
    """§1c — tokenEstimate is required on Tool/Workflow (unconditionally) and on a
    SystemPrompt/Instruction/Guardrail/Example ONLY when it carries ho:promptText.
    §1c is the single scope authority and its wording is conditional on carrying
    text, so a promptText-less node of the latter four classes is exempt (no
    projection text ⇒ no budget to estimate). Returns list of violation dicts."""
    _print_header("tokenEstimate scope (§1c)")
    violations = []
    # promptText-bodied classes: in scope only for instances that HAVE promptText.
    for cls in TOKENESTIMATE_PROMPTTEXT_CLASSES:
        for n in g.subjects(RDF.type, cls):
            if not isinstance(n, URIRef):
                continue
            if g.value(n, HO.promptText) is None:
                continue  # §1c: no promptText ⇒ not in tokenEstimate scope
            if g.value(n, HO.tokenEstimate) is None:
                violations.append({"node": str(n),
                                   "reason": f"{cls.split('#')[-1]} carries "
                                             f"ho:promptText but lacks "
                                             f"ho:tokenEstimate (§1c)"})
    # Tool/Workflow: §1c requires tokenEstimate unconditionally.
    for cls in TOKENESTIMATE_UNCONDITIONAL_CLASSES:
        for n in g.subjects(RDF.type, cls):
            if not isinstance(n, URIRef):
                continue
            if g.value(n, HO.tokenEstimate) is None:
                violations.append({"node": str(n),
                                   "reason": f"{cls.split('#')[-1]} lacks "
                                             f"ho:tokenEstimate (§1c)"})
    if not violations:
        print("✓ every in-scope promptText/Tool/Workflow node has ho:tokenEstimate")
    else:
        print(f"✗ {len(violations)} node(s) missing ho:tokenEstimate (§1c):")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def check_naming_prefix(g: Graph):
    """§2 — each id: individual's slug carries its class's naming-table prefix.
    Returns list of violation dicts."""
    _print_header("Naming prefix (§2 table)")
    violations = []
    for n in lib.instance_nodes(g):
        if not str(n).startswith(str(lib.ID)):
            continue
        slug = _localname(n)
        types = lib.most_specific_types(g, n)
        # Expected prefixes/names for whichever leaf types this node has.
        expected_prefixes = [PREFIX_MAP[t] for t in types if t in PREFIX_MAP]
        expected_names = [SINGLETON_NAMES[t] for t in types
                          if t in SINGLETON_NAMES]
        if not expected_prefixes and not expected_names:
            continue  # no naming rule for this type (e.g. bare superclass)
        ok = (any(slug.startswith(p) for p in expected_prefixes)
              or slug in expected_names)
        if not ok:
            want = ", ".join(f"'{p}'" for p in expected_prefixes + expected_names)
            tnames = "/".join(t.split("#")[-1] for t in types)
            violations.append({"node": str(n),
                               "reason": f"slug '{slug}' [{tnames}] should use "
                                         f"prefix {want} (§2)"})
    violations.sort(key=lambda v: v["node"])
    if not violations:
        print("✓ every id: individual's slug matches its class naming prefix")
    else:
        print(f"✗ {len(violations)} node(s) with a wrong naming prefix (§2):")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def check_language(g: Graph):
    """§1d — searchable SKOS values (prefLabel/definition/altLabel) are English;
    any Hangul in them is a violation. Returns list of violation dicts."""
    _print_header("Language policy (§1d) — English searchable values")
    violations = []
    for n in sorted(lib.instance_nodes(g), key=str):
        for pred in _SEARCHABLE_PREDICATES:
            for val in g.objects(n, pred):
                if _HANGUL.search(str(val)):
                    violations.append(
                        {"node": str(n),
                         "reason": f"{pred.split('#')[-1]} contains Hangul "
                                   f"(§1d: searchable values are English): "
                                   f"\"{val}\""})
    if not violations:
        print("✓ no Hangul in prefLabel/definition/altLabel (searchable values)")
    else:
        print(f"✗ {len(violations)} searchable value(s) contain Hangul (§1d):")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def check_maturity(g: Graph, shapes: Graph):
    """maturity coverage — only classes whose shape requires ho:maturity are in
    scope (shapes-derived, respecting the SpecConcept exemption). Returns list of
    violation dicts."""
    _print_header("maturity coverage (shapes-required scope)")
    required = _derive_required_classes(shapes, HO.maturity)
    violations = []
    for cls in required:
        for n in g.subjects(RDF.type, cls):
            if not isinstance(n, URIRef):
                continue
            if g.value(n, HO.maturity) is None:
                violations.append({"node": str(n),
                                   "reason": f"{cls.split('#')[-1]} requires "
                                             f"ho:maturity (shapes)"})
    scope = ", ".join(sorted(c.split("#")[-1] for c in required))
    if not violations:
        print(f"✓ every maturity-required node has ho:maturity  [scope: {scope}]")
    else:
        print(f"✗ {len(violations)} node(s) missing ho:maturity:")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def check_definition(g: Graph, shapes: Graph):
    """definition coverage (§1d) — only classes whose shape requires
    skos:definition are in scope (shapes-derived; promptText-bodied classes like
    Guardrail are naturally exempt). Returns list of violation dicts."""
    _print_header("definition coverage (§1d, shapes-required scope)")
    required = _derive_required_classes(shapes, SKOS.definition)
    violations = []
    for cls in required:
        for n in g.subjects(RDF.type, cls):
            if not isinstance(n, URIRef):
                continue
            if g.value(n, SKOS.definition) is None:
                violations.append({"node": str(n),
                                   "reason": f"{cls.split('#')[-1]} requires "
                                             f"skos:definition (§1d/shapes)"})
    scope = ", ".join(sorted(c.split("#")[-1] for c in required)) or "(none)"
    if not violations:
        print(f"✓ every definition-required node has skos:definition  "
              f"[scope: {scope}]")
    else:
        print(f"✗ {len(violations)} node(s) missing skos:definition:")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def _text_tokens(g: Graph, node: URIRef) -> int:
    """§1c metric — the node's descriptive text size in tokens: the summed
    character length of every ho:promptText / skos:definition value, divided by 4
    (the same chars//4 estimator ho:tokenEstimate is authored with)."""
    chars = sum(len(str(o))
                for pred in TEXT_CAP_PREDICATES
                for o in g.objects(node, pred))
    return chars // 4


def check_text_cap(g: Graph):
    """§1c — a single node's ho:promptText + skos:definition must stay within the
    260-token cap (chars//4). Scope is ABox individuals only; TBox schema
    documentation is out of scope (machine-facing axiom prose is never projected
    as a retrieval unit). Only the ceiling is enforced — §1c's 130-token floor is
    advisory. Returns list of violation dicts."""
    _print_header(f"Annotation text cap (§1c) — ≤ {TEXT_CAP_TOKENS} tokens/node")
    violations = []
    for n in sorted(lib.instance_nodes(g), key=str):
        tokens = _text_tokens(g, n)
        if tokens > TEXT_CAP_TOKENS:
            violations.append({"node": str(n),
                               "reason": f"ho:promptText+skos:definition = "
                                         f"{tokens} tokens (chars/4) > cap "
                                         f"{TEXT_CAP_TOKENS} (§1c) — split the "
                                         f"node (single responsibility, §1)"})
    if not violations:
        print(f"✓ every abox node's promptText+definition is within "
              f"{TEXT_CAP_TOKENS} tokens (target band 130–{TEXT_CAP_TOKENS})")
    else:
        print(f"✗ {len(violations)} node(s) over the {TEXT_CAP_TOKENS}-token "
              f"text cap (§1c):")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def check_concept_facet(g: Graph):
    """§3 — every central (id/core/) ho:Concept declares ho:conceptFacet. The
    value set is enforced by ho:ConceptFacetShape; presence is enforced here,
    scoped to the central namespace because the shapes are shared with federated
    data repos whose local concepts are only advised to carry a facet. Returns
    list of violation dicts."""
    _print_header("conceptFacet coverage (§3, central vocabulary)")
    violations = []
    for n in sorted(g.subjects(RDF.type, HO.Concept), key=str):
        if not isinstance(n, URIRef) or not str(n).startswith(str(lib.ID_CORE)):
            continue
        if g.value(n, HO.conceptFacet) is None:
            violations.append({"node": str(n),
                               "reason": "core Concept lacks ho:conceptFacet "
                                         "(§3: anatomy/quality/method/domain/"
                                         "scope, decided by the §3 tests)"})
    if not violations:
        print("✓ every central Concept declares its ho:conceptFacet content axis")
    else:
        print(f"✗ {len(violations)} central Concept(s) missing ho:conceptFacet (§3):")
        for v in violations:
            print(f"    - <{v['node']}>  {v['reason']}")
    return violations


def main(argv=None) -> int:
    print("Loading ontology and applying OWL RL reasoning...")
    try:
        g = lib.load_graph(reason=True)
    except Exception as exc:  # noqa: BLE001
        print(f"✗ failed to load/reason: {exc}")
        return 2
    shapes = Graph()
    shapes.parse(os.path.join(lib.ONT_DIR, "shapes", "harness-shapes.ttl"),
                 format="turtle")
    print(f"  loaded graph: {len(g)} triples (post-reasoning)")

    results = {
        "tokenEstimate (§1c)": check_token_estimate(g),
        "naming prefix (§2)": check_naming_prefix(g),
        "language (§1d)": check_language(g),
        "maturity coverage": check_maturity(g, shapes),
        "definition (§1d)": check_definition(g, shapes),
        "text cap (§1c)": check_text_cap(g),
        "conceptFacet (§3)": check_concept_facet(g),
    }

    _print_header("Summary")
    ok = all(len(v) == 0 for v in results.values())
    for name, viols in results.items():
        mark = "✓" if not viols else "✗"
        print(f"  {mark} {name}: {len(viols)} violation(s)")
    print(f"\n{'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
