# 검증 보고 — "ontology vs knowledge graph" 용어 정립 적용분

- **판정 대상**: 사용자 승인 피드백의 적용 결과 (문서층 + 그래프층).
- **판정 기준 원본**: `docs/feedback/verified/terminology-ontology-vs-knowledge-graph.md`
  "적용 계획" 1~8단계 + `ONTOLOGYSTYLE.md` [지킴] 항목.
- **baseline**: `HEAD = ec0ae85` (분리 worktree로 격리 비교).

## VERDICT: **pass-with-notes**

계획 8단계가 전부 실행됐고(7=설계상 위임, 8=본 검증), 그래프 변경은 **리터럴 9개 교체
(추가/삭제 triple 0)**로 위상 무변경, `validate.py`·`lint_uniformity.py` 모두 PASS,
discoverability 퇴행 0. 계획 범위를 넘은 4곳 추가 정합은 **동일 문구 가족**이라 정당.
남은 잔여(Golden rule 1 문구·DESIGN 제목·`wf-compose-harness` tokenEstimate)는 **이 적용
단위의 선언 범위 밖**이라 done을 막지 않는다 — N2/N3의 후속 권고로 남긴다.

---

## 1. Verification — 구조 게이트

### 1.1 `validate.py` PASS

```
$ /usr/bin/python3 tools/validate.py
  ✓ SHACL   ✓ reachability   ✓ capabilities
  ✓ assemblyOrder   ✓ capacityFit   ✓ registryDrift
PASS
```
- capacity fit: Inspection agent 13500/150000 — `oa-inspection-external`의
  `observedFileScope` 문자열이 길어졌으나 `observedTokenVolume`(12000)은 불변이라
  용량 축 영향 0 (§1c의 tokenEstimate ↔ observedTokenVolume 분리 규칙 준수).
- `⚠ 3 registered but not instantiated (harmless)`는 HEAD와 동일한 상시 경고.

### 1.2 authoring 린터 PASS

```
$ /usr/bin/python3 tools/lint_uniformity.py
  ✓ tokenEstimate (§1c) 0 · naming prefix (§2) 0 · language (§1d) 0
  ✓ maturity coverage 0 · definition (§1d) 0
PASS
```

### 1.3 불변 제약 — 리터럴 외 변경 0 (기계 증명)

HEAD worktree(`git worktree add --detach`)와 워킹트리의 abox instance-triple 전수 비교:

```
HEAD triples 2016 / WT 2060
removed (오버사이트-페어 선행 태스크 제외):  9
added   (동일 제외)                       :  9
predicates involved: {skos:definition, ho:observedFileScope}
subjects(removed) == subjects(added) == {agent-developer, aoi-developer, c-composition,
  oa-developer-external, oa-inspection-external, os-developer,
  pat-ontology-composition, role-implementer, wf-compose-harness}
```

- **node id**: 삭제 0. 추가 5(`c-oversight`, `cap-audit`, `cap-benchmarking`,
  `role-auditor`, `role-benchmarker`) — 전부 **선행 oversight-pair 태스크** 소유
  (`docs/verify/oversight-pair-verify.md`에서 별도 판정 완료). 본 적용 단위의 id 델타 = **0**.
- **prefLabel**: `prefLabel changed: []` — 251개 라벨 노드 중 변경 0.
  - `id:scheme` = `"Harness ontology vocabulary"` 그대로(concepts.ttl:210) ✔
  - `id:pat-ontology-composition` = `"Ontology-driven composition"` + id 그대로
    (patterns.ttl:31), 정의문만 교체 ✔ (계획 판정 3의 "id 재사용 금지" 제약 준수)
  - `harnesses.ttl:120`의 `ho:appliesPattern id:pat-ontology-composition` 참조 무손상 ✔
- **rdf:type**: 기존 노드의 타입 변경 0.
- **헤더 보일러플레이트**: diff에 `@prefix` / `a owl:Ontology` / `owl:imports` 줄 **0건 접촉**.
- **TBox·shapes**: `git status --porcelain -- ontology/tbox ontology/shapes` → **0 lines**.

### 1.4 잔여 "ontology" 산문 전수 스캔 (abox)

주석·prefix·owl:Ontology 제외 후 9건 — 전부 **의도된 잔류**:

| 위치 | 내용 | 판정 |
|---|---|---|
| concepts.ttl:110 | "…(individuals described by **the ontology**)" | 스키마 지칭 = 정확 |
| concepts.ttl:210 | `id:scheme` prefLabel | 계획대로 불변 (어휘 자체) |
| roles.ttl:183 | "authored knowledge-graph individual **the ontology** types" | 스키마 지칭 = 정확 |
| observation.ttl:164 | `"…the assigned **ontology/abox** nodes…"` | 경로 표기 (원 보고 3-5 = 모호하지 않음) |
| observation.ttl:204 | `"The whole stored graph (ontology/**, both the schema and the knowledge graph)…"` | 경로 + 명시적 두 층 = 개선됨 |
| workflows.ttl:37 / patterns.ttl:31,32 / harnesses.ttl:120 | 스키마 지칭 · 보존된 id/label | 정확 |

---

## 2. Validation — 목적 부합

### 2.1 계획 vs 실제 (8단계 대조)

| 계획 | 상태 | 증거 |
|---|---|---|
| 1. CLAUDE.md:3-5 교체 | **적용** | 제안 문면 그대로 + "`ontology/`는 두 층을 담는 store, rename 안 함" 포인터 |
| 2. README:3-6 + §Growing 제목 | **적용(+α)** | 서두 교체, `Growing the ontology`→`Growing the knowledge graph`, :78 "knowledge base"→"knowledge graph"; **추가**: Layout 코드블록에 층 주석 |
| 3. DESIGN §Terminology 신설 + "grows" 교정 | **적용(+α)** | §Terminology 4불릿(3분할 IRI 인용 + rename 기각 근거). HEAD :29·:74·:79 3곳 전부 교정 확인, **추가** :113 "knowledge base"→"knowledge graph" |
| 4. ONTOLOGYSTYLE 한 줄 연결 | **적용** | §2 [지킴] 뒤 "TBox+shapes = ontology 층, ABox = knowledge graph 층" + 경로 표기 유지 명시 |
| 5. 그래프 산문 4곳 | **적용(+4곳)** | N1 참조 — 9노드 리터럴 교체 |
| 6. rename 불채택 기록 | **적용** | DESIGN §Terminology 마지막 불릿(87파일/31코드/외부 federation catalog) + CLAUDE.md 포인터 |
| 7. 메모리 층 위임 | **미적용(설계상 옳음)** | 계획이 "이 적용 단위에 포함하지 않음"으로 명시 |
| 8. validate + retrieve 재확인 | **본 보고서** | §1.1 / §2.2 |

DESIGN §Terminology의 사실 주장 spot-check(문서가 인용한 구조가 실재하는가):
- `ontology/tbox/harness.ttl:20` = `<https://harness-ontology.dev/schema> a owl:Ontology` ✔
- `ontology/abox/core/vocab/concepts.ttl:13` = `.../data/core/concepts a owl:Ontology` ✔ (data/&lt;domain&gt;/&lt;type&gt;)
- 개체 IRI = `https://harness-ontology.dev/id/core/c-composition` (retrieve pack 실측) ✔
- 외부 federation 파급 주장 = `catalog-v001.xml:5` 주석 + :9/:16-17 매핑으로 확인 ✔

### 2.2 retrieve 재검색 — 반영 O, 퇴행 X

`PYTHONHASHSEED=0`, HEAD worktree의 `retrieve.py`(자기 ontology 로드)와 1:1 비교. 표기 =
`노드 relevance / 정의문에 KG 문구 유무`.

**(a) 편집 前 문면 쿼리 — discoverability 퇴행 검사**
`"assemble a harness from reusable ontology parts"`

| | HEAD | WT |
|---|---|---|
| candidates | Multi-agent 3.6 / Factory 3.307 / Workspace 2.7 | **동일** |
| n_nodes / budget_used | 41 / 900 | **41 / 900** |
| `c-composition` | 6.3 | 6.3 (KG 문구 반영) |
| `wf-compose-harness` | 4.5 | 4.5 (KG) |
| `pat-ontology-composition` | 6.3 | **5.4** (KG) |
| `agent-developer` / `aoi-developer` | 2.43 / 2.43 | 2.43 / 2.43 (KG) |

→ **탈락 노드 0, 후보 목록·예산 동일**. `pat-…` 6.3→5.4는 정의문에서 "ontology parts"
표현이 빠진 만큼의 term-match 감소이며, 여전히 팩 내 최상위권이라 **검색 가능성 퇴행 아님**.

**(b) 신규 문면 쿼리 — 개선 확인**
`"compose a new harness from the knowledge graph's typed parts"`

| | HEAD | WT |
|---|---|---|
| `c-composition` | 4.5 | **7.2** |
| `wf-compose-harness` | 3.6 | **5.4** |
| `pat-ontology-composition` | 3.6 | **4.5** |
| candidates | Multi-agent 3.038 / Factory 2.362 | Factory 3.78 / Multi-agent 3.645 |

