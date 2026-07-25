# Mass-import Wave A (dev/infra): 17-mobile-app-builder / 18-api-designer / 28-security-audit

Filled the importer's judgment FLAGS on 3 harness-100 recipes (draft→judgment edges→
federate). Reusable per-recipe decisions + the reusable rules behind them.

## The judgment-binding recipe (what to add on each importer draft)
Importer emits everything EXCEPT: targetsDomain+addressesTask (the only 2 HarnessShape
violations), usesTool/roleTool, hasGuardrail/roleGuardrail, requiresCapability, tagged+
local Concepts, appliesPattern/hasChannel, usesModel, QA-gate collapse. Fill all:
- **Concepts**: 2-3 recipe-local `id:c-*` rooted `skos:broader` on a central concept
  (core:c-softeng dominant for dev/infra; core:c-design for UX). Tag harness + each role.
- **Guardrail set** (harness-level, universal): gr-lang, gr-structured-output,
  gr-least-privilege, gr-report-over-prompt, gr-graceful-fallback. Per-role roleGuardrail
  = worker subset {least-privilege, structured-output, graceful-fallback, lang}.
- **Pattern/Channel** (universal for orchestrator-workers corpus): pat-orchestrator-workers
  + pat-peer-mesh; chan-workspace + chan-peer + chan-agent-user. Model: mc-opus.
- **Capability triple** (doc-producing, editor-only): cap-fileedit + cap-orchestration +
  cap-synthesis. Add cap-codeexec ONLY if a role genuinely runs code.

## ★ Least-privilege = read the skill's OUT-OF-SCOPE line, not the role verbs
The corpus has NO `tools:` frontmatter. Default to **tool-editor only** (cap-fileedit).
Bind tool-shell / cap-codeexec ONLY when execution is IN scope. All 3 Wave-A skills
explicitly put execution OUT of scope ("build/compile/CI", "server implementation",
"penetration-test execution ... out of scope") → editor-only, NO shell, NO cap-codeexec.
(Contrast sibling 16-fullstack: backend/devops/qa DO run → shell+codeexec. The scope
line, not the job title, decides.)

## ★ QA-gate collapse decision (promote-once) — per recipe, from the DAG role
Terminal QA role → EITHER collapse to central core:role-synthesizer (drop its local
persona+role, add core:role-synthesizer to hasRole; it provides cap-synthesis) OR keep
local + attach `ho:providesCapability core:cap-synthesis`. Rule:
- **PURE cross-validation/convergence gate** (no production, no execution) → COLLAPSE
  (mirrors pilot 21). 18 review-auditor & 28 audit-reviewer = pure gates → collapsed.
- **Testing/hybrid worker** (runs tests, has own tool scope) → KEEP LOCAL +
  providesCapability (mirrors pilot 16, whose reuse would erase qa's shell scope). 17
  qa-engineer does UI/perf/a11y/security/compat testing → kept LOCAL + providesCapability
  cap-synthesis.
Collapse mechanics: replace the persona block and role block with a `# NOTE:...collapsed`
comment (keeps line context), remove from harness hasSystemPrompt+hasRole, add
core:role-synthesizer to hasRole. Materialize then emits agents/synthesizer.md.

## Domain/Task reuse vs local (Wave-A calls)
- 17-mobile + 18-api → REUSE core:dom-coding + core:task-architecture (task-architecture =
  "define a system's structure/components/interfaces"; both are software builds, and
  sibling 16-fullstack set the same pair — consistency + no core pollution).
- 28-security → LOCAL id:dom-security + id:task-security-audit (auditing spans code/deps/
  infra/pentest; no central domain or task fits). Domain local prefLabel must be unique
  among ho:Domain in the recipe closure (central: Software coding/Research/Customer
  support/Design engineering) — "Security assessment" is clear.

## Local FailurePolicy authoring (the FAILURE-LOCAL flags)
Importer binds central `core:fp-*` archetypes and FLAGS domain-specific rows as local
candidates (does NOT author them). Author each flagged row as `id:fp-*` with ≥1
failureCondition + ≥1 recoveryStrategy + prefLabel + tokenEstimate; add to harness
hasFailurePolicy alongside the central ones. 17: platform-unspecified / no-backend-api /
framework-incompatible. 18: rest-graphql-undecided / schema-parse-failure.

## ★ 28-security-audit = MANGLED source (the Wave-A exception)
Upstream find-replace corruption ("inthisbefore"/"countlower"/"of scope") degrades
promptText + definitions, and the orchestrator skill has NO `## Test Scenarios` / `##
Error Handling` → importer flags SCENARIO/FAILURE-MISSING. Handling:
- Structure is SOUND (5 roles, 4 skills, personas) → import + bind judgment edges normally.
- Run-behaviour axes LEFT UNBOUND + an explicit accepted-reason comment block
  (group-B discipline: fabrication worse than under-reflection). Do NOT invent scenarios.
- Degraded prose KEPT VERBATIM at maturity "draft" + a SOURCE-QUALITY NOTE header
  (rewriting source prose is fabrication; re-run importer after upstream repair).

## Gate results (all green)
per-recipe closure validate PASS ×3 (HARNESS_ROOT_ONTOLOGY = recipe IRI, shared catalog).
gen_recipe_catalog.py → 11 recipes (was 8), --check in-sync. materialize ×3 + 2-run
diff=0. grep /home/cpark = 0, no bare abs-path literals. Central validate PASS @223
(unchanged). Central 7-harness materialize byte-identical WITH vs WITHOUT recipe catalog —
in fact even harness.lock.json is identical (recipes owl:import central, not vice versa,
so the central closure is entirely unperturbed; no slug preemption).
