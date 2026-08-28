---
verdict: pass-with-notes
target: tools/plane-editor/ (Phase 1 앵커 엔진 검증 프로토타입)
criteria: docs/feedback/inquiries/tool_suggestion-phase1-brief.md §4 시나리오 표 · §5 게이트 G1–G5
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
node: v22.22.3 · python: /usr/bin/python3 (rdflib/pyshacl/owlrl)
gates: G1 PASS · G2 PASS(gating lane=pipeline; stale 28/30) · G3 PASS · G4 PASS · G5 PASS
independent-reruns: 3 (byte-identical, HEAD 커밋 아티팩트와도 해시 일치)
adversarial: docs/verify/plane-editor-phase1-adversarial.mjs (P1–P7) — 스위트 밖 오해소 2종 CONFIRMED
---
# 판정 — Phase 1 앵커 엔진 검증 프로토타입 (tools/plane-editor/)

**verdict: pass-with-notes.** 브리프 §5의 게이트 G1–G5는 **독립 재측정으로 전부 통과**했고,
developer가 보고한 수치는 `suite-result.json` 원시 시행 데이터에서 **내가 다시 계산한 값과 한
건도 어긋나지 않았다**(불일치 0). 결정론도 3회 재실행 byte-identical로 확인했다.

다만 **"오해소(mis-resolution) 근절"이라는 표현은 고정 시나리오 S1–S8 안에서만 참이다.**
브리프가 지시한 적대 케이스를 직접 주입한 결과, 평범한 편집 두 가지에서 **앵커가 남의 문장에
붙는 오해소가 재현**됐다 (P3 블록 통째 삭제, P4 제자리 텍스트 교체). 둘 다 S1–S8 밖이라
G2 판정을 뒤집지는 않지만, Phase 2 착수 조건으로 반드시 들어가야 하는 실측 결함이다.

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology

# ① suite 독립 재실행 3회 + 산출물 해시 대조
for i in 1 2 3; do node tools/plane-editor/run-suite.mjs; \
  cp tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json} $SCRATCH/run$i/; done
sha256sum $SCRATCH/run*/suite-result.json          # 3회 동일
git show HEAD:tools/plane-editor/suite-result.json | sha256sum   # 커밋본과도 동일

# ② REPORT.md 수치 ↔ 원시 시행 데이터 독립 재계산 (reported outcome 무시하고 text 비교로 재분류)
/usr/bin/python3 - <<'PY'  # scenarios[].trials[].lanes[].text vs trials[].expected.text
...  # 재분류 결과가 reported outcome과 다르면 MISMATCH 출력 → 출력 0건
PY

# ③ G1 독립 확인 — 스위트의 자체 점검이 아니라 **실행 중인 editor의 런타임 스키마**를 덤프
node <<'JS'  # editor.schema vs buildSchema(contentExtensions()) fingerprint 비교 + doc/Yjs 누출 검사
JS

# ④ 적대 케이스 주입 (오해소 실측)
node docs/verify/plane-editor-phase1-adversarial.mjs

