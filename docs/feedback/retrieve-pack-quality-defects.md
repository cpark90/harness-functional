---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/retrieve.py, ho:tokenEstimate, core:oa-inspection-external, core:pat-sub-agents]
kind: defect
related: [docs/feedback/retrieve-nondeterministic-pack.md, docs/plans/OPEN-ISSUES.md]
---
# 결함 2건 — context pack이 조용히 잘리고, 폐기 노드가 후계보다 위에 온다

결정성 결함(`retrieve-nondeterministic-pack.md`)을 land한 뒤 품질 축 감사(OPEN-ISSUES §C)를
돌리다 실측으로 확인한 **별개의 두 결함**이다. 둘 다 에러를 내지 않고 **조용히** 팩 품질을
떨어뜨리므로, "팩에서 작업하라"는 골든룰의 신뢰도에 직결된다.

---

## 결함 A — `ho:tokenEstimate` 의미 과부하가 팩을 조기 절단한다

### 증상 (실측)
```
retrieve.py "what does the inspection agent observe"
  → nodes=3, budget_used=125/900     ← 예산 775토큰이 남았는데 탐색이 끝남
retrieve.py "agent observation space and cognitive capacity"
  → nodes=41, budget_used=888/900    ← 정상
```

### 원인
`ho:tokenEstimate`가 **두 가지 다른 의미**로 쓰인다.
1. **노드 텍스트의 크기** — `retrieve.py:129 token_cost()`가 "이 노드를 팩에 넣는 비용"으로 읽는다.
2. **한 추론에서 실제 관측되는 입력의 크기** — TBox의 `ho:AreaOfObservation` definition이
   "the realized size it contributes to one inference"로 정의하고, 합이
   `ho:cognitiveCapacity`에 들어가야 한다고 규정한다.

그래서 `id:oa-inspection-external`의 `tokenEstimate 12000`은 (2)의 의미인데 `token_cost()`는
이를 (1)로 읽는다. `traverse()`는 `used + cost > budget and admitted` 이면 **break**하므로,
프론티어에 이런 노드가 한 번 뜨면 **예산이 한참 남아도 탐색 전체가 그 자리에서 끝난다**.
추적 결과: `BREAK at oa-inspection-external cost=12000 used=101 remaining=799`.

**기본 예산(900)보다 큰 `tokenEstimate`를 가진 노드 10개** — 전부 AreaOfObservation:
`oa-inspection-external`(12000) · `oa-orchestrator-external`(9000) · `oa-synthesizer-external`(8000) ·
`oa-developer-external`(6000) · `oa-vnv-external`(5000) · `oa-orchestrator-internal`(2000) ·
`oa-{vnv,synthesizer,inspection,developer}-internal`(각 1500).
이 10개는 seed가 아닌 한 **어떤 기본 예산 팩에도 절대 들어갈 수 없고**, 프론티어에 뜨는 순간
그 팩을 잘라 먹는다.

### 선택지 (결정 필요)
- **(A) 소비자 측 수정** — `traverse()`가 예산 초과 노드를 만나면 break 대신 **skip**(continue)하고
  다음 후보를 계속 본다. 한 줄 수준 변경, 온톨로지 무변경. 다만 "이 노드는 팩에 못 담는다"는
  사실은 그대로다.
- **(B) 어휘 분리** — 관측량을 별도 프레디킷(예: `ho:observedTokenVolume`)으로 옮기고
  `ho:tokenEstimate`는 "노드 텍스트 비용"만 뜻하게 한다. 의미가 깨끗해지지만 TBox·shapes·
  abox 10노드·`materialize`/`validate` 소비자 동반 수정(=developer dispatch 1라운드).
- **(C) A+B 둘 다** — 어휘를 분리하고, 그와 별개로 traverse의 break를 skip으로 고친다(방어).

inspection 권고: **(C)**. (A)만으로는 `tokenEstimate`가 두 의미를 겸하는 drift가 남고, (B)만으로는
앞으로 큰 텍스트 노드가 생겼을 때 같은 조기 절단이 재발한다.

---

## 결함 B — deprecated 노드가 후계 노드보다 상위 랭크로 팩에 실린다

### 증상 (실측)
```
retrieve.py "multi-agent harness that spawns short-lived sub-agents"
  ### DesignPattern
  - **Sub-agents** (rel 8.1) — ... DEPRECATED: superseded by id:mode-sub-agents ...
  ### ExecutionMode
  - **Sub-agent spawn mode** (rel 6.3) — ...
```
폐기된 `id:pat-sub-agents`가 **relevance 8.1로 팩 전체 1위**, 그 후계인 `id:mode-sub-agents`는
6.3으로 아래에 온다.

### 원인
`retrieve.py`에 **`ho:maturity`를 읽는 코드가 한 줄도 없다**(`grep -n deprecat tools/retrieve.py` → 0건).
폐기 사실은 `skos:definition` 산문 안의 `DEPRECATED:` 관용 문구로만 존재해서, 팩에는 **구조화된
필드가 아니라 문장**으로 실린다. 팩만 읽고 조립하는 에이전트(=이 repo가 의도한 사용법)는
폐기 부품을 최상위 후보로 보게 된다.

`ho:maturity "deprecated"` 노드는 현재 3개(`pat-sub-agents`·`pat-agent-teams`·`pat-hybrid`)이고,
**개체로부터의 inbound 참조는 셋 다 0**이다(그래프 정합성은 문제 없음 — 랭킹만 문제).

### 선택지 (결정 필요)
- **(A) 랭킹 강등** — `deprecated`에 점수 배수(예: ×0.2)를 곱한다. 검색은 되지만 뒤로 밀린다.
- **(B) 표시 마킹** — 팩 렌더에 `(deprecated)` 배지를 붙인다(랭킹 불변). 최소 변경.
- **(C) 기본 제외** — 기본 팩에서 빼고 `--include-deprecated`로만 노출.

inspection 권고: **(A)+(B)**. (C)는 "왜 그 부품을 쓰면 안 되는지"를 감추어, 같은 근사 동의어를
다시 만드는 drift를 오히려 부른다. 이 항목은 OPEN-ISSUES §B.2(tie-break 정책)와 같은 지점을
건드리므로 **함께 결정**하는 편이 좋다.

---

## 근거 (재현 명령)
```bash
/usr/bin/python3 tools/retrieve.py "what does the inspection agent observe" --format json   # nodes=3, 125/900
/usr/bin/python3 tools/retrieve.py "multi-agent harness that spawns short-lived sub-agents" # pat-sub-agents rel 8.1 1위
grep -n "deprecat" tools/retrieve.py                                                        # 0건
```

## 사용자 피드백
(A) + (B)
