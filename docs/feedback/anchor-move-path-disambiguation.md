---
status: approved            # 사용자만 approved로 바꾼다
targets: [tools/plane-editor]
related: [docs/feedback/anchor-move-recovery-tradeoff.md, docs/feedback/anchor-move-mechanism-recheck.md, docs/feedback/inquiries/block-id-anchor-brief.md]
---
# 확인 — 앵커 이동 경로를 문자 대신 **이름**으로 한 번만 확정해 주세요

두 채널의 답이 상반돼 양쪽 dispatch가 HOLD 상태입니다. **원인은 제(orchestrator) 표기 실수**라
먼저 밝힙니다: 재질의 항목에서 선택지 문자 `(a)/(b)/(c)`를 **원 항목과 다른 의미로 재사용**해,
같은 문자가 두 항목에서 다른 것을 가리키게 만들었습니다.

| 항목 | 문자 | 실제 의미 | 받은 답 |
|---|---|---|---|
| `anchor-move-recovery-tradeoff.md` | (b) | **안정 블록 id**(Tiptap UniqueID) | (b′)로 진행 → 브리프 작성·push |
| `anchor-move-mechanism-recheck.md` | (b) | **Loro 스택 교체** | (b) |

즉 **같은 글자 "(b)"가 정반대 경로**를 가리킵니다. 그래서 문자를 버리고 이름으로 묻습니다.

## 무엇을 고르시는 건지 (이름으로)

- **A. 안정 블록 id** — 문서 스키마에 블록마다 안정적인 id를 넣는다(Tiptap UniqueID, **MIT
  무료**). 이동과 재타이핑이 구별되어 **이동 복구와 오해소 0을 동시에** 얻는다. 현 스택
  (Yjs+y-prosemirror)을 유지하므로 Phase 1·C1·C1b·바인딩 wave의 **검증 자산이 그대로 남는다.**
  비용: 기존 문서에 1회성 id 부여, 외부 문서는 id가 없어 현행 orphan 동작으로 자연 강등.
  → 이 경로의 브리프는 **이미 작성돼 있습니다**(`inquiries/block-id-anchor-brief.md`).
- **B. Loro 스택 교체** — CRDT 층을 Loro로 옮긴다(movable list가 1급 연산, 공식 ProseMirror
  바인딩). 정체성이 CRDT 자체에서 보존되므로 가장 근본적이다. 비용: **앵커 엔진 재작성**
  (RelativePosition 대체·영속 포맷 변경)과 **Phase 1 스위트 전면 재검증** — 지금까지 쌓은
  검증 자산 대부분을 다시 만들어야 한다.
- **C. 둘 다 보류** — 현행(이동 시 orphan, 오해소 0)을 유지하고 다른 lane을 먼저 진행한다.

## 권고: **A**

- 두 채널 중 하나는 이미 A를 골랐고 브리프까지 나와 있습니다(중복 질의를 만든 것은 제 쪽 실수).
- 조사 실측상 **Yjs에서 (원래의) CRDT move 경로는 막혀 있습니다** — v14에서 move 지원 중단
  결정, v14 프리뷰 구현에 배열 corruption 이슈, v13 move는 실험 단계. 그래서 B는 "move를
  쓴다"가 아니라 **"CRDT를 갈아탄다"** 입니다.
- A와 B는 **목표(이동 복구 + 오해소 0)가 동일**합니다. 다른 것은 비용뿐이고, A가 검증 자산을
  보존합니다.
- B를 고르실 이유가 있다면 그것대로 진행합니다 — 다만 규모가 스택 교체 웨이브라 별도
  일정으로 잡는 편이 안전합니다.

## 이 결정과 무관하게 진행 중인 것

바인딩 불변식 wave(I-1 게이트·편집기 일치 / I-2 레코드 id 유일성 / I-3 스토어 발견)는 어느
경로에서도 필요하므로 계속 돌고 있습니다.

## 사용자 피드백
A
