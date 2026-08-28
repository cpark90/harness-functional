---
verdict: pass-with-notes
scope: tools/plane-editor — 링크 평면 타입 어휘의 **그래프 파생**(하드코딩 제거) · 게이트 회복 · 폐기 어휘 정리
criteria: 브리프 판정항목 1~6 (게이트 회복 / 파생의 진위 양방향 / 이빨 유지 / 폐기 정리 정직성 / 무회귀 / 결론 유지 여부)
baseline: 현재 워킹트리. HEAD `cd4bb5d` 는 무회귀 1:1 대조의 baseline 으로만 사용 (이 lane 의 마지막 커밋은 `00e2473`, 그 뒤 84개 미커밋 항목이 이 lane 의 누적 상태)
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
gate-recovery: `check_links.py --store link-store` exit 0 · `run-link-checks.mjs` **70/70 PASS** (31.9s) · negative control 11/11 "exit 1 + 위반 정확히 1건"(suite C4 는 28/28)
derivation: **진짜다 — 내가 직접 그래프 사본을 변형해 6방향 실측**. 추가(kind·**신규 술어**) red->green, 은퇴(kind·술어) green->red, `rdfs:range` 재선언 / `ho:LinkShape` `sh:or` 축소도 판정이 따라 움직임. 상수 `GRAPH_LINK_TYPES` 소멸 확인
teeth: 실재하지 않는 술어·kind 12모양 전부 `link-type-unknown`(exit 1) · `ho:supersedes` 유입 시 `vocabulary-provenance`(B9) · 술어 파생이 **0개면** 링크가 하나도 없는 빈 스토어도 `vocabulary-provenance`(fail-closed) · 그래프 파싱 불가 시 traceback 없이 exit 2
honesty: 타입 변경은 `overlapsWith` -> `id:kind-overlap` **13건뿐**이고 다른 필드 변경 0. 대상 개체 정의가 "replacing the retired crisp ho:overlapsWith"라 의미 보존. 가중 미탑재를 README 에 "결정 대기"로 명시
no-regression: 19 시나리오 × 3레인 **57셀 HEAD 와 전부 동일** · 336 레인 측정 오해소 **0** · 3회 별 프로세스 byte-identical(재실행 **전** 디스크본과도 동일) · repo 게이트 3종 PASS · 담당 경로 밖 변경 0 (트리 해시 무변경)
new-notes: N-1 kind 집합 소멸은 fail-closed 가 **아니다**(술어 집합은 맞다 — 비대칭) · N-2 `kindForm.targetTypes` 상태가 **text 모드에는 안 실린다**(docstring 은 "언제나 출력"이라고 씀) · N-3 파생 집합이 `ho:Link` 배관(`linkTarget`·`linkKind`)과 조립 술어까지 **허용 어휘로 넓어졌다** · N-4 kind 가 산문으로만 선언한 **대칭성(미러 금지)** 을 평면이 강제하지 못한다(그래프 schema 확장 사안)
carried-over: from==to 자기 링크 · 같은 간선 두 id 중복 — 여전히 통과(이번 wave 가 만든 것 아님, 이전 판정에서 이미 보고)
blocking-decision: **결론 유지 — (a) 착수 가능.** 이 어휘 변경은 직전 판정의 결론을 뒤집지 않는다(차단 조건 0개). N-1~N-4 는 바인딩 wave 브리프에 실을 항목이지 차단 사유가 아니다
---

# 판정 — 링크 평면 타입 어휘의 그래프 파생 (vnv, 8차)

**verdict: pass-with-notes.**

- **게이트는 회복됐고, 회복 방식이 옳다.** 직전 판정(`plane-editor-document-axis-verify.md`)이
  "워킹트리의 링크 게이트가 지금 red — 원인은 병행 ontology lane"이라고 적어 둔 그 red 가
  사라졌다. 그런데 **검사를 약화해서 통과시킨 것이 아니다**: 상수 목록을 지우고 어휘의
  출처를 그래프로 옮겼고, 목록이 사라진 자리에 이빨은 그대로 남아 있다(§3).
