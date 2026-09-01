---
status: draft            # Phase 0 산출물 — 채택·후속 dispatch는 orchestrator 소관
kind: formalization-map  # 신규 구현 없음: 기존 lane의 매핑 + 재사용 경계 명세
author: developer (dispatch, opus)
source: docs/feedback/inquiries/tool_suggestion.md v0.2 §8 "Phase 0 — 기존 lane 형식화" [v0.2 E]
approved-item: docs/feedback/verified/annotation-backbone-architecture.md  # 적용 계획 ④ (webui/tiptap lane)
measured-at: 2026-08-28   # 아래 수치는 이 시점 워킹트리 실측 (3회 측정 — §1.1 주의 참조)
revalidated: 2026-08-28   # 재dispatch 시 전 인용(file:line) 재확인 — §1.1 주의 박스 참조
baseline: validate.py PASS · lint_uniformity.py PASS · check_determinism.py PASS (측정 중 262→269 individuals / 6,994→7,134 triples — 병행 세션이 같은 워킹트리를 편집 중; 3차 측정에서 269/7,134로 안정)
---
# Phase 0 — 기존 lane 형식화 (평면×자산 매핑 · 재사용 경계 · 형식화 GAP)

> **⚠ 2026-09 재배치 — 이 문서는 분할 이전(2026-08-28)의 실측 스냅샷이다.** 아래의 모든
> `파일:줄` 인용·개수는 **단일 저장소(구 `harness_ontology`) 시점**의 값이며, 그 뒤 사다리
> 재배치로 자산이 갈라졌다. 다음 세 가지로 치환해 읽는다 — 인용의 줄 번호는 재검증하지
> 않았으므로 **그대로 신뢰하지 말고 필요할 때 다시 확인한다**:
> - **`ontology/abox/**`(18 TTL)·개체 수·`abox/authored.ttl`** → 이제 **harness-concrete**의
>   `ontology/abox/core/<group>/*.ttl`. 이 저장소(**harness-functional**)에는 개체가 없고
>   `ontology/tbox/`·`ontology/shapes/`만 있다.
> - **`docs/DESIGN.md`** → **삭제됨**. 그 내용은 agentic-knowledge-base의 결정 청크로 이송됐다
>   (형식 저장·좁은 읽기 d-0013, 3대 실패 모드와 방어선 d-0014, 조립 워크플로 d-0015,
>   토큰 예산 d-0016, 교훈 승격 d-0017). "설계 결정 평면"의 저장 위치 서술은 이제
>   `docs/feedback/verified/**` + `docs/plans/**` + `docs/verify/**` + **그 청크들**이다.
> - **하드 6축 게이트**(reachability·capability·assemblyOrder·capacityFit 포함)는 개체가 있는
>   **harness-concrete의 union 게이트**에서만 실질적으로 걸린다. 이 저장소의 `make validate`는
>   TBox 정합성·SHACL·라벨 중복의 좁은 게이트다.
>
> **살아 있는 부분**은 5평면 프레임, 재사용 경계, GAP 목록(A1~E3), §4의 Phase 1 계약이다 —
> 그것들은 자산이 어느 저장소에 있든 성립한다.

> **이 문서가 하는 일**: 설계 원본 `tool_suggestion.md` v0.2가 정의한 5개 지식 평면을,
> **이 repo에 이미 존재하는 원시 구현**에 1:1로 대응시키고 Phase 1+가 어디까지 재사용할 수
> 있는지 경계를 긋는다. **신규 구현은 없다** — 새 코드·새 그래프 노드·기존 파일 수정 모두 없고,
> 이 문서 한 개만 추가된다.
>
> **이 문서가 하지 않는 일**: 판정(vnv 소관)·커밋(inspection 소관)·설계 변경(orchestrator 소관).
> 아래 GAP은 "메워야 한다"는 관찰이지 착수 승인이 아니다.
>
> **인용 규약**: 모든 주장은 `파일:줄` 근거를 단다. 근거 없는 추정은 쓰지 않고, 확인 못 한
> 것은 "미확인"으로 명시한다.
>
> **재확인 이력**: 이 문서의 `파일:줄` 인용은 2026-08-28 재dispatch 시 **전건 재실행 확인**
> 했다(코드·TTL·규약 문서 인용 전부 지시 대상이 그대로였다). 그 사이 움직인 것은 **개수뿐**
> 이며(아래 각 지점에 반영), 구조 주장·GAP은 하나도 뒤집히지 않았다.

---

## 0. 왜 백지 구현이 아니라 매핑에서 시작하는가

v0.2 §검토 E의 논지 그대로다 — 이 repo에는 다섯 평면 각각의 **원시 구현이 이미 가동 중**이고,
그중 셋(프로토콜·지식 그래프·투영)은 **CI 게이트로 강제되는 수준**까지 형식화되어 있다
(`.github/workflows/validate.yml:21-29` — validate / determinism / lint 3스텝). 백지에서
평면을 다시 만들면 이미 검증된 불변식을 재구현하면서 검증 비용을 두 번 내게 된다. Phase 0의
산출은 따라서 "무엇을 그대로 쓰고, 무엇을 감싸고, 무엇만 새로 만드는가"의 경계다.

---

## 1. 평면 × 자산 매핑

### 1.1 5평면 매핑표

