---
source: docs/feedback/refer-to-expert-fp-stale-definition.md
verdict: apply
targets: [recipes:fp-gdpr-applicability-uncertain, recipes:fp-legal-indeterminacy, recipes:fp-regulatory-ambiguity]
---
# 검증 보고 (B23) — local fp 정의의 자기모순 3건 수정 (승인)

사용자 승인(`approved`). 반영은 **harness-recipes repo 저작**(developer dispatch) — 중앙 무변경.

## 파급효과 (실측)
- **범위 = 정확히 3 recipe**: `ho:specializes core:fp-refer-to-expert`와 "no central archetype covers"
  부정절이 **한 fp 블록에 공존**하는 곳만 — 69-privacy-engineer·70-legal-research·72-regulatory-filing.
  같은 부정절이 18 recipe에 있으나 **나머지 15는 specializes edge가 없어 사실이고 정당**(건드리면 안 됨).
- 그래프 정합성 무영향(정의 리터럴만 변경, edge·개체 불변). federate SHACL 무영향.
- 산출물: 세 recipe의 materialized CLAUDE.md **Error handling 섹션**에서 틀린 "no central archetype"
  문구가 제거되고 "core:fp-refer-to-expert의 도메인 특화"로 바뀐다(archetype 재사용 가시화 — 링킹의 목적).

## 적용 계획 (developer dispatch, recipes repo)
세 local fp의 `(no central archetype covers …)` 절만 재작성 — 도메인 특화 문구(GDPR 적용성 / 법적
불확정성 / 규제 요건 모호성)는 유지하고 **틀린 부정절만** "Domain-specialisation of
core:fp-refer-to-expert for <도메인 상황>: …" 형태로 교체. 각 recipe의 `ho:specializes` edge는 이미
존재하므로 유지.

## 검증 게이트 (반영 후 inspection)
- 세 recipe federate **PASS** 유지.
- materialize: 세 recipe Error handling에서 "no central archetype" **소거**, 그 외 변경 0.
- **정정된 스윕 게이트**(단순 grep 0건은 오답 — 15개 정당분 보존): `ho:specializes`와 "no central
  archetype covers"가 **한 fp 블록에 공존하는 recipe = 0**. 15개 비-specializes local fp의 부정절은 **보존**.

## 판정
**apply** — 3 recipe 정의 텍스트 수정. 중앙·개체·edge 불변, 회귀 없음. developer(recipe 저작)가
반영하면 inspection이 위 게이트로 검증한다.

## 적용 결과 (applied 2026-07-28, orchestrator via developer dispatch)
**적용됨.** 3 recipe local fp 정의의 `(no central archetype covers …)` 부정절만 `(domain-specialisation of core:fp-refer-to-expert for …)`로 교체. 도메인 특화 문구·`ho:specializes` edge·failureCondition·recoveryStrategy 유지. tokenEstimate +6씩(anti-rot).
- `69-privacy-engineer` `fp-gdpr-applicability-uncertain` · `70-legal-research` `fp-legal-uncertainty` · `72-regulatory-filing` `fp-regulation-ambiguous`.
- **게이트**: 스윕 게이트 = `ho:specializes core:fp-refer-to-expert` + "no central archetype covers" 공존 recipe **0**(rdflib block-level). 정당한 15개(edge 없음) 보존(phrase 18→15). 세 recipe closure PASS. materialize `diff -r` = MANIFEST tokenEstimate roll-up 외 byte-identical.
- **계획 전제 정정(비차단)**: Error-handling 섹션은 `failureCondition`+`recoveryStrategy`만 방출하고 `skos:definition`은 **비방출** → stale phrase는 애초 CLAUDE.md에 없었음. 본 수정의 실익은 **그래프 진실성·retrieve 발견성**(재사용 가시화)이지 materialize 산출 변경이 아님. materialize delta는 의도된 tokenEstimate 집계뿐.
- **신규 발견(범위 밖, 미적용)**: `75-tax-calculator.ttl:191` **주석**이 동종 stale 모순(specializes fp 위 "no central archetype covers"). 주석·비방출이라 저영향이나 동일 결함 — 별도 승인 시 후속 정정 대상.
- inspection refresh 대기.
