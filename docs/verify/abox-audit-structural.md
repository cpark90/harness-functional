# ABox 정리 감사 — 구조/행위 나머지 클래스 전수 검토

판정: vnv (findings only, 편집·삭제 없음). Guardrail/Concept/DesignPattern/AssemblySection/Role는 별도 감사 → 제외.

## 재현 명령 (실행한 것 그대로)

```
/usr/bin/python3 tools/validate.py            # PASS (기본 python3엔 rdflib 없음)
grep -rho "a ho:<Class>\b" ontology/abox/core # 클래스별 카운트
grep -rl "providesCapability.*<cap>" / grep -rl "requiresCapability.*<cap>"  # capability 매칭
```

## 전역 게이트 결과 (판정의 뼈대)

- `validate.py` **PASS**. 그 중 두 축이 이 감사의 orphan/label 기준을 **직접** 판정한다:
  - **reachability**: `✓ all 236 individuals reachable from a Harness` → **감사 대상 전 클래스에 graph-level orphan 0**. 아래 per-node "wiring" 판정은 전부 이 결과 + 개별 hasX 참조 확인에 근거한다.
  - **duplicate/drift**: `✓ no duplicate labels within a class` → 클래스 내 prefLabel 중복 0.
  - **capabilities**: `✓ every harness's required capabilities are provided internally`.

## 클래스별 카운트 (grep 실측 — 브리프 기대값과 상이한 것 명시)

