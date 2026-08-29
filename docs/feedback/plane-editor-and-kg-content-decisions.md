---
status: approved            # 사용자만 approved로 바꾼다
targets: [id:pat-knowledge-plane-separation, ho:Anchor, ho:alternativeOf, id:scheme, tools/plane-editor, tools/retrieve.py]
---
# 결정 요청 — ④ lane 이후 진행 방향 4건 (orchestrator)

승인 항목 `annotation-backbone-architecture`의 ④ webui/tiptap lane wave(Phase 0 형식화 +
5번째 평면 온톨로지 반영 + Phase 1 앵커 프로토타입)가 끝났고, vnv 종합 판정
`docs/verify/plane-editor-wave-synthesis.md`(pass-with-notes)와 inspection의 미반영 항목
실측이 **사용자 결정이 필요한 갈림길 4개**를 남겼다. 각 항목은 독립이라 원하는 조합으로
답해도 된다 (예: "1-(a), 2-(b), 3-(c), 4-보류").

진행 중(결정 불요): 차단 조건 **C1**(앵커 오해소 근절 — S9 블록 삭제·S10 제자리 교체)은
이미 developer dispatch로 수정 중이고, **A-wave 후보 탐색**(대안쌍·가중 anchor·계층화 案
실측)은 vnv dispatch로 측정 중이다. 아래 결정은 그 결과와 무관하게 방향을 정하는 것.

---

## 1. Phase 2(산문 평면 2종 + 링크 저장소) 착수 형태

Phase 1 실측: 저장 selector 내구성 stale 93.3%(28/30, 미달 2건은 1자 경계 드리프트),
round-trip 6/6, quote 복구 6/6, 고정 시나리오 오해소 0/138. 단 스위트 밖 두 편집에서
오해소 재현(C1으로 수정 중).

- **(a) 병행 착수 (권고)** — 링크 저장소·설계결정 평면 저작은 즉시 시작하고, **앵커를 링크
  종단점으로 바인딩하는 작업만** C1 통과 후로 미룬다. G2 기준 레인은 `stale`로 확정하고
  목표를 "≥93.3% 유지 + 오해소 0"으로 명문화.
- **(b) 앵커 강화 선행** — C1 통과를 확인한 뒤 Phase 2 전체 착수 (가장 안전, 가장 느림).
- **(c) 전면 착수** — pipeline 레인 100%를 게이트 값으로 확정하고 바인딩까지 지금 시작
  (틀린 링크가 저장될 위험을 감수).

## 2. 편집기↔그래프 IRI 앵커·링크 평면의 저장 위치

현행 스키마로는 임의 individual을 겨냥한 앵커를 `ho:Anchor`로 표현할 수 없다
(`anchorTarget` range = `ho:Concept`), harness 노드 자신의 Anchor도 rollup chain상 불가.

- **(a) `ontology/` 밖 링크 스토어 1개** — 도구가 `ontology/`만 스캔하므로 그래프 재도입
  금지 규칙을 자동 준수. 대신 링크 무결성 검사기를 새로 만들어야 한다.
- **(b) 스키마 확장** — `anchorTarget` range 확대 + harness-level anchor 술어. SHACL·
  reachability가 무결성을 강제해 주는 대신, TBox 확장과 재도입 금지 집행 규칙이 필요.
- **(c) 편집기 로컬 한정** — 가장 싸지만 그래프↔편집기 접점이 열리지 않는다(요구 미충족).

## 3. `verified/` lane 어휘의 정본 (GAP A3)

실측: 22개 검증 보고서 중 14개가 README에 정의되지 않은 값을 쓴다 — `verdict: done` 13건,
`apply-plan-ready` 1건(정의된 값은 apply / apply-with-changes / needs-decision), 그리고
README가 정의하지 않는 `status:` 키가 17건(reported 16 / finalized 1).

- **(a) 실사용을 규약으로 승격** — `status: reported|finalized` 정의 추가 + verdict에 `done`·
  `apply-plan-ready` 추가 (문서 1개 수정으로 끝, 현실 반영).
