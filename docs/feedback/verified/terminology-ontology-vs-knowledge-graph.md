---
source: terminology-ontology-vs-knowledge-graph.md
verdict: apply-with-changes
targets: []
---
# 검증 보고 — "ontology" vs "knowledge graph" 용어 정립

> 접수 경로 참고: peer 세션은 `status: open`으로 알려 왔으나 **파일은 이미 `approved`**다
> (사용자 태깅 완료). 따라서 이 보고서가 rename되는 즉시 orchestrator 적용 대상이 된다.

**핵심 판정 한 줄**: 제안은 타당하나 **구분을 새로 만드는 일이 아니다** — `/schema` ·
`/data/**` · `/id/**` 3분할로 **이미 물리적으로 존재**하고, 없는 것은 그 분할에 붙일 **이름과
선언**뿐이다. 그래서 적용은 **정의·문서 층에 국한**되고 경로 rename은 불필요하다(비용 실측 아래).

## 파급효과 (impact)

### 층 1 — 문서 (혼용의 실태)

| 위치 | 지칭 대상 | 판정 |
|---|---|---|
| `CLAUDE.md`:3 "stores **agent/LLM harnesses** as a formal OWL ontology" | 저장되는 것은 harness **인스턴스**(=KG) | (b)를 (a)의 이름으로 부름 — 혼용의 진원 |
| `README.md`:3-4 "Manage … as a formal ontology, so an agent can read the **stored knowledge**" | 같은 문장에 두 산출물이 함께 있는데 이름은 하나 | KG 개념은 이미 "stored knowledge"로 존재하나 **명명되지 않음** |
| `docs/DESIGN.md`:1,7 "harness ontology", "Formal ontology (OWL) gives connectivity…" | :7은 스키마(a), :1·:29·:74·:79의 "ontology grows large"는 **데이터 증가**(b) | 한 문서 안에서 (a)↔(b) 교대 |
| `ONTOLOGYSTYLE.md` 9건 | 대부분 **경로**(`ontology/` 저작 규약) = (c) | 저작자 문서라 혼동 낮음 |

- **이미 있는 자산**: `ONTOLOGYSTYLE.md`:20·52·55·210·215, `CLAUDE.md`:36·63·88이 **TBox/ABox를
  정식 용어로 사용**한다. 즉 저작자 층에는 구분이 살아 있고, **독자 층(서두 3문장)에만 없다.**

### 층 2 — 경로·이름 (rename 비용 실측)

- `ontology/` **경로 문자열 참조 = 87 파일**(agent-memory 제외), 그중 코드·카탈로그·Makefile·
  compose가 **31건**.
- `catalog-v001.xml`은 **IRI→로컬 파일 매핑**이고, 그 주석이 명시하듯 **외부 federation repo가
  중앙 IRI(`.../schema`, `.../data/core`)를 자기 catalog로 매핑**한다 — 디렉토리 rename은
  이 repo 밖으로 파급된다.
- 반면 **논리 IRI는 이미 3분할**돼 있다:
  - `https://harness-ontology.dev/schema` — TBox(+`ho:` 어휘). `ontology/tbox/harness.ttl`:20.
  - `https://harness-ontology.dev/data/<domain>/<type>` — ABox 데이터 그래프 **19개**
    (`ontology/harness-ontology.ttl`의 `owl:imports` 목록).
  - `https://harness-ontology.dev/id/<domain>/<slug>` — 개체 IRI(`ONTOLOGYSTYLE.md`:114).
- ⇒ **rename 불필요·불권고**. 얻는 것(디렉토리 이름의 직관)이 잃는 것(31건 코드·카탈로그 +
  외부 repo catalog 동기 + repo명/IRI 도메인과의 불일치)보다 작다. 이름이 필요하면
  **정의로 붙인다**: "`ontology/`는 두 층을 함께 담는 저장소 디렉토리다."

### 층 3 — 그래프 데이터 (projection + grep 실측)

`tools/retrieve.py "ontology knowledge graph terminology schema versus instance data"` pack
(44 노드, 894/900 토큰)과 grep 대조 결과:

- ABox 파일 대부분의 "ontology" 출현은 **헤더 보일러플레이트**(`@prefix ho: …/schema#`,
  `a owl:Ontology`, `owl:imports`)로 **산문이 아니다** — 파일당 4건이 그 상수다.
