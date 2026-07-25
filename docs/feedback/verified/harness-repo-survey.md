---
source: docs/feedback/harness-repo-survey.md
verdict: apply-with-changes
targets: [ho:Hook, core:role-developer, core:h-multiagent, core:gr-bounded-context]
---
# 검증 보고 — 외부 harness repo 반영 (결정 1~4 승인분)

사용자 승인: **1=(c) 전체 로드맵 · 2=`ho:Hook` 신설 · 3=agent-rules-books "온톨로지에만 반영" ·
4="온톨로지에는 모두 반영, 예제는 10~20개로 압축"**. 각 결정을 실행 가능한 편집 수준까지 검증했다.
결론부터: **1·2·3은 그대로 적용 가능**, **4는 그대로 실행하면 두 가지 하드 제약에 걸리므로
구체화가 필요**하다(그래서 verdict가 `apply-with-changes`).

## 파급효과 (impact)

### 결정 4가 건드리는 하드 제약 2건 (실측)
1. **모든 Role은 하네스에 묶여야 한다 — 선택이 아니라 SHACL 강제.**
   `ho:ComponentConnectivityShape`(`shapes/harness-shapes.ttl:50`)는 `ho:HarnessComponent` 전체를 대상으로
   `hasComponent` 역방향 **`sh:minCount 1`** 을 건다. `ho:Role ⊑ ho:OrganizationComponent ⊑ ho:HarnessComponent`
   이므로, 어느 하네스에도 `hasRole`로 걸리지 않은 role은 **validate FAIL**이다(orphan). 즉 "온톨로지에
   모두 반영"은 자동으로 **"253개를 담을 host 하네스가 필요하다"** 로 번역된다.
2. **묶는 순간 문서가 폭발한다.** 현재 `h-multiagent`는 role 7개에 Roles 섹션 **1,723 bytes**
   (≈246 B/role), CLAUDE.md 전체 13,689 bytes. 253 role을 한 host에 묶으면 Roles 섹션만 **≈62KB**,
   host CLAUDE.md **≈75KB**. 이 저장소가 지키는 `gr-bounded-context`(예산 캡 투영)와 정면 충돌하며,
   그 host는 사실상 아무도 materialize할 수 없는 문서가 된다.

### 규모 실측 (README 주장치가 아니라 git tree)
- VoltAgent `categories/**.md` 164경로 → 고유 **155** · wshobson `**/agents/**.md` 204경로 → 고유 **139**
  (경로가 많은 것은 5개 플랫폼 디렉토리 중복 배치 때문).
- **합집합 253 · 교집합 41.** 즉 "350여 개"는 과대이고, **41쌍은 두 소스가 같은 이름으로 각자 정의한
  중복**(`code-reviewer`·`cloud-architect`·`python-pro` 등)이라 **병합 규칙 없이는 중복 prefLabel 41쌍**이
  생긴다. `validate.py`의 중복 탐지는 advisory라 FAIL은 안 나지만, `gr-controlled-vocabulary`
  (근사 동의어 금지) 위반이 41건 상시 노출된다.

### 나머지 축
- **retrieve 예산**: 205 → 460+ 개체(role 253 + skill/hook). 900토큰 팩 경쟁이 2배 이상 심해지고,
  "python-pro/rust-pro"류 동형 노드가 role 질의 팩을 잠식할 수 있다(context-rot 축의 실질 위험).
  게다가 **tie-break 비결정성**(별건 `retrieve-nondeterministic-pack.md`)이 미해결이라, wave 완료
  게이트인 "신규 부품이 검색되는가"를 신뢰할 수 없다. → **Wave 1 착수 전 그 결함 처리 필수**로 격상 권고.
- **federate 비용**: 모든 recipe union이 중앙 전량을 포함하므로 8 recipe 검증 비용이 함께 오른다.
  현재 중앙 `validate.py` **2.10초 @205** — 여유는 있으나 SHACL은 노드 수에 민감하니 wave마다 측정 기록.
