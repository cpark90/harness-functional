# 링크 종단점 → 문서 위치 **바인딩** 판정 절차 (plane-editor 8차)

"레코드 id 까지만 가리키던 링크 종단점이 **문서 안의 자리**를 가리키게 됐다" 유형.
판정 축은 셋이다: ① 앞 판정이 건 불변식의 수치 재측정, ② **바인딩이 진짜인가**(가리키는
텍스트가 맞나 · 앵커가 두 벌인가), ③ **바인더 단독 판정의 fail-open** 사냥.

## 1. 앞 프로브 재사용의 정확한 경계

- 앞 판정의 반례 모양(M1·M1b·M2 = 문서 상태의 CRDT 내용만 손상)은 **무수정 재사용**한다.
  단 **링크 종단점에 `anchor` 를 실어야** 바인딩 경로가 돈다 — 스토어 모양은 그대로, 링크만
  바꾼다. 이 구분을 리포트에 명시해야 "무수정 재사용" 주장이 정직해진다.
- 프로브가 만드는 링크 스토어는 **id 오름차순 정렬 필수**. 안 하면 `store-format`
  ("records must be serialised in ascending id order") 이 튀어나와 도구 결함으로 오독된다.
- `bind-links` 는 **명령줄로** 돌려야 exit code 를 잰다(모듈 호출은 pass 불리언만 준다).
  판정 JSON 의 `counts.{loadStoreCalls,storesOpened,bound,orphaned,unbound}` +
  `annotationStores[].{opened,refusal,gate,bindings}` + `unbound[].reason` 이 증거 표면이다.

## 2. "바인딩이 진짜인가" 를 도구 밖에서 재는 법

- **좌표의 텍스트를 도구 index 로 다시 뜨지 말 것.** `loadStore` → `openSession` →
  **ProseMirror 자신의 `doc.textBetween(from,to,'\n')`** 으로 뜬다(독립 경로).
- **쌍둥이 함정 확인이 본체**: 그 문자열이 문서에 몇 번 나오는지 세고(`indexOf` 루프),
  레코드의 **캡처 prefix/suffix** 와 바인딩 자리의 앞뒤 문맥을 대조해 **어느 출현인지** 못 박는다
  (sample-state 의 `"honest orphan"` 은 2회 등장 — 첫 출현이 정답).
  `blockContext` 는 **CRDT item id** 가 캡처값과 같은지까지 본다.
- **파생성(사본 아님) 증명 2단**: (a) 코드 — 게이트가 종단점 키 집합을 닫는가
  (`check_links.py`: `set(ep) <= {plane,ref,document,anchor}` + `ENDPOINT_ANCHORS` 닫힌 집합),
  (b) 실측 — 문서 앞에 N 자를 끼우고 다시 바인딩해 좌표가 **정확히 +N**, 텍스트 불변인지.
  링크 파일은 손대지 않는다.
- 해소 정책 우회 확인은 grep 한 줄: 바인더에 `policy`·`quoteOnTombstone`·`naive` 가 0건이면
  기본 strict 다.

## 3. ★ 바인더 단독 fail-open 사냥 (이번의 수확 3건)

바인더가 "게이트 통과"를 **스토어별 규칙**으로만 좁게 잡으면 아래가 전부 열린다.

| 우회 | 왜 통과하나 | 실측 결과 |
|---|---|---|
| 같은 `documentId` 를 선언한 스토어 2개(디렉토리 **백업 사본**) | `annotation-store-duplicate-document` 는 **스토어 사이의 사실**이라 `PER_STORE_GATE_RULES` 에 일부러 없다 + 문서→스토어 선택이 `byDocument` **first-wins** | 게이트 exit 1 인데 바인더 **exit 0 · pass true**, 답이 **디렉토리 이름 순서로 뒤집힌다**(`backup` vs `zcopy` 로 두 번 재서 증명) |
| 게이트 전역 exit 1(예: 그래프에 없는 링크 타입) | 바인더가 게이트 **전역 판정을 안 본다** | 바인더 exit 0 · pass true · 바인딩 1 |
| `anchor: "constructor"` 등 **Object.prototype 키** | `TABLE[name]` 이 상속 키를 함수로 돌려준다(`Object(session)` 이 truthy) | `state:"bound"` 인데 `from/to/text` **필드 자체가 없음** · exit 0. `__proto__`·`toString` 계열은 `resolver is not a function` **exit 2 크래시** |

