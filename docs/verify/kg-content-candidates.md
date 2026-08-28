---
kind: pre-wave measurement (A-wave 선행 실측)
verdict: 후보 탐색 완료 — alternativeOf 진짜 대안 0건, Anchor 가중 근거 없음, layering은 사용자 결정
scope: ho:alternativeOf / ho:overlapsWith / ho:Anchor+anchorConfidence / skos:broader 계층
observed_at: 2026-08-28 13:19–13:32 (+09:00)
graph_baseline: HEAD 04e0825 (pinned worktree) — 269 individuals, validate.py PASS
live_tree_note: 병행 세션(sim-hil B-wave)이 같은 워킹트리를 편집 중 — §3.2 참조
authored: nothing (판정·측정 전용; ontology/ 무수정)
---

# KG 내용 반영 후보 실측 — A-wave 선행 판정

`docs/feedback/verified/annotation-backbone-architecture.md` 말미의 inspection 실측("메커니즘은
섰고 내용은 비어 있다")이 요청한 **A-wave 선행 후보 탐색**. **저작은 하지 않았다** — 무엇을
저작해야 하는지, 그리고 저작할 것이 실제로 있는지를 증거로 판정한다.

## 0. 관측 조건 (재현 전제)

- **인터프리터**: `/usr/bin/python3` (rdflib 7.6.0 · pyshacl 0.40.0 · owlrl 7.6.2).
- **기준 그래프**: 병행 세션이 워킹트리의 `ontology/`를 실시간 편집 중이므로(관측 시작 13:19에
  `ontology/**` 8파일이 uncommitted, 13:24에 `AutonomyTier` 등 신규 TBox 유입 확인) 모든 수치는
  **HEAD `04e0825`에 핀 고정한 별도 worktree**에서 측정했다:

  ```bash
  git worktree add --detach <scratch>/wt-head HEAD
  /usr/bin/python3 <scratch>/wt-head/tools/validate.py   # -> PASS, 269 individuals
  ```

  워킹트리 기준으로 처음 돌린 baseline(13:19)과 핀 고정본의 수치가 **완전히 일치**함을 확인했다
  (269 individuals / 140 `ho:tagged` / 42 Concept / 11 top / 31 `skos:broader` / depth 1 /
  `ho:salience` 5). 즉 아래 §1·§2·§4의 판정은 병행 웨이브에 오염되지 않았다.
- **주입 실험**은 전부 핀 worktree 안에서 수행하고 매 케이스마다 원본으로 복원했다. 종료 시
  `git status --porcelain` 빈 출력 + `validate.py` PASS로 무오염을 확인했다. **저장소
  워킹트리는 한 바이트도 건드리지 않았다.**

## 0.1 결론 요약

| 축 | 후보 수 | 판정 |
|---|---|---|
| ① `ho:alternativeOf` (진짜 대안) | **0** | **저작하지 말 것** — 4개 탐색 방법 전부 음성 |
| ① `ho:overlapsWith` (부분 겹침) | **2** | **사용자/orchestrator 결정 필요** (판단성 저작) |
| ① 중복(=병합 대상 drift) | **0** | 조치 불요 |
| ② `ho:Anchor` + `anchorConfidence` | **0** | **저작하지 말 것** — 가중 도입 근거 없음 + 소비자 부재 |
| ③ layered skeleton | 案 2개 | **사용자 결정 필요** (案 A 권고, ripple 0 실측) |

---

## 1. 축 ① — 대안 서술 후보 (`alternativeOf` / `overlapsWith`)

네 가지 독립 방법으로 전수 탐색했다. 모수는 매번 명시한다.

### 1.1 방법 (a) — 중복/근사 라벨 축

**모수**: 269 individual 전수, `C(269,2)=36,046` 쌍.

| 측정 | 결과 |
|---|---|
| `validate.py`의 클래스 내 중복 라벨 경고 | **0건** (`✓ no duplicate labels within a class`) |
| 클래스 **횡단** 완전 동일 `skos:prefLabel` | **13건** |
| 라벨 토큰 Jaccard ≥ 0.4 | **195쌍** (same-class 134 / cross-class-no-Concept 37 / Concept-vs-other 24) |

**13건의 완전 동일 라벨은 전부 `Concept ↔ {Guardrail, Capability, Workflow}`** 이다
(`c-bounded-context`↔`gr-bounded-context`, `c-multiagent`↔`cap-orchestration`,
`c-composition`↔`wf-compose-harness` 등). 이는 "영역 이름 ↔ 그 영역을 차지하는 규칙/역량"
패턴이며, **13건 중 10건은 이미 `ho:tagged`로 명시 연결**되어 있다(나머지 3건은 Capability인데
`cap-*`가 태그를 하나도 안 갖는 구조적 사유 — §1.5 참조). 즉 관계가 없어서 남은 중복이 아니라
**이미 다른 술어로 표현된 쌍**이다.

same-class 134쌍은 클래스별로 `AssemblySection 68 / AreaOfObservation 25 / Agent 10 /
AreaOfInterest 10 / ObservationSpace 10 / SystemPrompt 6 / PromptSection 2 / Contract 1 /
Hook 1 / Workflow 1`. 상위 5개(123쌍, 92%)는 라벨이 **템플릿**(`"Assembly: X section"`,
`"<Role> internal observation"`)이라 토큰 Jaccard가 구조적으로 높게 나오는 **방법의 오탐**이다.

**방법 (a) 판정: 진짜 대안 0건.**

### 1.2 방법 (b) — 같은 `ho:tagged` 개념 집합을 공유하는 동일 클래스 노드군

**모수**: `ho:tagged`를 가진 117 노드 (140 엣지, 42 Concept).

- (class, 태그집합) 완전 일치 그룹 **19개 / 71 노드**. 최대 그룹은 `Role × {c-multiagent}` 10개,
  `Deliverable × {c-composition}` 7개, `DesignPattern × {c-pattern-taxonomy}` 7개.
- 동일 클래스 + 태그 ≥1 공유 쌍 **231쌍**.
- 클래스 무관 + 태그 ≥1 공유 쌍(= `AlternativeOfSharedAnchorShape` 통과 가능 집합) **948쌍**.

19개 그룹을 전수 검토한 결과 **모두 상보(sibling)** 다: `role-*` 10개는 서로 다른 역할,
`dlv-*` 7개는 한 워크플로가 산출하는 서로 다른 산출물, `pat-*` 7개는 서로 다른 조정 패턴,
`chan-*` 6개는 서로 다른 통신 채널, `mode-*` 4개는 서로 다른 실행 모드. **같은 태그를
공유한다는 것은 같은 영역을 *다르게 설명한다*가 아니라 같은 축의 *다른 값*이라는 뜻**이며,
이는 이 저장소의 정상 모델링이다.

**방법 (b) 판정: 진짜 대안 0건.** (부수 관측: 이 방법은 `AlternativeOfSharedAnchorShape`가
왜 약한지도 보여준다 — §4.2.)

### 1.3 방법 (c) — `skos:definition`/`ho:promptText` 토큰 Jaccard (결정론적, 외부 의존 없음)

**모수**: 내용 토큰 ≥8개인 246 노드 (269 중), `C(246,2)=30,135` 쌍. 불용어 제거 후 3자 이상
소문자 토큰 집합의 Jaccard.

| 통계 | 값 |
|---|---|
| median | 0.016 |
| p95 | 0.075 |
| p99 | 0.152 |
| max | **0.818** |
| ≥0.30 | 68쌍 |
| ≥0.40 | 39쌍 |

상위 39쌍의 성분은 셋뿐이다:

1. **파라메트릭 템플릿 형제** (`oa-*-internal` 5개 상호쌍이 J 0.54–0.82, `os-*` 5개, `ct-*` 2개).
   실제 텍스트를 대조하면 `oa-developer-internal` = "The developer's introspection over its own
   constituent parts: its role and its task-scoped cache memory."이고
   `oa-synthesizer-internal`은 주어만 다른 같은 문장이다. 구분은 산문이 아니라
   `ho:observesComponent`(role-implementer vs role-synthesizer)가 진다. **에이전트별 인스턴스
   = 상보**이며 대안이 아니다. 태그도 0이라 shape 자격조차 없다.
2. **`Concept ↔ Guardrail` 영역-이름 쌍** (J 0.44–0.74, 예: `c-report-over-prompt` 0.737).
   §1.1과 같은 집합. **구조적으로 `alternativeOf` 불가**(§4.1 T6 실증).
3. **`Capability ↔ Guardrail`**(`cap-traceability`↔`gr-traceability` 0.550) — 역시 태그 미공유.

**shape 자격(태그 공유)과 텍스트 유사도를 교차**시키면 후보가 급격히 줄어든다:

| 필터 | 쌍 수 |
|---|---|
| 태그 공유 (shape 통과 가능) | 948 |
| 태그 공유 ∧ defJ ≥ 0.30 | **10** |
| 태그 공유 ∧ defJ ≥ 0.40 | **2** |
| 태그 공유 ∧ defJ ≥ 0.50 | **1** |

유일한 ≥0.50 쌍이 `gr-well-formed-skill ↔ ins-well-formed-skill` (J=0.552, 공유 태그
`c-skill-authoring`)이고, 나머지 9쌍은 `agent-*` 상호쌍(0.25–0.41), `chan-peer↔pat-peer-mesh`
(0.384), `h-peer-mesh↔pat-peer-mesh`(0.351, **이미 `ho:appliesPattern`으로 연결됨**),
`dlv-*` 상호쌍(0.31–0.33)으로 전부 상보다.

**방법 (c) 판정: 진짜 대안 0건, `overlapsWith` 후보 1건.**

### 1.4 방법 (d) — `skos:altLabel` 충돌 (보강 방법)

**모수**: `prefLabel` + `altLabel` 전 리터럴.

2개 이상 노드가 공유하는 라벨 문자열 **28건**. 27건은 §1.1과 같은 `Concept ↔ 규칙/역량` 패턴
(`'anti-drift'`, `'yagni'`, `'no time assumptions'` 등 — 개념의 별칭과 그 개념을 집행하는
guardrail의 별칭이 같은 것). **단 1건만 다른 성격**이다:

- `'peer message mesh'` = `chan-peer` [Channel] ↔ `pat-peer-mesh` [DesignPattern],
  공유 태그 `c-multiagent`, defJ 0.384, **직접 엣지 없음**.

**방법 (d) 판정: 진짜 대안 0건, `overlapsWith` 후보 1건(추가).**

### 1.5 축 ① 후보별 판정

| 후보쌍 | 발견 방법 | shape 자격 | 판정 |
|---|---|---|---|
| `gr-well-formed-skill` ↔ `ins-well-formed-skill` | (c) J=0.552 | **통과**(`c-skill-authoring`) | **`overlapsWith`** (alternativeOf 아님 — §4.3에서 실해 실증) |
| `chan-peer` ↔ `pat-peer-mesh` | (d) altLabel + (c) J=0.384 | 통과(`c-multiagent`) | **`overlapsWith`** (판단성 — 결정 필요) |
| `Concept↔Guardrail/Capability` 13쌍 | (a)(c)(d) | **불가** (Concept은 `ho:tagged` 0) | 관계 불요 — 10/13은 이미 `ho:tagged`로 표현됨 |
| `oa-*-internal` 등 템플릿 형제 (≈123쌍) | (a)(c) | 불가(태그 0) | 상보 — 파라메트릭 인스턴스 |
| 동일 태그집합 19군 71노드 | (b) | 통과 | 상보 — 같은 축의 다른 값 |
| `h-peer-mesh↔pat-peer-mesh`, `chan-peer↔h-peer-mesh` | (b)(c) | 통과 | **이미 표현됨** (`appliesPattern`/`hasChannel`) |

- **진짜 대안(= `alternativeOf` 대상): 0건.** 네 방법 전부의 음성 결과로 뒷받침된다.
- **부분 겹침(= `overlapsWith` 후보): 2건.** 둘 다 "겹친다고 선언하는 것이 이득인가"가
  판단성이라 저작 지시가 아니라 **결정 항목**으로 올린다.
- **실은 중복(= 병합 대상 drift): 0건.**

**부수 발견 (A-wave 아님, 별도 note)**: `cap-*` 11개 Capability 전부가 `ho:tagged` 0이다.
그래서 `cap-orchestration`/`cap-synthesis`/`cap-traceability`와 같은 이름의 Concept 사이 관계가
그래프에 없다(§1.1의 13건 중 3건). 이는 annotation 결함이 아니라 **태그 커버리지 공백**이며,
필요하면 `ho:tagged` 3엣지로 닫힌다(신규 노드 0). A-wave와 분리해 처리할 것.

---

## 2. 축 ② — 가중 anchor 후보 (`ho:Anchor` + `anchorConfidence`)

### 2.1 다중 태그 분포 (모수: `ho:tagged` 140엣지 / 117 노드)

| 태그 수 | 노드 수 |
|---|---|
| 1 | 100 |
| 2 | 11 |
| 3 | 6 |
| ≥4 | 0 |

**다중 태그 노드는 17개(117 중 14.5%)** 뿐이고 최대 3개다. 가중이 의미를 가지려면 "한 노드가
여러 개념에 태그됐고 그 관련도가 명백히 다른" 지점이 있어야 하는데, 후보 자체가 17개다.

### 2.2 ★ 그중 6개는 `Anchor`를 달 수 없다 (TBox chain 제약)

`ho:hasComponent o ho:hasAnchor` chain은 **anchor를 harness가 이미 바인딩한 component에만**
붙일 수 있다. 실측: 다중 태그 17개 중 **6개가 `ho:Harness` 자신**(`h-coding`,
`h-harness-factory`, `h-multiagent`, `h-workspace-synthesis`, `h-peer-mesh`, `h-research`)이고,
이들은 어떤 harness의 component도 아니다. 즉 **태그를 가장 많이 지닌(3개) 노드군이 곧
anchor 부적격군**이다. 남는 적격 후보는 11개
(`mem-longterm`, `mem-cache`, `mem-firmware`, `role-auditor`, `role-author`, `role-benchmarker`,
`role-design`, `role-synthesizer`, `role-tester`, `wf-multiagent`, `wf-verify-harness`).

전체로 보면 **269 노드 중 91개(33.8%)가 anchor 부적격**이다:
`Concept 42 / DesignPattern 14 / Capability 11 / Harness 7 / Task 6 / Domain 4 /
ExecutionMode 4 / Constraint 1 / EnvironmentSpace 1 / GlobalState 1`. (§4.1 T2·T3에서
SHACL FAIL로 실증.)

### 2.3 ★ 부수 태그가 랭킹을 오염시키는가 — 실측

`retrieve.py`에서 `ho:tagged`는 traversal 엣지 가중 **고정 0.7**로만 쓰인다
(`PREDICATE_WEIGHT`, retrieve.py:54). 7개 질의로 **팩에 `ho:tagged` 엣지를 타고 들어온 노드**를
전수 추적했다(부모 엣지 기록형 traversal 재구현):

| 질의 | 팩 노드 수 | `ho:tagged` 경유 admit |
|---|---|---|
| "multi-agent orchestration with review" | 37 | **0** |
| "cache memory for an agent" | 35 | 1 (`c-multiagent` ← `mem-cache`) |
| "acceptance test coverage" | 16 | **0** |
| "long-term lesson memory" | 37 | 1 (`c-multiagent` ← `mem-longterm`) |
| "peer mesh coordination" | 24 | **0** |
| "structured output authoring role" | 15 | 1 (`role-author` ← `c-structured-output`) |
| "traceability audit oversight" | 46 | 2 |

`ho:tagged`가 팩 구성에 기여하는 몫은 질의당 **0–2 노드**다. 그중 대부분은 15토큰짜리 허브
개념 `c-multiagent` 자신이다.

**반사실 실험**(문제의 부수 태그 엣지 1개만 제거하고 팩 재계산):

| 케이스 | baseline | 반사실 | 팩 차이 |
|---|---|---|---|
| `mem-cache -tagged-> c-multiagent` 제거 | 35노드/892tok | 35노드/889tok | −`c-multiagent`, +`mc-opus` |
| `mem-longterm -tagged-> c-multiagent` 제거 | 37/900 | 36/900 | −`c-multiagent`,−`mc-opus`, +`dlv-validated-spec` |
| `role-auditor -tagged-> c-multiagent` 제거 | 46/896 | 46/893 | −`c-multiagent`, +`mc-opus` |
| `role-author -tagged-> c-structured-output` 제거 | 15/895 | 15/899 | −`role-author`,−`fp-source-unavailable`, +2 |

seed 집합은 4케이스 모두 **불변**. 부수 태그의 영향은 팩의 3–5% 노드에 그치고, 밀려나는 것도
"틀린 노드가 들어온다"가 아니라 **한계선의 자리바꿈**이다. 다중 태그 때문에 생긴
**오탐(잘못 끌려온 노드)도 미탐(빠진 노드)도 특정되지 않았다.**

### 2.4 ★ 결정타 — `anchorConfidence`를 읽는 소비자가 없다

```bash
grep -rn "anchorConfidence\|hasAnchor\|anchorTarget" tools/*.py
# -> tools/ontology_lib.py:86 (HO.Anchor, INSTANCE_CLASSES 등록)
#    tools/lint_uniformity.py:123 (PREFIX_MAP "anchor-")
#    그 외 0건
```

`retrieve.py`도 `materialize.py`도 `ho:anchorConfidence`를 **한 번도 읽지 않는다**. 랭킹 prior는
`ho:salience`(retrieve.py:140–141, `prior = 0.5 + salience`)뿐이고 태그 엣지 가중은 상수 0.7이며,
③에서 land한 영역당 1선별은 `anchorConfidence`가 아니라 **기존 `_rank_key`(score→maturity→IRI)**
로 승자를 정한다. 따라서 **오늘 Anchor 개체를 저작하면 어떤 투영에도 영향이 0**이다.

이는 TBox 산문과의 **doc-lag**이기도 하다. `ho:Anchor` 정의문(tbox:208)은 "CONSUMPTION: … the
read projection admitting ONE description per region … lands in a later stage — until then this
mechanism is DECLARED BUT DORMANT BY DESIGN"이라고 쓰지만, 그 stage(③)는 이미 land했고 **선별은
confidence를 읽지 않는 방식으로 구현**되었다. 즉 "later stage를 기다리는 중"이 아니라 "그
stage가 이 값을 안 쓰기로 결론났다"가 현재 사실이다. (본 보고서 소관 밖 — 문서 정정은 별도
lane 라우팅.)

