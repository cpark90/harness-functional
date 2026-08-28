---
target: sim-hil B wave 1·2단계 — B-T(TBox T1–T4 + 첫 사용처) + B-K1(HIL 부품군 24개체)
verdict: PASS-with-notes   # blocking 0 / non-blocking notes 5
model: fable (opus rate-limited)
date: 2026-08-28
plan: docs/feedback/verified/sim-hil-coding-harvest.md (§1층 T1–T4, §2층 wave-H, §순서·게이트)
dossier: docs/feedback/inquiries/sim-hil-coding-harness-research.md (§7 수확 게이트, §8 dedup)
interpreter: 셸 기본 python3에 rdflib 있음 — 아래 명령 전부 `python3` 그대로 실행
---
# 판정 — sim-hil B 웨이브 (B-T + B-K1)

**PASS-with-notes.** 게이트 3종 전부 PASS, 개체 delta는 브리프 목록과 1:1 일치(+33, 삭제 0),
닫힌 값 shape 2종의 이빨을 negative control 8종으로 실증, 신규 24개체 기계적 dedup 스캔
clean, carrier 배선·술어 부여 전수 사실 대조 통과, materialize 무회귀(비-carrier
byte-identical·carrier 순수 추가), 발견성 5질의 전부 최상위 seed. 차단 결함 0, 비차단 note 5.

**형상 전제(검증 스코프 확정):** B-T의 TBox·shapes 부분은 이미 **HEAD 안에** 있다 — commit
`75242d3`(AV W1 land)에 동봉 커밋됨 (`git log -S "ho:ApprovalScopeShape" -- ontology/` → 75242d3
단일). 워킹트리 diff(6 abox 파일, +340/-5줄, -5는 전부 리스트 개행 재배열)는 B-T의 ABox 부분
(부착지점 개념 9 + 기존 guardrail 첫 사용처 9곳)과 B-K1 전체다. 중간점 332는 커밋 경계로
관측 불가하며, 최종 상태 323→356만 판정 대상으로 삼았다(브리프 산술과 일치: 323+9+24=356).

## 1. 게이트 3종 + delta 재집계 — PASS

```
python3 tools/validate.py        → PASS ("all 356 individuals reachable from a Harness",
                                   SHACL/reachability/capabilities/assemblyOrder/capacityFit/registryDrift ✓,
                                   duplicate label 0)
python3 tools/lint_uniformity.py → PASS (tokenEstimate/prefix/language/maturity/definition/text-cap 전부 0 violation)
python3 tools/check_determinism.py → PASS (3질의 × 4 runs, 1 distinct pack)
```

HEAD baseline: `git worktree add --detach <scratch>/wt-head HEAD` → 그 트리에서 validate =
**PASS @323**. delta **+33** = rdflib abox subject symdiff로 재집계: **NEW 33개가 브리프
목록과 정확히 일치**(B-T 개념 9: c-guardrail-attachment + c-attach-{input,dialog,retrieval,
execution-pre,execution-post,output,session,turn} / B-K1 24: gr-7 + fp-3 + scn-1 + wfs-4 +
wf-approval-gated + chan-2 + c-6), **REMOVED 0**, 생존 subject의 HEAD 트리플 소실 **0**
(순수 additive). 워킹트리의 ontology 변경은 이 웨이브 6파일뿐(병행 lane은 tools/plane-editor
전용) — HEAD-대조 diff가 이 웨이브에 온전히 귀속된다.

## 2. 닫힌 값 shape의 이빨 — 8/8 기대대로 (scratch 전용, 디스크 무오염)

in-memory 주입(union+OWL RL 재추론 후 pyshacl, validate.py와 동일 설정). 재현:
`<scratchpad>/negctl.py` (lib.HO/lib.ID_CORE 네임스페이스 필수 — Note-5 함정).

