# abox 정리 감사 — Guardrail 클래스 (40개)

**대상**: `ontology/abox/core/behavioral/guardrails.ttl` 의 `a ho:Guardrail` 개체 40개.
**성격**: findings only (판정만, 편집·삭제 없음). roles 정리와 동일 기준.
**validate baseline**: `/usr/bin/python3 tools/validate.py` → **PASS** (reachability/capabilities/assemblyOrder ✓).
**재현 명령**:
- inventory: `grep -oE 'id:gr-[a-z-]+ a ho:Guardrail' <file>` → 40.
- 참조 카운트: rdflib union 로드 후 `hasGuardrail`(harness)·`roleGuardrail`(role) object 매칭 집계.
- 바인딩 위치: `grep -rl "id:<gr>\b" ontology/abox/core/{wholes,organization}/`.

> 파일에는 Guardrail 40 외에 `ho:Instruction`(ins-well-formed-skill) 1 + `ho:Hook` 4가
> 공존하나 감사 범위 밖(Guardrail 클래스가 아님). 아래 표는 Guardrail 40만.

## 1. 참조/사용도 (rdflib 집계, ontology/ 전역)

`total = hasGuardrail(harness) + roleGuardrail(role)`. **zero-ref = 0** — orphan/reachability
사각 없음. 모든 guardrail이 최소 1개 harness 또는 role로 도달 가능.

| id | hasG | roleG | total |
|---|---|---|---|
| gr-least-privilege | 2 | 13 | **15** |
| gr-dispatch-execution | 1 | 11 | **12** |
| gr-grounding | 1 | 6 | 7 |
| gr-lang | 7 | 0 | 7 |
| gr-structured-output | 1 | 5 | 6 |
| gr-execution-separation | 4 | 1 | 5 |
| gr-report-over-prompt | 2 | 2 | 4 |
| gr-verify-proceed | 1 | 3 | 4 |
| gr-cite | 2 | 1 | 3 |
| gr-bounded-context | 1 | 2 | 3 |
| gr-no-arbitrary-decision | 1 | 2 | 3 |
| gr-root-cause | 1 | 2 | 3 |
| gr-simplicity | 1 | 2 | 3 |
| gr-bottleneck-avoidance | 1 | 1 | 2 |
| gr-delegated-orchestration | 1 | 1 | 2 |
| gr-discriminating-eval | 1 | 1 | 2 |
| gr-reuse-first | 1 | 1 | 2 |
| gr-three-flow-acceptance | 1 | 1 | 2 |
| gr-traceability | 1 | 1 | 2 |
| gr-absolute-paths | 1 | 0 | 1 |
| gr-bounded-iteration | 1 | 0 | 1 |
| gr-controlled-vocabulary | 1 | 0 | 1 |
| gr-cross-validation | 1 | 0 | 1 |
| gr-declared-routes | 1 | 0 | 1 |
| gr-depth-limit | 1 | 0 | 1 |
| gr-design-for-loss | 1 | 0 | 1 |
| gr-flatten-hierarchy | 1 | 0 | 1 |
| gr-generalize-not-overfit | 1 | 0 | 1 |
| gr-graceful-fallback | 1 | 0 | 1 |
| gr-human-checkpoint | 1 | 0 | 1 |
| gr-integration-coherence | 1 | 0 | 1 |
| gr-no-nested-teams | 1 | 0 | 1 |
| gr-nodestruct | 1 | 0 | 1 |
| gr-opus-required | 1 | 0 | 1 |
| gr-scale-modes | 1 | 0 | 1 |
| gr-sequenced-artifacts | 1 | 0 | 1 |
| gr-single-active-team | 1 | 0 | 1 |
| gr-single-responsibility | 1 | 0 | 1 |
| gr-structural-coverage | 1 | 0 | 1 |
| gr-well-formed-skill | 1 | 0 | 1 |

주: `total=1` 다수는 단일 harness(대개 `id:h-harness-factory` 메타-하네스)가 부품
라이브러리로 wiring한 것 — 이 저장소는 "neutral parts library"이므로 저사용=결함 아님.

## 2. per-guardrail 판정

