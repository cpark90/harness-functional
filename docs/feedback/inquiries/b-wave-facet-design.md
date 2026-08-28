---
status: answered      # inspection 설계 — 사용자 결정(§7) 후 orchestrator가 brief로 채택
kind: design-proposal
targets: [id:scheme, ontology/abox/core/vocab/concepts.ttl, ho:tagged, ho:alternativeOf, tools/retrieve.py]
source: docs/feedback/inquiries/a-wave-candidate-survey.md   # §3 region 변별력 붕괴
---
# B-wave 설계 — backbone 계층 축 (내용 구분에 따른 layered skeleton)

사용자 지시(2026-08-28): "B-wave 계층 축 설계부터 잡아줘". A-wave 후보 탐색에서
**region 변별력 붕괴**가 확인돼(태그 1개 개체 86%, `c-multiagent` 하나가 41개체) 계층화가
A-wave의 전제로 확정된 데 따른 설계다.

**설계 결론 한 줄**: 계층을 **새 루트를 씌워 깊게 만들지 않는다**. `skos:broader`가 검색에서
0.5 감쇠라 깊이를 늘리면 발견성이 절반씩 깎이기 때문이다. 대신 **facet(내용 축)을 개념의
선언 속성으로 두고**, 기존 트리는 그 facet 안에서 유지·정리한다 — 깊이 증가 0, 검색 비용 0,
변별력은 확보.

---

## 1. 측정된 문제 (설계가 풀어야 할 것)

**(가) 최상위에 분할 기준이 없다.** 현행 top 12개가 서로 다른 종류를 섞고 있다:

| 성격 | 현행 top |
|---|---|
| 실천·원리 | `c-agent-methodology`(자식 11) · `c-design` |
| 성질 | `c-autonomy` · `c-safety` · `c-oversight` · `c-traceability` |
| 하네스 부위 | `c-memory` · `c-communication` · `c-operating-envelope` |
| 적용 분야 | `c-softeng` · `c-inforetrieval` |
| 구성 형태(범위) | `c-multiagent` |

같은 층에 "방법"과 "성질"과 "부위"가 섞이면, 새 개념을 어디에 달지가 저자 재량이 되고 표류한다.
계층 설계 문헌의 원칙 그대로다 — **층은 예시가 아니라 판정 규칙으로 정의해야 표류하지 않는다.**

**(나) `c-multiagent`가 버킷이다.** 41개체(태그된 것의 1/3)를 담고, **그중 27개는 그 태그
하나뿐**이다: Role 10 · Agent 5 · Channel 6 · Deliverable 2 · Guardrail 3 · DesignPattern 1.
이 27개는 "멀티에이전트 세계에 속한다"만 말할 뿐 **무엇에 대한 것인지는 말하지 않는다.**

**(다) 교차 판별이 불가능하다.** 태그를 1개만 가진 개체가 **115개**(Guardrail 51 · Role 10 ·
Deliverable 9 · DesignPattern 9 · Channel 6 · AutonomyTier 6 · Agent 5 …). 축이 하나뿐이면
"같은 영역"도 "다른 영역"도 구분할 수 없다.

## 2. 설계 제약 (실측)

| 제약 | 값 | 설계에 미치는 영향 |
|---|---|---|
| `skos:broader`/`narrower` 검색 가중 | **0.5** | 계층을 한 단계 올릴 때마다 개념 간 발견성이 **절반**. 루트를 씌우는 계층화는 비싸다 |
| `ho:tagged` 가중 | 0.7 | 개체↔개념은 가깝고, 개념↔개념은 멀다 |
| 현행 깊이 | 0:12 / 1:36 / 2:20 | 이미 envelope 가지(W1)가 깊이 2를 씀 — 균일하지 않음 |
| `validate.py` 도달성 | "하네스로 가는 경로" 기준 | 개념 **재부모화 자체는 안전**(tagged 엣지가 유지되면 고아 아님) |
| 접두사·파일 | 전부 `c-`, `vocab/concepts.ttl` 한 파일 | registry·파일 이동 없음 |
| 선례 | `abox-taxonomy-reorg`는 **파일 레이아웃** 재조직 | **개념 재부모화 선례는 없음** — 이번이 처음 |

## 3. 설계안 — facet(내용 축)을 선언 속성으로

```
Layer 0 (신설)  facet — 이 개념이 "무엇에 대한" 것인지 선언   ← ho:conceptFacet (깊이 증가 0)
Layer 1–2 (기존) skos:broader 트리 — facet 안에서의 상하위 관계
```

### 3a. facet 5개와 **판정 규칙** (예시가 아니라 규칙으로 정의)

