---
verdict: PASS-with-notes            # 차단 결함 0, 비차단 note 7
model: fable (opus rate-limited)
scope: >
  승인 적용 3-웨이브 묶음 — A(소규모 3건: pat-orchestrator-workers 태그 /
  overlapsWith 2쌍 / 쌍둥이 7쌍 정의 축약), B(envelope 렌더 웨이브),
  C(잔존 판별태그 보강 22/13)
criteria:
  - docs/feedback/region-discriminator-recheck.md (approved, Q1=(a)·Q2=(a))
  - docs/feedback/a-wave-annotation-content.md (approved, 결정1=(a)·결정3=(a))
  - docs/feedback/envelope-render-gap.md (approved, (a) + 적용 결과 절)
  - docs/feedback/b-wave-residual-and-doclag.md (approved, Q1=(a))
  - docs/DESIGN.md, ONTOLOGYSTYLE.md §1a·1b·1c
evidence-root: /tmp/claude-1000/-home-cpark-git-harness-ontology/168523b2-5280-47bc-93ae-45e32d45add3/scratchpad (vnv_*.py, vnv-head/, vnv-mat/, vnv-rc-out/)
---

# 판정 — 승인 적용 3-웨이브 묶음 (A 소규모 3건 + B 렌더 + C 잔존 태그)

**판정: PASS-with-notes.** 차단 결함 0. 비차단 note 7 (§9).
**부적절 co-region 대량 발생 여부: 아니다** (§7 — 신규 177쌍 전수 기계 스캔, 제거 0쌍).

baseline = `git worktree add --detach` HEAD(`2266ebb`). 워킹트리의 `ontology/` diff는
정확히 이 3-웨이브의 10개 abox 파일 + `tools/materialize.py`뿐이다
(`git diff --stat HEAD -- ontology/ tools/materialize.py`). 병행 세션 소유
파일(`tools/plane-editor/**`, `CLAUDE.md`, `docs/CONTRIBUTING-ONTOLOGY.md`)은 이
판정에서 제외했고 오귀속 없음을 확인했다 (CLAUDE.md diff는 B-wave doc-lag Q2 내용으로
이 브리프 범위 밖).

## 1. 게이트 3종 + delta 검산 — PASS

| 게이트 | 명령 | 결과 |
|---|---|---|
| 구조 | `/usr/bin/python3 tools/validate.py` | **PASS** (SHACL/reachability/capabilities/assemblyOrder/capacityFit/registryDrift 전부 ✓) |
| 균일성 | `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** (7 체크 0 violation; as-operating-rules 새 정의 233 tok ≤ 260 cap 포함) |
| 결정성 | `/usr/bin/python3 tools/check_determinism.py` | **PASS** (4질의×{md,json}, 1 distinct pack) |

triple delta (reasoned union, rdflib symdiff — `vnv_delta.py`): 실질 추가 =
`ho:tagged` **23** (C 22 + A-1 1) + `ho:overlapsWith` raw **2**(reasoned 4) +
`hasGuardrail` 2 + `hasFailurePolicy` 4 (+추론 hasComponent/componentOf 12) +
정의 리터럴 교체 8건(7 쌍둥이 + as-operating-rules) + `tokenEstimate` 1건(18→233).
removed 실질 0 (propertyChainAxiom BNode 재직렬화 잡음뿐). **individuals 365→365,
symdiff ∅** — 노드 신설·삭제 0, 세 웨이브의 자기 보고와 정확히 일치.

## 2. A-3 핵심 주장 독립 검증 — 주장 사실, 승인 근거는 부정확 (N1)

**"Concept 정의 축약이 admission 예산에 반영되지 않는다" = 사실.**
`tools/retrieve.py:179-182`:

```python
def token_cost(g, node):
    est = g.value(node, HO.tokenEstimate)
    base = int(est) if est is not None else 15
    return max(base, MIN_NODE_TOKENS)   # MIN_NODE_TOKENS = 5
