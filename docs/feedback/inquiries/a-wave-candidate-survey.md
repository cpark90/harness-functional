---
status: answered      # inspection 조사 — orchestrator/사용자 소비 후 closed
kind: candidate-survey
targets: [ho:alternativeOf, ho:overlapsWith, ho:Anchor, ho:anchorConfidence, id:scheme]
source: docs/feedback/verified/annotation-backbone-architecture.md   # 미반영 항목 실측 §남은 일 1
---
# A-wave 후보 탐색 — annotation·anchor·확률 edge에 담을 "실재하는 내용"이 있는가

사용자 지시(2026-08-28): "A wave 후보 탐색부터 진행". 승인된 메커니즘(alternativeOf·
overlapsWith·Anchor·anchorConfidence)에 넣을 **실재 후보**를 그래프에서 전수 탐색했다.
저작은 하지 않았다(inspection 역할 경계) — 이 문서는 후보 목록과 판정이다.

**결론 한 줄**: `ho:alternativeOf`에 넣을 **진짜 대안쌍은 사실상 0**이고, 대신
`ho:overlapsWith`에 넣을 **43쌍이 이미 산문으로 존재**한다. 그리고 alternativeOf가 비는
것은 저작 태만이 아니라 **backbone이 평면이라 "region"이 변별력을 잃었기 때문**이다 —
B-wave(계층화)가 A-wave의 전제라는 것이 실측으로 확인됐다.

## 1. 탐색 방법 (4축 전수, abox 304 개체)

| 축 | 무엇을 찾았나 | 판정 기준 |
|---|---|---|
| 축1 | 같은 클래스에서 **태그 영역이 겹치는 쌍** | tag Jaccard ≥0.5, 공유태그 ≥2 |
| 축2 | **정의/프롬프트 텍스트 유사도** 상위 | difflib ratio ≥0.55 |
| 축3 | 정의 안에서 **다른 개체를 명시 대조**한 쌍 | "Distinguished from / Distinct from / Contrast / rather than …" + `id:` 참조 |
| 축4 | **cap 근접 노드**(분해 후보) | chars//4 기준 상위 |

## 2. 축별 결과와 판정

### 축1 — 태그 영역 중복: 7쌍, **전부 대안 아님**
`mem-cache~mem-firmware`(tagJ 1.00) · `role-auditor~role-benchmarker`(0.67) ·
`h-multiagent~h-peer-mesh`(0.67) 등. 그러나 **텍스트 유사도가 0.01~0.20**이다.
즉 같은 영역의 **형제(보완)** 이지 같은 지식의 **대안 설명**이 아니다. 메모리 3-tier를
alternativeOf로 묶으면 팩이 tier 하나만 싣게 되어 **정보가 사라진다**. → alternativeOf 0건.

### 축2 — 텍스트 실중복: 두 가족이 나왔고 **둘 다 alternativeOf가 아니다**
- **(가) `c-X` ↔ `gr-X` 16쌍** (이름 어간 일치), 그중 6쌍이 유사도 0.77~0.90:
  `c-report-over-prompt~gr-report-over-prompt`(0.90) · `c-bounded-context~gr-bounded-context`
  (0.87) · `c-escalation~gr-no-arbitrary-decision`(0.84) · `c-least-privilege~gr-least-privilege`
  (0.83) · `c-dispatch~gr-dispatch-execution`(0.79) · `c-simplicity~gr-simplicity`(0.77).
  **같은 지식을 원리(Concept)와 명령(Guardrail) 두 레지스터로 두 번 서술**한 것 — 제안이
  말한 "같은 지식의 다른 설명"에 **의미상 가장 근접**하다.
  **그런데 shape이 거부한다**: `AlternativeOfSharedAnchorShape`는 두 노드가 `ho:tagged`
  개념을 **공유**할 것을 SPARQL로 요구하는데, **Concept은 `ho:tagged`를 0개 보유**한다
  (개념은 태그되는 쪽이 아니라 태그 자체). 구조적으로 alternativeOf 불가.
- **(나) `oa-*-internal` 6개** (유사도 0.78~0.93): 역할별 내부 관측영역으로 **템플릿
  보일러플레이트**. 대안 서술이 아니라 **중복 저작**이므로 처방이 다르다(공유
  PromptSection/템플릿화 또는 그대로 수용).

### 축3 — 저자가 이미 산문으로 써 둔 인접성: **43쌍, 엣지는 0건** ★A-wave의 실제 수확물
`ho:overlapsWith`에는 **전용 shape이 없어** 제약 없이 저작 가능하고, retrieve에서
**비배제**라 회귀 위험도 없다.