- **(b) 실사용을 규약 3값에 맞춰 재라벨** — 14개 보고서 수정 + 사후 상태는 별도 키로 분리
  (규약은 깨끗해지나 편집량 큼).
- **(c) 유예** — Phase 2가 이 lane과의 접점을 열 때 함께 정한다.

## 4. backbone 계층화 (layered skeleton) — inspection 실측이 드러낸 미충족 요구

사용자 원 요청의 "내용 구분에 따른 layered skeleton"이 판정 단계에서 "이미 있음"(=`id:scheme`
backbone)으로 처리됐으나, 실측하면 **깊이 1의 평면 구조**(top concept 11 + broader 31,
최대 깊이 1)라 layered라고 부를 수 없다. 개념 재배치라 파급이 크다.

- **(a) B-wave 편성** — 내용 구분 축을 정해 `skos:broader` 2~3층으로 재구성. 진행 중인
  A-wave 실측이 案과 파급 추정을 함께 내므로, 그 결과를 보고 案을 고르는 방식.
- **(b) 부분 계층화** — 파급이 작은 영역(예: 한 상위 개념 아래 밀집한 군)만 먼저 2층으로.
- **(c) 현행 유지** — 평면 backbone을 유지하고 계층화 요구는 철회/보류.

---

---

## A-wave 실측 결과 반영 (2026-08-28, `docs/verify/kg-content-candidates.md`)

위 결정 3·4의 판단 근거가 실측으로 채워졌다. **핵심: KG의 annotation/anchor 공백은 방치가
아니라 증거가 지지하는 정답이다** — 저작할 실물이 없다.

| 축 | 후보 | 판정 |
|---|---|---|
| `ho:alternativeOf` (진짜 대안 서술) | **0** | 저작하지 말 것 |
| `ho:overlapsWith` (부분 겹침) | **2** | ↓ 결정 5 |
| 중복(=병합 대상 drift) | **0** | 조치 불요 |
| `ho:Anchor` + `anchorConfidence` | **0** | 저작 근거 없음 |
| layered skeleton | 案 2개 (A 권고) | ↓ 결정 4 보강 |

- **대안 서술 0**: 4개 독립 탐색법(라벨 Jaccard / 태그집합 그룹 / 정의 Jaccard / altLabel 충돌)
  전부 음성. 유일 후보 `gr-well-formed-skill ↔ ins-well-formed-skill`조차 `alternativeOf`로
  묶으면 영역당 1-admit이 capability 제공자를 탈락시켜 **phantom gap이 실제 팩에 나타남**(실측)
  → `overlapsWith`로 강등이 맞다.
- **가중 anchor 근거 없음**: 다중 태그 노드 17/117(최대 3개), 그중 6개는 chain 제약상 부적격,
  부수 태그 제거 반사실 팩 diff는 3–5% 자리바꿈뿐, 결정적으로 **`anchorConfidence`를 읽는 코드가
  0줄**이다. 지금 저작하면 소비자 없는 장식이 된다.
- **결정 4 보강**: 案 A(허브 2개 아래 중간층 9 + broader 22 재지정)의 retrieve ripple은
  **12질의 중 0/12**로 사실상 무료다. 즉 판단 기준은 성능이 아니라 **"내용 구분이 실재하는가"**.
  또한 AV W1 lane에서 `c-operating-envelope` 서브트리가 land되며 **깊이 2 선례가 이미 생겼다**
  (Concept 42→68, broader 31→56) — 계층화는 이미 시작된 셈이라 案 A는 그 연장선이다.

## 5. (신규) `overlapsWith` 후보 2쌍을 저작할 것인가

실측이 찾은 부분 겹침 2쌍. 저작해도 팩 배제는 일어나지 않는다(`overlapsWith`는 1선별 트리거가
아님) — 얻는 것은 "관계 없는 근사중복"과 구분되는 명시 관계, 잃는 것은 검증되지 않은 관계의
추가.

- **(a) 2쌍 저작** — 메커니즘이 실물 하나 없이 남는 상태를 해소(첫 실사용 사례).
- **(b) 저작 안 함** — 실익이 팩에 나타나지 않으므로 유예.

