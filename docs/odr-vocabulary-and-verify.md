# ODR vocabulary + contract verification: the BIND/VERIFY terms and the judge

This repository holds the harness's **ODD + functional level** — the OWL TBox,
the SHACL shapes, and every shared tool (`tools/`). This document is the
**functional half of two ODR axes**:

- **BIND** (② which implementation) — the `ho:Candidate` vocabulary and the
  property-chain design that makes candidates reachable without a bespoke shape.
- **VERIFY** (④ spec-conformance) — the `ho:Contract` vocabulary, the same
  reachability design applied to contracts, and the design of
  `tools/verify_contract.py`, the judge that runs contracts against a
  materialized tree.

These belong here because vocabulary lives where the TBox lives
(`ontology/tbox/harness.ttl`), shapes where the shapes live, and a tool's design
spec where the tool lives — the same conclusion recorded for
[`materialize-design.md`](materialize-design.md).

**The other half of each axis is in harness-concrete.** The *individuals* that
actually carry candidates, selection policies, locks and contracts — the neutral
parts library, the 58 recipes — are concrete-level, and so are the selection
policy's ordering rule, the lock's snapshot contract, the worked evidence and
the ODR maturity claims:

| axis | concrete half (individuals, policy, lock, evidence) |
|---|---|
| BIND + ③ Lock (levels 1–2) | **`harness-concrete/docs/odr-bind-lock.md`** |
| VERIFY (levels 3–4) | **`harness-concrete/docs/odr-contract-verify.md`** |

Read a repo's half alongside the other. Nothing in *this* document names an
implementation, a recipe or a version — that is **INV-1 spec purity**: the
vocabulary is neutral, the individuals are recipe-side.

harness-concrete checks this repository out as `./central/`, so paths written
here as `tools/…` and `ontology/…` are invoked from there as `central/tools/…`
and `central/ontology/…`.

## BIND — TBox vocabulary added (neutral)

- `ho:Candidate` (`rdfs:subClassOf ho:HarnessComponent`) — one implementation
  option for a Tool: a concrete `ho:implementationRef` (file/URL) plus
  `ho:candidateVersion` and `ho:candidateTag`.
- `ho:implementationCandidate` (Tool → Candidate) — associates a tool with an
  option.
- `ho:candidateVersion` / `ho:candidateTag` (Candidate → string).
- `ho:selectionPolicy` (Tool **or** Harness → string) — how EMIT picks when no
  lock is given (tool-level overrides harness-level default). The *closed* set
  of accepted policy strings and the total ordering they impose are specified
  in `harness-concrete/docs/odr-bind-lock.md` §"Selection policy".
- `ho:implementationRef` — carried by a **Candidate** (which file this option
  resolves to) or, degenerately, directly by a **Tool** (a single implicit
  candidate). Precedence: **explicit candidates > direct ref > stub**.

### Reachability without a bespoke shape (design note)

A `ho:Candidate` is a `ho:HarnessComponent`, so `ComponentConnectivityShape`
requires it to be wired into a harness (no orphans). The obvious move — making
`ho:implementationCandidate rdfs:subPropertyOf ho:hasComponent` — is **wrong
here**: `ho:hasComponent` has `rdfs:domain ho:Harness`, so under OWL RL the
*Tool* subject of the edge would be inferred a **Harness** (prp-dom) and trip
`HarnessShape` (a tool has no domain/task/workflow). This is the mirror of the
`rolePersona` domain-trip already recorded in the developer memory.

Instead a **property chain** rolls candidates up to the harness that binds the
tool:

```
ho:hasComponent owl:propertyChainAxiom ( ho:hasComponent ho:implementationCandidate )
```

so `harness hasComponent tool ∧ tool implementationCandidate cand ⇒ harness
hasComponent cand`. The candidate becomes an orphan-free component of the
**harness** (which is correctly a Harness), the tool is **not** mistyped, and no
new SHACL shape is needed. `ho:implementationCandidate` itself is a plain object
property (`rdfs:domain ho:Tool`, `rdfs:range ho:Candidate`), registered in
`tools/ontology_lib.py` (`INSTANCE_CLASSES += Candidate`,
`INSTANCE_LINK_PREDICATES += implementationCandidate`) so retrieve/validate see it.

`ho:implementationRef` and `ho:selectionPolicy` carry **no `rdfs:domain`**: a
`Tool`-only domain would (prp-dom) mistype a Candidate carrying `implementationRef`
as a Tool, and a `selectionPolicy` usable on both Tool and Harness cannot have a
single conjunctive domain. Dropping the domain only removes inference; every user
is explicitly typed, so validation is unchanged (the concrete repo's neutral parts
library reported an identical individual count on both loader paths — 64 at the
time of this increment; it has grown since).

## VERIFY — the Contract model (TBox, neutral)

- `ho:Contract` (`rdfs:subClassOf ho:HarnessComponent`) — a verifiable spec
  contract. Carries `ho:contractKind` and `ho:contractCheck`, plus the usual
  `skos:prefLabel` + `skos:definition`.
