# 확률의 층 배정 + 사용자 설계 노트 처리 (2026-09-01)

원본: `docs/feedback/design-note-agent-dev-system.md`(전사) + `verified/`(파급).

## 재사용 지식
- ★**"확률은 온톨로지가 아니라 logical scenario 층에"** — AV 3계층(functional/logical/concrete)의
  핵심. functional=어휘와 관계만(확률 없음), logical=**파라미터 범위 위의 분포**, concrete=인스턴스.
- ★**degree ≠ probability**: `ho:linkWeight` 정의가 이미 **"0..1 fuzzy membership degree —
  A degree, NOT a probability(합 1 불필요·각 링크 독립 판정)"** 라고 못박고 있다. 그래서
  "온톨로지에 확률 넣지 마라"와 가중 링크가 **자동으로 충돌하지는 않는다** — 용어 경계 문제.
  판정을 임의로 내리지 말고 결정으로 올릴 것.
- ★**인과 진단**: 시나리오 추상화 어휘가 **TBox에 0건**(abstractionLevel·scenarioParameter 부재)
  = **확률을 둘 자리가 없다** → 그래서 가중이 온톨로지 층(`ho:Link`)으로 흘러들었다. 층을 만들면
  원인이 해소된다. "왜 여기 있나"를 구조로 설명하는 진단 패턴.
- **권고안 (c) 출처로 가르기**: `weightOrigin` curated(사람이 숫자 확정=저작 사실)는 functional에
  잔류, `measured`(도구 추정)는 logical로. 되돌릴 대상이 9개 중 1개뿐이라 비용 최소이고,
  weightOrigin이 **층 소속 결정 축**이 되는 부수 이득.
- **동일 질문의 두 층은 함께 답해야 한다**: 그래프 가중(결정 1)과 편집기 링크 평면 가중
  (`link-plane-weight-decision.md`)은 같은 질문 — 따로 답하면 두 층 의미가 갈린다.

## 처리 절차 교훈
- 사용자 설계 노트가 오면 **먼저 "이미 land된 것" 전수 대조**부터 한다. 이번 노트는 **절반
  이상이 이미 구현**돼 있었다(cap 260=§8.2, memoryWriteTiming=§3.4, mode-*=§2.3, Role 17/
  Channel 8=§2.4, OperatingEnvelope=§3.3.2, 평면분리=§3.1, gr-lang=§8.3). 대조 없이 반영안을
  쓰면 재제안=드리프트가 된다.
- 노트가 스스로 `[?]`로 남긴 것은 **그대로 결정 항목으로 승격**(예: 주석이 코드 상위인가 하위인가).
  inspection 견해는 첨부하되 노트의 미결 표시를 지우지 말 것.
- 노트가 자기 앞 절을 **정정**한 경우(§6.1 "모두 커버" → §3.3.4 "달성 불가, 측정 지표로")
  뒤 절이 우선. 반영안은 정정된 형태로 재기술한다.

## 개정본(Part 0 명명 규약) 추가 분석 — 2026-09-01
- ★**AOD는 이미 있다, 이름만 다르다**: 노트의 `agt:AOD`(에이전트 단위 하나씩, Harness가 강제,
  그래서 HOD 기각)는 우리 `ho:ObservationSpace`와 **Agent 5 : ObservationSpace 5 :
  agentObservation 5 = 정확히 1:1**로 이미 성립. 신설·개명 불요, **관계 명문화 + altLabel**이면 끝.
  ★**합치지 말 것**: `ho:OperatingEnvelope`("감당하겠다고 선언한 요청 범위")와 AOD("볼 수 있는
  것")는 다른 축 — 합치면 W1에서 확정한 **capability ≠ authorization**과 같은 혼동 재발.
- **`asam:` 버킷은 우리에게 구조적으로 빈다**: 유료 표준 verbatim 수입 금지 규율 때문에
  실측 `asam:`/`av:` 사용 0건이고 출처는 `dct:source`(7건)로 이미 표시. 노트의 접두어 3종은
  우리 상황에서 정보를 더하지 않음 → **미채택 권고**, 의도(출처 기계검사)는 `dct:source`
  SHACL 필수화로 살린다.
- **축이 4개다**: 노트의 plane/tier/layer + 우리 `facet`(개념 분류). plane=지식 산출물 종류,
  facet=Concept 분류라 **대상이 달라 충돌 아님**. 다만 규약 문서에 4축을 함께 적지 않으면
  저자가 facet을 plane으로 오인한다.
- **`-space` 접미사**가 비어 있는 칸을 정확히 지목: tbox(-ontology) / **없음(-space)** / abox(-kg).
  파일명 규약 채택은 federation catalog 경로 파급이 있어 별도 판단(경계 규칙만 먼저 채택 권고).
- 0.6 표기 형식은 **이미 그렇게 하고 있음**(gr-lang + ONTOLOGYSTYLE §1d, 용어집=prefLabel/
  definition, 별도 glossary 없음) → 신규 작업 0.
