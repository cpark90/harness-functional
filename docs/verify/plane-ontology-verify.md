---
subject: "지식 평면 분리(knowledge-plane separation)의 온톨로지 반영 — developer 결론 '신설 0' 판정"
target: [id:pat-knowledge-plane-separation, ontology/abox/core/spec/patterns.ttl, ontology/abox/core/vocab/concepts.ttl]
source: docs/feedback/inquiries/tool_suggestion.md (v0.2, inspection 검토 §A [필수])
verdict: pass-with-notes
graph_baseline: 269 individuals · validate PASS · lint PASS · determinism PASS
date: 2026-08-28
role: vnv (판정 전용 — 온톨로지 무편집)
---

# 판정 — 지식 평면 분리 부품 반영 (developer 결론 = 신설 0)

인터프리터는 전부 `/usr/bin/python3` (rdflib/pyshacl/owlrl 보유), cwd = repo root.

## 0. 사실 확인 — 이번 dispatch의 온톨로지 변경량 = 0

```
$ git status --short ontology/          → (출력 없음)
$ git diff --stat HEAD -- ontology/     → (출력 없음)
$ git show HEAD:ontology/abox/core/spec/patterns.ttl | grep -c pat-knowledge-plane-separation
1
$ git log --oneline -S pat-knowledge-plane-separation -- ontology/abox/core/spec/patterns.ttl
1406d87 Land annotation stages 1-3 + Phase 0 map (approved plan applied)
```

즉 대상 노드는 **이미 HEAD에 land**되어 있고(`1406d87`, patterns.ttl 7줄 변경분에 포함),
이번 developer dispatch는 그래프를 건드리지 않았다. 재dispatch 원인에 대한 developer의
사실 주장도 확인됨 — `git log -1 --format=%B 1406d87` 본문은 stage 1–3(alternativeOf/
overlapsWith/Anchor, cap 260, 1-admit)·Phase 0만 열거하고 `pat-knowledge-plane-separation`을
**언급하지 않는다**(미언급이 미착지로 보였다는 설명과 정합).

판정 대상은 따라서 **"신설 0" 결론의 타당성 + 이미 land된 노드가 소스 요구를 충족하는가**이다.

## 1. verification — 구조 게이트 3종 (실행 출력 그대로)

```
$ /usr/bin/python3 tools/validate.py
  loaded graph: 7134 triples (post-reasoning)
  ✓ SHACL — conforms, no orphaned/under-specified nodes
  ✓ Global reachability — all 269 individuals reachable from a Harness
  ✓ Capability satisfaction / assemblyOrder / capacityFit(5 agents) / registryDrift(28 classes)
  ✓ no duplicate labels within a class
  PASS
$ /usr/bin/python3 tools/lint_uniformity.py
  ✓ tokenEstimate(§1c) 0 / naming(§2) 0 / language(§1d) 0 / maturity 0 / definition 0 / text cap(§1c) 0
  PASS
$ /usr/bin/python3 tools/check_determinism.py
  PASS — every request projects a byte-identical pack across processes.
```

세 게이트 모두 PASS. (⚠ `registered but not instantiated: Anchor, Candidate, Example,
HarnessComponent`는 validate가 스스로 harmless로 분류하는 기존 항목 — 이번 판정 대상 아님.)

## 2. verification — 노드 단위 규약 실측

노드 전문은 `ontology/abox/core/spec/patterns.ttl` 34–36행.

| 축 | 기준 | 실측 | 판정 |
|---|---|---|---|
| 타입/네이밍 | §2 `ho:DesignPattern` → `pat-` | `pat-knowledge-plane-separation` | ✓ |
| 언어 | §1d prefLabel/definition/altLabel = 영어 | 린터 language 검사 0 violation | ✓ |
| tokenEstimate 정확도 | §1c chars/4 | definition **973 chars → 973//4 = 243**, 선언 `ho:tokenEstimate 243` | ✓ 정확히 일치 |
| text cap | §1c ≤ 260, 목표대역 130–260 | 243 (여유 17) | ✓ (상단 경계 근접 — Note-2) |
| predicate 순서 | §3 순서 1·2·3·6·7 | `a → prefLabel → altLabel×2 → definition → tagged → tokenEstimate → maturity` — 인접 `id:mode-*`·`id:pat-peer-mesh`와 동일 배열 | ✓ |
| maturity | 신규는 draft | `"draft"` | ✓ |
| 어휘 drift | 노드가 쓰는 `ho:` 술어/클래스가 전부 TBox 선언분인가 | rdflib 재측: 미선언 술어 **0개**, `ho:DesignPattern` 선언 확인 | ✓ untyped edge 없음 |

