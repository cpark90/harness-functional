---
verdict: pass-with-notes (실사용 **가능** — (a); 조건 0개, 차단하지 않는 관측 4건)
scope: tools/plane-editor — 바인더 단독 판정의 fail-closed 3자리(`src/link-binding.mjs` 전제 1·2·3 + `bind-links.mjs` 종료코드 + 스위트 C4b·C12)
criteria: 직전 판정 `docs/verify/plane-editor-endpoint-binding-verify.md` §8 **착수 조건 1의 수치 그대로**(①②③ + negative control 33건) + 브리프 §1–§7
baseline: 현재 워킹트리. HEAD `8fed32f` 는 19x3 셀·필드 1:1 대조의 baseline 으로만 사용
re-measured: W1–W4 · P0–P5 · V1–V7 **무수정 재실행** · 새 프로브 X1–X5 · Y1·Y2·Y4·Y5·Y6·Y7 · 반사실 7종(역패치 6 + 코퍼스 1) · 게이트 규칙 퇴화 반사실 2종 · 19x3 셀 1:1 · 342 레인 재집계 · 3회 byte-identical · repo 게이트 3종
new-confirmed: 없음 — 조건 1의 세 자리(W1·W3·W4)는 **전부 닫혔다**(각각 exit 1 + 사유, 크래시 0)
observed: 세 수정 중 **실제로 유일하게 필수인 것은 (b) 게이트 전역 판정**이다(역패치로 확인) · (a)·(c) 는 게이트가 **거짓말하거나 규칙이 퇴화할 때** 홀로 이빨을 낸다(Y5·게이트 퇴화 반사실에서 실증) · 앞 판정의 P4·P5 는 **프로브의 링크 스토어가 `store-format` 위반**이어서 이제 전역 거절에 가린다 — 정렬한 스토어로 X4·X5 에서 재수립했다(+28 이동·쌍둥이 함정 orphan)
declared-outside: HO_PYTHON 위조 게이트(Y7) · 워크스페이스 밖 스토어(C10 이 선언한 발견 전제) · M1·M1b·M2(문서 상태 손 기입) · B1·B1b·B5·H2·Z1(손 기입 정체성·이식) — **차단 사유로 쓰지 않음**
---

# plane-editor 바인더 fail-closed 판정 (vnv, 9차)

## 0. 무엇을 기준으로 쟀는가

- **기준은 내가 직전(8차)에 스스로 적은 수치다.** `docs/verify/plane-editor-endpoint-binding-verify.md`
  §8 "착수 조건 1"의 ①②③ 과 "negative control 30 → 33 이상, 각 exactly" 를 문언·수치 그대로
  적용했다(완화 없음). W1–W4·P0–P5·V1–V7 프로브는 **무수정 재실행**했다(파일 해시 불변).
