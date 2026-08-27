# 그래프 산문의 ontology vs knowledge graph 용어

승인 피드백 `docs/feedback/verified/terminology-ontology-vs-knowledge-graph.md` 적용(층3).
저작 시 **정의문·산문에서 지칭 대상을 구분**한다 — 이미 IRI가 3분할돼 있으므로 새 구분이
아니라 그 구조의 이름이다:

- `…/schema` = **ontology** 층 (TBox + shapes, `ontology/tbox/`·`ontology/shapes/`).
- `…/data/**` + `…/id/**` = **knowledge graph** 층 (ABox individuals, `ontology/abox/`).
- 디렉토리 `ontology/`는 **두 층을 함께 담는 저장소 경로** — 경로 표기(`ontology/**`,
  `ontology/abox`)는 그대로 두고 rename 하지 않는다(불채택 결정: 경로참조 87파일/코드 31건 +
  외부 federation catalog 파급).

## 저작 규칙 (재사용)

1. **부품·개체를 가리킬 때 "ontology parts/nodes"라 쓰지 않는다** → "the knowledge graph's
   typed parts (individuals the ontology describes)" / "the assigned knowledge-graph nodes".
   "ontology"는 타입·제약을 주는 쪽에만 쓴다("parts the ontology types").
2. **불변 상수 3종** — 손대면 오히려 틀리거나 규칙 위반:
   - 헤더 보일러플레이트(`@prefix ho: …/schema#`, `a owl:Ontology`, `owl:imports`) — 파일당 4건,
     산문이 아니다.
   - `id:scheme` prefLabel `"Harness ontology vocabulary"` — SKOS concept scheme = 어휘 자체라 정확.
   - **node id·prefLabel 전부** (id 재사용 금지). 예: `id:pat-ontology-composition` /
     "Ontology-driven composition"은 유지하고 **`skos:definition`만 정밀화**한다 — rename하면
     신규 id 발급 + deprecated/derivedFrom 처리가 따라붙는다.
3. 값은 영어(§1d). 이런 편집은 SHACL 형태·reachability와 무관해 `validate.py` 리스크 없음
   (PASS 확인만). 단 **definition은 materialize가 emit**하므로(workflow/pattern/role 렌더러)
   산출물은 byte-different — 정의 수정은 byte-id 편집이 아니다.

## 동일 문구 잔여 정합 (완료)

후속 dispatch에서 아래 4건까지 같은 방향으로 맞춰 두 파일의 표현이 일치한다:
- `abox/core/observational/observation.ttl` — `id:os-developer`, `id:aoi-developer`,
  `id:oa-developer-external`: "the assigned ontology nodes" → "the assigned knowledge-graph nodes".
- `abox/core/organization/roles.ttl` — `id:role-implementer`: "an authored ontology individual"
  → "an authored knowledge-graph individual **the ontology types**" (개체=KG / 타입주는쪽=ontology를
  한 구절에 함께 드러내는 관용구; 규칙1의 "parts the ontology types"와 같은 형태).

## 운영 문서(golden rule) 잔여 — 승인 후 적용 완료

`docs/feedback/terminology-residuals.md`(승인 a) 적용: 적재를 막는 대상은 **데이터**이므로
- `CLAUDE.md` golden rule 1 "the whole **ontology**" → "the whole **stored graph**"
  (표현은 `observation.ttl:204`가 이미 쓰던 "stored graph"에 맞춤 — 새 용어 발명 아님),
- 같은 rule 3 "fix the **ontology**" → "fix the **nodes you changed**"(실제 고치는 대상=ABox),
- `ONTOLOGYSTYLE.md §1c` 한국어 쌍둥이 → "저장된 그래프 전체(stored graph = `ontology/**`의 두 층)".
운영 규칙 문면(전체 적재 금지 · retrieve pack 시작 · shapes 약화 금지)은 **불변**, 지칭 명사만 정밀화.

후속 dispatch에서 **잔여 2건도 적용 완료** → golden rule 쌍둥이 문구가 문서 4개에서 일치:
`CONTRIBUTING.md:48` "Never load the whole **stored graph** to make a change",
`docs/composition-methodology.md:94` "never load the whole **stored graph** (`CLAUDE.md` golden
rule 1…)". 두 파일 재grep 시 `whole|entire ontology`류 잔여 0 — **문구 감사 방법**은
`grep -rn "whole ontology\|whole stored graph\|entire ontology" <docs>` 한 줄이면 충분하고,
소스 파일(TTL) 무변경이므로 `validate.py`는 무관(확인용 1회만 돌린다).

**정당해서 남긴 것**(다시 고치지 말 것): `observation.ttl:164` `ho:observedFileScope`의
`ontology/abox` = 저장소 **경로 표기**, `:204`의 `ontology/**` = 두 층을 담는 디렉토리(이미
"both the schema and the knowledge graph"로 층을 구분해 서술). 두 파일 grep 결과 산문 잔여 0.
