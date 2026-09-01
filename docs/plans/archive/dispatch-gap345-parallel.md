# Dispatch brief — GAP-3/4/5 병렬 증분 (revfactory P1 후속)

> 작성: orchestrator (2026-07-24). 상위: `docs/plans/dispatch-revfactory-p1-residual.md` "실행 결과"의 GAP-3/4/5.
> 실행: **developer 3인 병렬 dispatch (opus)**. 선행 land 상태: `af31594`+P1 증분(미커밋, 198 individuals, validate PASS).

## ★병렬 실행 규약 (3인 공통 — 반드시 지킬 것)
한 작업트리에서 3인이 동시에 편집한다. 충돌 방지는 **파일 소유권 분할**로 한다.

- **자기 소유 파일 밖은 절대 편집하지 않는다** (아래 A/B/C 표가 경계).
- **`validate.py`/`materialize.py` 실패가 자기 소유 밖 파일 때문이면 고치지 말라** — 다른 에이전트의
  과도기 상태다. 잠시 후 재실행하고, 끝까지 남으면 **보고만** 한다 (남의 파일을 고치면 서로의 작업을 덮어쓴다).
- git 조작 금지(inspection 소관). 최종 권위 있는 validate는 **orchestrator**가 3인 취합 후 1회 수행한다.
- 공통 규약: `ONTOLOGYSTYLE.md`(predicate 순서 §3·Turtle §4·네이밍 §2), **어휘 발명 금지**(없으면 GAP 보고),
  텍스트 노드에 `ho:tokenEstimate`, 신규 노드 `ho:maturity "draft"`.

| 담당 | GAP | 소유 파일 (이 밖은 편집 금지) |
|---|---|---|
| **A** | 3 | `ontology/abox/core/verification/verification.ttl`(신규) · `ontology/abox/core/process/workflows.ttl`(scn-/fp- 블록 **제거만**) · `ontology/harness-ontology.ttl` · `catalog-v001.xml` · `staging/harness-recipes/catalog-v001.xml` + `staging/harness-recipes/catalog-*.xml` |
| **B** | 4 | `ontology/abox/core/assembly/assembly-sections.ttl` · `ontology/abox/core/wholes/harnesses.ttl`(**`h-multiagent`의 `ho:hasAssemblySection` 줄만**) · `tools/materialize.py` · `tools/ontology_lib.py` |
| **C** | 5 | `ONTOLOGYSTYLE.md` (§2 네이밍표만) |

---

## A — GAP-3: `core/verification/` data unit 신설 (순수 relocation)
현재 TestScenario 2(`scn-compose-smoke`·`scn-trigger-near-miss`) + FailurePolicy 2(`fp-dispatch-timeout`·
`fp-validation-fail`)가 `process/workflows.ttl`에 co-locate돼 있다. DA-4 레이아웃(ONTOLOGYSTYLE §4)상 이들의
자리는 `core/verification/`이다. **개체 IRI·트리플 내용은 그대로**, 파일 위치만 옮긴다.

1. 신규 `ontology/abox/core/verification/verification.ttl` — prefix 블록 + 자기 `owl:Ontology` 헤더
   (문서 IRI **`https://harness-ontology.dev/data/core/verification`**, `owl:imports` 중앙 TBox `.../schema`만).
   기존 4개체 블록을 **트리플 변경 없이** 이동 + 배너 주석(§1d: 이 unit의 역할 1–3줄).
2. `process/workflows.ttl` — 옮긴 4블록과 그 전용 배너만 제거. **workflow/step/deliverable은 건드리지 않는다.**
3. `ontology/harness-ontology.ttl` — root `owl:imports`에 새 문서 IRI 1줄 추가.
4. `catalog-v001.xml` — 새 IRI→`ontology/abox/core/verification/verification.ttl` 매핑 1줄 추가.
5. `staging/harness-recipes/catalog-v001.xml` + 전용 `catalog-*.xml` — 동일 IRI 매핑 추가(central 경로 규약 따름).

**게이트**: `validate.py` PASS **@198**(개체 수 불변 — 이동이므로 증감 0). recipe federate 확인:
`HARNESS_CATALOG=$PWD/staging/harness-recipes/catalog-v001.xml` 로 pilot 1개 이상 PASS.

