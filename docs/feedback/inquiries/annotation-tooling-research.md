---
status: answered      # 사용자 요청 조사 (2026-08-27) — orchestrator/사용자 소비 후 closed
targets: [id:scheme, ho:salience, ho:tagged, tbox:ho:, tools/retrieve.py, tools/lint_uniformity.py, tools/webui]
related: [docs/feedback/annotation-backbone-architecture.md, docs/feedback/verified/annotation-backbone-architecture.md]
retention: 적용 wave(①~④) 완료까지 보존 — closed여도 제거 금지 (설계 참조 원본)
---
# 조사 자료 — annotation·anchor·확률 구조·전용 도구 (승인 항목 보강 연구)

사용자 요청: "현재 제안으로 진행되고 있는 도구와 annotation 및 anchor, 확률적 구조에 대해서
도움이 될만한 내용들 조사". 승인된 backbone+anchored-annotation 아키텍처(적용 4단계:
①TBox 술어 → ②린터/게이트 → ③retrieve 선별 → ④편집기 lane)와 그 설계원본
`tool_suggestion.md` v0.2(git 12e429a)의 GAP·미검증 항목을 웹 1차 소스로 채운 결과다.

**조사 방법**: 12개 조사 에이전트(주제 7 + 완전성 비평 1 + 보충 4), 1차 소스 fetch 검증
원칙(스펙·공식 문서·논문·changelog·로컬 실행). 검증 수준을 명시하지 않은 사실은 fetch 검증됨.

---

## 0. 요지 (결정에 바로 쓰는 결론 5개)

1. **[G1: edge confidence] n-ary node로 사실상 결정됨 — RDF-star는 선택지가 아니다.**
   로컬 실증: rdflib 7.6.0은 `<< s p o >>` Turtle을 **BadSyntax로 파싱 실패**(이 repo
   인터프리터에서 실행 확인). pySHACL 0.40.1도 triple-term 미지원. RDF 1.2는 CR(Concepts,
   2026-04-07)/WD(Turtle) 단계. 반면 n-ary는 표준 전례가 압도적(§2)이고, RDF 1.2의 reifier
   모델이 구조적으로 n-ary와 동형이라 **나중에 `rdf:reifies` 1 triple 추가로 무손실 마이그레이션**
   가능 — 죽은 선택이 아니다.
2. **[G3: cap 단위] token 결정을 실증이 지지 — 단, cap(가드)과 저작 목표(최적대)는 다른 수.**
   모든 실증 문헌이 token/word 단위(line 단위 실험은 전무)라 사용자 결정(단위=token, 브리프
   ②의 hard cap 500 whitespace-token = 42-line 환산, 현 그래프 최대 199로 위반 0)과 정합.
   이 조사가 추가로 주는 것: 검색 정밀도 **최적대는 100–200 word(≈130–260 BPE token)** 이고
   500 word는 그 2–4배 위이므로, 500은 blob 차단 **상한**으로 두되 **권장 저작 목표(개별
   서술 ~100–200 words) + self-containedness 규칙**을 스타일 지침(§1c 산문)으로 병기할 것을
   권고. (환산 주의: whitespace 500 words ≈ 650+ BPE tokens — 두 단위를 문서에서 혼용 금지.)
3. **[G4: 영역당 1선별] 표준·산업 전례 5종이 같은 모양** — WADM "MUST pick one", Wikidata
   BestRank/truthy 파생, UMLS MRRANK, WordNet 최빈 sense, Elasticsearch field collapse.
   공통 교훈: **전체 순서(total order)를 데이터로 선언**하고 동률 tiebreak(IRI 사전순)까지
   명문화해야 결정론이 성립한다. 근거 정량도 확보(§5: distractor 누적 열화 실측).
4. **[도구 ④] 설계원본 v0.2에 교정 필요 사항 다수**(§6.4 교정표) — 가장 중요한 셋:
   Yjs RelativePosition은 대상 텍스트 삭제 시 **null**(오프라인 병합 생존 주장은 과대),
   tiptap Comments·AI Toolkit은 **유료+private registry**(UniqueID는 2025-06부터 MIT 무료),
   decoration 기반 accept/reject 리뷰 층은 **OSS 기성품이 없어 조립 과제**다.
5. **[확률 값 생산] 단발 "confidence 줘" 프롬프트 금지** — ECE 0.18–0.52, AUROC ~random,
   값이 0.8–1.0에 5의 배수로 클러스터(동률 빈발 → G4 tiebreak 필수 근거). top-k 1-stage
   numeric 유도 + k-sample 일치도 집계 + 사후 calibration(temperature scaling은 순위 보존이라
   determinism 게이트와 양립)이 검증된 조리법.

---

## 1. Anchor 모델 — W3C Web Annotation(OA) 실측