- **"파생이다"를 developer 의 상설 검사(C11)로 믿지 않고 내가 따로 쟀다.** C11 과 **겹치지
  않는 변형**으로 그래프 사본을 6방향 고쳐 판정이 따라 움직이는지를 봤다(§2). 특히 C11 이
  하지 않는 방향 — **새 술어를 하나 신설**하면 그 술어를 쓰는 스토어가 red→green, **실사용
  스토어가 쓰는 kind 를 은퇴**시키면 green→red — 둘 다 실측했다.
- **정직성 검사에서 의미가 조용히 바뀐 곳은 없다.** `type` 이 바뀐 레코드는 13개이고 전부
  같은 이행(`overlapsWith` → `id:kind-overlap`)이며, 같은 파일의 다른 필드는 하나도 바뀌지
  않았다(§4). 대체 개체의 `skos:definition` 이 스스로 "replacing the retired crisp
  `ho:overlapsWith`"라고 말하므로 "같은 뜻인 척"이 아니라 그래프가 선언한 이행이다.
- **무회귀는 셀 단위로 확인했다.** 앵커 스위트 19 시나리오 × 3 레인 = **57 셀이 HEAD 와 전부
  동일**하고, 336 레인 측정의 오해소는 **0**이다(§5).
- **그러나 파생으로 옮기면서 새로 생긴 틈이 넷 있다**(§6). 전부 **비차단**이지만, 하나(N-4)는
  이 평면 코드로는 못 닫고 **그래프 schema 확장**이 필요한 항목이라 다음 브리프에 실어야 한다.

판정 요지: **verification = PASS**(게이트 수치·결정성·무회귀·경계 전부 재현),
**validation = 목적 부합**(어휘가 그래프를 실제로 따라간다 — 코드 변경 없이 어휘 추가를
인정하고 은퇴를 거절한다). 결론은 **(a) 착수 가능 유지**.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
S=<scratch>

# ① 재실행 **전에** 디스크본을 먼저 해시한다 (내 실행이 덮어쓴 것과 구별하려고)
cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $S/disk/ ; sha256sum $S/disk/*

# ② 게이트 회복
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store ; echo $?
node tools/plane-editor/run-link-checks.mjs ; echo $?

# ③ negative control 전수 (링크 평면 11종) — 하나하나 "exit 1 + 위반 1건"인지
for d in tools/plane-editor/fixtures/link-plane/negative-*/; do
  /usr/bin/python3 tools/plane-editor/check_links.py --store "$d" --format json ; echo $? ; done

# ④ ★ 파생의 진위 — **격리 사본**을 변형해 양방향 실측 (원본 ontology/ 는 읽기만)
cp -r ontology $S/gc/ontology ; cp catalog-v001.xml $S/gc/ ; cp tools/*.py $S/gc/tools/
HO_TOOLS_DIR=$S/gc/tools HARNESS_CATALOG=$S/gc/catalog-v001.xml \
  /usr/bin/python3 tools/plane-editor/check_links.py --store <store>
/usr/bin/python3 docs/verify/plane-editor-vocab-realign-probe.py      # E0~E9 (이 리포트의 프로브)

# ⑤ 무회귀 — 격리 사본에서 앵커 스위트 3회 + HEAD 와 셀 1:1
rsync -a --exclude node_modules tools/plane-editor/ $S/tree/pe/
ln -sfn <abs>/tools/plane-editor/node_modules $S/tree/pe/node_modules
for i in 1 2 3; do (cd $S/tree/pe && node run-suite.mjs); done ; sha256sum ...
git show HEAD:tools/plane-editor/suite-result.json > $S/head-suite.json   # 57셀 대조

# ⑥ repo 게이트 3종 + 경계
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py
find tools/plane-editor -path '*/node_modules' -prune -o -type f -print0 | sort -z \
  | xargs -0 sha256sum | sha256sum        # 판정 전후 동일 = 내 실행이 트리를 안 건드림
