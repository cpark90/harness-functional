---
status: answered    # inspection 처리 완료 (2026-08-28) — orchestrator 소비 후 closed
kind: action-request
consumer: inspection
source: docs/feedback/plane-editor-and-kg-content-decisions.md   # 결정 3-(a), status: approved
---
# 요청 — `verified/` lane 어휘를 실사용에 맞춰 승격 (결정 3-(a))

## 배경

사용자가 `plane-editor-and-kg-content-decisions.md`(approved)에서 **결정 3-(a) "실사용을
규약으로 승격"** 을 택했다. 근거 실측(Phase 0 형식화 GAP A3, `docs/verify/plane-editor-phase0-verify.md`
독립 재확인):

- 검증 보고서 22건 중 **14건**이 `docs/feedback/verified/README.md`가 정의하지 않는 값을 쓴다.
- `verdict: done` **13건**(최빈값), `apply-plan-ready` **1건** — README 정의값은
  `apply` / `apply-with-changes` / `needs-decision` 3종뿐.
- `status:` 키 자체가 README에 정의돼 있지 않은데 실제로는 **17건**이 쓴다(`reported` 16 /
  `finalized` 1).

## 요청 내용

`docs/feedback/verified/README.md`는 **inspection 소유 경로**(`docs/feedback/**`)이므로
orchestrator가 직접 고치지 않는다. inspection 사이클에서 다음을 처리해 달라:

1. `verdict`에 **`done`**·**`apply-plan-ready`** 를 정식 값으로 추가하고 각각의 의미를 1줄로
   정의(예: `done` = 적용까지 끝나 더 이상 orchestrator 조치가 없는 보고, `apply-plan-ready`
   = 계획은 확정됐고 사용자 선택 대기).
2. `status:` 키를 정식 필드로 정의하고 **`reported`·`finalized`** 의 의미·전이 규칙을 명시
   (verdict와의 역할 분담 — verdict는 판정, status는 그 보고서의 사후 상태).
3. 승격 후 기존 22건 중 규약 밖 값이 남지 않는지 전수 확인(재라벨이 필요한 잔여가 있으면 그
   목록만 남기고, 실제 재라벨 여부는 inspection 판단).

## 왜 지금인가 (선행 조건)

이 어휘는 편집기 lane의 **Phase 2 접점 P1**(주석 평면 ↔ `docs/feedback` 항목의 status 마커를
해소 상태로 읽는 어댑터)의 정의역이다. 정본이 흔들리면 어댑터가 무엇을 읽어야 하는지 정해지지
않는다. Phase 2는 결정 1-(a)로 **병행 착수**가 허가된 상태라 곧 이 접점에 닿는다.

## 완료 시

`status: answered`로 바꾸고 무엇을 어떻게 정의했는지 1~2줄 남겨 주면, orchestrator가 소비 후
`closed`로 태깅하고 Phase 2 브리프의 P1 정의역을 그 값으로 고정한다.

## 답 (inspection, 2026-08-28)

`verified/README.md`에 승격 완료: **verdict 5값**(`apply`/`apply-with-changes`/
`needs-decision`/`apply-plan-ready`=계획 확정·사용자 선택 대기/`done`=후속 조치 없는 완료
보고) + **status 필드 정식화**(`reported`=보고 완료·소비 대기, `finalized`=종결·기록 보존,
생략 시 reported; verdict=판정·status=사후 상태 역할 분담 명시). **전수 확인: 22건 중 규약 밖
값 잔여 0** — 재라벨 불요. P1 정의역은 이 5+2 값으로 고정하면 된다.
