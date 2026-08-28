---
verdict: fidelity-partial   # 의도 5요소 중 일치 0 / 부분 1 / 대체 2 / 미표현·미실현 2
kind: intent-fidelity-audit  # source = 사용자 원 의도 진술, representation = 코드·그래프·문서
model: fable (opus rate-limited)
auditor: vnv (dispatch)
date: 2026-08-28
graph_baseline: validate.py PASS (working tree), Anchor 7 / alternativeOf 0 / overlapsWith 2쌍
sources_read: [docs/feedback/annotation-backbone-architecture.md, docs/feedback/verified/annotation-backbone-architecture.md, docs/feedback/inquiries/annotation-tooling-research.md, docs/feedback/inquiries/tool_suggestion.md, docs/feedback/a-wave-annotation-content.md, docs/feedback/b-wave-backbone-layering.md, docs/feedback/inquiries/block-id-anchor-brief.md, ONTOLOGYSTYLE.md, ontology/tbox/harness.ttl, tools/lint_uniformity.py, tools/retrieve.py, tools/plane-editor/link-store/]
---

# 감사 — "42-line block + 확률 엣지 skeleton" 의도 대 구현 충실도

**판정 한 줄**: 사용자 의도의 다섯 구조 요소 중 **원형대로 구현된 것은 없다** — 42-line은
"단위 형성 장치"가 아닌 "최대 길이 린트"(260 token 상한)로, 확률 엣지는 block↔block이 아닌
node→Concept **부착점 가중**으로 각각 옮겨졌고, block의 1급 표현과 확률적 skeleton은
어느 층에도 실재하지 않는다. 사용자 판단("활용이 의도와 많이 다르다")은 **실측이 지지한다**.

---

## 0. 소스 — 사용자 원 의도의 구조 요소 (판정 기준)

| # | 의도 요소 (사용자 진술) |
|---|---|
| E1 | **42 line 제한**이 지식의 최소 단위(block)를 **형성하는 장치**다 |
| E2 | **block = annotation = 지식의 최소 단위** (1급 존재) |
| E3 | block↔block을 잇는 **확률기반(가중) 엣지** |
| E4 | 그 엣지들이 이루는 **skeleton(anchor) = 구조적 지식** |
| E5 | 위 축이 실제로 **활용**될 것 (사용자: "활용이 의도와 많이 다르게 구현된 듯") |

원 제안의 유일한 문서 전사본은 `docs/feedback/annotation-backbone-architecture.md`
(2026-08-27, inspection 전사, **용어는 사용자 요청으로 표준 용어로 교체됨** — 원용어
block/skeleton이 이 단계에서 annotation/backbone으로 개명. 이 개명 자체가 아래 계보의
첫 변환이다).

---

## 1. 의도 요소 → 현재 표현 매핑 표