- developer 자기보고는 **판정 대상**이다. 아래 수치는 전부 내가 다시 잰 값이며, 자기보고와
  어긋나는 자리(P4·P5)는 §5-3 에 따로 적었다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`. 실험은 전부 scratch 사본이고, 트리에 더한 것은
  `docs/verify/` 2개(이 리포트 + 프로브 1개)뿐이다.

## 1. 실행한 명령 (재현 절차)

```
# 재실행 전 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,\
README.md,run-link-checks.mjs,run-suite.mjs,bind-links.mjs,make-fixture-documents.mjs} \
tools/plane-editor/src/*.mjs tools/plane-editor/{sample-state,link-store}/*.json

# 게이트 / 바인더 / 스위트 (각 3회, 별 프로세스)
node tools/plane-editor/run-link-checks.mjs
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json
node tools/plane-editor/bind-links.mjs [--format json]
node tools/plane-editor/run-suite.mjs
node tools/plane-editor/make-fixture-documents.mjs --check
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py

# 8차 프로브 — **무수정** 재실행
VNV_SCRATCH=<s>/ebr node docs/verify/plane-editor-endpoint-binding-residual-probe.mjs  # W1–W4
VNV_SCRATCH=<s>/eb  node docs/verify/plane-editor-endpoint-binding-probe.mjs           # P0–P5·V1–V7
VNV_SCRATCH=<s>/badv node docs/verify/plane-editor-binding-adversarial.mjs             # B 계열

# 9차 신규 프로브 (이번 판정)
VNV_SCRATCH=<s>/fc node docs/verify/plane-editor-binder-failclosed-probe.mjs   # X1–X5·Y1–Y7
VNV_ONLY=X1     VNV_PE_ROOT=<s>/gd-dup/tools/plane-editor/    ...   # 게이트 규칙 퇴화 반사실
VNV_ONLY=X2,X3  VNV_PE_ROOT=<s>/gd-anchor/tools/plane-editor/ ...

# 반사실 — 트리 사본에 **역패치**를 걸어 돌린다 (원본 무수정)
rsync -a --exclude node_modules tools/ <s>/cf-*/tools/ ; ln -s <repo>/…/node_modules … ;
mkdir <s>/cf-*/.git ; cp -r ontology catalog-v001.xml <s>/cf-*/ ;
cd <s>/cf-* && node tools/plane-editor/run-link-checks.mjs
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 실험 **후** |
|---|---|---|---|
| `suite-result.json` | `06d8bb93…` | 동일(3회) | 동일 |
| `REPORT.md` | `5ee84dab…` | 동일(3회) | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일(3회) | 동일 |
| `run-link-checks.mjs` 출력 | — | 3회 **`3804c73c…`** | 동일 |
| `check_links.py --format json` | — | 3회 **`ae8adb8c…`** (8차와 같은 값) | 동일 |
| `bind-links.mjs --format json` | — | 3회 **`1b6e91ca…`** (8차 `d5bb4d33…` → `gate`·`ambiguousDocuments` 필드 추가) | 동일 |

**트리에 실린 표 = 내가 재생산한 표.** 앵커 스위트는 산출물을 덮어쓰지만 3회 모두 재실행 전
디스크본과 byte-identical 이었다(내 판정이 트리를 바꾸지 않았다).

## 2. ① 재측정 — 문서 모호성 (이름 순서 의존이 사라졌는가)

기준: *"W3a·W3b 두 이름 순서에서 **답이 같거나 둘 다 거절**"*. 이름을 **세 번째·네 번째 사본**
까지 바꿔 순서 의존을 더 흔들었다(`X1`, 신규).

| 시험 | 사본 이름(발견 순서) | 게이트 | 바인더 exit / pass | bound | 사유 |
|---|---|---|---|---|---|
| W3a (무수정 재실행) | `backup` < `main` | exit 1 `annotation-store-duplicate-document` | **1 / false** | 0 | `document-declared-by-2-annotation-stores` |
| W3b (무수정 재실행) | `main` < `zcopy` | exit 1 (동일) | **1 / false** | 0 | 동일 |
| **X1a** (신규) | `aaa-copy` < `main` | exit 1 | **1 / false** | 0 | 동일 |
| **X1b** (신규) | `main` < `mmm-copy` | exit 1 | **1 / false** | 0 | 동일 |
| **X1c** (신규) | `main` < `zzz-copy` | exit 1 | **1 / false** | 0 | 동일 |
| **X1d** (신규) | 사본 **둘** + 원본 | exit 1 | **1 / false** | 0 | `document-declared-by-**3**-annotation-stores` |
| W3c·X1e 대조군 | 사본 없음 | exit 0 | 0 / true | 1 | `[303,316) "honest orphan"` (8차와 같은 답) |

**충족.** 네 가지 이름 순서에서 답이 **하나도 갈리지 않는다**(전부 거절, 사유 문자열까지 동일).
판정 JSON 에 `counts.ambiguousDocuments: 1` 과 `ambiguousDocuments[].stores`(경로 정렬)가 남고,
사람이 읽는 표도 **두 행 모두** `AMBIGUOUS — another store declares this document too, so neither
is chosen` 로 찍는다 — 8차 비차단 관측 3(진 후보를 "not needed by any anchor endpoint" 로 감춤)이
해소됐다. `loadStoreCalls 0 · storesOpened 0`(고르지 않으므로 아무것도 열지 않는다).

## 3. ② 재측정 — 게이트 전역 red 전파 (문구가 실측과 맞는가)

기준: *"게이트 전역 판정이 빨강이면 바인더도 exit≠0"*.

