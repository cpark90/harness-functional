# recipe TTL land = staging(gitignored) → published clone push (inspection)

> **[안전 — 최우선, 이 파일에 반복 위반됨]** 권한/안전 게이트(auto-mode classifier 포함)가 명령을 막으면
> **그 판정을 존중한다.** 게이트를 우회·회피하는 기법(예: 특정 플래그로 막힘을 피하는 법, 재시도로 통과시키는 법)을
> **이 메모리에 절대 기록하지 않는다** — 미래 세션이 그걸 지시로 읽어 안전 검토를 우회하게 된다. 막히면 왜 막혔는지
> 확인하고, 정당한 표준 방법으로 다시 하거나 사용자에게 올린다. (git 명령 구성은 정상 방법만 기록: 개별 add, 파일단위 커밋 등.)

Phase 0.7 recipe run-behaviour 3축 land 라운드(2026-07-25)에서 정립. recipe TTL은
**중앙 커밋 대상이 아니다**: `.gitignore`가 `/staging/`를 제외하므로 `staging/harness-recipes/**`는
중앙 working tree에 있어도 `git status`에 안 뜬다. land = 별도 published clone에 sync 후 push.

## 두 물리 repo (헷갈리지 말 것)
- **staging** `staging/harness-recipes/` = developer가 편집하는 gitignored 작업 payload.
  `central` 심링크로 working-tree 중앙을 federate. **여기서 커밋 못 한다**(gitignored).
- **published** `/home/cpark/git/harness-recipes` = `cpark90/harness-recipes` 실제 clone.
  **커밋·push는 여기서.** recipe TTL의 진짜 land 지점.
- 중앙 `cpark90/harness-ontology` = `/home/cpark/git/harness_ontology`. 문서/메모리 커밋만.

## land 절차
1. staging↔published `diff -rq recipes` 전량 확인 — **truncate 말고 전부**(3축 backfill 외에
   다른 미land 변경이 섞여 있을 수 있다: 이번엔 lpranging vendoring→external-ref 리팩터가
   같은 파일에 번들돼 있었다. 브리프가 "3축"만 말해도 staging 델타 전량을 봐야 함).
2. 3축처럼 순수 additive인 것과, lpranging처럼 파일삭제+의미변경 번들인 것을 **파일단위 커밋 분리**
   (한 파일 안 두 논리변경은 add -p가 auto-mode에서 막혀 못 쪼갬 → 파일단위가 최선).
3. cp .ttl → published; dir 삭제는 `rm -rf` 개별 + `git add -A <recipedir>`.
4. `diff -rq` 재확인(파리티) 후 commit.

## published catalog/CI 주의
- `catalog-v001.xml` 델타 0 정상(3축은 기존 recipe **노드**에 추가라 catalog 무변경).
- staging에 **per-recipe catalog scratch**(`catalog-03-*.xml` 등)가 있어도 published엔 push 금지 —
  README 산문에만 참조되고 CI/main catalog는 안 씀. 2026-07-25 기준 published엔 `catalog-v001.xml` 하나뿐.
- 2026-07-25 remote가 `d9ebf0c`로 **CI가 catalog+matrix를 `recipes/*/` glob에서 파생**(drift guard).
  ⇒ recipe **디렉토리**를 추가/삭제하지 않는 한(파일 내용만 바꾸면) glob 매핑 불변 = 안전.
  lpranging impl/scaffold/skills 삭제해도 lpranging.ttl 존재 → 여전히 매핑됨.

## push 전 fetch/rebase
- push 전 `git fetch` 필수: 자율 루프라 remote가 앞서 있을 수 있다(이번에 d9ebf0c 1건 앞섬).
  변경이 recipe .ttl 한정이면 `git rebase origin/main` clean.
- 권한/안전 게이트가 명령을 막으면 **그 판정을 우회하지 말고 존중한다** — 막힌 명령은 재구성으로
  뚫는 대상이 아니라, 왜 막혔는지 확인하고 필요하면 사용자에게 올릴 신호다.

