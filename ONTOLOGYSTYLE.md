# ONTOLOGYSTYLE.md

> **이송 표기 (2026-09)**: 일반 원칙(3대 실패 모드와 방어선 d-0014, 토큰 예산
> d-0016, 형식 저장·좁은 읽기 d-0013)은 agentic-knowledge-base의 결정 청크로
> 이송되었다. 이 문서는 `ho:` TTL 저작의 **운영 규칙**만 담으며,
> harness-functional(TBox·shapes)과 harness-concrete(abox·레시피) 양쪽에
> 적용된다. abox 관련 절의 파일 경로는 harness-concrete 기준으로 읽는다.

이 온톨로지 스타일은 노드 저작(authoring)·composition 시, 매 세션 시작 시 읽는다.
코드 스타일 문서 `CODESTYLE.md`(구현 repo)의 온톨로지판이다 — 그쪽이 소스 코드의
단일 진실 공급원이라면, 이 문서는 `ontology/` TTL 저작의 단일 진실 공급원이다.

## 1. 공통 철학 (표현 형식 무관)

목표는 코드 스타일과 같다: **일관성과 가독성**. 다른 사람(그리고 다음 세션의 agent)이
그래프를 보고 빠르게 이해하고, 무엇을 재사용해야 할지 알 수 있어야 한다.

- **[지킴]** 일관성이 최우선. 한 파일·한 abox 안에서 스타일을 섞지 않는다. 기존
  `ontology/abox/*.ttl`의 지역 컨벤션이 있으면 그것을 따른다.
- **[지킴]** 노드는 자기설명적으로. 좋은 `skos:prefLabel`과 `skos:definition`이 주석보다
  낫다. definition은 "무엇을 하는 노드인가"가 아니라 **"왜 존재하고 언제 고르는가"**를 적는다.
- **[지킴]** 노드는 작고 **단일 책임**. 한 `SystemPrompt` = 한 페르소나, 한 `Guardrail`
  = 한 정책, 한 `Tool` = 한 capability. 여러 정책·페르소나를 한 노드에 섞으면 재사용·검색·
  예산 계산이 모두 나빠진다 (구현판의 "함수는 작고 한 가지에 집중"과 같은 규칙).
- **[지킴]** 중복 대신 재사용. 새 노드를 만들기 전에 `python3 tools/retrieve.py "<개념>"`으로
  같은 것이 이미 있는지 찾는다. 같은 뜻의 노드를 둘 만드는 것이 이 repo가 막으려는 drift다.
- **[권장]** 영리하거나 특이한 모델링을 경계한다. "TBox가 금지하지 않았다"가 "써도 된다"는
  아니다. 등록된 관용 패턴(seed abox)을 먼저 따른다.
- **[지킴]** 매직 IRI·매직 문자열 금지. `ho:maturity` 값은 `draft | reviewed | stable |
  deprecated` 넷만. 태그·capability·domain은 등록된 individual만 가리킨다.
- **[지킴]** 들여쓰기는 **스페이스만**, 4칸. 탭을 쓰지 않는다.
- **[지킴]** `skos:prefLabel`은 한 줄. 프레디킷이 여럿이면 `;`로 끊어 줄바꿈한다(§4).

---

## 1a. 강인성 — 연결성 (anti-orphan)

`ontology/`에서 **고립 노드(orphan)는 예외가 아니라 build failure**다. `validate.py`의
SHACL 연결성 shape + 전역 reachability BFS가 이를 강제한다. (설계 원칙은
agentic-knowledge-base 청크 d-0014 "3대 실패 모드와 방어선" 참조.)

- **[지킴]** 새 노드는 **같은 커밋 안에서** 그래프에 연결한다. 나중에 잇겠다며 뜬 노드를
  남기지 않는다 — reachability BFS가 island로 잡는다.
- **[지킴]** 모든 `HarnessComponent`는 ≥1개 `Harness`에서 `hasComponent`(또는 하위
  프로퍼티: `hasSystemPrompt`/`usesTool`/…)로 참조돼야 한다.
- **[지킴]** 모든 `Task`는 `addressedBy`(또는 `addressesTask`) 되거나 task taxonomy 안에
  있어야 한다. 모든 `Capability`는 `required` 또는 `provided` 돼야 한다. 모든 `Concept`는
  무언가를 `tagged` 하거나 SKOS 계층(`skos:broader`/`topConceptOf`)에 걸려 있어야 한다.