| 시험 | 게이트 | 바인더 | `loadStoreCalls` / `storesOpened` | 사유 |
|---|---|---|---|---|
| W4 (무수정 재실행) | exit 1 `link-type-unknown` | **exit 1 · pass false** | 0 / 0 | `link-plane-refused-by-the-gate:link-type-unknown` |
| **V2 부류**(앵커 종단점 **0건**) — 커밋 fixture `negative-bad-type` | exit 1 `link-type-unknown` | **exit 1 · pass false** | 0 / 0 | 종단점이 없어도 `pass = unbound 0 && gate.pass` 로 빨강 |
| Y2 dirty(신규, 좋은 링크 2 + 나쁜 링크 1) | exit 1 `link-type-unknown,record-endpoint-missing` | **exit 1** | 0 / 0 | 좋은 종단점 2개까지 `link-plane-refused-by-the-gate:…` |
| V4·V5·V6(무수정 재실행) | exit 1 | exit 1 | 0 / 0 | 전역 사유로 통일 |
| V7(무수정 재실행) | exit 1 per-store | exit 1 | 0 / 0 | `store-refused:gate:annotation-record-document-mismatch` (**좁은 사유가 전역 사유에 가려지지 않는다**) |

**충족.** 종료코드 계약도 실측과 맞다: 알 수 없는 인자 **exit 2**, 없는 스토어 **exit 2**,
게이트 빨강 **exit 1**, 정상 **exit 0**.

### 문구를 낮춰 통과시킨 것은 아닌가 (브리프 §2 의 요구)

8차가 지적한 것은 "게이트 exit 0 은 **필요조건**"이라는 README 문구가 구현보다 강했다는
점이다. 이번 wave 는 **구현을 문구에 맞췄고**(전역 판정을 읽는다), 문구는 오히려 **더 구체적으로**
늘었다. 늘어난 문구를 하나씩 실측과 대조했다:

| 문구(출처) | 실측 | 판정 |
|---|---|---|
| "게이트 전역이 빨강이면 어떤 스토어도 **열지 않고** 종단점마다 사유를 남긴다"(README·link-store/README·`link-binding.mjs` 머리말) | W4·Y2·V4–V6 에서 `loadStoreCalls 0 · storesOpened 0`, 종단점마다 사유 1건 | 일치 |
| "한 문서를 선언한 스토어는 정확히 하나여야 한다 … 고르지 않고 거절한다" | X1a–X1d(2·3 스토어) 전부 거절 | 일치 |
| "앵커 이름은 해소표의 **own key** 로만 조회한다" | W1·W2·X2 (§4) | 일치 |
| "세 자리 다 negative control 로 코퍼스에 있고 매 실행 측정된다(C4b)" | 스위트에 C4b 3건 + 코퍼스 계수 1건, 매 실행 | 일치 |
| "코퍼스 크기(게이트 30 + 바인더 3 = 33)도 매 실행 세며, **줄어들면 그 자리에서 FAIL**"(fixtures/link-plane/README) | 반사실 CF-코퍼스: 게이트 대조군 하나를 지우니 `29 + 3 = 32 (floor 33)` **FAIL**(exit 1) | 일치·이빨 있음 |
| "가중은 싣지 않는다 — `docs/feedback/link-plane-weight-decision.md`, `status: open`"(link-store/README, 이번에 포인터를 구체화) | 그 파일 존재 · frontmatter `status: open` | 일치 |
| `bind-links` 종료코드 주석(0/1/2) | 위 4모양 실측 | 일치 |

**약속을 낮춰 통과시킨 자리는 없다.** 다만 한 곳에서 문구가 실측보다 **아주 약간 넓다** —
"이 명령 **단독**으로도 fail-closed" 는 falsy 앵커 값(`""`·`0`)에 대해서는 게이트에 기대고 있다
(§6-1). 오늘 출하 상태에서 소비자가 받는 답은 여전히 exit 1 이므로 차단 사유는 아니다.

## 4. ③ 재측정 — 상속 키 조회 (계열이 정말 닫혔는가)

기준: *"`W1`·`W2` 7모양 전부 `anchor-part-has-no-resolver` 로 unbound(크래시 0)"*.