| 평면 (v0.2 §2.1) | repo 기존 구현 | 진리 판정 메커니즘 (실제 코드/게이트) | 원자 단위 | 안정 식별자 | 현재 저장 위치 |
|---|---|---|---|---|---|
| **주석** | `docs/feedback/` 채널 (inbox + `verified/` + `inquiries/`) | **기계 판정 없음.** 사람 승인 게이트 — 사용자만 `status: open`→`approved` (`docs/feedback/README.md:22-23`), inspection 판정 (`README.md:17-19`) | 항목 파일 1개 (frontmatter + 본문) | **파일 경로**(=slug). 문서 내 위치 앵커 없음 | `docs/feedback/*.md`(inbox) + `verified/`(판정 보고) + `inquiries/`(조사) — 항목 수는 refresh로 변동 |
| **설계 결정** | `docs/DESIGN.md` + `docs/feedback/verified/**` + `docs/plans/**` + `docs/verify/**` | **논증 + 사람 승인.** verdict 3값 `apply`/`apply-with-changes`/`needs-decision` (`docs/feedback/verified/README.md:10`), 적용 3조건 게이트 (`verified/README.md:11-13`) | 문서 절(section) 단위 결정 | **없음** — 절 제목으로만 참조 (GAP B1) | `docs/DESIGN.md`, `docs/feedback/verified/`, `docs/plans/`(21 + 이 문서), `docs/verify/`(42) |
| **데이터 프로토콜** | TBox `ontology/tbox/harness.ttl` + SHACL `ontology/shapes/harness-shapes.ttl` | **결정론적.** pyshacl on reasoned graph — `validate.check_shacl` (`tools/validate.py:39-58`, `inference="none"`은 이미 추론했기 때문 `:48`) | 클래스/프로퍼티 선언 1개, `sh:NodeShape` 1개 | **IRI** `https://harness-ontology.dev/schema#…` (`docs/DESIGN.md:8-9`) | `ontology/tbox/` (46 class · 62 ObjectProperty · 44 DatatypeProperty), `ontology/shapes/` (20 NodeShape) |
| **인터페이스** | **부분 대응만 존재** — `ho:Contract` + `tools/verify_contract.py` (ODR VERIFY 축, `verify_contract.py:2-18`), `GET /api/schema`의 domain/range 폼 구속 (`tools/webui/server.py:122-147`) | contract 종류별 판정 — `executable`(shell exit 0) / `structural`(`file-exists:` · `file-contains:` · `section:` 문법) (`verify_contract.py:20-27`), IRI 정렬 결정론 보고 (`:29-30`) | contract 1개 (`ho:capabilityContract`) | contract IRI (`ct-` 접두, `tools/lint_uniformity.py:123`) | `ontology/abox/**`, 검증기 `tools/verify_contract.py` |
| **지식 그래프** `[v0.2 A]` | `ontology/abox/**` (18개 TTL) | **결정론적 하드 6축.** SHACL·reachability·capability·assemblyOrder·capacityFit·registryDrift AND (`tools/validate.py:326-327`, `:364-371`); duplicates는 **advisory**(`:287-289`, `:372`) | individual = TTL 노드 블록 (`tools/webui/ttl_writer.py:238-254`) | **IRI** `https://harness-ontology.dev/id/<domain>/<slug>` (`docs/DESIGN.md:12-13`, `tools/ontology_lib.py:23`) + §2 접두사표 (`ONTOLOGYSTYLE.md:150`) | `ontology/abox/`, webui 신규 저작분은 `abox/authored.ttl` (`ttl_writer.py:296`, `:316`) |

측정치 근거(2026-08-28, 워킹트리 직접 실행):

> **주의 — 이동 표적**: 이 워킹트리는 **여러 세션이 병행 편집 중**이라 개수는 측정 시점에
> 좌우된다. 실제로 같은 세션 안 두 차례 측정에서 그래프가 262→269 individuals /
> 6,994→7,134 triples로, 채널 항목 수가 refresh로 줄었다. **개수가 아니라 구조·위반 성격이
> 이 문서의 주장**이며, 아래 어휘 위반 수치는 세 측정 모두에서 동일했다.

- 그래프: 개체 262→269 / 트리플 6,994→7,134 (reasoned), Harness 7 —
  `ontology_lib.load_graph` + `instance_nodes` 직접 호출. **3차 측정(재dispatch 시점)에서
  269 / 7,134로 안정**.
- annotation 어휘 실사용: `ho:Anchor` 인스턴스 **0**, `ho:alternativeOf` **0**,
  `ho:overlapsWith` **0**, `ho:hasAnchor` **0** / 대조군 `ho:tagged` 135→140 (asserted 그래프).
  `validate.py`도 같은 사실을 독립 보고한다("registered but not instantiated: Anchor…").
- `docs/feedback` frontmatter 실측 분포(README·METHODOLOGY 제외, 3차 측정 = 22 verified 항목):
  - inbox `status:` — 전부 `approved`(규약 2값 `open`/`approved` 안).
  - `inquiries/` `status:` — `answered`만 관측(이전 측정의 `closed` 항목은 refresh로 빠졌다).
    관측된 값은 규약 3값 안이다(`docs/feedback/inquiries/README.md:7`).
  - `verified/` `status:` — `reported` **16** / `finalized` **1** / 키 없음 5.
    `verified/README.md`는 이 lane에 `status:` 키를 **정의하지 않는다**(`:8-15`).
  - `verified/` `verdict:` — `done` **13** / `apply-with-changes` **4** / `apply` **3** /
    `apply-plan-ready` **1** / 키 없음 1. 규약이 정의한 값은 3개뿐
    (`apply` · `apply-with-changes` · `needs-decision`, `verified/README.md:10`) — 즉
    **최빈값 `done`을 포함해 실사용 22건 중 14건이 미정의 값**이다(GAP A3). 이 비율은
    항목 refresh를 거친 세 차례 측정에서 모두 유지됐다 — 개수가 아니라 **정착된 성질**이다.

