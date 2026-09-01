# Dispatch master plan — revfactory/harness 방법론 전체 반영 (P1~P4)

> 작성: orchestrator (2026-07-23). 상위 승인 앵커: `docs/feedback/revfactory-harness-reflection.md`(status: approved).
> 소스 델타·귀속: `docs/feedback/revfactory-harness/{delta-inventory,source-mapping,verification-and-doctrine}.md`.
> 실행: **developer dispatch(opus) 순차 wave(파일 배타 소유 → write-race 0)** + wave 경계 **vnv 판정**. git 금지(inspection).

## 결정 반영 (사용자 2026-07-23)
1. **기본 실행모드**: 양쪽 selectable 저장 + **repo의 central-dispatch 기본 유지**(pat-orchestrator-workers 기본, 나머지 실행/코디 패턴은 selectable).
2. **ExecutionMode = DesignPattern 경량화** — 신규 `ho:ExecutionMode` 클래스·`hasExecutionMode`/`stepExecutionMode` 속성 **만들지 않음**. 실행 topology는 `pat-agent-teams`/`pat-sub-agents`/`pat-hybrid`(DesignPattern) + `appliesPattern`으로 표현. sectionKind `execution-mode`는 **`appliesPattern` 중 `tagged c-execution-mode`인 것을 렌더**(아키텍처 패턴과 concept 태그로 구별).
3. **범위/순서**: P1~P4 전체 계획(이 문서) 후 일괄 실행 — 단계 사이 사용자 승인 게이트 없음. wave별 vnv만.
4. **role-qa**: 신설 안 함 — `role-vnv`에 `gr-integration-coherence`를 `roleGuardrail`로 scoped + reviewer concept 태그(anti-drift).
5. **model:opus**: 옵션 `gr-opus-required` guardrail 신설(명시화). 강제 바인딩은 템플릿 재량.

## 조정된 델타 총목록 (결정 적용 후)
- **신규 TBox 클래스 2**: `ho:TestScenario`(⊑HarnessComponent), `ho:FailurePolicy`(⊑HarnessComponent). *(ExecutionMode 클래스 삭제 — D2.)*
- **신규 TBox 속성**: hasTestScenario(⊑hasComponent)·scenarioKind(sh:in)·scenarioPrompt·scenarioExpected·scenarioReferences(→WorkflowStep) · hasFailurePolicy(⊑hasComponent)·failureCondition·recoveryStrategy · augmentsRole(Instruction→Role)·integrationMode(Instruction) · agentType(Role) · reinvocationKeywords(Harness) · triggerPhrase·outOfScope(Harness+Instruction 공용).
- **sectionKind enum +4**: execution-mode·data-flow·error-handling·test-scenarios (shape `sh:in` 확장 + emitter).
- **신규 DesignPattern 9**(patterns.ttl): 실행 3(pat-agent-teams·pat-sub-agents·pat-hybrid, tag `c-execution-mode`) + 아키텍처 6(pat-pipeline·pat-fanout-fanin·pat-expert-pool·pat-producer-reviewer·pat-supervisor[동적]·pat-hierarchical-delegation, tag `c-pattern-taxonomy`).
- **신규 Channel 1**: chan-task-board.
- **신규 Guardrail ~13** + 짝 Concept: 복잡도 5(gr-depth-limit·gr-no-nested-teams·gr-single-active-team·gr-bottleneck-avoidance·gr-flatten-hierarchy, tag `c-complexity-governance`) · gr-bounded-iteration · gr-integration-coherence · gr-discriminating-eval · gr-single-responsibility · gr-generalize-not-overfit · gr-absolute-paths · gr-well-formed-skill · (옵션)gr-opus-required.
- **신규 Capability 1 + Contract**: cap-skill + 구조 Contract(file-contains SKILL.md::description·section:필수헤딩·금지파일 부재) — 기존 `capabilityContract` chain 재사용.
- **신규 Workflow 2**(생애주기): wf-harness-evolution(wfs-audit·wfs-feedback-route·wfs-change-log) · wf-verify-harness(wfs-structure-check·wfs-trigger-validation·wfs-baseline-compare·wfs-dryrun). step은 `hasStep` chain, stepByRole=role-vnv/role-inspection 재사용.
- **materialize/tools**: INSTANCE_CLASSES에 TestScenario·FailurePolicy 등록 + 4 sectionKind emitter + cap-skill 구조 Contract를 verify_contract.py로.
- **NO-MODEL/CONVENTION**: verification-and-doctrine §3 목록(severity 마커·JSON 필드명·_workspace 레이아웃·톤 등)은 **모델 안 함**.
- **task-DAG 재제안 금지**(inc1 완비).

