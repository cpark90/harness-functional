# VNV verdict — role consolidation (final state, independent re-run)

- Scope: uncommitted working tree consolidating the role roster.
  (1) `role-inspection-worker` → `role-inspection` (worker node deleted, inspection
  absorbs investigation + gains `tool-retriever`).
  (2) `role-developer` → `role-implementer` (developer node deleted, `agent-developer`
  rebinds `agentRole` to `role-implementer`, implementer gains `tool-shell`, 4-file
  reference rebind).
  (3) roles.ttl 4-group re-section (comments) + 4 archetype maturity draft→reviewed.
- Method: every gate below re-run from scratch by vnv; developer self-report not trusted.
- Interpreter: `/usr/bin/python3` (has rdflib/pyshacl/owlrl).

## Verdict: **PASS (with 3 non-blocking notes + 1 residual GAP on the concrete/neutral axis)**

Structure gate (verification) and purpose gate (validation) both hold. The user's
goal — keep only roles that are **clearly distinguished** + resolve the concrete/
neutral double-layer ambiguity — is substantially met. Residual items are pre-existing
or cosmetic; none blocks.

---

## Gate-by-gate evidence

### Gate 1 — no dangling refs to deleted nodes — PASS
`grep -rn "role-inspection-worker\|role-developer" ontology/` → **0 hits** (raw
per-file counts confirm 0). rdflib: `role-developer` triples out/in = 0/0;
`role-inspection-worker` = 0/0.

### Gate 2 — governance preserved, no guardrail orphaned — PASS
rdflib over all abox: **40 guardrails, 0 orphans**. Both governance guardrails
carried by the deleted developer role remain reachable:
- `gr-controlled-vocabulary` ← referenced by `h-multiagent` (hasGuardrail).
- `gr-reuse-first` ← referenced by `role-orchestrator` (roleGuardrail) + `h-multiagent`.

`validate.py` global reachability ("all 236 individuals reachable") independently
confirms no guardrail became an orphan island.

### Gate 3 — agent-developer resolves to role-implementer — PASS
rdflib: `agent-developer` → agentRole `[role-implementer]`; agentFunction
`[cap-codeexec, cap-fileedit]` (preserved); agentObservation `[os-developer]`
(preserved, node exists). `role-implementer` is typed `ho:Role` = True. No dangling
agentRole.

### Gate 4 — reference rebind consistent, no duplicate list items — PASS
rdflib per-carrier (developer=0, worker=0, implementer counted):
- `h-multiagent`: 6 roles, distinct=6, implementer=1.
- `h-peer-mesh`: 5 roles, distinct=5, implementer=1.
- `h-workspace-synthesis`: 11 roles, distinct=11, implementer=1 (the "remove-not-add"
  case — implementer was already present, developer removed → no dup).
- All 4 channels (`chan-dispatch`, `chan-workspace`, `chan-peer`, `chan-task-board`):
  developer=0, worker=0, implementer=1, dup=False.
- `wfs-author-verify` stepByRole → `[role-implementer]`.
- `oa-developer-internal` observesComponent → `[role-implementer]`.
Diff confirms observation/channels/workflows/harnesses are **pure reference rebinds**
(no `a ho:`-typed subject added/removed); only roles.ttl changes node cardinality.

### Gate 5 — validate + determinism, individual count — PASS
`/usr/bin/python3 tools/validate.py` → **PASS** (SHACL ✓, reachability ✓ [236
individuals], capabilities ✓, assemblyOrder ✓, no dup labels), exit 0.
`/usr/bin/python3 tools/check_determinism.py` → **PASS** (4 requests × 4 runs,
byte-identical), exit 0.
Count arithmetic: HEAD roles.ttl = 16 role nodes → working tree = 14 (−2:
`role-developer` + `role-inspection-worker` deleted, none added; curator already in
HEAD). Total individuals HEAD 238 → **236** (−2, one per merge), matching validate.

### Gate 6 — recipe repo unaffected — PASS
`grep core:role-developer|core:role-inspection-worker` in `harness-recipes/` → 0
(`core-ref-exit=1`). `grep specializes.*role-developer|role-inspection-worker` → 0.
The lpranging recipe DOES define a **recipe-local** `id:role-developer`
(`.../id/lpranging/role-developer`, prefLabel "Developer role") — a separate node in
the recipe namespace that reuses only still-existing central parts (`core:tool-*`,
`core:gr-*`); it never references the deleted `core:role-developer`. README prose
mention is that same recipe-local role.
Closure re-validated for real: temp `central` symlink → `HARNESS_CATALOG=catalog-v001.xml
HARNESS_ROOT_ONTOLOGY=.../recipes/lpranging /usr/bin/python3 central/tools/validate.py`
→ **PASS** (259 individuals reachable, conforms), exit 0. Symlink removed after.
The catalog maps `core-roles`, so the deleted-node case is genuinely exercised.

