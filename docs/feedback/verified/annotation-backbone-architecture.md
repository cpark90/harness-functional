---
source: docs/feedback/annotation-backbone-architecture.md
verdict: apply-with-changes   # 사용자 (A) 승인 + 도구 목적 2건 추가 — 계획 확정, 규모상 단계 분할
targets: [id:scheme, ho:salience, ho:tagged, tbox:ho:, tools/retrieve.py, tools/webui, tools/lint_uniformity.py]
kind: ripple-analysis
graph_baseline: 245 individuals, validate.py PASS, lint_uniformity.py PASS
---
# 검증 보고 — backbone + anchored annotation 아키텍처 파급 분석

사용자 제안(inbox 항목 참조)을 현행 그래프·도구에 실측 대조. 요지: **제안의 3/4은 이미 씨앗이
존재**하고(anchor·backbone·확률 가중), **중복 서술 허용 1건만 현행 정책과 정면 충돌**한다.

## 현행 대응물 실측 (이미 있는 것)
- **backbone**: `id:scheme`(`skos:ConceptScheme`) + `skos:topConceptOf` + `skos:broader` **29 edge**
  (concepts.ttl) — taxonomy backbone 그 자체. 모든 개체는 `ho:tagged`로 이 backbone에 연결되어야
  reachability를 통과한다 = **anchor 필수 규칙이 이미 강제됨**(anti-orphan).
- **확률 가중(confidence)**: `ho:salience`(0..1, node-level)가 존재하고 `retrieve.py:136`이 랭킹
  prior로 소비(`prior = 0.5 + salience`). 단 **edge-level confidence는 없음**(아래 GAP).
- **granularity cap**: 크기 상한 규약은 없음. 대신 §1 [지킴] "단일 책임" 원칙 + Q3 세분화 감사
  (`docs/verify/q3-granularity-audit.md`)가 blob을 사후 적발. 상한은 line이 아니라 **token**이
  이 repo의 예산 단위(`ho:tokenEstimate`, §1c) — 42 line ≈ 고정 토큰 상한으로 번역 가능.
- **편집 도구 기반**: `tools/webui`가 이미 존재(write path: plan_upsert → `authored.ttl`,
  게이트 분류 — webui-write-path 감사 이력 있음). tiptap 계열 블록 편집 UI를 얹을 자리.

## GAP (TBox/도구 확장 필요 — schema 확장 트리거 후보)
1. **edge-level confidence 부재**: `ho:tagged`·`skos:broader`는 crisp. "확률적 backbone"을 온전히
   하려면 가중 anchor가 필요 — OWL에선 qualified-relation(n-ary) 패턴 또는 RDF-star. 최소안:
   anchor 전용 술어에 병행 datatype(`ho:anchorConfidence`)을 두는 n-ary 노드 1종.
2. **overlap/대안 관계 부재**: 같은 지식 영역을 겹치게 설명하는 두 annotation을 잇는 술어가 없다
   (`skos:closeMatch`는 Concept 간, 개체 설명 간이 아님). 신설 후보: `ho:overlapsWith`(대칭) +
   `ho:alternativeOf`. 이것이 없으면 중복 서술은 현행 duplicate-label 경고·anti-drift 규칙에
   **드리프트로 오검출**된다.
3. **annotation 크기 cap 미규범화**: §1c에 상한 조항이 없음. `lint_uniformity.py`가 정확히 이
   축(authoring uniformity)의 집이므로 **cap 검사를 린터에 추가**하는 것이 자연 위치(42 line
   또는 등가 token 상한 — 단위는 결정 필요).

## 정책 충돌 (유일 차단점 — 사용자 결정 필요)
**중복 서술 허용 vs anti-drift.** CLAUDE.md golden rule 2와 §1은 근사동의어·중복을 드리프트로
규정하고, `validate.py`는 클래스 내 중복 라벨을 경고한다. 제안 3(같은 지식의 대안 설명 공존)은
이와 정면 충돌. **양립안(권고 A)**: 중복을 "무규율 근사동의어"가 아니라 **명시 관계로 묶인
대안 설명**으로만 허용 — (a) 대안들은 `ho:alternativeOf`로 상호 연결 필수, (b) anchor(tagged
개념) 명시 필수, (c) `retrieve.py`가 pack 구성 시 **같은 anchor 영역당 1설명만 선별**
(salience/maturity 키 재사용 — 예산 이중 소비 방지), (d) 린터가 "관계 없는 근사중복"만 적발.
이러면 drift 방어를 유지한 채 제안의 중복·겹침 의미를 수용한다.

