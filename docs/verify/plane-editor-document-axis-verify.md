---
verdict: pass-with-notes (착수 **가능** — (a). 차단 조건 0개)
scope: tools/plane-editor — 문서 축 fail-closed(조건 ①) · 성질의 편집기 오라클 = 진짜 `loadStore`(조건 ②) · 문구 2건 정정 · 새 우회 창안
criteria: 직전 판정 `docs/verify/plane-editor-parity-verify.md` §8 이 스스로 적은 **착수 조건 2개(수치 그대로)** + 브리프 무회귀 조건
baseline: 현재 워킹트리 (HEAD `cd4bb5d` 는 무회귀 1:1 대조의 baseline 으로만 사용)
re-measured: N1·N2·N6 무수정 재실행 · negative control 28 · C9 코퍼스 38 · loadStore 대조 38 · 역패치 2종 · 새 프로브 M0–M6 · 19×3 셀 1:1 · 336 레인 재집계 · 3회 byte-identical · repo 게이트 3종
new-confirmed: **M1 · M1b**(`yUpdateBase64` 내용이 유효한 업데이트가 아님 → 게이트 exit 0 · 종단점 묶임 / `loadStore` 거절) · **M2**(평문은 일치, CRDT 만 남의 문서) — 셋 다 README 가 **남은 전제로 미리 선언**한 축이고, **성질은 셋 다 잡는다**(fixture 로 심으면 C9 FAIL)
observed: `GATE_BLIND_CODES` 는 사실상 무효(rejected 불리언이 먼저 갈려 divergence 가 난다) · 선언된 전제는 fixture 로 커밋할 수 없다(넣으면 스위트 영구 red) · **워킹트리의 링크 게이트가 지금 red** — 원인은 병행 ontology lane(`ho:alternativeOf`/`ho:overlapsWith` TBox 은퇴), 이 lane 이 아님(반사실로 귀속)
declared-outside: H2(손 기입 documentId) · B5(유효 capture 이식) · Z1(죽은 이름표 padding) · 남의 documentId 로 새 문서 · N3(sniff 4KB 예산) · N5(`legacy: []`) — **차단 사유로 쓰지 않음**
---

# plane-editor 문서 축 fail-closed + 성질의 정직성 판정 (vnv, 7차)

## 0. 이 판정이 무엇을 기준으로 재는가

- **기준은 직전 판정이 스스로 적은 수치다.** `docs/verify/plane-editor-parity-verify.md` §8 표의
  조건 1·2 를 문언 그대로 적용했다(완화 없음, 새 기준 추가 없음). 내가 심었던
  **N1·N2·N6·N2형 fixture 는 무수정 재사용**했다.
- **형상.** 모든 측정은 **현재 워킹트리** 기준이다. HEAD `cd4bb5d` 는 19×3 셀 1:1 대조의
  baseline 으로만 썼다.
