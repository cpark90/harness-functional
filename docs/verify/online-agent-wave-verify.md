# Online-agent 웨이브 검증 판정 (vnv)

- **대상**: 사용자 요구 4건에 대한 developer 2회 dispatch + tools 후속 (online standing agent 축 /
  mode 적합성 선택 / 사용자 역조사 elicitation / same-role concurrency / emitter 정합)
- **판정: PASS-with-notes** — 구조 게이트 3종 전부 PASS, 4개 요구 모두 표현 매핑 완결(GAP 0),
  발견성 4/4 질의에서 신규 노드가 상위 랭크. **권고 수정 1건(F1) + 경미 노트 3건(F2~F4) + 관찰 2건.**
- **판정 시점**: 워킹트리(uncommitted). 도구는 전부 `/usr/bin/python3`.

---

## 0. 재현 명령 (실제 실행한 것 그대로)

```
/usr/bin/python3 tools/validate.py
/usr/bin/python3 tools/lint_uniformity.py
/usr/bin/python3 tools/check_determinism.py
/usr/bin/python3 tools/retrieve.py "<질의>" --format json          # 4종 + budget 6000 재실행
/usr/bin/python3 tools/materialize.py h-multiagent        --out <scratch>/mat
/usr/bin/python3 tools/materialize.py h-workspace-synthesis --out <scratch>/matws
git worktree add --detach <scratch>/head-wt HEAD          # 베이스라인 격리, 검증 후 remove
```

보조 스크립트(스크래치, 저장 안 함): typed-individual delta(HEAD↔WT), compose DAG 감사,
신규 노드 속성 감사, ACTIVATION 축 전수 대조, prose `id:` 토큰 해소 스캔.

---

## 1. Verification — 구조 게이트

| 게이트 | 결과 | 증거 |
|---|---|---|
| `validate.py` | **PASS** | post-reasoning 6849 triples; SHACL conforms / **all 261 individuals reachable** / capability 충족 / assemblyOrder(13 sections) / capacityFit 5 agents / registryDrift 28 class 등록. dup-label(class 내) 0. |
| `lint_uniformity.py` | **PASS** | 5축 전부 0 violation (tokenEstimate §1c / naming prefix §2 / language §1d / maturity coverage / definition coverage). |
| `check_determinism.py` | **PASS** | 4 request × md·json, 각 4 runs → 1 distinct pack. |

### 1a. 개체수 실측 (self-report 대조)

HEAD 워크트리 격리 후 typed-individual 집합 diff:

```
HEAD  = 246 typed id: individuals (validate 헤더 245 = skos:ConceptScheme id:scheme 제외)
WT    = 262 typed id: individuals (validate 헤더 261)
ADDED = 16, REMOVED = 0
```

ADDED 16 중 **5개는 본 웨이브가 아닌 직전 oversight-pair 웨이브**의 미커밋분
(`c-oversight`, `cap-audit`, `cap-benchmarking`, `role-auditor`, `role-benchmarker`
— `docs/verify/oversight-pair-verify.md`에서 이미 판정됨). 나머지 **11개가 본 웨이브**이며
브리프가 열거한 11개 id와 정확히 일치한다:

```
c-online-agent(Concept)  mode-standing-service(ExecutionMode)  gr-online-execution(Guardrail)
gr-mode-fit(Guardrail)   gr-user-elicitation(Guardrail)        wfs-intent-analysis(WorkflowStep)
dlv-intent-profile(Deliverable)  c-role-multiplicity(Concept)  gr-work-claim(Guardrail)
gr-instance-isolation(Guardrail) fp-duplicate-claim(FailurePolicy)
```

→ **종점 261은 정확하나 브리프의 "253→261 (+8)"은 틀림**: 실제 베이스라인은 245(HEAD),
직전 웨이브 반영 후 250, 본 웨이브 기여는 **+11**. 그래프 영향 없음(F4, bookkeeping only).

---

## 2. Validation — 발견성 (retrieve 재검색)

