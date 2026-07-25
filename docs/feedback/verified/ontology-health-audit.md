---
source: (user-requested full-ontology health audit — orchestrator dispatch)
verdict: apply-with-changes
targets: [ONTOLOGYSTYLE.md §2 naming table, ONTOLOGYSTYLE.md §3 predicate order]
scope: read-only audit — no ontology/tools/git edits performed
graph_baseline: 237 individuals, validate.py PASS, check_determinism.py PASS
---
# 종합 감사 보고 — 온톨로지 통일성 + 건전성 (237 individuals)

읽기 전용 감사. 온톨로지/tools/git 무편집. 실측 수치 + 구체 IRI. 발견은 판정만이며,
수정은 orchestrator(developer dispatch / ONTOLOGYSTYLE는 doc 편집) 소관.

## 종합 verdict
**건전성(soundness): PASS — 결함 0.** 건전성 축(validate·parity·determinism·capability·
Contract teeth·materialize 무유출·specializes 정합) 전부 통과. 이 세션의 대폭 성장
(205→237)에서 **누적 정합 결함은 발견되지 않았다.**

**통일성(uniformity): PASS-with-doc-gaps.** 저작 실무는 클래스 내부에서 일관적이나, 규범
문서(ONTOLOGYSTYLE §2·§3)가 이번 세션 신규 술어·접두사를 **아직 등재하지 못한 doc-lag** 2건.
이 둘은 ontology/ 결함이 아니라 문서 완결성 gap이며, 방치 시 다음 저작자가 drift를 유발할
표면이므로 **우선 수정 권고**(P1/P2).

**세분화(decomposition): 충분 — 신규 blob 0.** 신규 어휘가 blob을 추가하지 않았고,
기존 판정(§C-0 Q3, gr-design-for-loss 등 = 사용자/모델링 결정)은 그대로 유효.

---

## A. 건전성 (soundness)

| 항목 | 결과 | 실측 |
|---|---|---|
| `validate.py` | **PASS** | SHACL ✓ · reachability ✓ (237/237 harness-reachable) · capabilities ✓ · assemblyOrder ✓ (13 sections) · duplicate-label ✓ |
| parity | **PASS** | `instance_nodes(load_graph())` = `load_graph(reason=False)` = **237** (동일 집합). 이전 173 vs 205 격차는 B3 해소로 소멸 — `INSTANCE_CLASSES`가 이제 **34 클래스 전부**(Agent·AoI·AoO·ObservationSpace·Memory·TestScenario·FailurePolicy·Hook·Contract·ExecutionMode·Role·Channel 포함) |
| `check_determinism.py` | **PASS** | 4 requests × md/json, 프로세스 간 byte-identical |
| orphan/island | **PASS** | 0. 전 237 harness-reachable |
| capability 짝 | **PASS** | 9 capability, required 9 = provided 9, required-but-unprovided **0**, orphan cap **0** |
| drift (근사중복) | **PASS** | 클래스 내 prefLabel 중복 **0**. definition Jaccard ≥0.6 = **6쌍 전부 `oa-*-internal` 대칭 템플릿**(이미 §C-0에서 non-drift 판정된 AreaOfObservation 패밀리). 신규 어휘발 drift 0 |
| deprecated 정합 | **PASS(주의)** | 3노드 `pat-agent-teams`·`pat-sub-agents`·`pat-hybrid`. 실 inbound 참조 **0**(owl:sameAs self는 추론 artifact). 후계를 산문으로 정확히 지목(`id:mode-agent-teams`·`id:mode-sub-agents`·`id:mode-hybrid`). **단 후계 edge는 여전히 prose-only = 기존 GAP B9**(구조화 미완, 이번 세션 무관) |
| specializes 계층 | **PASS** | 중앙 **2 edge**: `role-inspection-worker→role-inspection`(Role→Role), `h-support→h-research`(Harness→Harness). 둘 다 same-partition, **사이클 0**. (브리프의 "82 링크"는 recipe-scope로 중앙 abox엔 없음 — 중앙 SpecializesTypingShape 대상은 이 2건) |
| Contract teeth | **PASS** | `verify_contract h-harness-factory --tree <materialized>`: 실트리 **2/2 PASS exit 0**; SKILL.md heading·description 훼손 시 **0/2 FAIL exit 1**. 실teeth 확인 |
| Hook parity | **PASS** | 4 Hook 개체(`hook-session-start/pre-tool-use/post-tool-use/stop`) INSTANCE_CLASSES 등록. `h-harness-factory hasHook`로 배선, materialize 시 CLAUDE.md + MANIFEST에 렌더, 유출 0 |
| materialize 건전성 | **PASS** | 중앙 7 harness 전부 materialize 성공 · 2회 실행 byte-identical(결정성) · 산출 트리 내부 IRI `id:` **0** · `ho:` **0** · 로컬경로 `/home/cpark` **0** |

