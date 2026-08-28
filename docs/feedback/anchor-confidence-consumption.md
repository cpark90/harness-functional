---
status: approved            # 사용자만 approved로 바꾼다
targets: [ho:Anchor, ho:anchorConfidence, tools/retrieve.py]
related: [docs/feedback/a-wave-annotation-content.md, docs/verify/kg-content-candidates.md, docs/feedback/verified/annotation-backbone-architecture.md]
---
# 결정 요청 — 가중 anchor를 검색이 **소비**하게 할 것인가 (지금은 선언 전용)

승인된 `a-wave-annotation-content` 결정 4 = **(b) 지금 저작**에 따라 `ho:Anchor` 개체를 처음
저작했다. 저작은 끝났고(아래 결과), **소비 여부는 그 승인에 포함돼 있지 않아** 별도로 여쭙는다.

## 무엇이 저작됐나

- 부착 가능 노드 **222** / 불가 **142**(Concept 84·DesignPattern 15·Capability 13·Harness 7 등 —
  `hasComponent o hasAnchor` 체인상 하네스가 바인딩한 component에만 달 수 있다).
- 다중 태그 노드 **65**, 그중 부착 가능한 것 **52**가 후보였다.
- 실제 저작: **anchor 7개 / 노드 3개**(`mem-longterm`, `role-tester`, `role-auditor`)뿐.
  나머지 45개 후보는 **의도적으로 저작하지 않았다** — 이 웨이브의 목적은 스키마가 실제로
  작동함을 실물로 증명하는 것이지 대량 주석이 아니고, 주·부 구분이 그 노드 정의문에서 읽히지
  않으면 저작하지 않는다는 규율을 지켰다(없는 구분을 숫자로 지어내지 않는다).
- 눈금은 두 단계뿐: **0.9 = primary**(정의문의 주제가 곧 그 region), **0.4 = secondary**(문맥·
  한정어로만 등장). 정성 구분을 소수점으로 위장하지 않기 위해 중간값을 쓰지 않았다.

## 저작 과정에서 드러난 사실 (이 결정의 전제)

**"선언 전용 = 검색 중립"은 성립하지 않았다.** 소비 코드가 0줄이어도 개체가 그래프에 존재하는
것만으로 `retrieve.py` 팩이 오염됐다:
- 40질의 중 **29개 변화**, anchor 노드 **120회 admit**. "traceability audit oversight"는
  **36 → 19 노드로 붕괴**(`c-traceability`·`cap-audit`·`role-benchmarker` 등 실부품 축출),
  "acceptance test coverage"에서는 **주석 대상 노드가 자기 anchor에 밀려 탈락**했다.
- 경로 둘: ① anchor의 prefLabel이 대상·region 라벨을 반복해 **lexical seed 상위 진입**,
  ② 추론된 harness→hasComponent→anchor 엣지로 **rollup 광역 확산**.

**조치(적용 완료)**: `retrieve.py`에서 주석 층(`ho:Anchor`)을 projection에서 제외했다. 판정
기준을 "40질의 팩이 anchor 저작 이전과 byte-identical"로 잡았고 **80/80 완전 일치**로 확인됐다 —
검색 의미를 바꾼 것이 아니라 오염만 되돌렸다는 뜻이다. anchor 개체는 그래프에 그대로 있다.

## 결정 요청 — 소비를 켤 것인가

- **(a) 켜지 않는다 — 선언 전용 유지** (권고). 근거: 병행 세션 실측상 **가중이 고칠 랭킹 결함이
  관측되지 않았다** — 부수 태그를 제거한 반사실 팩 diff가 3~5% 자리바꿈뿐이고 노드 탈락·예산
  초과가 0이었다(`docs/verify/kg-content-candidates.md`). 고칠 문제가 없는 상태에서 소비를 켜면
  전 질의의 랭킹만 흔든다.
  → **소비를 켜는 조건을 측정 가능한 기준으로 남긴다**: *"가중이 고칠 랭킹 결함이 실측되는 것."*
  그 조건이 충족되면 그때 (b)를 하면 된다. (이 저장소가 `alternativeOf`를 0쌍으로 남겨 둔 것과
  같은 근거 구조 — 쓸 것이 실재할 때만 저작한다.)
- **(b) 지금 켠다** — `retrieve.py`가 `anchorConfidence`를 랭킹 가중으로 소비하게 한다. 전 질의
  랭킹이 바뀌므로 B2 때와 같은 **40질의 전후 비교**가 게이트로 필요하고, 무엇이 개선인지 판정할
  **기준**을 함께 정해야 한다(지금은 그 기준이 될 결함이 실측되지 않았다는 것이 (a)의 논거다).
- **(c) anchor 저작 자체를 되돌린다** — 소비 계획이 없다면 개체도 두지 않는다. 승인된 저작을
  철회하는 것이라 사용자 결정이 필요하다.

## 부수 발견 (참고, 별도 결정 불요)

`AnchorShape`의 `sh:class ho:Concept` 검사는 추론 파이프라인(`prp-rng`)이 잘못된 target을
`ho:Concept`으로 타이핑하는 바람에 **발화하지 않는다**. 실제 차단은 orphan/connectivity 경로가
한다. 게이트 자체는 유효하나 **이빨의 소재가 문서와 달라** 다음 사람이 오판할 수 있어, shape
파일에 그 사실을 주석으로 명시하는 작업을 이미 진행했다.

## 사용자 피드백
(a)

## 처리 (orchestrator, 2026-08-28)

**(a) 선언 전용 유지 — 결정 확정. 추가 작업 없음.** `retrieve.py`는 주석 층을 projection에서
제외한 현 상태(80/80 byte-identical)를 유지하고, `anchorConfidence`를 랭킹 가중으로 소비하는
코드는 만들지 않는다.

**재개 조건(측정 가능)**: *"가중이 고칠 랭킹 결함이 실측되는 것."* 그 조건이 실측되면 그때
(b)를 별도 항목으로 올린다. 지금은 반사실 실측(부수 태그 제거 시 팩 diff 3~5% 자리바꿈, 노드
탈락·예산 초과 0)이 그 결함의 부재를 보이므로 유예가 취향이 아니라 근거를 가진다.

**소비를 켤 때 선행 정리 필요(부채)**: vnv note N2 — `role-benchmarker`는 정의가 `role-auditor`와
동문인데 anchor가 없고 skip 사유도 기록되지 않았다. 소비가 꺼져 있는 동안은 실해가 없지만,
켜는 순간 같은 성격의 두 노드가 다른 가중을 받게 된다. (b)를 착수한다면 이 일관성부터 맞출 것.
