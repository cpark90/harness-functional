# Dispatch brief — agent memory 3-tier 모델 (schema 확장)

> 작성: orchestrator (2026-07-23). 실행: **developer dispatch(opus)** = TBox + shapes + ABox. 이후 **vnv dispatch** 판정.
> 요청(사용자): 에이전트 memory 3종을 온톨로지에 반영 —
> ① **firmware**: 매 실행/spawn 시 **전체 내용을 필수로 전량 확인**하는 memory.
> ② **cache**: spawn된 task 내부에서 **소멸될 때까지 누적되는 에이전트 행동규칙**을 저장하는 memory.
> ③ **long-term**: 매 실행/spawn엔 안 읽지만 **특정조건 달성 시 해당 부분을 확인·반영**하는 memory.

## 0. GAP 근거 (왜 schema 확장인가)
현 표현은 `ho:roleMemoryPolicy`(Role에 붙는 string directive) **하나뿐** — 3종 memory의 read-timing/persistence 구분을
담을 **어휘 범주(class)가 없다**. CLAUDE.md coverage-audit gate: "담을 어휘 범주 자체가 없다면 조용히 건너뛰지 말고
schema(TBox) 확장을 먼저 트리거." → 신규 `ho:Memory` 컴포넌트 타입 + 구분 속성 필요.

## 1. 설계 원칙 (기존 패턴 재사용 — Golden Rule #2)
- **컴포넌트화**: `ho:hasChannel`/`ho:hasRole`와 **동일 패턴**. `ho:Memory rdfs:subClassOf ho:HarnessComponent`,
  `ho:hasMemory rdfs:subPropertyOf ho:hasComponent`(Harness→Memory). ⇒ 기존 `ho:ComponentConnectivityShape`
  (targetClass ho:HarnessComponent)가 그대로 적용돼 **bespoke shape 없이 orphan-free·reachable**. (AssemblySection 주석의
  "subject IS the Harness → hasComponent sub-property" 논리와 동일.)
- **reachability anchor**: 3 memory 개체를 **`id:h-multiagent`에 `ho:hasMemory`로 부착** → 파생 harness(h-peer-mesh,
  workspace-synthesis, 전 recipe)에 상속(AssemblySection이 h-multiagent에 붙는 방식과 동일).
- **파일 배치(중요, blast-radius 회피)**: **신규 core unit(`memory.ttl`) 만들지 말 것.** 새 unit은 root ontology
  owl:imports + 중앙 catalog + **모든 recipe catalog**(진행 중 inc3 5개 포함) 동기화를 요구한다. 대신 **기존 unit에 additive**로
  넣으면 TBox(schema)·기존 ABox 파일 경유로 recipe union에 **카탈로그 변경 없이 전파**된다. → 배치:
  - TBox class/props: `ontology/tbox/harness.ttl`
  - shape(선택): `ontology/shapes/harness-shapes.ttl`
  - Memory 개체 3개: **`ontology/abox/core/roles.ttl`** (roleMemoryPolicy와 co-locate — agent-state 인접; 주석으로 사유 명시)
  - concept `id:c-memory`: `ontology/abox/core/concepts.ttl`
  - `hasMemory` 부착: `ontology/abox/core/harnesses.ttl` (h-multiagent 노드)
  (memory가 향후 성장하면 별도 unit 승격은 후속 옵션 — 지금은 additive.)

## 2. TBox delta (`ontology/tbox/harness.ttl`)
predicate order·주석 밀도는 인접 선언(`ho:sectionKind`, `ho:hasChannel`) 관례 따를 것.
- `ho:Memory a owl:Class ; rdfs:subClassOf ho:HarnessComponent ; rdfs:label "memory" ; skos:definition "A memory store an agent/harness maintains, distinguished by WHEN it is read relative to execution and HOW LONG it persists: the always-loaded baseline (firmware), the task-scoped volatile working store (cache), and the durable store consulted only on a trigger (long-term). A first-class harness component so an agent's memory architecture is explicit, not buried in a free-text policy."`
- `ho:hasMemory a owl:ObjectProperty ; rdfs:subPropertyOf ho:hasComponent ; rdfs:domain ho:Harness ; rdfs:range ho:Memory ; rdfs:label "has memory" ; skos:definition "Binds a memory tier the harness's agents maintain to the harness (Harness→Memory). A sub-property of ho:hasComponent, so bound memories are reachable, orphan-free components covered by ho:ComponentConnectivityShape."`
- 구분 datatype props (domain `ho:Memory`, range `xsd:string`, 닫힌 값집합은 definition에 명시):
  - `ho:memoryReadTiming` — "When the memory is read relative to agent execution, from a closed set: \"every-execution\" (read in full on every run/spawn), \"task-continuous\" (accumulated/consulted throughout a single spawned task), \"conditional\" (read only when a defined trigger condition is met)."
  - `ho:memoryPersistence` — "Whether the memory survives across spawns, from a closed set: \"durable\" (persists across executions/spawns) or \"ephemeral\" (discarded when the spawned task ends)."
  - `ho:memoryReadScope` — "How much of the memory is read when it is consulted, from a closed set: \"full\" (entire content) or \"selective\" (only the relevant portion)."
  - `ho:memoryActivationCondition` — "For a conditional (long-term) memory, the trigger under which the agent consults and reflects the relevant portion; absent for memories read unconditionally." (선택적, long-term에만)

