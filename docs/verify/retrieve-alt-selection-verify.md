# 판정 2 — retrieve 영역당 대안 1선별(③) 게이트 검증

- 판정자: vnv (dispatch, opus) · 일자: 2026-08-28
- 대상: `tools/retrieve.py`의 `ho:alternativeOf` 클러스터당 1-admit 선별 (working tree, uncommitted)
- 게이트 원본: `docs/feedback/inquiries/retrieve-alternative-selection-brief.md` §4 G1~G5
- 인터프리터: `/usr/bin/python3` (셸 기본 `python3`=anaconda 환경엔 `rdflib` 없음; rdflib 7.6.0)
- **판정: PASS (with notes)** — G1~G5 전부 통과. 차단 결함 0. 비차단 note 4건(N1은 **타 lane**으로 라우팅 권고).

---

## 0. 검증 대상 diff의 경계 확인

`git diff --stat` 기준 워킹트리에는 lane ①(TBox annotation 술어)·②(린터 cap)의 변경이
같이 올라와 있다. **이 판정은 ③(retrieve 선별)만** 대상으로 하며, 대상 파일이
`tools/retrieve.py` 단일 파일인지 먼저 확인했다.

| 파일 | 이 lane 소관? | 근거 |
|---|---|---|
| `tools/retrieve.py` (+78/-2) | **예** | docstring 규칙 1줄 + `alternative_clusters()` + `traverse()` 훅 |
| `tools/ontology_lib.py` (+1) | 아니오 | diff 전체가 `HO.Anchor,` 1줄 = lane ① |
| `tools/lint_uniformity.py` (+65) | 아니오 | lane ② (텍스트 cap 축) |
| `ontology/tbox|shapes|abox/**` | 아니오 | lane ① (`ho:Anchor`/`alternativeOf`/`overlapsWith`/`AnchorShape`…) |
| `tools/check_determinism.py` | — | **미수정 확인** (`git diff --name-only | grep check_determinism` → 0) — 브리프 §2의 "시나리오 수정 금지" 준수 |

`grep -n "Anchor\|anchorConfidence\|hasAnchor\|overlapsWith" tools/retrieve.py` →
히트 1건, 그것도 `:192` **주석**의 `NOT ho:overlapsWith` 뿐. 즉 브리프 §6(비범위)의
`hasAnchor`/`anchorConfidence` 미소비가 코드로 지켜졌고, §3-4의 overlapsWith 구분 명시도
주석에 실재한다.

현 그래프의 실사용량 (전제 확인):

```
/usr/bin/python3 -c "... lib.load_graph(reason=R) ..."
reason=False triples=2941 alternativeOf=0 overlapsWith=0 hasAnchor=0
reason=True  triples=6994 alternativeOf=0 overlapsWith=0 hasAnchor=0
```

→ 브리프 §4 G1의 전제("현 그래프 alternativeOf 사용 0")는 **reasoned·raw 양쪽에서 실측 재확인**.

---

## 1. G1 — byte-identity 회귀 (변경 전 vs 후)

### 1.1 격리 방법 (중요 — 순진한 worktree diff는 이번엔 **틀린 답**을 준다)

`git worktree add --detach HEAD`로 HEAD를 격리하되, 워킹트리에는 lane ①의 **그래프 변경이
uncommitted로 섞여 있으므로** HEAD worktree를 그대로 돌리면 diff가 "retrieve.py 변경분"이
아니라 "그래프 변경분"을 잰다. 그래서 worktree를 다음처럼 **retrieve.py만 다른 쌍**으로 만들었다:

```bash
git worktree add --detach "$SCR/head-wt" HEAD
rm -rf "$SCR/head-wt/ontology"
ln -s /home/cpark/git/harness_ontology/ontology "$SCR/head-wt/ontology"   # 같은 그래프
cp  /home/cpark/git/harness_ontology/tools/ontology_lib.py "$SCR/head-wt/tools/ontology_lib.py"
rm -rf "$SCR/head-wt/tools/__pycache__"
diff -rq <repo>/tools <wt>/tools   # → retrieve.py, lint_uniformity.py 만 differ
                                   #   (retrieve.py는 lint를 import하지 않음)
```