기본 budget 900. `truncated` 필드는 존재하지 않음 — `retrieve.py:196` 정책은 **skip-not-break**
(예산에 안 맞는 노드만 건너뛰고 계속 admit)이라 "절단"은 발생하지 않고 tie-break로 컷된다.

| 질의 | 신규 노드 랭크 | budget |
|---|---|---|
| "persistent session agent serving requests as they arrive" | **#1 mode-standing-service(8.1)**, **#2 c-online-agent(7.2)**, #5 gr-online-execution(3.87) | 896/900 |
| "choose between dispatched worker and online standing agent" | **#1 mode-standing-service(7.65)**, **#2 gr-online-execution(6.48)**, #5 c-online-agent(6.3), **#6 gr-mode-fit(6.12)** | 892/900 |
| "ask the user questions before composing a harness when information is missing" | **#1 gr-user-elicitation(7.11)**, #5 wf-compose-harness(3.6) | 900/900 |
| "multiple agents of the same role working concurrently without duplicating work" | **#1 c-role-multiplicity(7.2)**, **#2 fp-duplicate-claim(6.3)**, #9 gr-instance-isolation, #10 gr-work-claim | 900/900 |

- base-harness candidate도 각 질의에서 정상 노출(h-multiagent 4.25/4.37/4.8, h-workspace-synthesis 4.25).
- **4개 질의 전부 결정적**: `PYTHONHASHSEED` 미지정/1/7 3회 실행 pack sha256 동일.
- 3번 질의에서 `wfs-intent-analysis`/`dlv-intent-profile`은 기본 팩에 미포함 → **결함 아님**(N6 참조,
  `--budget 6000`에서 rank 101 / 72로 존재, 둘 다 seed 목록에도 있음).

---

## 3. Coverage audit (source → representation)

사용자 요구 4문장의 구조 요소를 열거해 각각 매핑/명시적 제외를 판정. **GAP 0.**

### ① "세션이 지속적으로 열려있는 상태에서 전달받는 요청을 처리"

| 소스 구조 요소 | 표현 | 판정 |
|---|---|---|
| 지속 열린 세션이라는 런타임 위상 | `id:mode-standing-service` (4번째 ExecutionMode) | ✓ |
| 그 원리의 어휘 | `id:c-online-agent`, `skos:broader id:c-multiagent`, "counterpart of id:c-dispatch" | ✓ |
| 그 agent의 행위 규칙 | `id:gr-online-execution` (carrier 3: role-orchestrator·role-inspection roleGuardrail + h-multiagent hasGuardrail) | ✓ |
| 어느 role이 standing인가 | roles.ttl ACTIVATION 축 주석 + 두 role 정의 보강 | ✓ **기계 대조 완료** (아래) |
| harness가 그 plane을 선언 | `h-multiagent ho:hasExecutionMode` = {mode-sub-agents, mode-standing-service} | ✓ |
| 요청이 도착하는 채널 | `chan-agent-user`, `chan-orchestrator-inspection` **재사용**(둘 다 h-multiagent hasChannel) | ✓ 신규 0 |
| 도착순·자기 스캔주기·완료 마커 소비 | `gr-online-execution` promptText 내 리터럴 | **명시적 out-of-model**: cadence를 담을 `ho:` 범주가 없고, 신설하면 그것이 drift(직전 웨이브 Note-1 선례와 동일 판단) |
| emitter가 2개 plane 렌더 | `materialize.py::_render_execution_mode` | ✓ (§4) |

ACTIVATION 축 주석("4축·3치, standing은 orchestrator·inspection 뿐, D군 coordinator는 어느 쪽도 아님")
을 전체 16 Role에 대해 roleGuardrail로 기계 대조한 결과 **주석 = 그래프 정확 일치**:

```
standing (gr-online-execution)     : role-orchestrator, role-inspection            → 2
dispatch (gr-dispatch-execution)   : analyst auditor author benchmarker curator design
                                     implementer planner research strategist tester vnv
                                     synthesizer                                   → 13
neither                            : role-coordinator                              → 1
```
`ho:userFacing true` 역시 정확히 그 2개 standing role에만 존재 → doc-lag 없음.