# ⑤ 기존 게이트 3종 회귀 + 경계 준수
/usr/bin/python3 tools/validate.py            # PASS
/usr/bin/python3 tools/check_determinism.py   # PASS
/usr/bin/python3 tools/lint_uniformity.py     # PASS
git diff --stat -- tools/ ontology/           # (빈 출력)
```

③·④의 실제 스크립트는 `docs/verify/plane-editor-phase1-adversarial.mjs`에 남겼다 (P1–P7,
repo root에서 `node`로 바로 실행, `tools/plane-editor/`를 읽기만 함).

## 1. 게이트 판정 (독립 재측정)

| gate | 브리프 기준 | 판정 | 내가 측정한 근거 |
|---|---|---|---|
| G1 | 문서 스키마에 annotation mark/노드 0 | **PASS** | 실행 중 editor의 런타임 스키마 = node 11 / mark 6, 전부 StarterKit 콘텐츠 타입. `annot\|comment\|thread\|highlight\|anchor\|review\|suggest` 매칭 **0**. `editorSchema fingerprint == content-only fingerprint` **true**. 앵커 6개 부착+status 변경 후 doc JSON 불변·Yjs state 불변, doc 콘텐츠에 붙은 mark **0개**, 앵커 id·body 문자열이 doc JSON·Yjs 바이트열에 **누출 0** |
| G2 | S1–S4·S8 생존 100% + S5 오해소 0 | **PASS** (gating lane = pipeline) | pipeline 30/30 생존(100.0%), drift 0, orphan 0, wrong 0. S5 orphan 6/6·wrong 0(전 레인). **stale 레인은 28/30 (93.3%)** — §3 note 1 참조 |
| G3 | 단일 명령·비대화형 재현 | **PASS** | 별도 프로세스 3회 실행 → `suite-result.json` sha256 `260f32d9…`, `REPORT.md` `a915a49b…`, `schema-dump.json` `bcfab19b…` 모두 동일. **HEAD 커밋본과도 해시 일치** = developer 보고 아티팩트를 내가 그대로 재생산. cwd 무관(repo root 실행), exit 0 |
| G4 | 기존 게이트 3종 회귀 | **PASS** | `validate.py` PASS · `check_determinism.py` PASS · `lint_uniformity.py` PASS. `git diff --stat -- tools/ ontology/` 빈 출력 = 기존 tracked 파일(`package.json`·`package-lock.json`·`probe.mjs` 포함) 무변경 |
| G5 | 언어 정책 (gr-lang) | **PASS** | 스위트는 손으로 쓴 17개를 스캔하는데, 나는 `node_modules` 제외 **23개 전수**(생성물 REPORT.md·suite-result.json·sample-state 포함)를 스캔 — ASCII+한글+기호 allowlist 밖 문자 **0**. 유일한 URL은 jsdom base `https://plane-editor.invalid/`(RFC 2606 예약 TLD, 네트워크 아님), 코드에 `fetch`·`Date.now`·`Math.random`·`process.env` **0** |

## 2. 시나리오 × 레인 수치 (원시 시행에서 내가 재계산한 값)

`S`=RelativePosition 생존, `R`=quote 복구, `D`=경계 드리프트(1자), `O`=orphan, `X`=오해소.
모든 셀은 앵커 6개 독립 시행. **전 레인·전 시나리오 X = 0** (텍스트 동일성 기준 — §3 note 2).

### 2.1 pipeline 레인 (게이트 기준 · 저장 시 재캡처 → 재로드)

| id | 시나리오 | 기대 | S | R | D | O | X | 판정 | 저장 모드 |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞 삽입 | 생존 100% | 6 | 0 | 0 | 0 | 0 | 6/6 | recaptured |
| S2 | 범위 안 삽입 | 확장 생존 | 6 | 0 | 0 | 0 | 0 | 6/6 | recaptured |
| S3 | 앵커 앞 삭제 | 생존 100% | 6 | 0 | 0 | 0 | 0 | 6/6 | recaptured |
| S4 | 범위 일부 삭제 | 축소 생존 | 6 | 0 | 0 | 0 | 0 | 6/6 | recaptured |
| S5 | 범위 전체 삭제 | orphan·오해소 0 | 0 | 0 | 0 | 6 | 0 | 6/6 | preserved |
| S6 | 블록 이동 | 실측 보고 | 0 | 6 | 0 | 0 | 0 | 6/6 | preserved |
| S7 | 동시 편집 병합 | 실측 보고 | 6 | 0 | 0 | 0 | 0 | 6/6 | preserved |
| S8 | 저장→재시작→재로드 | 전 앵커 복원 | 6 | 0 | 0 | 0 | 0 | 6/6 | round-trip(별 프로세스) |

### 2.2 stale 레인 (편집 전 저장 앵커를 편집 후 문서에 해소 — 저장 selector의 내구성)

