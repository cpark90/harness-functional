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
