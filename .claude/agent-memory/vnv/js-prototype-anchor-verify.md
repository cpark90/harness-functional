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
