# 전면 건전성 재감사 델타 (245 individuals, 2026-07-28)

`docs/feedback/verified/health-reaudit-245.md`. 237→**245**(+8, Q3 wf-compose-harness 분해 반영분)
재감사. 이전: [[full-health-audit-237]].

## 재현 프로브 (편집 없이 read-only)
- `validate.py`(SHACL·reachability·capabilities·assemblyOrder·capacityFit·registryDrift) +
  `check_determinism.py`(byte-identical). 둘 다 PASS.
- capability 짝: `grep requiresCapability|providesCapability`→ req distinct 5 / prov 9, **gap 0**.
- deprecated: 정책이 **제거**라 그래프 노드 0 — grep은 gr-traceability·wfs 정의 산문에서만 히트
  (노드로 오판 말 것). registryDrift 3 registered-not-instantiated(Candidate/Example/
  HarnessComponent)는 validate가 harmless로 명시.

## 결과: 그래프 결함 0, 유일 결함군 = doc-lag (그래프 아님)
- **§2 클래스 표 gap 해소 확인**: 237 감사의 Hook 행 누락·Contract `ct-`≠`contract-`가 **수정됨**.
  현재 instantiated ho: leaf **31종** 전부 §2 표 정위치. (asserted `a ho:X` 카운트로 대조.)
- **§3 잔여 GAP = WorkflowStep 노드 블록 미명문화**: `hasStep`+step 내부술어(stepByRole/
  stepUsesTool/stepGuardedBy/stepProduces/stepConsumes/stepDependsOn(transitive)/stepOrder)가
  §3 어디에도 없음. Q3가 step 8→17로 늘리고 data-flow 신설 → 명문화하면 재발 gap 닫힘.
  TBox(harness.ttl)는 완비, abox 실무 순서 일관 → **doc-only**(ONTOLOGYSTYLE.md, inspection 범위 밖).
  같은 범주 저순위: PromptSection(hasSection/sectionOrder)·ObservationSpace/AreaOf* 내부 블록도 미기재.

## 함정·교훈
- **성장분마다 §2/§3 대조를 상시 스텝으로**: 신규 클래스는 §2, 신규 술어(특히 노드-내부 블록)는
  §3. 이번엔 §2는 따라잡았고 §3만 뒤처짐 — 부분 해소 패턴이라 매번 둘 다 봐야 함.
- WorkflowStep 실무 표준순서: `a→prefLabel→definition→stepByRole→stepUsesTool→stepGuardedBy→
  stepConsumes/stepProduces→stepOrder→tokenEstimate→maturity`.
