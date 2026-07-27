---
status: open            # 사용자만 approved로 바꾼다
targets: [tools/ontology_lib.py, tools/validate.py, tools/webui/ttl_writer.py]
kind: decision
related: [docs/plans/OPEN-ISSUES.md, .claude/agent-memory/inspection/webui-write-path-audit.md]
---
# 결정 요청 (B16) — "사본 == 원본" 불변식으로 레지스트리 표류를 구조적으로 막기

## 문제 — 같은 결함이 이번 세션에만 5회 반복됐다
TBox/디스크가 **진실**인데 파이썬 **리터럴이 그 사본**이고, 사본이 조용히 뒤처지는 결함이 반복된다.
전부 **에러 없이 조용한 축소**로 나타나 (개체가 카운트·retrieve·그래프뷰에서 사라짐) 발견이 늦다:
- **B3** `INSTANCE_CLASSES` 누락 · **B8** abox glob · **B13** `ttl_writer.ORDER` · **B14**
  `INSTANCE_LINK_PREDICATES` · 그리고 DA-4 reorg 때 **recipe catalog 경로 누락**(조용한 부분 closure 41).

## 실측 — 가드는 catalog 하나뿐, 나머지는 여전히 무방비
- ✅ `tools/gen_recipe_catalog.py --check`: catalog가 `recipes/*/`·중앙과 일치하는지 CI에서 검사(B0-b).
- ❌ **`INSTANCE_CLASSES`**(`ontology_lib.py:76`)는 여전히 **리터럴 set** — TBox에 새 클래스를 추가하고
  여기 안 넣으면 그 클래스 개체가 `instance_nodes`에서 증발(카운트·reachability·retrieve 오염). 가드 없음.
- ❌ **`ttl_writer.ORDER`**(`ttl_writer.py:41`)도 리터럴 list — TBox 술어와 동기화 가드 없음(B13은
  merge로 손실은 막았으나 "목록==술어" 불변식은 없음).
이 둘은 **개별 패치로 고쳐도 다음 스키마 추가에서 또 뒤처진다** — 구조적 가드가 없으면 재발한다.

## 선택지
- **(A) "사본 == TBox 파생" 검사 축 추가 (inspection 권고).** validate.py(또는 전용 스모크)에 불변식:
  1. `INSTANCE_CLASSES` **==** TBox에서 파생한 집합(`rdfs:subClassOf* ho:HarnessComponent` leaf +
     SpecConcept leaf 등 실제 인스턴스화되는 클래스). 불일치면 **FAIL**(어느 클래스가 누락/잉여인지 출력).
  2. `ttl_writer.ORDER` **⊇** 인스턴스에 실제로 나타나는 모든 `ho:` 술어(TBox ObjectProperty+DatatypeProperty
     중 instance-scoped). 누락 술어 있으면 FAIL.
  현재 드리프트가 있으면 이 검사가 **지금 바로 잡아준다**(착수 시 먼저 실측). materialize의 byte-identity·
  `check_determinism`·`gen_recipe_catalog --check`와 같은 계열의 "진실 대조" 가드.
- **(B) 리터럴 제거 = TBox에서 직접 파생.** `INSTANCE_CLASSES`/`ORDER`를 상수가 아니라 **TBox 질의로
  생성**. 사본 자체가 사라져 표류 불가능(가장 근본적). 다만 로딩 시 TBox 필요·성능·순서 안정성 고려.
- **(C) 현행 유지.** 개별 결함이 나올 때마다 패치. (권장 안 함 — 이미 5회 반복이 재발성을 입증.)

## 파급효과 (예비)
- (A): tools/validate.py + 검사 로직. 그래프·산출물·개체 무변경. **착수 즉시 현재 드리프트 유무를
  드러냄**(있으면 그 자체가 버그 발견). recipe federate는 중앙 validate를 쓰므로 union에도 자동 적용.
- (B): `ontology_lib`·`ttl_writer` 리팩터 + 순서 결정성 재확인(retrieve/materialize 소비처). 더 크지만 근본.
- 어느 쪽이든 **materialize byte-identity·8 recipe federate**로 회귀 0 확인(가드 추가는 출력 무변경이어야).

## 결정 필요
1. **A/B/C 중 무엇으로** (권고: **A** 먼저 — 싸고 즉시 현재 드리프트를 드러냄. 후속으로 B로 승격 가능).
2. **위반 시 FAIL vs warn** (권고: **FAIL** — 조용한 축소가 이 결함의 본질이므로 하드 게이트가 맞다.
   단 착수 시 현재 그래프가 통과하는지 먼저 실측; 드리프트가 이미 있으면 그 수정을 먼저).

승인 시 `status: open` → `approved` + 답. 저작은 developer dispatch, inspection이 검증(negative control
포함: 리터럴에서 한 항목을 빼면 FAIL 하는지). 근거: inspection memory `webui-write-path-audit.md §3`.
