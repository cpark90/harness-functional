---
source: docs/feedback/execution-separation-invariant.md
verdict: apply
targets: [core:gr-execution-separation, core:role-coordinator, core:h-multiagent, core:h-peer-mesh, core:h-workspace-synthesis, core:h-harness-factory, core:mode-agent-teams]
---
# 검증 보고 — 실행분리 불변식 (A + 전 하네스 배선 + 조율 전담 역할)

사용자 승인: **(A) 일반 guardrail 신설 · 모든 multi-agent 하네스 배선 · 조율 전담 역할 추가.**
아래는 orchestrator가 developer dispatch로 실행할 구체 계획 + inspection이 측정한 파급효과.
온톨로지 저작은 developer 소관 — inspection은 계획·측정·검증만.

## 파급효과 (impact, 실측 baseline @205)
- **신규 개체 2**(guardrail 1 + role 1) + 하네스 4곳 배선 + `mode-agent-teams` 정의 갱신 →
  개체 수 **205 → 207** 예상.
- **byte-identity 의도적 변경(회귀 아님)**: guardrail을 4 하네스에 걸면 각 CLAUDE.md **operating-rules
  섹션에 1줄씩** 추가된다. baseline 실측: h-multiagent 16줄 · h-harness-factory 14줄 ·
  h-workspace-synthesis 8줄 · h-peer-mesh 3줄 → 각 +1. 추가로 **role-coordinator를 h-peer-mesh에 걸면**
  그 하네스 Roles 섹션에 역할 1개 추가. 이 다섯 곳 외 산출물은 **byte-identical 유지**여야 한다(게이트).
- **연합 전파**: 4 하네스의 guardrail 목록은 그 하네스를 재사용/파생하는 recipe union에도 전파된다.
  신규 guardrail·role 노드는 어느 recipe에도 **자동 결합되지 않지만**, recipe가 중앙 하네스 정의를
  인용/렌더하면 그 산출물의 operating-rules도 1줄 는다 → **8 recipe federate + 산출물 확인 필수**.
- `validate.py`: 신규 guardrail은 `HarnessComponent`가 아니라 곧바로 harness에 `hasGuardrail`로 걸리므로
  orphan 아님. 신규 role은 `hasRole`로 h-peer-mesh에 걸어야 `ComponentConnectivityShape` 통과(안 걸면 FAIL).

## 적용 계획 (orchestrator → developer dispatch)

### 1. 신규 guardrail `id:gr-execution-separation` (`behavioral/guardrails.ttl`)
- `a ho:Guardrail ; skos:prefLabel "Separated execution" ; skos:altLabel "planner is not executor" ;`
- `ho:promptText` (제안 문안, developer가 controlled-vocabulary 규율로 최종화):
  > "An agent that plans work or checks its status and verifies it does not itself perform the execution;
  > execution is always carried out by a distinct, separately-spawned execution agent — in every
  > coordination topology, orchestrator-workers and agent-teams alike."
- `ho:tagged` — **어휘 결정(developer)**: 기존 `id:c-delegation`("Delegated orchestration")은 orchestrator
  한정 의미라 정확히 맞지 않는다. 권고: **신규 `id:c-execution-separation` Concept를 `skos:broader
  id:c-delegation`(또는 상위 조율 concept)으로 연결**해 신설(같은 커밋 연결 = orphan 방지). 기존 tag
  재사용이 더 낫다고 판단되면 `c-delegation` 재사용도 허용.
- `ho:tokenEstimate` 부여, `ho:maturity "draft"`.
- **기존 둘과의 관계**: `gr-delegated-orchestration`·`gr-dispatch-execution`은 이 일반 규칙의
  orchestrator-workers **특수화**로 존치(폐기 아님). 정의문에 상호 관계 1줄 명시 권고.

### 2. 4 multi-agent 하네스에 배선 (`wholes/harnesses.ttl`)
`ho:hasGuardrail` 목록에 `id:gr-execution-separation` 추가: **h-multiagent · h-peer-mesh ·
h-workspace-synthesis · h-harness-factory**. (단일 에이전트 h-coding/h-research/h-support는 제외 — 두 번째
에이전트가 없어 분리 개념이 무의미.)

### 3. 신규 조율 전담 역할 `id:role-coordinator` (`organization/roles.ttl`) + h-peer-mesh 배선
- `a ho:Role ; skos:prefLabel "Coordinator agent" ;`
- `skos:definition` (제안): "A peer that plans the team's work and tracks its status but performs no
  execution itself; the actual work is carried out by separately-spawned execution agents. Distinct from
  id:role-orchestrator in that it coordinates as a peer over the message mesh (id:chan-peer), not as a
  central-only dispatcher." — `role-orchestrator`를 원형 참고(그 역할도 `roleTool` 없음 = 비실행).
- `ho:roleGuardrail id:gr-execution-separation, id:gr-report-over-prompt, id:gr-bounded-context ;`
- **`ho:roleTool` 없음**(least-privilege — 실행 도구를 주지 않는 것이 "조율은 실행 안 함"의 집행).
- `ho:roleMemoryPolicy` 부여, `ho:tagged id:c-multiagent`, `ho:userFacing false`(peer coordinator이지
  user-facing orchestrator 아님), `ho:maturity "draft"`.
- **h-peer-mesh 배선**: `ho:hasRole`에 `id:role-coordinator` 추가. **`chan-peer` 참여자**로도 등록
  (`id:chan-peer`의 `ho:channelParticipant`에 추가) — 안 그러면 조율 역할이 메시로 참여하지 않는 모순.

