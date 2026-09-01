#!/usr/bin/env python3
"""Contract-VERIFY projection of the harness ontology — the ODR VERIFY axis.

METHODOLOGY.md names four axes: SPEC (what, tech-neutral), BIND (which
implementation), EMIT (deterministic render), and VERIFY (spec-conformance).
materialize.py is EMIT; this file is VERIFY. Given a harness and its
MATERIALIZED file tree, it judges the emitted artifact against the *spec
contracts* attached to the harness's capabilities:

  materialize    : validated harness -> file tree   (what to BUILD)
  verify_contract: file tree + spec  -> pass/fail    (does it MEET the spec?)

A contract lives on a ho:Capability (ho:capabilityContract) — the neutral SPEC
side — so the verdict depends on WHAT the capability requires, never on WHICH
implementation candidate (BIND) produced the tree. That is exactly ODR's
principle 3 (spec-as-contract), INV-3 (verification independence: the criterion
comes only from the spec) and INV-4 (replacement harmlessness: re-binding a
capability to a different candidate keeps the same contracts passing).

Two verification mechanisms, chosen per-contract via ho:contractKind:
  * "executable" — ho:contractCheck is a shell command run with CWD = the
    materialized tree root; it passes iff the command exits 0.
  * "structural" — ho:contractCheck is a declarative assertion evaluated
    against the tree, in this small grammar (tree-relative paths):
        file-exists:<path>
        file-contains:<path>::<substring>
        section:<path>::<heading>       (a Markdown heading line == <heading>)

Exit code is non-zero if ANY contract fails, so this drops into CI / a gate.
Reporting is deterministic (contracts sorted by IRI).

Contract individuals live where the ABox lives — the CONCRETE repo
(harness-concrete), which checks this repo out as ./central/. Run it from there:

    HARNESS_CATALOG=catalog-v001.xml \
    /usr/bin/python3 central/tools/verify_contract.py h-lpranging --tree build/lpranging
    ... --format json

Composition honours HARNESS_CATALOG / HARNESS_ROOT_ONTOLOGY exactly like
validate.py / materialize.py, so a recipe union verifies the same way the
central store does. The contract grammar is documented in harness-concrete's
docs/odr-contract-verify.md (ODR VERIFY is a LOGICAL-level concern and moved
there with the 2026-09 ladder split; this repo keeps only the vocabulary).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys

from rdflib import Graph, RDF, URIRef

import ontology_lib as lib
from ontology_lib import HO

# An executable contract command gets a bounded wall-clock so a hung or
# runaway check refuses rather than blocking the gate forever.
EXEC_TIMEOUT_SECONDS = 120


def _sorted(nodes):
    return sorted(nodes, key=str)


# --- 1. target resolution (mirrors materialize.resolve_harness) -------
def resolve_harness(g: Graph, ref: str) -> URIRef:
    """Resolve a full IRI or a short id (e.g. 'h-lpranging') to a Harness node.
    Raises ValueError if it is absent or not a Harness."""
    harnesses = set(g.subjects(RDF.type, HO.Harness))
    node = URIRef(ref)
    if node in harnesses:
        return node
    matches = [h for h in harnesses
               if str(h).rsplit("/", 1)[-1] == ref or str(h).rsplit("#", 1)[-1] == ref]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        known = ", ".join(sorted(str(h).rsplit("/", 1)[-1] for h in harnesses))
        raise ValueError(f"no harness matches '{ref}'. Known harnesses: {known}")
    raise ValueError(f"'{ref}' is ambiguous across {len(matches)} harnesses; use the full IRI")


# --- 2. contract collection -------------------------------------------
def _harness_components(g: Graph, h: URIRef):
    """The harness's directly-bound components (every hasComponent sub-property).
    Mirrors validate._components / materialize._iter_components."""
    for p in (HO.hasComponent, HO.hasSystemPrompt, HO.usesTool, HO.hasGuardrail,
              HO.hasWorkflow, HO.usesModel, HO.hasExample, HO.hasInstruction,
              HO.hasRole, HO.hasChannel):
        for o in g.objects(h, p):
            yield o


def harness_capabilities(g: Graph, h: URIRef) -> set:
    """Every capability in scope for the harness: the ones it requires plus the
    ones its own components provide (their union). Contracts on any of these are
    the harness's contracts — the same set the ho:hasComponent propertyChainAxiom
    rolls up (a provider's capability contract becomes a harness component)."""
    caps = set(g.objects(h, HO.requiresCapability))
    for comp in _harness_components(g, h):
        caps.update(g.objects(comp, HO.providesCapability))
    return caps


def collect_contracts(g: Graph, h: URIRef) -> list[dict]:
    """All spec contracts in scope for the harness, sorted by contract IRI. Each
    record: {iri, capability, capabilityLabel, label, kind, check}."""
    records = []
    for cap in harness_capabilities(g, h):
        for c in g.objects(cap, HO.capabilityContract):
            records.append({
                "iri": str(c),
                "capability": str(cap),
                "capabilityLabel": lib.label_of(g, cap),
                "label": lib.label_of(g, c),
                "kind": str(g.value(c, HO.contractKind) or ""),
                "check": str(g.value(c, HO.contractCheck) or ""),
            })
    records.sort(key=lambda r: r["iri"])
    return records


# --- 3. structural assertion grammar ----------------------------------
def _safe_join(tree: str, rel: str) -> str:
    """Join a tree-relative assertion path onto the tree root, refusing a path
    that escapes the tree (absolute or ../ traversal)."""
    rel = rel.strip()
    dest = os.path.normpath(os.path.join(tree, rel))
    tree_abs = os.path.abspath(tree)
    if os.path.commonpath([os.path.abspath(dest), tree_abs]) != tree_abs:
        raise ValueError(f"assertion path '{rel}' escapes the tree")
    return dest


def eval_structural(tree: str, assertion: str) -> tuple[bool, str]:
    """Evaluate a structural assertion against the materialized tree. Returns
    (passed, detail). Grammar:
        file-exists:<path>
        file-contains:<path>::<substring>
        section:<path>::<heading>
    """
    op, sep, rest = assertion.partition(":")
    if not sep:
        return False, f"malformed assertion (no ':'): {assertion!r}"
    op = op.strip()

    if op == "file-exists":
        try:
            path = _safe_join(tree, rest)
        except ValueError as exc:
            return False, str(exc)
        ok = os.path.exists(path)
        return ok, ("exists" if ok else f"missing: {rest.strip()}")

    if op == "file-contains":
        target, dsep, needle = rest.partition("::")
        if not dsep:
            return False, f"file-contains needs '<path>::<substring>': {assertion!r}"
        try:
            path = _safe_join(tree, target)
        except ValueError as exc:
            return False, str(exc)
        if not os.path.isfile(path):
            return False, f"file missing: {target.strip()}"
        with open(path, encoding="utf-8", errors="replace") as fh:
            body = fh.read()
        ok = needle in body
        return ok, ("substring present" if ok
                    else f"substring absent in {target.strip()}: {needle!r}")

    if op == "section":
        target, dsep, heading = rest.partition("::")
        if not dsep:
            return False, f"section needs '<path>::<heading>': {assertion!r}"
        try:
            path = _safe_join(tree, target)
        except ValueError as exc:
            return False, str(exc)
        if not os.path.isfile(path):
            return False, f"file missing: {target.strip()}"
        # The heading argument may be written with or without its leading '#'
        # markers (section:F::## Title and section:F::Title both match the
        # heading line "## Title"); compare on the hash-stripped heading TEXT.
        want = heading.strip().lstrip("#").strip()
        with open(path, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                stripped = line.strip()
                if stripped.startswith("#") and stripped.lstrip("#").strip() == want:
                    return True, f"heading present: {want!r}"
        return False, f"no Markdown heading == {want!r} in {target.strip()}"

    return False, f"unknown structural operator {op!r} in: {assertion!r}"


# --- 4. executable check ----------------------------------------------
def eval_executable(tree: str, command: str) -> tuple[bool, str]:
    """Run an executable contract command with CWD = the materialized tree root;
    it passes iff it exits 0. Output is captured (not streamed) and a bounded
    timeout refuses a hung check. Returns (passed, detail)."""
    if not command.strip():
        return False, "empty executable contractCheck"
    try:
        proc = subprocess.run(
            command, shell=True, cwd=tree, capture_output=True, text=True,
            timeout=EXEC_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        return False, f"timed out after {EXEC_TIMEOUT_SECONDS}s"
    except OSError as exc:
        return False, f"could not run: {exc}"
    if proc.returncode == 0:
        return True, "exit 0"
    tail = (proc.stderr or proc.stdout or "").strip().splitlines()
    hint = tail[-1] if tail else ""
    return False, f"exit {proc.returncode}" + (f": {hint}" if hint else "")


# --- 5. verify --------------------------------------------------------
def verify(g: Graph, h: URIRef, tree: str) -> dict:
    """Judge the materialized `tree` against the harness's spec contracts.
    Returns a structured result; determinism is guaranteed by the IRI-sorted
    contract order from collect_contracts."""
    contracts = collect_contracts(g, h)
    results = []
    for c in contracts:
        kind = c["kind"]
        if kind == "executable":
            passed, detail = eval_executable(tree, c["check"])
        elif kind == "structural":
            passed, detail = eval_structural(tree, c["check"])
        else:
            passed, detail = False, f"unknown ho:contractKind {kind!r}"
        results.append({**c, "passed": passed, "detail": detail})
    overall = all(r["passed"] for r in results)
    return {
        "harness": str(h),
        "prefLabel": lib.label_of(g, h),
        "tree": os.path.abspath(tree),
        "pass": overall,
        "total": len(results),
        "passed": sum(1 for r in results if r["passed"]),
        "contracts": results,
    }


# --- CLI --------------------------------------------------------------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("harness", help="harness IRI or short id (e.g. h-lpranging)")
    ap.add_argument("--tree", required=True,
                    help="the materialized output directory to judge")
    ap.add_argument("--format", choices=["text", "json"], default="text")
    args = ap.parse_args(argv)

    if not os.path.isdir(args.tree):
        print(f"✗ --tree '{args.tree}' is not a directory (materialize the "
              f"harness first)", file=sys.stderr)
        return 2

    try:
        g = lib.load_graph(reason=True)
    except Exception as exc:  # noqa: BLE001
        print(f"✗ could not load the union: {exc}", file=sys.stderr)
        return 2
    try:
        h = resolve_harness(g, args.harness)
    except ValueError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2

    result = verify(g, h, args.tree)

    if args.format == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0 if result["pass"] else 1

    print(f"Contract-VERIFY: {result['prefLabel']}  (tree: {args.tree})")
    if not result["contracts"]:
        print("  (no capability contracts in scope for this harness)")
    for r in result["contracts"]:
        mark = "✓" if r["passed"] else "✗"
        print(f"  {mark} [{r['kind']}] {r['label']}  "
              f"(capability: {r['capabilityLabel']})")
        print(f"      check : {r['check']}")
        print(f"      result: {r['detail']}")
    verdict = "PASS" if result["pass"] else "FAIL"
    print(f"\n{result['passed']}/{result['total']} contracts passed — {verdict}")
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
