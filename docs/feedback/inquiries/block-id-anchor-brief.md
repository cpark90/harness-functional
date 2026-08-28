---
status: answered        # HOLD 해제 (2026-08-28 사용자 최종 확인 = b′) — orchestrator 채택 가능
kind: dispatch-brief-draft
consumer: orchestrator → developer (opus)
source: docs/feedback/anchor-move-recovery-tradeoff.md   # 사용자 결정 (b′), status: approved
related: [docs/verify/plane-editor-c1b-verify.md, docs/verify/plane-editor-phase1-verify.md]
---
# 블록 id 앵커 dispatch 브리프 (초안) — 이동 복구 + 오해소 0 동시 달성 (결정 b′)

> 작성: inspection (사용자 결정 (b′), 2026-08-28). **정식 채택·dispatch는 orchestrator 소관.**
> 근거: `anchor-move-recovery-tradeoff.md`(approved) — cut+paste와 재타이핑이 Yjs 저장 상태에서
> byte-동일하다는 실측(C1b) 때문에 저장 상태만 보는 규칙으론 둘을 구별 못 한다. **문서 자신에
> 편집을 넘어 유지되는 블록 id를 넣어 그 전제를 깬다.**

## 1. 목표 (한 문장)
문서 스키마에 안정 블록 id 속성을 추가해 **이동(같은 id 생존)과 재타이핑(새 id)을 구별**하고,
블록 이동 시 주석 복구를 되살리면서 **전 레인 오해소 0을 유지**한다 — 스택 교체 없이.

## 2. 담당·경로 (파일 경계)
- **developer dispatch (opus)**: `tools/plane-editor/` **만** (스키마·앵커·마이그레이션·스위트).
  `ontology/`·기존 `tools/*.py`·다른 경로 수정 금지.
- **vnv dispatch**: 판정 보고 (`docs/verify/`) — 특히 §6의 구별 실증.
- **git: inspection** (게이트 통과 후).

## 3. 결정 사항 (브리프에서 고정 — developer 재량 아님)
1. **블록 id는 문서 자신의 속성이다** — 주석용 mark/노드가 아니므로 §5.2 anti-pattern(스키마
   순수성) 위반이 아니다. 이 구분을 스키마 주석과 G1 재정의에 명문화한다: G1은 이제
   "**annotation** mark/노드 0"이며, 블록 id 속성은 허용 목록에 명시.
2. **1차 구현 = Tiptap UniqueID 확장** — 단 dispatch 첫 단계에서 **라이선스 실측 필수**
   (패키지 LICENSE/헤더에서 MIT 확인; dossier의 "유료 경계는 Comments/AI Toolkit" 교차 검증).
   MIT가 아니거나 headless(jsdom) 제약이 있으면 **fallback: 자체 블록-id 플러그인**(블록 생성
   트랜잭션에서 id 부여 — 소규모, ProseMirror 순수 계층).
3. **id 생성은 주입 가능(결정론)** — 스위트/fixture에서는 **고정 id·시드 카운터**를 주입한다
   (Math.random/uuid v4 직접 호출을 스위트 경로에 두면 digest 재현이 깨진다 — G3 유지 조건).
   런타임(실사용)은 uuid 무방.
4. **해소 사다리(resolution ladder) 재정의** — 앵커 레코드에 3번째 selector `blockId`(+블록 내
   quote/offset) 추가. 순서: ① RelativePosition → ② **blockId 생존 시 그 블록 안에서 quote
   재해소** → ③ 전문서 TextQuoteSelector(기존 규칙·affix 조건 불변) → ④ orphan(명시 표기).
   ②가 이동 복구를 담당한다: 이동하면 ①은 죽지만 id가 살아 ②로 복구; 재타이핑은 새 id라
   ②가 불발되어 현행대로 orphan(오해소 0 유지).
5. **마이그레이션**: 기존 저장 문서에 1회성 id 부여 스크립트(결정론 — 문서 순회 순서 기반
   id). **id 없는 문서(편집기 밖 생성)는 사다리에서 ②를 건너뛰어 현행 동작으로 자연 강등** —
   오류가 아니라 정의된 강등임을 코드 주석에 명시.

## 4. 시나리오 스위트 개정 (S1–S10 기대값 변경 명세)
| 시나리오 | 현행 기대 | (b′) 후 기대 |
|---|---|---|
| S6 블록 이동(cut+paste) | orphan | **복구**(blockId 경유, 전 레인) — 오해소 0 |
| S9 블록 통째 삭제 | orphan | orphan **불변**(id 소멸) |
| S10 제자리 교체(재타이핑) | orphan | orphan **불변**(새 id — ② 불발 실증) |
| S1–S5·S7·S8 | 각 기대 | **전부 불변** (회귀 게이트) |
| **S11 신설** 이동+블록 내부 수정 조합 | — | blockId 생존 + 블록 내 quote 재해소로 복구율 실측 보고(목표치 없이 — 다음 결정 입력) |

## 5. 게이트 (go/no-go)
- G1′ 스키마 순수성(재정의): annotation mark/노드 **0** + 허용 속성 목록에 블록 id 명시.
- G2′: §4 표 그대로 — S6 복구 전 레인 성공 + **전 레인·전 시나리오 오해소 0** + S9·S10 orphan
  유지 + S1–S5·S7·S8 무회귀.
- G3: 단일 명령 재현, digest 결정론(§3-3의 주입 id로).
- G4: repo 게이트 3종(validate·lint·determinism) — 순수 추가라 무영향, 회귀 확인만.
- G5: 언어 정책. + **라이선스 게이트**: UniqueID 채택 시 MIT 실측 기록(불일치 시 fallback 전환).
- **핵심 실증(vnv)**: cut+paste와 재타이핑의 저장 상태가 이제 **구별됨**(id 유지 vs 신규 —
  C1b의 byte-동일 실측을 같은 방법으로 재실행해 이번엔 상이함을 보일 것). 이것이 (b′)의
  존재 이유이므로 이 실증 없이는 PASS 불가.

## 6. 비범위
Loro/CRDT 스택 변경(기각된 c′) · 링크 평면 스키마 · orphan 가시화 UI(진행 중 wave 소관) ·
`ontology/` 반영 · 외부 문서에 id 소급 부여(강등 동작이 정의됨).