| facet | 판정 질문 | 예 |
|---|---|---|
| **anatomy(구성)** | 하네스의 **어느 부위/부품**을 가리키는가? | memory · communication · operating-envelope |
| **quality(성질)** | 하네스가 **갖춰야 할 성질**인가? | autonomy · safety · traceability |
| **method(방법)** | 따라야 할 **실천·원리**인가? | composition · verify-proceed · reuse-first |
| **domain(영역)** | **적용 분야**인가? | softeng · debugging · inforetrieval |
| **scope(범위)** | 내용이 아니라 **어느 구성 형태에 속하는지**만 말하는가? | multiagent |

`scope`를 별도 facet으로 **명시**하는 것이 핵심이다 — `c-multiagent`가 내용 태그인 척하며
버킷이 된 원인이 "이건 내용 축이 아니다"라고 말할 자리가 없었기 때문이다.

### 3b. 현행 12 top의 facet 배정 (초안 — 판단 3건은 §7 결정)

| 개념 | facet | 비고 |
|---|---|---|
| `c-agent-methodology` | method | 자식 11개 전부 method — 일관 |
| `c-design` | method | 자식(root-cause·simplicity) 일관 |
| `c-autonomy` | quality | |
| `c-safety` | quality | |
| `c-traceability` | quality | 자식(grounding·structural-coverage) 일관 |
| `c-memory` | anatomy | |
| `c-operating-envelope` | anatomy | 자식 5축 = 하위 anatomy, 일관 (W1이 깊이 2를 이미 씀) |
| `c-softeng` | domain | 자식 debugging 일관 |
| `c-multiagent` | **scope** | ★버킷의 정체 — 내용 축이 아님 |
| `c-communication` | anatomy ⚠ | **자식 3개(controlled-vocabulary·report-over-prompt·structured-output)는 method** → facet 불일치, 재부모화 대상 |
| `c-inforetrieval` | domain ⚠ | anatomy로 볼 여지 있음(검색은 하네스 기능) — 결정 필요 |
| `c-oversight` | ⚠ | quality(감독됨)인지 method(감독한다)인지 — 결정 필요 |

**재부모화가 필요한 것은 facet이 부모와 다른 자식뿐**이다(초안상 3개: communication의 자식들).
나머지는 **부모-자식 관계를 그대로 두고 facet만 선언**하면 된다 — 그래서 이 설계의 그래프
변경량이 작다.

### 3c. 왜 "루트를 씌우는" 방식이 아닌가 (기각 근거)

facet을 개념 노드로 만들어 현행 top들의 부모로 두면(= 깊이 +1):
- 모든 개념이 개체로부터 한 홉 멀어져 **개념 간 발견성이 0.5배**가 된다(실측 가중치).
- 팩 예산이 이미 896/900으로 포화 상태라, 발견성 저하는 곧 **관련 개념 누락**으로 이어진다.
- 얻는 것은 "층이 노드로 보인다"는 것뿐인데, 그 정보는 속성 선언으로 동일하게 얻는다.

계층을 **강제 트리로 만들지 않는** 선택은 외부 표준의 판단과도 일치한다 — 시나리오 분류 표준
(ISO 34504)은 "최선의 단일 계층은 없다"며 **태그 조합에 의한 분류**를 택했다.

## 4. 이 설계가 A-wave를 어떻게 푸는가 (region 재정의)

현행 shape은 alternativeOf의 "같은 region"을 **아무 `ho:tagged` 공유**로 정의한다. 그래서
`c-multiagent`를 공유하는 41개체가 전부 한 region이 된다. facet이 서면:

> **같은 region = 판별 facet(anatomy 또는 method) 태그를 공유** — `scope`·`domain` 태그 공유는
> region 근거가 되지 않는다.

shape의 SPARQL 한 곳(`?region` 조건에 facet 필터 추가)만 바꾸면 되고, 이로써
"멀티에이전트라서 같은 영역"이라는 허위 region이 사라진다.

## 5. 단계 (권고 순서)

| 단계 | 내용 | 규모 | 위험 |
|---|---|---|---|
| **B1** | `ho:conceptFacet` 술어 신설(닫힌 값 5) + **68개 개념에 facet 선언** + facet 불일치 자식 재부모화(초안 3개) | 개념만; 개체 무변경 | 낮음 — 깊이·파일·접두사 변화 없음 |
| **B2** | **내용 태그 보강**: `c-multiagent` 단독 27개체에 anatomy/method 태그 1개씩 추가(Role 10·Agent 5·Channel 6·Deliverable 2·Guardrail 3·Pattern 1) | 개체 27 | 중간 — 태그 추가는 검색 랭킹을 바꾼다(전후 팩 비교 필요) |
| **B3** | shape의 region 정의를 facet 기반으로 갱신(§4) | shape 1곳 | 낮음 |
| 이후 | A1(overlapsWith 43쌍) · A3(분해 12개) · anchor/confidence | | |