```

프로브는 내 파일 경계 안에 남겼다: `docs/verify/plane-editor-vocab-realign-probe.py`.
`tools/plane-editor/` 와 `ontology/` 를 **읽기만** 하고 변형은 전부 scratch 사본에서 한다.

## 1. 게이트 회복 (판정항목 1)

| 측정 | 결과 |
|---|---|
| `check_links.py --store tools/plane-editor/link-store` | **exit 0** · 7 link · 6 decision · 6 annotation record · 378 graph individual |
| 파생된 어휘 (그 실행이 스스로 출력) | **68** `ho:` predicate · **5** `ho:LinkKind` 개체 `[id:kind-alternative, id:kind-broader, id:kind-fragment, id:kind-overlap, id:kind-topic]` · plane-internal `supersedes` |
| `node run-link-checks.mjs` | **70/70 checks ok · PASS · exit 0** (wall 31.9s, C0–C11) |
| C3 양성 대조 | link-store 0 violation / control fixture 0 violation |
| C4 negative control | **28/28 ok** (링크 평면 11 + 주석 스토어 17) |

**negative control 전수 재측정 (내가 따로 돌린 것 — 이름과 실제 발화 규칙의 대조):**

| fixture | exit | 위반 수 | 발화한 규칙 |
|---|---|---|---|
| `negative-annotation-document-mismatch` | 1 | 1 | `endpoint-document-mismatch` |
| `negative-annotation-document-missing` | 1 | 1 | `endpoint-document-missing` |
| `negative-annotation-state-unknown` | 1 | 1 | `annotation-anchor-state-unknown` |
| `negative-bad-type` | 1 | 1 | `link-type-unknown` |
| `negative-graph-source` | 1 | 1 | `direction-graph-source` |
| `negative-missing-iri` | 1 | 1 | `graph-endpoint-missing` |
| `negative-missing-record` | 1 | 1 | `record-endpoint-missing` |
| `negative-orphan-link` | 1 | 1 | `orphan-link` |
| `negative-supersedes-cycle` | 1 | 1 | `decision-supersedes-cycle` |
| `negative-supersedes-graph` | 1 | 1 | `supersedes-boundary` |
| `negative-tagged-range` | 1 | 1 | `link-type-range` |

11/11 "exit 1 + 위반 **정확히 1건**"이고, 모든 규칙이 fixture 이름이 주장하는 것과 일치한다
(= 이름만 남고 다른 사유로 터지는 대조군이 없다).

## 2. ★ 파생이 진짜인가 — 그래프 사본을 변형해 양방향 실측 (판정항목 2, 본체)

### 2.1 하드코딩은 남아 있지 않다

- HEAD 에 있던 `GRAPH_LINK_TYPES = ("alternativeOf", "constrainedBy", "derivedFrom",
  "overlapsWith", "tagged")` 는 **소멸**했다(`grep -c GRAPH_LINK_TYPES` 현재 0).
- 남은 상수는 그래프가 소유하지 않는 것뿐이다: `DECISION_INTERNAL_TYPES = ("supersedes",)`
  와 파생이 겨누는 **자리 이름**(`LINK_KIND_CLASS`/`LINK_TARGET_PROPERTY`/`LINK_SHAPE_NAME`/
  `KIND_REF_PREFIX`). 관계 **이름 목록**은 어디에도 없다.
- 술어 집합은 도구 층 `ontology_lib.link_predicates(g)` 를 **호출**한다(복제 아님).
- 편집기 쪽(`src/link-plane.mjs`)도 목록을 갖지 않고 `--emit-contract` 가 낸 것을 그대로
  펼친다(`graphVocabulary + graphKinds + decisionInternal`). 계약 표면 실측:
  `--emit-contract` → `linkTypes.source = "derived-from-graph"`, `graphVocabulary` 68개,
  `graphKinds` 5개.

### 2.2 반사실 — 사본을 고치면 판정이 따라 움직인다

전부 `HO_TOOLS_DIR`/`HARNESS_CATALOG` 로 도구 층·카탈로그를 **사본으로 갈아끼운** 실행이다.
C11(developer 의 상설 검사)이 쓰는 변형과 **겹치지 않게** 골랐다.

| # | 사본에 가한 변형 | 대상 스토어 | 변형 전 | 변형 후 |
|---|---|---|---|---|
| **E1** | `id:kind-overlap` 을 `ho:LinkKind` 에서 강등 (**실사용 kind 은퇴**) | **실사용 link-store** | exit 0, kinds=5 | **exit 1 `link-type-unknown`**, kinds=4 |
| **E2** | `ho:vnvProbeRelation a owl:ObjectProperty` **신설** | bare `vnvProbeRelation` 링크 | exit 1 `link-type-unknown`, pred=68 | **exit 0**, pred=**69** |
| **E3** | `ho:tagged` 의 `rdfs:range` 를 `ho:Concept`→`ho:DesignPattern` | `negative-tagged-range` fixture | exit 1 `link-type-range` | **exit 0** (제약이 그래프를 따라감) |
| **E4** | `ho:LinkShape` 의 `sh:or` 를 `[sh:class ho:Tool]` 로 축소 | kind→graph 프로브 | exit 0 | **exit 1 `link-type-range`** ("ho:LinkShape allows ho:linkTarget to be ho:Tool") |
| **E5** | `ho:supersedes a owl:ObjectProperty` **유입** | 실사용 link-store | exit 0 | **exit 1 `vocabulary-provenance`** (B9 경계 알람) |
| **E6** | `ho:` ObjectProperty 선언 **전멸**(0개) | 실사용 link-store / **빈 스토어** | exit 0 / exit 0 | **exit 1** `vocabulary-provenance`+`link-type-unknown`×6 / **exit 1 `vocabulary-provenance`** |
| **E7** | `ho:LinkKind` **클래스** 선언 강등 | 실사용 link-store | exit 0 | exit 0 (개체 타입은 살아 있으므로 오탐 없음 — 의도대로) |

E1·E2 가 브리프가 요구한 양방향이다. **E2 는 C11 이 하지 않는 방향**(C11 은 kind 만 추가한다)
이고, **E1 은 C11 이 하지 않는 대상**(C11 은 술어만 은퇴시킨다 + 프로브 스토어를 쓴다;
E1 은 **실사용 link-store** 를 red 로 만든다). E3·E4 는 "재사용이 이름뿐이 아니다"(대상 타입
제약)까지 파생임을 보인다.

각 변형 뒤 **원상복구 실행**을 붙여 전부 원래 판정으로 돌아옴을 확인했고(프로브의
`restored:` 줄), 실험 끝에 원본 3파일이 사본과 **byte-identical** 임을 확인했다
(`ontology/tbox/harness.ttl` · `ontology/abox/core/vocab/concepts.ttl` ·
`ontology/shapes/harness-shapes.ttl` → 전부 `True`). `git status --porcelain -- ontology`
의 항목 수는 판정 전후 **13 으로 동일**(= 병행 lane 의 변경만, 내가 만든 것 0).

### 2.3 developer 의 상설 검사(C11)도 비공허하다

C11 은 매 실행 `ontology/`+catalog+`tools/*.py` 를 임시 사본으로 복사해 두 방향을 잰다.
내 실행에서 실제로 출력된 수치: kind 추가 **5→6** (같은 스토어 exit 1→0), `ho:tagged` 강등
**68→67** (같은 스토어 exit 0→1, 위반 1건), 그리고 원본 무수정 byte 비교 ok. **일회성 실험이
아니라 스위트 안에 박혀 있다**는 주장은 사실이다.

한 가지 취약점: C11 의 변형은 TTL **표면 문자열**(`ho:tagged a owl:ObjectProperty ;`)에
의존한다. 병행 lane 이 그 줄의 표기만 바꿔도(예: `a owl:ObjectProperty, owl:… ;`) C11 은
throw 한다. 다만 그때 나오는 것은 조용한 통과가 아니라 **명시적 사유와 함께 suite FAIL**
("re-point this experiment at a predicate the graph actually declares")이므로 fail-loud 다.
비차단으로 둔다.

## 3. 이빨은 남아 있는가 (판정항목 3)

**3.1 실재하지 않는 어휘를 주장하는 링크 — 12모양 전부 `link-type-unknown`, exit 1**

| 주장한 type | 결과 |
|---|---|
| `id:kind-vnv-absent` (없는 kind) | exit 1 `link-type-unknown` — 사유에 현존 kind 목록을 실어 준다 |
| `id:c-traceability` (그래프엔 있으나 LinkKind 아님) | exit 1 — "exists … but is not a ho:LinkKind individual" |
| `overlapsWith` / `alternativeOf` (폐기된 술어) | exit 1 (각각) |
| `Concept` (클래스 이름) · `maturity` (데이터 술어) | exit 1 |
| `kind-overlap` (kind 를 bare 로) · `ho:tagged` (full IRI 표기) | exit 1 |
| `broader` (`skos:` 술어 — `ho:` 아님) | exit 1 |
| `id:kind-overlap ` (후행 공백) · `id:Kind-Overlap` (대소문자) | exit 1 |
| `""` (빈 문자열) | exit 1 (`link-type-unknown` + `store-format`) |

폐기 술어에 대한 사유 문구가 **마이그레이션 경로**를 안내하되("if the predicate was RETIRED,
re-point this record at the link kind that replaced it (present kinds: …)") **폐기→대체 표를
코드에 두지 않는다** — 현존 kind 목록을 그래프에서 읽어 붙일 뿐이다. 브리프의 "표를 코드에
두지 말 것" 요구와 일치한다.

**3.2 `ho:supersedes` 알람(B9)은 살아 있다** — E5 실측: 사본 TBox 에 `ho:supersedes` 를
신설하면 실사용 스토어가 exit 1 `vocabulary-provenance` ("a decision-plane-internal type now
exists as graph vocabulary — the plane/graph boundary (B9) must be re-decided, not silently
merged"). 반대로 `negative-supersedes-graph` fixture(평면 내부형이 graph 종단점을 겨냥)는
`supersedes-boundary` 로 잡힌다. 양쪽 경계 다 발화한다.

**3.3 "평가 불가는 결과 없음이 아니다"는 술어 축에서 참이다** — 사본에서 `ho:` ObjectProperty
를 **0개**로 만들면, 링크가 **하나도 없는 빈 스토어**조차 exit 1 `vocabulary-provenance`
("an evaluation that read nothing is a violation, never a silent pass"). 같은 조건의 무수정
사본에서 그 빈 스토어는 exit 0 이므로 이 발화는 **비공허**하다. (kind 축은 그렇지 않다 — §6 N-1.)

**3.4 그래프를 못 읽으면 exit 2** — 사본 TBox 중간에 비-turtle 을 끼워 넣으면 `--store` 도
`--emit-contract` 도 **exit 2**, stdout 없음, **Traceback 없음**, 사유는 "cannot load the
knowledge graph via …/ontology_lib.py: …". 도구 층 자체가 없으면(`HO_TOOLS_DIR=/nonexistent`)
역시 exit 2. 위반(exit 1)과 사용/입출력 오류(exit 2)의 분리가 지켜진다.

## 4. 폐기 정리의 정직성 — 의미가 조용히 바뀐 곳은 없다 (판정항목 4)

**4.1 바뀐 것은 `type` 필드뿐이다.** `git diff HEAD -- '**/links.json'` 에서 `type` 이 아닌
줄의 변경은 **단 하나**(`annotation-broken/links.json` 의 `"ref": "a1"→"f1"`)이고, 그것은
이 wave 가 아니라 이 lane 의 **직전 문서축 wave** 것이다(fixture 레코드 id 정합). 즉 어휘
정리를 하면서 종단점·`evidence`·`created_by` 를 슬쩍 고친 자리가 없다.

