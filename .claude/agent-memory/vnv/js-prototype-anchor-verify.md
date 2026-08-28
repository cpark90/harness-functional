# JS 프로토타입(비-온톨로지) 판정 절차 — plane-editor 앵커 엔진 유형

대상이 `ontology/`가 아니라 `tools/<proto>/` 안의 node 프로토타입일 때. 온톨로지 축
(validate/retrieve/HarnessShape/tokenEstimate)은 **회귀 확인용으로만** 쓰이고, 판정 무게는
전부 "**보고 수치가 재현되는가 + 기계가 실제로 옳은 일을 하는가**"로 옮겨간다.

## 1. 재현·대조 3단 (developer 자기보고는 신뢰 대상 아님)

1. **suite 3회 재실행 → 산출물 sha256** (`for i in 1 2 3; do node <suite>; cp <artifacts> $SCRATCH/run$i; done`).
   결정론은 "동일 프로세스 내 2회 반복"(스위트 자체 G3)이 아니라 **별 프로세스 3회**로 재야
   의미가 있다. cwd 무관도 같이 본다(repo root에서 실행).
2. **★ HEAD 커밋본과 해시 비교**: `git show HEAD:<artifact> | sha256sum`. 일치하면
   "developer가 낸 표 = 내가 재생산한 표"가 한 줄로 증명된다. `git diff --stat HEAD -- <dir>`이
   빈 출력이면 내 재실행이 커밋본을 byte 단위로 재생산했다는 뜻(가장 강한 G3 증거).
3. **집계 독립 재계산**: 리포트 표를 믿지 말고 `suite-result.json`의 **원시 시행 필드**
   (`trials[].lanes[].text` vs `trials[].expected.text`)에서 outcome을 **내 코드로 재분류**하고
   보고된 `outcome`과 대조해 MISMATCH를 출력시킨다. 스위트가 자기 분류기로 자기 표를 만드는
   구조라, 이 재분류가 없으면 "내부 일관성"만 확인한 셈이 된다.

## 2. 측정 정의의 함정 — "레인"을 누가 골랐나

브리프가 "생존 100%"만 쓰고 **앵커를 언제 캡처한 것으로 볼지**를 안 정하면, 구현자가 유리한
정의를 고를 수 있다. plane-editor는 3레인(live / pipeline=저장시 재캡처 / stale=편집 전 앵커)을
전부 실었고 **pipeline으로 게이트**해 100%, stale은 93.3%였다.
- 확인법: 시행 레코드의 `mode` 필드 히스토그램(`recaptured|preserved|round-trip`)을 본다.
  `recaptured`면 **편집 후에 다시 딴 앵커**를 같은 문서에서 해소하는 것이라 그 시행이 증명하는
  건 "저장 selector 내구성"이 아니라 "세션 안 Decoration이 편집을 따라감"이다(거의 자동 통과).
- 판정: 부정이 아니라 **레인 선택이 게이트를 가른다는 사실을 명시**하고 orchestrator에게
  확정을 요구한다(pass-with-notes). 미달분이 "1자 경계 드리프트"인지 "딴 데 부착"인지는
  반드시 분리해서 적는다.

## 3. ★ 오해소(mis-resolution) 검증 = 텍스트 채점을 위치 채점으로 바꾸는 것

앵커/링크 계열 채점기는 대개 `resolved.text === expected.text`(byte 비교)다. 같은 문자열이
문서에 2회 있으면 **엉뚱한 출현에 붙어도 "생존"으로 집계**된다.
- 반드시 **위치로 재채점**: PM position → text offset(`posToOffset(buildTextIndex(doc), from)`)
  으로 바꾼 뒤 "정답 출현의 offset"과 비교. (plane-editor는 위치로 재채점해도 S6/함정앵커가
  올바른 출현에 붙었다 = 보고가 참이었다.)
- 그다음 **스위트 밖 편집 모양을 주입**한다. 시나리오 표는 항상 구현자가 통과시킨 모양의
  집합이므로, 결함은 그 밖에 있다. 실제로 잡힌 2종:
  - **블록 통째 삭제**: RelativePosition이 `collapsed`가 아니라 **`unresolved`(null)** 로 죽어
    tombstone 규칙(=collapsed일 때만 quote 복구 금지)을 우회 → 살아남은 같은 문자열에 부착.
  - **제자리 교체**(삭제 후 즉시 타이핑): affix guard가 `head>0 || tail>0`이라 **1문자** 우연
    일치로 무관한 새 텍스트에 부착. 대조군(공유 글자 0인 교체)이 orphan이 되는 걸 같이 보여야
    "guard 강도 = 1문자"가 증명된다.