| 시험 | 모양 수 | 결과 |
|---|---|---|
| W1 (무수정) | 1 (`constructor`) | exit 1 · unbound 1 · `anchor-part-has-no-resolver:constructor` · stderr 없음 |
| W2 (무수정) | 7 (`__proto__`·`toString`·`valueOf`·`hasOwnProperty`·`isPrototypeOf`·`propertyIsEnumerable`·`toLocaleString`) | exit 1 · unbound **7/7** · 전부 같은 계열 사유 · **크래시 0**(8차엔 exit 2 크래시였다) |
| 스위트 C12(6) | `Object.getOwnPropertyNames(Object.prototype)` **전수 12** | `12 name(s) tried · 0 bound · 12 unbound · no crash` — 사례가 아니라 **성질**로 매 실행 |
| 스위트 C12(1b) | 표의 **모양** | `prototype null · 12 key(s) tried, 0 admitted` |

### 내가 창안한 새 모양 2개 이상 (브리프 §3)

`X2`(신규) — 8모양을 한 스토어에 실었다:

| 새 모양 | 바인더 | 판정 |
|---|---|---|
| `"0"` (숫자처럼 보이는 문자열 키) | unbound `anchor-part-has-no-resolver:0` | 닫힘 |
| `"prototype"` | unbound `…:prototype` | 닫힘 |
| `"__defineGetter__"` (`Object.prototype` 확장 키) | unbound `…:__defineGetter__` | 닫힘 |
| `true` (비문자열) | unbound `…:true` | 닫힘 |
| `["textQuote"]` (배열 — 문자열화하면 유효 이름) | unbound `…:textQuote` | 닫힘(`typeof name !== 'string'` 이 먼저 걸린다) |
| `{textQuote:true}` (객체) | unbound `…:[object Object]` | 닫힘 |
| **`""` (빈 문자열)** | **종단점에서 사라짐** — `anchorEndpoints 0 · recordEndpoints 1 · unbound 0` | §6-1 잔여 |
| **`0` (숫자 0)** | 동일 | §6-1 잔여 |

크래시 0, bound 0. **③ 충족**(조건이 요구한 7모양 + 내가 더한 6모양이 전부 사유 있는 unbound).

## 5. 인과 — 세 수정이 실제 원인인가 (역패치 반사실)

트리 사본에 **역패치**를 걸어 스위트를 돌렸다(원본 무수정). 결과는 브리프가 기대한 것보다
더 흥미롭다 — **세 수정은 서로 겹친다.**

| 반사실(되돌린 것) | 스위트 | 무엇이 FAIL 했나 | 바인더의 실제 답 |
|---|---|---|---|
| **cf-all** 셋 전부 | exit 1 | C4b 3건 + C12(1b) + C12(6) = **5건** | `constructor` → **바인딩 1건**(좌표 없는 bound), 쌍둥이 → 한쪽 선택, 빨간 게이트 → PASS, prototype 전수 → **크래시**(`Cannot convert undefined or null to object`) |
| **cf-ambig** 모호성 거절만 | exit 1 | C4b 모호성 1건 | 여전히 **0 바인딩**이지만 사유가 `link-plane-refused-by-the-gate:annotation-store-duplicate-document` 로 바뀐다 |
| **cf-gate** 전역 판정만 | exit 1 | C4b 빨간 게이트 1건 | **바인딩 1건 · 사유 없음** — 8차 W4 가 그대로 돌아온다 |
| **cf-proto** 표+조회 둘 다 | exit 1 | C4b 1건 + C12 2건 | 0 바인딩(전역 거절이 받아냄) · **크래시는 없다** |
| **cf-proto-table** 표 모양만(조회는 `hasOwn` 유지) | exit 1 | C12(1b) **1건**(`12 key(s) tried, 0 admitted`) | 동작은 닫혀 있다 |
| **cf-proto-lookup** 조회만(표는 `Object.create(null)` 유지) | **exit 0** | 없음 | 동작은 닫혀 있다 |
| **cf-corpus** 게이트 대조군 1개 삭제 | exit 1 | 코퍼스 계수 1건(`32 (floor 33)`) | — |

**읽는 법 (정직하게):**