- **oa:SpecificResource가 표준 n-ary 한정 노드다**: `oa:hasSource`(정확히 1) +
  `oa:hasSelector`/`oa:hasState`/`oa:hasPurpose`/`oa:hasScope`. OA는 RDF-star 이전에 설계되어
  의도적으로 순수 RDF 1.1 reified node — G1의 n-ary 선택과 같은 모양. OA에 confidence 용어는
  **없음**(oa.ttl 63 term 전수 grep: confidence/certainty/weight 0건) → `ho:anchorConfidence`는
  신설이 맞다(near-synonym 아님).
- **oa:Choice = 순서 있는 대안 컨테이너 + 규범적 first-item 기본값**: "선호도를 판단할 수
  없으면 목록의 첫 항목을 쓰라"가 스펙 문장. **경고**: 계획된 대칭 `ho:alternativeOf`는 선호
  순서를 못 담는다 → 유지하려면 retrieve.py tiebreak를 Choice의 first-in-list 규칙의 등가물로
  명문화할 것(§4의 total order).
- **다중 selector 강건화 패턴이 규범**: "Multiple Selectors SHOULD select the same content …
  Consuming user agents MUST pick one" — G4의 '정확히 1' 규칙은 WADM 소비자 규칙을 한 층
  올린 것으로 표준 정합 논거가 된다.
- **cross-product 의미론 경고**: 한 annotation에 target 여러 개 = "각각에 독립 적용"이지
  묶음이 아니다(Composite는 비규범 부록로 강등됨). 두 개념을 **함께** 서술하는 annotation은
  ho:tagged 2개가 아니라 별도 설계가 필요.
- **oa:hasScope**: anchor 대상(WHAT)과 맥락(CONTEXT)의 어휘 구분 — G4의 "anchor 영역"을
  `(anchor, scope)` 쌍으로 평가할 때의 표준 술어. **oa:hasState/TimeState**: 서술이 어느 소스
  버전 기준인지 고정하는 표준 패턴 → 린터의 staleness 신호(repo 등가물: anchor 노드에
  commit-hash류 `ho:sourceVersion`).
- **OA 자신의 Motivation 어휘가 skos:Concept + skos:broader 확장 규칙** — 이 repo의
  backbone(anti-orphan `ho:tagged` 강제) 아키텍처가 W3C 표준과 동형이라는 인용 근거.
  또한 purpose가 다른 중복 annotation(describing vs classifying)은 충돌이 아니라 보완 —
  G4 선별을 purpose별로 적용하는 옵션.
- **의미 태깅 실전형(Example 18)**: 태그 = SpecificResource body(source=개념 IRI,
  purpose=tagging) — Europeana가 SKOS 그래프 위 crowd/기계 태그에 쓰는 필드 검증된 패턴.
  ho:tagged 엣지의 confidence 부여(G1)는 정확히 이 엣지의 reification이다.

## 2. G1 — edge-level confidence 표현 (비교 완결)

| 후보 | 판정 | 근거 (fetch 검증) |
|---|---|---|
| **n-ary anchor node** | **채택 권고** | SWBP 2006 노트 use-case 1이 문자 그대로 "확률 붙은 관계"; OA SpecificResource·**Wikidata statement node**(수십억 규모)·SSSOM Mapping·ConceptNet edge 전부 이 모양; pySHACL core로 shape 검증 즉시 가능(`sh:targetSubjectsOf ho:anchorConfidence` — targeting 비용 0) |
| RDF-star/RDF 1.2 | 배제 (현 스택) | rdflib 7.6.0 파싱 실패 **로컬 실증**; issue #1554 2020년부터 open, 실험 repo 미병합; pySHACL 미지원; 스펙 자체 CR/WD. 단 RDF 1.2 reifier ≡ n-ary node라 **1 triple로 후행 정합** 가능 |
| RDF 1.1 reification | 배제 | RDF 1.2에서 대체됨; 4 triple 오버헤드에 이점 없음 |
| singleton property | 배제 | ICSC 2021 벤치마크 최하위; per-statement 술어가 `sh:path` targeting·SPARQL 균일성 파괴 |
| named-graph-per-stmt | 배제 | repo 전체 Turtle→TriG 마이그레이션 강요; SHACL core에 graph-targeting 없음 |

**설계 세부 권고** (step ① brief에 반영할 것):
- **`ho:tagged` 직접 엣지는 유지하고 anchor node를 병행** — Wikidata의 truthy(wdt:) + 상세
  (p:/ps:/pq:) 이중 구조 전례. anti-orphan SHACL·retrieve 1-hop 순회가 무변경으로 유지된다.
- **confidence 의미론을 TBox 주석에 고정**: (a) calibrated 0..1 "anchor가 옳을 확률"(Knowledge
  Vault: ≥0.9만 'confident facts'로 소비), (b) **방향 명시** — Probase는 P(c|e)와 P(e|c)를
  구분 저장하고 소비 시 **곱**(Rep=P(c|e)·P(e|c))으로 랭킹(§4 참조), (c) SSSOM 규율:
  correctness-confidence와 similarity는 **다른 수** — 한 술어에 겹쳐 싣지 말 것,
  (d) Fuzzy OWL 2 관례: 값은 하한(≥) 해석 + **엣지당 최대 1개**(sh:maxCount 1 → G4 동률 방지).
