# fixtures/link-plane — 검사기 대조군

`control/`이 정상 스토어이고, `negative-*/`는 **control에서 딱 한 곳만 망가뜨린** 사본이다.
그래서 "무엇이 그 판정을 냈는가"가 `diff`로 바로 보인다.

```
diff control/links.json negative-missing-iri/links.json
python3 tools/plane-editor/check_links.py --store tools/plane-editor/fixtures/link-plane/<dir>
node tools/plane-editor/run-link-checks.mjs      # 아래 표를 한 번에 재측정
```

| fixture | 망가뜨린 곳 (control 대비) | 기대 사유 | 기대 exit |
|---|---|---|---|
| `control` | — | 위반 0 | 0 |
| `negative-missing-iri` | 링크 `to.ref` → `id:pat-absent-from-the-graph` | `graph-endpoint-missing` | 1 |
| `negative-missing-record` | 링크 `to.ref` → `dec-fixture-absent` | `record-endpoint-missing` | 1 |
| `negative-bad-type` | 링크 `type` → `relatesTo` (그래프에 없는 이름) | `link-type-unknown` | 1 |
| `negative-supersedes-graph` | `supersedes` 링크의 `to` → graph 종단점 | `supersedes-boundary` | 1 |
| `negative-orphan-link` | 링크 양쪽 종단점을 모두 없는 것으로 | `orphan-link` | 1 |
| `negative-graph-source` | 링크 `from` → graph 종단점 (역방향 인덱스) | `direction-graph-source` | 1 |
| `negative-tagged-range` | `tagged`의 대상을 Concept이 아닌 노드로 | `link-type-range` | 1 |
| `negative-supersedes-cycle` | 설계결정 레코드가 자기를 밀어낸 쪽을 다시 supersedes | `decision-supersedes-cycle` | 1 |
| `negative-annotation-document-missing` | 주석 종단점에서 `document` 제거 | `endpoint-document-missing` | 1 |
| `negative-annotation-document-mismatch` | 주석 종단점의 `document` → 없는 문서 | `endpoint-document-mismatch` | 1 |
| `negative-annotation-state-unknown` | 주석 레코드에서 `anchorState` 제거 | `annotation-anchor-state-unknown` | 1 |
| `negative-annotation-anchor-unknown` | 주석 종단점의 `anchor` → `relativePosition` (닫힌 집합 밖 = 해소 기계장치이지 종단점이 이름 붙일 위치가 아니다) | `link-endpoint-plane` | 1 |
| `negative-annotation-anchor-missing` | 주석 종단점의 `anchor` → `blockContext` (그 레코드는 블록 문맥을 싣지 않는다) | `annotation-anchor-missing` | 1 |

주석 **스토어** 쪽만 한 곳 망가뜨린 negative는 아래 표대로 링크 fixture를 고르고
`--annotations`로 그 스토어를 물린다 (역시 위반 1건).

