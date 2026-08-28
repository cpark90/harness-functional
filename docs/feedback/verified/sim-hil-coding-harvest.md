---
source: docs/feedback/sim-hil-coding-harvest.md
verdict: apply-plan-ready   # 사용자 선택(A/B/C) 대기 — 선택 즉시 orchestrator wave brief 분할 가능
targets: [tbox:ho:, ontology/abox/core, recipes]
kind: harvest-plan
graph_baseline: validate.py PASS (annotation ①②③+writeTiming land 후), lint cap 260
evidence: docs/feedback/inquiries/sim-hil-coding-harness-research.md (출처·검증수준·라이선스는 전부 이 문서 기준)
---
# 반영 계획 — 시뮬레이션·HIL·코딩 하네스 수확 인벤토리 (TBox/KG/recipe)

조사 dossier의 부품 후보를 **저작 가능한 단위**로 변환한 인벤토리. ID는 린터 PREFIX_MAP 규약
(`gr-`/`fp-`/`wfs-`/`role-`/`chan-`/`mode-`/`pat-`/`tool-`/`c-`/`scn-`)을 따르며, 정의 저작은
developer dispatch에서 §1c cap(260 tok)·영어 정의 규약으로 수행한다. 라벨은 제안치(확정 아님).

## 1층 — TBox 확장 (선행; 어휘 범주가 없어 ABox가 막히는 것만)

| # | 추가 | 대상 | 근거(GAP) | 티어 |
|---|---|---|---|---|
| T1 | `ho:approvalScope` (닫힌 값: tool-call / tool-call-arg-pattern / task-output / plan / turn / run-termination / session-mode) | Guardrail | G3 — 7개 프레임워크 게이트를 단일 클래스로 | 1 |
| T2 | `ho:attachesAt` + 개념 스킴 "guardrail attachment point"(input/dialog/retrieval/execution-pre/execution-post/output + 세션/턴/툴콜 hook 코어) | Guardrail | G8 — NeMo 5-rail×Claude Code hooks 교차 검증 | 1 |
| T3 | `ho:retrievalPolicy` (자유문 1개 — 가중·감쇠 서술) | Memory | G12 — memoryWriteTiming과 같은 결 | 1 |
| T4 | `ho:environmentFidelity` (닫힌 값: mock / cassette / replica / digital-twin / production) | EnvironmentSpace(또는 Harness 선언) | G2 — staged rollout의 전이축 | 1 |
| T5 | `ho:stageKind` (닫힌 값: acquire / analyze / decide / act) | WorkflowStep | G3 — 단계별 자율성 배정(PSW 2000) | 2 |
| T6 | `ho:oracleKind` 개념 스킴 + TestScenario 술어 소수(`ho:goalVisibility`, `ho:reliabilityAggregation`) — **단계적**(전 필드 일괄 금지) | TestScenario | G5 | 2 |
| T7 | `ho:riskLevel` (low/medium/high) | Tool | G9 — OpenAI/Google 게이트 키 | 2 |
| T8 | `ho:activationTrigger` (keyword / path / always / condition) | PromptSection·Instruction·Memory | G6 — trigger-gated 주입 | 2 |
| T9 | `ho:trustLevel`/ContentSource 라벨 (Channel·Tool 출력·Tool 메타데이터) | 다중 | G11 — 보안 최고 레버리지, **설계 난도 높아 별도 검토 후** | 보류 |

비-TBox 처리 확정: adjudicated environment(G1)는 **role-adjudicator + wfs-action-adjudication**
조합으로 시작(클래스 신설 보류); autonomy 사다리(G3)·task-lifecycle(G10)·2×2 replay는 **개념
(skos) 층**; escalation 연쇄(G4)는 fp- 개체군+채널 urgencyClass로 최소 표현.

## 2층 — KG(중앙 core ABox) 중립 부품

### 1티어 (수렴도·근거 최상 — 총 ~50)

