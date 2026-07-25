# 도구쪽 화이트리스트·경로 glob = 조용한 실패의 온상 (감사법)

`ontology/` 는 초록인데 **도구가 그래프의 일부를 못 보는** 결함 계열. 공통 증상은 에러가 아니라
**조용한 누락**(빈 목록·상위 타입으로 뭉개짐·edge 소실)이다. 이 repo에는 서로 독립인 화이트리스트가
**3개** 있고, 새 어휘를 land할 때마다 전부 갱신 대상인지 따져야 한다.

| 레지스트리 | 위치 | 미등록 시 증상 |
|---|---|---|
| `INSTANCE_CLASSES` | `tools/ontology_lib.py` | 개체가 카운트/reachability/팩에서 증발(추론이 가림) |
| ~~`INSTANCE_LINK_PREDICATES`~~ | 같은 파일 | ~~노드는 보이는데 edge만 안 보임~~ **B14로 제거** — `link_predicates(g)`가 TBox `owl:ObjectProperty` 전수 파생(§B14 아래) |
| ~~`ORDER`(=whitelist)~~ | `tools/webui/ttl_writer.py` | ~~webui 저장 시 그 술어 삭제~~ **B13으로 제거** — 이제 merge, ORDER는 순서만(§3 아래) |

## ★ 이 3종은 결국 전부 "화이트리스트→파생/merge"로 근절됨 (B13/B14). 새 어휘 land 시 갱신 불요.

## 1. `INSTANCE_CLASSES`: 추론이 결함을 가린다 → 파리티가 유일한 게이트

- 등록 대상은 **asserted leaf 클래스만**. DA-4 **중간 superclass는 절대 넣지 않는다**
  (직접 인스턴스 0 + 추론 타입이라 중복 조회만 늘린다).
- 누락 leaf는 `owlrl` 켜진 경로에선 상위 `ho:HarnessComponent` 타입이 대신 잡아줘서 **안 보인다**.
  ★**불변식 = `len(instance_nodes(load_graph())) == len(instance_nodes(load_graph(reason=False)))`**.
  이 한 줄이 유일한 폭로 수단이다(2026-07 실측: 205 vs 173, leaf 7클래스·32개체 누락).
  차집합 `a - b`를 프린트하면 누락 개체가 바로 나오고, 접두사(`agent-`/`aoi-`/`oa-`/`os-`/`mem-`/
  `scn-`/`fp-`)로 어느 클래스인지 즉시 역추적된다.
- **파급은 MANIFEST의 `type` 표기뿐**: `most_specific_types`가 구체 leaf를 돌려주므로
  `HarnessComponent` → `Agent`/`AreaOfInterest`/`AreaOfObservation`/`ObservationSpace`/`Memory`/
  `TestScenario`/`FailurePolicy`로 정밀해진다. **CLAUDE.md·role md·lock은 byte-identical**
  (렌더러가 타입 문자열을 안 읽음), `individualCount`도 불변(추론 경로는 이미 205였음).
  retrieve 팩도 노드·relevance 동일, **타입 그룹 헤딩만** 세분화된다.
- **before/after 대조는 git 없이**(git 조작 금지): `sys.path.insert(0,'tools')` 후
  `import ontology_lib as l; l.INSTANCE_CLASSES = OLD_SET` 로 **모듈 전역만 monkeypatch**하고
  `import materialize; materialize.main()`. 소비자가 전부 `lib.X`를 호출 시점에 읽으므로 정확히
  옛 동작이 재현된다(`git show HEAD:` 복원보다 싸고, 동시 편집 중인 트리도 오염 안 됨).
  ★대조는 **한 하네스로 부족**: h-multiagent엔 28개체만 물려 있고 `TestScenario`/`FailurePolicy` 4는
  h-harness-factory 쪽 — 7하네스 전수로 돌려야 32 전부가 증명된다.

## 2. DA-4 그룹 디렉토리 이후 **평면 glob은 전부 0건**

`ontology/abox/*.ttl` → 0개(실제 18개는 `abox/core/<group>/<type>.ttl`). 재귀로 고칠 때
`os.path.join(ABOX_DIR, "**", "*.ttl")` + **`recursive=True`**(빠뜨리면 `**`가 `*`처럼 1레벨),
그리고 `sorted()`로 결정적 순서. `**`는 **0개 디렉토리에도 매치**하므로 평면 `abox/authored.ttl`
(webui가 신규 노드를 쓰는 자리)도 계속 잡힌다 — 평면 패턴을 남겨 or-합칠 필요 없음.
- 잔여 취약점: `server.abox_mtimes()`가 **basename을 키로** 쓴다. 지금은 18개 basename이 유일해
  무해하지만, 다른 그룹에 같은 파일명이 생기면 낙관적 잠금이 조용히 뭉개진다(상대경로 키가 정답).