**(가) 같은 클래스 + 공유 태그 있음 — 25쌍** (alternativeOf shape도 통과 가능하지만
텍스트 유사도가 낮아 **overlapsWith가 맞다**):
`role-tester~role-vnv`(0.39) · `role-analyst~role-vnv`(0.37) · `role-analyst~role-research`
(0.30) · `role-curator~role-research`(0.24) · `role-auditor~role-vnv`(0.22) ·
`role-analyst~role-curator`(0.20) · `role-benchmarker~role-research`(0.18) ·
`tier-bounded-autonomy~tier-per-plan-approval`(0.18) · `gr-human-checkpoint~
gr-no-arbitrary-decision`(0.15) · `role-author~role-synthesizer` · `role-planner~
role-strategist` · `pat-expert-pool~pat-supervisor` · `gr-grounding~gr-integration-coherence` ·
`h-harness-factory~h-multiagent` · `gr-envelope-check~gr-envelope-unknown` ·
`chan-dispatch~chan-peer` · `fp-envelope-exit~fp-envelope-exit-severe` ·
`role-orchestrator~role-planner` · `tier-*` 3쌍 · `mode-hybrid~mode-standing-service` ·
`pat-blackboard~pat-pipeline` · `role-coordinator~role-orchestrator` ·
`chan-dispatch~chan-workspace`.

**(나) 같은 클래스 + 공유 태그 없음 — 17쌍** (overlapsWith 가능, alternativeOf는 shape 거부):
`pat-fanout-fanin~pat-orchestrator-workers`(0.26) · `fp-conflict-contradiction~
fp-duplicate-claim`(0.18) · `pat-blackboard~pat-orchestrator-workers` · `pat-producer-reviewer~
pat-reflection` · `c-lesson~c-memory` · `scn-envelope-exit~scn-trigger-near-miss` ·
`gr-controlled-vocabulary~gr-standard-terms` · `fp-agent-failure-retry~fp-repeated-mistake` ·
`gr-no-arbitrary-decision~gr-user-elicitation` · `gr-mode-fit~gr-scale-modes` 외.
**주의**: 이들은 태그를 공유하지 않으므로, 저작 시 **왜 인접한가를 태그로도 드러낼지**
(같은 개념 태그 추가) 결정이 필요하다 — 태그를 늘리면 (가)군으로 승격된다.

**(다) 클래스 다름 — 1쌍**: `c-bounded-context~pat-knowledge-plane-separation`. 역할이 다르니
산문 유지.

### 축4 — 분해 후보: cap 260 근접 12개
`mode-standing-service`(252) · `h-workspace-synthesis`(245) · `pat-knowledge-plane-separation`
(243) · `role-benchmarker`(238) · `mode-agent-teams`(228) · `pat-blackboard`(222) ·
`role-coordinator`(215) · `role-curator`(214) · `role-auditor`(212) · `chan-peer`(208) ·
`h-harness-factory`(204) · `pat-peer-mesh`(192). 전부 **cap 이내**라 린터는 통과하지만,
정의 안에 명제가 여럿 들어 있어 annotation 단위 분해의 1차 후보다.

## 3. 근본 제약 — "region"이 변별력을 잃었다 (B-wave가 A-wave의 전제)

| 실측 | 값 |
|---|---|
| `ho:tagged` 보유 개체 | 126 |
| **태그를 1개만 가진 개체** | **109 (86%)** |
| 개념(=region) 수 / 평균 region 크기 | 43 / 3.5 |
| **최대 region `c-multiagent`** | **41 개체 (태그된 것의 1/3)** |
| backbone 깊이 | **1 (평면)** |

shape은 "같은 region = `ho:tagged` 공유"로 정의한다. 그런데 개체 대부분이 태그 1개이고
그 태그가 `c-multiagent`이면, **41개체가 전부 "같은 region"** 이 된다. 이 상태에서
"영역당 하나의 서술만 팩에 싣는다"는 규칙은 의미를 갖지 못한다(무엇이 무엇의 대안인지
구분 불가). **따라서 backbone을 내용 구분 축으로 계층화하는 B-wave가 선행되지 않으면
alternativeOf는 저작해도 옳게 저작할 수 없다.** 앞선 보고의 추정을 실측이 확정했다.

## 4. 권고 — A-wave 재정의 (승인 필요)

원안 "A=alternativeOf/Anchor 저작"은 **저작할 것이 없어 성립하지 않는다**. 다음으로 재정의:

- **A1 (즉시 가능·저위험)**: 축3의 **43쌍을 `ho:overlapsWith` 엣지로 저작**. 산문에만 있던
  인접성을 기계가시화한다. shape 없음·retrieve 비배제 → 회귀 위험 없음. 부수 효과로
  disambiguation 산문을 나중에 줄일 근거가 생긴다. (나)군 17쌍은 **태그 보강 여부**를
  brief에서 결정.
