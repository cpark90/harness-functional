# link-store — 링크 평면 + 설계결정 평면 스토어

`ontology/` **밖**에 있는 단일 스토어다(사용자 결정 2-(a)). 그래프 도구는 `ontology/`만
스캔하므로 이 파일들은 `validate.py`·`retrieve.py`에 잡히지 않는다 — 그래프 재도입 금지
규칙을 자동으로 지키는 대신, **무결성은 전적으로 전용 검사기가 진다.**

```
python3 tools/plane-editor/check_links.py            # 이 스토어 검사 (exit 0/1)
python3 tools/plane-editor/check_links.py --format json
python3 tools/plane-editor/check_links.py --emit-contract   # cap·어휘 계약 표면
node tools/plane-editor/bind-links.mjs               # 종단점을 문서 위치로 해소 (exit 0/1/2)
node tools/plane-editor/run-link-checks.mjs          # 대조군·negative control 포함 자체 스위트
```

## 파일

| 파일 | 내용 |
|---|---|
| `links.json` | 링크 평면 — `{id, from, to, type, evidence?, created_by}` |
| `decisions.json` | 설계결정 평면 — `{id, title, body, status, supersedes?, decided_by}` |
| `annotations.json` (선택) | 주석 평면 레코드. 없으면 `--annotations <path>`로 외부 standoff 스토어를 가리킨다 |

```
python3 tools/plane-editor/check_links.py \
    --annotations tools/plane-editor/sample-state/annotations.json   # 실사용 주석 스토어
```

두 파일 모두 **id 오름차순**으로 직렬화한다(총순서·언어 독립). 키 순서도 위 표의 순서로
고정이라 재직렬화가 byte 단위로 같다.

## 규약 (검사기가 강제하는 것)

- **종단점** `{plane, ref}` — plane ∈ `annotation` | `decision` | `graph`. `graph`의 ref는
  IRI 표기 `id:<slug>`(도메인이 core가 아니면 `id:<domain>/<slug>`)이고, 실재 판정은
  `ontology_lib.instance_nodes`가 한다(추정 금지).
- **주석 종단점은 `{plane, ref, document}`** — 레코드 id는 **문서 안에서만** 유일하다
  (`a1`은 문서마다 있다). 문서를 빼면 종단점이 남의 문서를 가리키므로 `document`가 없으면
  위반(`endpoint-document-missing`)이고, 그 문서에 그 레코드가 없으면
  `endpoint-document-mismatch` 또는 `record-endpoint-missing`이다. 문서 id의 성질은
  `src/document-id.mjs` 머리말에 있다(콘텐츠 해시가 아니라 문서 생애 동안 고정, 재임포트·
  파생본은 새 값).
- **주석 종단점은 문서 안의 위치까지 가리킬 수 있다** — `{plane, ref, document, anchor}`.
  `anchor`가 있으면 그 종단점은 레코드(=메모)가 아니라 **그 레코드가 문서에서 차지하는
  자리**를 뜻한다: "이 설계결정은 이 문서의 **이 문장**과 관련 있다".

  | `anchor` | 무엇을 가리키나 | 레코드가 실어야 하는 것 |
  |---|---|---|
  | `textQuote` | 캡처된 **인용 범위** ("이 구절") | `anchors.textQuote.exact` |
  | `blockContext` | 그 범위가 든 **블록** ("이 문단") | `anchors.blockContext.itemId` |

  값은 닫힌 집합이고 그 목록의 단일 정의처는 검사기다(`--emit-contract`의 `endpointAnchors`).
  **링크는 selector를 복사하지 않는다** — 이름으로 레코드의 앵커를 **참조**할 뿐이다. 복사하면
  문서가 편집될 때 링크 쪽 사본만 낡아 두 벌이 갈리고, 그 순간 링크는 아무도 편집하지 않은 옛
  자리를 가리킨다. 그래서 좌표·텍스트는 스토어에 **없고**, 필요할 때 `node bind-links.mjs`가
  스토어를 열어 기존 해소 엔진으로 계산한다. 그 파생성은 스위트가 실측한다(C12: 문서에 28자를
  앞에 삽입하면 같은 링크의 좌표가 그만큼 움직이고 가리키는 텍스트는 그대로다).

  레코드가 그 부분을 싣지 않으면 위반이다(`annotation-anchor-missing`) — 예컨대 앵커가 블록
  경계를 걸치면 `blockContext`는 정상적으로 `null`이고(`src/anchors.mjs`), 그런 레코드에
  문단 단위 종단점을 걸 수는 없다. 닫힌 집합 밖의 이름은 `link-endpoint-plane`이다.
