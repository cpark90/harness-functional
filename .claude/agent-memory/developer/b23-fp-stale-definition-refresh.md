# B23 — recipe-local fp stale self-contradictory `skos:definition` refresh

Three recipe-local FailurePolicy defs (69-privacy/70-legal/72-regulatory, harness-recipes repo) each
`ho:specializes core:fp-refer-to-expert` yet their `skos:definition` still asserted "(no central
archetype covers …)" — a leftover from pre-D1 (before the central archetype existed). Edge correct,
**definition text stale/self-contradictory**. B23 rewrote ONLY the negative parenthetical:
`(no central archetype covers <X>)` → `(domain-specialisation of core:fp-refer-to-expert for <X>)`,
keeping the domain phrase (GDPR applicability / legal indeterminacy / requirement ambiguity) and the
"keeps … conservative/actionable rather than blocked" tail. Edge + failureCondition/recoveryStrategy
unchanged. tokenEstimate bumped +6 each (57→63, 55→61, 55→61) for the lengthened literal (anti-rot).

## Key mechanics / gotchas
- **skos:definition is NOT emitted by materialize.** The Error-handling table emits `ho:failureCondition`
  (col1) + `ho:recoveryStrategy` (col2) only. So the stale phrase never reached CLAUDE.md — the brief's
  premise that materialize would "purge" it was mistaken. Proof: revert-def-and-materialize vs
  edited-materialize `diff -r` (excl lock) = BYTE-IDENTICAL except MANIFEST aggregate `tokenEstimate`
  (the roll-up of my intentional +6 bumps). Pre-edit emitted tree "no central archetype" count = 0.
  → An fp definition-only edit is materialize-byte-neutral; the value is graph-truth + retrieve.
- **Corrected sweep gate (block-level, not file-level).** "specializes + 'no central archetype covers'
  co-occur in ONE fp RDF block". Do NOT grep at file level: **75-tax-calculator is a false positive** —
  it has both in-file but the phrase is a narrative COMMENT (line ~191), not a triple, and its fp
  definition is already clean. Authoritative check = rdflib: for every fp with
  `ho:specializes core:fp-refer-to-expert`, scan its Literal objects for the phrase → 0 violations
  across all 7 specializing fps. File-level grep would wrongly flag 75.
- **Scope discipline.** Phrase is in 18 recipes; only 3 are contradictions (specializes coexists).
  The other 15 have NO specializes edge → phrase is true/justified → DO NOT TOUCH (count preserved 15).
- **75 residual (REPORTED, not fixed — out of scope):** 75-tax-calculator has a stale narrative COMMENT
  "tax-domain graceful degradation no central archetype covers -> recipe-local" directly above an fp
  that DOES specialize fp-refer-to-expert = same class of contradiction as B23 but in a comment
  (non-emitted, not a triple). Left untouched (brief named exactly 69/70/72); flagged to orchestrator.

## Recipe closure validation (harness-recipes has no tools/, no `central/` link)
- Closure needs the central import resolved: catalog `central/` paths are relative to the catalog dir
  but **no `central/` link exists** in harness-recipes. Temporarily `ln -s <central-repo> central`,
  run central `tools/validate.py` with `HARNESS_CATALOG=<recipes>/catalog-v001.xml` +
  `HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<r>`, then `rm central`. Without the
  link: only 575 triples load (recipe alone), all core:* refs fail class shapes → false FAIL.
  Materialize: positional harness id (e.g. `h-privacy-engineer`), `--out <dir>`; same env + link.
