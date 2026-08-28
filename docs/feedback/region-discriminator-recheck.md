---
status: approved            # 사용자만 approved로 바꾼다
targets: [ho:AlternativeOfSharedAnchorShape, ho:conceptFacet, id:pat-orchestrator-workers]
related: [docs/feedback/plane-editor-and-kg-content-decisions.md, docs/verify/b2-b3-region-verify.md, docs/verify/b1-concept-facet-verify.md, docs/feedback/anchor-move-recovery-tradeoff.md]
---
# 결정 재질의 — 대안쌍 "같은 영역" 판정, 유사도 하한을 넣을 것인가

`plane-editor-and-kg-content-decisions.md`의 **결정 6(미응답)**은 `AlternativeOfSharedAnchorShape`
강화안을 "**공유 태그 수·정의 유사도 하한** 등 추가 조건"으로 제시했다. 그 뒤 상황이 두 가지
바뀌어, 같은 질문을 **새 사실 위에서** 다시 드린다.

## 무엇이 바뀌었나

**1. facet 기반 region이 이미 land됐다** (B1→B2→B3, 승인 항목 `b-wave-backbone-layering.md`의
"(B) → (A)" 결정 범위). 판정 `docs/verify/b2-b3-region-verify.md`(PASS-with-notes, 차단 0)의
결론:

> B3 region 재정의는 **유사도 하한 없이도 허위 region을 실제로 제거한다**. scope 단독으로 태그를
> 공유하던 쌍(`agent-developer`↔`agent-inspection`)과 scope+quality를 공유하던 쌍
> (`role-benchmarker`↔`role-auditor`)이 **구 shape에서 통과 → 신 shape에서 FAIL**로 뒤집히고,
> 진짜 쌍(anatomy/method 공유)은 통과를 유지한다. 기제는 유사도 계측이 아니라 **앵커 자격 제한**이다.

부수 수치: 공동영역 쌍 1081 → 173(84% 감소), 판별 태그 없는 개체 62 → 35, 단독 태그 개체 27 → 0.

**2. 유사도 축이 실패한다는 실측이 나왔다.** 병행 세션이 앵커 lane에서 측정한 바로는, 문장
교체(`Critical failure`→`Cure`)와 "가운데 삭제"가 **문자열상 구분 불가**였다. 즉 유사도 하한은
사람이 보기엔 다른 두 사건을 같은 값으로 만든다. 같은 축을 그래프 region 판정에 넣으면 그
함정을 이 저장소로 옮겨오게 된다.

## 질문 1 — 결정 6을 어떻게 닫을까

- **(a) facet 공유로 충족된 것으로 보고 유사도 하한은 넣지 않는다** (권고). 근거는 위 두 가지.
  결정 6은 "강화한다"는 취지였고, 강화는 **더 나은 축으로** 이미 이뤄졌다.
- **(b) facet 공유 위에 유사도 하한을 추가로 얹는다.** 더 보수적이지만, 유사도가 신뢰할 수 없는
  축임이 실측된 상태라 **거짓 안심**이 될 수 있다. 채택 시 하한값과 그 근거가 필요하다.
- **(c) 공유 태그 **수** 조건만 추가한다**(유사도 없이, 예: 판별 facet 태그 2개 이상 공유).
  현재 판별 태그가 1개뿐인 개체가 많아 사실상 대부분의 대안쌍을 막는다 — 잔여 위험 방향을
  "허위 통과"가 아니라 "정당한 쌍 차단"으로 더 밀어붙이는 선택이다.

**남은 위험의 방향을 밝혀 둔다**: 지금 상태의 위험은 허위 region이 통과하는 쪽이 아니라, 판별
태그가 없어 **정당한 대안쌍이 fail-closed로 막히는** 쪽이다(잔존 35개체, 대부분 `c-safety` 등
quality만 가진 guardrail). 그 확장 여부는 병행 세션이 별도 항목으로 올린다(B2를 quality-only
까지 넓힐지) — 이 항목과 독립적으로 답해도 된다.

## 질문 2 — `pat-orchestrator-workers` 태그 백필 (1줄)

판정이 발견한 실례: `id:pat-orchestrator-workers`는 **태그가 하나도 없어** region이 없다. 그런데
`id:pat-peer-mesh`의 정의문이 이 노드를 **명시적 대안**으로 지목한다("The alternative
coordination topology to orchestrator-workers"). 즉 이 저장소에서 가장 정석적인 대안쌍이 지금
shape로 **차단**된다.

- **(a) 지금 백필한다** (권고) — `pat-peer-mesh`와 같은 `c-pattern-taxonomy`(anatomy) 1줄 추가.
  사실 근거는 두 노드의 정의문에 이미 있다. 승인된 B2 범위(단독 태그 27개)에는 들어 있지
  않아서 임의로 하지 않았다.
- **(b) 잔존 35개 확장 결정과 함께 처리한다.**

## 참고

- 이 항목은 orchestrator가 남긴 결정 요청이다. 승인은 `status`를 `approved`로 고치고 질문별로
  선택지를 적으면 된다.
- 관련해 아직 열려 있는 결정: `docs/feedback/envelope-render-gap.md`(선언된 범위·자율성 등급이
  산출 문서에 렌더되지 않음), `docs/feedback/anchor-move-recovery-tradeoff.md`(병행 세션).

## 사용자 피드백
1. (a)
2. (a)
