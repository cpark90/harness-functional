# Q3 세분화 감사 (blob 다중책임 판정) 재현 절차

목표: abox 긴-정의 노드가 진짜 다중책임(DECOMPOSE)인지 단일응집(ACCEPT)/산문만(TRIM)인지.

## ★판별 축 = 길이 아님, "여러 책임 혼합"인가 (ONTOLOGYSTYLE §1 [지킴])
[지킴] 원문: "한 SystemPrompt=한 페르소나, 한 Guardrail=한 정책, 한 Tool=한 capability.
**여러 정책·페르소나를 한 노드에 섞으면** 나쁘다." → DEFECT 축은 정의 길이가 아니라 혼합.

## 실측 함정
- 네임스페이스: schema=`https://harness-ontology.dev/schema#`, 개체=`.../id/core/`
  (**w3id 아님** — 잘못 쓰면 개체 0건 오탐). 정의술어: 개체 skos:definition, guardrail 등
  promptText-carrier는 ho:promptText.
- rdflib는 `/usr/bin/python3`만.
- 개체만 필터: rdf:type이 OWL.Class/ObjectProperty 등 TBox면 skip(TBox도 skos:definition 보유).

## ★구조적 결론 (재사용): 분해 하위클래스는 3종뿐
TBox 분해 클래스 = WorkflowStep / PromptSection / AssemblySection 만 존재. **Role/Channel/
DesignPattern/ExecutionMode/FailurePolicy/Guardrail엔 sub-structure 클래스 없음**
(`grep -niE roleaspect|channelsection|patternstep... ontology/tbox/` = NONE). ⇒ 이들을
쪼개려면 신규클래스 신설 = anti-drift(Golden Rule#2) 위반. 원자적 어휘라 긴 정의=단일응집.

## 판정 결과 (2026-07-28)
- DECOMPOSE 0건. 세분화 이미 충분.
- Harness 4종(h-workspace-synthesis981/h-harness-factory818/h-multiagent746/h-peer-mesh653)
  = 이미 hasRole/hasAssemblySection/hasGuardrail로 책임 위임 완료, 긴 정의=overview 산문(ACCEPT).
- 비-Harness 상위(mode-agent-teams/pat-blackboard/role-coordinator/role-curator/chan-peer/
  pat-peer-mesh/fp-refer-to-expert...) = 전부 단일개념 + "Distinguished from" 판별절(ACCEPT).
- gr-design-for-loss = 4 facet(수신확인/custody/절대상태/counter)은 "손실정상화" 단일 doctrine의
  상호의존 세목, 분리 시 응집손실 → ACCEPT (C-0 확정). Guardrail엔 분해클래스도 없음.
- 선택적 TRIM(비결함): chan-peer↔pat-peer-mesh 공유 "pluggable topology dimension" 메타산문 중복.
→ docs/verify/q3-granularity-audit.md
