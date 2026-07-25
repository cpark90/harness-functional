# 열린 이슈 추적 (자율 루프 앵커)

> 작성: orchestrator (2026-07-25). **30분 주기 자율 루프(`/loop 30m`, job `1562b40d`)가 매 사이클 이 문서를
> 먼저 읽고 갱신한다.** 사이클마다 상태를 실측으로 재확인할 것 — 시간 경과를 완료로 가정하지 않는다.

## 사용자 설정 목표 (2026-07-25)
> "남은 피드백과 열린 이슈가 없을 때까지 수행. 또한 온톨로지의 내용들이 **통일성과 건전성**있게 정리되고
> **충분히 세분화**되어야 함."

두 축이다. **(1) 채널 배수** — inbox·verified·inquiries에 미처리가 없을 때까지. **(2) 품질 축** — 배수만으로는
목표가 아니며, 온톨로지가 일관되고(통일성) 정합하며(건전성) 충분히 분해돼야(세분화) 한다. 이 축은
`validate.py` PASS로 증명되지 않는다 — PASS는 그래프 정합성만 본다. 따라서 **품질 감사(Q1~Q3)가 별도 작업 항목**이다.

---

## A. 승인된 피드백 (적용 대기/진행 중)

| 항목 | 상태 | 남은 일 |
|---|---|---|
| `harness-100-augmentation.md` | **REFRESHED (채널 제거, 2026-07-25)** — 핵심 요청 충족 | ✅0.5~P0-b~importer~**대표 35 임포트 완료**(published `ccb2cbb`, catalog **38**, CI 39 job green, 로컬경로 스크럽 `a7ad725`). approved + 적용결과 custody(`verified/`에 기록 후 제거, git 이력 보존). **잔여(별건 GAP, optional 후속) = D1 `fp-refer-to-expert` recipe 재바인딩** — 아래 배치 해소 로그 D1에서 추적. |
| `harness-repo-survey.md` | **W0~W4 land 완료 — 예제 잔여 HOLD(유지)** | ①로드맵(c)·②`ho:Hook` 신설·③agent-rules-books·④role 원형 = **W0 `c7ae890`·W1 `925f7ba`·W2 `5c35528`(252→기존7, 신규0)·W3 `9ca09d5`·W4 `f7214b6`(ho:Hook)** 전부 적용. **잔여 = 결정4 "예제 10~20"만** — 소스타입 불일치(role 라이브러리엔 임포트할 하네스 없음, W2 커밋이 GAP 명시) → **사용자 확인 필요**. custody: `verified/harness-repo-survey.md`. |
| `revfactory-harness-reflection.md` | **거의 완료 — 미반영 1건** | 전수 감사 완료(`verified/revfactory-completeness-audit.md`): delta A~E·G 전부 반영, 의도적 미반영 5류. **미반영 GAP = delta F(`cap-skill` Capability + `capabilityContract` 구조 Contract)** — `gr-well-formed-skill`의 강제측. 그래프가 `harnesses.ttl:229`에 "later wave"로 명시 지연. **F 저작 시 완결→refresh.** refresh HOLD |
| `retrieve-nondeterministic-pack.md` | **land 완료** (`d1ac476`, CI green) | 파일 태그만 `open` 유지 — 사용자가 `approved`로 고치면 즉시 refresh 가능. 근거: `verified/retrieve-determinism-finalize.md`. negative control로 가드 실효 확인(8/8 FAIL) |

## B. 기술 GAP — 미해결
> 번호는 **안정 ID**로 취급한다(해소돼도 재사용하지 않는다). 해소분은 §B-done으로 옮긴다.

- **B2. retrieve tie-break 정책**: 지금은 IRI 사전순(재현성용). 동점 17개에 슬롯 5개인 질의가 실재하므로
  **검색 품질** 관점의 정책(maturity/salience 가중)은 미결. → Q2와 함께 다루면 좋다.
