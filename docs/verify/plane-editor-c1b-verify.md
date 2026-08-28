---
verdict: pass-with-notes
target: tools/plane-editor/ (C1b — 앵커 provenance 4종 해소: itemId 정체성 대조 / 원격 freshness 교정 / 출처 미상 거절 / STORE_VERSION 2 + S11 시나리오군)
criteria: docs/verify/plane-editor-c1-verify.md §5가 CONFIRMED한 N1·N1b·N3·N4·N8 폐쇄 + 브리프 무회귀 조건(S1–S10 30/30 · stale ≥93.3% · 전 레인 오해소 0 · S6 복구 6/6)
baseline: docs/verify/plane-editor-c1-verify.md (C1 판정, pass-with-notes)
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
n-probes-rerun: 16행 misResolved 0 (N1·N1b·N3·N4·N8 전부 폐쇄 — 무수정 재실행)
non-vacuous: YES — 변경 전(C1) 엔진을 같은 S11 편집에 돌리면 30시행 중 **25건 오해소**
independent-reruns: 4 (4개 산출물 전부 byte-identical)
new-probes: docs/verify/plane-editor-c1b-adversarial.mjs — 문서 안 편집으로 만든 오해소 **0**, 저장소·문서정체성 축에서 **신규 CONFIRMED 2종**
criterion-miss: S6 복구 6/6 -> **0/6** (실측 확인). 필연성도 독립 검증 — 다만 근거(D3)의 일반화 표현은 과하다
blocking-decision: (b) 조건부 해제 — 아래 §8의 3개 조건을 수치로 만족시키면 앵커를 링크 종단점으로 바인딩해도 된다
---
# 판정 — C1b (앵커 provenance 구멍 해소) 및 차단 해제 여부

**verdict: pass-with-notes.**

- **닫혔다고 주장한 4종은 실제로 닫혔다.** vnv가 C1 판정 때 만든 적대 프로브를 **한 글자도
  고치지 않고** 다시 돌려 16행 전부 `misResolved: 0`을 확인했다(N8은 `misResolvedOnLegacy:false`).
- **강화는 vacuous하지 않다.** 스위트 안 대조군(`textmove`)에 기대지 않고 **변경 전 커밋의
  엔진 자체**(`git worktree`)에 S11a–e 편집을 그대로 먹였다 — **30시행 중 25건이 남의 문장에
  붙는다**. 즉 S11 30시행 중 25건이 판별력 있는 시행이고, 지금은 전부 orphan이다.
- **내가 새로 창안한 적대 프로브(28케이스 + recall 행렬 6조작)에서 문서 안 편집으로 만든
  오해소는 0이다.** 대신 **편집 경로 밖에서 신규 CONFIRMED 2종**을 찾았다: ① 마이그레이션이
  `capture.stateVector`를 현재 값으로 채우면 S10-b4(`Critical failure`→`Cure`) 오해소가
  그대로 부활한다 ② 레코드에 **문서 정체성이 없어** 같은 clientID로 만든 **다른 문서**에
  그대로 붙는다.
- **브리프의 무회귀 조건 중 S6(복구 6/6)만 미달**이다(0/6). developer의 자기보고와 일치하며,
  나도 **HEAD 커밋본 산출물과 대조해 6/6 → 0/6을 직접 확인**했다. 그 미달이 "물리적으로
  불가능"한지도 독립 검증했다 — **결론은 옳고, 근거로 제시된 D3의 표현은 과하다**(§6).

판정 요지: **verification = PASS**(수치·재현·경계 전부 확인), **validation = 조건부 충족**.
C1b는 "블록이 사라진 앵커가 살아남은 동일 텍스트에 붙는다"는 결함 계열을 실제로 닫았고,
남은 위험은 **문서 안 편집이 아니라 저장소 계약(store contract)과 문서 정체성** 쪽으로 옮겨갔다.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology
S=<scratch>/vnv