## 도구 제작 매핑 (참조물 → 이 repo)
- **tiptap**(ProseMirror 스키마 블록 편집): webui 위 annotation 편집 프론트 — ProseMirror node
  ↔ annotation 개체, 스키마 검증 ↔ SHACL/plan_upsert 게이트가 구조 동형.
- **SWE-Edit**(MS, Viewer/Editor 서브에이전트 분리로 컨텍스트 오염 차단): 이 repo의
  retrieve.py(=Viewer, 예산 팩) + developer dispatch(=Editor)와 **이미 동형** — 도구 설계 시
  "편집기는 팩만 보고 편집, 전체 그래프 로드 금지"를 그대로 계승하면 된다(golden rule 1).
- **CAPRA**(evidence anchoring + 멀티에이전트 판정): anchor 필수 규칙 + vnv/inspection 게이트와
  동형 — annotation 저장 시 anchor 없으면 거부하는 결정론적 신뢰 경계로 차용.

## 적용 계획 골격 (orchestrator dispatch; 결정 A 채택 시)
1. TBox: `ho:alternativeOf`(대칭)·`ho:overlapsWith` + anchor-confidence n-ary 1종 (developer).
2. `lint_uniformity.py`: annotation cap 검사 추가(단위 결정 후) (developer).
3. `retrieve.py`: anchor 영역당 대안 1선별 로직 (developer; determinism 게이트 유지 필수).
4. webui: tiptap 기반 annotation 편집 lane (별도 wave — 규모 큼, 분리 브리프 권장).
5. 게이트(vnv/inspection): validate PASS·determinism PASS·린터 PASS + 대안쌍 상호연결 전수.

## 사용자 결정 (2026-08-27, inbox `status: approved`)
**(A) 채택** + 도구 목적 2건 명시:
1. **제약 집행(constraint enforcement)**: CLAUDE.md류 규약을 에이전트가 **위반하지 못하게 도구가
   막는다** — 규약을 산문으로 두지 않고 결정론적 게이트로 강제(CAPRA trust boundary 동형).
   기존 대응물: plan_upsert SHACL 거부·validate 하드 축·lint_uniformity·CI. 신규 반영:
   **anchor 없는 annotation 저장 거부**, cap 초과 거부, 무관계 근사중복 거부를 게이트에 추가.
2. **노이즈 차단 입력(noise-free reasoning input)**: 에이전트 추론 입력에 필요한 내용만 들어가게
   한다 — golden rule 1(예산 팩)의 재확인이자 확장. 신규 반영: **anchor 영역당 대안 1선별**이
   이 목적의 직접 구현(중복 서술을 저장은 허용하되 **투영에서 노이즈가 되지 않게** 하는 장치).
   SWE-Edit Viewer/Editor 분리 계승 근거도 이 목적.

→ 위 적용 계획 골격 1–5를 이 두 목적에 정렬해 확정한다: 게이트류(1·2·plan_upsert 확장)는 목적 1,
retrieve 선별(3)은 목적 2, webui/tiptap(4)은 두 목적의 UI 표면. **순서 권고**: TBox 술어(1) →
린터/게이트(2) → retrieve 선별(3, determinism 게이트 유지) → webui lane(4, 별도 wave).

**③의 브리프 초안 확보 (2026-08-27)**:
`docs/feedback/inquiries/retrieve-alternative-selection-brief.md` (alternativeOf 무향 연결
성분당 admission 1개 — 새 정렬 키 없음(기존 score→maturity→IRI 전순서가 대표 결정),
skip은 예산 차감 전, overlapsWith 비배제, 0-edge byte-identity 회귀 게이트; ① land 후 권장).
**②의 브리프 초안 확보 (2026-08-27, 단위=token 사용자 결정)**:
`docs/feedback/inquiries/linter-annotation-cap-brief.md` (cap 500 token = 42-line 환산,
metric=promptText+definition whitespace 합, scope=abox만 — 현 최대 199 실측·위반 0;
①과 독립 병행 가능). **이로써 미결이던 cap 단위가 token으로 확정.**
**①의 브리프 초안 확보 (2026-08-27)**: `docs/feedback/inquiries/tbox-annotation-predicates-brief.md`
(TBox 술어 3종 — alternativeOf/overlapsWith/Anchor n-ary + chain axiom·registry·SHACL 공유-anchor
불변식·§2/§3 동반 명세; 채택은 orchestrator).
**④의 구체화 설계 확보 (2026-08-27)**: `docs/feedback/inquiries/tool_suggestion.md` v0.2
(지식 평면 분리형 편집기 — inspection 검토 A–E 반영: 지식 그래프 5번째 평면·IRI 앵커·링크
어휘 ho: 재사용·cap+영역당 1선별을 Phase 4에 강제·Phase 0=기존 lane 형식화). ④ 착수 시 이
문서가 설계 원본.

