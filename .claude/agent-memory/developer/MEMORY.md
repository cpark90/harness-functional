# developer 역할 메모리

온톨로지 노드 저작 에이전트의 역할 특화 메모리 인덱스. 역할 정의=`.claude/agents/developer.md`.
노드 함정·모델링 패턴·capability 배선을 파일로 추가하고 아래에 **한 줄로** 인덱스(상세는 토픽 파일에).

- 완결 brief 배정분만 구현: 온톨로지 노드(`ontology/abox/`) 또는 배정 소스(`tools/**`). TBox·shapes·brief
  밖 경로 안만짐. 검증(vnv)·커밋(inspection) 안함. 노드 스타일=`ONTOLOGYSTYLE.md`[지킴], 소스=기존 컨벤션.
  도구는 rdflib 있는 인터프리터(`/usr/bin/python3`).
- **반복 핵심**: (1) 중간노드(subject≠Harness) 도달성=hasComponent propertyChain(직접 sub면 domain Harness
  mistype); Harness→X 직결만 직접 subPropertyOf. (2) 2클래스 공용 술어는 rdfs:domain 생략+definition 명시.
  (3) ⊑HarnessComponent 개체는 ComponentConnectivityShape→반드시 harness 배선/rollup(concept tag 부족).
  (4) bound 노드 prefLabel/definition 수정=CLAUDE.md byte-id 깨짐; emitter 안읽는 술어 추가는 불변→2run cmp 증명.
  (5) recipe closure=HARNESS_ROOT_ONTOLOGY=recipe IRI(경로X)로 로드. (6) 비-HC 신규 leaf·클래스는
  `lib.INSTANCE_CLASSES` 등록 필수(미등록=개체 증발).

