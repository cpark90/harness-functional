# B2/B3 — 내용 태그 백필 + region shape 판별 facet 필터

## 태그 백필(억지 태깅 회피)의 판정 절차
1. **후보 개념의 정의문을 먼저 전부 덤프**하고, **기존 태깅 선례를 그래프에서 역조회**한다
   (`g.subjects(HO.tagged, concept)`) — 선례가 idiom을 고정한다(pat-* → c-pattern-taxonomy,
   gr-dispatch-execution → c-dispatch, role-synthesizer → c-synthesis).
2. **verbatim 근거 우선**: 개체 정의문에 개념의 핵심 구절이 문자 그대로 있으면 그것이 답
   ("dispatch-invoked only" → c-dispatch, "ONLINE STANDING role" → c-online-agent,
   "budget-capped retrieval pack" → c-bounded-context).
3. **한 clause라도 다른 노드의 대조문이 부정하면 탈락**: c-cross-validation(severity-graded)을
   vnv에 붙이려다 role-analyst 정의의 "vnv … pass/fail verdict rather than a graded finding
   list"로 기각. 개념의 전체 정의가 참이어야지 첫 절만 맞으면 안 된다.
4. **진짜 대안군은 같은 태그로 묶는다**: chan-peer↔chan-dispatch처럼 정의문이 서로를
   contrast하는 집합은 개체별 최적 태그(report-over-prompt 등)보다 **공통 anatomy 태그
   (c-communication)** 가 낫다 — 태그를 쪼개면 미래의 진짜 alternativeOf가 region 불일치로
   FAIL한다. 특화 method 의미는 이미 gr-* 태깅이 지니고 있다.
5. 일반화 노드(gr-execution-separation)는 자식 개념(c-dispatch/c-delegation)로 좁히지 말고
   **상위 method 개념(c-agent-methodology)** — 원 저작 의도(topology-independent)를 보존.

## B-잔여 웨이브(35→13) 추가 판정 근거의 종류
1. **이웃 노드의 contrast 절도 verbatim 근거다**: fp-dismissal-vs-decline 정의가
   "fp-unanswered-approval, which **escalates** WHILE the window is open"이라 말함 →
   fp-unanswered-approval=c-escalation의 결정적 근거. 자기 정의만 보지 말 것.
2. **ABox 캐리어 섹션 주석이 idiom을 확정한다**: guardrails.ttl 배선 주석이
   stopping-condition/auto-reply-budget/bounded-iteration을 "the complexity-governance
   family"라 명명 → c-complexity-governance 배정의 저작 의도 증거.
3. **닫힌 대안군(6 AutonomyTier)은 공통 태그 1개**: 정의들이 서로 contrast하는 닫힌
   집합이면 verbatim 없는 멤버(tier-per-action)도 가족 규칙으로 같은 태그
   (c-operating-envelope — 각 정의의 "declared envelope"/"rangeless"가 앵커).
4. **정의문 없는 노드(tool-shell 등 skeleton)=무조건 SKIP** — 텍스트 없으면 근거 없음.
5. **자기 원리가 B1에서 quality로 분류된 guardrail(gr-cite/grounding/traceability/
   structural-coverage)은 c-agent-methodology 우산 태깅 금지** — method 신설이 필요한
   진짜 GAP이며 fail-closed로 남기는 게 정직(35 중 13 SKIP이 승인문서 기대와 일치).
6. approval-gate 가족(gr-human-checkpoint 선례)=c-escalation: dual-approval/plan-evidence/
   rejection-feedback/nodestruct/wf-approval-gated까지 한 region으로 — 미래 alternativeOf
   후보들이 실제 같은 영역에 모임.

## 랭킹 회귀 측정
- 편집 **전에** 40질의 pack+sha를 scratchpad JSON으로 저장(pack 자체를 저장해야 노드/점수
  단위 귀속이 됨). CLI 40회는 타임아웃(그래프 재로드×40) — `sys.path`에 tools 넣고
  `retrieve.project(g, q, DEFAULT_BUDGET)`를 **한 번 로드한 그래프로 in-process 호출**. 편집 후 hash 다르면 dropped/added/rescored/top5로 분해해 "의도한 방향"을
  개체 단위로 서술. **hash만 다르고 pack 내용 동일 = 새 tagged 엣지가 edges 섹션에 렌더된 것**
  (nodes/relevance 동일 확인으로 판별).
- 태그 추가는 datatype과 달리 **엣지라서 랭킹을 움직인다** — 태그된 개체가 개념 질의에 새로
  admit되고(intended), 밀려나는 것은 tail filler(mc-opus 등)인지 확인.

## region shape(B3) 패턴
- 판별은 FILTER NOT EXISTS 블록에 두 줄: `?region ho:conceptFacet ?facet .` +
  `FILTER(?facet IN ("anatomy", "method"))`. targetSubjectsOf 불변 → 선언된 쌍에만 발화
  (연합 안전: facet 없는 recipe-local 개념은 위반이 아니라 region 앵커 자격만 없음).
- negative control 필수 5종: 대조군 conforms / 허위쌍 FAIL / 진짜쌍 conform / region-less
  FAIL / **vacuous-pass 배제 = `git show HEAD:` 로 옛 shapes를 떠서 같은 주입에 conforms였음을
  재현**. 위반은 shape 메시지 키워드("SAME region")로 필터해 집계 — 합성 주입 노드는
  prefLabel/orphan 등 **무관한 shape**를 함께 발화시키므로 섞어 세면 오판.
- Turtle 장문 리터럴 안 SPARQL의 문자열 값은 `\"` 이스케이프로 안전하게 통과(pyshacl 정상).
