---
status: approved            # 사용자만 approved로 바꾼다
targets: [tbox:ho:, id:h-coding, id:h-multiagent, ontology/abox/core, recipes, docs/verify]
related: [docs/feedback/inquiries/av-odd-scenario-transfer.md, docs/feedback/verified/sim-hil-coding-harvest.md]
---
# 자율주행 ODD·시나리오 형식/방법론의 이식 (온톨로지·KG·recipe)

사용자 요청 (2026-08-28): AV의 ontology·ODD·scenario 형식과 방법론을 이 프로젝트의 하네스
온톨로지·knowledge graph·recipe에 적용하는 방법을 구상. **구상 원본**:
`inquiries/av-odd-scenario-transfer.md` (6축 조사 + 이식 설계).

## 제안 요지

AV 표준군은 "열린 세계에서 도는 자율 시스템을 유한한 선언과 유한한 시나리오로 출시하는" 문제를
형식화해 두었고, 그 형식이 우리 빈자리와 정확히 맞물린다. 이식하면 얻는 것:

1. **하네스의 선언된 운용 범위(operating envelope)** — 공유 속성 taxonomy + 속성별 include/
   exclude + 조건부 규칙 + restrictive 기본값 + **측정가능성 규칙**(관측 못 하는 속성으로 범위를
   선언 금지). 지금은 이 선언 자체가 없다.
2. **범위 이탈이 1급 실패 조건** — 인계 요청 → 시한 → safe-halt 사다리(안정 정지 상태 정의 포함).
3. **자율성 등급 = (task-share, fallback owner, envelope binding) 삼중항** — 능력 서열이 아니라
   책임 배분이며 선언되고 측정되지 않는다(하네스에 붙고 모델에 붙지 않는다).
4. **TestScenario 형식** — functional/logical/concrete 추상화, 단계 스크립트+트리거, trace 수용
   oracle(능동/수동 이중 해석 = shadow 근거), 변량 노드 분리, 등급형 판정.
5. **검증 레인 승격** — GSN 구조의 verify 보고서, 의무 4등급 감사 항목, Type I/II 이중 커버리지,
   **SPI(검증 유효성 만료 조건)**.
6. **미지 실패 방법론** — SOTIF 4영역 회계 + triggering condition→functional insufficiency
   (명세 부족 vs 수행 부족) 인과 어휘 + 운영 발견을 중립 시나리오로 되먹이는 discovery loop.

승인된 harvest 항목(B→A)과 **중복이 아니라 상위 프레임**이다: harvest가 부품 목록이면 이식은
형식·절차이며, 겹치는 확장(environmentFidelity·oracle·shadow·autonomy)은 신설이 아니라 **AV
형식으로 구체화**한다(구상 §7 통합표).

## 결정 요청 (선택지)

- **(A) 전 단계 이식**: W1 형식 뼈대(envelope+autonomyTier) → W2 시나리오 형식 → W3 검증 레인 →
  W4 recipe → W5(생성 파이프라인)는 후속 판단. 규모 큼, 여러 wave.
- **(B) W1 선행 실증** (inspection 권고): 운용 범위 + 자율성 삼중항 + 범위이탈 FailurePolicy만
  먼저 넣고 `h-coding`·`h-multiagent`에 실제 선언을 부여해 게이트가 무는지 실측한 뒤 재판단.
  가장 큰 빈자리이면서 나머지 전부의 전제.
- **(C) W3 우선**: 검증 레인(GSN·의무등급·Type I/II·SPI)부터 — 스키마 파급 없이 즉시 효과.
- **(D) 직접 선별**: 구상 문서 §2~§5에서 항목 지정.

## 사용자 피드백
(B)를 우선으로 진행하고 동시에 (A)는 사례조사를 하면서 더 구체화해서 진행.
