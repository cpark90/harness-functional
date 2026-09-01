# Inspection 브리프 — retrieve.py 결정성 결함 수정 + 회귀 가드 (87eeb53 이후)

> 작성: orchestrator (2026-07-25, 자율 점검 중). 실행: **inspection 세션**.
> 소스 결함 항목: `docs/feedback/retrieve-nondeterministic-pack.md`(inspection 상신, **사용자 승인**).
> 온톨로지 **무변경** 증분 — tools/CI 전용.

## 미커밋 델타
```
 M tools/retrieve.py              # 순서 누수 4곳에 총순서 키
?? tools/check_determinism.py     # 회귀 가드 (신규)
 M Makefile                       # `make determinism` 타깃
 M .github/workflows/validate.yml # validate 다음 step 1줄
 M .claude/agent-memory/developer/MEMORY.md
?? .claude/agent-memory/developer/retrieve-projection-determinism.md
?? docs/plans/harness-100-scaleup-plan.md          # (별건: 계획 문서)
 M docs/feedback/harness-repo-survey.md            # (별건: 사용자가 status→approved + 답변 기입)
```
> 뒤 2개는 이 증분과 무관하다. `harness-repo-survey.md`는 **사용자의 승인 편집**이므로 내용을 바꾸지 말고
> 그대로 커밋하거나, 채널 규약대로 처리하라(orchestrator는 status 태그를 건드리지 않았다).

## 결함과 수정
같은 질의가 실행마다 다른 context pack을 냈다(10회 → 10종). URIRef **해시 랜덤화**가 집합/그래프 순회
순서를 흔들고 그 순서가 **동점 처리**에 새어 들어간 것.

수정: 총순서 키 헬퍼 `_rank_key = (-score, str(node))`(점수만 음수화 → IRI는 오름차순) 도입 후 4곳 적용.
1. **`select_seeds` — 진짜 원인**. `instance_nodes()`가 `set`을 반환해 리스트 구성 순서가 흔들리고,
   점수만으로 정렬 후 `[:MAX_SEEDS]`로 잘라 **경계의 seed 선택이 매번 달라져 팩 내용 자체가 갈렸다**.
2. `nodes` 표시 정렬 · 3. `candidates` 정렬 · 4. **`edges` 리스트**(원 보고서 누락분 — 추론 트리플이
   set 순서로 insert돼 `for s,p,o in g` 순회가 프로세스마다 달랐다).
- **`traverse`는 무수정**: heap이 이미 `(-s, str(n), n)` 총순서를 갖고 `best`는 최댓값이라 인접 순서에 불변.

## 검증 증거 (orchestrator 독립 실행)
- **결정성(시드 고정 없음)**: `"code review harness with tests"` **10회 → 1종** · `"workflow steps and
  deliverables"` **6회 → 1종**. (수정 전 각각 10종/6종.)
- **온톨로지 무접촉**: `git status --porcelain ontology/` 무출력. `validate.py` **PASS @205**.
- **회귀 가드 동작**: `tools/check_determinism.py` → `PASS`(4 probe × md/json). 설계상 `PYTHONHASHSEED`를
  **random/0/1/2로 서로 다르게** 주어 fresh 프로세스 비교한다(고정하면 결함이 은폐되므로 — docstring에 경고 명시).
  developer가 **negative control**도 확인: `git show HEAD:tools/retrieve.py` 사본에 같은 체크를 돌리면 4/4 FAIL.

### 의미 보존 (중요 — 랭킹 변경 아님)
`PYTHONHASHSEED=0..9`의 수정 전 10변종과 수정 후를 의미 코어(`budget_used`, node→relevance, edge/candidate/gap
집합)로 대조:
- 두 대표 질의는 **10/10 변종과 완전 동일**(membership·relevance 불변, 흔들리던 건 표시순과 seed 목록뿐).
- **membership이 실제 수렴한 질의 1건**: `"workflow steps and deliverables"`는 컷 점수에 **동점 17개 · 잔여
  슬롯 5개**라 원래 6변종(nodes 34~40)이었고 이제 nodes 28로 한 값 고정. **공통 노드 relevance mismatch 0** —
  원래 비결정적이던 tie 경계가 고정된 것이지 랭킹 의미 변화가 아니다.

## 실행
```bash
cd /home/cpark/git/harness_ontology
/usr/bin/python3 tools/validate.py             # PASS 205
/usr/bin/python3 tools/check_determinism.py    # PASS
for i in $(seq 10); do /usr/bin/python3 tools/retrieve.py "code review harness with tests" | md5sum; done | sort -u  # 1종
git add tools/retrieve.py tools/check_determinism.py Makefile .github/workflows/validate.yml \
        .claude/agent-memory/developer/
git commit -m "Make retrieve.py projections deterministic across processes

URIRef hash randomisation leaked into tie handling: set/graph iteration order
decided which of several equally-scored nodes survived the seed cap, so the
same request produced a different context pack on every run (10 runs -> 10
packs). Sort seeds, nodes, candidates and edges on a total key
(-score, str(iri)); traverse already carried a stable heap key and is
untouched.

Adds tools/check_determinism.py (fresh processes under differing
PYTHONHASHSEED) plus a make target and a CI step, so a regression is caught
the way materialize's byte-identity gate catches emit drift.

Ontology unchanged (205 individuals); ranking semantics preserved -- only
tie-group order is now fixed.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push
```
> `docs/plans/harness-100-scaleup-plan.md`와 `docs/feedback/harness-repo-survey.md`는 별건이니 **별도 커밋**으로
> 나누는 편이 이력이 깨끗하다(원하면 한 커밋으로 묶어도 무방 — 온톨로지 영향 0).

## 완료 보고 (inspection → orchestrator, append)
- [ ] 중앙 push @205 결정성 수정 (commit ____) / CI green (**신규 determinism step 포함**)
- [ ] fresh clone에서 `check_determinism.py` PASS 재확인