### ② "사용자 의도 및 프로젝트에 맞게 적합한 방식 선택"

| 소스 구조 요소 | 표현 | 판정 |
|---|---|---|
| 선택 규칙 자체 | `id:gr-mode-fit` | ✓ |
| 선택 시점(프로세스 상 위치) | `wfs-assemble-minimums ho:stepGuardedBy gr-mode-fit` (step 5) + h-multiagent hasGuardrail | ✓ |
| 선택 대상(대안 집합) | `mode-sub-agents` ↔ `mode-standing-service` (+ agent-teams / hybrid) | ✓ |
| 선택 기준 | promptText: 요청 도착 방식·cadence·요청 간 연속성·조정 지연 허용치 | ✓ |
| 선택 입력(의도+프로젝트) | `dlv-intent-profile` — **산문 참조만, 그래프 엣지 없음** | **F2 (경미)** |
| default 금지·근거 명시 | promptText "Never settle that choice by default or by habit, and state which characteristic decided it" | ✓ |
| `gr-scale-modes`와의 구분 | promptText "Distinct from id:gr-scale-modes, which sizes HOW MUCH…" + 파일 주석 | ✓ |

### ③ "부족한 정보는 grill me처럼 사용자를 상대로 조사"

| 소스 구조 요소 | 표현 | 판정 |
|---|---|---|
| 역조사 규칙 | `id:gr-user-elicitation` (carrier 3: role-orchestrator roleGuardrail, wfs-intent-analysis stepGuardedBy, h-multiagent hasGuardrail) | ✓ |
| 프로세스 단계(맨 앞) | `id:wfs-intent-analysis` `ho:stepOrder 1` | ✓ |
| 산출 아티팩트 | `id:dlv-intent-profile` (stepProduces ← step1, stepConsumes → step2) | ✓ |
| 수행 주체 | `stepByRole id:role-orchestrator` + role의 roleGuardrail | ✓ |
| 질문을 오가는 채널 | `chan-agent-user` 재사용 | **out-of-model 정당**: TBox의 step 술어는 stepByRole/UsesTool/GuardedBy/Consumes/Produces/DependsOn 6종뿐 — step↔channel 술어가 없고 신설은 drift |
| 런타임 대응(입력이 여전히 얇을 때) | `fp-insufficient-input` 재사용, 주석에 보완관계 명시 | ✓ |
| 반응형 escalation·milestone gate와의 구분 | promptText에 `gr-no-arbitrary-decision`·`gr-human-checkpoint` 양쪽 판별절 | ✓ |
| 7→8단계 renumber | 아래 DAG 감사 | ✓ |

**compose 8단계 DAG 기계 감사 (끊긴 곳 0)**

```
1 wfs-intent-analysis   role=orchestrator guard=[gr-user-elicitation]          dep=[]  cons=[]                    prod=[dlv-intent-profile]
2 wfs-retrieve-pack     role=orchestrator tool=[tool-retriever]                dep=[1] cons=[dlv-intent-profile]  prod=[dlv-context-pack]
3 wfs-select-template   role=orchestrator                                      dep=[2] cons=[dlv-context-pack]    prod=[dlv-base-template]
4 wfs-bind-capabilities role=orchestrator guard=[gr-reuse-first]               dep=[3] cons=[dlv-base-template]   prod=[dlv-capability-bindings]
5 wfs-assemble-minimums role=orchestrator guard=[gr-integration-coherence, gr-mode-fit]
                                                                              dep=[4] cons=[dlv-capability-bindings] prod=[dlv-harness-spec]
6 wfs-write-individuals role=implementer  tool=[tool-editor] guard=[gr-controlled-vocabulary]
                                                                              dep=[5] cons=[dlv-harness-spec]    prod=[dlv-authored-individuals]
7 wfs-validate          role=vnv          tool=[tool-shell]  guard=[gr-verify-proceed]
                                                                              dep=[6] cons=[dlv-authored-individuals] prod=[dlv-validated-spec]
8 wfs-coverage-audit    role=vnv          guard=[gr-structural-coverage]       dep=[7] cons=[dlv-validated-spec]  prod=[]
```
- `stepOrder` 1..8 **연속·중복 없음** (contiguous == True)
- **dangling `stepConsumes` 0** (모든 소비 Deliverable이 어떤 step의 stepProduces)
- `stepDependsOn` 전부 **stepOrder 단조 증가** (역행 0)
- `wf-compose-harness` 정의문·tokenEstimate(57→141)·주석("seven-stage"→"eight-stage") 동기화됨