- **materialize**: role 개체 자체는 어느 기존 하네스에도 자동 결합되지 않으므로(바인딩은 명시적),
  기존 7 하네스 산출물은 **byte-identical 유지 가능**. 이것이 wave 완료 게이트가 되어야 한다.

## 정합성
- 신규 어휘는 결정 2(`ho:Hook`)뿐이며, 같은 커밋에서 연결(host 하네스 + 개념 태그)하면 orphan 규율 충족.
- 결정 3은 그래프 구조 변경 0(기존 `ho:Guardrail` 재사용) → 정합성 위험 없음. 라이선스 조건만 지키면 된다.
- 결정 4는 위 제약 2건을 해소하는 설계가 붙어야만 `validate.py` PASS를 유지한다.

## 적용 계획 (orchestrator 실행용)

### 결정 1 — Wave 0~4 전체 진행
`mining-plan.md` 순서 유지. 단 선행 게이트 2개를 명시적으로 건다:
`retrieve` 비결정성 결함 → `harness-100` inc4 importer → Wave 1.

### 결정 2 — `ho:Hook` 신설 (TBox 확장, GAP-4 교훈 반영)
한 세트로 계획한다(개체만 만들고 렌더러가 없으면 그래프에만 존재하는 부품이 된다):
1. TBox: `ho:Hook a owl:Class ; rdfs:subClassOf ho:BehavioralComponent`(트리거는 실행 시점 **행동** 축) +
   `ho:hookEvent`(리터럴 or 열거 개체) + `ho:hasHook`(⊑`ho:hasComponent`, domain `ho:Harness`).
   **`sh:in` 열거는 쓰지 말 것** — `ExecutionMode`에서 확립한 "개체로 확장" 원칙과 일관되게 이벤트도
   개체/리터럴로 열어둔다.
2. ABox: toolkit의 20 hooks를 중립화해 소수(권고 4~6: session-start·pre-tool·post-tool·stop)만 저작.
3. Assembly: `as-hooks` AssemblySection + `materialize.py` 렌더러(조건부 — hook 없는 하네스는 미출력).
4. 게이트: 기존 하네스 산출물 byte-identical, 신규 선언 하네스만 섹션 추가.

### 결정 3 — `agent-rules-books`는 중앙에만
- 채택하되 **guardrail 개체로만** 중앙에 저작하고, `harness-recipes`(예제)에는 **배포하지 않는다**.
- 조건(§license-gate 유지): 서적 문구 인용 금지, **취지만** 중립 재저작, `dct:source`는 rule 파일 URL,
  NOTICE에 MIT 고지. 기존 34 guardrail과 중복 제거가 실작업의 대부분.

### 결정 4 — role 전량 반영: 아래 3개를 함께 적용해야 실행 가능
- **(4a) 병합 규칙**: 교집합 41은 **하나의 개체로 병합**(두 소스를 `dct:source` 2개로 병기). 253 →
  실제 저작 대상은 그만큼 줄고, 중복 prefLabel 0을 유지한다.
- **(4b) host 분할**: 단일 host 금지. 소스 카테고리(10종)를 따라 **카테고리별 library host 하네스**로
  나눈다(≈25 role/host → Roles 섹션 ≈6KB, CLAUDE.md ≈20KB). `h-workspace-synthesis`·`h-harness-factory`가
  이미 "부품을 wire하기 위해 존재하는 중립 host"라는 전례를 만들어 뒀으므로 새 개념이 아니다.
- **(4c) 문서 억제 여부 — orchestrator 설계 판정 필요**: (b)로도 library host의 CLAUDE.md는 실사용
  문서가 아니다. 선택지 ① `as-roles`를 library host에서만 조건부 억제(materialize 변경 필요) ②
  억제 없이 그대로 두고 "library host는 materialize 대상이 아니다"를 문서 규약으로만 선언 ③ role
  library를 하네스가 아닌 별도 축으로 담을 범주 신설(비용 최대, 스키마 변경).
  **inspection 권고: ②**(도구 변경 0, 규약으로 해결, 되돌리기 쉬움). ①은 "SPEC이 조립을 규정한다"는
  기존 원칙과 충돌 소지가 있다(억제 조건이 코드로 들어감).