## 3. ABox delta
### 3a. concept (`concepts.ttl`)
`id:c-memory a ho:Concept ; skos:prefLabel "Agent memory" ; skos:definition "The memory architecture an agent maintains -- the firmware/cache/long-term tiers distinguished by read-timing and persistence." ; skos:topConceptOf id:scheme ; skos:related id:c-autonomy .`
(broader 후보가 더 맞으면 governance/autonomy 개념에 `skos:broader` — developer 판단. orphan 금지.)

### 3b. Memory 개체 3개 (`roles.ttl`, 각 `ho:maturity "draft"`·`ho:tokenEstimate`·`ho:tagged id:c-memory` (+ 적절시 `id:c-multiagent`))
| 개체 | prefLabel | readTiming | persistence | readScope | activationCondition |
|---|---|---|---|---|---|
| `id:mem-firmware` | Firmware memory | `every-execution` | `durable` | `full` | — |
| `id:mem-cache` | Cache memory | `task-continuous` | `ephemeral` | `full` | — |
| `id:mem-longterm` | Long-term memory | `conditional` | `durable` | `selective` | (설정) |

- `id:mem-firmware` skos:definition ≈ "The fixed baseline memory an agent MUST read in full on every execution/spawn: its always-loaded, mandatory ruleset, read whole each time so it frames behaviour before any task-specific state."
- `id:mem-cache` skos:definition ≈ "The task-scoped working memory that accumulates the agent's behaviour rules within a single spawned task and is discarded when that task ends: volatile, internal to the spawn, never surviving it."
- `id:mem-longterm` skos:definition ≈ "Durable memory NOT read on every execution/spawn; the agent consults and reflects only the relevant portion when a defined condition is met, pulling it in selectively on demand rather than loading it each time." + `ho:memoryActivationCondition "A defined trigger condition is met (e.g. the current task matches the memory's applicability); only then is the relevant portion consulted and reflected."`

### 3c. 부착 (`harnesses.ttl`, `id:h-multiagent`)
`id:h-multiagent`에 `ho:hasMemory id:mem-firmware, id:mem-cache, id:mem-longterm ;` 추가(기존 술어 블록 순서 안에). 이 한 줄이 reachability + 파생 상속을 준다.

## 4. shape (`harness-shapes.ttl`, 선택이나 권장)
`ho:MemoryShape a sh:NodeShape ; sh:targetClass ho:Memory ;` — `skos:prefLabel` min1, `skos:definition` min1,
`ho:memoryReadTiming` min1, `ho:memoryPersistence` min1, `ho:maturity` min1. (3-tier 구분이 장식 아닌 **강제**가 되게;
readScope/activationCondition은 optional.) 인접 `ho:AssemblySectionShape` 형식을 따를 것.

## 5. 검증 (developer 자기검증 → vnv 최종판정)
1. **중앙**: `/usr/bin/python3 tools/validate.py` → **PASS**(개체 수 +4: mem×3 + concept×1; 4 체크 green, 특히
   reachability에서 mem 3개가 h-multiagent 경유 reachable, ComponentConnectivityShape 통과).
2. **recipe 무영향 spot-check**(중앙 변경=blast radius, roadmap §5 D4): 최소 1개 recipe per-recipe closure 재검증 PASS
   — 예: `cd staging/harness-recipes && HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/21-code-reviewer /usr/bin/python3 central/tools/validate.py` (심링크 central=working-tree). mem 3개가 recipe union에도 상속되어 나타나되 recipe 검증을 깨지 않는지 확인.
3. **coverage audit**(vnv): 소스 3요소(firmware/cache/long-term) 각각이 한 표현(mem 개체 + 구분 속성)으로 매핑됐고,
   read-timing/persistence/조건-반영 의미가 누락 없이 담겼는지 확인. 표현 밖으로 둔 요소 없음.

## 6. 경계
- developer: §2~4 지정 파일·노드만. materialize.py 렌더링(예 CLAUDE.md "Memory" 섹션)은 **이번 범위 아님**(온톨로지 표현이
  요청의 핵심). 렌더 필요는 별도 후속(assembly section 확장)으로 flag만. git 금지.
- 신규 값·개념은 §1 배치 규율 준수(신규 core unit 금지, 기존 unit additive). 애매지점은 임의결정 말고 flag.
