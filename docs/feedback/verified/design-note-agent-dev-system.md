---
source: docs/feedback/design-note-agent-dev-system.md
verdict: apply-with-changes   # 신규분 소규모 + 충돌 1건 결정 대기; Part 0은 대부분 "이미 성립" 또는 "우리 상황에선 불필요"
targets: [tbox:ho:, ho:Link, ho:linkWeight, ho:ObservationSpace, ho:OperatingEnvelope, ho:TestScenario, ontology/]
kind: ripple-analysis
revision: 개정본(Part 0 신설) 기준 — 이전 판 분석을 대체·확장
graph_baseline: Agent 5 · ObservationSpace 5 · AreaOfObservation 10 · OperatingEnvelope 2 · AutonomyTier 6 · TestScenario 5 · Link 9 · Role 17 · Channel 8 · validate PASS
---
# 검증 보고 — 설계 노트(개정본)의 현 프로젝트 반영 분석

개정본은 **Part 0 명명 규약**을 신설해 용어 축 충돌을 먼저 차단한다. 이 보고는 Part 0을
새로 분석하고, Part I~X 분석은 이전 판을 유지·갱신한다. 결론 셋:

1. **Part 0의 핵심 주장 중 둘은 이미 우리 그래프에서 성립**한다 — AOD의 에이전트 1:1
   카디널리티, 그리고 용어집=온톨로지 라벨.
2. **하나는 우리 상황에서 정보를 더하지 않는다** — `asam:` 네임스페이스(우리는 verbatim
   수입을 하지 않아 그 버킷이 빈다).
3. **진짜 반영 대상은 여전히 `-space`(logical tier) 신설 하나**이며, Part 0은 그것에
   **파일명 규약과 확률 소재 표시**라는 실행 형태를 추가로 준다.

## 1. Part 0 항목별 대조 (실측)

### 1a. 0.1 세 축 배타 배정 — **부분 성립, 4번째 축 존재**

노트: `plane`(지식 종류) / `tier`(추상도) / `layer`(6-Layer 독점).
우리 현황: **plane은 이미 그 뜻으로 쓰고 있다**(plane-editor의 주석·설계결정·프로토콜·
인터페이스·지식그래프 평면). `tier`는 부재. `layer`는 미사용.

그런데 우리에겐 **네 번째 축 `facet`**(anatomy/quality/method/domain/scope)이 B-wave로
land돼 있다. facet은 **개념(Concept)을 분류**하고 plane은 **지식 산출물의 종류**를 가르므로
대상이 다르다 — **충돌 아님**. 다만 규약 문서가 3축만 적으면 저자가 facet을 plane으로
오인할 수 있으므로 **4축을 함께 명문화**해야 한다. (비용: 문서 1곳.)

### 1b. 0.2 산출물 접미사 — **신규, 채택 시 이득 명확**

`-ontology`/`-space`/`-kg` 3분은 우리 `tbox`/`(없음)`/`abox`와 대응한다. **비어 있는 칸이
정확히 `-space`(logical)** 이고, 이것이 §2a에서 말하는 "확률의 자리 없음"과 같은 사실이다.
파일명이 확률 소재를 알리는 효과는 실질적이다 — 에이전트가 `-space`를 보면 샘플링이
필요함을 안다. **다만 현행 파일명 규약(`tbox/`, `abox/core/<group>/`)과 병행할지 대체할지는
federation catalog 경로 파급 때문에 별도 판단**이 필요하다(결정 5).

### 1c. 0.3 네임스페이스 3접두어 — **우리 상황에선 `asam:`이 빈다**

실측: `ontology/` 전체에서 `asam:`·`av:` 접두어 사용 **0건**. 접두어는 `ho:`·`id:`와 표준
어휘(`skos`·`dct`·`owl`·`rdfs`·`xsd`)뿐이다. 이유는 우연이 아니라 **규율** 때문이다 —
유료 표준(ISO/SAE/ASAM/UL)은 구조·방법만 우리 문장으로 재기술하고 verbatim 수입을 금지해
왔다. 그래서 "그대로 수입, 수정 금지"를 뜻하는 `asam:` 버킷은 **구조적으로 비어 있다**.
출처 표시는 이미 `dct:source`(guardrails 6건·patterns 1건)로 하고 있다.

