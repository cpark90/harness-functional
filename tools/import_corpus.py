#!/usr/bin/env python3
"""import_corpus.py -- deterministic corpus-harness -> draft recipe TTL importer.

Converts ONE harness-100 corpus harness (a `.claude/` tree of
`CLAUDE.md` + `agents/*.md` + `skills/*/skill.md`) into a *draft* recipe TTL
(recipe-local `id:` domain, imports the central neutral-parts library by IRI).

It does the MECHANICAL, DETERMINISTIC part of composition and nothing else:

  SHOULD (this tool does it):
    - skeleton `id:h-<shortname>` harness, recipe-local `id:` domain = <dirname>
    - every `agents/<x>.md` -> `id:role-<x>` (ho:Role) + `id:sp-role-<x>`
      (ho:SystemPrompt, rolePersona, body via EXTERNAL ho:artifactTemplate ref)
    - one orchestrator persona `id:sp-<shortname>` (no artifactTemplate)
    - every `skills/<x>/skill.md` -> `id:ins-<x>` (ho:Instruction); the
      orchestrator skill (dir == shortname) vs extending skills are
      distinguished; extending skills record ho:augmentsRole target(s)
    - ho:tokenEstimate (word-count based), ho:maturity "draft",
      derivedFrom core:h-multiagent, hasExecutionMode core:mode-agent-teams,
      hasWorkflow core:wf-multiagent (corpus-uniform constants), dct:source/license
    - run-behaviour axes 2+3 from the orchestrator skill: each `### <name> Flow`
      of `## Test Scenarios` -> a recipe-local ho:TestScenario (scenarioKind mapped
      1:1 to the heading) bound by ho:hasTestScenario; each `## Error Handling` row
      whose error-type matches exactly ONE central fp-* archetype -> that central
      IRI reused (no local duplicate) and bound by ho:hasFailurePolicy

  MUST NOT (this tool refuses -- these are human judgment; it FLAGS them):
    - invent vocabulary (Concept/Capability/Guardrail/Domain/Task/Tool/ModelConfig)
    - assign tools/model/guardrails/capabilities to roles or the harness
    - guess capability satisfaction (would hard-stop; none are emitted)
    - vendor persona/instruction bodies inline (external refs only)
    - author a LOCAL id:fp-* for a domain-specific error row (recovery machinery is
      judgment); fabricate a TestScenario/FailurePolicy the source does not provide;
      guess a scenarioKind a heading does not name -- all are left unbound + FLAGGED

The generated draft is INTENTIONALLY HarnessShape-incomplete: targetsDomain and
addressesTask are semantic judgments and are left unbound + flagged. That
delta is the measured "human work per recipe" (see the acceptance-test report).

Usage:
    import_corpus.py <corpus-harness-dir> [--out <recipe-dir>]

With --out, writes <recipe-dir>/<dirname>.ttl (matching recipes/<name>/<name>.ttl);
otherwise prints the TTL to stdout. Flags are printed to stderr and embedded as a
header comment block. Deterministic: same input -> byte-identical output.
"""
import argparse
import os
import re
import sys

CENTRAL_ROOT = "https://harness-ontology.dev/ontology"
UPSTREAM_BASE = "https://github.com/revfactory/harness-100/tree/main/en"

PREAMBLE = """@prefix ho:    <https://harness-ontology.dev/schema#> .
@prefix id:    <https://harness-ontology.dev/id/{dirname}/> .
@prefix core:  <https://harness-ontology.dev/id/core/> .
@prefix owl:   <http://www.w3.org/2002/07/owl#> .
@prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
@prefix skos:  <http://www.w3.org/2004/02/skos/core#> .
@prefix dct:   <http://purl.org/dc/terms/> .
"""


# --------------------------------------------------------------------------- #
# Deterministic primitives
# --------------------------------------------------------------------------- #
def wc_words(text):
    """Word count equivalent to `wc -w` (whitespace-delimited tokens)."""
    return len(text.split())


def ttl_str(s):
    """A single-line TTL string literal with the source's inner whitespace
    collapsed (so a multi-paragraph lead becomes one deterministic line)."""
    s = " ".join(s.split())
    s = s.replace("\\", "\\\\").replace('"', '\\"')
    return '"' + s + '"'


