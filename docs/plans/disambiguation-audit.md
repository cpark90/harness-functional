# 의미구분 disambiguation audit (혼동 개념 정리)

> 작성: orchestrator (2026-07-23). 사용자 요청: ObservationArea를 observation space + area of interest로 분리 + 의미 모호한 부분 전체 정리.
> 방법: TBox 29 클래스 정의를 훑어 **정의가 겹치거나 자기지칭(A를 A로 정의)하는** 혼동쌍 식별.
>
> **읽는 법 (2026-09 재배치)**: **감사 자체는 완료**되었고(A의 3분할은 TBox에 반영되어
> `ho:ObservationSpace`/`ho:AreaOfInterest`/`ho:AreaOfObservation`로 존재한다), 이 문서가
> 계속 유효한 것은 **B~F의 정의 경계 규범**과 G의 taxonomy 구조다. 아래 "인스턴스
> refactor"·"ABox" 항목은 **harness-concrete**(`ontology/abox/core/**`)에서 일어난
> 작업을 가리킨다 — 이 저장소(harness-functional)에는 TBox와 shapes만 있다. 클래스·프로퍼티
> 개수도 작성 시점 값이므로 인용하지 말고 현재 TBox에서 다시 센다.

## A. ObservationArea → ObservationSpace + AreaOfInterest + AreaOfObservation (3분할 — 사용자 명시)
현 `ho:ObservationArea`가 **세 개념을 뭉갬**(sensing/attention 이론의 표준 3구분). 분리:
- **`ho:ObservationSpace`**(Ω_i, 관측 공간): agent가 **관측 가능한** 전체 envelope — GlobalState의 부분투영(`projectsFrom`), agent당 **1개**, `cognitiveCapacity`(Agent)가 상한. Agent→`agentObservation`→ObservationSpace(1). `unobserved`(공간이 배제하는 것).
- **`ho:AreaOfInterest`**(관심 영역, AoI): 역할상 **관측하길 원하는/필요한** 영역(intent/target; 정보요구). `observationKind`(internal/external). ObservationSpace→`hasAreaOfInterest`→AoI(**≥1**).
- **`ho:AreaOfObservation`**(관측 영역, AoO): 한 추론에 **실제 관측되는** 영역(realized 입력데이터) — `observationKind`·`observesChannel/Memory/Component`·`observedFileScope`·**`observedTokenVolume`**(실제 관측량). ObservationSpace→`hasAreaOfObservation`→AoO(**≥1**); **Σ AoO `observedTokenVolume` ≤ cognitiveCapacity**.
  > **갱신 (2026-07-25)**: 이 자리는 원래 `ho:tokenEstimate`였다. 한 술어가 "팩 admission 비용"과 "런타임
  > 관측량" 두 뜻을 겸해 **retrieve 팩이 조기 절단되는 결함**(nodes=3, budget 125/900)을 낳았고, 관측량을
  > **`ho:observedTokenVolume`으로 분리**했다. `tokenEstimate`는 이제 **노드 자신의 텍스트 비용**만 뜻한다.
- **정렬**: AoO가 AoI를 **cover**(`ho:coversInterest` AoO→AoI): 원하는 걸 실제로 관측. AoI⊄AoO 간극 = partiality/loss = 비효율. 셋 다 ObservationSpace ⊆ cognitiveCapacity.
- **관계**: Agent → ObservationSpace(1) → { AreaOfInterest(≥1, 원함) , AreaOfObservation(≥1, 실제) }, AoO `coversInterest` AoI.
- **기존 인스턴스 refactor** (개체 작업 — harness-concrete): 현 `oa-<agent>-external/internal` 10개(실제 관측 서술) → **AreaOfObservation**로 retype. 각 agent에 ObservationSpace 1(projectsFrom global-state, unobserved) + AreaOfInterest(역할 정보요구) 신설. `agentObservation`은 Agent→ObservationSpace로 재지정, propertyChain rollup은 space→area까지 확장.

## B. Workflow vs DesignPattern (정의 예시 중복 — 실제 conflation)
- Workflow="control-flow strategy (single-shot, **ReAct, plan-execute**, multi-agent)"; DesignPattern="reusable composition pattern (**ReAct, plan-then-execute**, orchestrator-workers, reflection)". **동일 예시(ReAct/plan-execute)를 양쪽이 나열** → 경계 모호.
- 정리: **DesignPattern=추상 명명 패턴**(분류 tag, `appliesPattern`으로 참조; 인스턴스화 안 됨) vs **Workflow=구체 제어흐름**(그 harness가 실제 따르는, `hasStep`으로 분해되는 인스턴스). 예시를 겹치지 않게 재작성.

## C. Guardrail vs Constraint (자기지칭)
- Guardrail="safety/policy **constraint** that bounds behaviour"(⊑component, 행위 정책); Constraint="non-functional requirement/limitation (latency/cost/privacy)"(비-component, NFR). Guardrail을 "constraint"로 정의해 Constraint와 섞임.
- 정리: **Guardrail=agent가 따르는 행위 정책**(imperative, 준수 대상) vs **Constraint=harness에 대한 비기능 요구/한계**(declarative NFR). Guardrail 정의에서 "constraint" 단어 제거.

