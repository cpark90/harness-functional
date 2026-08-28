---
verdict: pass-with-notes
target: tools/plane-editor/ (앵커 오해소 강화 — S9·S10 추가 + tombstone/affixGuard 수정)
criteria: docs/verify/plane-editor-wave-synthesis.md §2 조건 **C1** (S9·S10 전 레인 오해소 0 / ≥12 시행)
baseline: docs/verify/plane-editor-phase1-verify.md note 3·4 (CONFIRMED 오해소 2종)
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
c1: MET (문자 그대로) — S9+S10 12 앵커시행 · 36 레인측정 · 오해소 0 · orphan 36
non-vacuous: YES — 실제 HEAD(변경 전) 엔진을 같은 fixture·편집에 돌리면 12시행 중 9건 오해소
independent-reruns: 3 (byte-identical, 커밋본 1304c6c 아티팩트와 4/4 해시 일치)
adversarial: docs/verify/plane-editor-c1-adversarial.mjs (N1·N1b·N2~N8) — **신규 오해소 4종 CONFIRMED**
---
# 판정 — C1 (앵커 오해소 근절) 차단 조건 해소 여부

**verdict: pass-with-notes.**

- **C1은 문자 그대로 충족됐다.** S9(블록 통째 삭제)·S10(제자리 텍스트 교체)이 정식 시나리오로
  들어왔고, 두 시나리오 **12 앵커시행 × 3레인 = 36 측정에서 오해소 0 / orphan 36**이다.
  내가 원시 시행에서 독립 재분류한 값과 `REPORT.md`·`suite-result.json`의 값은 **불일치 0**이며,
  3회 독립 재실행 산출물은 커밋본과 **byte 단위로 동일**하다.
- **강화는 vacuous하지 않다.** 스위트 안의 반사실 계측(phase1 18건)에 기대지 않고,
  **변경 전 커밋(`bcd201e`)의 엔진 자체**를 같은 twin fixture·같은 편집에 돌려 확인했다 —
  12시행 중 **9건이 실제로 남의 문장에 붙는다**(S9 b1·b2·b5, S10 b1–b6). 저장 selector 레인이
  둘이므로 18 레인측정 = 스위트가 보고한 phase1 반사실 18과 정확히 일치한다.
- **그러나 "오해소 근절"은 여전히 S9·S10의 모양 안에서만 참이다.** 새로 창안한 적대 케이스에서
  **오해소 4종이 재현**됐다 (N1/N1b·N3·N4 = 규칙 C 우회, N8 = Phase 1 레코드 하위호환).
  이 중 3종은 변경 전 엔진에서도 오해소이므로 **회귀가 아니라 남은 구멍**이고, N8은 이번 수정이
  **데이터(3번째 selector) 의존**이 되면서 새로 생긴 호환성 구멍이다.

판정 요지: **C1 게이트(수치 기준) = PASS**, **C1의 목적(앵커를 링크 종단점으로 써도 되는가)
= 부분 충족**. 아래 §5의 잔여 4종을 orchestrator가 (a) Phase 2 브리프에 측정 항목으로
승계하거나 (b) C1을 S11로 확장한 뒤 차단 해제할지 결정해야 한다.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology

# ① 독립 재실행 3회 + 산출물 해시 (별 프로세스, repo root)
for i in 1 2 3; do node tools/plane-editor/run-suite.mjs; \
  cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $S/run$i/; \
  cp tools/plane-editor/sample-state/annotations.json $S/run$i/; done
