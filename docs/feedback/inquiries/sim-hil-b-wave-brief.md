---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/verified/sim-hil-coding-harvest.md   # 사용자 결정 "(B) → (A)" 의 B 1차 wave
related: [docs/feedback/inquiries/sim-hil-coding-harness-research.md, docs/feedback/inquiries/av-w1-envelope-brief.md]
---
# sim-hil B wave dispatch 브리프 (초안) — TBox 4 + 1티어 상위 부품 + recipe 3종

> 작성: inspection (사용자 지시, 2026-08-28). **정식 채택·dispatch는 orchestrator 소관.**
> 근거: harvest 인벤토리(`verified/sim-hil-coding-harvest.md`) + dossier
> (`inquiries/sim-hil-coding-harness-research.md` — 출처·라이선스·§7 수확 게이트·§8 dedup 표).
> B 검증 후 잔여 1티어(A 확장)는 같은 순서로 잇는다 (A 착수 전 av-odd 술어 경계 명문화 선행).

## 1. 목표 (한 문장)
수렴도 최상 부품만으로 시뮬레이션·HIL·코딩 수확의 **최소 완결 슬라이스**를 land한다 — TBox
4술어(어휘 범주가 없어 ABox가 막히는 것만) + 중앙 부품 26개 + 대표 recipe 3종(부품군당 1개).

## 2. dispatch 분할 (3단 순차 — 앞 단 게이트 통과 후 다음)
1. **B-T (TBox)**: T1–T4 + shapes + §3 문서 동반 — developer 1 dispatch.
2. **B-K (ABox)**: 부품 26개 + 기존 개체 결합 edge — developer 1~2 dispatch (wave-H/S+C 분할 가).
3. **B-R (recipe)**: 3종 — recipe별 분리 brief(orchestrator), land는 inspection
   (staging→published lane).

## 3. B-T — TBox 4술어 (harvest 1층 T1–T4 그대로, 경계 규칙 추가)
| # | 술어 | 대상 | 형태 |
|---|---|---|---|
| T1 | `ho:approvalScope` | Guardrail | 닫힌 값 7종 (tool-call/tool-call-arg-pattern/task-output/plan/turn/run-termination/session-mode) — **sh:in shape 동반** |
| T2 | `ho:attachesAt` | Guardrail | range=ho:Concept + **"guardrail attachment point" 개념 스킴** 신설(입력/대화/검색/실행 전·후/출력 + 세션·턴·툴콜 hook 코어, ~6–9 개념, `skos:broader`→`id:scheme`) |
| T3 | `ho:retrievalPolicy` | Memory | 자유문 1값 (가중·감쇠 서술) — memoryWriteTiming과 같은 결 |
| T4 | `ho:environmentFidelity` | EnvironmentSpace(1순위; Harness 선언은 보류) | 닫힌 값 5종 (mock/cassette/replica/digital-twin/production) — **sh:in shape 동반** |

**[필수] av-odd W1과의 경계 규칙** (사용자 지침 "A 확장 전 경계 명문화"의 선제 이행 — B·W1이
병행 dispatch될 수 있어 지금 필요):
- **T1 `approvalScope` ≠ W1 `ho:approvalUnit`**(AutonomyTier 슬롯): scope는 **guardrail이
  게이트를 거는 대상의 입도**, unit은 **tier가 정하는 승인 정책 단위**. 두 정의문에 상호 구분을
  1줄씩 명시하고 서로의 값 어휘를 재사용하지 않는다.
- **T4 `environmentFidelity` ≠ W1 envelope 속성**: fidelity는 **실행 환경의 충실도 사다리**
  (staged rollout 전이축), envelope는 **감당 범위 선언**. envelope 속성 스킴에 fidelity 축을
  중복 신설하지 않는다(필요 시 EnvelopeStatement가 이 술어 값을 참조).
- registry: **신규 클래스 0** → INSTANCE_CLASSES·PREFIX_MAP·§2 표 무변경. **§3에 신규 술어
  4종 위치 동반**(doc-lag 예방, 같은 커밋).

## 4. B-K — 중앙 부품 26개 (확정 목록 — 재량 아님; 라벨은 제안치)
**wave-H (13)**: gr-dual-approval · gr-auto-reply-budget · gr-plan-evidence ·
gr-rejection-feedback · fp-unanswered-approval · fp-approval-gate-decay · wfs-interrupt-resume ·
chan-approval · chan-elicitation · scn-oversight-efficacy(h-multiagent 결합) ·
c-human-in-loop · c-human-on-loop · c-rubber-stamping
**wave-S (7)**: role-user-simulator · role-adjudicator · gr-oracle-leak ·
gr-simulator-calibration · tool-env-interface · wfs-action-adjudication · c-simulation-standin
**wave-C (6)**: gr-aci-observation · tool-lint-gated-edit · role-reasoner · role-applier ·
wfs-post-edit-verify · pat-minimal-baseline

