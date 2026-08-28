---
status: approved            # 사용자만 approved로 바꾼다
targets: [ho:overlapsWith, ho:alternativeOf, ho:Anchor, ho:anchorConfidence, ontology/abox/core/vocab/concepts.ttl]
related: [docs/feedback/inquiries/a-wave-candidate-survey.md, docs/verify/kg-content-candidates.md, docs/feedback/plane-editor-and-kg-content-decisions.md, docs/feedback/b-wave-backbone-layering.md]
---
# A-wave — annotation 내용 저작 (무엇을 실제로 KG에 넣을 것인가)

승인된 backbone+annotation 항목의 **메커니즘은 섰고 내용은 비어 있다**(TBox·린터·retrieve는
land, ABox는 alternativeOf/overlapsWith/Anchor 전부 0건). 그 공백을 메울 후보를 **독립적으로
두 번** 탐색했고, 이제 **무엇을 저작할지**에 대한 사용자 결정이 필요하다.

- inspection 탐색: `inquiries/a-wave-candidate-survey.md`
- vnv 독립 실측: `docs/verify/kg-content-candidates.md` (HEAD 핀 worktree, 저작 0)

## 두 실측이 **일치**하는 것 (결정 불요 — 근거 확정)

- **`alternativeOf`에 넣을 진짜 대안쌍은 0건**이다. 서로 다른 4~4개 탐색법이 모두 음성이었다.
  KG의 그 공백은 방치가 아니라 **증거가 지지하는 정답**이다.
- **`Anchor`+`anchorConfidence`도 지금은 0건이 맞다.** vnv 실측: 다중 태그 노드가 17/117뿐이고
  부수 태그를 뺀 반사실 팩 차이는 3–5% 자리바꿈에 불과하며, 결정적으로 **`anchorConfidence`를
  읽는 코드가 0줄**이다. 지금 저작하면 소비자 없는 장식이 된다.

## 두 실측이 **갈리는** 것 — `overlapsWith` 43쌍 vs 2쌍

| | inspection (43쌍) | vnv (2쌍) |
|---|---|---|
| 무엇을 쟀나 | 정의 안에 **"Distinguished from / Distinct from / Contrast"** 로 다른 개체를 명시 대조한 곳 | **공유 태그(shape 자격) ∧ 정의가 실제로 겹치는** 쌍 |
| 성격 | 저자가 인지한 **혼동 인접성** | **설명 영역의 실제 교집합** |
| 결과 | 43쌍 | `gr-well-formed-skill ↔ ins-well-formed-skill`(공유 `c-skill-authoring`) · `chan-peer ↔ pat-peer-mesh`(공유 `c-multiagent`) |

**inspection 정정**: 제가 앞서 43쌍을 "A-wave의 실제 수확물"이라고 쓴 것은 **과했습니다**.
`ho:overlapsWith`의 뜻은 *설명 영역이 겹친다*인데, "Distinguished from X"는 **차이 진술**입니다
(실제 문장 확인: `pat-blackboard`는 "…MEDIUM을 제약하지 ordering을 제약하지 않는다"라며
**다름**을 말합니다). 반면 vnv의 2쌍은 정의 문장이 실제로 겹칩니다(`chan-peer`/`pat-peer-mesh`
둘 다 "각자가 일·요청·판정·결과를 상대에게 직접 보낸다"를 서술). **술어 의미에 충실한 것은
vnv의 기준**이고, 제 43쌍은 *다른 것*을 잰 유용한 별개 자산입니다.

## 결정 요청

**결정 1 — `overlapsWith` 저작 범위** *(이 항목이 `plane-editor-and-kg-content-decisions.md`의
미응답 **결정 5**를 함께 닫습니다)*
- **(a) vnv 2쌍만 저작** ← **inspection 권고**. 술어 의미에 충실하고, 개체 신설 0,
  `overlapsWith`는 1선별 트리거가 아니라 **팩 byte-identity 유지**로 회귀 위험도 없다.
- (b) 43쌍 전부 저작 — 술어 의미와 어긋나 **드리프트를 그래프에 새기는** 위험.
- (c) 지금은 저작하지 않음.

**결정 2 — 43쌍(혼동 인접성)을 어떻게 둘 것인가**
- **(a) 저작하지 않고 필요할 때 정규식으로 재측정** ← **권고**. 소비자가 없는 상태에서 43엣지를
  넣는 것은 `anchorConfidence`를 지금 넣지 말자는 판단과 **같은 기준**이다.
- (b) 전용 술어를 신설해 표현 — 근사동의어 증식 위험.
- (c) **린터 규칙으로 전환**: "정의가 `id:X`를 대조하면 X가 실재하는지" 검사(산문↔그래프 동기화).
  저작 없이 값을 얻는 중간안 — 원하시면 별도 소규모 항목으로 올리겠습니다.

**결정 3 — `c-X ↔ gr-X` 쌍둥이 7쌍 정의 축약** (A2)
- **(a) 승인** ← **권고**. 유사도 0.56~0.90인 7쌍(`report-over-prompt`·`bounded-context`·
  `least-privilege`·`simplicity`·`root-cause`·`controlled-vocabulary`·`verify-proceed`)의
  중복 문장을 걷어내 Concept=원리, Guardrail=명령으로 분리. 실측상 두 노드가 팩 **1·2위에
  나란히** 실리고 예산이 896/900이라, **약 225토큰(기본 예산의 25%)** 이 회수된다.
  노드·엣지 증감 0, 위험은 정의 텍스트 변경뿐.
- (b) 보류 — 나머지 9쌍처럼 자연 분화될 때까지 둔다.

**결정 4 — `Anchor`/`anchorConfidence` 연기 확인**
- **(a) B-wave 이후로 연기** ← **권고**(두 실측 일치). B-wave가 region 변별력을 세운 뒤
  재평가한다. 그때까지 `anchorConfidence` 소비 코드도 함께 검토.
- (b) 지금 저작.

## 순서 메모

결정 1·3은 **B-wave와 독립**이라 즉시 dispatch 가능하다. 다만 결정 3은 `vocab/concepts.ttl`을
건드리므로 B1(facet 선언)과 **같은 파일**이다 — orchestrator가 두 작업을 한 브리프로 묶거나
순서를 정할 것. 결정 4는 정의상 B-wave 이후다.

## 사용자 피드백
1. (a)
2. (a)
3. (a)
4. (b)
