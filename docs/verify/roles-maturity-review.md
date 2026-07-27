# Verdict — Role draft→reviewed promotion eligibility (roles.ttl)

**Scope**: 8 `ho:maturity "draft"` roles in `ontology/abox/core/organization/roles.ttl` —
C. neutral worker archetypes (`role-analyst`, `role-author`, `role-implementer`,
`role-planner`, `role-strategist`, `role-tester`, `role-curator`) + D. peer
(`role-coordinator`). vnv judges only; no ontology edit.

## Reproduce (commands actually run)

- `/usr/bin/python3 tools/validate.py` → **PASS** (238 individuals, all reachable,
  capabilities satisfied, no duplicate labels). Baseline graph is green, so every
  draft role is already connected, well-typed, wiring-resolved (no dangling
  roleTool/roleGuardrail/tagged); the maturity call is the only open axis.
- Corpus recurrence (committed, not phantom — recipe repo `git status` clean,
  `HEAD` counts == working-tree counts, per B24 anti-phantom lesson):
  `cd /home/cpark/git/harness-recipes && git grep -hoE 'specializes core:role-[a-z-]*' HEAD -- '*.ttl' | sort | uniq -c`
- Discoverability: `/usr/bin/python3 tools/retrieve.py "examine deliverable against criteria and report issues ranked by severity" --format json` → `role-analyst` returns as TOP node (relevance 7.2).
- Ripple: `grep -rn maturity tools/retrieve.py tools/materialize.py tools/ontology_lib.py` (see §Ripple).

## Corpus recurrence (committed `ho:specializes` edges in recipe repo)

| archetype | edges | reviewed peer floor |
|---|---|---|
| role-analyst | **29** | — |
| role-author | **22** | — |
| **role-design** | 16 | *(already reviewed)* |
| role-implementer | **11** | == synthesizer(11) |
| **role-synthesizer** | 11 | *(already reviewed)* |
| role-strategist | **8** | > research(7) |
| **role-research** | 7 | *(already reviewed — weakest reviewed floor)* |
| role-tester | 3 | below floor |
| role-planner | 2 | below floor |
| role-curator | 2 | below floor |
| role-coordinator | **0** | not specialised by any recipe |

