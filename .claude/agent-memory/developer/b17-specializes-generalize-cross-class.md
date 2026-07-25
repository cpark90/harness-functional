# B17 — `ho:specializes` 원형↔인스턴스 세분화 술어 일반화

## 문제
`ho:specializes`가 `rdfs:domain/range ho:Harness`라 Role(원형↔구체) 세분화에 못 씀.
`ho:derivedFrom`은 provenance("FROM 각색")라 방향/의미 다름. 근사동의어 `specializesRole` 신설은 anti-drift 위반.

## 채택: domain/range 제거 + SHACL same-kind partition shape (Approach B)
- **왜 owl:unionOf domain 대신 omit?** ① repo 관용(공용술어는 domain 생략+definition 명시, `ho:derivedFrom` 선례)
  ② owlrl이 unionOf domain을 만나면 subject에 bnode union-class type 삼단논법 추가 → 부수 triple 리스크. omit은 무부작용.
- Harness ⊄ HarnessComponent (공통상위 없음). Role ⊑ OrganizationComponent ⊑ HarnessComponent. → 둘이 clean partition.
- TBox: `rdfs:domain/range` 두 줄 삭제, definition에 "same kind narrowing, spans Harness+HarnessComponent like derivedFrom, typing은 shape가" 명시.
- shapes: `ho:SpecializesTypingShape` `sh:targetSubjectsOf ho:specializes` + **sh:or 2-branch**:
  `[sh:class Harness; sh:property[path specializes; sh:class Harness]]` OR 같은 걸 HarnessComponent로.
  → subject·target이 **한 family 내**임을 강제. cross-partition(Role specializes Harness)만 잡음.
- **[권장] gap**: leaf-class sameness(Role→Role, NOT Role→Tool)는 shape가 못 잡음(둘 다 HarnessComponent라 통과).
  coarse partition만 clean 강제 가능 — definition에 [권장] 명시로 처리. sh:sparql leaf-eq는 owlrl super-type 팽창 때문에 취약.

## 배선 (술어가 orphan 어휘 안 되게 실사용 1쌍)
- `id:role-inspection-worker ho:specializes id:role-inspection` (dispatch-invoked 조사 subset = user-facing/git inspection의 스코프축소 변형).
- 기존 `id:h-support ho:specializes id:h-research` (Harness↔Harness) 계속 valid — 첫 branch 통과.

## byte-identity 증명 (specializes는 spec 엣지, emit 안 됨)
- `grep specializes tools/`: retrieve.py salience weight + webui ttl_writer ORDER 뿐 — **materialize.py 0건**. 중앙 하네스 CLAUDE.md 불변 확정.
- 라이브 baseline diff: 레포 rsync copy(.git 제외) → 3파일만 `git show HEAD:` 로 revert → 양쪽 materialize.py로 중앙 7 emit → `diff -r`(lock 제외) = 0. 7/7 byte-identical.
- 개체 226 불변(triple만 +1, 신규 individual 0). negative control: Role→Harness로 바꾸면 shape FAIL(강제 확인).

## 후속 GAP (이번 범위 아님)
published/staging recipe의 로컬 role(Analyst/Strategist 등 24개) → 중앙 원형 재바인딩(federation ripple, draft)은 미실행.