### 1.2 평면별 근거 주석 (표가 압축한 사실)

**주석 평면.** 채널 문서 스스로 "**온톨로지 그래프 밖**"임을 선언하고, 그 근거로
`validate.py`/`retrieve.py`가 `ontology/`만 스캔한다고 적는다(`docs/feedback/README.md:4-5`).
이는 코드와 일치한다 — `ontology_lib.ONT_DIR`은 `<repo>/ontology`이고(`tools/ontology_lib.py:27`),
`tools/*.py` 전체에 `docs/feedback`을 읽는 코드가 **한 줄도 없다**(grep 0건). 즉 이 평면의
"해소 상태"는 **순수 문서 규약**이다. 상태 어휘는 lane마다 다르다: inbox `open`→`approved`
(사용자만, `README.md:10-11`·`:22-23`), inquiries `open`→`answered`→`closed`
(`docs/feedback/inquiries/README.md:7`), 그리고 완료 마커 `{name}.wip.md`→rename
(`README.md:37-39`).

**설계 결정 평면.** 결정이 실제로 기록되는 형태는 세 가지다 — (1) 원칙 산문
(`docs/DESIGN.md:14-20`의 `ontology/` rename 기각 결정처럼 근거까지 적힌 것),
(2) 판정 보고(`docs/feedback/verified/**`, verdict + 적용 계획 + **적용 결과 기록란**),
(3) 계획·이슈(`docs/plans/` 21개 + 이 문서, `docs/verify/` 42개 보고). 승인 게이트는 세 조건 AND —
inbox 항목 `status: approved` + verdict가 apply류 + 보고 rename 완료
(`docs/feedback/verified/README.md:11-13`).

**프로토콜 평면.** shapes는 **검증 전용**이라 데이터 그래프에 접히지 않는다
(`tools/ontology_lib.py:129-131`이 로딩 시 `shapes/` 경로를 건너뛴다; shapes 파일 스스로도
같은 사실을 적는다 `harness-shapes.ttl:23-25`). SPARQL 제약은 `sh:prefixes`가 가리키는
선언 노드(`harness-shapes.ttl:26-29`)에서 접두사를 해석하며, 그 파일 상단의 Turtle `@prefix`는
쓰이지 않는다(`:21-23`; 사용처 `:488-491`) — 프로토콜 평면 편집 시의 실제 함정.

**인터페이스 평면.** v0.2 §2.1이 이 평면의 판정자로 지목한 "타입 체커(결정론)"에 해당하는
자산은 **이 repo에 없다**: CI에 타입체크 스텝이 없고(`.github/workflows/validate.yml:14-29`가
전부), 프론트엔드도 순수 JS다(`tools/webui/frontend/package.json`의 devDependencies =
svelte/vite만, TypeScript 없음). 가장 가까운 대응물은 **스펙 적합성** 검증기
`verify_contract.py`인데, 이것은 타입이 아니라 산출 트리의 파일·문자열·헤딩을 판정한다
(`verify_contract.py:23-27`). 즉 이 평면은 **대응물 부분 존재 + 앵커 부재** 상태다(GAP D1·D2).

**지식 그래프 평면.** 이 평면만이 "저장 게이트 + 읽기 투영 + 저작 린터"를 모두 갖춘 완성형이다.
쓰기는 §2.6의 webui write path, 읽기는 §1.3의 투영 lane, 저작 규약은
`ONTOLOGYSTYLE.md`(§1c 텍스트 상한 260 token, `:83-94`)와 그 린터
(`tools/lint_uniformity.py:150-151`, `:331-365`)가 맡는다.

### 1.3 횡단 lane 2종 (평면이 아니라 평면을 가로지르는 층)

v0.2 §8 Phase 0이 함께 지목한 두 자산은 평면이 아니라 **투영 계층(§4.1 상단)** 과
**쓰기 규약(§4.2 I3)** 의 구현이다.

| lane | v0.2 대응 | repo 구현 | 판정/보증 메커니즘 |
|---|---|---|---|
| **뷰 조립 (읽기 투영)** | §4.1 투영 계층 · I2 "뷰는 저장하지 않고 질의로 조립" · §6.3 지식그래프 행 | `tools/retrieve.py` | 예산 상한 `DEFAULT_BUDGET = 900` (`retrieve.py:43`) + 노드당 `token_cost`(`ho:tokenEstimate`, 없으면 15 `:179-182`); 전순서 랭킹 키 `(-score, maturity_rank, IRI)` (`:145-152`); **재현성 게이트** `check_determinism.py` (4 요청 × md/json × 4 시드, `:40-49`·`:91-97`) |
| **쓰기 게이트** | §4.2 I3 "평면마다 다른 쓰기 규약" (지식 그래프 행) | `tools/webui/server.py` + `ttl_writer.py` | `plan_upsert` → `atomic_write` → `validate.run_structured()` → 실패 시 `restore` (`server.py:199-215`); 낙관적 잠금 `Conflict`→HTTP 409 (`server.py:199-201`, `ttl_writer.py:287-293`) |