- `ho:capabilityContract` (`ho:Capability` → `ho:Contract`) — attaches a
  contract to a capability.
- `ho:contractKind` (`ho:Contract` → string) — `"executable"` or `"structural"`.
  A contract chooses exactly one; a capability may carry several contracts mixing
  both kinds.
- `ho:contractCheck` (`ho:Contract` → string) — the check, interpreted per kind
  (grammar below).

A contract hangs off a **Capability**, not a chosen implementation candidate, so
the verification criterion comes only from the spec (**INV-3 verification
independence**) and re-binding to a different candidate cannot change the verdict
(**INV-4 replacement harmlessness**).

### Reachability without a bespoke shape

A `ho:Contract` is a `ho:HarnessComponent`, so `ComponentConnectivityShape`
requires it to be wired into a harness. Rather than a new shape, a **property
chain** on `ho:hasComponent` rolls contracts up to the harness that binds the
capability's provider:

```
ho:hasComponent owl:propertyChainAxiom
    ( ho:hasComponent ho:providesCapability ho:capabilityContract )
```

so `harness hasComponent component ∧ component providesCapability cap ∧ cap
capabilityContract contract ⇒ harness hasComponent contract`. The chain is
**prefixed with `hasComponent`** (three links) so the inferred subject is always
the Harness. A tempting two-link chain `( providesCapability capabilityContract )`
would instead conclude `component hasComponent contract` and — via
`hasComponent`'s `rdfs:domain ho:Harness` (prp-dom) — **mistype the provider
component as a Harness**, tripping `HarnessShape`. This mirrors the
`ho:Candidate` rollup under §"BIND — TBox vocabulary added" above exactly. `ho:capabilityContract` is a plain object property
(`rdfs:domain ho:Capability`, `rdfs:range ho:Contract`), registered in
`tools/ontology_lib.py` (`INSTANCE_CLASSES += Contract`,
`INSTANCE_LINK_PREDICATES += capabilityContract`). The concrete repo's neutral
parts library reported an unchanged individual count, identical on both loader
paths (**96** at the time of this increment; it has grown since): the vocabulary
adds no instances.

## The two verification mechanisms (per-contract choice)

`tools/verify_contract.py <harness-id> --tree <materialized-out-dir> [--format text|json]`
collects the harness's capability contracts (the capabilities it *requires* plus
the ones its components *provide*), then dispatches on `ho:contractKind`. The
contract individuals live where the ABox lives, so the tool is normally run from
harness-concrete as `central/tools/verify_contract.py`; like `validate.py` and
`materialize.py` it honours `HARNESS_CATALOG` / `HARNESS_ROOT_ONTOLOGY`.

### executable

`ho:contractCheck` is a shell command run with **CWD = the materialized tree
root**; the contract **passes iff the command exits 0**. Output is captured (not
streamed) and a bounded timeout (120 s) refuses a hung check. Use this for real
behavioural checks — running the emitted tool and asserting its behaviour.

Examples:
- `python3 -c "import ast; ast.parse(open('tools/docgraph.py').read())"` — the
  emitted tool is a syntactically valid module (a tech-neutral "artifact is
  runnable" check).
- `python3 tools/greeter.py | grep -q 'hello world'` — running the emitted tool
  prints the expected greeting (a behavioural check that any correct candidate
  satisfies).

(Both paths above are **inside the emitted tree**, not in this repo.)

### structural

`ho:contractCheck` is a declarative assertion evaluated against the tree, in this
grammar (paths are **tree-relative**; a path that escapes the tree via `..` or an
absolute prefix is refused):

| assertion | passes iff |
|---|---|
| `file-exists:<path>` | `<path>` exists under the tree |
| `file-contains:<path>::<substring>` | `<path>` is a file and contains the literal `<substring>` |
| `section:<path>::<heading>` | `<path>` has a Markdown heading line whose text equals `<heading>` |

`section` compares on the **hash-stripped heading text**, so
`section:CLAUDE.md::Coordination channels` and
`section:CLAUDE.md::## Coordination channels` both match the line
`## Coordination channels`.

### Reporting / determinism

Contracts are processed in **IRI-sorted** order, so the report is deterministic.
The text report lists each contract's kind, label, capability, the check string
and a pass/fail detail; `--format json` adds captured detail for CI. **Exit code
is non-zero iff any contract fails.** A harness with no contracts verifies as a
vacuous `0/0 — PASS` (verification is opt-in per capability).

## What is NOT here

Deliberately, so the two halves are not double-maintained:

- the **selection policy** ordering rule, the closed policy set, and the
  `harness.lock.json` snapshot contract → `harness-concrete/docs/odr-bind-lock.md`;
- the **contracts themselves** (`ho:Contract` individuals on recipe capabilities)
  and the worked level-3/level-4 evidence →
  `harness-concrete/docs/odr-contract-verify.md`;
- `materialize.py`'s own emit behaviour (validation gate, atomic emit, stable
  emitted filenames, the emitted tree) → [`materialize-design.md`](materialize-design.md).
