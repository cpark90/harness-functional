---
status: approved            # 사용자만 approved로 바꾼다
targets: [id:scheme, ontology/abox/core/vocab/concepts.ttl, tbox:ho:conceptFacet, ho:alternativeOf]
related: [docs/feedback/inquiries/b-wave-facet-design.md, docs/feedback/inquiries/a-wave-candidate-survey.md]
---
# B-wave — backbone 계층화 (내용 구분에 따른 layered skeleton)

승인된 backbone+annotation 항목 중 **"내용 구분에 따른 layered skeleton"** 이 미반영으로 남아
있고(실측: `verified/annotation-backbone-architecture.md §미반영 항목 실측`), A-wave 후보 탐색에서
**이것이 A-wave의 전제**임이 확인됐다. 설계 원본: `inquiries/b-wave-facet-design.md`.

## 요지

- **문제(실측)**: 최상위 12개에 분할 기준이 없어 방법·성질·부위·영역·범위가 섞여 있고,
  `c-multiagent` 하나가 41개체(태그된 것의 1/3)를 삼키며 그중 27개는 **그 태그 하나뿐**이다.
  태그 1개뿐인 개체가 115개라 교차 판별이 불가능하다.
- **설계**: 계층을 **새 루트로 깊게 만들지 않는다**. `skos:broader`가 검색에서 0.5 감쇠라
  깊이를 늘리면 개념 발견성이 절반씩 깎이고, 팩 예산은 이미 896/900으로 포화다. 대신
  **facet(내용 축)을 개념의 선언 속성(`ho:conceptFacet`)으로** 두고 기존 트리를 그 안에서
  정리한다 — 깊이 증가 0, 검색 비용 0.
- **facet 5**: anatomy(구성) / quality(성질) / method(방법) / domain(영역) / **scope(범위)**.
  각각 **판정 규칙**으로 정의해 새 개념이 표류하지 않게 한다.
- **효과**: alternativeOf의 "같은 region"을 *아무 태그 공유*가 아니라 **판별 facet 공유**로
  재정의할 수 있어(shape SPARQL 1곳), "멀티에이전트라서 같은 영역"이라는 허위 region이 사라진다.

## 결정 요청 (선택지)

- **(A) 전 단계 일괄**: B1(facet 선언+재부모화) → B2(scope 단독 27개체 내용 태그 보강) →
  B3(region 재정의) 한 wave로.
- **(B) B1 선행 분리** (inspection 권고): B1만 먼저 land — 깊이·파일·접두사가 변하지 않아
  **검색 무영향**을 확인하기 쉽다. 랭킹을 바꾸는 B2는 별도 wave로 분리해 회귀 판정을 명확히.
- **(C) scope facet 없이 더 깨끗하게**: `c-multiagent`를 해체해 41개체 전부에 내용 태그를
  부여하고 scope facet 자체를 두지 않는다. 결과는 가장 깨끗하나 B2 규모가 27→41로 커진다.
- **(D) 직접 선별**: 설계 문서 §7의 결정 4건을 개별 지정.

추가로 §7의 판단 3건(`c-communication` 자식 재부모화 / `c-inforetrieval` domain vs anatomy /
`c-oversight` quality vs method)은 어느 선택지에서도 결정이 필요하다.


## orchestrator 노트 (2026-08-28 — 중복 항목 통합)

- **선택지 (B)를 이미 잠정 채택**했다(설계 §7-4의 inspection 권고와 동일): B1만 먼저 land해
  검색 무영향을 확인하고, 랭킹을 바꾸는 B2는 별도 wave로 분리한다. 사용자가 다른 선택지를
  고르면 그쪽이 우선한다.
- **실행 순서 제약**: 이 wave는 `vocab/concepts.ttl`을 건드리므로, 진행 중인 **AV W1
  envelope wave의 vnv 게이트가 끝난 뒤** dispatch한다(같은 파일 동시 편집 회피). sim-hil
  B-T(TBox)와는 파일이 겹치지 않아 병행 가능.