**보강 조사 확보 (2026-08-27, 사용자 요청)**: `docs/feedback/inquiries/annotation-tooling-research.md`
— 12-에이전트 웹 조사(1차 소스 검증) 종합. 핵심: **GAP 1(edge confidence)은 n-ary로 사실상
결정**(rdflib 7.6.0이 RDF-star 파싱 불가 — 로컬 실증; RDF 1.2 forward-compatible), **cap 단위는
token 권고**(42 line 근거 없음, 256–300 tok 대역 실증), G4 total-order 전례 5종, 설계원본 v0.2
교정표(§6.4: Yjs null-on-delete·tiptap 유료 경계·CAPRA 정정 등), delta-SHACL 게이트 실측
포함. ①~④ brief 작성 시 이 문서 §8(주입 지도)을 함께 소비할 것.

## 판정
**apply-with-changes** — (A) 승인·계획 확정. 규모상 4단계 분할 dispatch(위 순서)로 적용 권고.
orchestrator가 developer dispatch로 수행; 각 단계 후 vnv 게이트(validate·determinism·lint) +
inspection 파급 재검증. 적용 결과는 아래 기록란에 채운다.

## 적용 결과 (orchestrator 기록란 — 적용 후 채움)

**적용 완료 2026-08-28** — 단계 ①·②·③ + 부속, workflow `wf_bba119db-082`(developer 5 +
vnv 3, opus). ④ webui lane은 계획대로 별도 wave로 남김(설계 원본 tool_suggestion.md v0.2).

- **사용자 결정 반영 (2026-08-27 세션)**: cap 값 **500 → 260 token**, 목표 대역
  **130–260 token**(= 100–200 word 검색 정밀도 최적대, annotation-tooling-research.md 근거),
  metric **chars/4**(§1c tokenEstimate 관례와 단위 통일; wc-w 초안 대체). 하한 130은
  권고(린터는 상한만 강제) — 하한 미달 노드(mode-hybrid 113 등)를 채우려 산문을 늘리는
  것은 밀도 목표에 역행하므로 하지 않는다(orchestrator 결정).
- **① TBox 술어 3종 land**: `ho:alternativeOf`(대칭)·`ho:overlapsWith`·`ho:Anchor` n-ary
  (+`hasComponent o hasAnchor` chain, AnchorShape, AlternativeOfSharedAnchorShape SPARQL
  불변식, INSTANCE_CLASSES 등록, §2/§3 문서 동반). abox 엣지 0(실재 대안쌍 부재 — 날조
  금지 준수). developer 설계 판단 2건 수용: Anchor는 `ho:HarnessComponent` 직속
  leaf(registryDrift 가드 유지 근거), `anchorConfidence` minCount 1(선별 전순서 보장).
- **② 린터 cap land**: `lint_uniformity.py` `check_text_cap` (abox 개체만, TBox 기계
  문서 제외), §1c [지킴] 조항 동반. 경계 260=PASS/261=FAIL 실측.
- **부속 압축**: 유일 초과 `id:mode-standing-service` 282→252 token(명제 6종 보존,
  tokenEstimate 252 재산정) → 현 그래프 위반 0.
- **③ retrieve 선별 land**: alternativeOf 무향 연결 성분당 1-admit(raw 그래프, 기존
  _rank_key 전순서가 대표 결정, skip은 예산 차감 전, overlapsWith 비배제, 정렬 IRI 순회).
- **vnv 판정 3건**: ①②+압축 = pass-with-notes (`docs/verify/annotation-tbox-linter-verify.md`),
  ③ = pass-with-notes (`docs/verify/retrieve-alt-selection-verify.md`) — negative control
  전수(공유태그 없는 쌍 FAIL, 261 주입 FAIL, 주입 클러스터 1-admit + 대조군 vacuous-pass
  배제, 예산 미차감 산술 확정), 0-edge byte-identity 18/18, materialize 무회귀.
  orchestrator 최종 확인: validate·lint_uniformity·check_determinism 전부 PASS.
