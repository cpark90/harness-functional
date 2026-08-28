---
verdict: pass-with-notes
target: tools/plane-editor/ — 바인딩 강화 N-1(입양·세탁 금지) · N-2(중복 documentId 위반화) · N-3(capture 구조 검증) · N-4(검사기 문서 대조)
criteria: docs/verify/plane-editor-binding-readiness-verify.md §7 표의 **해제 기준(수치) 그대로** + 브리프 무회귀 조건
baseline: HEAD = 2266ebb (그중 plane-editor 는 00e2473 "Land plane-editor binding readiness" 가 마지막) + 작업트리 미커밋 변경
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
conditions-met: N-1 ✔ (B3 0/2 · B7 바인딩 0) · N-2 ✔ (exit 1 · 두 순서 verdict JSON byte-identical) · N-3 ✔ (B4/B4b 오해소 0 + D6 6모양) · N-4 ✔ (exit 1 · negative control 14/14)
new-confirmed: vnv 신규 우회 5종 — H1(자리별 대응을 **만족시키는** padding 위조 → 오해소 1) · H3(anchors 필드를 지우면 검사기가 종단점을 묶는다, 편집기는 그 스토어를 거절) · H4(한 스토어 안 중복 레코드 id — 검사기와 편집기가 **다른 레코드**를 쥔다) · P2b(같은 문서 스토어 둘 중 한쪽만 물리면 끊긴 종단점이 다시 사라진다) · H2(옛 레코드에 사람이 documentId 를 써 넣으면 cross-document 부착 부활, sticky 표식은 막지 못한다)
no-regression: 19 시나리오 × 3레인 카운트 HEAD 와 **전부 동일** · 전 레인 오해소 0(336 측정) · 반사실 36/74/76 유지 · 3회 별 프로세스 byte-identical(재실행 **전** 디스크본과도 동일) · repo 게이트 3종 PASS · 담당 경로 밖 변경 0
blocking-decision: (b) 조건부 해제 — v1·v2 제외는 **해제**(N-1 수치 충족), 다음 wave 는 §8 불변식 3개를 지키는 저장소 상태에서만 앵커를 링크 종단점으로 바인딩한다
---
# 판정 — 바인딩 강화 N-1~N-4, 그리고 차단 해제

**verdict: pass-with-notes.**

- **직전 판정 §7 이 스스로 적은 네 기준은 전부, 그 수치 그대로 충족됐다.** 완화하지 않았고,
  증거 스크립트 3종을 **한 글자도 고치지 않고** 다시 돌려 확인했다 (§2–§5).
- **비-vacuity 를 이번에는 반사실로 못 박았다.** `downgradeAnchors` 에 "스토어 documentId 를
  찍어 준다"는 **그 한 줄만** 되살린 사본에서 B3 는 즉시 **2/2 cross-document 부착**으로
  돌아가고, B7 세탁본은 v3 · `anchorState: bound` 로 저장되며 **지금 검사기가 그것을 PASS
  시킨다**(exit 0, broken 0). 즉 현행 0/2 는 프로브가 썩어서 나온 0 이 아니다 (§2.2).
