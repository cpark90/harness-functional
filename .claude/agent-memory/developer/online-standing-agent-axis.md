# Online standing agent = the ACTIVATION axis's second position (3 nodes, 0 schema change)

dispatch(instant worker: spawn→brief→reclaim) 대칭으로 **online standing agent**(역할을 쥔 채
세션이 계속 열려 도착하는 요청을 서빙)를 추가한 웨이브. 신규 3 = `id:c-online-agent`(Concept,
broader c-multiagent) · `id:mode-standing-service`(ExecutionMode) · `id:gr-online-execution`
(Guardrail). TBox·shapes 무변경 — mode 축이 "새 값 = 개체 하나"로 설계돼 있어 성립
(execution-mode-first-class-axis 참조). validate 250→253 PASS.

## 재사용 규칙
- **한 축의 대칭 포지션을 추가할 땐 기존 포지션의 3중주를 그대로 복제한다**: dispatch는
  Concept(c-dispatch) + Guardrail(gr-dispatch-execution) + ExecutionMode(mode-sub-agents)의
  3중주였고, online도 같은 3형태로 채우면 어휘 발명 없이 대칭이 성립한다. Concept와 Guardrail이
  같은 prefLabel을 갖는 dispatch 관례는 굳이 따르지 않아도 된다(prefLabel 유일성은 클래스 내부
  기준) — 여기선 "Online standing agent"(Concept) / "Online standing execution"(Guardrail) /
  "Standing service mode"(ExecutionMode)로 각 층의 성격이 라벨에서 읽히게 분리했다.
- **`ho:hasExecutionMode`는 maxCount가 없다 → 한 harness가 두 mode를 병기해 두 PLANE을 기술**할 수
  있다. h-multiagent = mode-sub-agents(dispatch plane: chan-dispatch로 spawn되는 워커) +
  mode-standing-service(standing plane: orchestrator/inspection의 상주 세션). 이건 mode-hybrid가
  **아니다** — hybrid는 한 run의 PHASE에 따라 토폴로지가 바뀌는 것이고, 여기는 두 평면이 동시에
  돈다. 새 mode의 definition에 이 구분을 명시해 두면 다음 저작자가 hybrid로 잘못 접지 않는다.
- **"OUTSIDE this axis"라고 적어둔 임시 SCOPE 주석은 축의 결손 신호다.** harnesses.ttl의
  "role-inspection is NOT a dispatched agent … lies OUTSIDE this axis" 주석이 정확히 이번 GAP을
  가리키고 있었다. 축 밖으로 밀어낸 주석을 발견하면 그 자리에 개체 하나가 빠져 있는지 먼저 본다.
- **중복 정책 회피**: 상태마커 소비 원칙은 `gr-verify-proceed`(경과시간으로 완료 가정 금지)가
  이미 담당한다. gr-online-execution에는 "완료 마커가 붙은 항목만 소비"를 **한 구절**로만 넣고
  "elapsed time" 서술은 반복하지 않았다(단일 책임 + near-synonym guardrail 방지).
- roles.ttl 상단 TAXONOMY 축 목록에 ACTIVATION 축을 추가할 때 기존 INTERACTION 축의
  "user-facing vs dispatch-invoked" 표현이 새 축과 겹친다 → INTERACTION은 "user-facing vs not"로
  좁혀 deconflate. 또 ACTIVATION은 2치가 아니라 **3치**다: per-brief dispatched worker /
  run-span team peer(id:role-coordinator, mode-agent-teams) / standing session. "나머지는 전부
  dispatch-invoked"라고 쓰면 role-coordinator에서 틀린다.

## 배선(anti-orphan)과 산출 영향
- concept ← broader c-multiagent + guardrail이 tagged. mode ← h-multiagent hasExecutionMode +
  tagged c-execution-mode. guardrail ← role-orchestrator/role-inspection roleGuardrail +
  h-multiagent hasGuardrail. (mode에 c-online-agent를 추가 tagged 하려다 brief 범위 밖이라 철회 —
  개체는 이미 연결돼 있고 retrieve 랭킹도 1~3위로 충분했다.)
- materialize h-multiagent 확인: operating-rules +1 bullet, `## Execution mode` 항목 2개(라벨
  알파벳순: Standing → Sub-agent), orchestrator/inspection `.claude/agents/*.md` +1 bullet.
  definition·promptText 안의 `id:*` 토큰은 emit 시 prefLabel로 해소됨(dangling 0 확인).
- **미해결 이웃 문구(내 brief 밖)**: `id:as-execution-mode`의 설명이 "The runtime topology this
  harness spawns and coordinates its agents in"으로 **단수** 토폴로지를 전제한다. 복수 mode 병기가
  가능해졌으므로 assembly-sections.ttl 문구는 다음 웨이브에서 복수형으로 손봐야 한다.
