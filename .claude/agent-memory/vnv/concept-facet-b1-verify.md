# Concept facet(어휘 축 속성) 신설 웨이브 검증 절차 — B1 유형

대상 유형: **개념 어휘에 "축(axis) 속성"을 신설하고 전 개념에 선언 + 축 불일치 노드
재부모화**하는 웨이브. 성공기준이 "검색 랭킹 불변"으로 걸려 있을 때의 판정법.
원 리포트: `docs/verify/b1-concept-facet-verify.md`.

## 1. 격리는 커밋이 아니라 triple 단위로 — 3-way 변형이 정답

멀티 lane 세션에서는 (a) 다른 wave의 미커밋 ontology 변경이 섞여 있고, (b) inspection이
**검증 도중 내 대상까지 남의 wave와 묶어 커밋**해버릴 수 있다(실제 발생:
`9a0483d "Land sim-hil B wave … and B1 concept facets"`). 그래서 HEAD worktree 비교는
"added 63 / removed 63, conceptFacet 0" 같은 **무의미한 답**을 낸다.

같은 raw union에서 **세 변형을 만들고 각각 따로 추론**하라:

```python
def build(variant):           # PRE / MID / POST
    g = raw_graph()           # lib._load_via_imports(...) — 추론 前
    if variant in ("PRE","MID"):
        for t in list(g.triples((None, HO.conceptFacet, None))): g.remove(t)
    if variant == "PRE":      # 재부모화 원복
        for n in REPARENTED:
            g.remove((n, SKOS.broader, NEW_PARENT)); g.remove((n, SKOS.related, OLD_PARENT))
            g.add((n, SKOS.broader, OLD_PARENT))
    lib.apply_reasoning(g)    # ★ 변형 後에 추론 — inverse(skos:narrower)가 변형마다 재계산
    return g
```

`MID vs POST` = **속성 선언만의 효과**, `PRE vs MID` = **재부모화만의 효과**.
두 변경을 한 wave가 같이 하므로 이 분해 없이는 "무영향 증명"이 성립하지 않는다.
raw 단계에서 변형해야 하는 이유: 추론된 그래프를 고치면 inverse/subproperty 파생 triple이
그대로 남아 오염된다.

## 2. 질의 세트를 넓혀라 — 자기보고 수치는 대개 좁은 세트 산

developer 자기보고 "deltas = 2 of 16 queries" → 40질의로 넓히니 **6질의/12 pack**.
determinism 게이트의 4질의는 표본으로 턱없이 부족하다. 세트 구성:
① 기존 게이트 질의 ② 각 변경 노드의 prefLabel/altLabel 문면 질의 ③ **부모/자식 양쪽 상위
개념 질의**(재부모화는 옛 부모 질의에서 잃고 새 부모 질의에서 얻는다) ④ 무관 대조군.
비교는 `R.project` + `render_markdown` + `json.dumps(indent=2)` 문자열 해시.

field-level 분석까지 해야 판정이 선다: 노드 삭제/추가/**relevance 재점수화**/rank order/
candidates/budget_used를 각각 비교. 이번 사례는 **재점수화 0**이고 변한 것은 간선 가중
경로(`broader` 0.5 → `related` 0.4)로 인한 **예산 내 admission 경합**뿐이었다 — 이 구분이
"랭킹이 깨졌다"와 "예산 경계에서 순서가 밀렸다"를 가른다.

## 3. presence를 shape이 아니라 linter로 강제한 설계는 근거를 직접 확인

"shapes는 값집합만 닫고 존재는 안 닫는다"는 결정은 **연합(federation) 때문**이라는 주장이
붙는다. 말로 받지 말고 두 줄로 확인:
- `grep -n "validate.py" <data-repo>/.github/workflows/*.yml` → 하위 repo CI가 **중앙**
  validate+shapes로 union을 검증하는가.
- `grep -rho "a ho:Concept" <data-repo>/recipes --include=*.ttl | wc -l` → 축이 없는 기존
  로컬 개념 수(여기선 **239**). `sh:minCount 1`이면 중앙만 바뀐 라운드에서 전부 깨진다.
그리고 **보상 통제가 실제로 게이트에 물렸는지**: `.github/workflows/validate.yml`에
`lint_uniformity.py` 스텝이 있는지 확인 + 린터 체크 함수에 **인메모리 주입 2종**
(중앙 NS 노드 → 1 violation / 연합 NS 노드 → 0 violation = false positive 없음).