- **[지킴]** **capability 짝 맞춤**: harness가 `requiresCapability` 하는 것은 반드시 그
  harness의 컴포넌트 하나가 `providesCapability` 해야 한다. "연결됐지만 build 불가"한 harness를
  만들지 않는다 (구현판의 "I/O 반환값 무시 금지"에 대응 — 미충족을 무음으로 넘기지 않는다).
- **[권장]** 새 harness는 `ho:derivedFrom`으로 출처(템플릿)를 남긴다 — provenance는
  손실 내성의 온톨로지판(어디서 왔는지 복원 가능).

---

## 1b. 강인성 — 어휘 통제 (anti-drift)

의미가 조용히 갈라지는 것(drift)을 손실만큼 정상 위험으로 다룬다. TBox와 SKOS 통제
어휘가 방어선이다. (원칙: agentic-knowledge-base 청크 d-0014.)

- **[지킴]** **TBox가 유일한 어휘**다. 새 `ho:` 클래스·프로퍼티를 발명하지 않는다. 기존
  클래스/프로퍼티/`ho:Concept`를 재사용한다. 근사 동의어 클래스나 untyped edge를 만드는
  것이 바로 이 repo가 막는 drift다 (구현판의 terminology 규칙과 동일한 취지).
- **[지킴]** `skos:prefLabel`은 **필수이고 클래스 안에서 유일**하다(`validate.py` 중복 검사).
  동의어는 새 노드가 아니라 `skos:altLabel`로 붙인다 — "RAG"와 "Document retrieval"은 한
  노드의 pref/alt이지 두 노드가 아니다.
- **[지킴]** edge는 **typed** 하게. SHACL `sh:class`가 range를 강제하므로 엉뚱한 타입을
  가리키는 edge를 만들지 않는다. 임의 `rdf:Property`로 관계를 급조하지 않는다.
- **[지킴]** 새 `ho:Concept`가 정말 필요하면 **같은 커밋에서** `skos:broader` 부모에 걸거나
  최소 하나를 `tagged` 하게 한다 — 안 그러면 orphan으로 잡힌다.
- **[권장]** label·definition의 언어는 **영어 용어 기반**. 프로젝트 도메인 용어를 자체
  생성하기 전에 업계 표준 용어(ReAct, plan-execute, RAG 등)를 먼저 쓴다.

---

## 1c. 강인성 — 예산 (anti-rot)

그래프는 커져도 agent가 읽는 context는 유계여야 한다. `retrieve.py`의 예산 상한이 방어선
이므로, 노드는 **예산 계산이 정확하도록** 저작한다. (원칙: agentic-knowledge-base 청크 d-0013·d-0016.)

- **[지킴]** **텍스트를 지닌 노드에는 `ho:tokenEstimate`를 반드시 붙인다**
  (`promptText`가 있는 SystemPrompt/Instruction/Guardrail/Example, 그리고 Tool/Workflow).
  빠지면 projection 예산이 부정확해져 context rot 방어가 샌다. 이 규칙이 `ho:tokenEstimate`의
  **적용 범위 단일 기준**이다(다른 문서가 "텍스트를 지닌 모든 노드"처럼 넓게 적더라도 이 범위로
  읽는다).
- **[지킴]** `ho:observedTokenVolume`(`ho:AreaOfObservation`의 런타임 관측량, §3)은 이
  `tokenEstimate` 규칙과 **별개 축**이다 — projection 비용이 아니라 관측량이므로 위 필수 대상에
  포함되지 않는다(둘의 구분은 §3 참조).
