# sim-hil B-K2 (wave-S/C 축소분) — 부품 7 + cap 1 + mem-longterm retrievalPolicy

356→364 (+8: role/gr×2/tool×2/pat/concept 7 + **cap-environment-interaction 1** — 브리프 "7개체"에
capability mint가 더해지면 lock individualCount는 8 증가. 개체수 보고는 cap 포함으로 셀 것).

## carrier 이분법: 선언 carrier vs 라이브러리 carrier를 부품군 단위로
- 코딩 부품(gr-aci-observation, tool-lint-gated-edit)= **h-coding 직접**(W1 note N1: 그 하네스의
  도구 결과를 실제로 규율 → 산출물 변화가 의도). 시뮬 부품(role-user-simulator, gr-oracle-leak,
  tool-env-interface)= **h-workspace-synthesis 라이브러리**(운영 하네스 없음 → 오버사이트 페어 선례).
- **role+tool+guardrail은 같은 carrier에 함께 착지**해야 roleTool/roleGuardrail이 "harness가 bind한
  부품만 scope"하는 roles.ttl 헤더 규약을 지킨다(usesTool+hasGuardrail 동반 추가).

## capability mint = 최후수단의 실제 사례 (사유 패턴)
cap-codeexec SOFT 재사용을 기각: "코드를 돌릴 수 있으니 시뮬레이션을 step할 수 있다"는 capability
충족 거짓말이 됨. provided-only cap은 합법(cap-audit/cap-benchmarking 선례 — required 없어도
anti-orphan OK). mint 사유는 노드 위 주석 + 반환 보고 양쪽에.

## DesignPattern 연결 = 참이 아닐 때 appliesPattern 대신 tagged
pat-minimal-baseline: 어떤 하네스도 control arm이 아님 → appliesPattern 단언은 날조.
pat-pipeline/supervisor 선례대로 ho:tagged(c-agent-methodology)로 도달성 확보, recipe가 나중에 bind.

## 공석 leaf 점유 시 동일 커밋 주석 갱신 (반복 확인)
gr-aci-observation이 execution-post leaf 첫 점유 → concepts.ttl B-T 배너의 "still has no occupant"
문장을 같은 편집에서 갱신. 이제 8 leaf 전부 점유.

## 검증 실무
- **편집 전 스냅샷 baseline이 역적용보다 싸다**: 편집 시작 전에 ontology/+catalog를 scratch로 복사
  → `HARNESS_CATALOG=<scratch>/catalog-v001.xml`로 base materialize. (역적용은 이미 편집한 후의
  차선책일 뿐.)
- materialize CLI는 **bare slug**(`h-coding`), `id:` 접두사는 no-match.
- Tool 추가는 CLAUDE.md에 안 나온다(implementationRef 없으면 MANIFEST에만) — carrier diff에서 tool
  줄이 안 보여도 정상. retrievalPolicy도 미렌더 → h-multiagent CLAUDE.md byte-identical.
- 실측 diff 패턴: 비-carrier 5종 = lock individualCount만, carrier 2종 = 순수 추가(guardrail/role
  불릿 + agents/*.md 1 + MANIFEST 항목), dangling id: 0.