- 프로토타입 구멍은 `Object.keys(TABLE)` 로 하는 **파리티 검사(C12)를 통과한 채** 조회에서만
  인정된다 — 파리티가 항진명제가 아니어도 이 틈은 안 보인다. 판정 시 `Object.hasOwn(TABLE, k)`
  여부를 직접 찍어 보고, 프로토타입 키 7종을 전수 프로브한다.
- **일상성 논증에 쓸 우연한 증거**: 다른 프로브를 돌리려고 `tools/` 를 워크스페이스 안에
  복사하기만 해도 게이트가 `documentId '…' is declared by 2 annotation stores` 를 낸다.
  손 기입 없이 도달 = **경계 바깥 아님**.

## 4. 불변식 반사실 3종 (성질이 dead code 인지 가르는 자리)

트리 사본(`rsync -a --exclude node_modules` + `node_modules` 심링크 + `mkdir .git` +
`ontology/`·`catalog-v001.xml` 복사)에서 돌린다.

1. **CF-1 한쪽에만 새 규칙** → C9 가 스토어 이름을 대며 FAIL 해야 한다. **함정**: 코퍼스가
   밟지 않는 규칙은 아무것도 잡지 않는다(레코드 `body` 요구 규칙은 전부 body 를 가져서 무발화).
   **모든 v3 스토어에서 발화하는 술어**를 골라야 한다(예: `authority !== null` 이면 add).
   이 실패담 자체가 "성질의 범위 = 코퍼스가 밟는 모양" 이라는 정직한 관측이 된다.
2. **CF-2 `expectedDivergence` 부류 fixture 삭제** → 부류 검사가 `0 store(s) in the class` 로
   FAIL(전제가 주장이 아니라 측정값임을 증명).
3. **CF-3 부류를 게이트가 볼 수 있는 코드로 넓히기** → 그 스토어가 부류로 **흡수되지 않고**
   그대로 divergence 가 되어야 한다(전제가 조용히 넓어지는 것을 막는 자리).
   부류 판정이 `!gate.rejected` 를 요구하는 구조면 자동으로 성립한다.

## 5. 무회귀·형상 (이 lane 공통)

- 앵커 스위트는 트리에 산출물을 **덮어쓴다**: 실행 전 sha256 → 별 프로세스 3회 → 실행 전
  디스크본과도 동일해야 "트리의 표 = 내 재생산".
- HEAD 대비 `suite-result.json` 델타는 **`gates.G5` 문자수만** 허용(손으로 쓴 문서를 고치면
  ASCII/한글 카운트가 바뀐다). `scenarios`·`totals`·`lanes` 등은 한 값도 안 변해야 한다.
- 셀 1:1 은 `scenarios[].lanes{live,pipeline,stale}` 의 9필드(19×3=57셀), 오해소는 리포트 표가
  아니라 **원시 `trials[].lanes[].outcome` 재집계**(342 레인 · `wrong` 0 · 미측정 6).
- negative control 은 **개수 + 전건 "exactly 1 violation"**. 앵커 종단점 wave 에서 28→30
  (`negative-annotation-anchor-{unknown,missing}` 신설).
- `docs/verify/plane-editor-vocab-realign-probe.py` 는 **자기 완결적이지 않다** — 스크립트 옆
  `docs/verify/gc`(ontology+tools+catalog 사본)가 이미 있다고 가정한다. 만들어 주고 끝나면
  **반드시 지운다**(안 지우면 내 lane 에 잔여물 + duplicate-document 유발).

## 6. 고친 뒤 재판정 (9차 — "fail-open 3자리를 닫았다"를 판정할 때)

- **기준은 내가 8차에 적은 조건의 수치 그대로**(①②③ + negative control 33·각 "exactly").
  W1–W4·P·V 는 **무수정 재실행**하고, 이름 축(사본 이름 3종 + 3-스토어)·모양 축(숫자 키·빈
  문자열·비문자열·`prototype` 계열)으로 **내가 더 흔든다**.
- ★**역패치 반사실은 "전부"만 하지 말고 한 조각씩** 되돌려라. 세 수정이 **겹칠** 수 있다:
  이번엔 게이트 전역 판정(b)만 되돌려도 조용한 초록이 부활했고, 모호성(a)·own-key(c)만
  되돌리면 **여전히 0 바인딩**(사유만 전역 사유로 바뀜)이었다. 표 모양(`Object.create(null)`)과
  조회(`Object.hasOwn`)도 서로 덮어서 한쪽만 되돌리면 동작은 닫힌 채 **성질 검사만** FAIL 한다.
