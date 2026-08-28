---
status: open            # 사용자만 approved로 바꾼다
targets: [id:pat-knowledge-plane-separation, ho:Anchor, ho:alternativeOf, id:scheme, tools/plane-editor, tools/retrieve.py]
---
# 결정 요청 — ④ lane 이후 진행 방향 4건 (orchestrator)

승인 항목 `annotation-backbone-architecture`의 ④ webui/tiptap lane wave(Phase 0 형식화 +
5번째 평면 온톨로지 반영 + Phase 1 앵커 프로토타입)가 끝났고, vnv 종합 판정
`docs/verify/plane-editor-wave-synthesis.md`(pass-with-notes)와 inspection의 미반영 항목
실측이 **사용자 결정이 필요한 갈림길 4개**를 남겼다. 각 항목은 독립이라 원하는 조합으로
답해도 된다 (예: "1-(a), 2-(b), 3-(c), 4-보류").

진행 중(결정 불요): 차단 조건 **C1**(앵커 오해소 근절 — S9 블록 삭제·S10 제자리 교체)은
이미 developer dispatch로 수정 중이고, **A-wave 후보 탐색**(대안쌍·가중 anchor·계층화 案
실측)은 vnv dispatch로 측정 중이다. 아래 결정은 그 결과와 무관하게 방향을 정하는 것.

---

## 1. Phase 2(산문 평면 2종 + 링크 저장소) 착수 형태

Phase 1 실측: 저장 selector 내구성 stale 93.3%(28/30, 미달 2건은 1자 경계 드리프트),
round-trip 6/6, quote 복구 6/6, 고정 시나리오 오해소 0/138. 단 스위트 밖 두 편집에서
오해소 재현(C1으로 수정 중).

- **(a) 병행 착수 (권고)** — 링크 저장소·설계결정 평면 저작은 즉시 시작하고, **앵커를 링크
  종단점으로 바인딩하는 작업만** C1 통과 후로 미룬다. G2 기준 레인은 `stale`로 확정하고
  목표를 "≥93.3% 유지 + 오해소 0"으로 명문화.
- **(b) 앵커 강화 선행** — C1 통과를 확인한 뒤 Phase 2 전체 착수 (가장 안전, 가장 느림).
- **(c) 전면 착수** — pipeline 레인 100%를 게이트 값으로 확정하고 바인딩까지 지금 시작
  (틀린 링크가 저장될 위험을 감수).

## 2. 편집기↔그래프 IRI 앵커·링크 평면의 저장 위치

현행 스키마로는 임의 individual을 겨냥한 앵커를 `ho:Anchor`로 표현할 수 없다
(`anchorTarget` range = `ho:Concept`), harness 노드 자신의 Anchor도 rollup chain상 불가.

- **(a) `ontology/` 밖 링크 스토어 1개** — 도구가 `ontology/`만 스캔하므로 그래프 재도입
  금지 규칙을 자동 준수. 대신 링크 무결성 검사기를 새로 만들어야 한다.
- **(b) 스키마 확장** — `anchorTarget` range 확대 + harness-level anchor 술어. SHACL·
  reachability가 무결성을 강제해 주는 대신, TBox 확장과 재도입 금지 집행 규칙이 필요.
- **(c) 편집기 로컬 한정** — 가장 싸지만 그래프↔편집기 접점이 열리지 않는다(요구 미충족).

## 3. `verified/` lane 어휘의 정본 (GAP A3)

실측: 22개 검증 보고서 중 14개가 README에 정의되지 않은 값을 쓴다 — `verdict: done` 13건,
`apply-plan-ready` 1건(정의된 값은 apply / apply-with-changes / needs-decision), 그리고
README가 정의하지 않는 `status:` 키가 17건(reported 16 / finalized 1).

- **(a) 실사용을 규약으로 승격** — `status: reported|finalized` 정의 추가 + verdict에 `done`·
  `apply-plan-ready` 추가 (문서 1개 수정으로 끝, 현실 반영).
