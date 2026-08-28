---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/verified/av-odd-scenario-transfer.md   # 승인 계획 W1 (사용자 결정: B 우선)
related: [docs/feedback/inquiries/av-odd-scenario-transfer.md, docs/feedback/verified/sim-hil-coding-harvest.md]
---
# W1 dispatch 브리프 (초안) — 운용 범위(operating envelope) + 자율성 등급 + 범위이탈 정책

> 작성: inspection (사용자 결정 "(B)를 우선으로 진행", 2026-08-28). **정식 채택·dispatch는
> orchestrator 소관.** 설계 근거는 `inquiries/av-odd-scenario-transfer.md` 본문 + **부록 B**
> (부록 B가 본문에 우선). 파급·registry 실측은 `verified/av-odd-scenario-transfer.md`.

## 1. 목표 (한 문장)

하네스가 **감당한다고 선언한 범위**를 기계가독 데이터로 만들고, 그 범위를 **벗어난 요청이
1급 실패 조건**이 되어 선언된 회복 사다리로 처리되게 한다 — 지금은 범위가 라벨 수준이고
범위 이탈은 임기응변 거절이다.

## 2. 결정 사항 (브리프에서 고정 — developer 재량 아님)

1. **`ho:OperatingEnvelope`는 HarnessComponent**: `ho:hasEnvelope` (subPropertyOf
   `ho:hasComponent`), 하위 노드는 propertyChainAxiom으로 롤업
   (`hasComponent o hasEnvelope o hasEnvelopeStatement`). 전용 shape 신설 금지 —
   기존 `ComponentConnectivityShape`가 anti-orphan을 커버한다(TestScenario·FailurePolicy·
   Agent가 같은 이유로 그렇게 들어온 선례).
2. **`ho:AutonomyTier`는 Specification leaf** (`ho:ExecutionMode`와 같은 성격), 접두사
   `tier-`, `ho:autonomyTier`로 Harness에 결합, **maxCount 1**.
3. **envelope 기본값은 restrictive** (명시되지 않은 것은 범위 밖). 단 **속성별로
   permissive 지정 가능**(그 속성의 하위 항목은 포함).
4. **접두사**: `oe-`(OperatingEnvelope) / `es-`(EnvelopeStatement) / `er-`(EnvelopeRule) /
   `tier-`(AutonomyTier). **`env-` 사용 금지**(싱글턴 `env-space`와 가독상 혼동).
   충돌 실측 완료 — 현행 32종과 무충돌.
5. **라벨 규약**: prefLabel·definition에 **ODD/DDT/MRC 등 도메인 약어 금지**, "레벨 3" 같은
   **서열 라벨 금지**. 중립어로: operating envelope / task share / fallback owner /
   safe-halt state / responsibility allocation. 정의는 전부 자기 문장(유료 표준 verbatim 금지).
6. **capability ≠ authorization**: envelope·tier는 `ho:requiresCapability`/`providesCapability`
   에서 파생되지 않는다. "할 수 있나"와 "해도 되나"는 별개 관계임을 정의문에 명시.
7. **safe-halt는 상태이지 동사**다: 도달 조건(진행 중 비가역 작업 없음·작업 체크포인트됨·
   채널에 공표됨)으로 정의하고, **자동 재개 불가**(재개는 명시적 재활성화)를 정의에 포함.

## 3. 담당·경로 (파일 경계)

- **developer dispatch (opus)**: `ontology/tbox/harness.ttl` · `ontology/shapes/harness-shapes.ttl` ·
  `ontology/abox/core/**`(아래 명시 파일) · `tools/lint_uniformity.py`(PREFIX_MAP 4행) ·
  `tools/validate.py`(INSTANCE_CLASSES 4행) · `ONTOLOGYSTYLE.md`(§2 표 4행, §3 술어 블록).
  **그 밖 경로·recipe·다른 도구 수정 금지.**
- **vnv dispatch**: `docs/verify/**` 판정 보고만.
- **git: inspection** (게이트 통과 후).

## 4. 구현 명세

### 4a. TBox — 클래스 3 + 자율성 1

