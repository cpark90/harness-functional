# Inspection 브리프 — GAP-c: retrieve 가중치에 hasExecutionMode 등록 (d40c347 이후)

> 작성: orchestrator (2026-07-25). 실행: **inspection 세션**. 직전 land(`d40c347`, execution mode 1급 축, 202→205)의
> **후속 마무리 증분**. 상위 계획: `docs/plans/dispatch-execution-mode-axis.md`(GAP-c 항목).

## 미커밋 델타 — **1파일 2줄 (tools 전용)**
```
 M tools/retrieve.py     | 2 insertions(+), 1 deletion(-)
```
`PREDICATE_WEIGHT`에 **`HO.hasExecutionMode: 0.7`** 등록. 그 외 변경 없음.

```diff
-    HO.appliesPattern: 0.7, HO.dependsOn: 0.7, HO.tagged: 0.7,
+    HO.appliesPattern: 0.7, HO.hasExecutionMode: 0.7,
+    HO.dependsOn: 0.7, HO.tagged: 0.7,
```
(`-`/`+` 쌍은 줄 재배치일 뿐 — **다른 predicate의 가중치는 하나도 바뀌지 않았다**.)

### 왜
미등록이면 `PREDICATE_WEIGHT.get(p, 0.5)`의 기본값 0.5가 적용돼, 실행모드가 `skos:broader`와 같은 급으로 취급되고
그래프 확장 시 과소평가된다. `ho:hasExecutionMode`는 `ho:appliesPattern`과 **직교 자매 축**(아키텍처 축 / 런타임
topology 축)이므로 **같은 tier 0.7**이 의미적으로 옳다.

### 범위 밖 (확인 완료)
- **온톨로지 무변경**: `ontology/**` 무접촉 → 개체 수 205 불변, TBox·shapes·catalog·root imports 전부 무변경.
- **recipes repo push 불필요**: catalog·문서 IRI 변화가 없다(순수 tools 랭킹 파라미터).
- **materialize 산출물 무영향**: `retrieve.py`는 emit 경로가 아니다 → 어떤 하네스의 CLAUDE.md/MANIFEST도 불변.

## 검증 증거 (orchestrator 직접 실행, land 전 재확인 권장)
- `/usr/bin/python3 tools/validate.py` → **PASS, 205 individuals** (SHACL·reachability·capabilities·assemblyOrder ✓).
- `retrieve.py "multi-agent harness that spawns short-lived sub-agents"` → **sub-agents 모드를 선언한
  `Workspace-synthesis harness`·`Multi-agent orchestration harness`가 공동 최상위(rel 3.307)**, 그 아래
  `Harness-factory harness`(hybrid)·`Peer-mesh coordination harness`(agent-teams) 2.43. 의도한 판별 효과가 나타남.
- `git diff` 상 변경 줄 = 위 3줄뿐(다른 가중치 무변경 기계 확인).

> **주의(verify-then-proceed)**: 이 변경을 적용한 developer dispatch의 **비교 리포트(변경 전/후 relevance,
> 부작용 유무)가 아직 반환되지 않았다**. 위 증거는 orchestrator가 독립 실행한 것이다. 만약 developer가
> **다른 노드 랭킹의 회귀**를 보고하면 이 증분은 되돌릴 수 있으므로, land 직전에 아래 게이트를 다시 돌려
> 결과가 같은지 확인하라. 값이 과하다고 판단되면 land하지 말고 orchestrator에 보고.

## 실행
```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py            # PASS 205
/usr/bin/python3 tools/retrieve.py "multi-agent harness that spawns short-lived sub-agents"
/usr/bin/python3 tools/retrieve.py "what execution topology does this harness run in"
git add tools/retrieve.py
git commit -m "Weight ho:hasExecutionMode as a first-class retrieval axis (0.7)

Register ho:hasExecutionMode in retrieve.py's PREDICATE_WEIGHT at the same
tier as ho:appliesPattern: the two are orthogonal sibling axes (architectural
pattern vs runtime execution topology), so falling back to the 0.5 default
under-weighted execution mode during graph expansion.

Ontology untouched (205 individuals); retrieval ranking only, no emit path.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
```

## 완료 보고 (inspection → orchestrator, append)
- [ ] 중앙 push @205 GAP-c (commit ____) / CI green
- [ ] retrieve 회귀 없음 재확인 (위 두 질의 결과 첨부)
