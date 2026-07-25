# 전면 건전성+통일성 감사 (237 individuals, 2026-07-25)

`docs/feedback/verified/ontology-health-audit.md`. 대폭 성장(205→237) 후 종합 감사 결과.

## 건전성: 결함 0
- validate PASS · check_determinism PASS · parity **237==237**(B3 해소로 173/205 격차 소멸,
  INSTANCE_CLASSES=34 전 leaf 등록) · capability 9=9 완전짝 · deprecated 3 실inbound 0.
- specializes 중앙은 **2 edge뿐**(role-inspection-worker→role-inspection, h-support→h-research);
  브리프의 "82"는 recipe-scope라 중앙 abox에 없다 — 수치 혼동 주의.
- Contract teeth 재현: `verify_contract h-harness-factory --tree <mat>` 실=2/2 exit0,
  SKILL.md heading/description 훼손=0/2 exit1. materialize 7 harness 결정성+id:/ho:/로컬경로 유출 0.
- oa-* 10노드가 tokenEstimate(30-75)+observedTokenVolume(1500-12000) **둘 다** 보유는 B5후 정상
  (자기 투영비 vs 관측량). 병행보유를 §3 "섞지마"로 오판 말 것 — 규칙은 의미혼동 금지지 공존금지 아님.

## 통일성: 유일 결함군 = 규범문서 doc-lag (ontology 아님)
반복 패턴: **신규 클래스/술어가 ONTOLOGYSTYLE §2·§3에 안 실린다.** 이번 실측:
- §2 표에 **Hook 행 없음**(개체 hook- 4개 일관 사용) → 표 gap.
- §2 표 Contract=`contract-`인데 **실개체는 `ct-`**(ct-well-formed-skill-*) → 문서≠실무.
- §3 순서에 hasHook/hasExecutionMode/hasRole/hasChannel/hasMemory/hasAgent/hasAssemblySection
  자리 미명문화(실무는 일관). observedTokenVolume·specializes는 §3 등재+정위치.
→ 감사 때 **접두사·술어를 §2/§3 표와 대조**하는 스텝을 상시 넣어라(성장분마다 재발).
방법: asserted rdf:type의 ho: leaf 계산(INSTANCE_CLASSES 필터 말고) → local prefix vs 표 대조.

## 세분화: 신규 blob 0
gr-human-checkpoint(신규 최장 gr 597자)는 단일책임+이웃구별 산문이라 blob 아님. definition
길이상위는 대부분 선택근거 산문(§1d 정당). 기존 §C-0 Q3 판정 불변.
부수: catalog+root-import의 `ontology/abox/authored.ttl`은 디스크 부재해도 webui 예약 write-target
(로더 tolerate, validate PASS) — MISSING으로 오판 말 것.
