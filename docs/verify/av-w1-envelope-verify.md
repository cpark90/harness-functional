---
status: done
kind: vnv-verdict
target: 승인 피드백 적용 W1 — 운용 범위 envelope + 자율성 등급 + 범위이탈 정책
spec: docs/feedback/inquiries/av-w1-envelope-brief.md (고정 결정 7건 + §4a~§4f)
model: fable (opus rate-limited)
date: 2026-08-28
verdict: PASS-with-notes
blocking: 0
non-blocking: 5
---

# W1 envelope 이식 검증 판정 — PASS-with-notes

검증 대상: working tree (HEAD ec0ae85 대비 uncommitted). 도구는 전부
`/usr/bin/python3` (rdflib/pyshacl/owlrl 확인). 스크래치 주입은 전부 in-memory
또는 scratchpad — `ontology/` 디스크 무오염 (git status로 확인, 본 wave 파일만 변경).

## 1. 게이트 3종 — 전부 PASS (재실행)

| 명령 | 결과 |
|---|---|
| `/usr/bin/python3 tools/validate.py` | **PASS** — SHACL conforms · all **323** individuals reachable · capability ✓ · assemblyOrder ✓ · capacityFit ✓ · registryDrift ✓ ("all 31 instantiated in-scope classes registered") |
| `/usr/bin/python3 tools/lint_uniformity.py` | **PASS** — 6축 전부 0 violation (tokenEstimate/prefix/language/maturity/definition/text-cap) |
| `/usr/bin/python3 tools/check_determinism.py` | **PASS** — 3질의 × md/json × 4런 byte-identical |

개체 수: HEAD 269 (baseline `git archive HEAD` materialize lock의 individualCount
269로 교차확인) → 323, **+54**. diff에서 typed 신규 개체 재집계 = 정확히 54
(Concept 26 / AutonomyTier 6 / EnvelopeStatement 12 / OperatingEnvelope 2 /
Guardrail 3 / FailurePolicy 2 / TestScenario 2 / Capability 1), 삭제 0.

## 2. negative control 9건 + anti-vacuous twin 4건 — 13/13 기대대로

스크립트: scratchpad `negctl.py` — reasoned union을 복사해 케이스별 주입/제거 후
pyshacl (`inference="none", advanced=True`, validate.py와 동일 설정). FAIL 케이스는
**기대 메시지 문자열 일치까지** 확인 (단순 non-conform 아님).

| # | 케이스 | 기대 | 결과 |
|---|---|---|---|
| N1 | statement에서 `envelopeObservable`만 제거 (나머지 필드 완비) | FAIL (EnvelopeStatementShape) | ✓ 해당 메시지 발화 |
| N1t | 같은 노드 + observable | CONFORM | ✓ (vacuous-pass 배제) |
| N2 | h-peer-mesh + `tier-bounded-autonomy`, envelope 없음 | FAIL (SPARQL-1) | ✓ |
| N3 | h-peer-mesh + `tier-advisory` (binding "none") | CONFORM (경계 면제) | ✓ |
| N4 | h-coding tier→`tier-monitored-autonomy` (fallback=harness, safe-halt 미제공 — onEnvelopeExit는 refinement edge라 hasComponent 아님) | FAIL (SPARQL-2) | ✓ |
| N5 | h-workspace-synthesis + `tier-unbounded` (hasFailurePolicy⊑hasComponent로 fp-envelope-exit가 cap-safe-halt 제공) | CONFORM — unbounded 면제 + provider 충족 동시 실증 | ✓ |
| N5t | h-peer-mesh + `tier-unbounded` (provider 없음) | FAIL (SPARQL-2) | ✓ (N5 anti-vacuous) |
| N6 | h-coding tier→`tier-per-plan-approval` (hasChannel 0) | FAIL (SPARQL-3) | ✓ |
| N6t | 같은 상태 + `hasChannel chan-agent-user` (involvesUser true) | CONFORM | ✓ |
| N7 | tier 슬롯 `approvalUnit "whenever-convenient"` | FAIL (sh:in) | ✓ |
| N8 | h-coding에 tier 2개 | FAIL (maxCount 1) | ✓ |
| N9 | EnvelopeRule `ruleEffect "maybe"` | FAIL (sh:in) | ✓ |
| N9t | 같은 rule `"exclude"` | CONFORM | ✓ |

부수 실증: post-reasoning 주입된 statement/rule은 `ComponentConnectivityShape`가
"Orphaned component"로 잡음 → envelope row도 anti-orphan 커버리지 안에 있음이
동시에 증명됨 (twin에는 chain이 추론했을 rollup triple을 수동 부여해 통과).

## 3. 브리프 편차 3건 — 전부 정당 (독립 재현)

