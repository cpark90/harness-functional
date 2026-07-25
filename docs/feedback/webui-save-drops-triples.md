---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/webui/ttl_writer.py, tools/webui/server.py, tools/ontology_lib.py, core:chan-dispatch, core:role-inspection]
kind: defect
related: [docs/plans/OPEN-ISSUES.md, docs/feedback/retrieve-pack-quality-defects.md]
---
# 결함 3건 — web UI로 노드를 저장하면 온톨로지 내용이 조용히 삭제된다 (B13·B14·B15)

`ttl_writer.abox_files()`의 glob 결함(§B8)을 고치던 developer가 같은 파일에서 발견하고,
inspection이 **독립 재현**해 수치를 확정했다. 셋 다 web UI의 쓰기 경로에 있고, **B13은
데이터 손실**이라 심각도가 가장 높다. 재현은 전부 **read-only**로 했다 —
`ttl_writer.plan_upsert()`는 텍스트를 계산만 하고 쓰지 않으며, SHACL 판정은 in-memory 그래프
복사본에서 했다. **실제 저장은 한 번도 하지 않았다**(`git status` 무변화 확인).

> ★ **B13이 살아 있는 동안 web UI로 기존 노드를 저장하지 말 것.** 저장 성공(`saved: true`)이
> 곧 무손실을 뜻하지 않는다.

---

## B13 — 저장이 화이트리스트 밖 술어를 삭제한다 (데이터 손실)

### 원인 (코드 경로)
1. `GET /api/node/{id}` (`server.py:169`)는 리터럴 값을 **`DATA_PREDS` 7종**만 돌려준다.
   그 밖의 리터럴 술어는 응답에 **아예 없다** — 편집기가 값을 본 적이 없으니 되돌려 보낼 수도 없다.
2. `render_block()` (`ttl_writer.py:73`)은 **`ORDER` 28종만** 렌더한다. 프런트엔드가 보낸
   값이라도 목록 밖이면 조용히 버린다.
3. `_replace_block()` (`ttl_writer.py:140`)은 기존 블록을 **통째로 치환**한다. 즉
   **저장 = 목록 밖 술어 삭제**다. 병합이 아니다.

TBox의 `ho:` 술어는 **97종**(ObjectProperty 57 + DatatypeProperty 40)인데, 쓰기 경로가 아는 것은
`ORDER` **28종**뿐이다.

### 실측 (inspection 독립 재현, read-only)
자산 그래프(`reason=False`)에서 개체가 실제로 갖는 술어를 세고, 프런트엔드 의미론
(`Editor.svelte`: `DATA_PREDS` 7종 + 스키마 objectProperty 전부 재전송)을 그대로 흉내내
"손대지 않고 열었다 저장만" 했을 때의 손실을 계산했다.

```
instance nodes                                        205
개체가 실제로 갖는 서로 다른 술어                       81
그 중 ttl_writer.ORDER에 없는 것                        56
1개 이상 트리플을 잃는 개체                         82 / 205
코퍼스 전체에서 사라지는 트리플                        375
그 중 GET 응답에조차 안 실리는 리터럴          135 (23종)
```

가장 많이 사라지는 술어: `roleGuardrail 33` · `channelParticipant 25` · `hasRole 17` ·
`unobserved`/`observationKind`/`observesMemory` 각 15 · `sectionKind`/`assemblyOrder`/
`hasAssemblySection` 각 12 · `roleTool 11` · `hasStep`/`stepByRole`/`stepOrder`/
`hasAreaOfObservation`/`observedTokenVolume` 각 10.

손실 개체를 최특정 타입으로 묶으면 **최근 확장한 축이 통째로 노출**된다:
`AssemblySection 12` · `WorkflowStep 10` · `AreaOfObservation 10` · `Role 8` · `Channel 6` ·
`Agent 5` · `ObservationSpace 5` · `AreaOfInterest 5` · `Harness 4` · `Memory 3` ·
`PromptSection 3` · `Workflow 3` · `FailurePolicy 2` · `TestScenario 2` (외 4).

### validate 게이트는 절반만 막는다 (이게 핵심)
서버는 저장 후 `validate.py`가 FAIL이면 `restore()`한다. 그래서 **shape이 요구하는 술어는
우연히 방어**되지만 **선택 술어는 초록인 채로 사라진다**. 82개 개체를 하나씩 손실시켜
SHACL을 돌려 분류했다:

