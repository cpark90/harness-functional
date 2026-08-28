# 확률적 지식 연결(ho:Link) 1단계 — 스키마+수직 슬라이스에서 얻은 재사용 지식

- **n-ary 링크는 ⊑HarnessComponent 금지**: source가 Concept인 링크(2단계 broader 이전)는
  어떤 hasComponent chain으로도 도달 불가 → ComponentConnectivityShape가 orphan으로 잡는다.
  annotation층은 부품이 아니다(vnv의 anchor 감사 판정과 일치). anti-orphan은 대신
  `sh:inversePath ho:hasLink minCount 1`로 shape에 건다. chain·rollup 없음 → MANIFEST 미등장.
- **range-less 술어가 진짜 이빨**: `ho:linkTarget`/`ho:linkKind`에 rdfs:range를 주면 OWL RL
  prp-rng가 오타입 대상을 그 타입으로 추론해 sh:class가 vacuous 통과(구 AnchorShape 실측
  caveat). range를 TBox에서 빼고 shape의 sh:or/sh:class만 두면 negative control이 실제 FAIL.
- **target 유니온은 SpecConcept 포함 필수**: 기존 승인 데이터(chan-peer↔pat-peer-mesh)가
  Channel↔DesignPattern이라 sh:or(HC, SpecConcept, Concept). Harness target은 사례 없어 제외.
- **weightOrigin 3값**: measured(재측정 덮음, weightMethod 필수—SPARQL 제약) / asserted(crisp
  이전 1.0, 측정이 정제 가능) / curated(사람 확정 — 측정 도구가 구조적으로 skip). 보호는
  스키마가 아니라 **도구 계약**(tools/measure_links.py가 curated를 아예 건드리지 않음)+정의문.
- **crisp→퍼지 초기값**: 명시 저작 crisp = 1.0 "asserted". 구 anchor 7건은 값 보존(0.9/0.4)
  + "curated"(definition 문면 근거의 사람 확정값이므로).
- **enum형 LinkKind 연결성**: ExecutionMode 선례대로 `ho:tagged id:c-controlled-vocabulary`로
  미사용 kind도 reachability 확보. kind의 `ho:traversalWeight`(데이터)가 코드 PREDICATE_WEIGHT
  대체 — 신규 kind는 코드 무변경.
- **byte-identity 전략**: kind base weight = 구 crisp 술어의 projector weight(topic 0.7=tagged,
  broader/overlap/alternative 0.5). 병렬 crisp 엣지가 max() 경쟁에서 이기므로 이전만으로는
  랭킹 불변; 관여 팩의 diff는 edges 섹션(중복 대칭 overlapsWith 2줄→가중 1줄, topic 가중선
  추가)뿐. 링크가 유일 경로일 때(=2단계 상황) 가중이 결정적: toy 그래프로
  rel = seed×0.75×base×degree 정확 일치 실증.
- **measure --apply**: 블록 스코프 regex(`id:<slug> a ho:Link ;`→` .\n`), tail 1회 매치 강제,
  멱등(2회 실행 diff 0). noisy-OR 구조 증거(E1 산문 IRI 교차참조 0.45/방향, E2 공유
  discriminant 태그 0.5, E3 기타 공유 태그 0.2) — 유사도 단독 금지(결정 기록).
- **잔여 함정(2단계)**: ①AlternativeLinkSharedRegionShape가 crisp ho:tagged를 join — tagged가
  topic 링크로 이전되면 shape의 ?region join도 따라 옮겨야 함. ②tagged 224·broader 70 이전 시
  병렬 crisp가 사라져 링크 가중이 실제 랭킹을 지배 — 팩 대규모 변동 예상, base weight 재보정
  게이트 필요. ③retrieve의 파생 엣지 표기(p=kind 축약, "w" 필드)가 pack 스키마 확장 —
  webui/소비자 확인. ④link_predicates는 TBox 파생이라 hasLink/linkTarget/linkKind 자동 포함
  (validate reachability는 이 엣지로 링크·kind 도달).
