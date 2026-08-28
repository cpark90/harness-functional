---
target: sim-hil B 웨이브 3단계 — B-K2(wave-S/C 축소분: recipe 3종 bind 부품 7 + cap 1 + mem-longterm retrievalPolicy)
verdict: PASS-with-notes   # blocking 0 / non-blocking notes 5
model: fable (opus rate-limited)
date: 2026-08-28
plan: docs/feedback/verified/sim-hil-coding-harvest.md (§2층 wave-S·wave-C 중 §3층 recipe 3종 bind 부분집합)
dossier: docs/feedback/inquiries/sim-hil-coding-harness-research.md (§7 수확 게이트, §8 dedup)
prior: docs/verify/sim-hil-b-wave-verify.md (B-T+B-K1 PASS-with-notes — N4 연속성 본문 §6)
interpreter: 셸 기본 python3에 rdflib 있음 — 아래 명령 전부 `python3` 그대로 실행
---
# 판정 — sim-hil B-K2 (wave-S/C 축소분)

**PASS-with-notes.** 게이트 3종 PASS @364, delta +8이 브리프 목록과 1:1(삭제 0·기존 노드
트리플 소실 0·mem-longterm은 정확히 retrievalPolicy 1 triple), 인벤토리 외 신설
`cap-environment-interaction`의 최후수단 사유 독립 판정 성립, dedup 기계 스캔 clean·외부
고유어 emit 0, carrier 이분법 사실 대조 통과, B-T 술어 부여 전건 promptText 직독 근거
+ 8 leaf 전점유 그래프 검산, materialize 무회귀(overlay 중간점 356 재구성으로 격리 —
비-carrier 5종 산문 byte-identical·carrier 2종 순수 추가·산술 정합), 발견성 5/5 최상위.
차단 결함 0, 비차단 note 5. **recipe 진입 결론은 §8.**

**형상 전제:** HEAD(765eb54)에는 B-T ABox·B-K1·B-K2 모두 없음 — 세 층이 전부 워킹트리
(11 abox 파일, +458/−9줄). B-K1 커밋 경계가 없어 중간점 356은 관측 불가하므로 **B-K2 격리는
역적용 overlay**(워킹트리 복제 후 B-K2 그래프 트리플만 외과 제거 → validate PASS @356 재현)로
구성했다. 병행 lane(plane-editor)은 tools/ 전용이라 ontology diff는 이 웨이브군에 온전 귀속.

## 1. 게이트 3종 + delta 재집계 — PASS

```
python3 tools/validate.py          → PASS ("all 364 individuals reachable from a Harness")
python3 tools/lint_uniformity.py   → PASS (6축 전부 0 violation)
python3 tools/check_determinism.py → PASS (4질의 × md/json × 4 runs, 각 1 distinct pack)
```

`git worktree add --detach <scratch>/wt-head HEAD` + rdflib abox subject symdiff
(`<scratch>/bk2/delta.py`):
- **NEW 41 = B-T 9 + B-K1 24 + B-K2 8**, REMOVED 0, 생존 subject의 HEAD 트리플 소실 0.
- **B-K2 8이 브리프와 1:1**: role-user-simulator · gr-oracle-leak · tool-env-interface ·
  c-simulation-standin · gr-aci-observation · tool-lint-gated-edit · pat-minimal-baseline ·
  cap-environment-interaction. 브리프 밖 신설 없음.
- **mem-longterm: added 1 / removed 0** — 유일 추가가 `ho:retrievalPolicy` 리터럴(트리플 단위 대조).
- 기존 subject에 붙은 B-K2 배선 = h-coding(usesTool·hasGuardrail 각 1) +
  h-workspace-synthesis(usesTool 1·hasRole 1·hasGuardrail 중 gr-oracle-leak 1) +
  mem-longterm(retrievalPolicy 1) — 전부 의도 목록 내.

## 2. 인벤토리 외 신설 `cap-environment-interaction` — 타당 (독립 판정)

- **빈자리 실증**: capability 전수 13종 카탈로그 재구성(`<scratch>/bk2/caps.py`) — 기존 12종
  (cap-audit/benchmarking/citation/codeexec/fileedit/orchestration/retrieval/safe-halt/skill/
  synthesis/traceability/websearch) 중 "매개된·리셋 가능한 환경 구동"을 명명하는 것 없음.
- **cap-codeexec 재사용 기각 사유 성립(구조적)**: cap-codeexec는 tool-shell 단독 제공·
  h-coding/h-multiagent/h-harness-factory 3곳이 requires. tool-env-interface가 cap-codeexec를
  provides라 주장하면 capability 게이트상 그 3 하네스의 실행 요구를 시뮬레이션 표면이
  "충족"하는 거짓 매칭이 실제로 성립 가능해진다 — 기각 사유가 이 그래프의 requires↔provides
  기계 검사 방식과 정확히 맞물림. 정의문에 cap-codeexec 판별절 명문(emit 대상 값).