**HIL 부품군 (wave-H)**
- Guardrail(7): `gr-dual-approval`(four-eyes, gr-human-checkpoint의 강한 형제) ·
  `gr-auto-reply-budget`(연속 자율행동 상한+인간 개입 시 리셋) · `gr-resume-idempotency`
  (interrupt 전 부수효과 멱등) · `gr-plan-evidence`(계획엔 diff/dry-run 증거 동반 — 그럴듯함≠
  정확) · `gr-stopping-condition`(최대 반복·정지 조건) · `gr-safe-halt`(중단은 안전 상태 도달까지)
  · `gr-rejection-feedback`(거부는 이유 동반+다음 시도 컨텍스트 주입 계약)
- FailurePolicy(6): `fp-unanswered-approval`(기한부 에스컬레이션 연쇄: A→B→제약완화→안전
  기본값) · `fp-approval-gate-decay`(rubber-stamping 감지: seeded probe·승인율 감시·로테이션) ·
  `fp-reject-retry-feedback` · `fp-error-compaction`(오류 요약 재주입+한도 재시도) ·
  `fp-dismissal-vs-decline`(무시=재시도 가능, 명시거절=종결) · `fp-pause-format-drift`(장기
  승인 대기 중 직렬화 버전 고정)
- WorkflowStep(4): `wfs-interrupt-resume`(correlation id 체크포인트→인간 응답이 반환값) ·
  `wfs-output-review`(산출 후·전달 전 게이트) · `wfs-control-transfer`(권한 이양을 명시 단계로)
  · `wfs-clarification-round`(ambiguity 마커 0까지)
- Channel(2): `chan-approval`(내구·주소지정·스레드 상관·authorized-responder·구조화 거부 옵션)
  · `chan-elicitation`(평면 스키마 질의→accept/decline/cancel)
- Concept(6): `c-human-in-loop`/`c-human-on-loop`/`c-human-out-loop`(c-autonomy narrower) ·
  `c-automation-bias` · `c-rubber-stamping` · `c-meaningful-control`(tracking/tracing)
- TestScenario(1): `scn-oversight-efficacy`(알려진 불량 출력을 게이트 상류 주입 — **게이트**를
  시험; h-multiagent에 결합)

**시뮬레이션 부품군 (wave-S)**
- Role(5): `role-user-simulator`(숨긴 시나리오로 인간측 연기·tool-constrained) ·
  `role-adjudicator`(GM: 행동 검증→event 발급→부분 관측 배급→종료 판정) · `role-wizard`
  (인간이 에이전트/환경 연기 — tester의 역상) · `role-task-specifier`(모호 요청→구체 과업) ·
  `role-npc`(적대/모호 자극 배우) — 공통 상위 개념 `c-simulation-standin` 동반
- WorkflowStep(3): `wfs-action-adjudication` · `wfs-reflection-consolidation`(임계 트리거 통찰
  승격+증거 인용) · `wfs-trace-promotion`(실패 트레이스→fixture 승급)
- FailurePolicy(1): `fp-invalid-action-resolicit`(상태 위반 행동 거부+통지+재요청)
- Guardrail(3): `gr-oracle-leak`(시뮬 유저의 정답 유출 금지) · `gr-simulator-calibration`
  (시뮬 판정으로 승급하려면 인간 표본 보정 선행) · `gr-role-lock`(역할 전도 금지 inception)
- ExecutionMode(1): `mode-shadow`(실입력 병행·출력 보류·불일치 분류·사전 선언 promotion gate)
- Tool(2): `tool-env-interface`(reset/step/observe/enumerate-actions 계약) ·
  `tool-counterfactual-query`(whatif/remove 질의 계약)
- Memory: 신설 없음 — mem-longterm에 T3 retrievalPolicy 부여(scored retrieval 서술)

**코딩·보안 부품군 (wave-C)**
- Guardrail(4): `gr-aci-observation`(간결-정보성 관측+창 크기, ACI 원칙+ablation 근거) ·
  `gr-trifecta-exclusion`(사적데이터·미신뢰콘텐츠·외부송신 capability 동시 결합 금지 —
  **조합 시점 SHACL shape 동반**) · `gr-tool-metadata-pin`(설명 해시 핀+변경 시 재승인+가시성
  parity) · `gr-skill-inclusion`(모델이 못 짜는 것만 라이브러리에)