- **완화 규칙 통과 경로를 기록**: quote 후보 채택이 `both-affix`인지 `unique-one-affix`인지.
  MIN_AFFIX=4 같은 임계는 자연어에서 `" an "`·`" record"` 조각으로 충족되므로 **affix 일치는
  동일성 증거가 아니다**(오부착이 정규 경로로 통과한 실사례).
- **수리 가설도 반증해 둔다**: "CRDT delete set을 보면 되지 않나" → 블록 삭제와 블록 이동
  **둘 다** 원 item이 `isDeleted: true`라 구분 불가. 이걸 재면 Phase 2 브리프가 헛다리를 안 짚는다.

## 4. 스키마/격리 게이트는 **런타임 객체**로 다시 잰다

"스키마에 annotation mark 0"류는 스위트가 자기 헬퍼(`buildSchema([...content, Plugin])`)로
재는 경우가 많다. 독립 확인은 **실제 실행 중인 editor의 `editor.schema`**를 덤프해
① 이름 패턴 매칭 0 ② content-only fingerprint와 동일 ③ 부착 후 doc JSON·CRDT state 불변
④ doc 콘텐츠에 붙은 mark 0 ⑤ **레코드 id·body 문자열이 doc/CRDT 바이트열에 누출 0**까지 본다.

## 5. 잡다한 재현 팁

- 증거 스크립트는 `docs/verify/<slug>-adversarial.mjs`로 남긴다(내 파일 경계 안). 대상
  디렉토리의 모듈을 **절대경로로 import**하면 bare specifier(`yjs` 등)는 그 모듈 위치 기준으로
  풀리므로 `node_modules` 걱정이 없고 프로토타입 디렉토리를 건드리지 않는다. yjs 내부 API가
  필요하면 `<proto>/node_modules/yjs/dist/yjs.mjs`를 직접 import.
- 언어 정책(G5)은 스위트가 **손으로 쓴 파일 목록**만 스캔한다 → 나는 `node_modules` 제외
  **전수**(생성물 포함)로 다시 스캔한다. `https://…invalid/`(RFC 2606) 같은 jsdom base URL은
  네트워크 아님. 비결정성 스캔은 `Date.now|new Date|Math.random|process.env`.
- 리포트가 인용한 벤더 소스(`node_modules/**/*.js:줄`)는 `awk NR>=S&&NR<=E`로 원문 대조한다
  (실제로 3건 중 2건은 줄번호까지 정확, 1건은 함수명만 맞고 줄번호 미제시였음).
- 병행 세션 주의: 판정 도중 inspection이 대상 산출물을 커밋할 수 있다(HEAD가 바뀜). 해시가
  일치하면 내용 문제는 아니므로 **"게이트→land 순서 어긋남"만 사실로 기록**한다.

## 6. 후속 판정(C1 = 수정본 재검증) 때 추가로 얻은 것

앞 절(1~5)이 "Phase 1 원본 판정" 절차라면, 이 절은 **내가 낸 결함을 developer가 고쳐 온 뒤**의
재판정 절차다 (`docs/verify/plane-editor-c1-verify.md`).

1. **★ 반사실은 "코드 안 대조군"이 아니라 `git worktree`로 잰다.** 강화 커밋은 대개
   `POLICIES.phase1` 같은 **자기 재구현 대조군**과 counterfactual 수치를 함께 낸다 — 그건 같은
   저자가 "옛 규칙은 이랬다"고 주장하는 것이라 증거로 약하다. `git worktree add --detach HEAD`
   (수정 전 커밋)로 **옛 엔진 자체**를 꺼내고 `ln -s <abs>/…/node_modules`만 걸어 새 fixture·새
   편집을 그대로 먹여 돌린다. 두 수치가 일치하면(여기선 앵커 9 × 저장레인 2 = 18 = 보고값 18)
   "재구현 대조군이 실제 과거 동작과 같다"가 증명되고, 어긋나면 그 자체가 결함이다.
   fixture/edit 정의는 **데이터라 새 것을 써도 됨** — 옛 worktree의 코드에 새 JSON을 먹이면 된다.
