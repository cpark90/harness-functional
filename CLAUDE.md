# CLAUDE.md — working in this repo

This project stores **agent/LLM harnesses** as a formal OWL ontology and
projects request-scoped **context packs** so an agent can compose new harnesses
without orphaned nodes, drift, or context rot. Read `docs/DESIGN.md` once.

## Golden rules

1. **Never load the whole ontology into context to answer a request.** Use
   `python3 tools/retrieve.py "<request>"` and work from the pack it returns.
   That budget cap is the context-rot defense — don't bypass it.
2. **Never hand-edit for meaning without the vocabulary.** New nodes reuse
   existing `ho:` classes/properties and `skos:Concept` tags. Inventing a
   near-synonym class or an untyped edge is exactly the drift this repo
   prevents.
3. **After any change to `ontology/`, run `python3 tools/validate.py`.** It
   must print `PASS`. If it fails, fix the ontology — do not weaken the shapes.

## Environment

`rdflib`, `pyshacl`, `owlrl` are required by the tools. Run them from the repo
root with an interpreter that has those three. If the shell's default `python3`
raises `ModuleNotFoundError: No module named 'rdflib'`, use `/usr/bin/python3`
instead (verified to have them here); the paths below say `python3` for brevity.

## Code / ontology style

`ONTOLOGYSTYLE.md` is the single source of truth for authoring `ontology/` TTL
(naming, predicate order, the anti-orphan / anti-drift / anti-rot [지킴] rules).
Read it at the start of any authoring/composition session, the way a codebase
reads its `CODESTYLE.md`.

## Composing a new harness (the intended workflow)

> **역할 분산 (아래 멀티에이전트 절 기준)**: 이 워크플로는 한 에이전트가 통째로 하지 않는다.
> **orchestrator가 이 단계들을 dispatch brief로 계획**하고 결과를 통합하며, **step 5의 ABox
> 저작은 developer가 dispatch로**, **step 6의 validate는 vnv가** 수행한다. orchestrator는
> ABox를 직접 손으로 저작하지 않는다.

1. `python3 tools/retrieve.py "<request>" --format json` → context pack.
2. Take the top **base-harness candidate** as a template (or a `DesignPattern`
   if none fit).
3. For every `requiresCapability` in scope, bind a component that
   `providesCapability` it. The pack's **"Capability gaps"** lists what's
   missing — fill each by reusing an existing component or authoring a new one.
4. Assemble the harness: 1 `SystemPrompt` + ≥1 `Workflow` + tools + guardrails
   + `ModelConfig`. (These minimums are enforced by `ho:HarnessShape`.)
5. Write it back to `ontology/abox/` as new individuals:
   - give it `skos:prefLabel`, `ho:maturity "draft"`, and `ho:derivedFrom` the
     template
   - set `ho:tokenEstimate` per ONTOLOGYSTYLE §1c's scope — nodes carrying
     `promptText` (SystemPrompt/Instruction/Guardrail/Example) plus Tool/Workflow
     (keeps future projections budget-accurate)
   - tag it with existing `ho:Concept`s so it is discoverable, not orphaned
6. Run `validate.py`. Green means the new harness is connected, well-typed, and
   buildable. Promote `maturity` to `reviewed`/`stable` after review.
7. **Coverage-audit gate (source→representation).** `validate.py`가 초록이어도
   *반영(reflection)* 은 아직 "완료"가 아니다. **소스의 구조 요소를 하나도 빠짐없이
   열거해 각각을 표현에 매핑**하는 coverage audit(vnv dispatch)이 통과해야 done이다:
   모든 소스 구조 요소는 하나의 표현으로 매핑되거나 model 밖으로 두는 **명시적·수용가능한
   사유**를 가져야 한다. 표현되지 않았는데 harness-구조적인 요소(role, tool, guardrail,
   **communication channel**, standard 등)는 반드시 메워야 할 **GAP**이며, 담을 **어휘
   범주 자체가 없다면** 조용히 건너뛰지 말고 **schema(TBox) 확장**을 먼저 트리거한다.
   (`validate.py`는 그래프 정합성만 보고 source-fidelity는 보지 않는다 — 이 게이트가 그 축이다.)

## Adding vocabulary

Prefer an existing `ho:Concept`/`ho:Capability`. If you truly need a new one,
connect it (a `skos:broader` parent or something it tags) in the same commit,
or `validate.py` will flag it as an orphan.

## 에이전트 역할 (multi-agent 하네스)

작업은 역할별 에이전트로 분리한다. 각 에이전트는 cold-start이므로 **역할별 디렉토리 메모리**
`.claude/agent-memory/<role>/`를 세션 시작 시 **읽어** 특화하고, 재사용 지식을 종료 전 그
폴더에 **써서** 축적한다 (자기 역할 폴더에만, 파일 하나 + `MEMORY.md` 한 줄 인덱스, 기존
있으면 갱신). 작성 규약 원본: `.claude/agent-memory/README.md`.