### 2.5 축 ② 판정

**가중 도입 근거 없음.** 원칙 있는 근거 셋이 모두 부정이다: (i) 다중 태그 모수가 17개로 작고
최대 3개, (ii) 그중 6개는 chain 제약상 anchor 부적격이며 남은 11개에서 태그 간 관련도 격차를
"명백히 다르다"고 말할 근거가 실측되지 않았다(반사실 팩 차이 3–5%, 오탐·미탐 미특정),
(iii) 값을 소비하는 코드가 0줄이라 저작 효과가 정의상 0. **저작하지 말 것.**

> Anchor를 저작해야 하는 조건은 명확하다: 먼저 `retrieve.py`가 `anchorConfidence`를 랭킹에
> 반영하는 변경이 land하고, **그 변경이 고치는 구체적 오탐/미탐 질의가 제시**되어야 한다.
> 순서가 반대이면 값 없는 노드를 만드는 일이 된다.

---

## 3. 축 ③ — layered skeleton

### 3.1 현재 깊이 분포 (핀 고정 HEAD 기준)

| 측정 | 값 |
|---|---|
| Concept 총수 | 42 |
| `skos:topConceptOf id:scheme` (top) | 11 |
| `skos:broader` 엣지 | 31 |
| 깊이 분포 | `{0: 11, 1: 31}` — **최대 깊이 1** |
| 다중 부모 개념 | 0 |
| 고아(top도 broader도 아님) | 0 |

