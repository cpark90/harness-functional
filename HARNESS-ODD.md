# HARNESS-ODD — 하네스 작업의 운영 설계 영역

하네스 어휘 관리(이 저장소)와 하네스 조립(harness-concrete)이 설계된 운영 조건의
명세. 구조는 agentic-knowledge-base 노트 3.2절(mode / 정적 / 환경 / 동적 / 명시
제외 / 조건부 / 판정 방법)을 따른다. 모든 조건은 객관적 판정 방법을 갖는다 —
판정 방법 없는 조건은 여기 둘 수 없다.

mode: **restrictive** (명시 포함만 허용)

## 정적 요소

| 속성 | 값 | 판정 방법 | 등급 |
|---|---|---|---|
| 저장 형식 | OWL 2 (TBox) + SHACL (shapes), Turtle | `make validate` 파싱·SHACL 단계 | A |
| IRI 체계 | `https://harness-ontology.dev/…` — 위치 독립, catalog가 IRI→파일 해석 | catalog-v001.xml 존재 + 로더의 import 해석 성공 | A |
| 연합 구조 | functional(schema, 이 저장소) / concrete(root + parts + recipes) 2-repo 분할 | 이 저장소 catalog에 schema만, concrete catalog에 root·core·recipe 존재 | A |
| 도구 언어 | Python 3 + rdflib·pyshacl·owlrl | `python3 -c "import rdflib, pyshacl, owlrl"` | A |
| 어휘 규율 | TBox가 유일한 어휘. 개체(A-Box)는 이 저장소에 두지 않음 | `make validate`의 registryDrift + `ontology/abox/` 부재 | A |

## 환경 조건

| 속성 | 값 | 판정 방법 | 등급 |
|---|---|---|---|
| concrete 저장소 | harness-concrete가 이 저장소를 `./central/`로 체크아웃 가능 | concrete CI의 clone 단계 성공 | A |
| CI | GitHub Actions 가용 | 워크플로 실행 성공 | A |
| 인터프리터 | rdflib 셋이 설치된 python3 접근 가능 | import 검사 (위와 동일) | A |

## 동적 요소

| 속성 | 값 | 판정 방법 | 등급 |
|---|---|---|---|
| 동시 변경 | 열린 브랜치·PR 수 ≤ 3 | `gh pr list` 카운트 | A |
| 미해소 피드백 | `docs/feedback/` 미승인 항목 수 유한 (스캔 사이클마다 소비) | 디렉토리 항목 카운트 | A |

## 명시 제외

- **도메인 지식** — reviewed 2026-09, 이유: 중앙 중립성. 모든 도메인 노드는
  concrete 저장소의 레시피 로컬에 산다. 이 저장소는 도메인을 결코 알지 못한다.
- **특정 하네스의 기술(記述)** — reviewed 2026-09, 이유: 같은 중립성. 개체는
  전부 concrete 저장소로 이관됨.
- **일반 지식관리 방법론 문서** — reviewed 2026-09, 이유: agentic-knowledge-base로
  이송(청크 d-0013~d-0017). 이 저장소는 하네스 어휘에만 집중한다.
- **벡터 검색 단독 저장** — reviewed 2026-09, 이유: 연결성 보장 없음
  (agentic-knowledge-base 청크 d-0013의 대안 기각 근거).

## 조건부 규정

- TBox에 새 클래스·프로퍼티를 추가하면 → concrete 저장소의 catalog 재생성과
  전체 레시피 union 게이트 재실행이 필요하다 (central 변경은 전 레시피에
  파급된다 — concrete CI의 workflow_dispatch 경로).