투영 lane이 이미 구현하고 있는, v0.2가 Phase 4로 미뤄 둔 장치 하나: **anchor 영역당 대안
1선별**. `alternative_clusters`가 `ho:alternativeOf`의 **무향 연결 성분**을 최소 IRI 키로
계산하고(`retrieve.py:196-232`), `traverse`가 같은 성분의 두 번째 노드를 **token_cost 부과
전에** 영구 탈락시킨다(`retrieve.py:250-268`). 예산 초과 노드는 `break`가 아니라 `continue`로
건너뛴다(`:269-279`). Phase 4는 이 규칙을 **재구현하지 말고 공유**해야 한다 — 설계 원본이
"`retrieve.py`와 동일 선별 규칙 공유 — 도구/retrieve 이중 구현 금지"를 Phase 4 조항으로
못박았다(`docs/feedback/inquiries/tool_suggestion.md:301-304`, 검토 C `:374-377`).

---

## 2. 재사용 경계 명세

각 평면에 대해 (a) **그대로 재사용** / (b) **감싸서 재사용**(어댑터 지점 명시) /
(c) **새로 만들 것** 으로 나눈다.

### 2.1 주석 평면
- **(a) 그대로**: lane 분리 구조 자체(inbox → `verified/` 판정 → 적용 → refresh,
  `docs/feedback/README.md:13-30`)와 `.wip.md`→rename 완료 마커(`:37-39`). 이 두 가지는
  세션 분리 환경에서 검증된 프로토콜이므로 Phase 2의 annotation 레코드 lifecycle이 그대로
  차용할 수 있다.
- **(b) 감싸서**: 상태 어휘. Phase 1 브리프가 정한 annotation 레코드 status는
  `open|resolved` 2값인데(`docs/feedback/inquiries/tool_suggestion-phase1-brief.md:31`),
  repo 실사용 어휘는 lane마다 다르고 규약 밖 값까지 섞여 있다(§1.1 측정치). **어댑터 지점**:
  lane별 상태값 → `{open, resolved}` 사영 함수 1개 — 단, GAP A3가 남아 있는 한 사영의 정의역이
  확정되지 않으므로 **A3 해소가 선행**이다. 역방향(도구→문서)은 손실이 있으므로 단방향으로 둔다.
- **(c) 새로**: 문서 **내부 위치 앵커**. 현재 주석의 대상 표기는 frontmatter `targets:`
  자유 리스트뿐이고, 값 어휘가 섞여 있다 — IRI(`id:scheme`), TBox 접두 조각(`tbox:ho:`),
  파일 경로(`tools/retrieve.py`)가 한 리스트에 공존한다
  (`docs/feedback/verified/annotation-backbone-architecture.md:4`). 줄·범위 selector는 없다.

### 2.2 설계 결정 평면
- **(a) 그대로**: **3조건 승인 게이트**(`verified/README.md:11-13`)와 규약상 verdict 3값
  (`:10`). v0.2 §4.2 I3 [v0.2 D]가 요구한 "**판정 기록 존재**"는 이 lane이 이미 파일로
  구현한다 — 보고서 존재 자체가 판정 기록이다. (단 실사용 verdict 값은 규약을 벗어나 있다 —
  GAP A3.)
- **(b) 감싸서**: 적용 결과 기록란. 승인 보고서는 적용 후 "적용 결과" 절을 채우는 규약을
  가진다(`docs/feedback/README.md:27-28`; 실제 기록 예:
  `verified/annotation-backbone-architecture.md:105-136`). 이것이 사실상 결정의 **상태 전이
  기록**이므로, 구조화된 필드로 감싸면 그대로 결정 레코드가 된다.
- **(c) 새로**: **결정 ID**와 **supersedes 링크 저장소**. v0.2 §4.3은 supersedes를
  설계결정 평면 **한정**으로 명문화했고(그래프 재도입 금지 — B9 결정), 그 저장소는 아직 없다.

### 2.3 프로토콜 평면
- **(a) 그대로**: TBox 어휘 + shapes 전부. 특히 이번 wave에 land된 annotation 술어 3종이
  Phase 2+의 그래프측 표현을 이미 제공한다 — `ho:alternativeOf`(대칭, `harness.ttl:635-637`),
  `ho:overlapsWith`(`:639-641`), `ho:Anchor` n-ary(`:205-208`) + `ho:hasAnchor`(`:650-653`) +
  `ho:anchorTarget`(`:655-659`) + `ho:anchorConfidence`(`:930-934`), 그리고 그 불변식
  `AnchorShape`(`harness-shapes.ttl:455-474`)·`AlternativeOfSharedAnchorShape`(`:486-501`).
- **(b) 감싸서**: 없음. 프로토콜 평면은 편집기가 **읽기 전용 링크 대상**으로만 참여한다
  (v0.2 §5.3 — Tiptap 적용 범위 밖).
- **(c) 새로**: 스키마 **delta**(하위호환) 판정. §3 GAP C1.

### 2.4 인터페이스 평면
- **(a) 그대로**: `GET /api/schema`가 내보내는 domain/range 폼 구속
  (`server.py:122-147`) — 편집기 UI가 "이 술어에 무엇을 넣을 수 있는가"를 물을 때 쓸 수 있는
  기존 API. `ho:Contract` 판정기도 그대로 호출 가능(`verify_contract.py` CLI).
- **(b) 감싸서**: 없음(현 단계). 링크 대상으로만 참여.
- **(c) 새로**: 심볼 앵커(LSP/tree-sitter 심볼 ID)와 타입 판정 게이트. **Phase 3 범위**.

### 2.5 지식 그래프 평면
- **(a) 그대로**: 읽기 = `retrieve.project(g, request, budget)`
  (`retrieve.py:296`)와 그 결정론 게이트; 쓰기 = §2.6의 write path 전체; 저작 규약 =
  `lint_uniformity.py` 6검사(`:380-387`). Phase 4가 강제해야 할 cap 260은 이미 값·측정법
  (`chars//4`, `ho:promptText`+`skos:definition` 합)까지 확정되어 있다
  (`lint_uniformity.py:150-151`·`:331-338`, `ONTOLOGYSTYLE.md:83-94`).
