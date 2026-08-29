---
verdict: pass-with-notes (실사용 **유지** — (a); 차단 조건 0개, 새 (가) CONFIRMED 3건 · 성질의 빈 칸 1건 · 문서 자기모순 1건은 개선)
scope: tools/plane-editor — 조용한 제외 3건 ((1) 훑기 제외 축 `SCAN_SKIP_DIRS` · (2) `reasons.endpoint: null` 문구·의미 · (3) fixtures README 자기모순)
criteria: 직전 판정 `docs/verify/plane-editor-binder-followups-verify.md` §7-1 새 발견 1·2 와 §7-3 문서 정정 1, §8 남은 것 (1)(2)(3) 의 **문언 그대로** + 브리프 §1-§6
baseline: 현재 워킹트리. HEAD `8fed32f` 는 19x3 셀 1:1·인과 귀속에 사용. 10차 값(gate JSON `ae8adb8c…` · bind JSON `1b6e91ca…`)은 델타 증명에 사용
re-measured: 10차 프로브 Z1·Z2·Z3 **무수정** 재실행 · 9차 X·Y · 8차 P·V·W · 적대 B 계열 **무수정** 재실행 · 신규 프로브 E1-E9 · 반사실 3종(스킵 되돌림 · 문구 되돌림 · 중첩 스킵 재적용) · HEAD tools 인과 귀속 7건 · 19x3 셀 1:1 · 342 레인 재집계 · 3회 byte-identical 4종 · repo 게이트 3종 · 비용 실측 4종
new-confirmed: **(가) 3건** — (E9) `.git` 이 **파일**인 작업공간(git worktree·submodule)에서는 훑기가 통째로 사라져 **사본의 답**이 초록으로 나간다 · (E5) 제외 트리 안의 **읽을 수 없는** `annotations.json` 은 흔적 없이 빠진다(밖에서는 게이트가 **처리되지 않은 PermissionError 로 죽는다**) · (E4) 제외 트리 안에서는 `annotations.json` 이라는 이름이 **sniff 4KB 예산**에 걸려 흔적 `excluded=0` 으로 사라진다(밖에서는 이름만으로 판정). **셋 다 무회귀**(HEAD 도 같은 답)
observed: (1)은 **축으로** 닫혔다 — 내가 창안한 세 모양(`.git` 안 · 중첩 `node_modules/pkg/node_modules` · 혼합 중첩)이 전부 닫혔고 HEAD 에서는 셋 다 조용한 초록이었다. 제외 사실은 판정 JSON `annotationScope.skipped[]` 에 **매 실행** 실리고 성질 3건이 잰다(반사실에서 정확히 그 3건만 FAIL) · (2)는 진단 정확도 개선이 아니라 **약속을 낮춰 통과시킨 것**이다(Z3d 의 실측값은 그대로) — 다만 낮춘 문장이 실측과 일치하고 성질이 문자열로 잰다 · (3)은 실제 대조군 수(4)와 일치 · **성질의 빈 칸 1건**: 중첩 제외 축은 코드로 닫혀 있으나 **아무 검사도 재지 않는다**(반사실에서 95/95 초록인 채 E2·E3 가 열린다)
declared-outside: HO_PYTHON 위조 게이트(Y7) · sniff 4KB 예산(README 발견의 전제 1행) · B1·B1b·B5(손 기입 정체성·이식) — **차단 사유로 쓰지 않음**
---

# plane-editor "조용한 제외" 3건 판정 (vnv, 11차)

## 0. 무엇을 기준으로 쟀는가

- **기준은 내가 직전(10차)에 스스로 적은 새 CONFIRMED 2건과 관측이다.**
  `plane-editor-binder-followups-verify.md` §7-1(1 `SCAN_SKIP_DIRS` 는 스토어를 조용히 가린다 —
  "닫든 선언하든 둘 중 하나여야 한다" · 2 `reasons.endpoint: null` 의 과잉 안심)과 §7-3(fixtures
  README 의 "3개·세 모양" 자기모순), §8 남은 것 (1)(2)(3) 의 문언·수치를 **완화 없이** 적용했다.
- 앞 프로브는 **무수정 재실행**했다(파일 해시 불변: 10차 `b24cb0df…` · 9차 `c928f8d5…` ·
  8차 `b70184be…`·`6900226…` · 적대 `da7c1356…`). 새로 만든 것은 `docs/verify/`의 프로브
  하나(E1-E9)뿐이다.
- developer 자기보고는 **판정 대상**이다. 아래 수치는 전부 내가 다시 잰 값이며, 어긋난 자리는
  §7-2 에 적었다.
