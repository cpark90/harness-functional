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
**반사실 계측**으로 매 실행 확인한다 — 더 약한 정책(`phase1`·`naive`)이었다면 어디에 붙었을지를
같이 계산해 `REPORT.md` §4에 싣는다. 다만 이 "0"은 **스위트가 실제로 돌린 시나리오 안에서만**
유효하다: Phase 1의 S1–S8은 초록이었지만 스위트 밖 편집 2종에서 오해소가 재현됐고
(`docs/verify/plane-editor-phase1-verify.md` note 3·4), 그것이 지금의 S9·S10이다.

## 파일

| 경로 | 역할 |
|---|---|
| `run-suite.mjs` | 스위트 진입점 — 게이트 계산·산출물 기록 |
| `src/schema.mjs` | 콘텐츠 전용 스키마 + 지문(G1의 기계적 근거) |
| `src/annotation-plane.mjs` | 주석 평면 = ProseMirror 플러그인 1개 (**mark 금지**, Decoration만) |
| `src/anchors.mjs` | Selector 다중화 캡처/해소 (RelativePosition + TextQuoteSelector + BlockContext) |
| `src/blocks.mjs` | 블록 정체성·문자 출처 — **삭제와 이동을 가르는 CRDT 증거** |
| `src/store.mjs` | standoff 영속화 — 문서와 **별도 파일**의 annotation 레코드 |
| `src/session.mjs` | 세션 1개 = Y.Doc + Tiptap editor + 평면 (client ID 고정), fixture 2종 |
| `src/scenarios.mjs` | 편집 시나리오 S1–S10 + 진단 D1·D2, 레인별 분류 |
| `src/reload-child.mjs` | S8용 **별도 프로세스** 재로드 |
| `src/report.mjs` | `REPORT.md` 렌더러 |
| `fixtures/document.json`·`anchors.json` | 편집 생존 fixture (앵커 a6은 같은 문자열이 두 번 나오는 함정) |
| `fixtures/twin-*.json` | 파괴적 편집(S9 블록 삭제 / S10 제자리 교체)용 쌍둥이 문장 fixture |
| `sample-state/` | 저장된 standoff 레코드 예시 (레코드 모양 공개용) |
| `probe.mjs` | 초기 탐침 — RelativePosition assoc 변형 실험 기록 |

## 경계

이 디렉토리는 **순수 추가**다. `ontology/`·기존 `tools/*.py`·`tools/webui`는 건드리지 않으므로
`validate.py`·`check_determinism.py`·`lint_uniformity.py`에 영향이 없다(G4는 회귀 확인용).
