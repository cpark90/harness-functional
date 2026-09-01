# CLAUDE.md — working in this repo

이 저장소(**harness-functional**, 구 harness_ontology)는 하네스의
**functional 수준(어휘: TBox + shapes)**과 **ODD**(`HARNESS-ODD.md`)만
담는다. 개체(A-Box)·조립 명세·투영 실행은 전부 **harness-concrete**로
이관되었고, 일반 지식관리 방법론은 **agentic-knowledge-base**의 결정 청크
(d-0013~d-0017)로 이송되었다. 정체와 경계는 `README.md`가 원본이다.

## Golden rules

1. **이 저장소에 개체를 만들지 않는다.** guardrail·tool·harness 등 모든
   individual은 harness-concrete의 `ontology/abox/` 또는 레시피 로컬이다.
   여기서 하는 일은 어휘(클래스·프로퍼티·SKOS 개념 체계)와 shape뿐이다.
2. **`ontology/` 수정 후 `make validate`.** 반드시 PASS. 실패하면 shape를
   약화하지 말고 고친 것을 수정한다.
3. **TBox 변경은 concrete에 파급된다.** 클래스·프로퍼티 추가·변경 후에는
   harness-concrete에서 catalog 재생성(`gen_recipe_catalog.py`)과 전체
   레시피 union 게이트를 돌린다 (HARNESS-ODD 조건부 규정).
4. **어휘 스타일 원본은 `ONTOLOGYSTYLE.md`.** 저작 세션 시작 시 읽는다.
   이 문서는 concrete 저장소의 TTL 저작에도 적용된다.
5. **ODD 밖에서 작업하지 않는다.** 필요한 조건이 `HARNESS-ODD.md`에 없으면
   ODD를 먼저 확장한다(판정 방법 필수).

## 환경

`rdflib`, `pyshacl`, `owlrl`가 있는 python3로 도구를 실행한다. 셸 기본
`python3`에 없으면 `/usr/bin/python3`.

## 언어 (language policy)

산문은 한글, 용어는 영어. `skos:prefLabel`·`skos:definition` 등 검색 대상
그래프 데이터 값은 영어. 임의 신조어·자체 약어 금지 — 표준 용어를 쓴다.
