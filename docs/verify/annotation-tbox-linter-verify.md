# annotation backbone 적용 ①·②(+부속) 검증 — vnv 판정

**Verdict: PASS-with-NOTES.** 승인 항목 `docs/feedback/verified/annotation-backbone-architecture.md`의
적용 단계 **① TBox 술어 3종**, **② 린터 annotation cap(사용자 결정판: cap 260 token /
metric chars/4 / 목표 대역 130–260)**, **부속(초과 노드 압축: `id:mode-standing-service`)** 의
수용 게이트를 전수 실측했다. **① G1~G5 · ② G1~G5(치환판) · 부속 3항 모두 충족.**
negative control(성공 케이스만 보지 않기)은 **7종을 주입해 전부 의도대로 FAIL**했고, positive
control 3종은 PASS했다. 게이트를 흔들지 않는 **관찰 6건(§5)** 을 남긴다 — 그중 (N1)
`lint_uniformity.PREFIX_MAP`에 `Anchor` 미등록(§2 표의 유일한 enforcement 미러 누락)과
(N2) `alternativeOf` 공유영역 shape가 `ho:tagged`만 읽어 **anchor로만 선언된 공유영역은
FAIL**하는 결합은 단계 ③ 착지 전에 판단이 필요하다.

판정자는 온톨로지·도구·문서를 **수정하지 않았다**(이 리포트 + vnv 역할 메모리만 작성).

---

## 0. 재현 환경 (실행한 명령 그대로)

- repo root `/home/cpark/git/harness_ontology`, 판정 시점 워킹트리(uncommitted), HEAD `c7bd7e8`.
- 셸 기본 python3에도 rdflib가 있으나 규약대로 **`/usr/bin/python3`** 로 전부 실행
  (`rdflib 7.6.0` · `pyshacl 0.40.0` · `owlrl 7.6.2`).
- 워킹트리 게이트 3종:
  ```
  /usr/bin/python3 tools/validate.py
  /usr/bin/python3 tools/check_determinism.py
  /usr/bin/python3 tools/lint_uniformity.py
  ```
- control 주입은 **스크래치 복제본에서만** 수행(원본 워킹트리 무변경):
  ```
  rsync -a --exclude .git <repo>/ $SP/nc/            # 주입용 복제
  cat $SP/cases/<case>.ttl >> $SP/nc/ontology/abox/core/behavioral/guardrails.ttl
  /usr/bin/python3 $SP/nc/tools/validate.py          # 또는 lint_uniformity.py
  ```
  (`guardrails.ttl`은 catalog에 매핑된 core 데이터 유닛이라 append만으로 union에 들어간다.)
- 무회귀 비교용 트리 3개:
  `head/`(= `git archive HEAD | tar -x`), `cur/`(현 워킹트리 복제),
  `no1/`(= `cur` − ①만 되돌림; `strip_stage1.py`로 Anchor 클래스·술어 5종·9번 chain
  axiom·AnchorShape·AlternativeOfSharedAnchorShape·sh:declare 헤더·`INSTANCE_CLASSES`
  1행 제거).

**워킹트리 3종 게이트 결과 (①·②가 함께 들어간 현 상태)**

| 게이트 | 결과 | 실측 |
|---|---|---|
| `validate.py` | **PASS** | union 6994 triples(post-reasoning), 262 individuals 전부 harness에서 도달, SHACL conforms, capability 충족, registryDrift 초록 |
| `check_determinism.py` | **PASS** | 요청별 4회 실행 · 프로세스 간 byte-identical pack |
| `lint_uniformity.py` | **PASS** | 6검사 0 위반 (신규 `text cap (§1c)` 포함) |

---

## 1. 단계 ① — TBox 술어 3종 (브리프 §6 G1~G5)

### G1. validate PASS (reasoning·SHACL·reachability·registryDrift) — **충족**
- 워킹트리 `validate.py` **PASS**(위 표). registry 줄:
  `✓ all 28 instantiated in-scope class(es) are registered` +
  `⚠ 4 registered but not instantiated (harmless): Anchor, Candidate, Example, HarnessComponent`
  → `Anchor` 등록 확인, 인스턴스 0은 브리프 §3c가 명시한 전례대로 무해.