- **링크 타입은 신조어 금지이고, 그 어휘는 코드가 아니라 그래프에서 온다** — 검사기는 목록을
  들고 있지 않고 매 실행 그래프에서 **파생**한다. 그래서 그래프가 관계 어휘를 늘리면 게이트가
  코드 변경 없이 그것을 인정하고, 폐기하면 그 순간 거절한다. 표기로 형식이 갈린다:

  | 형식 | 표기 | 무엇이어야 하나 | graph 종단점에 적용되는 제약 |
  |---|---|---|---|
  | 술어형 | bare local name (`tagged`) | 살아 있는 `ho:` `owl:ObjectProperty` (`ontology_lib.link_predicates`가 TBox에서 전수 파생) | 그 술어의 `rdfs:range` (+하위클래스 폐포) |
  | 종류형 | `id:<slug>` (`id:kind-overlap`) | `ho:LinkKind` **개체** — 재설계 이후의 확장 지점 | `ho:LinkShape`가 `ho:linkTarget`에 건 `sh:or` |
  | 평면 내부형 | bare (`supersedes`) | 그래프 어휘가 **아니어야** 한다 | 종단점이 설계결정 평면 안이어야 한다 |

  종류형 표기는 graph 종단점과 **같은** IRI 표기다(`id:core/kind-overlap`처럼 도메인을 적어도
  같은 것으로 해소된다). 재사용이 이름뿐이 아니도록 대상 타입 제약은 두 형식 모두에 적용되며,
  실재하지 않는 술어·kind를 주장하면 `link-type-unknown`이다. 파생이 **비면**(그래프에 `ho:`
  관계 술어가 하나도 없다) 그것 자체가 위반이다 — 평가 불가는 결과 없음이 아니다.
  이 성질(어휘를 더하거나 지우면 판정이 따라 움직인다)은 `run-link-checks.mjs` C11이 그래프
  **사본**을 변형해 매 실행 실측한다(원본 `ontology/`는 무수정, 그 사실도 byte 비교로 잰다).
- **`supersedes`는 설계결정 평면 내부 전용** — graph 종단점을 겨냥하면 위반(B9 경계).
  같은 관계를 레코드 필드 `supersedes`로도 쓸 수 있고, 검사기는 둘을 하나의 관계로 본다
  (순환 금지, 대상 레코드의 status는 `superseded`여야 함).
- **단방향** — 링크는 평면 → 그래프 한 방향만 연다. `from`이 `graph`면 역방향 인덱스이므로 위반.
- **크기 규율** — 설계결정 레코드의 `title`+`body`는 도구 층의 텍스트 cap 안에 있어야 한다.
  cap 값과 추정기는 여기에 적지 않는다: 유일 정의처는 `tools/lint_uniformity.py`이고
  `check_links.py --emit-contract`가 그 값을 읽어 내보낸다.

## 폐기된 어휘와 마이그레이션 (그래프가 재설계됐을 때)

그래프가 관계 어휘를 바꾸면 이 스토어의 레코드는 **조용히 낡는다** — 검사기가 그것을 잡는
자리가 `link-type-unknown`이다. 지금까지 실제로 일어난 이행은 아래 표가 전부다.

