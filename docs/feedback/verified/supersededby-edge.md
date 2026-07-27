---
source: docs/feedback/supersededby-edge.md
verdict: apply
targets: [core:pat-agent-teams, core:pat-sub-agents, core:pat-hybrid]
---
# 검증 보고 (B9) — 사용자 결정 (C): 폐기 3노드를 그래프에서 제거

사용자 결정: **(C) 완전 제거.** 근거(사용자): "온톨로지 자체의 내용은 정돈된 형태로 존재해야지
추적성을 함께 보관하면 안 됨" + (2) retrieve가 후계를 함께 싣지 않음. inspection 권고는 (A)였으나
사용자가 (C)를 명시 선택 — **그대로 반영**한다. 이는 "폐기해도 검색되게 두어 drift 방어"라는 기존
논거를 **의도적으로 포기**하고 "그래프는 현재 유효한 부품만"이라는 방침을 택한 것이다(추적성은
git 이력·docs로).

## 파급효과 (실측) — 제거는 깨끗하다
- **inbound 참조 0**: `pat-agent-teams`·`pat-sub-agents`·`pat-hybrid` 셋 다 중앙·recipe·tbox·shapes
  어디서도 참조되지 않는다(자기 정의 제외 grep 0). 이미 어느 harness에도 `appliesPattern`으로 안
  걸려 있어 제거해도 dangling 없음.
- **concept orphan 없음**: 세 노드가 tag하던 `id:c-execution-mode`는 **mode-* 3개(draft)가 계속
  tag**하므로 제거 후에도 연결 유지(reachability 무영향).
- **retrieve.py 무영향**: `DEPRECATED_RANK_FACTOR`·deprecated 처리 코드는 `ho:maturity`를 **일반적으로**
  읽을 뿐 세 IRI를 하드참조하지 않는다. 제거하면 그 기계가 **소비 대상 0으로 휴면**(코드는 무해하게 잔존).
- **개체 수 235 → 232.** materialize: 세 노드는 어느 하네스에도 없어 **7 하네스 산출물 전부
  byte-identical**(lock 카운터만 이동). retrieve 팩: 세 노드가 더는 등장하지 않음(= (C)의 의도).

## 적용 계획 (orchestrator → developer dispatch)
1. `ontology/abox/core/spec/patterns.ttl`에서 **세 DesignPattern 블록 전체 삭제**
   (`id:pat-agent-teams`·`id:pat-sub-agents`·`id:pat-hybrid`) + 그것들을 설명하던 주석
   ("...tagged c-execution-mode so they remain connected") 제거.
2. 그 외 변경 불필요(참조 0). `ho:supersededBy` 신설 **안 함**(A 아님).
3. **정책 반영(방침 확립)**: 이후 "폐기"는 그래프에 deprecated 노드로 남기지 않고 **제거**한다.
   추적성은 git 이력·`docs/`에 둔다. (문서 규약 반영은 orchestrator 판단 — 예: ONTOLOGYSTYLE에 한 줄.)

## 검증 게이트 (반영 후 inspection)
- `validate.py` **PASS @232**, reachability 0 orphan(특히 c-execution-mode 연결 확인), 중복 라벨 0.
- 7 하네스 materialize **byte-identical**(lock 제외).
- 8 recipe federate **PASS**(세 노드 recipe 참조 0이므로 회귀 없어야).
- `grep -rn 'maturity "deprecated"' ontology/abox/` → **0건**(현재 유일한 deprecated 3개가 사라짐).

## 후속 판단 (비차단, orchestrator)
현재 deprecated 노드가 0이 되므로 `retrieve.py`의 `DEPRECATED_RANK_FACTOR`·배지 코드와 `ho:maturity`
"deprecated" enum은 **소비자 없는 휴면 기계**가 된다. 방침상 "deprecated를 안 쓴다"면 이 기계를
제거할지(더 정돈됨) 존치할지(미래 대비)는 별도 결정. inspection은 제거를 강권하지 않음 — 무해하므로.

## 판정
**apply** — (C)를 위 삭제로 반영. 제거는 참조 0·orphan 0으로 안전. developer dispatch가 세 블록을
지우면 inspection이 위 게이트로 검증한다.

## 적용 결과 (applied 2026-07-28, orchestrator via developer dispatch)
**적용됨.** `pat-agent-teams`·`pat-sub-agents`·`pat-hybrid` 세 DesignPattern 블록 삭제 + DEPRECATED 묘비 주석 제거.
- **추가 정리(계획 외, 필수)**: (a) `patterns.ttl` 유닛 상단 `owl:Ontology` 헤더 주석이 삭제된 세 노드를 "SUPERSEDE … read side by side"로 지목하던 stale → "runtime topology is a first-class Harness property"로 갱신. (b) `ONTOLOGYSTYLE.md §2`가 **정반대 구정책**("폐기 노드는 삭제 대신 deprecated 표기")이던 것을 사용자 (C) 방침으로 replace(폐기=제거, 추적성은 git/docs). "ID 재사용 금지"는 유지.
- **게이트(orchestrator 확인)**: `validate.py` PASS @232 (235→232, −3) · reachability 0 orphan · `c-execution-mode`는 mode-* 3개가 계속 tag(연결 유지) · `grep 'maturity "deprecated"'` = 0 · determinism PASS · 삭제 노드 참조 0 · h-multiagent materialize 클린(누출 0).
- **비차단 후속(별도 결정)**: `retrieve.py`의 `DEPRECATED_RANK_FACTOR`·배지 코드 + TBox `maturity "deprecated"` enum이 이제 소비자 0으로 휴면 — 제거(더 정돈) vs 존치(미래 대비)는 미결.
- inspection refresh 대기(게이트 재검증 후 항목·보고서 제거는 inspection 소관).
