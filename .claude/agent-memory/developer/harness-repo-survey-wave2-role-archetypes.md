# harness-repo-survey Wave 2 — external role corpus → neutral archetypes (wshobson + VoltAgent)

**결과: 신규 archetype 0.** 252 고유 role(wshobson 139 + VoltAgent 154 − 41 동명)이 전부 기존
7 중립 archetype + operating role(research/design/synthesizer)에 매핑. 저작·byte 변경·MIT 노드 0.
graph 231 불변. Wave 1(16→1)보다 강한 커버리지 = 커버리지 이미 완결의 증거.

## 왜 0인가 (calibration)
Wave 0가 후보로 든 reviewer·architect·integrator **셋 다 collapse**한다: reviewer→analyst
(진단·severity 랭킹), architect→design(system/architecture 설계), integrator→synthesizer
(cross-check+compile). Wave 0 자신의 후보가 전부 흡수된다는 게 archetype bar가 매우 높다는 신호.
기능 deliverable-type 공간이 이미 10-way partition으로 닫혀 있음: gather(research)/diagnose
(analyst)/write(author)/build(implementer)/plan(planner)/advise(strategist)/test(tester)/
coordinate(coordinator)/design(design)/converge(synthesizer). 새 role은 이 중 조합일 뿐.

## 매핑 규칙 (재사용 — 외부 role 라이브러리 clustering)
- **이름 접미가 도메인 신호**: `-pro`/`-developer`/`-expert`/`-specialist`/`-architect`/`-coder`
  = 언어·프레임워크·인프라 특화 → **implementer**(build)로 collapse (전체의 ~135/252, 과반).
  이건 archetype 아니라 recipe-local 특화. 절대 노드화 금지(catalog-화).
- **analyst 흡수군**(~36): analyst/review/audit/detective/scientist/analysis/validator/judge/
  threat/risk/debugger/reverse-eng/malware. "기존 material 진단+severity 랭킹"이면 analyst.
- **author**(~15): writer/documenter/docs/content/readme/reference/tutorial/marketer/editor.
- **tester**(~9): test/qa/playwright/chaos/penetration = acceptance material 생산.
- **coordinator**(~14): orchestrat/coordinator/organizer/distributor/conductor/context-manager/
  error-coordinator/multi-agent-coordinator = 실행 안 하는 조율 peer.
- **planner**(~5): product-/project-manager/scrum/backlog/roadmap.
- **research**(~7): research/search-specialist/researcher = material GATHER.
- 나머지: design(architect류 다수), strategist(advisor/first-principles/assumption-mapping),
  synthesizer(knowledge-synthesizer). + session-start/session-end/orchestrate/implement/review/
  qa/task-executor 등은 **command/hook**이지 role 아님(Wave 4 hook 재료).

## ★가장 강했던 rejected 후보: operator/reliability (SRE·incident)
incident-responder·devops-troubleshooter·sre-engineer·performance-monitor·error-coordinator
(~8, 양 코퍼스 재발). **그래도 authoring 안 함**: (a) deliverable가 diagnose(analyst)+remediate
(implementer)로 분해됨 — 새 deliverable-type 아니라 두 개의 조합. (b) 변별점(live 프로덕션·urgency·
blast-radius)은 domain/context 특정이지 함수 축 아님. (c) "operator≈running-system-위-implementer"
= 브리프가 금지한 근사동의어 drift. observability-engineer/performance-monitor는 "모니터링을 BUILD"
→ implementer로 명확 collapse. **실파일 frontmatter로 판정**(추측 아님) 후 rejected. orchestrator가
재고하려면 design decision(임의 저작 금지). 교훈: 강한 재발 cluster여도 deliverable-type 분해로 판정.

## byte-identity / gate
저작 0 → 편집 파일 0 → 기존 7 harness 자동 byte-identical(taxonomy도 무변경). validate PASS/231
불변, check_determinism PASS. MIT 귀속 노드 신규 0 → NOTICE VoltAgent 항목 **미추가**(외부 유래
중앙 노드가 생겨야 dct:source/NOTICE; 이번엔 매핑만이라 불필요).

## GAP (orchestrator 확인)
- **"예제 10~20" 소스타입 불일치**: 사용자④의 "예제 10~20"은 harness-100식 **multi-agent 하네스를
  recipe로 import**. 그러나 wshobson/VoltAgent는 **role 라이브러리**(임포트할 하네스 자체 없음).
  → 미저작·플래그. Wave 2 role import 예제는 소스 부재로 실행 불가; 예제 10~20은 harness 코퍼스
  (harness-100류)에서 와야 함. orchestrator가 사용자에게 소스 매칭 확인 필요.
- operator/reliability archetype = needs-decision(위 참조).
