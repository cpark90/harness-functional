---
verdict: pass-with-notes (조건부 착수 가능 — 조건 2개)
scope: tools/plane-editor — fail-closed 게이트 · **게이트–편집기 동치 성질**(C9) · 발견 회피 2종(Y2b·Y3) · 완결성 문구 정정
criteria: 직전 판정 `docs/verify/plane-editor-binding-invariants-verify.md` §10 의 **착수 조건 3개(수치 그대로)** + 브리프 무회귀 조건
baseline: 현재 워킹트리 (HEAD `cd4bb5d` 는 이 lane 의 중간 상태 — §0)
re-measured: 조건1 4모양 · negative control 24/24 · 조건2 Y2b/Y3 · 조건3 문서 · 성질(자동포함·teeth·비공허) · 역패치 2건 · 무회귀 19×3 · 게이트 3종
new-confirmed: **N1 · N2 · N6** — 게이트의 문서 정체성 대조가 **fail-open** 한다(옆 `document.json` 이 없음 / 평문 `documentId` 없음 / 파싱 불가 → 대조 자체를 건너뛰고 종단점을 묶는다). 세 모양 전부 **게이트 exit 0 · pass true · broken 0 · 링크 해소**인데 **진짜 `loadStore` 는 그 스토어를 열지 못한다**. 그리고 **성질(C9)이 이 축을 보지 못한다** — fixture 로 넣어도 divergence 0 (실증)
observed: N3(sniff 4KB 예산 밖으로 밀린 `"version"` → 이름 바꾼 쌍둥이가 다시 은폐) · N5(`anchors.legacy: []` = JS truthy/Python falsy → 게이트만 거절) · `counts.annotationRecordsRead` 자기검사는 구조상 발화 불가
declared-outside: H2(손 기입 documentId) · B5(유효 capture 이식) · Z1(죽은 이름표 padding) · 남의 documentId 로 새 문서 — **차단 사유로 쓰지 않음**
---

# plane-editor 게이트–편집기 동치 **성질** 판정 (vnv, 6차)

## 0. 이 판정이 무엇을 기준으로 재는가

- **기준은 직전 판정이 스스로 적은 수치다.** `docs/verify/plane-editor-binding-invariants-verify.md`
  §10 표의 조건 1·2·3 을 문언 그대로 적용했다(완화 없음, 새 기준 추가 없음). 이번 판정의 **본체**는
  브리프가 지정한 대로 "게이트–편집기 동치가 **열거가 아니라 성질**인가"이며, 새 발견은 §5 에 따로 낸다.
- **형상 주의(브리프 지시 확인).** HEAD `cd4bb5d` 의 `tools/plane-editor/src/` 에는 이번 계약 모듈이
  없다(`git show HEAD:tools/plane-editor/src/store-contract.mjs` → 부재). **모든 측정은 현재
  워킹트리 기준**이며, HEAD 는 무회귀 1:1 대조의 baseline 으로만 썼다(§7). 측정 중 대상 파일이
  바뀐 정황은 없었다 — 재실행 전/후 해시가 전부 동일하다(§1).