2. **판별력 있는 시행 수를 따로 센다.** "12시행 오해소 0"이라도 옛 엔진에서 **원래 orphan이던
   시행**(여기선 S9 b3·b4·b6)은 아무것도 증명하지 않는다. 12 중 9만 판별력 있음을 밝혀야
   "강화가 실제로 막은 양"이 나온다.
3. **레인 수 부풀림 확인**: `mode: preserved`면 `pipeline`이 `stale`의 **결과 객체를 재사용**한다
   (runPerAnchor). "전 레인 36측정"은 실제로 12(live Decoration)+12(저장 selector)를 두 번 센 값.
   게이트 문구는 "독립 계산 N회"로 쓰게 권고한다.
4. **★ 새 방어가 "데이터 의존"이 되면 하위호환 구멍을 반드시 찌른다.** 방어의 핵심 항이 새
   selector(여기선 `blockContext`)에 의존하는데 `STORE_VERSION`이 그대로면, **옛 레코드를 그대로
   로드**해 그 항이 `known:false`로 무력화된다. 재현법: 캡처한 레코드에서 새 필드만 지운
   사본으로 같은 편집을 돌려 옛 결함이 부활하는지 본다(여기선 `Critical failure`→`Cure` 부활).
   `!evidence.known || …` 같은 **"모르면 통과" 기본값**이 있으면 그 자리가 항상 표적이다.
5. **규칙의 전제를 무너뜨리는 편집을 만든다(단순 반복 금지).** 블록 정체성 복구가
   "같은 텍스트 + 캡처 이후 생성 + 유일"이면 그건 **정체성이 아니라 텍스트 동일성**이다 →
   ① 쌍둥이 블록을 이동시키고 앵커 블록은 삭제 ② 원격 피어(캡처 state vector에 없는 client는
   `isCreatedAfter`가 무조건 fresh)가 같은 문장을 새로 작성 ③ 삭제 후 같은 문장 재타이핑 —
   셋 다 오해소가 재현됐다. 편집 **순서를 뒤집은 변형**과 **한 글자 바꾼 대조군**을 짝으로 넣어야
   "순서 산물/우연"이 아님이 증명된다.
6. **precision만 재는 게이트에는 recall 손실을 같이 잰다.** 오해소 0을 만드는 강화는 늘
   정상 편집도 죽인다 — 범위 안 부분 재작성(`Critical failure`→`Critical outage`)이 orphan,
   이동 중 블록 1자 변경·NFD 정규화로 복구 상실. 대조 실행은 새 코드의 `policy` 인자로 옛 정책을
   같은 세션에서 돌려 `lostBecauseOfHardening` 플래그로 뽑으면 싸다.
7. 산출물이 이미 커밋돼 있어도(병행 inspection) **내 3회 재실행 해시 = `git show HEAD:` 해시**면
   판정 유효. `git diff --stat HEAD -- . ':(exclude)<대상디렉토리>'`로 경계를 재고, 남은 변경은
   병행 lane 소유임을 커밋 로그로 귀속시킨다.

## 7. 재판정 2회차(C1b = 내가 낸 4종을 고쳐 온 뒤) — §6에 더해 얻은 것

`docs/verify/plane-editor-c1b-verify.md`. §6이 "1차 수정본 재판정"이라면 여기는 **2차**,
즉 방어가 절대원칙("오부착 불허·의심스러우면 orphan")으로 굳은 뒤의 판정이다.

1. **★ 재실행 전에 디스크본을 먼저 해시하라.** 스위트를 돌리는 순간 developer가 남긴
   산출물을 덮어쓴다 → "developer의 디스크본 == 내 재생성본"을 영영 대조할 수 없다.
   대체 증거(4회 byte-identical + schema-dump 해시가 이전 판정과 동일 + stdout 게이트 줄이
   자기보고와 일치)는 되지만 한 줄 증명보다 약하다. `sha256sum <artifacts>` 먼저.
2. **★ 반사실은 이제 "옛 엔진 25/30"처럼 새 시나리오군 전체에 먹여라.** 스위트가 자기
   대조 정책(`textmove`)을 실어 와도 그것은 **정책의 값이지 옛 엔진의 값이 아니다** —
   실측하면 양방향으로 어긋난다(원격 피어 시나리오: 대조군 0 vs 실제 옛 엔진 6/6,
   레거시 레코드 시나리오: 대조군 12 vs 실제 1/6). 차단 해제 근거로 인용할 수치는
   **worktree로 잰 값**이다. 덤으로 "판별력 없는 시행"이 몇 개인지도 그 표에서 나온다.
