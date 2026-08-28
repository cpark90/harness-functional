---
title: sim-hil B-R (recipe 3종) 검증 — hil-approval / eval-user-sim / coding-swe
agent: vnv
model: fable (opus rate-limited)
date: 2026-08-28
verdict: PASS-with-notes (차단 0 / 비차단 5)
---

# sim-hil B-R recipe 3종 판정

대상: `staging/harness-recipes/recipes/{hil-approval,eval-user-sim,coding-swe}/`
(각 `.ttl`+`README.md`) + `catalog-v001.xml`. 기준: harvest 계획 §3층 표
(`docs/feedback/verified/sim-hil-coding-harvest.md`), B-K2 진입조건
(`docs/verify/sim-hil-bk2-verify.md` — 양면 oracle·pass^k recipe-local·중앙 신설 금지),
레인 규약(`staging/harness-recipes/README.md`), 출처 게이트(dossier
`docs/feedback/inquiries/sim-hil-coding-harness-research.md` §7).

**판정 = PASS-with-notes.** staging 저작만·중앙 무수정 주장 성립, 게이트 전부 독립
재현 PASS, 제약(recipe-local 유지) 준수, 차단 결함 0. **inspection land 가능.**

## 1. 중앙 무수정 (최우선 축) — 성립

판정 시점 상태 명시: 워킹트리 `ontology/` diff = 13파일 591+/79−
(B-T+B-K1+B-K2 기검증분 + **병행 세션 B1 facet 재부모화**: `concepts.ttl` 대부분 +
`tools/lint_uniformity.py`의 `check_concept_facet` 신설 — B-R 귀속 아님).

- **B-R이 중앙에 쓴 트리플 = 0 (기계 증명)**: `git diff HEAD -- ontology/` 전문을
  B-R 식별자 전수 패턴으로 스캔 —
  `grep -ciE "hil-approval|eval-user-sim|coding-swe|swe-baseline|two-sided|passk|oe-hil|es-hil|cap-gated-execution|approval-wrapped|reliability-aggregation|wf-eval-episode|scn-issue-regression|tau-bench|humanlayer|swe-agent"`
  → **0건**. `ontology/` 아래 신규(untracked) 파일 0.
- 중앙 단독 `/usr/bin/python3 tools/validate.py` = **PASS, 364 individuals**
  (= B-K2 최종 baseline과 일치; 판정 도중 B1이 개체수를 움직이지 않았음).
- B-R 산출물은 전부 `staging/` 아래이고 `/staging/`은 gitignore
  (`git check-ignore -v` 확인) — land는 published clone 경로(inspection 소관).

## 2. 게이트 재실행 — 전부 재현 PASS

레포 루트 `staging/harness-recipes/`에서, `./central` 심링크(기존 것 재사용 확인:
`-> /home/cpark/git/harness_ontology`), 실제 실행 명령:

```
HARNESS_CATALOG=catalog-v001.xml \
HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> \
/usr/bin/python3 central/tools/validate.py        # 그리고 lint_uniformity.py / materialize.py
```

| 축 | hil-approval | eval-user-sim | coding-swe |
|---|---|---|---|
| union validate | PASS, **375** (=364+11) | PASS, **374** (=364+10) | PASS, **369** (=364+5) |
| duplicate label | 0 | 0 | 0 |
| lint 7축 | 0/0/0/0/0/0/0 PASS | 동일 PASS | 동일 PASS |
| 로컬 노드 수 검산 | 11 (dom·task·cap·tool·sp·h·oe·es×4) | 10 (dom·task·c·wf·gr×2·sp·scn×2·h) | 5 (sp×2·scn·h×2) |

- lint가 **union을 실제 로드**했음을 트리플 수로 확인(9421 > 중앙 9178 —
  카탈로그 미매핑 시 중앙만 조용히 PASS하는 함정 배제).
- **catalog**: XML well-formed(ElementTree parse), 실측 **21 central + 41 recipe**
  엔트리(줄 단위 수기 대조), `gen_recipe_catalog.py --repo . --check` → exit 0
  "in sync (41 recipes)" (멱등), `--print-matrix`에 **3 IRI 전부 노출**. CI
  (`.github/workflows/validate.yml`)는 매트릭스를 이 생성기에서 파생 — 수기 목록 없음.
