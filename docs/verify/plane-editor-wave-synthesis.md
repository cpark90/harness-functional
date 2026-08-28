---
verdict: pass-with-notes
scope: "④ webui/tiptap lane wave 종합 — Phase 0 매핑 + 5번째 평면 온톨로지 반영 + Phase 1 앵커 프로토타입"
inputs:
  - docs/verify/plane-editor-phase0-verify.md   # pass-with-notes (문서 인용 전수)
  - docs/verify/plane-ontology-verify.md        # pass-with-notes (신설 0 결론)
  - docs/verify/plane-editor-phase1-verify.md   # pass-with-notes (앵커 엔진 G1–G5)
artifacts:
  - docs/plans/plane-editor-phase0.md
  - tools/plane-editor/{REPORT.md,suite-result.json,schema-dump.json}
  - ontology/abox/core/spec/patterns.ttl  # id:pat-knowledge-plane-separation
criteria: docs/feedback/inquiries/tool_suggestion.md v0.2 §8 로드맵 · §검토 A–E · docs/feedback/verified/annotation-backbone-architecture.md 적용 계획 ④
judged-at: 2026-08-28
judge: vnv (dispatch, opus)
python: /usr/bin/python3 (rdflib/pyshacl/owlrl) · node v22.22.3
gates: validate.py PASS · lint_uniformity.py PASS · check_determinism.py PASS (269 individuals) · plane-editor suite 재현 sha256 일치
phase2: GO (조건부 — §2의 C1–C4)
---
# 종합 판정 — ④ webui/tiptap lane wave (Phase 0 + 5평면 온톨로지 + Phase 1)

**verdict: pass-with-notes.** 세 하위 판정이 모두 pass-with-notes였고, 이 종합에서 그 결론을
뒤집는 사실은 나오지 않았다. 이 문서는 하위 판정의 재요약이 아니라 **하위 각각이 자기 범위
때문에 보지 못한 축**을 새로 재고 판정한다: ① 로드맵 원본 대비 커버리지, ② Phase 2 착수
근거의 수치 강도, ③ wave 완결성(미실행·미검증·무주인 잔여).

이 종합에서 새로 확보한 증거 4건은 §4에 있다. 요지는 두 가지다 — **앵커 스위트의 텍스트-only
채점이 숨긴 오부착은 전 시행에 걸쳐 0**임을 위치 재채점으로 닫았고(하위 판정은 표본 2건만
닫았다), 반대로 **스위트 밖 오해소 2종은 내 세션에서도 그대로 재현**됐다.

---

## 0. 재현 절차 (실행한 명령 그대로)

```bash
cd /home/cpark/git/harness_ontology

# (1) repo 게이트 3종 — 판정 시점 회귀
/usr/bin/python3 tools/validate.py            # PASS (6축, 269 individuals, dup 0)
/usr/bin/python3 tools/lint_uniformity.py     # PASS (6검사 0 위반, text cap 260 포함)
/usr/bin/python3 tools/check_determinism.py   # PASS (4요청 × md/json × 4run)

# (2) Phase 1 산출물 4번째 독립 재현 (다른 세션·다른 프로세스)
node tools/plane-editor/run-suite.mjs         # exit 0
sha256sum tools/plane-editor/{suite-result.json,REPORT.md}
git show HEAD:tools/plane-editor/suite-result.json | sha256sum
git show HEAD:tools/plane-editor/REPORT.md     | sha256sum
git diff --stat -- tools/plane-editor/         # (빈 출력)

# (3) 원시 시행 독립 재집계 + 위치 재채점 (§4.2)
/usr/bin/python3 -c "...suite-result.json scenarios[].trials[].lanes[] 재집계..."

# (4) 적대 프로브 재실행 (하위 판정이 남긴 스크립트)
node docs/verify/plane-editor-phase1-adversarial.mjs

# (5) 도구 층 land 확인 (Phase 4 공유 대상)
grep -n "TEXT_CAP_TOKENS" tools/lint_uniformity.py       # :150 = 260
grep -n "def alternative_clusters" tools/retrieve.py     # :196
git diff --stat HEAD -- ontology/                        # (빈 출력 = 이 wave의 그래프 변경 0)
```

---

## 1. ④ 범위 커버리지 — v0.2 §8 로드맵 대비

### 1.1 덮은 것 / 남은 것