자식 수 분포는 `{0:4, 1:2, 2:2, 3:1, 11:2}`. 즉 **두 허브가 11자식씩 지고 있고
(`c-multiagent`, `c-agent-methodology`) top 4개는 자식이 없다**(`c-autonomy`, `c-memory`,
`c-oversight`, `c-safety`). inspection의 "깊이 1의 평면 구조" 판정은 정확하다.

### 3.2 ★ 병행 세션이 이미 depth 2 선례를 만들고 있다 (관측 2026-08-28 13:28)

워킹트리(uncommitted, sim-hil B-wave)를 그대로 파싱하면:

| 측정 | HEAD 04e0825 | live 워킹트리 13:28 |
|---|---|---|
| Concept | 42 | **68** |
| top | 11 | 12 |
| `skos:broader` | 31 | **56** |
| 최대 깊이 | **1** | **2** (깊이 2에 20개) |
| `ho:tagged` | 140 | 155 |
| `ho:salience` | 5 | **17** |
| `alternativeOf`/`overlapsWith`/`Anchor` | 0/0/0 | **0/0/0** |

깊이 2의 20개는 **전부 신규 top `c-operating-envelope` 아래**다
(`c-operating-envelope → c-envelope-{domain,task,…} → c-envelope-subject-matter …`). 즉
**"내용 구분 축으로 3층 계층"의 실제 선례가 이번 주 다른 lane에서 land 중**이다. B-wave 브리프는
HEAD 스냅샷이 아니라 이 선례를 기준으로 써야 한다(패턴: 신규 상위 개념 1 + 축 개념 5 + 속성
개념 15).

