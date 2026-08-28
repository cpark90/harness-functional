---
status: answered      # 사용자 요청 구상 (2026-08-28) — orchestrator/사용자 소비 후 closed
targets: [tbox:ho:, id:h-coding, id:h-multiagent, id:env-space, id:global-state, ontology/abox/core, recipes, docs/verify]
related: [docs/feedback/inquiries/sim-hil-coding-harness-research.md, docs/feedback/verified/sim-hil-coding-harvest.md]
retention: 이식 wave 완료까지 보존 — closed여도 제거 금지 (설계 원본)
---
# 구상 — 자율주행 ODD·시나리오 형식/방법론의 하네스 온톨로지·KG·recipe 이식

사용자 요청 (2026-08-28): "자율주행차량의 ontology, ODD와 scenario에 대한 형식 및 방법론을 이
프로젝트의 하네스 ontology와 knowledge graph, recipe에 적용할 방법을 구상."

조사: 워크플로 `wf_4ca0a54c-f64` (7축 중 6축 반환 — ODD 형식 / 시나리오 방법론 / ASAM OpenX 형식 /
AV 온톨로지 구축 / SOTIF·safety case / J3016; prior-transfer 축은 재개 중). 1차 소스 검증:
ASAM 공개 HTML 스펙(OpenODD 1.0.0·OpenSCENARIO XML 1.4.0·DSL 2.2.0·OpenDRIVE 1.9.0·OpenLABEL
스키마), ISO 34501/34502/34504 공개 프리뷰, PEGASUS 공개 자료, J3016_202104 공개 미러 전문,
UL 4600 저자 공개 초안, GSN 공개 매뉴얼, A.U.T.O.(MIT), 학술 논문.

> **라이선스 규율**: ISO/SAE/UL/BSI는 유료 문서 — **구조와 방법만** 우리 문장으로 재기술한다
> (verbatim 금지). 공개 출처 우선: ASAM HTML 스펙·OpenLABEL 스키마/TTL·PEGASUS PDF·PAS 1883
> (무료 등록)·GSN(CC BY 4.0)·A.U.T.O.(MIT)·arXiv 논문.

---

## 0. 요지 — 이 이식이 실제로 무엇을 주는가

AV 분야는 **"열린 세계에서 도는 자율 시스템을, 유한한 선언과 유한한 시나리오로 책임 있게
출시하는 문제"** 를 20년간 형식화했다. 그 형식은 우리 문제와 구조적으로 같다. 이식이 주는 것은
새 개념이 아니라 **이미 우리가 부분적으로 갖고 있는 것들을 하나의 뼈대로 묶는 조직 원리**다.

1. **하네스에 "선언된 운용 범위(operating envelope)"라는 1급 객체가 생긴다** — 지금은
   `ho:targetsDomain`·`ho:addressesTask`가 라벨 수준으로 흩어져 있고, "이 하네스가 감당하는
   범위"가 어디에도 기계가독으로 선언돼 있지 않다. ODD 형식(공유 taxonomy + 속성별 include/
   exclude + 조건부 규칙 + restrictive 기본값 + 측정가능성 규칙)이 이 빈자리를 정확히 채운다.
2. **범위 이탈이 1급 실패 조건이 된다** — J3016은 fallback 트리거를 딱 둘로 못박는다:
   내부 고장, **범위 이탈**. 우리 FailurePolicy는 전자만 다룬다. 후자를 도입하면 "요청이 이
   하네스 소관이 아님"이 임기응변 거절이 아니라 **선언된 recovery 사다리**(인간 인계 → 대기
   시한 → safe-halt)로 처리된다.
3. **자율성 등급이 능력 서열이 아니라 책임 배분 삼중항이 된다** — J3016의 핵심 설계는
   `(task-share, fallback owner, envelope binding)`이며 **선언되고 측정되지 않는다**. 이는
   승인된 harvest 항목의 autonomy 사다리(HITL/HOTL/HOOTL·Feng L1–L5)에 **형식**을 준다.
4. **TestScenario가 추상화 축·단계 스크립트·타입 oracle·변량 생성기를 얻는다** —
   functional→logical→concrete 사다리와 OpenSCENARIO의 storyboard/trigger/parameter-distribution
   구조가 그 형식이고, 이것이 승인된 G5(TestScenario 확장)의 설계 원본이 된다.
5. **커버리지 감사가 정량화되고 두 방향을 얻는다** — Type I(선언 범위를 시나리오가 덮는가)와
   Type II(실제 트래픽이 보여준 것을 덮는가), 그리고 태그 집합 부분집합 의미론(ISO 34504).
6. **검증 문서가 assurance case 구조를 얻는다** — GSN(Goal/Strategy/Solution + SupportedBy/
   InContextOf, 모든 잎이 증거에 닿을 때만 종결)과 UL 4600 prompt-element 의무 4등급, SPI
   (검증 유효성의 **만료 조건**)까지. 우리 `docs/verify/**`가 산문에서 구조로 승격된다.
7. **미지 실패 탐색이 방법론이 된다** — SOTIF의 known/unknown × safe/unsafe 4영역 회계와
   triggering condition → functional insufficiency(spec/performance) 인과 어휘, 그리고
   운영 데이터에서 시나리오를 채굴해 되먹이는 discovery loop.

