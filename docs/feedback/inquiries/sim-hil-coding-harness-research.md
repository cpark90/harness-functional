---
status: answered      # 사용자 요청 조사 (2026-08-28) — orchestrator/사용자 소비 후 closed
targets: [id:h-coding, id:h-multiagent, id:role-tester, id:gr-human-checkpoint, id:chan-user, id:c-autonomy, id:env-space, tbox:ho:TestScenario, tbox:ho:Channel, tbox:ho:Guardrail, tbox:ho:ExecutionMode]
related: [docs/feedback/inquiries/annotation-tooling-research.md]
retention: 해당 wave 착수~완료까지 보존 — closed여도 제거 금지 (부품 수확·TBox 확장 설계 원본)
---
# 조사 자료 — 시뮬레이션·HIL 하네스 + 코딩 하네스/에이전트 엔지니어링

사용자 요청: "시뮬레이션 및 HIL agent 하네스 자료조사 + 하네스와 에이전트 코딩 관련 자료조사".
목적: **중립 부품 라이브러리**(이 온톨로지) 관점에서 각 축의 재사용 가능한 구조 부품을 식별하고,
담을 어휘가 없는 곳은 **TBox 확장 트리거**로 명시한다(coverage-audit 게이트 규약).

**조사 방법**: 12-에이전트 워크플로(`wf_c17d696a-234`: 주제 7 + 완전성 비평 + 보충 4 — injection
보안·A2A 채널 계약·spec-driven 개발·guardrail 부착점), 1차 소스 fetch 검증 + **저장소별 LICENSE
파일 직접 fetch**(수확 게이트). 사전 내부 실측: HIL 씨앗(gr-human-checkpoint·chan-user 승인·
c-autonomy·escalate-open-decisions)과 시뮬레이션 인접부(role-tester "simulator"·TestScenario·
env-space/global-state Dec-POMDP)는 실존, 시뮬레이션 환경·유저 시뮬레이터·HIL 메커니즘 어휘는 부재.

---

## 0. 요지 (가장 중요한 결론 7개)

1. **시뮬레이션 축의 헤드라인 GAP = "adjudicated environment"**: Concordia Game Master·
   Smallville action-grounding·OASIS env-server가 공통으로 **행동과 세계상태 사이에 판정자**를
   끼운다(검증→전이→관측 발급). 우리 Dec-POMDP Environment는 수동 공간이라 이를 담을 수 없다
   — 최우선 TBox 확장 후보(§6-G1).
2. **환경 인터페이스 계약이 5개 독립 하네스에서 수렴**: `{create, reset(scenario), step(action)
   →(obs, reward, terminated, truncated, info), observe, enumerate-actions}` (BrowserGym·OSWorld·
   AgentGym·tau2 Gymnasium·AgentBench) — 중립 Tool/Environment 계약으로 저장 가치 최상.
3. **HIL의 공통 골격이 7개 프레임워크에서 동일**: approval-gate가 어떤 **scope**(tool-call/
   task-output/plan/turn/mode)를 감싸고 → **직렬화된 run-state를 correlation id로 체크포인트**
   → 내구 채널로 인간에게 라우팅 → 3+값 응답(approve/deny-with-reason/edit/escalate)이
   interrupt 반환값으로 주입. **무응답(timeout) 축이 보편적 최약점**(LangGraph는 무한대기) —
   FailurePolicy 부품군의 노다지(§2). A2A의 `input-required`/`auth-required` 상태가 이 골격의
   프로토콜 표준 자리다(§5.2).
4. **HIL 이론층은 기존 c-autonomy를 개념 사다리로 구체화**: HITL/HOTL/HOOTL(HRW 2012),
   Feng L1–L5(사용자 역할 기준 — 능력 기준과 혼동 금지), Codex의 **sandbox scope × approval
   policy 직교 2축**, PSW 2000의 단계별(acquire/analyze/decide/act) 자율성 배정. + 승인 게이트
   열화(rubber-stamping) 연구가 "게이트 자체를 시험하는 TestScenario"(seeded-error probe)라는
   신부품을 준다.
5. **코딩 하네스 축은 측정 근거가 붙은 부품이 많다**: SWE-agent ACI 4원칙(+ablation: lint-gate
   +3pp·summarized search +6pp·100-line window 최적), Aider repo-map(PageRank+예산 이진탐색,
   소스 검증), 검증 사다리(in-prompt→per-turn evaluator→deterministic stop-gate→적대적
   fresh-context 검증자). h-coding(현재 ReAct+shell/editor의 얇은 구성)의 보강 재료.
6. **dedup 경고 — 조사 에이전트의 "신규 패턴" 다수는 기존 13 DesignPattern과 충돌**(§8):
   prompt-chaining≈pat-pipeline, routing≈pat-expert-pool, evaluator-optimizer/generate-review≈
   pat-producer-reviewer, hierarchical decomposition≈pat-hierarchical-delegation, ADK
   output_key≈pat-blackboard, parallel-sectioning≈pat-fanout-fanin. **enrich(정의 보강·altLabel·
   출처 귀속)이지 신설이 아니다.** 진짜 신규는 §4·§5의 별도 목록.
7. **보안 보충 조사(비평 라운드)가 최고 레버리지 스키마 확장을 지목**: **trust/taint 라벨**
   (Channel·Tool 출력·Tool **메타데이터**·Memory 쓰기에 붙는 ContentSource/trustLevel) 없이는
   6종 injection-내성 패턴을 저장은 해도 **기계 검증은 불가**(§5.1). lethal-trifecta 배제는
   조합시점 SHACL로 검사 가능한 유일한 신종 guardrail.

---

## 1. 시뮬레이션 하네스 부품 지도

