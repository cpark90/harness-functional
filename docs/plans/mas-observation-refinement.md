# MAS 이론 재정리 — agent = partially-observed distributed node, 인지영역 ≡ 역할

> 작성: orchestrator (2026-07-23). 사용자 방향: 현 agent-활용 구조를 multi-agent system theory로 모델링,
> 각 agent를 **partially-observed distributed**로 가정, **인지영역(observation region) ≡ 역할**로 일치,
> **harness = agent를 coding한 source code**. 이에 맞게 온톨로지를 세분화.
> 성격: 기존 Role/Memory/Channel/least-privilege/bounded-context를 관통해 **통일하는 이론 backbone** — 폐기가 아니라 승격·세분화.
>
> **읽는 법 (2026-09 재배치 + 후속 개정)**. 이 문서가 살아 있는 이유는 **이론 backbone**
> (Dec-POMDP 대응, 4단 정보공간 투영 사슬, 관측≠행동 분리)이지 아래의 wave 지시가 아니다.
> 두 가지를 보정해 읽는다:
> 1. **`ho:ObservationArea`는 더 이상 없다.** 이 문서가 쓴 단일 클래스는 이후
>    `docs/plans/disambiguation-audit.md` §A에서 **`ho:ObservationSpace`(Ω_i) +
>    `ho:AreaOfInterest`(원하는 관측) + `ho:AreaOfObservation`(실제 관측)** 셋으로 분할됐고,
>    area 크기 술어도 `ho:tokenEstimate`에서 **`ho:observedTokenVolume`**으로 분리됐다.
>    현 TBox가 원본이다 — 이 문서의 클래스·술어 이름을 그대로 저작하지 않는다.
> 2. **저장소가 둘로 갈렸다.** TBox·shapes는 **harness-functional**
>    (`ontology/tbox/harness.ttl`·`ontology/shapes/harness-shapes.ttl`), 개체(ABox)는
>    **harness-concrete**(`ontology/abox/core/<group>/*.ttl`)다. 아래의 `roles.ttl`·
>    `harnesses.ttl`·`domains-tasks.ttl` 같은 flat 파일명은 재배치 이전 표기이며, 지금은
>    concrete의 그룹 디렉토리(`organization/`·`wholes/`·`spec/` …)에 흩어져 있다.

## 1. 프레임 (선택한 형식)
현 시스템(orchestrator + dispatch되는 worker + 별도 세션 inspection)을 **탈중앙 부분관측 다중에이전트 시스템**
(Dec-POMDP-Com 계열)으로 본다. 각 agent = **분산 노드**로서 (1) 전역상태 S의 국소 투영 **O_i(인지영역)** 만 관측,
(2) 제한된 행동집합 **A_i** 안에서만 작용, (3) 신념 **b_i**(메모리)를 보유, (4) **명시적 메시지(채널)로만** 협응한다.

**harness = agent의 source code**: Harness 조립(SystemPrompt+guardrail+tool+memory+channel+observation+model)이
materialize로 **agent 프로그램**(`.claude/agents/<role>.md` + `CLAUDE.md`)으로 **컴파일**된다. Role=agent 모듈,
spawn된 실행=프로세스, materialize=컴파일러. 즉 harness가 정의하는 것이 곧 그 agent의 π_i·O_i·A_i·b_i다.

## 2. 매핑 (MAS 개념 ↔ 온톨로지 현행) + 결손
| MAS 개념 | 현행 온톨로지 | 상태 |
|---|---|---|
| Agent i | `ho:Role`(harness가 인스턴스화) | **EXISTING** — "agent = harness가 컴파일한 Role"로 명시화만 |
| 전역상태 S | 온톨로지 store + repo + in-flight artifact | 세계이므로 미모델(정상) |
| **관측함수 O_i / 인지영역 Ω_i** | 암묵·분산: retrieve budget + roleTool read + roleMemoryPolicy + channel 참여 | **GAP → 신규 first-class `ho:ObservationScope`** |
| 부분관측성(partiality) | dispatch(오케는 worker 내부 미관측)·별도세션·bounded-context | EXISTING(guardrail) — 관측 의미로 세분화 |
| 행동집합 A_i | `ho:roleTool`(least-privilege 행동) | EXISTING — 행동공간으로 프레이밍 |
| 정책 π_i | `rolePersona`(SystemPrompt)+`roleGuardrail`+`Workflow` | EXISTING — 정책으로 프레이밍 |
| 신념 b_i | **Memory tier**(firmware/cache/long-term, 방금 추가) | EXISTING — 역할별 관측과 결속(세분화) |
| 통신/협응 | `ho:Channel`(dispatch/peer/workspace/task-board/agent-user) | EXISTING — 방향성 관측공유 edge로 세분화 |
| 협응 topology | `ho:DesignPattern`(orchestrator-workers/peer-mesh/실행모드) | EXISTING(+revfactory) |
| 목표 R | `ho:Task`/`Deliverable` + `Contract`/`TestScenario` 수용 | EXISTING |