**핵심 판단**: 이 이식은 **승인된 harvest 항목(B→A)과 중복이 아니라 그 상위 프레임**이다.
harvest가 부품 목록(무엇을 넣을까)이라면, AV 이식은 **형식과 절차**(어떤 모양으로 선언하고
어떻게 검증할까)를 준다. 겹치는 확장(environmentFidelity·oracle·shadow·autonomy 사다리)은
**신설이 아니라 AV 형식으로 구체화**한다 — §7 통합표 참조.

---

## 1. 중심 대응 (이 구상의 사전)

| AV 개념 | 하네스 대응 | 현 상태 |
|---|---|---|
| ODD (설계된 운용 범위) | Harness의 **선언된 운용 범위** | **씨앗만 존재 — 아래 주석** |
| ODD taxonomy (PAS 1883 / ISO 34503) | envelope 속성 **SKOS 스킴** | 부재 — 신설(어휘) |
| OD / TOD / COD / ODD 4분 | `env-space`(가능한 전부) / recipe 배치 대상 / `global-state`+요청 컨텍스트(지금) / 선언 범위 | 3/4 실존 |
| ODD exit → DDT fallback → MRC | **envelope-exit FailurePolicy** → 인간 인계(시한) → **safe-halt** | 부분(safe-halt는 harvest 계획) |
| failure mitigation strategy (택소노미 밖) | 플랫폼 watchdog — 하네스 밖 계층 | 부재(개념만) |
| J3016 level | **autonomyTier = (task-share, fallback owner, envelope binding)** | c-autonomy 있음, 형식 부재 |
| usage specification (level+ODD 쌍) | (autonomyTier, envelope) 쌍이 선언 단위 | 부재 |
| scene / situation / scenario | `global-state` 스냅샷 / ObservationSpace 투영 / 궤적 | **거의 완전 대응**(Dec-POMDP) |
| 6-layer scene 기술 | EnvironmentSpace **계층 기술 스킴** | 부재 — 신설(어휘) |
| functional→logical→concrete | TestScenario **abstractionLevel** | 부재 — G5로 계획 |
| OpenSCENARIO storyboard/trigger | 단계형 TestScenario(Init/Act/Event/Action + 조건) | 부재 |
| ParameterValueDistribution | **ScenarioVariation**(결정/확률 분포 + seed + runCount) | 부재 |
| OpenDRIVE ↔ OpenSCENARIO 분리 | Environment 산출물 ↔ 시나리오 스크립트(`usesEnvironment` 참조) | 부재 |
| catalog + ParameterAssignment | 부품 라이브러리 + recipe 특수화 | **실존**(derivedFrom) — assignment 기록만 추가 |
| OpenLABEL tag(ontology_uid,type,tag_data) | `ho:tagged` + 구조화 payload | 태그 실존, payload 부재 |
| ISO 34504 category = tag 집합 | 태그 부분집합 검색 의미론 | retrieve.py에 부분 존재 |
| 테스트 배정 (sim/track/field) | **environmentFidelity tier + 배정 정책** | harvest G2로 계획 |
| SOTIF 4영역 | scenario **knowledge-area** 태그 | 부재 |
| triggering condition / functional insufficiency | 인과 어휘(spec vs performance) | 부재 |
| criticality metrics (8 scale family) | 궤적 위험 지표 군 | 부재 |
| UL 4600 safety case + prompt elements | vnv assurance case + **coverage-audit 강화** | 감사 실존, 형식 부재 |
| GSN | `docs/verify/**` 구조 | 산문 |
| SPI (안전성능지표) | 검증 유효성 **만료 조건** | 부재 |
| NATM 5 pillar | 증거 출처 분류 | 부재 |

---

## 2. 층 1 — 온톨로지(TBox)에 넣을 것

설계 원칙: **AV가 표준을 나눈 방식대로 나눈다** — PAS 1883(공유 taxonomy)과 시스템별 ODD 선언은
다른 문서이고, taxonomy 표준은 "모니터링은 범위 밖"이라고 명시적으로 잘라낸다. 우리도
**어휘(스킴) / 선언 구조(클래스·술어) / 런타임 점검(guardrail·도구)** 을 섞지 않는다.

### 2a. 운용 범위 (최우선 — 이 이식의 심장)

```
ho:OperatingEnvelope          # Harness에 결합 (또는 Capability별)
  ho:envelopeDefault          # "restrictive" | "permissive"  (기본 restrictive)
  ho:hasEnvelopeStatement →   ho:EnvelopeStatement
  ho:hasEnvelopeRule →        ho:EnvelopeRule
  ho:onEnvelopeExit →         ho:FailurePolicy

ho:EnvelopeStatement          # 속성 1개에 대한 판정 (ISO 34503 표의 한 행)
  ho:envelopeAttribute →      ho:Concept (envelope 속성 스킴)
  ho:envelopeVerdict          # "include" | "exclude"
  ho:envelopeThreshold        # 선택: 정량 한계 (문자열 또는 수치+단위)
  ho:envelopeObservable →     # 측정가능성 규칙: 이 속성을 무엇으로 관측하는가
                              #   (AreaOfObservation / Tool 참조)

ho:EnvelopeRule               # 교차 속성 조건부 규칙 (OpenODD Module)
  ho:ruleCondition            # IF 절 (AND/OR 2단 이내)
  ho:ruleEffect               # "include" | "exclude"
```

**왜 이 모양인가 (근거)**
- `envelopeDefault`: ISO 34503은 restrictive를 강제, OpenODD는 둘 다 허용(전역·속성별). 우리는
  **restrictive 기본**(명시되지 않은 것은 범위 밖) — anti-drift·최소권한 태도와 일치.