- **(b) 실사용을 규약 3값에 맞춰 재라벨** — 14개 보고서 수정 + 사후 상태는 별도 키로 분리
  (규약은 깨끗해지나 편집량 큼).
- **(c) 유예** — Phase 2가 이 lane과의 접점을 열 때 함께 정한다.

## 4. backbone 계층화 (layered skeleton) — inspection 실측이 드러낸 미충족 요구

사용자 원 요청의 "내용 구분에 따른 layered skeleton"이 판정 단계에서 "이미 있음"(=`id:scheme`
backbone)으로 처리됐으나, 실측하면 **깊이 1의 평면 구조**(top concept 11 + broader 31,
최대 깊이 1)라 layered라고 부를 수 없다. 개념 재배치라 파급이 크다.

- **(a) B-wave 편성** — 내용 구분 축을 정해 `skos:broader` 2~3층으로 재구성. 진행 중인
  A-wave 실측이 案과 파급 추정을 함께 내므로, 그 결과를 보고 案을 고르는 방식.
- **(b) 부분 계층화** — 파급이 작은 영역(예: 한 상위 개념 아래 밀집한 군)만 먼저 2층으로.
- **(c) 현행 유지** — 평면 backbone을 유지하고 계층화 요구는 철회/보류.

---

## 사용자 피드백
1. (a)
2. (a)
3. (a)
4. (a)
- annotation이 42line 지식단위 block 이고 anchor가 지식단위 block들을 시스템 및 지식에 따라 구조적으로 정리 및 연결하는 skeleton으로 연결된게 맞는지 확인

## 확인 답변 (inspection, 2026-08-28) — 구현이 원 구상과 일치하는가

**핵심은 맞고, 유보 2건이 있다** (둘 다 위 결정 2·4가 정확히 그 잔여를 다룬다):

- **annotation = 42-line 지식단위 block ✓**: block은 그래프 노드의 텍스트
  (`ho:promptText`+`skos:definition`)로 구현됐고, 크기는 **cap 260 token(chars/4) ≈ 42-line
  등가**를 `lint_uniformity.py`가 커밋 게이트로 강제한다(권장 대역 130–260). 같은 지식을
  다르게 설명하는 block들은 `ho:alternativeOf`(대칭)로 상호 연결되고, 투영(`retrieve.py`)은
  **anchor 영역당 1개만** 실어 중복이 노이즈가 되지 않는다 — 원 구상의 "중복 설명 허용 +
  구조적 구분"이 그대로.
- **anchor → skeleton 연결 ✓**: 모든 block은 `ho:tagged`(crisp anchor)로 **Concept
  backbone(`id:scheme`의 SKOS 스킴 = 원 구상의 skeleton)** 에 연결되며, 이 연결은 선택이
  아니라 **anti-orphan 검증이 강제**한다(연결 없으면 validate FAIL). 확률적 연결은
  `ho:Anchor`(`anchorTarget`+`anchorConfidence` 0..1)가 담당 — "확실한 구조적 위치 + 확률
  가중"의 이중 구조가 원 구상과 일치.
- **유보 1 — skeleton의 계층**: 현행 backbone은 실측 깊이 1(평면)이라 "시스템 및 지식에 따라
  구조적으로 **정리**"의 계층(layered) 부분은 아직 얕다 → **결정 4-(a)** (B-wave 계층화)가
  이 잔여를 채운다.
- **유보 2 — block이 그래프 밖 텍스트일 때**: 편집기 평면(설계 문서 산문)의 block과 그래프
  개체를 잇는 anchor는 **결정 2-(a)** 에 따라 그래프 밖 링크 스토어가 담당한다 — 그래프 안
  skeleton(개념 backbone)과 편집기 링크 평면은 **별개 층**이고, 후자가 전자의 IRI를 종단점으로
  참조하는 구조다.

> 처리 노트: 결정 1·2·3·4의 적용 착수 허가 신호는 이 항목의 `status: open → approved` 태깅이다
> (README 규약 — 답변 기재만으로는 orchestrator가 착수하지 않는다).
