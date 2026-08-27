# retrieve 선별 규칙(read projection 코드 변경) 검증 재현 절차

`tools/retrieve.py`에 **admission 규칙**을 추가하는 유형(예: `ho:alternativeOf` 영역당
1-admit)의 판정법. 그래프가 아니라 **투영 코드**가 대상이라 증명축이 다른 검증들과 다르다.
사례: `docs/verify/retrieve-alt-selection-verify.md` (승인 계획 ③).

## 1. byte-identity 격리 — 순진한 HEAD worktree는 **틀린 답**을 준다

멀티-lane 웨이브에서는 워킹트리에 **다른 lane의 ontology 변경이 uncommitted로** 섞인다.
`git worktree add --detach HEAD` 후 그대로 돌리면 diff가 "코드 변경분"이 아니라 "그래프
변경분"을 재고, 실제로 26 nodes vs 37 nodes로 크게 갈린다.

```bash
git worktree add --detach $SCR/head-wt HEAD
rm -rf $SCR/head-wt/ontology && ln -s $REPO/ontology $SCR/head-wt/ontology   # 같은 그래프
cp $REPO/tools/ontology_lib.py $SCR/head-wt/tools/   # 타 lane의 lib 변경도 양쪽 동일하게
rm -rf $SCR/head-wt/tools/__pycache__
```

`ontology_lib.ROOT`가 `__file__` 기준이라 심링크 하나로 "그래프 고정 + 코드만 상이"가 된다.
**anti-vacuous 필수**: 끝나고 worktree를 원래 HEAD로 되돌려(`git checkout -- ontology
tools/ontology_lib.py`) 한 질의만 다시 돌려 **DIFFER가 나오는지** 확인 — 안 나오면 격리가
아무 일도 안 한 것. `PYTHONHASHSEED=0`으로 해시 노이즈 제거(결정성은 별도 게이트에서 잼).
`--format`은 `md|json`만(“markdown”은 argparse 거부).

## 2. 주입 시나리오 — **대조군 2종**이 있어야 vacuous pass가 안 걸러진다

인메모리 주입(`lib.load_graph()` 반환 그래프에 `g.add`)로 저장소 무접촉. 질의어는 실그래프와
절대 안 겹치는 nonsense 토큰(`zzqqregion`), 노드마다 `ho:tokenEstimate` 명시.

- 대조군 A(데이터 제거): 문제의 edge만 뺀 같은 그래프 → 전부 등장.
- **대조군 B(rule-off, 더 강함)**: 그래프는 그대로 두고 규칙 함수만 무력화
  (`R.alternative_clusters = lambda _g: {}`) → 억제 주체가 *데이터*가 아니라 *규칙*임을 증명.
  여기서만 `pack["edges"]`에 해당 술어가 노출되는 것도 같이 보인다.
- **예산 미차감은 산술로**: treatment 55 vs control 135 → Δ80 = 2 × 40 = 탈락분 `token_cost`
  정확히. "1개 나왔다"만 보면 안 되고 Δ가 탈락분 cost와 **일치**해야 skip이 `token_cost` 앞임이 증명된다.
- 꼭 같이 볼 분기: ① **traversal 경유** 탈락분(seed가 아닌 노드도 억제되나) ② **예산-skip이
  region을 선점하지 않는가**(선순위 노드가 cost 초과로 skip되면 다음 대안이 들어와야 정상)
  ③ 이웃 술어(`overlapsWith`)가 트리거가 **아님** ④ reason=True/False 양쪽.
- 함정: 바닥 `Graph()`에 주입하면 `link_predicates`가 TBox에서 파생되므로 **엣지가 0개**가 되어
  traversal이 죽는다(선별·클러스터 단위 테스트엔 무해, 팩 조성 테스트엔 부적합).

## 3. 결정성은 **삽입 순서 × 해시 시드** 2축

`check_determinism.py`는 프로세스 4회일 뿐이고, 대상 술어 인스턴스가 0이면 그 기능에 대해
**vacuous**다. 주입 그래프로 ① `PYTHONHASHSEED ∈ {ambient,0,1,2,3}` ② 같은 triple 집합을
`random.Random(seed).shuffle`로 **6가지 삽입 순서**로 넣기 → 산출 sha256 1종이면 통과.
삽입 순서 독립성이 해시 시드 독립성보다 강한 성질이라 이쪽을 꼭 넣는다.

## 4. 이 유형 특유의 결함 후보

- **탈락분의 구조 엣지 동반 소실**: 탈락 노드를 `done` 마킹하면 이웃 확장이 끊겨, loser만 갖던
  `providesCapability`/`dependsOn`이 팩에서 사라진다 → 예산이 빠듯하면 저장소가 덮는 capability를
  **phantom gap**으로 보고(실측함). shape가 "같은 tagged Concept 공유"만 강제하면 못 막는다.
- **cross-lane doc-lag**: TBox 정의문이 “CONSUMPTION: … lands in a later stage; until then
  declared but unread”라고 써 있는데 이번 코드가 그 stage다 → land 즉시 산문이 거짓. 코드
  lane은 파일 경계상 못 고치므로 **타 lane 라우팅 note**로 낸다.
- `pack["seeds"]` 잔여 누출은 **pre-existing 계열**인지 HEAD 빌드로 먼저 대조 — 예산-skip 때문에
  변경 전에도 미채택 라벨이 실려 있으면 이번 결함이 아니다. `render_markdown`은 seeds를 안 그린다.
- 브리프가 지목한 정렬 키(`_rank_key`)와 실제 admission 키(heap `(-score, str(n))`, maturity 없음)가
  다를 수 있다 — 코드 주석이 정확하면 브리프 쪽 근사 표현으로 판정(무해).
