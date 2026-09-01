#!/usr/bin/env python3
"""Generate a recipe repo's federation registries from the on-disk recipes/*/.

The single source of truth for "which recipes exist" is the set of directories
under a recipe repo's ``recipes/*/``; each holds one ``<name>/<name>.ttl`` whose
``owl:Ontology`` header declares the recipe's root IRI. Historically that list
was hand-duplicated in three places (the repo ``catalog-v001.xml``, the CI
``validate.yml`` matrix, and the central data-repo template), and it drifted at
least once (a REORG dropped four dedicated catalogs, so only part of the closure
loaded and validation passed on a *partial* union with no error). This tool
removes the duplication: it derives the registries from disk deterministically.

It emits **two** artifacts from one walk:

  (a) ``<repo>/catalog-v001.xml`` — the Protégé/OASIS catalog mapping every
      ontology IRI to a local file. This has two blocks:
        * the **central** block (root, schema, every ``.../data/core/<type>``
          per-component-type unit, ``data/authored``), copied from the central
          repo's own ``catalog-v001.xml`` with a ``central/`` path prefix so the
          recipe repo's central checkout resolves. Copying it (instead of
          hand-maintaining it) is what fixes the original drift: when central
          grows a core unit, regenerating propagates it here automatically.
        * the **recipe** block — one ``<uri>`` per ``recipes/<name>/``, mapping
          the IRI *read from that recipe's TTL* to its file.

  (b) the CI matrix — the list of recipe root IRIs, printed as a JSON array with
      ``--print-matrix`` so ``validate.yml``'s discover job feeds
      ``strategy.matrix`` via ``fromJSON`` (no third hand-maintained copy).

Modes:
  (default)        rewrite ``<repo>/catalog-v001.xml`` from disk.
  --check          build in memory, diff against the on-disk catalog; exit 1 on
                   any difference (the drift guard — wire this as a CI step).
  --print-matrix   print the recipe root IRIs as a JSON array to stdout.
  --list           print a human-readable ``<name>  <iri>`` table.

Determinism: recipes are sorted by directory name; the central block preserves
the central catalog's document order. Idempotent: a second run diffs to zero.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from rdflib import Graph, RDF, OWL

# The generator ships in the CENTRAL repo's tools/ (data repos pull central
# tooling, exactly as they pull validate.py — docs/federation-design.md D4).
# CENTRAL_ROOT is this file's repo; its catalog-v001.xml is the source of the
# central IRI list. In CI the generator is invoked as central/tools/…, so
# CENTRAL_ROOT resolves to the central checkout and CENTRAL/ paths line up with
# the recipe repo's `central` checkout directory.
CENTRAL_ROOT = Path(__file__).resolve().parent.parent
CENTRAL_CATALOG = CENTRAL_ROOT / "catalog-v001.xml"
DEFAULT_REPO = CENTRAL_ROOT / "staging" / "harness-recipes"

# The recipe repo checks the central clone out into this subdirectory (see the
# recipe repo's validate.yml `path: central`), so central IRIs map to central/…
CENTRAL_PREFIX = "central/"
RECIPE_IRI_BASE = "https://harness-ontology.dev/recipes/"


def read_central_entries(central_catalog: Path) -> list[tuple[str, str, str]]:
    """Return the central catalog's (id, name, uri) triples in document order.

    These are re-emitted into the recipe catalog with a ``central/`` uri prefix
    so the recipe repo's central checkout resolves the schema + every core unit.
    """
    if not central_catalog.exists():
        sys.exit(f"error: central catalog not found: {central_catalog}")
    tree = ET.parse(central_catalog)
    entries: list[tuple[str, str, str]] = []
    for el in tree.iter():
        if el.tag.split("}")[-1] != "uri":
            continue
        cid, name, uri = el.get("id"), el.get("name"), el.get("uri")
        if name and uri:
            entries.append((cid or "", name, uri))
    if not entries:
        sys.exit(f"error: central catalog has no <uri> entries: {central_catalog}")
    return entries


def recipe_root_iri(ttl: Path) -> str:
    """Read the recipe's root IRI from its TTL's ``owl:Ontology`` header.

    Parses the file alone (rdflib does not follow owl:imports on parse), so this
    is the IRI the recipe actually declares — never a guess from the dir name.
    Requires exactly one ``owl:Ontology`` subject.
    """
    g = Graph()
    g.parse(ttl, format="turtle")
    onts = [str(s) for s in g.subjects(RDF.type, OWL.Ontology)]
    if len(onts) != 1:
        sys.exit(
            f"error: {ttl} declares {len(onts)} owl:Ontology subjects "
            f"(expected exactly 1): {onts}"
        )
    return onts[0]


def discover_recipes(repo: Path) -> list[tuple[str, str, str]]:
    """Walk ``<repo>/recipes/*/`` → sorted [(name, iri, rel_path)].

    Each recipe dir must hold ``<name>/<name>.ttl``. The IRI is read from that
    file's owl:Ontology header and cross-checked against the naming convention
    ``.../recipes/<name>`` (a mismatch is a hard error, not a silent guess).
    """
    recipes_dir = repo / "recipes"
    if not recipes_dir.is_dir():
        sys.exit(f"error: no recipes/ directory under {repo}")
    found: list[tuple[str, str, str]] = []
    for entry in sorted(os.scandir(recipes_dir), key=lambda e: e.name):
        if not entry.is_dir():
            continue
        name = entry.name
        ttl = recipes_dir / name / f"{name}.ttl"
        if not ttl.is_file():
            sys.exit(f"error: recipe dir {name}/ has no {name}.ttl")
        iri = recipe_root_iri(ttl)
        expected = f"{RECIPE_IRI_BASE}{name}"
        if iri != expected:
            sys.exit(
                f"error: {ttl} declares IRI <{iri}> but its directory implies "
                f"<{expected}> (convention .../recipes/<dirname>). Rename the "
                f"directory or fix the owl:Ontology header."
            )
        found.append((name, iri, f"recipes/{name}/{name}.ttl"))
    if not found:
        sys.exit(f"error: no recipes discovered under {recipes_dir}")
    return found


def discover_local_units(repo: Path) -> list[tuple[str, str, str]]:
    """Walk ``<repo>/ontology/**/*.ttl`` → sorted [(id, iri, rel_path)].

    The concrete repo carries the union ROOT and the ABox core parts library
    locally (they moved here from the functional repo — logical/concrete level
    content lives with the assemblies). Each unit's IRI is read from its own
    ``owl:Ontology`` header, so the catalog never guesses from a path. Shapes
    never live under a data repo's ontology/ (they stay central,
    validation-only).
    """
    ont = repo / "ontology"
    if not ont.is_dir():
        return []
    found: list[tuple[str, str, str]] = []
    for ttl in sorted(ont.rglob("*.ttl")):
        iri = recipe_root_iri(ttl)
        rel = ttl.relative_to(repo).as_posix()
        slug = iri.rstrip("/").rsplit("/", 1)[-1]
        cid = "root" if iri == "https://harness-ontology.dev/ontology" else f"local-{slug}"
        found.append((cid, iri, rel))
    return found


def build_catalog(central: list[tuple[str, str, str]],
                  local: list[tuple[str, str, str]],
                  recipes: list[tuple[str, str, str]]) -> str:
    """Render the recipe repo's catalog-v001.xml (deterministic, aligned)."""
    rows: list[tuple[str, str, str]] = []
    for cid, name, uri in central:
        rows.append((cid, name, CENTRAL_PREFIX + uri))
    for cid, name, uri in local:
        rows.append((cid, name, uri))
    for name, iri, rel in recipes:
        rows.append((f"recipe-{name}", iri, rel))
    id_w = max(len(f'id="{r[0]}"') for r in rows)
    name_w = max(len(f'name="{r[1]}"') for r in rows)

    def line(cid: str, name: str, uri: str) -> str:
        idf = f'id="{cid}"'.ljust(id_w)
        namef = f'name="{name}"'.ljust(name_w)
        return f'    <uri {idf} {namef} uri="{uri}"/>'

    out: list[str] = []
    out.append('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
    out.append("<!-- GENERATED by central tools/gen_recipe_catalog.py — DO NOT EDIT BY HAND.")
    out.append("     (XML comments cannot contain a double-hyphen, so flags are spelled")
    out.append("     out below without their leading dashes.)")
    out.append("")
    out.append("     Regenerate after adding or removing a recipe, or after the central")
    out.append("     catalog changes, by running the generator with `repo=<this repo>`:")
    out.append("       python3 central/tools/gen_recipe_catalog.py")
    out.append("     CI runs it in `check` mode, which fails if this file is out of sync")
    out.append("     with the recipes/*/ directories or the central catalog (drift guard).")
    out.append("")
    out.append("     Three blocks. CENTRAL: the functional repo (harness-functional,")
    out.append("     formerly harness_ontology) — the schema (TBox vocabulary), copied from")
    out.append("     its catalog-v001.xml with a `central/` prefix so this repo's ./central/")
    out.append("     checkout resolves. LOCAL: this repo's own units — the union ROOT and")
    out.append("     every .../data/core/<type> ABox parts unit (they live HERE: logical +")
    out.append("     concrete level content sits with the assemblies), IRIs read from each")
    out.append("     TTL's owl:Ontology header. RECIPE: one <uri> per recipes/<name>/.")
    out.append("     Each recipe owl:imports the ROOT (.../ontology), whose closure is")
    out.append("     schema + every core unit, so a recipe's validated union is exactly")
    out.append("     (schema + whole parts library + that recipe).")
    out.append("")
    out.append("     Validate one recipe locally (central cloned into ./central/):")
    out.append("       HARNESS_CATALOG=catalog-v001.xml \\")
    out.append("       HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> \\")
    out.append("       /usr/bin/python3 central/tools/validate.py")
    out.append("     Paths are relative to this catalog's directory (the repo root). -->")
    out.append('<catalog prefer="public" xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog">')
    out.append("    <!-- CENTRAL functional repo units (from central/catalog-v001.xml, prefixed central/). -->")
    for cid, name, uri in central:
        out.append(line(cid, name, CENTRAL_PREFIX + uri))
    out.append("    <!-- LOCAL units: union root + ABox core parts library (ontology/**, IRI from each header). -->")
    for cid, name, uri in local:
        out.append(line(cid, name, uri))
    out.append("    <!-- RECIPE units (one per recipes/<name>/; IRI from each TTL's owl:Ontology header). -->")
    for name, iri, rel in recipes:
        out.append(line(f"recipe-{name}", iri, rel))
    out.append("</catalog>")
    return "\n".join(out) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--repo", default=str(DEFAULT_REPO),
                    help="recipe repo root (default: %(default)s)")
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--check", action="store_true",
                   help="diff generated catalog against on-disk; exit 1 if they differ")
    g.add_argument("--print-matrix", action="store_true",
                   help="print recipe root IRIs as a JSON array (CI matrix source)")
    g.add_argument("--list", action="store_true",
                   help="print a human-readable name/IRI table")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    recipes = discover_recipes(repo)

    if args.print_matrix:
        print(json.dumps([iri for _, iri, _ in recipes]))
        return 0
    if args.list:
        for name, iri, _ in recipes:
            print(f"{name:28} {iri}")
        return 0

    central = read_central_entries(CENTRAL_CATALOG)
    local = discover_local_units(repo)
    generated = build_catalog(central, local, recipes)
    catalog_path = repo / "catalog-v001.xml"

    if args.check:
        current = catalog_path.read_text() if catalog_path.exists() else ""
        if current == generated:
            print(f"OK: {catalog_path} is in sync ({len(recipes)} recipes).")
            return 0
        print(f"DRIFT: {catalog_path} differs from generated "
              f"({len(recipes)} recipes on disk). Run gen_recipe_catalog.py to fix.",
              file=sys.stderr)
        # Show a compact line-level diff for the CI log.
        import difflib
        diff = difflib.unified_diff(
            current.splitlines(), generated.splitlines(),
            fromfile="on-disk", tofile="generated", lineterm="")
        for ln in diff:
            print(ln, file=sys.stderr)
        return 1

    catalog_path.write_text(generated)
    print(f"wrote {catalog_path} ({len(central)} central + {len(recipes)} recipe entries).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