**Calibration**: the already-`reviewed` neutral archetypes establish the empirical
bar — the weakest is `role-research` at **7** edges (`synthesizer` 11, `design` 16).
(The reviewed *concrete* agents orchestrator/developer/vnv/inspection are reviewed on
a different basis — they are this repo's own self-evident agents, not corpus recurrence.)
I use recurrence ≥ 7 (matching the weakest reviewed archetype peer), combined with a
complete self-standing definition + uniform sibling wiring, as the promote bar.

## Per-role verdict

| role | verdict | core rationale |
|---|---|---|
| **role-analyst** | **promote → reviewed** | 29 edges (highest of all archetypes, 4× the reviewed floor). Two-way discriminator (vs research=GATHERS, vs vnv=harness-output/verdict) holds. Returns TOP for its own query (rel 7.2). Wiring uniform (tool-editor; gr-dispatch-execution/least-privilege/grounding/structured-output; c-multiagent). |
| **role-author** | **promote → reviewed** | 22 edges (3× floor). Discriminator vs synthesizer (producer-of-one-deliverable vs terminal convergence gate) is sharp. Uniform wiring (+c-structured-output tag, gr-cite — resolves, no dangling). |
| **role-implementer** | **promote → reviewed** | 11 edges (== reviewed synthesizer). Discriminator vs role-developer (repo's own concrete authoring agent vs domain-independent construction archetype) is explicit and non-collapsing. Uniform wiring. |
| **role-strategist** | **promote → reviewed** | 8 edges (> research floor of 7). Two-way discriminator (vs planner=sequences already-decided work, vs analyst=what's wrong not which way) holds. Uniform wiring. |
| **role-tester** | **keep-draft** | Only 3 edges AND the node self-declares `ho:salience 0.25` with def text "recurs in only a small share of observed teams… bind only when genuinely a deliverable of its own." Def quality is fine (discriminator vs vnv=CONSUMES/verdict), but the author's own low-salience signal is an explicit keep-draft flag; promoting would contradict its stated conditional-use posture. |
| **role-planner** | **keep-draft** | 2 edges — below the reviewed floor. Def and one-way discriminator vs orchestrator are adequate, but empirical recurrence is thin and it sits adjacent to two planning roles (orchestrator/coordinator); needs more corpus evidence before "reviewed." |
| **role-curator** | **keep-draft** | 2 edges. Definition is high-quality (thorough 3-way discriminator vs research/author/analyst, consistent with the B24 anti-drift adjudication that landed it as a *distinct deliverable-type*). But B24 deliberately landed it at draft and recurrence remains at the floor-minimum 2; conservative call is keep-draft on empirical grounds until more recipes specialise it. No conflict with the B24 ledger — this is a maturity call, not a re-adjudication of its distinctness. |
| **role-coordinator** | **keep-draft** | **0** recipe specializations — no corpus recurrence at all. It is wired only to the single central template `id:h-peer-mesh` (`hasRole`, reachable — wiring OK, def two-way discriminator vs orchestrator/planner is clear). But "reviewed" = post-authoring review passed on an established part; with zero external recurrence and a single carrier, the empirical basis for promotion is not yet there. |

**Summary: 4 promote (analyst, author, implementer, strategist) / 4 keep-draft
(tester, planner, curator, coordinator).** No blanket flip — each turned on its own
recurrence + discriminator evidence.

## Anti-drift / wiring checks (all clean)

- `validate.py` "no duplicate labels within a class" ✓ — no prefLabel collision among
  roles, so promoting the 4 introduces no near-synonym drift.
- Every draft role's roleTool/roleGuardrail/tagged/roleMemoryPolicy is class-uniform
  with the 6 reviewed archetype siblings; reachability PASS ⇒ no dangling edges.
- Each promoted def carries a standing "Distinguished from id:role-X…" clause that
  the recurrence + query evidence confirms actually separates it from its nearest
  neighbour. No conflict with the B24 re-adjudication ledger.

## Ripple — does draft→reviewed change retrieve ranking or materialize emit?

`grep -rn maturity tools/{retrieve,materialize,ontology_lib}.py`:

- **materialize.py / ontology_lib.py**: **zero** maturity references — materialize emit
  (rendered harness docs / MANIFEST) does **not** read maturity at all. **No emit-byte
  change** from promotion.
- **retrieve.py**: maturity is used in exactly two ways.
  1. **Ranking** (`lifecycle_factor`, line 107-118): **only** `"deprecated"` is demoted
     (`DEPRECATED_RANK_FACTOR`); *every other value and absence is neutral (1.0)*.
     draft→reviewed is 1.0→1.0 — **search ranking / ordering is unchanged**.
  2. **Pack field** (line 237 `"maturity": maturity_of(g,n)`; badge line 331 only for
     `deprecated`): the JSON pack's `maturity` field literal flips `"draft"`→`"reviewed"`.
     This is a **cosmetic value reflection**, not a rank/badge change (verified: analyst
     currently emits `maturity: draft` in the pack while already scoring TOP at 7.2).

**Ripple conclusion**: promotion is **rank-neutral and emit-byte-neutral**. The only
observable delta is the literal `maturity` value shown in the retrieve JSON pack for the
4 promoted nodes — an intended metadata reflection, not a projection/ranking behaviour
change. When developer applies it, the TTL diff is 4 single-token literal edits
(`"draft"`→`"reviewed"`) and is an **intended change**, but no downstream retrieve-order
or materialize-byte regression should be expected. (Standard post-apply gate:
`validate.py` PASS still holds — maturity value is unconstrained by any shape.)

## Routing

Promote-4 is a per-node literal edit routed to **orchestrator → developer dispatch**
(byte-identity does not apply — intended metadata change on 4 nodes). Keep-draft-4 need
no action. No design/schema issue → no inspection ripple lane needed.