### 1.1 사회/에이전트 시뮬레이션 (Smallville·Concordia·OASIS·AgentSociety·Sotopia·CAMEL)

| 중립 부품 | 원천 (실측) | 축 |
|---|---|---|
| **environment-adjudicator Role (Game Master)** | Concordia: NL 행동 수신→타당성 검증→event statement 발급→`partial_state(player)` 관측 배급→종료 판정 | Role + **TBox GAP G1** |
| **scored-retrieval memory** | Smallville: recency(감쇠 0.995)×importance(LLM 1–10)×relevance(cos) 가중합 | Memory + GAP(retrievalPolicy 술어 부재) |
| **reflection/consolidation WorkflowStep** | Smallville: 누적 importance>150 트리거 → 질문 생성 → 인용 달린 상위 통찰을 기억에 재저장(증거 provenance 트리) | WorkflowStep |
| **plan-decomposition + react-or-continue step** | Smallville: 일→시간→5-15분 재귀 분해; 지각마다 계속 vs 재계획 | WorkflowStep |
| **grounded-variable validity FailurePolicy** | Concordia: 상태 위반 행동은 거부+통지+재요청(무상태변화) | FailurePolicy |
| **관측 배급 정책(observation-delivery policy)** | Concordia per-player partial state / OASIS RecSys 랭킹 피드 / Sotopia 관계등급 가시성 — 전부 Global state 위의 계산 필터 | ObservationSpace/Channel + GAP |
| **activation/clock 정책** | 4종 실측: operator-stepped(`run <n>`) / 턴제+무작위 initiative / 확률적 시간대 활성(OASIS 24-dim, tick=3분) / 완전 비동기(AgentSociety) | ExecutionMode + GAP(clockOwner·tickQuantum·activationPolicy) |
| **typed action-solicitation** (free-form/categorical/float) + **명시적 no-op·leave 행동** | Concordia action spec; OASIS inaction; Sotopia leave(에이전트 자기종료) | Tool/Channel |
| **channel supervisor(모더레이터)** | AgentSociety Social space: 규칙 필터가 채널에 부착 | Guardrail/Role on Channel + GAP(Channel 모더레이션 슬롯) |
| **role-lock guardrail + dual-role inception prompt** | CAMEL: "Never flip roles!"·done-token+40-msg cap | Guardrail/PromptSection |
| **task-specification step/Role** | CAMEL Task Specifier: 모호 요청→구체 과업 선행 단계 | WorkflowStep/Role |
| **social-episode TestScenario** | Sotopia: 공유 맥락+역할별 **비공개 목표**+관계 전제+턴 상한+서명형 다차원 루브릭(감점 전용 차원 [-10,0]) | TestScenario + GAP(goalVisibility·평가차원) |

라이선스: 전부 통과 — Apache-2.0 ×5(Smallville·Concordia·OASIS·AgentSociety 오픈코어·CAMEL),
Sotopia MIT. **AgentSociety는 `commercial/` 서브트리 제외**(README 명시). 주의: AgentSociety 2는
1.x 논문 구조와 다름 — 부품 귀속은 1.x.

### 1.2 평가 시뮬레이션·유저 시뮬레이터 (τ-bench/τ²·WebArena·OSWorld·BrowserGym·AgentGym·Terminal-Bench·SWE-bench)

- **user-simulator Role**: 숨긴 시나리오(정체·의도·선호)로 인간측을 연기, 물으면만 공개.
  τ-bench는 전략 스택(llm/react/**verify**/**reflection** — 송신 전 자기검증)이 플러그형.
  **fidelity 대책 3종**: oracle-leak guard(숨긴 목표 대화 유출 금지), 자기검증 guardrail,
  **tool-constrained simulator**(τ²: 시뮬 유저에게도 도구+관측공간 부여 — 우리 Dec-POMDP
  Agent 모델로 직접 표현 가능, 프롬프트 전지성 제거가 신뢰성 기전). 실패모드 어휘:
  비협조 행동 4종(불가 서비스 요구·탈선·조급·불완전 발화)= PersonaSpec/행동특성 GAP.
- **TestScenario 확장 필드가 보편적으로 우리보다 풍부** — 실측 공통분모:
  `environmentRecipe`(컨테이너/이미지 = Terminal-Bench Dockerfile·SWE-bench 3층 이미지),
  `setup 초기상태 레시피`(OSWorld), **typed oracle 목록**(WebArena: string/url/program_html;
  OSWorld: getter+metric; τ: DB 종상태 × 필수 전달정보; SWE-bench: **fail-to-pass + pass-to-pass
  양면 회귀 oracle**), `referenceSolution`(해결가능성 증명), **신뢰도 집계**(τ pass^k — ALL k
  성공; pass@k와 혼동 금지), reward_basis 선택자, ablation 변형(no-user 진단 = 추론 vs 소통
  오류 분리). → §6-G5.
- **decoupled evaluation orchestration**(AgentBench task-server/agent-server/assigner;
  AgentGym env-as-a-service 5-verb HTTP) = DesignPattern(기존 축 조합, TBox 불요).
- 라이선스: 전부 MIT/Apache-2.0 통과 (AgentBench는 파일 재확인 후 수확).

## 2. HIL 부품 지도

### 2.1 메커니즘 (LangGraph·HumanLayer·AutoGen·CrewAI·OpenAI SDK·Claude Code·MCP)

- **interrupt-checkpoint-resume WorkflowStep kind** (핵심 부품): pause 지점이 payload 발급 →
  correlation id(thread_id / run_id+call_id / execution_id+task_id)로 상태 영속 → 인간 응답이
  interrupt의 **반환값**으로 주입 → 노드 재시작 의미론(**resume idempotency guardrail**:
  interrupt 이전 부수효과는 멱등 필수, 노드당 interrupt 1회).