- **Anchor를 실제로 인스턴스화해도 초록**임을 실측(positive control C):
  `id:anchor-lang-communication`(target `id:c-communication`, confidence 0.8)을
  `id:gr-lang`에 매달자 `validate.py` **PASS**, registry 줄이
  `✓ all 29 instantiated in-scope class(es) are registered`로 바뀌며 Anchor가 목록에서 빠진다.
- **chain axiom이 실제로 발화**한다(선언만 있고 안 도는 축이 아님): 추론 후
  `hasComponent o hasAnchor`로 그 Anchor를 `hasComponent`하는 subject가 **7개**이고
  **7개 전부 `ho:Harness` 타입**(h-coding/h-harness-factory/h-multiagent/h-peer-mesh/
  h-research/h-support/h-workspace-synthesis) — 브리프가 경고한 "subject 오타이핑"이
  발생하지 않음을 확인.

### G2. determinism · lint PASS — **충족**
- 워킹트리 두 도구 모두 PASS(위 표).
- 추가로 **alternativeOf 쌍이 살아 있는 그래프에서도** determinism이 유지되는지 확인:
  스크래치에 `id:mode-sub-agents ho:alternativeOf id:mode-hybrid`를 주입하고
  `check_determinism.py` → **PASS**(4회/프로세스 간 동일). 대칭 추론이 pack을
  비결정적으로 만들지 않는다.

### G3. §4 불변식 negative control — **충족 (가드가 살아 있음)**
| control | 주입 | 기대 | 실측 |
|---|---|---|---|
| A (negative) | `gr-verify-proceed alternativeOf gr-lang` (공유 `ho:tagged` 없음) | FAIL | **FAIL** — `Constraint Violation … Source Shape: ho:AlternativeOfSharedAnchorShape` **2건**(대칭 추론으로 양쪽 끝에서 각각 보고), 메시지가 상대 노드 IRI를 그대로 지목 |
| B (positive) | `mode-sub-agents alternativeOf mode-hybrid` (둘 다 `c-execution-mode` 태그) | PASS | **PASS** — 오탐 없음 |

- 가드는 `advanced=True/False` **양쪽 모두에서 발화**함을 확인(pyshacl 7.6/rdflib 7.6 조합에서
  SPARQL constraint가 advanced 플래그에 의존하지 않음) → "advanced 꺼지면 죽는 가드" 리스크 없음.
  pyshacl 호출부는 `tools/validate.py:45-51` 단 한 곳(`advanced=True`).

### G4. 문서 2곳 ↔ TBox 1:1 — **충족**
| 문서 | 실제 TBox | 판정 |
|---|---|---|
| `ONTOLOGYSTYLE.md §2` 표 `Anchor \| anchor- \| id:anchor-…` | `ho:Anchor a owl:Class ; rdfs:subClassOf ho:HarnessComponent` | 일치 |
| `§3` item 5 `… ho:specializes / ho:derivedFrom → ho:alternativeOf / ho:overlapsWith → ho:hasAnchor` | `ho:alternativeOf`·`ho:overlapsWith`(둘 다 `owl:SymmetricProperty`)·`ho:hasAnchor`(range `ho:Anchor`, domain 없음) 존재 | 일치 |
| — | `ho:anchorTarget`(domain Anchor·range Concept)·`ho:anchorConfidence`(range xsd:decimal) | §3에 **자리 미기재**(§5 N4) |
- 문서·TBox·shapes·registry가 **같은 미커밋 변경 집합**에 함께 있다(커밋 단위 확인은 inspection 소관).
- 브리프 §3a/§3b가 요구한 정의문 필수 요소도 확인: (a) projection의 region당 1개 선별 소비
  규약, (b) "연결되지 않은 근사중복은 여전히 드리프트"라는 경계, (c) alternativeOf ↔ overlapsWith
  구분, (d) `ho:Anchor` 정의문의 "consumed by the projection layer's per-region selection …
  DECLARED BUT DORMANT BY DESIGN" 휴면 명시 — **모두 포함**.

