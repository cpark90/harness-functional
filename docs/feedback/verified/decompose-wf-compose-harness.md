---
source: docs/feedback/decompose-wf-compose-harness.md
verdict: apply
targets: [core:wf-compose-harness, core:h-multiagent]
---
# 검증 보고 (Q3) — wf-compose-harness 7 step 분해 + data-flow (승인)

사용자 승인: **(1) 분해 진행 · (2) stepProduces/Consumes(data-flow)까지**. 저작은 developer dispatch
(ontology/abox). 아래는 원형 실측 기반 apply-plan + 검증 게이트.

## 원형 실측 (developer가 미러할 패턴)
기존 분해 워크플로 `wf-multiagent`의 step 구조:
`wfs-X a ho:WorkflowStep ; skos:prefLabel ; skos:definition ; ho:stepByRole ; ho:stepGuardedBy|stepUsesTool ;
ho:stepProduces|stepConsumes id:dlv-… ; ho:stepOrder N ; ho:tokenEstimate ; ho:maturity` 그리고 워크플로가
`ho:hasStep`로 묶는다. 현재 Deliverable은 **2개뿐**(`dlv-dispatch-brief`·`dlv-verified-result`) →
compose 흐름용 **신규 Deliverable 소수** 필요(중립 명명).

## 적용 계획 (developer dispatch)
`ontology/abox/core/process/workflows.ttl`에서:
1. **7 WorkflowStep 저작**(정의 속 (1)~(7)을 승격), `ho:stepOrder 1..7`:
   retrieve-pack → select-template → bind-capabilities → assemble-minimums → write-individuals →
   validate → coverage-audit. 각 step에 적절한 `stepByRole`(대부분 `role-implementer`/`role-orchestrator`)와
   해당되는 `stepGuardedBy`(예: validate→`gr-verify-proceed`, write→`gr-reuse-first`/`gr-controlled-vocabulary`,
   coverage-audit→`gr-structural-coverage`).
2. **data-flow**(`stepProduces`/`stepConsumes` + 신규 중립 Deliverable): 예) (1) produces `dlv-context-pack`;
   (2) consumes pack, produces `dlv-base-template`; (3~4) produces `dlv-harness-spec`; (5) produces
   `dlv-authored-individuals`; (6) consumes spec, produces `dlv-validated-spec`; (7) consumes validated-spec.
   기존 `dlv-*` 재사용 가능하면 재사용, 아니면 신규 저작(prefLabel+definition+tokenEstimate). 산출 DAG가
   총순서와 모순 없게.
3. `wf-compose-harness`에 `ho:hasStep`(7개) 추가 + **정의를 짧은 요약으로 축약**(세부는 step으로 이동;
   `wf-multiagent` 정의 길이 수준). `tokenEstimate` 재산정.

## 파급효과 (실측 기준선 확보)
- 개체 **+7 WorkflowStep (+ 신규 Deliverable 몇 개)**. 현재 @232 → ~239+.
- **materialize(의도된 enrichment)**: `h-multiagent`만 `wf-compose-harness`를 hasWorkflow → 그 Process
  섹션이 **1019자 blob 한 줄 → 7 step 중첩**으로 바뀐다(기준선 캡처 완료). **다른 6 하네스는 이 워크플로
  미사용 → byte-identical 유지**여야 한다(게이트).
- federate: 신규 step/deliverable는 recipe에 자동 결합 안 됨 → 8 recipe 회귀 0(dry-run).

## 검증 게이트 (반영 후 inspection)
- `validate.py` **PASS**(assemblyOrder·reachability — 신규 step이 hasStep로 연결돼 orphan 0; capacityFit·
  registryDrift 포함 6축 green), 개체수 증가 기록.
- **materialize enrichment 확인**: `h-multiagent` Process 섹션에 wf-compose-harness 7 step이 **중첩 렌더**
  (wf-multiagent와 동형), blob 한 줄 소거. **나머지 6 하네스 byte-identical**(의도 변경은 h-multiagent만).
- **8 recipe federate PASS**.
- data-flow: materialize Data flow 섹션에 compose deliverable DAG가 나타나는지(선택적, 있으면 확인).

## 판정
**apply** — 7 step + data-flow 분해. 회귀는 **h-multiagent Process enrichment 단 하나**(의도된 세분화)이고
그 외 산출물 byte-identical·federate PASS가 게이트. developer가 저작하면 inspection이 이 게이트로 검증한다.

## 적용 결과 (applied 2026-07-28) — inspection 독립 검증 완료
developer(opus) dispatch 저작 → inspection 재실측(자기보고 불신):
- **저작**: 7 WorkflowStep(`wfs-retrieve-pack`…`wfs-coverage-audit`, stepOrder 1..7, 기존 role/tool/guardrail
  IRI만 재사용) + 6 신규 중립 Deliverable(context-pack→…→validated-spec 선형 DAG) + `wf-compose-harness`에
  `hasStep` 배선 + 정의 축약(tokenEstimate 205→57). 경계: `workflows.ttl`만(TBox/shapes/타 abox 0).
- `validate.py` **PASS @245**(232+13), 6축 green(reachability orphan 0·registryDrift 신규 클래스 0·
  assemblyOrder·capacityFit 포함).
- **materialize(의도된 enrichment)**: `h-multiagent` Process에서 1019자 blob 한 줄 **소거** → 요약 + **7
  compose step 중첩**(wf-multiagent 동형, +41/−1). **다른 6 하네스 CLAUDE byte-identical**.
  ★**apply-plan 정정(파급 확대)**: 계획은 "Process만"으로 예상했으나 실제는 **h-multiagent Data flow
  섹션도 6 deliverable로 확장**된다(materialize에 Data flow 렌더러 존재 — h-multiagent가 이 워크플로의
  유일 binder라 그 하네스에 국한). 둘 다 의도된 세분화이고 h-multiagent 단일 하네스에만 국한 = 회귀 아님.
- **8 recipe federate PASS**(신규 step/deliverable가 recipe에 자동결합 안 됨).
- 후속(비차단): step 7(coverage-audit)이 `role-vnv` — CLAUDE.md의 "coverage audit = vnv dispatch"와 일치.
⇒ Q3 세분화 감사의 마지막 blob 해소. **완결**.
