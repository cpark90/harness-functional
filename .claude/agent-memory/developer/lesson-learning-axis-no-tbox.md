# 시행착오 교훈(lesson) 축 — 규율은 노드로, 개별 교훈은 아님

**핵심 판단(재사용)**: "X를 학습·기록한다"류 요구가 오면 `ho:X` 클래스 신설을 먼저 의심한다.
이 저장소는 **중립 부품 라이브러리**라 개별 교훈("run 12가 stale catalog로 실패")은 한 실행의
인스턴스 데이터이고 부품이 아니다 → TBox 확장 없이 **규율**만 기존 어휘로 표현한다:
Concept 1(원리) + Guardrail N(시점축 분할) + WorkflowStep 1(수행) + FailurePolicy 1(위반 시)
+ 기존 Memory 정의 보강(저장 계층). 이 **배제 판단은 해당 절 주석에 사유로 남긴다**(coverage
게이트가 "조용히 건너뜀"을 GAP으로 잡음).

## 이번 축의 배선 (id 그대로 재사용 가능)
- `id:c-lesson`(broader `id:c-agent-methodology`, related `id:c-memory`) — 원리는 cross-cutting
  operational discipline이므로 c-memory(=tier 아키텍처) 밑이 아니라 methodology 밑.
- Guardrail 3 = 시점축 분할: capture(실패·수정 발생 시 무엇을 쓰나) / reuse(시작 전 무엇을
  읽나) / promotion(반복되면 표준 부품으로 승격). 근접 노드와의 "Distinct from"을 promptText
  마지막 문장에 넣어 near-synonym 오인 차단 — 특히 `id:gr-generalize-not-overfit`(피드백 1건
  일반화, 같은 run 내)와 `id:gr-root-cause`. 승격 축의 변별점 = **run 간 RECURRENCE + 사적
  노트→공유 부품 이동**.
- `id:wfs-lesson-capture`(stepOrder 4, dependsOn `id:wfs-change-log`, byRole `id:role-inspection`,
  guardedBy `id:gr-lesson-capture`) — `id:wf-harness-evolution` 마지막 단계.
- `id:fp-repeated-mistake` — 조건이 **run을 가로지름**(단일 run 실패=fp-agent-failure-retry와
  변별). carrier=`id:h-harness-factory`(evolution loop가 사는 곳).
- `id:mem-longterm` 정의 꼬리에 "대표 content=trial-and-error lessons" 한 구절 + tagged
  `id:c-lesson`(검색 진입점) + tokenEstimate 재산정.

## 함정·규칙
- **stepGuardedBy는 롤업 없음**: hasComponent 체인은 hasStep/stepProduces/hasSection/…뿐이라
  step이 가리키는 Guardrail은 어딘가의 `hasGuardrail`로 별도 배선돼야 orphan이 아니다.
  단 **step과 그 guardrail의 carrier가 서로 달라도 됨**(선례: wfs-audit→gr-structural-coverage는
  h-multiagent, 워크플로는 h-harness-factory).
- **h-multiagent 바인딩 = 산출 CLAUDE.md 변경**: 라이브러리 carrier(h-workspace-synthesis /
  h-harness-factory)에 두는 관례는 "호스트만 필요한 부품" 얘기다. **이 repo의 agent가 실제로
  따라야 하는 규칙**은 h-multiagent에 붙이고(3 bullets 추가), 그 예외 사유를 carrier 주석에
  적는다. 회귀 검증법: 변경 전 `materialize.py h-multiagent --out before` → 작업 후 `--out after`
  → `diff -r`가 **의도한 bullet만** 보이는지. 더 강한 확인은 신규 노드만 제거한 사본을
  materialize해 baseline과 **byte-identical**인지(이번에 통과).
- FailurePolicy `ho:tokenEstimate` 관례는 파일 안에서 불일치(구식은 (def+cond+rec)//4의 ~0.76,
  최근 저작분은 **def//4**). 최근분에 맞춰 `skos:definition` chars//4로 적었다. 린터의 260 cap도
  definition만 셈(promptText+definition).
- Guardrail은 definition 없이 promptText만 쓰는 파일 관례 — §3 표준 순서보다 **지역 관례**
  (promptText → tagged → tokenEstimate → maturity)를 따른다.
- 운영↔저장 쌍: h-multiagent에 규칙을 붙이면 디스크 `CLAUDE.md`의 대응 절도 같은 브리프에서
  보강한다(이번엔 "에이전트 역할" 절에 lesson 3축 문단 + 노드 id 포인터). `.claude/agent-memory/
  README.md`는 write 규약(무엇을 쓰나)은 이미 담고 있어 미수정 — capture **트리거**와 promotion만
  빠져 있었다.
