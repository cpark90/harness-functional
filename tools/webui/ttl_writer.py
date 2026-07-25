"""Style-preserving, surgical, LOSSLESS writes to the ABox TTL files.

We never rdflib-serialize the whole graph: that would destroy the hand-authored
section banners, comments, one-line-vs-multiline style and predicate order that
make the TTL human-diffable (ONTOLOGYSTYLE §3·§4). Instead we render a single
node block per ONTOLOGYSTYLE and splice it into the target file as text —
replacing the subject's existing block or appending a new one — then write
atomically (temp + os.replace) so a crash never exposes a half-written file.

Editing is a MERGE, not a block overwrite. A save only touches the predicates
the editor is authoritative over (the payload keys, plus any `_managed` list it
declares); every other predicate the node already carries on disk is preserved
verbatim. The rendered predicate set is therefore
    (predicates the node already has on disk) ∪ (predicates the editor sent)
never a hardcoded whitelist — so a predicate outside any tool-side list can no
longer be silently dropped on save (the old `ORDER`-whitelist data-loss bug).
`ORDER` now only fixes emission ORDER (ONTOLOGYSTYLE §3); predicates outside it
are still emitted, in a stable trailing sort.

Validation is done by the caller against the parsed graph; persistence here is
purely textual.
"""
from __future__ import annotations

import glob
import os
import re
import tempfile

from rdflib import Graph, Literal, URIRef, RDF
from rdflib.namespace import XSD

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ABOX_DIR = os.path.join(ROOT, "ontology", "abox")

# Predicate emission ORDER (subject `a` first, then labels, then structure,
# then datatype props) — mirrors ONTOLOGYSTYLE §3. This is NO LONGER a
# whitelist: it only orders the predicates that are present. Any predicate not
# listed here is still emitted (in a stable trailing sort), so nothing is
# dropped on save.
ORDER = [
    "skos:prefLabel", "skos:altLabel", "skos:definition",
    "ho:targetsDomain", "ho:addressesTask", "ho:hasSystemPrompt",
    "ho:usesTool", "ho:hasWorkflow", "ho:hasGuardrail", "ho:usesModel",
    "ho:hasInstruction", "ho:hasExample", "ho:appliesPattern",
    "ho:requiresCapability", "ho:providesCapability", "ho:constrainedBy",
    "ho:dependsOn", "ho:specializes", "ho:derivedFrom", "ho:tagged",
    "skos:broader", "skos:narrower", "skos:related", "skos:topConceptOf",
    "ho:promptText", "ho:observedTokenVolume", "ho:tokenEstimate",
    "ho:salience", "ho:maturity",
]
# Editor-supplied values for these predicates are always emitted as quoted
# string literals (the writer knows their datatype from the editor field, not
# from the graph). Preserved (un-edited) literals are typed from the parsed
# graph instead, so this list is only consulted for editor input.
STRING_PREDS = {"skos:prefLabel", "skos:altLabel", "skos:definition",
                "ho:promptText", "ho:maturity"}

_SUBJECT_RE = re.compile(r"^(id:[A-Za-z0-9_-]+)\b")

# Prefixes for qname<->IRI round-tripping of PRESERVED triples read back from
# disk. Kept in sync with server.py:_NS (the webui authors in the `core`
# domain). Anything outside these namespaces round-trips as a full <IRI>.
_PREFIXES = [
    ("id", "https://harness-ontology.dev/id/core/"),
    ("ho", "https://harness-ontology.dev/schema#"),
    ("skos", "http://www.w3.org/2004/02/skos/core#"),
    ("rdfs", "http://www.w3.org/2000/01/rdf-schema#"),
    ("rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#"),
    ("owl", "http://www.w3.org/2002/07/owl#"),
    ("xsd", "http://www.w3.org/2001/XMLSchema#"),
]
_PREFIX_MAP = {p: ns for p, ns in _PREFIXES}

# Numeric/boolean datatypes TTL lets us write bare (no quotes, no ^^type).
_BARE_DT = {
    XSD.integer, XSD.int, XSD.long, XSD.short, XSD.byte,
    XSD.nonNegativeInteger, XSD.positiveInteger, XSD.nonPositiveInteger,
    XSD.negativeInteger, XSD.unsignedInt, XSD.unsignedLong,
    XSD.decimal, XSD.double, XSD.boolean,
}

# Payload keys that are control metadata, not predicates to emit.
_META_KEYS = {"id", "type", "_mtimes", "_managed"}

# An editor-supplied string that looks like a prefixed name / <IRI> is treated
# as an object reference; anything else is a string literal.
_REF_RE = re.compile(r"^(?:id|ho|skos|rdfs|rdf|owl|xsd):[A-Za-z0-9_./#-]+$"
                     r"|^<[^>]+>$")

