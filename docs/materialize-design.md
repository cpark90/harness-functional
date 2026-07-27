# Materialize design: the build projection (recipe → harness file tree)

This document defines `tools/materialize.py`, the **build projection** of the
harness ontology. It is the counterpart to the approved feedback
`docs/feedback/recipe-to-buildable-harness.md`: a recipe is a bill-of-materials
graph, and until now there was no tool to render a validated recipe union into
an actual runnable harness file tree. `retrieve.py` reads; `validate.py` checks;
`materialize.py` **builds**.

> **BIND + Lock increment.** The ODR BIND axis (implementation *candidates*, a
> deterministic *selection policy*) and the ③ *Lock* snapshot (reproducible
> builds, `--lock`) are specified in **[`docs/odr-bind-lock.md`](odr-bind-lock.md)**
> — read it alongside this document for how `materialize.py` chooses among
> implementations and reproduces a past build byte-identically.
>
> **VERIFY increment (maturity 3–4).** The ODR VERIFY axis — capability
> **`ho:Contract`s** and `tools/verify_contract.py`, which judges the
> materialized tree against the spec — is specified in
> **[`docs/odr-contract-verify.md`](odr-contract-verify.md)**. With it the project
> reaches **ODR levels 3–4 demonstrated** (contract-checked artifacts, and
> implementation-independence proven via an INV-4 candidate swap); this document's
> EMIT is what those contracts are run against.

**Increment 1** was the spine (P1) plus template-file references (P2), scoped to
emitting `CLAUDE.md` + `MANIFEST.json`. **Increment 2** (this document, current)
adds the remaining feedback recommendations so a validated multi-agent recipe
materializes as a full harness tree with no manual cloning:

- **P4 — first-class roles**: a new `ho:Role` class; each `ho:hasRole` is emitted
  as `.claude/agents/<role>.md` and summarised in `CLAUDE.md`.
- **P3 — tool implementation refs**: `ho:implementationRef` on a `ho:Tool`;
  materialize resolves and **fetches (byte-copies) the real file** into
  `tools/<basename>`.
- **P5 — standard/docs scaffold**: `ho:scaffold` **references** to concrete
  standard/doc fragments, **fetched** into the tree (`docs/…`, standard `.md`);
  skill bodies are fetched the same way (skill `ho:artifactTemplate`). A recipe
  stores references, not the artifacts (see "References, not stored artifacts").

## retrieve ↔ materialize symmetry

The ontology is never handed to an agent whole; both tools are **projections**
of the union, in opposite directions:

| | `retrieve.py` (read) | `materialize.py` (build) |
|---|---|---|
| input | a natural-language request | a validated harness IRI/id |
| selection | lexical seeds + bounded BFS, token-budget capped | the harness's own components (deterministic) |
| output | a compact **context pack** to READ | a **file tree** to BUILD (`CLAUDE.md`, `MANIFEST.json`) |
| defends | context rot (bounded read) | drift/orphans (only a *validated* union builds) |
| loader | `ontology_lib.load_graph` (catalog/glob, env overrides) | same |

