# B24 — missing role archetype (curator) + research/design/synthesis axis linking

Follow-on to B17 payoff. audit B24 flagged 4 "uncovered" axes (research/design/curation/synthesis).
Re-adjudication rule (anti-drift FIRST): most are ALREADY covered — only author a node when GENUINELY missing.

## ★4-axis re-adjudication (do this BEFORE authoring — 3 of 4 need NO new node)
- **research** → `core:role-research` already a NEUTRAL gather/research archetype (def "gathers and
  synthesises information … grounding each finding in its source"). It is this-repo's concrete agent
  but its def is domain-neutral → USE AS TARGET. Do NOT mint role-gatherer/investigator.
- **design** → `core:role-design` already the design archetype; altLabels "visual designer" /
  "instructional designer" broaden it to cover ux/curriculum/architecture/visual. USE AS TARGET.
- **synthesis** → `core:role-synthesizer` already the terminal-convergence archetype (provides
  cap-synthesis). USE AS TARGET.
- **curation** → NO existing role. gather=research, write=author, evaluate=analyst all miss
  "select/prioritise/organise EXISTING material". → **genuinely missing → author `role-curator`.**
- Net new = **1** (`role-curator`). Minting research/design/synthesis synonyms = the exact drift B24 warns of.

## role-curator authoring (matches the 6 draft worker archetypes exactly)
- Sibling in "Neutral worker archetypes" block of `organization/roles.ttl`, after role-tester.
- ★NO `ho:tokenEstimate` and NO `ho:salience`: the 6 sibling archetypes (analyst/author/…/tester)
  carry neither (Role has only definition, not text). Local consistency BEATS brief's "tokenEstimate
  필수" (central-vocab-gap memory §3). Adding it would break class uniformity.
- roleTool = `id:tool-editor` ONLY (the tool the carrier h-workspace-synthesis binds; all 6 siblings
  use only tool-editor). roleTool/roleGuardrail are plain ObjectProperties (NOT ⊑hasComponent) →
  "harness already binds" is a SOFT convention, not shape-enforced, so referencing gr-dispatch-execution
  etc. that the carrier doesn't hasGuardrail is fine (siblings already do it; those grs are wired elsewhere).
- definition = discriminating vs the 3 near-neighbours (research=GATHER, author=write PROSE,
  analyst=DIAGNOSE), each written with `id:role-X` tokens (emitter resolves to "Research agent" etc.).
- anti-orphan wiring = add `id:role-curator` to `core:h-workspace-synthesis` `hasRole` (the library
  carrier). This is the INTENDED byte change: carrier CLAUDE.md +1 role bullet, +curator.md agent,
  +MANIFEST entries. Other 6 central harnesses stay byte-identical (excl lock individualCount 237→238).

## Axis linking (extends B17, additive `ho:specializes`, not emitted)
- 36 edges added across recipes: research 7, design 16, synthesizer 11, curator 2. Discriminator =
  **primary DELIVERABLE**, not label:
  - research: -researcher/-searcher/-investigator/-collector/-market-researcher whose output is GATHERED
    material (search/investigate/collect). alternative-researcher counts (explore options via search).
  - design: architect/*-designer/ux-designer/storyboarder/story-architect/visualizer/diagram-maker/
    kpi(dashboard)-designer/evaluation-designer/interview(er/-designer)/curriculum/program/process-architect.
    ★discriminator vs synthesizer for *-architect: **cap-synthesis ABSENT + "Designs…" ⇒ design**;
    process-architect has a secondary cross-verify hat but no cap-synthesis → design (primary).
  - synthesizer: any role carrying `providesCapability core:cap-synthesis` OR def "terminal
    synthesis/convergence gate"/"cross-verifies across ALL". Also editor-in-chief (brief-named,
    terminal editorial gate, no cap) and adr-author (def "Synthesizes … cross-verifies consistency" =
    integrates+gate, NOT a plain author). offer-coordinator = terminal integrator (has cap).
  - curator: 03-curator (prefLabel "Curator", select+prioritise sources) + 14-terminology-manager
    (organise/maintain glossary = librarian). patent-mapper(100)/classifier(33) SKIPPED (classify/map
    = analyst/engine, not curation).
- **Disciplined SKIPs**: media-monitor(87) has cap-synthesis but def = monitoring/strategy, NOT a
  convergence gate → skip (def mismatch beats the cap flag). meal-designer(73)=plan/design ambiguity.
  vendor-comparator(95)=research/analyst tension. presenter(48)/pitch-creator(43)=author/design tension.
  comic-editor(07)=layout/editing tension. mvp-architect(43)=planner+design+strategist multi.

## ★insertion-script trap (cost me a redo)
Recipe role format = `id:role-X a ho:Role ; skos:prefLabel "…" ;` on ONE line, def on next. Anchor
insert on the prefLabel line. **Do NOT guard with `f'specializes {tgt}' in whole_file_text`**: when a
file has TWO roles mapping to the SAME target (e.g. 09 story-architect + interviewer → role-design),
the second falsely trips "already". Guard on the ROLE's own block (subject → next subject), not the file.

## Gates (all PASS)
- central `validate.py` 238 (237+curator), `check_determinism.py` PASS, `retrieve.py "a role that
  curates…"` → Curator agent rel 4.05 top hit + carrier hasRole shown.
- 8 recipe closures PASS, **SpecializesTypingShape 0 violations** (Role→Role same-partition).
- byte-identity PROVEN by strip-test: 6 central harnesses IDENTICAL (excl lock); h-workspace-synthesis
  = +row only; 2 linked recipes (with-edges vs `grep -v specializes` copy) IDENTICAL → specializes not
  emitted (`grep -c specializes materialize.py` = 0). Each recipe closure +1 node (role-curator) uniform.

## GAP (report, not fixed)
- h-workspace-synthesis skos:definition still lists "(analyst, author, implementer, planner, strategist,
  tester)" without curator → minor prose/graph staleness. NOT edited: definition is emitted (overview/
  persona) so editing changes bytes beyond the intended +role row (orchestrator decision, like B17's stale fp defs).
