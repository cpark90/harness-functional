---
verdict: pass-with-notes
kind: vnv-verification
target: tools/plane-editor/{link-store/, check_links.py, run-link-checks.mjs, src/link-plane.mjs, src/decision-plane.mjs, fixtures/link-plane/}
brief: docs/plans/plane-editor-phase2-brief.md   # §6 게이트 G1–G6
measured: 2026-08-28 14:37–14:48 (KST), HEAD=765eb54 + uncommitted working tree
interpreter: /usr/bin/python3 (rdflib/pyshacl/owlrl), node v22.22.3
---
# Phase 2 판정 — 링크 평면 + 설계결정 평면

**verdict: pass-with-notes.** 브리프 §6의 G1–G6을 전부 실측으로 충족했다. developer 자기보고의
수치는 내가 독립 재현했고(재현 실패 0건), 그 위에 브리프가 요구하지 않은 **적대적 우회 27케이스**를
직접 창안해 주입했다 — 요구된 negative control 5종 밖에서 **막지 못하는 3가지 모양**(F2·F3)과,
동시 진행 중인 C1b lane과의 **버전 충돌 1건**(F1)이 나왔다. 셋 다 이번 wave의 게이트를 깨지는
않지만 F1은 다음 wave(앵커 바인딩) 착수 전에 메워야 한다.

**측정 시점 주의**: `ontology/`와 `tools/plane-editor/src/{anchors,blocks,…}.mjs`는 다른 세션
(sim-hil B-wave / plane-editor C1b)이 동시에 편집 중이었다. 아래 수치는 각 절에 적힌 시각의
working tree 기준이며, 앵커 수치의 귀속은 §G4에 분리해 적었다.

---

## 0. 재현 명령 (전부 repo root에서)

```bash
/usr/bin/python3 tools/plane-editor/check_links.py                      # exit 0, PASS
/usr/bin/python3 tools/plane-editor/check_links.py --format json
/usr/bin/python3 tools/plane-editor/check_links.py --emit-contract
node tools/plane-editor/run-link-checks.mjs                             # 19/19 checks ok, PASS
/usr/bin/python3 tools/validate.py && /usr/bin/python3 tools/lint_uniformity.py \
  && /usr/bin/python3 tools/check_determinism.py                        # 3종 전부 exit 0
```

vnv가 창안한 적대적 프로브(스크래치에서만 실행, repo 무기록):
`<scratch>/adv.py`(27 케이스), `<scratch>/g2-node.mjs`(cap 반사실 5 층), `<scratch>/g3-store.mjs`
(직렬화 3세대). 산출 로그는 이 리포트에 인용된 수치가 전부다.

---

## G1 — 무결성 검사기 negative control : **PASS**

### (a) 브리프 요구 5종 + developer 추가 3종

`node run-link-checks.mjs`의 C4가 fixture별로 **control에서 딱 한 곳만** 망가뜨린 스토어를
검사한다. 내가 `diff -u control/<f> negative-*/<f>`로 8개 fixture 전부 대조해 **단일 변형**임을
확인했다(예외 1: `negative-supersedes-cycle`은 `supersedes` 필드 추가 + 대상 status 조정 2줄 —
두 번째 줄은 결함이 아니라 "위반 1건만 남기기 위한 정합성 조정"이다).

| fixture | 규칙 | exit | 위반 수 |
|---|---|---|---|
| negative-missing-iri | `graph-endpoint-missing` | 1 | 1 |
| negative-missing-record | `record-endpoint-missing` | 1 | 1 |
| negative-bad-type | `link-type-unknown` | 1 | 1 |
| negative-supersedes-graph | `supersedes-boundary` | 1 | 1 |
| negative-orphan-link | `orphan-link` | 1 | 1 |
| negative-graph-source | `direction-graph-source` | 1 | 1 |
| negative-tagged-range | `link-type-range` | 1 | 1 |
| negative-supersedes-cycle | `decision-supersedes-cycle` | 1 | 1 |

