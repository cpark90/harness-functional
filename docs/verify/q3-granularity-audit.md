# Q3 세분화 감사 — abox 잔여 blob(다중책임) 전수 검토

- 판정자: vnv (findings only, 편집 없음)
- 일자: 2026-07-28
- 기준: `ONTOLOGYSTYLE.md §1` [지킴] — "노드는 작고 **단일 책임**. 한 SystemPrompt = 한
  페르소나, 한 Guardrail = 한 정책, 한 Tool = 한 capability. **여러 정책·페르소나를 한
  노드에 섞으면** 재사용·검색·예산이 나빠진다." → DEFECT의 축은 **정의 길이가 아니라
  "분리 가능한 여러 책임을 한 노드에 혼합"** 했는가.
- baseline: `/usr/bin/python3 tools/validate.py` → **PASS** (13 shapes + assemblyOrder/
  capacityFit/registryDrift 초록).

## 재현 절차 (실행 명령)

```
/usr/bin/python3 <scratch>/m3.py   # 전 abox 개체(189개) 정의길이 + 구조분해 실측
/usr/bin/python3 <scratch>/defs.py # blob 후보 정의문 전문 인용
/usr/bin/python3 tools/validate.py # PASS 확인
grep -rniE "roleaspect|rolesection|channelsection|patternstep|modesection|policyclause" ontology/tbox/  # → NONE
```

네임스페이스 주의: 스키마는 `ho: <https://harness-ontology.dev/schema#>`, 개체는
`id: <https://harness-ontology.dev/id/core/>` (w3id 아님 — 잘못된 NS로 필터하면 0건 오탐).
정의 술어는 개체=`skos:definition`, Guardrail 등 promptText-carrier는 `ho:promptText`.

## ★핵심 판별 결과 (구조적)

TBox에 존재하는 **분해용 하위 클래스는 3종뿐**: `Workflow→WorkflowStep`,
`SystemPrompt→PromptSection`, `Harness→AssemblySection`(+ hasRole/hasChannel/hasAgent 등
component 바인딩). `Role`/`Channel`/`DesignPattern`/`ExecutionMode`/`FailurePolicy`/
`Guardrail`에 대한 sub-structure 클래스는 **존재하지 않는다**(grep 확인 = NONE). 따라서
이 6종을 하위 노드로 쪼개려면 **신규 클래스 신설**이 필요한데, 그것은 Golden Rule #2·
`ONTOLOGYSTYLE §1` [지킴]이 금지하는 **근사동의어 클래스 drift**다. 이 카테고리들은
설계상 **원자적(atomic) 어휘 단위**로, 상세 산문 정의가 곧 다중책임이 아니다.

## per-node 표 (정의길이 상위 실측)

| id | len | type | 보유 구조분해 (실측) | 판정 | 근거 |
|---|---|---|---|---|---|
| h-workspace-synthesis | 981 | Harness | hasRole11·hasGuardrail9·hasFailurePolicy6·hasChannel1·hasWorkflow1·usesTool1·hasSystemPrompt1·hasExecutionMode1 | **ACCEPT** | 다중책임이 이미 40여 개 component 노드로 분해·바인딩됨. 정의는 "무엇을 wire 하는지" overview 산문이며 구조와 별개(중복 아님). |
| mode-agent-teams | 914 | ExecutionMode | 없음(분해 클래스 부재) | **ACCEPT** | 단일 실행모드(지속형 peer team) 1개. 길이는 mode-sub-agents 대비 선택기준 + plan/execute 분리 명료화. 분리가능한 2번째 책임 없음. |
| pat-blackboard | 889 | DesignPattern | 없음 | **ACCEPT** | 단일 패턴(공유 store 간접조율). 길이는 orchestrator-workers·peer-mesh·pipeline 대비 판별절. |
| role-coordinator | 860 | Role | 없음 | **ACCEPT** | 단일 책임(조율전용 peer). 길이는 role-orchestrator·role-planner 판별절. |
| role-curator | 858 | Role | 없음 | **ACCEPT** | 단일 책임(기존물 선별·정리). research/author/analyst 판별절. |
| chan-peer | 832 | Channel | 없음 | ACCEPT (opt. TRIM) | 단일 조율 conduit. "pluggable topology dimension" 메타문단이 pat-peer-mesh와 중복 산문 — 선택적 trim 여지(비결함). |
| h-harness-factory | 818 | Harness | hasGuardrail14·hasWorkflow3·usesTool2·hasChannel1·hasFailurePolicy2·hasSystemPrompt1·hasExecutionMode1 | **ACCEPT** | 구조 완전 분해됨. 정의는 meta-harness overview 산문. |
| pat-peer-mesh | 770 | DesignPattern | 없음 | ACCEPT (opt. TRIM) | 단일 패턴(직접 peer mesh). chan-peer와 동일 pluggable-dimension 산문 중복 — 선택적 trim(비결함). |
| h-multiagent | 746 | Harness | hasAssemblySection13·hasRole7·hasAgent5·hasGuardrail18·hasMemory3·hasChannel3·hasWorkflow2·usesTool4·hasSystemPrompt1·hasExecutionMode1 | **ACCEPT** | 최대 분해(AssemblySection 13 포함). 정의는 overview 산문. |
| fp-refer-to-expert | 684 | FailurePolicy | 없음 | **ACCEPT** | 단일 정책(권한 밖 결정 처리). insufficient-input·conflict 판별절. |
| h-peer-mesh | 653 | Harness | hasRole5·hasGuardrail4·hasChannel1·hasWorkflow1·usesTool1·hasSystemPrompt1·hasExecutionMode1 | **ACCEPT** | 구조 분해 보유. overview 산문. |
| wf-harness-evolution / wf-verify-harness / wf-compose-harness | 561/485/416 | Workflow | hasStep 3 / 4 / 7 | **ACCEPT** | Workflow는 이미 WorkflowStep으로 분해(inspection이 wf-compose 7-step화 완료). |
| role-tester/analyst/author/synthesizer/implementer/planner/strategist | 546↓ | Role | 없음 | **ACCEPT** | 각 단일 work-performing 책임 + 상호 판별절. atomic 어휘. |
| chan-workspace / chan-* 나머지 | 585↓ | Channel | 없음 | **ACCEPT** | 각 단일 conduit + dispatch/peer 대비 판별절. |
| pat-expert-pool / pat-* 나머지 | 539↓ | DesignPattern | 없음 | **ACCEPT** | 각 단일 패턴 + supervisor/pipeline 대비 대조절. |