| class | 실측 | 파일 | 브리프 기대 |
|---|---|---|---|
| Capability | 9 | spec/capabilities.ttl | 9 ✓ |
| Contract | 2 | spec/**capabilities**.ttl | (브리프: spec/*) |
| Constraint | 1 | spec/constraints.ttl | — (con-lowlatency 뿐) |
| Channel | 6 | organization/channels.ttl | 6 ✓ |
| Workflow | 7 | process/workflows.ttl | 7 ✓ |
| WorkflowStep | 10 | process/workflows.ttl | 10 ✓ |
| Deliverable | 2 | process/**workflows**.ttl | (브리프: domains-tasks) |
| Tool | 4 | operational/tools.ttl | 4 ✓ |
| SystemPrompt | **4** | behavioral/system-prompts.ttl | 브리프 7 (실측 4) |
| PromptSection | 3 | behavioral/system-prompts.ttl | — |
| Instruction | 1 | behavioral/**guardrails**.ttl | (브리프: system-prompts) |
| Task | 6 / Domain 4 | spec/domains-tasks.ttl | 6/4 ✓ |
| Memory | 3 | state/memory.ttl | 3 ✓ |
| ModelConfig | 2 | substrate/model-configs.ttl | 2 ✓ |
| ObservationSpace 5 / AreaOfInterest 5 / AreaOfObservation 10 | observational/observation.ttl | 5/5/10 ✓ |
| FailurePolicy 8 / TestScenario 2 | verification/verification.ttl | verification(10) ✓ |
| Harness | 7 | wholes/harnesses.ttl | 7 ✓ |

> 위치 정정: Contract는 capabilities.ttl에 co-located(주석이 사유 명시: 전용 verification 데이터유닛 부재, IRI location-independent), Deliverable는 workflows.ttl(task-DAG data flow), Instruction은 guardrails.ttl, FailurePolicy+TestScenario는 verification.ttl. **브리프의 파일 매핑·SystemPrompt=7은 stale**; 실측 기준으로 판정한다.

## 종합 판정

**redundancy(진짜 중복) 0건, orphan 0건.** 근접 쌍은 전부 정의 산문에 **명시적 판별절**을 담고 있어 anti-drift상 **의도된 구별**이다. flag는 전부 non-blocking(약판별자 후보 · 스코프 비대칭)이며 편집 대상이 아니다.

---

## per-node 판정 (클래스 그룹핑)

### Capability (9) — 전부 provides↔requires 매칭됨
grep 실측: 9개 모두 provides≥1 AND requires≥1 (codeexec p1/r3, fileedit p1/r3, websearch p1/r1, retrieval p1/r2, citation p1/r1, orchestration p1/r2, traceability p1/r1, synthesis p1/r1, skill p1/r1). 제공자 비-Tool 케이스 확인: cap-traceability←`gr-traceability`(Guardrail) providesCapability, cap-synthesis←`role-synthesizer`(Role) providesCapability, cap-skill←`ins-well-formed-skill`(Instruction). 전부 harness 내부 충족(validate capabilities PASS).

| id | 판정 | 근거 |
|---|---|---|
| cap-orchestration / -traceability / -synthesis / -skill | KEEP | 4개는 skos:definition 보유, 상호 판별 명확. |
| cap-codeexec / -fileedit / -websearch / -retrieval / -citation | KEEP-but-clarify(low) | **label-only(skos:definition 부재)**. "Code execution"/"File editing" 등 라벨 자체가 자기설명 + seed-style 일관 → [지킴] 위반 아님. 약판별자 후보이나 매칭·wiring 정상이므로 non-blocking. |

### Contract (2) — clean
ct-well-formed-skill-description / -heading: 각각 description-present / title-heading-present 구조 계약. contractCheck 1개씩, tokenEstimate 없음(주석이 사유 명시: bind/verify metadata, no promptText — Candidate 선례). cap-skill에 capabilityContract로 물림. **KEEP** (drift 없음).

### Channel (6) — clean, 4-매체 파티션은 의도된 구별
| id | 판정 | 판별절(정의 인용 요지) |
|---|---|---|
| chan-agent-user | KEEP | 유일한 agent↔user 도관, involvesUser=true, 승인 게이트. |
| chan-orchestrator-inspection | KEEP | 별도 세션 간, involvesUser=false, verify+inquiry 2레인. (agent-user와 참여자·user플래그로 구분) |
| chan-dispatch | KEEP | spawn/return 도관. "Distinct from the durable file channels…coordination here is the spawn/return". |
| chan-workspace | KEEP | 공유 파일 아티팩트 hand-off. "Distinct from central dispatch…and from a message mesh". |
| chan-peer | KEEP | 메시지 메시, 중앙 dispatcher 없음. pat-peer-mesh 실현. |
| chan-task-board | KEEP(draft) | claimable task items + progress. "The fourth hand-off medium after files/messages/spawn". |

→ workspace vs task-board(둘 다 "shared")는 아티팩트-handoff vs task-claiming으로 정의가 명시 구분. **진짜 중복 아님.** Channel엔 tokenEstimate 부재(promptText 없음, §1c 스코프 밖) — 정상.

### Workflow (7) + WorkflowStep (10) — clean, 전부 wiring됨
- Workflow: react/planexec/singleshot(seed, label-only), multiagent, harness-evolution, verify-harness, compose-harness. 3개 메타워크플로(evolution=유지 / verify=판정 / compose=구축)는 정의에 상호 "Choose … instead when …" 교차참조로 판별. **KEEP 전부.**
- WorkflowStep 10 전부 hasStep으로 물림: wf-multiagent→3(plan-dispatch/author-verify/integrate-gate), wf-harness-evolution→3(audit/feedback-route/change-log), wf-verify-harness→4(structure-check/trigger-validation/baseline-compare/dryrun). 각 step은 stepByRole+tokenEstimate+stepOrder 보유. 바인딩 워크플로 전부 어떤 harness의 hasWorkflow에 물림(react→h-coding, planexec→h-research, singleshot→h-support, 나머지→h-multiagent/factory). **orphan 0, KEEP 전부.**

### Deliverable (2) — clean
dlv-dispatch-brief / dlv-verified-result: wf-multiagent step의 stepProduces/stepConsumes로 producer→consumer 결합, (hasComponent o hasStep o stepProduces) 체인으로 h-multiagent에 롤업. **KEEP.**

### Tool (4) — clean
shell/editor/websearch/retriever, 각기 다른 cap 제공, tokenEstimate 보유. **KEEP 전부.** (label-only이나 Tool seed 관례, providesCapability로 판별.)

### SystemPrompt (4) + PromptSection (3) + Instruction (1) — clean
- sp-coding/research/support/methodical: 페르소나 4종 상이, promptText+tokenEstimate 보유. **KEEP.**
- ps-methodical-decisions/error/escalate: sp-methodical을 hasSection으로 분해, sectionOrder+promptText+tokenEstimate. blob promptText는 sp-methodical에 유지(주석 명시). **KEEP.**
- ins-well-formed-skill: h-harness-factory hasInstruction, cap-skill 제공, skos:notation 보유. **KEEP.**

### Task (6) + Domain (4) — clean
Task 6 전부 skos:definition 보유, 상호 판별 명확(bugfix/codereview/litreview/triage/architecture/designdecision). Domain 4(coding/research/support/design) label+altLabel+salience, dom-design만 scopedFrom env-space. **KEEP 전부.**

### Memory (3) — clean
firmware(every-execution/durable/full) / cache(task-continuous/ephemeral/full) / longterm(conditional/durable/selective). 3 discriminator datatype로 완전 분리. h-multiagent hasMemory 3개 전부. **KEEP.**

### ModelConfig (2) — clean
mc-opus / mc-sonnet, promptText+tokenEstimate. **KEEP.**

### Observation: ObservationSpace 5 / AreaOfInterest 5 / AreaOfObservation 10 — clean, 롤업 정상
5 space(orchestrator/developer/vnv/inspection/synthesizer) 각각 hasAreaOfInterest 1 + hasAreaOfObservation 2(external/internal). external AoO만 coversInterest로 AoI 결합(내부 AoO는 intent 없음 — disambiguation 감사 기지 N1). agent→agentObservation→space→area 체인으로 h-multiagent 롤업(validate reachability 포함). **KEEP 전부.**

| flag | 판정 | 근거 |
|---|---|---|
| AoO 10개는 ho:tokenEstimate 보유, AoI 5개는 **부재** | KEEP-but-clarify(low) | 둘 다 definition-only 텍스트 프로파일(promptText 없음)이라 §1c 스코프 기준 **AoI의 부재가 정론**, AoO의 보유가 오히려 스코프 초과 방향. 단 AoO는 observedTokenVolume와의 분리(주석에 명시: pack-cost vs runtime-volume) 목적의 의도된 보유 → 무해. 비대칭이나 [지킴] 위반 아님. |

### verification: FailurePolicy 8 + TestScenario 2 — clean, 판별절 완비
| id | 판정 | 판별절 |
|---|---|---|
| fp-dispatch-timeout | KEEP | 조건=**침묵**(무응답). |
| fp-agent-failure-retry | KEEP | 조건=**보고된 실패**. 정의가 "Distinguished from fp-dispatch-timeout, whose condition is SILENCE"로 명시 구분. |
| fp-validation-fail | KEEP | 게이트 거부, 체크 약화 금지. |
| fp-insufficient-input | KEEP | 입력 부족. |
| fp-review-critical-rework | KEEP | 최상 severity 리뷰 소견. |
| fp-source-unavailable | KEEP | 외부 소스 도달불가. |
| fp-conflict-contradiction | KEEP | 병렬 산출물 모순. |
| fp-refer-to-expert | KEEP | 역량/권한 초과. 정의가 insufficient-input(입력만 부족)·conflict-contradiction(모순 해소)와 **양방향 명시 구분**. |
| scn-compose-smoke / scn-trigger-near-miss | KEEP | 정상 happy-path vs trigger-negative near-miss. scenarioReferences로 verify-harness step 결합. |

→ dispatch-timeout↔agent-failure-retry는 가장 근접한 쌍이나 조건(침묵 vs 보고)이 실제로 상이하고 정의에 판별절 존재. **의도된 구별, 병합 대상 아님.**

### Harness (7) — clean, 라이브러리 carrier 분리는 의도
| id | 판정 | 근거 |
|---|---|---|
| h-coding / h-research / h-support | KEEP | 도메인 파일럿 3종(coding/research/support), 공유 부품으로 그래프 연결. |
| h-multiagent | KEEP | 중립 orchestrator-workers 기본 템플릿. |
| h-peer-mesh | KEEP | 토폴로지 대안(peer-mesh) carrier. |
| h-workspace-synthesis | KEEP | worker archetype + synthesis 게이트 carrier. |
| h-harness-factory | KEEP | 하네스-저작 메서돌로지 carrier. |

→ 3개 carrier(peer-mesh/workspace-synthesis/harness-factory)는 전부 h-multiagent에서 derivedFrom하나 **각기 다른 축**(토폴로지/워커팀/저작방법론)을 담고, **byte-identical materialization** 보존을 위해 부품을 h-multiagent가 아닌 별도 carrier에 둔다는 사유가 주석에 명시. 중복 아님.

### Constraint (1) — clean
con-lowlatency: h-support constrainedBy로 물림. **KEEP.**

---

## redundancy 군집 / orphan 목록

- **진짜 redundancy 군집: 없음.** 근접 후보 3쌍 전부 정의에 판별절 보유 → 의도된 구별:
  1. chan-workspace ↔ chan-task-board (둘 다 "shared file", 아티팩트-handoff vs task-claiming으로 구분).
  2. fp-dispatch-timeout ↔ fp-agent-failure-retry (침묵 vs 보고된 실패, 정의가 명시 구분).
  3. h-{peer-mesh, workspace-synthesis, harness-factory} (동일 base derivedFrom이나 축 상이 + byte-identity 사유).
- **orphan: 없음.** validate reachability = all 236 reachable. 감사 대상 전 노드 harness 롤업 확인.

## non-blocking flag 요약 (편집 아님 · 참고)

1. **label-only Capability 5종**(codeexec/fileedit/websearch/retrieval/citation) — skos:definition 부재. 라벨 자기설명+seed 일관이라 [지킴] 위반 아님. 향후 정의 보강은 선택.
2. **AoI/AoO tokenEstimate 비대칭** — AoO 10 보유 / AoI 5 부재. 둘 다 definition-only라 §1c상 AoI 부재가 정론; AoO 보유는 observedTokenVolume 분리 목적 의도. 무해.
3. **브리프 카운트/위치 stale** — SystemPrompt 실측 4(브리프 7), Instruction은 guardrails.ttl, Deliverable는 workflows.ttl, FailurePolicy+TestScenario는 verification.ttl. 이 리포트는 실측 기준.
