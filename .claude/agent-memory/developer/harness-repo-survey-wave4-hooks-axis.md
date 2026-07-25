# Wave 4 / GAP-H: ho:Hook — lifecycle-trigger axis (new TBox class, one set)

The one confirmed schema gap of the harness-repo-survey (Wave 0): no vocabulary
category held a LIFECYCLE TRIGGER ("run X when event E fires"). Guardrail is an
always-on policy; WorkflowStep is an ordered deliberate step. Neither carries an
event-driven side-behaviour. Solved as ONE set exactly like execution-mode/GAP-4:
TBox class+props + shape + neutral individuals + AssemblySection + materialize
renderer + attribution, all in one pass.

## Placement judgment (BehavioralComponent, sibling of Guardrail — NOT Process)
`ho:Hook ⊑ ho:BehavioralComponent`. The discriminator: ProcessComponent's leaves
(Workflow/WorkflowStep/Deliverable) are the DELIBERATE, ordered task DAG the agent
executes (they carry ho:stepOrder, sit in the flow). A Hook is a STANDING rule
that fires REACTIVELY at a lifecycle boundary, OUTSIDE the step ordering — "at
event E, run action A" is Guardrail's ("always follow R") event-triggered cousin,
not a step. So it belongs with Guardrail under BehavioralComponent (pi_i). Wave 0
left this as the open decision; ProcessComponent was the tempting-but-wrong pick
("control-flow trigger"→procedure), rejected because a hook has no place in the
ordered flow. Must also EDIT `ho:BehavioralComponent`'s definition to enumerate
the new leaf (the "TBox lies" trap: the superclass def lists its leaves).

## The datatype-value axis: keep it OPEN, not sh:in (the real extensibility win)
`ho:hookEvent` (WHEN) + `ho:hookAction` (WHAT), mirroring FailurePolicy's
condition/strategy pair. Critically hookEvent has NO `sh:in` (unlike
sectionKind/scenarioKind/memory* which ARE closed). Reason: sectionKind closes
because each value needs a DEDICATED renderer function; hookEvent does NOT — the
`_render_hooks` renderer GROUPS BY hookEvent generically, so any event string
renders with zero per-value code. Closing it would make every new lifecycle event
(runtime-defined, versioned externally) a shapes edit for no correctness benefit.
Self-check answer, PROVEN: "new hook event = one more individual?" YES — the
renderer emitted 4 distinct events (session-start/pre-tool-use/post-tool-use/stop)
with zero event-specific code, so a 5th (session-end/pre-compact/user-prompt-
submit/notification) is one more Hook individual + one hookEvent literal, no TBox/
shape/tool change. HookShape requires hookEvent exactly-1 (open value) + hookAction
min-1 + prefLabel + maturity.

## hasHook: direct sub-property (Harness→Hook), like hasGuardrail
`ho:hasHook ⊑ ho:hasComponent`, domain Harness, range Hook — DIRECT (not a
propertyChain) because the subject genuinely IS the Harness (mirrors hasGuardrail/
hasChannel). So a bound Hook is reachable/counted/ComponentConnectivityShape-clean
via the binding alone — NO concept tag needed (same as FailurePolicy/TestScenario:
reached by their binding, not by ho:tagged). Registrations needed beyond TBox:
- `EdgeTypingShape` += `[sh:path ho:hasHook ; sh:class ho:Hook]`.
- `retrieve.PREDICATE_WEIGHT[HO.hasHook] = 0.9` (component tier, next to hasGuardrail).
- `link_predicates(g)` auto-derives hasHook (it's a TBox ObjectProperty) — no manual edit.
- ★`lib.INSTANCE_CLASSES += HO.Hook` — MANDATORY and easy to miss: Hook ⊑ HC only
  UNDER owlrl, so without it reason=False drops the 4 hooks (measured 237 vs 233
  parity MISMATCH). validate.py uses reason=True so it PASSES green while parity is
  broken — the count-parity check (reason True==False) is what catches it. Every
  leaf with direct instances must be listed even though HarnessComponent "covers"
  it under reasoning.

## Catalog-avoidance = CO-LOCATE, do not mint a new federation unit
20 cc-toolkit scripts → 4 neutral event archetypes (the lifecycle SPINE: session-
open → pre-tool → post-tool → turn-stop; covers the two dominant source categories
PreToolUse(7)+PostToolUse(9) plus session and turn boundaries). Housed by
CO-LOCATING in the already-federated `behavioral/guardrails.ttl` (a Hook is a
BehavioralComponent sibling), NOT a new `hooks.ttl`. Reason a new unit is out of
boundary: it costs root import + central catalog + EVERY recipe catalog, and the
recipe catalogs live in a separate clone (write-forbidden) — a recipe imports the
central ROOT, root would import the new unit IRI, so a recipe catalog missing that
IRI→path breaks recipe closure. Co-locating adds only individuals to an
already-imported unit ⇒ zero federation ripple, recipe closures auto-pick-up the
new nodes (unreferenced, harmless). (execution-mode co-located modes in patterns.ttl
for the same reason.)

## AssemblySection + host binding (byte-identity holds exactly as GAP-4 predicted)
`id:as-hooks` sectionKind "hooks" assemblyOrder 13 (PURE APPEND — no existing
section's order moves; orders need only be unique, not contiguous). Added to the
central DEFAULT set on h-multiagent (`DEFAULT_ASSEMBLY_HOLDER`). Renderer is
CONDITIONAL (return when no hasHook). HOST = `h-harness-factory`, NOT the base
template: it is the designated library carrier for run-behaviour axes (already
hosts TestScenario/FailurePolicy and renders that half of the doc), and a
harness-authoring factory naturally runs lifecycle automations (session-start
context load, pre-tool guard, post-tool validate = run the checks, stop reminder).
MEASURED byte-identity (HEAD snapshot via `git archive HEAD | tar -x` — read-only,
no repo mutation — then diff CLAUDE.md): all 6 hook-less harnesses incl.
h-multiagent BYTE-IDENTICAL; h-harness-factory +17 lines, 0 removed, 100% the
`## Hooks` block; recipe pilot materializes OK with 0 Hooks sections. Only
MANIFEST/individualCount move (as-hooks becomes a component of h-multiagent) —
CLAUDE.md byte-identity is the meaningful invariant, exactly as GAP-4.

## Renderer shape
`_render_hooks`: group hasHook by hookEvent, sort events, sort hooks by IRI, sort
action literals — fully deterministic (2-run diff = 0). Emits "## Hooks" +
per-event bullets, each hook "Label — definition" + "runs: hookAction".
Registered in SECTION_RENDERERS under "hooks"; the error-message list is dynamic
(sorted(SECTION_RENDERERS)) so no separate edit. sectionKind sh:in AND the TBox
sectionKind definition prose both need "hooks" added (enum≠narrative, fix both).

## Attribution
Each hook: dct:source cc-toolkit repo + dct:license "Apache-2.0" (no source text
copied — archetypes only). NOTICE gained a paragraph crediting the toolkit's
SessionStart/PreToolUse/PostToolUse/Stop hooks (NOTICE editing was in this brief's
scope §6, unlike docs/**).