### G5. materialize 무회귀 (byte-identical) — **충족 (요구보다 강한 형태로)**
- `cur`(①·②·병행 wave 포함) vs `no1`(= cur − ①) 에서 harness 7개를 각각 materialize:
  ```
  /usr/bin/python3 $SP/<tree>/tools/materialize.py <harness> --out $SP/build-<tree>/<harness>
  diff -r $SP/build-cur $SP/build-no1
  ```
  → **47개 파일 전부 byte-identical, `harness.lock.json`까지 포함해 diff 0.**
  즉 ①은 **materialisation-inert**(사용 0의 신규 어휘가 산출물을 건드리지 않음)임이 격리 증명됐다.
- 참고로 `head` vs `cur` 는 7개 하네스 모두 CLAUDE.md/MANIFEST.json이 다르지만, 그 delta는
  전부 **병행 wave 소관**(`id:gr-lang` promptText 문구 추가, 신규 `id:gr-standard-terms`
  바인딩, `mode-standing-service` 압축)이며 ①·②에서 비롯된 줄은 없다.

### 추가 실측 — SymmetricProperty materialize 델타 +2N
`ontology_lib.load_graph(reason=False/True)` 직접 비교:

| 주입 | raw triples | reasoned triples | `alternativeOf` raw / reasoned |
|---|---|---|---|
| 없음(현 워킹트리) | 2941 | 6994 | 0 / 0 |
| 2쌍(N=2) | 2943 (+2) | **6998 (+4 = +2N)** | 2 / **4**(역방향 2개 materialize) |

`instance_nodes`는 reason 유무와 무관하게 262로 동일(`ontology_lib` 주석의 불변식 유지).
repo 최초의 `owl:SymmetricProperty`가 `prp-symp`로 정확히 역edge만 추가함을 확인.

### 추가 실측 — AnchorShape negative control 3종
| control | 주입 | 실측 |
|---|---|---|
| D | `anchorConfidence 1.5` | **FAIL** — `MaxInclusiveConstraintComponent` |
| E | `anchorTarget` 2개 | **FAIL** — `MaxCountConstraintComponent` |
| F | `hasAnchor`로 매달지 않은 Anchor | **FAIL** — `MinCountConstraintComponent`(ComponentConnectivityShape의 inverse-hasComponent) |

---

## 2. 단계 ② — 린터 annotation cap (치환판: cap 260 token, chars/4)

### G1. 현 그래프 위반 0 — **충족 (린터와 독립 재측정)**
린터를 신뢰하지 않고 rdflib로 직접 `promptText + definition` 전 값 문자수 합 ÷ 4를 전수 측정:

```
abox individuals total          = 262
  with promptText/definition    = 251
  over 260 tokens (chars//4)    = 0        <- 위반 0
  in 130..260 target band       = 31
  under the advisory 130 floor  = 220
```
상위 노드(측정 token / 선언 tokenEstimate):
`mode-standing-service 252 / 252` · `h-workspace-synthesis 245 / –` ·
`role-benchmarker 238 / –` · `mode-agent-teams 228 / 190` · `pat-blackboard 222 / 200`.
**최대 252 ≤ 260** — 압축 완료 후 전수 재실측 기준으로 상한 위반 0(여유 8 token, §5 N5).

### G2. negative control + 경계 260/261 — **충족**
`id:gr-verify-proceed`에 정확한 길이의 padding literal을 붙여 총 문자수를 제어:

| 주입 | 실측 | 린터 |
|---|---|---|
| 1043 chars → **260 token** | 경계 상한 | **PASS** (exit 0, `✓ … within 260 tokens`) |
| 1044 chars → **261 token** | 경계 +1 | **FAIL** (exit 1, `✗ 1 node(s) over the 260-token text cap (§1c)`) |

경계가 정확히 260=PASS / 261=FAIL이고, 여러 `promptText` 값의 **합산**과 **exit code 합류**가
함께 확인된다(기존 검사와 동일 포맷: 노드 IRI + 실측값 + 한도).