1. **오늘 유일하게 필수인 수정은 (b) 게이트 전역 판정이다.** `cf-gate` 만 되돌려도 조용한 초록이
   돌아온다. (a)·(c) 를 되돌려도 바인더는 여전히 0 바인딩을 내는데, 그 이유는 **게이트가 그 세
   모양을 전부 exit 1 로 잡기 때문**이다(사유만 전역 사유로 바뀐다).
2. 그러면 (a)·(c) 는 dead code 인가 — **아니다.** 게이트가 **거짓말하거나 규칙이 퇴화하면** 그때
   홀로 이빨을 낸다. 두 가지로 실증했다:
   - **게이트 규칙 퇴화 반사실**(게이트 사본에서 규칙을 무르게 하고 같은 시험):
     `annotation-store-duplicate-document` 를 죽이면 게이트는 **exit 0(초록)** 인데 바인더는
     여전히 `document-declared-by-{2,3}-annotation-stores` 로 **exit 1**(X1a–X1d 전부).
     앵커 이름 규칙 2개(`link-endpoint-plane` 닫힌 집합 + `annotation-anchor-missing`)를 죽이면
     게이트는 exit 0 인데 바인더는 X2 의 6모양을 **전부 사유 있는 unbound** 로 거절한다.
   - **위조 게이트**(`HO_PYTHON` 이 violations 를 지우는 wrapper, `Y5`): 바인더의 `gate` 값은
     `pass:true` 로 위조되는데도 쌍둥이 스토어는 (a) 가 잡아 **exit 1**.
3. 즉 구조는 **서로 독립한 두 층의 중첩**이다: 전역 판정(게이트를 믿는 층) + 모호성·own-key
   (게이트를 믿지 않는 층). 8차가 요구한 것은 후자였고, 실제로 후자만으로도 세 자리 중 둘이
   닫힌다. `cf-proto-lookup` 이 초록인 것은 두 안전장치(표 모양·조회 방식)가 서로를 덮기
   때문이며, C12(1b) 는 그중 **표의 모양**을 성질로 못 박아 둔 자리다(그래서 `cf-proto-table`
   에서 유일하게 그 검사만 FAIL 한다 — 항진명제가 아니다).

### 5-3. 자기보고와 어긋난 자리 — P4·P5 (앞 판정의 증거가 이번 코드에서 재현되지 않는다)

`plane-editor-endpoint-binding-probe.mjs` 를 무수정 재실행하면 **P4 의 `before`/`after` 가 빈
배열**이고 P5 는 `link-plane-refused-by-the-gate:store-format` 으로 덮인다. 원인을 끝까지 봤다:

- 그 프로브의 `linkStoreAt` 은 링크를 **정렬하지 않는다**. P4/P5 는 `…-quote`, `…-block` 순으로
  실어 `store-format`("records must be serialised in ascending id order")을 밟는다.
- 8차의 바인더는 **전역 판정을 무시**했으므로 그 위반 위에서도 좌표를 냈다. 즉 **8차의 P4(+28)·
  P5(orphan) 증거는 fail-open 경로에서 얻은 값**이었다. 이번 코드는 같은 입력을 거절한다 —
  회귀가 아니라 **의도한 동작**이다.
- 그래서 그 두 성질을 **정렬한 스토어**로 다시 세웠다(`X4`·`X5`, 신규):

| 신규 시험 | 결과 |
|---|---|
| **X4** 문서 앞에 28자 삽입 | `blockContext 204→232`, `textQuote 303→331` — **정확히 +28**, 텍스트 두 개 다 불변, 링크 파일 무수정 → 위치는 **파생값** |
| **X5** a6 블록 삭제 + **같은 문장 재타이핑**(쌍둥이 함정) + a5 블록 분할 | quote 종단점 `orphaned (block-gone/block-identity-destroyed)` · `from/to/text = null` — **다시 겨누지 않는다**; block 종단점은 CRDT item id 가 같은 조각에만 `[204,225) "Selector multiplexing"` |

같은 두 성질은 **스위트 C12 안에서도** 매 실행 측정된다(`[17,29) -> [45,57) after inserting 28
characters`, `binder says orphaned (block-gone/block-identity-destroyed)`) — 프로브가 없어도
트리 스스로 잰다.