```
ho:OperatingEnvelope ⊑ ho:HarnessComponent
    ho:envelopeDefault      "restrictive" | "permissive"        (기본 restrictive, minCount 1)
    ho:hasEnvelopeStatement → ho:EnvelopeStatement              (minCount 1)
    ho:hasEnvelopeRule      → ho:EnvelopeRule                   (선택)
    ho:onEnvelopeExit       → ho:FailurePolicy                  (minCount 1)

ho:EnvelopeStatement                                            (한 속성에 대한 한 행)
    ho:envelopeAttribute    → ho:Concept   (envelope 속성 스킴 소속, minCount 1)
    ho:envelopeVerdict      "include" | "exclude"               (minCount 1)
    ho:envelopeClosure      "restrictive" | "permissive"        (선택; 없으면 envelopeDefault)
    ho:envelopeValueType    "boolean" | "categorical" | "numeric"(minCount 1)
    ho:envelopeThreshold    xsd:string                          (numeric/categorical일 때 권장)
    ho:envelopeObservable   xsd:string                          ★ minCount 1 — 아래 4c

ho:EnvelopeRule                                                 (교차 속성 조건부 규칙)
    ho:ruleCondition        xsd:string   (IF 절; AND/OR 2단 이내, 사람이 읽고 검증 가능한 형태)
    ho:ruleEffect           "include" | "exclude"

ho:AutonomyTier ⊑ ho:Specification                              (ExecutionMode와 같은 층)
    ho:executionOwner   "user" | "user-and-harness" | "harness"
    ho:oversightOwner   "user" | "harness"
    ho:fallbackOwner    "user" | "receptive-user" | "harness"
    ho:envelopeBinding  "none" | "bounded" | "unbounded"
    ho:approvalUnit     "none" | "per-action" | "per-plan" | "per-exception" | "post-hoc"
ho:autonomyTier : Harness → ho:AutonomyTier                     (maxCount 1)
```

`ho:failureCondition` 값 어휘에 **`envelope-exit`** 추가(기존 내부 고장 값과 병렬).

### 4b. shapes (SHACL) — 이 이식의 "이빨" 4종

1. **측정가능성**: `EnvelopeStatement`는 `envelopeObservable` **필수**. 관측할 수 없는 속성으로
   범위를 선언하면 범위 판정이 원리적으로 불가 — 이 shape가 "그럴듯한 선언"을 막는다.
2. **usage specification 규칙**: `ho:autonomyTier`가 있으면 `ho:hasEnvelope`도 있어야 한다
   (단, `envelopeBinding="none"`/`"unbounded"` 경계 tier는 면제).
3. **tier ⇒ capability 함의**: `fallbackOwner="harness"`인 tier를 선언한 harness는 safe-halt
   능력을 **제공**해야 하고, `fallbackOwner="receptive-user"`면 인간 인계 채널(`chan-user`
   계열)을 **결합**해야 한다. (SPARQL 제약; 기존 `AlternativeOfSharedAnchorShape` 방식 참조)
4. **닫힌 값**: envelopeDefault·envelopeVerdict·envelopeClosure·envelopeValueType과 tier의
   슬롯 5종에 `sh:in`.

### 4c. `envelopeObservable`의 의미 (오해 방지)

