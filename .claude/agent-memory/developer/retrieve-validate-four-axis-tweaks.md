# retrieve/validate 4-axis tweaks (B18·B2·B11·B12)

tools/ + ONTOLOGYSTYLE 소소한 4건 (중앙 그래프 무변경). 재사용 포인트:

- **B18 inline id: 해소 (retrieve emit)**: materialize `IriTokenResolver`를 retrieve의 **텍스트
  방출부에만** 미러. 사이트별 패치 말고 `_resolve_id_tokens(g, text)` 헬퍼 하나를
  `project()`의 `nodes[].definition`/`promptText` 구성 지점에 적용(md·json 둘 다 이 dict서 옴 →
  단일 지점). regex `\b(?:id|core):([A-Za-z][A-Za-z0-9_-]*)` → `lib.label_of(g, lib.ID_CORE[slug])`.
  ★retrieve는 **중앙 union만** 로드하므로 `id:`=core → `ID_CORE[slug]` 직접확장이면 충분
  (materialize의 slug-index 다중도메인 해소는 불필요). label_of는 미해소시 slug tail로 degrade →
  `id:` prefix 절대 잔존 안 함. **budget 무영향**: `token_cost`는 `ho:tokenEstimate`만 보지 emit
  텍스트 길이 안 봄 → 노드 수 불변, determinism 유지. idempotent(해소 label엔 토큰 없음).
  구조화 필드(candidate/edge/gap)는 이미 label_of → 건드리지 마.

- **B2 tie-break 2차 키 = maturity (NOT salience)**: salience는 252중 5개(2%)만 커버 → 무용.
  maturity 170개(67%). `_rank_key`를 `(-score, str(node))` → `(-score, maturity_rank(g,node), str(node))`.
  ★`_rank_key`가 원래 `g` 인자 없음 → 시그니처에 `g` 추가하고 **3개 호출부**(select_seeds sort /
  nodes sorted / candidates sorted) 전부 `lambda it: _rank_key(g, it)`로. rank: stable0<reviewed1<
  draft2<none3, 다중값이면 `min`(더 성숙 우선). **IRI가 최종 총순서 키로 남아 determinism 유지**.
  traverse heap(`(-s,str(n),n)`)은 BFS admission이지 최종랭킹 아님 → 손대지 마(budget 영향).
  DEPRECATED_RANK_FACTOR는 score 승수(별개 축) → 무관.

- **B11 capacity-fit 축 (validate.py)**: `ho:Agent` cognitiveCapacity 있으면 Σ(agentObservation→
  ObservationSpace→hasAreaOfObservation→observedTokenVolume) ≤ capacity, 초과=**하드 FAIL**.
  TBox 경로 확인됨(harness.ttl L281-283 chain, L745/751 datatype). 현재 5 agent 전부 cap150000에
  7500~13500 → 여유 큼(안전). `run_structured` `hard_ok`에 AND, summary dict에 축 추가.
  negative control=인메모리 copy에서 한 aoo volume 999999로 set→ok=False 확인(디스크 무변경).
  ★디스크 그래프 수정 없이 검증: `g.set(...)` 후 `check_capacity_fit(g)` 직접호출.

- **B12 ONTOLOGYSTYLE 예외 1줄**: §1c promptText 자기완결 [권장] 아래 — 하네스 주제가
  ho: 자신(techdoc)이면 지시문/템플릿 본문에 ho: 용어 허용(자기완결 계약의 명시적 예외).

게이트 결과: validate PASS(232 individuals, capacityFit 5 agents) · check_determinism PASS ·
probe "coordinator peer..." `\bid:` md0/json0 · B2 tie-group maturity 비감소 0 violations.