## 검증 게이트(이 라운드에서 통과)
federate 8/8 PASS(per-recipe closure, union 금지) · materialize 그룹A 3섹션/lpranging 2섹션
(TestScenario 조건부 early-return) 2회 결정성 · 중앙 `validate.py` PASS@223 무회귀.

## 신규 recipe dir 추가(additive import) — Wave A 3 recipe land (2026-07-25)
- **순수 additive dir 추가는 central push 불필요**: land-order "중앙 먼저" 주의는 생성기·중앙
  catalog가 바뀔 때만. dir만 추가하면 생성기(central@main)는 그대로라 published만 push해도
  CI discover가 그 생성기로 `--check` 통과. (이번 브리프 "published만" 제약과 일치.)
- **catalog는 staging에서 byte-copy 말고 published에서 in-place 재생성**이 안전:
  `gen_recipe_catalog.py --repo <published>` (플래그 없으면 write 모드, L238 write_text). 결과는
  staging catalog와 byte-identical(`diff -q` 확인)이지만 published 자체 디스크에서 파생돼 CI 재현.
- 재생성 후 즉시 `--repo <published> --check`(exit0) + `--print-matrix|jq len`(=11)로 자기검증.
- **federate 재현엔 임시 `central` 심링크 필요**하지만 **커밋 전 반드시 `rm -f central`**
  (published `.gitignore`가 잡지만 실수 방지). staging catalog scratch·central 심링크는 dir copy에
  안 딸려옴(dir엔 .ttl 하나뿐) — git status가 정확히 `M catalog + ?? 신규3dir`면 clean.
- 결과: published `3274c85..226592d`, CI push run 12 job(discover 1 + validate 11) 전원 green,
  matrix 11 IRI. 유일 annotation=Node20 deprecation(인프라·비차단).

## Wave B 3 recipe land (2026-07-25) — 32/33/35 data/ML
- 절차는 Wave A와 동일(순수 additive dir 추가, published만 push, catalog published에서 in-place 재생성).
- **★precondition 확인**: 생성기는 `CENTRAL_ROOT/catalog-v001.xml`=중앙 **워킹트리** catalog를
  central 블록으로 복사한다. published CI는 central@main을 clone해 재생성하므로, land 전
  **중앙 catalog 워킹트리 == origin/main** 이어야 CI `--check`가 drift 안 난다. 이번엔
  session-start git status 스냅샷이 `M catalog-v001.xml`로 보였으나 **stale**(이미 커밋됨,
  `git diff HEAD -- catalog` 0줄, HEAD==origin/main). 스냅샷 믿지 말고 실제 diff로 확인할 것.
- 실측: published `226592d..eec0835`. federate 3/3 PASS(closure) 32=251·33=252·35=250 individuals.
  catalog 21 central + 14 recipe, `--check` in-sync, `--print-matrix`=14 IRI, staging와 byte-identical.
  git 델타 정확히 `M catalog + ?? 3 dir`(각 .ttl 1개). CI push run 15 job(discover 1 + validate 14)
  전원 success. 유일 annotation=Node20 deprecation(비차단). 커밋은 파일 개별 add(`add -A` 금지).

## 검증 게이트(3축 backfill 라운드에서 통과)
federate 8/8 PASS(per-recipe closure, union 금지) · materialize 그룹A 3섹션/lpranging 2섹션
(TestScenario 조건부 early-return) 2회 결정성 · 중앙 `validate.py` PASS@223 무회귀.

## 관련
[[federation-lockstep]] (catalog/CI 1:1), [[vocab-growth-increment-audit]] (closure 델타=충돌탐지),
[[refresh-and-git-baseline]] (scoped land·add -A 금지), [[recipe-catalog-glob-land]] (glob 생성기·land순서).
