---
verdict: pass-with-notes (실사용 **유지** — (a); 차단 조건 0개, 새 발견 3건 · 문서 정정 2건은 개선)
scope: tools/plane-editor — 바인더 후속 3건 ((1) falsy 앵커 종단점 계수 · (2) 발견의 심링크 축 · (3) 전역 거절 시 종단점별 사유 보존)
criteria: 직전 판정 `docs/verify/plane-editor-binder-failclosed-verify.md` §7 **비차단 관측 1·2·4 와 §8 다음 작업 1·2·3 의 문언 그대로** + 브리프 §1-§6
baseline: 현재 워킹트리. HEAD `8fed32f` 는 19x3 셀·필드 1:1 대조와 **인과 귀속**(HEAD tools 로 같은 프로브 재기)에 사용
re-measured: 8차 프로브 W1-W4·P0-P5·V1-V7 · 9차 프로브 X1-X5·Y1-Y7 **무수정 재실행** · 적대 B 계열 9행 · 신규 프로브 Z1a·Z1b·Z2a-Z2g·Z3a-Z3d · 반사실 6종(게이트 퇴화 1 + 역패치 4 + 코퍼스 1) · HEAD tools 반사실 1종 · 19x3 셀 1:1 · 342 레인 재집계 · 3회 byte-identical · repo 게이트 3종
new-confirmed: **(가) 2건** — `SCAN_SKIP_DIRS`(`node_modules`·`.git`) 이름으로 스토어를 **조용히** 가리면 사본의 답이 초록으로 나간다(Z2e·Z2e'). **무회귀**(HEAD 에서도 같은 답) · **선언되지 않은 전제**
observed: 세 항목 전부 닫혔고 넷 다 **반사실로 비공허성 확인** · 심링크 축은 Y6 한 모양이 아니라 **사슬·상대경로·사이클·세 이름**까지 닫혔다(HEAD 에서는 사슬·상대경로도 조용한 초록이었다) · 사유 우선순위(좁은 것 먼저)는 살아 있다(V7·Z3b) · 새 진단층이 **과잉 안심**하는 자리 1개(Z3d, 판정은 그대로 fail-closed)
declared-outside: HO_PYTHON 위조 게이트(Y7) · 작업공간 루트 부재(C10 (3) 이 선언·실측) · sniff 4KB 예산 · B1·B1b·B5(손 기입 정체성·이식) — **차단 사유로 쓰지 않음**
---

# plane-editor 바인더 후속 3건 판정 (vnv, 10차)

## 0. 무엇을 기준으로 쟀는가

- **기준은 내가 직전(9차)에 스스로 적은 관측 1·2·3 이다.** `plane-editor-binder-failclosed-verify.md`
  §7 비차단 관측(1 falsy 앵커 · 2 전역 거절의 진단력 비용 · 4 심링크 은닉)과 §8 다음 작업
  1·2·3 의 **문언·수치를 그대로** 적용했다(완화 없음). 9차·8차 프로브는 **무수정 재실행**했다
  (파일 해시 불변: `c928f8d5…` · `b70184be…` · `6900226…`).
- developer 자기보고는 **판정 대상**이다. 아래 수치는 전부 내가 다시 잰 값이며, 자기보고와
  어긋난 자리는 §7-2 에 따로 적었다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`. 실험은 전부 scratch 사본이고 트리에 더한 것은
  `docs/verify/` 2개(이 리포트 + 프로브 1개)뿐이다.

## 1. 실행한 명령 (재현 절차)

```
# 재실행 **전** 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,\
README.md,run-link-checks.mjs,run-suite.mjs,bind-links.mjs,make-fixture-documents.mjs} \
tools/plane-editor/src/*.mjs tools/plane-editor/link-store/*.json

# 게이트 / 바인더 / 스위트 (각 3회, 별 프로세스, **순차**)
node tools/plane-editor/run-link-checks.mjs
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json
node tools/plane-editor/bind-links.mjs [--format json]
node tools/plane-editor/run-suite.mjs
node tools/plane-editor/make-fixture-documents.mjs --check
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py

# 앞 판정 프로브 — **무수정** 재실행
VNV_SCRATCH=<s>/ebr  node docs/verify/plane-editor-endpoint-binding-residual-probe.mjs  # W1-W4
VNV_SCRATCH=<s>/eb   node docs/verify/plane-editor-endpoint-binding-probe.mjs           # P0-P5·V1-V7
VNV_SCRATCH=<s>/fc   node docs/verify/plane-editor-binder-failclosed-probe.mjs          # X·Y 계열
VNV_SCRATCH=<s>/badv node docs/verify/plane-editor-binding-adversarial.mjs              # B 계열

# 10차 신규 프로브 (이번 판정)
VNV_SCRATCH=<s>/fu node docs/verify/plane-editor-binder-followups-probe.mjs   # Z1·Z2·Z3

# 반사실 — 트리 사본에 역패치 (원본 무수정)
rsync -a --exclude node_modules tools/ <s>/cf-*/tools/ ; ln -s <repo>/…/node_modules … ;
mkdir <s>/cf-*/.git ; cp -r ontology catalog-v001.xml <s>/cf-*/ ;
cd <s>/cf-* && node tools/plane-editor/run-link-checks.mjs
# 게이트 규칙 퇴화 + 프로브 재실행
VNV_PE_ROOT=<s>/gd-anchor/tools/plane-editor/ HO_TOOLS_DIR=<s>/gd-anchor/tools \
  HARNESS_CATALOG=<s>/gd-anchor/catalog-v001.xml VNV_ONLY=Z1 node docs/verify/…-followups-probe.mjs
