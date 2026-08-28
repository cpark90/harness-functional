# Phase 1 — 앵커 엔진 검증 리포트 (실측)

> **이 파일은 `node run-suite.mjs`가 생성한다. 손으로 고치지 말 것.**
> 수치는 전부 같은 실행의 `suite-result.json`과 동일한 측정에서 나온다.

스택: Tiptap 3.30.5 / ProseMirror(@tiptap/pm 3.30.5) / yjs 13.6.32 / y-prosemirror 1.3.7 / jsdom 30.0.1 (headless).

시나리오 10종, 시나리오당 앵커 1개씩 독립 시행 → 총 60시행. 문서 fixture는 2종이다.

> **오해소(mis-resolution) 수치의 범위**: 이 리포트의 "오해소 0"은 **아래에 열거된 시나리오·레인·시행 안에서만** 측정된 값이다. 스위트 밖 편집 모양까지 보장한다는 뜻이 아니다 (§4 주장 범위 참조).

| fixture | 쓰임 | 블록 | 문자 | 앵커 |
|---|---|---|---|---|
| `main` | 편집 생존 fixture | 7 | 381 | 6 (a1, a2, a3, a4, a5, a6) |
| `twin` | 쌍둥이 문장 fixture (파괴적 편집용) | 11 | 583 | 6 (b1, b2, b3, b4, b5, b6) |

## 0. 레인 — 왜 숫자가 하나가 아닌가

브리프 §4는 "생존"을 한 숫자로 요구하지만, 앵커를 언제 캡처하느냐에 따라 값이 갈린다. 한쪽만 적으면 유리한 쪽을 고른 것이 되므로 **세 레인을 모두 측정해 나란히 싣는다**.

| 레인 | 뜻 | 대응하는 실제 상황 |
|---|---|---|
| live | 편집이 일어난 세션 안의 ProseMirror Decoration (플러그인 상태) | 편집 중인 화면 — 플러그인 상태의 앵커 |
| pipeline | 저장 시 재캡처(또는 orphan이면 원 selector 보존) → 재로드 후 해소 | 브리프 §3의 저장 경로 (저장 → 재로드) |
| stale | 편집 전 캡처한 레코드를 편집 후 문서에 그대로 들이댐 (최악 경로) | 오프라인 협업·다른 프로세스가 편집한 문서에 옛 레코드를 들이댐 |

게이트 G2는 **pipeline 레인**으로 판정한다(브리프 §3이 규정한 저장 경로이므로). stale 레인 수치도 같은 표에 그대로 싣는다 — 목표 미달분을 숨기지 않기 위해서다.

## 1. 게이트 판정

| gate | 내용 | 결과 | 근거 수치 |
|---|---|---|---|
| G1 | 문서 스키마에 annotation mark/노드 0 | PASS | plane 유무 스키마 fingerprint 동일=true, annotation 명칭 타입=0, 부착 후 doc 불변=true, Yjs 상태 불변=true, 스키마 mark 6개/노드 11개는 전부 StarterKit 콘텐츠 타입 |
| G2 | S1–S4·S8 생존 100% + S5 오해소 0 | PASS | pipeline 생존 100.0% (30/30), stale 생존 93.3% (28/30, 드리프트 2), S5 orphan 6/6, 전 레인 오해소 0 |
| G3 | 단일 명령·비대화형 재현 | PASS | 동일 프로세스 내 2회 반복 digest 일치=true, payload sha256=`4cbc205c94a0b2fb…` |
| C1 | S9·S10 전 레인 오해소 0 (합산 12시행 이상) | PASS | S9(블록 통째 삭제)+S10(제자리 교체) 12시행 — 전 레인 orphaned 36, 오해소 0. Phase 1 규칙이었다면 이 범위에서만 오해소 18건 |
| G4 | 기존 게이트 3종 회귀 | external | 이 디렉토리는 순수 추가라 `ontology/`·기존 `tools/*.py` 경로를 건드리지 않는다. `/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py`를 repo root에서 별도 실행해 회귀를 확인한다. |
| G5 | 언어 정책 (한글 산문 / 영어 용어) | PASS | 손으로 쓴 파일 20개 스캔 — 정책 밖 문자 0개 (ASCII 106202자 / 한글 7570자). 산문 한글 / 용어·식별자·문서 fixture 영어. 손으로 쓴 파일 전수를 스캔해 ASCII·한글·명시 허용 기호 밖의 문자가 0인지 기계적으로 확인한다 (gr-lang: Korean/English only). |

