# KG 내용 후보 탐색(pre-wave 실측) 절차 — "저작할 것이 실제로 있는가"

대상 유형: 메커니즘(TBox 술어·shape·도구)은 land했는데 ABox 엣지가 0인 축에 대해
orchestrator가 "저작 wave를 편성해도 되나"를 묻는 선행 dispatch. 판정은 저작 지시가 아니라
**후보 존재 증명/부재 증명**이다. 사례: `docs/verify/kg-content-candidates.md`
(alternativeOf / Anchor+anchorConfidence / skos:broader 계층).

## 0. 병행 세션이 워킹트리를 편집 중일 때 — 반드시 HEAD에 핀 고정

멀티 lane에서는 측정 도중 `ontology/`가 바뀐다(실제로 269→304 individuals, 미등록
`AutonomyTier`가 중간에 유입돼 rsync 복제본 주입 테스트가 통째로 오염됨).
```bash
git worktree add --detach $SCR/wt-head HEAD
/usr/bin/python3 $SCR/wt-head/tools/validate.py     # baseline 확정
```
- 스크립트는 `sys.path.insert(0, $SCR/wt-head/tools)`로 핀 트리의 lib을 쓴다.
- **첫 워킹트리 측정과 핀 측정이 일치함을 보여** 앞선 수치가 오염 전임을 귀속시킨다.
- 주입 테스트도 핀 트리 안에서(케이스마다 `cp` 복원), 끝에 `git status --porcelain` 빈 출력 +
  `worktree remove`. rsync 복제본보다 이쪽이 안전(복제 시점이 중간 상태일 수 있음).
- live 워킹트리는 **rdflib로 abox glob 직접 파싱**해 "in-flight 관측"으로만 별도 보고
  (validate가 FAIL해도 무방 — 게이트가 아니라 관측).

## 1. 후보 탐색은 4방법 + **교차 필터**가 본체

(a) 라벨 축: `validate.py` 클래스 내 중복(0) + **클래스 횡단 exact prefLabel** + 라벨 토큰
Jaccard. (b) 같은 `ho:tagged` 집합 × 동일 클래스 그룹. (c) `definition+promptText` 토큰
Jaccard(불용어 제거·3자 이상). (d) `skos:altLabel` 충돌.

- **각 방법의 오탐 성분을 먼저 이름 붙여라**: 템플릿 라벨(`"Assembly: X section"`,
  `"<Role> internal observation"`)이 same-class Jaccard의 92%를 만든다. `oa-*-internal` 5개는
  정의가 주어만 다른 **파라메트릭 인스턴스**라 J 0.82까지 오른다 — drift가 아니다.
- **결정타는 교차 필터**: shape 자격(태그 공유) ∧ defJ 임계.
  948쌍 → ≥0.30에서 10쌍 → ≥0.50에서 **1쌍**. 분포 통계(median 0.016 / p95 0.075 / p99 0.152)를
  같이 실어야 "≥0.5가 1쌍"이 얼마나 희소한지가 증명된다.
- **"이미 다른 술어로 표현됨"을 반드시 확인**: 동명 13쌍 중 10쌍은 이미 `ho:tagged`,
  `h-peer-mesh↔pat-peer-mesh`는 `appliesPattern`. 미표현 3쌍은 `cap-*`가 태그를 안 갖는
  구조 공백(별건)이었다.

## 2. ★ 이 저장소의 구조적 자격 사실 (반복 재사용)

- **Concept은 `ho:tagged`를 0개 갖는다**(태그의 target이지 subject가 아님). ⇒ `Concept↔Guardrail`
  동명쌍은 `AlternativeOfSharedAnchorShape`를 **원천적으로 통과 못 한다**. 고유사도 상위권이
  전부 이 패턴이므로 이걸 모르면 "후보 많음"으로 오판한다.
- **Anchor 부적격 91/269 노드**: `hasComponent o hasAnchor` chain 때문에 harness의 component가
  아닌 것에는 못 단다 — Concept 42 / DesignPattern 14 / Capability 11 / **Harness 7** / Task 6 /
  Domain 4 / ExecutionMode 4 + 싱글턴 3. 하필 다중 태그 상위군(3태그 6개 중 4개가 Harness)이
  부적격이다.