- Tool(2): `tool-lint-gated-edit`(편집→검사→실패 시 자동 원복+진단) · `tool-ranked-map`
  (참조 그래프 중심성+작업셋 개인화+예산 이진탐색)
- Role(2): `role-reasoner`/`role-applier`(해결 모델·적용 모델 분리쌍)
- WorkflowStep(2): `wfs-post-edit-verify`(편집→lint/test→진단 재주입 루프) ·
  `wfs-context-compaction`(요약 재개시·recall 우선)
- DesignPattern 신설(6): `pat-dual-llm`(privileged/quarantined+심볼 참조) · `pat-action-selector`
  (폐쇄 행동 메뉴+피드백 차단) · `pat-context-minimization` · `pat-gated-artifact-chain`(SDD:
  단계별 산출물+게이트, gateProfile=자율성 다이얼) · `pat-shadow-promotion`(sandbox→shadow→
  canary→live 사다리) · `pat-minimal-baseline`(대조군 아키타입)
- DesignPattern enrich(7 — **신설 금지**, dossier §8 표 그대로): pat-pipeline·pat-expert-pool·
  pat-fanout-fanin(+voting 변형 여부는 developer 판단 위임 금지→brief에서 결정)·
  pat-producer-reviewer·pat-hierarchical-delegation·pat-blackboard·pat-planexec(+control-flow
  integrity 보안 독해)
- Concept(3): `c-verification-ladder`(in-prompt→evaluator→결정론 게이트→적대 검증자) ·
  `c-project-instructions-file`(nearest-file 우선 규약) · `c-taint-constraint`(섭취 후 구조적
  행동 불능 원리)

### 2티어 (보류 — 1티어 검증 후 재판단)
Horvitz 파생 guardrail 잔여(graceful-degradation·attention-timing) · EU Art.14 브리핑 번들 ·
`fp-canary-rollback` · record-replay 2×2 fixture 어휘 · `mem-checkpoint`(run-state tier — 기존
tier와 대조 필요) · handoff 계약 · A2A part-typing/deliveryMode 세부 · `role-policy-evaluator` ·
EARS 표기 Standard · scn-deceptive-plan/scn-injection-trigger(recipe 쪽 fixture로 갈 수도) ·
tool 3분류·exit-condition 개념 스킴 · AgentDojo fixture corpus 수입.

## 3층 — recipe (구체 하네스 조리법; 중앙 아님 — staging→published lane)

| recipe | 형상 원천 | bind하는 중앙 부품(요지) |
|---|---|---|
| `sim-society` | Concordia/Smallville (Apache-2.0) | role-adjudicator·wfs-action-adjudication·scored retrieval·wfs-reflection·activation 정책 |
| `eval-user-sim` | τ/τ²-bench (MIT) | role-user-simulator(tool-constrained)·gr-oracle-leak·tool-env-interface·양면 oracle·pass^k |
| `hil-approval` | LangGraph/HumanLayer v0.7.7 골격 | wfs-interrupt-resume·chan-approval·fp-unanswered-approval·gr-dual-approval·approvalScope |
| `coding-swe` | SWE-agent/mini-swe (MIT) | gr-aci-observation·tool-lint-gated-edit·pat-minimal-baseline 대조·h-coding 부품 재사용 |
| `coding-pair` | Aider (Apache-2.0) | role-reasoner/applier·tool-ranked-map·wfs-post-edit-verify |
| `sdd-chain` | spec-kit (MIT) | pat-gated-artifact-chain·wfs-clarification-round·constitution=mem-firmware 재사용 |

recipe lane 규약(메모리 준수): 중앙 커밋 대상 아님 — staging 작성→published clone push,
**catalog+CI 매트릭스 동반 갱신**, federate 게이트(central symlink) 사전 실행. 각 recipe에
dct:source+dct:license 귀속(수확 게이트 판정은 dossier §7).

## 사용자 결정 (2026-08-28, inbox `status: approved`)