G2 세부: stale 레인이 브리프의 100% 목표를 만족하는가 = **no** (28/30 통과, 드리프트 2건). 드리프트는 오해소가 아니라 경계 한 칸 밀림이며, 원인·성격은 아래 D2에 있다.

## 2. 시나리오 × 앵커

`S`=주앵커(RelativePosition) 생존, `R`=quote 복구, `D`=경계 드리프트(같은 자리·경계 밀림), `O`=orphaned, `X`=오해소. 굵은 글자는 기대 불일치 셀이다 (S5는 `O`가 정답).

### 2.1 pipeline 레인 (게이트 기준)

#### 2.1.1 fixture `main` — 편집 생존 fixture

| id | 시나리오 | 기대 | a1 | a2 | a3 | a4 | a5 | a6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S2 | 앵커 범위 안에 삽입 | 범위 확장 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S4 | 앵커 범위 일부 겹쳐 삭제 | 잔여 범위로 축소 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S5 | 앵커 범위 전체 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S6 | 앵커 담은 블록 이동 (cut+paste) | 실측 보고 (블록 정체성 복구 포함) | R | R | R | R | R | R | 6 | 0 | 6 | 0 | 0 | 0 | 6/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |

#### 2.1.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

### 2.2 stale 레인 (최악 경로)

#### 2.2.1 fixture `main` — 편집 생존 fixture

| id | 시나리오 | 기대 | a1 | a2 | a3 | a4 | a5 | a6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S2 | 앵커 범위 안에 삽입 | 범위 확장 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S4 | 앵커 범위 일부 겹쳐 삭제 | 잔여 범위로 축소 생존 | **D** | **D** | S | S | S | S | 6 | 4 | 0 | 2 | 0 | 0 | 4/6 |
| S5 | 앵커 범위 전체 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S6 | 앵커 담은 블록 이동 (cut+paste) | 실측 보고 (블록 정체성 복구 포함) | R | R | R | R | R | R | 6 | 0 | 6 | 0 | 0 | 0 | 6/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |

#### 2.2.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

### 2.3 live 레인 (세션 안 Decoration)

#### 2.3.1 fixture `main` — 편집 생존 fixture

| id | 시나리오 | 기대 | a1 | a2 | a3 | a4 | a5 | a6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S2 | 앵커 범위 안에 삽입 | 범위 확장 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S4 | 앵커 범위 일부 겹쳐 삭제 | 잔여 범위로 축소 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S5 | 앵커 범위 전체 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S6 | 앵커 담은 블록 이동 (cut+paste) | 실측 보고 (블록 정체성 복구 포함) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | n/a | n/a | n/a | n/a | n/a | n/a | 0 | 0 | 0 | 0 | 0 | 0 | n/a |

#### 2.3.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

## 3. 4분류 총계

### 3.1 pipeline 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 36 | 60.0% | 주앵커 RelativePosition + guard 통과로 기대 텍스트 해소 |
| 복구 (recovered) | 6 | 10.0% | 주앵커 실패 후 블록 정체성(moved-block)으로 기대 텍스트 해소 |
| orphan (orphaned) | 18 | 30.0% | 복구 조건 미충족(삭제 증거 포함) — 명시적으로 orphaned 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 0 | 0.0% | 같은 자리인데 경계가 밀림(총 0자). 생존으로 세지 않는다 |

### 3.2 stale 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 34 | 56.7% | 주앵커 RelativePosition + guard 통과로 기대 텍스트 해소 |
| 복구 (recovered) | 6 | 10.0% | 주앵커 실패 후 블록 정체성(moved-block)으로 기대 텍스트 해소 |
| orphan (orphaned) | 18 | 30.0% | 복구 조건 미충족(삭제 증거 포함) — 명시적으로 orphaned 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 2 | 3.3% | 같은 자리인데 경계가 밀림(총 2자). 생존으로 세지 않는다 |

### 3.3 live 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 24 | 44.4% | Decoration이 편집을 따라 재정렬되어 기대 텍스트를 덮음 |
| 복구 (recovered) | 0 | 0.0% | 해당 없음 — live 레인에는 복구 단계가 없다 |
| orphan (orphaned) | 30 | 55.6% | Decoration이 사라짐 — 평면이 명시적으로 orphan으로 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 0 | 0.0% | 같은 자리인데 경계가 밀림(총 0자). 생존으로 세지 않는다 |