- 실행 환경: `/usr/bin/python3`(rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`. 실험은 전부 scratch 사본이고 트리에 더한 것은
  `docs/verify/` 2개(이 리포트 + 프로브)뿐이다.

## 1. 실행한 명령 (재현 절차)

```
# 재실행 **전** 디스크본 해시 (트리의 표 = 내 재생산 임을 먼저 고정한다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,\
README.md,run-link-checks.mjs,run-suite.mjs,bind-links.mjs,make-fixture-documents.mjs} \
tools/plane-editor/src/*.mjs tools/plane-editor/link-store/*.json docs/verify/*.mjs

# 게이트 / 바인더 / 스위트 (각 3회, 별 프로세스, 순차)
node tools/plane-editor/run-link-checks.mjs
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json
node tools/plane-editor/bind-links.mjs --format json
node tools/plane-editor/run-suite.mjs
node tools/plane-editor/make-fixture-documents.mjs --check
/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py

# 앞 판정 프로브 — **무수정** 재실행
VNV_SCRATCH=<s>/fu   node docs/verify/plane-editor-binder-followups-probe.mjs          # Z1·Z2·Z3
VNV_SCRATCH=<s>/fc   node docs/verify/plane-editor-binder-failclosed-probe.mjs         # X·Y
VNV_SCRATCH=<s>/eb   node docs/verify/plane-editor-endpoint-binding-probe.mjs          # P·V
VNV_SCRATCH=<s>/ebr  node docs/verify/plane-editor-endpoint-binding-residual-probe.mjs # W
VNV_SCRATCH=<s>/badv node docs/verify/plane-editor-binding-adversarial.mjs             # B 계열

# 11차 신규 프로브 (이번 판정)
VNV_SCRATCH=<s>/se node docs/verify/plane-editor-silent-exclusion-probe.mjs   # E1-E9

# 반사실 — 트리 사본에 역패치 (원본 무수정)
rsync -a --exclude node_modules tools/ <s>/cf-*/tools/ ; ln -s <repo>/…/node_modules … ;
mkdir <s>/cf-*/.git ; cp -r ontology catalog-v001.xml <s>/cf-*/ ;
cd <s>/cf-* && node tools/plane-editor/run-link-checks.mjs
#   cf-noskip : 이름 제외를 다시 **조용히**(`if name in SCAN_SKIP_DIRS: continue`)
#   cf-wording: `NO_GATE_VISIBLE_FAULT` 을 옛 문장("no violation of its own …")으로
#   cf-nested : `_stores_under` 안에서 `SCAN_SKIP_DIRS` 를 **다시 적용**(중첩 은신처 부활)

# HEAD 인과 귀속 (HEAD tools 트리에 같은 신규 프로브를 먹인다)
git archive HEAD tools ontology catalog-v001.xml | tar -x -C <s>/head-tree
VNV_PE_ROOT=<s>/head-tree/tools/plane-editor/ HO_TOOLS_DIR=… HARNESS_CATALOG=… \
  VNV_SCRATCH=<s>/se-head node docs/verify/plane-editor-silent-exclusion-probe.mjs
```

| 산출물 | 재실행 **전** 디스크본 | 별 프로세스 3회 후 | 내 실험 **후** |
|---|---|---|---|
| `suite-result.json` | `4448c1e9…` | 동일(3회) | 동일 |
| `REPORT.md` | `310fbc29…` | 동일(3회) | 동일 |
| `schema-dump.json` | `bcfab19b…` | 동일(3회) | 동일 |
| `run-link-checks.mjs` 출력 | — | 3회 **`e0e5a6d6…`** · 95/95 ok · 53.5s/회 | 동일 |
| `check_links.py --format json` | — | 3회 **`29037eb7…`** | 동일 |
| `bind-links.mjs --format json` | — | 3회 **`1b6e91ca…`** (9차·10차와 **같은 값**) | 동일 |

**게이트 JSON 델타가 정확히 무엇인지 값으로 증명**했다: 현재 산출에서 `annotationScope.skipped`
키 하나만 지우고 같은 직렬화(`json.dumps(indent=2, ensure_ascii=False, sort_keys=True)`)로 다시
해시하면 **`ae8adb8c8702…` = 10차에 기록한 값**이다. 즉 실사용 판정 JSON 의 변화는 **추가 1건뿐**
이고 나머지 전 필드가 byte 단위로 같다. 바인딩 산출은 아예 byte-identical 이다.

## 2. (1) 재측정 — 훑기 제외 축은 닫혔는가 (선언인가 성질인가)

기준: *"닫든(스킵 대상도 훑고 후보로만 올리기) 선언하든(전제 표 + 판정 JSON 에 `skipped` 실기)
둘 중 하나여야 한다"* + 브리프 *"성질로 매 실행 측정되는지가 핵심(선언만이면 미충족)"*.

### 2-1. 무수정 재실행 — 10차가 연 두 모양

| 시험(10차 프로브, 무수정) | 10차 값 | 지금 값 |
|---|---|---|
| Z2e 정직한 스토어를 `<ws>/node_modules/honest/`, 사본을 옆에 | **exit 0 · pass true · 사본의 답** `[53,66) "Closing block"` | 게이트 exit 1 `annotation-store-duplicate-document` · 바인더 exit 1 `document-declared-by-2-annotation-stores` · **가려졌던 스토어가 `discovered` 에 실경로로 실린다** |
| Z2e' 심링크가 `node_modules` 라는 **이름**으로 밖의 정직한 트리를 가리킴 | **exit 0 · pass true · 사본의 답** | 양층 exit 1 · 두 스토어 모두 `discovered` |

닫힌 방식은 "흔적만 남기기"가 아니라 **발견(끌어오기)** 이다 — 그래서 브리프의 "이름으로
불리는지"는 이 경우 **불린다**(경로가 `discovered` 에 실린다). 흔적만 남는 경우는 §2-4.

### 2-2. ★ 내가 창안한 새 모양 — 같은 축이 남았는가 (E1·E2·E3, 신규)

10차가 잰 것은 `node_modules` 한 이름뿐이었으므로 **축**으로 넓혔다.

| 신규 시험 | 현재 트리 | **HEAD tools 로 같은 프로브**(인과 귀속) |
|---|---|---|
| **E1** 정직한 스토어를 `<ws>/.git/honest/` 에 (다른 쪽 제외 이름) | 게이트 exit 1 `annotation-store-duplicate-document` · 바인더 exit 1 · `discovered` 에 `.git/honest/annotations.json` | **exit 0 · pass true · 사본의 답** `"Closing block"` |
| **E2** **중첩**: `<ws>/node_modules/pkg/node_modules/honest/` | 양층 exit 1 · `discovered` 에 실림 | **exit 0 · pass true · 사본의 답** |
| **E3** 혼합 중첩: `<ws>/node_modules/pkg/.git/honest/` | 양층 exit 1 · `discovered` 에 실림 | **exit 0 · pass true · 사본의 답** |

세 모양 전부 HEAD 에서 조용한 초록이었고 지금은 전부 거절이다 — **한 사례가 아니라 축이
닫혔다**. (E2·E3 는 `_stores_under` 가 `SCAN_SKIP_DIRS` 를 **다시 적용하지 않는다**는 선택이
실제로 작동함을 보인다. 그 선택이 검사로 지켜지는지는 §5-2 에서 따로 쟀다.)

### 2-3. ★ 성질로 매 실행 측정되는가 — 비공허성 반사실

스위트 `run-link-checks.mjs` C10 의 **신규 3건**이 이 축을 매 실행 잰다.

```
ok  a store under a skipped directory name (node_modules) cannot hide a document under judgment
    — 2 store(s) judged, [annotation-store-duplicate-document] (exit 1); binder 0 binding(s)