| ctl | 주입 | 기대 | 실측 |
|---|---|---|---|
| A | gr-nodestruct approvalScope "everything" | FAIL sh:in | ✓ FAIL (closed-set message) |
| B | gr-nodestruct approvalScope 2번째 유효값 "task-output" | CONFORM (repeatable) | ✓ CONFORM |
| C | h-coding environmentFidelity "sandbox" | FAIL sh:in | ✓ FAIL |
| D | h-coding environmentFidelity "mock"+"production" | FAIL maxCount | ✓ FAIL |
| E | h-coding environmentFidelity "production" 단일 | CONFORM (**vacuous-pass 대조군**: 현재 사용처 0인데 C/D가 값 때문에 FAIL임을 증명) | ✓ CONFORM |
| F | gr-cite attachesAt id:gr-lang (Guardrail = range 위반) | FAIL | ✓ FAIL — 간접: OWL RL이 object를 Concept로 타이핑 → ConceptConnectivityShape "Orphaned concept" 발화 (Note-2) |
| G | gr-cite attachesAt 미존재 IRI | FAIL | ✓ FAIL ×2 (prefLabel minCount + orphan) |
| H | 신규 attach 개념을 broader 없이 저작 | FAIL orphan | ✓ FAIL |

ApprovalScopeShape는 `sh:targetSubjectsOf`(주어 불문 발화), environmentFidelity 제약은
HarnessShape 내부이나 rdfs:domain ho:Harness + prp-dom이 비-Harness 주어도 끌어들인다.

## 3. 중복·drift — 기계 스캔 clean, 지정 쌍 전수 변별 확인

기계 스캔(`<scratchpad>/dedup.py`, 신규 24 vs 전 그래프): 교차-클래스 포함 **duplicate
prefLabel 0**, **altLabel 충돌 0**, 정의문 token-Jaccard **≥0.30 단 1쌍** =
c-attach-execution-pre↔-post **0.424** — 의도된 거울 형제(tool-call 경계의 blocking/reacting
면, 정의문에 명시) = drift 아님. §8 "신설 금지" 표의 기존 개체 열은 어느 것도 재저작되지
않음(wave-H 신규는 전부 승인된 계획 인벤토리).

지정 쌍 — **emit되는 값 안에서** 변별 확인 (emit 층: Guardrail=promptText,
Channel/WFS/Workflow/Scenario=skos:definition — materialize.py:469/413/492/484/723 확인):

- `gr-safe-halt` ↔ `cap-safe-halt`/`fp-envelope-exit`: promptText에 3층 구분 명문
  ("Distinguished by layer from id:cap-safe-halt(WHAT) / fp-envelope-exit·-severe(ENVELOPE
  exits) / this rule(every stop trigger)") — 층 주장은 그래프 사실과 일치(fp 두 행이
  cap-safe-halt를 providesCapability, verification.ttl:197,206). ✓ emitted.
- `gr-dual-approval` ↔ `gr-human-checkpoint`(1인 vs 2인 독립)·`gr-cross-validation`(agent
  peer review vs 인간 authorisation): promptText ✓.
- `fp-unanswered-approval` ↔ `fp-envelope-exit`(범위 이탈 vs 범위 내 침묵)·`fp-refer-to-expert`
  (권한 초과 vs 권한자 무응답)·`fp-dismissal-vs-decline`(창 내 vs 종료 후): skos:definition에
  전부 있으나 **FailurePolicy는 definition 미emit**(Note-1). emit되는
  failureCondition끼리는 자체 변별됨("no response within its declared response window" vs
  "ends without acceptance: dismissed or expired…, or explicitly declined").
