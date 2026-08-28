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
