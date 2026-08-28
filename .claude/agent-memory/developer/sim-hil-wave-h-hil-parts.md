# sim-hil B-K1 (wave-H) — HIL 부품군 24개체 저작

Guardrail 7 + FailurePolicy 3 + WorkflowStep 4 + Channel 2 + Concept 6 + TestScenario 1
+ **재량 host Workflow 1**(`wf-approval-gated`) = +24. 332→356 (lock individualCount 기준).

## WorkflowStep 배정에 host Workflow가 없으면 = 재량 신설 + 보고
Step 도달성은 hasComponent∘hasStep 롤업**뿐**이다(stepGuardedBy 등은 롤업 없음). 브리프
인벤토리에 step만 있고 담을 Workflow가 없으면 (a) 기존 workflow 삽입(renumber+의미 변경) 또는
(b) 최소 host Workflow 신설 중 택일 — 기존 workflow가 그 step들을 정직하게 담지 못하면 (b)가
맞고, 인벤토리 밖 추가이므로 신설 사유를 주석+반환 보고에 남긴다.

## carrier: 선언 하네스 우선(N1)이 산출물 변화를 의도로 바꾼다
h-multiagent가 human-gate 기계장치의 **사실 carrier**(tier-per-plan-approval + approval 강제
user channel + wip→rename 재개 파이프라인): workflow/채널 2/fp 3/scn 1/gr 3을 전부 결합해
CLAUDE.md +45줄 — "byte-identical 유지" 관례의 **의도된 예외**는 lesson-learning 선례처럼
주석에 "이 하네스의 에이전트가 실제로 이 규율을 운영한다"를 명시하면 된다. 반면 사실 운영자가
없는 부품(four-eyes, turn budget)은 여전히 라이브러리 carrier(workspace-synthesis=팀규율 가족,
harness-factory=bounded-iteration 가족) + 사유 주석.

## 승인 게이트 결과의 3행 분해 (재사용 패턴)
무응답(fp-unanswered-approval: 기한부 에스컬레이션 연쇄, 창이 **열려있는 동안**) / 명시 거부
(fp-reject-retry-feedback: 이유 시드 재시도 ≤2, gr-rejection-feedback 계약 소비) / 종결 해석
(fp-dismissal-vs-decline: 교환이 **끝난 뒤** 무시=재시도가능·거절=종결). 세 행이 서로를
Distinguished 역문장으로 가리켜야 겹침이 안 생긴다. fp-envelope-exit와의 경계 = "range 밖" vs
"range 안인데 게이트가 침묵".

## attachesAt 공석 leaf 채우기 = concepts.ttl 주석도 갱신
turn leaf 첫 점유(gr-auto-reply-budget/gr-stopping-condition — iteration boundary 검사),
session leaf 첫 점유(gr-safe-halt — halt는 세션종료 의무). **B-T가 남긴 "공석" 주석을 같은
커밋에서 갱신**해야 주석-사실 불일치가 안 남는다. post-execution은 여전히 공석.
gr-resume-idempotency는 attachesAt 의도적 미부여(파이프라인 지점이 아니라 작업 설계 제약) —
미부여도 사유 주석.

## gr-safe-halt 층 구분 문장 (W1 경계 요구의 해법)
cap-safe-halt=상태 정의 / fp-envelope-exit(-severe)=ENVELOPE exit 전용 사다리 /
gr-safe-halt=**모든** stop 트리거가 그 경로를 타게 하는 규율 — "Distinguished by layer from"
문구로 3층을 한 문장에 명시하고 carrier는 halt 기계장치 옆(workspace-synthesis).

## 검증 루틴 (B-T scratch 역적용 재확인)
validate+lint+determinism 3 게이트 → retrieve 4질의 발견성 → scratch 복사+내 편집만 문자열
역적용(count==1 assert) baseline → 7 하네스 materialize 대조: 비-carrier는 CLAUDE.md/MANIFEST
byte-identical, lock individualCount만 +24(전 하네스 공통 구조적 필연), dangling id: 0.