- `chan-approval` ↔ `chan-agent-user`: definition에 lane 구분("may ride the same physical
  medium, but…") ✓ emitted. `chan-elicitation` ↔ `gr-user-elicitation`(정책 vs 도관 계약)·
  `chan-approval`(정보 요청 vs 허가 요청): definition ✓ emitted.
- `wfs-clarification-round` ↔ `gr-user-elicitation`: 정의는 wfs-intent-analysis와 변별하고
  guardrail과의 관계는 `ho:stepGuardedBy`로 그래프-명시(단계 vs 규칙 = 층이 다름) ✓.
- `gr-stopping-condition`/`gr-auto-reply-budget` ↔ `gr-bounded-iteration`: 세 방향 전부
  promptText에 상호 변별(run 자체 vs 교정 루프 vs 주기적 인간 재삽입) ✓.
- `wfs-output-review` ↔ `wfs-integrate-gate`: definition "machine validation pass vs human
  judgment" ✓ emitted.

## 4. 재량 신설 `wf-approval-gated` — 타당 (독립 판정)

- **필요성 참**: WorkflowStep의 유일한 비-고아 배선은 `hasComponent ∘ hasStep` 롤업 —
  4개 신규 step은 host workflow 없이는 그래프에 못 들어간다(기존 검증들에서 반복 실증된
  구조 사실).
- **기존 workflow 편입 = 사실 왜곡 맞음**: wf-multiagent(stepOrder 1..8의 dispatch 제어
  흐름)·wf-compose-harness(조성 절차)에 HIL 게이트 4단계를 끼우면 그 workflow의 실제 제어
  흐름 주장이 거짓이 되고 stepOrder 축이 교란된다. 나머지(wf-react·wf-harness-evolution 등)는
  주제 불일치.
- **최소성 참**: 신설은 workflow 1개뿐, 내부는 인벤토리의 4 step + 기존 role/guardrail IRI
  재사용, 정의문이 wf-multiagent의 integrate-gate와 상보 관계까지 명시. carrier(h-multiagent)
  결합의 사실성은 §5.

## 5. carrier 배선의 사실성 — 통과 (W1 note N1 관점에서 개선)

- **h-multiagent = declaring carrier** 주장 근거 전수 확인: `ho:autonomyTier
  id:tier-per-plan-approval`(harnesses.ttl:169) + gr-human-checkpoint 기 바인딩 + envelope
  observable이 "user endpoint … responsive"를 선언(:493) — per-plan 인간 게이트를 실제 운영.
  운영 CLAUDE.md와 대조: wip→rename 상태 마커·verified lane 리뷰·사용자 승인 후 적용·문서
  채널 질의 = wf-approval-gated 4단계와 각각 대응. **모순 없음.** W1 note N1(선언 하네스
  문서에 규율 미출현)의 반대 방향 — 이번엔 선언 하네스 문서가 실제로 바뀌는 쪽을 택했고
  그 의도를 harnesses.ttl 주석에 명시. 개선 맞음.
- **library carrier 2건 사유 타당**: gr-dual-approval → h-workspace-synthesis(2인 독립 인간
  승인자를 staff한 하네스가 없음 — 사실; gr-cross-validation 옆 = 인간-authorisation 유사물
  배치) / gr-stopping-condition·gr-auto-reply-budget → h-harness-factory(gr-bounded-iteration
  옆, turn budget 선언 하네스 없음 — 사실). 사유가 배선된 쪽·안 된 쪽에 일관 적용됨.

## 6. 출처·라이선스 게이트(§7) — 통과

정의문 전부 자기 문장(원문 문장 이식 없음). 추가된 그래프 텍스트에서 프레임워크 고유명사
grep(LangGraph/HumanLayer/AutoGen/CrewAI/NeMo/MCP/A2A/Claude/…) **0건**(유일 히트는
"re-approaches" 안의 camel 부분열 = 오탐). 라벨 중립성: prefLabel 전부 중립. dct:source
부재는 중앙 중립 부품 관례상 요구 아님(recipe lane 의무). Note-5의 어휘 인접만 비차단.

## 7. B-T 술어 사용의 사실성 — 전수 대조 통과

- `ho:attachesAt` 실사용 15곳(주석 2 제외) 전수 직독 대조: 기존 9(nodestruct·human-checkpoint
  =execution-pre / cite·lang·structured-output=output / bounded-context=retrieval /
  user-elicitation=dialog / envelope-check·-unknown=input) + 신규 6(dual-approval·
  plan-evidence=execution-pre / rejection-feedback=dialog / stopping-condition·
  auto-reply-budget=turn / safe-halt=session) — 각 promptText에서 값이 실제로 읽힘. ✓
- `ho:approvalScope` 5곳(nodestruct=tool-call, human-checkpoint=plan, dual-approval=tool-call,
  plan-evidence=plan, auto-reply-budget=turn) — 전부 promptText 직독 근거 있음, 승인 게이트가
  아닌 guardrail에는 부여 안 함(날조 금지 준수). ✓
- **미부여 결정 정당**: gr-resume-idempotency 무-attachesAt(작업 설계 제약이지 파이프라인
  지점이 아님 — 주석 명시) / c-attach-execution-post 공석(주석 명시 + skos:broader로 연결
  유지, ctl-H가 이 배선 규약의 이빨을 증명). ✓
- 경계 규칙 4건 전부 정의문에 명문: approvalScope↔approvalUnit(값 어휘 disjoint),
  attachesAt↔hookEvent, environmentFidelity↔envelope/autonomyTier, retrievalPolicy↔
  readTiming/readScope/activationCondition. **T4 domain=Harness의 EnvironmentSpace 기각
  사유 타당**: id:env-space는 실재 전체 singleton — fidelity를 얹으면 mock/replica마다 env
  개체 신설이 필요해져 모델 의미와 충돌; autonomyTier와 대칭 배치가 정합.

## 8. materialize 무회귀 — 통과

7 하네스 전수, HEAD worktree vs 워킹트리 `diff -r`:
- **비-carrier 4종(h-coding/h-peer-mesh/h-research/h-support): CLAUDE.md·MANIFEST
  byte-identical**, lock만 individualCount 323→356 1줄(구조적 필연).
- **carrier 3종 순수 추가(삭제 0줄)**: h-multiagent **+45줄**(operating-rules 3 + workflow
  블록 13 + channel 8 + Error handling 표 11 + Test scenarios 10), h-workspace-synthesis
  +2(dual-approval·safe-halt 불릿), h-harness-factory +2(auto-reply-budget·stopping-condition
  불릿). +45줄 내용 정독 — 운영 규약과 모순 없음(§5), 문중 id: 참조는 라벨로 정상 해소.
- dangling `id:` **0**: diff 추가줄의 id: 참조 69건(주석 포함) 전건 그래프 선언과 대조 → 미해소 0.

## 9. coverage (source→representation) — 닫힘

계획 §2층 wave-H 인벤토리 26항목(gr7+fp6+wfs4+chan2+c6+scn1): **landed 23** + 재량 1
(wf-approval-gated, §4) = 24. **미랜딩 3 = fp-approval-gate-decay·fp-error-compaction·
fp-pause-format-drift** — 계획 문서 적용결과 절에 "나머지 1티어 fp 3종·wave-S·wave-C·
recipe는 후속 웨이브"로 **명시 기록됨** ✓ (rubber-stamping 축은 이번에 scn-oversight-efficacy
+ c-rubber-stamping이 개념·픽스처 층으로 부분 선점, fp 행 자체는 이월 — 정합). B-T층:
T1–T4 + 첫 사용처 + registry 무변경(신규 클래스·접두사 0 = PREFIX_MAP·INSTANCE_CLASSES
무변경이 옳음, registryDrift ✓) + ONTOLOGYSTYLE §3 갱신(4술어 위치·판별자 diff 확인) 전부 매핑.

