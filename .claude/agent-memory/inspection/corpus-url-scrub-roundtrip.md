# 공개경로 스크럽 + materialize round-trip 독립검증 (R2류)

recipe TTL의 로컬 절대경로(`/home/<user>/git/harness-100/en/...`)를 canonical corpus URL
(`https://github.com/revfactory/harness-100/tree/main/en/...`)로 스크럽하고, 스크럽이 **빌드
내용을 안 바꿈**을 독립 재현하는 절차. (커밋 be1d177 중앙 tools + 3274c85 published 스크럽)

## 스크럽 = prefix sed (regeneration 아님)
`sed -i 's#/home/cpark/git/harness-100/en/#https://github.com/revfactory/harness-100/tree/main/en/#g'`
— recipe별 name segment가 경로에 이미 있어 **prefix만** 바꾸면 된다. 손저작 판단성 엣지 보존.
치환 전 반드시 **모든 `/home/cpark` 라인이 대상 prefix인지** grep -v 로 확인(아니면 치환 후 grep≠0).
검증: 각 TTL `grep -c /home/cpark`=0.

## round-trip byte-identity 게이트 (핵심)
스크럽이 내용을 안 바꾼다는 증명 = **BEFORE(로컬경로+OLD materialize) vs AFTER(URL+NEW materialize+clone)**
본문 diff 0, MANIFEST만 상이(local→URL, 의도된 포터빌리티 이득).
- **BEFORE**: 로컬경로 recipe(스크럽 前 디스크) + **OLD 중앙 materialize 바이너리**로 산출.
  OLD는 bare abspath를 `open()`해 인라인(`resolve_template`의 `os.path.join(base,abspath)`=abspath).
  → 중앙 이전커밋 `git worktree`를 떠서 그 `tools/materialize.py`를 직접 호출.
- **AFTER**: 스크럽된 URL recipe + **NEW 중앙 materialize**(URL→`HARNESS_100_CLONE` 기본
  `/home/cpark/git/harness-100` 매핑) + clone 존재. NEW는 bare abspath를 **거부(stub)**하므로
  BEFORE엔 절대 NEW를 쓰지 마라.
- diff: `diff -r -x MANIFEST.json -x harness.lock.json mb_$n ma_$n` = 빈 결과(본문 byte-id).
  MANIFEST diff엔 `vendoredFrom`/sources가 local→URL만. lock은 중앙 동일이라 diff 0.
- recipe materialize 호출: `HARNESS_CATALOG=<published>/catalog-v001.xml
  HARNESS_ROOT_ONTOLOGY=<recipe root IRI> materialize.py <bare h-slug> --out ...`.

## federate = 중앙 validate.py + 카탈로그 env
`HARNESS_CATALOG=<published>/catalog-v001.xml HARNESS_ROOT_ONTOLOGY=<recipe root IRI>
central/tools/validate.py` → PASS (per-recipe closure, union 아님). 카탈로그가 `central/` prefix로
중앙 core를 참조하므로 published repo 안에 **`central` symlink→중앙 clone**을 걸어야 로컬 재현된다.
파일 내용만 바뀌면 `gen_recipe_catalog.py --repo . --check`는 in-sync(dir 추가삭제 없음) → CI 안전.

## 함정
- ★published repo의 **`central` symlink는 gitignore 안 돼 있다**(`git check-ignore central` 확인).
  `git add`에 절대 안 들어가게 5개 TTL만 명시 add. 작업 후 `rm -f central`로 워킹트리 청소.
- **staging도 스크럽**: `/home/cpark/git/harness_ontology/staging/harness-recipes/recipes/`
  (gitignored, 커밋 대상 아님)에 같은 recipe 사본이 있어 로컬경로 잔존 → published와 동일 sed로
  일치시켜라(federate 대리 무결성). `diff -q staging/... published/...`로 일치 확인.
- 중앙 tools 커밋은 importer(emit)+materialize(resolve)가 **결합**이라 반드시 한 커밋(하나만 land 시
  materialize가 URL을 못 열어 stub로 깨짐). 스코프 밖 memo(`corpus-persist-...` supersede 배너)·
  `docs/plans/*`는 브리프 명시 목록대로 **제외**하고 이상으로 보고.

## 관련
[[materialize-regression-check]](worktree 회귀 기법·lock 제외 불변식) · [[recipe-land-staging-to-published]] ·
[[importer-independent-verify]] · [[recipe-catalog-glob-land]](`--check` 드리프트 가드).