| 주석 스토어 fixture | 링크 fixture | 망가뜨린 곳 | 기대 사유 | 기대 exit |
|---|---|---|---|---|
| `annotation-stores/unidentified-record/` | `annotation-record-live` | 레코드가 자기 `anchors.document`를 싣지 않는다(강등 표시만) | `annotation-record-unbound` | 1 |
| `annotation-stores/record-document-mismatch/` | `annotation-record-live` | 레코드의 `anchors.document.id` → 스토어와 다른 문서 | `annotation-record-document-mismatch` | 1 |
| `annotation-stores/duplicate-document/{a,b}.json` | `annotation-record-live` | 두 스토어가 같은 `documentId`를 선언 | `annotation-store-duplicate-document` | 1 |
| `annotation-stores/duplicate-document/b.json` **만** 지목 | `annotation-record-live` | 한쪽만 물려 쌍둥이를 숨기려는 호출 (I-3) | `annotation-store-duplicate-document` (+ broken 1) | 1 |
| `annotation-stores/duplicate-record/` | `annotation-store-contract` | 한 스토어 안에 같은 레코드 id 둘 (I-2) | `annotation-store-duplicate-record` | 1 |
| `annotation-stores/no-anchors/` | `annotation-store-contract` | v3 레코드에서 `anchors`를 통째로 제거 (I-1) | `annotation-record-unloadable` | 1 |
| `annotation-stores/null-anchors/` | `annotation-store-contract` | 같은 모양을 `anchors: null`로 (I-1) | `annotation-record-unloadable` | 1 |
| `annotation-stores/unmarked-identity/` | `annotation-store-contract` | 정체성도 강등 표시도 없는 레코드 (I-1) | `annotation-record-unloadable` | 1 |
| `annotation-stores/unreadable-sibling/annotations.json` | `annotation-store-contract` | 같은 문서를 주장하는 읽을 수 없는 스토어가 옆에 있다 | `annotation-store-unreadable` | 1 |
| `annotation-stores/record-id-not-a-string/` | `annotation-store-contract` | 레코드 `id`가 숫자 (검사기가 건너뛰던 자리, I-1 fail-closed) | `annotation-record-unloadable` | 1 |
| `annotation-stores/record-id-missing/` | `annotation-store-contract` | 레코드에 `id`가 아예 없다 | `annotation-record-unloadable` | 1 |
| `annotation-stores/record-not-an-object/` | `annotation-store-contract` | 레코드가 객체가 아니다(문자열) | `annotation-record-unloadable` | 1 |
| `annotation-stores/document-mismatch/` | `annotation-store-contract` | 스토어의 `documentId`가 옆 `document.json`의 문서와 다르다 (스토어를 남의 문서 옆으로 **옮긴** 모양) | `annotation-store-document-mismatch` | 1 |
| `annotation-stores/document-state-absent/` | `annotation-store-contract` | 디렉토리에 `document.json`이 **없다** (스토어만 내보낸 모양) | `annotation-store-document-unreadable` | 1 |
| `annotation-stores/document-state-unparsable/` | `annotation-store-contract` | 옆 `document.json`이 병합 중 잘려 **파싱되지 않는다** | `annotation-store-document-unreadable` | 1 |
| `annotation-stores/document-state-unidentified/` | `annotation-store-contract` | 옆 `document.json`에 **평문 `documentId`가 없다** (종단점을 묶는 스토어인데) | `annotation-store-document-unreadable` | 1 |
| `annotation-stores/document-state-missing/` | `annotation-store-contract` | 옆 `document.json`에 문서 상태(`yUpdateBase64`)가 없다 | `annotation-store-document-unreadable` | 1 |

**링크 타입 어휘는 fixture로 고정하지 않는다.** 그 어휘는 그래프에서 **파생**되므로(살아 있는
`ho:` 술어 + `ho:LinkKind` 개체), "이 kind가 존재한다/하지 않는다"를 디스크의 대조군으로 박아
두면 그래프가 어휘를 바꾸는 날 다시 깨진다 — 이번 wave가 없앤 결함이 정확히 그것이다
(`ho:alternativeOf`·`ho:overlapsWith` 폐기로 대조군 37개가 한꺼번에 무너졌다). 그래서 어휘
쪽 대조군은 `run-link-checks.mjs` C11이 **그래프 사본을 변형해 매 실행 만든다**: 어휘를 하나
더하면 같은 스토어가 red -> green, 하나 지우면 green -> red. 여기 디스크 fixture가 어휘에
대해 주장하는 것은 `negative-bad-type` 하나뿐이고, 그것도 "그래프에 없는 이름"이라는 **성질**
이지 특정 술어의 생사가 아니다. control과 negative들이 쓰는 `id:kind-overlap`은 폐기된
`overlapsWith`를 대신하는 종류형 표기다(`../../link-store/README.md`의 마이그레이션 표).

각 negative는 위반이 **정확히 1건**이어야 한다 — 여러 사유가 함께 터지면 어느 규칙이 잡은
것인지 알 수 없어 대조군 구실을 못 한다(`run-link-checks.mjs` C4가 그 조건을 검사한다).
그래서 링크 fixture가 둘이다: 종단점 해소 층의 사유를 재려면 링크가 필요하고(`annotation-record-live`),
**스토어 계약 층**만 남기려면 링크가 하나도 없어야 한다(`annotation-store-contract`).

`control/annotations.json`은 검사기가 실제로 읽는 것만 담은 최소 주석 스토어다: 스토어의
`documentId`, 레코드 `id`, 레코드가 스스로 싣는 `anchors.document`, 그리고 저장 시점에
**측정된** `anchorState`. 나머지 selector는 주석 평면 자신의 스토어에 있다. 실사용 스토어
(`src/store.mjs`가 쓰는 형식)를 쓰려면 `--annotations <path>`로 가리킨다.

## 한 케이스 = 한 디렉토리 (판정 범위가 발견으로 정해지기 때문)

