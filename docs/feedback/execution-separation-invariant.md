---
status: approved            # 사용자만 approved로 바꾼다
targets: [core:gr-delegated-orchestration, core:gr-dispatch-execution, core:h-peer-mesh, core:mode-agent-teams, core:h-multiagent]
kind: decision
related: [docs/feedback/verified/execution-mode-axis-finalize.md, docs/feedback/webui-save-drops-triples.md]
---
# 결정 요청 — "계획/상태확인 agent ≠ 작업수행 agent"를 모든 실행모드의 불변식으로

## 요청 (사용자)
"작업수행 agent와 작업 계획·상태확인 agent는 분리되어야 한다. **agent team을 구성할 때도 작업수행은
항상 작업수행 agent를 별도로 spawn해서 수행**한다. 세션의 건전성·완결성을 위한 것."
→ inspection이 이 원칙이 온톨로지에 표현돼 있는지 그래프 실측으로 검토.

## 조사 결과 (실측) — 원칙은 **부분만** 표현돼 있다

### 표현된 부분 (orchestrator-workers 토폴로지 한정)
분리 원칙은 **두 guardrail**로 존재한다:
- `id:gr-delegated-orchestration`(`guardrails.ttl:69`) — "The user-facing **orchestrator** performs no
  substantive work directly — no authoring, judgment or tool execution; it only plans and dispatches."
- `id:gr-dispatch-execution`(`guardrails.ttl:66`) — "Worker agents perform their assigned work only when
  **dispatched by the orchestrator**; not run standalone."

그러나 **둘 다 `id:h-multiagent`(orchestrator-workers, `mode-sub-agents`)에만** 걸려 있고, **문구가
orchestrator 역할에 묶여** 있다("the orchestrator", "dispatched by the orchestrator").

### 표현되지 않은 부분 (agent-teams 토폴로지) — GAP
- **`id:h-peer-mesh`**(`harnesses.ttl:135`, 유일한 `mode-agent-teams` 하네스)의 guardrail은
  **`gr-lang`·`gr-report-over-prompt`·`gr-least-privilege` 셋뿐**이다. **분리 guardrail 둘 다 없다.**
  역할도 `role-developer`·`role-vnv`·`role-research`·`role-design` — **전부 실행 역할**이고, 계획/조율
  전담 역할도, "peer가 계획하면서 동시에 실행하면 안 된다"는 제약도 없다.
- **`id:mode-agent-teams`**(`patterns.ttl:40`) 정의는 peer가 "coordinate as a group ... share a task
  list"라고만 하고 **계획≠실행 분리도, 실행을 별도 spawn한다는 것도 언급하지 않는다.** 사용자의
  "team에서도 작업수행은 별도 agent를 spawn"이 여기에 전혀 반영돼 있지 않다.
- `id:h-workspace-synthesis`는 역할 원형 수준에선 계획(`role-planner`·`role-strategist`)과 실행
  (`role-implementer`·`role-author`·`role-tester`)을 **구분**하지만, 이를 강제하는 guardrail은 없다.

### 요약
원칙 "계획/상태 ≠ 실행, 항상 별도 spawn"은 **모드 독립적 불변식이 아니라, orchestrator-workers
전용 규칙**으로만 존재한다. agent-teams 모드에선 **아무것도 이를 보장하지 않는다** — 이것이 GAP이다.

> **메타 관찰**: 이 원칙은 방금 이 세션에서 사용자가 **실제로 집행**한 결정과 같다 — webui 수정을
> inspection(계획·검증)이 직접 하지 않고 별도 developer dispatch로 라우팅. 사용자는 그 결정을
> **모든 토폴로지의 harness 불변식으로 일반화**해 달라고 요청하는 것으로 읽힌다.

## 선택지

