# D1 — promote-once neutral FailurePolicy `fp-refer-to-expert`

Central 6th fp archetype, promoted from 6+ near-identical recipe-local fps across the
mass import (75-tax, F fp-regulation-ambiguous, 87 legal-judgment, 95 legal-review, 96
tax-legal). Neutral pattern = "request beyond agent's competence/authority → deliver a
bounded analysis + refer decision to a qualified expert/authority".

## Where / how
- Node `id:fp-refer-to-expert` in `core/verification/verification.ttl`, appended AFTER the
  fp-conflict-contradiction (the 5-archetype block). Same local shape: prefLabel /
  definition(with "Distinguished from") / failureCondition / recoveryStrategy /
  tokenEstimate / maturity draft. No new class/prop (reused ho:FailurePolicy).
- Discriminator wording that keeps the set non-overlapping: vs `fp-insufficient-input`
  the input SUFFICES but the DECISION is out of remit (thin-input would be fixed by MORE
  input); vs `fp-conflict-contradiction` it's a limit of authority, not two clashing
  deliverables. State both explicitly or SHACL passes but retrieve returns near-synonyms.
- Wiring = carrier `core:h-workspace-synthesis` `ho:hasFailurePolicy` (already hosts the 5
  archetypes). FailurePolicy reaches graph ONLY via `ho:hasFailurePolicy` (Harness-direct
  sub of hasComponent); concept tags don't rescue it → MUST bind to the carrier host.

## Byte-identity outcome (verified)
- Carrier host is the ONLY intended-mutable central harness: its CLAUDE.md gains exactly
  ONE error-handling row, MANIFEST +1 FailurePolicy entry, harness tokenEstimate +150
  (== the node's own ho:tokenEstimate — the emitter sums bound components' estimates).
- Other 6 central harnesses (h-multiagent/coding/peer-mesh/harness-factory/research/support)
  materialize byte-identical. Adding a member to a library carrier is exactly the "central
  growth without disturbing h-multiagent" pattern (central-library-growth-host-harness).
- Individual count 225→226. validate/determinism PASS.

## GAP (not done, deferred by brief)
Published recipes still carry their LOCAL dup fps (75/F/87/95/96). Re-binding them to
`core:fp-refer-to-expert` by IRI was OUT OF SCOPE (federation ripple across draft recipes)
— follow-up cleanup item. This wave only ADDED the central archetype for future reuse.