- **justification 필수 술어를 confidence 옆에** — SSSOM은 confidence는 optional인데
  `mapping_justification`(semapv 어휘)은 **required**. repo 매핑: ManualMappingCuration=developer
  저작 / SemanticSimilarityThresholdMatching=자동 태깅 / LogicalReasoning=owlrl 추론 /
  MappingReview=vnv 판정 / UnspecifiedMatching=이력 불명 backfill(정직한 기본값).
  justification 등급은 G4 tiebreak로도 쓸 수 있다(동률 시 수동 큐레이션 우선).
- **provenance 번들**(n-ary의 실질 이점): `prov:wasAttributedTo`(+`prov:SoftwareAgent`) /
  `prov:actedOnBehalfOf`(orchestrator→developer dispatch 체인) / `prov:generatedAtTime` /
  `prov:wasGeneratedBy`→Activity(`prov:used`=context pack, `prov:hadPlan`=**dispatch brief** —
  거의 1:1 대응) / 증거는 `prov:wasDerivedFrom`(Wikidata reference 패턴, content-hash IRI로
  공유 중복 제거). WADM 호환을 원하면 `dcterms:creator`(내용 책임자) vs `as:generator`
  (직렬화 파이프라인=plan_upsert) 이중 귀속 — 주의: WADM은 prov: 정렬이 **없다**(성급히
  "PROV 기반"이라 쓰지 말 것). 신설 대신 이들 외부 IRI 재사용이 golden rule 2 정합.

## 3. Anchor 드리프트 대책 (Phase 1 "앵커 생존율" 실측 설계)

- **Hypothesis 프로덕션 설계**: selector 3중화(Range/Position/Quote+prefix·suffix 32자) +
  fallback cascade(구조→위치→context-first fuzzy→quote-only fuzzy), 모든 비-quote 전략은
  quote 대조 검증 필수. **교정**: 2013년 diff-match-patch는 옛 구현 — 현행 client는
  approx-string-match(Myers bit-parallel) + **결정론적 가중 점수**(quote 50/prefix 20/suffix
  20/위치 힌트 2 — 명시적 tie-breaker). 이 가중 점수는 retrieve 선별(G4)과 anchorConfidence
  계산식(1−errors/length)의 직접 후보.
- **고아율 실측 기준선**(유일한 공개 수치, Aturban et al.): live web에서 22–27% 고아화,
  고아의 88–96.5%는 아카이브로도 복구 불가, attached의 53–61%가 위험 — **결론: 생성 시점에
  대상 스냅샷/해시 저장**(write-gate payload에 포함). repo 내부 세팅은 near-0이 목표.
- **STAM transpose = 결정론적 일괄 재앵커**: 편집 발생 시 old→new 텍스트를 한 번
  정렬(Needleman-Wunsch류)하고 모든 anchor를 그 정렬로 일괄 이송 — per-anchor fuzzy 탐색과
  달리 **결정론적**이라 determinism 게이트와 양립. 주의: transposition은 **동일 텍스트 전용**
  (변경 텍스트는 별도 확장) — 런타임 retrieve보다 **린터/게이트 단계(②)** 에 맞는다.
- **3-상태 소비 모델**(Brush/MSR, CHI 2001): anchored / **guess** / orphan — 이진 판정보다
  중간 신뢰 구간을 "추측"으로 표면화하는 것이 사용자 재부착을 극적으로 가속.
  `ho:anchorConfidence`의 소비형: retrieve에서 포함 / 플래그 포함 / 제외의 2-threshold.