# HEAD 인과 귀속 (git archive 로 HEAD tools 트리를 세워 같은 프로브를 먹인다)
git archive HEAD tools ontology catalog-v001.xml | tar -x -C <s>/head-tree
VNV_PE_ROOT=<s>/head-tree/tools/plane-editor/ … VNV_ONLY=Z2 node docs/verify/…-followups-probe.mjs
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 실험 **후** |
|---|---|---|---|
| `suite-result.json` | `6e52ab64…` | 동일(3회) | 동일 |
| `REPORT.md` | `951404ad…` | 동일(3회) | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일(3회) | 동일 |
| `run-link-checks.mjs` 출력 | — | 3회 **`d1510c7e…`** | 동일 |
| `check_links.py --format json` | — | 3회 **`ae8adb8c…`** (8차·9차와 **같은 값**) | 동일 |
| `bind-links.mjs --format json` | — | 3회 **`1b6e91ca…`** (9차와 **같은 값**) | 동일 |

**트리에 실린 표 = 내가 재생산한 표.** 실사용 산출 두 개(`check_links`·`bind-links` JSON)가
9차와 **byte-identical** 이라는 것은 이번 수정이 실사용 경로의 답을 바꾸지 않았다는 뜻이다.

## 2. (1) 재측정 — falsy 앵커가 종단점으로 세어지는가

기준: *"`anchor: ""`·`0`·`false`·`null` 이 앵커 종단점으로 **세어지고** unbound 사유를 받는다.
그리고 **게이트 앵커 규칙을 무르게 한 반사실**에서도 바인더가 단독으로 exit≠0."*

### 2-1. 무수정 재실행 (9차 프로브)

| 시험 | 9차 값 | 지금 값 |
|---|---|---|
| X2 (8모양 한 스토어) | `""`·`0` 은 **종단점에서 사라짐**(`anchorEndpoints 0 · recordEndpoints 1 · unbound 0`) | `anchorEndpoints 8 · recordEndpoints 0 · unbound 8` — 여덟 모양 **전부** 사유 있는 unbound |
| X3 (falsy 앵커가 **유일한** 종단점) | 게이트 덕에 exit 1, 바인더 단독은 `pass true` | `anchorEndpoints 1 · recordEndpoints 0 · unbound 1 · exit 1` (빈 문자열·숫자 0 각각) |

사유 문자열: `anchor-part-has-no-resolver:`(빈 문자열은 접미사도 빈다) · `…:0` · `…:false` ·
`…:null`. 크래시 0, `bound` 0.

### 2-2. 내가 창안한 새 모양 (Z1, 신규)

브리프가 요구한 네 값 중 `false`·`null` 은 9차 프로브에 없던 모양이라 새로 만들었다.

