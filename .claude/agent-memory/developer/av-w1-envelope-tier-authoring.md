# AV W1 — OperatingEnvelope + AutonomyTier 저작 (브리프 `av-w1-envelope-brief.md`)

TBox 3클래스(OperatingEnvelope/EnvelopeStatement/EnvelopeRule ⊑HC 직속 leaf, Anchor 선례) +
AutonomyTier ⊑ **SpecConcept**(브리프 F1: `ho:Specification`은 실존하지 않음 — 브리프의 클래스명은
grep으로 재확인) + 술어 19 + shapes 5 + ABox 54개체. 게이트 3종 PASS, negctl 9/9.

## ★ 브리프의 chain 표기를 그대로 옮기면 죽은 chain이 된다

브리프·verified 문서가 쓴 `hasComponent o hasEnvelope o hasEnvelopeStatement`(3-link)는
**절대 발화하지 않는다**: `?x hasEnvelope ?e`의 주어는 Harness인데 `?h hasComponent ?x`의
목적어는 component라 결합 불가. `hasEnvelope ⊑ hasComponent`가 이미 `harness hasComponent
envelope`를 추론하므로 정답은 **2-link `( hasComponent hasEnvelopeStatement )`** —
hasSection/agentObservation과 정확히 동일한 꼴. sub-property 경유 rollup은 항상 2-link.
브리프 산문에 3-link가 있어도 선례(twin chain)와 대조해 교정하고 반환문에 사유를 적는다.

## byte-identity 게이트와 anti-orphan의 동시 만족 = carrier 분리

envelope 선언 하네스(h-coding/h-multiagent)의 CLAUDE.md를 불변으로 유지하려면 신규
gr-/fp-/scn-을 **그 하네스에 바인딩하지 않는다**: gr-envelope-* + fp-envelope-* →
h-workspace-synthesis(fp 카탈로그 호스트), scn-envelope-* → h-harness-factory(scn 카탈로그).
`onEnvelopeExit`는 refinement edge(chain 없음)로 두고 도달성은 carrier의 hasFailurePolicy가
공급. 실측: 두 스모크 하네스의 **CLAUDE.md·roles·skills 전부 byte-identical**, 변한 것은
MANIFEST.json(hasComponent closure에 oe-/es- 등장 — `hasEnvelope ⊑ hasComponent`의 구조적
필연, 회피 불가)과 lock의 individualCount뿐. baseline은 `git archive HEAD | tar -x`로
scratch에 떠서 diff(읽기 전용 — git 상태 불변).

## tier ⇒ capability/channel SPARQL — ABox IRI를 shape에서 쓰는 법

shapes 헤더의 `sh:declare`에 `id:` prefix를 **추가**하면 sh:select 안에서 `id:cap-safe-halt`
직접 참조 가능(SPARQL prefix는 파일 @prefix가 아니라 sh:prefixes에서 온다 — annotation 선례).
receptive-user 분기는 IRI 대신 `?ch ho:involvesUser true`(중립 속성 매칭)로. 검사 대상 술어는
reasoned graph의 `ho:hasComponent`라 sub-property·chain rollup이 전부 잡힌다. 양/음성 대조군:
h-multiagent(receptive-user + chan-agent-user)와 h-coding(bounded + envelope)이 in-graph
positive control이 되도록 tier 배정을 설계하면 negctl이 저렴해진다.

## cap-safe-halt는 fp가 제공한다

safe-halt capability의 제공자는 도구가 아니라 **fp-envelope-exit/-severe(FailurePolicy도
HC라 providesCapability 가능)** — recovery strategy 자체가 도달 절차이므로 참이고,
CapabilityConnectivityShape(제공만으로 충족)와 shape-3의 존재 요구를 동시에 해결.

## 기타

- 죽은 어휘 도메인 축소(triggerPhrase/outOfScope→Instruction): 그 술어를 "no-domain 선례"로
  인용한 **주석 2곳**(observationKind/unobserved)이 stale해짐 — grep으로 전수 교체.
- es- 노드는 definition 없이 attribute/verdict/threshold/observable만; tokenEstimate는
  스크립트로 전 리터럴 chars//4 실측 후 일괄 패치(선저작-후실측이 편함). salience 0.2.
- 개체 증가 +54 (269→323): 브리프 §4d 고정 항목의 산술 최솟값이 이미 50(개념25+tier6+gr3+
  fp2+oe2+es12)이라 게이트의 "~40"과 양립 불가 — 수치 충돌은 조정하지 말고 반환문에 산술로 보고.
- **동시 편집 주의**: 같은 wave 중 다른 세션이 ONTOLOGYSTYLE §2표·PREFIX_MAP·INSTANCE_CLASSES를
  선반영해 edit 충돌("not found"/"modified since read")·표 행 중복이 났다 — 충돌 시 즉시
  `git diff`로 현 상태를 재실측하고 중복만 제거, 내 편집을 재적용하지 않는다.

## 배정분이 이미 디스크에 있을 때 (같은 wave 재dispatch)

단계별 dispatch가 병행 세션과 겹치면 **내 담당 노드가 이미 저작돼 있는 상태**로 시작한다
(mtime이 세션 시작 몇 분 전, `git diff`엔 있고 HEAD엔 0건). 재작성하지 말고 **브리프 대조 감사
→ 결손만 보완**: ① 개수·축 구성(5축×leaf), ② anti-orphan(leaf→axis→parent `skos:broader`,
parent만 `topConceptOf id:scheme`), ③ 금지어 grep(약어·서열 라벨·`Level N`), ④ 근사동의어
(전 prefLabel 나열해 대조), ⑤ 게이트 3종 + `retrieve.py` 실검색. 감사가 전부 통과하면 남는 것은
**브리프가 요구했는데 디스크에 흔적이 없는 설계 결정의 기록**뿐 — 그건 주석으로 남긴다.

## 개념/등급 노드의 규약 실측치 (감사 체크리스트)

- `ho:Concept`은 `tokenEstimate`·`maturity` **둘 다 없는 것이 이 repo 관용**(§1c 범위는
  promptText 보유 4클래스 + Tool/Workflow뿐 — 린터가 이 범위를 코드로 고정). 브리프가
  "tokenEstimate 부여"라고 써도 Concept엔 붙이지 않는다. 반대로 AutonomyTier는 lint의
  **maturity coverage scope**에 들어 있어 `ho:maturity` 누락이 하드 FAIL.
- `tokenEstimate`는 `retrieve.py:token_cost`가 **그대로 예산에 쓰는 값**이라 과대치는 팩
  under-fill, 과소치는 잘림. 기존 이웃(ExecutionMode)도 def//4 대비 ±15% 편차가 있어 소폭
  과대는 관용 범위 — 남의 세션이 방금 쓴 값을 정밀도 사유만으로 갈아엎지 않는다.
- **등급(tier) 축 저작 규칙**: 판별자는 승인 단위의 크기, 정의는 {decide, act} 배분.
  루프 위치 어휘(in/on/out-of-the-loop)와 "인간이 왜 있는가" 어휘는 **직교 스킴**이라 라벨·
  슬롯에 섞지 않고, 그 사실을 블록 주석에 **명시적 out-of-model 제외**로 적어 둔다(개념 스킴의
  보호속성 축 제외와 같은 형식). 이 한 줄이 나중에 `tier-human-in-the-loop` 류 드리프트를 막는다.
