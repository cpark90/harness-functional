# Oversight pair — role-benchmarker + role-auditor (+cap-benchmarking/cap-audit, c-oversight)

Central neutral parts for an oversight harness pair (external benchmarking critic + internal
compliance auditor). 5 new individuals, all user-approved mint (not drift).

## What/where (4 abox files only)
- `spec/capabilities.ttl`: `cap-benchmarking` "Comparative benchmarking", `cap-audit` "Compliance
  audit". Single-line cap format (prefLabel;definition). ★caps carry NO ho:tagged and NO
  tokenEstimate — existing cap-* convention; reachable purely via role providesCapability.
- `organization/roles.ttl`: `role-benchmarker`/`role-auditor` as group-C-style siblings (after
  role-curator, before section D), own intro comment. Format = role-synthesizer (has
  providesCapability): prefLabel/altLabel, definition, roleTool, roleGuardrail, providesCapability,
  tagged, roleMemoryPolicy, maturity "draft". ★NO tokenEstimate/salience (Role class carries none;
  local sibling uniformity beats brief's generic "tokenEstimate 필수" — same call as role-curator).
- `vocab/concepts.ttl`: `c-oversight` "Oversight", `topConceptOf id:scheme` + `skos:related
  c-traceability` (richer wiring, like c-autonomy related c-safety).
- `wholes/harnesses.ttl`: append both roles to `h-workspace-synthesis` hasRole ONLY (central
  archetype library carrier). ★do NOT edit that harness's definition prose (emitted → byte change
  beyond intended +2 role rows; orchestrator's call, same as B24 curator GAP).

## Anti-orphan wiring
- roles → h-workspace-synthesis hasRole (reachable). caps → role providesCapability (reachable).
  c-oversight → topConceptOf scheme + tagged by both roles. All 5 reachable, 0 orphan.

## Discriminators (all hold — 5-way, no near-synonym collapse)
- benchmarker vs research (GATHER only, no compare/claim) / analyst (judges GIVEN material vs
  criteria; benchmarker sources own external comparators, judges vs external best-practice) /
  synthesizer (merges deliverables, not critique-vs-reference).
- auditor vs vnv (pass/fail on composition OUTPUT; auditor audits charter-conformant OPERATION over
  time) / inspection (this repo's user-facing feedback+git) / analyst (diagnoses given material;
  auditor continuously polices op/output vs governance standard).
- roleTool = least-privilege slice of what the work needs: benchmarker=websearch+retriever (surveys
  external), auditor=retriever+shell (reads graph + runs checks). roleGuardrail: benchmarker adds
  grounding+cite (evidence-backed claims), auditor adds traceability+no-arbitrary-decision (findings,
  escalate not decide).

## Gates (this session, executed)
- validate.py PASS (reachability all 250, 0 orphan; capabilities ✓; registryDrift ✓ — Role/Capability/
  Concept already in INSTANCE_CLASSES, no registry edit needed). lint_uniformity PASS (prefix
  cap-/role-/c- ✓, §1d English ✓, maturity ✓). check_determinism PASS.
- delta = +5 exactly: `git stash push -- ontology/` → validate reachable 245, pop → 250.
- diff --stat = the 4 abox files only.
