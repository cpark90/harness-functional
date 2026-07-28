# Wave-15 recipe→archetype `ho:specializes` (B17/B24 continuation, role-only import)

15 freshly-imported recipes (20/23/24/25/27/36/38/41/42/47/52/63/64/67/88, harness-recipes repo,
all untracked `??` new dirs). Same additive `ho:specializes core:role-*` linking as B17/B24. Result:
**62 edges, 74 roles, 12 disciplined SKIPs**. Histogram: implementer 15 / design 11 / synthesizer 10 /
analyst 9 / planner 4 / author 4 / tester 3 / strategist 2 / research 2 / curator 2 / coordinator 0.

## ★role-only import ⇒ NO FailurePolicy to link (brief's fp half was moot)
These import-only recipes carry roles only — **zero `a ho:FailurePolicy` individuals** (the `id:fp-*`
grep hits are importer COMMENTS flagging local-fp authoring candidates, not triples). So the brief's
"link recipe fp→core:fp-* + B23-no-negation-clause" step had nothing to act on. B23 contradiction
(specializes core:fp-* co-existing with "no central archetype covers") is structurally impossible here.
Also 0 `providesCapability` in the wave → no cap-synthesis flag to lean on; judged purely by def prose.

## ★insertion-script trap I actually hit: target IRI needs `role-` prefix
Central archetype is `core:role-tester`, NOT `core:tester`. My first pass wrote `"tester"` as the map
value → emitted `ho:specializes core:tester ;` (dangling, would have silently passed SpecializesTyping
because an UNTYPED target doesn't fire the shape — a false PASS). Caught by placement-sanity grep.
RULE: map values must be the FULL `role-X` slug, and PROVE resolution (target typed ho:Role in closure),
not just "validate PASS" — an unresolved specializes target yields no violation yet no real link.

## Adjudication rules refined this wave (synthesizer is NOW a valid target, unlike B17)
- **`-reviewer (QA)` / QA-coordinator → synthesizer.** Def "Cross-validates consistency ACROSS
  [all the other worker stages]" = terminal convergence gate (central role-synthesizer: "cross-checks
  every worker's deliverable ... compiles into one coherent final result"). 9 reviewers + 63's
  research-coordinator (named coordinator but QA gate that "produces the final report" → synthesizer,
  NOT coordinator which performs NO execution/output).
- **dialog-tester(38) → synthesizer, NOT tester.** It "Performs testing ... Serves as THE quality gate"
  = PASSES JUDGMENT across persona+conversation+performance. role-tester is explicitly "instead of
  passing judgment" → a gate that judges is never tester. The judging terminal gate = synthesizer.
- **tester = produces checks that a LATER gate runs** (unit-tester/integration-tester/eval-specialist:
  writes test cases/benchmarks/regression tests, no verdict). eval-specialist(41) "Builds benchmarks,
  A/B, regression tests" → tester (builds acceptance material), not analyst.
- **curator = organise EXISTING material into a catalogue/inventory** (librarian, no value-prose):
  reference-manager(63, bibliography mgmt/format/dedup = B24 terminology-manager precedent) +
  knowledge-collector(64, builds knowledge INVENTORY of existing org knowledge). Distinguished from
  research (GATHERS NEW external material grounded in source: literature-searcher(63), timeline-
  reconstructor(25) "collects events + grounds in source").
- **design vs analyst tension on `-analyst`-named modelers → SKIP** when no explicit "designs" verb.
  domain-analyst(23, "analyzes/derives domain model") + bsc-analyst(47, borderline) SKIPPED; but
  service-architect/communication-designer/okr-designer kept design (explicit "design expert/designs").
- **implementer = built code/config/infra/prompt/tuned-setup** even when named "-architect" if def says
  "implements/builds/code creation" (rag-architect(41) "designs AND implements the full pipeline";
  etl-architect(27, mangled, "code creation")). prompt-engineer(41)→implementer (prompt IS the tuned artifact).
- **strategist = frame response options + recommend** (avoid/transfer/mitigate/accept): response-
  strategist(88), strategy-architect(52). **planner = the plan itself**: remediation-planner(25/67),
  maintenance-planner(64), monitoring-planner(88).

## 12 disciplined SKIPs (anti-drift FIRST — no clean primary DELIVERABLE)
monitoring/observability roles (20/23/27) = design-vs-ops-config hybrid ("dashboard" keyword ≠ the
deliverable). test-strategist(24)=strategy/plan/design. data-quality-manager(27,mangled). swot-
specialist(47)=analyst/strategist (SWOT-analysis vs TOWS-strategies, B17 tradeoff-evaluator precedent).
critic-synthesizer(63)=analyst/author/synthesis multi. note-taker(63)=research/curator (extracts+
structures but neither gathers-new nor selects-by-value). law-mapper(67)=research/analyst mapper (B24
mapper-skip precedent). risk-identifier(88)=generative enumeration, no archetype fits. domain-analyst
+ bsc-analyst(23/47)=analyst/design.

## Gates (all executed, evidence)
- 15/15 recipe closures `validate.py` PASS, **SpecializesTyping 0 violations** (central symlink
  `harness-recipes/central -> harness_ontology`, `HARNESS_CATALOG=recipes/catalog-v001.xml`,
  `HARNESS_ROOT_ONTOLOGY=recipes/<r>` per recipe, then `rm central`).
- Resolution PROVEN via rdflib on 6 sample edges: subject+target both typed ho:Role (same partition).
- Non-emit PROVEN: 36-design-system materialize WITH vs `grep -v "ho:specializes core:"` stripped copy
  → `diff -r` incl. harness.lock.json = BYTE-IDENTICAL. `grep -c specializes materialize.py` = 0.
- git status: 15 recipe dirs stay `??` (whole-dir untracked; my edits are TTL-only within them).
  `M catalog-v001.xml / contract-demo / lpranging` were ALREADY modified at session start (other
  in-flight lanes) — NOT touched by me.
