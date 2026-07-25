# harness-repo-survey Wave 0 — coverage-audit 대조 (2026-07-25)

읽기전용 커버리지 감사 산출(`docs/feedback/verified/harness-repo-survey-wave0.md`).
그래프 @226 individuals 실측. 재사용 지식만 여기 남긴다(리포트 본문은 그 파일이 원본).

## 스키마 gap 재판정 — 4건 중 확정은 1건뿐
CLAUDE.md step-7(범주 부재 → skip 금지, TBox 확장 우선)을 그래프 실측으로 적용한 결과:
- **GAP-H (ho:Hook / lifecycle trigger) = 확정 TBox gap.** `grep Hook|hookEvent ontology/tbox/` = 0.
  `ho:Guardrail`(정책)·`ho:WorkflowStep`(절차) 어느 쪽도 "이벤트 발생 시 실행"(SessionStart/
  PostToolUse/Stop) 트리거 축을 못 담음. 부모 후보 = `ho:BehavioralComponent` vs
  `ho:ProcessComponent`(중간 superclass 9개는 `tbox/harness.ttl:45~85`), Wave 4에서 확정.
- **GAP-E (다중 타깃 emit) = 강등(tools-only).** `materialize.py`는 이미 다중 타깃 emit(CLAUDE 섹션
  +MANIFEST+`.claude/agents/<role>.md`+channel+skill, `materialize.py:271~278`). 부품 트리플 불변,
  필요 시 렌더러 추가일 뿐 = schema gap 아님.
- **GAP-P (permissions veto) / GAP-O (operator tracing) = 부분 표현 → defer(needs-decision).**
  P는 `gr-least-privilege`+`c-least-privilege`+`gr-execution-separation`+`roleTool`로 정책축 표현됨
  (미표현=런타임 interception). O는 `c-traceability`+`gr-traceability`+audit-write step으로 규율 표현됨,
  단 우리 ObservationSpace/AoI/AoO는 "에이전트가 뭘 보나"·observability는 "운영자가 실행을 추적"
  = 같은 단어 반대 방향 → 신규 1급 범주 아니라 `disambiguation-audit`의 연장으로 처리.
- **교훈**: "gap"은 companion 문서를 믿지 말고 현행 그래프에 재실측할 것 — 4건 중 3건이 이미
  부분/완전 표현되어 있었다(강등·defer). 확정 gap만 강행 저작 대상.

## role 커버리지 — 사용자 ④의 상한 이동
- 중앙 15 `ho:Role` = 운영 9(orchestrator/inspection/inspection-worker/developer/vnv/research/
  design/synthesizer/coordinator) + 중립 기능 6(analyst/author/implementer/planner/strategist/tester).
- 외부 "350여"는 경로중복 포함치. 이름기준 고유 = **253**(VoltAgent 155 + wshobson 139 − 동명 41).
  동명 41(code-reviewer·data-engineer 등)은 병합 대상.
- **사용자 ④ = cap을 온톨로지→예제로 이동**: 원안 "중앙 원형 10~20 cap"을 사용자가
  "온톨로지엔 전량, 예제(recipe)를 10~20으로 압축"으로 바꿈. 단 **온톨로지 전량 = raw 253 아니라
  중립화 archetype 전량**(언어·프레임워크 접미 제거·동명 병합). raw 카탈로그화는 §neutral-parts-library
  +골든룰2(near-synonym 금지) 위반 = 저장소가 에이전트 카탈로그로 변질되는 위험.
- **실측 한계**: 외부 코퍼스가 `~/git`에 미clone → archetype 클러스터 실측목록은 Wave 0에서 산출 불가,
  Wave 2 첫 단계(파일 open)로 정직하게 이월. Wave 0가 확정하는 건 **분류 규칙**뿐.

## Wave 1~4 스코프·선행
- 순서 1(pattern/mode, wshobson orchestrators)→2(role 원형, VoltAgent+wshobson)→3(guardrail/skill
  dedup, toolkit+agent-rules-books)→4(ho:Hook TBox 세트). Wave 4(TBox)가 마지막.
- **inc4 importer `tools/import_corpus.py`(33KB) 이미 존재·검증됨** = Wave 2 role 경로 재사용처,
  mining-plan의 "inc4 선행"은 해소됨.
- agent-rules-books는 사용자 ③으로 **온톨로지에만**(recipe emit 제외), 문구복사 금지·취지만 중립화.
- **Wave 1 즉시착수 = 조건부 No**: 선행 3 = ①B17 land+validate(기준선 안정) ②wshobson clone+NOTICE
  ③retrieve tie-break 비결정성(별건 `retrieve-nondeterministic-pack.md`, 게이트가 "신규 검색되나"라 필수).

## land 메모
Wave 0 리포트는 읽기전용 산출(저작 0). B17과 무간섭(읽기만). 커밋은 리포트+OPEN-ISSUES 갱신+이 메모리.
