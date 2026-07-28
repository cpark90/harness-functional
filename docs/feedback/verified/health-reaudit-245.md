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

## 적용 계획 (orchestrator → developer dispatch; inspection 범위 밖)
- **대상 파일**: `ONTOLOGYSTYLE.md` §3 (프레디킷 순서). **ontology 그래프 무변경** — validate에
  영향 없음.
- **변경**: §3에 WorkflowStep(및 여력되면 PromptSection·ObservationSpace/AreaOf*) 노드 블록의
  표준 프레디킷 순서를 소절로 추가. 실무 abox가 이미 일관하므로 그 순서를 그대로 기술.
- **검증 게이트**: doc-only라 `validate.py`는 무관하게 PASS 유지. 저작 후 abox 실제 순서와
  문서 순서 1:1 대조(재발 방지 상시 스텝).
- **비고**: ONTOLOGYSTYLE.md는 inspection·developer·orchestrator 중 저작 주체가 명시 안 됨 —
  ontology/ 밖 규범문서이므로 orchestrator가 developer dispatch로 반영하거나, 경미 doc-fix로
  직접 처리 여부는 orchestrator 판단. **inspection은 apply하지 않는다.**

## verdict
`apply-with-changes` — 그래프는 clean(추가 저작 불요), 단일 doc-only 수정(§3 WorkflowStep 블록
명문화)만 후속. non-blocking·저위험. 사용자 승인(inbox status→approved) 후 orchestrator가 적용.