```
저장이 조용히 성공하며 데이터가 사라지는 개체     27  (131 트리플)
validate FAIL → restore로 저장 자체가 거부되는 개체 55  (244 트리플)
```

즉 web UI는 **27개 개체에 대해 파괴적이고, 55개 개체에 대해서는 아예 편집이 불가능**하다.
조용히 사라지는 쪽 상위: `chan-dispatch 8` · `chan-workspace 8` · `role-inspection 8` ·
`role-research`/`role-developer`/`role-vnv`/`role-inspection-worker`/`chan-task-board` 각 7 ·
`chan-peer`/`role-design`/`role-orchestrator`/`role-synthesizer` 각 6.

### 대표 사례 — `id:chan-dispatch` (9줄 → 6줄, 8 트리플 소실)
`ontology/abox/core/organization/channels.ttl`. 손대지 않고 열었다 저장만 했을 때:

```
사라짐: ho:channelParticipant (6개 Role 전부) · ho:involvesUser · ho:channelMedium
남음  : prefLabel · altLabel · definition · tagged · maturity   (ORDER 안에 있으므로)
```
그리고 **validate는 PASS** 한다 — 채널의 참가자 전원이 그래프에서 사라졌는데도.

> 브리프에 적힌 "9줄 → 2줄, definition·tagged·maturity까지 소실"은 **재현되지 않았다**.
> 그 셋은 `ORDER`에 있어 보존된다. 정정된 수치는 위와 같다(손실은 3술어·8트리플).
> 심각도 판단은 달라지지 않지만, 기록은 실측값으로 남긴다.

### 수정 선택지 (결정 필요)
- **(A) 화이트리스트 확장** — `ORDER`(28→97)와 `server.DATA_PREDS`(7→40)를 TBox 전 술어로 채운다.
  *장점*: 최소 구조 변경, 편집기가 모든 필드를 실제로 편집 가능해진다(UI의 원래 의도에 가장 가깝다).
  *단점*: **같은 결함이 재발**한다 — 술어를 새로 만들 때마다 두 목록을 갱신해야 하고, 잊으면
  다시 조용한 삭제다(이번 §B3·§B8과 똑같은 "레지스트리 표류" 계열). TBox에서 목록을 **생성**하면
  재발을 막지만, 그러면 `ORDER`가 정하던 **저작 순서(ONTOLOGYSTYLE §3)** 를 별도로 표현해야 한다.
- **(B) 블록 치환 대신 술어 병합** — `_replace_block`이 기존 블록을 파싱해, **요청이 명시적으로
  언급한 술어만** 교체하고 나머지 줄은 원문 그대로 보존한다.
  *장점*: 화이트리스트가 뒤처져도 **손실이 구조적으로 불가능**하다. 편집기가 모르는 술어는 건드리지 않는다.
  *단점*: "값 삭제"를 표현하려면 명시적 삭제 신호가 필요하고(빈 값 = 무시가 되므로), 텍스트
  블록 파서가 지금보다 복잡해진다(주석·다중값·줄바꿈 보존).
- **(C) 저장 전 손실 diff 경고** — `plan_upsert`가 **사라질 트리플 목록**을 계산해 반환하고,
  서버는 손실이 있으면 저장을 거부하거나(strict) 사용자 확인을 요구한다.
  *장점*: 작고, **가드가 데이터가 아니라 정책**이라 재발해도 조용하지 않다. (A)/(B) 어느 쪽을
  택하든 **회귀 가드로 함께 두는 값어치**가 있다.
  *단점*: 단독으로는 편집 불가 노드가 늘어난다(현재 55 → 82).
- **(D) 편집 대상 축소** — web UI가 `ORDER` 술어만 가진 노드만 편집 가능하게 하고 나머지는
  read-only로 표시. *장점*: 정직함. *단점*: 205개 중 82개가 read-only가 되어 UI의 효용이 크게 준다.

**inspection 권고: (B) + (C)**. (B)가 손실을 구조적으로 불가능하게 만들고, (C)가 그 보증을
**검사 가능한 불변식**("저장 계획이 삭제하는 트리플 수 = 0, 명시적 삭제 제외")으로 바꾼다.
(A)는 단독이면 이번과 같은 표류가 반드시 재발한다 — 다만 (B)를 택하더라도 **편집 가능 필드를
늘리려면** 결국 필요하므로, TBox에서 목록을 생성하는 형태의 (A)를 **후속**으로 두는 것이 좋다.
어느 쪽을 택할지는 **"web UI가 온톨로지 전체 편집기인가, 핵심 필드 편집기인가"** 라는 범위
결정에 달려 있으므로 사용자 결정이 필요하다.