## 3. webui `ORDER` 화이트리스트 = 부분 저장이 곧 데이터 삭제 → **B13에서 merge로 근절**

(과거 결함) `render_block`이 `ORDER`(28종)만 그리고 `_replace_block`이 블록 전체 치환 → 목록 밖
술어 소리없이 삭제. 실측 82/205 개체·375 트리플(코퍼스 커지며 재실측 94/225·437). validate는
shape 요구 술어만 우연히 방어, 선택 술어는 초록인 채 유실.

**B13 수정 = 병합(inspection 권고 B+C 구조).** 핵심 설계:
- `plan_upsert`가 기존 노드를 **rdflib로 파싱**(`_existing_preds`)해 on-disk 트리플을 얻고,
  `render_block(node, existing, managed)`가 **편집 안 한 술어는 그대로 재방출**. ORDER는 이제
  whitelist가 아니라 **순서 힌트**(present인 것만 순서, 목록 밖은 뒤에 안정정렬)라 목록 표류=무해.
- **삭제 신호 = `_managed`**(payload 필드). managed인데 payload에 없으면=삭제(사용자가 비움),
  managed 아니면=보존. 프런트가 `_managed`=7리터럴+전 schema objectProperty로 보냄. `_managed`
  없으면 기본=payload 키(absence=보존=무손실 기본). 이게 없으면 objectProp 비우기로 **삭제 불가**.
- 보존 트리플 렌더는 원 lexical 유지(`_term_ttl`: bare int/decimal/bool, string은 quote, else `^^type`)
  →triple byte-value 동일. editor값은 `_render_editor_value`(number→bare, ref패턴→id:ref, else quote).
- GET(`server.api_node`)도 `DATA_PREDS` 7종 whitelist 제거→**RDF term 타입으로 분기**(Literal 전부
  dataProps, URIRef 전부 objectProps). 안 그러면 GET에 없는 리터럴은 편집 못 봄.
- **무손실 불변식**: 225개체 전수 "GET→SAVE round-trip"의 subject triple diff=0(gate script는
  plan_upsert가 안 쓰므로 read-only, 스크래치에서). OLD경로 94/437 → NEW 0/0.

## 3b. B14 = link 술어 파생, B15 = mtime relpath 키
- **B14**: `INSTANCE_LINK_PREDICATES` 상수 삭제→`link_predicates(g)`가 TBox의 `ho:` `owl:ObjectProperty`
  전수 + SKOS 3종 파생. `instance_edges`가 양끝 instance 필터하므로 range 비-개체 술어는 edge 0.
  누락 9종(channelParticipant 25 등 78 edge) 자동 복구, 새 ObjectProperty도 코드변경 없이 노출.
- **B15**: `server.abox_mtimes()`+`ttl_writer._check_mtime()` 키를 basename→`relpath(p, ABOX_DIR)`.
  DA-4 그룹에 동명파일(spec/patterns.ttl vs process/patterns.ttl) 생겨도 낙관잠금 안 뭉갬.
- ★도구만 수정(`tools/webui/*`+`ontology_lib.py`+frontend Editor.svelte). ontology 무변경—validate
  PASS·determinism PASS. (frontend `_managed`는 npm rebuild 필요; static은 gitignore 산출물.)

## 4. `tokenEstimate` vs `observedTokenVolume` 계약을 스타일 문서에 못박기

`ONTOLOGYSTYLE §3` 데이터 그룹 순서는 `promptText → observedTokenVolume → tokenEstimate →
salience → maturity`(실 저작 관례와 일치). 여기에 **[지킴] "둘을 섞지 않는다"** 한 줄 —
`tokenEstimate`=노드 자신의 팩 비용 / `observedTokenVolume`=AoO의 런타임 관측량 — 과
**진단 불변식 "`tokenEstimate > DEFAULT_BUDGET`인 노드 0개"**를 같이 적어두면 다음 저작자가
관측량을 되돌려 넣어 팩을 자르는 재발을 막는다.