| 로드맵 단계 (v0.2 §8) | 이번 wave | 산출물 | 판정 |
|---|---|---|---|
| **Phase 0 — 기존 lane 형식화** | **덮음** | `docs/plans/plane-editor-phase0.md` (5평면×자산 매핑, 재사용 경계 (a)(b)(c), write path 계약 C1–C8, 형식화 GAP 15건, Phase 1 계약 4개 + Phase 2 접점 P1–P6) | ✓ 인용 136건 전건 실재, 계약 5개 실행 재현 |
| **§검토 A [필수] — 5번째 평면 온톨로지 반영** | **덮음** | `id:pat-knowledge-plane-separation` (선재, `1406d87`) — 이번 dispatch 그래프 변경 0 | ✓ "신설 0"은 골든룰 2 준수. 소스 요구 11/13 문면 실재 + 2건 도구층 귀속 |
| **Phase 1 — 앵커 엔진 검증** | **덮음** | `tools/plane-editor/` (24 tracked files, G1–G5 PASS, 48시행 × 3레인) | ✓ 게이트 독립 재측정 통과, 수치 불일치 0, 재현 해시 일치 |
| **Phase 2 — 산문 평면 2종** (설계결정 평면 + 링크 저장소 + `targets`/`supersedes`) | **미착수** | 브리프 없음 (`docs/plans`·`inquiries` 전수 확인) | 잔여 — §2가 착수 조건 |
| **Phase 3 — 코드 평면 연결** (LSP 심볼 ID·스키마 경로 링크 대상) | **미착수** | — | 잔여. 대응 GAP = D1(타입 게이트 부재)·D2(심볼 앵커 부재)·C1(하위호환 delta) |
| **Phase 4 — 툴 스코핑 및 투영** (평면별 툴 노출·읽기 형태·질의 뷰 + `[v0.2 C]` 두 장치 강제) | **미착수** | — | 잔여. 대응 GAP = F1(평면 축 파라미터화)·F2(팩이 그래프 평면만)·E1(거부 3종). **§1.2가 필수 조항** |
| **Phase 5 — 일관성 검증** (교차 평면 모순·결정론 diff) | **미착수** | — | 잔여. 대응 GAP = B3(판정 기록 기계 검사)·C1 |

**§검토 A–E 처리 상태**: A(5평면) ✓ 그래프+문서 반영 / B(링크 어휘 `ho:` 재사용) = v0.2 §4.3
표에 **명문화만** 됨, 집행은 Phase 2 / C(cap·1선별 Phase 4 강제) = 도구 층 **land 완료**,
편집기 공유는 Phase 4 (§1.2) / D(문서 결함 2건) = §9 보정 ✓, I3 판정 주체는 "사람 승인 게이트
**또는** 판정 에이전트"로 **선택지 상태**(§5 결정 후보 밖 잔여) / E(자산 매핑 선행) ✓ Phase 0.

### 1.2 [후속 요건] Phase 4 브리프에 반드시 들어갈 조항 — 이중 구현 금지

설계 원본이 Phase 4 조항으로 못박은 문장은 `tool_suggestion.md:301-304`(§8 Phase 4)와
검토 C(`:374-377`)다 — *"`retrieve.py`와 동일 선별 규칙 공유 — 도구/retrieve 이중 구현 금지,
determinism 게이트 유지"*. 그 두 장치는 **이미 repo 도구 층에 land**되어 있음을 이 판정에서
실측했다:

- **cap 260**: `tools/lint_uniformity.py:150` `TEXT_CAP_TOKENS = 260`, 측정법은 `chars//4`
  (`ho:promptText` + `skos:definition` 합, abox 개체만 — TBox 제외 `:341-346`). 현재 위반 0.
- **영역당 1선별**: `tools/retrieve.py:196` `alternative_clusters()`가 `ho:alternativeOf`의
  무향 연결 성분을 최소 IRI 키로 계산하고, `:250-268`이 같은 성분의 두 번째 노드를
  **token_cost 부과 전에** 영구 탈락시킨다(예산 미차감).

따라서 Phase 4 브리프는 다음을 **요건**으로 담아야 한다(문구 그대로 승계 권고):

> **[Phase 4 필수] 규칙 단일 소유.** 편집기는 cap 260과 anchor 영역당 1선별을 **재구현하지
> 않는다**. 값(260)·측정법(chars//4·promptText+definition·abox 한정)·클러스터 계산(무향 연결
> 성분, 예산 차감 전 skip)은 `lint_uniformity.py`/`retrieve.py`가 **유일 정의처**이며, 편집기는
> 그 출력을 소비한다.
> **[구현 제약]** Phase 0 §4.1이 확인했듯 Phase 1 산출물은 Node 런타임이고 이 규칙들은 Python
> 런타임이라 **직접 import가 불가**하다 — 그러므로 "공유"는 값 복제가 아니라 **계약 표면**으로
> 실현해야 한다(예: 도구가 cap/클러스터를 JSON으로 내보내는 CLI 1개를 추가하고 편집기는 그것만
> 호출; 또는 편집기 쓰기를 webui write path 경유로 강제). JS 쪽에 `260`을 하드코딩하거나
> 클러스터 알고리즘을 다시 쓰면 [v0.2 C] 위반이다.
> **[수용 검증]** negative control 1건: 도구 층에서만 값을 바꿨을 때(260→259 또는 대안 엣지 1개
> 추가) **편집기 판정이 따라 바뀌는지**를 보여야 통과. 값이 안 바뀌면 그것이 이중 구현의 증거다.
> determinism 게이트(`check_determinism.py`)는 그대로 유지한다.

