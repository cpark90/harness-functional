# 확률적 링크 레이어(스키마 대수술) 검증 재현 절차 — weighted-link phase 1

폐기(클래스·술어 삭제) + 신설(n-ary Link) + 수직 슬라이스 + 도구 결합 웨이브의 판정법.
리포트: `docs/verify/weighted-link-phase1-verify.md`.

## 재현 뼈대 (scratchpad tree 5개)

- **treeA**=현행 복제(tools[plane-editor 제외]+ontology+catalog rsync; `ontology_lib.ROOT=__file__`라 복제본이 자기 그래프 로드).
- **treeB**=자체 기준선: link-layer만 regex로 역적용(`id:(link|kind)-… a ho:Link(Kind)? ; … .` 블록 + `ho:hasLink …;` 문장 제거 — 14블록/5문장 카운트가 곧 delta 검산).
  **HEAD가 기준선이 아니다** — 슬라이스의 전신(anchor 7건)이 uncommitted 워킹트리에만 있었음. 직전 판정 리포트의 개체수(371=364+7)로 산술 폐합하는 게 유일한 계보 증명.
- **treeC**=anti-vacuous: 제외 로직만 무력화(`link_layer_nodes→set()`) — 스위트가 오염을 감지함을 증명(23/72 differ + 링크 노드 admit + budget 변동).
- **treeD**=measure --apply 실험장(멱등 diff-r / 조작→복원 / curated 조작→보호 / origin 되돌려 반사실 측정값).
- **treeE**=2단계 시뮬레이션: 링크와 병렬인 crisp tagged만 제거 → relevance가 정확히 ×degree(4.016→3.615=×0.9), 0.4 degree는 effective 0.28로 팩 탈락 — "가중이 실랭킹에 반영되는 경로" 실증 + base weight 재보정 근거 정량화.

## 배운 것

- **36질의 배치는 retrieve.py 프로세스 216회 돌리지 말 것** — 그래프 1회 로드 후 `project()+render_markdown()+json.dumps(indent=2)`가 main과 byte-동일(주의: md는 마지막 개행 보정). 3트리 전체 수 분.
- **pkill 자기살해**: `pkill -f <패턴>`을 포함한 compound command는 자기 cmdline이 패턴에 맞아 exit 144로 죽는다 — pkill은 단독 블록으로.
- **JSON 오염 판정은 필드 단위**: differ 질의에서 `set(a)|set(b)` 전 key 비교 → 변한 key가 `edges`뿐인지 + crisp edge 리스트 동일 + `w` 라인만 추가인지. md는 Structure cap 30 밀림(+N more)이 정상 diff 성분(코스메틱 note).
- **negative control 20종 표준셋**(Link): C0 twin / orphan / label / target{無,2,Harness,untyped} / kind{無,비LinkKind} / weight{無,1.5,**integer 1**} / origin{無,bogus,measured無method} / method twin / kind traversalWeight{無,twin} / alternative 판별region{無,twin}. 기대 **메시지 문자열**까지 대조. range-less 술어의 이빨은 N5/N6(Harness·untyped target FAIL)이 증명.
- **폐기 안전성 grep의 진짜 수확은 그래프 밖**: 중앙·recipes·docs 규범문서 0이어도 **`tools/plane-editor/check_links.py`가 TBox 실재를 검사**(vocabulary-provenance)해 폐기 즉시 FAIL(2 violation) — validate.py는 `ontology/` 밖을 안 보므로 영구 미검출. 폐기 웨이브는 반드시 그래프-밖 소비자 인벤토리+실행으로 닫을 것. 살아있는 계획 문서(docs/plans)가 폐기 술어 재사용을 지시하는 doc-lag도 같은 축.
- **measure 검증 4종 세트**: 손검산(noisy-OR — evidence trail을 도구 출력에서 받아 성분 확인; 브리프의 성분 목록과 실제 trail이 다를 수 있음: chan-peer는 E1+E1+E3=0.758→0.76, E2 없음) / 멱등(diff -r 빈 출력) / 조작→재측정 복원 / curated 조작→PROTECTED. + origin을 asserted로 되돌려 "측정이라면 얼마였나" 반사실(0.5)로 curated의 존재 이유까지 실증.
- **traversalWeight 파리티 검산**: kind base == 구 crisp 술어의 PREDICATE_WEIGHT(tagged 0.7/broader 0.5/미등재→default 0.5) — 이 일치가 "이전만으로 랭킹 불변"의 구조적 근거.
- **2단계 보강 위험(내가 추가한 것 — 재사용)**: R-A ConceptConnectivityShape sh:or의 tagged/broader 의존(이전 시 Concept 전량 orphan 오탐), R-B `_SKOS_LINK_PREDICATES`·PREDICATE_WEIGHT·facet parent tie-break·문서, R-C 측정 증거가 crisp tagged라 이전 시 증발/순환, R-D w=0.0(명시적 거부)도 alternative 1-admit 클러스터 성립(crisp 멤버십 명문) — 거부가 억제를 유발하는 역설, R-E 그래프-밖 소비자 인벤토리 부재.
- 병행 wave 오귀속 차단: 같은 파일(guardrails/concepts/roles)에 태그백필·정의압축 wave가 섞여 있어도 **본 wave 성분은 link 블록+hasLink 줄만** — diff에서 성분별로 갈라 귀속.