# ① 독립 재실행 (별 프로세스) + 산출물 해시
for i in 1 2 3; do node tools/plane-editor/run-suite.mjs; \
  cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $S/run$i/; \
  cp tools/plane-editor/sample-state/annotations.json $S/run$i/; done
node tools/plane-editor/run-suite.mjs            # 판정 마지막에 1회 더 (총 4회)
sha256sum $S/run*/*                               # 4회 전부 동일

# ② 원시 시행 독립 재분류 (보고된 outcome 무시)
/usr/bin/python3 $S/rescore.py tools/plane-editor/suite-result.json   # MISMATCH 0

# ③ ★ 비-vacuity — 변경 **전**(C1) 엔진 자체에 S11 편집을 먹인다
git worktree add --detach $S/head-pe HEAD         # HEAD = 765eb54 (C1b 이전)
ln -sfn <abs>/tools/plane-editor/node_modules $S/head-pe/tools/plane-editor/node_modules
node $S/head-counterfactual-s11.mjs $S/head-pe/tools/plane-editor/    # 30시행 중 25건 오해소

# ④ 적대 프로브 — 기존(무수정) + 신규
node docs/verify/plane-editor-c1-adversarial.mjs   # N1~N8 재실행 — misResolved 0
node docs/verify/plane-editor-c1b-adversarial.mjs  # D3'·D3''·M1~M9 (내가 새로 창안)

# ⑤ 무회귀 · 게이트 · 경계
/usr/bin/python3 tools/validate.py            # PASS
/usr/bin/python3 tools/check_determinism.py   # PASS
/usr/bin/python3 tools/lint_uniformity.py     # PASS
git status --porcelain -- tools/plane-editor
git show HEAD:tools/plane-editor/suite-result.json   # S6 회귀 대조용
```

신규 프로브는 `docs/verify/plane-editor-c1b-adversarial.mjs`로 남겼다(내 파일 경계 안).
`tools/plane-editor/`는 **읽기만** 한다 — 실행 후 `git status --porcelain -- tools/plane-editor`가
developer의 11개 파일만 보여준다(내 프로브가 만든 변경 0).

**증거 공백 하나를 명시한다**: 내 첫 재실행이 developer가 디스크에 남긴 4개 산출물을
덮어썼으므로 "developer의 디스크본 == 내 재생성본"을 해시로 직접 대조하지 못했다. 대체 증거는
셋이다 — ⓐ 별 프로세스 **4회** 실행이 전부 byte-identical, ⓑ `schema-dump.json` 해시가 Phase 1·C1
판정 때와 **동일**(`bcfab19be870…`), ⓒ 내 실행의 stdout 게이트 줄이 developer 자기보고의 수치와
글자 그대로 일치. 다음 판정에서는 **재실행 전에 디스크본을 먼저 해시**해야 한다.

## 1. 재현·결정성과 "표 ↔ 원시 데이터" 대조 (판정 1)

| 항목 | 결과 |
|---|---|
| 별 프로세스 4회 실행 | 4개 산출물 전부 sha256 동일 (exit 0) |
| `suite-result.json` | `78e1877b4a156fec999ea9808804e45f8fe319c581b25cf71f843741ed0b3fa7` |
| `REPORT.md` | `c38936d916e588b0771299ee52c1f298e65c52afa57d252e3a9234ec7a1ac79b` |
| `schema-dump.json` | `bcfab19be870f6dc4f285e27d33fd94fd5fbb20812530b277e49af070bd89569` — **Phase 1·C1 판정 때와 동일** = 문서 스키마 무변경(G1 유지) |
| `sample-state/annotations.json` | `da1796d43ce3e55560d5b665b15fdeea0f17b8d6655705bb6c4c85984eb60e7d` |

**REPORT 표 ↔ 원시 시행 재채점: 불일치 0.** 보고된 `outcome`을 무시하고 `lanes[].text` vs
`expected`로 **내 코드로 다시 분류**했다 — 264 레인측정(live 84 + pipeline 90 + stale 90) 전부 일치.

| 레인 | 내 재분류 |
|---|---|
| live | orphaned 60 · survived 24 |
| pipeline | orphaned 54 · survived 36 |
| stale | orphaned 54 · survived 34 · drifted 2 (S4 a1·a2 1자) |

집계 항목도 원시 필드에서 다시 셌고 **REPORT §4와 전부 일치**한다:

| 항목 | 내 재계산 | REPORT 주장 |
|---|---|---|
| 규칙 C 복구 / 거절 | 0 / 72 (`block-gone/block-identity-destroyed` 72) | 복구 0 · 거절 72 |
| 규칙 B collapsed / 제자리 교체 | 12 / 24 (`content-replaced/*` 20+2+2) | 12 / 24 |
| 규칙 A 거절(=phase1 guard였다면 통과) | 12 (S10 6 + S11e 6) | 12 |
| 반사실 오해소 textmove / phase1 / naive | 36 / 74 / 76 | 36 / 74 / 76 |
| 포기한 복구 (textmove) | 12 | 12 |
| bystander 420 | ok 417 · 잔여 1 · orphan 2 · **wrong 0** | 동일 |
| G1 문서 순수성 | `sample-state/document.json`의 prosemirrorJSON에 앵커 id 0건, mark 0건 | 동일 |

## 2. C1b 수치 판정 — 원시 데이터에서 직접 센 값 (판정 1)

| 시나리오 | fixture | 앵커 | 기대 | live | pipeline | stale | **오해소** |
|---|---|---|---|---|---|---|---|
| S11a 쌍둥이 이동 후 앵커 블록 삭제 | s11 | c1–c6 | orphan | O 6 | O 6 | O 6 | **0** |
| S11b 삭제 후 쌍둥이 이동(순서 반대) | s11 | c1–c6 | orphan | O 6 | O 6 | O 6 | **0** |
| S11c 삭제 후 같은 문장 재타이핑 | s11 | c1–c6 | orphan | O 6 | O 6 | O 6 | **0** |
| S11d 원격 피어가 같은 문장 작성 | s11 | c1–c6 | orphan | O 6 | O 6 | O 6 | **0** |
| S11e v1 레코드 + 제자리 교체 | s11 | c1–c6 | orphan | O 6 | O 6 | O 6 | **0** |
| **합계** | | **30 앵커시행** | | **30** | **30** | **30** | **0** |

**시행 수 해석 주의(C1 판정과 동일한 함정)**: S11 전 시행의 `mode`는 `pipeline=preserved`,
`stale=as-attached`다. `preserved`면 pipeline이 stale의 **결과 객체를 재사용**하므로,
"90 레인측정"의 실제 독립 계산은 **30(live Decoration) + 30(저장 selector) = 60**이다.
어느 해석으로도 게이트 문구("시나리오당 ≥2시행 · 전 레인 오해소 0")는 만족한다.

## 3. ★ 비-vacuity — 변경 전 엔진에 같은 편집을 먹였다 (판정 4)

스위트 안 `textmove` 대조군은 **같은 저자가 다시 구현한** 규칙이므로 증거로 약하다.
`git worktree add --detach $S/head-pe HEAD`(=765eb54, C1b 이전)로 **C1 엔진 자체**를 꺼내
S11a–e 편집을 **앵커 6개 전부**에 그대로 먹였다(fixture 파생 규칙은 데이터라 새로 작성).

| 시나리오 | 변경 전 엔진 | 붙은 경로 | 현행(strict) |
|---|---|---|---|
| S11a 쌍둥이 이동 후 삭제 | **6/6 오해소** | `moved-block` | orphan 6/6 |
| S11b 순서 반대 | **6/6 오해소** | `moved-block` | orphan 6/6 |
| S11c 삭제 후 재타이핑 | **6/6 오해소** | `moved-block` | orphan 6/6 |
| S11d 원격 피어 작성 | **6/6 오해소** | `moved-block` | orphan 6/6 |
| S11e v1 레코드 + 제자리 교체 | **1/6 오해소** (b4 `Cure`만) | `relative-position` | orphan 6/6 |
| **합계** | **25 / 30** | | **0 / 30** |

- **C1b가 실제로 막고 있는 양 = 25시행.** S11e의 나머지 5시행은 변경 전에도 orphan이라
  **판별력이 없다** — 게이트 문구가 "30시행"이라고만 쓰면 이 사실이 가려진다.
- **스위트 자체 대조군은 옛 동작을 과소·과대 양쪽으로 어긋나게 잰다.** 스위트의 `textmove`는
  S11d를 **0건**으로 세지만(원격 보정이 들어간 규칙이라서) 실제 옛 엔진은 **6건** 오해소였고,
  `phase1`은 S11e를 12건으로 세지만 실제 옛 엔진은 1건이었다. 즉 **반사실 열은 "옛 엔진"이
  아니라 "그 정책"의 값**이다 — REPORT가 그렇게 적고 있으므로 오류는 아니지만, 차단 해제
  근거로 쓸 수치는 이 §3의 25/30이다.

## 4. 기존 적대 프로브 무수정 재실행 (판정 2)

`node docs/verify/plane-editor-c1-adversarial.mjs` — 16행, **misResolved 0**. (2회 실행 출력 동일)

| 프로브 | C1 판정 | 이번 |
|---|---|---|
| **N1 / N1b** 쌍둥이 블록 이동 + 앵커 블록 삭제(양 순서) | **오해소** | **orphan — 폐쇄** (`block-identity-destroyed`) |
| **N3** 원격 피어가 같은 문장 작성 | **오해소** | **orphan — 폐쇄** |
| **N4** 삭제 후 같은 문장 재타이핑 | **오해소** | **orphan — 폐쇄** |
| **N8** v1 레코드(blockContext 없음) + `Cure` | **오해소** | **orphan — 폐쇄** (`unknown/no-capture-state-vector`) |
| N2 경계를 걸친 앵커 + 제자리 교체 | orphan | orphan (이제 capture가 분리돼 출처를 **읽고** 거절) |
| N5 이동 + 1자 변경 / NFD | orphan(복구 상실) | orphan (동일 — 복구 상실 유지) |
| N6 대조군 순수 삭제 | orphan | orphan |
| N7 범위 안 정상 편집 4종 | 3/4 생존 | 3/4 생존 (`Critical failure`→`Critical outage`는 여전히 orphan) |

## 5. ★ 신규 적대 프로브 (판정 3) — `plane-editor-c1b-adversarial.mjs`

새 규칙의 **전제**를 무너뜨리는 축으로 28케이스 + recall 행렬 6조작을 창안했다. 2회 실행 출력 동일.

### 5.1 문서 안 편집으로는 오해소를 만들지 못했다 (0건)

| 프로브 | 노린 전제 | 결과 |
|---|---|---|
| M1 블록 분할 후 앵커 쪽 절반 삭제(양방향) | "저장 itemId가 live인데 내용은 남의 것" | orphan 2/2 — 우회 실패 |
| M2 블록 병합(join, 양방향) | 살아남은 element에 남의 텍스트가 붙음 | 흡수하는 쪽 정확 생존 / 흡수당하는 쪽 orphan — 오해소 0 |
| M3 undo 3종(블록 삭제·쌍둥이 삭제·범위 삭제 후 undo) | 되살아난 블록에 재부착 | orphan 2 / 정확 생존 1 — 오해소 0 |
| M9 이웃 블록이 **앵커 문구를 포함한 접두를 공유**할 때 앵커 블록 삭제(4변형) | y-prosemirror의 재-diff가 element item을 재사용해 문자 item까지 살아남는 경로 | orphan 3 + 대조군 정확 생존 1 — 오해소 0 |
| M6 블록에 hardBreak·bold mark가 있을 때 범위 안 편집 | `characterOrigins` 커버리지가 깨져 출처 미상 → 거절 폭주 | 3/3 정상 생존 (커버리지 안 깨짐) |
| M7 대조군(범위 안 삽입 / 순수 삭제) | 프로브가 vacuous하지 않음 | 기대대로 2/2 |

### 5.2 ★ 신규 CONFIRMED 2종 — 편집이 아니라 **저장소 계약** 쪽

| 프로브 | 재현 | 결과 |
|---|---|---|
| **M4 마이그레이션이 `capture.stateVector`를 지금 값으로 채움** | 파일 `version`만 2로 올리고 캡처 SV를 **현재 상태**로 채운 레코드 + `Critical failure`→`Cure` | **오해소 CONFIRMED** — `provenance: surviving-characters`, `survivingChars 4`로 guard 통과, `Cure`에 부착. 같은 레코드를 `capture:null`로 두면 orphan(정상), v1로 로드해 강등하면 orphan(정상) |
| **M5 문서 정체성 부재** | 문서 A의 레코드를 **같은 clientID로 만든 다른 문서 B**에 들이댐 | **부착 CONFIRMED** — 동일 재임포트본·**내용이 다른 파생 문서** 둘 다 `relative-position`으로 붙는다. clientID가 다르면 `stored-item-unknown`으로 orphan |

해석:
- **M4는 이번 수정이 만든 표면**이다. 방어의 핵심 항(문자 출처)이 레코드 자신이 들고 있는
  `capture.stateVector`를 **무조건 신뢰**한다. `STORE_VERSION` 2는 파일 안의 정수일 뿐이라,
  "v1을 v2로 올리면서 SV를 채워 넣는" 가장 자연스러운 마이그레이션이 **N8을 그대로
  되살린다**. C1 판정 §5의 "모르면 통과" 기본값을 뒤집었더니, 이제 표적이 "**아무 SV나
  채우면 통과**"로 이동했다. 수정 방향: 캡처 SV가 앵커 자신의 item보다 **뒤일 수 없다**는
  것을 로드 시점에 검사하거나(앵커 item id의 clock < SV[client]), 레코드를 무결성 태그로 묶는다.
- **M5는 링크 종단점 결정에 직접 걸린다.** `annotations.json`에 `document` 필드가 있지만
  **앵커 레코드에는 문서 정체성이 없고**, `resolveAnchors(session, anchors)`는 "이 레코드가
  이 문서 것인가"를 **한 번도 묻지 않는다**. 이 프로토타입은 clientID를 호출부가 고정 상수로
  주므로 id 공간 충돌이 기본값이다. 실서비스에서 clientID는 난수라 확률은 낮지만, **검사
  자체가 없다**는 사실은 링크 평면(link plane)에서 종단점을 (문서, 앵커)로 묶을 때 반드시
  메워야 한다.

### 5.3 recall 행렬 — 흔한 편집 6조작 (오해소 0의 대가)

쌍둥이가 없는 문서(정답 자리가 유일)에서 잰 값. `correct`는 **원래 자리에 붙었는가**.

| 조작 | 편집 후 앵커 텍스트 | strict | textmove | phase1 | naive |
|---|---|---|---|---|---|
| 블록 이동 (cut+paste, 2 트랜잭션) | 문서에 그대로 | **orphan** | 정확 복구 | 정확 복구 | 정확 복구 |
| 블록 이동 (1 트랜잭션 = 편집기 이동 명령) | 문서에 그대로 | **orphan** | orphan | orphan | 정확 복구 |
| 앞 블록으로 병합 (줄 처음에서 Backspace) | 문서에 그대로 | **orphan** | orphan | 정확 복구 | 정확 복구 |
| 블록 삭제 후 **undo** | 문서에 그대로(완전 복원 확인) | **orphan** | 정확 복구 | 정확 복구 | 정확 복구 |
| 앵커 시작점에서 분할(Enter) | 문서에 그대로 | **orphan** | orphan | orphan | 정확 복구 |
| 범위 안 단어 삽입 | 문서에 그대로 | 정확 생존 | 정확 생존 | 정확 생존 | 정확 생존 |

**요약: 6조작 중 strict가 살린 것은 1건.** 5건은 앵커 텍스트가 문서에 그대로 남아 있는데도
orphan이고, 그 5건 전부에서 **더 약한 정책이었다면 옳은 자리에 붙었을 것**이다. 대신
strict의 오해소는 **0**이다. 특히 두 개는 스위트에 시나리오가 없다:
- **undo**: 삭제를 되돌리면 문서는 완전히 복원되지만(내가 `undoActuallyReverted`로 검증)
  Yjs UndoManager는 새 item으로 재삽입하므로 앵커는 **영구 orphan**이다. 편집기에서 가장
  흔한 조작이 종단점을 조용히 끊는다.
- **분할(Enter)**: 앵커 **앞** 어디서든 문단을 쪼개면 뒤쪽 텍스트가 전부 새 item이 되어
  RelativePosition이 `collapsed`로 죽는다. 이건 C1b가 만든 손실이 **아니다**(phase1도 동일).
  다만 스위트가 이 조작을 재지 않아 지금까지 보이지 않았다.

## 6. S6 미달(복구 6/6 → 0/6) — 수치와 **필연성** 검증 (판정 5)

**수치 확인.** `git show HEAD:tools/plane-editor/suite-result.json`의 S6는 pipeline·stale
`recovered 6/6`이고, 현행은 세 레인 모두 `orphaned`다. 시나리오 정의는 **기대값을 낮추지
않았다**(여전히 `textExpectation`) — 즉 실패를 orphan 기대로 바꿔 감추지 않고 `0/6`으로
드러내 놓았다. bystander orphan 2건도 전부 S6이며 wrong은 0이다. **정직한 보고다.**

**필연성 검증(브리프가 요구한 "물리적 불가능" 주장의 검사).**

| 편집 모양 | Yjs delta sha256 | 저장 itemId의 운명 | strict |
|---|---|---|---|
| 이동 = delete 후 insert (2 트랜잭션, 스위트 S6 헬퍼) | `ac8aaf69ba7c6daf…` | deleted | orphan |
| **삭제 후 같은 문장 재타이핑** | `ac8aaf69ba7c6daf…` (**동일**) | deleted | orphan |
| 이동 = 한 트랜잭션(편집기 이동 명령/드래그) | `969927676915e9a6…` (**다름**) | **live** | orphan (`collapsed`) |
| 대조군: 삭제만 | `442333e361e2815f…` | deleted | orphan |

- **D3의 핵심 주장(2-tx 이동 ≡ 재타이핑, byte 동일)은 CONFIRMED다.** developer가 낸
  `1bc10bf43ebb…`와 내 독립 재현의 `ac8aaf69…`는 fixture가 달라 값이 다를 뿐, **두 모양이
  같은 해시로 떨어진다**는 사실은 동일하게 재현된다.
- **그러나 "이동은 언제나 재타이핑과 구분 불가"는 과한 일반화다.** 같은 이동을 **한
  트랜잭션**으로 하면 업데이트가 달라지고 element item이 살아남는다.
- **그럼에도 결론은 유지된다.** 그 살아남은 item을 직접 조회해 보면(D3'' 프로브) item
  `7:38`은 live이지만 **다른 블록의 내용**("Closing block of the probe document.")을 담고
  있다 — 정체성이 보존된 게 아니라 **다른 내용으로 재사용**됐고, 옮겨간 블록은 새 element다.
  즉 `identityEvidenceComplete: false`. **저장된 상태만으로 "어디로 갔는지" 증명할 길은 두
  모양 모두 없다.** 따라서 "오부착 불허 + 의심스러우면 orphan"이라는 절대 원칙 아래에서
  S6 복구 포기는 **정당하다**.
- **권고(비차단)**: `blocks.mjs`·`anchors.mjs` 머리말과 REPORT의 D3 서술을 "**저장된 상태로는
  이동과 재타이핑을 구분할 수 없다**"라는 결론 문장으로 쓰고, 근거인 byte 동일성은 "2-tx
  모양에서 측정됨"으로 **한정**하라. 지금 표현("이동은 byte 단위로 같다")은 반례가 있다.

## 7. 무회귀 · 게이트 · 경계 (판정 5·6)

| 축 | 기준 | 실측 |
|---|---|---|
| S1–S4·S8 pipeline | 30/30 | **30/30**, 드리프트 0, orphan 0, wrong 0 |
| 같은 범위 stale | ≥93.3% | **28/30 (93.3%)**, 드리프트 2(S4 a1·a2 1자), wrong 0 — C1과 동일 |
| 전 시나리오·전 레인 오해소 | 0 | **0** (15 시나리오 × 3레인, 264 측정) |
| S5 범위 전체 삭제 | orphan 6/6 | 6/6 (`collapsed/tombstone-evidence`) |
| S7 병합 수렴 | 6/6 | 6/6 |
| S9·S10 (C1 조건) | 오해소 0 | 12시행 36측정, orphan 36, wrong 0 — 유지 |
| **S6 블록 이동 복구** | **6/6** | **0/6 — 미달**(§6) |
| bystander | wrong 0 | 420건 중 ok 417 · 잔여 1 · orphan 2(둘 다 S6) · **wrong 0** |
| G1 스키마 순수성 | annotation 타입 0 | `schema-dump.json` 해시가 Phase 1·C1과 **동일**; document.json prosemirrorJSON에 앵커 id·mark 0 |
| G5 언어 | 한글·영어만 | 스위트 스캔 위반 0 (손저작 20파일) |
| repo 게이트 | 3종 PASS | `validate.py` PASS · `check_determinism.py` PASS · `lint_uniformity.py` PASS |
| 경계 | 담당 파일 밖 변경 0 | tracked 변경은 developer의 11파일뿐(`README·REPORT·run-suite·annotations·src/{anchors,blocks,report,scenarios,session,store}·suite-result`). 병행 dispatch 소유(`check_links.py`·`run-link-checks.mjs`·`src/{link-plane,decision-plane}.mjs`·`link-store/`·`fixtures/link-plane/`)는 **untracked**라 diff에 섞이지 않는다. `ontology/**`·`ONTOLOGYSTYLE.md`·`tools/lint_uniformity.py`·`docs/feedback/**` 변경은 **병행 ontology lane 소유**로 이 dispatch와 무관 |

저장 계약 확인(부수): `sample-state/annotations.json`은 `version: 2`, 앵커 키가
`relativePosition·textQuote·capture·blockContext`로 분리돼 있고 `capture.stateVector`가
블록 문맥 **밖**에 있다 — README의 "저장 버전 2" 서술과 일치.

## 8. ★ 차단 해제 결론 (판정 7)

**결론: (b) 조건부 해제.** 앵커를 링크 종단점으로 바인딩해도 되지만, 아래 세 조건을
**수치로** 만족시킨 뒤여야 한다. 근거는 두 가지다 — ① 차단 사유였던 "링크가 틀린 곳을
가리킨다"는 위험은 **문서 안 편집 축에서 실측으로 사라졌다**(옛 엔진 25/30 → 현행 0/30,
N1–N8 0, 내 신규 28케이스 0) ② 남은 위험은 **문서 안 편집이 아니라 저장소·문서 정체성
축**이며, 그 축은 링크 평면이 어차피 새로 정의해야 하는 계약이다.

| # | 조건 | 지금 값 | 해제 기준(수치) |
|---|---|---|---|
| 1 | **문서 정체성 바인딩**: 앵커 레코드/링크 종단점이 문서 id(+fragment, 문서 지문)를 싣고, 해소 진입점이 불일치 레코드를 거절 | 검사 없음 — M5에서 3케이스 중 **2건이 다른 문서에 부착** | M5형 프로브에서 cross-document 부착 **0/3** |
| 2 | **저장소 계약 무결성**: `capture.stateVector`가 캡처 이벤트에 묶여 있어야 한다(앵커 item의 clock보다 앞선 SV만 유효, 또는 레코드 무결성 태그). 마이그레이션은 SV를 **채우지 말고** 강등해야 한다 | `version:2`만 보고 SV를 무조건 신뢰 — M4에서 **오해소 1건 부활** | M4(SV refill) 프로브에서 오해소 **0**, 그리고 v1→v2 마이그레이션 스크립트가 강등 경로만 쓰는지 테스트로 고정 |
| 3 | **끊긴 종단점의 가시성 + orphan 예산**: 링크는 orphan 앵커를 **명시적으로 끊긴 상태**로 표시해야 하고(조용한 재지정 금지), 흔한 편집의 orphan율을 스위트가 재야 한다 | 스위트에 undo·join·split 시나리오 **없음**; 내 측정으로 흔한 6조작 중 **5건 orphan** | 이동/병합/분할/undo를 정식 시나리오로 넣고 각 조작의 orphan율을 REPORT에 게시(값 자체는 기준 아님), 링크 UI/모델에 broken-endpoint 상태 존재 |

- 조건 1·2는 `tools/plane-editor/` 안에서 끝난다. 조건 3의 앞부분(시나리오 추가)도 마찬가지고,
  뒷부분(끊긴 종단점 상태)은 링크 평면 설계에 넣을 항목이다.
- **(a) 무조건 해제를 택하지 않은 이유**: M5는 "링크 종단점이 다른 문서를 가리킨다"는,
  차단 사유와 **같은 종류의** 오류를 아직 허용한다. 링크는 문서 경계를 넘나드는 객체라
  이 검사가 없으면 앵커 축에서 얻은 안전이 링크 축에서 새어 나간다.
- **(c) 유지를 택하지 않은 이유**: 문서 안 편집 축에서는 요구된 조건이 실측으로 충족됐고
  (25/30 → 0), 남은 결함은 앵커 해소 규칙이 아니라 **저장소·바인딩 계약**의 문제다.
  같은 규칙을 더 조이면 recall만 더 잃고(§5.3에서 이미 5/6 orphan) 위험은 안 줄어든다.

## 9. 비차단 관측

1. **정밀도만 재는 게이트는 이제 한계에 왔다.** C1b는 precision을 올리려고 recall을 계속
   깎았고(§5.3), 스위트는 그 대가를 `S6 0/6`과 `forgone 12` 두 숫자로만 본다. 다음 조건문은
   "오해소 0"과 함께 **"흔한 편집 N종의 orphan율"** 을 같이 고정하는 편이 낫다.
2. **`textmove` 대조군을 "옛 엔진"으로 읽지 말 것.** §3에서 보였듯 실제 옛 엔진과 값이
   양쪽으로 어긋난다(S11d 0 vs 6, S11e 12 vs 1). REPORT는 정책 이름으로 정확히 적고 있으므로
   결함은 아니지만, 인용될 때 오해되기 쉽다.
3. **"90 측정"은 60 독립 계산**이다(§2). C1 판정에서 낸 권고("독립 계산 N회로 표기")가
   아직 반영되지 않았다.
4. **판정 절차 개선점(내 쪽)**: 재실행 전에 디스크본을 먼저 해시할 것(§0의 증거 공백).