이 제약은 Phase 0 문서 §6의 마지막 줄("Phase 4 설계 시: 재구현 금지, 공유가 요구사항")과
같은 요구지만, **런타임 경계 때문에 순진한 공유가 불가능하다**는 사실은 어느 문서에도 아직
적혀 있지 않다 — Phase 0 §4.1은 그 프로세스 경계를 *장점*(비접속 보장)으로만 서술한다.
같은 경계가 Phase 4에서는 *비용*이 된다. 이 양면성을 브리프에 명시하지 않으면, 구현자가
"JS에 260 하드코딩"이라는 가장 쉬운 길로 갈 확률이 높다.

---

## 2. Phase 2 go/no-go — **GO (조건부)**

### 2.1 실측 수치 (원시 `suite-result.json`에서 내가 재집계 — 하위 판정과 일치)

| 축 | 값 | 해석 |
|---|---|---|
| 저장 selector 내구성 (stale 레인, G2 대상 S1–S4·S8) | **28/30 = 93.3%** (드리프트 2, orphan 0, 오해소 0) | 미달 2건은 전부 **1자 경계 드리프트**(a1·a2, S4) — 다른 곳 부착 아님. 원인 D2(`y-prosemirror`의 `simpleDiff` 삭제 정렬) 확정 |
| 별 프로세스 round-trip (S8) | **6/6 = 100%** (pipeline·stale 동일) | 저장→재시작→재로드는 손실 0 |
| 게이트 레인 (pipeline, S1–S4·S8) | 30/30 = 100% — 단 **24/30이 `mode: recaptured`** | S1–S4는 편집 **후** 재캡처한 앵커라, 증명하는 건 세션 내 Decoration 추종. 내구성 증거는 stale 28/30 + S8 6/6 |
| 블록 이동 (S6) | 주앵커 0/6, **quote 복구 6/6 = 100%** | RelativePosition은 이동에 null. 복구 부담 전량이 quote selector |
| 동시 편집 병합 (S7) | 저장 앵커 **6/6 생존**, 두 복제본 수렴 6/6 | 단 같은 시나리오의 **live 레인 0/6**(원격 update가 문서 전체 replace) |
| 오해소 (고정 시나리오 S1–S8) | **0 / 138 측정 시행** (live 42 + pipeline 48 + stale 48) | 텍스트 채점 기준. §4.2에서 **위치 채점으로도 0** 확정 |
| 오해소 (스위트 **밖** 적대 케이스) | **블록 통째 삭제 2/2 · 제자리 교체 1/2** | 내 세션에서 재현. 방지선 실제 강도 = **1문자** |
| bystander 간섭 | 210건 중 ok 209 / 잔여범위 1 / orphan 0 / 오해소 0 | 다수 앵커 공존은 안전 |

### 2.2 판정: **GO** — 단, 아래 조건을 수치로 건다

Phase 2의 실체는 (a) 설계결정 평면 추가 (b) 두 평면 간 **링크 저장소** + `targets`/`supersedes`
링크 타입이다. (a)·(b)의 **저장소·어휘 설계는 앵커 정밀도와 직교**하므로 착수를 막을 이유가
없다. 막아야 하는 것은 **앵커가 링크의 종단점이 되는 지점**이다 — 그 순간 오부착은 "주석이
한 칸 밀림"이 아니라 **틀린 설계 결정을 참조하는 링크**가 되어 평면 아키텍처의 신뢰 근거
자체를 깎는다.