bystander(대상이 아닌 나머지 앵커) 270건: exact 그대로 269, 편집에 걸려 잔여 범위 1, orphan 0, 오해소 0. 한 문서에 앵커를 여러 개 얹어도 서로를 밀어내지 않는지 본 값이다 (잔여 범위는 편집이 그 앵커에도 걸친 정상 결과).

## 4. 해소 정책의 효과 (측정된 시나리오 범위 안에서 오해소 0을 만든 규칙)

**주장 범위**: 아래 "오해소 0"은 이 스위트가 실제로 돌린 시나리오 10종 (S1, S2, S3, S4, S5, S6, S7, S8, S9, S10) × 레인 3종 × 60시행 **안에서만** 참이다. 측정하지 않은 편집 모양에 대한 무한정 주장이 아니다 — 실제로 Phase 1의 "오해소 0"도 S1–S8 밖에서 두 종류가 재현되어(vnv 판정 note 3·4) S9·S10으로 스위트에 편입됐다. 같은 방식으로 스위트 밖 편집은 여전히 미측정이다 (아래 "측정하지 않은 것" 절에 무엇이 빠져 있는지 열거한다).

| 규칙 | 발동 | 없었다면 (반사실) |
|---|---|---|
| A. 구조적 affix guard — 해소 텍스트가 exact의 앞·뒤 조각으로 설명되고(head+tail ≥ min 길이), 캡처 때부터 있던 문자가 하나라도 남아야 채택 | 거절 6건 (Phase 1 guard였다면 통과했을 시행) | 해당 시행이 전부 무관한 텍스트에 부착 = 오해소 |
| B. 삭제 증거 — collapsed(문자 삭제 증언) / 자리는 살아 있는데 내용이 바뀜(제자리 교체)이면 복구를 돌리지 않는다 | orphan 확정 24건 (collapsed 12, 제자리 교체 12) | 같은 문자열의 다른 출현으로 복구가 흘러가 오해소 |
| C. 블록 정체성 — 블록이 통째로 사라졌을 때, 같은 텍스트이면서 **캡처 이후 새로 생긴** 블록이 유일할 때만 복구 (이동 O / 삭제 X) | 복구 12건 · 거절 12건 | 이동은 복구되지만 삭제도 같이 복구되어 살아남은 남의 문장에 부착 |

| 대조 정책 | 뜻 | 이 스위트에서 냈을 오해소 |
|---|---|---|
| phase1 | Phase 1에서 실제로 돌던 규칙 (겹침 1자 guard + 문서 전역 quote 복구) | 18건 |
| naive | phase1에서 tombstone 규칙까지 뺀 것 | 20건 |
| strict (현행) | 위 A·B·C | 0건 (전 레인 실측) |

막힌 자리 — 더 약한 정책이었다면 **어디에** 붙었을지 (반사실 계측, 레인별로 셈):

| 시나리오 | 앵커 | 대조 정책 | 레인 | 경로 | 붙었을 텍스트 | 현행 결과 |
|---|---|---|---|---|---|---|
| S5 | a6 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S9 | b1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S9 | b1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S9 | b2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S9 | b2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S9 | b5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S9 | b5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S10 | b1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S10 | b1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S10 | b2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S10 | b2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S10 | b3 | phase1 | pipeline+stale | relative-position | `Amazing unrelated content here` | orphaned |
| S10 | b3 | naive | pipeline+stale | relative-position | `Amazing unrelated content here` | orphaned |
| S10 | b4 | phase1 | pipeline+stale | relative-position | `Cure` | orphaned |
| S10 | b4 | naive | pipeline+stale | relative-position | `Cure` | orphaned |
| S10 | b5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S10 | b5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S10 | b6 | phase1 | pipeline+stale | relative-position | `finally something unrelated` | orphaned |
| S10 | b6 | naive | pipeline+stale | relative-position | `finally something unrelated` | orphaned |

## 5. D1 — 앵커 끝 경계에 삽입 (비게이팅 진단)

질문: RelativePosition과 Decoration이 끝 경계 삽입을 같은 쪽으로 흡수하는가?

