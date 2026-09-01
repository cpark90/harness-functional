# 온톨로지 관리 web UI — 설계 (design)

로컬 Python 웹서버 + Docker 패키징으로, 에이전트와 사람이 **같은
`ontology/*.ttl`을 단일 진실공급원(SSOT)** 으로 공유하며 관리하는 관리도구의 아키텍처
문서다. 원 제안·결정 이력은 `docs/feedback/webui-management-tool.md`(승인됨), 온톨로지
자체 설계는 `docs/federation-design.md`와 agentic-knowledge-base 청크 d-0013·d-0014, TTL 저작 규약은 `ONTOLOGYSTYLE.md`.

> 상태: **구현 존재(as-built) · 미검증(스모크 전) · 미커밋**. 이 문서는 as-built 코드에
> 정박한 설계 기록이며, 남은 작업(검증·커밋·열린 결정)은 §9에 둔다.

## 1. 목적과 불변식 (왜 UI로 승격하나)

이 프로젝트의 가치는 *flat OWL 파일 = SSOT + git-diff 리뷰 + validate/retrieve 파이프라인*
이다(agentic-knowledge-base 청크 d-0013). web UI는 이 가치를 **깨지 않고** 사람의 편집을 같은 게이트에 태우기
위해 존재한다 — **웹도구는 상태를 fork하지 않는다.** 같은 `ontology_lib`/`validate.py`/
`retrieve.py`로 읽고 쓰므로, 사람이 고치든 에이전트가 고치든 동일 불변식이 걸린다.

| 실패모드 | UI 메커니즘 |
|---|---|
| **drift** (near-synonym 클래스·untyped edge) | 편집 폼이 `/api/schema`(TBox)로 **구속** — 클래스는 TBox 클래스 드롭다운, 프로퍼티는 range 제약 picker. 새 클래스·untyped edge를 만들 수 없다. |
| **orphan** (고립 노드섬) | 저장 전 `validate.py` **게이트** — reachability·capability gap·중복 label이면 저장을 롤백하고 인라인 표시. 그래프 뷰로 고립이 눈에 보인다. |
| **rot** (컨텍스트 팽창) | 조회/composition은 `retrieve.py`의 **예산 투영 pack** 경유(전체 로드 안 함). |

## 2. 아키텍처 개요

```
브라우저(127.0.0.1:8000)
   │  REST(JSON)
   ▼
FastAPI (uvicorn)  ── tools/webui/server.py
   ├─ 그래프 캐시 2벌 (asserted / reasoned), 파일 mtime으로 무효화
   ├─ tools/ontology_lib.py   load_graph · instance_nodes/edges · label_of · most_specific_types
   ├─ tools/validate.py       run_structured() → {pass, shacl, reachability, capabilities, ...}
   ├─ tools/retrieve.py       project(g, request, budget) → context pack
   └─ tools/webui/ttl_writer.py  스타일 보존 surgical write (append / node-span 치환)
   ▼
ontology/*.ttl   (호스트 볼륨 마운트 — 컨테이너 밖 SSOT)
```

핵심 설계 결정: **백엔드가 추론·검증을 Python(rdflib)에서 끝내고 JSON만 투영**한다. 따라서
프론트는 RDF를 다룰 필요가 없고(브라우저 RDF 라이브러리 불필요) 일반 SPA + 그래프 라이브러리로
충분하다.

## 3. 백엔드 모듈 경계 (재사용 vs 신규)

- **재사용(로직 불변)**: `ontology_lib`(로더·노드/엣지·label·타입), `retrieve.project()`
  (dict 반환, `--format json` 이미 존재).
- **확장(표시 로직만 추가, 검사 로직 유지)**: `validate.py`에 `run_structured()`/`--json`
  추가 — `check_*`가 print+bool에 더해 SHACL `report_text`·orphan 목록·capability gap·중복을
  **구조화 dict**로 반환. CI/웹이 같은 결과를 소비.
- **신규**: `server.py`(FastAPI), `ttl_writer.py`(텍스트 수술식 쓰기).

### flat import 처리
두 도구는 `import ontology_lib`(패키지 아님). `server.py`가 시작 시 `sys.path`에 `tools/`와
`tools/webui/`를 주입해 해소한다. `ONT_DIR`은 `ontology_lib.__file__` 기준이므로 볼륨 마운트는
`ontology/`를 `tools/`의 형제로 둔다(컨테이너 `/app/ontology`, `/app/tools`).

## 4. API 계약

