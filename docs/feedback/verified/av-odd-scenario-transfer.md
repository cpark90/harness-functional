---
source: docs/feedback/av-odd-scenario-transfer.md
verdict: apply-plan-ready   # 사용자 선택(A/B/C/D) 대기 — 선택 즉시 wave brief 분할 가능
targets: [tbox:ho:, id:h-coding, id:h-multiagent, ontology/abox/core, recipes, docs/verify]
kind: ripple-analysis
graph_baseline: validate.py PASS, lint cap 260 tok, 개체 ~245+, PREFIX_MAP 27종
evidence: docs/feedback/inquiries/av-odd-scenario-transfer.md (형식·출처·검증수준은 이 문서 기준)
---
# 검증 보고 — AV ODD·시나리오 형식 이식의 파급 분석

구상(inbox 항목)을 현행 그래프·도구·규약에 실측 대조. 요지: **개념적 충돌은 없고**(오히려
Dec-POMDP 관측 사슬이 AV의 scene/situation/scenario와 거의 1:1), 파급은 **registry·개체 수·
투영 예산** 세 곳에 집중된다. 설계 선택 2건은 repo 선례가 이미 정답을 가리킨다.

## 1. 현행 대응물 실측 (이미 있는 것 / 없는 것)

| AV 형식 | 현행 | 판정 |
|---|---|---|
| scene / situation / scenario | `global-state` / ObservationSpace·AreaOfObservation / 궤적 | **이미 동형** — 신설 금지, 용어 정합만 문서화 |
| OD / COD | `env-space`(무한 원천) / `global-state`(도메인 내 전체 상태) | 실존 — envelope는 이 사슬의 **빠진 중간 고리** |
| ODD 선언 | `ho:targetsDomain`·`ho:addressesTask`가 **라벨 수준**(dom-coding 등은 prefLabel+salience뿐) | 빈자리 |
| ODD의 include/exclude 경계 | **`ho:triggerPhrase`/`ho:outOfScope` 쌍이 TBox에 실존** — 자유문 활성 경계. 그러나 **ABox 0건·staging 0건·도구 소비 0건·shapes 0건**(전수 실측) | **죽은 씨앗 — 정리 필수(아래 3-⑧)** |
| ODD exit | `ho:FailurePolicy` 있음(내부 고장만) | 값 확장 필요 |
| 자율성 등급 | `c-autonomy` 개념 1개(산문 정의) | 형식 부재 |
| catalog + 특수화 | `ho:derivedFrom` 실존, recipe 레인 실존 | **이미 동형** — ParameterAssignment 기록만 추가 |
| 태그 검색 | `ho:tagged` + retrieve 랭킹 | 부분집합 의미론·구조화 payload 부재 |
| 커버리지 감사 | coverage-audit 게이트(산문 규칙) | 정량화·의무등급·Type II 부재 |

## 2. 설계 선택 2건 — repo 선례가 결정한다

**(가) OperatingEnvelope는 HarnessComponent인가 Specification인가 → 컴포넌트로.**
근거: TestScenario·FailurePolicy·Agent가 모두 "주어가 Harness 자신"이라는 이유로
`ho:hasX subPropertyOf ho:hasComponent`로 들어왔고, 그 덕에 `ComponentConnectivityShape`가
anti-orphan을 자동 커버한다. Envelope도 같다 — `ho:hasEnvelope`(subPropertyOf hasComponent).
하위 노드(EnvelopeStatement/EnvelopeRule)는 **propertyChainAxiom**으로 롤업
(`hasComponent o hasEnvelope o hasEnvelopeStatement`) — WorkflowStep·PromptSection·
AreaOfObservation가 쓰는 기존 패턴 그대로. 전용 shape 불요.

**(나) autonomyTier는 Concept인가 클래스인가 → `ho:AutonomyTier` Specification leaf로.**
근거: `ho:ExecutionMode`가 정확히 같은 성격(하네스가 선언하는 비-컴포넌트 명세, `mode-` 접두사,
Specification 하위)이며 4종 개체로 잘 돌고 있다. tier는 슬롯 4개(execution/oversight/fallback
owner + envelope binding)를 **데이터로** 들고 있어야 SHACL로 tier⇒capability 함의를 검사할 수
있으므로, 개념(skos) 태그보다 명세 leaf가 맞다. 접두사 `tier-` 신규 등록 필요(아래 3-①).
반면 HITL/HOTL/HOOTL과 knowledge-area·abstractionLevel·environmentLayer는 **개념(skos)** 층으로
충분 — 클래스 증식 금지.

## 3. 파급 (실측 기반 — 반드시 같은 커밋에서 처리)