## 4. SHACL negative control 세트(닫힌 값 축)

`P0 무변경 대조군 conforms` → `P1 값집합 밖` → `P1b 대소문자 표류` → **`P2 정상 값으로
치환해 conforms`**(P1의 FAIL이 값 때문임을 증명하는 대조군) → `P3 값 2개(maxCount)` →
`P4 datatype` → `P5 술어 없는 신규 노드`(presence 미강제면 **conforms여야 정상**) →
`P6 그 노드에 밖의 값`. base 그래프를 복제해 주입하고 `pyshacl(advanced=True)`.

## 5. 배정(assignment) 전수 재판정 — "예시 모방 vs 규칙 적용"

- 전 개념을 `(id, facet, TOP?, [(부모, 부모facet)])` 표로 뽑아 **부모-자식 facet 불일치**를
  전수 스캔. 남는 불일치가 "구속하지 않는 부모"(여기선 `scope`) 아래에만 있으면 정합.
- **설계 표에 없던 신규 개념**(병행 wave 산)에 집중: 설계는 68개를 예상했는데 실제 84개였다.
  누락 0인지(린터가 잡지만 수치로 확인) + 각 신규 배정이 어느 test로 결정됐는지 definition
  문면에서 재구성.
- **규칙 텍스트가 승인본보다 넓어진 지점을 반드시 찾아라**: 이번엔 (a) test 적용 **순서**
  고정, (b) anatomy를 "부위/부품"→"part **or declared structural axis**"로 확장. 이 둘이
  envelope leaf 20개·attachment leaf 8개를 anatomy로 만든 실질 근거다. TBox definition·
  스타일 §·파일 배너에 **명시돼 있으면 수용**(은닉 확장이 아님), 다만 판정문에 기록해
  "이후 저자가 참조할 규칙 원본이 승인문서가 아니라 정련된 §"임을 알린다.
- arguable 건은 definition에 "together with the discipline …" 같은 **두 성격 혼재** 문구가
  있는 노드다. first-fit 규칙으로 설명되면 CONFIRMED 아님, 기록만.

## 6. 범위 준수(다음 단계 미착수) 확인법

pre-wave 커밋을 `git archive <sha> | tar -x -C <scratch>`로 풀고(레포 상태 무변경) rdflib로
raw triple set diff:
- `ho:tagged` **added on pre-existing subjects == 0** → 개체 태그 보강 단계 미착수.
- pre-existing Concept 주어 added triple 히스토그램이 `{conceptFacet: N, broader: 3,
  related: 3}`뿐 → 개념층 변경이 선언+재부모화로 한정됨.
- shapes diff가 신규 NodeShape 블록뿐이고 기존 region SPARQL 무변경 → 다음 shape 단계 미착수.
- TBox blank-node(`propertyChainAxiom` 리스트) 재직렬화 잡음은 diff에 항상 뜬다 — 결함 아님.

## 7. 스타일 [지ким] 자동 대조(자기가 만든 규칙을 자기가 지켰나)

새 [지킴]이 "이 술어는 SKOS 관계 뒤 맨 끝"이면 파일을 블록 단위로 쪼개 검사하되
**주석 줄을 먼저 제거**하라(섹션 배너에 `skos:broader` 같은 산문이 있어 crude split은
전부 오탐: 첫 시도 11건 → 주석 제거 후 **0건**).

## 8. 다음 wave 가능성(선행조건) 판정 — 시뮬레이션 3종

"이제 X가 가능한가"를 물으면 (a) **쿼리 작성 가능성**(패치한 shapes를 인메모리로 파싱해
pyshacl 실행) (b) **효과 실증**(문제 사례쌍에 관계를 주입 → 현행 shape conforms / 새 shape
FAIL / **진짜 사례 대조군은 새 shape에서도 conforms**) (c) **규모·잔여 비용**(축별 개체
프로필 히스토그램)을 낸다. 이번엔 co-region 쌍 1081→173(-84%)이면서, 판별 축 정의가
긍정열거(anatomy|method)와 부정열거(scope|domain)로 **엇갈려 quality의 지위가 미결**임을
발견 — 다음 단계 브리프 전에 결정이 필요한 공백으로 보고. **"가능하다"만 답하지 말고
"어떤 결정이 남았나"까지가 판정**이다.

## 9. 잡기술