| 조건 | 수치 기준 | 현재 실측 | 차단 범위 |
|---|---|---|---|
| **C1. quote 복구 강화 선행** | 스위트에 **S9(블록 통째 삭제)·S10(제자리 텍스트 교체)** 를 정식 시나리오로 추가하고, 두 시나리오 전 레인 **오해소 = 0 / ≥12 시행** | **미충족** — S9 2/2 오해소, S10 1/2 오해소(공유 글자 0인 대조군만 orphan) | **차단**: 앵커를 링크 종단점으로 쓰는 작업. 링크 저장소 스키마·설계결정 평면 저작은 **비차단** |
| **C2. 원격 업데이트 rehydrate** | live 레인 S6·S7 생존이 rehydrate 구현 후 **≥ 6/6 (현재 0/6)** 로 회복 | 미충족 (0/6, 0/6) | **차단**: 편집기 UI lane. 헤드리스 저장/해소 경로는 비차단 |
| **C3. 저장 규약 2건 명문화** | ① "세션이 살아 있으면 저장 시 재캡처" → stale 드리프트 **2/30 → 0/30**(pipeline 실측이 이미 0) ② 앵커 결합 방향(assoc) 명시 저장 → D1의 live/stale 끝-경계 불일치 **6/6 → 0/6** | 미착수(진단만 존재) | 비차단 (Phase 2 규약 항목) |
| **C4. 스케일 재측정** | fixture ≥ 5,000자 / 앵커 ≥ 100에서 오해소 0 · 해소 시간 보고 | 미측정 (현 fixture 381자·앵커 6·48시행) | 비차단 (Phase 2 종료 게이트 권고) |

**강화 방향(C1 구현 힌트, 실측 근거 포함)**: (i) tombstone 규칙이 `collapsed`에만 걸려
`unresolved`(null)를 놓친다(`src/anchors.mjs:208`) — 블록 삭제가 정확히 이 경로다.
(ii) affixGuard가 `head > 0 || tail > 0`(`:111`)이라 **1문자 우연**으로 통과한다.
(iii) `MIN_AFFIX = 4`(`:41`)는 자연어에서 `" an "`·`" record"` 같은 조각으로 충족되어
**동일성 증거가 못 된다** — P3의 오부착 2건이 완화 규칙이 아니라 **정규 `both-affix` 경로로
통과**했다는 사실이 이를 실증한다. (iv) CRDT delete set으로는 삭제와 이동을 구분할 수 없다
(P7: 둘 다 `isDeleted: true`) → **블록 정체성(blockId) 명시 저장**이 실질적 해법 후보.

**no-go가 아닌 이유**: 브리프가 go/no-go 근거로 지정한 것은 "앵커 생존율"이고, 그 값은
최악 경로(stale)에서도 93.3%이며 미달분이 전부 **오부착이 아닌 1자 드리프트**다. 오해소는
고정 시나리오 138 측정 시행에서 0이고(§4.2로 위치 채점까지 확인), 실패는 전부 **명시적 orphan**으로
드러난다(조용한 소실 0). 아키텍처 전제("standoff 앵커는 편집을 견딘다")는 반증되지 않았다.

---

## 3. 완결성 비판 (critic) — 빠진 것 · 미검증 주장 · 후속 결정

### 3.1 실행되지 않은 시나리오 (측정 공백)

1. **블록 통째 삭제 / 제자리 교체** — 스위트에 없고, 넣자마자 오해소가 난다(§2.1). 가장 흔한
   편집 두 가지가 고정 스위트 밖이었다는 점이 이번 wave의 최대 공백이다.
2. **범위를 가로지르는 동시 편집** — S7의 두 복제본은 앵커 **범위 밖**(블록 시작/끝)에만
   삽입한다(`src/scenarios.mjs`). 동시 삭제·범위 교차 편집은 미측정.
3. **스케일** — 381자 / 7블록 / 앵커 6개 / 48시행. 대형 문서·수백 앵커·표는 미측정
   (중첩 구조는 P6가 list item·code block 기본 동작만 확인).
4. **끝 경계 삽입(D1)** — 진단으로만 실려 있고 게이트가 아니다. live/stale이 6/6 **전부
   불일치**인데도 비게이팅이라 판정에 영향을 주지 않는다.
5. **그래프 측 annotation 어휘 실사용** — `ho:Anchor`/`alternativeOf`/`overlapsWith`/`hasAnchor`
   인스턴스 여전히 **0**(GAP E2). `AnchorShape`·`anchor-` 접두사·SPARQL 불변식은 이번 wave
   에서도 실전 검증되지 않았다(설계된 휴면이라 결함은 아니나, ④가 그 첫 소비자다).

### 3.2 게이트 문구가 실제보다 강하게 읽히는 지점

1. **G2 "생존 100%"는 레인 선택의 산물이다.** pipeline 게이트 30건 중 24건이 `recaptured`
   (편집 **후** 캡처를 같은 문서에서 해소) — 저장 selector 내구성의 직접 측정치가 아니다.
   뿌리는 브리프 §4가 "생존 = 편집 후 해소 텍스트 == 기대 텍스트"라고만 쓰고 **캡처 시점을
   규정하지 않은 것**이다. 즉 **브리프 결함이 게이트 판정에 그대로 흘러들어갔다**.
   developer는 stale 93.3%를 `staleMeetsTarget: false`로 병기해 숨기지 않았다 — 처리는 정직했고,
   남은 것은 orchestrator의 **레인 확정**뿐이다(§5 결정 후보 1에 흡수).
