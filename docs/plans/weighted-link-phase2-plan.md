# 계획 — 확률적 지식 연결 2단계 (대량 이전)

orchestrator 계획 문서. 사용자 결정 원본은 `docs/feedback/block-anchor-intent-restore.md`
("사용자 결정" 절), 1단계 판정은 `docs/verify/weighted-link-phase1-verify.md`
(PASS-with-notes, **2단계 진입 = 조건부 GO**).

## 무엇을 옮기는가

`skos:broader` **70** + `ho:tagged` **224** = **294개 crisp 엣지**를 `ho:Link`로 이전한다.
초기값 규칙(1단계에서 확정): **`linkWeight 1.0` + `weightOrigin "asserted"`** — 저작 행위가
완전 소속을 단언한 것이므로 1.0으로 진입하되, **`asserted`는 보호되지 않아** 측정이 정제할 수
있고, 사람이 확정·수정한 값(`curated`)만 재측정이 건너뛴다.

## 진입 조건 (둘 다 충족해야 착수)

1. **F-1 해소** — `tools/plane-editor/check_links.py`·`link-store/links.json`의 폐기 어휘 소비
   제거(병행 세션 lane). `validate.py`가 `ontology/` 밖을 보지 않으므로 중앙 게이트로는 영구
   미검출인 위반이다. 그 세션의 **어휘 파생 wave**가 green + 양방향 성질(어휘 추가/은퇴에 게이트
   판정이 따라 바뀜)을 세우면 충족.
2. **1단계 커밋** — F-1 해소 후 land. 미커밋 상태에서 대량 이전을 쌓으면 되돌리기가 불가능해진다.

## 순서 — expand → migrate → contract (안전 이전 3단)

crisp와 링크를 **동시에 살려 두는 구간**을 두는 것이 이 계획의 핵심이다. 한 번에 바꾸면
R-A(아래)가 즉시 터진다.

### 2a. expand — 인프라가 양쪽을 수용하게 (그래프 변경 0)
- `ho:ConceptConnectivityShape`가 `tagged`/`broader` **또는** 그에 해당하는 Link 중 **어느 쪽으로도**
  연결성을 인정하도록 개정. (R-A: 이 선행 없이 이전하면 Concept 전량이 orphan 오탐)
- `AlternativeLinkSharedRegionShape`의 region join이 crisp `tagged`와 topic Link **양쪽**을 보게 개정.
  **B3 사용자 결정(판별 facet = anatomy·method 공유만 region)은 그대로 보존**할 것.
- `lint_uniformity.py`의 facet 소비, `retrieve.py`의 lexical/traversal 경로도 양쪽 수용.
- **게이트**: 그래프가 안 변했으므로 **팩 36질의 byte-identical**이어야 한다. 아니면 개정이 이미
  의미를 바꾼 것이다.

### 2b. migrate — Link 저작 (crisp 유지)
- 294개 Link 저작(`kind-broader` 70 / `kind-topic` 224), 전부 `1.0` + `asserted`.
- **파일 배치·prefLabel 규약을 먼저 고정**(R: 개체 폭증 294 + prefLabel 유일성). 소스 노드 곁
  co-location 원칙을 따르되, 자동 생성 규칙을 정해 저작이 산개하지 않게 한다.
- **게이트**: crisp가 아직 살아 있어 max() 경쟁에서 이기므로 **팩은 여전히 byte-identical**이어야
  한다. 변화가 나오면 그 자체가 결함 신호다.

### 2c. contract — crisp 제거 + 재보정
- `skos:broader`/`ho:tagged` 제거. **이 순간 랭킹 지배가 링크 가중으로 넘어간다**(1단계 판정 R-B).
- **base weight 재보정**: kind별 `traversalWeight`를 구 crisp projector weight와 맞춰 두었으나,
  crisp 제거 후 실제 팩으로 재측정해 보정한다. 게이트는 "**대량 팩 스위트**(36질의 이상)에서
  상위 랭크 붕괴 0, 변화는 설명 가능한 것만".
