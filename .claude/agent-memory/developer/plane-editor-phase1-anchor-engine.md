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

## 해소 정책 — 문자열 증거로는 오해소를 못 막는다 (Phase 1 → C1 개정)

Phase 1은 ① `collapsed`면 quote 복구 금지(tombstone) ② affix 겹침 1자 이상 guard ③ exact가
유일하면 한쪽 affix로 복구(unique-one-affix)였다. vnv가 **스위트 밖 평범한 편집 2종**에서
오해소를 재현했다: 블록 통째 삭제(RelativePosition이 collapsed가 아니라 **unresolved**로 죽어
①을 우회) / 제자리 텍스트 교체(②가 한 글자로 통과). 교훈: **affix 문자열 일치는 동일성 증거가
아니다** — `" an "`·`" record"` 같은 조각은 임계 4자도 우연히 넘는다. 대신 CRDT에게 물어야 한다.

- **삭제 증거를 세 갈래로 확장**: `collapsed`(문자 삭제 증언) / `resolved`인데 guard 거절(자리는
  살아 있고 내용만 바뀜 = 제자리 교체) / `error`. 이 셋은 **복구를 아예 돌리지 않고** orphan.
  복구 시도는 `unresolved`(블록 자체가 사라짐)일 때로 한정.
- **블록 정체성으로 삭제와 이동을 가른다**: CRDT delete set만으로는 둘이 같다(블록 삭제·이동
  모두 원 item이 tombstone). 앵커 레코드에 **BlockContext = {블록 텍스트, 블록 안 오프셋,
  블록 item id, 캡처 시점 state vector}** 를 저장하고, 복구는 "저장된 블록 텍스트와 **똑같고**
  **캡처 이후 새로 생긴**(state vector 기준 clock ≥ sv[client]) 블록이 **유일**할 때"만 허용.
  cut+paste는 새 XmlElement를 만들고(=새 item) 삭제는 안 만든다 — 이것이 유일한 판별점이다.
  살아남은 쌍둥이 블록은 캡처 때도 있던 **옛** 블록이라 자동으로 탈락한다.
- **guard = 구조 + 문자 출처 둘 다**: 구조는 `head + tail >= min(해소 길이, exact 길이)`
  (삽입 확장·삭제 축소는 통과, 무관한 새 텍스트는 탈락). 문자열만으로는 "가운데를 지운 잔여"와
  "짧은 교체어"가 같아 보이므로(`Critical failure`→`Cure`가 `C`+`ure`로 설명된다!), Yjs item을
  훑어 **범위 안에 캡처 때부터 있던 문자가 1자 이상** 남았는지 확인한다. 이 항이 S10을 전부 잡는다.
- **정책을 객체로 뽑아 대조군을 계속 돌린다**: `strict`(현행)/`phase1`(개정 전)/`naive`(tombstone
  없음)를 같은 함수로 계산해, 막힌 자리마다 "약한 정책이었다면 어디에 붙었을지"를 리포트에 병기.
  강화가 vacuous하면 이 수가 0으로 나와 스스로 드러난다(실측: phase1 18건·naive 20건 차단).
- 원칙은 **의심스러우면 orphan**. 그 대가(복구율 손실)는 측정해서 적는다: 블록을 고친 뒤 옮기면
  블록 텍스트가 달라 orphan, 앵커가 블록 경계를 걸치면 BlockContext가 없어 복구 미시도.

## Yjs 내부 접근 (문서에 안 적혀 있음)

- 블록 item id: `ySyncPluginKey.getState(state).binding.mapping`은 **Y type → PM node** Map이라
  뒤집어 쓴다(`ownerMap`). `ytype._item.id = {client, clock}` → `"client:clock"` 문자열로 저장.
  편집 후·재로드 후에도 PM node 동일성으로 조회된다. Tiptap이 붙이는 trailing 빈 문단은 매핑에
  없을 수 있으니 **null 허용**(= 증거 없음 = 복구 금지).
- state vector 비교: `Y.encodeStateVector(ydoc)` base64 저장 → `decodeStateVector`는 client →
  **다음 clock** Map. 모르는 client는 기준 0이라 "새 내용"이 된다(문서 재임포트 경로).
- 문자 출처: `type._start` 링크드 리스트를 훑어 `item.deleted` 건너뛰고 `item.content.str`
  (ContentString) 길이로 오프셋을 쌓고, `content.type`이면 재귀(YXmlElement→YXmlText).
  `constructor.name` 대신 **속성 duck-typing**으로 판별해야 번들 차이에 안 깨진다.

## 측정 설계 (숫자 조작처럼 보이지 않게)

- **레인을 쪼개서 전부 싣는다**: live(세션 Decoration) / pipeline(저장 시 재캡처 → 재로드) /
  stale(편집 전 레코드를 편집 후 문서에 들이댐). 브리프의 "생존 100%"는 어느 레인인지 안 적혀
  있어서, 한 레인만 고르면 유리한 쪽을 고른 셈이 된다. 게이트 레인을 명시하고 나머지도 같은 표에.
- **drifted를 wrong에서 분리**: 해소 텍스트가 기대의 prefix/suffix면 경계 밀림(drifted),
  아니면 오해소(wrong). drifted는 통과로 세지 않는다 — 분류만 정확히 한다.
- bystander(대상 아닌 앵커)는 편집이 걸칠 수 있으므로 ok/residual/wrong으로 나눠야 오탐이 없다.
- **REPORT.md는 생성물**로 만들고 손으로 쓰지 않는다(수치와 산문이 어긋날 여지 제거).
  결정론: Yjs `clientID`를 호출자가 고정 + 시각·난수 금지 → 재실행 byte-identical.
- **"오해소 0"은 항상 범위 한정으로 쓴다**: 생성기에 "측정된 시나리오·레인·시행 안에서만"을
  박고, **미측정 항목 표**를 같이 낸다. Phase 1이 무한정 주장을 했다가 스위트 밖에서 2종이
  재현된 것이 정확히 이 교훈이다.
- **적대 시나리오는 fixture를 따로 판다**: 쌍둥이 문장(동일 문맥/다른 문맥/한쪽 affix만 맞는
  문맥/쌍둥이 없음)을 앵커마다 다르게 배치해야 오해소 경로를 전부 한 번씩 누른다. 시나리오 정의에
  `fixture`를 달고 러너·리포트를 fixture별로 그룹핑하면 기존 표가 안 깨진다(앵커 id는 a*/b*로 분리).
- G5(언어 정책)는 기계화 가능: 손으로 쓴 파일 목록만 스캔해 ASCII+한글+기호 allowlist 밖
  문자 0을 확인(생성물은 제외해야 실행 순서에 안 흔들린다). en dash(U+2013)는 허용 목록에 필요.

## headless 환경

jsdom 전역 주입(`src/dom.mjs`) 후 `new Editor({element})`. Yjs 매핑은
`ySyncPluginKey.getState(state).binding.mapping`. 별도 프로세스 재로드는 `spawnSync(process.execPath, …)`로
자식 스크립트를 돌려 stdout JSON을 받는다(= "프로세스 재시작" 주장을 pid로 증명).