| agent | 역할 | 파일 수정 | git |
|---|---|---|---|
| **orchestrator** (=메인) | **계획·dispatch 전용 — 직접 작업하지 않는다.** 요청을 노드 단위로 분배할 **계획(dispatch brief)만 작성**하고, 저작·판정·조사·적용은 전부 **dispatch로 수행**한다. dispatch 결과를 assemble·통합하고 `validate.py`로 확인만 한다. **vnv·developer를 opus로 spawn·관리.** | dispatch brief·계획 문서 (`ontology/**` 저작은 **developer dispatch 경유**, 직접 편집 안 함) | ✗ |
| **vnv** (dispatch 전용) | composition 결과물 검증·평가 (판정만: `validate.py` PASS + `retrieve.py` 재검색) | `docs/verify/**` | ✗ |
| **developer** (dispatch 전용) | 분배된 온톨로지 노드 저작 (abox individual) | 담당 `ontology/abox/` 노드 | ✗ |
| **inspection** (별도 세션) | 조사 전용 + 사용자 피드백 파급효과 검증 + **git 관리** | `docs/feedback/**` | ✓ |

- 정의: `.claude/agents/{vnv,developer,inspection}.md`. orchestrator는 메인이라 별도 정의 없이
  이 표가 원본. 각 에이전트는 자기 역할 파일 경계 밖을 수정하지 않는다(권한 최소화).
  developer는 배정된 abox 노드만 저작하고 TBox·shapes·brief 밖 노드는 건드리지 않는다.
- **orchestrator = 계획·dispatch 전용 (직접 작업 금지)**: orchestrator는 온톨로지 노드를 **직접
  저작·수정하지 않는다**. 요청을 노드 단위 **dispatch brief로 계획**해 developer/vnv에게 위임하고,
  반환된 결과를 assemble·통합한 뒤 `validate.py`로 확인만 한다. 저작·판정·조사·적용의 실제 수행은
  모두 dispatch를 거친다 (orchestrator가 직접 하는 것은 계획·dispatch·통합확인뿐).
- **구동 방식**: **developer·vnv는 dispatch 전용**이다 — orchestrator가 subagent로 **spawn·관리**하며,
  독립 실행되지 않는다. **inspection은 별도 세션**을 열어 사용한다 — orchestrator가 spawn하지 않는다.
- **dispatch 모델 = opus**: developer·vnv를 spawn할 때는 **opus 모델**을 사용한다 (Agent 호출 시
  `model: "opus"`, 각 agent 정의 frontmatter `model: opus`도 이와 일치). 이유: 저작·판정 품질이
  최종 온톨로지 정합성을 좌우하는 지점이므로 최상위 모델로 수행한다.
- **orchestrator↔inspection 연동 채널**: 세션이 분리되어 대화·spawn 반환값을 쓸 수 없으므로
  모든 연동은 **영속 파일 채널 + 상태 마커**(wip→rename, frontmatter `status`)로 한다.
  ① 검증 lane: inbox `docs/feedback/` → 판정 `docs/feedback/verified/`.
  ② 조사 lane: `docs/feedback/inquiries/`. 양쪽 모두 **각자 사이클에 채널을 스캔**해 완료
  항목만 소비한다 (상대 세션의 완료를 시간으로 가정하지 않는다 — verify-then-proceed).
- **저작·판정·적용 분리**: developer가 분배된 노드를 저작하고, vnv/inspection은 판정·검증만 한다.
  **온톨로지 `ontology/` 반영(적용)도 orchestrator가 직접 편집하지 않고 developer dispatch로 수행**하며,
  orchestrator는 계획(brief) 작성·assemble·`validate.py` 통과 확인만 담당한다. 피드백 처리 파이프라인
  (inspection 검증 → 사용자 승인 → orchestrator가 dispatch로 적용)은 `docs/feedback/README.md`가 원본.
- **git은 inspection만** 수행(add/commit/branch/push, 사용자 요청 시). 다른 에이전트는 파일만
  남기고 커밋하지 않는다. 커밋 전 `validate.py` PASS를 확인한다.

## 소통 규칙 (문서 우선)

세션 채팅으로 사용자에게 공유하는 내용은 **최소화**한다. 상태·결정·질문·리포트는 해당 문서·
채널에 쓰고(agent↔user는 `docs/feedback/`, 검증 판정은 `docs/verify/`·`docs/feedback/verified/`),
세션에는 **무엇을 어디에 썼는지 한 줄 포인터**만 남긴다 (report over prompt).

## 언어 (language policy)

문서작성·개발·사용자 입출력에는 **한글과 영어만** 쓴다. 다른 언어가 **필수적인** 경우(예:
외부 고유명사·인용 원문)만 예외로 허용한다. 이 규칙은 온톨로지에 저장된 harness guardrail
`id:gr-lang`("Korean/English only")과 같은 정책이며, 저장된 harness와 이 운영 harness는
일치해야 한다. `ONTOLOGYSTYLE.md §1d`의 세부(산문은 한글·용어는 영어, `skos:prefLabel`·
`skos:definition` 등 검색 대상 그래프 데이터 값은 영어)는 이 규칙의 구체화이므로 그대로 따른다.