- **짧은 quote 함정**(Hypothesis #3919): 지나치게 짧고 일반적인 anchor 텍스트는 오앵커 —
  cap(최대)뿐 아니라 **최소 길이 규칙**도 린터에. CAPRA도 15자 미만 quote에 30% 페널티.
- **offset 단위 함정**: JS는 UTF-16 code unit, STAM·상식적 RDF 저장은 unicode codepoint —
  편집기 평면과 그래프 평면이 단위를 합의하거나 경계 변환하지 않으면 비-BMP 문자마다
  앵커가 조용히 민다. Phase 1 브리프에 명시할 것.

## 4. G4 — "영역당 1선별"의 전례와 결정론 설계

| 전례 | 메커니즘 | 가져올 것 |
|---|---|---|
| Wikidata BestRank/truthy | rank(preferred>normal, deprecated 제외)로 **파생** — 저장은 다중, 소비는 1 | 파생-최선 선택이 수십억 규모에서 결정론 유지됨; lint 시 사전계산 or retrieve 시 파생 |
| UMLS MRRANK | (source, term-type) 우선순위 **목록을 데이터로 선언**, 최고 순위가 preferred name | 선별 규칙을 코드 속 휴리스틱이 아니라 **데이터/문서로** — 저자가 결과를 예측 가능 |
| WordNet 최빈 sense | 빈도 내림차순 + **동률 시 고정 tie-break** | 동률까지 정의해야 총순서 |
| Elasticsearch collapse | collapse key당 top-1 (정렬 순서로) | key := anchor 개념(또는 alternativeOf/overlapsWith 연결성분); **전체 후보군을 한 곳에서** 선별(부분 선별 금지); `inner_hits` = 향후 `--expand-region` 디버그 플래그 패턴 |
| MMR (SIGIR 1998) | λ·관련도 − (1−λ)·최대 중복도 greedy | same-anchor⇒중복도 1로 두면 MMR이 정확히 1-per-region으로 붕괴 — 인용 가능한 이론적 틀. DPP는 검토-후-배제(overlap이 명시 엣지로 이미 구조화돼 있어 과잉) |

**권고 total order**: `anchorConfidence` DESC → `salience` DESC → justification 등급(수동>자동)
→ maturity → **IRI codepoint ASC**(최종). Probase 교훈 둘: 랭킹은 양방향 조건부의 **곱**
(한 방향만 쓰면 과일반/과특수 개념으로 쏠림), ε-smoothing(개체 1개짜리 개념이 P=1로
자동 승리하는 것 방지). 현행 `retrieve.py:136–138`의 `prior = 0.5 + salience` 가법 결합을
곱셈 결합으로 바꿀지는 ③ 브리프의 결정 포인트.

## 5. G3/G4의 정량 근거 (왜 cap과 1선별인가)

- **Chroma chunking eval**: 200 token 청크가 precision/IoU 최고(recall 87.3%), 400 token이
  recall-효율 최적; overlap 축소가 IoU 개선(**중복이 감점**) — 팩 안 중복 서술 금지의 정량 근거.
- **Dense X Retrieval**(EMNLP 2024): 자립적(self-contained·대명사 해소) proposition 단위가
  passage 대비 Recall@5 +9~12pp; 최대 이득은 100–200 **word**(≈130–260 token) 예산 —
  cap 값의 실증 대역. **자립성**은 cap과 별개의 lint 가능 규칙.
- **Context Rot**(Chroma, 18 LLM): distractor(비슷하지만 정답 아님) 1개도 정확도 하락, 4개면
  누적 악화 — 같은 영역의 대안 서술 다중 투입이 정확히 이 조건. ~300 token 집중 컨텍스트가
  같은 정보 포함 ~113k 컨텍스트를 전 모델에서 압도.
- **Lost in the Middle**: 관련 문서 20→50개 확장의 이득 ~1.5%; 중간 위치 정보는
  closed-book보다도 낮은 정확도 — 팩 **배치 순서**도 성능 변수(중요 노드는 처음/끝).
- **semantic chunking은 비용 대비 이득 없음**(NAACL 2025 Findings) — 고정 cap + lint가
  순진한 타협이 아니라 문헌 정합; late chunking(Jina)은 "작은 단위는 문맥 상실" 반론을
  임베딩 쪽에서 해소(향후 retrieve가 임베딩 스코어링으로 갈 때 유효).
- 42 line의 유일한 방어선: **희소 구조 텍스트**(짧은 TTL류 줄)라면 등가일 수 있음 — 산문
  기준으로는 아니다. 린터는 tokenizer 의존 없이 char proxy(≤~1200자)로 집행 가능.

## 6. 도구 lane(④) — 검증 사실·교정·조립 설계

### 6.1 ProseMirror 코어 (전부 1차 소스 확인 — 설계 가정 유효)
`Step.getMap()/StepMap/Mapping`(assoc로 경계 방향 제어, `MapResult.deleted`가 고아 탐지
원시형) · `DecorationSet.map(mapping, doc, {onRemove})`(**onRemove가 고아 로깅 훅** — 조용한
소실 방지) · `StateField.apply` · `filterTransaction`(클라이언트측 쓰기 게이트 = plan_upsert의
편집기 쌍둥이) · `appendTransaction`(정규화: ID 자동 부여 등). "레이어는 mark가 아니라
plugin state + Decoration" 규칙은 아키텍처적으로 지지됨.

### 6.2 라이선스·제품 경계 (비용 지도)
| 부품 | 상태 | 함의 |
|---|---|---|
| tiptap **UniqueID** | **MIT 무료**(2025-06 오픈소스화, `@tiptap/extension-unique-id`) | 블록 ID 층은 계정/registry 불요 — anchor join key로 즉시 사용 |
| tiptap **Comments** | **유료**(Start plan+, private registry, TiptapCollabProvider/Document server 결합) | 자체 plugin state+Decoration+Yjs 설계가 이를 회피 — 아키텍처로 삼지 말 것 |
| tiptap **AI Toolkit** | **유료** add-on; 구 AI Agent 확장은 **deprecated**; Shorthand는 alpha | 강결합 금지·자체 래퍼 한 겹(설계원본 §7 리스크 그대로 유효). `getThreads`/`editThreads` 기본 비활성은 **확인됨** |
| y-prosemirror | MIT; **1.3.x pin 필수** | master가 API 시그니처 개편(ResolvedPos/renderer) — 다음 major에서 파손 예정. v1.3.7의 `absolutePositionToRelativePosition(pos, type, mapping)`의 mapping은 ySyncPlugin 내부 ProsemirrorMapping(transform Mapping 아님) — 구현 함정 |
| BlockNote | MPL-2.0(core), xl-*는 GPL-3.0/상용 | 무료 대안: 영속 블록 ID + backend-agnostic comments(YjsThreadStore=별도 Y.Map — 우리 standoff 영속화의 참고 전례). 대가: React 전용·저수준 제어 축소 |
| prosemirror-changeset | MIT; repo가 code.haverbeke.berlin으로 **이전**(GitHub archived) | diff 기질(deleted-slice 복구·2.4.0부터 JSON 직렬화) — 리뷰 층의 토대 |

### 6.3 리뷰(accept/reject) 층 — 조립 과제로 확정
- **OSS 기성품 부재 확인**: decoration 기반(standoff) accept/reject를 제공하는 건 유료
  Tiptap 제품군뿐. OSS 대안 전부(prosemirror-suggest-changes, suggestion-mode,
  @manuscripts/track-changes, Fidus Writer)가 **mark 기반**(리뷰 상태가 문서에 저장 —
  "never marks" 규칙과 충돌).
- **조립 레시피**: prosemirror-changeset(diff) + DecorationSet(표시) + 커맨드 2개
  (accept→plan_upsert dispatch / reject→changeset 폐기) + suggestion-id 장부. Tiptap
  "preview mode"(적용 전 미표시 유지)가 모방할 계약 — 이것이 정확히 CAPRA식 trust boundary.
  Tiptap의 "겹치는 suggestion은 나중 것 무시" 규칙은 G4 first-wins tiebreak의 출하된 전례.
- **@manuscripts의 pending→accepted/rejected UUID 상태기계**: accepted만 plan_upsert 트리거,
  같은 UUID로 리뷰 provenance와 G1 anchor 레코드 연결.
- **Yjs 14 예고**(FOSDEM 2026): 네이티브 changesets/attributions(track changes) 개발 중 —
  리뷰 층을 인터페이스 뒤에 격리하고 suggestion mark를 스키마에 굽지 말 것.
- Fidus Writer의 transaction-amendment(파괴적 편집을 제안 마크로 자동 변환)는 패턴 참조만
  (**AGPL-3.0** — 코드 이식 금지).

### 6.4 인용 문헌 교정표 (설계원본 v0.2·verified 보고에 반영할 것)
| 문서 주장 | 교정 (fetch 검증) |
|---|---|
| CAPRA = "멀티에이전트 코드리뷰" | **SW 아키텍처 문서 평가** 시스템(arXiv 2606.18976, 학생 리포트 10건). 메커니즘 인용 자체는 정확 |
| "CAPRA trust boundary" | 결정론 경계는 **Evidence Anchoring 단계만**(순수 코드: exact→trigram 0.27 pre-filter→정규화 Levenshtein, τ_min 0.45 폐기·0.65 품질 필터·quote<15자 30% 페널티). ConsistencyManager는 **LLM 에이전트**(비결정론) — 우리의 결정론적 retrieve 선별이 CAPRA보다 엄격 |
| SWE-Edit Viewer/Editor | 실재·수치 확인: SWE-bench Verified +2.1pp, 추론 비용 −17.9%. 부수: 편집 규모별 edit-format 적응 선택 — cap된 작은 annotation은 whole-rewrite가 유리 |
| Prometheus per-node tool scoping | 그 관찰의 출처는 **Inside the Scaffold**(2604.03515)의 소스 분석(EditNode 5 tools vs BugReproducingWriteNode 1)이지 Prometheus 논문(2507.19942) 자신이 아님 — 인용 분리 |
| Context Engineering 2.0 | 개념·연혁 서베이 — **framing 인용 전용**, 구체 메커니즘 귀속 금지 |
| ADK include_contents | 확인('default'/'none'); 문서 URL은 adk.dev로 이전. `output_key`(상태 매개 전달)가 plan_upsert 핸드오프의 등가물 |
| AutoCodeRover 단계 분리 | 확인 + 강화: patch 에이전트에서 검색 도구를 **물리 제거** — "편집 평면은 동결된 팩만 소비, 재질의 금지"의 전례 |
| "오프라인 병합에도 앵커 생존" | **과대** — Yjs 수렴은 보장되나 대상 콘텐츠 삭제 시 resolve가 null. quote-selector fallback은 희귀 경로가 아니라 **필수 경로** |
| "최소 툴 3개로 억제" | 5개 정의 중 3개가 **기본 활성**(getThreads/editThreads 기본 비활성)이 정확한 서술 |
| Hypothesis=diff-match-patch | 2013년 구현. 현행은 approx-string-match + 가중 결정 점수(§3) |

### 6.5 SHACL 쓰기 게이트 (②·plan_upsert 확장) — 실측 포함
- **pySHACL delta 게이트 원시형이 이미 설치돼 있다**: 0.27.0+의 `focus_nodes`/`use_shapes`
  kwargs(로컬 0.40.0 시그니처 확인). **이 repo 그래프 실측: full 0.11s vs focused <0.01s.**
- **건전성 함정(실증됨)**: focus 밖 위반은 **조용히 미보고** — delta 게이트는 변경
  triple의 주어·목적어 + property path로 도달 가능한 노드까지 affected set을 계산해야
  건전. 전역 제약(도달성·그래프-wide 카운트)은 full validate.py 백스톱에 남긴다.
  RDF4J ShaclSail(변경분석→최소 검증계획, 대형 delta면 Bulk 전환)이 프로덕션 전례,
  Ahmetaj et al. ISWC 2025가 이론.
- **게이트 계약**: (a) post-state = 현 그래프 + delta **union을 검증**(TopBraid EDG 패턴 —
  delta 단독 검증 금지), (b) 거부 시 **기계가독 SHACL 보고 그래프 반환** → 편집기가
  focus-node별 위반 표시, (c) severity 계층(Violation=거부, Warning/Info=통과+표시),
  (d) `inference='none'`+throwaway 그래프로 결정론·속도 확보.
- anti-orphan류는 SHACL core path로 충분(SPARQL 불요): `sh:inversePath`·sequence path·
  `sh:targetSubjectsOf ho:anchorConfidence`(n-ary 노드 targeting 비용 0). "영역당 1서술"만
  `sh:sparql`($this pre-bound) 후보.
- 확장 경로: TravSHACL(pip, SPARQL endpoint 순회 계획) — 그래프가 in-memory를 넘어설 때.

## 7. Confidence 값의 생산·보정 (G1 값이 오염되지 않으려면)

- **금지**: 단발 verbalized("0..1로 자신감을 말하라") — Xiong et al.(ICLR 2024) 실측
  ECE 0.18–0.52·AUROC 0.51–0.57, 값이 80–100 구간 5의 배수 클러스터. 이 클러스터링은
  **저장된 confidence가 사실상 거친 서수 척도**라는 뜻 — G4 동률이 빈발하므로 IRI tiebreak가
  장식이 아니라 필수라는 근거이기도 하다.
- **조리법**: ① top-k 후보 anchor + 각각 numeric 확률을 **1-stage로** 유도(Tian et al.,
  EMNLP 2023 — RLHF 모델에선 verbalized가 logprob보다 나음, ECE ~50% 상대 개선),
  ② k-sample 일치도 집계(agreement fraction = anchorConfidence; Xiong 최적 조합 ECE 0.028;
  IRI 선택 투표라 문자열 일치로 충분 — semantic entropy 불요), ③ vnv/inspection 판정을
  gold set으로 **사후 calibration**(temperature scaling: 단조 → 순위 불변 → retrieve 결정론
  유지; isotonic은 순위를 바꾸므로 determinism 재검 필요), ④ ECE 측정은 equal-mass 적응
  binning(0.8–1.0 클러스터 때문에 고정폭 bin은 대부분 빈다), 층화는 노드 클래스/backbone
  영역별(분포 이동 시 보정 전이 안 됨 — Lin et al.).
- **소비형은 랭킹이 아니라 라우팅 게이트가 실무 표준**: 상위 밴드 자동 커밋 / 중간 밴드
  vnv 검증 dispatch / 하위 밴드 거부+GAP 노트. 밴드는 절대값보다 **백분위**(모델 교체 시
  miscalibration drift에 강건). 임계 선택의 원칙적 방법: 과거 감사 밴드별 정확도로 오류율
  상한을 만족하는 지점(HyPAC류 PAC 바운드).
- **결정론 계약**: 샘플링 기반 값은 **쓰기 시점에 집계값을 영속화**(k표·시드는 provenance로)
  — retrieve.py 자체는 저장된 수만 소비해 완전 결정론 유지.
- 장기 경로: 감사 판정 축적 후 소형 보조 calibrator(APRICOT류) — 동결된 보조 모델은 순수
  결정 함수라 **trust boundary의 결정론 쪽**에 앉힐 수 있는 유일한 학습형 선택지.

## 8. 적용 계획(①~④)에의 주입 지도

| 단계 | 이 조사가 주입하는 것 |
|---|---|
| **① TBox** | n-ary `ho:AnchorAnnotation`(ho:tagged 병행 유지) + `ho:anchorConfidence`(0..1, maxCount 1, 방향·calibration 의미 주석) + justification 필수 술어(semapv 매핑) + provenance 재사용 IRI(prov:/dcterms:/as:) + (선택) `ho:sourceVersion`·scope 술어. `ho:alternativeOf` 대칭 유지 시 순서 부재를 ③ tiebreak로 보상함을 정의에 명시 |
| **② 린터/게이트** | cap을 **token(≈256–300, char proxy 가능)** + 자립성·최소 anchor 길이 규칙; focus_nodes delta 게이트(+affected set 계산, 전역 제약은 full 백스톱); post-state union 검증·severity 계층·보고 그래프 반환; write-time 소스 스냅샷/해시; STAM식 정렬-일괄-이송으로 소스 변경 시 anchor 재검; `<<` 구문 금지 lint(RDF-star 조기 유입 차단); confidence 분포 의심 플래그(전부 5의 배수 등) |
| **③ retrieve 선별** | total order 명문화(conf DESC→salience DESC→justification→maturity→IRI ASC), 전체 후보군 단일 지점 collapse, 2-threshold(포함/guess 플래그/제외), 곱셈 결합 검토(Rep 패턴+ε-smoothing), 팩 배치 순서(중요 노드 처음/끝), `--expand-region` 디버그 패턴 |
| **④ 편집기** | UniqueID(MIT)+plugin state+DecorationSet(onRemove 고아 훅)+filterTransaction 게이트+Yjs RelativePosition(1.3.x pin)+OA selector 이중 영속(portable)+changeset 조립형 preview 리뷰(accept→plan_upsert)+UTF-16/codepoint 경계 변환+유료 제품 비의존. Viewer/Editor 분리는 SWE-Edit 수치·ADK include_contents='none'·AutoCodeRover 도구 제거로 3중 전례 확보 |

## 9. 미해결·한계 (정직 신고)

- 검증 수준 표기: 위 사실 대부분 fetch 검증이나 일부는 search-snippet/model-knowledge —
  각 에이전트의 unverified 목록 원본은 워크플로 산출물에 있음(주요 건: MMR 원PDF 404로
  2차 소스 일치 확인, OpenAI 토큰 환산 경험칙 403, Lyu/APRICOT/HyPAC 스니펫 수준,
  Wikidata reference 공유는 content-hash IRI로부터의 추론).
- **cap은 사용자 결정 완료**(단위 token·hard cap 500 whitespace-token, 브리프 ② —
  본 조사와 병행 세션에서 확정): 이 조사의 256–300 수치는 그 결정과 모순이 아니라
  **저작 목표(guideline) 층위의 보강**이다(§0.2). 잔여 결정은 G1의 형식 확정(스택 제약상
  사실상 n-ary)과 `ho:alternativeOf` 대칭 유지 여부(oa:Choice 순서 부재 보상, §1)뿐.
- **병행 브리프 초안 4종과의 관계**: `tbox-annotation-predicates-brief`(①) ·
  `linter-annotation-cap-brief`(②) · `retrieve-alternative-selection-brief`(③) ·
  `tool_suggestion-phase1-brief`(④ Phase 1)가 본 조사와 같은 날 작성됨 — orchestrator는
  각 브리프 채택 시 본 문서 §8의 해당 행(특히 ①의 provenance/justification 술어,
  ②의 affected-set 함정·최소 anchor 길이, ③의 total order·2-threshold, ④의 교정표 §6.4)을
  대조해 브리프에 반영 여부를 결정할 것.
- Phase 1 앵커 생존율 실측 권고는 유지 — 단, Yjs 수렴 보장이 문서화돼 있으므로 실험의
  성격은 "미지 검증"이 아니라 "통합 정확성 검증"으로 재규정.
- 조사 원자료: 워크플로 wf_2b6a8e99-177(에이전트 12, 산출 전문은 세션 journal), 본 문서는
  그 종합. 주요 1차 소스는 §10.

## 10. 주요 1차 소스

**표준/스펙**: W3C Web Annotation Data Model <https://www.w3.org/TR/annotation-model/> ·
Vocabulary <https://www.w3.org/TR/annotation-vocab/> · ontology(Turtle)
<https://www.w3.org/ns/oa.ttl> · SWBP N-ary Relations <https://www.w3.org/TR/swbp-n-aryRelations/> ·
RDF 1.2 Concepts(CR) <https://www.w3.org/TR/rdf12-concepts/> · Turtle 1.2(WD)
<https://www.w3.org/TR/rdf12-turtle/> · SHACL <https://www.w3.org/TR/shacl/> · PROV-O
<https://www.w3.org/TR/prov-o/> · STAM <https://github.com/annotation/stam> ·
TEI standOff <https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ref-standOff.html>

**스택 사실**: rdflib RDF-star issue <https://github.com/RDFLib/rdflib/issues/1554> ·
pySHACL releases/CHANGELOG <https://github.com/RDFLib/pySHACL/releases> (v0.27.0 focus_nodes) ·
RDF4J ShaclSail <https://rdf4j.org/documentation/programming/shacl/> · TopBraid EDG workflows
<https://docs.topquadrant.com/latest/user_guide/workflows/index.html> · SHACL under updates
(ISWC 2025) <https://arxiv.org/abs/2508.00137> · TravSHACL <https://pypi.org/project/TravSHACL/>

**확률/KG 전례**: Probase scoring <https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/scoring-1.pdf> ·
Knowledge Vault(KDD 2014) <https://www.cs.ubc.ca/~murphyk/papers/kv-kdd14.pdf> · Wikidata RDF
dump format <https://www.mediawiki.org/wiki/Wikibase/Indexing/RDF_Dump_Format> · ConceptNet
edges <https://github.com/commonsense/conceptnet5/wiki/Edges> · UMLS precedence
<https://www.nlm.nih.gov/research/umls/knowledge_sources/metathesaurus/release/precedence_suppressibility.html> ·
SSSOM schema <https://raw.githubusercontent.com/mapping-commons/sssom/master/src/sssom_schema/schema/sssom_schema.yaml> ·
semapv <https://mapping-commons.github.io/semantic-mapping-vocabulary/> · Fuzzy OWL 2
<https://arxiv.org/pdf/1009.3391> · PSL/KGI <https://linqs.org/assets/resources/pujara-slg13.pdf> ·
UKGE <https://web.cs.ucla.edu/~yzsun/papers/2019_AAAI_UKG.pdf> · WordNet cntlist
<https://wordnet.princeton.edu/documentation/cntlist5wn>

**anchoring**: Hypothesis fuzzy anchoring <https://web.hypothes.is/blog/fuzzy-anchoring/> ·
match-quote.ts <https://github.com/hypothesis/client/blob/main/src/annotator/anchoring/match-quote.ts> ·
고아율(TPDL 2015) <https://www.cs.odu.edu/~mln/pubs/tpdl-2015/tpdl-2015-annotations.pdf> /
<https://arxiv.org/abs/1512.06195> · Keyword Anchoring(MSR TR-2001-107)
<https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2001-107.pdf> ·
diff-match-patch <https://github.com/google/diff-match-patch/wiki/API> · approx-string-match
<https://github.com/robertknight/approx-string-match-js>

**granularity/선별**: Chroma chunking <https://www.trychroma.com/research/evaluating-chunking> ·
Context Rot <https://www.trychroma.com/research/context-rot> · Dense X Retrieval
<https://arxiv.org/html/2312.06648v2> · Lost in the Middle <https://ar5iv.labs.arxiv.org/html/2307.03172> ·
chunk-size 다중셋 분석 <https://arxiv.org/abs/2505.21700> · semantic chunking 비용
<https://arxiv.org/abs/2410.13070> · Late Chunking <https://arxiv.org/abs/2409.04701> ·
Elasticsearch collapse <https://www.elastic.co/guide/en/elasticsearch/reference/current/collapse-search-results.html> ·
DPP greedy MAP <https://proceedings.neurips.cc/paper_files/paper/2018/hash/dbbf603ff0e99629dda5d75b6f75f966-Abstract.html>

**에이전트 논문**: SWE-Edit <https://arxiv.org/abs/2604.26102> · CAPRA
<https://arxiv.org/html/2606.18976v1> · Inside the Scaffold <https://arxiv.org/html/2604.03515> ·
Context Engineering 2.0 <https://arxiv.org/abs/2510.26493> · Prometheus
<https://arxiv.org/abs/2507.19942> · AutoCodeRover <https://arxiv.org/abs/2404.05427> · ADK
LLM agents <https://adk.dev/agents/llm-agents/>

**편집기**: ProseMirror reference <https://prosemirror.net/docs/ref/> · track example
<https://prosemirror.net/examples/track/> · prosemirror-changeset(이전됨)
<https://code.haverbeke.berlin/prosemirror/prosemirror-changeset> · tiptap UniqueID(MIT)
<https://tiptap.dev/docs/editor/extensions/functionality/uniqueid> · 오픈소스화 공지
<https://tiptap.dev/blog/release-notes/were-open-sourcing-more-of-tiptap> · Comments(유료)
<https://tiptap.dev/docs/comments/getting-started/install> · AI Toolkit
<https://tiptap.dev/docs/ai/ai-toolkit/overview> · y-prosemirror <https://github.com/yjs/y-prosemirror> ·
Yjs relative positions <https://docs.yjs.dev/api/relative-positions> · BlockNote
<https://github.com/TypeCellOS/BlockNote> · prosemirror-suggest-changes
<https://github.com/handlewithcarecollective/prosemirror-suggest-changes> · Fidus Writer track
(AGPL) <https://github.com/fiduswriter/fiduswriter/tree/main/fiduswriter/document/static/js/modules/editor/track> ·
Yjs 14 preview(FOSDEM 2026) <https://fosdem.org/2026/schedule/event/8VKQXR-blocknote-yjs-prosemirror/>

**confidence 생산**: Just Ask for Calibration <https://aclanthology.org/2023.emnlp-main.330/> ·
Can LLMs Express Uncertainty <https://arxiv.org/abs/2306.13063> · Teaching Models to Express
Uncertainty <https://arxiv.org/abs/2205.14334> · Sample Consistency <https://arxiv.org/abs/2402.13904> ·
Amazon 'Label with confidence' <https://www.amazon.science/publications/label-with-confidence-effective-confidence-calibration-and-ensembles-in-llm-powered-classification> ·
Measuring Calibration(ACE) <https://openaccess.thecvf.com/content_CVPRW_2019/papers/Uncertainty%20and%20Robustness%20in%20Deep%20Visual%20Learning/Nixon_Measuring_Calibration_in_Deep_Learning_CVPRW_2019_paper.pdf> ·
APRICOT <https://aclanthology.org/2024.acl-long.824/>
