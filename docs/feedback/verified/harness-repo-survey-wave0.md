---
source: harness-repo-survey.md
verdict: apply            # Wave 0 = 판정·조사 산출(저작 0). Wave 1~4 착수 승인은 이 리포트가 근거.
targets: [tbox:ho:Hook, core:role-*, core:pat-*, core:mode-*, core:gr-*]
kind: coverage-audit
wave: 0
measured_at: 2026-07-25   # graph @226 individuals, developer B17(ho:specializes) 진행 중
---
# 검증 보고 — harness-repo-survey Wave 0 커버리지 대조

읽기 전용 조사. 온톨로지·tools·plans 미편집, 미커밋. 현재 그래프(226 individuals) 실측 기준.
동시 실행 중인 developer B17(`ho:specializes` TBox 일반화)와 무간섭(읽기만).

## 1. license-gate 최종 채택 소스

| source | license | 판정 | Wave |
|---|---|---|---|
| `ai-boost/awesome-harness-engineering` | CC0-1.0 | **채택(무조건)** — 커버리지 감사 기준(부품 아님) | Wave 0 |
| `wshobson/agents` (16 orchestrators / 139 roles / skills) | MIT | **채택** — NOTICE 저작권 + `dct:source` | Wave 1·2·3 |
| `VoltAgent/awesome-claude-code-subagents` (155 roles) | MIT | **채택** — 동일 조건 | Wave 2 |
| `rohitg00/awesome-claude-code-toolkit` (20 hooks / 15 rules / skills) | Apache-2.0 | **채택** — NOTICE 크레딧(harness-100 규약) | Wave 3·4 |
| `mattpocock/agent-rules-books` | MIT(내용은 서적 유래) | **조건부 채택 — 온톨로지에만**(사용자 ③). 문구 복사 금지, 규칙 취지만 중립 `ho:Guardrail`로. recipe/예제로는 emit 안 함 | Wave 3 |
| `tallesborges/agentic-system-prompts` | MIT(편찬물) | **구조 관찰만** — 본문 복사·`dct:source` 개체부착 금지 | (참조) |
| `hesreallyhim/awesome-claude-code` | CC BY-NC-ND 4.0 | **채택 불가** — NoDerivatives + 공개 repo NC 충돌 | — |
| leaked system prompt 모음 | 없음 | **채택 불가** — 라이선스 근거 부재 | — |

채택 5 + 관찰 1 + 불가 2. companion `license-gate.md` 판정과 현행 일치(변경 없음).
**사용자 ③ 반영**: agent-rules-books는 채택하되 산출 경로를 **중앙 온톨로지로 한정**(recipe/materialize emit 제외)한다 — Wave 3 게이트에 명시.

## 2. 스키마 gap 4건 — 현행 그래프 재판정

이전 companion(`ontology-mapping.md`)의 gap 4건을 @226 그래프로 재실측.

### GAP-H (hook / lifecycle trigger) — **확정: TBox 확장 필요** (사용자 ② 신설 승인)
- 실측: `grep -rn "Hook\|hookEvent" ontology/tbox/` → **없음**. abox에도 트리거 개체 0.
- 우리 `ho:Guardrail`(정책 39개)·`ho:WorkflowStep`(절차 10개) 어느 쪽도 "이벤트 발생 시 실행"(SessionStart/UserPromptSubmit/PostToolUse/Stop)의 **트리거 축**을 담지 못함 — 담을 어휘 범주 부재.
- **placement 실측**: TBox에 MAS-tuple 정렬 중간 component superclass 9개 존재
  (`ho:BehavioralComponent`·`ho:ProcessComponent`·`ho:OperationalComponent` 등, `ontology/tbox/harness.ttl:45~85`).
  `ho:Hook`은 이 계층 아래로 붙는다. **미결 결정**: 부모를 `ho:BehavioralComponent`(companion 제안)로 할지 `ho:ProcessComponent`(제어흐름 트리거는 절차축에 가까움)로 할지 — Wave 4 TBox 저작 시 확정할 축 선택이다(둘 다 orphan 없이 연결 가능).