| id | S | R | D | O | X | 판정 | 비고 |
|---|---|---|---|---|---|---|---|
| S1 | 6 | 0 | 0 | 0 | 0 | 6/6 | |
| S2 | 6 | 0 | 0 | 0 | 0 | 6/6 | |
| S3 | 6 | 0 | 0 | 0 | 0 | 6/6 | |
| S4 | 4 | 0 | **2** | 0 | 0 | 4/6 | a1 `Alpha`→`Alpha `(+1자), a2 `delta `→`delta e`(+1자) |
| S5 | 0 | 0 | 0 | 6 | 0 | 6/6 | tombstone 규칙 발동 |
| S6 | 0 | 6 | 0 | 0 | 0 | 6/6 | quote 복구 전담 |
| S7 | 6 | 0 | 0 | 0 | 0 | 6/6 | 두 복제본 수렴 6/6 |
| S8 | 6 | 0 | 0 | 0 | 0 | 6/6 | pipeline과 동일 해소(편집 없음) |

**G2 대상(S1–S4·S8) stale 합계 = 생존 28/30 (93.3%), 드리프트 2, orphan 0, 오해소 0.**

### 2.3 live 레인 (세션 안 Decoration)

| id | S | O | 판정 |
|---|---|---|---|
| S1–S4 | 6 each (24) | 0 | 24/24 |
| S5 | 0 | 6 | 6/6 (기대가 orphan) |
| S6 | 0 | 6 | 0/6 — 블록 cut+paste면 Decoration 전멸 |
| S7 | 0 | 6 | 0/6 — 원격 update가 `tr.replace(0, size, …)`라 Decoration 전멸 |
| S8 | 미측정 | | n/a (재로드 세션엔 live 레인 없음) |

합계(내 재계산): live 생존 24 / orphan 18 / wrong 0 (측정 42), pipeline 생존 36·복구 6·orphan 6·
wrong 0 (48), stale 생존 34·복구 6·드리프트 2·orphan 6·wrong 0 (48). **`REPORT.md`·
`suite-result.json`의 값과 전부 일치 — 불일치 0건.** bystander 210건도 재확인(ok 209 / 잔여
범위 1 / orphan 0 / wrong 0).

## 3. 오해소(mis-resolution) 독립 검증 — 이 판정의 핵심

### note 1. 게이트가 **레인 선택에 좌우된다** (비차단이나 orchestrator 확인 필요)

브리프 §4는 "생존 = 편집 후 앵커가 해소한 텍스트 == 기대 텍스트"라고만 쓰고 앵커를 언제
캡처한 것으로 볼지 정하지 않았다. developer는 **pipeline**(편집 후 살아있는 Decoration 위치로
저장 시 재캡처 → 재로드 해소)을 게이트 레인으로 삼아 100%를, **stale**(편집 전 저장 앵커를
편집 후 문서에 해소)은 93.3%로 함께 실었다 (`staleMeetsTarget: false`로 명시 — **숨기지 않았다**).

내가 확인한 사실: pipeline 레인 30건 중 **24건(S1–S4)은 편집 후에 다시 캡처한 앵커**를 같은
Yjs 문서에서 해소한다(`mode: "recaptured"`). 즉 그 24건이 실제로 증명하는 것은 "**세션이 살아
있는 동안 ProseMirror Decoration이 편집을 따라간다**"이지 "저장된 RelativePosition이 편집을
견딘다"가 아니다. 저장 selector의 내구성을 직접 재는 값은 **stale 28/30**과 **S8 6/6(별
프로세스 round-trip, `separateProcess: true`)**이다. 두 읽기 중 어느 것을 브리프의 100% 목표로
볼지는 go/no-go를 가르므로 orchestrator가 명시 확정해야 한다. 미달분 2건은 전부 **1자 경계
드리프트**(다른 곳에 붙은 것 아님)이고, 원인 진단 D2(`y-prosemirror`가 PM step 대신
`lib0/simpleDiff`로 삭제 범위를 정함 — `sync-plugin.js:1075 updateYText` → `simpleDiff` 1082행,
내가 원문 대조함)와 드리프트가 난 앵커(a1·a2 shift=1)가 정확히 일치한다.

### note 2. 채점이 **텍스트 동일성만** 본다 → 같은 문자열의 다른 출현은 "생존"으로 셈