**"(B) → (A)"** — 축소 범위(B: 즉시 막힌 TBox 4 + 1티어 상위 ~25개체 + recipe 3종)로 **먼저
착수**하고, 그 결과 검증 후 **전체(A)로 확장**한다. 따라서 아래 순서는 B 부분집합을 1차 wave로
돌린 뒤 같은 순서로 잔여분을 잇는다. 추가 지침(inspection): AV 이식 항목
(`verified/av-odd-scenario-transfer.md`)이 이 계획의 **형식·절차 상위 프레임**이므로, A 확장분
착수 전에 두 항목의 **술어 경계**(approvalScope·attachesAt·environmentFidelity vs envelope)를
먼저 명문화할 것.

**B wave 브리프 초안 확보 (2026-08-28, 사용자 지시로 inspection 작성)**:
`docs/feedback/inquiries/sim-hil-b-wave-brief.md` — 3단 분할(B-T: T1–T4+경계규칙 / B-K: 확정
26부품+§8 dedup 강제 / B-R: hil-approval·eval-user-sim·coding-swe). 주요 판단: `gr-safe-halt`는
av-odd W1의 safe-halt 상태 정의와 중복 위험이라 **B 제외, A 이월**(W1 land 후 참조 재사용);
T1↔approvalUnit·T4↔envelope 경계 규칙 2건을 선제 포함. 채택은 orchestrator.

## 순서·게이트 (선택 A 기준; B는 동일 순서의 부분집합)

1. **TBox wave**(T1–T4 [+선택 T5–T8]) — developer 1 dispatch, shapes·registry(PREFIX_MAP은
   신규 클래스 없음이라 무변경)·ONTOLOGYSTYLE §2/§3 동반. vnv: validate+lint+negative control.
2. **ABox wave-H → wave-S → wave-C** — 각각 developer dispatch(개체 15~20/wave, cap 260 준수,
   기존 개체 결합: 신규 guardrail/step은 h-multiagent 또는 h-coding에 결합해 anti-orphan 충족,
   개념은 scheme에 broader 연결). **각 wave brief에 dossier §8 dedup 표를 신설 금지 목록으로
   동봉**(조사 에이전트 재발 함정). vnv: wave마다 validate·retrieve 재검색(발견성)·coverage
   audit(소스 요소 전수 매핑).
3. **recipe wave** — ABox 완료 후(부품 참조 필요). recipe별 분리 brief, inspection이 land
   (staging→published, catalog/CI, federate 게이트).
4. inspection 파급 재검증 + git land(wave 단위 커밋).

## 위험·비용

- 규모: A안 ≈ 개체 +50(중앙 245→~295)+recipe 6 — 여러 세션. B안 ≈ +25+recipe 3.
- 주 위험은 **드리프트**(외부 용어 유입) — 전 개체에 기존 개념 tag 재사용·근사동의어 검사
  (validate duplicate-label)·§8 dedup 표가 방어선. 정의는 전부 자기 문장 재기술(무라이선스
  소스의 verbatim 금지 — dossier §7 게이트).
- TestScenario 확장(T6)은 스키마 파급이 가장 넓어 **단계적**(oracleKind 개념부터) 권고.

## 적용 결과 (orchestrator 기록란 — 적용 후 채움)

사용자 결정 "(B) → (A)"의 B 부분집합을 순차 웨이브로 적용 중. dispatch 모델은 opus 세션
한도(4:40am 리셋)로 대체 상위 모델 사용 — 그 사실을 각 판정 리포트에 기록.

**B-T (TBox wave T1–T4) — 완료 2026-08-28.** 그래프 **323 → 332**(+9 = 부착지점 개념 스킴),
`validate.py`·`lint_uniformity.py`·`check_determinism.py` 전부 PASS, negative control **8/8**
(scratch 전용·디스크 무오염), materialize h-coding·h-multiagent **byte-identical**(변화는
lock의 individualCount뿐), dangling `id:` 0.

- **T1 `ho:approvalScope`**(domain Guardrail, 닫힌 값 7종) + 신규 `ho:ApprovalScopeShape`
  (`sh:targetSubjectsOf` + `sh:in`; blanket GuardrailShape 신설 회피). repeatable(한 게이트가
  복수 대상을 덮을 수 있음).
- **T2 `ho:attachesAt`**(range `ho:Concept`) + 부착지점 개념 스킴 **flat 9**
  (`c-guardrail-attachment` + leaf 8: input/dialog/retrieval/execution-pre/execution-post/
  output/session/turn). tool-call 경계는 별도 leaf 없이 pre/post 쌍이 담당(정의·주석 명시).
  facet 재부모화 비용 0이 되도록 의도적으로 1단 flat.
