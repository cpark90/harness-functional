# online-agent 웨이브 검증 재현 절차 + 함정

축 신설(ExecutionMode/Concept/Guardrail 대칭 쌍) + 워크플로 단계 삽입(renumber) +
동시성 정책 배선 + emitter 문구 동조. 4개 사용자 요구를 한 웨이브로 반영한 유형의 판정법.

## 재현 (전부 `/usr/bin/python3`)
- 게이트 3종: `validate.py` / `lint_uniformity.py` / `check_determinism.py`.
- 발견성: 요구 문장별 자연어 질의 1개씩 + `--budget 6000` 재실행(기본 팩 탈락 노드 위치 확인).
- 질의 결정성: `PYTHONHASHSEED` 미지정/1/7 3회 pack sha256 동일 확인(check_determinism은
  고정 4질의만 도므로 신규 질의는 따로 재야 함).
- `materialize.py <harness> --out <scratch>` 2회 → `diff -r` IDENTICAL + dangling `id:`/`core:` 0.

## 이 유형의 필수 축 (validate가 안 보는 것)

### ★A. 배선 대상 harness가 정책의 **기판(substrate)** 을 선언하는지
가장 값진 발견이 여기서 나왔다. `gr-work-claim` promptText가 "claims … on the **shared task
board**"라고 쓰는데, 유일 carrier `h-workspace-synthesis`의 `hasChannel`은 `chan-workspace`
하나뿐이고 `chan-task-board`는 **다른 harness(h-harness-factory)** 소유였다. validate는
guardrail·channel 각각 reachable이라 통과, 린터도 못 봄. **빌드 산출물(CLAUDE.md)에서
"지시문이 참조하는 채널/패턴이 같은 문서의 Channels/Process 섹션에 실제로 나오는지"** 로만 잡힌다.
재현: rdflib로 `(None, None, ID[substrate])` inbound 스캔 → carrier의 `hasChannel/appliesPattern`
대조 → `materialize` 후 해당 섹션 grep.
- 브리프가 "harness X에는 board 미선언이라 의도적 미배선"이라고 사유를 대면 **배선된 harness Y도
  같은 조건인지 반드시 확인**한다(사유가 전이되지 않는 경우가 있다).
- 반면 `pat-fanout-fanin` 무배선은 **pre-existing catalog-stock**(13 DesignPattern 중 7개가 동일,
  `ho:tagged`로 reachable)이라 회귀 아님 — 무배선을 일괄 결함 처리하면 오탐.

### ★B. 주석에 쓴 축(taxonomy) 주장은 그래프로 전수 대조
roles.ttl "ACTIVATION 축: standing은 orchestrator·inspection 뿐, coordinator는 어느 쪽도 아님"류
주장은 rdflib로 전 Role의 `roleGuardrail ∋ gr-online-execution / gr-dispatch-execution` 히스토그램을
찍어 검증(2/13/1 정확 일치 확인). `ho:userFacing` 같은 present-only 술어도 같이 대조하면 doc-lag 즉시 노출.

### ★C. WorkflowStep renumber는 DAG 3중 감사
`stepOrder` 1..N contiguous + **dangling stepConsumes 0**(모든 소비 Deliverable이 어떤 step의
stepProduces) + **stepDependsOn 단조 증가**. 셋 다 validate 범위 밖. 더불어 워크플로 정의문·
tokenEstimate·"seven-stage"류 주석 문구 동기화도 grep.
- **산문-엣지 괴리 함정**: step 정의문이 "from the intent profile"이라 써도 `stepConsumes`에 그
  Deliverable이 없을 수 있다(선형 DAG 컨벤션 때문). 정의문의 명사구를 stepConsumes와 1:1 대조할 것.

### ★D. emitter(tools) 변경의 격리 증명
`git worktree add --detach <scratch>/head-wt HEAD` → 두 트리에서 같은 harness materialize → `diff -r`.
그래프 변경분(신규 노드·individualCount·tokenEstimate)을 제외하고 **산문 변경이 의도한 1줄뿐**임을
보이면 부수 렌더링 영향 0 증명. (워킹트리에 무관 미커밋분이 섞이므로 원시 diff를 그대로 결함
처리하지 말고 항목별 귀속시킬 것.)

### ★E. 개체수 self-report는 항상 재측정
브리프 "253→261 (+8)"이 실제로는 HEAD 245 → 250(직전 미커밋 웨이브 5개) → 261(본 웨이브 **+11**).
재현: HEAD worktree와 워킹트리 각각 abox glob parse → `id:` 주체의 `rdf:type` 집합 symdiff.
**validate 헤더 카운트는 `skos:ConceptScheme id:scheme`을 빼므로 rdflib 실측보다 1 작다**(246 vs 245).
ADDED 목록을 웨이브별로 귀속시켜야 "이번 것"만 판정된다.

## 컨벤션 대조 수치 (재사용 가능)
- **Concept은 tokenEstimate·maturity 둘 다 없음이 정상**(41/41 미보유). §1c 범위 밖 → 오탐 주의.
- ExecutionMode 4형제 tokenEstimate는 전부 chars/4보다 소폭 낮음(190/228, 105/113, 105/121, 270/282)
  — 신규가 같은 편차대면 결함 아님(§1c는 존재만 요구).
- 전-그래프 동일 prefLabel 13건은 **클래스 교차**(Concept "Traceability" vs Capability "Traceability")
  기존 관례. validate dup-check는 class 내부만 보므로 정상.
- `retrieve.py:196`은 **skip-not-break** — `truncated` 필드 자체가 없고, 컷은 동점 IRI 오름차순
  tie-break로 일어난다. "budget 900/900"을 절단 결함으로 읽지 말 것. `--budget 6000`으로 원래 rank 확인.
- TBox step 술어는 stepByRole/UsesTool/GuardedBy/Consumes/Produces/DependsOn **6종뿐** —
  step↔channel 술어 없음 → "질문을 오가는 채널" 미배선은 out-of-model 정당(신설이 drift).

## 대칭 쌍 anti-drift 판정
신규 노드의 판별절이 **검색 대상 값(definition/promptText)** 안에 있는지 본다(`#` 주석은 emit 안 됨).
이번 11개 중 10개는 값 안에 있었고, `gr-work-claim`↔`gr-instance-isolation` 쌍만 주석에만 있어
관찰(N)로 기록 — prefLabel/promptText가 WHEN vs WHERE로 안 겹쳐 결함까지는 아님.
두 상반 guardrail(dispatch/online)이 한 harness에 병기돼도 **각 promptText가 자기 적용범위를
명시**하면 emitted 문서에서 모순으로 읽히지 않음 → 비-이슈 판정 가능.

판정: `docs/verify/online-agent-wave-verify.md` (PASS-with-notes: F1 task-board 미선언 권고수정,
F2 산문-엣지 괴리, F3 emitter 무조건 복수형, F4 개체수 오기, N5 주석-판별절, N6 budget tie-break).