- **(b) 감싸서**: `ttl_writer`의 **subject 인식 범위**. 블록 스캐너 정규식은
  `^(id:[A-Za-z0-9_-]+)`로 `id:` 접두 subject만 블록으로 인정하고(`ttl_writer.py:59`,
  `:238-254`), 대상 디렉토리는 `ABOX_DIR` 상수로 고정된다(`:33-34`). 다른 도메인
  (`lpranging` 등)이나 `<full IRI>` 표기 subject는 **찾지 못한다**(`find_subject_file`이
  None을 돌려주고 `plan_upsert`가 신규 append 경로로 빠진다 — `:256-261`, `:315-323`).
  중앙 `core` 도메인 밖을 편집하려면 여기가 어댑터 지점이다.
- **(c) 새로**: 승인 항목이 명시한 **거부 규칙 3종을 write path에 얹는 것**(§3 GAP E1).

### 2.6 webui write path 재사용 경계 — 함수 시그니처 수준 계약

Phase 2가 "그래프에 떨어지는 annotation"을 저장할 때 재사용할 **정확한 표면**이다.

```python
# tools/webui/ttl_writer.py
class Conflict(Exception): ...                                   # :105-106

def plan_upsert(node: dict,
                target_basename: str = "authored.ttl",
                expected_mtimes: dict | None = None) -> dict:    # :296-323
    """-> {"file": str, "old": str | None, "new": str | None, "created": bool}
       raises Conflict — 대상 파일이 read 이후 변경됨"""

def render_block(node: dict, existing: dict | None = None,
                 managed: set | None = None) -> str:             # :177-218
def atomic_write(path: str, text: str) -> None:                  # :326-336
def restore(path: str, old: str, created: bool) -> None:         # :339-345
def abox_files() -> list[str]:                                   # :221-230
```

계약 C1–C8 (각각 실측 근거):

- **C1. 계획과 수행의 분리.** `plan_upsert`는 디스크를 쓰지 않고 계획만 계산한다
  ("Compute the write without performing it", `ttl_writer.py:296-303`). 호출자가
  `atomic_write`를 따로 부른다(`server.py:205`). → dry-run이 공짜다.
- **C2. 저장은 MERGE, 블록 덮어쓰기가 아니다.** 편집기가 authoritative한 술어는
  `payload 키 ∪ _managed`이며, 그 밖에 디스크가 이미 가진 술어는 **원문 그대로 보존**된다
  (`ttl_writer.py:177-206`; `managed` 기본값 = payload 키 `:193-195`). "관리 대상인데 안 보냄"
  = 삭제, "비관리" = 보존. 이 기본값이 손실 방지선이다(`:11-19` 설계 주석).
- **C3. 낙관적 잠금의 키는 ABox 루트 상대경로다.** `expected_mtimes`는
  `{os.path.relpath(p, ABOX_DIR): mtime}` 형태(`server.py:111-118`)이고, 비교 허용 오차는
  `1e-6`(`ttl_writer.py:287-293`). basename 키를 쓰면 그룹 디렉토리의 동명 파일이 잠금 슬롯을
  공유해 동시 편집을 가린다(`server.py:112-116` 주석). → Phase 2 어댑터도 **relpath 키**를 써야 한다.
- **C4. 검증은 호출자 책임이다.** `ttl_writer`는 "persistence here is purely textual"
  (`ttl_writer.py:20-21`). 즉 `plan_upsert` 자체는 **어떤 의미 검사도 하지 않는다** — 게이트는 쓰기 **후**
  `validator.run_structured()`이고 실패 시 `restore` 롤백이다(`server.py:207-213`).
- **C5. 게이트 분류(무엇이 거부되고 무엇이 조용히 통과하는가).**
  - **거부(롤백)**: 하드 6축 중 하나라도 실패 — SHACL·reachability·capability·assemblyOrder·
    capacityFit·registryDrift (`validate.py:326-327`).
  - **조용히 통과**: `duplicates`(같은 클래스 내 동일 prefLabel)는 advisory라 `hard_ok`에
    들어가지 않는다(`validate.py:287-289`, `:326-327`, `:372`).
  - **write path에 아예 없음**: `lint_uniformity`(cap 260·접두사표·언어 정책)는 `server.py`가
    import하지 않는다(`server.py:38-42`가 import 전부). → **cap 초과 노드는 webui로 저장되고
    CI에서야 잡힌다.** Phase 4의 "cap 초과 거부"는 이 구멍을 메우는 작업이다.
- **C6. HTTP 표면.** `PUT /api/node`는 `id`·`type` 필수(400), `id:` 접두 자동 부착,
  `Conflict`→409, 블록 위치 실패→500, 검증 실패 시 `{"saved": false, ...}`+diff
  (`server.py:192-215`).
- **C7. 신규 노드의 착지 지점.** 기존 블록이 없으면 `ontology/abox/authored.ttl`에 append,
  파일 자체가 없으면 고정 헤더와 함께 생성한다(`ttl_writer.py:315-323`, 헤더 `:91-102`).
- **C8. 캐시 무효화가 필수 동반.** 서버는 쓰기 직후 `_invalidate()`를 부르고 검증도 디스크
  재로드로 한다(`server.py:206`, `validate.py:311-315`). 어댑터가 이 호출을 빠뜨리면
  판정이 옛 그래프를 본다.

