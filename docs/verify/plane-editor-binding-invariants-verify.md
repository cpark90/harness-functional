---
verdict: pass-with-notes (조건부 착수 가능)
scope: tools/plane-editor — 바인딩 불변식 I-1·I-2·I-3 + H1 처리 + 신뢰 경계 문서화
criteria: docs/verify/plane-editor-binding-hardening-verify.md §8 표가 스스로 적은 **충족 기준(수치) 그대로** + 브리프 무회귀 조건
baseline: 현재 워킹트리 (HEAD `cd4bb5d` 은 이 lane 의 **중간 상태** — §0 참조)
re-measured: I-1 3모양 · I-2 byte 동일 · I-3 발견/위양성 · H1 방어 · 무회귀 19×3 · 게이트 3종 + 44/44
new-confirmed: vnv 신규 우회 5종 — X1(정직한 스토어를 남의 문서 옆으로 **이동**: 게이트 exit 0 · 편집기 거절) · X2(레코드 id 가 문자열이 아니거나 레코드가 객체가 아닌 3모양: 게이트가 조용히 건너뛰고 편집기는 거절) · Y2b(격리 표식 한 줄로 쌍둥이 스토어를 가려 **끊긴 종단점 은폐**, exit 0) · Y3(이름을 바꾼 스토어는 발견에서 빠지고 판정 JSON 에 흔적도 없다) · Y4b(작업공간 루트가 없으면 P2b 부활)
declared-outside: H2(손 기입 documentId) · B5(유효 capture 이식) · **Z1 죽은 이름표 padding**(실측으로 재현 — 선언이 정직함을 확인) · 남의 documentId 로 새 문서
---

# plane-editor 바인딩 불변식 I-1~I-3 판정 (vnv, 5차)

## 0. 이 판정이 무엇을 기준으로 재는가

- **기준은 내가 새로 세우지 않았다.** 직전 판정 `docs/verify/plane-editor-binding-hardening-verify.md`
  §8 표의 세 불변식과 그 **충족 기준(수치)** 을 문언 그대로 옮겨 적용했다. 완화하지 않았고,
  기준에 없는 항목을 차단 사유로 올리지도 않았다(새 발견은 §7 에 분류해서 낸다).
- **형상 주의(브리프 지시대로 확인함).** HEAD `cd4bb5d` 의 `tools/plane-editor/check_links.py`
  에는 레코드 정체성 로직(`_record_document`·`unbindable`·`anchors`)이 **한 줄도 없다**
  (`git show HEAD:tools/plane-editor/check_links.py | grep -c anchors` = 0). 즉 커밋본 단독은
  직전 wave 의 N-1 강화조차 담지 않은 중간 상태이고, 완결은 커밋분 + 미커밋 diff 의 합이다.
  **모든 게이트·프로브 실행은 현재 워킹트리를 대상으로 했다.** HEAD 를 쓴 곳은 무회귀
  1:1 대조의 baseline 하나뿐이며(§9), 그 파일(`suite-result.json`)은 HEAD 와 `00e2473` 에서
  **byte 동일**(`c662790a…`)이라 baseline 으로 안전하다.
- developer 자기보고는 **판정 대상**으로만 썼다. 표의 모든 수치는 내가 다시 잰 값이다.
- 실행 환경: `/usr/bin/python3` (rdflib/pyshacl/owlrl 보유), node v22.22.3, repo root
  `/home/cpark/git/harness_ontology`.

## 1. 실행한 명령과 산출물 (재현 절차)

```
# 재실행 전 디스크본 해시 (developer 산출물 = 내 재생산 임을 증명하기 위해 먼저 잰다)
sha256sum tools/plane-editor/{suite-result.json,REPORT.md,schema-dump.json,check_links.py,README.md} \
          tools/plane-editor/src/{store.mjs,blocks.mjs} tools/plane-editor/sample-state/*

/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json  # ×3
node tools/plane-editor/run-link-checks.mjs
node tools/plane-editor/run-suite.mjs                                                                    # ×3 (별 프로세스)

# vnv 기존 프로브 — **무수정** 재실행
/usr/bin/python3 docs/verify/plane-editor-binding-hardening-link-probe.py   <scratch>/p-probe
VNV_SCRATCH=<scratch>/h-probe node docs/verify/plane-editor-binding-hardening-adversarial.mjs

# vnv 신규 프로브 (이번 판정에서 새로 만든 것)
/usr/bin/python3 docs/verify/plane-editor-binding-invariants-link-probe.py  <scratch>/y-probe
VNV_SCRATCH=<scratch>/x-probe node docs/verify/plane-editor-binding-invariants-adversarial.mjs
node docs/verify/plane-editor-binding-invariants-residual-probe.mjs

# repo 게이트
/usr/bin/python3 tools/validate.py ; /usr/bin/python3 tools/check_determinism.py ; /usr/bin/python3 tools/lint_uniformity.py
```

