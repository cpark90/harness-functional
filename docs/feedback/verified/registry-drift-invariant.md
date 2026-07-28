---
source: docs/feedback/registry-drift-invariant.md
verdict: apply-with-changes
targets: [tools/ontology_lib.py, tools/validate.py]
---
# 검증 보고 (B16) — 레지스트리 드리프트 가드 (A + FAIL), ★스코프 정정

사용자 결정: **(1) A** (사본==TBox 파생 검사) · **(2) FAIL**. 착수 전 드리프트 실측 게이트를 돌린
결과 **원 항목이 두 레지스트리를 대상으로 했으나 실측상 하나로 좁혀진다** — 그래서 apply-with-changes.

## 착수 전 드리프트 실측 (apply-plan이 요구한 선행 게이트)
- **`INSTANCE_CLASSES`(리터럴 34) — 드리프트 0**: abox에서 실제 인스턴스화되고 `subClassOf*
  HarnessComponent | SpecConcept | Harness`인 클래스 **28개 전부 등록됨**(누락 0). 리터럴 잉여 3
  (`Candidate`·`Example`·`HarnessComponent`)은 등록됐으나 abox 미인스턴스화 — **무해**(Candidate는 추론,
  HarnessComponent는 추상). ⇒ 가드를 추가해도 **현재 PASS**(안전), 미래 "새 클래스 미등록"을 잡는다.
- **`ttl_writer.ORDER`(29) — 가드 대상 아님(정정)**: 인스턴스 술어는 82종이라 53이 "목록 밖"으로 보이나,
  **B13 merge 수정 이후 ORDER는 완전 레지스트리가 아니라 정렬 힌트**다 — 목록 밖 술어는 `render_block`이
  merge로 보존한다("absence == preserve"). 따라서 "ORDER ⊇ 전체 술어" 불변식은 **false invariant**로,
  넣으면 53개 정상 술어에 FAIL을 낸다. ORDER의 드리프트 위험은 B13이 이미 구조적으로 제거했다.
  ⇒ **원 항목의 A.2(ORDER 가드)는 철회**한다.

## 적용 계획 (정정본) — INSTANCE_CLASSES 가드 하나 (developer dispatch)
`tools/validate.py`에 축 추가(또는 `ontology_lib`에 헬퍼 + validate가 호출):
- **불변식**: abox에 ≥1 인스턴스가 있고 `rdfs:subClassOf* ho:HarnessComponent` 또는 `ho:SpecConcept`인
  모든 `ho:` 클래스는 `INSTANCE_CLASSES`에 있어야 한다(없으면 그 클래스 개체가 `instance_nodes`에서 증발).
  위반 시 **FAIL**, 누락 클래스명 출력. (잉여는 무해하므로 FAIL 아님 — 필요 시 warn.)
- TBox 파생 집합 계산은 위 실측 스크립트의 `subclasses()` 로직 재사용(subClassOf* 역방향 BFS).
- 요약 라인에 다른 축(SHACL/reachability/capabilities/assemblyOrder/capacityFit)과 나란히 표기.
- **B14 참고**: `INSTANCE_LINK_PREDICATES`는 B14에서 이미 정리됨(실측 시 리터럴 흔적 없음) — 대상 아님.

## 검증 게이트 (반영 후 inspection)
- `validate.py` **PASS @232**(현재 INSTANCE_CLASSES 드리프트 0이므로 신규 축도 green).
- **negative control**(inspection 독립): `INSTANCE_CLASSES`에서 실사용 클래스 하나(예: `ho:Role`)를
  in-memory로 제거 → 신규 검사가 **FAIL**하고 그 클래스명을 출력하는지 확인. 디스크 무변경.
- **무회귀**: 그래프·개체·산출물 무변경(검사 추가일 뿐) → 4 하네스 materialize **byte-identical**,
  8 recipe federate **PASS**(중앙 validate를 쓰므로 union에도 자동 적용, 현재 드리프트 0이라 통과).

## 판정
**apply-with-changes** — (A)+(FAIL)을 **INSTANCE_CLASSES 단일 가드**로 반영(ORDER 가드는 B13 merge가
obviate하므로 false invariant로 철회). 현재 드리프트 0이라 하드 FAIL 검사가 곧바로 green. developer가
저작하면 inspection이 negative control + 무회귀로 검증한다.
