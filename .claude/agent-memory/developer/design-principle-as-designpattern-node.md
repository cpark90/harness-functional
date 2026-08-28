# 설계 원리 1건을 그래프에 남길 때: DesignPattern 1개 + 기존 Concept tag (신규 Concept 0)

트리거: 설계 제안 문서(`docs/feedback/inquiries/*`)의 inspection 판정이 "온톨로지 반영이
필요한 부분은 원리 X 하나뿐, 나머지는 도구 층"으로 좁혀 왔을 때. 사례 = "지식 종류별 컨텍스트
분리 + 링크 평면"(`tool_suggestion.md` §A) → `id:pat-knowledge-plane-separation` 1개로 마감.

## 판단 규칙 (신규 Concept을 만들지 않는 근거)

- **원리 = DesignPattern 개체**가 기본 vehicle이다(TBox: "abstract, named composition pattern",
  `⊑ ho:SpecConcept`). Concept은 *태깅 축*이지 원리 저장소가 아니다 — 지금 그 태그를 쓸 노드가
  1개뿐이면 Concept 신설은 YAGNI + 근사동의어 위험(`c-bounded-context`와 갈라짐).
- **Concept 신설 조건**: 앞으로 여러 노드(guardrail/capability/pattern)가 그 태그를 공유할
  전망이 있을 때만. 그 전엔 기존 최근접 Concept에 `ho:tagged`.
- 최근접 선택은 **정의문 실독**으로: `c-pattern-taxonomy`는 "multi-agent 작업흐름 아키텍처"
  전용이라 컨텍스트 분할 패턴엔 오배치. 컨텍스트 축 원리는 `c-bounded-context`(anti-context-rot)
  아래가 맞다 — 양은 bounded-context(HOW MUCH), 종류는 이 패턴(WHICH KIND)으로 직교 서술.
- 도달성: DesignPattern은 `ho:tagged` 하나로 충족(harness `appliesPattern` 불필요 — 기존
  `pat-pipeline`류 선례). SpecConcept라 maturity/definition은 shape 미강제지만 이웃 관례대로 부여.

## 저작 수치·형식

- `patterns.ttl`은 3섹션(일반 Design patterns / Execution modes / Architectural coordination).
  코디네이션 토폴로지가 아닌 패턴은 **1섹션 말미**(pat-ontology-composition 뒤)에 둔다.
- DesignPattern의 `ho:tokenEstimate` = **definition chars//4**(promptText 없음). 파일 내 관례가
  혼재(`pat-peer-mesh`는 무, `pat-blackboard`/mode-*는 유) — 최신 저작은 부여 쪽.
- **cap 260은 상한이지 목표가 아니다**: 초안이 274~286이면 압축하되 258 같은 벼랑 값 대신
  **230~245**로 착지시켜 후속 문면 보강 여유를 남긴다(실측: 243 = 973자).
- 압축 우선순위: 예시 나열 축약 > 중복 수식어 > 동기 절. **"왜 존재하나"(오판 증상) 1절과
  "비용/상한" 1절은 남긴다**(§1d: 선택 이유·제약).

## 용어 충돌 방어

`plane`은 이 repo에서 이미 **실행 모드의 동시 레인**("dispatch plane / standing plane",
`harnesses.ttl` 주석·`as-execution-mode`)으로 쓰인다. 지식 평면을 도입하면 같은 단어가 두 축을
가리키므로 definition 끝에 1문장 de-conflate를 박는다("its planes are knowledge kinds, not
id:c-execution-mode's runtime lanes"). `retrieve.py`가 emit 시 `id:` 토큰을 label로 해소하므로
정의문 안의 IRI 참조는 팩에서 dangling되지 않는다(→ 참조로 쓰는 편이 낫다).

## 게이트 결과 (참고 수치)

validate PASS / lint_uniformity PASS / 브리프 질의에서 seed rank 1 (relevance 18.45, 팩
898/900 token). 병행 세션이 같은 파일을 만지므로 `git diff -- <담당파일>`로 **자기 hunk만**
확인하고 나머지(예: `c-lesson` 신설, mode-standing-service 압축)는 건드리지 않는다.

## 재dispatch 방어 — "아직 없다"는 브리프 전제도 검증 대상

같은 원리가 **두 번 dispatch**됐다(2026-08-28). 원인: 노드를 land한 커밋
(`1406d87 Land annotation stages 1-3 + Phase 0 map`)의 메시지가 stage 1–3·Phase 0만 나열하고
`pat-knowledge-plane-separation`은 **한 줄도 언급하지 않아** orchestrator에게 미착지로 보였다.
(같은 커밋의 다른 산출물 — cap 260·`ho:alternativeOf`/`Anchor`·1-admit — 은 브리프가 "최근
land됨"으로 정확히 알고 있었다.)

- 저작 착수 전 **양방향 확인**: 기존 메모의 "brief가 land됐다 주장 → grep으로 불신"에 더해,
  **"brief가 없다고 전제 → `git grep -n '<slug>' HEAD -- ontology/`로 존재 확인"** 도 돌린다.
  1분짜리 검사가 중복 노드(=근사동의어 drift, golden rule 2 정면 위반)를 막는다.
- 이미 있으면 결론은 **신설 0 + 커버리지 감사표**(소스 요소 ↔ 기존 노드 문면 대응, CLAUDE.md
  step 7 형식)로 보고한다. 억지 저작·"보강 삼아 정의문 손대기"는 하지 않는다 — 이미 land된
  노드의 definition 수정은 문면 결정이라 별도 브리프 소관이고, cap 여유(973자=243 tok,
  260까지 67자)를 소모한다.
- 도구층/온톨로지층 경계 판정 근거는 **inspection 판정문의 스코핑 문장**을 그대로 쓴다
  (여기선 §6.3 "평면별 원자 단위 읽기 응답"이 유일한 암묵 요소인데 inspection이 도구층으로
  귀속시킨 항목이라 GAP 아님).
