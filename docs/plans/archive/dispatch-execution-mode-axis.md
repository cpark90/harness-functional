# Dispatch brief — execution-mode를 Harness의 1급 속성으로 일반화 (TBox 확장 승인건)

> 작성: orchestrator (2026-07-24). 사용자 지시: "revfactory에 있는 개념이지만 **확장성 있게** 적용해서
> **하네스의 한 속성으로** 반영". 소스 근거: `docs/feedback/revfactory-harness/delta-inventory.md §A1`
> (원래 권고안 = 별도 클래스; Wave A가 D2 경량화로 DesignPattern에 실었던 것을 이번에 되돌린다).
> 실행: **developer dispatch (opus)**. 선행: GAP-3/4/5 증분 완료(미커밋, validate PASS @202).

## 왜 바꾸는가 (문제)
현재 실행 topology 축이 `pat-agent-teams`/`pat-sub-agents`/`pat-hybrid` **DesignPattern**으로 표현돼 있어
`ho:appliesPattern` 한 프로퍼티가 **직교하는 두 축**(아키텍처 패턴 + 실행 topology)을 같이 싣는다. 구분하려면
`c-execution-mode` 태그를 조인해야 하고, "이 하네스의 실행모드는?"을 **직접 질의할 수 없다**. 게다가 채택한
하네스가 0이라 축 자체가 inert다(materialize의 execution-mode 섹션이 영원히 미출력).

## 설계 (orchestrator 확정 — 이대로 구현)
**확장성의 정의**: 모드는 **개체(individual)로 열거**한다. 새 실행모드 추가 = **개체 1개 추가**로 끝나고
**스키마·shape 변경이 필요 없다**. (닫힌 문자열 enum + `sh:in`으로 만들면 모드마다 shape를 고쳐야 하므로 금지.)

### 1. TBox (`ontology/tbox/harness.ttl`) — **이번 dispatch에 한해 확장 승인**
- `ho:ExecutionMode a owl:Class ; rdfs:subClassOf ho:SpecConcept` — `DesignPattern`·`Constraint`와 형제
  (비-component SpecConcept). `rdfs:label` + `skos:definition`(왜 존재하나: 아키텍처 패턴과 **직교**하는 런타임
  coordination topology 축이며, 확장은 개체 추가로 한다).
- `ho:hasExecutionMode a owl:ObjectProperty ; rdfs:domain ho:Harness ; rdfs:range ho:ExecutionMode`.
  주변 프로퍼티 선언 스타일을 그대로 따른다.
- **`ho:stepExecutionMode`는 이번에 만들지 않는다** — 소비자가 없는 어휘를 미리 만들지 않는다(YAGNI,
  ONTOLOGYSTYLE 1c). hybrid의 phase별 세분은 **후속 확장점**으로 definition에 한 줄만 남긴다.

### 2. shapes (`ontology/shapes/harness-shapes.ttl`)
- `ho:EdgeTypingShape`에 `sh:property [ sh:path ho:hasExecutionMode ; sh:class ho:ExecutionMode ]` 추가
  (기존 `appliesPattern` 줄 옆, 같은 형식).

### 3. ABox 개체 — `ontology/abox/core/spec/` (SpecConcept의 자리)
`mode-` 접두사(ONTOLOGYSTYLE §2 표에 이 접두사 **행 추가**도 당신 담당):
- `id:mode-agent-teams` — peer agent-team이 함께 돌며 그룹으로 협조.
- `id:mode-sub-agents` — lead가 짧은-생애 sub-agent를 소환·회수.
- `id:mode-hybrid` — phase에 따라 topology가 바뀜.
각 개체: prefLabel(유일)·definition(**언제 이 모드를 고르나**)·`ho:tagged id:c-execution-mode`·tokenEstimate·
`ho:maturity "draft"`. **기존 `pat-*` 3개의 definition 문구를 재활용**하되 ExecutionMode 관점으로 다듬는다.
파일은 기존 `spec/` unit에 **co-locate 우선**(신규 unit이면 root imports+catalog+recipe catalog까지 필요 —
불가피할 때만, 그 경우 A의 `verification.ttl` 선례를 그대로 따르고 보고하라).

