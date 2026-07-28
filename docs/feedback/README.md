# 피드백 채널 (docs/feedback)

agent ↔ user 단일 창구. 개별 온톨로지 노드(`ontology/abox/*.ttl`)를 직접 편집·논의하지 않고
이 채널로 제안·결정을 모은다. **온톨로지 그래프 밖**이다 — `validate.py`/`retrieve.py`는
`ontology/`만 스캔하므로 이 폴더는 그래프에 영향을 주지 않는다.

**양방향**:
- 사용자는 온톨로지 변경 요청(노드 추가·수정·폐기, capability 재배선, maturity 승격)을 항목으로 남긴다.
- **agent(orchestrator)는 진행에 필요한 결정 요청을 대화형 팝업 대신 이 채널에 항목으로 남긴다**
  (관련 노드 + 선택지). agent가 만드는 항목은 frontmatter에 **`status: open`을 반드시 포함**한다 —
  사용자가 승인할 때 필드를 새로 적지 않고 `open`→`approved`로 고치기만 하게.

## 처리 파이프라인 (검증 → 적용, 역할 분리)

피드백을 곧바로 적용하지 않는다.

1. **inspection**(별도 세션)이 검토 사이클마다 inbox를 스캔해 미검증 항목을 발견하고,
   `retrieve.py` projection + `validate.py`로 **파급효과·정합성·적용 계획·verdict**를 판정한다
   (온톨로지 편집 금지). 절차: `.claude/agents/inspection.md` §B.
2. 판정은 **`docs/feedback/verified/{item}.md`**에 쓰인다 (작성 중엔 `.wip.md`, 완료 시 rename).
3. **사용자 승인 게이트**: 승인 전까지 inspection이 사이클마다 지속 재검토하고 온톨로지는
   바뀌지 않는다. 사용자가 보고서의 적용 계획을 보고 항목의 `status: open`을 **`approved`로
   고치는 것이 유일한 적용 허가 신호**다 (승인 태깅은 사용자만).
4. **orchestrator**가 자기 사이클에 채널을 스캔해, **① 완료 보고서가 있고 ② verdict가
   `apply`/`apply-with-changes`이며 ③ 항목이 `status: approved`인** 항목만 처리한다.
   **developer dispatch로 `ontology/abox/`에 적용**(orchestrator 직접 편집 아님) →
   `validate.py` PASS 확인 → **검증 보고서에 적용 결과 기록**
   → 반영 요약 보고 (항목·보고서 제거 금지). `needs-decision`이면 적용 않고 결정요청으로 남긴다.
5. **refresh**: inspection이 다음 사이클에 `approved` + **적용 결과가 기록된** 항목만 보고서와
   함께 제거한다 (적용 전이면 남긴다 — 시간 가정 금지, verify-then-proceed).

> **inspection은 apply하지 않는다.** verdict가 `apply`이고 `status: approved`여도, **적용은
> orchestrator가 developer dispatch로** 한다. inspection이 온톨로지/코드를 직접 반영하면 역할
> 분리 위반이다 — approved+미적용 항목은 orchestrator 적용을 기다리며 **남긴다**(refresh는 적용
> 결과 기록 후에만).

**완료 마커 (`.wip.md`)**: 에이전트가 `docs/feedback/**`에 문서를 쓸 때는 `{name}.wip.md`로
작성하고 완료 시 `{name}.md`로 rename한다(rename이 완료 선언). orchestrator는 `*.wip.md`와
답 placeholder가 남은 항목을 처리(검증·적용·제거)하지 않는다.

## 하위 채널

- `verified/` — inspection→orchestrator 판정 보고 (검증 lane). README 참조.
- `inquiries/` — orchestrator↔inspection 조사 lane (`open`→`answered`→`closed`). README 참조.

## 항목 형식 (inbox)

```
---
status: open            # 사용자만 approved로 바꾼다
targets: [id:h-…, …]    # 관련 온톨로지 노드(있으면)
---
# {제목}
{요청·제안 내용, 또는 agent의 결정 요청 + 선택지}
```