| 산출물 | 재실행 전 디스크본 | 별 프로세스 3회 후 |
|---|---|---|
| `suite-result.json` | `0eceae8d…` | **동일** (3회 전부) |
| `REPORT.md` | `61e425ca…` | **동일** |
| `schema-dump.json` | `bcfab19b…` | **동일** |
| `sample-state/{annotations,document}.json` | `d62ecfea…` / `3d2146f9…` | **동일** |
| `check_links.py --format json` (link-store) | — | 3회 **`4d2f4433…`** 동일 |

즉 **트리에 실린 표 = 내가 재생산한 표**이고, 내 프로브·반사실 실행은 트리를 오염시키지
않았다(모든 실행 후 위 해시 재측정 → 불변).

## 2. I-1 재측정 — 게이트와 편집기가 같은 답을 낸다

**기준(직전 판정 원문): "H3형 3모양 전부에서 게이트 exit 1 (또는 그 모양을 편집기도 로드)
· negative control 로 고정".**

`docs/verify/plane-editor-binding-hardening-adversarial.mjs` **무수정** 재실행:

| 레코드 모양 (v3, `anchorState: bound`) | 편집기 `loadStore` | 게이트 | 직전 값 |
|---|---|---|---|
| 정체성 없음 + `legacy` 표식 제거 | rejected | **exit 1** · `annotation-record-unbound` + `annotation-record-unloadable` | exit 1 |
| `anchors` 필드 자체 삭제 | rejected | **exit 1** · 같은 두 위반 · `divergence: false` | **exit 0 · pass true** |
| `anchors: null` | rejected | **exit 1** · 같은 두 위반 · `divergence: false` | **exit 0 · pass true** |

negative control 고정도 확인했다 — `node run-link-checks.mjs` C4 에서 신규 3건
(`no-anchors` · `null-anchors` · `unmarked-identity`)이 각각 **exit 1 + 위반 정확히 1건**
(`annotation-record-unloadable`). 전체 20 negative control 이 전부 "위반 정확히 1건"을 유지한다.

**판정: 수치 기준 충족.** (문언 전체("어떤 레코드 모양도")에 대해서는 §7 에 새 반례 4건.)

## 3. I-2 재측정 — 종단점 하나에 레코드 하나

**기준: "같은 id 2건이면 exit 1 · 두 파일 순서에서 verdict JSON byte-identical · 편집기도 거절".**

세 조건을 각각 따로 쟀다. byte 동일은 developer 수치를 베끼지 않고 **내 프로브로 다시**
만들었다(`plane-editor-binding-invariants-link-probe.py` Y1 — 같은 링크 스토어 **경로**에
레코드 순서만 바꿔 두 번 판정: 경로가 다르면 "순서 때문에 다르다"는 위양성이 난다).

| 조건 | 실측 |
|---|---|
| 같은 id 2건 → exit 1 | Y1a/Y1b **exit 1** · 위반 `annotation-store-duplicate-record` 1건 · 끊긴 종단점 `ln-y1:from:orphaned` 도 함께 보고 |
| 두 순서에서 판정 JSON byte 동일 | **동일** — 1959 bytes = 1959 bytes, 문자열 비교 `True` |
| 편집기도 거절 | H4 두 순서 모두 `loadStore` **rejected** (`store contract: two records share the id "a1" …`), `editorPick: null` |

**판정: 세 조건 전부 충족.**

## 4. I-3 재측정 — 범위는 발견으로 정한다

**기준: "저장소 루트에서 주석 스토어를 **발견**해 전부 판정 · 같은 실체 중복 인자는
정규화(위양성 0) · P2b 재현 시 broken 1".**

브리프 지시대로 두 축을 따로 봤다: (가) 발견이 **실제로 저장소를 훑는가**, (나) 정규화가
**위양성을 만들지 않는가**.

