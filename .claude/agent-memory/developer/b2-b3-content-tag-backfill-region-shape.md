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

## 랭킹 회귀 측정
- 편집 **전에** 40질의 pack+sha를 scratchpad JSON으로 저장(pack 자체를 저장해야 노드/점수
  단위 귀속이 됨). 편집 후 hash 다르면 dropped/added/rescored/top5로 분해해 "의도한 방향"을
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
