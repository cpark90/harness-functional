---
status: open            # inspection이 처리 후 answered로 바꾼다
kind: land-request
consumer: inspection
source: docs/feedback/verified/sim-hil-coding-harvest.md   # 승인 항목 (사용자 결정 "(B) → (A)")
verdict: docs/verify/sim-hil-br-recipes-verify.md          # PASS-with-notes, 차단 0, "land 가능: 예"
---
# land 요청 — sim-hil B 웨이브 (중앙 그래프 + staging recipe 3종)

orchestrator가 승인 항목 적용을 마쳤다. 커밋·published 반영은 규약상 inspection 소관이라
요청으로 남긴다. **적용은 전부 끝났고, 남은 것은 형상관리뿐이다.**

## 대상

**A. 중앙 그래프 (`ontology/**`, `tools/**`, `ONTOLOGYSTYLE.md`)** — 이 세션의 웨이브들:
`245 → 364 individuals`. 웨이브 경계는 `docs/feedback/verified/`의 기록란 참조.

1. online standing agent 축 + mode 적합성 + 사용자 역조사(elicitation) + same-role concurrency
2. 언어·용어 규약(`gr-lang` 예외 확장 + `gr-standard-terms`) — `CLAUDE.md` 언어 절 동반
3. lesson(시행착오 학습) 축
4. AV W1: OperatingEnvelope/AutonomyTier + shapes 5 + registry 3중 (`av-odd-scenario-transfer`)
5. sim-hil B-T / B-K1 / B-K2 (`sim-hil-coding-harvest`)

**B. staging recipe (`staging/harness-recipes/`)** — B-R 산출:
`recipes/{hil-approval,eval-user-sim,coding-swe}/` + `catalog-v001.xml` 재생성분.
레인 규약대로 **staging→published clone push + catalog/CI 매트릭스 + federate 게이트**가 필요하다.

## 판정 근거 (커밋 전 확인용)

- 판정 5건 전부 **차단 결함 0**: `docs/verify/{av-w1-envelope-verify, sim-hil-b-wave-verify,
  sim-hil-bk2-verify, sim-hil-br-recipes-verify, lesson-axis-verify}.md`.
- B-R 판정의 결론: **"inspection이 land해도 되는 상태인가: 예"** (중앙 트리플 0이 기계 증명).
- orchestrator 최종 확인: `validate.py` PASS(364).

## 주의 (동시 세션)

병행 orchestrator 세션(harness-ontology-2f)이 같은 작업트리에서 **B1 facet 재부모화**
(`ontology/abox/core/vocab/concepts.ttl` + `ho:conceptFacet`)와 `tools/plane-editor/**` lane을
진행 중이다. 커밋 시 **웨이브 단위로 소유자를 분리**할 것 — 위 목록은 이 세션 산출물이고,
concepts.ttl의 facet 재부모화분과 plane-editor 변경분은 그 세션 소유다. 커밋 전 어느 쪽이
진행 중인지 확인하고, 진행 중인 편집을 함께 쓸어담지 말 것(verify-then-proceed).

## 미해결로 남긴 것 (커밋 대상 아님, 참고)

- `docs/feedback/envelope-render-gap.md` (status: open) — 선언된 envelope/tier/fidelity가 산출
  문서에 렌더되지 않음. 사용자 결정 대기.
- A 확장(sim-hil 1티어 잔여·recipe 3종·2티어, AV W2~W5)은 미착수.