### 4.1 발견이 실제로 훑는가 — 심어 놓고 확인했다

인자 없이 실행한 게이트가 `annotationScope.workspaceRoot = "."` 로 저장소 루트를 잡고
`tools/plane-editor/sample-state/annotations.json` 을 발견한다(0.36초). 이것이 하드코딩된
경로가 아님을 증명하려고 **저장소의 다른 곳에 스토어를 심었다**:

```
# docs/verify/.vnv-probe-store-i3/annotations.json (documentId: doc-vnv-i3-probe) 를 만들고
/usr/bin/python3 tools/plane-editor/check_links.py --store tools/plane-editor/link-store --format json
# -> discovered: ["docs/verify/.vnv-probe-store-i3/annotations.json",
#                 "tools/plane-editor/sample-state/annotations.json"]   (확인 후 즉시 삭제)
```

또 신규 프로브 Y2a 로 **서로 다른 디렉토리**의 쌍둥이(형제가 아님)를 인자 없이 잡는지 봤다:
`ws/main/annotations.json`(bound) + `ws/copy/annotations.json`(orphaned) → **exit 1 ·
`annotation-store-duplicate-document` · broken 1**. 즉 닫힘이 "형제"에만 의존하지 않는다
(작업공간 루트가 있을 때).

### 4.2 위양성 · P2b · 나머지 기준

`plane-editor-binding-hardening-link-probe.py` **무수정** 재실행:

| 케이스 | 지금 | 직전 |
|---|---|---|
| P1b 같은 파일 2회 | **exit 0 · 위반 0** (realpath 정규화) | exit 1 (위양성) |
| P2a 둘 다 물림 | exit 1 · broken 1 | 동일 |
| **P2b `bound` 쪽만 물림** | **exit 1 · `annotation-store-duplicate-document` · broken 1** | **exit 0 · broken 0 (은폐)** |
| P2c `orphaned` 쪽만 | exit 1 · broken 1 | exit 0 · broken 1 |
| P3 인자 순서 2가지 | **byte 동일** (2647 = 2647, `4a6881c1…`) | 동일 |
| P4 세 스토어 한 문서 | exit 1 · 위반 **정확히 1건** · 세 경로 전부 명시 | 동일 |
| Y6 대조군(정상 스토어 1개) | **exit 0** | — |

**판정: 세 조건 전부 충족.** 다만 발견에는 **세 전제**가 있고(파일 이름이 `annotations.json`,
격리 표식 없음, 작업공간 루트 존재) 그 전제를 깨면 은폐가 되살아난다 — §7 Y2b·Y3·Y4b.

## 5. H1 처리 재측정 — "경계 바깥으로 미룸"이 아니라 방어인가

`captureCorrespondence` 에 검사 (4) **문서 전역 순서**가 추가됐다(`src/blocks.mjs`).
H1/H1b 프로브 **무수정** 재실행:

| 측정 | 지금 | 직전 |
|---|---|---|
| H1 위조 레코드 | `orphaned` · `forged/capture-order-mismatch-document` · accepted **false** | `relative-position` · `"Cure"` · offset 37 · accepted true |
| H1 `misResolved` | **false** | **true** |
| H1b 스토어 왕복 | `misResolved: false` · `measuredAnchorState: "orphaned"` | true · `bound` |
| `wouldFlipUpgradePathExists` | **false** | true |
| D6 모양 수 | **7** (`shapeSelection` 에 선정 근거 게시, `correspondenceForgeryComplete: true`) | 6 |

검사 (4)는 CRDT 불변식(살아남은 item 의 상대 순서는 변하지 않는다)만 쓰므로 정직한 레코드가
어길 수 없다 — 그리고 **대가는 0으로 실측됐다**: §9 의 19시나리오 × 3레인 336 레인측정과
반사실 36/74/76 이 강화 전과 전부 동일하다.

## 6. 인과 증명 — 역패치 반사실 (직전 판정의 방법 승계)

판정 delta 가 커밋 경계를 가로지르므로(§0) `git diff` 로는 인과가 안 나온다. 그래서 **트리
사본에서 고친 지점만 되살려** 현상이 재현되는지 봤다:

```
rsync -a --exclude node_modules tools/plane-editor/ <scratch>/cfN/ ; ln -s <real>/node_modules
# 프로브의 ROOT/CHECKER 상수만 사본으로 바꿔 실행. 사본 검사기는 도구 층을 못 찾으므로
export HO_TOOLS_DIR=/home/cpark/git/harness_ontology/tools
```