_HEADER = (
    "@prefix ho:    <https://harness-ontology.dev/schema#> .\n"
    "@prefix id:    <https://harness-ontology.dev/id/core/> .\n"
    "@prefix owl:   <http://www.w3.org/2002/07/owl#> .\n"
    "@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .\n"
    "@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .\n"
    "@prefix skos:  <http://www.w3.org/2004/02/skos/core#> .\n\n"
    "<https://harness-ontology.dev/data/authored> a owl:Ontology ;\n"
    "    owl:imports <https://harness-ontology.dev/schema> .\n\n"
    "# Nodes authored via the web UI (tools/webui). Same TBox vocabulary as the\n"
    "# other abox files — kept separate only so authored nodes are easy to find.\n\n"
)


class Conflict(Exception):
    """Raised when a target file changed on disk since the caller read it."""


def _lit(value) -> str:
    s = (str(value).replace("\\", "\\\\").replace('"', '\\"')
         .replace("\n", "\\n").replace("\r", ""))
    return f'"{s}"'


def _qname(uri) -> str:
    u = str(uri)
    for pfx, ns in _PREFIXES:
        if u.startswith(ns):
            local = u[len(ns):]
            if local and "/" not in local:
                return f"{pfx}:{local}"
    return f"<{u}>"


def _expand(q: str) -> URIRef:
    if q.startswith("<") and q.endswith(">"):
        return URIRef(q[1:-1])
    if ":" in q:
        pfx, local = q.split(":", 1)
        if pfx in _PREFIX_MAP:
            return URIRef(_PREFIX_MAP[pfx] + local)
    return URIRef(q)


def _term_ttl(term) -> str:
    """Render a PRESERVED rdflib term (read back from disk) as a TTL object,
    keeping the original lexical form so the triple round-trips byte-for-value."""
    if isinstance(term, URIRef):
        return _qname(term)
    if isinstance(term, Literal):
        lex = str(term)
        if term.language:
            return f"{_lit(lex)}@{term.language}"
        dt = term.datatype
        if dt is None or dt == XSD.string:
            return _lit(lex)
        if dt in _BARE_DT:
            return lex
        return f"{_lit(lex)}^^{_qname(dt)}"
    return _lit(str(term))


def _render_editor_value(pred: str, value) -> list[str]:
    """Render an editor-supplied predicate value into a list of TTL object
    strings. String predicates are quoted; numbers/booleans emit bare; strings
    that look like prefixed names / <IRI>s are treated as object references."""
    vals = value if isinstance(value, list) else [value]
    out = []
    for v in vals:
        if v is None or v == "":
            continue
        if pred in STRING_PREDS:
            out.append(_lit(v))
        elif isinstance(v, bool):
            out.append("true" if v else "false")
        elif isinstance(v, int):
            out.append(str(v))
        elif isinstance(v, float):
            out.append(f"{v}")
        elif isinstance(v, str) and _REF_RE.match(v):
            out.append(v)
        else:
            out.append(_lit(v))
    return out


def render_block(node: dict, existing: dict | None = None,
                 managed: set | None = None) -> str:
    """Render one node's TTL block, MERGING editor input over the predicates the
    node already carries on disk.

    `node`     : editor payload — prefixed `id`/`type` plus predicate keys whose
                 values are strings, numbers, or lists of `id:` refs.
    `existing` : {pred_qname: [ttl_object_str, ...]} parsed from disk (empty for
                 a brand-new node).
    `managed`  : predicates the editor is authoritative over. A managed predicate
                 the editor did NOT send is a deletion; an unmanaged predicate is
                 preserved from `existing`. Defaults to the payload's own keys
                 (absence == preserve — the loss-proof default)."""
    subject = node["id"]
    payload = {k: v for k, v in node.items() if k not in _META_KEYS}
    existing = existing or {}
    if managed is None:
        managed = set(payload)
    managed = set(managed) | set(payload)

    body: dict[str, list[str]] = {}
    # 1. preserve everything the editor is NOT authoritative over
    for pred, vals in existing.items():
        if pred not in managed:
            body[pred] = list(vals)
    # 2. apply editor input (present -> replace; managed-but-absent -> delete)
    for pred, value in payload.items():
        rendered = _render_editor_value(pred, value)
        if rendered:
            body[pred] = rendered

    pairs = [("a", node["type"])]
    seen = set()
    for pred in ORDER:
        if pred in body:
            pairs.append((pred, ", ".join(sorted(body[pred]))))
            seen.add(pred)
    for pred in sorted(body):
        if pred not in seen:
            pairs.append((pred, ", ".join(sorted(body[pred]))))
    text = " ;\n    ".join(f"{p} {v}" for p, v in pairs)
    return f"{subject} {text} ."