## 10. 발견성 — 5/5 질의 최상위

`python3 tools/retrieve.py "<q>" --format json` — 신규 노드가 seed 최상위 + carrier가 base
후보로 복귀, budget 절단 없음(≤900은 skip-not-break):

| 질의 | top seeds | base 후보 | 신규 in-pack |
|---|---|---|---|
| human approval gate before consequential actions | c-human-in-loop 9.9 / gr-human-checkpoint 8.73 / wf-approval-gated 8.1 | h-multiagent 5.89 | 7 |
| human-in-the-loop oversight of an autonomous agent | gr-auto-reply-budget 5.94 / HITL·HOTL·HOOTL 5.4 | h-harness-factory·h-multiagent | 10 |
| interrupt the run and resume after human approval | wfs-interrupt-resume 6.3 / gr-resume-idempotency 6.03 | h-multiagent 4.25 | 7 |
| stopping conditions and budget for an unattended autonomous run | gr-auto-reply-budget 7.02 / gr-stopping-condition 6.48 | h-harness-factory 4.74 | 4 |
| rejection with reasons and retry feedback | gr-rejection-feedback 5.4 / fp-dismissal-vs-decline 2.7 | h-multiagent 3.65 | 4 |

## Notes (비차단 5)

- **N1 — FailurePolicy 판별절 미emit**: materialize의 Error-handling 표는
  failureCondition/recoveryStrategy만 emit하고 skos:definition(판별절 소재)은 안 싣는다.
  판별절은 그래프 텍스트(retrieve pack에는 실림)이고 emit되는 condition끼리도 변별되므로
  비차단 — 단 fp 판별을 산출 문서에서 읽어야 하는 소비자가 생기면 렌더러 확장 후보.
