---
source: docs/feedback/webui-save-drops-triples.md
verdict: apply
targets: [tools/webui/ttl_writer.py, tools/webui/server.py, tools/ontology_lib.py]
---
# 검증 보고 — web UI 저장 데이터 손실 (B13·B14·B15) 승인분

사용자 승인(`status: approved`). **미적용 상태 확정** 후 적용 계획을 orchestrator에 넘긴다.
이 결함은 온톨로지가 아니라 **web UI 쓰기 경로**(tools)에 있으므로, 반영도 developer dispatch로
수행한다(orchestrator 계획). inspection은 재현·판정만.

## 미적용 실측 (2026-07-25, read-only)
- `ttl_writer.ORDER` **여전히 28종** (`python3 -c 'import tools.webui.ttl_writer as w; len(w.ORDER)'` → 28).
- `server.py:52 DATA_PREDS` **여전히 7종**, `:169`에서 그 7종만 응답.
- `_replace_block()`(`ttl_writer.py:140`)은 **블록 통째 치환** — merge/passthrough 흔적 없음.
- verified 채널에 B13/B14/B15 완료 보고 **없음**. ⇒ 승인됐으나 **적용 전**. **refresh 대상 아님.**

## 파급효과 (impact)
- **그래프 무영향**: 세 결함 모두 도구 코드다. 디스크 TTL·TBox·shapes 불변. 따라서 `validate.py`
  축의 회귀는 없다 — 이 결함이 위험한 이유가 바로 그것이다(**validate가 절반만 막는다**: 손실 후에도
  PASS하는 개체 27이 조용히 데이터를 잃는다).
- **손실 규모(항목 실측 재확인)**: 205 개체 GET→SAVE 왕복에서 **82 개체 · 375 트리플 · 56 술어** 소실
  범위. 그중 **조용히 성공하며 사라지는 개체 27(131 트리플)** — validate가 못 잡는 부분이 적용의 핵심 근거.
- **B14**(`INSTANCE_LINK_PREDICATES` 9종 누락, 78 edge)는 그래프뷰·retrieve 전파 가시성 문제로
  §B16 "레지스트리 표류" 계열과 같은 뿌리다 — 개별 패치보다 "사본==원본" 불변식 CI가 근본책(OPEN-ISSUES B16).

## 정합성
- 반영은 TBox `ho:` 술어 **97종**(ObjectProperty 57 + DatatypeProperty 40)을 쓰기 경로가 전부 다루게
  하거나(레지스트리 대신 TBox에서 생성), `_replace_block`을 **치환이 아니라 merge**로 바꾸는 것.
  둘 중 **TBox에서 생성**이 B16 불변식과 정합적이다(리터럴 사본을 또 만들지 않는다).
- 반영 후에도 `validate.py` PASS는 자명(그래프 무변경). **진짜 게이트는 회귀 테스트**: 205 개체 전부
  GET→SAVE 왕복 후 트리플 수 불변(손실 0)을 확인하는 스모크. materialize의 byte-identity 게이트와 같은 성격.

## 적용 계획 (orchestrator 실행용, developer dispatch)
1. **B13**: 쓰기 경로가 TBox 술어 전체를 다루게 한다 — `server.py`의 노드 응답을 `DATA_PREDS` 화이트리스트가
   아니라 **해당 개체의 실제 리터럴 술어 전부**로, `ttl_writer.render_block`을 `ORDER` 고정 목록이 아니라
   **TBox 술어 순서로 생성**. `_replace_block`이 목록 밖 술어를 버리지 않게 한다.
2. **B14**: `INSTANCE_LINK_PREDICATES`에 누락 9종(`channelParticipant`·`observesMemory`·`observesChannel`·
   `agentFunction`·`hasChannel`·`agentRole`·`hasAgent`·`observesComponent`·`hasMemory`) 추가 — 단, B16 권고대로
   **TBox 파생**으로 근본 해소하면 재발이 막힌다.
3. **B15**: `abox_mtimes()`가 basename 대신 **전체 경로**를 키로(그룹 디렉토리 재조직 후 basename 충돌 가능).
4. **회귀 가드**: 위 왕복 스모크를 `check_determinism.py`와 같은 층에 추가.
5. **커밋 전 게이트**(B13 살아있는 동안 유지): 반영 전까지 web UI로 기존 노드를 저장하지 말 것.

## 판정
**apply** — 승인됨, 미적용 확정, 그래프 무영향(회귀축은 그래프가 아니라 왕복 무손실 스모크).
B16 "레지스트리 표류" 불변식과 함께 계획하면 B13/B14가 근본 해소된다. orchestrator가 developer dispatch로 적용.

---
## 적용 결과 (applied — custody transfer, inspection, 2026-07-25)

이 보고서는 판정 당시 "미적용"으로 기록됐으나 그 뒤 developer dispatch로 세 결함 모두 반영·land됐다.
refresh(항목·보고서 제거) 전에 적용 결과를 여기 옮겨 git 이력에 custody를 남긴다.

**중앙 커밋**: `19a8cc6` ("Fix web UI save data-loss (B13 merge-not-replace, B14 TBox-derived link
predicates, B15 relpath mtime key)"). 5 files changed, 268 insertions, 77 deletions. **tools only —
`ontology/` 무변경.**

- **B13 (데이터 손실)**: `ttl_writer` 저장을 whitelist block overwrite → **MERGE**로. `ORDER`는 emit
  순서만 고정하고, 편집기가 건드리지 않은 술어는 디스크에서 읽어 그대로 재emit → 저장이 목록 밖 술어를
  조용히 버리지 않는다. no-touch 저장의 round-trip 트리플 diff = 0 (read-only 표본 재현).
- **B14**: server link predicate를 하드코딩 상수 대신 **TBox ObjectProperty 집합**(`link_predicates(g)`,
  `tools/ontology_lib.py:60`)에서 파생 — 신규 object property가 도구 코드 수정 없이 잡힌다(B16 표류 차단).
- **B15**: mtime 충돌 키가 basename이 아니라 **파일 relpath**(`tools/webui/server.py:117`,
  `tools/webui/ttl_writer.py:290`) — 그룹 디렉토리 재조직 후 basename 충돌 해소.

**검증**: `validate.py` PASS @225 (그래프 무변경이라 자명), `check_determinism.py` PASS. 현행 트리에서
`link_predicates`·relpath 키 반영 확인. **판정: 적용 완료 — refresh 대상.**