| 신규 시험 | 결과 |
|---|---|
| **Z1a** `false` · `null` · `""` · `0` 을 한 스토어에 | 게이트 exit 1 `link-endpoint-plane`; 바인더 exit 1 · `anchorEndpoints 4 · recordEndpoints 0 · unbound 4`, 네 사유 전부 `anchor-part-has-no-resolver:<파일에 적힌 값>` |
| **Z1b** `anchor` **키가 없는** 종단점 1개 + falsy 앵커 2개 | `anchorEndpoints 2 · recordEndpoints 1` — 분할이 **정확히 키의 존재**에서 갈린다(값의 truthiness 가 아니다) |

### 2-3. ★ 게이트를 무르게 한 반사실 (이 수정의 목적)

게이트 사본(`gd-anchor`)에서 앵커 규칙 **둘**을 죽였다 — 닫힌 집합 검사
(`"anchor" in ep and ep["anchor"] not in ENDPOINT_ANCHORS`)와 `annotation-anchor-missing`.

| 시험 | 퇴화 게이트 | 바인더 **단독** |
|---|---|---|
| Z1a (4 falsy 값) | **exit 0 · pass true · violations []** | **exit 1 · pass false** · `anchorEndpoints 4 · recordEndpoints 0`, 네 사유 그대로 |
| Z1b (record 1 + falsy 2) | **exit 0 · pass true** | **exit 1** · `anchorEndpoints 2 · recordEndpoints 1` |
| X2 / X3 (9차 프로브 무수정) | **exit 0 · pass true** | **exit 1** · 모든 모양이 사유 있는 unbound |

**9차에는 바로 이 자리가 `pass: true · exit 0` 이었다.** 그것이 "이 명령 단독으로도
fail-closed" 의 유일한 예외였고, 지금은 게이트가 거짓 초록을 줘도 바인더가 혼자 빨강이다.
**(1) 충족.**

### 2-4. 비공허성 — 대조군에 이빨이 있는가

트리 사본에서 `Object.hasOwn(ep, 'anchor')` 를 `!ep.anchor` 로 되돌리고 스위트를 돌렸다.

```
cf-truthy: FAIL  an endpoint whose anchor key carries a falsy value (the empty string)
                 … binder 0 binding(s), 0 anchor / 1 record, reasons [none]
```

**정확히 그 대조군 하나만 FAIL** 하고, 실패 문구가 결함의 모양(`0 anchor / 1 record`)을 그대로
보여 준다. C4b 의 넷째 대조군은 항진명제가 아니다.

## 3. (2) 재측정 — 발견의 심링크 축

기준: *"심링크로 들여온 스토어가 숨겨지지 않는다 · 같은 실체를 두 경로로 넘겼을 때 **위양성이
없다**(이전 정규화와 충돌하지 않는다) · 닫히지 않고 전제로 선언됐다면 그 전제가 매 실행 측정된다."*

이 축은 **선언이 아니라 닫힘**으로 처리됐으므로 두 방향을 다 쟀다.

### 3-1. 숨을 수 있는가 (무수정 재실행 + 내가 넓힌 모양)

| 시험 | 현재 트리 | **HEAD tools 로 같은 프로브** (인과 귀속) |
|---|---|---|
| Y6 (9차, 무수정) 정직한 스토어를 밖에 두고 심링크로만 | 스토어 **2개** 판정 · `annotation-store-duplicate-document` · 바인더 exit 1 `document-declared-by-2-annotation-stores` | (9차 실측: 사본 하나만 범위 · 초록) |
| **Z2a** 심링크 **사슬**(링크 -> 링크 -> 밖의 진짜 디렉토리) | 2개 판정 · exit 1 양층 | **exit 0 · pass true · 사본의 답** `"Closing block"` |
| **Z2b** **상대경로** 심링크 | 2개 판정 · exit 1 양층 | **exit 0 · pass true · 사본의 답** `"Closing block"` |
| **Z2g** 심링크 뒤에 **격리 표식**을 두어 다시 가리기 | 2개 판정 · exit 1 (닫힘이 표식을 무른다) | 게이트는 exit 1 이나 HEAD 바인더는 exit 0 (전역 판정 미확인 — 9차에 닫힌 자리) |
| **Z2f** **깨진** 심링크가 `annotations.json` 이라는 이름을 씀 | **exit 2 + `missing store file`** (양층) — `_walk` 머리말의 fail-closed 주장이 참 | HEAD 도 exit 2 |

