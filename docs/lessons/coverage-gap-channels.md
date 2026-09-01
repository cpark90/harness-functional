# Lesson — 반영 커버리지 갭: communication channels / skills 누락

## 무엇을 놓쳤나

lpranging harness를 온톨로지로 반영할 때, 역할별 **communication channel**(agent↔user,
orchestrator↔inspection, dispatch)과 `.claude/skills`·commands 같은 구조 요소가 슬롯에
반영되지 않았다. 이 갭은 명시적으로 요청된 coverage audit에서야 드러났다.

## 왜 (root cause)

- 반영이 **assembly-driven** 였다: 이미 알고 있는 part-type 고정 집합
  (SystemPrompt/Workflow/Guardrail/Tool/Pattern/Concept/Capability/Domain/Task, 이후
  Role/impl/scaffold)에서 조립했을 뿐, **실제 소스 harness의 모든 요소를 온톨로지 슬롯에
  1:1로 매핑하는 source-driven 완전열거가 없었다.**
- 그래서 **기존 어휘가 없는 구조 요소는 보이지 않았다**(channel; skills/commands). 존재하지
  않는 슬롯으로는 추출할 수 없고, 없는 슬롯을 발견하도록 강제하는 장치도 없었다.
- **커버리지/완전성이 게이트가 아니었다**: `validate.py`는 그래프 정합성(well-formedness)만
  검사하고 source-fidelity는 검사하지 않는다.

## 예방 (두 축)

1. **중립 온톨로지 guardrail** — `id:gr-structural-coverage`("Structural coverage
   completeness"). 개체는 **harness-concrete**의
   `ontology/abox/core/behavioral/guardrails.ttl`에 있다. 규칙: 시스템을 모델로 반영할 때
   소스 구조 요소를 빠짐없이 열거해 각각을 표현에 매핑하고, 어휘가 없는 요소는 조용히
   건너뛰지 말고 **schema 확장 신호**로 본다. done 선언 전에 소스 대비 커버리지를 검증한다.
   `id:h-multiagent`의 `ho:hasGuardrail`에 배선. `gr-traceability`(기록 불변·provenance)·
   `gr-no-arbitrary-decision`(미결 판단 에스컬레이션)과는 구분되는 **반영 완전성** 정책이다.
2. **프로세스 게이트** — 조립 워크플로의 마지막 단계로 **source→representation coverage
   audit(vnv dispatch)** 를 둔다. `validate.py` 초록만으로는 done이 아니며, 표현되지 않은
   harness-구조적 요소(role/tool/guardrail/**channel**/standard)는 GAP, 담을 어휘 범주가
   없으면 TBox 확장을 트리거한다. (2026-09 이송: 이 워크플로 규범의 원본은 이제
   agentic-knowledge-base의 결정 청크 **d-0015**(조립 워크플로 + coverage audit)이다 —
   당시 이 항목이 가리킨 CLAUDE.md의 "Composing a new harness" 절은 남아 있지 않다.)

## 일반 원칙

**어휘가 없는 소스 요소를 만나면 = schema를 확장하라는 신호이지, 조용히 건너뛰라는 신호가
아니다.** 커버리지는 그래프 정합성과 별개의 축이며, 소스 대비로만 검증된다.
