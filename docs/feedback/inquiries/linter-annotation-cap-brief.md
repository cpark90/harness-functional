---
status: answered        # inspection이 작성한 dispatch-ready 초안 — orchestrator가 소비(plans/로 채택) 후 closed
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/verified/annotation-backbone-architecture.md   # 승인 계획 단계 ②
related: [docs/feedback/annotation-backbone-architecture.md, docs/feedback/inquiries/tbox-annotation-predicates-brief.md]
---
# 린터 annotation cap dispatch 브리프 (초안) — 승인 계획 ② (단위 = token, 사용자 결정)

> 작성: inspection (사용자 지시, 2026-08-27). **정식 채택·dispatch는 orchestrator 소관.**
> 사용자 결정 반영: **cap 단위 = token** (42-line 원안의 token 환산). 이로써 승인 항목의
> 미결이던 "단위 line vs token"이 해소됨.

## 1. 목표 (한 문장)
"한 설명 단위(annotation) ≤ 42 line" 제약을 **token cap으로 환산해 `lint_uniformity.py`의
새 검사로 강제**한다 — 노드가 blob으로 자라는 것을 사후 감사(Q3)가 아니라 커밋 게이트에서
기계적으로 차단하는 것 (도구 목적 ① "제약 집행"의 구현).

## 2. cap 정의 (결정 사항 — 브리프에서 고정)
- **metric**: 노드당 `ho:promptText` + `skos:definition` 전 값의 **whitespace token 합**
  (`len(text.split())`) — repo의 기존 token 관례(`import_corpus.py:71` "wc -w equivalent",
  tokenEstimate 산정과 동일 계열)를 재사용. 외부 tokenizer 의존 금지(결정론·환경 제약).
- **cap 값: 500 tokens.** 도출: 42 line × ~12 words/line ≈ 500. 실측 근거: 현 abox 텍스트
  보유 노드 250개의 노드당 최대 합 = **199**(id:mode-standing-service) → 현 그래프 위반 0
  (린터의 no-false-positive 설계 제약 충족)이면서 blob 성장에 실질 가드.
- **scope: abox 개체만** (`INSTANCE_CLASSES` 소속 — `ontology_lib.py` 기존 헬퍼 재사용).
  **TBox 스키마 정의는 제외** — `ho:hasComponent`의 chain-axiom 문서(3566자 ≈ 890 tokens)는
  의도된 기계 문서라 포함 시 즉시 오탐. 이 제외를 검사 docstring에 명시.

## 3. 담당·경로 (파일 경계)
- **developer dispatch (opus)**: `tools/lint_uniformity.py`(검사 1개 추가) +
  `ONTOLOGYSTYLE.md`(§1c에 cap 조항 1개) **만**. 그래프·다른 도구 수정 금지.
- **vnv dispatch**: 재현 + negative control + 현 그래프 위반 0 확인.
- **git: inspection** (게이트 통과 후).

## 4. 구현 명세 (developer)
1. **ONTOLOGYSTYLE §1c에 [지킴] 조항 추가** (린터의 모든 검사는 § 근거를 인용하는 설계 —
   `lint_uniformity.py` 서두 docstring 참조): "한 노드의 `ho:promptText`+`skos:definition`
   합은 **500 token**(whitespace 분리, wc -w 관례)을 넘지 않는다. 넘으면 단일 책임(§1)
   위반 신호 — 분해(WorkflowStep/PromptSection류) 또는 `ho:alternativeOf` 분리(승인 항목
   참조)로 나눈다." — 42-line 원안의 환산이라는 도출 근거 포함.
2. **`check_text_cap(g)` 추가**: §2의 metric·scope 그대로. 위반 출력은 기존 검사와 동일
   포맷(노드 IRI + 실측값 + 한도). Summary 블록·exit code에 합류.
3. **CI 무변경**: `validate.yml`이 이미 `lint_uniformity.py`를 게이트로 실행하므로 (이전
   wave에서 land) 검사 추가만으로 CI에 자동 편입 — workflow 파일 수정 금지.
4. 기존 검사·스코프 로직 리팩터링 금지(순수 추가) — 다른 검사의 무오탐 상태를 건드리지 않는다.

## 5. 수용 게이트 (go/no-go)
- G1. **현 그래프 위반 0**: 245+ 개체 전수에서 검사 PASS (최대 199 실측 재확인 포함).
- G2. **negative control**: 스크래치 복사본에 501+ token 노드 주입 → 린터 **FAIL** 실측
  (성공 케이스만 보지 말 것). 경계: 정확히 500 = PASS, 501 = FAIL.
- G3. `validate.py`·`check_determinism.py` PASS 유지 (린터는 read-only라 자동 성립 — 회귀 확인).
- G4. §1c 조항과 검사 구현이 **같은 커밋** (doc-lag 예방, 237·245 감사의 반복 결함).
- G5. 언어 정책: 조항 산문 한글·용어 영어.

## 6. 비범위
retrieve 선별·pack 예산(§1c tokenEstimate 검사는 기존 그대로)·anchor 필수 저장 거부(webui
lane ④)·recipes repo 린트 편입(연합 CI는 별도 결정)·TBox 텍스트 규율(의도된 기계 문서)·
declared tokenEstimate vs 실측 괴리 검사(별도 제안 시 검토).

## 7. 의존성
**① TBox 브리프와 독립 — 병행 dispatch 가능** (cap은 기존 술어만 읽는다). §1c 조항이
`ho:alternativeOf`를 분해 대안으로 언급하는 부분만 ① land 전이면 "승인 항목 참조"로 표기.
