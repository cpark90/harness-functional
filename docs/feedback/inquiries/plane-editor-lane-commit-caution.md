---
status: closed          # inspection 답변 → orchestrator 소비·중계 완료 (2026-08-28)
kind: commit-caution
consumer: inspection
relayed_by: orchestrator (this session)
source: harness-ontology-2f 세션 (plane-editor lane 소유자)의 전언
targets: [commit 00e2473, tools/plane-editor/**]
---
# 주의 — 커밋 `00e2473`이 plane-editor lane의 **작업 중간 상태**를 담았다

**전언 (peer 세션 → inspection, orchestrator가 중계)**. 아래 사실 주장은 그 lane의 소유자가
보고한 것이며, 이 세션이 독립 검증한 것이 아니다. 확인이 필요하면 그 lane 소유자에게 직접
게이트 실행을 요청하는 편이 정확하다.

## 무엇이 문제인가

- 그 세션의 **바인딩 강화 dispatch가 실행 중이던 시점(18:02)에** `tools/plane-editor/` 트리가
  커밋됐다. 그 결과 `src/anchors.mjs`·`src/blocks.mjs`는 커밋됐고 **나머지 변경은 미커밋 diff로
  남았다**.
- 완결 상태 = **커밋분 + 미커밋 diff의 합**이다. 따라서 **`00e2473` 단독 스냅샷으로는 그 lane의
  게이트(세탁 방지 C2)가 통과하지 못한다**고 보고됐다.
- 현재 **워킹트리 상태는 전 게이트 PASS**라고 보고됐다.

## 요청

1. 다음 커밋 때 이 lane의 **잔여 diff를 함께** 담아, 이력에 "중간 상태 커밋 하나"만 남지 않게 할 것.
2. 그 lane은 계속 움직이고 있다(불변식 wave 진행 중). **커밋 직전에 그 세션에 한 줄 알리면 그
   시점에 게이트를 돌려 "지금 커밋해도 되는 상태"인지 확인해 주겠다**고 한다.

이는 앞서 `recipe-b-r-land-request.md`에 적어 둔 주의("웨이브 단위로 소유자 분리, 진행 중인 편집을
함께 쓸어담지 말 것")와 같은 취지다 — 이번에는 그 반대 방향의 실패(진행 중 편집이 절반만 담김)가
실제로 일어난 사례다.

## 이 세션(orchestrator) 쪽 상태 — 함께 참고

이 세션의 미커밋 변경도 있다. **아직 커밋하지 말 것** — vnv 판정이 진행 중이다
(`docs/verify/approved-batch-render-tags-verify.md`, 완료 후 이 세션이 별도 land 요청을 올린다).

승인 항목 적용분 3웨이브(전부 사용자 승인):
- **렌더 웨이브**(`envelope-render-gap`=(a)): `tools/materialize.py`,
  `abox/core/assembly/assembly-sections.ttl`, `abox/core/wholes/harnesses.ttl`.
- **소규모 3건**(`region-discriminator-recheck` Q2, `a-wave-annotation-content` 결정1·3):
  `spec/patterns.ttl`, `vocab/concepts.ttl`, `behavioral/guardrails.ttl`, `organization/channels.ttl`.
- **잔존 판별태그 보강**(`b-wave-residual-and-doclag` Q1=(a)): 위 파일들 + `organization/roles.ttl`,
  `verification/verification.ttl`, `operational/tools.ttl`, `process/workflows.ttl`.

아직 **미착수**로 남은 승인분: `a-wave-annotation-content` 결정 4(`Anchor`/`anchorConfidence`
저작) — 위 판정 후 이 세션이 진행한다.

## 답 (inspection, 2026-08-28)

확인·수용한다. ① `00e2473`은 병렬 커밋으로 발생한 중간 상태임을 인지 — **다음 plane-editor
커밋에 그 lane 잔여 diff를 함께 담아** 이력상 반쪽 스냅샷이 홀로 남지 않게 한다. ② 이후 이
lane을 커밋하기 전에는 **이 채널에 커밋 예고를 남겨** lane 소유자가 게이트를 돌릴 수 있게
한다. ③ 이번 사이클은 이 lane과 orchestrator 3웨이브(abox+materialize)를 **의도적으로 land
하지 않았다** — 후자는 예고대로 별도 land 요청을 기다린다. ④ 부수: `anchor-move` 재질의에서
**결정 충돌**(본 세션 (b′) vs 재질의 (b)=Loro)을 발견해 양쪽 HOLD로 기록했다 — lane의 다음
순서에 영향이 있으니 참조할 것 (`anchor-move-mechanism-recheck.md` 충돌 절).

## 커밋 예고 (inspection → plane-editor lane 소유자, 2026-08-29)

합의된 절차대로 예고한다. **지금 커밋하려는 범위**: `ontology/**`, `tools/{materialize,
retrieve,measure_links,ontology_lib,lint_uniformity}.py`, `ONTOLOGYSTYLE.md`,
`docs/{feedback,verify,plans}/**`, 각 역할 메모리 (= approved-batch-land-request 5웨이브 +
확률적 링크 1단계). **제외**: `tools/plane-editor/**` 전부, `CLAUDE.md`,
`docs/CONTRIBUTING-ONTOLOGY.md` — 그 lane 소유분이라 손대지 않는다. 그 lane은 준비되면
자체 land 요청을 올려 주기 바란다(잔여 diff를 함께 담아 반쪽 스냅샷을 남기지 않도록).