## 3. 핵심 세분화 — Agent(composite) + ObservationArea(인지영역, internal/external, multi-AOI)
### 3a. Agent = 분리된 composite 노드 (사용자 결정 Q1)
`ho:Agent`를 **first-class로 신설**한다. agent는 **role + 인지영역 + 기능들을 포함**하는 분산노드다(사용자: "분리하는 것이 좋다"):
- `ho:agentRole`(Agent→Role) — 그 agent의 **mandate + 정책 π_i**(기존 Role의 persona·guardrail 재사용; Role은 backward-compat 유지).
- `ho:agentObservation`(Agent→ObservationArea) — 그 agent의 **인지영역 O_i**(≥1, 아래 3c).
- `ho:agentFunction`(Agent→Capability) — 그 agent의 **기능들 A_i**(수행 능력).
Role은 그대로 두고(폐기 아님) Agent가 이 셋을 묶는 상위 노드다.

### 3b. 관측 ≠ 행동 (분리)
MAS는 **O_i(지각)** 와 **A_i(작용)** 를 분리한다. 현 `roleTool`은 read(관측)+write(행동)를 뭉갠다. 예: inspection은
설계그래프 **전체를 관측**(넓은 O)하나 **feedback에만 작용**(좁은 A). 인지영역은 이 **관측(지각) 영역**을 first-class화한다.

### 3c. `ho:ObservationArea`(⊑HarnessComponent) — 인지영역, internal/external, 다중 AOI (사용자 결정 Q3)
한 agent는 **여러 observation area(area of interest)** 를 갖고, **최소 1개는 필수**(hard). 각 area는:
- **`ho:observationKind`**: `internal`(agent를 **구성하는 부분들**을 관측 — 자기 role/memory/function 등 introspection) 또는
  `external`(구성요소 **밖**을 관측 — 환경·타 agent 산출·외부 파일).
- internal area → `ho:observesComponent`(→그 agent의 구성 HarnessComponent). external area → `ho:observesChannel`(→Channel)·`ho:observedFileScope`(datatype, read 경계)·(도메인/타 agent 산출).
- 공통: `ho:observesMemory`(→Memory tier, 신념 b_i; firmware=공통 prior 항상·cache=자기 에피소드·long-term=조건부) → **각 에이전트별 memory 특징**(이전 미해결)이 여기서 해소. `ho:tokenEstimate`(이 area가 한 추론에 기여하는 **입력데이터 크기**)·`ho:unobserved`(datatype, 명시적 partiality).

### 3d. 인지능력 기준 인지영역 설정 + 역할↔인지영역 효율 매칭 (사용자 정정 — identity 아님)
"인지영역 ≡ 역할"의 **동일시가 아니다.** 두 개념을 분리:
- **인지능력 `ho:cognitiveCapacity`(Agent)**: 한 번의 추론에 **정보 누락 없이** 쓸 수 있는 세션 크기(loss-free context). 모델이 결정(mc-* 파생), context-rot 이전 신뢰 구간.
- **인지영역(observation region)**: 작업을 위해 **한 추론에 투입되는 입력데이터** = 그 agent의 ObservationArea들의 실제 내용(크기=area별 `ho:tokenEstimate` 합).
설정 규율:
1. **용량 적합(hard 원칙)**: Σ(area tokenEstimate) ≤ cognitiveCapacity. 초과=정보누락(context-rot) → **역할을 분해**(node-scoped dispatch가 존재하는 근본 이유)하거나 관측 축소. (SHACL은 합산 강제 어려우므로 값은 **기록**하고 fit은 tool/리뷰 검사; AgentShape hard는 agentRole≥1·agentObservation≥1·cognitiveCapacity 존재.)
2. **역할↔인지영역 효율 매칭**: 최고 효율을 위해 **인지영역에 맞는 역할** 또는 **역할에 맞는 인지영역**을 할당 — 역할의 정보요구와 인지영역이 상호 fit되고 그 인지영역이 인지능력 안에 든다. mismatch=비효율(과소=용량낭비, 과대=누락). 온톨로지가 cognitiveCapacity·area tokenEstimate를 기록해 mismatch가 inspectable.
→ least-privilege/bounded-context는 이 축에서 **"인지영역을 역할 정보요구에 최소-충분하게, 인지능력 안에 맞추기"** 로 재해석된다.

