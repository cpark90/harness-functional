# lesson(시행착오 학습) 축 웨이브 검증

---
role: vnv
model: fable (opus rate-limited; CLAUDE.md dispatch-model 규약에서 벗어난 대체 실행)
date: 2026-08-28
verdict: PASS (non-blocking notes N1~N4)
scope: 0cac426에 land된 lesson 축 — c-lesson / gr-lesson-{capture,reuse,promotion} /
  wfs-lesson-capture / fp-repeated-mistake / mem-longterm 보강 / carrier 배선 / CLAUDE.md 문단
---

검증 대상은 워킹트리가 아니라 커밋 `0cac426`(Land parallel-lane wave)에 이미 land된
상태다 — `git status`상 `ontology/`·`CLAUDE.md` clean, 신규 6 노드 전부 HEAD에 존재.

## 1. 게이트 재실행 (verification)

실행한 명령 (repo 루트):

```
/usr/bin/python3 tools/validate.py        → PASS  (all 269 individuals reachable; SHACL/
                                            reachability/capabilities/assemblyOrder/
                                            capacityFit/registryDrift 전부 ✓; dup label 0)
/usr/bin/python3 tools/lint_uniformity.py → PASS  (6축 전부 0 violation)
/usr/bin/python3 tools/check_determinism.py → PASS (4 request × md/json, 1 distinct pack)
```

개체수 269 = 브리프 주장 263→269(+6)과 일치 (신규 6 = c-lesson, gr×3,
wfs-lesson-capture, fp-repeated-mistake).

## 2. Coverage (source→representation) — 요구 구조 요소 6종 매핑

사용자 요구: "시행착오로부터 배우는 내용과 인사이트인 lesson을 온톨로지 및 KG에 추가".

| # | 구조 요소 | 표현 | 증거 |
|---|---|---|---|
| ① | 시행착오(실패·수정) 트리거 | `id:gr-lesson-capture` promptText "fails, is rejected or has to be corrected … The trigger is the correction itself" | guardrails.ttl:264-267 |
| ② | 교훈 내용 3요소 | 같은 promptText "what was attempted, why it failed, and the rule that replaces it" (+ `wfs-lesson-capture` 정의에 동일 3요소) | guardrails.ttl:266, workflows.ttl:114 |
| ③ | 인사이트 보존(저장 계층) | `id:mem-longterm` 정의 꼬리 "the lessons drawn from trial and error (id:c-lesson) are the representative content of this tier" + `tagged id:c-lesson` | memory.ttl:56,62 |
| ④ | 재사용 | `id:gr-lesson-reuse` "Before starting work of a kind that has been attempted before, read the lessons already recorded" | guardrails.ttl:268-271 |
| ⑤ | 승격/일반화 | `id:gr-lesson-promotion` (run 간 RECURRENCE → 사적 노트→공유 부품) + `wfs-lesson-capture` "flag … as a candidate for promotion" | guardrails.ttl:272-275 |
| ⑥ | 재발 시 처리 | `id:fp-repeated-mistake` (condition·recovery 명시) | verification.ttl:121-126 |

**GAP 0.** 원리 자체는 `id:c-lesson`(concepts.ttl:127-131)이 어휘 진입점으로 커버.

**TBox 미확장 결정 독립 판정 = 성립.** CLAUDE.md 게이트가 요구하는 "명시적·수용가능한
사유"의 두 요건 모두 충족: (a) **명시적** — guardrails.ttl:247-257 절 주석에
"NO TBox EXTENSION, DELIBERATELY: an ho:Lesson class was considered and rejected …
instance data about one execution, not a reusable part"로 기록됨(조용한 건너뜀 아님).
(b) **수용가능** — 이 repo의 대전제(중립 부품 라이브러리: 실행 인스턴스 데이터 비저장)와
정합하고, 요구의 6개 구조 요소가 전부 기존 어휘(Concept/Guardrail/WorkflowStep/Memory/
FailurePolicy)에 실제로 담겼음을 위 표가 보인다. `ho:Lesson` 없이 담기지 않는 잔여는
"개별 lesson 인스턴스의 계보(어느 lesson이 어느 부품으로 승격됐나)" 하나뿐인데, 그것이
바로 사유가 배제한 run-인스턴스 데이터다 — out-of-model 정당 (N3).