**4.2 이행은 13건, 전부 같은 한 쌍이다.** `overlapsWith` → `id:kind-overlap`
(link-store 1건 + fixture 12건). 다른 폐기 어휘로의 이행은 0건이다.

**4.3 의미 보존은 그래프가 선언한다.** `id:kind-overlap` 의 `skos:definition` 이 스스로
"The intersecting-scope relation kind, **replacing the retired crisp `ho:overlapsWith`** …
Symmetric — author ONE link per pair" 라고 말한다. 실제 이행된 링크
`ln-parallel-start-overlaps-link-store` 의 `evidence` 는 "both decisions scope the same Phase 2
wave; neither subsumes the other" 로, 대체 개체의 정의("each end says something the other does
not, so neither substitutes for the other")와 **정확히 같은 관계**다. `tagged` 로 바꿔 놓고
같은 뜻인 척한 자리는 없다(`tagged` 로 바뀐 링크 0건).

**4.4 README 는 축소하지 않고 늘려 적었다.** `link-store/README.md` 에 (a) 3형식 표기 표,
(b) **폐기 어휘 마이그레이션 표**(`ho:overlapsWith`·`ho:alternativeOf`·`ho:Anchor`, 각각
"의미 변화" 칸 포함), (c) 이 평면의 텍스트 anchor 와 그래프의 retired `ho:Anchor` 가 **이름만
같고 무관**하다는 명시, (d) **가중(weight) 은 싣지 않았고 사용자 결정 대기**라는 명시가 있다.
(d) 는 특히 정직하다 — 그래프의 `ho:Link` 는 `ho:linkWeight` 를 **필수**로 요구하는데
(`ho:LinkShape`) 평면 레코드에는 없으므로, "같은 것"인 척하지 않고 **아직 다르다**고 적은
것이 맞다. `fixtures/link-plane/README.md` 도 "어휘는 fixture 로 고정하지 않는다"를 사유와
함께 적고, 디스크 대조군이 어휘에 대해 주장하는 것은 `negative-bad-type` 의 **성질**
("그래프에 없는 이름")뿐임을 밝힌다.