한편 늘어난 `ho:salience` 12개는 전부 `es-*`에 **일률 0.2**라 변별력이 없다 — 축 ②의 "가중은
값이 다를 때만 정보"라는 판정과 같은 맥락의 관측이다(그 lane 소관).

### 3.3 계층화 案 2종과 파급 실측

두 案을 in-memory로 구성해 **12개 질의 스위트**로 팩을 diff했다(질의: multi-agent/cache
memory/acceptance coverage/lesson memory/peer mesh/structured output/traceability/compose
harness/coding agent/research summariser/support triage/dispatch brief).

**案 A — 두 허브 아래에 중간층 삽입 (깊이 1 → 2, 잎은 그대로)**

`c-multiagent`의 11자식을 4군으로(`coordination-structure` / `scaling-execution` /
`coordination-governance` / `collaborative-product`), `c-agent-methodology`의 11자식을 5군으로
(`authoring` / `assurance` / `resilience` / `context` / `learning`) 묶는다.

| 항목 | 값 |
|---|---|
| 신규 Concept | **9** |
| 재배치되는 `skos:broader` | **22** (기존 엣지 재지정, 총 엣지 수 31→40) |
| `ho:tagged` 영향 | **0** — 태그는 전부 잎을 가리키고 잎은 안 옮겨진다 |
| `topConceptOf` 변화 | **0** |
| retrieve 팩 변화 | **0/12 질의** (dropped 0 / added 0) |