`catalog-v001.xml`은 양쪽 동일(`diff -q` CATALOG_SAME). `ontology_lib.ROOT`가
`__file__` 기준이라 각 worktree는 **자기** `ontology/`를 로드하는데, 심링크로 같은 그래프를
가리키게 했으므로 남은 변수는 `tools/retrieve.py` 하나뿐이다.

### 1.2 결과 — 9 질의 × 2 포맷 = 18 팩 전부 byte-identical

`PYTHONHASHSEED=0`으로 해시 노이즈 제거(결정성 자체는 G3/G5에서 별도로 잼).

| 질의 | budget | md | json |
|---|---|---|---|
| workflow steps and deliverables | 900 | IDENTICAL (7776 B) | IDENTICAL (15044 B) |
| code review harness with tests | 900 | IDENTICAL (10618 B) | IDENTICAL (28819 B) |
| multi-agent harness that spawns short-lived sub-agents | 900 | IDENTICAL (20800 B) | IDENTICAL (47522 B) |
| cited research summary | 900 | IDENTICAL (13369 B) | IDENTICAL (38831 B) |
| build me an agent that fixes bugs and runs tests | 900 | IDENTICAL (6658 B) | IDENTICAL (17652 B) |
| guardrail memory tier observation space | 1500 | IDENTICAL (20108 B) | IDENTICAL (50618 B) |
| orchestrator dispatch developer vnv inspection roles | 6000 | IDENTICAL (48451 B) | IDENTICAL (183999 B) |
| alternative descriptions of the same knowledge region | 900 | IDENTICAL (8262 B) | IDENTICAL (15712 B) |
| zzzznonexistentterm (빈 팩 경로) | 900 | IDENTICAL (219 B) | IDENTICAL (199 B) |

stderr 비어 있음(양쪽 0바이트). → **0-edge 그래프에서 로직 완전 무영향**.

### 1.3 anti-vacuous 확인 (이 격리가 실제로 작동했나)

"둘 다 같은 걸 돌려서 같게 나온 것" 아님을 증명하기 위해, 같은 worktree를 **원래 HEAD 상태로
되돌려**(`git checkout -- ontology tools/ontology_lib.py`) 같은 질의를 돌렸다:

```
RAW-HEAD DIFFERS from working tree -> 심링크 격리는 load-bearing
raw-HEAD  14371 B · budget 899/900 · 37 nodes
worktree  10618 B · budget 894/900 · 26 nodes
```

즉 그래프 lane의 변경은 팩을 크게 바꾸지만, **retrieve.py 변경만 놓고 보면 0바이트**다.
(따라서 위 raw diff는 전부 lane ①에 귀속되며 ③의 회귀가 아니다.)

---

## 2. G2 — 주입 시나리오 + 대조군

스크래치 그래프 = 실그래프(`lib.load_graph`)에 합성 노드 주입(인메모리, 저장소 무접촉).
질의어는 실그래프와 절대 겹치지 않는 nonsense 토큰 `zzqqregion`, 각 대안 `ho:tokenEstimate 40`,
셋 다 같은 `ho:tagged` region(= `ho:AlternativeOfSharedAnchorShape`가 요구하는 조건과 동형).
edge는 **한 방향씩만** 저작: `A→B`, `C→B` (무향으로 읽어야 {A,B,C} 한 성분).

스크립트: `<scratch>/inject_probe.py`, `rule_off_control.py`, `traversal_and_overlap.py`, `gap_risk*.py`

| # | 시나리오 | pack 내 대안 | budget_used | 판정 |
|---|---|---|---|---|
| S1a | 링크 有 (raw, `reason=False`) | **정확히 1** (`zz-alt-a`) | **55** | ✅ |
| S1b | **대조군**: 같은 그래프, alternativeOf edge만 제거 | 3 (a,b,c) | **135** | ✅ 둘 다 등장 |
| S2 | 링크 有 (reasoned, `reason=True`) | 1 (`zz-alt-a`) | 55 | ✅ prp-symp 의존 없음이 양방향 모두에서 성립 |
| S3 | `C`에 `ho:salience 1.0` (score↑) | 1 (**`zz-alt-c`**) | 55 | ✅ 승자=기존 admission 순서(최고 relevance) |
| S4 | 선순위 A의 cost 5000, budget 100 | 1 (**`zz-alt-b`**) | 95 | ✅ **예산-skip은 region을 선점하지 않음** |
| S6a/b | **rule-off 대조군**(그래프 동일, `alternative_clusters`만 무력화) | 1 → **3** | 55 → **135** | ✅ 억제 주체가 *데이터*가 아니라 *규칙* |
| S7a/b | 탈락분이 seed가 아니라 **traversal 경유**로 도달 | 1 → 2 | 55 → 95 | ✅ §3-2 "seed·traversal 모두 적용" |
| S8 | `ho:overlapsWith`만 연결 | 2 (X,Y 모두) | 95 | ✅ §3-4 배제 트리거 아님 |

