---
source: docs/feedback/memory-production-time-classification.md
verdict: apply-with-changes   # 개념은 대부분 이미 표현됨; 소규모 적용 2건(altLabel + write-side 축)만 남음
targets: [id:mem-longterm, id:mem-cache, tbox:ho:Memory]
kind: ripple-analysis
graph_baseline: 245 individuals, validate.py PASS
---
# 검증 보고 — 지식 생산 시점의 장기/단기기억 구분

사용자 제안을 현행 그래프에 실측 대조. 요지: **두 기억의 실체는 이미 개체로 존재**하고
(`id:mem-longterm` · `id:mem-cache`), 제안이 새로 가져오는 것은 **분류 축 하나** —
읽기 시점이 아닌 **지식 생산(write) 시점의 라우팅** — 뿐이다.

## 현행 대응물 실측 (이미 있는 것)

`ontology/abox/core/state/memory.ttl`의 3-tier 모델 (모두 `id:h-multiagent`에
`ho:hasMemory`로 결합, anti-orphan 충족):

| 제안 용어 | 기존 개체 | 정합 근거 |
|---|---|---|
| **장기기억** | `id:mem-longterm` "Long-term memory" | readTiming=`conditional` + persistence=`durable` + readScope=`selective` + activationCondition. 정의 "NOT read on every execution … consults only the relevant portion when a defined condition is met" = "다음 로직에는 반영하지 않고 필요시에 읽어서 활용"과 **사실상 동일 서술** |
| **단기기억** | `id:mem-cache` "Cache memory" | persistence=`ephemeral`(저장되지 않음) + readTiming=`task-continuous`(진행 중 로직에 바로 반영·소모) |
| (제안 밖) | `id:mem-firmware` | 사용자 이분법 밖의 제3 tier(always-loaded baseline). 이분법은 **새로 생산된 지식**의 라우팅이므로 저작된 baseline인 firmware와 충돌하지 않음 — tier 축소 불필요 |

- **발견성 실측**: `retrieve.py "agent memory: long-term stored … vs short-term …"` →
  seed 1위 "Long-term memory"(12.6), "Cache memory"도 seed 포함(2.7). 단 **"short-term"
  문자열로는 mem-cache가 직접 매칭되지 않음** — prefLabel이 "Cache memory"뿐이라
  사용자 용어(단기/short-term)로는 랭킹이 낮다(2.7 vs 12.6).
- **write side의 현재 위치**: 지식 생산·저장 시점 규율은 Memory tier가 아니라 각 Role의
  `ho:roleMemoryPolicy` **free-text**에만 존재("writes only its own role-scoped memory at
  session start/end" 등). tier 스키마에는 write 축 술어가 **없음**.

## GAP (제안이 실제로 추가하는 것)

1. **[G1] write-side 축 부재**: `ho:Memory`의 술어 4종은 전부 read side(readTiming/
   readScope/activationCondition)+persistence. "생산된 지식이 이 tier로 **언제/어떻게
   들어가는가**"를 말하는 술어가 없다. 제안의 본질인 "생산 시점 구분"을 그래프가
   1급으로 표현하지 못함 — 소규모 **TBox 확장** 후보:
   `ho:memoryWriteTiming` (닫힌 값 예: `"immediate-apply"`(생산 즉시 로직에 반영,
   저장 없음 — cache) / `"deliberate-store"`(생산 시 저장만 하고 다음 로직에는 비반영 —
   long-term) / `"authored"`(운영자가 저작 — firmware)). 값 3개·개체 3개에 각 1 triple.
2. **[G2] 용어 발견성**: `id:mem-cache`에 `skos:altLabel "Short-term memory"` 부재 →
   사용자 표준 용어(단기기억)로 검색 시 매칭 저하(위 실측). altLabel 1 triple로 해소.
   (`id:mem-longterm`은 prefLabel이 이미 "Long-term memory"라 해당 없음.)

## 비-GAP (하지 말 것)

- **새 Memory 개체 추가 불필요** — 단기기억을 mem-cache와 별개 개체로 만들면
  near-synonym 드리프트(CLAUDE.md Golden rule 2 위반). 기존 개체에 축·라벨만 얹는다.
- **firmware 제거/이분법 강제 불필요** — 제안은 생산 지식의 라우팅이므로 3-tier와 양립.

## 적용 계획 (승인 시 orchestrator→developer dispatch)

1. TBox: `ho:memoryWriteTiming` 추가(정의에 생산 시점 라우팅 명시, shapes에 sh:in 닫힌 값).
2. ABox: mem-cache/mem-longterm/mem-firmware에 writeTiming 각 1 triple +
   mem-cache에 `skos:altLabel "Short-term memory"`; 두 정의에 생산 시점 문장 1개씩 보강.
3. vnv: validate.py PASS + retrieve.py "short-term" 재검색으로 랭킹 상승 확인.

파급 위험: 낮음. 신규 술어는 optional(기존 개체에 sh:minCount 강제 없이 시작 가능하나,
3개체 전부 부여하므로 minCount 1로 조여도 무방 — shapes 강도는 developer 재량이 아니라
brief에 명시할 것). 기존 read-side 술어·소비자(`retrieve.py`·materialize)는 비접촉.