---

## B14 — `INSTANCE_LINK_PREDICATES`에 asserted 관계 9종 누락 (78 edge)

§B3(개체 누락)의 자매 결함이다. `ontology_lib.instance_edges()`가 화이트리스트로 걸러내는데,
개체→개체 asserted 관계 중 **9종·78 edge**가 목록에 없다.

```
channelParticipant 25 · observesMemory 15 · observesChannel 8 · hasChannel 6 · agentFunction 6
observesComponent 5 · agentRole 5 · hasAgent 5 · hasMemory 3
```

`hasChannel`·`hasMemory`·`hasAgent`(14 edge)는 `rdfs:subPropertyOf ho:hasComponent`라 **추론이
켜져 있을 때만** `hasComponent`로 잡힌다. 나머지 **6종·64 edge는 추론과 무관하게 안 보인다.**

영향 소비자는 셋이다 — `instance_edges()`를 쓰는 곳이 그 전부다:
`server.py:150`(그래프 뷰, **asserted 그래프**라 78 전부 안 보임) ·
`retrieve.py:160,249`(팩 전파와 이웃 탐색) · `validate.py:67`(reachability).
결과: §B3로 **노드는 보이게 됐는데 관측·채널 관계는 여전히 안 보인다** — 그래프 뷰에서
`AreaOfObservation`이 무엇을 관측하는지, 채널에 누가 참여하는지 표시되지 않고, retrieve의
이웃 확장도 그 방향으로는 전파되지 않는다.

**선택지**: (A) 9종을 목록에 추가(§B3와 같은 처방, 같은 표류 위험) ·
(B) 화이트리스트 대신 **TBox에서 파생**(`rdfs:range`가 개체 클래스인 ObjectProperty를 자동 수집) ·
(C) 목록은 두되 **누락 탐지 검사**를 추가(asserted 개체→개체 술어 중 목록 밖인 것 0개).
inspection 권고: **(B) 또는 (A)+(C)**. B13 선택지 (A)의 "TBox에서 생성" 논점과 **같은 결정**이므로
함께 정하는 편이 낫다.

---

## B15 — `abox_mtimes()`가 basename을 키로 써서 낙관적 잠금이 뭉개질 수 있다

`server.py:105`가 `{basename: mtime}`을 만들고 `ttl_writer._check_mtime()`이 같은 키로 조회한다.
현재 abox 18파일의 basename은 **전부 유일**해서 무해하지만, DA-4 그룹 디렉토리 구조에서는
`core/spec/patterns.ttl`과 `core/process/patterns.ttl` 같은 동명 파일이 **자연스럽게 생긴다**.
그 순간 두 파일이 한 키를 공유해 충돌 감지가 조용히 어긋난다(엉뚱한 파일의 mtime과 비교).
`ABOX_DIR` 기준 **상대경로**가 올바른 키다. 지금 고치면 1줄, 나중에 고치면 재현 어려운
덮어쓰기 버그다. **선택지 없음 — 상대경로 키가 유일한 정답**이므로 승인만 필요하다.

---

## 근거 (재현 명령 — 전부 read-only)
```bash
# B13 집계: 205 노드에 대해 GET->SAVE 왕복 손실 계산 (plan_upsert는 쓰지 않는다)
#   → 82/205 노드, 375 트리플, 56 술어
# B13 게이트 분류: 개체별로 손실을 적용한 in-memory 그래프에 SHACL
#   → 조용한 손실 27 노드/131 트리플, 거부 55 노드/244 트리플
# B13 대표: id:chan-dispatch 블록 9줄 -> 6줄, channelParticipant·involvesUser·channelMedium 소실
/usr/bin/python3 -c "import sys;sys.path.insert(0,'tools/webui');import ttl_writer;print(len(ttl_writer.ORDER))"   # 28
/usr/bin/python3 -c "import sys;sys.path.insert(0,'tools');import ontology_lib as l;print(len(l.INSTANCE_LINK_PREDICATES))"
grep -n "DATA_PREDS" tools/webui/server.py            # 7종
grep -n "_replace_block\|basename(path)" tools/webui/ttl_writer.py tools/webui/server.py
```
집계 스크립트는 scratchpad에서 돌렸고 repo에 남기지 않았다(파일 경계). 위 수치는 이 세션에서
`git status` 무변화를 확인하며 실측한 값이다.
