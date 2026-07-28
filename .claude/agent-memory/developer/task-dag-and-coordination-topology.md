# task-DAG (Deliverable) + pluggable coordination topology

harness-100 augmentation increment 1 (schema foundation). GAP-1 + coordination as a selectable dimension.

## GAP-1: task-DAG on WorkflowStep
- `ho:Deliverable` ⊑ HarnessComponent (new TBox class, prefix `dlv-`). Carries artifactTemplate(opt)+tokenEstimate.
- `ho:stepProduces`/`ho:stepConsumes` (WorkflowStep→Deliverable), `ho:stepDependsOn` (WorkflowStep→WorkflowStep, `owl:TransitiveProperty`). DAG = produces/consumes join; dependsOn = order DAG (fan-out/join that scalar stepOrder can't express).
- **Reachability = 5th `owl:propertyChainAxiom` on hasComponent: `(hasComponent hasStep stepProduces)`** — 3-link, mirrors the hasStep 2-link. stepProduces subject is WorkflowStep (intermediate) → chain, NOT direct subProperty (would mistype step as Harness). stepConsumes/stepDependsOn need NO reachability edge (Deliverable already rolled up via producer; steps via hasStep). Verified: dlv-* reason to [Deliverable,HarnessComponent] only, and h-multiagent hasComponent dlv-* inferred True.
- ontology_lib: add `HO.Deliverable` to INSTANCE_CLASSES + `HO.stepProduces/stepConsumes/stepDependsOn` to INSTANCE_LINK_PREDICATES (so retrieve graph-view shows the edges).
- Demo: wired 2 neutral Deliverables (dlv-dispatch-brief, dlv-verified-result) across wf-multiagent's 3 steps + 2 dependsOn edges. tokenEstimate + tagged c-multiagent on each.
- **materialize: `_render_process` renders stepByRole/stepUsesTool/stepGuardedBy only — NOT produces/consumes/dependsOn.** So DAG is MANIFEST-only (build_manifest.all_components rolls Deliverables in via inferred hasComponent → +2 components) and CLAUDE.md stays byte-identical. This is the desired "MANIFEST-only for DAG" outcome — no emitter change needed.
- ★**STALE (corrected 2026-07):** materialize.py has SINCE gained a `## Data flow` section renderer that DOES emit each Deliverable with `- produced by: <step>` / `- consumed by: <step>`. So wiring new stepProduces/stepConsumes to a harness now ALSO enriches that harness's `## Data flow` section (NOT byte-identical for the binding harness). DAG is no longer MANIFEST-only. Byte-identity now only holds for harnesses that DON'T bind the workflow. Always re-baseline materialize before edits — don't trust this note's older byte-identity claim.

## Coordination topology = pluggable/extensible dimension (BOTH topologies)
- Topology declared by pairing a `ho:DesignPattern` (topology) + matching `ho:Channel` (conduit), selected per-harness via `ho:appliesPattern` + `ho:hasChannel`.
- orchestrator-workers (DEFAULT doctrine) = pat-orchestrator-workers + chan-dispatch (on h-multiagent, unchanged). peer-mesh (alternative) = new pat-peer-mesh + chan-peer.
- **A Channel is ⊑HarnessComponent → MUST be wired to a harness or orphan-FAIL.** chan-peer can't go on h-multiagent (would change its channels section → break byte-identical) → authored neutral host harness `h-peer-mesh` (derivedFrom h-multiagent) purely to wire pat-peer-mesh+chan-peer (anti-orphan), mirroring h-multiagent's own "exists to wire the parts" purpose. Omitted requiresCapability so cap-satisfaction is trivially green (HarnessShape doesn't mandate it). New topologies extend the same way: new Pattern+Channel+host harness, additive, no TBox change.
- Doc: docs/composition-methodology.md new "Coordination topology is a pluggable, extensible dimension" section (table + extend recipe).

## GOTCHA (byte-identical): don't edit an existing node whose text RENDERS
- I appended to `pat-orchestrator-workers` skos:definition → h-multiagent CLAUDE.md Process section changed → byte-identical BROKE. Reverted. Rule: `_render_process` renders appliesPattern definitions and hasWorkflow definitions; `_render_*` renders the bound components' prefLabel/definition. **Editing ANY definition/prefLabel of a component bound to an existing harness changes that harness's materialized CLAUDE.md.** Put new prose on NEW nodes + docs only. Always capture a baseline materialize BEFORE edits and `diff` CLAUDE.md after.
- No new core files added → catalog/root union + glob-fallback parity auto-preserved (only new files need catalog+root wiring).