| 폐기된 그래프 어휘 | 이 평면에서 쓰던 표기 | 대신 쓰는 것 | 의미 변화 |
|---|---|---|---|
| `ho:overlapsWith` (TBox에서 삭제) | `"type": "overlapsWith"` | `"type": "id:kind-overlap"` | 없음 — 같은 관계가 술어에서 **개체**로 옮겨졌을 뿐 |
| `ho:alternativeOf` (TBox에서 삭제) | (이 스토어에서 쓴 적 없음) | `id:kind-alternative` | 없음 (같은 이행) |
| `ho:Anchor` (클래스 삭제) | 이 평면은 쓴 적 없음 — 그래프 안의 topic 앵커였다 | `ho:Link` + `ho:linkKind id:kind-topic` | 그래프 쪽 이야기. 이 평면의 "anchor"(`src/anchors.mjs`)는 **문서 텍스트 앵커**이며 이름만 같고 무관하다 |

실제로 바뀐 레코드는 하나다: `ln-parallel-start-overlaps-link-store`(설계결정 두 건이 같은
wave를 덮는다는 관계)의 `type`이 `overlapsWith` -> `id:kind-overlap`이 됐다. 관계의 뜻은
그대로이고(대상 개체의 정의가 "replacing the retired crisp `ho:overlapsWith`"라고 말한다),
링크 id·종단점·`evidence`·`created_by`는 건드리지 않았다. 대조군 fixture의 같은 링크
(`ln-fixture-annotation-overlaps-decision`)도 같은 이행을 받았다.

**가중(weight)은 여전히 싣지 않았다.** 그래프의 `ho:Link`는 이제 `ho:linkWeight`(0..1 퍼지
소속도)와 그 출처(`ho:weightOrigin`/`ho:weightMethod`)를 가지지만, **링크 평면에 가중을 실을지는
사용자 결정 대기**다. 링크 레코드 스키마는 그대로 `{id, from, to, type, evidence?, created_by}`
이고(늘어난 것은 **종단점**의 선택적 `anchor` 하나뿐이다), 가중 필드를 늘리려면 그 결정이 먼저다
— 아래 "아직 열지 않은 것" 참조.

## 끊긴 종단점 (broken endpoint)

종단점 앵커가 orphan이 되는 것은 **정상 상태**다 (이동·병합·분할·undo에서 실제로 얼마나
자주 일어나는지는 `REPORT.md`의 orphan 예산 표에 실측으로 있다). 그때 링크를

- 조용히 지우면 = 소실, 
- 조용히 다른 곳에 다시 겨누면 = 오부착

이므로 둘 다 하지 않는다. 대신 주석 레코드가 저장 시점에 **측정한** 상태(`anchorState`:
`bound` | `orphaned`)를 싣고, 검사기가 그 링크를 `brokenEndpoints`로 **보고**한다 (위반이
아니므로 exit 0은 유지된다). 상태를 링크 레코드에 복제하지 않는 이유는 그 순간부터 낡기
때문이다 — 링크의 끊김은 언제나 종단점에서 파생된다.

`anchorState`가 아예 없는 레코드를 가리키는 링크는 **위반**이다
(`annotation-anchor-state-unknown`): 상태를 모르면 링크가 "아직 붙어 있다"고 조용히 가정하게 된다.

## 주석 스토어 버전 협상

주석 스토어의 버전과 **스토어 계약**은 주석 평면(`src/store-contract.mjs`)이 소유한다. 검사기가 자기 스토어 버전을
남의 파일에 강요하면 실사용 스토어가 통째로 거절된다(Phase 2 판정 F1). 그래서 검사기는

- 읽을 수 있는 버전 집합(`--emit-contract`의 `annotationStore.readableVersions`)으로 협상하고,
- v1·v2는 **읽되** 문서 정체성이 없으므로 종단점을 바인딩하지 못한다고 명시하며
  (`annotation-store-unbound`), v3부터 `documentId`·`anchorState`로 바인딩한다,