## D. SystemPrompt vs Instruction (자기지칭)
- SystemPrompt="persona/**instruction** text that frames behaviour"; Instruction="behavioural rule or procedure **injected**". SystemPrompt 정의에 "instruction"이 들어가 Instruction 클래스와 섞임.
- 정리: **SystemPrompt=상시 persona framing**(always-on) vs **Instruction=on-demand 명명 절차/스킬**(slash-command, 필요시 호출). SystemPrompt 정의에서 "instruction" 제거, Instruction은 "skill/on-demand" 강조.

## E. Tool vs Capability (자기지칭)
- Tool="external **capability** the agent can invoke"(⊑component, 구체 invokable); Capability="abstract ability; required/provided"(비-component). Tool을 "capability"로 정의해 Capability와 섞임.
- 정리: **Tool=capability를 PROVIDE하는 구체 invokable component**(operation/action) vs **Capability=추상 능력**(require/provide 짝). Tool 정의를 "external operation/action ... that provides capabilities"로.

## F. Role vs Agent (분리 후 정합 — tightening)
- Role="bundles persona + least-privilege tools + guardrails + memory policy"; Agent(신규)="Role + ObservationSpace + functions를 묶는 분산노드". Role의 "tools/memory bundle"과 Agent의 agentFunction/observation이 경계 모호.
- 정리: **Role=mandate + 정책 π_i**(persona·guardrail·수행 책임) vs **Agent=분산노드 인스턴스**(Role + Ω_i 관측 + A_i 기능). Role 정의를 mandate/policy로 좁히고 "관측/기능은 Agent가 부여" 명시.

## G. 상위 taxonomy 정리 (flat → 중간 superclass, 사용자 확정 2026-07-23)
현재 HarnessComponent 하위 22 클래스가 **전부 flat**(중간 계층 0). MAS 튜플 정렬 중간 superclass로 재부모화(순수 additive TBox: leaf `subClassOf`를 HarnessComponent→중간으로, 중간 ⊑ HarnessComponent; 인스턴스는 transitivity로 여전히 HarnessComponent → shape/reachability/count 무영향).

### HarnessComponent 하위 (9 중간 superclass)
| 중간 superclass | MAS 대응 | leaf |
|---|---|---|
| `ho:BehavioralComponent` | π_i 정책·행위 | SystemPrompt, PromptSection, Guardrail, Instruction, Example |
| `ho:ObservationalComponent` | O_i 지각 | ObservationSpace, AreaOfInterest, AreaOfObservation |
| `ho:OperationalComponent` | A_i 행동 | Tool, Candidate |
| `ho:StateComponent` | b_i 신념 | Memory |
| `ho:OrganizationComponent` | 노드·통신 | Agent, Role, Channel |
| `ho:ProcessComponent` | 제어흐름·데이터 | Workflow, WorkflowStep, Deliverable |
| `ho:VerificationComponent` | spec 검증 | Contract, TestScenario, FailurePolicy |
| `ho:AssemblyComponent` | 문서 emit | AssemblySection |
| `ho:SubstrateComponent` | 인지 substrate | ModelConfig (cognitiveCapacity 결정) |

### 비-component (2 상위 + vocab)
- `ho:SpecConcept`(추상 spec — harness가 require/target/apply/constrain): Capability, Task, Domain, DesignPattern, Constraint.
- `ho:InformationSpace`(관측 투영 공간): EnvironmentSpace, GlobalState. (Domain은 SpecConcept 소속이되 4-space 사슬엔 property로 참여 — scopedFrom/describesDomain/projectsFrom.)
- `ho:Concept`(⊑ skos:Concept, tagging vocab): 그대로.

### 리스크
순수 TBox 재부모화 — ABox(harness-concrete)/tools/shapes 무변경. 양쪽 저장소 validate PASS·materialize byte-identity·recipe 무영향 기대. 중간 superclass는 INSTANCE_CLASSES 불요(직접 인스턴스 없음; leaf가 여전히 직접 타입).

## 성격·리스크
- **A**=구조 분리(신규 클래스 2 + 기존 ObservationArea 인스턴스 refactor[harness-concrete] + tools/shapes) — MAS-W4 vnv 완료 후. **TBox 쪽은 반영됨**: 현 `ontology/tbox/harness.ttl`에 `ho:ObservationSpace`·`ho:AreaOfInterest`·`ho:AreaOfObservation` 세 클래스가 있고 `ho:ObservationArea`는 남아 있지 않다(개체 refactor 상태는 harness-concrete에서 확인).
- **B~F**=**정의(skos:definition) 명확화 편집**(그래프 구조 무변경, materialize 무영향, orphan/ripple 없음, altLabel 보강). 저위험.
- 순서: MAS-W4(현 ObservationArea 검증) 완료 반영 → A(분리) → B~F(정의 정리) → vnv 재판정.