- **★B17. 원형↔인스턴스를 잇는 술어가 없다 (TBox GAP, inspection 발견 — 세분화 축 직결).**
  Phase 0.6이 원형 Role 6개를 승격했으나, 로컬 노드가 원형을 **specialize**하는 관계를 담을 어휘가 없다.
  `ho:specializes`는 `domain/range ho:Harness`(`tbox/harness.ttl:608`)라 Role엔 못 쓰고, `ho:derivedFrom`은
  provenance("각색됨") 의미라 방향이 반대다. 실측: staging recipe에 로컬 Role **24개** 중 `Analyst role`·
  `Strategist role`이 신규 중앙 원형과 **문자열만 다른 채 무연결 공존**. 구별이 산문에만 있어 **질의·검증 불가**.
  → 원형 승격의 가치를 실현하려면 이 술어가 필요(TBox 브리프). **미착수.** ★Jaccard 스크린은 이걸 못 잡는다
  (`role-implementer`↔`role-developer` L0.00 — 원형은 일반어·구체는 도메인어라 어휘가 안 겹치는데 의미가 겹침).
- **B18. `retrieve.py`엔 IRI 해소가 없다** (B7의 미해소 축). materialize는 emit 시 `id:`→라벨 해소하지만
  retrieve 팩엔 그대로 실린다 — 텍스트 술어 내 참조 **32/17노드 → 41/24노드**로 증가 중. B7을 "materialize 한정"으로 정정.
- **B22. Contract 축 abox 개체 0 — 메커니즘만 존재** (revfactory 감사 발견). `08ed4df`가 `ho:Contract` 클래스 +
  `capabilityContract` 속성 + `tools/verify_contract.py` **메커니즘만** 심고 인스턴스는 안 만들었다(reorg 회귀 아님,
  원래 0). source-mapping·delta가 "EXISTING Contract 강한 재사용"으로 기댄 축이 개체로 예시되지 않은 상태.
  **delta F(`cap-skill`+`capabilityContract`) 저작이 이 축의 첫 인스턴스가 될 수 있다** — 함께 결정. **미착수(다음).**

## 배치 해소 로그 (2026-07-25, goal 마무리 라운드)
사용자 부재 중, 승인·doctrine이 명확한 열린 이슈를 정리(개별 "사용자 결정 대기"로 방치하던 것 실행).

> **채널 refresh (inspection, 2026-07-25)**: approved + 적용결과 custody 확인 후 inbox 3항목 제거 —
> `execution-separation-invariant`(land `fce72af`) · `webui-save-drops-triples`(land `19a8cc6`) ·
> `harness-100-augmentation`(대표 35 임포트 완료, published `ccb2cbb`/`a7ad725`). 각 원문·verified 보고서는
> git 이력에 보존(복원 가능). `harness-repo-survey`는 **HOLD 유지**(결정4 "예제 10~20"만 잔여, 사용자 확인
> 필요) → inbox에 남김. refresh 후 inbox approved 잔여 = **1**(survey, 예제 잔여).
- **execution-separation-invariant** (approved) → **land `fce72af`**: `gr-execution-separation`+`role-coordinator`,
  4 multi-agent 하네스 배선. 단일에이전트 byte-identical, multi-agent operating-rules +1줄(승인된 의도 변경).
- **webui B13/B14/B15** (approved) → **land `19a8cc6`**: merge-not-replace 무손실(94노드 손실→0), link predicate **TBox 파생**
  (B16 표류 차단), relpath mtime키.
- **B20** CI stale → **수정 완료(미커밋)**: owner/URL 정정 + deprecation 헤더.
- **Q1** 규범 충돌 → **수정 완료(미커밋)**: CLAUDE.md step5를 ONTOLOGYSTYLE §1c 범위로 통일 + observedTokenVolume 구분.
- **D1 `fp-refer-to-expert`** → **저작 완료(미커밋)**: 6+ recipe 재발 중립 원형을 중앙 승격, carrier 배선(226). 기존 recipe
  재바인딩은 후속(federation ripple).
- **D1 카테고리 도메인**(dom-business/legal umbrella 등) → **CLOSED: recipe-local 유지**. roadmap §2가 이미 "도메인은
  recipe-local, 기존 중앙 도메인만 재사용"으로 결정 — 사용자 fork 아님(doctrine).
