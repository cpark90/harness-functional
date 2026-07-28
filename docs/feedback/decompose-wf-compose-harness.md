---
status: approved            # 사용자만 approved로 바꾼다
targets: [core:wf-compose-harness, core:h-multiagent]
kind: proposal
related: [docs/feedback/verified/execution-mode-axis-finalize.md]
---
# 제안 (Q3/세분화) — `wf-compose-harness`를 WorkflowStep으로 분해 (repo 핵심 프로세스의 blob 해소)

## 발견 (실측) — 균일성 위반
Q3 세분화 감사(정의 길이 상위)에서 **`wf-compose-harness`가 유일한 실질 blob**으로 확정:
- 정의 **1019자**(그래프 최장), `ho:hasStep` **0개**.
- 그런데 정의 내용은 이미 **"(1) retrieve … (2) template … (3) bind capability … (4) assemble
  minimums … (5) write back … (6) validate … (7) coverage-audit"** 7단계 절차다 — 산문에 눌러담았을 뿐.
- **형제 워크플로는 전부 분해됨**: `wf-multiagent`(3 step)·`wf-harness-evolution`(3)·`wf-verify-harness`(4)가
  `ho:hasStep`으로 나뉘고 정의는 짧은 요약. `wf-compose-harness`만 blob으로 남았다.
- (참고: `wf-planexec`/`wf-react`/`wf-singleshot`는 정의 0·step 0인 **atomic 패턴 워크플로**라 blob 아님.)

이건 하필 **이 repo 자체의 핵심 프로세스**(하네스 조립 = CLAUDE.md "Composing a new harness" 7단계)이고,
`h-multiagent`가 사용한다. 사용자 목표 "충분히 세분화"에 정확히 걸린다.

## 제안 — 7 WorkflowStep으로 분해 (wf-multiagent 패턴 재사용)
정의 속 7단계를 `ho:WorkflowStep` 개체로 승격하고 `ho:hasStep` + `ho:stepOrder`로 연결. 정의는
짧은 요약으로 축약(세부는 step으로 이동). 제안 step(문안·slug는 developer가 controlled-vocabulary로 최종화):
1. `wfs-retrieve-pack` — 요청에 대한 예산 캡 컨텍스트 팩 검색.
2. `wfs-select-template` — top base-harness 후보를 템플릿으로(없으면 DesignPattern).
3. `wfs-bind-capabilities` — scope의 `requiresCapability`를 `providesCapability` 컴포넌트에 바인딩, gap 충족.
4. `wfs-assemble-minimums` — HarnessShape 최소(SystemPrompt 1·Workflow ≥1·tools·guardrails·ModelConfig 1).
5. `wfs-write-individuals` — prefLabel·maturity draft·derivedFrom·tokenEstimate·Concept tag 부여해 저작.
6. `wfs-validate` — `validate.py`로 연결·타입·capability 충족 검사.
7. `wfs-coverage-audit` — 소스 구조요소→표현 매핑 coverage-audit 게이트.
- 가능하면 `stepProduces`/`stepConsumes`로 산출 흐름도 명시(예: (1)→팩, (5)→개체, (6)→PASS) — data-flow 축 활용.

## 파급효과 (예비)
- 개체 **+7**(WorkflowStep) + `wf-compose-harness` 정의 축약 + `hasStep` 배선.
- **materialize 파급(의도된 enrichment, byte-identity 변경)**: `h-multiagent`가 `wf-compose-harness`를
  hasWorkflow하므로, materialize Process 섹션이 step으로 렌더되면 **h-multiagent CLAUDE.md Process가
  풍부해진다**(회귀 아님, 세분화의 목적). 다른 하네스는 이 워크플로 미사용 → 무영향. 정확한 diff는 착수 시 측정.
- federate: 개체 추가지만 recipe가 이 step들을 자동 결합하지 않음 → 회귀 0(dry-run 확인).
- **어휘**: 신규 WorkflowStep 7개는 `ho:WorkflowStep`(기존 클래스) 재사용, orphan 아님(hasStep로 연결).

## 결정 필요 (사용자)
1. 예
2. **stepProduces/Consumes(data-flow)까지** 채워줘

승인 시 `status: open` → `approved`. 저작은 developer dispatch(ontology/abox), inspection이 검증
(validate·materialize Process enrichment가 의도대로인지·federate·byte-identity는 h-multiagent만 의도 변경).