| 요소 | 분류 | 현재 표현 | 근거 (파일:행) |
|---|---|---|---|
| E1 42-line = 단위 **형성** 장치 | **다른 것으로 대체** | `lint_uniformity.py` `check_text_cap` — 기존 노드 텍스트(promptText+definition 합)의 **260 token(chars//4) 상한 린트**. 분해·생성 기능 없음. 하한 130은 권고로만 존재, **미강제**. | lint_uniformity.py:162 (`TEXT_CAP_TOKENS = 260`), :353–371 (ceiling only, "The floor is advisory (§1c) and is NOT enforced" :160–161); ONTOLOGYSTYLE.md:83–90 |
| E2 block = 1급 지식 최소 단위 | **미표현** | `ho:` TBox에 block/annotation-unit/TextChunk 류 클래스 **없음**. "단위"는 기존 ABox individual 일반에 암묵 흡수. "annotation"이라는 말은 구현에서 **다른 것**(Anchor 메타데이터 층)을 가리키게 됨 — §3 용어 표. | `grep ho:Block\|Annotation` TBox = 0 (owl:AnnotationProperty 별개); retrieve.py:74 `ANNOTATION_LAYER_CLASSES = {HO.Anchor}` |
| E3 block↔block **확률 엣지** | **다른 것으로 대체** | 확률(가중)은 (a) **node→Concept 부착점** `ho:anchorConfidence`(7건, 값 0.9/0.4)과 (b) **node 단독 prior** `ho:salience`(17 노드)에만 존재. node↔node 엣지 `ho:alternativeOf`(**0건**)·`ho:overlapsWith`(**2쌍**)는 **crisp**(가중 술어 없음). | tbox/harness.ttl:1104–1108, :697(alternativeOf 정의 — 가중 없음); abox 실측 §6; retrieve.py:157–158 |
| E4 skeleton(anchor) = 구조적 지식 | **미실현** | 앵커 7개는 3개 노드(role-tester·role-auditor·mem-longterm)→6개 Concept의 **성긴 이분 별(star) 구조**이며, backbone 엣지(`skos:broader` 70, depth 2)와 facet(84)은 전부 crisp. "확률적 backbone"은 **한 번도 구현된 적 없음**(§5). 앵커는 projection에서 통째 제외. | §5 실측; retrieve.py:66–74 |
| E5 활용 | **미실현(휴면)** | `anchorConfidence` 소비 코드 **0줄**(설계된 휴면 — TBox 정의 자체가 "DECLARED BUT DORMANT BY DESIGN"), retrieve 1-선별 로직은 alternativeOf 0건이라 **실질 무효**, Anchor는 projection에서 "never a seed, never traversed, never admitted". | tbox/harness.ttl:208; retrieve.py:66–74, :208–285; abox/core/state/memory.ttl:69 주석("ho:anchorConfidence를 읽지 않으며") |

**부분 일치로 볼 수 있는 유일 지점**: E1의 "제한" 문면 자체는 살아 있다(260 token 상한,
§1c [지킴], 위반 0). 즉 **"큰 것을 거부"하는 절반은 구현**됐고 "단위로 나누게 만드는" 절반이
없다.

---

## 2. "42 line" 계보 (E1) — 무엇을 거쳐 무엇이 됐나

원문 문면부터 확정한다. 전사본 제안 1 (annotation-backbone-architecture.md:10–11):

> "모사하려는 지식·시스템을 **agent-특화 annotation**(사용자 원용어 "block") **단위로
> 나눈다**. 한 annotation은 **42 line 이하로 제한한다**(granularity cap)."

즉 원 전사에도 두 절이 다 있다 — **"단위로 나눈다"(형성)** + **"이하로 제한"(상한)**.
사용자의 이번 재진술("42 line 제한으로 최소 단위를 **형성**한다")은 앞 절이 본체라는
뜻이고, 구현은 뒷 절만 이어받았다. 변환 사슬:

1. **42 line** (사용자, 2026-08-27) — 전사본 :11.
2. **→ 500 whitespace-token** — "42-line 환산" (verified :81–84; 초안
   `linter-annotation-cap-brief`; annotation-tooling-research.md:29도 동일 환산 인용).
3. **→ 260 token (chars//4)** — 사용자 결정(2026-08-27~28): 웹 조사가 "**42 line 근거
   없음**, 검색 정밀도 최적대 100–200 word ≈ 130–260 token"을 보고
   (annotation-tooling-research.md:156–158, :164–165 "42 line의 유일한 방어선: 희소 구조
   텍스트라면 등가일 수 있음 — 산문 기준으로는 아니다"), cap 500→260 확정
   (verified :110–114). inspection이 층위를 명시 기록: "초안=42-line 환산,
   확정=검색 정밀도 대역" (verified :148).
4. **→ 상한만 강제** — "하한 130은 권고(린터는 상한만 강제) — 하한 미달 노드를 채우려
   산문을 늘리는 것은 밀도 목표에 역행하므로 하지 않는다(**orchestrator 결정**)"
   (verified :112–114). 린터 실측: `TEXT_CAP_TOKENS=260` ceiling only, floor
   "advisory… NOT enforced" (lint_uniformity.py:160–162, :357).

**핵심 질문 판정**: 현재 장치는 "최소 단위를 형성하는 장치"가 **아니라** "이미 저작된
노드가 최대 길이를 넘지 못하게 하는 린트 규칙"이다. 근거 3가지:
- 분해를 **수행**하는 코드가 없다 — 초과 시 결과는 lint FAIL(exit 1)이고, 분해는 §1c의
  산문("초과는 그 노드가 두 가지 이상을 말하고 있다는 단일-책임 신호",
  ONTOLOGYSTYLE.md:90)에 따라 사람/에이전트 재량에 맡겨진다.
- **하한이 없어** "최소 단위" 개념이 규범에 실리지 않는다(130은 권고·미강제).
- cap의 **정당화 근거 자체가 교체**됐다 — granularity(단위 형성)에서 retrieval
  precision(검색 정밀도 대역)으로. 숫자만 바뀐 게 아니라 목적 서술이 바뀌었다.

현재 그래프 실측: cap 위반 0 (lint_uniformity.py PASS — 상한으로서는 유효하게 작동 중).

---

## 3. "block = annotation" 실재 여부 (E2) + 용어별 실제 지시대상 표

같은 단어가 층마다 다른 것을 가리킨다 — 이 표가 이번 감사의 핵심 발견이다.

### "block"
| 층 | 지시대상 | 근거 |
|---|---|---|
| 사용자 원용어 | **지식의 최소 단위** (콘텐츠 청크) | 전사본 :10 "(사용자 원용어 \"block\")" |
| 전사(2026-08-27) | → **annotation**으로 개명 (W3C Web Annotation 근거) | 전사본 용어표 :22–28 |
| 중앙 그래프 | **해당 클래스 없음** — 기존 individual 일반이 암묵적 단위 | TBox grep 0 |
| plane-editor | **ProseMirror 문서 블록** (편집기 구조 단위; blockId 앵커 셀렉터의 대상) | block-id-anchor-brief.md §3; src/blocks.mjs |

### "annotation"
| 층 | 지시대상 | 근거 |
|---|---|---|
| 전사(소스) | 지식 **내용** 단위 (= 구 block) | 전사본 :10 |
| TBox/retrieve | **`ho:Anchor` 메타데이터 층** — "annotation-layer classes… they are not parts a harness assembles" | retrieve.py:66–74; tbox "weighted annotation" :716 |
| plane-editor | 문서에 붙는 **standoff 주석 레코드** | src/reload-child.mjs:4 |
| OWL | `owl:AnnotationProperty` (별개 — 전사본이 이미 이름충돌 경고) | 전사본 용어표 |

**의미 미끄러짐**: 소스에서 annotation은 "지식을 담는 그릇(내용)"인데, 구현에서는
"다른 노드에 대한 가중 태그(메타데이터)"가 됐다. **내용 단위 → 태깅 메타데이터**로
지시대상이 이동했고, 그 사이에 사용자의 block은 1급 표현을 잃었다.

### "anchor"
| 층 | 지시대상 | 근거 |
|---|---|---|
| 사용자 재진술 | **skeleton 그 자체** — block들을 확률 엣지로 잇는 뼈대 ("skeleton(anchor)") | 이번 브리프의 원 의도 진술 |
| 전사(2026-08-27) | backbone 위의 **구조적 위치(부착점)** — "모든 annotation은 backbone 위의 확실한 anchor(구조적 위치)를 가져 서로 구분된다" | 전사본 제안 4 (:17–18); 용어표 "구조적 위치 → anchor/anchoring" (CAPRA) |
| 중앙 그래프 `ho:Anchor` | **n-ary 가중 태깅 노드** — component→Concept, `anchorTarget`(정확히 1 Concept)+`anchorConfidence`(0..1) | tbox/harness.ttl:205–208, :722–726, :1104–1108 |
| plane-editor | **텍스트 위치 셀렉터** — RelativePosition+TextQuoteSelector(+blockId 사다리) 로 문서 내 위치 고정 | src/anchors.mjs; block-id-anchor-brief.md §3-4 |

사용자의 재진술 "skeleton(anchor)"은 전사 단계에서 갈라졌던 두 용어(skeleton→backbone /
구조적 위치→anchor)를 **하나로 합친 것**이며, 현존 두 구현물 **어느 쪽도 아니다**(제3의
것: "잇는 뼈대"). 둘 중 계보상 직계는 그래프 `ho:Anchor`(전사본의 anchor를 직접
구현)이나, 그 과정에서 대상이 "구조(뼈대)"에서 "부착점 1개"로 좁혀졌다.

---

## 4. "anchor = block↔block 확률 엣지" 대 실제 `ho:Anchor` (E3)

**다른 것이다.** 판정 근거:

- `ho:anchorTarget`의 range는 **`ho:Concept`**이고 cardinality 정확히 1
  (tbox:722–726, AnchorShape). 즉 Anchor는 **block↔block을 잇지 않는다** — 한 노드가
  한 지식 영역(Concept)을 "얼마나 잘 설명하는가"를 주장하는 **단항 부착 가중**이다.
  TBox 정의 문면도 이를 명시: "this node describes THAT knowledge region, with THIS
  confidence" (tbox:208).
- 사용자가 말한 **node↔node 엣지에 실제로 가까운 술어는 `ho:alternativeOf`·
  `ho:overlapsWith`**다(둘 다 대칭, domain/range 개방 — 노드끼리 직접 잇는다). 그러나
  둘 다 **가중이 없다(crisp)**. 왜 없는가 — 계보로 확인:
  - 전사본 제안 2가 확률의 자리를 못박았다: "backbone — 핵심 **확률적 그래프**
    (taxonomy backbone, 구현: `skos:ConceptScheme` + **confidence 가중**)"
    (전사본 :12–13). 즉 **확률은 backbone 엣지 위**에 있어야 했다.
  - verified 분석의 GAP 1이 이를 "edge-level confidence 부재: `ho:tagged`·
    `skos:broader`는 crisp"로 옳게 진단하고서는, **최소안**에서 "anchor 전용 술어에
    병행 datatype(`ho:anchorConfidence`)을 두는 n-ary 노드 1종"으로 번역했다
    (verified :26–28). **이 문장이 전환점이다** — 가중의 대상이 backbone/블록 엣지에서
    "부착점(태깅 엣지의 reification)"으로 바뀌었다.
  - 이후 승인된 적용 계획 ①~④(①TBox 술어 3종 ②린터 cap ③retrieve 1-선별 ④편집기
    lane, verified :55–60)에는 **backbone 엣지 또는 node↔node 엣지에 가중을 얹는
    단계가 없다** — 전 단계 확인 결과 부재. alternativeOf/overlapsWith는 처음부터
    crisp로 설계·land됐다(1406d87).
- 결과: "확률기반 엣지" 요구는 현재 그래프에서 (a) 부착점 가중 `anchorConfidence`
  7건과 (b) 노드 prior `ho:salience` 17건으로만 존재하며, **노드와 노드를 잇는 가중
  엣지는 0건**이다. `ho:tagged` 224 엣지도 전부 crisp.

---

## 5. "skeleton = 구조적 지식"의 실현 여부 (E4)

앵커 7개가 만드는 실제 그래프 구조 (rdflib 실측, 아래 §8 재현 절차):

```
role-tester  ─0.9→ c-acceptance-coverage
role-tester  ─0.4→ c-multiagent
role-auditor ─0.9→ c-oversight
role-auditor ─0.4→ c-dispatch
role-auditor ─0.4→ c-multiagent
mem-longterm ─0.9→ c-memory
mem-longterm ─0.4→ c-lesson
```

- **뼈대가 아니다**: 3개 노드→6개 Concept의 **이분(bipartite) 별 구조**로, block↔block
  경로는 공유 Concept를 경유한 간접 연결(c-multiagent를 공유하는 tester↔auditor 1건)
  뿐이다. 노드 269+개 그래프에서 anchor 보유 노드 3개(≈1%)로는 어떤 의미로도 구조적
  지식의 골격이라 부를 수 없다.
- **backbone은 crisp**: `skos:broader` 70 엣지·최대 깊이 2, `ho:conceptFacet` 84 선언
  (B1 wave) — 계층·facet 정리는 진행됐으나 **확률 축은 전무**. "확률적 backbone"은
  구현 이력 전체를 통틀어 **한 번도 존재한 적이 없다**(§4 계보).
- **projection에서 통째 제외**: retrieve.py:66–74가 Anchor를 "never a seed, never
  traversed, never admitted"로 배제 — 이유 자체가 "rollup이 anchor를 weight 0.9로
  퍼뜨려 context rot을 유발하기 때문". 즉 skeleton이기는커녕 **읽기 경로에서 보이지도
  않는다**.
- **n-ary 자기-component 구조 평가**: `hasComponent o hasAnchor` chain(9번째,
  tbox:309)으로 Anchor 자신이 harness의 component로 끼어든다. 이는 reachability
  (anti-orphan)를 공짜로 얻는 repo 내부 관례(Candidate/Contract 동형)로는 정합하나,
  사용자 의도 기준으로는 **역방향**이다 — 의도는 "block 사이의 엣지"인데 구현은
  "엣지(태깅)를 노드로 물화(reify)해서 부품 목록에 넣은 것"이다. 물화된 앵커가
  component가 되는 대가로 projection에서 명시 배제라는 보정 코드(ANNOTATION_LAYER_
  CLASSES)까지 필요해졌다 — 의도와 맞지 않는 구조를 지탱하는 2차 장치다.

**한 줄 결론: 사용자가 말한 skeleton은 현재 그래프에 실재하지 않는다.**

---

## 6. 두 개의 "anchor" — 이름 충돌 계보 (선후 확정)

commit 실측으로 선후를 닫는다:

| 시점 | 사건 | 근거 |
|---|---|---|
| 2026-08-27 | 전사본이 "구조적 위치 → anchor"로 개명 (CAPRA evidence anchoring 근거) — **그래프 계열 anchor의 기원** | annotation-backbone-architecture.md 용어표 |
| 2026-08-27 | `tool_suggestion.md` v0.2 — 편집기 설계에 "IRI 앵커" 표기 유입 (W3C Web Annotation/standoff 계열) | tool_suggestion.md:359 등 |
| 2026-08-28 01:06 | **`ho:Anchor` land** (commit `1406d87`, stages 1–3) | `git log 1406d87` |
| 2026-08-28 12:48 | **plane-editor `anchors.mjs` land** (commit `4848f3b`, Phase 1 앵커 엔진) | `git log --diff-filter=A -- tools/plane-editor/src/anchors.mjs` |

즉 **그래프 anchor가 먼저**고(개념 기원·land 모두), 편집기의 텍스트 앵커는 같은 날
11시간 뒤 별개 의미(위치 고정 셀렉터)로 같은 이름을 얻었다. 이름만 같은 다른 물건이라는
병행 세션 보고는 **사실이며**, inspection도 이미 이를 "진행 중인 ④가 '다른 anchor'다"로
기록했다(verified :198–200).

**사용자 의도가 가리키는 쪽**: 둘 다 아니다(§3 anchor 표). 사용자의 anchor는 "block을
잇는 뼈대"(제3의 것)이고, 굳이 계보를 따지면 그래프 쪽이 전사본 anchor의 직계다. 편집기
anchor는 문서 위치 고정 장치로, 의도의 어휘와 무관한 후발 동음이의다. (개명 여부·방향은
orchestrator 소관 — 본 감사는 선후·계보 사실만 판정한다.)

---

## 7. 활용 실태 (E5) — "메커니즘은 섰고 내용은 비어 있다"의 의도 대비 의미

| 축 | 실측 | 의도 대비 |
|---|---|---|
| `ho:Anchor` 개체 | **7** (carrier 3노드), 전부 first-wave 저작, confidence 값은 0.9/0.4 2눈금뿐 | E4 뼈대 형성에 절대적으로 부족 |
| `anchorConfidence` 소비 | 코드 **0줄** (grep tools/*.py; TBox 정의 자체가 "DORMANT BY DESIGN… lands in a later stage") | E3·E5 미충족 — 확률값이 어떤 판단에도 쓰이지 않음 |
| `alternativeOf` | **0건** — A-wave 이중 탐색(inspection+vnv) 모두 "진짜 대안쌍 0"으로 일치, 저작 안 함이 증거 지지 결론 | 1-선별 로직(retrieve.py:208–285) 실질 무효 |
| `overlapsWith` | **2쌍** (chan-peer↔pat-peer-mesh, gr↔ins-well-formed-skill; 추론 후 4 triple) — 비배제 술어라 pack에 영향 없음 | node↔node 엣지의 전부, crisp |
| projection | Anchor 전면 제외 (ANNOTATION_LAYER_CLASSES) | skeleton이 읽기 경로에 부재 |
| **링크 평면** (그래프 밖) | `tools/plane-editor/link-store/links.json` **7 링크** — 종단점 {plane,ref} 쌍(decision↔graph 5, decision↔decision 2), type= tagged/derivedFrom/overlapsWith, **가중 필드 없음**(crisp) | 유일하게 실재하는 unit↔unit 직접 엣지이나 (a) `ontology/` **밖**(사용자 승인 결정 2-(a), dec-link-store-outside-ontology), (b) crisp, (c) 목적이 평면 결합이지 지식 skeleton이 아님 |

**정확한 프레이밍**: "중앙 그래프에 block↔block 엣지가 없다"가 아니라 — **block↔block
직접 엣지는 그래프 밖 링크 평면에(7건, crisp), 확률은 그래프 안 부착점·노드에(7+17건),
서로 다른 평면에 나뉘어 있고 이름(anchor)까지 겹친다**. "확률 + block↔block"을 한
자리에서 갖춘 표현은 어느 층에도 없다.

의도 대비 미충족으로 남는 부분: E3(확률 엣지)·E4(skeleton) 전부, E5(활용) 전부.
휴면 자체는 날조 금지(golden rule 2)와 "소비자 없는 저작 금지" 판정
(docs/verify/kg-content-candidates.md — anchorConfidence 소비 0줄이면 저작 금지 성립)의
**정당한 귀결**이지만, 그 판정들은 "현 스키마의 Anchor를 더 저작할 것인가"에 대한
답이지 "사용자 의도의 skeleton을 만들 것인가"에 대한 답이 아니다 — 후자는 애초에
승인 계획에 편성된 적이 없다(verified :192–194 "원인 1: KG에 실제 annotation/anchor/가중
엣지를 저작하는 단계가 애초에 없다. 지연이 아니라 미편성").

---

## 8. GAP 목록 (원인 분류: 어휘 부재 / 설계 판단 / 구현 표류)

| # | GAP | 원인 분류 | 상세 |
|---|---|---|---|
| G1 | **단위 형성 장치 부재** — 42-line이 상한 린트로만 남고, 지식을 block으로 분해하게 만드는 장치(하한 강제·분해 지원·초과 시 분할 경로)가 없음 | **설계 판단** (기록된 결정) | 하한 미강제 = orchestrator 명시 결정(verified :112–114); cap 목적이 granularity→retrieval precision으로 교체 = 사용자 승인 경유(500→260). 단 "형성" 의도가 결정 과정에서 명시적으로 기각된 적은 없음 — 상한 문면만 계승됨 |
| G2 | **block(지식 최소 단위)의 1급 어휘 부재** — 담을 클래스 자체가 없음 | **어휘 범주 부재** (+설계 판단) | `ho:` TBox에 해당 클래스 0. 기존 노드 일반이 암묵 단위 역할(neutral-parts 대전제와 정합적이라는 해석은 가능하나 명문 결정 없음). **schema(TBox) 확장 트리거 대상** — 단 본 감사는 판정만, 저작 없음 |
| G3 | **node↔node 가중 엣지 어휘 부재** — alternativeOf/overlapsWith는 crisp, 가중을 실을 자리가 없음 | **어휘 범주 부재 + 구현 표류** | 표류 지점 특정됨: verified GAP 1 "최소안" 문장(:26–28)에서 edge-level confidence가 부착점 n-ary로 번역. **schema 확장 트리거 대상** (n-ary 또는 RDF-star — rdflib 7.6 제약 기록 있음) |
| G4 | **확률적 backbone 미구현** — 전사본이 "ConceptScheme + confidence 가중"으로 못박았으나 broader·facet·tagged 전부 crisp, 구현 이력 전체에서 0회 | **구현 표류** (계획 미편성) | 승인 계획 ①~④에 backbone 가중 단계 부재(전 단계 확인). B-wave(facet)도 crisp 정리만 수행 |
| G5 | **anchor 3중 동음이의** — 사용자(뼈대) / 그래프(가중 태깅) / 편집기(위치 셀렉터) | **구현 표류** (용어 관리) | 선후: 그래프 계열(08-27 전사→08-28 01:06 land)이 먼저, 편집기(08-28 12:48)가 후발. "annotation"도 내용 단위→메타데이터 층으로 동반 미끄러짐(§3) |

어휘 범주 자체가 없어 담을 곳이 없는 GAP = **G2, G3** (schema 확장 트리거 명시 대상).

---

## 9. 재현 절차 (실행한 명령)

```
# 그래프 게이트 (working tree)
/usr/bin/python3 tools/validate.py                       # → PASS

# 앵커·엣지·skeleton 실측 (rdflib; 셸 python3에 rdflib 없으면 /usr/bin/python3)
/usr/bin/python3 - <<'EOF'
import sys; sys.path.insert(0,'tools'); import ontology_lib as lib
from rdflib import RDF, SKOS
g = lib.load_graph(); HO = lib.HO
# → Anchor 7 / hasAnchor 7 / alternativeOf 0 / overlapsWith 4(=2쌍 대칭 materialized)
#   tagged 224 / salience 17 / broader 70 / Concept 84, max depth 2 / conceptFacet 84
EOF

# 소비 코드 스캔
grep -rn "anchorConfidence\|anchorTarget\|hasAnchor\|Anchor" tools/*.py | grep -v plane-editor
# → ontology_lib.py:86 (INSTANCE_CLASSES), retrieve.py:66–74 (제외), lint:132 (prefix) — 소비 0

# 42-line 계보 원문
grep -n "42" docs/feedback/annotation-backbone-architecture.md            # :11 원 전사
grep -n "42" docs/feedback/inquiries/annotation-tooling-research.md       # :29, :164
grep -n "260\|130" tools/lint_uniformity.py ONTOLOGYSTYLE.md              # 상한만 강제

# 이름 충돌 선후
git log --format="%h %ad %s" --date=iso -1 1406d87                         # 08-28 01:06 ho:Anchor
git log --format="%h %ad %s" --date=iso --diff-filter=A -- tools/plane-editor/src/anchors.mjs
                                                                           # 08-28 12:48 편집기

# 링크 평면 (그래프 밖)
/usr/bin/python3 -c "import json; d=json.load(open('tools/plane-editor/link-store/links.json'));
print(len(d['links']))"                                                     # 7, 가중 필드 없음
```

코디네이터가 중계한 1차 증거 4건(42-line 원문 문면 / 이름 충돌 선후 / 확률적 backbone
0회 구현 / 링크 평면 성격)은 전부 원문·commit·JSON에서 **직접 재확인 후** 반영했다 —
4건 모두 사실과 부합했고, 1번은 원문에 "단위로 나눈다"(형성 절)가 상한 절과 **병존**함을
추가 확인해 §2에 병기했다.

---

## 10. 판정 종합

- **verification 축** (규격): 현행 그래프·린터·validate는 자기 규격대로 **정상 동작**
  중이다 (validate PASS, lint PASS, 위반 0). 결함이 아니라 **규격 자체가 의도와 다른
  것을 표현**하고 있다.
- **validation 축** (의도 부합): **fidelity-partial** — 의도 5요소 중 일치 0, 부분 1(E1의
  상한 절), 대체 2(E1 형성→린트, E3 블록엣지→부착점 가중), 미표현·미실현 2(E2, E4).
  E5(활용)는 사용자 판단대로 미충족.
- 수정·되돌리기 제안 없음 — 선택지 설계는 orchestrator 소관. 단 G2·G3은 어휘 범주
  부재라 채우려면 schema 확장이 선행돼야 함을 적시한다.