| 반사실 | 되살린 한 지점 | 결과 |
|---|---|---|
| **CF1 (I-1)** | `_record_document` 의 `no-anchors` 를 "투영 모양"으로 관대 처리 | H3 두 모양이 **exit 0 · pass true** 로 복귀, 편집기는 여전히 거절 → **`divergence: true`** (대조군 1행은 exit 1 유지) |
| **CF2 (I-2)** | `loadStore` 중복 id 거절 + `annotation-store-duplicate-record` 규칙 제거 | 편집기가 **accept** 하고 **파일 순서 첫 레코드**를 쥔다(`laundered/orphaned` vs `honest/bound`) → 층간 불일치 부활 |
| **CF3 (I-3)** | `annotation_scope` 대신 인자만 보기 | **P2b exit 0 · broken 0 (은폐 부활)** · **P1b exit 1 (위양성 부활)** |
| **CF4 (H1)** | `captureCorrespondence` 검사 (4) 제거 | H1 `misResolved` **true** · 부착 텍스트 `"Cure"` offset 37 · `wouldFlipUpgradePathExists` **true** |

네 반사실 모두 **고친 그 지점이 원인**임을 보인다. (CF2 에서 게이트가 여전히 exit 1 인 것은
이번 wave 가 함께 넣은 보수 병합(미상이 이긴다) 때문이다 — 편집기 쪽 절반만 되살렸기
때문이며, 게이트 쪽 규칙은 전용 negative control 이 따로 고정한다. CF3 의 P3 byte 비교는 내
패치가 만든 `annotationScope` 필드 모양 탓이라 인과 증거로 세지 않았다.)

## 7. ★ 신규 우회 창안 — 5건, (가)/(나) 분류

증거 스크립트: `docs/verify/plane-editor-binding-invariants-adversarial.mjs` (X) ·
`docs/verify/plane-editor-binding-invariants-link-probe.py` (Y) ·
`docs/verify/plane-editor-binding-invariants-residual-probe.mjs` (Z).

| # | 우회 | 실측 | 분류 | 판정 |
|---|---|---|---|---|
| **X1** | 정직한 v3 스토어를 **남의 문서 옆으로 이동**(병합·rename·`git mv`). 파일 내용은 위조가 아니다 | 편집기 `loadStore` **rejected**(`annotations.json claims document "doc-1" but the persisted document state says otherwise`) · 게이트 **exit 0 · pass true · 위반 0 · broken 0** | **(가) 일상 경로** | **CONFIRMED** |
| **X2a-c** | v3 스토어에 **깨진 레코드 모양** 추가: `id` 가 숫자 / `id` 없음 / 레코드가 객체가 아님 | 편집기 3모양 전부 **rejected**(`record 7 carries no document identity` 등) · 게이트 3모양 전부 **exit 0 · pass true** (`isinstance(record["id"], str)` 로 조용히 건너뜀) | **(가)** 도구·병합 산물로 도달(위조 주장 아님) | **CONFIRMED** |
| **Y2b** | 쌍둥이 스토어 디렉토리에 `.annotation-store-quarantine` **한 줄 파일**을 놓는다 | Y2a 에서 exit 1 · broken 1 이던 같은 트리가 **exit 0 · pass true · broken 0** 으로 바뀐다. 제외 사실은 `annotationScope.quarantined` 에 실리지만 **아무 것도 실패시키지 않는다** | **(가) 경계** — 스토어 파일 쓰기가 아니라 **저장소 파일 추가**라 bearer-claim 문단이 포괄하지 않는다 | **CONFIRMED** (끊긴 종단점 은폐) |
| **Y3** | 쌍둥이 스토어를 `annotations-backup.json` 으로 **이름만 바꾼다** | 발견에서 빠지고 `outOfScope`·`quarantined` **둘 다 빈 배열** = 흔적 없음 · exit 0 | (가) 복사·백업으로 도달 | CONFIRMED(경미) — 편집기는 그 이름을 열지 않으므로 층간 불일치는 안 생긴다 |
| **Y4b** | 작업공간(`.git`) **밖**에서 게이트 실행 + 쌍둥이가 다른 디렉토리 + 한쪽만 지목 | `workspaceRoot: null` · **exit 0 · broken 0** (P2b 부활) | (가) 조건부 — 커밋 게이트는 늘 저장소 안에서 돈다 | 관측(비차단) — 전제가 판정 JSON 에 공개됨 |
| **Z1** | H1 padding 을 **죽은 이름표**(삭제된 원 문자들의 이름표)로 만든다 | `relative-position` · `"Cure"` · offset 37 · `survivingChars 4` · **`misResolved: true`** | **(나) 경계 바깥** — 레코드를 손으로 쓰는 주체만 도달 | 경계 문단이 **이미 명시**(README 바깥표 3행·REPORT §13 (c)) → 결함 아님, 선언의 정직성 확인 |

