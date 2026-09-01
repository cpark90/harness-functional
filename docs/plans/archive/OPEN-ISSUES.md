# 열린 이슈 추적 (스냅샷 — 자율 루프 종료 후 재동기화)

> 작성: orchestrator (2026-07-25). **재동기화: developer dispatch (2026-07-28) — git 이력·현재 트리 실측.**
>
> **자율 루프 종료**: 이 문서를 매 사이클 갱신하던 30분 주기 자율 루프(`/loop 30m`, job `1562b40d`)는
> **중단됐다**. 따라서 이 문서는 더 이상 "자율 루프 앵커"가 아니다.
> **live 백로그의 단일 진실 공급원은 이제 feedback 채널**이다(inbox `docs/feedback/` → 판정 후
> `docs/feedback/verified/`, 조사 lane `docs/feedback/inquiries/`). **이 문서는 그 스냅샷/보조**이며,
> 상태를 인용할 때는 시간 경과를 완료로 가정하지 말고 git 이력·현재 트리로 재확인한다.
>
> **실측 현황 요약 (2026-07-28)**: inbox `docs/feedback/` = **비어 있음**(승인·미처리 0, 모든 항목
> `verified/`로 custody 이전). `validate.py` **PASS**(capacityFit·registryDrift·determinism 포함),
> **245 individuals**. §B 기술 GAP는 **B4(dormant) 1건과 user-blocked 1건을 제외하고 전부 land**됐다.

## 사용자 설정 목표 (2026-07-25)
> "남은 피드백과 열린 이슈가 없을 때까지 수행. 또한 온톨로지의 내용들이 **통일성과 건전성**있게 정리되고
> **충분히 세분화**되어야 함."

두 축이다. **(1) 채널 배수** — inbox·verified·inquiries에 미처리가 없을 때까지: **inbox 소진 완료**.
**(2) 품질 축** — 온톨로지 통일성·건전성·세분화: **Q1(린터)·Q2(drift 0)·Q3(세분화 충분) 세 축 모두 처리**
(§C). 남은 것은 **user-blocked 1건**(harness 예제 코퍼스 지정)과 **dormant 1건**(B4)뿐이다.

---

## A. 승인된 피드백 — 처리 결과
> 전 항목 inbox에서 custody 이전 완료(`verified/`에 durable 기록, git 이력에 원문 보존).

| 항목 | 상태 | 근거 |
|---|---|---|
| `harness-100-augmentation` | **완료** | 대표 35 임포트(published `ccb2cbb`), 로컬경로 스크럽 `a7ad725`. 잔여였던 D1 `fp-refer-to-expert` recipe 재바인딩도 specializes 라운드로 해소(recipes `936fead`/`d4cfd82`). custody `verified/`. |
| `harness-repo-survey` | **CLOSED (예제 코퍼스만 user-blocked)** | 로드맵 W0~W4 전량 land(`c7ae890`·`925f7ba`·`5c35528`·`9ca09d5`·`f7214b6`) + archetype↔instance 링킹(`d4cfd82`). custody `verified/harness-repo-survey.md`. **잔여 = "예제 하네스 10~20 임포트"** → §B의 user-blocked 항목으로 이관. |
| `revfactory-harness-reflection` | **완료** | 유일 미반영이던 delta F(`cap-skill` + 첫 `ho:Contract` 인스턴스)가 land(`36084c3`), refresh(`57ed0ef`·`12ee623`). custody `verified/revfactory-delta-f-finalize.md`. |
| `retrieve-nondeterministic-pack` | **완료** | 가드 land(`d1ac476`, CI green). custody `verified/retrieve-determinism-finalize.md`. inbox에서 제거됨. |
| `execution-separation-invariant` | **완료** | land `fce72af`. custody `verified/execution-sep-and-webui-verify.md`. |
| `webui-save-drops-triples` | **완료** | land `19a8cc6`(B13/B14/B15). custody `verified/execution-sep-and-webui-verify.md`. |

## B. 기술 GAP — 미해결 (실측)
> 번호는 **안정 ID**(해소돼도 재사용하지 않는다). 해소분은 §B-done으로 옮겼다. 아래 3건만 남았다.

- **B4. execution-mode 범위 한정이 로컬 산문에만 존재 (dormant/latent).** `mode-sub-agents`/`mode-persistent-team`
  선택 근거의 scope 주석이 definition 산문 안에만 있다(`ontology/abox/core/spec/patterns.ttl:42`가
  `id:gr-execution-separation`을 cross-reference하긴 하나 구조 술어가 아니라 산문). 이 mode를 읽는 다른
  소비자에겐 안 보인다. **재발 트리거가 없어 dormant** — 같은 충돌이 다른 하네스에서 재현되면 그때
  (B)definition 정정 / (C)신규 mode 재검토 신호로 착수. **현재 미착수 근거**: grep상 구조 술어로의 승격
  없음, 다만 실 피해 사례 부재.