## 3. 중복·drift 점검 — 근접 노드 5종 기계 대조

- vs `gr-generalize-not-overfit`(guardrails.ttl:144-145 "ONE piece of feedback … at the
  moment"): `gr-lesson-promotion` promptText가 **명시 Distinct-from**으로 축을 박음
  (트리거=RECURRENCE across runs / 행위=사적 저장소→공유 부품 이동). 판별절이 emit되는
  promptText 안에 있음 — 실질 중복 아님.
- vs `gr-root-cause`(:71-72): 같은 promptText가 "fixes where a fault actually lies"로
  명시 변별. 결함 위치 수정 vs 지식 이동 — 직교.
- vs `gr-traceability`(:49-50): change record·식별자 규율 vs 경험 기록. wf-harness-evolution
  안에서도 wfs-change-log(guardedBy traceability)와 wfs-lesson-capture(guardedBy capture)로
  단계가 분리되고, wfs-lesson-capture 정의가 state vs experience 축을 문장으로 변별.
- vs `mem-longterm`: `gr-lesson-reuse` promptText가 "that a durable tier is consulted when
  its trigger fires (id:mem-longterm) is the storage side of the same discipline, not this
  rule"로 명시 변별(agent 의무 vs 저장 측). 중복 아님.
- vs `roleMemoryPolicy`(전 role, roles.ttl): 겹침은 "종료 전 재사용 지식 write-back"
  타이밍뿐. gr-lesson-capture는 **트리거(수정 자체)+기록 3요소**를 고정 — 변별은 성립하나
  emit되지 않는 절 주석(guardrails.ttl:259-263)에만 명문화 (N2, 클래스가 달라 near-synonym
  노드 drift는 아님).
- fp 축: `fp-repeated-mistake` 정의가 `fp-agent-failure-retry`와 "ONE unit of work failing
  inside a single run vs a failure already met in an earlier run"으로 명시 변별
  (verification.ttl:123). 실질 중복 0.

## 4. 정합성 스팟체크

- **c-lesson broader**: `skos:broader id:c-agent-methodology` + `skos:related id:c-memory`.
  developer의 사유("c-memory는 tier 아키텍처로 좁게 고정") 검증 — `id:c-memory` 정의가
  실제로 "the firmware/cache/long-term tiers distinguished by read-timing and
  persistence"(concepts.ttl:55)로 좁고, c-agent-methodology는 "cross-cutting operational
  disciplines"(:75)로 lesson 원리와 정확히 부합. c-lesson 정의 안에 "Distinct from
  id:c-memory" 절도 있음. 컨벤션 정합(형제 c-composition/c-reuse-first 등과 동일 패턴).
- **wf-harness-evolution 4단계**: stepOrder 1(wfs-audit)→2(feedback-route)→3(change-log)→
  4(lesson-capture) 연속, dependsOn 사슬 1←2←3←4 단조. hasStep 4개 갱신 확인.
  Deliverable 미신설 사유 검증: 이 워크플로의 다른 3 step도 stepProduces/stepConsumes 전무
  — "lone Deliverable이 DAG를 half-specified로 만든다"는 주석 사유(workflows.ttl:106-111)
  사실과 일치.
- **carrier 배선**: `hasMemory`는 전 7 harness 중 **h-multiagent 유일**(harnesses.ttl:134)
  → "durable store를 실제 보유한 harness에 규칙을 묶는다"는 배선 사유(harnesses.ttl:103-114
  주석)가 그래프 사실과 일치하고, 다른 6 harness 미배선도 같은 논리로 정당(기판 미보유).
  `fp-repeated-mistake`는 wf-harness-evolution이 사는 h-harness-factory(:311)에 —
  harnesses.ttl:286-292 주석이 rules/error-row 분리 사유를 기록. byte-identity 관례 예외
  (h-multiagent 산출 문서 변경)도 주석에 의도로 명시됨.
- **tokenEstimate 재산정**: 전 노드 선언값 == promptText/definition chars//4 **정확 일치**
  (capture 95/95, reuse 115/115, promotion 143/143, mem-longterm 144/144,
  wf-harness-evolution 160/160, wfs-lesson-capture 115/115, fp-repeated-mistake 172/172).
  c-lesson은 Concept이라 tokenEstimate 없음 = §1c 범위 밖, 정상.

## 5. 발견성 (retrieve 4종, `/usr/bin/python3 tools/retrieve.py "<q>" --format json`)

| 질의 | top seeds (label, score) | pack 내 lesson 노드 |
|---|---|---|
| "learn lessons from trial and error so the harness improves across runs" | **Lesson learning 11.25**, promotion 3.87 | c-lesson, gr×3, mem-longterm, fp-repeated-mistake (6/6) |
| "capture what went wrong and promote recurring mistakes into standing rules" | **promotion 10.8, capture 9.45**, c-lesson 6.75, wfs 5.4 | 4 |
| "agent that consults past mistakes before starting similar work" | **reuse 10.44**, c-lesson 4.05 | 2 |
| "the same failure happens again in a later run" | **fp-repeated-mistake 5.85** | 2 |

전 질의에서 신규 노드가 top seed, base 후보는 h-multiagent(= 규칙 carrier)로 수렴.
budget_used 889~899/900 — retrieve는 skip-not-break라 절단 아님(대상 노드 전부 admit).

## 6. 운영↔저장 쌍

- CLAUDE.md "에이전트 역할" 절 문단(CLAUDE.md:86-91): 트리거(실패·기각·수정) = capture
  promptText와 일치, 3요소(무엇을/왜/대신) 일치, promotion(guardrail·instruction·error row)
  = promotion promptText의 "a guardrail, an instruction or an error-handling row"와 일치.
  reuse는 "읽기는 이미 세션 시작 시 하므로"로 기존 메모리 규약에 접합 — gr-lesson-reuse의
  착수 전 소비 의무와 모순 없음. 노드 id 포인터 3개 정확.
- `materialize.py h-multiagent` 산출 CLAUDE.md Operating rules에 3 bullet 렌더 확인
  (capture/promotion/reuse; 인라인 id: 참조는 라벨로 해석 — "Generalize, do not overfit",
  "Long-term memory"). `materialize.py h-harness-factory` 산출에도 evolution loop 4단계
  step + guarded by + error-handling 표의 repeated-mistake 행 렌더 확인.
- **dangling `id:` 토큰 0**: abox 전 파일(주석 포함)+CLAUDE.md의 id: 토큰 전수 대조 —
  미선언 참조 0. (스캔이 잡은 `ct-well-formed-skill-`은 주석의 glob `id:ct-well-formed-
  skill-*`가 잘린 오탐, harnesses.ttl:273 — N4.)

## Notes (non-blocking, 수정하지 말고 기록만)

- **N1 (substrate cross-carrier)**: `wfs-lesson-capture` 정의의 "write them into the
  durable store"는 이 step이 roll-up되는 h-harness-factory엔 hasMemory가 없어 산출 문서
  안에서 기판이 같은 문서에 없다 — 선례(wfs-audit→gr-structural-coverage cross-carrier)와
  동일 유형이고 규칙 본체 carrier(h-multiagent)는 기판 보유라 비차단.
- **N2 (변별절 위치)**: gr-lesson-capture ↔ roleMemoryPolicy의 변별("WHEN이 아니라 WHICH
  experience+3요소")이 emit되지 않는 절 주석에만 명문. promptText 자체의 "The trigger is
  the correction itself, not the topic"이 실질 변별을 하므로 비차단.
- **N3 (out-of-model 잔여)**: 개별 lesson 인스턴스의 승격 계보는 표현 불가 — TBox 미확장
  사유가 정확히 배제한 run-인스턴스 데이터라 정당.
- **N4**: dangling 스캔의 `ct-well-formed-skill-`는 주석 glob 오탐.

## 판정

**PASS.** verification(3 게이트 green) + validation(coverage 6/6 매핑·GAP 0, TBox 미확장
사유 성립, 실질 중복 0, 배선 사유가 그래프 사실과 일치, 발견성 top-seed, 운영↔저장 쌍
정합). 수정 요구 사항 없음 — N1~N4는 기록만.