- **image-gen tool/capability**(07 단독 소비자) → **CLOSED: recipe-local 유지**. ONTOLOGYSTYLE §1c YAGNI(소비자 1 → 미승격).
- **B17** 원형↔인스턴스 specialization 술어 → **저작 완료(미커밋)**: `ho:specializes` domain/range 일반화(근사동의어
  신설 대신 기존 술어 재사용) + `SpecializesTypingShape`로 same-partition 강제(negative control 확인) +
  `role-inspection-worker specializes role-inspection` 예시. 중앙 7 byte-identical(specializes 미emit). recipe 재바인딩은 후속.
- **harness-repo-survey Wave 0** → **완료(미커밋 리포트 `verified/harness-repo-survey-wave0.md`)**. 결과: **확정 TBox gap은
  `ho:Hook` 1건뿐**(나머지 3 gap 강등/defer), role 마이닝은 기존 importer 재사용, ④"전량"=중립화 archetype(raw 253 금지·동명41병합).
  → **harness-repo-survey는 harness-100 규모 아님**. Wave 1 착수 선행: ①B17 land(완료) ②`wshobson/agents` 로컬 clone+NOTICE ③(강권고)retrieve tie-break.
- **delta F / B22** → **저작 완료(미커밋)**: `cap-skill` Capability + 첫 `ho:Contract` 2개(`ct-well-formed-skill-*`,
  structural) + provider Instruction `ins-well-formed-skill`, h-harness-factory 배선(dogfood: 방법론 host가 skill-authoring
  skill을 ship, 그 skill이 well-formed임을 자기 계약으로 검증). `verify_contract h-harness-factory` = **2/2 PASS exit 0**,
  tamper=**FAIL exit 1**(실teeth). 신규 클래스/술어 0, 226→230, 6 harness byte-identical. **revfactory-harness-reflection
  전부 적용 완료 → refresh 가능**. GAP: 부재-assertion grammar(부정 op 없음)·field-anchor(약한 substring)는 tools 확장 신호.
- **harness-repo-survey 진행** (approved, 로드맵 전체):
  - **W0** ✓ 커버리지 감사(`verified/harness-repo-survey-wave0.md`). 확정 TBox gap=`ho:Hook` 1건.
  - **W1** ✓ land `925f7ba`: 신규 중립 패턴 **1개 `pat-blackboard`**(wshobson 15/16 기존 재사용), MIT 귀속+NOTICE.
  - **W2** ✓ (미커밋, 저작 0): 252 외부 role → **전부 기존 7 중립 archetype에 collapse, 신규 0**. neutral-parts 라이브러리가
    role 축에서 **이미 완결**임을 실증(catalog-화 없음). `operator/reliability` 후보 → **CLOSED: 미저작(doctrine — analyst+implementer
    분해, 변별점 domain-특정 = 근사동의어 drift)**.
  - **W3** guardrail dedup(toolkit+agent-rules-books, 온톨로지만) + W1이 넘긴 human-in-the-loop checkpoint guardrail. **다음.**
  - **W4** `ho:Hook` TBox+개체+AssemblySection+materialize 렌더러 **세트**(GAP-4 전례). **W3 후.**
- **★harness-repo-survey "예제 10~20" (사용자 확인 필요)**: 사용자④가 role 원형과 함께 든 "예제 10~20"은 harness-100처럼
  **multi-agent 하네스를 recipe로 import**하는 것인데, 채택 소스(wshobson/VoltAgent)는 **role 라이브러리**라 임포트할 하네스가
  없다(소스타입 불일치). → 예제는 **별도 하네스 코퍼스**(harness-100류)에서 와야 함. **어느 소스로 10~20 예제를 낼지 사용자 확인.**
- **B21. importer가 TestScenario/FailurePolicy를 추출하지 않는다** (inspection 발견, importer land 후속).
  `tools/import_corpus.py`는 skeleton·role·persona·instruction·상수만 기계 생성하고 `hasTestScenario`/
  `hasFailurePolicy`는 브리프 SHOULD 밖이라 미구현. 소스는 거의 전수 제공 → Phase 0.7이 8 recipe에 backfill로
  채운 축. **대량 임포트(대표 35) 전 importer 다음 증분으로 넣지 않으면 동일 누락 35× 복제.** scenarioKind는
  orchestrator skill.md heading 1:1, error표는 중앙 `core:fp-*` 원형 재사용. **착수 조건: D2 결정과 함께.**
