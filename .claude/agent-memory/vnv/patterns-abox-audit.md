# DesignPattern/ExecutionMode/AssemblySection abox 정리 감사 재현 절차

리포트: `docs/verify/abox-audit-patterns.md`. findings only(편집 금지).

## 핵심 함정·기법
- **predicate vs prose grep**: 단순 `grep id:pat-…`는 부풀려짐 — `skos:definition` 산문이
  다른 패턴 id를 대량 인용(peer-mesh 정의가 orchestrator-workers 등을 대조로 언급). 참조
  카운트는 **predicate 접두 매칭**만: `grep -rhE "(appliesPattern|hasExecutionMode|hasAssemblySection)[^.;]*(id:|core:)<id>\b"`.
- **양-repo 스캔 필수**: 중앙 bind 0이어도 recipes(`harness-recipes/recipes/`)가 소비하면
  orphan 아님. 실증: pat-pipeline central=0인데 recipe appliesPattern 27개. mode-agent-teams
  recipe 35. 반드시 두 경로 다 grep.
- **catalog stock ≠ orphan**: bind 0/0이라도 `ho:tagged c-pattern-taxonomy`(→broader
  c-multiagent)로 Harness reachable(validate PASS). "neutral parts library" 원칙 = 미소비
  재고는 정상(fanout-fanin/expert-pool/producer-reviewer/supervisor/hierarchical-delegation/
  blackboard 6개). 삭제 권고 금지.
- **deprecated 묘비**: pat-agent-teams/sub-agents/hybrid = mode-* 3개로 supersede됨(병합이
  deprecation으로 이미 기록). ID 재사용 금지 + c-execution-mode 태그로 reachable → KEEP,
  재병합·삭제 아님.
- **axis-orthogonality = anti-drift FIRST**: peer-mesh(DesignPattern, 통신 topology) vs
  mode-agent-teams(ExecutionMode, spawn lifecycle)는 의도된 직교. 증명: TBox harness.ttl:253이
  orthogonality 명시("conflate 금지") + `h-peer-mesh`가 두 축 동시 바인딩. 진짜 중복 아님.
- **AssemblySection order**: 다줄 목록(harnesses.ttl:117-119, h-multiagent가 13개 전부)이라
  predicate 줄 grep은 4개만 잡음 — validate "13 sections/total assembly order"로 실제 확인.
  order 1..13 연속·유일, sectionKind TBox closed set과 1:1.
- **near-synonym 판정 3등급**: (A) 정의에 명시 "Contrast/Distinct id:…" 있으면 KEEP(supervisor/
  blackboard). (B) 구분축은 있으나 상호 cross-ref 없으면 KEEP-but-clarify(fanout-fanin↔orch-workers,
  expert-pool↔supervisor, producer-reviewer↔reflection) → non-blocking 정의보강 권고, MERGE 아님.
- **tokenEstimate**: DesignPattern은 definition-only라 §1c 범위 밖(부재 정상). ExecutionMode/
  AssemblySection은 보유. 위반 아님.