- CLAUDE.md step-7 규율의 정확한 사례(범주 부재 → 조용히 skip 금지, TBox 확장 우선). **GAP 확정.**

### GAP-E (다중 타깃 emit) — **재판정: TBox gap 아님 (tools-only, 선택 확장)**
- 실측: `materialize.py`는 이미 **다중 타깃**을 emit한다 — CLAUDE.md 섹션(sectionKind별 렌더러) + MANIFEST + `.claude/agents/<role>.md`(role별) + channel record + skill body(`materialize.py:271~278`).
- wshobson의 "5 플랫폼 harness-native 산출"은 **부품 스키마가 아니라 emitter 타깃의 수**를 늘리는 문제다. 부품 쪽 트리플 변경 불요.
- **판정: schema gap 아님.** 필요 시 `materialize.py`에 타깃 렌더러를 추가하는 **tools 확장**일 뿐이며, Wave 로드맵의 필수 항목이 아니다(선택). GAP 목록에서 **강등**.

### GAP-P (permissions / authorization) — **재판정: 부분 표현, 신규 범주 미확정 (defer)**
- 실측 현행 표현: `id:gr-least-privilege`(guardrail) + `id:c-least-privilege`(concept) + **신규 `id:gr-execution-separation`** + `ho:roleTool`(부분집합 권한). 즉 **정책·원칙 축은 표현됨**.
- 미표현: 도구 호출을 런타임에 가로채 정책 평가·승인 라우팅하는 **veto/interception 메커니즘 축**.
- 판정: 이는 harness-**구조**라기보다 런타임 실행기(runtime) 개념에 가깝고, 우리 저장 대상(중립 부품)에 필수인지 불명확. **신규 범주 확정 근거 부족 → defer.** Wave 4에서 GAP-H와 함께 재검토하되, **강행 저작 대상 아님**(needs-decision 성격). 지금은 GAP-H만 확정 gap.

### GAP-O (observability / tracing) — **재판정: 부분 표현 + disambiguation 대상 (신규 범주 아님)**
- 실측 현행: `id:c-traceability`(concept) + `id:gr-traceability`(guardrail) + `chan-agent-user`/feedback 문서 + audit-write workflow step이 **traceability 규율**을 표현.
- 방향 충돌 확인: 우리 `ObservationSpace`/`AreaOfInterest`/`AreaOfObservation`(10 AoO 등)은 **에이전트가 무엇을 보는가**이고, harness-engineering의 observability는 **운영자가 실행을 어떻게 추적하는가** — 같은 단어 반대 방향.
- 실측: `docs/plans/disambiguation-audit.md`가 이미 ObservationSpace/AoI/AoO 3분할을 다룸. operator-side runtime tracing(span/run-log)은 여전히 미표현이나, **신규 1급 범주보다 disambiguation-audit의 연장**으로 처리가 맞다.
- 판정: **부분 표현 + 명명 disambiguation 대상.** 신규 범주 미확정 → defer. GAP-H만 확정.

**재판정 요약**: 4건 중 **확정 TBox gap은 GAP-H(ho:Hook) 1건뿐**. GAP-E는 tools-only(강등), GAP-P·GAP-O는 부분 표현이라 defer(needs-decision). Wave 4의 강행 저작 대상은 **ho:Hook 세트 하나로 축소**된다.

## 3. role 원형 커버리지 (사용자 ④)

### 현재 중앙 원형 실측 (15 `ho:Role` @226)
- **운영(우리 harness 자체)** 9: orchestrator, inspection, inspection-worker, developer, vnv, research, design, synthesizer, **coordinator**(신규).
- **중립 기능 원형** 6: analyst, author, implementer, planner, strategist, tester.
외부 코퍼스와 대조되는 것은 후자 6 + coordinator = **7 기능 원형**이다.

### 외부 대비 (companion 실측 재확인)
- 원 표현 "350여 개"는 **경로 중복 포함치**. 이름 기준 고유 = **253**(VoltAgent 155 + wshobson 139 − 교집합 41). 41은 두 소스 동명(예: `code-reviewer`·`data-engineer`·`cloud-architect`·`python-pro`) → **병합 대상**.
- 253 중 이름에 언어·프레임워크 박힌 것 ≥30(보수적 하한, 실제 도메인 특화 비율은 더 높음) → 중립화 시 대거 collapse.