### 4. 구축(migration) — 옛 표현 폐기
- `pat-agent-teams`·`pat-sub-agents`·`pat-hybrid`는 **삭제하지 말고** `ho:maturity "deprecated"`로 내린다
  (ONTOLOGYSTYLE §2 "[지킴] ID는 재사용하지 않는다. 폐기 노드는 삭제 대신 deprecated"). `tagged` 유지 →
  orphan 아님. definition 끝에 "superseded by id:mode-… (execution mode is now a first-class Harness property)"
  한 문장 추가.
- `id:c-execution-mode`의 `skos:definition`이 "**tag the DesignPatterns** that select how agents are spawned…"
  이라 stale — ExecutionMode 개체를 가리키도록 정정.

### 5. 하네스 선언 (= "하네스의 한 속성으로 반영"의 실체)
각 중앙 하네스의 **자기 definition·채널·role 구성을 읽고** 사실에 맞는 모드를 `ho:hasExecutionMode`로 선언하라.
orchestrator의 기본 판단(반증되면 근거와 함께 바꿔도 좋다):
- `id:h-multiagent` → `id:mode-sub-agents` (orchestrator가 worker를 dispatch·회수하는 구조)
- `id:h-peer-mesh` → `id:mode-agent-teams` (peer가 `chan-peer`로 직접 협조)
- `id:h-harness-factory` → 자기 구성에 근거해 판단(h-multiagent 파생이나 inspection이 별도 세션인 점 고려)
나머지 단일 에이전트 하네스(`h-coding`/`h-research`/`h-support`)는 multiagent가 아니므로 **선언하지 않는다**
(속성은 선택적 — 모든 하네스가 가질 필요 없다).

### 6. tools
- `tools/materialize.py`: execution-mode 렌더러를 `appliesPattern ∩ tagged c-execution-mode` →
  **`ho:hasExecutionMode` 읽기**로 교체. 부품 없으면 무출력(조건부 패턴 유지).
- `tools/ontology_lib.py`: `INSTANCE_LINK_PREDICATES`에 `HO.hasExecutionMode` 추가.
  (`EXECUTION_MODE_CONCEPT` 상수가 더 이상 안 쓰이면 정리.)

### 7. 문서
- `ONTOLOGYSTYLE.md §2` 네이밍 표에 `ExecutionMode | mode- | id:mode-sub-agents` 행 추가.

## ★예상되는 문서 변경 (이번엔 정상)
이 증분은 `h-multiagent`·`h-peer-mesh`(·factory)의 materialized CLAUDE.md에 **`## Execution mode` 섹션을 추가**한다.
사용자가 "하네스의 속성으로 반영"을 지시했으므로 **의도된 변경**이다. 단 **그 섹션 외의 줄이 하나라도 바뀌면 회귀**이니
diff를 그대로 보고하라. 기준선: `/tmp/claude-1000/-home-cpark-git-harness-ontology/3c05e966-f838-4522-adda-260d6a946f76/scratchpad/final2/CLAUDE.md`(h-multiagent 현재).

## 완료 게이트
```bash
/usr/bin/python3 tools/validate.py     # PASS. 개체 202 + 신규 mode 3 = 205
/usr/bin/python3 tools/retrieve.py "what execution topology does this harness run in"
/usr/bin/python3 tools/materialize.py h-multiagent ...   # Execution mode 섹션만 추가, 2회 결정성 diff 0
```
**확장성 자기검증**: "새 모드 하나를 추가한다면 무엇을 고쳐야 하는가"에 답하라 — 답이 "개체 1개 추가"가
아니면 설계가 틀린 것이다(shape·enum을 고쳐야 한다면 되돌려라).

## 금지
- git 조작(inspection 소관). 이 브리프가 명시한 것 밖의 TBox·shape 변경. 어휘 발명(위 3개 외 신규 클래스·프로퍼티 0).
- `docs/feedback/**` 편집.

## 반환 보고
① TBox/shape 변경 diff ② 신규 개체 3 + 하네스 선언(어느 하네스에 어느 모드를, **근거**) ③ deprecated 처리한 pat-* 3
④ CLAUDE.md diff(Execution mode 섹션만인지) ⑤ validate·retrieve 로그 ⑥ 확장성 자기검증 답 ⑦ GAP.

---

# 실행 결과 (2026-07-24, developer dispatch 완료 · orchestrator 독립검증)

**`validate.py` PASS @205** (202→205, 신규 모드 3). 선행 증분은 inspection이 `c2b7e47`로 land 완료.

