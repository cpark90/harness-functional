---
verdict: pass-with-notes
target: tools/plane-editor/ (C1b §8 차단 해제 조건 3건 + Phase 2 F1 — 문서 정체성 바인딩 / 저장소 계약 무결성 / 끊긴 종단점·orphan 예산 / 주석 스토어 버전 협상)
criteria: docs/verify/plane-editor-c1b-verify.md §8 표의 **해제 기준(수치) 그대로** + docs/verify/plane-editor-phase2-verify.md F1 + 브리프 무회귀 조건
baseline: HEAD = 3524653 (C1b·Phase 2 land 직후, 이번 수정 이전)
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
conditions-met: ①·②·③ 세 조건 전부 **자기 수치 기준으로 충족** (M5 0/3 · M4 오해소 0 · 6조작 게시 + broken-endpoint 발동)
f1: 해소 — 실제 sample-state(v3) 스토어로 PASS(exit 0), 읽을 수 없는 버전은 사유와 함께 exit 2
new-confirmed: vnv 신규 우회 3종 — B3/B7(옛 스토어 입양 → 재저장 세탁 → 링크 종단점 바인딩), B4(캡처 padding 위조 오해소), L1(중복 documentId가 끊긴 종단점을 조용히 은폐)
no-regression: 15개 기존 시나리오 × 3레인 카운트가 HEAD와 **전부 동일**, 전 레인 오해소 0, 3회 byte-identical, repo 게이트 3종 PASS
blocking-decision: (b) 조건부 해제 — 파이프라인이 만든 **v3 스토어 한정**으로 바인딩 허용, 옛(v1·v2) 스토어에서 온 레코드는 바인딩 대상 제외. 아래 §7의 N-1 충족 시 그 제외도 해제
---
# 판정 — 바인딩 준비 조건 3건 + F1, 그리고 차단 해제 여부

**verdict: pass-with-notes.**

- **내가 C1b §8에서 세운 세 조건은 자기 수치 기준으로 전부 충족됐다.** 조건을 완화하지 않고
  같은 프로브를 **한 글자도 고치지 않고** 다시 돌려 확인했다: M5 cross-document 부착 **0/3**
  (변경 전 엔진은 2/3), M4 SV-refill 오해소 **0**(변경 전 1), 흔한 편집 6조작이 정식
  시나리오로 들어와 조작별 orphan율이 REPORT §5에 게시된다.
- **Phase 2 F1도 닫혔다.** 실제 `sample-state/annotations.json`(v3)을 물려 검사기가 **PASS
  (exit 0)** 하고, 읽을 수 없는 버전은 **사유와 함께 exit 2**로 거절한다(v0·v4·문자열·부재
  전부 실측).
- **무회귀는 기존 판정보다 강한 축으로 확인했다.** 집계가 아니라 **15개 기존 시나리오 ×
  3레인의 카운트를 HEAD 산출물과 1:1 비교**해 전부 동일함을 확인했다. 늘어난 것은 새
  시나리오(S12a–d)와 그에 딸린 bystander뿐이다.
- **그런데 브리프가 지시한 "우회 창안"에서 신규 CONFIRMED가 3건 나왔다.** 그중 하나
  (**B3→B7 세탁 경로**)는 **차단 사유였던 바로 그 실패 계열**을 위조 없이 되살린다: 문서 A의
  옛(v1) 주석 파일을 문서 B 옆에 두면 로드 시 B의 id가 **찍히고**, 해소되고, 재저장되면
  **v3 레코드가 되어 링크 종단점으로 바인딩된다**(검사기 exit 0, PASS, 위반 0).

판정 요지: **verification = PASS**(수치 재현·결정성·무회귀·경계 전부 확인),
**validation = 조건 충족, 그러나 목적은 옛 레코드 경로에서 아직 새어 나간다.**
그래서 결론은 **(b) 조건부 해제 — v3 스토어 한정 바인딩 허용**이다(§7).

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
S=<scratch>/vnv