### 커버리지 판정 + 사용자 ④의 재해석
- 현 7 기능 원형은 **cross-cutting 기능축**(분석/저작/구현/계획/전략/시험/조율)을 덮는다. 253 중 다수가 이 축의 **도메인 특화 변형**(예: `rust-pro`·`ml-engineer` → implementer/analyst 특화)이라 원형으로는 이미 상당 부분 흡수된다.
- **사용자 ④ = 원 mining-plan의 상한 이동**: 원안은 "중앙 원형을 10~20으로 cap". 사용자는 **온톨로지에는 전량 반영, 예제(recipe)를 10~20으로 압축**으로 바꿨다. 즉 cap이 **온톨로지→예제**로 이동. 온톨로지는 253을 **중립화한 archetype 전량**을 담고(raw 253 카탈로그가 아니라 neutralized archetype 전량 — "중립 부품 라이브러리" 원칙과 정합), recipe/예제 emit은 10~20 대표만.
- **정합성 주의(카탈로그화 위험)**: "온톨로지 전량"을 **raw 253**으로 읽으면 저장소가 에이전트 카탈로그로 변질(survey §위험). 중립화(언어·프레임워크 접미 제거·동명 41 병합) 후 archetype 집합으로 담는 것이 §neutral-parts-library 원칙과 CLAUDE.md 골든룰2(near-synonym 금지)에 부합. **Wave 2 저작 게이트에 "중립화·동명병합 후 반영, raw 카탈로그 금지"를 명시**해야 한다.

### 추가 중립 원형 후보 — 실측 한계
- **외부 코퍼스는 로컬에 clone되어 있지 않다**(`~/git`에 wshobson/VoltAgent 없음). 파일 단위 archetype 클러스터링은 **Wave 2의 첫 단계**(파일 open)에서만 확정 가능. companion도 "수확 추정은 추정"이라 명시.
- 따라서 "중앙 승격 vs recipe-local vs 예제 임포트" **실측 목록은 Wave 0에서 산출 불가** — 정직하게 한계로 표시한다. Wave 0가 확정하는 것은 **분류 규칙**이다:
  - **중앙 승격**: 도메인/언어 무관 기능 원형(현 7축으로 안 덮이는 것만 신규). companion이 예시한 cross-cutting 축 외 후보 = reviewer(41 동명군의 대표), architect, coordinator-variant 등 — Wave 2에서 파일 대조로 확정.
  - **recipe-local**: 특정 recipe(lpranging 등)에만 쓰이는 특화 role → 중앙 아님.
  - **예제 임포트(10~20)**: 253의 대표 표본을 recipe 예제로만 materialize(사용자 ④의 상한이 걸리는 지점).

## 4. Wave 1~4 스코프 (크기·의존순서·게이트)

선행(이미 충족): **inc4 importer `tools/import_corpus.py` 존재·검증됨**(33KB, agents/<x>.md→`id:role-<x>`+`id:sp-role-<x>` 경로, memory `importer-independent-verify.md`). Wave 2의 첫 재사용처. → mining-plan이 걸었던 "inc4 선행"은 **해소됨**.