### ④ "동일 역할 여러 agent 동시 작업 + 적합한 해결책"

| 소스 구조 요소 | 표현 | 판정 |
|---|---|---|
| 상황 어휘 | `id:c-role-multiplicity` (`skos:broader c-multiagent`, `c-execution-mode`와의 판별절 포함) | ✓ |
| 해결책 (a) 클레임 = **언제** 시작 가능 | `id:gr-work-claim` | ✓ |
| 해결책 (b) 격리 = **어디에** 쓸 수 있나 | `id:gr-instance-isolation` | ✓ (분리 사유 주석에 명시) |
| 해결책 (c) 중복 클레임 오류행 | `id:fp-duplicate-claim` (failureCondition + recoveryStrategy 모두 존재, sibling 9/9 동일) | ✓ |
| 클레임 기판(board) | `chan-task-board` **재사용 의도** — 그러나 carrier가 선언 안 함 | **F1 (권고 수정)** |
| 병합 형태(fan-out/fan-in) | `pat-fanout-fanin` 산문 참조; carrier `appliesPattern` 비어 있음. 다만 emitted 문서 안에서 "declared fan-in step"은 `wf-multiagent` step 3 "Integrate and gate"로 해소됨 | 부분 ✓ / **pre-existing**(아래) |
| 병합 시 내용 충돌 | `fp-conflict-contradiction` 재사용, 판별절("여기서는 서로 동의해도 중복이 결함")로 구분 | ✓ |
| 공유파일 주소 규칙 | `gr-absolute-paths` 주석 참조(재저작 안 함) | ✓ anti-drift 준수 |