**案 B — 현 top 11개 위에 facet 상위층 추가 (subject / architecture / discipline)**

| 항목 | 값 |
|---|---|
| 신규 Concept | **3** |
| 재배치 | 11 (`topConceptOf` 제거 → 새 root로 `broader`) |
| `ho:tagged` 영향 | 0 |
| retrieve 팩 변화 | **1/12 질의** — "traceability audit oversight"에서 `Capability bindings`가 밀려나고 `Discipline facet`(신규 추상 노드)이 들어옴 |

**실증**: 案 A의 1개 그룹(`c-coordination-structure` + 4자식 재배치)을 실제 TTL로 주입해
`validate.py` **PASS** / `lint_uniformity.py` **PASS** / 깊이 분포 `{0:11, 1:28, 2:4}` 확인 후
복원했다. 신규 중간 개념은 `ConceptConnectivityShape`의 `sh:or`(inverse-broader 보유)로
통과하며, Concept이므로 `tokenEstimate`·`maturity`도 불요(§1c).

### 3.4 축 ③ 판정

계층화는 **retrieval 랭킹 관점에서 사실상 무료**다(案 A는 0/12, 案 B는 1/12이며 그 1건도
"추상 facet 노드가 팩에 끼어드는 노이즈" 쪽이다). 따라서 판단 기준은 성능이 아니라 **내용
구분이 실제로 존재하느냐**이며, 그것은 사용자 결정 영역이다.