| id | 판정 | 근거 (실제 정의 기준) |
|---|---|---|
| gr-nodestruct | KEEP | 파괴적 명령 확인 게이트 — 고유. |
| gr-cite | KEEP | factual claim→citation(source), provides cap-citation. grounding과 대상 다름(주장↔출처). |
| gr-lang | KEEP | Korean/English 정책 — 고유 축. |
| gr-verify-proceed | KEEP | confirmed machine state, not elapsed time. human-checkpoint/no-arbitrary와 promptText에 명시적 "Distinct from". |
| gr-design-for-loss | KEEP | loss-as-normal + custody + cumulative state + counters — 고유. |
| gr-traceability | KEEP | never-delete/deprecate-with-reason/increment-only IDs. grounding과 기제 다름. |
| gr-grounding | **KEEP-but-clarify** | promptText=derived artifact→rationale 링크. 그러나 altLabel "flag unverified claims"·"assumption and limitation disclosure"가 cite/disclosure 영역으로 과확장 → altLabel 정리(판별자 산문은 유지됨). |
| gr-structural-coverage | KEEP | 소스 구조요소 전수→표현 매핑, 어휘없음=schema 확장 신호 — 고유. |
| gr-no-arbitrary-decision | KEEP | REACTIVE 미결질문 escalation. verify-proceed/human-checkpoint와 문서화된 구별. |
| gr-least-privilege | KEEP | 파일경계+최소권한+authoring/judgment/apply/vc 분리(SoD). |
| gr-report-over-prompt | KEEP | durable channel + one-line pointer — 고유. |
| gr-controlled-vocabulary | KEEP | 등록된 **용어(term)** 재사용. reuse-first(=**부품(part)** 재사용)와 대상 다름. |
| gr-root-cause | KEEP | symptom-masking 금지(깊이 축). generalize-not-overfit(범위 축)과 구별. |
| gr-simplicity | KEEP | YAGNI, 분기 제거/투기적 config 금지 — 고유. |
| gr-bounded-context | KEEP | anti-context-rot, budget-capped projection — 고유. |
| gr-dispatch-execution | KEEP | worker는 dispatch시에만 작동(worker POV). multiagent spine. |
| gr-delegated-orchestration | KEEP (note) | orchestrator 직접작업 금지(orchestrator POV). execution-separation에 near-subsumed이나 concrete(orchestrator)/neutral(general) 의도 구별 — anti-drift FIRST 적용, 유지. §4 참조. |
| gr-execution-separation | KEEP | plan/verify ≠ execute, "every topology" 일반 원칙(neutral). spine. |
| gr-reuse-first | KEEP | 기존 typed **부품** 재사용+연결(anti-orphan). controlled-vocab과 대상 다름. |
| gr-structured-output | KEEP | deliverable 구조 템플릿(섹션/헤딩/필드). sequenced-artifacts(파일명)와 구별. |
| gr-scale-modes | KEEP | full/reduced/single 스코프 매칭 — 고유. |
| gr-graceful-fallback | KEEP | per-op 실패 fallback/degrade. bounded-iteration(loop cap)과 구별. |
| gr-depth-limit | KEEP (**merge target**) | delegation ≤2 levels(정량). no-nested-teams의 생존 노드. |
| gr-no-nested-teams | **MERGE→gr-depth-limit** | "team's workers are leaf agents"=depth-limit의 "workers do not spawn sub-teams" 재진술. 판별자 "team-nesting vs delegation-depth"는 동일 leaf-worker 제약의 topology 어휘차. 둘 다 draft·둘 다 h-harness-factory 단독 바인딩·co-occur. §3 참조. |
| gr-single-active-team | KEEP | 동시 1팀(concurrency 직렬화). bottleneck-avoidance와 방향 다름. |
| gr-bottleneck-avoidance | KEEP | 조정 분산(parallel-first). single-active-team과 별개 축. |
| gr-flatten-hierarchy | **KEEP-but-clarify** | 최평탄 hierarchy **선호**(soft). depth-limit(hard ≤2 cap)의 연질 쌍둥이 — 유지하되 preference-vs-cap 판별자를 정의에 명시 권고. §3. |
| gr-bounded-iteration | KEEP | producer-reviewer/retry 2~3 rounds cap. graceful-fallback과 구별. |
| gr-integration-coherence | KEEP | producer↔consumer 경계 cross-check. promptText에 grounding과 "Distinct from" 명시. |
| gr-discriminating-eval | KEEP | baseline differential(with/without arm) — 고유. |
| gr-single-responsibility | KEEP | 역할당 책임 1개(cohesion). least-privilege(permission/SoD)와 구별. |
| gr-generalize-not-overfit | KEEP | feedback→reusable rule(범위 일반화). root-cause(깊이)와 구별. |
| gr-absolute-paths | KEEP | 공유 workspace 절대경로 resolution — 고유. |
| gr-well-formed-skill | KEEP | skill 구조계약 **정책(policy)**. ins-well-formed-skill는 그 **집행(enforcement)** — 문서화된 policy/enforcement 쌍(의도적, 병합 아님). |
| gr-opus-required | KEEP | dispatch 모델 floor(top-tier) — 고유. |
| gr-cross-validation | KEEP | 타 역할 cross-validate + severity-triage — 고유. |
| gr-declared-routes | KEEP | 각 역할이 outbound hand-off route 선언 — 고유. |
| gr-sequenced-artifacts | KEEP | ordinal-prefix 파일명. structured-output(deliverable 템플릿)과 구별. |
| gr-three-flow-acceptance | KEEP | normal/resumed/error 3-flow fixture — 고유. |
| gr-human-checkpoint | KEEP | milestone proactive human-approval gate. no-arbitrary/verify-proceed와 promptText에 명시적 구별. |