`src/scenarios.mjs:75 classifyResolution`은 `resolution.text === expected.value`로만 판정한다.
같은 문자열이 문서에 두 번 있으면 **엉뚱한 출현에 붙어도 통과로 집계**될 수 있다. 그래서
위치로 다시 채점했다 (P1·P2):

| 프로브 | 상황 | 결과 |
|---|---|---|
| P1 | 스위트 S6 + 함정 앵커 a6(`honest orphan` 2회 등장), **위치 채점** | 이동한 블록 쪽(offset 360)에 정확히 부착 — **숨은 오해소 없음** |
| P2 | 문장 전체가 중복인 문서에서 앵커 블록 cut+paste | 이동한 블록 쪽(offset 187)에 정확히 부착 |

즉 **보고된 S6 수치는 위치 기준으로도 참**이다. 채점 방식의 취약성은 남지만 이번 결과를
왜곡하지는 않았다.

### note 3. [CONFIRMED 결함 · S1–S8 밖] 블록 통째 삭제 → 남의 문장에 부착

`P3`: 앵커가 든 **블록을 통째로 삭제**(문단 선택 후 Delete = 아주 흔한 편집)하면
RelativePosition은 `collapsed`가 아니라 **`unresolved`(null)** 로 죽는다. tombstone evidence
규칙은 `collapsed`에만 걸리므로(`src/anchors.mjs:208`) 발동하지 않고, quote 복구가 돌아 **살아
남은 다른 문장에 붙는다.**

| 케이스 | 삭제 후 문서 | 앵커가 붙은 곳 | quote 채택 | 판정 |
|---|---|---|---|---|
| distinct-context | 쌍둥이 문장이 다른 문장(`Keeping an honest orphan record beats a silent mis-attachment.`) | 그 남의 문장 속 `honest orphan` | `both-affix` (prefix 4 / suffix 7) | **오해소** |
| identical-context | 쌍둥이 문장이 원문과 동일 | 남은 쌍둥이 | `both-affix` (prefix 32 / suffix 8) | **오해소** |

주목할 점은 distinct-context 케이스가 완화 규칙(`unique-one-affix`)이 아니라 **정규
`both-affix` 경로로 통과**했다는 것이다. `MIN_AFFIX = 4`(`src/anchors.mjs:41`)는 자연어에서
`" an "`·`" record"` 같은 흔한 조각으로 쉽게 충족되므로, affix 일치는 **동일성 증거가 되지
못한다**. (S5는 텍스트 범위 삭제라 `collapsed`가 되어 규칙이 걸린다 — P5로 문맥까지 같은
쌍둥이를 놓고도 orphan 확정을 재확인했고, naive fallback이면 붙었을 것도 재현했다.)

`P7`: "Yjs delete set을 보면 되지 않나"는 **통하지 않는다** — 블록 삭제와 블록 이동 **둘 다**
원 item이 tombstone(`isDeleted: true`)이 된다. 즉 CRDT 층만으로는 삭제와 이동을 구분할 수 없고,
S6(이동 복구)를 살리면서 P3(삭제 오부착)를 막으려면 **문맥 corroboration을 강화하거나 블록
정체성을 명시 저장**해야 한다. 이건 Phase 2 설계 결정 사항이다.

### note 4. [CONFIRMED 결함 · S1–S8 밖] 제자리 교체 → 한 글자 우연으로 무관한 텍스트에 부착

`P4`: 앵커 텍스트를 그 자리에서 무관한 텍스트로 바꾸면(삭제 후 즉시 타이핑), affixGuard가
`head > 0 || tail > 0`(`src/anchors.mjs:111`)이라 **첫 글자 하나만 겹쳐도 통과**한다.

| 교체 텍스트 | guard | 결과 |
|---|---|---|
| `Amazing unrelated content here` (`Alpha beta`와 `A` 하나 공유) | head 1 / tail 0 → accepted | **오해소** — 앵커가 무관한 새 문장에 부착 |
| `Zebra unrelated content here` (공유 글자 없음) | head 0 / tail 0 → rejected | orphan (정상) |

즉 현재 오해소 방지선의 실제 강도는 **1문자**다. 스위트에는 "제자리 교체" 시나리오가 없어
이 경로가 한 번도 눌리지 않았다.

