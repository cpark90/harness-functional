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

## Wave C 4 recipe land (2026-07-25) — 02/07/09/14 content
- 절차 Wave A/B와 동일(순수 additive dir 추가, published만 push, catalog published in-place 재생성).
- precondition 확인: 중앙 catalog 워킹트리 == origin/main(HEAD==origin/main a5b8786, `git diff HEAD -- catalog` 0줄).
- 실측: published `eec0835..6574213`. federate 4/4 PASS(closure) 02=247·07=249·09=249·14=244
  individuals. 로컬경로 0. catalog 21 central + 18 recipe, `--check` in-sync, `--print-matrix`=18 IRI,
  staging와 byte-identical. git 델타 정확히 `M catalog + ?? 4 dir`(각 .ttl 1개, central symlink 없음).
  CI push run 19 job(discover 1 + validate 18) 전원 success. 유일 annotation=Node20 deprecation(비차단).
  커밋 파일 개별 add(`add -A` 금지), `commit -F`.

## Wave D 4 recipe land (2026-07-25) — 43/48/51/55 business
- 절차 Wave A/B/C와 동일(순수 additive dir 추가, published만 push, catalog published in-place 재생성).
- precondition: 중앙 catalog 워킹트리 == origin/main(HEAD==origin/main a5b8786, `git diff HEAD/origin/main -- catalog` 0줄).
- 주의: staging↔published `diff -rq`에 **lpranging 델타가 상시 낀다**(README.md·lpranging.ttl differ,
  published에만 impl/scaffold/skills) — 이는 미land ref-refactor 번들이라 **Wave 스코프 밖**, 만지지 말 것.
  Wave D 순수 델타는 `Only in staging: 43/48/51/55` 4 dir뿐.
- 실측: published `6574213..7e47fc5`. federate 4/4 PASS(closure) 43=244·48=248·51=248·55=246.
  로컬경로 0. catalog 21 central + 22 recipe, `--check` in-sync, `--print-matrix`=22 IRI, staging와
  byte-identical. catalog diff 순수 additive(4 insertions 0 deletions, central 블록 불변).
  git 델타 정확히 `M catalog + ?? 4 dir`(각 .ttl 1개, central symlink 커밋 전 `rm -f`).
  CI push run 23 job(discover 1 + validate 22) 전원 success. 유일 annotation=Node20 deprecation(비차단).
  커밋 파일 개별 add(`add -A` 금지), `commit -F`.

## Wave E 3 recipe land (2026-07-25) — 56/60/62 education
- 절차 Wave A~D와 동일(순수 additive dir 추가, published만 push, catalog published in-place 재생성).
- precondition: 중앙 catalog 워킹트리 == origin/main(HEAD==origin/main a5b8786, `git diff HEAD -- catalog` 0줄).
  session-start status 스냅샷은 `M catalog`로 stale 표시 — 실 diff로 clean 확인.
- lpranging 델타(README·ttl differ, impl/scaffold/skills published-only)는 상시 out-of-scope 번들, 만지지 말 것.
  Wave E 순수 델타 = `Only in staging: 56/60/62` 3 dir뿐.
- 실측: published `7e47fc5..6bf6014`. federate 3/3 PASS(closure) 56=252·60=250·62=247 individuals.
  로컬경로 0. catalog 21 central + 25 recipe, `--check` in-sync, `--print-matrix`=25 IRI, staging와
  byte-identical. catalog diff 순수 additive(3 insertions 0 deletions, central 블록 불변).
  git 델타 정확히 `M catalog + ?? 3 dir`(각 .ttl 1개, central symlink 커밋 전 `rm -f`).
  CI push run 26 job(discover 1 + validate 25) 전원 success. 유일 annotation=Node20 deprecation(비차단).
  커밋 파일 개별 add(`add -A` 금지), `commit -F`. (Wave F가 catalog를 28로 재생성하기 전 25-recipe 상태 먼저 land 완료.)

## Wave F 3 recipe land (2026-07-25) — 69/70/72 legal
- 절차 Wave A~E와 동일(순수 additive dir 추가, published만 push, catalog published in-place 재생성).
- precondition: 중앙 catalog 워킹트리 == origin/main(HEAD==origin/main a5b8786, `git diff HEAD -- catalog` 0줄);
  session-start status 스냅샷은 `M catalog`로 stale — 실 diff로 clean 확인.
