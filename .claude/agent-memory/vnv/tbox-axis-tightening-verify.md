# TBox 축 1종 신설 + shape 조이기(minCount) 검증 재현 절차

사례: `ho:memoryWriteTiming`(write-side 축) + `sh:in` 닫힌 값 3종 + `minCount 1` + altLabel 1 +
정의 2문장 보강. 판정: `docs/verify/memory-writetiming-verify.md` → **PASS + N1~N4**.
"신규 노드 0 · 술어 1종 추가 · 리터럴 보강" 유형(=validate PASS가 거의 자동)에서 **증명축이
어디로 옮겨가는가**를 정리한다.

## 1. SHACL 이빨은 negative control로만 증명 (★대조군 필수)
in-memory 사본에만 주입(`lib.load_graph()` → rdflib add/remove → `pyshacl.validate`),
`ontology/`는 무수정. 4종이 각각 다른 constraint를 때리는지 확인:
(a) 닫힌 값 밖 문자열 → `InConstraintComponent` (b) 술어 없는 신규 개체 → `MinCountConstraint`
(d) 값 2개 → `MaxCount` (e) xsd:integer → `Datatype`+`In`.
**(c) 대조군이 판정을 완성한다**: (b)와 동일 노드에 올바른 값 하나만 얹어 다시 conforms=True를
보이면, (b)의 FAIL이 "주입 노드가 다른 이유로 미달"이 아님이 증명된다. 대조군 없는 minCount
주장은 약하다. 주입 노드는 label/def/다른 필수술어/`hasMemory` 결합까지 **완비**시킬 것
(안 그러면 ComponentConnectivityShape 등 딴 shape가 먼저 터져 오탐).

## 2. minCount는 '조이는' 변경 → downstream(recipe fleet) 필수 확인
중앙 PASS는 필요조건일 뿐. `grep -rn "a ho:<Class>" <recipes repo>`로 로컬 개체 유무를 먼저 보고,
closure를 실제로 돌린다. **레시피 repo를 건드리지 않고** 하는 법: scratchpad에
`catalog.xml`(레시피 카탈로그 복사) + `central`→중앙repo 심링크 + `recipes`→레시피 repo 심링크를
만들고 `HARNESS_CATALOG=<scratch>/catalog.xml HARNESS_ROOT_ONTOLOGY=<recipe IRI>`로 중앙
`tools/validate.py` 실행(끝나면 심링크 rm). 오탐 주의: **카탈로그에 매핑 없는 IRI는 중앙만
로드하고 조용히 PASS** → 개체수가 중앙 baseline보다 큰지로 closure 성립을 확인한다.

## 3. before/after 발견성은 HEAD worktree 격리 + 델타 1파일만 얹기
`git worktree add --detach <scratch>/wt-head HEAD` → `cp -a`로 `wt-after` 만들고 **대상 abox
파일 하나만** 워킹트리 판으로 덮는다. `diff -r wt-head/tools wt-after/tools`로 tools 동일함을
먼저 증명(=랭킹 차이가 그래프 델타 탓임의 전제). `ontology_lib.ROOT=__file__` 기준이라 각
worktree의 retrieve가 자기 ontology를 읽는다. `PYTHONHASHSEED` 3종으로 결정성도 같이 본다.
- **기여 분해(attribution)**: 변경이 2개(altLabel + 정의 보강)면 **한쪽만 얹은 3번째 변형**을
  만들어 각 질의군의 상승분을 귀속시킨다. 실제로 `"short-term memory"` 상승(2.7→7.2)은 전량
  altLabel, 생산-시점 문장 질의(HEAD에선 seed 미매칭)는 전량 정의 보강이었다 = 두 조치가 서로
  다른 질의군을 담당함을 분리 증명.
- retrieve JSON 키: `seeds`(label+score)·`nodes`(id/label/relevance…, relevance 내림차순)·
  `candidates`(label+relevance만). 팩 랭크는 `nodes` 인덱스로 센다.

## 4. emitted byte 영향은 wt-head vs wt-after `materialize` diff가 최선
워킹트리 원시 diff는 타 세션 uncommitted에 오염되지만, 위 두 worktree는 델타 1파일만 다르므로
`diff -r mat-before mat-after`가 **깨끗한 격리 증명**이 된다(구조적 grep보다 강함).
이번엔 `MANIFEST.json`의 aggregate `tokenEstimate` 1줄(+120 = 두 노드 tokenEstimate 증가분의
정확한 합)만 바뀌고 산문 전 파일 byte-identical.

## 5. 리터럴 보강의 숨은 대가 = 팩 admission 경합
`retrieve.token_cost()`는 `ho:tokenEstimate`를 그대로 쓴다. 정의를 늘리고 tokenEstimate를
올리면 기본 budget(900)에서 **다른 노드가 밀려난다** — 이번엔 같은 tier 형제(`Firmware memory`)
포함 3개가 탈락. 그래프 결함이 아니라 경합이므로 `--budget 3000`에서 복귀함을 보이고
non-blocking note로 낸다. 팩 멤버십 delta(집합 차)를 찍어두면 설명이 정확해진다.

## 6. 문서 동반(§3)·값-산문 결합 체크
축을 늘렸으면 ONTOLOGYSTYLE §3 프레디킷 순서에 read/write 짝 순서가 기재됐는지 + TTL 3개체가
실제 그 순서인지 대조. 보강 문장이 닫힌 값 문자열("… is the immediate-apply tier")을 그대로
부르면 개명 시 shapes/ABox/정의문 3곳 동시 수정 필요 → note로 남긴다(발견성 근거가 있으면 KEEP).