- **마감 micro dispatch**: §1c "① land 후 적용" 괄호 시제 정리 + 린터 PREFIX_MAP
  `anchor-` 1행(§2 표와의 silent divergence 제거).
- **후속(비차단) 메모**: (a) cap headroom 얇은 노드 6개(252~215) — enrich 시 게이트 유의,
  (b) harness-level anchor는 chain으로 표현 불가(필요 시 스키마 결정), (c) 첫 anchor 개체
  저작 wave에서 AnchorShape·prefix 실사용 검증, (d) `gr-lang`↔`gr-standard-terms`의
  overlapsWith 부여는 판단성 저작이라 보류.

## inspection 재검증 (2026-08-28, land 전 독립 스팟체크)
vnv 자기보고와 별개로 워킹트리에서 재실측 — **전부 일치, land 승인**:
- 게이트 3종 직접 실행: `validate.py` PASS(**269** individuals; Anchor registered-not-
  instantiated는 harmless 4종에 편입 — 설계된 휴면과 일치)·`lint_uniformity.py` PASS(text cap
  위반 0)·`check_determinism.py` PASS.
- ① 실재: `alternativeOf`/`overlapsWith` 둘 다 `owl:SymmetricProperty`(tbox:635·639),
  `ho:Anchor`(tbox:205, dormant-by-design 정의 명문)·**9번째 chain axiom**(tbox:289,
  `hasComponent o hasAnchor`)·shapes 2종(AnchorShape·AlternativeOfSharedAnchor) 확인.
- ② 실재: cap **260·chars//4**(§1c tokenEstimate 관례와 단위 통일, 대역 130–260 문서화),
  유일 초과였던 `mode-standing-service` **252**/260 재실측. 사용자 결정(500→260·wc-w→chars/4)
  은 브리프 초안과의 층위 구분으로 기록됨 — 모순 아님(초안=42-line 환산, 확정=검색 정밀도 대역).
- ③ 실재: `alternative_clusters`(retrieve.py:196) 무향 연결성분·docstring의 raw-graph 근거
  (symmetric materialization 비의존) 확인. abox `alternativeOf` edge **0** = 예상 휴면 상태.
- 판정: ①②③ 적용 결과 기록 **완결**. 단 **refresh는 HOLD** — 적용 계획 ④(webui/tiptap lane)가
  미완(Phase 0 매핑 문서 land, Phase 1 이후 잔여)이라 이 보고가 ④의 판정·순서 anchor로 남는다.
  ④ 완료 시 항목·보고서 함께 refresh.

## inspection 재검증 2 (2026-08-28, ④ Phase 1 앵커 엔진)
- **G4(external) 충족**: repo 게이트 3종(validate·lint·determinism) inspection 직접 실행 — 전부 PASS.
- **독립 재현**: `node run-suite.mjs` 재실행 → payload sha256 `1a99081716e08495…` **REPORT와
  동일**(48시행 byte-identical). pipeline 레인 생존 100%(30/30)·전 레인 오해소 0·S5 orphan 6/6.
  stale 레인 93.3%(경계 드리프트 2, 오해소 아님)는 리포트가 숨김없이 병기 — 브리프 §4의
  "성공 케이스만 보지 말 것" 준수 확인. vnv `plane-editor-phase0-verify` pass-with-notes와 합치.
- ④ 진행 상태: Phase 0(매핑)+Phase 1(앵커 엔진 검증) 완료, Phase 2+(산문 평면 2종·링크
  저장소·코드 평면·툴 스코핑) 잔여 — HOLD 유지.
- **Phase 2 필수 이월 결함** (vnv 적대적 재검증 `plane-editor-phase1-verify.md` note 3,
  CONFIRMED): 블록 통째 삭제 시 RelativePosition이 `unresolved`(null)로 죽는데 tombstone
  규칙이 `collapsed`에만 걸려 quote 복구가 **남의 문장에 오부착**(both-affix 정규 경로 통과,
  `MIN_AFFIX=4`가 자연어에서 약함). S1–S8 밖이라 게이트는 유효하나 "오해소 0" 정신 위반 —
  Phase 2 브리프에 (a) 블록 삭제 시나리오 S9 추가, (b) tombstone 규칙의 unresolved 확장
  (+affix 강화)을 **필수 항목**으로 넣을 것.
