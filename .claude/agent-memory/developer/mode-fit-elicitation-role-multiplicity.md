# Online-agent 축 2차 — mode 선택 규칙 / 사용자 역조사 / 동일 role 동시작업

축의 **포지션**(dispatch / online)을 깐 다음 웨이브에서 나온 3종 후속: ① 어느 포지션을 고를지의
**SELECTION 규칙**, ② 그 선택의 입력이 되는 **사용자 의도 역조사**, ③ 한 role을 여러 인스턴스로
staffing할 때의 **충돌 규율**. 신규 8 = gr-mode-fit · gr-user-elicitation · gr-work-claim ·
gr-instance-isolation · c-role-multiplicity · wfs-intent-analysis · dlv-intent-profile ·
fp-duplicate-claim (253 → 261, validate/lint PASS).

## 재사용 패턴

- **축을 깔았으면 다음은 "선택 규칙" 노드다.** 포지션 개체(Concept/Guardrail/ExecutionMode)만
  있으면 "무엇이 있는가"만 있고 "언제 어느 것인가"가 없다. 선택 규칙은 별도 Guardrail 한 개로
  두고, 이웃 선택계열 규칙과 **축 이름으로** 구분한다: gr-scale-modes = HOW MUCH(effort),
  gr-mode-fit = HOW activated(activation). promptText 마지막 절에 "Distinct from id:X, which …"
  를 넣는 것이 이 repo의 근사동의어 방지 관용구.
- **workflow에 선행 단계를 끼울 때 renumber는 4곳 동기**: ① 새 step(stepOrder 1) ② 기존 head
  step에 stepConsumes/stepDependsOn + stepOrder+1 ③ 뒤따르는 모든 step stepOrder+1
  (`stepDependsOn`+`stepOrder` 페어를 앵커로 치환하면 안전 — stepOrder 값만으로 치환하면 다른
  workflow의 동일 값과 충돌) ④ workflow의 hasStep 목록 + 정의문 + "seven-stage" 같은 **주석의
  수사(numeral)**. head step 정의문의 "Choose as the entry step"은 새 head로 옮겨 쓴다(두 노드가
  동시에 entry라고 주장하지 않게).
- **stepGuardedBy는 maxCount가 없다** → 한 step에 guardrail 2개 가능. 다만 guardrail만 붙이고
  정의문에 그 취지가 없으면 emit 문서에서 근거 없는 bullet이 되므로 **정의문에 한 절을 같이 추가**
  한다(예: assemble 단계에 "settle how each agent lane is activated … from the intent profile").
- **"상황 + 해법" 요구는 Concept 1 + Guardrail N + FailurePolicy 1로 분해**한다. 상황 이름은
  Concept(c-role-multiplicity), 예방 규율은 Guardrail, 사후 처리는 FailurePolicy. 단일책임 때문에
  Guardrail은 **시점 축으로** 쪼갠다: WHEN 시작해도 되나(gr-work-claim=claim 우선) / WHERE 써도
  되나(gr-instance-isolation=disjoint scope). 둘은 독립이라 하나만으로는 못 막는다(주석에 사유).
- **fp 신규 행은 "가장 가까운 행과의 차이"가 없으면 반려감**: fp-duplicate-claim은
  fp-conflict-contradiction과 조건이 겹쳐 보이므로 "저건 내용이 CONTRADICT, 이건 내용이 같아도
  중복된 노력"이라는 구분을 definition에 명시. 카탈로그 상단 주석의 행 열거도 같이 갱신.
- **guardrail이 참조하는 Channel이 그 harness에 없어도 된다**(선례: gr-absolute-paths가
  shared-workspace를 말하지만 h-harness-factory엔 chan-workspace 없음). gr-work-claim은
  chan-task-board(=`id:chan-task-board`, 브리프의 `chan-taskboard`는 오기)를 말하면서
  h-workspace-synthesis에 바인딩해도 관례 위반이 아니다.

## tokenEstimate — 이번 웨이브 규약

동시에 landed된 `tokenestimate-recompute-convention.md`(chars/4 실측)를 **새로 저작한 노드에
적용**했다: Guardrail은 promptText, 나머지는 definition의 chars/4. 이웃 guardrail들은 대체로
words×1.2 수준이라 신규 노드가 1.3~1.5배 높게 보이지만, 값이 크면 pack 예산을 더 먹어 admission이
**보수적으로** 되므로 안전한 방향. 이웃 일괄 수정은 하지 않았다(브리프 밖). 확인:
`retrieve.py --format json`의 budget_used 892~899/900 — 절단 없음.

## emitter 정합 (섹션 blurb은 그래프가 아니다)

`id:as-execution-mode`의 정의문을 복수 mode 수용으로 고쳐도 **산출 문서 문장은 안 바뀐다** —
`## Execution mode` 아래 lead-in은 `tools/materialize.py::_render_execution_mode`의 **하드코딩
리터럴**이고 AssemblySection.definition을 읽지 않는다. "정의문 고쳤는데 산출물 그대로" 류는
`grep -rn "<문장>" tools/`로 짝을 먼저 확인할 것. 후속 dispatch로 리터럴을 고칠 때 배운 것:
- 원문의 `spawns`는 standing agent에 틀린 동사 → `activates`. 단수/복수 전제뿐 아니라 **동사도**
  축 확장의 영향을 받는다.
- blurb을 무조건 복수형으로 쓰면 mode 1개 하네스 6종에 군더더기가 붙는다(vnv F3). `len(modes)==1`
  분기가 정답이고, **count의 순수함수라 결정성은 유지**된다(materialize 2회 `diff -r` 동일로 확인).
- 복수 예시에 "hybrid"를 넣으면 틀린다 — `mode-hybrid`는 그 자체로 **1개** mode다. 복수 케이스는
  "동시에 도는 여러 평면"뿐.

## vnv PASS-with-notes 후속에서 배운 것

- **guardrail이 전제하는 기판(channel)은 carrier harness가 declare해야 한다**(F1). "다른 하네스에
  이미 있으니 됐다"는 안 통한다 — 산출 문서 독자는 그 하네스 문서만 본다. 다만 중앙 Channel은
  **재사용 DEFAULT**이므로 참여자 한둘이 남아도 로컬 클론을 만들지 않는다(near-synonym drift).
  선례: `h-harness-factory`는 role을 하나도 선언하지 않고 `chan-task-board`를 바인딩한다.
  `ho:channelParticipant`의 "harness가 hasRole로 이미 바인딩한 Role" 문구는 **SHACL 미강제**의 소프트
  컨벤션. 참여자 집합 자체를 손보려면 `channels.ttl` 배정이 따로 필요하다.
- **정의문이 참조하는 것은 엣지로도 복구 가능해야 한다**(F2). step5 정의문이 "from the intent
  profile"이라 말하면서 `stepConsumes`가 없으면 산문-그래프 괴리. `stepConsumes`는 다치이므로
  **비선형 소비(한 Deliverable을 두 step이 소비)**를 허용해도 SHACL 문제없다. 반면 `stepDependsOn`은
  **추가하지 않는다** — 선형 체인이 순서를 이미 transitively 함의하므로 중복 엣지가 된다.
  (컨벤션 주석이 "consumed by the next"라고 단정했으면 예외를 주석에 명시할 것.)
- 개체수 self-report는 **HEAD 기준으로 재기**(F4): 워킹트리에 다른 웨이브의 미커밋분이 섞여 있으면
  "직전 validate 헤더 숫자"를 베이스라인으로 쓰면 틀린다. `git worktree add --detach HEAD` 후
  typed-individual diff가 정확한 방법(vnv가 쓴 방식).