- **[지킴]** **한 노드의 서술 텍스트 합은 260 token을 넘지 않는다** — 측정은 그 노드의
  `ho:promptText` + `skos:definition` **전 값의 문자수 합 ÷ 4**(`ho:tokenEstimate`와 같은
  chars/4 산정이라 이 절의 token 단위가 하나로 통일되고, 외부 tokenizer에 의존하지 않아
  결정론적이다). 실질 서술 노드의 **목표 대역은 130–260 token**이다 — 검색 정밀도 최적대가
  100–200 word(≈130–260 BPE token)라는 실증에서 온 값이며
  (`docs/feedback/inquiries/annotation-tooling-research.md` §5),
  **하한 130은 권고**이고 린터(`tools/lint_uniformity.py`)는
  **상한 260만 기계적으로 강제**한다. 초과는 그 노드가 두 가지 이상을 말하고 있다는 **단일
  책임(§1) 위반 신호**이므로, 분해(`WorkflowStep`/`PromptSection`류로 쪼개기)하거나 같은
  대상의 대안 서술이면 별도 노드로 분리한다(대안 서술을 상호 연결하는 술어는
  `ho:hasLink` + `id:kind-alternative` 가중 링크 — §3 5번 관계 그룹). 적용 범위는 **abox 개체뿐**이다 — TBox 스키마
  문서(축·axiom을 설명하는 기계 대상 산문)는 retrieval 단위로 projection되지 않으므로 제외한다.
- **[지킴]** **저장된 그래프 전체(stored graph = `ontology/**`의 두 층)를 context에 로드하지
  않는다.** 요청 처리·composition은 항상 `python3 tools/retrieve.py "<request>"`가 준
  pack에서 시작한다 (CLAUDE.md 골든룰 1).
- **[권장]** `promptText`는 최소·자기완결로. 긴 프롬프트를 한 노드에 몰지 말고 재사용
  가능한 `Instruction`으로 쪼갠다 — 예산 admission이 노드 단위로 걸리기 때문.
- **[권장]** 예외: 하네스의 **주제가 이 온톨로지(`ho:`) 자신**인 techdoc류에서는 지시문·
  템플릿 본문에 `ho:` 용어를 그대로 써도 된다 — 산출물 자기완결 계약의 명시적 예외(그 용어 자체가 산출물의 주제어이므로).
- **[권장]** `ho:salience`(0..1)로 중요도 prior를 준다 — 자주 template이 되는 base harness는
  높게, 특수 변형은 낮게. 소비자(retrieval 랭킹) 없는 값을 과하게 붙이지 않는다(YAGNI).

---

## 1d. 주석·definition 표준

- **[지킴]** `skos:definition`/`rdfs:comment`는 **그래프가 스스로 못 보여주는 것만** 적는다:
  선택의 이유(언제 이 노드를 고르나·기각한 대안), 제약(latency/cost/privacy), 불변식.
- **[지킴]** 다음은 쓰지 않는다: label 재진술("Coding harness는 coding harness다"), 수정
  이력·리뷰 대화성 코멘트, 주석 처리된 죽은 트리플. (발견 시 삭제 대상.)
- **[지킴]** TTL 파일 상단 배너는 그 abox의 역할 요약 1–3줄 + 공개 계약(어떤 harness군을
  담는지)만. 중앙 core 부품 파일(`ontology/abox/core/*.ttl`)의 배너 스타일(`####`, `#====`)을 따른다.
- **[지킴]** 언어는 **한글 설명 + 용어는 영어**(CLAUDE 계열 언어 규칙). 단 `skos:prefLabel`·
  `definition` 같은 그래프 데이터 값은 **영어**로 쓴다(seed abox와 일관 — 검색 대상 텍스트).

---

## 2. 개체(individual) 네이밍

seed abox의 접두사 규약을 그대로 따른다. IRI는 `id:` 네임스페이스, 소문자 kebab-case,
`<kind>-<slug>` 꼴.

### 2a. 도메인 서브네임스페이스 (federation, D3)

개체 IRI는 **`https://harness-ontology.dev/id/<domain>/<slug>`** 꼴로 민팅한다
(`docs/federation-design.md` D3). `<domain>`은 repo/기여자 스코프를 나타내는 짧은
kebab 세그먼트로, 독립 repo 간 slug 충돌·orphan을 막는다.

- **[지킴]** `core`는 **중앙 온톨로지 전용 예약어**다. 중앙 repo의 개체만 `.../id/core/`.
- **[지킴]** 기여자/외부 data repo는 충돌 위험이 낮은 자기 도메인 세그먼트를 고른다
  (프로젝트·조직명 등, 예: `lpranging`, `acme-support`).
