# harness-repo-survey Wave 1 — coordination pattern coverage (wshobson)

**결과: 신규 1 (`id:pat-blackboard`).** 나머지 wshobson orchestrator는 전부 기존 15 패턴/3 모드에 매핑.

## reuse-first 매핑 (16 orchestrator류 → 기존)
- full-stack-feature / feature-development / full-review / ship-mate / conductor = 단계형 파이프라인 + **파일-state 핸드오프**(신규 아래).
- multi-agent-optimize = fan-out/fan-in(도메인별 프로파일링 에이전트 병렬→aggregate).
- multi-agent-review = expert-pool(동적 라우팅 route_agents) + fanout-fanin + synthesis.
- team-lead / team-feature = orchestrator-workers(**exclusive file-ownership 경계**=least-privilege 이미 def에 있음) + mode-agent-teams; blockedBy/blocks=Deliverable DAG.
- tdd-orchestrator / conductor workflow = red-green-refactor=**도메인(TDD) 특정**→중앙 패턴 아님(중립핵=react/producer-reviewer 이미 커버).
- eval-orchestrator = Layer1 static→Layer2 judge→weighted composite = pipeline+aggregation. 신규 아님.
- data-pipeline/ml-pipeline = 도메인 파이프라인 → pat-pipeline. 저작 안 함.

## 신규가 정당했던 유일 케이스: 파일-state 핸드오프
~26 orchestrator가 공통 규율: "Write output files. Read from prior step files — **do NOT rely on context window memory**", state.json resumable, PHASE CHECKPOINT. 이건 **Blackboard**(공유 durable 아티팩트 store=single source of truth로 간접 조율)—중립·textbook MAS 토폴로지이고 기존 15에 없음. peer-mesh def가 이미 "coordination topology는 pluggable dimension(orchestrator-workers/peer-mesh)"이라 프레이밍→blackboard가 자연스러운 3번째 leg. `id:pat-blackboard`, tagged c-pattern-taxonomy, tokenEstimate 200, maturity draft.
- pipeline과 구별: pipeline=순서 고정, blackboard=조율 **매체**(공유 store) 제약이지 순서 아님.

## 배선/불변식 규칙 (재사용)
- 신규 taxonomy-only 패턴 도달성 = `ho:tagged c-pattern-taxonomy` 하나면 충분(기존 pat-pipeline 등 선례; harness가 appliesPattern 안 해도 됨). **Channel 동반 금지**(orphan/host-harness 배선 필요→scope creep). chan-blackboard는 후속 GAP.
- byte-identity: materialize는 patterns를 **per-harness `appliesPattern`만** emit(materialize.py:501). taxonomy-only 패턴은 어느 harness CLAUDE.md에도 안 들어감→7 harness 0-diff. 억지 appliesPattern 배선 금지.
- **MIT 귀속(첫 wshobson 유래 중앙 노드)**: `dct:` prefix 신규 추가+node에 `dct:source "https://github.com/wshobson/agents"` `dct:license "MIT"`. DesignPattern은 sh:closed 아님→임의 predicate 안전. 중앙 repo root에 NOTICE 신규 생성(Seth Hobson 2024, "no source text copied, provenance via dct").
- wshobson repo는 이제 plugins/ 마켓플레이스 구조(94 plugin/203 agent/109 command). "16 orchestrators"는 `*/commands/*` + `*orchestrat*` agents에 흩어짐.

## GAP (후속 wave)
- human-in-the-loop PHASE CHECKPOINT(승인 게이트)=guardrail 축→Wave 3.
- chan-blackboard(blackboard 토폴로지의 매칭 Channel)=미저작(host-harness 배선 필요).
- Wave 2 role 참고: team-lead/eval-orchestrator/tdd-orchestrator/architect-review/code-reviewer 등 orchestrator role 다수(중립화 대상).
