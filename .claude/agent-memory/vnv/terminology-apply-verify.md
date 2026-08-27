# 용어 정립(문서+리터럴) 적용분 검증 재현 절차

대상 유형: **위상 무변경 · 리터럴만 바뀌는 적용 단위**(용어 통일, 정의문 정밀화, 산문 교정).
새 노드/엣지가 안 생기므로 `validate.py` PASS는 거의 자동이라 **증명 축이 다른 곳에 있다**.

## 판정 축 (이 유형 전용)

1. **위상 델타 = 0 을 기계로 증명한다** (PASS만으로는 부족).
   HEAD worktree(`git worktree add --detach <scratch>/head HEAD`) vs 워킹트리의
   abox instance-triple 집합 symdiff → `removed == added == N`, **subject 집합 동일**,
   **predicate가 리터럴 술어(skos:definition / ho:observedFileScope …)뿐**이면 리터럴 교체 확정.
   여기에 prefLabel 전수 대조(`changed == []`, removed-id 0)를 더하면 "id·label 불변" 제약 완료.
2. **discoverability 퇴행 = 편집 前 문면 쿼리로 잰다.** 새 문면 쿼리로 점수가 오르는 건
   당연하니 증거가 못 된다. 옛 문면 쿼리에서 **노드 집합·candidates·budget_used가 불변**인지
   보고, relevance가 몇 점 떨어져도 팩에 남아 있으면 퇴행 아님(term-match 감소는 예상된 대가).
   HEAD worktree의 `retrieve.py`를 그대로 실행하면 `ontology_lib.ROOT=__file__`이라
   자기 worktree ontology를 로드 → 진짜 before/after 비교가 된다. `PYTHONHASHSEED=0` 고정.
3. **`skos:definition`은 emit 대상**이다(`materialize.py`:484 Workflow / :502 Pattern /
   :531 Role). 정의문을 고치면 산출물 텍스트가 바뀌므로 "byte-identity"를 주장하지 말고
   **HEAD worktree materialize와 `diff -r` 해서 diff가 의도한 문장에만 한정**됨을 보인다.
   (실측: h-multiagent = 정확히 3문장 + lock `individualCount`, 구조·파일목록 불변.)

## 함정

- **retrieve JSON 키**: top-level은 `request/terms/seeds/nodes/edges/candidates/gaps/budget/budget_used`.
  `nodes`는 **list**(dict 아님), 노드의 `id`는 **full IRI**(`.../id/core/<slug>`)라
  `n['id'].endswith('/'+slug)`로 매칭해야 한다. `candidates`에는 **id가 없고 label+relevance뿐**.
  키를 잘못 잡으면 전부 "미검색"으로 나와 **거짓 FAIL**을 만든다(이번에 한 번 밟음).
- **워킹트리 오염**: 이런 소규모 적용은 항상 선행 태스크 diff와 섞인다. 신규 id 목록을
  뽑아 선행 태스크 소유분을 **명시적으로 필터**한 뒤 델타를 귀속시킨다.
- **산문 grep 집계**: 원 조사 보고의 "N곳" 수치를 믿지 말고 재측정한다(이번엔 6곳 주장 vs
  실제 9곳). 절차 = abox `*.ttl` 전 줄에서 `\bontolog`(대소문자 무시) 매치 중
  `@prefix` / `a owl:Ontology` / `owl:imports` / 주석줄(`#`) 제외.
- **공지시 클러스터**: 한 문장이 여러 노드에 복제돼 있으면(예: agent-X / os-X / aoi-X /
  oa-X-external의 "the assigned … nodes") 계획이 하나만 지목했어도 **나머지를 같이 고치는
  것이 옳다** — 안 그러면 같은 파일 안에서 용어가 갈라져 혼용이 재생산된다. 계획 초과지만
  (a)리터럴만 (b)위상 델타 0 (c)id/label 불변이면 **정당한 초과**로 판정한다.

## tokenEstimate 판정 (리터럴이 길어졌을 때)

§1c [지킴]은 **존재**만 요구하고 산식은 규정 안 한다 → 정의문이 길어졌는데 값이 그대로여도
[지킴] 위반 아니고 `lint_uniformity.py`도 통과한다. 판정은 "비차단 + 정확도 권고"로:
실제 팩 절단이 있었는지(`budget_used`가 before와 같은지)로 무해성을 증명하고, chars/4
근사치를 함께 적어 갱신값을 제시한다. 과소평가가 **선행 상태부터**였는지 HEAD와 비교해
"이번 편집이 만든 결함"과 구분할 것.
