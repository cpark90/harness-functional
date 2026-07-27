# Merging a concrete role node into its neutral archetype twin (de-dup, keep the archetype)

Scenario (B-series consolidation): a concrete authoring role (`role-developer`,
this repo's own agent) and a domain-neutral construction archetype
(`role-implementer`, group C) are functional TWINS — no `ho:specializes` edge
between them, just a concrete↔neutral duplicate. Approved fix = **archetype
survives, concrete role is deleted, the operating Agent node rebinds to the
archetype.** Distinct from the specializes-child merge (see sibling note): here
there is no specializes edge to auto-drop, and the survivor is the NEUTRAL node.

## Recipe (reusable)
1. **Delete the concrete role block entirely** (`id:role-X a ho:Role …`).
   Individual count drops by 1 (here 237→236) — expected, not a regression.
2. **Survivor (archetype) absorbs, minimally, staying neutral**:
   - de-conflate its `skos:definition`: remove the "Distinguished from id:role-X,
     which is this repo's own concrete authoring agent … separate nodes" clause
     (the thing it distinguished from is gone). Fold the absorbed work into the
     archetype's own examples (e.g. "…an authored ontology individual…"; "a
     concrete authoring agent … is an instance of it"). Keep it domain-neutral.
   - add only the deleted role's EXECUTION tool to `roleTool` (+`id:tool-shell`)
     so the construction agent's action scope isn't narrowed. Keep survivor's own.
   - **do NOT copy the deleted role's governance guardrails** onto the neutral
     archetype (here `gr-reuse-first`/`gr-controlled-vocabulary`) — that pollutes
     it. They were already bound at HARNESS level (`h-multiagent hasGuardrail`),
     so deleting the role keeps them reachable. Verify with grep on the carrier.
3. **Rebind the operating Agent node, keep its identity.** `agent-X` node:
   `ho:agentRole` → survivor archetype; update its prose ("compiled from the X
   role" → "instantiating the neutral <archetype> role archetype"). **KEEP the
   Agent node id AND prefLabel** (operating identity is separate from the role).
   Its observation/function/capacity stay.
4. **Cross-refs = REPLACE, with a dup guard** (OPPOSITE default from the
   specializes-child merge, where the parent did NOT belong so refs were REMOVEd).
   Here the survivor legitimately occupies the SAME contexts the concrete worker
   did (dispatch worker → construction worker): every `stepByRole` /
   `observesComponent` / `channelParticipant` / `hasRole` that named the deleted
   role → survivor. EXCEPT any list where the survivor is ALREADY present →
   REMOVE the deleted token only (no dup add). Check each list before editing.
5. **Prose headers / taxonomy overview**: drop the deleted node from group
   enumerations ("six roles"→"five", "other four"→"other three"), and resolve the
   concrete↔neutral ambiguity the merge exposes: state that the operating ho:Agent
   nodes INSTANTIATE neutral archetypes (agent-developer↔role-implementer) rather
   than being separate concrete twins. Mark which roles are truly operation-only
   (orchestrator/inspection) vs neutral-and-reused (research/vnv/design/synth).
6. **Do NOT leave the deleted IRI token in comments.** Reword historical notes to
   "the former concrete authoring role" — a lingering `role-X` in a comment fails
   the grep-0 check and reads as a dangling ref to the next auditor.

## Follow-up: hasRole layer-consistency (GAP-1) + grep-0 scope caveat
- **agent bound but role missing from hasRole = layer inconsistency.** After a
  merge/promote, a role can be bound as `hasAgent` (agent-synthesizer on
  h-multiagent) yet absent from that harness's `hasRole` list — the operating
  layer knows it but the role layer doesn't. Fix is **additive**: add the role
  IRI to `hasRole` (emit change = +1 role row on that harness only, intended).
  A role can be **dual-bound** (in two harnesses' hasRole) — like
  research/design/vnv/synthesizer, which sit in a home group yet are also on
  id:h-workspace-synthesis. Update the TAXONOMY group header's CARRIER line to
  name BOTH carriers when you dual-bind (comment-only, graph unchanged).
- **grep-0 caveat.** A brief's "grep deleted-node → 0 in docs/" can be wrong:
  historical audit records (`docs/verify|plans|feedback`) LEGITIMATELY name the
  deleted node (they document the deletion) and recipe-LOCAL twins
  (`.../id/<recipe>/role-X`) genuinely still exist. Only the LIVE illustration
  refs (materialize.py role_slug docstring, materialize-design.md emission
  example) are actionable stale tokens. Fix only your assigned files; report the
  rest as legitimate-history, don't rewrite others' audit trail.

## Verify
- `grep -rn "role-X" ontology/` → 0 (comments included).
- recipe repos grep → 0 (recipe-local twins don't specialize central → unaffected).
- absorbed governance still reachable on the carrier harness (grep the guardrails).
- `/usr/bin/python3 tools/validate.py` → PASS; individual count −1.
- retrieve smoke on the archetype's function → survivor is top hit and edges show
  the rebinds (`agent-X —[agentRole]→ archetype`, `chan-* —[channelParticipant]→`).
