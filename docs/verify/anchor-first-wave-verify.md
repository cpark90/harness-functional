---
model: fable (opus rate-limited)
verdict: PASS-with-notes
scope: [ontology/abox/core/state/memory.ttl, ontology/abox/core/organization/roles.ttl, ontology/shapes/harness-shapes.ttl (comment-only), tools/retrieve.py]
---
# Anchor 첫 저작 + projection 오염 수정 + AnchorShape caveat — 판정

**판정: PASS-with-notes.** 차단 결함 0. 핵심 질문("anchor가 팩에 들어올 다른 경로가
있는가")의 답은 **없다** — 코드 독해와 실측 양쪽으로 닫았다. 비차단 발견 5건(N1~N5),
그중 N1(브리프 밖 `c-dispatch` 태그 2건의 미보고·미측정 검색 영향)과 N2(role-benchmarker
미저작이 저작 규율의 반례)는 후속 처리 권고.

증거 산출물: 스크래치 `…/scratchpad/anchorwave/`(3-tree 팩 스위트·shape probe 스크립트).
실행 인터프리터: `/usr/bin/python3` (rdflib/pyshacl/owlrl 확인), `PYTHONHASHSEED=0`.

## 1. 게이트 3종 + 개체수 + footprint

| 게이트 | 명령 | 결과 |
|---|---|---|
| validate | `/usr/bin/python3 tools/validate.py` | **PASS** (SHACL·reachability·capability·assemblyOrder·capacityFit·registryDrift 전부 ✓) |
| lint | `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** (prefix 포함 0 violation — 실 anchor 7개는 `anchor-` 슬러그 적합) |
| determinism | `/usr/bin/python3 tools/check_determinism.py` | **PASS** (요청당 4 runs, 1 distinct pack) |

- 개체수 **371** = 364 + anchor 7 (rdflib `instance_nodes` 재측정; harness.lock
  individualCount도 371 vs anchor-free 364로 산술 일치).
- anchor 원시 트리플 = **35** (7개체×4 + `hasAnchor` 7) — 역적용 시 정확히 35 제거됨.
- footprint: anchor 관련 diff 라인은 `memory.ttl`/`roles.ttl`/`harness-shapes.ttl`(주석
  10줄, 전부 `#`)/`retrieve.py`에만 존재. 워킹트리의 나머지 수정(assembly-sections,
  guardrails, patterns, concepts, harnesses, tools/materialize.py, tools/plane-editor/**,
  CLAUDE.md, docs/CONTRIBUTING-ONTOLOGY.md 등)은 병행 lane 소유 — anchor 문자열 0,
  본 판정 무귀속. 단 **roles.ttl 안에 브리프 밖 편집 2줄**이 이 wave의 hunk에 포함
  (§N1).

## 2. 오염 수정의 완결성 — 다른 유입 경로 없음 (코드 독해)

`tools/retrieve.py` 전체를 독해하고 heap/emission 경로를 전수 추적했다.

- **admission 유입은 정확히 두 곳뿐이다**: ① `traverse()`의 heap은 `select_seeds()`
  반환으로만 초기화되고, ② push는 `adj[node]`(= `build_adjacency()`) 순회에서만 일어난다.
  두 곳 모두 `annotation_layer_nodes(g)`로 제외(seed는 후보 skip, adjacency는 양 끝점
  skip) — admit 불가가 구조적으로 따라온다.
- **출력 표면 전수**: `nodes`/`candidates`/`gaps`/`edges`(양 끝점 in_scope 필터)/`seeds`
  JSON — 모두 admitted 집합에서 파생. `gaps`는 in-scope harness의 requiresCapability와
  in-scope providesCapability만 읽음(anchor는 capability 무관). budget 산출도 admitted만.
- **적극적으로 찾은 우회 경로들** (전부 음성):
  - `_resolve_id_tokens` 산문 경로: 리터럴이 `id:anchor-*`를 지칭하면 anchor prefLabel이
    텍스트로 유입 가능 — 전 그래프 리터럴 스캔 결과 **0건**.
  - `alternative_clusters(g)`는 전 그래프를 읽지만(제외 없음) cluster key는 미출력이고
    anchor는 pop되지 않음; 현재 anchor에 `alternativeOf` 0건 — 잠복 경로일 뿐 유출 불가.
  - `_typed(g)`는 membership 검사 전용. `--format json`에 별도 섹션 없음. IRI 부분일치
    로직 없음.
- **실측 종결**: AFTER 40팩 JSON의 nodes(id·types)/edges(s·p·o)/seeds/candidates/gaps
  전 필드 스캔 — anchor 참조 **0건**.

## 3. byte-identity 독립 재현 (자체 기준선 + 자체 40질의)

developer 스크립트를 재사용하지 않고 전부 재구성했다.

- **기준선(base)**: 워킹트리 전체를 스크래치 복사 후 rdflib로 anchor 트리플만 역적용
  (**정확히 35 triples** 제거 — 주장 수치 일치, `c-dispatch` 태그 등 여타 편집은 유지)
  + `git show HEAD:tools/retrieve.py`(수정 전 코드).
- **질의 40개(자체 작성)**: 직전 붕괴 질의 **"traceability audit oversight"·"acceptance
  test coverage"** 포함, anchor 라벨 어휘 직격 질의("anchor confidence weighted region",
  "long-term memory anchor", "auditor agent", "tester agent" 등)와 일반 질의 혼합 —
  편향 없음은 아래 대조군의 68/80 감지력으로 증명.
- 결과 (`diff -r`, 질의당 md+json):

| 비교 | 의미 | 결과 |
|---|---|---|
| AFTER(수정 코드+anchor 그래프) vs base | 주장 ① | **80/80 byte-identical** |
| noop(수정 코드+anchor-free 그래프) vs base | 주장 ③ no-op | **80/80 byte-identical** |
| **대조군**: HEAD 코드+anchor 그래프 vs base | 오염 실재·스위트 감지력 | **68/80 differ**, 34/40 JSON에 anchor admit, q01 "traceability audit oversight" **36→19 노드 붕괴 + anchor 5개 admit** (보고된 붕괴를 정확히 재현) |

⇒ 두 주장 모두 참이며, 스위트는 비-vacuous(오염을 68/80으로 잡아내는 감지력 확인).

## 4. 제외의 부작용 — 잃는 것 없음 (판정)

- anchor는 definition/promptText/capability 엣지가 없다 — 팩 소비자(조립 에이전트)가
  읽을 조립 정보가 애초에 없고, 검색을 실제로 움직이는 crisp `ho:tagged`는 그대로다.
- `hasAnchor`/`anchorTarget` 엣지는 **이번 wave 이전 어떤 팩에도 존재한 적이 없다**
  (인스턴스 0이었음) — 수정 후 팩이 pre-anchor 전 이력과 byte 동일하므로 소비자 관점
  손실 0.
- 가중 정보가 필요해지는 미래: 소비자는 `alternative_clusters`가 `alternativeOf`를 읽듯
  **그래프에서 `anchorConfidence`를 직접 읽으면 된다** — 제외는 admission(노드 지면 배정)만
  막지, 규칙 계층의 읽기를 막지 않는다. 소비 재개와 충돌 없음.
- 설계 정합: TBox `ho:Anchor` 정의 자체가 "annotation ABOUT a component"·"DECLARED BUT
  DORMANT BY DESIGN"이라 명시 — "주석 층 ≠ 부품" 판정은 저장소 설계와 일치. MANIFEST
  (그래프 인벤토리 층)에는 남기고 렌더(산문 층)·팩(조립 층)에서는 빠지는 계층화도 일관.
  잔여 긴장 1건은 §N5(doc-lag).

## 5. 저작 사실성 — 7/7 confidence 근거 전수 확인 (정의문 원문 대조)

| anchor | 값 | 정의문 문면 근거 (verbatim 확인) | 판정 |
|---|---|---|---|
| mem-longterm/c-memory | 0.9 | 정의 전체가 read-timing·persistence 티어 서술 = c-memory region("firmware/cache/long-term tiers distinguished by read-timing and persistence") | ✓ primary |
| mem-longterm/c-lesson | 0.4 | "the lessons drawn from trial and error (id:c-lesson) are the representative content of this tier" — 티어의 내용물로 부차 자리매김 | ✓ secondary |
| role-tester/c-acceptance-coverage | 0.9 | "produces the checks themselves -- test cases, fixtures and simulated runs … acceptance material" = region 자체 | ✓ primary |
| role-tester/c-multiagent | 0.4 | "dispatch-invoked only"(dispatch는 c-multiagent 정의의 명시 축) + "observed teams" — 호출 문맥 한정어 2곳. **반증 시도**: 근거 부족인가? — "teams"는 명시적 agent-복수 어휘라 충분; primary인가? — 정의 주제는 acceptance 생산이므로 0.9는 과함. 0.4가 정확 | ✓ secondary |
| role-auditor/c-oversight | 0.9 | "continually audits … raising an enforcement finding … compliance findings against a charter or standard" ≈ c-oversight 정의 문장; c-oversight 정의가 "tag the benchmarking and audit roles"로 이 role을 지목 | ✓ primary |
| role-auditor/c-dispatch | 0.4 | "dispatch-invoked only" verbatim, 한정어 | ✓ secondary |
| role-auditor/c-multiagent | 0.4 | 브리프는 "'other agents'' 1회"라 했으나 실측 **문면 근거 2곳**("other agents' charter-conformant operation" + "whether agents operate WITHIN their charter") — 근거는 브리프보다 강함, 여전히 문맥이므로 0.4 적정 | ✓ secondary |

- 눈금 정의: memory.ttl WEIGHTED ANCHORS 절에 실재(0.9/0.4 2단 정성, 중간값 금지,
  DECLARATION-ONLY + 소비 재개 조건 명문) ✓; roles.ttl 주석은 포인터 ✓; 전 값 ∈{0.9,0.4} ✓.
- 의도적 미저작 근거: role-auditor **c-traceability** — 정의문에 provenance/이력 어휘
  0(전문 재독), 태그 근거는 `roleGuardrail id:gr-traceability` 배선(실재 ✓) ⇒ crisp
  tagged 유지 판단 타당. **mem-cache/mem-firmware** — c-multiagent 문면 근거 없음
  (agent-복수 어휘 부재; "spawn(ed task)"은 lifecycle 어휘로 경계 판단 — §N4) ⇒ legible
  태그 1개(c-memory)뿐이라 skip 규칙("비교 정보 없음") 적용 일관.

## 6. 미저작 후보의 정당성 — 규율은 대체로 지켜졌으나 반례 1건

후보 집합 자체 재계산: attachable 229(=222+anchor 7) ∧ 다중태그 65 ⇒ 교집합 **52 노드**
(주장 수치 일치). 표본 대조:

- role-research/analyst류(태그 {c-multiagent, c-dispatch}): 정의 주제 region이 태그에
  없어 primary 불성립 → skip 일관 ✓.
- **반례 — role-benchmarker**: attachable ✓·태그 {c-oversight, c-dispatch, c-multiagent}.
  정의("continually surveys external reference cases, compares … raises graded
  improvement claims")가 c-oversight 정의("Continually holding a subject against an
  external reference … raising evidence-backed claims and findings")와 사실상 동문이고,
  c-oversight는 **"the benchmarking and audit roles"라고 benchmarking을 먼저 지목**한다.
  "dispatch-invoked only"·"the team"도 auditor의 0.4 근거와 동종. 규율대로면 auditor와
  대칭인 anchor ~3개가 성립하는데 미저작이고 skip 사유 기록도 없다 ⇒ "미저작 전체가
  규율의 산물"이라는 주장에 구멍 1건 (§N2, 비차단 — 축이 선언 전용이라 실해 0).

## 7. shape 주석(caveat) 3주장 — 전부 재현으로 참 확인

validate 파이프라인 동일 조건(raw union → `lib.apply_reasoning` → pyshacl
`inference="none", advanced=True`)에서 probe 주입 (`scratchpad/anchorwave/shape_probes.py`):

- ① mistyped target(`anchorTarget id:tool-editor`) + 추론: AnchorShape `sh:class` 메시지
  **불발화**(prp-rng가 tool-editor를 ho:Concept로 추론 → vacuous 만족) ✓.
- ② 실제 차단 = `ConceptConnectivityShape`, 메시지 문자열 **"Orphaned concept: tags
  nothing and is disconnected from the concept taxonomy"** 발화 확인 ✓.
- ③ 추론 없이 SHACL만: **"Anchor must point at exactly one ho:Concept via
  ho:anchorTarget"** 발화 ✓ (무추론 소비자에게 유효하니 제거 금지라는 문구도 참).

⇒ caveat 10줄은 오도가 아니라 실측과 일치하는 정확한 기록.

## 8. AnchorShape 실사용 negative control — 전부 통과, vacuous-pass 배제

| probe | 조작 | 결과 |
|---|---|---|
| P0 | 정상 anchor(mem-cache 부착, c-memory, 0.5) | **conforms** (대조군) |
| P1 | anchorConfidence 제거 | FAIL "must have exactly one ho:anchorConfidence…" |
| P2 | anchorConfidence 1.5 | FAIL (동일 property shape, 범위) |
| P7 | P2 쌍둥이를 0.5로 교정 | **conforms** — P1/P2 FAIL이 값 때문임을 증명(vacuous-pass 배제) |
| P3 | Harness(h-multiagent)에 직접 hasAnchor | FAIL "Orphaned component"(chain은 중간 component 필요 — TBox "belongs on a component, not the harness node" 이빨 실재) |
| P4 | Concept(c-memory)에 hasAnchor | FAIL "Orphaned component" |
| lint | `id:anc-probe` 오슬러그 주입 | FAIL "slug 'anc-probe' [Anchor] should use prefix 'anchor-' (§2)" (주입 후 원복) |

## 9. materialize 영향 — MANIFEST 인벤토리에만, 렌더 0

- 두 carrier 실행: `materialize.py h-multiagent`(anchor 2)·`h-workspace-synthesis`(anchor 5)
  → anchor는 **MANIFEST.json components에만** 등장, type **"Anchor"** 정타이핑
  (INSTANCE_CLASSES 등재 확인 — HarnessComponent fallback 아님).
- anchor-free 기준선과 `diff -r`: **MANIFEST(anchor 엔트리뿐, aggregate tokenEstimate
  불변 — anchor는 tokenEstimate 미선언) + harness.lock.json(individualCount 371↔364
  1줄)만 상이, 렌더 .md 전부 byte-identical**. 산출물 내 dangling `id:` 토큰 0.

## Notes (전부 비차단)

- **N1 — 브리프 밖 편집 + 미측정 검색 영향**: roles.ttl에서 `role-benchmarker`·
  `role-auditor`에 `ho:tagged id:c-dispatch` 2줄 추가 — 브리프의 "노드 3개" 밖 4번째
  노드이며 developer 자기보고·메모리에 미기재. 근거는 실재("dispatch-invoked only"
  verbatim, 형제 role 6종이 이미 동일 태그)하고 auditor 건은 c-dispatch anchor의 태그
  전제라 사실상 필요. 단 80/80 게이트는 **기준선에 태그를 남기는 구성이라 이 delta를
  구조적으로 측정하지 않는다** — 별도 실측(tag만 역적용한 4번째 트리) 결과 **40질의 중
  8질의 팩 변화**(예: q01에 c-dispatch admit/as-process 탈락, "dispatch" 질의에
  role-auditor·benchmarker 신규 admit — 방향은 개선, 누출 없음). 기록 필요 사항이며
  이 리포트가 그 측정을 대신 남긴다.
- **N2 — 저작 규율 반례**: §6 role-benchmarker. 후속 저작 또는 skip 사유 명문화 권고.
- **N3 — 계수 단위 혼동**: "후보 52 중 45 미저작"(브리프·`anchor-confidence-consumption.md`)
  은 52(노드) − 7(**anchor**)의 단위 혼합. 정칙은 52 노드 − 3 저작 노드 = **49 노드 미저작**.
- **N4 — 눈금 경계의 암묵 규칙**: "observed teams"/"other agents'"(agent-복수 어휘)는
  c-multiagent 근거이고 "spawn(ed task)"(lifecycle 어휘)는 아니라는 판별선이 일관 적용은
  됐으나 규약 주석에 명문화돼 있지 않음 — 한 줄 추가 권고(소).
- **N5 — TBox doc-lag**: `ho:Anchor`/`ho:hasAnchor` 정의문은 소비가 "later stage"라고만
  하고 **read projection에서의 제외 사실**은 retrieve.py 주석에만 있다. TBox 정의 or
  DESIGN 문서에 1문장 동기화 후보(후속 wave·문서 lane 라우팅).

## 재현 명령 (요약)

```
/usr/bin/python3 tools/validate.py ; /usr/bin/python3 tools/lint_uniformity.py ; /usr/bin/python3 tools/check_determinism.py
# 3-tree 팩 스위트 (PYTHONHASHSEED=0): scratchpad/anchorwave/{driver.py,queries.txt}
#   base = 워킹트리 rsync + rdflib로 anchor 35 triples 역적용 + git show HEAD:tools/retrieve.py
#   noop = 동일 그래프 + 현행 retrieve.py / pollu = HEAD retrieve.py + 현행(anchored) 그래프
/usr/bin/python3 driver.py <tree>/tools out-<tree> queries.txt ; diff -r out-after out-base   # 80/80
# shape probes: scratchpad/anchorwave/shape_probes.py (raw union 사본 + apply_reasoning + pyshacl inference=none)
# materialize: tools/materialize.py h-multiagent|h-workspace-synthesis --out <scratch> ; diff -r vs base 트리 산출물
```
