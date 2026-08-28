# Envelope render wave — companion sections without a new sectionKind

Brief: render OperatingEnvelope(+statements)/AutonomyTier/environmentFidelity into the
materialized CLAUDE.md; bind gr-envelope-check + fp-envelope-exit/-severe to the
declaring harnesses; gate = additions-only (byte-identity deliberately broken, approved).

## ★ ho:sectionKind is a CLOSED sh:in in shapes — developer cannot mint a section kind

`AssemblySectionShape` enumerates the 13 kinds; a new `ho:AssemblySection` individual with
a new kind hard-FAILs SHACL, and shapes are out of a developer's boundary even when the
brief says "AssemblySection 신설해도 된다" (the brief anticipated only the code-side
registry). In-boundary alternative that stays graph-coherent:
- hook the new content as **conditional flat `##` companion blocks at the end of an
  UNCONDITIONAL renderer** (`_render_operating_rules` — every harness has guardrails),
  each block `return`-guarded on its own predicate;
- update the positioning AssemblySection's `skos:definition` (in-boundary,
  assembly-sections.ttl) to document the cluster + the enum reason + "promotion to
  first-class kinds later = byte-identical refactor" — that sentence is what makes the
  deferral safe to pick up;
- AssemblySection definitions are NOT emitted → definition edit is CLAUDE.md-neutral,
  but its ho:tokenEstimate feeds the MANIFEST total of any harness that BINDS the
  section (only h-multiagent binds as-*; inheritors of the default set don't).

## Additions-only gate: report per FILE, not per harness

`diff -r` per harness shows removed=1 — that is always the MANIFEST `tokenEstimate`
total line (structurally unavoidable when a component is bound; component rows
themselves are pure additions). CLAUDE.md must show removed=0. Split the report:
CLAUDE.md removed/added vs MANIFEST removed/added, or the gate looks violated.

## Cross-section pointers must be enrolment-conditional

"on range exit: <fp labels> (see Error handling)" is only true when the harness itself
carries the rows via ho:hasFailurePolicy. A recipe (h-hil-approval) points onEnvelopeExit
at central rows it does NOT enrol → print the suffix only when
`all(exit in set(hasFailurePolicy))`. General rule: an emitted "see section X" must be
guarded by the same condition that makes section X's row exist in THIS document.

## Small conventions confirmed

- Closed datatype value needing a per-value gloss (envelopeDefault) = module dict +
  raise on unknown (select_candidate closed-policy precedent) — never a generic sentence.
- Statement table columns kept to load-bearing cells (attribute/verdict/boundary/
  observable); envelopeValueType+envelopeClosure excluded, decision recorded in the
  renderer docstring (error-handling 2-column precedent).
- EnvelopeRule render path written though no data exercises it (a declared rule must
  never silently miss the document — the exact bug class the wave fixed); flagged as
  untested-by-data in the code comment.
- Pre-existing dangling token `ho:tagged-style` (TBox prose, `-style` suffix trips the
  token regex) — not this wave's; verify pre-existence via `git archive HEAD | tar -x`
  scratch build before blaming an edit.
- onEnvelopeExit vs hasFailurePolicy non-duplication comment: "the envelope points,
  the catalog lists" (designation vs enrolment) — one comment at h-coding, short
  pointer at h-multiagent.