- `envelopeObservable` **(측정가능성 규칙)**: ISO 34503이 PAS 1883에 더한 두 가지 중 하나가
  "모든 속성은 측정 가능해야 한다"이다. 관측할 수 없는 속성으로 범위를 선언하면 **범위 멤버십이
  판정 불가**가 된다. SHACL로 강제 가능한 값진 제약 — 이 한 줄이 "그럴듯한 범위 선언"을 막는다.
- `EnvelopeRule`: 평평한 include/exclude 목록으로는 "camera-only면 야간 130km/h 금지"류 결합
  제약을 못 쓴다. DLR 방법론은 이런 **조건부 합성문**이 규제·환경·센서 분석의 **교집합에서
  도출**된다고 정리한다 — 우리 대응: Guardrail/Contract 의무 ∩ EnvironmentSpace 속성 ∩ 바인딩된
  Capability 한계에서 규칙을 **도출**하고 `ho:derivedFrom`으로 근거를 남긴다(발명 금지).
- unknown 처리: OpenODD의 closed-world 선언(모르면 배제)은 우리에게 **"관측 불가 시 승인 요청"**
  — 즉 human-approval checkpoint의 정확한 트리거가 된다.

### 2b. 자율성 등급 (J3016 형식)

```
ho:autonomyTier → ho:Concept  # 닫힌 nominal 집합, Harness당 정확히 1 (maxCount 1)
  # 각 tier 개념이 세 슬롯을 정의:
  #   executionOwner   : user | user-and-harness | harness
  #   oversightOwner   : user | harness            (OEDR 대응 = 감시·판단)
  #   fallbackOwner    : user | receptive-user | harness
  #   envelopeBinding  : none | bounded | unbounded
```

**설계 규칙 (J3016 메타원칙 이식 — 이것이 이식의 절반이다)**
- **선언이지 측정이 아니다**: tier는 저작 시점의 설계 의도이며, TestScenario 합격률에서 유도되지
  않는다. 실패한 실행은 **부적합 발견**이지 tier 강등이 아니다.
- **명목형이지 서열이 아니다**: 소수점 없음, "L4가 L3보다 낫다" 아님, 하네스당 정확히 하나.
- **Harness에 붙지 Agent/모델에 붙지 않는다**: 같은 모델이 여러 tier의 하네스에 등장한다.
  (이 규칙을 어기면 "더 센 모델 = 더 높은 자율성" 드리프트가 곧바로 생긴다.)
- **tier와 envelope는 쌍으로만 유의미**(usage specification): 경계 tier 외에는 envelope 없는 tier
  선언을 **ill-formed**로 본다 — SHACL 검사 대상.
- **tier ⇒ 능력 함의**를 검사한다: `fallbackOwner=harness`면 safe-halt와 범위이탈 탐지 능력을
  **제공**해야 하고, `fallbackOwner=receptive-user`면 개입요청 채널과 수신성(receptivity) 계약이
  있어야 한다. 이것이 autonomy 축과 기존 requires/providesCapability 축의 **조인 규칙**이며,
  두 축을 절대 합치지 않는 이유다.
- 승인된 harvest의 HITL/HOTL/HOOTL·Feng L1–L5는 이 삼중항의 **값 조합**으로 정의한다(별도
  사다리 신설 금지 — 근사동의어 방지).

### 2c. TestScenario 확장 (승인 G5의 구체 형식)

```
ho:abstractionLevel     # "functional" | "logical" | "concrete"   (Safety Pool 열거와 동형)
ho:scenarioParameter    # logical 층: 파라미터 선언(이름·범위/분포·단위)
ho:usesEnvironment →    ho:EnvironmentSpace   # OpenDRIVE↔OpenSCENARIO 분리의 이식
ho:scenarioPhase →      ho:ScenarioPhase      # Act/Event 대응: 진입조건·행위·종료조건
ho:scenarioTrigger      # OR-of-AND 조건군 + edge(rising/falling) + delay(debounce)
ho:oracle →             ho:Oracle             # 타입 있는 판정 (아래)
ho:knowledgeArea        # "known-safe"|"known-unsafe"|"unknown-unsafe"|"unknown-safe"
ho:scenarioSource       # "authored"|"mined-from-operation"|"generated"|"derived-from-incident"
ho:allocatedFidelity →  # 이 시나리오가 배정된 environmentFidelity tier
```

- **추상화 사다리**: functional(자연어 패턴 — 사람이 쓰고 중앙 부품 라이브러리에 산다) →
  logical(파라미터 범위·분포) → concrete(값 고정, 재현 가능). `ho:derivedFrom`이 이미 있으므로
  구체화 사슬의 **추적성**은 공짜로 얻는다. 우리 TTL 개체는 사실상 "abstract" 층(형식적·선언적
  ontology 표현)에 해당한다는 점도 문헌과 정합.
- **변량은 시나리오 본문 밖에**: OpenSCENARIO는 파라미터 분포를 **별도 파일**로 두고
  `randomSeed`+`numberOfTestRuns`로 재현한다. 우리도 `ho:ScenarioVariation` 노드를 분리 —
  determinism 게이트와 궁합이 좋고, "시나리오 논리"와 "커버리지 샘플링"을 따로 감사할 수 있다.
