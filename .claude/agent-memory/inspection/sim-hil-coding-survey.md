# 시뮬레이션·HIL·코딩 하네스 조사 (부품 수확 지도)

원본: `docs/feedback/inquiries/sim-hil-coding-harness-research.md` (2026-08-28, 12-에이전트
워크플로 wf_c17d696a-234). 재사용 요지:

- **TBox GAP 12종 종합**(dossier §6, 우선순위순): G1 adjudicated environment(GM 판정자 —
  최다 수렴)·G2 env-fidelity tier·G3 approvalScope+autonomy 사다리·G4 escalation 연쇄·
  G5 TestScenario oracle/trajectory 확장·G6 PhaseArtifact+activationTrigger·G7 shadow mode·
  G8 guardrail attachmentPoint·G9 Tool risk/taint·G10 Channel lifecycle/part·G11 trust 라벨
  (보안 최고 레버리지)·G12 Memory retrievalPolicy.
- **dedup 함정(재발성)**: 외부 조사 에이전트는 기존 13 DesignPattern을 모른 채 "신규 패턴"을
  제안한다 — prompt-chaining≈pat-pipeline, routing≈pat-expert-pool, evaluator-optimizer≈
  pat-producer-reviewer, hierarchical≈pat-hierarchical-delegation, output_key≈pat-blackboard.
  **조사 brief에 기존 개체 목록을 싣거나, 종합 단계에서 §8 표로 dedup**할 것.
- **라이선스 게이트 실전 규칙 확장**: GitHub 메타데이터 NOASSERTION이어도 LICENSE 파일이
  Apache-2.0인 경우 다수(NeMo·12-factor 하이브리드); AutoGen은 LICENSE-CODE(MIT)가 코드
  라이선스(톱레벨은 CC-BY-4.0 문서용); deprecated repo는 **태그에서 수확**(HumanLayer v0.7.7);
  AgentSociety `commercial/` 서브트리 제외; AGPL(Fidus)은 패턴 참조만.
- **HIL 공통 골격**(7 프레임워크 수렴): scope별 approval-gate→correlation id 체크포인트→
  내구 채널 라우팅→이유 동반 거부의 컨텍스트 재주입. **무응답 처리(timeout)가 보편적 공백**
  = FailurePolicy 선점 지점. A2A input-required/auth-required가 프로토콜 표준 자리.
- **역할 신설 후보 vs role-tester**: user-simulator(기계가 유저)·wizard(인간이 에이전트)·
  adjudicator(GM)는 책임이 달라 tester enrich 아님 — 'simulation stand-in' 상위 개념 검토.
- **반영 인벤토리**(승인 lane): inbox `feedback/sim-hil-coding-harvest.md`(선택지 A전체/B축소/
  C선별) + `verified/sim-hil-coding-harvest.md`(TBox 9 + ABox 1티어 ~50 ID제안 + recipe 6 +
  wave 순서). 함정: 사용자 요청 "조사"가 **반영용 컨텐츠 확보**를 뜻할 수 있음 — dossier로
  끝내지 말고 3층(TBox/KG/recipe) 반영 인벤토리까지 만들어 승인 요청할 것.