### G3. validate·determinism 무회귀 — **충족**
린터는 read-only이며 워킹트리 두 도구 모두 PASS(§0 표). `.github/workflows/validate.yml`이
이미 `validate.py`(22행)·`check_determinism.py`(25행)·`lint_uniformity.py`(29행)를 실행하므로
**workflow 수정 없이 신규 검사가 CI 게이트에 자동 편입**된다(브리프 §4.3 충족).

### G4. §1c 조항 ↔ 구현 동반 — **충족**
`ONTOLOGYSTYLE.md §1c`(83–94행)의 새 [지킴] 조항과 `tools/lint_uniformity.py`의
`TEXT_CAP_TOKENS = 260` / `_text_tokens()` / `check_text_cap()`이 **같은 미커밋 변경 집합**에
있다. 조항이 인용한 근거도 원문 대조로 확인:
`docs/feedback/inquiries/annotation-tooling-research.md` 30·154행이 "검색 정밀도 최적대는
100–200 word(≈130–260 BPE token)"를 실제로 서술한다(인용 정확).
scope 제외 조항(TBox 스키마 문서)도 docstring(51–65행)과 §1c 양쪽에 명시.

### G5. metric이 §1c tokenEstimate 관례와 일치 — **충족(단, 코퍼스는 균일하지 않음)**
선언된 `ho:tokenEstimate`가 있는 텍스트 노드 132개에서:

| 비교 | median 비율 | 사분위 |
|---|---|---|
| `est / (chars/4)` | **0.90** | 0.66 / 0.90 / 1.00 |
| `est / wc -w` | 1.43 | 1.03 / 1.43 / 1.70 |

→ 코퍼스 실측상 선언값은 **chars/4에 훨씬 가깝다**(word count 대비 median 1.43 = 계통 편차).
따라서 §1c가 "tokenEstimate와 같은 chars/4"라고 단위를 통일한 진술은 코퍼스 근거와 일치한다.
다만 `tools/import_corpus.py:71-72`는 여전히 `wc -w`로 값을 민팅한다(§5 N3).

### scope 제외의 실효 확인
TBox 정의문 상위: `ho:hasComponent` **1022 token** · `ho:AreaOfObservation` 439 ·
`ho:Anchor` 439 · `ho:alternativeOf` 406. TBox에서 260 초과가 **10건**이지만 abox 개체가
아니어서 검사에 잡히지 않는다 — 브리프 §2가 지정한 "즉시 오탐" 회피가 실제로 작동.

---

## 3. 부속 — `id:mode-standing-service` 압축

### 3a. 크기·형식 — **충족**
`ontology/abox/core/spec/patterns.ttl` HEAD ↔ 워킹트리 노드 전 속성 대조:

| 속성 | HEAD | 현재 | 판정 |
|---|---|---|---|
| `skos:definition` | 1130 chars = **282 token** | 1011 chars = **252 token** | 압축(−30 token), **260 이하** |
| `ho:tokenEstimate` | 270 | **252** | 실측과 일치하게 갱신(선언-실측 괴리 해소) |
| `rdf:type` / `skos:prefLabel` / `skos:altLabel` ×2 / `ho:tagged` / `ho:maturity` | — | — | **전부 불변** |
| 들어오는 edge | `h-multiagent ho:hasExecutionMode` 1개 | 동일 | **불변** |

### 3b. 의미 보존 — **충족 (원문 word-level diff로 대조)**
`difflib` word-level opcode 결과, 변경은 아래 **8곳뿐**이고 삭제된 명제는 없다:

| # | 삭제/치환 | 판정 |
|---|---|---|
| 1 | `arrive rather than being stood up for a run and torn down with it:` → `arrive:` | 같은 명제가 뒤 대비절(`agent-teams … are torn down with it, whereas a standing agent persists past the run`)에 남음 — **중복 제거** |
| 2 | `that item` → `it` / `end of it,` → `end,` / `and` → `which` / `that` 삭제 | 군더더기, 지시 대상 유지 |
| 3 | `must carry` → `carry` | 선행 `must be addressable … and carry`로 조동사가 그대로 분배 — 의미 동일 |
| 4 | `it and serves a stream of requests.` → `the run.` | `serving requests as they arrive`(서두)와 **중복** — 제거 |
| 5 | `-- that team is` → `and are`, `the run,` → `it,` | 문형 축약, 명제 동일 |

