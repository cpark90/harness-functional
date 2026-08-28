---
status: approved            # 사용자만 approved로 바꾼다
targets: [id:scheme, ho:conceptFacet, ontology/abox/core/vocab/concepts.ttl, CLAUDE.md, docs/CONTRIBUTING-ONTOLOGY.md]
related: [docs/verify/b1-concept-facet-verify.md, docs/verify/b2-b3-region-verify.md, docs/feedback/region-discriminator-recheck.md]
---
# B-wave 후속 2건 — 잔존 35개 확장 여부 + 문서 지연

B1(facet 도입)·B2(내용 태그 보강 27)·B3(region을 판별 facet으로 한정)이 전부 착지·판정
통과했다. 그 결과 남은 두 가지를 올린다. **서로 독립이라 따로 답해도 된다.**

---

## 1. 판별 태그 없는 개체 35개를 어떻게 할 것인가

B3에서 region(=`alternativeOf`가 "같은 영역"이라고 부를 근거)은 **판별 facet(anatomy·method)
공유**로 한정됐다. quality·domain·scope는 노드에 **대해** 말할 뿐 노드가 **무엇에 관한
것인지**를 말하지 않기 때문이다(그 구분이 없어서 `c-multiagent`가 버킷이 됐다).

실측 결과: 태그된 개체 150개 중 판별 태그가 없는 것이 **62개**였고, 승인된 B2(scope 단독
27개)를 끝내 **35개**가 남았다. 대부분 `c-safety` 같은 **quality 태그만 가진 guardrail**이다.
이 노드들로는 `alternativeOf` 선언이 불가능하다(shape이 FAIL). 지금은 **보수적으로 안전한**
상태이지, 잘못된 상태는 아니다.

- **(a) 확장한다** — B2와 같은 방식으로 35개에 내용 태그(anatomy/method)를 1개씩 보강한다.
  얻는 것: 그 노드들도 대안 서술을 선언할 수 있게 된다. 비용: 승인 범위(27) 확장이고,
  태그 추가는 검색 랭킹을 바꾸므로 B2와 같은 전후 팩 비교가 필요하다.
- **(b) 현행 유지 (권고)** — 35개는 그대로 두고, 실제로 대안 서술이 필요해질 때 그 노드만
  태그를 보강한다. 지금 `alternativeOf` 후보가 **0쌍**(A-wave 실측)이므로 서두를 이유가 없고,
  "쓸 일이 생기면 그때"가 이 repo의 날조 금지 원칙과도 맞는다.
- **(c) 부분 확장** — guardrail 25개만 먼저(가장 큰 덩어리), 나머지 10개는 유예.

## 2. 문서 지연 — 새 어휘 규칙이 문서에 반영되지 않았다 (승인 요청)

`CLAUDE.md`의 "Adding vocabulary" 절과 `docs/CONTRIBUTING-ONTOLOGY.md`는 아직
**"연결하지 않으면 `validate.py`가 orphan으로 잡는다"** 까지만 말한다. B1 이후로는:

- 중앙(`id/core/`) 신규 개념은 **`ho:conceptFacet`도 선언해야** 한다.
- 그 실패는 `validate.py`가 아니라 **`lint_uniformity.py`에서 난다**(shape은 값집합만 닫고
  presence는 강제하지 않는다 — 연합 recipe repo의 개념 239개를 죽이지 않기 위한 설계).
- 새 개념의 facet은 임의로 고르는 것이 아니라 **판정 규칙**(ONTOLOGYSTYLE §3의 적용 순서와
  부모 우선 tie-break)을 따른다.

이대로 두면 다음 저자가 "orphan만 피하면 된다"고 읽고 facet 없는 개념을 만들어 린터에서
막히거나, facet을 임의로 붙여 축이 표류한다.

- **(a) 두 문서 모두 갱신 (권고)** — `CLAUDE.md` "Adding vocabulary"에 한 줄,
  `docs/CONTRIBUTING-ONTOLOGY.md`에 규칙 요약. **`CLAUDE.md`는 운영 규약 문서라 사용자
  승인 없이는 손대지 않으므로 이 항목의 승인이 곧 그 허가다.**
- **(b) `CONTRIBUTING-ONTOLOGY.md`만 갱신** — `CLAUDE.md`는 그대로 둔다.
- **(c) 유예** — B-wave 전체(A 확장 포함)가 끝난 뒤 한 번에 정리.

---

## 사용자 피드백
1. (a)
2. (a)
