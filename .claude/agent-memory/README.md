# 에이전트 역할 메모리 (agent-memory)

> **2026-09 저장소 재배치 — 저장된 메모리를 읽을 때 주의.** 이 저장소가 추상화
> 사다리 기준으로 둘로 갈라졌다: **harness-functional**(여기 — 어휘 TBox·shapes·
> 공용 도구·ODD)과 **harness-concrete**(개체 abox·레시피·조립 명세, 구
> harness-recipes). 재배치 이전에 쌓인 메모리 파일은 `ontology/abox/**`,
> `recipes/`, `docs/DESIGN.md`, `docs/recipes-design.md`, `docs/odr-*.md`,
> `docs/materialize-design.md`를 **이 저장소 기준으로** 가리킨다 — 전부
> harness-concrete로 옮겼거나(개체·조립 문서) agentic-knowledge-base 청크
> d-0013~d-0020으로 이송되었다(일반 방법론). 메모리의 **교훈 내용은 유효하되
> 경로는 재해석**하고, 갱신할 때 새 위치로 고쳐 쓴다. 현재 배치는
> `../../README.md`와 `../../docs/federation-design.md`가 원본이다.

역할별 에이전트가 cold-start에서 특화하기 위한 **디렉토리 메모리**. 각 에이전트는 세션 시작 시
`<role>/MEMORY.md`와 그 폴더를 읽어 역할 컨텍스트를 세우고, 재사용 지식을 이 폴더에 파일로
축적한다. **git 저장소에 커밋되어 세션·머신 간 유지된다.**

| 폴더 | 에이전트 | 정의 |
|---|---|---|
| `orchestrator/` | 메인(계획·dispatch·통합 — 직접 저작 안 함) | CLAUDE.md "에이전트 역할" |
| `vnv/` | verification & validation (composition 결과물 검증·평가) | `.claude/agents/vnv.md` |
| `developer/` | 분배된 온톨로지 노드 저작 (abox individual) | `.claude/agents/developer.md` |
| `inspection/` | 조사 + 피드백 파급효과 검증 + git | `.claude/agents/inspection.md` |

- 각 `MEMORY.md`는 **한 줄 인덱스**만 둔다 (`- [제목](파일.md) — 훅`). 내용은 개별 파일에.
- 역할 정의(시스템 프롬프트·도구·권한)는 메모리가 아니라 `.claude/agents/<role>.md`에 있다
  (orchestrator는 메인이라 CLAUDE.md의 역할 표가 원본).
- 이 메모리는 어시스턴트 전역 메모리(`~/.claude/projects/.../memory/`)와 별개 —
  이쪽은 **프로젝트 repo에 귀속된 역할 특화 메모리**다.

## 작성 규약 (read / write)

각 에이전트는 **자기 역할 폴더에만** 읽고 쓴다 (타 역할 메모리 수정 금지).

**읽기** — 세션 시작 시 `<role>/MEMORY.md`(인덱스)와 관련 파일을 읽어 역할 컨텍스트를 세운다.

**쓰기** — 작업 중 **재사용 가능한 사실**을 알게 되면 **작업 종료 전에** 기록한다:
- *무엇을*: 그래프 지도(어디에 뭐가 있나), 함정·모델링 패턴, 확정된 규약·capability 배선,
  도구 실행법, 반복되는 판정 기준 등 — **다음에 또 쓸** 것.
- *쓰지 않을 것*: 이번 작업에만 유효한 것, repo·git 이력이 이미 담은 것(그래프 구조·과거
  수정·커밋 로그), 추측. (예산 비례 원칙과 같은 절제 — 소비될 것만.)
- *형식*: 메모리 하나 = 파일 하나 `<role>/<kebab-slug>.md`. 첫 줄 제목 + 본문(사실 + "어떻게
  적용"). 그리고 `MEMORY.md`에 한 줄 인덱스 추가.
- *중복 방지*: 추가 전 기존 파일을 확인 — 있으면 **갱신**, 틀린 것은 삭제(새 파일 남발 금지).

이 규약은 각 `.claude/agents/<role>.md`의 "역할 메모리" 절이 참조한다.