### anti-orphan
`pat-knowledge-plane-separation --tagged--> id:c-bounded-context --broader--> id:c-agent-methodology`
로 backbone에 접속. reachability(무향 BFS, `validate.py:67-71`)에서 269/269 도달 — 고아 없음.
인바운드 엣지는 0(어떤 harness도 `ho:appliesPattern`하지 않음)이지만, 이는 이 저장소의 정상
상태다: DesignPattern 14개 중 **8개가 미적용**(neutral parts library 원칙 — 부품은 사용처보다
먼저 존재한다). 결함 아님.

### anti-drift (근사 동의어 대조)
그래프 전수에서 `plane|context|isolat|separat|knowledge` 라벨 매치를 뽑아 정의문을 나란히 대조:

- `id:c-bounded-context` "Bounded context projection" = *never ingesting the whole store, only a
  request-scoped **budget-capped** projection* → **얼마나(HOW MUCH)** 축.
- `id:pat-knowledge-plane-separation` = *partition context by **KIND** of knowledge* → **무엇이
  (WHICH KIND)** 축. 정의문에 판별절이 명문화되어 있다: "Complements id:c-bounded-context, which
  bounds HOW MUCH of a store enters a context: this fixes WHICH KIND enters, and its planes are
  knowledge kinds, not id:c-execution-mode's runtime lanes."
- `id:gr-execution-separation`(계획/실행 분리), `id:c-execution-mode`(런타임 토폴로지),
  `id:dlv-context-pack`(산출물)은 각각 다른 축 — 중복 아님.

→ **근사 동의어 아님.** validate의 dup-label 검사도 클래스 내 중복 0. 판별절이 sibling 2개
(`c-bounded-context`·`c-execution-mode`)를 모두 명시하고 있어 이 저장소의 anti-drift 관례
(“Distinguished from …” 절)를 따른다.

## 3. validation — 소스 커버리지 감사 (§A 4요소 + 인접 절)

소스: `docs/feedback/inquiries/tool_suggestion.md` inspection 검토 **§A [필수]** — "5번째 평면
'지식 그래프'를 추가: 진리 판정=SHACL+validate(결정론), 원자 단위=individual, 앵커=IRI,
쓰기 규약=plan_upsert 게이트. 평면 상한 4~6개 내(5개)." + 같은 문서 §2.1/§4.1/§4.2/§4.4/§6.1–6.3.

| # | 소스 구조 요소 | 표현(노드 문면) | 판정 |
|---|---|---|---|
| A1 | 5번째 평면 "지식 그래프" | "comments, design rationale, schemas, interfaces, **a typed knowledge graph**" (5개 열거) | 매핑 |
| A2 | 진리 판정 = SHACL/validate | "each is adjudicated differently (social resolution, argument, schema or type check, **shape validation**)" | 매핑(중립화) |
| A3 | **원자 단위 = individual** | 직접 대응 문장 **없음** (근접: "views are assembled per request by query"; "a read still returns every plane at once") | **미매핑 — 사유 명시(Note-1)** |
| A4 | 앵커 = IRI | "carries its own **native stable identifier**" | 매핑(중립화 — `id:`/`core:` 표기를 넣지 않은 것이 neutral-parts 원칙에 부합) |
| A5 | 쓰기 규약 = 평면별 커밋 게이트 | A2의 "adjudicated differently"가 I3(평면별 커밋 조건)을 흡수 | 매핑(중립화) |
| A6 | 평면 상한 4–6 (§5.3/§7 리스크) | "the link plane is the standing cost, so keep **plane count and link types few**" | 매핑 |
| §4.2 I1 | 평면 간 직접 참조 금지 | "couple ONLY through a link plane of typed edges, never by quoting one inside another" | 매핑 |
| §4.2 I2 | 뷰 미저장·질의 조립 | "views are assembled per request by query, never stored" | 매핑 |
| §4.2 I3 | 평면마다 다른 쓰기 규약 | A2/A5와 동일 문면 | 매핑 |
| §6.1 | 저장 레이어링 ≠ 컨텍스트 레이어링 | "layering the store achieves nothing if a read still returns every plane at once" | 매핑 |
| §6.2 | 평면별 툴 스코핑 | "tools are scoped to the plane in hand" | 매핑 |
| §6.3 | 읽기 응답의 평면별 원자 단위 | A3와 동일 항목 | Note-1 |
| §6.4 | 교차 평면 일관성 담당 역할 | 노드 밖. inspection 처리 권고가 "온톨로지 반영이 필요한 부분은 **A의 5번째 평면 정의뿐**이며 나머지는 도구 층"으로 명시 귀속 | out-of-model(사유 명시) |