- ★그러면 (a)·(c) 가 dead code 인지 어떻게 가르나 — **게이트를 무르게 해서** 잰다.
  ① 게이트 사본에서 규칙 한 줄을 죽이고(`for … in index["duplicates"]` → `in []`,
  `anchor not in ENDPOINT_ANCHORS` → `False`, `anchor not in entry["parts"]` → `False`)
  ② 같은 프로브를 `VNV_PE_ROOT=<사본>/tools/plane-editor/` 로 돌린다(프로브에 root 오버라이드
  env 를 넣어 두면 파일 하나로 양쪽을 잰다). 게이트가 초록인데 바인더가 여전히 거절하면
  그 층은 홀로 이빨이 있다. ③ 코드 수정 없이 같은 것을 재는 법: **`HO_PYTHON` 위조 게이트**
  (violations 를 지우는 sh wrapper; `--emit-contract` 는 진짜 python 으로 넘겨야 한다).
- ★**전역 거절이 앞 판정의 증거를 덮는다**: 8차 프로브의 P4·P5 는 링크를 정렬하지 않아
  `store-format` 을 밟고 있었고, 옛 바인더가 전역 판정을 무시해서 결과가 나왔던 것이다.
  고친 뒤에는 `link-plane-refused-by-the-gate:store-format` 으로 덮이므로, **정렬한 스토어로
  다시 세워야** "+N 이동·쌍둥이 함정 orphan" 증거가 유지된다(= 앞 증거가 fail-open 경로에서
  나왔다는 사실 자체를 리포트에 적을 것).
- **남는 구멍의 단골 모양**: `if (!ep.anchor)` 처럼 **truthy 판정**이면 `""`·`0` 이 종단점
  집합에서 조용히 사라진다(`recordEndpoints` 로 셈, 사유 없음). 게이트가 닫고 있으면 오늘의
  소비자는 빨강을 받지만 "단독 fail-closed" 문구의 범위는 그만큼 좁다 — 게이트 퇴화 반사실로
  실증해 비차단 관측으로 낸다.
- **발견 전제의 빈 칸**: 격리 표식·이름 변경은 못 숨기는데 **심링크는 숨긴다**(정직한 스토어를
  워크스페이스 밖에 두고 링크로 들여오면 사본만 범위에 남아 조용히 사본이 답한다). 산출이
  `store` 경로를 찍으면 "조용한" 정도는 낮다 — 차단 말고 다음 wave 항목.
- **문구 검증은 늘어난 문구를 한 줄씩 실측 대조**(README 3종·docstring·종료코드·포인터 문서의
  `status`). 종료코드는 실제로 네 모양을 찍어 본다(알 수 없는 인자 2 · 없는 스토어 2 ·
  게이트 빨강 1 · 정상 0). 커밋된 negative fixture(`negative-bad-type`)로도 (b)를 재면
  scratch 없이 재현 가능한 증거가 된다.
- **코퍼스 floor 는 이빨을 확인**: 대조군 배열에 `.pop()` 한 줄 넣은 사본에서 `32 (floor 33)`
  FAIL 이 나와야 "줄어들면 FAIL" 이 참이다.

## §7 = 후속 3건 재판정 (10차, `docs/verify/plane-editor-binder-followups-verify.md`)

"직전 판정이 남긴 비차단 관측 N건을 닫았다" 유형. 기준은 **내가 직전에 적은 문언 그대로**
재적용하고, 각 항목마다 **(a) 재측정 (b) 내가 넓힌 새 모양 (c) 비공허성 반사실** 셋을 세운다.

- ★**"닫혔다"의 증명은 사례가 아니라 축**: Y6(심링크 은닉) 한 모양만 재면 수정이 그 모양에만
  맞춰졌는지 알 수 없다. **사슬**(링크->링크->밖) · **상대경로** · **사이클**(자기고리 + 두
  디렉토리 고리) · **세 이름**(진짜+심링크+심링크의 심링크)으로 넓혀라. 실제로 사슬·상대경로는
  9차 프로브에 없던 모양인데 HEAD 에서 **둘 다 조용한 초록**(사본의 답)이었다.
