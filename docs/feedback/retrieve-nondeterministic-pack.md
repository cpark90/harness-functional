---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/retrieve.py]
kind: defect
related: [docs/feedback/verified/execution-mode-scope-multiagent.md]
---
# 결함 — 같은 요청이 실행마다 다른 context pack을 준다 (`retrieve.py` 비결정성)

## 증상 (실측)
같은 working tree, 같은 질의로 `tools/retrieve.py`를 **10회 실행 → 산출 10종 전부 상이**(md5 기준).
`PYTHONHASHSEED=0`으로 고정하면 3회 모두 동일. 다른 질의(`"code review harness with tests"`)에서도
3회 3종으로 재현된다. 예산 노드 수(예: 34)는 유지되지만 **동점 노드·엣지 중 무엇이 실리고 어떤
순서로 실리는지가 실행마다 바뀐다** — base-harness candidate 순서, `—[predicate]→` 엣지 줄이 오간다.

## 근본 원인
`tools/retrieve.py`의 정렬이 **점수만** 키로 쓴다 — `:103` `scored.sort(key=lambda x: x[1], reverse=True)`,
`:177`·`:185`의 `sorted(..., key=lambda x: x[1] / score_of[x], reverse=True)`. 동점(relevance 동일)일 때
순서는 입력 리스트 순서 = set/dict 순회 순서로 결정되고, 그 순회는 URIRef **문자열 해시 랜덤화**에
좌우된다. 그 뒤 예산 캡이 앞에서부터 잘라내므로, tie 그룹 경계에서 **어떤 노드가 팩에 들어갈지가
프로세스마다 달라진다**.

## 왜 중요한가
1. **context-rot 방어의 재현성**: CLAUDE.md 골든룰은 "요청 → 예산 캡 팩으로 작업"이다. 같은 요청이
   매번 다른 컨텍스트를 주면 에이전트 행동이 재현되지 않고, 팩 기반 판단의 감사가 불가능하다.
2. **검증 방법의 무효화**: inspection의 파급효과 검증은 `retrieve` 투영 비교를 쓴다. 시드를 고정하지
   않으면 **무영향 편집이 유의미한 diff로 보인다** — 이번 execution-mode 범위 한정 검증에서 실제로
   그렇게 오판할 뻔했고, 시드 고정 후에야 "완전 동일"이 드러났다.
3. `materialize.py`는 결정적(byte-identity 회귀 테스트 존재)인데 그 **쌍대인 read projection만
   비결정적**이라 두 투영의 보증 수준이 어긋난다.

## 제안 (developer dispatch 범위)
- 세 정렬 지점에 **안정적 2차 키**를 추가: `key=lambda x: (-score, str(node_iri))`. 동점은 IRI 사전순으로
  고정 — 의미 변화 없이 재현성만 확보.
- 회귀 가드: 같은 질의를 2회 실행해 산출이 동일한지 확인하는 체크(예: `validate.py`와 같은 층의 스모크,
  또는 CI 한 줄)를 두면 재발이 잡힌다. `materialize`의 byte-identity 게이트와 같은 성격.
- 범위 밖(별도 판단): 동점을 **어떤 순서로 우선**할지의 정책(IRI순 vs maturity vs tokenEstimate)은
  검색 품질 문제다. 이 항목은 "재현 가능해야 한다"까지만 다룬다.

## 판단 필요
승인하면 orchestrator가 developer dispatch로 위 수정을 적용한다. 승인 시 `status: open` → `approved`.