## 5. 무회귀 (판정항목 5)

| 축 | 기준 | 측정 |
|---|---|---|
| 앵커 스위트 셀 | 19 시나리오 × 3 레인 = 57 셀이 HEAD 와 1:1 동일 | **변경 셀 0 · 신규 0 · 소실 0** (`scenarios` 19/19) |
| 오해소 | 전 레인 0 | **336 레인 측정, 오해소 0** — 보고된 `outcome` 을 버리고 `text` vs `expected` 로 내가 다시 분류. 불일치 2건은 둘 다 `outcome="drifted"` 로 **정직하게 분류된** 것(`totals.stale.driftChars=2`)이고 `wrong` 은 0 |
| 결정성 | 3회 byte-identical | `suite-result.json` `0b9d47cf5889…` · `REPORT.md` `f9fb09e9108…` · `schema-dump.json` `bcfab19be87…` — 3회 동일, **재실행 전 디스크본과도 동일** |
| 링크 검사기 결정성 | 2회 동일 | suite C5 ok (identical verdict JSON) |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 담당 경로 밖 변경 | 0 | `tools/plane-editor` 트리 해시 판정 전후 `74e799dbb2c1…` **동일**, `git status` 항목 수 84 로 불변. `ontology/` 항목 수 13 불변(전부 병행 lane) |