Both honour `HARNESS_CATALOG` / `HARNESS_ROOT_ONTOLOGY`, so a **recipe** union
(central neutral parts + a recipe's domain bindings) materializes exactly the
way the central store does. `ho:artifactTemplate` is a build-only concern:
`retrieve.py` ignores it, keeping the read projection unchanged.

## Validation gate — "only a validated harness materializes"

Before emitting a single file, `materialize.py` calls `validate.run_structured()`
(the same structured check `validate.py --json` uses) over the composed union.
If the union does not `PASS` (SHACL, reachability, capability satisfaction) the
tool **refuses**: it prints a clear message to stderr and exits non-zero, writing
nothing. This makes the build honest — a file tree is only ever produced from a
connected, well-typed, capability-complete graph. (Verified: pointing the loader
at an incomplete catalog that omits the central parts makes the union fail
validation and materialize refuses with exit 1, no output directory created.)

## CLI

```
materialize.py <harness-IRI-or-id> --out <dir> [--format text|json]
```

- `<harness-IRI-or-id>` — a full entity IRI, or a short id such as `h-techdoc`
  (resolved by matching the IRI's last path segment; ambiguity or absence is a
  hard error listing the known harnesses).
- `--out <dir>` — output directory for the emitted file tree (created if absent).
- `--format text|json` — the **stdout build report** only (a human summary vs the
  manifest as JSON). The files on disk are always emitted regardless of `--format`,
  mirroring `retrieve.py`'s `--format md|json` convention.

Run with an interpreter that has `rdflib`/`pyshacl`/`owlrl` (e.g.
`/usr/bin/python3`), like its peers.

## Emitted file tree

The full tree a multi-agent recipe now materializes to:

```
<out>/
├── CLAUDE.md                       # the operating doc (overview + roles + channels summary)
├── MANIFEST.json                   # provenance / build record
├── .claude/agents/<role>.md        # one per ho:hasRole (P4)
├── tools/<basename>                # real code FETCHED per ho:implementationRef (P3)
├── .claude/skills/<name>/SKILL.md  # skill body FETCHED per ho:artifactTemplate
└── docs/… , <STANDARD>.md          # concrete standard/doc FETCHED per ho:scaffold (P5)
```

### `CLAUDE.md` — the operating doc

Assembled from the target harness's components in a **fixed section order**;
within a section, multiple components are sorted by IRI so the same input yields
byte-identical output (no timestamps, stable ordering):

| section | source predicate | rendered as |
|---|---|---|
| overview (`# title` + intro) | harness `skos:prefLabel` / `skos:definition` | heading + prose |
| `## Persona` | `ho:hasSystemPrompt` → `ho:promptText` | prose (via template if present); **per-role personas are excluded here** — they render into the role's own agent file |
| `## Operating rules` | `ho:hasGuardrail` | one bullet per guardrail: prefLabel + promptText, with each `ho:languageCondition` as a sorted sub-bullet |
| `## Process` | `ho:hasWorkflow` (+ `ho:appliesPattern`) | bullets: workflow/pattern prefLabel + `skos:definition` |
| `## Model` | `ho:usesModel` → `ho:promptText` | bullet: prefLabel + config string |
| `## Roles` | `ho:hasRole` | one bullet per role: prefLabel + `.claude/agents/<slug>.md` path + `skos:definition` (omitted when the harness has no roles) |
| `## Coordination channels` | `ho:hasChannel` | one bullet per channel: prefLabel + `skos:definition`, with participant role labels, `ho:involvesUser`, and `ho:channelMedium` as sorted sub-bullets (omitted when the harness has no channels) |

### `MANIFEST.json` — the provenance / build record

A deterministic (`sort_keys`) JSON object with:

- `harness`, `prefLabel`, `derivedFrom` — identity + provenance.
- `components` — every bound component as `{iri, type, label}`, sorted by IRI.
- `capabilityBindings` — for each `ho:requiresCapability`, the component(s) that
  `ho:providesCapability` it (the composition proof, mirrored from
  `validate.check_capability_satisfaction`).
- `templateSources` — the template / scaffold fragment paths actually rendered.
- `tokenEstimate` — the summed `ho:tokenEstimate` of the bound components (keeps
  the build budget-accurate, consistent with the anti-rot discipline).
- `roles` — one record per `ho:hasRole`: `{role, label, agentFile, tools[],
  guardrails[]}` (the emitted agent file + its least-privilege scope).
- `channels` — one record per `ho:hasChannel`: `{iri, label, definition,
  participants[], involvesUser, medium}` — coordination channels as first-class
  manifest entries (not just buried in `components`), mirroring the `roles` style.
- `implementations` — one record per tool with an implementation binding:
  `{tool, label, ref, status: resolved|stub, dest, …}`.
- `scaffold` — one record per fetched fragment: `{source, dest, status:
  resolved|stub}`.
- `skills` — one record per `ho:hasInstruction`: `{instruction, label, name,
  definition, skillFile, vendoredFrom, status: resolved|stub|graph}` (the fetched
  skill body, or a stub / graph-rendered fallback).

## `ho:artifactTemplate` mechanism (P2)

The confirmed body-storage decision is **template-file references**, not inline
long-text blocks: a component may carry

```turtle
ho:artifactTemplate "tools/materialize_templates/persona.md.tmpl"
```

(a new `owl:DatatypeProperty`, `rdfs:domain ho:HarnessComponent`,
`rdfs:range xsd:string`, added to the TBox). When present, `materialize.py` reads
that fragment and renders it as the component's section, substituting the node's
graph data. When **absent**, it falls back to rendering the section from graph
data (the promptText/definition already in the node) — so the property is a
progressive enhancement, never a requirement.

**Substitution** is simple placeholder replacement from the node's graph data:
`{{prefLabel}}`, `{{promptText}}`, `{{definition}}`. This is intentionally
minimal (no template engine, no logic) — anti-drift and determinism over cleverness.

**Path resolution.** A `ho:artifactTemplate` value is a repo-relative path,
resolved against these roots in priority order, first existing file wins:

1. the **ontology repo root** (`ontology_lib.ROOT`) — where `tools/` and
   `ontology/` live;
2. the **catalog's directory** (`dirname(HARNESS_CATALOG)`) — the **recipe repo
   root** when a recipe union is materialized via `HARNESS_CATALOG`, so a recipe
   can ship its own template fragments next to its `.ttl`.

A path that is set but resolves to no file is a hard error (misconfiguration),
distinct from the property being absent (graph-data fallback).

Central stays neutral: the demo wires `ho:artifactTemplate` onto the **recipe**
node `id:sp-techdoc` (in `staging/harness-recipes/recipes/techdoc/techdoc.ttl`),
pointing at the reusable, domain-neutral fragment
`tools/materialize_templates/persona.md.tmpl` (a materialize tool asset, not an
ontology part).

## First-class roles (P4)

A multi-agent harness dispatches distinct sub-agents (orchestrator, worker,
reviewer, inspector) whose **tool/guardrail boundaries** and **memory policy**
are load-bearing. Increment 2 models that as a first-class node:

- `ho:Role` — `rdfs:subClassOf ho:HarnessComponent`, so a role individual is
  harness-reachable and **counted** like any other component, and the existing
  orphan shape (`inverse ho:hasComponent`) covers it for free.
- `ho:hasRole` (Harness → Role), a **sub-property of `ho:hasComponent`** — this
  is what makes the reachability/SHACL story work: OWL RL materialises
  `hasComponent` from `hasRole`, so no new shape is needed.
- role scope: `ho:rolePersona` (→ `ho:SystemPrompt`), `ho:roleTool` (→ `ho:Tool`),
  `ho:roleGuardrail` (→ `ho:Guardrail`), and the datatype `ho:roleMemoryPolicy`.

**Connectivity rule for personas.** `rolePersona` is *not* a sub-property of
`hasComponent` (its domain is `Role`, so it cannot be — that would mistype the
role). A role's persona `SystemPrompt` is therefore **also bound to the harness
via `ho:hasSystemPrompt`** so it satisfies the component-orphan shape and the
`SystemPromptShape` (promptText). To avoid duplication, `materialize.py`
**excludes per-role personas from the top-level `## Persona`** section — they
render only into the role's own agent file. The scoped `roleTool` / `roleGuardrail`
point at parts the harness already binds (`usesTool` / `hasGuardrail`), so no
orphan is created; the role merely records a least-privilege *subset*.

**Emission.** For each `ho:hasRole`, materialize writes
`.claude/agents/<slug>.md` where `<slug>` is the role IRI's last segment with a
leading `role-` stripped (`id:role-implementer` → `implementer.md`). The file carries
YAML frontmatter (`name`, `description`), the persona text, a `## Tools` and
`## Guardrails` scope list (sorted by IRI), and a `## Memory policy` block. A
`## Roles` summary is added to `CLAUDE.md`.

## Coordination channels

A multi-agent harness's roles (and the user) coordinate over durable **channels**
— the conduit + participants + hand-off protocol, modelled as `ho:Channel`
(`rdfs:subClassOf ho:HarnessComponent`) bound to the harness via `ho:hasChannel`
(a **sub-property of `ho:hasComponent`**, so a channel is harness-reachable and
covered by the orphan shape for free, exactly like `ho:hasRole`). Each channel
carries `skos:definition`, `ho:channelParticipant` (→ the `ho:Role`s on it),
`ho:involvesUser` (boolean — is the user an endpoint), and `ho:channelMedium`
(the string conduit description).

Until this increment channels were modelled but had **no dedicated emitter**: they
rolled up into `MANIFEST.json`'s `components` list (via `hasChannel ⊑ hasComponent`)
but the emitted tree never surfaced them as readable coordination content. The
channel emitter closes that projection/EMIT gap, parallel to how roles are emitted:

- **`CLAUDE.md` — `## Coordination channels`** section (mirrors `## Roles`): for
  each `ho:hasChannel`, a bullet with the channel prefLabel + definition, then
  sorted sub-bullets for its participant role labels, `involves user: yes|no`, and
  the medium. Channels are IRI-sorted; participants within a channel are IRI-sorted
  — byte-deterministic, no timestamps. A channel-less harness omits the section
  entirely (verified against a central harness with no `hasChannel`).
- **`MANIFEST.json` — `channels`** array: one `{iri, label, definition,
  participants[], involvesUser, medium}` record per channel, so channels are
  first-class in the manifest rather than only implicit in `components`. Mirrors
  the `roles`/`implementations` manifest style. Absent channels ⇒ `[]`.

`channel_record()` is the single source for both projections (section render and
manifest record), keeping them consistent. This is a pure read/EMIT addition: the
TBox, shapes and channel ABox are unchanged — the emitter only projects what the
graph already models.

## Tool implementation refs (P3)

`ho:implementationRef` (`rdfs:domain ho:Tool`, `rdfs:range xsd:string`) carries a
path or URL to the tool's **real code**. On build, materialize **fetches/copies
the actual file** into `tools/<basename>` of the output tree — the recipe graph
stays a bill-of-materials, but the built tree ships runnable code.

**Path resolution** reuses the template roots (repo root, then the recipe/catalog
directory), then falls back to treating the ref as an absolute path:

1. `<repo-root>/<ref>` (e.g. a central tool shipped in this repo);
2. `<dirname(HARNESS_CATALOG)>/<ref>` (a recipe shipping code beside its `.ttl`);
3. `<ref>` as an absolute path.

If a local file is found it is byte-copied (`status: resolved`). If the ref is a
URL or resolves to nothing, materialize writes a `tools/<basename>.ref` **stub**
naming the ref (`status: stub`) — the build never silently drops a tool, and an
offline environment degrades gracefully rather than failing.

This resolution — repo root, recipe dir, then absolute path, else a fail-safe
stub — is factored into a single helper (`_resolve_ref_path`) that **every**
reference materialize follows: `ho:implementationRef`, `ho:scaffold` and skill
`ho:artifactTemplate` alike. A recipe stores a *reference* to a concrete
artifact; materialize *fetches* it at build (see "References, not stored
artifacts" below).

**Reference reach (portability vs a pure spec).** A **repo-relative** ref (code
shipped beside the `.ttl`) resolves against the catalog dir (rule 2), so it
materializes to `status: resolved` on any machine that has the recipe repo — but
it is itself a stored copy, appropriate only for genuinely recipe-owned assets.
An **absolute** or **URL** ref keeps the recipe a pure spec-plus-references but
resolves only where that path/URL is reachable; where it is not it **fails safe**
to a `.ref` **stub** (`status: stub`). The lpranging recipe deliberately uses
**external absolute** refs into the real source harness (it stores no copy of any
tool/doc/skill); it materializes to `status: resolved` where that source is
present and to stubs where it is not.

## Standard / docs scaffold (P5)

Attachable blueprint fragments (a standard document, a `docs/` tree) are **fetched**
into the harness tree via `ho:scaffold` — a **reference** (repo-relative or an
absolute/external path) to the concrete standard/doc, resolved by the shared
`_resolve_ref_path` fetch-resolution and **byte-copied** into the tree so the
emitted fragment is byte-identical to its source. The recipe stores the
*reference*, not the document. Fragments may be attached to the harness or to any
`ho:targetsDomain` domain. If a reference does not resolve, a `<dest>.ref`
**stub** is emitted instead of failing (the same fail-safe as
`ho:implementationRef`), and each `scaffold` manifest record carries a `status`
(`resolved` | `stub`).

The output path **mirrors the source tree after a `scaffold/` marker segment**
(`recipes/<n>/scaffold/docs/x.md` → `docs/x.md`); a reference with no such marker
— e.g. an external absolute path — emits at the **basename** in the tree root
(`.../lpranging/docs/ONTOLOGY.md` → `ONTOLOGY.md`). Placeholder substitution was
dropped from scaffold with the move to the fetch model: a scaffold is now a
faithful byte-copy of a concrete artifact, not a rendered template. (Component
*section* templating via `ho:artifactTemplate` — P2 — still substitutes
`{{prefLabel}}`/`{{definition}}`/`{{promptText}}`; that path is unchanged.)

## References, not stored artifacts (the recipe/materialize contract)

A recipe stores **spec + explanation + references** to concrete build artifacts,
**never the concrete documents themselves** (`docs/recipes-design.md`). The three
reference predicates and their emitters are symmetric: `ho:implementationRef`
(tool code → `tools/<name>`), `ho:scaffold` (standard/doc → mirrored path) and
skill `ho:artifactTemplate` (skill body → `.claude/skills/<name>/SKILL.md`) all
resolve through the single `_resolve_ref_path` helper and **fetch (byte-copy)**
the referenced source at build. Any reference that does not resolve — a URL, or an
external source absent from this machine — degrades to a fail-safe `.ref`
**stub** (a deterministic placeholder naming the ref via `_ref_stub`), so a build
is always produced and the stub is exactly the signal that a reference did not
travel. This is the ODR line at the emit layer: implementation is *referenced and
regenerated at build*, never stored in the spec (ODR INV-1). Every emitter records
a per-reference `status` (`resolved` | `stub`; skills also `graph` for a
template-less instruction rendered from graph data) in `MANIFEST.json`, and the
whole tree stays deterministic (no timestamps) so two builds are byte-identical.

**Why a new property rather than reusing `ho:artifactTemplate` for this.**
`ho:artifactTemplate` has `rdfs:domain ho:HarnessComponent` and renders a
*component's `CLAUDE.md` section*. Attaching it to a `Harness` or `Domain` would,
under OWL RL, infer that node to be a `HarnessComponent` — tripping the
component-orphan shape (a harness is a component of nothing). `ho:scaffold`
therefore carries **no `rdfs:domain`** and emits **standalone files**, not
sections. `ho:artifactTemplate` remains available for the component-section case
(P2) and is unchanged.