2. **`REPORT.md`의 "오해소 0" 서술에 범위 한정이 없다.** §3 표("**0이어야 함**")와 §4 제목
   ("오해소 0을 만든 규칙")은 S1–S8 범위 안에서만 참이다. 이 파일은 **생성물**이므로 문서를
   고치는 게 아니라 **생성기 `src/report.mjs`를 고쳐야** 한다(하위 판정이 "표현을 한정하라"고
   했으나 수정 지점이 코드라는 점은 적히지 않았다).
3. **G4는 스위트가 스스로 `external`로 회피한다.** 실제로는 vnv·inspection·나까지 3자가 별도
   실행해 PASS를 확인했으므로 결과적으로 충족이지만, **스위트 산출물만으로는 G4가 증명되지
   않는다**. 마찬가지로 G3의 스위트 자체 증거는 *같은 프로세스* 2회 반복이고, 진짜 증거는
   별 프로세스 재실행(vnv 3회 + 이번 1회 = **4회 독립**, 커밋본 해시 일치)이다.
4. **G5의 자체 스캔은 손저작 17파일 한정**(생성물 제외). vnv가 node_modules 제외 23개 전수로
   보강해 통과. 즉 3개 게이트(G3·G4·G5)가 **자기 산출물만으로는 부족**하고 외부 재측정으로
   메워졌다 — Phase 2 브리프는 게이트 정의에 "누가 측정하는가"를 함께 적어야 같은 일이
   반복되지 않는다.

### 3.3 무주인(unowned) 잔여 — 아무 lane도 가져가지 않은 후속

1. **GAP A3 문서 정정** (`docs/feedback/verified/README.md`의 `status:` 키 미정의 +
   `verdict: done`(최빈)·`apply-plan-ready`가 규약 3값 밖). Phase 0가 §6에서 넘겼고 **아직
   미처리**이며, Phase 2 접점 **P1(annotation 레코드 ↔ feedback 항목)의 선행 조건**으로
   지목돼 있다. Phase 2를 열면 즉시 막히는 항목이다. → §5 결정 후보 3.
2. **예산 정확도(tokenEstimate) lane** — plane-ontology 판정 Note-3: 텍스트가 있는데
   `ho:tokenEstimate`가 없는 abox 노드 **120개**(그중 chars/4 > 60이 61개)가 `token_cost`에서
   **일괄 15 token**만 청구하고, 선언값과 chars/4가 2 이상 어긋난 노드가 **109개**다.
   §1c [지킴] 위반은 아니지만 **anti-rot 방어선(예산 정확도)** 축의 실측 결함 후보이며,
   어느 브리프도 소유하지 않는다.
3. **Phase 0 문서의 정밀도 note 5건**(N1 `server.py:38-42`가 import 전부 / N2
   `harness.ttl:205` vs 실제 :208 / N3 `ONTOLOGYSTYLE.md:150`은 표 내부 행 / N4 §2.1 "변경률"
   열 미사상 + 제외 사유 없음 / N6 "`.mjs`/JSON뿐") — **판정 시점 현재 전부 미수정 상태**다.
   micro dispatch 1회 분량.
4. **node 스위트가 CI에 없다.** `.github/workflows/validate.yml`은 Python 게이트 3종뿐이고
   node 스텝이 없다 — 즉 `REPORT.md`가 스스로 내건 "재실행하면 byte 단위로 같아야 한다"는
   **CI로 강제되지 않는다**. `package-lock.json`이 있어 의존성 표류 위험은 낮지만,
   Phase 2에서 편집기가 커지면 결정론 붕괴가 조용히 통과한다.

### 3.4 미검증·이동표적 주장 (비차단, 기록용)

- Phase 0의 **개수 계열 주장**(`docs/verify` 42, verified 22건, 미정의 14건 등)은 병행 세션
  때문에 이미 stale이다(하위 판정 시점 43·23·15, 지금 또 다름). 문서가 "이동 표적" caveat을
  달았고 **구조·GAP 주장은 하나도 뒤집히지 않았으므로** 추적하지 않는 것이 옳다.
- **`supersedes` 그래프 재도입 금지(B9)를 강제하는 기계 장치는 없다.** v0.2 §4.3 표의 산문
  경고가 전부다 — Phase 2가 링크 타입을 실제로 저장하기 시작하면, 이 경계는 사람이 지키거나
  린터가 지켜야 한다. 현재는 전자뿐이다.