sha256sum $S/run*/*                                     # 3회 동일
for f in suite-result.json REPORT.md schema-dump.json sample-state/annotations.json; do \
  git show HEAD:tools/plane-editor/$f | sha256sum; done # 커밋본과도 4/4 동일

# ② 원시 시행 독립 재채점 (reported outcome 무시, text/expected로 재분류)
node $S/rescore.mjs                                     # MISMATCH 0건

# ③ ★ 진짜 반사실 — 변경 **전** 엔진을 같은 fixture·편집에 돌린다
git worktree add --detach $S/head-pe HEAD               # 당시 HEAD = bcd201e (C1 이전)
ln -s <abs>/tools/plane-editor/node_modules $S/head-pe/tools/plane-editor/node_modules
node $S/head-counterfactual.mjs                         # 12시행 중 9건 오해소

# ④ 적대 프로브 — 기존(무수정) + 신규
node docs/verify/plane-editor-phase1-adversarial.mjs    # P1–P7 재실행
node docs/verify/plane-editor-c1-adversarial.mjs        # N1·N1b·N2–N8 (내가 새로 창안)

# ⑤ 무회귀 · 경계
/usr/bin/python3 tools/validate.py                      # PASS
/usr/bin/python3 tools/check_determinism.py             # PASS
/usr/bin/python3 tools/lint_uniformity.py               # PASS
git diff --stat HEAD -- . ':(exclude)tools/plane-editor'
```

신규 프로브는 `docs/verify/plane-editor-c1-adversarial.mjs`로 남겼다 (repo root에서
`node`로 바로 실행, `tools/plane-editor/`를 **읽기만** 한다 — 실행 후
`git status --porcelain -- tools/plane-editor` 빈 출력로 확인).

## 1. 재현·결정성 (판정 1)

| 항목 | 결과 |
|---|---|
| 별 프로세스 3회 실행 | 4개 산출물 전부 sha256 동일 (exit 0) |
| `suite-result.json` | `7af8fcf32e64d275808d19dbf896eab6d8a34d9ebce30ae6606604c8b9a05a77` |
| `REPORT.md` | `b2b8e00c8a150b55b334834955da7088738fdb18d37ee6ec2d3e7104bf2b7eed` |
| `schema-dump.json` | `bcfab19be870f6dc4f285e27d33fd94fd5fbb20812530b277e49af070bd89569` — **Phase 1 판정 때의 해시와 동일** = 문서 스키마 무변경(G1 유지) |
| `sample-state/annotations.json` | `ff3a5d4ae45f36e9d8e720a4a5cddf0dac0b0381d1669b1f7779bba813d475c4` |
| 커밋본 대조 | 4/4 모두 `git show HEAD:…`와 일치 = developer가 낸 표를 내가 byte 단위로 재생산 |

**REPORT.md 표 ↔ 원시 시행 재채점: 불일치 0.** 보고된 `outcome`을 무시하고
`lanes[].text` vs `expected.text`로 다시 분류한 결과가 174 측정 전부에서 일치했고,
레인 합계(pipeline 36/6/18/0, stale 34/6/18/0+드리프트2, live 24/0/30/0)와 bystander 270건
(ok 269 / 잔여 1 / orphan 0 / wrong 0)도 §3 표와 일치한다.

**위치 채점 재확인**: 기대 문자열이 편집 후 문서에 2회 이상 등장하는 시행 **14건**을 골라
`from = textOffset + blockIndex + 1`로 역산했다 — 14/14가 유일 후보로 풀리고 전부 **옳은 출현**
(S6 a6은 이동한 블록 쪽 360, 나머지는 원 출현). **텍스트 채점이 감춘 오부착 0.**

## 2. C1 판정 — 원시 데이터에서 직접 센 값 (판정 2)

| 시나리오 | fixture | 앵커 | 레인 | 기대 | S | R | D | **O** | **X(오해소)** | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|
| S9 블록 통째 삭제 | twin | b1–b6 | live | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| S9 | twin | b1–b6 | pipeline | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| S9 | twin | b1–b6 | stale | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| S10 제자리 교체 | twin | b1–b6 | live | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| S10 | twin | b1–b6 | pipeline | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| S10 | twin | b1–b6 | stale | orphan | 0 | 0 | 0 | 6 | **0** | 6/6 |
| **합계** | | **12 앵커시행** | 3레인 | | 0 | 0 | 0 | **36** | **0** | **12/12** |

**C1 충족 여부(한 줄 결론): 충족 — S9·S10 합산 12 앵커시행(요구 ≥12) · 전 레인 오해소 0
(orphan 36/36), 내가 원시 시행에서 직접 센 값이다.**

시행 수 해석 주의: S9·S10은 편집 후 앵커가 이미 orphan이라 저장 모드가 `preserved`이고,
그때 `pipeline`은 `stale`과 **같은 해소 결과를 재사용**한다(`scenarios.mjs` runPerAnchor).
따라서 36 레인측정의 실제 독립 계산은 **12(live Decoration) + 12(저장 selector)** 다.
어느 해석으로도 "≥12 시행"과 "전 레인 오해소 0"은 만족한다.

twin fixture는 함정으로서 유효하다(vacuous fixture 아님): 11블록 중 1·3번이 **완전히 같은
문장**이고, 앵커마다 살아남는 쌍둥이의 성격이 다르다 — 동일 문맥(b1)·다른 문맥(b2)·한쪽
affix만 맞음(b5)·쌍둥이 없음(b3·b4·b6). S10의 교체어도 `Alpha beta`→`Amazing…`(첫 글자 1자
공유), `Critical failure`→`Cure`(앞 1 + 뒤 3자 공유)로 Phase 1 guard의 실패 지점을 정확히 겨눈다.

## 3. 강화가 vacuous하지 않은가 (판정 3)

### 3.1 ★ 스위트 밖에서 잰 진짜 반사실 — **변경 전 엔진 실행**

스위트 안의 `POLICIES.phase1`은 같은 저자가 다시 구현한 대조군이므로 그것만으로는 증거가
약하다. `git worktree add --detach HEAD`(당시 `bcd201e`, C1 이전 커밋)로 **Phase 1 엔진 자체**를
꺼내 같은 twin fixture·같은 S9/S10 편집을 돌렸다 (저장 selector 레인 = stale 상당).

| 시나리오 | 앵커 | 변경 전 엔진 결과 | 붙은 텍스트 | 채택 경로 |
|---|---|---|---|---|
| S9 | b1 | **오해소** | `disputed clause` (남은 쌍둥이 문장) | `both-affix` |
| S9 | b2 | **오해소** | `honest orphan` (다른 문장) | `both-affix` |
| S9 | b5 | **오해소** | `standoff model` (다른 문장) | `unique-one-affix` |
| S9 | b3·b4·b6 | orphan | — | 후보 없음 |
| S10 | b1·b2·b5 | **오해소** | 각 quote의 다른 출현 | `both-affix` / `unique-one-affix` |
| S10 | b3 | **오해소** | `Amazing unrelated content here` | guard head 1 통과 |
| S10 | b4 | **오해소** | `Cure` | guard head 1 + tail 3 통과 |
| S10 | b6 | **오해소** | `finally something unrelated` | guard head 5 통과 |
| **합계** | | **12시행 중 9건 오해소** | | |

앵커 9개 × 저장 selector 2레인 = **18** = 스위트가 보고한 `blockedMisResolutions.phase1 = 18`과
정확히 일치한다. 즉 **스위트의 반사실 계측은 자기 유리한 재구현이 아니라 실제 과거 동작과 같다.**
S9의 b3·b4·b6은 변경 전에도 orphan이었으므로 12시행 중 **9건이 판별력 있는 시행**이다.

### 3.2 규칙별 발동 횟수 (원시 데이터 재집계, 저장 selector 레인 기준)

| 규칙 | 발동 | 내 재집계 | REPORT §4 주장 | 대조 |
|---|---|---|---|---|
| A 구조적 affix guard | 거절 | 12 (그중 phase1 guard였다면 통과 **6**) | "거절 6건(Phase 1 guard였다면 통과했을 시행)" | 일치 |
| B 삭제 증거 | orphan 확정 | collapsed 12 + 제자리 교체 12 = **24** | "24건 (collapsed 12, 제자리 교체 12)" | 일치 |
| C 블록 정체성 | 복구 12 / 거절 12 | S6 moved-block 12 · S9 block-gone 12 | "복구 12건·거절 12건" | 일치 |
| 문서 전역 quote 복구 | **0** | strict 정책에서 한 번도 안 씀 (120 레인측정) | §4가 대조 정책으로만 표기 | 일치 |

특히 S10 b4(`Critical failure`→`Cure`)는 **문자열 구조만으로는 통과**한다
(agreement 4 / required 4). 실제로 막은 것은 **문자 출처 항**(`survivingChars: 0`)이다 —
CRDT 항이 load-bearing임이 수치로 증명된다. 동시에 그 항은 §5의 N8이 보이듯 **레코드에
`blockContext`가 있을 때만** 작동한다.

## 4. 기존 적대 프로브 재실행 (P1–P7, 무수정)

| 프로브 | Phase 1 판정 | 이번 결과 |
|---|---|---|
| P1 S6/a6 위치 채점 | 정확 부착(360) | 정확 부착(360), 경로 `moved-block` |
| P2 중복 문장 + 블록 이동 | 정확 부착(187) | 정확 부착(187), 경로 `moved-block` |
| **P3 블록 통째 삭제 (2케이스)** | **오해소 2건** | **orphan 2건 — 해소됨** |
| **P4 제자리 교체 (`Amazing…`)** | **오해소** | **orphan — 해소됨** (guard head 1/agreement 1 < required 10) |
| P4 대조군 (`Zebra…`) | orphan | orphan (변화 없음) |
| P5 S5 + 동일 문맥 쌍둥이 | orphan | orphan (naive면 붙음 — 대조 유지) |
| P6 중첩 노드 4케이스 | 4/4 정상 | 4/4 정상 |
| P7 delete set 구분 | 삭제·이동 모두 tombstone | 동일. 단 이제 **블록 정체성**으로 갈라 이동만 복구 |

Phase 1의 CONFIRMED 결함 2종은 **재현되지 않는다**.

## 5. ★ 신규 적대 프로브 — 잔여 취약점 (판정 4)

`docs/verify/plane-editor-c1-adversarial.mjs`. 강화 규칙의 **전제**를 무너뜨리는 편집을 주입했다.
결정론 확인(2회 실행 출력 동일), 대상 디렉토리 무수정.

| 프로브 | 편집 모양 | 결과 | 변경 전 엔진 |
|---|---|---|---|
| **N1** | 앵커 블록 **삭제** + 텍스트가 같은 **쌍둥이 블록을 이동**(cut+paste) | **오해소 CONFIRMED** — `matches 1 / fresh 1`로 `moved-block` 복구가 걸려 남의 블록(offset 134)에 부착 | 동일하게 오해소(text-quote) |
| **N1b** | N1의 편집 순서 반대 | **오해소 CONFIRMED** (순서 산물 아님) | — |
| N1b′ | 쌍둥이를 **고친 뒤** 이동 | orphan (텍스트 불일치로 탈락) | — |
| **N3** | 원격 피어(다른 clientID)가 **같은 문장 블록을 새로 작성** + 작성자는 앵커 블록 삭제 | **오해소 CONFIRMED** — 캡처 state vector에 없는 client는 `isCreatedAfter`가 무조건 fresh로 판정(`blocks.mjs:50-55`) | 동일하게 오해소 |
| **N4** | 앵커 블록 삭제 후 **같은 문장을 다시 타이핑** | **오해소 CONFIRMED** — "삭제 후 재작성"이 규칙 C의 이동 조건을 그대로 만족 | 동일하게 오해소 |
| **N8** | **Phase 1이 저장한 레코드**(`blockContext` 없음)로 S10 b4 편집 재현 | **오해소 CONFIRMED** — `Critical failure`→`Cure`가 다시 통과. 같은 편집을 새 레코드로 하면 orphan | 동일 |
| N2 | 블록 경계를 걸친 앵커 + 제자리 교체 (문자 출처 증거 `known:false` 경로 노림) | orphan — **우회 실패**. 경계를 지우면 RelativePosition이 `unresolved`가 되어 규칙 C로 빠지고, blockContext가 없어 복구를 시도하지 않는다 | — |
| N5 | 블록 이동 + 도착지에서 1자 추가 / NFD 정규화 | orphan (오해소 아님) — **복구 상실**. 변경 전 엔진은 quote로 복구했다 | 복구됨 |
| N6 | 대조군: 쌍둥이·새 블록 없는 순수 블록 삭제 | orphan (정상) | — |
| N7 | 앵커 **범위 안** 정상 편집 4종 | 3/4 생존, 1/4 **복구 상실**(`Critical failure`→`Critical outage`가 이제 orphan; agreement 10 < required 15) | 4/4 생존 |

### 5.1 결함 해석

- **N1·N3·N4는 같은 뿌리**다. 규칙 C는 "**텍스트가 같고 캡처 이후 새로 생긴 블록이 유일**"이면
  이동으로 본다. 그런데 그 조건은 **블록의 정체성이 아니라 텍스트 동일성**이다. 저장된
  `blockContext.itemId`는 기록되기만 하고 **후보 블록과 대조되지 않는다**(`anchors.mjs:316-357`).
  cut+paste가 새 item을 만든다는 사실은 "이동"의 필요조건일 뿐 충분조건이 아니어서,
  **삭제된 앵커 + 어디선가 새로 생긴 동일 텍스트 블록** 조합이면 전부 붙는다.
  `anchors.mjs:36-39`의 "살아남은 쌍둥이 블록은 옛 item이라 자동 탈락한다"는 서술은
  **쌍둥이가 가만히 있을 때만** 참이다.
- **N1·N3·N4는 회귀가 아니다.** 변경 전 엔진도 세 케이스 모두 오해소다(직접 실행 확인).
  즉 C1은 **오해소를 줄였지만 그 계열을 닫지는 못했다**. REPORT §8 "측정하지 않은 것"의
  "문서 재임포트" 행이 N3/N4를 위험으로 **예고**하고 있는데, 이번 프로브가 그것을 **실측된
  결함으로 확정**했다(예고 → CONFIRMED).
- **N8은 이번 수정이 만든 호환성 구멍**이다. 오해소 방어의 핵심 항(문자 출처)이 레코드에
  새로 저장하는 `blockContext`에 의존하는데, `store.mjs:12`의 `STORE_VERSION`은 **1 그대로**라
  Phase 1이 쓴 파일이 그대로 로드된다. 그 레코드에는 blockContext가 없어
  `originEvidence`가 `known:false`를 돌려주고, `survived = !origins.known || …`
  (`anchors.mjs:219`) 규칙에 따라 **문자열 구조만으로 통과**한다 → S10 b4가 부활한다.
  수정 방향은 둘 중 하나다: (a) `STORE_VERSION` 상향 + 마이그레이션, (b) `blockContext`가
  없는 레코드는 guard를 **거절 쪽으로** 기본값 설정(의심스러우면 orphan 원칙과 일치).
- **강화의 대가도 계량했다**(N5·N7): 이동 중 블록이 1자라도 바뀌면 S6형 복구가 사라지고,
  앵커 범위 안 부분 재작성(`Critical failure`→`Critical outage`)도 이제 orphan이다.
  전부 **안전측 실패**라 게이트 위반은 아니지만, C1이 재는 축(precision)에는 이 recall 손실이
  **한 칸도 안 잡힌다** — 스위트에 "범위 안 재작성"·"고쳐서 이동" 시나리오가 없기 때문이다.

## 6. 무회귀 · 경계 (판정 5)

| 축 | 기준 | 실측 |
|---|---|---|
| S1–S8 게이트(S1–S4·S8) pipeline | 30/30 | **30/30 (100.0%)**, 드리프트 0, orphan 0, wrong 0 |
| 같은 범위 stale | ≥ 93.3% | **28/30 (93.3%)**, 드리프트 2(S4 a1·a2 1자), wrong 0 — Phase 1과 동일 |
| 전 시나리오·전 레인 오해소 | 0 | **0** (S1–S10 × 3레인, 174 측정: live 54 + pipeline 60 + stale 60) |
| S5 (범위 전체 삭제) | orphan 6/6 | 6/6, 경로 `collapsed/tombstone-evidence` |
| S6 (블록 이동) 복구 | 6/6 | 6/6 — 경로가 quote → **`moved-block`** 으로 바뀌었으나 결과 유지 |
| S7 병합 수렴 | 6/6 | 6/6 |
| bystander | wrong 0 | 270건 중 ok 269 / 잔여 1 / orphan 0 / wrong 0 |
| G1 스키마 순수성 | annotation 타입 0 | `schema-dump.json` 해시가 **Phase 1과 동일**, `sample-state/document.json`에 앵커 id 0건 |
| G5 언어 | 한글·영어만 | 손저작 20파일 스위트 스캔 위반 0. 내 전수 스캔(생성물 포함 26파일)에서도 비-ASCII는 `§ · × ≥ – —` 등 allowlist 기호뿐(제3 자연어 0). `package-lock.json`의 `❤`는 npm 생성물 |
| repo 게이트 | 3종 PASS | `validate.py` PASS · `check_determinism.py` PASS · `lint_uniformity.py` PASS |
| 경계 | `tools/plane-editor/` 밖 tracked 변경 0 | 커밋 `1304c6c`의 plane-editor 파트는 `tools/plane-editor/**` 만 접촉(19파일 중 나머지는 타 lane 문서·메모리를 inspection이 같이 묶은 것). 판정 시점 워킹트리의 `ONTOLOGYSTYLE.md`·`guardrails.ttl`·`concepts.ttl` 변경은 **병행 ontology lane(B-wave) 소유**로 이 dispatch와 무관 |

## 7. 비차단 관측

1. **게이트 → land 순서가 또 뒤집혔다.** 판정 도중 inspection이 `1304c6c "Land C1 anchor fix…"`로
   C1 산출물을 이미 커밋했고(그 뒤 `765eb54`로 HEAD가 한 번 더 이동), 내 재실행 해시는 커밋본과
   일치하므로 내용 문제는 없다. Phase 1 판정 §5.5와 **같은 사실이 반복**되므로 프로세스 항목으로
   승계한다.
2. **모듈 머리말과 실제 동작의 정밀도 차이.** `anchors.mjs:5-6`은 TextQuoteSelector를
   "복구용 — 1이 죽었을 때만 쓴다"고 적지만, strict 정책에서 **문서 전역 quote 복구는 한 번도
   돌지 않는다**(120 레인측정 중 0). quote는 이제 "이동 후보 블록의 저장 오프셋에 exact가 그대로
   있는지" 확인하는 **검증용**이다. `MIN_AFFIX`·`quoteCandidates`는 대조군 전용 코드가 됐다.
3. **standoff 평면에 문서 산문이 복제된다.** 레코드가 `blockContext.text`로 블록 전문을
   저장한다(`sample-state/annotations.json` 확인). 문서-주석 분리 원칙 자체는 유지되지만
   (문서에는 앵커 흔적 0), 주석 저장소가 문서 내용의 **스냅샷 사본**을 갖게 되므로 Phase 2에서
   ① 사본의 stale 처리 ② 저장 용량 ③ 그래프로 미러링할 때의 중복을 규정해야 한다.
4. **C1 조건문의 "전 레인 ≥12시행"은 레인 정의에 민감하다.** §2에 적었듯 S9·S10에서
   pipeline은 stale과 같은 계산이다. 다음 조건을 쓸 때는 "**독립 계산 N회**"로 표현하는 편이
   해석 여지가 없다.

## 8. 결론 · orchestrator 결정 항목

- **verification(규격대로 만들었나): PASS.** C1의 수치 기준을 문자 그대로 충족했고, 보고 수치 ↔
  원시 데이터 ↔ 내 재계산 **불일치 0**, 3회 재실행 byte-identical(커밋본 4/4 해시 일치),
  담당 경로 밖 변경 0, repo 게이트 3종 PASS, S1–S8 무회귀.
- **validation(올바른 것을 만들었나): 부분 충족.** 강화는 실측으로 효과가 있고(변경 전 엔진
  12시행 중 9건 오해소 → 현행 0), vacuous하지 않다. 그러나 **"블록이 사라진 앵커가 살아남은
  동일 텍스트에 붙는다"는 결함 계열은 여전히 열려 있다** — N1/N1b(쌍둥이 이동)·N3(원격 피어가
  같은 문장 작성)·N4(삭제 후 재작성). 여기에 N8(Phase 1 레코드 하위호환)이 더해진다.
- **차단 해제 판단은 orchestrator 몫이다.** 선택지 둘:
  - **(a) C1을 충족으로 보고 차단 해제** — 잔여 4종을 Phase 2 브리프의 **측정 항목**으로 승계.
    대가: 앵커를 링크 종단점으로 쓰는 순간, N1/N3/N4 모양의 편집에서 **틀린 설계 결정을 가리키는
    링크**가 생길 수 있다(wave-synthesis §2가 차단 사유로 지목한 바로 그 위험).
  - **(b) C1을 S11로 확장한 뒤 해제** — S11 = "블록 삭제 + 동일 텍스트 블록이 어디선가 새로
    생김"(이동·재작성·원격 작성 3변형) 전 레인 오해소 0, **그리고** `blockContext` 없는 레코드를
    거절 쪽 기본값으로. 두 수정 모두 `tools/plane-editor/` 안에서 끝난다.
  - 어느 쪽이든 **N5·N7의 복구율 손실**(고쳐서 이동 / 범위 안 재작성)을 같이 재는 시나리오가
    없다는 점은 기록해 두어야 한다 — 지금 스위트는 precision만 재고 recall은 안 잰다.