## B. 통일성 (uniformity)

| 항목 | 결과 | 실측 / IRI |
|---|---|---|
| tokenEstimate | **PASS** | §1c 범위(SystemPrompt/Instruction/Guardrail/Example/Tool/Workflow + promptText 보유) 내 누락 **0**. 진단 불변식 `tokenEstimate > DEFAULT_BUDGET(900)` = **0노드**(팩 조기절단 방어 유지) |
| observedTokenVolume 분리 | **PASS** | 10 `oa-*` 노드가 두 술어 병행 보유는 **정상**(B5 수정 후 형태): tokenEstimate 30–75(자기 텍스트 투영비), observedTokenVolume 1500–12000(런타임 관측량). 관측량이 tokenEstimate에 새는 노드 0 |
| maturity | **PASS(비대칭)** | 매직값 **0**. 분포 deprecated 3 / draft 112 / reviewed 47 / stable 13 / **누락 62**. 누락 62는 전부 SpecConcept 계열(Concept·Capability·Task·Domain·DesignPattern·Constraint) — shapes가 일부 클래스에만 `maturity minCount 1`을 거는 **기존 비대칭**(위반 아님) |
| prefLabel 유일 | **PASS** | 클래스 내 중복 **0** |
| **네이밍 §2** | **WARN (doc-lag 2건)** | 아래 2개 상세 |
| predicate 순서 §3 | **PASS(doc-lag)** | 실무 일관. observedTokenVolume(block7)·specializes(block5) 정위치 확인. **§3 목록이 신규 술어 미열거**(아래) |
| dct 귀속 | **PASS** | source 보유 6노드 전부 license 보유(source-무-license 0). NOTICE가 두 소스(rohitg00/awesome-claude-code-toolkit·wshobson/agents) 모두 등재. 일관 |
| 파일 레이아웃 §4 | **PASS** | DA-4 그룹 13개 디렉토리 · 18 ttl 파일이 그룹에 정합 매핑 · catalog 21 entry. `ontology/abox/authored.ttl`은 catalog+root-import에 있으나 디스크 부재 = **webui/import 예약 write-target**(4 tools 참조), 로더가 부재 tolerate(validate PASS) — 의도된 것, 결함 아님 |

### B-네이밍 발견 1 (WARN, P1): Contract 접두사 실무 ≠ §2 표
- 실개체 2건은 **`ct-`** 사용: `id:ct-well-formed-skill-heading`, `id:ct-well-formed-skill-description`
  (`ontology/abox/core/spec/capabilities.ttl`).
- 그러나 §2 표는 Contract = **`contract-`**(예 `id:contract-greeter-emitted`).
- ⇒ 문서-실무 불일치. 어느 쪽이 정본인지 결정 필요.

### B-네이밍 발견 2 (WARN, P1): Hook 접두사 §2 표 미등재
- 4 Hook 개체가 **`hook-`**를 일관 사용하나 §2 네이밍 표에 **Hook 행 자체가 없다**.
- ExecutionMode(`mode-`)·Contract(`contract-`)는 표에 있으나 Hook은 누락 — 이번 세션
  신규 클래스가 표에 반영되지 않음.

