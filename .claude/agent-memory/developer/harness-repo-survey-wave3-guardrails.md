# harness-repo-survey Wave 3 — guardrail dedup (cc-toolkit + agent-rules-books)

**결과: 신규 1 (`id:gr-human-checkpoint`).** cc-toolkit 15 rules 中 14개(accessibility·
api-design·database·coding-style·dependency-management·documentation·error-handling·
git-workflow·monitoring·naming·performance·security·testing)=SW-craft **도메인 rule→guardrail
아님**(무시). agent-rules-books 198md=서적요약(Pragmatic·CleanCode·Refactoring·DDD…)=전부
SW-design 도메인→기존 guardrail로 매핑되거나 harness-part 아님, **신규 0**. 유일 harness-관련
소스=cc-toolkit `agents.md`.

## `agents.md` → 기존 39 매핑 (reuse-first)
- single-responsibility/defined-scope → gr-single-responsibility; min-tools → gr-least-privilege;
  relevant-context-not-history + token-budget(/compact 60%) → gr-bounded-context; explicit
  success-criteria/format → gr-structured-output; destructive-cmd → gr-nodestruct; validate
  assumptions/read-before-modify → gr-verify-proceed/root-cause; task-decomp 3-7 → 방법론(non-guardrail).
- **잔여 미표현 축 = human-in-the-loop 승인 게이트**: "Show the plan before executing, get
  confirmation" + "Surface decisions needing human input early" + "when uncertain, ask not guess"
  + wshobson ~26 orchestrator의 **PHASE CHECKPOINT**(W1 handoff). → 저작.

## ★human-checkpoint 판정 = 저작(distinct axis, collapse 아님)
겹칠 후보 2개와 **다른 축**임을 확인: (a) gr-no-arbitrary-decision(c-escalation)=**특정 open
question**을 authority로 escalate(REACTIVE, 논쟁 발생 시). (b) gr-verify-proceed=**elapsed time≠
readiness**, confirmed *machine* state(ACK/flag)로만 전진(timing 축). human-checkpoint=**milestone에
고정된 PROACTIVE 승인 게이트**(논쟁 없어도 fire)+**human sign-off**(machine ACK 아님). design-for-loss가
graceful-fallback+traceability의 합성인데도 1급 노드인 것과 동일 논리—heavy 재발(26>operator8)이면
합성이라도 노드화. promptText에 두 "Distinct from" 인라인(gr-integration-coherence 선례).
- tag=**c-escalation**(human decision-authority 최근접; no-arbitrary-decision과 co-locate→retrieve에서
  인접-but-distinct, 인라인 disamb가 가름). 신규 concept 금지(reuse-first).

## ★byte-identity: Guardrail은 taxonomy/role-only 불가 → 반드시 1 하네스 변경
- Guardrail ⊑ BehavioralComponent ⊑ HarnessComponent → ComponentConnectivityShape가 inverse
  hasComponent 강제. **roleGuardrail은 domain Role·hasComponent sub 아님→도달성 안 줌**(def "points at
  guardrails the harness ALREADY binds"). W1 pat-blackboard처럼 tag-only 불가.
- 7 하네스 **전부 materialize**(비-emit host 없음)→어느 guardrail이든 정확히 1 하네스의 operating-rules
  +1 bullet. 억지 아닌 **의미상 옳은 집(h-multiagent=orchestrator가 plan을 user 승인)**에 배선. 이미
  gr-verify-proceed/no-arbitrary-decision/delegated-orchestration 있는 곳=자연스러운 이웃.
- 검증: materialize h-multiagent=checkpoint 2 hit / h-peer-mesh·h-coding=0 → **6 하네스 byte-identical,
  h-multiagent만 +1 bullet**. (mode-independent gr-execution-separation 선례와 동형.)

## 귀속
- `dct:source` 2값(cc-toolkit=Apache-2.0 + wshobson=MIT, 둘 다 관찰원)+`dct:license` 2값. guardrails.ttl에
  `@prefix dct` 신규(patterns.ttl 선례). NOTICE=cc-toolkit Apache-2.0 항목+gr-human-checkpoint 문단 추가.
- **agent-rules-books는 NOTICE 미추가**(신규 노드 0=파생 없음→크레딧 불요, W2 VoltAgent 선례). 서적요약
  텍스트 복사 안 함(중립 원칙만).

## gate/GAP
- validate PASS(231+1=232) · check_determinism PASS · retrieve "human approval checkpoint" rel 9.18 top.
- GAP(W4): chan-checkpoint(승인 게이트의 매칭 Channel, host 배선 필요) 미저작. cc-toolkit hooks 20개=W4
  ho:Hook 재료(session/tool 이벤트 트리거). cc-toolkit 도메인 rule 14종은 recipe-local 후보(중앙 아님).
