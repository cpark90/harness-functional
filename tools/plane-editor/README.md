# plane-editor — Phase 1 앵커 엔진 검증 프로토타입

`docs/feedback/inquiries/tool_suggestion.md` v0.2의 전제 — "standoff 앵커(ProseMirror 플러그인
상태 + Yjs RelativePosition)는 편집을 견딘다" — 를 **실측**하기 위한 headless 프로토타입이다.
UI는 없다. 산출물은 통과 선언이 아니라 Phase 2 착수 go/no-go 근거 수치다.

## 실행

```
cd tools/plane-editor && npm install   # 최초 1회 (버전 pin, 오프라인 실행)
node run-suite.mjs                     # 단일 명령·비대화형 -> suite-result.json + REPORT.md
node run-suite.mjs --schema-dump       # G1 근거(스키마 지문)만 stdout
```

수치는 **`REPORT.md`가 원본**이며 손으로 쓰지 않는다 — `run-suite.mjs`가 매 실행마다 다시 만든다.
결정론적이라 같은 코드에서 재실행하면 산출물이 byte 단위로 같다.

## 절대 기준 — 오해소(wrong-resolution) 0

orphan은 허용하지만 **엉뚱한 위치 부착은 불허**다. 그래서 해소 규칙은 애매하면 항상 orphan 쪽으로
접는다 (규칙 원문·근거는 `src/anchors.mjs` 머리말). 이 값이 실제로 무언가를 막고 있는지는
**반사실 계측**으로 매 실행 확인한다 — 더 약한 정책(`textmove`·`phase1`·`naive`)이었다면 어디에
붙었을지, 그리고 그 정책이었다면 **무엇을 살렸을지**(=안전의 대가)를 같이 계산해 `REPORT.md` §4에
싣는다. 다만 이 "0"은 **스위트가 실제로 돌린 시나리오 안에서만** 유효하다: Phase 1의 S1–S8은
초록이었지만 스위트 밖 편집 2종에서 오해소가 재현됐고(`docs/verify/plane-editor-phase1-verify.md`
note 3·4) 그것이 S9·S10, 그 다음 판정에서 4종이 더 재현돼(`plane-editor-c1-verify.md` §5)
그것이 S11a–S11e다.

## 블록이 사라졌을 때 — 정체성만 믿는다 (규칙 C)

블록이 통째로 사라진 앵커를 어디에 붙일지는 **정체성이 증명될 때만** 정한다: 저장된 블록 Yjs
item id가 지금도 **살아 있는 블록**으로 조회될 때만 복구하고, 텍스트 동일성은 보조 검증으로만 쓴다.

이유는 해석이 아니라 측정이다 (`REPORT.md` D3): 블록을 잘라 문서 끝에 붙이는 편집과, 그 블록을
지우고 같은 문장을 다시 타이핑하는 편집은 **Yjs 업데이트가 byte 단위로 같다**. 이동은 CRDT에서
"옛 element 삭제 + 새 element 삽입"이기 때문이다. 따라서 저장된 상태만 보는 어떤 규칙도 둘을 가를
수 없고, "같은 텍스트 블록이 캡처 이후 새로 생겼다"를 이동의 증거로 쓰면 재타이핑(S11c)·쌍둥이
블록 이동(S11a·S11b)·원격 피어 작성(S11d)이 **전부 같이 통과한다**.

대가는 숨기지 않고 잰다: 이 규칙 때문에 S6(블록 cut+paste)의 이동 복구가 사라져 `pipeline`·`stale`
두 레인에서 **복구 6건씩 총 12 레인측정이 orphan**이 됐다. 그 값은 `REPORT.md` §4의 "포기한 복구"
표(`textmove` 열)에 매 실행 그대로 나온다. 이동 복구를 되살리려면 문서 쪽에 **안정적인 블록 id**나
CRDT의 진짜 move 연산이 필요하다 — 즉 이것은 앵커 엔진이 혼자 풀 수 있는 문제가 아니라 Phase 2의
스키마 결정 사항이다.