1. **registry 3중 갱신**: 신규 클래스는 (a) `tools/lint_uniformity.py` `PREFIX_MAP`,
   (b) `ONTOLOGYSTYLE.md §2` 클래스·접두사 표, (c) `validate.py`의 `INSTANCE_CLASSES`에
   **동시** 등록해야 한다. 과거 감사에서 **미등록 7클래스/32개체**가 조용히 새던 이력이 있고,
   최근에도 §2 표와 린터 사이 silent divergence가 잡혔다. 신규 접두사 제안:
   `env-`(OperatingEnvelope; 단 `env-space` 싱글턴과 충돌 주의 → **`oe-` 권장**),
   `es-`(EnvelopeStatement), `er-`(EnvelopeRule), `tier-`(AutonomyTier), `orc-`(Oracle),
   `svar-`(ScenarioVariation), `tc-`(TriggeringCondition), `fi-`(FunctionalInsufficiency).
   **충돌 실측 완료**(린터 `startswith` 매칭 기준, 현행 32 접두사 전수 대조): 위 후보 9개 모두
   기존 접두사와 중복 없음·상호 포함 없음. 단 `env-`는 싱글턴 `env-space`(EnvironmentSpace)와
   기계적 충돌은 없으나(싱글턴은 자기 타입의 `SINGLETON_NAMES`로만 검사됨) **가독상 형제로
   오독**되므로 `oe-` 권장.
2. **개체 수 폭증 위험 — restrictive 기본값이 방어선**: 하네스×속성으로 곱하면 7×30=210 개체가
   되어 245 그래프를 2배로 부풀린다. 완화 3중: (a) **restrictive 기본이므로 include 판정만
   명시**(exclude는 기본값이라 생략 — ISO 34503 restrictive 형식을 채택하는 실질 이유가 이것),
   (b) 중앙 KG에는 **대표 2종**(h-coding·h-multiagent)만 선언, 나머지 하네스는 recipe 레인,
   (c) **속성 스킴은 중앙 / 선언은 recipe**라는 층 분리(PAS 1883이 taxonomy와 시스템별 ODD를
   나눈 그대로). 이 셋을 지키면 중앙 증가분은 ~40개체.
3. **투영(retrieve) 예산 파급**: envelope 노드가 팩에 쏟아지면 노이즈다. 처방: envelope
   하위 노드는 `ho:salience` 낮게 + `tokenEstimate` 작게 저작하고, 하네스 조회 시 envelope을
   **요약 1노드로 투영**하는 것을 후속 과제로 남긴다(이번 wave 범위 밖 — brief에 명시).
   최근 land한 **영역당 1선별** 로직과 상호작용 없음(alternativeOf 미사용).
4. **린터 cap(260 tok)**: envelope statement류는 소형이라 무해. 단 `ho:AutonomyTier` 정의는
   슬롯 4개를 산문으로 쓰면 초과 위험 — 슬롯은 **데이터 술어로 빼고 정의는 짧게**.
5. **determinism 게이트**: 새 술어는 정렬 키(score→maturity→IRI)에 개입하지 않음 — 무영향.
   단 ScenarioVariation의 seed/runCount는 **저장값**이어야 하며 실행 시 난수 생성 금지(팩
   결정성 유지).
6. **materialize 파급**: 하네스 트리 산출물에 envelope을 렌더할지는 **별도 결정**. 렌더하면
   "이 하네스가 다루는 범위"가 생성 문서에 명문화되어 가치가 크지만 byte-identity 회귀 검사
   대상이 늘어난다 → W4(recipe) 이후로 미룰 것.
7. **harvest 항목과의 술어 경계**: 승인된 harvest의 `ho:approvalScope`·`ho:attachesAt`·
   `ho:environmentFidelity`와 envelope 술어가 의미상 인접하다. **경계 명문화 필수**:
   approvalScope=승인 게이트의 적용 단위, attachesAt=가드레일 부착 시점, environmentFidelity=
   환경 충실도, envelope=하네스가 감당한다고 **선언한 범위**. W1 brief 첫 항목으로 지시.

8. **기존 죽은 어휘 정리 — 이번 이식의 필수 동반 작업**: `ho:triggerPhrase`/`ho:outOfScope`는
   자유문 include/exclude 경계로 **의미가 겹친다**. 새 `EnvelopeStatement[verdict]`를 그냥 얹으면
   근사동의어 2쌍이 공존해 golden rule 2 위반 + 저자 혼란이 확정된다. **W1 brief에서 택일을
   강제**할 것: (a) 자유문 쌍을 envelope의 **서술문 투영(생성물)** 으로 재정의(AVSC 이중 표현
   패턴; 이 경우 정의문에 "생성물이며 손으로 저작 금지" 명기), 또는 (b) **같은 커밋에서 제거**
   (B9 선례: 폐기=제거, 추적성은 git). 어느 쪽이든 §2 표·registry 동반 갱신.

## 4. 반영 인벤토리 (선택 A 기준; B/C는 부분집합)

