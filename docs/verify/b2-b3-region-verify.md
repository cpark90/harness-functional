---
status: verified
verdict: pass-with-notes
role: vnv
model: fable (opus rate-limited)
date: 2026-08-28
target: B2 — c-multiagent 단독 27개체 내용 태그 보강 / B3 — AlternativeOfSharedAnchorShape region 재정의(판별 facet 필터)
criteria: [docs/feedback/b-wave-backbone-layering.md (approved, "(B) → (A)"), docs/feedback/inquiries/b-wave-facet-design.md, docs/verify/b1-concept-facet-verify.md §3.3 (40질의 기준선), ONTOLOGYSTYLE.md §3]
baseline_commit: 3524653 (ontology/ 내용 = 9a0483d와 동일 — 9a0483d 이후 ontology/ 접촉 커밋 0, `git log HEAD -- ontology/`로 확인)
---
# B2+B3 — 검증·평가 판정

**판정: PASS-with-notes (차단 0 / 비차단 5).** 게이트 3종 초록, 27건 태그 전수
사실성 성립(재량 3건 반증 시도 후 모두 유지, 1건은 개념 정의문 후속 권고), 랭킹 회귀
독립 재현에서 developer 수치 4종 전부 검산 일치, B3 negative control 5종 전부 기대대로
뒤집힘/유지, 연합 안전성 3종 성립 + staging recipe 3종 union PASS, 범위 위반 0.

**요청받은 한 줄 결론**: **B3 region 재정의는 유사도 하한 없이도 허위 region을 실제로
제거한다** — scope 단독·scope+quality 공유 허위쌍이 구쉐이프 vacuous-PASS에서 신쉐이프
FAIL로 뒤집히고 진짜 anatomy/method 공유쌍은 그대로 conforms이므로, 제거 기제는 유사도
계측이 아니라 "region 앵커 자격을 판별 facet으로 제한"하는 것이며, 잔여 위험은 허위
region의 통과가 아니라 **진짜 대안쌍의 fail-closed 차단**(잔존 35 + pat-orchestrator-workers)
쪽으로만 남는다.

실행 인터프리터: `/usr/bin/python3` (셸 기본 python3에 rdflib 없음). repo root에서 실행.
스크립트: 세션 scratchpad `…/168523b2-…/scratchpad/vnv/{capture,compare,b3_controls}.py`.

---

## 1. 게이트 3종 + 편집 footprint

