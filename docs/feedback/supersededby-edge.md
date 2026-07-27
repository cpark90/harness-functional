---
status: open            # 사용자만 approved로 바꾼다
targets: [core:pat-agent-teams, core:pat-sub-agents, core:pat-hybrid, core:mode-agent-teams, core:mode-sub-agents, core:mode-hybrid]
kind: decision
related: [docs/plans/OPEN-ISSUES.md, docs/feedback/verified/execution-mode-axis-finalize.md]
---
# 결정 요청 (B9) — 폐기↔후계 관계를 산문이 아니라 그래프 edge로

## 조사 결과 (실측)
`ho:maturity "deprecated"` 노드는 **정확히 3개**이고, 각자의 후계가 `skos:definition` **산문
문구**로만 존재한다 — `ho:supersededBy` 같은 그래프 edge는 **TBox에 없다**(`grep supersededBy
tbox` → 0):

| deprecated 노드 | 후계 (산문 속 "superseded by") |
|---|---|
| `id:pat-agent-teams` | `id:mode-agent-teams` |
| `id:pat-sub-agents` | `id:mode-sub-agents` |
| `id:pat-hybrid` | `id:mode-hybrid` |

세 폐기 노드는 execution-mode 1급화(`verified/execution-mode-axis-finalize.md`) 때 `ho:ExecutionMode`
개체로 대체됐으나, 연결이 문장으로만 남아 **질의·랭킹이 그 관계를 쓸 수 없다**.

## 왜 문제인가
`retrieve.py`는 deprecated를 **점수 강등**(`DEPRECATED_RANK_FACTOR`)만 한다 — "이 부품 대신 무엇을
쓰라"는 **후계 정보는 산문에 묻혀** 구조화 필드로 팩에 안 실린다. 폐기 노드가 검색되면 에이전트는
후계를 함께 받지 못해, 같은 근사 동의어를 다시 만들 위험(drift)이 남는다. 이는 execution-mode
라운드가 노린 "폐기해도 후계로 안내" 효과의 미완성 부분이다.

## 선택지
- **(A) `ho:supersededBy` edge 신설 + 3개 배선 (inspection 권고).** TBox에 ObjectProperty
  `ho:supersededBy`(domain/range 열지 않거나 `ho:HarnessComponent`+`ho:SpecConcept` 상위) 추가,
  세 폐기 노드에 후계 edge를 건다. 산문의 "DEPRECATED: superseded by …" 문구는 유지(사람 가독).
  선택적으로 `retrieve.py`가 deprecated 노드를 팩에 실을 때 **후계를 함께 끌어와** 표시.
- **(B) 산문 유지, edge 신설 안 함.** 현행. deprecated는 강등만 되고 후계는 문장으로만.
- **(C) 폐기 노드 완전 제거.** 후계로 완전히 대체됐으니 삭제. → 그러나 이 repo는 "폐기해도
  검색은 되게(왜 안 쓰는지 보이게)" 두는 것이 drift 방어라, 제거는 그 근거를 지운다(권장 안 함).

## 파급효과 (예비)
- (A): TBox property 1 + abox edge 3. 개체 수 불변(edge만 추가). 세 폐기 노드는 이미 harness에
  안 걸려 orphan 아님 — edge 추가는 정합성 무영향. `retrieve.py`가 소비하도록 확장하면 그 부분만
  산출 변화(하네스 materialize 산출물은 deprecated 노드를 안 실으므로 **byte-identity 무영향**).
- federate: 신규 property는 recipe union에도 있으나 recipe가 참조 안 하면 무영향(dry-run으로 확인).

## 결정 필요
1. **A/B/C 중 무엇으로** (권고: **A**).
2. **retrieve.py가 supersededBy를 소비**해 후계를 팩에 함께 실을지(권고: 예 — B9의 실효가 거기서 남).

승인 시 `status: open` → `approved` + 답. TBox property·abox edge 저작은 developer dispatch,
retrieve.py 확장도 developer. inspection은 조사·검증·git.