- **B20. `docs/ci/data-repo-validate.yml` 이중 stale** (inspection 발견). retired pure-data-repo 템플릿:
  L35 `CENTRAL_REPO: hhmm2728/harness_ontology`(owner·언더스코어 stale → `cpark90/harness-ontology`) ·
  L38 `HARNESS_ROOT_ONTOLOGY: …/data/lpranging`(lpranging은 이제 recipe). recipe repo 패턴이 이 템플릿을
  사실상 대체 → **갱신 또는 폐기 결정 필요**. committed/clean. **미착수.**
- **★B16. "레지스트리 표류" 계열 — 개별 수정이 아니라 불변식으로 막아야 한다** (inspection 진단).
  **B3·B8·B13·B14가 전부 같은 결함**이다: **TBox/디스크가 진실인데 파이썬 리터럴이 그 사본**이고, 사본이
  조용히 뒤처진다(`INSTANCE_CLASSES` · abox glob · `ttl_writer.ORDER` · `INSTANCE_LINK_PREDICATES`).
  전부 **에러 없이 조용히** 실패한다 — 이 세션에서 catalog 누락까지 합쳐 **5번째 같은 양식**이다.
  → 개별 패치 대신 **"사본 == 원본" 불변식 4종을 CI에 거는 것**이 근본 대책. **미착수(권고).**
- **B4. execution-mode 범위 한정이 로컬 주석에만 존재** — `mode-sub-agents`를 읽는 다른 소비자에겐 안 보인다.
  같은 충돌이 다른 하네스에서 재발하면 (B)정의정정/(C)신규모드 재검토 신호.
- **B9. 후계 관계가 그래프에 없다** — 폐기·후계가 `DEPRECATED: superseded by id:x` **산문**으로만 존재.
  `ho:supersededBy` edge가 있으면 폐기 노드 검색 시 후계를 함께 끌어오고, 랭킹도 배수(0.35) 휴리스틱 대신
  **"후계보다 아래"를 구조적으로 보장**할 수 있다. B6의 후속 개선. **미착수.**
- **B11. capacity-fit 검사기 부재** (inspection 신규). `Σ AoO observedTokenVolume ≤ Agent.cognitiveCapacity`는
  SHACL이 못 세는데 이를 재는 도구가 **없다**(현재 48000 vs 150000이라 여유). **술어를 분리한 지금이 린터를 붙일 자리**.
- **B12. 템플릿 본문의 `ho:` 언급 정책** (inspection 신규). techdoc 산출 CLAUDE.md 1곳에 `ho:artifactTemplate`이
  남는다 — `artifactTemplate` **본문 파일**에서 오며 **설계상 의도적 미해소**(이 온톨로지가 주제인 하네스는
  지시문에 `ho:` 용어를 일부러 쓴다). 산출물 자기완결 계약을 템플릿 본문까지 확장할지는 **저작 규약 결정**.
- **★B13. webui 저장이 온톨로지 내용을 조용히 삭제한다 (데이터 손실 — 최고 심각도).**
  inbox: **`docs/feedback/webui-save-drops-triples.md`** (`status: open` — 사용자 결정 대기).
  `ttl_writer.ORDER` **28종** vs TBox `ho:` 술어 **97종**. `_replace_block`이 블록을 **통째 치환**하므로
  **저장 = 목록 밖 술어 삭제**. 손실 규모 **82/205 개체 · 375 트리플 · 56 술어**.
  **★핵심 논거(inspection 실측)**: validate 게이트가 **절반만 막는다** —
  **조용히 성공하며 데이터가 사라지는 개체 27(131 트리플)** vs **FAIL→restore로 편집이 거부되는 개체 55(244 트리플)**.
  > **수치 정정**: 앞서 보고한 "`chan-dispatch` 9줄→2줄, definition·tagged·maturity 소실"은 **틀렸다**.
  > 실제는 **9줄 → 6줄**, 소실은 `channelParticipant`(6)·`involvesUser`·`channelMedium` **3술어 8트리플**이며
  > `definition`·`tagged`·`maturity`는 ORDER에 있어 **보존된다**. 이 개체는 **손실 후에도 validate PASS**라
  > 심각도 판단(조용한 손실)은 그대로다.
