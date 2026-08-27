# Verify — memory write-timing 축(B): `ho:memoryWriteTiming` + altLabel + 정의 보강

- **판정자**: vnv (independent re-run; developer self-report 미신뢰)
- **일자**: 2026-08-28
- **스펙(승인 계획)**: `docs/feedback/verified/memory-production-time-classification.md` §적용 계획 1~2
  (G1 write-side 축 TBox 확장 + shapes 닫힌 값, G2 `skos:altLabel "Short-term memory"` + 정의 보강)
- **대상 델타**(working tree, uncommitted):
  - TBox `ontology/tbox/harness.ttl` — `ho:memoryWriteTiming` (DatatypeProperty, domain `ho:Memory`,
    range `xsd:string`) + 절 주석 갱신
  - shapes `ontology/shapes/harness-shapes.ttl` — `ho:MemoryShape`에 `ho:memoryWriteTiming`
    `sh:minCount 1 ; sh:maxCount 1 ; sh:datatype xsd:string ; sh:in ("immediate-apply"
    "deliberate-store" "authored")` + 절 주석 갱신
  - ABox `ontology/abox/core/state/memory.ttl` — 3 tier에 writeTiming 각 1 triple,
    `id:mem-cache` altLabel 1 triple, cache/longterm 정의 각 1문장 보강 + `tokenEstimate` 재산정
  - 규약 `ONTOLOGYSTYLE.md` §3 — read/write 짝 순서 [권장] 1항
- **인터프리터**: `/usr/bin/python3` (셸 기본 `python3`엔 rdflib 없음)

## VERDICT: PASS (non-blocking note 4건)

verification(규격)·validation(목적) 두 축 모두 독립 재현으로 green. SHACL 이빨은 4종 주입으로
실측 확인(vacuous 아님), 발견성은 HEAD-격리 before/after로 **mem-cache 2.7 → 7.2 (팩 랭킹 5위 →
1위)** 실측, emitted 산출물 영향은 aggregate `tokenEstimate` 1줄뿐임을 byte diff로 확증.
아래 note 4건은 전부 비차단(정책 tradeoff·후속 관찰).

> **동시 세션 격리**: 같은 워킹트리에 다른 세션의 annotation-backbone 작업(`ho:Anchor`,
> `ho:alternativeOf`, `tools/retrieve.py`·`lint_uniformity.py` 변경)이 섞여 있다. 본 판정의
> before/after는 **HEAD worktree + memory.ttl 델타만** 얹은 격리 사본으로 측정해 그 오염을
> 제거했고(§V2-1), 타 세션 델타가 본 축의 랭킹에 무영향임도 별도 실측했다(`ho:alternativeOf`
> 인스턴스 0 → 신설 admission 로직 no-op; as-shipped 수치가 격리 수치와 동일).

---

## 재현 명령 (실행한 그대로)

```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py                       # 구조 게이트
/usr/bin/python3 tools/lint_uniformity.py                # 저작 균일성(§1c/§1d/§2)
/usr/bin/python3 <scratch>/neg.py                        # negative control (a)(b)(c)
/usr/bin/python3 <scratch>/neg2.py                       # negative control (d)(e)
git worktree add --detach <scratch>/wt-head HEAD         # before 격리본
cp -a <scratch>/wt-head <scratch>/wt-after && \
  cp ontology/abox/core/state/memory.ttl <scratch>/wt-after/ontology/abox/core/state/memory.ttl
PYTHONHASHSEED=0 /usr/bin/python3 <root>/tools/retrieve.py "<query>" --format json
/usr/bin/python3 tools/materialize.py h-multiagent --out <scratch>/mat-{before,after}
HARNESS_CATALOG=<scratch>/rc/catalog.xml HARNESS_ROOT_ONTOLOGY=<recipe IRI> \
  /usr/bin/python3 tools/validate.py                     # recipe closure 파급
```