**B2를 27개로 한정**하는 이유: 태그 1개뿐인 개체는 115개지만, 그중 대다수(Guardrail 51)는
`gr-X → c-X`처럼 **이미 내용 태그**를 갖고 있다. 진짜 결핍은 "scope 태그만 가진" 27개다.

## 6. 파급·게이트

- `validate.py`: 개념 재부모화·태그 추가 모두 도달성 유지(오히려 강화). PASS 유지 필요.
- `lint_uniformity.py`: 접두사 무변경(`c-`), cap 무관(정의 텍스트 안 건드림). 단 **facet 값
  닫힌 집합**은 SHACL `sh:in`으로.
- `retrieve.py`: **B1은 무영향**(깊이 불변), **B2는 랭킹 변화** → 대표 질의 5개의 전후 팩을
  비교해 회귀 여부 판정(누락 노드 0 확인).
- `materialize.py`: 개념은 렌더 대상이 아니므로 byte-identity 유지 예상 — 확인만.
- ONTOLOGYSTYLE `§3`에 `ho:conceptFacet` 블록 + facet 판정 규칙 4줄(저자가 새 개념을 달 때
  참조할 규칙 — 이게 없으면 표류가 재발한다).

## 7. 결정 포인트 (사용자·orchestrator)

1. **facet 5개 구성**을 이대로 갈지 — anatomy / quality / method / domain / **scope**.
   특히 `scope`를 별도 facet으로 인정할지(대안: `c-multiagent`를 해체해 개체마다 내용 태그로
   대체하고 scope facet 자체를 두지 않음 — 더 깨끗하지만 B2 규모가 41로 커진다).
2. **판단 3건**: `c-communication`(anatomy로 두고 자식 3개를 method로 재부모화?),
   `c-inforetrieval`(domain vs anatomy), `c-oversight`(quality vs method).
3. **B2 범위**: 27개(scope 단독)만 vs 41개(c-multiagent 전체) vs 115개(태그 1개 전부).
4. 실행 순서: B1→B2→B3 일괄로 갈지, **B1만 먼저 land**하고 검색 영향이 없는 것을 확인한 뒤
   B2를 별도 wave로 갈지(inspection 권고: **후자** — B2만 랭킹을 바꾸므로 분리하면 회귀
   판정이 쉬워진다).

## 7.5 사용자 결정 (2026-08-28) — "권고대로 진행" → 확정 내역

사용자가 §7을 inspection 권고대로 위임. 명시 권고가 있는 곳은 그대로, 초안만 있는 곳은 초안을
채택하되 근거를 기록한다 (dispatch는 orchestrator):

1. **facet 5개 확정** — anatomy/quality/method/domain/**scope** 그대로. `scope` 별도 인정
   (해체 대안은 B2 규모를 41로 키우고, "내용 축이 아님을 말할 자리"라는 §3a 논거가 유지 이유).
2. **판단 3건 = 초안 배정 채택**: `c-communication`=**anatomy**(자식 3개 controlled-vocabulary·
   report-over-prompt·structured-output은 **method로 재부모화**) · `c-inforetrieval`=**domain**
   (§3b 초안 유지 — "검색은 하네스 기능" 반론은 tool/cap 노드가 이미 anatomy 축을 담당) ·
   `c-oversight`=**quality**(§1 성격 분류표의 원배정 — "감독됨"이라는 성질; method 독해분은
   기존 `c-agent-methodology` 자식들이 담당. B1 리뷰에서 재론 가능으로 표기).
3. **B2 범위 = 27개**(scope 단독 개체만 — §5의 한정 근거 채택; 41/115안 기각).
4. **실행 순서 = B1 선행 land → 회귀 확인 → B2 별도 wave → B3**(명시 권고 그대로. B3 완료
   시 결정 6-(b)의 shape 강화 잔여 필요성 재평가 — decisions 항목 처리 기록 참조).

→ 이 확정으로 본 설계는 **B1 브리프로 채택 가능** 상태다 (orchestrator).

## 8. 부수 관찰

조사 중 `OperatingEnvelope`가 0 → 2로 증가했다(병행 세션이 W1 §4d 하네스 선언을 진행 중).
envelope 하위 개념 25개는 아직 사용 0회이므로, W1이 끝나면 그 25개가 실제로 태그되는지
확인하면 B1의 facet 배정(anatomy)이 옳았는지 자연 검증된다.