- **T3 `ho:retrievalPolicy`**(domain Memory, 자유문) — 이번 웨이브 사용처 0(값 저작은 B-K).
- **T4 `ho:environmentFidelity`**(닫힌 값 5종) — **domain은 `ho:Harness`**. EnvironmentSpace를
  기각한 사유: 이 repo의 `id:env-space`는 "실재 전체"를 뜻하는 무한 singleton이라 fidelity가
  vacuous해지고, mock/replica 표현에 개체 신설이 필요해 모델 의미와 충돌. `ho:autonomyTier`
  배치와 대칭. EnvelopeStatement가 값을 참조하는 것은 가능(중복 아님).
- **술어 경계 명문화(inspection 지침 이행)**: approvalScope↔approvalUnit(게이트 입도 vs tier
  cadence, 값 어휘 의도적 disjoint)·attachesAt↔hookEvent(항시 규칙의 위치 vs 이벤트 구동)·
  environmentFidelity↔envelope(어떤 환경 vs 감당 범위, promotion은 동반될 뿐 함의 아님)·
  retrievalPolicy↔readTiming/readScope/activationCondition을 각 정의문에 기재.
- **첫 사용처**: 기존 guardrail 9곳에 사실 근거(promptText 직독)로 부여 — gr-nodestruct
  (execution-pre + tool-call), gr-human-checkpoint(execution-pre + plan), gr-cite/gr-lang/
  gr-structured-output(output), gr-bounded-context(retrieval), gr-user-elicitation(dialog),
  gr-envelope-check/-unknown(input). 참이 아닌 곳에는 부여하지 않음(날조 금지 준수).
- registry: 신규 클래스·접두사 0이라 PREFIX_MAP·INSTANCE_CLASSES 무변경(registryDrift ✓).
  `ONTOLOGYSTYLE.md` §3에 위치·판별자 항목 추가.

**B-K1 (ABox wave-H: HIL 부품군 ~20개체) — dispatch 진행 중.** 인벤토리는 orchestrator가
확정한 B 부분집합(Guardrail 7 / FailurePolicy 3 / WorkflowStep 4 / Channel 2 / Concept 6 /
TestScenario 1). 나머지 1티어 fp 3종·wave-S·wave-C·recipe는 후속 웨이브.

**동시 세션 조율**: 다른 orchestrator 세션(harness-ontology-2f)이 `tools/plane-editor/` 앵커
lane을 병행 중. 레인 분담 — 이 세션이 sim-hil B-wave 전체(B-T→B-K→B-R)와 AV 잔여를 보유.

**B-K1 (ABox wave-H: HIL 부품군) — 완료 2026-08-28.** 그래프 **332 → 356**(+24, 전부 신설,
maturity draft). 게이트 3종 PASS.

- Guardrail 7(`gr-dual-approval`·`gr-plan-evidence`·`gr-rejection-feedback`·
  `gr-resume-idempotency`·`gr-stopping-condition`·`gr-auto-reply-budget`·`gr-safe-halt`),
  FailurePolicy 3(`fp-unanswered-approval`·`fp-reject-retry-feedback`·`fp-dismissal-vs-decline`),
  WorkflowStep 4(`wfs-interrupt-resume`·`wfs-output-review`·`wfs-control-transfer`·
  `wfs-clarification-round`), Channel 2(`chan-approval`·`chan-elicitation`),
  Concept 6(`c-human-in-loop`/`-on-loop`/`-out-loop`·`c-automation-bias`·`c-rubber-stamping`·
  `c-meaningful-control`), TestScenario 1(`scn-oversight-efficacy`).
- **재량 신설 1건**: `wf-approval-gated` Workflow — WorkflowStep의 도달성이 `hasComponent∘hasStep`
  롤업뿐인데 기존 workflow 어느 것도 이 4단계를 정직하게 담지 못해 최소 host를 신설. vnv가
  독립 판정해 **타당**(기존 workflow 편입은 제어흐름 왜곡)으로 확인.