- **의도적 B-제외 (A로 이월, 사유 명시)**: `gr-safe-halt` — av-odd W1이 safe-halt **상태**의
  도달 조건·비자동재개를 정의하므로(W1 브리프 §2-7), 병행 저작하면 같은 의미 2곳 정의 =
  드리프트. W1 land 후 그 정의를 참조·재사용하는 형태로 A 확장에서 저작한다. 나머지 1티어
  잔여(~24)도 전부 A 이월(2티어 아님 — coverage-audit에서 GAP 오판 금지).
- **결합(anti-orphan)**: 신규 gr/fp/wfs/scn은 `h-multiagent` 또는 `h-coding`에 결합, tool은
  사용 role/step에, role은 harness hasRole로, 개념은 `skos:broader`→기존 개념(c-autonomy 등).
  `mem-longterm`에 T3 `retrievalPolicy` 1값 부여(신설 Memory 없음).
- **저작 규약**: cap 260(chars//4)·정의는 자기 문장 재기술(무라이선스 소스 verbatim 금지 —
  dossier §7)·도메인 약어 라벨 금지·**dossier §8 dedup 표를 brief에 동봉해 "신설 금지 목록"으로
  강제**(예: DesignPattern enrich 7종은 B 범위 밖이지만 근사 신설 금지는 지금부터 적용).
- 예상 델타: 부품 26 + T2 스킴 개념 ~8 = **개체 +~34** (269 → ~303).

## 5. B-R — recipe 3종 (부품군 대표 1개씩; 대응 부품이 B-K에 전부 존재)
| recipe | 원천(라이선스) | bind (B-K 부품) |
|---|---|---|
| `hil-approval` | LangGraph/HumanLayer 골격 | wfs-interrupt-resume·chan-approval·fp-unanswered-approval·gr-dual-approval·T1 approvalScope |
| `eval-user-sim` | τ/τ²-bench (MIT) | role-user-simulator·gr-oracle-leak·gr-simulator-calibration·tool-env-interface·role-adjudicator |
| `coding-swe` | SWE-agent/mini-swe (MIT) | gr-aci-observation·tool-lint-gated-edit·pat-minimal-baseline·h-coding 부품 재사용 |

lane 규약(inspection 메모리 준수): 중앙 커밋 아님 — staging 작성→published clone push,
catalog+CI 매트릭스 동반 갱신, push 전 로컬 federate 게이트(central symlink), 각 recipe에
`dct:source`+`dct:license` 귀속. 나머지 recipe 3종(sim-society·coding-pair·sdd-chain)은 A 확장.

## 6. 게이트 (단별 vnv dispatch + inspection 재검증)
- **B-T**: validate·lint·determinism PASS + **negative control**(T1/T4 닫힌 값 밖 문자열 주입
  → FAIL; attachment 스킴 개념의 broader 누락 → orphan FAIL) + §3 문서 1:1 대조.
- **B-K**: 위 3게이트 + cap 260 위반 0 + duplicate-label 경고 0(§8 dedup 준수 증명) +
  `retrieve.py` 재검색 발견성(부품군별 대표 질의 3종에 신규 부품이 팩에 등장) +
  coverage audit(B 목록 26개 전수 매핑, 제외분은 "A 이월" 사유 확인) + **materialize 델타가
  "정확히 기대만큼"**(h-multiagent·h-coding 산출물만 변경, 나머지 harness byte-identical —
  vocab-growth 감사 레시피).
- **B-R**: recipe별 federate PASS + catalog/CI 매트릭스 1:1 + 귀속 필드 존재. land 순서는
  central 먼저(recipe-catalog-glob-land 메모리).
- **개체 수 방어선**: +40 이내(실제 ~+34 예상).

## 7. 범위 밖 (B에서 하지 말 것)
T5–T9(2티어 TBox — 특히 T6 TestScenario 확장은 A에서도 단계적) · 1티어 잔여 24 부품
(gr-safe-halt 포함, §4 사유) · DesignPattern enrich 7종 · recipe 잔여 3종 · av-odd W1 술어
경계의 **전면** 명문화 문서(§3의 2규칙은 선제 최소분 — 전면판은 A 착수 전 별도).