**vacuous 배제**: 정상 대조군 2개가 exit 0으로 통과한다 — 실제 link-store(5 link · 4 decision ·
graph 356→364 individuals)와 control fixture(4 link · 2 decision · **2 annotation record**).
control은 3개 평면 종단점·4개 링크 타입·평면 내부 `supersedes`를 모두 실제로 지나가므로 빈
통과가 아니다.

### (b) vnv가 창안한 우회 27케이스 (요구는 2건 이상)

`<scratch>/adv.py` — control에 표적 변형을 넣고 진짜 검사기로 판정. `?`는 "규칙 없음, 결과를
관찰만" 표시다.

| # | 우회 시도 | 결과 | 잡은 규칙 |
|---|---|---|---|
| a1 | 대소문자 변형 IRI `id:C-Traceability` | FAIL | graph-endpoint-missing (문법) |
| a2 | 스킴 대문자 `ID:c-traceability` | FAIL | graph-endpoint-missing |
| a3 | 접두사 아닌 **full IRI** `https://…/id/core/c-traceability` | FAIL | graph-endpoint-missing |
| a4 | 도메인 명시형 `id:core/c-traceability` (양성 대조) | **PASS** | — (같은 노드로 해소) |
| a5 | 후행 공백 `id:c-traceability` + 공백 1자 | FAIL | graph-endpoint-missing |
| a6 | zero-width space 삽입 | FAIL | graph-endpoint-missing |
| a6b | 한 글자 뺀 유사 slug `id:c-tracebility` | FAIL | 실재 판정(추정 아님) |
| a7 | **자기 자신을 겨냥한 링크**(overlapsWith, from==to) | **PASS** | — → **F3** |
| a8 | 자기 자신 supersedes | FAIL | cycle + status-incoherent |
| a9 | **supersedes 3-순환**을 링크만으로(레코드 필드 없이) | FAIL | decision-supersedes-cycle |
| a10 | 같은 from/to/type을 다른 id로 중복 | **PASS** | — → **F3** |
| a11 | `tagged`(range Concept)를 **decision 레코드**에 겨냥 | **PASS** | — → **F2** |
| a12 | `constrainedBy`(range Constraint)를 Concept에 겨냥 | FAIL | link-type-range |
| a13 | `derivedFrom`(TBox에 range 없음)을 아무 노드에 | **PASS** | — → **F2** |
| a14 | 빈 스토어(link 0·decision 0) | **PASS** | — (F6) |
| a15 | annotation 종단점 + `annotations.json` 부재 | FAIL | record-endpoint-missing ×2 (**fail-closed**) |
| a16 | graph→graph 링크 | FAIL | direction-graph-source |
| a17 | 스토어 version 2로 위조 | **exit 2** | StoreError |
| a18 | 깨진 JSON | **exit 2** | StoreError |
| a19 | id 역순 직렬화 | FAIL | store-format(정렬) |
| a20 | plane 이름 `Graph` | FAIL | link-endpoint-plane |
| a21 | 링크 레코드에 없는 필드 `weight` | FAIL | store-format |
| a22 | superseded 대상이 status `accepted` | FAIL | decision-status-incoherent |
| a23 | title+body = 정확히 260 token | PASS | — (경계 정상) |
| a23b | title+body = 261 token | FAIL | decision-text-cap |
| a24 | `supersedes`가 annotation 평면을 겨냥 | FAIL | supersedes-boundary |
| a25 | decision id에 `dec-` 접두사 없음 | FAIL | store-format |

### (c) 어휘 재사용 주장의 반증 시험 (설계 검증 항목)

"링크 타입은 그래프에 이미 있는 `ho:` 어휘"라는 주장이 **말뿐이 아닌지** 재기 위해, 온톨로지
사본을 만들어 TBox를 변형하고(원본 무수정) 검사기를 돌렸다.

