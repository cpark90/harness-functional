---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/verified/annotation-backbone-architecture.md   # 승인 계획 단계 ①
related: [docs/feedback/annotation-backbone-architecture.md, docs/feedback/inquiries/tool_suggestion.md]
---
# TBox 술어 3종 dispatch 브리프 (초안) — annotation 관계 어휘 (승인 계획 ①)

> 작성: inspection (사용자 지시, 2026-08-27). **정식 채택·dispatch는 orchestrator 소관.**
> 승인 항목(`annotation-backbone-architecture.md`, status: approved, 결정 A)의 적용 계획
> 1단계 — 중복 서술을 "관계로 묶인 대안 설명"으로 규율하기 위한 최소 어휘.

## 1. 목표 (한 문장)
같은 지식을 겹치게/다르게 설명하는 노드들을 **명시 관계로 묶고**(anti-drift 양립 조건),
anchor에 **가중(confidence)** 을 실을 수 있는 TBox 어휘 3종을 정의한다 — 이것이 없으면
중복 서술은 duplicate-label 경고·golden rule 2에 드리프트로 오검출된다.

## 2. 담당·경로 (파일 경계)
- **developer dispatch (opus)**: `ontology/tbox/harness.ttl` + `ontology/shapes/harness-shapes.ttl`
  + `tools/ontology_lib.py`(INSTANCE_CLASSES 1행) + `ONTOLOGYSTYLE.md`(§2 1행·§3 1곳) **만**.
  abox 개체 저작 없음(아래 §5 예외 참조). retrieve/materialize 로직 변경 금지(단계 ③ 소관).
- **vnv dispatch**: validate·determinism·lint 재현 + symmetric 추론 검증 + negative control.
- **git: inspection** (게이트 통과 후).

## 3. 구현 명세 (developer — 기존 관례 실측 기반)
### 3a. `ho:alternativeOf` — 대안 설명 (대칭)
```turtle
ho:alternativeOf a owl:ObjectProperty, owl:SymmetricProperty ;
    rdfs:label "alternative of" ;
    skos:definition "…" .   # 아래 의미 요건을 developer가 산문화
```
- **의미 요건**: 두 노드가 **같은 지식(같은 anchor 영역)** 을 서로 다른 방식으로 설명하는
  대안임을 선언. 대칭·비추이. **domain/range는 두지 않는다** — loose-subject 전례는
  `ho:tagged`(range만 선언, `harness.ttl:629`); 잘못된 domain이 subject를 오타이핑하는 함정은
  `hasComponent` chain 정의(`harness.ttl:284`)에 문서화된 기존 교훈.
- **정의문에 반드시 담을 것**: (a) projection에서 같은 anchor 영역당 1개만 선별된다는 소비
  규약(단계 ③), (b) 관계 없는 근사중복은 여전히 드리프트라는 경계.
- OWL RL `prp-symp`가 역방향을 materialize한다 — **repo 최초의 SymmetricProperty**이므로
  reasoning 후 triple 델타가 +2N(선언 N쌍)임을 vnv가 확인.

### 3b. `ho:overlapsWith` — 설명 영역 부분 겹침 (대칭)
- 대안(전체 대체 가능)이 아니라 **scope가 부분적으로 겹치는** 두 설명을 잇는다. 대칭·비추이,
  domain/range 없음. 정의문에 alternativeOf와의 구분(전체 대안 vs 부분 겹침)을 명시.

