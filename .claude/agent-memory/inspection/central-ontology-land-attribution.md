# 중앙 온톨로지 land + 외부 귀속(NOTICE/dct) 검증 (inspection)

harness-repo-survey Wave 1 (2026-07-25)에서 정립. recipe TTL land(staging→published)와
**다른 lane**: 이건 중앙 `cpark90/harness-ontology`(=`/home/cpark/git/harness_ontology`)
**main 직접 커밋·push**다. 이 repo는 trunk-based — 최근 이력 전부 main, autonomous land 루프도
main. (branch-first 일반규칙보다 이 repo 운영모델·orchestrator dispatch가 우선.)

## 재검증 체크리스트 (신규 taxonomy-only 노드 승격)
- `validate.py` PASS @N (reachability/capabilities/assemblyOrder/SHACL) + `check_determinism.py` PASS.
- **anti-orphan**: 신규 DesignPattern은 `ho:tagged id:c-pattern-taxonomy` 하나로 도달성 확보
  (Channel 배선 없이). validate reachability가 이걸 잡음.
- **byte-identity(핵심 함정)**: taxonomy-only 노드는 어느 harness도 `ho:appliesPattern` 안 함
  → `grep -rn "<id>" ontology/ | grep -v <정의파일>` 이 **0**이면 구조적으로 materialize 무영향.
  실측: HEAD worktree vs working tree materialize 7 harness → **CLAUDE.md 전부 IDENTICAL**,
  유일 델타 = `harness.lock.json`의 `individualCount N-1→N`(whole-graph 카운트, harness 콘텐츠 아님).
  이 lock 델타는 **정상·불가피** — "변경 0"은 CLAUDE.md 기준으로 해석(`diff -x harness.lock.json`).
- **HEAD worktree 재현법**: `git worktree add -q --detach <tmp> HEAD` → 양쪽 materialize → `diff -rq`
  → `git worktree remove --force`. (tree 안 건드리는 비파괴 방식.)
- TBox/shapes/tools 무변경은 `git status --short ontology/tbox ontology/shapes tools/`가 empty로 확인.

## 외부 귀속(첫 도입 패턴)
- 노드에 `dct:source "<repo url>"` + `dct:license "MIT"`, `@prefix dct:` 추가.
- 중앙 루트에 `NOTICE` 파일 신규(Copyright + "No source text is copied. provenance via dct:source/license").
  중립화 산출물이라 raw 텍스트 복사 아님을 명시.
- 커밋 메시지·NOTICE 산문은 **영어**(language policy). Co-Authored-By trailer는 실행 세션 harness 값.

## land 절차 (개별 add·`add -A` 금지)
- `git fetch` 후 HEAD==origin/main 확인(autonomous 루프라 remote 앞설 수 있음; 이번엔 in-sync).
- 파일 4개 개별 `git add`(patterns.ttl·NOTICE·developer 신규메모+MEMORY.md index), `commit -F`.
- MEMORY.md index 신규줄이 실제 파일을 가리키는지 dangling 확인(`ls` 그 파일).
- push 후 `git status --short` empty(clean). CI(`validate-ontology`) `gh run watch --exit-status`.
  유일 annotation=Node20 deprecation(인프라·비차단, 모든 run 공통).
- 실측: `12ee623..925f7ba`, CI run 30153495341 validate success 1m34s. 230→231 individuals.