**11/13 매핑 + 2 사유 명시.** 어휘 범주 부재로 인한 TBox 확장 트리거는 없다(DesignPattern
하나로 §A가 요구한 "평면 정의"를 담는 데 충분하며, 신규 Concept를 만들었다면 §4에서 보듯
`c-bounded-context`와의 근사 동의어 위험이 즉시 발생했다).

**따라서 "신설 0"은 GAP 회피가 아니라 골든룰 2(근사 동의어 신설 금지) 준수로 판정한다** —
소스가 요구한 표현이 실제로 기존 노드 문면에 존재함을 위 표로 실증했고, 미매핑 2건은 모두
소스(inspection) 자신이 도구 층으로 귀속시킨 항목이다.

## 4. validation — 발견 가능성 + 기존 질의 퇴행

### (a) 신설/대상 노드 발견성 — 4개 질의 전부 seed rank 1

```
$ /usr/bin/python3 tools/retrieve.py "<질의>" --format json
```

| 질의 | seed rank/score | 팩 emit |
|---|---|---|
| knowledge plane separation context isolation by knowledge kind projection view | **1 / 18.45** | ✓ (35 nodes, 898/900) |
| fifth plane knowledge graph individuals anchored by IRI adjudicated by SHACL shape validation | **1 / 9.00** | ✓ (25 nodes, 895/900) |
| editor that separates design rationale comments schemas and interfaces into layers | **1 / 4.95** | ✓ (30 nodes, 898/900) |
| tool scoping per plane so a read does not return every kind of knowledge at once | **1 / 13.95** | ✓ (18 nodes, 899/900) |

`ho:tagged` 하나(=`c-bounded-context`)만으로도 발견성이 확보됨 — 별도 Concept 신설 불요라는
developer 판단을 실측이 지지한다.

### (b) 퇴행 격리 비교 (node-removal overlay)

워킹트리가 병행 편집 중이라 HEAD worktree 비교는 무의미하므로, **현재 트리 복제본에서 이 노드
블록(1278 chars)만 제거**한 그래프를 만들어 같은 코드로 대조했다(그래프만 상이, 코드 동일).

```
$SB/noplane 에 ontology/ tools/ catalog-v001.xml 복제 → patterns.ttl에서 해당 노드만 삭제
현재 트리 tools/retrieve.py  vs  $SB/noplane/tools/retrieve.py  로 같은 질의 14개 대조
```

| 결과 | 질의 수 |
|---|---|
| 팩 **완전 동일**(노드 집합·순서·budget_used) | 8 / 14 — determinism 게이트 4개 질의 전부 포함 |
| 차이 발생(= 이 노드가 admit되는 질의) | 6 / 14 |

차이가 난 6개는 전부 **이 노드가 새로 admit되면서 다른 노드를 밀어낸** 경우다(노드가 사라진
게 아니라 예산이 재분배됨). 예:

```
bounded context projection budget cap for retrieval  nodes 31 vs 40, gained=[Knowledge-plane separation], lost 10
context rot defense when the store grows             nodes 20 vs 32, gained=[Knowledge-plane separation], lost 13
separation of planning and execution roles           nodes 26 vs 33, gained=[Knowledge-plane separation, Bounded context projection], lost 9
```

**무결성 관점의 퇴행(노드 소실·엣지 끊김·budget 초과)은 0**이다. 다만 밀어냄의 규모가 커서
아래 Note-2로 낸다.

## 판정

**pass-with-notes.**

- verification: validate/lint/determinism 3종 PASS, §1c·§1d·§2·§3 규약 전부 충족,
  tokenEstimate가 chars/4 실측과 **정확히 일치**(243=243), drift 0, orphan 0.
