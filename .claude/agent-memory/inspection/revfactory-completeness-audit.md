# revfactory/harness 반영 완결성 감사 (1회 전수 대조) — 함정과 그래프 지도

감사 대상: `docs/feedback/revfactory-harness/{delta-inventory,source-mapping,verification-and-doctrine}.md`.
보고: `docs/feedback/verified/revfactory-completeness-audit.md`. 결론: **1 GAP만(cap-skill/F, 의도적 later-wave)**, 나머지 완결.

## 반영분이 어디에 사는가 (da4-taxonomy-reorg 후 경로 — 표면 grep이 헷갈림)
reorg로 `abox/core/*.ttl` 평면 → 도메인 서브디렉토리로 이동. 방법론 delta 부품의 실제 위치:
- 패턴 6 + ExecutionMode 개체 3(`mode-*`) : `spec/patterns.ttl` (구 `pat-agent-teams/sub-agents/hybrid`는
  DEPRECATED→`mode-*`로 superseded — 같은 개념 2번 세지 말 것)
- `chan-task-board` : `organization/channels.ttl`
- guardrail 전부(복잡도5·bounded-iteration·integration-coherence·discriminating-eval·single-responsibility·
  generalize-not-overfit·absolute-paths·well-formed-skill·opus-required) : `behavioral/guardrails.ttl`
  (주의: `gr-discriminating-eval`·`gr-generalize-not-overfit`가 `process/workflows.ttl`에도 **참조**로 등장 →
  `grep -rl "id:$g "`는 참조 파일을 먼저 물 수 있다. **정의 확인은 `grep "id:$g a "`**로.)
- concept 4 : `vocab/concepts.ttl`
- workflow 2 + step 7 : `process/workflows.ttl`
- **TestScenario 2 + FailurePolicy 7 : `verification/verification.ttl`** (reorg가 workflows에서 분리 신설한 유닛)
- TBox 클래스/속성 전부 : `tbox/harness.ttl` (ExecutionMode `245`, TestScenario `170`, FailurePolicy `175`,
  sectionKind enum `701`, augmentsRole `538`, scenario/failure 필드 `791-821`, integration/agent/reinvocation/
  trigger/outOfScope `824-857`).

## 의도적 미반영 5류 (GAP 아님 — 오판 주의)
1. `ho:stepExecutionMode`·`ho:toolAccessScope` — delta의 **옵션** 항목, 미저작 결정(YAGNI/자연표현). TBox·abox 모두 부재가 정답.
2. `gr-bounded-retry` — delta E가 `gr-bounded-iteration`과 **통합** 명시. 별 노드 부재 + **dangling 참조 0**이면 완결.
   (`grep gr-bounded-retry` exit 1 = 정상)
3. delta-B 6속성(augmentsRole 등) **중앙 abox 사용 0** — "가용 어휘", 주 소비자는 인스턴스/importer 축(직교). 미사용≠GAP.
4. delta H `role-qa`/`cap-integration-verification` — delta가 **신설 금지 권고**(role-vnv+guardrail 대체). 부재가 정답.

## 유일 GAP과 그 탐지법
**`cap-skill` Capability + `capabilityContract` 구조 Contract(delta F)** 미반영. `gr-well-formed-skill`(저작측)은
land됐는데 강제측(capability+contract)이 빔. **탐지 신호**: 그래프 주석 `wholes/harnesses.ttl` "Still missing
(later wave): the cap-skill requirement" + concept 정의가 "the capability and guardrail"을 예고하는데 capability
절반이 공석. → **그래프 자신이 명시 기록한 의도적 지연**이므로 silent 아님. 완결 판정은 **HOLD**(refresh 금지).

## RESOLVED (2026-07-25, delta F land = commit 36084c3): GAP·Contract-0 둘 다 해소
유일 GAP(cap-skill/F)이 저작·land됨: `id:cap-skill` + **첫 중앙 `ho:Contract` 개체 2개**
(`ct-well-formed-skill-{description,heading}`, structural) + provider `ins-well-formed-skill`,
`h-harness-factory` dogfood 배선. 신규 클래스/술어 0, 226→230. → **아래 "abox Contract 0"
부수발견은 이제 STALE**(0→2). revfactory reflection 완결 → refresh 실행(inbox+audit 제거,
`verified/revfactory-delta-f-finalize.md`가 승계). land 재검증법(재사용): **Contract teeth는
파이프 없이 exit code**(materialize→`verify_contract --tree`=2/2 exit0; SKILL.md 삭제 tamper→0/2 exit1);
**중앙 abox 델타 blast-radius=federation +N 균일**(central symlink를 HEAD worktree로 임시 repoint→
federate로 baseline 얻고 복원; 16-fullstack 248→252·21-code-reviewer 246→250 = +4).

## (STALE — 위 RESOLVED 참조) 부수 발견 (revfactory 밖, source-mapping "EXISTING Contract" 주장에 영향)
**abox에 `ho:Contract` 개체가 0개**다(`git log -S capabilityContract -- ontology/abox` = 이력 0). 08ed4df
"ODR contract-VERIFY axis"는 TBox 클래스 `ho:Contract`(10회 언급) + `capabilityContract` 속성 + `tools/verify_contract.py`
**메커니즘만** 심고 인스턴스는 미저작. 즉 P6 "assertion 평가 = EXISTING Contract 강한 재사용"은 **메커니즘 수준에서만
성립**(개체 예시 없음). reorg 회귀 아님(원래 0). → Contract 축을 인스턴스로 예시할지는 orchestrator 결정거리.

## 감사 절차 메모
- 완결성 감사는 delta 문서의 각 ID를 `grep "id:X a "`(정의)로 전수 확인 + 참조 배선(`hasWorkflow`/`stepGuardedBy`/
  `hasGuardrail`)까지 확인. TBox 속성은 `grep -rn ho:prop ontology/tbox`, **abox 사용도** `grep -rl "ho:prop " abox`로
  별도 측정(정의≠사용).
- doctrine 대조: 운영 하네스(`h-multiagent`)의 `hasExecutionMode`가 repo 기본(central-dispatch=`mode-sub-agents`)과
  일치하는지 확인 = 저장≡운영 harness 일치 게이트.
