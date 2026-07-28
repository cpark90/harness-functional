# B9 — 폐기 처리: tombstone 아닌 완전 제거 (그래프는 현재 유효 부품만)

사용자 결정 (C): deprecated 노드를 그래프에 남기지 않고 **삭제**. 추적성은 git·docs.
근거=`docs/feedback/verified/supersededby-edge.md`(verdict apply).

## 적용 패턴 (재사용)
- **폐기=삭제**: `ho:maturity "deprecated"` 노드를 통째로 지운다. inbound 참조 0(grep으로
  실측: 자기정의 제외)이면 dangling 없이 안전. appliesPattern 등 배선 참조 0 확인 필수.
- **묘비 주석도 함께 제거**: "...kept because IDs never reused / tagged X so they remain
  connected" 류 DEPRECATED 섹션 헤더 주석 전체 삭제.
- **숨은 tombstone 참조 함정**: 삭제 대상만이 아니라, **다른 위치의 주석/헤더가 삭제 노드를
  참조**하면 그것도 stale이 된다. 여기선 유닛 상단 owl:Ontology 헤더 주석이 "SUPERSEDE the
  execution-mode DesignPatterns below and are read side by side"라며 삭제될 3노드를 지목 →
  갱신 필요(제거 후엔 below에 그 패턴이 없음). grep으로 IRI뿐 아니라 prefLabel·개념 참조도 훑어라.

## ONTOLOGYSTYLE 정책 성문화 (핵심 함정)
- §2 line "ID는 재사용하지 않는다. 폐기 노드는 삭제 대신 `ho:maturity "deprecated"`" 가
  **정반대 기존 정책**을 명시하고 있었다. 새 방침 줄만 추가하면 문서 자기모순 → 그 줄 자체를
  갱신해야 한다("ID 재사용 금지"는 유지, 폐기 처리 절만 "제거한다"로 교체).
- 교훈: 정책 성문화 brief는 "추가"라 해도 **반대 방침이 이미 박혀있는지 grep**(deprecat/maturity)
  후, 있으면 add 아닌 **replace**.

## 휴면 기계 완전 은퇴 (housekeeping Task 1, 후속 결정)
deprecated 노드 0을 구조적으로 강제하려 코드+주석을 **은퇴**. retrieve.py에서 제거:
`DEPRECATED_RANK_FACTOR` 상수, `lifecycle_factor()` 함수+2 호출부(lexical_score의 `*factor`,
traverse의 `factor` dict/`*factor[nbr]`), `⚠ DEPRECATED` 배지, docstring/주석.
- ★안전근거=**현 노드 전부 factor 1.0**(deprecated 0). 제거=모든 점수 ×1.0 no-op 삭제 →
  **byte-identical**(실측: JSON 팩 2질의 before/after diff 0). determinism PASS 유지.
- **shapes엔 maturity `sh:in` enum 없음**(전부 `sh:minCount 1` presence-only, free-text). →
  "deprecated"는 이미 유효하지 않은 값이 아님(어떤 문자열도 통과). 스키마 변경 불요 =
  negative test(deprecated→FAIL) **불가/생략**. B9 machine-enforcement는 shapes로는 안 되고
  코드/정책 문서 레벨에서만.
- **잔존 doc-lag**: `tbox/harness.ttl` ho:maturity `skos:definition`이 여전히
  "draft | reviewed | stable | deprecated" free-text 나열. TBox는 developer scope 밖 →
  orchestrator 소관으로 보고(편집 금지).

## 검증 게이트
grep 3 IRI 0건·`maturity "deprecated"` 0건 / validate 235→232(−3) PASS·0 orphan /
c-execution-mode는 mode-* 3 draft가 계속 tag→연결 유지 / determinism PASS /
materialize h-multiagent 클린·삭제노드 누출 0(참조 0이라 byte-id).
