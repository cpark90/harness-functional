# abox 정리 감사 — Guardrail 절차/판정법

`ontology/abox/core/behavioral/guardrails.ttl` Guardrail 전수 감사(findings-only, roles 정리 동일 기준).

## 재현
- inventory: `grep -oE 'id:gr-[a-z-]+ a ho:Guardrail'` → 40 (파일엔 ins-well-formed-skill 1 + hook 4 공존, 범위 밖).
- **참조 카운트**(orphan/reachability 사각): rdflib로 `ontology/**/*.ttl` union 파스 후
  `hasGuardrail`(harness)·`roleGuardrail`(role) object가 Guardrail 개체면 집계. zero-ref=orphan 신호.
  (guardrails는 개념태그가 아니라 **바인딩**으로 도달 — reachability는 hasGuardrail/roleGuardrail가 축.)
- 바인딩 위치: `grep -rl "id:<gr>\b" ontology/abox/core/{wholes,organization}/`.
- baseline: `/usr/bin/python3 tools/validate.py` PASS 확인(편집 금지, 판정만).

## 이 회차 결과
- 40개 전부 total≥1 (orphan 0). 저사용 total=1 다수는 h-harness-factory 메타-하네스가 부품
  라이브러리로 wiring — neutral parts library라 결함 아님.
- **유일 진짜 중복**: `gr-no-nested-teams → gr-depth-limit` (leaf-worker 제약의 team-vs-delegation
  어휘 재진술, 문서화 구별 없음, 둘 다 draft·h-harness-factory 단독 co-bind). 생존=depth-limit(정량 ≤2).
- KEEP-but-clarify 2: grounding altLabel("flag unverified claims"…)이 cite영역 과확장 / flatten-hierarchy는
  depth-limit의 연질쌍(선호 vs cap) 판별자 약함.
- 나머지 37 KEEP.

## 판정법 (near-synonym)
1. **anti-drift FIRST**: promptText에 명시적 "Distinct from id:gr-…" 있으면 의도된 구별→KEEP
   (human-checkpoint↔verify-proceed/no-arbitrary, integration-coherence↔grounding, well-formed-skill
   guardrail↔ins enforcement). concrete/neutral 추상수준 쌍도 유지(delegated-orchestration은
   execution-separation의 orchestrator-concrete 사례·near-subsumed이나 참조도·열거 상이→KEEP).
2. **판별자=대상(object) 또는 축**: cite(주장↔출처)/grounding(artifact↔rationale)/controlled-vocab(term)/
   reuse-first(part) — 겉보기 유사도 대상 다르면 판별자 성립. root-cause(깊이)vs generalize(범위),
   least-privilege(권한)vs single-responsibility(cohesion), graceful-fallback(per-op)vs bounded-iteration(loop cap).
3. 진짜 중복 = 동일 운영내용 + 문서화 구별 없음 + 어휘만 다름 → MERGE(생존=더 일반적/정량적/참조多).
- 리포트: docs/verify/abox-audit-guardrails.md.
