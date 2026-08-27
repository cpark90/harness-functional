---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/inquiries/tool_suggestion.md   # v0.2 §8 Phase 1
related: [docs/feedback/verified/annotation-backbone-architecture.md]
---
# Phase 1 dispatch 브리프 (초안) — 앵커 엔진 검증 프로토타입

> 작성: inspection (사용자 지시, 2026-08-27). **정식 브리프 채택·dispatch는 orchestrator 소관** —
> 이 초안을 `docs/plans/`로 옮기거나 그대로 인용해 developer에게 dispatch한다.

## 1. 목표 (한 문장)
tool_suggestion v0.2의 핵심 전제 — "standoff 앵커(ProseMirror 플러그인 상태 + Yjs
RelativePosition)는 편집을 견딘다" — 를 **주석 평면 1개 프로토타입으로 실측 검증**하고,
앵커 생존율을 시나리오별 수치로 보고한다. 이 수치가 Phase 2+ 착수의 go/no-go 근거다.

## 2. 담당·경로 (파일 경계)
- **developer dispatch (opus)**: 신규 디렉토리 **`tools/plane-editor/`** 하위만 저작.
  기존 `tools/*.py`·`tools/webui`·`ontology/`·TBox·shapes **수정 금지** (순수 추가).
- **vnv dispatch**: 판정만 — 시나리오 스위트 재실행 + 생존율 독립 재측정 →
  `docs/verify/plane-editor-phase1-verify.md`.
- **git: inspection** (게이트 통과 후).

## 3. 구현 명세 (developer)
1. **스택**: Tiptap(core) + ProseMirror + Yjs + y-prosemirror. `tools/plane-editor/package.json`에
   버전 고정(pin). 런타임 외부 네트워크 의존 금지.
2. **주석 평면 = 플러그인 1개**: annotation은 **플러그인 상태 + Decoration**으로만 존재.
   - **[지킴] mark 사용 금지** (v0.2 §5.2 anti-pattern): 문서 스키마는 순수 콘텐츠만 안다.
     스키마에 annotation용 mark/노드 타입이 없어야 한다.
   - annotation 레코드: `{id, anchors, body, status(open|resolved)}` — status 필수(v0.2 §4.2 I3).
3. **앵커 = Selector 다중화** (v0.2 §7 드리프트 대응): 저장 시 **Yjs `RelativePosition`
   (주앵커) + `TextQuoteSelector`(exact/prefix/suffix, 복구용)** 둘 다 기록. 로드 시
   RelativePosition 해소 실패면 quote로 복구 시도, 둘 다 실패면 **orphaned로 명시 표기**
   (조용한 소실 금지).
4. **영속화**: annotation 집합을 JSON 파일로 저장/재로드 (문서와 **별도 레코드** — standoff).
5. **headless 실행** (CI 가능): 브라우저 없이 node(jsdom)로 ① 문서 로드 → ② annotation N개
   부착 → ③ 편집 시나리오 적용 → ④ 앵커 해소 검사 → ⑤ 결과 JSON 출력이 한 명령으로 돌아야
   한다: `node tools/plane-editor/run-suite.mjs → suite-result.json`.

## 4. 편집 시나리오 스위트 (고정 — vnv가 그대로 재현)
각 시나리오에서 "생존" = 편집 후 앵커가 해소한 텍스트 == 기대 대상 텍스트 (byte 비교).

| id | 시나리오 | 기대 |
|---|---|---|
| S1 | 앵커 앞에 텍스트 삽입 | 생존 100% |
| S2 | 앵커 범위 **안**에 삽입 | 범위 확장 생존 |
| S3 | 앵커 앞 텍스트 삭제 | 생존 100% |
| S4 | 앵커 범위 **일부** 겹쳐 삭제 | 잔여 범위로 축소 생존 |
| S5 | 앵커 범위 **전체** 삭제 | orphaned 판정 (오해소 0 — 엉뚱한 텍스트에 붙으면 실패) |
| S6 | 앵커 담은 블록 이동 (cut+paste) | quote 복구 포함 생존율 보고 |
| S7 | Yjs 동시 편집 병합 (두 복제본 오프라인 편집 후 병합) | RelativePosition 생존율 보고 |
| S8 | 저장 → 프로세스 재시작 → 재로드 round-trip | 전 앵커 복원 |

결과 보고: `tools/plane-editor/REPORT.md` — 시나리오×앵커수 표, 생존/복구/orphan/오해소 4분류
수치. **오해소(wrong-resolution)는 0이어야 한다** — orphan은 허용, 엉뚱한 위치 부착은 불허.

## 5. 수용 게이트 (go/no-go)
- G1. 스키마 순수성: 문서 스키마에 annotation mark/노드 0 (스키마 덤프로 확인).
- G2. S1–S4·S8 생존 100%, S5 오해소 0. (S6·S7은 목표치 없이 실측 보고 — Phase 2 설계 입력.)
- G3. suite가 단일 명령·비대화형으로 재현(vnv 독립 재실행 일치).
- G4. 기존 게이트 무영향: `validate.py`·`check_determinism.py`·`lint_uniformity.py` PASS 유지
  (그래프·기존 도구 무변경이므로 자동 성립 — 회귀 확인용).
- G5. 언어 정책: 산문 한글·용어 영어 (gr-lang).

## 6. 비범위 (Phase 1에서 하지 않는 것)
링크 평면·설계결정 평면·지식 그래프 연결(IRI 앵커)·툴 스코핑·cap/영역당 1선별(Phase 4)·
webui 통합·TBox 술어 3종(승인 계획 ①, 별도 브리프). 프로토타입은 검증이 목적 — UI 없음.

## 7. 근거 참조
- 설계 원본: `inquiries/tool_suggestion.md` v0.2 §5(채택 근거·anti-pattern)·§7(리스크)·§8 Phase 1.
- 승인 항목: `docs/feedback/annotation-backbone-architecture.md` (status: approved, 결정 A).
- 문서 말미 주의 승계: 벤더 수치는 미검증 — **그래서 이 Phase가 존재한다** (실측이 목적).