negative control 스크립트는 **in-memory 사본에만** 주입한다(`ontology_lib.load_graph()` →
`rdflib` 삼중 추가/삭제 → `pyshacl.validate`). `ontology/`는 한 바이트도 건드리지 않았다.

---

## V1. verification — 규격대로 만들었나

### 1-1. `validate.py` PASS (구조 게이트)

```
loaded graph: 6994 triples (post-reasoning)
=== SHACL structural invariants ===        ✓ conforms — no orphaned/under-specified nodes
=== Global reachability (orphan islands) === ✓ all 262 individuals reachable from a Harness
=== Capability satisfaction ===            ✓ every harness's required capabilities are provided internally
=== Registry drift ===                     ✓ all 28 instantiated in-scope class(es) registered
=== Duplicate / drift detection ===        ✓ no duplicate labels within a class
PASS
```

Memory 3개는 전부 `id:h-multiagent ho:hasMemory`로 결합돼 reachable(아래 그래프 실측), 신규
술어는 새 노드를 만들지 않으므로 개체수 변화 0. `⚠ 4 registered but not instantiated
(harmless): Anchor, Candidate, Example, HarnessComponent` 경고는 **타 세션(annotation)**
소관이며 본 델타와 무관.

### 1-2. negative control — shape에 이빨이 있나 (4/4 실측 FAIL)

| # | 주입(in-memory) | 결과 | 발화한 constraint |
|---|---|---|---|
| (a) | `mem-cache ho:memoryWriteTiming "wrong-value"` (기존 값 제거 후) | **conforms: False** | `InConstraintComponent`, Focus `id:mem-cache`, Value `"wrong-value"`, Path `ho:memoryWriteTiming` |
| (b) | `id:mem-negctl` 신규 `ho:Memory` (label/def/readTiming/persistence/maturity/hasMemory 결합 **완비**, writeTiming만 부재) | **conforms: False** | `MinCountConstraintComponent`, Focus `id:mem-negctl`, Path `ho:memoryWriteTiming` |
| (c) | **대조군**: (b)와 동일 노드 + `"deliberate-store"` | **conforms: True** | — |
| (d) | `mem-cache`에 두 번째 값 추가 | **conforms: False** | `MaxCountConstraintComponent` |
| (e) | `mem-longterm ho:memoryWriteTiming 3`(xsd:integer) | **conforms: False** | `DatatypeConstraintComponent` + `InConstraintComponent` |