## 6. 새 우회 창안 — 6모양, (가)/(나) 분류

증거: `docs/verify/plane-editor-binder-failclosed-probe.mjs`(X1–X5·Y1·Y2·Y4·Y5·Y6·Y7) + 게이트
규칙 퇴화 반사실 2종. 전부 실제 세션·실제 게이트 프로세스·실제 `bind-links` 프로세스다.

| # | 우회 | 게이트 | 바인더 단독 | 분류 | 판정 |
|---|---|---|---|---|---|
| **1** | 종단점 `anchor: ""` 또는 `anchor: 0` (**falsy** 값) | exit 1 `link-endpoint-plane` | 종단점이 **조용히 record 종단점으로 강등**된다(`anchorEndpoints 0 · recordEndpoints 1 · unbound 0`). 게이트 덕에 exit 1 | **(나) 게이트가 닫음** | 우회 실패 — 다만 **게이트를 무르게 하면 `pass: true · exit 0`**(실측). 바인더 단독 성질의 유일한 남은 구멍 |
| **2** | 정직한 스토어를 워크스페이스 **밖**에 두고 **심링크**로만 들여온다(사본이 실디렉토리) | exit 0 | exit 0 · `pass true` · 사본의 답 `[77,91) "standoff model"` | **(나) 선언된 발견 전제**(C10: 발견은 워크스페이스 루트 아래 · 밖은 판정 안 함) | 우회 실패로 분류하되 §8 다음 작업 2번 — 격리 표식·이름 변경은 못 숨기는데 **심링크는 숨긴다**. 산출은 `store` 경로를 찍으므로 조용하지는 않다 |
| **3** | `--annotations` 로 정직한 스토어만 이름 댄다(쌍둥이는 옆에) | exit 1 | exit 1 `document-declared-by-2-annotation-stores` | — | 방어 작동(범위는 **발견**되지 이름으로 좁혀지지 않는다) |
| **4** | 같은 스토어 디렉토리의 **심링크 쌍둥이**(같은 실경로) | exit 0 | exit 0 · 정답 `[303,316) "honest orphan"` · 스토어 1개로 셈 | — | 우회 실패(가짜 모호성이 생기지 않는다) |
| **5** | `HO_PYTHON` 이 violations 만 지우는 위조 게이트 | (진짜 게이트는 exit 1) | **exit 1** — 모호성 층이 잡는다 | (나) 환경 신뢰면 | 우회 실패(중첩의 값어치) |
| **6** | 위조 게이트가 violations **와 쌍둥이 스토어 목록까지** 지운다 | (진짜 게이트는 exit 1) | exit 0 · pass true | **(나) 경계 바깥**(인터프리터 선택 = PATH 급 신뢰) | 우회 성립하나 **차단 근거로 쓰지 않음** |
| 부수 | 좋은 링크 2 + 나쁜 링크 1(`Y2`) | exit 1 | exit 1 · 좋은 종단점 2개도 **전역 사유 하나로 덮임** | — | 우회 아님. **진단력 비용**(§8 다음 작업 3번) |

### (가) 일상 경로 CONFIRMED 는 몇 건인가 — **0건**

8차의 (가) 3건(W3·W4·W1)은 전부 닫혔고, 이번에 창안한 6모양 중 **일상 경로에서 조용한 초록을
내는 것은 없다**. 1번은 게이트가 닫고(게이트를 무르게 해야 열린다), 2번은 C10 이 선언한 발견
전제 안이며 산출이 스스로 출처를 밝힌다, 6번은 인터프리터를 위조하는 경계 밖이다.