def cap_first(name):
    """Capitalise only the first character; keep hyphens and the rest as-is.
    Matches the pilot label convention ('style-inspector' -> 'Style-inspector')."""
    if not name:
        return name
    return name[0].upper() + name[1:]


def strip_number_prefix(dirname):
    """'21-code-reviewer' -> 'code-reviewer'; '100-ip-portfolio' -> 'ip-portfolio'."""
    return re.sub(r"^\d+-", "", dirname)


def parse_frontmatter(text):
    """Return (frontmatter_dict, body). Frontmatter is the block between the
    first two '---' fences. Values may be quoted; quotes are stripped."""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text
    fm = {}
    body_start = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            body_start = i + 1
            break
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", lines[i])
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                val = val[1:-1]
            fm[key] = val
    if body_start is None:
        return {}, text
    body = "\n".join(lines[body_start:])
    return fm, body


def lead_paragraph(body):
    """First non-empty paragraph after the first H1 heading (a persona seed --
    one short paragraph, NOT the vendored body). Falls back to the first
    paragraph if there is no H1."""
    lines = body.splitlines()
    idx = 0
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            idx = i + 1
            break
    # skip blanks
    while idx < len(lines) and not lines[idx].strip():
        idx += 1
    para = []
    while idx < len(lines) and lines[idx].strip():
        para.append(lines[idx].strip())
        idx += 1
    return " ".join(para).strip()


def section_body(body, heading_regex):
    """Return the text of a `## <heading>` section up to the next `## ` heading."""
    lines = body.splitlines()
    out = []
    capturing = False
    for ln in lines:
        if ln.startswith("## "):
            if capturing:
                break
            if re.match(heading_regex, ln.strip(), re.IGNORECASE):
                capturing = True
                continue
        elif capturing:
            out.append(ln)
    return "\n".join(out)