보충 실측 두 가지:

- **X1 은 "복사"면 잡히고 "이동"이면 안 잡힌다.** 같은 트리를 작업공간 안에 두고 원본 스토어를
  남겨 두면(복사 변종) 발견이 둘을 다 보고 `annotation-store-duplicate-document` 로 **exit 1**
  이다. 원본이 사라지는 이동·병합 변종만 exit 0 이다.
- **X1 은 CRDT 해독 없이 잡을 수 있다.** 그 디렉토리의 `document.json` 은 평문 필드로
  `documentId: doc-2` 를 싣고, 스토어는 자기 `document` 필드로 그 파일을 가리키면서
  `documentId: doc-1` 을 선언한다. 즉 **JSON 두 필드 비교**로 닫히는 구멍이다(문서 파일이
  있는 디렉토리에 한해서).

**(나) 로 분류한 것은 Z1 하나뿐이고, 그것은 경계 문단이 이미 포괄한다.** 나머지 넷은 전부
(가) 쪽이며, 그중 새 **은폐**(끊긴 종단점이 사라짐)는 Y2b 하나, 새 **거짓 초록**(게이트 통과 +
편집기 거절)은 X1·X2 넷이다. 새 **오해소**(앵커가 남의 텍스트에 조용히 붙음)는 (가) 쪽에서
하나도 만들지 못했다 — 이번 wave 가 닫은 축이 바로 그 축이다.

## 8. 정지 규칙 검증 — 신뢰 경계 문단은 실측과 맞는가

README `## 신뢰 경계` 는 **안쪽 8행 / 바깥쪽 4행** 두 표로 갈렸고, REPORT §13 의 한계행도 같은
문구로 갱신됐다. 세 가지를 따로 봤다.

1. **바깥쪽 4행이 근거 없이 넓혀졌는가 → 아니다.** 네 행 중 실측으로 확인 가능한 것을 직접
   쟀다: H2(손 기입)는 프로브 재실행에서 여전히 부착(`unchanged-text`, 게이트 exit 0)이고,
   3행(죽은/모르는 이름표 padding)은 **Z1 로 실제 재현**했다(부착 성공). 즉 "막지 않는다"고
   적은 것이 실제로 막히지 않는 계열이며, **막을 수 있는 것을 경계 밖으로 밀어낸 흔적은
   없다**. 반대 방향의 증거도 있다: 같은 계열이지만 **살아 있는** 이름표로 만든 H1 은 경계
   바깥으로 미루지 않고 검사 (4)로 **방어**했다(§5).
2. **안쪽 8행은 매 실행 재측정되는가 → 대체로 그렇다.** 8행 중 6행이 게이트/스위트 값으로
   직접 대응된다(D4·D6·`annotation-store-duplicate-*`·`annotation-record-unloadable`·
   반사실 36/74/76). 검증했고 전부 표기대로다.
3. **다만 안쪽 표의 완결성 주장이 실측보다 강하다(정정 필요).**
   - "그중 한쪽만 게이트에 물리기 → 스토어 집합을 **발견**으로 정해 무력화"는 **전제 셋**
     (이름 `annotations.json` · 격리 표식 없음 · 작업공간 루트 존재)이 성립할 때만 참이다.
     Y2b·Y3·Y4b 가 각각 그 전제를 깬다.
   - REPORT §13 의 "경계 **안쪽**… 은 게이트가 **전부** 막고 매 실행 재측정한다"에서 "전부"는
     X1·X2 넷이 반증한다(게이트 통과 + 편집기 거절).
   이것은 경계를 **넓혀 결함을 숨긴** 형태가 아니라 **안쪽 목록이 불완전한** 형태다. 그래서
   CONFIRMED 는 §7 의 우회들에 걸었고, 문서 문구는 §10 의 조건 3 으로 낸다.

