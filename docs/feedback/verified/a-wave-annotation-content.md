---
source: docs/feedback/a-wave-annotation-content.md
verdict: apply-with-changes   # 1·2·3 그대로 실행 가능 / 4(b)는 조건 3건 충족 시에만
targets: [ho:overlapsWith, ho:Anchor, ho:anchorConfidence, ontology/abox/core/vocab/concepts.ttl, tools/retrieve.py]
kind: decision-review
graph_baseline: 관측 시점 abox — tagged 150 · 다중태그 45 · Concept 68+ · validate PASS
---
# 검증 보고 — A-wave 사용자 결정 4건 검토

사용자 응답: **1=(a) · 2=(a) · 3=(a) · 4=(b)**. 1~3은 권고와 일치하고 실행에 장애가 없다.
**4만 권고(연기)와 갈렸고, 그대로 실행하면 세 곳에서 충돌**한다 — 아래 §4. 다만 **막을 일은
아니고**, 조건 3건을 붙이면 오히려 4(b)가 1~3보다 값이 커진다.

## 1. 결정 1 (a) — `overlapsWith` vnv 2쌍만 저작 ✔ 이견 없음

`gr-well-formed-skill ↔ ins-well-formed-skill`(공유 `c-skill-authoring`) ·
`chan-peer ↔ pat-peer-mesh`(공유 `c-multiagent`). 두 쌍 모두 정의 문장이 실제로 겹침을 직접
확인했다. 엣지 2개, 개체 신설 0, `overlapsWith`는 1선별 트리거가 아니라 **팩 byte-identity
유지**. `plane-editor-and-kg-content-decisions.md` **결정 5-(a)**의 실행 스펙이 그대로 유효하다.

## 2. 결정 2 (a) — 43쌍 미저작, 필요 시 재측정 ✔ 이견 없음

정규식 재측정은 언제든 30초면 되고(패턴은 survey §1 축3에 기록), 소비자가 생기면 그때 저작해도
늦지 않다. **다만 이 결정이 4(b)와 충돌한다** — §4-③ 참조.

## 3. 결정 3 (a) — `c-X ↔ gr-X` 7쌍 정의 축약 ✔ 이견 없음 (파일 충돌만 조율)

7쌍 확정: `report-over-prompt`·`bounded-context`·`least-privilege`·`simplicity`·`root-cause`·
`controlled-vocabulary`·`verify-proceed`. **주의 1**: 이 작업은 `vocab/concepts.ttl`(Concept 쪽)과
`behavioral/guardrails.ttl`(Guardrail 쪽) **양쪽**을 건드리며, 전자는 B1(facet 선언)과 같은
파일이다 → 한 브리프로 묶거나 순서를 정할 것. **주의 2**: 축약 후 **cap(260) 재확인**과
`tokenEstimate` **재산정**이 필요하다(§1c 관례). **주의 3**: 축약은 정의 텍스트를 줄이는
것이지 **의미를 옮기는 것이 아니다** — Guardrail의 명령형 문장을 Concept로 이동시키면
"원리 vs 명령" 분리가 깨진다.

## 4. 결정 4 (b) — `Anchor`/`anchorConfidence` 지금 저작 ⚠ 조건부

권고는 (a) 연기였다. (b)를 그대로 실행하면 세 곳에서 충돌한다.

### ① 클래스 자신의 정의와 충돌 (가장 무거움)

`ho:Anchor`의 `skos:definition`이 직접 이렇게 말한다(원문 요지):
- "**가중치 자체가 정보를 담을 때만** 선택하라. crisp한 `ho:tagged`가 DEFAULT이고,
  **confidence 없는 Anchor는 단계만 늘린 태그**다."
- "CONSUMPTION: 이 값들은 투영 층의 영역별 선별이 소비하며, 그것은 **나중 단계**다 —
  그때까지 이 메커니즘은 **설계상 선언되었으나 휴면(DECLARED BUT DORMANT BY DESIGN)** 이고,
  따라서 **개체 0이 결함이 아니라 기대되는 상태**다."

즉 지금 저작하면 **그래프가 자기 문서와 어긋난다**. → **조건 A: 저작한다면 같은 변경에서
`ho:Anchor`의 정의문을 갱신**해야 한다("휴면이 기대 상태"라는 문장을 유지한 채 개체를 넣을 수 없다).

