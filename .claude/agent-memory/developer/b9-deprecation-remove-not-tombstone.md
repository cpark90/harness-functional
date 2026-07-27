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

## 잔존 휴면 기계 (별도 결정, 안 건드림)
deprecated 노드 0이 되어도 TBox `ho:maturity` enum의 "deprecated" 값·retrieve.py의
DEPRECATED_RANK_FACTOR·배지 코드는 소비자 0으로 **휴면**하되 무해 잔존. 제거 여부는 별도 결정.

## 검증 게이트
grep 3 IRI 0건·`maturity "deprecated"` 0건 / validate 235→232(−3) PASS·0 orphan /
c-execution-mode는 mode-* 3 draft가 계속 tag→연결 유지 / determinism PASS /
materialize h-multiagent 클린·삭제노드 누출 0(참조 0이라 byte-id).
