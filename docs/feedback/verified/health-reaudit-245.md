---
status: reported
verdict: apply-with-changes    # graph clean; one doc-only fix (§3) for orchestrator→developer
targets: [ONTOLOGYSTYLE.md]
---
# 전면 건전성 재감사 (245 individuals, 2026-07-28)

이전 종합: `full-health-audit-237.md` / `ontology-health-audit.md`. 237→**245**(+8) 성장 후 재감사.
inspection이 편집 없이 `validate.py` + `check_determinism.py` + read-only 프로브로 실측.

## 건전성: 그래프 결함 0
- **validate.py PASS** — SHACL·reachability(245 all reachable)·capabilities·assemblyOrder(13 sections)·
  capacityFit(5 agents, 최대 Inspection 13500/150000)·registryDrift 전부 초록.
- **check_determinism.py PASS** — 요청별 byte-identical pack(json/md).
- **capability 짝**: required distinct 5 / provided distinct 9 — **gap 0**(모든 required 내부 충족).
- **registryDrift**: 28 in-scope instantiated 클래스 전부 INSTANCE_CLASSES 등록. 3 registered-not-
  instantiated(Candidate·Example·HarnessComponent)은 validate가 harmless로 명시.
- **deprecated 노드 0** — 정책([지킴] "제거한다") 준수. deprecated/supersededBy는 산문(gr-traceability·
  wfs 정의) 안에서만 언급되고 그래프 노드로 남지 않음.
- **step* data-flow(Q3 산물) 정합**: `hasStep`/`stepByRole`/`stepUsesTool`/`stepGuardedBy`/
  `stepProduces`/`stepConsumes`/`stepDependsOn`(transitive)/`stepOrder` 모두 TBox 정의 완비
  (harness.ttl; propertyChainAxiom `hasComponent o hasStep o stepProduces`로 Deliverable까지 roll-up).
  abox 실무 순서도 일관(`a→prefLabel→definition→stepByRole→stepUsesTool→stepGuardedBy→
  stepConsumes/stepProduces→stepOrder→tokenEstimate→maturity`). WorkflowStep 8→**17**개로 성장.

## 통일성: 유일 결함군 = 규범문서 doc-lag (그래프 아님, doc-only)
성장분마다 재발하는 패턴(신규 클래스/술어가 ONTOLOGYSTYLE §2/§3에 늦게 실림). 이번 실측:

- **§2 클래스 표 — 이전 237 감사 gap 해소 확인.** 당시 지적한 "Hook 행 없음", "Contract=`contract-`
  인데 실개체 `ct-`"가 **수정됨**. 현재 instantiated ho: leaf 31종 전부 §2 표에 정위치 등재.
- **§3 술어 순서 — WorkflowStep 노드 블록이 통째로 미명문화(잔여 GAP).** §3의 조립 리스트(item 4)
  와 노드 블록 순서 어디에도 `ho:hasStep`(Workflow→WorkflowStep 컨테이너 edge)과 step-내부 술어
  (`stepByRole`/`stepUsesTool`/`stepGuardedBy`/`stepProduces`/`stepConsumes`/`stepDependsOn`/
  `stepOrder`)의 자리가 없다. Q3 분해가 step을 대폭 늘리고 `stepDependsOn`(transitive)+data-flow
  의미를 새로 넣었으므로, §3에 **WorkflowStep 블록 표준 순서**(위 실무 순서)를 명문화해 두면
  재발 gap이 닫힌다. 같은 범주로 PromptSection(`hasSection`/`sectionOrder`)·ObservationSpace/
  AreaOf*(`agentObservation`/`hasAreaOfInterest`/`hasAreaOfObservation`) 내부 블록도 §3 미기재이나
  이들은 Q3 이전부터 있던 저순위 — 이번 우선 대상은 WorkflowStep 블록.

## 적용 계획 (dispatch-ready; orchestrator가 dispatch·apply — inspection 범위 밖)
> inspection은 계획만 준비한다. 실제 dispatch/apply는 orchestrator 소관(developer dispatch로,
> 또는 경미 doc-fix면 orchestrator 직접). **inspection은 apply하지 않는다.**