```

7개 `c-*` 쌍둥이 전부 `ho:tokenEstimate` **None** (실측) → admission 비용은 축약
전후 동일 15. **함의(기록 필요)**: 승인 문서(a-wave-annotation-content 결정 3)의
근거 "약 225토큰(기본 예산의 25%)이 회수된다"는 admission 예산 층위에서는 **성립하지
않았다**. 실제 회수는 렌더된 팩 텍스트 층위에서만 실현되며, 실측 **69 tok**
(chars//4 합: HEAD 299 → WT 230 — `vnv_twins.py` 양쪽 트리 재현, developer 자기
보고와 정확히 일치). 적용 자체의 결함은 아니다(Concept=원리/Guardrail=명령 분리와
텍스트 중복 제거는 유효) — 승인 문서의 정량 근거가 틀렸다는 기록이다.

**발견성 전수 확인 (7쌍 14노드)**: 7개 probe 질의(전용 검색어 질의) before/after —
c-* 7/7 · gr-* 7/7 모두 잔존. rank 변화: report-over-prompt 1→1, bounded-context
1→1, least-privilege 4→4, root-cause 2→2, controlled-vocabulary 1→1,
verify-proceed 1→1, **simplicity 2→3** (유일 하강 1계단, "avoid" 어휘 상실 —
developer 자기 보고와 일치, 비차단 N6). 발견성 훼손 없음.

## 3. A-2 대칭 술어 — 한 방향 저작 정당

raw graph(`load_graph(reason=False)`) overlapsWith = 정확히 저작된 한 방향 2 triple
(`chan-peer→pat-peer-mesh`, `gr-well-formed-skill→ins-well-formed-skill`);
reasoned = **4** (OWL RL owl:SymmetricProperty 역방향 생성 실증). 소비자 전수:
`retrieve.py:442`, `materialize.py:1763`, `lint_uniformity.py:408`,
`verify_contract.py:260`, `validate.py:318,358` 전부 `reason=True`. 유일한 raw 로드
`validate.py:246`은 registry-drift의 asserted rdf:type만 읽는다 — **추론 없이
overlapsWith를 조회하는 소비자 0**. 한 방향 저작 관례 안전.

## 4. B 렌더 웨이브 — 데이터 충실·additions-only·조건부 로직 전부 실증

7개 중앙 하네스를 HEAD/WT 양쪽 트리에서 materialize(`vnv-mat/{before,after}/`),
staging recipe 4 하네스를 양쪽 central 심링크로 렌더(`vnv-rc-out/`).

1. **그래프-산출물 일치 (날조 0)**: statement 표의 4칸 = `envelopeAttribute`
   (Concept prefLabel) / `envelopeVerdict` / `envelopeThreshold` / `envelopeObservable`
   원문 그대로(id: 토큰만 prefLabel로 해소 — 예: `id:gr-lang` → "Korean/English
   only"). "—" 칸 = threshold 미선언 statement 정확히 3개(es-coding-environment,
   es-coding-reversibility, es-multiagent-user-availability)와 1:1. tier 5슬롯 =
   executionOwner/oversightOwner/fallbackOwner/approvalUnit/envelopeBinding 값
   그대로. default gloss는 닫힌 dict + 미인지 값 raise(코드 확인). 임의 문구는
   섹션 lead-in 관례 문장뿐(기존 섹션들과 동일 관례, 적용 결과 문서에 자인).
2. **미선언 하네스 5종**(h-research/h-support/h-peer-mesh/h-workspace-synthesis/
   h-harness-factory): 전 파일 트리 **byte-identical** (`diff -rq` 무출력) —
   조건부 게이트(`if not …: return`)의 실증.
3. **CLAUDE.md 삭제·수정 0**: h-coding **+38/−0**, h-multiagent **+31/−0**
   (diff `^<` 카운트 0) — 적용 결과 문서의 수치와 일치. MANIFEST의 −1은
   tokenEstimate 합계 한 줄(구조적 필연)이며 delta 산술 정확:
   h-coding 1246→1922 **+676 = 131(gr-envelope-check)+318(fp-envelope-exit)+227(-severe)**,
   h-multiagent 6719→7610 **+891 = 676+215(as-operating-rules 18→233)**.
4. **`(see Error handling)` 조건부 — dangling 방지 실증**: 가드는
   `all(exit ∈ set(hasFailurePolicy(h)))` (materialize.py 신규 코드). 반례
   h-hil-approval(oe가 `onEnvelopeExit core:fp-envelope-exit/-severe`를 지정하나
   hasFailurePolicy에 미등재)의 렌더 실측: "on range exit: … immediate fallback"
   — **suffix 미출력**, Error handling 표에는 자기 등재 3행만. h-coding/h-multiagent
   는 등재 완료라 suffix 출력 + 그 표에 두 exit 행 실재. 진실 유지 확인.
5. **결정성**: h-coding/h-multiagent 2회 렌더 `diff -rq` 동일.
6. **AssemblySection 미신설 판단 — 독립 판정 타당**: `ho:sectionKind`는 shapes의
   닫힌 `sh:in` 13값(shapes:195-200 실물 확인) — 신규 kind는 shapes 변경 없이
   hard-FAIL이고 shapes는 developer 경계 밖. companion을 무조건부 섹션
   `_render_operating_rules` 끝의 조건부 `##` 블록으로 얹는 대안은 assemblyOrder
   계약을 건드리지 않으며(validate assemblyOrder ✓), 유예 사유·승격 경로가
   as-operating-rules 정의문에 기록됨(233 tok, cap 이내). 충돌 없음.