**예산 미차감 산술 (핵심 수치)**: S1 55 vs 135 → **Δ=80 = 2 × 40** = 탈락한 두 telling의
`token_cost` 정확히 그대로. 즉 탈락분은 **1토큰도 예산을 쓰지 않는다**(억제가 `token_cost`
호출 *앞*에 있다는 코드 배치의 행위적 증거). S7도 55 vs 95 → Δ=40 = 1 × 40.

**힌트 누출**: 승자만 in-scope이므로 `pack["edges"]`에 `alternativeOf` 엣지가 뜰 수 없다 —
S1a/S7a에서 `alt_edges: []` 실측. rule-off 대조군 S6b에서는 **2개가 그대로 노출**되므로
이 성질이 vacuous가 아님도 같이 보였다.

```
S6b (rule OFF, 같은 그래프):
  alt_edges: ["…novice framing-[alternativeOf]->…worked rationale",
              "…terse rule-[alternativeOf]->…worked rationale"]
  budget_used: 135
```

---

## 3. G3 — `check_determinism.py` PASS 무변경

```
/usr/bin/python3 tools/check_determinism.py
  ok [md|json] × 4 requests — 각 4 runs, 1 distinct pack
PASS — every request projects a byte-identical pack across processes.
```

시나리오 파일 미수정(§0 표 참조). **단, 이 게이트는 현 그래프(0-edge)에서 이 기능에 대해
vacuous**이므로 §4에서 주입 그래프로 비-vacuous 결정성까지 확인했다(N4).

---

## 4. G5 — 클러스터 계산 결정론 (코드 검토 + 실측)

### 4.1 코드 검토 (`tools/retrieve.py:196-232`)

- 성분 루트 순회 `for start in sorted(adj, key=str)` — set 순회 아님 ✅
- 확장 `queue.extend(sorted(adj[node], key=str))` ✅
- 성분 키 `key = min(str(n) for n in component)` — **내용만의 함수** ✅
- `taken_regions`는 set이지만 **membership 테스트에만** 사용(순회 없음) → 순서 누출 경로 없음 ✅
- 새 비교 키 도입 0 — 승자는 기존 heap 전순서 `(-score, str(node))`가 결정 (§3-3 준수) ✅
  - 브리프 §3-3은 `_rank_key`(score→maturity→IRI)를 지목하지만, 실제 admission 순서는
    seed 정렬에만 `_rank_key`가 쓰이고 heap 키에는 maturity가 없다. 코드 주석은
    "the heap's total (-relevance, IRI) key, fed by `_rank_key`'s seed order"로 **정확하게**
    적혀 있어 문서-코드 불일치가 아니라 브리프 쪽 근사 표현이다(무해).
- 자기 자신 링크 `s == o`는 skip → self-loop 노드는 map에 아예 없음 ✅

### 4.2 실측

`U1` 단위 테스트(체인 `d-c-b-a` + 별개 쌍 `y-x` + self-loop `s-self`):

```
map: k-a→k-a, k-b→k-a, k-c→k-a, k-d→k-a, m-x→m-x, m-y→m-x
n_components: 2        (self-loop 노드는 map에 부재 = 자기 대안 아님)
```

스트레스(5 클러스터 × 4 멤버, 전원 동점 score, 저작 방향 혼재 m1→m0 / m2→m1 / m0→m3):

```
삽입 순서(triple shuffle) seed 0..5 → 6/6 동일 sha256 487d4306aba9ea81, distinct results: 1
PYTHONHASHSEED ∈ {ambient, 0, 3} → 3/3 동일
n_components: 5, 각 4멤버 전부 같은 키
```

