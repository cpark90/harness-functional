# Q1 — tools/lint_uniformity.py (저작 통일성 린터)

`validate.py`(그래프 정합성)와 직교하는 **저작 규약 준수** 린터. 재발방지 CI 게이트용.
핵심 계율: **오탐 0** — 각 규칙을 특정 ONTOLOGYSTYLE §에 앵커하고 그 §가 실제 요구하는 scope만 검사.

## 5개 검사 + § 근거 + scope
1. **tokenEstimate (§1c)** — 유일한 실질 가치(SHACL 미강제). scope는 **조건부**: {SystemPrompt,
   Instruction,Guardrail,Example}는 `ho:promptText` **보유 인스턴스에만** 요구(promptText 없으면
   projection 텍스트 0→면제), {Tool,Workflow}는 **무조건**. ★B-Note2 정밀화: 상수 2분리
   `TOKENESTIMATE_PROMPTTEXT_CLASSES`/`_UNCONDITIONAL_CLASSES`, promptText 없으면 `continue`.
   구정책(4클래스 전인스턴스 무조건)은 promptText-less 노드 생기는 날 오탐(현재 그런 노드 0이라
   결과 불변, latent). PromptSection·WorkflowStep·AreaOfObservation(→observedTokenVolume, §3 별개축) 제외.
2. **naming prefix (§2표)** — id:개체 slug이 클래스별 접두사(role-/gr-/cap-/fp-/chan-…). PREFIX_MAP 하드코딩
   (§2표 원본). 싱글턴 EnvironmentSpace→`env-space`/GlobalState→`global-state`는 SINGLETON_NAMES 정확매칭.
   slug=`re.split(r'[/#]',iri)[-1]`. leaf타입=`lib.most_specific_types` 중 매핑된 것 하나라도 매치하면 OK.
3. **language (§1d)** — 검색값 skos:prefLabel/definition/altLabel에 Hangul=위반(그 값들은 영어).
   Hangul regex=`[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿ힰ-퟿]`(syllable+jamo+compat+ext). 산문(rdfs:comment)은 대상 아님.
4. **maturity** / 5. **definition (§1d)** — scope를 **shapes에서 파생**(하드코딩 금지, drift방지):
   `_derive_required_classes(shapes,pred)`=targetClass별 property 중 sh:path==pred & minCount≥1인 클래스.
   maturity 요구=9클래스(Agent/AoI/AoO/FP/GlobalState/Hook/Memory/OS/TestScenario), definition 요구=Memory뿐.
   이미 SHACL 강제라 보통 0 — SpecConcept 계열 면제(C-0의 58누락)를 자동 존중, Guardrail은 promptText 본문이라 def 면제.

## 함정/판정
- ★ **blanket "누락" 금지**: C-0 감사가 tokenEstimate 98/maturity 58/definition 56 누락은 대부분 §범위 밖 정당노드, **명시범위 위반=0**이라 판정. 린터가 이걸 오탐하면 노이즈=실패. scope 인코딩이 전부.
- 검증법: 클린 baseline=5축 전부 0/PASS(C-0 일치) + **인메모리 negative control**로 각 축 1건 주입→정확히 1탐지(teeth 증명, 교차오염 없음). 둘 다 있어야 "scope 정확".
  tokenEstimate 조건부 teeth: (a)promptText有 Guardrail서 tokenEstimate제거→1탐지(진짜위반유지),
  (b)promptText無 Guardrail 무-tokenEstimate 주입→0(오탐제거), (b2)Tool 무-tokenEstimate→1(무조건유지). `base + Graph()`로 주입.
- 코드 패턴=validate.py 미러(`import ontology_lib as lib`, `_print_header`, reasoned load, 카테고리별 함수→main 요약, viol 있으면 exit 1). shapes는 별도 Graph 파싱(data graph에 안 섞음, lib 관례).
- ontology/TBox/shapes 무변경 — 읽기전용. CI 배선은 별도 범위.
