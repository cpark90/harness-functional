# Workflow 기반 dispatch 운용 (ultracode) — 한도·병행 세션 대응

- **Workflow 도구로 developer/vnv를 오케스트레이션할 때**: `agent(brief, {agentType:
  'developer'|'vnv', model: 'opus'})`로 CLAUDE.md의 opus dispatch 규정을 유지한다. wave 간
  barrier는 공유 파일(tbox/shapes/ONTOLOGYSTYLE) 동시 편집 회피가 근거일 때만 둔다.
- **opus 세션 한도로 dispatch가 죽으면**: 실패 메시지의 리셋 시각을 확인하고, 리셋 후
  `Workflow({scriptPath, resumeFromRunId})`로 **같은 run을 재개**한다 — 완료분은 캐시
  재생, 실패분만 재실행. 리셋 시각이 이미 지났으면 즉시 재개.
- **developer의 구조화 반환(StructuredOutput)만 실패해도 작업은 land됐을 수 있다** —
  null 결과를 실패로 단정하지 말고 vnv 판정·디스크 상태로 확인한다 (실례: memory
  writeTiming dev — 반환 실패, 구현은 vnv pass).
- **멀티 세션 워킹트리에서 validate FAIL이 나면**: focus node가 HEAD-absent + 내 dispatch
  범위 밖이면 타 세션의 작업 중(예: guardrail 신설 후 harness 배선 전) 상태다 — 고치지
  말고 기록만, 잠시 후 재확인하면 대개 해소. vnv 격리 비교는 HEAD worktree + 대상 파일만
  overlay 방식이 정확하다.
- **진행 중인 wave를 중간 상태로 진단하지 말 것 (중복 dispatch 방지)**: 내가 띄운 workflow가
  아직 도는 동안 `validate.py` FAIL을 보고 보정 dispatch를 띄웠더니, 그 사이 wave의 다음
  stage가 같은 곳을 채워 **동일 작업 2중 dispatch**가 됐다(AV W1 registry 3중 등록). 원칙:
  wave 내부의 결함은 **그 wave의 vnv 게이트가 판정한 뒤** 보정한다. 정말 급하면 보정 브리프에
  "이미 채워져 있으면 편집하지 말고 검증으로 전환하라"를 넣는다(그 지시 덕에 실제로 churn 0로
  끝났다).
- **여러 wave를 병행할 때 파일 충돌 경계**: TBox/shapes/ONTOLOGYSTYLE/tools는 wave 간 공유
  자원이다. 다음 wave가 같은 파일을 건드리면 **앞 wave의 vnv 판정이 끝난 뒤** 띄운다
  (예: sim-hil B-T는 av-w1 게이트 통과 후). abox는 파일 단위로 갈라 병행 가능.
- **브리프 소비 사이클**: inquiries의 dispatch-ready 초안(answered)을 채택해 dispatch →
  적용 결과를 verified 보고서 기록란에 → 브리프 status를 closed로. 사용자 결정(예:
  cap 130–260 token)이 초안과 다르면 브리프 문면보다 우선함을 dispatch prompt에 명시.
