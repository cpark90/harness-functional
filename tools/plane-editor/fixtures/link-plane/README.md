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
| `negative-annotation-document-missing` | 주석 종단점에서 `document` 제거 | `endpoint-document-missing` | 1 |
| `negative-annotation-document-mismatch` | 주석 종단점의 `document` → 없는 문서 | `endpoint-document-mismatch` | 1 |
| `negative-annotation-state-unknown` | 주석 레코드에서 `anchorState` 제거 | `annotation-anchor-state-unknown` | 1 |

각 negative는 위반이 **정확히 1건**이어야 한다 — 여러 사유가 함께 터지면 어느 규칙이 잡은
것인지 알 수 없어 대조군 구실을 못 한다(`run-link-checks.mjs` C4가 그 조건을 검사한다).

`control/annotations.json`은 검사기가 실제로 읽는 것만 담은 최소 주석 스토어다: 스토어의
`documentId`, 레코드 `id`, 그리고 저장 시점에 **측정된** `anchorState`. 앵커 selector는 주석
평면 자신의 스토어에 있다. 실사용 스토어(`src/store.mjs`가 쓰는 형식)를 쓰려면
`--annotations <path>`로 가리킨다.

## 주석 스토어 fixture (`--annotations`로만 쓴다)

| 파일 | 무엇을 재나 |
|---|---|
| `annotation-stores/legacy-v1.json` | v1 스토어 = 읽히지만 문서 정체성이 없어 종단점 바인딩 불가(`annotation-store-unbound`) |
| `annotation-stores/legacy-v2.json` | v2도 같다 — 버전 협상이 "읽기"와 "바인딩"을 가르는지 |
| `annotation-stores/unreadable-v99.json` | 읽을 수 없는 버전은 사유와 함께 exit 2 (조용한 통과 금지) |
| `annotation-stores/broken-endpoint.json` | `anchorState: orphaned` 레코드 — 끊긴 종단점이 **보고되는지** |

| 링크 스토어 | 쓰임 |
|---|---|
| `annotation-live/` | 실사용 `sample-state/annotations.json`(v3)을 물려 PASS를 실측한다 |
| `annotation-broken/` | 위 orphan 레코드를 가리키는 링크 — PASS이면서 broken endpoint 1건 보고 |

`annotation-live/`는 `run-suite.mjs`가 쓴 실제 문서 정체성(`doc-sample-state`)을 겨냥한다.
그 값은 스위트가 **명시 지정**하는 id라 발급 순서에 흔들리지 않는다(`run-suite.mjs`).