- validation: 소스 §A의 요구 요소 11/13이 노드 문면에 실재하고 나머지 2건은 소스 자신이
  도구 층으로 귀속시킨 항목. 4개 질의에서 seed rank 1. 기존 질의 무결성 퇴행 0.
- "신설 0" 결론은 **타당** — 요구 표현이 이미 존재하므로 신규 저작은 근사 동의어 중복이 됐다.

### Note-1 (수용 가능 사유 · 잔여 항목) — "원자 단위 = individual"의 문면 부재
§2.1 표와 §6.3이 지식 그래프 평면의 원자 단위를 *individual(노드)* 로 못박았지만 노드 문면에는
대응 문장이 없다. 사유는 명시적이다(inspection §정합확인 3이 "§6.3 원자 단위 응답 ≡ 팩의 노드 단위
emission + `ho:tokenEstimate` 예산"으로 **기존 도구 구현에 귀속**). silent skip 아님 → GAP으로
올리지 않는다. 다만 A4("carries its own native stable identifier")와 같은 중립 층위의 한 절
("and a read returns that plane's own atomic unit")이 자연스럽게 들어갈 자리이므로, **다음에 이
노드를 손댈 일이 있으면** 후보로 남긴다. 단 여유는 **17 token뿐**(243/260)이라 추가 시 기존
문장 압축이 동반되어야 한다.

### Note-2 (projection quality · 규약 위반 아님) — 243 token 노드의 예산 점유
`retrieve.py:179-182` `token_cost`는 기본 예산 900 대비 이 노드에 **243 token(27%)** 을 청구한다.
격리 비교 결과 14개 질의 중 6개에서 이 노드가 admit되며 **5–13개 노드를 밀어냈다**. 특히
`separation of planning and execution roles` 질의에서는 어휘 "separation"만으로 rank 3(3.6)에
들어와, 정작 주제 노드인 `Separated plan and execution`(2.7, rank 8)보다 앞서면서 9개를 밀어냈다.
어떤 [지킴] 규칙도 위반하지 않으며(§1c 목표대역 130–260 안), 6개 질의 중 5개는 주제상 admit이
타당하다. 그러나 "가장 넓은 어휘 표면 × 두 번째로 큰 token cost"(그래프 내 tokenEstimate 최댓값
2위: `mode-standing-service` 252 → 이 노드 243)라는 조합은 투영 품질 관찰 항목이므로 orchestrator/
inspection 라우팅용으로 남긴다.

### Note-3 (선재 · 이번 dispatch 범위 밖 · 별도 lane 라우팅 권고)
Note-2의 비대칭을 키우는 선재 조건을 실측했다(HEAD 기준, 이번 편집과 무관):
- **텍스트가 있는데 `ho:tokenEstimate`가 없는 abox 노드 120개** — `token_cost`가 이들에게
  **일괄 15 token**을 청구한다. 실제 chars/4가 60을 넘는 노드가 그중 **61개**
  (`h-workspace-synthesis` 245, `role-benchmarker` 238, `role-coordinator` 215, `chan-peer` 208,
  `pat-peer-mesh` 192 …). §1c [지킴] 범위(promptText 보유 4종 + Tool/Workflow)상 **위반은 아니지만**,
  정직하게 243을 선언한 노드가 15만 청구하는 이웃들에게 밀리는 구조가 된다.
- **선언값과 chars/4가 2 token 넘게 어긋난 노드 109개**(예: `as-execution-mode` 선언 24 vs 실측 164,
  `mode-agent-teams` 190 vs 228, `gr-human-checkpoint` 88 vs 149). §1c는 "`ho:tokenEstimate`와 같은
  chars/4 산정"이라 적고 있으므로 예산 정확도(anti-rot 방어선) 축의 점검거리다.
이 두 항목은 이 dispatch의 편집 범위 밖이며, 별도 브리프(예산 정확도 lane)로 다루기를 권고한다.

## 재현 명령 요약

```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py
/usr/bin/python3 tools/lint_uniformity.py
/usr/bin/python3 tools/check_determinism.py
/usr/bin/python3 tools/retrieve.py "knowledge plane separation context isolation by knowledge kind projection view" --format json
# 격리 비교: ontology/ tools/ catalog-v001.xml 를 scratch로 복제 → patterns.ttl에서
#            id:pat-knowledge-plane-separation 블록만 삭제 → 두 tools/retrieve.py로 같은 질의 대조
```