**경계 한 줄 요약**: *그래프에 저장되는* annotation은 C1–C8을 **그대로** 타면 되고,
*문서 평면에 남는* annotation은 `plan_upsert`를 탈 수 없다(C2의 TTL 블록 전제, §2.5(b)의
`id:` subject 전제). 후자에는 **3-패턴만 추출한 어댑터**(낙관적 잠금 → atomic write →
검증 실패 시 롤백)를 쓴다.

---

## 3. 형식화 GAP 목록

"원시 구현은 있으나 형식 규약이 없는" 지점. 담당 층은 **도구**(코드) / **그래프**(TBox·ABox) /
**문서**(규약) 중 하나로 표시한다.

| GAP | 평면 | 내용 | 실측 근거 | 담당 층 | 후속 |
|---|---|---|---|---|---|
| **A1** | 주석 | status 전이가 **문서 규약일 뿐 기계 강제가 아니다** — 어떤 도구도 `docs/feedback`을 읽지 않는다 | `tools/*.py`에 `feedback` 참조 0건; `ontology_lib.py:27` (`ONT_DIR`=ontology만); `docs/feedback/README.md:4-5` | 도구 | Phase 2 |
| **A2** | 주석 | 대상 표기 `targets:`가 **자유 형식·미검증**이며 어휘가 섞여 있다(IRI·TBox 조각·파일 경로) | `verified/annotation-backbone-architecture.md:4` (`tbox:ho:` 포함), `docs/feedback/sim-hil-coding-harvest.md:3` | 도구 (+그래프 어휘는 기존) | Phase 2/3 |
| **A3** | 주석 | 해소 상태 **어휘가 lane마다 다르고, 실사용 값 상당수가 규약에 정의돼 있지 않다** — `verified/`의 `status: reported`(16)·`finalized`(1)는 README에 키조차 없고, `verdict: done`(13)·`apply-plan-ready`(1)는 정의된 3값 밖이다 | 실측 분포 §1.1; `docs/feedback/verified/README.md:10`(정의 3값)·`:8-15`(status 키 미정의); `docs/feedback/inquiries/README.md:7`(또 다른 3값) | 문서 | Phase 0 후속(문서 정정) |
| **B1** | 설계결정 | **결정 ID 부재** — v0.2 §2.1이 요구한 안정 식별자가 없어 결정은 절 제목으로만 참조된다 | `docs/DESIGN.md`(절 제목만), `verified/annotation-backbone-architecture.md:62` ("사용자 결정 (2026-08-27…)") | 문서 (+도구) | Phase 2 |
| **B2** | 설계결정 | **supersedes 저장소 부재** — 대체 이력은 git 커밋과 산문에만 있다 | v0.2 §4.3 표(`tool_suggestion.md:154`)가 "설계결정 평면 한정"으로 명문화; 그래프 재도입은 B9 결정으로 금지 | 도구 | Phase 2 |
| **B3** | 설계결정 | I3의 커밋 조건 "**판정 기록 존재**"를 확인하는 기계 검사가 없다(A1과 동일 뿌리) | `tool_suggestion.md:140` (I3 [v0.2 D]); write 게이트는 `ontology/`만 본다 | 도구 | Phase 5 |
| **C1** | 프로토콜 | **하위 호환성(delta) 검사 부재** — `validate.py`는 현재 스냅샷만 판정하고 이전 버전과 비교하지 않는다 | `validate.py:311-338` (입력은 현재 디스크 그래프 하나) vs `tool_suggestion.md:139` (I3 프로토콜 행 = "스키마 검증 + 하위 호환성 검사") | 도구 | Phase 3/5 |
| **D1** | 인터페이스 | **결정론적 타입 판정 게이트 부재** — CI에 타입체크 스텝 없음, 프론트엔드도 순수 JS | `.github/workflows/validate.yml:14-29`; `tools/webui/frontend/package.json` (svelte/vite만) | 도구 | Phase 3 |
| **D2** | 인터페이스 | **심볼 앵커 부재** — 가장 가까운 대응물의 앵커가 "경로+문자열"이라 v0.2 §2.1이 지적한 붕괴 형태 그대로다 | `verify_contract.py:23-27` (`file-exists:` · `file-contains:<path>::<substr>` · `section:<path>::<heading>`) | 도구 | Phase 3 |
| **E1** | 지식그래프 | 승인 항목이 명시한 **거부 3종이 write path에 없다**: (i) cap 초과 — 린터가 CI에만 있음, (ii) anchor 없는 annotation 거부 — `AnchorShape`는 Anchor 개체의 well-formedness만 봄(역방향 강제 없음), (iii) 무관계 근사중복 거부 — 연결된 쌍만 SPARQL 강제, 미연결 근사중복은 advisory 경고뿐 | (i) `server.py:38-42`; (ii) `harness-shapes.ttl:455-474`; (iii) `harness-shapes.ttl:486-501` vs `validate.py:287-289`·`:326-327`; 요구사항 원문 `verified/annotation-backbone-architecture.md:66-67` | 도구 (+그래프: shapes) | Phase 4 |
| **E2** | 지식그래프 | annotation 어휘가 **선언됐으나 실사용 0** — 첫 실사용 wave 전까지 `AnchorShape`·`anchor-` 접두사·SPARQL 불변식이 실전 검증되지 않았다 | 실측 anchors 0 / alternativeOf 0 / overlapsWith 0; TBox 정의가 "DECLARED BUT DORMANT BY DESIGN"으로 명시(`harness.ttl:205`); 후속 메모 (c) `verified/annotation-backbone-architecture.md:134-135` | 그래프 | Phase 2 |
| **E3** | 지식그래프 | **harness-level anchor 표현 불가** — rollup 체인이 `hasComponent o hasAnchor`라 harness 노드 자신에 붙인 Anchor는 도달성이 성립하지 않는다 | `harness.ttl:289` (chain), 후속 메모 `verified/annotation-backbone-architecture.md:134` | 그래프 (schema 결정) | Phase 2+ |
| **F1** | 투영 | **평면 축 파라미터화 부재** — `project()`는 요청 문자열과 예산만 받고 평면 필터가 없어, 모든 타입이 한 팩에 섞인다 | `retrieve.py:296` (`project(g, request, budget)`) vs `tool_suggestion.md` §6.2·§6.3 | 도구 | Phase 4 |
| **F2** | 투영 | **팩이 그래프 평면만 본다** — 투영 대상은 `INSTANCE_CLASSES` 기반 개체뿐이라 주석·설계결정 평면(docs/)은 애초에 후보가 아니다 | `ontology_lib.py:76-87`, `:177-186` | 도구 | Phase 2/4 |
| **G1** | 링크 | **링크 평면 저장소 자체가 없다** — 그래프 **내부** 링크는 `ho:` 술어로 존재하지만 그래프↔문서 링크는 frontmatter `targets:` 자유 텍스트뿐(A2) | §2.1(c); v0.2 §4.3 링크 타입 5종에 대응하는 저장소 부재 | 도구 | Phase 2 |