**staging recipe 수치 정정(N4)**: 적용 결과 문서의 "staging recipe 3종도 fidelity
블록만 +6/−0"은 h-coding-swe/h-swe-baseline/h-eval-user-sim 3 **하네스**에만 참.
**h-hil-approval은 +32/−0** (envelope 4행 표 + tier + fidelity — 전부 자기 recipe-local
선언의 충실 렌더, 삭제 0). additions-only 게이트 자체는 전원 성립: 문구 부정확 note.

## 5. C 태그 22건 사실성 전수 + ⚑8 반증 시도 — 날조 0

전수 판정(각 태그 vs 대상 노드의 실제 정의문/promptText/graph 사실 — `vnv_fact.py`):

- **verbatim 즉결 (강)**: role-benchmarker·role-auditor 정의 "**dispatch-invoked
  only**"→c-dispatch (+선례: role-analyst 등 9개 기태깅);
  fp-unanswered-approval recoveryStrategy "**Escalate** along a pre-declared
  chain"→c-escalation; tool-lint-gated-edit altLabel "**verify-or-revert**
  editor"+"a failing edit never commits"→c-verify-proceed; gr-resume-idempotency
  "**design** each unit so that re-execution … converges"→c-design;
  chan-approval·chan-elicitation=Channel 그 자체→c-communication(anatomy);
  pat-orchestrator-workers→c-pattern-taxonomy(정의가 "tag the DesignPatterns …"
  — A-1, 사용자 Q2=(a) 승인 그대로 1줄).
- **6 tier → c-operating-envelope**: 5/6은 정의문 verbatim("declared envelope"/
  "rangeless"/"no range needs declaring"). **tier-per-action-approval(⚑, verbatim
  無 자기신고)**: 반증 시도 결과 **정당** — 산문에는 없지만 그래프 사실
  `ho:envelopeBinding "bounded"`가 있어(6 tier 전원이 envelope축 datatype 선언
  보유) "가족 규칙"이 아니라 **기계-가독 그래프 근거**로 성립한다. 닫힌 6-대안
  집합의 단일 공통 태그는 B2 관례(닫힌 대안군)와도 일치.
- **가족+선례 기반 (중)**: escalation 4건(gr-nodestruct/gr-dual-approval/
  gr-plan-evidence/wf-approval-gated) — 선례 gr-human-checkpoint·
  gr-no-arbitrary-decision이 HEAD에 기태깅(승인가족 확장이 이번 웨이브 발명이
  아님); complexity-governance 2건(gr-stopping-condition/gr-auto-reply-budget) —
  선례 5건 기태깅 + 저작 의도 주석 guardrails.ttl:291 "**carries the
  complexity-governance family**" verbatim 실재.