| 앵커 | exact | live 결과 | stale 결과 | 두 레인 일치 |
|---|---|---|---|---|
| a1 | `Alpha beta` | `Alpha beta` | `Alpha beta[END]` | no |
| a2 | `delta epsilon` | `delta epsilon` | `delta epsilon[END]` | no |
| a3 | `standoff model` | `standoff model` | `standoff model[END]` | no |
| a4 | `classical weakness` | `classical weakness` | `classical weakness[END]` | no |
| a5 | `Selector multiplexing` | `Selector multiplexing` | `Selector multiplexing[END]` | no |
| a6 | `honest orphan` | `honest orphan` | `honest orphan[END]` | no |

두 레인이 끝 경계 삽입을 **다르게** 처리한다 — Decoration은 `inclusiveEnd:false`로 배타적이지만, `y-prosemirror`의 `absolutePositionToRelativePosition`은 assoc 인자를 받지 않아(3-arity, `src/lib.js:54`) 항상 우측 결합이라 삽입을 범위 안으로 흡수한다. Phase 2에서 앵커 결합 방향을 명시 저장해야 한다는 뜻이다 (비게이팅 관측).

## 6. D2 — 삭제 정렬 어긋남 (PM Step 대 y-prosemirror diff)

질문: PM이 지운 범위와 y-prosemirror가 Yjs에 기록한 삭제 범위가 같은 자리인가?

| 앵커 | exact | PM 삭제 시작 | Yjs 삭제 시작 | 어긋남(자) | 삭제 문자수 |
|---|---|---|---|---|---|
| a1 | `Alpha beta` | 28 | 29 | 1 | 11 |
| a2 | `delta epsilon` | 46 | 47 | 1 | 13 |
| a3 | `standoff model` | 81 | 81 | 0 | 13 |
| a4 | `classical weakness` | 163 | 163 | 0 | 15 |
| a5 | `Selector multiplexing` | 209 | 209 | 0 | 17 |
| a6 | `honest orphan` | 303 | 303 | 0 | 13 |

PM Step과 Yjs 삭제 범위가 **어긋나는 앵커가 있다**. `y-prosemirror`는 PM step을 그대로 옮기지 않고 텍스트를 `lib0/diff`의 `simpleDiff`로 비교해 Yjs 삭제 범위를 정하기 때문이다 (`node_modules/y-prosemirror/src/plugins/sync-plugin.js:1075` `updateYText`). 삭제 경계 양쪽에 같은 문자(예: 공백)가 있으면 결과 문서는 동일하지만 tombstone 경계가 한 칸 밀리고, 그 자리에 걸친 stale 앵커는 잔여 범위가 한 글자 넓게/좁게 해소된다 = 위 표의 드리프트. **저장 시 재캡처(pipeline 레인)를 하면 사라지는 오차**이므로, Phase 2의 저장 규약은 "편집 세션이 살아 있으면 저장 시점에 앵커를 다시 캡처한다"를 포함해야 한다.

## 7. 관측 (수치에서 바로 도출)