- **권고: 案 A.** 파급이 잎에 닿지 않고(태그 0 영향, topConcept 0 영향), 실측 ripple이 정확히
  0이며, §3.2의 병행 선례(`c-operating-envelope` 서브트리)와 같은 모양이다. 부담이 큰
  두 허브(11자식)만 정확히 겨냥한다.
- **案 B는 비권고.** 얻는 것(상위 3개 facet)에 비해 유일한 실측 ripple이 팩 노이즈다.
- **어느 쪽도 "필수"는 아니다.** 깊이 1이 결함이라는 증거는 실측되지 않았다(오탐·미탐 미특정).
  "내용 구분에 따른 계층화"라는 **요구 자체의 충족** 문제로 결정하면 된다.

---

## 4. 축 ④ — 저작 비용·위험 (게이트 실측)

핀 worktree에 주입 → `validate.py`/`lint_uniformity.py` 실행 → 복원. 케이스마다 결과를 그대로 적는다.

### 4.1 `ho:Anchor` 게이트

| # | 주입 | 결과 |
|---|---|---|
| T1 | `anchor-longterm-lesson`(prefLabel + `anchorTarget c-lesson` + `anchorConfidence 0.6`) + `mem-longterm ho:hasAnchor …` | **validate PASS** (270 individuals), lint PASS |
| T2 | 같은 anchor를 **`h-multiagent`(Harness)** 에 부착 | **FAIL** — `Orphaned component: not wired into any Harness via hasComponent (or a sub-property).` |
| T3 | **`cap-skill`(Capability)** 에 부착 | **FAIL** — 같은 메시지 |
| T4 | `anchorConfidence 1` (정수 리터럴) | **FAIL** — `Anchor must have exactly one ho:anchorConfidence, a decimal within 0..1` |

- 노드 1개당 필요 트리플 4개(`a ho:Anchor`, `prefLabel`, `anchorTarget`, `anchorConfidence`)
  + 부착 엣지 1개. `maturity`·`tokenEstimate` **불요**(T1이 lint PASS로 실증).
- 슬러그 prefix는 **`anchor-`** 강제(`lint_uniformity.PREFIX_MAP`).
- **함정 1**: 소수는 반드시 `0.6` 형태로. `1`/`0`은 `xsd:integer`라 datatype FAIL(T4).
- **함정 2**: 부착 대상은 harness가 바인딩한 component여야 한다. Concept/Capability/Harness/
  DesignPattern/Domain/Task/ExecutionMode 등 **91노드는 원천 불가**(T2·T3).
- 파일: `ontology/abox/core/**` 중 부착 대상과 같은 유닛에 두면 된다(별도 유닛 불요).
  cap 260 token은 Anchor에 실질 무관(산문이 라벨뿐).

### 4.2 `ho:alternativeOf` 게이트 — shape의 이빨이 약하다

| # | 주입 | 결과 |
|---|---|---|
| T5 | `gr-well-formed-skill ho:alternativeOf ins-well-formed-skill` (공유 `c-skill-authoring`) | **PASS** |
| T6 | `c-report-over-prompt ho:alternativeOf gr-report-over-prompt` (공유 태그 없음) | **FAIL** — 대칭 추론으로 **violation 2건**(양 끝 각각 focus) |
| T7 | `gr-cite ho:alternativeOf gr-nodestruct` (공유 `c-safety`, **defJ = 0.000**) | **PASS** |
| T8 | `mem-cache ho:alternativeOf role-tester` (허브 태그 `c-multiagent`만 공유) | **PASS** |

**핵심 위험**: `AlternativeOfSharedAnchorShape`는 "태그 1개 공유"만 검사하므로 **의미적으로
무관한 쌍도 통과한다**(T7 defJ 0.000, T8). 허브 태그 하나만 보아도
**`c-multiagent` 태그 노드 41개 → 통과 가능 쌍 820개**, 전체로는 948쌍이다. 즉 잘못된
`alternativeOf`는 **게이트가 잡아주지 않는다** — A-wave에서 저작한다면 판정 책임이 전적으로
저작자에게 있다. (이것이 §1의 "0건" 결론을 보수적으로 유지해야 할 이유다.)

### 4.3 ★ 유일 후보를 `alternativeOf`로 저작하면 실해가 난다 — 실증

