---
verdict: pass-with-notes (실사용 **조건부** — (b), 조건 **1개**: 바인더 단독 판정의 fail-open 3자리 → 0)
scope: tools/plane-editor — 주석 링크 종단점의 **문서 위치 바인딩**(`src/link-binding.mjs` + `bind-links.mjs` + 게이트의 `anchor` 계약)
criteria: 직전 판정 `docs/verify/plane-editor-document-axis-verify.md` §8 이 스스로 적은 **불변식 3개의 수치 그대로** + 브리프 §4–§7
baseline: 현재 워킹트리. HEAD `8fed32f` 는 19×3 셀 1:1 대조의 baseline 으로만 사용
re-measured: I-1 (M1·M1b·M2 **무수정** 재사용) · I-2 (코퍼스 43 · loadStore 대조 43 · 문서 축 7 · divergence 0) · I-3 (부류 3건 매 실행) · 반사실 3종(CF-1·CF-2·CF-3) · 새 프로브 11모양(P0–P5 · V1–V7 · W1–W4) · 적대 프로브 전 계열 무수정 재실행 · 19×3 셀 1:1 · 342 레인 재집계 · 3회 byte-identical · repo 게이트 3종
new-confirmed: **W3/V1**(같은 문서를 선언한 스토어가 둘 → 바인더가 **디렉토리 이름 순서로** 한쪽을 골라 exit 0 · 답이 뒤집힌다) · **W4**(게이트 exit 1 인데 바인더 pass true) · **W1**(`anchor: "constructor"` → **위치 없는 "bound"** 행 + exit 0; `W2`는 같은 뿌리로 exit 2 크래시)
observed: 게이트는 세 모양을 **전부 exit 1 로 잡는다**(두 층 합쳐서는 닫혀 있다) · 실사용 link-store 의 바인딩 2건은 **독립 경로로 재확인**했다(맞다) · C9 성질은 "코퍼스가 실제로 밟는 모양"에 대해서만 살아 있다(밟지 않는 새 규칙은 안 보인다 — README 가 선언한 범위)
declared-outside: B1·B1b·B5·H2(손 기입 정체성·유효 capture 이식) · Z1(죽은 이름표 padding) · N3(sniff 4KB 예산) · N5(`legacy: []`) · M1·M1b(문서 상태 손 기입) · M2(CRDT 스플라이스) — **차단 사유로 쓰지 않음**
---

# plane-editor 앵커 종단점 바인딩 판정 (vnv, 8차)

## 0. 무엇을 기준으로 쟀는가

- **기준은 직전 판정이 스스로 적은 수치다.** `docs/verify/plane-editor-document-axis-verify.md` §8 의
  불변식 표 3행을 문언·수치 그대로 적용했다(완화 없음). 내가 7차에 만든 **M1·M1b·M2 는
  스토어 모양을 무수정 재사용**했다 — 종단점에 `anchor` 를 실은 것만 다르다(그래야 바인딩
  경로가 돈다). 7차 프로브 `plane-editor-document-axis-probe.mjs` 자체도 **무수정 재실행**했다.