3. **★ 절대원칙형 방어는 precision을 다 닫고 recall로 새어 나간다 → recall 행렬을 만들어라.**
   쌍둥이 **없는** 문서(정답 자리가 유일)에서 흔한 편집 6조작을 돌려 strict/textmove/phase1/
   naive를 나란히 채점하면 "포기한 복구가 실제로 옳았을 것인지"가 수치로 나온다.
   plane-editor: 6조작 중 strict 생존 1, 앵커 텍스트가 그대로인데 orphan 5, 그 5건 전부
   더 약한 정책이면 정확 복구. **스위트에 없는 조작이 표적**이다 — undo, 앞 블록으로 병합
   (줄머리 Backspace), 문단 분할(Enter). 특히 **undo**: Yjs UndoManager는 삭제를 새 item으로
   재삽입하므로 문서는 완전 복원돼도 정체성 기반 앵커는 **영구 orphan**이다.
4. **★ y-prosemirror UndoManager는 origin을 안 맞추면 조용히 아무 것도 안 되돌린다.**
   `trackedOrigins: new Set([binding])`·`[null]` 전부 무효 — 실측한 origin은 **`ySyncPluginKey`**
   (`ydoc.on('afterTransaction', tr => tr.origin)`로 확인). 안 맞추면 "undo 실험"이 그냥
   삭제 실험이 되어 **가짜 통과**가 난다. 프로브에 `undoActuallyReverted` 같은 자기검증
   플래그(편집 전 텍스트와 비교)를 반드시 넣을 것.
5. **★ "물리적으로 불가능"이라는 방어 논거는 모양을 바꿔 반증 시도하라.** plane-editor는
   "블록 이동과 재타이핑은 Yjs 업데이트가 byte 동일"을 근거로 이동 복구를 접었다.
   **2-트랜잭션 이동(delete 후 insert)에서는 참**이지만 **1-트랜잭션 이동에서는 업데이트가
   다르고 element item이 살아남는다** → 주장 자체는 과한 일반화. 다만 그 살아남은 item을
   조회하면 **다른 블록 내용으로 재사용**된 것이라(정체성 이전이 아니라 재활용) 결론은 유지.
   ⇒ 판정문은 "결론 유지 + 근거 표현 한정(2-tx 모양에서 측정됨)"으로 쓰는 게 정확하다.
6. **★ 방어를 조이면 표적이 편집 축에서 저장소 계약 축으로 옮겨간다.** "모르면 통과"를
   "모르면 거절"로 뒤집었으면 다음 표적은 **"아무 값이나 채우면 통과"**다: 레코드가 자기
   `capture.stateVector`를 들고 있고 엔진이 무조건 신뢰하면, v1→v2 마이그레이션이 SV를
   현재 값으로 채우는 순간 옛 오해소가 통째로 부활한다(실측). `STORE_VERSION`은 파일 안
   정수일 뿐이라 방어가 아니다 — **강등 경로만 쓰는지**를 테스트로 고정하라고 요구할 것.
7. **★ 문서 정체성 부재를 반드시 찌른다(링크 종단점 판정의 핵심).** 앵커 레코드에 문서 id가
   없고 `resolveAnchors(session, anchors)`가 "이 레코드가 이 문서 것인가"를 안 물으면,
   **같은 clientID로 만든 다른 문서**에 그대로 붙는다(프로토타입은 clientID가 고정 상수라
   충돌이 기본값; clientID가 다르면 `stored-item-unknown`으로 orphan). 링크는 문서 경계를
   넘는 객체라 이 검사 없이 종단점 바인딩을 허가하면 앵커 축의 안전이 새어 나간다.
8. **차단 해제 판정문 쓰는 법**: (a)해제/(b)조건부/(c)유지 중 **조건부를 고를 때는 조건마다
   "지금 값 / 해제 기준(수치)"** 두 칸을 채운다. 근거는 ① 차단 사유였던 결함 계열이 실측으로
   사라졌는가 ② 남은 결함이 **같은 계열인가 다른 계열인가**로 가른다(다른 계열이면 (c) 유지는
   과잉 — 같은 규칙을 더 조여도 recall만 잃고 위험은 안 준다).
