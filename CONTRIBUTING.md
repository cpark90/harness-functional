# Contributing

Thanks for helping grow the harness ontology. Contribution is **async, via
git**: fork, edit locally (the web UI makes this easy), and open a pull request.
CI holds every PR to the same anti-orphan / anti-drift / buildable invariants
the tools enforce locally, so the knowledge base compounds instead of rotting.

> **Keeping your ABox in your own repo?** This page covers editing the central
> repo directly. To federate a **pure-data** ontology repo (your own GitHub repo
> of Turtle individuals, connected via `owl:imports` + catalog), see
> **`docs/CONTRIBUTING-ONTOLOGY.md`** and the architecture in
> `docs/federation-design.md`.

## The loop

Contributions to **this** repo are vocabulary: TBox classes/properties, SHACL
shapes and the shared tooling. Individuals (guardrails, prompts, tools,
harnesses) and recipes are contributed to **harness-concrete** instead.

1. **Fork & clone** the repo.
2. **Run the web UI** (easiest way to author individuals without hand-writing
   TTL — note it targets the ABox, which lives in harness-concrete, not here;
   see "Scope of the web UI" below):
   ```bash
   docker compose up          # → http://127.0.0.1:8000
   ```
   The editor's forms are constrained by the TBox vocabulary (you can't invent a
   near-synonym class or an untyped edge), and every save is gated by
   `validate.py` with a TTL diff preview. Prefer reusing an existing node/tag to
   adding a new one.

   The UI is a Svelte app; `docker compose up` builds it (multi-stage) and
   bundles Cytoscape.js so it runs offline. To run **without Docker**, build the
   frontend once and serve with uvicorn:
   ```bash
   cd tools/webui/frontend && npm install && npm run build   # → tools/webui/static/
   cd ../../.. && PYTHONPATH=tools uvicorn tools.webui.server:app --port 8000
   ```
3. **Or edit the TTL by hand** — this repo carries the TBox
   (`ontology/tbox/`) and shapes only; individuals (`abox/`, recipes) live in
   **harness-concrete**. See `ONTOLOGYSTYLE.md` for naming, predicate order and
   the [지킴] rules.
4. **Validate locally** before pushing:
   ```bash
   make validate                    # must print PASS (schema-root gate)
   ```
   (Use an interpreter that has `rdflib`/`pyshacl`/`owlrl`; inside Docker they
   are already installed.)
5. **Open a PR.** GitHub Actions runs `tools/validate.py`; a non-zero exit fails
   the check. A maintainer reviews the **TTL diff** (human-readable on purpose —
   that is why the source of truth is flat TTL in git) and merges.

## Rules of thumb

- **Never load the whole stored graph to make a change** — work from a
  `retrieve.py` pack. Projection needs individuals, so run it from
  harness-concrete: `HARNESS_CATALOG=catalog-v001.xml python3
  central/tools/retrieve.py "<request>"`.
- **Reuse the vocabulary.** New nodes reuse existing `ho:` classes/properties and
  `skos:Concept` tags. A new concept must be connected (a `skos:broader` parent
  or something it tags) in the same PR, or validation flags it as an orphan.
- **Every text-bearing node gets `ho:tokenEstimate`** (keeps projections
  budget-accurate).
- New work starts at `ho:maturity "draft"`; maintainers promote to
  `reviewed`/`stable` after review.

## Scope of the web UI

The UI is a **local authoring aid**, not a hosted service: it binds to
`127.0.0.1`, has no authentication, and writes directly to your working copy.
Collaboration and review happen through git/PRs, not a shared server.

**After the 2026-09 split its write path has no target in this repo.** The
editor authors individuals under `<repo>/ontology/abox/`, and this repo has no
`ontology/abox` — the ABox moved to harness-concrete. Reading and validating
compose across repos through `HARNESS_CATALOG`, but the write path and the
file-mtime lock are repo-local, so serving it straight out of
harness-functional shows an empty graph. Repointing it is an open item
(`docs/webui-design.md` §9). Until then, author TTL by hand (step 3).

By contributing you agree that your contributions are licensed under the
project's [Apache License 2.0](LICENSE).
