---
status: approved            # 사용자 승인 2026-08-27, 선택지 (a) — 1·3·4 일괄 적용, 2는 유지 결정
targets: [id:wf-compose-harness]
---
# 용어 정립 잔여 결정 요청 (orchestrator)

용어 정립 항목(`verified/terminology-ontology-vs-knowledge-graph.md`, 적용 완료)의
선언 범위 밖에서 발견된 잔여 4건. vnv 판정(`docs/verify/terminology-apply-verify.md`
notes N2~N4)이 근거이며, 전부 비차단이라 적용 단위의 done을 막지 않는다.

## 결정 요청

1. **Golden rule 1 문구 쌍** — `CLAUDE.md` Golden rule 1 "Never load the whole
   **ontology** into context"와 쌍둥이 문구(`CLAUDE.md`:23, `ONTOLOGYSTYLE.md`:83)는
   실제로 적재를 막는 대상이 knowledge graph(데이터)이므로 새 규약상 "the whole
   stored graph"가 정확하다. **vnv 권고: micro-dispatch로 교정.** Golden rule은
   운영 규칙 문면이라 승인 없이 손대지 않았다. → 승인 시 developer dispatch 1회.
2. **`docs/DESIGN.md` 제목** "a harness ontology that scales without rot" —
   스케일하는 쪽은 KG이나 repo 명칭·문서 정체성과 얽혀 있다. **권고: 유지**(변경 불필요
   결정으로 종결).
3. **`id:wf-compose-harness` `ho:tokenEstimate` 57 → ~115 갱신** — 정의문 실측 대비
   과소(HEAD부터 stale, 이번 편집으로 +10토큰). §1c 위반은 아니고 pack 절단도 없음
   (vnv 확인). **권고: 갱신**(리터럴 1건, developer dispatch에 1번과 묶어 처리 가능).
4. **`docs/DESIGN.md` §Terminology의 "87 files" 인용치** — vnv 재측정 93(제외 집합
   차이). cosmetic. **권고: "~90 files"류로 완화하거나 유지.**

## 선택지

- (a) 1·3·4 일괄 승인 → developer dispatch 1회로 처리, 2는 유지 결정 기록.
- (b) 1만 승인 (3·4 보류).
- (c) 전부 보류 — 현상 유지 결정으로 종결.

## 사용자 피드백
(a)

## 적용 결과 (orchestrator 기록, 2026-08-27)

선택지 (a)대로 developer dispatch 2회(본 적용 + 쌍둥이 잔여 정합)로 적용 완료.

1. **Golden rule 문구 정밀화 적용** — "the whole ontology" → "the whole stored graph":
   `CLAUDE.md` rule 1·rule 3("fix the nodes you changed"), `ONTOLOGYSTYLE.md` §1c [지킴],
   추가 발견된 쌍둥이 `CONTRIBUTING.md`:48, `docs/composition-methodology.md`:94까지
   **4개 문서 표현 일치** (grep 재확인 잔여 0). "stored graph"는 `observation.ttl`
   `ho:observedFileScope`가 이미 쓰던 표현이라 그래프-문서 일치.
2. **DESIGN 제목 유지 결정** — 변경 불필요로 종결 (repo 명칭·문서 정체성).
3. **`id:wf-compose-harness` `ho:tokenEstimate` 57 → 115 적용** — rdflib 실측 460자/4
   (§1c는 산식 미규정, chars/4 채택 — developer 메모리에 규약화). retrieve 재확인
   budget_used 898/900, 팩 절단 없음.
4. **"87 files" → "~90 files" 근사 표기 적용** (31건도 "about a third"로).
- 검증: TTL 변경 시점 `validate.py`·`lint_uniformity.py` **PASS**. 이후 마크다운 2줄
  편집 뒤 재실행에서 FAIL이 관측됐으나 원인은 **동시 세션이 워킹트리에 추가 중인
  미배선 guardrail 4건**(`gr-instance-isolation`/`gr-mode-fit`/`gr-user-elicitation`/
  `gr-work-claim`, HEAD에 없음 — 본 항목 델타는 md 4파일 + tokenEstimate 리터럴 1건뿐,
  guardrails.ttl 미접촉). 앞서 `gr-online-execution`과 같은 패턴으로 해당 세션의
  harness 배선 완료 시 해소될 소관.