- **B14. `INSTANCE_LINK_PREDICATES`에 asserted instance→instance 술어 9종 누락** (B3의 자매 결함, 총 **78 edge**):
  `channelParticipant 25`·`observesMemory 15`·`observesChannel 8`·`agentFunction 6`·`hasChannel 6`·`agentRole 5`·
  `hasAgent 5`·`observesComponent 5`·`hasMemory 3`. `hasAgent/hasChannel/hasMemory`는 추론 시 `hasComponent`로
  잡히나 **나머지 6종은 추론 무관하게 그래프뷰·retrieve 전파에서 안 보인다** — B3로 노드는 보이게 됐는데
  **관측 관계는 여전히 안 보인다**. **미착수.**
- **B15. `server.abox_mtimes()`가 basename을 키로 사용** — 현재 18개 basename이 유일해 무해하지만, 다른 그룹에
  동명 파일이 생기면 **낙관적 잠금이 조용히 뭉개진다**(상대경로 키가 정답). **미착수.**

## B-done. 해소된 기술 GAP (이력)
- **B5** `tokenEstimate` 의미 과부하 → 팩 조기 절단 — **land `8aecd6f`** (CI green). `ho:observedTokenVolume`
  신설 + `traverse()` `break`→`continue`. 실측 **3 nodes/125 → 37 nodes/892**, 예산 초과 노드 **10 → 0**.
  부수 교정: `MANIFEST.tokenEstimate` 49888→2383(관측량 48000 오염 제거).
- **B6** deprecated 노드가 후계보다 상위 검색 — **land `8aecd6f`**. `lifecycle_factor()` 0.35를 seed·hop 양쪽 적용.
  실측 후계 **6.3** > 폐기 **2.835**, 숨기지 않고 배지+`maturity` 필드로 구조화. 미선언 58노드는 1.0(부재 ≠ 폐기).
- **B7** 산출 문서로 내부 IRI 유출 — **land `f71a033`**. `materialize.py`가 **투영 그래프**에서 `id:`→prefLabel,
  `ho:`→label 해소(per-callsite가 아니라 한 지점 → 미래 렌더러 자동 커버). 7 하네스 산출 트리 IRI **0건**,
  무유출 3종 byte-identical, recipe **8/8 federate PASS**.
- **B3** `INSTANCE_CLASSES` leaf 7클래스 미등록 — **land `f735154`**. 파리티 **205/205**(집합까지 동일, 전 205 vs 173),
  MANIFEST types 32건이 상위클래스→구체 leaf로 정정(다른 키 변화 0), CLAUDE.md 7/7 byte-identical.
  recipe 8/8에서 unreasoned 경로가 정확히 +32 → **연합까지 parity 획득**.
- **B8** webui가 abox를 0개 읽음 — **land `f735154`**. 재귀 glob+정렬로 **0 → 18개**,
  `find_subject_file` core 개체 **205/205 해소**(unresolved 0).
- **B10** `ONTOLOGYSTYLE §3`에 `observedTokenVolume` 자리 없음 — **land `7baca84`**. §3 등재 +
  두 술어를 섞지 말라는 [지킴] 계약 + 진단 불변식("`tokenEstimate`가 기본 예산을 넘는 노드 0개").
- **B1** P0-b catalog/CI glob 생성 — **land 중앙 `5084827` / published `d9ebf0c`, CI 9/9 green**.
  `tools/gen_recipe_catalog.py`가 `recipes/*/`를 단일 진실로 catalog+matrix 생성, `--check` 드리프트 가드가 CI에.
  위조 negative control(recipe 빼면 exit 1) 실효 확인. importer 착수 차단 해제.