- **carrier 배선(W1 note N1 반영)**: 이 repo가 실제 운영하는 규율은 `h-multiagent`에 **직접**
  결합(승인 워크플로·계획 증거·거부 피드백·재개 멱등성·승인/문의 채널·fp 3행·oversight fixture)
  → 운영 문서 +45줄(삭제 0). 실제 운영하지 않는 2인 독립 승인·안전중단은
  `h-workspace-synthesis`, 반복 상한 계열은 `h-harness-factory`(bounded-iteration 가족).
- **B-T 술어 첫 사용처 확대**: `approvalScope` tool-call/plan/turn, `attachesAt`의 turn·session
  leaf 첫 점유. `gr-resume-idempotency`는 부착 지점이 사실이 아니라 의도적 미부여.

**vnv 판정 (B-T + B-K1) = PASS-with-notes** (차단 0 / 비차단 5) —
`docs/verify/sim-hil-b-wave-verify.md`. HEAD 핀 worktree 대조로 delta **+33이 인벤토리와 1:1
일치, 삭제 0**; negative control 8/8(첫 실행의 네임스페이스 오기로 인한 전건 위양성을 잡아
재실행 확정 — vacuous-pass 배제); dedup 기계 스캔 clean(정의 Jaccard ≥0.30은 의도된 pre/post
거울쌍 1건뿐); 지정 7쌍 변별이 **emit 텍스트 안에서** 확인; carrier·술어 부여 20+곳 전수 사실
대조 통과; materialize 비-carrier byte-identical·carrier 순수 추가·dangling 0; 발견성 5/5 최상위.

- 비차단 note: N1 FailurePolicy 판별절이 materialize Error-handling 표에 미emit(표가
  condition/strategy만 실음), N2 `attachesAt` range 이빨이 ConceptConnectivityShape 경유 간접,
  N3 `gr-safe-halt` 스코프가 inspection 브리프 대비 확장(이월 전제 충족·채택 권한 정당),
  N4 `retrievalPolicy`·`environmentFidelity` 실사용 0(계획대로 — 이빨은 주입으로 비-vacuous
  증명), N5 altLabel 어휘 인접(cosmetic).

**B-K2 (wave-S/C 축소분: recipe 3종이 bind하는 7개체 + `mem-longterm` retrievalPolicy 값)** —
dispatch 진행 중.

**B-K2 (ABox wave-S/C 축소분) — 완료 2026-08-28.** 그래프 **356 → 364**(+8). 게이트 3종 PASS.

- 신설 7: `role-user-simulator`(숨긴 시나리오로 상대역 연기, tool-constrained) ·
  `gr-oracle-leak`(정답 유출 금지) · `tool-env-interface`(reset/step/observe/enumerate 계약) ·
  `c-simulation-standin`(topConcept, 중간층 0) · `gr-aci-observation`(관측의 간결·정보성·창
  제한) · `tool-lint-gated-edit`(편집→검사→실패 시 자동 원복) · `pat-minimal-baseline`(대조군
  아키타입). 인벤토리 외 신설 1: `cap-environment-interaction`(기존 cap 빈자리 —
  `cap-codeexec` 재사용은 "코드 실행 가능 = 시뮬레이션 step 가능"이라는 **거짓 capability
  충족**을 만들어 기각; provided-only cap은 `cap-audit` 선례).
- 보강 1(계획이 지정한 유일한 Memory 변경): `mem-longterm`에 `ho:retrievalPolicy` =
  recency 감쇠 · 기록 시 부여된 중요도 · 현재 과업 관련성의 가중 결합으로 순위를 매겨 read
  budget 내 상위만 소비. **T3 술어의 첫 실사용**(직전 판정 note N4 해소).
- carrier: `h-coding` 직접(lint-gated 편집 도구·관측 규율 — 이 하네스가 실제로 규율하는 것,
  cap-fileedit 재사용) / `h-workspace-synthesis` 라이브러리(시뮬 역할·정답 유출 금지·환경 도구
  — 운영 하네스 부재). `pat-minimal-baseline`은 현재 control arm인 하네스가 없어
  `appliesPattern` 단언 없이 태그로만 연결(날조 회피; recipe가 bind할 몫).