T5(`gr-well-formed-skill` ↔ `ins-well-formed-skill`)를 넣고 9개 skill 관련 질의로 팩을 diff했다.
③의 영역당 1-admit 규칙이 실제로 발화한다:

- 승자는 질의마다 갈린다. `"skill authoring capability provider"`에서는 Instruction이 이기고
  Guardrail이 탈락, `"well-formed skill"`·`"guardrail rule for well-formed skill shape"`에서는
  Guardrail이 이기고 **Instruction이 탈락**한다.
- **`ins-well-formed-skill`은 `ho:providesCapability id:cap-skill`의 유일 제공자**다. 이것이
  탈락한 팩에서는 capability 충족 근거가 사라진다. 실제로 질의
  `"harness factory composes new harnesses skill"`에서:

  ```
  gaps base = ['Code execution', 'File editing', 'Multi-agent orchestration']
  gaps alt  = ['Code execution', 'File editing', 'Multi-agent orchestration',
               'Skill authoring and packaging']      <- phantom gap
  ```

  저장소가 실제로 충족하는 `cap-skill`이 **팩에서 미충족 gap으로 보고**된다. 이는 vnv
  메모리(`retrieve-selection-verify.md` §4)가 예고한 "탈락분의 구조 엣지 동반 소실 → phantom
  gap" 결함 유형이 **실그래프 후보에서 재현된 첫 사례**다.
