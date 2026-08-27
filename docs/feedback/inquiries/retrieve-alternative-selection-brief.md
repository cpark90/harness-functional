---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/verified/annotation-backbone-architecture.md   # 승인 계획 단계 ③
related: [docs/feedback/inquiries/tbox-annotation-predicates-brief.md, docs/feedback/inquiries/linter-annotation-cap-brief.md]
---
# retrieve 영역당 대안 1선별 dispatch 브리프 (초안) — 승인 계획 ③

> 작성: inspection (사용자 지시, 2026-08-27). **정식 채택·dispatch는 orchestrator 소관.**
> 도구 목적 ②(노이즈 차단 입력)의 직접 구현: 저장 층은 중복 서술(대안 설명)을 허용하되,
> **투영(pack)에는 anchor 영역당 1설명만** 실어 예산 이중 소비와 컨텍스트 노이즈를 막는다.

## 1. 목표 (한 문장)
`ho:alternativeOf`로 묶인 대안 클러스터에서 **pack당 최대 1개만 admit**하도록
`tools/retrieve.py`의 admission에 선별 규칙을 추가한다 — determinism 게이트를 깨지 않고.

## 2. 담당·경로 (파일 경계)
- **developer dispatch (opus)**: `tools/retrieve.py` **단일 파일** (module docstring의 규칙
  1줄 포함). 그래프·다른 도구·`check_determinism.py` 시나리오 수정 금지.
- **vnv dispatch**: 재현 + 주입 시나리오 + byte-identity 회귀.
- **git: inspection** (게이트 통과 후).

## 3. 선별 규칙 (결정 사항 — 브리프에서 고정)
1. **클러스터 정의**: `ho:alternativeOf` edge의 **무향 연결 성분**(undirected connected
   component). 코드에서 edge를 무향으로 취급한다 — retrieve는 raw 그래프를 로드하므로
   OWL RL symmetric materialization(validate 전용)을 **가정하지 않는다** (Q1 감사의
   reason=True 함정과 동일 계열 — 173 vs 205 사례).
2. **선별 지점**: `traverse()`(retrieve.py:181)의 admission 시 — 노드를 pack에 넣기 직전,
   같은 클러스터의 다른 노드가 **이미 admit됐으면 skip**. skip은 `token_cost` 차감 **전**
   (탈락 대안이 예산을 소비하면 안 된다). seed·traversal 경유 모두 동일 적용.
3. **승자 결정 = 새 정렬 키 없음**: 기존 결정론적 admission 순서(`_rank_key`:141 —
   score→maturity→IRI 전순서)가 먼저 도달시킨 노드가 그 클러스터의 대표. 새 비교 로직을
   추가하지 않는다 — determinism은 기존 키가 이미 보증.
4. **`ho:overlapsWith`는 배제 트리거 아님**: 부분 겹침은 둘 다 admit 가능(예산 내) —
   전체 대안(alternativeOf)만 1선별 대상. 코드 주석에 이 구분 명시.
5. **탈락 대안은 v1에서 무표기**: pack에 "대안 존재" 힌트를 싣지 않는다. (표기 옵션은
   후속 결정 — 싣는다면 **라벨만**: B18이 pack의 `id:` 토큰 유출을 0으로 만든 이력이 있어
   IRI 표기는 회귀다.)

## 4. 수용 게이트 (go/no-go)
- G1. **byte-identity 회귀**: 현 그래프는 `alternativeOf` 사용 0 (2026-08-27 실측) →
  변경 전(HEAD worktree) vs 후의 **모든 프로브 질의 pack이 byte-identical** — materialize
  회귀 레시피와 동일한 worktree diff 방식. 로직이 0-edge에서 완전 무영향임을 증명.
- G2. **주입 시나리오** (vnv, 스크래치 그래프): 같은 concept을 tag하고 질의에 둘 다
  걸리는 대안 2~3개 클러스터 주입 → pack에 **정확히 1개**만 등장 + 탈락분 예산 미차감
  (MANIFEST/합계로 확인). **대조군**: 같은 그래프에서 alternativeOf edge만 제거하면 둘 다
  등장(규칙이 실제로 작동함을 증명 — vacuous pass 방지).
- G3. `check_determinism.py` **PASS 무변경** (기존 시나리오 그대로 4-run byte-identical).
- G4. `validate.py`·`lint_uniformity.py` PASS 유지 (read-only 변경이라 자동 성립 — 회귀 확인).
- G5. 클러스터 계산이 결정론적임을 코드로 보증 (set 순회 의존 금지 — 정렬된 IRI 순회).

## 5. 의존성 (dispatch 순서)
**① TBox 브리프 land 후 dispatch 권장** — 술어가 정의돼야 의미가 선다. 단 코드는 0-edge에
무해하므로(G1이 그 증명) 병행도 기술적으로 안전. ②(린터 cap)와는 완전 독립.

## 6. 비범위
`ho:hasAnchor`/`anchorConfidence`를 선별 키로 소비(수요 확인 후 별도 — 현 v1은 기존
score/maturity 키만)·대안 표기 옵션(§3-5 후속 결정)·materialize 변경(대안은 harness 구성
edge가 아니라 pack 선별 문제)·webui 노출(lane ④).
