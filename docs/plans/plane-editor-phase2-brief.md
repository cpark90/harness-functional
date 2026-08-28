---
status: ready           # orchestrator 작성 — C1 게이트 통과 확인 후 dispatch
kind: dispatch-brief
consumer: orchestrator → developer (opus) → vnv (opus)
source: docs/feedback/plane-editor-and-kg-content-decisions.md   # 결정 1-(a)·2-(a), status: approved
design: docs/feedback/inquiries/tool_suggestion.md               # v0.2 §4.3·§8 Phase 2
map: docs/plans/plane-editor-phase0.md                           # §4.2 접점 P1–P6
---
# Phase 2 dispatch 브리프 — 링크 평면 + 설계결정 평면

> 승인 근거: 사용자 결정 **1-(a) 병행 착수**(링크 저장소·설계결정 평면은 즉시, **앵커를 링크
> 종단점으로 바인딩하는 작업만 C1 통과 후**), **2-(a) `ontology/` 밖 링크 스토어 1개 +
> 무결성 검사기 신설**. lane 분담(2026-08-28): `tools/plane-editor/**`는 이 세션 소유이고
> `ontology/**`·`tools/{lint_uniformity,ontology_lib,retrieve,materialize}.py`·`ONTOLOGYSTYLE.md`는
> 다른 세션(sim-hil B-wave) 소유다 — **읽기만 하고 절대 쓰지 않는다.**

## 1. 목표 (한 문장)

주석 평면 옆에 **설계결정 평면**을 세우고, 두 평면과 지식 그래프를 잇는 **링크 평면을
`ontology/` 밖 스토어 1개**로 구현해, 평면 간 결합이 인라인 참조가 아니라 **typed link**로만
일어나게 한다(v0.2 §4.2 I1).

## 2. 담당·경로 (파일 경계)

- **developer dispatch (opus)**: `tools/plane-editor/**` **만**. 링크 스토어와 무결성
  검사기도 이 디렉토리 안에 둔다(`tools/plane-editor/link-store/` + `tools/plane-editor/check_links.py`).
  - **[지킴] `ontology/`·기존 `tools/*.py`·`ONTOLOGYSTYLE.md`·`docs/feedback/**` 수정 금지.**
    `check_links.py`는 `tools/ontology_lib.py`를 **import해 읽기만** 한다(존재 판정용).
- **vnv dispatch**: 판정만 → `docs/verify/plane-editor-phase2-verify.md`.
- **git: inspection**.

## 3. 범위 (이번에 하는 것)

### 3a. 링크 평면 (결정 2-(a))

- **저장소**: `tools/plane-editor/link-store/links.json`(단일 파일, 결정론적 정렬). 그래프
  **밖**이므로 `validate.py`/`retrieve.py`가 스캔하지 않는다 — 이것이 B9(그래프 재도입 금지)를
  자동 준수하는 이유이며, 그 대가로 무결성은 **전용 검사기**가 진다.
- **링크 레코드**: `{id, from, to, type, evidence?, created_by}`. `from`/`to`는 **종단점 표기**
  `{plane, ref}` — plane ∈ `annotation` | `decision` | `graph`, ref는 평면별 안정 식별자
  (annotation·decision은 레코드 id, graph는 **IRI 표기** `id:<slug>` — Phase 0 §4.2 P2).
- **링크 타입 어휘 (v0.2 §4.3 [v0.2 B] — 신조어 금지)**: 그래프에 이미 있는 `ho:` 관계
  어휘를 **재사용**한다(`tagged`/`derivedFrom`/`constrainedBy`/`alternativeOf`/`overlapsWith`).
  **`supersedes`는 설계결정 평면 내부 전용**이며 **그래프 종단점에는 쓸 수 없다**(B9 경계 —
  검사기가 위반을 FAIL로 잡는다).
- **무결성 검사기 `check_links.py`** (단일 명령·비대화형·결정론):
  1. `graph` 종단점 IRI가 실재하는지 — `ontology_lib.instance_nodes`로 판정(추정 금지).
  2. `annotation`/`decision` 종단점 레코드가 실재하는지.
  3. 링크 타입이 어휘 안에 있는지, `supersedes`가 그래프 종단점을 겨냥하지 않는지.
  4. 양쪽이 모두 존재하지 않는 **고아 링크 0**.
  종료 코드로 통과/실패를 내고, 위반은 `{링크 id, 사유, 종단점}` 포맷으로 출력한다.

