# abox audit — DesignPattern (16) + ExecutionMode (3) + AssemblySection (13)

판정만(findings only). 편집·삭제 없음. 기준: roles-consolidation 감사와 동일 +
ONTOLOGYSTYLE [지킴]. 파일: `ontology/abox/core/spec/patterns.ttl`,
`ontology/abox/core/assembly/assembly-sections.ttl`.

## 재현 명령 (실행함)

- `python3 tools/validate.py` → **PASS** (SHACL·reachability·capabilities·assemblyOrder).
  - `✓ all 236 individuals reachable from a Harness`
  - `✓ 1 harness(es) declare a total assembly order; default holder resolves (13 sections)`
  - `✓ no duplicate labels within a class`
- 참조 카운트: `grep -rhE "(appliesPattern|hasExecutionMode|hasAssemblySection)[^.;]*(id:|core:)<id>\b"`
  를 **중앙(`ontology/`)** 과 **recipes(`harness-recipes/recipes/`)** 양쪽에 대해 실행.
  - 주의: prose 오탐 방지를 위해 **predicate 접두**(`appliesPattern …`/`hasExecutionMode …`)로만
    카운트했다. `skos:definition` 산문 속 id 언급(예: peer-mesh 정의가 orchestrator-workers를
    인용)은 wiring이 아니므로 제외했다 — 단순 `grep id:pat-…`는 이 때문에 부풀려진다.

## 참조 카운트 (predicate-level bindings)

| id | class | central bind | recipe bind | 비고 |
|---|---|---|---|---|
| pat-react | DesignPattern | 1 (h-coding) | 0 | |
| pat-planexec | DesignPattern | 1 (h-research) | 2 | |
| pat-reflection | DesignPattern | 1 (h-support) | 0 | |
| pat-orchestrator-workers | DesignPattern | 2 (h-multiagent, h-harness-factory) | 18 | |
| pat-ontology-composition | DesignPattern | 1 (h-multiagent) | 0 | |
| pat-peer-mesh | DesignPattern | 1 (h-peer-mesh) | 18 | |
| pat-pipeline | DesignPattern | 0 | 27 | recipes에서 대량 소비 |
| pat-fanout-fanin | DesignPattern | 0 | 0 | catalog stock |
| pat-expert-pool | DesignPattern | 0 | 0 | catalog stock |
| pat-producer-reviewer | DesignPattern | 0 | 0 | catalog stock |
| pat-supervisor | DesignPattern | 0 | 0 | catalog stock |
| pat-hierarchical-delegation | DesignPattern | 0 | 0 | catalog stock |
| pat-blackboard | DesignPattern | 0 | 0 | catalog stock |
| pat-agent-teams | DesignPattern | 0 | 0 | **deprecated** tombstone |
| pat-sub-agents | DesignPattern | 0 | 0 | **deprecated** tombstone |
| pat-hybrid | DesignPattern | 0 | 0 | **deprecated** tombstone |
| mode-agent-teams | ExecutionMode | 1 (h-peer-mesh) | 35 | |
| mode-sub-agents | ExecutionMode | 2 (h-multiagent, h-workspace-synthesis) | 0 | |
| mode-hybrid | ExecutionMode | 1 (h-harness-factory) | 0 | |
| as-overview … as-hooks (13) | AssemblySection | 1 each (h-multiagent 기본 order) | 0 | order 1–13, 아래 |

AssemblySection 13개는 모두 `id:h-multiagent`의 단일 `ho:hasAssemblySection` 목록
(harnesses.ttl:117–119)에 바인딩된다. 앞선 단순 grep이 4개만 잡은 것은 목록이 3줄에
걸쳐 있어(117~119) predicate 줄만 매칭했기 때문 — 실제로는 13개 전부 바인딩·validate가
"13 sections"로 확증. **orphan 아님.**

## per-node 판정