주입 팩 프로브 전체(`inject_probe.py`) 역시 `PYTHONHASHSEED ∈ {ambient,0,1,2,3}`에서
**5/5 동일 sha256 `3c27858356e0846c`** — 즉 대안 edge가 **실재하는 상태**에서도 결정성이
성립한다(G3의 vacuous 구멍을 메운 측정).

---

## 5. G4 — validate / lint 회귀

```
/usr/bin/python3 tools/validate.py     → PASS
   ✓ SHACL · reachability · capabilities · assemblyOrder · capacityFit · registryDrift
   ⚠ 4 registered but not instantiated (harmless): Anchor, Candidate, Example, HarnessComponent
/usr/bin/python3 tools/lint_uniformity.py → PASS (6축 전부 0 violation)
```

`Anchor` 미인스턴스 경고는 lane ①이 "DECLARED BUT DORMANT BY DESIGN"으로 의도한 상태이며
③의 read-only 변경과 무관하다.

---

## 6. Notes (비차단)

### N1 — **cross-lane doc-lag**: ③가 land되면 TBox 정의문 2개가 사실과 어긋난다 (라우팅 권고)

같은 워킹트리 안에서 lane ①의 정의문이 "선별은 아직 안 왔다"고 말한다:

- `ho:alternativeOf` — “CONSUMPTION: … (that selection **lands in a later stage; until then the
  edge is declared but unread**).” → ③가 land된 시점부터 **거짓**. retrieve가 지금 읽는다.
- `ho:Anchor` — “CONSUMPTION: **those values are consumed by** the projection layer's per-region
  selection …, which lands in a later stage — until then this mechanism is DECLARED BUT DORMANT.”
  → 착지한 선별은 `anchorConfidence`를 **전혀 읽지 않는다**(브리프 §6 비범위, `grep` 히트 0).
  Anchor의 dormancy 자체는 맞지만 "그 값이 per-region selection에 소비된다"는 서술은
  구현과 어긋난다(승자는 score/IRI 순서로만 정해짐).

그래프 산문 ↔ 코드 불일치이므로 **③의 결함은 아니다**(파일 경계상 ③가 고칠 수도 없다).
커밋 시점에 두 lane이 같이 올라가면 독자가 바로 오해하므로, TBox lane 또는 후속 developer
dispatch로 두 정의문의 CONSUMPTION 절 갱신을 권고한다.

### N2 — 탈락한 telling의 **구조 엣지**도 같이 사라진다 (설계 성질 · 후속 권고)

`ho:AlternativeOfSharedAnchorShape`는 "같은 `ho:tagged` Concept 공유"만 강제할 뿐,
두 telling이 **같은 구조 엣지**(providesCapability / dependsOn / hasComponent …)를 갖는지는
강제하지 않는다. 탈락분은 `done`으로 마킹돼 이웃 확장도 끊기므로 다음이 실측된다:

- **S5**: 오직 loser를 통해서만 닿는 이웃(`zz-only-via-b`)이 treatment 팩에서 사라짐
  (treatment 95 / control 182 · 노드 3 vs 6).
- **S9**: loser만 `providesCapability`를 갖는 경우, 예산이 빠듯하면 팩이 **실제로는 저장소가
  덮는 capability를 gap으로 보고**한다.

```
S9a 링크 有 : nodes=[zz-con, zz-h, zz-p1]        gaps=["Zq capability"]   used=95
S9b 대조군  : nodes=[zz-h, zz-p1, zz-p2]         gaps=[]                  used=120
```