## B — GAP-4: sectionKind 4종 AssemblySection + materialize 렌더러
`ho:sectionKind` enum에는 `execution-mode`·`data-flow`·`error-handling`·`test-scenarios`가 이미 있으나
AssemblySection 개체도 `SECTION_RENDERERS` 항목도 없어, scenario/failure-policy가 문서에 렌더되지 않는다.

1. `assembly-sections.ttl` — AssemblySection 4개체 추가(`id:as-execution-mode`·`as-data-flow`·
   `as-error-handling`·`as-test-scenarios`). `ho:assemblyOrder`는 **기존 1–8과 겹치지 않는 유일값**(9–12 권장),
   총순서 유지. 각 노드에 prefLabel·definition(왜 이 자리인가)·tokenEstimate·maturity "draft".
2. `harnesses.ttl` — `h-multiagent`의 `ho:hasAssemblySection` 목록에 4개 append (**그 줄만** 수정).
   이 집합이 모든 하네스의 **기본 순서**이므로 여기 넣어야 총순서가 성립한다.
3. `tools/materialize.py` — `SECTION_RENDERERS`에 4 키 추가 + 렌더러 구현.
   - `test-scenarios`: harness의 `ho:hasTestScenario` → scenarioKind/prompt/expected 렌더.
   - `error-handling`: `ho:hasFailurePolicy` → 실패조건→복구전략 표.
   - `data-flow`: step의 `stepProduces`/`stepConsumes` join(Deliverable DAG).
   - `execution-mode`: **`ho:ExecutionMode`는 TBox에 없다**(D2 경량화). 해당 축은 `appliesPattern` 중
     `ho:tagged id:c-execution-mode`인 DesignPattern(`pat-agent-teams`/`pat-sub-agents`/`pat-hybrid`)이다. 이걸 읽어 렌더.
     **새 클래스·속성을 만들지 말 것.**
4. `tools/ontology_lib.py` — `INSTANCE_LINK_PREDICATES`에 `HO.scenarioReferences`(+필요시 `HO.hasTestScenario`·
   `HO.hasFailurePolicy`) 추가해 retrieve edge 뷰에 노출.

**★불변식 (최우선)**: 신규 4종은 **해당 부품이 없는 하네스에서는 아무것도 emit하지 않아야 한다**
(배너가 명시한 roles/channels/skills 조건부 패턴과 동일). `h-multiagent`는 TestScenario/FailurePolicy가 없으므로
**그 materialized 문서가 byte-identical해야 한다**. 기준선: `/tmp/claude-1000/-home-cpark-git-harness-ontology/3c05e966-f838-4522-adda-260d6a946f76/scratchpad/base-mm`
(CLAUDE.md·MANIFEST.json). `h-harness-factory`는 부품이 있으므로 **바뀌는 것이 정상**(신규 섹션 렌더 확인).

**게이트**: `validate.py` PASS(assemblyOrder 총순서 ✓) + `materialize.py h-multiagent` **CLAUDE.md/MANIFEST.json이
기준선과 byte-identical**(diff 0) + `materialize.py h-harness-factory`에 4섹션 정상 렌더 + 2회 실행 결정성(diff 0).

## C — GAP-5: ONTOLOGYSTYLE §2 네이밍표 보강
§2 개체 네이밍 표에 실제 사용 중이나 누락된 접두사를 추가한다(문서만 수정, 온톨로지 무변경):
`wfs-`(WorkflowStep) · `dlv-`(Deliverable) · `scn-`(TestScenario) · `fp-`(FailurePolicy) ·
`as-`(AssemblySection) · `mem-`/기타 실사용 접두사는 `ontology/abox/core/`를 grep해 **실측 후** 누락분만 등재.
표 형식·문체는 기존 행과 동일하게. 각 행의 예시는 **실재하는 IRI**를 쓴다(허구 예시 금지).

**게이트**: 표의 모든 접두사가 실제 abox에 존재하는지 grep로 교차확인. 온톨로지 파일 무수정이므로 validate는 무영향(그래도 1회 실행해 PASS 확인).

---

