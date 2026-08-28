# intent-fidelity audit (의도 대 구현 충실도) 검증 재현 절차

소스가 코드·문서가 아니라 **사용자의 원 의도 진술**인 감사 유형 (게이트 7의 특수형).
첫 사례: `docs/verify/block-anchor-intent-fidelity.md` (42-line block + 확률 skeleton).

## 판정 골격
1. **의도를 구조 요소로 원자화**(E1..En)하고 요소별 4분류(일치/부분/대체/미표현) 표가 본체.
   "부분"은 문면 절 단위로 쪼개서 판정 (예: "42 line 이하로 제한" = 상한 절은 구현,
   같은 문장의 "단위로 나눈다" 형성 절은 미구현 — **원문에 두 절이 병존**하는지 먼저 확인).
2. **수치의 계보(genealogy)를 변환 사슬로 복원** — 42 line → 500 tok(환산) → 260 tok
   (사용자 재결정) → 상한만 강제(orchestrator 결정). 각 변환의 **결정 주체·근거 문서 행**을
   달아야 "표류 vs 승인된 설계 판단"이 갈린다. ★숫자만 아니라 **정당화 근거의 교체**
   (granularity→retrieval precision)가 목적 이동의 결정적 증거.
3. **용어별 지시대상 표** — 같은 단어(anchor/annotation/block)가 층(사용자/전사/TBox/도구/
   편집기)마다 다른 것을 가리키는 지점이 감사의 핵심. 전사 단계의 "용어 표준화"가 첫
   변환임을 놓치지 말 것 (사용자 원용어가 전사본 괄호 안에만 남는다).
4. **표류 전환점을 문장 단위로 특정** — 이번 건은 verified GAP 1의 "최소안" 문장에서
   edge-level(backbone 엣지) 진단이 n-ary 부착점으로 번역된 지점. "승인 계획 ①~④에 해당
   단계가 있는가"를 전 단계 열거로 닫으면 "지연 vs 미편성"이 판정된다.
5. **이름 충돌 선후는 commit 시각으로 종결**: `git log --diff-filter=A -- <파일>` vs land
   commit `--format=%ad`. 개념 기원(전사일)과 land일을 둘 다 적는다.
6. **"어디에도 없다" 주장은 평면 분할로 재프레이밍 검증** — 중앙 그래프 밖 스토어
   (plane-editor link-store 등)에 절반이 있을 수 있다: unit↔unit 엣지는 그래프 밖(crisp),
   확률은 그래프 안(부착점·노드) — "두 평면에 나뉘고 이름이 겹친다"가 정확한 프레이밍.
7. GAP 분류 3분법(어휘 부재/설계 판단/구현 표류)에서 **어휘 부재 건은 schema 확장 트리거
   대상임을 명시**(판정만, 저작 금지). verification(규격대로 동작=PASS)과 validation(규격이
   의도와 다름)을 분리 선언하면 "결함 아님 + 충실도 미달"이 모순 없이 성립.

## 이 건의 실측 사실 (재사용 가능)
- `ho:Anchor`=node→Concept 가중 태깅(anchorTarget range Concept, 정확히 1), block↔block
  아님; node↔node는 alternativeOf(0)·overlapsWith(2쌍)뿐이며 **crisp**.
- 확률적 backbone(broader/tagged/facet에 가중)은 구현 이력 전체에서 **0회** —
  anchorConfidence(부착점 7)·salience(노드 17)로 이동.
- anchorConfidence 소비 코드 0줄, Anchor는 retrieve ANNOTATION_LAYER_CLASSES로 전면 제외.
- lint text cap: TEXT_CAP_TOKENS=260 상한만 강제, 하한 130 advisory (lint_uniformity.py:160–162).
- 이름 선후: 그래프 anchor(전사 08-27 → land 1406d87 08-28 01:06) 先, 편집기 anchors.mjs
  (4848f3b 08-28 12:48) 後.

## 함정
- 코디네이터가 중계한 "1차 증거"도 그대로 쓰지 말고 원문 행을 직접 열어 재확인 (이번 4건
  전부 참이었으나 1건은 원문에 반대 절이 병존해 병기가 필요했다).
- 전사본의 "구현: X" 괄호가 의도의 일부다 — "확률적 그래프(구현: ConceptScheme+confidence
  가중)"처럼 확률의 **자리**까지 못박은 문면을 놓치면 부착점 가중을 충족으로 오판한다.
- overlapsWith 등 대칭 술어의 rdflib 카운트는 추론 후 2배(2쌍=4 triple) — 저작 수는 grep으로.