## 7. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 x 레인 1:1 | HEAD 와 동일 | **19 시나리오 x 3레인 = 57 셀**, 9필드(`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong`) 차이 **0** |
| `suite-result.json` HEAD 대비 전 필드 재귀 diff | 설명 가능한 델타만 | **정확히 2개**: `gates.G5.asciiChars` 465487→478346, `hangulChars` 57826→60701. 원인은 이 wave 의 손글씨 증가(`run-link-checks.mjs` +303줄, `link-binding.mjs` +137줄, README 3종). 스캔 파일 수 **146 불변**, `scenarios`·`totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures`·`diagnostics`·`findings` **전부 identical** |
| 전 레인 오해소 | 0 | 원시 `trials[].lanes[].outcome` 재집계 **342 레인측정 · `wrong` 0**(survived 120 · drifted 2 · orphaned 214 · 미측정 6) — 8차와 같은 값 |
| 실사용 바인딩 2건 | 좌표·텍스트 불변 | `[303,316) "honest orphan"` · `[204,267) "Selector multiplexing…"`, `blockItemId 1:205`, `method relative-position` — 8차와 **동일**. `counts` 는 `bound 2 · unbound 0 · loadStoreCalls 1 · storesOpened 1 · ambiguousDocuments 0`, `gate {pass:true, exitCode:0, violations:[]}` |
| 결정성(앵커 스위트) | 3회 byte-identical | **3회 동일** + 재실행 **전** 디스크본과도 동일 |
| 결정성(링크·바인딩) | 3회 동일 | `run-link-checks` `3804c73c…` · `check_links --format json` `ae8adb8c…`(8차와 같은 값) · `bind-links --format json` `1b6e91ca…` |
| 링크 스위트 | 전수 | **87/87 ok · PASS**(8차 81/81). 늘어난 6건 = C4b 3 + 코퍼스 계수 1 + C12(1b) 1 + C12(6) 1 |
| 링크 negative control | ≥33 · 각 "exactly" | **게이트 30 + 바인더 3 = 33**(floor 33). 게이트 30건은 전부 `exit 1 with exactly this violation`, 바인더 3건은 `gate exit 1 with exactly [rule]; binder exit 1 with 0 binding(s) and exactly one reason`(모호성은 **두 이름 순서** 둘 다) |
| 코퍼스 축소 방지 | 이빨 있음 | 반사실 CF-코퍼스에서 `32 (floor 33)` **FAIL** |
| fixture 문서 생성기 | 0 differ | `make-fixture-documents.mjs --check` **PASS — 0 file(s) differ** |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 **146파일 · 위반 0** |
| 적대 프로브 | 무수정 재실행 | B 계열 9행 재실행 — `attachedToAnotherDocument: true` 는 **B1·B1b·B5** 뿐(전부 선언된 경계 밖, 8차와 동일). 나머지 계열은 `link-binding.mjs` 를 import 하지 않아(전수 grep) 이번 diff 의 영향권 밖이다 |
| 담당 경로 밖 변경 | 0 | 워킹트리 델타는 `tools/plane-editor/` 9개 + developer 자기 메모리 2개. **`ontology/**` 변경 0**, `tools/` 안에서도 `plane-editor` 밖 변경 0 |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch 사본. 내가 만든 파일은 `docs/verify/` 2개(이 리포트 + 프로브) |

### 비차단 관측

1. **`""`·`0` 같은 falsy 앵커 값은 종단점 판정에서 사라진다**(`if (!ep.anchor)`). 게이트가 닫고
   있으므로 오늘의 소비자는 exit 1 을 받지만, "이 명령 **단독**으로도 fail-closed" 라는 문구의
   범위는 그만큼 좁다. `Object.hasOwn(ep, 'anchor')` 로 판정하면 한 줄로 닫힌다.
2. **전역 거절의 진단력 비용**: 링크 하나가 나빠도 나머지 종단점의 개별 사유가 전부 평면 사유
   하나로 덮인다(Y2). fail-closed 방향의 비용이므로 안전 문제는 아니지만, 스토어가 커질수록
   "어디가 문제인지" 를 바인더로 좁히기 어려워진다.
3. **8차 프로브 2개는 링크를 정렬하지 않는다**(P4·P5·V2·V5 가 `store-format` 을 밟는다). 이번
   코드에서는 그 자리가 전역 거절로 덮이므로, 그 프로브들로 **바인딩의 진실성**을 재려면 정렬본
   (X4·X5)이 필요하다. 프로브 쪽 재현성 문제이지 도구 결함이 아니다.
4. **심링크는 스토어를 숨긴다**(Y6). 격리 표식·이름 변경은 못 숨긴다는 C10 의 성질과 나란히
   두면 비어 있는 칸이다.