- ★**인과 귀속은 `git archive HEAD tools ontology catalog-v001.xml | tar -x`** 로 HEAD 트리를
  세우고 **같은 신규 프로브**를 `VNV_PE_ROOT`+`HO_TOOLS_DIR`+`HARNESS_CATALOG` 로 먹이는 것이
  가장 싸다(worktree 보다 가볍고, 새 프로브가 옛 코드에서 성립하는지도 같이 나온다).
- ★**서로 덮는 방어는 반사실도 각각**: 심링크 축은 `_walk`(따라가기)와 realpath 정규화(가짜
  중복 방지) 두 장치라 반사실도 둘 — 각각 되돌리면 C10 (8) / C10 (9) 이 **하나씩만** FAIL
  해야 서로 안 덮는다는 증거가 된다. 사유 우선순위는 반대로 **한 반사실이 6건을 동시에**
  FAIL 시킨다(층을 평평하게 = 전역 거절을 맨 앞으로) — 그게 "배치가 곧 가드의 생사"의 증거.
- ★**게이트 퇴화 반사실은 규칙을 `if False:` 로 죽여** 게이트를 exit 0·pass true 로 만든 뒤
  하위 층 단독 판정을 잰다(`check_links.py` 의 `link-endpoint-plane` 닫힌집합 + `annotation-
  anchor-missing` 두 자리). 이게 "단독으로도 fail-closed" 의 유일한 시험이다.
- ★**종단점 집합 축은 `키 존재 vs truthiness` 로 두 층을 대조**: `false`·`null` 은 앞 프로브에
  없기 쉬우니 새로 만든다. 그리고 **키 없는 종단점과 falsy 앵커를 한 스토어에 섞어** 분할이
  정확히 키에서 갈리는지(`anchorEndpoints 2 · recordEndpoints 1`) 재라 — 사유 개수만으로는
  "종단점이 아예 없어 사유도 없다"와 구분이 안 된다(대조군도 그 값을 같이 재야 항진명제가 아님).
- ★**새 진단층은 "과잉 안심"을 의심하라**: `reasons.endpoint: null` 이 "자기 잘못 없음"이라고
  찍는데, 게이트가 **원리적으로 못 보는 축**(편집기만 아는 `loadStore` 거절)에서는 잘못이 있는
  종단점도 null 을 받는다. 대조군(평면을 빨갛게 만드는 링크를 빼면 같은 종단점이
  `store-refused:document-state-unopenable`)을 **짝으로** 제시해야 결함으로 성립한다.
- ★**다음 표적은 "가지치기 이름"**: 심링크를 따라가게 만들어도 `SCAN_SKIP_DIRS`(`.git`·
  `node_modules`)는 **이름으로 먼저** 잘린다 → 정직한 스토어를 그 이름 아래 두거나 **그 이름의
  심링크**로 들여오면 닫은 축이 다시 열린다(사본의 답이 초록). 격리는 `quarantined[].excluded`
  로 남는데 이쪽은 판정 JSON 에 흔적이 없다(= 코드 자신의 "조용한 제외 금지" 원칙 위반).
  **무회귀**(HEAD 도 같은 답)이므로 차단은 아니지만 (가) CONFIRMED 로 낸다.
- 대가는 값으로 재라: 심링크 추종의 비용 = 실사용 게이트 0.35s(HEAD 0.34s, scope 동일),
  무관한 json **8000개** 트리를 링크로 물려도 0.43s(sniff 4KB 예산이 상한).
- 자기보고 대조에서 단골 = **해시 전사 오류**(REPORT.md 해시를 suite-result.json 자리에) 와
  **검사 증가분 계수**(신규 `record()` 3자리인데 대조군 배열이 루프라 실제 +4). 값 자체가
  맞으면 결함이 아니라 note.
- 문서 정정도 실측 대조로: 절 제목 "대조군 **3개**"·"세 모양"이 남았는데 같은 절 표는 4행 +
  "네 대조군 모두" (한 절 안에서 자기모순). 그리고 **orchestrator 채널 기록**의 "(가) CONFIRMED
  0건 수렴" 같은 문장은 **측정한 모양 집합에 대한 것**임을 한정하도록 정정 요청한다.

## §8 = "조용한 제외" 재판정 (11차, `docs/verify/plane-editor-silent-exclusion-verify.md`)

"직전 판정이 (가) CONFIRMED 로 낸 축을 닫았다 + 문구를 좁혔다 + 문서를 정정했다" 유형.

