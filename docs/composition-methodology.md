# Harness composition: assembling a harness from ontology parts

This document specifies the **composition methodology** — building a new harness
by *composing the ontology's reusable, typed parts* rather than authoring one
from scratch — as the ontology itself now formalizes it. It is the authoring
counterpart to the **ODR EMIT** render path (`docs/odr-bind-lock.md`,
`docs/materialize-design.md`): composition **assembles the SPEC**; ODR
BIND/EMIT/Lock **render and reproduce** it.

The process is documented operationally in `CLAUDE.md` §"Composing a new harness
(the intended workflow)". This doc records how those steps are captured as
first-class ontology nodes so the methodology is itself discoverable, reusable
and connected (not just prose).

## Why compose: the harness makes each role perform its role clearly

A harness is not merely a bag of parts — it is the **means by which each role is
made to perform its role clearly**. Composition binds, per role, the concrete
things that give its agent an unambiguous mandate: the persona/scope that frames
it, the least-privilege **tools** it may use (`ho:roleTool`), the **guardrails**
it operates under (`ho:roleGuardrail`), its **memory discipline**
(`ho:roleMemoryPolicy`), and — only where it applies — its **user-facing**
stance (`ho:userFacing`, an optional characteristic present only on roles that
talk to the user). The neutral template `h-multiagent` demonstrates this: each
of its seven roles carries its own clearly-organized characteristics, so
materialization emits a self-contained `.claude/agents/<role>.md` per agent.
That is the purpose the harness exists to serve — turning a role classification
into an agent that can act within known bounds.

Inter-agent relationships are part of that composition, and they are
**harness-scoped and redefinable**, not fixed globally. The central
`ho:Channel` individuals (`chan-agent-user`, `chan-orchestrator-inspection`,
`chan-dispatch`) are reusable **defaults**; a specific harness declares which it
uses via `ho:hasChannel`, and MAY **redefine** them — authoring its own Channel
individuals with their own `ho:channelParticipant` sets and `ho:channelMedium`
(adding, dropping or overriding participants) — to match how its own agents
relate. The model already supports this without any schema change: a harness
*picks or declares* its channels, so nothing forces a single global topology; no
change was needed to enable a harness to define its own channel individuals.

## Coordination topology is a pluggable, extensible dimension

*How* a harness's agents coordinate is not fixed to one methodology — it is a
**selectable dimension of composition**, declared explicitly by pairing a
`ho:DesignPattern` (the topology) with the matching `ho:Channel`(s) (its
conduit). Two topologies ship centrally today, and new ones are added the same
way without disturbing the existing ones:

| Topology | Pattern | Channel | Shape |
|---|---|---|---|
| **Orchestrator-workers** (default doctrine) | `pat-orchestrator-workers` | `chan-dispatch` | a central orchestrator decomposes work, dispatches node-scoped briefs to workers, integrates results |
| **Peer-mesh** (alternative) | `pat-peer-mesh` | `chan-peer` | peer worker roles coordinate DIRECTLY over a message mesh; no central-only dispatcher |

A harness **selects its methodology** by declaring `ho:appliesPattern <pattern>`
together with the matching channel via `ho:hasChannel`. The neutral template
`h-multiagent` stays **orchestrator-workers** as the default doctrine
(`pat-orchestrator-workers` + `chan-dispatch`); the neutral template
`h-peer-mesh` demonstrates the **peer-mesh** alternative
(`pat-peer-mesh` + `chan-peer`) for recipes that need direct peer coordination.
Neither displaces the other — they coexist, and a recipe picks the topology its
source harness actually uses.

**Extending** the dimension is additive and disturbance-free: a *new* topology
(say a hierarchical or broadcast coordination) is introduced as a **new
`ho:DesignPattern` + a new `ho:Channel`** (plus, for anti-orphan, a host harness
that wires them, exactly as `h-peer-mesh` hosts peer-mesh). No existing pattern,
channel or harness changes, and no TBox change is required — `ho:appliesPattern`,
`ho:hasChannel`, `ho:channelParticipant` and `ho:channelMedium` already express
any topology. This is the same anti-drift discipline as the rest of the library:
reuse the vocabulary, add a node, connect it in the same change.

## The nodes (central, neutral, `.../id/core/`)