- **산문 혼용은 6곳**뿐:
  1. `abox/core/vocab/concepts.ttl`:110 — "reusable **ontology** parts"(= ABox 개체)
  2. `abox/core/vocab/concepts.ttl`:210 — `id:scheme` prefLabel "Harness ontology vocabulary"
     → **정당**(SKOS concept scheme = 어휘 자체)
  3. `abox/core/process/workflows.ttl`:37 — "the **ontology's** reusable, typed parts"
  4. `abox/core/spec/patterns.ttl`:31-32 — `id:pat-ontology-composition` "Ontology-driven
     composition" (**node id** 포함)
  5. `abox/core/observational/observation.ttl`:164 — "the assigned **ontology/abox** nodes"
     → 경로 표기라 모호하지 않음
  6. `abox/core/observational/observation.ttl`:204 / `roles.ttl`:318 — "the whole design graph
     (`ontology/**`…)", "the assigned **ontology** nodes"

### 층 4 — 메모리

`.claude/agent-memory/inspection/` 10개 이상이 "ontology"를 저장소 전체로 쓴다(예:
`central-ontology-land-attribution.md`, `federation-physical-split.md`). **역할 메모리는 각
역할 소유**라 일괄 편집 대상이 아니다 — 규약이 확정되면 각 역할이 자기 사이클에 갱신한다.

## 정합성

- `tools/validate.py` **PASS**(현행 기준선, 전 항목 ✓). 이 항목의 편집은 **문서 산문 +
  `skos:definition` 텍스트**라 SHACL 형태 제약·reachability와 무관하다 — 통과 가능성 위험 없음.
- **`prefLabel` 변경은 drift 검사 축**(중복 prefLabel·근사 동의어 — `ONTOLOGYSTYLE.md` §통제
  어휘)이다. 위 3-2(`id:scheme`)는 **바꾸지 않는다** — 그 라벨은 실제로 어휘를 가리켜 정확하다.
