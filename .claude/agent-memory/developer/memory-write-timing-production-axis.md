# Memory write-timing (생산 시점 라우팅) — read축 옆에 write축 얹기

사용자 제안 "장기/단기기억"을 반영한 저작. 실체(`mem-firmware`/`mem-cache`/`mem-longterm`)는
이미 있었고 **새 개체 없이 축 1개만** 추가했다 — 새 Memory 개체는 near-synonym drift(golden
rule 2). 재사용 가능한 패턴 정리.

## read/write 짝 술어 패턴
- 기존 판별자가 전부 read side(`memoryReadTiming`/`ReadScope`/`ActivationCondition`)+
  `memoryPersistence`뿐이면, "생산된 지식이 **언제 이 tier로 들어가는가**"는 표현 불가 —
  free-text `ho:roleMemoryPolicy`로 새던 축. 대칭 술어 `ho:memoryWriteTiming` 1종으로 해소.
- 닫힌 값 3종 = tier와 1:1: `"immediate-apply"`(cache, 생산 즉시 반영·미저장) /
  `"deliberate-store"`(long-term, 저장만 하고 현재 로직엔 미반영 → 후속 run의 trigger가 읽음) /
  `"authored"`(firmware, running agent가 생산하지 않고 운영자가 사전 저작).
- **닫힌 값은 늘 2곳에 선언**한다: TBox `skos:definition` 안의 값 열거 + shapes `sh:in`.
  한쪽만 고치면 조용한 doc-lag. 강도(`sh:minCount 1` vs optional)는 **개체 전수 부여 여부**로
  결정 — 3/3 부여라 minCount 1로 조임(설계 결정이라 brief에서 지정받아야 함, developer 재량 X).

## doc-lag 지점 (같은 dispatch에서 함께)
1. `ONTOLOGYSTYLE.md §3` — 클래스 고유 판별 데이터 프레디킷의 자리는 **원래 규정이 없었다**
   (scenarioKind/hookEvent 등도 미등재). 이번에 [권장] 1항 신설: 5~6번 뒤·7번(공통 데이터)
   앞에 모으고 **한 축의 read/write 짝은 인접**(readTiming→writeTiming→persistence→
   readScope→activationCondition). abox 실제 관례와 일치(판별자는 `ho:tagged` 앞).
2. shapes의 `MemoryShape` 위 설명 주석("BOTH its read-timing and persistence" → 3 discriminators).
3. abox `state/memory.ttl` 파일 헤더 주석의 tier 3줄 요약(축 이름 열거).
- TBox `ho:Memory` **클래스 definition**도 "distinguished by WHEN read / HOW LONG persists"라
  여전히 read축만 말한다 — brief 범위 밖이라 미수정, 후속 후보로 남김.

## 발견성 = prefLabel 아닌 altLabel
`mem-cache` prefLabel이 "Cache memory"뿐이라 사용자 표준 용어 "short-term"으로 랭킹 저조
(판정 문서 실측 2.7). `skos:altLabel "Short-term memory"` 1 triple + 정의 보강 후 동류 질의에서
rel 14.85(Long-term 16.2 바로 뒤). altLabel은 retrieve만 읽고 materialize는 안 읽어 산출 불변.

## 부수효과 체크리스트
- 정의 보강 → **tokenEstimate 재산정 필수**(stale은 validate/lint가 못 잡음). 여기선
  chars(prefLabel+altLabel+definition+activationCondition)/4를 5단위 올림: cache 55→105,
  longterm 80→150. 텍스트 캡(§1c 260 tok, def+promptText)은 108/94로 여유.
- `ho:Memory` 인스턴스는 **중앙 3개뿐**(`grep -rn "a ho:Memory" --include=*.ttl`) → minCount 1을
  조여도 recipe closure 안전. 새 필수 축을 추가할 땐 항상 이 전수 grep을 먼저.
- materialize는 memory 술어를 렌더하지 않음 → CLAUDE.md byte-identical. 변하는 건 MANIFEST의
  합계 `tokenEstimate`뿐이고 빌드 산출물은 git 미추적이라 회귀 없음.