→ 새 어휘로 부른 요청이 이제 정확히 그 노드로 seed된다(의도한 효과). n_nodes 41→26은
상위 노드가 예산을 더 먹어 생긴 정상적 축소(budget_used 899로 동일).

**(c) 관측 클러스터 쿼리** `"developer agent observes the assigned nodes as a budget-capped pack"`
→ HEAD/WT 후보·노드수·예산·relevance **전부 동일**, 정의문만 KG 문면
(`agent-developer` 7.2 / `os-developer` 7.2 / `oa-developer-external` 7.2 / `aoi-developer` 4.5).

**(d)** `"ontology-driven composition design pattern bill of materials"` → `pat-…` 11.25로
HEAD와 **동일 1위**. 노드 집합·예산 동일.

⇒ 편집된 정의문이 pack에 그대로 실리고(4쿼리 전부 KG 문면 확인), **편집 전 쿼리의 검색
결과 집합은 불변**이다.

### 2.3 build projection 파급 (materialize)

`skos:definition`은 emit 대상(`tools/materialize.py`:484 Workflow / :502 Pattern / :531 Role)
이므로 산출물 텍스트 파급을 직접 측정했다 (HEAD worktree vs WT, `diff -r`):

- `h-harness-factory`: `CLAUDE.md`·`MANIFEST.json` **byte-identical**. 유일 diff =
  `harness.lock.json` `individualCount` 245→250 (선행 oversight-pair 5노드).
- `h-multiagent`: diff = 정확히 **3문장**(`.claude/agents/implementer.md` description,
  CLAUDE.md:39 Workflow, :72 Pattern, :84 Role 재게시) + lock count. 구조·순서·파일 목록 불변.
- `h-workspace-synthesis`: 동일한 implementer 3줄 + 선행 태스크의 auditor/benchmarker 추가분.

⇒ 파급은 **의도한 문장에 정확히 한정**되고 부수 변경 0. 세 하네스 모두 materialize exit 0
(게이트 통과 = union이 여전히 validating).

---

## 3. 지적 사항 (notes)

### N1 — 계획 5의 "4곳"을 넘어 9노드 편집 (판정: **정당, 비차단**)

계획 지정 4곳 = `concepts.ttl` `c-composition` · `workflows.ttl` `wf-compose-harness` ·
`patterns.ttl` `pat-ontology-composition`(정의문) · `observation.ttl`:204 `oa-inspection-external`
/ `roles.ttl`:318 `agent-developer`.

추가된 4곳 = `os-developer` · `aoi-developer` · `oa-developer-external`(전부
"the assigned **ontology** nodes …budget-capped pack" — `agent-developer`와 **한 문장을
공유하는 공지시 클러스터**) + `role-implementer`("an authored **ontology** individual" —
`agent-developer`가 인스턴스화하는 archetype).

정당한 이유: 지정된 `agent-developer`만 고치면 **같은 파일 안 같은 문장이 서로 다른 용어**로
남아 이 항목이 없애려던 혼용이 재생산된다. 네 곳 모두 (a) 리터럴만 (b) 위상 델타 0
(c) prefLabel/id 무변경이라 위험 없음.

부수 관찰: 원 보고서 층 3의 "산문 혼용은 **6곳**뿐" 실측은 **과소 집계**였다(실제 ≥9).
같은 grep을 다음에 쓸 때는 prefix/`owl:Ontology`/주석 제외 후 `\bontolog` 전수로 재는 것이
정확하다(본 보고 §1.4 절차).

문서층에도 같은 성격의 소폭 초과가 있다(README Layout 주석, DESIGN:113 / README:78의
"knowledge base"→"knowledge graph"). 계획 문장의 **같은 부류·같은 방향**이며 산문뿐이라 수용.

### N2 — 잔여 문구 (판정: **이 단위의 done을 막지 않음**, 후속 권고)

| 위치 | 문구 | 왜 비차단인가 |
|---|---|---|
| `CLAUDE.md`:15 | Golden rule 1 "Never load the whole **ontology** into context" | 계획 1은 :3-5만 지정. 새 :9-10이 "`ontology/` = 두 층을 담는 store"를 선언했으므로 "the whole ontology"는 **store 전체**로 읽혀 틀리지 않음(모호할 뿐) |
| `ONTOLOGYSTYLE.md`:83 | "**온톨로지 전체**를 context에 로드하지 않는다" | 위 문장의 한국어 쌍둥이. 계획 4는 "한 줄 연결"만 지정 |
| `CLAUDE.md`:23 | "fix the **ontology** — do not weaken the shapes" | 실제 고치는 대상은 대개 ABox |
| `docs/DESIGN.md`:1 | 제목 "a harness **ontology** that scales without rot" | 계획 3은 §신설 + "grows" 3곳만 지정; 제목은 프로젝트명 성격 |