| Wave | 저작물 | 크기 | 소스 | importer 재사용 | 완료 게이트 |
|---|---|---|---|---|---|
| **1** orchestrator/실행모드 | 신규 `ho:DesignPattern`/`ho:ExecutionMode`(+ 필요시 `ho:Workflow`/`WorkflowStep`) | 5~15 | wshobson 16 orchestrators | **부분**(importer는 role 경로 중심 — pattern/mode는 수동 저작 우세) | validate PASS · 신규 전부 `tokenEstimate`+`maturity "draft"` · 기존 `h-*` **byte-identical**(자동결합 0) · `retrieve.py`로 신규 검색됨 · NOTICE+`dct:source` |
| **2** role 원형 | 중립화 archetype 전량(중앙) + 예제 10~20(recipe) | 중앙 = 253 중립화 후 archetype 집합 / 예제 10~20 | VoltAgent 155 + wshobson 139 (동명 41 병합) | **핵심 재사용처**(role 경로) | Wave1 게이트 + **중립화·동명병합 필수(raw 카탈로그 금지)** + `retrieve.py`로 신규 role 검색(anti-orphan 실증) |
| **3** guardrail·skill | `ho:Guardrail` 보강(중복·근사동의어 제거 주작업) | 소규모(dedup 우세) | toolkit 15 rules + skills, **agent-rules-books(온톨로지에만, 사용자 ③)** | skill=Instruction 경로 부분 | Wave1 게이트 + **drift 게이트**(prefLabel 중복·untyped edge 0, 39 guardrail 대비 dedup) + agent-rules-books는 recipe emit 제외 확인 |
| **4** GAP — ho:Hook | **TBox** `ho:Hook`(+`ho:hookEvent`) + hook 개체 + `AssemblySection` + `materialize.py` 렌더러 **한 세트**(GAP-4 전례) | TBox 1클래스+1프로퍼티 / 개체 = toolkit 20 hooks 중립화 | toolkit 20 hooks | 신규(hook 경로) | validate PASS + **범주 신설은 같은 커밋에서 연결**(orphan 금지) + materialize 렌더러 없으면 "그래프에만 존재하는 부품" → 렌더러+section 동반 필수 |

**의존순서**: 1 → 2 → 3 → 4 (mining-plan대로). Wave 4(TBox)는 마지막 — abox 저작(1~3)이 안정된 뒤 스키마 축 추가. GAP-E는 로드맵에서 제외(tools 선택), GAP-P/O는 defer(Wave 4에서 needs-decision 재검토, 강행 저작 아님).

**매 wave lockstep**(mining-plan §공통): 중앙 validate PASS + 개체 증감 기록 · push 전 로컬 federate(8 recipe, 신규 유닛이면 catalog 동반) · materialize 회귀(기존 산출물 diff, 의도 섹션 외 0) · NOTICE/`dct:source` 갱신 · `verified/` 완료보고.

### Wave 1 즉시 착수 가부 — **조건부 No (스코프는 확정, 선행 게이트 3개 미충족)**
Wave 1의 **정의·소스·게이트·전례는 확정**이며 buildable하다. 그러나 **즉시** 착수하려면 아래 3개가 먼저 닫혀야 한다:
1. **developer B17(`ho:specializes` TBox) land + validate PASS 확인.** 현재 그래프가 유동(TBox 편집 중)이라 "기존 h-* byte-identical" 회귀 기준선이 흔들린다 — B17 green 이후를 기준선으로.
2. **wshobson/agents 로컬 clone + NOTICE 초안.** 현재 미clone(`~/git`에 없음) — Wave 1 첫 단계에서 clone·라이선스 고지 선행.
3. **`retrieve.py` tie-break 비결정성 처리 권고(별건 `retrieve-nondeterministic-pack.md`).** Wave 게이트가 "신규 부품이 검색되는가"라 비결정 pack이면 게이트 신뢰 불가. mining-plan도 "Wave 1 착수 전 처리 권고".

→ **판정: Wave 1은 착수 준비 완료(스코프 green)이나 즉시착수 아님.** 위 1·2는 필수 선행, 3은 강한 권고. 1·2 충족 즉시 착수 가능.

## 판정
verdict **apply** — Wave 0(판정·조사)는 완료. 산출: license 5채택 확정 · 스키마 gap **GAP-H(ho:Hook) 1건만 확정**(E 강등·P/O defer) · role 커버리지 규칙 확정(중앙=중립화 전량, 예제 10~20; raw 카탈로그 금지) + 실측 archetype 목록은 Wave 2 첫단계로 이월(코퍼스 미clone 한계) · Wave 1~4 스코프·순서·게이트 확정. **Wave 1 즉시착수 = 조건부 No**(선행 게이트 3). 저작·커밋 없음(다음 배치 land가 커밋).
