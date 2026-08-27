# Q1 — tools/lint_uniformity.py (저작 통일성 린터)

`validate.py`(그래프 정합성)와 직교하는 **저작 규약 준수** 린터. 재발방지 CI 게이트용.
핵심 계율: **오탐 0** — 각 규칙을 특정 ONTOLOGYSTYLE §에 앵커하고 그 §가 실제 요구하는 scope만 검사.

## 6개 검사 + § 근거 + scope
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

6. **text cap (§1c)** — 한 노드 `ho:promptText`+`skos:definition` **전 값 합**이 `TEXT_CAP_TOKENS=260`
   초과면 위반. metric=**chars//4**(`_text_tokens`), 즉 `ho:tokenEstimate` 산정과 **같은 계열** →
   §1c 안 token 단위 1개, 외부 tokenizer 불필요(결정론). 130–260=목표 대역(100–200 word 검색
   정밀도 최적대의 BPE 환산, `docs/feedback/inquiries/annotation-tooling-research.md` §5) —
   **하한은 권고라 미강제, 상한만 기계 강제**. scope=`lib.instance_nodes`(=INSTANCE_CLASSES) **abox 개체뿐**.
   ★ **TBox 제외가 load-bearing**: blanket이면 즉시 오탐 8건(ho:hasComponent skos:definition
   3566자=891 tok, AreaOfObservation 439, AssemblySection 404, Hook 329, Agent 327,
   ObservationSpace 280, sectionKind 270, AreaOfInterest 267) — 축·axiom 설명 산문은 retrieval
   단위로 projection되지 않는다. 단위 결정 이력: line(42) → whitespace word(500) → **chars//4 260**(사용자 결정 2026-08-27).

## 함정/판정
- ★ **blanket "누락" 금지**: C-0 감사가 tokenEstimate 98/maturity 58/definition 56 누락은 대부분 §범위 밖 정당노드, **명시범위 위반=0**이라 판정. 린터가 이걸 오탐하면 노이즈=실패. scope 인코딩이 전부.
- 검증법: 클린 baseline=5축 전부 0/PASS(C-0 일치) + **인메모리 negative control**로 각 축 1건 주입→정확히 1탐지(teeth 증명, 교차오염 없음). 둘 다 있어야 "scope 정확".
  tokenEstimate 조건부 teeth: (a)promptText有 Guardrail서 tokenEstimate제거→1탐지(진짜위반유지),
  (b)promptText無 Guardrail 무-tokenEstimate 주입→0(오탐제거), (b2)Tool 무-tokenEstimate→1(무조건유지). `base + Graph()`로 주입.
- text cap 경계 검증법: `base + Graph()`에 합성 Guardrail 1개 주입 — `1043자//4=260`→PASS,
  `1044자//4=261`→FAIL 1건(probe만). 합산성은 promptText 600자+definition 600자=300 tok 1건으로 확인.
  cap은 chars//4라 **경계가 4자 단위**(261 tok 최소=1044자)임에 주의. 현 그래프 headroom(2026-08-27,
  262개체): 최대 252(`mode-standing-service`)·245(`h-workspace-synthesis`)·238(`role-benchmarker`) —
  상위 다수가 240대라 cap 260은 여유가 얇다. 신규 저작 시 서두 중복 명제부터 제거.
- 코드 패턴=validate.py 미러(`import ontology_lib as lib`, `_print_header`, reasoned load, 카테고리별 함수→main 요약, viol 있으면 exit 1). shapes는 별도 Graph 파싱(data graph에 안 섞음, lib 관례).
- ontology/TBox/shapes 무변경 — 읽기전용. CI 배선은 별도 범위.