`schema-dump.json` 이 Phase 1·C1·C1b·직전 wave 와 **같은 해시**(`bcfab19be87…`)라는 것은
문서 스키마 무변경(G1)이 이번에도 유지됐다는 뜻이다.

`suite-result.json` 이 HEAD 와 68줄 다른 것은 이 wave 가 아니라 이 lane 의 **직전 wave**
(hardening/invariants/document-axis) 것이다: 바뀐 필드는 `forgedShapes 6→7`,
`rejectsRecordWithoutAnchors`, `rejectsDuplicateRecordId`, 언어 스캔 카운트 등이고
**시나리오×레인 셀은 하나도 바뀌지 않았다**(위 표 1행).

## 6. 이번 변경이 새로 연 틈 (전부 비차단, 다음 브리프 항목)

### N-1 kind 집합의 소멸은 fail-closed 가 아니다 (술어 축과 **비대칭**)

사본에서 **모든** `ho:LinkKind` 개체를 강등하면:

- 실사용 link-store: exit 1 `link-type-unknown` (kind 를 쓰는 링크가 잡힌다) ✔
- **kind 를 쓰지 않는 스토어(빈 스토어 포함): exit 0, kinds=0** ✘

술어 집합이 0 이면 **링크가 없어도** `vocabulary-provenance` 인데(§3.3), kind 집합이 0 인
것은 알람이 아니다. 그래프 재설계가 관계를 **술어에서 개체로** 옮겨 놓았으므로, 앞으로
"잘못된 union 을 읽고 있다"가 드러날 축은 오히려 kind 쪽이다. 위험은 한정적이다(kind 를
쓰는 레코드가 하나라도 있으면 즉시 red). 그래도 검사기 자신이 적은 원칙("평가 불가는 결과
없음이 아니다")이 두 축에 **비대칭으로** 적용되어 있다.

### N-2 `kindForm.targetTypes` 상태가 text 모드에는 실리지 않는다

docstring 은 "읽지 못한 것을 위반으로 올리지 않는 대신 **상태는 언제나 출력에 실린다(조용한
생략 금지)**"라고 적는다. `--format json` 은 맞다(`vocabulary.kindForm.targetTypes`). 그러나
사본에서 `ho:LinkShape` 를 없애고 **기본 text 모드**로 돌리면:

