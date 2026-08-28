# 주석 층(annotation-layer) projection 제외 + 첫 Anchor 저작 검증 재현 절차

대상 유형: "개체 저작이 검색을 오염 → 코드에서 층 제외 → byte-identity 회복" 3결합 웨이브.
리포트: `docs/verify/anchor-first-wave-verify.md`.

## 완결성 반증(다른 유입 경로 찾기)의 닫는 법
- retrieve의 admission 유입은 **heap 초기화(select_seeds)** 와 **push(adj[node])** 둘뿐 —
  이 구조 사실을 코드로 확인한 뒤, **출력 표면 전수**(nodes/candidates/gaps/edges/seeds)가
  admitted 파생임을 짚고, 우회 후보를 명시적으로 하나씩 음성 처리한다:
  ① `_resolve_id_tokens` 산문 경로 = **전 리터럴에서 `id:<slug>` 지칭 스캔**(0건이어야),
  ② `alternative_clusters`는 전 그래프를 읽지만 key 미출력·해당 노드 미pop이면 잠복만,
  ③ `_typed`는 membership 전용, ④ json 별도 섹션 없음. 마지막으로 AFTER 팩 전 필드
  기계 스캔(0건)으로 종결.

## byte-identity 3-tree 재현 (스크립트 재사용 금지 시)
- 트리 4개: base(워킹트리 rsync + **rdflib로 대상 트리플만 역적용**·제거 수가 주장 수와
  일치해야 + `git show HEAD:` 원본 코드), noop(동그래프+새 코드), after(=repo),
  **pollu(원본 코드+오염 그래프) = anti-vacuous 대조군** — 이게 없으면 80/80은 스위트
  무감지와 구별 불가. 이번 실측: after/noop 80/80 identical, pollu **68/80 differ·34/40
  JSON anchor admit·q01 36→19 붕괴**(보고 수치 재현).
- 역적용은 rdflib parse→remove→serialize가 안전(직렬화 재배열은 무해 — 팩은 그래프
  내용 함수). driver는 트리별 **별 프로세스**로 graph 1회 로드 후 40질의×2포맷 파일 출력,
  `PYTHONHASHSEED=0` 통일.
- **★기준선 구성이 게이트의 사각을 만든다**: "워킹트리 역적용" 기준선은 같은 hunk의
  **비-anchor 편집(태그 추가 등)을 양쪽에 남겨** byte-identity 밖으로 빼돌린다 — 브리프
  밖 편집이 있으면 **그것만 역적용한 4번째 트리**로 별도 실측(이번: c-dispatch 태그 2줄이
  8/40 질의 팩 변화, 방향 개선·비차단이지만 미보고였음).

## Anchor 특화 사실 (재사용)
- 원시 트리플 산술: anchor 1개 = 4 triples(type/prefLabel/target/confidence) + 부착
  hasAnchor 1 ⇒ 7개 저작 = 35. lock individualCount로도 +7 검산.
- AnchorShape `sh:class ho:Concept`는 validate 파이프라인(추론→SHACL)에서 **불발화**
  (prp-rng vacuous) — 실이빨은 ConceptConnectivityShape "Orphaned concept"; 무추론
  SHACL에선 발화. probe는 raw union 사본 + apply_reasoning + pyshacl inference=none,
  reason=False 런은 chain 미전개 orphan 노이즈가 정상(핵심 메시지만 grep).
- Harness/Concept 직접 hasAnchor는 chain(hasComponent∘hasAnchor) 불성립 →
  "Orphaned component"로 FAIL(TBox "component에만 단다" 이빨 실재).
- materialize: anchor는 MANIFEST components에만(INSTANCE_CLASSES 등재라 "Anchor" 정타이핑),
  렌더 byte-identical, lock은 individualCount 1줄만.
- confidence 사실성 판정 = 정의문 verbatim 대조 + **눈금 경계의 암묵 규칙에 이름 붙이기**
  (agent-복수 어휘 teams/other agents = c-multiagent 근거 / lifecycle 어휘 spawn = 비근거).
  미저작 정당성은 후보 집합 재계산(attachable ∧ 다중태그) 후 **형제 노드 대칭 대조**로
  반례 색출 — 이번 반례: role-benchmarker(정의가 c-oversight와 동문 + c-oversight 정의가
  benchmarking을 먼저 지목인데 skip 무사유).