- **`ho:anchorTarget`의 range는 `ho:Concept`뿐**이고(`harness.ttl:657`), Anchor 정의는
  "an Anchor belongs on a component the harness already binds, **not on the harness node
  itself**"라고 못박는다(GAP E3). 즉 **편집기가 임의 individual을 겨냥한 IRI 앵커**를
  `ho:Anchor`로 표현하는 경로는 지금 스키마로는 **없다**. Phase 0 §4.2 P3가 "경계 주의"로
  적었지만 해결은 미정 — 스키마 결정 사안이다. → §5 결정 후보 2.
- **프로세스 관찰(사실 기록)**: Phase 1 산출물이 vnv 게이트 전에 `4848f3b`로 land됐다.
  아티팩트 해시가 내 독립 재실행과 일치하므로 내용 문제는 없다. 판정 도중 병행 inspection
  세션이 `2a78523`로 Phase 1 판정 보고 + 적대 스크립트까지 커밋해, 이 종합 시점에는 하위 판정
  3건이 모두 tracked다(이 문서만 신규).
- **[병행 세션 관측 — 내 편집 범위 밖, 사실만 기록]** 판정 중 inspection이
  `docs/feedback/verified/annotation-backbone-architecture.md`에 미커밋 +55행을 추가했다
  (사용자 지적 "annotation·anchor·확률 edge·layered skeleton이 왜 아직 미반영인가"에 대한 실측).
  요지 두 가지가 이 종합과 교차한다: ① **④가 검증한 anchor는 편집기의 텍스트 앵커이고
  사용자가 요청한 그래프의 `ho:Anchor` 개체가 아니다** — 내 §3.1-5(GAP E2, 인스턴스 0)와 같은
  사실을 "진행률이 있어 보이지만 요청 항목은 전진하지 않았다"로 더 강하게 읽는다.
  ② **`retrieve.py`의 영역당 1선별은 `alternativeOf` 엣지 0이라 실질 무효**다 — 즉 §1.2가
  Phase 4에 공유하라고 요구하는 규칙 중 하나는 **아직 한 번도 물어본 적이 없는 이빨**이다.
  Phase 4 브리프의 negative control(§1.2)은 그래서 더 필요하다(대안 엣지 1개 주입 → 편집기
  판정이 따라 바뀌는지). 이 파일은 타 세션 소유이므로 고치지 않았다.
- **작은 아이러니(관찰)**: "노이즈 차단 입력"을 서술하는 `id:pat-knowledge-plane-separation`
  자신이 243 token으로 기본 예산 900의 **27%**를 점유해, 14개 질의 중 6개에서 5–13개 노드를
  밀어낸다(하위 판정 Note-2). 규약 위반은 아니고 §3.3-2와 같은 뿌리다.

---

## 4. 이 종합에서 새로 확보한 증거 (하위 판정이 하지 않은 측정)

### 4.1 Phase 1 산출물 4번째 독립 재현 (다른 세션)

```
node tools/plane-editor/run-suite.mjs   → exit 0
suite-result.json  sha256 260f32d9f5adb415ca160df2b5a5f275db73bfffc98e75980e9ae9ac1cc356e6
REPORT.md          sha256 a915a49bdce02d60754d1948709cadefa8f3a07cb740502a020c13db1e9b784e
git show HEAD:… | sha256sum → 두 값 모두 동일 ; git diff --stat -- tools/plane-editor/ → 빈 출력
```
커밋된 아티팩트를 **byte 단위로 재생산**했다. G3는 이제 서로 다른 세션·프로세스 4회로
확증된다.

### 4.2 [신규] 텍스트-only 채점의 사각을 **전 시행**에서 닫음

하위 판정은 채점기가 `resolution.text === expected.value`만 본다는 취약성을 지적하고
표본 2건(P1·P2)만 위치로 재채점했다. 나는 **모든 시행**에 대해 닫았다:

1. 먼저 PM 위치 ↔ 텍스트 오프셋 관계를 **모호하지 않은 60개 레인 행**에서 실증했다 —
   `from = textOffset + blockIndex + 1`, 예외 0(관측된 (차이, blockIndex) 쌍 = (2,1)…(7,6)).
2. 그 다음 **기대 문자열이 해소 대상 문서에 2회 이상 나타나는 시행**만 추렸다 — 위치 채점과
   텍스트 채점이 **갈릴 수 있는 유일한 경우**다. 텍스트 기대를 가진 42시행(S5 6건은 기대가
   orphan이라 텍스트 채점 자체가 없다) 중 **7건**: S1/a6, S3/a6, S4/a3, S4/a6, S6/a6, S7/a6,
   그리고 편집이 없어 원 fixture로 채점해야 하는 **S8/a6** (a6는 fixture가 심어둔 함정 앵커 —
   `honest orphan`이 문서에 2회 등장).
3. 7건 × 2레인(pipeline·stale) = **14개 행 전부 올바른 출현에 부착**했다.

