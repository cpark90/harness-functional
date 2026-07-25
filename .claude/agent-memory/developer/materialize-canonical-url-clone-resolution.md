# materialize: resolve canonical harness-100 URL refs via local clone

Follow-up to `importer-artifacttemplate-canonical-url.md`. Once the importer emits
`ho:artifactTemplate` (persona + skill) as the PORTABLE canonical URL
`https://github.com/revfactory/harness-100/tree/main/en/<rest>`, materialize can no
longer `open()` the ref. There are **two** distinct fetch paths for artifactTemplate:

1. **persona / prompt / guardrail INLINE**: `render_component` → `render_from_template`
   → `resolve_template`. `resolve_template` only handles repo-relative and **RAISES**
   `FileNotFoundError` on anything it can't `os.path.exists` — so a URL **crashed the
   whole build**. (A local abspath previously "worked" only because `os.path.join(base,
   abspath)` returns the abspath and `os.path.exists` is true → it opened & inlined it,
   leaking the machine path into the emitted body. Retired.)
2. **skill / scaffold / implementationRef FETCH (byte-copy)**: `_resolve_ref_path` →
   `_ref_stub`. Already graceful: returns None for URLs → caller writes a `.ref` stub.

## The fix (one shared mapper, wired into both paths)
- `HARNESS_100_URL_PREFIX = "https://github.com/revfactory/harness-100/tree/main/"`.
- `_harness_100_clone()` = `os.environ.get("HARNESS_100_CLONE", "/home/cpark/git/harness-100")`
  — **env first, conventional fallback**, nothing else hard-coded.
- `_map_corpus_url(ref)` → `<clone>/<rest>` if ref has the prefix, else None. Returns the
  path **whether or not it exists** (caller decides exist→open vs absent→stub).
- `render_from_template`: `mapped = _map_corpus_url(tmpl)`. If mapped & isfile → open &
  inline (SAME file the abspath era opened → **byte-identical output**, since default
  clone == old abspath root). If mapped & absent → `_ref_stub("artifactTemplate", url,
  node)`. `elif` other-URL / **bare-abspath** → stub too (**refuse to re-open an abspath**
  = don't re-leak). `else` → `resolve_template` (repo-relative, UNCHANGED incl. its raise).
- `_resolve_ref_path`: same `_map_corpus_url` short-circuit before the http early-return, so
  URL-ref'd **skills** byte-copy identically from the clone (absent → stub). implementationRef/
  scaffold get the mapping for free (importer emits neither as a corpus URL today).

## Gate method (git-free, all in scratch; central store validates so materialize refuses
## a draft — use the FINISHED staging recipe, not a fresh import)
- **Baseline** = `git show HEAD:tools/materialize.py` → OLD; keep NEW copy; swap in place.
- **Central 7 byte-id**: materialize `h-coding h-harness-factory h-multiagent h-peer-mesh
  h-research h-support h-workspace-synthesis` (arg = **short name**, not IRI) with OLD & NEW,
  `diff -r -x harness.lock.json`. 0 (central personas are inline promptText, no artifactTemplate).
- **Pilot round-trip**: the finished staging recipe carries local abspaths and **validates**.
  Derive a URL variant by `re.sub` on `ho:artifactTemplate "..."` (abspath→URL). Per-recipe
  catalog in scratch: copy staging `catalog-v001.xml`, rewrite `uri="central/"`→absolute repo
  path (catalog loader `os.path.join(base,uri)`; **absolute uri ignores base**), point the
  recipe entry at the scratch TTL. Materialize URL+NEW vs LOCAL+OLD with
  `HARNESS_ROOT_ONTOLOGY=<recipe IRI>`. `diff -r -x MANIFEST.json -x harness.lock.json` = 0
  → **all bodies (agents/*.md inline personas, byte-copied skills, CLAUDE.md) identical**.
  MANIFEST `vendoredFrom`/sources legitimately differ (URL vs abspath = the portability win,
  and the URL MANIFEST no longer leaks the path).
- **Clone-absent**: `HARNESS_100_CLONE=/nonexistent` → build **succeeds**, personas inline a
  stub, skills emit `SKILL.md.ref`, `grep -rl /home/cpark <out>` empty, stub cites the URL.
- Determinism: 2-run `diff -r` = 0 in both clone-present and clone-absent modes.
- `validate.py` unaffected (tools-only change) — PASS @223.