### 4. `id:mode-agent-teams` 정의 갱신 (`spec/patterns.ttl:40`)
`skos:definition` 끝에 분리 불변식 1문장 추가(제안): "Even in team mode the planner/coordinator peer does
not execute; the work is carried out by separately-spawned execution agents (see id:gr-execution-separation)."
— 정의 문구 변경은 그 개체를 렌더하는 산출물에 파급되므로(연합 포함) **federate 확인 대상**.

## 정합성 / 설계 유의 (developer·orchestrator 판단 필요)
- **pat-peer-mesh와의 긴장**: peer-mesh 정의는 "중앙 dispatcher 없이 peer가 직접 조율"이다. 조율 전담
  역할 + 별도 실행 spawn을 넣으면 orchestrator-workers에 가까워 보일 수 있다. **해소**: coordinator는
  **중앙 허브가 아니라 mesh의 한 peer**로서 조율하고, 실행은 hub-and-spoke가 아니라 mesh를 통해 별도
  spawn된다 — "중앙-only dispatcher 없음"은 유지된다. 이 구분을 role/mode 정의에 명시할 것.
- **stored↔operating 정합성 회복**: 이 반영으로 저장된 agent-teams 하네스가 이 운영 세션의 CLAUDE.md
  (orchestrator=계획·dispatch 전용)와 같은 불변식을 담게 된다.

## 검증 게이트 (반영 후, inspection이 실행)
1. `validate.py` PASS @207 (신규 role이 `hasRole`로 연결돼 orphan 0, 신규 concept 연결 확인).
2. **materialize 회귀**: 4 하네스 operating-rules **정확히 +1줄**, h-peer-mesh Roles +1역할, **그 외
   변경 0**(다른 하네스·MANIFEST 무관 부분 byte-identical). 기준선 = 반영 직전 커밋 worktree.
3. **8 recipe federate** PASS + recipe 산출물의 중앙 하네스 인용부만 의도대로 변경.
4. NOTICE/`dct:source` 무관(외부 소스 아님).

## 판정
**apply** — 승인된 (A)+전 하네스 배선+조율 역할을 위 계획대로 developer가 저작·배선하면 된다. 신규
개체 2 + 배선 5곳 + 정의 1곳. byte-identity 변경은 **의도된 기능 추가**(operating-rules 각 +1줄)이며,
그 외 회귀 0을 게이트로 건다. 어휘 결정(신규 concept vs c-delegation 재사용)과 peer-mesh 긴장 해소
문구만 developer/orchestrator 설계 판단으로 남는다.

---
## 적용 결과 (applied — inspection land, 2026-07-25)

**중앙 커밋**: `fce72af` (`d4f4b1e..fce72af`, branch main, pushed to `cpark90/harness-ontology`).
5 files changed, 67 insertions, 7 deletions.

**저작 실측 (developer 산출, orchestrator 검증, inspection 독립 재검증)** — verification 시점 baseline이
@205였으나 그 사이 중앙이 성장해 **실제 land는 223 → 225**:
- 신규 개체 2: `id:gr-execution-separation` (Guardrail, `ho:tagged id:c-multiagent`, draft, tokenEstimate 50)
  · `id:role-coordinator` (Role, `ho:roleGuardrail id:gr-execution-separation …`, `ho:tagged id:c-multiagent`,
  draft, **roleTool 없음** = 비실행). 어휘 결정은 신규 concept 신설 대신 **기존 `c-multiagent` 재사용**으로 낙착.
- 배선: `gr-execution-separation` → h-multiagent · h-peer-mesh · h-workspace-synthesis · h-harness-factory
  (`ho:hasGuardrail`). `role-coordinator` → h-peer-mesh (`ho:hasRole`). `mode-agent-teams` 정의에 분리
  불변식 문장 추가 (tokenEstimate 125 → 190).
- TBox·shapes 무변경.

**검증 게이트 (inspection 독립 실측)**:
1. `validate.py` **PASS @225** (reachability·capabilities·assemblyOrder·SHACL 전부 green, 신규 role orphan 0).
2. `check_determinism.py` **PASS** (4 request × 4 run byte-identical).
3. **materialize byte-identity** (HEAD `d4f4b1e` worktree = before, working tree = after):
   - 단일 에이전트 3 (h-coding/h-research/h-support) CLAUDE.md **완전 동일 (변경 0)**.
   - multi-agent 3 (h-multiagent/h-workspace-synthesis/h-harness-factory) operating-rules에
     **정확히 1줄** ("Separated plan and execution" bullet) 추가, 다른 줄 0.
   - h-peer-mesh: operating-rules +1줄 + Coordinator agent role 1개 + mode-agent-teams 정의 갱신 (의도된 반영).
4. **연합 D4 blast-radius** (신규 중앙 상태 대상 federate dry-run, published `cpark90/harness-recipes`
   38 recipe 중 표본 3): 02-podcast-studio=249 · 21-code-reviewer=245 · 100-ip-portfolio=252 개체 모두
   **PASS** — 저작 전 대비 **균일 +2** (ID 충돌 0, 회귀 0). 신규 guardrail은 recipe에 자동결합 안 되나
   중앙 하네스 union 경유 도달성 유지. published recipe TTL 무변경이라 **recipe 재land 불필요**.
5. **CI**: central push run `30150683824` (`validate-ontology`) — **completed / success** (green).

**참고 — 커밋 범위**: `developer/MEMORY.md`는 동시 진행 중인 mass-import wave dispatch(Wave A–G2 인덱스
8줄, 미커밋 `mass-import-wave-*.md` 참조)와 **얽혀 있어 이번 커밋에서 제외**했다. execution-sep 인덱스
줄은 그 mass-import land가 MEMORY.md를 커밋할 때 함께 land된다(메모리 파일 자체
`mode-independent-invariant-guardrail.md`는 이번 커밋에 포함). webui dispatch의 `tools/webui/*`·
`tools/ontology_lib.py`는 브리프 지시대로 커밋 제외.
