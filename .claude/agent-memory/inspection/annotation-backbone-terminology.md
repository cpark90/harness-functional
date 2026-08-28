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

## 보강 조사 dossier (2026-08-27, 12-에이전트 워크플로)
`inquiries/annotation-tooling-research.md` — ①~④ brief 소비용 §8 주입 지도. 재사용 사실:
- **RDF-star는 이 스택에서 불가**(rdflib 7.6.0 `<<>>` BadSyntax **로컬 실증**·pySHACL 미지원)
  → G1 n-ary 사실상 결정; RDF 1.2 reifier≡n-ary라 `rdf:reifies` 1 triple로 후행 정합.
- pySHACL `focus_nodes`/`use_shapes`(0.27+) delta 게이트: 실측 0.11s→<0.01s, **focus 밖 위반
  침묵**(affected set 계산 필수, 전역 제약은 full 백스톱).
- cap 단위 함정: 브리프②의 500은 **whitespace-word**(wc -w 관례), 문헌 최적대 130–260은
  **BPE token** — 혼용 금지; 500 words≈650+ BPE.
- 인용 교정 상시 목록: CAPRA=SW아키텍처 평가(결정론 경계=Evidence Anchoring만)·Prometheus
  tool-scoping 출처=Inside the Scaffold·Yjs RelativePosition은 삭제 시 null·tiptap
  Comments/AI Toolkit 유료(UniqueID만 MIT).

## 함정
- 채팅으로 온 사용자 제안은 inspection이 inbox 항목으로 **전사**(status: open, 결정 선택지 포함)
  후 verified에 분석 — 승인 태깅은 사용자만.
- **병행 세션 주의**: 같은 날 다른 inspection/orchestrator 세션이 같은 lane에 브리프를 쓸 수
  있다(이번: 작업 중 ①~④ 브리프 4종+tool_suggestion 복원이 병행 생성됨) — verified 편집 전
  재읽기·조사 결론과 병행 결정(예: cap 500) 충돌 시 모순 아닌 층위 구분으로 명시할 것.

## A-wave 후보 탐색 실측 (2026-08-28) — `inquiries/a-wave-candidate-survey.md`
**탐색 4축 레시피**(재사용): ①같은 클래스 태그 Jaccard ②정의 텍스트 difflib 유사도
③정의 안 `Distinguished from|Distinct from|Contrast|rather than` + `id:` 정규식(=저자가 이미
인지한 인접성) ④chars//4 cap 근접. ③이 가장 수확이 크다.

- **alternativeOf 후보 사실상 0**: 태그 겹침 7쌍은 텍스트 유사도 0.01~0.20(형제=보완, 대안 아님).
  대안으로 묶으면 팩이 하나만 실어 **정보 손실**.
- **overlapsWith 후보 43쌍 실재**(엣지 0건) — 전용 shape 없음·retrieve 비배제라 저위험. A-wave의
  실제 수확물. 25쌍은 태그 공유(가군), 17쌍은 비공유(나군 — 태그 보강 여부 결정 필요).
- ★**region 변별력 붕괴 실측**: tagged 126개체 중 **109개가 태그 1개**, `c-multiagent` 하나가
  **41개체**. shape의 "같은 region=태그 공유"가 무의미해진다 → **B-wave(계층화)가 A의 전제**.
  깊이 1 평면 backbone에서는 alternativeOf를 옳게 저작할 수 없다.
- **c-X ↔ gr-X 쌍둥이 16쌍**: `gr-X`는 **16/16 자기 개념으로 태그**됨(균일). 그래서 shape 완화는
  기술적으로 가능하나 **하면 안 됨** — alternativeOf는 성분당 1 admit이라 조립에 필요한
  Guardrail 대신 Concept만 남는 경우가 생기고 승자가 질의마다 뒤바뀜(실측). **처방=정의 축약**,
  대상은 **sim≥0.56인 7쌍**(~225 tok 회수 = 기본 예산 900의 25%). 나머지 9쌍은 이미 분화됨.
- **팩 실측 방법**: 쌍둥이가 실제로 함께 실리는지 `retrieve.py`로 투영해 확인 —
  1·2위 나란히, 예산 896/900(99.6%). 중복 비용 주장은 이렇게 실측으로 뒷받침할 것.

## B-wave 계층 축 설계 (2026-08-28) — `inquiries/b-wave-facet-design.md`
★**최대 제약(재사용)**: `retrieve.py` 가중치가 `ho:tagged` **0.7** vs `skos:broader/narrower`
**0.5** — **계층을 한 단계 깊게 할 때마다 개념 간 발견성이 절반**이 된다. 팩은 이미 896/900
포화라 발견성 저하가 곧 누락이다. → **taxonomy 재구조화를 "위에 루트 씌우기"로 하면 안 된다.**