검사기는 지목된 스토어의 형제 중 **같은 문서를 선언한 것**을 함께 판정한다 — 한 파일만 골라
물려 쌍둥이 스토어를 숨기는 경로를 없애기 위해서다(불변식 I-3, 실측 vnv P2b). 그래서
케이스마다 디렉토리를 따로 두며, `duplicate-document/`와 `unreadable-sibling/`만 일부러 스토어
둘을 한 디렉토리에 담는다(그것이 그 케이스다).

이 트리 전체는 `../.annotation-store-quarantine` 표식으로 **저장소 전역 발견에서 제외**된다.
여기 있는 스토어는 전부 규칙을 깨뜨리려고 존재하므로, 발견에 걸리면 모든 게이트 실행이 실패해
진짜 결함을 덮는다. 제외는 조용하지 않다 — 표식의 첫 줄(사유)이 판정 JSON의
`annotationScope.quarantined`에 실린다.

| 주석 스토어 fixture | 무엇을 재나 |
|---|---|
| `annotation-stores/legacy-v1/` | v1 스토어 = 읽히지만 문서 정체성이 없어 종단점 바인딩 불가(`annotation-store-unbound`) |
| `annotation-stores/legacy-v2/` | v2도 같다 — 버전 협상이 "읽기"와 "바인딩"을 가르는지 |
| `annotation-stores/unreadable-v99/` | 읽을 수 없는 버전은 사유와 함께 exit 2 (조용한 통과 금지) |
| `annotation-stores/broken-endpoint/` | `anchorState: orphaned` 레코드 — 끊긴 종단점이 **보고되는지** |
| `annotation-stores/unidentified-record/` | 정체성 없는 레코드는 v3 스토어 안에서도 종단점을 못 묶는다(입양 금지) |
| `annotation-stores/record-document-mismatch/` | 레코드가 남의 문서를 주장하면 커밋 게이트도 거절하는지 |
| `annotation-stores/duplicate-document/` | 같은 documentId를 선언한 스토어 둘 = 위반(조용한 덮어쓰기 금지) + 한쪽만 물려도 발견되는지 |
| `annotation-stores/duplicate-record/` | 한 스토어 안 중복 레코드 id = 게이트와 편집기가 다른 레코드를 쥐는 자리 |
| `annotation-stores/{no-anchors,null-anchors,unmarked-identity}/` | 편집기 `loadStore`가 거절하는 레코드 모양 셋 — 게이트도 같은 답을 내는지 |
| `annotation-stores/unreadable-sibling/` | 같은 문서를 주장하는 **읽을 수 없는** 스토어가 옆에 있을 때 — 지목한 것이 아니면 멈추지 않고 보고하는지 |
| `annotation-stores/mixed-documents/` | 형제가 **다른 문서**의 스토어일 때 — 판정에 끌려오지 않고(위양성 0) `outOfScope`에 남는지 |
| `annotation-stores/{record-id-not-a-string,record-id-missing,record-not-an-object}/` | 검사기가 **완전히 평가하지 못하는** 레코드 모양 셋 — 건너뛰지 않고 위반으로 내는지(fail-closed) |
| `annotation-stores/document-mismatch/` | 스토어가 **자기 자리의 문서**와 어긋날 때 — 옆 `document.json`의 평문 정체성과 대조하는지 (스토어를 옮긴 모양) |
| `annotation-stores/document-state-{absent,unparsable,unidentified,missing}/` | **문서 축의 fail-closed** — 대조를 *할 수 없는* 네 자리에서 게이트가 건너뛰지 않는지 (앞의 셋은 파일을 옮기는 것만으로 도달한다: vnv N1·N6·N2) |
| `annotation-stores/annotations-not-an-array/` | 스토어 이름을 달았지만 `annotations`가 배열이 아닌 파일 — 계약의 첫 규칙이 성질의 코퍼스 필터에 걸려 **한 번도 측정되지 않던** 자리 |
| `annotation-stores/document-state-{unopenable-base64,unopenable-payload,foreign-crdt}/` | **게이트가 원리적으로 볼 수 없는 축** — 게이트는 초록으로 서명하고 편집기는 거절한다(아래 절) |

### 게이트가 볼 수 없는 축도 코퍼스에 있다 (expectedDivergence)

