# VERIFY — `tools/lint_uniformity.py` (Q1 authoring-uniformity linter)

판정: **PASS (with 2 non-blocking notes)**. CI 게이트로 쓸 만한 신뢰도. developer
self-report 없이 재실행 + ONTOLOGYSTYLE 원문 대조 + teeth 독립 재현으로 확인.

- 대상: `tools/lint_uniformity.py` (git `??` untracked, 미커밋 신규 파일)
- 인터프리터: `/usr/bin/python3` (셸 기본 python3엔 rdflib 없음)
- 기준 문서: `ONTOLOGYSTYLE.md` §1c(tokenEstimate 범위)·§1d(언어·검색데이터)·§2(접두사 표)·§3(observedTokenVolume 별개 축)
- 관측 그래프: reasoned union 6546 triples (post OWL RL)

## Gate 1 — baseline 재현 (PASS)

`/usr/bin/python3 tools/lint_uniformity.py` → 5축 모두 ✓, `PASS`, `EXIT=0` 재현.
C-0 감사 판정("in-scope 위반 0")과 일치. maturity scope는 코드에 하드코딩된 게 아니라
런타임에 shapes에서 파생되어 출력에 `[scope: Agent, AreaOfInterest, AreaOfObservation,
FailurePolicy, GlobalState, Hook, Memory, ObservationSpace, TestScenario]`로 표시됨.
definition scope는 `[scope: Memory]`.

## Gate 2 — 규칙 충실성 (원문 대조, PASS)

### §1c tokenEstimate 6클래스 — 정확히 일치
`TOKENESTIMATE_CLASSES = (SystemPrompt, Instruction, Guardrail, Example, Tool, Workflow)`.
§1c 원문 "promptText가 있는 SystemPrompt/Instruction/Guardrail/Example, 그리고
Tool/Workflow"와 1:1. 과대/과소 없음. PromptSection/WorkflowStep/AreaOfObservation
**제외가 옳음** — 이들의 런타임 크기는 §3 `ho:observedTokenVolume`(별개 축, projection
비용 아님)이며 §1c 필수 대상이 아니다. 코드 주석(line 24-27)이 이 근거를 정확히 인용.

### §2 접두사 PREFIX_MAP — 표와 1:1 (ConceptScheme만 미포함, 아래 Note-1)
§2 표의 비-싱글턴 31개 클래스 전부가 `PREFIX_MAP`에 정확한 접두사로 존재
(Domain dom-, Task task-, … AreaOfObservation oa-). 누락 클래스·오매핑 0.
싱글턴 `SINGLETON_NAMES`: env-space, global-state 존재.

### §1d 언어 — 검색 대상 3술어만, prose 제외 (옳음)
`_SEARCHABLE_PREDICATES = (prefLabel, definition, altLabel)`. §1d "skos:prefLabel·
definition 같은 그래프 데이터 값은 영어"와 정합. `rdfs:comment`/`promptText`는
**의도적으로 미검사** — §1d가 한글 산문은 rdfs:comment에 두라고 명시하므로 이를
검사에서 빼는 것이 정확(오탐 방지). altLabel 추가는 검색 대상 SKOS label의 합리적 상위집합.
Hangul 정규식은 음절+자모+호환자모+확장 블록 커버.

## Gate 3 — shapes-파생 scope 정당성 (독립 재현, PASS)

`_derive_required_classes`가 shapes에서 `sh:targetClass`+`sh:path`+`minCount≥1`로
파생하는 로직을 독립 스크립트로 재현:
- maturity minCount≥1 targetClass 실측 = **정확히 9개** (Agent, AreaOfInterest,
  AreaOfObservation, FailurePolicy, GlobalState, Hook, Memory, ObservationSpace,
  TestScenario) — 린터 출력과 동일.
- definition minCount≥1 targetClass 실측 = **Memory 1개** — 린터 출력과 동일.
- `sh:node` 간접참조 = 0 (파생이 nested shape에 의해 우회될 위험 없음).

**오탐 원천 차단 확인**: SystemPrompt/Guardrail/Tool/Harness/Role/ModelConfig 등
핵심 클래스는 maturity minCount가 shapes에 **없어** scope에서 자동 제외 → SpecConcept
계열 maturity 면제가 자동 존중됨. Guardrail은 definition minCount가 없어(본문을
promptText로 지님) definition scope에서 자동 제외 → 면제 자동 존중. 하드코딩 아님이므로
shapes가 바뀌면 scope도 따라감(drift 불가).