Z2a·Z2b 는 9차 Y6 과 **모양이 다른** 새 경로다. HEAD 에서 둘 다 조용한 초록이었고 지금은
둘 다 거절이라는 것이 **이 수정이 원인**이라는 인과다(Y6 한 사례가 아니라 축이 닫혔다).

### 3-2. 위양성이 생기지 않는가 (이전 정규화와의 충돌)

| 시험 | 결과 |
|---|---|
| Y4 (9차, 무수정) 같은 스토어 디렉토리의 심링크 쌍둥이 | 스토어 **1개** · `bound 1` · 정답 `[303,316) "honest orphan"` — 9차와 같은 값 |
| **Z2d** 같은 실체의 **세 이름**(진짜 + 심링크 + 심링크의 심링크) **+ `--annotations` 로 두 경로를 명시 지목** | 스토어 **1개** · `ambiguousDocuments 0` · `bound 1` — 가짜 중복 0 |
| **Z2c** 심링크 **사이클**(자기 자신 + 두 디렉토리 고리) | 훑기가 **끝난다**(게이트 왕복 339ms) · exit 0 · 정답 `[17,29) "The disputed"` |

발견 경로는 realpath 로 정규화되므로 P1b(인자 중복 위양성)에서 세운 지점이 그대로 유지된다.

### 3-3. 비공허성 — 두 방향 각각 반사실

| 반사실 | 스위트 | 무엇이 FAIL 했나 |
|---|---|---|
| `_walk` -> `os.walk` 로 되돌림 | exit 1 | **C10 (8) 1건만** — `1 store(s) judged, [none] (exit 0); binder 1 binding(s)` (= Y6 조용한 초록의 부활) |
| `take()`·`explicit` 의 realpath 정규화를 `abspath` 로 되돌림 | exit 1 | **C10 (9) 1건만** — `2 store(s) judged, [annotation-store-duplicate-document]` (= 가짜 중복의 부활) |

두 검사가 서로 다른 반사실에서 **각각 하나씩** 발화한다 — 서로 덮지 않는다.

### 3-4. 대가는 실측했는가

README 가 선언한 대가("작업공간 밖을 가리키는 심링크가 있으면 그쪽 트리도 훑는다")를 값으로 쟀다.

| 측정 | 값 |
|---|---|
| 실사용(repo) 게이트 왕복 — 현재 | 0.35 / 0.35 / 0.35 s |
| 같은 입력, **HEAD** `check_links.py` | 0.34 / 0.34 / 0.35 s |
| `annotationScope` (현재 vs HEAD) | `discovered` 1개 · `quarantined excluded 41` · `workspaceRoot` — **동일** |
| 작업공간에 **무관한 json 8000개** 트리를 심링크로 물린 경우 | 0.43 / 0.42 s · 판정 스토어 1개 · exit 0 |

이 저장소의 심링크는 하나(`staging/harness-recipes/central` -> repo 루트)이고 자기 고리라
`visited` 가 곧바로 끊는다. **(2) 충족** — 선언이 아니라 닫힘이며, 두 방향 다 매 실행 측정된다.

## 4. (3) 재측정 — 전역 거절에서의 종단점별 사유

기준: *"전역 거절에서도 종단점별 사유가 남고 exit 1 이 유지된다. **좁은 가드가 다시 가려지지
않았는지** 반사실로 확인 — 직전 wave 가 세운 사유 우선순위가 살아 있는가."*

### 4-1. 사유가 남는가 (판정은 그대로 빨강인가)

| 시험 | 게이트 | 바인더 | 종단점별 답 |
|---|---|---|---|
| Y2 dirty (9차, 무수정) | exit 1 `link-type-unknown,record-endpoint-missing` | exit 1 · `storesOpened 0` | 좋은 종단점 2개가 `reasons.endpoint: null`(= 자기 잘못 없음)로 구분된다 |
| **Z3a** 종단점 **넷**(clean / 상속 이름 / 나쁜 타입 / 레코드 부재) | exit 1 (3규칙) | exit 1 · `bound 0 · unbound 4 · storesOpened 0` | **네 답**: `null` · `anchor-part-has-no-resolver:constructor` · `endpoint-refused-by-the-gate:link-type-unknown` · `endpoint-refused-by-the-gate:record-endpoint-missing` |
| **Z3c** 사람이 읽는 채널 | — | exit 1 | 텍스트 출력도 `this endpoint itself: …` 두 번째 줄을 찍는다(JSON 만 고치고 text 를 빠뜨린 자리가 없다) |
| 스위트 C12 (8) | — | — | `세 종단점 -> 세 답` 을 **매 실행** 잰다 |

