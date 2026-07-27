# abox 정리 감사 — Concept 클래스 (38 skos:Concept) 전수 검토

**판정만 (findings only). 편집·삭제 안 함.** 대상: `ontology/abox/core/vocab/concepts.ttl`
(38개 `ho:Concept` + 1 `skos:ConceptScheme`).

## 재현 절차 (실행한 명령)

- 구조 게이트: `/usr/bin/python3 tools/validate.py` → **PASS** (SHACL·reachability
  "all 236 individuals reachable"·capabilities·assemblyOrder·중복 label 0).
- 사용도(tagged 참조) + broader/top/related: `rdflib`로 `ontology/**/*.ttl` 전체 union
  파싱 후 `ho:tagged` object별 카운트 + `skos:broader`/`skos:topConceptOf`/`skos:related`
  집계. (셸 기본 `python3`엔 rdflib 없음 → `/usr/bin/python3` 사용.)
- 정의 판별: `skos:definition`/`skos:prefLabel`/`skos:altLabel` 원문 인용.

## 종합 판정

- **orphan (0-tagged / 완전 고립): 없음.** 38개 전부 `ho:tagged` 참조 ≥1.
- **진짜 중복(merge 대상): 없음.** near-duplicate로 보이는 군집은 모두 정의에 명시적
  "Distinct from …"/직교 축 문구를 갖는 **의도된 세분** → anti-drift FIRST 기준 KEEP.
- **결함 1건 (KEEP-but-wire): `c-autonomy`** — subject-matter top 9개 중 유일하게
  `skos:topConceptOf`도 `skos:broader`도 없이 `skos:related`만으로 매달림 (계층 앵커 누락).
- 그 외 low-usage(tagged=1) 다수 있으나 orphan 기준(0-tagged)이 아니므로 결함 아님.

## 사용도 표 (tagged 참조 카운트 + 계층 앵커)

anchor 열: `top`=skos:topConceptOf id:scheme, `→X`=skos:broader X, `rel:X`=skos:related X.

| id | tagged | anchor | 판정 |
|---|---|---|---|
| c-multiagent | 39 | top (rel:autonomy) | KEEP |
| c-pattern-taxonomy | 7 | →multiagent | KEEP |
| c-design | 6 | top | KEEP |
| c-execution-mode | 6 | →multiagent | KEEP |
| c-complexity-governance | 6 | →multiagent | KEEP |
| c-agent-methodology | 4 | top | KEEP |
| c-inforetrieval | 4 | top | KEEP |
| c-softeng | 3 | top | KEEP |
| c-memory | 3 | top (rel:autonomy) | KEEP |
| c-safety | 2 | top | KEEP |
| c-autonomy | 2 | rel:safety **(no top/broader)** | **KEEP-but-wire** |
| c-communication | 2 | top | KEEP |
| c-traceability | 2 | top | KEEP |
| c-least-privilege | 2 | →agent-methodology | KEEP |
| c-verify-proceed | 2 | →agent-methodology | KEEP |
| c-escalation | 2 | →agent-methodology | KEEP |
| c-composition | 2 | →agent-methodology | KEEP |
| c-skill-authoring | 2 | →agent-methodology | KEEP |
| c-acceptance-coverage | 2 | →agent-methodology | KEEP |
| c-structured-output | 2 | →communication | KEEP |
| c-grounding | 2 | →traceability | KEEP |
| c-synthesis | 2 | →multiagent | KEEP |
| c-debugging | 1 | →softeng | KEEP |
| c-summarization | 1 | →inforetrieval | KEEP |
| c-design-for-loss | 1 | →agent-methodology | KEEP |
| c-bounded-context | 1 | →agent-methodology | KEEP |
| c-graceful-fallback | 1 | →agent-methodology | KEEP |
| c-reuse-first | 1 | →agent-methodology | KEEP |
| c-root-cause | 1 | →design | KEEP |
| c-simplicity | 1 | →design | KEEP |
| c-report-over-prompt | 1 | →communication | KEEP |
| c-controlled-vocabulary | 1 | →communication | KEEP |
| c-structural-coverage | 1 | →traceability | KEEP |
| c-dispatch | 1 | →multiagent | KEEP |
| c-delegation | 1 | →multiagent | KEEP |
| c-scale-modes | 1 | →multiagent | KEEP |
| c-cross-validation | 1 | →multiagent | KEEP |
| c-deliverable-artifact | 1 | →multiagent | KEEP |

## Orphan 목록

- **0-tagged: 없음.** (validate.py의 "all 236 individuals reachable"와 정합 — 위 카운트로
  38/38 모두 tagged≥1 재확인.)
- **완전 고립(no broader/top AND 0-tagged): 없음.**

## Broader 계층 정합 (criterion 3)

- 부모별 자식 수: agent-methodology 10, multiagent 9, communication 3, design 2,
  traceability 2, softeng 1, inforetrieval 1. **사이클 없음**(모든 broader가 top으로 상향),
  **중간 부모 누락 없음**, 고아 서브트리 없음.