- 읽을 수 없는 버전은 사유와 함께 exit 2로 거절한다(조용한 통과 없음),
- 주석 평면이 그 집합을 넘어선 버전을 쓰기 시작하면 그 사실을 사유에 실어 알린다
  (값을 베껴 오라는 뜻이 아니라 검사기를 가르치라는 신호다).

## 이 평면만 다른 점 (판정 메커니즘)

설계결정 평면은 **결정론적 판정이 불가능한 유일한 평면**이다 — 논증이 타당한지는 기계가 못
센다. 그래서 커밋 조건은 기계 검사가 아니라 **판정 주체 표기**(`decided_by`)이고, 검사기는
형식(필수 필드·상태 어휘·cap·supersedes 순환)만 본다.

## 바인딩 — 링크가 문서의 어디를 가리키는가

```
node tools/plane-editor/bind-links.mjs               # 사람이 읽는 표
node tools/plane-editor/bind-links.mjs --format json # 판정 JSON
```

실제 산출(이 스토어):

```
- ln-honest-orphan-quote-tagged-design-for-loss from -> doc-sample-state/a6 @textQuote
    [303,316) "honest orphan"
- ln-selector-multiplexing-block-tagged-graceful-fallback from -> doc-sample-state/a5 @blockContext
    [204,267) "Selector multiplexing recovers anchors after destructive edits."
```

규율 셋이 이 명령을 지배한다(근거는 `src/link-binding.mjs` 머리말).

1. **바인딩은 `loadStore`가 연 스토어에만 건다.** 게이트 exit 0은 **필요조건이지 충분조건이
   아니다**: 문서 상태의 평문과 CRDT가 어긋나거나 `yUpdateBase64`의 **내용**이 유효한 업데이트가
   아니면 게이트는 초록을 주고 편집기는 그 스토어를 열지 못한다(게이트는 CRDT를 해독하지 않는다).
   그런 스토어의 바인딩은 **0**이고 사유가 판정 JSON에 남으며 명령은 exit 1이다. 스토어당
   `loadStore` 호출 수도 판정에 실린다(`counts.loadStoreCalls`).
2. **해소는 기존 strict 규칙을 그대로 탄다** — 우회 경로를 만들지 않는다. 문서 정체성(규칙 0)·
   구조적 guard·출처 증거·블록 정체성이 그대로 적용되고, `blockContext`는 해소된 범위가 **지금
   든 블록**의 CRDT item id가 레코드가 캡처한 것과 같을 때만 내준다(다르면 orphan — 오해소
   불허가 복구율보다 우선한다).
3. **orphan은 위반이 아니라 상태다.** 앵커가 끊기면 바인더는 사유와 함께 `orphaned`로
   보고하고(exit 0 유지), 게이트도 같은 링크를 `brokenEndpoints`로 보고한다. 지우지도, 다른
   곳에 다시 겨누지도 않는다.

## 아직 열지 않은 것

**가중(weight)은 여전히 싣지 않는다** — 사용자 결정 대기다(`docs/feedback/`의 가중 결정 문서).
그래프의 `ho:Link`는 `ho:linkWeight`(0..1)와 그 출처를 요구하지만, 이 평면의 레코드 스키마는
`{id, from, to, type, evidence?, created_by}` 그대로이고 검사기는 **모르는 필드를 거절한다**.
즉 값이 몰래 들어올 수는 없고, 넣으려면 결정이 먼저다. 이번에 연 앵커 종단점은 가중이 앉을
자리를 좁혀 두기만 했다(무엇에 가중을 매기는지가 이제 "레코드"가 아니라 "문서의 이 자리"다).

종단점이 **자기만의** 범위(문자 offset·독립 selector)를 짓는 형태도 열지 않았다. 링크가 위치를
스스로 들면 문서 편집과 함께 두 벌이 갈리기 때문이고, 그 대신 레코드의 앵커를 참조한다.