원문 6개 명제(열린 세션 · durable channel 소비 규약 · Choose when · sub-agents 대비 ·
agent-teams 대비 · hybrid 구분)와 대문자 강조(OPEN BEYOND/ONE/PHASE), `id:` 교차참조,
형제 노드 공유 관용구(`briefed completely up front`)는 **전부 보존**. 정보 손실 없음.

### 3c. 소비 측 무회귀 — **충족**
```
/usr/bin/python3 tools/retrieve.py "standing service online agent that serves requests across sessions" --format json
  -> budget_used 899 / 900, nodes 26, mode-standing-service 포함 True
/usr/bin/python3 tools/retrieve.py "multi-agent harness that spawns short-lived sub-agents" --format json
  -> budget_used 899, nodes 43, candidates 4, gaps 0
```
압축 후에도 해당 노드는 검색되고 pack 예산이 절단되지 않는다.

---

## 4. 판정 요약

| 항목 | 게이트 | 판정 |
|---|---|---|
| ① TBox 술어 3종 | G1 validate / G2 determinism·lint / G3 negative control / G4 문서 1:1 / G5 materialize 무회귀 | **5/5 충족** |
| ② 린터 cap(260·chars/4) | G1 위반 0 / G2 negative control·경계 / G3 무회귀 / G4 조항 동반 / G5 metric 일치 | **5/5 충족** |
| 부속 압축 | 크기 260 이하 / 의미 보존 / 라벨·관계 불변 | **3/3 충족** |

주입한 negative control 7종(A·D·E·F·I·cap 261·정수 confidence)은 **전부 의도대로 FAIL**,
positive control 3종(B·C·cap 260)은 **전부 PASS** — 가드가 살아 있고 오탐이 없다.

---

## 5. 게이트 밖 관찰 (non-blocking, orchestrator 라우팅 판단용)

- **N1. `lint_uniformity.PREFIX_MAP`에 `Anchor` 미등록 (유일한 §2 미러 누락).**
  §2 표 33행을 `PREFIX_MAP`/`SINGLETON_NAMES`와 기계 대조한 결과, **매핑이 없는 행은
  `Anchor` 하나뿐**이다(`ConceptScheme`은 `INSTANCE_CLASSES` 밖이라 린터가 애초 순회하지
  않는 by-design 제외). `Anchor`는 `INSTANCE_CLASSES`에 등록돼 순회는 되지만 접두사 규칙이
  없어 `continue  # no naming rule for this type` 가지로 빠진다. 실증: 스크래치에 `id:zz-wrongly-named a ho:Anchor`(슬러그 규약 위반)를 주입해도
  `✓ every id: individual's slug matches its class naming prefix`로 **통과**한다.
  인스턴스 0이라 현재 무해하지만, 첫 Anchor가 저작되는 순간부터 §2가 기계적으로 강제되지
  않는다. 한 줄(`HO.Anchor: "anchor-",`) 추가로 닫힌다. (①의 파일 경계엔 이 파일이 없었고
  ②는 "순수 추가·기존 검사 무수정"이라 어느 브리프의 결함도 아니다 — 별도 후속.)
- **N2. `AlternativeOfSharedAnchorShape`가 `ho:tagged`만 읽는다 → anchor로만 표현된 공유
  영역은 FAIL.** 실증(control I): 두 노드에 같은 `ho:anchorTarget id:c-communication`을 단
  Anchor를 각각 매달고 `alternativeOf`로 이으면(공유 `ho:tagged` 없음) **FAIL**한다.
  브리프 §4가 `ho:tagged` 기준을 명시했으므로 **현 스펙 준수**지만, ①이 도입한 가중 anchor가
  "영역 선언" 수단이 되는 단계 ③에서는 shape가 anchor 경로를 인정하지 않아 저작을 막는다.
  ③ 착지 전에 (a) shape에 `hasAnchor/anchorTarget` 경로를 OR로 추가할지, (b) "alternative는
  반드시 crisp tag도 갖는다"를 규약으로 못박을지 결정 필요.