- **대상 파일**: `ONTOLOGYSTYLE.md` §3 (프레디킷 순서) **단일 파일**. `ontology/`·`tools/` 무변경 →
  `validate.py`에 영향 없음(doc-only).
- **저작 규모**: 삽입 ~2블록(아래 실측 spec 그대로). 신규 판단 없음 — 실무 abox 17 WorkflowStep이
  이미 단일 순서로 일관하므로 그 순서를 문서로 승격하기만 하면 된다.

### 실측 표준 순서 (17/17 WorkflowStep 일관 — 문서에 그대로 옮길 것)
```
id:wfs-…  a ho:WorkflowStep ;
    skos:prefLabel … ;
    skos:definition … ;
    ho:stepByRole …          # 담당 role (harness hasRole의 step-level 대응)
    ho:stepUsesTool …        # (선택) 도구
    ho:stepGuardedBy …       # (선택) guardrail
    ho:stepConsumes …        # (선택) 입력 Deliverable  ┐ data-flow: 입력→출력
    ho:stepProduces …        # (선택) 출력 Deliverable  ┘
    ho:stepDependsOn …       # (선택) 선행 step (transitive; control-flow)
    ho:stepOrder N ; ho:tokenEstimate N ; ho:maturity "…" .
```
컨테이너 edge `ho:hasStep`(Workflow→ordered WorkflowStep)은 Workflow 블록에서 `skos:definition`
뒤·`ho:providesCapability`/`ho:derivedFrom` 앞(=§3 item 4 조립 그룹)에 온다(wf-multiagent 실측).

### §3 삽입 지시 (2군데)
1. **item 4 조립 리스트에 컨테이너 edge 등재**: `ho:hasStep`(Workflow→WorkflowStep)와
   `ho:hasSection`(SystemPrompt→PromptSection)을 "container→ordered-child" edge로 한 줄 명기
   (harness-level 조립 술어 뒤에, 이 둘은 Workflow/SystemPrompt 노드가 자식을 순서지어 묶는 edge).
2. **신규 소절 추가 — "노드-내부 블록 순서(자식 노드)"**: WorkflowStep 블록의 위 표준 순서를
   `[지킴]`으로 기술. 핵심 규칙 3줄: (a) `ho:stepConsumes`→`ho:stepProduces`는 입력→출력
   data-flow 축, (b) `ho:stepDependsOn`은 control-flow 선행(transitive), (c) 순서 키는
   `ho:stepOrder`(정수, 1-base). 데이터 꼬리(`tokenEstimate`→`maturity`)는 §3 item 7과 동일.

### 선택 확장(같은 범주 저순위 — orchestrator 판단으로 같은 커밋에 번들 가능)
PromptSection(`ho:hasSection`/`ho:sectionOrder`/`ho:sectionKind`)·ObservationSpace·AreaOfInterest/
AreaOfObservation 내부 블록도 §3 미기재. 이번 우선 대상은 WorkflowStep이나, 재발 gap을 한 번에
닫으려면 orchestrator가 이들 블록 순서도 같은 소절에 함께 명문화할 수 있다(실측 순서는 developer가
`grep 'a ho:PromptSection'` 등으로 확인해 미러).

### 검증 게이트 (반영 후 inspection)
- doc-only라 `validate.py`는 무관하게 **PASS 유지**(그래프 무변경 확인).
- **1:1 대조**: 문서에 적은 순서 vs abox 실제 순서 — WorkflowStep 17개 전수가 문서 순서와
  일치해야(재발 방지 상시 스텝). 불일치 발견 시 문서(abox가 정답)를 정정.
- 반영되면 이 리포트 + `ontology-health-audit.md`(§3 축 공유)를 refresh 대상으로 전환.

## verdict
`apply-with-changes` — 그래프는 clean(추가 저작 불요), 단일 doc-only 수정(§3 WorkflowStep 블록
명문화)만 후속. non-blocking·저위험. 사용자 승인(inbox status→approved) 후 orchestrator가 적용.