## 6. (신규) `AlternativeOfSharedAnchorShape` 강화 여부

실측 지적: 이 shape는 **태그 1개 공유만** 보므로 정의 유사도 0.000인 쌍도 통과한다(허브 태그
하나로 820쌍 통과). 지금은 `alternativeOf` 사용이 0이라 무해하지만, 첫 저작 시 게이트가
잘못된 저작을 막아주지 못한다.

- **(a) 강화** — 공유 태그 수·정의 유사도 하한 등 추가 조건(첫 alternativeOf 저작 전에).
- **(b) 현행 유지** — 사용 0인 동안은 비용만 발생하므로 실사용 시점으로 미룸.

---

## 사용자 피드백
1. (a)
2. (a)
3. (a)
4. (a)
- annotation이 42line 지식단위 block 이고 anchor가 지식단위 block들을 시스템 및 지식에 따라 구조적으로 정리 및 연결하는 skeleton으로 연결된게 맞는지 확인

## 확인 답변 (inspection, 2026-08-28) — 구현이 원 구상과 일치하는가

**핵심은 맞고, 유보 2건이 있다** (둘 다 위 결정 2·4가 정확히 그 잔여를 다룬다):

- **annotation = 42-line 지식단위 block ✓**: block은 그래프 노드의 텍스트
  (`ho:promptText`+`skos:definition`)로 구현됐고, 크기는 **cap 260 token(chars/4) ≈ 42-line
  등가**를 `lint_uniformity.py`가 커밋 게이트로 강제한다(권장 대역 130–260). 같은 지식을
  다르게 설명하는 block들은 `ho:alternativeOf`(대칭)로 상호 연결되고, 투영(`retrieve.py`)은
  **anchor 영역당 1개만** 실어 중복이 노이즈가 되지 않는다 — 원 구상의 "중복 설명 허용 +
  구조적 구분"이 그대로.
- **anchor → skeleton 연결 ✓**: 모든 block은 `ho:tagged`(crisp anchor)로 **Concept
  backbone(`id:scheme`의 SKOS 스킴 = 원 구상의 skeleton)** 에 연결되며, 이 연결은 선택이
  아니라 **anti-orphan 검증이 강제**한다(연결 없으면 validate FAIL). 확률적 연결은
  `ho:Anchor`(`anchorTarget`+`anchorConfidence` 0..1)가 담당 — "확실한 구조적 위치 + 확률
  가중"의 이중 구조가 원 구상과 일치.
- **유보 1 — skeleton의 계층**: 현행 backbone은 실측 깊이 1(평면)이라 "시스템 및 지식에 따라
  구조적으로 **정리**"의 계층(layered) 부분은 아직 얕다 → **결정 4-(a)** (B-wave 계층화)가
  이 잔여를 채운다.
- **유보 2 — block이 그래프 밖 텍스트일 때**: 편집기 평면(설계 문서 산문)의 block과 그래프
  개체를 잇는 anchor는 **결정 2-(a)** 에 따라 그래프 밖 링크 스토어가 담당한다 — 그래프 안
  skeleton(개념 backbone)과 편집기 링크 평면은 **별개 층**이고, 후자가 전자의 IRI를 종단점으로
  참조하는 구조다.

> 처리 노트: 결정 1·2·3·4의 적용 착수 허가 신호는 이 항목의 `status: open → approved` 태깅이다
> (README 규약 — 답변 기재만으로는 orchestrator가 착수하지 않는다).

## 사용자 피드백 2 (2026-08-28)
5. **(a)** — 2쌍 저작.
6. **(b)** — 실사용 시점으로 미룸.
§7(facet 설계)은 inspection 권고대로 진행.

