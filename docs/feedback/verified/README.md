# 검증 lane (docs/feedback/verified)

inspection → orchestrator **판정 보고** 채널. inspection이 inbox(`docs/feedback/*.md`)의
피드백 항목을 `retrieve.py` projection + `validate.py`로 검증해 파급효과·정합성·적용 계획·
verdict를 여기에 쓴다. **온톨로지는 이 lane에서 바뀌지 않는다** — orchestrator가 승인·완료된
보고만 읽어 **developer dispatch로** `ontology/abox/`에 적용한다(직접 편집 아님).

- 작성 규약: `{item}.wip.md`로 Write → 완료 시 `{item}.md`로 rename (rename = 완료 선언).
  orchestrator는 `*.wip.md`를 처리하지 않는다.
- **verdict** (판정 — 보고가 내리는 결론, 이후 바뀌지 않는 것이 원칙):
  - `apply` / `apply-with-changes` — 적용하라(그대로 / 명시된 수정과 함께).
  - `needs-decision` — 적용 전 사용자/orchestrator 결정이 필요.
  - `apply-plan-ready` — 계획은 확정됐고 **사용자 선택(옵션) 대기** — 선택 즉시 dispatch 가능.
  - `done` — 판정·적용까지 이 보고 안에서 끝나 **orchestrator 후속 조치가 없는** 완료 보고
    (finalize/consolidated 트레일류).
- **status** (사후 상태 — 판정과 별개로 보고서의 수명주기; verdict는 판정, status는 그 후):
  - `reported` — inspection 보고 완료, 소비(승인·적용·기록) 대기 또는 트레일로 유지 중.
  - `finalized` — 후속까지 종결되어 기록 보존만 남은 보고.
  - 생략 시 `reported`로 간주한다.
- 적용 게이트: **inbox 항목이 `status: approved`(사용자만 태깅)** + 보고 verdict가
  `apply`/`apply-with-changes` + 보고 완료(rename) — 셋 다일 때만 orchestrator가 developer
  dispatch로 적용한다.
- 적용 후 orchestrator가 이 보고서에 **적용 결과를 기록**하고, inspection이 다음 사이클에
  항목·보고서를 refresh(제거)한다.

보고 형식은 `.claude/agents/inspection.md` §B 참조.