- **[지킴]** Turtle에서는 **prefix 바인딩으로만** 표현해 노드 본문을 그대로 둔다: 자기
  도메인은 `@prefix id: <.../id/<domain>/> .`로 묶고 `id:<slug>`로 쓴다. 다른 도메인의
  노드를 참조할 때는 그 도메인용 prefix를 하나 더 선언해 쓴다 — 중앙 노드 참조는
  `@prefix core: <.../id/core/> .` + `core:<slug>` (seed의 개체를 재사용). 두 prefix가
  같은 네임스페이스를 가리키면 union에서 같은 IRI로 해석돼 cross-domain edge가 성립한다.
- **[지킴]** 개체(entity) IRI와 **온톨로지(document) IRI**는 다르다. 데이터 파일이 담기는
  문서 IRI는 `.../data/<domain>`이며 `owl:imports`/catalog가 이걸 쓴다(§4 참조). 개체 IRI
  `.../id/<domain>/`와 혼동하지 않는다(표준 OWL 관행).

| 종류 | 접두사 | 예 |
|---|---|---|
| Domain | `dom-` | `id:dom-coding` |
| Task | `task-` | `id:task-bugfix` |
| Capability | `cap-` | `id:cap-codeexec` |
| Contract | `ct-` | `id:ct-well-formed-skill-heading` |
| Concept | `c-` | `id:c-softeng` |
| Link | `link-` | `id:link-chan-peer-overlap-pat-peer-mesh` |
| LinkKind | `kind-` | `id:kind-overlap` |
| DesignPattern | `pat-` | `id:pat-react` |
| ExecutionMode | `mode-` | `id:mode-sub-agents` |
| AutonomyTier | `tier-` | `id:tier-bounded-autonomy` |
| Constraint | `con-` | `id:con-lowlatency` |
| ModelConfig | `mc-` | `id:mc-opus` |
| Tool | `tool-` | `id:tool-shell` |
| Candidate | `cand-` | `id:cand-greeter-stable` |
| Workflow | `wf-` | `id:wf-react` |
| WorkflowStep | `wfs-` | `id:wfs-plan-dispatch` |
| Deliverable | `dlv-` | `id:dlv-dispatch-brief` |
| Guardrail | `gr-` | `id:gr-cite` |
| Hook | `hook-` | `id:hook-post-tool-use` |
| SystemPrompt | `sp-` | `id:sp-coding` |
| PromptSection | `ps-` | `id:ps-methodical-decisions` |
| Instruction | `ins-` | `id:ins-check-docs` |
| Example | `ex-` | `id:ex-…` |
| Role | `role-` | `id:role-orchestrator` |
| Channel | `chan-` | `id:chan-dispatch` |
| Memory | `mem-` | `id:mem-firmware` |
| TestScenario | `scn-` | `id:scn-compose-smoke` |
| FailurePolicy | `fp-` | `id:fp-validation-fail` |
| AssemblySection | `as-` | `id:as-overview` |
| Harness | `h-` | `id:h-coding` |
| Agent | `agent-` | `id:agent-orchestrator` |
| ObservationSpace | `os-` | `id:os-orchestrator` |
| AreaOfInterest | `aoi-` | `id:aoi-orchestrator` |
| AreaOfObservation | `oa-` | `id:oa-orchestrator-external` |
| OperatingEnvelope | `oe-` | `id:oe-coding` |
| EnvelopeStatement | `es-` | `id:es-coding-write-scope` |
| EnvelopeRule | `er-` | `id:er-…` |
| EnvironmentSpace / GlobalState / ConceptScheme | (singleton, no prefix) | `id:env-space` · `id:global-state` · `id:scheme` |

- **[지킴]** slug은 **의미가 드러나는 full word**. 자체 약어를 만들지 않는다(코드 식별자
  규칙과 동일). 관용 축약(`mc`=model config 등 접두사)만 표에 등록된 대로 쓴다.
- **[지킴]** ID는 재사용하지 않는다. 폐기(deprecate)는 그래프에 deprecated 노드로
  남기지 않고 **제거한다** — 추적성은 git 이력·docs에 둔다(그래프는 현재 유효한 부품만).

---

## 3. 프레디킷 순서 (한 노드 블록)

가독성을 위해 프레디킷을 **일정한 순서**로 나열한다(seed abox 관례):