```
link vocabulary (derived from the graph): 68 ho: predicate(s) · 5 ho:LinkKind individual(s) [...] · plane-internal: supersedes
✓ every link resolves, every type is reused vocabulary, and the decision plane is well-formed
PASS
```

— `[unavailable: no ho:LinkShape in the shapes graph]` 가 **한 글자도 나오지 않는다**(JSON 에는
나온다). 사람·CI 가 읽는 기본 경로에서는 kind 형 대상 제약이 **사라진 사실이 안 보인다**.
문구를 고치거나(“JSON 에 실린다”) text 요약에 상태를 한 조각 붙이거나 둘 중 하나면 닫힌다.

### N-3 파생 집합이 `ho:Link` **배관**과 조립 술어까지 허용 어휘로 넓혔다

예전 목록은 관계 어휘 5개(`alternativeOf/constrainedBy/derivedFrom/overlapsWith/tagged`)로
**큐레이션**돼 있었다. 지금은 "살아 있는 `ho:` `owl:ObjectProperty` 전부"= 68개이고,
거기에는 조립 술어(`hasComponent`·`hasSystemPrompt`·`stepUsesTool` …)와 **가중 링크 층 자신의
배관**(`ho:linkTarget`·`ho:linkKind`·`ho:hasLink`)이 포함된다. 실측:

| 평면 레코드가 주장한 type | 결과 |
|---|---|
| `linkTarget` → `id:c-traceability` | **exit 0** (rdfs:range 가 **일부러** 없는 술어 → 무제약) |
| `linkKind` → `id:kind-overlap` | **exit 0** |
| `specializes` / `derivedFrom` → `id:c-traceability` | **exit 0** (둘 다 range 없음) |
| `hasComponent` / `providesCapability` / `hasLink` → `id:c-traceability` | exit 1 `link-type-range` (range 가 잡아 준다) |

완충은 있다 — **68개 중 64개가 `rdfs:range` 를 선언**하므로 대부분은 대상 타입에서 걸린다
(range 없는 4개: `derivedFrom` · `linkKind` · `linkTarget` · `specializes`). 그래도
`"type": "linkTarget"` 이 서명받는 것은 "관계 어휘 재사용"의 뜻과 어긋난다: `ho:linkTarget`
은 관계가 아니라 reified `ho:Link` 노드의 **슬롯**이다. 닫으려면 **코드 목록으로 되돌리지
말고** 그래프가 선언한 것으로 걸러야 한다(예: 도메인/레인지가 `ho:Link` 인 술어 제외, 또는
"평면이 쓰는 관계는 kind 형만" 이라는 결정). 이건 설계 결정이므로 판정으로 강제하지 않는다.

### N-4 kind 의 **대칭성(미러 금지)** 을 평면이 강제하지 못한다 — 그래프 schema 확장 사안

