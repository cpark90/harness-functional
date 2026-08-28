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

두 파일 모두 **id 오름차순**으로 직렬화한다(총순서·언어 독립). 키 순서도 위 표의 순서로
고정이라 재직렬화가 byte 단위로 같다.

## 규약 (검사기가 강제하는 것)

- **종단점** `{plane, ref}` — plane ∈ `annotation` | `decision` | `graph`. `graph`의 ref는
  IRI 표기 `id:<slug>`(도메인이 core가 아니면 `id:<domain>/<slug>`)이고, 실재 판정은
  `ontology_lib.instance_nodes`가 한다(추정 금지).
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

## 이 평면만 다른 점 (판정 메커니즘)

설계결정 평면은 **결정론적 판정이 불가능한 유일한 평면**이다 — 논증이 타당한지는 기계가 못
센다. 그래서 커밋 조건은 기계 검사가 아니라 **판정 주체 표기**(`decided_by`)이고, 검사기는
형식(필수 필드·상태 어휘·cap·supersedes 순환)만 본다.

## 아직 열지 않은 것

링크는 **레코드 id**를 겨냥하고 텍스트 앵커를 겨냥하지 않는다. 앵커를 링크 종단점으로
바인딩하는 작업은 앵커 오해소 게이트(C1) 이후의 별도 wave다(결정 1-(a)).
