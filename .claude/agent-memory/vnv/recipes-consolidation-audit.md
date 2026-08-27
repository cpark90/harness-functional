# recipes 전수 통합·format 감사 재현 절차

53 recipe(harness-recipes/recipes/*) cross-recipe 중복통합(축①)+format(축②) 감사.

## 데이터 추출
- 각 recipe `*.ttl`을 **standalone parse**(union 금지) → `id:<recipe>/` 주체만 로컬 노드로.
  rdflib 셸python3엔 없음 → `/usr/bin/python3`. 클래스 히스토그램·prefLabel/promptText/definition 수집.

## 축① 중복 탐지 (3-패스, 오탐 방지)
- **exact-normalized** full-text(promptText/definition, len≥25) 버킷 → cross-recipe dup. **byte 신호**.
- **Jaccard word-set** union-find J≥0.85(근사) + J≥0.60(스킨) cross-recipe pair.
- **recipe-local vs 중앙 core 텍스트** J≥0.75 대조(축①-b: 재저작-of-central 탐지).
- **결과(2026-07)**: 실질텍스트 dup 전부 **0**. persona/instruction/role/concept가 "비슷해 보여도"
  J<0.60 = importer template skeleton 공유일 뿐(neutral-parts 대전제). **통합 후보 0건**.
- 유일 near-cluster=FailurePolicy refer-to-expert 3종(fp-legal-judgment/review/tax) J0.60~0.70 →
  이미 `ho:specializes core:fp-refer-to-expert`로 중앙 라우팅=**(b)+(c) KEEP**(통합규율 작동 증거).
- TestScenario scn-error/normal/existing-file 대군집=**prefLabel skeleton만** 공유(importer 상수 라벨),
  scenarioPrompt/Expected 본문은 도메인 특화=**(c) instance-local KEEP**.
- Guardrail/Channel/Workflow/ModelConfig/Pattern **local 0**=전부 중앙 IRI 참조=이미 완전 통합.

## 축② format teeth (standalone 재구현 = 린터와 동일 판정)
- PREFIX_MAP은 central `tools/lint_uniformity.py:106-118`, Hangul regex `:126` **그대로 복제**해
  recipe-standalone으로 돌림(린터는 ONT_DIR=중앙만 봄·HARNESS_ROOT_ONTOLOGY 무시라 recipe엔 직접 재구현).
- 3축(prefix§2/language§1d/tokenEstimate§1c scope) **0/53**. contract-* prefix drift는 ct-로 수정확인됨.
- 배너 `####` 53/53. **metadata=provenance 계열별 내부일관**: importer 50=source+license(Apache-2.0),
  handmade 3(contract-demo/lpranging/techdoc)=둘다 없음(first-party, 귀속불요)=결함 아님.
- **cosmetic 1건([지킴] 밖)**: scenario prefLabel 대소문자 drift — 5 recipe(81/82/87/88/90)가
  sentence-case("Error flow"), 34는 Title-case("Error Flow"). §1d는 English만 요구→규약위반 아님, 선택 정규화.

## grounding
- 대표 closure validate: `ln -s <central> ./central` → `HARNESS_CATALOG=catalog-v001.xml
  HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<r> /usr/bin/python3 central/tools/validate.py`
  → PASS 확인 → **rm central**(.gitignore가 /central/ 무시). techdoc/88/21/100 전부 PASS.
- **함정**: `grep -q dct:source` 는 주석 "no dct:source" 오탐 → `grep -E '^[^#]*dct:source'`로 triple만.
- 작업tree 미커밋 wave import 다수=감사는 on-disk 기준, 커밋은 inspection.