### 3e. 정보공간 계층 — 관측의 투영 사슬 (사용자 다이어그램 반영)
Local Observation(O_i)은 4단계 중첩 정보공간의 **투영 사슬 말단**이다:
1. **Environment Space** — 세상의 모든 현실/시스템 공간 + 무한 정보. 시스템 밖 무한 소스. 단일 anchor 노드(비-HarnessComponent).
   ↓ *문제 정의*(특정 도메인 + 관심 정보군 선택)
2. **Domain Space** = 기존 **`ho:Domain`** — 문제해결 대상 영역 + 관련 데이터 범주.
   ↓ *시스템을 설명하는 전역 정보*
3. **Global State Space** = 신규 **`ho:GlobalState`** — 도메인 내 시스템을 서술하는 전역 상태(Dec-POMDP의 S).
   ↓ *에이전트 한계*(cognitiveCapacity / 관측함수 O_i)
4. **Local Observation** = 기존 **`ho:ObservationArea`** — 각 agent가 전역상태에서 투영받는 지역 관측.
투영 edge: `ho:scopedFrom`(Domain→EnvironmentSpace) · `ho:describesDomain`(GlobalState→Domain) · `ho:hasGlobalState`(Harness→GlobalState) · `ho:projectsFrom`(ObservationArea→GlobalState). ⇒ ObservationArea가 **전역상태의 부분투영**이며 그 partiality의 원인(agent 한계)이 그래프에 명시된다. 이로써 "왜 각 agent는 세계 전체가 아니라 일부만 보는가"가 형식화됨.
**델타**: TBox `ho:EnvironmentSpace`·`ho:GlobalState`(비-HarnessComponent, Domain 꼴) + 위 4 투영 속성. tools: 4 투영 술어를 `ontology_lib.INSTANCE_LINK_PREDICATES`에 추가(reachability 연결). ABox: env-space 1 + global-state 1(describesDomain 관련 Domain, hasGlobalState on h-multiagent) + ObservationArea들에 `projectsFrom` 링크. Domain은 기존 재사용.

## 4. 델타 (세분화 저작)
**TBox**(harness.ttl):
- 클래스: `ho:Agent ⊑ ho:HarnessComponent` · `ho:ObservationArea ⊑ ho:HarnessComponent`.
- 결속/배선: `ho:hasAgent ⊑ ho:hasComponent`(Harness→Agent, reachability) · `ho:agentRole`(Agent→Role) · `ho:agentObservation`(Agent→ObservationArea) · `ho:agentFunction`(Agent→Capability). ObservationArea reachability는 **propertyChain rollup**(`hasComponent o hasAgent o agentObservation`, 기존 WorkflowStep rollup 관례 미러링) 또는 필요시 hasComponent 하위술어로.
- 인지능력: `ho:cognitiveCapacity`(datatype int, domain ho:Agent) — loss-free 세션 크기. (mc-* ModelConfig 파생값과 정합; 필요시 ModelConfig에도 선언해 agent가 상속.)
- 관측 술어: `ho:observationKind`(datatype internal|external) · `ho:observesComponent`(ObservationArea→HarnessComponent) · `ho:observesChannel`(→Channel) · `ho:observesMemory`(→Memory) · datatype `ho:observedFileScope`·`ho:unobserved`. (area 크기는 기존 `ho:tokenEstimate` 재사용.)
**shape**(harness-shapes.ttl): `ho:AgentShape`(agentRole min1 · **agentObservation min1**[hard] · **cognitiveCapacity min1** · prefLabel · maturity) + `ho:ObservationAreaShape`(observationKind sh:in{internal,external} min1 · tokenEstimate min1 · prefLabel · maturity · observes* ≥1 soft). 용량적합(Σarea ≤ capacity)은 SHACL 합산 한계로 **tool/리뷰 검사**(값은 기록).
**ABox**(harness-concrete — 당시 flat `roles.ttl` 개체 + `harnesses.ttl` 배선, 지금은 각각 `abox/core/organization/`·`abox/core/wholes/`): 운영 agent 5개 — orchestrator/developer/vnv/inspection/synthesizer. 각 `agentRole`=대응 Role, `agentObservation`=internal+external area(≥1), `agentFunction`=Capability. ObservationArea 개체를 role별로 선언(예: orchestrator external={전 dispatch 채널·feedback}·internal={자기 계획상태}·unobserved=worker 내부; developer external={자기 brief·배정 노드 read·budget=pack}·internal={자기 role/memory}·unobserved=타 노드·타 worker; inspection external={설계그래프 전체 read·feedback}, A=feedback만). **host=`h-multiagent`에 `hasAgent` 배선**(hasAgent는 emitter 없어 CLAUDE.md byte 불변 — Memory 선례; materialize round-trip으로 byte-identity 확인). ObservationArea는 HarnessComponent이므로 rollup/배선으로 orphan 0(B1 교훈).
**문서**: harness=source-code / agent=compiled-composite / O·A·π·b 대응을 명문화. (재배치 후 후보 위치는 **harness-concrete의 `docs/composition-methodology.md`** — 조립 방법론 문서가 그쪽으로 이관됐다.)