**판정**: 노트의 논거(“`scenario`라고만 쓰면 LLM이 도로 시나리오 사전확률로 끌린다”)는
타당하지만, 우리는 그 문제를 **다른 수단으로 이미 해결**했다 — 라벨에 도메인 약어·서열
표현 금지(AV 이식 wave의 확정 규칙)와 중립어 강제. 접두어를 더 도입하면 축이 하나 더 늘고
`asam:`은 영원히 빈다. **권고: 미채택, `dct:source` 유지.** 다만 노트의 의도(출처의
기계검사 가능성)를 살리려면 `dct:source`를 **SHACL로 필수화**하는 쪽이 우리 구조에 맞다.

### 1d. 0.4 `agt:AOD` — ★**이미 존재한다, 이름만 다르다**

노트: AOD는 **에이전트 단위로 하나씩**, `Harness --enforces--> AOD`, 그래서 `HOD` 기각.

실측: `ho:Agent` **5** : `ho:ObservationSpace` **5** : `ho:agentObservation` **5** —
**정확히 1:1**. 노트가 HOD를 기각한 근거인 카디널리티가 그래프에 이미 성립해 있고,
"하네스가 강제"도 `ho:hasAgent`(하네스→에이전트) + `ho:agentObservation`(에이전트→관측공간)
사슬로 이미 표현된다. `AreaOfObservation` 10 / `AreaOfInterest` 5가 그 내부 구조다.

**중요한 구분**: 우리 `ho:OperatingEnvelope`(2개체, `h-coding`·`h-multiagent`에 결합)는
AOD가 **아니다**. 그것은 "이 하네스가 감당하겠다고 선언한 **요청 범위**"이고, AOD는
"이 에이전트가 **무엇을 볼 수 있는가**"다. 노트에는 전자의 대응물이 없다 —
즉 우리 쪽이 한 축 더 갖고 있다. 두 축을 합치면 W1에서 확정한
**"capability ≠ authorization"** 과 같은 종류의 혼동이 재발한다.

**권고**: 신설·개명 없이 **관계만 명문화**(결정 3-a). 비용 0이고, 노트 용어로 검색될
필요가 있으면 `skos:altLabel "Agent Operational Domain"` 한 줄이면 된다.

### 1e. 0.5 파일 구성과 경계 규칙 — **규칙은 채택 가치, 분할은 비용 큼**

"서로 import는 하되 **클래스를 정의해 넣지 않는다**"는 경계 규칙은 우리 federation 구조와
정합한다(중앙 TBox가 스키마를 독점하고 recipe는 인스턴스만). 반면 domain/aod/scenario/defect
**분할**은 catalog의 논리 IRI→경로 매핑, CI 매트릭스, federate 게이트에 전부 파급된다.
**권고: 경계 규칙만 먼저 채택**하고, 분할은 `scenario-ontology`가 실제로 커질 때(결정 2 착수
이후) 재판단.

### 1f. 0.6 표기 형식 — **이미 그렇게 하고 있다**

식별자 영어·산문 한글은 `id:gr-lang`+ONTOLOGYSTYLE §1d로 이미 강제된다. "용어집을 별도
파일로 두지 않고 온톨로지 라벨에 둔다"도 이미 성립한다 — 우리 용어집은 `skos:prefLabel`+
`skos:definition`이고 별도 glossary 파일이 없다. **신규 작업 없음.**

## 2. Part I~X — 이전 판 분석 유지 (요지)

### 2a. ★`-space`(logical tier) 신설 — 사용자 지시 ②의 본체