- ★**판정 JSON 델타를 값으로 증명하는 싼 수**: 새 산출에서 **추가된 키 하나만 지우고** 같은
  직렬화(`json.dumps(indent=2, ensure_ascii=False, sort_keys=True)` + 개행)로 재해시해 **앞
  wave 에 기록한 해시와 일치**시킨다. "전 필드 재귀 diff 결과 추가 1건뿐"을 한 줄로 못 박는다.
- ★**"흔적을 남긴다"는 두 층으로 갈린다**: 판정에 영향을 주는 경우(범위 안 문서 선언)는 끌려와
  `discovered` 에 **실경로 이름**이 실리고, 무관한 스토어는 `skipped[]` 의 **트리별 수**만 남는다
  (`outOfScope` 는 가림 트리 행을 싣지 않으므로 경로가 아예 안 나온다). 브리프의 "이름으로
  불리는가"는 이 둘을 나눠 답해야 한다 — 판정 JSON **전문 문자열 검색**으로 재는 게 가장 정직하다.
- ★**닫힘은 축으로 흔든다**: 앞 wave 가 잰 이름 하나(`node_modules`)에 머물지 말고 **다른 제외
  이름(`.git`)·중첩(`node_modules/pkg/node_modules`)·혼합 중첩**을 새로 만든다. HEAD tools 로
  같은 프로브를 먹이면 셋 다 조용한 초록이었다 = 인과.
- ★**남는 구멍의 단골(이번 수확)**: 가림 트리 안에서는 발견이 **sniff 통과를 요구**하는데 밖에서는
  `annotations.json` 이라는 **이름만으로 무조건 판정**한다 — 이 비대칭 때문에 (a) 머리 4KB 밖으로
  키가 밀린 스토어(편집기는 정상 로드), (b) **읽을 수 없는** 스토어가 `excluded=0`(흔적 0)으로
  사라진다. 게다가 같은 파일이 밖에 있으면 게이트가 **처리되지 않은 `PermissionError` 로 죽는다**
  (exit 1 · stdout 에 JSON 없음 → 소비자는 "판정 실패"와 구분 못 함).
- ★**`.git` 이 파일인 작업공간**(git worktree·submodule)은 `workspace_root` 의 `os.path.isdir`
  때문에 루트 없음이 되어 **훑기가 통째로 사라진다** → 사본의 답이 초록. git 없이 재현된다:
  `writeFileSync(join(ws,'.git'), 'gitdir: /elsewhere\n')`. 전제 표가 이 경우를 "저장소 **밖**"
  으로만 적고 있어 일상 형상을 가리키지 못한다 — 이 lane 에서 가장 값싼 (가).
- ★**"약속을 낮춰 통과"의 판정법**: 실측값(Z3d 의 `reasons.endpoint: null`)이 그대로면 그것은
  진단 개선이 아니라 **주장 범위 축소**다. 리포트에 그 성격을 명시하고, 그 대신 ① 낮춘 문장이
  실측과 일치하는지(그 분기에서 `loadStoreCalls 0 · storesOpened 0`), ② 성질이 **실제 CLI
  표준출력 문자열**로 재는지(상수 자기대조가 아닌지), ③ JSON 채널에도 그 범위가 실리는지를
  따로 답한다(③은 이번에 미충족 = 관측).
- ★**성질의 빈 칸 사냥**: 코드 주석이 "이렇게 하지 않으면 조용한 은신처가 된다"고 **주장하는**
  자리는 그 반대로 패치한 반사실을 돌려 **스위트가 여전히 초록인지** 본다. 이번엔 `_stores_under`
  에 `SCAN_SKIP_DIRS` 를 재적용해도 **95/95 초록**인데 내 E2·E3 는 부활했다 = 코드로만 참인 축.
- **검사 번호는 코드 주석 규약**을 따른다(`run-link-checks.mjs` 가 "숨을 수 없다(10·11) + 흔적은
  남는다(12)" 로 스스로 매긴다). 출력 순서(12·13·14번째 행)와 다르므로 자기보고의 번호를
  오류로 오판하지 말 것 — **주석을 먼저 grep** 한다.
- **비용은 두 모양으로**: junk json N개를 `node_modules` 에 넣기 + **pnpm 식**(작업공간 밖 트리를
  `node_modules/<name>` 심링크로 물리기). 8000 파일당 약 +0.09 s(sniff 4KB 예산이 상한),
  실사용 저장소 게이트 왕복은 0.35 -> 0.38~0.40 s.