| method · path | 입력 | 출력 | 재사용 |
|---|---|---|---|
| `GET /api/schema` | — | `{classes[], objectProperties[], datatypeProperties[]}` (폼 구속 데이터; SKOS 관계 프로퍼티 포함) | ontology_lib + TBox 스캔 |
| `GET /api/graph` | — | `{nodes[], edges[]}` — **asserted 엣지만**(추론된 inverse 미표시) | instance_nodes/edges |
| `GET /api/node/{id}` | id | `{id, type, objectProps{}, dataProps{}}` — asserted 필드 | predicate_objects |
| `PUT /api/node` | node dict (+선택 `_mtimes`) | `{saved, validate, diff, file[, mtimes]}` | ttl_writer + validate |
| `POST /api/validate` | — | `run_structured()` 결과 | validate.py |
| `POST /api/retrieve` | `{request, budget?}` | context pack | retrieve.project |

- **asserted vs reasoned 분리**: 편집·그래프·스키마는 **asserted**(reason=False) 그래프로
  본다 — UI가 추론 트리플(예: inverse `componentOf`)을 표시·재저장하지 않게. **retrieve**는
  closure 위에서 랭크하므로 **reasoned** 그래프를 쓴다. 둘 다 파일 mtime 변화 시 무효화.
- **validate는 항상 디스크에서 재로드**(`run_structured()`가 reload) — 판정이 현재 TTL 기준.

## 5. 저장 파이프라인 (PUT /api/node)

1. `ttl_writer.plan_upsert(node, expected_mtimes)` — 쓰기를 **계획만** 계산
   (`{file, old, new, created}`). 대상 파일이 read 이후 바뀌었으면 `Conflict`(→ HTTP 409).
2. `atomic_write` — temp + `os.replace`로 원자 교체(크래시가 반쪽 파일을 노출하지 않음).
3. 캐시 무효화 → `validator.run_structured()` **게이트**.
4. **FAIL이면 `restore`로 롤백**(신규 파일은 삭제, 기존은 이전 내용 복원)하고 `saved:false`
   + validate 리포트 + diff 반환. PASS면 `saved:true` + 갱신된 mtimes 반환.

즉 저장은 "낙관적 쓰기 → 검증 → 실패 시 롤백" 방식으로, **디스크에 잘못된 상태가 커밋되지
않는다**. diff는 unified diff로 UI 미리보기.

## 6. 스타일 보존 TTL 쓰기 (ttl_writer) — "확인하며 고치기"의 핵심

**rdflib 재직렬화 금지**: 그래프 통째 `serialize()`는 섹션 배너(`#===`)·주석·한줄/여러줄
스타일·프레디킷 순서·prefix 배치를 파괴해 사람 diff 가독성과 ONTOLOGYSTYLE §3·§4를 깬다.
대신 **텍스트 수술식**:

- `render_block(node)` — 한 노드를 ONTOLOGYSTYLE 프레디킷 순서(`ORDER`)로 직렬화. 문자열·수치·
  `id:` 참조 타입별 포맷. 예산·리터럴 이스케이프 처리.
- `_iter_blocks` / `_replace_block` — `id:<name> … .` 블록 경계를 찾아 **그 노드의 span만
  치환**, 신규는 대상 파일(기본 `authored.ttl`)에 **append**(없으면 헤더와 함께 생성). 파일
  전체는 재작성하지 않는다.
- 검증은 파싱된 그래프로, **영속은 텍스트 레벨**로 — 분리가 원칙.
- 삭제는 소프트(`ho:maturity "deprecated"`) 기본, 하드 삭제는 validate 통과 시에만.

## 7. 동시성·보안

- **동시성**: CLI 에이전트(developer)와 웹(사람)이 같은 abox를 쓸 수 있다. 웹 쓰기는
  ① `_mtimes`로 read-이후 변경 감지(409), ② temp+`os.replace` 원자 교체, ③ 노드 블록 단위 커밋.
- **보안**: compose가 `127.0.0.1:8000:8000`으로 **루프백 바인딩**(기본 0.0.0.0은 TTL write·추론
  실행 도구를 네트워크 노출). 인증 없음 = **로컬 신뢰 전제**임을 README/compose 주석에 명시.
  협업은 도구 인증이 아니라 git/PR로(§8).

## 8. 배포·운영 & 오픈소스 협업 모델

- **Docker**: `python:3.12-slim` → deps 설치 → `PYTHONPATH=/app/tools` →
  `uvicorn tools.webui.server:app`. compose가 `./ontology`·`./tools`를 rw 볼륨으로 마운트해
  편집이 호스트 TTL에 영속(컨테이너 무상태). 운영: 루트에서 `docker compose up` → `localhost:8000`.
  부수 이점: 컨테이너 python엔 rdflib/pyshacl/owlrl가 있어 호스트 인터프리터 분리 문제가 사라짐.
- **OSS-native 협업(결정 G)**: web UI는 기여자별 **로컬 authoring 도구**, 협업 기판은
  **git/GitHub PR**. fork/clone → `docker compose up` → 폼 구속 편집 → commit → PR.
  **CI 게이트**(`.github/workflows/validate.yml`)가 PR마다 `validate.py`를 돌려 anti-orphan/
  drift를 기여에 강제. 메인테이너는 **TTL diff**(사람이 읽는 텍스트)로 리뷰·머지. async 참여
  = PR 비동기. 그래서 ✅'로컬·무인증'이 옳다. (호스티드 라이브 다중편집은 범위 밖 — 결정 G 대안.)