- **N2 — attachesAt range 이빨은 간접**: 전용 shape 없음. 위반은 ConceptConnectivityShape가
  "Orphaned concept" 메시지로 잡는다(ctl-F/G) — 효과는 있으나 메시지가 원인(범위 위반)을
  가리키지 않음. 전용 sh:class shape는 선택적 개선.
- **N3 — gr-safe-halt 스코프 편차(기록)**: inspection의 B 브리프 초안은 "B 제외, A 이월
  (W1 land 후 참조 재사용)"이었으나 B-K1에 포함 landed. 이월 사유의 전제(W1 선행)가 이미
  충족됐고 promptText가 cap/fp와의 3층 구분을 emit 텍스트로 수행하며 채택 권한은
  orchestrator("채택은 orchestrator") — 편차는 정당하나 계획-대-실행 대조 시 혼동 지점이라
  여기 기록.
- **N4 — T3/T4 실사용 0**: retrievalPolicy·environmentFidelity의 ABox 사용은 이번 웨이브 0
  (계획대로 — T3 값은 wave-S의 mem-longterm, T4 첫 선언 하네스는 미정). 이빨은 ctl-C/D/E로
  비-vacuous 증명됨. 첫 실사용 웨이브에서 값-사실 대조만 반복하면 됨.
- **N5 — 어휘 인접(cosmetic)**: altLabel "consecutive auto-reply cap"은 특정 프레임워크
  파라미터 어휘와 인접(일반 영어 단어 조합이라 [지킴] 위반 아님, id는 승인 계획이 고정);
  chan-elicitation의 accept/decline/cancel 3값도 프로토콜 유래 계약의 중립화 재기술(계획
  명시 스펙). 고유명사 유입은 0(§6).

## 재현 명령 요지

```
git worktree add --detach <scratch>/wt-head HEAD   # baseline 323
python3 tools/validate.py ; python3 tools/lint_uniformity.py ; python3 tools/check_determinism.py
# delta: rdflib abox glob 양쪽 로드 → subject symdiff (33/0) + 생존 subject 트리플 소실 0
# negctl: <scratch>/negctl.py — lib.load_graph(reason=True) 복사본에 주입→재추론→pyshacl
# dedup: <scratch>/dedup.py — prefLabel/altLabel 교차 + 정의 token-Jaccard
# materialize: 양 트리에서 7종 --out 후 diff -r ; diff <lock> = individualCount 1줄
# 발견성: tools/retrieve.py "<질의>" --format json × 5
git worktree remove <scratch>/wt-head
```