- `materialize` byte-identity는 반사실 트리로: 현재 트리를 scratch로 복사 →
  rdflib로 대상 abox 파일만 원복 재직렬화 → 두 트리에서 각각 `materialize.py <h> --out …`
  → `diff -r`. 파일 수(20/20)도 함께 확인해야 "둘 다 비어서 동일" 오탐을 막는다.
- 개념(Concept)은 `tokenEstimate`·`maturity` 대상이 아니고, 새 datatype 술어는
  `link_predicates`(객체 술어)에도 안 들어가므로 retrieve 경로에 원리적으로 안 잡힌다 —
  그래도 **측정으로 증명**하고 원리는 보조 설명으로만 쓴다.
- TBox definition 길이는 §1c cap(abox 대상) 밖이지만, 167개 중 순위를 뽑아
  선례 범위 안인지 보면 note 근거가 된다(이번: 321단어 = 2위, 1위 `hasComponent` 634).

## B2+B3 (같은 wave 후속: 태그 백필 + region shape 필터) 판정 절차

- **개체군 동일성이 첫 게이트**: "단독 태그 27개체" 주장은 pre 그래프(HEAD worktree)에서
  `{s | tags(s)=={c-scope}}`를 재계산해 편집된 subject 집합과 symmetric diff=∅로 닫는다
  (grep 계수 말고 집합 동일성).
- **태그 사실성은 verbatim 대조가 본체**: 개념 정의의 핵심 구절이 개체 정의문에 문자 그대로
  있으면 즉결("dispatch-invoked only"↔c-dispatch 등 24/27). 재량건 반증은 developer 자신의
  기각 규칙("한 clause라도 대조문이 부정하면 탈락")을 **대칭 적용**하되, 어긋나는 것이
  원리의 **내용**인지(→기각 타당: vnv에 c-cross-validation) **전형 주어의 지칭**뿐인지
  (→태그 유지+개념 정의문 일반화 권고: role-coordinator에 c-delegation, 개념이
  "user-facing orchestrator"로 좁게 쓰임)를 가른다.
- **uniform 태그(채널 6=c-communication) 정보손실 반증법**: (a)개체 정의문들이 서로를 명시
  대조하면 그 집합이 미래 alternativeOf 군 = 공통 anatomy가 정답(쪼개면 region 불일치로
  진짜쌍 FAIL), (b)특화 의미는 딴 노드 태깅이 지니는지(taggee 수), (c)40질의에서 그 클래스
  탈락 0·admit 증가로 손실 부재를 실측.
- **회귀 검산**: pre/post를 각 트리 자기 tools로 별 프로세스 capture(PYTHONHASHSEED=0),
  tools/*.py HEAD 무변경을 먼저 증명해 "코드 고정·그래프만 상이" 성립. 태그는 엣지라
  랭킹을 움직이는 게 정상 — 판정축은 (1)신규 태그 개체의 relevance 상승만 있는가
  (2)탈락이 tail filler인가 (3)top-5 candidates 이탈 0인가. "하강" flag는 pack 내 위치
  하강(렌더 순서)과 탈락·점수하락을 구분해야 오판 안 함(gr 3종은 rel 2.362 그대로,
  위로 온 게 질의의 직접 지시체=채널이면 개선).
- **B3 컨트롤 5종+연합 3종**: OLD shape는 `git show <기준커밋>:`(그 뒤 ontology 접촉 커밋
  0임을 `git log HEAD -- ontology/shapes/`로 명시), 위반은 "SAME region" 메시지로만 집계
  (대칭×양방향=쌍당 4건이 정상). 허위쌍 2종(scope만/scope+quality)은 그래프에서 실쌍을
  탐색해 주입(합성보다 강함: role-benchmarker↔role-auditor). 연합은 F1(facet-less 로컬
  개념, 선언 없음→0 viol) / F2(그것만 공유+선언→FAIL) / F3(로컬 facet 선언→conforms)
  3종이 한 세트. staging recipe union은 central 심링크가 워킹트리라 신쉐이프로 자동 검증
  — union 실로드는 개체수(중앙 364 vs 375)로 확인.
- **fail-closed 잔존의 실비용 셋을 반드시 이름 붙여 보고**(다음 결정 근거):
  tool-editor↔tool-lint-gated-edit(domain만 공유), chan-approval/elicitation(채널 8 중
  2만 region 밖), pat-orchestrator-workers(무태그라 정석 대안쌍 pat-peer-mesh와도 차단).
