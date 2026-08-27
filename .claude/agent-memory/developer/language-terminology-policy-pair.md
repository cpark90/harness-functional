# 언어 정책 = 2노드 쌍 (gr-lang + gr-standard-terms), 그리고 3층 용어 규칙

사용자 규약 "정규용어 외 커스텀 용어·타 언어는 특별 요청 없는 한 불포함"을 저작한 결과.

## 왜 한 노드로 합치지 않았나

`id:gr-lang`("Korean/English only")은 **어떤 언어를 쓰는가**, 신규 `id:gr-standard-terms`
("Standard terminology only")는 **그 언어 안에서 어떤 단어를 쓰는가**다. §1 [지킴] "한
Guardrail = 한 정책": 표준 용어만 원하고 한/영 제한은 원하지 않는 harness가 성립하므로 두
정책은 독립이다. 대신 **carrier를 일치**시켜(둘 다 같은 harness에 나란히 바인딩) 정책 계열이
갈라지지 않게 한다 — gr-lang을 hasGuardrail 하는 harness는 core에 7개(h-coding/research/
support/multiagent/peer-mesh/workspace-synthesis/harness-factory)이고 전부 쌍으로 묶었다.

## 용어 규칙은 3층이다 (near-synonym 함정)

같은 파일에 이미 `id:gr-controlled-vocabulary`("Reuse the registered vocabulary … do not coin
near-synonyms or private abbreviations")가 있어 **신규 노드가 near-synonym drift로 보일 위험**이
가장 큰 지점이었다. 층 구분:

| 층 | 노드 | 대상 |
|---|---|---|
| 그래프 노드 | `gr-controlled-vocabulary` | 저작 시 등록된 `ho:` 클래스·프로퍼티·Concept 재사용(노드 민팅 억제) |
| 산문·산출물·명명 | `gr-standard-terms` | 쓰는 **단어** 선택: 표준 용어 vs 커스텀 조어 (사용자 명시 요청 시만 예외) |
| 언어 | `gr-lang` | 어떤 **언어**(한/영)로 쓰는가 |

구분은 promptText 말미 "Distinct from id:gr-controlled-vocabulary, …" 한 문장 + 배치 주석에
싣는다(파일의 기존 관례 — gr-flatten-hierarchy/gr-human-checkpoint와 동일 형식). materialize는
그 `id:` 인용을 prefLabel("Controlled vocabulary")로 해소해 emit하므로 산출문서에서도 읽힌다.

## 운영 harness 동기화 (CLAUDE.md)

CLAUDE.md `## 언어 (language policy)` 절은 저장 harness의 이 정책과 **일치해야 한다**고 그
절 스스로 규정한다. 즉 guardrail을 고치면 그 절도 같은 브리프에서 함께 고친다:
- 예외 문구를 양쪽에서 같게(essential to the task **or explicitly requested by the user**).
- 신규 정책마다 "이 규칙은 저장된 harness guardrail `id:gr-…`와 같은 정책이다" 대응 문장 1개.
- 절 안에서도 층 구분(노드 층 = gr-controlled-vocabulary)을 한 절로 명시해야 다음 세션이
  두 규칙을 합치려 들지 않는다.

**착지 확인법**: guardrail은 `hasGuardrail` carrier의 CLAUDE.md `## Operating rules`에 한 줄로
emit된다. HEAD worktree 빌드와 `diff -r` 하면 gr-lang 예외문구 수정 1줄 + gr-standard-terms
추가 1줄로 나타난다(= 그래프 변경이 산출문서에 도달했다는 증거). 이 쌍 컨벤션은 CLAUDE.md
`## 언어` 절이 스스로 "저장된 harness guardrail과 일치해야 한다"고 규정하므로, **다음 세션이
CLAUDE.md 언어 절만 고치고 guardrail을 안 고치는(또는 그 역) 반쪽 수정을 하면 회귀**다 —
언어/용어 관련 브리프를 받으면 항상 양쪽(운영 CLAUDE.md 절 ↔ `gr-lang`+`gr-standard-terms`)을
같이 확인한다.

## tokenEstimate

최근 저작분(gr-mode-fit/gr-work-claim/gr-user-elicitation)은 promptText **chars/4 정확값**이고
옛 노드는 0.7~0.9배로 흩어져 있다(측정표는 tokenestimate-recompute-convention.md). 배정 노드만
chars/4로 산정: gr-standard-terms 608자→152, gr-lang 재산정 232→267자로 44→**67**.