**GAP이 아닌 것(의도된 경계 — 오인 방지)**:
- TBox 산문이 cap 260 대상에서 빠진 것은 결함이 아니라 **명시된 scope 결정**이다
  (`lint_uniformity.py:341-346`: "TBox schema documentation is out of scope", `ONTOLOGYSTYLE.md:93-94`).
- `ho:tokenEstimate`가 모든 노드에 없는 것도 정상이다 — §1c의 적용 범위가 조건부다
  (`ONTOLOGYSTYLE.md:75-79`, `lint_uniformity.py:102-118`).
- cap의 하한 130은 **권고**이고 린터는 상한만 강제한다(`ONTOLOGYSTYLE.md:89-90`,
  `lint_uniformity.py:146-149`).

---

## 4. Phase 1 인터페이스 계약

### 4.1 경계 — Phase 1은 이 lane들과 **연결하지 않는다**

Phase 1 프로토타입의 파일 경계는 **신규 디렉토리 `tools/plane-editor/` 하위뿐**이다
(`docs/feedback/inquiries/tool_suggestion-phase1-brief.md:19-20`).

> **관측 사실(2026-08-28, 2회 갱신)**: 이 dispatch 시작 시점에 `tools/plane-editor/`는
> 존재하지 않았으나, 작성 도중 **병행 세션이 해당 디렉토리를 생성**했고(관측 1:
> `package.json` · `probe.mjs` · `src/{annotation-plane,anchors,store,text-index,dom}.mjs` ·
> `fixtures/{document,anchors}.json`), 재확인 시점에는 브리프 `:37-39`가 요구한 헤드리스
> 진입점까지 갖춘 상태였다(관측 2: `run-suite.mjs` · `suite-result.json` ·
> `schema-dump.json` · `REPORT.md` · `src/{scenarios,schema,session,report,reload-child}.mjs` ·
> `sample-state/`; 의존성은 `@tiptap/*` 3.30.5 · `yjs` 13.6.32 · `y-prosemirror` 1.3.7 ·
> `jsdom` 30.0.1 — `package.json`). 즉 Phase 1은 이 lane 형식화와 **동시 진행 중**이다.
> 이 문서는 그 구현 내용을 판정하지 않는다(vnv 소관) — 아래 계약은 브리프에서 읽은 **경계**일
> 뿐이며, 실제 산출물과의 대조는 Phase 1 vnv 게이트가 한다. **경계 자체는 관측과 일치한다**:
> 그 트리는 전부 `tools/plane-editor/` 하위이고 `.mjs`/JSON뿐이라 `ontology/`·기존 `tools/*.py`를
> 건드리지 않는다.

비범위는 브리프 §6이 명시한다 — 링크 평면·
설계결정 평면·**IRI 앵커(지식 그래프 연결)**·툴 스코핑·cap/영역당 1선별·webui 통합·TBox 술어
(`tool_suggestion-phase1-brief.md:66-68`).

이 비접속은 **구조적으로 보장된다**: Phase 1 산출물은 Node 런타임(Tiptap/ProseMirror/Yjs,
브리프 `:26`·`:37-39`)이고 위 lane들은 전부 Python 런타임(`rdflib`/`pyshacl`/`owlrl`)이라,
프로세스 경계가 그대로 평면 경계다. Phase 1은 `ontology/`를 읽지도 쓰지도 않으므로 기존
게이트 3종에 영향이 없다(브리프 G4 `:62-63`) — 그것이 §5의 회귀 확인이 자동 성립하는 이유다.

**Phase 1이 지켜야 할 계약(형식화 관점에서 후속 접속의 전제)**:
1. annotation 레코드는 **문서와 별개 파일**로 영속한다(standoff, 브리프 `:36`). — 이 분리가
   깨지면 Phase 2에서 어느 평면에도 매핑할 수 없다.
2. 레코드 필드 `{id, anchors, body, status}`에서 **`status`는 필수**(브리프 `:31`).
3. 앵커는 **Selector 다중화**(Yjs `RelativePosition` 주앵커 + `TextQuoteSelector` 복구용,
   브리프 `:32-35`)이고, 해소 실패는 **orphaned로 명시 표기**(조용한 소실 금지).