### DesignPattern
| id | 판정 | 근거 |
|---|---|---|
| pat-react | KEEP | h-coding 바인딩. 고유(reason↔act 루프). |
| pat-planexec | KEEP | h-research + recipe 2. 고유. |
| pat-reflection | KEEP | h-support 바인딩. 아래 producer-reviewer와 축 다름(self-critique). |
| pat-orchestrator-workers | KEEP | 최다 소비(central 2 + recipe 18). |
| pat-ontology-composition | KEEP | h-multiagent 바인딩. 고유(BOM composition). |
| pat-peer-mesh | KEEP | h-peer-mesh + recipe 18. mode-agent-teams와 **직교**(아래 A3). |
| pat-pipeline | KEEP | central bind 0이나 **recipe 27개가 appliesPattern으로 소비**. dead 아님 = neutral parts library 재고가 실사용됨. |
| pat-fanout-fanin | KEEP-but-clarify | bind 0(catalog). 정의상 orchestrator-workers와 겹침(중앙 coordinator+병렬 worker+integrate), 상호 대조절 없음(B1). |
| pat-expert-pool | KEEP-but-clarify | bind 0. supervisor와 겹침(둘 다 worker 라우팅/할당), 대조절 없음(B2). |
| pat-producer-reviewer | KEEP-but-clarify | bind 0. reflection과 겹침(critique→improve); 정의가 "rather than self-review"로 암시 대조만, 명시 id 참조 없음(B3). |
| pat-supervisor | KEEP | bind 0(catalog)이나 정의가 orchestrator-workers를 **명시 Contrast**(static pre-alloc vs dynamic runtime alloc). 판별 완비. |
| pat-hierarchical-delegation | KEEP | bind 0. 판별축 명확(2-level recursion, gr-depth-limit). |
| pat-blackboard | KEEP | bind 0. 정의가 pipeline·orchestrator-workers·peer-mesh를 **명시 Distinct/대조**. 판별 완비. |
| pat-agent-teams | KEEP | deprecated 묘비. mode-agent-teams가 supersede(병합이 deprecation으로 이미 기록됨). ID 재사용 금지 원칙 + c-execution-mode 태그로 reachable. |
| pat-sub-agents | KEEP | deprecated 묘비 → mode-sub-agents. 동상. |
| pat-hybrid | KEEP | deprecated 묘비 → mode-hybrid. 동상. |

### ExecutionMode
| id | 판정 | 근거 |
|---|---|---|
| mode-agent-teams | KEEP | 최다 소비(recipe 35). 판별(persistent peer team). |
| mode-sub-agents | KEEP | central 2. 판별(spawn-and-reclaim), agent-teams를 명시 대조. |
| mode-hybrid | KEEP | h-harness-factory. 판별(phase-varying). 세 모드 상호 cross-ref 완비. |

### AssemblySection
전 13개 **KEEP**. `ho:assemblyOrder`가 1..13 **연속·유일**(overview1, persona2,
operating-rules3, process4, model5, roles6, channels7, skills8, execution-mode9,
data-flow10, error-handling11, test-scenarios12, hooks13). `ho:sectionKind` 전부 유일,
TBox의 closed set과 1:1. **순서 충돌·중복 섹션 없음**(validate "total assembly order"로 확증).
조건부 섹션(roles/channels/skills + 9~13 run-behaviour)은 해당 파트 없을 때 무발화로 정합.

## overlap 군집

- **A. 저작으로 판별 완료 (KEEP, 손대지 말 것 — anti-drift FIRST):**
  - A1 `pat-pipeline` ↔ `pat-blackboard` — blackboard 정의가 "Distinct from id:pat-pipeline
    …blackboard는 coordination MEDIUM을 제약, 순서가 아님"으로 명시 대조.
  - A2 `pat-orchestrator-workers` ↔ `pat-supervisor` — supervisor 정의가 "Contrast
    id:pat-orchestrator-workers … static pre-alloc vs dynamic runtime alloc" 명시.
  - A3 `pat-peer-mesh`(DesignPattern) ↔ `mode-agent-teams`(ExecutionMode) — **의도된
    직교축**. peer-mesh = 통신 topology(직접 vs 허브), agent-teams = spawn lifecycle
    topology(지속 팀 vs spawn-reclaim). TBox(harness.ttl:253)가 orthogonality를 명시하고
    "appliesPattern에 conflate 금지"라 경고. `id:h-peer-mesh`가 **두 축을 동시 바인딩**
    (appliesPattern pat-peer-mesh + hasExecutionMode mode-agent-teams)해 직교 실증.
    → **진짜 중복 아님. 유지.** (단, 두 prefLabel이 모두 "peer/Peer"를 포함 = 경미한
    discoverability 근접 신호. 결함 아님, 관찰만.)
  - A4 deprecated 3(agent-teams/sub-agents/hybrid) ↔ mode-* 3 — supersession으로 이미
    "병합" 완료. 재병합/삭제 불필요(묘비 유지가 규약).

