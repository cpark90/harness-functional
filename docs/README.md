# docs/ — harness-functional

이 저장소는 하네스의 **ODD + functional 수준**(어휘 TBox·shapes·공용 도구)만
담는다. 개체·조립 명세는 harness-concrete에 있다 (`../README.md` 참조).
2026-09 사다리 재배치로 문서도 주제에 따라 나뉘었다.

## 살아있는 설계 문서

| 문서 | 주제 |
|---|---|
| [`federation-design.md`](federation-design.md) | 두 저장소의 union 조립 — D1(imports+catalog)·D2(사다리 분할)·D3(IRI)·D4(2단 게이트) |
| [`CONTRIBUTING-ONTOLOGY.md`](CONTRIBUTING-ONTOLOGY.md) | 어휘 기여 절차 |
| [`webui-design.md`](webui-design.md) | 온톨로지 관리 web UI 아키텍처 (도구는 `tools/webui/`) |
| [`materialize-design.md`](materialize-design.md) | 빌드 투영 — 레시피 union을 실행 가능한 파일 트리로. 도구 `tools/materialize.py`의 설계 명세 (원자적 emit, 후보 tool의 안정 파일명 포함) |
| [`odr-vocabulary-and-verify.md`](odr-vocabulary-and-verify.md) | ODR BIND·VERIFY의 **functional 절반** — `ho:Candidate`/`ho:Contract` 어휘, propertyChain 도달성 설계, 도구 `tools/verify_contract.py`의 설계 명세. 나머지 절반(개체·정책·lock·실증)은 `harness-concrete/docs/odr-bind-lock.md`·`odr-contract-verify.md` |
| [`ci/data-repo-validate.yml`](ci/data-repo-validate.yml) | 데이터 저장소 CI 템플릿 |

## 진행 중 / 규범이 살아있는 계획 (`plans/`)

| 문서 | 상태 |
|---|---|
| `plans/weighted-link-phase2-plan.md` | **미완** — 유일한 진행형. 실행 시 concrete과 조율 필요(이전 대상 엣지가 concrete abox에 있음) |
| `plans/disambiguation-audit.md` | 감사는 완료, TBox 정의 규범은 유효 |
| `plans/mas-observation-refinement.md` | 어휘 이론 backbone (Dec-POMDP 기반 Agent/Observation 세분화) |
| `plans/plane-editor-phase0.md` | Phase 0 완료, 후속 계약 유효 |

## 교훈 (`lessons/`)

`coverage-gap-channels.md` — 담을 어휘 범주가 없으면 조용히 건너뛰지 말고 TBox
확장을 트리거한다는 저작 방법론. concrete의 조립 작업에도 적용된다.

## 아카이브 (`plans/archive/`)

완료된 dispatch brief와 결과 리포트. 살아있는 지시가 아니라 이력이다 — 도구·
어휘 주제(9건)만 여기 남았고, 개체·레시피 주제(11건)는
`harness-concrete/docs/plans/archive/`로 이관되었다.

## 운영 채널 (`feedback/`, `verify/`)

`feedback/`은 이 저장소의 agent↔user 채널(inbox → `verified/`, `inquiries/`),
`verify/`는 vnv 검증 리포트 이력이다. 두 저장소가 같은 에이전트 하네스와
도구를 공유하므로 채널은 여기 하나로 유지한다 — concrete 주제의 항목도 이
채널을 쓴다.

## 이송된 문서

일반 지식관리 방법론(`DESIGN.md`)은 **agentic-knowledge-base의 결정 청크**로
이송되었다: 형식 저장·좁은 읽기 d-0013, 3대 실패 모드와 방어선 d-0014, 조립
워크플로 d-0015, 토큰 예산 d-0016, 교훈 승격 d-0017.
logical·concrete 수준 문서(`recipes-design`, `odr-bind-lock`,
`odr-contract-verify`, `composition-methodology`)는 harness-concrete의 `docs/`로
이관되었다. `materialize-design`은 한 번 그쪽으로 갔다가 **되돌아왔다** — 그 문서의
실체는 `tools/materialize.py`의 설계 명세이고, 도구와 문서가 갈라져 있던 동안
실제로 잘못된 서술(`ontology_lib.ROOT`의 의미)이 생겼다. **도구 설계 문서는 도구와
함께 둔다**가 그 결론이다.

## 되받은 절 (2026-09)

같은 원칙으로, concrete의 두 ODR 문서에서 **어휘·shape·도구 소관인 절**을
이쪽으로 되받았다: `odr-bind-lock`의 TBox 어휘 절과 도달성 설계 절,
`odr-contract-verify`의 Contract TBox 절·도달성 절·`verify_contract.py`의 두
판정 메커니즘 절 → 새 문서 `odr-vocabulary-and-verify.md`. `odr-bind-lock`의
"Atomic emit"·"Stable emitted filenames"는 `materialize()`의 거동 명세이므로
`materialize-design.md`에 합류했다. 원본에는 한 줄 포인터만 남고, 각 축의
개체·정책·lock·실증 절반은 그대로 harness-concrete에 있다.
