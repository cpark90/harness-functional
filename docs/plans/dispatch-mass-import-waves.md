# Dispatch brief (공통) — harness-100 대량 임포트 Wave A~G (신규 30 recipe)

> 작성: orchestrator (2026-07-25). 상위: `harness-100-scaleup-plan.md` §6 · `harness-100-attribute-inventory.md` §3c.
> 사용자 지시: "대량 임포트까지 마저 진행". 실행: **developer dispatch (opus), wave별 1개**.
> 선행: B21(importer 3축 확장) land 완료 후. **importer는 확장본을 쓴다**(TestScenario/FailurePolicy 자동 추출).

## 대상 30 (파일럿 5 제외) — wave = 인벤토리 카테고리
- **A** dev/infra: `17-mobile-app-builder` · `18-api-designer` · `28-security-audit`
- **B** data/ml: `32-data-analysis` · `33-text-processor` · `35-api-client-generator`
- **C** content: `02-podcast-studio` · `07-comic-creator` · `09-documentary-research` · `14-translation-localization`
- **D** business: `43-startup-launcher` · `48-sales-enablement` · `51-investor-report` · `55-rfp-responder`
- **E** education: `56-language-tutor` · `60-debate-simulator` · `62-adr-writer`
- **F** legal: `69-privacy-engineer` · `70-legal-research` · `72-regulatory-filing`
- **G** life/ops/comms/spec: `73-meal-planner` · `74-fitness-program` · `75-tax-calculator` · `81-technical-writer` ·
  `82-report-generator` · `87-crisis-communication` · `90-hiring-pipeline` · `95-procurement-docs` ·
  `96-real-estate-analyst` · `100-ip-portfolio`

## ★알려진 예외 (Wave A)
`28-security-audit`는 **소스가 mangled**(B21 발견: find-replace 토큰 깨짐, heading `## test`로 degrade). importer가
SCENARIO/FAILURE-MISSING flag를 낸다(날조 안 함). → 28은 run-behaviour 축을 **미표현+사유 주석**으로 두거나
소스를 손으로 보정. **지어내지 말 것.** (27/29/30도 mangled이나 대상 아님.)

## Wave 실행 (developer, 각 wave)
각 대상 recipe에 대해:
1. `tools/import_corpus.py /home/cpark/git/harness-100/en/<name> --out staging/harness-recipes/recipes/<name>/`
   → draft TTL(skeleton·role·persona·instruction·execMode·TestScenario·FailurePolicy + flag 헤더).
2. **판단성 엣지 채움(리뷰)** — importer가 flag한 것만, 기존 파일럿(21-code-reviewer 등)의 바인딩 패턴을 참고:
   - **hard block(필수)**: `ho:targetsDomain` + `ho:addressesТask` — 기존 중앙 도메인(`core:dom-coding`/`dom-research`/
     `dom-support`/`dom-design`)이 맞으면 **재사용**, 아니면 recipe-local `id:dom-*` 1개 저작(D1: 카테고리 도메인은
     recipe-local 허용, 중앙 오염 금지). Task도 동일.
   - **enrichment**: `usesTool`+per-role `roleTool`(least-privilege; 코퍼스는 문서생산이라 file-edit 지배, code-exec~0) ·
     `hasGuardrail`+`roleGuardrail`(기존 `core:gr-*` 재사용) · `requiresCapability`+provider 짝(미충족 hard stop) ·
     `appliesPattern`(`core:pat-orchestrator-workers` 등) · `hasChannel`(`core:chan-workspace` 등) ·
     QA-gate collapse 판단(terminal reviewer를 `core:role-synthesizer`로 승격 vs 로컬 유지 — 파일럿 16처럼 test-worker면 로컬).
   - **어휘 발명 금지**: 새 `ho:` 클래스·프로퍼티 0. 신규 도메인 concept 필요시 recipe-local + flag. 중앙 `core:` 부품
     재사용 우선(`retrieve.py`로 확인).
3. **maturity "draft" 유지**(미검토 30개가 authoritative로 보이지 않게). persona/instruction 본문은 외부 `artifactTemplate`
   참조 — **이제 importer가 canonical GitHub URL**(`https://github.com/revfactory/harness-100/tree/main/en/<name>/...`)로
   자동 emit한다(로컬경로 수정 land 후). **산출에 `/home/cpark` 0**을 wave 게이트로 확인. 수동 저작분도 canonical URL만.

## ★선행 remediation (waves 前 필수)
- **R1. importer 로컬경로 수정** — importer가 `artifactTemplate`를 로컬 절대경로로 emit하던 결함 수정(canonical URL).
  이게 land돼야 waves가 노출을 복제하지 않는다. **(수정 dispatch 진행 중.)**
- **R2. 기존 파일럿 5개 published 스크럽** — `21`·`03`·`16`·`31`·`46`의 published TTL에 로컬경로 8~9줄씩 잔존
  (`/home/cpark/git/harness-100/...`, 커밋 `36bd431` 유래). lpranging과 같은 노출 클래스 → canonical URL로 치환.
  inspection이 published repo에서 수정·push. **waves와 병행 가능(파일 안 겹침).**

## 완료 게이트 (wave별, 로그)
```bash
# per-recipe closure — ★all-recipes union 금지
for r in <wave recipes>; do
  HARNESS_CATALOG=$PWD/staging/harness-recipes/catalog-v001.xml \
  HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/$r /usr/bin/python3 tools/validate.py  # PASS
  /usr/bin/python3 tools/materialize.py <recipe harness> ...   # 섹션 렌더 + 2회 결정성
done
/usr/bin/python3 tools/gen_recipe_catalog.py --check   # 신규 dir → catalog 재생성 필요하면 write 후 재확인
/usr/bin/python3 tools/validate.py     # 중앙 PASS @223 (중앙 개체 무변경)
```
- **중앙 무회귀**: 중앙 하네스 7종 산출물 byte-identical(recipe만 추가). recipe가 중앙 slug 선점 안 함(federate closure 델타로 확인).
- **catalog**: 신규 recipe **디렉토리**가 생기므로 `gen_recipe_catalog.py`로 재생성(P0-b glob) — 손 편집 금지.

## 금지
중앙 `ontology/**` 편집 금지 · 코퍼스 쓰기 금지 · **로컬 절대경로 emit 금지** · `docs/**` 편집 금지 · **git 조작 금지**.
범위 = `staging/harness-recipes/recipes/<wave>/**` + 필요시 생성된 catalog.

## 반환 보고 (wave별)
① recipe별 생성 노드·판단성 바인딩(domain/task/tool/guardrail/capability·QA-gate 결정) ② flag 처리(28 mangled 등)
③ federate 로그 + materialize ④ 중앙 byte-identity ⑤ 로컬경로 0 확인 ⑥ GAP.

종료 전 `.claude/agent-memory/developer/`에 재사용 지식(기존 보존).
