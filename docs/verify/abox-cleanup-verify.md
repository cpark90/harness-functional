# abox 정리 적용분 독립 재검증 (verification & validation)

- 판정: **PASS** (6 게이트 전부 증거로 통과, non-blocking note 2)
- 방식: developer self-report 미신뢰, 워킹트리 vs `HEAD` diff + 도구 독립 재실행
- 인터프리터: `/usr/bin/python3` (rdflib/pyshacl/owlrl 보유; 셸 기본 python3엔 부재)

## 대상 (developer 적용분 5종)
MERGE `gr-no-nested-teams`→`gr-depth-limit` / `c-autonomy` topConceptOf /
`gr-grounding`·`gr-flatten-hierarchy` clarify / pattern 대조절 3쌍 / capability 5종 정의.

## 게이트별 증거

### G1 — dangling 0 + depth-limit 잔존·무중복 : PASS
- `grep -rn "gr-no-nested-teams" ontology/` → **0 matches**. dangling 없음.
- `gr-depth-limit` graph-wide 참조 3곳: `harnesses.ttl:254`(h-harness-factory hasGuardrail, **1회만**·중복 아님),
  `patterns.ttl:85`(pat-hierarchical-delegation prose), `guardrails.ttl:90`(자기 선언).
- h-harness-factory 254행: 병합 전 depth-limit **이미 co-bound**였으므로 developer 편집은 no-nested-teams
  **remove-only** (add 아님) — 정당·필수(잔류 시 dangling). 이 파일에 대한 cleanup의 순변경은 이 1줄뿐.

### G2 — validate PASS / 개체수 / determinism : PASS
- `tools/validate.py` → **PASS**. SHACL conforms, reachability **all 235 reachable**,
  capabilities satisfied, assemblyOrder OK, no duplicate labels.
- 개체수 **235** = 직전 236 − 1. cleanup 5파일의 개체 순delta 검증: guardrails.ttl가 typed individual
  `gr-no-nested-teams`를 1개 삭제, 나머지 4파일(concepts/patterns/capabilities/harnesses)은 개체 추가·삭제 0
  (술어·리터럴만 수정) → cleanup 귀속 delta = 정확히 **−1**.
- `tools/check_determinism.py` → **PASS** (byte-identical pack across processes).

### G3 — capability 매칭 유지 : PASS
- capabilities.ttl diff: cap-codeexec/fileedit/websearch/retrieval/citation에 `skos:definition`만 **append**.
  provides/requires·prefLabel·altLabel 무변경 (리터럴 추가라 그래프 위상 무영향).
- validate "capabilities" 축 PASS + retrieve smoke가 h-harness-factory `requires: … File editing, Code execution`
  정상 해석 → provides↔requires 매칭 무손상.

### G4 — c-autonomy floating 해소 : PASS
- concepts.ttl diff: `c-autonomy`에 `skos:topConceptOf id:scheme` 추가, 기존 `skos:related id:c-safety` **유지**.
- `id:scheme`는 동 파일 내 실재 ConceptScheme (topConceptOf 사용 9→**10** 형제와 동형 패턴). SKOS 계층 앵커 확보.

### G5 — 의도된-구별 노드 불변 (스팟체크) : PASS
- patterns.ttl diff = 정확히 3노드만(fanout-fanin/expert-pool/producer-reviewer 대조절 추가).
  `pat-supervisor`·`pat-blackboard`·`pat-peer-mesh` 등 KEEP 판정 노드 **무변경**.
- guardrails.ttl diff = grounding/depth-limit/no-nested-teams/flatten-hierarchy만 접촉. 나머지 37 KEEP guardrail 불변.
- 대조절이 참조하는 `pat-orchestrator-workers`·`pat-supervisor`·`pat-reflection` 모두 typed-decl 1건씩 실재
  (broken cross-ref 없음).

### G6 — 흡수 정합 (의미 손실 판정) : PASS
- 삭제 노드 promptText: "workers are leaf agents, **not themselves leaders of further teams**".
- 병합 후 depth-limit promptText: "those workers **are leaf agents that do not spawn or lead further sub-teams**"
  (원 depth-limit "do not spawn further sub-teams"에 leaf/leader 의미 추가). → leaf-worker 제약 **완전 흡수, 의미 손실 없음**.
- 삭제 노드 prefLabel "No nested teams" → depth-limit `skos:altLabel`로 승격 (검색성 보존). tokenEstimate 42→46 (증가 정당).
- retrieve "limit delegation depth no nested teams" → **Delegation depth limit rel 12.6** 최상위 + "nested teams" 질의로
  포착 확인 → 흡수 후에도 discoverable.

## clarify 세부 (G3/G5 부속)
- gr-grounding altLabel: 과확장 `"assumption and limitation disclosure"`,`"flag unverified claims"`(promptText의
  artifact→rationale/single-source 취지와 불일치) 제거 → `"link artifact to rationale"` 1개로 축소. promptText·
  tokenEstimate(42)·maturity(reviewed) 불변 = §1c 정합(altLabel은 tokenEstimate 범위 밖).
- gr-flatten-hierarchy: "soft preference … NOT the hard numeric cap … id:gr-depth-limit" 판별절 보강, tokenEstimate 34→54.
  gr-depth-limit과의 연질/경질 축 구별 명시 → anti-drift 강화.

## Non-blocking note
- **N1 (워킹트리 격리 아님)**: diff에 이 cleanup 밖 누적 uncommitted 변경 존재 — role-consolidation ripple
  (`role-developer`→`role-implementer`, `role-inspection-worker` 제거, `role-synthesizer` 추가;
  harnesses.ttl hasRole/hasAgent·channels.ttl·observation.ttl·workflows.ttl·materialize.py·materialize-design.md)와
  B24 role-curator(roles.ttl). 이들은 별도 태스크로 이미 검증됨(role-consolidation-verify.md, b24-role-curator-final.md).
  본 cleanup의 결함 아님. inspection이 커밋 스테이징 시 태스크 분리 여부 판단 필요.
- **N2 (개체수 절대값 baseline)**: "직전 236"은 누적 워킹트리 기준값이라 stash 없이 절대 재현 불가.
  단 cleanup 귀속 순delta = −1은 diff로 확증(위 G2). 마지막 커밋 190b55f는 "@237"이나 그 이후 role-consolidation
  등 누적으로 현재 235.

## 재현 명령
```
grep -rn "gr-no-nested-teams" ontology/                      # 0
grep -rn "gr-depth-limit" ontology/                          # harnesses:254, patterns:85, guardrails:90
/usr/bin/python3 tools/validate.py                           # PASS, 235 reachable
/usr/bin/python3 tools/check_determinism.py                  # PASS
git diff ontology/abox/core/{behavioral/guardrails,spec/patterns,spec/capabilities,vocab/concepts,wholes/harnesses}.ttl
/usr/bin/python3 tools/retrieve.py "limit delegation depth no nested teams"
```
