# 중앙 Channel participants = DEFAULT, leader 엔드포인트는 harness-dependent

vnv F1 잔여(`docs/verify/online-agent-wave-verify.md`) 반영: 중앙 `id:chan-task-board`가
`ho:channelParticipant`에 `id:role-orchestrator`를 고정해, 그 role을 staffing하지 않는 carrier
(`h-workspace-synthesis`, `h-harness-factory`)의 산출 CLAUDE.md에 **미staffing role이
participants로 렌더**되던 불일치.

## 판정 규칙 (다음에 같은 증상이 나오면)

중앙 채널 participant에 특정 role이 박혀 있는데 바인딩 carrier가 그 role을 staffing하지 않을 때
선택지는 둘 — **(a) 중앙 default 일반화** vs **(b) carrier 전용 채널 재선언**. 판단 기준:

- 현 participant set이 **실존 carrier 어느 쪽과도 일치하지 않으면 (a)**. 이때 박힌 role은
  "default"가 아니라 특정 harness의 조직도가 새어 들어온 것이다. (이번 건: 이 채널을 바인딩하는
  harness는 2개인데 둘 다 orchestrator를 쓰지 않고, orchestrator를 쓰는 `h-multiagent`는 이
  채널을 바인딩조차 안 함 → 고정할 근거 0.)
- (b)는 **중앙 라이브러리 안에서는 기각**한다 — 근사동의어 board 노드가 하나 더 생기는 것이
  이 store가 막으려는 drift다. TBox `ho:Channel` 정의도 중앙 개체를 "reusable DEFAULTS, a
  harness MAY redefine participants"로 규정하므로, 재선언은 도메인 recipe 쪽 권한이지 중앙
  파티션의 해법이 아니다.

## 일반화 문장 패턴

역할을 지우기만 하면 정의문이 그 role을 계속 지목해 산문-데이터 괴리가 남는다. 정의문도 같이
고치되 **기능 서술은 유지하고 엔드포인트만 미지정**으로 바꾼다:

> "The default endpoints are the worker roles; the notified leader is a harness-dependent
> endpoint that each binding harness fills with its own lead/coordinating role, so no single
> leader role is fixed here."

즉 "leader가 idle 시 통지받는다"는 **메커니즘은 남기고** 그 leader가 누구인지만 harness 몫으로
넘긴다. 정의문 안 role 고정 표현("the orchestrator")은 **전수 grep**해서 잔존이 없게 한다.

## 부수 확인 (이 유형의 체크리스트)

- **orphan 위험 없음 확인**: participant 하나를 빼면 그 role의 inbound가 줄어든다. 삭제 전
  rdflib로 inbound 전수(`g.triples((None,None,role))`) — role-orchestrator는
  `h-multiagent hasRole` + 채널 3 + `wfs-* stepByRole` 8 + `agent-orchestrator agentRole`로
  충분히 연결되어 무해했다.
- **Channel 노드에는 `ho:tokenEstimate`가 없다**(6개 전부). §1c 스코프 밖이라 정상 —
  없다고 backfill하지 말 것. 다만 정의문은 lint §1c text cap(promptText+definition ≤260 tok,
  chars//4) 대상이므로 재작성 후 측정(이번 647자=161 tok, 130–260 밴드 안).
- **렌더 영향 범위 = `hasChannel` inbound 뿐**. 중앙 채널 수정은 그 채널을 바인딩한 harness의
  CLAUDE.md/MANIFEST만 바뀐다(여기선 2개). materialize `diff -r` pre/post로 확인하고,
  워킹트리에 선행 웨이브 변경이 섞여 있으면 HEAD worktree 빌드와의 diff는 **그 웨이브분을
  제외**하고 읽는다(이번엔 gr-standard-terms/gr-lang/mode-online-standing 잔여가 같이 떴다).
- carrier 쪽 TTL 주석이 옛 사실("board names role-orchestrator which this carrier does not
  staff")을 서술하고 있으면 **같은 브리프에서 재작성**한다. 주석은 emit되지 않지만 다음 세션의
  판단 근거가 되므로, 해소된 불일치를 남겨두면 재발 트리거가 된다.
