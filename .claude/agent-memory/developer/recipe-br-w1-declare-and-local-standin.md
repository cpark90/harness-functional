# B-R recipe 3종 (hil-approval / eval-user-sim / coding-swe) — 재사용 지식

sim-hil B 웨이브 마지막 단계. staging/harness-recipes에 recipe 3종 저작(중앙 무수정, 364 불변).

## recipe-side W1 선언 패턴 (첫 사례 = hil-approval)
- recipe harness에 `ho:autonomyTier core:tier-*` + 로컬 `id:oe-*` envelope 선언 가능 —
  **attribute 스킴은 중앙 `core:c-envelope-*` 재사용**, 행(es-*)만 로컬. `ho:onEnvelopeExit`은
  중앙 `core:fp-envelope-exit/-severe`를 **가리키기만** 하면 됨(자기 hasFailurePolicy에 실을
  필요 없음 — 중앙 oe-coding 선례). OperatingEnvelopeShape: envelopeDefault+행≥1+onEnvelopeExit≥1
  +maturity. EnvelopeStatementShape: attribute(Concept) 1 + verdict + valueType + observable 필수.
- HarnessAutonomyShape 실체크 3종: bounded tier→hasEnvelope / fallbackOwner "harness"→cap-safe-halt
  provider / "receptive-user"→involvesUser true 채널. `tier-per-action-approval`은 fallback "user"라
  채널 조건 없음(envelope만).
- T1 approvalScope는 recipe에서 **재사용으로 행사**(gr-nodestruct/gr-dual-approval이 중앙에서
  보유) — 로컬 재선언 금지.
- environmentFidelity 판단 사례: 손저작 시뮬 환경=mock / 실저장소 checkout 컨테이너=replica /
  승인게이트 전제(실효과 없으면 게이트 불요)=production. 대조군 두 arm은 **같은 rung**(교란 방지).

## 대조군(control-arm) 2-harness recipe = coding-swe
- 한 recipe에 Harness 2개 합법(각각 HarnessShape 최소요건 충족 필요). `pat-minimal-baseline`의
  **첫 appliesPattern 주체는 진짜 control arm인 harness만**(중앙은 의도적 tag-only).
- 통제 변인 명시: same model(mc-opus 양쪽)/same wf-react/same dom·task/**같은 scn 픽스처를
  양쪽에 bind**(hasTestScenario 중복 bind 합법) — "scaffolding만 변인" 주석으로 고정.
- baseline은 cap-codeexec만 require(편집도 shell 경유 — 도구 없는 cap-fileedit 주장은 거짓 페어링).

## 이월(deferred) 어휘의 recipe-local 스탠드인 = eval-user-sim
- 중앙 어휘가 이월(T6 oracleKind 등)이면 **로컬 Guardrail/Concept으로 표현**하고 TTL 배너 +
  README에 "중앙 승격 금지·T6 land 시 rebind(재저작 아님)" 명시. 이월된 **계획된 중앙 부품**
  (fp-invalid-action-resolicit 등)은 로컬 중복 생성도 금지(충돌 예약) — out-of-model 사유 주석.
- provided-only cap의 requirer 구도: cap-environment-interaction은 recipe가 requiresCapability로
  요구(중앙 주석의 의도 이행). role의 중앙 roleTool/roleGuardrail은 recipe harness에도
  usesTool/hasGuardrail로 전부 bind(role-scoping 규약).

## 기계 절차
- tokenEstimate 측정식(클래스별): SP/GR=promptText//4, Tool/WF/OE=definition//4,
  TestScenario=(definition+prompt+expected합)//4, EnvelopeStatement=(prefLabel+threshold+observable)//4.
  Harness/Domain/Task/Concept/Capability는 미부여. ★sed로 고칠 때 같은 값이 여러 노드에 있으면
  전부 바뀜 — **줄번호 지정 sed**로.
- catalog·CI: `tools/gen_recipe_catalog.py --repo staging/harness-recipes` 한 방(+`--check` 멱등,
  `--print-matrix`) — validate.yml은 생성기 라이브 호출이라 **워크플로 파일 편집 불요**.
- 게이트 세트(각 recipe): union validate PASS(+개체수=364+로컬수 검산) → lint_uniformity(7축 0)
  → 중앙 validate 364 불변 → PYTHONHASHSEED=0 materialize 2run diff -r. 로컬 프로즈에는
  `id:`/`core:` 토큰 넣지 말 것(emit 시 미해소 잔재 방지 — 중앙 텍스트와 달리 recipe 로컬은
  plain prose가 안전).
- staging의 `central` 심링크는 세션 전부터 상존(gitignored) — 있으면 재사용, 만들었으면 제거.