## Gate 4 — teeth + 비-vacuous scope (독립 재현, PASS)

**비-vacuous (각 축 대상 노드 수 >0)**:
| 축 | in-scope 대상 |
|---|---|
| tokenEstimate | 55 nodes (SystemPrompt 4 + Instruction 1 + Guardrail 39 + Tool + Workflow …) |
| prefix | 245 id: nodes |
| language | 546 searchable literals |
| maturity | 43 nodes (9 클래스) |
| definition | 3 nodes (Memory) |

어느 축도 scope가 비어 무조건 통과하는 vacuous-pass가 아님.

**teeth (in-memory 그래프에 1건 주입 → 해당 축만 1건)**:
- tokenEstimate: `tool-shell`의 tokenEstimate 제거 → 1건
- prefix: `id:WRONG-guardrail`(Guardrail 타입) 주입 → 1건 (leaf-type 해석으로 gr- 기대)
- language: 임의 노드 prefLabel에 "한글 라벨" 주입 → 1건
- maturity: `hook-session-start`의 maturity 제거 → 1건
- definition: `mem-firmware`의 definition 제거 → 1건

**cross-axis 격리**: tokenEstimate만 교란 시 `token=1 prefix=0 lang=0 mat=0 def=0` —
축 간 누출 없음.

## Gate 5 — validate.py 무영향 (PASS)

`/usr/bin/python3 tools/validate.py` → `PASS`, exit 0. `git status --short ontology/`
클린 — 린터는 그래프를 **읽기만** 하며 ontology를 변경하지 않음(모든 teeth는
in-memory 복사본에서 수행). exit code 계약: PASS=0 / FAIL=1 / load 실패=2 → CI 게이트 적합.

## 오탐 위험 / 거짓 통과 위험 판정

- **오탐(정당 노드를 위반으로)**: 현재 0. 다만 Note-2의 latent 벡터 있음.
- **거짓 통과(scope가 좁아 문제 놓침)**: maturity/definition 축은 shapes와 중복이라
  거의 SHACL이 이미 잡음(docstring도 인정). 진짜 teeth는 **축 1/2/3** — 이 셋은 어떤
  shape도 강제하지 않는 축이므로 린터의 고유 가치. token 55 / prefix 245 / lang 546
  대상 규모로 볼 때 좁아서 놓칠 위험 낮음.

## Non-blocking notes (결함 아님, 개선 여지)

**Note-1 (minor, 저커버리지)**: §2 표는 싱글턴 3종(EnvironmentSpace/GlobalState/
**ConceptScheme** = `id:scheme`)을 fixed name으로 명시하나 `SINGLETON_NAMES`엔
env-space/global-state 2종만. ConceptScheme 고정명 "scheme"은 미검사. 단 `id:scheme`은
`skos:ConceptScheme`이라 `INSTANCE_CLASSES` 밖 → `instance_nodes`에 안 잡혀 오탐도
안 남. 잘 알려진 단일 싱글턴이라 drift 위험 낮음. FP 아님.

**Note-2 (minor, latent FP 벡터)**: §1c는 tokenEstimate를 "**promptText가 있는**
SystemPrompt/Instruction/Guardrail/Example (+Tool/Workflow)"로 조건부 스코프하나,
`check_token_estimate`는 이 4클래스 **전 인스턴스에 무조건** tokenEstimate를 요구.
현재 SystemPrompt 4/Instruction 1/Guardrail 39/Example 0 **전부 promptText 보유**(실측
promptText-less = 0)라 오탐 0건. 그러나 shapes는 promptText minCount를 **SystemPrompt만**
강제 → 장차 promptText 없는 Guardrail/Instruction이 저작되면 §1c상 면제인데 린터가
오탐 가능. 현 동작은 무해하며 "Guardrail은 promptText-bodied"라는 규범 강제로 볼 여지도
있음(방어 가능). 정밀 일치를 원하면 4클래스 검사를 `promptText is not None` 조건부로.
Tool/Workflow는 §1c가 무조건이므로 지금대로가 맞음.

## 재현 명령
```
/usr/bin/python3 tools/lint_uniformity.py            # baseline PASS/exit0
/usr/bin/python3 tools/validate.py                   # 무영향 확인 PASS/exit0
```
teeth·scope-count·shapes-파생 재현은 in-memory 스크립트(`lint_uniformity` 모듈 import,
`load_graph(reason=True)` 복사본에 1건 주입 후 각 check 함수 호출)로 수행 — 세션 로그 참조.