# ① ★ 재실행 **전에** 디스크본을 먼저 해시한다 (C1b 판정의 증거 공백 해소)
cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $S/disk/
cp tools/plane-editor/sample-state/{annotations.json,document.json} $S/disk/
sha256sum $S/disk/*

# ② 격리 재실행 3회 (rsync 사본 + node_modules 심링크 — 트리를 건드리지 않는다)
rsync -a --exclude node_modules tools/plane-editor/ $S/tree/pe/
ln -sfn <abs>/tools/plane-editor/node_modules $S/tree/pe/node_modules
for i in 1 2 3; do (cd $S/tree/pe && node run-suite.mjs); cp ... $S/run$i/; done
sha256sum $S/run*/*                      # 3회 동일 + ①의 디스크본과 동일

# ③ 원시 시행 독립 재채점 (보고된 outcome·landedOffset 무시)
/usr/bin/python3 $S/rescore.py  $S/run1/suite-result.json   # 텍스트 재분류
/usr/bin/python3 $S/rescore2.py $S/run1/suite-result.json   # 위치 재채점(per-trial 문서)

# ④ 무회귀 — HEAD 산출물과 시나리오×레인 1:1 대조
git show HEAD:tools/plane-editor/suite-result.json > $S/head-suite.json

# ⑤ 적대 프로브 — 기존(무수정) + 신규
node docs/verify/plane-editor-c1-adversarial.mjs            # N1~N8
node docs/verify/plane-editor-c1b-adversarial.mjs           # M1~M9 (M4·M5 재측정)
node docs/verify/plane-editor-binding-adversarial.mjs       # B1~B6 (신규 우회)
node docs/verify/plane-editor-binding-store-probe.mjs $S    # C-a~C-h + B7 세탁 경로
/usr/bin/python3 docs/verify/plane-editor-binding-link-probe.py $S   # L1~L7 링크 평면

# ⑥ ★ 비-vacuity — 변경 **전** 엔진 자체에 같은 프로브를 먹인다
git worktree add --detach $S/head-pe HEAD                   # HEAD = 3524653
ln -sfn <abs>/tools/plane-editor/node_modules $S/head-pe/tools/plane-editor/node_modules
cp docs/verify/plane-editor-c1b-adversarial.mjs $S/head-pe/docs/verify/
(cd $S/head-pe && node docs/verify/plane-editor-c1b-adversarial.mjs)