**요약**: KEEP 37, KEEP-but-clarify 2(gr-grounding altLabel, gr-flatten-hierarchy 판별자),
MERGE→ 1(gr-no-nested-teams → gr-depth-limit). REMOVE 0. orphan 0.

## 3. near-synonym 군집

### 군집 C1 — hierarchy-depth 삼각 {depth-limit, no-nested-teams, flatten-hierarchy}
셋 다 c-complexity-governance, 셋 다 draft, 셋 다 `id:h-harness-factory` **단독** 바인딩(co-occur).
- **no-nested-teams ≈ depth-limit**: no-nested-teams="a team's workers are leaf agents, not
  leaders of further teams" = depth-limit="workers do not spawn further sub-teams"의 topology
  어휘 재진술. 문서화된 "Distinct from" 없음, 운영 내용 동일. **→ MERGE→depth-limit**
  (생존=더 일반적+정량적 ≤2, no-nested-teams 주장 포함). *단서*: team-vs-delegation topology
  구별이 의도된 것이면 MERGE 대신 KEEP-but-clarify(명시 판별자 추가)로 강등 가능 — anti-drift
  FIRST 상 판단 근거(문서화된 구별)가 현재 없어 MERGE로 낸다.
- **flatten-hierarchy**: "prefer the flattest ... add a layer only when needed"(연질 선호)로
  depth-limit(경질 cap)과 축이 다름(선호 vs 상한). 병합 아님, 단 판별자가 약해 정의에
  "preference, not the numeric cap" 명시 권고 → **KEEP-but-clarify**.
- 남길 것: depth-limit(정량 cap) + flatten-hierarchy(연질 선호). 합칠 것: no-nested-teams.

### 군집 C2 — multiagent execution spine {dispatch-execution, delegated-orchestration, execution-separation}
동일 방법론의 3 관점: worker(dispatch시에만 작동) / orchestrator(직접작업 금지) /
general(plan·verify ≠ execute, any topology). delegated-orchestration은 execution-separation의
orchestrator-concrete 사례로 **near-subsumed**이나, roles의 concrete/neutral처럼 **의도된
추상수준 구별**(delegated는 "no authoring, judgment or tool execution" 열거를 담아 role-orchestrator
플래그십). 참조도 상이(dispatch 12 / separation 5 / delegated 2). **anti-drift FIRST → 전부 KEEP.**

### 군집 C3 — 근접하나 대상이 다른 쌍 (전부 KEEP, 판별자 성립)
- cite(주장↔출처) vs grounding(artifact↔rationale) vs controlled-vocabulary(term 재사용) vs
  structural-coverage(source→representation 전수): **대상(object)이 각기 다름** — 판별자 성립.
- reuse-first(**부품** 재사용) vs controlled-vocabulary(**용어** 재사용): 대상 다름.
- root-cause(깊이: symptom↔cause) vs generalize-not-overfit(범위: 1건↔class): 축 다름.
- least-privilege(권한/파일경계/SoD) vs single-responsibility(책임 1개/cohesion): 축 다름.
- structured-output(deliverable 템플릿) vs sequenced-artifacts(파일 ordinal 명명): 대상 다름.
- graceful-fallback(per-op degrade) vs bounded-iteration(loop 회수 cap): 축 다름.
- single-active-team(동시성 직렬화) vs bottleneck-avoidance(조정 분산): 방향 다름.

### 군집 C4 — 문서화된 "Distinct from"으로 이미 disambiguation된 쌍 (KEEP, anti-drift FIRST)
- {verify-proceed, no-arbitrary-decision, human-checkpoint}: human-checkpoint promptText가 두
  이웃 각각과 명시적 구별 문장 보유.
- integration-coherence ↔ grounding: promptText에 "Distinct from grounding(id:gr-grounding)".
- gr-well-formed-skill(policy) ↔ ins-well-formed-skill(enforcement): 주석에 co-located 의도 명시.

## 4. 총평
- **verification(구조)**: validate PASS, guardrail orphan 0, 참조도 전부 ≥1 — reachability 사각 없음.
- **validation(중복/drift)**: 진짜 중복 1건(**no-nested-teams → depth-limit**), 판별자 보강 권고
  2건(grounding altLabel 과확장, flatten-hierarchy preference/cap 판별자). 나머지 37은 대상·축·
  문서화된 구별로 판별자 성립 — 겉보기 유사는 대부분 **의도된 구별**(anti-drift FIRST 유지).
- 편집·삭제는 하지 않았다(판정만). 반영은 orchestrator→developer dispatch 소관.