1. `a`(rdf:type)
2. `skos:prefLabel` → `skos:altLabel`
3. `skos:definition`
4. 타게팅·조립: `ho:targetsDomain` → `ho:addressesTask` → `ho:hasSystemPrompt` →
   `ho:usesTool` → `ho:hasWorkflow` → `ho:hasGuardrail` → `ho:usesModel` →
   `ho:hasInstruction` → `ho:hasExample` →
   `ho:hasRole` → `ho:hasChannel` → `ho:hasMemory` → `ho:hasAgent` →
   `ho:hasGlobalState` → `ho:hasAssemblySection` → `ho:hasHook` →
   `ho:hasTestScenario` → `ho:hasFailurePolicy` → `ho:hasEnvelope`
5. `ho:appliesPattern` → `ho:hasExecutionMode` → `ho:autonomyTier` →
   `ho:environmentFidelity`(staged-rollout 환경 선언, Harness) →
   `ho:requiresCapability` / `ho:providesCapability` → `ho:constrainedBy` →
   `ho:dependsOn` → `ho:specializes` / `ho:derivedFrom` → `ho:hasLink`
6. `ho:tagged`
7. 데이터: `ho:promptText` → `ho:observedTokenVolume` → `ho:tokenEstimate` →
   `ho:salience` → `ho:maturity`

- **[권장]** 클래스 고유 판별 데이터 프레디킷(예: `ho:scenarioKind`·`ho:hookEvent`)은 5~6번
  뒤·7번(공통 데이터) 앞에 모아 둔다. **한 축의 read/write 짝은 붙여 쓴다** — `ho:Memory`는
  `ho:memoryReadTiming` → `ho:memoryWriteTiming`(생산 시점 라우팅) → `ho:memoryPersistence`
  → `ho:memoryReadScope` → `ho:memoryActivationCondition` → `ho:retrievalPolicy`(선별 읽기의
  랭킹 규칙, 자유문) 순. `ho:Guardrail`의 게이트 판별 짝은 `ho:attachesAt`(어느 지점에
  걸리는가 — attachment-point 개념 참조) → `ho:approvalScope`(승인 게이트가 무엇을 덮는가 —
  닫힌 값; tier의 `ho:approvalUnit`과 값 어휘 분리) 순으로 `ho:promptText` 앞에 붙여 쓴다.
- **[지킴]** `ho:Concept` 블록은 SKOS 관계(`skos:broader`/`topConceptOf`/`related`) **뒤 맨 끝**에
  `ho:conceptFacet` 하나를 둔다 — 그 term이 **무엇에 대한 축**인지 선언하는 닫힌 값
  (`anatomy` | `quality` | `method` | `domain` | `scope`)이다. **중앙 `core` 도메인의 Concept은
  필수**, 외부 data repo의 로컬 개념은 권장이다: shapes는 값 집합만 강제하고 **존재는 강제하지
  않는다**(같은 shapes가 연합 CI에서 recipe 개체까지 검증하므로 minCount는 하위 repo를 깨뜨린다).
  중앙 커버리지는 `tools/lint_uniformity.py`가 `id/core/` 스코프로 지킨다.
- **[지킴]** facet 값은 **예시 유사성이 아니라 판정 규칙**으로 정한다. 그 term이 **무엇의
  이름인가**를 이 순서로 묻는다: ① 하네스가 무엇으로 조립·구성되는가(부위 또는 구조 축) →
  `anatomy`, ② 작업이 다루는 주제 분야인가 → `domain`, ③ 내용 없이 **어느 구성 형태에 속하는지만**
  말하는가 → `scope`, ④ 하네스 전체가 갖췄다고 판정되는 성질인가("얼마나 갖췄나"를 물을 수
  있는가) → `quality`, ⑤ 에이전트·저자에게 **명령형으로 되쓸 수 있는 행동 규칙**인가 → `method`.
  **먼저 맞는 것이 답**이되, 여럿이 맞고 `skos:broader` 부모의 facet이 그중에 있으면 **부모 것을
  택한다**(판단 하나가 기존 가지를 쪼개지 않게). 부모의 facet 질문을 **전혀** 만족하지 못할
  때만 재부모화한다(anatomy 부모 아래의 실천 term이 그 경우 — 이때 원 부모와의 연관은
  `skos:related`로 남겨 발견성을 유지한다). `scope` 부모는 내용을 말하지 않으므로 자식의 facet을
  구속하지 않는다. **facet으로 깊이를 늘리지 않는다** — 개념 노드로 만들어 루트를 씌우면
  `skos:broader` 검색 가중(0.5) 때문에 개념 간 발견성이 반감된다(근거:
  `docs/feedback/inquiries/b-wave-facet-design.md` §3c).