- **N3. `import_corpus.py`의 token 단위가 §1c와 다르다.** §1c는 이제 chars/4를 절의 단일
  단위로 선언했는데 `tools/import_corpus.py:71-72`(`wc_words`)는 `wc -w`로 `tokenEstimate`를
  민팅한다. 코퍼스 median 비율(§2 G5)상 신규 import 노드만 계통적으로 다른 단위를 갖게 된다.
  (②의 §6 비범위가 "declared vs 실측 괴리 검사"를 제외했으므로 판정에 반영하지 않음.)
- **N4. §3에 Anchor 자신의 술어 순서 자리가 없다.** `ho:hasAnchor`(피주석 노드 쪽)는
  item 5에 들어갔지만, Anchor 노드 블록 안의 `ho:anchorTarget` / `ho:anchorConfidence`
  위치는 §3 어디에도 없다(신규 [권장] "클래스 고유 판별 데이터 프레디킷" 문단이
  `anchorConfidence`를 간접 포섭할 뿐). 첫 Anchor 저작 시 저자마다 순서가 갈릴 소지.
- **N5. cap metric의 술어 사각지대 + 여유 폭.** 검사는 `promptText`+`definition`만 세므로
  클래스 고유 산문(`ho:recoveryStrategy`·`ho:failureCondition`·`ho:scenarioExpected` 등)은
  계측되지 않는다. 전 리터럴 기준으로 재면 260 초과가 **2건**(`fp-duplicate-claim` 270 등)
  생긴다. 또한 현 최대 노드는 252로 **상한까지 8 token**뿐이라, 그 노드의 정의문을 한 문장만
  늘려도 CI가 붉어진다(의도된 압력이지만 사전 인지 필요).
- **N6. 목표 대역 130–260의 하한은 코퍼스 대다수와 어긋난다.** 텍스트 보유 abox 노드 251개 중
  **220개(88%)가 130 token 미만**이고 대역 안은 31개다. 하한이 [지킴]이 아니라 권고이고
  린터가 상한만 강제하므로 게이트 영향은 없으나, §1c 문장("실질 서술 노드의 목표 대역")이
  실제 저장소 분포와 크게 다르다는 점은 기록해 둔다.
- **(보조 관찰)** `ho:anchorConfidence 1` 처럼 **정수 리터럴로 쓰면 FAIL**한다
  (`DatatypeConstraintComponent`, xsd:integer ≠ xsd:decimal). `1.0`/`0.0`으로 써야 한다.
  기존 `ho:salience` 값들은 모두 소수점 표기라 관례상 문제가 되진 않지만, 첫 Anchor 저작 시
  걸리기 쉬운 함정이므로 정의문·메시지에 한 마디 넣을 가치가 있다.

---

## 6. 판정 범위 밖 (같은 워킹트리의 병행 wave — 이 리포트가 판정하지 않음)

같은 워킹트리에 ①·② 외 변경이 함께 있다. 게이트 3종이 이 전체 상태에서 초록임은 확인했으나
**내용 판정은 하지 않았다**:
`ho:memoryWriteTiming` + MemoryShape 3-discriminator(별도 리포트
`docs/verify/memory-writetiming-verify.md` 소관) · 신규 `id:gr-standard-terms`와 5개 하네스
바인딩 · `id:gr-lang` promptText 문구 추가 · `id:chan-task-board` 참가자/정의 일반화 ·
`CLAUDE.md` 수정 · **`tools/retrieve.py`의 per-region 선별(= 승인 계획 단계 ③, 별도 리포트
`docs/verify/retrieve-alt-selection-verify.md` 소관)**.
③ 관련 보조 실측만 남긴다: alternativeOf 1쌍을 살린 스크래치에서
`retrieve.py "hybrid phase-varying execution mode and sub-agent spawn"` 결과가
`mode-hybrid`만 싣고 `mode-sub-agents`를 억제했으며(one telling per region 동작),
같은 그래프에서 `check_determinism.py`가 PASS했다.
