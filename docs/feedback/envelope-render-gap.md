---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/materialize.py, id:as-execution-mode, ho:OperatingEnvelope, ho:AutonomyTier, ho:environmentFidelity]
related: [docs/verify/av-w1-envelope-verify.md, docs/verify/sim-hil-br-recipes-verify.md, docs/feedback/verified/av-odd-scenario-transfer.md]
---
# 결정 요청 — 선언된 envelope·자율성 등급·환경 충실도가 산출 문서에 렌더되지 않는다

**두 번의 독립 판정이 같은 것을 지적했다** (av-w1 note N1, sim-hil-br note N1): 그래프에는
운용 범위(`ho:OperatingEnvelope` + statement)·자율성 등급(`ho:AutonomyTier`)·환경 충실도
(`ho:environmentFidelity`)가 **하네스가 직접 선언한 데이터로 들어가 있는데**, `materialize.py`가
이 술어들을 **참조하지 않아**(렌더 코드 0줄) 산출되는 harness 문서에는 한 줄도 나오지 않는다.

같은 묶음의 부수 증상:
- `id:gr-envelope-check`(범위 검사 규율)가 어느 하네스에도 바인딩되지 않아 문서에 미출현.
- `ho:onEnvelopeExit`로 연결한 실패 정책 행이 Error-handling 표에 뜨지 않음.
- B-R의 `hil-approval` recipe는 자율성 등급·범위·충실도를 **사실대로 선언**했으나, 그 recipe의
  산출 문서를 읽는 사람은 그 사실을 알 수 없다.

## 왜 결정이 필요한가

W1 적용은 **그래프 층위까지만** 승인된 범위였고(사용자 결정 "(B) W1 선행"), 렌더는 W2 이후
묶음이다. 그런데 렌더를 손대면 **기존 하네스의 산출 문서가 바뀐다** — 지금까지 모든 웨이브가
지켜온 byte-identity 회귀 게이트를 한 번 갱신해야 하므로, 조용히 진행할 일이 아니다.

또한 이 상태를 방치하면 이 저장소가 막으려는 것(그래프와 산출물의 drift)을 스스로 만든다:
데이터는 있는데 문서에는 없고, 문서만 읽는 사람에게는 그 규율이 존재하지 않는 것과 같다.

## 선택지

- **(a) 렌더 wave를 지금 편성** (권고) — `materialize.py`에 Operating envelope / Autonomy tier /
  Environment fidelity 항목을 추가하고, 필요하면 `ho:AssemblySection` 개체를 신설해 배치 순서를
  그래프가 결정하게 한다(`id:as-execution-mode` 선례). `gr-envelope-check` 바인딩과
  `onEnvelopeExit` 행의 Error-handling 표 출현도 같은 웨이브에서 정리. 비용: 기존 하네스
  산출물이 1회 변한다(추가만, 삭제 없음) — 회귀 게이트 baseline 갱신 필요.
- **(b) W2 렌더 웨이브에 묶어서 나중에** — AV W2~W5를 착수할 때 함께. 그때까지는 그래프 전용
  데이터로 남는다.
- **(c) 렌더하지 않기로 확정** — envelope·tier·fidelity는 **기계 게이트(SHACL)용 데이터**이고
  사람이 읽는 문서에는 싣지 않는다고 정한다. 그렇게 정하면 두 판정의 note는 결함이 아니라
  설계 결정으로 닫힌다(그 사유를 TBox 정의문에 남긴다).

## 참고

- 렌더 코드의 섹션 문구는 그래프가 아니라 `materialize.py`의 하드코딩 리터럴인 곳이 있다
  (execution mode 섹션 선례) — (a)를 고르면 그 이중 관리 지점도 같이 정리하는 게 좋다.
- 이 항목은 orchestrator가 남긴 결정 요청이다. 승인은 `status`를 `approved`로 고치고 선택지
  하나를 적으면 된다.

## 사용자 피드백
(a)
