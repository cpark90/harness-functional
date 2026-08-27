---
status: approved            # 사용자만 approved로 바꾼다
targets: [tbox:ho:, ontology/abox/core, recipes]
related: [docs/feedback/inquiries/sim-hil-coding-harness-research.md]
---
# 시뮬레이션·HIL·코딩 하네스 조사분의 온톨로지/KG/recipe 반영

사용자 요청 (2026-08-28, inspection 세션): 시뮬레이션·HIL agent 하네스와 하네스/에이전트
코딩 자료를 조사해 **온톨로지(TBox)·knowledge graph(ABox)·recipe에 추가할 컨텐츠**를 확보.
조사 원본: `inquiries/sim-hil-coding-harness-research.md` (12-에이전트, 1차 소스+LICENSE 검증).

## 제안 내용

조사에서 식별된 부품을 3층으로 나눠 반영한다 (인벤토리 전체: verified 보고):

1. **TBox 확장** (~9 술어 + 개념 스킴 3): approvalScope·attachesAt·environmentFidelity·
   retrievalPolicy·stageKind·oracleKind 등 — 어휘 범주가 없어 ABox가 막히는 GAP만 선행.
2. **KG(중앙 core ABox) 중립 부품** 1티어 ~50개: HIL 부품군(guardrail 12·FailurePolicy 7·
   step 8·channel 2), 시뮬레이션 부품군(role 5·mode 1·개념 사다리), 코딩/보안 부품군
   (pattern 신설 8 + 기존 7 enrich·tool 계약 4). 2티어(보류) 별도 목록.
3. **recipe** 6종: 구체 하네스 조리법(sim-society·eval-user-sim·hil-approval·coding-swe·
   coding-pair·sdd-chain) — 중앙은 중립 부품만, 구체 시스템 형상은 recipe로(raw 카탈로그 금지
   원칙 준수; staging→published lane, catalog+CI 동반 갱신).

## 결정 요청 (선택지)

- **(A) 전체 반영**: TBox 선행 → 1티어 ABox(wave 3분할: HIL/시뮬/코딩·보안) → recipe 6종
  → 2티어는 후속 판단. 규모: 개체 ~50+, 여러 wave.
- **(B) 축소 우선 반영** (inspection 권고): TBox 중 즉시 막힌 것만(approvalScope·attachesAt·
  retrievalPolicy·environmentFidelity) + 1티어 중 수렴도 최상 부품(~25개: HIL 골격+GM/시뮬
  코어+ACI/검증 사다리) + recipe 3종(hil-approval·eval-user-sim·coding-swe). 나머지는 결과
  검증 후 2차.
- **(C) 직접 선별**: verified 보고 인벤토리에서 항목 지정.

## 사용자 피드백
(B) -> (A)
