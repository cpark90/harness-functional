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
- ★STATUS (corrected 2026-07-25): the recipe half below was **NOT landed** in the earlier B24 pass —
  harness-recipes HEAD `d4cfd82` had the 4 axis targets at **0/0/0/0** (independent re-verify). Only
  the central `role-curator` node had actually landed. The recipe edges were **authored for real this
  session** (harness-recipes working tree, pre-commit; commit is inspection's job). Below matches what
  was inserted; the histogram/gates in "Gates" are the real re-run.
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

## Gates (recipe-edge re-run 2026-07-25, actually executed)
- central `role-curator` present in working tree (roles.ttl L198, prefLabel "Curator agent"); central
  `validate.py` 238 was the earlier central pass (unchanged this session — central untouched here).
- ★36 edges inserted across 25 recipe TTLs via block-scoped insert (guard on subject-block, not file).
  Histogram of NEW targets = **role-research 7 / role-design 16 / role-synthesizer 11 / role-curator 2**
  (grep -oP over recipes/*.ttl), exactly the plan.
- **25 recipe closures** all `validate.py` PASS, **SpecializesTypingShape 0 violations** (Role→Role
  same-partition). Ran from central tools with a scratch **absolute-path catalog** (central/→
  harness_ontology abspath, recipes/→harness-recipes abspath) + `HARNESS_ROOT_ONTOLOGY=<recipe IRI>`;
  the recipe repo's own `./central/` checkout was ABSENT, hence the abs-catalog trick.
- curator resolution PROVEN in 03/14 closures: `core:role-curator` typed ho:Role+ho:HarnessComponent,
  `id:role-curator ho:specializes core:role-curator` present (edge resolves to the real central node).
- byte-identity PROVEN by strip-test: recipe 09 materialize (5 edges) vs `grep -v specializes` copy
  (via patched catalog) → `diff -r` IDENTICAL → specializes NOT emitted (`grep -c specializes
  materialize.py` = 0). Disciplined SKIPs (patent-mapper/classifier/media-monitor/meal-designer/
  vendor-comparator/presenter/pitch-creator/comic-editor/mvp-architect) verified 0 edges each.

## ★LESSON — "landed" ≠ authored; back it with a hash or a re-run
- The recipe half of this note previously READ as done ("36 edges … strip-test PASS … 8 closures")
  but HEAD `d4cfd82` showed 0/0/0/0 — a **phantom claim** (memo written as if applied but never
  committed/verified against the tree). Same trap as `revfactory-p1` memory: don't trust "land됨".
- RULE: before recording "landed", (a) grep the actual target tree / HEAD for the artefact, and
  (b) cite the execution (histogram, closure PASS count, diff-r result) — not the intent. A memo
  that asserts a result must be reproducible from evidence in the same note.

## Follow-up — resection roles.ttl to EXPOSE the dual role (comment-only, 2026-07)
- roles.ttl Role partition was one flat "ROLES" section hiding a 4-group taxonomy:
  A=this-repo concrete agents (h-multiagent, reviewed: orchestrator/inspection user-facing +
  developer/research/inspection-worker/vnv/design), B=synthesizer convergence gate (h-multiagent,
  provides cap-synthesis), C=neutral archetypes (h-workspace-synthesis: analyst/author/implementer/
  planner/strategist/tester/curator), D=coordinator (h-peer-mesh). Nodes ALREADY emit A->B->C->D order.
- ★DUAL ROLE made explicit in comments only: role-research/role-design are group A yet domain-neutral,
  so they double as C's gather/design archetypes and are ALREADY bound to h-workspace-synthesis hasRole
  (harnesses.ttl L189-192 — verified). NO new node (anti-drift): note it, don't split.
- Method = add 4-group overview to top header + A/B section headers (C/D already existed, reprefixed
  A./B./C./D.). ★TRIPLE-INVARIANCE proof for comment-only edits: canonical-NT md5 over
  sorted(g.serialize(format='nt').splitlines()) identical before/after (a43cd56…), triples 255->255,
  and `git diff | grep '^[+-]' | grep -v '^[+-]\s*#'` empty. Stronger than 2-run materialize cmp,
  cheaper. validate PASS.

## GAP (report, not fixed)
- h-workspace-synthesis skos:definition still lists "(analyst, author, implementer, planner, strategist,
  tester)" without curator → minor prose/graph staleness. NOT edited: definition is emitted (overview/
  persona) so editing changes bytes beyond the intended +role row (orchestrator decision, like B17's stale fp defs).