- **설계 결론**: 계층 = **facet(내용 축) 선언 속성**(`ho:conceptFacet`), 깊이 증가 0.
  facet 5 = anatomy/quality/method/domain/**scope**, 각각 **판정 질문**으로 정의(예시로 정의하면
  표류 — 6-layer 문헌 교훈). `scope`를 명시하는 게 핵심: `c-multiagent`가 내용 태그인 척
  버킷이 된 원인이 "이건 내용 축이 아니다"라고 말할 자리가 없었기 때문.
- **측정된 문제**: top 12개에 분할 기준 없음(방법·성질·부위·영역·범위 혼재) / `c-multiagent`
  41개체 중 **27개가 그 태그 하나뿐**(Role 10·Agent 5·Channel 6·Deliverable 2·Guardrail 3·
  Pattern 1) / 태그 1개뿐 개체 **115**(단 Guardrail 51은 `gr-X→c-X`라 이미 내용 태그 — 진짜
  결핍은 27개).
- **A-wave와의 연결**: alternativeOf의 "같은 region"을 *아무 태그 공유*가 아니라
  **판별 facet(anatomy/method) 공유**로 재정의(shape SPARQL 1곳) → 허위 region 소멸.
- **파급**: 개념 재부모화는 validate 도달성 안전(tagged 유지), 접두사·파일 무변경.
  **B1(facet 선언)은 검색 무영향, B2(태그 보강)만 랭킹 변경** → 분리 land 권고.
  개념 재부모화 **선례 없음**(`abox-taxonomy-reorg`는 파일 레이아웃 재조직이었음).
- 현행 깊이 실측: 0:12 / 1:36 / 2:20 (깊이 2는 W1 envelope 가지가 유일).

## ★정정 사례 — 43쌍 vs 2쌍 (2026-08-28, vnv 대조)
같은 축을 두 세션이 독립 측정해 43 vs 2로 갈렸다. **모순이 아니라 기준 차이**였다:
- inspection 43쌍 = 정의 안 "Distinguished from id:X" = **차이 진술**(혼동 인접성)
- vnv 2쌍 = **공유 태그 ∧ 정의가 실제로 겹침** = 설명 영역 교집합
`ho:overlapsWith`의 뜻은 후자이므로 **vnv 기준이 옳다**. 내가 43쌍을 "A-wave의 실제 수확물"로
부른 것은 과한 표현이었고 survey 문서에 정정 삽입.
**교훈**: 후보 탐색에서 정규식 패턴이 잡아내는 것이 **술어의 정의와 같은지** 먼저 확인할 것 —
"인접하다"와 "겹친다"는 다르다. 그리고 소비자가 0인 엣지는 넣지 않는다는 기준(anchorConfidence에
적용한 것)을 **같은 사이클 안에서 일관되게** 적용할 것.

## 결정 검토 사례 — 권고와 갈린 선택을 다루는 법 (2026-08-28)
사용자가 4건 중 3건은 권고대로, 1건(`Anchor` 저작)은 권고(연기)와 반대인 (b)를 골랐다.
inspection 처리 방식(재사용):
- **재론하지 말고 "실행 조건"으로 바꾼다** — 막을 일이 아니라 성립 조건을 붙일 일.
- 이번 조건 3: ①`ho:Anchor` **자기 정의**가 "휴면이 기대 상태·개체 0이 정상"이라 저작 시
  **정의문 동반 갱신 필수**(그래프가 자기 문서와 어긋나면 안 됨) ②**소비자 동반**
  (`retrieve.py`가 anchorConfidence를 랭킹에 반영) — 없으면 "소비자 0이라 43엣지 미저작"한
  같은 사이클의 결정 2와 **기준이 반대**가 된다 ③**숫자 출처 선언**(SSSOM 선례: confidence는
  optional, justification은 required).
- ★**클래스의 skos:definition을 먼저 읽어라** — 이 repo는 정의문에 "언제 쓰지 말 것"과
  "0 인스턴스가 기대 상태"까지 적어두는 관례가 있어, 저작 판단의 1차 근거가 거기 있다.
- **기반 변동 보고**: vnv 실측(HEAD 핀) 다중태그 17/117 → 현재 **45/150**(병행 웨이브가 태그
  추가). 결정의 전제가 결정 도중 바뀔 수 있으니 **검토 시점에 재측정**할 것.
- 반복 패턴 확인: 다중태그 38개 중 35개가 `[내용태그, c-multiagent]` → confidence로 38번
  반복할 일을 B1 facet이 `scope` 한 번 선언으로 해소한다(구조가 숫자보다 싸다).
