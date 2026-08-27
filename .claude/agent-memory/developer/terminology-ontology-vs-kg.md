# terminology — "ontology" vs "knowledge graph" (확정 규약)

승인 항목 `docs/feedback/verified/terminology-ontology-vs-knowledge-graph.md`의 문서층 적용으로
**확정**된 용어 규약. 이후 모든 산문(README/CLAUDE/DESIGN/`docs/**`)과 그래프 텍스트
(`skos:definition` 등) 저작에 적용된다.

## 규약

- **harness ontology = 스키마 층** — OWL 클래스/프로퍼티 + SHACL shapes.
  `ontology/tbox/`·`ontology/shapes/`, IRI `https://harness-ontology.dev/schema`.
- **harness knowledge graph = 인스턴스 층** — `ontology/abox/`,
  data graph `…/data/<domain>/<type>`, 개체 `…/id/<domain>/<slug>`.
- 판별 문장: **ontology는 제약하고(constrains), knowledge graph는 자란다(grows).**
  "그래프가 커졌다"=KG 진술, "클래스를 추가했다"=ontology 진술.
  ⇒ "the ontology grows large" 류 표현은 **오용**이다(커지는 것은 데이터).
- `ontology/` 경로 표기는 **두 층을 함께 담는 저장소 디렉토리**를 뜻하며 제3의 층이 아니다.

## 결정: 경로 rename 불채택 (재발 방지)

`ontology/` → `kg/`·`data/` 류 rename은 **검토 후 기각**. 근거(실측): 경로 문자열 참조 87 파일
(코드·catalog·Makefile·compose가 31건) + 외부 federation repo가 중앙 IRI(`…/schema`,
`…/data/core`)를 자기 catalog로 매핑하므로 repo 밖까지 파급. 구분은 이미 `/schema`·`/data`·`/id`
**IRI 3분할**이 담고 있어 rename의 추가 이득이 없다. 같은 제안이 다시 올라오면 이 결정을 가리킨다
(정본: `docs/DESIGN.md` §Terminology).

## 저작 시 주의

- 정의문은 **구조를 인용**한다 — "이미 있는 3분할에 이름을 붙인 것"임이 드러나야 규약이 재해석에
  흔들리지 않는다(구두 약속처럼 쓰지 않는다).
- **`skos:prefLabel`·node id는 이 규약으로 바꾸지 않는다** — id 재사용 금지 + 중복 라벨 drift 검사
  때문. 예: `id:scheme` "Harness ontology vocabulary"는 실제로 어휘를 가리켜 **정확**하므로 유지,
  `id:pat-ontology-composition`은 id·라벨 유지하고 `skos:definition`만 정밀화한다.
- ABox 산문에서 "ontology parts"(=개체를 지칭)는 오용 → "the graph's typed parts (described by the
  ontology)" 방향으로 고친다.
- 역할 메모리(각 역할 소유)는 **일괄 편집 대상이 아니다** — 각자 자기 사이클에 갱신.