- 클래스별 태그 커버리지를 한 번 찍어두면(Guardrail 48/48, Role 16/16 vs Capability 0/11,
  WorkflowStep 0/19, Concept 0/42) 자격 판정이 한 방에 끝난다.

## 3. "가중을 도입할 근거" 판정 3요건 (하나라도 부정이면 저작 금지)

1. **모수**: 다중 태그 노드 17/117, 최대 3개. 후보 자체가 없으면 끝.
2. **차등의 실재**: 부수 태그 엣지 1개만 제거하는 **반사실 팩 diff**로 잰다. 여기선 팩의 3–5%
   자리바꿈뿐이고 끌려온 것도 15토큰짜리 허브 개념 자신 → 오탐·미탐 미특정.
   보조로 **부모 엣지 기록형 traversal**을 재구현해 "`ho:tagged` 경유 admit 수"를 세면
   (질의당 0–2) 태그가 랭킹에 거의 기여 안 함이 바로 보인다.
3. **소비자 존재**: `grep -rn "<술어>" tools/*.py`. `anchorConfidence`는 **읽는 코드 0줄**
   (retrieve는 `salience` prior와 상수 0.7 태그 가중만, 1-admit 승자는 `_rank_key`). 저작 효과가
   정의상 0이면 그것만으로 "저작하지 말 것"이 성립한다. 동시에 TBox 정의문의
   "lands in a later stage"가 **거짓이 된 시점**을 doc-lag note로 라우팅.

## 4. shape 강도는 negative control로 반드시 정량화

`AlternativeOfSharedAnchorShape`는 "태그 1개 공유"만 본다 ⇒ `gr-cite↔gr-nodestruct`
(defJ **0.000**)도 PASS, 허브 `c-multiagent` 하나로 **820쌍**이 통과. "게이트가 잘못된 저작을
막아준다"는 가정을 깨고 판정 책임을 저작자에게 귀속시켜야 한다. 태그 미공유 케이스는
**대칭 추론 때문에 violation 2건**으로 보고된다(정상).

## 5. ★ 후보 1개라도 나오면 "저작 시 실해"를 실측한다

유일 후보에 엣지를 실제로 넣고 질의 스위트를 돌려 **팩 결과**를 본다. 여기선
`gr-well-formed-skill ↔ ins-well-formed-skill`에 `alternativeOf`를 넣자 1-admit이 발화해
질의에 따라 승자가 갈리고, capability 제공자(Instruction)가 탈락한 팩에서
`gaps`에 **phantom `Skill authoring and packaging`** 이 실제로 나타났다
(= `retrieve-selection-verify.md` §4가 예고한 결함의 실그래프 첫 재현).
⇒ 판정은 "후보 있음"이 아니라 "`overlapsWith`로 강등"(overlapsWith는 `alternative_clusters`가
안 읽으므로 배제 무해). **승자가 질의 의존이라 방향별로 여러 질의를 돌려야** 이 실해가 보인다.

## 6. 계층화(skos:broader) 案의 파급은 시뮬레이션으로 정량화

in-memory로 案을 구성하고 **12질의 팩 diff**. 실측: 案 A(허브 2개 아래 중간층 9개 삽입,
broader 22 재지정) = **0/12 변화**, 案 B(top 11 위에 facet 3개) = 1/12(추상 facet이 팩에 끼는
노이즈). ⇒ **계층화는 랭킹상 사실상 무료**이므로 판단 기준은 성능이 아니라 "내용 구분이
실재하는가"(사용자 결정)다. `ho:tagged`는 잎을 가리키므로 案 A는 태그 영향 0.
- 1개 그룹만 실제 TTL로 주입해 `validate`/`lint` PASS + 깊이 `{0:11,1:28,2:4}`로 실증하면 충분.
- 신규 Concept은 `ConceptConnectivityShape`의 `sh:or`(inverse-broader)로 통과, `tokenEstimate`·
  `maturity` 불요. 제안 슬러그·라벨이 **미사용**인지 반드시 기계로 확인(동명 관례가 있는 저장소).

## 7. 결론 형식

"저작할 것 / 저작하지 말 것(근거 있는 부정) / 사용자 결정 필요(선택지+각 대가)"로 3분할.
**후보 0이 정당한 결론**이며, 그때는 세 방법 이상의 음성 결과 + 모수 + 임계별 쌍 수를
표로 실어야 "안 찾은 것"과 구분된다.