| 시행 | 출현 (offset, block) | pipeline `from` → 부착 | stale `from` → 부착 |
|---|---|---|---|
| S1/a6 | (303,5) · (336,6) | 309 → **(303,5)** 정답 | 309 → (303,5) |
| S3/a6 | (289,5) · (322,6) | 295 → **(289,5)** 정답 | 295 → (289,5) |
| S4/a6 | (297,5) · (317,6) | 303 → **(297,5)** 정답 | 303 → (297,5) |
| S4/a3 | (74,2) · (169,3) | 77 → **(74,2)** 정답(원 앵커 블록) | 77 → (74,2) |
| S6/a6 | (274,5) · (360,6) | 367 → **(360,6)** = 이동한 블록 | 367 → (360,6) |
| S7/a6 | (301,5) · (338,6) | 307 → **(301,5)** 정답 | 307 → (301,5) |
| S8/a6 (원 fixture) | (297,5) · (330,6) | 303 → **(297,5)** 정답 | 303 → (297,5) |

⇒ **스위트가 보고한 "오해소 0"은 위치 기준으로도 참이다.** 나머지 행(모호하지 않은 60행 +
S8의 나머지 앵커)은 기대 문자열이 문서에 유일하므로 두 채점이 정의상 동치다. 채점기의 취약성은 남지만(§3.2), **이번 결과를
왜곡하지 않았음**이 이제 표본이 아니라 전수로 확정됐다.

### 4.3 적대 프로브 독립 재현 (다른 세션에서 동일 결과)

`node docs/verify/plane-editor-phase1-adversarial.mjs` 재실행 — 하위 판정의 결함 주장이
그대로 재현됐다:
- **P3 블록 통째 삭제**: 2/2 오부착. 둘 다 완화 규칙이 아니라 **정규 `both-affix`** 경로
  (prefix 4/suffix 7, prefix 32/suffix 8)로 통과 — `RelativePosition`이 `collapsed`가 아닌
  **`unresolved`** 라 tombstone 규칙이 발동하지 않는다.
- **P4 제자리 교체**: `Amazing…`(공유 글자 1) → guard head 1/tail 0 **accepted → 오부착**,
  `Zebra…`(공유 0) → head 0/tail 0 **rejected → orphan**. 방지선 강도 = **1문자** 확인.
- **P5/P6/P7** 재현: `collapsed` 경로는 문맥까지 같은 쌍둥이 앞에서도 orphan 확정(정상),
  중첩 노드(list/code) 정상, CRDT delete set으로는 삭제·이동 구분 불가(`isDeleted: true` 양쪽).

### 4.4 도구 층·CI·경계 실측

- 이번 wave의 **`ontology/` 변경 = 0**(`git diff --stat HEAD -- ontology/` 빈 출력).
  대상 노드는 선재(`1406d87`). 게이트 3종 판정 시점 PASS(269 individuals).
- Phase 4 공유 대상 실재: `lint_uniformity.py:150 TEXT_CAP_TOKENS = 260`,
  `retrieve.py:196 alternative_clusters`.
- `tools/plane-editor` tracked 24파일, `node_modules`(48M)는 `.gitignore:13`으로 제외 — 위생 정상.
- **CI에 node 스텝 없음** (`.github/workflows/validate.yml` 3스텝 전부 Python) → §3.3-4.

---

## 5. 결정 요청 후보 (최대 3건 — `docs/feedback/` 항목화용)

### 결정 1. Phase 2 착수 형태 — 앵커 강화를 선행할 것인가, 병행할 것인가
**배경**: 저장 앵커 내구성은 최악 경로에서 93.3%(미달분 전부 1자 드리프트, 오부착 아님),
고정 시나리오 오해소 0. 그러나 스위트 **밖** 두 편집(블록 통째 삭제 / 제자리 교체)에서
오해소가 실측됐다(2/2, 1/2). 함께 확정이 필요한 부수 항목: **G2 "생존 100%"를 pipeline(재캡처
포함, 100%)로 볼지 stale(저장 selector 내구성, 93.3%)로 볼지.**
- **(a) 병행 (권고)**: 링크 저장소·설계결정 평면 저작은 즉시 착수하되, **앵커를 링크 종단점으로
  바인딩하는 작업만** C1(S9·S10 오해소 0/≥12시행) 통과 후로 미룬다. G2 기준 레인은 **stale**로
  확정하고 목표를 "저장 selector 생존 ≥ 93.3% 유지 + 오해소 0"으로 재정의.
- **(b) 강화 선행**: Phase 2 전체를 멈추고 quote selector 강화(S9·S10 추가 + tombstone을
  `unresolved`까지 확장 + affix guard 상향/blockId 저장)를 먼저 완료. 안전하지만 lane이 한 번 더 쉼.