### 3b. 설계결정 평면

- 레코드 `{id, title, body, status(open|accepted|superseded), supersedes?}` — 주석 평면과 같은
  standoff 원칙(문서와 별개 파일), 같은 크기 규율(**cap 260 token, chars/4**)을 적용한다.
- **판정 메커니즘의 차이를 명시**(v0.2 §검토 D): 이 평면은 다른 평면과 달리 **결정론적 판정이
  불가능**하다(논증의 타당성). 그래서 커밋 조건은 기계 검사가 아니라 **판정 주체 표기**
  (`decided_by`)로 두고, 검사기는 형식(필수 필드·cap·supersedes 순환 없음)만 본다.

### 3c. 단방향 원칙 (Phase 0 §4.2 말미)

각 접점은 **한 방향씩** 연다. 이번 wave는 **평면 → 그래프 참조**(링크가 IRI를 겨냥)만 만들고,
그래프에서 평면으로 되짚는 역방향 인덱스·양방향 동기화는 만들지 않는다.

## 4. 비범위 (하지 않는 것)

- **앵커를 링크 종단점으로 바인딩** — 조건 C1(S9·S10 오해소 0/≥12시행) 통과 후 별도 wave.
  이번 wave의 링크는 **레코드 id**를 겨냥하고 텍스트 앵커를 겨냥하지 않는다.
- P1(주석 ↔ `docs/feedback` 항목) 어댑터 — **GAP A3 해소 대기**
  (`inquiries/verified-lane-vocabulary-promotion.md`가 answered 되면 그 어휘로 정의역 고정).
- P3(가중 앵커 ↔ `ho:Anchor`) — 실측상 저작 근거 0(`docs/verify/kg-content-candidates.md`).
  또한 `anchorTarget` range가 `ho:Concept`뿐이라 **개체를 겨냥한 주석은 Anchor로 표현 불가** —
  그 경우가 정확히 이 링크 평면 소관이다.
- 툴 스코핑·평면별 읽기 응답·webui 통합(Phase 3~4), materialize 렌더, 그래프 쓰기(P5).

## 5. Phase 4 예고 조항 (설계 시 미리 지킬 것)

cap 260과 영역당 1선별의 **유일 정의처는 도구 층**(`lint_uniformity.py:TEXT_CAP_TOKENS`,
`retrieve.py`의 `alternative_clusters`)이다. 편집기는 **재구현 금지**. 단 Node↔Python 프로세스
경계 때문에 직접 import가 불가하므로, 공유는 값 복제가 아니라 **계약 표면**(도구가 cap/클러스터를
내보내는 CLI·JSON)으로 실현한다. 이번 wave에서는 3b의 cap 적용을 그 계약 표면 **소비자 1호**로
만들어라 — 상수를 코드에 박지 말고 도구에서 읽어온다.

## 6. 수용 게이트 (vnv)

- **G1 무결성 검사기 negative control**: (a) 없는 IRI 종단점, (b) 없는 레코드 종단점,
  (c) 어휘 밖 타입, (d) 그래프 종단점을 겨냥한 `supersedes`, (e) 고아 링크 — **5종 전부 FAIL**
  실측 + 정상 링크 대조군 PASS(vacuous 배제).
- **G2 cap 계약 표면**: 도구 층에서 cap 값만 바꿨을 때 편집기 판정이 **따라 바뀌는지**
  negative control 1건(값 복제였다면 안 바뀐다).
- **G3 결정론**: 검사기·스토어 직렬화 3회 실행 byte-identical.
- **G4 앵커 회귀**: 기존 스위트 재실행 — **stale 레인 ≥93.3% 유지 + 오해소 0 유지**
  (결정 1-(a)가 확정한 기준 레인).
- **G5 경계**: `git diff --stat`으로 `tools/plane-editor/` 밖 변경 0. repo 게이트 3종
  (validate/lint/determinism) PASS 유지 — `ontology/` 무접촉이므로 자동 성립, 회귀 확인용.
- **G6 언어 정책**: 산문 한글·용어 영어.

## 7. 착수 조건

C1 게이트(`docs/verify/plane-editor-c1-verify.md`) 결과 확인 후 dispatch. C1이 미충족이어도
**3a·3b는 착수 가능**하다(바인딩만 차단) — 결정 1-(a)의 병행 착수가 그 뜻이다.
