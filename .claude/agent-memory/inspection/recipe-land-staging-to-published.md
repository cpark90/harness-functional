# recipe TTL land = staging(gitignored) → published clone push (inspection)

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

## 관련
[[federation-lockstep]] (catalog/CI 1:1), [[vocab-growth-increment-audit]] (closure 델타=충돌탐지),
[[refresh-and-git-baseline]] (scoped land·add -A 금지).