v1 규칙 자체는 브리프 §3 그대로 구현된 것이므로 **판정 결함 아님**(현재 인스턴스 0이라 노출도 0).
다만 대안을 저작할 때의 규율("대안은 *텍스트*의 다른 서술이어야 하고, 구조 엣지는 등가로
가져가야 한다")을 ONTOLOGYSTYLE 또는 shape로 못 박는 후속을 권고한다.

### N3 — `pack["seeds"]`(JSON)에 탈락 telling의 **라벨**이 남는다 — **pre-existing 계열**

선별 지점이 admission이라 entry-point 목록인 `seeds[]`는 그대로다(developer 자기 노트에
이미 공개). 실측: S1a에서 `seeds`에 3개 telling 라벨이 모두 남는다.

이것이 ③가 만든 새 누출인지 확인하기 위해 **HEAD 빌드**로 대조했다:

```
HEAD retrieve.py, "code review harness with tests" --budget 120
seed labels NOT admitted: ['Review raises a critical finding', 'Scale execution modes', 'Synthesizer agent']
```

→ 예산-skip으로 인해 **변경 전에도** `seeds[]`는 미채택 노드를 싣고 있었다. 따라서 §3-5의
"탈락 대안 무표기"는 지식 본문·`edges`·md 렌더러(=`render_markdown`은 `seeds`를 아예 그리지
않음) 기준으로 지켜졌고, JSON `seeds`는 기존 진단 필드의 기존 성질이다. IRI 누출은 0(B18 유지).

### N4 — `check_determinism.py`는 이 기능에 대해 현재 vacuous

0-edge라 4개 시나리오 어느 것도 선별 코드를 통과하지 않는다. §4의 주입 결정성 측정으로
이번 판정은 메웠지만, `alternativeOf` 인스턴스가 실제로 land되면 그때 프로브 질의 1개를
그 region에 걸리도록 추가해 이 게이트를 비-vacuous로 만들 것을 권고한다(중앙 tools 변경이라
③의 파일 경계 밖 = 후속 dispatch 사안).

---

## 7. 재현 절차 (전체)

```bash
REPO=/home/cpark/git/harness_ontology ; SCR=<scratchpad>
# G4
/usr/bin/python3 $REPO/tools/validate.py
/usr/bin/python3 $REPO/tools/lint_uniformity.py
# G3
/usr/bin/python3 $REPO/tools/check_determinism.py
# G1 (격리 worktree 생성 → 심링크 → 프로브 스윕 → git worktree remove --force)
git -C $REPO worktree add --detach $SCR/head-wt HEAD
rm -rf $SCR/head-wt/ontology && ln -s $REPO/ontology $SCR/head-wt/ontology
cp $REPO/tools/ontology_lib.py $SCR/head-wt/tools/ && rm -rf $SCR/head-wt/tools/__pycache__
PYTHONHASHSEED=0 /usr/bin/python3 $SCR/head-wt/tools/retrieve.py "<q>" --budget <b> --format <md|json>
PYTHONHASHSEED=0 /usr/bin/python3 $REPO/tools/retrieve.py      "<q>" --budget <b> --format <md|json>
# G2 / G5
PYTHONHASHSEED=0 /usr/bin/python3 $SCR/inject_probe.py           # S1~S5 + U1 단위
PYTHONHASHSEED=0 /usr/bin/python3 $SCR/rule_off_control.py       # S6 rule-off 대조군
PYTHONHASHSEED=0 /usr/bin/python3 $SCR/traversal_and_overlap.py  # S7, S8
PYTHONHASHSEED=0 /usr/bin/python3 $SCR/gap_risk2.py              # S9
/usr/bin/python3 $SCR/stress_probe.py                            # 삽입순서×해시시드 결정성
git -C $REPO worktree remove --force $SCR/head-wt
```

주: 워킹트리에는 **동시 진행 중인 다른 세션**의 산출물(lane ①/②의 ontology·lint 변경,
scratchpad의 `wt-head`/`build-*`)이 함께 있다. 위 절차는 그 변경들을 양쪽에 동일하게
적용해 ③만 남기도록 설계됐고, 타 세션 worktree는 건드리지 않았다.

## 8. 판정

**PASS (with notes)** — G1 byte-identity(18/18) · G2 1-admit + 예산 미차감(Δ=탈락분 cost 정확히)
+ 대조군 2종(edge 제거 · rule-off) · G3 결정성 무변경 · G4 validate/lint 회귀 없음 ·
G5 클러스터 결정론(코드+삽입순서 6종×해시시드 3종). 브리프 §3-1~§3-5, §6 비범위 전부 준수.
N1은 **타 lane(TBox 정의문) 라우팅**, N2/N4는 후속 권고, N3은 pre-existing 계열로 비차단.
