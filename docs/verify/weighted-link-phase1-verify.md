---
model: fable (opus rate-limited)
scope: 확률적 지식 연결 1단계 — ho:Link/ho:LinkKind 스키마 신설 + Anchor/alternativeOf/overlapsWith 폐기 + 수직 슬라이스(링크 9 + kind 5) + tools 4종 + measure_links.py
verdict: PASS-with-notes (차단 1건 — cross-lane 잔존 소비자, 라우팅 필요; 그래프·이 wave 산출물 자체는 결함 0)
phase2-entry: 조건부 GO — 중앙 그래프 2단계 착수 가능. 단 F-1(plane-editor 소비자 파손)은 커밋(land) 전 라우팅 필수이며, 2단계 브리프에 R-A~R-D 보강 위험을 반영할 것
---

# 확률적 지식 연결 1단계 검증 — 스키마 + 수직 슬라이스

- 실행 인터프리터: `/usr/bin/python3` (rdflib/pyshacl/owlrl). 모든 명령은 재현 가능하게 원문 기재.
- 병행 세션 오귀속 방지: `tools/materialize.py`(+149) diff는 **link/anchor 참조 0건**(`git diff HEAD -- tools/materialize.py | grep -i "link\|anchor"` → 0) — envelope-render wave 소유.
  `CLAUDE.md`/`docs/CONTRIBUTING-ONTOLOGY.md` diff는 B1 facet wave 소유(diff 내용이 conceptFacet 전용).
  abox 중 assembly-sections/tools/workflows/patterns/verification/harnesses diff도 envelope-render·A-wave 태그 백필 소유로 확인 — 본 wave 산출물은
  tbox/shapes/{concepts,channels,roles,memory,guardrails}.ttl의 link 블록 + `tools/{retrieve,lint_uniformity,ontology_lib}.py` + 신규 `tools/measure_links.py` + `ONTOLOGYSTYLE.md` 3개소.

## 1. 게이트 3종 + 개체·트리플 delta

