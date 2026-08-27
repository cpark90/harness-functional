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

## 판정
**apply-with-changes** — (A) 승인·계획 확정. 규모상 4단계 분할 dispatch(위 순서)로 적용 권고.
orchestrator가 developer dispatch로 수행; 각 단계 후 vnv 게이트(validate·determinism·lint) +
inspection 파급 재검증. 적용 결과는 아래 기록란에 채운다.

## 적용 결과 (orchestrator 기록란 — 적용 후 채움)
(미기록 — 적용 전)