1. **propertyChain 2-link ( hasComponent hasEnvelopeStatement ) — 정당, 브리프 명세가 결함.**
   reasoned graph SPARQL: 14개 envelope 노드(oe 2 + es 12) 전부 자기 하네스로만
   rollup (`h-coding`/`h-multiagent` hasComponent = 12/12 statement + 2/2 envelope,
   non-Harness subject 0, oe가 Harness로 mistype 0). **브리프의 3-link
   `(hasComponent hasEnvelope hasEnvelopeStatement)`를 실제로 치환 실험**: 2-link
   chain 2개 제거 후 3-link 추가 → owlrl 후 발화 **0 triple**. 이유: 3-link의
   중간 패턴 `X hasEnvelope e`의 X는 Harness 자신이라 `h hasComponent X`가 성립할
   수 없음 (hasSection twin과 동형). 2-link가 유일하게 옳은 저작.
2. **INSTANCE_CLASSES 실위치 = `tools/ontology_lib.py`** (`:82` 블록) — validate.py에는
   해당 상수가 없음 (validate가 import하는 공유 lib). 브리프의 경로 표기 오류를
   실위치에 반영한 것 — 정당. (파일경계 note N5 참조.)
3. **+54 vs 게이트 "~40" — 브리프 내부 모순, +54 정당.** §4d 고정 명세의 산술
   최솟값: concepts 25 + tier 6 + gr 3 + fp 2 + oe 2 + es 12(6×2 min) + scn 2
   (게이트 3) + cap-safe-halt 1(§4b-3의 함의) = **53 > 40**. 고정 결정(§2·§4)이
   휴리스틱 게이트보다 우선. "cap 260"도 stale — HEAD baseline이 이미 269.

## 4. 재량 판단 6건 — 타당 (1건은 note 동반)

- **tier를 `spec/patterns.ttl` co-locate**: ExecutionMode와 같은 파일·같은 층
  (SpecConcept leaf) — 선례 일치, 신규 federation unit 비용 회피 사유도 파일
  주석에 명시. 타당.
- **§4e 도메인 축소안(권고안) 채택**: `triggerPhrase`/`outOfScope` 둘 다
  `rdfs:domain ho:Instruction` + 정의문에 "NOT for harness range declaration"
  1줄 — 브리프 요구 그대로. ABox 사용 0건 재확인(grep 0)이라 축소 무해.
- **5축 접두사 `c-` 유지**: 브리프 §7 권고안 그대로.
- **rule chain 추가 (F2 옵션 a)**: statement와 대칭 2-link. EnvelopeRule은
  인스턴스 0이라 실데이터 발화가 없으므로 **pre-reasoning 주입으로 실증**:
  `oe-coding hasEnvelopeRule er-chaintest` → owlrl 후
  `h-coding hasComponent er-chaintest` True, HarnessComponent typed, mistype 0.
- **carrier 분리** (gr 3·fp 2→h-workspace-synthesis, scn 2→h-harness-factory):
  byte-identity 게이트(§5-4)가 강제하는 선택이고 library-carrier 선례와 일치
  (fp reachability는 carrier의 hasFailurePolicy가 공급, onEnvelopeExit는
  refinement edge — 주석에 사유 명시됨). 단 **note N1**: envelope을 선언한
  하네스의 materialized 문서에는 envelope 규율(gr-envelope-check 등)이 한 줄도
  실리지 않는 과도기 상태 — W2+ 렌더 wave에서 재검토 필수.
- **`cap-safe-halt` 신설**: SPARQL-2가 조회할 capability IRI가 필요하고 기존
  9종 cap에 해당 축 없음. FailurePolicy가 provider인 것은 기존 선례
  (cap-traceability←gr-traceability)와 동형. 정의에 capability≠authorization
  절 포함. 타당.

## 5. materialize 무회귀 — 산문 byte-identical

`git archive HEAD` baseline vs working tree, `PYTHONHASHSEED=0`, h-coding·
h-multiagent 각각 `materialize.py <id> --out` 후 `diff -r`:

- **CLAUDE.md: 양쪽 모두 diff 0 (byte-identical)** — `materialize.py`에
  envelope/autonomyTier 참조 0 (grep 0, 렌더 분기 자체가 없음). 산출물 내
  dangling `id:` 토큰 0.
- 차이는 정확히 2파일: `harness.lock.json` individualCount 269→323 (전그래프
  메타데이터 — +54의 필연), `MANIFEST.json` 컴포넌트 목록 +7 entry
  (oe 1 + es 6, `hasEnvelope ⊑ hasComponent`의 구조적 필연 — MANIFEST는
  hasComponent closure 열거) + aggregate tokenEstimate. **산술 검산**:
  h-coding +397 = 110(oe)+61+44+42+50+48+42(es 6) 정확 일치; h-multiagent
  +482 = 130+75+56+48+63+59+51 정확 일치. developer 주장 검증됨.

## 6. 드리프트 점검 (신규 26 concept + 6 tier 전수)

- diff 추가 라인에서 ODD/DDT/MRC·"level N"·"레벨" **0건**. tier 라벨은 전부
  책임 배분 이름(advisory/per-action-approval/…), 서열 라벨 없음. 정의 전부
  자기 문장 (verbatim 표준 문구 없음).