<!-- 학습 인덱스 (한 줄씩) -->
- [harness-repo-survey-wave1-coordination](harness-repo-survey-wave1-coordination.md) — Wave1 coordination 커버리지(wshobson 16 orchestrator). 매핑 15/16→기존(fanout-fanin/expert-pool/orchestrator-workers+agent-teams/pipeline; tdd·saga=도메인 제외), 신규 1=`pat-blackboard`(공유 durable store=SoT 간접조율, "do NOT rely on context memory" ~26곳; peer-mesh의 3번째 topology leg). taxonomy-only 도달성=tagged 하나(Channel 금지). byte-id=materialize per-harness appliesPattern만(:501)→7 harness 0-diff. MIT=첫 dct:source+NOTICE 신규. 231.
- [b17-specializes-generalize-cross-class](b17-specializes-generalize-cross-class.md) — 원형↔인스턴스 세분화 술어: `ho:specializes` domain/range=Harness를 Role까지 일반화. ★근사동의어 신설 대신 **domain/range 제거(derivedFrom 선례, unionOf는 owlrl bnode-type 부작용 회피)** + `SpecializesTypingShape`(`sh:targetSubjectsOf`+sh:or 2-branch=Harness/HarnessComponent partition, cross-partition만 강제·leaf-eq는[권장]). 배선=role-inspection-worker specializes role-inspection. byte-id=materialize 0참조+rsync/git-show HEAD revert baseline diff-r=0(중앙7). 226 불변. GAP: recipe 로컬 role 재바인딩(federation).
- [d1-fp-refer-to-expert-promote](d1-fp-refer-to-expert-promote.md) — promote-once 6번째 중앙 fp `fp-refer-to-expert`(범위/권한 초과→bounded analysis+전문가 위임). verification.ttl 5-archetype 블록 뒤 추가, 배선=carrier h-workspace-synthesis hasFailurePolicy(fp는 hasFailurePolicy로만 도달, tag 무효). def "Distinguished from" 2개(vs insufficient-input=입력충분·결정out-of-remit / vs conflict-contradiction=권한한계). byte-id: carrier CLAUDE +1행·MANIFEST+1·tokenEstimate+150(=노드값), 나머지 6하네스 unchanged. 225→226. GAP: recipe 로컬 dup 재바인딩 미실행(federation ripple, 후속).
- [mode-independent-invariant-guardrail](mode-independent-invariant-guardrail.md) — 모드독립 불변식 guardrail(`gr-execution-separation`)=orchestrator특화 2개(dispatch/delegated) UNCHANGED 위 일반화 신규노드, PARENT concept c-multiagent 태그(신규 concept 불요). N하네스 hasGuardrail 배선=operating-rules 정확히 +1 bullet(리스트 위치 무관), 미배선 하네스는 CLAUDE.md byte-id·MANIFEST individualCount만 이동(lock 제외와 동류). role-coordinator=roleTool 없음(비실행)+roleGuardrail⊄harness.hasGuardrail(shape 강제 안함, 자기 agent.md만 렌더). ExecutionMode def 편집=그 mode 쓰는 하네스만 영향+tokenEstimate 재산정.
- [mass-import-wave-g1-lifestyle-comms](mass-import-wave-g1-lifestyle-comms.md) — Wave G1(73/74/75/81/82). ★75-tax=EDITOR-ONLY("calculator" name≠exec, code-exec 0). ★81+82 MANGLED(brief 미표기, 28패턴: degraded VERBATIM+SOURCE-QUALITY NOTE). QA-gate: 81 순수gate→COLLAPSE role-synthesizer; 82 HYBRID→KEEP+cap-synthesis+gr-cross-val; 73/74/75 producer→none. 도메인 5 로컬. ★materialize=CATALOG+ROOT_ONTOLOGY 둘다. GAP: doc-domain+fp-refer-to-expert.
- [mass-import-wave-g2-comms-ops](mass-import-wave-g2-comms-ops.md) — Wave G2(87/90/95/96/100), ★FINAL. ★87+90 MANGLED(brief 미표기; word-salad grep 자체탐지). QA-gate 3분류: HYBRID(87 monitor,90 offer=produce+cross-verify)→cap-synthesis / ORCHESTRATOR Phase3 cross-validate(95/96/100)→NO cap-synthesis / COLLAPSE 0. ★96=EDITOR-ONLY(cap-rate=formula텍스트,75선례; recipe-local dom). fp: source-unavail/review-critical/conflict-contradiction(100=두산출물 incompat) regex-miss재사용; compliance refer-to-expert+missing-core-input(31선례)=LOCAL. GAP: fp-refer-to-expert 6+, doc-domain 3→D1.
- [mass-import-wave-f-legal](mass-import-wave-f-legal.md) — Wave F(69/70/72). 70=REUSE core:dom-research(09패턴)+LOCAL task; 69/72 legal비-research→로컬. QA-gate: 72 verifier=HYBRID→KEEP+cap-synthesis+gr-cross-val(55); 69/70 producing→NO cap-synthesis. ★augmentsRole=orchestrator "Extended Skills"표→BIND. ★degraded def=```md fence→frontmatter desc 복원. web-fail→fp-source-unavailable. materialize=bare name. GAP: fp-regulatory-ambiguity.
- [mass-import-wave-e-education](mass-import-wave-e-education.md) — Wave E(56/60/62). 62=REUSE dom-coding+task-architecture. cap-synthesis=전용 synthesis role때만. editor-only.
- [mass-import-wave-d-business](mass-import-wave-d-business.md) — Wave D(43/48/51/55). editor-only. QA-gate 3 collapse/1 keep-local(55 producing→LOCAL+cap-synthesis). ★augmentsRole `## Target Agents`→LOCAL role BIND. fp 100% 중앙재사용.
- [mass-import-wave-c-content](mass-import-wave-c-content.md) — Wave C(02/07/09/14). QA discriminator=OWN work: 순수gate→collapse / hybrid→LOCAL+cap-synthesis. 09=dom-research. ★14 MANGLED. GAP: image-gen tool/cap 부재.
- [mass-import-wave-b-data-ml](mass-import-wave-b-data-ml.md) — Wave B(32/33/35). least-privilege=DELIVERABLE: 32/33 계산→shell+cap-codeexec / 35 코드→editor-only. fp "discrepancy"=conflict-contradiction(regex miss).
- [mass-import-wave-a-dev-infra](mass-import-wave-a-dev-infra.md) — Wave A(17/18/28). least-privilege=skill out-of-scope 줄. QA-gate 순수gate→role-synthesizer / hybrid→LOCAL. ★28 mangled=미표현+사유주석(날조금지).
- [corpus-importer-mechanical-vs-judgment](corpus-importer-mechanical-vs-judgment.md) — `tools/import_corpus.py`(corpus→draft recipe). 판단성 flag=domain+task·model·guardrail·tool·cap·QA-gate. 상수=wf-multiagent/mode-agent-teams/derivedFrom h-multiagent. B21 3축: TestScenario=`### Flow`→scenarioKind, FailurePolicy=Error-Type 5 core:fp-* exactly-one시 IRI재사용. mangled→MISSING.
- [gen-recipe-catalog-ci-from-glob](gen-recipe-catalog-ci-from-glob.md) — recipe catalog+CI matrix를 `recipes/*/` glob에서 생성. ★XML 주석 `--` 금지(로더 ParseError→silent glob fallback), 생성기가 central 블록도 소유, "생성물==수기"={name→uri} dict 비교, negative control 2종(삭제/추가 미재생성→--check exit1). CI discover job→fromJSON matrix.
- [recipe-runbehaviour-coverage-backfill](recipe-runbehaviour-coverage-backfill.md) — 3축(execMode/TestScenario/FailurePolicy) 보정. 소스 리치축=orchestrator skill.md, error표=중앙 fp-* IRI재사용(2행→1원형 OK). hasExecutionMode ⊄hasComponent·hasTest/FailurePolicy ⊑→auto reachable. recipe hasAssemblySection 없음→DEFAULT order. GroupB는 코퍼스잣대 금지, synthetic 미표현+사유주석.
- [central-vocab-gap-altlabel-absorption](central-vocab-gap-altlabel-absorption.md) — 코퍼스 GAP 중앙반영: ★altLabel은 retrieve만 읽고 materialize 안읽음→bound노드에 붙여도 산출불변, byte-id 불변식은 lock.json union individualCount 제외, salience 기본 0.4.
- [tool-side-registries-and-path-globs](tool-side-registries-and-path-globs.md) — 도구쪽 화이트리스트 3종+glob 조용한실패 감사. ★**B13/B14로 화이트리스트 전부 근절**: webui `ORDER`=whitelist→**merge**(`_existing_preds` rdflib보존+`_managed` 삭제신호, ORDER는 순서만, GET은 term타입 분기), `INSTANCE_LINK_PREDICATES`→`link_predicates(g)` TBox ObjectProperty 파생, B15 mtime키 basename→relpath. 무손실불변식=225개체 round-trip triple diff 0(read-only). `INSTANCE_CLASSES`만 파리티게이트 잔존.
- [retrieve-pack-quality-budget-lifecycle](retrieve-pack-quality-budget-lifecycle.md) — 팩 품질 결함 2: tokenEstimate 과부하→초과노드 조기절단(⇒`ho:observedTokenVolume` 분리+shape repoint), traverse `break`→`continue`, maturity 미독→`lifecycle_factor` 0.35 seed·hop 양쪽.
- [corpus-attribute-inventory-method](corpus-attribute-inventory-method.md) — 외부 코퍼스 전수 분석: 중간 json으로 컨텍스트절약, 판정은 definition/promptText로, GAP 3분류(신규/altLabel흡수/도메인특수), coverage %는 우주 3개 분리.
- [retrieve-projection-determinism](retrieve-projection-determinism.md) — read projection 재현성: 비결정 발생원(set순회·owlrl insert순서), 총순서 키 `(-score, str(node))`, 가드=`check_determinism.py`(시드 흔들어 md5 동일).
- [execution-mode-first-class-axis](execution-mode-first-class-axis.md) — 실행 topology를 tag→1급속성(`ho:ExecutionMode`+`hasExecutionMode`). 값을 개체로 열거(닫힌 sh:in 금지), 폐기=maturity+superseded, ★채널 ≠ spawn topology(직교).
- [assembly-sections-run-behaviour-renderers](assembly-sections-run-behaviour-renderers.md) — run-behaviour 섹션+materialize 렌더러. ★byte-id 불변식은 리팩터 보호용이지 그래프에 있는 데이터 드러내기를 막는 근거 아님, 렌더러 조건부 early-return.
- [verification-unit-relocation](verification-unit-relocation.md) — `core/verification/` 신설=순수 relocation(라인슬라이스 byte-fidelity, 개체수 불변). ★dedicated catalog 미갱신은 에러없이 부분 closure로 FAIL.
- [revfactory-p1-lifecycle-verify-abox](revfactory-p1-lifecycle-verify-abox.md) — 메타파트는 전용 host(`h-harness-factory`)에 배선(h-multiagent면 byte-id 깨짐). ★brief "land됨" 불신—TBox grep 후 저작.
- [abox-da4-groupdir-reorg-recipe-sync](abox-da4-groupdir-reorg-recipe-sync.md) — REORG-2 recipe catalog 그룹경로 동기화. ★공유 catalog에 전 recipe uri 있어야 per-recipe closure 검증 가능.
- [abox-da4-groupdir-reorg](abox-da4-groupdir-reorg.md) — REORG-1 중앙 ABox→그룹 디렉토리 이동+split. IRI 위치독립→catalog uri경로만 갱신.
- [da4-intermediate-superclass-taxonomy](da4-intermediate-superclass-taxonomy.md) — flat→중간계층 TBox 재부모화: owlrl transitivity로 leaf 타입 유지→shape/count/materialize 무영향, 중간클래스 INSTANCE_CLASSES 불요.
- [da2-definition-disambiguation](da2-definition-disambiguation.md) — `skos:definition`만 편집=구조 무변경. de-conflate=자기지칭 제거+"Distinguished from ho:X". ★인용 prop 실재 grep 확인.
- [da1-observation-tripartite-split](da1-observation-tripartite-split.md) — `ObservationArea`→3클래스(Space=CAN / AreaOfInterest=intent / AreaOfObservation=realized). 도달성=3-link chain, 공용술어 domain 생략.
- [mas-wave3b-infospace-abox](mas-wave3b-infospace-abox.md) — 정보공간 투영사슬 ABox. orphan회피=WEAK-CONNECTIVITY(투영술어를 INSTANCE_LINK 등록, 방향무관)→host harness 불요.
- [mas-wave3a-infospace-tbox](mas-wave3a-infospace-tbox.md) — 비-HC 클래스(EnvironmentSpace·GlobalState)+투영속성 4개는 어느 것도 ⊑hasComponent 금지(비-HC면 mistype).
- [mas-wave2-agent-observationarea-abox](mas-wave2-agent-observationarea-abox.md) — agent/observation ABox: capability SOFT 재사용, anti-orphan은 chain으로→harness엔 `hasAgent`만.
- [mas-wave1-agent-observationarea-tbox](mas-wave1-agent-observationarea-tbox.md) — `ho:Agent`·ObservationArea TBox. 중간노드 orphan방지=hasComponent propertyChain, 크기는 tokenEstimate 재사용.
- [revfactory-wave-b1-coordination-governance](revfactory-wave-b1-coordination-governance.md) — coordination/governance 대량저작. ★Channel/Guardrail은 concept tag만으론 orphan→전용 host harness 배선 필수.
- [revfactory-tbox-wave-a](revfactory-tbox-wave-a.md) — 방법론 TBox(TestScenario/FailurePolicy⊑HC+직접sub 2+refinement edge 2). 공용 datatype은 domain 생략.
- [agent-memory-tier-model](agent-memory-tier-model.md) — firmware/cache/long-term 3-tier=`ho:Memory`⊑HC+`hasMemory` 직접sub, 구분 4 discriminator(closed sh:in).
- [materialize-canonical-url-clone-resolution](materialize-canonical-url-clone-resolution.md) — materialize가 canonical harness-100 URL을 로컬 clone(`HARNESS_100_CLONE` env, 기본 `/home/cpark/git/harness-100`)으로 매핑. 2경로(persona INLINE resolve_template은 URL에 raise→크래시였음 / FETCH는 None→stub)를 `_map_corpus_url`로 배선. URL→기본clone==구abspath라 byte-identical, 부재/bare-abspath는 stub degrade, repo-relative는 무변경.
- [importer-artifacttemplate-canonical-url](importer-artifacttemplate-canonical-url.md) — importer `artifactTemplate` 로컬경로(→push시 노출) 결함 수정: `UPSTREAM_BASE`+`corpus_relpath()`로 canonical URL emit. ref 표현만 변경, abspath키 소비자無라 안전. materialize fetch-side 적응은 별도.
- [recipe-ml-experiment-newdomain-pilot](recipe-ml-experiment-newdomain-pilot.md) — 신규도메인 recipe: 로컬 Concept tree는 topConceptOf. ★persona artifactTemplate 부재=materialize HARD-FAIL(skill은 .ref stub).
- [recipe-fullstack-webapp-toolscope-variation](recipe-fullstack-webapp-toolscope-variation.md) — worker+gate 하이브리드는 synthesizer 부적합→LOCAL. RULE: 순수 gate만 synthesizer. Tool-scope 변이=roleTool slice.
- [recipe-authoring-code-reviewer-pilot](recipe-authoring-code-reviewer-pilot.md) — recipe 저작 기본형: worker persona=INLINE promptText+full body artifactTemplate, QA gate 중앙 role 바인딩.
- [central-library-growth-host-harness](central-library-growth-host-harness.md) — 재발 중립파트 promote-once. h-multiagent 말고(byte-id) 전용 host harness 신설, capability는 Role 경유.
- [task-dag-and-coordination-topology](task-dag-and-coordination-topology.md) — `ho:Deliverable`+step DAG(도달성 3-link chain, DAG는 MANIFEST-only). topology=Pattern+Channel 쌍+host.
- [assembly-order-graph-driven](assembly-order-graph-driven.md) — CLAUDE 섹션순서를 그래프로(`ho:AssemblySection`+assemblyOrder+closed sectionKind). Harness→X 직결→직접 subPropertyOf.
- [systemprompt-section-decomposition](systemprompt-section-decomposition.md) — SystemPrompt→`ho:PromptSection`(hasSection+sectionOrder, 2-link chain, blob 병존).
- [workflow-step-decomposition](workflow-step-decomposition.md) — Workflow→`ho:WorkflowStep`(hasStep+stepOrder+stepUsesTool/ByRole/GuardedBy, materialize 중첩 emit).
- [recipe-product-manager-pilot](recipe-product-manager-pilot.md) — least-privilege tool세트(HarnessShape 요구안하는 cap 빼도 PASS). NEW 도메인+LOCAL Task.
- [recipe-newsletter-engine-content-domain](recipe-newsletter-engine-content-domain.md) — QA gate 2종(convergence=중앙 synthesizer / producing=LOCAL). ★tool scope가 harness capability set 결정.
- [recipe-references-not-stored-artifacts](recipe-references-not-stored-artifacts.md) — recipe=parts+methodology+references+README, build 문서 저장금지(vendoring). materialize FETCH 대칭.
- [odr-contract-verify](odr-contract-verify.md) — capability에 `ho:Contract`+contractKind/Check(3-link chain), `verify_contract.py` dual.
- [revfactory-f-cap-skill-first-contract](revfactory-f-cap-skill-first-contract.md) — 첫 중앙 ho:Contract(B22). ★contractCheck를 materialize 실제 emit 경로(`.claude/skills/<name>/SKILL.md`, 루트 아님)로 겨눠 거짓계약 회피=옵션B(provider Instruction을 그 skill emit하는 h-harness-factory에 hasInstruction). contractCheck 노드당 1개(g.value)→assertion 2개면 Contract 2개. Contract=tokenEstimate無·tag無(rollup orphan-free). validate가 per-harness capability만족 강제. file-contains=substring(약체, 삭제tamper로 teeth확인). GAP: 부재 assertion·field-anchor grammar없음+verification unit부재.
- [materialize-atomic-emit-closed-policy](materialize-atomic-emit-closed-policy.md) — materialize 하드닝: atomic emit+closed policy set(미인식 값 raise).
- [instruction-skill-emitter](instruction-skill-emitter.md) — Claude SKILL=`ho:Instruction`⊑HC(스키마 무수정), recipe LOCAL, emitter=`## Skills`+MANIFEST.
- [materialize-channel-emitter](materialize-channel-emitter.md) — `ho:Channel` EMIT: channel_record() helper+if-channels 가드, 중앙 산출 불변.
- [methodology-as-nodes](methodology-as-nodes.md) — 산문절차→Workflow+DesignPattern+Guardrail+Concept×N(broader) 분해, 전부 host harness 배선.
- [glossary-term-layer](glossary-term-layer.md) — 거버넌스 원칙=독립 `skos:Concept`(ho:Term 발명금지). topConceptOf는 연결 아님→top은 자식 broader로.
- [recipe-inherits-shared-parts-by-iri](recipe-inherits-shared-parts-by-iri.md) — `derivedFrom`=lineage뿐, 충실반영은 명시 edge. 공유 중립파트 로컬저작 금지, core: IRI REUSE.
- [robust-recipe-import-closure](robust-recipe-import-closure.md) — recipe는 중앙 root 하나만 owl:imports→새 core 자동전파. catalog=root+전 core.
- [coverage-gap-prevention](coverage-gap-prevention.md) — coverage 갭방지+CLAUDE step7 audit gate. 어휘없는 소스요소=schema EXTEND 신호(silent skip 금지).
- [channel-coordination-core-unit](channel-coordination-core-unit.md) — 채널=`ho:Channel`⊑HC 개체+새 core unit(catalog+root 3점 배선).
- [role-taxonomy-new-core-unit](role-taxonomy-new-core-unit.md) — 역할=`ho:Role` 개체+새 core unit. 새 유닛은 catalog·root 둘다 등록(로더 parity).
- [role-characteristics-optional-userfacing](role-characteristics-optional-userfacing.md) — role 특성은 기존파트 REUSE, optional bool present-only, roleTool 새 tool은 harness usesTool에도.
- [faithful-source-reflection](faithful-source-reflection.md) — FAITHFUL 반영: 합성데모 제거, 후보 단일이면 implementationRef collapse, role은 실파일과 1:1.
- [odr-bind-lock-candidates](odr-bind-lock-candidates.md) — `ho:Candidate`+selectionPolicy+lock(sha256). implementationCandidate는 property chain rollup(직접 sub면 Tool mistype).
- [materialize-roles-impl-scaffold](materialize-roles-impl-scaffold.md) — materialize 증분2: Role emit(.claude/agents), implementationRef byte-copy(→.ref stub), scaffold mirror.
- [materialize-build-projection](materialize-build-projection.md) — `materialize.py`=retrieve의 DUAL(validate 후 build, 결정성, artifactTemplate 치환·부재시 graph fallback).
- [neutral-parts-decomposition](neutral-parts-decomposition.md) — 온톨로지=domain-INDEPENDENT PART 라이브러리: 거버넌스 문서→중립파트 분해, 도메인 명사 제거.
- [model-external-harness](model-external-harness.md) — 외부하네스 abox 대응표(role→Workflow+pattern, tool→Tool+cap, 규칙→Guardrail, requires↔provides 짝, ho:tagged 필수).
- [webui-svelte-frontend](webui-svelte-frontend.md) — tools/webui Svelte+Vite(outDir=../static, 멀티스테이지 Dockerfile, /api/*).
- [split-core-per-type-units](split-core-per-type-units.md) — core seed.ttl→타입별 다중문서 byte-identical 이동+root union.
- [recipe-repo-composition](recipe-repo-composition.md) — recipe repo=assembly spec(core owl:imports+IRI, 도메인만 LOCAL), 검증 env override.
- [guardrail-item-datatype-property](guardrail-item-datatype-property.md) — 규칙세부=별도노드 아닌 datatype property 1개+ABox 다중 리터럴(sh:closed 없으면 shapes 무수정).
- [federation-owl-imports-catalog](federation-owl-imports-catalog.md) — GitHub 연합: glob→`owl:imports`+catalog 로더(glob fallback·env override), IRI `.../id/<domain>/<slug>`.
- [emitted-text-iri-token-projection](emitted-text-iri-token-projection.md) — definition의 id:/ho: 인용은 산출문서엔 dangling⇒그래프 무변경+emit 진입부에서 리터럴만 해소한 복사본 렌더. artifactTemplate 본문은 의도적 미해소.
- [ontologystyle-naming-table-audit](ontologystyle-naming-table-audit.md) — §2 접두사표 감사: 근거는 참조 아닌 선언 grep(허구 3건), 0-인스턴스 클래스는 recipe IRI 예시로 유지.