4. 문서 스키마에 annotation용 mark/노드가 **0개**(브리프 G1 `:59`, v0.2 §5.2 anti-pattern).

### 4.2 Phase 2에서 연결될 접점 목록

| # | 접점 | Phase 1 쪽 | 이 repo 쪽 | 선행 조건 |
|---|---|---|---|---|
| **P1** | **annotation 레코드 ↔ feedback 항목** | 레코드 `{id, status(open\|resolved)}` (브리프 `:31`) | 항목 파일 + frontmatter `status:` (`docs/feedback/README.md:48-55`) | **GAP A3** 해소(상태 어휘 정의) 후, §2.1(b)의 단방향 사영 함수 |
| **P2** | **IRI 앵커 ↔ 지식 그래프 평면** | `anchors[]`에 `{kind:"iri", value:"id:<slug>"}` 종류 추가 | 존재 판정은 `ontology_lib.instance_nodes` (`:177-186`), 표기 규약은 `ONTOLOGYSTYLE.md §2` 접두사표(`:150`) | 결정론 판정이므로 게이트화 가능 — **GAP A2**의 자유 형식 targets를 이 종류로 대체 |
| **P3** | **가중 앵커 ↔ `ho:Anchor`** | 앵커 신뢰도(선택) | `ho:hasAnchor`→`ho:Anchor`(`anchorTarget` 1개 + `anchorConfidence` 0..1, `harness-shapes.ttl:455-474`) | **경계 주의**: `anchorTarget`의 range는 `ho:Concept`뿐(`harness.ttl:657`)이라 "**개체**를 겨냥한 주석"은 Anchor로 표현되지 않는다 — 그 경우는 `ho:tagged` 또는 링크 평면(G1) 소관 |
| **P4** | **대안 서술 ↔ `ho:alternativeOf`** | 같은 대상의 복수 주석 | 저장은 허용, **투영에서 영역당 1개만 admit**(`retrieve.py:250-268`) | 쌍은 반드시 공유 `ho:tagged` Concept를 가져야 함(`harness-shapes.ttl:486-501`) — 아니면 SHACL FAIL |
| **P5** | **그래프 쓰기 경로** | 그래프에 떨어지는 annotation 저장 | §2.6 계약 C1–C8 (`plan_upsert`→`atomic_write`→validate→`restore`) | C5의 게이트 분류를 그대로 승계 — cap 검사는 아직 write path에 없음(**GAP E1**) |
| **P6** | **읽기 투영** | 편집기가 보는 컨텍스트 | `retrieve.project()` | 평면 필터가 붙기 전(**GAP F1·F2**)까지 annotation 평면은 팩에 **들어가지 않는다** — Phase 2는 이 사실을 전제로 설계해야 한다 |

각 접점은 **한 방향씩** 열어야 한다. 양방향 동기화를 먼저 만들면 v0.2 §4.2 I1(평면 간 직접
참조 금지)이 요구한 "링크만 건다"가 깨지고, 이 repo가 이미 겪은 동기화 부채가 재현된다.

---

## 5. 게이트 회귀 확인 (문서 추가만이므로 자동 성립 — 실행 확인용)

2026-08-28, `/usr/bin/python3`, repo root 기준 실행 결과:

| 게이트 | 결과 |
|---|---|
| `tools/validate.py` | **PASS** — SHACL / reachability / capabilities / assemblyOrder / capacityFit / registryDrift 6축 전부 ✓, duplicates 경고 0 |
| `tools/lint_uniformity.py` | **PASS** — 6검사 위반 0 (tokenEstimate·naming prefix·language·maturity·definition·text cap) |
| `tools/check_determinism.py` | **PASS** — 4 요청 × {md, json} × 4 run, 요청당 1 distinct pack |

세 게이트 모두 **재dispatch 시점(269 individuals 그래프)에 다시 실행해 PASS를 재확인**했다 —
직전 실행이 그래프 편집 이전이었던 `check_determinism.py`도 포함이다(4 요청 × md/json × 4 run,
요청당 1 distinct pack). 그 사이의 그래프 변화는 병행 세션 몫이며 이 dispatch가 기여한 변경은
없다(§1.1 주의).

이 lane 작업은 `docs/plans/plane-editor-phase0.md` **한 파일만 추가·갱신**했고 `ontology/`·
`tools/`·기존 문서를 수정하지 않았으므로, 세 게이트는 구조적으로 무영향이다(위 실행은 확인용).

---

## 6. 후속 (이 문서가 넘기는 것)

- **문서 층 즉시 처리 후보**: GAP **A3**(verified lane의 `status: reported|finalized`와
  `verdict: done|apply-plan-ready`가 규약에 없음 — 실사용 값 상당수가 미정의). 정정 대상은
  `docs/feedback/verified/README.md`이고 이 dispatch의 담당 경로 밖이므로, orchestrator가
  별도 micro dispatch로 처리할 사안이다(규약을 실사용에 맞출지, 실사용을 규약에 맞출지는
  설계 결정).
- **Phase 1 착수 시**: §4.1의 계약 4개를 브리프에 그대로 승계하고, §4.2 접점은 **열지 않는다**.
- **Phase 2 설계 시**: §2.6 계약과 §4.2 표를 입력으로 쓰고, 시작점은 P1·P2(단방향) 두 개로 제한.
- **Phase 4 설계 시**: cap(§2.5(a))과 영역당 1선별(§1.3)은 **이미 구현이 있다** — 재구현 금지,
  공유가 요구사항(`docs/feedback/inquiries/tool_suggestion.md:301-304`).