## 처리 기록 (inspection, 2026-08-28)
- **결정 5-(a) 실행 스펙** (orchestrator → developer micro dispatch): edge 2개만 추가 —
  `id:gr-well-formed-skill ho:overlapsWith id:ins-well-formed-skill`(공유 `c-skill-authoring`)
  · `core:chan-peer ho:overlapsWith core:pat-peer-mesh`(공유 `c-multiagent`). 개체 신설 0,
  §3 순서상 관계 그룹(item 5) 위치. 게이트: validate PASS + `overlapsWith`는 1선별 트리거가
  아니므로 **retrieve 팩 byte-identity 유지**(회귀 확인) + determinism PASS.
- **결정 6-(b) 채택 + 게이트 조건**: shape 강화는 실사용 시점으로 미루되, **"첫
  `ho:alternativeOf` 저작을 포함하는 모든 브리프는 `AlternativeOfSharedAnchorShape` 강화(공유
  태그 수·정의 유사도 하한)를 선행 항목으로 포함해야 한다"** 를 게이트로 기록. 부수: B-wave
  **B3**(region 정의의 facet 필터화)가 이 강화의 상당 부분을 구조적으로 해소하므로, B3 land
  후에는 잔여 강화 필요성을 재평가한다.
- **§7 채택 내역**: `inquiries/b-wave-facet-design.md` §7에 확정 기록 (요지: facet 5개 유지
  scope 포함 / 판단 3건은 초안 배정 / B2=27개 한정 / **B1 선행 land 후 B2 별도 wave**).

---

## 적용 결과 (orchestrator 기록, 2026-08-28)

- **결정 1-(a) 병행 착수 / 2-(a) `ontology/` 밖 링크 스토어 — 착지·판정 완료.**
  산출: `tools/plane-editor/link-store/links.json`(단일 파일, 결정론적 정렬) +
  `check_links.py`(8개 검사 축) + 설계결정 평면(`decisions.json`) +
  `run-link-checks.mjs`. vnv 판정 **pass-with-notes** — `docs/verify/plane-editor-phase2-verify.md`.
  - 링크 어휘는 기존 `ho:` 관계 5종 재사용(신조어 0). 이름만 빌린 것이 아님을 **TBox 사본을
    변형해 반증 시험**(술어를 AnnotationProperty로 강등 → FAIL, `ho:supersedes` 신설 →
    B9 경계 FAIL). 원본 `ontology/` 무접촉.
  - **cap 계약 표면 실증**(Phase 4 이중 구현 금지 조항의 선이행): 격리 도구층에서 cap을
    260→40으로 바꾸자 편집기 수용 경계가 1043자→163자로 따라 이동, 추정기를 //8로 바꾸자
    계약이 따라옴. 편집기 코드에 `260`·`/4` 리터럴 0건 = 값 복제 아님.
  - negative control: 요구 5종 + developer 추가 3종 + vnv 창안 우회 27케이스 전부 차단,
    정상 대조군은 통과(vacuous 아님).
  - 잔여 결함 F1(medium): 검사기가 자기 STORE_VERSION을 남의 주석 스토어(v2)에도 적용해
    실사용 스토어를 물면 exit 2 → **바인딩 준비 wave에서 해소 중**.
- **앵커 lane(1-(a)의 차단 조건 C1)**: C1 → C1b로 두 차례 강화해 오해소 구멍 4종을 닫았다
  (`docs/verify/plane-editor-c1-verify.md`, `plane-editor-c1b-verify.md`). 판정 축을 문자열
  유사도에서 **CRDT item 정체성**으로 옮긴 것이 핵심. 바인딩 차단은 **(b) 조건부 해제** —
  조건 3건(문서 정체성 바인딩 / 저장소 계약 무결성 / 끊긴 종단점 가시화)을 해소하는 wave가
  진행 중이며, 그 판정이 최종 해제 여부를 정한다.
  - **원리적 제약 1건이 사용자 결정으로 올라감**: 블록 이동 복구와 재타이핑 거절은 동시
    만족 불가(두 편집의 Yjs 업데이트가 byte 동일) → `docs/feedback/anchor-move-recovery-tradeoff.md`.
- **결정 3-(a)**: 채널 규약 문서(`verified/README.md`)는 inspection 소유라 조사 lane으로
  요청 등록 — `docs/feedback/inquiries/verified-lane-vocabulary-promotion.md`(status: open).
