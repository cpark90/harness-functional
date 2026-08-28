# operating-envelope + autonomy-tier 축 검증 재현 절차 (W1)

대상 유형: 새 component 클래스군(OperatingEnvelope/EnvelopeStatement/EnvelopeRule)
+ SpecConcept leaf(AutonomyTier) + SPARQL usage-shape 3종 이식. 리포트:
`docs/verify/av-w1-envelope-verify.md`.

## negative control 재현 (in-memory, 디스크 무오염)

- `lib.load_graph(reason=True)`로 reasoned base 1회 로드 → 케이스별 Graph 복사
  → add/remove → pyshacl(`inference="none", advanced=True`) — validate.py와 동일
  설정. FAIL 케이스는 **기대 메시지 문자열까지** 대조(딴 shape가 낸 FAIL 오탐 방지).
- **★post-reasoning 주입 함정**: reasoned 그래프에 statement/rule을 주입하면
  chain이 안 돌아 `ComponentConnectivityShape` "Orphaned component"가 뜬다 —
  이건 ontology 결함이 아니라 주입 아티팩트. CONFORM twin에는 chain이 추론했을
  `h hasComponent <row>` triple을 수동 부여. (역으로 이 orphan 발화가 envelope
  row의 anti-orphan 커버리지 실증이 됨 — 리포트에 부수 증거로 쓸 것.)
- SPARQL usage-shape 격리 요령: 기존 하네스의 tier triple을 **remove 후 다른
  tier add**로 조건 1개만 위반시키기 (h-coding=envelope 있음·채널 없음·safe-halt
  provider 없음이라 SPARQL-2/-3 격리에 최적; h-peer-mesh=envelope 없음이라
  SPARQL-1 격리용; h-workspace-synthesis=hasFailurePolicy⊑hasComponent로
  fp-envelope-exit(providesCapability cap-safe-halt)를 이미 hasComponent → CONFORM
  케이스용). tier-unbounded는 binding 면제 + fallback=harness 요구를 동시 시험.

## propertyChain 판정 (브리프 명세가 틀린 실사례)

- **브리프의 3-link `(hasComponent hasEnvelope hasEnvelopeStatement)`는 절대
  발화 불가**: 중간 패턴 `X hasEnvelope e`의 X는 rdfs:domain상 Harness 자신이라
  `h hasComponent X`가 성립 못 함. `hasEnvelope ⊑ hasComponent`가 있으면 2-link
  `(hasComponent hasEnvelopeStatement)`가 유일 정답 (hasSystemPrompt+hasSection
  twin 동형). **치환 실험으로 실증 가능**: raw 그래프에서 해당 2-link chain을
  rdflib Collection으로 찾아 제거→3-link 추가→owlrl→발화 0 확인.
- 인스턴스 0인 클래스(EnvelopeRule)의 chain은 **pre-reasoning 주입**으로 발화
  실증 (raw 로드→triple add→owlrl→hasComponent/typed/mistype 3점 확인).

## materialize 무회귀 (전그래프 메타데이터는 필연 diff)

- baseline은 `git archive HEAD | tar -x`. `diff -r`에서 **CLAUDE.md 무diff가
  판정축**; `harness.lock.json` individualCount와 MANIFEST 컴포넌트 목록·aggregate
  tokenEstimate는 subPropertyOf-of-hasComponent 신설 시 구조적 필연 diff —
  **tokenEstimate delta를 신규 노드 선언값 합과 산술 대조**하면 "필연뿐" 증명 끝
  (h-coding +397=110+287 정확 일치식). 렌더 분기 부재는 grep <신규술어>
  materialize.py = 0.

## 기타 판정거리

- 개체 게이트("~N 이내")는 브리프 §명세의 산술 최솟값과 먼저 검산 — 모순이면
  고정 결정이 우선(게이트 stale 판정). +54 재집계는
  `git diff HEAD -- ontology/abox/ | grep -E '^\+id:.. a ho:'` 히스토그램.
- registry 3-way(§2표↔PREFIX_MAP↔INSTANCE_CLASSES)는 기계 대조(파이썬으로 양방향
  차집합 0). INSTANCE_CLASSES 실위치는 ontology_lib.py — 브리프가 validate.py라
  적어도 경로 오기. component 하위 신클래스도 등록이 옳다(lib docstring: leaf를
  전부 나열, reason on/off count 동일 불변식 + MANIFEST typing).
- carrier 분리(선언 하네스≠규율 carrier)는 byte-identity 게이트가 강제하는
  과도기로 수용하되, **렌더 wave에서 규율 재배치 재검토 note를 반드시 남길 것**
  (선언 하네스의 산출 문서에 규율 미출현 상태).
- salience는 domain-free(rdfs:domain 없음) → 아무 클래스에 얹어도 mistype 없음.