```bash
rsync -a ontology/ <scratch>/ont-mut/ontology/ ; cp catalog-v001.xml <scratch>/ont-mut/
HARNESS_CATALOG=<scratch>/ont-mut/catalog-v001.xml /usr/bin/python3 tools/plane-editor/check_links.py
```

| 변형 | 결과 |
|---|---|
| 사본 무변형(양성 대조) | PASS |
| `ho:overlapsWith`를 `owl:AnnotationProperty`로 강등 | FAIL `vocabulary-provenance` — "not declared as an owl:ObjectProperty" |
| `ho:supersedes`를 그래프 어휘로 신설 | FAIL `vocabulary-provenance` — "the plane/graph boundary (B9) must be re-decided" |

즉 어휘 재사용은 **양방향으로 강제**된다: 5종은 TBox에 살아 있어야 하고, 평면 내부 전용
`supersedes`는 그래프에 나타나면 안 된다. `git diff --stat -- ontology/tbox/harness.ttl` 은
빈 출력 = repo 원본 무접촉.

---

## G2 — cap 계약 표면 : **PASS** (값 복제가 아님, 강한 증거)

도구 층 사본을 4가지로 만들어 **`HO_TOOLS_DIR`로만 갈아끼우고** 편집기(Node) 판정이 따라가는지
쟀다. 원본 `tools/lint_uniformity.py`는 수정하지 않았다(`git diff --stat -- tools/lint_uniformity.py`
= 빈 출력; 그 파일은 다른 세션 소유).