- **node id 재사용 금지**와 충돌: 3-4의 `id:pat-ontology-composition` rename은 신규 id 발급 +
  `deprecated`/`derivedFrom` 처리를 요구한다. 패턴의 의미("온톨로지가 타입 지은 부품으로
  조립")는 새 정의문으로 정확해지므로 **id·prefLabel 유지, `skos:definition`만 정밀화**한다.
- **TBox 무변경** — 이 항목은 어휘 **정의**이지 스키마 확장이 아니다(`[지킴]` 새 `ho:` 클래스
  발명 금지에 걸리지 않는다).

## 적용 계획 (orchestrator 실행용)

1. **`CLAUDE.md`:3-5 교체** — 이중 산출물을 첫 문장에 명시. 제안 문면:
   > This project builds two things from one repository: a **harness ontology** — the OWL
   > schema and SHACL shapes that describe what an agent/LLM harness is made of
   > (`ontology/tbox/`, `ontology/shapes/`, IRI `…/schema`) — and a **harness knowledge
   > graph** — the instances described with it (`ontology/abox/`, data graphs `…/data/**`,
   > individuals `…/id/**`). It projects request-scoped **context packs** from the knowledge
   > graph so an agent can compose new harnesses without orphaned nodes, drift, or context rot.
2. **`README.md`:3-6** 같은 두 이름을 넣고, :4의 "stored knowledge"를 "the knowledge graph"로.
   :74 "Growing the ontology" 절 제목은 **"Growing the knowledge graph"**로(그 절이 다루는
   것은 `abox/` 추가다 — :76에서 확인).
3. **`docs/DESIGN.md`에 §용어 4줄 신설**(문서 최상단 또는 §core tension 직전). 근거로
   **네임스페이스 3분할을 인용**한다 — 정의가 구두 약속이 아니라 이미 있는 구조의 이름임을
   보이는 것이 이 항목의 핵심이다. 본문의 "ontology grows large"류(:29·:74·:79)는
   **"knowledge graph grows"**로 교정(스키마가 아니라 데이터가 커진다).
4. **`ONTOLOGYSTYLE.md`에 한 줄 연결** — 이미 쓰는 TBox/ABox 용어에 "ABox = knowledge graph
   층, TBox+shapes = ontology 층"을 붙인다. 그 문서의 나머지 "ontology/" 경로 표기는 유지.
5. **그래프 산문 4곳만 정밀화**(developer dispatch): concepts.ttl:110, workflows.ttl:37,
   patterns.ttl:32(정의문만), observation.ttl:204/roles.ttl:318. **id·prefLabel·scheme 라벨은
   불변.** 문면 방향 = "ontology parts" → "the graph's typed parts (described by the ontology)".
6. **경로 rename 불채택**을 결정으로 기록한다(위 비용). 대신 1~3의 정의에 "`ontology/`는 두
   층을 함께 담는 디렉토리"라는 한 줄을 둔다 — 다음 세션이 같은 제안을 다시 꺼내지 않도록.
7. **메모리 층은 위임** — 각 역할이 자기 사이클에 갱신(일괄 편집은 소유 경계 위반).
8. `python3 tools/validate.py` 재실행(PASS 유지 확인) + 5번 편집 후 `retrieve.py`로 해당
   노드 정의가 pack에 정상 반영되는지 1회 확인.

## 판정

**apply-with-changes** — 항목의 4개 층 조사 범위는 그대로 유효하고, 결론에서 셋을 고친다:

1. **프레이밍 교정**: "구분을 도입한다"가 아니라 **"이미 있는 3분할(`/schema`·`/data`·`/id`)에
   이름을 붙인다"**. 정의문이 그 구조를 인용해야 규약이 재해석에 흔들리지 않는다.
2. **층 2 rename 불채택** — 실측 비용(경로 참조 87 파일/코드·카탈로그 31건, 외부 federation
   repo의 catalog까지 파급) 대비 이득이 작다. 결정으로 못박아 재발을 막는다.
3. **층 3 범위 축소** — 6곳 중 4곳만. `id:scheme` prefLabel은 정확하므로 유지, node id
   `pat-ontology-composition`은 id 재사용 금지 규칙상 정의문만 정밀화.

층 4는 규약 확정 후 각 역할 위임이라 이 적용 단위에 포함하지 않는다.

## 적용 결과 (orchestrator 기록란 — 적용 후 채움)

- **적용 완료 2026-08-27**, orchestrator 세션 harness-ontology-2f. developer dispatch 3회
  (문서층 / 그래프층 / 동일 문구 잔여 정합) + vnv 판정 1회.
- **vnv 판정: pass-with-notes** — `docs/verify/terminology-apply-verify.md`. 핵심 증거:
  `validate.py` PASS + `lint_uniformity.py` PASS(판정 시점), HEAD worktree 격리 비교로
  **델타 = 9노드의 `skos:definition`/`ho:observedFileScope` 리터럴뿐**(id·prefLabel 델타 0,
  TBox·shapes 무변경), retrieve 4쿼리에서 discoverability 퇴행 0 + 새 어휘 쿼리가 편집
  노드로 정확히 seed, build projection 파급은 의도한 문장뿐.
- 계획 항목별: **1·2·3·4·6 적용**(CLAUDE.md 서두, README 서두·§Growing the knowledge graph,
  DESIGN §Terminology 신설 + rename 불채택 결정 기록, ONTOLOGYSTYLE 한 줄). **5 적용** —
  계획의 4곳에 더해 같은 문장을 공유하는 공지시 클러스터 4곳을 포함해 9노드(vnv가 정당
  판정; 원 보고서 층3 "6곳"은 과소집계로 실제 9곳이었음). **7 위임 유지**(developer·vnv는
  자기 역할 메모리 갱신 완료). **8 수행**.
- **잔여(비차단, 별도 결정 요청)**: `docs/feedback/terminology-residuals.md` 참조 —
  Golden rule 1 문구 쌍(CLAUDE.md·ONTOLOGYSTYLE), DESIGN 제목(유지 권고),
  `id:wf-compose-harness` tokenEstimate 재산정, "87 files" 인용치.
- **주의**: 판정 완료 직후(22:30) **동시 세션**이 `id:gr-online-execution`을 신설·role 연결해
  일시적으로 validate가 그 노드의 orphan 위반으로 FAIL했으나(본 적용 단위와 무관 — 위
  델타 증명 + 판정 시점 PASS), 해당 세션이 배선을 마쳐 **최종 재확인 시 PASS 복귀**.
