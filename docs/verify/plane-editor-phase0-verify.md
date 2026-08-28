---
verdict: pass-with-notes
target: docs/plans/plane-editor-phase0.md (Phase 0 형식화 문서)
criteria: docs/feedback/inquiries/tool_suggestion.md v0.2 §2.1·§8 Phase 0·§검토 E · 승인항목 docs/feedback/verified/annotation-backbone-architecture.md
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
gates: validate.py PASS · lint_uniformity.py PASS · check_determinism.py PASS (269 individuals / 7,134 triples)
citations-audited: 136 / 136 resolve (0 날조·0 부재 파일) · 3 precision notes
---
# 판정 — Phase 0 lane 형식화 문서 (plane-editor-phase0.md)

**verdict: pass-with-notes.** 이 문서의 핵심 리스크(날조·추정)는 **없다**. file:line 인용
136건을 전수 재실행 확인한 결과 **존재하지 않는 파일 0건 · 엉뚱한 대상을 가리키는 인용 0건 ·
날조된 함수/게이트 이름 0건**이다. §2.6 계약(C1–C8)은 읽기 대조를 넘어 **샌드박스에서 실제
실행**해 5개 조항을 재현했다. 남은 것은 정밀도 3건 · 이동표적 수치 4건 · 커버리지 note 1건으로
전부 **비차단**이다.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
# 게이트 3종
/usr/bin/python3 tools/validate.py            # -> PASS (6축 ✓, duplicates 경고 0)
/usr/bin/python3 tools/lint_uniformity.py     # -> PASS (6검사 위반 0)
/usr/bin/python3 tools/check_determinism.py   # -> PASS (4요청 × md/json × 4run, 요청당 1 pack)

# 인용 추출(정규식) 후 전건 원문 대조
/usr/bin/python3 -c "…re.finditer(r'(?:([A-Za-z0-9_./@-]+\.(?:py|ttl|md|json|yml|mjs))\s*)?\`?:(\d+)(?:[-–](\d+))?\`?')…"
awk 'NR>=S&&NR<=E{printf "%d| %s\n", NR, $0}' <cited-file>     # 각 범위 원문 출력

# 그래프·파일 개수 실측
/usr/bin/python3 -c "import ontology_lib as lib; g=lib.load_graph(reason=True); print(len(lib.instance_nodes(g)), len(g))"