### B-predicate 발견 3 (doc-lag, P2): §3 순서 목록이 신규 술어 미열거
- 실무는 harness 간 일관(`hasExecutionMode`가 appliesPattern↔requiresCapability 사이,
  `hasHook`이 조립부, `hasRole/hasChannel/hasMemory/hasAgent/hasGlobalState/hasAssemblySection`이
  usesModel 뒤)이나, §3 순서 명세는 이 술어들의 위치를 **명문화하지 않았다**.
- 위험: 다음 저작자가 자리를 임의 배치 → 통일성 표류 표면. observedTokenVolume·specializes는
  §3에 이미 있고 정위치 준수 확인.

## C. 세분화 (decomposition)

- definition 길이: count 175, median **248** / p90 **540** / max **1019**(`wf-compose-harness`).
  상위 blob 후보(`h-workspace-synthesis` 981 · `mode-agent-teams` 914 · `pat-blackboard` 889 ·
  `role-coordinator` 860 · `chan-peer` 832 · `h-harness-factory` 818)는 대부분 harness/pattern/
  channel의 **선택근거 산문**(§1d 정당). 기존 §C-0 Q3 판정 유효 — 임의 분해 대상 아님.
- **신규 어휘발 blob 0.** `gr-human-checkpoint`(신규, guardrail promptText 최장 597자)는
  **단일 책임 + 이웃 구별 산문**(gr-no-arbitrary-decision·gr-verify-proceed와의 차이 명시 =
  anti-drift 정당). promptText 내 `id:` 참조는 B7 resolver가 렌더 시 라벨로 해소(유출 0 확인).
- 다중정책 guardrail(gr-design-for-loss 등): 기존 orchestrator 판정(응집 원칙 4측면 vs 4정책
  = 사용자/모델링 결정, 부재 중 임의 저작 금지) 변동 없음.
- archetype↔instance 커버리지: 중앙 specializes 2 edge. **B24**(research/design/curation/
  synthesis 축 원형 부재)는 설계 결정 대기로 그대로 열림 — 이번 감사가 새로 만든 gap 아님.

## 적용 계획 (orchestrator 실행용 — 전부 ONTOLOGYSTYLE.md 문서 편집, ontology/ 무변경)

우선순위 정렬. **모두 doc-only** (developer dispatch가 아니라도 되나, 파일 편집은 역할 경계상
inspection이 하지 않으므로 orchestrator/developer 소관).

1. **[P1] §2 표 Hook 행 추가**: `| Hook | \`hook-\` | \`id:hook-session-start\` |`.
2. **[P1] §2 Contract 접두사 정본화**: 실무가 `ct-`(개체 2건 존재, ID 재사용 금지 원칙상
   개체 rename은 비용)이므로 **표를 `ct-`로 정정**하는 안이 최소변경(예도 `id:ct-…`로).
   대안(표 `contract-` 유지 + 개체 rename)은 ID 변경이라 권장 안 함. **택1은 사용자/orchestrator 결정.**
3. **[P2] §3 순서 명세에 신규 술어 위치 명문화**: `hasExecutionMode`(block5, appliesPattern↔
   requiresCapability), `hasHook`·`hasRole`·`hasChannel`·`hasMemory`·`hasAgent`·
   `hasGlobalState`·`hasAssemblySection`(block4 조립부, usesModel 뒤)의 자리를 실무대로 등재.
4. **[P3 정보] 기존 열린 GAP은 이번 감사 대상 아님**: B9(prose-only 후계 edge)·B24(archetype
   커버리지)·maturity 62 비대칭 — 상태 변동 없음, OPEN-ISSUES에서 계속 추적.

## 판정
verdict: **apply-with-changes**. 온톨로지 자체는 건전·통일·충분분해 상태로 **수정 불요**.
적용 대상은 **ONTOLOGYSTYLE 문서 3건**(§2 Hook 행·§2 Contract 접두사 정본·§3 신규 술어 자리)
이며, P1 2건은 향후 저작 drift를 막는 저비용 방어라 우선. Contract 접두사 정본 선택은
사용자/orchestrator 결정 지점.
