# A-wave: c-X↔gr-X 쌍둥이 정의 축약 + 첫 overlapsWith 저작 (2026-08-28)

## 대칭 술어(ho:overlapsWith/alternativeOf) 저작 관례
- **한 방향만 저작한다.** TBox 정의문이 명시: alternativeOf "authoring ONE direction is
  enough", overlapsWith "the reverse edge is materialised" (owl:SymmetricProperty, OWL RL이
  역방향 생성). 양방향 저작은 중복.
- 팩 회귀: overlapsWith 엣지는 **admission을 바꾸지 않는다**(1선별 트리거 아님) — 단
  두 endpoint가 같은 팩에 들어오면 edge 리스트에 **정방향+역방향 2줄**이 추가되므로
  "byte-identity 유지" 게이트는 문자 그대로는 성립하지 않는다. admission/rank/budget
  불변 + 저작 엣지만 추가임을 보이면 그게 정답.
- 결정 문서의 `core:` 접두사 = 중앙 `id:` 네임스페이스(https://harness-ontology.dev/id/core/).
  TTL 어디에도 `@prefix core:` 선언 없음 — 산문 표기일 뿐.

## 쌍둥이 정의 축약 (Concept=원리 why / Guardrail=명령 imperative)
- 이 repo의 7쌍 실태: gr-*는 promptText만(정의문 없음), c-*는 정의문만. 중복은
  **c.definition ↔ gr.promptText**. 축약은 Concept 쪽만 하면 된다(gr promptText는
  자기완결 유지, 변경 0 → tokenEstimate 재산정도 0건).
- **검색어 보존이 핵심**: retrieve 점수는 per-term best-field(prefLabel 3.0 > altLabel
  2.5 > definition 1.0 > promptText 0.6). 라벨에 없는 판별 검색어(durable/channels/
  projection/permissions/symptom/near-synonym/timeout…)는 새 정의문에도 남겨라.
  잃은 단어당 점수 -1.0×prior — 실측: "avoid"를 c-simplicity에서 빼자 3.6→2.7, rank 2→3.
- **~225 같은 회수 추정은 상한**: 중복분 전부 제거 = Concept 정의문이 검색 불능 stub가
  된다는 뜻. 검색어 보존 하의 실제 회수는 69 tok(299→230, chars//4). 예상치와 실측이
  다르면 사유와 함께 실측을 보고하면 된다.
- Concept은 tokenEstimate 미부여 관용 + retrieve token_cost는 15 floor → 정의문 축약은
  **admission 예산에 안 잡힌다**(회수는 렌더 텍스트에서만 실현). 축약 목적이 admission
  변화라면 Concept에 tokenEstimate를 새로 다는 건 역효과(15→실측치로 오히려 비싸짐).

## 병행 dispatch 하에서 검색 회귀 격리법
- 편집 전 baseline 팩과 편집 후 팩의 차이엔 **남의 동시 편집분이 섞인다**(실제로 q3~q6
  dlv-*/as-* 증감은 남의 harnesses/assembly 편집분이었음). 격리: ontology+tools+catalog를
  scratch로 복사 → 거기서 **내 편집만 역적용**한 control을 만들고 control vs after 비교
  (ontology_lib은 ROOT 상대라 복사본 tools/retrieve.py를 그대로 실행하면 됨).
