# Dispatch brief — 정합성 정리 3건 (INSTANCE_CLASSES · webui glob · 스타일표)

> 작성: orchestrator (2026-07-25, 자율 루프). 상위 목표: 사용자 goal "온톨로지가 **통일성과 건전성**있게
> 정리되고 충분히 세분화" (`docs/plans/OPEN-ISSUES.md`). 대상: §B.3 · §B.8 · §B.10.
> 실행: **developer dispatch (opus)**. ★**선행 조건: inspection의 land가 끝나 작업트리가 clean일 때 fire.**
> (지금 fire하면 inspection이 커밋 중인 `tools/`와 충돌한다.)

## C1 — `INSTANCE_CLASSES`에 leaf 클래스 7개 누락 (§B.3)

### 실측 진단 (orchestrator, 읽기 전용)
```
lib.load_graph()            → instance_nodes 205
lib.load_graph(reason=False)→ instance_nodes 173      # 32개체 증발
len(INSTANCE_CLASSES) = 26
```
누락 leaf 7클래스 = **32개체**: `Agent`(5) · `AreaOfInterest`(5) · `AreaOfObservation`(10) ·
`ObservationSpace`(5) · `Memory`(3) · `TestScenario`(2) · `FailurePolicy`(2).

**왜 지금까지 안 드러났나**: `owlrl` 추론이 상위클래스(`HarnessComponent`·`SpecConcept` 등)를 채워주면 그
상위클래스가 `INSTANCE_CLASSES`에 있어 잡힌다. 즉 **추론이 결함을 가려왔다**. 추론 없이 로드하는 경로에서는
32개체가 통째로 보이지 않으므로 **도구 경로마다 개체 수가 달라진다** — 건전성 결함이다.
(DA-4 중간 superclass들이 진단 출력에 함께 뜨지만 그건 **추론된 타입**이라 등록 대상이 아니다. asserted leaf만 등록한다.)

### 작업
- `tools/ontology_lib.py`의 `INSTANCE_CLASSES`에 위 **7 leaf 클래스**를 추가. **중간 superclass는 넣지 말 것**
  (추론 타입이며, 넣으면 같은 개체가 여러 경로로 중복 계수될 위험).
- 추가 후 `load_graph(reason=False)`와 `load_graph()`의 `instance_nodes` 수가 **일치(205)** 해야 한다. 이것이 수용 기준이다.

### 예상 파급 (확인만, 회귀 아님)
`MANIFEST.json`의 `types` 표기가 상위클래스(`HarnessComponent`)에서 **구체 leaf**(`TestScenario` 등)로 바뀔 수 있다.
그게 목적이다. 단 **CLAUDE.md 본문은 바뀌면 안 된다** — 바뀌면 보고하라.

## C2 — webui가 DA-4 재조직 이후 abox를 하나도 못 읽는다 (§B.8)

`tools/webui/ttl_writer.py:97 abox_files()`가 평면 glob `ontology/abox/*.ttl`을 쓴다. DA-4 재조직으로 파일이
전부 그룹 디렉토리로 옮겨져 **그 패턴이 잡는 파일은 0개**(실제 18개). **에러 없이 빈 목록**을 반환하는,
catalog 누락과 같은 **조용한 실패** 계열이다.

### 작업
- glob을 재귀(`ontology/abox/**/*.ttl` 등)로 고쳐 18개를 잡게 하라. 경로 순서는 **결정적**으로(정렬).
- 같은 파일의 데이터 술어 화이트리스트에 관측 계열 술어가 전부 빠져 있다(`observationKind`·`observesChannel`·
  신규 `observedTokenVolume` 등). **이번 범위는 glob 수정까지**로 하고, 화이트리스트는 **현황만 보고**하라
  (편집 UI의 의도된 범위인지 판단이 필요하다 — 임의 확장 금지).
- webui에 실행 가능한 스모크가 있으면 돌리고, 없으면 `abox_files()`가 18개를 반환하는지 최소 확인.

## C3 — `ONTOLOGYSTYLE.md` §3 predicate order에 `ho:observedTokenVolume` 자리 없음 (§B.10)

신규 술어가 표에 없어 다음 저작자가 자리를 임의로 정하게 된다(스타일 문서가 단일 진실 공급원인데 비어 있음).
현재 실제 저작 관례는 `ho:observedTokenVolume ; ho:tokenEstimate ; ho:maturity` 순이다.

### 작업
- §3의 **7번 데이터 그룹**에 `ho:observedTokenVolume`을 위 순서로 등재.
- 같은 절에 한 줄 계약을 덧붙여라: **`ho:tokenEstimate`는 노드 자신의 텍스트 비용**이고,
  **`ho:observedTokenVolume`은 AoO의 런타임 관측량**이며 **둘을 섞지 않는다**(이 혼동이 실제로 팩을 잘랐다).
- §2 네이밍표는 이번 대상이 아니다(술어이지 개체 접두사가 아님).

## 완료 게이트 (로그 첨부)
```bash
/usr/bin/python3 -c "import sys;sys.path.insert(0,'tools');import ontology_lib as l;\
print(len(l.instance_nodes(l.load_graph())), len(l.instance_nodes(l.load_graph(reason=False))))"   # 205 205
/usr/bin/python3 tools/validate.py            # PASS @205
/usr/bin/python3 tools/check_determinism.py   # PASS
/usr/bin/python3 tools/materialize.py h-multiagent ...   # CLAUDE.md 무변경, MANIFEST types 변화만
/usr/bin/python3 -c "import sys;sys.path.insert(0,'tools/webui');import ttl_writer;print(len(ttl_writer.abox_files()))"  # 18
```

## 금지
- 온톨로지 **개체·TBox·shapes 변경 금지**(이번 건은 tools·문서 정합성 수정이다). 신규 어휘 0.
- `docs/plans/**`·`docs/feedback/**` 편집 금지(orchestrator·inspection 소유). **git 조작 금지.**

## 반환 보고
① C1 전후 개체 수(205/205 증명) + MANIFEST types 변화 ② C2 glob 수정과 18개 확인 + 화이트리스트 현황 보고
③ C3 반영 문구 ④ 게이트 로그 ⑤ CLAUDE.md 무변경 확인 ⑥ GAP.
