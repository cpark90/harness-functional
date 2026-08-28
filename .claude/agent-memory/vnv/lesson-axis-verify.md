# lesson(시행착오 학습) 축 검증 재현 절차

"X를 학습·기록한다"류 규율 축(클래스 신설 없이 Concept+Guardrail+Step+FP+Memory 보강으로
반영) 웨이브의 판정법. 리포트: docs/verify/lesson-axis-verify.md (PASS+N1~N4).

- **TBox 미확장 사유 판정 2요건**: (a) 명시성 — 해당 절 주석에 "considered and rejected"
  급 기록이 실제 있는가(guardrails.ttl 절 주석), (b) 수용성 — 요구의 구조 요소를 전수
  열거해 기존 어휘 매핑표가 닫히는가 + 잔여 미표현분이 사유가 배제한 바로 그 데이터
  (run-인스턴스)인가. 둘 다 성립해야 coverage 게이트 통과.
- **carrier 배선 사유는 그래프 사실로 검증**: "durable store 보유 harness에만 묶는다"
  주장은 `grep hasMemory harnesses.ttl`로 h-multiagent 유일임을 확인해 닫음 — 미배선 6개
  harness의 정당성도 같은 한 방으로. byte-identity 관례 예외(h-multiagent 산출 변경)는
  주석에 의도 명시가 있으면 결함 아님.
- **변별 판정은 emit 여부로 층위 구분**: 같은 클래스 near-node(gr↔gr, fp↔fp)는 promptText/
  definition 안 명시 Distinct-from 요구; 클래스가 다른 겹침(guardrail↔roleMemoryPolicy
  리터럴)은 주석 변별로도 비차단(N2). step의 산문("durable store")이 참조하는 기판이
  roll-up 대상 harness에 없는 cross-carrier는 선례상 비차단(N1, wfs-audit 선례).
- **tokenEstimate 최근 관례 = chars//4 정확 일치**(promptText 있으면 promptText, 없으면
  definition). 이번 웨이브 7노드 전부 declared==chars//4라 스팟체크가 산술 대조로 끝남.
  Concept은 tokenEstimate·maturity 둘 다 없음이 §1c 정상.
- **retrieve seeds JSON = [{label,score}] (id 없음)** — id로 파싱하면 AttributeError.
  발견성은 top seed 라벨로 판정; budget_used 899/900은 절단 아님(skip-not-break).
- dangling id: 전수 스캔 시 주석 glob(`id:ct-…-*`)이 오탐으로 잡힘 — `*` 직전 토큰은
  선언부 존재로 재확인.
- Deliverable 미신설류 "다른 step도 안 쓴다" 사유는 그 워크플로의 전 step에서
  stepProduces/stepConsumes 부재를 실제 확인해 닫는다.