- **[권장]** 운용 범위(operating envelope)·자율성 등급 노드 블록은 **범위를 읽는 순서**대로
  쓴다. `ho:OperatingEnvelope`는 `ho:envelopeDefault`(닫힘 자세) → `ho:hasEnvelopeStatement`
  → `ho:hasEnvelopeRule` → `ho:onEnvelopeExit`(이탈 시 FailurePolicy) 순,
  `ho:EnvelopeStatement`는 `ho:envelopeAttribute`(무엇을) → `ho:envelopeVerdict` →
  `ho:envelopeClosure` → `ho:envelopeValueType` → `ho:envelopeThreshold` →
  `ho:envelopeObservable`(**무엇으로 판정하는가** — 필수) 순, `ho:EnvelopeRule`은
  `ho:ruleCondition` → `ho:ruleEffect` 순. `ho:AutonomyTier`의 다섯 슬롯은 책임 배분 순서
  `ho:executionOwner` → `ho:oversightOwner` → `ho:fallbackOwner` → `ho:envelopeBinding`
  → `ho:approvalUnit`로 고정한다(누가 실행/감독/인계하고, 범위에 어떻게 묶이며, 승인 단위는
  무엇인가). 범위 선언은 **권한**이지 **능력**이 아니므로 `ho:requiresCapability`/
  `ho:providesCapability`로 대신 표현하지 않는다.
- **[권장]** 같은 프레디킷의 여러 값은 콤마로 한 줄에(`ho:usesTool id:a, id:b`), 길면
  콤마 뒤 줄바꿈해 정렬.
- **[지킴]** **`ho:tokenEstimate`와 `ho:observedTokenVolume`을 섞지 않는다.**
  `ho:tokenEstimate`는 **그 노드 자신의 텍스트를 pack에 실을 비용**(projection 예산의 단위,
  `retrieve.py`·MANIFEST 소비)이고, `ho:observedTokenVolume`은 **`ho:AreaOfObservation`이
  서술하는 런타임 관측량**(에이전트가 실제로 소비하는 입력량, `ho:cognitiveCapacity` 적합성
  리뷰용)이다. 관측량을 `tokenEstimate`에 적으면 그 노드가 단독으로 기본 예산을 넘겨
  **팩이 조용히 잘린다**(실제 발생한 결함). 진단 불변식: `ho:tokenEstimate`가
  `retrieve.py`의 기본 예산을 넘는 노드는 **0개**여야 한다.

---

## 4. Turtle 포맷

- **[지킴]** prefix 블록은 파일 상단에, seed 순서(`ho`, `id`, `owl`, `rdf`, `rdfs`, `xsd`,
  `skos`, `dct`)를 따른다. `id:`는 abox에만. 다른 도메인 참조용 prefix(예: `core:`)는
  `id:` 바로 다음에 둔다(둘 다 개체 네임스페이스, §2a).
- **[지킴]** 각 abox 파일은 상단 prefix 블록 다음에 자기 **`owl:Ontology` 헤더**를 선언한다
  (문서 IRI `.../data/<domain>`, `owl:imports`로 중앙 TBox `.../schema` — 다른 도메인 노드를
  참조하면 그 data 문서 IRI도 import). federation loader가 이 imports를 catalog로 해석해
  union을 조립한다(`docs/federation-design.md` D1). shapes는 import하지 않는다(검증 전용).
- **[지킴]** 한 도메인의 data를 **여러 문서로 쪼개도 된다** — 중앙 `core`는 컴포넌트 타입별로
  분할해 담는다(중립 부품 라이브러리). 각 per-type 문서는 자기 `owl:Ontology` 헤더(문서 IRI
  `.../data/<domain>/<type>`, 예: `.../data/core/guardrails`)를 갖고 **중앙 TBox만** import한다.
  cross-unit 참조(harness가 자기 Tool/Guardrail을 지목하는 등)는 각 unit을 서로 import하지 않고
  **root union에서 해석**한다(root `owl:imports`가 모든 per-type unit을 나열하고 catalog가
  IRI→파일을 매핑) — 한 방식으로 일관되게 한다. 개체 IRI는 문서 위치와 무관하게 그대로
  `.../id/core/<slug>`에 남는다(파일만 옮김).