- **durable approval Channel**: 주소(채널/유저/이메일)+스레드 상관(thread_ts/in_reply_to)+
  **authorized-responder 집합**+구조화 거부 옵션(ResponseOption{name,title,prompt_fill}).
  **거부는 항상 이유를 싣고 그 이유가 다음 시도의 컨텍스트로 주입**(5개 프레임워크 공통
  불변식 — approval-gate guardrail의 계약으로 명문화).
- **approvalScope enum** (§6-G3): {tool-call, tool-call+argument-pattern(Claude Code
  `Bash(rm *)`), task-output(CrewAI), plan(plan mode), turn(AutoGen ALWAYS), run-termination
  (AutoGen TERMINATE), session-mode(permission_mode 사다리)} — 한 속성으로 7개 프레임워크
  게이트를 단일 Guardrail 클래스에 수납.
- **무응답 FailurePolicy 계보**(최약 문서화 축 = 우리가 선점할 부품): wait-indefinitely-on-
  durable-checkpoint(LangGraph) / fallback-to-auto(AutoGen skip) / fail-closed-terminate /
  escalate-to-additional-recipients(HumanLayer Escalation — SDK 소스 검증) / reprompt-later-
  on-dismissal(MCP cancel). **decline(명시 거절=종결) vs cancel(무시=재시도 가능)** 구분이
  failureCondition 정제로 재사용됨. + 'serialization-drift-across-pause'(장기 승인 대기 중
  포맷 버전 고정 — OpenAI SDK 경고).
- **3값 정책 게이트**: Claude Code PreToolUse {allow, deny, **ask**(=인간 에스컬레이션)} +
  hard-block(exit 2)이 soft-allow에 우선하는 선례; 정책 평가자가 자체로 LLM/에이전트일 수
  있음(delegated policy evaluator Role). **auto-reply budget with human-reset**(AutoGen
  max_consecutive_auto_reply — 인간 개입 시 카운터 리셋) = 신규 rate-limit guardrail.
- **MCP elicitation**: 스키마 제약(평면 원시형만) 인간 질의 채널 계약 {message, schema} →
  {accept(content)|decline|cancel}; no-sensitive-elicitation·요청자 표시·rate-limit guardrail 동반.
- 라이선스: 전부 통과(LangGraph·AutoGen 코드·CrewAI·OpenAI SDK MIT; HumanLayer Apache-2.0
  — **deprecated이므로 태그 v0.7.7에서 수확**; MCP 스펙 Apache-2.0/MIT). Claude Code는
  독점 — 구조만 문서에서 중립화.

### 2.2 이론·어휘층

- **개념 사다리 2종** (기존 c-autonomy의 skos:narrower로): ① HITL/HOTL/HOOTL — 사전행동
  승인 게이트 / 감독+override / 무감독 (HRW 2012 원전; "대상/무력" 표현은 "consequential
  action"으로 재기저화해 중립화). ② Feng L1–L5 (operator/collaborator/consultant/approver/
  observer — **사용자 역할** 기준; 레벨별 통제 메커니즘이 그대로 guardrail 후보: L4
  customizable approval-condition, L2 bidirectional control-transfer step, L5 emergency
  off-switch). "autonomy certificate"=maxAutonomyTier 상한 주석으로 중립화.
- **단계별 자율성 배정**(PSW 2000): WorkflowStep을 acquire/analyze/decide/act로 분류하고
  단계별로 다른 tier 배정 — "분석은 자율, 실행만 게이트" DesignPattern. WorkflowStep에
  stage-kind 속성 GAP.
- **Horvitz 12원칙 중 이식성 높은 것**: 불확실성 시 범위 축소(graceful-precision-degradation
  guardrail — 추측보다 좁게), 주의비용 고려 통보 타이밍(Channel의 interruption-cost tier),
  approve-AND-edit(편집 가능 초안 핸드오프 step — approve-only보다 풍부), 사용자 직접
  invoke/terminate. (5번 clarification-dialog는 기존 escalate-open-decisions와 일치 — enrich.)
- **EU AI Act Art.14 오버시어 5능력 번들**: 능력·한계 브리핑(PromptSection), automation-bias
  인지, 해석 지원(출력에 rationale 동반 계약), override/disregard/reverse 권리(기존 chan-user
  일치 — enrich), **safe-state 정지**(중단이 "안전 상태 도달"까지 — 체크포인트 일관성 요건).
- **four-eyes/dual-approval guardrail**: 독립된 2인 승인 — gr-human-checkpoint의 강한 형제
  개체(대체 아님; 승인자 수+독립성 제약 속성). 14(5)는 생체인식 한정 규제 사례로만 인용.
- **게이트 열화 부품군**: automation bias/complacency/omission·commission error/rubber-stamping
  개념 5종 + **approval-gate degradation FailurePolicy**(회복: seeded-error probe·승인율/지연
  모니터링·리뷰어 로테이션) + **oversight-efficacy TestScenario**(알려진 불량 출력을 게이트
  상류에 주입해 **게이트를** 시험 — 에이전트가 아니라). Green 2021: 오버사이트는 실증 없이
  정당화 금지 — 이 fixture가 그 실증 장치.
- **transfer-of-control 전략**(Pynadath/Scerri/Tambe JAIR 2002): 승인 대기를 1샷이 아니라
  **조건 연쇄**(A에게 d1까지 → B 에스컬레이션 → 조정제약 완화로 시간 벌기 → 안전 기본값
  자율행동)로 — 무응답 FailurePolicy의 원전. + **escalation policy 구조**(severity→채널
  urgency→responder→ack-deadline→다음 홉) = §6-G4.