## 9. 무회귀 · 게이트 · 경계

| 축 | 기준 | 실측 |
|---|---|---|
| 시나리오 × 레인 1:1 | HEAD 와 동일 | **19 시나리오 × 3레인 = 57 셀 전부 동일** (`trials/measured/pass/driftChars/survived/recovered/drifted/orphaned/wrong` 9필드 전수 비교, 차이 0). `00e2473` 과도 동일 |
| 집계 | 동일 | `totals`·`lanes`·`bystanders`·`placement`·`orphanBudget`·`policy`·`fixtures` **전부 identical** |
| 전 레인 오해소 | 0 | **0** — 리포트 표를 믿지 않고 원시 `trials[].lanes[].outcome` 을 다시 세었다: 336 레인측정, `wrong` **0** |
| 반사실(막은 오해소) | 유지 | textmove **36** · phase1 **74** · naive **76** |
| `suite-result.json` 의 HEAD 대비 변화 | 이번 델타만 | 구조 diff 전수: D4 필드 추가 · D6(+1 모양 행 · `shapeSelection`·`correspondenceForgeryComplete`) · C2 requirement/note/legacyLoad · G3 payload 해시 · G5 파일수 71→86 — **scenarios/lanes/totals 는 한 값도 안 변함** |
| 스위트 게이트 | 전부 pass | G1·G2·C1·C1b·C2·C3·G3·G5 **PASS** (G4 external) |
| 링크 스위트 | 전수 | `run-link-checks.mjs` **44/44 ok · PASS** (직전 32/32) |
| 링크 negative control | 전수 FAIL 유지 | **20/20** exit 1 + **위반 정확히 1건** |
| 링크 positive control | PASS | link-store · control fixture · 실제 `sample-state`(v3) exit 0 |
| 버전 협상 경계 | exit 2 + 사유 | v1·v2 는 읽되 바인딩 불가(`annotation-store-unbound`), v99 **지목**은 exit 2 + 명시 사유, v99 **발견**은 `annotation-store-unreadable` 위반(판정 계속) |
| 결정론 | 3회 byte-identical | 스위트 3회 + **재실행 전 디스크본** 동일 · `check_links.py` 3회 `4d2f4433…` 동일 |
| repo 게이트 | 3종 PASS | `validate.py` **PASS** · `check_determinism.py` **PASS** · `lint_uniformity.py` **PASS** |
| 언어 정책 | 한글·영어만 | 스위트 G5 위반 0(86파일) + **내 전수 스캔**(node_modules·package-lock 제외 93파일): 정책 밖 문자 **0** (EN DASH 만 검출 — 조판 문자) |
| 경계 (담당 경로) | lane 밖 저작 0 | 이 wave 의 코드 변경은 전부 `tools/plane-editor/**` (28 파일). 게이트가 남의 lane 에서 읽어 오는 것은 `tools/ontology_lib.py`·`tools/lint_uniformity.py` 둘뿐이고 **둘 다 미변경**(`git status` 에 없음). 병행 lane 이 고친 `tools/{materialize,retrieve}.py` 는 `check_links.py` 가 import 하지 않는다 |
| 내 판정이 트리를 오염시켰는가 | 0 | 모든 프로브·반사실·심기 실험 후 §1 산출물 해시 **전부 불변**. 내가 만든 파일은 `docs/verify/**` 4개(이 리포트 + 프로브 3개)뿐 |

## 10. ★ 최종 판정 — 실제 바인딩 착수 가능한가

**결론: (b) 조건부 — 착수 가능. 아래 세 조건을 같은 wave 안에서 닫는다.**

> 직전 판정이 건 세 불변식은 **전부, 자기 수치 기준 그대로** 충족됐고(§2·§3·§4), 그 인과를
> 역패치 반사실로 확인했다(§6). 직전 판정이 유일하게 남긴 **비차단 정정 요구**(README·REPORT
> 문언이 H1 을 포함하도록, D6 에 7번째 모양)도 이행됐다(§5·§8).
>
> (c) 유지는 부당하다: 원래 차단 사유는 "링크가 **틀린 곳을 가리킨다**"였고, 이번에 (가) 경로
> 에서 새 **오해소는 한 건도 만들지 못했다**(§7). (a) 전면 해제도 아직 이르다: 게이트가 초록을
> 주는데 편집기가 그 파일을 못 여는 모양이 **넷**(X1·X2) 남아 있고, 표식 파일 하나로 끊긴
> 종단점을 **은폐**할 수 있다(Y2b). 셋 다 일상 경로이고 셋 다 게이트 안에서 닫힌다.