- developer 자기보고는 **판정 대상**으로만 썼다. 아래 모든 수치는 내가 다시 잰 값이다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`.

## 1. 실행한 명령과 산출물 (재현 절차)

```
# 재실행 전 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,\
README.md,run-link-checks.mjs} tools/plane-editor/src/{store.mjs,store-contract.mjs} \
tools/plane-editor/sample-state/*.json

# vnv 기존 프로브 — **무수정** 재실행 (조건 ① 재측정)
VNV_SCRATCH=<scratch>/parity node docs/verify/plane-editor-parity-probe.mjs

# vnv 신규 프로브 (이번 판정, M0-M6)
VNV_SCRATCH=<scratch>/docaxis node docs/verify/plane-editor-document-axis-probe.mjs

# 스위트 / 게이트
node tools/plane-editor/run-suite.mjs                    # x3 (별 프로세스)
node tools/plane-editor/run-link-checks.mjs              # x3
node tools/plane-editor/make-fixture-documents.mjs --check
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json  # x3
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py

# 반사실 — 트리 사본에 fixture 를 심고/역패치를 걸어 돌린다 (원본 무수정)
rsync -a --exclude node_modules tools/ <scratch>/copyN/tools/ ; ln -s <repo>/.../node_modules ...
mkdir <scratch>/copyN/.git ; node <scratch>/copyN/tools/plane-editor/run-link-checks.mjs

# 병행 lane 격리 — HEAD 의 ontology/ 를 스크래치에 풀고 도구 층을 그리로 돌린다
git archive HEAD ontology catalog-v001.xml | tar -x -C <scratch>/headont
HO_TOOLS_DIR=<scratch>/mixed/tools HARNESS_CATALOG=<scratch>/mixed/catalog-v001.xml node ...
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 프로브·실험 **후** |
|---|---|---|---|
| `suite-result.json` | `4e989e64…` | 동일(3회) | 동일 |
| `REPORT.md` | `a69fbc1b…` | 동일 | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일 | 동일 |
| `sample-state/{annotations,document}.json` | `d62ecfea…` / `3d2146f9…` | 동일 | 동일 |
| `run-link-checks.mjs` 출력 (HEAD ontology) | — | 3회 **`12da94a5…`** 동일 | 동일 |
| `check_links.py --format json` (link-store) | — | 3회 **`8a04ae12…`** 동일 | 동일 |

**트리에 실린 표 = 내가 재생산한 표**이고, 내 실험은 전부 scratch 사본에서 돌아 트리를
오염시키지 않았다(`git status -- tools/plane-editor` 항목 수 **70 으로 불변**, 내가 만든
파일은 `docs/verify/` 2개: 이 리포트 + `plane-editor-document-axis-probe.mjs`).

## 2. 조건 ① 재측정 — 문서 정체성 대조가 fail-open 하지 않는다

기준(직전 판정 §8 표 1행 그대로): **N1·N2·N6 3모양 전부 exit 1** · negative control **3건**
신설, 각 위반 정확히 1건 · 내 N 프로브 3행에서 게이트와 `loadStore` **답 일치**.

`docs/verify/plane-editor-parity-probe.mjs` **무수정** 재실행:

| 모양 | 직전 값 | 지금 값 (게이트) | 진짜 `loadStore` | 답 일치 |
|---|---|---|---|---|
| **N1** 문서 파일 없이 스토어만 이동 | exit 0 · pass true · broken 0 | **exit 1** `annotation-store-document-unreadable` | rejected `document-state-absent` | **일치** (`GATE_RULE_OF` 매핑) |
| **N2** 옆 `document.json` 에 평문 `documentId` 없음 | exit 0 · pass true | **exit 1** `annotation-store-document-unreadable` | rejected `document-state-unidentified` | **일치** |
| **N6** 옆 `document.json` 이 깨진 JSON | exit 0 · pass true | **exit 1** `annotation-store-document-unreadable` | rejected `document-state-unparsable` | **일치** |
| N0 대조군 (정직한 스토어) | exit 0 | **exit 0 · pass true** (위양성 없음) | accepted | 일치 |
| N2c 대조군 (평문 필드 있음) | exit 1 mismatch | **exit 1** `annotation-store-document-mismatch` (불변) | rejected | 일치 |

negative control: `run-link-checks.mjs` C4 가 **28건**(직전 24건)으로, 신규 4건
(`document-state-absent` · `document-state-unparsable` · `document-state-unidentified` ·
`document-state-missing`)이 각각 **exit 1 + 위반 정확히 1건**. 28/28 전부
"expected exactly [규칙]" 을 유지한다(조건은 3건, 실제 4건).

**인과 — 역패치 반사실.** 트리 사본에서 `_document_state` 의 네 거절 반환을 수정 전
(fail-open, `return None, None`)으로 되돌렸다:

| 되돌린 것 | C9 성질 | C10 문서 축 3행 |
|---|---|---|
| (없음) 현재 트리 | 39 스토어 · **0 divergence** | 3행 전부 exit 1 · 양층 거절 |
| **문서 축 fail-open 복원** | **FAIL — divergence 5건** (`document-state-{absent,missing,unidentified,unparsable}` + **내가 심은 N2형**: `editor [document-state-unidentified] vs gate [accepted]`) | `gate [none] … (exit 0)` 으로 부활 |

**조건 ① 충족** — 게이트가 건너뛰던 세 자리가 전부 위반이 됐고, 그 인과가 한 줄 역패치로 분리 확인됐다.

**조건 문언보다 넓게 닫혔다** (내가 새로 창안한 모양으로 추가 확인, §5 M3–M6):
`document.json` 이 **디렉토리**(M3) · **끊어진 심링크**(M4) · **JSON 배열**(M5) 인 경우,
그리고 **v1 스토어**(종단점을 안 묶는 스토어, M6)까지 전부 `annotation-store-document-unreadable`
이고 편집기 답과 일치한다. fail-closed 가 "네 사유"가 아니라 **모양 전반**에 적용됐다.

## 3. ★ 본체 — 조건 ②: 성질이 자기 재계산이 아닌가

기준(직전 판정 §8 표 2행 그대로): fixture 코퍼스 전수에서 `게이트 accept ⟺ **loadStore** accept` ·
내 N2형 fixture 가 **divergence 로 잡힐 것**(지금 0 → 1) · 코퍼스에서 `loadStore` 로 대조되는
스토어 **≥ 3**.

### (1) 편집기 변이가 실제로 `loadStore` 를 타는가 → 그렇다 (코드 + 실측)

- `src/store.mjs`: `loadStore(dir, options)` 가 **`inspectStore(dir, options)` 위에 서 있다**
  (`const { problems, … } = inspectStore(dir, options); if (first) throw …`). `inspectStore` 는
  파일을 읽고 · 옆 문서 상태를 열고 · **CRDT 에서 정체성을 얻어**(`documentIdFromUpdate`) 평문에
  못 박고 · payload 계약을 적용한다. 첫 위반에서 던지지 않고 전부 모을 뿐이다.
- `run-link-checks.mjs` C9 `editorVerdict()` 가 `inspectStore(dir, {storeFile}).problems` 를
  쓰고, **같은 자리에서 `loadStore(dir, {storeFile})` 자체를 호출**해 두 답이 갈리지 않는지
  스토어마다 확인한다(`agreesWithLoadStore`).
- 직전 판정에서 지적한 오라클(`annotationStoreContract(payload, {documentId: documentStateId(path)})`
  = 게이트와 **같은 평문 입력**)은 코드에서 사라졌다.

| 항목 | 직전 값 | 지금 값 |
|---|---|---|
| 코퍼스 크기 | 33 | **38** |
| **`loadStore` 로 대조되는 스토어** | **1** (`sample-state`) | **38** (전수) — 조건 기준 ≥3 |
| 옆에 `document.json` 이 있는 스토어 | 2 | 38 (fixture 문서 생성기 `make-fixture-documents.mjs`, `--check` 0 differ) |
| 양층이 함께 거절 (비공허) | 11 | **17** / 38 (가드 `>= 4`) |
| **문서 축으로 판정되는 스토어** | 0 (축 자체가 안 보임) | **4** (가드 `>= 3`) |
| divergence | 0 (**구조적으로 눈 감음**) | **0** (양층이 실제로 같은 답) |

### (2) ★ 내 N2형 반례를 성질이 잡는가 → 잡는다

내가 6차에서 만든 **N2형 fixture**(문서 A 의 정직한 스토어를 문서 B 의 디렉토리에 두고, 그
`document.json` 에서 평문 `documentId` 만 없앤 것)를 트리 사본의 `fixtures/` 안에
`annotation-stores/vnv-n2-moved-unidentified/` 로 **무수정** 심었다.

| 측정 | 6차 (직전) | 7차 (지금) |
|---|---|---|
| 코퍼스 자동 포함 | 33 → 34 | 38 → **39** (디렉토리 훑기) |
| 성질의 판정 | **accepted / accepted · divergence 0** (구조적 실명) | **양층 거절** (refused 17→18) |
| 문서 축 코퍼스 | 해당 없음 | 4 → **5** (내 fixture 가 그 축으로 판정됨) |
| 스위트 | 57/57 PASS (구멍이 조용) | 66/66 PASS (구멍이 없음) |
| **게이트 규칙 역패치 시** | 변화 없음(원래 못 봄) | **divergence 1건으로 잡힘** — `vnv-n2-moved-unidentified: editor [document-state-unidentified] vs gate [accepted]` |

**문언 vs 목적 판정.** 조건의 문언은 "내 N2형 fixture 가 divergence 로 잡힐 것(0 → 1)"이다.
조건 ① 이 충족된 세계에서는 **양층이 같은 답(거절)을 내므로 divergence 가 0 인 것이 정답**이며,
문언 그대로의 "divergence 1" 은 조건 ① 과 동시에 성립할 수 없다(내 6차 조건 작성의 내부
긴장이다). 조건의 **목적**은 "성질이 그 축을 볼 수 있는가"였고, 그것을 재는 올바른 형태는
위 표의 마지막 두 행이다 — **fixture 가 문서 축으로 판정되고**(0→5), **방어를 한 줄 되돌리면
정확히 그 fixture 가 divergence 로 튀어나온다**(0→1). 둘 다 실측으로 성립한다. **조건 ② 충족.**

### (3) 성질의 자기검사가 항진명제는 아닌가 → 아니다 (역패치로 발화 확인)

6차에서 `counts.annotationRecordsRead` 자기검사가 **구조상 발화 불가**(카운터가 검사 앞에서
증가)였던 전례가 있어, 이번 자기검사도 같은 방식으로 시험했다. 트리 사본에서 `editorVerdict`
를 **옛 방식**(계약 함수 재계산 + 옆 `document.json` 평문 필드)으로 되돌렸다:

```
FAIL  every store … (39 store(s)) — document-state-{absent,missing,unidentified,unparsable} +
      vnv-n2-moved-unidentified : editor [accepted] vs gate [annotation-store-document-unreadable]
FAIL  the editor side of the property IS the real loadStore (not a recomputation of the contract)
      — loadStore disagrees with the inspected load path on: <다섯 스토어를 이름으로 지목>
      (문서 축 코퍼스도 4 → 0 으로 무너져 세 번째 체크도 FAIL)
```

**세 체크가 동시에, 스토어 이름을 대며 발화한다.** 자기검사는 공허하지 않다.

### (4) 성질이 **새로** 창안한 반례도 잡는가 → 세 건 전부 잡는다

§5 의 M1·M1b·M2 를 fixture 로 심어 코퍼스를 41 로 만들면:

```
FAIL  every store the fixtures hold gets the same answer from both layers (41 store(s)) —
      vnv-m1  : editor [document-state-unusable]  vs gate [accepted]
      vnv-m1b : editor [document-state-unusable]  vs gate [accepted]
      vnv-m2  : editor [document-state-mismatch]  vs gate [accepted]
```

이것이 이번 판정의 결정적 차이다. **6차에서는 내 반례를 코퍼스에 넣어도 성질이 0 divergence 를
냈다**(오라클이 게이트와 같은 입력을 먹었으므로). **7차에서는 내가 이번에 처음 만든 세 반례를
전부 잡는다.** 성질의 적용 범위가 사례 표를 넘어 실제로 넓다.

## 4. 성질의 범위 정직성 — 문구가 실측대로인가

| 문구 | 실측 | 판정 |
|---|---|---|
| **[6차 CONFIRMED 1]** README "평문 필드를 견준다. **파일을 옮기는 것만으로 도달하는 어긋남은 이것으로 닫히지만(X1)**, 손으로 고치는 것은 경계 바깥" | 삭제되고 **자기 반증문**으로 대체됐다: "한때 이 절은 … 적었다 — **그것은 실측에 반증됐다**(vnv N1·N2·N6) … 지금은 그 세 자리가 전부 위반이다". 남은 전제는 **2행 표**로 좁혀 적혔다 | **정정 이행됨** (문구가 실측과 일치) |
| **[6차 CONFIRMED 2]** REPORT §13 "그 성질이 서면 **새 변종은 자동으로 잡힌다**" | "**즉 자동으로 잡히는 것은 코퍼스에 들어온 모양이지 '모든 새 변종'이 아니다**" 로 좁혀졌고, 코퍼스 정의(`fixtures/**` + `sample-state`, 필터는 `annotations`·`version` 두 키)와 코퍼스 **밖**은 발견이 맡는다는 분담까지 적혔다 | **정정 이행됨** |
| README I-4 "성질의 **범위**(무엇이 자동이고 무엇이 아닌가)" 3항목 | ① fixtures 밖은 안 봄 ② 필터가 `annotations` 비배열까지 포함(6차 지적 반영 — `annotations-not-an-array` 가 실제로 refused 17건에 들어와 **측정된다**) ③ 스토어 **사이**의 사실·종단점 해소는 제외(C4·C7·C8 담당) — 셋 다 실측과 일치 | **정직** |
| README 남은 전제 2행 (`documentId` 평문의 진실성 · `yUpdateBase64` **내용**의 유효성) | 내가 이번에 만든 M1·M1b·M2 가 **정확히 이 두 행**이다. 즉 새 발견이 아니라 **미리 선언된 전제의 실제 값**이다 | **정직** (§5 는 그 전제의 수치를 채운다) |
| README "게이트가 문서 축을 닫은 **대가**" (문서 상태 없이 스토어만 쓰는 도구의 산출물이 전부 걸린다) | M6(v1 스토어 export)·N1 로 재현 — 대가가 실재하고 명시돼 있다 | **정직** |
| 코드/README "`GATE_BLIND_CODES` 로 표시해, 그런 스토어가 코퍼스에 들어오면 divergence 로 낸다" | M2 실측: **divergence 로 난다** — 문언은 참. 다만 그 이유는 표시 때문이 아니라 `editor.rejected !== gate.rejected` 가 **먼저** 갈리기 때문이다. `<gate-blind:…>` 규칙명 매핑은 어떤 경우에도 divergence 를 막지 못하고, 현재 코퍼스에 그 코드를 내는 스토어는 **0개**다 | **note** — 선언된 예외 경로가 사실상 무효·미측정(§7-1) |
| 자기보고 "C9 는 38 스토어 전수를 loadStore 로 대조하며(이전 1)" | 재측정 38 / 이전 1 — 일치 | 정확 |
| 자기보고 "negative control 4건 신설(24→28, 각 위반 1건)" | 재측정 28건, 전부 "exactly" 유지 | 정확 |
| 자기보고 "유일 델타는 gates.G5 파일 수뿐(92→130)" | **HEAD 대비**로는 델타가 3개(C2 문구·G3 해시·G5 71→130). C2·G3 는 **6차 wave 것**으로 직전 판정 §7 이 이미 기록했다. 직전 워킹트리 대비로는 자기보고가 맞다 | note — 기준점(HEAD vs 직전 워킹트리) 명시 필요, 실질 불일치 아님 |

**과장은 남아 있지 않다.** 6차에서 CONFIRMED 로 건 두 문구가 모두 실측에 맞게 좁혀졌고,
내가 이번에 만든 세 반례는 **README 가 이미 전제로 선언해 둔 자리**에 정확히 떨어졌다.

## 5. ★ 새 우회 창안 — 7건, (가)/(나) 분류

증거 스크립트: `docs/verify/plane-editor-document-axis-probe.mjs` (M0–M6, 전부 실제 세션·실제 게이트).

| # | 우회 | 게이트 | 진짜 `loadStore` | 분류 | 판정 |
|---|---|---|---|---|---|
| M0 | 대조군 — 정직한 스토어 | exit 0 · pass true · judged 1 · `documentState: readable` | accepted | — | 위양성 없음 |
| **M1** | `document.json` 의 `yUpdateBase64` 가 **해독 불가 base64**(JSON 은 멀쩡, 평문 id 는 일치) | **exit 0 · pass true · broken 0 · 종단점 묶임** · `documentState: readable` | **rejected** `document-state-unusable` | **(가) 조건부** | **CONFIRMED** — 게이트가 서명한 종단점을 편집기가 못 연다 |
| **M1b** | 유효 base64 이지만 디코드 결과가 Yjs 업데이트가 아님 | **exit 0 · pass true** | **rejected** `document-state-unusable` | **(가) 조건부** | **CONFIRMED** (M1 과 한 뿌리) |
| **M2** | 평문 `documentId` 는 스토어와 일치하는데 **CRDT 상태만 남의 문서**(스플라이스) | **exit 0 · pass true** | **rejected** `document-state-mismatch` | **(나) 경계 바깥** | **CONFIRMED(경계 안 아님)** — 두 파일을 손으로 합쳐야 도달 |
| M3 | `document.json` 이 **디렉토리** | **exit 1** `annotation-store-document-unreadable` · `documentState: absent` | rejected `document-state-absent` | — | 방어 작동(**우회 실패**) |
| M4 | `document.json` 이 **끊어진 심링크** | **exit 1** 같은 규칙 | rejected `document-state-absent` | — | 방어 작동 |
| M5 | `document.json` 이 JSON **배열**(객체 아님) | **exit 1** · `documentState: unparsable` | rejected `document-state-unparsable` | — | 방어 작동 |
| M6 | **v1 스토어**(종단점을 안 묶음)를 문서 상태 없이 export | **exit 1** `annotation-store-document-unreadable` + `annotation-store-unbound` | rejected `document-state-absent` | — | 방어 작동 (문서 축이 **모든 버전**에 돈다) |

### 브리프 요구 — (가) 가 나오면 **성질을 우회한 것인가, 성질이 못 보는 다른 축인가**

**둘 다 아니다 — 게이트의 한계이고, 성질은 그것을 본다.** 근거 셋:

1. **성질이 셋 다 잡는다**(§3 (4) 실측: 코퍼스에 심으면 C9 가 세 줄로 FAIL). 6차의 N2형과
   결정적으로 다르다 — 그때는 심어도 0 divergence 였다(오라클이 눈을 감았다).
2. **파일 이동만으로는 도달하지 않는다**(반증 시도 결과). 이동 계열은 전부 닫혀 있다:
   스토어만 이동(N1) · 남의 문서 옆으로 이동(N2c) · 문서 파일 모양 파괴(M3·M4·M5) · v1 export(M6).
   M1·M1b·M2 는 **`document.json` 의 내용을 쓰는 주체**를 요구한다.
3. **README 가 이 두 축을 남은 전제로 미리 선언**하고 있고("`yUpdateBase64` 의 **내용**이 유효한
   Yjs 업데이트다", "평문 `documentId` 가 그 문서 상태의 진짜 정체성이다"), 도달 경로까지 적었다.

(가) 로 분류한 M1·M1b 를 **조건부**라고 적은 이유: 손으로 정체성을 위조하지 않아도
**평면을 쓰는 다른/옛 도구·전송 중 페이로드 훼손**이면 도달한다(JSON 은 유효한 채 base64 만
망가지는 경로). 다만 이 도구 자신의 `saveStore` 는 저장 시 CRDT 정체성과 평문을 못 박으므로
(`src/store.mjs:206`), **이 편집기를 거친 파일에서는 발생하지 않는다.**

**피해의 성질도 다르다.** 6차에 차단 근거로 쓴 N1·N2·N6 과 달리, M1 계열은 오해소(앵커가 남의
텍스트에 붙음)를 만들지 않는다 — 편집기가 **로드 시점에 사유와 함께 거절**한다. 즉 "게이트 초록 →
빌드 실패"이지 "게이트 초록 → 조용한 오부착"이 아니다.

## 6. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 × 레인 1:1 | HEAD 와 동일 | **19 시나리오 × 3레인 = 57 셀 전부 동일**(`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong` 9필드 전수, 차이 **0**) |
| 집계 | 동일 | `totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures` **전부 identical**(HEAD 대비) |
| 전 레인 오해소 | 0 | **0** — 리포트 표가 아니라 원시 `trials[].lanes[].outcome` 재집계: **336 레인측정, `wrong` 0** |
| 반사실(막은 오해소) | 유지 | textmove **36** · phase1 **74** · naive **76** (불변) |
| 진단 | 유지 | D1–D6 **6개 → 6개**, 추가·삭제 0 |
| `suite-result.json` HEAD 대비 | 이번 델타만 | `gates.C2`(문구 6→7모양, **6차 것**) · `gates.G3`(payload 해시) · `gates.G5`(71→**130** 파일). scenarios/lanes/totals 는 한 값도 안 변함 |
| 결정성 (앵커 스위트) | 3회 byte-identical | **3회 동일**, 그리고 **재실행 전 디스크본과도 동일**(`4e989e64…` 등) |
| 결정성 (링크) | 3회 동일 | `run-link-checks.mjs` 3회 `12da94a5…` · `check_links.py --format json` 3회 `8a04ae12…` |
| 링크 스위트 | 전수 | **66/66 ok · PASS** (직전 57/57) — 단, §7-3 의 병행 lane 조건 아래 |
| 링크 negative control | 전수 FAIL 유지 | **28/28** exit 1 + **위반 정확히 1건** (직전 24/24) |
| 링크 positive control | PASS | link-store · control fixture · 실제 `sample-state`(v3, 6 record, `doc-sample-state`) |
| fixture 문서 생성기 | 0 differ | `make-fixture-documents.mjs --check` **PASS — 0 file(s) differ** |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 **130파일 · 위반 0** (ASCII 401216 · 한글 46875) |
| 경계 (담당 경로) | lane 밖 저작 0 | 이 wave 의 쓰기는 전부 `tools/plane-editor/**` + developer 자기 메모리. `tools/` 아래 lane 밖 변경분(`lint_uniformity.py`·`ontology_lib.py`·`retrieve.py`·`materialize.py`·신규 `measure_links.py`)은 **mtime 이 이 wave 밖**(19:24–22:32, 병행 lane)이고, **현재 tools 층 + HEAD ontology 조합에서 링크 스위트가 66/66 PASS** 이므로 이 lane 의 산물이 아님이 반사실로 확인된다 |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch 사본. `git status -- tools/plane-editor` **70 항목 불변**, §1 해시 불변 |

## 7. 비차단 관측

1. **`GATE_BLIND_CODES` 는 사실상 무효이고 미측정이다.** C9 은 `editor.rejected !== gate.rejected`
   를 **먼저** 보므로, 게이트가 볼 수 없는 코드라도 divergence 가 난다(M2 실측). `<gate-blind:…>`
   규칙명 매핑이 divergence 를 막는 경우는 존재하지 않고, 현재 코퍼스에 그 코드를 내는 스토어는
   **0개**다 — 선언만 있고 한 번도 돌지 않는 경로다.
2. **선언된 전제는 fixture 로 커밋할 수 없다.** M1·M1b·M2 를 negative control 로 넣으면 스위트가
   **영구 red** 가 된다(게이트에 대응 규칙이 없으므로). 그래서 README 의 "남은 전제 2행" 은
   지금 **주장이지 측정이 아니다.** `expectedDivergence` 같은 별도 부류를 두면 전제도 매 실행
   측정되고, 전제가 조용히 넓어지는 것도 막힌다(§8 불변식 3).
3. **★ 워킹트리의 링크 게이트가 지금 red 다 — 원인은 이 lane 이 아니다.**
   `check_links.py --store tools/plane-editor/link-store` 가 현재 **exit 1**,
   위반은 `vocabulary-provenance` × 2 (`ho:alternativeOf`, `ho:overlapsWith` — "link type claims to
   reuse graph vocabulary but is not declared as an owl:ObjectProperty in the TBox"). 이것이
   `run-link-checks.mjs` 를 66/66 → **29 ok / 37 FAIL** 로 무너뜨린다(negative control 28건이
   "expected exactly" 를 잃는다). **귀속(반사실)**:

   | 조합 | 결과 |
   |---|---|
   | 현재 tools + 현재 `ontology/` | **FAIL** (37) |
   | 현재 tools + **HEAD `ontology/`** | **66/66 PASS** |
   | HEAD tools + HEAD `ontology/` | 66/66 PASS |

   → 원인은 **병행 ontology lane 이 TBox 에서 두 ObjectProperty 를 은퇴시킨 것**이다
   (`ontology/tbox/harness.ttl`, 이 세션 중 22:27 수정; HEAD 에는 둘 다 선언돼 있다).
   **`validate.py` 는 이것을 보지 못한다**(PASS) — 링크 스토어가 `ontology/` 밖이기 때문이다.
   커밋 전에 라우팅이 필요하다: 링크 스토어의 `ho:alternativeOf`/`ho:overlapsWith` 사용을
   후속 어휘로 옮기거나, TBox 은퇴를 되돌리거나. **이 wave 의 결함이 아니므로 착수 차단
   조건에는 넣지 않았다.**
4. **negative control 이 실제 저장소·TBox 와 결합돼 있다**(6차 관측이 이번에 **실제로 터졌다**).
   28개 대조군이 전부 "정확히 1건" 을 요구하는데, repo 그래프에서 온 위반 하나가 28개를
   동시에 무의미하게 만든다. 대조군 판정에서 그래프-유래 위반을 분리하면 이 결합이 끊긴다.
5. **N3(sniff 4KB 예산)·N5(`legacy: []`) 는 이번에도 그대로다.** N3 은 여전히 exit 0
   (`"version"` at byte 8326, 레코드 9개) — README 가 전제로 명시한 값이다. N5 는 게이트가 더
   엄격해진 방향(`annotation-record-unbound` + `annotation-record-unloadable`, 편집기는 accept)이라
   거짓 초록이 아니다.
6. **`counts.graphNodes`·`counts.annotationRecordsRead` 관측은 유효**(전자는 시점 의존, 후자는
   구조적 항진명제라 "건너뜀 없음"의 근거가 못 된다). 이번 wave 는 근거를 **위반 규칙**에 두었으므로
   실질 문제는 없다.

## 8. ★ 최종 판정 — 실제 바인딩 착수 가능한가

**결론: (a) 가능. 차단 조건 0개.**

> 판단 기준은 브리프대로 **조건 ①② 충족 + 성질의 정직성**이다.
> **조건 ①** — N1·N2·N6 3모양 전부 exit 1, 편집기 답과 일치, negative control 4건 신설(28/28
> "exactly"), 역패치로 인과 분리. 조건이 요구한 것보다 넓게 닫혔다(M3–M6).
> **조건 ②** — 성질의 편집기 쪽이 **진짜 `loadStore`** 다(코드로 확인 + 스토어마다 `loadStore`
> 호출로 교차검증). `loadStore` 로 대조되는 스토어 **1 → 38**, 문서 축 코퍼스 **0 → 4**,
> 내 N2형 fixture 가 그 축으로 판정되고(0→5) 방어를 되돌리면 **정확히 그 fixture 가 divergence**
> 로 튀어나온다. 자기검사는 항진명제가 아니다(옛 오라클로 되돌리면 세 체크가 이름을 대며 FAIL).
> 그리고 결정적으로, **내가 이번에 처음 창안한 세 반례(M1·M1b·M2)를 성질이 전부 잡는다** —
> 6차에는 잡지 못했다. 성질의 적용 범위가 사례 표를 실제로 넘어섰다.
> **정직성** — 6차 CONFIRMED 2건이 실측에 맞게 좁혀졌고, 내가 새로 만든 반례들은 README 가
> **이미 전제로 선언한 자리**에 떨어졌다. 새로 걸 CONFIRMED 문구는 없다.
>
> 남은 것(M1·M1b = 문서화된 전제 · M2 = 경계 바깥 · N3 = 문서화된 전제 · §7-3 = 병행 lane)은
> 브리프 지시대로 **차단 연장 근거로 쓰지 않는다.** M1 계열은 오해소를 만들지 않고 로드 시점에
> 사유와 함께 거절되는 방향이며(거짓 초록 → 빌드 실패, 조용한 오부착 아님), 6차에 차단 근거였던
> "이동만으로 도달하는 거짓 초록" 계열은 이번에 전부 닫혔다.
>
> **직전 판정의 조건 2개는 해제한다.**

### 바인딩 wave 가 지켜야 할 불변식 (3개)

| # | 불변식 | 지금 값 (실측) | 충족 기준(수치) |
|---|---|---|---|
| **1** | **바인딩은 `loadStore` 가 연 스토어에만 건다.** 게이트 exit 0 는 필요조건이지 충분조건이 아니다 | 게이트가 M1·M1b·M2 를 **exit 0 · pass true · 종단점 묶임**으로 서명하는데 `loadStore` 는 셋 다 거절 | 종단점을 묶는 코드 경로가 스토어당 `loadStore`(또는 `inspectStore`) 를 **1회 호출**하고, 거절 시 그 스토어에서 바인딩 **0** · 사유를 판정 JSON 에 기록 |
| **2** | **문서·레코드 축의 규칙은 편집기와 게이트에 동시에 추가한다.** 한쪽만 늘리면 C9 가 그 자리에서 FAIL 한다 | 코퍼스 38 · divergence **0** · `loadStore` 대조 **38** · 문서 축 **4** | 바인딩 wave 종료 시 **divergence 0** · `loadStore` 대조 스토어 수 **= 코퍼스 크기** · 문서 축 코퍼스 **≥ 4** 유지(줄면 축이 다시 안 보인다) |
| **3** | **선언된 전제도 매 실행 측정한다.** 전제가 문장으로만 남으면 조용히 넓어진다 | M1·M1b·M2 를 fixture 로 넣으면 스위트가 **영구 red** → 전제 2행이 **주장이지 측정이 아님**. `GATE_BLIND_CODES` 는 발화 0회 | `expectedDivergence` 부류 **≥ 3**(평문/CRDT 어긋남 · `yUpdateBase64` 내용 무효 · 그 대조군)이 매 실행 측정되고, **그 부류 밖 divergence 는 0** |
