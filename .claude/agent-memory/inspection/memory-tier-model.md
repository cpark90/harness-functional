# Memory tier 모델 지도 + 생산시점(write-side) 축 감사

- 실체 위치: `ontology/abox/core/state/memory.ttl` — 3-tier(`id:mem-firmware`/`mem-cache`/
  `mem-longterm`), 전부 `id:h-multiagent`에 `ho:hasMemory` 결합. TBox 술어는
  `harness.ttl` L720대: memoryReadTiming/Persistence/ReadScope/ActivationCondition.
- **축 함정**: 이 술어 4종은 전부 **read side**+persistence. "생산된 지식이 tier로
  언제 들어가는가"(write side)는 스키마에 없고 Role의 `ho:roleMemoryPolicy` free-text에만
  산재 — 기억 관련 피드백 대조 시 read/write 축을 분리해서 볼 것.
- **용어 매핑**: 사용자 "장기기억"=mem-longterm(정의 거의 동일 서술), "단기기억"=mem-cache
  (ephemeral+task-continuous). 단 "short-term" 검색은 prefLabel "Cache memory"라 랭킹 저하
  (2.7 vs 12.6 실측) — 사용자 용어와 prefLabel이 다르면 **altLabel GAP**으로 잡는 패턴.
- 판정 사례: `docs/feedback/verified/memory-production-time-classification.md`
  (apply-with-changes; G1=ho:memoryWriteTiming TBox 확장, G2=altLabel).