- **meaningful human control**: tracking(인간 이유에 응답)·tracing(모든 결과가 책임질 인간에
  소급) 조건 — 기존 traceability 개념·provenance 부품의 이론 기저로 인용.

## 3. 시뮬레이션 × HIL 교차 (시뮬레이션으로 감독 비용을 낮추는 패턴)

- **plan-preview/dry-run 게이트**: terraform의 **saved-plan 결정론**("검토한 계획 그대로
  실행" — 재계획 금지 guardrail)+기계가독 게이트 신호(exit 0/1/2). CHI 2025 실증: 계획 검토는
  오류 발견을 돕지만 **그럴듯한 계획이 신뢰를 오보정** — 'plan-plausibility-is-not-correctness'
  guardrail(계획엔 diff/dry-run 증거 동반 필수) + 'deceptively-plausible-plan' TestScenario.
- **shadow mode**: 실입력 병행 실행+출력 보류+4-bucket 불일치 분류(agent정답/기존정답/둘다
  허용/둘다 불가)+**사전 선언된 promotion gate**(합의율·불안전율·지연·비용)→자율성 사다리
  단계 승급. **기존 4 ExecutionMode에 없는 observe-only 모드** = §6-G7. 판정자는 기존
  benchmarker 인스턴스로.
- **canary-rollback FailurePolicy**: 단계적 노출(0.1→100%)+지표 임계 위반 시 자동 원복.
  기존 축 조합으로 표현 가능(신설 불요).
- **record-replay 2×2**: {정책 실물/스텁} × {환경 실물/스텁} — cassette 스텁(vcr-langchain,
  MIT)=둘 다 스텁, **decision-replay**(langchain-replay, Apache-2.0)=LLM만 스텁+실환경 실행,
  sandbox=정책 실물+환경 스텁, live=둘 다 실물. 이 2×2가 fixture 종류를 정리하는 소어휘.
  LangGraph time-travel replay는 **비결정론**(LLM 재호출) — cassette와 짝지어야 결정 replay.
- **fork-from-checkpoint 반사실 탐색**: 체크포인트에서 상태 수정 분기 → 대안 시도 → 비교 —
  승인 전 what-if의 실행 기질. DIVERT 실증: snapshot-branch가 **토큰당 실패 발견율**을 높임
  (sim-then-HIL 효율 지표). AXIS: 시뮬레이터에 typed 반사실 질의 {whatif, remove} 인터페이스.
- **trace-promotion WorkflowStep**: 프로덕션 실패 트레이스 → TestScenario fixture 승급 →
  CI 회귀 게이트 — 인간이 한 번 분류한 실패를 영구 기계검사화(감독 비용 상각).
- **simulator-calibration gate**: 시뮬 유저는 오보정 프록시(성공률 최대 9pp 편차, 인구집단별
  편향 실측) — 시뮬 사전심사 판정으로 승급을 gate하려면 시뮬레이터 자체를 인간 표본에
  보정 후. 이것이 sim-then-HIL 파이프라인의 안전 보완 guardrail.
- **Wizard-of-Oz**: 인간이 에이전트/환경을 연기 — role-tester(기계가 유저 연기)의 **구조적
  역상**. wizard/facilitator Role + closed/open/hybrid 응답모드 + **deception-debrief guardrail**.
- **replicated-service sandbox**(OpenAgentSafety, MIT): 실도구+로컬 복제 백엔드+합성 데이터+
  NPC 적대 프롬프트. **environment-fidelity tier**(mock/cassette/replica/twin/production)
  GAP — staged rollout(sandbox→shadow→canary→live)은 이 tier 위의 전이다(§6-G2).

## 4. 코딩 하네스·엔지니어링 부품 지도

### 4.1 시스템 실측 (h-coding 보강 재료)

- **ACI 4원칙 + 측정 근거**(SWE-agent): 단순 행동·압축 행동·간결-정보성 관측·오류복구 내장.
  ablation: lint-gate 없는 편집 -3pp, iterative search -6pp(요약 검색 대비), 100-line 관측
  창이 30-line·전체파일 모두 이김. → **lint-gated edit with auto-revert Tool 계약**,
  **summarized-search + result-cap + narrow-query nudge Tool 계약**, 관측 window-size 속성.
- **ranked structural map**(Aider repomap.py 소스 검증): tree-sitter def/ref 그래프 →
  현재 작업셋 personalization PageRank → **토큰 예산 이진탐색** — "대형 아티팩트 공간의
  예산 내 salience-랭킹 지도"로 중립화(우리 retrieve.py와 같은 과의 부품).
- **reasoner/applier(architect/editor) Role pair**(Aider): 해결 모델과 편집 적용 모델 분리 —
  production 쌍(oversight 쌍인 benchmarker/auditor와 별개). + **post-edit verification loop**
  (편집→lint/test→비0 종료면 진단을 컨텍스트로 재시도) FailurePolicy.
- **minimal-baseline DesignPattern**(mini-swe-agent): bash 단일 도구·무상태 subprocess·선형
  히스토리로 >74% — 추가 부품이 자기 값을 증명해야 하는 대조군 아키타입.
- **sandbox scope × approval policy 직교 행렬**(Codex): read-only/workspace-write/full ×
  untrusted/on-request/never — c-autonomy의 2축 분해 선례(§6-G3).
- **event-stream state**(OpenHands): append-only 행동+관측 로그가 유일 상태; reset/step 최소
  에이전트 계약; 3채널 실행면(shell/kernel/browser) 컨테이너 런타임; **trigger-gated
  instruction module**(키워드/경로 트리거 시에만 주입 — §6-G6 activationTrigger GAP);
  AgentSkills 포함 기준("모델이 못 짜는 것만") = Tool 라이브러리 저작 guardrail.
- **Claude Code 구조**(독점 — 개념만): lifecycle hook 3박자(세션/턴/툴콜)+allow/deny/ask 계약
  (§6-G8의 실측 1호), delegation-by-description 라우팅, fork vs fresh-context 스폰 축,
  spawn-depth cap, **verification escalation ladder**(in-prompt→per-turn evaluator→
  deterministic stop-gate→적대적 fresh-context 검증자), plan-approval 모드 전환, 요청 예산
  guardrail·pre-change snapshot checkpoint(Cursor/Copilot 수렴).
- **AGENTS.md 규약**(Linux Foundation): 프로젝트 지침 파일 + **nearest-file 우선 병합** —
  file-sourced SystemPrompt 부품 + scope-precedence 개념.

### 4.2 실무 원리 카탈로그 (enrich 대상 다수 — §8 dedup 필수)

- 신규성 있는 것만: **stopping-condition guardrail**(최대 반복·정지 조건), **plan-transparency
  guardrail**, **complexity-budget 개념**(워크플로→에이전트 승급은 실증 이득 시만), Anthropic
  context-engineering 6기법 중 **compaction WorkflowStep**(recall 우선 튜닝 규칙)·just-in-time
  retrieval(=우리 golden rule 1의 외부 실증)·attention-budget 개념·**prompt-altitude standard**,
  gather→act→verify 루프의 **checker 3종 스킴**(결정론 규칙/시각/판정모델), 12-Factor 중
  F6(launch/pause/resume)·F9(**error-compaction FailurePolicy**)·F12(stateless-reducer)·
  F7의 도구화 형태("인간 접촉도 구조화 tool call"), OpenAI **tool 3분류**(data/action/
  orchestration)+run exit-condition 어휘+**tool risk-rating**(read-only/가역성/권한/금전 →
  §6-G9)+guardrail 7종 중 신규 5종(관련성/injection 분류기·PII·moderation·규칙 필터)+
  **handoff**(대화 상태를 갖고 가는 단방향 이양 — sub-agent 호출과 구별), Anthropic 도구
  저작 6실무(통합·네임스페이스·자연어 식별자·토큰 효율·설명 프롬프트·평가 주도) =
  Standard 군, **trajectory-eval vs outcome-eval** 축 + match-mode {strict/unordered/subset/
  superset} (§6-G5의 ExpectedTrajectory GAP).

## 5. 보충 조사 4종 (완전성 비평 라운드)

### 5.1 injection-내성 설계 패턴 (Beurer-Kellner 2506.08837 + CaMeL + Willison + Invariant)
- 핵심 원리(taint-constraint): "미신뢰 입력을 삼킨 뒤에는 그 입력이 consequential action을
  촉발하는 것이 **구조적으로** 불가능해야" — 휴리스틱 탐지는 본질적으로 취약.
- 6패턴 → 우리 축: action-selector(폐쇄 행동 메뉴+피드백 차단·신규), **plan-then-execute는
  기존 pat-planexec의 보안 독해로 enrich**(control-flow integrity; 잔여 위험=파라미터 오염
  FailurePolicy), map-reduce isolation(fanout-fanin+항목별 격리+**output-schema-clamp**
  guardrail), **dual-LLM 격리 Role 쌍**(privileged-planner는 심볼 참조만/quarantined-processor는
  무도구 — 신규 보안 Role 쌍), code-then-execute(CaMeL: 신뢰 질의에서만 제어·데이터 흐름
  추출+값에 capability 라벨+툴콜마다 정책 집행; AgentDojo 77% 증명가능 보안 vs 84% 무방비),
  context-minimization(지정 컨텍스트 구간 폐기 step — 캐시 축출을 보안 행위로도).
- **lethal-trifecta 배제 guardrail**: {사적 데이터 읽기, 미신뢰 콘텐츠 섭취, 외부 송신} 3종
  capability를 한 하네스에 동시 결합 금지 — **조합 시점 SHACL 검사 가능**(providesCapability
  closure 위의 shape). 확률적 필터 의존은 anti-pattern 개념으로.
- **tool 메타데이터도 미신뢰 콘텐츠**(MCP tool-poisoning/rug-pull/shadowing): 설명 해시 핀
  +변경 시 재승인, model-가시 텍스트=human-렌더 가능(visibility parity), 소스 간 격리 —
  Tool에 toolDescriptionHash/toolSource 속성 GAP. AgentDojo(MIT)는 injection-trigger
  TestScenario corpus로 직접 수확 가능(97 과업×629 공격, env/task/attack/defense 분해).
- Google 3원칙(명확한 인간 통제자·제한 권능·관측 가능 행동)+결정론 정책 엔진(allow/block/
  **require-confirmation**) = Claude Code 게이트와 동형 — 교차 검증 소스.

### 5.2 inter-agent 채널 계약 (A2A — Linux Foundation, Apache-2.0; ACP는 A2A에 흡수·아카이브)
- **task-lifecycle 상태 어휘 9종**(A2A v0.3.0): submitted/working/**input-required**/
  **auth-required**/completed/canceled/failed/**rejected**(수행 거절≠실패)/unknown — 중단 2종이
  HIL의 프로토콜 자리(gr-human-checkpoint가 꽂히는 wire-level 슬롯), resume은 같은 taskId의
  후속 message/send. ACP도 같은 골격(awaiting+resume)에 독립 수렴 — 중립성 증거.
- **typed part union**(text/file(inline|uri)/data) + **Message vs Artifact 규범 분리**(대화는
  산출물을 싣지 않는다 — 우리 report-over-prompt·Deliverable 관행의 프로토콜 대응물) +
  **correlation triple**(messageId/taskId/contextId).
- **deliveryMode**(sync/stream(append·lastChunk)/push-webhook/resubscribe) + capability
  manifest(AgentCard: skills·I/O MIME modes·전송·기능 플래그 — providesCapability의 wire 대응,
  well-known URI 발견 step). Channel 축 GAP 다발(§6-G10).

### 5.3 spec-driven development (spec-kit MIT 수확 가능; Kiro/Tessl 독점 — 패턴만)
- **gated-artifact-chain Workflow**: constitution→spec→plan→tasks, 단계마다 산출물 1개+승인
  게이트(게이트 대상 = 채팅이 아니라 **산출물**). Kiro "Quick Spec"(무게이트 자동)이 게이트
  기본값의 반증 — **gateProfile**(게이트 밀도 = 자율성 다이얼)로 변형 통일.
- **constitution** = firmware-tier memory + compliance-check step 겸용(spec-kit는 문자 그대로
  `memory/constitution.md`); **phase-boundary gate checklist + justified-exception override**
  (게이트=기계 검사 술어 목록+기록된 예외 탈출구 — 인간 클릭과 다른 게이트 종);
  **[NEEDS CLARIFICATION] 마커**(기존 escalate-open-decisions의 실현 — 산출물 내 마커 0이
  게이트 술어); EARS 표기("WHEN…THE SYSTEM SHALL…")는 **TestScenario로 1:1 컴파일**되는
  요구 표기 Standard; cross-artifact consistency-audit step(우리 coverage-audit 게이트의 외부
  실증); iterate-until-Converged 루프; template-as-prompt-constraint(출력 스키마=저작 프롬프트
  =자기검토 체크리스트). → **PhaseArtifact/Plan 산출물 클래스 GAP의 최대 사례**(§6-G6;
  lifecycle: ephemeral vs anchored 속성).

### 5.4 guardrail 부착점 taxonomy (NeMo Guardrails + guardrails-ai — 둘 다 Apache-2.0)
- **5-rail 부착점**: input(모델 호출 전)/dialog(canonical form 후 대화 통제)/retrieval(검색
  청크 필터)/execution(툴콜 전·후 2 하위점)/output(모델 출력 후) — Claude Code hook 이벤트와
  독립 교차 검증되는 **attachmentPoint 어휘**(§6-G8). guardrails-ai는 field-level(JSON path)
  부착 granularity 추가.
- **rail = (부착점, 검사 술어, on-fail 회복)** 3중 분해 — 두 프레임워크 독립 수렴. on-fail
  enum 8종(REASK/FIX/FILTER/REFRAIN/NOOP/EXCEPTION/FIX_REASK/CUSTOM) = recoveryStrategy 어휘;
  violationHandlingMode(내부 처리 vs 호출자 전파); 병렬 rail은 비변형 검사만 안전.
- **RailManifest** = NVIDIA가 guardrail을 typed part로 카탈로그화(placement·capability
  verbs allow/block/moderate·enforcing flow·호출 action·모델 의존) — **우리 부품 라이브러리
  접근의 외부 선례**. rail의 Binding.context(읽는 상태 변수 선언)는 Guardrail에도
  ObservationSpace 개념이 적용된다는 노트.

## 6. TBox 확장 트리거 종합 (schema GAP — 우선순위순)

| # | GAP | 증거 수렴도 | 최소안 |
|---|---|---|---|
| G1 | **adjudicated/simulation environment**: 행동 판정자(검증→전이→관측 발급)+환경 인터페이스 계약(create/reset/step/observe/enumerate-actions/whatif) | 시뮬 5종+평가 5종+AXIS | adjudicator Role 개체+action-adjudication step kind, 또는 SimulationEnvironment 클래스(interface 계약 속성) — env-space 옆 |
| G2 | **environment-fidelity tier**: mock/cassette/replica/digital-twin/production (+replay 2×2) | OpenAgentSafety·sandbox taxonomy·staged rollout | Environment 술어 1개(닫힌 값) |
| G3 | **autonomy 2축 구체화**: approvalScope enum + autonomy-tier 사다리(개념) + sandbox-scope 직교축 + per-stage(acquire/analyze/decide/act) 배정 | HIL 7 프레임워크+Codex+Feng+PSW | c-autonomy 아래 개념 사다리(비-TBox)+Guardrail에 approvalScope 술어+WorkflowStep stage-kind |
| G4 | **escalation-policy 구조**: (severity→채널 urgency→responder→ack-deadline→다음 홉) 순서 연쇄 | JAIR 2002+incident 실무+HumanLayer | 순서 연쇄가 필요하면 신클래스; 최소안은 severity 개념 사다리+Channel urgencyClass+홉별 FailurePolicy |
| G5 | **TestScenario 확장**: typed oracle 목록·setup/environmentRecipe·referenceSolution·양면 회귀 oracle·pass^k 신뢰도·역할별 비공개 목표(goalVisibility)·ExpectedTrajectory+match-mode·fixture provenance(recorded/authored) | 평가 하네스 8종+agentevals | 단계적: oracleKind 개념+속성 소수부터 |
| G6 | **PhaseArtifact/Plan 산출물 클래스**: 승인 채널이 가리키고 실행이 결박되는 1급 계획/명세 산출물(+lifecycle ephemeral/anchored, ambiguity-marker 상태) + **activationTrigger**(PromptSection/Memory의 조건부 주입) | terraform·plan mode·SDD 2종·microagents/skills | Deliverable 계열 확장 여부 검토 후 결정 |
| G7 | **ExecutionMode 후보 2**: shadow/observe-only; (검토) 확률적 대량 활성·WoZ human-backed — 기존 4종과 대조 후 | shadow 실무+OASIS+WoZ | mode-shadow 1개는 근거 충분; 나머지는 기존 모드 속성으로 흡수 검토 |
| G8 | **guardrail attachmentPoint 어휘** + (부착점, 술어, on-fail) 3중 분해+recoveryStrategy enum | NeMo 5-rail+guardrails-ai+Claude Code hooks | Guardrail 술어 attachesAt(개념 스킴)+FailurePolicy recoveryStrategy 값 확충 |
| G9 | **Tool 위험·신뢰 속성**: riskLevel(+가역성·권한·금전 요인)·toolDescriptionHash/toolSource(메타데이터 taint) | OpenAI 가이드+Google+MCP poisoning | Tool datatype 2-3개 |
| G10 | **Channel 확장**: task-lifecycle 상태 어휘·part typing·correlation id·deliveryMode·duplexity(half/full)·모더레이션 슬롯·capability manifest | A2A/ACP 수렴+τ²+AgentSociety | 개념 스킴+Channel 술어 소수 (프로토콜 전체 모사는 금지 — 중립 골격만) |
| G11 | **trust/taint 라벨**(ContentSource/trustLevel — Channel·Tool 출력·Tool 메타데이터·Memory 쓰기) | injection 6패턴+CaMeL capability+trifecta | 보안축 최고 레버리지; 이것 없이는 G9·5.1 패턴이 기계검증 불가 |
| G12 | Memory **retrievalPolicy**(가중·감쇠)+run-state checkpoint tier | Smallville+LangGraph checkpointer | Memory 술어 1-2개 (직전 memoryWriteTiming land와 같은 결) |

## 7. 수확 게이트 (라이선스 판정 — LICENSE 파일 직접 확인 기준)

- **통과(수확 가능)**: Smallville·Concordia·OASIS·CAMEL·Aider·Codex CLI·BrowserGym·WebArena·
  OSWorld·AgentBench(파일 재확인 권장)·AgentGym·Terminal-Bench·adk-docs·NeMo Guardrails
  (메타데이터 NOASSERTION이나 LICENSE.md=Apache-2.0)·guardrails-ai·A2A·CaMeL·mcp-scan
  [Apache-2.0] / Sotopia·τ-bench·τ²-bench·SWE-bench·SWE-agent·mini-swe-agent·OpenHands·
  LangGraph·AutoGen(LICENSE-CODE)·CrewAI·OpenAI SDK·agentevals·vcr-langchain·AgentDojo·
  OpenAgentSafety·spec-kit [MIT] / langchain-replay [Apache-2.0].
- **조건부**: AgentSociety(오픈코어만 — `commercial/` 제외), HumanLayer(태그 v0.7.7에서 —
  main은 deprecated), 12-factor-agents(변형 Apache/MIT 하이브리드=NOASSERTION, permissive 판정
  — "modified permissive"로 기록), ACP(아카이브 — 수렴 증거로만, 계약 원본은 A2A).
- **불가(개념만 중립화)**: Claude Code·Cursor·Copilot·Kiro·Tessl(독점), OpenAI/Anthropic
  블로그·백서(무라이선스 — 자기 문장으로 재기술만), Fidus Writer(AGPL — 패턴 참조만).

## 8. 기존 대응물 정합 (enrich, 신설 금지 목록)

| 조사 제안 | 기존 개체 | 처리 |
|---|---|---|
| prompt chaining | `pat-pipeline` | 출처·게이트 검사 노트로 enrich |
| routing / classifier-dispatch | `pat-expert-pool` | enrich(+router fallback/A-B 노트) |
| parallel sectioning | `pat-fanout-fanin` | enrich; **voting 변형**은 신설 검토(집계=임계 투표) |
| evaluator-optimizer / generate-and-review | `pat-producer-reviewer` | enrich(루프형/비루프형 변형 주석) |
| hierarchical task decomposition | `pat-hierarchical-delegation` | enrich |
| ADK output_key 공유상태 | `pat-blackboard` | enrich(출처) |
| plan-then-execute(보안 독해 포함) | `pat-planexec` | control-flow-integrity·plan-freeze 의미 enrich |
| manager/agents-as-tools · decentralized/handoff | mode-sub-agents · mode-agent-teams | 대응 확인 — handoff 계약(대화상태 이양)만 신규 |
| 사람 승인 게이트·human contact | `gr-human-checkpoint`·`chan-user` | approvalScope·거부이유 주입 계약으로 enrich |
| 명확화 질문·ambiguity 마커 | `gr-req-interrogation`·escalate-open-decisions | 실현 메커니즘 노트로 enrich |
| in-loop critic(CAMEL)·LLM judge | oversight 쌍(benchmarker/auditor) | **in-loop vs post-hoc** 구분 검토 후 판단 |
| 시뮬레이터 | `role-tester`(altLabel simulator) | user-simulator·wizard·adjudicator는 **별개 책임** — tester enrich가 아니라 신설(공통 상위 개념 'simulation stand-in' 고려) |
| microagent 상시 로드/트리거 로드 | mem-firmware/mem-longterm | activationTrigger 술어만 GAP — tier 신설 불요 |
| 컨텍스트 격리 sub-agent | mode-sub-agents | fork/fresh 축·spawn-depth cap만 신규 |

## 9. 한계·미검증 (정직 신고)

- 각 에이전트 unverified 원본은 워크플로 journal에 보존. 주요 건: Sotopia 수치·Concordia v2
  API 개명 가능성·Terminal-Bench tmux·"22% 시뮬 유저 지시 위반"(출처 미확정)·자동화 편향
  30%/75% 수치(방향만 확실)·Sheridan 1978 원문·Kiro 승인 클릭 메커니즘·A2A 파일 필드 철자
  (개체 저작 전 spec JSON 재확인).
- Claude Code hook 이벤트 목록은 2026 문서 스냅샷 — 안정 코어(PreToolUse/PostToolUse/
  UserPromptSubmit/Stop/SubagentStop/PreCompact/SessionStart)만 중립화 권장.
- 본 조사는 **부품 후보 식별**까지다. 실제 반영은 파이프라인대로: 사용자 승인 → orchestrator가
  wave 분할 brief(§6 GAP별 TBox 선행 → abox 부품군) → developer dispatch → vnv/coverage-audit.
  §8 dedup 표는 brief 작성 시 신설 금지 목록으로 그대로 소비할 것.

## 10. 주요 1차 소스 (축약 — 각 절 인라인 명칭으로 검색 가능한 것 제외)

**시뮬**: Generative Agents <https://ar5iv.labs.arxiv.org/html/2304.03442> · Concordia
<https://ar5iv.labs.arxiv.org/html/2312.03664> · OASIS <https://arxiv.org/html/2411.11581v4> ·
AgentSociety <https://arxiv.org/html/2502.08691v1> · Sotopia <https://ar5iv.labs.arxiv.org/html/2310.11667> ·
CAMEL <https://ar5iv.labs.arxiv.org/html/2303.17760> · τ-bench <https://arxiv.org/abs/2406.12045> ·
τ² <https://arxiv.org/abs/2506.07982> · BrowserGym <https://github.com/ServiceNow/BrowserGym> ·
OSWorld <https://github.com/xlang-ai/OSWorld> · AgentGym <https://github.com/WooooDyy/AgentGym> ·
Terminal-Bench <https://github.com/laude-institute/terminal-bench> · SWE-bench
<https://github.com/SWE-bench/SWE-bench> · 시뮬유저 신뢰성 <https://arxiv.org/abs/2403.16416> /
<https://arxiv.org/abs/2509.23124> / <https://arxiv.org/abs/2601.17087> · DIVERT
<https://arxiv.org/abs/2604.21480> · AXIS <https://arxiv.org/abs/2505.17801> · OpenAgentSafety
<https://github.com/Open-Agent-Safety/OpenAgentSafety>

**HIL**: LangGraph interrupts <https://docs.langchain.com/oss/python/langgraph/interrupts> ·
HumanLayer v0.7.7 <https://github.com/humanlayer/humanlayer/tree/v0.7.7> · AutoGen HIL
<https://microsoft.github.io/autogen/0.2/docs/tutorial/human-in-the-loop/> · CrewAI HITL
<https://docs-platform.crewai.com/platform/en/guides/human-in-the-loop> · OpenAI SDK HITL
<https://openai.github.io/openai-agents-js/guides/human-in-the-loop> · Claude Code hooks
<https://code.claude.com/docs/en/hooks> · MCP elicitation
<https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation> · HRW 2012
<https://www.hrw.org/report/2012/11/19/losing-humanity/case-against-killer-robots> · Feng L1-L5
<https://arxiv.org/abs/2506.12469> · Horvitz CHI99 <https://erichorvitz.com/chi99horvitz.pdf> ·
EU AI Act Art.14 <https://artificialintelligenceact.eu/article/14/> · 자동화 편향
<https://journals.sagepub.com/doi/10.1177/0018720810376055> · Green <https://arxiv.org/abs/2109.05067> ·
transfer-of-control <https://arxiv.org/abs/1106.4573>

**코딩/실무**: SWE-agent <https://arxiv.org/html/2405.15793v3> · OpenHands
<https://arxiv.org/html/2407.16741v3> · Aider repomap
<https://raw.githubusercontent.com/Aider-AI/aider/main/aider/repomap.py> · mini-swe-agent
<https://github.com/SWE-agent/mini-swe-agent> · Codex sandboxing
<https://learn.chatgpt.com/codex/sandboxing> · Claude Code best practices
<https://code.claude.com/docs/en/best-practices> · AGENTS.md <https://agents.md/> · Building
Effective Agents <https://www.anthropic.com/engineering/building-effective-agents> · context
engineering <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents> ·
12-factor <https://github.com/humanlayer/12-factor-agents> · OpenAI agents guide
<https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf> ·
ADK patterns <https://raw.githubusercontent.com/google/adk-docs/main/docs/workflows/patterns.md> ·
tool 저작 <https://www.anthropic.com/engineering/writing-tools-for-agents> · agentevals
<https://github.com/langchain-ai/agentevals>

**보충**: injection 패턴 <https://arxiv.org/html/2506.08837v2> · CaMeL <https://arxiv.org/abs/2503.18813> ·
lethal trifecta <https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/> · MCP poisoning
<https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks> · AgentDojo
<https://arxiv.org/abs/2406.13352> · A2A v0.3.0 <https://a2a-protocol.org/v0.3.0/specification/> ·
spec-kit <https://github.com/github/spec-kit> · Kiro <https://kiro.dev/docs/specs/> · SDD 비교
<https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html> · NeMo rail types
<https://docs.nvidia.com/nemo/guardrails/about-nemo-guardrails-library/rail-types> · guardrails-ai
on-fail <https://www.guardrailsai.com/docs/concepts/validator_on_fail_actions> · shadow/canary
<https://tianpan.co/blog/2026-04-09-llm-gradual-rollout-shadow-canary-ab-testing> · terraform plan
<https://developer.hashicorp.com/terraform/cli/commands/plan> · LangGraph time-travel
<https://docs.langchain.com/oss/python/langgraph/use-time-travel> · WoZ
<https://www.nngroup.com/articles/wizard-of-oz/>
