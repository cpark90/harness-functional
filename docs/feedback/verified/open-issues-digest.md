---
source: docs/feedback/open-issues-digest.md
verdict: apply
targets: [tools/retrieve.py, tools/validate.py, ONTOLOGYSTYLE.md]
---
# 검증 보고 — A절 4건 일괄 승인 (B18·B2·B11·B12)

사용자 일괄 승인(권고안대로). 4건 모두 **developer dispatch 저작**(tools/ + ONTOLOGYSTYLE) — 중앙
그래프 무변경. inspection이 각 파급을 실측해 apply-plan + 검증 게이트를 낸다. 3건은 권고안 그대로,
**B2만 실측으로 권고안 정정**(아래).

## B18 — retrieve 팩의 inline `id:` 해소 (retrieve-only)
- **파급(실측)**: "coordinator peer" 질의 팩에 raw `id:` **19개** 노출, 중앙 정의 **27곳**이 inline id:
  포함. materialize는 `f71a033`에서 이미 해소(`lib.label_of`) — retrieve만 안 함.
- **계획**: retrieve가 emit하는 정의/산문 텍스트의 `id:<slug>` 토큰을 **materialize와 동일 규칙**으로
  라벨 해소. 구조화 필드(candidate/edge/gap)는 이미 `label_of` 사용 중이므로 **정의 텍스트 방출부만** 대상.
- **게이트**: 팩에서 `\bid:` **0건**; `check_determinism.py` PASS 유지; 해소로 텍스트 길이가 변하니
  예산(900) 내 노드 수 급변 없는지 확인(라벨이 IRI보다 짧아 대개 여유 증가).

## B2 — tie-break 2차 키 ★권고안 정정 (salience → maturity)
- **실측으로 정정**: 디지트에서 "salience/maturity 2차 키"를 제안했으나 **salience는 252개 중 5개(2%)**에만
  있어 2차 키로 **거의 무용**(247개가 동값 → IRI가 그대로 지배). 반면 **maturity는 170개(67%)** 커버
  (stable 13 · reviewed 49 · draft 108).
- **정정된 계획**: 2차 키 = **maturity 랭크**(stable=0 < reviewed=1 < draft=2 < none=3) 오름차순,
  **최종 키는 IRI**(결정성 보존). 동점 중 **더 성숙한 부품이 먼저** 실린다. 정렬 3지점
  (`retrieve.py:103/177/185`, 현재 `(-score, iri)`)에 maturity 랭크를 IRI 앞에 삽입: `(-score, mat_rank, iri)`.
- **게이트**: `check_determinism.py` PASS(IRI 최종키로 재현성 유지); 동점 그룹이 maturity 순으로
  재배열됨을 표본 질의로 확인; deprecated는 이미 `DEPRECATED_RANK_FACTOR`로 강등되므로 이중처리 아님.

## B11 — capacity-fit 검사기를 validate.py 축으로 (FAIL, 현재 그래프 안전)
- **파급(실측)**: 현재 5개 Agent 전부 `Σ AoO observedTokenVolume ≤ cognitiveCapacity` **만족**
  (orchestrator 11000·developer 7500·vnv 6500·inspection 13500·synthesizer 9500, 전부 cap 150000 이하).
  ⇒ **FAIL-on-violation 검사를 추가해도 현재 validate는 PASS 유지**(안전).
- **계획**: validate.py에 축 추가 — Agent별 `agentObservation→ObservationSpace→hasAreaOfObservation→
  observedTokenVolume` 합이 `cognitiveCapacity` 초과면 **FAIL**(하드 불변식; 그래프가 이미 만족하므로
  warn 아닌 fail로 곧장 강제 가능). 요약에 per-agent 여유 출력.
- **게이트**: `validate.py` **PASS @현재개체수**; 인위적 초과 개체로 **negative control**(초과 시 FAIL 확인).

## B12 — 템플릿 본문 `ho:` 예외를 ONTOLOGYSTYLE에 명문화 (doc-only)
- **계획**: `ONTOLOGYSTYLE.md` §1(promptText 자기완결 규약, L85 부근)에 **1줄 예외** 추가 —
  "하네스의 **주제가 이 온톨로지(ho:) 자신**인 경우(techdoc류) 지시문/템플릿 본문에 `ho:` 용어 사용을
  허용한다(산출물 자기완결 계약의 예외)." 그래프·산출물 무영향.
- **게이트**: 문서 변경만, validate 무관.

## 판정
**apply** — 4건 developer dispatch 저작. B18/B11/B12는 권고안 그대로, **B2는 salience 2% 실측으로
maturity 2차 키로 정정**(더 실효적, 결정성 유지). 반영되면 inspection이 위 게이트(check_determinism·
validate·팩 id: 0·negative control)로 검증한다. 중앙 그래프 개체는 불변(전부 tools/doc 변경).
