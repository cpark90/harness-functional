# Phase 0 형식화 문서 (평면×자산 매핑) — 저작 레시피와 실측 상수

산출물: `docs/plans/plane-editor-phase0.md` (신규 구현 0, 순수 추가 1파일).
브리프 유형: "기존 lane을 코드에 매핑하고 재사용 경계를 명세하라" = **코드 인용이 곧 산출물**.

## 1. 이 유형의 핵심 규율 — 주장 단위 = file:line

- 매핑표의 각 칸이 하나의 검증 가능한 주장이다. "진리 판정 메커니즘" 칸은 **개념어가 아니라
  실제 함수/게이트 이름 + 줄번호**로 쓴다(`validate.check_shacl (validate.py:39-58)`).
- 줄번호는 **인용 직전에 재확인**한다. docstring 문장 하나를 인용할 때도 시작/끝 줄이 1~2줄
  어긋나기 쉽다(예: 모듈 docstring 마지막 문장은 `"""` 닫는 줄을 포함하면 안 된다).
- 문서 규약을 인용할 때는 **규약 텍스트와 실사용을 각각 측정**해 대조한다 — 이 대조가
  GAP 목록의 가장 강한 근거가 된다(§3 참조).

## 1b. 재dispatch — "신규 파일"이라는 브리프가 이미 있는 파일을 가리킬 때

같은 브리프가 **두 번** 왔다(2차 브리프도 "신규 파일 … 하나만"이라고 적혀 있었지만, 그 파일은
이미 커밋 `1406d87`에 land되고 그 뒤 미커밋 정제까지 얹혀 있었다). 이럴 때 **다시 쓰지 않는다**:

1. `git log --oneline -- <path>` + `git status --porcelain <path>` + `git diff HEAD -- <path>`로
   **이미 있는가 / 커밋됐는가 / 누가 뭘 더 얹었는가**를 먼저 판별한다.
2. 기존 산출물을 브리프 요건(1~5)에 **역매핑**해 충족 여부를 확인한다. 충족돼 있으면 남은
   가치는 **인용 재감사 + 표류한 수치 갱신**이지 재작성이 아니다(재작성은 검증된 인용을 버린다).
3. 상황을 orchestrator에 보고한다 — 재dispatch였다는 사실 자체가 orchestrator의 상태 추적에
   필요한 정보다.

**인용 재감사 방법**: 문서에서 `` `path:NN[-MM]` ``을 정규식으로 뽑아 해당 줄을 그대로 출력하는
15줄짜리 스크립트를 scratchpad에 만들고 basename→실경로 ALIAS 표를 둔다. **주의**: 문서가
연속 인용을 `` `:296-303` ``처럼 **파일명 없이** 적는 관용이 있어 정규식이 놓친다 — 그런 bare
참조(특히 §계약 코드블록의 시그니처 줄번호)는 **따로 손으로 뽑아 확인**해야 한다.

실측 결과(약 5커밋이 지난 뒤): 코드·TTL·규약 문서의 `file:line` 인용은 **전건 그대로**였고,
움직인 것은 **개수뿐**이었다(`docs/verify/` 41→42, `tools/plane-editor/` 부분→완성, inquiries
`closed` 항목이 refresh로 소멸). §2의 "개수는 척추가 아니다" 원칙이 정확히 이 형태로 회수됐다.

## 2. 병행 세션 워킹트리에서의 수치 인용 (이번에 실제로 물린 함정)

작성 도중 다른 세션이 같은 트리를 편집해 **262→269 individuals / 6,994→7,134 triples**로
변했고, `docs/feedback` 항목 수는 inspection refresh로 줄었으며, Phase 1 디렉토리
(`tools/plane-editor/`)가 "없음"에서 "있음"으로 바뀌었다.

대응 패턴(그대로 재사용할 것):
1. 개수는 **주장의 척추로 쓰지 않는다**. 척추는 구조(무엇이 무엇을 강제하는가)와 위반의
   *성격*이고, 개수는 각주다.