위 세 스토어는 다른 대조군과 성격이 다르다: **게이트가 통과시키고 편집기가 거절한다.** 게이트는
CRDT를 해독하지 않으므로(선언된 경계) 문서 상태의 **내용**에 관한 사실에는 규칙을 매길 수 없다 —
평문 `documentId`와 CRDT 상태가 다르거나(`document-state-mismatch`), `yUpdateBase64`가 열리지
않거나(`document-state-unopenable`, base64가 깨졌거나 내용이 Yjs 업데이트가 아니거나).

한때 이 비대칭은 README의 **문장**이었고 코드에는 발화하지 않는 상수 하나(`GATE_BLIND_CODES`)만
있었다. 문장으로 둔 전제는 조용히 넓어지므로 지금은 **부류로 측정한다**: 세 스토어가 코퍼스에
들어와 있고, C9가 매 실행 (a) 그 부류의 수가 3 이상인지, (b) 선언된 코드가 **전부** 실제로
측정되는지, (c) **그 부류 밖의 divergence가 0인지**를 잰다. 그래서 이 대조군들은 스위트를
red로 만들지 않으면서도 전제를 값으로 붙잡아 둔다. (게이트가 볼 수 있는 자리를 이 부류로 옮겨
가리는 것도 막힌다 — 부류는 코드 단위이고, 게이트가 규칙을 가진 코드는 부류에 없다.)

## 스토어는 파일 하나가 아니라 디렉토리다 (`document.json`)

각 스토어 디렉토리에는 `annotations.json` 옆에 **문서 상태**(`document.json`)가 있다. 편집기
(`loadStore`)는 그것을 먼저 열고, 커밋 게이트도 그 자리를 fail-closed로 본다. 그래서 fixture도
실제 스토어의 모양을 갖춘다 — 그러지 않으면 대조군마다 문서 축 위반이 하나씩 더 붙어 "위반
정확히 1건"이 깨지고, 성질(C9)의 편집기 쪽을 **진짜 `loadStore`로** 잴 수도 없다.

문서 상태는 손으로 쓰지 않고 실제 세션에서 생성한다:

```
node tools/plane-editor/make-fixture-documents.mjs           # 다시 쓴다 (결정론)
node tools/plane-editor/make-fixture-documents.mjs --check    # 디스크본이 표와 같은지만 본다
```

그 스크립트의 표가 "어느 디렉토리가 어느 문서를 담는가"의 단일 정의처이며, 뒤쪽 일곱 줄이
**일부러 문서 축을 망가뜨린** 대조군이다(각각 사유 하나): 앞의 넷은 게이트도 보는 자리,
뒤의 셋은 게이트가 볼 수 없는 자리(`yUpdate`·`crdtFrom` 옵션).

이 트리는 `run-link-checks.mjs` C9의 **성질 테스트** 입력이기도 하다: 여기서 발견되는 모든
스토어에 대해 `게이트 accept <-> 편집기 accept`를 대조하므로, **새 fixture를 넣으면 자동으로
그 성질의 대상이 된다**(목록을 고칠 필요가 없다). 그래서 fixture를 추가할 때 지켜야 할 것은
둘이다 — 그 스토어가 어느 층에서 거절되는지 알고 넣을 것, 그리고 문서 축을 재는 fixture가
아니라면 `make-fixture-documents.mjs` 표에 그 디렉토리를 등록할 것.

| 링크 스토어 | 쓰임 |
|---|---|
| `annotation-live/` | 실사용 `sample-state/annotations.json`(v3)을 물려 PASS를 실측한다 |
| `annotation-broken/` | orphan 레코드를 가리키는 링크 — PASS이면서 broken endpoint 1건 보고 |
| `annotation-record-live/` | fixture 문서(`doc-fixture-live`)의 레코드를 겨냥하는 링크 |
| `annotation-legacy/` | 정체성 없는 옛 스토어의 레코드를 겨냥하는 링크 |
| `annotation-store-contract/` | 링크가 **없다** — 스토어 계약 층만 남긴다 |

`annotation-live/`는 `run-suite.mjs`가 쓴 실제 문서 정체성(`doc-sample-state`)을 겨냥한다.
그 값은 스위트가 **명시 지정**하는 id라 발급 순서에 흔들리지 않는다(`run-suite.mjs`).
반대로 fixture 스토어들은 그 id를 쓰지 않는다(`doc-fixture-*`) — 실사용 스토어는 발견으로
함께 판정되므로, 같은 id를 쓰면 대조군마다 "중복 선언" 위반이 하나 더 붙는다.