- **B19** recipes CI `workflow_dispatch` 부재 — **land `d9ebf0c`**. 추가 + 발동 실증(dispatch run success, 전엔 422).

## C. 품질 축 작업 항목 (목표 (2) — `validate.py`가 못 보는 축)

- **Q1. 통일성 감사**: 같은 종류의 노드가 같은 방식으로 저작됐는가 — definition 문체("왜/언제 고르나"),
  `tokenEstimate` 누락, `maturity` 분포, 접두사 규약(ONTOLOGYSTYLE §2 표) 준수, 배너 스타일.
  기계 점검 가능한 항목이 많으므로 **린터성 스크립트**로 만들면 재발 방지가 된다.
- **Q2. 건전성 감사**: 중복/근사동의어(drift) 탐지 — `validate.py`의 duplicate-label 검사는 **완전일치만** 본다.
  의미 중복(예: 같은 원칙을 다른 문장으로 적은 guardrail 2개)은 못 잡는다. 또 deprecated 노드가 실제로
  아무도 참조하지 않는지, capability 짝이 의미적으로도 맞는지.
- **Q3. 세분화 감사**: 아직 blob인 노드가 남았는가. 이미 분해된 축(Workflow→WorkflowStep, SystemPrompt→
  PromptSection, Harness→AssemblySection)과 달리, **한 노드가 여러 책임을 지고 있는 곳**을 찾는다
  (ONTOLOGYSTYLE §1 "노드는 작고 단일 책임"). 코퍼스 인벤토리 결과가 여기 근거를 준다.

### C-0. 초벌 감사 실측치 (inspection, 2026-07-25) — 다음 저작 브리프의 근거
> **방법론**: 품질 감사는 **그래프 스캔만으로 부족하다** — `retrieve.py`·`materialize.py`를 **실제로 돌려야**
> 드러나는 결함군이 있다(예산 절단·랭킹·유출). 위 §B.5~7이 전부 그렇게 발견됐다.

- **Q1**: `tokenEstimate` 누락 **98/189**(예산 과소계상 ~5,200토큰; 최악 `chan-peer` ~212·`h-harness-factory` ~204) ·
  `maturity` 누락 **58**(전부 SpecConcept 계열 — shapes가 일부 클래스에만 minCount를 거는 **비대칭**이 원인) ·
  `definition` 누락 **56**(`Guardrail` 34/34는 관례상 `promptText`가 본문) · **접두사 위반 0**.
  → 진단 정정: ONTOLOGYSTYLE §1c의 **명시 범위 위반은 0**이다. "규칙 위반"이 아니라 **규칙 범위가 좁다**.
- **Q2**: 라벨 근사중복 J≥0.5 **81쌍**(대부분 `os-*`/`as-*` 작명 패밀리 노이즈) · 정의 근사중복 J≥0.55 **9쌍**
  (전부 `AreaOfObservation` internal 패밀리) · deprecated 3개 inbound 참조 0(그래프는 clean).
  > **판정 완료 (orchestrator 직접 판독, 2026-07-25)**: 정의 근사중복 9쌍은 **정당한 대칭 템플릿 — drift 아님**.
  > `oa-{developer,vnv,synthesizer}-internal` 등이 "X's introspection over its own constituent parts: its role
  > and its task-scoped cache memory"를 **agent별로 인스턴스화**한 것으로, 각 agent가 자기 ObservationSpace를
  > 갖는 모델의 본질적 병렬성이다(J=0.86은 구조 동일성이지 중복 저작이 아님). 라벨 근사중복 2쌍
  > (`role-inspection`↔`role-inspection-worker`, `wf-harness-evolution`↔`wf-verify-harness`)도 이름만 유사할 뿐
  > 별개 개념(agent vs worker role / evolution vs verify). ⇒ **Q2 건전성: 실제 drift 0, 정리 불필요.**
