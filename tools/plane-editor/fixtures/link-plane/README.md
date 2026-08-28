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
| `negative-bad-type` | 링크 `type` → `relatesTo` | `link-type-unknown` | 1 |
| `negative-supersedes-graph` | `supersedes` 링크의 `to` → graph 종단점 | `supersedes-boundary` | 1 |
| `negative-orphan-link` | 링크 양쪽 종단점을 모두 없는 것으로 | `orphan-link` | 1 |
| `negative-graph-source` | 링크 `from` → graph 종단점 (역방향 인덱스) | `direction-graph-source` | 1 |
| `negative-tagged-range` | `tagged`의 대상을 Concept이 아닌 노드로 | `link-type-range` | 1 |
| `negative-supersedes-cycle` | 설계결정 레코드가 자기를 밀어낸 쪽을 다시 supersedes | `decision-supersedes-cycle` | 1 |

각 negative는 위반이 **정확히 1건**이어야 한다 — 여러 사유가 함께 터지면 어느 규칙이 잡은
것인지 알 수 없어 대조군 구실을 못 한다(`run-link-checks.mjs` C4가 그 조건을 검사한다).

`control/annotations.json`은 주석 평면 레코드의 **id만** 필요한 최소 스토어다(종단점 실재
판정에 id 말고는 읽지 않는다). 실제 주석 평면 스토어(`src/store.mjs`가 쓰는 형식)를 쓰려면
`--annotations <path>`로 가리키면 된다.
