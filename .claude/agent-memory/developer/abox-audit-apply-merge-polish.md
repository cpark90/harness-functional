# abox 감사 적용: guardrail MERGE + near-synonym polish

vnv abox-audit findings(guardrails/concepts/patterns/capabilities)를 developer가 반영한 배치.
근거 리포트=`docs/verify/abox-audit-*.md`. 5개 결정 적용, validate 236→235, PASS+determinism PASS.

## Guardrail MERGE (gr-no-nested-teams → gr-depth-limit)
- 병합 노드 **삭제**(중복 leaf-worker 제약, depth-limit이 정량 ≤2로 포괄). 흡수는 **재진술
  아닌 통합**: depth-limit promptText "those workers do not spawn further sub-teams" →
  "those workers **are leaf agents that** do not spawn **or lead** further sub-teams"(한 절로 흡수, 신문장 추가 안함).
- ★삭제 노드의 prefLabel("No nested teams")을 survivor **altLabel로 승격** → 검색 discoverability 보존
  (role-merge에서 concrete context 흡수와 동형). altLabel은 prefLabel-uniqueness 검사 대상 아님→충돌 없음.
- tokenEstimate 재산정(42→46, 흡수분 반영).
- ★참조 제거: `grep -rn gr-no-nested-teams ontology/`로 유일 바인딩=harnesses.ttl h-harness-factory
  hasGuardrail 리스트. **depth-limit이 이미 co-bound**이므로 **remove-only**(replace/dup-add 금지).
  ★이 harnesses.ttl 편집은 "4 abox파일만" 경계 note를 넘지만 MERGE 지시 본문+grep-0 게이트가
  명령·필수(댕글링 참조면 validate 깨짐)—병합의 binding-file 편집은 survivor측 정리로 항상 포함.

## altLabel 과확장 cleanup (gr-grounding)
- off-axis altLabel("flag unverified claims"/"assumption and limitation disclosure"=cite/disclosure로 누수)
  → **전삭 아닌 on-axis 1개로 교체**("link artifact to rationale"). def 산문은 유지.

## near-synonym 판별절 보강 패턴 (flatten-hierarchy, patterns B1/B2/B3)
- 정의/promptText 끝에 한 절: "This is <this축>, NOT <other축> -- that is id:<other>." 또는
  "Contrast id:<other>, which <other축>: <this> <this축>, rather than <other축>." (대문자 축키워드로 대비).
  flatten=soft preference↔depth-limit=hard cap / fanout=HOMOGENEOUS split↔orchestrator=HETEROGENEOUS 위임 /
  expert-pool=CONTENT stateless route↔supervisor=DYNAMIC state realloc / producer-reviewer=2 distinct agents↔reflection=SINGLE self.
- def-only 노드(tokenEstimate 없는 DesignPattern)는 산문만 늘고 estimate 갱신 불요.

## label-only Capability → definition backfill
- cap-codeexec/fileedit/websearch/retrieval/citation에 skos:definition 1문장(기존 cap-orchestration 톤:
  "…, so a component can …"). prefLabel/altLabel 유지, 라인 확장. §1d 영어.

## Concept floating-top wire
- c-autonomy(top/broader 없이 related만)에 `skos:topConceptOf id:scheme` 1 triple 추가(기존 related 유지).
  인라인: `skos:topConceptOf id:scheme ; skos:related id:c-safety .`(c-multiagent과 동형 서술).

## 검증
grep-0(exit1)·validate PASS(235=−1)·check_determinism PASS·cap 5종 def=1 각각. git diff --stat은
세션시작 pre-existing 변경(roles/channels/observation…) 포함하므로 내 변경분만 셈: 위 5 abox파일+memory.