- capability≠authorization(§2-6): OperatingEnvelope·AutonomyTier·cap-safe-halt
  정의 + ONTOLOGYSTYLE §3 블록에 4중 명시 ✓.
- safe-halt=상태·자동재개불가(§2-7): cap-safe-halt "a state, not a verb …
  NO automatic resumption"; fp 두 row의 recoveryStrategy에 "stay halted until
  explicitly reactivated"/"resumption only by explicit reactivation" ✓.
- near-synonym 방어: c-envelope-domain 정의가 dom-*와의 refine-not-duplicate
  판별절, fp-envelope-exit↔fp-refer-to-expert·↔severe, gr-envelope-check↔
  gr-envelope-unknown, scn-envelope-exit↔scn-trigger-near-miss 전부 Distinct
  절 보유. 보호속성 축 제외 사유 파일 주석 1줄 ✓ (coverage 규약).
- 스킴 연결: `c-operating-envelope skos:topConceptOf id:scheme` + 하위 25개
  broader 사슬 (브리프의 "전부 broader로 scheme 연결"을 계층형으로 충족).
- tier 슬롯 조합 6종 = 브리프 §4d 권고 조합과 1:1 일치 (검수표 생략, diff 참조).

## 7. 발견성 (retrieve, PYTHONHASHSEED=0)

| 질의 | 상위 seed |
|---|---|
| "declared operating envelope range judgment" | Operating envelope **9.9** 1위; pack에 **oe-coding·oe-multiagent 둘 다** 탑재 (게이트 3 요건) |
| "autonomy tier responsibility allocation approval" | Bounded autonomy tier 8.55 1위, tier 6종 전부 pack 진입 |
| "request outside declared scope safe halt handover fallback" | fp-envelope-exit 7.2 1위, Safe halt 7.2, severe·transient-tolerance 동반 |
| "coding agent that fixes bugs autonomously" | 후보 h-coding, pack에 oe-coding + es 6행 전부 동반 (선언이 팩에 실림) |

budget 889~899/900 — 절단으로 envelope 노드가 밀리는 질의 없음. gaps 0.

## 8. 동시편집 리스크 (registry 3중 전수 대조)

- ONTOLOGYSTYLE §2 표 36행: **중복 클래스 행 0**, 신규 4행(tier-/oe-/es-/er-) 존재.
- `PREFIX_MAP` 소스 텍스트: 중복 키 0, 신규 4항 존재.
- `INSTANCE_CLASSES`: 중복 0, 신규 4항 존재.
- 3-way 기계 대조: §2 표 ↔ PREFIX_MAP **완전 일치(양방향 차집합 0)** —
  이전 wave의 Anchor 미매핑 갭도 현재는 없음. 유실·중복 행 잔존 없음.

## 9. Notes (비차단 5)

- **N1 (carrier 과도기)**: h-coding은 `tier-bounded-autonomy`+envelope을
  선언하지만 gr-envelope-check/exit fp가 자기 바인딩이 아니라서 materialized
  문서에 envelope 규율이 미출현. byte-identity 게이트가 강제한 W1 한정 상태 —
  **envelope 렌더 wave(W2+)에서 규율 바인딩 재배치를 함께 결정해야 함.**
- **N2 (fallbackOwner="user"의 암묵 전제)**: SPARQL-3는 receptive-user만 채널을
  요구. "user"(인터랙티브 루프 상주) fallback은 사용자 존재를 shape로 검사하지
  않음 — tier-bounded-autonomy 정의 산문만이 전제를 진술. 의도된 경계로 보이나
  후속 wave에서 검토거리.
- **N3 (EnvelopeRule 인스턴스 0)**: `er-` 어휘·shape·chain은 살아있음(주입 실증)
  이나 validate가 "registered but not instantiated (harmless)"로 표시. 예약 상태
  정상 — 첫 실인스턴스 저작 시 N9 계열 재검 불요.
- **N4 (게이트 문구 stale)**: 브리프 §5-5 "~40/cap 260"은 §4d와 산술 모순 +
  HEAD가 이미 269. 브리프 자체 결함 — 후속 브리프 작성 시 개체 게이트는 §4d
  산술로부터 유도할 것.
- **N5 (파일경계 형식 편차)**: 브리프 §3은 `tools/validate.py` 수정을 명시했으나
  실편집은 `tools/ontology_lib.py`(+5줄) — 상수의 실위치라 실질 위반 아님.
  brief의 경로 오기.

## 판정

**PASS-with-notes** — 차단 결함 0. 고정 결정 7건·§4a~§4f 전부 반영 확인,
편차 3건 전부 정당(1건은 브리프 명세 결함의 교정), negative control 13/13,
materialize 산문 byte-identity, registry 3중 무결. 커밋(inspection)·maturity
승격 판단은 orchestrator 소관.