## 8. ★ 최종 판정 — 이 바인딩을 실사용에 올려도 되는가

**결론: (a) 가능. 조건 0개.**

> **8차가 건 착수 조건 1의 세 자리가 전부 0이 됐다.** ① 같은 문서를 선언한 스토어가 둘·셋일
> 때 **네 가지 이름 순서**에서 답이 갈리지 않고 전부 거절이며(`document-declared-by-N-annotation-stores`,
> `ambiguousDocuments`), 대조군 한 개짜리 스토어는 8차와 **같은 답**을 낸다. ② 게이트 전역이
> 빨강이면 바인더도 exit 1 이고 아무 스토어도 열지 않는다 — 앵커 종단점이 **0건**인 경우까지
> 포함해서. ③ `Object.prototype` 이름 12개 전수와 내가 새로 창안한 6모양이 전부 사유 있는
> unbound 이며 **크래시 0**이다. 세 자리는 negative control 3건으로 코퍼스에 들어와(30 → **33**,
> floor 가 이빨을 갖는다) 매 실행 측정된다.
>
> **바인딩의 진실성도 다시 섰다**: 실사용 링크 2건의 좌표·텍스트·CRDT item id 가 8차와 같고,
> 문서를 28자 밀면 좌표가 정확히 +28 따라가며(X4), 같은 문장을 다시 타이핑한 쌍둥이 함정에서는
> 다시 겨누지 않고 orphan 으로 보고한다(X5). 일상 경로 오해소는 0이다.
>
> **문구도 실측과 맞다** — 이번에는 문구를 낮춘 것이 아니라 구현을 문구에 맞췄고(전역 판정을
> 읽는다), 늘어난 문구 7개를 하나씩 실측과 대조했다(§3). 약속을 낮춰 통과시킨 자리는 없다.
>
> 남은 관측 4건은 전부 **차단 근거로 쓰지 않는 부류**다: falsy 앵커는 게이트가 닫고(게이트를
> 무르게 해야 열린다), 심링크 은닉은 C10 이 선언한 발견 전제 안이며 산출이 출처를 밝히고,
> 위조 인터프리터는 경계 밖이고, 진단력 비용은 안전이 아니라 편의의 문제다.

### 다음 wave 로 가는 자연스러운 작업 3개 (우선순위 순)

| # | 작업 | 왜 지금인가 | 크기 |
|---|---|---|---|
| **1** | **falsy 앵커 값을 종단점으로 세기** — `if (!ep.anchor)` 를 `Object.hasOwn(ep, 'anchor')` 기준으로 바꿔 `""`·`0` 도 `anchor-part-has-no-resolver:` 로 거절하고, C4b 에 네 번째 대조군(빈 문자열)을 더한다 | "단독으로도 fail-closed" 문구의 **유일하게 남은 예외**를 지운다. 게이트 규칙 퇴화 반사실에서 실제로 `pass:true` 가 나오는 자리다 | 코드 1줄 + 대조군 1건 |
| **2** | **발견 전제에 심링크 축 추가** — C10 에 "심링크 뒤의 쌍둥이" 행을 넣고, 중복 판정을 실경로(realpath) 기준으로 넓힐지 결정한다 | 격리 표식·이름 변경은 못 숨기는데 심링크는 숨긴다(Y6). 성질 표의 빈 칸이고, 모호성 거절(이번 wave 의 핵심)이 **보이는 스토어에만** 걸린다는 뜻이기도 하다 | 스위트 1행 + 게이트 판정 확장 |
| **3** | **전역 거절의 진단력 회복** — 게이트가 빨강이어도 종단점별 사유를 계속 계산해 `unbound[].reason` 을 두 층(plane 사유 + endpoint 사유)으로 싣는다(exit 은 1 유지) | Y2 에서 좋은 링크 2개가 사유 하나로 덮였다. 스토어가 커질수록 바인더의 값어치가 떨어지는 자리 | 바인더 사유 스키마 소폭 확장 |

> (제품 축의 다음 결정은 `docs/feedback/link-plane-weight-decision.md`(`status: open`)의 **가중**
> 이다 — 사용자 승인 대기이므로 위 3개와 별개 트랙이다.)
