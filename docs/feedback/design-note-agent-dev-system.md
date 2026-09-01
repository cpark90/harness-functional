---
status: open            # 사용자만 approved로 바꾼다
targets: [tbox:ho:, ho:Link, ho:linkWeight, ho:ObservationSpace, ho:OperatingEnvelope, ho:TestScenario, ontology/, recipes]
related: [docs/feedback/link-plane-weight-decision.md, docs/feedback/av-odd-scenario-transfer.md, docs/feedback/inquiries/av-odd-scenario-transfer.md]
revision: 2026-08-31 정리본 (Part 0 명명 규약 신설) — 이전 전사본을 대체
---
# 설계 노트 반영 — 에이전트 기반 개발·운영 시스템 (개정본)

사용자 설계 노트의 **개정본**(Part 0 명명 규약 신설)을 전사한다. 사용자 지시:
**"현재 내용으로 업데이트."** 앞선 전사(Part I~X만 있던 판)를 이 문서가 대체한다.

## 개정본에서 새로 들어온 것 — Part 0 (명명 규약)

노트가 **용어 축 충돌을 먼저 차단**하고 시작한다. 이전 판에는 없던 층위다.

1. **세 축 배타 배정** (0.1) — `plane`(지식 종류: annotation/design/protocol/interface/source/
   memory) · `tier`(추상도: functional/logical/concrete/executable) · `layer`(상황 구성요소
   1~6, 6-Layer Model이 독점). **나머지 두 축은 "layer"라는 단어를 쓰지 않는다.**
2. **산출물 접미사로 확률 소재 표시** (0.2) — `-ontology`(functional, 확률 없음) ·
   **`-space`(logical, 확률은 여기만)** · `-kg`(concrete, 확정값) · 실행물.
   *"`-space` 파일을 읽는 에이전트는 샘플링이 필요하다는 것을 이름에서 안다."*
3. **네임스페이스 접두어로 차용 출처 명시** (0.3) — `asam:`(그대로 수입, **수정 금지**) ·
   `av:`(구조만 차용, 의미 재정의) · `agt:`(우리 고유). 근거: `scenario`라고만 쓰면 LLM이
   도로 주행 사전확률로 끌려가 요청하지 않은 차량·차선·기상 개념을 생성한다(§1.2 학습자료 종속).
4. **`agt:AOD`(Agent Operational Domain, 작업영역)** (0.4) — ODD 대응 개념. ODD와 한 글자
   차이로 차용을 드러내되 문자열이 달라 혼동 없음. 관계: `agt:Harness --enforces--> agt:AOD`.
   **AOD는 에이전트 단위로 하나씩** 존재(하네스는 여러 에이전트가 공유 가능) — 이 점 때문에
   대안 `HOD`(Harness Operational Domain)를 기각.
5. **온톨로지 파일 구성** (0.5) — `domain-ontology`(코어) / `harness-ontology`(기존) /
   `aod-ontology` / `scenario-ontology` / `defect-ontology` / `scenario-space`(L) /
   `project-kg`·`run-kg`(A). **경계 규칙: 서로 import는 하되 클래스를 정의해 넣지 않는다.**
6. **표기 형식** (0.6) — 식별자는 영어 케밥/PascalCase, 산문은 한글, **용어집은 별도 파일 없이
   `domain-ontology`의 `rdfs:label`에** 둔다(온톨로지 자체가 용어집 → 이중 관리 제거).

부수 개정: §3.1 평면에 식별자 부여, §3.2가 "layer→plane" 용어 정정과 **"배정된 plane 집합이
곧 그 에이전트 AOD의 지식 축 성분"** 을 명시, §3.3.2가 우리 명칭을 `agt:AOD`로 고정, §8.3이
구체 표기를 0.6으로 위임.

## 실측 요약 (verified 보고 §1~§3 근거)

- **노트 프로그램의 절반 이상이 이미 land** — cap 260(§8.2) · `memoryWriteTiming`(§3.4) ·
  `mode-standing-service`/`mode-sub-agents`(§2.3) · Role 17·Channel 8(§2.4) · 평면 분리(§3.1) ·
  `OperatingEnvelope`+`AutonomyTier`(§3.3.2) · `gr-lang`(§8.3) · 이 채널 자체(§4.1).
- ★**AOD는 이미 있다, 이름만 다르다** — `ho:Agent` 5 : `ho:ObservationSpace` 5 :
  `ho:agentObservation` 5로 **정확히 1:1**이다. 노트가 "AOD는 에이전트 단위로 하나씩"이라며
  HOD를 기각한 바로 그 카디널리티가 그래프에 이미 성립해 있다.