def slugify(text):
    """'Existing File Flow' -> 'existing-file'; drops a trailing ' flow' word so the
    scenario id reads like the source heading, deterministic and TTL-safe."""
    s = text.strip().lower()
    s = re.sub(r"\bflow\b", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "scenario"


def clean_inline(s):
    """Collapse whitespace and strip surrounding markdown emphasis markers."""
    s = s.strip()
    s = re.sub(r"^\*+", "", s)
    s = re.sub(r"\*+$", "", s)
    return " ".join(s.split()).strip()


# --------------------------------------------------------------------------- #
# Run-behaviour axis 2: Test Scenarios (source ### <name> Flow subsections)
# --------------------------------------------------------------------------- #
def scenario_kind(heading):
    """Map a `### <name> Flow` heading to the closed ho:scenarioKind value it
    denotes, by keyword. Returns None if the heading names no known kind (the
    importer then leaves it unmapped + flags it rather than guessing a kind)."""
    h = heading.lower()
    if "normal" in h or "happy" in h or "standard" in h or "basic" in h:
        return "normal"
    if "existing" in h:
        return "existing-input"
    if "error" in h or "edge" in h or "failure" in h or "invalid" in h:
        return "error"
    return None


def parse_flow_body(lines):
    """From the lines of one `### <name> Flow` block, extract the `**Prompt**`
    line and the `**Expected Result(s)**` bullet list. Returns (prompt, expected[])."""
    prompt = None
    expected = []
    in_expected = False
    for ln in lines:
        s = ln.strip()
        mp = re.match(r"^\*\*prompt\*\*:?\s*(.*)$", s, re.IGNORECASE)
        if mp:
            prompt = clean_inline(mp.group(1))
            in_expected = False
            continue
        me = re.match(r"^\*\*expected result[s]?\*\*:?\s*(.*)$", s, re.IGNORECASE)
        if me:
            in_expected = True
            rest = clean_inline(me.group(1))
            if rest:
                expected.append(rest)
            continue
        if in_expected:
            mb = re.match(r"^[-*]\s+(.*)$", s)
            if mb:
                expected.append(clean_inline(mb.group(1)))
            elif not s:
                continue
            else:
                in_expected = False
    return prompt, expected


def parse_scenarios(section_text):
    """Parse the `## Test Scenarios` section into scenario dicts, one per
    `### <name> Flow` subheading. Returns (scenarios, unmapped_headings).
    A subheading is unmapped (flagged, not emitted) if it names no known
    scenarioKind or carries no Prompt -- fabricating either is worse than a gap."""
    if not section_text.strip():
        return [], []
    blocks = []
    cur_head, cur_lines = None, []
    for ln in section_text.splitlines():
        m = re.match(r"^###\s+(.*)$", ln)
        if m:
            if cur_head is not None:
                blocks.append((cur_head, cur_lines))
            cur_head, cur_lines = m.group(1).strip(), []
        elif cur_head is not None:
            cur_lines.append(ln)
    if cur_head is not None:
        blocks.append((cur_head, cur_lines))

    scenarios, unmapped = [], []
    seen_ids = set()
    for head, lines in blocks:
        kind = scenario_kind(head)
        prompt, expected = parse_flow_body(lines)
        if kind is None or not prompt:
            unmapped.append(head)
            continue
        sid = slugify(head)
        base, n = sid, 2
        while sid in seen_ids:
            sid = "%s-%d" % (base, n)
            n += 1
        seen_ids.add(sid)
        scenarios.append({"id": sid, "head": head, "kind": kind,
                          "prompt": prompt, "expected": expected})
    return scenarios, unmapped


# --------------------------------------------------------------------------- #
# Run-behaviour axis 3: Failure policies (source `## Error Handling` table)
# --------------------------------------------------------------------------- #
# Each source error row is matched against the five central neutral archetypes.
# A row that matches exactly ONE archetype binds that central IRI (mechanical
# reuse, never a local duplicate). A row that matches NONE is domain-specific
# recovery machinery -> flagged as a LOCAL id:fp-* authoring candidate (judgment;
# the importer never authors it). A row that matches MORE THAN ONE is ambiguous
# -> flagged for a human to disambiguate (never mis-bound).
FP_ARCHETYPES = [
    ("core:fp-agent-failure-retry",
     [r"agent\s+fail", r"sub-?agent\s+fail", r"worker\s+fail", r"delegat\w*\s+fail"]),
    ("core:fp-review-critical-rework",
     [r"\U0001f534", r"blocker", r"critical\s+(finding|issue|review|severity)",
      r"review\s+(critical|reject|fail|blocker)", r"found in review",
      r"critical.*found", r"rework"]),
    ("core:fp-conflict-contradiction",
     [r"conflict", r"contradict", r"cross-domain", r"disagree", r"inconsisten"]),
    ("core:fp-source-unavailable",
     [r"source\s+(unavail|unreach|fail|down|missing)", r"external\s+(unavail|unreach|fail|down)",
      r"cannot\s+(be\s+)?reach", r"\bapi\b.*(down|unavail|fail|error)",
      r"fetch\s+fail", r"network\s+(fail|down|error)", r"unreachable", r"timeout.*source"]),
    ("core:fp-insufficient-input",
     [r"insufficient", r"ambiguous", r"unclear", r"under-?specified", r"vague",
      r"missing\s+(context|input|requirement|detail|spec|information)",
      r"too\s+(thin|little|vague)", r"not\s+(enough|specified)", r"lack\w*\s+context"]),
]


def parse_failure_rows(section_text):
    """Parse the `## Error Handling` markdown table into (error_type, strategy)
    rows, skipping the header and separator rows."""
    rows = []
    for ln in section_text.splitlines():
        s = ln.strip()
        if not s.startswith("|"):
            continue
        cells = [c.strip() for c in s.strip("|").split("|")]
        if len(cells) < 2:
            continue
        etype, strat = cells[0], cells[1]
        if not etype or set(etype) <= set("-: "):        # separator row
            continue
        if etype.lower() in ("error type", "error", "type", "condition") \
                and strat.lower() in ("strategy", "handling", "recovery", "action"):
            continue                                       # header row
        rows.append((etype, strat))
    return rows


def map_failure_row(etype):
    """(central_iri | None, ambiguous_bool) for one error-type cell."""
    e = etype.lower()
    matched = []
    for iri, pats in FP_ARCHETYPES:
        if any(re.search(p, e) for p in pats):
            matched.append(iri)
    if len(matched) == 1:
        return matched[0], False
    if len(matched) > 1:
        return None, True
    return None, False


def analyze_run_behaviour(orch_body):
    """Extract the two source-derived run-behaviour axes from the orchestrator
    skill body: test scenarios and the failure-policy mapping. (The third axis,
    execution mode, is the corpus-uniform constant core:mode-agent-teams.)"""
    scn_sec = section_body(orch_body, r"^##\s+test scenarios?\b")
    scenarios, scn_unmapped = parse_scenarios(scn_sec)

    err_sec = section_body(orch_body, r"^##\s+error handling\b")
    central, local_rows, ambig_rows = [], [], []
    for etype, strat in parse_failure_rows(err_sec):
        iri, ambiguous = map_failure_row(etype)
        if iri:
            if iri not in central:                         # dedup, preserve order
                central.append(iri)
        elif ambiguous:
            ambig_rows.append((etype, strat))
        else:
            local_rows.append((etype, strat))
    return {
        "scenarios": scenarios,
        "scenario_unmapped": scn_unmapped,
        "scenario_section_present": bool(scn_sec.strip()),
        "fp_central": central,
        "fp_local": local_rows,
        "fp_ambiguous": ambig_rows,
        "error_section_present": bool(err_sec.strip()),
    }


# --------------------------------------------------------------------------- #
# Model of one corpus harness
# --------------------------------------------------------------------------- #
def corpus_relpath(abspath, corpus_dir):
    """Path of a corpus file relative to the corpus harness dir, as POSIX
    (`.claude/agents/<x>.md`). Appended to the canonical UPSTREAM_BASE URL so an
    artifactTemplate ref names the PUBLIC corpus file, never a local machine path
    (`/home/<user>/...`) that would leak the authoring host when pushed."""
    rel = os.path.relpath(abspath, corpus_dir)
    return rel.replace(os.sep, "/")


def read_file(path):
    with open(path, "r", encoding="utf-8") as fh:
        return fh.read()


def load_corpus(corpus_dir):
    corpus_dir = os.path.abspath(corpus_dir)
    claude_dir = os.path.join(corpus_dir, ".claude")
    if not os.path.isdir(claude_dir):
        raise SystemExit("error: no .claude/ under %s" % corpus_dir)

    dirname = os.path.basename(corpus_dir.rstrip("/"))
    shortname = strip_number_prefix(dirname)

    # CLAUDE.md (thin; used only for harness prefLabel/definition seeds)
    claude_md = os.path.join(claude_dir, "CLAUDE.md")
    claude_text = read_file(claude_md) if os.path.isfile(claude_md) else ""

    # agents/*.md -> list of dicts, sorted by filename (determinism)
    agents = []
    agents_dir = os.path.join(claude_dir, "agents")
    if os.path.isdir(agents_dir):
        for fn in sorted(os.listdir(agents_dir)):
            if not fn.endswith(".md"):
                continue
            slug = fn[:-3]
            text = read_file(os.path.join(agents_dir, fn))
            fm, body = parse_frontmatter(text)
            agents.append({
                "slug": slug,
                "name": fm.get("name", slug),
                "description": fm.get("description", ""),
                "lead": lead_paragraph(body),
                "ref": corpus_relpath(os.path.join(agents_dir, fn), corpus_dir),
            })
    agent_slugs = {a["slug"] for a in agents}

    # skills/*/skill.md -> list of dicts, sorted by dir name (determinism)
    skills = []
    orch_body = ""
    skills_dir = os.path.join(claude_dir, "skills")
    if os.path.isdir(skills_dir):
        for sd in sorted(os.listdir(skills_dir)):
            skill_md = os.path.join(skills_dir, sd, "skill.md")
            if not os.path.isfile(skill_md):
                continue
            text = read_file(skill_md)
            fm, body = parse_frontmatter(text)
            is_orch = (sd == shortname)
            if is_orch:
                orch_body = body
            targets = []
            if not is_orch:
                sec = section_body(body, r"^##\s+target agents?\b")
                # ordered, unique backtick tokens that name a known agent
                seen = set()
                for tok in re.findall(r"`([^`]+)`", sec):
                    tok = tok.strip()
                    if tok in agent_slugs and tok not in seen:
                        seen.add(tok)
                        targets.append(tok)
            skills.append({
                "dir": sd,
                "name": fm.get("name", sd),
                "description": fm.get("description", ""),
                "lead": lead_paragraph(body),
                "is_orchestrator": is_orch,
                "targets": targets,
                "has_target_section": bool(
                    re.search(r"^##\s+target agents?\b", body, re.IGNORECASE | re.MULTILINE)),
                "word_count": wc_words(text),
                "ref": corpus_relpath(skill_md, corpus_dir),
            })

    run_behaviour = analyze_run_behaviour(orch_body)

    return {
        "dirname": dirname,
        "shortname": shortname,
        "claude_text": claude_text,
        "agents": agents,
        "skills": skills,
        "run_behaviour": run_behaviour,
    }


def harness_seeds(claude_text, shortname):
    """prefLabel + definition seeds from the (thin) CLAUDE.md: the first H1
    title and the first paragraph after it. Deterministic; wording is a draft
    seed a reviewer refines."""
    title = None
    definition = None
    lines = claude_text.splitlines()
    for i, ln in enumerate(lines):
        if ln.startswith("# "):
            title = ln[2:].strip()
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            para = []
            while j < len(lines) and lines[j].strip() and not lines[j].startswith("#"):
                para.append(lines[j].strip())
                j += 1
            definition = " ".join(para).strip()
            break
    if not title:
        title = cap_first(shortname)
    return title, (definition or title)


# --------------------------------------------------------------------------- #
# Emit
# --------------------------------------------------------------------------- #
def emit(corpus, flags):
    dirname = corpus["dirname"]
    shortname = corpus["shortname"]
    agents = corpus["agents"]
    skills = corpus["skills"]
    src_url = "%s/%s" % (UPSTREAM_BASE, dirname)

    title, definition = harness_seeds(corpus["claude_text"], shortname)

    out = []
    out.append(PREAMBLE.format(dirname=dirname))
    out.append("")

    # -- flag header block --------------------------------------------------
    out.append("#" * 72)
    out.append("# DRAFT recipe imported by tools/import_corpus.py (maturity \"draft\").")
    out.append("# Source: %s (revfactory/harness-100, Apache-2.0)." % src_url)
    out.append("#")
    out.append("# FLAGS -- judgment bindings the importer refuses to guess; a developer")
    out.append("# review must fill these before promotion (see acceptance-test report):")
    for f in flags:
        out.append("#   - %s" % f)
    out.append("#" * 72)
    out.append("")

    # -- recipe ontology header --------------------------------------------
    out.append("<https://harness-ontology.dev/recipes/%s> a owl:Ontology ;" % dirname)
    out.append("    dct:title %s ;" % ttl_str(title + " recipe (draft import)"))
    out.append("    owl:imports <%s> ." % CENTRAL_ROOT)
    out.append("")

    # -- orchestrator persona (synthesized; no external agent file) --------
    orch_skill = next((s for s in skills if s["is_orchestrator"]), None)
    orch_lead = orch_skill["lead"] if orch_skill else definition
    orch_pt = orch_lead or definition
    out.append("#===================== Orchestrator persona ============================")
    out.append("id:sp-%s a ho:SystemPrompt ; skos:prefLabel %s ;"
               % (shortname, ttl_str(cap_first(shortname) + " orchestrator persona")))
    out.append("    ho:promptText %s ;" % ttl_str(orch_pt))
    out.append("    ho:tokenEstimate %d ; ho:maturity \"draft\" ." % wc_words(orch_pt))
    out.append("")

    # -- worker personas ----------------------------------------------------
    out.append("#===================== Worker personas (agents/*.md) ==================")
    for a in agents:
        pt = a["lead"] or a["description"] or a["name"]
        out.append("id:sp-role-%s a ho:SystemPrompt ; skos:prefLabel %s ;"
                   % (a["slug"], ttl_str(cap_first(a["name"]) + " persona")))
        out.append("    ho:promptText %s ;" % ttl_str(pt))
        out.append("    ho:artifactTemplate %s ;"
                   % ttl_str("%s/%s" % (src_url, a["ref"])))
        out.append("    ho:tokenEstimate %d ; ho:maturity \"draft\" ." % wc_words(pt))
    out.append("")

    # -- roles --------------------------------------------------------------
    out.append("#===================== Roles (agents/*.md) ============================")
    for a in agents:
        out.append("id:role-%s a ho:Role ; skos:prefLabel %s ;"
                   % (a["slug"], ttl_str(cap_first(a["name"]) + " role")))
        defn = a["description"] or a["name"]
        out.append("    skos:definition %s ;" % ttl_str(defn))
        out.append("    ho:rolePersona id:sp-role-%s ;" % a["slug"])
        out.append("    ho:tokenEstimate %d ; ho:maturity \"draft\" ." % wc_words(defn))
    out.append("")

    # -- instructions (skills) ---------------------------------------------
    out.append("#===================== Instructions (skills/*/skill.md) ===============")
    for s in skills:
        defn = s["description"] or s["name"]
        out.append("id:ins-%s a ho:Instruction ; skos:prefLabel %s ;"
                   % (s["dir"], ttl_str(cap_first(s["dir"]) + " skill")))
        out.append("    skos:notation %s ;" % ttl_str(s["name"]))
        out.append("    skos:definition %s ;" % ttl_str(defn))
        for t in s["targets"]:
            out.append("    ho:augmentsRole id:role-%s ;" % t)
        out.append("    ho:artifactTemplate %s ;"
                   % ttl_str("%s/%s" % (src_url, s["ref"])))
        out.append("    ho:tokenEstimate %d ; ho:maturity \"draft\" ." % s["word_count"])
    out.append("")

    # -- run-behaviour axis 2: test scenarios ------------------------------
    rb = corpus["run_behaviour"]
    scenarios = rb["scenarios"]
    if scenarios:
        out.append("#===================== Run-behaviour: test scenarios ==================")
        out.append("# The behaviour-acceptance fixtures from the source orchestrator skill's")
        out.append("# `## Test Scenarios` section: each `### <name> Flow` -> one TestScenario,")
        out.append("# ho:scenarioKind mapped 1:1 to the heading (normal/existing-input/error).")
        out.append("# Prompt + expected are source CONTENT (recipe-local); wording is a draft")
        out.append("# seed a reviewer refines. Bound by ho:hasTestScenario (a Harness->")
        out.append("# TestScenario sub-property of hasComponent -> reachable, orphan-free).")
        for sc in scenarios:
            out.append("id:scn-%s a ho:TestScenario ; skos:prefLabel %s ;"
                       % (sc["id"], ttl_str(cap_first(sc["head"]) + " scenario")))
            out.append("    ho:scenarioKind \"%s\" ;" % sc["kind"])
            out.append("    ho:scenarioPrompt %s ;" % ttl_str(sc["prompt"]))
            if sc["expected"]:
                joined = " ,\n        ".join(ttl_str(x) for x in sc["expected"])
                out.append("    ho:scenarioExpected %s ;" % joined)
            toks = wc_words(sc["prompt"] + " " + " ".join(sc["expected"]))
            out.append("    ho:tokenEstimate %d ; ho:maturity \"draft\" ." % toks)
        out.append("")

    # -- run-behaviour axis 3: failure policies (central archetype reuse) ---
    fp_central = rb["fp_central"]
    if fp_central or rb["fp_local"] or rb["fp_ambiguous"]:
        out.append("#===================== Run-behaviour: failure policies =================")
        out.append("# The source `## Error Handling` rows mapped to the central neutral")
        out.append("# archetypes by IRI where exactly one fits (mechanical reuse, NO local")
        out.append("# duplicate -- that is the drift this repo prevents). Bound below via")
        out.append("# ho:hasFailurePolicy. Domain-specific rows no archetype covers are left")
        out.append("# UNBOUND and FLAGGED as local id:fp-* authoring candidates (authoring")
        out.append("# domain recovery machinery is judgment; the importer does not do it).")
        if fp_central:
            out.append("#   central reuse: %s" % ", ".join(fp_central))
        for etype, _ in rb["fp_local"]:
            out.append("#   LOCAL candidate (author id:fp-*): %s" % ttl_str(etype))
        for etype, _ in rb["fp_ambiguous"]:
            out.append("#   AMBIGUOUS (disambiguate by hand): %s" % ttl_str(etype))
        out.append("")

    # -- harness assembly ---------------------------------------------------
    out.append("#===================== HARNESS (skeleton assembly) ====================")
    out.append("# targetsDomain / addressesTask / usesModel / hasGuardrail / usesTool /")
    out.append("# requiresCapability / appliesPattern / hasChannel / ho:tagged are JUDGMENT")
    out.append("# bindings -- intentionally UNBOUND (see FLAGS). This node is a draft that")
    out.append("# does not yet satisfy ho:HarnessShape until a reviewer binds domain+task.")
    out.append("id:h-%s a ho:Harness ;" % shortname)
    out.append("    skos:prefLabel %s ;" % ttl_str(title))
    out.append("    skos:definition %s ;" % ttl_str(definition))
    sp_terms = ["id:sp-%s" % shortname] + ["id:sp-role-%s" % a["slug"] for a in agents]
    out.append("    ho:hasSystemPrompt %s ;" % ", ".join(sp_terms))
    out.append("    ho:hasWorkflow core:wf-multiagent ;")
    if skills:
        out.append("    ho:hasInstruction %s ;"
                   % ", ".join("id:ins-%s" % s["dir"] for s in skills))
    if agents:
        out.append("    ho:hasRole %s ;"
                   % ", ".join("id:role-%s" % a["slug"] for a in agents))
    out.append("    ho:hasExecutionMode core:mode-agent-teams ;")
    if scenarios:
        out.append("    ho:hasTestScenario %s ;"
                   % ", ".join("id:scn-%s" % sc["id"] for sc in scenarios))
    if fp_central:
        out.append("    ho:hasFailurePolicy %s ;" % ", ".join(fp_central))
    out.append("    ho:derivedFrom core:h-multiagent ;")
    out.append("    dct:source %s ;" % ttl_str(src_url))
    out.append("    dct:license \"Apache-2.0\" ;")
    out.append("    ho:maturity \"draft\" .")
    out.append("")

    return "\n".join(out)


def collect_flags(corpus):
    flags = []
    flags.append("DOMAIN: harness ho:targetsDomain unbound -- reuse an existing "
                 "core:dom-* by IRI, or (if none fits) a NEW recipe-local domain concept "
                 "needs authoring (Golden Rule #2: do not invent here).")
    flags.append("TASK: harness ho:addressesTask unbound -- bind an existing core:task-* "
                 "or author a recipe-local id:task-* (corpus tasks are ~unique per harness).")
    flags.append("MODEL: ho:usesModel unbound -- source declares no model (0/489); binding "
                 "core:mc-* is a judgment.")
    flags.append("GUARDRAILS: no ho:hasGuardrail / roleGuardrail bound -- which core:gr-* each "
                 "principle maps to is a judgment.")
    flags.append("TOOLS: no ho:usesTool / roleTool bound -- source has no `tools:` frontmatter "
                 "(0/489); least-privilege slice is a judgment (corpus is doc-producing: "
                 "file-edit dominates, code-exec ~0).")
    flags.append("CAPABILITIES: no ho:requiresCapability bound -- so no provider check runs; a "
                 "reviewer adds requires+provides pairs (e.g. terminal QA gate -> core:cap-synthesis).")
    flags.append("CONCEPTS: no ho:tagged / local Concept authored -- domain vocabulary is a "
                 "judgment (recipe-local concepts, connected).")
    flags.append("PATTERN/CHANNEL: appliesPattern / hasChannel unbound beyond the uniform "
                 "wf-multiagent lineage -- coordination topology refinement is a judgment.")

    # Candidate terminal QA/synthesizer role kept local (promote-once is judgment).
    qa_like = [a["slug"] for a in corpus["agents"]
               if re.search(r"synthesi[sz]er|reviewer|-qa\b|quality", a["slug"], re.IGNORECASE)]
    if qa_like:
        flags.append("QA-GATE: kept local role(s) for %s -- a reviewer may instead REUSE "
                     "core:role-synthesizer (promote-once) to satisfy a required capability, "
                     "or keep it local (varies per recipe)." % ", ".join(qa_like))

    # Run-behaviour: domain-specific failure rows the importer refuses to author.
    rb = corpus["run_behaviour"]
    for etype, strat in rb["fp_local"]:
        flags.append("FAILURE-LOCAL: error row '%s' -> '%s' matches no central fp-* "
                     "archetype -- author a recipe-local id:fp-* (domain recovery "
                     "machinery is a judgment; the importer does not author it)."
                     % (etype, strat))
    for etype, strat in rb["fp_ambiguous"]:
        flags.append("FAILURE-AMBIGUOUS: error row '%s' -> '%s' matched more than one "
                     "central archetype -- disambiguate by hand (left unbound)."
                     % (etype, strat))
    if not rb["error_section_present"]:
        flags.append("FAILURE-MISSING: orchestrator skill has no `## Error Handling` "
                     "section -- ho:hasFailurePolicy left unbound (not fabricated).")
    for head in rb["scenario_unmapped"]:
        flags.append("SCENARIO-UNMAPPED: Test-Scenarios subheading '%s' names no known "
                     "scenarioKind or carries no **Prompt** -- left unbound (not "
                     "fabricated)." % head)
    if not rb["scenario_section_present"]:
        flags.append("SCENARIO-MISSING: orchestrator skill has no `## Test Scenarios` "
                     "section -- ho:hasTestScenario left unbound (not fabricated).")

    # Extending skills whose target agent could not be resolved.
    for s in corpus["skills"]:
        if not s["is_orchestrator"] and s["has_target_section"] and not s["targets"]:
            flags.append("AUGMENT-UNRESOLVED: extending skill '%s' has a Target-Agent section "
                         "but no token matched a known agent file -- augmentsRole left empty." % s["dir"])
        if not s["is_orchestrator"] and not s["has_target_section"]:
            flags.append("AUGMENT-MISSING: extending skill '%s' declares no Target-Agent section "
                         "-- augmentsRole left empty." % s["dir"])
    return flags


def check_capability_hard_stop(ttl_text):
    """Contract guard: if a requiresCapability is ever emitted, a providesCapability
    for the same IRI must also be emitted among the components. The importer emits
    neither, so this is inert here -- but it makes the MUST-NOT explicit and would
    hard-stop a future mode that guessed capability bindings."""
    # Only inspect actual triples, never comment lines (which mention the predicate).
    ttl_text = "\n".join(
        ln for ln in ttl_text.splitlines() if not ln.lstrip().startswith("#"))
    req = set(re.findall(r"ho:requiresCapability\s+([^;.\n]+)", ttl_text))
    prov = set(re.findall(r"ho:providesCapability\s+([^;.\n]+)", ttl_text))
    required = set()
    for chunk in req:
        required.update(t.strip() for t in chunk.split(",") if t.strip())
    provided = set()
    for chunk in prov:
        provided.update(t.strip() for t in chunk.split(",") if t.strip())
    unmet = required - provided
    if unmet:
        raise SystemExit("hard stop: requiresCapability without a provider: %s"
                         % ", ".join(sorted(unmet)))


def main():
    ap = argparse.ArgumentParser(description="corpus harness -> draft recipe TTL")
    ap.add_argument("corpus_dir", help="path to a harness-100 corpus harness dir")
    ap.add_argument("--out", help="recipe dir to write <dirname>.ttl into "
                                  "(default: print to stdout)")
    args = ap.parse_args()

    corpus = load_corpus(args.corpus_dir)
    flags = collect_flags(corpus)
    ttl = emit(corpus, flags)
    check_capability_hard_stop(ttl)

    if args.out:
        os.makedirs(args.out, exist_ok=True)
        out_path = os.path.join(args.out, corpus["dirname"] + ".ttl")
        with open(out_path, "w", encoding="utf-8") as fh:
            fh.write(ttl)
        sys.stderr.write("wrote %s\n" % out_path)
    else:
        sys.stdout.write(ttl)

    sys.stderr.write("\nFLAGS (%d) for %s -- developer review:\n" % (len(flags), corpus["dirname"]))
    for f in flags:
        sys.stderr.write("  - %s\n" % f)


if __name__ == "__main__":
    main()
