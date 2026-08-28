---
status: verified
verdict: pass-with-notes
role: vnv
date: 2026-08-28
target: B1 — ho:conceptFacet 신설 + 전 core Concept facet 선언 + facet 불일치 자식 3건 재부모화
criteria: [docs/feedback/inquiries/b-wave-facet-design.md §3·§5·§7.5, docs/feedback/b-wave-backbone-layering.md]
landed_as: 9a0483d (inspection이 sim-hil B wave와 묶어 커밋 — 아래 §0 참조)
---
# B1 conceptFacet — 검증·평가 판정

**판정: pass-with-notes.** 게이트 3종 초록, SHACL 값집합 negative control 전부 기대대로,
facet 배정 84/84 규칙 정합, 범위 위반 0. **핵심 성공기준(검색 무영향)은 facet 속성에 대해
40 질의 × 2 포맷 = 80/80 pack byte-identical로 증명**됐다. 랭킹이 바뀐 곳은 **승인된
재부모화 3건**뿐이며, 그 실제 파급은 developer 자기보고(16질의 중 2)보다 크다 —
**40질의 중 6질의 / 80 pack 중 12**. 예상된 종류의 변화이나 크기가 보고와 다르므로
note로 남긴다.

실행 인터프리터: `/usr/bin/python3` (셸 기본 `python3`에 rdflib 없음). 모든 명령은
repo root `/home/cpark/git/harness_ontology`에서 실행.

---

## 0. 검증 중 형상 변화 (재현 시 주의)

세션 시작 시 B1은 working tree의 uncommitted 변경이었으나, 검증 도중 inspection 세션이
**`9a0483d "Land sim-hil B wave (T1-T4 + 26 parts) and B1 concept facets"`** 로
**sim-hil B wave와 묶어 커밋**했다. 따라서 **B1은 커밋 단위로 분리되지 않는다**.
이 판정의 격리 비교는 전부 **커밋이 아니라 triple 단위**로 수행했다(§3) — 그 편이 다른
wave의 동시 변경(wave-H·sim-hil의 신규 개체 63 triple)에 오염되지 않는 유일한 방법이다.
pre-B1 기준 커밋은 `fe44129`.

## 1. 게이트 3종 (verification)