## 5. 이 재정리가 통일하는 것 (기존 부품 = MAS facet)
Agent=분산노드 · agentRole(Role)=mandate/π_i · agentFunction(Capability)/roleTool=A_i · persona+guardrail+workflow=π_i ·
Memory tier=b_i · Channel=통신 · DesignPattern=topology · bounded-context/least-privilege=관측 최소성 · dispatch/별도세션=partiality.
**신규 축은 Agent(composite) + ObservationArea(O_i, internal/external, 다중)** — 나머지를 이 축으로 재해석. → 온톨로지가
"부품 카탈로그"에서 "**부분관측 분산 agent의 형식 모델**"로 세분화.

## 6. 확정 결정 (사용자 2026-07-23) + wave 계획
- **Q1 Agent**: `ho:Agent` **신설**(role+인지영역+기능 포함 composite). **Q2**: **풀 MAS 레이어**. **Q3**: ObservationArea **internal/external** 구분 + **다중 AOI, ≥1 필수(hard)**. **Q4**: **MAS 우선**, revfactory P2~P4는 B1-clean에서 대기.
- **Wave 계획(순차, 파일 배타)** — 아래 wave는 **작성 당시(단일 저장소·`ObservationArea` 시절)
  의 기록**이다. 재배치 후 W1은 harness-functional, W2·W3의 ABox 몫은 harness-concrete이고,
  `roles.ttl`→`abox/core/organization/roles.ttl`, `harnesses.ttl`→`abox/core/wholes/harnesses.ttl`,
  `domains-tasks.ttl`→`abox/core/spec/domains-tasks.ttl`, 관측 개체→`abox/core/observational/observation.ttl`:
  - **MAS-W1**(TBox+shapes): 위 클래스/술어/propertyChain + AgentShape/ObservationAreaShape. 파일 `tbox/harness.ttl`+`shapes/harness-shapes.ttl`. validate PASS(인스턴스 0).
  - **MAS-W2**(ABox): Agent 5 + ObservationArea(internal/external) 개체 + `h-multiagent` hasAgent 배선. 파일 `roles.ttl`+`harnesses.ttl`. validate PASS + materialize byte-identity(CLAUDE.md 불변) + recipe federate spot-check. (진행 중)
  - **MAS-W3**(정보공간 계층 §3e): TBox `ho:EnvironmentSpace`/`ho:GlobalState` + 4 투영속성(`tbox/harness.ttl`) · tools `INSTANCE_LINK_PREDICATES` +4(`ontology_lib.py`) · ABox env-space/global-state 개체 + `h-multiagent hasGlobalState` + ObservationArea들에 `projectsFrom`(`roles.ttl`+`harnesses.ttl`+`domains-tasks.ttl`). **W2 후**(ObservationArea projectsFrom 링크가 roles.ttl 재편집). validate PASS + reachability(투영 사슬).
  - **MAS-W4**(vnv + 문서): vnv 판정·coverage audit(MAS 개념·정보공간 계층 ↔ 표현) → `docs/verify/`; harness=source-code/agent=compiled/4-space 계층 문서 명문화(별도 developer).
