# Phase 1 — 앵커 엔진 검증 리포트 (실측)

> **이 파일은 `node run-suite.mjs`가 생성한다. 손으로 고치지 말 것.**
> 수치는 전부 같은 실행의 `suite-result.json`과 동일한 측정에서 나온다.

스택: Tiptap 3.30.5 / ProseMirror(@tiptap/pm 3.30.5) / yjs 13.6.32 / y-prosemirror 1.3.7 / jsdom 30.0.1 (headless).

시나리오 19종, 시나리오당 앵커 1개씩 독립 시행 → 총 114시행. 문서 fixture는 2종이다.

> **오해소(mis-resolution) 수치의 범위**: 이 리포트의 "오해소 0"은 **아래에 열거된 시나리오·레인·시행 안에서만** 측정된 값이다. 스위트 밖 편집 모양까지 보장한다는 뜻이 아니다 (§4 주장 범위 참조).

| fixture | 쓰임 | 블록 | 문자 | 앵커 |
|---|---|---|---|---|
| `main` | 편집 생존 fixture | 7 | 381 | 6 (a1, a2, a3, a4, a5, a6) |
| `twin` | 쌍둥이 문장 fixture (파괴적 편집용) | 11 | 583 | 6 (b1, b2, b3, b4, b5, b6) |
| `s11` | 앵커마다 쌍둥이 블록이 있는 fixture (블록 사라짐 계열) | 16 | 868 | 6 (c1, c2, c3, c4, c5, c6) |

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
| G3 | 단일 명령·비대화형 재현 | PASS | 동일 프로세스 내 2회 반복 digest 일치=true, payload sha256=`94f80f79b9d44aa6…` |
| C1 | S9·S10 전 레인 오해소 0 (합산 12시행 이상) | PASS | S9(블록 통째 삭제)+S10(제자리 교체) 12시행 — 전 레인 orphaned 36, 오해소 0. Phase 1 규칙이었다면 이 범위에서만 오해소 18건 |
| C1b | S11 전 레인 오해소 0 (시나리오마다 2시행 이상) | PASS | S11a·S11b(쌍둥이 블록 이동)+S11c(재타이핑)+S11d(원격 작성)+S11e(v1 레코드) 30시행 — 전 레인 orphaned 90, 오해소 0. 텍스트 동일성으로 이동을 추정하는 정책(textmove)이었다면 이 범위에서만 오해소 36건 |
| C2 | 문서 정체성 바인딩 + 저장소 계약 무결성 | PASS | 다른 문서 3모양에 부착 0건 (같은 문서 대조군 해소=true), 채워 넣은 캡처 증거 7모양 중 부착 0건 (승격 경로 존재=false; 로드 통과 2모양은 해소 시점 대응 검사가 2모양 차단), 옛 파일 로드 시 정체성 입양=false · 대조군 해소=true · 알 수 없는 버전 거절=true |
| C3 | 흔한 편집 조작 6종의 orphan 예산 게시 | PASS | 조작 6종 · orphan 46/60 레인측정 · 오해소 0 · 대조군(범위 안 삽입) 생존=true · 앵커 텍스트가 그대로인 시행 38건 중 제자리 밖 부착 0건 |
| G4 | 기존 게이트 3종 회귀 | external | 이 디렉토리는 순수 추가라 `ontology/`·기존 `tools/*.py` 경로를 건드리지 않는다. `/usr/bin/python3 tools/{validate,check_determinism,lint_uniformity}.py`를 repo root에서 별도 실행해 회귀를 확인한다. |
| G5 | 언어 정책 (한글 산문 / 영어 용어) | PASS | 손으로 쓴 파일 146개 스캔 — 정책 밖 문자 0개 (ASCII 465487자 / 한글 57826자). 산문 한글 / 용어·식별자·문서 fixture 영어. 손으로 쓴 파일 전수를 스캔해 ASCII·한글·명시 허용 기호 밖의 문자가 0인지 기계적으로 확인한다 (gr-lang: Korean/English only). |

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
| S6 | 앵커 담은 블록 이동 (cut+paste) | 복구율 손실 계측 (블록 정체성이 파괴되는 편집 — D3) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12a | 앵커 담은 블록 이동 (한 트랜잭션 = 편집기 이동 명령) | orphan 예산 계측 (앵커 텍스트는 문서에 그대로 남는다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S12b | 앞 블록과 병합 (줄 처음에서 Backspace) | orphan 예산 계측 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12c | 앵커 시작점에서 문단 분할 (Enter) | orphan 예산 계측 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12d | 앵커 담은 블록 삭제 후 undo | orphan 예산 계측 (문서는 완전히 복원된다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |

#### 2.1.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

#### 2.1.3 fixture `s11` — 앵커마다 쌍둥이 블록이 있는 fixture (블록 사라짐 계열)

| id | 시나리오 | 기대 | c1 | c2 | c3 | c4 | c5 | c6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S11a | 쌍둥이 블록 이동 후 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11b | 앵커 블록 삭제 후 쌍둥이 블록 이동 (순서 반대) | orphaned 판정 (오해소 0 — 순서 산물이 아님) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11c | 앵커 블록 삭제 후 같은 문장 재타이핑 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11d | 원격 피어가 같은 문장 블록 작성 + 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11e | v1 레코드(출처 미상) + 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0 — 하위호환 경로) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

### 2.2 stale 레인 (최악 경로)

#### 2.2.1 fixture `main` — 편집 생존 fixture

| id | 시나리오 | 기대 | a1 | a2 | a3 | a4 | a5 | a6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S2 | 앵커 범위 안에 삽입 | 범위 확장 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S4 | 앵커 범위 일부 겹쳐 삭제 | 잔여 범위로 축소 생존 | **D** | **D** | S | S | S | S | 6 | 4 | 0 | 2 | 0 | 0 | 4/6 |
| S5 | 앵커 범위 전체 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S6 | 앵커 담은 블록 이동 (cut+paste) | 복구율 손실 계측 (블록 정체성이 파괴되는 편집 — D3) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12a | 앵커 담은 블록 이동 (한 트랜잭션 = 편집기 이동 명령) | orphan 예산 계측 (앵커 텍스트는 문서에 그대로 남는다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S12b | 앞 블록과 병합 (줄 처음에서 Backspace) | orphan 예산 계측 | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S12c | 앵커 시작점에서 문단 분할 (Enter) | orphan 예산 계측 | S | **O** | **O** | **O** | S | **O** | 6 | 2 | 0 | 0 | 4 | 0 | 2/6 |
| S12d | 앵커 담은 블록 삭제 후 undo | orphan 예산 계측 (문서는 완전히 복원된다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |

#### 2.2.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

#### 2.2.3 fixture `s11` — 앵커마다 쌍둥이 블록이 있는 fixture (블록 사라짐 계열)

| id | 시나리오 | 기대 | c1 | c2 | c3 | c4 | c5 | c6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S11a | 쌍둥이 블록 이동 후 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11b | 앵커 블록 삭제 후 쌍둥이 블록 이동 (순서 반대) | orphaned 판정 (오해소 0 — 순서 산물이 아님) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11c | 앵커 블록 삭제 후 같은 문장 재타이핑 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11d | 원격 피어가 같은 문장 블록 작성 + 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11e | v1 레코드(출처 미상) + 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0 — 하위호환 경로) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

### 2.3 live 레인 (세션 안 Decoration)

#### 2.3.1 fixture `main` — 편집 생존 fixture

| id | 시나리오 | 기대 | a1 | a2 | a3 | a4 | a5 | a6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S2 | 앵커 범위 안에 삽입 | 범위 확장 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S4 | 앵커 범위 일부 겹쳐 삭제 | 잔여 범위로 축소 생존 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S5 | 앵커 범위 전체 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S6 | 앵커 담은 블록 이동 (cut+paste) | 복구율 손실 계측 (블록 정체성이 파괴되는 편집 — D3) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S7 | Yjs 동시 편집 병합 | 실측 보고 (RelativePosition 생존율) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S8 | 저장 → 프로세스 재시작 → 재로드 | 전 앵커 복원 | n/a | n/a | n/a | n/a | n/a | n/a | 0 | 0 | 0 | 0 | 0 | 0 | n/a |
| S12a | 앵커 담은 블록 이동 (한 트랜잭션 = 편집기 이동 명령) | orphan 예산 계측 (앵커 텍스트는 문서에 그대로 남는다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |
| S12b | 앞 블록과 병합 (줄 처음에서 Backspace) | orphan 예산 계측 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12c | 앵커 시작점에서 문단 분할 (Enter) | orphan 예산 계측 | S | S | S | S | S | S | 6 | 6 | 0 | 0 | 0 | 0 | 6/6 |
| S12d | 앵커 담은 블록 삭제 후 undo | orphan 예산 계측 (문서는 완전히 복원된다) | **O** | **O** | **O** | **O** | **O** | **O** | 6 | 0 | 0 | 0 | 6 | 0 | 0/6 |

#### 2.3.2 fixture `twin` — 쌍둥이 문장 fixture (파괴적 편집용)

| id | 시나리오 | 기대 | b1 | b2 | b3 | b4 | b5 | b6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S9 | 앵커 담은 블록 통째 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S10 | 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

#### 2.3.3 fixture `s11` — 앵커마다 쌍둥이 블록이 있는 fixture (블록 사라짐 계열)

| id | 시나리오 | 기대 | c1 | c2 | c3 | c4 | c5 | c6 | 앵커수 | 생존 | 복구 | 드리프트 | orphan | 오해소 | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S11a | 쌍둥이 블록 이동 후 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11b | 앵커 블록 삭제 후 쌍둥이 블록 이동 (순서 반대) | orphaned 판정 (오해소 0 — 순서 산물이 아님) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11c | 앵커 블록 삭제 후 같은 문장 재타이핑 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11d | 원격 피어가 같은 문장 블록 작성 + 앵커 블록 삭제 | orphaned 판정 (오해소 0) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |
| S11e | v1 레코드(출처 미상) + 앵커 텍스트 제자리 교체 | orphaned 판정 (오해소 0 — 하위호환 경로) | O | O | O | O | O | O | 6 | 0 | 0 | 0 | 6 | 0 | 6/6 |

## 3. 4분류 총계

### 3.1 pipeline 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 48 | 42.1% | 주앵커 RelativePosition + guard 통과로 기대 텍스트 해소 |
| 복구 (recovered) | 0 | 0.0% | 주앵커 실패 후 블록 item 정체성(block-identity)으로 기대 텍스트 해소 |
| orphan (orphaned) | 66 | 57.9% | 복구 조건 미충족(삭제 증거·출처 미상 포함) — 명시적으로 orphaned 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 0 | 0.0% | 같은 자리인데 경계가 밀림(총 0자). 생존으로 세지 않는다 |

### 3.2 stale 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 36 | 31.6% | 주앵커 RelativePosition + guard 통과로 기대 텍스트 해소 |
| 복구 (recovered) | 0 | 0.0% | 주앵커 실패 후 블록 item 정체성(block-identity)으로 기대 텍스트 해소 |
| orphan (orphaned) | 76 | 66.7% | 복구 조건 미충족(삭제 증거·출처 미상 포함) — 명시적으로 orphaned 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 2 | 1.8% | 같은 자리인데 경계가 밀림(총 2자). 생존으로 세지 않는다 |

### 3.3 live 레인

| 분류 | 건수 | 비율 | 의미 |
|---|---|---|---|
| 생존 (survived) | 36 | 33.3% | Decoration이 편집을 따라 재정렬되어 기대 텍스트를 덮음 |
| 복구 (recovered) | 0 | 0.0% | 해당 없음 — live 레인에는 복구 단계가 없다 |
| orphan (orphaned) | 72 | 66.7% | Decoration이 사라짐 — 평면이 명시적으로 orphan으로 표기 |
| 오해소 (wrong) | 0 | 0.0% | 무관한 위치에 부착 — **0이어야 함** |
| (참고) 드리프트 (drifted) | 0 | 0.0% | 같은 자리인데 경계가 밀림(총 0자). 생존으로 세지 않는다 |

bystander(대상이 아닌 나머지 앵커) 540건: exact 그대로 517, 편집에 걸려 잔여 범위 1, orphan 22, 오해소 0. 한 문서에 앵커를 여러 개 얹어도 서로를 밀어내지 않는지 본 값이다 (잔여 범위는 편집이 그 앵커에도 걸친 정상 결과).

## 4. 해소 정책의 효과 (측정된 시나리오 범위 안에서 오해소 0을 만든 규칙)

**주장 범위**: 아래 "오해소 0"은 이 스위트가 실제로 돌린 시나리오 19종 (S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11a, S11b, S11c, S11d, S11e, S12a, S12b, S12c, S12d) × 레인 3종 × 114시행 **안에서만** 참이다. 측정하지 않은 편집 모양에 대한 무한정 주장이 아니다 — 실제로 Phase 1의 "오해소 0"도 S1–S8 밖에서 두 종류가 재현되어(vnv 판정 note 3·4) S9·S10으로 스위트에 편입됐다. 같은 방식으로 스위트 밖 편집은 여전히 미측정이다 (아래 "측정하지 않은 것" 절에 무엇이 빠져 있는지 열거한다).

| 규칙 | 발동 | 없었다면 (반사실) |
|---|---|---|
| 0. 문서 정체성 바인딩 — 레코드의 문서 id와 지금 문서의 id가 **둘 다 있고 같을 때만** selector를 읽는다 (`src/document-id.mjs`) | 다른 문서 3모양에 부착 0건 (D5) | 같은 clientID로 만든 다른 문서·재임포트본·파생본에 레코드가 그대로 붙는다 (실측: vnv M5) |
| A. 구조적 affix guard — 해소 텍스트가 exact의 앞·뒤 조각으로 설명되고(head+tail ≥ min 길이), 캡처 때 앵커에 들어 있던 **바로 그 문자**(문자 정체성)가 하나라도 남아야 채택 | 거절 12건 (Phase 1 guard였다면 통과했을 시행) | 해당 시행이 전부 무관한 텍스트에 부착 = 오해소 |
| B. 삭제 증거 — collapsed(문자 삭제 증언) / 자리는 살아 있는데 내용이 바뀜(제자리 교체)이면 복구를 돌리지 않는다 | orphan 확정 52건 (collapsed 28, 제자리 교체 24) | 같은 문자열의 다른 출현으로 복구가 흘러가 오해소 |
| C. 블록 item 정체성 — 블록이 통째로 사라졌을 때, 저장된 **item id가 지금도 살아 있는 블록**일 때만 복구 (텍스트 동일성은 보조 검증) | 복구 0건 · 거절 90건 | "같은 텍스트 블록이 새로 생겼다"로 복구하게 되어, 재타이핑·쌍둥이 이동·원격 작성이 전부 부착 (D3·S11) |

| 대조 정책 | 뜻 | 이 스위트에서 냈을 오해소 | 이 스위트에서 살렸을 복구 |
|---|---|---|---|
| textmove | 블록 **텍스트** 동일성으로 이동을 추정하는 복구 (C1 규칙 + 원격 client 보정) | 36건 | 24건 |
| phase1 | Phase 1에서 실제로 돌던 규칙 (겹침 1자 guard + 문서 전역 quote 복구) | 74건 | 30건 |
| naive | phase1에서 tombstone 규칙까지 뺀 것 | 76건 | 46건 |
| strict (현행) | 위 A·B·C | 0건 (전 레인 실측) | 기준 |

오른쪽 열이 **안전을 택한 대가**다. strict가 orphan으로 접은 자리 중 그 정책이었다면 기대 텍스트로 살아났을 시행 수이며, 0이 아니면 복구율을 실제로 잃고 있다는 뜻이다 (허용되는 손실이지만 숨기지 않는다). textmove의 두 숫자는 같은 규칙의 양면이다 — 이동을 텍스트로 추정하면 그만큼 살리고 그만큼 오부착한다.

포기한 복구 — 더 약한 정책이었다면 **살렸을** 자리 (반사실 계측):

| 시나리오 | 앵커 | 대조 정책 | 레인 | 경로 | 살렸을 텍스트 | strict의 orphan 사유 |
|---|---|---|---|---|---|---|
| S6 | a1 | textmove | pipeline+stale | text-block | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S6 | a1 | phase1 | pipeline+stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S6 | a1 | naive | pipeline+stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S6 | a2 | textmove | pipeline+stale | text-block | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S6 | a2 | phase1 | pipeline+stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S6 | a2 | naive | pipeline+stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S6 | a3 | textmove | pipeline+stale | text-block | `standoff model` | `block-gone/block-identity-destroyed` |
| S6 | a3 | phase1 | pipeline+stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S6 | a3 | naive | pipeline+stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S6 | a4 | textmove | pipeline+stale | text-block | `classical weakness` | `block-gone/block-identity-destroyed` |
| S6 | a4 | phase1 | pipeline+stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S6 | a4 | naive | pipeline+stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S6 | a5 | textmove | pipeline+stale | text-block | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S6 | a5 | phase1 | pipeline+stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S6 | a5 | naive | pipeline+stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S6 | a6 | textmove | pipeline+stale | text-block | `honest orphan` | `block-gone/block-identity-destroyed` |
| S6 | a6 | phase1 | pipeline+stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |
| S6 | a6 | naive | pipeline+stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |
| S12a | a1 | naive | pipeline+stale | text-quote | `Alpha beta` | `collapsed/tombstone-evidence` |
| S12a | a2 | naive | pipeline+stale | text-quote | `delta epsilon` | `collapsed/tombstone-evidence` |
| S12a | a3 | naive | pipeline+stale | text-quote | `standoff model` | `collapsed/tombstone-evidence` |
| S12a | a4 | naive | pipeline+stale | text-quote | `classical weakness` | `collapsed/tombstone-evidence` |
| S12a | a5 | naive | pipeline+stale | text-quote | `Selector multiplexing` | `collapsed/tombstone-evidence` |
| S12a | a6 | naive | pipeline+stale | text-quote | `honest orphan` | `collapsed/tombstone-evidence` |
| S12b | a1 | phase1 | stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S12b | a1 | naive | stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S12b | a2 | phase1 | stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S12b | a2 | naive | stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S12b | a3 | phase1 | stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S12b | a3 | naive | stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S12b | a4 | phase1 | stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S12b | a4 | naive | stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S12b | a5 | phase1 | stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S12b | a5 | naive | stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S12b | a6 | phase1 | stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |
| S12b | a6 | naive | stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |
| S12c | a2 | naive | stale | text-quote | `delta epsilon` | `collapsed/tombstone-evidence` |
| S12c | a3 | naive | stale | text-quote | `standoff model` | `collapsed/tombstone-evidence` |
| S12c | a4 | naive | stale | text-quote | `classical weakness` | `collapsed/tombstone-evidence` |
| S12c | a6 | naive | stale | text-quote | `honest orphan` | `collapsed/tombstone-evidence` |
| S12d | a1 | textmove | pipeline+stale | text-block | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S12d | a1 | phase1 | pipeline+stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S12d | a1 | naive | pipeline+stale | text-quote | `Alpha beta` | `block-gone/block-identity-destroyed` |
| S12d | a2 | textmove | pipeline+stale | text-block | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S12d | a2 | phase1 | pipeline+stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S12d | a2 | naive | pipeline+stale | text-quote | `delta epsilon` | `block-gone/block-identity-destroyed` |
| S12d | a3 | textmove | pipeline+stale | text-block | `standoff model` | `block-gone/block-identity-destroyed` |
| S12d | a3 | phase1 | pipeline+stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S12d | a3 | naive | pipeline+stale | text-quote | `standoff model` | `block-gone/block-identity-destroyed` |
| S12d | a4 | textmove | pipeline+stale | text-block | `classical weakness` | `block-gone/block-identity-destroyed` |
| S12d | a4 | phase1 | pipeline+stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S12d | a4 | naive | pipeline+stale | text-quote | `classical weakness` | `block-gone/block-identity-destroyed` |
| S12d | a5 | textmove | pipeline+stale | text-block | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S12d | a5 | phase1 | pipeline+stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S12d | a5 | naive | pipeline+stale | text-quote | `Selector multiplexing` | `block-gone/block-identity-destroyed` |
| S12d | a6 | textmove | pipeline+stale | text-block | `honest orphan` | `block-gone/block-identity-destroyed` |
| S12d | a6 | phase1 | pipeline+stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |
| S12d | a6 | naive | pipeline+stale | text-quote | `honest orphan` | `block-gone/block-identity-destroyed` |

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
| S11a | c1 | textmove | pipeline+stale | text-block | `disputed clause` | orphaned |
| S11a | c1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11a | c1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11a | c2 | textmove | pipeline+stale | text-block | `honest orphan` | orphaned |
| S11a | c2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11a | c2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11a | c3 | textmove | pipeline+stale | text-block | `Alpha beta` | orphaned |
| S11a | c3 | phase1 | pipeline+stale | text-quote | `Alpha beta` | orphaned |
| S11a | c3 | naive | pipeline+stale | text-quote | `Alpha beta` | orphaned |
| S11a | c4 | textmove | pipeline+stale | text-block | `Critical failure` | orphaned |
| S11a | c4 | phase1 | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11a | c4 | naive | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11a | c5 | textmove | pipeline+stale | text-block | `standoff model` | orphaned |
| S11a | c5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11a | c5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11a | c6 | textmove | pipeline+stale | text-block | `final verdict` | orphaned |
| S11a | c6 | phase1 | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11a | c6 | naive | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11b | c1 | textmove | pipeline+stale | text-block | `disputed clause` | orphaned |
| S11b | c1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11b | c1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11b | c2 | textmove | pipeline+stale | text-block | `honest orphan` | orphaned |
| S11b | c2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11b | c2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11b | c3 | textmove | pipeline+stale | text-block | `Alpha beta` | orphaned |
| S11b | c3 | phase1 | pipeline+stale | text-quote | `Alpha beta` | orphaned |
| S11b | c3 | naive | pipeline+stale | text-quote | `Alpha beta` | orphaned |
| S11b | c4 | textmove | pipeline+stale | text-block | `Critical failure` | orphaned |
| S11b | c4 | phase1 | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11b | c4 | naive | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11b | c5 | textmove | pipeline+stale | text-block | `standoff model` | orphaned |
| S11b | c5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11b | c5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11b | c6 | textmove | pipeline+stale | text-block | `final verdict` | orphaned |
| S11b | c6 | phase1 | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11b | c6 | naive | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11c | c1 | textmove | pipeline+stale | text-block | `disputed clause` | orphaned |
| S11c | c1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11c | c1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11c | c2 | textmove | pipeline+stale | text-block | `honest orphan` | orphaned |
| S11c | c2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11c | c2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11c | c3 | textmove | pipeline+stale | text-block | `Alpha beta` | orphaned |
| S11c | c4 | textmove | pipeline+stale | text-block | `Critical failure` | orphaned |
| S11c | c4 | phase1 | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11c | c4 | naive | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11c | c5 | textmove | pipeline+stale | text-block | `standoff model` | orphaned |
| S11c | c5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11c | c5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11c | c6 | textmove | pipeline+stale | text-block | `final verdict` | orphaned |
| S11c | c6 | phase1 | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11c | c6 | naive | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11d | c1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11d | c1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11d | c2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11d | c2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11d | c4 | phase1 | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11d | c4 | naive | pipeline+stale | text-quote | `Critical failure` | orphaned |
| S11d | c5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11d | c5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11d | c6 | phase1 | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11d | c6 | naive | pipeline+stale | text-quote | `final verdict` | orphaned |
| S11e | c1 | phase1 | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11e | c1 | naive | pipeline+stale | text-quote | `disputed clause` | orphaned |
| S11e | c2 | phase1 | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11e | c2 | naive | pipeline+stale | text-quote | `honest orphan` | orphaned |
| S11e | c3 | phase1 | pipeline+stale | relative-position | `Amazing unrelated content here` | orphaned |
| S11e | c3 | naive | pipeline+stale | relative-position | `Amazing unrelated content here` | orphaned |
| S11e | c4 | phase1 | pipeline+stale | relative-position | `Cure` | orphaned |
| S11e | c4 | naive | pipeline+stale | relative-position | `Cure` | orphaned |
| S11e | c5 | phase1 | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11e | c5 | naive | pipeline+stale | text-quote | `standoff model` | orphaned |
| S11e | c6 | phase1 | pipeline+stale | relative-position | `finally something unrelated` | orphaned |
| S11e | c6 | naive | pipeline+stale | relative-position | `finally something unrelated` | orphaned |

## 5. orphan 예산 — 흔한 편집 조작마다 앵커가 얼마나 끊기는가

정밀도(오해소 0)만 재는 게이트는 재현율을 얼마든지 깎을 수 있다. 그래서 **앵커 텍스트가 편집 후에도 문서에 그대로 남는** 조작들을 정식 시나리오로 넣고, 그 orphan율을 여기에 게시한다. 목표는 orphan을 줄이는 것이 아니라 **보이게 하는 것**이므로 값 자체는 게이트가 아니다 (게이트는 "측정했는가 · 오해소 0인가 · 대조군은 살아남는가"만 본다).

| 조작 | 시나리오 | 시행 | pipeline orphan | stale orphan | 앵커 텍스트 잔존 | 더 약한 정책이었다면 살렸을 복구 |
|---|---|---|---|---|---|---|
| `insert-inside-anchor` (대조군) | S2 앵커 범위 안에 삽입 | 6 | 0/6 (0.0%) | 0/6 (0.0%) | 1/6 | textmove 0 · phase1 0 · naive 0 |
| `move-block-two-transactions` | S6 앵커 담은 블록 이동 (cut+paste) | 6 | 6/6 (100.0%) | 6/6 (100.0%) | 6/6 | textmove 12 · phase1 12 · naive 12 |
| `move-block-one-transaction` | S12a 앵커 담은 블록 이동 (한 트랜잭션 = 편집기 이동 명령) | 6 | 6/6 (100.0%) | 6/6 (100.0%) | 6/6 | textmove 0 · phase1 0 · naive 12 |
| `join-into-previous-block` | S12b 앞 블록과 병합 (줄 처음에서 Backspace) | 6 | 0/6 (0.0%) | 6/6 (100.0%) | 6/6 | textmove 0 · phase1 6 · naive 6 |
| `split-at-anchor-start` | S12c 앵커 시작점에서 문단 분할 (Enter) | 6 | 0/6 (0.0%) | 4/6 (66.7%) | 6/6 | textmove 0 · phase1 0 · naive 4 |
| `delete-block-then-undo` | S12d 앵커 담은 블록 삭제 후 undo | 6 | 6/6 (100.0%) | 6/6 (100.0%) | 6/6 | textmove 12 · phase1 12 · naive 12 |

대조군을 뺀 5개 조작의 합계: orphan 46/60 레인측정 (76.7%), 오해소 0. 앵커 텍스트가 편집에 닿지 않고 문서에 그대로 남은 시행 38건은 **전부 자기 자리에** 붙었다 (제자리 밖 부착 0건) — orphan이 아닌 것들이 "아무 데나" 붙어서 생긴 값이 아니라는 뜻이다.

두 레인의 값이 다른 것이 핵심 정보다: **편집 세션이 살아 있으면**(pipeline = 저장 시 재캡처) 병합·분할은 끊기지 않고, **옛 레코드를 들이대는 경로**(stale = 오프라인 협업·다른 프로세스 편집)에서만 끊긴다. 이동과 undo는 두 레인 모두 끊긴다 — 블록 정체성이 파괴되는 편집이기 때문이다(D3). 링크 종단점은 이 값을 "끊긴 종단점(broken endpoint)" 상태로 보게 된다 (`link-store/README.md`, `check_links.py`의 broken-endpoint 보고).

## 6. D1 — 앵커 끝 경계에 삽입 (비게이팅 진단)

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

## 7. D2 — 삭제 정렬 어긋남 (PM Step 대 y-prosemirror diff)

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

## 8. D3 — 블록 이동 대 같은 문장 재타이핑 (규칙 C의 근거)

질문: "같은 텍스트 블록이 새로 생겼다"를 이동의 증거로 써도 되는가?

| 편집 | 결과 문서(끝 44자) | Yjs 업데이트 sha256(앞 16) |
|---|---|---|
| 블록 이동 (같은 PM 노드를 잘라 문서 끝에 붙임) | `…er records a disputed clause and then stops.` | `a0ca4b1726128907…` |
| 같은 문장 재타이핑 (블록 삭제 후 같은 문장을 새로 입력) | `…er records a disputed clause and then stops.` | `a0ca4b1726128907…` |
| 대조군: 블록 삭제만 | `…t. / Closing block of the diagnostic document.` | `f34948661e9cdfde…` |

**이동과 재타이핑의 Yjs 업데이트가 byte 단위로 같다.** 블록을 잘라 붙이는 편집은 Yjs에서 "옛 element 삭제 + 새 element 삽입"이고, 같은 문장을 지웠다 다시 치는 편집도 정확히 같은 연산이다. 결과 문서 텍스트도 같다(=true). 따라서 **어떤 해소 규칙도 저장된 상태만으로 둘을 가를 수 없다** — "같은 텍스트 블록이 새로 생겼다"를 이동의 증거로 쓰면 재타이핑(S11c)·쌍둥이 이동(S11a·S11b)·원격 작성(S11d)이 전부 같이 통과한다. 그래서 규칙 C는 **item 정체성이 살아 있을 때만** 복구하고, 정체성이 파괴된 뒤에는 orphan으로 접는다. 그 대가는 §4의 "포기한 복구" 표에 숫자로 있다 (S6 블록 이동이 복구되지 않는다).

## 9. D4 — 옛 저장 파일(v1) 하위호환 — 로드는 되지만 출처는 미상이고, 정체성을 입양하지 않는다

질문: 남의 문서 옆에 놓인 옛 주석 파일이 그 문서의 레코드가 되는가?

| 항목 | 값 |
|---|---|
| 현재 저장 버전 | 3 |
| 읽은 파일의 버전 | 1 |
| 로드된 레코드 | 1건 (버려지지 않는다) |
| 문서 정체성 입양 | false — 동거는 정체성의 증거가 아니다. 스토어의 documentId를 찍어 주지 않으므로 이 레코드는 어느 문서에서도 미상으로 남는다 (바인딩 가능=false) |
| load -> save 승격 (세탁 경로) | false — 저장을 거쳐도 v3 레코드가 미상 표시를 유지하고(true) 종단점 상태는 측정값 `orphaned`이다 |
| 출처 미상 표시 | true (`legacy-v1-record`) |
| 블록 문맥 | 비움 — 이동 복구 대상 아님 |
| 편집 | `Critical failure` -> `Cure` (제자리 교체) |
| 해소 결과 | orphaned |
| 사유 | `document-identity/record-has-no-document-identity` (guard 출처 판정 `not-evaluated`) |
| 대조군 (같은 문서·같은 세션, 정체성을 실은 레코드) | true (`relative-position`) — 위 orphan은 "전부 거절"의 산물이 아니다 |
| 알 수 없는 버전 거절 | true |

옛 파일은 **로드되지만 승격되지 않는다**: 스토어 옆에 있다는 사실만으로 문서 정체성을 얻지 못하고 (입양 금지), 출처 증거가 없으므로 문자열 구조만으로도 통과하지 않는다. 이 경로가 열려 있으면 문서 A의 주석 파일을 문서 B 옆에 두는 것만으로 B의 레코드가 되고, 재저장 한 번에 v3 링크 종단점으로 승격된다 (실측된 세탁 경로: vnv B3 -> B7).

## 10. D5 — 문서 정체성 바인딩 (재임포트·파생본에 레코드를 들이댄다)

질문: 같은 텍스트를 가진 **다른 문서**에 옛 앵커 레코드를 들이대면 어디에 붙는가?

| 문서 모양 | 레코드의 문서인가 | 저장 item의 상태 | 해소 | 사유/부착 텍스트 |
|---|---|---|---|---|
| same document reloaded from its own state (control) | yes | live | relative-position | `disputed clause` |
| identical re-import, same clientID | no | live | orphaned | `document-identity/mismatch` |
| forked document, same clientID | no | live | orphaned | `document-identity/mismatch` |
| different document, different clientID | no | unknown | orphaned | `document-identity/mismatch` |

남의 문서 3모양에 부착된 건수 **0**, 같은 문서(저장 상태에서 재로드) 대조군 해소 **true**. 남의 문서 세 모양 어디에도 붙지 않는다 — 레코드와 문서가 각자 지닌 정체성이 어긋나면 selector를 아예 읽지 않는다(`document-identity/mismatch`). 같은 문서를 저장 상태에서 다시 열었을 때는 정상 해소되므로 "전부 거절"로 얻은 0이 아니다.

## 11. D6 — 저장소 계약 — 마이그레이션은 강등 전용인가 (캡처 증거 채워넣기 시험)

질문: 레코드가 스스로 주장하는 캡처 증거를 파일 버전만 보고 믿어도 되는가?

| 스토어 모양 | 버전 | 로드 | 강등 | 해소 | 사유 |
|---|---|---|---|---|---|
| older version, capture refilled with the current state vector | 2 | 읽음 | yes (`legacy-v2-record`) | orphaned | `content-replaced/unknown/legacy-v2-record` |
| current version, capture character ids copied from the replaced range | 3 | 읽음 | yes (`capture-inconsistent`) | orphaned | `content-replaced/unknown/capture-inconsistent` |
| current version, capture ids copied from a same-length range typed after capture | 3 | 읽음 | yes (`capture-inconsistent-with-state-vector`) | orphaned | `content-replaced/unknown/capture-inconsistent-with-state-vector` |
| current version, capture ids padded from elsewhere to the stored exact length | 3 | 읽음 | no | orphaned | `content-replaced/forged/capture-content-mismatch` |
| current version, padding chosen to satisfy the per-position correspondence check | 3 | 읽음 | no | orphaned | `content-replaced/forged/capture-order-mismatch-document` |
| current version, record claims another document | 3 | 거절 | - | - | `store contract: record b4 belongs to another document` |
| unknown store version | 99 | 거절 | - | - | `unsupported store version: 99` |
| control: untouched current-version record | 3 | 읽음 | no | orphaned | `content-replaced/no-surviving-characters` |

앵커 `Critical failure`를 `Cure`로 제자리 교체한 문서에, 증거를 채워 넣은 스토어 7모양을 들이댔다 — 부착 0건, 승격 경로 존재=false. 로드 시점 검사(길이·SV)를 통과한 모양은 2개이고 그중 2개를 해소 시점의 자리별 대응 검사가 잡는다 — **막는 층이 둘이라는 사실 자체를 수치로 남긴다**. 채워 넣은 증거는 **한 갈래도 부착되지 않는다**: 옛 버전은 강등되고, 현재 버전이어도 캡처 증거가 저장된 exact와 어긋나면 계약 위반으로 강등되며, 다른 문서를 주장하는 레코드는 로드 자체가 거절된다. 길이·SV를 맞춘 padding 위조 2모양은 로드를 통과하지만 이름표가 exact와 자리별로 대응하지 않아 해소 시점에 걸린다.

## 12. 관측 (수치에서 바로 도출)

- G2 대상(S1–S4·S8) 30건 — pipeline 레인(저장 시 재캡처 → 재로드) 생존 30 (100.0%), 드리프트 0, orphan 0, 오해소 0. 같은 시행을 stale 레인(편집 전 레코드를 편집 후 문서에 들이댐)으로 재면 생존 28 (93.3%), 드리프트 2, 오해소 0.
- S4(범위 일부 겹쳐 삭제): pipeline 생존 6/6, stale 생존 4/6 + 드리프트 2건(총 2자). 드리프트는 "다른 곳에 붙음"이 아니라 삭제 경계가 한 칸 밀린 것이다 — 원인은 D2 참조.
- S5(범위 전체 삭제) 6건: orphaned 6, 오해소 0. collapsed = CRDT가 삭제를 증언한 경우라 복구를 돌리지 않는다. 이 규칙이 없었다면(naive 정책) 스위트 전체에서 오해소가 76건 났다 — a6은 같은 문자열이 문서에 두 번 나오는 함정 앵커다.
- S6(블록 cut+paste) 6건: 주앵커 생존 0, 복구 0, orphan 6, 오해소 0. live 레인은 생존 0/6 — PM이 블록을 지웠다 새로 넣으면 Decoration은 전부 사라지고 Yjs RelativePosition도 null을 돌려준다. 이때 블록 item 정체성은 **파괴**되고(D3: 이동과 재타이핑의 Yjs 업데이트가 byte 동일=true), 남는 단서는 "같은 텍스트 블록이 새로 생겼다"뿐인데 그것은 재타이핑·쌍둥이 이동·원격 작성과 구별되지 않는다. 그래서 strict 정책은 여기서 복구하지 않는다 — 대조 정책 textmove였다면 살렸을 복구가 스위트 전체에서 24건이고, 그 대가로 오해소가 36건 났다.
- S7(오프라인 동시 편집 후 병합) 6건: 저장 앵커 생존 6, 복구 0, orphan 0, 오해소 0, 두 복제본 수렴 6/6. 반면 병합을 받은 세션의 live 레인은 생존 0/6 (orphan 6) — y-prosemirror는 원격 업데이트를 PM step으로 옮기지 않고 문서 전체를 replace하므로(`sync-plugin.js` `_typeChanged`: `tr.replace(0, doc.content.size, …)`) Decoration이 전부 날아간다. Phase 2 필수 요구: 원격 업데이트(isChangeOrigin) 후에는 저장 앵커로 평면을 재수화(rehydrate)해야 한다.
- S9(블록 통째 삭제)·S10(제자리 교체) 합산 12시행 — 전 레인 orphaned 36, 오해소 0. Phase 1 규칙이었다면 이 두 시나리오에서만 오해소가 18건 났다(반사실). 두 시나리오는 vnv가 스위트 밖에서 재현한 실패를 그대로 시나리오화한 것이다.
- S11(블록이 사라진 뒤 같은 텍스트 블록이 새로 나타남) 30시행 — 전 레인 orphaned 90, 오해소 0. 같은 범위에서 대조 정책이었다면 오해소는 textmove 36건, phase1 56건, naive 56건이다. S11e(v1 레코드)는 저장 버전 3 엔진이 옛 파일을 읽었을 때의 경로이며, D4가 실제 파일로 확인한다 (로드됨=1건, 출처 미상 표시=true, 해소=orphaned).
- 문서 정체성(C2): 같은 텍스트를 가진 다른 문서 3모양(동일 재임포트·파생본·다른 clientID)에 레코드를 들이대 부착 0건, 같은 문서를 저장 상태에서 다시 열었을 때는 정상 해소 true — "전부 거절"로 얻은 0이 아니다. 저장소 계약: 캡처 증거를 채워 넣은 스토어 7모양 중 부착된 것 0건이고 승격 경로 자체가 없다(마이그레이션은 강등 전용). 그중 2모양은 자기보고 정합 검사(길이·SV)를 통과하지만 해소 시점의 구조 검사가 2모양을 잡는다(자리별 대응까지 만족시키는 padding 포함=true — 문서 전역 순서에서 걸린다). 옛 파일은 로드되되 문서 정체성 입양=false(해소=orphaned, 같은 세션 대조군 해소=true), 알 수 없는 버전 거절=true. 게이트와 편집기의 등가성: anchors 없는 v3 레코드 거절=true, 중복 레코드 id 거절=true — 커밋 게이트가 거절하는 모양을 편집기도 거절한다.
- orphan 예산(C3): 앵커 텍스트가 편집 후에도 남는 흔한 조작 6종을 정식 시나리오로 쟀다. pipeline 레인 orphan — insert-inside-anchor 0/6 · move-block-two-transactions 6/6 · move-block-one-transaction 6/6 · join-into-previous-block 0/6 · split-at-anchor-start 0/6 · delete-block-then-undo 6/6. stale 레인 orphan — insert-inside-anchor 0/6 · move-block-two-transactions 6/6 · move-block-one-transaction 6/6 · join-into-previous-block 6/6 · split-at-anchor-start 4/6 · delete-block-then-undo 6/6. 대조군을 뺀 합계 46/60 레인측정이 orphan이고 오해소는 0건이다. 앵커 텍스트가 편집에 닿지 않고 남은 시행 38건 중 제자리 밖에 붙은 것은 0건 — 살아남은 앵커가 남의 자리에 붙어서 만든 수치가 아니다.
- 복구 경로: 주앵커 채택 86건, 블록 정체성 복구(block-identity) 0건, orphan 142건. orphan 사유 내역: block-gone/block-identity-destroyed 90 / collapsed/tombstone-evidence 28 / content-replaced/guard-rejected 20 / content-replaced/no-surviving-characters 2 / content-replaced/unknown/legacy-v1-record 2. 구조적 affix guard가 거절했는데 Phase 1 guard였다면 통과했을 시행 12건.
- pipeline 레인에서 기대와 어긋난 시행 18건: S6/a1=orphaned, S6/a2=orphaned, S6/a3=orphaned, S6/a4=orphaned, S6/a5=orphaned, S6/a6=orphaned, S12a/a1=orphaned, S12a/a2=orphaned, S12a/a3=orphaned, S12a/a4=orphaned, S12a/a5=orphaned, S12a/a6=orphaned, S12d/a1=orphaned, S12d/a2=orphaned, S12d/a3=orphaned, S12d/a4=orphaned, S12d/a5=orphaned, S12d/a6=orphaned.
- stale 레인에서 기대와 어긋난 시행 30건: S4/a1=drifted, S4/a2=drifted, S6/a1=orphaned, S6/a2=orphaned, S6/a3=orphaned, S6/a4=orphaned, S6/a5=orphaned, S6/a6=orphaned, S12a/a1=orphaned, S12a/a2=orphaned, S12a/a3=orphaned, S12a/a4=orphaned, S12a/a5=orphaned, S12a/a6=orphaned, S12b/a1=orphaned, S12b/a2=orphaned, S12b/a3=orphaned, S12b/a4=orphaned, S12b/a5=orphaned, S12b/a6=orphaned, S12c/a2=orphaned, S12c/a3=orphaned, S12c/a4=orphaned, S12c/a6=orphaned, S12d/a1=orphaned, S12d/a2=orphaned, S12d/a3=orphaned, S12d/a4=orphaned, S12d/a5=orphaned, S12d/a6=orphaned.
- bystander(같은 문서의 나머지 앵커) 540건 중 exact 그대로 517, 편집에 걸려 잔여 범위 1, orphan 22, 오해소 0 — 앵커 다수를 한 평면에 얹어도 서로를 밀어내지 않는지 확인한 값이다.

## 13. 측정하지 않은 것 (잔여 위험)

"오해소 0"이 어디까지의 주장인지 못 박아 두는 절이다. 아래 항목은 이 스위트가 **한 번도 누르지 않은** 경로이므로, 여기서 새 오해소가 나올 수 있다 (Phase 1의 S9·S10이 정확히 그렇게 발견됐다).

| 미측정 항목 | 왜 위험한가 |
|---|---|
| 문서 규모 — fixture는 main 7블록/381자, twin 11블록/583자, s11 16블록/868자, 앵커는 시나리오당 6개 | 대형 문서·수백 앵커에서의 후보 충돌률과 성능은 미측정 |
| 블록 종류 — fixture는 heading·paragraph만 쓴다 | 표·중첩 리스트·코드블록 안의 앵커, 블록 타입 변경(paragraph -> heading)은 미측정 |
| 복합 편집 — "여러 블록 동시 삭제", 앵커 범위를 가로지르는 동시 편집, 블록 타입 변경 중의 앵커 | 블록 정체성이 파괴되는 편집은 이제 **전부 orphan**이라 오부착 위험은 낮지만, 이 모양들의 복구율 손실은 미측정 |
| 문서 정체성이 **없는** 문서 상태 (이 엔진 이전에 만들어진 Y.Doc) | 규칙 0이 "정체성 없는 문서에는 아무 레코드도 바인딩하지 않는다"로 흐르므로 오부착 위험은 없지만, 그런 문서를 실제로 다루는 마이그레이션 경로(문서에 정체성을 부여하는 절차)는 미설계·미측정 |
| 문서 재임포트 **여러 앵커·여러 문서 세대** (D5는 앵커 1개를 네 모양에 들이대는 측정이다) | 한 앵커에 대해서는 D5가 부착 0을 확인했지만, 재임포트를 반복하거나 일부만 재임포트하는 혼합 문서는 미측정 |
| 악의적 위조 — **신뢰 경계 바깥** (레코드를 손으로 쓰는 주체. D6은 그 모양 7개를 실제 파일로 만든다) | 자기보고 정합 검사(이름표 길이 합계·캡처 SV)만으로는 **부족하다**: 현재 범위의 이름표에 문서 다른 곳의 이름표를 padding 해 길이를 맞추면 둘 다 통과한다(실측 B4). 그래서 해소 시점에 이름표와 저장된 exact의 **자리별 대응**(내용·유일성·순서)에 더해 **문서 전역 순서**를 본다 — 자리별 대응까지 만족시키도록 padding 글자를 고른 위조(실측 H1)는 문서 순서에서 걸린다. **그래도 남는 것**: (a) 남의 문서의 **유효한** capture를 통째로 이식, (b) 사람이 옛 레코드에 documentId를 써 넣기, (c) **죽었거나 이 문서가 모르는** 이름표로 채운 padding(내용이 tombstone과 함께 사라져 반증할 사실이 없다), (d) 남의 documentId를 지정해 새 문서를 만들기 (문서를 만들 때 id를 정하는 것은 호출부의 권한이므로 문서 상태 자체를 위조하는 것과 같다). 넷 다 전제가 같다 — 즉 **스토어 파일에 쓸 수 있는 주체는 그 문서의 주석을 임의로 주장할 수 있다. 이것은 방어 실패가 아니라 신뢰 경계다**. 그 위는 서명·무결성 태그의 영역으로 미구현이다. 경계 **안쪽**(일상 편집·복사·병합으로 도달하는 경로: 문서 복제·스토어 중복·중복 레코드 id·anchors 삭제·해석 불가 레코드 모양·옛 파일 동거·스토어를 남의 문서 옆으로 옮기기·**문서 상태 없이 스토어만 옮기기**)은 게이트가 막고 매 실행 재측정하되, **"전부"라고 적지 않는다**: 안쪽 목록은 지금까지 실측으로 찾아낸 것이고, 라운드마다 새 항목이 추가돼 왔다(H3 -> H4 -> X1 -> X2 -> N1·N2·N6). 그래서 이제는 사례를 세는 대신 **성질**을 건다 — `게이트 accept <-> 편집기 accept`를 fixture 스토어 전수에 적용하고(`run-link-checks.mjs` C9), 편집기 쪽은 **진짜 `loadStore`**로 잰다(계약 함수를 다시 부르면 게이트와 같은 입력을 먹여 두 층이 갈리는 축이 보이지 않는다 — 실측 vnv 6차). **다만 그 성질에도 범위가 있다**: 자동으로 포함되는 것은 **fixture 코퍼스에 넣은 스토어**이고(`fixtures/**` + 실사용 `sample-state`, 필터는 `annotations`·`version` 두 키), 코퍼스 **밖**의 스토어는 성질이 아니라 게이트의 **발견**이 맡는다. 게이트가 원리적으로 볼 수 없는 축(평문과 CRDT 상태의 어긋남 · `yUpdateBase64` 내용이 열리지 않음 = 문서 상태를 손으로 쓰기)은 이제 **부류로 측정한다**: 그 모양들이 fixture로 코퍼스에 들어와 있어 매 실행 divergence로 세어지고(`EXPECTED_DIVERGENCE_CODES`, 3건 이상), **그 부류 밖의 divergence는 0**이어야 한다. 즉 자동으로 잡히는 것은 **코퍼스에 들어온 모양**이지 "모든 새 변종"이 아니다. 발견에는 **전제**가 있고 그 전제는 판정 JSON에 드러난다(작업공간 루트 없음 = `workspaceRoot: null`이면 발견이 인자와 스토어 디렉토리로 한정된다 — 실측 C10) — README "발견의 전제" 절 |
| 앵커가 블록 경계를 걸치는 경우 (blockContext 없음) | 캡처 기준점은 v2에서 따로 저장하므로 guard(문자 출처)는 그대로 작동하지만, 정체성 복구는 아예 시도하지 않는다(=orphan). 그 복구율 손실은 미측정 |
| 이동을 CRDT가 보존하는 편집기·연산 (예: Yjs의 move 연산, 블록 id를 갖는 스키마) | 규칙 C의 복구 경로는 item 정체성이 살아남을 때만 발동한다. 지금 스택(y-prosemirror)에서는 D3대로 정체성이 파괴되므로 **한 번도 발동하지 않았다** — 그 경로 자체가 미측정 |
| 경계 흡수 — 앵커 끝에 붙여 쓴 긴 삽입 | D1이 보였듯 RelativePosition은 끝 경계 삽입을 범위 안으로 흡수한다. 흡수량 상한이 없으므로 앵커가 크게 늘어날 수 있다(오부착은 아니나 범위 오염) |

## 14. 재현

```
cd tools/plane-editor && npm install   # 최초 1회 (pin된 버전)
node run-suite.mjs                     # -> suite-result.json + REPORT.md
```

비대화형·결정론적이다. Yjs client ID를 고정하고 시각·난수를 결과에 넣지 않으므로, 같은 커밋에서 재실행하면 `suite-result.json`과 이 파일이 byte 단위로 같아야 한다 (재실행 후 `git diff --stat`가 비어야 함).

