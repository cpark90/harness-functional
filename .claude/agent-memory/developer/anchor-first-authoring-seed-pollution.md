# Anchor 첫 저작 — 2단 눈금·죽은 sh:class 이빨·팩 잠식 실측

`ho:Anchor` 첫 실사용 wave(364→371 individuals). 저작 7개(mem-longterm 2 /
role-tester 2 / role-auditor 3), 부착 노드 파일에 colocate(신규 파일·catalog 비용 0).

## 저작 규칙 (재사용)

- **부착 가능 측정**: reasoning 후 `(H a ho:Harness) → hasComponent 목적어` 집합.
  이번 실측 222/364 부착 가능, 다중 태그 65, 교집합 52.
- **confidence 눈금은 2단 정성**(0.9=primary: definition 본문 주제가 곧 region /
  0.4=secondary: 문맥·한정어·내용 예시로만 등장). 중간값 금지 — 정성 구분을 숫자로
  위장하지 않는다. 눈금 정의는 파일 주석(memory.ttl WEIGHTED ANCHORS 절이 원본,
  타 파일은 포인터).
- **근거는 definition 문면만**: 태그 근거가 배선(roleGuardrail 등)뿐이면 anchor 금지
  (예: role-auditor의 c-traceability). **legible 태그가 1개뿐인 노드는 통째 skip** —
  anchor 1개는 비교 정보가 없어 "weight carries information" 조건 미충족(mem-cache류).
- anchor 개체는 prefLabel+anchorTarget+anchorConfidence만(shapes 요구가 전부; maturity/
  definition/tokenEstimate lint 스코프 밖). 근거 인용은 `#` 주석으로.

## 셰이프 이빨 — anchorTarget sh:class는 reasoning 하에서 죽어 있다

`ho:anchorTarget rdfs:range ho:Concept` + prp-rng가 잘못된 target(Tool 등)을 Concept로
**추론 타이핑**하므로 validate 파이프라인(reasoning→SHACL)에서 AnchorShape의
`sh:class ho:Concept`는 절대 안 발화한다. 실제로 잡는 건 **ConceptConnectivityShape**
("Orphaned concept": mistyped target이 taxonomy 무연결) — 현 그래프에선 모든 비-Concept
target이 이 경로로 FAIL하니 게이트는 살아 있으나 이빨의 소재를 오인하지 말 것.
sh:class 자체는 reasoning 없이 돌리면 발화함(실측). negative control은 control 1 +
단일 변형, 메시지 키워드로 어느 shape가 발화했는지 반드시 확인.
(후속 wave에서 land: 이 사실은 harness-shapes.ttl AnchorShape 블록 주석 "CAVEAT" 문단으로
파일 내 명문화됨 — sh:class는 의도 선언+무추론 소비자용으로 유지. shapes 주석 편집의
pack-불변 증명은 rdflib isomorphic 대조가 stash보다 안전(병행 uncommitted 오염 회피).)

## ★ 선언 전용 축이 검색 중립이 아니다 (설계 재검토 유발)

anchorConfidence 소비 코드 0줄이어도 **anchor 개체 자체가 팩을 잠식**한다(40질의 중
29 팩 변화, 총 120회 admit). 두 벡터:
1. **seed 오염**: prefLabel "X / Y anchor"가 노드·region 라벨을 반복해 lexical seed로
   상위 진입(MAX_SEEDS=8에서 실노드 축출; "traceability audit oversight" 팩 36→19,
   c-traceability·cap-audit·role-benchmarker 축출 — annotated 노드가 자기 anchor에
   밀린 사례도 있음).
2. **rollup 엣지**: 추론된 harness→hasComponent→anchor가 가중 0.9 + 기본 비용 15tok로
   광역 확산(hasAnchor/anchorTarget 미등재 술어는 0.5).
→ "선언 전용이니 무해"는 거짓. **소비 코드가 0줄이어도 개체의 존재 자체가 seed·rollup에
들어간다** — 새 individual 클래스는 tokenEstimate 유무·prefLabel 어휘·추론 엣지만으로
retrieve에 개입한다. 잠식 관측 시 되돌리지 말고 보고(브리프 지시).

## 수정 (후속 wave에서 land): projection에서 annotation 층 제외

orchestrator 판정 "Anchor=주석 층, 조립 부품 아님 → projection 제외". 구현은
`tools/retrieve.py`만(ontology_lib·개체 무변경):
- `ANNOTATION_LAYER_CLASSES = {HO.Anchor}` 상수 + `annotation_layer_nodes(g)` 헬퍼
  (집합으로 두어 다음 주석 층 클래스는 1줄 추가).
- 차단 지점 **2곳이면 완결**: ① `select_seeds` 후보 skip(seed 오염 차단),
  ② `build_adjacency` 엣지 skip(rollup 확산 차단). heap 유입 경로가 seeds+adjacency뿐이라
  admit 불가능이 따라온다.
- **edges 섹션은 별도 코드 불요**: 팩 edges는 양 끝점 in_scope 요구 → anchor가 admit
  안 되면 hasAnchor/anchorTarget 엣지는 자동 소멸(dangling 표기 없음, 실측 "anchor"
  substring 0/80 팩).
- 게이트: 40질의×{md,json} **80/80 byte-identical** vs pre-anchor baseline(원본 코드+
  anchor 트리플 역적용, in-process 35 triples 제거). 수정 코드는 anchor 없는 그래프에서
  no-op(제외집합 공집합)임도 실측. baseline은 git HEAD 아닌 **워킹트리 역적용**(병행
  세션 커밋 오염 회피 — 기존 규칙 재확인).
