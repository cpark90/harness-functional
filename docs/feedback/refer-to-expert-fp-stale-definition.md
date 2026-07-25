---
status: open            # 사용자만 approved로 바꾼다
targets: [recipes:fp-gdpr-applicability-uncertain, recipes:fp-legal-indeterminacy, recipes:fp-regulatory-ambiguity, core:fp-refer-to-expert]
kind: defect
related: [docs/plans/OPEN-ISSUES.md]
---
# 결함 (B23) — specializes 링킹이 만든 자기모순: local fp 정의가 "중앙 archetype 없음"이라 주장하는데 그 archetype을 specialize한다

## 증상 (실측, harness-recipes repo)
`core:fp-refer-to-expert`(중앙 archetype 승격 완료) + specializes 전파(`936fead`) 후, 세 recipe의
local FailurePolicy가 **동시에 두 가지를 선언**한다:
```
ho:specializes core:fp-refer-to-expert ;          # ← 중앙 archetype을 specialize
skos:definition "... (no central archetype covers ...) ..." ;   # ← 그런 archetype이 없다고 주장
```
| recipe | local fp | 정의 속 stale 문구 |
|---|---|---|
| 69-privacy-engineer | `id:fp-gdpr-applicability-uncertain` | "no central archetype covers regulatory-applicability doubt" |
| 70-legal-research | `id:fp-legal-indeterminacy`(라벨상) | "no central archetype covers legal indeterminacy" |
| 72-regulatory-filing | `id:fp-regulatory-ambiguity`(라벨상) | "no central archetype covers requirement ambiguity" |

정의문은 archetype이 승격되기 **전**에 쓰였고, 이후 specializes edge가 붙으면서 문구가 사실과
어긋났다. edge 자체는 옳다(local fp는 실제로 refer-to-expert의 도메인 특화다) — **틀린 것은 정의
텍스트뿐**. `validate.py`/federate는 통과한다(그래프 정합성 문제 아님, 산문 drift다).

## 파급효과
- 그래프 무영향(정의 리터럴만). 개체 수 불변. federate 회귀 없음.
- 산출물 파급: 이 세 recipe의 materialized CLAUDE.md **Error handling 섹션**에 stale 문구가 그대로
  렌더된다 — 읽는 에이전트가 "중앙에 재사용할 archetype이 없다"는 틀린 정보를 받는다(archetype 재사용을
  오히려 저해). specializes 링킹의 목적(재사용 가시화)과 정면으로 어긋난다.

## 적용 계획 (recipe-author / developer dispatch)
세 정의의 `(no central archetype covers …)` 절을 **"specializes 관계를 반영"** 하도록 재작성.
제안 패턴(문안은 developer가 controlled-vocabulary로 최종화):
> "Domain-specialisation of core:fp-refer-to-expert for <이 도메인의 판단-한계 상황>: keeps the
> framework conservative rather than blocked when …" — 즉 "archetype 없음" → "이 archetype의 도메인 특화".
각 recipe의 도메인 특화 문구(GDPR 적용성 / 법적 불확정성 / 규제 요건 모호성)는 유지하고, **틀린
부정절만** 교체한다. 세 파일 모두 harness-recipes repo.

## ★범위 확정 (전 recipe 스윕, inspection 실측)
"no central archetype covers" 문구는 **18 recipe**에 있으나, **모순은 3개뿐**이다 —
`ho:specializes`와 부정절이 **공존**하는 곳(69·70·72). 나머지 **15개는 specializes edge가 없어**
"중앙 archetype 없음"이 **사실이고 정당**하다(고쳐선 안 됨). 따라서 수정 대상은 **정확히 3개**.

## 검증 게이트 (반영 후 inspection)
- 세 recipe federate PASS 유지(정의 변경은 SHACL 무영향이나 확인).
- materialize: 세 recipe CLAUDE.md Error handling 섹션에서 "no central archetype" 문구 **소거**,
  그 외 변경 0.
- **정정된 스윕 게이트**(단순 grep 0건은 틀림 — 15개 정당분을 오탐): `ho:specializes`와
  "no central archetype covers"가 **한 fp 블록에 공존하는 recipe = 0** 이어야 한다. 15개 비-specializes
  local fp의 부정절은 **보존**됨을 함께 확인.

## 판정
승인 시 `status: open` → `approved`. recipe 저작은 developer dispatch 소관 — inspection은 조사·검증·git.