- **materialize**: h-hil-approval **2회 연속 빌드 `diff -r` byte-identical**.
  4개 하네스(h-hil-approval/h-eval-user-sim/h-coding-swe/h-swe-baseline) 산출
  CLAUDE.md에서 dangling IRI 토큰(`id:*`/`harness-ontology.dev/id/...`) **0**.
  산출 문서 정합 직독: hil=persona·4-step workflow·2채널·fp 3행 표·oversight fixture,
  eus=simulator Role 절·양면 oracle/pass^k 규칙이 Operating rules에 emit,
  swe-baseline=**Pattern: Minimal baseline 렌더**.

## 3. 제약 준수(핵심): 양면 oracle·pass^k recipe-local — 성립

- `id:gr-two-sided-oracle`·`id:gr-passk-reliability`는 **recipe 파일 안**
  (`eval-user-sim.ttl:112,117), NS = `…/id/eval-user-sim/` — 중앙 `…/id/core/` 침범 없음.
- 중앙 전수 grep `two-sided|passk|pass^k` → **0건**.
- **승격 금지 표기 양쪽 실재**: TTL 헤더 배너(:35–43 "Do not promote them to
  ontology/abox/core/** and do not mint central near-synonyms") + README
  §"Recipe-local by design" 동일 문구. T6 land 시 "rebinding, not re-authoring"
  업그레이드 경로도 명시.

## 4. W1 축 선언 — 유효·사실, 단 문서 층위 N1은 미해소 (note N1)

- **shape 통과의 비-vacuous 재현** (in-memory negative control, hil union;
  스크립트는 scratchpad, 디스크 무오염):

| 케이스 | 기대 | 실측 |
|---|---|---|
| CONTROL (무변형 union) | conforms | ✓ True |
| `hasEnvelope` 제거 | HarnessAutonomyShape(envelope-bound tier) FAIL | ✓ 해당 메시지 발화 |
| `es-hil-reversibility`의 `envelopeObservable` 제거 | EnvelopeStatementShape FAIL | ✓ 해당 메시지 발화 |
| `environmentFidelity "staging"` 주입 | HarnessShape sh:in FAIL | ✓ 닫힌값 메시지 발화 |

- statement 4행 전부 `envelopeObservable` 보유(직독). `tier-per-action-approval`은
  `envelopeBinding "bounded"`(→constraint 2 발화 대상, envelope 실재로 충족),
  `fallbackOwner "user"`(→safe-halt/receptive-user constraint 비대상 — 올바름).
- **선언의 사실성**: per-action tier ↔ 중앙 gate guardrail의 `approvalScope "tool-call"`
  (gr-nodestruct `guardrails.ttl:18`, gr-dual-approval `:265`) ↔ 승인래핑 tool 정의가
  일관. restrictive 기본 + include-only 4행 서술도 저작 형상과 부합.
- **그러나 N1(선언 하네스 문서에 envelope 규율 미출현)은 문서 층위에서 미해소**:
  `materialize.py`에 `hasEnvelope|autonomyTier|environmentFidelity|EnvelopeStatement`
  참조 **0줄**(grep) → 산출 CLAUDE.md에 envelope/tier/fidelity가 한 줄도 렌더되지
  않음(산출물 grep 0 실측). exit fp 2행은 envelope의 `onEnvelopeExit`에만 걸려
  Error-handling 표(harness `hasFailurePolicy` 소스)에도 미출현. `gr-envelope-check`
  미바인딩. ⇒ harvest 문서의 "N1을 실물로 해소하는 경로"는 **그래프 선언 층위만
  참**이고, W1 note가 지적한 materialized-문서 공백은 **렌더 wave(중앙 tools) 몫**으로
  남는다 — B-R 쓰기 범위 밖이므로 비차단.

## 5. 재량 판단 4건 — 독립 판정

1. **hil `environmentFidelity "production"` = 수용 (note N2)**. 근거 추론("실효과
   없는 환경엔 인간 게이트 불요")은 **과일반화** — 반례: 승인 게이트 리허설·approver
   훈련·gate-드릴은 replica/digital-twin에서도 인간 게이트를 돌린다. 다만 선언
   자체는 그 추론이 아니라 **블루프린트 전제**(durable 승인·무응답 escalation·
   dismissal-vs-decline 등 전 부품이 실효과를 전제) 위에 서 있고, T4는 선언 optional
   ·"staged deployment demotes this one value" 경로 명시라 사실 선언으로 성립.
2. **coding-swe 2-harness = 타당, 유일한 비날조 경로**. 대안 전수: 단일 하네스에
   `appliesPattern` 단언=날조(control arm 아님) / 중앙에 대조군 신설=중앙 무수정·
   중립성 위반(중앙이 의도적으로 tag-only로 남긴 사실을 B-K2가 기록) / 별도 recipe에
   대조군=closure 분리로 통제변인(같은 model·wf·fixture) 공동 단언 불가.
   `h-swe-baseline`은 저작상 실제 control arm이고 통제 불변량이 그래프 사실로 성립:
   양 arm 동일 `mc-opus`·`wf-react`·`dom-coding/task-bugfix`·공유
   `scn-issue-regression`·동일 "replica". cap 짝도 정직(baseline은 cap-codeexec만 —
   편집 tool 없이 fileedit 주장 안 함; richer는 cap-fileedit←tool-lint-gated-edit,
   중앙 `tools.ttl:40` providesCapability 확인).
3. **hil 확대 bind 전수 사실 대조 = 통과**. gr-rejection-feedback/fp-reject-retry ↔
   persona "a rejection's stated reason becomes the context of your next attempt";
   gr-resume-idempotency ↔ "checkpoint before every wait … resumes exactly" + wf
   interrupt-resume step; chan-elicitation ↔ "Close the ambiguities … first" + wf
   step 1; fp-dismissal-vs-decline ↔ 정의문 first-class outcomes; scn-oversight-
   efficacy = 게이트 중심 하네스에 정합(게이트가 막으므로 production 전제와도 양립);
   mode-standing-service ↔ durable·days-long 대기 근거 서술; gr-lang = 운영 정책
   일치; mc-opus = 단독 lane 고결과 작업 관례 일치. 날조 발견 0.
4. **eval-user-sim `mc-sonnet` = 수용**. 사유(판정은 결정론적 oracle이 내림 + scenario당
   k-trial 볼륨 → cost-bounded lane) 성립; 반론(시뮬레이터의 in-character 내구엔 모델
   강도가 필요)은 gr-oracle-leak + scn-oracle-leak-probe(adversarial fixture)가
   정확히 그 축을 잡고 있어 완화됨. 대조 사유("coding recipes, where the model IS
   the worker")도 일관.

## 6. T4 값 3종 사실성 — 전부 정합

닫힌값 집합(mock/cassette/replica/digital-twin/production, `shapes:65`) 내 값이며:
mock(eus) = 수제 시뮬 환경·룰 기반 인터페이스 = τ-bench 구성상 사실("hand-stubbed…no
real system" 정의와 일치); replica(swe 양 arm) = disposable container의 real checkout
= "live non-production copy" 정의와 일치(양 arm 동일 rung = 교란 변인 차단 서술까지
정합); production(hil) = §5-1 판정.

## 7. 귀속·드리프트(§7 게이트) — 통과

- dossier §7 대조: LangGraph **MIT** ✓ / HumanLayer **Apache-2.0, v0.7.7 태그에서
  수확·main deprecated** ✓ (TTL 헤더 + README 양쪽에 태그 URL과 사유 명시,
  `dct:source`가 `tree/v0.7.7` 태그 URL) / τ-bench·τ²-bench **MIT** ✓ /
  SWE-agent·mini-swe-agent **MIT** ✓.
- **emit 값(prefLabel/definition/promptText/scenario*/envelope*) 내 제품명 0**
  (3파일 전수 grep — 제품명은 주석과 `dct:source`에만). verbatim 흔적 없음(정의 전부
  자기 문장 재기술, 라벨 중립: "software-repair harness", "user-simulator evaluation
  rig" 등).

## 8. 레인 컨벤션 — 일치

- `owl:imports <…/ontology>`(루트) 방식 = lpranging/techdoc/21/46 등 fleet 전체와
  동일. (repo README §"What a recipe unit contains"의 "schema+각 unit 개별 import"
  서술은 fleet 전체와 어긋난 **pre-existing doc-lag** — B-R 결함 아님, note N4.)
- README 형식(Source-credit blockquote → Which parts were used → Reproduce) 기존과
  동일. prefLabel 스타일(문두 대문자 sentence-case)·정의문 Distinguished-from 관례 일치.
- **중앙 부품 복제·재정의 0**: 3파일에서 `core:` 주어 선언 grep 0 — 전부 IRI 참조.
  로컬 노드는 전부 자기 recipe NS.

## 9. Coverage — §3층 표 대조 닫힘

| §3 bind 항목 | 반영 |
|---|---|
| hil: wfs-interrupt-resume | ✓ `wf-approval-gated` hasStep 경유(산출 문서 step 2 렌더 확인) |
| hil: chan-approval / fp-unanswered-approval / gr-dual-approval | ✓ 직접 bind |
| hil: approvalScope | ✓ 재사용으로 행사(bound 게이트 gr들이 중앙에서 보유 — TTL T1 usage note) |
| eus: role-user-simulator(tool-constrained) | ✓ hasRole + 중앙 roleTool=tool-env-interface(`roles.ttl:292`) + roleGuardrail 3종 하네스에도 bind |
| eus: gr-oracle-leak / tool-env-interface | ✓ |
| eus: 양면 oracle / pass^k | ✓ recipe-local 2룰(§3 판정) |
| swe: gr-aci-observation / tool-lint-gated-edit | ✓ |
| swe: pat-minimal-baseline 대조 | ✓ 첫 `appliesPattern` 주체 = h-swe-baseline |
| swe: h-coding 부품 재사용 | ✓ derivedFrom h-coding + dom/task/wf/tool/mc/fp 재사용 |

범위 밖 3종(sim-society/coding-pair/sdd-chain)은 harvest 문서의 B/A 분할 기록(B =
recipe 3종, 잔여는 A 확장)에 명시 — coverage 누락 아님. 발견성 재검색(retrieve,
recipe별 closure): 자기 질의에서 **각 recipe 하네스가 TOP candidate**
(12.15 / 8.1 / 9.9·9.0). pack `gaps`(Synthesis/File editing)는 co-scope 중앙 하네스
소유의 pack 전역 값 — recipe 결함 아님(note N5).

## Notes (비차단 5)

- **N1**: envelope/tier/fidelity **미렌더** — `materialize.py` 참조 0줄. W1 note N1은
  그래프 층위만 해소, 문서 층위는 **렌더 wave 필요**(중앙 tools 소관). 렌더 wave 시
  `gr-envelope-check` 바인딩 여부·`onEnvelopeExit` 행의 Error-handling 표 합류를 함께
  결정할 것.
- **N2**: hil "production" 선언의 **사유 문구 과일반화**(게이트 드릴 반례) — 선언
  자체는 수용(§5-1).
- **N3**: `h-swe-baseline`에 FailurePolicy 무바인딩 + accepted-omission 주석 없음
  (ExecutionMode 홀드아웃은 헤더에 사유 명시됨과 비대칭). minimal-arm 논리로 수용
  가능하나 land 전 주석 한 줄 보강 권고.
- **N4**: recipe repo README의 per-unit imports 서술 = pre-existing doc-lag.
- **N5**: retrieve pack gaps는 pack 전역 — candidate-specific 오독 금지(기록용).

## 재현 요약 (실행한 명령)

중앙: `/usr/bin/python3 tools/validate.py`(364, PASS). recipe별(×3):
`HARNESS_CATALOG=catalog-v001.xml HARNESS_ROOT_ONTOLOGY=https://harness-ontology.dev/recipes/<name> /usr/bin/python3 central/tools/{validate,lint_uniformity,materialize,retrieve}.py`.
catalog: `central/tools/gen_recipe_catalog.py --repo . --check` / `--print-matrix`.
negative control: scratchpad `negctl.py`(pyshacl, in-memory 4케이스). 중앙 무수정:
`git diff HEAD -- ontology/` + B-R 식별자 전수 grep 0.