### W1 — 형식 뼈대 (권고 선행)
- **TBox**: `ho:OperatingEnvelope`/`ho:EnvelopeStatement`/`ho:EnvelopeRule` + `ho:hasEnvelope`
  (subPropertyOf hasComponent) + chain axiom + 술어 6(`envelopeDefault`·`envelopeAttribute`·
  `envelopeVerdict`·`envelopeThreshold`·`envelopeObservable`·`ruleCondition`/`ruleEffect`);
  `ho:AutonomyTier` + `ho:autonomyTier`(maxCount 1) + 슬롯 4 데이터 술어;
  failureCondition 값에 `envelope-exit` 추가.
- **shapes**: (a) EnvelopeStatement는 `envelopeObservable`을 **반드시** 가진다(측정가능성 —
  이 이식의 핵심 이빨), (b) tier⇒capability 함의(harness fallback ⇒ safe-halt 제공;
  user fallback ⇒ 개입 채널 존재), (c) tier가 있으면 envelope도 있어야 한다(usage
  specification 규칙), (d) envelopeDefault는 닫힌 값.
- **ABox**: envelope 속성 개념 ~30(3분지: 기반/조건/동적요소, skos:broader로 scheme 연결),
  tier 개체 6, `fp-envelope-exit`·`gr-envelope-check`·`gr-envelope-unknown`·
  `gr-transient-hysteresis`, `h-coding`·`h-multiagent`에 **실제 envelope 선언 + tier 선언**.
- **vnv 게이트**: validate·lint·determinism + **negative control**(관측자 없는 statement FAIL,
  tier만 있고 envelope 없으면 FAIL, harness-fallback tier인데 safe-halt 미제공이면 FAIL) +
  범위이탈 시나리오 2건 실행.

### W2 — 시나리오 형식
TestScenario 술어 5(`abstractionLevel`·`scenarioParameter`·`usesEnvironment`·`knowledgeArea`·
`scenarioSource`) + `ho:Oracle`(등급형 판정 4단) + `ho:ScenarioVariation`(분포+seed+runCount) +
개념 스킴 3(환경 6층·knowledge-area 4·abstractionLevel 3) + 기존 `scn-*` 2건 재표현(회귀 0 확인).

### W3 — 검증 레인 (스키마 파급 없음 — 저비용)
`docs/verify` 템플릿을 GSN 구조로(Goal/Strategy/Solution/Context/Assumption + 종결 규칙) +
coverage-audit에 의무 4등급·"범위 밖이라 해당 없음" 정식 응답·Type I/II 이중 커버리지 +
**SPI(판정 만료 조건)** 필드. 최근 verify 1건 재작성으로 누락 검출력 실증.

### W4 — recipe
recipe별 envelope 선언 파일(판정표 + 생성된 서술문) + `harness-qualification` recipe(8단계,
각 단계 목표/입력/요구/산출물 4구획) + **배정 정책**(전량 저위 tier → 임계만 승격 → production은
발견 전용) + 시나리오 DB 메타데이터 + discovery loop. staging→published lane·catalog/CI 동반.

### W5 — 생성 파이프라인 (후속 판단)
TBox 카디널리티에서 유효 구성 열거 → 가지치기(SHACL) → 환경 순열. **감사는 생성물이 아니라
계층 지식에** 하는 원칙 채택.

## 5. 위험·완화

- **최대 위험 = 도메인 오염**: ODD/DDT/MRC 같은 약어와 "레벨 N" 서열 라벨이 prefLabel에 새면
  중립 부품 원칙이 깨진다. 처방: 라벨은 전부 **중립어**(operating envelope / task share /
  safe-halt state / responsibility allocation), 정의는 자기 문장, 출처는 `dct:source` 주석으로만.
  W1 brief에 금지어 목록을 명시할 것.
- **과대 이식 위험**: 물리 안전의 정량 위험 수용 기준(ALARP/MEM·충돌 심각도)은 자리만 빌리고
  내용은 maturity 등급별 기준으로 대체. 안전 주장으로 읽히는 문구 금지.
- **라이선스**: 유료 표준(ISO·SAE·UL·BSI)은 구조·방법만 재기술. 공개 아티팩트(OpenLABEL 스키마·
  A.U.T.O. MIT·GSN CC-BY·ASAM HTML·PEGASUS)만 형태 참조. 개체에 verbatim 금지.
- **스택 역수입 금지**: AV의 OWL-DL+SWRL 스택을 흉내 내지 말 것 — 우리 SHACL 폐쇄세계 검증이
  이 축에서는 앞서 있다(조사에서 확인). 바꾸지 않는다.

## 6. 권고

**(B) W1 선행**을 권고한다. 이유: envelope+tier가 나머지 전부의 전제이고(시나리오·커버리지·
검증 서사가 모두 "선언된 범위"를 참조한다), 규모가 통제 가능하며(중앙 ~40 개체), **실증
가능한 게이트**(범위이탈 negative control)로 이식 가치가 즉시 측정된다. **(C) W3**은 스키마
파급이 없어 W1과 **병행 가능** — 두 개를 동시에 돌리는 것도 합리적 선택이다.

## 적용 결과 (orchestrator 기록란 — 적용 후 채움)
(미기록 — 승인 대기)