- **provided-only 합법**: 선례 cap-audit·cap-benchmarking·cap-safe-halt 전부 required-by 없음.
  cap-environment-interaction은 tool-env-interface(→h-workspace-synthesis usesTool)로
  reachable — validate reachability·capability 게이트 모두 PASS(§1). 요구자는 recipe 쪽
  (eval-user-sim)이 맡는 구도로 주석 명시.

## 3. 중복·드리프트 — clean

- 기계 스캔(`<scratch>/bk2/dedup.py`, 신규 8 vs 전 그래프): prefLabel/altLabel 충돌 **0**,
  정의·promptText token-Jaccard ≥0.30은 **tool-env-interface↔cap-environment-interaction
  0.470 단 1쌍** = 도구와 그것이 제공하는 capability의 계약 서술 거울(의도 구조, Note-4).
  차상위는 role-user-simulator↔role-tester 0.236 등 전부 판별절 있는 이웃.
- **§8 표 준수**: "시뮬레이터" 행이 지시한 대로 role-tester enrich가 아닌 신설 + 공통 상위
  c-simulation-standin 동반. enrich-only(신설 금지) 행의 기존 패턴 7종은 무수정
  (patterns.ttl diff는 pat-minimal-baseline 추가뿐).
- **지정 4쌍 — emit되는 값 안 변별**:
  - role-user-simulator ↔ role-tester("AUTHORS the checks…") / role-analyst("issues no
    findings; its deliverable is the conducted counterpart behaviour") — definition, Role은
    emit됨(user-simulator.md frontmatter로 실재 확인, §7).
  - gr-oracle-leak ↔ gr-cite(자기 소비자에의 사실 주장 vs SIMULATOR가 피평가 agent에
    노출하는 것) — promptText ✓. 기존 비밀보호는 hook-pre-tool-use(쓰기의 secret scan,
    이벤트 자동화 층)라 층·대상 모두 상이 — hook 정의 자체가 guardrail과의 층 구분을 명문.
  - tool-env-interface ↔ tool-shell("real workspace with real effects" vs mediated·resettable),
    tool-lint-gated-edit ↔ tool-editor(무조건 적용) / hook-post-tool-use(사후 반응 vs 계약
    내장 check-or-revert) — definition ✓.
  - pat-minimal-baseline ↔ gr-simplicity / gr-discriminating-eval — definition ✓.
    wfs-baseline-compare와의 변별은 TTL 주석에만 있음(Note-2).
- **외부 고유어·약어 emit 0**: 추가줄 전수 grep — "ACI" 히트는 repl**aci**ng 부분열+id slug,
  "SWE"는 an**swe**r 부분열. 프레임워크 고유명사(τ-bench/SWE-agent/Aider/LangGraph/… 27종
  패턴) 실히트 0. 유일 잔재는 slug `gr-aci-observation`의 "aci" 약어 자체(Note-3).

## 4. carrier 사실성 — 통과

- **h-coding 직접 2건 참**: 이 하네스는 "shell + editor로 버그 수정·코드 리뷰"가 정의 —
  gr-aci-observation은 바로 그 도구 결과를 규율하고 tool-lint-gated-edit는 그 편집을
  게이트한다(선언 carrier = W1 N1 선호 방향). 산출 문서가 의도대로 변함(§7) — 주석에
  "deliberately CHANGES this harness's materialized document" 명시.
- **h-workspace-synthesis 라이브러리 3건 사유 타당**: 평가 시뮬레이션을 운영하는 하네스가
  현재 없음(grep·하네스 7종 정의 대조 — 사실) → 오버사이트 페어(role-benchmarker/auditor)와
  동일한 라이브러리 배치 선례. role+tool+guardrail이 **같은 carrier에 동반 착지**해
  roleTool/roleGuardrail이 하네스가 bind한 부품만 scope하는 roles.ttl 규약 충족
  (h-ws usesTool tool-env-interface 동반 추가 확인).
- **pat-minimal-baseline: appliesPattern 없이 tagged만 = 정당**: 어느 하네스도 control arm이
  아니므로 appliesPattern 단언은 날조 — 선례 pat-pipeline·pat-supervisor도 inbound 0.
  reachability는 tagged(c-agent-methodology)로 확보되어 validate "all 364 reachable"에 포함
  (직접 inbound 조회로 [] + 전역 게이트 PASS 교차 확인).

## 5. B-T 술어 사실성 — 통과

- `gr-aci-observation` → attachesAt **execution-post**: promptText "Applied to the action's
  result before the agent builds on it" 직독 ✓. **공석 leaf 해소 주장 그래프 검산**:
  attachesAt 히스토그램 전수 — 8 leaf 모두 점유(input 2/dialog 2/retrieval 1/execution-pre 4/
  **execution-post 1(첫 점유=gr-aci-observation)**/output 4/session 1/turn 2), vacant NONE.
  concepts.ttl B-T 배너의 "still no occupant" 문장도 같은 편집에서 갱신됨.
- `gr-oracle-leak` → attachesAt **output**: 규율 대상이 시뮬레이터가 "노출(reveal/state)"하는
  것 = 발화 직전 차단·재형성 지점 — output leaf 정의("what the agent is about to emit")와
  정합 ✓.
- **approvalScope 미부여 옳음**: 두 규칙 모두 인간 승인 게이트가 아님(promptText 직독).
  전 그래프 approvalScope 보유 5건은 전부 승인 게이트(nodestruct/human-checkpoint/
  dual-approval/plan-evidence/auto-reply-budget) — 날조 금지 일관.

## 6. `retrievalPolicy` 값 — 정합 (B-T N4 연속: 첫 실사용 값-사실 대조 완료)

- T3 정의(tbox harness.ttl:850-854)의 예시 구조("recency, importance and relevance with time
  decay, read the top slice")와 값("weighted combination of recency(감쇠)·importance(write 시
  부여)·relevance, top-ranked portion within the read budget")이 1:1 — 자유문 규정 준수.
- 기존 read 축과 모순 없음: readTiming=conditional(WHEN)·readScope=selective(HOW MUCH)·
  activationCondition(TRIGGER)과 직교하는 "which entries win" 축만 채움; 값 말미
  "consumption is selective"가 readScope 값과 명시 호응. tier-level BOUNDARY 준수(특정 run
  서술 아님).
- **미렌더**(Note-1): `grep retrievalPolicy tools/materialize.py` = 0 — h-multiagent
  CLAUDE.md byte-identical(§7)로 교차 확증. retrieve pack(그래프 텍스트)에는 실림.

## 7. materialize 무회귀 — 통과 (overlay 격리)

역적용 overlay(`<scratch>/bk2/wt-mid`: B-K2 그래프 트리플만 제거 — 5파일 reverse patch +
guardrails/concepts 블록 제거 + harnesses 5줄 수술, 비주석 잔여 참조 0) → validate **PASS
@356**(중간점 정확 재현). 양 트리 PYTHONHASHSEED=0으로 7 하네스 materialize 후 `diff -r`:
- **비-carrier 5종(h-multiagent/h-peer-mesh/h-research/h-support/h-harness-factory): 산문
  byte-identical**, lock individualCount 356→364 1줄만(구조적 필연). h-multiagent 불변이
  retrievalPolicy 미렌더의 반사실 증명이기도 함.
- **carrier 2종 순수 추가(삭제줄 0 확인)**: h-coding = operating-rule 불릿 1(promptText 전문,
  문중 id: 참조 라벨 해소) + MANIFEST 항목 2 + aggregate tokenEstimate 893→1246(**+353 =
  171+182** 신규 2노드 선언값 합과 산술 일치). h-workspace-synthesis = guardrail 불릿 1 +
  role 불릿 1 + **`.claude/agents/user-simulator.md` 신설**(frontmatter=정의, Tools=
  env-interface, Guardrails=dispatch-execution/least-privilege/oracle-leak, Memory policy —
  전부 그래프 사실과 일치) + MANIFEST role/tool/guardrail 항목 + tokenEstimate 3435→3795
  (**+360 = 175+185** 일치). Tool은 implementationRef 없어 CLAUDE.md 미출현이 정상 관례.
- **dangling `id:` 0**: 추가줄 전체의 id: 참조 102건 전건이 그래프 선언 subject로 해소.

## 8. coverage + recipe 3종 진입 판정

- **이번 범위 전량 land**: 브리프 8개체 + retrievalPolicy 값 — delta가 정확히 그만큼(§1),
  초과·누락 0. 범위 밖 wave-S/C 잔여(adjudicator/wizard/task-specifier/npc·wfs 3종·
  gr-simulator-calibration·gr-role-lock·mode-shadow·tool-counterfactual-query·wave-C 잔여
  gr 3종·tool-ranked-map·role-reasoner/applier·wfs 2종·pat 5종·c 3종)는 계획 문서 B-K1
  기록란("나머지 … wave-S·wave-C·recipe는 후속 웨이브")과 B-K2 절의 "축소분" 명명으로 이월이
  명시됨 ✓ (B-K2 완료 기록란 기입은 이 판정 후 orchestrator 몫).
- **recipe 3종 bind 부품 대조 (계획 §3층 표)**:
  - `hil-approval`: wfs-interrupt-resume ✓ chan-approval ✓ fp-unanswered-approval ✓
    gr-dual-approval ✓ approvalScope(T1) ✓ — **전부 실재. 진입 가능.**
  - `coding-swe`: gr-aci-observation ✓ tool-lint-gated-edit ✓ pat-minimal-baseline ✓
    h-coding 부품 재사용 ✓ — **전부 실재. 진입 가능.**
  - `eval-user-sim`: role-user-simulator ✓(tool-constrained=roleTool ✓) gr-oracle-leak ✓
    tool-env-interface ✓ / **"양면 oracle·pass^k" 부재** — T6(oracleKind·goalVisibility·
    reliabilityAggregation)이 계획 1층에서 2티어 이월이라 중앙 어휘가 없음. recipe-local
    표현(선례: recipe-local 개체 합법)으로 진입 가능하나, **brief에 이 제약을 명시**해야
    developer가 중앙 bind를 시도하다 신설-드리프트로 미끄러지지 않음(Note-5).
- 결론: **recipe wave 진입 가능** — hil-approval·coding-swe 무조건, eval-user-sim은
  oracle/pass^k 축 recipe-local 처리 조건부(비차단).

## 9. 발견성 — 5/5 질의 최상위

`PYTHONHASHSEED=0 python3 tools/retrieve.py "<q>" --format json`:

| 질의 | top seed | base 후보 |
|---|---|---|
| simulate a user to evaluate a conversational agent end to end | role-user-simulator 7.65 | h-workspace-synthesis 5.16 |
| step and reset a mediated environment for reproducible replayable runs | tool-env-interface 8.55 / cap-environment-interaction 6.3 | h-workspace-synthesis 5.77 |
| concise bounded tool observations for a coding agent | gr-aci-observation 8.19 | h-coding 5.53 |
| minimal baseline control arm to prove each added part earns its place | pat-minimal-baseline 15.3 | h-harness-factory 4.22 |
| edit gated by lint checks with automatic revert on failure | tool-lint-gated-edit 13.05 | h-coding 8.81 |

## Notes (비차단 5)

- **N1 — retrievalPolicy 미렌더**: materialize가 Memory의 retrievalPolicy를 emit하지 않음
  (renderer에 참조 0줄; h-multiagent CLAUDE.md 불변으로 교차 확증). 그래프 텍스트로는
  retrieve pack에 실림. B 웨이브 N1(fp definition 미emit)과 같은 family — 소비자가 생기면
  렌더러 확장 후보.
- **N2 — pat-minimal-baseline↔wfs-baseline-compare 변별이 주석에만**: emit되는 정의문은
  gr-simplicity·gr-discriminating-eval 2방향만 명문이고 wfs-baseline-compare(3번째 대조
  대상)는 TTL 주석에만. 이종 층(pattern vs step)이고 wfs가 stepGuardedBy
  gr-discriminating-eval로 그 discipline family에 그래프-연결돼 있어 기존 emit-층 판정
  기준상 비차단 — 정밀도 note.
- **N3 — slug `aci` 약어(cosmetic)**: `gr-aci-observation`의 "aci"는 소스 문헌 약어
  (agent-computer interface)나, emit되는 값(prefLabel "Concise, informative observations",
  promptText)은 전부 중립 — id는 승인 계획이 고정(B-K1 N5와 동일 처리).
- **N4 — tool↔cap 정의 거울(J=0.470)**: tool-env-interface와 cap-environment-interaction이
  같은 계약을 양쪽에서 서술. provider-capability 쌍의 구조적 특성이고 capability 정의에
  자체 판별절(vs cap-codeexec) 있음 — drift 아님, 전 그래프 유일 ≥0.30 쌍이라 기록만.
- **N5 — eval-user-sim의 oracle/pass^k 중앙 부재**: §8 본문 참조. recipe brief 작성 시
  "양면 oracle·pass^k는 recipe-local(T6 2티어 이월)" 명시 필요.

## 재현 명령 요지

```
python3 tools/validate.py ; python3 tools/lint_uniformity.py ; python3 tools/check_determinism.py
git worktree add --detach <scratch>/wt-head HEAD          # baseline 323, symdiff → NEW 41
python3 <scratch>/bk2/delta.py                            # +8/0, mem-longterm 1 triple
python3 <scratch>/bk2/caps.py                             # cap 13종·attachesAt 히스토그램·approvalScope 5
python3 <scratch>/bk2/dedup.py                            # 라벨충돌 0·J≥0.30 1쌍
# overlay: rsync 워킹트리 → 5파일 git apply --reverse + guardrails/concepts 블록·harnesses 5줄 제거
#          → validate PASS @356 → 양 트리 PYTHONHASHSEED=0 materialize 7종 → diff -r
# 고유어: git diff 추가줄에서 27종 프레임워크 패턴 grep — 실히트 0(부분열 오탐만)
# 발견성: tools/retrieve.py "<질의>" --format json × 5
git worktree remove <scratch>/wt-head
```