- **약한 배정 (⚑ 반증 부분 성립, 비차단 N2)**: **gr-rejection-feedback→
  c-escalation** — 자기 promptText가 "Distinguished from id:gr-no-arbitrary-decision,
  which escalates an OPEN question …: **here the human has already decided**"라고
  스스로 대조한다. c-escalation 정의("undecided question … escalating to the
  decision authority")의 문면으로는 불충족 — 성립 근거는 기존 taggee들이 이미
  확장해 둔 '인간-게이트 가족' 외연뿐. developer 자신의 기각 규칙(대조문이
  부정하면 탈락)의 엄격 적용이라면 경계선. **권고**: c-escalation 정의문을 실제
  외연(인간 결정권한 게이트 가족)으로 일반화하는 1문장 — B2 판정의 "개념정의
  일반화 권고" 패턴. gr-safe-halt→c-agent-methodology(⚑)와
  scn-oversight-efficacy→c-agent-methodology는 우산 개념의 기존 이질적 외연
  (h-harness-factory·wf-* 기태깅)과 일관 — 수용, 우산 비대화 감시 N7.

## 6. SKIP 13건 — 사실이고 정직하다

판별 facet(anatomy|method) 태그 없는 tagged 개체 재계산(`vnv_skip.py`):
HEAD **35** → WT **13** (22+13=35 산술 폐합; A-1 pat-orchestrator-workers는 태그 0
개체라 35 모수 밖 — 승인 문서 서술과 일치). 13의 구성 = 자기 보고 그대로:
① guardrail 5(gr-cite 64ch/gr-grounding 218ch/gr-integration-coherence 330ch/
gr-structural-coverage 303ch/gr-traceability 195ch — promptText는 있으나 원리가
B1 quality 분류라 method 어휘 GAP 후보), ② harness 3(h-coding 79ch/h-research
69ch/h-support 76ch — 도메인 한 줄), ③ **5노드 텍스트 전무 실증**(tool-editor/
tool-shell/tool-retriever/tool-websearch/wf-react: definition·promptText 둘 다
None). 억지 태깅 회피 타당 — 텍스트 없으면 근거 없음. **fail-closed 안전 해석
맞음**: 미태깅의 유일 효과는 그 노드가 `alternativeOf` region 앵커 자격을 못 갖는
것(shape 필요조건 미충족 = 선언 차단)이고, ABox의 alternativeOf는 현재 0건.

## 7. 신규 co-region 품질 — 전수 기계 스캔 (이번 웨이브의 시험대)

co-region 쌍(판별 facet 개념 공유) 재계산(`vnv_region.py`): **278 → 455,
신규 177, 제거 0**. developer 보고 169와의 차이 8 = A-1(pat-orchestrator-workers)
이 만든 pattern 8쌍 — **169(C) + 8(A-1) = 177로 정합** (오보 아닌 집계 스코프 차이).
개념별: operating-envelope 69 / escalation 27 / communication 19 / dispatch 19 /
agent-methodology 13 / complexity-governance 11 / pattern-taxonomy 8 / design 6 /
verify-proceed 5.

- 최대 블록 envelope 69 = 닫힌 6-tier 대안집합 상호 15쌍(**의도된 정확한 region** —
  미래 tier 간 alternativeOf의 앵커) + tier×envelope 기계부품 54쌍(동일 anatomy
  영역, 정합).
- **어색 후보 3건 판정**: ① `gr-auto-reply-budget↔gr-flatten-hierarchy` — 시간축
  vs 구조축이 한 개념 아래. 개념 정의가 "cap **structural** complexity"라 문면
  긴장이 있으나, 시간축 선례 gr-bounded-iteration이 HEAD 기태깅 — 수용, 정의문
  1어 확장 권고(N3). ② `tool-lint-gated-edit↔role-vnv` — method region은 클래스
  횡단이 본성("components that encode this discipline"); Tool↔Role alternativeOf는
  무의미하지만 region은 허용 게이트일 뿐 선언이 아님 — 수용.
  ③ `gr-safe-halt↔pat-minimal-baseline` — c-agent-methodology 우산의 이질성
  (기존 멤버부터 h-harness-factory·wf-*): 가장 약한 region 의미론이나 이번 추가는
  2멤버뿐이고 구조는 선재 — 수용 + 우산 비대화 감시(N7).
- 그 외 전수 스캔에서 scope/quality-단독 공유형(B3가 제거한 허위 region 유형)의
  재발 **0**; 클래스 횡단 쌍은 위 ②와 동종(method region 본성)뿐.

**결론: 부적절 co-region 대량 발생 없음.**

## 8. 랭킹 회귀 40질의 통합 검산 — top-1 40/40 불변 확인

developer의 40질의 목록 그대로, 내 baseline(HEAD worktree in-process
`retrieve.project`, PYTHONHASHSEED=0) vs WT(`vnv_40.py`/`vnv_cmp40.py`):

- **top-1 변화 0/40** — developer 보고 검산 일치.
- 팩 변화 **33/40** (developer 보고 22/40은 C-웨이브 단독 격리 수치 — 내 33은
  3-웨이브 통합이라 A-3 정의 텍스트 변화·B 바인딩 변화 포함; 그중 3질의는 노드
  집합 동일·텍스트/엣지만 변화). 스코프 차이지 오보 아님.
- **주시 1 "escalate open decisions to a human authority"**: 탈락
  fp-dismissal-vs-decline(주변부)·**fp-refer-to-expert(실질 on-topic 손실)** +
  agent/aoi 꼬리 6; 추가 fp-unanswered-approval·gr-dual-approval·gr-plan-evidence·
  gr-rejection-feedback(전부 on-topic 가족)·gr-nodestruct(rank 2 진입 — 경미한
  주제 희석). 직접 질의 "refer a decision beyond the agent's remit to an expert"
  에서 fp-refer-to-expert **rank 2/12 잔존** 실측 — 손실은 이 광역 질의의 팩
  구성에 국한. **판정: 혼합(가족 통합=의도 방향, on-topic 1건 팩 이탈) — 비차단.**
- **주시 2 "monitored autonomy for unattended runs"**: 탈락 3 sibling tier는 전부
  **attended** 구성(advisory/per-action/per-plan)이고, 대조 정의 상대인
  tier-bounded-autonomy는 top-2 잔존; 추가 fp-envelope-exit·c-operating-envelope는
  monitored tier 정의("on a range exit the harness itself must reach the
  safe-halt state")의 직접 지시체. **판정: 중립~개선.**
- 부수 관찰(N5): "autonomous coding agent" 팩이 tool-editor·oe-coding을 잃고
  두 exit 행(318+227 tok)을 얻음 — 새로 등재된 무거운 fp 행이 예산을 선점하는
  admission 경합. 구조적으로 정당(이제 h-coding의 1-hop 부품)하나 무거운 행의
  팩 점유는 감시 대상.

## 9. 경고 1건 + note 목록

`⚠ dangling reference 'ho:tagged-style'`: **오탐·이번 웨이브 무관 확증** —
before/after 렌더 로그 양쪽에서 동일 재현; 출처는 TBox `ontology/tbox/harness.ttl:714`
`ho:attachesAt` 정의 산문 "Refinement edge over ho:tagged-style concept linking"
(`-style` 접미가 토큰 정규식에 걸림); 해당 문장은 HEAD 이전 커밋 `9a0483d` 소산이고
이번 웨이브 TBox diff = 0줄.

비차단 note:
- **N1** 승인 문서(A 결정3)의 "약 225 tok=예산 25% 회수" 근거 불성립 — 실제는 렌더
  텍스트 69 tok, admission 예산 무변(15-floor). 기록 완료(§2), 적용 유효.
- **N2** gr-rejection-feedback→c-escalation은 자기 대조문과 문면 충돌 —
  c-escalation 정의 일반화 1문장 권고 (선재 외연 확장 추인 형태).
- **N3** c-complexity-governance 정의 "structural" 1어가 시간축 멤버들과 부정합 —
  정의 확장 권고 (선재 경향).
- **N4** 적용 결과 문서 "staging recipe 3종 +6/−0" 부정확 — h-hil-approval은
  +32/−0 (additions-only는 성립).
- **N5** 등재된 무거운 fp 행(318/227 tok)의 팩 예산 선점 — h-coding 광역 질의에서
  bound tool 1개 팩 이탈. 감시.
- **N6** c-simplicity probe rank 2→3 (1계단, 자기 보고 일치).
- **N7** c-agent-methodology 우산 region 이질성 — 멤버 증가 시 하위 method 개념
  분화 검토.

## 재현 요약

```bash
git worktree add --detach <scratch>/vnv-head HEAD          # baseline
/usr/bin/python3 tools/validate.py                          # PASS
/usr/bin/python3 tools/lint_uniformity.py                   # PASS
/usr/bin/python3 tools/check_determinism.py                 # PASS
/usr/bin/python3 <scratch>/vnv_delta.py                     # triple/individual delta
/usr/bin/python3 <scratch>/vnv_twins.py(-head)              # 299→230 tok, tokenEstimate None
PYTHONHASHSEED=0 /usr/bin/python3 <scratch>/vnv_disc.py <root>   # 발견성 7질의
tools/materialize.py h-* --out <scratch>/vnv-mat/{before,after}  # 7 하네스 양쪽
# recipes: rsync 복제 + central 심링크 두 벌, HARNESS_CATALOG=catalog-v001.xml
#   HARNESS_ROOT_ONTOLOGY=…/recipes/<r> central/tools/materialize.py <h>
/usr/bin/python3 <scratch>/vnv_skip.py(-head)               # 35→13
/usr/bin/python3 <scratch>/vnv_region.py                    # 278→455, 신규 177
PYTHONHASHSEED=0 /usr/bin/python3 <scratch>/vnv_40.py <root> <out> && vnv_cmp40.py
```