## 반환 보고 (3인 공통)
① 수정/생성 파일 목록 ② 핵심 변경 요약 ③ 게이트 실행 로그(위 각 절) ④ GAP·편차(있으면 근거와 함께)
⑤ 다른 에이전트 소유 파일 때문에 막힌 것이 있으면 그 사실.
종료 전 재사용 지식을 `.claude/agent-memory/developer/`에 파일 1개 + `MEMORY.md` 한 줄로 남긴다.

---

# 실행 결과 (2026-07-24, 3인 병렬 완료 · orchestrator 최종검증)

**`validate.py` PASS @202** (SHACL·reachability·capabilities·assemblyOrder ✓, 기본 순서 **12 sections**).
소유 경계 위반 0, 어휘 발명 0(tools의 모든 `HO.*`가 TBox 실재).

- **A (GAP-3)**: `core/verification/verification.ttl` 신설, `scn-`×2·`fp-`×2 이동(트리플 무변경, 개체 증감 0),
  root imports·중앙/recipe catalog 등록. recipe federate **8/8 PASS**.
- **B (GAP-4)**: AssemblySection **4**(`as-execution-mode` 9·`as-data-flow` 10·`as-error-handling` 11·
  `as-test-scenarios` 12) + `materialize.py` 렌더러 4 + `ontology_lib.INSTANCE_LINK_PREDICATES` +3.
  `execution-mode`는 `ho:ExecutionMode`가 없으므로 `appliesPattern ∩ tagged c-execution-mode`(DesignPattern 축)로 구현.
- **C (GAP-5)**: `ONTOLOGYSTYLE.md` §2 표 +11행(전부 실측 IRI), §4 그룹 목록 12→13(`verification/` 등재),
  빈-그룹 서술을 **타입 레벨**로 정정(실측 결과 빈 그룹 0).

## 부수 발견 — 잠복 결함 2건 (이번 증분에서 복구)
1. **전용 recipe catalog 4개가 REORG-1/2 갱신에서 누락** → 평면경로 + 신규 4유닛 미등록. 증상이 에러가 아니라
   **조용한 부분 closure**(198이 아닌 `41 individuals`, capabilities/assemblyOrder FAIL)라 여태 보이지 않았다. A가 복구.
2. **네이밍표에 실재하지 않는 예시 IRI 2건**(`ins-verify-then-proceed`·`aoi-orchestrator-external`). C가 실측 IRI로 교체.

## orchestrator 설계 판정 — `as-data-flow` (byte-identity 불변식 충돌)
B가 브리프의 ★byte-identity 불변식과 항목 1의 충돌을 발견하고 **정지 후 결정 요청**(올바른 처리).
**판정: (a) h-multiagent 문서 변경 수용.** 그 불변식은 *리팩터의 출력 중립성*을 지키려던 보호장치이지,
**이미 그래프에 있으나 렌더되지 않던 데이터를 드러내는 기능**을 막으려던 것이 아니다. data-flow는 h-multiagent가
실제로 Deliverable DAG를 보유하므로 억제하면 기능의 목적이 사라지고 order 10이 영구 공석으로 남는다.
- 검증: h-multiagent CLAUDE.md **삭제·변경 줄 0, `## Data flow` 섹션만 순수 append**(회귀 0, 2회 결정성 diff 0).
- **파급(수용됨)**: 기본 순서를 상속하는 pilot 5 recipe에도 동일 섹션 1개 추가. `techdoc`은 deliverable 생산 step이
  없어 미출력(조건부 가드 정상 동작).
- TBox는 `sectionKind`·`AssemblySection`의 **`skos:definition` 리터럴 2개만** 정정(구조 선언 변경 0, `sh:in` 무접촉).

## 잔여 (후속 증분 후보)
- **execution-mode 섹션이 아직 어느 중앙 하네스에서도 출력되지 않음** — `pat-agent-teams`/`pat-sub-agents`/`pat-hybrid`를
  `appliesPattern`으로 채택한 하네스가 0. 어느 하네스가 실행모드를 선언할지는 **모델링 결정**(렌더러는 검증 완료).
- `tools/ontology_lib.py:INSTANCE_CLASSES`에 `TestScenario`/`FailurePolicy` 미등록 → MANIFEST에서 type이
  `HarnessComponent`로 표기. 개선 여지(MANIFEST 변경 유발).
- git land는 **inspection 세션** 소관(이 증분 미커밋). `staging/`은 `.gitignore` 대상이라 recipes repo push는 별도.
