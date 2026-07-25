---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/materialize.py, core:h-harness-factory, core:h-workspace-synthesis, core:h-peer-mesh, core:h-multiagent, core:gr-integration-coherence]
kind: defect
related: [docs/plans/disambiguation-audit.md, docs/plans/OPEN-ISSUES.md]
---
# 결함 — 온톨로지 내부 IRI(`id:` / `ho:`)가 **생성된 하네스 문서에 그대로 새어 나간다**

## 증상 (실측)
`materialize.py`로 7개 하네스를 scratch에 빌드해 산출 `CLAUDE.md`를 grep한 결과:

| 하네스 | 산출 CLAUDE.md의 `id:`/`ho:` 노출 |
|---|---|
| `h-peer-mesh` | **10** |
| `h-harness-factory` | **9** |
| `h-workspace-synthesis` | **7** |
| `h-multiagent` | **1** |
| `h-coding` · `h-research` · `h-support` | 0 |

예 (`h-multiagent`의 산출물, "Execution mode" 절):
> …choose **id:mode-agent-teams** instead when the agents must coordinate directly with each other while working.

예 (`h-harness-factory`):
> …prefer connection checks over mere existence checks. Distinct from grounding (**id:gr-grounding**), which links…

## 원인
`skos:definition`과 `ho:promptText`가 **두 청중을 겸한다**.
1. 온톨로지 저자용 — "어떤 이웃 노드와 헷갈리지 말라"는 **disambiguation**(`docs/plans/disambiguation-audit.md`가
   의도적으로 심은 것). 여기서 `id:`/`ho:` 참조는 **옳고 유용**하다.
2. 실행 에이전트용 — `materialize.py`가 이 텍스트를 **그대로**(`str(g.value(gr, HO.promptText))`,
   `{{definition}}` 치환) 산출 문서에 렌더한다. 산출 문서를 읽는 에이전트에게 `id:` 네임스페이스는
   **존재하지 않는 dangling reference**다.

즉 정합성(validate) 문제가 아니라 **투영 계약(projection contract) 문제**다.

전수 스캔: **렌더 대상 텍스트에 내부 IRI를 담은 노드 21개 / 총 50회**.
`chan-peer`(6) · `h-workspace-synthesis`(4) · `chan-task-board`(3) · `h-harness-factory`(3) ·
`h-peer-mesh`(4) · `pat-peer-mesh`(5) · `chan-workspace`(2) · `c-execution-mode`(2) ·
`pat-{sub-agents,agent-teams,hybrid}`(각 2) · `mode-{sub-agents,agent-teams}`(각 1) ·
`gr-integration-coherence`(1, **promptText** — 운영 규칙 문장 안) · `pat-supervisor` ·
`pat-hierarchical-delegation` · `pat-producer-reviewer` · `wf-harness-evolution` ·
`h-multiagent`(2, `ho:` 프레디킷명) · `env-space` · `global-state`.

## 선택지 (결정 필요)
- **(A) 렌더 시 해소** — `materialize.py`가 산출 직전 `id:<slug>` / `ho:<Term>`을 그 노드의
  `skos:prefLabel`(없으면 `rdfs:label`)로 치환한다. 그래프의 disambiguation 가치를 **보존**하면서
  산출물만 자기완결이 된다. 단 기존 산출물의 byte-identity가 깨진다(21노드·50곳 → 순수 문구 개선).
- **(B) 어휘 분리** — disambiguation을 `rdfs:comment`(렌더 안 함)로 옮기고 `skos:definition`은
  자기완결 산문만 담는다. 저작 규약이 명확해지지만 21노드 재저작(developer dispatch)이고,
  `retrieve.py` 팩에서도 disambiguation이 사라진다(팩은 저자용이므로 **손실**).
- **(C) 현상 유지 + `ONTOLOGYSTYLE`에 명문화** — "정의에 IRI를 쓰지 말라"를 [지킴]으로 넣고
  신규 노드에만 적용, 기존 21노드는 그대로.

inspection 권고: **(A)**. 근거 — disambiguation은 **그래프에 남아야 가치가 있고**(anti-drift의
핵심 장치이며 `retrieve.py` 팩의 저자에게 정확히 그 정보가 필요하다), 문제는 **오직 build
projection의 청중**에서만 발생한다. 문제가 생기는 지점에서 고치는 것이 (B)처럼 그래프의 정보를
줄이는 것보다 낫다. (A)를 택하면 `ONTOLOGYSTYLE`에는 "정의의 IRI 참조는 build projection이
label로 해소한다"는 **계약 1줄**만 추가하면 된다.

## 재현
```bash
/usr/bin/python3 tools/materialize.py h-peer-mesh --out /tmp/mat-peer
grep -noP ".{0,60}\bid:[a-z]+-[a-z0-9-]+.{0,40}" /tmp/mat-peer/CLAUDE.md
```

## 사용자 피드백
(B)