**신규 vocab 0건**: 본 웨이브는 `ho:` 클래스·프로퍼티를 하나도 신설하지 않았고
(TBox diff 없음), 기존 노드 재사용 원칙(Golden Rule #2, §1b [지킴])을 지켰다.

---

## 4. 정합성 스팟체크

### 4a. 대칭 쌍·판별절 (anti-drift)

모든 신규 노드가 **검색 대상 값(definition/promptText) 안에** 최근접 이웃과의 판별절을 갖는다:

| 신규 노드 | 판별 대상 | 위치 |
|---|---|---|
| `gr-online-execution` | `gr-dispatch-execution` | promptText "Counterpart of id:gr-dispatch-execution … addressed over its channels, never spawned per brief" |
| `c-online-agent` | `c-dispatch` | definition "The counterpart of id:c-dispatch, which governs the instant workers a dispatch summons" |
| `mode-standing-service` | `mode-sub-agents` / `mode-agent-teams` / `mode-hybrid` **3개 전부** | definition |
| `gr-mode-fit` | `gr-scale-modes` | promptText "Distinct from … which sizes HOW MUCH" |
| `gr-user-elicitation` | `gr-no-arbitrary-decision` + `gr-human-checkpoint` **양쪽** | promptText |
| `fp-duplicate-claim` | `fp-conflict-contradiction` | definition |
| `c-role-multiplicity` | `c-execution-mode` | definition |
| `gr-work-claim` ↔ `gr-instance-isolation` | 서로 | **`#` 주석에만** → 관찰 N5 |

class 내 중복 prefLabel 0(validate). 전-그래프 동일 label 13건은 전부 **클래스 교차**
(Concept "Traceability" vs Capability "Traceability" 등) 기존 관례 — 본 웨이브가 추가한 것 없음.

### 4b. 태그 / tokenEstimate / maturity 이웃 컨벤션 대조

| 노드 | type | tokenEstimate | chars/4 | maturity | tagged / broader |
|---|---|---|---|---|---|
| c-online-agent | Concept | — | (114) | — | `broader c-multiagent` |
| c-role-multiplicity | Concept | — | (161) | — | `broader c-multiagent` |
| mode-standing-service | ExecutionMode | 270 | 282 | draft | c-execution-mode |
| gr-online-execution | Guardrail | 100 | 122 | draft | c-online-agent |
| gr-mode-fit | Guardrail | 157 | 156 | draft | c-execution-mode |
| gr-user-elicitation | Guardrail | 138 | 137 | draft | c-composition |
| gr-work-claim | Guardrail | 77 | 77 | draft | c-role-multiplicity |
| gr-instance-isolation | Guardrail | 70 | 70 | draft | c-role-multiplicity |
| wfs-intent-analysis | WorkflowStep | 114 | 114 | draft | (step은 hasStep으로 도달) |
| dlv-intent-profile | Deliverable | 89 | 89 | draft | c-composition |
| fp-duplicate-claim | FailurePolicy | 166 | 165 | draft | (hasFailurePolicy로 도달) |

- Concept에 tokenEstimate/maturity 없음 = **정확히 이웃 관례**(전체 41 Concept 중 tokenEstimate 보유 0,
  maturity 보유 0). §1c 범위 밖이므로 결함 아님.
- ExecutionMode 4형제 전부 tokenEstimate가 chars/4보다 소폭 낮음
  (agent-teams 190/228, hybrid 105/113, sub-agents 105/121, standing 270/282) → 신규가 이웃과 **동일 편차대**,
  §1c는 존재만 요구(산식 무규정)이므로 결함 아님.
- 신규 11 노드 전부 **≥1개 inbound 엣지** 보유(고아 0) — validate reachability 261/261과 정합.

### 4c. prose `id:` 토큰 해소

abox 전체(트리플 + `#` 주석 포함) `id:`/`core:` 토큰 스캔 → **미해소 1건뿐이며 본 웨이브 무관**:
`harnesses.ttl:242`의 `id:ct-well-formed-skill-*` (의도적 와일드카드, HEAD부터 존재).
본 웨이브가 새로 넣은 참조는 **전부 실재 노드로 resolve**.

### 4d. materialize 산출물

`h-multiagent`:
- **2개 mode 모두 렌더** — `## Execution mode` 아래 Standing service mode / Sub-agent spawn mode 두 항목.
- 새 blurb: "The runtime topology, or topologies, this harness **activates** and coordinates…" (spawns→activates 반영 확인).
- **dangling `id:`/`core:` 토큰 0** (IriTokenResolver가 산문 내 참조를 prefLabel로 전부 치환:
  "Counterpart of **Dispatch-based execution**", "Distinct from **Scale execution modes**" 등).
- 신규 guardrail 3종이 올바른 자리에 emit: CLAUDE.md 운영규칙 + `.claude/agents/orchestrator.md`
  (online + elicitation) + `.claude/agents/inspection.md` (online만) → least-privilege 부분집합 유지.
- Process 섹션이 **1..8 renumber된 compose 단계**를 순서대로 렌더, step5에 "guarded by: Fit the
  activation mode…" 표시.
- **결정성**: 2회 산출 `diff -r` **IDENTICAL**.

`h-workspace-synthesis` (concurrency 배선 carrier):
- 새 guardrail 2종 + fp 행 정상 emit, dangling 토큰 0.
- **emitter 변경 격리 증명**: HEAD 워크트리 산출물과 diff한 결과, 산문 변경은 **execution-mode blurb
  1줄뿐**이고 나머지 diff는 전부 그래프 내용(신규 guardrail/fp/role + individualCount 245→261 +
  tokenEstimate 1672→1985). → `materialize.py` 변경의 부수 렌더링 영향 **0**.

### 4e. 두 plane 병기가 emitted 문서에서 모순으로 읽히는가 (검토 후 비-이슈)

h-multiagent 운영규칙에 `gr-dispatch-execution`("worker는 dispatch될 때만")과
`gr-online-execution`("지속 세션에서 도착 요청 처리")이 나란히 나온다. TTL의 SCOPE 주석은
emit되지 않지만, **두 promptText가 각자 자기 적용범위를 명시**하므로
(전자 "Worker agents…", 후자 "…leaves dispatch-scoped work to the workers a dispatch summons")
읽는 쪽에서 모순으로 붙지 않는다. 추가로 mode 섹션 blurb이 "two planes running at the same time"을
설명한다. **비-이슈로 판정.**

---

## 5. 발견 사항

### F1 — 권고 수정 (non-blocking, maturity 승격 전 처리 권장)

**`gr-work-claim`/`fp-duplicate-claim`이 전제하는 "shared task board"를 carrier harness가 선언하지 않는다.**

- `gr-work-claim` promptText: "each instance claims its work item **on the shared task board** before it starts"
- `fp-duplicate-claim` recoveryStrategy: "the earliest claim marker **on the board**"
- guardrails.ttl 주석: "the claimable board is `id:chan-task-board`"
- 그러나 실측 배선:
  ```
  chan-task-board  inbound = [(h-harness-factory, hasChannel)]      ← 유일
  h-workspace-synthesis  hasChannel = [chan-workspace]              ← board 없음
  h-workspace-synthesis  appliesPattern = []                        ← fan-out/fan-in 없음
  ```
- 결과: `materialize.py h-workspace-synthesis` 산출 CLAUDE.md는 line 28에서 "claim … on the shared
  task board"라고 지시하지만, 같은 문서의 `## Coordination channels` 섹션에는 **Workspace channel 하나뿐**
  — 빌드된 하네스 문서가 자기가 선언하지 않은 기판을 참조한다.
- 브리프가 밝힌 사유("h-multiagent에는 claim board 미선언이라 의도적으로 미배선")는 **h-workspace-synthesis에도
  똑같이 적용된다** — 배선이 board를 선언하지 않는 다른 harness로 옮겨간 것이라 사유가 전이되지 않는다.
- 제안(고치지 않고 기록만): `h-workspace-synthesis ho:hasChannel`에 `id:chan-task-board` 추가,
  또는 미선언 사유를 노드 주석에 명시(coverage 게이트의 "명시적·수용가능한 사유" 요건 충족).
- `pat-fanout-fanin`이 어떤 harness에도 `appliesPattern`으로 안 걸린 것은 **본 웨이브의 회귀가 아니다**:
  13개 DesignPattern 중 7개가 동일한 무배선 catalog-stock 상태이며(`ho:tagged`로 도달, validate 통과),
  게다가 "declared fan-in step"은 emitted 문서 안 `wf-multiagent` step 3 "Integrate and gate"로 해소된다.
  → 기록만, 수정 대상은 board 쪽.

### F2 — 경미: `wfs-assemble-minimums`의 산문 참조가 DAG 엣지로 뒷받침되지 않음

- step 5 정의문: "settle how each agent lane is activated … **from the intent profile** rather than by default"
- 실제: `wfs-assemble-minimums ho:stepConsumes` = `dlv-capability-bindings` **하나뿐**.
  `dlv-intent-profile`은 step 2로만 흐른다.
- workflows.ttl 주석이 "each produced by one step and **consumed by the next**"라는 선형 컨벤션을
  명시하므로 **의도적 선택일 수 있으나**, 그렇다면 산문 쪽 참조가 그래프로 복구 불가능해진다.
  `ho:stepConsumes`는 다치이므로 엣지 추가는 SHACL상 문제없다(step 5는 현재 1개 보유).
- 택일 권고(기록만): ① step 5에 `ho:stepConsumes id:dlv-intent-profile` 추가(비선형 DAG 허용) 또는
  ② 산문을 "from the analysed intent carried forward" 식으로 완화.

### F3 — 경미: execution-mode blurb이 무조건 복수형

`materialize.py::_render_execution_mode`의 새 blurb은 mode 개수와 무관하게 항상
"The runtime topology, **or topologies** … **each declared mode** is listed below"를 출력한다.
단일 mode harness(h-workspace-synthesis, h-coding, h-research, h-support, h-peer-mesh, h-harness-factory)
산출물에도 복수 가능성 설명이 붙는다. `len(modes) == 1` 분기로 단수 문장을 쓰면 더 정확.
**cosmetic, [지킴] 위반 아님, tools 변경이라 developer 범위 밖.**

### F4 — bookkeeping: self-report 개체수 오기

브리프/developer 자평 "253→261 (+8)". 실측은 **HEAD 245 → 250(직전 oversight 웨이브) → 261(본 웨이브 +11)**.
종점만 맞고 베이스라인·delta가 틀림. 그래프 무영향이나, 다음 웨이브가 이 숫자를 베이스라인으로 삼으면
전파되므로 기록한다.

### N5 — 관찰: `gr-work-claim` ↔ `gr-instance-isolation` 판별절이 주석에만 있음

본 웨이브의 다른 모든 신규 노드는 판별절을 **검색 대상 값(promptText/definition)** 안에 넣었는데
(§4a), 이 한 쌍만 `#` 주석에서만 서로를 구분한다. prefLabel("Claim before starting" vs
"Disjoint write scopes per instance")과 promptText(WHEN vs WHERE)가 겹치지 않아 near-synonym 위험은
낮지만, **주석은 emit되지 않으므로** 빌드된 CLAUDE.md 독자는 두 규칙이 왜 둘인지 알 수 없다.
ONTOLOGYSTYLE §1 [지킴] "노드는 자기설명적으로 — 좋은 prefLabel과 definition이 주석보다 낫다"에
비추어 선택적 강화 대상. **결함 아님.**

### N6 — 관찰: 기본 budget에서 intent 단계/산출물이 팩에 안 들어옴 (설계대로)

질의 ③에서 `wfs-intent-analysis`(rel 3.24)와 `dlv-intent-profile`(rel 3.24)은 900 budget 컷 경계에서
**IRI 오름차순 tie-break**로 탈락한다(같은 3.24에 35개가 몰림). `--budget 6000`에서 rank 101 / 72로
존재하고 seed 목록에도 있다. 핵심 노드 `gr-user-elicitation`이 #1, `wf-compose-harness`가 #5이므로
요청은 팩만으로 충분히 응답된다. **budget 정책이 설계대로 동작한 것이며 결함 아님.** 다만
"ask the user / questions" 류 자연어에 대한 step 노드의 **어휘 매칭이 약하다**(prefLabel
"Analyse intent and elicit gaps"에 질의어가 없음)는 점은 향후 altLabel 보강 여지.

---

## 6. 판정

**PASS-with-notes.**

- verification(규격): `validate.py` / `lint_uniformity.py` / `check_determinism.py` **3/3 PASS**,
  261/261 reachable, 고아 0, 중복 label 0, TBox 신설 0, dangling 참조 0.
- validation(목적): 사용자 요구 4건 전부 **표현 매핑 완결(GAP 0)**, 4/4 질의에서 담당 신규 노드가
  1~2위 랭크 + 결정적, compose 8단계 DAG 무결, 두 plane emitter 렌더 정상, 배선 격리 증명 완료.
- **수정 권고 1건(F1 = task-board 채널 미선언)**, 경미 3건(F2 DAG 산문-엣지 괴리 / F3 emitter 복수형 /
  F4 개체수 오기), 관찰 2건(N5 / N6). **어느 것도 게이트를 막지 않는다.**
- 다음 액션 라우팅 제안: F1·F2는 developer dispatch(노드 재저작), F3는 tools 후속,
  F4는 브리프 숫자 정정.
