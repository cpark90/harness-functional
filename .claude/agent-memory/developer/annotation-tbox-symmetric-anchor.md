# Annotation TBox — symmetric relations + n-ary Anchor (승인 계획 ①)

`ho:alternativeOf`/`ho:overlapsWith`(대칭) + `ho:Anchor`(n-ary 가중 태그: hasAnchor/
anchorTarget/anchorConfidence) 저작. TBox+shapes+INSTANCE_CLASSES+ONTOLOGYSTYLE 4파일,
abox 0개(휴면 어휘). 근거 브리프 `docs/feedback/inquiries/tbox-annotation-predicates-brief.md`.

## repo 최초 SymmetricProperty — 부작용은 "양끝 보고"

`a owl:ObjectProperty, owl:SymmetricProperty` 한 줄이면 OWL RL `prp-symp`가 역방향을
materialize한다 → 저작은 한 방향만. 대신 **`sh:targetSubjectsOf`로 건 shape는 위반쌍을
양끝에서 두 번 보고**한다(실측). 비추이(transitive 아님)는 축 선언이 아니라 definition 산문으로만
표현 가능 — A~B, B~C가 A~C를 함의하지 않음을 반드시 적는다.
domain/range는 **두지 않는다**(loose subject): 선례 `ho:tagged`(range만)·`ho:specializes`/
`ho:derivedFrom`(둘 다 없음). 잘못된 domain은 prp-dom으로 주체를 오타이핑한다.

## n-ary 노드는 ⊑HarnessComponent를 **assert** 한다 (registryDrift 이빨)

`hasComponent o hasAnchor ⇒ hasComponent` 체인을 걸면 rdfs:range(HarnessComponent) →
prp-rng로 Anchor 인스턴스는 **어차피 HC로 추론**된다. 그러니 assert 안 하는 "top-level 클래스"
설계는 이득이 없고 손해만 있다: `check_registry_drift`의 in_scope는 **asserted subClassOf\***
BFS라, assert가 없으면 미등록이어도 FAIL하지 않는다(가드가 죽음). assert하면
validate가 `⚠ registered but not instantiated (harmless): Anchor`로 **in-scope임을 영수증처럼
출력**한다(0 인스턴스는 정상 — Candidate/Example/HarnessComponent 전례).
- DA-4 중간 superclass(behavioral/observational/…)는 MAS-tuple facet 분류라 annotation 노드가
  들어갈 자리가 없다 → **HarnessComponent 직속 leaf**로 두고 그 이유를 definition에 1문장
  (단일 leaf용 중간클래스 신설 = 어휘 낭비). 표준 leaf 배치에서 벗어난 유일 케이스.
- 대가(반드시 문서화): 체인이 도는 건 **주체가 harness에 바인딩된 component일 때뿐**이다.
  Harness 자신이나 SpecConcept(Capability/Domain…)에 anchor를 달면 ComponentConnectivityShape
  (orphan) FAIL. 또 anchor마다 `skos:prefLabel`이 강제된다(같은 shape).

## SHACL SPARQL constraint 배선 (harness-shapes.ttl 최초)

```turtle
<https://harness-ontology.dev/shapes> a owl:Ontology ;      # @prefix owl: 추가 필요
    sh:declare [ sh:prefix "ho" ; sh:namespace "https://…/schema#"^^xsd:anyURI ] .
ho:XShape sh:targetSubjectsOf ho:alternativeOf ;
    sh:sparql [ a sh:SPARQLConstraint ; sh:message "… {?other} …" ;
                sh:prefixes <https://harness-ontology.dev/shapes> ;
                sh:select """SELECT $this ?other WHERE { … FILTER NOT EXISTS { … } }""" ] .
```
- **sh:select 안의 prefix는 파일 `@prefix`가 아니라 `sh:prefixes`로 해석**된다(선언 노드 필수).
- `SELECT $this ?other` 바인딩이 위반 1건이 되고 `{?other}`가 메시지에 치환된다.
- `sh:datatype xsd:decimal` + `sh:minInclusive 0.0`/`sh:maxInclusive 1.0` 조합으로 0..1 강제
  가능(1.5·-0.2 FAIL 실측). 소수 리터럴로 써야 타입 비교가 자연스럽다.
- validate.py는 이미 `advanced=True`라 추가 배선 없음. shapes 파일은 loader가 union에서
  제외하므로 owl:Ontology 헤더를 넣어도 그래프에 영향 0.

## 셰이프 이빨 smoke (디스크 오염 없이)

scratch 스크립트에서 `lib.load_graph()` → 합성 트리플 주입 → `lib.apply_reasoning` →
`pyshacl.validate(shapes=on-disk)`로 **양성/음성 케이스를 둘 다** 돌린다(성공만 보면 죽은 가드를
못 본다). 유효 anchor 케이스가 conforms=True면 체인 rollup이 실제로 도는 것까지 동시에 증명된다.

## 문서 동반 (doc-lag)

§2 접두사표 1행(`Anchor | anchor- | id:anchor-…` — 0 인스턴스라 예시는 `ho:Example` 전례대로
ellipsis) + §3 순서 tail(`… derivedFrom → alternativeOf / overlapsWith → hasAnchor` → 그 다음이
`ho:tagged`라 crisp/weighted가 인접). **주의: `lint_uniformity.PREFIX_MAP`은 §2 표에서 자동
파생되지 않는 하드코딩 dict** — 표에 행을 넣어도 린터는 그 접두사를 강제하지 않는다(인스턴스 0이면
오탐도 없어 조용히 갈라진다). **§2 표에 행을 추가한 그 브리프에서 PREFIX_MAP도 같이 넣는다**
(`HO.Anchor: "anchor-"` 등록 완료 — 인스턴스 0이라 동작 변화 0, 첫 저작 시점의 함정만 제거).
dict는 §2 표 순서를 그대로 따르므로 새 행은 표와 같은 슬롯에 넣고, 폭(≤87)을 넘으면 그 줄만
쪼갠다(전체 re-pack 금지 — 1행 추가가 12행 diff가 된다). 이빨 확인은 디스크 오염 없이:
scratch에서 `lib.load_graph()` → 합성 개체(`a ho:Anchor` + prefLabel) 주입 → `check_naming_prefix(g)`
를 나쁜 slug/좋은 slug 두 번(각각 violation 1 / 0). 린터 모듈은 `import ontology_lib as lib`.

## 문면 시제 (조건부 문구의 마감)

미-land 어휘를 가리키는 조항은 "(승인 계획 ① 항목 — land된 뒤 적용)"류 괄호로 쓰이는데,
land되면 **같은 조항 본문은 불변으로 두고 괄호만 현재형 참조로 교체**한다(§1c의 경우
"(대안 서술을 상호 연결하는 술어는 `ho:alternativeOf` — §3 5번 관계 그룹)"). 마감 전 반드시
TBox grep으로 실제 land를 확인하고(브리프의 "land됨"만 믿지 않는다), 잔여 조건부 문구는
`grep -rn "승인 계획\|land된 뒤"`로 전수 확인해 하나만 남았는지 본다.
