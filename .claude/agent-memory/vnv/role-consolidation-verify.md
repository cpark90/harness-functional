# role consolidation (node merge/delete) 검증 재현 절차

두 role 병합(role-inspection-worker→role-inspection, role-developer→role-implementer)의
working-tree 최종상태 독립검증. 재사용 체크리스트:

## Gate 재현
1. **dangling**: `grep -rn "<deleted-id>" ontology/` → 0. rdflib `triples((ID[x],None,None))`
   in/out 둘다 0으로 재확인(주석까지).
2. **guardrail orphan**: rdflib `subjects(RDF.type, HO.Guardrail)` 전수 → 각 gr가
   `subjects(None,gr)` 참조 있는지. 삭제된 role이 이고 있던 거버넌스 gr(controlled-vocabulary,
   reuse-first)이 다른 carrier(h-multiagent hasGuardrail / role-orchestrator roleGuardrail)로
   여전히 reachable한지. validate 전역 reachability가 orphan 0을 이미 보장(교차확인).
3. **agent→role resolve**: 병합은 concrete AGENT 노드(agent-developer)가 neutral archetype
   (role-implementer)을 agentRole로 인스턴스화하는 모델. agentFunction/agentObservation 보존 확인.
4. **rebind 중복금지 함정**: 리스트에 타깃이 **이미 있던** carrier(h-workspace-synthesis에 implementer
   기존재)는 remove-not-add여야 함. rdflib `len(objects)!=len(set)` dup체크 + 타깃 count==1.
   4곳 channelParticipant/stepByRole/observesComponent 전수.
5. **count 산술**: `git show HEAD:roles.ttl | grep -c '^id:role-.* a ho:Role'` vs 현재.
   두 삭제=-2. 다른 파일은 pure rebind인지 `git diff <f>|grep -E '^[-+]id:.* a ho:'`=none으로 증명.
6. **recipe 무영향**: recipe가 자기 namespace의 **동명 local 노드**(id:lpranging/role-developer,
   prefLabel다름)를 가질 수 있음 — core:role-developer 참조 아니면 무해. `grep core:role-developer`로
   구분. 실제 closure validate: `ln -s <central> central; HARNESS_CATALOG=... HARNESS_ROOT_ONTOLOGY=...
   /usr/bin/python3 central/tools/validate.py; rm central`(catalog가 core-roles 매핑하므로 삭제케이스 실검).
7. **retrieve smoke**: 흡수된 기능(investigation→inspection, authoring→implementer)이 병합노드
   질의로 히트하고 삭제노드는 안 뜨는지.

## 상위판정 함정
- **concrete/neutral GAP은 pre-existing과 구분**: agent-synthesizer가 h-multiagent.hasAgent인데
  role-synthesizer는 h-multiagent.hasRole에 없음(hasRole carrier=h-workspace-synthesis뿐).
  → agentRole↔hasRole 정합성 SHACL 미강제라 validate PASS·hasAgent로 reachable. HEAD에서 확인해
  이번작업 회귀 아님을 입증 후 residual GAP으로만 지목(scope 밖).
- 새로 추가된 **주석(TAXONOMY 헤더)**이 그래프와 어긋날 수 있음(synthesizer "carrier h-multiagent"는
  hasRole기준 틀림) — comment-only N.
- doc-lag: tools/materialize.py docstring·docs/*가 삭제노드를 예시로 씀 = cosmetic(동작 무관, prefix strip).
  agent-memory/docs/plans/feedback는 pre-merge 이력이라 정상.
- 판정: PASS(with notes). implementer 정의에서 "distinguished from role-developer" 문단이 사라진 게
  drift 실제해소 신호(twin분리용 문단이 twin삭제로 불필요).
