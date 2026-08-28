# 승인 적용 다중-웨이브 묶음(A 소규모+B 렌더+C 태그) 판정 절차

대상: docs/verify/approved-batch-render-tags-verify.md (PASS-with-notes, 차단 0).
묶음 판정은 "웨이브별 격리"가 아니라 **HEAD worktree 1개 = 3-웨이브 합산 before**로
충분할 때가 있다 — 이번엔 워킹트리 ontology diff가 정확히 그 3-웨이브뿐임을
`git diff --stat HEAD -- ontology/`로 먼저 닫았기 때문(병행 lane은 ontology 밖 파일만).

## 재사용 판정 기술

- **집계 스코프 차이 ≠ 오보**: developer "신규 co-region 169"·"팩 변화 22/40" vs 내
  실측 177·33/40 — 차이가 정확히 **형제 웨이브 기여분**(A-1 pattern 8쌍 / A-3 텍스트+B
  바인딩 11질의)으로 산술 분해되면 보고 정합. 반증하기 전에 "무엇만 잰 수치인가"부터.
- **co-region 대량 검사 = pair-set delta**: 판별 facet(anatomy|method) 개념별 taggee
  집합 → combinations → (pair→공유개념) dict를 before/after로 만들어 신규/제거를 개념별
  히스토그램+전수 목록으로. "제거 0"이 회귀 부재의 첫 줄. 허위 region 판별 기준은 B3와
  동일(scope/quality-단독 공유형 재발 여부); **클래스 횡단 쌍은 method region의 본성**
  (region은 alternativeOf의 허용 게이트일 뿐 선언이 아님 + ABox alternativeOf 0건이면
  실해 0)이라 그 자체로는 결함 아님.
- **태그 사실성의 근거 사다리**: verbatim 정의문 > **그래프 datatype 사실**(6 tier의
  ho:envelopeBinding — 산문 verbatim 없는 tier-per-action을 "가족 규칙"보다 강하게
  구제한 실례) > 가족+선례(HEAD 기태깅 histogram으로 선례 실증; 저작 의도는 캐리어
  주석 verbatim으로) > 자기 대조문과 충돌(가장 약함 — gr-rejection-feedback promptText
  "here the human has already decided"가 c-escalation "undecided question"을 문면
  부정 → 기각 대신 **개념정의 일반화 권고**로 처리, 선재 외연이 이미 넓었기 때문).
- **SKIP 정당성은 재계산으로**: "판별태그 없는 tagged 개체" 집합을 양쪽 트리에서 재계산
  (HEAD 35→WT 13, 22+13=35 폐합) + 잔여의 사유 3분류를 노드별 def/promptText 길이로
  실증(텍스트 전무 5노드 = None/None). fail-closed 해석 = 미태깅의 유일 효과가 region
  앵커 자격 상실(선언 차단)임을 shape 의미론으로 명시.
- **렌더 데이터 충실성**: 표 칸↔술어 1:1 대조에서 **"—" 칸 수 == 해당 술어 미선언 수**
  (threshold 3결측=3 "—")가 강한 무날조 증거. MANIFEST 합계 delta == 신규 바인딩
  tokenEstimate 합(+정의 확장분)의 산술 일치도 동일 역할. additions-only는 파일별
  분리(CLAUDE.md −0 / MANIFEST −1=합계줄) — developer 메모와 동일 관례.
- **조건부 포인터 검증은 반례 하네스로**: `(see Error handling)` 가드
  `all(exit ∈ hasFailurePolicy(h))` — 등재 안 한 h-hil-approval 렌더에서 suffix
  부재를 실측(조건 참 쪽만 보면 vacuous).
- **retrieve token_cost 15-floor**(retrieve.py:179-182, MIN_NODE_TOKENS=5):
  tokenEstimate 없는 Concept의 정의 축약은 admission 예산 무변 — "토큰 회수" 주장은
  렌더 텍스트 층위(chars//4 합 diff)에서만 실측 가능. 승인 문서의 정량 근거가
  틀렸어도 적용이 유효할 수 있다 — "근거 불성립 기록 + 적용 유효"로 분리 판정.
- **광역 질의의 on-topic 팩 이탈**은 직접 질의 잔존 실측(fp-refer-to-expert rank 2)
  으로 손실 범위를 한정해 비차단으로 강등.
- 대칭 술어 한 방향 저작: raw 2/reasoned 4 대조 + **소비자 전수 reason= 인자 grep**
  (validate:246의 raw 로드는 rdf:type만 — 용도까지 읽어야 오판 안 함).
- `ho:tagged-style` dangling 경고 = TBox harness.ttl:714 산문 오탐(`-style` 접미가
  토큰 정규식에 걸림), 상시 재현 — before/after 로그 양쪽 존재로 웨이브 귀속 차단.