- **예제 압축은 그대로**: `harness-recipes`에는 원형 **10~20**만 recipe로 배포(사용자 결정 그대로).

## 판정
**apply-with-changes** — 결정 1·2·3은 위 계획대로 적용. 결정 4는 사용자의 "모두 반영" 취지를 지키되
**(4a) 41쌍 병합 · (4b) 카테고리별 host 분할 · (4c) library host 문서 취급 규약**을 함께 확정해야
`validate.py` PASS와 `gr-bounded-context`를 동시에 지킬 수 있다. (4c)만 orchestrator 설계 판정이 남으며,
나머지는 이 문서대로 실행 가능하다.

## 한계
253이라는 수는 **파일명 기준**이다. 이름이 달라도 내용이 같은 원형(예: `test-automator` vs `qa-expert`)은
파일을 열어야 병합 판단이 되므로, 실제 저작 수는 Wave 2 첫 단계에서 확정된다.

---
## 적용 결과 — Wave 0~4 완료 (custody transfer, inspection, 2026-07-25)

결정 1~3의 실행(Wave 0~4)이 모두 land됐다. 이 항목은 **결정 4의 "예제 10~20"만 미해결이라 HOLD(유지)**
하되, 적용된 W0~W4를 여기 durable하게 기록해 custody를 남긴다(refresh는 예제 잔여 해소 후).

- **Wave 0 — 커버리지 감사** (`c7ae890`): 확정 TBox gap = **`ho:Hook`만**(다른 3후보는 부분표현/defer).
  Wave 1~4 스코프 확정 + OPEN-ISSUES 갱신. 근거 메모리: `inspection/harness-repo-survey-wave0.md`.
- **Wave 1 — `pat-blackboard` 중립 패턴 승격** (`925f7ba`).
- **Wave 2 — role archetype 커버리지** (`5c35528`): 외부 role **252**(wshobson + VoltAgent, dedup)이
  기존 **중립 role 원형 7종에 전부 collapse, 신규 0** — 중립 부품 라이브러리가 role 축에서 이미 완비됨을
  실증. operator/reliability 후보는 doctrine으로 close(analyst+implementer로 분해, 구별자질이 도메인
  특수 = 근사 동의어 drift). → 결정 4의 "온톨로지에 모두 반영"은 **mass import가 아니라 기존 원형
  커버리지**로 낙착.
- **Wave 3 — 중립 guardrail `gr-human-checkpoint`** (`9ca09d5`): 중앙 byte-identity + 2-source 귀속.
  근거 메모리: `inspection/central-ontology-land-attribution.md`.
- **Wave 4 — `ho:Hook` lifecycle-trigger 축** (`f7214b6`, GAP-H complete): TBox 클래스 + `hookEvent` +
  `hasHook` + ABox hook 개체 + materialize 조건부 렌더러. INSTANCE_CLASSES parity, 기존 하네스 산출물
  byte-identical(hook 없는 하네스 미출력). `validate.py` PASS.

### HOLD 근거 — 결정 4 "예제 10~20"만 미해결 (사용자 확인 필요)
결정 4의 recipe 예제 압축("예제는 10~20개")은 **소스타입 불일치**로 그대로 실행할 수 없다: 소스
(VoltAgent/wshobson)는 **role 라이브러리이지 임포트 가능한 하네스가 아니다** — recipe 예제로 압축할
"하네스"가 소스에 없다(W2 커밋 `5c35528`가 이 GAP을 "example-corpus GAP — role libraries are not
importable harnesses"로 명시). role 원형 반영(온톨로지 축)은 W2로 완료됐으므로 사용자 결정 4의
온톨로지 취지는 충족됐고, **예제 산출을 어떤 소스에서 뽑을지**(예: harness-100 코퍼스 재사용 vs
role-library를 예제화하지 않음)는 사용자 확인이 필요하다. 이 잔여만 남겨 항목을 유지한다.

**판정: 1·2·3 = 적용 완료(land). 4 = 예제-잔여로 HOLD(유지) — 사용자 확인 대기.**