def abox_files() -> list[str]:
    """Every ABox TTL under `ontology/abox`, at any depth, path-sorted.

    The glob must be RECURSIVE: the ABox is organised into per-group
    directories (`abox/core/<group>/<type>.ttl`, ONTOLOGYSTYLE §4), so a flat
    `abox/*.ttl` matches nothing and the UI would silently see an empty
    ontology. `**` with recursive=True also matches zero directories, so a
    flat file such as `abox/authored.ttl` is still found."""
    return sorted(glob.glob(os.path.join(ABOX_DIR, "**", "*.ttl"),
                            recursive=True))


def _read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def _iter_blocks(text: str):
    """Yield (subject, start_line, end_line) for each `id:... .` block. A block
    starts at a line beginning with `id:<name>` and ends at the first following
    line whose stripped text ends with '.'."""
    lines = text.split("\n")
    i, n = 0, len(lines)
    while i < n:
        m = _SUBJECT_RE.match(lines[i])
        if m:
            j = i
            while j < n and not lines[j].rstrip().endswith("."):
                j += 1
            yield m.group(1), i, min(j, n - 1)
            i = j + 1
        else:
            i += 1


def find_subject_file(subject: str):
    for path in abox_files():
        for subj, _i, _j in _iter_blocks(_read(path)):
            if subj == subject:
                return path
    return None


def _existing_preds(path: str, subject: str) -> dict[str, list[str]]:
    """Parse `path` and return {pred_qname: [ttl_object_str, ...]} for `subject`
    (rdf:type excluded — it is re-emitted from the node's `type`). This is the
    prior on-disk state that a save must preserve."""
    g = Graph()
    g.parse(path, format="turtle")
    subj = _expand(subject)
    out: dict[str, list[str]] = {}
    for p, o in g.predicate_objects(subj):
        if p == RDF.type:
            continue
        out.setdefault(_qname(p), []).append(_term_ttl(o))
    return {k: sorted(v) for k, v in out.items()}


def _replace_block(text: str, subject: str, new_block: str):
    lines = text.split("\n")
    for subj, i, j in _iter_blocks(text):
        if subj == subject:
            return "\n".join(lines[:i] + new_block.split("\n") + lines[j + 1:])
    return None


def _check_mtime(path: str, expected_mtimes) -> None:
    if not expected_mtimes:
        return
    key = os.path.relpath(path, ABOX_DIR)
    want = expected_mtimes.get(key)
    if want is not None and abs(os.path.getmtime(path) - float(want)) > 1e-6:
        raise Conflict(f"{key} changed on disk since read")


def plan_upsert(node: dict, target_basename: str = "authored.ttl",
                expected_mtimes: dict | None = None) -> dict:
    """Compute the write without performing it. Returns
    {file, old, new, created} — `old` is None when a new file is created.

    For an existing node the write is a MERGE: predicates the editor did not
    touch are read back from disk (`_existing_preds`) and re-emitted unchanged,
    so a save can never silently drop data outside a tool-side whitelist."""
    subject = node["id"]
    managed = set(node["_managed"]) if node.get("_managed") is not None else None
    existing_file = find_subject_file(subject)
    if existing_file:
        _check_mtime(existing_file, expected_mtimes)
        old = _read(existing_file)
        existing = _existing_preds(existing_file, subject)
        block = render_block(node, existing=existing, managed=managed)
        new = _replace_block(old, subject, block)
        return {"file": existing_file, "old": old, "new": new, "created": False}

    block = render_block(node, existing={}, managed=managed)
    path = os.path.join(ABOX_DIR, target_basename)
    if os.path.exists(path):
        _check_mtime(path, expected_mtimes)
        old = _read(path)
        new = old.rstrip("\n") + "\n\n" + block + "\n"
        return {"file": path, "old": old, "new": new, "created": False}
    return {"file": path, "old": None, "new": _HEADER + block + "\n",
            "created": True}


def atomic_write(path: str, text: str) -> None:
    directory = os.path.dirname(path)
    fd, tmp = tempfile.mkstemp(dir=directory, suffix=".ttl.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(tmp, path)
    except Exception:
        if os.path.exists(tmp):
            os.remove(tmp)
        raise


def restore(path: str, old: str, created: bool) -> None:
    """Undo a write: delete a newly-created file, or restore prior content."""
    if created:
        if os.path.exists(path):
            os.remove(path)
    else:
        atomic_write(path, old)