- **실측 어긋남 1건 (답변 시 함께 정리하면 좋음)**: `overlapsWith` 후보 수가 vnv 실측
  `docs/verify/kg-content-candidates.md`에서는 **2쌍**(shape 자격 ∧ 정의 유사도 0.50 교차
  필터), inspection 탐색 `inquiries/a-wave-candidate-survey.md`에서는 **43쌍**("이미 산문으로
  존재하는 부분 겹침" 기준)이다. 기준 차이라 모순은 아니지만 **어느 기준을 채택하느냐가 곧
  A-wave 저작량**이다. 앞선 항목 `plane-editor-and-kg-content-decisions.md`의 **결정 5**
  (overlapsWith 2쌍 저작 여부)가 미응답 상태이므로 함께 답하면 한 번에 정리된다.
- 두 실측 모두 **`alternativeOf`에 넣을 진짜 대안쌍은 사실상 0**이라는 데 일치한다 — KG의 그
  공백은 방치가 아니라 증거가 지지하는 정답이며, 그래서 이 B-wave(region 변별력 확보)가
  A-wave의 전제가 된다.

## 사용자 피드백
(B) -> (A)

## 적용 결과 — B1 (orchestrator 기록, 2026-08-28)

**B1 착지·판정 통과** (pass-with-notes, 차단 0) — `docs/verify/b1-concept-facet-verify.md`.

- `ho:conceptFacet` 신설(닫힌 5값) + **core Concept 84/84 부여**(anatomy 42·method 25·
  quality 12·domain 4·scope 1) + facet 불일치 자식 3건 재부모화 + ONTOLOGYSTYLE §3에
  판정 규칙(적용 순서·부모 우선 tie-break·scope 부모 예외) 고정.
- **검색 무영향 증명**: facet 선언만의 효과는 40질의 × {md,json} = **80/80 byte-identical**
  (triple 단위 3-way 격리 비교). 랭킹이 변한 곳은 **승인된 재부모화 3건뿐**이며 6질의/12 pack —
  developer 자기보고(16질의 중 2)보다 넓으므로 **B2 회귀 기준선은 판정 §3.3 표**를 쓴다.
- **shape은 presence 미강제**(값집합만). 근거: harness-recipes CI가 중앙 shapes로 union을
  검증하고 recipe-local Concept이 239개라 `minCount 1`이면 하위 repo 전멸. 중앙 의무는
  `lint_uniformity.py`의 core 한정 검사가 진다(실측으로 보상 통제 위치 확인).
- **B3 가능성 실증**: facet 필터 SPARQL로 허위 region 쌍(agent-developer↔agent-inspection)이
  FAIL로 뒤집히고 진짜 쌍은 conforms, **co-region 쌍 1081→173(84% 감소)**.

### orchestrator 확정 — 판별 facet = anatomy · method

설계 §4가 긍정 열거만 해 `quality`의 지위가 미결이었다. **quality·domain·scope는 노드에
대해 말할 뿐 노드가 무엇에 관한 것인지를 말하지 않으므로 region 근거가 될 수 없다**
(`c-multiagent` 버킷을 만든 것과 같은 실패 양식). 대가를 알고 받는다: 태그된 개체 150개 중
**62개가 region 없이 남고**, B2(27) 후에도 **35개 잔존**(대부분 quality만 가진 guardrail).
region이 없으면 그 노드로 `alternativeOf` 선언이 불가하며 이는 보수적으로 안전한 상태다.

### 후속 (사용자 결정 필요 — 별도 항목으로 올림)

1. **B2 범위를 quality-only 노드까지 확장할 것인가** — 승인된 B2는 scope 단독 27개체다.
   잔존 35개에 내용 태그를 주려면 승인 범위 확장이 필요하다(임의 확장하지 않았다).
2. **문서 지연(비차단)**: `CLAUDE.md` "Adding vocabulary" 절과 `docs/CONTRIBUTING-ONTOLOGY.md`가
   아직 "연결 안 하면 validate.py가 orphan으로 잡는다"까지만 말한다. 이제 중앙 신규 개념은
   facet도 선언해야 하고 그 실패는 `validate.py`가 아니라 `lint_uniformity.py`에서 난다.

### 인계

B2·B3는 합의대로 다른 세션(harness-ontology-8d)이 인수했다. 인계 자료: 위 확정값 3종 +
facet 판별 시뮬레이션 수치 + B2 회귀 기준선(§3.3 표). 결정 6(shape 강화 방식) 되묻기는
중복 방지를 위해 그 세션이 B3 착수 시 한 번만 올린다.

## 적용 결과 — B2·B3 (orchestrator, 2026-08-28)

사용자 결정 "(B) → (A)"의 B1 이후 단계. **B1은 병행 세션(harness-ontology-2f)이 land**했고,
**B2·B3는 이 세션이 인수해 developer dispatch로 적용**했다. 판정
`docs/verify/b2-b3-region-verify.md` = **PASS-with-notes, 차단 0**.

- **B2**: `c-multiagent` 단독 태그 **27개체**(agent 5·chan 6·dlv 2·gr 3·pat 1·role 10)에 내용
  태그 1개씩 부여. **전부 기존 Concept, 신설 0, 건너뜀 0** — 각 태그의 근거를 그 개체 자신의
  definition/promptText에서 인용(다수가 verbatim 일치: role 6개는 정의 첫 절이 "dispatch-invoked
  only"). 결과: 단독 태그 개체 **27 → 0**, 판별 태그 없는 개체 **62 → 35**.
- **랭킹 영향(의도된 변화)**: 40질의 중 **26 byte-identical**, 상위권 이탈 **0**. 변한 질의는
  개념 질의가 해당 개체를 새로 찾는 방향("verify then proceed"에 `dlv-verified-result`·
  `role-vnv` 신규 admit 등). developer가 스스로 flag한 유일한 주목점("exchange information"
  질의에서 guardrail 3종이 채널에 밀려 하강)은 vnv 독립 판정 결과 **탈락·점수하락 0, 위치만
  하강 → 개선**으로 확정.
- **B3**: `ho:AlternativeOfSharedAnchorShape`의 region 근거를 **판별 facet(anatomy·method) 공유**로
  한정(SPARQL 2줄 추가). `targetSubjectsOf ho:alternativeOf` 불변 — 선언된 경우에만 발화.
- **증거(실그래프 엣지 0이라 negative control이 유일 증거)**: 허위쌍 2종이 **구 shape 통과
  (vacuous-pass 재현) → 신 shape FAIL**, 진짜쌍 2종 CONFORM, region 없는 쌍 FAIL. **연합
  안전성**: facet 없는 recipe-local 개념은 위반 아님, staging recipe 3종 union **PASS 재확인**
  (이 세션이 직전에 land한 산출물의 회귀 없음).
- **재량 3건은 vnv 반증 시도 후 전부 유지**(채널 6개 uniform 태깅 / role-coordinator→c-delegation
  / vnv 계열의 c-cross-validation 기각). 단 `c-delegation` 정의문 주어가 "the user-facing
  orchestrator"로 좁아, 태그 교체가 아니라 **정의 일반화**가 권고됐다(비차단).
- **범위 준수**: 승인된 27개 밖으로 태그를 확장하지 않음. 범위 밖 발견 2건은 미조치 —
  ① 판별 태그 없는 잔존 35(병행 세션이 별도 결정 항목으로 올림), ② `pat-orchestrator-workers`가
  무태그라 정석 대안쌍(↔`pat-peer-mesh`)이 잠재 차단(→ 결정 요청
  `docs/feedback/region-discriminator-recheck.md`에 백필 여부로 포함).

**후속 결정 요청 등록**: `docs/feedback/region-discriminator-recheck.md`(status: open) — 미응답
결정 6("유사도 하한으로 shape 강화")을 새 사실 위에서 재질의. 판정 결론은 **"유사도 하한 없이도
허위 region이 실제로 제거된다"**이고, 병행 세션 실측은 **유사도 축 자체가 신뢰 불가**임을 보였다.
