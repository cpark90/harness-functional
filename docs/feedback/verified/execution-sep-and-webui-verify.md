---
status: reported
verdict: done
covers: [docs/feedback/execution-separation-invariant.md, docs/feedback/webui-save-drops-triples.md]
applied_by: [fce72af, 19a8cc6]
---
# 완료 검증 — 실행분리 불변식 + webui 데이터손실 (독립 재실측)

자율 루프가 두 최고-이해관계 항목을 적용(`fce72af`·`19a8cc6`)하고 채널을 refresh했으나
**verified 서명이 없었다**. inspection이 커밋 메시지를 신뢰하지 않고 게이트를 직접 돌린 결과를 남긴다.
현재 중앙 `validate.py` **PASS @237**.

## A. 실행분리 불변식 (`fce72af` 단일 커밋 격리 측정)
격리 방법: `fce72af^` vs `fce72af` worktree 각각 materialize 후 diff(중간 루프 작업 배제).
- **4 multi-agent 하네스 각 operating-rules +1줄** — 문안 "Separated plan and execution":
  h-multiagent · h-workspace-synthesis · h-harness-factory 각 `+1/-0`.
- **h-peer-mesh `+3/-1`**: guardrail 1줄 + **Coordinator agent 역할** + **Peer agent-team mode 정의 갱신**.
  peer-mesh 긴장(중앙 dispatcher 없음 vs 조율역할)은 **정의에서 해소** — coordinator는 "a central-dispatch
  lead, **not** a peer that runs alongside the team"와 구분되고, mode 정의가 "Coordinating as a group
  does NOT merge planning and doing"를 명시.
- **단일 에이전트 3(h-coding/h-research/h-support)**: CLAUDE.md·MANIFEST **byte-identical**,
  `harness.lock.json`의 `individualCount` **223→225**만 이동(union 전체 카운터 = 신규 2개체, 규율상 제외).
- **role-coordinator 최소권한**: `ho:roleTool` **0개**(실행도구 없음 = "조율은 실행 안 함"의 집행) +
  `roleGuardrail gr-execution-separation, gr-least-privilege, gr-verify-proceed`, `userFacing false`.
- **8 recipe federate 전부 PASS**(중앙 @237). 신규 guardrail/role은 어느 recipe에도 자동 결합 안 됨.
⇒ 계획(`verified/execution-separation-invariant.md`)과 **정확히 일치**. 회귀 0.

## B. webui 데이터손실 B13/B14/B15 (`19a8cc6`)
수정 방식 확인: `render_block`이 **치환이 아니라 merge**("absence == preserve — the loss-proof
default") + `api_node`가 리터럴을 화이트리스트 없이 **전부** 반환(read side).
- **실 왕복 무손실 테스트**(read-only, `plan_upsert`는 계산만·`git status` 무변화): GET(`server.api_node`)
  → 프런트 평탄화 → SAVE 계획(`plan_upsert`) → 산출 TTL 재파싱 후 트리플 비교. 손실 취약 노드 포함 6개:

  | node | 저장전→후 트리플 | 손실 |
  |---|---|---|
  | chan-dispatch (channelParticipant·involvesUser·channelMedium) | 13→13 | **0** |
  | role-inspection | 12→12 | **0** |
  | h-multiagent (허브 75트리플) | 75→75 | **0** |
  | role-coordinator | 10→10 | **0** |
  | gr-execution-separation | 6→6 | **0** |
  | oa-inspection-external | 13→13 | **0** |

  **총 손실 0** — B13(조용한 삭제) 해소 확인. ⇒ **데이터손실 경고 해제**: web UI로 기존 노드를
  저장해도 화이트리스트 밖 술어가 사라지지 않는다.

## 판정
**done** — 두 항목 모두 적용·독립검증 완료. inbox 이미 비었고(루프 refresh 완료), 이 보고서가 두
변경에 대한 inspection 서명이다. 후속 없음.