- (a)·(b)는 브리프가 요구한 2건 그대로, (d)·(e)는 보강. 메시지 문자열도 shape 원문
  ("Memory must have exactly one ho:memoryWriteTiming from the closed set
  (immediate-apply/deliberate-store/authored).")과 일치.
- **(c) 대조군이 핵심**: (b)의 FAIL이 "주입 노드가 다른 이유로 미달"이 아니라 **오직 writeTiming
  부재** 때문임을 증명한다(같은 노드에 값 하나만 얹으니 전체 그래프가 다시 conforms).

### 1-3. 값집합 ↔ 개체 값 문자 대조 + domain 누수 없음

```
Memory individuals: 3
  mem-cache     hasMemory-carriers=['h-multiagent'] read=task-continuous  write=immediate-apply
  mem-firmware  hasMemory-carriers=['h-multiagent'] read=every-execution  write=authored
  mem-longterm  hasMemory-carriers=['h-multiagent'] read=conditional      write=deliberate-store
memoryWriteTiming subjects: mem-cache, mem-longterm, mem-firmware   (all typed ho:Memory: True)
```

승인 문서의 매핑(cache=immediate-apply / long-term=deliberate-store / firmware=authored)과 **1:1
동일**. 술어를 단 주체가 Memory 3개뿐이므로 `rdfs:domain ho:Memory`로 인한 오타입(prp-dom) 유발 0.

### 1-4. 저작 균일성 린터 PASS

`tools/lint_uniformity.py` → `PASS` (tokenEstimate §1c 0 / naming §2 0 / language §1d 0 /
maturity 0 / definition 0 / text cap §1c 0). 언어정책: `prefLabel`·`altLabel`·`definition`에
한글 0(린터 실측) — 신규 altLabel·보강 문장 전부 영어.

### 1-5. `ONTOLOGYSTYLE` §3 doc 동반 — 있음

`ONTOLOGYSTYLE.md:207-210`에 [권장] 1항 추가: "한 축의 read/write 짝은 붙여 쓴다 — `ho:Memory`는
`ho:memoryReadTiming` → `ho:memoryWriteTiming`(생산 시점 라우팅) → `ho:memoryPersistence` →
`ho:memoryReadScope` → `ho:memoryActivationCondition` 순." **TTL 실제 순서도 3개체 전부 이 순서**
(memory.ttl:37-40, 47-50, 57-61 육안 대조). TBox 절 주석("memory tier discriminators: Memory ->
read/write timing, persistence")·shape 절 주석·memory.ttl 파일 헤더 주석도 write 축을 포함하도록
동반 갱신됨 = 그래프-산문 lag 없음.

### 1-6. 파급 — recipe fleet 회귀 없음 (minCount는 '조이기'이므로 필수 확인)

`sh:minCount 1`은 **기존에 통과하던 그래프를 깨뜨릴 수 있는 방향의 변경**이라 downstream을 실측:

- `grep -rn "a ho:Memory\|ho:hasMemory" /home/cpark/git/harness-recipes --include="*.ttl"` → **0건**
  (레시피에 자체 Memory 개체 없음 → 새 필수 술어의 위반 후보 자체가 없음).
- closure 실행(임시 catalog·심링크는 scratchpad에만 생성 후 제거; 레시피 repo 무수정):
  `03-newsletter-engine` 285 / `46-product-manager` 285 / `lpranging` 285 /
  `63-research-assistant` 284 individuals — **4/4 PASS**.
  (주의: `21-*` 처럼 이 카탈로그에 매핑 없는 IRI는 중앙만 262로 조용히 통과하므로 오탐 —
  개체수가 중앙(262)보다 큰 것을 closure 성립 신호로 삼았다.)

---

## V2. validation — 올바른 것을 만들었나

### 2-1. 발견성(G2 + G1의 산문 절반) — HEAD 격리 before/after 실측

`wt-head`(HEAD 그대로) vs `wt-after`(HEAD + **memory.ttl 델타만**) — tools는 `diff -r`로
`TOOLS_IDENTICAL` 확인, `PYTHONHASHSEED=0`. 표기: `seed score` / `pack rank`.

| 질의 | HEAD | AFTER | as-shipped(WT) |
|---|---|---|---|
| `short-term memory` | cache **2.7** (rank 5/38) · longterm 5.4 (1위) | cache **7.2 (1위/36)** · longterm 5.4 (2위) | 동일 (7.2 / 5.4) |
| `agent memory: long-term stored knowledge vs short-term working knowledge` | cache 3.6 (**pack 탈락**) · longterm **10.8** | cache **12.15** (2위) · longterm **12.6** (1위) | 동일 |
| `where does newly produced knowledge go: short-term or long-term memory` | cache 2.7 (pack 탈락) · longterm 10.8 | cache **11.25** · longterm **12.6** | 동일 |
| `knowledge produced during a run is stored but not applied until a later run` | **양쪽 seed 아예 미매칭(None)** | cache 2.7 · longterm 4.5 | 동일 |
| `short-term memory tier that is discarded when the task ends` | cache 6.3 · longterm 6.3 | cache **11.7 (1위)** · longterm 7.2 | 동일 |

- **브리프의 판정 기준(before 2.7 vs 12.6) 충족**: 사용자 용어 질의에서 mem-cache는 2.7에서
  7.2로 오르며 **팩 1위**가 됐고(직전 1위 mem-longterm 5.4를 추월), 장/단기 대비 질의에서는
  12.15 vs 12.6으로 **격차가 9.9 → 0.45로 소멸**했다. 즉 "단기기억으로는 안 잡힌다"는
  원 판정의 결함이 해소됨.
- **기여 분해(attribution)**: altLabel만 얹은 3번째 변형(`wt-altonly`)으로 측정 —
  `short-term memory` 질의의 상승분(2.7 → 7.2)은 **전량 altLabel(G2)** 기여이고 정의 보강은
  0 기여. 반대로 생산-시점 질의(`knowledge produced during a run is stored but not applied…`)는
  HEAD·altLabel-only 둘 다 **미매칭**이고 정의 보강 후에야 seed로 잡힌다 = **G1의 산문 절반이
  독립적으로 load-bearing**. 두 조치가 서로 다른 질의군을 담당함이 실측으로 분리됨.
- 결정성: `PYTHONHASHSEED=0/1/12345` 3회 동일 결과(7.2/5.4/3.6, budget_used 891).

### 2-2. as-shipped ≡ 격리본 (동시 세션 오염 배제)

as-shipped 열이 AFTER와 memory 노드 수치·랭크에서 완전히 일치. 근거: `ho:alternativeOf`
인스턴스 0·`ho:hasAnchor` 인스턴스 0(그래프 실측)이라 타 세션이 추가한
`retrieve.py alternative_clusters()` admission이 no-op. 팩 구성원 차이는 타 세션이 새로 만든
`Standard terminology only` guardrail 1개뿐(본 축 무관).

### 2-3. emitted 산출물 영향 — 정확히 1줄

`materialize.py h-multiagent`를 wt-head / wt-after에서 각각 실행(tools 동일) → `diff -r`:

```
MANIFEST.json  740c740
<   "tokenEstimate": 3706
---
>   "tokenEstimate": 3826
```

**그 외 전 파일 byte-identical**(CLAUDE.md, harness.lock.json 포함). +120은 cache(55→105)
+50과 longterm(80→150) +70의 정확한 합이다. 렌더러 무결합도 교차 확인:
`grep -c "hasMemory\|HO.Memory\|memoryWriteTiming\|memoryReadTiming" tools/materialize.py` = **0**
(emit되는 memory 관련 값은 Role의 `ho:roleMemoryPolicy` 뿐이며 이번 델타는 그것을 건드리지 않음).

### 2-4. 3-tier(firmware 포함) 비훼손

- 그래프: Memory 개체 **3개 유지**, firmware는 삭제·변형 없이 `"authored"` 1 triple만 추가받음
  (정의·tokenEstimate·readTiming 전부 HEAD와 동일: def 192 chars, tokenEstimate 55).
- 이분법 강요 없음: 닫힌 값 3종이 3 tier와 1:1이라 firmware가 "이분법 밖"으로 밀려나지 않고
  write 축에서도 1급 값을 가진다(승인 문서 §비-GAP "firmware 제거 불필요" 준수).
- 신규 Memory 개체·near-synonym 클래스 **0개**(Golden rule 2 준수), 신규 Concept 0.
- 전 그래프에서 `"Short-term memory"` 문자열을 라벨로 가진 노드는 `id:mem-cache`(altLabel) **1개**
  뿐 = prefLabel 충돌·중복 라벨 없음(validate의 duplicate-label 체크도 ✓).

### 2-5. §1c 텍스트 예산

| 노드 | def chars (§1c tokens = chars/4) | 전체 텍스트 ≈tokens | `ho:tokenEstimate` |
|---|---|---|---|
| mem-cache | 195→**376** (48 → **94**) | 51 → 101 | 55 → **105** |
| mem-longterm | 210→**434** (52 → **108**) | 94 → 150 | 80 → **150** |
| mem-firmware | 192 (48) 불변 | 51 | 55 불변 |

- **§1c 260 token 상한 충족**(94 / 108 / 48). 린터의 text-cap 체크도 0 violation.
- `tokenEstimate`는 실제 텍스트 대비 **보수적(과대) 방향**(105 ≥ 101, 150 ≈ 150) — retrieve의
  `token_cost()`가 이 값을 그대로 쓰므로 과소평가로 인한 팩 무단 초과가 없다.

### 2-6. coverage audit (승인 계획 → 표현)

| 계획 요소 | 표현 | 상태 |
|---|---|---|
| TBox `ho:memoryWriteTiming` (생산 시점 라우팅 명시) | `harness.ttl:753-757`, domain/range 선언 + 정의에 "routed INTO this tier at production time … complementing ho:memoryReadTiming" | ✓ |
| shapes 닫힌 값 | `ho:MemoryShape` `sh:in (immediate-apply deliberate-store authored)` | ✓ (이빨 실측 §1-2) |
| brief 지정 강도 `minCount 1` | `minCount 1` + `maxCount 1` + `datatype` | ✓ (지정 이상, 3개체 전부 부여돼 무해) |
| writeTiming 3 triple | cache/longterm/firmware 각 1 | ✓ |
| `skos:altLabel "Short-term memory"` | mem-cache | ✓ |
| 두 정의에 생산 시점 문장 1개씩 | cache "On the write side it is the immediate-apply tier: …", longterm "On the write side it is the deliberate-store tier: …" | ✓ |
| vnv 재검색 확인 | §2-1 | ✓ |

계획 밖 초과 저작 없음(파일 헤더 주석·§3 규약 1항은 동반 문서화라 정당). 사용자 원제안의 의미
대조도 통과: long-term = "다음 로직에는 반영하지 않고 필요시 읽어서 활용" ↔ 정의문 "written down
at the end WITHOUT being applied to the current logic, taking effect only when a later run's
trigger reads it back".

---

## Non-blocking notes

- **N1 (기본 예산에서 3-tier가 통째로 도착하지 않는 질의 존재)**: 정의 보강이 팩 비용을 +120
  token 올려, `short-term memory` 질의의 기본 budget 900 팩에서 `Firmware memory`·`Dispatch
  brief`·`Harness spec` 3개가 밀려나고 `Opus high-reasoning` 1개가 들어왔다(38→36 노드).
  firmware는 seed score 2.7로 여전히 잡히며 `--budget 3000`에서 팩에 복귀 = 그래프 결함이 아닌
  **admission 경합**. 다만 "3-tier를 한 팩에서 비교"하려는 독자는 기본 예산으로는 두 tier만 받는다.
  후속으로 볼 값은 tier 정의를 더 늘리는 방향의 비용(§1c 목표대역 130-260이 이 비용을 더 키운다).
- **N2 (값 이름이 산문에 하드코딩)**: 보강 문장이 `"immediate-apply tier"`·`"deliberate-store
  tier"`처럼 닫힌 값 문자열을 그대로 부른다. 발견성 근거는 확실하나(§2-1 attribution), 값집합을
  개명하면 shapes·ABox·정의문 3곳을 동시에 고쳐야 한다. 현 시점 비용은 낮음(3개체).
- **N3 (닫힌 값의 확장 비용)**: `sh:in` 3종은 write-through(즉시 반영 **하고** 저장까지) 같은
  4번째 라우팅을 표현 불가하게 만든다. readTiming과 동일한 설계 기조이고 현 3-tier에 초과값이
  없으므로 수용 가능하나, 새 tier 도입 시 shapes 편집이 선행돼야 함을 기록해 둔다.
- **N4 (role ↔ tier 연결은 여전히 free text)**: `ho:roleMemoryPolicy`는 "writes back reusable
  findings at session end"처럼 사실상 deliberate-store를 서술하지만, **어느 role이 어느 tier에
  쓰는지** 를 잇는 술어는 없다(원 피드백 G1 범위 밖이므로 결함 아님). 축이 1급이 된 지금이
  후속 후보 시점.

## 잔여 위험

없음(차단급). 본 델타는 노드 신설 0·엣지 타입 신설 0의 리터럴+술어 1종 추가이며, 조이는 방향의
shape 변경은 중앙·recipe 양쪽에서 실측 통과했다. 커밋은 inspection 소관.