`ho:TestScenario` 5개체가 있으나 `abstractionLevel`·`scenarioParameter`·분포 어휘가 TBox
**0건**. **확률을 둘 자리가 없어서** 가중이 온톨로지 층으로 흘러들었다는 인과가 성립한다.
이식 형태는 AV 이식 계획 **W2**와 동일: tier 3값 · 파라미터 선언(범위·단위) · **분포는
파라미터에만**(관계에는 붙이지 않음) · 변량(seed·runCount) · `ho:derivedFrom`으로 구체화
사슬 추적. 노트가 밝힌 한계("파라미터를 완전히 열거할 수 없어 logical이 functional을 온전히
반영하지 못한다")는 우리 쪽에서 **"파라미터화되지 않은 설계 의도"** 로 나타나며 coverage-audit
잔여 항목이 된다.

### 2b. 평면 단방향 영향 규칙

현행 facet에는 순서도 영향 방향도 없다. 채택 시 필요한 것은 **순서 선언 1개 + 역방향 참조
금지 린트**. 노트가 `[?]`로 남긴 `annotation`의 위치에 대한 inspection 견해: **`source`
하위**(주석은 코드에 대한 논평이고 변경이 더 빠르므로 노트의 정렬 기준과 정합). "설계 의도
전달 수단"인 주석은 실은 `design` 평면 내용이 잘못 놓인 것이므로 **재배치가 답이지 순서
예외가 아니다.**

### 2c. 이미 land된 것 (재제안 금지)

cap 260(§8.2) · `memoryWriteTiming` 3(§3.4) · `mode-standing-service`/`mode-sub-agents`(§2.3) ·
Role 17·Channel 8(§2.4) · 평면 분리(§3.1) · `OperatingEnvelope`+`AutonomyTier`(§3.3.2) ·
coverage-audit(§3.3.4 정성) · `validate.py` SHACL 게이트(§3.3.5) · `gr-lang`(§8.3) ·
피드백 채널(§4.1). **노트는 "할 일 목록"이 아니라 절반 이상 구현된 시스템의 설계 근거다.**

## 3. 충돌 1건 — 가중 링크 층 vs "온톨로지에 확률 금지"

`ho:Anchor`가 `ho:Link`로 흡수되어 Link **9개체**가 가중을 단다(`weightOrigin` curated 8 ·
measured 1). 그러나 `ho:linkWeight` 정의는 **"0..1 fuzzy membership degree — A degree, NOT a
probability"** 다. 노트가 확률을 배정한 자리는 **파라미터 범위 위의 분포**이지 관계의 등급이
아니므로, 엄밀히 읽으면 충돌이 아니다. **용어 경계가 결정을 가르므로 결정 1로 올렸다.**

**권고 (c) 출처로 가르기** — `curated`는 "사람이 이 숫자를 확정했다"는 저작 사실이라
functional 잔류, `measured`(도구 추정)는 logical로. 되돌릴 대상 **9개 중 1개**,
부수 이득으로 `weightOrigin`이 **층 소속 결정 축**이 된다.

**(b) 선택 시 비용**: Link 9개체 가중 제거 + `LinkShape` 필수 해제 + 가중 웨이브 회귀 재검증.
열린 항목 `link-plane-weight-decision.md`도 자동으로 (C) 영구 crisp으로 귀결 —
**두 항목은 같은 질문의 두 층이므로 반드시 함께 답해야 한다.**

## 4. 부수 신규 3건

1. **DSL 재현성**(§3.3.3) — 원리는 이미 구현(`materialize.py`+`harness.lock.json` byte-identical).
   남은 것은 **산출물을 어디까지 스키마로 좁힐지**이며 결정 2 이후 판단.
2. **LLM 무효 출력 3유형**(§3.3.5: 중간 그래프 제출 / malformed 호출 / 함수 호출 생략) —
   vnv 체크리스트에 **그대로 추가 가능**(그래프 변경 0).
3. **claim 에이전트**(§2.4) — `role-auditor`는 있으나 claim 대응물 없음. 신설 시
   `role-benchmarker`(외부 기준 대조)와 **경계 명문화 필수**.

## 5. 반영 순서 (권고)

결정 1 확정 → **결정 2(`-space` 신설)** → `measured` 가중 재배치(1이 (c)일 때) →
결정 3(AOD 관계 명문화, 비용 0) → 결정 6(4축 규약 문서화) → 결정 5 경계 규칙 →
부수 3건 → 사례 프로젝트.

**주의 2건**: ① 결정 1과 `link-plane-weight-decision.md`는 함께 답할 것. ② 결정 3에서
AOD와 `OperatingEnvelope`를 합치지 말 것 — "볼 수 있는 것"과 "감당하겠다고 선언한 것"은
W1에서 확정한 capability≠authorization과 같은 종류의 구분이다.

## 6. 이 보고가 다루지 않은 것

Part V(검증·평가)·VI(운영)·§6.2 게임 메타포는 하네스 부품이 아니라 **운영 시스템 설계**라
별도 항목이 맞다. 특히 §6.1의 "사전 시나리오가 모두 커버"는 노트 자신이 §3.3.4에서
**달성 불가능하다고 정정**했으므로, 올릴 때는 커버리지 지표 + 에스컬레이션 임계로 재기술한다.