### ② 목적과 충돌 — 순위 매길 대상이 없다

정의가 밝힌 Anchor의 목적은 "**같은 영역을 서술하는 여러 노드를 병합하지 않고 순위 매기기**"다.
그런데 `alternativeOf` 후보는 **두 실측 모두 0건**이다. 순위 매길 경쟁 서술이 없으므로,
지금의 confidence는 **무엇과도 비교되지 않는 숫자**가 된다.

### ③ 결정 2(a)와 기준이 어긋남

2(a)는 43엣지를 **"소비자가 없다"는 이유로** 미저작했다. 그런데 `anchorConfidence`를 읽는
코드는 실측 **0줄**이다(`tools/*.py` 전수 — `lint_uniformity`의 접두사 등록과
`ontology_lib`의 클래스 목록은 소비가 아니다). **같은 기준을 같은 사이클에서 반대로 적용**하게 된다.

### 그래도 (b)를 살리는 길 — 조건 3건

- **조건 A (필수)**: 위 ①의 정의문 갱신을 같은 커밋에.
- **조건 B (필수) — 소비자를 함께 만든다**: `retrieve.py`가 `anchorConfidence`를 랭킹에
  반영하게 한다(현행 `prior = 0.5 + salience`, L136–138 옆자리). 이러면 ③의 모순이 사라지고
  Anchor가 **장식이 아니라 작동하는 기능**이 된다. 이것이 (b)를 (a)보다 낫게 만드는 유일한 길이다.
- **조건 C (필수) — 숫자의 출처를 선언한다**: 값이 어디서 왔는지 적지 않으면 날조다. 현행 TBox엔
  justification 술어가 없다. 최소안은 각 Anchor의 `skos:definition` 한 줄에 도출 근거를 쓰는 것,
  정식안은 `ho:anchorJustification`(소수 닫힌 값: 저자 판단 / 사용 빈도 / 정의 어휘 중첩 등) 신설.
  **외부 표준 선례와도 일치**한다 — SSSOM은 confidence는 optional이되 **justification은 required**다.

### 저작 대상 — 기반이 바뀌었다 (중요)

vnv 실측 시점(HEAD `04e0825`)에는 다중 태그 노드가 **17/117**이었으나, 병행 웨이브가 태그를
추가해 **현재 45/150**이다(신규 `role-user-simulator` 등 포함). 그중 **chain 자격이 있는
컴포넌트는 38개** — Anchor는 "하네스가 바인딩하는 컴포넌트"에 붙어야 롤업되므로 Harness 6개와
`pat-peer-mesh`는 부적격이다.

**그런데 38개 중 35개의 태그 조합이 `[내용태그, c-multiagent]` 형태**다. 여기에 confidence를
넣으면 사실상 "`c-multiagent`는 약한 적합"을 **38번 숫자로 반복**하는 것이 된다 — 그리고 그것은
**B1(facet 선언)이 `scope`라고 한 번 선언해 구조적으로 해결**하는 문제다. → **권고: 4(b)를
B1 이후로 두거나, 지금 한다면 3~5개 파일럿으로 한정**하고 B1 후 재평가.

## 5. 종합 권고 (실행 순서)

1. **결정 1** — 즉시 dispatch 가능(엣지 2개, 회귀 없음).
2. **결정 3** — B1과 파일이 겹치므로 **한 브리프로 묶어** dispatch(축약 → cap·tokenEstimate 재확인).
3. **결정 4(b)** — 조건 A·B·C를 브리프 필수 항목으로 넣고, **파일럿 3~5개**로 시작.
   조건 B(소비자)가 이번 wave에 안 들어가면 **(a) 연기로 되돌리는 편이 낫다** — 그 경우
   지금 넣는 개체는 정의문이 스스로 "기대 상태가 아니다"라고 말하는 데이터가 된다.
4. **결정 2** — 조치 없음(재측정 패턴만 기록 유지).

## 6. 사용자에게 확인이 필요한 1건

**조건 B(소비자 동반)를 이번 wave에 포함할 수 있는가?** 포함하면 4(b)는 그대로 진행,
포함하지 못하면 4(a)로 되돌리는 것을 권고한다. 이 답에 따라 브리프 범위가 갈린다.