| 도구 층 | 계약이 내보낸 값 | Python 검사기 | **편집기가 받아들이는 최대 body** |
|---|---|---|---|
| 실제 `tools/` | cap 260, chars-div-4 | PASS | **1043자** (=260 token) |
| cap만 260→40 | cap 40, chars-div-4 | **FAIL** — decision-text-cap 4건(171·132·164·121 token) | **163자** (=40 token) |
| 추정기만 `//4`→`//8` | cap 260, **chars-div-8** | PASS | **2087자** (=260 token) |
| 추정기를 단어수로(=chars//N로 표현 불가) | — | **exit 2** | 편집기가 **거부**: "cannot express the tool-layer estimator as chars//N" |
| `TEXT_CAP_TOKENS` 심볼 삭제 | — | **exit 2** | 편집기가 **거부**: "no longer defines TEXT_CAP_TOKENS" |

값이 JS에 복제돼 있었다면 1043자 경계가 세 층에서 모두 같았을 것이다. 실제로는 cap만 바꿔도
경계가 1043→163으로, 추정기만 바꿔도 1043→2087로 움직인다. 게다가 계약이 깨지면 **조용한
기본값으로 흐르지 않고 큰 소리로 멈춘다**(exit 2 → Node 예외). 코드 전수 grep으로도 `260`·
`/ 4` 리터럴이 편집기 쪽에 **0건**임을 확인했다.

---

## G3 — 결정론 : **PASS**

별 **프로세스 3회**(같은 프로세스 내 2회 반복인 스위트 자체 C5와 별개)로 쟀다.

| 산출 | md5(3회) |
|---|---|
| `check_links.py --format json` | `073752a0…` ×3 (14:48 측정) |
| `check_links.py` (text) | `5ca3b69a…` ×3 |
| `check_links.py --emit-contract` | `2ca8fa4e…` ×3 |
| `node run-link-checks.mjs` | `cffaa9f4…` ×3 (14:38·14:48 두 시점 모두 동일) |

스토어 직렬화는 **save(load(…))를 3세대 연쇄**해 재보다: 3세대 전부 디스크와 byte-identical
(`links d43172cb…`, `decisions f93572f3…`). 입력 배열을 뒤집어 넣어도 같은 바이트가 나온다 =
id 오름차순 정렬이 실제로 총순서를 만든다.

**단 하나의 시간 의존**: JSON 출력에 `counts.graphNodes`가 실려 있어 14:38의 356이 14:48에
364로 바뀌었다(동시 진행 sim-hil lane이 개체 8개 저작). 검사기가 그래프를 실제로 읽는다는
증거이지 비결정성이 아니다 — 다만 이 JSON을 골든 산출물로 커밋하면 그래프마다 흔들린다(F6).
검사기가 의존하는 불변식(`instance_nodes`가 추론 유무와 무관)도 직접 확인: **364 = 364,
symdiff 0**.

---

## G4 — 앵커 회귀 : **PASS** (수치 귀속은 C1b lane)

**측정 2026-08-28 14:41 KST**, HEAD=765eb54 + C1b lane의 uncommitted 변경 포함. 공유 트리에
쓰지 않으려고 `tools/plane-editor/`를 스크래치로 복사(node_modules 심링크)해 거기서 스위트를
돌렸다.

| 항목 | 값 |
|---|---|
| G2 게이트 레인 `stale` | **28/30 = 93.33%** (survivalRate 0.9333, drifted 2, orphaned 0) |
| G2 `pipeline` | 30/30 = 100% |
| 전 레인·전 시나리오 **오해소(`wrong`)** | **0** (live 90 + pipeline 90 + stale 90 = 270 시행) |
| C1(S9·S10) / C1b(S11a–e) | 각 12·30 시행, wrong 0, 게이트 pass |

내 격리 실행의 `suite-result.json`은 in-tree 산출물과 **sha256 동일**(`7438458e…`) = 내가
재생산한 표 = 트리에 있는 표. 공유 트리의 `suite-result.json`·`REPORT.md`·`schema-dump.json`은
내가 한 바이트도 쓰지 않았다.

**귀속 분리**: 93.3%·오해소 0은 **C1b lane(앵커 엔진)의 소유**이고 Phase 2의 기여가 아니다.
Phase 2가 이 수치를 건드릴 수 없다는 것은 **양방향 무결합**으로 증명된다 —
`run-suite.mjs`·`src/{anchors,blocks,report,scenarios,session,store}.mjs`에서 `link-plane`·
`decision-plane`·`check_links`·`link-store` 참조 **0건**, 역으로 Phase 2 모듈이 앵커 엔진을
import하는 것도 **0건**. (측정 창 안에 in-tree `suite-result.json` 해시가 2d8db01d→7438458e로
한 번 바뀌었다 = C1b lane이 그 사이 재실행했다는 뜻이며, 내 14:41 실행은 뒤쪽 값을 재생산한다.)

---

## G5 — 경계 : **PASS**

`git status --porcelain` 기준 Phase 2 developer의 산출물은 **전부 신규 untracked**이고 브리프가
지정한 경로 안에만 있다:

```
?? tools/plane-editor/check_links.py
?? tools/plane-editor/run-link-checks.mjs
?? tools/plane-editor/src/decision-plane.mjs
?? tools/plane-editor/src/link-plane.mjs
?? tools/plane-editor/link-store/
?? tools/plane-editor/fixtures/link-plane/
?? .claude/agent-memory/developer/plane-editor-phase2-link-planes.md
```

기존 추적 파일 수정은 `.claude/agent-memory/developer/MEMORY.md`의 **인덱스 1줄**뿐이다
(같은 파일의 나머지 2줄은 sim-hil 세션 것 — diff로 확인). `tools/plane-editor/` 안의 M 표시
파일(anchors/blocks/report/scenarios/session/store/run-suite/README/REPORT/sample-state/
suite-result)은 **C1b lane 소유**, `ontology/**`·`ONTOLOGYSTYLE.md`·`docs/feedback/**`는
**sim-hil B-wave 세션 소유**다. 브리프가 금지한 `ontology/`·기존 `tools/*.py` 수정은 **0건**
(`check_links.py`에 write 연산 자체가 없다 — `open(...,'w')`·`os.remove` 부재; Node 쪽
`writeFileSync`는 호출자가 준 디렉토리의 `links.json`/`decisions.json`만 쓰고, 자체 스위트는
save 계열을 아예 호출하지 않는다).

**repo 게이트 3종 최종 재실행(14:48)**: `validate.py` exit 0 · `lint_uniformity.py` exit 0 ·
`check_determinism.py` exit 0.

**B9(그래프 재도입 금지) 실측**: `ontology/`에 `ln-*`·`dec-*`·`link-store` 문자열 **0건**,
중앙 `tools/*.py` 어디에서도 링크 스토어를 스캔하지 않으며, `retrieve.py "link plane decision
plane typed links between planes"` 팩에 스토어 레코드가 **누출 0**.

---

## G6 — 언어 정책 : **PASS**

Phase 2 신규 파일 **35개 전수 스캔**(주석·문서·fixture JSON 포함): 한글·ASCII 밖 문자는
`§`(SECTION SIGN) 뿐 — repo 관례의 조문 기호다. 그래프 데이터에 해당하는 스토어 값
(`title`/`body`/`evidence`/`created_by`)은 **non-ASCII 0자 = 전부 영어**로, `ONTOLOGYSTYLE §1d`의
"검색 대상 데이터 값은 영어" 규율과 일치한다. 산문 주석은 한글, 용어는 영어.

---

## 설계 검증 (브리프 판정 항목 6)

1. **어휘 1:1 대응 / 신조어 유입 0** — 링크 타입 5종은 전부 TBox에 `owl:ObjectProperty`로 실재
   (`tagged`·`derivedFrom`·`constrainedBy`·`alternativeOf`·`overlapsWith`), `ho:supersedes`는
   그래프에 **없음**(평면 내부 전용). 검사기가 이 두 사실을 매 실행 재확인하며, 내 TBox 변형
   실험이 그 규칙에 실제 이빨이 있음을 보였다(G1-c). 신조어 노드·술어 유입 0.
2. **단방향 원칙이 코드에서 지켜지는가** — 코드 전수 확인: 그래프→평면 **역방향 인덱스 부재**,
   양방향 동기화 부재, 그래프 쓰기 부재(읽기는 `load_graph`/`instance_nodes`/TBox 조회뿐).
   규칙 `direction-graph-source`가 `from=graph`를 잡고(a16·negative-graph-source), 결정 평면
   내부의 `supersedes` 방향 그래프는 순환까지 검사한다.
3. **설계결정 평면 cap = 도구 값** — 계약 표면이 내보낸 260/chars-div-4가 Python 검사기와 Node
   편집기 **양쪽에서 같은 경계**(1043자 수용 / 1044자 거부)를 만든다. 두 언어의 나눗셈 규칙
   (`chars // 4` vs `Math.floor`)도 경계에서 일치. cap을 40으로 바꾸면 양쪽이 함께 움직인다.
4. **판정 메커니즘의 차이 명문화(§3b)** — `link-store/README.md`와 `src/decision-plane.mjs`
   상단에 "이 평면만 결정론적 판정이 불가능, 커밋 조건은 `decided_by`"가 적혀 있고, 검사기는
   실제로 형식(필수 필드·상태 어휘·cap·순환·status 정합)만 본다. 문서 주장과 코드 동작 일치.
5. **시드 링크의 출처 충실성** — 5개 링크가 겨냥하는 graph IRI 3개는 전부 실재
   (`id:c-traceability`=Concept, `id:c-bounded-context`=Concept,
   `id:pat-knowledge-plane-separation`=DesignPattern). `evidence`가 가리키는 3개 경로 모두 실존,
   인용 문구 "Planes couple ONLY through a link plane of typed edges"는 `patterns.ttl`에 1회
   실재. 결정 레코드의 `decided_by`가 가리키는 승인 문서는 `status: approved`이고 1-(a)·2-(a)의
   내용과 레코드 본문이 일치한다(`dec-plane-parallel-start` 본문의 "stale 93.3%, 오해소 0"은
   내 G4 실측과 같은 값).

---

## 결함·주석 (routing 포함)

### F1 — annotation 스토어 version 충돌로 **annotation 종단점이 실사용 불가** (medium, 다음 wave 착수 전 수정)

`check_links.py`는 자기 상수 `STORE_VERSION = 1`을 **links·decisions·annotations 세 파일 모두**에
적용한다. 그런데 주석 평면의 실사용 스토어는 동시 진행 C1b lane이 **version 2**로 올렸다
(`src/store.mjs: STORE_VERSION = 2, SUPPORTED_STORE_VERSIONS = [1, 2]`). 실측:

```bash
/usr/bin/python3 tools/plane-editor/check_links.py --store <probe> \
  --annotations tools/plane-editor/sample-state/annotations.json
# ✗ unsupported store version in …/sample-state/annotations.json: 2   → exit 2
# 같은 프로브를 fixture(v1) annotations.json에 걸면 → PASS (exit 0)
```

- **귀속**: HEAD(765eb54)에서는 주석 스토어가 v1이었고 v2 승격은 C1b lane의 **uncommitted**
  변경이다. Phase 2 저작 시점 기준으로는 옳았고, 통합된 트리에서 처음 충돌한다 = **lane 간
  충돌**이지 Phase 2의 저작 오류가 아니다.
- **왜 그래도 결함인가**: ① `link-store/README.md`가 안내하는 사용법(`--annotations <외부 standoff
  스토어>`)이 현재 트리에서 **작동하지 않는다**. ② 3개 평면 중 `annotation` 종단점은 결국
  **developer 자신이 만든 v1 fixture로만** 검증된 셈이다. ③ 원리적으로, §5가 cap에 대해 경계한
  **"남의 모듈이 소유한 상수를 복제"** 를 store version에서 그대로 반복한 것이다 — 주석 스토어의
  버전은 주석 평면(`src/store.mjs`)이 소유한다.
- **수정 방향(비구속)**: 남의 스토어에는 자기 버전을 강제하지 말고 주석 평면이 선언한
  supported set을 따르거나(계약 표면 확장), 외부 스토어는 버전 게이트 없이 id만 읽는다.
- 실패 모양은 **fail-closed**(exit 2, 조용한 통과 아님)라 오판을 낳지는 않는다.

### F2 — `rdfs:range` 강제가 graph 종단점에만, 그리고 5종 중 2종에만 걸린다 (low-medium)

- 프로브 a11: `tagged`(range `ho:Concept`)를 **decision 레코드**에 겨냥한 링크가 **PASS**한다.
  range 검사는 `to`가 graph 종단점일 때만 도는 구조(`check_links.py:423`)라, 같은 술어가 평면
  안에서는 아무 데나 향할 수 있다.
- 프로브 a13 + TBox 실측: `derivedFrom`·`alternativeOf`·`overlapsWith`는 TBox에 `rdfs:range`
  자체가 없다(의도된 개방형 정의). 따라서 "재사용이 이름뿐이 아니다"라는 보증은 현재
  **5종 중 2종(tagged·constrainedBy)에, graph 종단점에 한해** 성립한다.
- 실제 시드 5링크는 전부 이 범위 안에서 옳다. 다만 문서(README)의 "술어의 `rdfs:range`도
  적용된다"는 문장은 **범위 한정 없이** 읽혀 실제보다 강한 인상을 준다 → 문구 한정 권고.

### F3 — 재귀 링크·중복 링크에 규칙이 없다 (low)

- a7: `from == to`인 링크(`dec-x overlapsWith dec-x`)가 PASS. `supersedes`만 순환 검사에 걸려
  잡히고, 나머지 5종은 자기 자신을 겨냥해도 무결성 위반이 아니다.
- a10: 같은 `{from,to,type}`을 다른 id로 두 번 실어도 PASS(중복 간선 규칙 없음).
- 어느 쪽도 그래프를 오염시키지는 않지만, 링크 평면이 "typed edge의 유일한 저장소"인 이상
  둘 다 무의미한 간선이 조용히 쌓이는 통로다. 규칙 2줄로 막을 수 있다(권고, 비차단).

### F4 — `decided_by`의 판정 주체 표기 1건이 과대 귀속 (low)

`dec-anchor-recovery-crdt-evidence.decided_by = "vnv dispatch - docs/verify/plane-editor-c1-verify.md
(pass-with-notes, 2026-08-28)"`. 그 리포트는 **판정**이고(verdict: pass-with-notes), 정책 자체를
결정·저작한 것은 C1 developer dispatch다. §3b가 이 평면의 커밋 조건을 **오직 `decided_by`**로
두었으므로, 판정자와 결정자를 뒤섞으면 그 유일한 장치가 약해진다 → "developer dispatch가 결정,
vnv가 검증" 형태로 정정 권고(비차단).

### F5 — §5 계약 표면의 **나머지 절반**은 아직 없다 (info, Phase 4 소관)

브리프 §5는 유일 정의처로 `lint_uniformity.TEXT_CAP_TOKENS`와 `retrieve.py`의
`alternative_clusters`(영역당 1선별) **둘**을 들었다. 이번 wave는 cap만 소비자 1호로 만들면
됐고 실제로 그렇게 했다(요구 충족). 클러스터 쪽은 계약 표면에 **아직 노출되지 않았다** — Phase 4
착수 시 같은 방식으로 열어야 남은 절반이 복제로 흘러들지 않는다.

### F6 — 검사기 JSON에 그래프 개체 수가 실린다 (info)

`counts.graphNodes`가 출력에 포함돼 다른 lane이 온톨로지를 저작하면 값이 바뀐다(내 세션 중
356→364). 결정론 위반은 아니지만(같은 스냅샷에서 3회 byte-identical), 이 JSON을 골든 산출물로
커밋하면 무관한 저작마다 diff가 난다.

### F7 — `id:<domain>/<slug>` 표기는 실사용 사례가 아직 0 (info)

현재 개체 364개가 전부 core 도메인이라 도메인 명시형은 실데이터로 시험할 수 없다. 문법 자체는
내가 `id:core/c-traceability`(a4)로 양성 확인했다 — 같은 노드로 해소되고 PASS.

---

## 판정 근거 요약

| 게이트 | 판정 | 핵심 증거 |
|---|---|---|
| G1 negative control | PASS | 요구 5종 + 추가 3종 전부 exit 1·위반 1건, 대조군 2개 PASS(비-vacuous), vnv 우회 27케이스 |
| G2 cap 계약 표면 | PASS | 도구 층만 갈아끼워 편집기 수용 경계 1043→163→2087자 이동, 계약 파손 시 exit 2 거부 |
| G3 결정론 | PASS | 별 프로세스 3회 md5 동일(4종), 스토어 3세대 재직렬화 byte-identical, 정렬 무관성 |
| G4 앵커 회귀 | PASS | stale 28/30=93.33%, 전 레인 wrong 0/270, 격리 실행이 in-tree 산출물과 sha256 동일 |
| G5 경계 | PASS | 담당 경로 밖 변경 0(메모리 인덱스 1줄 제외), repo 게이트 3종 exit 0, 그래프 재도입 0 |
| G6 언어 | PASS | 신규 35파일 전수 스캔 위반 0, 스토어 데이터 값 전부 영어 |

**pass-with-notes**의 근거: 게이트는 전부 충족했으나, ① 통합된 트리에서 `annotation` 평면
종단점이 실제로는 검증 불가(F1) ② 어휘 재사용 보증의 실제 사정거리가 문서보다 좁음(F2)
③ 재귀·중복 간선 무규칙(F3) — 셋 다 이번 wave의 수용 조건 밖이지만, F1은 다음 wave(앵커를
링크 종단점으로 바인딩)가 바로 그 `annotation` 종단점을 쓰므로 **착수 전 해소 권고**다.