### note 5. 긍정 신호 — 중첩 노드에서도 정상 (`P6`)

fixture는 heading+paragraph만 쓰는데, list item·code block 안의 앵커도 확인했다:
앞쪽 삽입 4/4 생존, 앵커 전체 삭제 4/4 orphan(오해소 0). 블록 구조 자체는 문제 없다.

## 4. 브리프 §3 구현 명세 대조

| 항목 | 요구 | 확인 |
|---|---|---|
| §3.1 | 버전 pin·런타임 네트워크 의존 금지 | `package.json` 11개 의존성 전부 정확 버전 고정(범위 지정자 없음). 네트워크 호출 0 |
| §3.2 | annotation = 플러그인 상태 + Decoration, mark 금지, `{id, anchors, body, status}` | 확인(G1). 저장 레코드 4필드 그대로, `status` open/resolved 동작 확인 |
| §3.3 | RelativePosition + TextQuoteSelector(exact/prefix/suffix) 둘 다 저장, 실패 시 orphan **명시** | `sample-state/annotations.json`에 두 selector 실측 확인. orphan은 레코드 유지 + `orphaned` 플래그(조용한 소실 없음) |
| §3.4 | 문서와 **별도 파일**로 영속화 | `document.json` / `annotations.json` 분리, `loadStore`가 version 체크 |
| §3.5 | headless 단일 명령 | `node tools/plane-editor/run-suite.mjs` 한 줄, 브라우저·대화 입력 없음, exit 0 |

## 5. 비차단 관측 (Phase 2 입력)

1. **S3의 시나리오 약화**: block-head 앵커(a1·a5)는 "앵커 앞 텍스트"가 같은 블록에 없어
   **앞 블록**에서 5자를 지운다(`src/scenarios.mjs:298-306`). 코드엔 있으나 `REPORT.md`엔
   적혀 있지 않다 — 같은 블록 내 선행 삭제는 그 두 앵커에서 미측정.
2. **S7의 동시 편집 강도**: 두 복제본이 앵커 **범위 밖**(블록 시작/끝)에만 삽입한다. 범위를
   가로지르는 동시 편집·동시 삭제는 미측정.
3. **fixture 규모**: 381자 / 7블록 / 앵커 6개 / 48시행. 대형 문서·수백 앵커·표·중첩 리스트는
   미측정(P6로 리스트·코드블록 기본 동작만 확인).
4. **quote 완화 규칙의 대가**: `unique-one-affix` 완화 4건이 S6 블록-머리 앵커를 살리지만,
   note 3·4가 보여주듯 오해소 방지선을 낮추는 방향이다. Phase 2에서 "복구 성공률"과 "오부착
   위험"의 교환비를 명시해야 한다.
5. **프로세스 관측**: 이 판정이 나오기 전에 inspection이 커밋 `4848f3b`로 Phase 1 산출물을
   이미 land 했다(HEAD 12:48). 아티팩트 해시는 내 독립 재실행과 일치하므로 내용상 문제는
   없으나, 게이트→land 순서는 어긋났다 (사실 기록만 남긴다).

## 6. 결론

- **verification(규격대로 만들었나)**: G1–G5 전부 PASS. 보고 수치 ↔ 원시 데이터 ↔ 내 재계산
  **불일치 0**, 결정론 3회 byte-identical(커밋본과도 해시 일치), 담당 경로 밖 변경 0.
- **validation(올바른 것을 만들었나)**: 브리프가 요구한 "오해소 0"은 **고정 시나리오 안에서만**
  성립한다. 적대 케이스 주입으로 오해소 2종(P3 블록 삭제 / P4 제자리 교체)이 재현되므로,
  `REPORT.md` §4의 "오해소 근절" 서술은 **"S1–S8 범위에서 0"으로 한정**되어야 하고, 두 결함은
  Phase 2 착수 브리프의 필수 항목으로 승계되어야 한다.
- Phase 2 go/no-go 판단에 앞서 orchestrator가 확정할 것 **하나**: G2의 생존을 pipeline(100%)
  으로 볼지 stale(93.3%)로 볼지 (note 1).