## 연결 규율 (orphan-free — 신규 SHACL shape 최소화)
- 신규 컴포넌트 클래스(TestScenario/FailurePolicy)는 `hasComponent` sub-property(hasTestScenario/hasFailurePolicy)로 harness에 직접 hang → 기존 `ComponentConnectivityShape` 커버(Memory 패턴과 동일). 선택 `TestScenarioShape`/`FailurePolicyShape`는 필수 datatype minCount만.
- DesignPattern/Channel/Guardrail/Capability/Workflow: 기존대로 orphan shape 없음 → 각 `tagged` concept + 데모/템플릿 harness가 `appliesPattern`/`hasChannel`/`hasGuardrail`/`requiresCapability`/`hasWorkflow`로 참조해 reachable.
- 신규 Concept은 `skos:broader`/`topConceptOf` 연결(c-execution-mode·c-pattern-taxonomy·c-complexity-governance는 broader c-multiagent).
- 신규 TBox 속성은 refinement edge(augmentsRole 등)라 reachability는 기존 술어(hasInstruction 등)가 담당 → orphan 없음.

---

## reachability 핵심 (⚠ B1에서 정정됨)
`validate.py`는 **두 축**을 본다: (1) `check_reachability` BFS(weak, `ho:tagged`/`skos:broader` 포함) — tag만으로 통과. **그러나** (2) `ho:ComponentConnectivityShape`(SHACL, targetClass `ho:HarnessComponent`)는 **HarnessComponent 하위 인스턴스가 `hasComponent` 하위술어로 실제 Harness에 배선**될 것을 요구 — tag로는 불충분.
- **배선 필요(HarnessComponent 하위)**: Guardrail·Channel·Workflow(+WorkflowStep은 workflow 배선 시 chain rollup)·SystemPrompt·Tool·Role·Instruction·Deliverable·**TestScenario·FailurePolicy·Memory** 등.
- **tag로 충분(HarnessComponent 아님)**: DesignPattern·Concept·Capability·Domain·Task·Constraint.
⇒ 신규 Guardrail 13 + chan-task-board + Workflow 2 + TestScenario/FailurePolicy 데모는 **host harness에 배선**해야 한다. 소스가 harness-생성 방법론이므로 **중립 host `h-harness-factory`**(h-workspace-synthesis 선례) 신설이 그 home. h-multiagent 직접 배선은 그 CLAUDE.md byte-identity를 깨므로 금지. 패턴 9·cap-skill·concept 4는 tag로 충분(배선 불요).
단 `HO.TestScenario`·`HO.FailurePolicy`(및 `HO.Memory`, vnv REC-1)는 `INSTANCE_CLASSES` 미등록 → **Wave C tools에서 등록**해야 인스턴스가 검증대상.

# Dispatch waves (순차 — 중앙 ontology는 공유 validate라 병렬 금지)

## Wave A — TBox + shapes (✅ 완료: 클래스2+속성4+datatype10+shape, validate PASS 130 불변)
**파일(배타)**: `ontology/tbox/harness.ttl`, `ontology/shapes/harness-shapes.ttl`.
**내용**: 위 "신규 TBox 클래스 2 + 속성 전부 + sectionKind enum +4" + shapes(sectionKind `sh:in` 확장, 선택 TestScenarioShape/FailurePolicyShape minCount). 기존 `ho:sectionKind`·`ho:hasChannel`·`ho:Memory` 선언 관례(predicate order·주석) 미러링. hasTestScenario/hasFailurePolicy는 `ho:hasComponent` sub-property(direct, Memory 꼴).
**검증**: `/usr/bin/python3 tools/validate.py` PASS(인스턴스 아직 없어 shape 위반 0). TBox additive.
**의존**: 없음(선행).

## Wave B1 — 코디/토폴로지 + 거버넌스 guardrail (developer, Wave A 후, 순차)
**파일(배타)**: `concepts.ttl`, `patterns.ttl`, `channels.ttl`, `guardrails.ttl`. (concepts.ttl은 **모든 신규 concept를 여기서 생성** — Wave B2는 IRI 참조만.)
- concepts.ttl: 신규 concept 전부 — c-execution-mode·c-pattern-taxonomy·c-complexity-governance(broader c-multiagent) + guardrail/capability 짝 개념 필요분. 전부 reachable subtree(broader c-multiagent 등)에 연결.
- patterns.ttl: DesignPattern 9(실행 3 tag c-execution-mode + 아키텍처 6 tag c-pattern-taxonomy). pat-supervisor(동적) vs pat-orchestrator-workers(정적) 정의/altLabel 구별. `maturity "draft"`.
- channels.ttl: chan-task-board(claim/task-update/idle-notify; channelParticipant 워커+orchestrator, involvesUser false, channelMedium; 4번째 매체). tag c-multiagent.
- guardrails.ttl: guardrail ~13(마스터 목록) + 각 `tagged` 짝 concept. gr-integration-coherence는 gr-grounding과 협의 구별 명시. gr-bounded-iteration=재시도 상한.
**검증**: `validate.py` **PASS**(신규 부품 전부 concept tag로 reachable — harness 참조 불필요). materialize round-trip green(어느 harness도 아직 신규부품 미참조 → 출력 불변).
**의존**: Wave A.