- **★harness 예제 코퍼스 10~20 (user-blocked).** `harness-repo-survey` 결정4의 마지막 잔여. 사용자④의
  "예제 10~20"을 harness-100처럼 **multi-agent 하네스를 recipe로 import**하는 것으로 해석하면, 채택 소스
  (wshobson/VoltAgent)는 **role 라이브러리**라 임포트할 하네스가 없다(소스타입 불일치). → 예제는 **별도
  하네스 코퍼스**(harness-100류)에서 와야 한다. **미착수 근거**: inbox 비어 있음, 어느 소스로 낼지 **사용자
  지정 대기**. 사용자가 코퍼스를 지정하면 importer(B21 축 포함)로 재개.
- **B12. 템플릿 본문의 `ho:` 언급 정책 (설계 규약 — 의도적 미해소).** techdoc 산출 CLAUDE.md 1곳에
  `ho:artifactTemplate`이 남는다(`artifactTemplate` 본문 파일에서 옴). 이 온톨로지가 주제인 하네스는
  지시문에 `ho:` 용어를 일부러 쓰므로 **설계상 의도적 미해소**다. A-batch가 ONTOLOGYSTYLE에 이 예외를
  1줄로 명문화(`6cca0d9`)해 **규약으로 수용** — 추가 저작 대상 아님(문서화로 close, 참고용 잔류).

## B-done. 해소된 기술 GAP (이력, land 해시)
> 아래는 재동기화 전 §B "미해결"로 남아 있었으나 **실측 결과 land 완료**로 확인된 항목이다.

- **B2** retrieve tie-break — **land `6cca0d9`**(A-batch). IRI 사전순 1차 위에 **maturity 2차키** 도입
  (`retrieve.py:83~` `maturity_values`/`maturity_rank`). 미선언은 last-sort하되 감점 없음.
- **B9** 폐기 노드 후계 관계 — **land `01e3eb9`**(applied+verified). tombstone 대신 **폐기 3노드 완전 삭제**로
  해소(산문 `DEPRECATED:` 잔류 0, `ho:supersededBy` 발명 없이 문제 소멸). custody `verified/supersededby-edge.md`.
- **B11** capacity-fit 검사기 — **land `6cca0d9`**. `validate.py:188` `check_capacity_fit`(Σ observedTokenVolume ≤
  cognitiveCapacity 하드 축). validate 출력에 `✓ capacityFit`.
- **B13** webui 저장 데이터 손실 — **land `19a8cc6`**. `_replace_block`이 ORDER 화이트리스트 밖 술어를 조용히
  삭제하던 것을 **merge-not-replace**로 교정(ORDER는 emission 순서만).
- **B14** `INSTANCE_LINK_PREDICATES` 누락 — **land `19a8cc6`**/`f735154`. 파이썬 리터럴 화이트리스트를
  `ontology_lib.link_predicates(g)` **TBox 파생**으로 대체(사본==원본).
- **B15** `server.abox_mtimes()` basename 키 — **land `19a8cc6`**. **ABox 루트 상대경로 키**로 교정
  (`server.py:111~`, DA-4 그룹 동명 파일 낙관적 잠금 뭉갬 방지).
- **B16** 레지스트리 표류 불변식 — **land `aaca77b`**. `validate.py`에 `check_registry_drift`(instantiated +
  ⊑HarnessComponent|SpecConcept인데 `INSTANCE_CLASSES` 미등록 = 하드 FAIL). validate 출력 `✓ registryDrift`.
- **B17** 원형↔인스턴스 specialize 술어 — **land 중앙 `88c0866`**(`ho:specializes` component-level 일반화 +
  `SpecializesTypingShape`) + **recipe 재바인딩 `936fead`/`d4cfd82`**(82 edges/35 recipe).
- **B18** retrieve IRI 해소 부재 — **land `6cca0d9`**. `retrieve.py:111~` materialize `IriTokenResolver` 미러
  (텍스트 술어 내 `id:`→라벨), 예산 무영향.
- **B20** `docs/ci/data-repo-validate.yml` 이중 stale — **land `8c801cb`**. `CENTRAL_REPO` → `cpark90/harness-ontology`,
  `HARNESS_ROOT_ONTOLOGY` lpranging 제거, **DEPRECATED / reference-only** 헤더 부착.
- **B21** importer가 TestScenario/FailurePolicy 미추출 — **land `b3e9e3d`**. `import_corpus.py`가 `## Test Scenarios`→
  `ho:TestScenario`(scenarioKind 1:1), `## Error Handling`→중앙 `core:fp-*` 재사용 후 `hasFailurePolicy`. 부재 섹션은
  fabricate 없이 unbound.
- **B22** Contract 축 abox 개체 0 — **land `36084c3`**(delta F). `cap-skill` + 첫 `ho:Contract` 2개
  (`ct-well-formed-skill-*`) + `verify_contract h-harness-factory` 2/2 PASS·tamper FAIL.
- **B23** refer-to-expert fp definition stale (69/70/72) — **land recipes `9e78c67`**. self-contradictory 부정절 재작성
  (specializes 도입 후 "no central archetype covers…" 잔류 제거). custody `verified/refer-to-expert-fp-stale-definition.md`.
