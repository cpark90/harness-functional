# Merging a `ho:specializes` child role back into its parent (un-specialize / consolidate)

Scenario: an ontology-vs-architecture mismatch where a dispatch-invoked worker
node (`role-inspection-worker`, `ho:specializes id:role-inspection`) has no real
counterpart in the running architecture — inspection does investigation itself in
its own session, no separate worker. Fix = delete child, parent absorbs function.

## Recipe (reusable)
1. **Delete the child node block entirely.** Its `ho:specializes <parent>` edge
   disappears with it — no separate edge cleanup. Child had no Agent node / recipe
   refs, so only ABox individual + its inbound refs matter.
2. **Parent absorbs the function**, minimally and in-character:
   - expand `skos:definition` (English — it is searched graph data) to name the
     absorbed capability, but KEEP the parent's own nature (here: stay user-facing
     / own-session; do NOT turn it into dispatch-invoked).
   - add only the tools the function needs (`+id:tool-retriever`); keep existing.
   - **do NOT copy the child's guardrails.** `gr-dispatch-execution` in particular
     is wrong for a non-dispatched role — absorbing a function ≠ inheriting the
     child's dispatch semantics.
3. **The 4 cross-refs = REMOVE, not replace.** Every `channelParticipant` /
   `hasRole` that pointed at the child gets the child token dropped. Do NOT
   substitute the parent by reflex — check each site's semantics:
   - `h-multiagent hasRole`: parent already listed → just drop child (no dup).
   - `h-workspace-synthesis hasRole` / `chan-dispatch` / `chan-workspace`: parent
     does NOT belong there (user-facing inspection is not a dispatch/workspace/
     synthesis-worker participant) → drop child, add nothing. The archetype roles
     (research/design/analyst…) already cover those contexts.
4. **Reconcile prose headers.** Any taxonomy overview / group header that
   *enumerates* the removed node must be updated (A-group list, "seven roles"→
   "six", "other five"→"other four"). Group structure & unrelated comments stay.

## Verify
- `grep -rn "<child-iri>" ontology/` → 0 (no dangling; grep exit 1 = clean).
- `/usr/bin/python3 tools/validate.py` → PASS (reachability: every dropped ref
  resolved, no new orphan; parent still reachable via its retained bindings).
- retrieve smoke on the parent's new function to confirm it now hits with the
  absorbed capability in its definition.