권고: Golden rule 1 + 그 §1c 쌍둥이만 별도 micro-dispatch로 정리(가장 많이 읽히는 문장이고,
"the whole **stored graph**"로 바꾸면 §Terminology와 완전히 맞물린다). DESIGN 제목은
프로젝트 이름이라 **유지 권고**.

### N3 — `id:wf-compose-harness` `ho:tokenEstimate 57` (판정: **비차단**, 정확도 권고)

- 그 노드가 pack에 싣는 텍스트(정의문)는 416자 → **460자**(≈104→≈115 토큰, chars/4)로 늘었는데
  선언값은 57로 불변.
- **[지킴] 위반 아님**: §1c는 Workflow에 `tokenEstimate` **존재**를 요구하고(있음),
  값의 산식은 규정하지 않는다. `lint_uniformity.py` tokenEstimate 축 0 violation.
- 과소평가는 **이 편집이 만든 결함이 아니라 HEAD부터 있던 것**(57 vs ≈104)이며 이번에 ~10%
  더 벌어졌다. 실측상 팩 절단은 없었다(§2.2의 budget_used 900/899/895 = HEAD와 동일).
- 권고: 예산 정확도를 원하면 57→**115** 근사 갱신(단독 리터럴, 위상 영향 0). 선택 사항.

### N4 — DESIGN §Terminology의 "87 files (31 …)" 수치 (cosmetic)

원 보고서 실측값을 그대로 인용. 본 검증에서 더 넓은 제외 집합으로 재측정하면 **93 파일**이다
(`grep -rl "ontology/"` — agent-memory/.git/node_modules/static 제외). rename 기각 결론은
정확한 자릿수에 의존하지 않으므로 결함 아님. 정 원하면 "~90 files"로 완화 표기 가능.

부수: `ontology/shapes/harness-shapes.ttl`에는 `owl:Ontology` 문서 IRI 선언이 없다(경로로
로드). §Terminology가 "`ontology/tbox/`, `ontology/shapes/`; IRI `…/schema`"로 묶은 것은
**층의 위치 나열 + 스키마 IRI**로 읽히므로 허용 범위.

---

## 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py
/usr/bin/python3 tools/lint_uniformity.py
git status --porcelain -- ontology/tbox ontology/shapes    # → 0 lines
git worktree add --detach <SCRATCH>/head HEAD              # baseline 격리

# 위상 증명: abox instance-triple symdiff (rdflib union)
#   → removed 9 / added 9, 동일 subject 9, predicate = {skos:definition, ho:observedFileScope}
# 라벨 증명: prefLabel 전수 대조 → changed 0, removed-id 0, added-id 5(선행 태스크)

for Q in "assemble a harness from reusable ontology parts" \
         "compose a new harness from the knowledge graph's typed parts" \
         "developer agent observes the assigned nodes as a budget-capped pack" \
         "ontology-driven composition design pattern bill of materials"; do
  PYTHONHASHSEED=0 /usr/bin/python3 <SCRATCH>/head/tools/retrieve.py "$Q" --format json
  PYTHONHASHSEED=0 /usr/bin/python3 tools/retrieve.py "$Q" --format json
done

for H in h-harness-factory h-multiagent h-workspace-synthesis; do
  PYTHONHASHSEED=0 /usr/bin/python3 tools/materialize.py $H --out <SCRATCH>/m_w_$H
  ( cd <SCRATCH>/head && PYTHONHASHSEED=0 /usr/bin/python3 tools/materialize.py $H --out <SCRATCH>/m_h_$H )
  diff -r <SCRATCH>/m_h_$H <SCRATCH>/m_w_$H
done
```

**워킹트리 격리 주의**: `roles.ttl` / `capabilities.ttl` / `concepts.ttl` / `harnesses.ttl`의
diff에는 **선행 oversight-pair 태스크**(role-benchmarker·role-auditor·cap-benchmarking·
cap-audit·c-oversight = +44 triple)가 섞여 있다. 본 판정은 그 5노드를 필터한 뒤의 델타만
본 적용 단위에 귀속시켰다(§1.3).