- lpranging 델타(README·ttl differ, impl/scaffold/skills published-only)는 상시 out-of-scope 번들, 만지지 말 것.
  Wave F 순수 델타 = `Only in staging: 69/70/72` 3 dir뿐(각 .ttl 1개).
- 실측: published `6bf6014..f04d9b7`. federate 3/3 PASS(closure) 69=246·70=245·72=247 individuals.
  로컬경로 0. catalog 21 central + 28 recipe, `--check` in-sync, `--print-matrix`=28 IRI, staging와
  byte-identical. catalog diff 순수 additive(3 insertions 0 deletions, central 블록 불변).
  git 델타 정확히 `M catalog + ?? 3 dir`(각 .ttl 1개, central symlink 커밋 전 `rm -f`).
  CI push run 29 job(discover 1 + validate 28) 전원 success. 유일 annotation=Node20 deprecation(비차단).
  커밋 파일 개별 add(`add -A` 금지), `commit -F`. (Wave G가 catalog를 38로 재생성하기 전 28-recipe 상태 먼저 land 완료.)

## Wave G1 5 recipe land (2026-07-25) — 73/74/75/81/82 lifestyle·comms
- 절차 Wave A~F와 동일(순수 additive dir 추가, published만 push, catalog published in-place 재생성).
- precondition: 중앙 catalog 워킹트리 == origin/main(이 라운드 HEAD==origin/main `267cb45`, `git diff HEAD -- catalog` 0줄).
  이 라운드는 session-start status 스냅샷이 실제로 clean이었음(과거 stale `M catalog`와 달리).
- lpranging 델타(README·ttl differ, impl/scaffold/skills published-only)는 상시 out-of-scope 번들, 만지지 말 것.
  Wave G1 순수 델타 = `Only in staging: 73/74/75/81/82` 5 dir뿐(각 .ttl 1개).
- ★`--print-matrix`는 plain JSON array(IRI 목록)다 — `.include` 키 아님. 카운트는 `jq 'length'`.
- 실측: published `f04d9b7..0eae27f`. federate 5/5 PASS(closure) 73=249·74=248·75=247·81=248·82=249 individuals.
  로컬경로 0. catalog 21 central + 33 recipe, `--check` in-sync, `--print-matrix`=33 IRI, staging와 byte-identical.
  catalog diff 순수 additive(5 insertions 0 deletions, central 블록 불변). git 델타 정확히 `M catalog + ?? 5 dir`(각 .ttl 1개, central symlink 커밋 전 `rm -f`).
  CI push run 30148932216 = 34 job(discover 1 + validate 33) 전원 success. 유일 annotation=Node20 deprecation(비차단).
  커밋 파일 개별 add(`add -A` 금지), `commit -F`. (Wave G2 마지막 5 recipe가 catalog를 38로 재생성하기 전 33-recipe 상태 먼저 land 완료.)

## Wave G2 5 recipe land (2026-07-25) — 87/90/95/96/100 comms/ops/spec (대표 35 완료)
- 절차 Wave A~G1과 동일. remote=`0eae27f`(G1) → published `0eae27f..ccb2cbb`. federate 5/5 PASS
  (closure) 87=248·90=248·95=251·96=250·100=250. 로컬경로(5 신규 dir) 0. catalog 21 central + 38 recipe,
  `--check` in-sync, `--print-matrix`=38, staging와 byte-identical. git 델타 정확히 `M catalog + ?? 5 dir`
  (각 .ttl 1개, README 없음). CI push run 30149830441 = 39 job(discover 1 + validate 38) 전원 success.
  중앙 catalog 워킹트리==origin/main(`d4f4b1e`). central symlink 커밋 전 `rm -f`. 파일 개별 add.
- **★잔존 발견(brief "전체 로컬경로 0" 미충족)**: `git grep -l /home/cpark origin/main`가 **파일럿 5 recipe
  README 산문 6줄**을 잡는다(03:29·16:29·21:27·31:28+210·46:28). 값=`/home/cpark/git/harness-100/en/<name>/`
  =revfactory 수확 원경로 provenance 주석. **staging도 동일**(land gap 아님, R2 스크럽이 TTL data값만
  건드리고 README prose는 안 건드림). recipe TTL·신규 임포트엔 없음. README 가진 recipe는 7개뿐(파일럿5+
  lpranging+techdoc; 후자 2는 canonical URL만). → orchestrator follow-up: 파일럿 README prefix sed 스크럽
  (staging→developer). inspection은 recipe 파일 편집 경계 밖이라 보고만.