## 저장 버전 2 — 모양이 아니라 **의미**가 바뀐 버전

`STORE_VERSION`을 1에서 **2**로 올렸다. 파일 모양만 바뀐 것이 아니라 **옛 레코드를 어떻게 믿을지**가
바뀌었기 때문이다.

- v1 파일에는 두 세대가 섞여 있다. 세 번째 selector가 아예 없던 Phase 1 레코드와, `blockContext`를
  쓰기 시작한 그 다음 세대다. 파일에 적힌 `1`만으로는 둘을 가릴 수 없다.
- v2 엔진은 v1 레코드를 **출처 미상(legacy)** 으로 본다: 읽어들이되(레코드를 버리지 않는다)
  블록 이동 복구를 시도하지 않고, 내용이 바뀐 자리를 문자열 구조만으로 통과시키지 않으며,
  orphan 사유에 `legacy-v1-record`를 남긴다. 이 규칙이 없으면 강화된 guard가 **옛 파일에서만**
  조용히 무력화된다 (실측된 회귀: `Critical failure` -> `Cure`가 v1 레코드에서 다시 통과했다).
- v2 레코드는 캡처 시점 state vector를 `anchors.capture`에 **따로** 싣는다. 캡처 시점은 캡처
  이벤트의 성질이지 블록의 성질이 아니어서, 블록 경계를 걸친 앵커도 문자 출처 증거를 쓸 수 있다.
- 알 수 없는 버전(예: 3)은 여전히 거절한다. 로드·강등·거절 세 갈래를 실제 파일로 확인하는 것이
  `REPORT.md` D4다.

## 파일

| 경로 | 역할 |
|---|---|
| `run-suite.mjs` | 스위트 진입점 — 게이트 계산·산출물 기록 |
| `src/schema.mjs` | 콘텐츠 전용 스키마 + 지문(G1의 기계적 근거) |
| `src/annotation-plane.mjs` | 주석 평면 = ProseMirror 플러그인 1개 (**mark 금지**, Decoration만) |
| `src/anchors.mjs` | Selector 다중화 캡처/해소 (RelativePosition + TextQuote + capture + BlockContext) |
| `src/blocks.mjs` | 블록 item 정체성·생성 판정·문자 출처 — 앵커의 **출처를 CRDT에 묻는 층** |
| `src/store.mjs` | standoff 영속화 — 문서와 **별도 파일**의 annotation 레코드 (v2, v1은 강등 로드) |
| `src/session.mjs` | 세션 1개 = Y.Doc + Tiptap editor + 평면 (client ID 고정), fixture 3종 |
| `src/scenarios.mjs` | 편집 시나리오 S1–S11 + 진단 D1·D2·D3·D4, 레인별 분류 |
| `src/reload-child.mjs` | S8용 **별도 프로세스** 재로드 |
| `src/report.mjs` | `REPORT.md` 렌더러 |
| `fixtures/document.json`·`anchors.json` | 편집 생존 fixture (앵커 a6은 같은 문자열이 두 번 나오는 함정) |
| `fixtures/twin-*.json` | 파괴적 편집(S9 블록 삭제 / S10 제자리 교체)용 쌍둥이 문장 fixture |
| (파생) s11 fixture | twin 문서에서 **앵커마다 쌍둥이 블록이 하나씩** 되도록 파생한 문서 (`src/session.mjs`), S11a–S11e용 |
| `sample-state/` | 저장된 standoff 레코드 예시 (레코드 모양 공개용) |
| `probe.mjs` | 초기 탐침 — RelativePosition assoc 변형 실험 기록 |

## 경계

이 디렉토리는 **순수 추가**다. `ontology/`·기존 `tools/*.py`·`tools/webui`는 건드리지 않으므로
`validate.py`·`check_determinism.py`·`lint_uniformity.py`에 영향이 없다(G4는 회귀 확인용).