- B-T 술어 확대: `attachesAt`의 **execution-post leaf 첫 점유**(gr-aci-observation — 직전 판정
  note의 공석 해소) · output(gr-oracle-leak). 승인 게이트가 아니므로 `approvalScope`는 미부여.
- materialize: 비-carrier 5종 byte-identical(lock 카운트만), carrier 2종 순수 추가(신규 role
  파일 1개 포함), dangling `id:` 0.

**B-K2 판정은 `docs/verify/sim-hil-bk2-verify.md`** — 진행 중. 그 판정에 "recipe 3종이 참조할
부품이 모두 그래프에 있는지"(계획 §3층 표 대조) 결론을 포함하도록 지시했고, 이것이 **B-R 진입
조건**이다.

**B-R (recipe 3종: hil-approval / eval-user-sim / coding-swe)** — 병행 세션
(harness-ontology-2f)에 인수 의사를 확인 중. 인수 시 `recipes/**` 레인은 그 세션이 가져가고,
미인수 시 이 세션이 이어서 dispatch한다. 어느 쪽이든 land는 레인 규약대로 inspection 소관
(staging→published clone, catalog/CI 매트릭스, federate 게이트).

**B-K2 vnv 판정 = PASS-with-notes** (차단 0 / 비차단 5) — `docs/verify/sim-hil-bk2-verify.md`.
delta +8이 브리프와 1:1(삭제 0, `mem-longterm`은 정확히 1 triple 증가), 8개 부착지점 leaf
전점유 그래프 검산, materialize는 역적용 overlay로 중간점 356을 재현한 뒤 격리 비교 —
비-carrier 5종 산문 byte-identical·carrier 2종 순수 추가(신규 role 파일 포함, tokenEstimate
delta가 신규 선언값 합과 정확 일치), 발견성 5/5 최상위. `cap-environment-interaction` 신설의
최후수단 사유도 독립 판정으로 성립(soft-reuse 시 `requires` 3곳에서 거짓 충족이 실제 성립,
provided-only 선례 3건).

- 비차단 note: N1 `retrievalPolicy`가 renderer에 참조 0줄이라 산출 문서에 미렌더,
  N2 `pat-minimal-baseline`↔`wfs-baseline-compare` 변별이 TTL 주석에만(이종 층이라 비차단),
  N3 slug의 약어 cosmetic(emit 값은 전부 중립어), N4 tool↔cap 정의 거울(구조 쌍, drift 아님),
  N5 eval-user-sim이 쓰는 "양면 oracle·pass^k"가 중앙에 부재.
- **recipe 진입 판정**: hil-approval·coding-swe는 무조건 진입 가능, eval-user-sim은 핵심 3부품
  실재하되 양면 oracle·pass^k가 T6 2티어 이월이라 **recipe-local 표현 조건부**.

**B-R (recipe 3종) — dispatch 진행 중.** 병행 세션이 인수를 거절(맥락 연속성 사유)해 이 세션이
수행. staging 저작까지만이고 published clone push·커밋은 레인 규약대로 inspection 소관.
브리프에 vnv의 조건부 제약(양면 oracle·pass^k는 recipe-local, 중앙 신설 금지)과 중앙 무수정
(개체수 364 불변 확인)을 명시. `hil-approval`에는 W1의 `autonomyTier`·`hasEnvelope`를, 시뮬·
코딩 recipe에는 T4 `environmentFidelity`를 **사실인 경우** 선언하도록 지시 — W1 판정의 비차단
note N1(선언 하네스 문서에 envelope 규율 미출현)을 실물로 해소하는 경로다.

**동시 세션 상태(2026-08-28)**: 사용자가 `b-wave-backbone-layering.md`(답 "(B) → (A)")와
`plane-editor-and-kg-content-decisions.md`(**결정 1~4만** (a); 5·6은 미응답)를 승인. facet B1과
plane-editor 결정 1·2·4는 병행 세션 lane, 결정 3(verified lane 어휘 승격)은 inspection 조사
lane(`inquiries/verified-lane-vocabulary-promotion.md`)으로 이관됨. 미응답 5·6은 어느 세션도
착수하지 않는다.