- **결정 4-(a)**: B-wave 착수. 설계는 "깊이를 늘리지 않고 facet 선언 속성"으로 확정되어
  별도 항목 `b-wave-backbone-layering.md`(approved, "(B) → (A)")로 이관됐고 **B1 진행 중**.
  B2·B3는 B1 게이트 통과 후 다른 세션이 인수하기로 합의됨.
- **결정 5·6은 여전히 미응답**이다(overlapsWith 저작 / shape 강화 방식). 특히 6은 승인 문구가
  "정의 유사도 하한"인데 이 lane 실측이 그 축의 실패를 보였으므로, B1 facet 시뮬레이션을
  근거로 **facet 공유 대안**을 다시 묻는 항목이 B3 착수 시 올라온다.

### 결정 5·6의 종결 경위 (orchestrator 기록, 2026-08-28)

**이 항목의 답변란에는 5·6에 대한 답이 없다** — 두 결정은 나중에 만들어진 다른 항목에서
닫혔다. 감사 추적을 위해 경위를 남긴다.

- **결정 5(`overlapsWith` 2쌍 저작 여부) → `a-wave-annotation-content.md` 결정 1 = (a)**
  로 종결. 그 항목이 "이 결정이 `plane-editor-and-kg-content-decisions.md`의 미응답 결정 5를
  함께 닫는다"고 명시한다. 결과: **vnv 실측 2쌍만 저작**(43쌍 기준 불채택 — 술어 의미와
  어긋나 드리프트를 그래프에 새기는 위험). 실행은 다른 세션의 소규모 3건 묶음에 포함.
- **결정 6(`AlternativeOfSharedAnchorShape` 강화 방식) → `region-discriminator-recheck.md`
  질문 1 = (a)** 로 종결: **facet 공유로 충족된 것으로 보고 유사도 하한은 넣지 않는다.**
  즉 shape는 B3의 판별 facet(anatomy·method) 기반 region 정의를 그대로 쓰고 **현행 유지**다.
  - 이 결론은 이 lane의 실측과 같은 방향이다: 편집기 앵커에서 `Critical failure`→`Cure`
    교체가 "가운데 삭제"와 **문자열상 구분 불가**임이 측정돼, 유사도 축으로는 오부착을 막을
    수 없다는 것이 확인됐다. 같은 함정을 그래프 shape에 이식하지 않게 됐다.

향후 이 항목을 읽는 사람은 5·6의 답을 여기서 찾지 말고 위 두 항목을 볼 것.

### 앵커→링크 바인딩 완료 (orchestrator 기록, 2026-08-29)

**결정 1-(a)의 차단 조건이 전부 해소되고 바인딩이 실사용 판정을 받았다** —
`docs/verify/plane-editor-binder-failclosed-verify.md` = **(a) 실사용 가능, 조건 0개**.

경로: C1 → C1b → 바인딩 준비(조건 3) → 강화 N-1~N-4 → 불변식 I-1~I-3 → 게이트·편집기 동치
성질 → 문서 축 fail-closed → 어휘 파생 → **바인딩** → 바인더 fail-closed. 판정 9회 전부
pass-with-notes였고, 매 라운드 **차단 조건이 5 → 3 → 2 → 1 → 0으로 수렴**했다.

- **바인딩이 실제로 동작한다**: 링크가 문서 위치를 가리킨다(예: `doc-sample-state` `[303,316)`
  = "honest orphan"). **위치는 저장이 아니라 파생**임을 증명했다 — 문서 앞에 28자를 넣고
  다시 바인딩하면 좌표가 정확히 +28 이동하고 텍스트는 불변이다(링크가 selector 사본을
  들었다면 깨지는 검사).
- **오부착 0**: 19 시나리오 × 3레인 342 레인측정에서 `wrong` 0, 적대 프로브 전 계열에서
  일상 경로 오해소 0. 남은 부착은 전부 **선언된 신뢰 경계 바깥**(스토어 파일에 직접 쓰는
  주체의 위조)이다.
