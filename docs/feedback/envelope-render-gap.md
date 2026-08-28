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

## 적용 결과 (orchestrator, 2026-08-28)

**(a) 렌더 wave 편성 — 완료.** developer dispatch로 적용, 게이트 3종 PASS(중앙 + recipe union 3종).

- **렌더**: `_render_operating_rules` 뒤에 조건부 companion 3개 — `## Operating envelope`(정의문 +
  default posture + on-range-exit + statement 표) / `## Autonomy tier`(정의문 + 5슬롯) /
  `## Environment fidelity`. 선언이 없으면 아무것도 emit하지 않는다.
- **statement 표 칼럼** = `Attribute | Verdict | Boundary | Decided by`. 뺀 것: `envelopeValueType`
  (threshold가 자체 설명적)·`envelopeClosure`(default 줄이 posture를 이미 서술)·statement
  prefLabel(중복)·내부 메타. `hasEnvelopeRule`은 **데이터가 0건이지만 렌더 경로를 구현**해 뒀다
  (선언 데이터가 조용히 누락되는 이번 버그 클래스의 재발 방지).
- **`(see Error handling)` 포인터는 exit 행이 그 하네스의 `hasFailurePolicy`에 실제 등재된
  경우에만** 출력 — 무조건 출력하면 dangling 참조가 된다.
- **그래프 바인딩**: `h-coding`·`h-multiagent`에 `gr-envelope-check` + `fp-envelope-exit`/`-severe`
  등재. 두 술어의 비중복을 주석으로 명문화 — "onEnvelopeExit는 exit이 탈 정책을 **지정**,
  hasFailurePolicy는 하네스 오류 카탈로그에 **등재**한다".
- **회귀(이번 웨이브의 갱신된 게이트)**: envelope 선언 하네스 `h-coding` +38 / `h-multiagent` +31,
  **CLAUDE.md 삭제·수정 0(순수 추가)**. 미선언 하네스 5종은 전 파일 **byte-identical**(조건부
  섹션의 증명). staging recipe는 `h-eval-user-sim`·`h-coding-swe`·`h-swe-baseline`이 fidelity
  블록만 +6/−0이고, **`h-hil-approval`은 +32/−0**(envelope + tier + fidelity를 모두 선언하므로) —
  최초 기록의 "staging 3종 +6/−0"은 부정확했다(vnv note N4로 지적되어 정정). MANIFEST의 `−1`은
  tokenEstimate 합계 한 줄로 구조적 필연. materialize 2회 결정성 유지, dangling `id:` 0.

### AssemblySection을 신설하지 않은 사유 (orchestrator 확인)

`ho:sectionKind`가 shapes의 **닫힌 `sh:in` enum**이라 신규 kind는 shapes 변경을 요구하는데, 그것은
이번 브리프의 금지 경계였다. 그래서 무조건부 섹션 `as-operating-rules`가 cluster를 위치시키고,
그 정의문에 companion 구성·enum 제약·"향후 1급 kind 승격은 byte-identical refactor"를 기록했다.
의미상으로도 envelope/tier/fidelity는 하네스가 **운용되는 규칙**이라 Operating rules 뒤가 정합적.

**orchestrator 판단**: 승인된 의도(선언된 데이터가 문서에 보이게 한다)는 이 형태로 충족됐으므로
**1급 sectionKind 승격은 지금 하지 않는다**. 승격은 shapes enum 확장 + AssemblySection 개체
신설을 요구하는 별도 설계 결정이고, 산출물은 동일하다(byte-identical refactor). 필요해지면 그때
결정 항목으로 올린다.

### 미해결(발견만, 이번 범위 밖)

- 섹션 lead-in 문장이 코드 리터럴인 렌더러가 execution-mode 외에도 다수(error-handling·
  test-scenarios·hooks·data-flow·roles·channels·skills). 이번 companion들도 lead-in은 관례를 따랐고
  본문 데이터는 그래프 출처다.
- `h-hil-approval`(staging)은 envelope을 선언하지만 `gr-envelope-check` 미바인딩·exit 행 미등재 —
  렌더러가 포인터를 생략해 진실을 유지한다. recipe 갱신은 staging 경계라 별도.
