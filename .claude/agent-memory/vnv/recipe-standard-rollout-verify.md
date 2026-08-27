# RECIPE_STANDARD rollout 검증 재현 절차

15-recipe FailurePolicy 백필(①) + 53-recipe fleet conformance(②) + spec-fidelity flag(③).

## 셋업 (wave15 메모와 동일)
`ln -sfn <central> central` in harness-recipes → `HARNESS_CATALOG=$PWD/catalog-v001.xml
PYTHONPATH=<central>/tools` → per-recipe `HARNESS_ROOT_ONTOLOGY=…/recipes/<n> /usr/bin/python3
central/tools/validate.py`. 끝에 `rm central`. 53개 validate 스윕은 ~2분+ → **background로**.

## ① fp 백필 판정법 (rdflib node-level)
- 중앙 fp 세트 = `subjects(RDF.type, HO.FailurePolicy)` on central abox glob (8 archetypes).
- dangling = bound `core:fp-*` ∉ 중앙세트. **B23 = 같은 subject가 `specializes core:fp-*` AND 리터럴에
  "no central archetype" 텍스트 공존**(정의만 말고 모든 Literal object 스캔). 백필 15개 전부 0.
- **B23 정올 판별**: negation-text 있는 local fp는 specializes=[] 이어야, specializes 있는 건
  negation-text=False 이어야. 25/36 fp가 review-critical-rework specialize(=refinement, no-claim).
- local fp 구조 = ≥1 failureCondition + ≥1 recoveryStrategy.
- **fabricate=0 증명**: 손상소스(27/88) verbatim(inthisbefore 토큰)+accepted-omission이 comment와 일치;
  clean(41) local fp가 source `## Error Handling` 행과 1:1(No LLM API key/No RAG/No eval dataset).

## ② fleet conformance
- **★핵심 발견: 실제 `ho:HarnessShape`(shapes/harness-shapes.ttl:21)는 prefLabel+Domain+Task+
  SystemPrompt+Workflow만 강제** — Tool/Guardrail/ModelConfig는 강제 안 함. 그래서 importer skeleton
  (usesTool/hasGuardrail/usesModel/requiresCapability/tagged 미바인딩)도 validate PASS.
- **importer는 의도적으로 HarnessShape-incomplete skeleton emit**(import_corpus.py:36,606 docstring;
  judgment binding 유보+FLAG). 백필 15개 = fresh skeleton이라 §1 hard-core 10개 중 5개 결여 → 38/53.
- **∴ RECIPE_STANDARD §0(usesTool 등 53/53)·§1(SHACL가 Tool/Guardrail/Model 강제) 둘 다 부정확** =
  이번 rollout이 shipping한 standard 문서와 fleet 실제의 내부 불일치 = **CONCERN**(graph 결함 아님).
- lint: 중앙 `lint_uniformity` check 함수(check_token_estimate/naming_prefix/language) import해서 각
  recipe **standalone graph**에 직접 호출(린터 CLI는 ONT_DIR=중앙만 봄). 3축 0/53.
- run-behaviour 커버리지 rdflib 집계: Role/Instr/ExecMode 51, TestScenario 44, FailurePolicy 49.
  reduced-profile 예외 2 = techdoc+contract-demo(roles 0). specializes 51/53(non-core target 0).
  unlinked role(per recipe)=anti-drift conservative skip(정당). §2 accepted-reason는 header FLAG의
  SCENARIO-MISSING/FAILURE-MISSING 주석으로 존재(14/27/28/43/52/55).
- §5 fix landed: scenario prefLabel case(81/82/87/90), contract-*→ct-*(contract-demo).

## ③ spec-fidelity flag (27)
- importer heading regex `^##\s+error handling\b`/`^##\s+test scenarios?\b`(IGNORECASE,
  import_corpus.py:330,333). 27 source 헤딩=`## error`/`## test`(word-drop)→section_body miss→
  FAILURE/SCENARIO-MISSING 오탐이 **진짜**. 교정 타당(fp=중앙 IRI 재사용만=fabrication 0; scenario는
  word-salad라 미복구=옳은 비대칭). importer 경화=중앙 tools 후속(recipe 범위 밖, rollout 미차단).
- **nit**: 27 top-of-file FLAGS는 여전히 "FAILURE-MISSING…left unbound"(fp 바인딩됨 → stale, body와 모순).

## 판정
PASS-with-CONCERN. ① clean, ③ 타당, ② green+lint 0 이나 15/53가 §1 hard-core 5술어 결여 →
standard 문서 §0/§1 정정 또는 skeleton-draft tier 명문화 필요(orchestrator 결정). 리포트:
docs/verify/recipe-standard-rollout-verify.md.

## FINAL re-verify (canonicalization close-out) — spec-number trap
`ho:` NS in recipes = `https://harness-ontology.dev/schema#` (NOT `/ho#`) — wrong NS ⇒ 0 harnesses, silent.
- **hard-core parity 재현**: 15 skeleton harness 노드 5술어(usesTool/hasGuardrail/usesModel/
  requiresCapability/tagged) = 5/5 each; 74 role = roleTool/roleGuardrail/roleMemoryPolicy/tagged
  전수. 전 53 hard-core = 53/53(techdoc/contract-demo 포함 — 이들 reduced-profile은 Role/Instruction/
  execMode이지 hard-core 아님).
- **parity diff vs baseline 96**: required-core diff=0; 잔차는 optional(altLabel 31/appliesPattern 38/
  hasChannel 36 /53 — 구형 38만) + 12/74 role의 의도적 specializes-skip 뿐. subset(roleTool⊆usesTool)
  0위반, dangling 0, dup-label 0, untyped 0, text-node tokenEstimate miss 0.
- **함정: spec 정정이 §0 run-behaviour 숫자를 새로 틀리게 씀.** 실측 vs §0 주장 대조 필수:
  execMode 51(주장52), testScenario 44(주장51, off-by-7), failurePolicy 49(주장52). §2가 스스로
  적은 9개 scenario accepted-omission과 §0가 모순. SHACL 과장은 고쳐짐(HarnessShape floor=5술어
  prefLabel/targetsDomain/addressesTask/hasSystemPrompt/hasWorkflow, spec §0L40-47·§1L79-92 정합).
  **교훈: spec 수정 시 SHACL줄만 보지 말고 §0 coverage 숫자 전부 rdflib 재집계.**
- **gate6 role tokenEstimate**: 비결함 — Role은 §1c tokenEstimate 범위 밖(linter가 Role 면제,
  runtime크기는 observedTokenVolume 별도축). baseline 96도 roleMemoryPolicy+tokenEstimate 동반.
- 리포트: docs/verify/recipe-standard-final-verify.md.