- `skos:ConceptScheme`/`topConceptOf` 유지 여부 결정 필요(R-E: broader 제거가 SKOS 계층과 B1 facet
  설계의 전제를 건드림) — **설계 결정이므로 착수 전 사용자 확인 대상**.
- **그래프 밖 소비자의 데이터 마이그레이션 확인**(병행 세션 요청): contract로 crisp 술어가 사라지는
  순간, 그래프 **밖**에 저장된 레코드가 그 술어를 주장하고 있으면 그쪽 게이트에서 위반이 된다.
  코드가 어휘를 파생하도록 고쳐도 **데이터는 따라오지 않는다** — 착수 전 그 세션에 확인할 것.

### 관측 — 이 문제의 일반형 (후속 후보, 이번 범위 아님)

F-1은 lane 하나의 사고가 아니라 **연합 구조의 일반형**이다: `validate.py`는 `ontology/`만 스캔하므로,
중앙 어휘를 소비하는 **그래프 밖 소비자**(링크 평면, 앞으로 나올 도구들)의 파손을 중앙은 **알 수
없다**. 중앙 게이트가 초록이어도 소비자는 빨간 상태일 수 있다. 대응은 두 방향이며 둘 다 이번
2단계 범위 밖이다 — ① 소비자가 각자 자기 게이트를 갖고 **어휘를 목록으로 베끼지 말고 출처를
가리킨다**(병행 세션이 채택), ② 중앙이 폐기할 때 알려진 소비자를 통지하는 절차. 규율로 세울
가치가 있으면 별도 결정 항목으로 올린다.

## 함께 처리할 위험 (1단계 판정 R-A~R-E + 보강)

| # | 위험 | 대응 |
|---|---|---|
| R-A | `ConceptConnectivityShape`의 crisp 의존 → Concept 전량 orphan 오탐 | 2a에서 선행 개정 |
| R-B | crisp 제거 시 랭킹 지배 교체 | 2c에서 base weight 재보정 + 대형 팩 스위트 게이트 |
| R-C | 측정 증거의 순환(공유 태그로 가중을 만드는데 그 태그가 곧 링크가 됨) | 측정 입력을 **이전 전 스냅샷**으로 고정하거나, 증거 종류를 순환하지 않는 것으로 한정 |
| R-D | `w=0.0`(사람이 기각한 링크)이 alternative 1-admit 클러스터에 잡히는 역설 | **0.0 = "약한 링크"가 아니라 "링크 아님(단, 기록됨)"** 으로 처리한다 — 순회·선별·클러스터링에서 **완전 제외**하고 기록으로만 남긴다. TBox 정의문이 이미 "ABSENCE = 미확인, 0.0 = 명시적 기각"으로 둘을 구분하므로 **순회 규칙을 그 정의에 일치**시키는 것이다. (병행 세션 제안: 앵커 lane에서 같은 구조를 "조용한 소실 금지 + 오부착 불허"로 풀었고, 끊긴 종단점을 위반이 아니라 **보고 대상**으로 분리했다.) |
| R-E | `broader` 제거가 SKOS scheme·B1 facet 전제를 건드림 | 2c 착수 전 사용자 확인 |
| R-F | 측정 커버리지 부족(현재 overlap 1종, topic 7건 미측정) | 2b 이후 측정 경로를 kind별로 확장 |
| R-G | 병행 세션 lane 재파손 | 각 단계 착수·완료를 그 세션에 통지, 어휘 파생이 green인 동안만 진행 |

## 게이트 공통

각 단계마다 `validate.py`·`lint_uniformity.py`·`check_determinism.py` PASS + **negative control
(교정 쌍둥이 포함, 공허한 참 배제)** + staging recipe 3종 union PASS + materialize dangling 0.
단계마다 vnv 판정을 받고, **이전 단계 판정 통과가 다음 단계 진입 조건**이다.