"이 속성이 요청 시점에 무엇으로 판정되는가"를 **짧은 문장**으로 적는다(예: "요청이 명시한
대상 경로가 저장소 루트 밖인지 여부"). W1에서는 문자열로 두고, 후속 wave에서
`AreaOfObservation`/`Tool` 참조로 승격한다. **지금 참조로 만들지 말 것** — 관측 개체가 아직
그 입도로 존재하지 않는다.

### 4d. ABox — 개체 (파일별)

- `ontology/abox/core/vocab/concepts.ttl`: **envelope 속성 스킴** — 5축 최상위 개념 +
  각 축 하위 3~6개(총 **25~30**). 5축(중립어로 저작):
  1. **대상 영역**(domain) — 기존 `dom-*`과 중복 신설 금지, 필요하면 참조/보강만.
  2. **과업·절차**(task/process) — 우리 도메인의 중심 축(외부 taxonomy를 그대로 옮기면
     누락되는 자리).
  3. **관여 주체**(stakeholder) — 누가 요청하고 누가 영향을 받는가(승인 권한 보유자 포함).
  4. **인터페이스 표면**(surface) — 노출된 도구·API·메모리·수신 데이터 경로.
  5. **자산**(asset) — 걸려 있는 것: 코드·데이터·자격증명·예산·평판.
  전부 `skos:broader`로 `id:scheme`에 연결(anti-orphan). **보호속성 축은 이번 wave에서 의도적
  제외** — 사유를 개념 정의나 파일 주석에 1줄로 명시(coverage-audit의 "명시적 제외" 규약).
- `ontology/abox/core/spec/patterns.ttl`(또는 신규 `spec/autonomy.ttl` — developer 판단):
  **tier 개체 6종**, 라벨은 책임 배분 이름으로. 슬롯 조합 권고:
  advisory(실행=user, 감독=user, fallback=user, binding=none, 승인단위=none) /
  per-action-approval / per-plan-approval / bounded-autonomy(예외만 에스컬레이션) /
  monitored-autonomy(사후 보고) / unbounded(경계 tier).
- `ontology/abox/core/behavioral/guardrails.ttl`: `gr-envelope-check`(요청 수락 전 범위 판정
  의무) · `gr-envelope-unknown`(속성을 관측 못 하면 승인 요청) · `gr-transient-tolerance`
  (순간 이탈은 즉시 fallback 아님 — 재평가 트리거).
- `ontology/abox/core/verification/verification.ttl`: `fp-envelope-exit`(범위 이탈 → 인계 요청 →
  응답 기한 → safe-halt; **통지는 조용히 소멸하지 않음**) · `fp-envelope-exit-severe`(즉시
  fallback, 유예 없음).
- **하네스 2종에 실제 선언 부여**(이식의 실증): `id:h-coding`, `id:h-multiagent` —
  각각 envelope 1개(statement 6~10개, include만 명시하고 나머지는 restrictive 기본에 맡김) +
  tier 1개 + `onEnvelopeExit`. **날조 금지**: 실제 이 repo에서 참인 것만 적는다.

### 4e. 죽은 어휘 정리 (필수 동반 — 선택 강제)

`ho:triggerPhrase`/`ho:outOfScope`는 TBox에 선언돼 있으나 **ABox 0건·도구 0건·shapes 0건**
(전수 실측). 새 envelope 술어를 그냥 얹으면 근사동의어 2쌍 공존 = golden rule 2 위반.
**권고안(택1을 브리프가 지시할 것)**:
- **(권고) 도메인 축소**: 두 술어의 domain에서 **Harness를 제거**하고 `Instruction` 전용으로
  남긴다(스킬 활성화 트리거라는 별개 용도는 실제로 유효하며, 이는 별건 harvest의
  `activationTrigger` GAP과 이어진다). Harness의 범위 선언은 EnvelopeStatement가 전담.
  정의문에 "하네스 범위 선언에는 쓰지 않는다"를 1줄 명시.
- (대안) 두 술어 **완전 제거**(B9 선례: 폐기=제거, 추적성은 git).
어느 쪽이든 §2 표·registry 동반 갱신.

### 4f. registry 3중 등록 (누락 이력 있음 — 체크리스트)

`PREFIX_MAP`(lint_uniformity) + `§2` 클래스·접두사 표(ONTOLOGYSTYLE) + `INSTANCE_CLASSES`
(validate) 에 `OperatingEnvelope`/`EnvelopeStatement`/`EnvelopeRule`/`AutonomyTier` **4행씩**.
§3에 신규 술어 블록 동반. 하나라도 빠지면 registryDrift 또는 silent divergence.

## 5. 게이트 (vnv dispatch — negative control 필수)

1. `validate.py` PASS · `lint_uniformity.py` PASS · `check_determinism.py` PASS.
2. **negative control**(각각 실패해야 함 — vacuous pass 배제): observable 없는 statement /
   tier만 있고 envelope 없는 harness(경계 tier 제외) / fallbackOwner=harness인데 safe-halt
   미제공 / 닫힌 값 밖의 문자열. 대조군(정상 개체)은 conforms.
3. **범위 판정 실증 2건**: (a) 선언 범위 안 요청이 통과, (b) 범위 밖 요청이 `fp-envelope-exit`
   경로로 분기 — TestScenario 2개로 표현하고 `retrieve.py`로 두 하네스의 envelope이 팩에
   실리는지 확인.
4. **회귀**: `materialize.py` 산출물 byte-identity(무유출) — envelope 렌더는 이번 wave 범위 밖.
5. **개체 수 보고**: 증가분이 ~40 이내인지(설계 방어선), cap 260 위반 0.

## 6. 범위 밖 (이번 wave에서 하지 말 것)

Guardrail 전체 필드셋(부착점·권한 사다리·집행모드·주기·우선순위·무결성) · oracle 4-rung ·
열화 사다리 6필드 · handover 타이밍 스키마 · CAE Defeater · STPA 유도 절차 · recipe 레인 ·
materialize 렌더 · `envelopeObservable`의 참조 승격. 전부 W2~W4 대상이며, W1은 **선언과
이탈 처리**만으로 좁힌다(부록 B5 참조).

## 7. 이 브리프가 남기는 결정 포인트 (orchestrator 판단)

- tier 개체를 `spec/patterns.ttl`에 둘지 신규 `spec/autonomy.ttl`을 만들지(파일 분할 정책).
- 4e의 권고안(도메인 축소) vs 대안(완전 제거).
- envelope 속성 스킴의 5축 최상위 개념을 `c-` 접두사로 둘지, 축 전용 접두사를 둘지
  (권고: 기존 `c-` 유지 — 새 접두사 없이 개념 스킴에 흡수).