`id:kind-overlap`·`id:kind-alternative`·`id:kind-fragment` 는 정의에 "**Symmetric — author ONE
link per pair, never mirrored**"라고 적혀 있다. 그런데 그 대칭성은 **산문(`skos:definition`)
에만** 있다: `ho:LinkKindShape` 가 요구하는 kind 필드는 `prefLabel`·`definition`·
`traversalWeight` 뿐이고 대칭성 술어는 없다(`grep symmetr` 로 확인 — TBox 에서도 산문 서술만).
실측: `id:kind-overlap` 으로 A→B, B→A 두 링크를 넣으면 **exit 0, 위반 0**.

파생 원칙상 이건 평면 코드로 닫을 수 없다(코드에 "이 kind 는 대칭"이라고 적는 순간 이번
wave 가 없앤 하드코딩이 돌아온다). 담을 **어휘 범주 자체가 없는** 경우이므로
`CLAUDE.md` 의 규칙대로 **schema(TBox) 확장을 먼저 트리거**하는 것이 맞다:
`ho:LinkKind` 에 기계가 읽는 대칭성 플래그(예: `ho:kindSymmetric xsd:boolean`)를 두면
평면 게이트도 그래프도 같은 자리에서 미러를 잡을 수 있다. **이 lane 이 아니라 ontology lane
으로 넘길 항목**이다.

### 이어지는(carried-over) 잔여 — 이번 wave 가 만든 것 아님

- `from == to` 자기 링크: kind 형으로도 **exit 0** (순환 검사는 `supersedes` 에만 있다)
- 같은 간선을 **다른 id** 로 두 번: **exit 0** (중복 규칙 없음)

둘 다 이전 판정에서 이미 보고한 구멍이고 이번 변경과 무관하게 그대로다.

## 7. 결론 (판정항목 6)

**바인딩 wave 를 시작해도 되는 상태다 — 직전 판정의 (a) 착수 가능은 유지되고, 이 어휘
변경은 그 결론을 뒤집지 않는다.**

근거: (i) 게이트가 **약화 없이** 초록으로 돌아왔고(negative control 11/11·28/28 유지),
(ii) 어휘가 그래프를 실제로 따라간다는 것이 **양방향 반사실로 실측**되었으며(E1·E2),
(iii) 어휘 정리가 의미를 조용히 바꾼 자리가 없고, (iv) 무회귀 축(57셀·336측정·3회
byte-identical·게이트 3종)이 전부 유지된다. 새로 낸 N-1~N-4 는 **차단 사유가 아니라 다음
브리프에 실을 항목**이며, 그중 **N-4 만 이 lane 밖(ontology schema)** 이다.

## 8. 다음 wave 가 스스로 잴 기준 (내가 세우는 수치, 완화 금지)

| # | 항목 | 충족 기준(수치) | 소관 |
|---|---|---|---|
| 1 | N-1 kind 축 fail-closed | `ho:LinkKind` 개체 0개인 사본에서 **링크 없는 빈 스토어**가 exit 1 `vocabulary-provenance`; 무수정 사본에서 같은 스토어는 exit 0 (비공허) | plane-editor |
| 2 | N-2 상태의 가시성 | `ho:LinkShape` 없는 사본에서 **기본 text 출력**에 `unavailable` 상태 문자열이 나타남 (또는 docstring 문구를 "JSON 에 실린다"로 정정) | plane-editor |
| 3 | N-3 허용 어휘의 폭 | `"type": "linkTarget"` / `"linkKind"` 가 exit 1 이 되거나, README 가 "배관 술어도 허용된다"를 **명시**해 의도임을 선언 — 단 **코드 목록 재도입 금지**(그래프 선언에서 파생한 필터여야 함) | plane-editor + 결정 |
| 4 | N-4 대칭 kind 미러 금지 | `ho:LinkKind` 에 기계가 읽는 대칭성 선언이 생기고, 그 선언이 있는 kind 로 A→B·B→A 를 넣으면 exit 1 | **ontology lane (TBox 확장)** |
| 5 | 무회귀 | 19×3=57 셀 1:1 동일 · 오해소 0 · 3회 byte-identical · repo 게이트 3종 PASS · 담당 경로 밖 변경 0 | plane-editor |