- G2 대상(S1–S4·S8) 30건 — pipeline 레인(저장 시 재캡처 → 재로드) 생존 30 (100.0%), 드리프트 0, orphan 0, 오해소 0. 같은 시행을 stale 레인(편집 전 레코드를 편집 후 문서에 들이댐)으로 재면 생존 28 (93.3%), 드리프트 2, 오해소 0.
- S4(범위 일부 겹쳐 삭제): pipeline 생존 6/6, stale 생존 4/6 + 드리프트 2건(총 2자). 드리프트는 "다른 곳에 붙음"이 아니라 삭제 경계가 한 칸 밀린 것이다 — 원인은 D2 참조.
- S5(범위 전체 삭제) 6건: orphaned 6, 오해소 0. collapsed = CRDT가 삭제를 증언한 경우라 복구를 돌리지 않는다. 이 규칙이 없었다면(naive 정책) 스위트 전체에서 오해소가 20건 났다 — a6은 같은 문자열이 문서에 두 번 나오는 함정 앵커다.
- S6(블록 cut+paste) 6건: 주앵커 생존 0, 복구 6, orphan 0, 오해소 0. live 레인은 생존 0/6 — PM이 블록을 지웠다 새로 넣으면 Decoration은 전부 사라지고 Yjs RelativePosition도 null을 돌려준다. 복구는 블록 정체성(같은 텍스트 + 캡처 이후 새로 생긴 블록 + 유일)으로만 하며, 같은 조건이 S9(블록 삭제)에서는 성립하지 않는다 — 이동과 삭제를 가르는 지점이 정확히 이것이다.
- S7(오프라인 동시 편집 후 병합) 6건: 저장 앵커 생존 6, 복구 0, orphan 0, 오해소 0, 두 복제본 수렴 6/6. 반면 병합을 받은 세션의 live 레인은 생존 0/6 (orphan 6) — y-prosemirror는 원격 업데이트를 PM step으로 옮기지 않고 문서 전체를 replace하므로(`sync-plugin.js` `_typeChanged`: `tr.replace(0, doc.content.size, …)`) Decoration이 전부 날아간다. Phase 2 필수 요구: 원격 업데이트(isChangeOrigin) 후에는 저장 앵커로 평면을 재수화(rehydrate)해야 한다.
- S9(블록 통째 삭제)·S10(제자리 교체) 합산 12시행 — 전 레인 orphaned 36, 오해소 0. Phase 1 규칙이었다면 이 두 시나리오에서만 오해소가 18건 났다(반사실). 두 시나리오는 vnv가 스위트 밖에서 재현한 실패를 그대로 시나리오화한 것이다.
- 복구 경로: 주앵커 채택 72건, 이동 블록 복구(moved-block) 12건, orphan 36건. orphan 사유 내역: collapsed/tombstone-evidence 12 / content-replaced/no-surviving-characters 12 / block-gone/no-matching-block 10 / block-gone/matching-block-is-original 2. 구조적 affix guard가 거절했는데 Phase 1 guard였다면 통과했을 시행 6건.
- pipeline 레인에서 기대와 어긋난 시행은 없다.
- stale 레인에서 기대와 어긋난 시행 2건: S4/a1=drifted, S4/a2=drifted.
- bystander(같은 문서의 나머지 앵커) 270건 중 exact 그대로 269, 편집에 걸려 잔여 범위 1, orphan 0, 오해소 0 — 앵커 다수를 한 평면에 얹어도 서로를 밀어내지 않는지 확인한 값이다.

## 8. 측정하지 않은 것 (잔여 위험)

"오해소 0"이 어디까지의 주장인지 못 박아 두는 절이다. 아래 항목은 이 스위트가 **한 번도 누르지 않은** 경로이므로, 여기서 새 오해소가 나올 수 있다 (Phase 1의 S9·S10이 정확히 그렇게 발견됐다).

| 미측정 항목 | 왜 위험한가 |
|---|---|
| 문서 규모 — fixture는 main 7블록/381자, twin 11블록/583자, 앵커는 시나리오당 6개 | 대형 문서·수백 앵커에서의 후보 충돌률과 성능은 미측정 |
| 블록 종류 — fixture는 heading·paragraph만 쓴다 | 표·중첩 리스트·코드블록 안의 앵커, 블록 타입 변경(paragraph -> heading)은 미측정 |
| 복합 편집 — "블록을 고친 뒤 이동", "여러 블록 동시 삭제", 앵커 범위를 가로지르는 동시 편집 | 블록 정체성 복구는 블록 텍스트가 **완전히 같을 때만** 걸리므로, 고쳐서 옮기면 orphan이 된다(안전하지만 복구율 하락). 그 경계는 미측정 |
| 문서 재임포트 — 같은 텍스트를 새 Y.Doc으로 다시 만들어 붙이는 경로 | 캡처 시점 state vector 기준으로는 모든 블록이 "새 내용"이 되므로, 블록 텍스트가 유일하면 복구가 걸린다. 이 경로의 오부착 위험은 미측정 |
| 앵커가 블록 경계를 걸치는 경우 (blockContext 없음) | 이 경우 이동 복구를 아예 시도하지 않는다(=orphan). 안전한 방향이지만 복구율 손실은 미측정 |
| 경계 흡수 — 앵커 끝에 붙여 쓴 긴 삽입 | D1이 보였듯 RelativePosition은 끝 경계 삽입을 범위 안으로 흡수한다. 흡수량 상한이 없으므로 앵커가 크게 늘어날 수 있다(오부착은 아니나 범위 오염) |

## 9. 재현

```
cd tools/plane-editor && npm install   # 최초 1회 (pin된 버전)
node run-suite.mjs                     # -> suite-result.json + REPORT.md
```

비대화형·결정론적이다. Yjs client ID를 고정하고 시각·난수를 결과에 넣지 않으므로, 같은 커밋에서 재실행하면 `suite-result.json`과 이 파일이 byte 단위로 같아야 한다 (재실행 후 `git diff --stat`가 비어야 함).

