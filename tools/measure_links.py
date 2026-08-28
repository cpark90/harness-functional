#!/usr/bin/env python3
"""Measure fuzzy weights for ho:Link individuals from STRUCTURAL evidence.

The probabilistic link layer's default weight source is MEASUREMENT
(ho:weightOrigin "measured"), with human curation as the protected override
lane. This tool is the first measurement path: it recomputes ho:linkWeight for
every link whose kind has a registered measure, from graph-structural evidence
only, and (with --apply) writes the values back into the authored TTL.

WHY STRUCTURAL, NEVER STRING SIMILARITY: the approved decision record
(docs/feedback/block-anchor-intent-restore.md, orchestrator 주석) bans
similarity-only measures — this repo measured that text similarity cannot
distinguish a sentence rewrite from a partial deletion, so a weight built on
it would engrave that blindness into the graph. Every evidence item below is a
typed graph fact an author deliberately created.

MEASURE structural-overlap-v1 (kind: id:kind-overlap) — evidence items for a
source/target pair, combined by noisy-OR (w = 1 - Π(1 - e), monotone and
order-independent, rounded to 2 decimals):

  E1  0.45 per DIRECTION of authored cross-reference: the source's
      skos:definition / ho:promptText prose contains an `id:`/`core:` IRI
      token resolving to the target (or vice versa). An inline IRI token is
      an anti-drift disambiguation an author wrote on purpose — the strongest
      structural sign that the two scopes touch.
  E2  0.5 per shared ho:tagged Concept whose ho:conceptFacet is DISCRIMINANT
      ("anatomy"/"method") — a shared content region (the facet rule that
      also gates alternative links).
  E3  0.2 per shared ho:tagged Concept with any other (or no) facet — weak
      evidence: it says something about both nodes without saying they cover
      the same content.

PROTECTION CONTRACT (ho:weightOrigin): links with origin "curated" are NEVER
recomputed or rewritten — a human confirmed or corrected that value, and this
tool skips them by construction, so a curation survives any number of
re-measurements. "asserted" (migrated crisp edges at 1.0) and "measured"
links are (re)computed; the run is idempotent (same graph -> same values ->
second --apply changes nothing).

Usage:
    /usr/bin/python3 tools/measure_links.py            # report only
    /usr/bin/python3 tools/measure_links.py --apply    # write values back

Run with an interpreter that has rdflib (e.g. /usr/bin/python3).
"""
from __future__ import annotations

import argparse
import glob
import os
import re
import sys

from rdflib import Graph, RDF
from rdflib.namespace import SKOS

import ontology_lib as lib
from ontology_lib import HO

METHOD_ID = "structural-overlap-v1"
DISCRIMINANT_FACETS = {"anatomy", "method"}
E_CROSS_REFERENCE = 0.45
E_SHARED_DISCRIMINANT = 0.5
E_SHARED_OTHER = 0.2

# Same token grammar as retrieve.py's _ID_TOKEN_RE / materialize's resolver:
# an inline `id:`/`core:` reference inside authored prose.
_ID_TOKEN_RE = re.compile(r"\b(?:id|core):([A-Za-z][A-Za-z0-9_-]*)")

# Kinds with a registered measure. Other kinds are out of scope for v1 and
# reported as unmeasured (their weights stay whatever authoring/curation set).
MEASURED_KINDS = {lib.ID_CORE["kind-overlap"]: METHOD_ID}


def _slug(node) -> str:
    return str(node).rsplit("/", 1)[-1]


def _prose_slugs(g: Graph, node) -> set[str]:
    """id:/core: token slugs referenced inside the node's authored prose."""
    slugs: set[str] = set()
    for pred in (SKOS.definition, HO.promptText):
        for val in g.objects(node, pred):
            slugs.update(_ID_TOKEN_RE.findall(str(val)))
    return slugs