### 3c. anchor confidence — n-ary 1종 (`ho:Anchor` + 술어 3개)
crisp `ho:tagged`는 그대로 두고, **가중 anchor가 필요한 경우에만** 쓰는 additive 기구:
```turtle
ho:Anchor a owl:Class ;                      # 개체 접두사 anchor- (§2 표에 추가)
ho:hasAnchor a owl:ObjectProperty ;          # <노드> → Anchor
ho:anchorTarget a owl:ObjectProperty ;       # Anchor → ho:Concept (rdfs:range ho:Concept)
ho:anchorConfidence a owl:DatatypeProperty ; # rdfs:range xsd:decimal, 0..1 — ho:salience(harness.ttl 892) 스타일 미러
```
- **[필수] reachability chain**: Anchor 중간 노드는 방치하면 orphan-island로 validate FAIL.
  기존 패턴 그대로 `ho:hasComponent`에 propertyChainAxiom 1개 추가:
  `hasComponent o hasAnchor ⇒ hasComponent` (agentObservation 체인 미러, `harness.ttl:428`
  스타일 — hasAnchor를 hasComponent의 직접 sub-property로 만들면 subject 오타이핑, 금지).
- **[필수] SHACL** (`harness-shapes.ttl`): AnchorShape — `anchorTarget` exactly 1,
  `anchorConfidence` 0..1 decimal (0..1 범위 위반은 FAIL).
- **[필수] registry**: `INSTANCE_CLASSES`(ontology_lib.py:76)에 `Anchor` 등록 — 미등록이면
  registryDrift 게이트 FAIL. 초기 인스턴스 0은 무해(registered-not-instantiated 전례:
  Candidate/Example/HarnessComponent).
- **휴면 명시**: confidence의 소비자(retrieve 선별)는 단계 ③에서 land — 그때까지 이 기구는
  선언만 존재. `ho:Anchor` 정의문에 "consumed by the projection layer's per-region selection"
  을 명시해 휴면 기계 오해(B9 후속의 DEPRECATED_RANK_FACTOR 류 논쟁)를 예방.

### 3d. 문서 동반 (doc-lag 예방 — 같은 커밋 필수)
성장분마다 §2/§3 doc-lag가 재발한 실측 이력(237·245 감사) → **같은 dispatch에서**:
- `ONTOLOGYSTYLE.md §2` 표에 `Anchor | anchor- | id:anchor-…` 행 추가.
- `§3` item 5(관계 그룹)에 `ho:alternativeOf`/`ho:overlapsWith`/`ho:hasAnchor` 자리 명시.

## 4. SHACL 불변식 — 대안쌍 공유 anchor (권고, teeth)
승인 (A)의 핵심 규율 "대안은 같은 영역"을 문서 약속이 아니라 shape로 강제:
`alternativeOf`로 이어진 두 노드는 **`ho:tagged` 개념을 ≥1개 공유**해야 한다 (SPARQL
constraint). 위반 = FAIL. vnv negative control: 공유 태그 없는 가짜 쌍을 스크래치 그래프에
주입해 FAIL을 실측(통과하면 가드가 죽은 것).

## 5. abox 예시 (조건부 — 날조 금지)
실재하는 대안 설명 쌍이 그래프에 이미 있으면 1쌍만 예시로 연결해도 된다(개체 신설 없이
edge만). **없으면 만들지 않는다** — 인스턴스 0 어휘는 §3c 전례대로 무해하며, 실제 사용은
annotation 유입(recipes/webui) 시점부터.

## 6. 수용 게이트 (go/no-go)
- G1. `validate.py` PASS (reasoning 포함 — symmetric materialize + 신규 chain axiom 후에도
  SHACL·reachability·registryDrift 전부 초록).
- G2. `check_determinism.py` PASS · `lint_uniformity.py` PASS.
- G3. §4 negative control: 위반 주입 시 FAIL 실측 (성공 케이스만 보지 말 것).
- G4. §3d 문서 2곳이 같은 커밋에 포함 (§2 표·§3 위치 ↔ 실제 TBox 1:1 대조).
- G5. materialize 무회귀: 신규 어휘는 사용 0이므로 기존 하네스 산출물 **byte-identical**
  (`harness.lock.json` 제외 diff 0 — worktree 비교, 전례: central-ontology-land 레시피).

## 7. 비범위
retrieve 선별 로직·린터 cap(단계 ②③)·webui/편집기(별도 lane)·edge-level confidence의
`skos:broader` 확장(backbone 가중은 수요 확인 후 별도 결정)·기존 `ho:tagged` 의미 변경.
