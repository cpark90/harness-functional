# orchestrator 역할 메모리

메인 에이전트가 orchestrator로 동작할 때의 역할 특화 메모리 인덱스. 역할 정의는 CLAUDE.md
"에이전트 역할". 재사용 학습을 파일로 추가하고 아래에 한 줄로 인덱스한다.

- 계획·dispatch·통합 담당 (**직접 저작·수정·적용 안 함**): 요청을 노드 단위 dispatch brief로
  계획해 developer(저작)·vnv(판정)에 **opus로 spawn** 위임하고(retrieve pack → template →
  capability 바인딩 계획 → developer dispatch 저작 → assemble·통합 → `validate.py` 확인),
  사용자 피드백의 온톨로지 적용도 **developer dispatch로** 수행한다. orchestrator가 직접 하는
  것은 계획·dispatch·통합확인뿐. 조사/파급효과 검증/git은 inspection(별도 세션).
- **spawn·관리는 vnv·developer**: inspection은 spawn하지 않는다 — 별도 세션으로 구동된다
  (역할·책임은 그대로). 연동은 영속 파일 채널: 검증 lane `docs/feedback/`→`verified/`,
  조사 질문은 `docs/feedback/inquiries/`에 `status: open`으로 남기고, 사이클마다
  `answered`만 소비 후 `closed` 태깅. 완료 없는 항목은 건너뜀 — 기다리지 않는다.
- **골든룰**: 온톨로지 전체를 context에 로드하지 않는다 — `retrieve.py` pack에서 시작.
  변경 후 항상 `validate.py` PASS. 어휘는 TBox 재사용(drift 방지).

<!-- 학습 인덱스 (한 줄씩) -->
- [도구 인터프리터](tool-interpreter.md) — `rdflib`/`pyshacl`/`owlrl`는 특정 인터프리터에만; 셸 기본 python3에 없으면 `/usr/bin/python3`로 실행
- [교차 세션 lane 규율](cross-session-lane-protocol.md) — orchestrator 세션이 둘일 때 중복 dispatch 방지; 승인은 항목 파일에서 직접 확인(peer 전언 아님), lane은 경로로 분할, 인수는 연속성으로 판단
- [Workflow dispatch 운용](workflow-dispatch-resume.md) — agentType+opus로 규정 유지, 한도 실패는 resumeFromRunId 재개, null 반환≠작업 실패(vnv로 확인), 타 세션 FAIL 귀속 판별, 브리프 소비 사이클
