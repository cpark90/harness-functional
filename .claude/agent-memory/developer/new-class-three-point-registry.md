# 신규 TBox 클래스 = tool-side 3점 등록 (+ 병행 dispatch 충돌 대응)

TBox에 클래스를 하나 land하면 **그래프 밖 3곳**을 같은 웨이브에서 함께 등록해야 한다.
빠뜨리면 `validate.py`가 registryDrift 축에서 하드 FAIL하거나(개체 증발), 조용히 규약이 헐거워진다.

| # | 위치 | 무엇 | 안 하면 |
|---|---|---|---|
| 1 | `tools/ontology_lib.py` `INSTANCE_CLASSES` | 클래스 URIRef | registryDrift **하드 FAIL** ("individuals would vanish"). 미등록 개체는 count/reachability/retrieve에서 사라진다 |
| 2 | `tools/lint_uniformity.py` `PREFIX_MAP` | 클래스→slug 접두사 | 네이밍 규약이 **무치아**(위반해도 0 detection) |
| 3 | `ONTOLOGYSTYLE.md` §2 표 (+ §3 순서) | 접두사 행 + 클래스 고유 술어 순서 | 사람 저작자가 규약을 볼 곳이 없다 → 다음 웨이브에서 접두사 drift |

인스턴스가 아직 없는 클래스도 **1은 미리** 등록한다 — registryDrift의 extra(등록됐지만 미인스턴스)는
warn일 뿐이고(`⚠ ... harmless`), 나중에 개체가 land하는 순간의 재발 FAIL을 막는다.

## AV W1 실측 (2026-08, envelope/autonomy 4클래스)

- `OperatingEnvelope`→`oe-` / `EnvelopeStatement`→`es-` / `EnvelopeRule`→`er-` / `AutonomyTier`→`tier-`.
  `env-`는 **금지**(싱글턴 `env-space`와 혼동) — 브리프가 고정한 결정.
- §2 표의 예시 IRI 관례: **실개체가 있으면 실 IRI**, 0개면 ellipsis(`id:er-…`, `id:ex-…`,
  `id:anchor-…`). 개체가 land하는 웨이브에 ellipsis 행을 실 IRI로 승격시켜야 표가 stale해지지 않는다.
- §3에는 **harness 레벨 술어**(`ho:hasEnvelope` block4 tail, `ho:autonomyTier` block5 head=
  `hasExecutionMode` 뒤)만 순서 목록에 넣고, 노드 내부 슬롯 순서는 **[권장] bullet**로 적는다
  (`hasStep`·`hasSection` 선례대로 intra-component 조립 술어는 block4 목록에 넣지 않는다).

## 등록이 실제로 무는지 증명하는 probe 레시피 (오탐 0 + teeth)

```python
import ontology_lib as lib, lint_uniformity as lint
HO, ID = lib.HO, lib.ID      # ★ HO=https://harness-ontology.dev/schema# , ID=.../id/
n = ID[f"core/{slug}"]       # ★ ID 뒤에 그룹 세그먼트(core/)가 붙는다 — 빼면 IRI가 달라져
                             #   전부 0 detection이 나오고 "규칙이 안 문다"고 오판한다
base = lib.load_graph(); probe = Graph(); probe.add((n, RDF.type, HO[cls])); ...
lint.check_naming_prefix(base + probe)   # 틀린 slug 주입 → 정확히 1건, 맞는 slug → 0건
```
추가로 `len(instance_nodes(load_graph())) == len(instance_nodes(load_graph(reason=False)))`를
확인하면 1번 등록이 실제로 먹었는지(추론 없이도 개체가 보이는지) 한 줄로 증명된다.

## 병행 dispatch 충돌 — 편집 전에 디스크를 다시 본다

같은 wave에서 다른 dispatch가 **내 담당 파일까지 이미 고쳐놨을 수 있다**. 실제로 이 세션에서는
읽기와 편집 사이 몇 분 만에 3곳이 전부 채워졌다.
- 신호: `Edit`의 `File has been modified since read`. 이건 오류가 아니라 **충돌 알림**이다.
- 대응: 곧바로 다시 쓰지 말고 `git status --short <경로>` + `git diff <경로>`로 **상대가 무엇을
  했는지** 먼저 읽는다. 이미 동등하게 처리됐으면 **재작성하지 않는다**(스타일만 다른 재편집은
  순수 churn이고 상대 작업을 덮어쓸 위험). 남은 진짜 구멍만 메우고, 게이트·probe로 최종 상태를 증명한다.
- 보고: "내가 썼다"가 아니라 "현재 디스크 상태 + 증명"을 반환한다 — orchestrator가 중복 dispatch를
  인지할 수 있게 충돌 사실 자체를 notes에 남긴다.