(정의 보유 abox 개체 총 189개 전수 스캔; len<450 잔여는 전부 단일 어휘 개체로 다중책임 징후 없음.)

## gr-design-for-loss 최종 판정 (C-0 재검토)

- 실측: `ho:promptText`(skos:definition 아님) 1개, `ho:tokenEstimate 55`, `maturity "reviewed"`.
  본문: *"Treat message and data loss as a normal event... judge completion by the final
  receiver's confirmation, hold custody until the next stage confirms receipt, report
  cumulative absolute state rather than deltas, and make every loss observable via counters."*
- 판정: **ACCEPT (단일 응집 — C-0 잠정수용 확정)**. 4개 지침(수신확인 완료판정 / custody
  hold / 절대상태 보고 / counter 가시화)은 **"손실 정상화"라는 하나의 doctrine의 상호의존
  facet**이지 분리 바인딩 가능한 별개 정책이 아니다 — 쪼개면 각 조각이 나머지를 전제하여
  응집이 손실된다. 또한 `Guardrail`엔 분해 하위클래스가 없어 분리 시 신규 클래스 drift 유발.
  [지킴] "한 Guardrail = 한 정책" 위반 아님(여러 정책 혼합이 아니라 한 정책의 실행 세목).

## 결론

**세분화는 이미 충분하다 — 분해 불필요 (DECOMPOSE 0건).**

- 정의 길이 상위 노드는 두 부류로 완전 설명된다: (a) **이미 구조 분해된 Harness**(4종 전부
  hasRole/hasAssemblySection/hasGuardrail 등으로 책임을 component 노드에 위임; 긴 정의는
  구조와 별개인 overview 산문), (b) **분해 하위클래스가 없는 원자적 어휘**(Role/Channel/
  Pattern/Mode/FailurePolicy/Guardrail; 긴 정의는 전부 anti-drift 판별절 "Distinguished
  from…"). 어느 쪽도 "분리 가능한 여러 책임을 한 노드에 혼합"에 해당하지 않는다.
- **분해 shape 제안 대상 없음.** 이 카테고리들을 하위 노드로 쪼개려면 신규 클래스 신설이
  필요하고 그것은 anti-drift 위반이므로, 세분화 축은 여기서 종료가 옳다.
- **비결함 선택적 권고 (non-blocking, TRIM만)**: `chan-peer`·`pat-peer-mesh`가 공유하는
  "Coordination topology is a pluggable, extensible dimension…" 메타-아키텍처 문단은
  쌍 간 중복 산문이라 각 노드 본질과 무관한 부분 trim 여지가 있다. 결함 아님(응집·정합성
  무영향), 라우팅 불요. 처리 시 developer dispatch로 산문만 축약(그래프 위상 불변).

## 판정 요약

| 축 | 결과 |
|---|---|
| verification (validate.py PASS) | **PASS** (13 shapes 초록) |
| DECOMPOSE (진짜 다중책임) | **0건** |
| gr-design-for-loss | **ACCEPT** (단일 doctrine, C-0 확정) |
| 선택적 TRIM (비결함) | chan-peer / pat-peer-mesh pluggable-dimension 산문 중복 |
| 종합 | **세분화 이미 충분 — 구조 분해 불필요.** orchestrator 라우팅 불요. |