2. 그래도 쓸 거면 **2회 측정 + 시각 + "이동 표적" 주의 박스**를 함께 적는다. 두 측정에서
   동일한 수치(어휘 위반 16/1/13/1)는 그대로 신뢰해도 된다.
3. "지금 없다"류의 **부재 주장**은 특히 위험하다 — 부재는 몇 분 만에 뒤집힌다. 발견 즉시
   문서에 **관측 사실 + 관측 시각**으로 고쳐 쓰고, 남의 편집을 판정하지 않는다(vnv 소관).

## 3. 실측 상수 — webui write path 계약 (Phase 2+ 재사용 표면)

`plan_upsert(node, target_basename="authored.ttl", expected_mtimes=None) -> {file, old, new, created}`
(`tools/webui/ttl_writer.py:296-323`)

- **의미 검사 0**: "persistence here is purely textual"(`:20-21`). 게이트는 쓰기 **후**
  `validator.run_structured()` + 실패 시 `restore` 롤백(`server.py:205-215`) — 즉
  plan_upsert 자체를 "게이트"라고 부르면 틀린다.
- **저장은 MERGE**: authoritative 집합 = `payload 키 ∪ _managed`, 나머지 on-disk 술어는 보존
  (`:177-206`, 기본값 `:193-195`).
- **낙관적 잠금 키 = ABOX_DIR 상대경로**(basename 아님 — 그룹 디렉토리 동명 파일 때문,
  `server.py:111-118`, `ttl_writer.py:287-293`), 불일치 → `Conflict` → HTTP 409.
- **게이트 분류(중요)**: 하드 6축만 롤백(`validate.py:326-327`) / `duplicates`는 advisory라
  **조용히 저장됨**(`:287-289`,`:372`) / **`lint_uniformity`는 write path에 아예 없다**
  (`server.py:38-42`) → **cap 260 초과 노드는 webui로 저장되고 CI에서야 잡힌다**.
- **subject 인식 범위**: 블록 스캐너가 `^(id:[...])`만 본다(`:59`,`:238-254`) + `ABOX_DIR`
  고정(`:33-34`) → 중앙 `core` 도메인 밖·`<full IRI>` subject는 못 찾고 신규 append로 빠진다.

## 4. 5평면의 repo 대응물 (한 줄 색인)

주석=`docs/feedback/`(기계 강제 0) · 설계결정=`DESIGN.md`+`verified/`(사람 승인) ·
프로토콜=TBox+shapes(pyshacl) · 인터페이스=**부분 대응만**(`ho:Contract`+`verify_contract.py`,
타입 체커·심볼 앵커 없음) · 지식그래프=`abox/`(하드 6축). 횡단 lane 2개: 읽기 투영
=`retrieve.py`(budget 900, 전순서 키, determinism 게이트), 쓰기 게이트=webui(§3).

## 5. 문서 lane 어휘 drift (측정으로 드러난 실제 GAP)

`docs/feedback/verified/README.md`는 `verdict` 3값(`apply`/`apply-with-changes`/
`needs-decision`, `:10`)만 정의하는데, 실사용은 **`verdict: done` 13건**(최빈값!)·
`apply-plan-ready` 1건이고, 정의조차 없는 **`status: reported` 16 / `finalized` 1**이 쓰인다.
→ 22 항목 중 **14건이 미정의 값**. 이 비율은 항목 refresh를 거친 **세 차례 측정에서 모두
유지**됐다 — 즉 개수(움직임)와 달리 **정착된 성질**이라 그대로 인용해도 안전하다.
→ 문서 lane도 "어휘 정의 vs 실사용" 대조를 돌리면 그래프의 anti-drift와 같은 종류의 결함이
나온다. 채널 규약 문서를 만질 일이 있으면 이 대조를 먼저 돌릴 것(정정 방향=설계 결정이라
orchestrator 소관).
