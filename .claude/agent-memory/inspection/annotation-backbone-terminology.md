# backbone+anchored-annotation 제안 조사 (용어 표준화 + 파급 지도)

`docs/feedback/annotation-backbone-architecture.md`(inbox, open) +
`verified/annotation-backbone-architecture.md`(needs-decision). 2026-08-27.

## 용어 매핑 (사용자 임의어 → KG 표준어; 재사용)
- "block" → **anchored annotation**(W3C `oa:Annotation` body+target; 같은 target 복수 = 중복·대안
  설명 내장). `owl:AnnotationProperty`와 이름충돌 주의. 차선 `TextChunk`(SPAR/DoCO).
- "skeleton" → **backbone**(taxonomy backbone) = `skos:ConceptScheme` — repo에 `id:scheme` 실존.
- "확률적" → **confidence**; node-level은 `ho:salience`(retrieve.py:136 prior 소비) 실존,
  **edge-level confidence는 GAP**(n-ary/RDF-star 필요).
- "겹치는 설명영역" → **scope**(`oa:hasScope`); "구조적 위치" → **anchor**(CAPRA evidence anchoring).

## 파급 요지 (실측)
- 제안 3/4은 씨앗 실존: anchor 강제(=anti-orphan tagged), backbone(scheme+broader 29e), salience.
- **유일 충돌 = 중복 서술 vs anti-drift**(golden rule 2·duplicate-label 경고). 양립안(권고 A):
  `ho:alternativeOf` 상호연결 필수 + anchor 필수 + retrieve가 anchor 영역당 1설명 선별 + 린터는
  무관계 근사중복만 적발. GAP 3종: alternativeOf/overlapsWith 술어, edge confidence, 크기 cap
  (§1c 무상한 — cap 검사의 자연 위치는 lint_uniformity.py, 단위 line vs token 결정 필요).
- 도구 동형: SWE-Edit Viewer/Editor ≡ retrieve.py/developer dispatch(golden rule 1 계승);
  tiptap ProseMirror 스키마 ≡ SHACL/plan_upsert 게이트; webui write path(`tools/webui`) 실존.

## 결정 확정 (2026-08-27)
사용자 **(A) 승인** + 도구 목적 2건: ①제약 집행(규약을 결정론 게이트로 강제 — anchor 없으면 저장
거부) ②노이즈 차단 입력(영역당 대안 1선별 = 저장은 중복 허용, 투영은 무노이즈). verdict
apply-with-changes, 4단계 분할(TBox 술어→린터/게이트→retrieve 선별→webui lane). 적용 대기.
브리프 초안 4종 전부 확보(사용자 지시로 inspection 작성, 채택=orchestrator):
①=`inquiries/tbox-annotation-predicates-brief.md`(Symmetric 최초 도입·Anchor chain axiom·
공유-anchor SHACL·§2/§3 동반), ②=`linter-annotation-cap-brief.md`(**cap 500 token 확정**,
wc-w 관례·abox만·현 최대 199 실측·500/501 경계 control), ③=`retrieve-alternative-selection-
brief.md`(무향 연결성분당 1 admit·새 정렬키 없음·skip은 예산 차감 전·0-edge byte-identity
회귀; ① 후 권장), ④Phase1=`tool_suggestion-phase1-brief.md`(S1–S8 생존율·오해소 0).
순서: ①→③, ②·④는 독립 병행.

## tool_suggestion 검토 (inquiries lane, answered)
`inquiries/tool_suggestion.md` = 지식 평면 분리 편집기 설계(4평면: 주석/설계/프로토콜/인터페이스).
판정: 방향 채택 — I2≡golden rule 1, I3≡plan_upsert 게이트, 6.1(저장≠컨텍스트 레이어링)이 핵심.
필수 수정 2: **A=온톨로지/KG 5번째 평면 부재**(앵커 표에 IRI 행 없음), **B=링크 어휘 ho: 중복**
(derives-from/constrains/targets; supersedes는 B9 제거 의미라 "그래프 안 금지·설계결정 평면 한정"
경계 명문화 필요). 보완: cap·영역당 1선별 미반영(retrieve와 선별규칙 공유), §9 부재, 기존 lane
매핑에서 시작(주석≈docs/feedback 채널). 편입: 승인 항목 적용계획 ④ webui lane의 구체화.

## 함정
- 채팅으로 온 사용자 제안은 inspection이 inbox 항목으로 **전사**(status: open, 결정 선택지 포함)
  후 verified에 분석 — 승인 태깅은 사용자만.
