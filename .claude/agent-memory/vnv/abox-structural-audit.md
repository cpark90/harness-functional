# ABox 정리 감사(구조/행위 클래스) 재현 절차

roles-정리류 "node 병합/삭제 후보 판정" 감사를 non-Role 클래스(Capability/Channel/Workflow/
WorkflowStep/Tool/SystemPrompt/PromptSection/Instruction/Task/Domain/Deliverable/Memory/
ModelConfig/Observation계열/FailurePolicy/TestScenario/Contract/Harness/Constraint)로 확장할 때.

## 핵심 지름길 — orphan은 grep 말고 validate로
- `/usr/bin/python3 tools/validate.py`(기본 python3엔 rdflib 없음) reachability 줄
  `✓ all N individuals reachable from a Harness` = **감사 대상 전 클래스 graph-level orphan 0**의
  authoritative 증거. per-node로 참조 grep 재확인 불필요 — 이 한 줄이 전 클래스 orphan 축을 닫는다.
- duplicate/drift 줄 `✓ no duplicate labels within a class` = 클래스 내 prefLabel 중복 0.

## 카운트·매칭 grep
- 클래스 카운트: `grep -rho "a ho:<Class>\b" ontology/abox/core | wc -l` (+ `-rl`로 파일).
- Capability 매칭(진짜 판정 대상): `grep -rho "providesCapability[^;.]*<cap>\b"` vs
  `requiresCapability` 카운트. 9개 전부 p≥1&r≥1이어야 함. 비-Tool 제공자 정상:
  cap-traceability←gr-traceability(Guardrail), cap-synthesis←role-synthesizer(Role),
  cap-skill←ins-well-formed-skill(Instruction).

## 판정 원칙 (anti-drift FIRST)
- 근접 쌍은 **정의 산문에 판별절이 있으면 KEEP**(의도된 구별). 실측된 의도 구별 3쌍:
  chan-workspace↔chan-task-board(아티팩트 vs task-claiming), fp-dispatch-timeout↔
  fp-agent-failure-retry(침묵 vs 보고된 실패, 정의가 "condition is SILENCE" 명시),
  h-{peer-mesh/workspace-synthesis/harness-factory}(동일 derivedFrom base지만 축 상이 +
  byte-identical materialization 사유가 주석에 명시).
- 3개 carrier harness는 전부 h-multiagent derivedFrom이나 부품을 별도 carrier에 두는 이유는
  h-multiagent CLAUDE.md byte-identity 보존 — 중복 오탐 금지.

## 함정
- **브리프 카운트/파일위치가 stale일 수 있음** — 실측 우선. 이번: SystemPrompt 브리프 7 vs 실측 4,
  Instruction은 guardrails.ttl(system-prompts 아님), Deliverable는 workflows.ttl(domains-tasks 아님),
  FailurePolicy+TestScenario는 verification.ttl.
- **§1c tokenEstimate 스코프**: promptText carrier + Tool/Workflow만. definition-only 노드
  (Capability/Channel/Domain/Task/AoI/ObservationSpace/Contract)는 tokenEstimate 부재가 정론.
  AoO는 tokenEstimate 보유(observedTokenVolume와 분리 목적)라 AoI와 비대칭이나 무해 — [지킴] 위반 아님.
- label-only 노드(seed Capability 5종·Tool·seed Workflow)는 약판별자지만 라벨 자기설명+seed 관례라
  결함 아님, non-blocking flag로만.

→ 리포트: docs/verify/abox-audit-structural.md (redundancy 0/orphan 0, non-blocking flag 3).