| Node | Type | Role in the methodology |
|---|---|---|
| `wf-compose-harness` | `ho:Workflow` | the 7-step composition process (below), as a reusable workflow |
| `pat-ontology-composition` | `ho:DesignPattern` | the pattern: assemble from a bill-of-materials of typed parts, not from scratch |
| `gr-reuse-first` | `ho:Guardrail` | the anti-drift / anti-orphan discipline: reuse first, connect any new part in the same change |
| `c-composition` | `ho:Concept` | term "Harness composition", `skos:broader c-agent-methodology` |
| `c-reuse-first` | `ho:Concept` | term "Reuse-first authoring", `skos:broader c-agent-methodology` |

All five are wired into the neutral template `h-multiagent` (a harness holds
≥1 workflow and ≥1 pattern): `ho:hasWorkflow wf-compose-harness` (alongside the
existing `wf-multiagent`), `ho:appliesPattern pat-ontology-composition`
(alongside `pat-orchestrator-workers`), and `ho:hasGuardrail gr-reuse-first`.
The two new terms hang under the existing methodology top concept
`c-agent-methodology`, so nothing is orphaned. Reusing existing `ho:`
vocabulary only — no TBox class or property was added (`CLAUDE.md` §"Adding
vocabulary").

## The 7 steps (as `wf-compose-harness` formalizes them)

1. **Retrieve a budget-capped context pack** for the request
   (`tools/retrieve.py`) — never load the whole stored graph (`CLAUDE.md` golden
   rule 1; the anti-context-rot term `c-bounded-context`).
2. **Take a template**: the top base-harness candidate from the pack, or a
   `ho:DesignPattern` when none fits.
3. **Bind every capability**: for each `requiresCapability` in scope, bind a
   component that `providesCapability` it. The pack's "Capability gaps" lists
   what is missing; fill each by **reusing** an existing component or authoring
   a new one (`gr-reuse-first`).
4. **Assemble the shape minimums**: 1 `SystemPrompt` + ≥1 `Workflow` + tools +
   guardrails + 1 `ModelConfig`, as enforced by `ho:HarnessShape`.
5. **Write back as new individuals**: `skos:prefLabel`, `ho:maturity "draft"`,
   `ho:derivedFrom` the template, `ho:tokenEstimate` on every node carrying
   text, and existing `ho:Concept` tags so the result is discoverable, not
   orphaned.
6. **Validate**: `tools/validate.py` must print `PASS` — connectivity (no
   orphan islands), typing (SHACL), and capability satisfaction.
7. **Coverage-audit gate** (`CLAUDE.md` step 7): green `validate.py` is not yet
   "done". Enumerate every structural element of the source and map each to a
   representation; an unrepresented harness-structural element (role, tool,
   guardrail, channel, standard) is a GAP to fill, and a missing vocabulary
   category triggers a TBox extension rather than a silent skip.

After the gate, the validated spec is **materialized** — the ODR **EMIT** axis
(`tools/materialize.py`) renders it into the artifact tree.

## Relationship to ODR

The two methodologies are complementary halves of one lifecycle:

- **Composition** (this doc) produces the **SPEC**: the neutral, typed,
  long-lived graph of parts assembled into a harness. It answers *what the
  harness is* in technology-neutral terms.
- **ODR** consumes that spec. Its axes (`docs/odr-bind-lock.md`) are **BIND**
  (which concrete implementation realizes each tool, recipe-side), **EMIT**
  (deterministic render of spec + bind → file tree), and **Lock** (snapshot for
  reproducibility). Composition's step-7 "materialize" is exactly the handoff
  into EMIT.

So `wf-compose-harness` ends where `docs/odr-bind-lock.md` begins: composition
authors and validates the spec; ODR binds an implementation, emits the
artifacts deterministically, and locks the selection so the build reproduces.
Dependency is one-way — composition never depends on a particular
implementation, preserving spec purity (ODR INV-1).

The same INV-1 line governs what a **recipe stores**: the composition spec (part
IRIs) + an explanation of the composition + **references** to the concrete
artifacts — never the concrete build documents themselves (implementation is
referenced and regenerated at build, not stored). `materialize.py` fetches those
references at emit time; see `docs/recipes-design.md` ("What a recipe stores") and
`docs/materialize-design.md` ("References, not stored artifacts").