## Wave B2 — skill 거버넌스 + 생애주기 workflow (developer, Wave B1 후, 순차)
**파일(배타)**: `capabilities.ttl`, `workflows.ttl`, `roles.ttl`. (concepts는 B1이 생성 → IRI 참조만.)
- capabilities.ttl: cap-skill(tag skill 거버넌스 concept) + 구조 Contract 3(`capabilityContract`: file-contains:SKILL.md::description · section:SKILL.md::<필수헤딩> · 금지파일 부재). contractKind structural/executable(lpranging contract 형식).
- workflows.ttl: wf-harness-evolution(wfs-audit·wfs-feedback-route·wfs-change-log) · wf-verify-harness(wfs-structure-check·wfs-trigger-validation·wfs-baseline-compare·wfs-dryrun). step은 hasStep chain·stepOrder·stepByRole(role-vnv/role-inspection)·stepProduces/Consumes Deliverable. workflow는 tag concept로 reachable. P6 assertion 평가는 기존 `ho:Contract` 재사용.
- roles.ttl: `role-vnv`에 `roleGuardrail gr-integration-coherence`(D4) + reviewer concept 태그. agentType 부여는 최소(least-privilege 정합, 필요시만).
**검증**: `validate.py` **PASS** + materialize round-trip green.
**의존**: Wave B1(concept IRI + guardrail IRI).

## Wave C — sectionKind 데모 + materialize/tools (developer, Wave B2 후, 순차)
**파일(배타)**: `harnesses.ttl`, `tools/materialize.py`, `tools/ontology_lib.py`(+ `tools/verify_contract.py` 필요시).
**내용**:
- tools: `ontology_lib.INSTANCE_CLASSES`에 `HO.TestScenario`·`HO.FailurePolicy`(+ REC-1 `HO.Memory`) 등록. materialize 4 sectionKind emitter(execution-mode=appliesPattern∩tagged c-execution-mode · data-flow=Deliverable produce/consume join · error-handling=hasFailurePolicy 표 · test-scenarios=hasTestScenario 표). cap-skill 구조 Contract를 verify_contract.py가 실행하도록(가능분).
- harnesses.ttl:
  - `h-multiagent`에 **AssemblySection 4개 추가**(execution-mode/data-flow/error-handling/test-scenarios, 고유 assemblyOrder로 총순서 유지) → materialize가 그 섹션 emit.
  - 실행패턴 selectable 데모: `h-multiagent`(또는 신규 `h-harness-factory` 템플릿)에 `appliesPattern` 실행/아키텍처 패턴 참조로 신규 패턴 reachable화. 기본은 central-dispatch(D1) 유지.
  - 데모 `hasTestScenario`/`hasFailurePolicy` 최소 1셋(신규 컴포넌트 reachable + emitter 검증용).
  - 신규 workflow를 `hasWorkflow`로 부착(h-harness-factory 또는 h-multiagent).
  - chan-task-board·신규 guardrail·cap-skill을 데모 harness가 `hasChannel`/`hasGuardrail`/`requiresCapability`로 참조해 전부 reachable.
- tools: `ontology_lib.INSTANCE_CLASSES`에 `HO.TestScenario`·`HO.FailurePolicy` 등록. materialize에 4 sectionKind emitter(execution-mode=appliesPattern∩tagged c-execution-mode 렌더 · data-flow=Deliverable produce/consume join · error-handling=hasFailurePolicy 표 · test-scenarios=hasTestScenario 표). cap-skill 구조 Contract를 verify_contract.py가 실행하도록(가능분).
**검증**: `validate.py` PASS(전체 reachable, 4체크 green) + **materialize round-trip**(h-multiagent 및 recipe harness build exit 0, 새 섹션 emit, 2회 diff IDENTICAL) + **recipe federate 무영향 spot-check 2개**(중앙 blast-radius; catalog 변경 0 상속 확인).
**의존**: Wave A+B.

## Wave D — vnv 최종판정 (vnv dispatch, Wave C 후)
- validate PASS(개체수·4체크·orphan 0) · TBox 패턴 정합 · recipe 무영향 2개 · materialize round-trip(4 신규 섹션 emit·결정성) · **coverage audit**: source-mapping.md의 NEW-TBox/NEW-central 항목이 전부 표현으로 매핑됐고 NO-MODEL 목록은 의도적 제외인지 확인. → `docs/verify/revfactory-reflection.md`.

## 완료 정의
Wave A~C land(각 validate PASS) + Wave D vnv PASS + coverage audit(소스 방법론 개념 전수 귀속, NO-MODEL 명시). 이후 inspection push(별도 세션). 미해결 GAP은 후속 dispatch.

## 리스크/주의
- **write-race**: wave가 파일 배타라 없음. 단 Wave B의 다수 파일은 concepts.ttl을 공유 참조(짝 개념) — **한 developer가 Wave B 전체 파일 소유**(병렬 분할 금지, 짝 개념 IRI 정합 위해).
- **blast-radius**: 중앙 변경이 전 recipe union에 상속(roadmap §5 D4) — Wave C·D에서 recipe federate 재검증 필수.
- **materialize 결정성**: 새 emitter는 총순서·조건부 섹션(빈 값 시 미emit) 유지, byte-identical 회귀가드.
- **doctrine 일치**: 저장 harness가 운영 harness(CLAUDE.md)와 모순되지 않게 — central-dispatch 기본 유지(D1), peer/agent-teams는 selectable 대안으로만.