- developer 자기보고는 **판정 대상**으로만 썼다. 아래 모든 수치는 내가 다시 잰 값이다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`.

## 1. 실행한 명령과 산출물 (재현 절차)

```
# 재실행 전 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,README.md,\
run-link-checks.mjs} tools/plane-editor/src/{store.mjs,store-contract.mjs} tools/plane-editor/sample-state/*.json

node tools/plane-editor/run-link-checks.mjs                       # 57/57 PASS
node tools/plane-editor/run-suite.mjs                             # ×3 (별 프로세스)
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json  # ×3

# vnv 기존 프로브 — **무수정** 재실행 (조건 1·2 재측정)
VNV_SCRATCH=<scratch>/x-probe node docs/verify/plane-editor-binding-invariants-adversarial.mjs
/usr/bin/python3 docs/verify/plane-editor-binding-invariants-link-probe.py <scratch>/y-probe

# vnv 신규 프로브 (이번 판정)
VNV_SCRATCH=<scratch>/parity node docs/verify/plane-editor-parity-probe.mjs

# 성질 실험 — 트리 사본에 fixture 를 심고/역패치를 걸어 돌린다 (원본 무수정)
rsync -a --exclude node_modules tools/ <scratch>/copyN/tools/ ; ln -s <repo>/tools/plane-editor/node_modules …
mkdir <scratch>/copyN/.git ; node <scratch>/copyN/tools/plane-editor/run-link-checks.mjs

# repo 게이트
/usr/bin/python3 tools/validate.py ; /usr/bin/python3 tools/check_determinism.py ; /usr/bin/python3 tools/lint_uniformity.py
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 프로브·실험 **후** |
|---|---|---|---|
| `suite-result.json` | `1df3a40a…` | 동일(3회) | 동일 |
| `REPORT.md` | `d07be017…` | 동일 | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일 | 동일 |
| `sample-state/{annotations,document}.json` | `d62ecfea…` / `3d2146f9…` | 동일 | 동일 |
| `check_links.py --format json` (link-store) | — | 3회 **`b5f67394…`** 동일 | 동일 |

즉 **트리에 실린 표 = 내가 재생산한 표**이고, 내 실험은 전부 scratch 사본에서 돌아 트리를
오염시키지 않았다(`git status -- tools/plane-editor` 항목 수 52 로 불변, 내가 만든 파일은
`docs/verify/` 2개뿐: 이 리포트 + `plane-editor-parity-probe.mjs`).

## 2. 착수 조건 3개 재측정 (직전 판정의 수치 그대로)

### 조건 1 — 게이트가 건너뛰는 모양이 없다

기준: **4모양 전부 exit 1** · negative control **4건**(각 위반 정확히 1건) · X 프로브 4행
`divergence: false`.

`docs/verify/plane-editor-binding-invariants-adversarial.mjs` **무수정** 재실행:

| 모양 | 편집기 `loadStore` | 게이트 | `divergence` | 직전 값 |
|---|---|---|---|---|
| X1 정직한 스토어를 남의 문서 옆으로 이동 | rejected | **exit 1** `annotation-store-document-mismatch` | false | exit 0 · pass true |
| X2a `id` 가 숫자 | rejected | **exit 1** `annotation-record-unloadable` | false | exit 0 · pass true |
| X2b `id` 없음 | rejected | **exit 1** `annotation-record-unloadable` | false | exit 0 · pass true |
| X2c 레코드가 객체 아님 | rejected | **exit 1** `annotation-record-unloadable` | false | exit 0 · pass true |

negative control: `run-link-checks.mjs` C4 가 **24건**(직전 20건)으로, 신규 4건
(`record-id-not-a-string` · `record-id-missing` · `record-not-an-object` · `document-mismatch`)이
각각 **exit 1 + 위반 정확히 1건**. 24/24 전부 "expected exactly [규칙]" 을 유지한다. **조건 1 충족.**

### 조건 2 — 격리·이름이 끊김을 가리지 못한다

기준: Y2b 재현 시 exit 1 또는 최소 broken 1 · Y3 에서 빠진 후보가 판정 JSON 에 남을 것.

`docs/verify/plane-editor-binding-invariants-link-probe.py` **무수정** 재실행:

| 케이스 | 직전 값 | 지금 값 |
|---|---|---|
| Y2a 쌍둥이(인자 없음) | exit 1 · broken 1 | exit 1 · broken 1 · 2 스토어 판정 |
| **Y2b 격리 표식 한 줄** | **exit 0 · broken 0** | **exit 1 · broken 1** · 2 스토어 판정 · `quarantined` 에 그 디렉토리가 기록됨 |
| **Y3 이름만 바꾼 쌍둥이** | exit 0 · `outOfScope`/`quarantined` 둘 다 빈 배열(흔적 없음) | **exit 1 · broken 1** · `annotations-backup.json` 이 **판정 대상으로** 끌려옴(기준보다 강함) |
| Y4b 작업공간 밖 | exit 0 · broken 0 | exit 0 · broken 0 (변화 없음 — 문서화 대상) |
| Y5 스토어 아닌 `annotations.json` | exit 2 | exit 2 (fail-closed 비용 유지) |

C10 이 같은 사실을 스위트 안에서 매 실행 실측한다(대조군 1 + Y2b + Y3 + Y4b + 옮겨진 스토어
= 6행 전부 ok). **조건 2 충족.**

### 조건 3 — 발견의 전제를 문서가 수치로 밝힌다

기준: 두 문장에 전제 3개(파일 이름 · 격리 표식 · `workspaceRoot`) + Y4b 실측 병기.

- `README.md` "발견의 전제" 절이 **3행 표**로 신설됐고, 앞 두 행은 "완화됨"(닫힌 근거: vnv Y3 · Y2b),
  세 번째 행이 **남아 있는 전제**로 Y4b 를 이름과 함께 적고 실측치(`exit 0 · broken 0`,
  `workspaceRoot: null`)를 병기한다. 강화의 **대가**(백업 파일도 이제 duplicate-document)도 같은 행에 있다.
- `README.md` 신뢰 경계 절 머리에 **"이 표는 '안쪽은 전부 막는다'는 뜻이 아니다(정정)"** 가 들어갔고,
  `REPORT.md` §13 도 **"'전부'라고 적지 않는다"** 로 바뀌었다.
- 안쪽 표의 "한쪽만 게이트에 물리기" 행은 "**전제 셋** 안에서"로 한정됐다.

**조건 3 충족** (다만 이 문서화 자체에 §6 의 정직성 지적 2건이 남는다 — 비차단).

## 3. ★ 본체 — 성질이 **성질**인가

성질의 구현은 `run-link-checks.mjs` C9 이고, 대조하는 두 쪽은
**editor = `src/store-contract.mjs annotationStoreContract(payload, {documentId})`**,
**gate = `check_links.py` 가 그 경로에 매긴 `PER_STORE_GATE_RULES` 위반**이다.
브리프가 물은 네 가지를 각각 실험으로 답했다.

### (1) 새 fixture 가 **자동으로 포함**되는가 → 그렇다 (실증)

트리 사본(`<scratch>/copy1`)에 **내가 직접 만든** fixture 하나를 넣었다 —
`annotation-stores/vnv-legacy-empty/annotations.json`, v3, `anchors: {document: null, legacy: []}`.
`[]` 는 **JS 에서 truthy, Python 에서 falsy** 라 두 층이 갈리는 자리다.

```
33 store(s) scanned, 0 divergence           # 심기 전
FAIL … (34 store(s)): …/vnv-legacy-empty/annotations.json: editor [accepted] vs gate [annotation-record-unloadable]
```

- 코퍼스가 33 → **34** 로 자동 증가했고(디렉토리 재귀 훑기), 내가 심은 모양에서 **성질이 FAIL** 했다.
- 즉 성질은 **열거된 케이스 목록이 아니다**. 사례 표(negative control 24건)와 독립적으로 작동한다.

### (2) 성질을 **우회하는 fixture 배치**가 가능한가 → 세 가지 있다

| 배치 | 코퍼스 | 결과 |
|---|---|---|
| `fixtures/` **밖**(예: `link-store/vnv-outside/annotations.json`)에 같은 divergent 스토어 | 33 (불변) | 성질은 못 본다. 다만 **발견**이 그 스토어를 판정해 스위트가 다른 데서 32건 FAIL — 즉 성질만 피할 뿐 조용하지는 않다 |
| `fixtures/` 안이지만 payload 가 `looksLikeStore` 밖(`annotations` 가 배열이 아님) | 33 (불변) | 성질도, 스위트도 **아무 말이 없다**(57/57 PASS). 계약 코드 `annotations-not-an-array` 는 코퍼스 필터에 걸려 **한 번도 측정되지 않는다** |
| 확장자가 `.json` 이 아님 | 33 (불변) | 코퍼스에서 빠진다(편집기도 그 이름을 열지 않으므로 층간 불일치는 아님) |

두 번째가 실질 구멍이다: **성질의 코퍼스 필터가, 계약의 첫 규칙이 겨냥하는 모양을 정확히 걸러낸다.**
(심각도는 낮다 — 그런 파일이 작업공간에서 `annotations.json` 이름으로 있으면 게이트가 exit 2 로 멈춘다.)

### (3) 성질이 **공허하게 참**은 아닌가 → 아니다 (양쪽 다 accept 하는 대조군 22개)

코퍼스 33 중 **거절 11 · accept 22**(내가 계약 함수로 직접 재계산 — C9 의 vacuity 가드는 `>= 4`).
accept 쪽에는 정직한 `fixtures/link-plane/control/annotations.json` 과 **실제
`sample-state/annotations.json`** 이 들어 있고, 후자는 **진짜 `loadStore`** 로도 대조된다
(C9 세 번째 검사: `sample-state loads (v3, 6 record(s))` + 계약 문제 0). 브리프가 요구한
"최소 1개의 정상 스토어가 양쪽 accept 로 통과하는 대조군"은 충족(실제로는 22개).

### (4) 성질이 **인과적으로 작동**하는가 → 역패치 2건 모두 성질이 잡는다 (§4)

### (5) ★ 그러나 성질의 **편집기 쪽은 진짜 편집기가 아니다** — 이 축이 뚫린다

C9 은 편집기 쪽 답을 `annotationStoreContract(payload, {documentId: documentStateId(storePath)})`
로 구한다. `documentStateId` 는 **옆 `document.json` 의 평문 필드** — 즉 **게이트가 보는 바로 그
입력**이다. 진짜 `loadStore` 는 정체성을 **CRDT 상태**에서 읽고, 그 전에 `document.json` **파일
자체**를 요구한다. 두 입력이 갈리는 곳에서 성질은 구조적으로 눈을 감는다.

실측 — 내가 만든 **N2형 fixture**(문서 A 의 정직한 스토어를 문서 B 의 디렉토리에 두고, 그
`document.json` 에서 평문 `documentId` 만 없앤 것)를 `fixtures/` **안에** 심었다:

```
real loadStore  : rejected  (store contract: annotations.json claims document "doc-1" …)
C9              : ok  every store … (34 store(s)) — 34 store(s) scanned, 0 divergence
suite           : 57/57 checks ok   (PASS)
```

**진짜 편집기가 거절하는 스토어가 성질의 코퍼스에 들어와 있는데 성질은 "0 divergence" 를 낸다.**
게다가 코퍼스 33 중 옆에 `document.json` 이 있는 스토어는 **2개뿐**이고(`document-mismatch`,
`sample-state`), 진짜 `loadStore` 로 대조되는 스토어는 **1개**(`sample-state`)다. 이번 wave 의
간판 수정(X1)이 사는 축이 바로 이 축이므로, **X1 의 닫힘은 성질이 아니라 fixture 1개 + C10 1행이
지키고 있다.**

**판정**: 성질은 자기가 선언한 축(payload 계약)에서는 **성립한다**(자동포함 O · teeth O · 비공허 O).
그러나 README·REPORT 가 내건 문언("게이트 accept ⟺ 편집기 accept", "새 변종은 자동으로 잡힌다")의
범위 안에 **성질이 볼 수 없는 일상 경로 계열**이 있다 → 브리프 분류에 따라 **성질 구현 결함(CONFIRMED)**.

## 4. 인과 — 역패치 반사실

트리 사본에서 **한 곳씩** 수정 전으로 되돌렸다(`<scratch>/copy2`, `copy3`).

| 되돌린 것 | X2 3모양 | X1(document-mismatch) | 성질(C9) | 사례 대조군(C4) |
|---|---|---|---|---|
| (없음) 현재 트리 | exit 1 · `annotation-record-unloadable` | exit 1 · `annotation-store-document-mismatch` | 33 · **0 divergence** | 24/24 |
| **(i) fail-closed 제거** (`_record_shape` 거절 → 조용한 skip) | **exit 0 · pass true** (3모양 전부) | exit 1 (유지) | **FAIL** — 3건 divergence(`editor [record-id-missing] vs gate [accepted]` 등) | 3건 FAIL |
| **(ii) `document.json` 대조 제거** (`_document_state_id` 비교 삭제) | exit 1 (유지) | **exit 0 · pass true** | **FAIL** — 1건 divergence(`editor [store-document-mismatch] vs gate [accepted]`) | 1건 FAIL + C10 (4) FAIL |

- 두 방어의 **인과가 각각 분리돼 확인**됐고, **성질이 두 회귀를 독립적으로 잡는다**(사례 대조군과
  중복이지만, 사례를 지워도 성질이 남는다는 것이 요점).
- 부수 실측 — **`counts.annotationRecordsRead` 는 skip 을 탐지하지 못한다.** 역패치 (i) 에서
  게이트는 `exit 0 · pass true` 인데 `annotationRecordsRead` 는 **7 로 동일**했다. 코드상
  `accounted += 1` 이 모양 검사 **앞**에서 돌므로 자기검사 `accounted != total` 은 **발화할 수 없다**
  (구조적 항진명제). "건너뜀 상태가 남지 않는다"를 실제로 보장하는 것은 **위반(`annotation-record-unloadable`)**
  이지 그 카운터가 아니다 → §6 문구 항목.

## 5. ★ 새 우회 창안 — 6건, (가)/(나) 분류

증거 스크립트: `docs/verify/plane-editor-parity-probe.mjs` (N0–N6, 전부 실제 세션·실제 게이트).

| # | 우회 | 실측 | 분류 | 판정 |
|---|---|---|---|---|
| **N1** | 스토어만 옮긴다 — **`document.json` 없이** `annotations.json` 만 다른 디렉토리로(내보내기·백업·부분 체크아웃·`document.json` 을 gitignore) | 게이트 **exit 0 · pass true · broken 0 · 링크 해소** / 진짜 `loadStore` **ENOENT 로 거절** / C9 편집기 쪽 **accepted** | **(가) 일상 경로** | **CONFIRMED** — 게이트가 서명한 종단점을 **어떤 편집기도 열 수 없다** |
| **N2** | 옮긴 자리의 `document.json` 에 **평문 `documentId` 가 없다**(옛 saveStore 산출·다른 도구가 쓴 문서 상태) | 게이트 **exit 0 · pass true** / `loadStore` **거절**(`claims document "doc-3" but the persisted document state says otherwise`) / C9 **accepted** | **(가)** | **CONFIRMED** — X1 방어가 평문 필드 **존재**에만 의존한다 |
| **N2c** | (N2 대조군) 같은 이동, `document.json` 이 평문 필드를 그대로 가짐 | 게이트 **exit 1** `annotation-store-document-mismatch` / `loadStore` 거절 | — | 방어 작동(대조군) |
| **N6** | 옮긴 자리의 `document.json` 이 **깨진 JSON**(병합 중 잘림) | 게이트 **exit 0 · pass true** / `loadStore` 거절 / C9 **accepted** | **(가)** | **CONFIRMED** — 읽기 실패가 **fail-open** (`_document_state_id` 가 `None` 반환) |
| **N3** | 이름 바꾼 쌍둥이 + 키 정렬 직렬화(`sort_keys`)로 `"version"` 이 **머리 4096 바이트 밖**으로 밀림 (레코드 9개면 byte 8326) | 게이트 **exit 0 · broken 0 · 1 스토어만 판정** = Y3 은폐 부활 / 대조군 N3c(패딩 없음, `"version"` byte 4)는 **exit 1 · broken 1 · 2 스토어** | (가) 조건부 — 다른 직렬화기·큰 스토어가 필요 | **관측** — README 가 "머리 4KB 안에 두 키" 를 **전제로 명시**함(§6 정직성 참조) |
| **N4** | 작업공간 **루트**에 격리 표식 한 장 | 정직한 스토어까지 함께 빠지고 종단점이 해소되지 않아 **exit 1** `record-endpoint-missing`(`excluded: 2` 가 JSON 에 기록됨) | (가) | 방어 유지(**우회 실패**) |
| **N5** | `anchors.legacy: []` (JS truthy / Python falsy) | 게이트 **exit 1** (`annotation-record-unloadable`) / 진짜 `loadStore` **accepted** | (나) 경계 — 손·외부 도구가 써야 도달 | **관측(경미)** — 방향이 안전(거짓 초록 아님). fixture 를 넣으면 성질이 잡는다(§3 (1)) |

**(가) 로 분류한 것 중 CONFIRMED 는 N1 · N2 · N6 세 건이고, 셋은 한 뿌리다:**
게이트의 문서 정체성 대조는 **fail-open**(옆 문서 파일이 없거나·필드가 없거나·읽히지 않으면 대조를
**건너뛰고** 종단점을 묶는다). 편집기는 같은 조건에서 **fail-closed**(문서 파일이 없으면 열지 못하고,
CRDT 정체성과 어긋나면 거절). 이 wave 가 세운 **fail-closed 원칙**(해석 못 한 레코드는 위반)이
레코드 축에는 적용됐지만 **문서 축에는 적용되지 않았다.**

브리프의 요구대로 (가) 셋을 재분류한다 — **성질을 우회한 것인가, 성질이 못 보는 다른 축인가?**
→ **성질을 우회한 것이다(성질 구현 결함).** 근거: (a) 세 모양은 성질의 문언("게이트 accept ⟺
편집기 accept")의 **반례**다. (b) 성질의 **코퍼스 안에 넣어도** 잡히지 않는다(§3 (5) 실증: 34 스토어,
divergence 0, 스위트 PASS). (c) 원인이 코퍼스 부족이 아니라 **오라클 선택**이다 — 성질이 편집기
쪽에 게이트와 **같은 입력**을 먹인다.

## 6. 문구 정직성 — 정정된 부사가 실측과 맞는가

| 문구 | 실측 | 판정 |
|---|---|---|
| README "이 표는 '안쪽은 전부 막는다'는 뜻이 아니다(정정)" / REPORT "'전부'라고 적지 않는다" | 직전 판정이 CONFIRMED 로 건 완결성 부사가 실제로 제거됐고, 목록 대신 성질로 주장이 옮겨졌다 | **정정 이행됨** |
| README 발견의 전제 3행 + Y4b 실측 | Y4b 재현치와 일치(`exit 0 · broken 0`, `workspaceRoot: null`), C10 이 매 실행 잰다 | **정직** |
| README "게이트는 … 평문 필드를 견준다. **파일을 옮기는 것만으로 도달하는 어긋남은 이것으로 닫히지만(X1)**, 그 필드를 손으로 고치는 것은 경계 바깥" | **반증됨**: N1·N2·N6 은 전부 "파일을 옮기는 것만으로 도달" 하고 **닫히지 않는다**(exit 0). 손으로 고치는 것도 아니다 | **CONFIRMED** — 경계 문장이 실측보다 넓다(결함이 이 문장 뒤에 가려진다) |
| REPORT §13 "그 성질이 서면 **새 변종은 자동으로 잡힌다**" | 자동으로 잡히는 것은 **새 fixture**(그것도 payload 축에 한해)이지 새 **변종**이 아니다. N2형은 fixture 로 넣어도 안 잡힌다 | **CONFIRMED(문구 과장)** — "fixture 를 넣으면 payload 축에서 잡힌다"로 좁혀야 함 |
| README 발견 전제 1행 "남는 전제 셋 … 셋 다 편집기가 **열지 않는** 파일에만 해당하므로 층간 불일치는 만들지 않지만" | 층간 불일치는 안 만드는 것이 맞다. 그러나 Y3 의 원래 피해는 **끊긴 종단점 은폐**이고 N3 이 그 피해를 그대로 재현한다(exit 0 · broken 0) | note — 문장이 잔여 위험을 **덜 심각한 축으로** 옮겨 적는다. 실측치 병기 권고 |
| README/자기보고 "`counts.annotationRecordsRead` 로 '건너뜀' 상태가 남지 않게" | 역패치 (i)에서 skip 이 되살아나도 그 값은 **7 로 동일**했고 자기검사는 발화하지 않는다(구조상 불가) | note — 카운터는 근거가 아니다. 근거는 위반 규칙 |
| REPORT/README "성질 … fixture 스토어 **전수**" | 전수의 정의는 `fixtures/**.json` 중 `looksLikeStore` 통과분(33). `annotations` 가 배열이 아닌 모양은 계약 규칙이 있는데도 **한 번도 측정되지 않는다** | note — "전수" 의 범위를 코퍼스 필터와 함께 적을 것 |

## 7. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 × 레인 1:1 | HEAD 와 동일 | **19 시나리오 × 3레인 = 57 셀 전부 동일**(`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong` 9필드 전수, 차이 **0**) |
| 집계 | 동일 | `totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures` **전부 identical**(HEAD 대비) |
| 전 레인 오해소 | 0 | **0** — 리포트 표가 아니라 원시 `trials[].lanes[].outcome` 재집계: **336 레인측정, `wrong` 0** |
| 반사실(막은 오해소) | 유지 | textmove **36** · phase1 **74** · naive **76** |
| `suite-result.json` HEAD 대비 변화 | 이번 델타만 | `gates.C2`(requirement 문구 6→7모양) · `gates.G3`(payload 해시) · `gates.G5`(71→92 파일) · `diagnostics.D4/D6` — **scenarios/lanes/totals 는 한 값도 안 변함**. D4·D6 델타는 **직전 wave 것**(직전 판정 §9 가 이미 기록) |
| 스위트 게이트 | 전부 pass | G1·G2·G3·G5 PASS, C1·C1b·C2·C3 PASS (G4 external) |
| 링크 스위트 | 전수 | `run-link-checks.mjs` **57/57 ok · PASS**(직전 44/44) |
| 링크 negative control | 전수 FAIL 유지 | **24/24** exit 1 + **위반 정확히 1건** |
| 링크 positive control | PASS | link-store · control fixture · 실제 `sample-state`(v3) exit 0 |
| 결정성 | 3회 byte-identical | 스위트 3회 + 재실행 전 디스크본 동일 · `check_links.py` 3회 **`b5f67394…`** 동일 |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 위반 0(92파일) + **내 전수 스캔**(99파일, node_modules·package-lock 제외): 한글·영어 밖 **문자체계 0**(검출된 `§ ≥ ≤ ≠ ∈` 는 조판·수학 기호) |
| 경계 (담당 경로) | lane 밖 저작 0 | 이 wave 의 쓰기는 전부 `tools/plane-editor/**`(mtime 창 기준 19파일) + developer 자기 메모리. 게이트가 남의 lane 에서 읽는 것은 `tools/{ontology_lib,lint_uniformity}.py` 둘뿐이고 **둘 다 미변경**. 병행 lane 이 고친 `tools/{materialize,retrieve}.py` 는 `check_links.py` 가 **import 하지 않는다**(등장 2회 모두 주석) |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch 사본. 모든 실행 후 §1 해시 불변, `git status -- tools/plane-editor` 52 항목 불변 |

## 8. ★ 최종 판정 — 실제 바인딩 착수 가능한가

**결론: (b) 조건부 — 착수 가능. 조건 2개(수치).**

> 판단 기준은 브리프대로 "새 사례가 없다"가 아니라 **"성질이 성립하고 전제가 문서화됐다"** 이다.
> 성질은 **자기 축에서 성립한다**(자동 포함 33→34 실증 · 역패치 2건을 각각 잡음 · 대조군 22개로 비공허).
> 전제도 문서화됐다(발견 3전제 + Y4b 실측 + 강화의 대가). 직전 조건 3개는 **전부 충족**이다.
> 그러나 성질의 **문언 안쪽**에 성질이 못 보는 일상 경로가 남아 있고(N1·N2·N6), 그것은 게이트가
> **거짓 초록**을 주는 계열이다 — 링크 종단점이 "묶였다"고 서명되는데 그 스토어를 열 수 있는
> 편집기가 없다. 바인딩 작업이 의존하는 바로 그 보증이므로 (a) 전면 해제는 아직 이르다.
> (c) 유지도 부당하다: 새 **오해소**(앵커가 남의 텍스트에 붙음)는 이번에도 (가) 경로에서 한 건도
> 만들지 못했고, 두 결함 다 게이트 안에서 닫히는 국소 수정이다.

| # | 조건 | 지금 값 (실측) | 충족 기준(수치) |
|---|---|---|---|
| **1. 문서 정체성 대조가 fail-open 하지 않는다** | N1(문서 파일 없음)·N2(평문 `documentId` 없음)·N6(파싱 불가) **3모양 전부 게이트 exit 0 · pass true · broken 0 · 링크 해소**, 진짜 `loadStore` 는 3모양 전부 거절 | 3모양 전부 **exit 1**(v3 스토어가 종단점을 묶으려면 옆 `document.json` 이 읽히고 평문 `documentId` 를 실어야 한다 — 읽을 수 없으면 위반) · negative control **3건** 신설, 각 위반 정확히 1건 · 내 N 프로브 3행에서 게이트와 `loadStore` 답 일치 |
| **2. 성질의 편집기 쪽을 진짜 `loadStore` 로 잰다** | C9 은 편집기 쪽에 **게이트와 같은 입력**(평문 필드)을 먹인다. 코퍼스 33 중 옆에 `document.json` 이 있는 스토어 **2개**, `loadStore` 로 대조되는 스토어 **1개**. N2형 fixture 를 심어도 **divergence 0** | fixture 코퍼스 전수에서 `게이트 accept ⟺ **loadStore** accept`(문서 파일이 없는 스토어는 그 사실 자체를 한쪽 답으로 셈) · 내 N2형 fixture 가 **divergence 로 잡힐 것**(지금 0 → 1) · 코퍼스에서 `loadStore` 로 대조되는 스토어 **≥ 3** |

경계 바깥 항목(H2 · B5 · Z1 · 남의 documentId 로 새 문서)은 **차단 사유로 쓰지 않았다.** N3(sniff
예산)·N5(`legacy: []`)·§6 의 문구 항목도 **차단 조건에 넣지 않았다** — 각각 문서화된 전제이거나
방향이 안전(거짓 붉은색)하거나 문서 문언 문제다.

## 9. 비차단 관측

1. **N3 은 문서화된 전제의 실제 값이다.** "머리 4KB 안에 두 키" 라는 전제는 **레코드 9개짜리
   스토어**(키 정렬 직렬화)면 이미 깨진다(`"version"` at byte 8326). 전제를 적을 때 이 수치를
   같이 적으면 읽는 사람이 자기 스토어가 전제 안인지 판단할 수 있다.
2. **`legacy` 진리값 규약이 두 언어에서 다르다(N5).** 지금은 게이트가 더 엄격해 안전하지만,
   같은 종류의 truthiness 차이가 반대 방향으로 생기면 그대로 거짓 초록이 된다. 계약 모듈이
   "`legacy` 는 객체" 라고 **모양을 못 박으면** 언어 차이가 사라진다.
3. **격리 표식은 여전히 저장소 파일 한 장이다.** 루트에 놓으면(N4) 판정이 exit 1 로 멈추므로
   은폐는 아니지만, `excluded: 2` 처럼 **판정에서 빠진 스토어 수**가 커지는 것을 아무 것도
   경고하지 않는다. 커밋 게이트에서 임계값(예: excluded > 0 이면 사유 필수)을 두는 편이 낫다.
4. **성질의 코퍼스는 `fixtures/` 로 고정돼 있다.** 실사용 스토어가 늘면(`sample-state` 밖) 성질은
   그것들을 보지 않는다. 코퍼스를 "작업공간에서 **발견된** 스토어 ∪ fixtures" 로 두면 게이트의
   발견 로직과 성질의 범위가 같아진다.
5. **`counts.graphNodes` 는 여전히 시점 의존**(이번 실행 371). 골든 산출물로 커밋하면 안 된다는
   직전 관측은 유효하다.
6. **negative control 이 실제 저장소와 결합돼 있다**(직전 관측 유효). fixture 판정마다 작업공간
   훑기가 `sample-state/annotations.json` 을 함께 판정한다 — 그 스토어가 깨지면 24개 대조군이
   동시에 무의미해진다.