- ★**확률의 자리가 없다** — `abstractionLevel`·`scenarioParameter`·분포 어휘가 TBox **0건**.
  그래서 가중이 온톨로지 층(`ho:Link` 9개체, curated 8·measured 1)으로 흘러들었다.
- **`asam:` 버킷은 우리에게 비어 있다** — 유료 표준을 verbatim 수입하지 않는 것이 우리
  라이선스 규율이라, 실측상 `asam:`/`av:` 접두어 사용 **0건**이고 출처는 이미 `dct:source`로 단다.

## 결정 요청

**결정 1 — 「확률」과 「정도(degree)」의 경계** ★핵심 (이전 전사에서 이월)
`ho:linkWeight` 정의는 **"0..1 fuzzy membership degree — A degree, NOT a probability"** 다.
노트는 "온톨로지는 확률 관계를 표현하지 않는다"(functional)고 한다. 엄밀히 읽으면 충돌이
아니고(퍼지 소속도 ≠ 파라미터 분포), 느슨히 읽으면 충돌이다.
- (a) degree는 functional에 허용 — 현행 유지, `-space`는 **분포 전용**으로 신설.
- (b) 모든 등급을 logical로 — 온톨로지는 crisp만. 방금 land한 층을 되돌린다.
- **(c) 출처로 가르기 (inspection 권고)** — `curated`(사람이 숫자를 확정한 저작 사실)는
  functional 잔류, `measured`(도구 추정치)는 logical로. 되돌릴 대상 **9개 중 1개**.

**결정 2 — `-space`(logical tier) 신설 착수**
확률을 둘 자리를 만드는 작업. 어휘: `tier`(functional/logical/concrete) · 파라미터 선언(범위·
단위) · **분포는 파라미터에만** · 변량(seed·runCount). 내 AV 이식 계획 **W2**가 그대로 대상.

**결정 3 — `agt:AOD` 정합 방식** (실측으로 선택지가 좁혀짐)
AOD ≈ `ho:ObservationSpace`(Agent 1:1, 이미 존재)이고, 우리 `ho:OperatingEnvelope`는
**하네스가 감당하겠다고 선언한 요청 범위**로 노트에 대응물이 없는 별개 구성이다.
- **(a) 관계만 명문화 (권고)** — 신설 0. "AOD=에이전트 인지영역=ObservationSpace,
  하네스가 `hasAgent`+`agentObservation`으로 강제"를 정의문·대응표에 적고, envelope는
  **상보 구성**으로 구분 서술.
- (b) `ObservationSpace`에 `agt:AOD` altLabel을 달아 노트 용어와 검색 정합.
- (c) 이름을 AOD로 개명 — 기존 관측 사슬 문서·도구 전부 갱신 필요.

**결정 4 — 네임스페이스 3접두어 채택 여부**
실측상 우리는 **verbatim 수입을 하지 않아 `asam:`이 빈다**. 그리고 출처는 이미 `dct:source`로
단다. (a) 채택(빈 `asam:`을 유지해 "수입 금지"를 구조로 표시) / (b) **미채택, `dct:source`
유지 (권고)** — 접두어 3종은 우리 상황에서 정보를 더하지 않는다 / (c) `av:`만 도입해
"구조 차용" 표시.

**결정 5 — 온톨로지 파일 분할(0.5)과 경계 규칙**
현행은 단일 `ho:` + `tbox/abox/shapes` 3분할이다. 노트는 domain/aod/scenario/defect로
쪼개고 "import는 하되 클래스 정의는 넣지 않는다"를 규칙으로 둔다. 분할은 catalog·federation
경로에 파급이 크므로 (a) 지금 분할 / (b) **경계 규칙만 먼저 채택하고 분할은 필요 시 (권고)** /
(c) 현행 유지.

**결정 6 — 축 이름 충돌 방지**
노트가 `plane`/`tier`/`layer`를 배타 배정했는데, 우리에겐 **네 번째 축 `facet`**
(anatomy/quality/method/domain/scope, 개념 분류)이 이미 land돼 있다. plane(지식 산출물 종류)과
facet(개념 분류)은 **다른 것**이므로 충돌은 아니나, 규약 문서에 4축을 함께 적어야 한다.
동시에 노트가 미결로 둔 **평면 단방향 순서에서 `annotation`의 위치**(source 하위인가 상위인가)
결정 필요 — inspection 견해는 **하위**.

**결정 7 — claim 에이전트 신설** (audit은 `role-auditor`로 존재) · **결정 8 — 사례 프로젝트
(device harvest)를 recipe 레인으로 받을지**

## 사용자 피드백
(기재란)