- **타입 oracle**: DSL 2.x의 **trace acceptance**(시나리오가 허용 궤적의 "관"을 정의, 실행이 그
  안에 들면 합격)를 채택. 등급형 판정(PEGASUS 4단 캐스케이드)을 이식: 여유 유지 / 위반 발생 /
  귀책 주체(에이전트 vs 환경) / 완화 여부 — 이진 pass/fail보다 진단력이 크고 failureCondition→
  recoveryStrategy와 정합.
- **능동/수동 이중 해석**: 같은 oracle을 (a) 능동적으로 실행해 시험하거나 (b) 운영 트래픽에
  수동 감시로 적용할 수 있다 — 승인된 **shadow mode**의 정확한 이론적 근거이며, oracle을 1급
  노드로 만들 결정적 이유.

### 2d. 환경 계층 기술 (6-layer의 이식)

`ho:environmentLayer` 개념 스킴 — 시나리오/환경이 **어느 층을 명시했는지** 감사 가능하게:
- **L1 기반(substrate)**: 에이전트가 그 위에서 행동하는 것 — repo·파일시스템·스키마·API 표면,
  그리고 그 "차선 표시"(lint 설정·브랜치 보호 규칙).
- **L2 인접 정적 맥락**: 행동 대상이 아니지만 곁에 있는 것 — 문서·조직도·이웃 서비스.
- **L3 L1/L2의 임시 변경**: 시나리오 동안 상수 — feature freeze·마이그레이션 중·의존성 열화·
  만료된 자격증명.
- **L4 동적 행위자**: 사용자·다른 에이전트·CI·스케줄러 (각자 궤적/상호작용 패턴).
- **L5 주변 조건**: 부하·rate limit·지연·토큰 예산 압력·시각.
- **L6 디지털/메타 정보**: 메모리 파일·대시보드·알림·검색된 컨텍스트 팩 — 에이전트의 V2X.

설계 규칙 이식: **"있는 그대로만, 의도는 쓰지 않는다"**(행위자·기능 불가지 기술) — 우리
중립부품 원칙과 동일. **층은 예시가 아니라 분류 규칙으로 정의**한다(4→5→6층 진화에서 엔티티가
층 사이를 표류한 교훈 = 우리 anti-drift와 같은 병).

### 2e. 실패 인과 어휘 (SOTIF)

```
ho:TriggeringCondition   # 시나리오 쪽 개시자 (모호 요청·과대 컨텍스트·도구 출력 충돌·적대 입력·
                         #   낡은 환경 상태) — 시스템이 아니라 상황의 속성
ho:FunctionalInsufficiency
  ho:insufficiencyKind   # "specification" (프롬프트/가드레일이 그 경우를 다루지 않음)
                         # "performance"   (다루긴 하는데 모델/도구가 못 해냄)
→ 기존 ho:FailurePolicy 의 failureCondition 으로 귀결
```
지금은 failureCondition→recoveryStrategy 한 홉뿐이라 **왜 실패했는지의 종류**를 못 적는다. 이
인과 3단은 실패를 **설계 결함(명세)** 과 **수행 부족(성능)** 으로 갈라, 개선 조치를 다르게
분배한다(전자는 가드레일/프롬프트, 후자는 모델/도구/범위 축소).

### 2f. TBox 추가 요약 (최소 집합)

| 우선 | 추가 | 형태 |
|---|---|---|
| P1 | `ho:OperatingEnvelope`, `ho:EnvelopeStatement`, `ho:EnvelopeRule` + 술어 6종 | 클래스 3 + 술어 |
| P1 | envelope 속성 SKOS 스킴 (§2a) + `ho:envelopeObservable` 제약 | 어휘 + SHACL |
| P1 | `ho:autonomyTier`(닫힌 개념 집합 + 슬롯 4) + tier⇒capability SHACL | 술어 + 개념 + shape |
| P1 | envelope-exit failureCondition 값 + safe-halt 회복 전략 | 값 확장 (harvest와 공유) |
| P2 | TestScenario: abstractionLevel·scenarioParameter·usesEnvironment·knowledgeArea·scenarioSource | 술어 5 |
| P2 | `ho:Oracle`(타입 판정 + 등급형 판정), `ho:ScenarioVariation`(분포+seed+runCount) | 클래스 2 |
| P2 | `ho:environmentLayer` 개념 스킴 | 어휘 |
| P3 | `ho:TriggeringCondition`/`ho:FunctionalInsufficiency`(kind) | 클래스 2 |
| P3 | `ho:ScenarioPhase`/`scenarioTrigger`(edge·delay) | 클래스 1 + 술어 |
| P3 | criticality 지표 어휘(scale family 5종) | 어휘 |

---

## 3. 층 2 — knowledge graph(중앙 ABox)에 넣을 것

TBox가 "선언할 수 있는 모양"을 주면, ABox는 **재사용되는 중립 내용물**을 채운다.

1. **envelope 속성 스킴 개체군** (PAS 1883 대응물, 30~40 concept): 기반(repo 규모·언어·빌드 체계),
   조건(도구 가용성·네트워크·자격증명·fidelity tier), 동적요소(동시 에이전트·사용자 상호작용
   수준·다른 세션). *AV 속성을 옮기는 게 아니라 AV의 taxonomy 구조를 우리 도메인에 적용.*
