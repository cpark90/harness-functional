# plane-editor — Phase 1 앵커 엔진 검증 프로토타입

`docs/feedback/inquiries/tool_suggestion.md` v0.2의 전제 — "standoff 앵커(ProseMirror 플러그인
상태 + Yjs RelativePosition)는 편집을 견딘다" — 를 **실측**하기 위한 headless 프로토타입이다.
UI는 없다. 산출물은 통과 선언이 아니라 Phase 2 착수 go/no-go 근거 수치다.

## 실행

```
cd tools/plane-editor && npm install   # 최초 1회 (버전 pin, 오프라인 실행)
node run-suite.mjs                     # 앵커 스위트 -> suite-result.json + REPORT.md
node run-suite.mjs --schema-dump       # G1 근거(스키마 지문)만 stdout
node run-link-checks.mjs               # 링크·설계결정 평면 스위트 (별도 명령)
python3 check_links.py                 # 링크 스토어 무결성 검사기 (exit 0/1)
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
그것이 S11a–S11e다. 그 다음 판정(`plane-editor-c1b-verify.md` §5.2)은 편집이 아니라 **저장소 계약과
문서 정체성** 쪽에서 2종을 재현했고 — 그것이 규칙 0과 저장 버전 3, 진단 D5·D6이다.

## 어느 문서의 앵커인가 (규칙 0)

해소는 selector를 읽기 **전에** "이 레코드가 이 문서의 것인가"부터 묻는다. 레코드와 문서가
각자 지닌 문서 id가 **둘 다 있고 같을 때만** 다음 규칙으로 넘어간다.

문서 id는 콘텐츠 해시가 **아니다**. 필요한 성질이 두 가지인데 해시는 둘 다 어긴다 — 편집하면
값이 바뀌고(생애 안정성 위반), 같은 텍스트를 가진 다른 문서를 같다고 말한다(파생본 구별 위반).
그래서 id는 문서가 생길 때 한 번 발급되어 **CRDT 상태 안에** 살고, 편집·저장·재로드·복제본
병합을 통틀어 같은 값이며, 재임포트·파생본은 새 CRDT이므로 새 값을 받는다. 정체성이 없는
문서 상태에는 로드 시점에 발급하지 않는다(그건 출처 날조다) — 대신 아무 레코드도 바인딩되지
않는다. 근거와 성질은 `src/document-id.mjs` 머리말에 있다.

이 검사가 없으면 레코드가 **다른 문서에 그대로 붙는다**: 이 프로토타입은 clientID를 호출부가
고정 상수로 주므로 두 문서의 item id 공간이 통째로 겹치기 때문이다. D5가 네 모양(같은 문서
재로드 대조군 / 동일 재임포트 / 파생본 / 다른 clientID)으로 매 실행 재측정한다.

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

## orphan 예산 — 대가를 게시한다

정밀도(오해소 0)만 재는 게이트는 재현율을 얼마든지 깎을 수 있다. 그래서 **편집 후에도 앵커
텍스트가 문서에 그대로 남는** 흔한 조작 6종(범위 안 삽입 대조군 / 이동 2-tx·1-tx / 앞 블록과
병합 / 앵커 시작점 분할 / 삭제 후 undo)을 정식 시나리오(S2·S6·S12a–d)로 넣고, 조작별 orphan율을
`REPORT.md` §5에 게시한다. 목표는 orphan을 줄이는 것이 아니라 **보이게 하는 것**이라 값 자체는
게이트가 아니다 — 게이트(C3)는 "측정했는가 · 그 범위에서 오해소 0인가 · 대조군은 살아남는가"만 본다.

두 레인의 값이 다른 것이 핵심이다: 편집 세션이 살아 있으면(저장 시 재캡처) 병합·분할은 끊기지
않고, 옛 레코드를 들이대는 경로에서만 끊긴다. 이동과 undo는 두 레인 모두 끊긴다.

## 저장 버전 3 — 모양이 아니라 **의미**가 바뀐 버전

버전은 파일 모양이 아니라 **레코드를 얼마나 믿을 수 있는지**가 바뀔 때 올린다.

- **v1** 파일에는 두 세대가 섞여 있다. 세 번째 selector가 아예 없던 Phase 1 레코드와,
  `blockContext`를 쓰기 시작한 그 다음 세대다. 파일에 적힌 `1`만으로는 둘을 가릴 수 없다.
- **v2**는 캡처 시점 state vector를 레코드 최상위에 따로 실었다. 그런데 그것은 레코드가 **스스로
  주장하는 시점**이라, 마이그레이션이 그 자리를 현재 값으로 채우면 "모든 문자가 옛 문자"로 뒤집혀
  방어가 통째로 무력화된다 (실측된 회귀: `Critical failure` -> `Cure`가 다시 통과했다).
- **v3**은 세 가지를 더 싣는다. (1) 레코드가 **어느 문서의 것인지**(규칙 0). (2) 출처 증거를 시점이
  아니라 **문자들의 CRDT 이름표**(`capture.characterIds`)로 — 저장된 `exact`와 길이가 맞아야 하므로
  현재 상태에서 베껴 넣을 수 없다. (3) 저장 시점에 **측정한** 종단점 상태(`anchorState`) — 링크가
  끊긴 앵커를 조용히 가리키지 못하게.
- **옛 버전은 강등해서 읽는다(승격하지 않는다).** 읽어들이되 이동 복구를 시도하지 않고, 내용이
  바뀐 자리를 문자열 구조만으로 통과시키지 않으며, orphan 사유에 `legacy-v<n>-record`를 남긴다.
  마이그레이션이 없는 증거를 **채워 넣는 경로는 아예 없다**. 현재 버전이어도 캡처 증거가 다른
  selector와 어긋나면 같은 강등 경로로 흐른다(`capture-inconsistent`).
- 문서 정체성만은 강등본에도 붙인다 — 그것은 레코드의 자기보고가 아니라 "이 레코드가 이
  document.json 옆에 있다"는 **외부 사실**에서 오기 때문이다. 채워 넣을 수 없는 것과 관찰할 수
  있는 것을 가르는 선이다.
- 알 수 없는 버전은 여전히 거절한다. 로드·강등·거절을 실제 파일로 확인하는 것이 `REPORT.md`의
  D4(옛 파일)와 D6(저장소 계약 — 증거 채워넣기 4모양)이다.

## 파일

| 경로 | 역할 |
|---|---|
| `run-suite.mjs` | 앵커 스위트 진입점 — 게이트 계산·산출물 기록 |
| `run-link-checks.mjs` | 링크·설계결정 평면 스위트 진입점 (앵커 스위트와 **분리된 명령**) |
| `check_links.py` | 링크 평면 무결성 검사기 + 도구 층 cap 계약 표면 (`--emit-contract`) |
| `src/schema.mjs` | 콘텐츠 전용 스키마 + 지문(G1의 기계적 근거) |
| `src/annotation-plane.mjs` | 주석 평면 = ProseMirror 플러그인 1개 (**mark 금지**, Decoration만) |
| `src/document-id.mjs` | 문서 정체성 — 발급·보관(CRDT 상태)·읽기. 규칙 0의 근거 |
| `src/anchors.mjs` | Selector 다중화 캡처/해소 (document + RelativePosition + TextQuote + capture + BlockContext) |
| `src/blocks.mjs` | 블록 item 정체성·**문자 정체성**·생성 판정 — 앵커의 출처를 CRDT에 묻는 층 |
| `src/store.mjs` | standoff 영속화 — 문서와 **별도 파일**의 annotation 레코드 (v3, 옛 버전은 강등 로드) |
| `src/session.mjs` | 세션 1개 = Y.Doc + Tiptap editor + 평면 (client ID·문서 id 고정), fixture 3종 |
| `src/scenarios.mjs` | 편집 시나리오 S1–S12 + 진단 D1~D6, 레인별 분류 |
| `src/link-plane.mjs`·`src/decision-plane.mjs` | 링크·설계결정 레코드 생성·직렬화 (판정은 검사기에 위임) |
| `src/reload-child.mjs` | S8용 **별도 프로세스** 재로드 |
| `src/report.mjs` | `REPORT.md` 렌더러 |
| `link-store/`·`fixtures/link-plane/` | 링크·설계결정 스토어와 그 대조군 (각 디렉토리 README 참조) |
| `fixtures/document.json`·`anchors.json` | 편집 생존 fixture (앵커 a6은 같은 문자열이 두 번 나오는 함정) |
| `fixtures/twin-*.json` | 파괴적 편집(S9 블록 삭제 / S10 제자리 교체)용 쌍둥이 문장 fixture |
| (파생) s11 fixture | twin 문서에서 **앵커마다 쌍둥이 블록이 하나씩** 되도록 파생한 문서 (`src/session.mjs`), S11a–S11e용 |
| `sample-state/` | 저장된 standoff 레코드 예시 (레코드 모양 공개용) |
| `probe.mjs` | 초기 탐침 — RelativePosition assoc 변형 실험 기록 |

## 경계

이 디렉토리는 **순수 추가**다. `ontology/`·기존 `tools/*.py`·`tools/webui`는 건드리지 않으므로
`validate.py`·`check_determinism.py`·`lint_uniformity.py`에 영향이 없다(G4는 회귀 확인용).