- **B. 근접-동의어이나 상호 명시 대조절 부재 (KEEP-but-clarify, non-blocking 권고):**
  - B1 `pat-fanout-fanin` ↔ `pat-orchestrator-workers` — 둘 다 중앙 coordinator + 병렬
    worker + 통합. 구분축(fan-out=data-parallel homogeneous split/merge vs
    orchestrator-workers=heterogeneous 전문화 위임)은 합당하나 어느 정의에도 상호 참조 없음.
  - B2 `pat-expert-pool` ↔ `pat-supervisor` — 둘 다 worker 선택/할당. 구분축(content-based
    per-request routing vs 상태변화 기반 dynamic re-allocation)은 있으나 cross-ref 없음.
  - B3 `pat-producer-reviewer` ↔ `pat-reflection` — 둘 다 critique→improve.
    producer-reviewer가 "rather than self-review"로 암시만, reflection id 명시 참조 없음.
  - 권고: A1/A2/A4처럼 각 정의에 한 절짜리 상호 "Contrast id:…" 추가(저작 = developer
    dispatch 대상). **결함(REMOVE/MERGE) 아님** — 판별 근거 자체는 존재, 명시성만 미흡.

## orphan (predicate binding 0) 목록

- **catalog stock (0/0, 그러나 reachable·의도된 재고 — orphan 아님):**
  pat-fanout-fanin, pat-expert-pool, pat-producer-reviewer, pat-supervisor,
  pat-hierarchical-delegation, pat-blackboard. `ho:tagged id:c-pattern-taxonomy`
  (→ `skos:broader id:c-multiagent`)로 Harness에서 reachable, validate PASS. "neutral
  parts library" 원칙상 미소비 재고는 정상(추후 recipe가 선택할 부품).
- **deprecated 묘비 (0/0):** pat-agent-teams, pat-sub-agents, pat-hybrid.
  `ho:maturity "deprecated"` + `ho:tagged id:c-execution-mode`로 reachable. 유지가 규약.
- pat-pipeline: **중앙 0이지만 recipe 27 = 진짜 orphan 아님.**
- **진짜 dead node = 없음.** 삭제 대상 없음.

## anti-drift FIRST 판정 (criterion 4)

핵심 축 분리 두 건 — (i) coordination pattern(appliesPattern) vs execution mode
(hasExecutionMode), (ii) 활성 mode-* vs deprecated pat-* — 은 모두 **설계된 직교/supersession**
이며 TBox 정의·h-multiagent/h-peer-mesh 이중 바인딩으로 실증된다. **진짜 중복 아님, 유지.**

## [지킴] / 스타일 관찰 (결함 아님)

- `ho:tokenEstimate`: ExecutionMode·AssemblySection은 일관 보유. DesignPattern은
  대부분 미보유(pat-blackboard만 200). §1c 범위는 promptText 보유 노드(SystemPrompt/
  Instruction/Guardrail/Example) + Tool/Workflow — DesignPattern은 `skos:definition`만
  가지는 definition-only 노드라 **범위 밖**. 부재는 [지킴] 위반 아님, pat-blackboard의
  존재도 무해. → 결함 아님(관찰만).
- duplicate prefLabel: validate "no duplicate labels within a class" = 0. 통과.

## 종합

- **REMOVE: 0. MERGE: 0.** (deprecated 3은 이미 병합-기록된 묘비라 유지.)
- **KEEP: 26 / KEEP-but-clarify: 4**(pat-fanout-fanin, pat-expert-pool,
  pat-producer-reviewer + 위 B군 3쌍 상호 대조절 권고).
- 구조 게이트(verification) PASS, 목적/판별(validation) 통과 — 근접-동의어 B1~B3 3쌍의
  명시-대조 보강만 non-blocking 권고. 라우팅: 보강 채택 시 developer dispatch(정의 산문
  1절 추가), 축 설계 재검토 불요(A3 직교 유지).