- **[지킴]** 파일은 **DA-4 상위 taxonomy 그룹 디렉토리**에 물리적으로 놓는다 —
  `ontology/abox/core/<group>/<type>.ttl`. 그룹은 담는 타입의 상위계층을 반영한다:
  `behavioral/`(system-prompts·guardrails) · `operational/`(tools) · `substrate/`(model-configs) ·
  `organization/`(roles·channels) · `process/`(workflows) · `vocab/`(concepts) ·
  `spec/`(capabilities·patterns·constraints·domains-tasks) · `observational/`(observation) ·
  `state/`(memory) · `information-space/`(information-space) · `verification/`(verification —
  test-scenarios·failure-policies) · `assembly/`(assembly-sections) ·
  `wholes/`(harnesses). **논리 IRI는 서브디렉토리와 무관하게 `.../data/core/<type>`로 유지**되고
  (파일 이동은 경로만 바뀜) **catalog(`catalog-v001.xml`)가 IRI→파일경로를 매핑**하므로 tool엔
  투명하다 — 디렉토리는 사람이 읽는 조직화일 뿐이다. 중앙 individual이 없는 타입(예:
  `ho:Candidate`·`ho:Contract`·`ho:Instruction` — 실개체가 recipe data repo에만 있다)은 파일을
  만들지 않는다(TBox 클래스만 존재). 그 타입만 담을 그룹 디렉토리도 마찬가지로 만들지 않는다.
  grab-bag 파일은 타입별로 split해
  각 타입을 자기 그룹에 둔다(예: roles.ttl→roles+observation+memory).
- **[지킴]** 스키마(클래스·프로퍼티)는 `tbox/`, 개체는 `abox/`. abox에서 새 클래스·프로퍼티를
  선언하지 않는다. 용어상 **TBox+shapes = ontology 층, ABox = knowledge graph 층**이며
  `ontology/`는 두 층을 함께 담는 저장소 디렉토리다(`README.md`·`docs/federation-design.md` — 2026-09 재배치로 두 층이 harness-functional/harness-concrete로 갈라졌다) — 이 문서의
  나머지 `ontology/…` 표기는 그 경로를 가리킨다.
- **[권장]** 짧은 노드(레이블만)는 **한 줄**로:
  `id:dom-coding a ho:Domain ; skos:prefLabel "Software coding" ; ho:salience 0.9 .`
- **[권장]** 텍스트·프레디킷이 여럿인 노드는 **여러 줄**, 프레디킷마다 4칸 들여쓰기:
  ```turtle
  id:sp-coding a ho:SystemPrompt ;
      skos:prefLabel "Coding agent persona" ;
      ho:promptText "You are a meticulous software engineer. ..." ;
      ho:tokenEstimate 90 ; ho:maturity "stable" .
  ```
- **[지킴]** 마지막 트리플은 `.`로 닫는다. 섹션은 seed의 `#===== ... =====` 배너로 구분한다.
- **[권장]** 한 줄이 과도하게 길면(대략 100자↑) 끊는다. `promptText`처럼 본질적으로 긴
  리터럴은 예외 — 한 리터럴을 인위로 쪼개지 않는다.

---

## 셀프체크

작업 완료 전 반드시 실행한다. `validate.py`는 이 스타일의 강제 항목(1a·1b·1c)을 기계적으로
검사하는 게이트다 — 통과가 곧 "연결됨·타입 정합·drift 없음"의 증거다.

```bash
python3 tools/validate.py          # 반드시 PASS. FAIL이면 shape가 아니라 온톨로지를 고친다.
python3 tools/retrieve.py "<새 노드가 답할 request>"   # 새 노드가 실제로 검색되는지 확인
```

> 환경 주의: 이 저장소의 도구는 `rdflib`/`pyshacl`/`owlrl`가 있는 인터프리터로 실행해야
> 한다. 셸 기본 `python3`에 없으면 그 셋이 설치된 인터프리터로 실행한다(예: `/usr/bin/python3`).

규칙을 어길 땐 **[지킴]/[권장]** 항목에 한해 그 노드의 `rdfs:comment`나 커밋 메시지에 사유를
한 문장 남긴다 — 말없이 머지하지 않는다.
