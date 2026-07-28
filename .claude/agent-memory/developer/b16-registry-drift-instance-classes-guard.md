# B16 — INSTANCE_CLASSES registry-drift guard (validate axis)

New hard-FAIL axis `check_registry_drift(g)` in `tools/validate.py` guarding the
recurring B3 defect: a `ho:` class instantiated in the abox but MISSING from the
Python literal `lib.INSTANCE_CLASSES` silently vanishes from `instance_nodes`
(count / reachability / retrieve). SHACL/reasoning can't see it — it's Python.

Invariant: every `ho:` class that (a) has ≥1 abox instance AND (b) is
`subClassOf* HarnessComponent | SpecConcept` or is `Harness` MUST be registered.

Key correctness pitfalls (why the obvious impl false-FAILs):
- **Measure against ASSERTED types, not the reasoned graph.** With owlrl on, an
  instance of `Role` is also typed as its intermediate superclasses
  (`OrganizationComponent`, `HarnessComponent`), so those intermediates would
  look "instantiated" and be spuriously required (they're deliberately OUT of
  the registry). Fix: `raw = lib.load_graph(reason=False)`; use
  `raw.subject_objects(RDF.type)` and asserted `RDFS.subClassOf` edges.
- **In-scope set = reverse subClassOf* BFS** from `HO.HarnessComponent` +
  `HO.SpecConcept` over asserted edges (build `children[sup].add(sub)`), plus
  `HO.Harness`. `Concept` (⊑skos:Concept) and `InformationSpace`/
  `EnvironmentSpace`/`GlobalState` (⊑InformationSpace, a top-level NON-SpecConcept
  layer) are OUT of scope — registered for retrieval but not guarded, harmless.
- **Extras ≠ FAIL**: `(registry ∩ in_scope) − instantiated` = warn only. Here
  exactly 3 (`Candidate` inferred-only, `Example`, `HarnessComponent` abstract).
- Green-now numbers: **28** instantiated in-scope classes all registered, 3
  harmless extras, individual count **232** (this is a check only, graph
  unchanged). Wired into `run_structured` (`registryDrift` field ANDed into
  `hard_ok`) and `main` summary alongside the other 5 axes. Needs
  `RDFS, URIRef` added to the rdflib import.
- Negative control (no disk state): monkeypatch `lib.INSTANCE_CLASSES =
  set(orig) - {HO.Role}` in-memory, call the check → FAIL naming `Role`; restore.
- ORDER guard from the original item was WITHDRAWN — `ttl_writer.ORDER` is a
  partial ordering hint (B13 merge preserves absent predicates), so "ORDER ⊇ all
  predicates" is a false invariant.