| 게이트 | 명령 | 결과 |
|---|---|---|
| 구조 | `/usr/bin/python3 tools/validate.py` | **PASS** — SHACL / reachability / capabilities / assemblyOrder / capacityFit / registryDrift 전부 ✓ |
| 저작 균일성 | `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** — 7개 체크 0 violation. 신설된 `conceptFacet (§3)` 체크 포함: "every central Concept declares its ho:conceptFacet content axis" |
| 결정성 | `/usr/bin/python3 tools/check_determinism.py` | **PASS** — 4질의 × {md,json}, 4런 1 distinct pack |

중앙 CI(`.github/workflows/validate.yml`)가 이 3개를 모두 실행함을 확인(라인 22·25·29) —
새 linter 체크는 실제로 게이트에 물려 있다.

## 2. Negative control — SHACL 값집합 (인메모리, 디스크 무오염)

`scratchpad/neg_control.py`: `lib.load_graph(reason=True)`로 얻은 그래프를 복제해 주입하고
`pyshacl.validate(shapes=ontology/shapes/harness-shapes.ttl, advanced=True)`.

| probe | 주입 | 기대 | 실측 |
|---|---|---|---|
| P0 | 없음(대조군) | conforms | **conforms=True** |
| P1 | `c-safety` facet → `"structure"` | FAIL | **conforms=False**, `ho:ConceptFacetShape` 메시지 |
| P1b | facet → `"Quality"`(대소문자 표류) | FAIL | **conforms=False** |
| P2 | facet → `"method"`(정상 값 대조군) | conforms | **conforms=True** |
| P3 | facet 2개(`quality`+`method`) | FAIL(maxCount) | **conforms=False** |
| P4 | facet를 integer로 | FAIL(datatype) | **conforms=False** |
| P5 | facet **없는** 신규 core Concept | shape은 통과(설계상 presence 미강제) | **conforms=True** |
| P6 | 신규 core Concept + 닫힌 값 밖 | FAIL | **conforms=False** |

**presence는 shape이 아니라 linter가 잡는다**는 설계가 실제로 그렇게 작동하는지 별도 확인
(`lint_uniformity.check_concept_facet`를 인메모리 그래프에 직접 적용):

- 현재 트리: 0 violation.
- `id/core/c-probe-term`(facet 없음) 주입 → **1 violation** (teeth 있음).
- `id/recipes/c-local-term`(연합 네임스페이스, facet 없음) 주입 → **0 violation**
  (false positive 없음).

### shape presence=OPTIONAL 결정의 근거 실측 (developer 자기보고 검증)

자기보고의 핵심 결정을 **직접 확인**했다. 근거는 성립한다:

- `/home/cpark/git/harness-recipes/.github/workflows/validate.yml:148` →
  `run: python3 central/tools/validate.py` (`HARNESS_CATALOG`/`HARNESS_ROOT_ONTOLOGY`로
  recipe union을 **중앙 shapes**로 검증).
- recipe-local `ho:Concept` 선언 수 = **239** (`grep -rho "a ho:Concept" recipes --include=*.ttl | wc -l`).

즉 `sh:minCount 1`이었다면 중앙만 바뀐 라운드에서 **하위 repo 전부가 깨진다**. 값집합만
닫고 presence는 중앙 linter로 강제한 선택은 증거가 지지한다. **CONFIRMED 아님.**

## 3. [핵심] 검색 무영향 증명 (validation)

### 3.1 방법 — triple 단위 3-way 격리

HEAD worktree 비교는 다른 wave의 미커밋/커밋 변경을 함께 담아 B1을 격리하지 못한다. 대신
**같은 raw union에서 세 변형을 만들고 각각 별도로 OWL-RL 추론**했다(추론된 inverse
`skos:narrower`가 변형마다 재계산되도록 raw 단계에서 변형):

| 변형 | 내용 |
|---|---|
| `PRE` | facet triple 84개 제거 **+** 재부모화 3건 원복(`broader → c-communication`) |
| `MID` | facet triple만 제거(재부모화 유지) |
| `POST` | 현재 트리 |

→ `MID vs POST` = **facet 선언만의 효과**, `PRE vs MID` = **재부모화만의 효과**.
스크립트: `scratchpad/search_isolation2.py` (40 질의 × `{md, json}` = 80 pack,
`retrieve.project` + `render_markdown` + `json.dumps(indent=2)` 결과를 바이트 비교).

### 3.2 결과

| 비교 | byte-identical | 다른 질의 |
|---|---|---|
| **MID vs POST — facet 선언 84 triple** | **80/80** | **0/40** |
| PRE vs MID — 재부모화 3건 | 68/80 | 6/40 |
| PRE vs POST — B1 전체 | 68/80 | 6/40 |

**B1의 성공 기준(facet 속성은 검색을 바꾸지 않는다)은 증명됐다** — 40질의 어디에서도
1바이트도 다르지 않다. 설계 §3c의 "속성이면 검색 비용 0" 주장이 실측으로 지지된다.
(부수 확인: `materialize.py`로 h-multiagent·h-coding·h-harness-factory·h-research 4개
트리를 B1-원복 트리와 각각 렌더 → **20/20 파일 byte-identical**. 설계 §6 예측대로.)

### 3.3 재부모화 3건의 파급 (수치)

바뀐 6질의의 전부:

| 질의 | 노드 삭제 | 노드 추가 | 예산 |
|---|---|---|---|
| communication between agents over durable channels | – | – | 동일 (엣지 라벨 `broader`→`related` 1줄만) |
| deliverable template that downstream roles consume mechanically | `c-communication` | `c-agent-methodology` | 896→896 |
| terminology drift and near-synonym prevention | `as-test-scenarios` | `c-agent-methodology`, `mc-opus` | 895→900 |
| agent governance methodology and operational discipline | `dlv-verified-result`, `gr-single-responsibility` | **`c-report-over-prompt`, `c-controlled-vocabulary`, `c-structured-output`**, `mc-opus`, `ps-methodical-error` | 897→898 |
| how should agents exchange information and status | **`c-report-over-prompt`, `c-controlled-vocabulary`, `c-structured-output`** | `h-coding`, `h-harness-factory`, `h-multiagent` | 900→900 |
| anti-drift authoring rules for a knowledge graph | – | – | 엣지 1줄(`broader → c-agent-methodology`) |

- relevance **재점수화 0건** — 점수는 어느 노드에서도 바뀌지 않았다. 변한 것은 **간선 가중
  경로**(`broader` 0.5 → `related` 0.4)로 인한 **예산 내 admission 순서**뿐이다.
- **방향성**: methodology 계열 질의는 3개 원칙을 **얻고**(개선), 포괄적 communication 질의는
  **잃는다**(손실). 손실 쪽도 내용이 사라진 것은 아니다 — 같은 pack에 `gr-standard-terms`·
  `gr-lang` 등 해당 원칙의 **guardrail**이 남고, 개별 질의
  ("report status to a document…", "structured output template…", "terminology drift…")는
  세 개념을 **여전히 그대로 검색**한다(실측).
- **판정: 예상된 변화.** 재부모화는 승인 항목(§7.5-2)이고 `skos:broader`는 검색 가중을 갖는
  간선이므로 랭킹 변화는 그 결정의 **직접적 귀결**이다. 다만 설계 §6의 "B1은 무영향"이라는
  포괄 서술은 **facet 선언에만 참**이며, 재부모화까지 포함하면 거짓이다 — B2 회귀 판정 때
  이 기준선(6질의/12 pack)을 빼고 계산해야 한다.

## 4. facet 배정 전수 재판정 (설계 §3a 판정 질문 기준)

core Concept **84개 전부** facet 보유. 분포: anatomy 42 / method 25 / quality 12 /
domain 4 / scope 1. 설계 §5는 68개를 예상했는데, 그 사이 병행 wave가 추가한 16개
(envelope 잔여·HIL 6·guardrail-attachment 9·simulation-standin 1 등)까지 **모두 덮었다** —
누락 0. 부모-자식 facet 불일치는 `c-multiagent`(scope) 아래에만 존재하며, 이는
"scope 부모는 자식을 구속하지 않는다"는 규칙이 명시적으로 허용하는 형태다.

**D2 확정 3건** — 전부 §7.5 사용자 확정과 일치하고, 규칙 적용으로 설명된다:

- `c-communication` = **anatomy**: definition이 "message form, channels" 즉 표면/부위를
  가리킨다(test 1). 그래서 자식 3개(원리)는 그 test를 만족할 수 없어 재부모화가 **규칙의
  귀결**이다. ✔
- `c-inforetrieval` = **domain**: "search is the subject area"(test 2). 검색을 수행하는
  **부위**는 Tool 노드이므로 test 1이 발화하지 않는다. ✔
- `c-oversight` = **quality**: "얼마나 감독되는가"가 답변 가능(test 4)하고, 자식
  (`c-automation-bias`·`c-rubber-stamping`)이 **상태**를 지칭해 test 5(명령형)에 도달하지
  않는다. ✔

**설계 표에 없던 신규 개념** 집중 검토 — 규칙으로 설명되지 않는 배정 **0건**:

- envelope 5축 + 20 leaf = anatomy: 설계 §3b가 이미 "자식 5축 = 하위 anatomy 일관"으로
  배정했고 §8이 자연검증을 예고한 가지. leaf(Language scope·Data sensitivity …)는 부품이
  아니라 **선언 축**이라 test 1의 확장 문구로 잡히며, 부모 facet 동률 규칙으로도 같은 답.
- `c-guardrail-attachment` + 8 leaf = anatomy: "어디에서 규칙이 물리는가" = 파이프라인상의
  **위치**. 내용을 갖지 않는 것이 아니므로 scope(test 3) 아님. ✔
- `c-simulation-standin` = anatomy: definition이 문자 그대로 "family of **components**"
  (test 1 즉시 발화). ✔
- HIL 3(`c-human-in/on/out-loop`)·`c-meaningful-control` = quality: 부모 `c-autonomy`가
  quality이고 여러 test가 걸리므로 **부모 우선 규칙**이 답을 고정. ✔
- `c-multiagent` 아래 method 7건(dispatch·delegation·synthesis·scale-modes·
  complexity-governance·cross-validation·online-agent): 전부 "The principle that …"
  = 명령형 되쓰기 가능(test 5), scope 부모는 구속하지 않음. ✔

**arguable 2건(CONFIRMED 아님, 기록만)**: `c-role-multiplicity`(anatomy) ·
`c-deliverable-artifact`(anatomy) — 둘 다 definition에 "together with the discipline …"이
붙어 method 독해가 가능하다. 그러나 각 term이 **무엇의 이름인가**를 먼저 물으면
("한 역할의 동시 인스턴스 수" = 편성 축, "핸드오프 단위 파일" = 부품) test 1이 먼저
발화하고, first-fit 규칙상 anatomy가 답이다. 규칙 적용으로 설명되므로 결함 처리하지 않는다.

**규칙 텍스트가 승인본보다 넓어진 지점(투명하므로 수용, 인지 필요)**: 설계 §3a는 test들의
**순서**를 정하지 않았고 anatomy를 "부위/부품"으로만 썼다. TBox definition과
ONTOLOGYSTYLE §3은 (1)anatomy→(2)domain→(3)scope→(4)quality→(5)method **순서**와
"part **or declared structural axis** … what it is configured as"라는 **확장 문구**를
새로 고정한다. 이 두 가지가 envelope 20 leaf·attachment 8 leaf를 anatomy로, `c-grounding`·
`c-structural-coverage`("The principle of …"로 시작하지만 quality)를 quality로 만드는
실질 근거다. **은닉된 확장이 아니라** TBox definition·§3·concepts.ttl 배너 세 곳에 명시돼
있고 §3b/§8의 명시 배정과도 어긋나지 않으므로 통과시키되, 향후 저자가 참조할 규칙 원본이
"승인 문서"가 아니라 "developer가 정련한 §3"이라는 점을 orchestrator가 알아야 한다.

## 5. 범위 준수 (B2·B3 미접촉)

pre-B1(`fe44129`) 대비 현재 트리의 **triple 단위 diff**(rdflib, shapes 제외 전체 abox+tbox):

- `ho:tagged` **added on pre-existing subjects: 0** — **B2(개체 태그 보강) 미착수 확인**.
  `ho:tagged` removed: 0.
- pre-existing Concept을 주어로 추가된 triple: **74 = conceptFacet 68 + broader 3 +
  related 3**. 즉 기존 개념에 가한 변경은 **facet 선언과 재부모화 3건뿐**. 제거된 triple 중
  개념 관련은 `c-{report-over-prompt, controlled-vocabulary, structured-output}
  broader c-communication` 3개(+ TBox blank-node 재직렬화 잡음)뿐.
- 신규 84 facet 중 나머지 16개는 병행 wave가 새로 만든 개념에 인라인으로 붙은 것.
- `ontology/shapes/harness-shapes.ttl` diff = **`ho:ConceptFacetShape` 블록 추가 21줄뿐**;
  `ho:AlternativeOfSharedAnchorShape`의 region SPARQL은 **그대로** → **B3 미착수 확인**.
- 담당 경로 밖(`tools/plane-editor/**`, `harness-recipes`)은 이 판정에서 **읽기만** 했고
  수정 0. 그 경로의 변경은 다른 세션 귀속.
- 저작 스타일: concepts.ttl 84개 블록 전수 검사 — `ho:conceptFacet`이 **모든 SKOS 관계
  뒤 맨 끝**, 값은 닫힌 5개, 블록 종결 위치. §3 [지킴] 위반 **0건**.
- 어휘 중복(drift) 점검: `rdfs:domain ho:Concept`인 프레디킷은 `conceptFacet` **하나뿐**
  (근사 동의어 신설 아님), 명명도 기존 `*Kind`/`*Type` 관례와 동형.

## 6. 다음 wave 입력 — B3는 실제로 가능해졌는가

`scratchpad/b3_sim.py`로 시뮬레이션(인메모리, 디스크 무변경).

**(a) SPARQL로 쓸 수 있는가 — YES.** 현재 shape의 `FILTER NOT EXISTS` 블록에 두 줄
(`?region ho:conceptFacet ?f . FILTER(?f IN ("anatomy","method"))`)만 넣으면 되고,
패치된 shapes로 pyshacl이 정상 실행된다.

**(b) c-multiagent 허위 region이 사라지는가 — YES (실증 1건).**
`c-multiagent`만 공유하는 실제 개체쌍 `agent-developer` / `agent-inspection`에
`ho:alternativeOf`를 인메모리로 주입:

| shape | 결과 |
|---|---|
| 현행 ANY-tag shape | **conforms=True** (허위 region 통과 — 이것이 문제) |
| facet 필터 shape(B3안) | **conforms=False**, region violation 4건 |
| 대조군(진짜 anatomy/method 공유쌍 `gr-discriminating-eval`/`wf-harness-evolution`) | facet shape에서도 **conforms=True** |

**(c) 규모.** 같은 region으로 인정되는 개체쌍 **1081 → 173 (908쌍, 84% 제거)**.
기존 `alternativeOf` 실사용 쌍은 0이므로 **B3 착수 시 즉시 깨지는 기존 데이터는 없다**.

**(d) B3 전에 결정이 필요한 공백 — quality를 판별 facet으로 볼 것인가.**
태그된 개체 150개 중 anatomy/method 태그가 **하나도 없는** 것이 **62개**다:

| 프로필 | 수 |
|---|---|
| scope only (= B2의 27개 대상) | 27 |
| **quality only** | 25 |
| domain only | 7 |
| quality+scope | 2 |
| domain+quality | 1 |

설계 §4는 판별 facet을 "anatomy 또는 method"로 **긍정 열거**하면서 부정 열거는
"scope·domain"만 적어 **quality의 지위가 미결**이다. 문면대로 가면 B2(27개)를 끝내도
**35개가 region 없는 채로 남고**, 그중 25개는 `c-safety` 같은 quality 태그만 가진
guardrail이다. → **B3 브리프 전에 "quality도 판별 facet인가"를 결정**해야 하며, 아니라면
B2 범위(27)가 부족하다는 것이 수치로 확인된다.

## 7. 남은 note (결함 아님, orchestrator 인지용)

1. **자기보고와 실측 차이**: developer는 "deltas = 2 of 16 queries"라 했으나 40질의로 넓히면
   **6질의/12 pack**이다. 결론(재부모화가 유일 원인)은 옳고 방향도 맞으나, **회귀 기준선
   수치는 이 리포트 §3.3을 쓰라**.
2. **문서 지연 1건**: `CLAUDE.md`의 "Adding vocabulary" 절은 아직 "connect it … or
   `validate.py` will flag it as an orphan"까지만 말한다. 이제 중앙 신규 개념은 **facet도
   선언해야** 하고 그 실패는 `validate.py`가 아니라 `lint_uniformity.py`에서 난다.
   ONTOLOGYSTYLE §3이 SSoT이므로 규칙 자체는 있으나, 두 진입 문서(CLAUDE.md ·
   `docs/CONTRIBUTING-ONTOLOGY.md`)는 갱신 대상 후보다. (B1 브리프 범위 밖이라 결함 아님.)
3. `ho:conceptFacet`에 `rdfs:domain ho:Concept`이 걸려 있어, 연합 repo가 이 술어를
   비-Concept에 쓰면 OWL RL이 그 노드를 조용히 `ho:Concept`으로 타이핑한다(그 뒤
   `ho:ConceptConnectivityShape`가 orphan으로 잡을 수 있음). 현재 실사용 위반 0이고 오히려
   타이핑이 바람직한 쪽이라 조치 불필요 — 인지만.
4. TBox `ho:conceptFacet`의 `skos:definition`은 321 단어로 167개 중 **2위**(1위
   `ho:hasComponent` 634). §1c의 260-token cap은 abox 대상이라 위반 아니고 기존 선례
   범위 안이지만, TBox 상단 배너와 내용이 일부 중복된다.

## 8. 재현 절차 (그대로 실행 가능)

```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py                 # PASS
/usr/bin/python3 tools/lint_uniformity.py          # PASS (conceptFacet (§3) 포함)
/usr/bin/python3 tools/check_determinism.py        # PASS
# negative control / 격리 비교 / B3 시뮬레이션 (인메모리, 디스크 무변경)
/usr/bin/python3 <scratchpad>/neg_control.py
/usr/bin/python3 <scratchpad>/search_isolation2.py
/usr/bin/python3 <scratchpad>/b3_sim.py
# materialize byte-identity: B1 원복 사본 트리를 만들어 4개 하네스 렌더 후 diff -r
```
스크립트 원본은 세션 scratchpad
(`/tmp/claude-1000/-home-cpark-git-harness-ontology/181dd296-4f58-44e4-ab11-77f0104d85dd/scratchpad/`)에
있으며, 절차는 `.claude/agent-memory/vnv/concept-facet-b1-verify.md`에 요약해 두었다.
