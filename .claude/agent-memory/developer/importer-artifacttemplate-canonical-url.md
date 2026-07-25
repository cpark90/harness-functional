# importer artifactTemplate: local abs-path leak → canonical URL

`import_corpus.py` used to emit `ho:artifactTemplate` as the LOCAL absolute path
into the corpus clone (`/home/cpark/git/harness-100/en/<h>/.claude/agents/<x>.md`).
That literal rides into the recipe TTL and **leaks username + machine layout when
the recipe is pushed to a public repo**. Blocking a 30x bulk import (would clone
the leak 30x). Fix = emit the **canonical public corpus URL** instead.

## The fix (ref REPRESENTATION only — no other logic touched)
- The corpus is public (revfactory/harness-100, Apache-2.0), so a canonical
  GitHub URL is the legitimate, valid ref.
- Reused the existing `UPSTREAM_BASE = ".../revfactory/harness-100/tree/main/en"`
  (L53, previously only feeding `dct:source`). `src_url = UPSTREAM_BASE/<dirname>`
  is already built at emit top.
- New helper `corpus_relpath(abspath, corpus_dir)` = `os.path.relpath` +
  `.replace(os.sep, "/")` → POSIX `.claude/agents/<x>.md`. Stored in each agent/
  skill dict as `"ref"` (replaced the old `"abspath"` key — abspath had NO other
  consumer, so no dangling refs). Emit builds `"%s/%s" % (src_url, ref)`.
- **Two emit sites, both `ho:artifactTemplate`**: worker personas + instructions.
  That is the ONLY field that carried a local path. `dct:source` already used
  UPSTREAM_BASE; the flag-header comment block uses `src_url` (canonical). No
  scaffold/implementationRef in this tool (that's materialize's concern).

## Verify method (git-free, scratch-only)
- **Zero local paths**: regen fresh outputs to an ISOLATED clean dir (old scratch
  had stale prior-session outputs w/ local paths → false positives; grep only your
  fresh dir). `grep -rl "/home/cpark" <fresh>` = 0. Also scan for ANY bare abs-path
  literal: `grep -rhoE '"/[A-Za-z0-9_./-]+"' <fresh>` = empty (proves artifactTemplate
  was the sole offender, no field missed).
- **canonical present**: `grep -rc "github.com/revfactory/harness-100"` > 0.
- **ref-ONLY change** (no regression of role/instruction/3-axis/flag logic): diff
  vs the COMMITTED importer via `git show HEAD:tools/import_corpus.py > old.py`
  (read-only git is fine), regen both, `diff` — every changed line must be an
  `artifactTemplate` (local→URL), nothing else. Confirmed on 21/31/16.
- Determinism: 2-run `diff` = 0. rdflib-parse each output. Central `validate.py`
  PASS @223 (importer touches tools/ only).

## Tension flagged for orchestrator (out of this brief's scope)
artifactTemplate was materialize's LOCAL FETCH target. With a URL, materialize
can no longer `open()` it as a file — a follow-up must teach materialize to fetch
the URL (or map URL→local clone) OR the build strategy changes. This brief was
explicitly "ref representation only"; the fetch-side adaptation is a separate
design decision. See superseded note `corpus-persist-local-path-canonical-source.md`.