# ⑦ 링크 검사기 · 게이트 · 경계
node tools/plane-editor/run-link-checks.mjs
/usr/bin/python3 tools/plane-editor/check_links.py --store <fixture> --annotations <store> --format json
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py
git status --porcelain -- tools/plane-editor ; git diff --stat HEAD -- tools/*.py ONTOLOGYSTYLE.md
```

신규 프로브 3종은 내 파일 경계 안(`docs/verify/`)에 남겼다:
`plane-editor-binding-adversarial.mjs`(B1–B6) · `plane-editor-binding-store-probe.mjs`(C-a–C-h, B7) ·
`plane-editor-binding-link-probe.py`(L1–L7). 전부 `tools/plane-editor/`를 **읽기만** 하고 산출은
scratch에만 쓴다 — 판정 후 `git status --porcelain -- tools/plane-editor`가 developer의 45개
항목만 보여준다(내 실행이 만든 변경 0, 아래 §6 경계 표).

## 1. 재현·결정성 — C1b의 증거 공백을 닫았다 (판정 5)

C1b 판정에서 "재실행이 developer 디스크본을 덮어써 대조 못 했다"고 적었던 공백을 이번에는
**재실행 전 해시**로 닫았다. 별 프로세스 3회 실행 결과가 **디스크본과 byte-identical**이다.

| 산출물 | sha256 | 디스크본(재실행 전) == 재실행 3회 |
|---|---|---|
| `suite-result.json` | `98571c5afc35f5c1a8a6394a23c790ebbf5271c3e9b0ab40d68c7de491bf3db9` | ✓ |
| `REPORT.md` | `8e49f538c2e029f321099ba1e50e887e40e76860522e3fc3165a5a7d35f84aa5` | ✓ |
| `schema-dump.json` | `bcfab19be870f6dc4f285e27d33fd94fd5fbb20812530b277e49af070bd89569` | ✓ — **Phase 1·C1·C1b와 동일** = 문서 스키마 무변경(G1 유지) |
| `sample-state/annotations.json` | `d62ecfea2a6620ae5d6502f3cb5d65803e04c099c814063731287b72afc92622` | ✓ |
| `sample-state/document.json` | `3d2146f9fa10e718f4e53a5a2ceaa1d31f4ae48310e33a2ecdd677098edaffc4` | ✓ |

`check_links.py`도 별 프로세스 3회 JSON 출력이 동일하다(link-store `85fab4e3c050…`,
sample-state 물린 fixture `84f28728beee…`).

**표 ↔ 원시 데이터 재채점: 불일치 0.**

- **텍스트 채점**: 보고된 `outcome`을 버리고 `lanes[].text` vs `expected`로 내 코드가 다시
  분류 — 336 레인측정(live 108 + pipeline 114 + stale 114) 전부 일치, MISMATCH **0**.
- **위치 채점**: `from`을 내 변환식(`from = textOffset + blockIndex + 1`)으로 되돌려 **시행별**
  `docTextAfterEdit`와 대조 — 부착 74건 전부 해소 텍스트의 실제 출현 위치에 있고, 스위트가
  실은 `landedOffset`과 **62건 전부 값이 일치**한다. **판별력 있는 시행**(기대 문자열이 편집 후
  문서에 2회 이상 나오는 시행) 12건은 전부 **옳은 출현(첫 번째)** 에 붙었다.

## 2. 조건 ① 재측정 + 우회 창안 (판정 1)

**해제 기준(C1b §8): "M5형 프로브에서 cross-document 부착 0/3".**

### 2.1 재측정 — 기준 충족, 그리고 비-vacuous

| 프로브(무수정) | 변경 전 엔진(HEAD 3524653) | 현행 |
|---|---|---|
| M5 identical-reimport, same clientID | **부착**(`relative-position`, offset 58) | orphan `document-identity/mismatch` |
| M5 forked document, same clientID | **부착**(offset 58) | orphan `document-identity/mismatch` |
| M5 different document, different clientID | orphan(`block-gone/stored-item-unknown`) | orphan `document-identity/mismatch` |
| **cross-document 부착** | **2/3** | **0/3 — 기준 충족** |

변경 전 값은 스위트 안 대조군이 아니라 **`git worktree`로 꺼낸 옛 엔진 자체**에 같은 프로브를
먹여 얻었다. 즉 이 0은 vacuous하지 않다. 대조군도 살아 있다: 스위트 D5의 "같은 문서를 저장
상태에서 다시 열기"는 정상 해소(`controlResolved: true`), 내 B1도 같은 id면 정상 부착 —
**"전부 거절"로 얻은 0이 아니다.**

계약 자체도 쓰기·읽기 양쪽에서 실제로 이빨이 있다(내 C 프로브, 전부 실측):

| 시험 | 결과 |
|---|---|
| C-a 측정되지 않은/어휘 밖 `anchorState`로 `saveStore` | **거절**(throw) · 측정값이면 성공 |
| C-b 상태 정체성과 다른 `documentId`로 `saveStore` | **거절** |
| C-c/C-d `document.json`·`annotations.json`의 `documentId` 변조 | **거절**(CRDT 상태가 원본) |
| C-e/C-f v3 레코드에 document 없음 / 다른 문서 주장 | **거절** |
| C-g 대조군: 무변조 스토어 | 정상 로드 |
| C-h 정체성 없는 문서 상태 | `captureAnchors` **거절**, 해소는 `document-identity/document-has-no-identity` |

### 2.2 ★ 우회 창안 — 신규 CONFIRMED (B3 → B7)

브리프가 지시한 두 우회를 그대로 만들었다.

| # | 우회 | 결과 |
|---|---|---|
| **B1/B1b** | **문서 id를 복사한 파생본** — 새 CRDT를 만들면서 호출부가 A의 id를 지정 | **부착 2/2**(offset 58). 단 이것은 **선언된 한계**다 — REPORT §13이 "남의 id를 지정한 새 문서를 만드는 것은 문서 상태 자체를 위조하는 것"이라고 이미 적었다. 정체성이 **bearer claim**임을 확인한 것으로 기록한다 |
| **B5** | **다른 문서의 유효한 capture 이식** — A의 레코드에서 `document` 필드만 B로 바꿔치기 | **부착 1/1**(offset 58, `surviving-characters` 15자). 같은 bearer-claim 계열이며 `loadStore`의 검사는 "레코드 주장 == 스토어 주장"이라 통과한다 |
| **B3** | **id 필드가 없는 옛 레코드** — 문서 A의 v1·v2 주석 파일을 문서 B 옆에 둔다 | **부착 2/2**(v1·v2 둘 다, offset 58, `guardProvenance: unchanged-text`). 위조가 **하나도 필요 없다** — 파일을 옮겨 놓기만 하면 된다 |
| **B7** | 위 B3 상태에서 편집기가 하는 **평범한 일**(load → resolve → save)을 이어서 한다 | **세탁 CONFIRMED**: 저장 결과가 `version: 3`, `anchors.document = {id: doc-B}`, `anchorState: bound`. 그 레코드를 겨냥한 링크를 검사기에 물리면 **exit 0 · PASS · 위반 0 · broken 0** — A의 레코드가 B의 정상 링크 종단점이 됐다 |

원인은 한 줄이다. `src/store.mjs:118` `downgradeAnchors(anchors, version, documentId)`가 정체성
없는 레코드에 **스토어의 documentId를 찍는다**(설계 의도: "스토어 동거는 외부 사실"). 그 뒤
규칙 0은 불일치가 아니므로 통과하고, `src/anchors.mjs:377`의 `unchanged-text` 예외(해소
텍스트가 exact와 완전히 같으면 출처 증거를 더 요구하지 않는다)가 강등 레코드를 부착시킨다.

**판정에서의 취급**: 조건 ①의 **문언**("불일치 레코드를 거절 · M5형 0/3")은 충족됐다 — 이
경로에는 불일치가 없다(레코드가 애초에 정체성을 주장하지 않는다). 그러나 조건의 **목적**
("문서 A의 레코드가 문서 B에 붙지 않는다")은 이 경로에서 깨진다. 나는 내 조건을 사후에
완화하지도, 없던 조항을 소급 적용하지도 않는다 — **문언 충족 / 목적 미충족**으로 둘 다 적고,
차단 해제는 이 경로를 **범위에서 빼는 방식**으로 낸다(§7).

## 3. 조건 ② 재측정 + 우회 창안 (판정 2)

**해제 기준(C1b §8): "M4(SV refill) 프로브에서 오해소 0, 그리고 마이그레이션이 강등 경로만
쓰는지 테스트로 고정".**

### 3.1 재측정 — 기준 충족

| 프로브(무수정) | 변경 전 엔진 | 현행 |
|---|---|---|
| M4 capture-state-vector-refilled-at-migration + 제자리 교체 | **오해소**(`Cure`에 부착, `surviving-characters` 4) | orphan · `content-replaced/unknown/no-character-identity` |
| M4 v1-shaped-record-labelled-v2 | orphan | orphan · `content-replaced/unknown/no-capture` |
| M4b 대조군: v1으로 로드해 강등 | orphan | orphan · `legacy-v1-record` |
| **오해소** | **1** | **0 — 기준 충족** |

"강등 경로만 쓴다"는 **테스트로 고정**됐다: `migrateRecord`(`src/store.mjs:135`)에 승격 분기가
**존재하지 않고**, 스위트 게이트 C2가 실제 파일 5모양을 만들어 `misResolutions 0` ·
`upgradePathExists false`를 매 실행 계산한다(D6). 나도 그 5행을 원시 JSON에서 직접 읽어 확인했다.

### 3.2 ★ 우회 창안 — 신규 CONFIRMED (B4)

| # | 우회 | 결과 |
|---|---|---|
| **B4** | **capture를 통째로 위조** — `characterIds`를 (a) **현재** 교체 범위의 살아있는 문자 4개 + (b) 문서 다른 곳 문자 12개로 채워 저장 `exact`의 16자에 **길이를 맞추고**, `stateVector`는 **현재 값**을 준다 | **오해소 CONFIRMED** — `captureEvidence` 통과(`usable: true, corrupt: false`), `migrateRecord` 강등 **안 함**, `Cure`에 부착(`surviving-characters` 4). 같은 레코드를 파일로 써서 `loadStore`로 읽어도 동일(B4b: `loadRejected false`, `degraded false`, `misResolved true`) |
| B5(재게) | 남의 문서의 유효 capture 이식 | 위 §2.2 |

이 결과는 두 가지를 뒤집는다.

1. **문서의 주장이 과하다.** `README.md:87`과 `src/store.mjs`·`src/anchors.mjs` 머리말은 캡처
   이름표가 "저장된 `exact`와 길이가 맞아야 하므로 **현재 상태에서 베껴 넣을 수 없다**"고
   적는다. **베껴 넣을 수 있다** — 길이가 모자라면 문서 다른 곳 문자로 **padding**하면 되고,
   `stateVector`도 자기보고 값이라 현재 값으로 주면 preexisting 교차검증이 통째로 무력화된다.
   `captureEvidence`의 두 검사는 **부분 위조**(D6의 (b)(c) 모양)만 잡는다.
2. **`upgradePathExists: false`는 "고른 5모양이 승격되지 않았다"는 뜻이다.** 내 B4 모양이 그
   값을 `true`로 뒤집는다(프로브가 `wouldFlipUpgradePathExists: true`로 자기검증). 게이트 문구는
   측정 범위를 넘어 읽히기 쉽다.

**위협 모델 구분(중요)**: B4는 **레코드를 손으로 쓰는 쪽**(공격자·잘못 만든 도구)이 필요하고,
파이프라인(`captureAnchors`→`saveStore`)은 이런 레코드를 만들지 않는다. 조건 ②가 겨냥한
**마이그레이션 실수**는 실제로 닫혔다(길이 검사가 자연스러운 v2→v3 마이그레이션을 잡는다).
REPORT §13은 이미 "악의적 위조는 막지 못한다"고 선언했으므로 **미선언 구멍은 아니다** — 다만
"옛 문서 상태를 가진 공격자"라고 적힌 부분은 실제보다 강한 전제다(B4는 **현재 상태 + 그
레코드**만으로 충분하다). 따라서 조건 ②는 **충족**, 잔여는 **문구 정정 + 다음 레인 과제**다.

## 4. 조건 ③ 확인 (판정 3)

**해제 기준(C1b §8): "이동/병합/분할/undo를 정식 시나리오로 넣고 각 조작의 orphan율을
REPORT에 게시(값 자체는 기준 아님), 링크 UI/모델에 broken-endpoint 상태 존재".**

### 4.1 정식 시나리오 + orphan율 게시 — 충족

`COMMON_OPERATIONS` 6종이 시나리오로 들어왔고(S2 대조군 · S6 · S12a–d), REPORT §5에 조작별
orphan율 표가 게시된다. 내가 원시 JSON에서 다시 센 값이 REPORT 표와 일치한다.

| 조작 | 시나리오 | pipeline orphan | stale orphan | 앵커 텍스트 잔존 |
|---|---|---|---|---|
| 범위 안 삽입 (대조군) | S2 | 0/6 | 0/6 | 1/6 |
| 이동 2-tx (cut+paste) | S6 | 6/6 | 6/6 | 6/6 |
| 이동 1-tx (편집기 이동 명령) | S12a | 6/6 | 6/6 | 6/6 |
| 앞 블록과 병합 (Backspace) | S12b | 0/6 | 6/6 | 6/6 |
| 앵커 시작점 분할 (Enter) | S12c | 0/6 | 4/6 | 6/6 |
| 삭제 후 undo | S12d | 6/6 | 6/6 | 6/6 |
| **합계(대조군 제외)** | | **46/60 레인측정 orphan · 오해소 0** | | |

기대값을 orphan으로 낮추지 않았다(전부 `textExpectation`) — 손실이 표에 남는다. 게이트 C3는
값이 아니라 "측정했는가 · 오해소 0인가 · 대조군은 살아남는가"만 본다(요구와 일치). **비-vacuity
장치도 있다**: S12d는 `ySyncPluginKey`를 origin으로 추적하는 UndoManager를 쓰고 **undo가 실제로
문서를 복원했는지 텍스트로 검증**해 아니면 throw한다(내가 C1b에서 지적한 함정이 반영됐다).

### 4.2 broken-endpoint 상태가 실제로 발동하는가 — 충족 (내가 만들어 확인)

fixture만 믿지 않고 **실제 파이프라인으로 종단점을 끊어** 검사기에 물렸다(B6):

```
앵커 블록 삭제 → anchorStateOf 측정 {a1: bound, a2: orphaned} → saveStore → check_links
→ exit 0 · pass true · violations [] · brokenEndpoints [ln-broken-endpoint:from:orphaned]
```

살아 있는 종단점(a1)은 보고되지 않는다 = 비-vacuous. `anchorState`가 어휘 밖이거나 없으면
**위반**(exit 1)이다(L2: 3개 링크 전부 `annotation-anchor-state-unknown`). 모델·문서에도 존재한다
(`link-store/README.md` "끊긴 종단점" 절, `fixtures/link-plane/README.md`).

### 4.3 ★ 우회 — 신규 CONFIRMED (L1): 중복 documentId가 끊김을 **조용히 은폐**한다

| 케이스 | 결과 |
|---|---|
| L1 두 주석 스토어가 **같은 `documentId`** 선언, 같은 레코드 id (한쪽 `orphaned`, 한쪽 `bound`) — orphan 먼저 | exit 0 · **brokenEndpoints 0** ← 끊김이 사라졌다 |
| L1b 같은 데이터, **인자 순서만 반대** | exit 0 · brokenEndpoints 1 |

`check_links.py:306`의 색인이 `bound[(documentId, recordId)]`에 **덮어쓰기**만 하고 중복
documentId를 위반으로 보지 않는다. 그리고 같은 id를 가진 문서가 둘 생기는 것은 **사고로
도달 가능**하다 — B2가 확인한 대로 **CRDT 상태를 복사하면 documentId가 따라간다**(즉 "문서
복제" 기능·백업 복원이 곧 같은 id의 두 스토어다). 조건 ③이 막으려던 것이 "조용한 재지정"
이었다면, 여기서는 **조용한 은폐**가 남아 있다(문언 밖이지만 같은 목적).

부수로 확인한 낮은 등급 결함 하나: **L4** — 레코드의 `anchors.document.id`가 스토어의
`documentId`와 달라도 검사기는 아무 말도 하지 않는다(`bound` 색인이 스토어 값만 쓴다). JS
`loadStore`는 이 불일치를 거절하므로(C-f) 편집기 경로는 막히지만, **커밋 게이트인 검사기는
못 본다**.

## 5. F1 확인 (판정 4) — 해소

| 시험 | 결과 |
|---|---|
| 실제 `tools/plane-editor/sample-state/annotations.json`(v3, 6레코드, `documentId: doc-sample-state`)에 링크를 물림 | **PASS · exit 0 · 위반 0** — Phase 2 F1의 "exit 2로 통째 거절"이 사라졌다 |
| v1 스토어 | 읽힌다(2레코드) · 종단점은 `annotation-store-unbound`로 **거절**(exit 1) |
| v2 스토어 | 동일 |
| 읽을 수 없는 버전: 99 / 4 / 0 / `"3"`(문자열) / 필드 없음 | **전부 exit 2 + 명시 사유**(`version … is outside the readable set [1, 2, 3]`) |
| v3인데 `documentId` 선언 없음 | exit 2 + 사유(`a version 3 annotation store must declare its 'documentId'`) |
| 주석 평면이 읽을 수 있는 집합을 넘어서면 | 코드에 드리프트 알람 존재(`annotation_plane_version()`; 현재 평면 v3 == 집합 안이라 미발동) |
| 대소문자·앞뒤 공백으로 document 참조 우회 | `endpoint-document-mismatch`(exit 1) — 조용히 정규화하지 않는다 |

버전 소유권도 문서·코드 양쪽에서 정정됐다: 검사기 자기 상수 `STORE_VERSION = 1`은 이제
**links/decisions에만** 적용되고, 주석 스토어는 `ANNOTATION_STORE_VERSIONS = (1, 2, 3)` ·
`ANNOTATION_BINDING_VERSION = 3`으로 **협상**한다(F1의 "남의 모듈 상수 복제" 지적 해소).

## 6. 무회귀 · 게이트 · 경계 (판정 5)

**시나리오 × 레인 1:1 대조** — `git show HEAD:…/suite-result.json`과 비교했다.

| 축 | 기준 | 실측 |
|---|---|---|
| 기존 15개 시나리오 × 3레인 (survived/orphaned/drifted/wrong) | HEAD와 동일 | **15/15 전부 동일** (S1–S11e) |
| S1–S4·S8 pipeline | 30/30 | **30/30**, 드리프트 0, orphan 0, wrong 0 |
| 같은 범위 stale | ≥93.3% | **28/30 (93.3%)**, 드리프트 2(S4 a1·a2 1자), wrong 0 |
| S9·S10 | 오해소 0 | 12시행 · orphan 36 · **wrong 0** (HEAD와 동일) |
| S11a–e | 오해소 0 | 30시행 · orphan 90 · **wrong 0** (HEAD와 동일) |
| 전 시나리오·전 레인 오해소 | 0 | **0** (19시나리오 × 3레인, 336 측정) |
| 반사실 오해소 (막은 값) | — | textmove 36 · phase1 74 · naive 76 — **HEAD와 동일** |
| bystander | wrong 0 | 540건 중 ok 517 · 잔여 1 · orphan 22 · **wrong 0** (증가분 120건은 전부 S12 신규분) |
| G1 스키마 순수성 | annotation 타입 0 | `schema-dump.json` 해시가 Phase 1·C1·C1b와 **동일**; 문서 meta 맵 키는 `documentId` 하나뿐(`metaIsIdentityOnly: true`) |
| 링크 검사기 negative control | 전부 FAIL 유지 | **11/11** exit 1 + 정확히 그 위반 1건 (기존 8 + 신규 3: document-missing·document-mismatch·anchor-state-unknown) |
| 링크 검사기 positive control | PASS | link-store 7링크 · control fixture 4링크 exit 0 |
| 결정론 | 3회 byte-identical | 스위트 3회 + 디스크본 동일 · `check_links.py` 3회 JSON 동일 |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 위반 0(손저작 71파일) + **내 전수 스캔**(node_modules 제외 77파일) 결과 정책 밖 문자는 §·en dash 같은 문장부호와 vendored `package-lock.json`의 이모지뿐 — 다른 언어 0 |
| 경계 | 담당 경로 밖 변경 0 | `git diff --stat HEAD -- tools/*.py ONTOLOGYSTYLE.md` **빈 출력**; `tools/` 변경은 전부 `tools/plane-editor/` 안(38 modified + 7 untracked). `ontology/**`·`docs/feedback/**` 변경은 병행 lane 소유로 이 dispatch와 무관 |
| 내 판정이 트리를 오염시켰는가 | 0 | 판정 종료 시 5개 산출물 해시가 §1 표와 동일 |

## 7. ★ 차단 해제 결론 (판정 6)

**결론: (b) 조건부 해제.**

> **파이프라인이 만든 v3 주석 스토어에 한해** 앵커를 링크 종단점으로 바인딩해도 된다.
> **옛(v1·v2) 스토어에서 온 레코드는 바인딩 대상에서 제외한다** — 아래 N-1을 수치로
> 만족시키면 그 제외도 해제한다.

근거를 셋으로 나눈다.

1. **내가 세운 세 조건은 전부 충족됐다** — 완화 없이 같은 수치 기준으로 확인했고(§2.1·§3.1·§4),
   변경 전 엔진 대비 비-vacuity도 실측했다(M5 2/3→0/3, M4 1→0). F1도 닫혔다(§5).
   **그러므로 (c) 유지는 부당하다.**
2. **(a) 무조건 해제도 부당하다.** 차단 사유는 "링크가 틀린 곳을 가리킨다"였고, **위조 없이
   도달하는 경로가 아직 하나 남아 있다**: 옛 주석 파일이 남의 문서 옆에 놓이면 → 그 문서의
   id가 찍히고 → 해소되고 → **재저장되면 v3 종단점이 되어 검사기를 통과한다**(B3→B7, exit 0).
   "v1·v2는 바인딩 못 한다"는 울타리는 **open/save 한 번을 못 견딘다**.
3. **그래서 범위를 좁힌 해제가 정확하다.** 파이프라인이 캡처·측정해 쓴 v3 레코드에는 이
   경로가 없다(정체성은 `captureAnchors` 시점에 실리고, 없으면 캡처 자체가 거절된다 — C-h).
   문제는 **정체성 없는 레코드를 문서가 입양하는 것**이지 종단점 모델이 아니다.

| # | 남은 조건 | 지금 값 (실측) | 해제 기준(수치) |
|---|---|---|---|
| **N-1** | **정체성 없는 레코드의 입양 금지** — v1·v2 레코드에 스토어 documentId를 찍지 말거나(또는 찍되 `adopted` 표시가 해소·바인딩을 막을 것), 재저장이 그 표시를 지우지 말 것 | B3: cross-document 부착 **2/2**(v1·v2) · B7: 세탁 후 링크 바인딩 **성공**(exit 0, PASS, broken 0) | B3형 프로브에서 cross-document 부착 **0/2**, B7 세탁 경로에서 링크 종단점 바인딩 **0건**(검사기가 거절하거나 해소가 orphan) |
| **N-2** | **중복 documentId 금지** — 두 주석 스토어가 같은 documentId를 선언하면 위반으로 보고 | L1: 인자 순서에 따라 brokenEndpoints **1 vs 0**(조용한 은폐) | 중복 documentId가 위반(exit 1)이고, L1/L1b **두 순서의 verdict JSON이 동일** |
| **N-3** | **위조 내성 문구 정정 또는 방어** — "현재 상태에서 베껴 넣을 수 없다"(README:87, store.mjs·anchors.mjs 머리말)와 `upgradePathExists` 문구의 사정거리를 실측에 맞출 것 | B4: padding 위조로 오해소 **1건**(loadStore 통과·강등 안 됨) | B4형 위조에서 오해소 **0**, **또는** 문서가 "길이 padding + SV 자기보고로 우회 가능"을 명시하고 D6에 그 모양을 6번째 케이스로 추가 |
| N-4 (비차단) | 검사기가 레코드의 `anchors.document.id`와 스토어 `documentId`를 대조하지 않음 | L4: 불일치인데 PASS(exit 0) | 불일치를 위반으로 보고 |

N-1·N-2·N-3·N-4는 **전부 `tools/plane-editor/` 안에서 닫힌다**(developer dispatch 1회 분량).

## 8. 비차단 관측

1. **placement 계측기의 사정거리가 절반이다.** 스위트의 `placement.measured`는 38인데, 실제
   부착은 86건(pipeline+stale)이고 그중 `landedOffset` 필드 자체가 없는 것이 24건(S7·S8
   전부)이다. 내 독립 위치 채점은 74건(문서 텍스트가 있는 전부)을 덮었고 **제자리 밖 부착 0**
   이었으므로 결함은 아니지만, "제자리 밖 부착 0/38"이라는 문장은 측정 범위를 밝혀야 한다.
2. **README와 코드의 소수 불일치**: README는 D6가 "증거 채워넣기 **4모양**"을 만든다고 적지만
   코드는 위조 5모양 + 대조군 1이다(`forgedShapes: 5`).
3. **정체성은 bearer claim이다.** B1(같은 id로 새 문서)·B5(document 필드 바꿔치기)는 둘 다
   부착에 성공하며, 이는 REPORT §13이 이미 선언한 한계다. 서명·무결성 태그가 없는 한 이
   축은 닫히지 않으므로, **링크 종단점의 신뢰 경계를 문서로 못 박는 편**이 낫다("스토어 파일을
   쓸 수 있는 주체는 그 문서의 주석을 임의로 주장할 수 있다").
4. **C1b §9의 권고 중 하나는 이번에도 미반영**: "90 측정은 60 독립 계산"(`mode: preserved`면
   pipeline이 stale 결과를 재사용) 표기. 이번 실행에서도 S11·S12 계열은 같은 성질이다.
5. **`counts.graphNodes`(=364)가 검사기 JSON에 그대로 실린다**(Phase 2 F6 유지). 병행
   ontology lane이 개체를 늘리면 값이 바뀌므로 이 JSON을 골든 산출물로 커밋하면 안 된다.
