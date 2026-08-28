# link-store — 링크 평면 + 설계결정 평면 스토어

`ontology/` **밖**에 있는 단일 스토어다(사용자 결정 2-(a)). 그래프 도구는 `ontology/`만
스캔하므로 이 파일들은 `validate.py`·`retrieve.py`에 잡히지 않는다 — 그래프 재도입 금지
규칙을 자동으로 지키는 대신, **무결성은 전적으로 전용 검사기가 진다.**

```
python3 tools/plane-editor/check_links.py            # 이 스토어 검사 (exit 0/1)
python3 tools/plane-editor/check_links.py --format json
python3 tools/plane-editor/check_links.py --emit-contract   # cap·어휘 계약 표면
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
- **링크 타입은 신조어 금지** — 그래프에 이미 있는 `ho:` 관계 어휘만 재사용한다
  (`tagged`·`derivedFrom`·`constrainedBy`·`alternativeOf`·`overlapsWith`). 재사용이 이름뿐이
  아니도록 술어의 `rdfs:range`도 graph 종단점에 적용된다.
- **`supersedes`는 설계결정 평면 내부 전용** — graph 종단점을 겨냥하면 위반(B9 경계).
  같은 관계를 레코드 필드 `supersedes`로도 쓸 수 있고, 검사기는 둘을 하나의 관계로 본다
  (순환 금지, 대상 레코드의 status는 `superseded`여야 함).
- **단방향** — 링크는 평면 → 그래프 한 방향만 연다. `from`이 `graph`면 역방향 인덱스이므로 위반.
- **크기 규율** — 설계결정 레코드의 `title`+`body`는 도구 층의 텍스트 cap 안에 있어야 한다.
  cap 값과 추정기는 여기에 적지 않는다: 유일 정의처는 `tools/lint_uniformity.py`이고
  `check_links.py --emit-contract`가 그 값을 읽어 내보낸다.

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

주석 스토어의 버전은 **주석 평면(`src/store.mjs`)이 소유**한다. 검사기가 자기 스토어 버전을
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

## 아직 열지 않은 것

링크는 여전히 **레코드 id**를 겨냥하고 텍스트 범위(offset·selector)를 직접 겨냥하지 않는다.
이번 wave가 연 것은 그 앞 조건이다: 종단점이 `(문서, 레코드)`로 묶이고, 레코드가 자기 앵커의
끊김 상태를 싣는다. 앵커의 selector 자체를 링크 종단점으로 삼는 작업은 다음 wave다(결정 1-(a)).