# §2.6 계약 실행 검증 (샌드박스 — 워킹트리 무변경)
cp -r ontology/abox  $SCRATCH/abox      ; ttl_writer.ABOX_DIR=$SCRATCH/abox  # C1·C2·C3·C7
cp -r ontology $SCRATCH/repo/ontology; cp catalog-v001.xml $SCRATCH/repo/
HARNESS_CATALOG=$SCRATCH/repo/catalog-v001.xml /usr/bin/python3 …            # C5 (게이트 분류)
```

> **주의(로더 함정, 재사용 가치 있음)**: `lib.ONT_DIR`만 바꿔도 그래프 출처는 안 바뀐다 —
> `load_graph`는 `CATALOG`(= `os.environ.get("HARNESS_CATALOG", ROOT/catalog-v001.xml)`,
> `ontology_lib.py:44`)로 owl:imports를 해석한다. 샌드박스 검증은 **`HARNESS_CATALOG` env +
> catalog 사본**으로 해야 한다. 첫 시도에서 이 함정 때문에 "주입했는데 위반 0"이라는 위양성
> 통과가 나왔고, env 경로로 재실행해 뒤집었다.

## 1. 인용 전수 검증 (판정의 본체)

추출된 인용 토큰 137건 중 1건은 오탐(본문 "1:1로 대응")이고, 실제 인용 **136건 / 20개 파일**을
원문 출력으로 대조했다.

| 인용 대상 파일 | 건수 | 결과 |
|---|---|---|
| `tools/validate.py` (39-58, 287-289, 311-315, 311-338, 326-327, 364-371, 372) | 8 | ✓ 전건 일치 — `check_shacl`/`inference="none"`(:48), 하드 6축 AND(:326-327), duplicates advisory(:372), `run_structured` 디스크 재로드(:311-315) |
| `tools/retrieve.py` (43, 145-152, 179-182, 196-232, 250-268, 269-279, 296) | 7 | ✓ 전건 일치 — `DEFAULT_BUDGET=900`, 전순서 키 `(-score, maturity_rank, IRI)`, 무향 연결성분 최소 IRI 키, 영구 탈락 `done.add`+`continue`, 예산초과 `continue`(break 아님), `project(g, request, budget)` |
| `tools/ontology_lib.py` (23, 27, 76-87, 129-131, 177-186) | 6 | ✓ 전건 일치 — `ID_CORE` IRI 패턴, `ONT_DIR`=ontology, `INSTANCE_CLASSES`(Anchor 포함), shapes skip, `instance_nodes` |
| `tools/lint_uniformity.py` (102-118, 123, 146-149, 150-151, 331-338, 331-365, 341-346, 380-387) | 8 | ✓ 전건 일치 — 조건부 tokenEstimate 범위, `HO.Contract:"ct-"`(:123), 하한 비강제(:148-149), `TEXT_CAP_TOKENS=260`, chars//4, "TBox … out of scope", 6검사 dict |
| `tools/verify_contract.py` (2-18, 20-27, 23-27, 29-30) | 4 | ✓ 전건 일치 — ODR VERIFY 축, executable/structural, `file-exists:`·`file-contains:`·`section:`, IRI 정렬 결정론 |
| `tools/check_determinism.py` (40-49, 91-97) | 2 | ✓ 4 요청 + `SEED_PLAN` 4, md/json 루프 |
| `tools/webui/server.py` (38-42, 111-118, 112-116, 122-147, 192-215, 199-201, 199-215, 205, 206, 207-213) | 10 | ✓ 내용 일치 (단 note N1 — ":38-42가 import 전부"의 문자적 부정확) |
| `tools/webui/ttl_writer.py` (11-19, 20-21, 33-34, 59, 91-102, 105-106, 177-206, 177-218, 193-195, 221-230, 238-254, 256-261, 287-293, 296, 296-303, 296-323, 315-323, 316, 326-336, 339-345) | 20 | ✓ 전건 일치 — 시그니처 3개(`plan_upsert`/`render_block`/`atomic_write`/`restore`/`abox_files`)가 **문자 그대로** 소스와 동일 |
| `ontology/tbox/harness.ttl` (205, 205-208, 289, 635-637, 639-641, 650-653, 655-659, 657, 930-934) | 9 | ✓ 내용 일치 (단 note N2 — 인용문 소재 줄이 :208) |
| `ontology/shapes/harness-shapes.ttl` (21-23, 23-25, 26-29, 455-474, 486-501, 488-491) | 6 | ✓ 전건 일치 — sh:prefixes 선언노드, `AnchorShape`(prefLabel/anchorTarget 1/confidence 0..1), `AlternativeOfSharedAnchorShape` SPARQL |
| `ONTOLOGYSTYLE.md` (75-79, 83-94, 89-90, 93-94, 150 ×2) | 6 | ✓ 내용 일치 (단 note N3 — :150은 표 내부 Anchor 행) |
| `docs/DESIGN.md` (8-9, 12-13, 14-20) | 3 | ✓ schema IRI · id IRI · rename 기각 근거 |
| `.github/workflows/validate.yml` (14-29, 21-29) | 2 | ✓ 파일 전체가 29줄, 스텝은 14-29가 전부(타입체크 스텝 부재 확인) |
| `docs/feedback/README.md` (4-5, 10-11, 13-30, 17-19, 22-23, 27-28, 37-39, 48-55) | 9 | ✓ 전건 일치 — "온톨로지 그래프 밖", 승인 태깅은 사용자만, .wip→rename, 항목 형식 |
| `docs/feedback/verified/README.md` (8-15, 10 ×2, 11-13 ×2) | 6 | ✓ verdict 3값 · 3조건 게이트 · **status 키 미정의**(:8-15에 정의 없음 확인) |
| `docs/feedback/inquiries/README.md` (7 ×3) | 3 | ✓ `open`→`answered`→`closed` |
| `docs/feedback/verified/annotation-backbone-architecture.md` (4, 62, 66-67, 105-136, 134, 134-135) | 6 | ✓ targets 혼합어휘(`id:scheme`·`tbox:ho:`·`tools/retrieve.py`), 거부 3종 원문, 적용결과 기록란, 후속메모 (b)(c) |
| `docs/feedback/sim-hil-coding-harvest.md` (3) | 1 | ✓ `targets: [tbox:ho:, ontology/abox/core, recipes]` |
| `docs/feedback/inquiries/tool_suggestion.md` (139, 140, 154, 301-304, 374-377) | 5 | ✓ I3 표 3행 · supersedes 평면한정(B9) · Phase 4 "이중 구현 금지" · 검토 C |
| `tool_suggestion-phase1-brief.md` (19-20, 26, 31, 32-35, 36, 37-39, 59, 62-63, 66-68) | 11 | ✓ 파일경계 · 스택 · status 필수 · Selector 다중화/orphaned · standoff · headless · G1 · G4 · §6 비범위 |
| **합계** | **136** | **CONFIRMED 결함(틀린/부재 인용) 0건** |

문서가 인용 없이 편 주장도 도구로 확인했다:
- "`tools/*.py` 전체에 `docs/feedback`을 읽는 코드가 한 줄도 없다(grep 0건)" →
  `grep -rn feedback tools/*.py tools/webui/*.py` = **0** ✓ (GAP A1 성립)
- "프론트엔드도 순수 JS(devDependencies = svelte/vite만)" → `tools/webui/frontend/package.json`
  devDeps = `@sveltejs/vite-plugin-svelte`·`svelte`·`vite` ✓ (TypeScript 없음, GAP D1 성립)
- "`validate.py`도 같은 사실을 독립 보고한다" → 실행 출력에 `⚠ 4 registered but not
  instantiated (harmless): Anchor, Candidate, Example, HarnessComponent` ✓
- §4.1 관측박스(병행 세션 Phase 1 트리) → `tools/plane-editor/`에 `run-suite.mjs`·
  `suite-result.json`·`schema-dump.json`·`REPORT.md`·`src/{scenarios,schema,session,report,
  reload-child}.mjs`·`sample-state/` 존재 ✓, deps `@tiptap/* 3.30.5`·`yjs 13.6.32`·
  `y-prosemirror 1.3.7`·`jsdom 30.0.1` ✓ (note N5)

## 2. 커버리지 — 5평면 × (a)(b)(c)

| 소스 구조 요소 (v0.2 §2.1 / §8 Phase 0) | 문서 내 표현 | 판정 |
|---|---|---|
| 주석 평면 | §1.1 1행 · §1.2 1문단 · §2.1 (a)(b)(c) | ✓ |
| 설계 결정 평면 | §1.1 2행 · §1.2 · §2.2 (a)(b)(c) | ✓ |
| 데이터 프로토콜 평면 | §1.1 3행 · §1.2 · §2.3 (a)(b)="없음"+사유(§5.3 적용범위 밖)(c) | ✓ |
| 인터페이스 평면 | §1.1 4행 · §1.2 · §2.4 (a)(b)="없음(현 단계)"+사유(링크대상 전용)(c) | ✓ |
| 지식 그래프 평면 `[v0.2 A]` | §1.1 5행 · §1.2 · §2.5 (a)(b)(c) + §2.6 | ✓ |
| §8이 함께 지목한 뷰 lane(`retrieve.py`) | §1.3 표 1행 + §2.5(a) | ✓ |
| §8이 함께 지목한 쓰기 게이트(`plan_upsert`) | §1.3 표 2행 + §2.6 C1–C8 | ✓ |
| §2.1 열 "진리 판정 방식 / 원자 단위 / 안정적 식별자" | §1.1 표의 3개 열로 각각 사상 | ✓ |
| §2.1 열 "**변경률**" | 사상 없음, 제외 사유 진술도 없음 | **note N4 (coverage)** |

빈 항목 없음 — (b) "없음" 2건은 모두 **사유가 붙은 명시적 제외**라 GAP이 아니다.
GAP 목록(A1·A2·A3·B1·B2·B3·C1·D1·D2·E1·E2·E3·F1·F2·G1) 15건은 전부 담당 층(도구/그래프/문서)과
후속 Phase가 지정돼 있고, 근거 인용이 실재한다(§1 표). 승인 항목의 거부 3종은 E1에 (i)(ii)(iii)로
모두 회수됐다(`annotation-backbone-architecture.md:66-67` 대조 일치).

## 3. 재사용 경계의 실행 가능성 — §2.6 계약을 실제로 돌렸다

읽기 대조만으로 통과시키지 않고, **워킹트리를 건드리지 않는 샌드박스**(abox 사본 +
`ttl_writer.ABOX_DIR` 치환 / ontology 사본 + `HARNESS_CATALOG`)에서 재현했다.

| 계약 | 실행 결과 | 판정 |
|---|---|---|
| **C1** 계획/수행 분리 | `plan_upsert` 호출 전후 전 abox 파일 sha256 **동일**, 반환 키 `{created,file,new,old}` | ✓ 재현 |
| **C2** MERGE(비관리 술어 보존) | 대상 `id:as-overview`의 on-disk 술어 6개 중 payload 밖 5개 **전부 `new`에 잔존**(dropped=[]), payload 값은 반영 | ✓ 재현 |
| **C3** 낙관적 잠금 키 = ABox 루트 상대경로 | relpath 키 + stale mtime → `Conflict("core/assembly/assembly-sections.ttl changed on disk since read")`; **basename 키(stale)는 Conflict 없음**(= 보호 실패, 문서의 경고 그대로); 1e-7 편차 → 통과(허용오차 1e-6 확인) | ✓ 재현 |
| **C4** 검증은 호출자 책임 | `plan_upsert`는 의미검사 없음(위 C1·C2 실행에서 SHACL/validate 미호출로 성립), 게이트는 `server.py:207-213` | ✓ (코드 대조) |
| **C5-거부** 하드 6축 | `validate.run_structured()`의 `hard_ok`에 6축만 AND(:326-327) | ✓ (코드 대조) |
| **C5-조용히 통과 ①** cap 초과 | 샌드박스에 **367 token** 노드 주입 → `validate.run_structured()["pass"] = True` (6축 전부 ✓) / `lint_uniformity.check_text_cap` → **위반 1건** 검출. 즉 **webui는 저장하고 CI가 잡는다** | ✓ **실증** (GAP E1(i) 성립) |
| **C5-조용히 통과 ②** duplicates | 같은 클래스 두 `AssemblySection`의 prefLabel을 동일화 → `pass=True` + `duplicates` 1건(advisory) | ✓ **실증** |
| **C6** HTTP 표면 | `PUT /api/node`의 400/409/500 분기·`{"saved": false, …}`+diff 모두 `server.py:192-215`와 일치 | ✓ (코드 대조) |
| **C7** 신규 노드 착지 | 미존재 subject → `plan["file"] = authored.ttl`, `created=True` | ✓ 재현 |
| **C8** 캐시 무효화 | `_invalidate()`가 write 직후(:206)·롤백 직후(:211), `run_structured`는 디스크 재로드(:311-315) | ✓ (코드 대조) |

시그니처 서술도 소스와 **문자 단위로 일치**한다(`plan_upsert(node, target_basename="authored.ttl",
expected_mtimes: dict | None = None) -> dict`, `raises Conflict`). §2.6의 "경계 한 줄 요약"
(문서 평면 annotation은 `plan_upsert`를 탈 수 없음 — `id:` subject 전제, `ttl_writer.py:59`)도
정규식과 `find_subject_file`의 None 반환 경로로 확인했다.

## 4. 경계 준수 · 게이트

- **이 dispatch가 만진 파일**: `git diff HEAD -- docs/plans/plane-editor-phase0.md` =
  **1 file, +72/−25**. 그 밖에는 자기 역할 폴더(`.claude/agent-memory/developer/**`)뿐.
  `ontology/`·`tools/**` 수정 **0**. → 경계 준수 ✓
- **전제 정정(비결함)**: 브리프는 "새 파일 저작"을 전제했으나 이 파일은 **이미 HEAD에 있었다**
  (`1406d87 Land annotation stages 1-3 + Phase 0 map`). developer는 재작성 대신 정정·갱신을
  했고 자기보고에 명시했다 — git 이력과 일치한다. 재작성하지 않은 판단은 **옳다**(이미 검증된
  인용을 폐기하지 않음).
- **타 세션 소유(HEAD-absent, 이 판정 범위 밖 — 고치지 않음)**: `tools/plane-editor/**`,
  `docs/feedback/av-odd-scenario-transfer.md`(+`inquiries/`,`verified/` 사본),
  `docs/verify/lesson-axis-verify.md`, `docs/feedback/verified/sim-hil-coding-harvest.md`(M),
  `.claude/agent-memory/developer/{design-principle-as-designpattern-node,lesson-learning-axis-no-tbox}.md`,
  `.claude/agent-memory/vnv/lesson-axis-verify.md`.
- **게이트 3종 (판정 시점 재실행, 269 individuals)**: `validate.py` **PASS**(SHACL·reachability·
  capabilities·assemblyOrder·capacityFit·registryDrift 6축 ✓, duplicate 경고 0) ·
  `lint_uniformity.py` **PASS**(6검사 위반 0) · `check_determinism.py` **PASS**(4요청 ×
  {md,json} × 4run, 요청당 1 distinct pack). 문서 변경이라 무영향은 구조적으로 자명하고,
  위 실행은 회귀 확인이다.
- **N/A 축**: 이 산출물은 그래프 노드를 만들지 않으므로 `retrieve.py` 재검색·`HarnessShape`
  최소구성·tokenEstimate 판정은 적용 대상이 아니다(문서는 `ontology/` 밖).

## 5. Note (비차단 — 전부 정밀도/이동표적)

- **N1 (정밀도, §2.6 C5)**: "`server.py:38-42`가 import 전부"는 문자적으로 부정확하다 —
  `server.py`에는 `:23-25`(stdlib), `:32-36`(fastapi/rdflib), `:234`(`import difflib`,
  함수 내부)도 있다. **실질 주장(= `lint_uniformity` 미import)은 참**이다(`grep -n lint
  tools/webui/server.py` = 0건). 권고 문구: "ho-도구 import는 `:38-42`가 전부".
- **N2 (정밀도, §3 E2)**: `"DECLARED BUT DORMANT BY DESIGN"` 인용을 `harness.ttl:205`로
  달았으나 그 문자열은 **:208**(`skos:definition` 줄)에 있다. :205는 블록 첫 줄이라
  블록-시작 관례로는 방어되지만, **인용문**은 소재 줄을 가리키는 편이 옳다.
- **N3 (정밀도, §1.1·§4.2 P2)**: "§2 접두사표(`ONTOLOGYSTYLE.md:150`)" — :150은 표 **내부**의
  `Anchor | anchor-` 행이다(§2는 :120, 표 머리는 :143~). 표 자체를 가리키려면 :143 계열.
- **N4 (커버리지)**: v0.2 §2.1의 5열 중 **"변경률"** 만 §1.1 표에 사상되지 않았고 제외 사유도
  없다. 자산 매핑이라는 Phase 0 성격상 타당한 생략이지만, repo의 coverage-audit 규약
  (모든 소스 요소는 사상되거나 **명시적 제외 사유**를 가진다)에 맞추려면 한 줄 사유가 필요하다.
- **N5 (이동표적 — 판정 시점 재실측)**: 문서 스스로 "이동 표적" 박스로 예고한 대로 개수가 또
  움직였다. **구조·GAP 주장은 하나도 뒤집히지 않았다.**
  | 문서 수치 | 판정 시점 실측 | 원인 |
  |---|---|---|
  | `docs/verify/`(42) | **43** | 병행 세션이 `docs/verify/lesson-axis-verify.md` 추가 |
  | inbox `status:` 전부 `approved` | `approved` 2 / **`open` 1** | 병행 세션이 `av-odd-scenario-transfer.md` 추가 |
  | verified 22건 (status 키없음 5 / verdict `apply-plan-ready` 1) | **23건** (키없음 6 / `apply-plan-ready` **2**) | 동상 |
  | GAP A3 "22건 중 14건 미정의" | **23건 중 15건 미정의** (`done` 13 최빈 유지) | 비율·성질 불변 |
  변하지 않은 실측: 269 individuals / 7,134 triples / Harness 7 / `ho:tagged` 140 /
  Anchor·alternativeOf·overlapsWith·hasAnchor 전부 **0** / TBox 46-62-44 / shapes 20 NodeShape /
  abox 18 TTL / `docs/plans` 22(=21+이 문서) — **전건 일치**.
- **N6 (정밀도, §4.1 관측박스)**: "그 트리는 … `.mjs`/JSON뿐"은 `REPORT.md`(markdown)·
  `package-lock.json`·`node_modules/`를 포함하면 부정확하다. 결정적 주장(= `ontology/`·기존
  `tools/*.py` 무접촉)은 참이다.
- **N7 (역할 경계, 프로세스 관찰)**: 이 문서의 `author: developer (dispatch, opus)`는
  CLAUDE.md 역할표가 developer에 부여한 파일 경계(`ontology/abox/` 담당 노드) **밖**의
  산출물이다. orchestrator가 브리프로 지시한 예외로 보이며 내용 결함은 아니지만,
  역할표/브리프 중 하나에 근거를 남겨두는 편이 낫다.

## 6. 결론

- **verification(규격대로)**: ✓ — 게이트 3종 PASS, 담당 경로 1파일, 인용 규약(모든 주장에
  file:line) 자체를 문서가 지켰고 그 인용이 **전건 실재**한다.
- **validation(올바른 것)**: ✓ — v0.2 §8 Phase 0이 요구한 5평면 + 뷰 lane + 쓰기 게이트가
  빠짐없이 사상됐고, 재사용 경계 (a)(b)(c)가 평면마다 채워졌으며, 가장 중요한 재사용 표면
  (§2.6 write path)은 **서명·동작 수준에서 실행 재현**된다. 승인 항목의 거부 3종도 GAP E1로
  회수됐다.
- **후속 권고(orchestrator)**: N1·N2·N3·N4·N6은 한 줄씩 고치는 micro dispatch 한 번이면
  된다(문서 층). N5는 문서가 이미 caveat을 달았으므로 **수치를 다시 좇지 말 것** — 개수 추적은
  이 문서의 목적이 아니다. GAP A3의 문서 정정(`docs/feedback/verified/README.md`)은 문서가
  §6에서 스스로 넘긴 대로 별도 dispatch 사안이다.