- **(c) 그대로 진행**: pipeline 100%를 게이트 값으로 확정하고 Phase 2 전면 착수, 오해소 2종은
  Phase 2 안에서 처리. 가장 빠르지만 **틀린 링크**가 저장될 위험을 감수.

### 결정 2. 편집기↔그래프 **IRI 앵커와 링크 평면의 저장 위치**
**배경**: Phase 0 접점 P2·P3가 걸린 지점이다. 현행 스키마로는 **임의 individual을 겨냥한
앵커를 `ho:Anchor`로 표현할 수 없다** — `ho:anchorTarget`의 range가 `ho:Concept`뿐이고
(`harness.ttl:657`), harness 노드 자신에 붙인 Anchor는 rollup 체인(`hasComponent o hasAnchor`)
상 도달성이 성립하지 않는다(GAP E3). 동시에 `supersedes`는 **그래프 재도입 금지**(B9)라
설계결정 평면에만 살 수 있는데, 그 저장소가 아직 없다(GAP B2·G1).
- **(a) 그래프 밖 링크 스토어 1개** (`ontology/` 밖 JSON/TTL): 도구가 `ontology/`만 스캔하므로
  validate/retrieve에 무영향, B9도 자동 준수. 대신 링크 무결성은 **새 검사기**가 필요.
- **(b) 스키마 확장**: `ho:anchorTarget` range를 넓히고(또는 anchor 종류를 분화) 그래프 안에
  IRI 앵커를 둔다. reachability·SHACL이 그대로 무결성을 강제하는 대신, TBox 확장 + B9 경계
  집행 규칙이 필요.
- **(c) 편집기 로컬 한정**: 앵커를 편집기 JSON에만 두고 그래프와는 **읽기 참조**로만 연결.
  가장 싸지만 GAP A2(자유 형식 `targets:`)가 그대로 남고 P2 접점이 열리지 않는다.

### 결정 3. GAP A3 — `verified/` lane 상태 어휘를 **규약에 맞출까, 실사용에 맞출까**
**배경**: `docs/feedback/verified/README.md`가 정의한 verdict는 3값(`apply`/
`apply-with-changes`/`needs-decision`)인데 실사용 최빈값은 **`done`**이고 `apply-plan-ready`도
쓰인다. `status:` 키는 README에 **정의조차 없는데** `reported`/`finalized`가 쓰인다. 이 어휘는
Phase 2 접점 P1(annotation status ↔ feedback status)의 **선행 조건**으로 지목돼 있어, 미결이면
Phase 2에서 바로 막힌다.
- **(a) 실사용을 규약으로 승격**: README에 `status: reported|finalized` 정의 추가 +
  verdict에 `done`·`apply-plan-ready` 추가(사후 상태를 1급으로 인정).
- **(b) 실사용을 규약에 맞춤**: 기존 항목의 값을 3값으로 재라벨하고 사후 상태는 다른 키로 분리.
- **(c) 유예**: Phase 2가 P1 접점을 열 때까지 미룬다(그때까지 어댑터 정의역 미확정).

---

## 6. 판정

- **verification (규격대로 만들었나)**: ✓ — repo 게이트 3종 PASS(269 individuals), Phase 1
  게이트 G1–G5 PASS(외부 재측정 포함), 산출물 결정론 4회 독립 재현·커밋본 해시 일치,
  각 dispatch의 파일 경계 준수(그래프 변경 0, `tools/plane-editor/` 순수 추가, 보고는
  `docs/verify/`).
- **validation (올바른 것을 만들었나)**: ✓ (한정) — v0.2 §8이 이번 wave에 배정한 **Phase 0 +
  Phase 1 + §검토 A(5번째 평면)** 는 빠짐없이 덮였고, 각 산출물이 소스 요구에 1:1로 매핑된다.
  한정은 두 가지다: ① Phase 1의 "오해소 0"은 **고정 시나리오 안에서만** 참이며 스위트 밖 두
  편집에서 재현 가능한 오부착이 존재한다(§2·§4.3), ② G2의 100%는 **레인 선택**에 좌우된다(§3.2).
  둘 다 하위 판정이 이미 드러냈고 이 종합에서 재현·정량화했다.
- **wave 전체 verdict: pass-with-notes.** 차단 결함 없음. 남은 것은 (i) Phase 4 브리프 필수
  조항 §1.2, (ii) Phase 2 조건 C1–C4, (iii) §3.3의 무주인 잔여 4건, (iv) §5 결정 3건이다.
- **판정 결과로 온톨로지·설계 문서를 수정하지 않았다.** 후속은 orchestrator가
  developer dispatch(문서·코드 층) 또는 inspection(파급·git)으로 라우팅한다.
