# Persisting corpus refs: local artifactTemplate path vs canonical dct:source URL

> **SUPERSEDED (importer) — see `importer-artifacttemplate-canonical-url.md`.** The
> "artifactTemplate = LOCAL absolute path" role below was reversed for a SECURITY
> reason: a local `/home/<user>/...` path in a recipe TTL leaks the authoring
> host when pushed to a public repo. `import_corpus.py` now emits BOTH
> artifactTemplate and dct:source from the canonical `UPSTREAM_BASE` URL. The
> two-role distinction below is historical; the fetch-vs-attribution split no
> longer holds for importer output (both are the public GitHub URL).

Resolution of the inc3 pilot flag ("ephemeral scratchpad artifactTemplate paths →
persona materialize hard-fails once scratchpad clears"). User decision: clone the
corpus to a STABLE LOCAL path and repoint; keep the persona hard-fail behavior.

## What was done (5 recipes: 21/16/31/03/46-*)
- Cloned `revfactory/harness-100` (Apache-2.0) to `/home/cpark/git/harness-100`
  (`git clone --depth 1`; network was reachable). Fallback if offline = `cp -a`
  the existing scratchpad clone. Verify `.claude/{agents,skills}` structure matches
  the recipe refs BEFORE repointing (skill files are `skill.md` lowercase in corpus;
  materialize emits `SKILL.md`).
- **Two distinct ref roles — do NOT conflate:**
  - `ho:artifactTemplate` = **local absolute path** the build actually fetches:
    `/home/cpark/git/harness-100/en/<h>/.claude/...`. sed prefix-swap the old
    scratchpad prefix → `/home/cpark/git/harness-100/`, preserving the `en/<h>/...`
    tail. (~7-9 refs/recipe: personas + skills.)
  - `dct:source` = **canonical attribution URL**, NOT a local path:
    `https://github.com/revfactory/harness-100/tree/main/en/<h>`. (Was a bare
    relative `"en/<h>"` literal before.) Public repo → URL is the correct
    redistribution attribution; local path is only the build fetch target.
    Contrast lpranging where BOTH were local (private/unpublished source).
  - Keep `dct:license "Apache-2.0"`.
- Repoint the TTL header comment block AND the README top-warning + any bottom
  tradeoff / §-flags notes from "ephemeral / must re-point / blocking open item"
  to "persistent (resolved)". The persona-vs-skill hard-fail ASYMMETRY note stays
  (still true) but reframed as moot since refs now resolve.

## Verification (per recipe, unchanged harness graph)
- `validate.py` PASS is INVARIANT under a path-only swap (graph identity unchanged).
- The load-bearing check is `materialize.py <harness-IRI> --out <fresh tmp>`:
  harness arg = full IRI `https://harness-ontology.dev/id/<recipe>/h-<name>`
  (id: prefix expands to `.../id/<recipe>/`). Confirm **0 `.ref` stubs**
  (personas resolve, no FileNotFoundError abort) and 2 back-to-back runs
  `diff -rq` IDENTICAL. Spot-check: agent md has fetched body (>~100 lines),
  `cmp` a SKILL.md against corpus `skill.md` = byte-identical.
- Use per-recipe out dirs in OWN session scratchpad (not staging, not shared) to
  avoid the parallel-dispatch pollution seen before. Clean out dirs after.
- Boundary: corpus clone is an external-repo placement, NOT a repo commit; leave
  `ontology/**`, `tools/**`, shared catalog, git untouched.
