# retrieve — one telling per region (`ho:alternativeOf` 선별)

승인 계획 ③. `tools/retrieve.py` 단일 파일에 "대안 클러스터당 pack 1개만 admit" 규칙 추가.
브리프 `docs/feedback/inquiries/retrieve-alternative-selection-brief.md`. 그래프 무접촉.

## 구현 자리 = `traverse()` pop 직후, `token_cost` **앞**

```python
region = clusters.get(node)
if region is not None and region in taken_regions:
    done.add(node); continue          # 예산 차감 전 → 탈락분 0토큰
...
admitted.append(...); used += cost
if region is not None: taken_regions.add(region)
```
- **seed·traversal 분기 불필요**: seed도 같은 heap을 pop하므로 훅 1개가 둘 다 덮는다.
- **`done.add`가 예산-skip과 갈리는 지점**: 예산 skip은 `done`에 안 넣는다(나중에 들어올
  수 있어서). 대안 탈락은 **영구**(승자는 pack을 떠나지 않는다) → `done`에 넣어 재pop·
  이웃 push를 끊는 게 맞다. `done`은 pop 중복·이웃 push에만 쓰이고 `in_scope`는
  `admitted`에서 파생되므로 부작용 없음.
- 승자 = 새 키 없이 **먼저 pop된 노드**. heap 키는 `(-score, str(n))`이고(=`_rank_key`와
  달리 maturity 없음 — 브리프 표현과 미세 차이, 주석은 heap 키로 정확히 적었다), pop은
  score 비증가라 승자는 자동으로 그 region의 최고 relevance 텔링이 된다.

## 클러스터 = raw edge의 무향 연결 성분

`ho:alternativeOf`는 `owl:SymmetricProperty`지만 **prp-symp 의존 금지**: `retrieve.main()`은
`reason=True`라 지금은 역방향이 있지만 `webui`/테스트/미래 경로가 `reason=False`로 부르면
규칙이 조용히 단방향이 된다. 코드에서 양끝을 다 넣는다(비용 0).
- 결정성: 성분 키 = 성분 내 **최소 IRI 문자열**, 시작점 순회는 `sorted(adj, key=str)`.
  → set 순회 순서가 결과에 새지 않는다(G5). PYTHONHASHSEED 4종에서 승자 동일 실측.
- a→b, c→b 한 방향 저작이 **하나의 3-노드 성분**으로 묶이는지가 무향성의 실측 증거.
- `alternativeOf`는 `link_predicates`(모든 `ho:` ObjectProperty)에 자동 포함이라 adjacency에
  weight 0.5로 이미 참여했다 — 별도 등록 불필요. 같은 성분의 두 노드는 절대 동시 admit이
  안 되므로 `pack["edges"]`에 alternativeOf 엣지가 뜰 수 없다(탈락 힌트 누출 0).

## v1 잔여: 탈락 대안이 `pack["seeds"]`에는 남는다

선별 지점이 admission(=traverse)이라 **entry-point 단계**인 `select_seeds`는 그대로다 →
JSON pack의 `seeds[]`에 탈락 텔링 **라벨**이 남는다(md 렌더러는 seeds를 안 그린다, IRI는
B18 이후 어디에도 없다). seeds에서 미리 거르면 `MAX_SEEDS` 컷 위치가 바뀌어 pack 멤버십이
달라진다(브리프 범위 밖) → 고치려면 별도 결정 필요.

## 회귀 증명 2종 (이 패턴은 read-only 도구 변경에 재사용)

1. **byte-identity vs HEAD**: `git show HEAD:tools/retrieve.py > scratch/orig.py` 후
   `PYTHONPATH=<repo>/tools`로 실행(flat `import ontology_lib`이 scratch에서도 풀린다) →
   현행 그래프(alternativeOf 0-edge)에서 md·json 모두 `cmp` 동일. **0-edge 무영향 증명**.
2. **주입 smoke + 대조군**: `lib.load_graph(reason=False)`에 합성 노드 3개(공통 concept
   `ho:tagged` + 고유 nonsense 질의어로 실그래프와 격리) 주입 → 링크 有 1개/링크 無 3개,
   budget_used 40 vs 120. **대조군 없이 "1개 나왔다"만 보면 vacuous pass**를 못 거른다.