- **결함: `c-autonomy` 계층 앵커 누락.** subject-matter top은 9개
  (softeng/inforetrieval/safety/communication/design/multiagent/memory/traceability/
  agent-methodology) 모두 `skos:topConceptOf id:scheme`를 갖는데, `c-autonomy`만 없음.
  정의:
  > "Autonomy … The degree to which an agent acts without human intervention …"
  자체는 최상위 subject-matter 축(safety와 병렬)로 보이나, 그래프상 `skos:related id:c-safety`
  한 줄로만 scheme에 매달림. tagged=2 (`wf-react`, `h-coding`)라 validate orphan 검사는
  통과하지만, SKOS 계층상 **어느 top의 자식도 아니고 top도 아님** = 앵커 공백.
  **판정 KEEP-but-wire**: 노드·정의는 유효하니 삭제/병합 대상 아님. `skos:topConceptOf
  id:scheme`를 추가(다른 8 subject-matter top과 동일 패턴)하면 정합. (수정은 developer
  dispatch 소관 — 이 리포트는 판정만.)

## near-duplicate 군집 (전부 KEEP — 의도된 축, 근거 인용)

정의에 **자기 판별 문구**가 박혀 있어 진짜 중복이 아님. merge 안 함.

1. **c-synthesis ↔ c-cross-validation** (both →multiagent).
   - synthesis: "converging the separate deliverables … the terminal convergence step …,
     **distinct from mere verification in that it also compiles the integrated output**."
   - cross-validation: "a deliverable is checked by a role other than the one that produced
     it … severity … **Distinct from synthesis, which merges the reviewed contributions**."
   → 양방향 명시적 판별. **KEEP 둘 다.**

2. **c-execution-mode ↔ c-pattern-taxonomy ↔ c-complexity-governance** (all →multiagent).
   - execution-mode: "runtime topology … **an axis orthogonal to the architectural
     data-flow pattern**."
   - pattern-taxonomy: "architectural … coordination patterns … **independent of the runtime
     execution mode**."
   - complexity-governance: "bounding … complexity — limiting delegation depth …" (거버넌스
     guardrail 축, 카탈로그도 런타임도 아님).
   → 3개가 서로 직교 축임을 정의가 못박음. **KEEP 셋 다.**

3. **c-dispatch ↔ c-delegation** (both →multiagent).
   - dispatch: "**worker** agents act only when dispatched … never run standalone"
     (worker-side 제약).
   - delegation: "the user-facing **orchestrator** does no substantive work directly but
     only plans and dispatches" (orchestrator-side 제약).
   → 같은 dispatch 관계의 서로 다른 끝(worker vs orchestrator)을 규정. 겹치지 않는 규율.
   **KEEP 둘 다** (related 군집으로 인지하되 merge 아님).

4. **c-controlled-vocabulary ↔ c-reuse-first** (communication vs agent-methodology).
   - controlled-vocabulary (altLabel "anti-drift"): "reusing registered **terms** and
     established domain **vocabulary** rather than coining near-synonyms."
   - reuse-first (altLabel "anti-orphan authoring discipline"): "reusing an existing **typed
     part** before authoring a new one, and **connecting** any new part … so the graph never
     gains an **orphan**."
   → 하나는 용어(vocabulary drift), 하나는 그래프 노드(orphan) 축. 인접하나 대상이 다름.
   **KEEP 둘 다.**

5. **c-composition ↔ c-reuse-first** (both →agent-methodology).
   - composition: "**assembling** a harness from reusable parts — selecting a base template …
     binding required capabilities … satisfying the harness shape" (조립 워크플로).
   - reuse-first: 새 part 저작 전 재사용+연결 규율 (저작 규율).
   → 워크플로 vs 저작 규율. **KEEP 둘 다.**

기타 후보 (c-report-over-prompt↔c-structured-output, c-grounding↔c-structural-coverage,
c-summarization↔c-inforetrieval, c-scale-modes↔c-execution-mode)도 정의상 대상/축이 분명히
갈려 검토했으나 전부 **의도된 세분 → KEEP**.

## redundancy/merge 후보 결론

- **merge 대상 0건.** anti-drift FIRST 기준으로 near-duplicate 군집을 전수 검토했으나
  모두 정의에 판별 근거가 있는 구별된 축이었다. 병합 방향(다수 tagged 생존) 적용 대상 없음.

## 후속 (라우팅은 orchestrator 소관 — 본 리포트는 판정만)

- **P: `c-autonomy`에 `skos:topConceptOf id:scheme` 추가** (다른 8 subject-matter top과
  동일 패턴). 계층 앵커 공백 해소. developer dispatch로 저작 → validate.py PASS 확인.
  (단일 triple 추가, 검색·재현 영향 없음; 삭제/병합 아님.)
- 그 외 low-usage(tagged=1) 노드는 결함 아님 — orphan 기준은 0-tagged.