- developer 자기보고는 **판정 대상**으로만 썼다. 아래 모든 수치는 내가 다시 잰 값이다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`. 실험은 전부 scratch 사본이며 트리에 쓴 것은
  `docs/verify/` 3개(이 리포트 + 프로브 2개)뿐이다.

## 1. 실행한 명령 (재현 절차)

```
# 재실행 전 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,\
README.md,run-link-checks.mjs,run-suite.mjs,bind-links.mjs} tools/plane-editor/src/*.mjs \
tools/plane-editor/sample-state/*.json tools/plane-editor/link-store/*.json

# 게이트 / 바인더 / 스위트 (각 3회, 별 프로세스)
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json
node tools/plane-editor/bind-links.mjs                       # 사람이 읽는 표
node tools/plane-editor/bind-links.mjs --format json         # 판정 JSON
node tools/plane-editor/run-link-checks.mjs
node tools/plane-editor/run-suite.mjs
node tools/plane-editor/make-fixture-documents.mjs --check
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py

# vnv 기존 프로브 — 전 계열 **무수정** 재실행
VNV_SCRATCH=<s>/probes/<p> node docs/verify/plane-editor-{document-axis-probe,parity-probe,\
binding-adversarial,binding-hardening-adversarial,binding-invariants-adversarial,\
binding-invariants-residual-probe,binding-store-probe,c1-adversarial,c1b-adversarial,\
phase1-adversarial}.mjs
/usr/bin/python3 docs/verify/plane-editor-{binding,binding-hardening,binding-invariants}-link-probe.py
/usr/bin/python3 docs/verify/plane-editor-vocab-realign-probe.py     # ※ §7-4

# vnv 신규 프로브 (이번 판정)
VNV_SCRATCH=<s>/eb  node docs/verify/plane-editor-endpoint-binding-probe.mjs           # P0–P5, V1–V7
VNV_SCRATCH=<s>/ebr node docs/verify/plane-editor-endpoint-binding-residual-probe.mjs  # W1–W4

# 반사실 — 트리 사본에 패치를 걸어 돌린다 (원본 무수정)
rsync -a --exclude node_modules tools/ <s>/cfN/tools/ ; ln -s <repo>/.../node_modules ... ;
mkdir <s>/cfN/.git ; cp -r ontology catalog-v001.xml <s>/cfN/ ;
cd <s>/cfN && node tools/plane-editor/run-link-checks.mjs
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 실험 **후** |
|---|---|---|---|
| `suite-result.json` | `30fb66e0…` | 동일(3회) | 동일 |
| `REPORT.md` | `9d6d6e38…` | 동일(3회) | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일(3회) | 동일 |
| `run-link-checks.mjs` 출력 | — | 3회 **`134fc23c…`** | 동일 |
| `check_links.py --format json` | — | 3회 **`ae8adb8c…`** | 동일 |
| `bind-links.mjs --format json` | — | 3회 **`d5bb4d33…`** | 동일 |

**트리에 실린 표 = 내가 재생산한 표.** `git status` 는 이 판정 전후로 `tools/plane-editor` 항목
**3개 불변**(REPORT.md·link-store/README.md·suite-result.json — 전부 이번 wave 것), 내가 더한 것은
`docs/verify/` 3개뿐이다.

## 2. I-1 재측정 — "바인딩은 `loadStore` 가 연 스토어에만 건다"

기준(직전 §8 표 1행 그대로): 종단점을 묶는 코드 경로가 스토어당 `loadStore`(또는
`inspectStore`)를 **1회 호출**하고, 거절 시 그 스토어의 바인딩 **0** + 사유를 판정 JSON 에 기록.

### (1) 코드 — 경로가 진짜 그 함수를 타는가

- `src/link-binding.mjs:119 openStore()` → `loadStore(dir, {storeFile})` → `openSession({update: store.docUpdate})`.
- `src/store.mjs:327 loadStore()` = `inspectStore()` 위에 서 있고 **첫 위반에서 던진다**
  (`const {problems,…} = inspectStore(dir, options); if (first) throw new StoreContractError(...)`).
  `inspectStore` 가 옆 `document.json` 을 열고 **CRDT 에서 정체성을 얻어**(`documentIdFromUpdate`)
  평문에 못 박는다. 즉 바인더는 게이트가 못 보는 축까지 실제로 통과해야 문서를 연다.
- 호출은 스토어당 **한 번**이다: `openFor()` 가 `sessions` 맵으로 캐시하고 `loadStoreCalls` 를
  그때만 올린다. 실사용 스토어는 **앵커 종단점 2개 / `loadStoreCalls` 1 / `storesOpened` 1**.
- 해소 경로에 **정책 우회가 없다**: `resolveAnchors(session, anchors, {counterfactuals:false})`
  한 줄뿐이고 `policy`·`quoteOnTombstone` 인자가 없다(grep 결과 0건) → 기본 **strict**.

### (2) ★ 실측 — 게이트는 초록, `loadStore` 는 거절인 세 모양

`docs/verify/plane-editor-endpoint-binding-probe.mjs` P1·P1b·P2 (M1·M1b·M2 무수정 재사용):

| 모양 | 게이트 | 바인더 exit / pass | bound | unbound 사유 | `loadStoreCalls` / `storesOpened` |
|---|---|---|---|---|---|
| **P0 대조군** 정직한 스토어 | exit 0 · pass true | **0 / true** | **1** (`[17,29) "The disputed"`) | — | 1 / 1 |
| **P1 = M1** `yUpdateBase64` 해독 불가 | **exit 0 · pass true** | **1 / false** | **0** | `store-refused:document-state-unopenable` | **1 / 0** |
| **P1b = M1b** 유효 base64, Yjs 아님 | **exit 0 · pass true** | **1 / false** | **0** | `store-refused:document-state-unopenable` | **1 / 0** |
| **P2 = M2** 평문 일치, CRDT 만 남의 문서 | **exit 0 · pass true** | **1 / false** | **0** | `store-refused:document-state-mismatch` | **1 / 0** |

판정 JSON 의 `annotationStores[]` 행에도 `opened:false · refusal:"document-state-…" · bindings:0`
이 남는다. **게이트 exit 0 만 보고 묶지 않는다 — I-1 충족.**

부수 확인: `V7`(레코드가 남의 문서를 주장)에서는 게이트가 per-store 규칙을 내므로 바인더가
**열지도 않는다**(`loadStoreCalls: 0`, `refusal: "gate:annotation-record-document-mismatch"`).
필요조건(게이트)·충분조건(loadStore)이 코드에서 실제로 두 단이다.

## 3. I-2 재측정 — 두 층이 같은 답 · 성질이 살아 있는가

기준(직전 §8 표 2행): **divergence 0** · `loadStore` 대조 스토어 수 **= 코퍼스 크기** ·
문서 축 코퍼스 **≥ 4**.

| 항목 | 직전(7차) | 지금 | 기준 | 판정 |
|---|---|---|---|---|
| 코퍼스 크기 | 38 | **43** | — | — |
| **부류 밖 divergence** | 0 | **0** | 0 | 충족 |
| **`loadStore` 로 대조되는 스토어** | 38 | **43** | = 코퍼스 | 충족 |
| **문서 축 코퍼스** | 4 | **7** | ≥ 4 | 충족 |
| 양층이 함께 거절(비공허) | 17/38 | **20/43** | ≥ 4 | 충족 |
| 링크 스위트 | 66/66 | **81/81 · PASS** | — | — |

### ★ 반사실 CF-1 — 새 규칙을 **한쪽에만** 넣으면 C9 가 실제로 FAIL 하는가 → 한다

트리 사본에서 `annotationStoreContract`(편집기 쪽)에만 규칙 하나를 더했다
(`add('vnv-editor-only-rule', …)`, 게이트에는 대응 규칙 없음):

```
FAIL  every store … outside the declared class (43 store(s)) —
      …/broken-endpoint/annotations.json: editor [vnv-editor-only-rule] vs gate [accepted] ·
      …/document-mismatch/annotations.json: editor [store-document-mismatch, vnv-editor-only-rule] …
FAIL  the premises the gate cannot see are MEASURED … — 0 store(s) in the class
FAIL  the property is not vacuous … — 43 of 43 store(s) refused
FAIL  the real store (sample-state) opens through that same path … — the real store did not load
   (exit 1)
```

**성질은 살아 있다.** 다만 정직하게 적어 둔다: 내 **첫 시도**(레코드에 `body` 를 요구하는
규칙)는 아무것도 잡지 못했다 — 코퍼스의 레코드가 전부 `body` 를 갖고 있어 그 규칙이 한 번도
발화하지 않았기 때문이다. 즉 C9 가 잡는 것은 **코퍼스가 실제로 밟는 모양의 규칙**이고,
코퍼스가 밟지 않는 새 규칙은 보이지 않는다. 이것은 README `I-4 ①`(fixtures 밖은 안 본다)이
이미 선언한 범위이며 과장이 아니다.

## 4. I-3 재측정 — 선언된 전제가 **매 실행 측정**되는가 (dead code 아님)

기준(직전 §8 표 3행): `expectedDivergence` 부류 **≥ 3** 이 매 실행 측정 · 그 부류 **밖**
divergence **0**.

```
ok  the premises the gate cannot see are MEASURED, not asserted (expectedDivergence class)
    — 3 store(s) in the class [document-state-mismatch, document-state-unopenable],
      every one signed green by the gate and refused by the editor:
      document-state-foreign-crdt [document-state-mismatch] ·
      document-state-unopenable-base64 [document-state-unopenable] ·
      document-state-unopenable-payload [document-state-unopenable]
```

3회 실행 전부 같은 3건(출력 해시 `134fc23c…` 동일). 7차의 지적(`GATE_BLIND_CODES` 는 선언만
있고 **발화 0회**)이 실제로 해소됐다 — 이름이 `EXPECTED_DIVERGENCE_CODES` 로 바뀌었고 그
부류에 드는 fixture 3개가 코퍼스에 들어와 **매 실행 세어진다**.

**부류에 이빨이 있는가 — 반사실 2종:**

| 반사실 | 결과 |
|---|---|
| **CF-2** 부류 fixture 3개를 코퍼스에서 지운다 | **FAIL** `0 store(s) in the class` (exit 1). 문서 축 코퍼스도 7 → 4 로 줄어든다 → 부류는 **주장이 아니라 측정값**이다 |
| **CF-3** 부류를 게이트가 볼 수 있는 코드로 **넓힌다**(`document-state-absent` 추가) | **FAIL** — 넓힌 그 스토어가 부류로 흡수되지 않고 `editor [document-state-absent] vs gate [annotation-store-document-unreadable]` 로 그대로 divergence 가 된다(exit 1) → 전제가 **조용히 넓어질 수 없다** |

**I-3 충족.** (부류 판정이 `!gate.rejected` 를 요구하므로, 게이트가 규칙을 가진 코드는 부류로
들어오지 못한다 — 규칙 퇴화가 "예상된 어긋남"으로 가려지지 않는다.)

## 5. ★ 바인딩이 **진짜인가** — 앵커를 해소해 직접 확인

### (1) 가리키는 텍스트가 맞는가 (독립 경로)

프로브 P3 은 바인더를 믿지 않고 **ProseMirror 자신의 `doc.textBetween`** 으로 그 좌표의
텍스트를 다시 떴다(`loadStore` → `openSession` → `doc.textBetween(from, to)`):

| 링크 | 앵커 | 바인더가 말한 것 | `textBetween` | 일치 | 문서 안 그 문자열의 출현 횟수 | 캡처값 대조 |
|---|---|---|---|---|---|---|
| `ln-honest-orphan-quote-tagged-design-for-loss` | `textQuote` | `[303,316) "honest orphan"` | `"honest orphan"` | **true** | **2회** | 캡처 인용문 `"honest orphan"`, 캡처 prefix `"ong resolution is worse than an "` |
| `ln-selector-multiplexing-block-tagged-graceful-fallback` | `blockContext` | `[204,267) "Selector multiplexing recovers anchors after destructive edits."` | 같은 문자열 | **true** | 1회 | 캡처 블록 텍스트 동일, **블록 item id `1:205` = 캡처값 `1:205`** |

**함정을 통과했다.** `"honest orphan"` 은 문서에 **두 번** 나온다(a6 의 문장, 그리고 다음
문장 `"Keeping an honest orpha…"`). 바인딩된 자리의 앞뒤 문맥을 떠 보면
`"ong resolution is worse than an honest orphan record.\nKe"` 로, **레코드가 캡처한 prefix 와
같은 쪽**이다 — 두 번째 출현이 아니다. `blockContext` 쪽은 CRDT item id 까지 캡처값과 같다.

### (2) 앵커가 **두 벌로 갈리지 않았는가** (코드 + 실측)

- **링크 레코드 스키마에 selector 자리가 없다.** `src/link-plane.mjs linkRecord()` 는 종단점을
  `{plane, ref, document?, anchor?}` 로만 정규화하고, 게이트는 그 키 집합을 **닫아** 둔다:
  `check_links.py:1464` `not set(ep) <= {"plane","ref","document","anchor"}` → `link-endpoint-plane`.
  `anchor` 값도 닫힌 집합(`ENDPOINT_ANCHORS = ("blockContext","textQuote")`, `check_links.py:191`)
  이며 메시지가 그 의도를 적는다 — *"a link never copies selectors of its own"*.
- **실측 V5**: 종단점에 `{from:17,to:29}` 또는 `{textQuote:{exact:…}}` 를 심으면 게이트가
  **exit 1** (`link-endpoint-plane`). 사본을 실을 수 없다.
- **실측 P4 (파생성)**: 사본 문서 앞에 **28자**를 끼워 넣고 다시 바인딩하면
  `blockContext 204→232`, `textQuote 303→331` 로 **정확히 +28** 이동하고 텍스트는 그대로다.
  링크 파일은 손대지 않았다 → 위치는 저장값이 아니라 **파생값**이다.
- 디스크 확인: `link-store/links.json` 의 두 앵커 링크에는 좌표·인용문 필드가 없다
  (`{plane, ref, document, anchor}` 뿐).

### (3) 오부착 0 — strict 규칙을 우회하지 않는가

| 시험 | 결과 |
|---|---|
| **P5** a6 블록을 통째로 지우고 **같은 문장을 다른 자리에 다시 타이핑**(쌍둥이 함정) | `ORPHANED (block-gone/block-identity-destroyed)` · `from/to/text = null` — **다시 겨누지 않는다** |
| **P5** a5 블록을 둘로 가른다 | 남은 블록의 **CRDT item id 가 캡처값과 같을 때만** 내준다(`[204,225) "Selector multiplexing"`); 다르면 `block-identity-changed` 로 orphan |
| **V4** 레코드가 그 앵커 부분을 안 실음 | 게이트 `annotation-anchor-missing` · 바인더 `anchor-part-missing-from-the-record` (exit 1) — **두 층이 같은 자리** |
| **V6** 스토어에 없는 레코드 | 게이트 `record-endpoint-missing` · 바인더 `no-such-record-in-the-opened-store` (exit 1) |
| **V7** 레코드가 남의 문서를 주장 | 게이트 `annotation-record-document-mismatch` · 바인더는 **열지도 않음**(`loadStoreCalls 0`) |
| 적대 프로브 **전 계열 무수정 재실행** | B1·B1b·B2·B3·B4·B4b·B5·B6 / H1·H1b·H2·H3·H4·H5 / X1·X2 / Z1 / N0–N6 / M0–M6 / C1·C1b·phase1 계열 / L·P·Y 파이썬 계열 — **전부 직전 판정과 같은 값**. `misResolved` 필드가 있는 모든 행은 **false**, 일상 경로 오해소 **0** (참인 `attachedToAnotherDocument` 는 B1·B1b·B5·H2 뿐이고 넷 다 **손 기입 정체성 = 선언된 경계 바깥**) |
| 앵커 스위트 원시 재집계 | `trials[].lanes[].outcome` **342 레인측정, `wrong` 0** (`survived` 120 · `drifted` 2 · `orphaned` 214 · 미측정 6) |

## 6. ★ 새 우회 창안 — 11모양, (가)/(나) 분류

증거 스크립트 2개(전부 실제 세션·실제 게이트·실제 `bind-links` 프로세스):
`docs/verify/plane-editor-endpoint-binding-probe.mjs`(P0–P5·V1–V7),
`docs/verify/plane-editor-endpoint-binding-residual-probe.mjs`(W1–W4).

| # | 우회 | 게이트 | 바인더 단독 | 분류 | 판정 |
|---|---|---|---|---|---|
| **V1 / W3a** | 주석 스토어 디렉토리를 **백업 사본**으로 하나 더 둔다(둘 다 같은 `documentId`; 사본의 `a6` 만 같은 문서의 다른 문장에 재앵커) | exit 1 `annotation-store-duplicate-document` | **exit 0 · PASS · 1 binding** → `[77,91) "standoff model"` (**사본** 쪽) | **(가) 일상 경로** | **CONFIRMED** |
| **W3b** | 같은 사본을 `zcopy` 로 **이름만 바꾼다** | exit 1 (동일) | **exit 0 · PASS** → `[303,316) "honest orphan"` (**원본** 쪽) | **(가)** | **CONFIRMED** — 같은 링크의 답이 **디렉토리 이름으로 뒤집힌다** |
| W3c 대조군 | 사본 없음 | exit 0 | exit 0 → `[303,316) "honest orphan"` | — | 정답은 이것 |
| **W4** | 게이트가 확실히 거절하는 링크 스토어(그래프에 없는 타입 `inventedRelation`) | **exit 1** `link-type-unknown` | **exit 0 · PASS · 1 binding** | **(가)** | **CONFIRMED** — README 의 "게이트 exit 0 은 **필요조건**" 이 바인더 구현에서는 참이 아니다 |
| **W1** | 종단점 `anchor: "constructor"` (해소표가 **상속**하는 키) | exit 1 `link-endpoint-plane` | **exit 0 · PASS** · `state:"bound"` 인데 **`from`·`to`·`text` 필드가 아예 없다** | **(가)** | **CONFIRMED** — 위치 없는 "묶임" |
| W2 | `__proto__`·`toString`·`valueOf`·`hasOwnProperty`… | exit 1 (동일) | **exit 2 크래시** `x resolver is not a function` | (가) | 같은 뿌리 (조용한 초록은 아님) |
| V2 | `decision`/`graph` 종단점에 `anchor` | exit 1 `link-endpoint-plane` | exit 0 · 그 종단점을 **조용히 건너뜀**(anchorEndpoints 0) | (나) 게이트가 닫음 | 우회 실패 |
| V3 | 계약 밖 앵커 이름(`relativePosition`·`"textQuote "`) | exit 1 `link-endpoint-plane` | exit 1 `anchor-part-has-no-resolver:…` | — | 방어 작동 |
| V4 | 레코드가 그 부분을 안 실음 | exit 1 `annotation-anchor-missing` | exit 1 | — | 방어 작동 |
| V5 | 종단점에 selector 사본 필드 | exit 1 `link-endpoint-plane` | exit 0(추가 필드 무시) | (나) 게이트가 닫음 | 우회 실패 |
| V6 | 없는 레코드 | exit 1 `record-endpoint-missing` | exit 1 | — | 방어 작동 |
| V7 | 레코드가 남의 문서 주장 | exit 1 | exit 1(열지 않음) | — | 방어 작동 |

### (가) 3건이 무엇인가 — 성질을 우회한 것인가, 다른 축인가

**바인더 **자기 판정**의 fail-open 이다(성질·게이트의 결함이 아니다).** 근거:

1. **게이트는 셋 다 exit 1 로 잡는다.** 두 층을 함께 쓰면 커밋은 막힌다. 즉 **저장소는
   안전하고**, 위험은 "`bind-links` 의 산출만 읽는 소비자"에 한정된다.
2. **뿌리는 하나다 — 바인더가 자기 전제를 좁게 잡는다.** `bindLinkStore` 는 스토어별
   `PER_STORE_GATE_RULES` 만 본다(`src/link-binding.mjs:109 gateRulesFor`). 그런데
   `annotation-store-duplicate-document` 는 **스토어 사이의 사실**이라 그 집합에 일부러 없고
   (`src/store-contract.mjs` "계약 밖" 절), 링크 평면 전역 위반(`link-type-unknown` 등)도 없다.
   그래서 게이트 전역 판정이 빨강이어도 바인더는 초록을 낸다. 그리고 문서 → 스토어 선택은
   `byDocument` 의 **first-wins**(`if (!byDocument.has(id))`)라, 후보가 둘이면 **발견 순서**가
   답을 정한다.
3. **일상성**: 스토어 디렉토리를 복사하는 일(백업·export·트리 안 두 번째 체크아웃)은 일상이다.
   이 판정 중에도 우연히 재현됐다 — 다른 프로브를 돌리려고 `tools/` 를 워크스페이스 안에
   복사했더니 게이트가 즉시
   `documentId 'doc-sample-state' is declared by 2 annotation stores (docs/verify/gc/tools/…, tools/…)`
   를 냈다. 손으로 정체성을 위조할 필요가 없다 = **경계 바깥이 아니다.**
4. **W1 의 기계적 원인**: `ANCHOR_PART_RESOLVERS[ep.anchor]` 가 `Object.prototype` 을 상속하므로
   `ANCHOR_PART_RESOLVERS.constructor` 는 **함수**(`Object`)다. `Object(session)` 이 세션을 돌려주고
   `placed.orphanReason` 이 `undefined` 라 "bound" 분기로 떨어져 `from/to/text = undefined` 인 행이
   나온다. C12(1) 의 대조는 `Object.keys(ANCHOR_PART_RESOLVERS)`(=2개)와 게이트 목록을 비교하므로
   **상속 키는 그 대조를 통과한 채 조회에서만 인정된다** — 대조 자체는 항진명제가 아니지만
   (게이트 목록과 실제 표를 비교한다) 이 틈은 못 본다.
5. **피해의 성질** — W3 은 이 lane 이 가장 금기시하는 모양이다: **조용한 오부착**(사유 없이
   다른 문장을 가리키고 `pass: true`). W4·W1 은 "빨강이어야 할 자리에서 초록"이지 잘못된 좌표를
   만들지는 않는다.

## 7. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 × 레인 1:1 | HEAD 와 동일 | **19 시나리오 × 3레인 = 57 셀**, 9필드(`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong`) 전수 차이 **0** |
| 집계 | 동일 | `totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures`·`diagnostics`·`findings` **전부 identical**(HEAD 대비) |
| `suite-result.json` HEAD 대비 유일 델타 | 설명 가능 | `gates.G5` 문자수(ASCII 465487→465529, 한글 57826→57819)뿐. 원인은 이 wave 의 `link-store/README.md` 문구 2줄 수정(스캔 파일 수는 146 불변) |
| 전 레인 오해소 | 0 | 원시 `trials[].lanes[].outcome` 재집계 **342 레인측정 · `wrong` 0** |
| 반사실(막은 오해소) | 유지 | textmove 36 · phase1 74 · naive 76 (불변) |
| 진단 | 유지 | D1–D6 6개 (추가·삭제 0) |
| 결정성(앵커 스위트) | 3회 byte-identical | **3회 동일** + 재실행 **전** 디스크본과도 동일 |
| 결정성(링크·바인딩) | 3회 동일 | `run-link-checks` `134fc23c…` · `check_links --format json` `ae8adb8c…` · `bind-links --format json` `d5bb4d33…` |
| 링크 스위트 | 전수 | **81/81 ok · PASS** (직전 66/66) |
| 링크 negative control | 전수 FAIL 유지 | **30/30** exit 1 + **위반 정확히 1건**(직전 28). 신설 2건은 이번 wave 것: `negative-annotation-anchor-unknown → link-endpoint-plane`, `negative-annotation-anchor-missing → annotation-anchor-missing` |
| 링크 positive control | PASS | 실사용 link-store **exit 0 · 위반 0** (7차 §7-3 의 병행 lane red 는 **해소됨** — 스토어가 `id:kind-overlap` 으로 이행) |
| fixture 문서 생성기 | 0 differ | `make-fixture-documents.mjs --check` **PASS — 0 file(s) differ** |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 **146파일 · 위반 0** |
| 담당 경로 밖 변경 | 0 | 워킹트리 델타는 `tools/plane-editor/{REPORT.md,link-store/README.md,suite-result.json}` 3개 + developer 자기 메모리 2개. `ontology/**` 변경 **0**(git status 전수) |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch. 내가 만든 파일은 `docs/verify/` 3개. 프로브가 만든 `docs/verify/{gc,probes}` 임시 트리는 제거 완료(§7-4) |

### 비차단 관측

1. **README·docstring 의 "게이트 exit 0 은 필요조건" 은 구현보다 강하다**(W4). 실제 전제는
   "그 **스토어 하나**에 per-store 위반이 없다"이다. 문구를 실측에 맞추거나(범위를 좁혀 적기)
   구현을 문구에 맞추거나(전역 판정도 보기) 둘 중 하나가 필요하다 — §8 조건에 넣었다.
2. **C9 성질의 범위는 "코퍼스가 밟는 모양"이다**(§3 CF-1 의 첫 시도). README `I-4 ①` 이 이미
   선언한 범위이므로 과장은 아니지만, "새 규칙을 한쪽에만 넣으면 잡힌다"는 말은 **그 규칙이
   코퍼스에서 발화할 때** 참이다.
3. **`bind-links` 의 사람용 출력이 후보 모호성을 감춘다.** W3 에서 진 스토어는
   `not needed by any anchor endpoint` 로 찍힌다 — 사실은 **동등한 후보였다**.
4. **`plane-editor-vocab-realign-probe.py` 는 자기 완결적이지 않다**: 스크립트 디렉토리 옆의
   `docs/verify/gc`(그래프 사본)가 **이미 있다고 가정**한다. 내가 사본을 만들어 준 뒤에는 E0–E9
   전부 재현됐고(teeth 12모양 전부 exit 1, `E9 copy == original -> True`), 끝나고 사본을 지웠다.
   이 lane 의 결함이 아니라 그 프로브의 재현성 문제다.
5. `counts.recordEndpoints` 는 0 이다(실사용 링크 9건 중 주석 종단점은 2건이고 둘 다 앵커를
   싣는다). 즉 이 스토어에서 "레코드까지만 가리키는 주석 종단점"은 지금 없다.

## 8. ★ 최종 판정 — 이 바인딩을 실사용에 올려도 되는가

**결론: (b) 조건부 — 조건 1개.**

> **직전 판정이 건 불변식 3개는 전부 충족됐다**(§2·§3·§4): I-1 은 M1·M1b·M2 무수정 재사용에서
> 바인딩 0 + 사유 + exit 1 · `loadStoreCalls` 스토어당 1, I-2 는 divergence 0 · loadStore 대조
> 43 = 코퍼스 43 · 문서 축 7(≥4) 이고 한쪽에만 규칙을 더하면 C9 가 이름을 대며 FAIL 한다,
> I-3 은 부류 3건이 매 실행 측정되고 지우면(CF-2)·넓히면(CF-3) 둘 다 FAIL 한다.
> **바인딩 자체도 진짜다**: 두 링크가 가리키는 텍스트를 ProseMirror 로 독립 확인했고, 두 번
> 나오는 인용문에서 **캡처 prefix 쪽**에 붙었으며, 블록 종단점은 CRDT item id 까지 일치한다.
> 링크는 selector 사본을 들지 않고(게이트가 키 집합을 닫는다) 문서를 28자 밀면 좌표가 +28
> 따라 움직인다. 일상 경로 오해소는 적대 프로브 전 계열 무수정 재실행에서 **0**이다.
>
> 그럼에도 (a) 로 올리지 않는 이유는 하나다. **바인더의 단독 판정이 fail-open 인 자리가
> 3군데 실측된다**(§6). 그중 W3 은 이 lane 이 규칙으로 금지한 바로 그 모양이다 — 스토어
> 디렉토리를 복사하는 **일상 조작**에서, 같은 링크가 **디렉토리 이름에 따라 다른 문장**을
> 가리키면서 `pass: true` 를 낸다. 이것은 경계 바깥도, 문서화된 전제도 아니다(README 의
> 바인딩 절은 중복 스토어를 언급하지 않고, 오히려 "게이트 exit 0 은 필요조건"이라고 적어
> 두어 실측과 어긋난다). 다만 **게이트가 세 모양을 전부 exit 1 로 잡으므로** 저장소가
> 오염되지는 않는다 — 그래서 (c) 가 아니라 (b) 다.

### 착수 조건 (1개, 수치)

| # | 조건 | 지금 값 (실측) | 충족 기준(수치) |
|---|---|---|---|
| **1** | **바인더 단독 판정이 fail-closed 여야 한다.** 자기 산출만 읽는 소비자에게 "조용한 초록"을 주지 않는다 | (a) 같은 `documentId` 를 선언한 스토어가 2개일 때 **exit 0 · pass true · 바인딩 1**(답은 디렉토리 이름 순서로 뒤집힘) · (b) 게이트 전역 exit 1(`link-type-unknown`)에서 **exit 0 · pass true** · (c) `anchor:"constructor"` 에서 **`state:"bound"` 인데 좌표 필드 부재 · exit 0** | 세 자리 전부 **0**: ① 한 문서를 2개 이상의 스토어가 선언하면 그 문서의 앵커 종단점 바인딩 **0 + 사유**(또는 명령 자체가 exit≠0) — 내 프로브 `W3a`·`W3b` 두 이름 순서에서 **답이 같거나 둘 다 거절**, ② 게이트 전역 판정이 빨강이면 바인더도 exit≠0(`W4`), ③ 앵커 이름은 해소표의 **own key** 로만 조회(`Object.hasOwn` 또는 `Object.create(null)`) — `W1`·`W2` 7모양 전부 `anchor-part-has-no-resolver` 로 **unbound**(크래시 0). 그리고 이 3자리가 **negative control 로 코퍼스에 들어와 매 실행 측정**될 것(현재 30건 → 33건 이상, 각 "exactly" 유지) |

> 조건 밖(차단 근거로 쓰지 않은 것): M1·M1b(문서 상태 손 기입) · M2(CRDT 스플라이스) ·
> B1·B1b·B5·H2·Z1(손 기입 정체성·이식·죽은 이름표) · N3(sniff 예산) · N5(`legacy: []`) ·
> V2·V5(게이트가 닫는 자리) · §7-4(다른 lane 프로브의 재현성).
