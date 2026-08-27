---
status: approved            # 사용자만 approved로 바꾼다
targets: [id:mem-longterm, id:mem-cache, tbox:ho:Memory]
---
# 지식 생산 시점의 장기기억/단기기억 구분

사용자 피드백 (2026-08-27, inspection 세션에서 접수; 원문 전사).

## 제안 내용 (원문)

- 지식을 생산하는 시점에서 장기기억과 단기기억으로 구분함
  - 다음 로직에는 반영하지 않고 필요시에 읽어서 활용할 수 있게 저장해놓은 **장기기억**
  - 로직에 바로 반영되어 저장되지 않은 채 활용되는 **단기기억**

## 해석 (inspection, 판정 아님)

핵심 축은 **지식이 생산되는 시점의 라우팅(write side)**: 새로 생산된 지식이
(a) durable store로 저장되어 이후 필요시 selective하게 소비되는가(장기기억), 또는
(b) 진행 중인 로직에 즉시 반영·소모되고 저장되지 않는가(단기기억).

기존 그래프의 Memory 모델은 **읽기 시점(read side)** 축(`ho:memoryReadTiming` ·
`ho:memoryReadScope` · `ho:memoryActivationCondition`)과 지속성(`ho:memoryPersistence`)으로
tier를 구분한다. 이 제안과의 정합/GAP은 verified 보고 참조.