| 게이트 | 명령 | 결과 |
|---|---|---|
| validate | `/usr/bin/python3 tools/validate.py` | **PASS** — SHACL conforms, **all 378 individuals reachable**, capability ✓, registry drift ✓(Anchor 항목 소멸, 잔여 미인스턴스 4종 harmless) |
| lint | `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** — 7축 전부 0 violation (§2 `link-`/`kind-` 접두사 매핑 포함) |
| determinism | `/usr/bin/python3 tools/check_determinism.py` | **PASS** — 3질의×2포맷×4프로세스 byte-identical |

개체 delta 검산: 직전 판정(anchor-first, `docs/verify/anchor-first-wave-verify.md:24`) **371 = 364 + anchor 7**.
현재 **378 = 364 + Link 9 + LinkKind 5** (link-layer 제거 사본(treeB) rdflib `instance_nodes` 실측 = **364**로 산술 폐합; materialize `harness.lock.json` individualCount도 378 일치).
트리플 footprint(rdflib 실측): `hasLink 9 / linkTarget 9 / linkKind 9 / linkWeight 9 / weightOrigin 9 / weightMethod 2 / traversalWeight 5`. 슬라이스 구성 = overlap 2쌍(chan-peer↔pat-peer-mesh measured 0.76, gr-well-formed-skill↔ins-well-formed-skill curated 0.85) + 구 anchor 7건 이전(topic, curated 0.9/0.4) — 자기보고와 일치.

## 2. 폐기의 안전성 (최우선) — 잔존 참조 전수 grep

`grep -rn "ho:Anchor\b|ho:hasAnchor|ho:anchorTarget|ho:anchorConfidence|ho:alternativeOf|ho:overlapsWith|AnchorShape|AlternativeOfSharedAnchorShape"` 스코프별:

| 스코프 | 결과 |
|---|---|
| 중앙 abox/tbox/shapes | 잔존 **트리플 0** — 남은 것은 전부 "retired …" 역사 산문(주석/definition 문면)뿐. `id:anchor-*` 개체 0, `a ho:Anchor` 0 |
| tools/*.py (중앙) | 0 (retrieve/lint/ontology_lib/materialize/validate 모두 클린) |
| staging recipes (harness-recipes repo 전체) | **0건** (`grep -rln … ../harness-recipes` → no match) |
| docs 규범 문서 (DESIGN/CLAUDE/ONTOLOGYSTYLE/CONTRIBUTING/RECIPE_STANDARD/federation-design) | 0 |
| docs/plans/** | plane-editor-phase0.md(측정 당시 스냅샷 — 역사 기록, 무해) + **plane-editor-phase2-brief.md:43 — 폐기 술어 재사용을 지시하는 살아있는 계획 문서 → doc-lag, F-1과 동일 라우팅** |
| **tools/plane-editor/**(병행 lane) | **잔존 참조 실재** → F-1 |

### F-1 (차단, cross-lane): plane-editor 링크 평면이 폐기 술어의 살아있는 소비자

- `tools/plane-editor/check_links.py:153` `GRAPH_LINK_TYPES = ("alternativeOf", …, "overlapsWith", …)` + vocabulary-provenance 검사가 **TBox 실재를 확인**하고,
  `tools/plane-editor/link-store/links.json:99`에 type `"overlapsWith"` 실링크 1건이 저장돼 있다.
- 실측: `cd tools/plane-editor && /usr/bin/python3 check_links.py` → **FAIL, 2 violation** — `ho:alternativeOf`/`ho:overlapsWith` "not declared as an owl:ObjectProperty in the TBox".
- 성격: 이 wave 산출물의 결함이 아니라 **TBox 폐기의 그래프-밖 파급**이다(브리프의 grep 스코프 기준으로는 차단 결함). plane-editor README/REPORT에 이 은퇴를 인지한 흔적 0 — **무라우팅 상태**.
  vnv 메모리 §plane-editor-document-axis에 이미 같은 파손이 실측 기록돼 있다(66/66→29ok/37FAIL).
- 해소 경로(판정 아님, 라우팅 제안): plane-editor lane이 `GRAPH_LINK_TYPES`를 link-kind 어휘로 이행(+저장 링크 1건 마이그레이션)하거나, 결정 문서(`docs/feedback/link-plane-weight-decision.md`, 현재 open)와 묶어 처리. **커밋 전 orchestrator 라우팅 필수** — `validate.py`는 `ontology/` 밖을 안 보므로 이 파손을 영구히 놓친다.

### 승인 의미 보존 (B3 · overlap 2쌍)

- **B3 판별 facet 보존**: 이식된 `ho:AlternativeLinkSharedRegionShape`의 SPARQL이 `FILTER(?facet IN ("anatomy", "method"))` — B3 결정(판별 facet = anatomy·method만 region) **그대로 유지**. 구 shape은 `targetSubjectsOf ho:alternativeOf`(대칭 양끝 발화), 신 shape은 링크당 1발화 — 커버리지 동등, 보고 횟수만 다름. 이빨 재현: §5 N17(공유 판별 region 없는 alternative 링크 → FAIL) / N17c(공유 method region 쌍 → CONFORM).
- **overlap 2쌍 보존**: 동일 endpoints, kind-overlap, 대칭 1방향 저작 규약 유지. 가중 부여는 승인 결정 5(전부 퍼지 이전)의 집행 — chan-peer 0.76 measured, gr쌍 0.85 curated(측정이 0.5로 과소평가함을 사람이 교정 — §4에서 실증).

## 3. 사용자 결정 6개 충실도

| # | 결정 | 판정 | 근거 |
|---|---|---|---|
| 1 | typed+weighted, 다양한 구조 표현 | **충족** | kind 5종(broader/topic/alternative/overlap/fragment) 개체-확장(ExecutionMode 선례) — 신규 kind는 노드 1개 추가·코드 0(traversalWeight가 데이터). 방향·대칭 규약은 kind definition에 명문 |
| 2 | 기존 crisp 전부 이전(퍼지) | **충족(1단계 범위)** | alternativeOf·overlapsWith·anchor는 인스턴스 **전량**(2쌍+7건) 이전 후 TBox 폐기. broader 70·tagged 224는 사용자 주석의 단계 계획(1→2→3)상 2단계 몫 — 이월 자체가 승인 사항 |
| 3 | 측정 산출 기본 + 사람 확인·수정 | **충족** | §4 재현: 멱등·재측정 복원·curated 구조적 skip. note: v1 측정 등록은 kind-overlap뿐(topic 등 7건 "kinds without a registered measure") — 측정 커버리지 확장은 2·3단계 몫 |
| 4 | cap 초과 분할 + 조각은 이 연결의 한 종류 | **부분(계획 정합)** | `id:kind-fragment`(0.9) 어휘 실재 + §1c 문서가 alternativeOf→가중 링크로 갱신. 분할 **게이트**(실패+분할 지시)는 3단계(도구·게이트) 몫으로 이월 — 현행 lint 상한 260 유지, fragment 인스턴스 0 |
| 5 | 하한 미강제 | **충족** | lint_uniformity: floor 130은 advisory 그대로("only the CEILING is mechanically enforced") |
| 6 | 용어 자유 | **충족** | Link/LinkKind/`link-`/`kind-` — §2 표·PREFIX_MAP 동기 갱신 |

## 4. 측정 경로 재현 (`tools/measure_links.py`)

사본(treeD)에서 실행 — 원본 무접촉:

- **손 검산(chan-peer 0.76)**: evidence = E1 양방향 교차참조 2건(0.45×2) + E3 공유 비판별 태그 c-multiagent(scope) 1건(0.2).
  noisy-OR = 1 − (1−0.45)(1−0.45)(1−0.2) = 1 − 0.55·0.55·0.8 = 1 − 0.242 = **0.758 → round 0.76** = 저장값 일치. (브리프의 "E2 0.5" 성분은 이 쌍에 없음 — 실제 trail은 E1+E1+E3. 도구 출력의 evidence trail로 확인)
- **멱등성**: report 2회 동일 출력, `--apply` 후 `diff -r treeA/ontology treeD/ontology` → **무변화**(0 to update / 1 unchanged / 1 curated-protected / 7 unmeasured).
- **재측정 복원**: measured 값을 0.5로 조작 → `--apply` → **0.76 복원** (`applied -> …channels.ttl`).
- **curated 보호**: 같은 링크를 weight 0.33 + origin "curated"로 조작 → `--apply` → **PROTECTED, 0.33 유지**(도구가 구조적으로 skip).
- **curated의 존재 이유 실증**: gr쌍 origin을 asserted로 되돌리면 측정이 **0.5**(공유 판별 태그 1건뿐)를 산출 — TTL 주석의 "측정은 0.5로 과소평가, 사람이 0.85 확정" 서사가 사실.
- **유사도 금지 준수**: 코드 전수 — 증거는 ① 산문 내 `id:`/`core:` IRI 토큰 교차참조 ② 공유 tagged(판별/비판별 facet)뿐. difflib/SequenceMatcher/문자열 유사도 **0줄**. docstring이 금지 결정을 명시 인용.

## 5. SHACL negative control — 20/20 (vacuous-pass 배제 포함)

reasoned union in-memory 주입(`lib.HO`/`lib.ID_CORE` NS), 기대 메시지 문자열 대조까지 통과. 스크립트: scratchpad `wl_negctl.py`.

C0 정상 twin CONFORM / N1 orphan(무 hasLink) FAIL "Orphaned link" / N2 무 prefLabel / N3 무 target / N4 target 2개 /
**N5 Harness target(id:h-coding) FAIL / N6 untyped target FAIL** — range-less 술어 + shape sh:or가 실제 이빨(구 AnchorShape의 prp-rng vacuous-pass 미재발) /
N7 무 kind / N8 kind≠LinkKind(id:c-safety) / N9 무 weight / N10 weight 1.5 / **N11 integer 리터럴 `1` FAIL**(sh:datatype decimal — 저작 함정 재확인) /
N12 무 origin / N13 origin "guessed"(sh:in) / **N14 measured без weightMethod FAIL(SPARQL) / N15 method 부여 twin CONFORM** /
N16 kind 무 traversalWeight FAIL + N16c twin CONFORM / N17 판별 region 미공유 alternative FAIL + N17c 공유 쌍 CONFORM.

## 6. 검색 오염 방지 — 36질의×2포맷 자체 기준선 재현

트리 3개(scratchpad): **A**=현행, **B**=link-layer 14블록+hasLink 5문장 제거(자체 기준선), **C**=A에서 제외 로직만 무력화(`link_layer_nodes→set()`, anti-vacuous 대조군). 그래프 1회 로드 후 `project()`/`render_markdown()`/`json.dumps` — retrieve.py main과 동일 경로.

- **A vs B**: 72 산출물 중 **60 byte-identical**(비관여 24질의 전량), differ 12질의(q01–q11, q15 = 슬라이스 관여 질의)×2포맷.
- differ 12건 전수: JSON 필드 비교 — **변한 key는 `edges` 하나뿐**(nodes/seeds/candidates/gaps/budget_used 포함 전 필드 delta 0), crisp edge 목록도 동일하고 **가중 라인만 추가**.
- 팩 토큰 스캔: A 전 72 산출물에서 `link-`/`kind-` 토큰 **0건**(가중 라인은 kind 축약명 `topic 0.9` 형식).
- **anti-vacuous(C)**: 제외를 끄자 A vs C **23/72 differ**, q05 팩에 `link-mem-longterm-topic-*` 2노드가 **노드로 admit**되고 budget_used 변동(896→890) — 스위트가 오염을 실제로 감지함 = 제외 로직이 load-bearing.
- note N-2: md의 Structure 섹션 cap 30 아래에서 가중 라인이 crisp 라인을 "+N more"로 밀어냄(q02/q05 실측) — JSON은 전량 보존, 코스메틱.

## 7. 가중 순회의 실효성 (developer toy 실증의 독립 확인)

treeE = A에서 링크와 병렬인 crisp `ho:tagged`만 제거(role-tester 2·role-auditor 3·mem-longterm 2 — 2단계 tagged 이전 시뮬레이션):

- "audit compliance …" 질의: Oversight relevance **4.016 → 3.615** = 정확히 ×0.9(링크 degree) — 가중이 랭킹 점수에 선형 반영되는 경로 실재.
- degree 0.4 링크(effective 0.7×0.4=0.28)의 대상(Dispatch-based execution, Multi-agent orchestration, Lesson learning)은 **팩에서 탈락** — 2단계에서 crisp가 사라지면 kind base×degree가 admission을 지배하며, secondary(0.4) 연결은 `skos:related`(0.4)보다 약한 0.28로 떨어져 대량 탈락이 예상된다. developer 잔여 함정 ②(base weight 재보정 게이트)가 실측으로 뒷받침됨 — **2단계 진입 조건에 "재보정 게이트 설계" 포함 권고**.
- 현 슬라이스에서 랭킹 불변인 이유(병렬 crisp가 max() 경쟁에서 승리)는 §6 A-vs-B 결과(비-edges delta 0)와 정합.

## 8. anti-orphan 대체 장치

- `inversePath hasLink minCount 1` 이빨: §5 N1 재현(미부착 Link FAIL).
- 반전 설계 확인: reasoned 그래프에서 Link/LinkKind가 `hasComponent`의 object인 경우 **0**, `ho:HarnessComponent` 타입 **0** — 롤업 완전 부재.
- MANIFEST: `materialize.py h-multiagent`(hasLink 보유 컴포넌트 3개를 바인딩하는 harness) 실행 → 전 산출물 grep `link-|kind-|hasLink|ho:Link` **0건**, MANIFEST 131 컴포넌트에 link 없음, lock individualCount 378(그래프 사실로서만 계수).
- 전역 reachability: `link_predicates()`가 TBox 파생이라 hasLink/linkTarget/linkKind 엣지 자동 포함 → 378 전원 reachable(validate ✓). LinkKind는 linkKind 인바운드 + `ho:tagged id:c-controlled-vocabulary`로 이중 연결(미사용 kind-broader/fragment 포함).

## 9. 연합 안전성 — staging recipe 3종

`harness-recipes`에 `ln -sfn <central-worktree> central` 후 각 recipe를 `HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=…/recipes/<r> /usr/bin/python3 central/tools/validate.py`로 union 검증, 종료 후 symlink 제거:

- hil-approval **PASS**(389 reachable) / eval-user-sim **PASS**(388) / coding-swe **PASS**(383) — 중앙 378 + 로컬. 하위 repo 폐기 술어 grep **0건**.

## 10. 명세 이탈 4건 판정

| 이탈 | 판정 | 근거 |
|---|---|---|
| target 유니온에 ho:SpecConcept 추가 | **정당** | 승인 슬라이스 자체(chan-peer→pat-peer-mesh)가 Channel→DesignPattern이고 `ho:DesignPattern ⊑ ho:SpecConcept`(⋢ HarnessComponent) — 유니온 없이는 승인 데이터가 저작 불가. Harness 제외 유지(사례 없음 + specializes/derivedFrom 존재)도 절제된 판단 |
| 신규 파일 tools/measure_links.py | **정당** | 결정 6("측정 산출 기본")은 측정 경로 없이 검증 불가 — 수직 슬라이스의 필수 구성. 3단계(도구·게이트) 선취가 아니라 measured 1건의 산출 재현 수단. 유사도 금지·curated 보호를 코드 계약으로 구현(§4 실증) |
| ONTOLOGYSTYLE 변경(§1c 1줄 + §2 표 2행 + §3 관계그룹 1줄) | **정당** | 전부 폐기·신설의 기계적 동기화 — §1c "1줄"보다 실제로는 3개소이나 모두 같은 성격(잔존 참조 제거) |
| crisp 술어 TBox 완전 삭제 | **정당(조건부)** | 결정 5가 명시("alternativeOf·overlapsWith 포함 전부 이전") + 인스턴스 전량 이전 + 그래프·recipes·중앙 tools 잔존 0. 조건 = **F-1**: 그래프 밖 소비자(plane-editor) 1곳이 파손된 채 무라우팅 — 삭제 자체는 유지하되 라우팅 없이 land 금지 |

## 11. 2단계 위험 목록 평가 + 보강

developer 영속 기록(`.claude/agent-memory/developer/weighted-link-layer-phase1.md`)에는 4건이 남아 있다(브리프의 "7건" 전체는 영속 채널에 없음 — 대조는 4건 한정):
① AlternativeLinkSharedRegionShape의 crisp `ho:tagged` join 이동 필요 — **타당**(shape 주석에도 Phase-2 note 명문)
② 병렬 crisp 소멸 시 가중 지배·base weight 재보정 게이트 — **타당 + §7에서 정량 실증**(0.4 degree → effective 0.28, 팩 탈락)
③ pack 스키마 확장("w" 필드) 소비자 확인 — **타당**(webui/소비자 미점검 상태)
④ link_predicates TBox 자동 파생 — **타당**(§8 확인).

**보강(빠진 위험) 5건**:
- **R-A `ConceptConnectivityShape`**(shapes:101) — sh:or가 `inversePath ho:tagged`·`skos:broader`(양방향)·`skos:related`에 의존. broader/tagged 이전 시 **Concept 전량이 "Orphaned concept" 오탐** — shape의 hasLink 경로 추가가 이전과 같은 커밋이어야 함(①의 상위집합이며 파급이 훨씬 큼).
- **R-B skos 계층의 도구·문서 결합** — `retrieve.py PREDICATE_WEIGHT[SKOS.broader]`, `ontology_lib._SKOS_LINK_PREDICATES`(reachability의 broader 엣지!), lint §3 facet parent tie-break, CONTRIBUTING·CLAUDE의 "skos:broader parent" 문구. broader 이전은 reachability 자체를 끊을 수 있다(현재 Concept 계층이 broader로 도달되는 노드들).
- **R-C 측정의 증거 기반 순환** — structural-overlap-v1의 E2/E3가 **crisp ho:tagged**를 읽는다. tagged가 topic 링크로 이전되면 측정 증거가 증발(전량 0 또는 E1만)하고, 가중 링크에서 증거를 읽도록 고치면 측정이 자기 출력(가중)을 입력으로 삼는 순환 위험 — 2단계 전에 측정 방법의 이전 규칙 필요.
- **R-D w=0.0 의미론 vs alternative 1-admit** — `alternative_clusters`는 의도적으로 crisp(코드 주석 명문)이라 **degree 0.0(사람의 명시적 거부 기록)인 alternative 링크도 클러스터 성립** → 거부했는데 오히려 한쪽이 팩에서 억제되는 역설. 현재 인스턴스 0이라 잠복 — 2단계 전 임계(예: w>0 또는 w≥0.5) 결정 필요.
- **R-E cross-lane 소비자 목록의 부재** — F-1이 보여주듯 `ontology/` 밖 소비자는 게이트가 못 본다. 2단계(broader 70·tagged 224)는 파급 면적이 훨씬 크므로, 착수 브리프에 그래프-밖 소비자 인벤토리(plane-editor, webui, docs/plans)를 명시할 것.

## 12. 종합

- **verification**: PASS — 게이트 3종 green, negative control 20/20, 개체 delta 산술 폐합, 연합 3/3 PASS.
- **validation**: PASS-with-notes — 사용자 결정 6개 중 5 충족 + 1 부분(결정 4의 게이트는 승인 phasing상 3단계 몫), 측정·보호 계약 실증, 오염 방지 재현(자체 기준선 + anti-vacuous), 가중 실효성 독립 실증.
- **차단 1건**: F-1(plane-editor 잔존 소비자 파손 — cross-lane 라우팅 후 해소). **비차단**: N-2(md edges cap 밀림), 측정 커버리지(overlap kind뿐), plane-editor-phase2-brief doc-lag(F-1 동반 갱신).
- **2단계 진입**: 조건부 GO — 위 frontmatter 참조.
