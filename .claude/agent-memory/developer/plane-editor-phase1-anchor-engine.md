# plane-editor Phase 1 — standoff 앵커 엔진 실측 (tools/plane-editor)

브리프: `docs/feedback/inquiries/tool_suggestion-phase1-brief.md`. Tiptap+ProseMirror+Yjs로
주석 평면 1개를 만들어 앵커 생존율을 재는 headless 스위트. 재사용 지식만 남긴다.

## 라이브러리 실측 (문서에 안 적힌 것들 — Phase 2 설계 전제)

1. **`absolutePositionToRelativePosition(pos, type, mapping)`는 3-arity**
   (`node_modules/y-prosemirror/src/lib.js:54`). assoc 인자를 받지 않고 내부에서 0으로 고정한다
   → 앵커 **끝 경계 삽입을 항상 범위 안으로 흡수**한다. Decoration(`inclusiveEnd:false`)과
   반대 방향이라 두 레인이 갈린다. assoc 변형(±1)을 넘겨도 **결과가 전부 같다**(무시됨) —
   결합 방향을 바꾸려면 `Y.createRelativePositionFromTypeIndex(ytext, i, assoc)`로 직접 만들어야 한다.
2. **PM step은 Yjs로 그대로 옮겨지지 않는다.** `sync-plugin.js`의 `updateYText`가 텍스트를
   `lib0/diff`의 `simpleDiff`(공통 prefix/suffix)로 비교해 삭제 범위를 정한다. 삭제 경계 양쪽에
   같은 문자(공백 등)가 있으면 결과 문서는 동일해도 **tombstone 경계가 한 칸 밀린다** →
   편집 전에 캡처한 앵커는 잔여 범위가 1자 어긋나게 해소된다(= 오해소 아님, 경계 드리프트).
   저장 시점에 살아있는 위치로 **재캡처**하면 사라지는 오차.
3. **원격 Yjs 업데이트는 전체 문서 replace로 적용된다** (`tr.replace(0, size, …)`,
   `_typeChanged`/`_forceRerender`). 그래서 병합을 받은 세션의 **Decoration은 전부 소멸**한다
   → live 평면은 원격 업데이트 후 저장 앵커로 **재수화(rehydrate)** 해야 한다. PM 블록
   cut+paste도 같은 이유로 Decoration 전멸 + RelativePosition은 null(tombstone 위치 미반환).

## 해소 정책 (오해소 0을 만든 두 규칙)

- **tombstone evidence**: RelativePosition이 `collapsed`로 풀리면 CRDT가 "그 문자들은 삭제됐다"고
  증언한 것 → **quote 복구를 돌리지 않고 orphan 확정**. 안 그러면 같은 문자열의 다른 출현에
  붙어 오해소가 난다(실측: 함정 앵커 1개 → 오해소 2건). "돌렸다면 어디에 붙었을지"를
  counterfactual로 같이 기록하면 규칙의 값어치가 수치로 남는다.
- **quote 채택**: prefix/suffix 양쪽 정합이 원칙, **exact가 문서에 유일할 때만** 한쪽 정합 허용.
  블록 이동은 앞 문맥이 통째로 바뀌므로 이 완화가 없으면 블록-머리 앵커가 전부 orphan.

## 측정 설계 (숫자 조작처럼 보이지 않게)

- **레인을 쪼개서 전부 싣는다**: live(세션 Decoration) / pipeline(저장 시 재캡처 → 재로드) /
  stale(편집 전 레코드를 편집 후 문서에 들이댐). 브리프의 "생존 100%"는 어느 레인인지 안 적혀
  있어서, 한 레인만 고르면 유리한 쪽을 고른 셈이 된다. 게이트 레인을 명시하고 나머지도 같은 표에.
- **drifted를 wrong에서 분리**: 해소 텍스트가 기대의 prefix/suffix면 경계 밀림(drifted),
  아니면 오해소(wrong). drifted는 통과로 세지 않는다 — 분류만 정확히 한다.
- bystander(대상 아닌 앵커)는 편집이 걸칠 수 있으므로 ok/residual/wrong으로 나눠야 오탐이 없다.
- **REPORT.md는 생성물**로 만들고 손으로 쓰지 않는다(수치와 산문이 어긋날 여지 제거).
  결정론: Yjs `clientID`를 호출자가 고정 + 시각·난수 금지 → 재실행 byte-identical.
- G5(언어 정책)는 기계화 가능: 손으로 쓴 파일 목록만 스캔해 ASCII+한글+기호 allowlist 밖
  문자 0을 확인(생성물은 제외해야 실행 순서에 안 흔들린다). en dash(U+2013)는 허용 목록에 필요.

## headless 환경

jsdom 전역 주입(`src/dom.mjs`) 후 `new Editor({element})`. Yjs 매핑은
`ySyncPluginKey.getState(state).binding.mapping`. 별도 프로세스 재로드는 `spawnSync(process.execPath, …)`로
자식 스크립트를 돌려 stdout JSON을 받는다(= "프로세스 재시작" 주장을 pid로 증명).