## R2 잔여 마무리 — 파일럿 5 README 로컬경로 스크럽 (2026-07-25)
- G2에서 발견한 파일럿 README 잔존(위 ★잔존) 해소. published-only, README **prose만**.
- 치환은 regeneration이 아니라 **prefix sed**: `/home/cpark/git/harness-100/en/` →
  `https://github.com/revfactory/harness-100/tree/main/en/`. recipe name은 경로에 이미 있어 prefix만.
  기존 canonical URL 라인(각 README 하단 `revfactory/harness-100/tree/main/en/<name>`)은 무변경 —
  sed가 /home/cpark 접두만 잡으므로 안전.
- 6줄/5파일(03·16·21·46 각1, 31 두 곳: L28 blockquote + L210 dct:source 산문). `git diff --stat`
  6 ins/6 del로 의도범위 정확. TTL·catalog·dir 구조 불변 → CI glob 매핑 불변.
- 실측: published `ccb2cbb..a7ad725`. 파일 개별 add(`add -A` 금지), `commit -F`.
  published-wide `git grep /home/cpark origin/main -- recipes/` = **0**(TTL·README 통틀어).
  CI run 30149996529 = 39 job(discover 1 + validate 38) 전원 success.

## specializes-edge land (2026-07-25) — archetype↔instance 링킹 82 edges/35 recipe
- **엣지-only land은 순수 additive·catalog 무변경**: `ho:specializes core:X`는 기존 노드에 술어 추가라
  신규 개체 0 → catalog(노드/URI 파생) 불변(`--check` in-sync 유지), federate 개체수 불변(21=257·32=265·
  70=259 링크 前後 동일). commit `35 files 82 insertions(+) 0 deletions`가 additive 지표.
- **byte-identity 증명 = strip-and-compare**: `grep -c specializes tools/materialize.py`=0(미emit)이면,
  recipe ttl에서 `grep -v "ho:specializes core:"`로 엣지 제거한 사본을 materialize한 것과 원본 materialize를
  `diff -r`(lock 포함까지) → **완전 동일**(lock individualCount조차 동일, 엣지는 개체 아님). 표본 2개면 충분.
  materialize harness 인자는 **bare slug**(`h-code-reviewer`, `id:` prefix 붙이면 no-match exit 2).
- **★README-scrub-lag 함정**: staging↔published `diff -rq`에 pilot 5(03·16·21·31·46) **README.md differ**가
  낀다. 이는 R2 로컬경로 스크럽(`a7ad725`)이 **published에만** 적용되고 staging엔 역전파 안 돼서 —
  **staging README가 published보다 뒤처짐**(로컬경로 잔존). 엣지 land 스코프는 **recipe .ttl만**이니
  README는 **절대 copy 금지**(staging→published 복사 시 로컬경로 재도입 = 금지 위반). 스코프 필터를
  `.ttl`로 명시하고 README/lpranging은 손대지 말 것.
- 실측: published `a7ad725..d4cfd82`(35 M .ttl only), CI run 30156685557 = 39 job(discover1+validate38) success.
  중앙 `2d5873a..c99fd1e`(docs/memory only, validate-ontology 1 job success). 둘 다 Node20 annotation 비차단.
  survey close도 같은 라운드: compression-cap 해석("10~20"=상한, 모든 축 미만 압축)으로 결정4 잔여 해소·refresh.

## 검증 게이트(3축 backfill 라운드에서 통과)
federate 8/8 PASS(per-recipe closure, union 금지) · materialize 그룹A 3섹션/lpranging 2섹션
(TestScenario 조건부 early-return) 2회 결정성 · 중앙 `validate.py` PASS@223 무회귀.

## 관련
[[federation-lockstep]] (catalog/CI 1:1), [[vocab-growth-increment-audit]] (closure 델타=충돌탐지),
[[refresh-and-git-baseline]] (scoped land·add -A 금지), [[recipe-catalog-glob-land]] (glob 생성기·land순서).