2. **autonomyTier 개념 6종**: 삼중항 값 조합으로 정의(사용자 실행 / 사용자-하네스 공동 /
   하네스 실행+사용자 감시 / 하네스 실행+감시+사용자 fallback(수신성 계약) / 하네스 fallback
   (범위 내) / 하네스 fallback(범위 무제한)). 라벨은 "레벨 N" 금지 — **책임 배분 이름**으로.
3. **환경 계층 개념 6종** (§2d).
4. **knowledge-area 개념 4종** (SOTIF) + **scenarioSource 개념 4종** + **abstractionLevel 3종**.
5. **envelope-exit 실패 부품군**: `fp-envelope-exit`(범위 이탈 → 인계 요청 → 시한 → safe-halt),
   `gr-envelope-check`(요청 수락 전 COD⊆ODD 판정 의무), `gr-envelope-unknown`(관측 불가 속성이
   있으면 승인 요청), `gr-transient-hysteresis`(순간 이탈은 즉시 fallback 아님 — 평가 트리거),
   `fp-fallback-owner-unresponsive`(플랫폼 계층 watchdog — 하네스 밖 존재를 명시).
6. **triggering condition 개체군** (재사용 가능한 것만, 6~10): 모호 요청·컨텍스트 초과·도구 출력
   충돌·적대적 입력·낡은 상태·자격증명 만료.
7. **기존 하네스 7종에 envelope 선언 부여**: 특히 `h-coding`(현재 얇음)과 `h-multiagent`.
   이것이 이식의 **실증**이다 — 선언 없이 스키마만 늘리면 죽은 어휘가 된다.
8. **oracle 부품군**(등급형 판정 4단) + **criticality 지표 개체 소수**(예산 소진까지 여유,
   승인범위 경계까지 거리, 개입 긴급도, 위반 확률).

> **금지 목록(중복 방지)**: 시나리오 카테고리를 클래스로 증식시키지 말 것 — ISO 34504가 명시적으로
> "단일 계층 강제 없음, 카테고리 = 태그 집합"을 택했고 우리 skos 태깅과 같다. `scene`/`situation`은
> 이미 GlobalState/ObservationSpace로 있으니 **신설 금지**(용어 정합만 문서화).

---

## 4. 층 3 — recipe에 넣을 것

recipe 레인은 AV의 **시스템별 ODD 선언 + 시나리오 DB**에 해당한다(중앙은 taxonomy 표준 역할).

1. **recipe마다 envelope 선언 파일**: 속성 스킴 전 행에 대한 판정표(빈칸 금지 — 감사 가능성의
   핵심). AVSC의 **이중 표현**(표 + 서술문)을 채택하되, 서술문은 **생성물**로만(손으로 유지 금지).
2. **`harness-qualification` recipe** (ISO 34502 8단계의 이식): ① 범위·목표 선언 → ② 수용 기준
   설정(maturity별로 차등) → ③ 관련 시나리오 공간 명세 → ④ 위험 요인으로 임계 시나리오 도출 →
   ⑤ 공간을 덮는 시나리오 집합 도출 → ⑥ 구체화 + fidelity tier 배정 → ⑦ 실행 → ⑧ 평가·판정
   (미달 시 ②로 순환, 최종에 인간 승인 게이트). 각 단계는 **목표/입력/요구/산출물** 4구획으로
   기술(표준의 절 구조 이식) — 증거 사슬이 감사 가능해진다.
3. **배정 정책** (PEGASUS 이식 — 단순 tier enum이 아니라 **정책**):
   - 논리 시나리오 **공간 전체**를 가장 싼 tier(mock/cassette)에서 파라미터 변량으로 실행,
   - **임계/근접 실패**와 **규정상 필수** 항목만 replica/twin으로 승격(고위 tier 결과로 저위
     tier의 충실도를 역검증),
   - **production tier에는 시나리오를 배정하지 않는다** — 그 층의 목적은 **"놀라움(surprise)"
     발견**과 데이터 수확이다. (이 규칙을 놓치면 production을 "제일 비싼 테스트 장소"로 오해한다.)
4. **시나리오 DB 메타데이터**: 안정 식별자·부모 링크(`derivedFrom` 재사용)·버전·정의 언어·
   출처(authored/mined/generated)·라이선스·추상화 수준 — Safety Pool 스키마의 이식.
5. **discovery loop recipe**: 운영 이상/근접 실패 → 중립화된 **logical** 시나리오로 추상화 →
   ABox 등록 → 구체 시나리오 재생성 → 재검증 → knowledge-area 회계 갱신(unknown-unsafe →
   known-unsafe → known-safe). 원 transcript가 아니라 **중립 형태로 저장**하는 것이 부품
   라이브러리 원칙과 정합하며, 하나의 발견이 같은 capability를 쓰는 모든 하네스에 이식된다.

---

## 5. 층 4 — 검증·감사 레인 (vnv / coverage-audit)

1. **verify 보고서를 GSN 형태로**: 최상위 Goal("하네스 H는 선언 범위 E에서 적합") → Strategy
   (능력 커버리지 / 시나리오 영역 커버리지 / 범위이탈 거동) → 잎 Goal마다 **Solution(증거
   포인터)**; Context = 범위 정의, Assumption = 모델 버전·fidelity tier, Justification = 수용
   기준 근거. **종결 규칙**: 모든 잎이 증거에 닿거나 명시적 "미전개" 표시가 있어야 완료 —
   조용한 공백이 불가능해진다(우리 coverage-audit 규칙과 같은 정신, 더 기계적).
