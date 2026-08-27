# composition (new-harness) 검증 재현 절차 + 함정

새 harness abox 파일 하나가 저작됐을 때의 V&V 표준 체크리스트.

## 재현 명령 (전부 `/usr/bin/python3`)
- 구조 게이트: `tools/validate.py` → `PASS`. 4섹션(SHACL / reachability / capability / dup-label) 캡처.
- 발견성: `tools/retrieve.py "<원 request>" --format json` → 대상 harness가 seeds 상위(이상적 #1)인지.
  2차 쿼리로 컴포넌트(workflow/pattern)도 뜨는지 스팟체크.
- 그래프 직접질의(rdflib, tbox+seed+새파일 parse): HarnessShape 슬롯 카운트, requires→provides는
  **harness에 실제 바인딩된 컴포넌트의 providesCapability**로만 매칭(개발자 주장 말고 그래프에서 읽기).

## 판정 함정 / 요령
- **HarnessShape 실제 최소구성 ≠ CLAUDE.md 산문**: `ontology/shapes/harness-shapes.ttl`의
  `HarnessShape`가 sh:minCount로 강제하는 건 **prefLabel + targetsDomain + addressesTask +
  hasSystemPrompt(≥1) + hasWorkflow(≥1)** 뿐. **usesTool / hasGuardrail / usesModel 은 minCount
  없음** — tool·model 없는 harness도 SHACL PASS. CLAUDE.md 워크플로 산문("1 SP + ≥1 WF + tools +
  guardrail + ModelConfig")은 shape보다 strict. 따라서 브리프가 "≥1 Tool" 요구해도 그래프에서
  Tool=[]면 결함(fail) 아니라 **pass-with-notes** 판단거리(중립 template은 tool이 도메인결합이라
  일부러 뺀 것일 수 있음). EdgeTypingShape는 usesTool/hasGuardrail의 sh:class(타입)만 검사, 존재는 아님.
- **tokenEstimate [지킴] 범위(ONTOLOGYSTYLE §1c:75-76)**: 필수 대상은 **promptText 지닌
  SystemPrompt/Instruction/Guardrail/Example + Tool/Workflow**뿐. `skos:definition`만 가진
  Task/Capability/DesignPattern/Harness/Domain/Concept은 **범위 밖** — 없어도 결함 아님.
  seed.ttl도 동일(Task 0/4, DesignPattern 0/3, Harness 0/3만 tokenEstimate 보유). 순진하게
  "definition=text니까 tokenEstimate 필요"로 잡으면 오탐. (Workflow는 definition만 있어도 tokenEstimate
  대상: wf-multiagent는 promptText 없이 definition+tokenEstimate 74 — 정상.)
- **TBox drift 체크**: 새 파일에서 쓰인 `ho:` 술어/타입 집합 - TBox 선언 집합 = 공집합이어야.
  프로그램으로 diff. 하나라도 남으면 near-synonym class/untyped edge 신설(=drift) 의심.
- **neutrality 판정(도메인 결합 제거 rework)**: `grep -rniE '<domain terms>' ontology/` 후
  `# comment` 라인 제외 매치=0이어야 노드 내부 오염 없음. 주장된 dropped-id 전부 union에서 0건 resolve
  확인. promptText 샘플은 "명명된 기술 유무"로 중립 판정(용어 없으면 통과하되 적용범위 좁으면 note).
  놓친 재사용 원칙 지적 유효(예: 이 repo 골든룰 #1 context-budget/anti-rot는 guardrail로 미추출).
- **"omit한 guardrail" 평가 시** 먼저 그 노드가 seed에 **실재하는지** 확인. 없으면 "omit"=신설
  안 함(anti-drift 준수)이지 누락 아님. 있는데 안 붙였으면 validation 판단거리.
- **near-synonym guardrail**: prefLabel + promptText 스코프로 판별(예: gr-traceability=결정/기록
  수명주기 vs gr-nodestruct=쉘 파괴명령 안전 → 별개). validate dup-label은 동일 label만 잡음.
- **derivedFrom**은 실제 존재하는 template(보통 Harness) 가리키는지 타입까지 확인. 단 *decomposition*
  (거버넌스 문서→중립 파트)은 base harness가 없어 harness에 derivedFrom 없어도 정상(자기가 template).

판정 리포트:
- `docs/verify/lpranging-sysdesign.md` (pass-with-notes: 구조/shape/drift/rot 통과; notes=모델 tier
  sonnet vs 템플릿 opus, 피드백루프 미모델링 — draft 승격 전 리뷰거리).
- `docs/verify/neutral-parts-rework.md` (pass-with-notes: 중립화 rework — grep 0매치, dropped-id 12개
  0건, 로더등가 1364/symdiff0, 63개체, drift 0, requires→provides 내부바인딩; notes=h-multiagent Tool
  없음(shape는 허용, 중립 의도), gr-design-for-loss 적용범위 좁음, context-budget 원칙 미추출).

## oversight-pair (central archetype + 2 recipes 동시검증) 재현 — docs/verify/oversight-pair-verify.md
- **central+recipe 페어 검증 표준 시퀀스**: ① central validate/lint/determinism PASS(250,0-orphan) →
  ② recipe closure(임시 `ln -sfn <central> central`→`HARNESS_CATALOG=catalog-v001.xml
  HARNESS_ROOT_ONTOLOGY=…/recipes/<r> /usr/bin/python3 central/tools/validate.py`, 264=250+14local,
  끝나면 `rm -f central`) → ③ `gen_recipe_catalog.py --repo . --check`(55 in-sync).
- **capability 게이트가 핵심**: `specializes`는 `providesCapability` 전파 안 함 → 로컬 role이
  `providesCapability core:cap-*` 직접 명시해야 harness requiresCapability 충족. rdflib로 union서
  실제 triple 읽어 확인(개발자 주석 말고). role-comparator→cap-benchmarking, role-operation-auditor→cap-audit.
- **specializes 타깃 resolution은 SpecializesTypingShape 초과 필수축**(shape는 coarse Harness/Component
  partition만) → rdflib로 각 로컬 role의 specializes object가 central `ho:Role` typed·recipe-ns 밖인지.
  dangling core: refs=모든 core: object가 typed subject로 resolve하는지 스캔(0이어야). 스크립트는
  scratchpad/chk.py(central glob parse + recipe parse).
- **anti-drift for new archetypes**: 정의 산문에 "Distinguished from id:role-X, which…" 판별절이
  브리프가 지정한 sibling 전부(benchmarker↔research/analyst/synthesizer, auditor↔vnv/inspection/analyst)에
  대해 박혀 있는지. cap 신설은 기존 cap 정의와 축 대조. recipe는 **신규 central vocab 0**(Golden #2).
  altLabel 중복(archetype↔specialization "compliance watchdog")=결함 아님(dup-label check는 prefLabel-scoped).
- **coverage-audit 함정 2개(accepted-reason, GAP 아님)**: (Note-1) "continuous/지속"=mode-agent-teams
  (persistent standing team "for the span of run")+promptText "continually"로 충분; ExecutionCadence류
  신클래스 만들면 그게 drift. (Note-2) "enforce/단속"=raise enforcement finding to approval gate
  (c-enforcement-finding+chan-agent-user+gr-no-arbitrary-decision), autonomous remedy 아님=repo raise-don't-decide
  거버넌스 의도적 out-of-model, recipe header에 명시=silent skip 아님. gr-no-arbitrary-decision=raise-don't-decide,
  chan-agent-user def="enforces human approval gate before any application".