- **(A) 일반 guardrail 신설 + 배선 (inspection 권고).** 예: `gr-execution-separation`("Separated
  execution") — *"An agent that plans work or checks status/verifies it does not itself perform the
  execution; execution is always carried out by a distinct, separately-spawned execution agent — in
  every coordination topology, orchestrator-workers and agent-teams alike."* 이걸 **모든 multi-agent
  하네스**(최소 `h-peer-mesh`)에 걸고, `mode-agent-teams` 정의에 분리 문구를 추가. 기존
  orchestrator 전용 둘은 이 일반 규칙의 **특수화**로 남긴다. (문구는 developer가 controlled-vocabulary
  규율 아래 최종 저작 — 여기 문안은 제안.)
- **(B) 기존 guardrail 일반화.** `gr-delegated-orchestration` 문구를 역할 무관("the planning/status
  role")으로 넓히고 `h-peer-mesh`에 재사용. → **문구를 고치면** `h-multiagent`의 materialized
  operating-rules 섹션이 바뀐다(byte-identity 회귀 — 의도된 변경이면 수용 가능).
- **(C) 실행모드 정의만 보강.** `mode-agent-teams`의 `skos:definition`에만 분리를 명시. 가장 가볍지만
  **guardrail이 아니라 산문**이라 하네스가 이고 다니는 강제 규칙이 아니다(약함).

## 파급효과 (예비 실측)
- (A)를 `h-peer-mesh`에만 걸면: 신규 guardrail 1 + 배선 1 + `mode-agent-teams` 정의 갱신. `h-peer-mesh`의
  materialized CLAUDE.md operating-rules에 **1줄 추가**(그 하네스는 아직 산출 소비자 없음). 다른 하네스
  산출물 **byte-identical 유지**.
- (A)를 **모든** multi-agent 하네스에 걸면(원칙의 취지에 더 충실): `h-multiagent`·`h-workspace-synthesis`·
  `h-harness-factory`의 operating-rules 섹션도 각 1줄 추가 → **byte-identity 의도적 변경**(회귀 아님,
  기능 추가). 어디까지 배선할지가 결정 포인트.
- 연합: guardrail은 recipe union에도 전파되나 신규 노드는 자동 결합되지 않아 published recipe federate는
  회귀 0(lockstep dry-run으로 확인 예정).
- **stored↔operating 정합성**: 이 운영 세션의 CLAUDE.md는 이미 "orchestrator=계획·dispatch 전용, 저작·판정·
  적용은 전부 dispatch"로 이 분리를 집행한다. 저장된 agent-teams 하네스가 이를 안 담으면 stored harness와
  operating 원칙이 어긋난다(CLAUDE.md가 요구하는 stored≡operating 정합성의 구조적 사례).

## 결정 필요 (사용자)
1. **선택지 A/B/C 중 무엇으로.** (inspection 권고: **A** — 강제 가능하고 모드 독립적이며 기존 byte-identity를
   가장 덜 흔든다.)
2. **배선 범위**: 신규 guardrail을 `h-peer-mesh`에만 걸까, **모든** multi-agent 하네스에 걸까(후자는
   `h-multiagent` 등 산출물 byte 변경을 수반 — 의도된 기능 추가).
3. **agent-teams에 계획/조율 전담 역할이 필요한가**: `h-peer-mesh`는 현재 실행 역할만 있다. "team에서도
   작업수행은 별도 spawn"을 지키려면 **조율(계획/상태)하는 peer는 실행하지 않고, 실행은 별도 spawn되는
   실행 agent가 맡는** 구조가 필요하다 — 이를 위해 조율 전담 역할 원형을 추가할지, 아니면 불변식만 걸고
   역할 구성은 recipe에 맡길지.

승인 시 `status: open` → `approved` + 위 3개 답. 그러면 orchestrator가 developer dispatch로 저작·배선하고,
inspection이 federate·byte-identity 회귀를 검증한다. 온톨로지 저작은 inspection이 하지 않는다(역할 경계).

## 사용자 피드백 (2026-07-25, 세션 내 직접 승인)
1. **(A)** — 모드 독립 일반 guardrail 신설.
2. **모든 multi-agent 하네스에 배선** (h-multiagent·h-peer-mesh·h-workspace-synthesis·h-harness-factory).
3. **조율 전담 역할 추가.**

→ 검증·적용 계획: `docs/feedback/verified/execution-separation-invariant.md`.