모든 거절 행이 `reasons.{endpoint,plane}` 과 `gateViolations` 를 싣는다 — 내 프로브가 필드
부재를 `<field absent>` 로 찍게 해 두었고 **0건**이었다.

### 4-2. ★ 좁은 가드가 다시 가려졌는가 (우선순위 생존)

| 시험 | 결과 |
|---|---|
| V7 (8차, 무수정) 레코드가 남의 문서를 주장 | `store-refused:gate:annotation-record-document-mismatch` — 전역 사유에 **가려지지 않는다**(9차와 같은 값) |
| **Z3b** 같은 스토어 위에 **나쁜 링크 타입까지** 얹어 평면을 통째로 빨갛게 | 게이트 `[annotation-record-document-mismatch, link-type-unknown]`; 바인더의 판정 사유는 **여전히** `store-refused:gate:annotation-record-document-mismatch` — 좁은 것이 이긴다 |
| Z3a `ln-b-inherited` | 전역이 빨간 와중에도 `anchor-part-has-no-resolver:constructor`(가장 좁은 가드) |

### 4-3. 비공허성 — 층을 평평하게 만든 반사실

`link-binding.mjs` 사본에서 전역 거절을 **맨 앞**으로 옮겼다(좁은 가드가 전부 그 뒤로 밀린다).

```
cf-flat: FAIL C4b(1) constructor        — reasons [link-plane-refused-by-the-gate:link-endpoint-plane]
         FAIL C4b(2) duplicate document — 두 이름 순서 둘 다
         FAIL C4b(4) falsy anchor       — reasons [link-plane-refused-by-the-gate:link-endpoint-plane]
         FAIL C10 (8) symlink discovery
         FAIL C12 (6) Object.prototype 전수
         FAIL C12 (8) three endpoints, three answers
```

**6건이 동시에 스토어·사유 이름을 대며 FAIL** 한다 — 사유 배치는 장식이 아니라 각 가드의
생사다. **(3) 충족.**

## 5. 새 우회 창안 — 4모양, (가)/(나) 분류

증거: `docs/verify/plane-editor-binder-followups-probe.mjs`(Z1a·Z1b·Z2a-Z2g·Z3a-Z3d) + HEAD
tools 반사실. 전부 실제 게이트 프로세스·실제 `bind-links` 프로세스다.

| # | 우회 | 게이트 | 바인더 단독 | 분류 | 판정 |
|---|---|---|---|---|---|
| **1** | 정직한 스토어를 `<ws>/node_modules/honest/` 에 두고 **사본을 옆에** (`SCAN_SKIP_DIRS` = `{.git, node_modules}`) | **exit 0** | **exit 0 · pass true** · **사본의 답** `[53,66) "Closing block"` (정직한 답은 `[17,29) "The disputed"`) | **(가) 일상 경로** | **CONFIRMED** — 조용한 초록. HEAD 도 같은 답이라 **무회귀**이지만, 발견 전제 표(4행)에 이 축이 **없고** 판정 JSON 에 제외 사실이 **남지도 않는다**(격리는 `quarantined[].excluded` 로 남기는데) |
| **2** | 같은 배치를 **심링크로**: `<ws>/node_modules` -> 작업공간 밖의 정직한 트리 | **exit 0** | **exit 0 · pass true** · 사본의 답 | **(가) 일상 경로** | **CONFIRMED** — 이번 wave 가 연 `_walk` 는 심링크를 따라가지만 **이름으로 먼저 가지치기**되므로, 닫은 축이 이름 한 줄로 다시 열린다 |
| **3** | 게이트가 초록으로 서명했지만 편집기 `loadStore` 가 거절하는 스토어(8차 P1 모양) + 평면을 빨갛게 만드는 나쁜 링크 | exit 1 | exit 1 · `bound 0` (판정은 fail-closed 그대로) | **(가) 일상 경로 · 진단 전용** | 안전 우회 **아님**. 그러나 이 종단점의 `reasons.endpoint` 가 **`null`** = "no violation of its own — the link plane was refused elsewhere" 로 찍힌다. 대조군(나쁜 링크를 빼면)에서 같은 종단점은 `store-refused:document-state-unopenable` 이다 — **자기 잘못이 있는데 없다고 말한다** |
| 4 | 깨진 심링크가 `annotations.json` 이라는 이름을 쓰기(Z2f) | exit 2 + 사유 | exit 2 + 사유 | — | 우회 실패(fail-closed) |
| 5 | 심링크 뒤에 격리 표식을 두어 다시 가리기(Z2g) | exit 1 | exit 1 | — | 우회 실패(격리는 자기 subtree 안에서만 유효) |
| 6 | 같은 실체를 세 이름으로 넘겨 **가짜 중복** 만들기(Z2d) | exit 0 | exit 0 · 정답 | — | 우회 실패(위양성 0) |