- **2계층**: agent 하네스(orchestrator/developer/vnv/inspection)=메인테이너측 자동화, 외부
  기여자=git/PR. 둘 다 같은 `validate.py` 게이트를 공유.

## 9. 결정 기록 & 남은 작업

### 확정된 결정 (`docs/feedback/webui-management-tool.md`)
- **A/B/C**: 즉시저장+validate 게이트+diff / v1 네 화면 전부 / 위치 `tools/webui/`. ✅
- **D**: 저장=TTL-in-git 유지(rdflib in-process, store 인터페이스 추상화 여지), 그래프=Cytoscape.js.
- **E**: developer 경계를 `tools/**` 소스까지 확장(일반 구현자). ✅ (CLAUDE.md·developer.md 반영)
- **F**: git init + 공개 repo. LICENSE = **Apache-2.0** (as-built).
- **G**: OSS-native(로컬 도구 + git/PR + CI). ✅ (사용자: 오픈소스 공개·대규모 async 참여)

### 확장성 (아키텍처는 지금, 구현은 단순하게)
- canonical은 TTL-in-git 유지. 대규모 시 **Oxigraph/Jena Fuseki를 파생·재적재 index**로만 얹음
  (원본은 여전히 TTL, git-diff 리뷰 보존). v1은 rdflib in-process로 충분.
- **추론 캐시**: 서버는 reasoned 그래프를 메모리 캐시하고 파일 mtime으로 무효화(요청당 재추론 회피).
- **그래프 뷰 페이징/필터**: 노드 증가 시 `/api/graph`를 타입·태그·이웃 반경으로 서버측 필터·페이지.

### frontend 스택 = Svelte (결정 확정, 사용자 선택)
편의성 우선(결정 D 추천)으로 **as-built vanilla JS를 Svelte로 재작성**한다. 백엔드 API 계약
(§4)은 불변 — 프론트만 교체. UX 투자: range autocomplete picker(타입 참조), 저장 전 diff
미리보기 + validate 인라인, 그래프 검색·포커스·이웃 확장, undo/재편집, 한글 오류 메시지.

**빌드·서빙 아키텍처 (Svelte 도입이 만드는 볼륨 shadowing 해소)**: Svelte는 빌드 산출물을
`tools/webui/static/`에 내며 `server.py`는 이 경로를 `StaticFiles(html=True)`로 서빙(server.py
불변). 문제는 compose가 `./tools:/app/tools`를 rw 마운트하면 **호스트의 (빌드 안 된) static이
이미지에 빌드된 산출물을 가린다.** 해소:
- **Docker 멀티스테이지 빌드**: stage1 `node`에서 `frontend/`를 `npm ci && npm run build` →
  `tools/webui/static/` 생성, stage2 `python`이 이를 포함해 복사.
- **compose에서 `./tools` 볼륨 마운트 제거**(SSOT인 `./ontology`만 유지). tools는 이미지에
  구워지고, ttl_writer/ontology_lib의 경로는 `ontology/`(마운트됨) 기준이라 SSOT 영속·검증에
  영향 없음. 코드 변경 시 이미지 재빌드(도구엔 허용).
- **오프라인 런타임**: Cytoscape.js는 npm 의존으로 번들에 포함(런타임 CDN 없음). npm은 이미지
  **빌드 시점**에만 네트워크 사용, `docker compose up` 운영은 오프라인.
- **git**: `node_modules/`·빌드 산출물 `tools/webui/static/`은 `.gitignore`(Docker가 빌드).
  로컬 비-Docker 실행은 `cd tools/webui/frontend && npm install && npm run build` 후 uvicorn
  (README/CONTRIBUTING에 1블록).

### 남은 작업 (dispatch 대상)
1. **frontend Svelte 재작성 (developer dispatch)**: 위 스택·빌드 아키텍처로 `tools/webui/
   frontend/` 신설, `static/`은 빌드 산출물, Dockerfile 멀티스테이지, compose `./tools` 마운트
   제거, README/CONTRIBUTING 갱신. 백엔드(server.py·ttl_writer.py·validate.py) 불변.
2. **검증 (vnv dispatch)**: `docker compose up` 스모크 — 볼륨 마운트로 호스트 TTL write 확인,
   그래프 로드·노드 편집·validate PASS·retrieve pack. 판정·증거는 `docs/verify/`. Docker 부재
   환경이면 최소한 server import + `validate.py --json` + ttl_writer 라운드트립 + frontend
   `npm run build` 스모크.
3. **커밋 (inspection)**: git 첫 커밋(사용자 요청 시). tbox/abox/shapes 불변 → `validate.py`는
   계속 PASS여야 한다(도구가 그래프 의미를 바꾸지 않음).