- **B24** 7 role archetype 미커버 축(research/design/curation/synthesis) — **land**: `role-curator` `f3af7a6` +
  `role-research`·`role-design`(그룹 A) `4e687b3`, `role-synthesizer` 기존. 4축 전부 중앙 중립 archetype 확보
  (`roles.ttl:101/121/137/229`), recipe-local은 specializes 라운드로 재바인딩. **anti-drift 무연결 잔류 해소.**

### B-done (이전 라운드, 재확인)
- **B1** P0-b catalog/CI glob — 중앙 `5084827`/published `d9ebf0c`. · **B3** `INSTANCE_CLASSES` 파리티 — `f735154`.
- **B5** tokenEstimate 과부하 → `observedTokenVolume` 분리 — `8aecd6f`. · **B6** deprecated 랭킹 — `8aecd6f`.
- **B7** emit IRI 유출 — `f71a033`. · **B8** webui abox 0개 읽음 — `f735154`. · **B10** ONTOLOGYSTYLE §3 — `7baca84`.
- **B19** recipes CI `workflow_dispatch` — `d9ebf0c`.

## C. 품질 축 (목표 (2) — `validate.py`가 못 보는 축) — **세 축 처리 완료**

- **Q1. 통일성 감사 — 린터화 완료(미커밋).** `tools/lint_uniformity.py` 저작 + `.github/workflows/validate.yml:29`
  CI 배선. 각 규칙을 특정 ONTOLOGYSTYLE §에 앵커(§1c tokenEstimate 6클래스 / §2 접두사표 / §1d Hangul /
  shapes 파생 maturity·definition scope). 검증 리포트 `docs/verify/q1-uniformity-linter-verify.md`.
  **상태: 저작·CI배선 완료, inspection commit 대기**(§D-1).
- **Q2. 건전성 감사 — drift 0 (완료).** 정의 근사중복 9쌍은 정당한 대칭 템플릿(agent별 ObservationSpace
  병렬성), 라벨 근사중복은 별개 개념. **실제 drift 0, 정리 불필요**로 판정 완료.
- **Q3. 세분화 감사 — 충분(완료).** 마지막 blob `wf-compose-harness`를 7-step + data-flow로 분해 land
  (`bb3494e`/`82edb54`, 237→245 individuals). 이후 전수 재감사 `docs/verify/q3-granularity-audit.md` 판정
  = **DECOMPOSE 0건**("세분화는 이미 충분"). 남은 길이-상위 definition blob은 하네스/채널 선택근거 서술이라
  분해 대상 아님.

## D. 현재 건전성 기준선 (2026-07-28, 재동기화)
`validate.py` **PASS**(capabilities·assemblyOrder·**capacityFit**·**registryDrift** 포함) · **245 individuals**
(237→245: Q3 wf-compose-harness 분해 반영분) · `check_determinism.py` PASS · inbox `docs/feedback/` 비어 있음.

### D-1. 미커밋 (진행 중 — inspection commit 대기)
> git은 inspection 전담. 아래는 저작·검증까지 끝나고 **commit만 남은** 산출물(2026-07-28 실측 `git status`).
- **Q1 린터 배선**: `tools/lint_uniformity.py`(신규) + `.github/workflows/validate.yml`(수정).
- **역할/채널 문서**: `.claude/agents/inspection.md` · `docs/feedback/README.md`(수정).
- **검증·감사 리포트**: `docs/feedback/verified/health-reaudit-245.md` · `docs/verify/q1-uniformity-linter-verify.md` ·
  `docs/verify/q3-granularity-audit.md`(신규) + 각 역할 메모리.
- **inspection 유의**: 위 파일들은 dispatch 산출물이므로, 다른 dispatch가 쓰는 중이 아닌지 확인 후 커밋.

## E. 사이클 규약
- live 백로그의 단일 진실은 **feedback 채널**(inbox→`verified/`). 이 문서는 스냅샷/보조 — 인용 전 git·트리 실측.
- 실행 중 dispatch가 있으면 그 파일 범위를 건드리지 않는다(병렬 충돌 방지). 특히 inspection이 git을 다루므로
  진행 중 목록(§D-1)을 매 dispatch에 알린다.
- 저작은 반드시 developer dispatch 경유. orchestrator는 계획·통합확인만. **git은 inspection 전담.**
- 대규모/비가역 작업은 사용자 부재 중 착수하지 않는다 — 계획·감사·검증까지 진행하고 대기.

### E-1. inspection dispatch 허용 (사용자 지시, 2026-07-25)
> "goal이 완료될 때까지 inspection agent도 dispatch해서 진행해줘."

CLAUDE.md의 "inspection은 별도 세션 — orchestrator가 spawn하지 않는다" 규칙은 이 목표 완료까지 이 지시로
대체된다. orchestrator가 `subagent_type: inspection`, `model: opus`로 직접 dispatch한다. 역할 경계는 그대로
(inspection은 판정·검증·git만, `ontology/**`·tools 편집 안 함).