- **정지 규칙이 작동했다**: 매 라운드 새 우회가 나왔지만 (가) 일상 경로 / (나) bearer-claim
  경계로 분류시키고 **차단 사유를 (가)로만 한정**해 무한 회귀를 끊었다. 9차 라운드에서
  (가) CONFIRMED가 **0건**이 됐다 — 단 이는 **그 라운드가 측정한 모양 집합에 대한 것**이고,
  10차에서 새 축(훑기 제외 디렉토리 이름)으로 2건이 더 나왔다(무회귀·비차단). 수렴은
  "결함이 없다"가 아니라 **"차단 조건이 0이고 남은 것이 개선"** 이라는 뜻이다.
- **성질(property)이 열거를 대체했다**: "게이트 accept ⟺ 편집기 `loadStore` 성공"을 코퍼스
  전수에 걸어, 이후 변종이 자동으로 잡힌다. vnv가 "성질이 자기 재계산 아닌가"를 되물어
  편집기 쪽을 진짜 `loadStore`로 바꾸게 만든 것이 이 lane 최대의 교정이었다(대조 1 → 43).
- **어휘는 그래프에서 파생한다**: 중앙 재설계로 `ho:alternativeOf`·`ho:overlapsWith`가 폐기돼
  게이트가 red가 됐을 때, 검사를 고치지 않고 **어휘의 출처**를 고쳤다. 이제 그래프에 어휘가
  추가되면 쓸 수 있게 되고 은퇴하면 위반이 된다(양방향 실측).
- **미결(사용자 결정 대기)**: 링크 평면 가중 도입 여부(`link-plane-weight-decision.md`),
  앵커 이동 경로 A/B/C(`anchor-move-path-disambiguation.md`).

#### lane 종료 (11차 판정, 2026-08-29)

`docs/verify/plane-editor-silent-exclusion-verify.md` = **(a) 실사용 유지 · 차단 0 · "이 lane은
여기서 종료해도 된다"**. 마지막으로 닫은 것은 **조용한 제외**다 — 훑기 제외 디렉토리
(`.git`·`node_modules`) 이름으로 스토어를 가릴 수 있고 판정에 흔적조차 없던 자리를,
격리 표식과 같은 규율(판정에서만 빼고 후보로는 모아 문서 닫힘으로 끌어옴 + `skipped[]`로
흔적)로 닫았다. 비용은 값으로 남겼다(게이트 0.35s → 0.39s, +11%).

**11차에서도 새 (가) 3건이 나왔다**(전부 무회귀·비차단): `.git`이 **파일**인 작업공간
(git worktree·submodule)에서 훑기가 소멸하는 축, 제외 트리 안 읽기 불가 스토어의 흔적 0,
sniff 예산에 걸린 스토어의 비대칭. 즉 **"새 결함이 안 나오는 상태"는 오지 않았고**, 올 것도
아니었다 — 종료 근거는 **차단 조건 0 + 남은 것이 전부 개선**이라는 분류이지 무결점이 아니다.

**남은 개선 5건**(차단 아님, 다음에 이 lane을 열 때의 목록):
1. `workspace_root`가 `.git` **파일**(worktree·submodule)을 인정하지 않음 — 훑기 소멸.
2. sniff 실패의 흔적 0 + 제외 트리 밖 읽기 불가 스토어에서 처리되지 않은 `PermissionError`.
3. 중첩 제외 축(`node_modules/pkg/node_modules`)은 코드로만 참이고 **아무 검사도 재지 않음**.
4. `reasons.endpoint`의 범위 한정("게이트가 볼 수 있는 잘못은 없다")이 **텍스트 채널에만**
   실리고 JSON 값에는 없음 — 이번에 문구를 **좁힌 것(약속 축소)**이지 진단을 늘린 것이 아니다.
5. `check_links.py`의 "네 경로" vs "세 경로" 자기모순.

**경계 바깥(방어 대상 아님)**: 스토어 파일에 직접 쓰는 주체의 위조(손 기입 정체성·capture
이식·죽은 이름표), sniff 4KB 예산.