| 게이트 | 명령 | 결과 |
|---|---|---|
| 구조 | `/usr/bin/python3 tools/validate.py` | **PASS** — all **364** individuals reachable, SHACL ✓ (신쉐이프 포함) |
| 균일성 | `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** — 7축 0 violation (conceptFacet §3 포함) |
| 결정성 | `/usr/bin/python3 tools/check_determinism.py` | **PASS** — 4질의×{md,json}, 4런 1 distinct pack |

**footprint 정확 일치**: `git diff --stat HEAD -- ontology/` = 정확히 6파일 —
abox 5파일(guardrails 3 / channels 6 / roles 15(=role 10+agent 5) / workflows 2 /
patterns 1 = **태그 27줄**, 전부 `ho:tagged id:c-multiagent` → `…, id:c-X` 1개씩 추가)
+ shapes 1파일(`AlternativeOfSharedAnchorShape` 블록만: 주석·sh:message·SPARQL 2줄,
`sh:targetSubjectsOf ho:alternativeOf` 불변). diff에서 `conceptFacet|skos:broader` 출현
3건은 **전부 shapes 블록 내부**(abox의 facet·계층 무접촉). `ontology/` 아래 untracked 0.
`tools/*.py` HEAD 대비 무변경(`git diff --name-only HEAD -- tools/ | grep -v plane-editor`
= 빈 출력) → §4 회귀 측정에서 코드 고정·그래프만 상이가 성립. 병행 세션 소유분
(`tools/plane-editor/**`, B1 후속 문서)은 읽기만 했고 이 판정에 오귀속하지 않았다.

**27 개체군 동일성 (기계 증명)**: pre-B2 그래프(HEAD worktree)에서
`{s | tags(s)=={c-multiagent}}`를 재계산 → **27개**, 편집된 27 subject 집합과
**정확히 일치**(symmetric diff = ∅). 신설 개념 0, 건너뛴 개체 0.

## 2. B2 태그 사실성 전수 판정 (27/27 성립)

10개 부여 개념의 정의문과 27개체의 정의문·promptText를 전부 직접 읽어 대조했다.
verbatim 근거가 있는 것(대다수):

- **c-dispatch ×8**: role-{research,analyst,implementer,planner,strategist,curator} 정의가
  전부 "A work-performing role, **dispatch-invoked only**"로 시작 ↔ 개념 "act only when
  dispatched … never run standalone". dlv-dispatch-brief("hands to the worker it
  dispatches")·gr-opus-required("Spawn quality-critical **dispatch roles**") 포함. 선례
  gr-dispatch-execution→c-dispatch(HEAD:guardrails.ttl:86) 기존재.
- **c-verify-proceed ×3**: role-vnv "returns a verdict on **confirmed state**" ↔ 개념
  "advancing only on confirmed state" (verbatim). agent-vnv·dlv-verified-result("admitted
  … only after it checks out") 정합.
- **c-online-agent ×2**: role-inspection/agent-inspection "ONLINE STANDING role … consumes
  work from its durable channels … on its own cycle" ↔ 개념 문구 그대로.
- **c-bounded-context**: agent-developer "budget-capped retrieval pack" ↔ 개념
  "budget-capped projection" (verbatim). **c-synthesis**: agent-synthesizer "function is
  synthesis (cross-checking and compiling the integrated result)" verbatim.
- **c-delegation ×2**(orchestrator 계열): role-orchestrator "Performs no substantive work
  itself" ↔ 개념 문구 그대로. **c-agent-methodology**: gr-execution-separation promptText
  "in every coordination topology, orchestrator-workers and agent-teams alike" =
  topology-독립 discipline → 자식(c-dispatch/c-delegation)으로 좁히지 않은 것이 옳다.
  **c-deliverable-artifact**: gr-absolute-paths "every agent and session **resolves the
  same file**" ↔ 개념 "lets a consumer **resolve exactly which artifact** a producer
  wrote". **c-pattern-taxonomy**: pat-peer-mesh는 "coordination topology … a NEW topology
  is added as a new ho:DesignPattern" — 개념의 "tag the DesignPatterns describing agent
  work-flow architecture" 그대로이고, 기존 pat-* 7개가 이미 이 태그를 갖는 선례와 동형.

**재량 3건 반증 시도 결과**:

- **① 채널 6개 uniform c-communication — 유지 (정보 손실 아님).** (a) 사실성: 개념 정의가
  "tag components governing message form, **channels** and reporting discipline" — 채널
  6개는 문자 그대로 그 부류라 각각에 참. (b) 논거 성립: 채널 정의문들이 **서로를 명시
  대조**한다(chan-workspace "Distinct from central dispatch … and from a message mesh";
  chan-task-board "The **fourth hand-off medium** after files, direct messages,
  spawn/return") — 즉 이 6개가 그래프에서 가장 명백한 미래 alternativeOf 군이고, 태그를
  개체별 method로 쪼개면(예: chan-dispatch→c-dispatch) 그 진짜 쌍이 B3 region 불일치로
  FAIL한다. §5의 TRUE-anatomy 대조군(chan-workspace↔chan-peer conforms)이 이 논거의 실증.
  (c) 정보 손실 실측 부재: 특화 method 의미는 gr-*·role 태깅이 이미 지니고(c-dispatch
  taggee 8), 40질의에서 채널이 **탈락한 질의 0**·admit 증가 3질의("communication between
  agents over durable channels"에 채널 4개 신규 진입 등), "role division dispatch and
  delegation" 질의도 채널 6개 전부 유지.
- **② role-coordinator → c-delegation — 유지하되 후속 권고 (27건 중 유일한 arguable).**
  개념의 **원리 내용**("coordination 주체는 substantive work을 하지 않고 실행은 전부
  worker로 흐른다")은 coordinator 정의("performs none of the execution itself -- the
  execution is carried out by execution agents spawned separately")에 정확히 참이다. 또
  coordinator 정의가 role-orchestrator를 명시 대조하므로(central-dispatch lead vs
  coordinating peer) 두 role이 같은 region에 놓이는 것은 **미래의 정당한 alternativeOf
  쌍을 여는 방향으로 옳다**. 다만 개념 정의문의 주어가 "the **user-facing orchestrator**"로
  좁게 쓰여 있어 문면 독해로는 긴장이 남는다 — developer 자신의 기각 규칙("한 clause라도
  부정되면 탈락")을 엄격 적용하면 걸릴 수 있는 지점이나, c-cross-validation 기각과 달리
  여기서 어긋나는 것은 원리의 **내용**이 아니라 **전형 주어의 지칭**이다. → 태그 교체가
  아니라 **c-delegation 정의문의 주어 일반화**(예: "the coordinating lead")를 후속으로
  권고 (Note-1, 비차단, B2 범위 밖 개념 정의 수정이라 별도 dispatch 사안).
- **③ vnv 계열 c-cross-validation 기각 — 기각 타당.** 개념이 "each finding is **graded by
  severity**, only the top band forcing rework"를 요구하는데, role-analyst 정의가
  "id:role-vnv, whose … return is a **pass/fail verdict rather than a graded finding
  list**"라고 명시 부정한다. 채택된 c-verify-proceed는 role-vnv 정의의 "verdict on
  confirmed state"와 verbatim 일치 — 올바른 판정.

## 3. facet 규칙 준수

부여 개념 10종의 `ho:conceptFacet` 그래프 검산: **c-communication / c-deliverable-artifact /
c-pattern-taxonomy = anatomy, 나머지 7 = method** — 전부 판별 facet이라 27건 모두 region을
실제로 부여한다. B2는 facet·`skos:broader`를 건드리지 않았다(§1 diff 증거). validate의
SHACL(ConceptFacetShape 포함)·lint의 conceptFacet 체크 모두 초록.

## 4. 랭킹 회귀 독립 재현 (B1 §3.3 기준선 대비)

방법: `git worktree add --detach` HEAD(=pre-B2 ontology) vs 워킹트리, **동일 40질의**
(B1 검증 세션 원본 리스트와 developer 리스트가 40=40 동일함을 기계 대조), 각 트리의
자기 `tools/`로 별 프로세스 실행(PYTHONHASHSEED=0), pack md/json sha 비교 후 노드 단위 분해.

| developer 자기보고 | 독립 실측 | 판정 |
|---|---|---|
| 26/40 byte-identical | **26/40** | 일치 |
| c-multiagent 단독 27→0 | **27→0** | 일치 |
| 판별 태그 없는 개체 62→35 | **62→35** (tagged 모수 150 불변) | 일치 |
| 상위권(top-5 candidates) 이탈 0 | **0** (전 40질의) | 일치 |

변경 14질의 분해: relevance 재점수화는 **신규 태그 개체의 상승뿐**(agent-vnv 3.69→4.73,
agent-inspection 1.64→2.13, agent-developer 4.72→5.43 — tagged 엣지가 seed 매칭을 넓힌
의도된 기제), 나머지는 예산 내 admission 교체로 on-topic 개체가 들어오고 tail filler
(mc-opus·aoi-*·as-*·dlv-base-template)가 밀리는 방향. 3질의는 노드·점수 동일에 edges
섹션 1줄 차이(신규 tagged 엣지 렌더)뿐.

**developer flag 질의 독립 판정 — "how should agents exchange information and status":
개선이다(퇴행 아님).** 실측: PRE 14노드→POST 27노드(budget 900→898).
gr-declared-routes·gr-lang·gr-standard-terms는 **탈락하지 않았고 relevance도 불변**
(2.362 유지) — pack 내 위치만 2·3·4→8·9·10으로 내려갔으며, 그 위로 올라온 것은 질의가
직접 묻는 **채널 개체 5개**(chan-dispatch/orchestrator-inspection/peer/workspace/
task-board)다. 질의 "어떻게 정보·상태를 교환하는가"의 1차 답은 교환 기구(채널)이고 규율
guardrail은 유지된 채라, 정보 손실 없는 주제 적합도 상승이다. 유일 탈락은
mode-standing-service 1건(주변부). 다른 13질의에도 실질 퇴행(주제 노드 소실·점수 하락·
상위권 이탈) **0건**.

## 5. B3 negative control 독립 재현 (인메모리, 디스크 무오염)

OLD shape = `git show HEAD:ontology/shapes/harness-shapes.ttl` (기준 커밋 **3524653**;
9a0483d 이후 ontology/ 접촉 커밋이 없어 그 사이 끼어든 커밋 0 — `git log HEAD --
ontology/shapes/`로 확인). NEW = 워킹트리. 같은 reasoned union에 쌍 주입(대칭 양방향),
위반은 sh:message 키워드 "SAME region"으로만 집계(합성 노드의 무관 shape 발화 배제).

| 쌍 (공유 태그→facet) | OLD | NEW |
|---|---|---|
| **허위-scope만**: agent-developer↔agent-inspection ({c-multiagent:scope}) | conforms (**vacuous-pass**) | **FAIL** (region viol 4) |
| **허위-scope+quality**: role-benchmarker↔role-auditor ({c-multiagent:scope, c-oversight:quality}) | conforms (**vacuous-pass**) | **FAIL** (4) |
| 진짜-method: role-research↔role-implementer ({c-dispatch:method, +scope}) | conforms | **conforms** |
| 진짜-anatomy: chan-workspace↔chan-peer ({c-communication:anatomy, +scope}) | conforms | **conforms** |
| region 없음: tool-editor↔gr-cite (공유 ∅) | FAIL | **FAIL** |

viol 4건 = 대칭 술어 양끝 focus × 양방향 materialise — B1 판정의 동일 실측과 정합.

## 6. 연합 안전성

`b3_controls.py` 연합 probe 3종 (recipe NS `id/recipes/probe/`):

- **F1**: facet 없는 recipe-local Concept 주입(alternativeOf 미선언) → region 위반 **0**
  (`targetSubjectsOf`라 선언된 쌍에만 발화 — facet-less 로컬 개념 자체는 위반 아님).
- **F2**: facet 없는 로컬 Concept만 공유하는 쌍에 alternativeOf 선언 → **FAIL** (앵커 자격
  없음 — 의도된 fail-closed).
- **F3**: 그 로컬 Concept에 `ho:conceptFacet "method"` 선언 → **conforms** — developer의
  "하위 repo가 facet을 선언하면 region이 정상 작동" 주장 실증.

**staging recipe 3종 직접 재실행**: `staging/harness-recipes/`에서
`HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=…/recipes/<name>
/usr/bin/python3 central/tools/validate.py` (central 심링크 → 이 워킹트리 = **신쉐이프 +
B2 태그로 검증됨**) → hil-approval **PASS**(union 375 = 중앙 364+11, union 실로드 확인) /
eval-user-sim **PASS** / coding-swe **PASS**. 회귀 없음.

## 7. 잔존 35의 성격과 보수적 안전성 판정

잔존 35 프로필: **quality-only 25**(gr-cite·gr-grounding·gr-traceability 등 quality
guardrail + tier-* 6) / domain-only 7(tool-* 5, h-coding·h-research·h-support 포함) /
quality+scope 2(role-auditor·role-benchmarker) / domain+quality 1. B1 예고(35, 대부분
quality guardrail)와 일치.

**"region 없으면 alternativeOf 선언 불가 = 보수적으로 안전" 해석은 성립한다.** 근거:
(a) 현 그래프 `alternativeOf` 실사용 **0쌍** → 즉시 깨지는 것이 없고, (b) 차단의 비용은
"선언 전에 내용 태그 1개를 먼저 저작"이라는 추가 작업뿐인 반면 통과의 비용은 허위
region(drift) 승인이라 비대칭이 차단 쪽을 지지하며, (c) §5에서 차단이 fail-closed로
실증됐다. 다만 이 상태의 **실비용이 있는 구체 후보**를 셋 적어 둔다(전부 승인 범위 밖,
후속 결정 "B2를 quality-only까지 확장할 것인가"의 실측 근거):

- `tool-editor`↔`tool-lint-gated-edit` — 공유 태그 c-softeng(domain)뿐. 가장 그럴듯한
  미래 진짜 대안쌍인데 region이 없어 선언이 막힌다.
- `chan-approval`·`chan-elicitation` — 태그 c-human-in-loop(quality)뿐이라 **Channel 8개 중
  이 2개만 c-communication region 밖** (승인된 27에 포함되지 않아 옳게 미접촉). 미래의
  채널 간 대안 선언 시 비대칭.
- `pat-orchestrator-workers` — 아래 §8.

## 8. 범위 준수

- 승인 범위(27) 밖 태그 확장 **0**: abox diff의 tagged 변경은 정확히 27줄이고 §1의 개체군
  동일성 증명이 이를 닫는다. 신설 Concept 0, facet·broader 접촉 0.
- **범위 밖 발견 2건은 보고대로 미조치로 남아 있다 (옳은 범위 규율)**:
  ① `pat-orchestrator-workers` 태그 0 확인(현 파일 실측 — prefLabel+definition뿐;
  reachability는 validate PASS로 무해). 단 유의: 짝인 pat-peer-mesh는 이제
  c-pattern-taxonomy region을 갖는데 orchestrator-workers는 태그 자체가 없어, **이 그래프의
  가장 정석적인 대안쌍(pat-peer-mesh↔pat-orchestrator-workers)이 현재로선 B3 shape에
  막힌다** — fail-closed라 안전하나, 후속 태깅 1줄(c-pattern-taxonomy)로 풀리는 사안이므로
  다음 wave 결정에 포함 권고 (Note-5).
  ② 잔존 35 미조치 확인(§7) — 승인 확장 대기 상태 그대로.

## Notes (전부 비차단)

1. **c-delegation 정의문 주어 일반화 권고** (§2-② — 태그는 유지, 개념 정의가 "the
   user-facing orchestrator"로 좁아 coordinator 적용이 문면상 긴장; "coordinating lead"류로
   일반화하면 해소).
2. Channel region 비대칭: chan-approval/chan-elicitation 2개만 c-communication 밖 (§7).
3. tool-editor↔tool-lint-gated-edit — region-less 진짜 대안 후보의 대표 실례 (§7).
4. "exchange information" 질의의 guardrail 하강은 위치 하강일 뿐(탈락·점수 하락 0) 개선으로
   판정 (§4).
5. pat-orchestrator-workers 무태그로 정석 패턴 대안쌍이 잠재 차단 — 후속 1줄 태깅 권고 (§8).

## 재현 절차

```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py && /usr/bin/python3 tools/lint_uniformity.py && /usr/bin/python3 tools/check_determinism.py
git diff --stat HEAD -- ontology/            # 6파일 footprint
S=<scratchpad>/vnv
git worktree add --detach $S/wt-pre HEAD
PYTHONHASHSEED=0 /usr/bin/python3 $S/capture.py $S/wt-pre/tools $S/pre.json
PYTHONHASHSEED=0 /usr/bin/python3 $S/capture.py $PWD/tools $S/post.json
/usr/bin/python3 $S/compare.py $S/pre.json $S/post.json     # 26/40 + 분해
/usr/bin/python3 $S/b3_controls.py                          # §5 표 + §6 F1~F3
cd staging/harness-recipes && for r in hil-approval eval-user-sim coding-swe; do
  HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/$r \
  /usr/bin/python3 central/tools/validate.py; done
```