- **A2 (조사 중 결론까지 도달 — 아래 §5)**: `c-X ↔ gr-X` 중복은 **정의 축약으로 처리**한다.
  alternativeOf도, shape 완화도 아니다. 대상은 16쌍 전체가 아니라 **7쌍**이고, 절감 효과는
  팩 예산의 약 25%로 실측됐다.
- **A3 (B-wave와 함께)**: 축4의 12개 분해 후보 — 계층화된 backbone이 서야 분해 단위의
  anchor를 제대로 붙일 수 있다.
- **B-wave 선행 확정**: §3 실측이 근거. 계층 축 후보는 별도 판정 필요(개념 재배치라 파급 큼 —
  `docs/plans/abox-taxonomy-reorg.md` 선례 참조).

**anchor/anchorConfidence**는 A1만으로는 여전히 0으로 남는다. `ho:Anchor` n-ary 노드는
**"어떤 서술이 어떤 region에 얼마의 확신으로 걸려 있는가"** 를 담는데, region이 평면인 지금
확신값을 부여할 의미 있는 대상이 없다 — **B-wave 이후로 미루는 것이 정직하다**.

## 5. A2 결론 — 실측으로 판정 완료 (shape 완화 아님, 정의 축약)

세 가지를 이어서 측정해 A2를 열어두지 않고 닫았다.

**(1) 태그 실측**: `gr-X`는 **16/16 전부** 자기 개념 `c-X`로 태그돼 있다(균일 규약).
따라서 "개념 자신이 region"으로 shape을 완화하면 16쌍 모두 alternativeOf 자격을 얻는다 —
**기술적으로는 가능**하다.

**(2) 그런데 하면 안 된다**: alternativeOf는 retrieve에서 **연결성분당 1개만 admit**한다.
쌍둥이를 대안으로 묶으면 팩이 Concept 또는 Guardrail 중 **하나만** 싣는데, 실측상 승자는
질의 점수에 따라 뒤바뀐다(질의A에서는 `c-`가 1위, 질의B에서는 `gr-`가 1위). 하네스를
조립하려면 **결합 대상인 Guardrail이 필요한데 태그인 Concept만 남는 경우**가 생긴다 —
정보 손실이자 조립 실패. → **alternativeOf 부적합, shape은 현행 유지**.

**(3) 그래도 중복은 실재하고 비싸다**: 두 질의로 팩을 투영하니 쌍둥이가 **1·2위에 나란히**
실렸고 예산은 **896/900(99.6%)** 로 거의 소진됐다. 정량화:

| 구간 | 쌍 수 | 추정 중복 토큰 |
|---|---|---|
| sim ≥0.56 (**실질 중복**) | **7** | **~225** |
| sim ≤0.34 (이미 분화됨) | 9 | ~63 |
| 합계 | 16 | ~288 (기본 예산 900의 32%) |

상위 7쌍: `report-over-prompt`(0.90) · `bounded-context`(0.87) · `least-privilege`(0.83) ·
`simplicity`(0.77) · `root-cause`(0.74) · `controlled-vocabulary`(0.70) · `verify-proceed`(0.56).
나머지 9쌍은 이미 원리/명령으로 잘 분화돼 있다(중복 1~18 tok) — **규약이 작동할 수 있음을
스스로 보여주는 대조군**이고, 7쌍만 그러지 못한 것이다.

**A2 처방(확정 권고)**: 상위 **7쌍만** 정의를 축약한다 — Concept에는 **원리 진술**,
Guardrail에는 **명령형 규칙**만 남기고 중복 문장을 걷어낸 뒤 서로를 참조한다. 노드도
엣지도 늘지 않고, 두 노드 다 살아 있으며, 두 노드가 함께 실리는 팩에서 **약 225 토큰
(기본 예산의 25%)** 이 회수된다. 회귀 위험은 정의 텍스트 변경뿐이라 낮다.

## 6. 부수 관찰 (이번 조사 중 확인 — 별건)

그래프가 **304 개체**로 증가했고 `AutonomyTier` 6개와 envelope 관련 shapes는 land됐으나
**`OperatingEnvelope` 0 / `EnvelopeStatement` 0**이다. W1이 **메커니즘만 서고 내용이 비는
같은 패턴**으로 가고 있을 수 있다(병행 세션 진행 중이면 정상). W1 브리프 §4d는 하네스 2종에
**실제 envelope 선언 부여**를 요구하므로, 그 단계가 남아 있는지 orchestrator 확인 권함.