- 두 노드는 emission 대상도 다르다: Guardrail은 프롬프트 operating-rules 절로, Instruction은
  `.claude/skills/well-formed-skill/SKILL.md`로 나가고 `ct-well-formed-skill-*` 2개 계약이 그
  파일을 판정한다. **어느 하나가 다른 하나를 대신할 수 없다** = 정의상 `alternativeOf`가 아니라
  `overlapsWith`다(`overlapsWith` 정의문의 예시 "a guardrail and the workflow step that applies
  it"과 정확히 같은 모양).

`ho:overlapsWith`는 `retrieve.py`의 배제 대상이 **아니므로**(retrieve.py:192, `alternative_
clusters`가 `alternativeOf`만 읽음) 이 실해가 없다. 저작 비용은 대칭 엣지 1줄.

### 4.4 案 A(계층화) 비용

- 신규 Concept 9개 × (`a ho:Concept` + `prefLabel` + `definition` + `broader`) = 36 트리플,
  기존 `broader` 22줄 재지정. 파일은 `ontology/abox/core/vocab/concepts.ttl` 1개.
- 게이트: `ConceptConnectivityShape` 통과(§3.3 실증), `tokenEstimate`/`maturity` 불요,
  텍스트 cap 260 무관(정의 1–2문장).
- 위험: **신규 개념의 `prefLabel`이 기존 노드와 충돌하지 않게** 할 것(§1.1의 13건처럼
  Concept↔Guardrail 동명이 이미 관례이므로, 중간층은 **아무 노드도 안 쓰는 새 이름**이어야
  `validate.py` 중복 경고 축이 깨끗하다). 案 A의 9개 제안명은 모두 미사용 확인.

---

## 5. 결론 — A-wave 편성 지시

### 저작할 것

**없다.** 축 ①의 `alternativeOf`, 축 ②의 `Anchor`/`anchorConfidence` 모두 실재 근거 0이다.
"A-wave = 실재 대안쌍 발굴 → Anchor 개체 + confidence + alternativeOf 저작"이라는 후속 제안은
**선행 실측 결과 저작 대상이 존재하지 않으므로 그대로는 편성하면 안 된다.** 지어내면 golden
rule 2 위반이고, §4.2가 보였듯 게이트가 막아주지도 않는다.

### 저작하지 말 것 (근거 있는 부정)

1. **`ho:alternativeOf` 엣지** — 4개 독립 방법 전수 음성. 유일하게 shape·유사도를 동시에
   만족한 1쌍(`gr-` ↔ `ins-well-formed-skill`)은 저작 시 **phantom capability gap을 실제로
   유발**(§4.3 실측)하므로 명시적 부정 판정.
2. **`ho:Anchor` + `anchorConfidence` 개체** — 다중 태그 17노드 중 6노드는 chain상 부적격,
   나머지 11노드에서 가중 격차 근거 미실측, 그리고 **값을 읽는 코드가 0줄**이라 효과가 정의상 0.

### 사용자 결정 필요 (3건, 각각 대가 병기)

1. **`ho:overlapsWith` 2엣지를 저작할 것인가.**
   (a) `gr-well-formed-skill ↔ ins-well-formed-skill`, (b) `chan-peer ↔ pat-peer-mesh`.
   - 채택 시 대가: 판단성 저작 2줄. 팩 구성 변화 **없음**(overlapsWith는 배제 술어가 아님).
     annotation 어휘가 처음으로 non-zero가 되어 §4.2류 회귀 검사가 vacuous를 벗어난다.
   - 미채택 시 대가: `alternativeOf`/`overlapsWith`가 계속 0엣지 — 메커니즘 휴면 유지.
   - (이전 웨이브가 보류한 `gr-lang ↔ gr-standard-terms`는 defJ 0.167로 **후보 미달**임을
     실측했다 — 보류가 아니라 부정으로 종결 가능.)
2. **계층화 案 A를 실행할 것인가**(신규 Concept 9 + broader 22 재지정, retrieve ripple 0/12).
   - 채택 시 대가: 개념 재배치 1파일, 중간층 9개 이름을 새로 정해야 함(내용 구분 축의 정의는
     사용자 판단).
   - 미채택 시 대가: 두 허브가 11자식을 계속 짐. 단 **성능상 손해는 실측되지 않았다.**
   - §3.2의 병행 lane 선례(`c-operating-envelope`, 깊이 2)와 정합적으로 진행할지 함께 결정.
3. **축 ②를 "조건부 후속"으로 재편성할 것인가.** 즉 A-wave를 취소하는 대신 "① `retrieve.py`가
   `anchorConfidence`를 소비하는 변경 + 그것이 고치는 구체적 오탐 질의 제시 → ② 그 다음에 Anchor
   저작"이라는 순서로 전환할지. (현재는 소비자가 없어 저작이 무의미하다.)

### 라우팅 note (본 판정 소관 밖, 비차단)

- **TBox doc-lag**: `ho:Anchor` 정의문(tbox:208)과 `ho:alternativeOf` 정의문(tbox:637)의
  "CONSUMPTION … lands in a later stage / declared but unread"는 ③ land 후 **거짓**이다. 선별은
  land했고, 다만 `anchorConfidence`가 아니라 `_rank_key`로 승자를 정한다. 정정 대상.
- **`AlternativeOfSharedAnchorShape` 강도**: 공유 태그 1개만 요구해 948쌍(허브 하나로 820쌍)이
  통과한다. `alternativeOf` 사용을 실제로 시작한다면 shape 강화(예: 같은 클래스 요구, 또는
  탈락자의 `providesCapability` 보존 규칙)를 함께 검토할 것 — §4.3의 phantom gap은 현재
  shape로 막을 수 없다.
- **`cap-*` 태그 공백**: Capability 11개 전부 `ho:tagged` 0(§1.5). 신규 노드 0으로 닫히는
  별건.

---

## 부록 — 재현 명령

```bash
# 0) 관측 기준 고정
git worktree add --detach <scratch>/wt-head HEAD          # HEAD = 04e0825
/usr/bin/python3 <scratch>/wt-head/tools/validate.py      # PASS / 269 individuals

# 1) 후보 탐색 (4방법) — 스크립트는 <scratch>에 두고 sys.path를 wt-head/tools로
/usr/bin/python3 <scratch>/stats.py     # 클래스 히스토그램·태그 분포·개념 깊이
/usr/bin/python3 <scratch>/candA2.py    # (a) 라벨 Jaccard
/usr/bin/python3 <scratch>/candBC.py    # (b) 태그집합 그룹 + (c) 정의 Jaccard
/usr/bin/python3 <scratch>/candD.py     # 태그 커버리지 + shape-eligible 랭킹
/usr/bin/python3 <scratch>/edges.py     # (d) altLabel 충돌 + 기존 엣지

# 2) anchor 축
/usr/bin/python3 <scratch>/multitag.py       # 다중 태그 + chain 적격성
/usr/bin/python3 <scratch>/tagpath.py        # ho:tagged 경유 admit 추적
/usr/bin/python3 <scratch>/counterfactual.py # 부수 태그 제거 반사실

# 3) 계층화 시뮬레이션
/usr/bin/python3 <scratch>/layersim.py       # 案 A/B × 12질의 팩 diff

# 4) 게이트 주입 (매 케이스 후 cp 원본 복원)
cd <scratch>/wt-head
cat >> ontology/abox/core/behavioral/guardrails.ttl <<'EOF'
id:anchor-x a ho:Anchor ; skos:prefLabel "…" ;
    ho:anchorTarget id:c-lesson ; ho:anchorConfidence 0.6 .
id:mem-longterm ho:hasAnchor id:anchor-x .
EOF
/usr/bin/python3 tools/validate.py ; /usr/bin/python3 tools/lint_uniformity.py

# 5) alternativeOf 실해 실증
/usr/bin/python3 <scratch>/gapsweep.py       # 9질의 × phantom gap 탐지

# 6) 정리
git -C <scratch>/wt-head status --porcelain  # 빈 출력 확인
git worktree remove <scratch>/wt-head
```

측정 스크립트 전문은 scratchpad에만 있고 저장소에 남기지 않았다(도구 디렉토리 오염 방지).
재작성이 필요하면 위 각 절의 정의(모수·필터·불용어 처리)가 사양이다.