def measure_overlap(g: Graph, source, target) -> tuple[float, list[str]]:
    """structural-overlap-v1: noisy-OR over the structural evidence items."""
    evidence: list[tuple[float, str]] = []
    if _slug(target) in _prose_slugs(g, source):
        evidence.append((E_CROSS_REFERENCE,
                         f"source prose cross-references id:{_slug(target)}"))
    if _slug(source) in _prose_slugs(g, target):
        evidence.append((E_CROSS_REFERENCE,
                         f"target prose cross-references id:{_slug(source)}"))
    shared = set(g.objects(source, HO.tagged)) & set(g.objects(target, HO.tagged))
    for concept in sorted(shared, key=str):
        facet = g.value(concept, HO.conceptFacet)
        if facet is not None and str(facet) in DISCRIMINANT_FACETS:
            evidence.append((E_SHARED_DISCRIMINANT,
                             f"shared discriminant tag id:{_slug(concept)} "
                             f"({facet})"))
        else:
            evidence.append((E_SHARED_OTHER,
                             f"shared non-discriminant tag id:{_slug(concept)}"
                             f" ({facet if facet else 'no facet'})"))
    remainder = 1.0
    for strength, _why in evidence:
        remainder *= (1.0 - strength)
    weight = round(1.0 - remainder, 2)
    return weight, [f"{s:+.2f} {why}" for s, why in evidence]


def _apply_to_ttl(link, weight: float) -> str:
    """Rewrite the link's authored block in place: linkWeight -> measured
    value, weightOrigin -> "measured", weightMethod -> METHOD_ID. Fails loudly
    unless the block and its weight tail are found exactly once."""
    slug = _slug(link)
    hits = []
    for path in sorted(glob.glob(os.path.join(lib.ONT_DIR, "abox", "**",
                                              "*.ttl"), recursive=True)):
        with open(path, encoding="utf-8") as fh:
            text = fh.read()
        if f"id:{slug} a ho:Link ;" in text:
            hits.append((path, text))
    if len(hits) != 1:
        raise SystemExit(f"✗ id:{slug}: found in {len(hits)} files, need 1")
    path, text = hits[0]
    start = text.index(f"id:{slug} a ho:Link ;")
    end = text.index(" .\n", start) + len(" .\n")
    block = text[start:end]
    tail_re = re.compile(
        r"ho:linkWeight\s+[0-9.]+\s*;\s*ho:weightOrigin\s+\"[a-z]+\""
        r"(?:\s*;\s*\n\s*ho:weightMethod\s+\"[^\"]+\")?\s*\.",
        re.S)
    if len(tail_re.findall(block)) != 1:
        raise SystemExit(f"✗ id:{slug}: weight tail not found exactly once")
    new_tail = (f"ho:linkWeight {weight} ; ho:weightOrigin \"measured\" ;\n"
                f"    ho:weightMethod \"{METHOD_ID}\" .")
    new_block = tail_re.sub(new_tail, block)
    if new_block != block:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text[:start] + new_block + text[end:])
    return path if new_block != block else ""


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--apply", action="store_true",
                    help="write measured values back into the authored TTL "
                         "(curated links are never touched)")
    args = ap.parse_args(argv)

    # Asserted graph is enough (tags, facets, prose are authored, not
    # inferred); skipping reasoning keeps the measurement fast and pure.
    g = lib.load_graph(reason=False)
    updated, unchanged, skipped_curated, unmeasured = [], [], [], []

    for link in sorted(g.subjects(RDF.type, HO.Link), key=str):
        kind = g.value(link, HO.linkKind)
        origin = g.value(link, HO.weightOrigin)
        current = g.value(link, HO.linkWeight)
        sources = sorted(g.subjects(HO.hasLink, link), key=str)
        target = g.value(link, HO.linkTarget)
        if kind not in MEASURED_KINDS:
            unmeasured.append(link)
            continue
        if str(origin) == "curated":
            skipped_curated.append(link)
            print(f"— id:{_slug(link)}: origin=curated, weight "
                  f"{current} PROTECTED (never re-measured)")
            continue
        if not sources or target is None:
            print(f"✗ id:{_slug(link)}: malformed (no source/target), skipped")
            continue
        weight, trail = measure_overlap(g, sources[0], target)
        print(f"• id:{_slug(link)}: {origin} {current} -> measured {weight}")
        for line in trail:
            print(f"    {line}")
        if float(current) == weight and str(origin) == "measured":
            unchanged.append(link)
            continue
        if args.apply:
            path = _apply_to_ttl(link, weight)
            if path:
                updated.append((link, path))
                print(f"    applied -> {os.path.relpath(path, lib.ROOT)}")
        else:
            updated.append((link, ""))
            print("    (report only — rerun with --apply to write)")

    print(f"\n{len(updated)} to update / {len(unchanged)} unchanged / "
          f"{len(skipped_curated)} curated-protected / "
          f"{len(unmeasured)} kinds without a registered measure")
    return 0


if __name__ == "__main__":
    sys.exit(main())