### (가) 일상 경로 CONFIRMED 는 몇 건인가 — **2건** (1·2번)

두 건 다 **위조 인터프리터도 손으로 쓴 CRDT 도 필요 없고**, 디렉토리 하나를 만들거나 심링크
하나를 거는 것으로 도달한다 — 9차가 Y6(심링크)를 닫기로 한 것과 **같은 난이도**다. 3번은
판정을 바꾸지 않으므로 우회가 아니라 이번에 출하한 진단층의 **정확도 결함**이다.

두 건이 **차단이 아닌 이유**는 §7 에 적었다: HEAD 에서도 같은 답이라 이번 수정이 만든 것이
아니고(무회귀), 실사용 산출은 byte-identical 이며, 판정 대상 세 항목은 전부 닫혔다.

## 6. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 x 레인 1:1 | HEAD 와 동일 | **19 시나리오 x 3레인 = 57 셀**, 9필드(`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong`) 차이 **0** |
| `suite-result.json` HEAD 대비 전 필드 재귀 diff | 설명 가능한 델타만 | **정확히 2개**: `gates.G5.asciiChars` 465487->491563, `hangulChars` 57826->64454. 원인은 두 wave 의 손글씨 증가(`git diff --numstat HEAD -- tools/plane-editor/`: `run-link-checks.mjs` +416/-60, `link-binding.mjs` +181/-27, `check_links.py` +62/-7, `bind-links.mjs` +41/-9, README 3종 +76/-7). 스캔 파일 수 **146 불변**, `scenarios`·`totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures`·`diagnostics`·`findings` **전부 identical** |
| 전 레인 오해소 | 0 | 원시 `trials[].lanes[].outcome` 재집계 **342 레인측정 · `wrong` 0**(survived 120 · drifted 2 · orphaned 214 · 미측정 6) — 8차·9차와 같은 값 |
| 실사용 바인딩 2건 | 좌표·텍스트·`blockItemId` 불변 | `[303,316) "honest orphan"` · `[204,267) "Selector multiplexing recovers anchors after destructive edits."`, `blockItemId 1:205`, `method relative-position` — 9차와 **동일**. `counts` = `bound 2 · orphaned 0 · unbound 0 · loadStoreCalls 1 · storesOpened 1 · ambiguousDocuments 0`, `gate {pass:true, exitCode:0, violations:[]}` |
| 결정성(앵커 스위트) | 3회 byte-identical | **3회 동일** + 재실행 **전** 디스크본과도 동일 |
| 결정성(링크·바인딩) | 3회 동일 | `run-link-checks` `d1510c7e…` · `check_links --format json` `ae8adb8c…`(8차·9차와 같은 값) · `bind-links --format json` `1b6e91ca…`(9차와 같은 값) |
| 링크 스위트 | 전수 | **91/91 ok · PASS**(9차 87/87). 늘어난 **4건** = C4b 넷째 대조군 1 + C10 (8) 1 + C10 (9) 1 + C12 (8) 1 |
| 링크 negative control | 34 이상 · 각 "exactly" | **게이트 30 + 바인더 4 = 34**(floor 34). 게이트 30건 전부 `exit 1 with exactly this violation`; 바인더 4건 전부 `gate exit 1 with exactly [rule]; binder exit 1 with 0 binding(s), 1 anchor endpoint counted and exactly one reason`(모호성은 **두 이름 순서** 둘 다) |
| 코퍼스 축소 방지 | 이빨 있음 | 반사실 `cf-corpus`(게이트 대조군 1개 `.pop()`)에서 `29 + 4 = 33 (floor 34)` **FAIL** |
| fixture 문서 생성기 | 0 differ | `make-fixture-documents.mjs --check` **PASS — 0 file(s) differ** |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 **146파일 · 위반 0**(스캔 범위는 `tools/plane-editor/` 이므로 내 `docs/verify/` 프로브는 이 수치를 건드리지 않는다) |
| 적대 프로브 | 무수정 재실행 | B 계열 9행 — `attachedToAnotherDocument: true` 는 **B1·B1b·B5** 뿐(전부 선언된 경계 밖, 8차·9차와 동일) |
| developer 담당 경로 밖 변경 | 0 | developer 델타 = `tools/plane-editor/` **9개** + 자기 메모리 4개. **`ontology/**` 변경 0**(`git status --porcelain -- ontology` 항목 0 · `git diff --stat HEAD -- ontology` 공백), `tools/` 안에서도 `plane-editor` 밖 변경 0 |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch 사본. 내가 만든 파일은 `docs/verify/` 2개(이 리포트 + 프로브). 산출물 3종 해시가 실험 전후 동일 |