2. **coverage-audit 강화 3종**:
   - **의무 4등급**(필수/요구/강력권고/권고)으로 감사 항목을 등급화(UL 4600 prompt element),
   - 각 항목의 허용 응답에 **"범위 밖이라 해당 없음"** 을 정식 포함(현행 "명시적 제외 사유"의
     형식화),
   - **Type I/Type II 이중 커버리지**: 선언 범위 대비 커버리지 + 실제 운영 트래픽 대비 커버리지.
3. **정량 커버리지 목표**(DSL `cover()` 이식): 존재 검사에서 **버킷별 목표치**로 — (capability ×
   scenarioKind × fidelity tier) 또는 파라미터 구간별 최소 표본 수.
4. **SPI(안전성능지표) — 검증의 만료 조건**: 각 vnv 판정은 "이 지표가 이 범위를 벗어나면 이
   판정은 무효"를 함께 선언한다(가정 유효성 지표 + 거동 지표). 위반 시 maturity 강등/재감사
   트리거. 지금 우리 PASS는 시점 스냅샷이라 **만료 개념이 없다** — 이 한 가지가 재감사 시점을
   원칙화한다.
5. **증거 출처 5종 분류**(NATM pillar 이식): 프로세스 감사(inspection 레인) / 가상 실행(mock·
   cassette CI) / 스테이징(replica·twin) / 감독 하 실운영(HITL 파일럿) / 운영 모니터링(standing
   service + shadow). 하네스 승인 서사가 "어느 pillar가 어떤 증거를 냈는가"로 표현된다.
6. **UL 4600 8.4.2의 직격 대응**: "인지 온톨로지가 ODD를 수용 가능하게 **커버**해야 한다" —
   즉 **어휘 자체가 선언 범위를 덮는지 감사**하라는 조항. 우리의 "담을 어휘 범주가 없으면 TBox
   확장을 먼저 트리거한다" 규칙과 동일 — 외부 표준의 독립 검증으로 인용할 것.

---

## 6. 방법론 이식: 온톨로지로 시나리오를 **생성**하는 법

AV의 생성형 시나리오 온톨로지(Bagschik/Menzel 계열)가 준 교훈은 우리 recipe 자동화에 직결된다.

- **조합 지식을 코드가 아니라 온톨로지에 둔다**: 선행 DB 방식이 실패한 이유가 "조합 규칙이
  코드 예외처리에 암묵적으로 있어 안전 논증에 추적 불가"였다. 우리 CLAUDE.md의 "어휘 없이
  의미를 손대지 말라"와 같은 병에 대한 같은 처방 — **recipe 조합 규칙을 tools/*.py가 아니라
  그래프에 두라**는 강한 외부 근거.
- **생성 절차**: TBox 카디널리티 공리(우리 `HarnessShape` 최소 구성)에서 유효 레이아웃을 열거 →
  배치 관계 추론 → 역할/과업을 슬롯에 순열 → **Guardrail 규칙으로 가지치기**(그들의 SWRL =
  우리 SHACL) → 환경 계층(fidelity·부하)을 마지막에 순열.
- **감사는 생성물이 아니라 계층화된 지식에 한다**: 1만 개 시나리오를 감사하지 말고 그것을
  낳은 컴팩트한 층(어휘·규칙)을 감사한다 — 우리 coverage-audit의 대상 선택 원칙으로 채택.
- **관계를 3종으로 타입화**: 배치 관계(토폴로지 엣지) / 객체 간 의존(구성요소 교차 제약 —
  생성된 시나리오와 **함께 배송되는 제약 파일** 패턴) / 파라미터 내부 의존(수식 — 예: 예산 계산).
- **정적 검사 후 동적 검사**: 생성물의 스키마 적합성(=`validate.py`) 다음에 실행 적합성(=vnv
  런 검증). 두 게이트가 별개로 필요하다는 것이 AV에서도 확인된다.
- **지식주도 + 데이터주도 병행**: 순수 데이터 생성은 "선언 범위 중 무엇을 만났는지" 알려주지
  못한다 — 범위 커버리지 주장은 지식주도 생성에서만 나온다.

---

## 7. 승인된 harvest 항목과의 통합 (중복 신설 방지)

| harvest 계획 항목 | AV 이식이 하는 일 |
|---|---|
| G2 environmentFidelity tier | tier **enum에 배정 정책을 더한다**(전체는 저위, 임계만 승격, production은 발견용). 역검증 엣지 추가. |
| G5 TestScenario oracle/trajectory | **형식을 확정한다**: abstractionLevel 3층, 단계 스크립트, trace-acceptance oracle, 변량 노드 분리, 등급형 판정. |
| G7 shadow ExecutionMode | oracle **수동 해석**으로 이론 근거 확보 — 같은 시나리오 정의를 감시에 재사용. |
| G3 approvalScope/autonomy 사다리 | 사다리를 **삼중항 형식**으로 재정의(능력 서열 금지 규칙 포함). |
| G4 escalation 연쇄 | 범위이탈 fallback 사다리와 **같은 기계**로 통합(인계→시한→safe-halt). |
| safe-halt 개념 | **MRC 정의**를 얻는다: "계속할 수 없거나 계속해선 안 될 때 도달하는 안정 정지 상태" + 상태 보존·비가역 작업 중단·에스컬레이션 게시. |
| G1 adjudicated environment | scene/situation/scenario 용어 정합으로 **개념 경계**가 선명해짐(판정자는 scene→situation 배급자). |
| 신규 (harvest에 없던 것) | **운용 범위 선언 전체**, SOTIF 인과 어휘·4영역 회계, GSN/SPI/prompt-element 감사 형식, 6층 환경 기술, discovery loop. |