### Gate 7 — retrieve smoke — PASS
- Query "investigate the design graph … feedback … git": `role-inspection` returns at
  **rel 8.1** with the merged definition (investigates design graph + feedback + git);
  `agent-inspection` node text present. Investigation function is discoverable via the
  single inspection role (no separate worker needed).
- Query "turn a specification into the working artifact, build and author it":
  `role-implementer` returns at **rel 5.4** with merged definition
  (…"an authored ontology individual"…); `agent-developer` node now reads
  "instantiating the neutral implementer role archetype". No `role-developer` node
  surfaces.

---

## Upper-level judgment — user goal satisfaction

**Clear-distinction / near-synonym drift:** the two merges removed the two genuine
concrete↔neutral duplicates. `implementer`'s definition dropped its old "distinguished
from role-developer …" paragraph (which only existed to separate the twin) and now
states the concrete agent **is an instance of** it — drift source removed, not papered
over. Remaining roles each carry an explicit discriminator against the nearest
neighbor, and the task's flagged pairs hold:
- `vnv` (returns a verdict, CONSUMES material) vs `tester` (PRODUCES the checks, no
  judgment) — mutually cross-referenced. Clear.
- `research` (gathers NEW info, grounded in source) vs `analyst` (diagnoses EXISTING
  material by severity) — cross-referenced. Clear.
- `strategist` / `planner` / `analyst` and `orchestrator` / `coordinator` — each
  cross-referenced. Clear.

**Concrete/neutral double-layer:** resolved coherently. Operating `ho:Agent` nodes
now instantiate role nodes; role nodes are neutral where reused across carriers
(`implementer`, `vnv`, `research`, `design` — all bound to all 3 harnesses) and
repo-specific where not (`orchestrator`, `inspection` — h-multiagent only). The
former two-node construction concept collapses to one. `agent-developer → role-implementer`
is the canonical instantiate-not-duplicate case.

**Dual-membership consistency:** `research`/`design`/`vnv`/`implementer` are bound to
all three carriers (verified by reverse hasRole), consistent with the group-A "DUAL
ROLE" header. `synthesizer` is bound to `h-workspace-synthesis` only.

---

## Residual GAP + notes (non-blocking; not fixed by vnv — routing hints only)

- **GAP-1 (pre-existing, on the concrete/neutral axis):** `agent-synthesizer` sits in
  `h-multiagent.hasAgent` with `agentRole role-synthesizer`, yet `role-synthesizer` is
  **NOT** in `h-multiagent.hasRole` (its only hasRole carrier is `h-workspace-synthesis`).
  So h-multiagent hosts a concrete agent whose role its own roster does not declare —
  the one place the concrete↔neutral layering is inconsistent. **Verified present at
  HEAD → this consolidation did not introduce or regress it**; validate passes (no SHACL
  shape ties agentRole to the harness's hasRole; the node is reachable via hasAgent).
  Recommend a follow-up decision: either add `role-synthesizer` to `h-multiagent.hasRole`
  or move `agent-synthesizer` off h-multiagent. Out of this consolidation's stated scope.
- **N2 (comment introduced by this work):** the new TAXONOMY header (roles.ttl ~line 45)
  labels group B "carrier id:h-multiagent … synthesizer", but the graph binds
  `role-synthesizer` via hasRole to `h-workspace-synthesis`. The header conflates the
  role's hasRole-carrier with `agent-synthesizer`'s harness. Cosmetic comment precision.
- **N3 (doc-lag, cosmetic):** `tools/materialize.py:90` docstring and
  `docs/materialize-design.md:205` still use `id:role-developer` as the role-name-stripping
  example (now a deleted node). Behavior unaffected (strips `role-` prefix regardless);
  stale illustration only. Other `role-developer`/`role-inspection-worker` hits are in
  `docs/plans/*`, `docs/feedback/verified/*`, and `.claude/agent-memory/inspection/*` —
  historical records of the pre-merge state; expected, not defects.
- **Softest surviving discriminator:** `research` ↔ `curator` (both operate on
  "material"); defensible (gather-new-external vs organise-existing-into-collection) but
  the closest remaining boundary — worth a light re-read if the roster is revisited. Not a
  merge candidate on current evidence.

## Reproduce (commands run)
```
grep -rn "role-inspection-worker\|role-developer" ontology/
/usr/bin/python3 tools/validate.py
/usr/bin/python3 tools/check_determinism.py
# rdflib probes: hasRole/agentRole/channelParticipant/stepByRole/observesComponent, guardrail orphans
grep -rn "core:role-developer\|core:role-inspection-worker\|specializes.*role-developer\|specializes.*role-inspection-worker" /home/cpark/git/harness-recipes/
# recipe closure: ln -s central; HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=.../recipes/lpranging /usr/bin/python3 central/tools/validate.py; rm central
/usr/bin/python3 tools/retrieve.py "<inspection query>" ; "<implementer query>"
```