### 담당 경로 밖 델타 1건 — 귀속

`docs/feedback/plane-editor-and-kg-content-decisions.md`(+28줄)은 developer 자기보고 파일
목록에 **없다**. 내용은 "앵커→링크 바인딩 완료 (orchestrator 기록, 2026-08-29)" 이므로
**orchestrator 의 채널 기록**이며 developer lane 침범이 아니다. 다만 그 기록의 한 문장은
이번 판정으로 정정이 필요하다 — §7-3.

## 7. 관측

### 7-1. 새 발견 (차단 아님)

1. **`SCAN_SKIP_DIRS` 는 스토어를 조용히 가린다**(Z2e·Z2e'). 격리 표식은 `quarantined[].excluded`
   로, 이름 축은 `outOfScope` 로 판정 JSON 에 남는데(코드의 원칙: "조용한 제외 금지"),
   `.git`·`node_modules` 로 가지치기된 트리는 **아무 데도 남지 않는다**. 발견의 전제 표(4행)에도
   이 축이 없다. 닫든(스킵 대상도 훑고 후보로만 올리기) 선언하든(전제 5번째 행 + 판정 JSON 에
   `skipped` 실기) 둘 중 하나여야 한다.
2. **진단층이 과잉 안심한다**(Z3d). `reasons.endpoint: null` 의 텍스트가
   `"no violation of its own — the link plane was refused elsewhere"` 인데, 정확한 뜻은
   **"게이트가 볼 수 있는 잘못은 없다"** 이다. 게이트가 원리적으로 못 보는 축(편집기만 아는
   `loadStore` 거절)에서는 자기 잘못이 있는 종단점도 `null` 을 받는다. 판정(exit 1 · 바인딩 0)은
   그대로이므로 안전 문제가 아니라 **문구·의미 문제**다.
3. **8차 프로브 2개는 여전히 링크를 정렬하지 않는다**(P4·P5 가 `store-format` 을 밟아 전역 거절로
   덮인다). 9차 note 3 그대로이며 도구 결함이 아니라 프로브 쪽 재현성 문제다 — 정렬본
   (9차 X4·X5, 이번 무수정 재실행에서도 `+28` 이동과 쌍둥이 orphan 재현)이 그 성질을 대신 세운다.

### 7-2. 자기보고와 어긋난 자리

| developer 자기보고 | 실측 | 성격 |
|---|---|---|
| "suite-result.json 4ec3→**951404add4**…" | `951404ad…` 는 **REPORT.md** 의 해시다. `suite-result.json` = `6e52ab64…` | 전사 오류(산출물 자체는 정상·3회 동일) |
| "링크 스위트 91/91 PASS (직전 87/87; **신규 3검사**)" | 87 -> 91 = **+4**. 신규 `record()` 호출은 3자리지만 C4b 는 대조군 배열을 도는 루프라 넷째 대조군이 **검사 한 줄을 더 낸다** | 계수 오류(값 자체는 맞다) |
| "negative control 34 = 게이트 30 + 바인더 4 (floor 34, 직전 33)" | 일치 | — |
| "3회 byte-identical" 목록 | 전부 일치(값까지 재확인) | — |

### 7-3. 문서·채널의 문구가 실측과 어긋난 자리 (2건, 개선)

| 위치 | 문구 | 실측 |
|---|---|---|
| `tools/plane-editor/fixtures/link-plane/README.md:67,70` | "디스크에 굳힐 수 없는 대조군 **3개**" · "아래 **세 모양**은…" | 같은 절의 표는 **4행**이고 83줄은 "**네 대조군 모두**", 85줄은 "게이트 30 + 바인더 **4** = 34" |
| `docs/feedback/plane-editor-and-kg-content-decisions.md` (orchestrator 기록) | "마지막 라운드에서 **(가) CONFIRMED 가 처음으로 0건**이 되며 수렴했다" | 9차에 잰 모양들에 대해서는 참이나, 10차에서 (가) 2건(Z2e·Z2e')이 나왔다. "수렴" 서술은 **측정한 모양 집합에 대한 것**임을 한 줄로 한정해야 한다 |

## 8. ★ 최종 판정

**결론: (a) 실사용 유지. 차단 조건 0개.**

> **직전 판정이 남긴 비차단 관측 세 자리가 전부 닫혔고, 셋 다 반사실로 비공허성을 확인했다.**
> (1) `""`·`0`·`false`·`null` 이 전부 앵커 종단점으로 세어져 사유 있는 unbound 가 되고,
> **게이트의 앵커 규칙 둘을 죽인 반사실**(게이트 exit 0 · pass true)에서도 바인더가 혼자 exit 1
> 이다 — 9차에 `pass:true · exit 0` 이던 바로 그 자리다. (2) 심링크 축은 Y6 한 사례가 아니라
> **사슬·상대경로·사이클·세 이름**까지 닫혔고(HEAD 에서는 사슬·상대경로도 조용한 초록이었다),
> 같은 실체를 세 경로로 넘겨도 가짜 중복이 0이며(Y4 유지), 두 방향이 서로 다른 반사실에서
> 각각 하나씩 FAIL 한다. (3) 전역 거절에서도 종단점별 사유가 남고 exit 은 1이며, 좁은 가드는
> 가려지지 않는다(V7 무수정 재현 · Z3b 에서 전역 거절 아래에서도 좁은 사유가 이긴다). 층을
> 평평하게 만들면 **6건이 동시에 FAIL** 한다.
>
> **무회귀도 성립한다**: 19x3 = 57 셀 전 필드 동일, 342 레인 `wrong` 0, 실사용 바인딩 2건의
> 좌표·텍스트·`blockItemId` 불변, 실사용 산출 두 개가 9차와 **byte-identical**, negative control
> 34건 전부 "exactly"(floor 에 이빨), repo 게이트 3종 PASS, `ontology/` 변경 0.
>
> **새로 나온 (가) 2건은 차단하지 않는다** — HEAD 에서도 같은 답이므로 이번 수정이 만든 것이
> 아니고(무회귀), 실사용 산출을 바꾸지 않으며, 판정 대상 세 항목의 충족과 독립이다. 다만
> **경계 바깥도 선언된 전제도 아니므로 무시해서도 안 된다**: 발견 전제 표에 없고 판정 JSON 에
> 흔적도 남지 않는 **조용한 제외**이고, 이번 wave 가 닫은 바로 그 축(이름으로 숨기)을 이름
> 한 줄로 다시 연다. 다음 wave 의 1순위다.

### 이 lane 은 지금 멈춰도 되는가 — **된다.**

남은 것은 전부 **개선**이고 **차단은 0건**이다: (1) `SCAN_SKIP_DIRS` 축을 닫거나 전제로 선언
(가장 값어치 큼, 크기 = 판정 JSON 필드 1개 + 전제 표 1행, 닫는다면 훑기 규칙 1줄), (2) `reasons.
endpoint: null` 의 문구를 "게이트가 볼 수 있는 잘못은 없다"로 좁히기(문구 1줄), (3) `fixtures/
link-plane/README.md` 의 "3개·세 모양"을 4로 정정 + orchestrator 채널 기록의 "(가) 0건 수렴"에
측정 범위 한정 한 줄 추가. 셋 다 실사용을 막지 않으며 다른 작업과 배치로 묶어도 된다.

> (제품 축의 다음 결정은 여전히 `docs/feedback/link-plane-weight-decision.md`(`status: open`)의
> **가중**이고 사용자 승인 대기이므로 위 셋과 별개 트랙이다.)