## orchestrator 독립검증
- **TBox 신규 선언 정확히 2개**: `ho:ExecutionMode`(⊑`ho:SpecConcept`) · `ho:hasExecutionMode`. 그 외 발명 0.
- **확장성의 구조적 근거 확인**: shape는 `sh:class ho:ExecutionMode`이고 **신규 `sh:in` 0**. 렌더러 diff에
  **특정 모드 IRI 하드코딩 0**(프로퍼티만 읽음). ⇒ 새 모드 = 개체 1개, 스키마·shape·tools 무변경이 성립.
- **회귀 0**: `h-multiagent` CLAUDE.md 삭제·변경 줄 **0**, `## Execution mode` 헤딩만 추가. MANIFEST는 선언 하네스
  **4개 모두** byte-identical(모드는 컴포넌트가 아니라 `all_components`·tokenEstimate 불변).
- tools 변경분의 모든 `HO.*`가 TBox 실재.

> **문서 영향 정정 (inspection 지적 반영, 2026-07-25)**: 이 절 최초 작성 시점에는 신규 선언 하네스가 3개였으나,
> 이후 GAP-b 종결로 `h-workspace-synthesis`가 추가돼 **최종 선언 4개**(h-multiagent·h-workspace-synthesis=sub-agents,
> h-peer-mesh=agent-teams, h-harness-factory=hybrid), **CLAUDE.md 신규 섹션이 붙은 하네스도 4개**다.
> 위 「선언 결과」표와 GAP-b 판정은 이미 최종 상태로 갱신돼 있다.

## 선언 결과
| harness | mode | 근거 |
|---|---|---|
| `h-multiagent` | `mode-sub-agents` | orchestrator가 brief를 dispatch·회수; `chan-dispatch`가 "spawn/return of the subagent invocation" |
| `h-peer-mesh` | `mode-agent-teams` | peer가 `chan-peer`로 직접 협조, 중앙 dispatcher 없음 |
| `h-harness-factory` | `mode-hybrid` | 저작은 dispatch, 검증·진화는 `chan-task-board` 상주 팀 — phase별로 topology가 다름 |
| `h-workspace-synthesis` | `mode-sub-agents` | **사용자 지시로 후속 선언(GAP-b 종결)**. 근거: `derivedFrom h-multiagent`(=sub-agents) + `hasWorkflow wf-multiagent` + `role-synthesizer` definition의 "dispatch-invoked only" |
| `h-coding`/`h-research`/`h-support` | 미선언 | 단일 에이전트 |

## GAP 판정
- **GAP-a (`INSTANCE_CLASSES`에 `HO.ExecutionMode` 등록) → 승인.** `ExecutionMode`는 ⊑HarnessComponent가 아니라
  HC fallback이 없어, 미등록이면 mode-* 개체가 `instance_nodes`에서 증발해 카운트·reachability·retrieve에서 사라진다.
  브리프의 205 게이트가 사실상 이를 요구했으므로 §6 밖이지만 **불가피한 필수 변경**이 맞다.
- **GAP-b (`h-workspace-synthesis`) → 종결: `mode-sub-agents` 선언.** 사용자 지시로 재검토한 결과 **근거가 있었다**.
  developer가 "topology-중립"으로 본 것은 `chan-workspace`, 즉 **전달 매체 축**이며 **spawn topology 축과 직교**하므로
  채널의 중립성이 모드 미결정을 함의하지 않는다. 판정 근거(전부 그래프 실재): ① `derivedFrom h-multiagent`(=sub-agents)
  ② `hasWorkflow wf-multiagent` ③ `role-synthesizer` definition의 **"dispatch-invoked only"**. 반증 검토: `agent-teams`는
  "peer가 이름으로 메시징 + lead가 개별 spawn·회수하지 않음"이라 해당 없고, `hybrid`는 phase 변화 증거 없음.
  ⇒ 트리플 1줄 추가, 신규 개체 0(205 유지). **일반 원칙은 유지**: `hasExecutionMode`는 선택적 속성이고 단일 에이전트
  하네스(`h-coding`/`h-research`/`h-support`)는 계속 미선언(섹션 미출력 확인).
- **GAP-c (`retrieve.PREDICATE_WEIGHT` 미등록) → 보류.** 현재 검색 품질 충분(mode 3종 rel 3.6). 소비자 없는 튜닝은 하지 않는다.

## 잔여
git land는 **inspection 세션** 소관(이 증분 미커밋).