---

## 8. 실행 순서 (제안)

- **W1 (형식의 뼈대)**: envelope 클래스 3종 + 속성 스킴 + autonomyTier 삼중항 + envelope-exit
  FailurePolicy + tier⇒capability SHACL. **검증**: `h-coding`·`h-multiagent`에 실제 envelope
  선언을 부여하고 범위이탈 시나리오 2건으로 게이트가 무는지 실측.
- **W2 (시나리오 형식)**: TestScenario 5술어 + Oracle/ScenarioVariation + 환경 계층 스킴 +
  knowledge-area. **검증**: 기존 scn-* 2건을 functional/logical/concrete로 재표현해 회귀 없음.
- **W3 (검증 레인)**: verify 보고서 GSN 구조 + coverage-audit 의무등급/Type I·II + SPI 만료 조건.
  **검증**: 최근 verify 보고 1건을 새 형식으로 재작성해 누락 항목이 드러나는지.
- **W4 (recipe)**: envelope 선언 파일 + `harness-qualification` recipe + 배정 정책 + discovery
  loop. **검증**: recipe 1종에 전 과정 적용.
- **W5 (선택·생성)**: 온톨로지 기반 시나리오 생성 파이프라인(§6) — W2 정착 후 판단.

각 wave: developer dispatch(저작) → vnv(판정: validate·lint·determinism·negative control) →
inspection(파급 재검증·git). W1은 harvest wave-H와 **술어 충돌 검사**를 선행할 것
(approvalScope·attachesAt와 envelope 술어의 경계 명문화).

---

## 9. 이식하지 말아야 할 것 (경계)

1. **물리 안전 등가물**: 충돌 심각도·사망 등급·ALARP/MEM 같은 정량 위험 수용 기준은 그대로
   옮기면 과대 주장이 된다. 우리는 "수용 기준"이라는 **자리**만 빌리고 내용은 우리 것으로
   (maturity 등급별 차등 기준).
2. **시나리오 클래스 계층 증식**: ISO 34504 자신이 단일 계층 강제를 거부했다 — 태그 집합으로.
3. **OWL-DL/SWRL 스택 모방**: AV의 지배적 스택이지만 우리는 SHACL 폐쇄세계 검증이 이미 더
   운영친화적이다. **이 축은 우리가 수입하는 게 아니라 앞서 있다** — 바꾸지 말 것.
4. **표준 문서 텍스트**: 유료 표준의 문장·표를 그대로 옮기지 않는다. 라벨/정의는 전부 자기
   문장. 공개 아티팩트(OpenLABEL TTL·A.U.T.O. MIT·GSN CC-BY)만 형태 참조.
5. **용어 이름 그대로 쓰기**: `ODD`·`DDT`·`MRC` 같은 도메인 약어를 prefLabel에 쓰면 도메인
   오염이다. **중립 이름**으로: operating envelope / task share / safe-halt state.
6. **level 숫자**: "레벨 3" 같은 서열 라벨 금지(J3016 자신이 명목형이라 못박음) — 책임 배분
   이름으로 명명.

## 10. 한계·미검증

- 유료 표준(ISO 34503/34501/34502/21448, UL 4600 발행판, SAE J3016 공식본, PAS 1883 본문)은
  **공개 프리뷰·저자 공개 초안·2차 문헌·공개 미러**로만 확인 — 절 번호·정확한 문구는 미검증.
  구조·방법 수준에서는 다중 출처 교차 확인됨.
- ISO 21448 절 번호는 2차 출처 간 불일치가 있어 **활동 내용 기준**으로만 이식.
- ASAM OpenODD는 2025-04 정식 1.0.0으로 승격됨(옛 "concept project" 서술은 낡음) —
  본 구상의 조건부 규칙·restrictive/permissive 모델은 이 정식 스펙 기준.
- prior-transfer 축(ODD 개념을 AI/LLM 에이전트에 적용한 선행 연구)은 세션 한도로 실패해
  **재개 중** — 완료 시 §부록으로 보강 예정(선행 사례의 매핑 선택·난점).
- 6개 축 각각의 unverified 목록은 워크플로 journal에 보존.

## 11. 주요 1차 소스

**ODD**: ASAM OpenODD 1.0.0 모델 <https://publications.pages.asam.net/standards/ASAM_OpenODD/ASAM_OpenODD/latest/specification/06_model_concept/06_01_openodd_model.html> ·
Khastgir(WMG) ODD 표준화 슬라이드 <https://www.asam.net/index.php?eID=dumpFile&t=f&f=3520&token=a59ab27310f44ec3be4776aad208ab5046c406d2> ·
Ito, J.UCS 27(8) 2021 <https://pdfs.semanticscholar.org/e4a0/e37cb360836ddf635735d92ac3572387c0ae.pdf> ·
Shakeri(DLR) 2024 <https://elib.dlr.de/206836/1/Defining_OD_and_Specifying_ODDs_Current_Practices_Standards_and_a_Systematic_Approach.pdf> ·
Pkl ODD 형식화 <https://arxiv.org/pdf/2509.02221>