| # | 조건 | 지금 값 (실측) | 충족 기준(수치) |
|---|---|---|---|
| **1. 게이트가 건너뛰는 모양이 없다** | X1 (이동된 스토어) · X2a-c (id 가 문자열 아님/없음/레코드가 객체 아님) → **4모양 전부 게이트 exit 0 · pass true, 편집기 거절** | 4모양 전부 **exit 1**(X1 은 `document.json` 이 있는 디렉토리에서 평문 `documentId` 대조로) · negative control **4건** 신설, 각 위반 정확히 1건 · 내 X 프로브 4행 전부 `divergence: false` |
| **2. 격리·이름이 끊김을 가리지 못한다** | Y2b: 표식 한 줄로 exit 1 · broken 1 → **exit 0 · broken 0**. Y3: 이름만 바꾸면 `outOfScope`·`quarantined` 둘 다 빈 배열 | 링크가 가리키는 **문서의 스토어**를 격리가 가릴 수 없다(Y2b 재현 시 exit 1 또는 최소 broken 1) · 격리·이름으로 빠진 후보는 **전부** 판정 JSON 에 남는다(Y3 에서 `outOfScope` 비어 있지 않음) |
| **3. 발견의 전제를 문서가 수치로 밝힌다** | README 안쪽표 "한쪽만 물리기 → 무력화" 행과 REPORT §13 "안쪽은 게이트가 **전부** 막는다" 가 실측보다 강하다 | 두 문장에 전제 3개(파일 이름 `annotations.json` · 격리 표식 없음 · `workspaceRoot` 존재)와 **Y4b 실측**(작업공간 밖: exit 0 · broken 0)을 병기 |

세 조건은 전부 **일상 경로 결함**에서 나왔다. 경계 바깥 항목(H2 · B5 · Z1 죽은 이름표 padding ·
남의 documentId 로 새 문서)은 **차단 사유로 쓰지 않았다** — 그 넷은 서명된 레코드가 있어야
닫히는 축이고 이 프로토타입의 범위가 아니다.

## 11. 비차단 관측

1. **fail-closed 의 비용(Y5).** 작업공간 안에 `annotations.json` 이라는 이름의 **스토어가 아닌**
   파일이 하나라도 있으면 그 작업공간의 **모든** 게이트 실행이 exit 2 가 된다(사유는 명시된다).
   병행 lane 이 많은 이 저장소에서는 실제로 밟기 쉬운 지뢰다 — 지금 저장소에는 그런 파일이
   없다(`find`로 확인: 스토어 24개 전부 유효, 그중 23개가 `fixtures/` 격리).
2. **격리 한 줄이 fixtures 전체를 덮는다.** `tools/plane-editor/fixtures/.annotation-store-quarantine`
   하나로 fixture 트리 23개 스토어가 발견에서 빠진다(사유는 판정 JSON 에 실린다). 지금은 옳은
   선택이지만, **fixtures 아래에 실사용 스토어를 두면 조용히 판정 밖**이 된다.
3. **negative control 이 실제 저장소와 결합돼 있다.** fixture 판정마다 작업공간 루트 훑기가
   `sample-state/annotations.json` 을 함께 판정한다. 지금은 무해하지만(실측 20/20 위반 1건),
   `sample-state` 가 깨지면 **모든 negative control 이 동시에 무의미**해진다.
4. **`counts.graphNodes` 는 여전히 시점 의존**(이번 실행 371 — 병행 ontology lane 이 개체를
   늘리면 변한다). 이 JSON 을 골든 산출물로 커밋하면 안 된다는 관측은 유효하다.
5. **developer 자기보고의 수치 하나가 좁다.** "D4(+2 필드)"는 이번 wave 기준이고, HEAD 대비
   누적은 +6 필드다(§9). 결함은 아니지만 다음 baseline 혼선을 줄이려면 커밋 메시지에 "어디까지가
   이번 것"을 적는 편이 낫다(직전 판정의 같은 관측이 아직 유효하다).
6. **`placement` 계측 사정거리**(measured 38 vs 실제 부착 86)는 이번에도 그대로다. 결함은
   아니지만 REPORT 문장은 범위를 밝혀야 한다.