ok  a symlink NAMED node_modules does not reopen the axis the symlink walk closed
    — 2 store(s) judged, [annotation-store-duplicate-document] (exit 1); binder 0 binding(s)
ok  an unrelated store under that name is NOT judged, but the exclusion is recorded (no silent skip)
    — 1 store(s) judged (exit 0); skipped [.git keeps out 0, node_modules keeps out 1]
```

반사실 `cf-noskip`(이름 제외를 다시 조용히 `continue`):

```
92/95 ok — FAIL 3건, 정확히 그 셋
  FAIL a store under a skipped directory name … — 1 store(s) judged, [none] (exit 0); binder 1 binding(s)
  FAIL a symlink NAMED node_modules …          — 1 store(s) judged, [none] (exit 0); binder 1 binding(s)
  FAIL an unrelated store under that name …    — skipped [nothing recorded]; binder 1 binding(s)
```

**정확히 신규 3건만** FAIL 하고 실패 문구가 결함의 모양(`binder 1 binding(s)` = 사본의 답)을
그대로 보여 준다. 선언이 아니라 성질이다. **(1) 충족.**

### 2-4. 흔적 방식일 때 — 스토어는 **이름으로 불리는가** (E6)

판정 밖 문서를 선언한 스토어는 끌려오지 않는다. 그때 판정 JSON 에 남는 것은:

| 시험 | 결과 |
|---|---|
| **E6** `<ws>/node_modules/unrelated/` 에 무관한 문서의 정직한 스토어 | `skipped: [{path: ".git", excluded: 0}, {path: "node_modules", excluded: 1}]`. **그 스토어의 경로는 판정 JSON 전문 어디에도 나오지 않는다**(`outOfScope` 는 가림 트리 행을 싣지 않는다) |
| 실사용 저장소 | `skipped` 3행(`.git` 0 · `tools/plane-editor/node_modules` 0 · `tools/webui/frontend/node_modules` 0) · `quarantined` 1행(`tools/plane-editor/fixtures` excluded 41) |

즉 **흔적은 "어느 트리가 몇 개"이고 이름이 아니다**. 이는 격리(`quarantined[].excluded`)와
**같은 규율**이므로 10차가 요구한 "격리와 같은 취급"은 만족한다 — 결함이 아니라 관측으로 낸다
(§7-1 3). 판정에 영향을 주는 경우(범위 안 문서 선언)는 §2-1 처럼 이름이 실린다.

### 2-5. 대가는 값으로 쟀는가 (발견을 넓혔으므로 성능)

| 측정 | 값 |
|---|---|
| 실사용(repo) 게이트 왕복 — **현재**, 5회 | 0.40 · 0.38 · 0.39 · 0.38 · 0.38 s |
| 같은 입력, **`cf-noskip`**(=10차 동작), 5회 | 0.35 · 0.35 · 0.35 · 0.36 · 0.36 s |
| 차이 | **+0.03 s (약 +10%)** — README 가 적은 +0.039 s(+11%)와 같은 자리 |
| 훑기 표면(내가 직접 셈) | 제외 밖 `.json` **128** -> 제외 트리 포함 **294**(+166), `node_modules` 아래 전체 파일 6062 |
| **E8** 빈 `node_modules` vs junk json **8000개** | 338·342 ms -> 429·422 ms (**+25%**) |
| **E8** pnpm 식: `node_modules/<name>` 이 작업공간 **밖** 8000 파일 트리를 가리키는 심링크 | 339·344 ms -> 445·426 ms (**+31%**) · 판정은 그대로 초록 |

sniff 4KB 예산이 상한이라 선형이고, 8000 파일당 약 +0.09 s 다. 실사용 저장소 규모에서는
무시할 만하지만 **의존성 트리가 큰 저장소(수십만 파일)에서는 이 상수가 그대로 곱해진다** —
지금은 비용이 선언돼 있고(README "이름으로 빼는 트리의 비용") 값이 실측과 일치한다.

## 3. (2) 재측정 — 거절 사유 문구·의미 (Z3d)

기준: *"`reasons.endpoint: null` 의 텍스트가 '자기 잘못 없음'인데 정확한 뜻은 '게이트가 볼 수
있는 잘못은 없다'이다. 판정은 그대로이므로 안전 문제가 아니라 문구·의미 문제."* +
브리프 *"약속을 낮춰 통과시킨 것이면 그 사실을 명시하라."*

### 3-1. 사유가 실측과 일치하는가 (10차 프로브 무수정)

| 시험 | 실측 |
|---|---|
| **Z3d** 편집기가 못 여는 스토어의 종단점 + 평면을 빨갛게 만드는 나쁜 링크 | 바인더 exit 1 · `bound 0` · `loadStoreCalls 0` · `storesOpened 0` · 그 종단점의 `reasons.endpoint` = **`null`** (10차와 **같은 값**) |
| **Z3d 대조군** 같은 스토어, 나쁜 링크 없음 | `reason = store-refused:document-state-unopenable` (10차와 같은 값) |
| **Z3c** 사람이 읽는 채널 | `this endpoint itself: no violation the gate can see — the plane was refused elsewhere; this layer never opened the store, so faults only the editor can see are unchecked` |

### 3-2. ★ 무엇이 바뀌었나 — **약속을 낮춘 것**이다 (명시)

- **측정값은 하나도 바뀌지 않았다.** 자기 잘못이 있는 종단점이 전역 거절 아래에서 `null` 을
  받는다는 사실 자체는 그대로다(Z3d). 바뀐 것은 그 `null` 을 사람이 읽는 채널에서 부르는
  **이름**뿐이다(`NO_GATE_VISIBLE_FAULT`). 즉 이 항목은 진단 정확도의 개선이 아니라
  **주장 범위의 축소로 통과시킨 것**이며, 이 리포트는 그 사실을 그대로 적는다.
- 다만 **낮춘 문장이 실측과 일치한다**: `reasons.endpoint === null` 은 `reason === planeRefusal`
  이고 그 종단점에 대한 게이트 위반이 없을 때만 나오며, 그 분기는 `openFor` 앞에서 끊기므로
  "this layer never opened the store" 는 참이다(Z3a·Z3d 에서 `loadStoreCalls 0 · storesOpened 0`
  로 실측). 판정도 그대로 fail-closed(exit 1 · 바인딩 0)다.
- **JSON 채널에는 그 문장이 없다** — `reasons.endpoint` 는 여전히 `null` 이고 뜻은 코드 머리말·
  README 에만 있다. JSON 만 읽는 소비자에게 범위가 전달되는 경로는 없다(관측 §7-1 2).

### 3-3. 비공허성 — 문구가 검사되는가

반사실 `cf-wording`(옛 문장으로 되돌림):

```
94/95 ok — FAIL 1건, 정확히 그 하나
  FAIL the null endpoint reason claims only what the gate can see (the editor axis stays unclaimed)
       — alone: store-refused:document-state-unopenable · under a plane-wide refusal:
         … / endpoint null (0 store(s) opened); the text says "no violation of its own — …"