**시나리오 방법론**: ISO 34501 프리뷰 <https://cdn.standards.iteh.ai/samples/78950/daaf37715f0f4ff685c72bc39de7a19c/ISO-34501-2022.pdf> ·
ISO 34502 프리뷰 <https://cdn.standards.iteh.ai/samples/78951/aaa4e667f3d942f7a502044361312a2f/ISO-34502-2022.pdf> ·
ISO 34504 프리뷰 <https://cdn.standards.iteh.ai/samples/78953/48a609d160d642d79516045249a32225/ISO-34504-2024.pdf> ·
Menzel et al. 추상화 3층 <https://arxiv.org/pdf/1801.08598> · 6-Layer Model <https://arxiv.org/pdf/2012.06319> ·
PEGASUS 배정 <https://www.pegasusprojekt.de/files/tmpl/PDF-Symposium/10_Test-Concept-and-Test-Case-Allocation.pdf> ·
PEGASUS 안전논증 <https://www.pegasusprojekt.de/files/tmpl/Pegasus-Abschlussveranstaltung/29_Safety_Argument.pdf> ·
criticality metrics <https://criticality-metrics.readthedocs.io/>

**형식**: OpenSCENARIO XML 1.4.0 storyboard <https://publications.pages.asam.net/standards/ASAM_OpenSCENARIO/ASAM_OpenSCENARIO_XML/v1.4.0/07_components_scenario/07_02_storyboard_entities.html> ·
parameter distribution <https://publications.pages.asam.net/standards/ASAM_OpenSCENARIO/ASAM_OpenSCENARIO_XML/v1.4.0/09_reuse_mechanisms/09_03_parameter_distribution.html> ·
DSL 2.2.0 semantics <https://publications.pages.asam.net/standards/ASAM_OpenSCENARIO/ASAM_OpenSCENARIO_DSL/v2.2.0/language-reference/Semantics.html> ·
OpenDRIVE 1.9.0 <https://publications.pages.asam.net/standards/ASAM_OpenDRIVE/ASAM_OpenDRIVE_Specification/v1.9.0/specification/index.html> ·
OpenLABEL 스키마 <https://openlabel.asam.net/V1-0-0/schema/openlabel_json_schema.json> ·
Safety Pool API <https://docs.safetypooldb.ai/docs/api-postman-examples> · StreetWise 커버리지 <https://arxiv.org/html/2409.01139v1>

**온톨로지**: OpenXOntology <https://www.asam.net/standards/asam-openxontology/> ·
Bagschik 생성형 <https://arxiv.org/abs/1704.01006> · Menzel 상세화 <https://arxiv.org/abs/1905.03989> ·
A.U.T.O.(MIT) <https://github.com/lu-w/auto> · 리뷰 <https://arxiv.org/pdf/2304.10837>

**안전 논증**: UL 4600 공개 초안 <https://users.ece.cmu.edu/~koopman/pubs/191213_UL4600_VotingVersion.pdf> ·
Koopman 슬라이드 <https://users.ece.cmu.edu/~koopman/ul4600/L109_UL4600.pdf> ·
GSN(GR-77 26장) <https://www.sars.org.uk/BOK/Applied%20R&M%20Manual%20for%20Defence%20Systems%20(GR-77)/p3c26.pdf> ·
SOTIF 개요 <https://report.asam.net/iso-21448-sotif> · NATM <https://unece.org/transport/documents/2021/04/working-documents/grva-new-assessmenttest-method-automated-driving-natm>

**자율성**: J3016_202104 공개 미러 <https://ca-times.brightspotcdn.com/54/02/2d5919914cfe9549e79721b12e66/j3016-202104.pdf> ·
원격 역할 조사 <https://arxiv.org/pdf/2109.08599>

---

## 부록 A — 기존 씨앗 실측: `ho:triggerPhrase` / `ho:outOfScope`

구상 작성 중 실측으로 발견: TBox에 **활성 경계(trigger boundary) 쌍**이 이미 선언돼 있다.

- `ho:triggerPhrase` (Harness+Instruction, xsd:string, 반복): "이 노드를 활성화해야 하는 문구".
- `ho:outOfScope` (같은 도메인, xsd:string, 반복): "활성화하면 안 되는 명시적 제외 사례 —
  trigger 경계의 음의 측면… 과활성 방지".

즉 **자유문 형태의 include/exclude 경계**이며 의미상 ODD 선언의 원시형이다. 그러나 실측:
**ABox 사용 0건, staging 0건, 도구 소비 0건, shapes 0건** — 선언만 되고 죽어 있는 어휘다.

**이식 설계에 미치는 영향 (중요)**
1. `ho:outOfScope`(문자열)와 새 `EnvelopeStatement[verdict=exclude]`를 나란히 두면
   **근사동의어 드리프트** — golden rule 2 정면 위반. 둘 중 하나로 정리해야 한다.
2. 권고: EnvelopeStatement가 **타입 있는 후계자**가 되고, 자유문 쌍은 (a) AVSC의 **이중 표현**
   (표 + 서술문) 중 서술문 레인으로 **생성물**로 재정의하거나, (b) 같은 wave에서 **제거**한다
   (repo의 B9 결정: 폐기=제거, 추적성은 git).
3. 이 발견은 이식의 정당성을 강화한다 — 필요성이 이미 인지돼 어휘까지 만들어졌지만
   **형식이 없어 아무도 쓰지 못한 것**이다. ODD 형식(공유 taxonomy·판정·임계·관측자·조건부
   규칙·기본값 의미론)이 정확히 그 빠진 조각이다.
