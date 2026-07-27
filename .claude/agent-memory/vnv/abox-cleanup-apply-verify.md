# abox 정리 적용분(감사→developer 적용) 독립 재검증 절차

감사(abox-audit-*)가 낸 KEEP/MERGE/clarify 권고를 developer가 적용한 뒤, self-report 없이 재현 판정.

## 핵심 재현 축
- **MERGE 검증 = 삭제 노드 원문 vs 병합 후 promptText 의미 대조**: `git show HEAD:<ttl> | grep -A6 <deleted-id>`로
  삭제 노드 원 promptText를 꺼내, 흡수 노드 병합 후 텍스트가 그 의미를 포괄하는지 문장 단위로 판정(의미 손실=결함).
  실측 예: no-nested-teams "workers are leaf agents, not leaders of further teams" → depth-limit "workers are
  leaf agents that do not spawn **or lead** further sub-teams"(원 depth-limit엔 "or lead" 없었음=흡수 증거).
- **dangling 0**: `grep -rn "<deleted-id>" ontology/`=0. 흡수 노드가 carrier에 **이미 co-bound**였으면 developer 편집은
  remove-only가 정답(add면 중복). carrier hasGuardrail 줄에서 흡수 노드 **1회만** 출현 확인(무중복).
- **삭제 노드 prefLabel→흡수 노드 altLabel 승격** 확인(검색성 보존), tokenEstimate 증가가 promptText 성장과 정합.

## 순delta 산술 (개체수 검증)
- 워킹트리 절대 개체수(validate "all N reachable")는 **누적 uncommitted** 반영이라 "직전 N" baseline은 stash 없인
  재현 불가. 대신 **cleanup 5파일 diff로 순delta 귀속**: typed individual(`id:x a ho:Class`) 추가/삭제만 카운트.
  술어·리터럴(skos:definition/altLabel/topConceptOf) 수정은 delta 0. MERGE 1건이면 정확히 −1.

## clarify/정의추가 = 리터럴이라 위상 무영향
- capability에 `skos:definition` append, altLabel 축소/보강 → provides/requires·prefLabel 무변경이면 매칭 무손상.
  validate "capabilities" 축 + retrieve `requires: …` 해석으로 확인. §1c: altLabel/definition은 tokenEstimate 범위 밖
  → tokenEstimate 불변이 정상(promptText 바뀐 노드만 증가).
- pattern 대조절(prose) 추가: 참조 id(`id:pat-*`)가 typed-decl 실재하는지 grep(broken cross-ref=결함, validate는 prose ref 미검출).

## 스팟체크 (KEEP 노드 불변)
- diff가 **접촉한 노드 목록**만 나열되는지로 확인: 감사가 KEEP한 노드(supervisor/blackboard/peer-mesh, 37 KEEP guardrail)가
  diff에 없으면 불변. patterns.ttl diff=3노드만, guardrails.ttl diff=4노드만 = 나머지 무변경 확증.

## ★워킹트리 격리 함정 (N1 상습)
- 이 repo 워킹트리엔 여러 태스크 uncommitted 누적(role-consolidation `role-developer`→`role-implementer` ripple:
  harnesses hasRole/channels/observation/workflows/materialize.py/materialize-design.md; B24 roles.ttl). diff stat에 스코프
  밖 파일 뜨면 놀라지 말고 **prior 검증완료 태스크 귀속**으로 판별(관련 verify 메모리 대조). 본 태스크 결함 아님·inspection 커밋
  스테이징 판단거리로 note. 세션시작 git status 스냅샷은 stale일 수 있음(대화 중 갱신 안 됨).
