---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/retrieve.py, tools/validate.py, ho:cognitiveCapacity, ho:observedTokenVolume]
kind: decision
related: [docs/plans/OPEN-ISSUES.md, docs/feedback/supersededby-edge.md, docs/feedback/refer-to-expert-fp-stale-definition.md]
---
# 열린 이슈 현황 (feedback 채널로 올림) — inspection 실측 2026-07-28

OPEN-ISSUES.md(orchestrator 트래커)의 남은 B-항목을 **실측으로 재판정**해 feedback 채널에 올린다.
트래커 텍스트는 최근 land를 반영 못 해 여럿이 stale이었다. 아래는 실측 기준 진짜 상태다.

## A. 진짜 열림 — 사용자 결정/우선순위 필요
> 각 항목을 개별 항목으로 분리해 approve하길 원하면 말해달라(요청 시 분리 파일 생성). 여기서
> **일괄 approve = 각 권고안대로 진행**으로 읽는다.

- **B18 — retrieve 팩이 정의 산문의 raw `id:`를 그대로 노출**(실측: "coordinator peer" 질의 팩에
  `id:chan-peer`·`id:cap-synthesis` 등 **19개 누수**; 중앙 정의 **27곳**이 inline `id:` 포함).
  materialize는 emit 시 `id:`→라벨 해소하지만 retrieve는 안 한다 → 팩만 읽는 에이전트가 raw IRI를 본다.
  **권고**: retrieve가 emit 텍스트의 `id:` 토큰을 라벨로 해소(materialize와 동일 규칙). developer dispatch.
- **B2 — retrieve tie-break 정책**: 동점은 현재 **IRI 사전순**(재현성 확보용, B-결정성 fix). 그러나
  "동점 17개에 슬롯 5개"인 질의에서 **검색 품질** 기준(maturity/salience 가중)은 미결.
  **권고**: 재현성은 유지하되, 2차 키를 IRI 앞에 salience/maturity로 둘지 **결정 필요**(품질 vs 단순성).
- **B11 — capacity-fit 검사기 부재**(실측: validate.py에 `cognitiveCapacity` 검사 **0**). Agent별
  `Σ AoO observedTokenVolume ≤ cognitiveCapacity` 불변식이 그래프에 있으나 **강제되지 않는다**.
  **권고**: validate.py에 capacity-fit 축 추가(초과 시 FAIL 또는 warn). developer dispatch + warn/fail 결정.
- **B12 — 템플릿 본문의 `ho:` 언급 정책**: 이 온톨로지가 **주제인** 하네스(techdoc류)는 지시문에
  `ho:` 용어를 의도적으로 쓴다. 산출물 자기완결 계약을 **템플릿 본문까지 확장할지**는 저작 규약 결정.
  **권고**: "주제가 ho: 자신인 경우 예외 허용"을 ONTOLOGYSTYLE에 1줄 명문화. 규약 결정(비긴급).

## B. 이미 반영됨 — 트래커 stale (조치 불필요, FYI)
실측으로 해소 확인: **B14**(instance_edges가 9종 링크술어 포착, channelParticipant 23 edges) ·
**B15**(abox_mtimes relpath 키) · **B20**(CI 템플릿 owner 정정) · **B21**(importer가 TestScenario/
FailurePolicy 추출, import_corpus 15참조) · **B22**(Contract abox 개체 2개 존재, delta F).

## C. 이미 파일·승인됨 — 적용 대기 (developer dispatch)
- **B9** `supersededby-edge.md` (approved, 사용자 **(C) 제거** 선택) → deprecated 3노드 삭제. verified apply-plan 완료.
- **B23** `refer-to-expert-fp-stale-definition.md` (approved) → recipe 3곳 정의 수정. verified apply-plan 완료.

## 결정 필요 (사용자)
A절 4건(B18·B2·B11·B12)을 **어떻게 진행할지** — 일괄 권고안 approve / 일부만 / 개별 항목 분리 요청.
approve 시 developer dispatch로 반영하고 inspection이 검증한다. (B는 조치 불필요, C는 적용 대기.)
