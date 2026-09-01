#!/usr/bin/env python3
"""Build projection of the harness ontology — the DUAL of retrieve.py.

retrieve.py is the READ projection: given a request it emits a bounded
context pack for an agent to read. materialize.py is the BUILD projection:
given a VALIDATED harness it renders an actual runnable harness file tree
(CLAUDE.md + a build manifest) from the composed union.

  retrieve : ontology -> request-scoped context pack (what to READ)
  materialize : validated harness -> file tree (what to BUILD)

Only a validated harness materializes. Before emitting anything we run the
same structured validation validate.py runs; if the union does not PASS we
refuse (non-zero exit). This keeps the build honest: a file tree is only ever
produced from a connected, well-typed, capability-complete graph.

Increment 1 was the SPINE (P1) + template-file references (P2), emitting
CLAUDE.md + MANIFEST.json. Increment 2 (this file) adds first-class roles (P4:
.claude/agents/<role>.md per ho:hasRole), tool implementation refs (P3:
ho:implementationRef fetched/copied into tools/<basename>) and standard/docs
scaffold (P5: ho:scaffold / ho:artifactTemplate fragments rendered into the
tree). The design doc is docs/materialize-design.md IN THIS REPO — it is this
tool's design spec, so it lives with the tool (it briefly sat in harness-concrete
after the 2026-09 ladder split and drifted out of date there). The instances it
consumes stay in harness-concrete, a CONCRETE-level concern.

Emitted text is SELF-CONTAINED. Graph text (skos:definition / ho:promptText) may
name a neighbouring node by its authoring token — id:chan-dispatch,
ho:appliesPattern — which disambiguates nodes for the ontology AUTHOR but dangles
for the agent reading the built document. The build therefore renders from a
projection of the graph in which those tokens are resolved to prefLabel/rdfs:label
(see IriTokenResolver); the stored ontology keeps its disambiguation unchanged.

Usage — run it where the instances are, i.e. the CONCRETE repo
(harness-concrete), which checks this repo out as ./central/:

    HARNESS_CATALOG=catalog-v001.xml \
    /usr/bin/python3 central/tools/materialize.py h-techdoc --out build/techdoc
    ... https://harness-ontology.dev/id/techdoc/h-techdoc --out build/techdoc --format json

Composition honours HARNESS_CATALOG / HARNESS_ROOT_ONTOLOGY exactly like
validate.py and retrieve.py, so a recipe union materializes the same way the
central store does. There are no harness individuals in this repo alone, so
running it here has nothing to materialize.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile

from rdflib import Graph, Literal, RDF, RDFS, URIRef
from rdflib.namespace import SKOS, XSD

import ontology_lib as lib
from ontology_lib import HO
import validate

# --- deterministic component ordering ---------------------------------
# Sections are emitted in this fixed order; within a section, multiple
# components are sorted by IRI so the same input yields byte-identical output.


def _sorted(nodes):
    return sorted(nodes, key=str)


def _workflow_steps(g: Graph, wf: URIRef) -> list:
    """A workflow's ho:hasStep steps in a total, deterministic order: ascending
    ho:stepOrder, ties broken by IRI (a step missing stepOrder sorts first).
    Empty when the workflow is not decomposed into steps."""
    def key(step):
        order = g.value(step, HO.stepOrder)
        return (0 if order is None else int(order), str(step))
    return sorted(g.objects(wf, HO.hasStep), key=key)


def _prompt_sections(g: Graph, sp: URIRef) -> list:
    """A SystemPrompt's ho:hasSection sections in a total, deterministic order:
    ascending ho:sectionOrder, ties broken by IRI (a section missing sectionOrder
    sorts first). Empty when the prompt is not decomposed into sections (then the
    Persona renders from the prompt's blob ho:promptText as before)."""
    def key(sec):
        order = g.value(sec, HO.sectionOrder)
        return (0 if order is None else int(order), str(sec))
    return sorted(g.objects(sp, HO.hasSection), key=key)


def role_slug(role: URIRef) -> str:
    """Filename stem for a role's agent file: the IRI's last segment with a
    leading 'role-' stripped (id:role-implementer -> 'implementer'), mirroring the
    conventional .claude/agents/<name>.md naming."""
    tail = str(role).rsplit("/", 1)[-1].rsplit("#", 1)[-1]
    return tail[len("role-"):] if tail.startswith("role-") else tail


# --- 1. target resolution ---------------------------------------------
def resolve_harness(g: Graph, ref: str) -> URIRef:
    """Resolve a full IRI or a short id (e.g. 'h-techdoc') to a Harness node.
    Raises ValueError if it is absent or not a Harness."""
    harnesses = set(g.subjects(RDF.type, HO.Harness))
    node = URIRef(ref)
    if node in harnesses:
        return node
    # short id: match a harness IRI ending in /<ref> or #<ref>
    matches = [h for h in harnesses
               if str(h).rsplit("/", 1)[-1] == ref or str(h).rsplit("#", 1)[-1] == ref]
    if len(matches) == 1:
        return matches[0]
    if not matches:
        known = ", ".join(sorted(str(h).rsplit("/", 1)[-1] for h in harnesses))
        raise ValueError(f"no harness matches '{ref}'. Known harnesses: {known}")
    raise ValueError(f"'{ref}' is ambiguous across {len(matches)} harnesses; use the full IRI")


# --- 1b. projection contract: ontology-internal IRI tokens ------------
# skos:definition and ho:promptText serve TWO audiences. Inside the graph they
# may name a neighbouring node by its AUTHORING token — "contrast
# id:chan-dispatch", "declares ho:appliesPattern". For the ontology author that
# disambiguation is correct and valuable (docs/plans/disambiguation-audit.md
# planted it deliberately, and retrieve.py's context pack is read by authors).
# For the agent that reads an EMITTED harness document those prefixes resolve to
# nothing: `id:` is not a namespace it can look up, so the reference dangles.
#
# The fix therefore belongs at the PROJECTION boundary, never in the graph: the
# stored text keeps its disambiguation, and rendering resolves each token to the
# human-readable name the emitted document's audience can use.

_TOKEN_RE = re.compile(r"\b(id|core|ho):([A-Za-z][A-Za-z0-9_-]*)")


def _decamel(name: str) -> str:
    """Fallback human form of a schema term with no rdfs:label, following the
    TBox's own labelling convention: a Class-style (leading upper-case) name
    keeps its word capitals ('ExecutionMode' -> 'Execution Mode'), a
    property-style name is lower-cased ('appliesPattern' -> 'applies pattern')."""
    words = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", name).replace("_", " ")
    return words if name[:1].isupper() else words.lower()


class IriTokenResolver:
    """Resolves the ontology-internal IRI tokens carried by GRAPH TEXT into the
    names an emitted document can actually be read with.

    Contract:
      * ``id:<slug>`` / ``core:<slug>`` -> that individual's skos:prefLabel.
      * ``ho:<Name>``                   -> that schema term's rdfs:label, else a
        de-camel-cased form of the name.
      * a token that names NOTHING in the composed union is a genuine dangling
        reference (a typo, or a node that did not travel into this union): it is
        REPORTED on stderr and rendered defensively as its bare name, so the
        build neither crashes nor silently hides the defect.

    Resolution is deterministic (same union + same text -> same output) and
    idempotent (a resolved label carries no token), so it is safe to apply on
    more than one path. A bare mention with no name after the colon (``ho:``)
    is not a reference and is left alone."""

    def __init__(self, g: Graph):
        self.g = g
        self._cache: dict[str, str] = {}
        self._by_slug: dict[str, list[URIRef]] | None = None
        self._shape_terms: set | None = None
        self.unresolved: dict[str, str] = {}

    # -- resolution ----------------------------------------------------
    def _slug_index(self) -> dict[str, list[URIRef]]:
        """Last IRI segment -> the named individuals carrying it (IRI-sorted).
        Keyed off skos:prefLabel because that is exactly the set of nodes with a
        human-readable name to resolve to; schema terms (rdfs:label) are looked
        up directly under the ho: namespace instead."""
        if self._by_slug is None:
            idx: dict[str, set] = {}
            for node in self.g.subjects(SKOS.prefLabel):
                if isinstance(node, URIRef):
                    slug = str(node).rsplit("/", 1)[-1].rsplit("#", 1)[-1]
                    idx.setdefault(slug, set()).add(node)
            self._by_slug = {k: _sorted(v) for k, v in idx.items()}
        return self._by_slug

    def _individual(self, prefix: str, slug: str) -> URIRef | None:
        """The individual a ``core:``/``id:`` token names, or None. ``core:`` is
        always the central library namespace. ``id:`` is namespace-relative to
        the document that authored the text (central ABox: core; a recipe: that
        recipe's domain), so it resolves by slug: a unique match wins, and when a
        slug exists in several domains the central one wins deterministically."""
        matches = self._slug_index().get(slug, [])
        core = lib.ID_CORE[slug]
        if prefix == "core":
            return core if core in matches else None
        if len(matches) == 1:
            return matches[0]
        if not matches:
            return None
        if core in matches:
            return core
        self._note(f"{prefix}:{slug}",
                   f"names {len(matches)} individuals across domains "
                   f"({', '.join(str(m) for m in matches)}); resolved to the "
                   f"first by IRI")
        return matches[0]

    def _shape_vocabulary(self) -> set:
        """The ho: terms declared by the SHACL shapes document rather than by the
        schema (ho:ComponentConnectivityShape, ho:TestScenarioShape, …). They are
        real names of this namespace — graph text cites them when explaining what
        covers a component — but they carry no rdfs:label and never enter the
        data graph, so without this they would look dangling. Loaded lazily (only
        when a ho: token has no label) and defensively (an unreadable shapes file
        simply yields no terms)."""
        if self._shape_terms is None:
            shapes = Graph()
            try:
                shapes.parse(os.path.join(lib.ONT_DIR, "shapes",
                                          "harness-shapes.ttl"), format="turtle")
            except Exception:  # noqa: BLE001 - absent/unreadable shapes: no terms
                pass
            self._shape_terms = {s for s in shapes.subjects()
                                 if isinstance(s, URIRef) and s.startswith(str(HO))}
        return self._shape_terms

    def _note(self, token: str, reason: str) -> None:
        self.unresolved.setdefault(token, reason)

    def _resolve_token(self, prefix: str, name: str) -> str:
        if prefix == "ho":
            label = self.g.value(HO[name], RDFS.label)
            if label is not None:
                return str(label)
            if HO[name] not in self._shape_vocabulary():
                self._note(f"ho:{name}",
                           "no such term in the ho: schema or shapes (rendered "
                           "de-camel-cased)")
            return _decamel(name)
        node = self._individual(prefix, name)
        if node is not None:
            return str(self.g.value(node, SKOS.prefLabel))
        self._note(f"{prefix}:{name}",
                   "names no individual in the composed union (rendered as its "
                   "bare name)")
        return name

    def _substitute(self, match: re.Match) -> str:
        token = match.group(0)
        if token not in self._cache:
            self._cache[token] = self._resolve_token(match.group(1),
                                                     match.group(2))
        return self._cache[token]

    def resolve(self, text: str) -> str:
        """`text` with every internal IRI token replaced by its readable name."""
        if not text or ":" not in text:
            return text
        return _TOKEN_RE.sub(self._substitute, text)

    # -- the projection ------------------------------------------------
    def resolve_literal(self, obj):
        """One literal, projected. Only text literals are touched; a typed
        literal (ho:tokenEstimate, ho:userFacing, …) is returned unchanged."""
        if not isinstance(obj, Literal) or obj.datatype not in (None, XSD.string):
            return obj
        text = str(obj)
        resolved = self.resolve(text)
        if resolved == text:
            return obj
        if obj.language:
            return Literal(resolved, lang=obj.language)
        return Literal(resolved, datatype=obj.datatype)

    def project(self, g: Graph) -> Graph:
        """A COPY of `g` whose text literals are resolved — the SINGLE point at
        which stored text becomes emitted text. Every renderer downstream reads
        the projected graph, so no render path (CLAUDE.md sections, role agent
        files, channel records, skill bodies, the manifest — or one added later)
        can re-open the leak, and no per-predicate allow-list has to be kept in
        sync. The stored ontology is untouched: this is an in-memory projection.

        Template FILES are deliberately NOT rewritten. A hand-authored
        ho:artifactTemplate body is already written for the emitted document's
        audience (a harness whose subject IS this ontology may name ho:* terms on
        purpose), and it is byte-copied/fetched, not graph text; only the
        ``{{...}}`` values it interpolates come from the graph, and those arrive
        already resolved through this projection."""
        out = Graph()
        for s, p, o in g:
            out.add((s, p, self.resolve_literal(o)))
        return out

    # -- reporting -----------------------------------------------------
    def report(self, stream=sys.stderr) -> list[str]:
        """Print one warning per genuinely dangling reference met while
        projecting the graph's text, token-sorted so the output is deterministic;
        return the tokens. A dangling reference is a real defect worth seeing
        (a typo, or a node that did not travel into this union), so it is never
        swallowed — the build still succeeds with the defensive rendering."""
        for token, reason in sorted(self.unresolved.items()):
            print(f"⚠ dangling reference '{token}' in graph text: {reason}",
                  file=stream)
        return sorted(self.unresolved)


# --- 2. template mechanism (P2) ---------------------------------------
def _template_bases() -> list[str]:
    """Roots against which a repo-relative ho:artifactTemplate path resolves,
    in priority order:
      1. the ontology repo root (tools/, ontology/ live here)
      2. the catalog's directory — the RECIPE repo root when a recipe union is
         materialized via HARNESS_CATALOG (so a recipe can ship its own
         template fragments next to its .ttl)
    First existing file wins."""
    bases = [lib.ROOT]
    catalog_dir = os.path.dirname(os.path.abspath(lib.CATALOG))
    if catalog_dir not in bases:
        bases.append(catalog_dir)
    return bases


# Canonical harness-100 corpus URLs (emitted by import_corpus.py as the PORTABLE
# ho:artifactTemplate / dct:source ref) still need a readable file to inline /
# byte-copy at build time. We map such a URL to its path in a LOCAL clone of the
# corpus: `.../tree/main/en/<rest>` -> `<clone>/en/<rest>`. The clone root is
# configurable via HARNESS_100_CLONE (default: the conventional checkout);
# nothing past that fallback is hard-coded. A URL that maps to a missing file (no
# clone in this environment) degrades to a reference stub — the build never
# crashes and never re-introduces a machine-specific absolute path into OUTPUT.
HARNESS_100_URL_PREFIX = "https://github.com/revfactory/harness-100/tree/main/"


def _harness_100_clone() -> str:
    return os.environ.get("HARNESS_100_CLONE", "/home/cpark/git/harness-100")


def _map_corpus_url(ref: str) -> str | None:
    """If `ref` is a canonical harness-100 corpus URL, return its path in the
    local clone (whether or not that file exists); otherwise None."""
    if ref and ref.startswith(HARNESS_100_URL_PREFIX):
        rest = ref[len(HARNESS_100_URL_PREFIX):]
        return os.path.normpath(os.path.join(_harness_100_clone(), rest))
    return None


def resolve_template(rel_path: str) -> str:
    for base in _template_bases():
        cand = os.path.normpath(os.path.join(base, rel_path))
        if os.path.exists(cand):
            return cand
    raise FileNotFoundError(
        f"ho:artifactTemplate '{rel_path}' not found under any of: {_template_bases()}")


def render_from_template(g: Graph, node: URIRef, tmpl_path: str) -> str:
    """Read the template fragment and substitute the node's graph data.
    Supported placeholders: {{prefLabel}}, {{promptText}}, {{definition}}.

    A repo-relative template resolves under the repo/recipe roots exactly as
    before. A canonical harness-100 corpus URL is mapped to the local clone (see
    _map_corpus_url) and inlined from there — yielding output byte-identical to
    the former local-path era, since the URL maps to that same file. If the clone
    file is absent, or the ref is any other URL, or a bare absolute path we refuse
    to re-open (would re-leak a machine path into the inlined body), the build
    degrades to a reference stub instead of crashing."""
    mapped = _map_corpus_url(tmpl_path)
    if mapped is not None:
        if not os.path.isfile(mapped):
            return _ref_stub("artifactTemplate", tmpl_path, str(node)).rstrip("\n")
        src = mapped
    elif tmpl_path.startswith(("http://", "https://")) or os.path.isabs(tmpl_path):
        return _ref_stub("artifactTemplate", tmpl_path, str(node)).rstrip("\n")
    else:
        src = resolve_template(tmpl_path)
    with open(src, encoding="utf-8") as fh:
        text = fh.read()
    subs = {
        "{{prefLabel}}": lib.label_of(g, node),
        "{{promptText}}": str(g.value(node, HO.promptText) or ""),
        "{{definition}}": str(g.value(node, SKOS.definition) or ""),
    }
    for key, val in subs.items():
        text = text.replace(key, val)
    return text.rstrip("\n")


def render_component(g: Graph, node: URIRef, fallback: str) -> tuple[str, str | None]:
    """Return (section_body, template_source_or_None). If the node carries
    ho:artifactTemplate, render through it; otherwise use the graph-data
    fallback text supplied by the caller."""
    tmpl = g.value(node, HO.artifactTemplate)
    if tmpl is not None:
        return render_from_template(g, node, str(tmpl)), str(tmpl)
    return fallback, None


# --- 3. CLAUDE.md assembly --------------------------------------------
def _component_type(g: Graph, node: URIRef) -> str:
    """Most specific ontology type of a component (Tool/Role/Channel/ModelConfig/…),
    so the manifest records the concrete subtype not the abstract HarnessComponent.
    lib.most_specific_types now yields the concrete subtype directly (its reflexive
    rdfs:subClassOf self-edge is guarded); the list is IRI-sorted, so on the rare
    node with several concrete types we deterministically take the first."""
    types = lib.most_specific_types(g, node)
    return types[0].split("#")[-1] if types else "HarnessComponent"


def channel_record(g: Graph, chan: URIRef) -> dict:
    """One ho:Channel's manifest/render record: iri, label, definition, the
    participant roles (as {iri,label}, sorted by IRI), whether the user is an
    endpoint (ho:involvesUser), and the conduit (ho:channelMedium). Deterministic
    — participant ordering is IRI-sorted."""
    parts = _sorted(g.objects(chan, HO.channelParticipant))
    involves = g.value(chan, HO.involvesUser)
    return {
        "iri": str(chan),
        "label": lib.label_of(g, chan),
        "definition": str(g.value(chan, SKOS.definition) or ""),
        "participants": [{"iri": str(p), "label": lib.label_of(g, p)} for p in parts],
        "involvesUser": bool(involves.toPython()) if involves is not None else False,
        "medium": str(g.value(chan, HO.channelMedium) or ""),
    }


# --- 3a. CLAUDE.md section renderers (one per ho:sectionKind) ----------
# Each renderer appends its section's lines to `out` (a shared line buffer that
# build_claude_md joins with "\n"). The renderers are keyed by ho:sectionKind and
# invoked in the ORDER the graph declares (see resolve_assembly_order); moving a
# section is now graph data, not a code change here. Behaviour is byte-for-byte
# what the former fixed-order emitter produced, so a harness whose assembly order
# equals the historical order materializes identically. `ctx` carries the
# harness-wide values the renderers share (sources sink, roles/channels/
# instructions lists, and the set of per-role personas excluded from the top
# Persona section).

def _render_overview(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Opening overview: the harness prefLabel heading and its definition."""
    out.append(f"# {lib.label_of(g, h)}")
    out.append("")
    definition = g.value(h, SKOS.definition)
    if definition:
        out.append(str(definition))
        out.append("")


def _render_persona(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Persona: hasSystemPrompt prompts, excluding per-role personas."""
    out.append("## Persona")
    out.append("")
    for sp in _sorted(g.objects(h, HO.hasSystemPrompt)):
        if sp in ctx["role_personas"]:
            continue
        # A decomposed SystemPrompt (ho:hasSection) composes its Persona from the
        # ordered section fragments; a section-less prompt renders its blob text.
        sections = _prompt_sections(g, sp)
        if sections:
            fallback = "\n\n".join(
                str(g.value(sec, HO.promptText) or lib.label_of(g, sec))
                for sec in sections)
        else:
            fallback = str(g.value(sp, HO.promptText) or lib.label_of(g, sp))
        body, src = render_component(g, sp, fallback)
        if src:
            ctx["sources"].append(src)
        out.append(body)
        out.append("")


def _render_operating_rules(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Operating rules: hasGuardrail policies (+ language conditions), followed
    by the harness's run-governance DECLARATIONS — the operating envelope
    (ho:hasEnvelope), the autonomy tier (ho:autonomyTier) and the environment
    fidelity rung (ho:environmentFidelity). The three are rendered by this
    section (positioned by the as-operating-rules AssemblySection) rather than
    by dedicated ho:sectionKind values because the kind enum is CLOSED in the
    SHACL shapes (AssemblySectionShape sh:in) — extending it is a schema
    decision, and each companion below is a strictly conditional `##` block, so
    a later promotion to first-class kinds is a byte-identical refactor.
    Semantically they belong here: like the guardrails, they state the rules the
    harness operates UNDER — which requests it undertakes (envelope), who may
    approve what (tier) and how real the environment behind its tools is
    (fidelity) — before Process says how it works."""
    out.append("## Operating rules")
    out.append("")
    for gr in _sorted(g.objects(h, HO.hasGuardrail)):
        fallback = str(g.value(gr, HO.promptText) or "")
        body, src = render_component(g, gr, fallback)
        if src:
            ctx["sources"].append(src)
        out.append(f"- **{lib.label_of(g, gr)}** — {body}")
        for cond in sorted(str(c) for c in g.objects(gr, HO.languageCondition)):
            out.append(f"    - {cond}")
    out.append("")
    _render_operating_envelope(g, h, out, ctx)
    _render_autonomy_tier(g, h, out, ctx)
    _render_environment_fidelity(g, h, out, ctx)


# How the two ho:envelopeDefault postures read in an emitted document. CLOSED
# set (mirrors the sh:in on ho:envelopeDefault): an unrecognised value is a
# hard error, never a silently generic sentence — the same closed-policy rule
# select_candidate applies to ho:selectionPolicy.
_ENVELOPE_DEFAULT_GLOSS = {
    "restrictive": "whatever the statements below do not include is OUT of range",
    "permissive": "whatever the statements below do not exclude is in range",
}


def _render_operating_envelope(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Operating envelope: the declared range (ho:hasEnvelope) — the envelope's
    own definition, its default posture, the exit policy it points at
    (ho:onEnvelopeExit — named here by LABEL only: the rows' condition/recovery
    text lives in the Error handling table, reached through the harness's own
    ho:hasFailurePolicy binding, so the two edges stay non-duplicating) and one
    table row per EnvelopeStatement. Columns: the attribute judged, the verdict,
    the boundary value and the observation that decides it at request time.
    ho:envelopeValueType and ho:envelopeClosure are deliberately NOT columns
    (typing/closure metadata a reader gets from the boundary text and the stated
    default; the Error-handling precedent keeps tables to the load-bearing
    cells). Conditional — a harness that declares no envelope emits nothing."""
    envelopes = _sorted(g.objects(h, HO.hasEnvelope))
    if not envelopes:
        return
    out.append("## Operating envelope")
    out.append("")
    out.append("The declared operating range — which requests and run states "
               "this harness undertakes to handle. Judge each incoming request "
               "against the statements' observables; the range is an "
               "undertaking, distinct from what the harness's tools make it "
               "capable of.")
    out.append("")
    for oe in envelopes:
        desc = g.value(oe, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, oe)}**{tail}")
        default = g.value(oe, HO.envelopeDefault)
        if default is not None:
            key = str(default)
            if key not in _ENVELOPE_DEFAULT_GLOSS:
                raise ValueError(
                    f"unrecognised ho:envelopeDefault '{key}' on <{oe}>; "
                    f"recognised: {sorted(_ENVELOPE_DEFAULT_GLOSS)}")
            out.append(f"    - default: {key} — {_ENVELOPE_DEFAULT_GLOSS[key]}")
        exits = _sorted(g.objects(oe, HO.onEnvelopeExit))
        if exits:
            names = "; ".join(lib.label_of(g, x) for x in exits)
            # The cross-reference to the Error handling table is only printed
            # when the harness ENROLS every exit row in its own catalog
            # (ho:hasFailurePolicy) — a harness may point at central rows it
            # does not carry, and then the pointer would dangle.
            enrolled = set(g.objects(h, HO.hasFailurePolicy))
            suffix = (" (see Error handling)"
                      if all(x in enrolled for x in exits) else "")
            out.append(f"    - on range exit: {names}{suffix}")
        out.append("")
        statements = _sorted(g.objects(oe, HO.hasEnvelopeStatement))
        if statements:
            out.append("| Attribute | Verdict | Boundary | Decided by |")
            out.append("| --- | --- | --- | --- |")
            for st in statements:
                attr = g.value(st, HO.envelopeAttribute)
                attr_cell = lib.label_of(g, attr) if attr is not None else ""
                verdict = str(g.value(st, HO.envelopeVerdict) or "")
                threshold = str(g.value(st, HO.envelopeThreshold) or "—")
                observable = str(g.value(st, HO.envelopeObservable) or "")
                out.append(f"| {_cell(attr_cell)} | {_cell(verdict)} "
                           f"| {_cell(threshold)} | {_cell(observable)} |")
            out.append("")
        # Cross-attribute rules, WHEN -> include/exclude. No current harness
        # declares one (rules are the documented exception, not the norm), so
        # this path is exercised by no present build; it exists so a declared
        # rule can never silently miss the emitted document.
        for rule in _sorted(g.objects(oe, HO.hasEnvelopeRule)):
            cond = g.value(rule, HO.ruleCondition)
            effect = g.value(rule, HO.ruleEffect)
            out.append(f"- **Rule: {lib.label_of(g, rule)}** — when {cond}: "
                       f"{effect}")
            out.append("")


def _render_autonomy_tier(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Autonomy tier: the responsibility allocation the harness declares
    (ho:autonomyTier, at most one) — the tier's definition plus its five
    closed-value slots as sub-bullets. Conditional — a harness that declares no
    tier emits nothing."""
    tiers = _sorted(g.objects(h, HO.autonomyTier))
    if not tiers:
        return
    out.append("## Autonomy tier")
    out.append("")
    out.append("The allocation of responsibility between the user and this "
               "harness: who executes the work, who oversees the run, who owns "
               "the fallback when the declared envelope is exited, and at what "
               "unit of work a human approval is granted.")
    out.append("")
    for tier in tiers:
        desc = g.value(tier, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, tier)}**{tail}")
        for pred, name in ((HO.executionOwner, "executes"),
                           (HO.oversightOwner, "oversees"),
                           (HO.fallbackOwner, "fallback owner"),
                           (HO.approvalUnit, "approval unit"),
                           (HO.envelopeBinding, "envelope binding")):
            value = g.value(tier, pred)
            if value is not None:
                out.append(f"    - {name}: {value}")
    out.append("")


def _render_environment_fidelity(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Environment fidelity: the declared rung of the staged-rollout ladder
    (ho:environmentFidelity, at most one — the sh:in enum is enforced by
    HarnessShape, so no value gloss is duplicated here). Conditional — a
    harness that makes no fidelity claim emits nothing."""
    rungs = sorted(str(r) for r in g.objects(h, HO.environmentFidelity))
    if not rungs:
        return
    out.append("## Environment fidelity")
    out.append("")
    out.append("How real the environment behind this harness's actions is "
               "declared to be — its rung on the staged-rollout ladder (mock, "
               "cassette, replica, digital-twin, production). Promotion along "
               "the ladder is a change of this one declared value.")
    out.append("")
    for rung in rungs:
        out.append(f"- declared fidelity: {rung}")
    out.append("")


def _render_process(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Process: hasWorkflow (with ordered steps) + appliesPattern."""
    out.append("## Process")
    out.append("")
    for wf in _sorted(g.objects(h, HO.hasWorkflow)):
        desc = g.value(wf, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **Workflow: {lib.label_of(g, wf)}**{tail}")
        # A decomposed workflow (ho:hasStep) renders its ordered steps beneath
        # the one-line workflow entry; a step-less workflow renders as before.
        for step in _workflow_steps(g, wf):
            order = g.value(step, HO.stepOrder)
            num = f"{int(order)}. " if order is not None else ""
            sdesc = g.value(step, SKOS.definition)
            stail = f" — {sdesc}" if sdesc else ""
            out.append(f"    - **{num}{lib.label_of(g, step)}**{stail}")
            for role in _sorted(g.objects(step, HO.stepByRole)):
                out.append(f"        - by role: {lib.label_of(g, role)}")
            for tool in _sorted(g.objects(step, HO.stepUsesTool)):
                out.append(f"        - uses tool: {lib.label_of(g, tool)}")
            for grd in _sorted(g.objects(step, HO.stepGuardedBy)):
                out.append(f"        - guarded by: {lib.label_of(g, grd)}")
    for pat in _sorted(g.objects(h, HO.appliesPattern)):
        desc = g.value(pat, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **Pattern: {lib.label_of(g, pat)}**{tail}")
    out.append("")


def _render_model(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Model / config: usesModel."""
    out.append("## Model")
    out.append("")
    for mc in _sorted(g.objects(h, HO.usesModel)):
        cfg = g.value(mc, HO.promptText)
        tail = f" (`{cfg}`)" if cfg else ""
        out.append(f"- {lib.label_of(g, mc)}{tail}")
    out.append("")


def _render_roles(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Roles: hasRole sub-agents. Conditional — a role-less harness emits
    nothing (exactly as the former fixed-order emitter's `if roles:` guard)."""
    roles = ctx["roles"]
    if not roles:
        return
    out.append("## Roles")
    out.append("")
    out.append("This harness dispatches the following sub-agents; each has "
               "its own agent file under `.claude/agents/`.")
    out.append("")
    for r in roles:
        desc = g.value(r, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, r)}** (`.claude/agents/"
                   f"{role_slug(r)}.md`){tail}")
    out.append("")


def _render_channels(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Coordination channels: hasChannel. Conditional — a channel-less harness
    emits nothing."""
    channels = ctx["channels"]
    if not channels:
        return
    out.append("## Coordination channels")
    out.append("")
    out.append("The roles (and the user) coordinate over the following "
               "channels; each names its participants, whether the user is "
               "an endpoint, and the medium it rides on.")
    out.append("")
    for chan in channels:
        rec = channel_record(g, chan)
        out.append(f"- **{rec['label']}**"
                   + (f" — {rec['definition']}" if rec["definition"] else ""))
        if rec["participants"]:
            names = ", ".join(p["label"] for p in rec["participants"])
            out.append(f"    - participants: {names}")
        out.append(f"    - involves user: {'yes' if rec['involvesUser'] else 'no'}")
        if rec["medium"]:
            out.append(f"    - medium: {rec['medium']}")
    out.append("")


def _render_skills(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Skills: hasInstruction procedures. Conditional — a skill-less harness
    emits nothing."""
    instructions = ctx["instructions"]
    if not instructions:
        return
    out.append("## Skills")
    out.append("")
    out.append("This harness ships the following skills (named on-demand "
               "procedures); each has its own file under `.claude/skills/`.")
    out.append("")
    for ins in instructions:
        name = instruction_name(g, ins)
        desc = g.value(ins, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, ins)}** (`.claude/skills/"
                   f"{name}/SKILL.md`){tail}")
    out.append("")


def _execution_modes(g: Graph, h: URIRef) -> list:
    """The harness's ho:ExecutionMode declarations (ho:hasExecutionMode), sorted
    by IRI. A first-class Harness property, read directly — the axis is NOT
    recovered by joining ho:appliesPattern with a concept tag, so the
    architectural patterns stay entirely with the Process section (which renders
    appliesPattern as a whole). A new execution mode needs no change here: it is
    one more ho:ExecutionMode individual in the ontology."""
    return _sorted(g.objects(h, HO.hasExecutionMode))


def _render_execution_mode(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Execution mode: the runtime coordination topology (or topologies) the
    harness declares. ho:hasExecutionMode has no maxCount, so a harness may
    declare SEVERAL modes — planes that run at the same time, such as
    dispatched workers alongside standing session-resident agents — and every
    declared mode is rendered. The lead-in sentence follows the COUNT: a single
    declared mode gets the singular blurb, two or more get the plural one that
    explains why several are listed. The branch is a pure function of the mode
    count, so the emit stays deterministic. Conditional — a harness that
    declares no execution mode (e.g. any single-agent harness) emits nothing."""
    modes = _execution_modes(g, h)
    if not modes:
        return
    out.append("## Execution mode")
    out.append("")
    if len(modes) == 1:
        out.append("The runtime topology this harness activates and "
                   "coordinates its agents in (chosen separately from the "
                   "architectural pattern named under Process).")
    else:
        out.append("The runtime topologies this harness activates and "
                   "coordinates its agents in (chosen separately from the "
                   "architectural pattern named under Process). This harness "
                   "declares more than one mode, so the planes below run "
                   "alongside each other — for example dispatched workers "
                   "alongside standing session-resident agents — and each "
                   "applies to the part of the harness its description names.")
    out.append("")
    for mode in modes:
        desc = g.value(mode, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, mode)}**{tail}")
    out.append("")


def _deliverable_flow(g: Graph, h: URIRef) -> list:
    """The harness's task-DAG data flow as (deliverable, producers, consumers)
    rows sorted by deliverable IRI: every ho:Deliverable named by a step of one of
    the harness's workflows, JOINED from the producing side (ho:stepProduces) to
    the consuming side (ho:stepConsumes). The join is what makes the DAG
    recoverable — a single ho:stepOrder integer cannot express which artifact
    moves from which step to which. Producer/consumer lists are IRI-sorted and
    de-duplicated (a step reachable through two workflows is listed once)."""
    producers: dict = {}
    consumers: dict = {}
    for wf in g.objects(h, HO.hasWorkflow):
        for step in g.objects(wf, HO.hasStep):
            for dlv in g.objects(step, HO.stepProduces):
                producers.setdefault(dlv, set()).add(step)
            for dlv in g.objects(step, HO.stepConsumes):
                consumers.setdefault(dlv, set()).add(step)
    rows = []
    for dlv in _sorted(set(producers) | set(consumers)):
        rows.append((dlv,
                     _sorted(producers.get(dlv, set())),
                     _sorted(consumers.get(dlv, set()))))
    return rows


def _render_data_flow(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Data flow: the Deliverable DAG joined from the workflow steps'
    ho:stepProduces / ho:stepConsumes. Conditional — a harness whose steps name no
    deliverable emits nothing."""
    rows = _deliverable_flow(g, h)
    if not rows:
        return
    out.append("## Data flow")
    out.append("")
    out.append("The named artifacts that flow between the workflow steps — which "
               "step emits each one and which step reads it.")
    out.append("")
    for dlv, produced_by, consumed_by in rows:
        desc = g.value(dlv, SKOS.definition)
        tail = f" — {desc}" if desc else ""
        out.append(f"- **{lib.label_of(g, dlv)}**{tail}")
        if produced_by:
            names = ", ".join(lib.label_of(g, s) for s in produced_by)
            out.append(f"    - produced by: {names}")
        if consumed_by:
            names = ", ".join(lib.label_of(g, s) for s in consumed_by)
            out.append(f"    - consumed by: {names}")
    out.append("")


def _cell(text: str) -> str:
    """One markdown table cell: pipes escaped and newlines flattened so a value
    can never break the table's row structure."""
    return text.replace("|", "\\|").replace("\n", " ").strip()


def _render_error_handling(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Error handling: the hasFailurePolicy rows as a failure-condition ->
    recovery-strategy table. Conditional — a harness that declares no failure
    policy emits nothing."""
    policies = _sorted(g.objects(h, HO.hasFailurePolicy))
    if not policies:
        return
    out.append("## Error handling")
    out.append("")
    out.append("The failure situations this harness has a pre-decided answer "
               "for, and the recovery each one takes.")
    out.append("")
    out.append("| Failure condition | Recovery strategy |")
    out.append("| --- | --- |")
    for pol in policies:
        conditions = sorted(str(c) for c in g.objects(pol, HO.failureCondition))
        strategies = sorted(str(s) for s in g.objects(pol, HO.recoveryStrategy))
        out.append(f"| {_cell(' '.join(conditions))} "
                   f"| {_cell(' '.join(strategies))} |")
    out.append("")


def _render_test_scenarios(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Test scenarios: the hasTestScenario behaviour-acceptance fixtures (kind,
    the request they run, what a correct run must exhibit, and the step they
    exercise). Conditional — a harness that carries no scenario emits nothing."""
    scenarios = _sorted(g.objects(h, HO.hasTestScenario))
    if not scenarios:
        return
    out.append("## Test scenarios")
    out.append("")
    out.append("The behaviour-acceptance fixtures this harness is judged "
               "against: a representative request and what a correct run must "
               "exhibit.")
    out.append("")
    for scn in scenarios:
        kind = g.value(scn, HO.scenarioKind)
        head = f"- **{lib.label_of(g, scn)}**"
        if kind is not None:
            head += f" ({kind})"
        desc = g.value(scn, SKOS.definition)
        if desc:
            head += f" — {desc}"
        out.append(head)
        for prompt in sorted(str(p) for p in g.objects(scn, HO.scenarioPrompt)):
            out.append(f"    - prompt: {prompt}")
        for expected in sorted(str(e) for e in g.objects(scn, HO.scenarioExpected)):
            out.append(f"    - expects: {expected}")
        for step in _sorted(g.objects(scn, HO.scenarioReferences)):
            out.append(f"    - exercises step: {lib.label_of(g, step)}")
    out.append("")


def _render_hooks(g: Graph, h: URIRef, out: list[str], ctx: dict) -> None:
    """Hooks: the ho:hasHook lifecycle automations grouped by ho:hookEvent (WHEN
    they fire) with each hook's action (WHAT it runs). Conditional — a harness that
    binds no hook emits nothing, so this section is inert for every harness without
    a ho:hasHook (including the base template)."""
    hooks = list(g.objects(h, HO.hasHook))
    if not hooks:
        return
    # Group by trigger event; sort events and, within each, hooks by IRI so the
    # emitted section is deterministic regardless of graph iteration order.
    by_event: dict = {}
    for hook in hooks:
        event = g.value(hook, HO.hookEvent)
        by_event.setdefault(str(event) if event is not None else "", set()).add(hook)
    out.append("## Hooks")
    out.append("")
    out.append("The lifecycle events this harness runs automation on — what fires "
               "automatically at each session, tool-use or turn boundary (outside "
               "the deliberate workflow steps).")
    out.append("")
    for event in sorted(by_event):
        label = event if event else "(unspecified event)"
        out.append(f"- **on `{label}`**")
        for hook in _sorted(by_event[event]):
            desc = g.value(hook, SKOS.definition)
            tail = f" — {desc}" if desc else ""
            out.append(f"    - {lib.label_of(g, hook)}{tail}")
            for action in sorted(str(a) for a in g.objects(hook, HO.hookAction)):
                out.append(f"        - runs: {action}")
    out.append("")


# Maps each ho:sectionKind to the renderer that emits that section. The KEYS are
# the CLOSED set of kinds an assembly order may name — an order that references a
# kind absent here is a hard error (resolve_assembly_order). This is the single
# in-code registry of buildable document sections; the SHACL sh:in enum on
# ho:sectionKind mirrors it.
SECTION_RENDERERS = {
    "overview": _render_overview,
    "persona": _render_persona,
    "operating-rules": _render_operating_rules,
    "process": _render_process,
    "model": _render_model,
    "roles": _render_roles,
    "channels": _render_channels,
    "skills": _render_skills,
    "execution-mode": _render_execution_mode,
    "data-flow": _render_data_flow,
    "error-handling": _render_error_handling,
    "test-scenarios": _render_test_scenarios,
    "hooks": _render_hooks,
}


def resolve_assembly_order(g: Graph, h: URIRef) -> list[str]:
    """The ordered list of section KINDS to emit for harness `h`, READ from the
    graph — the assembly order is SPEC, not hardcoded here. Resolution:
      1. the harness's own ho:hasAssemblySection set (ascending ho:assemblyOrder),
      2. else the central DEFAULT set on lib.DEFAULT_ASSEMBLY_HOLDER,
      3. else a hard error.
    The order must be TOTAL and well-defined — every section carries an integer
    ho:assemblyOrder, no two share one, and every ho:sectionKind is one the
    emitter recognises — or the build FAILS loudly (approved decision 2: an
    undefined order is an error, never a silent code fallback). This keeps the
    emitted document deterministic and byte-identical (INV-2)."""
    sections = list(g.objects(h, HO.hasAssemblySection))
    source = f"<{h}>"
    if not sections:
        sections = list(g.objects(lib.DEFAULT_ASSEMBLY_HOLDER, HO.hasAssemblySection))
        source = f"default set on <{lib.DEFAULT_ASSEMBLY_HOLDER}>"
    if not sections:
        raise ValueError(
            f"no assembly order resolvable for <{h}>: it declares no "
            f"ho:hasAssemblySection and the central default holder "
            f"<{lib.DEFAULT_ASSEMBLY_HOLDER}> carries none. The graph must define "
            f"a total assembly order (approved decision 2: no silent fallback).")
    by_order: dict[int, tuple[str, str]] = {}
    for sec in sections:
        raw = g.value(sec, HO.assemblyOrder)
        if raw is None:
            raise ValueError(
                f"assembly section <{sec}> ({source}) has no ho:assemblyOrder — "
                f"the assembly order is not total/well-defined.")
        order = int(raw)
        kind = g.value(sec, HO.sectionKind)
        if kind is None:
            raise ValueError(
                f"assembly section <{sec}> ({source}) has no ho:sectionKind.")
        kind = str(kind)
        if kind not in SECTION_RENDERERS:
            raise ValueError(
                f"assembly section <{sec}> names unknown ho:sectionKind "
                f"'{kind}' — the emitter has no renderer for it (recognised: "
                f"{sorted(SECTION_RENDERERS)}).")
        if order in by_order:
            raise ValueError(
                f"duplicate ho:assemblyOrder {order} in {source}: both "
                f"'{by_order[order][1]}' and '{kind}' claim position {order} — "
                f"the assembly order is not total.")
        by_order[order] = (str(sec), kind)
    return [kind for _order, (_iri, kind) in sorted(by_order.items())]


def build_claude_md(g: Graph, h: URIRef, sources: list[str],
                    roles: list[URIRef], channels: list[URIRef],
                    instructions: list[URIRef]) -> str:
    """Assemble CLAUDE.md deterministically from the harness's components, in the
    section ORDER the graph declares (resolve_assembly_order) — HOW the parts are
    assembled is SPEC (ho:AssemblySection), this only READS it. `sources` is
    appended to with every template path actually used. `roles` (the harness's
    ho:hasRole objects, sorted) are summarised in a Roles section and their
    personas are omitted from the top-level Persona section — each role persona
    is rendered into its own .claude/agents/<role>.md instead. `channels` (the
    harness's ho:hasChannel objects, sorted) are summarised in a Coordination
    channels section (participants, user involvement, medium). `instructions`
    (the harness's ho:hasInstruction objects, sorted) are summarised in a Skills
    section (name, what it does, its skill file); the conditional sections
    (roles/channels/skills) emit nothing when the harness has no such parts."""
    out: list[str] = []
    ctx = {
        "sources": sources,
        "roles": roles,
        "channels": channels,
        "instructions": instructions,
        "role_personas": {p for r in roles for p in g.objects(r, HO.rolePersona)},
    }
    for kind in resolve_assembly_order(g, h):
        SECTION_RENDERERS[kind](g, h, out, ctx)
    return "\n".join(out)


# --- 4. build manifest ------------------------------------------------
def all_components(g: Graph, h: URIRef):
    """Every bound component of the harness, sorted by IRI, as
    (iri, type, prefLabel)."""
    seen = set()
    for _p, comp in _iter_components(g, h):
        seen.add(comp)
    return [(str(c), _component_type(g, c), lib.label_of(g, c)) for c in _sorted(seen)]


def _iter_components(g: Graph, h: URIRef):
    for p in (HO.hasSystemPrompt, HO.usesTool, HO.hasGuardrail, HO.hasWorkflow,
              HO.usesModel, HO.hasExample, HO.hasInstruction, HO.hasComponent):
        for o in g.objects(h, p):
            yield p, o


def capability_bindings(g: Graph, h: URIRef):
    """For each requiresCapability, the component(s) that provide it — the
    composition proof, mirrored from validate.check_capability_satisfaction."""
    providers = {}
    for _p, comp in _iter_components(g, h):
        for cap in g.objects(comp, HO.providesCapability):
            providers.setdefault(cap, set()).add(comp)
    bindings = []
    for cap in _sorted(g.objects(h, HO.requiresCapability)):
        bound = _sorted(providers.get(cap, set()))
        bindings.append({
            "capability": str(cap),
            "capabilityLabel": lib.label_of(g, cap),
            "providedBy": [{"iri": str(b), "label": lib.label_of(g, b)} for b in bound],
        })
    return bindings


def build_manifest(g: Graph, h: URIRef, sources: list[str]) -> dict:
    comps = all_components(g, h)
    total_tokens = 0
    for iri, _t, _l in comps:
        est = g.value(URIRef(iri), HO.tokenEstimate)
        if est is not None:
            total_tokens += int(est)
    return {
        "harness": str(h),
        "prefLabel": lib.label_of(g, h),
        "derivedFrom": _sorted(str(d) for d in g.objects(h, HO.derivedFrom)),
        "components": [{"iri": iri, "type": typ, "label": label}
                       for iri, typ, label in comps],
        "capabilityBindings": capability_bindings(g, h),
        "channels": [channel_record(g, c)
                     for c in _sorted(g.objects(h, HO.hasChannel))],
        "templateSources": sorted(set(sources)),
        "tokenEstimate": total_tokens,
    }


# --- 5. role emitter (P4) ---------------------------------------------
def build_role_md(g: Graph, role: URIRef, sources: list[str]) -> str:
    """Render one role's .claude/agents/<slug>.md: persona (rolePersona), its
    least-privilege tool/guardrail scope, and its memory policy. Deterministic
    (scope lists sorted by IRI)."""
    out: list[str] = []
    slug = role_slug(role)
    definition = g.value(role, SKOS.definition)

    # -- frontmatter (agent-file convention) --
    out.append("---")
    out.append(f"name: {slug}")
    if definition:
        out.append(f"description: {definition}")
    out.append("---")
    out.append("")
    out.append(f"# {lib.label_of(g, role)}")
    out.append("")

    # -- user-facing stance (ho:userFacing is OPTIONAL: emit only when present) --
    user_facing = g.value(role, HO.userFacing)
    if user_facing is not None:
        if bool(user_facing):
            out.append("**User-facing role** — communicates directly with the user.")
        else:
            out.append("**Not user-facing** — dispatch-invoked only; does not "
                       "communicate with the user.")
        out.append("")

    # -- persona (rolePersona -> SystemPrompt) --
    persona = g.value(role, HO.rolePersona)
    if persona is not None:
        fallback = str(g.value(persona, HO.promptText) or lib.label_of(g, persona))
        body, src = render_component(g, persona, fallback)
        if src:
            sources.append(src)
        out.append(body)
        out.append("")

    # -- tool scope (roleTool) --
    tools = _sorted(g.objects(role, HO.roleTool))
    if tools:
        out.append("## Tools")
        out.append("")
        for t in tools:
            desc = g.value(t, SKOS.definition)
            tail = f" — {desc}" if desc else ""
            out.append(f"- **{lib.label_of(g, t)}**{tail}")
        out.append("")

    # -- guardrail scope (roleGuardrail) --
    guards = _sorted(g.objects(role, HO.roleGuardrail))
    if guards:
        out.append("## Guardrails")
        out.append("")
        for gr in guards:
            body = str(g.value(gr, HO.promptText) or "")
            sep = f" — {body}" if body else ""
            out.append(f"- **{lib.label_of(g, gr)}**{sep}")
        out.append("")

    # -- memory policy (roleMemoryPolicy) --
    policy = g.value(role, HO.roleMemoryPolicy)
    if policy is not None:
        out.append("## Memory policy")
        out.append("")
        out.append(str(policy))
        out.append("")

    return "\n".join(out)


def emit_roles(g: Graph, roles: list[URIRef], out_dir: str,
               sources: list[str]) -> list[dict]:
    """Write .claude/agents/<slug>.md for each role; return manifest records."""
    if not roles:
        return []
    agents_dir = os.path.join(out_dir, ".claude", "agents")
    os.makedirs(agents_dir, exist_ok=True)
    records = []
    for r in roles:
        slug = role_slug(r)
        body = build_role_md(g, r, sources)
        with open(os.path.join(agents_dir, f"{slug}.md"), "w",
                  encoding="utf-8") as fh:
            fh.write(body if body.endswith("\n") else body + "\n")
        rec = {
            "role": str(r),
            "label": lib.label_of(g, r),
            "agentFile": f".claude/agents/{slug}.md",
            "tools": _sorted(str(t) for t in g.objects(r, HO.roleTool)),
            "guardrails": _sorted(str(x) for x in g.objects(r, HO.roleGuardrail)),
        }
        # ho:userFacing is OPTIONAL: record it only when the role asserts it.
        uf = g.value(r, HO.userFacing)
        if uf is not None:
            rec["userFacing"] = bool(uf)
        records.append(rec)
    return records


# --- 6. BIND axis: candidate selection, implementation emit, lock -----
# The ODR BIND axis. A Tool's implementation is resolved deterministically:
#   1. a supplied lock that pins the tool  -> use the locked candidate (INV-2),
#   2. else the tool's ho:implementationCandidate list -> apply the selection
#      policy (tool-level ho:selectionPolicy overrides harness-level; default
#      "latest-stable"),
#   3. else a direct ho:implementationRef on the tool (degenerate 1-candidate),
#   4. else a stub.
# Selection is TOTAL and DETERMINISTIC so (spec + policy) reproduces the same
# choice and (spec + lock) reproduces byte-identical output.
LOCK_FILENAME = "harness.lock.json"
DEFAULT_POLICY = "latest-stable"


def _resolve_ref_path(ref: str) -> str | None:
    """Resolve a reference string to a readable local file path, or None if it
    names a URL / unresolvable path. This is the SINGLE fetch-resolution shared
    by every reference materialize follows — ho:implementationRef, ho:scaffold
    and skill ho:artifactTemplate refs alike: a recipe stores a REFERENCE to a
    concrete artifact, and materialize FETCHES it at build time (it never stores
    a copy of the artifact in the recipe). Tries, in order: the ontology repo
    root, the recipe dir (dirname of the catalog), then the ref as an absolute
    path (a possibly-EXTERNAL source, e.g. a real source harness on this
    machine). A URL or a path that resolves to nothing returns None so the
    caller can emit a fail-safe stub instead of crashing. A canonical harness-100
    corpus URL is first mapped to the local clone (HARNESS_100_CLONE) and returned
    if that file exists, so a URL-ref'd skill body byte-copies identically to the
    former local-path era; absent the clone it degrades to a stub."""
    if not ref:
        return None
    mapped = _map_corpus_url(ref)
    if mapped is not None:
        return mapped if os.path.isfile(mapped) else None
    if ref.startswith(("http://", "https://")):
        return None
    for base in _template_bases():  # repo root, then recipe/catalog dir
        cand = os.path.normpath(os.path.join(base, ref))
        if os.path.isfile(cand):
            return cand
    if os.path.isabs(ref) and os.path.isfile(ref):
        return ref
    return None


def _ref_stub(kind: str, ref: str, owner: str = "") -> str:
    """Body of a reference STUB, emitted when a referenced source cannot be
    fetched at build time (a URL, or a path that resolves neither under the repo
    root / recipe dir nor as an absolute path). The build never fails and never
    silently drops the artifact — it writes this placeholder, which is exactly
    the signal that a reference did not travel to this environment. Deterministic
    (no timestamps) so repeated builds stay byte-identical."""
    who = f" for {owner}" if owner else ""
    return (f"# {kind} reference stub{who}\n"
            f"# the referenced source could not be fetched at build time "
            f"(URL, or path does not resolve).\n"
            f"# ref: {ref}\n")


def _version_key(version: str) -> list:
    """A total, deterministic ordering key for a candidateVersion string.
    Numeric segments compare numerically and sort ABOVE non-numeric ones, so
    '1.10.0' > '1.9.0' and a numbered version outranks a bare label. Missing
    version sorts lowest."""
    if not version:
        return [(-1, 0, "")]
    key = []
    for seg in re.split(r"[.\-+_]", version):
        if seg.isdigit():
            key.append((1, int(seg), ""))
        else:
            key.append((0, 0, seg))
    return key


def _candidates(g: Graph, tool: URIRef) -> list[dict]:
    """All ho:implementationCandidate options of a tool as dicts
    {iri, ref, version, tag}, sorted by IRI for a stable base order."""
    out = []
    for c in _sorted(g.objects(tool, HO.implementationCandidate)):
        out.append({
            "iri": str(c),
            "ref": str(g.value(c, HO.implementationRef) or ""),
            "version": str(g.value(c, HO.candidateVersion) or ""),
            "tag": str(g.value(c, HO.candidateTag) or ""),
        })
    return out


def _policy_for(g: Graph, h: URIRef, tool: URIRef) -> str:
    """Effective selection policy for a tool: a tool-level ho:selectionPolicy
    overrides a harness-level default; absent both -> DEFAULT_POLICY."""
    tool_pol = g.value(tool, HO.selectionPolicy)
    if tool_pol is not None:
        return str(tool_pol)
    h_pol = g.value(h, HO.selectionPolicy)
    if h_pol is not None:
        return str(h_pol)
    return DEFAULT_POLICY


ACCEPTED_POLICIES = "latest-stable / conservative / pinned:<tag>"


def select_candidate(policy: str, candidates: list[dict], tool_iri: str) -> dict:
    """Pick exactly one candidate under `policy`, totally and deterministically.
      * "pinned:<tag>": only candidates with that tag; else hard error.
      * "latest-stable" (default): prefer tag=="stable"; highest version wins.
      * "conservative": prefer tag=="stable"; LOWEST version wins.
    Ties break by candidate IRI (ascending). `candidates` is non-empty. The
    policy set is CLOSED: an unrecognised policy string is a hard error (a
    misconfigured policy must never silently pick a default), mirroring the
    hard error a `pinned:<tag>` matching nothing already raises."""
    if policy.startswith("pinned:"):
        want = policy[len("pinned:"):]
        pool = [c for c in candidates if c["tag"] == want]
        if not pool:
            raise ValueError(
                f"selection policy '{policy}' for {tool_iri} matches no "
                f"candidate (tags present: "
                f"{sorted({c['tag'] for c in candidates})})")
        return sorted(pool, key=lambda c: (_version_key(c["version"]), c["iri"]))[-1]
    if policy not in ("latest-stable", "conservative"):
        raise ValueError(
            f"unrecognised ho:selectionPolicy '{policy}' for {tool_iri}; "
            f"accepted policies are: {ACCEPTED_POLICIES}")
    stable = [c for c in candidates if c["tag"] == "stable"]
    pool = stable or candidates
    ordered = sorted(pool, key=lambda c: (_version_key(c["version"]), c["iri"]))
    if policy == "conservative":
        return ordered[0]
    return ordered[-1]  # latest-stable: newest-first


def _bound_impl_tools(g: Graph, h: URIRef) -> list[URIRef]:
    """Bound ho:Tool components that carry an implementation binding (candidates
    or a direct ref), sorted by IRI. Restricted to Tools: a Candidate is a
    HarnessComponent that the propertyChainAxiom also makes hasComponent-reachable
    and it carries an implementationRef, but it is resolved THROUGH its tool, not
    emitted on its own."""
    tools = {comp for _p, comp in _iter_components(g, h)
             if (comp, RDF.type, HO.Tool) in g
             and (g.value(comp, HO.implementationRef) is not None
                  or (comp, HO.implementationCandidate, None) in g)}
    return _sorted(tools)


def resolve_selections(g: Graph, h: URIRef, lock: dict | None) -> dict:
    """Resolve every implementation-bearing tool to a single selection, honouring
    a supplied lock (strict reproduction) or the selection policy. Returns an
    ordered dict {tool_iri: selection}; selection carries selected candidate IRI
    (or None for a direct ref), ref, version, tag, and the policy string applied
    ('lock' / 'direct-ref' / the policy / 'stub'). Content hashes are filled in
    later by the emitter."""
    if lock is not None:
        _verify_lock_spec(g, h, lock)
    selections: dict[str, dict] = {}
    for tool in _bound_impl_tools(g, h):
        tool_iri = str(tool)
        locked = (lock or {}).get("tools", {}).get(tool_iri)
        cands = _candidates(g, tool)
        if locked is not None:
            sel = _selection_from_lock(g, tool, locked, cands)
        elif cands:
            policy = _policy_for(g, h, tool)
            chosen = select_candidate(policy, cands, tool_iri)
            sel = {"selected": chosen["iri"], "ref": chosen["ref"],
                   "version": chosen["version"], "tag": chosen["tag"],
                   "policyApplied": policy}
        else:
            ref = str(g.value(tool, HO.implementationRef) or "")
            sel = {"selected": None, "ref": ref, "version": "", "tag": "",
                   "policyApplied": "direct-ref"}
        selections[tool_iri] = sel
    return selections


def _selection_from_lock(g: Graph, tool: URIRef, locked: dict,
                         cands: list[dict]) -> dict:
    """Reproduce a tool's selection strictly from a lock entry. The locked
    candidate (if any) must still exist in the graph with the same ref, so the
    lock names a real, current option (INV-2). The lock's ORIGINAL policyApplied
    is carried forward unchanged so a reproduced tree (and its regenerated lock)
    is byte-identical to the original — the 'reproduced from lock' fact lives in
    the build report, not in mutated snapshot fields."""
    policy = locked.get("policyApplied", "lock")
    sel_iri = locked.get("selected")
    if sel_iri is not None:
        match = next((c for c in cands if c["iri"] == sel_iri), None)
        if match is None:
            raise ValueError(
                f"lock pins candidate {sel_iri} for {tool} but the graph no "
                f"longer offers it (candidates: {[c['iri'] for c in cands]})")
        if match["ref"] != locked.get("ref"):
            raise ValueError(
                f"lock ref mismatch for {sel_iri}: lock={locked.get('ref')!r} "
                f"graph={match['ref']!r}")
        return {"selected": match["iri"], "ref": match["ref"],
                "version": match["version"], "tag": match["tag"],
                "policyApplied": policy}
    # direct-ref tool locked
    ref = str(g.value(tool, HO.implementationRef) or "")
    if ref != locked.get("ref"):
        raise ValueError(
            f"lock ref mismatch for direct-ref tool {tool}: "
            f"lock={locked.get('ref')!r} graph={ref!r}")
    return {"selected": None, "ref": ref, "version": "", "tag": "",
            "policyApplied": policy}


def _tool_stem(tool_iri: str) -> str:
    """Filename stem for a tool's emitted implementation: the IRI's last segment
    with a leading 'tool-' stripped (tool-docgraph -> 'docgraph')."""
    tail = tool_iri.rsplit("/", 1)[-1].rsplit("#", 1)[-1]
    return tail[len("tool-"):] if tail.startswith("tool-") else tail


def _dest_basename(tool_iri: str, ref: str, from_candidate: bool) -> str:
    """The emitted filename for a tool's implementation. A candidate-backed tool
    gets a STABLE name derived from the tool (stem + the selected file's
    extension) so swapping the implementation candidate does not rename the file
    or break callers (behavioural equivalence). A degenerate direct-ref tool
    keeps its ref's basename (preserving increment-1/2 behaviour)."""
    ref_base = os.path.basename(ref.rstrip("/")) or "implementation"
    if from_candidate:
        return _tool_stem(tool_iri) + os.path.splitext(ref_base)[1]
    return ref_base


def _sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def emit_implementations(g: Graph, h: URIRef, out_dir: str,
                         selections: dict, lock: dict | None) -> list[dict]:
    """Copy each tool's selected implementation into tools/<basename> (or write
    a tools/<basename>.ref stub if unresolvable), recording a content hash on the
    selection. If a lock was supplied, the freshly-computed hash must equal the
    locked hash or the build fails loudly (reproducibility, INV-2). Returns
    manifest records sorted by tool IRI."""
    if not selections:
        return []
    os.makedirs(os.path.join(out_dir, "tools"), exist_ok=True)
    records = []
    for tool_iri in sorted(selections):
        sel = selections[tool_iri]
        ref = sel["ref"]
        basename = _dest_basename(tool_iri, ref, sel["selected"] is not None)
        resolved = _resolve_ref_path(ref) if ref else None
        if resolved:
            dest_rel = f"tools/{basename}"
            shutil.copyfile(resolved, os.path.join(out_dir, dest_rel))
            content_hash = _sha256(resolved)
            status = "resolved"
        else:
            dest_rel = f"tools/{basename}.ref"
            with open(os.path.join(out_dir, dest_rel), "w",
                      encoding="utf-8") as fh:
                fh.write(_ref_stub("implementation", ref, tool_iri))
            content_hash = None
            status = "stub"
        sel["contentHash"] = content_hash
        if lock is not None:
            locked = lock.get("tools", {}).get(tool_iri, {})
            if locked.get("contentHash") != content_hash:
                raise ValueError(
                    f"lock content-hash mismatch for {tool_iri}: "
                    f"lock={locked.get('contentHash')} built={content_hash}. "
                    f"The pinned implementation file changed — the lock no "
                    f"longer reproduces (INV-2).")
        records.append({"tool": tool_iri, "label": lib.label_of(g, URIRef(tool_iri)),
                        "selected": sel["selected"], "ref": ref,
                        "version": sel["version"], "tag": sel["tag"],
                        "policyApplied": sel["policyApplied"],
                        "status": status, "dest": dest_rel,
                        "contentHash": content_hash})
    return records


def _verify_lock_spec(g: Graph, h: URIRef, lock: dict) -> None:
    """The lock's spec identity must match the current graph, else it does not
    describe this build (INV-2)."""
    spec = lock.get("spec", {})
    if spec.get("harness") != str(h):
        raise ValueError(
            f"lock is for harness {spec.get('harness')} but building {h}")
    count = len(lib.instance_nodes(g))
    if spec.get("individualCount") != count:
        raise ValueError(
            f"lock spec individualCount={spec.get('individualCount')} but the "
            f"current union has {count} individuals — the spec changed, the "
            f"lock no longer reproduces it (INV-2).")


def build_lock(g: Graph, h: URIRef, selections: dict) -> dict:
    """The ODR ③ snapshot: what was actually selected this generation. Fully
    deterministic (no timestamps) so (spec + lock) => byte-identical output."""
    return {
        "lockVersion": 1,
        "spec": {
            "harness": str(h),
            "prefLabel": lib.label_of(g, h),
            "individualCount": len(lib.instance_nodes(g)),
        },
        "tools": {
            tool_iri: {
                "selected": sel["selected"],
                "ref": sel["ref"],
                "version": sel["version"],
                "tag": sel["tag"],
                "policyApplied": sel["policyApplied"],
                "contentHash": sel.get("contentHash"),
            }
            for tool_iri, sel in selections.items()
        },
    }


# --- 7. scaffold emitter (P5) -----------------------------------------
def _scaffold_dest(rel_path: str) -> str:
    """Output path for a scaffold fragment: everything after the (first)
    'scaffold/' marker segment in its source path, so the fragment tree mirrors
    cleanly regardless of where the recipe keeps it
    (recipes/lpranging/scaffold/docs/x.md -> docs/x.md,
    recipes/lpranging/scaffold/STANDARD.md -> STANDARD.md). If there is no
    marker, fall back to the basename."""
    norm = rel_path.replace("\\", "/").lstrip("/")
    marker = "scaffold/"
    idx = norm.find(marker)
    if idx != -1:
        return norm[idx + len(marker):]
    return os.path.basename(norm)


def emit_scaffold(g: Graph, h: URIRef, out_dir: str,
                  sources: list[str]) -> list[dict]:
    """FETCH each ho:scaffold fragment referenced by the harness (and its
    domains) into the output tree. A scaffold value is a REFERENCE (repo-relative
    or an absolute/external path) to a concrete standard/doc the harness ships;
    the recipe stores the reference, NOT the document. On build the referenced
    file is byte-copied (fetched) into the tree — the same fetch-resolution
    ho:implementationRef uses, so the emitted fragment is byte-identical to its
    source. If a reference does not resolve (offline, or an external source
    absent) a `<dest>.ref` STUB is emitted instead of failing. The output path
    mirrors the source after a `scaffold/` marker segment, else the basename.
    Records are sorted by source path."""
    refs = set(g.objects(h, HO.scaffold))
    for dom in g.objects(h, HO.targetsDomain):
        refs.update(g.objects(dom, HO.scaffold))
    if not refs:
        return []
    records = []
    for ref in _sorted(refs):
        rel = str(ref)
        dest_rel = _scaffold_dest(rel)
        resolved = _resolve_ref_path(rel)
        if resolved:
            dest = os.path.join(out_dir, dest_rel)
            os.makedirs(os.path.dirname(dest) or out_dir, exist_ok=True)
            shutil.copyfile(resolved, dest)
            sources.append(rel)
            status = "resolved"
        else:
            dest_rel = dest_rel + ".ref"
            dest = os.path.join(out_dir, dest_rel)
            os.makedirs(os.path.dirname(dest) or out_dir, exist_ok=True)
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(_ref_stub("scaffold fragment", rel))
            status = "stub"
        records.append({"source": rel, "dest": dest_rel, "status": status})
    return records


# --- 7b. instruction / skill emitter ----------------------------------
def instruction_name(g: Graph, ins: URIRef) -> str:
    """Invocation name (and directory stem) for an ho:Instruction skill: prefer
    its skos:notation (the source's trigger name), else the IRI's last segment
    with a leading 'ins-' stripped (ins-check-docs -> 'check-docs'), mirroring
    the source .claude/skills/<name>/ layout."""
    notation = g.value(ins, SKOS.notation)
    if notation is not None:
        return str(notation)
    tail = str(ins).rsplit("/", 1)[-1].rsplit("#", 1)[-1]
    return tail[len("ins-"):] if tail.startswith("ins-") else tail


def _render_instruction_fallback(g: Graph, ins: URIRef, name: str) -> str:
    """Faithful-otherwise SKILL.md body when a skill is NOT vendored: a minimal
    frontmatter (name + definition) plus the ho:promptText procedure, so an
    instruction that carries only graph data still emits a usable skill file."""
    out = ["---", f"name: {name}"]
    definition = g.value(ins, SKOS.definition)
    if definition:
        out.append(f"description: {definition}")
    out.append("---")
    out.append("")
    out.append(f"# {lib.label_of(g, ins)}")
    prompt = g.value(ins, HO.promptText)
    if prompt:
        out.append("")
        out.append(str(prompt))
    return "\n".join(out)


def emit_instructions(g: Graph, instructions: list[URIRef], out_dir: str,
                      sources: list[str]) -> list[dict]:
    """Write .claude/skills/<name>/SKILL.md for each ho:Instruction bound to the
    harness, mirroring the source skill layout. When the instruction carries an
    ho:artifactTemplate the referenced skill body is FETCHED (byte-copied) from
    its source — repo-relative or an absolute/external path — the same
    fetch-resolution ho:implementationRef uses, so the recipe stores the
    reference, not the skill document. If the reference does not resolve a
    `<SKILL.md>.ref` STUB is emitted instead of failing; if the instruction
    carries no template at all the file is rendered from graph data. Return
    manifest records sorted by IRI (each with a `status`: resolved | stub |
    graph). A skill-less harness yields no files and an empty list."""
    if not instructions:
        return []
    skills_root = os.path.join(out_dir, ".claude", "skills")
    records = []
    for ins in instructions:
        name = instruction_name(g, ins)
        dest_rel = f".claude/skills/{name}/SKILL.md"
        dest = os.path.join(out_dir, dest_rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        tmpl = g.value(ins, HO.artifactTemplate)
        if tmpl is not None:
            resolved = _resolve_ref_path(str(tmpl))
            if resolved:
                shutil.copyfile(resolved, dest)
                sources.append(str(tmpl))
                vendored = str(tmpl)
                status = "resolved"
            else:
                dest_rel = dest_rel + ".ref"
                dest = os.path.join(out_dir, dest_rel)
                with open(dest, "w", encoding="utf-8") as fh:
                    fh.write(_ref_stub("skill", str(tmpl), str(ins)))
                vendored = None
                status = "stub"
        else:
            body = _render_instruction_fallback(g, ins, name)
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(body if body.endswith("\n") else body + "\n")
            vendored = None
            status = "graph"
        records.append({
            "instruction": str(ins),
            "label": lib.label_of(g, ins),
            "name": name,
            "definition": str(g.value(ins, SKOS.definition) or ""),
            "skillFile": dest_rel,
            "vendoredFrom": vendored,
            "status": status,
        })
    return records


# --- 8. emit ----------------------------------------------------------
def materialize(g: Graph, h: URIRef, out_dir: str,
                lock: dict | None = None) -> dict:
    """Render the harness file tree into out_dir, ATOMICALLY. Returns the
    manifest dict. When `lock` is given, implementations are reproduced strictly
    from it (byte-identically, or the build fails); otherwise the selection
    policy is applied and a fresh harness.lock.json snapshot is written.

    Atomicity contract ("nothing half-written"): the whole tree is emitted into
    a sibling temp staging dir (same filesystem as `out_dir`, so the final
    placement is an atomic rename). Every gate — the selection-policy resolution
    and the `--lock` content-hash check — runs while writing into staging. Only
    on FULL success is staging placed at `out_dir`; on ANY failure the staging
    dir is removed and `out_dir` is left untouched (or absent). A previously
    non-existent `out_dir` therefore never appears at all when a build fails,
    and an existing one is never partially overwritten.

    Projection contract: the tree is rendered from the graph PROJECTED through
    IriTokenResolver, so the ontology-internal IRI tokens that graph text uses to
    disambiguate neighbouring nodes are emitted as the readable names the
    document's audience can use (see IriTokenResolver). The stored ontology is
    never modified; genuinely dangling references are reported on stderr."""
    resolver = IriTokenResolver(g)
    g = resolver.project(g)
    out_dir = os.path.abspath(out_dir)
    parent = os.path.dirname(out_dir) or os.getcwd()
    os.makedirs(parent, exist_ok=True)
    # Staging lives in out_dir's PARENT so os.replace into place is a same-
    # filesystem atomic rename (a cross-device temp would fall back to a
    # non-atomic copy). The name is unique so concurrent builds don't collide.
    staging = tempfile.mkdtemp(
        prefix="." + (os.path.basename(out_dir) or "harness") + ".tmp-",
        dir=parent)
    try:
        manifest = _emit_tree(g, h, staging, lock)
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    resolver.report()
    _place_atomically(staging, out_dir)
    return manifest


def _place_atomically(staging: str, out_dir: str) -> None:
    """Move a fully-built staging tree onto `out_dir` atomically. If `out_dir`
    does not exist this is a single atomic rename. If it pre-exists, the old
    tree is renamed aside first and removed only after the new tree is in place
    (and restored if the swap fails), so `out_dir` always names a complete tree
    — never a half-merged one. Only ever reached after a fully successful
    build, so a FAILED build never disturbs `out_dir`."""
    if not os.path.exists(out_dir):
        os.replace(staging, out_dir)
        return
    backup = out_dir + f".bak-{os.getpid()}"
    if os.path.exists(backup):
        shutil.rmtree(backup)
    os.replace(out_dir, backup)
    try:
        os.replace(staging, out_dir)
    except BaseException:
        os.replace(backup, out_dir)  # restore the original tree on failure
        shutil.rmtree(staging, ignore_errors=True)
        raise
    shutil.rmtree(backup, ignore_errors=True)


def _emit_tree(g: Graph, h: URIRef, out_dir: str,
               lock: dict | None) -> dict:
    """Render the harness file tree into `out_dir` (a fresh staging dir). All
    resolution/gate steps that can fail run here BEFORE `materialize` places the
    tree, so a failure aborts inside staging and never touches the real output."""
    os.makedirs(out_dir, exist_ok=True)
    sources: list[str] = []
    roles = _sorted(g.objects(h, HO.hasRole))
    channels = _sorted(g.objects(h, HO.hasChannel))
    instructions = _sorted(g.objects(h, HO.hasInstruction))

    selections = resolve_selections(g, h, lock)
    claude_md = build_claude_md(g, h, sources, roles, channels, instructions)
    role_records = emit_roles(g, roles, out_dir, sources)
    impl_records = emit_implementations(g, h, out_dir, selections, lock)
    scaffold_records = emit_scaffold(g, h, out_dir, sources)
    skill_records = emit_instructions(g, instructions, out_dir, sources)
    manifest = build_manifest(g, h, sources)
    manifest["roles"] = role_records
    manifest["implementations"] = impl_records
    manifest["scaffold"] = scaffold_records
    manifest["skills"] = skill_records

    # The ODR ③ lock: written on every build. On a fresh build it snapshots the
    # policy-driven selection; when reproducing from a lock it is regenerated
    # identically (all fields deterministic) so `diff -r` of the two trees is
    # empty — the lock file itself included.
    lock_obj = build_lock(g, h, selections)

    with open(os.path.join(out_dir, "CLAUDE.md"), "w", encoding="utf-8") as fh:
        fh.write(claude_md if claude_md.endswith("\n") else claude_md + "\n")
    with open(os.path.join(out_dir, "MANIFEST.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    with open(os.path.join(out_dir, LOCK_FILENAME), "w", encoding="utf-8") as fh:
        json.dump(lock_obj, fh, ensure_ascii=False, indent=2, sort_keys=True)
        fh.write("\n")
    return manifest


# --- CLI --------------------------------------------------------------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("harness", help="harness IRI or short id (e.g. h-techdoc)")
    ap.add_argument("--out", required=True, help="output directory for the harness file tree")
    ap.add_argument("--lock", default=None,
                    help="reproduce a build from a harness.lock.json snapshot "
                         "(strict: spec identity + content hashes must match)")
    ap.add_argument("--format", choices=["text", "json"], default="text",
                    help="stdout build report (files are always emitted)")
    args = ap.parse_args(argv)

    # -- gate: only a validated harness materializes --
    try:
        result = validate.run_structured()
    except Exception as exc:  # noqa: BLE001
        print(f"✗ could not validate the union: {exc}", file=sys.stderr)
        return 2
    if not result["pass"]:
        print("✗ REFUSING to materialize: the composed union does not validate "
              "(only a validated harness materializes). Run tools/validate.py.",
              file=sys.stderr)
        return 1

    g = lib.load_graph(reason=True)
    try:
        h = resolve_harness(g, args.harness)
    except ValueError as exc:
        print(f"✗ {exc}", file=sys.stderr)
        return 2

    lock = None
    if args.lock:
        try:
            with open(args.lock, encoding="utf-8") as fh:
                lock = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"✗ could not read lock {args.lock}: {exc}", file=sys.stderr)
            return 2

    try:
        manifest = materialize(g, h, args.out, lock)
    except ValueError as exc:
        print(f"✗ REFUSING to materialize: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        print(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print(f"✓ materialized {manifest['prefLabel']} -> {args.out}")
        print(f"  CLAUDE.md      ({len(manifest['components'])} components, "
              f"~{manifest['tokenEstimate']} tokens)")
        print(f"  MANIFEST.json  ({len(manifest['capabilityBindings'])} capability bindings, "
              f"{len(manifest['templateSources'])} template source(s))")
        if manifest["roles"]:
            print(f"  .claude/agents/ ({len(manifest['roles'])} role(s))")
        if manifest["channels"]:
            print(f"  channels        ({len(manifest['channels'])} coordination channel(s))")
        if manifest["implementations"]:
            n_res = sum(1 for r in manifest["implementations"] if r["status"] == "resolved")
            print(f"  tools/          ({n_res}/{len(manifest['implementations'])} "
                  f"implementation(s) copied)")
            for r in manifest["implementations"]:
                sel = r["selected"].rsplit("/", 1)[-1] if r["selected"] else "(direct ref)"
                print(f"      {r['label']}: {sel} "
                      f"[{r['policyApplied']}] -> {r['dest']}")
        if manifest["scaffold"]:
            print(f"  scaffold        ({len(manifest['scaffold'])} fragment(s))")
        if manifest["skills"]:
            print(f"  .claude/skills/ ({len(manifest['skills'])} skill(s))")
        mode = "reproduced from lock" if args.lock else "fresh lock written"
        print(f"  {LOCK_FILENAME}  ({mode})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