- **Q3**: definition 길이 median 210 / p90 485 / **max 1019**(`wf-compose-harness`). blob 후보: `chan-peer` 832 ·
  `h-harness-factory` 818 · `h-workspace-synthesis` 771 · `pat-peer-mesh` 770 · `h-multiagent` 746.
  **다중정책 Guardrail 10/34** — 특히 `gr-design-for-loss`는 한 문장에 정책 4개.
  > **판정 (orchestrator 직접 판독, 2026-07-25) — 사용자 결정 필요, 임의 분해 안 함**:
  > ① **응집도 애매**: `gr-design-for-loss`의 4절(confirm-completion / hold-custody / absolute-state / observable-
  > counters)은 "손실을 정상으로 다루기"라는 **단일 응집 원칙의 4측면**이지 4개 독립 정책이 아니다. 쪼개면
  > "이 4개를 다 바인딩해야 loss-tolerance"라는 응집을 잃어 오히려 나쁠 수 있다. inspection의 "10/34"는
  > promptText 문장 수 기반 기계 신호이지 의미상 다중책임 확정이 아니다.
  > ② **파급 있음**: 후보 전부 하네스 바인딩(`gr-design-for-loss`·`gr-structural-coverage`→`h-multiagent`,
  > `gr-integration-coherence`→`h-harness-factory`) → 분해 시 그 CLAUDE.md가 바뀐다(byte-identity 파괴).
  > ⇒ 세분화가 goal의 "충분히 세분화" 취지에 부합하는지 + 응집원칙을 어디까지 쪼갤지는 **사용자/모델링 결정**.
  > 부재 중 임의 저작하지 않는다. definition blob(길이 상위)은 대부분 하네스/채널의 선택근거 서술이라 분해 대상 아님.

## D. 현재 건전성 기준선 (2026-07-25, 갱신)
`validate.py` **PASS** · 205 individuals · TBox 클래스 44 · abox 18파일 · 기본 assembly order 12 sections ·
`check_determinism.py` PASS.

**land 완료**: 결정성 `d1ac476` · 인벤토리+계획 `4575e11` · **팩 품질(B5·B6) `8aecd6f`** ·
**emit IRI 투영(B7) `f71a033`** · 문서 `6752de7` · 보고/메모리 `e02b266`·`3fae92b`. **전부 CI green**,
recipe **8/8 federate PASS**.
**미커밋 = 진행 중 dispatch 작업분뿐**(C1·C2·C3 정합성 정리). 시간 경과를 완료로 가정하지 말고
매 사이클 `git status`로 재확인한다.

### D-1. 진행 중 dispatch (매 사이클 갱신)
- **developer**: `dispatch-consistency-cleanup.md` C1·C2·C3 — 소유 `tools/ontology_lib.py` ·
  `tools/webui/ttl_writer.py` · `ONTOLOGYSTYLE.md`. **inspection은 이 파일들을 커밋하지 말 것**(완료 보고 전까지).

## E. 사이클 규약
- 실행 중인 dispatch가 있으면 **그 파일 범위를 건드리지 않는다**(병렬 충돌 방지). 특히 **inspection이 git을
  다루므로, 다른 dispatch가 쓰는 중인 파일을 커밋하지 않도록 매 dispatch에 진행 중 목록을 알려준다.**
- 저작은 반드시 developer dispatch 경유. orchestrator는 계획·통합확인만. **git은 inspection 전담.**
- 대규모/비가역 작업은 사용자 부재 중 착수하지 않는다 — 계획·감사·검증까지 진행하고 대기.

### E-1. inspection dispatch 허용 (사용자 지시, 2026-07-25)
> "goal이 완료될 때까지 inspection agent도 dispatch해서 진행해줘."

CLAUDE.md의 **"inspection은 별도 세션 — orchestrator가 spawn하지 않는다"** 규칙은 **이 목표가 완료될 때까지
이 지시로 대체**된다. orchestrator가 `subagent_type: inspection`, `model: opus`로 직접 dispatch한다.
역할 경계는 그대로다 — inspection은 **판정·검증·git만** 하고 `ontology/**`·tools를 편집하지 않는다.
이로써 land 병목(별도 세션 대기)이 사라져 루프가 자립적으로 돈다: **저작(developer) → 확인(orchestrator) →
검증·land(inspection)** 가 한 사이클 안에서 닫힌다.
