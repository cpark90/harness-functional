# Mode-independent invariant guardrail + coordination-only role

`gr-execution-separation` ("Separated plan and execution"): mode-independent generalization
of the two orchestrator-specific separation guardrails (`gr-dispatch-execution` c-dispatch /
`gr-delegated-orchestration` c-delegation). Kept those two UNCHANGED (they are the
orchestrator-workers specializations); authored the general one as a NEW node — no near-synonym
edit. Tagged the general PARENT concept `c-multiagent` (sits above c-dispatch/c-delegation), no
new concept needed (avoids drift). Guardrail local convention: promptText + tagged + tokenEstimate
+ maturity, NO definition/prefLabel-def.

## Wiring a shared guardrail into N harnesses without regressing byte-identity
- Adding a guardrail IRI to a harness `hasGuardrail` list → materialized operating-rules gains
  EXACTLY one bullet (the guardrail promptText). Insert position in the TTL list is irrelevant to
  the emitted set — verified all 4 multi-agent harnesses got `+1` line, others unchanged.
- Single-agent harnesses NOT in the wiring stay CLAUDE.md byte-identical. The ONLY diff is
  MANIFEST.json `individualCount` (union-wide counter, 223→225 for +2 individuals) — same class as
  the documented lock.json individualCount exclusion, NOT a content regression. Confirm CLAUDE.md
  itself is identical via `diff` (filter out manifest/lock).

## role-coordinator (coordination-only peer, hosted by h-peer-mesh)
- Peer that plans/sequences/checks-status but does NOT execute. No `roleTool` (like
  role-orchestrator) reinforces "does not execute". `roleGuardrail` = gr-execution-separation +
  gr-least-privilege + gr-verify-proceed.
- roleGuardrail is NOT required to be ⊆ harness.hasGuardrail (h-workspace-synthesis binds
  role-analyst whose roleGuardrail gr-dispatch-execution/grounding are NOT in its hasGuardrail — no
  shape enforces it). So role guardrail choice is free; it only renders in that role's own
  `.claude/agents/<role>.md` + a roles-section bullet, not operating-rules.
- Adding hasRole to a harness → new `.claude/agents/<slug>.md` file + one roles-section bullet
  (intended feature change, orthogonal to the operating-rules +1).
- Disambiguation (ONTOLOGYSTYLE): definition names both nearest roles with "Distinguished from
  id:role-orchestrator (central-dispatch lead, not peer) ... and from id:role-planner (worker whose
  deliverable IS a plan doc)". IRI refs resolve to prefLabel at emit.

## ExecutionMode definition augment
- Editing `mode-agent-teams` skos:definition only affects harnesses with that mode (only
  h-peer-mesh) → its execution-mode section changes (intended). Bumped tokenEstimate 125→190 for
  the added ~65-token clause. id:gr-execution-separation inside the def resolves to "(Separated plan
  and execution)" in emitted text.