- **그러나 이번 수정을 겨냥해 창안한 우회에서 신규 CONFIRMED 가 5건 나왔다.** 그중
  **H1** 은 N-3 이 새로 세운 구조 방어(`captureCorrespondence`)를 **만족시킨 채** 오해소하고,
  **H3·H4·P2b** 는 검사기(커밋 게이트)와 편집기가 **같은 종단점에 다른 답**을 내는 지점이다.
  뒤쪽 셋은 검사기 자신이 §2b 에 적은 원칙("편집기가 거절하는 모양을 게이트도 거절해야
  한다")을 자기 구현이 어기는 자리다 (§6).

판정 요지: **verification = PASS**(수치 재현·결정성·무회귀·경계 전부 확인),
**validation = 네 조건은 충족, 목적은 (a) 위조 축에서 한 겹 더 새고 (b) 게이트↔편집기
불일치 축에서 새로 샌다.** 결론은 **(b) 조건부 해제 — v1·v2 제외는 해제, 대신 §8 불변식 3개**다.

> **판정 대상의 범위에 관한 사실 정정.** 직전 판정의 baseline 은 `3524653` 이었고, 그 뒤
> `00e2473` 이 **판정서와 N-1·N-3 코드 수정을 함께 커밋**했다. 그래서 이번 delta 는
> "HEAD 커밋본(코드) + 작업트리(진단·검사기·fixture·문서)"에 걸쳐 있다. `git diff HEAD` 만
> 보면 N-1 방어가 없는 것처럼 보이므로(HEAD 에 이미 있다), **인과는 §2.2 의 역패치
> 반사실로만** 확정했다.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
S=<scratch>/vnv

# ① 재실행 **전에** 디스크본 해시 (스위트가 자기 산출물을 덮어쓰므로 순서가 중요)
cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $S/disk/
cp tools/plane-editor/sample-state/{annotations.json,document.json} $S/disk/
sha256sum $S/disk/*

# ② 격리 재실행 3회 (rsync 사본 + node_modules 심링크 — 트리를 건드리지 않는다)
rsync -a --exclude node_modules tools/plane-editor/ $S/tree/pe/
ln -sfn <abs>/tools/plane-editor/node_modules $S/tree/pe/node_modules
for i in 1 2 3; do (cd $S/tree/pe && node run-suite.mjs); cp ... $S/run$i/; done

# ③ 무회귀 — HEAD 산출물과 시나리오×레인 1:1 (집계 비교 금지)
git show HEAD:tools/plane-editor/suite-result.json > $S/head-suite.json

# ④ 증거 스크립트 3종 **무수정** 재실행
VNV_SCRATCH=$S/probes/bind node docs/verify/plane-editor-binding-adversarial.mjs
node docs/verify/plane-editor-binding-store-probe.mjs $S/probes/store        # C-a~C-h + B7
/usr/bin/python3 docs/verify/plane-editor-binding-link-probe.py $S/probes/link   # L1~L7
node docs/verify/plane-editor-c1-adversarial.mjs                             # N1~N8
node docs/verify/plane-editor-c1b-adversarial.mjs                            # M1~M9 (M4·M5)

# ⑤ ★ 신규 우회 (이번 수정을 표적으로 창안)
VNV_SCRATCH=$S/probes/hard node docs/verify/plane-editor-binding-hardening-adversarial.mjs
/usr/bin/python3 docs/verify/plane-editor-binding-hardening-link-probe.py $S/probes/hardlink

# ⑥ ★ 비-vacuity — 역패치 반사실 (수정 전 동작을 한 줄만 되살린 사본)
rsync -a --exclude node_modules tools/plane-editor/ $S/cf/tools/plane-editor/
#   downgradeAnchors(anchors, version) -> (anchors, version, documentId) 로 되돌리고
#   loadStore 가 그 값을 넘기게 한 뒤, 같은 프로브를 그 사본에 먹인다
(cd $S/cf && node docs/verify/plane-editor-binding-adversarial.mjs)
(cd $S/cf && node docs/verify/store-probe-cf.mjs $S/probes/cf-store)   # ROOT 만 치환한 사본
/usr/bin/python3 tools/plane-editor/check_links.py --store $S/probes/cf-store/launder/link-store \
  --annotations $S/probes/cf-store/launder/annotations.json --format json   # 현행 검사기로 세탁본 판정

# ⑦ 링크 검사기 · 게이트 · 경계
node tools/plane-editor/run-link-checks.mjs
for i in 1 2 3; do /usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json | sha256sum; done
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py
git status --porcelain -- tools/plane-editor ; git diff --stat HEAD -- tools/ ':!tools/plane-editor'
```

신규 프로브 2종은 내 파일 경계 안(`docs/verify/`)에 남겼다:
`plane-editor-binding-hardening-adversarial.mjs`(H1–H5) ·
`plane-editor-binding-hardening-link-probe.py`(P1–P5). 둘 다 `tools/plane-editor/` 를
**읽기만** 하고 산출은 scratch 에만 쓴다 (§7 경계 표에서 확인).

## 1. 재현·결정성 — 디스크본 == 3회 재실행

| 산출물 | sha256 | 재실행 전 디스크본 == 별 프로세스 3회 |
|---|---|---|
| `suite-result.json` | `41a51ab9bc0dc509a88cfaa711f318dc8b64a42d3261a458132f8127ebe74836` | ✓ |
| `REPORT.md` | `799188466b732136ff2187ced12114349308be2ad449543ea6dcdcf8607d0750` | ✓ |
| `schema-dump.json` | `bcfab19be870f6dc4f285e27d33fd94fd5fbb20812530b277e49af070bd89569` | ✓ — **Phase 1·C1·C1b·직전 판정과 동일** = 문서 스키마 무변경(G1 유지) |
| `sample-state/annotations.json` | `d62ecfea2a6620ae5d6502f3cb5d65803e04c099c814063731287b72afc92622` | ✓ — 직전 판정 값과 동일 |
| `sample-state/document.json` | `3d2146f9fa10e718f4e53a5a2ceaa1d31f4ae48310e33a2ecdd677098edaffc4` | ✓ — 직전 판정 값과 동일 |

`check_links.py` 도 별 프로세스 3회 JSON 이 동일하고, **직전 판정이 적은 해시와 같다**:
link-store `85fab4e3c050fc4c…`, sample-state 를 물린 fixture `84f28728beee00a2…`.

## 2. N-1 재측정 (판정 1) — 충족, 그리고 비-vacuous

**해제 기준(직전 판정 §7): "B3형 프로브에서 cross-document 부착 0/2, B7 세탁 경로에서 링크
종단점 바인딩 0건(검사기가 거절하거나 해소가 orphan)".**

### 2.1 재측정 (프로브 무수정)

| 시험 | 직전 판정(수정 전) | 현행 |
|---|---|---|
| B3 v1 스토어를 남의 문서 옆에 | 부착 (offset 58, `unchanged-text`) | **orphaned** · `stampedDocumentId: null` · `document-identity/record-has-no-document-identity` |
| B3 v2 스토어를 남의 문서 옆에 | 부착 (offset 58) | **orphaned** · 같은 사유 |
| **cross-document 부착** | **2/2** | **0/2 — 기준 충족** |
| B7 세탁: 위 상태에서 load → resolve → **save** → 검사기 | v3 · `document = doc-B` · `bound` · 검사기 **exit 0 PASS** | 저장본 `savedRecordDocument: null` · `savedLegacyMarkKept: true` · `savedAnchorState: "orphaned"` · 검사기 **exit 1**(`annotation-record-unbound`) · broken 0 |
| **세탁 후 링크 바인딩** | **성공** | **0건 — 기준 충족** |

세탁 경로는 브리프 지시대로 **저장까지 이어 돌려** 확인했다(로드 단계만 보면 "orphan 이니
됐다"로 오판한다). 스위트도 같은 것을 매 실행 잰다: D4 가 `promotedBySave: false` ·
`savedStoreVersion: 3` · `savedRecordMarkedLegacy: true` 를 계산하고 게이트 C2 가 그 값을
요구한다. **vacuity 방지 대조군도 살아 있다** — D4 `controlResolved: true`
(`relative-position`), 즉 "전부 거절"로 얻은 0 이 아니다.

쓰기 시점 계약도 실측했다: 정체성 없는 레코드를 **표시 없이** 저장하려 하면 `annotationRecord`
가 throw 한다("identity is minted at capture time and is never adopted from a store"),
표시가 있으면 통과(= 강등본 보존 경로).

### 2.2 ★ 비-vacuity — 역패치 반사실

`downgradeAnchors` 를 수정 전 서명(`(anchors, version, documentId)`)으로 되돌리고
`loadStore` 가 스토어 id 를 넘기게 한 사본에 **같은 프로브**를 먹였다.

| 반사실(수정 전 동작 복원) | 실측 |
|---|---|
| B3 v1/v2 | `stampedWithForeignDocument: true` · **부착 2/2** · offset 58 · `guardProvenance: unchanged-text` |
| B7 세탁 | 저장본 `document: {id: doc-5}` · `anchorState: bound` · 레코드는 v3 |
| 그 세탁본을 **현행 검사기**에 물림 | **pass true · violations [] · broken 0 · exit 0** |

마지막 줄이 중요하다: **검사기의 신규 규칙(`annotation-record-unbound`)은 "정체성이 없는"
레코드만 잡는다.** 정체성이 한 번 찍히고 나면(어떤 경로로든) 게이트는 구별하지 못한다.
따라서 N-1 의 차단은 **"아무도 레코드에 id 를 써 넣지 않는다"에 전적으로 의존**한다 — 이
사실이 §6 H2 의 의미이자 §8 불변식의 근거다.

## 3. N-2 재측정 (판정 2) — 충족

**해제 기준: "중복 documentId 가 위반(exit 1)이고, L1/L1b 두 순서의 verdict JSON 이 동일".**

| 시험 | 직전 판정 | 현행 |
|---|---|---|
| L1 (orphaned 스토어 먼저) | exit 0 · **brokenEndpoints 0** (은폐) | **exit 1** · `annotation-store-duplicate-document` · broken **1**(`ln-a:from:orphaned`) |
| L1b (인자 순서 반대) | exit 0 · broken 1 | **exit 1** · 같은 위반 · broken **1** |
| 두 순서의 verdict JSON 전문 | — | **byte-identical** (같은 store 디렉토리로 재측정, sha256 `44acf6b21e5a24b3…`, 1890 bytes 동일) |
| 세 스토어가 같은 documentId (P4) | — | 위반 **정확히 1건**, detail 에 세 경로 전부 명시 |

순서 의존이 사라진 근거는 두 곳이다: 상태 병합이 교환법칙(`모름 > orphaned > bound`)이고,
출력 `annotationStores` 가 경로 정렬이다. 둘 다 코드에서 확인했고 위 실측이 뒷받침한다.

**남은 것(§6 P1b·P2b)**: 순서 의존은 없앴지만 **집합 의존**이 남는다 — 검사기는 넘겨받은
스토어만 본다.

## 4. N-3 재측정 (판정 3) — 문언 충족, 목적은 H1 로 재개봉

**해제 기준: "B4형 위조에서 오해소 0, **또는** 문서가 '길이 padding + SV 자기보고로 우회
가능'을 명시하고 D6 에 그 모양을 6번째 케이스로 추가".**

| 시험 (프로브 무수정) | 직전 판정 | 현행 |
|---|---|---|
| B4 padding 위조 (다른 곳 문자로 길이 맞춤) | **오해소**(`Cure` 부착, 살아남은 문자 4) | **orphaned** · `forged/capture-content-mismatch` · accepted false |
| B4b 같은 위조의 스토어 왕복 | 오해소 · `wouldFlipUpgradePathExists: true` | **orphaned** · `misResolved: false` · `wouldFlipUpgradePathExists: false` |
| **B4/B4b 오해소** | **1** | **0 — 기준 충족** |
| D6 위조 모양 수 | 5 | **6** + 대조군 1, `forgeriesPassingLoad: 1` / `forgeriesCaughtAtResolve: 1` / `misResolutions: 0` |

브리프가 물은 "방어가 아니라 문구 정정으로 처리된 부분"의 답: **이번엔 방어다.**
`captureCorrespondence`(내용·유일성·순서)가 실제로 B4 를 잡는다. 문구도 실측에 맞게
정정됐다(README "캡처 증거는 어디까지 위조를 견디는가", REPORT §13 한계표).

**그러나 한계 문구가 다시 실측보다 강하다.** README 는 "padding 위조는 (1)에서 걸린다(그
자리의 문자가 아니다)" 라고 적고, 남는 구멍을 "남의 문서의 **유효한** capture 이식(B5)"으로
한정한다. **H1 이 그 문장을 반증한다** — padding 문자를 아무거나가 아니라 **그 자리의
글자와 같은 글자**로 고르면 (1)(2)(3)이 전부 성립하고 오해소한다(§6). 유효한 capture 도,
남의 문서도 필요 없다. 그래서 N-3 은 **자기 수치 기준으로는 충족**이지만, 목적("위조
내성")은 인접 모양에서 여전히 깨지고 **한계 문구는 실측과 어긋난다**.

## 5. N-4 재측정 (판정 4) — 충족

| 시험 | 직전 판정 | 현행 |
|---|---|---|
| L4 레코드 `anchors.document.id` ≠ 스토어 `documentId` | **PASS(exit 0)** — 아무 말 없음 | **exit 1** · `annotation-record-document-mismatch` |
| negative control 수 | 11 | **14** — 전부 exit 1 + **위반 정확히 1건** (신규 3: `annotation-record-unbound` · `annotation-record-document-mismatch` · `annotation-store-duplicate-document`) |
| positive control | PASS | link-store · control fixture · 실제 sample-state(v3) 전부 exit 0 |
| `run-link-checks.mjs` 전체 | — | **32/32 ok · PASS** |
| 버전 협상 경계 (L3/L5) | exit 2 + 사유 | 유지 — v0·v4·`"3"`·부재·v3 without documentId 전부 **exit 2 + 명시 사유** |

## 6. ★ 신규 우회 창안 (판정 5) — CONFIRMED 5건

전부 이번 수정을 표적으로 설계했고, 증거는 `docs/verify/plane-editor-binding-hardening-*` 두
파일에 남겼다.

### 6.1 H1 — 자리별 대응을 **만족시키는** padding 위조 (오해소 1) · CONFIRMED

구조 검사는 "캡처 런의 k번째 이름표가 지금도 살아 있다면 그 문자는 `exact[k]` 여야 한다"를
본다. 그런데 **살아 있지 않은 이름표는 검사에서 건너뛰고**, 순서 검사는 **해소 범위 안**
문자만 본다. 그래서 위조자는 이렇게만 하면 된다:

- 현재 범위의 살아있는 문자(`Cure`)를 `exact`(`Critical failure`) 안에서 **부분수열 자리**
  (`C`=0, `u`=13, `r`=14, `e`=15)에 배치하고,
- 나머지 12자리는 문서 **다른 곳에서 그 자리의 글자와 같은 글자**의 이름표로 채운다.

| 측정 | 값 |
|---|---|
| 정직한 레코드(대조군) | `orphaned` · `all-characters-new` |
| 위조 레코드 | **`relative-position` · 부착 텍스트 `"Cure"` · offset 37 · `surviving-characters` · survivingChars 4 · accepted true** |
| `captureEvidence` | `usable: true, corrupt: false` |
| 마이그레이션 강등 | **없음**(`migrationDowngraded: false`) |
| 스토어 왕복(H1b, D6 경로) | `loadRejected: false` · `degraded: false` · **`misResolved: true`** · `measuredAnchorState: "bound"` |
| D6 게이트 영향 | **`wouldFlipUpgradePathExists: true`** — 이 모양이 D6 에 들어가면 `upgradePathExists` 가 뒤집힌다 |

즉 `misResolutions: 0` · `upgradePathExists: false` 는 **고른 6모양에 대한 참**이고, 7번째
모양은 지금 부착된다. (직전 판정이 5모양 시절에 적은 지적이 6모양에서도 같은 형태로 유효하다.)
위협 모델은 B4 와 같은 "레코드를 손으로 쓰는 주체"이며 REPORT §13 이 그 경계를 선언했으므로
**미선언 구멍은 아니다** — 그러나 **선언문이 이 모양을 포함하지 않는다**(§4).

### 6.2 H3 — `anchors` 필드를 지우면 게이트가 종단점을 묶는다 · CONFIRMED

| 레코드 모양 (v3 스토어, `anchorState: bound`) | 편집기 `loadStore` | 검사기 |
|---|---|---|
| 정체성 없음 + `legacy` 표식 **제거** (대조군) | **rejected** (`record a1 carries no document identity`) | exit 1 · `annotation-record-unbound` |
| **`anchors` 필드 자체를 삭제** | **rejected** (같은 사유) | **exit 0 · pass true · broken 0 — 종단점 바인딩** |
| **`anchors: null`** | **rejected** | **exit 0 · pass true · broken 0** |

`_record_document()` 는 `anchors` 가 dict 가 아니면 `(None, False)` 를 돌려주고 그 레코드는
`unbindable` 판정을 **건너뛴다**(투영 모양 허용). 결과는 검사기 자신이 §2b 에 적은 원칙의
반례다: *"편집기가 로드 시점에 거절하는 모양을 커밋 게이트도 거절해야 한다 — 한쪽만 막으면
파일이 게이트를 통과한 채 편집기에서 터진다."* 지금 그 상태이고, 방향이 **관대한 쪽**이다.
세탁 관점에서는 "sticky 표식을 지우면 걸리지만, **표식과 앵커를 통째로 지우면 통과**"다.

### 6.3 H4 — 한 스토어 안 중복 레코드 id: 게이트와 편집기가 다른 레코드를 쥔다 · CONFIRMED

한 v3 스토어에 같은 id `a1` 인 레코드 둘(하나는 정체성 없는 강등본 `orphaned`, 하나는 정상
`bound`)을 넣었다.

| 파일 순서 | 편집기 `loadStore` | 편집기가 id 로 찾은 레코드 | 검사기 |
|---|---|---|---|
| 강등본 먼저 | **accepted** (2건 로드) | **`laundered` · `orphaned` · legacy 표식 있음** | exit 0 · pass true · **broken 0** |
| 정상 먼저 | **accepted** (2건 로드) | `honest` · `bound` | exit 0 · pass true · broken 0 |

검사기는 두 순서 모두 `bound` 쪽을 쓴다(순서 독립 — N-2 의 성과). 그러나 **편집기는 파일
순서대로 첫 레코드를 쥔다.** 그래서 게이트가 "종단점 정상, 끊김 0"이라고 서명한 링크가
편집기에서는 orphaned 강등본을 가리킨다. 중복 레코드 id 는 **어느 층에서도 위반이 아니다**
(스토어 단위 중복은 N-2 가 막았지만 레코드 단위는 비어 있다). 병합·append 로 사고 도달 가능.

### 6.4 P2b — 집합 의존: 한쪽 스토어만 물리면 끊김이 다시 사라진다 · CONFIRMED

| 케이스 (같은 documentId 스토어 A=orphaned, B=bound) | 실측 |
|---|---|
| P2a 둘 다 물림 | exit 1 · `annotation-store-duplicate-document` · **broken 1** |
| **P2b `bound` 쪽만 물림** | **exit 0 · pass true · violations [] · broken 0** |
| P2c `orphaned` 쪽만 물림 | exit 0 · broken 1 |

N-2 는 **인자 순서** 의존을 없앴지만, 무엇을 넘길지는 여전히 호출부가 정한다
(`--annotations` 목록; `run-link-checks.mjs` 는 하드코딩). 문서 복제로 같은 id 스토어가
생겨도 한쪽만 게이트에 물리면 L1 과 **동일한 결과**(조용한 은폐)가 난다. 검사기가 보지 못한
파일을 판정할 수 없는 것은 당연하지만, 그렇다면 **발견(discovery)이 게이트의 일부**여야 한다.

부수로 P1b: **같은 파일을 두 번 물리면** `annotation-store-duplicate-document` 로 exit 1 이
난다(경로 개수로 세고 실체로 세지 않는다) — 위양성. glob + 명시 인자를 함께 쓰는 래퍼는
정상 저장소에서도 게이트가 깨진다.

### 6.5 H2 — 손으로 써 넣은 documentId: cross-document 부착 부활 · CONFIRMED (선언된 경계 안)

문서 A 의 v1 모양 레코드(capture 없음)에 **사람이** 문서 B 의 documentId 를 써 넣고 v3
스토어로 저장했다.

| 변형 | `loadStore` | 해소 | 검사기 |
|---|---|---|---|
| legacy 표식 **제거**하고 id 만 기입 | accepted | **`relative-position` · `"disputed clause"` · offset 58 · `unchanged-text`** | **exit 0 · pass true · broken 0** |
| legacy 표식 **그대로 두고** id 기입 | accepted | **동일하게 부착** | **exit 0 · pass true · broken 0** |

두 번째 행이 요점이다: **sticky 표식은 바인딩을 막는 장치가 아니다.** 막는 것은 정체성의
부재뿐이고, 표식이 있어도 정체성이 있으면 `captureEvidence` 가 unusable 로 떨어진 뒤
`unchanged-text` 예외로 부착된다. 이 경로는 REPORT §13 이 선언한 bearer-claim 경계 안이지만
(파일을 쓸 수 있는 주체), **B5 보다 싸다** — 유효한 capture 이식이 필요 없고 한 줄이면 된다.

### 6.6 음성 결과 (막힌 우회 — 기록)

| # | 시도 | 결과 |
|---|---|---|
| H5 | 캡처 이벤트를 **실제로 일으켜** 만든 합성 레코드에 옛 `exact` 를 씌운다 | **막힘** — `capture-inconsistent`(이름표 수 ≠ exact 길이). 길이를 맞추면 H1 과 같은 문제로 귀착 |
| P5 | 중복 documentId 를 공백·대소문자로 비틀어 검사기를 피한다 | **은폐 없음** — 위반은 안 나지만 끊긴 종단점은 그대로 보고(broken 1). 대소문자 변형 종단점은 `endpoint-document-mismatch` |
| H6(부수) | `saveStore` 에 남의 문서를 주장하는 레코드 | **쓰기는 accepted, 읽기는 rejected** — 편집기가 자기가 못 읽는 스토어를 쓸 수 있다(검사기는 `annotation-record-document-mismatch` 로 잡는다). 낮은 등급, 자해형 |

## 7. 무회귀 · 게이트 · 경계 (판정 6)

| 축 | 기준 | 실측 |
|---|---|---|
| 기존 시나리오 × 레인 카운트 | HEAD 와 1:1 동일 | **19/19 시나리오 × 3레인 전부 동일** (S1–S12d; `survived/recovered/drifted/orphaned/wrong/measured/pass/driftChars` 전 필드) |
| `totals` · `bystanders` · `placement` · `orphanBudget` · `lanes` · `policy` · `fixtures` · `findings` | HEAD 와 동일 | **전부 identical** |
| 전 시나리오·전 레인 오해소 | 0 | **0** (336 레인측정: live 108 · pipeline 114 · stale 114) |
| 반사실(막은 오해소) | 유지 | **textmove 36 · phase1 74 · naive 76** — 직전 판정과 동일 |
| bystander | wrong 0 | 540 중 ok 517 · 잔여 1 · orphan 22 · **wrong 0** |
| placement | 제자리 밖 0 | measured 38 · atKnownOccurrence 38 · **outside 0** |
| suite-result 의 HEAD 대비 변화 | 이번 delta 만 | D4 4필드 추가(`promotedBySave` 등) · D6 첫 행 사유 변경 · C2 requirement 문구 · G3 payload 해시 · G5 파일수 71→75 — **그 외 없음** |
| 스위트 게이트 | 전부 pass | G1·G2·C1·C1b·C2·C3·G3·G5 **PASS** (G4 는 external) |
| M4 (SV refill) · M5 (cross-document) | 오해소 0 · 0/3 | **오해소 0** · **0/3** (프로브 무수정 재실행) |
| 링크 negative control | 전수 FAIL 유지 | **14/14** exit 1 + 위반 정확히 1건 |
| 링크 positive control | PASS | link-store · control fixture · sample-state(v3) exit 0 |
| 결정론 | 3회 byte-identical | 스위트 3회 + **재실행 전 디스크본**과 동일 · `check_links.py` 3회 JSON 동일(직전 판정 해시와도 동일) |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 위반 0(75파일) + **내 전수 스캔**(node_modules 제외 82파일) 정책 밖 문자 **0** |
| 경계 | 담당 경로 밖 변경 0 | `git status --porcelain -- tools/plane-editor` = **14항목**(10 modified + 4 신규 fixture). `tools/materialize.py`(+148) 는 envelope/autonomy 렌더 lane 소유이며 plane-editor 참조 0 — 이 dispatch 와 무관. `ONTOLOGYSTYLE.md` diff 빈 출력 |
| 내 판정이 트리를 오염시켰는가 | 0 | 모든 프로브·반사실 실행 후 §1 다섯 산출물 해시 **불변** |

## 8. ★ 차단 해제 결론 (판정 7)

**결론: (b) 조건부 해제.**

> **직전 판정이 걸어 둔 "옛(v1·v2) 스토어에서 온 레코드는 바인딩 대상 제외"는 해제한다** —
> 내가 §7 에 적은 해제 기준(N-1 수치)이 충족됐고(§2), 그 인과를 역패치 반사실로 확인했다.
> 이제 v1·v2 레코드는 **정책이 아니라 엔진이** 바인딩에서 배제한다(정체성이 없으면 로드·
> 저장·재로드를 거쳐도 미상, 검사기도 `annotation-record-unbound` 로 거절).
>
> **대신 다음 wave(실제 앵커→링크 바인딩)는 아래 세 불변식을 만족하는 저장소 상태에서만
> 바인딩한다.** 셋 다 지금 **깨져 있고**(측정치 병기), 셋 다 게이트 안에서 닫힌다.

전면 해제(a)를 택하지 않는 이유는 하나다: **커밋 게이트가 통과시킨 종단점과 편집기가
실제로 여는 종단점이 서로 다를 수 있는 경로가 새로 셋 확인됐다**(H3·H4·P2b). 이것은 위조가
아니라 **일상 편집·복제·병합으로 도달**하며, 차단의 원래 이유("링크가 틀린 곳을 가리킨다")와
같은 계열이다. 반대로 (c) 유지는 부당하다 — 네 조건은 전부 자기 수치로 충족됐고, 직전
판정이 유일하게 남긴 차단 사유(B3→B7 세탁)는 실측으로 닫혔다.

| # | 다음 wave 불변식 | 지금 값 (실측) | 충족 기준(수치) |
|---|---|---|---|
| **I-1 게이트와 편집기가 같은 답을 낸다** — 어떤 레코드 모양도 "게이트 통과 + 편집기 거절"이 되면 안 된다 | H3: `anchors` 삭제·`anchors:null` 두 모양이 **exit 0 PASS 로 바인딩**되고 `loadStore` 는 거절 | H3형 3모양 전부에서 게이트 exit 1 (또는 그 모양을 편집기도 로드) · negative control 로 고정 |
| **I-2 종단점 하나에 레코드 하나** — 스토어 안 중복 레코드 id 는 위반 | H4: 중복 id 스토어를 편집기·검사기 **양쪽 다 accept**, 편집기는 파일 순서 첫 레코드(orphaned 강등본), 검사기는 `bound` 쪽 → broken 0 | 같은 id 2건이면 exit 1 · 두 파일 순서에서 verdict JSON byte-identical · 편집기도 거절 |
| **I-3 스토어 집합은 발견으로 정한다** — 판정 범위가 호출 인자에 의존하지 않는다 | P2b: 같은 문서 스토어 둘 중 `bound` 쪽만 물리면 **exit 0 · broken 0**(끊김 은폐). P1b: 같은 파일 2회 → 위양성 exit 1 | 저장소 루트에서 주석 스토어를 **발견**해 전부 판정 · 같은 실체 중복 인자는 정규화(위양성 0) · P2b 재현 시 broken 1 |

**비차단이지만 같은 wave 에서 정정할 것**: README 의 "padding 위조는 (1)에서 걸린다"와
REPORT §13 의 한계 문구는 **H1 을 포함하도록** 고쳐야 한다(현재 문언은 실측보다 강하다).
가장 정직한 형태는 "현재 범위의 텍스트가 저장된 `exact` 의 **문자 부분수열**이면 대응 검사는
반증하지 못한다"이고, D6 에 H1 모양을 7번째로 넣으면 `misResolutions` 가 그 사실을 매 실행
드러낸다.

## 9. 비차단 관측

1. **N-1 의 방어는 "아무도 id 를 써 넣지 않는다"에 서 있다.** 정체성이 어떤 경로로든 한 번
   기입되면 편집기도 게이트도 출처를 구별하지 못한다(§2.2 반사실 · §6.5 H2). 서명·무결성
   태그가 없는 한 이 축은 닫히지 않으므로, "스토어 파일을 쓸 수 있는 주체 = 그 문서의 주석을
   임의로 주장할 수 있는 주체"라는 신뢰 경계를 **링크 평면 문서에도** 못 박는 편이 낫다
   (README 는 이미 적었다).
2. **`upgradePathExists` · `misResolutions` 는 "고른 6모양"에 대한 값이다.** H1 이 7번째
   모양이라는 사실이 그 사정거리를 다시 보여준다. 게이트 문구에 **모양 수와 선정 근거**를
   함께 싣는 것이 안전하다.
3. **`counts.graphNodes` 는 여전히 시점 의존**(병행 ontology lane 이 개체를 늘리면 변한다).
   이 JSON 을 골든 산출물로 커밋하면 안 된다는 직전 판정의 관측은 유효하다.
4. **placement 계측 사정거리**(measured 38 vs 실제 부착 86)는 이번에도 그대로다. 결함은
   아니지만 REPORT 문장은 범위를 밝혀야 한다.
5. **판정 대상 delta 가 커밋 경계를 가로지른다**(§ 머리말). 다음 land 커밋 메시지는
   "N-1~N-4 강화"가 어디까지 이번 것인지 적어 두는 편이 이후 판정의 baseline 혼선을 줄인다.