```

검사(C12 신규 1건)는 **실제 `bind-links` 프로세스의 표준출력 문자열**을 보고,
`'no violation the gate can see'` 포함 + `'no violation of its own'` 불포함 + 대조군 사유 +
`storesOpened 0` 을 함께 잰다 — 상수 자기대조가 아니다(항진명제 아님). **(2) 충족**(단 §3-2 의
성격 한정과 함께).

## 4. (3) 재측정 — 문서 자기모순은 실제 대조군 수와 맞는가

| 항목 | 10차 지적 | 지금 |
|---|---|---|
| `fixtures/link-plane/README.md` 절 제목 | "디스크에 굳힐 수 없는 대조군 **3개**" | "**4개**" |
| 같은 절 본문 | "아래 **세 모양**은…" | "아래 **네 모양**은…" |
| 표 | 4행 | 4행(constructor · duplicate-document 두 이름 순서 · link-type-unknown · falsy `""`) |
| 본문 마무리 | "네 대조군 모두" | 그대로 · "게이트 30 + 바인더 4 = 34" |
| **실측 대조군 수** | — | 스위트가 매 실행 셈: `30 gate control(s) + 4 binder control(s) = 34 (floor 34)`, C4b 검사 4행 전수 |

문서 = 실측. `tools/plane-editor/**` 전체에서 이 축의 잔여 오기("대조군 3"·"세 모양")는 0건이다
(다른 파일의 "세 모양"은 `EXPECTED_DIVERGENCE_CODES` 3부류 등 **다른 대상**이라 무관).
**(3) 충족.**

## 5. 새 우회 창안 — 5모양, (가)/(나) 분류

증거: `docs/verify/plane-editor-silent-exclusion-probe.mjs`(E1-E9) + HEAD tools 반사실. 전부
실제 게이트 프로세스·실제 `bind-links` 프로세스다.

### 5-1. 우회 표

| # | 우회 | 게이트 | 바인더 단독 | 분류 | 판정 |
|---|---|---|---|---|---|
| **1** | **E9** `.git` 이 **파일**인 작업공간(`git worktree add` · submodule 의 작업 트리)에서 사본이 링크 스토어 디렉토리에 있다 | **exit 0** | **exit 0 · pass true · 사본의 답** `[53,66) "Closing block"`(정직한 답은 `[17,29) "The disputed"`) | **(가) 일상 경로** | **CONFIRMED** — 손 기입 0. `workspace_root` 가 `os.path.isdir(".git")` 이라 worktree/submodule 은 루트 없음으로 판정되고 훑기가 통째로 사라진다. 대조군(진짜 `.git` 디렉토리)은 양층 exit 1. 흔적은 `workspaceRoot: null` 하나뿐이고, 전제 표는 이 경우를 "임시 디렉토리 등 **저장소 밖**"으로 적고 있어 **저장소 안의 이 모양을 가리키지 못한다** |
| **2** | **E5** 제외 트리 안의 `annotations.json` 이 **읽을 수 없다**(mode 000 · 소유자 다름) | **exit 0** | **exit 0 · pass true · 사본의 답** | **(가) 조건부** | **CONFIRMED** — `_stores_under` 는 sniff 실패를 전부 침묵으로 처리하므로 후보조차 되지 않고 `skipped[].excluded` 도 **0**이다(= 흔적 0). 같은 파일이 제외 트리 **밖**이면 게이트가 **처리되지 않은 `PermissionError` 로 죽는다**(exit 1 · stdout 에 JSON 없음 · 바인더는 exit 2 `Unexpected end of JSON input`) — 침묵/크래시 어느 쪽도 설계된 답이 아니다 |
| **3** | **E4** 제외 트리 안의 `annotations.json` 머리 4KB 에 `"annotations"`·`"version"` 이 안 보인다(앞에 다른 키가 5KB) | **exit 0** | **exit 0 · pass true · 사본의 답** | **(가) 조건부** | **CONFIRMED** — 숨은 스토어는 **편집기가 정상적으로 연다**(`loadStore OK (v3, 1 record, doc-1)`). 제외 트리 **밖**에서는 같은 파일이 이름만으로 판정돼 exit 1 이다(E4′ 대조군). 즉 제외 트리 안에서는 `annotations.json` 이라는 이름이 **무조건 판정**의 지위를 잃는데(밖과 비대칭) 그 사실이 어디에도 적혀 있지 않다. 도달에 편집기 아닌 직렬화기가 필요하므로 (가) **조건부** |
| 4 | **E7** 정직한 스토어와 사본을 **각각 다른** 제외 트리에(`node_modules` + `.git`) | exit 1 `record-endpoint-missing` | exit 1 · `no-store-in-scope-declares-this-document` | — | 우회 실패(fail-closed). `skipped` 두 행이 각각 `excluded=1` 로 실린다 |
| 5 | **E1·E2·E3** `.git` 안 · 중첩 · 혼합 중첩 | exit 1 | exit 1 | — | 우회 실패(§2-2, HEAD 에서는 셋 다 성공했다) |

### (가) 일상 경로 CONFIRMED 는 몇 건인가 — **3건**(1·2·3번, 그중 2·3은 조건부)

1번(E9)은 **명령 한 줄**(`git worktree add`)이나 submodule 체크아웃으로 도달하며 파일을 손으로
쓰지 않는다 — 이 lane 이 지금까지 (가)로 분류해 닫아 온 것들과 같은 난이도이거나 더 쉽다.
2·3번은 "파일을 제외 트리로 옮기기"(일상) + "스토어 파일의 성질 하나"(권한 비트 / 편집기 아닌
직렬화기)를 함께 요구하므로 조건부로 표기한다.

**세 건 다 무회귀**다: HEAD tools 로 같은 프로브를 먹이면 세 모양 전부 같은 조용한 초록이
나온다(E9 는 대조군까지 초록 — 그 자리는 9차가 닫은 W4 였다). 이번 수정이 만든 것이 아니다.

### 5-2. ★ 성질의 빈 칸 — 중첩 제외 축은 **아무 검사도 재지 않는다**

`_stores_under` 의 머리말은 *"여기서는 `SCAN_SKIP_DIRS` 를 다시 적용하지 않는다 — 그러면
`node_modules/x/node_modules` 처럼 한 겹 더 들어간 자리가 다시 조용한 은신처가 된다"* 고
적는다. 그 문장이 검사로 지켜지는지 반사실로 쟀다.

| 반사실 | 스위트 | 내 프로브 |
|---|---|---|
| `cf-nested` — `_stores_under` 안에서 `SCAN_SKIP_DIRS` 재적용 | **95/95 ok · PASS**(FAIL 0건) | **E2·E3 가 조용한 초록으로 부활**(사본의 답), E1 은 그대로 닫힘 |

즉 이 선택은 **코드로는 참이지만 성질로는 측정되지 않는다**. 다음 편집이 무심코 되돌려도
스위트는 초록이다. 차단은 아니지만(오늘의 답은 옳다) 이 lane 이 세운 규율("전제는 매 실행
측정한다")에 대한 빈 칸이다.

## 6. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 x 레인 1:1 | HEAD 와 동일 | **19 x 3 = 57 셀**, 9필드 차이 **0** |
| `suite-result.json` HEAD 대비 전 필드 재귀 diff | 설명 가능한 델타만 | **정확히 2 leaf**: `gates.G5.asciiChars` 465487->503804, `hangulChars` 57826->67496. 원인은 손글씨 증가(`git diff --numstat HEAD -- tools/plane-editor/`: `run-link-checks.mjs` +561/-61, `link-binding.mjs` +201/-27, `check_links.py` +146/-34, `bind-links.mjs` +42/-10, README 3종 +119/-8). 스캔 파일 수 **146 불변 · 위반 0**. `scenarios`·`totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures`·`diagnostics`·`findings` **전부 identical** |
| 전 레인 오해소 | 0 | 원시 `trials[].lanes[].outcome` 재집계 **342 레인측정 · `wrong` 0**(survived 120 · drifted 2 · orphaned 214 · 미측정 6) — 8·9·10차와 같은 값 |
| 실사용 바인딩 2건 | 좌표·텍스트·`blockItemId` 불변 | `[303,316) "honest orphan"` · `[204,267) "Selector multiplexing recovers anchors after destructive edits."` · `blockItemId 1:205` · `method relative-position`. `bind-links --format json` 이 9차·10차와 **byte-identical**(`1b6e91ca…`) |
| 결정성(앵커 스위트) | 3회 byte-identical | **3회 동일** + 재실행 **전** 디스크본과도 동일(3종) |
| 결정성(링크·바인딩·게이트) | 3회 동일 | `run-link-checks` `e0e5a6d6…` · `check_links --format json` `29037eb7…` · `bind-links --format json` `1b6e91ca…` |
| 게이트 JSON 델타 | 설명 가능한가 | **`skipped` 키 하나뿐** — 그 키를 지우면 해시가 10차 값 `ae8adb8c…` 과 **정확히 일치** |
| 링크 스위트 | 전수 | **95/95 ok · PASS**(10차 91/91). 늘어난 **4건** = C10 신규 3 + C12 신규 1 |
| 링크 negative control | 34 이상 · 각 "exactly" | **게이트 30 + 바인더 4 = 34**(floor 34). 게이트 30건 전부 `exit 1 with exactly this violation`, 바인더 4건 전부 `gate exit 1 with exactly [rule]; binder exit 1 with 0 binding(s), 1 anchor endpoint counted and exactly one reason` |
| fixture 문서 생성기 | 0 differ | `make-fixture-documents.mjs --check` **PASS — 0 file(s) differ** |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 **146파일 · 위반 0**(스캔 범위는 `tools/plane-editor/`) |
| 적대 프로브 | 무수정 재실행 | B 계열 9행 — `attachedToAnotherDocument: true` 는 **B1·B1b·B5** 뿐(전부 선언된 경계 밖, 8·9·10차와 동일) |
| 앞 프로브 전수 | 무수정 재실행 | X1(세 이름 순서)·X1d(3스토어)·X2(8모양)·X3·Y1·Y4·Y5·Y6·Y7 · P0-P5 · V1-V7 · W1-W4 · Z1·Z2·Z3 **전부 10차와 같은 값** |
| developer 담당 경로 밖 변경 | 0 | `tools/plane-editor/` **9개** + 자기 메모리 5개. **`ontology/**` 변경 0**(porcelain 0행 · diff 0행), `tools/` 안에서 `plane-editor` 밖 변경 **0** |
| 내 판정이 트리를 오염시켰는가 | 0 | 실험은 전부 scratch 사본. 트리에 더한 것은 `docs/verify/` 2개(이 리포트 + 프로브). 산출물 3종 해시가 실험 전후 동일 |

### 담당 경로 밖 델타 1건 — 귀속

`docs/feedback/plane-editor-and-kg-content-decisions.md`(+30줄)은 developer 자기보고 파일
목록에 없고 내용이 orchestrator 의 채널 기록이다(10차와 같은 귀속). 그 기록은 10차가 요구한
한정을 **이미 담고 있다**: "9차 라운드에서 (가) CONFIRMED가 0건이 됐다 — 단 이는 그 라운드가
측정한 모양 집합에 대한 것이고, 10차에서 새 축으로 2건이 더 나왔다". 이번 판정으로 그 문장에
붙일 것은 "11차에서 3건 더(무회귀·비차단)" 한 줄뿐이다.

## 7. 관측

### 7-1. 새 발견 (차단 아님)

1. **(가) 3건**(§5-1 1·2·3번) — 셋 다 무회귀. 우선순위는 **E9 > E5 > E4**: E9 만이 손 기입도
   특수 파일 성질도 요구하지 않는다(`git worktree`·submodule 은 일상 개발 형상이다).
   고칠 자리는 `workspace_root` 한 줄(`os.path.isdir(".git")` -> `.git` 이 **파일**이면 그 안의
   `gitdir:` 를 따라가거나, 최소한 그 사실을 `workspaceRoot` 사유로 구분해 싣기)이고,
   E5·E4 는 `_stores_under` 가 sniff 실패를 **세어서** 싣는 것(`skipped[].unreadable` 같은 값)
   으로 흔적을 남길 수 있다. 셋 다 판정 JSON 필드 1개 + 코드 몇 줄 규모다.
2. **`reasons.endpoint: null` 의 뜻은 JSON 채널에 없다.** 텍스트 채널만 `NO_GATE_VISIBLE_FAULT`
   를 싣는다. JSON 소비자는 여전히 `null` 을 자기 해석해야 하고, 그 해석이 "자기 잘못 없음"
   이면 10차가 지적한 과잉 안심이 그대로 재현된다. 값(예: `reasons.endpointScope:
   "gate-visible-only"`)으로 옮기면 두 채널이 같아진다.
3. **가려진 스토어의 흔적은 "이름"이 아니라 "트리별 수"다**(E6). 격리와 같은 규율이므로
   10차 기준은 만족하지만, `outOfScope` 가 경로를 싣는 것과는 여전히 비대칭이다.
4. **성질의 빈 칸 1건**(§5-2): 중첩 제외 축이 코드로만 참이고 검사가 없다.
5. **`check_links.py` 는 읽을 수 없는 `annotations.json` 에서 처리되지 않은 예외로 죽는다**
   (`PermissionError`, exit 1 · stdout 비어 있음). 판정 실패와 도구 크래시가 **같은 종료
   코드**라 소비자가 구분하지 못한다(바인더는 exit 2 로 fail-closed 하지만 사유가
   `Unexpected end of JSON input` 이다). HEAD 도 같다 — 무회귀·비차단.
6. **8차 프로브 P4·P5 는 여전히 링크를 정렬하지 않아** `store-format` 전역 거절로 덮인다
   (9·10차 note 그대로, 도구 결함 아님 — 정렬본 X4·X5 가 그 성질을 대신 세운다).

### 7-2. 자기보고와 어긋난 자리

| developer 자기보고 | 실측 | 성격 |
|---|---|---|
| "링크 스위트 95/95 PASS (직전 91/91, 신규 4 = C10 (10)(11)(12) + C12 (9))" | 95/95 · +4 일치. 번호도 **코드 주석의 번호 규약과 일치**한다(`run-link-checks.mjs` 가 "숨을 수 없다(10·11) + 흔적은 남는다(12)" 로 스스로 매긴다 · C12 (9) 도 주석 그대로). 출력 순서로는 C10 의 12·13·14 번째 행이다 | 일치(반사실이 정확히 그 셋만 FAIL) |
| "4회 byte-identical(e0e5a6d6…)" | 내 3회 재실행이 `e0e5a6d6…` 로 동일 | 일치 |
| "게이트 JSON … 직전 ae8adb8c… 대비 **추가 1건뿐**(annotationScope.skipped)" | 키 하나 제거 후 재해시 = `ae8adb8c8702…` — **증명됨** | 일치(값까지) |
| "훑기 146/697/128 -> 1116/8992/294(발견 스토어 42 동일)" | sniff 대상 `.json` **128 -> 294** 는 내 셈(제외 트리 아래 +166)과 일치. 스토어 42 = 발견 1 + 격리 41 일치 | 일치 |
| "게이트 왕복 0.342~0.352s -> 0.385~0.394s = +0.039s(+11%)" | 내 5회: 0.35~0.36 -> 0.38~0.40 (**+약 0.03 s · +10%**) | 같은 자리(기계 잡음 범위) |
| "negative control 30+4=34(floor 34)" · "3회 byte-identical 3종" · "repo 게이트 3종 PASS" · "B 계열 B1·B1b·B5뿐" | 전부 일치(값까지 재확인) | — |
| "(2) … 대조군 쌍과 실제 CLI 텍스트로 C12 (9)가 매 실행 잰다" | 검사는 존재·비공허. 다만 이것은 **진단 개선이 아니라 주장 범위 축소**다(§3-2) — 자기보고의 "문장을 좁혔다"는 표현은 정확하나 "닫았다"로 읽히지 않게 리포트에 성격을 명시했다 | 성격 한정 |

### 7-3. 문서·주석이 실측과 어긋난 자리 (1건, 개선)

| 위치 | 문구 | 실측 |
|---|---|---|
| `tools/plane-editor/check_links.py:80` vs `:839` | 모듈 머리말은 "발견을 피하는 **네 경로**", `annotation_scope` 머리말은 "발견을 피하는 **세 경로**… 셋 다"에 항목도 3개(이름·격리·심링크) | 같은 닫힘에 대한 같은 파일 안 자기모순. 이번 wave 가 (3)에서 고친 것과 **같은 종류**의 오기이며, 빠진 넷째 항목이 하필 이번 wave 가 더한 축(`SCAN_SKIP_DIRS`)이다 |

## 8. ★ 최종 판정

**결론: (a) 실사용 유지. 차단 조건 0개.**

> **판정 대상 세 항목은 충족됐다.** (1) 훑기 제외 축은 **선언이 아니라 닫힘**으로 처리됐고,
> 내가 창안한 세 모양(`.git` 안 · 중첩 · 혼합 중첩)까지 전부 닫혔다 — HEAD 에서는 셋 다 조용한
> 초록이었으므로 인과도 성립한다. 제외 사실은 `annotationScope.skipped[]` 로 판정 JSON·텍스트
> 양쪽에 실리고, **성질 3건이 매 실행 측정**하며 반사실에서 정확히 그 3건만 FAIL 한다. 대가는
> 값으로 실측했다(+0.03 s · 훑기 표면 128 -> 294 json). (2) `reasons.endpoint: null` 의 문장은
> 실측과 일치하게 좁혀졌고 성질이 실제 CLI 문자열로 잰다 — 다만 이것은 **진단의 개선이 아니라
> 약속의 축소**이며(Z3d 의 실측값은 그대로) 이 리포트가 그 사실을 명시한다. (3) fixtures README
> 는 실제 대조군 수(4 · 게이트 30 + 바인더 4 = 34)와 일치한다.
>
> **무회귀도 성립한다**: 19x3 = 57 셀 전 필드 동일, 342 레인 `wrong` 0, 실사용 바인딩 2건의
> 좌표·텍스트·`blockItemId` 불변(바인딩 JSON 이 9·10차와 **byte-identical**), 게이트 JSON 의
> 델타가 **`skipped` 키 하나뿐임을 해시로 증명**, 앵커 산출 3종 3회 byte-identical, negative
> control 34건 전부 "exactly", repo 게이트 3종 PASS, `ontology/` 변경 0, 담당 경로 밖 변경 0.
>
> **새로 나온 (가) 3건은 차단하지 않는다** — 셋 다 HEAD 에서도 같은 답이므로 이번 수정이 만든
> 것이 아니고, 실사용 산출을 바꾸지 않으며, 판정 대상 세 항목의 충족과 독립이다. 다만
> **무시해서도 안 된다**: E9(`git worktree`·submodule)는 손 기입 없이 도달하는 **일상 형상**
> 인데 전제 표가 그 경우를 "저장소 밖"으로만 적고 있고, E5·E4 는 이번 wave 가 세운 "빼되 흔적을
> 남긴다"가 sniff 실패 앞에서 **흔적 0**이 되는 자리다.

### 이 lane 은 여기서 종료해도 되는가 — **된다.**

차단 0건이므로 종료를 막을 근거가 없다. 남은 것은 아래와 같이 분류해 목록으로만 남긴다
(**개선 항목을 근거로 종료를 막지 않는다**).

**차단 (0건)** — 없음.

**개선 (5건, 크기 순)**
1. `workspace_root` 가 `.git` **파일**(worktree·submodule)을 루트로 인정하지 않는다 → 훑기가
   사라지고 사본의 답이 초록(E9). 코드 몇 줄 + 전제 표 문구.
2. `_stores_under` 의 sniff 실패(읽기 불가·머리 4KB 밖)가 **흔적 0**으로 처리된다(E5·E4) →
   `skipped[]` 에 실패 수를 함께 싣기. 겸사로 `check_links.py` 의 `PermissionError` 크래시를
   `StoreError` 로 감싸 exit 코드를 판정 실패와 구분.
3. 중첩 제외 축(`node_modules/x/node_modules`)에 **검사가 없다** → C10 에 한 줄 추가
   (반사실 `cf-nested` 가 이미 그 검사가 없음을 보였다).
4. `reasons.endpoint: null` 의 **범위를 JSON 값으로도** 싣기(텍스트 채널에만 있다).
5. `check_links.py:839` 의 "세 경로"를 넷째 항목(`SCAN_SKIP_DIRS`)과 함께 "네 경로"로 정정.

**경계 바깥 (차단 사유로 쓰지 않음)** — `HO_PYTHON` 위조 게이트(Y7) · 스토어 파일에 직접 쓰는
주체의 위조(B1·B1b·B5) · sniff 4KB 예산 자체(README "발견의 전제" 1행에 선언) · 작업공간 루트
부재의 **선언된** 경우(임시 디렉토리 — 단 worktree 는 위 개선 1로 분리했다).

> (제품 축의 다음 결정은 여전히 `docs/feedback/link-plane-weight-decision.md`(`status: open`)의
> **가중**이고 사용자 승인 대기이므로 위와 별개 트랙이다.)
